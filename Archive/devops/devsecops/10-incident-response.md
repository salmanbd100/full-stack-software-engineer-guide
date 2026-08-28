---
title: Detection & Automated Response
part: 8
chapter: 0
slug: devsecops-incident-response
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-04
tags: [devops, devsecops, incident, response]
in_book: false
---

# Detection & Automated Response

This topic covers **detection engineering and automated response** — building the signals that find an attacker and the automation that contains them.

> For the manual response playbook, forensics, and containment sequence, see [Security Incident Response](../Security/08-incident-response.md). This page is about detection and automation.

## Detection Is Engineering

```
❌ "We have GuardDuty enabled."
   → findings go to a console nobody opens

✅ Detection pipeline:
   signal source → detection logic → enrichment → routing → response
        ↑                                                      ↓
   log coverage                                       automated or human
```

**The questions that reveal a real detection capability:**

| Question | Weak Answer | Strong Answer |
|----------|------------|--------------|
| How would you know? | "GuardDuty would tell us" | Named detection, tested, with a routing path |
| Who gets paged? | "The security team" | An on-call rotation with a runbook link |
| How fast? | "Pretty quickly" | Alert within N minutes, measured |
| Has it ever fired? | "Not yet" | "We tested it last quarter; here's the result" |

⚠️ An untested detection is a hypothesis. If it has never fired, you do not know whether it works.

## Log Coverage — The Foundation

You cannot detect what you do not collect. Get this right before buying tools.

| Log Source | Detects | Priority |
|-----------|---------|----------|
| **CloudTrail (management, all regions)** | 🔴 API abuse, privilege escalation, log tampering | Essential |
| **CloudTrail data events** (S3, Lambda) | Bulk data access and exfiltration | High for sensitive data |
| **VPC Flow Logs** | Unexpected connections, exfiltration volume | High |
| **DNS query logs (Route 53 Resolver)** | ✅ C2 beaconing, DNS tunnelling | High, often missing |
| **ALB / CloudFront access logs** | Web attacks, scanning | High |
| **EKS audit logs** | Kubernetes API abuse | High for clusters |
| **Application auth logs** | Credential stuffing, session anomalies | High |

🔴 **CloudTrail must be enabled in every region, including ones you do not use.** Attackers deliberately operate in unused regions precisely because nobody is looking there.

```hcl
# Organization trail — cannot be disabled by a member account
resource "aws_cloudtrail" "org" {
  name                          = "org-trail"
  s3_bucket_name                = aws_s3_bucket.audit.id
  is_organization_trail         = true
  is_multi_region_trail         = true      # 🔴 non-negotiable
  enable_log_file_validation    = true      # tamper detection
  include_global_service_events = true
  kms_key_id                    = aws_kms_key.audit.arn
}
```

✅ Deliver to a bucket in a **separate log archive account** with Object Lock. If an attacker compromises the workload account, they must not be able to delete their own tracks.

## GuardDuty — The Baseline

GuardDuty analyses CloudTrail, VPC Flow Logs, and DNS logs with AWS threat intelligence. Enabling it is the single highest-value detection action on AWS.

**Findings worth wiring to a page:**

| Finding Type | Meaning |
|-------------|---------|
| `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration` | 🔴 Instance role credentials used **outside** AWS |
| `CredentialAccess:IAMUser/AnomalousBehavior` | Credential used in an unusual way |
| `Backdoor:EC2/C&CActivity.B` | Instance talking to a known command-and-control server |
| `CryptoCurrency:EC2/BitcoinTool.B` | Cryptomining — usually the first sign of compromise |
| `Discovery:S3/AnomalousBehavior` | Reconnaissance across buckets |
| `Impact:S3/MaliciousIPCaller` | Known-bad IP reaching your data |

🔴 `InstanceCredentialExfiltration` is the highest-fidelity finding GuardDuty produces. It means role credentials are being used from outside AWS — almost always SSRF or a compromised instance. Treat it as an active incident, not a ticket.

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs { enable = true }
    kubernetes { audit_logs { enable = true } }
    malware_protection {
      scan_ec2_instance_with_findings { ebs_volumes { enable = true } }
    }
  }
}
```

✅ Enable in **all regions** via a delegated administrator, and configure the free trial regions too — an attacker in `ap-south-1` is invisible otherwise.

## Custom Detections

GuardDuty covers known threat patterns. You still need detections specific to your environment.

**High-value custom detections:**

| Detection | Why It Matters |
|-----------|---------------|
| CloudTrail `StopLogging` / `DeleteTrail` | 🔴 Attacker covering tracks — near-zero false positives |
| `ConsoleLogin` without MFA | Policy violation and a common entry point |
| Root account used at all | Should never happen normally |
| IAM policy attached with `"*"` on `"*"` | Privilege escalation |
| Access key created for a human user | Should be OIDC / SSO only |
| KMS `ScheduleKeyDeletion` | Destructive, potentially ransomware |
| S3 bucket policy made public | Data exposure |
| Security group opened to `0.0.0.0/0` | Exposure |
| First-ever API call from a new region | Reconnaissance signal |

```hcl
# EventBridge rule — fires within seconds, unlike a log query
resource "aws_cloudwatch_event_rule" "cloudtrail_tampering" {
  name        = "cloudtrail-tampering"
  description = "Someone is disabling audit logging"

  event_pattern = jsonencode({
    source        = ["aws.cloudtrail"]
    "detail-type" = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["cloudtrail.amazonaws.com"]
      eventName   = ["StopLogging", "DeleteTrail", "UpdateTrail", "PutEventSelectors"]
    }
  })
}

