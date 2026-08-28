---
title: Part V — NoSQL
part: 5
chapter: 0
slug: backend-nosql-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [nosql, mongodb, redis, aggregation, mongoose]
in_book: true
---

# Part V — NoSQL

Two databases, chosen because they are the two a frontend-heavy full stack engineer actually meets:
MongoDB, which is where the document model shows up in practice, and Redis, which is where almost
every cache, session store, rate limiter and queue eventually lands.

The framing that matters is that "schemaless" is a claim about the database, not about your data.
Your documents have a shape; the only question is whether it is written down and enforced somewhere.
Deciding what to embed and what to reference **is** your schema design, and getting it wrong is
expensive in exactly the same way as getting a relational schema wrong.

## Chapters

| #  | Chapter                                                    | What it answers                                                  |
| -- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [MongoDB Fundamentals](./01-mongodb.md)                    | What does a document database actually guarantee you?            |
| 02 | [Document Design Patterns](./02-design-patterns.md)        | What do you embed, and what do you reference?                    |
| 03 | [Aggregation Pipeline](./03-aggregation.md)                | How do you push work into the database instead of looping?       |
| 04 | [MongoDB Indexing](./04-indexing.md)                       | Will the planner actually use this index — and can you prove it? |
| 05 | [Mongoose](./05-mongoose.md)                               | Where does the ODM stop paying for itself?                       |
| 06 | [Redis](./06-redis.md)                                     | Which data structure, and what is its expiry?                    |

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow.** For document stores the "why is it slow" answer is usually modelling:

- **Embed or reference?** The rule is about access pattern and growth: embed what you always read
  together and that is bounded, reference what grows without limit or is read on its own. A candidate
  who answers by preference has not designed one.
- **Do you know MongoDB's actual consistency guarantees?** Single-document operations are atomic;
  multi-document transactions exist but cost. Read and write concerns are the knobs, and knowing they
  exist is the question.
- **Can you make an index prove itself?** `explain()` and the `IXSCAN` versus `COLLSCAN` distinction.
  Compound index prefix order matters and is the most common mistake in this area.
- **What is Redis for, here?** Cache, session store, rate limiter, lock, queue — each with a
  different data structure and a different failure mode. "It is fast" is not an answer, and every key
  needs an expiry policy or you have built a memory leak with a network interface.
- **What is your cache invalidation story?** Time-to-live is the default and is usually right.
  Explicit invalidation on write is correct and hard. The wrong answer is having neither and
  discovering the staleness in production.
- **When would you not reach for MongoDB?** Anything with real relational integrity requirements,
  or joins across three or more collections in the hot path. Being willing to say that makes the rest
  of the answer credible.

## Reading Order

01 → 02 → 04 is the spine: the model, the modelling decision, and making queries fast. 03 and 05 are
practical and can wait until you need them. 06 is independent of the rest and can be read first if
Redis is what your team runs.

**Interview sprint:** 02 → 04 → 06. The embed-or-reference question, the index question, and the
"what would you use Redis for" question cover most of it.
