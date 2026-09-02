---
title: Part VI — Data at Scale
part: 6
chapter: 0
slug: part-system-design-database
level: advanced
reading_time: 2
updated: 2026-09-02
tags: [system-design, database, sharding, replication, transactions]
in_book: true
---

# Part VI — Data at Scale

The data layer is where most system designs are actually decided. Choosing a store fixes what queries
are cheap; choosing a shard key fixes what is possible at all; choosing an isolation level fixes what
can go wrong under concurrency. All three are expensive to change later, which is why interviewers
spend so much of a round here.

This section is the **distributed** half of the subject. Schema design, indexing, query plans and
day-to-day SQL belong to Part V, and this section assumes them rather than repeating them.

## Chapters

| #  | Chapter                                                       | What it answers                                              |
| -- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Choosing a Datastore](./01-choosing-a-datastore.md)          | Which family of store, and what does the choice cost?         |
| 02 | [Replication](./02-replication.md)                            | What can a reader see while the copies disagree?              |
| 03 | [Sharding](./03-sharding.md)                                  | Which shard key will you not regret in a year?                |
| 04 | [Transactions at Scale](./04-transactions-at-scale.md)        | What isolation does this feature need, and what breaks across machines? |

## What Interviewers Probe For

- **Do you choose from access patterns?** "Relational because the queries are varied and money is
  involved" is a reason. "NoSQL because it scales" is not.
- **Do you know what replication does not buy?** Replicas are availability, not backups, and they
  return stale data by design.
- **Can you defend a shard key?** Cardinality, whether the common query carries it, whether it is
  immutable, and what happens to the account with ten million followers.
- **Do you reach for a distributed transaction?** The senior answer is to arrange not to need one.

## Reading Order

01 → 02 → 03 → 04, in order. 01 frames the choice, 02 and 03 are the two axes of distribution — copy
the data or split it — and 04 is what concurrency does to both.

**Interview sprint:** 03 and 04. Shard keys and lost updates are the two questions this section is
asked about most.

> ⚠️ Six chapters left this section at **#31d**. SQL and NoSQL design, indexing, data modelling and
> query optimisation were merged into 01 or handed to Part V, which owns them at implementation depth;
> CAP and consistency patterns merged into `Fundamentals/06-consistency-and-cap.md`. Nothing was
> archived — git history holds the originals and none of their material is missing from the book.
