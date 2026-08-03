# Security Incident Response

A security incident differs from an outage in one critical way: **the adversary is still active, and evidence matters.** That changes what you do first.

> For general incident process — incident command, severity levels, postmortems — see [Incident Response](../Monitoring/08-incident-response.md). This file covers what is different when it is an attack.

## 🔴 How Security Incidents Differ

| | Outage | Security Incident |
|---|---|---|
| **First instinct** | Restart, roll back | 🔴 **Do not** — preserve evidence first |
| **Adversary** | None | ✅ Assume they are watching your response |
| **Goal** | Restore service | Contain, then investigate, then restore |
| **Comms** | Status page | Legal, regulator, possibly law enforcement |
| **Deadline** | Business pressure | GDPR: 72 hours to notify |

🔴 **The instinct to terminate the compromised instance destroys the investigation.** You lose memory, running processes, network connections, and the attacker's tooling — and without knowing how they got in, you will be compromised again the same way.

```
❌ Wrong order:  terminate instance → service restored → "what happened?" (unanswerable)
✅ Right order:  isolate → snapshot → investigate → eradicate → restore
```

## The Response Sequence

```
1. DETECT     GuardDuty finding, anomaly, or a report
2. TRIAGE     Real or false positive? What is the scope?
3. CONTAIN    Stop the spread — WITHOUT destroying evidence
4. PRESERVE   Snapshot volumes, capture memory, export logs
5. ERADICATE  Remove access, rotate everything, patch the entry point
6. RECOVER    Rebuild from known-good, verify
7. LEARN      Postmortem, notify if required
```

## Containment Without Destroying Evidence

This is the technique interviewers want to hear.

```bash
# 1. Isolate — a security group with NO rules at all.
#    The instance keeps running; nothing can reach it and it can reach nothing.
aws ec2 create-security-group \
  --group-name quarantine --description "Forensic isolation" \
  --vpc-id vpc-0abc123
# Do NOT add any rules

aws ec2 modify-instance-attribute \
  --instance-id i-0compromised \
  --groups sg-quarantine

# 2. Remove the instance from its target group / ASG without terminating it
aws autoscaling detach-instances \
  --instance-ids i-0compromised \
  --auto-scaling-group-name app-asg \
  --should-decrement-desired-capacity

# 3. Revoke the IAM role's active sessions
aws iam put-role-policy \
  --role-name app-instance-role \
  --policy-name RevokeOlderSessions \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Deny","Action":"*","Resource":"*",
      "Condition":{"DateLessThan":{"aws:TokenIssueTime":"2026-08-03T14:00:00Z"}}
    }]
  }'

# 4. Snapshot for forensics BEFORE anything else changes
aws ec2 create-snapshot \
  --volume-id vol-0abc123 \
  --description "FORENSIC i-0compromised 2026-08-03" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Forensic,Value=true},{Key=Incident,Value=INC-2026-0042}]'
```

> ✅ **The quarantine security group is the key trick.** An empty security group cuts all network access while the instance stays running, so memory and processes are intact for analysis. Terminating would destroy all of it.

🔴 **The IAM session revocation policy is the important detail people miss.** Deleting a role or detaching policies does **not** invalidate already-issued STS credentials — those remain valid until expiry, potentially hours. A deny conditioned on `aws:TokenIssueTime` invalidates existing sessions immediately while allowing new ones.

## GuardDuty

```hcl
resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs { enable = true }
    kubernetes { audit_logs { enable = true } }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes { enable = true }
      }
    }
  }
}

# Runtime monitoring for EKS and ECS
resource "aws_guardduty_detector_feature" "runtime" {
  detector_id = aws_guardduty_detector.main.id
  name        = "RUNTIME_MONITORING"
  status      = "ENABLED"

  additional_configuration {
    name   = "EKS_ADDON_MANAGEMENT"
    status = "ENABLED"
  }
}
```

**Findings that mean you are already compromised:**

