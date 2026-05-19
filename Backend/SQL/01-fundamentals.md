# SQL Fundamentals

## 💡 **What Is SQL**

SQL (Structured Query Language) is the standard language for talking to relational databases. Every backend role expects fluency with the basics, plus comfort with JOINs, aggregations, subqueries, CTEs, and window functions.

**What we cover here:**

- `SELECT`, `INSERT`, `UPDATE`, `DELETE` (quickly)
- JOINs and their semantics
- `GROUP BY` and `HAVING`
- Subqueries vs CTEs
- Window functions
- `EXISTS` vs `IN`

---

## 💡 **CRUD Basics**

**SELECT — read rows:**

```sql
SELECT id, name, email
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;  -- page 3 of 20
```

> Always list columns explicitly. `SELECT *` blocks index-only scans, breaks when the schema changes, and ships unused bytes over the wire.

**INSERT — add rows:**

```sql
-- Batch insert: one round-trip, one transaction
INSERT INTO users (name, email) VALUES
  ('Ada', 'ada@x.com'),
  ('Bo',  'bo@x.com');

-- Upsert (PostgreSQL)
INSERT INTO users (email, name) VALUES ('ada@x.com', 'Ada')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
```

**UPDATE and DELETE — always with a WHERE:**

```sql
UPDATE products SET price = price * 1.1 WHERE category = 'books';
DELETE FROM sessions WHERE expires_at < NOW();
```

`DELETE` vs `TRUNCATE`: `DELETE` is row-by-row, fires triggers, and is rollback-safe inside a transaction. `TRUNCATE` is a DDL operation that drops and recreates storage — much faster but resets identity columns and (in MySQL) cannot be rolled back.

---

## 💡 **JOINs**

JOINs combine rows from multiple tables on a matching column.

| JOIN              | What you get                                   | Use when                              |
| ----------------- | ---------------------------------------------- | ------------------------------------- |
| `INNER JOIN`      | Only rows that match on both sides             | You need both records to exist        |
| `LEFT JOIN`       | All rows from the left, matches from the right | "All users, with or without orders"   |
| `RIGHT JOIN`      | Mirror of LEFT (rarely used)                   | Almost never — flip the tables        |
| `FULL OUTER JOIN` | Everything from both sides                     | Data reconciliation between systems   |
| `CROSS JOIN`      | Cartesian product                              | Generating combinations, calendars    |

**Examples:**

```sql
-- INNER: users who placed orders
SELECT u.name, o.total
FROM users u
JOIN orders o ON o.user_id = u.id;

-- LEFT: every user, with their order count (0 if none)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;

-- Anti-join: users with NO orders
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
```

⚠️ **Gotcha:** filtering a `LEFT JOIN`ed table in `WHERE` (e.g. `WHERE o.status = 'paid'`) silently turns it into an `INNER JOIN`. Put that condition on the `ON` clause if you want to keep unmatched rows.

```sql
-- ✅ keeps users with no paid order
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';
```

---

## 💡 **GROUP BY and HAVING**

`GROUP BY` collapses rows by column value; aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) summarize each group.

**Logical execution order:**

