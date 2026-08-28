---
title: Compliance as Code
part: 8
chapter: 0
slug: devops-devsecops-compliance
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-04
tags: [devops, devsecops, compliance]
in_book: false
---

# Compliance as Code

Compliance as code means controls are **defined, enforced, and evidenced automatically** rather than assembled by hand before an audit.

> For the frameworks themselves (SOC 2, ISO 27001, PCI DSS, GDPR) see [Security: Compliance & Auditing](../Security/07-compliance.md). This page is about automating them.

## The Problem With Manual Compliance

```
❌ The audit scramble

  Nov: audit scheduled for January
  Dec: engineers spend 3 weeks taking screenshots
  Jan: auditor asks "was this true in June?" → nobody knows
  Feb: control drifts again immediately
```

**What goes wrong:**

| Problem | Consequence |
|---------|------------|
| Evidence is a point-in-time screenshot | Says nothing about the other 364 days |
| Controls drift after the audit | Compliant on paper, not in reality |
| Compliance work is manual | Expensive, and repeated every cycle |
| Engineers see it as theatre | No behaviour change |

> An auditor's real question is not "is this configured correctly today?" but **"can you prove it was correct continuously?"** Only automation answers that.

## The Three Layers

```
1. Control as code       — the rule is a machine-readable policy
        ↓
2. Enforcement as code   — the rule is applied automatically
        ↓
3. Evidence as code      — compliance is recorded continuously
```

| Layer | Question | Tool |
|-------|----------|------|
| **Control** | What is the rule? | Config rule, OPA policy, SCP |
| **Enforcement** | How is it applied? | SCP, admission control, pipeline gate |
| **Evidence** | How do we prove it held? | Config history, Audit Manager, Security Hub |

⚠️ Most teams do layer 1 and stop. Layer 3 is what removes the audit scramble.

## Mapping Controls to Reality

Frameworks state requirements in abstract language. Your job is to translate them.

| Framework Requirement | Technical Control | Automated Check |
|----------------------|------------------|-----------------|
| "Encrypt data at rest" | KMS on S3, EBS, RDS | Config: `s3-bucket-server-side-encryption-enabled` |
| "Restrict network access" | Security groups, private subnets | Config: `restricted-ssh` |
| "Log and monitor access" | CloudTrail all regions | Config: `cloudtrail-enabled` |
| "Review access periodically" | IAM Access Analyzer + quarterly review | Access Advisor report |
| "Change management" | PR review + protected branches | Branch protection API audit |
| "Vulnerability management" | Scanning + remediation SLA | Inspector findings age |
| "Separation of duties" | Author cannot self-approve | CODEOWNERS + required reviewers |

✨ **One technical control usually satisfies many framework requirements.** Encryption at rest appears in SOC 2, ISO 27001, PCI DSS, and HIPAA. Build the control once, map it to all of them.

## AWS Config — Continuous Evidence

Config records the configuration of every resource **over time**. That history is the evidence.

```hcl
# Managed rule: any non-compliant bucket is recorded with a timestamp
resource "aws_config_config_rule" "s3_encryption" {
  name = "s3-encryption-required"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
}

# Conformance pack: dozens of rules deployed as one framework-aligned unit
resource "aws_config_conformance_pack" "cis" {
  name          = "cis-aws-benchmark"
  template_s3_uri = "s3://${var.packs_bucket}/Operational-Best-Practices-for-CIS.yaml"
}
```

**Why Config is the compliance backbone:**

| Capability | Value for Audit |
|-----------|----------------|
| **Configuration history** | ✅ Answers "was it compliant in June?" |
| **Compliance timeline per resource** | Shows exactly when drift began and ended |
| **Auto-remediation via SSM** | Proves the control self-corrects |
| **Organization-wide aggregation** | One view across all accounts |

**Auto-remediation — the control that fixes itself:**

