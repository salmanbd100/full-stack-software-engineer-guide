---
title: Document Databases
part: 5
chapter: 0
slug: document-databases
level: intermediate
reading_time: 10
updated: 2026-09-08
tags: [nosql, mongodb, documents, schema, modelling]
in_book: true
---

# Document Databases {#ch-document-databases}

> Model the queries instead of the entities, decide embed or reference from the access pattern, and say precisely what you gave up.

**In this chapter:** the document trade · declaring the schema you already have · atomic single-document writes · embed or reference · the patterns and the smells

## 💡 The Core Idea

A relational database stores one fact in one place and reassembles it with joins on read. A
document database stores the **shape the application reads** and accepts duplication as the price.

That is the whole trade. Reading a product page with its variants and images is one document fetch
instead of a four-table join — and updating a value duplicated across ten thousand documents is now
your problem rather than the database's.

The inversion that follows is the real skill: in a relational database you model the data and derive
the queries; here you **model the queries and derive the documents.** There is no single correct
schema for a domain, only one that suits the access pattern you have.

## How It Works

MongoDB is the document database this chapter uses, because it is the one that comes up.

| Relational | MongoDB |
| ---------- | ------- |
| Table | Collection |
| Row | Document |
| Column | Field |
| Join | `$lookup`, or an embedded document |
| Schema enforced by the engine | Schema enforced by you — optionally by JSON Schema validation |

### Declaring the schema you already have

**"Schemaless" describes the engine, not your data.** Every application has a schema; the only
question is whether it is written down. Write it down:

MongoDB takes a `$jsonSchema` validator on `createCollection` with `validationLevel: 'strict'`.
Declaring `required` fields and an `enum` for each status column there means a write from a script or
an older deployment is rejected by the engine, not by whichever service next reads it.

Documents are stored as BSON, a binary superset of JSON with real types — `Date`, `Decimal128`,
`Binary`, `ObjectId`. An `ObjectId` starts with a 4-byte timestamp, so it sorts roughly by creation
time and index inserts land at the end of the B-tree rather than fragmenting it. It also leaks that
timestamp, so it is a poor public identifier.

> ⚠️ Use `Decimal128` for money, never `double`. BSON `double` is IEEE 754 binary floating point, so
> `0.1 + 0.2` is not `0.3` — the same trap as `float` in SQL.

### Writing documents safely

**The two writes that carry most of the value:**

```typescript
interface Order {
  _id: ObjectId;
  userId: ObjectId;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  items: { sku: string; qty: number; unitPrice: Decimal128 }[];
  createdAt: Date;
}

const orders = db.collection<Order>('orders');

// A single-document update is atomic, so the filter is the concurrency guard:
// this is compare-and-swap, with no transaction needed.
await orders.updateOne(
  { _id: id, status: 'pending' },
  { $set: { status: 'paid', paidAt: new Date() }, $inc: { attempts: 1 } },
);

// Claim work from a queue collection in one round trip, with no race.
const claimed = await orders.findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'processing', claimedAt: new Date() } },
  { sort: { createdAt: 1 }, returnDocument: 'after' },
);
```

| Operator | Does |
| -------- | ---- |
| `$set` / `$unset` | Set or remove a field |
| `$inc` | Atomic increment — never read-then-write a counter |
| `$push` / `$pull` with `$each`, `$slice` | Append to or remove from an array, capped |
| `$elemMatch` | One array element matching **all** conditions |

`$elemMatch` is the one people get wrong. `{ 'items.qty': { $gt: 5 }, 'items.sku': 'A' }` matches a
document where *some* item has qty above 5 and *some* has sku `A` — not necessarily the same one.
`$elemMatch` requires a single element to satisfy both.

Multi-document transactions exist, need a replica set, carry a 60-second default limit, and cost
noticeably more than a single-document write. Needing them constantly is a design signal: the schema
is modelled relationally in a document store.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| One document matches one screen, read patterns stable | Document store | The join disappears from the hot path |
| Attributes vary by record — a catalogue with per-category fields | Document store | No sparse columns, no table per type |
| Highly relational data, unpredictable queries, reporting | Relational | Joins and a query planner are the point |
| Mostly relational with a few flexible fields | Postgres `jsonb` | Covers most of why teams reach for MongoDB |

## Embed or Reference

A post can hold its comments in a `comments: { author, body, at }[]` array, so one read gets both,
or comments can live in their own collection with an indexed `postId`. The signals decide which.

| Signal | Embed | Reference |
| ------ | ----- | --------- |
| Read together, always | ✅ | |
| The child has no meaning alone | ✅ | |
| Bounded and small — addresses, variants | ✅ | |
| Unbounded growth — comments, events, log lines | | ✅ |
| The child is queried independently | | ✅ |
| The child is shared by many parents | | ✅ |
| The child is updated far more often than the parent | | ✅ |

