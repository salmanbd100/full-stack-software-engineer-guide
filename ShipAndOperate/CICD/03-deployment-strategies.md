---
title: Deployment Strategies
part: 8
chapter: 0
slug: deployment-strategies
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-28
tags: [devops, cicd, deployment, strategies]
in_book: true
---

# Deployment Strategies

A deployment strategy answers one question: **how do you replace running version N with version N+1 without breaking users?**

## The Five Strategies

| Strategy | Downtime | Extra Cost | Rollback Speed | Risk |
|----------|----------|-----------|----------------|------|
| **Recreate** | ❌ Yes | None | Slow (redeploy) | High |
| **Rolling** | ✅ None | Small | Slow (roll forward) | Medium |
| **Blue/Green** | ✅ None | 2× during deploy | Instant | Low |
| **Canary** | ✅ None | Small | Fast | Lowest |
| **Shadow** | ✅ None | 2× compute | N/A (no user traffic) | Lowest |

> Interviewers want the tradeoff, not the definition. Every strategy trades **cost** and **complexity** for **safety**.

## Recreate

Stop all old instances, then start the new ones.

```
v1 v1 v1  →  (all stopped)  →  v2 v2 v2
              ↑ downtime
```

✅ Fine for: internal batch jobs, dev environments, apps that cannot run two versions at once (some database migrations).

❌ Never for user-facing production services.

## Rolling Update

Replace instances a few at a time. The default in Kubernetes and ECS.

```
Step 1: v1 v1 v1 v1
Step 2: v2 v1 v1 v1   ← one replaced, health-checked
Step 3: v2 v2 v1 v1
Step 4: v2 v2 v2 v2
```

**Kubernetes:**

```yaml
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # 1 extra pod above replicas during the roll
      maxUnavailable: 0     # never drop below 4 healthy pods
  template:
    spec:
      containers:
        - name: api
          readinessProbe:           # ⚠️ without this, traffic hits a cold pod
            httpGet: { path: /ready, port: 3000 }
            initialDelaySeconds: 5
```

**ECS equivalent:**

```json
"deploymentConfiguration": {
  "minimumHealthyPercent": 100,
  "maximumPercent": 200,
  "deploymentCircuitBreaker": { "enable": true, "rollback": true }
}
```

**Pros:**
- No extra long-term infrastructure
- Built into every orchestrator

**Cons:**
- Both versions serve traffic at once — the API must be backward compatible
- Rollback means another rolling update (slow)
- A bad version reaches some users before you notice

⚠️ `maxUnavailable: 0` is the setting people forget. With the default (`25%`), you lose a quarter of your capacity mid-deploy — during peak traffic that can cascade.

## Blue/Green

Run two complete environments. Switch all traffic at once.

```
       ┌──────────────┐
ALB ──▶│ Blue  (v1)   │  100% traffic
       └──────────────┘
       ┌──────────────┐
       │ Green (v2)   │  0% — tested here first
       └──────────────┘
              ↓  switch target group
       ┌──────────────┐
ALB ──▶│ Green (v2)   │  100% traffic
       └──────────────┘
       (keep Blue idle for fast rollback)
```

**How the switch happens:**

| Layer | Mechanism |
|-------|-----------|
| **ALB** | Change the listener's target group |
| **Route 53** | Weighted records flipped 0/100 |
| **ECS** | CodeDeploy manages blue and green task sets |
| **Lambda** | Alias points to a new version |

**Pros:**
- **Instant rollback** — flip the pointer back. This is the main reason to choose it
- Test the full environment before any user reaches it
- One version serves traffic at a time (simpler reasoning)

**Cons:**
- Doubles infrastructure during the deploy
- Stateful components (databases, sessions, caches) are shared and cannot be duplicated
- All users move at once — a subtle bug hits 100% immediately

✅ Best for services where **rollback speed** matters most and you can afford brief double capacity.

## Canary

