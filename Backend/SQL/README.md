---
title: Part V — SQL and Relational Data
part: 5
chapter: 0
slug: part-sql-and-relational-data
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [sql, postgresql, databases, indexes, transactions]
in_book: true
---

# Part V — SQL and Relational Data

Most "slow app" tickets are slow query tickets. This section covers enough relational database work
for a frontend-heavy full stack engineer to design a schema that will not need rescuing, read a query
plan, and know why the index they added did nothing. PostgreSQL is the worked example throughout, but
the reasoning — normalisation, index selectivity, isolation levels — carries to any relational engine.

The line that separates the two halves of this section: chapters 01–04 are what the database
guarantees, and chapters 05–08 are what you do about it in an application.

## Chapters

| #  | Chapter                                                  | What it answers                                                |
| -- | -------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [SQL Fundamentals](./01-fundamentals.md)                 | Which join, and what does the engine do with a `GROUP BY`?      |
| 02 | [Database Design](./02-database-design.md)               | When is normalising the wrong call?                             |
| 03 | [Indexes and Optimization](./03-indexes.md)              | Why did adding an index change nothing?                         |
| 04 | [Transactions and ACID](./04-transactions.md)            | Which isolation level, and what anomaly does it still allow?    |
| 05 | [PostgreSQL](./05-postgresql.md)                         | What does Postgres give you that the standard does not?         |
| 06 | [ORMs](./06-orms.md)                                     | Where does the abstraction stop paying for itself?              |
| 07 | [Migrations and Seeds](./07-migrations.md)               | How do you change a live schema without downtime?               |
| 08 | [Query Optimization](./08-optimization.md)               | The query is slow. What do you read first?                      |

## What Interviewers Probe For

The senior signal here is **designs an API the frontend can actually consume well, and knows why the
query is slow.** In practice that shows up as four questions:

- **Can you read a query plan?** Not optimise one from memory — read one, and say which line is the
  problem. A candidate who reaches for `EXPLAIN ANALYZE` before guessing has answered most of this.
- **Do you know what an index costs?** Every index makes writes slower and takes disk. "Add an index"
  is not an answer until you can say which one, on which columns, in which order, and why.
- **Can you spot an N+1 before it ships?** This is the single most common performance bug in an
  ORM-backed application, and it is invisible in code review unless you are looking for it.
- **Do you understand isolation, not just transactions?** Wrapping something in `BEGIN`/`COMMIT` is
  easy. Knowing that Read Committed still permits a non-repeatable read is the actual question.

## Reading Order

Straight through. Chapters 02 and 03 are the two that most often come up in a design round, and
chapter 08 is the one that most often comes up on the job.

**Interview sprint:** 01 → 03 → 04 → 08. That covers the joins, the index question, the isolation
question and the debugging story, which between them account for most of what gets asked.
