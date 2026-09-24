---
title: Indexes, Query Plans, ORMs and Migrations
part: 5
chapter: 13
slug: indexes
level: advanced
reading_time: 14
updated: 2026-09-24
tags: [sql, indexes, explain, query-optimisation, postgres, orm, prisma, migrations, connection-pool]
in_book: true
---

# Indexes, Query Plans, ORMs and Migrations {#ch-indexes}

> See the SQL your ORM actually sends, read its plan, and change a live schema without downtime.

**In this chapter:** what a B-tree can and cannot do · the queries an ORM hides · reading `EXPLAIN ANALYZE` · connection pooling · expand-then-contract migrations

## 💡 The Core Idea

An index is a sorted copy of some columns, with a pointer back to each row. A sorted list can
answer equality and range questions on a **prefix** of its sort key, and nothing else. So
`WHERE lower(email) = $1` cannot use an index on `email`: the index stores `email`, not `lower(email)`.

An ORM sits on top of all this. It maps rows to objects and writes the SQL for you. That saves a lot
of boilerplate, but it hides the thing you most need to see: **how many queries your code sends,
and what each one costs.** A property access that looks free is a round trip. A migration tool can
write correct SQL that locks your whole table.

So let the ORM write the routine 90% of queries, always see and read the plan of the SQL that ran,
and change the schema in steps that old and new code can both survive.

> ⚠️ **Moving target:** Prisma, Drizzle and TypeORM all change their query APIs across major
> versions, and Prisma has moved its engine architecture more than once. The durable principle is
> that generated SQL must be observable and a schema change must be safe for the code still running.
> The method names will move.

## How It Works

### Composite column order is the whole game

The default B-tree covers almost every case; GIN is for containment on `jsonb`, arrays and
full-text. A B-tree on `(a, b, c)` is one list sorted by `a`, then `b`, then `c`. That gives the
**leftmost prefix rule**: the index helps only a query that constrains a prefix of its columns.

**A composite index for a user's order history:**

```sql
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);
```

| Query predicate | Uses the index? |
| --------------- | --------------- |
| `user_id = 1 AND status = 'paid' ORDER BY created_at DESC` | ✅ Fully, and the sort is free |
| `user_id = 1` | ✅ A prefix of one column |
| `status = 'paid'` | ❌ Skips the leading column |
| `user_id = 1 AND created_at > $1` | ⚠️ Partly: uses `user_id`, then filters |

So put **equality columns first, then the range or sort column.** A range stops the index helping
with anything to its right. Rows inside a range are not in order on the columns after it.

### Covering and partial indexes

A **covering** index holds every column the query needs. The database answers from the index alone
and never touches the table. This is an index-only scan. A **partial** index holds only the rows you
query, so it is small and cheap to keep up to date.

**Covering and partial indexes:**

```sql
-- INCLUDE adds payload columns without making them part of the sort key.
CREATE INDEX idx_orders_cover ON orders (user_id, created_at DESC) INCLUDE (total, status);

-- 2% of rows are pending, so the index is 2% of the size and stays in memory.
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';
```

Every index is paid for on writes: each `INSERT`, `UPDATE` and `DELETE` updates all of them.

## The Query Your ORM Sends

An ORM gives you types from the schema and parameterised queries by default. In return, its SQL is
sometimes far from optimal. Prisma uses its own schema language; Drizzle keeps the schema in
TypeScript and looks like SQL. The choice matters less than knowing what SQL comes out.

**The N+1, and its fix:**

```typescript
// ❌ One query for posts, then one per post: 21 round trips for a page of 20.
const posts = await prisma.post.findMany({ take: 20 });
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ One query, or two: the ORM batches the relation.
const withAuthors = await prisma.post.findMany({ take: 20, include: { author: true } });
```

`include` is the fix, and also the next trap. Include three one-to-many relations and the join
returns the product of their row counts. A page that should return 20 rows fetches 4,000, and the
ORM deduplicates them in memory. When that happens, send separate queries and stitch the results.
That is what a `DataLoader` does in GraphQL.

**Select only the columns you need:**

```typescript
// Every column by default defeats covering indexes and inflates the payload.
const rows = await prisma.post.findMany({
  select: { id: true, title: true, author: { select: { name: true } } },
  take: 20,
});
```

**Turn on query logging in development.** It is the single most useful ORM setting. If you cannot
see the SQL, you cannot review it, and you cannot run `EXPLAIN` on it.

### Connection pooling

The database has a hard connection limit, and a pool reuses a few connections, usually 10–20 per
instance. The arithmetic catches people. Forty serverless instances with a pool of 10 open 400
connections against a limit of 100. Autoscaled apps need an external pooler, such as PgBouncer, in
transaction mode, which breaks session features such as prepared statements and `LISTEN`/`NOTIFY`.

## Reading a Plan

`EXPLAIN` shows the planner's intention. `EXPLAIN ANALYZE` runs the query and shows what happened.

