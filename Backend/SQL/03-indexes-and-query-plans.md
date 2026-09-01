---
title: Indexes and Query Plans
part: 5
chapter: 0
slug: indexes
level: advanced
reading_time: 10
updated: 2026-09-01
tags: [sql, indexes, explain, query-optimisation, postgres]
in_book: true
---

# Indexes and Query Plans {#ch-indexes}

> Read the plan before changing the query, and know exactly which index a `WHERE` clause can use.

**In this chapter:** what a B-tree can and cannot do · composite column order · covering and partial indexes · reading `EXPLAIN ANALYZE` · the fixes that actually work

## 💡 The Core Idea

An index is a sorted copy of some columns with a pointer back to the row. That one sentence
predicts almost everything: a sorted structure can answer equality and range questions on a
**prefix** of its sort key, and nothing else.

So `WHERE email = $1` uses an index on `email`. `WHERE lower(email) = $1` does not, because the
index stores `email`, not `lower(email)`. `WHERE name LIKE '%smith'` does not, because a sorted
list cannot help you find suffixes. Every index question is a question about whether the planner
can turn your predicate into a range on the sort key.

The cost is write amplification. Every `INSERT`, `UPDATE` and `DELETE` maintains every index on
the table, so an over-indexed table is slow to write and expensive to store.

## How It Works

### Index types, and when the default is wrong

| Type | Answers | Reach for it when |
| ---- | ------- | ----------------- |
| **B-tree** (default) | `=`, `<`, `>`, `BETWEEN`, `IN`, prefix `LIKE 'a%'`, `ORDER BY` | Almost always |
| **Hash** | `=` only | Rarely — B-tree does the same and more |
| **GIN** | Containment: `jsonb`, arrays, full-text | `WHERE tags @> '["sale"]'` |
| **GiST** | Geometric and range overlap | Coordinates, `EXCLUDE` constraints |
| **BRIN** | Ranges over naturally ordered data | A huge append-only table by timestamp |

A B-tree on `(a, b, c)` is one sorted list ordered by `a`, then `b`, then `c`.

### Composite column order is the whole game

The **leftmost prefix rule**: a composite index serves a query only if the query constrains a
prefix of its columns, in order.

```sql
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);
```

| Query predicate | Uses the index? |
| --------------- | --------------- |
| `user_id = 1` | ✅ Prefix of one |
| `user_id = 1 AND status = 'paid'` | ✅ Prefix of two |
| `user_id = 1 AND status = 'paid' ORDER BY created_at DESC` | ✅ Fully, and the sort is free |
| `status = 'paid'` | ❌ Skips the leading column |
| `user_id = 1 AND created_at > $1` | ⚠️ Partly — uses `user_id`, then filters |

The ordering rule that follows: **equality columns first, then the range or sort column.** A range
predicate stops the index being useful for anything to its right, because rows matching a range are
not contiguous in the columns after it.

### Covering and partial indexes

A **covering** index contains every column the query needs, so the database answers from the index
alone and never touches the table — an index-only scan.

```sql
-- INCLUDE adds payload columns without making them part of the sort key.
CREATE INDEX idx_orders_cover ON orders (user_id, created_at DESC) INCLUDE (total, status);
```

A **partial** index covers only the rows you query, which makes it smaller and cheaper to
maintain.

```sql
-- 2% of rows are pending; the index is 2% of the size and stays hot in memory.
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';

-- Soft deletes: uniqueness that ignores deleted rows.
CREATE UNIQUE INDEX idx_users_email_live ON users (email) WHERE deleted_at IS NULL;
```

> ⚠️ Build indexes on a live table with `CREATE INDEX CONCURRENTLY`. A plain `CREATE INDEX` takes a
> lock that blocks every write to the table for the duration — minutes, on a large table.

## Reading a Plan

