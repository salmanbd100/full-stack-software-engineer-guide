---
title: Caching
part: 6
chapter: 0
slug: caching
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-29
tags: [system-design, caching, redis, hit-ratio, invalidation]
in_book: true
---

# Caching {#ch-caching}

> Put the cache in the right layer, know what a hit ratio is worth, and have an answer for how each entry becomes wrong.

**In this chapter:** hit ratio as a capacity multiplier · the four patterns · what not to cache · the stampede · warm-up and TTL jitter

## 💡 The Core Idea

A cache keeps a copy of expensive-to-produce data somewhere cheap to read. That is the whole
mechanism. What makes it the highest-leverage move in system design is the arithmetic: a cache does
not make the database faster, it stops most requests from reaching the database at all.

That reframes it. Caching is not a performance trick applied after the fact — it is a capacity
decision made before you buy servers. The hard part was never the storing. It is knowing when the
copy you stored stopped being true.

## How It Works

### The arithmetic that justifies it

Hit ratio is hits divided by total lookups, and the number behind the origin is what matters:

```text
10,000 req/s with no cache        -> 10,000 database queries/s
10,000 req/s at 90% hit ratio     ->  1,000 database queries/s
10,000 req/s at 95% hit ratio     ->    500 database queries/s
```

Going from 90% to 95% halves the load on the database. That is the shape of the curve, and it is why
"raise the hit ratio" beats "add a replica" almost every time. Below 50%, the cache is not earning its
complexity — either the TTL is too short, the cache is too small to hold the working set, or the data
genuinely is not repeated.

### The four patterns

| Pattern | Who writes the cache | Consistency | Reach for it when |
| --- | --- | --- | --- |
| **Cache-aside** | The application, on a miss | Eventual | Read-heavy, general purpose — the default |
| **Read-through** | The cache itself, on a miss | Eventual | You want the miss logic in one place, not in every caller |
| **Write-through** | The application writes both | Strong on read-after-write | Low write volume where a stale read is unacceptable |
| **Write-behind** | The cache flushes asynchronously | Eventual, and lossy on crash | Write-heavy counters and metrics |

**Cache-aside, with the invalidation that has to come with it:**

```typescript
interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

async function getProduct(
  cache: CacheClient,
  db: DatabaseClient,
  productId: string,
): Promise<Product> {
  const key = `product:${productId}`; // keyed per entity, never `product:latest`

  const cached = await cache.get<Product>(key);
  if (cached) return cached;

  const product = await db.findProduct(productId);
  await cache.set(key, product, 300);
  return product;
}

// The write path owns the eviction. Skipping this line is how staleness ships.
async function updateProduct(
  cache: CacheClient,
  db: DatabaseClient,
  productId: string,
  updates: Partial<Product>,
): Promise<void> {
  await db.updateProduct(productId, updates);
  await cache.del(`product:${productId}`);
}
```

### What to cache, and what not to

The decision is two questions: how often is it read, and how fast does it change.

| Data | Read | Changes | Verdict |
| --- | --- | --- | --- |
| Product catalogue | High | Rarely | Cache, 5–30 min TTL, evict on update |
| Homepage aggregation | High | Rarely | Cache, 1–5 min TTL — the query is expensive, the answer is shared |
| User profile | High | Sometimes | Cache per user, 5–15 min, evict on update |
| Live price or stock level | High | Constantly | Do not cache — stale within seconds, and wrong is worse than slow |
| A user's balance or order state | Medium | Sometimes | Never in a shared cache; per-user key only, short TTL |
| One-time tokens | Once | — | Nothing to gain; a cache read is a second place to leak from |

### Eviction and store choice

When memory fills, something has to go. **LRU** — evict the least recently used — is the right default
and what Redis does once `maxmemory` is set. **LFU** wins for long-running caches with a stable hot
set, where recency misleads. TTL expiry is not really eviction: it is your statement about how long a
copy may be wrong.

Redis is the default cache store for new systems — it has data structures beyond strings, replication,
clustering and persistence. Memcached wins only on raw throughput for pure key-value work at extreme
scale, and gives up everything else.

### The stampede

When a hot key expires, every in-flight request misses at the same moment and they all hit the
database together. Two defences, and they compose:

```typescript
// 1. Jitter, so related keys stop expiring in the same second.
function jitteredTtl(baseSeconds: number, jitter = 0.1): number {
  const spread = baseSeconds * jitter;
  return Math.round(baseSeconds + (Math.random() * 2 - 1) * spread);
}

// 2. A lock, so exactly one request recomputes and the rest serve the stale copy.
async function getWithLock(
  cache: CacheClient,
  db: DatabaseClient,
  key: string,
): Promise<Product> {
  const cached = await cache.get<Product>(key);
  if (cached) return cached;

  // SET NX EX — the first caller wins the lock, the others fall through.
  const gotLock = await cache.setIfAbsent(`${key}:lock`, "1", 10);
  if (!gotLock) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return getWithLock(cache, db, key);
  }

  const fresh = await db.findProduct(key);
  await cache.set(key, fresh, jitteredTtl(300));
  await cache.del(`${key}:lock`);
  return fresh;
}
```

