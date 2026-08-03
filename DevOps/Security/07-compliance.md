# Compliance & Auditing

Compliance interviews are not about memorising control numbers. They are about whether you can produce **continuous, automated evidence** instead of screenshots.

## What Auditors Actually Want

Every framework — SOC 2, ISO 27001, PCI DSS, HIPAA — asks variations of the same six questions.

| Question | Evidence That Satisfies It |
|----------|---------------------------|
| Who can access production? | IAM Identity Center assignments + access review records |
| Are changes reviewed before deployment? | ✅ Pull requests with required approvals, CI logs |
| Are logs immutable and retained? | CloudTrail + S3 Object Lock + log file validation |
| Is data encrypted at rest and in transit? | Config rules with a compliance history |
| Is there a tested incident response process? | Postmortems, game day records |
| Are vulnerabilities remediated on a timeline? | Inspector findings with resolution timestamps |

> ✅ **The DevOps answer to compliance is that good engineering practice generates the evidence for free.** Pull requests *are* change control. Config rules *are* continuous control monitoring. A screenshot proves a setting was correct once; a Config timeline proves it has been correct for 400 days.

## CloudTrail — the Foundation

Without a trustworthy audit log, no other control can be evidenced.

```hcl
resource "aws_cloudtrail" "org" {
  name                          = "acme-org-trail"
  s3_bucket_name                = aws_s3_bucket.trail.id
  is_organization_trail         = true      # ✅ every account, one trail
  is_multi_region_trail         = true      # ✅ catches activity in unused regions
  include_global_service_events = true

  # 🔴 Without this, log tampering is undetectable
  enable_log_file_validation = true

  kms_key_id = aws_kms_key.trail.arn

  # Data events — object-level access, not just API management calls
  event_selector {
    read_write_type                  = "All"
    include_management_events         = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.sensitive.arn}/"]
    }
  }
}
```

**The three settings that matter most:**

| Setting | Why |
|---------|-----|
| `is_organization_trail` | One trail covering every account; member accounts cannot disable it |
| `is_multi_region_trail` | 🔴 Attackers operate in regions you do not watch |
| `enable_log_file_validation` | ✅ Digest files let you prove logs were not altered |

⚠️ **Management events versus data events.** Management events record API calls that change configuration — creating a bucket, changing a policy. Data events record access to the contents — reading an object, invoking a Lambda. Data events are **off by default** and are the ones that answer "who read the customer data?", which is exactly what a breach investigation needs.

🔴 Data events are high volume and charged per event. Enable them selectively on sensitive buckets, not everywhere.

**Making the log bucket genuinely immutable:**

```hcl
resource "aws_s3_bucket_object_lock_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id

  rule {
    default_retention {
      mode = "COMPLIANCE"    # 🔴 not even root can delete before expiry
      days = 2555            # 7 years
    }
  }
}
```

| Object Lock Mode | Who Can Delete Early |
|-----------------|---------------------|
| `GOVERNANCE` | A principal with `s3:BypassGovernanceRetention` |
| ✅ `COMPLIANCE` | **Nobody**, including the root user and AWS |

✅ **`COMPLIANCE` mode is what "immutable audit log" means to an auditor.** It is also what stops an attacker destroying the evidence of their own activity.

⚠️ Also store the trail in a **separate log-archive account** that production roles cannot write to. An attacker with production admin should still be unable to reach the logs.

## AWS Config — Continuous Control Monitoring

CloudTrail records what happened. Config records **what the configuration was at every point in time**.

```hcl
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Conformance pack — dozens of rules from one deployment
resource "aws_config_conformance_pack" "cis" {
  name = "cis-aws-benchmark"

  template_s3_uri = "s3://acme-config-packs/CIS-Benchmark-v1.4-Level1.yaml"

  delivery_s3_bucket = aws_s3_bucket.config.id
}
```

✅ **Conformance packs are the efficient path.** AWS publishes packs mapped to CIS, PCI DSS, HIPAA, NIST 800-53, and SOC 2, so you deploy dozens of pre-mapped rules rather than authoring them.

**Why the configuration timeline matters to an auditor:**

