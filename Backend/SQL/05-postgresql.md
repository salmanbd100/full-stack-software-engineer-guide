# PostgreSQL

## 💡 **What Makes PostgreSQL Distinctive**

PostgreSQL is an ACID-compliant, open-source relational database that ships features other engines bolt on (or skip). For a senior backend interview the relevant differentiators are:

- **MVCC concurrency** — writers don't block readers; each transaction sees a consistent snapshot.
- **`JSONB`** — binary-encoded, indexable JSON. Lets you mix relational and document workloads.
- **Arrays, ranges, UUID, geometric, network types** as first-class columns.
- **Full-text search** with `tsvector` + GIN indexes.
- **Window functions, CTEs, recursive CTEs** with full SQL standard compliance.
- **`EXPLAIN ANALYZE`** with rich planner output.
- **Extensions** — `pg_trgm`, `PostGIS`, `pgvector`, `pg_stat_statements`, etc.

---

## 💡 **Connecting from Node.js with `pg`**

`pg` is the canonical PostgreSQL driver for Node. Always use a connection pool — opening a fresh connection per query collapses under load.

```typescript
import { Pool, PoolClient, QueryResult } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                       // tune to (cores * 2) on the DB side
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  if (Date.now() - start > 200) {
    console.warn("slow query", { text, ms: Date.now() - start });
  }
  return res;
}
```

> Pool size matters more than people expect. Postgres can choke past ~100 active connections — use **PgBouncer** (transaction pooling) if you have many app instances.

---

## 💡 **Parameterized Queries (Always)**

`pg` uses `$1, $2, ...` placeholders. Never interpolate user input into SQL strings.

```typescript
// ✅ safe
await query("SELECT * FROM users WHERE email = $1", [email]);

// ❌ SQL injection vector
await query(`SELECT * FROM users WHERE email = '${email}'`);

// INSERT ... RETURNING gives you the row back in one round-trip
const { rows } = await query<{ id: number }>(
  `INSERT INTO users (email, name) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
   RETURNING id`,
  [email, name]
);
```

**Handling unique-violation errors:**

```typescript
try {
  await query("INSERT INTO users (email) VALUES ($1)", [email]);
} catch (err: any) {
  if (err.code === "23505") throw new Error("Email already in use");
  throw err;
}
```

Common Postgres error codes worth knowing: `23505` (unique violation), `23503` (FK violation), `23502` (not null), `40P01` (deadlock), `40001` (serialization failure).

---

## 💡 **Transactions with a Pool Client**

You must use a single client for the whole transaction — releasing it back to the pool between statements would scatter `BEGIN`/`COMMIT` across different connections.

```typescript
export async function withTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Usage
await withTransaction(async (c) => {
  await c.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, fromId]);
  await c.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, toId]);
});
```

---

## 💡 **JSONB**

`JSONB` stores parsed JSON in a binary format. Slightly slower to write than `JSON`, but far faster to query and indexable via GIN.

```sql
CREATE TABLE products (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL,
  attrs  JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_products_attrs ON products USING GIN (attrs);
```

| Operator      | Returns                  | Example                             |
| ------------- | ------------------------ | ----------------------------------- |
| `->`          | JSON value               | `attrs -> 'brand'`                  |
| `->>`         | Text value               | `attrs ->> 'brand'`                 |
| `@>`          | Contains?                | `attrs @> '{"brand":"Sony"}'`       |
| `?`           | Key exists?              | `attrs ? 'discount'`                |
| `\|\|`        | Merge / patch            | `attrs \|\| '{"price":99}'::jsonb`  |

```sql
-- All products by brand, GIN-indexed
SELECT id, name FROM products WHERE attrs @> '{"brand":"Sony"}';

-- Merge in new keys without overwriting the rest
UPDATE products SET attrs = attrs || '{"warranty":"2y"}'::jsonb WHERE id = $1;
```

**When to use JSONB vs columns:** stick with columns when the schema is known and stable — they're cheaper to query, easier to constrain, and indexable per-field. Use JSONB for sparse / variable attributes (product specs across categories, event payloads, feature flags).

---

## 💡 **Arrays**

```sql
CREATE TABLE posts (id SERIAL PRIMARY KEY, tags TEXT[]);
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- Element membership
SELECT * FROM posts WHERE 'sql' = ANY(tags);

-- Contains all of
SELECT * FROM posts WHERE tags @> ARRAY['sql','postgres'];

-- Overlaps with any of
SELECT * FROM posts WHERE tags && ARRAY['sql','mysql'];
```

Arrays are great for tags, role lists, and other small bounded sets. Reach for a join table once cardinality grows or you need per-element metadata.

---

## 💡 **Full-Text Search**

