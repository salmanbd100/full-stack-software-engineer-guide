---
title: Part V — NoSQL and Caching
part: 5
chapter: 0
slug: backend-nosql-index
level: intermediate
reading_time: 2
updated: 2026-09-08
tags: [nosql, mongodb, redis, schema, caching]
in_book: true
---

# Part V — NoSQL and Caching

Two stores, chosen for how often they actually appear: MongoDB, because a great many product
codebases have one, and Redis, because almost every production service has one somewhere.

The framing throughout is comparative. A document store is worth knowing partly for itself and
partly because articulating what it trades away is how you demonstrate that you understand the
relational model too.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Document Databases](./01-document-databases.md) | What does the document model buy, and embed or reference? |
| 02 | [Redis](./02-redis.md) | Which structure, and what happens when the process restarts? |

Aggregation pipelines and shard-key mechanics are deliberately absent. The first is a MongoDB
specialist's skill; the second belongs one level up, to [Chapter ?? — Replication](#ch-replication)
and [Chapter ?? — Sharding](#ch-sharding), where they are decisions rather than commands.

## What Interviewers Probe For

- **Embed or reference.** The answer must come from the access pattern and the growth bound, not from
  an entity diagram. The 16 MB document limit turns "unbounded" into a hard constraint.
- **What is atomic.** A single document, always. Anything wider needs an explicit transaction, and
  needing them routinely is a modelling signal.
- **Pub/Sub against Streams.** One loses messages by design; the other does not. Choosing the wrong
  one for a job queue is a common mistake.
- **Whether Redis is a system of record.** It is not, and being clear about that matters more than
  knowing its commands.

## Reading Order

01 then 02, though the two are independent — start with 02 if caching is the immediate need. Both are
in the interview sprint: the embed-or-reference judgement and the Redis structure choice are the two
that come up reliably.
