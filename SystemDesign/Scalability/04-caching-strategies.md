# Caching as a Scaling Lever

> For pattern deep dive (cache-aside, write-through, write-behind, eviction policies, Redis vs Memcached), see [BuildingBlocks: Caching](../BuildingBlocks/02-caching.md).

## 💡 **Concept**

Caching is the highest-leverage scaling technique available. A well-placed cache can reduce database load by 80–95%, allowing your existing infrastructure to handle 10–20× more traffic without adding servers.

**Cache first, then scale.** Before adding hardware, ask whether caching can absorb the load instead.

---

## Cache Hit Ratio Math

```
Hit ratio = cache hits / (cache hits + cache misses)

Without caching:
  10,000 req/s → 10,000 DB queries/s

With 90% hit ratio:
  10,000 req/s → 1,000 DB queries/s  (90% reduction)

With 95% hit ratio:
  10,000 req/s → 500 DB queries/s    (95% reduction)
```

Even moving from 90% to 95% hit ratio halves your database load. Every percent matters at scale.

---

## Strategy Cheat Sheet

| Strategy | Who writes cache | Consistency | Best for |
|---|---|---|---|
| **Cache-aside** | Application (on miss) | Eventual | Read-heavy, general purpose |
| **Read-through** | Cache (on miss) | Eventual | Simplifies app code |
| **Write-through** | App writes cache + DB together | Strong | Low write volume |
| **Write-behind** | App writes cache; cache flushes async | Eventual | Write-heavy workloads |

---

## What to Cache

```typescript
interface CacheCandidate {
  dataType: string;
  readFrequency: "high" | "medium" | "low";
  changeFrequency: "high" | "medium" | "low";
  recommendation: string;
}

const candidates: CacheCandidate[] = [
  {
    dataType: "Product catalog",
    readFrequency: "high",
    changeFrequency: "low",
    recommendation: "Cache — ideal. TTL 5–30 min, evict on update",
  },
  {
    dataType: "User profile",
    readFrequency: "high",
    changeFrequency: "medium",
    recommendation: "Cache — good. TTL 5–15 min, evict on update",
  },
  {
    dataType: "Homepage aggregation",
    readFrequency: "high",
    changeFrequency: "low",
    recommendation: "Cache — ideal. TTL 1–5 min",
  },
  {
    dataType: "Real-time stock price",
    readFrequency: "high",
    changeFrequency: "high",
    recommendation: "Do NOT cache — data stale within seconds",
  },
  {
    dataType: "User-specific financial data",
    readFrequency: "medium",
    changeFrequency: "medium",
    recommendation: "Do NOT cache at CDN — cache per-user in Redis only",
  },
];
```

---

## Cache Warm-Up on Deploy

Cold caches after a deploy cause a DB stampede. Pre-warm critical keys before cutting over traffic:

```typescript
interface WarmupKey {
  key: string;
  loader: () => Promise<unknown>;
  ttlSeconds: number;
}

async function warmupCache(
  cache: CacheClient,
  keys: WarmupKey[]
): Promise<void> {
  await Promise.all(
    keys.map(async ({ key, loader, ttlSeconds }) => {
      const data = await loader();
      await cache.set(key, data, ttlSeconds);
    })
  );
}

// Call before routing traffic to new instances
await warmupCache(cache, [
  { key: "homepage:featured", loader: () => db.getFeaturedProducts(), ttlSeconds: 300 },
  { key: "config:flags", loader: () => db.getFeatureFlags(), ttlSeconds: 600 },
]);
```

---

## TTL Jitter

If all cache keys expire at the same time (e.g., all set with TTL = 300s at deploy), they all miss simultaneously — thundering herd.

```typescript
function jitteredTtl(baseTtlSeconds: number, jitterPercent = 0.1): number {
  const jitter = baseTtlSeconds * jitterPercent;
  return Math.round(baseTtlSeconds + (Math.random() * 2 - 1) * jitter);
}

// Instead of: cache.set(key, value, 300)
// Use:        cache.set(key, value, jitteredTtl(300))
// TTL is 270–330s — keys expire at different times
```

---

## Common Mistakes

❌ **No TTL** — stale data lives forever. Always set a TTL, even if it's long.

❌ **Caching user-specific data without per-user keys** — one user gets another's data. Key format: `product:{productId}` not `product:latest`.

❌ **No invalidation on write** — users see stale data after updates. Evict the cache key whenever the underlying data changes.

❌ **Cache as primary store** — cache is volatile. If Redis restarts, data must be re-fetchable from the database.

✅ **Add jitter to TTLs** — prevents simultaneous expiry of related keys.

---

## Real-World Example

An e-commerce platform caches its product catalog (50k products) with cache-aside and a 5-minute TTL. On Black Friday, 200k req/sec hit the product pages. Without caching, this generates 200k DB queries/sec — far beyond capacity. With 94% cache hit ratio, only 12k req/sec reach the database — within its limit. When a price is updated, the cache key is evicted immediately. The first subsequent request re-populates it within 10ms.

---

## Key Insight

> Caching is not a performance trick — it is a scaling multiplier. A 90% hit ratio means 10× fewer database queries at the same traffic volume. Solve your scaling problem with caching before buying more servers.

**Deep dive:** [BuildingBlocks: Caching](../BuildingBlocks/02-caching.md)

---

[← Back to SystemDesign](../README.md)
