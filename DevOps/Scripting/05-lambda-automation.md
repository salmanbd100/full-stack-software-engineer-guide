---
title: Lambda for Automation
part: 8
chapter: 0
slug: lambda-automation
level: intermediate # beginner | intermediate | advanced
reading_time: 19
updated: 2026-08-03
tags: [devops, scripting, lambda, automation]
in_book: false
---

# Lambda for Automation

Lambda is the standard place to put operational automation on AWS: event-driven responses, scheduled jobs, and remediation that has to happen in seconds.

## What Lambda Is Good At

| Use | Why Lambda |
|-----|-----------|
| **Event-driven remediation** | Reacts in seconds to a GuardDuty or Config finding |
| **Scheduled jobs** | No server to run cron on |
| **Glue between services** | S3 event → process → DynamoDB |
| **Cleanup and cost jobs** | Delete old snapshots, stop idle instances |
| **Webhook receivers** | Via Function URL or API Gateway |

❌ **Not for:** anything over 15 minutes, workloads needing a persistent connection pool at scale, or steady high-throughput traffic where a container is cheaper.

## Event-Driven Remediation

The highest-value automation pattern: EventBridge detects, Lambda responds.

```hcl
resource "aws_cloudwatch_event_rule" "public_bucket" {
  name        = "config-s3-public-detected"
  description = "S3 bucket became publicly readable"

  event_pattern = jsonencode({
    source        = ["aws.config"]
    "detail-type" = ["Config Rules Compliance Change"]
    detail = {
      messageType      = ["ComplianceChangeNotification"]
      configRuleName   = ["s3-bucket-public-read-prohibited"]
      newEvaluationResult = {
        complianceType = ["NON_COMPLIANT"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "remediate" {
  rule = aws_cloudwatch_event_rule.public_bucket.name
  arn  = aws_lambda_function.remediate.arn
}

resource "aws_lambda_permission" "events" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.remediate.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.public_bucket.arn
}
```

```typescript
import {
  S3Client,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { EventBridgeHandler } from "aws-lambda";

const s3 = new S3Client({});
const sns = new SNSClient({});

const ALERT_TOPIC = process.env.ALERT_TOPIC_ARN;
if (!ALERT_TOPIC) throw new Error("ALERT_TOPIC_ARN is required");

interface ConfigComplianceDetail {
  resourceId: string;
  configRuleName: string;
}

export const handler: EventBridgeHandler<
  "Config Rules Compliance Change",
  ConfigComplianceDetail,
  void
> = async (event) => {
  const bucket = event.detail.resourceId;

  // ✅ Additive, strictly-safer remediation — cannot break a legitimate workload
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    }),
  );

  await sns.send(
    new PublishCommand({
      TopicArn: ALERT_TOPIC,
      Subject: `Auto-remediated public bucket: ${bucket}`,
      Message: `Public access block applied to ${bucket} after Config rule ${event.detail.configRuleName} reported NON_COMPLIANT.`,
    }),
  );

  console.log(JSON.stringify({ level: "info", msg: "remediated", bucket }));
};
```

✅ **Notice the remediation is additive.** Applying a public access block cannot break a working application. Automating a *restrictive* change — deleting a security group rule, stopping an instance — risks causing the outage you were trying to prevent.

## Scheduled Jobs

```hcl
resource "aws_scheduler_schedule" "snapshot_cleanup" {
  name                = "delete-old-snapshots"
  schedule_expression = "cron(0 3 * * ? *)"      # 03:00 UTC daily
  schedule_expression_timezone = "Europe/London"  # ✅ EventBridge Scheduler only

  flexible_time_window { mode = "OFF" }

  target {
    arn      = aws_lambda_function.cleanup.arn
    role_arn = aws_iam_role.scheduler.arn

    retry_policy {
      maximum_retry_attempts       = 2
      maximum_event_age_in_seconds = 3600
    }
  }
}
```

⚠️ **Prefer EventBridge Scheduler over the older EventBridge Rules for schedules.** It supports timezones and daylight saving, one-off schedules, and per-target retry policy — none of which the legacy `aws_cloudwatch_event_rule` schedule expression gives you.

