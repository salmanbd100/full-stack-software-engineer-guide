---
title: DevSecOps - Interview Preparation
part: 8
chapter: 0
slug: devops-devsecops-index
level: intermediate # beginner | intermediate | advanced
reading_time: 6
updated: 2026-08-04
tags: [devops, devsecops]
in_book: false
---

# DevSecOps - Interview Preparation

DevSecOps questions test whether you can make security a property of the pipeline rather than a review meeting. This section covers the tooling, the gate design, and the culture.

**Scope note:** this section is the **pipeline and tooling** view of security. For AWS platform security — IAM depth, KMS, VPC security, runtime hardening, and the manual incident playbook — see [Security & Compliance](../Security/README.md).

## Table of Contents

1. [DevSecOps Fundamentals](./01-fundamentals.md) — shift left and right, guardrails vs gates, paved roads, metrics
2. [SAST](./02-sast.md) — source-to-sink analysis, Semgrep, custom rules, the access control blind spot
3. [DAST](./03-dast.md) — ZAP API scans, the authentication problem, baseline vs active
4. [Container Security Scanning](./04-container-security.md) — Trivy, ECR enhanced scanning, distroless, SBOMs
5. [Dependency Scanning (SCA)](./05-dependency-scanning.md) — transitive deps, lockfiles, reachability, Renovate
6. [Secrets Detection](./06-secrets-detection.md) — gitleaks, push protection, rotation order, OIDC
7. [Infrastructure Scanning](./07-infrastructure-scanning.md) — Checkov on the plan, OPA policy, SCP guardrails
8. [Security in Pipelines](./08-pipeline-security.md) — gate design, SARIF routing, exceptions, break-glass
9. [Compliance as Code](./09-compliance.md) — Config, Security Hub, Audit Manager, evidence integrity
10. [Detection & Automated Response](./10-incident-response.md) — log coverage, GuardDuty, Falco, safe automation

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 01 Fundamentals | Guardrails vs gates and shift-left limits come up constantly |
| 🔴 Critical | 06 Secrets Detection | "A key was committed — what do you do?" is near-guaranteed |
| 🔴 Critical | 07 Infrastructure Scanning | Misconfiguration causes most cloud breaches |
| 🔴 Critical | 08 Pipeline Security | "Design a secure pipeline" is a standard question |
| 🟡 High | 02, 04, 05 | SAST/SCA/container scanning trade-offs and thresholds |
| 🟡 High | 10 Detection | "How would you know you were breached?" |
| 🟢 Good to know | 03 DAST, 09 Compliance | Regulated and enterprise environments |

## Top 12 Interview Questions

1. What is DevSecOps, and how is it different from having a security team?
2. What is the difference between a guardrail and a gate?
3. What does shift left mean, and what are its limits?
4. Compare SAST, DAST, and SCA — what does each miss?
5. A developer commits an AWS key to a public repo. What do you do, in order?
6. How do you stop security scanning becoming noise developers ignore?
7. Which stages of a pipeline should fail the build, and which should only report?
8. Where should container scanning happen, and why is build-time alone insufficient?
9. Why scan the Terraform plan rather than the HCL?
10. Why does IMDSv2 matter?
11. How would you know if an attacker was operating in your AWS account?
12. Which security responses would you automate — and which never?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Guardrail vs gate** | Gate blocks a process; guardrail makes the bad outcome impossible. Convert gates to guardrails |
| **Shift left's limit** | Static analysis cannot see credentials in use, shells spawning, or zero-days already shipped |
| **SAST's blind spot** | 🔴 Broken access control — intent, not a pattern. Top of OWASP, worst SAST coverage |
| **DAST's blind spot** | Same — a 200 response looks fine even when it should be 403 |
| **Highest-value test you write** | Authenticate as user A, request user B's resource, assert 404 |
| **Leaked credential order** | **Rotate first.** Then CloudTrail, revoke sessions, fix cause. History rewrite is cosmetic |
| **Secret in a Docker layer** | `rm` in a later layer does not remove it. Use BuildKit `--mount=type=secret` |
| **What to block on** | Unambiguous **and** fixable now. `--ignore-unfixed` prevents bypass culture |
| **Container scan points** | Build **and** continuous registry rescan — new CVEs hit shipped images |
| **ECR must-have** | `image_tag_mutability = "IMMUTABLE"` |
| **Biggest CVE reduction** | Distroless base image — removes 90%+ of findings, no code change |
| **HCL vs plan scanning** | Plan resolves variables — where environment-specific misconfiguration hides |
| **IMDSv2** | Turns SSRF-to-credential-theft into a non-event (`http_tokens = "required"`) |
| **Can't-be-bypassed control** | SCPs and account-level public access blocks, not scanner rules |
| **Never automate** | 🔴 Instance **termination** — destroys memory and process evidence. Isolate instead |
| **Highest-fidelity GuardDuty finding** | `InstanceCredentialExfiltration` — role credentials used outside AWS |
| **Evidence storage** | Separate account, Object Lock. Editable evidence is not evidence |