The rule that resolves most cases: **embed one-to-few, reference one-to-many, and always reference
one-to-squillions.** A user's three addresses embed. A post's comments reference, because "comments"
has no upper bound.

> ⚠️ A document cannot exceed 16 MB. Any embedded array that grows with usage will hit that ceiling,
> and the failure arrives in production on your most successful record. An array with no natural
> bound is a separate collection.

## Patterns Worth Knowing

**1. Extended reference** — copy the two or three fields you always display and keep the reference
for the rest, so an order row carries `customer: { _id, name, email }` — enough to render a list.
This is the most useful pattern in practice: it removes the join from the hot read path. The cost is
staleness after a rename, so you need a change stream or a job that updates the copies — and you
must decide whether stale is acceptable. On an invoice the copy is *correct* rather than stale.

**2. Bucket** — group time-series points into one document per interval rather than one per reading:
`{ sensorId, hour, readings: { t, v }[], count }`. One document per hour instead of 3,600 cuts
index size and per-document overhead by orders of magnitude, and bounds the array for free.

**3. Computed** — store the aggregate with the parent and maintain it on write, so reads never
aggregate. `await posts.updateOne({ _id }, { $inc: { commentCount: 1 } })`. The obligation is that
every write path maintains it and a reconciliation job exists.

**4. Schema versioning** — stamp `schemaVersion: 2` so old and new shapes coexist and migrate lazily
on read; without it, a shape change means downtime or code that guesses.

## Schema Smells

| Smell | Why it hurts |
| ----- | ------------ |
| An unbounded embedded array | Approaches 16 MB, and every read fetches the whole thing |
| Field names as data — `{ "2026-01": 4, "2026-02": 7 }` | Cannot be indexed or queried by range |
| `$lookup` on every read | You have modelled relationally; use a relational database |

The `$lookup` smell is the one to name in an interview. If most reads join two collections, the
document model is buying nothing.

## What Mongoose Adds

Mongoose is an ODM over the driver — schema declarations, validation, hooks and population — and two
of its costs are worth knowing.

```typescript
// .lean() returns plain objects instead of hydrated documents — several times faster on
// read-only paths, at the cost of virtuals, getters and .save().
const rows = await Order.find({ userId }).lean();
```

> ⚠️ `populate()` is a second query, not a join. Populating a list of 50 orders' users costs one
> extra query; populating each order inside a loop costs 50. Use the extended-reference pattern on a
> hot path.

Mongoose validation runs in your application, so a write from a script or another service bypasses
it. Treat it as a good error message and put the real guarantee in the collection's JSON Schema.

## Common Mistakes

**❌ Modelling the entity diagram.** A schema that mirrors normalised tables gets the worst of both:
no joins available, and no read advantage.

**❌ Embedding because it is convenient today.** Ask what the array looks like after two years of
your most active user.

**❌ Duplicating a mutable field with no update path.** The copy is fine; the missing job that
maintains it is the bug. And a reference field with no index — `postId` — makes every child lookup a
collection scan.

## 🔑 Key Takeaways

- Documents store the shape you read; the price is duplication you must keep consistent yourself.
- Model the queries, then derive the documents — the opposite of relational design.
- A single-document update is atomic, so putting the expected state in the filter gives you compare-and-swap for free.
- Embed one-to-few, reference one-to-many, always reference unbounded relationships — 16 MB is a hard ceiling.
- `$lookup` on most reads means the data is relational and belongs in a relational database.

## Interview Questions

**Q: When would you choose MongoDB over Postgres?**

When the data is naturally hierarchical, the read patterns are known and stable, and one document
matches one screen — a product catalogue with varying attributes per category, or an event log. When
queries are unpredictable, the data is highly relational, or reporting matters, Postgres wins, and
its `jsonb` covers most of what people reach for MongoDB to get.

**Q: How do you decide whether to embed or reference?**

By the access pattern and the growth bound. Embed when the child is always read with the parent, has
no independent identity, and is bounded — a user's addresses. Reference when the child grows without
limit, is queried on its own, or is shared. The 16 MB document limit turns "unbounded" from a style
preference into a hard constraint.

**Q: Are MongoDB writes atomic?**

At the document level, always — including updates to nested arrays inside one document, which is a
large part of why embedding is attractive. Across documents you need an explicit transaction on a
replica set, with a time limit and a real cost. Needing those routinely means the schema is
relational and modelled wrongly.

## What to Read Next

- [Chapter ?? — Redis](#ch-redis) — the other half of this section: a store with no documents at all
- [Chapter ?? — Database Design](#ch-database-design) — the normalised alternative, stated fairly
- [Chapter ?? — Choosing a Datastore](#ch-choosing-a-datastore) — the decision one level up, including replication and sharding