```
Auditor: "Was this bucket ever publicly accessible during the audit period?"

Screenshot of current settings:  "It is not public today."   ⚠️ weak
Config timeline:                 "Here is every configuration
                                  change for 400 days, showing
                                  it was never public."       ✅ strong
```

**A custom rule, for controls AWS does not ship:**

```typescript
import type { Context } from "aws-lambda";
import { ConfigServiceClient, PutEvaluationsCommand } from "@aws-sdk/client-config-service";

interface ConfigInvokingEvent {
  configurationItem: {
    resourceType: string;
    resourceId: string;
    configurationItemCaptureTime: string;
    tags: Record<string, string>;
  };
}

interface ConfigEvent {
  invokingEvent: string;
  resultToken: string;
}

const REQUIRED_TAGS = ["Environment", "Owner", "CostCentre", "DataClassification"];

export async function handler(event: ConfigEvent, _ctx: Context): Promise<void> {
  const invoking: ConfigInvokingEvent = JSON.parse(event.invokingEvent);
  const item = invoking.configurationItem;

  const missing = REQUIRED_TAGS.filter((t) => !item.tags?.[t]);
  const compliant = missing.length === 0;

  const client = new ConfigServiceClient({});
  await client.send(
    new PutEvaluationsCommand({
      ResultToken: event.resultToken,
      Evaluations: [
        {
          ComplianceResourceType: item.resourceType,
          ComplianceResourceId: item.resourceId,
          ComplianceType: compliant ? "COMPLIANT" : "NON_COMPLIANT",
          Annotation: compliant ? undefined : `Missing tags: ${missing.join(", ")}`,
          OrderingTimestamp: new Date(item.configurationItemCaptureTime),
        },
      ],
    }),
  );
}
```

## Security Hub — the Aggregation Layer

```hcl
resource "aws_securityhub_account" "main" {
  enable_default_standards = false    # choose deliberately
}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:eu-west-1::standards/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "foundational" {
  standards_arn = "arn:aws:securityhub:eu-west-1::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}
```

✅ **Security Hub's value is aggregation and scoring.** It consumes findings from GuardDuty, Inspector, Macie, Config, and third-party tools into one normalised format (ASFF), across every account, with a compliance score per standard.

⚠️ **It will produce hundreds of findings on day one.** Without triage that becomes noise nobody reads.

```
1. Enable one standard — Foundational Security Best Practices
2. Suppress findings that are genuinely not applicable, with a written reason
3. Fix all CRITICAL and HIGH
4. Set an SLA for MEDIUM
5. Only then add CIS or PCI standards
```

✅ Suppress with a reason, never by disabling the control. "Not applicable because logs go to the central archive account" is auditable; a disabled control is a gap.

## Amazon Macie — Finding the Data You Did Not Know About

```hcl
resource "aws_macie2_account" "main" {
  status                       = "ENABLED"
  finding_publishing_frequency = "SIX_HOURS"
}

resource "aws_macie2_classification_job" "sensitive_scan" {
  job_type = "SCHEDULED"
  name     = "weekly-pii-scan"

  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [aws_s3_bucket.uploads.id, aws_s3_bucket.exports.id]
    }
  }

  schedule_frequency { weekly_schedule = "MONDAY" }
}
```

✅ **Macie answers the question that breaks GDPR compliance: "where is our personal data?"** In practice, personal data ends up in places nobody documented — debug log exports, database dumps in a scratch bucket, CSV exports from an analytics job. You cannot protect or delete data you cannot locate.

⚠️ Macie is charged per GB scanned. Target the buckets where data ends up unintentionally, not your entire data lake.

## Access Reviews

The control auditors ask about most, and the one most teams do worst.

```bash
# Who has access, and are the credentials healthy?
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d > report.csv

# ✅ Which granted permissions has this role never actually used?
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::111122223333:role/data-engineer

# 🔴 Is anything reachable from outside the organisation?
aws accessanalyzer list-findings \
  --analyzer-arn "$ANALYZER_ARN" \
  --filter '{"status":{"eq":["ACTIVE"]}}'
```

**A quarterly review that generates its own evidence:**