resource "aws_cloudwatch_event_target" "page" {
  rule      = aws_cloudwatch_event_rule.cloudtrail_tampering.name
  arn       = aws_sns_topic.security_page.arn
}
```

✨ **EventBridge for speed, log queries for depth.** EventBridge reacts in seconds to a specific API call. CloudWatch Logs Insights or Athena is where you hunt for patterns across weeks.

## Runtime Detection

Cloud API logs cannot see inside a container or host.

| Signal | Tool |
|--------|------|
| Shell spawned in a container | **Falco**, GuardDuty EKS Runtime Monitoring |
| Unexpected process execution | Falco |
| Write to a read-only path | Falco |
| Outbound connection to a new destination | Falco, VPC Flow Logs |
| Credential file access | Falco |
| Malware on an EBS volume | GuardDuty Malware Protection |

```yaml
# Falco: an interactive shell in a production container is almost always an intrusion
- rule: Shell in container
  desc: Interactive shell spawned inside a running container
  condition: >
    spawned_process and container
    and shell_procs
    and proc.tty != 0
    and not container.image.repository in (allowed_debug_images)
  output: >
    Shell opened in container (user=%user.name container=%container.name
    image=%container.image.repository cmd=%proc.cmdline)
  priority: WARNING
```

✅ Runtime detection is far more effective on **distroless images** — a shell appearing where no shell exists in the image is unambiguous.

## Automated Response

Automation buys minutes that matter. Scope it carefully.

| Response | Automate? | Reason |
|----------|-----------|--------|
| Snapshot volumes for forensics | ✅ Always | Preserves evidence, zero risk |
| Isolate an instance (empty security group) | ✅ Usually | Contains without destroying evidence |
| Revoke role sessions on exfiltration finding | ✅ Yes | Speed is everything here |
| Block an IP at the WAF | ✅ Yes | Reversible |
| Disable a leaked access key | ✅ Yes | Nothing legitimate depends on a leaked key |
| **Terminate an instance** | 🔴 **Never** | Destroys evidence and may be a false positive |
| Delete a suspicious IAM role | ⚠️ Careful | May break production |

```typescript
// Lambda triggered by a GuardDuty exfiltration finding
import {
  EC2Client,
  ModifyInstanceAttributeCommand,
  CreateSnapshotCommand,
} from "@aws-sdk/client-ec2";

interface GuardDutyFinding {
  detail: {
    type: string;
    severity: number;
    resource: { instanceDetails?: { instanceId: string } };
  };
}

const ec2 = new EC2Client({});

export const handler = async (event: GuardDutyFinding): Promise<void> => {
  const { type, severity } = event.detail;
  const instanceId = event.detail.resource.instanceDetails?.instanceId;
  if (!instanceId || severity < 7) return;

  // 1. Preserve evidence FIRST — isolation can change disk state
  await ec2.send(
    new CreateSnapshotCommand({
      VolumeId: await rootVolumeOf(instanceId),
      Description: `forensic:${type}`,
      TagSpecifications: [
        { ResourceType: "snapshot", Tags: [{ Key: "Forensic", Value: "true" }] },
      ],
    }),
  );

  // 2. Isolate — an empty security group blocks all traffic, both directions.
  //    The instance stays RUNNING: memory and processes survive for analysis.
  await ec2.send(
    new ModifyInstanceAttributeCommand({
      InstanceId: instanceId,
      Groups: [process.env.QUARANTINE_SG_ID!],
    }),
  );

  await pageOnCall({ instanceId, type, severity });
};
```

🔴 **Never terminate.** Termination destroys memory, running processes, and network state — the most valuable forensic evidence. Isolate instead: the instance keeps running but can neither reach anything nor be reached.

⚠️ Removing an instance from a target group is fine, but make sure the Auto Scaling group does not immediately replace it and mask the incident. Detach it from the ASG rather than letting it be terminated.

## Reducing Alert Noise

A security alert channel nobody reads is worse than none.

| Technique | Effect |
|-----------|--------|
| **Suppress known-benign findings** | Vulnerability scanner traffic, backup tooling |
| **Enrich before routing** | Add account, environment, owner, and severity context |
| **Tier by action required** | Page · ticket · dashboard |
| **Deduplicate and group** | 200 findings from one root cause = 1 alert |
| **Filter by environment** | A finding in a sandbox is not a production page |
| **Measure precision** | Track what proportion of pages were real |

> The target is that **every page is worth waking up for**. If responders start assuming alerts are noise, real detections get missed.

## Testing Detections

| Method | What It Proves |
|--------|---------------|
| **GuardDuty sample findings** | Routing works end to end |
| **Atomic Red Team** | Individual technique is detected |
| **Purple team exercise** | ✅ Detection **and** response work together |
| **Tabletop drill** | People know what to do |

```bash
# Generates sample findings — verifies the whole pipeline without real attack traffic
aws guardduty create-sample-findings \
  --detector-id "$DETECTOR_ID" \
  --finding-types \
      UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS \
      Backdoor:EC2/C\&CActivity.B
