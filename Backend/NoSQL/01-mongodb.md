---
title: MongoDB
part: 5
chapter: 0
slug: mongodb
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [nosql, mongodb, documents, replication, sharding]
in_book: true
---

# MongoDB {#ch-mongodb}

> Use a document database for what it is good at, and say precisely what you gave up to get there.

**In this chapter:** the document model · BSON and ObjectId · the CRUD you will actually write · transactions · replication and sharding

## 💡 The Core Idea

A relational database stores one fact in one place and reassembles it with joins on read. A
document database stores the **shape the application reads** and accepts duplication as the price.

That is the whole trade. Reading a page of a product with its variants and images is one document
fetch instead of a four-table join — and updating something duplicated across ten thousand
documents is now your problem rather than the database's.

MongoDB is the right choice when access patterns are known, the data is naturally hierarchical, and
the write pattern does not fight the read shape. It is the wrong choice when the data is highly
relational and the queries are unpredictable, which is most reporting.

## How It Works

| Relational | MongoDB |
| ---------- | ------- |
| Table | Collection |
| Row | Document |
| Column | Field |
| Join | `$lookup`, or an embedded document |
| Schema enforced by the engine | Schema enforced by you — optionally by JSON Schema validation |

**"Schemaless" is a description of the engine, not of your data.** Every application has a schema;
the only question is whether it is written down. MongoDB lets you declare one:

```typescript
await db.createCollection('orders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'status', 'total', 'createdAt'],
      properties: {
        status: { enum: ['pending', 'paid', 'shipped', 'cancelled'] },
        total: { bsonType: 'decimal' }, // Not 'double' — see below.
      },
    },
  },
  validationLevel: 'strict',
});
```

### BSON and ObjectId

Documents are stored as BSON, a binary superset of JSON with real types — `Date`, `Decimal128`,
`Binary`, `ObjectId`.

An `ObjectId` is 12 bytes: a 4-byte timestamp, a 5-byte random value, and a 3-byte counter. Two
consequences worth knowing:

- It is **roughly monotonic**, so sorting by `_id` approximates sorting by creation time and index
  inserts land at the end of the B-tree rather than fragmenting it.
- It leaks a creation timestamp. Do not use it as a public identifier where that matters.

> ⚠️ Use `Decimal128` for money, never `double`. BSON `double` is IEEE 754 binary floating point,
> so `0.1 + 0.2` is not `0.3` — the same trap as `float` in SQL.

### The CRUD you will actually write

```typescript
interface Order {
  _id: ObjectId;
  userId: ObjectId;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  items: { sku: string; qty: number; unitPrice: Decimal128 }[];
  createdAt: Date;
}

const orders = db.collection<Order>('orders');

// Read: projection keeps the payload small and can make the query covered.
const page = await orders
  .find({ userId, status: { $in: ['paid', 'shipped'] } })
  .project({ status: 1, createdAt: 1, 'items.sku': 1 })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();

// Atomic single-document update — no read-modify-write race.
await orders.updateOne(
  { _id: id, status: 'pending' },       // the filter is the concurrency guard
  { $set: { status: 'paid', paidAt: new Date() }, $inc: { attempts: 1 } },
);

// Read-and-write in one round trip, returning the new document.
const claimed = await orders.findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'processing', claimedAt: new Date() } },
  { sort: { createdAt: 1 }, returnDocument: 'after' },
);
```

Two things carry most of the value here. **A single-document update is atomic**, so putting the
expected state in the filter (`status: 'pending'`) makes the update a compare-and-swap — no
transaction needed. And `findOneAndUpdate` is how you claim work from a queue collection without a
race.

| Operator | Does |
| -------- | ---- |
| `$set` / `$unset` | Set or remove a field |
| `$inc` | Atomic increment — never read-then-write a counter |
| `$push` / `$pull` with `$each`, `$slice` | Append to or remove from an array, capped |
| `$addToSet` | Append only if absent |
| `$elemMatch` | One array element matching **all** conditions — not each condition matching any element |
| `$exists`, `$type` | Deal with documents written by an older version of your code |

