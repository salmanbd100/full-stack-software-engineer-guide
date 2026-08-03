# AWS Systems Manager

Systems Manager is how you operate fleets of instances without SSH, bastion hosts, or configuration management agents you have to run yourself.

## The Capabilities That Matter

| Capability | Replaces |
|-----------|----------|
| **Session Manager** | 🔴 SSH, bastion hosts, key distribution |
| **Run Command** | Ansible ad-hoc, `for host in …; do ssh …` |
| **Patch Manager** | Hand-rolled patching scripts |
| **Parameter Store** | Config files, environment variable sprawl |
| **State Manager** | Configuration drift correction |
| **Automation** | Runbooks written in a wiki |
| **Inventory** | "What is actually installed where?" |

✅ **The SSM Agent is preinstalled on Amazon Linux, Ubuntu, and Windows AMIs.** All it needs is an instance profile and network egress — no inbound access.

## Session Manager — the Bastion Killer

```hcl
resource "aws_iam_role" "instance" {
  name = "instance-ssm"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# ✅ No inbound rules at all — SSM works over the agent's outbound connection
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = aws_vpc.main.id
}
```

```bash
# Interactive shell — no keys, no open ports, fully audited
aws ssm start-session --target i-0abc123

# ✅ Port forwarding — reach a private RDS instance from a laptop
aws ssm start-session --target i-0abc123 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["acme-prod.abc.eu-west-1.rds.amazonaws.com"],
                 "portNumber":["5432"],"localPortNumber":["5432"]}'

# SSH over SSM, if you need scp or rsync
# (add ProxyCommand to ~/.ssh/config)
ssh ec2-user@i-0abc123
```

**Session logging — non-negotiable for production:**

```hcl
resource "aws_ssm_document" "session_prefs" {
  name            = "SSM-SessionManagerRunShell"
  document_type   = "Session"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "1.0"
    description   = "Session preferences with logging"
    sessionType   = "Standard_Stream"
    inputs = {
      s3BucketName                = aws_s3_bucket.session_logs.id
      s3EncryptionEnabled         = true
      cloudWatchLogGroupName      = aws_cloudwatch_log_group.sessions.name
      cloudWatchEncryptionEnabled = true
      kmsKeyId                    = aws_kms_key.ssm.arn
      idleSessionTimeout          = "20"
      runAsEnabled                = true
      runAsDefaultUser            = "ssm-user"
      shellProfile = {
        linux = "cd /home/ssm-user && export PS1='\\u@\\h:\\w$ '"
      }
    }
  })
}
```

| Session Manager advantage | Detail |
|--------------------------|--------|
| ✅ No inbound ports | Nothing to scan or brute-force |
| ✅ No SSH keys | Nothing to distribute, rotate, or lose |
| ✅ IAM-controlled | Revoking access is removing a policy |
| ✅ Every keystroke logged | S3 and CloudWatch, KMS-encrypted |
| ✅ Works in private subnets | Via VPC endpoints, no NAT needed |
| ✅ No instance to patch | Unlike a bastion |

✅ **Restrict who can start a session, and to which instances, with tag-based IAM:**

```json
{
  "Effect": "Allow",
  "Action": "ssm:StartSession",
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": {
    "StringEquals": { "ssm:resourceTag/Environment": "dev" }
  }
}
```

⚠️ For private subnets without NAT, you need three interface endpoints: `ssm`, `ssmmessages`, and `ec2messages`. Missing `ssmmessages` is the usual reason sessions fail to start.

## Run Command

```bash
# Target by tag — no instance IDs to collect
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Environment,Values=production" \
  --parameters 'commands=["systemctl status nginx","df -h"]' \
  --max-concurrency "20%" \
  --max-errors "5%" \
  --output-s3-bucket-name acme-ssm-output \
  --comment "Health check sweep"

# Collect results
aws ssm list-command-invocations \
  --command-id "$CMD_ID" --details \
  --query 'CommandInvocations[].[InstanceId,Status]' --output table
```

🔴 **`--max-concurrency` and `--max-errors` are the safety controls.** Without them, a bad command runs on every instance simultaneously. `20%` concurrency with `5%` max errors means the rollout stops itself before it breaks the fleet.

✅ **Targeting by tag rather than instance ID** means the command applies to whatever is currently running, which matters with autoscaling.

## Patch Manager

```hcl
resource "aws_ssm_patch_baseline" "linux" {
  name             = "acme-al2023"
  operating_system = "AMAZON_LINUX_2023"

  approval_rule {
    approve_after_days  = 7          # ✅ soak time before approving
    compliance_level    = "CRITICAL"
    enable_non_security = false

    patch_filter {
      key    = "CLASSIFICATION"
      values = ["Security"]
    }
    patch_filter {
      key    = "SEVERITY"
      values = ["Critical", "Important"]
    }
  }

  rejected_patches        = ["kernel-5.10.*"]   # a known-bad version
  rejected_patches_action = "BLOCK"
}

resource "aws_ssm_maintenance_window" "patching" {
  name     = "weekly-patching"
  schedule = "cron(0 3 ? * SUN *)"
  duration = 4
  cutoff   = 1                       # ✅ stop starting new tasks 1h before the end
}

resource "aws_ssm_maintenance_window_task" "patch" {
  window_id        = aws_ssm_maintenance_window.patching.id
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  max_concurrency  = "25%"
  max_errors       = "10%"
  priority         = 1

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.prod.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Install"]
      }
    }
  }
}
```