Send a small share of traffic to the new version, watch metrics, then increase.

```
5% ──▶ v2   watch error rate, p99 latency for 10 min
95% ─▶ v1
   ↓ metrics healthy
25% ─▶ v2
   ↓
100% ▶ v2
```

**Progressive traffic shift with CodeDeploy on ECS:**

| Config | Behaviour |
|--------|-----------|
| `Canary10Percent5Minutes` | 10% → wait 5 min → 100% |
| `Linear10PercentEvery1Minute` | +10% per minute |
| `AllAtOnce` | Blue/green with no canary |

**Kubernetes with Argo Rollouts:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 10m }
        - analysis:                    # automated metric gate
            templates: [{ templateName: error-rate }]
        - setWeight: 25
        - pause: { duration: 10m }
        - setWeight: 100
```

**Pros:**
- Smallest blast radius — a bad deploy affects 5% of users, not 100%
- Real production traffic validates the change
- Automated analysis can abort the rollout with no human involved

**Cons:**
- Needs good metrics and alerting to be meaningful
- Slowest strategy — a full rollout can take an hour
- Extra tooling (service mesh, Argo Rollouts, Flagger, or ALB weighted target groups)

> ⚠️ A canary without automated metric analysis is just a slow rolling update. The value comes from **measuring** the canary and aborting automatically.

**What to measure:** error rate, p99 latency, saturation (CPU/memory), and one business metric such as checkout completion.

## Feature Flags — Decoupling Deploy from Release

The strategies above move **code**. Feature flags control **behaviour**.

```typescript
interface FlagClient {
  isEnabled(flag: string, context: { userId: string }): Promise<boolean>;
}

