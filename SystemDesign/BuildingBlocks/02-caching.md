# Caching

## 💡 **Concept**

A cache stores frequently read data in fast memory so the system doesn't fetch it from a slow source (database, API) every time.

**Use caching when:** data is read far more often than it changes, and latency or database load is a bottleneck.

Typical impact: 50–200ms DB query → 1–5ms cache read, 80–95% reduction in DB load.

---

## Caching Patterns

| Pattern | Who populates cache | Consistency | Best for |
|---|---|---|---|
| **Cache-aside** | Application (on miss) | Eventual | Read-heavy, general purpose |
| **Read-through** | Cache layer (on miss) | Eventual | Simplifies app code |
| **Write-through** | App writes cache + DB together | Strong | Low write volume, consistency needed |
| **Write-behind** | App writes cache; cache flushes async | Eventual | Write-heavy, tolerate brief inconsistency |

### Cache-Aside (Most Common)

```typescript
interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
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
  productId: string
): Promise<Product> {
  const cacheKey = `product:${productId}`;

  // 1. Check cache first
  const cached = await cache.get<Product>(cacheKey);
  if (cached) return cached; // cache HIT

  // 2. Cache MISS — fetch from DB
  const product = await db.findProduct(productId);

  // 3. Populate cache for future reads
  await cache.set(cacheKey, product, 300); // TTL: 5 minutes

  return product;
}

// Invalidate on write
async function updateProduct(
  cache: CacheClient,
  db: DatabaseClient,
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  await db.updateProduct(productId, updates);
  await cache.del(`product:${productId}`); // evict stale entry
}
```

### Write-Through

```typescript
async function updateProductWriteThrough(
  cache: CacheClient,
  db: DatabaseClient,
  product: Product
): Promise<void> {
  // Write to DB and cache atomically (or in sequence)
  await db.updateProduct(product.id, product);
  await cache.set(`product:${product.id}`, product, 300);
}
```

---

## Eviction Policies

| Policy | Evicts | When to use |
|---|---|---|
| **LRU** (Least Recently Used) | Least recently accessed | General purpose — most common |
| **LFU** (Least Frequently Used) | Least frequently accessed | Long-running caches with stable hot items |
| **TTL** (Time to Live) | Expired items | Data that goes stale after a fixed time |
| **FIFO** | Oldest inserted | Simple queues |

Redis defaults to LRU when maxmemory is set.

---

## Redis vs Memcached

| | Redis | Memcached |
|---|---|---|
| **Data structures** | String, Hash, List, Set, ZSet, Stream | String only |
| **Persistence** | RDB snapshots + AOF log | None |
| **Replication** | Yes (Primary/Replica) | No |
| **Clustering** | Yes (Redis Cluster) | Yes (client-side sharding) |
| **Pub/Sub** | Yes | No |
| **Lua scripting** | Yes | No |
| **Best for** | Sessions, leaderboards, queues, general cache | Simple key-value, maximum throughput |

> Use Redis in almost every new system. Memcached only wins on pure throughput benchmarks at extreme scale.

---

## Cache Stampede (Thundering Herd)

When a popular cache key expires, hundreds of requests simultaneously query the DB — overwhelming it.

**Solutions:**

```typescript
// 1. Probabilistic early recomputation (PER)
async function getWithPER(
  cache: CacheClient,
  db: DatabaseClient,
  key: string,
  ttlSeconds: number
): Promise<Product> {
  const cached = await cache.get<{ value: Product; expiresAt: number }>(key);

  if (cached) {
    const timeLeft = cached.expiresAt - Date.now();
    const shouldRecompute = Math.random() < Math.exp(-timeLeft / (ttlSeconds * 1000));

    if (!shouldRecompute) return cached.value; // still serve from cache
  }

  // Recompute (with distributed lock in production)
  const fresh = await db.findProduct(key);
  await cache.set(key, { value: fresh, expiresAt: Date.now() + ttlSeconds * 1000 }, ttlSeconds);
  return fresh;
}

// 2. Mutex lock — only one request regenerates, others wait
// Use Redis SET NX EX as a distributed lock
```

---

## Cache Hit Ratio

```
Hit ratio = cache hits / (cache hits + cache misses)

Target: > 80% for read-heavy workloads
< 50%: cache is not helping — revisit what you're caching or TTL
```

Factors that hurt hit ratio:
- TTL too short — keys expire before they're reused
- Cache too small — keys evicted before second read
- Low data repetition — every request is unique

---

## When to Use

| Scenario | What to cache |
|---|---|
| Product catalog (e-commerce) | Product data, prices, categories (TTL: 5 min) |
| User profile | Session data, preferences (TTL: 30 min) |
| API rate limit counters | Redis counters with TTL |
| Database query results | Heavy aggregation results (TTL: 1–5 min) |
| HTML fragments | Rendered components (cache-aside + CDN) |

**Do NOT cache:** user-specific financial data that must be accurate, one-time tokens, highly dynamic per-request data.

---

## Common Mistakes

❌ **Caching without TTL** — stale data lives forever. Always set a TTL.

❌ **Cache everything** — caching low-read-frequency data wastes memory and adds complexity. Cache the hot 20%.

❌ **No invalidation on write** — users see stale data after updates. Evict the key on every write.

❌ **Using cache as primary store** — cache is volatile; data must live in the database.

✅ **Add jitter to TTLs** — if all keys expire at the same time, cache stampede occurs. Randomize TTL by ±10%.

---

## Real-World Example

An e-commerce site caches its product catalog with cache-aside and a 5-minute TTL. On Black Friday, 500k req/sec hit the product listing pages. Without caching, this would generate 500k DB queries/sec — the DB can handle ~10k. With caching at 92% hit rate, only 40k req/sec reach the DB — within capacity. When a price changes, the cache key is evicted immediately and the next request re-populates it.

---

## Key Insight

> Cache invalidation is harder than caching. Start with cache-aside + TTL-based expiry. Add explicit invalidation on writes only when stale data causes real problems.

**Related:** [Caching Strategies (Scalability)](../Scalability/04-caching-strategies.md) · [CDN](./03-cdn.md)

---

[← Back to SystemDesign](../README.md)