```typescript
import {
  EC2Client,
  paginateDescribeSnapshots,
  DeleteSnapshotCommand,
} from "@aws-sdk/client-ec2";
import type { ScheduledHandler } from "aws-lambda";

const ec2 = new EC2Client({});
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? "30");
const DRY_RUN = process.env.DRY_RUN === "true";

export const handler: ScheduledHandler = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  let deleted = 0;
  let skipped = 0;

  for await (const page of paginateDescribeSnapshots(
    { client: ec2 },
    { OwnerIds: ["self"] },
  )) {
    for (const snapshot of page.Snapshots ?? []) {
      if (!snapshot.SnapshotId || !snapshot.StartTime) continue;
      if (snapshot.StartTime > cutoff) continue;

      // ✅ Never delete anything explicitly retained
      const retain = snapshot.Tags?.some(
        (t) => t.Key === "Retain" && t.Value === "true",
      );
      if (retain) {
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(JSON.stringify({ level: "info", msg: "would delete", id: snapshot.SnapshotId }));
        continue;
      }

      try {
        await ec2.send(new DeleteSnapshotCommand({ SnapshotId: snapshot.SnapshotId }));
        deleted++;
      } catch (error) {
        // ✅ One failure must not abort the whole run
        console.log(JSON.stringify({
          level: "error",
          msg: "delete failed",
          id: snapshot.SnapshotId,
          error: String(error),
        }));
      }
    }
  }

  console.log(JSON.stringify({ level: "info", msg: "complete", deleted, skipped }));
};
```

✅ **Three things make this production-safe:** a `Retain` tag escape hatch, a `DRY_RUN` mode, and per-item error handling so one failure does not abandon the rest.

## Idempotency

🔴 **Lambda guarantees at-least-once delivery, not exactly-once.** Retries and duplicate events happen.

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Returns false if this event has already been processed. */
async function claimEvent(eventId: string): Promise<boolean> {
  try {
    await ddb.send(
      new PutCommand({
        TableName: process.env.IDEMPOTENCY_TABLE!,
        Item: {
          eventId,
          processedAt: new Date().toISOString(),
          // ✅ DynamoDB TTL cleans up old records automatically
          ttl: Math.floor(Date.now() / 1000) + 86_400,
        },
        ConditionExpression: "attribute_not_exists(eventId)",
      }),
    );
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
      return false;   // already processed
    }
    throw error;
  }
}
```

✨ **AWS Lambda Powertools provides `@idempotent` as a decorator**, which handles the in-progress state and expiry properly. Prefer it over hand-rolling this.

## Failure Handling

```hcl
resource "aws_lambda_function_event_invoke_config" "cleanup" {
  function_name = aws_lambda_function.cleanup.function_name

  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600

  destination_config {
    on_failure {
      destination = aws_sqs_queue.dlq.arn    # ✅ nothing is lost silently
    }
    on_success {
      destination = aws_sns_topic.audit.arn
    }
  }
}
```

🔴 **A Lambda without a dead letter queue loses events silently after retries are exhausted.** For remediation functions that means the remediation never happened and nobody knows.

**And alarm on the DLQ, because a queue nobody watches is the same as no queue:**

```hcl
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "lambda-dlq-not-empty"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = { QueueName = aws_sqs_queue.dlq.name }
  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Step Functions for Multi-Step Work

When automation exceeds 15 minutes or needs orchestration, Lambda alone is the wrong shape.

