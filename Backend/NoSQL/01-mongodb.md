---
title: MongoDB Fundamentals
part: 5
chapter: 0
slug: mongodb
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-28
tags: [backend, nosql, mongodb]
in_book: true
---

# MongoDB Fundamentals {#ch-mongodb-fundamentals}

> Work with documents rather than rows, and know what the database guarantees you.

**In this chapter:** documents, collections and BSON · CRUD · the query operators worth memorising · transactions · replication and sharding

## 💡 What MongoDB Actually Is

MongoDB stores **documents** — self-describing records that look like JSON — instead of rows in fixed tables.

The real shift is not "no schema." It is **where the schema lives**. In SQL the database enforces the shape. In MongoDB your application enforces it, and you design that shape around **how you read the data**.

> The whole model in one line: a document holds what one screen needs, so one read answers one request.

---

## Core Vocabulary

| MongoDB      | SQL equivalent | What it is                                  |
| ------------ | -------------- | ------------------------------------------- |
| **Document** | Row            | One record, stored as BSON                  |
| **Collection** | Table        | A group of documents — no enforced shape    |
| **Field**    | Column         | A key in a document                         |
| **`_id`**    | Primary key    | Unique per collection, indexed automatically |
| **Replica set** | —           | Copies of your data for failover            |
| **Shard**    | Partition      | A slice of data on its own machine          |

A document:

```typescript
interface User {
  _id: ObjectId;          // auto-generated primary key
  email: string;
  name: string;
  address?: {             // nested object — no join needed
    city: string;
    country: string;
  };
  roles: string[];        // arrays are first-class
  createdAt: Date;        // a real Date, not a string
}
```

Two documents in the same collection can have different fields. That is a feature for evolving data and a footgun if nobody enforces a shape — which is why [Mongoose](./05-mongoose.md) exists.

---

## BSON and ObjectId

MongoDB stores **BSON** (Binary JSON), not JSON. Two differences matter in interviews.

**1. Real types.** JSON has strings, numbers, booleans, arrays, objects — that's it. BSON adds `Date`, `ObjectId`, `Decimal128`, `Int32`/`Int64`, and binary data.

```typescript
// JSON — a date is just text, so you cannot range-query it correctly
{ createdAt: "2024-12-08T10:00:00Z" }

// BSON — a real Date, so { createdAt: { $gt: someDate } } works
{ createdAt: new Date("2024-12-08T10:00:00Z") }
```

**2. Length prefixes.** Every BSON value records its own size, so the engine can skip a field it doesn't need instead of parsing it.

### ObjectId

The default `_id` is a 12-byte value, not a random UUID:

```text
4 bytes timestamp | 5 bytes random per-process | 3 bytes counter
```

⚠️ **The useful consequence:** ObjectIds are **roughly sortable by creation time**, and you can extract that time.

```typescript
const id = new ObjectId();
id.getTimestamp();                      // Date — no createdAt field required
await Users.find().sort({ _id: -1 });   // newest first, uses the _id index
```

> This is why "sort by newest" often needs no extra index — `_id` already gives you one for free.

---

## CRUD

Examples use the official driver so the operators stay visible. [Mongoose](./05-mongoose.md) wraps these with schemas and validation.

```typescript
import { MongoClient, ObjectId, Collection } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI!);
await client.connect();
const users: Collection<User> = client.db("app").collection<User>("users");
```

### Create

```typescript
const { insertedId } = await users.insertOne({
  email: "ana@example.com",
  name: "Ana",
  roles: ["user"],
  createdAt: new Date(),
});

await users.insertMany([...docs], { ordered: false }); // keep going past a failure
```

> `ordered: false` matters for bulk imports — one duplicate key won't abandon the remaining documents.

### Read

```typescript
const one = await users.findOne({ email: "ana@example.com" });

const page = await users
  .find({ roles: "admin" })          // matches if the array *contains* "admin"
  .project({ name: 1, email: 1 })    // return less data over the wire
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();
```

⚠️ **`skip` is not pagination at scale.** `skip(100000)` makes the server walk and discard 100,000 documents. Use a **cursor on the last value seen**:

```typescript
// ❌ Gets slower the deeper the user pages
await users.find().skip(page * 20).limit(20).toArray();

// ✅ Constant cost at any depth
await users.find({ _id: { $lt: lastSeenId } }).sort({ _id: -1 }).limit(20).toArray();
```

### Update

Updates take **operators**, not replacement values.

```typescript
await users.updateOne({ _id: id }, { $set: { name: "Ana Silva" } });
await users.updateMany({ roles: "trial" }, { $addToSet: { roles: "user" } });

// Read-modify-write in one atomic step, returning the new document
const updated = await users.findOneAndUpdate(
  { _id: id },
  { $inc: { loginCount: 1 } },
  { returnDocument: "after" },
);
```

🔴 **Forgetting `$set` replaces the whole document.**

```typescript
await users.updateOne({ _id: id }, { name: "Ana" });   // ❌ error in modern drivers
await users.replaceOne({ _id: id }, { name: "Ana" });  // 🔴 every other field is gone
```

| Operator     | Does                                  |
| ------------ | ------------------------------------- |
| `$set`       | Set a field                           |
| `$unset`     | Remove a field                        |
| `$inc`       | Add to a number (atomic)              |
| `$push`      | Append to an array                    |
| `$addToSet`  | Append only if not already present    |
| `$pull`      | Remove matching array elements        |

### Delete