```hcl
resource "aws_config_remediation_configuration" "block_public_s3" {
  config_rule_name = aws_config_config_rule.s3_public.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-DisableS3BucketPublicReadWrite"
  automatic        = true
  maximum_automatic_attempts = 3

  parameter {
    name         = "S3BucketName"
    resource_value = "RESOURCE_ID"
  }
}
```

✅ Auto-remediation turns a finding into a non-event. The evidence then shows detection **and** correction, which is a much stronger control narrative than "we opened a ticket".

⚠️ Be careful with automatic remediation on production resources. Reverting a deliberate change during an incident makes things worse. Auto-remediate the unambiguous items (public buckets, disabled encryption) and alert on the rest.

## Security Hub — Aggregation

Security Hub collects findings from Config, GuardDuty, Inspector, and others, and scores them against standards.

| Standard | Use |
|----------|-----|
| **AWS Foundational Security Best Practices** | ✅ The practical baseline |
| **CIS AWS Foundations Benchmark** | Widely recognized by auditors |
| **PCI DSS** | Card data environments |
| **NIST 800-53** | Public sector |

✅ Enable Security Hub in a **delegated administrator account** with all member accounts aggregated. A single compliance score per standard, across the organization, is exactly what an auditor wants to see.

## Audit Manager — Evidence Collection

Audit Manager continuously gathers evidence and maps it to framework controls.

```
Config rule results ──┐
CloudTrail events   ──┼──► Audit Manager ──► Assessment report
Security Hub findings ┘         ↑              (per control, with evidence)
                       framework mapping
                       (SOC 2, PCI, ISO, HIPAA)
```

| | Manual Evidence | Audit Manager |
|---|----------------|--------------|
| Effort per cycle | Weeks | Continuous, near-zero |
| Coverage | Point in time | Every day |
| "Was it true in June?" | ❌ Unknown | ✅ Recorded |

⚠️ Audit Manager covers the AWS-layer controls well. Process controls — training, background checks, vendor reviews, incident drills — still need human evidence.

## Compliance in the Pipeline

Some controls are best proved in the pipeline, not the cloud.

| Control | Automated Evidence |
|---------|-------------------|
| **Change management** | Every deploy traces to a reviewed, approved PR |
| **Separation of duties** | Branch protection blocks self-approval |
| **Testing performed** | Test results stored per release |
| **Vulnerability scanning performed** | Scan report attached to each artefact |
| **Artefact integrity** | Signature + SBOM per image |
| **Authorized deployers only** | OIDC role, pinned to a protected environment |

```yaml
# Emit a machine-readable compliance record with every deployment
- name: Record deployment evidence
  run: |
    cat > evidence.json <<EOF
    {
      "artifact_digest": "${IMAGE_DIGEST}",
      "commit": "${GITHUB_SHA}",
      "pull_request": "${PR_NUMBER}",
      "approved_by": "${APPROVER}",
      "scans": { "sast": "pass", "sca": "pass", "image": "pass", "iac": "pass" },
      "sbom": "s3://evidence/${GITHUB_SHA}/sbom.cdx.json",
      "signature_verified": true,
      "deployed_at": "$(date -u +%FT%TZ)",
      "deployed_by": "${GITHUB_ACTOR}"
    }
    EOF
    # Immutable, versioned, Object Lock enabled — tamper-evident
    aws s3 cp evidence.json "s3://compliance-evidence/${GITHUB_SHA}/"
```

✅ Store evidence in an S3 bucket with **versioning and Object Lock** in a separate account. Evidence an engineer could edit is not evidence.

## What Automation Cannot Cover

Be honest about this in interviews — it shows real experience.

| Requires Humans | Why |
|----------------|-----|
| Risk assessment | Judgement about business impact |
| Security awareness training | People, not systems |
| Vendor and third-party review | Contracts and questionnaires |
| Physical security | Handled by AWS, evidenced via their reports |
| Incident response **drills** | Automation can log a drill, not run it |
| Policy documents | Written, approved, reviewed by people |

> Roughly 70–80% of a cloud-focused framework can be automated. The rest is process, and pretending otherwise fails the audit.

