# Performance Optimization

## Overview

Performance is how fast the system answers and how much load it handles. Every 100ms of extra latency can drop conversion by 7%. Performance work is mostly removing waste — wasted queries, wasted bytes, wasted round trips.

## Key Metrics

### 💡 **Latency**

Time between request and response.

**Reference latencies every senior should know:**

| Operation                  | Time         |
| -------------------------- | ------------ |
| L1 cache                   | 0.5 ns       |
| RAM access                 | 100 ns       |
| SSD read                   | 150 µs       |
| Network, same datacenter   | 0.5 ms       |
| Network, cross-region      | 50–100 ms    |
| Network, cross-continent   | 100–300 ms   |

### 💡 **Percentiles (P50, P95, P99)**

Averages hide outliers. Always look at percentiles.

| Metric  | Meaning                                |
| ------- | -------------------------------------- |
| **P50** | Median — half of users see this or less|
| **P95** | 95% of users see this or less          |
| **P99** | 99% of users see this or less          |

**Key Insight:**

> Optimise P95 and P99, not the average. The tail is where users abandon.

### 💡 **Throughput**

Requests handled per second. Tied to latency through Little's Law:

```
Concurrency = Throughput × Latency
```

A server doing 10,000 req/s at 50ms latency holds about 500 in-flight requests at once.

## Database Performance

### 💡 **Indexing**

An index turns a full table scan (O(n)) into a B-tree lookup (O(log n)).

```sql
-- Full scan over 1M rows
SELECT * FROM users WHERE email = 'john@example.com';

-- Add an index — now ~20 row reads
CREATE INDEX idx_email ON users(email);
```

**Composite index column order matters:**

```sql
CREATE INDEX idx_name ON users(last_name, first_name);

-- ✅ Uses the index
SELECT * FROM users WHERE last_name = 'Smith';
SELECT * FROM users WHERE last_name = 'Smith' AND first_name = 'John';

-- ❌ Cannot use the index — wrong leading column
SELECT * FROM users WHERE first_name = 'John';
```

**Trade-offs:** indexes speed reads, slow writes, and use disk. Index the columns you filter or join on, not everything.

### 💡 **Query Optimization**

**Common Mistakes:**

❌ **Bad:** N+1 queries — one query per parent row.

```typescript
const users = await db.query<User>("SELECT * FROM users");
for (const user of users) {
  user.orders = await db.query<Order>(
    "SELECT * FROM orders WHERE user_id = $1",
    [user.id],
  );
}
```

✅ **Good:** one join, or a single batched query.

```typescript
const rows = await db.query<UserWithOrder>(`
  SELECT u.*, o.*
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
`);
```

Other quick wins:

- Select only needed columns. Avoid `SELECT *`.
- Paginate large result sets with `LIMIT` and a keyset cursor.
- Use `EXPLAIN` to see whether the index actually fires.
- Avoid leading wildcards in `LIKE '%term'` — they cannot use a B-tree index.

### 💡 **Connection Pooling**

Opening a DB connection costs 50–200ms. A pool keeps connections warm and reuses them.

```typescript
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  database: "mydb",
  max: 10, // cap concurrent connections
});

async function getUser(id: string): Promise<User> {
  const client = await pool.connect();
  try {
    const result = await client.query<User>(
      "SELECT * FROM users WHERE id = $1",
      [id],
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}
```

**Use a pool when** the app makes more than a handful of queries per request.

## Caching

### 💡 **Cache Layers**

Caches stack from the browser down to the database. The earlier the cache, the cheaper the request.

```
Browser cache → CDN → App cache (Redis) → DB query cache → DB
```

### 💡 **Hit Ratio**

```
Hit Ratio = Cache Hits / Total Requests
```

Aim for 80%+ in most user-facing applications. Below 50% usually means the TTL is too short or the cache key is too fine-grained.

### 💡 **Eviction Policies**

| Policy  | When to Use                              |
| ------- | ---------------------------------------- |
| **LRU** | Default — recent data tends to repeat    |
| **LFU** | Stable hot keys, predictable workload    |
| **TTL** | Time-bound freshness (sessions, tokens)  |

LRU in TypeScript using `Map` insertion order:

```typescript
class LRUCache<K, V> {
  private readonly cache = new Map<K, V>();
  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    this.cache.delete(key);
    this.cache.set(key, value); // move to most-recent
    return value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value as K;
      this.cache.delete(oldest);
    }
  }
}
```