```typescript
await users.deleteOne({ _id: id });
await users.deleteMany({ isActive: false });
```

> Prefer a **soft delete** (`deletedAt: Date`) for anything a human might need back.

---

## Query Operators Worth Knowing

```typescript
// Comparison
{ age: { $gte: 18, $lt: 65 } }
{ role: { $in: ["admin", "editor"] } }

// Existence — "field is missing" is different from "field is null"
{ phone: { $exists: false } }

// Logical
{ $or: [{ role: "admin" }, { isOwner: true }] }
```

### The array gotcha interviewers use

Conditions on an array match if **any element** satisfies **each condition separately**:

```typescript
// Document: { scores: [{ subject: "math", value: 40 }, { subject: "art", value: 90 }] }

// ❌ MATCHES — "math" comes from one element, 80 from a different one
await results.find({ "scores.subject": "math", "scores.value": { $gt: 80 } });

// ✅ Forces both conditions onto the SAME element
await results.find({
  scores: { $elemMatch: { subject: "math", value: { $gt: 80 } } },
});
```

> `$elemMatch` is the answer whenever you need two conditions to hold on one array element.

---

## Transactions

MongoDB has multi-document ACID transactions since 4.0. They require a **replica set** — they don't run on a standalone server.

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

`withTransaction` commits on success, aborts on a thrown error, and retries transient failures. Prefer it over manual `startTransaction`/`commitTransaction`.

**When you don't need one:** a single document update is *already* atomic, including nested fields and arrays. Well-modelled documents make most transactions unnecessary — that is the intended design.

| Reach for a transaction when            | Skip it when                             |
| --------------------------------------- | ---------------------------------------- |
| Two collections must change together    | All the data lives in one document       |
| Money or inventory moves between records | You can use `$inc` on a single document  |

⚠️ Transactions hold locks and have a default 60-second limit. Keep them short.

---

## Replication and Sharding

**Replica set — availability.** One primary takes writes; secondaries copy it. If the primary dies, an election promotes a secondary in seconds. Always run one in production.

```text
        writes            replication
Client ────────▶ Primary ──────────────▶ Secondary
                    │                 └─▶ Secondary
                    ▼
              election on failure
```

**Sharding — scale beyond one machine.** Data splits across shards by a **shard key**.

Choosing that key is the whole game:

- ✅ **High cardinality + evenly spread** — spreads writes across every shard
- ❌ **Monotonically increasing** (a timestamp, `_id`) — every new write lands on the same shard, so you bought hardware you can't use

> Interview answer: "Replication is for availability, sharding is for scale. Shard only when one machine genuinely can't hold the working set — it complicates every query that doesn't include the shard key."

---

## Interview Q&A

**Q: When would you pick MongoDB over PostgreSQL?**
A: When the data is naturally hierarchical and read as a unit (product catalogs with per-category attributes, event payloads, CMS content), when the shape varies per record, or when you need horizontal write scaling. Pick SQL when you need cross-entity joins, strict constraints, or reporting queries you can't predict in advance. Honest answer for most CRUD apps: PostgreSQL with a `jsonb` column covers both, and MongoDB wins on document modelling and sharding rather than raw flexibility.

**Q: Is MongoDB ACID?**
A: Yes, with a caveat about scope. A single document write has always been fully atomic. Multi-document ACID transactions arrived in 4.0 for replica sets and 4.2 across shards. The design intent is that good document modelling makes multi-document transactions rare.

**Q: How do you avoid the N+1 problem?**
A: Three options in order of preference — embed the data so one read is enough ([design patterns](./02-design-patterns.md)); `$lookup` in an [aggregation](./03-aggregation.md) to join server-side; or batch the second query with `find({ _id: { $in: ids } })`. Never loop and query per item.

**Q: Why is `skip` bad for pagination?**
A: The server still scans and discards every skipped document, so page 5,000 costs far more than page 1. Range on an indexed field instead — `{ _id: { $lt: lastSeenId } }` — which stays constant-cost and doesn't skip or repeat rows when data changes mid-paging.

**Q: What happens if you pick a bad shard key?**
A: Two failure modes. A monotonically increasing key sends every write to one shard ("hotspotting"), so you scale hardware without scaling throughput. A low-cardinality key creates jumbo chunks that can't split. Changing the shard key on a live collection is expensive, so this is a decision to get right up front.

---

## Best Practices

✅ Model around **read patterns**, not entity relationships
✅ Keep documents well under 16 MB — reference or bucket unbounded arrays
✅ Project only the fields you need
✅ Paginate with a range on an indexed field, not `skip`
✅ Run a replica set in production, even single-region
✅ Use `$elemMatch` when two conditions must match one array element
❌ Don't normalize by reflex — you lose MongoDB's main advantage
❌ Don't rely on schemaless-ness — enforce a shape in the application
❌ Don't shard until one machine is genuinely the limit

---

## Where to Go Next

| To learn                            | Read                                    |
| ----------------------------------- | --------------------------------------- |
| Embed vs reference, bucket, subset  | [Design Patterns](./02-design-patterns.md) |
| `$group`, `$lookup`, pipelines      | [Aggregation](./03-aggregation.md)      |
| Compound indexes, ESR, `explain()`  | [Indexing](./04-indexing.md)            |
| Schemas, validation, hooks          | [Mongoose](./05-mongoose.md)            |

---

[← Back to NoSQL](./README.md) | [Next: Design Patterns →](./02-design-patterns.md)