## Common Mistakes

| Mistake | Consequence |
|---------|------------|
| Screenshots as evidence | Cannot prove continuous compliance |
| Config rules with no remediation or alerting | Findings accumulate, nothing changes |
| Compliance in a separate tool from engineering | Two sources of truth, both wrong |
| Auto-remediating everything | Reverts deliberate changes, causes incidents |
| Evidence stored where engineers can edit it | Not admissible |
| Treating compliance as a project | Drifts back within a month |

## Interview Q&A

**Q: What does "compliance as code" actually mean?**

It means expressing controls as machine-readable policy, enforcing them automatically, and collecting the evidence continuously rather than assembling it before an audit. So instead of a document saying data must be encrypted at rest, you have an AWS Config rule that evaluates every bucket, volume, and database continuously; a service control policy that denies creating unencrypted resources in the first place; and a configuration history that can show the control held on any given date. The shift that matters is in the evidence: a screenshot proves a moment, whereas Config's timeline can answer whether a resource was compliant in June, which is the question auditors actually ask. It also means compliance stops being a separate workstream and becomes a property of the platform.

**Q: How would you prepare for a SOC 2 audit on AWS?**

I would start by mapping each trust services criterion to a specific technical control and then to an automated check, because most requirements translate into a handful of concrete configurations — encryption, network restriction, logging, access review, change management. Then enable AWS Config with a conformance pack aligned to the relevant benchmark, Security Hub with the Foundational Security Best Practices standard aggregated across all accounts into a delegated administrator, and Audit Manager to collect evidence continuously and map it to the framework. For change management and separation of duties, the evidence comes from the pipeline rather than the cloud: protected branches that prevent self-approval, every deployment traceable to a reviewed pull request, and scan results plus signatures stored per artefact. I would be explicit that this covers perhaps three quarters of the requirements and that training, risk assessments, vendor reviews, and incident drills need human process evidence.

**Q: Should Config rules automatically remediate findings?**

Selectively. Auto-remediation is excellent for unambiguous, high-severity misconfigurations where the correct state is not debatable — a publicly accessible S3 bucket, a security group opened to the world on an administrative port, disabled encryption defaults. In those cases remediation converts a potential incident into a logged non-event, and the evidence trail showing detection plus automatic correction is a much stronger control story than a ticket. Where I would be cautious is anything ambiguous or production-facing, because an automated revert can undo a deliberate emergency change and turn a small problem into an outage. For those, alert a human with context. I would also always alert even when remediating, because silent auto-correction hides a pattern of repeated misconfiguration that indicates a broken paved road.

**Q: Where should compliance evidence be stored, and why does it matter?**

In a dedicated account that the engineering teams whose work is being evidenced cannot write to, in an S3 bucket with versioning and Object Lock enabled so objects cannot be modified or deleted within the retention period. This matters because the value of evidence depends entirely on its integrity — if an engineer under audit pressure could edit or delete a record, an auditor cannot rely on any of it. The same reasoning applies to CloudTrail logs, which is why the standard pattern is an organization trail delivering to a locked bucket in a separate log archive account. Practically, that also means evidence survives an incident in the workload account, including one where an attacker is deliberately deleting logs to cover their activity.

**Q: What parts of compliance cannot be automated?**

Anything requiring human judgement or human action. Risk assessment is a business decision about impact and likelihood, not a scan result. Security awareness training, background checks, and vendor and third-party reviews are process controls involving people and contracts. Policy documents must be written, approved, and periodically reviewed by named individuals. Incident response drills can be logged automatically but must actually be run by humans to be meaningful. Physical security is AWS's responsibility, evidenced through their audit reports rather than anything in your account. Being clear about this split matters, because a team claiming full automation usually has gaps they have not noticed, and the honest position — roughly seventy to eighty per cent automated with a defined process for the rest — is what actually passes an audit.

---

[← Pipeline Security](./08-pipeline-security.md) | [Index](./README.md) | [Incident Response →](./10-incident-response.md)
