---
title: SQL Fundamentals and Schema Design
part: 5
chapter: 12
slug: sql-fundamentals
level: intermediate
reading_time: 13
updated: 2026-09-24
tags: [sql, joins, cte, window-functions, schema, normalisation, constraints, postgres]
in_book: true
---

# SQL Fundamentals and Schema Design {#ch-sql-fundamentals}

> Write the query the interviewer asks for, explain what the database does with it, and design a schema that refuses bad data.

**In this chapter:** the clause evaluation order · joins, grouping and window functions · CTEs and the `NOT IN` trap · normalisation and when to break it · types and constraints

## 💡 The Core Idea

SQL is declarative. You describe the result, and the planner decides how to get it. Two queries that
return the same rows can differ in cost by a factor of a thousand. So "can you write this query" is only
half of what an interviewer tests.

The schema matters even more. Code gets rewritten, but the data survives, with every bad decision stored
in it. The goal is to make invalid states **impossible to store**. If an order cannot exist without a
customer, that is a foreign key, not a check in a service. Application validation gives a better error message. The database guarantees the rule,
because every writer goes through it.

## How It Works

### The evaluation order

**The logical order of a query, which is not the order you write it in:**

```text
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

Most SQL surprises make sense against this list. You cannot use a `SELECT` alias in `WHERE`, because
`WHERE` runs first. You can use it in `ORDER BY`, because that runs later. `WHERE` filters rows. `HAVING`
filters groups, because groups do not exist yet when `WHERE` runs. So `HAVING` is the only clause that
can test an aggregate such as `COUNT(o.id) >= 3`.

Every column in `SELECT` must be in `GROUP BY` or wrapped in an aggregate. `COUNT(*)` counts rows, but
`COUNT(column)` skips `NULL`s, so a user with no orders gets `0`, not `1`. `SUM` over an empty set is
`NULL`, not zero, so wrap it in `COALESCE`.

### Joins

`INNER` keeps only rows that match on both sides. `LEFT` keeps every left row, with `NULL` on the right
where nothing matches: "every user, and their orders if any". The classic trap is a filter on the outer
table placed in `WHERE` instead of `ON`.

**A `LEFT JOIN` that quietly becomes an inner join:**

```sql
-- ❌ Unmatched users have NULL status, fail the WHERE test, and vanish
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';

-- ✅ The condition belongs to the join, so unmatched users survive
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';
```

> ⚠️ A join multiplies rows. Join a user to their orders and their addresses, and you get
> orders × addresses rows per user. Any `SUM` over that counts twice. Aggregate each side in a
> subquery first, or use `COUNT(DISTINCT …)`.

### CTEs and subqueries

A **CTE** (`WITH …`) is a named subquery. It mostly buys readability. Before Postgres 12, a CTE always ran
in full first, so an outer filter could not reach inside it. The recursive form walks a hierarchy.

**Every descendant of one category:**

```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 1 AS depth
  FROM categories WHERE id = $1          -- anchor row
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.depth + 1
  FROM categories c JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10                     -- guard: a cycle would otherwise run forever
)
SELECT * FROM tree;
```

**`NOT IN` against `NOT EXISTS`:**

```sql
-- ❌ One NULL in orders.user_id makes every comparison unknown: zero rows
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders);

-- ✅ Null-safe, and usually plans better
SELECT * FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

### Window functions

A window function computes across a set of rows **without collapsing them**. That is the difference from
`GROUP BY`, and it answers most "top N per group" questions.

**The three most recent orders per user:**

```sql
SELECT * FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders o
) ranked
WHERE rn <= 3;
```

The wrapper is needed because window functions run after `WHERE`. `RANK` and `DENSE_RANK` give ties the
same number. `LAG` and `LEAD` read the previous or next row, for month-on-month change.

### Normalisation

| Form    | Rule                                                        | Violation looks like                 |
| ------- | ----------------------------------------------------------- | ------------------------------------ |
| **1NF** | Every column holds one atomic value                         | `tags` stored as `"a,b,c"`           |
| **2NF** | No non-key column depends on part of a composite key        | `product_name` in `order_items`      |
| **3NF** | No non-key column depends on another non-key column         | `city` and `postcode` both in `users` |

Third normal form is the default, because duplication drifts. If a product name lives in `order_items`,
renaming the product means updating a million rows. Any row you miss is now wrong. One fact, one place.

**Orders and their items, normalised:**

```sql
CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers(id),
  status      text   NOT NULL CHECK (status IN ('pending', 'paid', 'shipped')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id   bigint  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint  NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,   -- copied on purpose: an invoice must not change with the price
  PRIMARY KEY (order_id, product_id)
);
```