| Finding | Meaning |
|---------|---------|
| `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration` | 🔴 Node credentials used from outside AWS — active theft |
| `CryptoCurrency:EC2/BitcoinTool.B` | 🔴 Mining — the instance is running attacker code |
| `Backdoor:EC2/C&CActivity.B` | 🔴 Talking to a command and control server |
| `UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B` | Login from an anomalous location |
| `Persistence:IAMUser/NetworkPermissions` | Attacker modifying security groups |
| `Discovery:S3/MaliciousIPCaller` | Enumeration from a known-bad source |
| `Execution:Runtime/NewBinaryExecuted` | Unexpected binary in a container |

✅ **`InstanceCredentialExfiltration` is the highest-priority finding GuardDuty produces.** It means credentials issued to your instance are being used from an IP outside AWS — the SSRF-to-IMDS path has already succeeded.

**Automated first response:**

```hcl
resource "aws_cloudwatch_event_rule" "guardduty_critical" {
  name = "guardduty-high-severity"

  event_pattern = jsonencode({
    source        = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 7] }]   # HIGH and CRITICAL
    }
  })
}

resource "aws_cloudwatch_event_target" "isolate" {
  rule      = aws_cloudwatch_event_rule.guardduty_critical.name
  target_id = "auto-isolate"
  arn       = aws_lambda_function.isolate_instance.arn
}
```

✅ Automate **isolation**, not termination. Speed matters for containment; the analysis needs the instance intact.

## Amazon Detective

```
GuardDuty:  "this instance is talking to a C&C server"   ← the alert
Detective:  "here is the full behaviour graph"           ← the investigation
```

✅ **Detective builds a behaviour graph from CloudTrail, VPC Flow Logs, and GuardDuty findings**, so you can answer follow-on questions without writing queries: what else did this role do, what other resources did this IP touch, when did the behaviour first deviate from baseline.

⚠️ Enable it **before** you need it. It builds a baseline over time, so switching it on during an incident gives you no historical comparison.

## Forensic Analysis

```bash
# Mount the forensic snapshot on a dedicated analysis instance, READ-ONLY
aws ec2 create-volume \
  --snapshot-id snap-0forensic \
  --availability-zone eu-west-1a \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Forensic,Value=true}]'
```

```bash
# On the isolated analysis instance
mount -o ro,noexec,nodev /dev/xvdf1 /mnt/evidence

# Establish a timeline of file modification
find /mnt/evidence -newermt "2026-08-03 12:00" -type f 2>/dev/null | head -50

# Persistence mechanisms — where attackers ensure they survive a reboot
cat /mnt/evidence/var/spool/cron/crontabs/* 2>/dev/null
ls -la /mnt/evidence/etc/cron.*
cat /mnt/evidence/root/.ssh/authorized_keys
cat /mnt/evidence/home/*/.ssh/authorized_keys
ls -la /mnt/evidence/etc/systemd/system/

# Entry point — what was in the logs before the first sign of compromise
grep -i "accepted\|failed" /mnt/evidence/var/log/auth.log | tail -100
```

🔴 **Chain of custody matters if this may become a legal matter:**

| Requirement | Practice |
|-------------|----------|
| Preserve the original | ✅ Analyse a copy; the snapshot stays untouched |
| Document every action | Timestamped log of who did what |
| Hash the evidence | `sha256sum` recorded at acquisition |
| Restrict access | Dedicated forensics account, tight IAM |
| Read-only mounting | `mount -o ro,noexec` — never modify evidence |

## The Credential Compromise Playbook

The most common real AWS security incident.

```
1. IDENTIFY what the credential could reach
   → aws iam get-role / list-attached-role-policies
   → CloudTrail: every action by that principal

2. REVOKE existing sessions immediately
   → the aws:TokenIssueTime deny policy above
   → deactivate access keys: aws iam update-access-key --status Inactive
     (deactivate, don't delete — you may need it for the investigation)

3. ASSESS the blast radius
   → What did they actually do? CloudTrail lookup-events
   → Was data read? 🔴 Requires CloudTrail DATA events
   → Was anything created? Check for new IAM users, roles, instances

4. ERADICATE persistence
   → New IAM users, roles, access keys they created
   → Modified trust policies
   → New security group rules
   → Lambda functions or EventBridge rules for persistence
   → Instances in unmonitored regions  ← commonly missed

5. ROTATE everything the credential could read
   → Any secret it had kms:Decrypt or secretsmanager:GetSecretValue on

6. FIX the root cause
   → How did it leak? Git, a log, an SSRF, a phished user?
```

