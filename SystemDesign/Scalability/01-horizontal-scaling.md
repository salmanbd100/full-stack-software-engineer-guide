# Horizontal Scaling

## 💡 **Concept**

Horizontal scaling (scale-out) adds more machines to handle increased load. Instead of one powerful server, you run many identical servers behind a load balancer.

**Use horizontal scaling when:** traffic exceeds what one machine can handle, or you need fault tolerance — if one server fails, others continue serving traffic.

---

## Horizontal vs Vertical Scaling

| | Horizontal (Scale Out) | Vertical (Scale Up) |
|---|---|---|
| **Approach** | Add more servers | Upgrade to a bigger machine |
| **Cost** | Linear (pay per instance) | Steep (high-end hardware is expensive) |
| **Upper limit** | Practically unlimited | Hard ceiling (largest instance type) |
| **Downtime** | None (add instances live) | Requires restart |
| **Failure tolerance** | High (N-1 servers remain) | None (single point of failure) |
| **Complexity** | Higher (stateless design required) | Low (no architecture change) |
| **Best for** | Stateless APIs, web servers | Databases, legacy apps |

> Start vertical. When you hit the ceiling or need fault tolerance, go horizontal.

---

## Stateless Design Requirement

Horizontal scaling only works if servers are interchangeable. A server that stores local state (in-memory sessions, local files) cannot be replaced transparently.

**The rule: externalize all state.**

```typescript
// ❌ Bad — local session state breaks horizontal scaling
const sessions = new Map<string, UserSession>(); // in-memory, server-local

function getSession(sessionId: string): UserSession | undefined {
  return sessions.get(sessionId); // only works on the server that set it
}

// ✅ Good — session stored in Redis (shared across all servers)
interface SessionStore {
  get(sessionId: string): Promise<UserSession | null>;
  set(sessionId: string, session: UserSession, ttlSeconds: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

async function getSession(
  store: SessionStore,
  sessionId: string
): Promise<UserSession | null> {
  return store.get(sessionId); // any server can answer this
}
```

**What to externalize:**
- User sessions → Redis
- Uploaded files → S3
- Shared configuration → environment variables or config service
- Background job state → message queue

---

## Auto-Scaling

Auto-scaling adds and removes instances automatically based on demand. Define triggers:

| Trigger | Scale out when | Scale in when |
|---|---|---|
| CPU utilization | > 70% for 3 min | < 30% for 10 min |
| Request rate | > 80% of current capacity | < 30% of current capacity |
| Queue depth | > 1000 unprocessed messages | < 100 messages |
| Custom metric | P99 latency > 500ms | P99 latency < 200ms |

```typescript
interface AutoScalingPolicy {
  minInstances: number;
  maxInstances: number;
  scaleOutTrigger: {
    metric: string;
    threshold: number;
    durationSeconds: number;
    cooldownSeconds: number; // wait before scaling again
  };
  scaleInTrigger: {
    metric: string;
    threshold: number;
    durationSeconds: number;
    cooldownSeconds: number;
  };
}

const apiScalingPolicy: AutoScalingPolicy = {
  minInstances: 2,       // always keep 2 for HA
  maxInstances: 50,
  scaleOutTrigger: {
    metric: "CPUUtilization",
    threshold: 70,
    durationSeconds: 180,
    cooldownSeconds: 60,
  },
  scaleInTrigger: {
    metric: "CPUUtilization",
    threshold: 30,
    durationSeconds: 600,
    cooldownSeconds: 300,  // wait 5 min before removing instances
  },
};
```

**Cooldown period:** prevents thrashing — rapid scale-out followed by scale-in. Always set a longer cooldown for scale-in than scale-out.

---

## Rolling Deploys with Horizontal Scaling

```
Deploy v2:
  [v1] [v1] [v1] [v1]      ← initial state

  [v2] [v1] [v1] [v1]      ← replace 1 instance
  [v2] [v2] [v1] [v1]      ← replace 2 instances
  [v2] [v2] [v2] [v1]      ← replace 3 instances
  [v2] [v2] [v2] [v2]      ← complete, zero downtime
```

Health checks ensure traffic only routes to healthy (v2) instances. If v2 fails health checks, the deploy stops and rolls back automatically.

---

## Consistent Hashing for Routing

When routing to a horizontally scaled cluster (like a cache cluster), consistent hashing ensures that adding/removing nodes only remaps a fraction of keys.

```typescript
function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % (2 ** 32);
  }
  return hash;
}

function getServer(key: string, servers: string[]): string {
  if (servers.length === 0) throw new Error("No servers available");
  const index = hashKey(key) % servers.length;
  return servers[index];
}
```

With consistent hashing (ring-based): adding 1 node to a 10-node cluster remaps only 10% of keys, not 100%.

---

## When to Use

| Scenario | Recommendation |
|---|---|
| API / web server load | Horizontal — stateless by design |
| Need 99.9%+ availability | Horizontal — N-1 redundancy |
| Traffic spikes (product launch) | Auto-scaling horizontal |
| Database primary writes | Vertical first, then sharding |
| Legacy stateful app | Vertical (or refactor to stateless) |

---

## Common Mistakes

❌ **Horizontally scaling a stateful service** — sticky sessions or local state defeats the purpose. Make services stateless first.

❌ **Scale-in cooldown too short** — instance terminates while requests are still in-flight. Use connection draining (30–60s) before termination.

❌ **Min instances = 1** — the one instance becomes a single point of failure. Always set min = 2.

✅ **Prefer immutable deployments** — deploy new instances with the new version; drain old ones. Faster rollback than in-place updates.

---

## Real-World Example

An e-commerce API runs 3 instances during off-peak hours. A product launch spike drives CPU to 85%. Auto-scaling fires and adds 17 more instances over 10 minutes (cooldown-limited). The load balancer distributes traffic across all 20. When the spike subsides, scale-in slowly reduces to 3 over 30 minutes. At no point did any user see an error or timeout — the only change was capacity.

---

## Key Insight

> Horizontal scaling requires stateless services. That is not a limitation — it is good architecture. Stateless services are easier to test, deploy, and reason about. Design for statelessness from the start.

**Related:** [Load Balancing (BuildingBlocks)](../BuildingBlocks/01-load-balancing.md) · [Vertical Scaling](./02-vertical-scaling.md) · [Database Scaling](./05-database-scaling.md)

---

[← Back to SystemDesign](../README.md)
