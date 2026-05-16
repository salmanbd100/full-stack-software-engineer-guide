# Query Optimization

---

## 💡 The Optimization Loop

1. Measure — find the slow query (pg_stat_statements, slow query log)
2. Explain — read the query plan to see what the database actually does
3. Fix — add an index, rewrite the query, or change the schema
4. Verify — run EXPLAIN again to confirm the improvement

Never guess. Always measure first.

---

## EXPLAIN / EXPLAIN ANALYZE

`EXPLAIN` shows the planned execution steps and estimated cost. `EXPLAIN ANALYZE` runs the query and shows actual times. Use `ANALYZE` in development, not in production on expensive queries.

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 12345 ORDER BY created_at DESC LIMIT 20;

-- Typical slow output (no index):
-- Seq Scan on orders  (cost=0.00..184200.00 rows=18 width=120)
--                     (actual time=0.052..1823.440 rows=18 loops=1)
--   Filter: (user_id = 12345)
--   Rows Removed by Filter: 9999982
-- Execution Time: 1823.7 ms

-- After adding index:
-- Index Scan using idx_orders_user_id_created on orders
--                     (cost=0.56..89.32 rows=18 width=120)
--                     (actual time=0.041..0.198 rows=18 loops=1)
-- Execution Time: 0.3 ms
```

### Scan Types (worst to best for large tables)

| Scan Type | When it appears | What it means |
|-----------|----------------|---------------|
| **Seq Scan** | No usable index | Reads every row — fine for small tables, slow for large ones |
| **Bitmap Heap Scan** | Low-selectivity index | Batches index lookups, then fetches heap pages |
| **Index Scan** | Selective index | Follows index pointers to heap — fast |
| **Index Only Scan** | Covering index | Never touches the heap — fastest |

---

## Indexes

### Create Indexes on Filtered and Sorted Columns

```sql
-- Covers: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX idx_orders_user_created
  ON orders(user_id, created_at DESC);

-- Partial index — only index rows that are actually queried
-- Faster to build and smaller than a full index
CREATE INDEX idx_orders_pending
  ON orders(created_at)
  WHERE status = 'pending';

-- Covering index — includes non-key columns so heap fetch is skipped
CREATE INDEX idx_orders_user_covering
  ON orders(user_id) INCLUDE (total_cents, status, created_at);
```

### What Breaks Index Use

```sql
-- ❌ Function on indexed column — index ignored
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- ✅ Functional index matches the expression
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- ❌ Implicit cast — user_id is integer, string comparison forces seq scan
SELECT * FROM orders WHERE user_id = '12345';

-- ✅ Match the column type
SELECT * FROM orders WHERE user_id = 12345;

-- ❌ Leading wildcard — index cannot help
SELECT * FROM products WHERE name LIKE '%phone%';

-- ✅ Trailing wildcard uses index normally
SELECT * FROM products WHERE name LIKE 'phone%';
-- For full-text search use a GIN index with tsvector instead
```

---

## The N+1 Query Problem

N+1 is the most common ORM-related performance bug. One query fetches N records, then N more queries fetch related data — one per row.

### Detecting N+1

```typescript
// This looks fine but fires 101 SQL queries
const users = await User.findAll({ limit: 100 });     // 1 query
for (const user of users) {
  const posts = await Post.findAll({                   // 100 queries!
    where: { userId: user.id }
  });
  console.log(user.name, posts.length);
}
```

You can spot N+1 in logs when you see the same query repeated with different parameter values. Tools like Sequelize's `logging` option or Prisma's `$on('query')` hook make this visible.

### Fix 1: Eager Loading (JOIN)

```typescript
// Sequelize — one query with LEFT JOIN
const users = await User.findAll({
  limit: 100,
  include: [{ model: Post, as: 'posts' }]   // JOIN instead of N queries
});
```

### Fix 2: Batch Query (IN clause)

```typescript
// Prisma — two queries total, not N+1
const users = await prisma.user.findMany({ take: 100 });
const userIds = users.map(u => u.id);

// One batched query instead of 100
const posts = await prisma.post.findMany({
  where: { userId: { in: userIds } }
});

