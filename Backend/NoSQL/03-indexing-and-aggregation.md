---
title: Indexing and Aggregation
part: 5
chapter: 0
slug: nosql-indexing
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [nosql, mongodb, indexes, aggregation, performance]
in_book: true
---

# Indexing and Aggregation {#ch-nosql-indexing}

> Order a compound index by the ESR rule, and build a pipeline that filters before it does anything expensive.

**In this chapter:** the ESR rule · covered queries · reading `explain()` · the pipeline stages that matter · `$lookup` and its cost

## 💡 The Core Idea

MongoDB's indexes are B-trees, exactly like a relational database's, so the same rule applies: an
index answers questions about a **prefix of its key**, in order. What differs is what you can index —
fields inside embedded documents, and every element of an array.

Aggregation is the other half. A pipeline is an ordered list of stages, each consuming the previous
stage's output. Its performance is decided almost entirely by **how early you filter**, because only
the first stages can use an index at all.

## Compound Indexes and the ESR Rule

Order the keys **Equality, Sort, Range**.

```typescript
// Query: find one tenant's paid orders, newest first, in a date range.
await orders.createIndex({ tenantId: 1, createdAt: -1, total: 1 });
//                         equality    sort            range
```

| Position | Holds | Why |
| -------- | ----- | --- |
| **E**quality | Fields matched with `=` or `$in` | Narrows the index to a contiguous block |
| **S**ort | The `sort()` field | The block is already ordered, so the sort is free |
| **R**ange | `$gt`, `$lt`, `$in` on a range | A range scatters everything after it |

Getting sort and range the wrong way round is the common error. With `{ tenantId, total, createdAt }`
the range on `total` breaks the ordering of `createdAt`, so MongoDB performs an in-memory sort — and
an in-memory sort over more than 100 MB simply fails unless you pass `allowDiskUse`.

**Index direction matters only for multi-field sorts.** A single-field index serves both directions;
`{ a: 1, b: -1 }` serves `sort({ a: 1, b: -1 })` and its exact reverse, and nothing else.

### The index types you will use

| Type | For |
| ---- | --- |
| Single field | The default |
| Compound | Nearly every real query — up to 32 fields |
| **Multikey** | An array field; created automatically, one index entry per element |
| Text | Basic search — one text index per collection |
| TTL | `expireAfterSeconds` on a date field, for sessions and ephemeral data |
| Partial | `partialFilterExpression` — index only the rows you query |

> ⚠️ A compound index can contain at most **one** array field. Two multikey fields in one index would
> mean indexing the cross-product, and MongoDB refuses to create it.

**Covered queries** never touch the documents. Every field in the filter, sort and projection must be
in the index, and `_id` must be explicitly excluded because it is returned by default.

```typescript
const rows = await orders
  .find({ tenantId }, { projection: { _id: 0, tenantId: 1, createdAt: 1 } })
  .sort({ createdAt: -1 })
  .toArray(); // Index-only: totalDocsExamined is 0.
```

## Reading `explain()`

```typescript
const plan = await orders.find({ tenantId, status: 'paid' }).explain('executionStats');
```

| Field | Healthy | Warning sign |
| ----- | ------- | ------------ |
| `stage` | `IXSCAN`, or `PROJECTION_COVERED` | `COLLSCAN` on a large collection |
| `nReturned` vs `totalDocsExamined` | Close to 1:1 | 1:1000 means the index is not selective |
| `totalKeysExamined` | Near `nReturned` | Far higher means the wrong key order |
| `SORT` stage present | Absent | Present means an in-memory sort |
| `executionTimeMillis` | — | Compare before and after, on real data volumes |

The ratio of `nReturned` to `totalDocsExamined` is the number to lead with. Returning 20 documents
after examining 400,000 is the definition of a missing or mis-ordered index.

`db.currentOp()` and the profiler (`db.setProfilingLevel(1, { slowms: 100 })`) find the slow queries
you did not know to look for.

## The Aggregation Pipeline

