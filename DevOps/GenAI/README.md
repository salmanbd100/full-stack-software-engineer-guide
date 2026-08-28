---
title: Generative AI for DevOps - Interview Preparation
part: 8
chapter: 0
slug: devops-genai-index
level: intermediate # beginner | intermediate | advanced
reading_time: 5
updated: 2026-08-04
tags: [devops, genai]
in_book: false
---

# Generative AI for DevOps - Interview Preparation

AI tooling is now an expected part of a DevOps engineer's practice. Interviewers are checking two things: that you use it effectively, and that you understand where it fails.

⚠️ **Currency note:** AWS CodeWhisperer no longer exists as a separate product — it became **Amazon Q Developer** in 2024. This section uses current naming throughout.

## Table of Contents

1. [AI Tools for DevOps](./01-ai-tools.md) — the landscape, Amazon Q custom agents, repository instructions
2. [AI-Assisted Development](./02-code-development.md) — IaC prompting, the verification loop, reviewing agent PRs
3. [AI for Documentation](./03-documentation.md) — generate from source, runbook danger, postmortems
4. [AI-Powered Troubleshooting](./04-troubleshooting.md) — hypothesis generation, log triage, Bedrock triage automation
5. [AI for Monitoring & AIOps](./05-monitoring.md) — anomaly detection, correlation, DevOps Guru, predictive scaling
6. [Prompt Engineering for DevOps](./06-prompt-engineering.md) — constraints, debugging prompts, instruction files
7. [AI Security Considerations](./07-security.md) — data egress, insecure output, agents as principals, prompt injection
8. [Future of AI in DevOps](./08-future.md) — autonomy limits, self-healing reality, skills that grow

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 07 Security | The risk question is asked more than the capability question |
| 🔴 Critical | 02 Development | "How do you use AI safely for IaC?" — the practical test |
| 🟡 High | 01 Tools | Naming and landscape awareness; CodeWhisperer is a trap |
| 🟡 High | 06 Prompt Engineering | Repository instruction files are a strong senior signal |
| 🟡 High | 04 Troubleshooting | Where AI helps in incidents, and where it must not |
| 🟢 Good to know | 05 AIOps, 08 Future, 03 Docs | Opinion and vendor-claim questions |

## Top 12 Interview Questions

1. How do you use AI tools in your DevOps work?
2. What is the biggest risk of using AI to generate infrastructure code?
3. How do you verify AI-generated Terraform before it merges?
4. Should AI-generated code get a different review process?
5. What does AI-generated Terraform most commonly get wrong?
6. Would you give an AI agent AWS credentials? Which ones?
7. What is prompt injection, and how do you defend against it?
8. What is slopsquatting?
9. How do you use AI during a production incident — and where do you stop?
10. When would you use anomaly detection instead of a static threshold?
11. What does "self-healing infrastructure" actually mean?
12. Will AI replace DevOps engineers?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Where AI is strong** | Output that is verbose, patterned, and **cheap to verify** |
| **Biggest IaC risk** | 🔴 Wildcard IAM — it works, so nothing fails and review misses it |
| **Also commonly omitted** | Encryption and logging (optional arguments, absent from short examples) |
| **The verification loop** | fmt → validate → **read the plan** → checkov → infracost → human |
| **Why `plan` matters** | A complete, reviewable description of the change before anything happens |
| **Underused tool** | `infracost` — generated IaC defaults to expensive patterns |
| **Separate AI review process?** | ❌ No — one pipeline that assumes any code may be flawed |
| **Highest-leverage setup** | Repository instruction files (`copilot-instructions.md`, `AGENTS.md`) |
| **Best debugging technique** | Ask what evidence would **refute** each hypothesis |
| **Worst debugging mistake** | Stating your theory — models anchor and confirm your bias |
| **Log triage pattern** | Have it write the **query**, not read the data |
| **Never paste** | Customer data, credentials, and 🔴 **Terraform state** (secrets in plaintext) |
| **Regulated environments** | **Bedrock** — stays in your account, CloudTrail-logged, no training |
| **Slopsquatting** | Attackers register package names that models hallucinate |
| **Prompt injection defence** | Least privilege — assume injection succeeds, limit what success achieves |
| **Agent config split** | `tools` = may use; `allowedTools` = may use **without asking** |
| **Never auto-approve** | 🔴 Unattended `execute_bash` with your credentials |
| **"Self-healing"** | Automated remediation of **anticipated** failures — deterministic, not AI |
| **Autonomy axes** | Reversibility × blast radius |
| **The durable pattern** | AI proposes → pipeline verifies → human approves → automation executes |
| **Biggest team risk** | 🔴 **Verification debt** — generation scales, review does not |
| **AI vs the role** | Replaces tasks, not accountability. Same shift as Terraform and managed DBs |

## The Verification Loop (Memorize This)

```bash
terraform fmt -recursive && \
terraform validate && \                    # catches invented arguments
terraform plan -out=tfplan && \            # 🔴 read every line
terraform show -json tfplan > tfplan.json && \
checkov -f tfplan.json --framework terraform_plan && \
infracost breakdown --path .               # ✨ what will this cost?
```

## AI Review Checklist for Generated Infrastructure

| Check | Common Failure |
|-------|---------------|
| IAM scope | `"Action": "*"` on `"Resource": "*"` |
| Encryption | Omitted — no KMS key |
| Public exposure | Public subnet or `0.0.0.0/0` |
| Hard-coded values | Region, account ID, AMI |
| Tags | Absent → unattributable cost |
| Cost multipliers | NAT gateway per AZ, oversized instances |
| Provider version | Unpinned or deprecated syntax |
| Deletion protection | Missing on production databases |
| Logging | No CloudTrail, flow logs, or access logs |
| **Diff scope (agent PRs)** | Files touched for no reason |
| **Deletions (agent PRs)** | 🔴 Removed test, validation, or `prevent_destroy` |

## Study Path

**Start here →** [AI Tools](./01-ai-tools.md)

| Level | Topics | Time |
|-------|--------|------|
| Landscape | 01: tools, agents, instruction files | 1–2 hours |
| Practice | 02, 06: IaC generation, prompting, verification | 3 hours |
| Operations | 04, 05: troubleshooting, AIOps | 3 hours |
| Risk | 07: data, output, agents, injection | 2 hours |
| Opinion | 03, 08: documentation, autonomy limits | 2 hours |

## Related Topics

- [DevSecOps Fundamentals](../DevSecOps/01-fundamentals.md) — guardrails that catch insecure output whoever wrote it
- [Infrastructure Scanning](../DevSecOps/07-infrastructure-scanning.md) — Checkov on the resolved plan
- [Terraform Best Practices](../Terraform/10-best-practices.md) — the conventions to encode in instruction files
- [Monitoring: Alerting](../Monitoring/07-alerting.md) — SLO burn-rate alerts vs anomaly detection
- [Monitoring: Incident Response](../Monitoring/08-incident-response.md) — mitigate before diagnose
- [Cost Optimization](../CostOptimization/02-optimization.md) — why generated infrastructure is expensive by default
- [AWS Lambda](../AWS/06-lambda.md) — runtime for Bedrock-backed automation

---
[← DevOps](../README.md)
