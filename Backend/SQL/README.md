---
title: Part V — SQL and Relational Data
part: 5
chapter: 0
slug: part-sql-and-relational-data
level: intermediate
reading_time: 2
updated: 2026-09-01
tags: [sql, postgres, indexes, transactions, migrations]
in_book: true
---

# Part V — SQL and Relational Data

The scope here is set by one question: what does a frontend-heavy engineer need in order to design a
schema, read a query plan, and change a live database without downtime? That is a much smaller set
than a database course, and it is the set that comes up.

Postgres is the worked example throughout. The concepts transfer; the syntax mostly does too.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [SQL Fundamentals](./01-fundamentals.md) | Can you write the query and say what the engine does with it? |
| 02 | [Database Design](./02-database-design.md) | How do you make invalid data impossible to store? |
| 03 | [Indexes and Query Plans](./03-indexes-and-query-plans.md) | Which index does this `WHERE` clause actually use? |
| 04 | [Transactions and Concurrency](./04-transactions.md) | What stops two requests overwriting each other? |
| 05 | [ORMs and Migrations](./05-orms-and-migrations.md) | How do you change a schema with traffic on it? |

## What Interviewers Probe For

The senior signal is **knows why the query is slow.** In practice:

- **Clause evaluation order.** Why a `SELECT` alias works in `ORDER BY` and not in `WHERE`, and why
  a filter on the outer table of a `LEFT JOIN` belongs in `ON`.
- **Composite index order.** Equality, then sort, then range. Getting this wrong is the most common
  real cause of a slow query that "has an index".
- **Isolation levels.** That `READ COMMITTED` permits lost updates, and what you do about it.
- **Zero-downtime migration.** Expand, backfill, deploy, contract — and which DDL statements take a
  lock that stops the service.
- **`EXPLAIN ANALYZE`.** A large gap between estimated and actual rows is the finding, not the
  execution time.

## Reading Order

01 and 02 in order. 03 next — it is the chapter that changes how you write queries. 04 and 05 when
concurrency or a schema change is in front of you.

**Interview sprint:** 03 → 04 → 02.