```

✅ Run this quarterly. It catches the most common failure: an SNS subscription that silently stopped working months ago.

## Interview Q&A

**Q: How would you know if an attacker was operating in your AWS account?**

It depends on having the right logs and detections rather than on one tool. The foundation is CloudTrail enabled in every region — including unused ones, because that is precisely where attackers work — delivered to a bucket in a separate account with Object Lock so they cannot delete their own tracks. Add VPC Flow Logs and Route 53 Resolver query logs, since DNS is where command-and-control beaconing shows up and it is the source most often missing. On top of that, GuardDuty gives high-quality managed detections; the finding I would treat as an immediate incident is instance credential exfiltration, which means role credentials are being used from outside AWS and almost always indicates SSRF or a compromised host. Then I would add custom EventBridge rules for things GuardDuty does not cover, particularly CloudTrail being stopped or deleted, root account usage, and wildcard IAM policies being attached. And critically, I would test the whole path with sample findings quarterly, because the most common failure is a notification subscription that broke silently.

**Q: Which security responses would you automate, and which would you not?**

I would automate anything reversible or evidence-preserving, and nothing destructive. Snapshotting volumes for forensics is always safe and should happen first, before any other change. Isolating a compromised instance by replacing its security groups with an empty one is safe and buys real time, because the instance keeps running — so memory and process state survive — while being unable to communicate in either direction. Revoking role sessions on an exfiltration finding, disabling a leaked access key, and blocking an IP at the WAF are all fast, reversible, and worth automating. What I would never automate is termination: it destroys the memory, running processes, and network connections that are the most valuable forensic evidence, and if the finding turns out to be a false positive you have caused an outage for nothing. Deleting IAM roles automatically is similarly risky because it can break production.

**Q: GuardDuty is enabled but has never produced a real finding. Is that good?**

It is unknown, not good. It could mean nothing has happened, or it could mean the detector is not enabled in the region an attacker would use, the data sources for S3 and EKS were never turned on, or the notification path broke months ago and findings are sitting in a console nobody opens. An untested detection is a hypothesis. I would verify it by generating sample findings, which exercises the entire pipeline from detector through EventBridge and SNS to the on-call rotation without any real attack traffic, and I would make that a quarterly exercise. For deeper assurance I would run specific techniques from something like Atomic Red Team and confirm each produces the expected alert, and periodically run a purple team exercise where a real attack path is executed and both detection and response are measured end to end.

**Q: Why does CloudTrail need to be enabled in regions you do not use?**

Because attackers choose regions where nobody is looking. Once someone has credentials, they can operate in any region, and if logging is regional and only configured where your workloads run, activity in an unused region is completely invisible — no record of instances launched for cryptomining, no record of data being copied, nothing to investigate afterwards. This is a well-established pattern, which is why the standard configuration is a multi-region organization trail rather than per-account regional trails. It also means that during an investigation you check every region, not just the ones on your architecture diagram, since finding activity in an unexpected region is often the clearest indicator of scope.

**Q: How do you stop security alerts becoming noise?**

By treating alert quality as an engineering problem with a measurable target: every page should be worth waking up for. Practically, that means suppressing known-benign sources such as your own scanners and backup tooling; enriching findings with account, environment, and owner context before routing, so the responder does not start from zero; tiering by required action, so only genuinely urgent things page while the rest become tickets or dashboard items; deduplicating so a single root cause producing two hundred findings arrives as one alert; and filtering by environment, because a finding in a sandbox account is not a production incident. Then measure precision — the proportion of pages that turned out to be real — and treat a falling number as a bug to fix. The failure mode to avoid is responders learning to assume alerts are noise, because at that point the real detection gets dismissed along with the rest.

---

[← Compliance as Code](./09-compliance.md) | [DevSecOps Index](./README.md)