```json
{
  "Comment": "Patch an instance with verification and rollback",
  "StartAt": "Snapshot",
  "States": {
    "Snapshot": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:ec2:createSnapshot",
      "Parameters": { "VolumeId.$": "$.volumeId" },
      "ResultPath": "$.snapshot",
      "Next": "ApplyPatch",
      "Retry": [{
        "ErrorEquals": ["States.ALL"],
        "IntervalSeconds": 5,
        "MaxAttempts": 3,
        "BackoffRate": 2
      }]
    },
    "ApplyPatch": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "apply-patch",
        "Payload.$": "$"
      },
      "Next": "WaitForBoot",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "ResultPath": "$.error",
        "Next": "Rollback"
      }]
    },
    "WaitForBoot": { "Type": "Wait", "Seconds": 120, "Next": "HealthCheck" },
    "HealthCheck": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "health-check", "Payload.$": "$" },
      "Next": "Healthy?"
    },
    "Healthy?": {
      "Type": "Choice",
      "Choices": [{ "Variable": "$.healthy", "BooleanEquals": true, "Next": "Success" }],
      "Default": "Rollback"
    },
    "Rollback": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "restore-snapshot", "Payload.$": "$" },
      "Next": "Failed"
    },
    "Success": { "Type": "Succeed" },
    "Failed": { "Type": "Fail", "Error": "PatchFailed" }
  }
}
```

| Step Functions gives you | vs Lambda alone |
|-------------------------|-----------------|
| ✅ Runs up to a year | 15-minute hard limit |
| ✅ Built-in retry and catch per state | Hand-written in code |
| ✅ Visual execution history | Log archaeology |
| ✅ Wait states, no compute charged | `setTimeout` burning billed time |
| ✅ Compensating actions (rollback) | Manual bookkeeping |

✅ **The rule: if the automation has more than about three steps, needs to wait, or needs rollback, use Step Functions and keep each Lambda small and single-purpose.**

## Cost and Performance

| Lever | Effect |
|-------|--------|
| **Memory setting** | 🔴 Also scales CPU — more memory is often *cheaper* per run |
| **ARM (Graviton)** | ✅ ~20% cheaper, usually same or better performance |
| **Provisioned concurrency** | Removes cold starts; costs while idle |
| **Bundle size** | Smaller bundle, faster cold start |
| **Log retention** | 🔴 Defaults to never expire |

🔴 **Increasing memory frequently reduces cost.** Lambda allocates CPU proportionally, so a function taking 3 seconds at 512 MB may take 800 ms at 1,769 MB — fewer GB-seconds overall despite the higher rate. Test rather than assume the minimum is cheapest.

```hcl
resource "aws_lambda_function" "cleanup" {
  architectures = ["arm64"]     # ✅ cheaper
  memory_size   = 512
  timeout       = 300
}

# 🔴 Log groups default to infinite retention — create it explicitly
resource "aws_cloudwatch_log_group" "cleanup" {
  name              = "/aws/lambda/${aws_lambda_function.cleanup.function_name}"
  retention_in_days = 14
}
```

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| No dead letter queue | 🔴 Events lost silently | DLQ + an alarm on depth |
| No idempotency | Duplicate actions on retry | Conditional write, or Powertools |
| Restrictive auto-remediation | Automation causes an outage | Automate additive fixes only |
| No dry-run on destructive jobs | Deletes the wrong things | `DRY_RUN` env var |
| No escape-hatch tag | Cannot exempt one resource | Honour a `Retain` tag |
| Aborting the loop on first error | One bad item stops everything | Per-item try/catch |
| Clients inside the handler | Slower invocations | Module scope |
| Log group not declared | Infinite retention, growing bill | Explicit `retention_in_days` |
| Minimum memory to "save money" | Often costs more | Tune — CPU scales with memory |
| Multi-step logic in one function | Untestable, hits the 15-min limit | Step Functions |

## Interview Q&A

**Q: How would you automatically remediate a public S3 bucket?**

AWS Config with the `s3-bucket-public-read-prohibited` rule detects it, EventBridge matches the compliance-change event, and a Lambda applies a public access block to that bucket and publishes a notification. The design point I would emphasise is that the remediation is additive — applying a public access block cannot break a functioning application, so it is safe to run without a human in the loop. That distinction matters generally: automating a restrictive change, such as deleting a security group rule matching 0.0.0.0/0, risks removing the rule that legitimately allows public traffic to your load balancer, so the automation causes the outage it was meant to prevent. For restrictive fixes I would alert and raise a ticket with a remediation SLA instead. AWS Config also has built-in remediation via SSM documents, which avoids writing a Lambda at all for the common cases.

