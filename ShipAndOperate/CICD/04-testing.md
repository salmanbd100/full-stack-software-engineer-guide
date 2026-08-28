---
title: Testing in CI/CD
part: 8
chapter: 0
slug: cicd-testing
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-28
tags: [devops, cicd, testing]
in_book: true
---

# Testing in CI/CD

The pipeline's job is to answer one question fast: **is this commit safe to deploy?** Test strategy is what makes that answer both trustworthy and quick.

## The Test Pyramid

```
        ╱╲        E2E (few)        — slow, brittle, high confidence
       ╱──╲
      ╱    ╲      Integration      — real DB, real HTTP
     ╱──────╲
    ╱        ╲    Unit (many)      — fast, isolated, cheap
   ╱──────────╱
```

| Tier | Count | Speed | Scope | Runs On |
|------|-------|-------|-------|---------|
| **Unit** | Hundreds–thousands | ms | One function or class | Every commit |
| **Integration** | Tens–hundreds | seconds | Service + DB + queue | Every commit |
| **Contract** | Per integration | seconds | API shape between services | Every commit |
| **E2E** | 10–30 critical flows | minutes | Full system through the UI | Merge to main |

❌ **Inverted pyramid (the "ice cream cone"):** mostly E2E tests. Slow, flaky, and a failure tells you nothing about *where* the bug is.

✅ Push coverage down the pyramid. A bug caught by a unit test costs seconds to diagnose; the same bug caught by an E2E test costs an hour.

## Pipeline Ordering — Fail Fast

Order stages by **cost of running** ascending, so cheap failures happen first.

```
1. Lint + type-check        ~20s   → catches typos, unused code
2. Unit tests               ~90s   → catches logic errors
3. Build artifact           ~2m    → catches compile/packaging errors
4. Integration tests        ~4m    → catches wiring, SQL, serialization
5. Security scans           ~2m    (parallel with 4)
6. Deploy to staging        ~2m
7. E2E smoke tests          ~5m    → catches broken critical flows
8. Deploy to production
```

✅ Run steps 4 and 5 in parallel. Independent stages should never be sequential.

⚠️ Target **under 10 minutes** for pull request feedback. Past that, developers batch changes and stop trusting the pipeline.

## Unit Tests in CI

```yaml
unit-tests:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      shard: [1, 2, 3, 4]        # split the suite across 4 runners
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v5
      with: { node-version: 22, cache: npm }
    - run: npm ci
    - run: npm test -- --shard=${{ matrix.shard }}/4 --ci --coverage
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: coverage-${{ matrix.shard }}
        path: coverage/
```

**What makes a unit test CI-friendly:**

| Requirement | Why |
|-------------|-----|
| No network calls | Network flakiness becomes test flakiness |
| No shared state between tests | Enables parallel execution and sharding |
| Deterministic | Fake timers, fixed seeds, injected clocks |
| Fast (< 50ms each) | Thousands of tests must finish in seconds |

❌ **Non-deterministic test:**

```typescript
it("expires after a day", () => {
  const token = createToken();
  // Fails when the suite runs across midnight, or in another timezone
  expect(token.expiresAt.getDate()).toBe(new Date().getDate() + 1);
});
```

✅ **Deterministic — inject the clock:**

```typescript
interface Clock {
  now(): Date;
}

const fixedClock: Clock = { now: () => new Date("2026-01-01T00:00:00Z") };

it("expires after a day", () => {
  const token = createToken(fixedClock);
  expect(token.expiresAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
});
```

## Integration Tests with Real Dependencies

Mocking the database hides the bugs that actually reach production: wrong SQL, missing index, bad transaction boundary.

**Spin up real dependencies as services:**

```yaml
integration-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:17
      env:
        POSTGRES_PASSWORD: test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-retries 5
      ports: ['5432:5432']
    redis:
      image: redis:7
      ports: ['6379:6379']
  env:
    DATABASE_URL: postgres://postgres:test@localhost:5432/test
  steps:
    - uses: actions/checkout@v6
    - run: npm ci
    - run: npm run migrate
    - run: npm run test:integration
```

✅ **Testcontainers** is the portable alternative — it starts real containers from inside the test code, so the same setup works locally and in any CI system.

**Isolation between tests:**

| Approach | Speed | Isolation |
|----------|-------|-----------|
| Transaction rollback per test | ✅ Fast | ✅ Good (breaks if code commits) |
| Truncate tables between tests | Medium | ✅ Good |
| Fresh database per test | ❌ Slow | ✅ Perfect |
| Shared state, no cleanup | Fast | ❌ Order-dependent flakiness |

## Contract Testing

In microservices, E2E tests across all services are slow and own by nobody. Contract tests replace most of them.

```
Consumer (web app)                  Provider (api service)
      │                                     │
      ├─ writes expectation ──▶ contract ◀── verifies it can satisfy it
      │                         (pact file)
      └─ tests against a stub              └─ tests against real code
```

| | E2E Test | Contract Test |
|-|---------|--------------|
| **Needs all services running** | ✅ Yes | ❌ No |
| **Speed** | Minutes | Seconds |
| **Failure clarity** | "Checkout broke" | "api removed field `total`" |
| **Catches** | Integration + UI bugs | Breaking API changes |

✅ Run provider contract verification in the **provider's** pipeline. That way the api service fails its own build when it breaks a consumer — before deploy, not after.

## End-to-End Tests

E2E tests drive the real UI against a deployed environment. They give the most confidence and cause the most pain.

**Keep them viable:**

| Rule | Why |
|------|-----|
| Cover only critical flows (login, checkout, core CRUD) | 10–30 tests, not 500 |
| Run against staging after deploy, not on every PR | Too slow for PR feedback |
| Use stable selectors (`data-testid`) | CSS class changes break tests |
| Seed data through the API, not the UI | Faster and less brittle |
| No `sleep` — wait on conditions | Sleeps are the #1 flakiness source |
| Run in parallel with isolated test accounts | Shared accounts cause interference |

