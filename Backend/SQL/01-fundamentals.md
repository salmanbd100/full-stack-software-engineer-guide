---
title: SQL Fundamentals
part: 5
chapter: 0
slug: sql-fundamentals
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [sql, joins, cte, window-functions, postgres]
in_book: true
---

# SQL Fundamentals {#ch-sql-fundamentals}

> Write the query the interviewer asks for, and explain what the database does with it.

**In this chapter:** the clause evaluation order · joins that do what you meant · grouping and filtering groups · CTEs against subqueries · window functions

## 💡 The Core Idea

SQL is declarative: you describe the result you want, and the planner decides how to get it. That
is why two queries returning identical rows can differ by a factor of a thousand in cost, and why
"can you write this query" is only half of what an interviewer is testing.

The single most useful thing to hold in your head is the **evaluation order**, which is not the
order you write the clauses in:

```text
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

Almost every SQL confusion resolves against that list. You cannot use a `SELECT` alias in
`WHERE`, because `WHERE` runs first. You can use it in `ORDER BY`, because that runs later.
`WHERE` filters rows; `HAVING` filters groups, because groups do not exist yet when `WHERE` runs.

## Joins

```sql
-- INNER: rows that match on both sides
SELECT u.name, o.total
FROM users u
JOIN orders o ON o.user_id = u.id;

-- LEFT: every user, with NULLs where there is no order
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

| Join | Keeps | Reach for it when |
| ---- | ----- | ----------------- |
| `INNER` | Only matching rows on both sides | The relationship is required |
| `LEFT` | All left rows, `NULL` on the right | "Every user, and their orders if any" |
| `RIGHT` | All right rows | Rare — flip the tables and use `LEFT` |
| `FULL` | Everything from both | Reconciling two sources |
| `CROSS` | Every combination | Generating a date × product grid |

The classic trap is a filter on the outer table placed in `WHERE` instead of `ON`:

```sql
-- ❌ Silently becomes an INNER JOIN: the NULL rows fail the WHERE test
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';

-- ✅ The condition belongs to the join, so unmatched users survive
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';
```

> ⚠️ A join multiplies rows. Joining a user to their orders and their addresses gives
> orders × addresses rows per user, and any `SUM` over that double-counts. Aggregate each side in
> a subquery first, or use `COUNT(DISTINCT …)`.

## Grouping

Every column in `SELECT` must either be in `GROUP BY` or wrapped in an aggregate. Postgres
enforces this; MySQL historically did not, and silently returned an arbitrary row.

```sql
SELECT u.id, u.name, COUNT(o.id) AS order_count, COALESCE(SUM(o.total), 0) AS lifetime_value
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
WHERE u.created_at >= now() - interval '1 year'   -- filters rows, before grouping
GROUP BY u.id, u.name
HAVING COUNT(o.id) >= 3                            -- filters groups, after
ORDER BY lifetime_value DESC
LIMIT 20;
```

Two details worth knowing cold. `COUNT(*)` counts rows; `COUNT(column)` skips `NULL`s — which is
why the `LEFT JOIN` above gives `0` rather than `1` for a user with no orders. And `SUM` over an
empty set is `NULL`, not zero, so wrap it in `COALESCE`.

## CTEs and Subqueries

A **CTE** (`WITH …`) is a named subquery. Its value is readability, and in a recursive form, doing
something you otherwise cannot.

```sql
WITH monthly AS (
  SELECT date_trunc('month', created_at) AS month, SUM(total) AS revenue
  FROM orders WHERE status = 'paid'
  GROUP BY 1
)
SELECT month, revenue,
       revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM monthly
ORDER BY month;
```

> ⚠️ Before Postgres 12 a CTE was an **optimisation fence** — always materialised, never inlined,
> which turned readable queries into slow ones. From 12 onward, a CTE referenced once is inlined
> unless you write `MATERIALIZED`. Know which version you are on before blaming the CTE.

**Recursive CTEs** walk a hierarchy — the standard answer to "find all descendants of this
category":

```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 1 AS depth
  FROM categories WHERE id = $1          -- anchor
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.depth + 1
  FROM categories c JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10                     -- guard: a cycle otherwise runs forever
)
SELECT * FROM tree;
```