| Setting | Purpose |
|---------|---------|
| `approve_after_days = 7` | Patches soak publicly before you install them |
| `rejected_patches` | Block a specific known-bad version |
| `max_concurrency = "25%"` | ✅ Patch a quarter of the fleet at a time |
| `cutoff` | Do not start new work near the window's end |
| `Scan` vs `Install` | Report compliance without changing anything |

✅ **Run `Scan` in production first to get a compliance report**, then `Install` during the maintenance window. Scan tells you what would change without touching anything.

⚠️ **Patch Manager reboots instances by default.** Set `RebootOption` to `NoReboot` if your deployment handles that, otherwise your maintenance window includes rolling restarts.

## Parameter Store

```hcl
resource "aws_ssm_parameter" "log_level" {
  name  = "/acme/prod/api/log-level"
  type  = "String"
  value = "info"
  tier  = "Standard"      # ✅ free
}

resource "aws_ssm_parameter" "api_key" {
  name   = "/acme/prod/api/third-party-key"
  type   = "SecureString"
  key_id = aws_kms_key.params.id

  # ✅ Value set out of band — Terraform creates the container only
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}
```

```bash
# ✅ Fetch a whole namespace at once — one API call for all config
aws ssm get-parameters-by-path \
  --path /acme/prod/api/ \
  --recursive --with-decryption \
  --query 'Parameters[].[Name,Value]' --output text
```

| | Standard tier | Advanced tier |
|---|---|---|
| **Cost** | ✅ Free | Per parameter per month |
| **Size** | 4 KB | 8 KB |
| **Parameters** | 10,000 | 100,000 |
| **Policies** | ❌ | ✅ Expiry, no-change notification |

✅ **Use a hierarchical path scheme** — `/acme/<env>/<service>/<key>` — so `get-parameters-by-path` retrieves a service's entire configuration in one call, and IAM policies can be scoped by path prefix.

> For the Secrets Manager comparison, see [Secrets Management](../Security/03-secrets.md).

## State Manager

Continuous enforcement, rather than one-off commands.

```hcl
resource "aws_ssm_association" "cloudwatch_agent" {
  name             = "AWS-ConfigureAWSPackage"
  association_name = "install-cloudwatch-agent"

  # ✅ Reapplied on this schedule — corrects drift automatically
  schedule_expression = "rate(30 days)"
  compliance_severity = "HIGH"

  targets {
    key    = "tag:Environment"
    values = ["production"]
  }

  parameters = {
    action = "Install"
    name   = "AmazonCloudWatchAgent"
  }
}
```

✅ **State Manager is the Ansible-equivalent that needs no control node.** It reapplies the desired state on a schedule, so an instance launched from a stale AMI converges automatically.

## Automation Documents — Codified Runbooks

```yaml
schemaVersion: '0.3'
description: Restart the application, capturing diagnostics first
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  AutomationAssumeRole:
    type: String
mainSteps:
  # 🔴 Capture evidence BEFORE changing anything
  - name: captureDiagnostics
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      InstanceIds: ['{{ InstanceId }}']
      Parameters:
        commands:
          - 'journalctl -u acme-api -n 1000 > /tmp/diag-$(date +%s).log'
          - 'ss -tanp >> /tmp/diag-$(date +%s).log'
          - 'aws s3 cp /tmp/diag-*.log s3://acme-incident-artifacts/'

  - name: restartService
    action: aws:runCommand
    onFailure: 'step:notifyFailure'
    inputs:
      DocumentName: AWS-RunShellScript
      InstanceIds: ['{{ InstanceId }}']
      Parameters:
        commands: ['systemctl restart acme-api']

  - name: verifyHealth
    action: aws:runCommand
    onFailure: 'step:notifyFailure'
    inputs:
      DocumentName: AWS-RunShellScript
      InstanceIds: ['{{ InstanceId }}']
      Parameters:
        commands:
          - 'sleep 15'
          - 'curl -fsS localhost:3000/health'
    isEnd: true

  - name: notifyFailure
    action: aws:executeAwsApi
    inputs:
      Service: sns
      Api: Publish
      TopicArn: 'arn:aws:sns:eu-west-1:111122223333:alerts'
      Message: 'Automated restart failed on {{ InstanceId }}'
```