```
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

| Clause   | Filters         | Sees aggregates? |
| -------- | --------------- | ---------------- |
| `WHERE`  | Individual rows | ❌               |
| `HAVING` | Groups          | ✅               |

```sql
SELECT country, COUNT(*) AS user_count, AVG(age) AS avg_age
FROM users
WHERE status = 'active'        -- filter rows first
GROUP BY country
HAVING COUNT(*) > 100          -- filter groups
ORDER BY user_count DESC;
```

⚠️ Every non-aggregated column in `SELECT` must appear in `GROUP BY` (Postgres enforces this; MySQL with `ONLY_FULL_GROUP_BY` does too).

**Aggregate quirks with NULL:**

- `COUNT(*)` counts rows, including NULLs.
- `COUNT(col)`, `SUM`, `AVG`, etc. ignore NULLs.
- `AVG` ignores NULL — it does not divide by the total row count.

---

## 💡 **Subqueries vs CTEs**

**Subquery** — a query nested inside another:

```sql
SELECT name
FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);
```

**CTE (Common Table Expression)** — a named, top-of-query subquery:

```sql
WITH high_value AS (
  SELECT user_id, SUM(total) AS spend
  FROM orders
  GROUP BY user_id
  HAVING SUM(total) > 10000
)
SELECT u.name, h.spend
FROM users u
JOIN high_value h ON h.user_id = u.id
ORDER BY h.spend DESC;
```

**When to reach for a CTE:**

- ✅ Query has 2+ levels of nesting and is hard to read
- ✅ You reference the same subquery more than once
- ✅ You need recursion (org charts, category trees, graph traversal)

**Recursive CTE — hierarchy traversal:**

```sql
WITH RECURSIVE descendants AS (
  SELECT id, name, manager_id, 0 AS depth
  FROM employees
  WHERE id = $1                       -- start node

  UNION ALL

  SELECT e.id, e.name, e.manager_id, d.depth + 1
  FROM employees e
  JOIN descendants d ON e.manager_id = d.id
)
SELECT * FROM descendants;
```

> Pre-Postgres 12, CTEs were an optimization fence (always materialized). Modern Postgres inlines them when safe, so performance is usually identical to a subquery. Prefer CTEs for readability.

---

## 💡 **EXISTS vs IN**

Both check membership but have different semantics around NULL and different performance profiles.

```sql
-- EXISTS: stops at first match, correlated to outer row
SELECT u.name
FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- IN: builds the full list then probes
SELECT name FROM users
WHERE id IN (SELECT user_id FROM orders);
```

| Pattern  | Best for                              | NULL trap                                 |
| -------- | ------------------------------------- | ----------------------------------------- |
| `EXISTS` | Large subqueries, anti-joins          | Safe                                      |
| `IN`     | Small, static lists (`IN ('US','CA')`)| `NOT IN` returns no rows if list has NULL |

⚠️ `NOT IN (SELECT col FROM ...)` where `col` can be NULL returns **zero rows** — NULL propagates through the comparison. Use `NOT EXISTS` for anti-joins.

---

## 💡 **Window Functions**

Window functions compute across a set of rows **without collapsing** them. Each input row keeps its identity but gains an aggregate-style column.

| Function       | Use case                                          |
| -------------- | ------------------------------------------------- |
| `ROW_NUMBER()` | Pagination, dedup, "top N per group"              |
| `RANK()`       | Ranking with gaps for ties (1, 2, 2, 4)           |
| `DENSE_RANK()` | Ranking without gaps (1, 2, 2, 3)                 |
| `LAG / LEAD`   | Compare to previous / next row (day-over-day)     |
| `SUM() OVER`   | Running totals, cumulative percentages            |
| `AVG() OVER`   | Moving averages (with `ROWS BETWEEN`)             |

**Top 3 products per category:**

```sql
WITH ranked AS (
  SELECT p.*,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn
  FROM products p
)
SELECT * FROM ranked WHERE rn <= 3;
```

**Day-over-day change:**

```sql
SELECT
  day,
  revenue,
  revenue - LAG(revenue) OVER (ORDER BY day) AS delta
FROM daily_sales;
```

**7-day moving average:**

```sql
SELECT day, revenue,
  AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
FROM daily_sales;
```

> If you find yourself joining a table to a `GROUP BY` of itself, you usually want a window function instead.

---

## 📚 **Interview Q&A**

**Q1. What's the difference between `WHERE` and `HAVING`?**
`WHERE` filters rows before grouping and cannot see aggregates. `HAVING` filters groups after aggregation and can reference aggregates like `COUNT(*) > 100`. Use `WHERE` whenever possible — it runs earlier and benefits from indexes.

**Q2. When would you use a CTE over a subquery?**
Three cases: (1) the same subquery is referenced multiple times, (2) the query has multiple levels of nesting and is hard to follow, (3) you need recursion. In modern Postgres, performance is equivalent for non-recursive CTEs, so the choice is mainly about readability.

**Q3. Why can `NOT IN` return zero rows unexpectedly?**
SQL three-valued logic. If the inner query returns even one NULL, `value NOT IN (..., NULL, ...)` evaluates to `UNKNOWN`, which filters the row out. Use `NOT EXISTS` for anti-joins — it handles NULL correctly.

---

## ✅ **Best Practices**

- ✅ List columns explicitly; never `SELECT *` in app code.
- ✅ Always `WHERE` on `UPDATE` and `DELETE` — wrap in a transaction during dev.
- ✅ Use parameterized queries — never string-concatenate user input.
- ✅ Prefer `EXISTS` / `NOT EXISTS` over `IN` / `NOT IN` for subqueries.
- ✅ Push filtering into the database, not the application layer.
- ❌ Don't wrap indexed columns in functions in `WHERE` (e.g. `UPPER(email) =`) — it kills the index.
- ❌ Don't filter `LEFT JOIN`ed tables in `WHERE` if you want to keep unmatched rows.

---

[← Back to Backend](../README.md) | [Next: Database Design →](./02-database-design.md)
