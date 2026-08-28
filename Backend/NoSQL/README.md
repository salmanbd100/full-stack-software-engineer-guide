# NoSQL — MongoDB & Redis

## Overview

Relational databases ask "how does this data relate?" MongoDB asks a different question: **"how will you read this?"**

That inversion is the whole module. Schema design, indexing, and aggregation all follow from your access patterns rather than from normal forms. Redis then sits in front as the layer that makes hot reads effectively free.

**What you'll cover:**

- The document model, BSON, and what "schemaless" actually costs
- Embed vs reference — the decision every MongoDB design turns on
- Aggregation pipelines for work the query language can't express
- Indexes, compound key ordering, and reading `explain()`
- Mongoose for schemas, validation, and lifecycle hooks
- Redis as a cache, and its data structures beyond `GET`/`SET`

> **The one idea that ties it together:** in SQL you normalize and join at read time. In MongoDB you shape documents at write time so reads need no joins at all. Every pattern here is a variation on that tradeoff.

## Topics

| #   | Topic                                            | Core idea                                            |
| --- | ------------------------------------------------ | ---------------------------------------------------- |
| 01  | [MongoDB Fundamentals](./01-mongodb.md)          | Documents, BSON, CRUD, transactions, sharding         |
| 02  | [Design Patterns](./02-design-patterns.md)       | Embed vs reference; subset, bucket, computed          |
| 03  | [Aggregation](./03-aggregation.md)               | `$match` → `$group` → `$lookup` pipelines             |
| 04  | [Indexing](./04-indexing.md)                     | Compound order (ESR), covered queries, `explain()`    |
| 05  | [Mongoose](./05-mongoose.md)                     | Schemas, validation, hooks, populate                  |
| 06  | [Redis](./06-redis.md)                           | Caching, TTLs, data structures, pub/sub               |

## How the Pieces Fit

```text
   How will this be read?          ← start here, always
             │
             ▼
   Shape the document       (01, 02)   embed what's read together
             │
             ▼
   Index the access path    (04)       filter + sort fields, right order
             │
             ▼
   Aggregate what's left    (03)       grouping, joins, analytics
             │
             ▼
   Cache the hot results    (06)       Redis, with a TTL you can defend
```

Get the first step wrong and no amount of indexing rescues it.

## Suggested Study Path

**Day 1 — The model.** Read 01 and 02. The interview centrepiece is embed vs reference: know the decision rule, the 16 MB limit that forces your hand, and why unbounded arrays are the classic failure.

**Day 2 — Reading efficiently.** Read 04, then 03. Indexing first is deliberate — most "slow aggregation" problems are really a missing index on the leading `$match`. Be able to read `explain()` and spot a `COLLSCAN`.

**Day 3 — Application layer.** Read 05. Know what Mongoose adds over the raw driver, and when that overhead isn't worth it.

**Day 4 — Caching.** Read 06. Be ready to discuss invalidation, TTL choice, and cache stampede — the parts people skip.

## Interview Signals

| They ask | They're checking |
| --- | --- |
| "MongoDB or PostgreSQL?" | Whether you can argue *against* your preference |
| "Embed or reference?" | That you answer with read patterns, not entity diagrams |
| "This query is slow" | Index literacy — ESR, covered queries, `explain()` |
| "Is MongoDB ACID?" | Precision about scope: document vs multi-document |
| "How would you cache this?" | Invalidation strategy, not just "add Redis" |

## Related Modules

- [SQL](../SQL/) — the relational counterpart; know when to prefer it
- [NodeJS](../NodeJS/README.md) — connection pooling, N+1, performance
- [Security](../Security/README.md) — NoSQL injection and input validation

---

[← Back to Backend](../README.md)
