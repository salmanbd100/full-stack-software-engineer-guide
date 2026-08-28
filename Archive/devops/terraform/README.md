---
title: Terraform & Infrastructure as Code - Interview Preparation
part: 8
chapter: 0
slug: devops-terraform-index
level: intermediate # beginner | intermediate | advanced
reading_time: 5
updated: 2026-08-03
tags: [devops, terraform]
in_book: false
---

# Terraform & Infrastructure as Code - Interview Preparation

Terraform is the highest-weight infrastructure topic in AWS DevOps interviews after Kubernetes. This guide covers the language, the operational risks around state, and the production patterns interviewers use to tell whether you have really run it.

## Table of Contents

1. [IaC Fundamentals](./01-iac-fundamentals.md) — declarative vs imperative, drift, immutable infrastructure, tool landscape
2. [Terraform Basics](./02-terraform-basics.md) — HCL syntax, providers, resources, variables, the core workflow
3. [State Management](./03-state-management.md) — S3 backend, `use_lockfile`, splitting state, `import` and `moved` blocks
4. [Modules](./04-modules.md) — structure, interface design, versioning, composition, provider inheritance
5. [Advanced Patterns](./05-advanced-patterns.md) — `count` vs `for_each`, `dynamic`, lifecycle, validation, functions
6. [AWS Resources](./06-aws-resources.md) — VPC, ASG, RDS, EKS with IRSA, stack layering
7. [Testing](./07-testing.md) — the testing pyramid, `terraform test`, policy as code, reading a plan
8. [Terraform CI/CD](./08-cicd.md) — plan on PR, apply on merge, OIDC, saved plans, drift detection
9. [Security](./09-security.md) — secrets never in state, protecting state, least privilege, scanning
10. [Best Practices](./10-best-practices.md) — repo structure, environment separation, anti-patterns

**Alternative IaC tools:**

11. [AWS CloudFormation](../IaC/11-cloudformation.md) — templates, change sets, StackSets, CDK
12. [GitOps](../IaC/12-gitops.md) — Argo CD, Flux, pull vs push, Crossplane

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 03 State Management | The most-asked Terraform topic, and where real damage happens |
| 🔴 Critical | 05 Advanced Patterns | `count` vs `for_each` appears in nearly every interview |
| 🔴 Critical | 04 Modules | Every senior interview tests module design |
| 🔴 Critical | 09 Security | "Where do you put the database password?" |
| 🟡 High | 08 Terraform CI/CD | Expected at senior level |
| 🟡 High | 06 AWS Resources | You may be asked to write a VPC on a whiteboard |
| 🟡 High | 10 Best Practices | Structure and anti-patterns are design-discussion material |
| 🟢 Good to know | 01, 02, 07, 11, 12 | Fundamentals, testing depth, tool comparisons |

## Top 12 Interview Questions

1. What is the state file and why does Terraform need it?
2. `count` or `for_each` — and what breaks if you choose wrong?
3. Where do you store a database password?
4. Should you use workspaces to separate dev, staging, and production?
5. How do you bring manually-created infrastructure under Terraform?
6. You renamed a resource and the plan says it will be destroyed. Why?
7. How do you secure the state file, and why does it matter?
8. Describe a production Terraform CI/CD pipeline.
9. Why apply a saved plan file instead of re-running plan?
10. What is drift, and how do you detect it?
11. A `terraform apply` failed halfway. What now?
12. Terraform or CloudFormation?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **What state is for** | Maps code addresses to real resource IDs; the only record of what Terraform owns |
| **`count` vs `for_each`** | `for_each` — index-based addressing renumbers and replaces on removal |
| **Secrets** | Everything Terraform touches lands in state in plaintext. `manage_master_user_password`, or pass ARNs |
| **`sensitive = true`** | Hides values from output. It does **not** encrypt state |
| **Environments** | Separate AWS accounts, separate state, directory per environment. Never workspaces |
| **Locking on S3** | `use_lockfile = true`. DynamoDB locking is deprecated |
| **Renaming a resource** | A `moved` block — otherwise Terraform destroys and recreates it |
| **Apply from CI only** | Audit trail, short-lived OIDC credentials, one pinned version |
| **Reviewing a plan** | Hunt for `must be replaced` and `forces replacement` |
| **Failed apply** | State matches reality but is incomplete. Fix the cause, re-plan, apply. Never `destroy` |

## Danger Cheat Sheet

The things that destroy data. Know all of them.

| Change | Result |
|--------|--------|
| Removing a middle item from a `count` list | 🔴 Renumbers and replaces the resources after it |
| Changing RDS `identifier`, `engine`, or subnet group | 🔴 Replace — data loss |
| Enabling `storage_encrypted` on an existing RDS instance | 🔴 Replace |
| Renaming a resource with no `moved` block | 🔴 Destroy and recreate |
| Changing a `for_each` key | 🔴 Destroy and recreate that item |
| `terraform state rm` | ⚠️ Resource keeps running but is orphaned |
| `-auto-approve` on a fresh plan | ⚠️ Applies something nobody reviewed |
| `terraform init -upgrade` in CI | ⚠️ Silently changes provider versions |

**Protections, layered:**

```
Code   → lifecycle { prevent_destroy = true }
AWS    → deletion_protection = true, skip_final_snapshot = false
State  → stateful resources in their own state file
IAM    → apply role denied rds:DeleteDBInstance
Policy → Conftest rule failing any plan with a delete action
```

## Study Path

**Start here →** [IaC Fundamentals](./01-iac-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01, 02: concepts, HCL, workflow | 3–4 hours |
| Core | 03, 04, 05: state, modules, patterns | 6–8 hours |
| AWS in practice | 06: VPC, ASG, RDS, EKS | 4–5 hours |
| Production | 08, 09, 10: pipelines, security, structure | 5–6 hours |
| Depth | 07, 11, 12: testing, CloudFormation, GitOps | 4–5 hours |

**Hands-on tasks worth doing:**

- [ ] Build a three-tier VPC from scratch, with `cidrsubnet` and `for_each`
- [ ] Set up an S3 backend with `use_lockfile` and versioning
- [ ] Import a resource you created by hand, and get the plan to empty
- [ ] Refactor a resource into a module using a `moved` block
- [ ] Convert a `count` list to `for_each` and compare the plans
- [ ] Write a GitHub Actions pipeline with OIDC and a saved plan artifact
- [ ] Write a Conftest policy that blocks any plan deleting an RDS instance

## Related Topics

- [CI/CD Fundamentals](../CICD/01-cicd-fundamentals.md) — build once and promote applies to infrastructure too
- [Pipeline Security](../CICD/08-security.md) — OIDC, secrets, and scanning in pipelines
- [AWS VPC](../AWS/03-vpc.md) — the networking you are writing Terraform for
- [AWS IAM](../AWS/02-iam.md) — least privilege for Terraform's own role
- [Kubernetes EKS](../Kubernetes/02-eks.md) — what your Terraform provisions
- [GitOps](../IaC/12-gitops.md) — the pull-based alternative for in-cluster state

---
[← DevOps](../README.md)