```typescript
const revenueByMonth = await orders.aggregate([
  // 1. $match FIRST — this is the only stage that can use an index here.
  { $match: { tenantId, status: 'paid', createdAt: { $gte: since } } },

  // 2. Cut the document down before doing any work on it.
  { $project: { month: { $dateTrunc: { date: '$createdAt', unit: 'month' } }, total: 1 } },

  { $group: { _id: '$month', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  { $sort: { _id: 1 } },
  { $limit: 24 },
]).toArray();
```

| Stage | Does | Note |
| ----- | ---- | ---- |
| `$match` | Filters documents | Put it first; it is the only indexable stage |
| `$project` / `$set` | Reshapes | Drop fields early to cut memory |
| `$unwind` | One output document per array element | Multiplies the document count — the main memory risk |
| `$group` | Aggregates | 100 MB limit per stage without `allowDiskUse` |
| `$lookup` | Joins another collection | Expensive; see below |
| `$facet` | Several pipelines over one input | One round trip for results plus a count |

**The rule that matters: `$match` and `$limit` as early as possible, `$unwind` and `$lookup` as late
as possible.** A `$match` after a `$group` filters results the database has already computed.

### `$lookup` is not a join

```typescript
{ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
{ $unwind: '$user' }, // $lookup always produces an array, even for one match
```

It executes as a query against the foreign collection **per input document**. Without an index on
`foreignField` it is a collection scan per document. Even with one, it is the stage that most often
makes an aggregation unusable — which is why the extended-reference pattern from
[Chapter ?? — Document Schema Design](#ch-nosql-schema-design) exists.

> ⚠️ `$lookup` in a pipeline over 100,000 documents is not a reporting solution. Either denormalise
> the fields you need, or run the report against a replica or an analytics store.

**Map-reduce is deprecated.** If you see it in a codebase, it is pre-2020 and the pipeline replaces
it entirely.

## Common Mistakes

**❌ An index per query.** Twenty indexes on one collection means twenty B-trees maintained on every
write. One well-ordered compound index usually serves several queries via its prefixes.

**❌ Indexing a low-cardinality field alone.** `status` with four values does not narrow anything. It
earns its place as the equality field of a compound index.

**❌ `$match` after `$group`.** The filter runs on computed results, so the expensive work already
happened.

**❌ `$unwind` before `$match`.** A 10-element array turns 100,000 documents into a million before
the filter runs.

**❌ Forgetting the TTL index on sessions.** The collection grows forever, and nobody notices until
it dominates the working set.

## 🔑 Key Takeaways

- Order compound index keys Equality, Sort, Range — a range key before the sort key forces an in-memory sort.
- A compound index may include at most one array field.
- In `explain()`, the ratio of `nReturned` to `totalDocsExamined` is the finding.
- `$match` and `$limit` belong at the top of a pipeline; `$unwind` and `$lookup` belong at the bottom.
- `$lookup` runs per input document, so it is a query pattern to avoid rather than a join to rely on.

## Interview Questions

**Q: What is the ESR rule and why does the order matter?**

Equality fields first, then the sort field, then range fields. Equality narrows the index to a
contiguous block; within that block the sort field is already ordered, so the sort costs nothing. A
range predicate makes the following keys non-contiguous, so anything after it cannot be used for
ordering — and you get an in-memory sort that fails outright above 100 MB.

**Q: How do you tell whether an index is being used well?**

`explain('executionStats')`: the winning plan should be an `IXSCAN` rather than a `COLLSCAN`,
`totalDocsExamined` should be close to `nReturned`, and there should be no separate `SORT` stage. A
large gap between keys examined and documents returned means the key order is wrong even though an
index exists.

**Q: Why is `$lookup` expensive?**

Because it is executed per input document against the foreign collection, not as a set-based join.
With an index on the foreign field it is one lookup per document; without one it is a collection scan
per document. At scale the answer is to denormalise the two or three fields you actually display.

**Q: When is a collection scan the right plan?**

On small collections that fit in a page or two, and on queries that genuinely need most of the
documents — an export or a migration. Forcing an index scan there is slower, because random reads
plus document fetches cost more than one sequential pass.

## What to Read Next

- [Chapter ?? — Document Schema Design](#ch-nosql-schema-design) — denormalising to avoid `$lookup`
- [Chapter ?? — Indexes and Query Plans](#ch-indexes) — the same B-tree reasoning in SQL
- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — finding the slow query from the application