✅ **The value is the ordering being enforced by the document rather than by the operator remembering.** Diagnostics are captured before the restart destroys the evidence — exactly the discipline that is hardest to maintain at 3am.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Bastion host with port 22 | Attack surface, keys to manage | Session Manager |
| Missing `ssmmessages` endpoint | Sessions fail in private subnets | All three endpoints |
| No session logging | No audit trail of production access | S3 + CloudWatch, KMS-encrypted |
| Run Command with no `max-errors` | 🔴 A bad command hits the whole fleet | Concurrency and error limits |
| Targeting instance IDs | Misses autoscaled instances | Target by tag |
| Patch Manager straight to `Install` | Untested patches in production | `Scan` first |
| Ignoring the default reboot | Unexpected restarts | Set `RebootOption` |
| Flat parameter names | Cannot fetch by path or scope IAM | `/acme/<env>/<service>/<key>` |
| Parameter values in Terraform | Plaintext in state | Create empty, `ignore_changes` |
| Unrestricted `ssm:StartSession` | Anyone reaches production | Tag-based IAM conditions |

## Interview Q&A

**Q: How do you give engineers shell access to production instances?**

Session Manager, with no bastion host and no inbound ports at all. The SSM Agent establishes an outbound connection to the service, so the instance security group needs no ingress rules whatsoever — which removes the entire attack surface of an internet-facing SSH endpoint, along with the bastion instance you would otherwise have to patch and pay for. Access is granted through IAM rather than by distributing keys, so revoking someone is removing a policy rather than hunting for their public key across every host, and you can scope access by instance tag so a developer role reaches development instances only. Every session is logged to S3 and CloudWatch, KMS-encrypted, including keystrokes. It also handles port forwarding, so reaching a private RDS instance from a laptop does not require exposing the database. In a private subnet you need the `ssm`, `ssmmessages`, and `ec2messages` interface endpoints — a missing `ssmmessages` is the usual reason sessions fail.

**Q: What are the safety controls when using Run Command across a fleet?**

`--max-concurrency` and `--max-errors`. Concurrency caps how many instances execute simultaneously, expressed as a count or percentage, and max-errors aborts the whole command once that many invocations have failed. Together they turn a fleet-wide command into a progressive rollout that stops itself: at twenty percent concurrency and five percent max errors, a command that breaks instances fails on a handful and halts rather than taking down everything. Without them, a mistake executes everywhere at once. The other important practice is targeting by tag rather than by instance ID, so the command applies to whatever is currently running — with autoscaling, a list of instance IDs collected five minutes ago is already wrong. And output should go to S3 or CloudWatch, because the inline output is truncated.

**Q: How would you set up patching for a fleet?**

A patch baseline defining what is approved, a maintenance window defining when, and a State Manager association or maintenance window task tying them together. The baseline filters to security classifications at critical and important severity, with `approve_after_days` set to around seven so patches soak publicly before installation, and a rejected-patches list for any version known to break your workload. The maintenance window runs weekly at a low-traffic hour with a cutoff so new tasks do not start near the end, and `max_concurrency` at around a quarter with `max_errors` bounded so a bad patch does not roll across everything. In production I would run the `Scan` operation first, which reports compliance without changing anything, and only then `Install`. Worth remembering that Patch Manager reboots by default, so `RebootOption` needs deciding deliberately rather than discovered during the window.

**Q: What is State Manager and how does it differ from Run Command?**

Run Command is imperative and one-off — you execute something now, against a set of targets, and it completes. State Manager is declarative and continuous: you associate a document with a set of targets and a schedule, and SSM reapplies it on that schedule, so configuration drift is corrected automatically. That makes it the closest AWS-native equivalent to a configuration management tool like Ansible or Puppet, with the significant advantage that there is no control node or master server to run. The practical use is ensuring things stay true rather than being made true once: the CloudWatch agent is installed, a specific configuration file matches, the SSM Agent itself is up to date. An instance launched from a stale AMI converges on the next association run rather than sitting in a divergent state until someone notices.

**Q: Why put a runbook in an SSM Automation document rather than a wiki?**

Because a document enforces the ordering and cannot be skipped under pressure. The example I would give is capturing diagnostics before restarting a service: everyone agrees that is correct, and at three in the morning almost nobody does it, because the restart is what stops the pain. Encoding it as step one of an Automation document means the diagnostics are captured every time, and the log is already in S3 before the process is killed — which is what makes the postmortem possible. Documents also give you per-step `onFailure` routing so a failed verification triggers a notification rather than leaving the operator to notice, they run under an explicit IAM role so the permissions are auditable, and the execution history records exactly what was done and when. A wiki page describes intent; a document is the intent, executed.

**Q: When would you use Parameter Store rather than Secrets Manager?**

For configuration and for secrets that do not need rotation, primarily because the standard tier is free while Secrets Manager charges per secret per month — a few hundred configuration values is a meaningful monthly difference for no benefit. Parameter Store also integrates naturally with a hierarchical naming scheme, so `get-parameters-by-path` with `--recursive` fetches an entire service's configuration in one API call, and IAM policies can be scoped by path prefix so a service reads only its own namespace. What pushes me to Secrets Manager is built-in rotation, native RDS integration, cross-account resource policies, and the larger size limit. So the split I would use is Parameter Store for the many config values and rarely-changing API keys, and Secrets Manager for the handful of credentials that genuinely rotate.

---
[Scripting Index](./README.md) | [← Lambda Automation](./05-lambda-automation.md)
