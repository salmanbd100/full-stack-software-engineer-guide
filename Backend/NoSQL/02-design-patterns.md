# Document Design Patterns

## 💡 Why Schema Design Matters in MongoDB

MongoDB doesn't enforce schemas, but **your queries do**. The shape of your documents is driven by **how you read them**, not how the data relates in the abstract. Get this wrong and you'll either fan out into dozens of queries per request, or store documents so huge they hit the 16 MB limit.

> Rule of thumb: design the document so **a single read returns what one screen needs**.

---

## Embed vs Reference

This is the single most important decision in MongoDB modeling.

### Embedding (Denormalization)

Store related data inside the same document.

```typescript
interface User {
  _id: ObjectId;
  name: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
  hobbies: string[];
}
```

✅ Good when:
- 1-to-few relationships (a user's addresses, an order's line items)
- Data is read together
- Children don't exist outside the parent
- You want atomic updates

### Referencing (Normalization)

Store an ID; load related data with a separate query.

```typescript
// User
interface User {
  _id: ObjectId;
  name: string;
}

// Posts — author lives separately
interface Post {
  _id: ObjectId;
  authorId: ObjectId;
  title: string;
  body: string;
}
```

✅ Good when:
- 1-to-many where many is large or unbounded (posts, events, logs)
- Many-to-many (users ↔ groups)
- Children are queried independently
- Children change frequently

---

## The 16 MB Document Limit

Every MongoDB document has a hard cap of **16 MB**. If a document can grow without bound (comments, events, audit history), do not embed — reference, or use the bucket pattern below.

---

## Common Patterns

### 1. Extended Reference

Denormalize the **few fields you always show** alongside the reference.

```typescript
interface Post {
  _id: ObjectId;
  title: string;
  author: {
    id: ObjectId;
    name: string;     // denormalized
    avatarUrl: string;// denormalized
  };
}
```

> Tradeoff: when the user's name changes, you must update every post. Worth it when reads outnumber writes 1000:1 (most feeds).

### 2. Subset Pattern

Embed the **hot subset** of a large child collection.

```typescript
interface Movie {
  _id: ObjectId;
  title: string;
  topReviews: Review[];   // 10 most useful
  reviewCount: number;
}

// Full reviews live in their own collection
interface Review {
  _id: ObjectId;
  movieId: ObjectId;
  body: string;
  rating: number;
}
```

> Movie detail page renders instantly from one document; pagination uses the reviews collection.

### 3. Bucket Pattern

Group time-series or high-volume children into fixed-size "buckets."

```typescript
interface SensorBucket {
  sensorId: string;
  hourStart: Date;
  readings: { ts: Date; value: number }[];  // up to ~200
  count: number;
}
```

Instead of 1 million `{ts, value}` documents, you store 5,000 buckets. Reads are cheaper, indexes are smaller.

### 4. Computed Pattern

Cache derived values to avoid recomputing on every read.

```typescript
interface Order {
  _id: ObjectId;
  items: LineItem[];
  totalAmount: number;   // computed once on write
  itemCount: number;     // computed once on write
}
```

---

## Real-World Examples

### Blog Post + Comments

| Approach   | When                                          |
| ---------- | --------------------------------------------- |
| Embed      | Few comments per post, all loaded together    |
| Reference  | Unbounded comments, paginated, moderated      |
| Subset     | Show top 5 inline + "load more"               |

**Most production blogs: reference + subset.**

### User + Orders

Reference. Orders grow unbounded and are queried independently for fulfillment, reporting, and history.

### Order + Line Items

Embed. Line items only exist with the parent order, never queried alone, fixed in count.

---

## Schema Smells

🔴 **Unbounded array growth** — Any field where `.push` runs forever. Will hit 16 MB.
🔴 **Embedded data queried independently** — If you frequently `find({ "comments.author": id })`, comments belong in their own collection.
🔴 **Frequent updates to deeply nested fields** — Updating `orders.items[42].status` is slow and hard to index.
🔴 **Joining on every read** — Two-step `find` then `find({ _id: { $in: ids } })` for every page load → embed instead.

---

## Decision Cheat Sheet

| Question                                  | Embed | Reference |
| ----------------------------------------- | ----- | --------- |
| Always read together?                     | ✅    |           |
| Child exists without parent?              |       | ✅        |
| 1-to-few (< 100)?                         | ✅    |           |
| 1-to-many (unbounded)?                    |       | ✅        |
| Many-to-many?                             |       | ✅        |
| Need atomic single-document update?       | ✅    |           |
| Child queried independently?              |       | ✅        |

---

## Interview Q&A

**Q: When do you embed vs reference?**
A: Embed when the data is small, bounded, and always read with the parent. Reference when the relationship is unbounded, the child exists independently, or the child is queried on its own. Default to embedding for performance, switch to referencing the moment growth or independent queries appear.

**Q: How do you handle the duplicated-field problem in the extended reference pattern?**
A: Update jobs. When a user changes their name, schedule a background job that updates all denormalized copies. Most apps tolerate brief inconsistency on reads in exchange for fast queries.

**Q: A document keeps hitting the 16 MB limit — what do you do?**
A: Move the unbounded array out (referencing) or apply the bucket pattern. Both keep documents small enough for efficient reads and indexing.

---

## Best Practices

✅ Design around your **read patterns**, not entity relationships
✅ Embed when child is small, bounded, and always read together
✅ Reference when child is unbounded or independent
✅ Use extended references to avoid `$lookup` joins on hot paths
✅ Apply bucketing for time-series and append-only data
❌ Don't embed unbounded arrays
❌ Don't reference everything "just to be safe" — joins are expensive
❌ Don't normalize like a relational schema by default

---

[← Previous: MongoDB](./01-mongodb.md) | [Next: Aggregation →](./03-aggregation.md)
