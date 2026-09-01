---
title: Part V — NoSQL and Caching
part: 5
chapter: 0
slug: backend-nosql-index
level: intermediate
reading_time: 2
updated: 2026-09-01
tags: [nosql, mongodb, redis, schema, aggregation]
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
| 01 | [MongoDB](./01-mongodb.md) | What does the document model buy, and what does it cost? |
| 02 | [Document Schema Design](./02-schema-design.md) | Embed or reference, and how do you tell? |
| 03 | [Indexing and Aggregation](./03-indexing-and-aggregation.md) | Why is this pipeline slow? |
| 04 | [Redis](./04-redis.md) | Which structure, and what happens when the process restarts? |

## What Interviewers Probe For

- **Embed or reference.** The answer must come from the access pattern and the growth bound, not from
  an entity diagram. The 16 MB document limit turns "unbounded" into a hard constraint.
- **What is atomic.** A single document, always. Anything wider needs an explicit transaction, and
  needing them routinely is a modelling signal.
- **The ESR rule.** Equality, sort, range — and what an in-memory sort costs when you get it wrong.
- **Shard key choice.** Why a monotonic key sends every insert to one shard.
- **Pub/Sub against Streams.** One loses messages by design; the other does not. Choosing the wrong
  one for a job queue is a common mistake.
- **Whether Redis is a system of record.** It is not, and being clear about that matters more than
  knowing its commands.

## Reading Order

01 → 02 → 03 in order; each assumes the one before. 04 is independent and can be read first if
caching is the immediate need.

**Interview sprint:** 02 → 04. The embed-or-reference judgement and the Redis structure choice are
the two that come up reliably.