```
1. Export IAM Identity Center assignments and IAM roles
2. Pull service last-accessed data for each role
3. Managers confirm their team's access in a tracked ticket
4. Remove unused permissions and departed users
5. ✅ The ticket, with approvals, IS the audit evidence
```

✅ **Automate the detection, keep the human in the approval.** A script that lists roles with permissions unused for 90 days turns a week of manual work into a review of a short list.

## Mapping Frameworks to AWS Controls

| Requirement (common to most frameworks) | AWS Implementation |
|----------------------------------------|-------------------|
| Access control and least privilege | IAM, permission boundaries, SCPs, Identity Center |
| Audit logging | CloudTrail org trail + Object Lock COMPLIANCE |
| Encryption at rest | KMS customer-managed keys, Config rules verifying |
| Encryption in transit | ACM, TLS 1.2 minimum, `aws:SecureTransport` deny |
| Network segmentation (PCI) | Separate accounts, TGW route tables, security groups |
| Vulnerability management | Inspector continuous scanning, patch SLA |
| Change management | ✅ Pull requests, CI/CD records, Terraform state history |
| Monitoring and alerting | GuardDuty, Security Hub, CloudWatch alarms |
| Data residency (GDPR) | SCP restricting `aws:RequestedRegion` |
| Right to erasure (GDPR) | Documented deletion process, Macie to locate data |
| Breach notification (72h) | Incident response plan with defined timelines |

⚠️ **PCI DSS specifics worth knowing:** TLS 1.0 and 1.1 are prohibited outright, the cardholder data environment must be network-segmented from everything else, and quarterly external scans by an approved vendor are mandatory. The usual architecture is a completely separate AWS account for the cardholder data environment.

## Evidence Automation

```hcl
# Audit Manager continuously collects evidence mapped to a framework
resource "aws_auditmanager_assessment" "soc2" {
  name           = "SOC2-2026"
  framework_id   = data.aws_auditmanager_framework.soc2.id

  assessment_reports_destination {
    destination      = "s3://acme-audit-evidence"
    destination_type = "S3"
  }

  scope {
    aws_accounts { id = data.aws_caller_identity.current.account_id }
  }

  roles {
    role_arn  = aws_iam_role.audit_owner.arn
    role_type = "PROCESS_OWNER"
  }
}
```

✅ **Audit Manager collects evidence continuously and maps it to framework controls**, which replaces the annual scramble of screenshots and spreadsheets.

| Manual approach | Automated approach |
|----------------|-------------------|
| Screenshots taken during audit week | ✅ Continuous Config timeline |
| Spreadsheet of who has access | Identity Center export + review tickets |
| "We review changes" | ✅ Pull request records with approvals |
| Point-in-time proof | Proof across the whole audit period |

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| CloudTrail without log file validation | Tampering undetectable | `enable_log_file_validation = true` |
| Trail in the same account as workloads | 🔴 An attacker with admin deletes the evidence | Separate log archive account |
| Single-region trail | Activity in other regions invisible | `is_multi_region_trail = true` |
| No data events on sensitive buckets | Cannot answer "who read the data?" | Selective data event selectors |
| Object Lock in GOVERNANCE mode | Bypassable with a permission | COMPLIANCE mode for audit logs |
| Enabling every Security Hub standard at once | Hundreds of findings, all ignored | One standard, triage, then expand |
| Disabling a control instead of suppressing | Reads as a gap to an auditor | Suppress with a documented reason |
| Access review as an annual spreadsheet | Stale, and weak evidence | Quarterly, script-assisted, ticketed |
| Treating compliance as a documentation exercise | Controls drift between audits | Config rules with continuous monitoring |

## Interview Q&A

**Q: How do you approach compliance as a DevOps engineer?**

By generating evidence continuously rather than assembling it during audit week. Every framework asks broadly the same six things: who can access production and is it reviewed, are changes reviewed before deployment, are logs immutable and retained, is data encrypted at rest and in transit, is there a tested incident response process, and are vulnerabilities remediated on a timeline. Almost all of that falls out of doing engineering properly. Pull requests with required approvals are change management evidence. An organisation CloudTrail with log file validation, delivered to a separate account with S3 Object Lock in compliance mode, is immutable audit logging. AWS Config with a conformance pack gives a continuous compliance timeline, which is far stronger evidence than a screenshot — it proves a control held for the whole period rather than that it was correct on one day. The mindset is treating each control as something monitored, not documented.

