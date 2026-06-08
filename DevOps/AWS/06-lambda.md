# AWS Lambda (Serverless)

Run code without managing servers. Pay only for what you use — per invocation and per millisecond of execution.

## How Lambda Works

```
Event Source → Lambda Service → Function runs in managed container → Response
```

Lambda manages the compute. You only write the function code and configure triggers.

**Key facts:**
- Supports Node.js, Python, Java, Go, .NET, Ruby, and custom runtimes
- Max timeout: **15 minutes**
- Memory: **128 MB to 10 GB** (CPU and network scale with memory)
- Max package size: 50 MB zipped (250 MB unzipped), or 10 GB via container image

## Invocation Types

| Type | Trigger Examples | Behavior | Retries on Error |
|------|-----------------|----------|-----------------|
| **Synchronous** | API Gateway, SDK call, ALB | Caller waits for response | No automatic retry |
| **Asynchronous** | S3, SNS, EventBridge | Lambda queues the event | 2 retries automatically |
| **Event source mapping** | SQS, DynamoDB Streams, Kinesis | Lambda polls the source | Depends on source config |

> ⚠️ Asynchronous invocations retry twice on failure. Use a **dead-letter queue (DLQ)** to capture failed events.

## Common Triggers

| Trigger | Invocation Type | Typical Use Case |
|---------|----------------|-----------------|
| **API Gateway** | Synchronous | REST or HTTP API backend |
| **S3** | Asynchronous | Process uploads (resize image, parse CSV) |
| **SQS** | Event source mapping | Reliable message processing |
| **EventBridge** | Asynchronous | Scheduled jobs, cross-service events |
| **DynamoDB Streams** | Event source mapping | React to table changes |
| **SNS** | Asynchronous | Fan-out notifications |

## Cold Starts

A **cold start** happens when Lambda must initialize a new container before running your function. This adds latency — usually 100 ms to 1+ second depending on runtime and package size.

**Why cold starts happen:**
- No warm container available (first invocation or after idle period)
- Scaling up beyond existing warm containers
- Deploying a new version

**How to reduce cold starts:**

| Strategy | How | Impact |
|----------|-----|--------|
| **Provisioned concurrency** | Pre-warm N containers at all times | Eliminates cold starts, costs more |
| **Smaller packages** | Tree-shake, remove unused deps | Shorter init time |
| **arm64 architecture** | Set `Architectures: [arm64]` | ~20% faster init, cheaper |
| **Avoid VPC if not needed** | VPC adds ENI attachment time | Significant reduction |
| **Use lighter runtimes** | Node.js/Python over Java/.NET | Faster JVM-less startup |

> ✅ Use **provisioned concurrency** for latency-sensitive APIs. Set it on the function alias, not `$LATEST`.

## Memory and Timeout

Memory setting controls CPU and network bandwidth too. A 1 GB function gets roughly 2x the CPU of a 512 MB function.

**Right-sizing tip:** Use AWS Lambda Power Tuning (open-source Step Functions workflow) to find the sweet spot between cost and speed.

```bash
# Set memory and timeout when creating
aws lambda create-function \
  --function-name image-processor \
  --runtime nodejs20.x \
  --memory-size 512 \
  --timeout 30 \
  --role arn:aws:iam::123456789012:role/lambda-exec-role \
  --handler index.handler \
  --zip-file fileb://function.zip
```

✅ Start at 512 MB. Increase if slow, decrease if CPU-idle.
❌ Don't default to 128 MB — it's often too slow and barely cheaper.

## Lambda Layers

A **layer** is a ZIP archive with shared code or dependencies. Multiple functions can reference the same layer.

```
my-function (your code)
    ↓ uses
Layer: shared-utils   ← common business logic
Layer: node-modules   ← heavy npm dependencies (e.g. aws-sdk, lodash)
```

**When to use layers:**
- ✅ Share utility code across 3+ functions
- ✅ Keep deployment packages small (layer counts toward the 250 MB limit separately)
- ❌ Don't use layers to hide complexity — prefer small focused functions

```bash
# Publish a layer
aws lambda publish-layer-version \
  --layer-name shared-utils \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs20.x

# Attach layer to a function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:shared-utils:3
```

## Environment Variables and Secrets

