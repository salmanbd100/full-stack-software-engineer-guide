---
title: GitLab CI
part: 8
chapter: 0
slug: gitlab-ci
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-03
tags: [devops, cicd, gitlab, ci]
in_book: false
---

# GitLab CI

GitLab CI is defined by a single `.gitlab-ci.yml` file at the repository root. Jobs run on **runners** — agents that pick up work from GitLab.

## Core Concepts

```
Pipeline
├── Stage: build   → jobs run in parallel within a stage
├── Stage: test    → starts only when build stage fully passes
└── Stage: deploy
```

| Concept | What It Is |
|---------|-----------|
| **Pipeline** | One full run, triggered by a push, MR, schedule, or API call |
| **Stage** | An ordered group. All jobs in a stage run in parallel |
| **Job** | A unit of work with a `script`. Runs on one runner |
| **Runner** | The agent executing jobs (shared, group, or project-specific) |
| **Executor** | How the runner runs the job: Docker, shell, Kubernetes |

⚠️ By default, stages are a **hard barrier** — nothing in `test` starts until every `build` job finishes. Use `needs:` to break this and get a DAG pipeline.

## A Complete Pipeline

```yaml
stages: [build, test, deploy]

variables:
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

default:
  image: node:22-alpine
  # Retry only on infrastructure failures, never on test failures
  retry:
    max: 2
    when: [runner_system_failure, stuck_or_timeout_failure]

# Skip duplicate pipelines: run for MRs and the default branch only
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - when: never

.node-cache: &node-cache
  cache:
    key:
      files: [package-lock.json]     # invalidates when the lockfile changes
    paths: [.npm/]
    policy: pull                     # jobs only read the cache

install:
  stage: build
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
    policy: pull-push                # this job writes the cache
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths: [node_modules/]
    expire_in: 1 hour

lint:
  stage: test
  needs: [install]                   # starts as soon as install finishes
  <<: *node-cache
  script: [npm run lint]

unit-test:
  stage: test
  needs: [install]
  <<: *node-cache
  script:
    - npm test -- --coverage
  coverage: '/All files.*?\s+(\d+\.\d+)/'
  artifacts:
    when: always                     # upload reports even when the job fails
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build-image:
  stage: deploy
  needs: [lint, unit-test]
  image: docker:27
  services: [docker:27-dind]
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

## `rules` — Controlling When Jobs Run

`only` and `except` are deprecated. Use `rules`.

```yaml
deploy-prod:
  stage: deploy
  script: [./deploy.sh]
  rules:
    # Skip entirely on merge requests
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: never
    # Manual gate on the default branch
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: false          # pipeline waits; blocked, not skipped
    # Auto-deploy on tags
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/
      when: on_success
```

**Rules are evaluated top to bottom. The first match wins.**

| `when` value | Effect |
|--------------|--------|
| `on_success` | Run if all earlier stages passed (default) |
| `manual` | Show a play button; requires a human click |
| `never` | Do not add the job to the pipeline |
| `always` | Run even if earlier jobs failed |
| `delayed` | Run after `start_in: 30 minutes` |

**Run a job only when relevant files change:**

```yaml
migrate-db:
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      changes: [migrations/**/*]
```

✅ `changes` is how you build fast monorepo pipelines — only test and deploy the services that actually changed.

## Cache vs Artifacts

This distinction is the most common GitLab CI interview question.

| | Cache | Artifacts |
|-|-------|-----------|
| **Purpose** | Speed up jobs | Pass files forward, keep outputs |
| **Guaranteed?** | ❌ Best effort — may be missing | ✅ Yes, if the job succeeded |
| **Direction** | Reused across pipelines | Downstream jobs in the same pipeline |
| **Stored** | On the runner (or object storage) | On the GitLab server |
| **Use for** | `.npm/`, `.gradle/`, `vendor/` | `dist/`, `node_modules/`, test reports |

```
Pipeline 1: install ──cache──▶ (stored)
                 │
                 └─artifacts──▶ test job (same pipeline)

Pipeline 2: install ◀──cache── (restored)
```

⚠️ Never depend on the cache for correctness. If a job *must* have a file, that file has to come from an artifact.

**`dependencies:` controls which artifacts a job downloads:**

```yaml
deploy:
  dependencies: [build]     # only download build's artifacts, not everything
```

✅ Set `dependencies: []` on jobs that need nothing — it avoids downloading gigabytes of artifacts for no reason.

## `needs:` — DAG Pipelines

Without `needs`, a slow job in an early stage blocks everything.

```
Stage-based (slow):
build(5m) ──────────▶ test(2m) ──────────▶ deploy
lint(10s)  ┘

DAG with needs (fast):
build(5m) ──▶ test(2m) ──▶ deploy
lint(10s) ────────────────▶ (independent)
```

```yaml
lint:
  stage: test
  needs: []          # starts immediately, ignores stage order
