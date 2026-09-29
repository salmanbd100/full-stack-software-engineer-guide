---
title: Part V — NoSQL and Caching
part: 5
chapter: 15
slug: backend-nosql-index
level: intermediate
reading_time: 2
updated: 2026-09-24
tags: [nosql, mongodb, redis, schema, caching]
in_book: true
---

# Part V — NoSQL and Caching

One chapter on two stores, chosen for how often they appear. Many product codebases have MongoDB.
Almost every production service has Redis somewhere.

The chapter compares throughout. A document store is worth knowing for itself. Explaining what it
gives up is also how you show that you understand the relational model.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Choosing a Non-Relational Store: Documents and Redis](#ch-document-databases) | What does the document model buy, which Redis structure fits, and when is Postgres still the answer? |

Aggregation pipelines and shard-key mechanics are left out on purpose. The first is a MongoDB
specialist's skill. The second belongs one level up, to [Chapter ?? — Choosing a Datastore and Replicating It](#ch-choosing-a-datastore)
and [Chapter ?? — Sharding and Transactions at Scale](#ch-sharding), where they are decisions rather than commands.

## What Interviewers Probe For

- **Embed or reference.** The answer must come from the access pattern and the growth bound, not from
  an entity diagram. The 16 MB document limit turns "unbounded" into a hard constraint.
- **What is atomic.** A single document, always. Anything wider needs an explicit transaction, and
  needing them routinely is a modelling signal.
- **Pub/Sub against Streams.** One loses messages by design. The other does not. Choosing the wrong
  one for a job queue is a common mistake.
- **Whether Redis is a system of record.** It is not, and being clear about that matters more than
  knowing its commands.

## Reading Order

One chapter, and it is in the interview sprint. The embed-or-reference judgement and the choice of
Redis structure are the two that come up most.