### `EXISTS` against `IN`

```sql
-- ✅ EXISTS short-circuits on the first match and handles NULLs correctly
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- ⚠️ NOT IN returns zero rows if the subquery yields a single NULL
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders); -- user_id nullable → empty
```

`NOT IN` with a nullable column is the trap. `NULL` makes the comparison unknown, so nothing
qualifies. Use `NOT EXISTS`, which is null-safe and usually plans better.

## Window Functions

A window function computes across a set of rows **without collapsing them** — the difference from
`GROUP BY`, and the answer to most "top N per group" questions.

```sql
-- The three most recent orders per user, keeping every column
SELECT * FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders o
) ranked
WHERE rn <= 3;
```

| Function | Gives |
| -------- | ----- |
| `ROW_NUMBER()` | 1, 2, 3 — no ties, arbitrary tie-break |
| `RANK()` | 1, 2, 2, 4 — ties share, then a gap |
| `DENSE_RANK()` | 1, 2, 2, 3 — ties share, no gap |
| `LAG` / `LEAD` | The previous or next row's value — period-over-period change |
| `SUM(x) OVER (ORDER BY …)` | A running total |

The window function is evaluated after `WHERE` and `GROUP BY` but before `ORDER BY`, which is why
filtering on `rn` needs the subquery wrapper above.

## Common Mistakes

**❌ `SELECT *` in application code.** A new column silently widens every response, an ORM maps
fields that no longer exist, and a covering index stops covering. Name the columns.

**❌ Building SQL by string concatenation.** Always parameterise — see
[Chapter ?? — Input Validation and Injection](#ch-backend-input-validation).

**❌ `OFFSET` for deep pagination.** The database still walks the skipped rows. Use keyset
pagination, as in [Chapter ?? — REST API Best Practices](#ch-rest-best-practices).

**❌ Comparing a `timestamptz` to a naked string in application queries.** Pass a real timestamp
parameter; implicit casts can disable an index on that column.

## 🔑 Key Takeaways

- Clause evaluation order — `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY` — explains most SQL surprises.
- A filter on the outer table of a `LEFT JOIN` belongs in `ON`, not `WHERE`, or the join becomes inner.
- `COUNT(*)` counts rows and `COUNT(col)` ignores `NULL`; `SUM` over nothing is `NULL`.
- `NOT IN` over a nullable column returns nothing; `NOT EXISTS` is the null-safe form.
- Window functions rank and compare without collapsing rows, which is how you get top N per group.

## Interview Questions

**Q: What is the difference between `WHERE` and `HAVING`?**

`WHERE` filters individual rows before grouping; `HAVING` filters the groups after aggregation, so
it is the only clause that can reference an aggregate. Putting a non-aggregate condition in
`HAVING` still works but is slower, because you grouped rows you were going to discard.

**Q: A `LEFT JOIN` is returning only matched rows. Why?**

Because a condition on the right-hand table is in `WHERE`. Unmatched rows have `NULL` there, the
comparison is unknown, and they are filtered out — turning the outer join into an inner one. Move
the condition into the `ON` clause.

**Q: How do you get the top three rows per group?**

A window function: `ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col DESC)` in a
subquery, then filter on the rank in the outer query. The wrapper is needed because window
functions are evaluated after `WHERE`. `DISTINCT ON` is a shorter Postgres-only option when you
want exactly one row per group.

**Q: When is a CTE the wrong choice?**

When you need the planner to push a filter into it and your engine materialises it — the CTE becomes
an optimisation fence, executing in full before the outer filter applies. On Postgres 12 and later a
single-use CTE is inlined by default, so the concern is largely historical, but on an older engine a
plain subquery or a lateral join can be dramatically faster.

## What to Read Next

- [Chapter ?? — Indexes and Query Plans](#ch-indexes) — why the query you just wrote is slow
- [Chapter ?? — Database Design](#ch-database-design) — the schema these queries run against
- [Chapter ?? — Transactions and Concurrency](#ch-sql-transactions) — what happens when two of these run at once