```bash
# What did this principal actually do?
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=compromised-role \
  --start-time 2026-08-01T00:00:00Z \
  --query 'Events[].[EventTime,EventName,SourceIPAddress]' \
  --output table

# 🔴 Check EVERY region — attackers work where you are not looking
for r in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  n=$(aws ec2 describe-instances --region "$r" \
        --filters "Name=instance-state-name,Values=running" \
        --query 'length(Reservations[].Instances[])' --output text)
  [ "$n" != "0" ] && echo "$r: $n running instances"
done
```

> 🔴 **Checking all regions is the step most people forget.** Cryptomining almost always appears in a region nobody monitors, which is exactly why an SCP restricting `aws:RequestedRegion` is such a valuable preventive control.

## Notification Obligations

⚠️ **Legal deadlines are shorter than most people expect.**

| Regime | Deadline | Trigger |
|--------|----------|---------|
| **GDPR** | 🔴 72 hours to the supervisory authority | Personal data breach likely to cause risk |
| **HIPAA** | 60 days | Unsecured protected health information |
| **PCI DSS** | Immediately to the card brands | Cardholder data |
| **SOC 2** | Per your own stated policy | Whatever you committed to |

✅ **The 72-hour GDPR clock starts when you become *aware*, not when you finish investigating.** A partial notification acknowledging that investigation is ongoing is acceptable and expected — silence is not.

🔴 **Involve legal early.** Whether an event is legally a "breach" is not an engineering determination, and the wording of a notification has legal consequences.

## Preparation

Almost everything that determines the outcome is decided before the incident.

| Prepare | Why |
|---------|-----|
| ✅ Dedicated forensics AWS account | Analyse evidence away from production |
| ✅ Pre-built quarantine security group | No rules — created in advance, applied in seconds |
| ✅ Break-glass role with alerting | Emergency access that announces itself |
| ✅ CloudTrail data events on sensitive buckets | 🔴 Cannot be enabled retroactively |
| ✅ Detective enabled | Needs a historical baseline |
| ✅ Written playbooks | Nobody improvises well at 3am |
| ✅ Contact list | Legal, comms, insurer, AWS support tier |
| ✅ Practised via game day | An untested playbook is fiction |

🔴 **The one thing you cannot fix during an incident is missing logs.** CloudTrail data events, VPC Flow Logs, and EKS audit logs must be enabled beforehand — you cannot retroactively discover which objects were read.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Terminating the compromised instance | 🔴 Evidence and entry point lost | Quarantine security group; snapshot first |
| Detaching IAM policies to "revoke" | Existing STS sessions remain valid | Deny on `aws:TokenIssueTime` |
| Deleting the access key immediately | Loses investigative context | Deactivate, then delete later |
| Only checking your usual regions | Miss the mining and exfiltration | Enumerate every region |
| No CloudTrail data events | Cannot determine what data was read | Enable in advance |
| Rebuilding onto the same AMI | Reintroduce the vulnerability | Patch the root cause first |
| Not rotating downstream secrets | Attacker retains access | Rotate everything reachable |
| Waiting for full analysis before notifying | 🔴 Miss the 72-hour deadline | Partial notification is acceptable |

## Interview Q&A

**Q: How does responding to a security incident differ from responding to an outage?**

The presence of an adversary changes the priorities. In an outage the goal is restoring service as fast as possible, so restarting or rolling back immediately is correct. In a security incident, doing that destroys the evidence you need to understand how they got in — and without that you will be compromised again the same way within days. So the order becomes contain, preserve, investigate, eradicate, then restore. Containment must not destroy state: you isolate rather than terminate. You also have to assume the attacker can see your response, which means being careful about where you discuss the incident, and there are legal dimensions an outage does not have — GDPR gives you seventy-two hours to notify a supervisory authority, so legal and communications need involving from the start rather than at the end.