**Q: What is the difference between CloudTrail and Config?**

CloudTrail records API activity — who called what, when, from where, and whether it succeeded. Config records resource configuration state over time and evaluates it against rules. They answer different questions. If you want to know who changed the bucket policy at 2am, that is CloudTrail. If you want to know whether that bucket has ever been publicly accessible during the last twelve months, that is Config, because it maintains a configuration timeline you can query historically. In an investigation you use both: Config tells you the resource was misconfigured between two timestamps, and CloudTrail tells you which principal made the change and what else that principal did. For compliance, Config is usually the more valuable of the two, because auditors care about whether controls held continuously rather than about individual API calls.

**Q: What are CloudTrail data events and why do they matter?**

Management events record control-plane activity — creating a bucket, modifying a policy, launching an instance. Data events record data-plane access — reading a specific S3 object, invoking a Lambda, querying a DynamoDB item. Data events are disabled by default, and they are the ones that answer the question a breach investigation actually turns on: which objects did the compromised principal read? Without them you can prove someone had access but not what they took, which for a GDPR breach notification is the difference between "personal data may have been accessed" and a precise scope. The reason they are off by default is volume — they are charged per event and a busy bucket generates enormous numbers of them. So the practical approach is enabling them selectively on the buckets holding sensitive data rather than everywhere.

**Q: How do you make audit logs tamper-proof?**

Several layers, because a competent attacker targets the logs. First, the trail is an organisation trail configured in a dedicated log archive account, so a principal with administrator in a production account has no write path to the log bucket at all. Second, log file validation enabled, which produces signed digest files so any modification or deletion of a log file is detectable after the fact. Third, S3 Object Lock in compliance mode on the bucket, which means no principal — not an account admin, not the organisation management account, not the root user, not AWS support — can delete an object before its retention period expires. Fourth, an SCP denying `cloudtrail:StopLogging` and `cloudtrail:DeleteTrail` across the organisation, which applies even to root and therefore cannot be worked around from inside a member account. Governance mode is not sufficient for this, because it is bypassable with a permission.

**Q: Security Hub has produced eight hundred findings. What do you do?**

Not try to fix eight hundred findings, because that is how teams end up ignoring the whole tool. I would start by reducing scope: enable one standard, the AWS Foundational Security Best Practices, rather than every standard at once. Then triage rather than remediate — a large share of initial findings are genuinely not applicable to how the estate is designed, for example a control expecting per-account logging when logs are centralised in an archive account. Those get suppressed with a written justification, which is auditable, rather than by disabling the control, which reads as a gap. What remains gets prioritised by severity: fix everything critical and high, set an SLA for medium, and accept low with documented rationale. Only once that is under control would I add CIS or PCI standards. The important principle is that a finding count trending down is progress, while a static count of eight hundred is a tool nobody uses.

**Q: How do you handle a GDPR right-to-erasure request?**

The hard part is locating the data, not deleting it. Personal data spreads beyond the primary database into places nobody documented — analytics exports, database dumps in a scratch bucket, log lines containing email addresses, backups, search indexes, and third-party processors. So the first requirement is a data inventory, and Amazon Macie is the practical tool for finding personal data in S3 that nobody knew was there. Then a documented deletion process covering every location, including backups, where the usual approach is either targeted deletion or documented retention expiry with the request recorded so the data is not restored. Cryptographic erasure is a useful pattern where per-tenant KMS keys mean destroying the key renders that tenant's data unrecoverable without touching the storage. Alongside that, the process itself needs to be evidenced — the request, the actions taken, and the completion date — because demonstrating the capability is part of the compliance obligation, not just performing it.

---
[Security Index](./README.md) | [← Infrastructure Security](./06-infrastructure.md) | [Incident Response →](./08-incident-response.md)