> ⚠️ A deploy is a stampede in disguise. New instances start with cold local caches, and if the shared
> cache was also flushed, the first minute of traffic goes entirely to the database — at peak, that is
> the moment it falls over.

### Warm-up on deploy

Pre-populate the keys you know will be hit, before the balancer sends the new instances any traffic.

```typescript
interface WarmupKey {
  key: string;
  load: () => Promise<unknown>;
  ttlSeconds: number;
}

async function warmup(cache: CacheClient, keys: WarmupKey[]): Promise<void> {
  await Promise.all(
    keys.map(async ({ key, load, ttlSeconds }) => {
      await cache.set(key, await load(), jitteredTtl(ttlSeconds));
    }),
  );
}

// Run as a readiness gate, not as a background task after cutover.
await warmup(cache, [
  { key: "homepage:featured", load: () => db.getFeaturedProducts(), ttlSeconds: 300 },
  { key: "config:flags", load: () => db.getFeatureFlags(), ttlSeconds: 600 },
]);
```

## When to Use It

| Scenario | Where the cache goes |
| --- | --- |
| The same query serves thousands of users | Shared cache, keyed by entity, TTL in minutes |
| Expensive aggregation, tolerant of a minute of lag | Shared cache, short TTL, no invalidation needed |
| Per-user data read repeatedly in a session | Per-user key, short TTL, evicted on write |
| Public responses to unauthenticated clients | Further out still — the CDN, not your cache |
| Data that must be exactly right | No cache; solve it with an index or a read replica |

## Common Mistakes

❌ **No TTL.** A key with no expiry is stale forever once the invalidation path misses it once. ✅ Always
set a TTL, even a generous one — it is the backstop for the invalidation you forgot.

❌ **A shared key for per-user data.** `cart:latest` serves one customer's basket to the next. ✅ The
user or entity id goes in the key, always.

❌ **Invalidating nowhere.** The read path is written, the write path is not, and updates take a full
TTL to appear. ✅ Eviction belongs in the same function as the write.

❌ **Treating the cache as a store.** Redis restarts, and if the data does not also exist in the
database it is simply gone. ✅ Everything in the cache must be re-derivable from the source of truth.

❌ **Uniform TTLs set at deploy.** Every key expires in the same second and the stampede is
self-inflicted. ✅ Jitter by ten percent.

## 🔑 Key Takeaways

- A cache is a capacity multiplier: 90% to 95% hit ratio halves the load reaching the database.
- Cache-aside plus TTL covers most systems; reach for the other patterns only when it fails you.
- The write path owns invalidation — a read path written alone is how stale data ships.
- Below a 50% hit ratio the cache is costing more than it saves; fix the TTL, the size, or the key.
- Jitter the TTLs and warm the hot keys, or a deploy will hand the whole load to the database at once.

## Interview Questions

**Q: Which caching pattern would you start with, and why?**

Cache-aside. The application checks the cache, falls back to the database on a miss, and writes what it
found. It keeps the cache out of the write path, so a cache outage degrades latency rather than
correctness, and it caches only what is actually read. The cost is that every caller has to remember
the invalidation, which is why the eviction belongs inside the update function rather than at the
call site.

**Q: How do you decide the TTL?**

Start from how wrong the data is allowed to be, not from how long you would like to cache it. A
product listing that is five minutes stale is fine; an account balance is not cacheable at any TTL. Then
check the hit ratio: if it is low, the TTL is expiring keys before they are reused. Explicit eviction
on write lets you run a longer TTL safely, because the TTL stops being the primary freshness mechanism
and becomes the backstop.

**Q: A hot key expires and the database falls over. What happened, and what do you do?**

A cache stampede — every concurrent request missed at the same instant and went to the origin
together. The fixes are a lock so only one request recomputes while the others wait or serve stale,
jittered TTLs so related keys do not expire in the same second, and pre-warming the known-hot keys
before a deploy sends traffic to cold instances.

**Q: When is caching the wrong answer?**

When the data changes faster than it is read, when correctness at the instant of reading is the
requirement, and when the traffic has no repetition — every request unique means every lookup a miss
plus the cost of storing something nobody asks for again. In those cases the real fix is usually an
index, a read replica, or a cheaper query.

**Q: Where should the cache live — in the process, in Redis, or at the CDN?**

As far from the database as the data allows. Public, non-personalised responses belong at the CDN,
where they never touch your infrastructure. Shared, non-public data belongs in Redis, where every
instance sees the same copy and one invalidation is enough. In-process caching is fastest but each
instance has its own copy, so it suits small, rarely-changing config and little else.

## What to Read Next

- [Chapter ?? — Content Delivery Network](#ch-cdn) — the same idea, moved to the edge
- [Chapter ?? — Redis](#ch-redis) — the store itself, and the structures beyond get and set
- [Chapter ?? — Frontend Caching Strategies](#ch-frontend-caching-strategies) — the layer nearest the user