async function getCheckout(client: FlagClient, userId: string) {
  // Deployed to 100% of servers, enabled for 5% of users
  const useNewFlow: boolean = await client.isEnabled("new-checkout", { userId });
  return useNewFlow ? newCheckoutFlow() : legacyCheckoutFlow();
}
```

| | Canary Deploy | Feature Flag |
|-|--------------|-------------|
| **Unit of control** | Server / instance | User / request |
| **Rollback** | Redeploy or shift traffic | Config change (seconds) |
| **Targeting** | Random traffic share | Specific users, regions, plans |
| **Cost** | Infrastructure | Flag service + code complexity |

✅ Use both. Canary validates the **build**; flags validate the **feature**.

⚠️ Flags are technical debt. Every flag doubles the code paths you must test. Delete them once the feature is fully rolled out.

## Database Migrations — The Real Hard Part

Every zero-downtime strategy breaks if the schema change is not backward compatible. Both versions run at once.

❌ **Breaking — old code crashes immediately:**

```sql
ALTER TABLE users RENAME COLUMN email TO email_address;
```

✅ **Expand/contract (also called parallel change) — four safe deploys:**

```
1. EXPAND   → add email_address, keep email. Deploy: write both, read email
2. BACKFILL → copy existing rows
3. MIGRATE  → deploy: read email_address
4. CONTRACT → drop email (a later release, once rollback window closed)
```

| Change Type | Safe? | Approach |
|-------------|-------|----------|
| Add nullable column | ✅ Yes | Deploy directly |
| Add column with default | ⚠️ Locks large tables | Add nullable, backfill in batches |
| Rename column | ❌ No | Expand/contract |
| Drop column | ❌ No | Stop using it, drop a release later |
| Add index | ⚠️ Locks | `CREATE INDEX CONCURRENTLY` (Postgres) |
| Narrow a type | ❌ No | Expand/contract |

> **Rule:** the current release must work against both the old and the new schema. If it does not, you cannot roll back.

## Choosing a Strategy

| Situation | Choose | Why |
|-----------|--------|-----|
| Internal tool, downtime acceptable | Recreate | Simplest, cheapest |
| Standard stateless service | Rolling | Built in, no extra cost |
| Rollback speed is critical | Blue/Green | Instant traffic flip |
| High-traffic, high-risk change | Canary | Smallest blast radius |
| Risky refactor of existing logic | Feature flag + canary | Per-user control |
| Rewriting a critical service | Shadow / mirror traffic | Zero user risk |

## Rollback

A strategy is only as good as its rollback path.

| Strategy | Rollback | Typical Time |
|----------|----------|-------------|
| Blue/Green | Flip target group back | Seconds |
| Canary | Shift weight to 0% | Seconds |
| Feature flag | Toggle off | Seconds |
| Rolling | Deploy previous image | Minutes |
| Recreate | Redeploy | Minutes + downtime |

✅ **Automate the rollback trigger.** Wire CloudWatch alarms on error rate and p99 latency to abort the deployment — CodeDeploy and Argo Rollouts both support this natively.

⚠️ Test your rollback. Teams discover the previous artifact is gone, or the migration is irreversible, at exactly the wrong moment.

## Interview Q&A

**Q: Explain blue/green versus canary deployment.**

Blue/green runs two complete environments and switches all traffic at once, usually by changing an ALB target group or a DNS weight. Its main benefit is instant rollback — you flip the pointer back to the old environment, which is still running. The downside is that it doubles infrastructure during the deploy and exposes 100% of users to the new version immediately. Canary shifts a small percentage of traffic to the new version, monitors error rate and latency, then increases gradually. Its main benefit is the small blast radius: a bad deploy affects a few percent of users. The downside is that it takes much longer and requires reliable metrics and automated analysis to be worth doing.

**Q: How do you do a zero-downtime deployment when the change includes a schema migration?**

Use expand/contract. First deploy an additive schema change — add the new column or table while leaving the old one in place — so the currently running version is unaffected. Then deploy application code that writes to both old and new locations while still reading from the old. Backfill existing rows in batches to avoid long locks. Then deploy code that reads from the new location. Only in a later release, once you are confident you will not roll back, drop the old column. The rule that makes this work is that every deployed version must function against both the old and new schema, otherwise rollback is impossible.

**Q: What is the difference between a canary deployment and a feature flag?**

A canary controls which **instances** serve traffic — a percentage of requests reaches servers running the new build. A feature flag controls which **users** see new behaviour, evaluated per request inside code that is already deployed everywhere. Canary validates that the build is healthy: no memory leaks, no dependency breakage, no latency regression. Feature flags validate the feature itself and allow precise targeting, such as internal staff first, then one region, then everyone. They complement each other, and flags roll back faster because turning one off is a configuration change rather than a deployment.

**Q: What settings make a Kubernetes rolling update safe?**

Set `maxUnavailable: 0` so you never drop below the desired replica count during the roll, with `maxSurge: 1` or a small percentage to add capacity temporarily. Define a `readinessProbe` — without it, Kubernetes sends traffic to a pod as soon as the container starts, before the application can serve requests. Add a `livenessProbe` for crash recovery, and `terminationGracePeriodSeconds` with a `preStop` hook so in-flight requests finish before the old pod dies. Also add a PodDisruptionBudget so cluster maintenance cannot evict too many pods at once. Without readiness probes, a rolling update produces a burst of 502 errors on every deploy.

**Q: How do you decide when a canary is healthy enough to promote?**

Define the success criteria before the deploy, as measurable thresholds compared against the baseline version rather than absolute numbers — for example, error rate no more than 0.1% above baseline and p99 latency no more than 10% above baseline, sustained over a window long enough to be statistically meaningful. Include at least one business metric, because a service can be technically healthy while conversion drops. Then automate the gate: Argo Rollouts analysis templates or CodeDeploy CloudWatch alarms promote or abort without a human. A canary judged by someone watching a dashboard is unreliable, because the failure often appears after attention has moved on.

---

[← GitHub Actions](./02-github-actions.md) | [CI/CD Index](./README.md) | [Testing in CI/CD →](./04-testing.md)