❌ **Flaky — arbitrary sleep:**

```typescript
await page.click("#submit");
await page.waitForTimeout(3000);          // sometimes not enough, always slow
expect(await page.textContent("#status")).toBe("Saved");
```

✅ **Deterministic — wait for the condition:**

```typescript
await page.click("#submit");
await expect(page.getByTestId("status")).toHaveText("Saved");  // auto-retries
```

## Quality Gates

A quality gate fails the build when a measurable threshold is not met.

```yaml
quality-gate:
  script:
    - npm test -- --coverage
    # Fail if coverage on CHANGED lines drops below 80%
    - npx jest --coverage --coverageThreshold '{"global":{"lines":80}}'
    - npm audit --audit-level=high
    - npx tsc --noEmit
```

| Gate | Reasonable Threshold |
|------|---------------------|
| **Coverage on changed lines** | 80% — measure the diff, not the whole repo |
| **Total coverage** | Must not decrease |
| **High/critical vulnerabilities** | Zero new ones |
| **Type errors** | Zero |
| **Performance budget** | Bundle size / p99 within limit |

⚠️ **Coverage is a floor, not a goal.** A team chasing 100% writes tests that assert implementation details and break on every refactor. Measure coverage on the **diff** — that catches untested new code without forcing tests onto legacy files nobody is changing.

## Flaky Tests

A flaky test passes and fails on identical code. It is worse than no test, because it teaches the team to ignore red builds.

**Handling process:**

```
1. Detect     → track failures per test across runs
2. Quarantine → move to a non-blocking suite, open a ticket, 48h SLA
3. Fix        → find the real cause
4. Delete     → if nobody fixes it in 2 weeks, the test had no owner
```

**Common causes:**

| Cause | Fix |
|-------|-----|
| Time / timezone dependence | Inject a clock, pin `TZ=UTC` |
| Test order dependence | Reset state in `beforeEach` |
| Real network calls | Mock at the HTTP boundary |
| Race on async UI | Wait for conditions, not timeouts |
| Shared test database | Isolate per worker |

❌ **Never "fix" flakiness with blanket retries.** `retry: 3` hides real race conditions that will surface in production instead.

✅ Retry only for **infrastructure** failures — runner crash, registry timeout — not for test assertion failures.

```yaml
# GitLab: retry infra failures only
retry:
  max: 2
  when: [runner_system_failure, stuck_or_timeout_failure]
```

## Testing Infrastructure Code

Terraform and Kubernetes manifests need pipeline checks too.

```yaml
- run: terraform fmt -check -recursive
- run: terraform validate
- run: tflint
- run: checkov -d .                   # security/compliance policy
- run: terraform plan -out=tfplan     # plan posted to the PR for review
```

✅ Post the `terraform plan` output as a pull request comment. Reviewing the plan is the most effective infrastructure safety control there is.

## Interview Q&A

**Q: Describe your testing strategy in a CI/CD pipeline.**

I order stages by cost so failures surface early: lint and type-check first, then a large fast unit suite, then build the artifact, then integration tests against real dependencies started as containers, then security scans in parallel. After deploying to staging I run a small end-to-end smoke suite covering the critical user flows only. The unit and integration tiers hold most of the coverage because they are fast and their failures point straight at the cause. End-to-end tests are limited to around a dozen flows, because they are slow and brittle at scale. The target is under ten minutes of feedback on a pull request.

**Q: Should integration tests use a real database or a mock?**

A real database, started as an ephemeral container in the pipeline or with Testcontainers. Mocking the database means you never exercise the actual SQL, transaction boundaries, constraint violations, or migration correctness — which is precisely where integration bugs live. Containers make this cheap now: Postgres starts in a couple of seconds and each pipeline run gets a clean instance. Isolate tests from each other by wrapping each in a transaction that rolls back, or truncating tables between tests, so the suite can still run in parallel.

**Q: How do you handle flaky tests?**

First make them visible by tracking pass/fail history per test, since flakiness is invisible in a single run. Then quarantine the flaky test into a non-blocking suite with a ticket and a short deadline, so the main pipeline stays trustworthy while the underlying cause is investigated. Common causes are time or timezone dependence, test order dependence from shared state, real network calls, and racing on asynchronous UI updates. I do not paper over flakiness with automatic retries on assertion failures, because that hides genuine race conditions — retries are only appropriate for infrastructure failures like a runner dying or a registry timing out.

**Q: Is code coverage a useful quality gate?**

It is useful as a floor and misleading as a target. High coverage only proves lines executed, not that behaviour was verified, and teams pushed toward 100% start writing tests coupled to implementation details that break on every refactor. The version I find genuinely useful is coverage on the diff: new and changed lines must meet a threshold such as 80%, and total coverage must not decrease. That catches untested new code without demanding retroactive tests on legacy files nobody is touching. I pair it with gates that have less ambiguity — zero type errors, no new high-severity vulnerabilities, and a bundle size budget.

**Q: How do you test microservices without slow end-to-end suites?**

Use contract testing. The consumer declares the requests it makes and the response fields it depends on, and that contract is published. The provider's own pipeline then verifies it can satisfy every consumer contract, so a breaking API change fails the provider's build before it deploys. This gives most of the value of cross-service end-to-end tests in seconds rather than minutes, and the failure message names the exact field that broke instead of reporting that some user journey failed. End-to-end tests then shrink to a handful of true smoke tests run against staging after deployment.

---

[← Deployment Strategies](./03-deployment-strategies.md) | [CI/CD Index](./README.md) | [Pipeline Security →](./05-security.md)