`EXPLAIN` shows the planner's intention. `EXPLAIN ANALYZE` runs the query and shows what actually
happened, which is the one you want.

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
```

| Node | Means | Concern |
| ---- | ----- | ------- |
| `Seq Scan` | Reading every row | Fine on a small table, a problem on a large one |
| `Index Scan` | Index lookup, then fetch the row | Good |
| `Index Only Scan` | Answered from the index alone | Best |
| `Bitmap Heap Scan` | Many matches — collect then fetch in page order | Normal for medium selectivity |
| `Nested Loop` | For each outer row, probe the inner | Bad if the outer row estimate is wrong |
| `Hash Join` | Build a hash of one side | Good for large joins |
| `Sort` with `external merge` | Sorting spilled to disk | Raise `work_mem`, or index the sort |

The three numbers that matter:

- **`rows` estimated against `actual`.** An order of magnitude apart means the statistics are
  stale — run `ANALYZE` — and every decision downstream of that estimate is suspect.
- **`loops`.** A cheap node run 10,000 times is not cheap. Multiply.
- **`Rows Removed by Filter`.** Large means the index found rows the predicate then discarded — the
  index is missing a column.

## The Fixes That Work

**Make the predicate indexable, or index the expression:**

```sql
-- ❌ The function defeats the index on email
SELECT * FROM users WHERE lower(email) = $1;

-- ✅ Either store it normalised, or index the expression itself
CREATE INDEX idx_users_email_lower ON users (lower(email));
```

The same applies to `WHERE created_at::date = $1` — cast the parameter instead:
`WHERE created_at >= $1 AND created_at < $1 + interval '1 day'`.

**Replace `OFFSET` with keyset pagination.** `OFFSET 100000` walks and discards 100,000 rows.

**Turn `IN (subquery)` into a join or `EXISTS`** when the subquery is large, and prefer
`NOT EXISTS` over `NOT IN` — it is null-safe and usually plans better.

**Batch the N+1.** The most common "slow query" is a fast query run 200 times. One `WHERE id IN
(…)` replaces it; see [Chapter ?? — Node.js Performance](#ch-nodejs-performance).

**Find the unused indexes and drop them.** `pg_stat_user_indexes` reports `idx_scan` per index; a
non-unique index with zero scans after a full business cycle is pure write cost.

## Common Mistakes

**❌ Indexing every column separately.** Three single-column indexes rarely beat one composite
index in the right order, and they cost three times as much to maintain.

**❌ Indexing a low-cardinality column alone.** An index on `status` with four values is worse than
a scan for the common value. It becomes useful as the *second* column of a composite index, or as a
partial index on the rare value.

**❌ Trusting `EXPLAIN` without `ANALYZE`.** Estimates are frequently wrong, and the wrongness is
the diagnosis.

**❌ Benchmarking on a small development database.** A `Seq Scan` on 500 rows is the correct plan.
Every index decision needs production-shaped data volumes.

## 🔑 Key Takeaways

- An index is a sorted copy, so it answers questions about a prefix of its sort key and nothing else.
- In a composite index, equality columns come first and the range or sort column last.
- Partial and covering indexes are the cheap wins: smaller to maintain, and an index-only scan skips the table.
- In `EXPLAIN ANALYZE`, a large gap between estimated and actual rows is the real finding.
- Every index is a tax on every write, so unused indexes should be dropped.

## Interview Questions

**Q: You have an index on `(user_id, status, created_at)`. Which queries use it?**

Anything constraining a leftmost prefix: `user_id` alone, `user_id` with `status`, or all three —
and with all three the `ORDER BY created_at` is free because the index is already in that order. A
query on `status` alone cannot use it, and `user_id` with a range on `created_at` uses only the
leading column, then filters.

**Q: A query has an index and is still slow. What do you check?**

The plan first. Common causes are a function or cast on the indexed column making it unusable,
stale statistics producing a bad row estimate and a nested loop, a low-selectivity index the
planner correctly ignores, or a large `Rows Removed by Filter` count meaning the index is missing a
column the predicate needs.

**Q: Why can adding an index make the system slower?**

Because every write maintains it. On a write-heavy table each additional index adds insert and
update cost, more WAL, and more storage to keep in memory — which evicts the indexes that were
earning their place. There is also planner cost: more candidate paths, and more chances to pick a
bad one.

## What to Read Next

- [Chapter ?? — SQL Fundamentals](#ch-sql-fundamentals) — the queries these indexes serve
- [Chapter ?? — Database Design](#ch-database-design) — where constraints create indexes for free
- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — finding the slow query from the application side