`$elemMatch` is the one people get wrong. `{ 'items.qty': { $gt: 5 }, 'items.sku': 'A' }` matches a
document where *some* item has qty > 5 and *some* item has sku A — not necessarily the same item.
`$elemMatch` requires one element to satisfy both.

## Transactions

Multi-document transactions exist and work, but the model expects you not to need them often.

```typescript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await accounts.updateOne({ _id: from }, { $inc: { balance: -amount } }, { session });
    await accounts.updateOne({ _id: to }, { $inc: { balance: amount } }, { session });
  });
} finally {
  await session.endSession();
}
```

Three constraints: they require a replica set, they have a default 60-second limit, and they cost
noticeably more than single-document writes. `withTransaction` retries transient errors for you,
which is why you should use it rather than manual `startTransaction`/`commitTransaction`.

If you find yourself needing transactions constantly, the schema is modelled relationally in a
document store — that is a design signal, not a tooling problem.

## Replication and Sharding

**A replica set** is one primary and several secondaries applying the primary's oplog. It gives
failover and durability, not write throughput.

```typescript
// Write concern: how many nodes must acknowledge before this resolves.
await orders.insertOne(doc, { writeConcern: { w: 'majority', j: true } });
```

| Setting | Meaning | Use |
| ------- | ------- | --- |
| `w: 1` | The primary acknowledged | Fast, and loses the write if the primary fails over immediately |
| `w: 'majority'` | Most nodes have it | The default you want for anything that matters |
| `j: true` | Flushed to the journal on disk | Money, audit records |
| `readPreference: 'secondary'` | Read from a replica | Analytics — accept replication lag |

Reading from a secondary means reading stale data. A user who saves and immediately reloads may see
the old value, which is the classic bug introduced by "let's take read load off the primary".

**Sharding** distributes a collection across clusters by a **shard key**, and the shard key is the
one decision you cannot easily change.

| Shard key | Result |
| --------- | ------ |
| Monotonic — `_id`, a timestamp | ❌ Every insert hits one shard; that shard is the bottleneck |
| Low cardinality — `country` | ❌ Cannot split further than the number of values |
| Hashed on a high-cardinality field | ✅ Even distribution, but range queries hit every shard |
| Compound, matching your main query — `{ tenantId: 1, createdAt: 1 }` | ✅ Even, and queries are targeted |

A query that does not include the shard key is broadcast to every shard and merged — a scatter-gather,
and the reason a badly chosen key makes a sharded cluster slower than one node.

## 🔑 Key Takeaways

- Documents store the shape you read; the price is duplication you must keep consistent yourself.
- Every application has a schema — declare it with JSON Schema validation rather than leaving it implicit.
- A single-document update is atomic, so putting the expected state in the filter gives you compare-and-swap for free.
- `w: 'majority'` is the write concern you want; reading from secondaries means reading stale data.
- The shard key must be high-cardinality, non-monotonic, and present in your common queries.

## Interview Questions

**Q: When would you choose MongoDB over Postgres?**

When the data is naturally hierarchical, the read patterns are known and stable, and one document
matches one screen — a product catalogue with varying attributes per category, or an event log.
When queries are unpredictable, the data is highly relational, or reporting matters, Postgres wins,
and its `jsonb` covers most of what people reach for MongoDB to get.

**Q: Are MongoDB writes atomic?**

Atomic at the document level, always — including updates to nested arrays within one document,
which is a large part of why embedding is attractive. Across documents you need an explicit
multi-document transaction on a replica set, with a time limit and a real cost. If you need those
routinely, the schema is relational and modelled wrongly.

**Q: What makes a bad shard key?**

Anything monotonically increasing, because every new document goes to the same shard and that shard
becomes the write bottleneck while the others idle. Also anything with few distinct values, since
chunks cannot split below one value. And a key absent from your common queries, because then every
read is a scatter-gather across all shards.

## What to Read Next

- [Chapter ?? — Document Schema Design](#ch-nosql-schema-design) — embed or reference, and the patterns for each
- [Chapter ?? — Indexing and Aggregation](#ch-nosql-indexing) — making these queries fast
- [Chapter ?? — Database Design](#ch-database-design) — the relational model this is trading against