// Map posts back to users in memory
const postsByUser = new Map<number, Post[]>();
for (const post of posts) {
  const list = postsByUser.get(post.userId) ?? [];
  list.push(post);
  postsByUser.set(post.userId, list);
}
```

### Fix 3: DataLoader (GraphQL / API resolvers)

```typescript
import DataLoader from 'dataloader';

// Batches all post lookups that happen in one event loop tick
const postLoader = new DataLoader<number, Post[]>(async (userIds) => {
  const posts = await prisma.post.findMany({
    where: { userId: { in: [...userIds] } }
  });
  return userIds.map(id => posts.filter(p => p.userId === id));
});

// In each resolver — looks like N queries but actually batched into 1
const posts = await postLoader.load(user.id);
```

---

## Connection Pooling

Opening a new database connection takes 20–100 ms. At high concurrency this becomes the bottleneck. A connection pool keeps connections open and reuses them.

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  max:      20,                   // max concurrent connections
  idleTimeoutMillis: 30_000,      // close idle connections after 30s
  connectionTimeoutMillis: 2_000  // fail fast if pool is exhausted
});

// Every request borrows from the pool, never creates a raw connection
async function getUser(id: number): Promise<User | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<User>(
      'SELECT id, name, email FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  } finally {
    client.release();   // always return to pool
  }
}
```

**Sizing the pool:** A good starting point is `max = (number of CPU cores × 2) + active disks`. A pool that is too large causes DB-side contention; too small causes application-side queuing. Monitor `pool.waitingCount` to find the right value.

---

## Query Rewrites

### Prefer WHERE over HAVING for Filtering

```sql
-- ❌ Aggregates all rows, then filters — scans everything
SELECT user_id, COUNT(*) AS cnt
FROM orders
GROUP BY user_id
HAVING user_id = 12345;

-- ✅ Filters first, then aggregates — uses index on user_id
SELECT user_id, COUNT(*) AS cnt
FROM orders
WHERE user_id = 12345
GROUP BY user_id;
```

### Use EXISTS Instead of IN for Large Subqueries

```sql
-- ❌ Loads all subquery rows into memory
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total_cents > 10000);

-- ✅ Short-circuits on first match
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.total_cents > 10000
);
```

### Pagination — Keyset over OFFSET

```sql
-- ❌ OFFSET scans and discards rows — page 1000 reads 100,000 rows
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20000;

-- ✅ Keyset pagination — always reads exactly 20 rows
SELECT * FROM posts
WHERE created_at < :last_seen_created_at
ORDER BY created_at DESC
LIMIT 20;
```

---

## Common Mistakes

❌ **Running EXPLAIN ANALYZE in production on a 10-second query** — it executes the full query. Use `EXPLAIN (ANALYZE, BUFFERS)` on a replica.

❌ **Adding indexes on every column** — indexes slow down writes and consume storage. Index only columns that appear in WHERE, JOIN ON, or ORDER BY of hot queries.

❌ **Ignoring `Rows Removed by Filter`** — a large number here means the index is not selective enough. Consider a partial index or a composite index.

❌ **Fetching all columns with SELECT *** — even if you only need two fields. This prevents index-only scans and wastes network bandwidth.

---

## Key Insight

> Most query performance problems fall into one of three categories: a missing index, an N+1 loop, or a query that returns far more data than needed. Run EXPLAIN ANALYZE first — it tells you exactly which category you're in.

---

## Interview Answer Template

> "When I get a slow query report, I start with EXPLAIN ANALYZE to see whether the database is doing a sequential scan or using an index. A sequential scan on a large table almost always means a missing or unusable index. I check whether a function on the column or a type mismatch is preventing index use, then create a composite or covering index for the specific query shape.
>
> The other common issue is N+1 — ORMs hide it well but it shows up as hundreds of identical queries in the logs. The fix is eager loading or a batch query with an IN clause. For GraphQL resolvers I use DataLoader to coalesce per-field loads into one batched DB call.
>
> For connection management I always use a pool sized to the expected concurrency, with an idle timeout so connections aren't held open unnecessarily. I also prefer keyset pagination over OFFSET for any paginated endpoint that users scroll deep into."

---

[← Back to Database](./README.md)