Postgres has a competent FTS engine that's plenty for most apps before you need Elasticsearch.

```sql
ALTER TABLE articles
  ADD COLUMN tsv tsvector GENERATED ALWAYS AS
  (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED;

CREATE INDEX idx_articles_tsv ON articles USING GIN (tsv);

SELECT id, title, ts_rank(tsv, q) AS rank
FROM articles, plainto_tsquery('english', $1) q
WHERE tsv @@ q
ORDER BY rank DESC
LIMIT 20;
```

For fuzzy / "did you mean" matching, add the `pg_trgm` extension and use `%` similarity or `ILIKE` with a trigram GIN index.

---

## 💡 **`EXPLAIN ANALYZE`**

The single most important PostgreSQL tool. `EXPLAIN` shows the plan; `EXPLAIN ANALYZE` actually runs the query and reports real times.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.name, COUNT(o.id)
FROM users u LEFT JOIN orders o ON o.user_id = u.id
WHERE u.country = 'US'
GROUP BY u.id;
```

**What to look for:**

- **Seq Scan** on a large table with a selective filter → missing index.
- **Rows estimate vs actual** wildly off → stale statistics; run `ANALYZE`.
- **Nested Loop** with thousands of outer rows → planner expected few; consider hashes/joins.
- **Buffers: shared read=...** large → cold cache or no index, lots of disk I/O.
- **Sort Method: external merge** → `work_mem` too small for the sort.

---

## 💡 **Bulk Inserts: `COPY` vs `INSERT`**

`COPY` is 10–100× faster than `INSERT` for large loads because it streams rows without re-parsing per statement.

```typescript
import { from as copyFrom } from "pg-copy-streams";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

export async function bulkLoadEvents(events: Event[]): Promise<void> {
  const client = await pool.connect();
  try {
    const stream = client.query(copyFrom("COPY events (id, type, payload) FROM STDIN WITH (FORMAT csv)"));
    const source = Readable.from(events.map(e => `${e.id},${e.type},"${JSON.stringify(e.payload)}"\n`));
    await pipeline(source, stream);
  } finally {
    client.release();
  }
}
```

For mid-size batches (hundreds to a few thousand rows), multi-row `INSERT ... VALUES (...), (...), ...` inside a single transaction is usually good enough and simpler.

---

## 💡 **MVCC in One Paragraph**

Postgres keeps multiple versions of each row. An `UPDATE` writes a new tuple and marks the old one obsolete; readers in older snapshots can still see the old version. Hence: writers never block readers, and readers never block writers. The cost is dead tuples that accumulate until `VACUUM` (usually autovacuum) reclaims them. If autovacuum can't keep up, tables bloat and queries slow down — this is the source of many production Postgres incidents.

---

## 📚 **Interview Q&A**

**Q1. JSONB vs JSON vs columns — when do you choose each?**
Columns when the schema is fixed (faster, constrainable, indexable per field). `JSONB` when the shape varies across rows or evolves frequently — it's binary, indexable via GIN, and supports rich operators. `JSON` (text storage) only if you need to preserve the original whitespace/key order; otherwise `JSONB` always wins.

**Q2. Walk me through how you'd debug a slow query.**
Run `EXPLAIN (ANALYZE, BUFFERS)`. Compare row estimates to actuals — large gaps mean stale stats; run `ANALYZE`. Look for sequential scans on large tables with selective filters — likely missing an index. Check buffer reads vs hits to see if it's I/O-bound. Inspect join order — if the planner picked nested loop where hash join was better, statistics or `work_mem` are off. Finally, check `pg_stat_statements` to see if this query is the actual bottleneck or just a red herring.

**Q3. How does Postgres handle concurrent reads and writes without locking?**
MVCC. Each transaction gets a snapshot at start (or per-statement under READ COMMITTED). `UPDATE` writes a new tuple version and marks the old one dead; readers in the older snapshot still see the old version. Writers never block readers, readers never block writers. The tradeoff is dead-tuple accumulation, which `VACUUM` cleans up.

---

## ✅ **Best Practices**

- ✅ Use a connection pool (`pg.Pool`) and tune `max` based on DB capacity, not app concurrency.
- ✅ Always use parameterized queries.
- ✅ Index `JSONB` columns with GIN before querying them.
- ✅ Use `COPY` for bulk loads (>10k rows).
- ✅ Add `pg_stat_statements` in production — you can't tune what you can't measure.
- ✅ Monitor autovacuum lag and table bloat.
- ❌ Don't use `JSONB` when the data is genuinely tabular — you lose type safety and indexability.
- ❌ Don't `synchronize: true` in any production-ish environment — use real migrations.

---

[← Previous: Transactions](./04-transactions.md) | [Next: ORMs →](./06-orms.md)
