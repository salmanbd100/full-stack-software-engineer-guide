---
title: CI/CD - Interview Preparation
part: 8
chapter: 0
slug: devops-cicd-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-03
tags: [devops, cicd]
in_book: true
---

# CI/CD - Interview Preparation

CI/CD is the core of a DevOps role. Interviews test whether you understand the principles, not just one tool's YAML syntax. This guide covers fundamentals, the four major platforms, and the production concerns that separate mid from senior answers.

## Table of Contents

1. [CI/CD Fundamentals](./01-cicd-fundamentals.md) — CI vs CD vs CD, pipeline stages, build once, DORA metrics
2. [AWS CodePipeline](./02-aws-codepipeline.md) — CodeBuild, CodeDeploy, buildspec, cross-account deploys
3. [GitHub Actions](./03-github-actions.md) — workflow syntax, OIDC to AWS, reusable workflows, hardening
4. [GitLab CI](./04-gitlab-ci.md) — stages vs `needs`, cache vs artifacts, `rules`, review apps
5. [Jenkins](./05-jenkins.md) — declarative pipelines, shared libraries, agents, modernizing legacy setups
6. [Deployment Strategies](./06-deployment-strategies.md) — rolling, blue/green, canary, feature flags, migrations
7. [Testing in CI/CD](./07-testing.md) — test pyramid, quality gates, flaky tests, contract testing
8. [Pipeline Security](./08-security.md) — secrets, OIDC, supply chain, script injection, SBOM

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 01 Fundamentals | Every interview opens here |
| 🔴 Critical | 06 Deployment Strategies | The classic "explain blue/green vs canary" question |
| 🔴 Critical | 03 GitHub Actions | Most common platform, and the OIDC question |
| 🟡 High | 08 Pipeline Security | Expected at senior level |
| 🟡 High | 07 Testing | Shows engineering judgement, not just tooling |
| 🟡 High | 02 AWS CodePipeline | Needed for AWS-focused roles |
| 🟢 Good to know | 04 GitLab CI | If the company uses GitLab |
| 🟢 Good to know | 05 Jenkins | Legacy enterprise environments |

## Top 10 Interview Questions

1. What is the difference between Continuous Delivery and Continuous Deployment?
2. Why should an artifact be built only once and promoted?
3. Explain blue/green versus canary deployment, with the tradeoffs.
4. How do you authenticate CI/CD to AWS without storing credentials?
5. How do you do a zero-downtime deployment that includes a schema migration?
6. What is the difference between cache and artifacts?
7. How do you handle flaky tests?
8. Your pipeline takes 25 minutes. How do you make it faster?
9. How do you secure the software supply chain?
10. What are the DORA metrics and why do they matter?

## The Five Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Build strategy** | Build once, tag by commit SHA, promote the same artifact through environments |
| **Cloud auth** | OIDC federation with a tightly scoped `sub` claim — no static keys |
| **Safe deploy** | Canary with automated metric analysis and automatic rollback |
| **Schema change** | Expand/contract, so every version works against both schemas |
| **Fast feedback** | Cheapest checks first, parallel jobs, cached deps, under 10 minutes |

## Study Path

**Start here →** [CI/CD Fundamentals](./01-cicd-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01, 03: principles + GitHub Actions | 3–4 hours |
| Platforms | 02, 04, 05: CodePipeline, GitLab CI, Jenkins | 4–5 hours |
| Production | 06, 07, 08: deployment, testing, security | 4–6 hours |

## Related Topics

- [Docker](../Docker/README.md) — building the artifacts your pipeline ships
- [AWS ECS](../AWS/05-ecs.md) — the most common deploy target
- [Git Branching Strategies](../Git/03-branching-strategies.md) — trunk-based development enables CI
- [Terraform](../Terraform/) — running infrastructure changes through a pipeline

---
[← DevOps](../README.md)
