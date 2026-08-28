---
title: Alternative IaC & GitOps - Interview Preparation
part: 8
chapter: 0
slug: devops-iac-index
level: intermediate # beginner | intermediate | advanced
reading_time: 4
updated: 2026-08-04
tags: [devops, iac]
in_book: false
---

# Alternative IaC & GitOps - Interview Preparation

Terraform is the primary IaC tool in this guide. This section covers the two things you still get asked about: **CloudFormation/CDK**, because AWS-native shops use them, and **GitOps**, because it is how Kubernetes deployment now works.

**Scope note:** for Terraform itself — state, modules, testing, CI/CD, security — see [Terraform](../Terraform/README.md).

## Table of Contents

11. [AWS CloudFormation](./11-cloudformation.md) — templates, change sets, nested stacks, StackSets, CDK
12. [GitOps](./12-gitops.md) — pull vs push, Argo CD, Flux, secrets, Crossplane

## Priority Guide

| Priority | Topic | Why |
|----------|-------|-----|
| 🔴 Critical | 12 GitOps | Expected knowledge for any Kubernetes-focused role |
| 🟡 High | 11 CloudFormation | "Terraform vs CloudFormation" is a standard comparison question |

## Top 10 Interview Questions

1. Terraform or CloudFormation — how do you choose?
2. What is a change set, and what is the Terraform equivalent?
3. What happens when a CloudFormation stack update fails?
4. What is GitOps, and how is it different from a normal CI/CD deploy?
5. Why does GitOps prefer pull over push?
6. How do you handle secrets in GitOps, when the repository is the source of truth?
7. What is drift, and how does GitOps handle it?
8. When would you use CDK instead of raw CloudFormation?
9. What are StackSets for?
10. How do you do GitOps for infrastructure, not just applications?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Terraform vs CloudFormation** | Terraform: multi-cloud, richer module ecosystem, explicit state. CFN: AWS-managed state, native drift detection, no state file to protect |
| **The state trade-off** | CFN state is AWS's problem; Terraform state is yours to secure and lock |
| **Change set ≈** | `terraform plan` |
| **CFN update fails** | Automatic rollback to the previous state — helpful, but can strand a stack in `UPDATE_ROLLBACK_FAILED` |
| **CDK is** | A programming-language layer that **synthesizes CloudFormation** — the deployment engine is unchanged |
| **StackSets** | Deploy one template across many accounts and regions in an Organization |
| **GitOps core idea** | Git is the declared desired state; an in-cluster agent continuously reconciles reality to it |
| **Why pull beats push** | 🔴 No cluster credentials in CI, and drift is corrected continuously rather than only at deploy |
| **Drift under GitOps** | A manual `kubectl edit` is reverted automatically by the reconciler |
| **Secrets in GitOps** | Store a **reference**, not a value — External Secrets Operator or Sealed Secrets |
| **Infrastructure via GitOps** | Crossplane or ACK — AWS resources as Kubernetes custom resources |
| **The audit benefit** | Every production change is a reviewed, signed, revertible commit |

## Terraform vs CloudFormation Decision Table

| Situation | Choose |
|-----------|--------|
| Multi-cloud, or any non-AWS provider | ✅ **Terraform** |
| Existing Terraform expertise and modules | Terraform |
| AWS-only, want no state file to manage | CloudFormation |
| Need Service Catalog or StackSets integration | CloudFormation |
| Team prefers a real programming language | CDK (or Pulumi) |
| Deploying a baseline across 200 accounts | CloudFormation StackSets |
| Managing SaaS providers too (Datadog, GitHub) | ✅ **Terraform** |

⚠️ "Terraform is better" is a weak answer. The honest one: Terraform for multi-provider work and ecosystem, CloudFormation where deep AWS-native integration or managed state matters more than portability.

## GitOps vs Push-Based CI/CD

| | Push CI/CD | GitOps (pull) |
|---|-----------|--------------|
| **Who deploys** | The CI runner | ✅ An agent inside the cluster |
| **Cluster credentials** | 🔴 Stored in CI | ❌ None needed outside |
| **Drift correction** | Only on the next deploy | ✅ Continuous |
| **Rollback** | Re-run an old pipeline | ✅ `git revert` |
| **Audit trail** | Pipeline logs | ✅ Git history |
| **Multi-cluster** | N sets of credentials | Each cluster pulls its own state |

✅ The strongest single argument for GitOps: **your CI system no longer needs production cluster credentials.** That removes the most valuable target in the delivery chain.

## Study Path

**Start here →** [GitOps](./12-gitops.md) if you work with Kubernetes; otherwise [CloudFormation](./11-cloudformation.md)

| Level | Topic | Time |
|-------|-------|------|
| Comparison | 11: CFN model, change sets, CDK | 2–3 hours |
| Modern delivery | 12: reconciliation, Argo CD, secrets | 3–4 hours |

## Related Topics

- [Terraform](../Terraform/README.md) — the primary IaC track in this guide
- [IaC Fundamentals](../Terraform/01-iac-fundamentals.md) — declarative vs imperative, idempotence, drift
- [Terraform State Management](../Terraform/03-state-management.md) — the problem CloudFormation solves differently
- [Kubernetes: ConfigMaps & Secrets](../Kubernetes/05-configmaps-secrets.md) — External Secrets Operator
- [Kubernetes: Helm](../Kubernetes/08-helm.md) — templating that Argo CD and Flux both render
- [Infrastructure Scanning](../DevSecOps/07-infrastructure-scanning.md) — policy as code and admission control
- [Deployment Strategies](../CICD/06-deployment-strategies.md) — progressive delivery with Argo Rollouts

---
[← DevOps](../README.md)