**Run the ORM's logged query through the planner:**

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
```

| Node | Means | Concern |
| ---- | ----- | ------- |
| `Seq Scan` | Reads every row | Fine on a small table, a problem on a large one |
| `Index Scan` / `Index Only Scan` | Index lookup, with or without a table fetch | Good / best |
| `Nested Loop` | Probes the inner side once per outer row | Bad if the outer row estimate is wrong |

Three numbers matter most:

- **Estimated `rows` against `actual`.** Ten times apart means stale statistics. Run `ANALYZE`, and
  distrust every choice made from that estimate.
- **`loops`.** A cheap node run 10,000 times is not cheap. Multiply.
- **`Rows Removed by Filter`.** A large number means the index found rows the predicate then threw
  away. The index is missing a column.

### The fixes that work

- **Make the predicate indexable.** Index the expression, `CREATE INDEX … ON users (lower(email))`,
  or store the value normalised. For `created_at::date = $1`, compare a range instead.
- **Replace `OFFSET` with keyset pagination.** `OFFSET 100000` reads and discards 100,000 rows.
- **Batch the N+1.** The most common "slow query" is a fast query run 200 times.
- **Drop unused indexes.** Zero `idx_scan` in `pg_stat_user_indexes` over a business cycle is pure write cost.

## Changing the Schema Live

A migration is a versioned, ordered schema change, committed with the code. Never edit one that has
already run somewhere. **Fix forward in production**: a `down` migration that restores a dropped
column does not bring the data back. And keep data backfills out of schema migrations, because a
backfill inside one holds its lock for as long as it runs.

### Expand, then contract

During a deploy, old and new code run at once, so both must work against the schema in the middle.

**Replacing two name columns with one:**

```sql
-- 1. EXPAND: add the new column, nullable, so no table rewrite.
ALTER TABLE users ADD COLUMN full_name text;

-- 2. BACKFILL: in batches, outside the migration, so no long lock.
UPDATE users SET full_name = first_name || ' ' || last_name
WHERE id IN (SELECT id FROM users WHERE full_name IS NULL LIMIT 5000);

-- 3. Deploy code that writes both columns and reads the new one.

-- 4. CONTRACT: only once no running code reads the old columns.
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

### The four changes that need care

| Change | Hazard | Safe route |
| ------ | ------ | ---------- |
| Add an index | `CREATE INDEX` blocks writes for minutes | `CREATE INDEX CONCURRENTLY`, outside a transaction |
| Add a `NOT NULL` column with a default | Older engines, and volatile defaults, rewrite the table | Add nullable, backfill, then `SET NOT NULL` |
| Add a foreign key | Validation scans and locks both tables | `ADD CONSTRAINT … NOT VALID`, then `VALIDATE CONSTRAINT` |
| Change a column type | Full rewrite under an exclusive lock | New column, backfill, swap, drop |

> ⚠️ Set a short `lock_timeout` before any DDL on a live table. A migration waiting for its lock
> queues every query behind it. That is how a one-line `ALTER TABLE` becomes an outage.

## Common Mistakes

**❌ Indexing every column separately.** ✅ One composite index in the right order beats three.

**❌ Trusting the ORM because it is typed.** Types say nothing about round trips. ✅ Log the SQL and
read its plan.

**❌ A backfill in one statement on a large table.** It holds a lock, bloats the WAL and can time out
halfway. ✅ Batch it in a bounded loop with a pause.

## 🔑 Key Takeaways

- An index is a sorted copy, so it answers questions about a prefix of its sort key and nothing else.
- An ORM's real cost is hidden round trips and row explosions, so log the generated SQL in development.
- In `EXPLAIN ANALYZE`, a large gap between estimated and actual rows is usually the real finding.
- Pool size times instance count must stay under the database's connection limit.
- Expand, backfill, deploy, then contract is the safe order for any breaking schema change.

## Interview Questions

**Q: You have an index on `(user_id, status, created_at)`. Which queries use it?**

Any query that constrains a leftmost prefix: `user_id` alone, `user_id` with `status`, or all three.
With all three, `ORDER BY created_at` is free because the index is already in that order. A query on
`status` alone cannot use it. `user_id` with a range on `created_at` uses the leading column, then
filters.

**Q: A query has an index and is still slow. What do you check?**

The plan first. Common causes are a function or cast on the indexed column, stale statistics giving
a bad row estimate and a nested loop, or a low-selectivity index the planner rightly ignores. A large
`Rows Removed by Filter` means the index is missing a column the predicate needs.

**Q: When do you drop out of the ORM into raw SQL?**

For analytical queries with window functions or recursive CTEs, and for bulk work where the ORM
sends one statement per row. Also when the generated plan is bad and the API cannot change it. Keep
the raw SQL parameterised and behind a typed function.

**Q: How do you rename a column with zero downtime?**

Expand and contract. Add the new column, deploy code that writes both and reads the new one, and
backfill in batches. Check nothing reads the old column, then drop it in a later release. A direct
rename breaks every old instance still running during the deploy.

## What to Read Next

- [Chapter ?? — SQL Fundamentals and Schema Design](#ch-sql-fundamentals) — the schema these indexes and migrations serve
- [Chapter ?? — Node.js Performance, Streams and Scaling](#ch-nodejs-performance) — finding the slow query from the application side
- [Chapter ?? — REST Best Practices and Versioning](#ch-rest-best-practices) — expand and contract at the API layer
