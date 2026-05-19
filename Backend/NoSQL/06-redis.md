# Redis

## 💡 What Is Redis?

Redis is an **in-memory data structure store**. It's not just a key-value cache — it's a Swiss-army datastore for: caching, rate limiting, queues, sessions, real-time leaderboards, and pub/sub messaging.

> Reads and writes typically take **< 1 ms**. That's why every high-throughput backend uses it somewhere.

---

## Data Structures You'll Actually Use

| Type           | Use case                                      |
| -------------- | --------------------------------------------- |
| **String**     | Simple cache values, counters                 |
| **Hash**       | Objects (user profile fields)                 |
| **List**       | Queues, recent activity feeds                 |
| **Set**        | Unique tags, online users                     |
| **Sorted Set** | Leaderboards, rate limits, time-ordered feeds |
| **Stream**     | Event log, like Kafka-lite                    |

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// String — with TTL
await redis.set("user:42:profile", JSON.stringify(profile), "EX", 3600);
const cached = await redis.get("user:42:profile");

// Hash — object fields
await redis.hset("user:42", { name: "Ada", email: "ada@example.com" });
const user = await redis.hgetall("user:42");

// List — queue
await redis.lpush("queue:emails", JSON.stringify(job));
const next = await redis.rpop("queue:emails");

// Set — unique tags
await redis.sadd("post:1:tags", "node", "typescript");
const tags = await redis.smembers("post:1:tags");

// Sorted set — leaderboard
await redis.zadd("scores", 1500, "player1", 1800, "player2");
const top = await redis.zrevrange("scores", 0, 9, "WITHSCORES");
```

---

## Caching Patterns

### 1. Cache-Aside (Most Common)

App reads cache first; on miss, loads from DB and writes the cache.

```typescript
async function getUser(id: string): Promise<User> {
  const key = `user:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const user = await db.users.findById(id);
  await redis.set(key, JSON.stringify(user), "EX", 3600);
  return user;
}
```

✅ Simple, popular
❌ First request after expiry is slow (cache miss)

### 2. Write-Through

Write to cache and DB together. Cache stays consistent.

```typescript
async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  const user = await db.users.update(id, patch);
  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 3600);
  return user;
}
```

✅ Cache always fresh
❌ Every write pays for two systems

### 3. Cache Invalidation

When data changes elsewhere, evict the key.

```typescript
async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
  await redis.del(`user:${id}`);
}
```

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

---

## TTL — Always Set One

```typescript
await redis.set("session:abc", token, "EX", 1800);       // 30 min
await redis.expire("user:42", 3600);                     // refresh TTL
const remaining = await redis.ttl("session:abc");        // seconds left
```

> Cache entries without a TTL become **stale forever** and eat memory. Always set `EX`.

---

## Rate Limiting

Sorted-set based sliding window:

```typescript
async function isAllowed(userId: string, limit: number, windowMs: number): Promise<boolean> {
  const key = `rate:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const tx = redis.multi();
  tx.zremrangebyscore(key, 0, windowStart);   // drop old
  tx.zadd(key, now, `${now}-${Math.random()}`);
  tx.zcard(key);
  tx.expire(key, Math.ceil(windowMs / 1000));
  const [, , count] = (await tx.exec()) as [unknown, unknown, [null, number], unknown];

  return count[1] <= limit;
}
```

---

## Session Storage

```typescript
import session from "express-session";
import RedisStore from "connect-redis";

app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: true, maxAge: 1000 * 60 * 60 },
  }),
);
```

Sessions in Redis survive app restarts and work across multiple app instances.

---

## Pub/Sub

Lightweight messaging — no persistence, no replay.

```typescript
const pub = new Redis();
const sub = new Redis();

sub.subscribe("notifications");
sub.on("message", (channel, message) => {
  console.log(`[${channel}]`, message);
});

await pub.publish("notifications", JSON.stringify({ userId: "42", text: "Hi" }));
```

⚠️ Subscribers that aren't connected at publish time **miss the message**. For durability, use Streams or a real queue (RabbitMQ, Kafka).

---

## Streams (Durable Queues)

Like Kafka but built in. Messages persist; consumers track their own offset.

```typescript
// Producer
await redis.xadd("events", "*", "type", "signup", "userId", "42");

// Consumer
const entries = await redis.xread("BLOCK", 0, "STREAMS", "events", "$");
```

Use Streams when you need at-least-once delivery and replay.

---

## Persistence: RDB vs AOF

| Mode    | What it does                       | Tradeoff                  |
| ------- | ---------------------------------- | ------------------------- |
| **RDB** | Periodic snapshots to disk         | Fast, can lose minutes    |
| **AOF** | Append-every-write log             | Slower, near-zero loss    |
| **Both**| Snapshot + log                     | Recommended for prod      |

> Defaults are usually fine. The interview hook is knowing Redis *can* persist — it's not always memory-only.

---

## When Redis Is the Wrong Tool

❌ **Primary database for complex queries** — no joins, no ad-hoc filters
❌ **Datasets larger than RAM × replicas** — you'll hit eviction
❌ **Strong durability requirements** — even AOF can lose the last write
❌ **Reliable message delivery** — use a real queue (RabbitMQ, SQS, Kafka)

---

## Interview Q&A

**Q: Why use Redis instead of an in-memory map?**
A: Redis is shared across processes and servers. Your Node.js cluster, multiple replicas, and background workers all see the same cache. An in-memory `Map` is per-process and disappears on restart.

**Q: How do you handle cache invalidation?**
A: Three strategies: **TTL** (let it expire), **explicit `DEL`** on write, or **versioned keys** (`user:42:v3`) so old caches age out naturally. Most apps combine TTL with explicit invalidation on critical updates.

**Q: When would you choose Memcached over Redis?**
A: Rarely. Memcached is simpler and slightly faster for plain key-value caching, but Redis has data structures, pub/sub, persistence, replication, and Lua scripting. Redis wins unless you specifically need Memcached's no-frills speed.

---

## Best Practices

✅ Always set a TTL on cache keys
✅ Pick data structures intentionally (sets, sorted sets are powerful)
✅ Use connection pooling (`ioredis` does this by default)
✅ Use Streams or a real queue for at-least-once messaging
✅ Monitor `used_memory` and `evicted_keys`
❌ Don't store unbounded data without eviction policy
❌ Don't rely on pub/sub for reliable delivery
❌ Don't use Redis as a primary database for relational workloads

---

[← Previous: Mongoose](./05-mongoose.md) | [Back to Backend →](../README.md)