### 💡 **Cache Invalidation**

| Strategy             | Pros                       | Cons                         |
| -------------------- | -------------------------- | ---------------------------- |
| **TTL expiry**       | Simple, self-healing       | Stale window equals TTL      |
| **Write-through**    | Always fresh               | Writes pay double the cost   |
| **Delete on write**  | Simple, fresh on next read | Brief miss after update      |
| **Event-driven**     | Works across services      | More moving parts            |

**Common Mistakes:**

❌ **Bad:** caching mutable data with a long TTL and no invalidation.
✅ **Good:** delete the cache key in the same transaction that updates the row.

## CDN

A CDN caches static content near the user. Latency drops from 200ms (cross-continent) to under 30ms.

```typescript
// Express — cache static assets for a year, fingerprinted filenames
app.use(
  "/static",
  express.static("public", {
    maxAge: "1y",
    immutable: true,
  }),
);
```

**Cache-Control directives that matter:**

| Directive    | Use For                              |
| ------------ | ------------------------------------ |
| `public`     | Cacheable by CDN                     |
| `private`    | Only the browser may cache           |
| `max-age=N`  | Cache for N seconds                  |
| `immutable`  | Hashed asset URLs that never change  |
| `no-store`   | Sensitive data — never cache         |

## Application-Level Wins

### 💡 **Lazy Loading**

Load components and assets only when the user needs them.

```typescript
// React route-level code splitting
const Dashboard = React.lazy(() => import("./Dashboard"));

export function App(): JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

For images, use `loading="lazy"` on `<img>`.

### 💡 **Compression**

Gzip and Brotli shrink text payloads by 70–90%.

```typescript
import compression from "compression";
app.use(compression()); // Brotli/Gzip negotiated per request
```

### 💡 **Bundle Optimization**

- **Code splitting** — load only the chunks the current route needs.
- **Tree shaking** — import named exports, not whole libraries.

```typescript
// ❌ Bad — pulls in all of lodash
import _ from "lodash";

// ✅ Good — only the function you use
import { debounce } from "lodash-es";
```

### 💡 **Async Processing**

Move slow work off the request path. Return fast, finish later.

```typescript
// ❌ Bad — caller waits for email and report
app.post("/register", async (req, res) => {
  const user = await createUser(req.body);
  await sendWelcomeEmail(user.email);
  await generateReport(user.id);
  res.json({ success: true });
});

// ✅ Good — respond now, queue the slow work
app.post("/register", async (req, res) => {
  const user = await createUser(req.body);
  await queue.enqueue("send_email", { email: user.email });
  await queue.enqueue("generate_report", { userId: user.id });
  res.json({ success: true });
});
```

## Monitoring

### 💡 **What to Track**

| Metric              | Why it Matters                       |
| ------------------- | ------------------------------------ |
| **Latency (P95/P99)**| Catches tail-latency regressions    |
| **Throughput**      | Sizes capacity and scaling triggers  |
| **Error rate (5xx)**| First sign something is broken       |
| **CPU / memory**    | Spot saturation before it bites      |

Wrap requests in a single middleware to measure latency consistently:

```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    metrics.record({
      endpoint: req.path,
      method: req.method,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});
```

## How to Optimize a Slow Endpoint

A senior approach is always measure-first:

1. **Measure** with APM (Datadog, New Relic, OpenTelemetry). Find the dominant cost.
2. **Database** — add indexes, fix N+1s, use a pool.
3. **Cache** — Redis for hot reads, CDN for static.
4. **Code** — remove waste, parallelize independent calls with `Promise.all`.
5. **Async** — push slow side effects to a queue.

**Key Insight:**

> Do not guess. Profile, fix the biggest bottleneck, measure again. Most "optimisations" without measurement make code worse.

## Common Pitfalls

❌ **Bad:** optimising the average latency.
✅ **Good:** chase P95 and P99 — that is where users feel pain.

❌ **Bad:** adding a cache to fix a slow query.
✅ **Good:** fix the query first. A cache hides bad queries until traffic doubles.

❌ **Bad:** running `SELECT *` from a 50-column table to show two fields.
✅ **Good:** select only the columns you render.

---

[← Back to SystemDesign](../README.md)