That `unit_price` copy is the key nuance. The price *at the time of the order* is a different fact from
today's price. Point-in-time data is always copied, and that is not a violation.

`ON DELETE` is a design choice: `CASCADE` for data the parent owns, `RESTRICT` when the reference proves
the parent is in use. `CASCADE` everywhere means one bad delete removes half the database.

### Types and constraints

| Need                          | Use                    | Not                                                  |
| ----------------------------- | ---------------------- | ---------------------------------------------------- |
| Money                         | `numeric(12,2)`        | `float` — 0.1 + 0.2 is not 0.3                        |
| Timestamp                     | `timestamptz`          | `timestamp` — no zone means no meaning                |
| Identifier                    | `bigint` / `bigserial` | `int` — 2.1 billion arrives sooner than you think     |
| Identifier made by clients    | `uuid` v7              | `uuid` v4 as a clustered key — random inserts fragment the index |

> ⚠️ `timestamp without time zone` stores a wall-clock reading with no zone. Servers in two regions
> disagree about what it means, and daylight-saving changes become unrecoverable. Use `timestamptz`.

`NOT NULL`, `UNIQUE`, `FOREIGN KEY` and `CHECK` cover most rules. The one worth naming in an interview is
`EXCLUDE`. In application code, "no overlap" needs a read and a lock, and any gap between them is a race.
The constraint is correct under any concurrency.

**No two overlapping subscriptions for one user:**

```sql
ALTER TABLE subscriptions
  ADD CONSTRAINT valid_period CHECK (ends_at > starts_at),
  ADD CONSTRAINT no_overlap EXCLUDE USING gist (
    user_id WITH =, tstzrange(starts_at, ends_at) WITH &&
  );
```

## When to Use It

Normalise first. Denormalise only after a measurement, and name who keeps the copy correct.

| Situation                                      | Choose                         | Cost you accept                                   |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| `COUNT(*)` on every read of a hot post         | A counter column               | Update it in the same transaction, or it drifts   |
| A hot list needs the author's name             | A copied display field         | Stale after a rename, unless you reconcile it      |
| A dashboard aggregate is too slow              | A materialised view            | Refresh lag, and the cost of each refresh          |
| Attributes differ per product category         | A `jsonb` column with a GIN index | No foreign keys, weaker checks                  |

## Common Mistakes

**❌ Building SQL by string concatenation.** ✅ Always pass parameters — see
[Chapter ?? — Input Validation and Injection](#ch-backend-input-validation).

**❌ `OFFSET` for deep pagination.** The database still walks every skipped row. ✅ Use keyset pagination,
as in [Chapter ?? — REST Best Practices and Versioning](#ch-rest-best-practices).

**❌ A natural key, such as an email, as the primary key.** It changes one day, and every foreign key must
change with it. ✅ Use a surrogate key, plus a `UNIQUE` constraint on the natural one.

## 🔑 Key Takeaways

- The clause evaluation order, with `WHERE` before `GROUP BY` before `SELECT`, explains most SQL surprises.
- A filter on the outer table of a `LEFT JOIN` belongs in `ON`, or the join silently becomes an inner one.
- `NOT IN` over a nullable column returns nothing, so `NOT EXISTS` is the safe default.
- Normalise to third normal form, and denormalise only after a measurement, with an owner for the drift.
- Rules belong in the schema as types and constraints, because the database is the one thing every writer passes through.

## Interview Questions

**Q: A `LEFT JOIN` is returning only matched rows. Why?**

A condition on the right-hand table is in `WHERE`. Unmatched rows have `NULL` there, so the comparison is
unknown and they are filtered out. That turns the outer join into an inner one. Move the condition into
the `ON` clause.

**Q: How do you get the top three rows per group?**

Use `ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col DESC)` in a subquery, then filter on the
rank outside it. The wrapper is needed because window functions run after `WHERE`. In Postgres,
`DISTINCT ON` is shorter when you want exactly one row per group.

**Q: When would you denormalise?**

Only after measuring that a join or aggregate is the bottleneck, and that an index cannot fix it. A comment
counter is a fair trade when reads far outnumber writes. It creates an obligation, though: update it in the
same transaction as the comment, and run a job that reconciles it.

**Q: How do you stop two overlapping bookings for the same room?**

Use an `EXCLUDE USING gist` constraint on the room id and the time range, with the overlap operator. In
application code you must read existing bookings and lock, and any gap between read and write is a race.
Under concurrency, the constraint is the only correct answer.

## What to Read Next

- [Chapter ?? — Indexes, Query Plans, ORMs and Migrations](#ch-indexes) — why the query you just wrote is slow, and how to change a live schema
- [Chapter ?? — Transactions and Concurrency](#ch-sql-transactions) — what happens when two of these queries run at once