**Q: A GuardDuty finding says instance credentials are being exfiltrated. Walk me through your response.**

That finding means credentials issued to an EC2 instance are being used from an IP address outside AWS, so the SSRF-to-metadata path has already succeeded and someone else is operating with your instance role. First, contain without destroying: apply a quarantine security group with no rules at all, which cuts every network path while leaving the instance running and its memory intact, and detach it from the autoscaling group without decrementing so capacity is replaced. Second, revoke the role's active sessions — and the important detail is that detaching policies does not invalidate already-issued STS credentials, so you attach an inline deny conditioned on `aws:TokenIssueTime` being earlier than now, which kills existing sessions immediately. Third, snapshot the volumes with forensic tags before anything else changes. Then investigate via CloudTrail what that principal actually did, enumerate every region for resources they created, rotate every secret the role could reach, and fix the entry point — which here means IMDSv2 with a hop limit of one and per-pod IAM instead of node roles.

**Q: Why is terminating a compromised instance the wrong first move?**

Because it destroys everything you need. Terminating loses volatile memory containing the attacker's running processes, injected code, decrypted data, and active network connections, and it typically loses the root volume too. Without that you often cannot determine the initial access vector, which means you rebuild onto the same vulnerable configuration and get compromised again the same way. It also destroys evidence that may be legally required if the incident becomes a regulatory or law enforcement matter. The correct alternative gives you containment without loss: apply a security group with no rules whatsoever, which severs all network connectivity so the attacker cannot act further or exfiltrate anything, while the instance continues running for analysis. Then snapshot the volumes for forensics, and only terminate once you have what you need.

**Q: You have revoked an IAM role's permissions but the attacker still has access. Why?**

Because STS credentials are bearer tokens that remain valid until they expire, independently of the role's current policies. When a session is established, the credentials are issued with a lifetime — potentially several hours — and detaching policies or even deleting the role does not retroactively invalidate them. Some AWS services continue to honour them until expiry. The correct technique is to attach an inline policy to the role denying all actions with a condition on `aws:TokenIssueTime` being less than the current timestamp, which invalidates every session issued before that moment while allowing legitimately-issued new sessions. For IAM user access keys, the equivalent is setting the key status to inactive — and I would deactivate rather than delete, because deleting removes context useful to the investigation. It is worth knowing because "I revoked it" is a very common false sense of resolution.

**Q: What must be in place before an incident that you cannot fix during one?**

Logs, primarily. CloudTrail data events cannot be enabled retroactively, so if they were off you can prove a principal had access to a bucket but not which objects they read — which for a GDPR notification is the difference between a precise scope and having to assume the worst. The same applies to VPC Flow Logs and EKS audit logs. Amazon Detective also needs enabling in advance because it builds a behavioural baseline over time, and switching it on mid-incident gives you nothing to compare against. Beyond logging: a dedicated forensics account so evidence is analysed away from production, a pre-created quarantine security group so isolation takes seconds, a break-glass role that alerts when assumed, written playbooks because nobody improvises well under pressure, and a contact list covering legal, communications, and your insurer. And all of it exercised in a game day, because an untested playbook reliably turns out to reference a decommissioned dashboard or a person who left.

**Q: When do you have to notify a regulator, and what if the investigation is incomplete?**

Under GDPR it is seventy-two hours from becoming aware of a personal data breach likely to result in risk to individuals — and the clock starts at awareness, not at the point you finish investigating. That is the part people get wrong, because the engineering instinct is to establish full facts before saying anything, and that reliably misses the deadline. A partial notification stating what is known, what is not yet known, and that the investigation continues is explicitly anticipated by the regulation and is the correct action. Other regimes differ: HIPAA allows sixty days, PCI DSS requires immediate notification to the card brands, and SOC 2 holds you to whatever your own published policy says. In all cases the determination of whether something legally constitutes a notifiable breach is a legal judgement rather than an engineering one, so legal counsel needs involving from the first hour, not once the technical work is done.

---
[Security Index](./README.md) | [← Compliance & Auditing](./07-compliance.md)
