---
title: Part V — SQL and Relational Data
part: 5
chapter: 11
slug: part-sql-and-relational-data
level: intermediate
reading_time: 2
updated: 2026-09-24
tags: [sql, postgres, indexes, transactions, migrations]
in_book: true
---

# Part V — SQL and Relational Data

The scope here is set by one question: what does a frontend-heavy engineer need to design a
schema, read a query plan, and change a live database without downtime? That is a much smaller set
than a database course, and it is the set that comes up.

Postgres is the worked example throughout. The concepts transfer; the syntax mostly does too.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [SQL Fundamentals and Schema Design](#ch-sql-fundamentals) | Can you write the query, and make invalid data impossible to store? |
| 02 | [Indexes, Query Plans, ORMs and Migrations](#ch-indexes) | Which index does this `WHERE` clause use, and how do you change a schema with traffic on it? |
| 03 | [Transactions and Concurrency](#ch-sql-transactions) | What stops two requests overwriting each other? |

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

01 first. 02 next — it is the chapter that changes how you write queries. 03 when concurrency is in
front of you.

**Interview sprint:** 02 → 03 → 01.
