---
title: CI/CD Fundamentals
part: 8
chapter: 0
slug: cicd-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [devops, cicd, fundamentals]
in_book: true
---

# CI/CD Fundamentals {#ch-cicd-fundamentals}

> Separate integration, delivery and deployment in one sentence, then describe a pipeline that builds its artefact once.

**In this chapter:** the three terms · pipeline stages · build once, promote many · artefacts and versioning · DORA metrics

## The Three Terms

Interviewers ask this to check if you know the difference. Most candidates blur them together.

| Term | What It Automates | Where It Stops |
|------|------------------|----------------|
| **Continuous Integration** | Build + test on every commit | Produces a tested artifact |
| **Continuous Delivery** | Everything up to deploy | Deploy to production is a **manual approval** |
| **Continuous Deployment** | Deploy included | Every green build reaches production automatically |

```
Commit → Build → Test → Artifact          = Continuous Integration
                            ↓
                    Deploy to staging      = Continuous Delivery
                            ↓
                    [manual approval]
                            ↓
                    Deploy to production
                            ↓
        (remove the approval gate)          = Continuous Deployment
```

> **Continuous Delivery** means you *can* deploy at any time. **Continuous Deployment** means you *do*, on every merge.

✅ Most enterprise teams run Continuous Delivery — automated everything, with a human gate before production.

## What Problem CI Actually Solves

Before CI, teams merged large branches after weeks of work. Conflicts were painful and bugs surfaced late. This was called "integration hell".

CI fixes it with one rule: **integrate small changes into the main branch often, and prove they work automatically.**

**The core CI contract:**

- Every commit triggers a build
- The build runs the same way on every machine
- A red build blocks the merge
- The main branch is always releasable

❌ **Not CI:** a nightly build that runs tests and emails a report nobody reads.
✅ **CI:** every pull request runs tests, and a failure blocks merging.

## Pipeline Stages

A typical pipeline for a Node.js service deployed to AWS:

```
1. Source     → webhook on push / PR
2. Build      → install deps, compile TypeScript, build Docker image
3. Test       → unit → integration → contract
4. Scan       → SAST, dependency audit, image scan, IaC scan
5. Publish    → push image to ECR with an immutable tag
6. Deploy dev → apply to dev environment, run smoke tests
7. Approve    → manual gate
8. Deploy prod→ blue/green or canary, watch metrics, auto-rollback
```

**Rules that make this pipeline good:**

| Rule | Why |
|------|-----|
| **Fail fast** | Put the cheapest, fastest checks first (lint, unit tests) |
| **Build once** | Compile and package one artifact; promote it through environments |
| **Immutable artifacts** | Tag by commit SHA, never by `latest` |
| **Same pipeline, all environments** | Only config differs between dev and prod |
| **Under 10 minutes to feedback** | Slow pipelines get bypassed |

## Build Once, Promote Many

This is the single most important CI/CD principle, and a very common interview question.

❌ **Bad — rebuild per environment:**

```yaml
deploy-staging:
  script:
    - docker build -t app:staging .   # build #1
    - deploy staging

deploy-prod:
  script:
    - docker build -t app:prod .      # build #2 — DIFFERENT bytes
    - deploy prod
```

The image you tested in staging is not the image running in production. Dependency versions may have shifted between builds.

✅ **Good — one artifact, promoted:**

```yaml
build:
  script:
    - docker build -t $ECR/app:$GIT_SHA .
    - docker push $ECR/app:$GIT_SHA     # built exactly once

deploy-staging:
  script:
    - deploy $ECR/app:$GIT_SHA          # same bytes

deploy-prod:
  script:
    - deploy $ECR/app:$GIT_SHA          # same bytes, already tested
```

> If you cannot point to the exact artifact running in production and trace it to a commit, you do not have a reliable pipeline.

## Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| **Dev** | Fast feedback, may be broken | Synthetic |
| **Staging** | Production-like validation | Anonymized copy of prod |
| **Production** | Real users | Real |

⚠️ Staging is only useful if it mirrors production — same infrastructure shape, same config mechanism. A staging environment on a single small instance tells you nothing about production behaviour under load.

## Artifacts and Versioning

An **artifact** is the packaged output of your build: a Docker image, a `.zip` for Lambda, a compiled bundle.

**Tagging strategy:**

```bash
# ✅ Immutable, traceable — always deploy this
app:a3f9c21

# ✅ Human-readable release pointer (also points at a SHA)
app:v2.4.0

# ❌ Mutable — you can never reproduce what ran
app:latest
```

✅ Enable **tag immutability** in ECR so a tag can never be overwritten.

## Pipeline as Code

Pipeline definitions live in the repository, next to the code they build.

**Why it matters:**

