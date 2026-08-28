---
title: Part VI — Databases in System Design
part: 6
chapter: 0
slug: system-design-database-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [system-design, sharding, replication, consistency, cap]
in_book: true
---

# Part VI — Databases in System Design

`Backend/SQL/` is about one database, on one machine, doing what you asked. This section is about what
happens when there is more than one machine, and every guarantee you took for granted becomes a
choice you have to defend. Sharding, replication, isolation and consistency are the four levers, and
almost every design-round follow-up question pulls one of them.

The distinction is worth holding onto, because candidates conflate the two and answer a distributed
question with a single-node answer. "Add an index" solves a slow query. It does nothing about a read
replica that is four seconds behind, which is the failure your users will report.

## Chapters

| #  | Chapter                                                    | What it answers                                                     |
| -- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [SQL Database Design](./01-sql-design.md)                   | How do you model so the queries you need stay cheap?               |
| 02 | [NoSQL Database Design](./02-nosql-design.md)               | Which NoSQL family matches this access pattern?                    |
| 03 | [Sharding](./03-sharding.md)                                | Which shard key will you not regret in a year?                     |
| 04 | [Replication](./04-replication.md)                          | What does replication lag do to your reads?                        |
| 05 | [Database Indexing](./05-indexing.md)                       | Which index structure answers which query, at what write cost?     |
| 06 | [Database Transactions](./06-transactions.md)               | Which anomaly does this isolation level still allow?               |
| 07 | [CAP in Practice](./07-cap-theorem.md)                      | Where does a real database sit on the CP/AP map?                   |
| 08 | [Consistency Patterns](./08-consistency.md)                 | What is the weakest guarantee this feature can live with?          |
| 09 | [Data Modelling](./09-data-modeling.md)                     | How do you shape data around the reads?                            |
| 10 | [Database Query Optimisation](./10-query-optimization.md)   | Why is this query slow, rather than which index to guess at?       |

## What Interviewers Probe For

The senior signal for this part is **drives the round — clarifies requirements, states assumptions,
defends trade-offs.** Databases are where the trade-offs get most concrete:

- **Can you pick a shard key and defend it?** The interviewer is looking for you to name the failure
  mode before they do: hot partitions, and the cross-shard query the key makes expensive. A key with
  no downside means you have not thought about it hard enough.
- **Do you understand what CAP actually says?** It is a statement about behaviour during a network
  partition, not a permanent personality trait of a database. Most systems are CP or AP only while
  partitioned, and treating it as a three-way menu is the common mistake.
- **Can you name a consistency level precisely?** "Eventually consistent" covers a wide range.
  Read-your-writes, monotonic reads and causal consistency are different promises, and a feature
  usually needs one specific one.
- **Do you know what replication lag breaks?** The classic: user posts a comment, gets routed to a
  replica, and their own comment is missing. Being able to describe that scenario unprompted is a
  strong signal.
- **SQL or NoSQL — on what grounds?** Access pattern, consistency requirement, and how much the shape
  of the data will change. Never on scale alone; relational databases scale further than most
  candidates assume.

## Reading Order

01 and 02 first — the modelling decisions everything else builds on. Then 03 and 04, which are the
two mechanics of going distributed. 06 to 08 are the guarantee chapters and read best in sequence.
05, 09 and 10 are practical and can be read when a design round makes them relevant.

**Interview sprint:** 03 → 04 → 07 → 08. Sharding, replication, CAP and consistency are the four that
a distributed design round pulls on hardest.

> ⚠️ Indexing, transactions and query optimisation appear here **and** in `Backend/SQL/`. The
> `Backend/` chapters are the single-node engineering view; these are the distributed design view.
> Improvement #22 confirms which pairs are genuine duplicates.