```

✅ `needs: []` on fast checks like linting means developers see style failures in seconds instead of minutes.

## AWS Deployment with OIDC

Same principle as GitHub Actions: no long-lived keys.

```yaml
deploy-prod:
  stage: deploy
  image: amazon/aws-cli:latest
  environment:
    name: production
    url: https://api.acme.com
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  script:
    - >
      creds=$(aws sts assume-role-with-web-identity
      --role-arn ${AWS_ROLE_ARN}
      --role-session-name "gitlab-${CI_PROJECT_ID}-${CI_PIPELINE_ID}"
      --web-identity-token ${GITLAB_OIDC_TOKEN}
      --duration-seconds 3600
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]'
      --output text)
    - export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s" $creds)
    - aws ecs update-service --cluster prod --service api --force-new-deployment
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
```

**The AWS trust policy pins the pipeline identity:**

```json
{
  "Condition": {
    "StringEquals": {
      "gitlab.com:sub": "project_path:acme/api:ref_type:branch:ref:main",
      "gitlab.com:project_id": "67890"
    }
  }
}
```

⚠️ Pin the `sub` claim to the exact project and branch. A wildcard means any project in the group can assume your production role.

## Environments and Review Apps

```yaml
deploy-review:
  stage: deploy
  script: [./deploy-preview.sh $CI_COMMIT_REF_SLUG]
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.review.acme.com
    on_stop: stop-review
    auto_stop_in: 2 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

stop-review:
  stage: deploy
  script: [./teardown.sh $CI_COMMIT_REF_SLUG]
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  when: manual
```

✅ **Review apps** give every merge request a live environment. Reviewers click a link in the MR instead of pulling the branch. `auto_stop_in` prevents cost sprawl.

## Reusing Config: `include` and `extends`

```yaml
include:
  - project: acme/ci-templates
    ref: v2.1.0                       # pin the version
    file: /templates/node-build.yml
  - template: Security/SAST.gitlab-ci.yml   # GitLab built-in

.deploy-base:
  image: amazon/aws-cli
  before_script: [./assume-role.sh]

deploy-staging:
  extends: .deploy-base
  variables:
    ENV: staging
```

| Feature | Purpose |
|---------|---------|
| `include` | Pull job definitions from another file or project |
| `extends` | Inherit from a hidden job (prefixed with `.`) |
| Hidden jobs (`.name`) | Templates — never run on their own |

✅ Prefer `extends` over YAML anchors (`<<: *ref`). It works across `include`d files; anchors do not.

## Runners

| Executor | How It Works | Use For |
|----------|-------------|---------|
| **Docker** | Each job in a fresh container | Default choice — clean isolation |
| **Kubernetes** | Each job as a pod | Autoscaling on EKS |
| **Shell** | Runs directly on the host | ❌ Avoid — state leaks between jobs |

**Docker-in-Docker (dind)** is needed to build images inside a Docker executor:

```yaml
build:
  image: docker:27
  services: [docker:27-dind]
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
```

⚠️ dind requires a privileged runner, which is a security tradeoff. Alternatives with no privileged mode: Kaniko or BuildKit in rootless mode.

## GitLab CI vs GitHub Actions

| | GitLab CI | GitHub Actions |
|-|-----------|----------------|
| **Config** | One `.gitlab-ci.yml` | Many workflow files |
| **Reuse** | `include` + `extends` | Reusable workflows + actions |
| **Ecosystem** | Built-in templates, no marketplace | Huge marketplace |
| **Built-in security scans** | ✅ SAST, DAST, dependency, secrets | Via third-party actions |
| **Review apps** | ✅ First-class `environment` feature | Manual to build |
| **Self-hosting the platform** | ✅ Full self-managed GitLab | GitHub Enterprise Server |

## Interview Q&A

**Q: What is the difference between cache and artifacts in GitLab CI?**

Cache is a performance optimization stored on the runner and reused across pipelines — typically dependency directories like `.npm` or `.gradle`. It is best-effort, so a job must still work if the cache is empty. Artifacts are files a job produces that GitLab stores centrally and passes to downstream jobs in the same pipeline, and that you can download from the UI. If a later job requires a file to function, that file must be an artifact, not a cache entry. A common mistake is caching `node_modules` and assuming later jobs will have it.

**Q: How do stages and `needs` interact?**

Stages create a strict barrier: every job in a stage must finish before the next stage starts. That is simple but wasteful, because a ten-second lint job waits on a five-minute build. `needs` turns the pipeline into a directed acyclic graph — a job starts as soon as its listed dependencies complete, regardless of stage order. `needs: []` makes a job start immediately at pipeline creation. In practice you keep stages for readability and add `needs` to remove the artificial waiting.

**Q: How do you deploy from GitLab CI to AWS securely?**

Use OIDC through the `id_tokens` keyword. GitLab issues a signed JWT to the job with claims describing the project, branch, and pipeline. The job calls `sts:assume-role-with-web-identity` with that token to get temporary credentials valid for an hour. In AWS you register GitLab as an OIDC identity provider and write a trust policy that pins the `sub` claim to the specific project path and branch, plus the numeric project ID so a renamed project cannot inherit access. This removes all static AWS keys from CI/CD variables.

**Q: What are review apps and why are they useful?**

A review app is a temporary, fully deployed environment created per merge request, defined with a dynamic `environment: name: review/$CI_COMMIT_REF_SLUG`. GitLab links it directly in the merge request so reviewers, designers, and product owners can click through the actual change instead of checking out the branch. Pairing it with `on_stop` and `auto_stop_in` means the environment is torn down automatically, which keeps cloud cost under control. It shortens feedback loops significantly on frontend work.

**Q: How would you structure a GitLab pipeline for a monorepo?**

Use `rules: changes:` so each service's jobs only run when files under its directory change, which keeps pipeline time proportional to the size of the change rather than the size of the repo. Put shared job definitions in a central template repository and pull them in with `include` pinned to a version tag, then use `extends` per service to customize. For larger monorepos, use parent-child pipelines: the parent detects which services changed and triggers a child pipeline per service, so each service's pipeline stays readable and independently retryable.

---

[← GitHub Actions](./03-github-actions.md) | [Jenkins →](./05-jenkins.md)
