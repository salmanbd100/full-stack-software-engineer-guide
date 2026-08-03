# Security & Compliance - Interview Preparation

Security questions test whether you think in terms of **blast radius** rather than checklists. This guide covers securing AWS infrastructure — identity, encryption, workloads, and the account itself.

> **Scope note:** this section covers securing infrastructure. Security *in the pipeline* — SAST, DAST, dependency and secret scanning, supply chain — is [DevSecOps](../DevSecOps/README.md).

## Table of Contents

1. [Fundamentals](./01-fundamentals.md) — shared responsibility, blast radius, STRIDE, zero trust, guardrails vs gates
2. [IAM Deep Dive](./02-iam-deep-dive.md) — policy evaluation, confused deputy, privilege escalation, boundaries, ABAC
3. [Secrets Management](./03-secrets.md) — Secrets Manager vs Parameter Store, rotation, IAM DB auth, External Secrets
4. [Encryption & KMS](./04-encryption.md) — envelope encryption, key policies, encryption context, rotation myths
5. [Container Security](./05-container-security.md) — build/registry/deploy/runtime, signing, admission control, IMDS theft
6. [Infrastructure Security](./06-infrastructure.md) — WAF, Shield, Network Firewall, account guardrails, SSM
7. [Compliance & Auditing](./07-compliance.md) — CloudTrail, Config, Security Hub, Macie, access reviews
8. [Security Incident Response](./08-incident-response.md) — containment without evidence loss, GuardDuty, forensics

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 02 IAM Deep Dive | Policy evaluation logic is asked in almost every AWS interview |
| 🔴 Critical | 03 Secrets Management | "Where do you store the database password?" |
| 🔴 Critical | 04 Encryption | Envelope encryption is a guaranteed question |
| 🔴 Critical | 01 Fundamentals | Shared responsibility and blast radius framing |
| 🟡 High | 05 Container Security | Expected for any Kubernetes role |
| 🟡 High | 08 Incident Response | Senior and lead roles always probe this |
| 🟡 High | 06 Infrastructure | WAF, guardrails, and the bastion question |
| 🟢 Good to know | 07 Compliance | Matters more in regulated industries |

## Top 12 Interview Questions

1. Explain the shared responsibility model — and where the line moves.
2. Walk me through how AWS evaluates whether a request is allowed.
3. Where do you store a database password?
4. Explain envelope encryption.
5. What is the confused deputy problem?
6. Why is `iam:PassRole` dangerous?
7. Are Kubernetes Secrets secure?
8. A pod is compromised via SSRF. How does the attacker escalate?
9. Why would you pay for a customer-managed KMS key?
10. How do you give engineers access to production instances?
11. Why is terminating a compromised instance the wrong first move?
12. What is a permission boundary, and how does it differ from an SCP?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Policy evaluation** | Explicit deny always wins; layers are an **intersection**, not a union |
| **Permission boundary** | A ceiling, not a grant — admin + read-only boundary = read-only |
| **SCP** | Applies to root too, which no IAM policy does |
| **Cross-account access** | 🔴 Both identity policy **and** resource policy required |
| **`iam:PassRole`** | Harmless alone; with `lambda:CreateFunction` it is administrator |
| **Confused deputy** | Vendor tricked into acting on your account — fix with `ExternalId` |
| **Database password** | IAM DB auth, or `manage_master_user_password` — never a TF variable |
| **Envelope encryption** | KMS encrypts a data key; the data key encrypts the data locally |
| **Customer-managed key** | A second authorisation gate: needs `s3:GetObject` **and** `kms:Decrypt` |
| **Key rotation** | Adds new material; old material retained, so nothing re-encrypts |
| **K8s Secrets** | Base64 is not encryption — RBAC + etcd KMS + External Secrets |
| **IMDS theft** | `http_tokens = required` + `hop_limit = 1` (containers are hop 2) |
| **Production access** | SSM Session Manager — no ports, no keys, fully logged |
| **Revoking a role** | Detaching policies does **not** kill live STS sessions — deny on `TokenIssueTime` |
| **Compromised instance** | Quarantine SG with no rules; snapshot before you terminate |

## Privilege Escalation Cheat Sheet

Permissions that are effectively administrator. Know these.

| Permission | Why |
|-----------|-----|
| `iam:AttachRolePolicy` / `PutRolePolicy` | Attach `AdministratorAccess` to yourself |
| `iam:CreatePolicyVersion` | Rewrite any policy |
| `iam:UpdateAssumeRolePolicy` | Make an admin role trust you |
| `iam:CreateAccessKey` | Keys for an admin user |
| `iam:PassRole` + `lambda:CreateFunction` | 🔴 Run code as any passable role |
| `iam:PassRole` + `ec2:RunInstances` | Launch with an admin instance profile |
| `iam:CreateRole` without a boundary condition | Create an admin role and assume it |
| `kms:PutKeyPolicy` | Grant yourself decrypt on any key |

## The Breaches That Actually Happen

Ranked by real-world frequency, not sophistication.

| Rank | Cause | Prevention |
|------|-------|-----------|
| 1 | 🔴 Public S3 bucket | Account-level public access block + SCP |
| 2 | 🔴 Leaked long-lived access key | No IAM users — roles and OIDC only |
| 3 | Over-permissive IAM | Access Analyzer, permission boundaries |
| 4 | Unpatched dependency | Continuous scanning, patch SLA |
| 5 | Exposed management interface | SSM instead of SSH |
| 6 | Secrets in Git | Scanning in CI, not just pre-commit |
| 7 | No MFA on privileged accounts | SCP requiring MFA |
| 8 | Compromised CI system | OIDC with a tightly-scoped `sub` |

✅ **Note what is absent: sophisticated zero-days.** Boring controls prevent the overwhelming majority of real incidents.

## Study Path

**Start here →** [Fundamentals](./01-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01, 02: models, IAM evaluation | 5–6 hours |
| Data protection | 03, 04: secrets, KMS | 4–5 hours |
| Workloads | 05: container security across four stages | 3–4 hours |
| Perimeter & account | 06: WAF, guardrails, access | 3–4 hours |
| Operations | 07, 08: compliance evidence, incident response | 4–5 hours |

## Related Topics

- [AWS IAM](../AWS/02-iam.md) — users, groups, roles, policy structure
- [AWS Security Services](../AWS/15-security.md) — Config, CloudTrail, GuardDuty overview
- [Kubernetes RBAC & Security](../Kubernetes/07-rbac-security.md) — cluster-side authorisation
- [Docker Security](../Docker/06-docker-security.md) — Dockerfile hardening
- [Terraform Security](../Terraform/09-security.md) — secrets in state, least privilege for CI
- [Security Groups & NACLs](../Networking/05-security-groups.md) — stateful vs stateless
- [Incident Response](../Monitoring/08-incident-response.md) — general incident command process
- [DevSecOps](../DevSecOps/README.md) — security in the pipeline

---
[← DevOps](../README.md)
