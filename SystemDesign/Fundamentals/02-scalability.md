# Scalability

## Overview

Scalability is a system's ability to handle more work by adding resources. The work could be more users, more data, or more requests. A scalable design keeps performance stable as load grows.

## Vertical vs Horizontal

### 💡 **Vertical Scaling (Scale Up)**

Make a single machine more powerful — bigger CPU, more RAM, faster disk.

### 💡 **Horizontal Scaling (Scale Out)**

Add more machines and spread the work across them.

| Aspect           | Vertical                  | Horizontal               |
| ---------------- | ------------------------- | ------------------------ |
| **Method**       | Upgrade one machine       | Add more machines        |
| **Cost**         | Grows fast                | Linear, commodity HW     |
| **Ceiling**      | Hardware limit            | Practically unlimited    |
| **Complexity**   | Low                       | High (LB, state, sync)   |
| **Availability** | Single point of failure   | Built-in redundancy      |
| **Use When**     | Early stage, ACID DB      | Web tier, large scale    |

**Key Insight:**

> Start vertical for simplicity. Move horizontal once growth or availability needs hit the ceiling.

## Stateless Services

### 💡 **Concept**

A stateless server keeps no session data in local memory. Any server can handle any request, which makes horizontal scaling trivial.

**How It Works:**

Store session state in a shared store (Redis, DynamoDB). Servers only hold short-lived request data.

```typescript
// ❌ Bad — session stored in process memory
const sessions: Record<string, { userId: string }> = {};
app.post("/login", (req, res) => {
  const sessionId = generateId();
  sessions[sessionId] = { userId: req.body.userId };
  res.cookie("sessionId", sessionId);
});

// ✅ Good — session stored in Redis
app.post("/login", async (req, res) => {
  const sessionId = generateId();
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify({ userId: req.body.userId }),
    "EX",
    3600,
  );
  res.cookie("sessionId", sessionId);
});
```

**When to Use:** every web tier behind a load balancer.

## Database Sharding

### 💡 **Concept**

Split a large database into smaller pieces (shards). Each shard holds part of the data and runs on its own server.

**Sharding strategies:**

| Strategy         | How                            | Trade-off                        |
| ---------------- | ------------------------------ | -------------------------------- |
| **Range**        | IDs 1–1M → shard A             | Easy, but causes hotspots        |
| **Hash**         | `hash(userId) % N`             | Even spread; bad for range scans |
| **Geographic**   | Region of the user             | Low latency; uneven load         |
| **Directory**    | Lookup table maps key → shard  | Flexible; lookup is a bottleneck |

```typescript
class ShardManager {
  constructor(private shards: string[]) {}

  getShard(userId: string): string {
    const hash = this.hashCode(userId);
    return this.shards[hash % this.shards.length];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

**Common Mistakes:**

❌ **Bad:** picking a shard key with skew (for example, `country_code` when 80% of users are in one country).
✅ **Good:** pick a high-cardinality key like `user_id` and use consistent hashing.

**When to Use:** dataset too large for one node, or write throughput exceeds a single primary.

## Database Replication

### 💡 **Concept**

Copy data from a primary to one or more replicas. Reads spread across replicas. Writes go to the primary.

```
       ┌──────────┐
Writes │ Primary  │ ───────┐
─────▶ │          │        │
       └──────────┘        ▼
              ▲      replication
              │            │
              │      ┌─────┴─────┐
              │      ▼           ▼
           Reads  Replica 1  Replica 2