Use environment variables for configuration. Never hardcode secrets.

```bash
# Set environment variables
aws lambda update-function-configuration \
  --function-name my-function \
  --environment "Variables={DB_HOST=mydb.cluster.rds.amazonaws.com,ENV=production}"
```

**For secrets, use Secrets Manager — not plain env vars:**

```bash
# In your function, fetch the secret at runtime
aws secretsmanager get-secret-value \
  --secret-id prod/db/password \
  --query SecretString \
  --output text
```

> ⚠️ Plain env vars are visible in the Lambda console. Use SSM Parameter Store (SecureString) or Secrets Manager for passwords and API keys.

## Lambda Execution Role

Every Lambda function needs an **IAM execution role**. This controls what AWS services the function can call.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

✅ Grant least privilege — only the permissions the function actually needs.
❌ Never attach `AdministratorAccess` to a Lambda role.

## SQS Event Source Mapping

When Lambda reads from SQS, it processes messages in **batches**. Partial failures need special handling.

```json
{
  "BatchSize": 10,
  "FunctionResponseTypes": ["ReportBatchItemFailures"],
  "MaximumBatchingWindowInSeconds": 5
}
```

> ✅ Enable `ReportBatchItemFailures` so Lambda only retries failed messages in a batch — not the whole batch.

## Best Practices

| Practice | Why |
|----------|-----|
| Keep functions **stateless** | Containers are recycled — don't rely on in-memory state between calls |
| Set **tight timeouts** | Fail fast; don't let hanging functions run for 15 minutes |
| **Log structured JSON** | CloudWatch Logs Insights can query JSON fields |
| Use **function aliases** | Blue/green deployments and provisioned concurrency targets |
| Handle **idempotency** | Async invocations can retry — your function must be safe to call twice |

## Common CLI Commands

```bash
# Create function
aws lambda create-function \
  --function-name my-function \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789012:role/lambda-exec-role \
  --handler index.handler \
  --zip-file fileb://function.zip

# Invoke synchronously (test)
aws lambda invoke \
  --function-name my-function \
  --payload '{"key": "value"}' \
  output.json

# Deploy new code
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://function.zip

# List functions
aws lambda list-functions --query 'Functions[*].FunctionName'
```

## Interview Q&A

**Q: What is the difference between synchronous and asynchronous Lambda invocation?**

Synchronous (RequestResponse): the caller waits for the function to finish and gets the response directly. API Gateway uses this. If the function errors, the caller sees the error. Asynchronous (Event): Lambda queues the event and returns immediately. The caller doesn't wait. Lambda retries twice on failure. S3 and SNS use this. You should attach a DLQ to capture events that fail all retries.

---

**Q: What causes a Lambda cold start and how do you fix it?**

A cold start happens when Lambda has no warm container ready. It must create a new container, load the runtime, and run your init code before handling the request. This adds latency. Fixes: use provisioned concurrency (pre-warms containers), reduce package size, avoid VPC if not needed, use arm64 architecture, and use lighter runtimes like Node.js over Java.

---

**Q: When would you use Lambda instead of EC2 or ECS?**

Use Lambda for event-driven, short-lived tasks: image processing on S3 upload, API backends with unpredictable traffic, cron jobs, and fan-out pipelines. Use EC2 or ECS for long-running processes, workloads that need more than 15 minutes, or services that need persistent connections (like WebSockets at scale). Lambda shines when you have spiky or low-volume traffic — you pay nothing when idle.

---

**Q: How do you pass secrets to a Lambda function securely?**

Don't store secrets in plain environment variables — they show in the console. Instead, store secrets in AWS Secrets Manager or SSM Parameter Store (SecureString). Grant the Lambda execution role `secretsmanager:GetSecretValue` permission. Fetch the secret inside the function at startup, and cache it in memory to avoid calling Secrets Manager on every invocation.

---

**Q: How does Lambda handle partial failures when reading from SQS?**

By default, if any message in a batch fails, the entire batch is retried. Enable `ReportBatchItemFailures` in the event source mapping. Your function then returns a list of failed message IDs. Lambda only retries those specific messages — not the successful ones. This prevents duplicate processing of messages that already succeeded.

---

[← ECS](./05-ecs.md) | [S3 →](./07-s3.md)
