---
title: Part VI — Data at Scale
part: 6
chapter: 13
slug: part-system-design-database
level: advanced
reading_time: 2
updated: 2026-09-24
tags: [system-design, database, sharding, replication, transactions]
in_book: true
---

# Part VI — Data at Scale

The data layer is where most system designs are really decided. The store you choose fixes which
queries are cheap. The shard key fixes what is possible at all. The isolation level fixes what can go
wrong when requests run at the same time. All three are costly to change later, so interviewers spend
much of a round here.

This section is the **distributed** half of the subject. Schema design, indexing, query plans and
day-to-day SQL belong to Part V. This section assumes them and does not repeat them.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Choosing a Datastore and Replicating It](#ch-choosing-a-datastore) | Which family of store, and what can a reader see while the copies disagree? |
| 02 | [Sharding and Transactions at Scale](#ch-sharding) | Which shard key will you not regret, and what breaks across machines? |

## What Interviewers Probe For

- **Do you choose from access patterns?** "Relational because the queries are varied and money is
  involved" is a reason. "NoSQL because it scales" is not.
- **Do you know what replication does not buy?** Replicas are availability, not backups, and they
  return stale data by design.
- **Can you defend a shard key?** Cardinality, whether the common query carries it, whether it is
  immutable, and what happens to the account with ten million followers.
- **Do you reach for a distributed transaction?** The senior answer is to arrange not to need one.

## Reading Order

01 → 02, in order. They are the two ways to spread data: copy it or split it. The second half of 02
shows what concurrent writes do to both.

**Interview sprint:** 02. Shard keys and lost updates are the two questions this section is asked about
most.

> ⚠️ **Schema design, indexing and query optimisation are in Part V**, at implementation depth. CAP and
> consistency patterns are in [Chapter ?? — Reliability, Consistency and CAP](#ch-consistency-and-cap).
> This section is only about data that no longer fits on one machine.