- Pipeline changes go through code review
- The pipeline is versioned with the code — an old commit builds the old way
- Recreating a broken CI server is a `git clone`

| Tool | File |
|------|------|
| GitHub Actions | `.github/workflows/*.yml` |
| GitLab CI | `.gitlab-ci.yml` |
| Jenkins | `Jenkinsfile` |
| AWS CodePipeline | `buildspec.yml` + Terraform/CDK for the pipeline itself |

❌ Never configure a pipeline by clicking through a UI. It is invisible, unreviewable, and impossible to restore.

## Trunk-Based Development

CI works best with short-lived branches merged into `main` daily.

```
Trunk-based (works with CI):
main ──●──●──●──●──●──●──●──
        \ /  \ /  \ /
     1-day branches

Long-lived branches (fights CI):
main ──●─────────────────●──
        \               /
         ●──●──●──●──●──   (3 weeks — merge is a project)
```

✅ Use **feature flags** to merge incomplete work safely. The code ships disabled; you turn it on separately from the deploy.

> Feature flags decouple **deploy** (moving code) from **release** (exposing behaviour). This is what lets teams deploy 20 times a day.

The choice between trunk-based, GitHub Flow and GitFlow — and what each one demands of a pipeline — is argued out in [Chapter ?? — Branching and Review Workflow](#ch-branching-and-review-workflow).

## DORA Metrics

The four industry-standard measures of delivery performance. Expect at least one question on these.

| Metric | What It Measures | Elite Performance |
|--------|-----------------|-------------------|
| **Deployment frequency** | How often you ship to prod | On demand (multiple/day) |
| **Lead time for changes** | Commit → running in prod | Under 1 hour |
| **Change failure rate** | % of deploys causing incidents | Under 15% |
| **Time to restore** | How fast you recover | Under 1 hour |

> Speed and stability are not a tradeoff. Teams that deploy more often also fail less — small changes are easier to test, review, and roll back.

## Common Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|--------------|-------------|-----|
| Flaky tests | Team learns to ignore red builds | Quarantine and fix, or delete |
| 45-minute pipeline | Developers batch commits | Parallelize, cache, split test tiers |
| Secrets in pipeline files | Leaked on every clone | Secrets Manager / OIDC |
| Manual deploy steps | Not reproducible under pressure | Script everything |
| Shared mutable dev environment | Blocks the whole team | Ephemeral per-PR environments |

## Interview Q&A

**Q: What is the difference between Continuous Delivery and Continuous Deployment?**

Both automate the full pipeline through to a deployable state. In Continuous Delivery, deploying to production requires a manual approval — the team decides when to release, but the process itself is fully automated and could run at any moment. In Continuous Deployment, that approval gate is removed, so every commit that passes all stages goes to production automatically. Continuous Deployment requires much stronger automated testing, monitoring, and automatic rollback, because there is no human checkpoint. Most enterprise teams, especially in regulated domains, choose Continuous Delivery.

**Q: Why should you build an artifact only once?**

Because rebuilding per environment produces different bytes. Transitive dependencies, base images, and build tools can change between builds, so the artifact you validated in staging is not the one running in production. Building once and promoting the same immutable artifact — tagged by commit SHA — means your tests actually apply to what ships. It is also faster, and it gives you a clean audit trail from a running container back to a specific commit.

**Q: How do you keep a CI pipeline fast?**

Order stages cheapest-first so failures surface early: lint and type-check, then unit tests, then integration tests, then slower end-to-end tests. Run independent jobs in parallel and shard large test suites across runners. Cache dependencies and Docker layers between runs. Only run expensive suites where they add value — full end-to-end on merge to main rather than on every commit to a branch. The target is under ten minutes for pull request feedback; beyond that, developers start working around the pipeline.

**Q: How do you deploy an unfinished feature safely?**

Merge it behind a feature flag. The code is deployed but disabled, so it stays integrated with `main` and keeps getting tested, without being exposed to users. Enabling it becomes a runtime configuration change instead of a deployment, which means you can turn it on for internal users first, then a percentage of traffic, and turn it off instantly if metrics degrade. This separates deploy from release and avoids long-lived feature branches that break continuous integration.

**Q: What are the DORA metrics and why do they matter?**

Deployment frequency, lead time for changes, change failure rate, and time to restore service. The first two measure speed; the last two measure stability. They matter because they are outcome-based — they measure whether the pipeline actually delivers value, unlike vanity metrics such as test count or code coverage. The key research finding is that speed and stability correlate positively: teams shipping small changes frequently also have lower failure rates, because small changes are easier to review, test, and roll back.

---

[CI/CD Index](./README.md) | [GitHub Actions →](./02-github-actions.md)