```

**Trade-offs:**

- ✅ Read scalability — add more replicas.
- ✅ Replicas double as hot backups.
- ❌ Replication lag — replicas may be slightly behind.
- ❌ Single write bottleneck on the primary.

**When to Use:** read-heavy workloads (analytics dashboards, content sites).

For write-heavy systems, combine replication with sharding or use multi-primary setups.

## Caching

### 💡 **Concept**

Cache stores hot data closer to the user — in browser, CDN, app memory, or Redis. The goal is to keep most reads off the database.

**Cache patterns:**

| Pattern           | Behavior                                   | Use When                       |
| ----------------- | ------------------------------------------ | ------------------------------ |
| **Cache-aside**   | App fetches, app writes to cache           | Default choice, read-heavy     |
| **Read-through**  | Cache fetches from DB on miss              | Cache library supports it      |
| **Write-through** | Write to cache and DB together             | Need fresh cache always        |
| **Write-back**    | Write to cache, async to DB                | Very write-heavy, can lose data|

```typescript
async function getUser(userId: string): Promise<User> {
  const cached = await cache.get(`user:${userId}`);
  if (cached) return JSON.parse(cached) as User;

  const user = await db.users.findById(userId);
  await cache.set(`user:${userId}`, JSON.stringify(user), "EX", 3600);
  return user;
}
```

**Eviction policies:** LRU (default), LFU, TTL. LRU works for most cases.

**Common Mistakes:**

❌ **Bad:** caching everything with no TTL — stale data piles up.
✅ **Good:** set TTL based on how often the data changes, and invalidate on writes.

## Load Balancing

### 💡 **Concept**

A load balancer spreads requests across servers. It also detects unhealthy servers and removes them from rotation.

**Algorithms:**

| Algorithm               | When to Use                              |
| ----------------------- | ---------------------------------------- |
| **Round Robin**         | Servers have equal capacity              |
| **Weighted Round Robin**| Mixed server sizes                       |
| **Least Connections**   | Long-lived or variable-duration requests |
| **Least Response Time** | Heterogeneous performance                |
| **IP Hash**             | Sticky sessions required                 |

**Layer 4 vs Layer 7:**

- **L4 (TCP/UDP):** fast, routes by IP and port. Example: AWS NLB.
- **L7 (HTTP):** content-aware, routes by URL, header, or cookie. Example: AWS ALB, Nginx.

Use L7 for web traffic. Use L4 for raw TCP services (databases, custom protocols).

## Async Processing

### 💡 **Concept**

Move slow tasks (email, image resize, report generation) off the request path. The API responds fast, a worker handles the job later.

```typescript
// ❌ Bad — blocks the user on slow tasks
app.post("/register", async (req, res) => {
  await createUser(req.body);
  await sendWelcomeEmail(req.body.email); // slow
  await syncToCrm(req.body); // slow
  res.json({ success: true });
});

// ✅ Good — return immediately, queue the rest
app.post("/register", async (req, res) => {
  const user = await createUser(req.body);
  await queue.enqueue("send_email", { type: "welcome", email: user.email });
  await queue.enqueue("crm_sync", { userId: user.id });
  res.json({ success: true });
});
```

**When to Use:**

- Any task longer than 200ms that the user does not need to wait for.
- Workloads with spiky volume — the queue absorbs bursts.

## Microservices

### 💡 **Concept**

Split a monolith into independent services. Each service owns its data, its deploy, and its team.

**Pros:**

- Deploy services on their own schedule.
- Failure in one service stays isolated.
- Teams pick the right stack per service.

**Cons:**

- Distributed transactions are hard.
- Network calls add latency and failure modes.
- Operational cost goes up — more monitoring, more deploys.

**When to Use:** large organisations with many teams. Skip microservices for small teams and early products.

## Common Pitfalls

❌ **Bad:** sharding too early — adds operational pain before you need it.
✅ **Good:** scale reads with replicas and caches first. Shard only when one primary can no longer absorb writes.

❌ **Bad:** picking a load balancer algorithm without measuring traffic shape.
✅ **Good:** use Round Robin to start. Switch to Least Connections if requests vary in length.

❌ **Bad:** treating scalability as "add more servers".
✅ **Good:** remove state, cache aggressively, queue slow work, then scale.

## Key Insight

> Scalability is a series of trade-offs, not a feature you turn on. Each technique — sharding, caching, replication — adds complexity. Pick the smallest set that meets the actual load.

---

[← Back to SystemDesign](../README.md)
