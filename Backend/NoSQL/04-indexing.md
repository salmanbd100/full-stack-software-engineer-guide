# MongoDB Indexing & Performance

## 💡 Why Indexes Matter

Without an index, MongoDB scans **every document** in a collection (`COLLSCAN`) to answer any query. An index lets the database jump straight to matching documents.

> An unindexed `find` on a 10 million-document collection takes seconds. With the right index, it takes microseconds.

**Tradeoffs:**

- ✅ Read queries massively faster
- ❌ Writes slower — every index must be updated
- ❌ Extra disk and RAM (the working set should fit in RAM)

---

## Creating Indexes

```typescript
import { Collection } from "mongodb";

// Single field
await users.createIndex({ email: 1 });            // ascending
await users.createIndex({ createdAt: -1 });       // descending

// Unique constraint
await users.createIndex({ email: 1 }, { unique: true });

// Compound — order matters!
await orders.createIndex({ customerId: 1, createdAt: -1 });

// Partial — only index documents matching a filter
await orders.createIndex(
  { status: 1 },
  { partialFilterExpression: { status: "pending" } },
);

// TTL — auto-delete documents after N seconds
await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text search
await articles.createIndex({ title: "text", body: "text" });

// Drop and inspect
await users.dropIndex("email_1");
const all = await users.indexes();
```

---

## Compound Indexes — The ESR Rule

Order fields in a compound index by:

1. **E**quality — fields tested with `=`
2. **S**ort — fields used in `$sort`
3. **R**ange — fields tested with `<`, `>`, `between`

```typescript
// Query
orders.find({ customerId: id, status: "paid" })
      .sort({ createdAt: -1 });

// ✅ Optimal index — equality, sort, then range fields
await orders.createIndex({ customerId: 1, status: 1, createdAt: -1 });
```

**Why order matters:**

```typescript
// Index on { a: 1, b: 1, c: 1 } can serve:
find({ a: 1 });                          // ✅
find({ a: 1, b: 2 });                    // ✅
find({ a: 1, b: 2, c: 3 });              // ✅
find({ a: 1, c: 3 });                    // ⚠️ partial (uses only a)

// But NOT:
find({ b: 2 });                          // ❌ collection scan
find({ c: 3 });                          // ❌ collection scan
```

> Composite indexes are usable only from the **leftmost prefix**.

---

## Covered Queries

If every field the query touches is in the index, MongoDB returns results **without reading the document** — pure index hit.

```typescript
await users.createIndex({ email: 1, name: 1 });

// Covered — only email and name are needed
await users
  .find({ email: "ada@example.com" }, { _id: 0, email: 1, name: 1 })
  .toArray();
```

This is the fastest possible read.

---

## `explain()` — Your Performance Tool

```typescript
const plan = await orders
  .find({ customerId: id, status: "paid" })
  .explain("executionStats");

console.log(plan.executionStats.totalDocsExamined);   // 1
console.log(plan.executionStats.totalKeysExamined);   // 1
console.log(plan.queryPlanner.winningPlan.stage);     // FETCH / IXSCAN
```

**Red flags:**

- `COLLSCAN` — no index used, full scan
- `totalDocsExamined` >> `nReturned` — index too broad, missing fields
- `SORT` stage — sort isn't using an index

---

## What to Index

✅ **Good index candidates:**

- Fields used in `find({})` filters
- Foreign-key style fields (`userId`, `customerId`)
- Sort fields (`createdAt`, `score`)
- Unique constraints (email, slug)
- Geo fields (`{ location: "2dsphere" }`)

❌ **Poor candidates:**

- Tiny collections (< few thousand docs)
- Low-cardinality fields (boolean, "active"/"inactive")
- Fields that are rarely queried
- Heavy write paths where reads are rare

---

## Index Size & RAM

MongoDB performs best when **indexes fit in RAM**. If they don't, the database thrashes paging from disk and performance falls off a cliff.

Check index size:

```typescript
const stats = await db.command({ collStats: "orders" });
console.log(stats.totalIndexSize);     // bytes
console.log(stats.indexSizes);         // per-index breakdown
```

> Bigger isn't better. Drop unused indexes — every write pays for every one.

---

## Finding Unused Indexes

```typescript
await db.command({ aggregate: "orders", pipeline: [{ $indexStats: {} }], cursor: {} });
```

Output shows usage counts per index. Indexes with 0 ops over weeks of production are safe to drop.

---

## Common Indexing Mistakes

❌ **Indexing every field "just in case"** — Writes get slow, RAM fills with cold indexes.

❌ **Ignoring sort direction** — `{ a: 1 }` cannot serve `find().sort({ a: -1 })` efficiently for *compound* sorts; match directions.

❌ **Wrong field order in compound index** — Doesn't follow ESR; query plan falls back to a scan.

❌ **Forgetting to index `$lookup` foreign field** — Joins go quadratic.

❌ **No index on TTL field** — TTL only works on an indexed field with `expireAfterSeconds`.

---

## Interview Q&A

**Q: How do you decide what to index?**
A: Start with your slow queries. Run `explain()`, look for `COLLSCAN` and high `totalDocsExamined`. Add a compound index following the ESR rule — equality fields first, then sort, then range. Measure again.

**Q: Why is your write throughput dropping after adding indexes?**
A: Every index must be updated on every write. With 10 indexes, a single insert does ~10× the I/O. Audit `$indexStats`, drop indexes that aren't used, and merge compound indexes where possible.

**Q: What is a covered query?**
A: A query where MongoDB can return results from the index alone, without fetching the document. Achieved when all query fields and all projected fields exist in the index — and `_id` is excluded from projection if it's not in the index.

---

## Best Practices

✅ Index foreign keys and frequent filter fields
✅ Follow the ESR rule for compound indexes
✅ Use `explain()` to verify index usage
✅ Drop unused indexes to keep writes fast
✅ Keep working-set indexes in RAM
✅ Use partial indexes for selective subsets
❌ Don't index every field
❌ Don't index low-cardinality booleans
❌ Don't ignore `$indexStats` over time

---

[← Previous: Aggregation](./03-aggregation.md) | [Next: Mongoose →](./05-mongoose.md)