**Q: Lambda gives at-least-once delivery. How do you handle that?**

By making handlers idempotent, because duplicates will happen — from Lambda's own retries, from EventBridge redelivery, and from upstream services. The standard pattern is a DynamoDB idempotency table: before doing the work, attempt a conditional write of the event ID with `attribute_not_exists`, and if the condition fails the event has already been processed so you return early. A TTL attribute cleans up old records automatically. AWS Lambda Powertools provides this as a decorator and handles the harder cases properly, including the in-progress state so two concurrent invocations of the same event do not both proceed. The alternative, where the operation permits it, is designing the action to be naturally idempotent — applying a tag or setting a configuration value is safe to repeat, whereas incrementing a counter or sending an email is not.

**Q: What happens to an event if a Lambda keeps failing?**

For asynchronous invocations, Lambda retries twice by default with delays, and then the event is **discarded** unless you have configured a destination. That silent loss is the failure mode to design against, because for a remediation function it means the remediation never happened and nothing indicates that. So I configure an `on_failure` destination pointing at an SQS dead letter queue, which preserves the event for inspection and replay. Crucially I also alarm on the queue's `ApproximateNumberOfMessagesVisible`, because a DLQ nobody monitors is functionally identical to no DLQ. For synchronous invocations there are no automatic retries — the caller gets the error and is responsible. For stream-based sources like Kinesis or DynamoDB streams the behaviour is different again: by default a failing batch blocks the shard indefinitely, which is why `bisectBatchOnFunctionError` and a failure destination matter there.

**Q: When would you use Step Functions instead of a single Lambda?**

When the automation has multiple steps, needs to wait, or needs rollback. The hard constraint is Lambda's fifteen-minute limit, so anything longer requires orchestration. But the better reason is that Step Functions makes the control flow declarative and observable: retry policies with backoff per state, catch blocks routing to a compensating action, wait states that cost nothing while waiting rather than burning billed Lambda time, and an execution history you can look at visually instead of reconstructing from logs. My rule of thumb is more than about three steps, or any need to wait or roll back. The pattern I would use for something like patching is a state machine that snapshots, applies the patch, waits for boot, health checks, and either succeeds or routes to a restore-snapshot state — with each Lambda small, single-purpose, and independently testable.

**Q: Does reducing Lambda memory save money?**

Often the opposite, which surprises people. Lambda allocates CPU in proportion to configured memory, so a function set to the minimum gets a fraction of a vCPU and takes far longer to complete. Because you are billed in gigabyte-seconds, a function that runs for three seconds at 512 MB can be more expensive than the same function running in 800 milliseconds at 1,769 MB, where you get a full vCPU. So the right approach is measuring rather than assuming, and AWS Lambda Power Tuning is a Step Functions app that runs a function at several memory settings and shows the cost and duration curve. Two other levers matter: switching to arm64 gives roughly twenty percent lower cost with equal or better performance for most workloads, and reducing bundle size cuts cold start time. And the frequently-missed cost is the log group, which defaults to never expiring.

**Q: What makes a scheduled cleanup job safe to run against production?**

Three things beyond the core logic. A dry-run mode controlled by an environment variable, so the job can be deployed and observed before it deletes anything — and I would default new cleanup jobs to dry-run. An escape hatch, typically a `Retain` tag that the job checks and honours, so a specific resource can be exempted without changing code or disabling the whole job. And per-item error handling, so one snapshot that fails to delete because it backs an AMI does not abandon the remaining several hundred. I would add structured logging of the counts — deleted, skipped, failed — so the outcome of each run is queryable, and an alarm if the deletion count is anomalously high, since a bug in the cutoff calculation is the failure mode that destroys data. The IAM role should also be scoped to the specific delete action on resources matching the expected tags rather than a broad `ec2:*`.

---
[Scripting Index](./README.md) | [← AWS SDK](./04-aws-sdk.md) | [Systems Manager →](./06-systems-manager.md)