## Tooling Cheat Sheet

| Need | Tool | Note |
|------|------|------|
| SAST | **Semgrep**, CodeQL | Semgrep for custom rules; diff-aware scanning |
| DAST | **OWASP ZAP** (API scan), Nuclei | Spec-driven beats crawling |
| Container / IaC / secrets / SCA | **Trivy** | One tool covers all four |
| IaC policy | **Checkov** + **OPA/Conftest** | Checkov for known rules, OPA for your rules |
| Secrets | **gitleaks** + **push protection** | TruffleHog when you need verification |
| Dependency updates | **Renovate** | `minimumReleaseAge` blocks compromised releases |
| Signing / provenance | **cosign** | Verify at admission control |
| Runtime | **Falco**, GuardDuty Runtime Monitoring | Distroless makes signals unambiguous |
| Continuous compliance | **AWS Config** + Security Hub + Audit Manager | Config history is the evidence |

## Red Flags Cheat Sheet

Things to spot — in your own repos and in interview scenarios.

| Red Flag | Why It Is Serious |
|----------|------------------|
| `continue-on-error: true` / `\|\| true` on a scan | A control someone turned off silently |
| `actions/checkout` without `fetch-depth: 0` for secrets | Scans the tip commit only |
| OIDC trust policy pinning repo but not branch | Any branch can assume the deploy role |
| `pull_request_target` + checkout of PR head | Untrusted code runs with secrets |
| Write credentials on a PR-triggered `terraform plan` | Untrusted code with production access |
| Mutable image tags | Scan results describe an unknown artefact |
| IMDSv1 allowed | SSRF becomes credential theft |
| CloudTrail single-region | Attackers work where you are not looking |
| Ignore files with no expiry dates | Permanent blindness within a year |
| Evidence stored where engineers can edit it | Inadmissible |

## Study Path

**Start here →** [Fundamentals](./01-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Philosophy | 01: guardrails, paved roads, metrics | 2 hours |
| Code scanning | 02, 05: SAST, SCA, reachability | 3–4 hours |
| Artefacts | 04, 06: images, SBOMs, secrets | 3–4 hours |
| Infrastructure | 07: Checkov, OPA, SCPs | 3 hours |
| Pipeline design | 08: gates, exceptions, permissions | 3 hours |
| Operations | 10, 03: detection, response, DAST | 4 hours |
| Regulated work | 09: compliance automation | 2 hours |

## Related Topics

- [Security & Compliance](../Security/README.md) — IAM depth, KMS, runtime hardening, forensics
- [CI/CD Pipeline Security](../CICD/08-security.md) — runner hardening, OIDC, signing, script injection
- [Terraform Security](../Terraform/09-security.md) — state encryption, sensitive values, least privilege
- [Docker Security](../Docker/06-docker-security.md) — image hardening, capabilities, non-root
- [Kubernetes RBAC & Security](../Kubernetes/07-rbac-security.md) — admission control, pod security
- [Monitoring: Alerting](../Monitoring/07-alerting.md) — alert design and noise reduction
- [GitOps](../IaC/12-gitops.md) — signed commits and reconciliation as a control

---
[← DevOps](../README.md)
