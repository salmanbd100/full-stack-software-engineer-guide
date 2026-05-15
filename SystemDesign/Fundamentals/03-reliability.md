# Reliability and Availability

## Overview

Reliability is whether the system does the right thing. Availability is whether the system is up when users need it. Both matter — a database that returns wrong data is reliable trouble, even at 100% uptime.

## Key Metrics

### 💡 **Availability**

Percent of time the system is operational.

```
Availability = (Total Time − Downtime) / Total Time
```

**The "nines" cheat sheet:**

| Availability | Downtime per Year   | Typical Tier            |
| ------------ | ------------------- | ----------------------- |
| **99%**      | 3.65 days           | Hobby projects          |
| **99.9%**    | 8.76 hours          | Standard SaaS           |
| **99.99%**   | 52.6 minutes        | Critical services       |
| **99.999%**  | 5.26 minutes        | Financial / telecom     |

Each extra nine costs roughly 10× more to engineer. Pick the lowest tier that satisfies the business.

### 💡 **MTBF and MTTR**

- **MTBF (Mean Time Between Failures):** average healthy time between failures.
- **MTTR (Mean Time To Repair):** average time to recover after a failure.

```
Availability = MTBF / (MTBF + MTTR)
```

**Key Insight:**

> You raise availability by either failing less (MTBF up) or recovering faster (MTTR down). Faster recovery is usually cheaper.

## Failure Patterns

### 💡 **Single Point of Failure (SPOF)**

Any one component whose failure brings the whole system down.

**Examples:** one database server, one load balancer, one region, one payment gateway.

**Fix:** add redundancy, deploy to multiple availability zones, set up automated failover.

### 💡 **Cascading Failure**

One failure overloads the next service, which fails and overloads the next, until the whole system is down.

**Typical chain:**

1. Database slows under load.
2. API servers pile up waiting on queries.
3. Load balancer marks API servers unhealthy.
4. Traffic shifts to fewer servers, which also collapse.

**Prevent it with:** circuit breakers, timeouts, rate limiting, bulkheads, and graceful degradation.

## Redundancy

| Pattern             | How it Works                                  | Use When                         |
| ------------------- | --------------------------------------------- | -------------------------------- |
| **Active-Passive**  | Standby waits, takes over on failure          | Strong consistency, simple HA    |
| **Active-Active**   | All nodes serve traffic                       | Read scale, no idle resources    |
| **Geographic**      | Datacenters in multiple regions               | Disaster recovery, low latency   |

**Common Mistakes:**

❌ **Bad:** running active-passive but never testing failover.
✅ **Good:** schedule regular failover drills — assume the untested path is broken.

## Fault Tolerance Patterns

### 💡 **Circuit Breaker**

Stop calling a failing dependency. After a cooldown, send a probe to see if it recovered.

```typescript
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private failureCount = 0;
  private state: CircuitState = "CLOSED";
  private nextAttempt = Date.now();

  constructor(
    private readonly threshold = 5,
    private readonly timeoutMs = 60_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error("Circuit breaker is OPEN");
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await fn();
      this.state = "CLOSED";
      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.state = "OPEN";
        this.nextAttempt = Date.now() + this.timeoutMs;
      }
      throw error;
    }
  }
}
```

**When to Use:** any call to an external service (payment provider, third-party API, microservice).

### 💡 **Retry with Exponential Backoff**

Retry transient failures with growing delays. Add jitter so retries do not all hit at the same instant.

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      const jitter = Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }
  throw new Error("unreachable");
}
```

**Common Mistakes:**

❌ **Bad:** retrying without jitter — every client retries at the same moment (thundering herd).
✅ **Good:** add random jitter and cap the maximum delay.

### 💡 **Bulkhead**

Isolate resources per dependency so one failure cannot drain shared capacity. Give each downstream call its own connection pool or thread pool.

### 💡 **Rate Limiting**

Cap how many requests a user or service can send. Protects you from abuse and from cascading overload.

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recent = (this.requests.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.maxRequests) return false;
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}
```

## Health Checks

A health endpoint reports whether the service and its dependencies are operational. Load balancers and orchestrators use it to remove bad instances.

```typescript
interface CheckResult {
  healthy: boolean;
  error?: string;
}

app.get("/health", async (_req, res) => {
  const checks: Record<string, CheckResult> = {
    database: await checkDatabase(),
    redis: await checkRedis(),
  };
  const allHealthy = Object.values(checks).every((c) => c.healthy);
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "unhealthy",
    checks,
    timestamp: new Date().toISOString(),
  });
});

async function checkDatabase(): Promise<CheckResult> {
  try {
    await db.query("SELECT 1");
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}
```

## Backup and Recovery

### 💡 **RPO and RTO**

- **RPO (Recovery Point Objective):** how much data you can afford to lose. Drives backup frequency.
- **RTO (Recovery Time Objective):** how long you can be down. Drives failover strategy.

| Tier             | RTO            | Cost           | When                |
| ---------------- | -------------- | -------------- | ------------------- |
| **Cold standby** | Days           | Low            | Internal tools      |
| **Warm standby** | Hours          | Medium         | Standard SaaS       |
| **Hot standby**  | Minutes        | High           | Banking, healthcare |

**The 3-2-1 rule:** 3 copies of data, on 2 media types, with 1 offsite.

### 💡 **Multi-Region Failover**

```
Region A (Primary)        Region B (DR)
─────────────────         ─────────────
Load Balancer             Load Balancer
App Servers (Active)      App Servers (Standby)
Database (Primary) ──replication──▶ Replica
```

Failover steps:

1. Health check detects primary region down.
2. Promote replica in Region B to primary.
3. DNS or global load balancer redirects traffic.
4. Alert ops and verify before declaring recovery.

## High Availability vs Disaster Recovery

| Concept | Goal                              | Scope                          |
| ------- | --------------------------------- | ------------------------------ |
| **HA**  | Prevent downtime during normal ops| Within a region — AZ failures  |
| **DR**  | Recover from catastrophic events  | Across regions — region outage |

You usually need both. HA handles the common case. DR handles the rare but severe case.

## Common Pitfalls

❌ **Bad:** assuming the cloud provider gives you HA for free.
✅ **Good:** spread instances across availability zones explicitly and test failover.

❌ **Bad:** taking backups but never restoring them.
✅ **Good:** restore drills on a schedule. An untested backup is a hope, not a backup.

❌ **Bad:** chasing 99.999% on every service.
✅ **Good:** match availability targets to business value. Most internal tools are fine at 99.9%.

## Key Insight

> Design for failure, not for success. Every component will fail eventually — the question is whether the system survives the failure or amplifies it.

---

[← Back to SystemDesign](../README.md)
