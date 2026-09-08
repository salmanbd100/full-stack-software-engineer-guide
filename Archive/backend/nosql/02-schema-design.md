---
title: Document Schema Design
part: 5
chapter: 0
slug: nosql-schema-design
level: advanced
reading_time: 8
updated: 2026-09-01
tags: [nosql, mongodb, schema, mongoose, modelling]
in_book: true
---

# Document Schema Design {#ch-nosql-schema-design}

> Decide embed or reference from the access pattern rather than the entity diagram, and recognise the shapes that go wrong.

**In this chapter:** the embed-or-reference decision · the document size limit · four patterns worth knowing · schema smells · what Mongoose adds

## 💡 The Core Idea

In a relational database you model the data and derive the queries. In a document database you do
the opposite: **model the queries and derive the documents.**

That inversion is uncomfortable and it is the whole skill. There is no single correct schema for a
domain, only a schema that suits the access pattern you have. Change the access pattern and the
right schema changes with it — which is also the risk, because a document schema is much harder to
reshape after a year of data than a normalised one.

## Embed or Reference

```typescript
// Embedded — one read gets the post and its comments
interface Post {
  _id: ObjectId;
  title: string;
  comments: { author: string; body: string; at: Date }[];
}

// Referenced — comments live in their own collection
interface Comment {
  _id: ObjectId;
  postId: ObjectId;  // indexed
  body: string;
}
```

| Signal | Embed | Reference |
| ------ | ----- | --------- |
| Read together, always | ✅ | |
| The child has no meaning alone | ✅ | |
| Bounded, small collection — addresses, variants | ✅ | |
| Unbounded growth — comments, events, log lines | | ✅ |
| The child is queried independently | | ✅ |
| The child is shared by many parents | | ✅ |
| The child is updated far more often than the parent | | ✅ |

The decision rule that resolves most cases: **embed one-to-few, reference one-to-many, and always
reference one-to-squillions.** A user's three addresses embed. A post's comments reference, because
"comments" has no upper bound and one popular post would otherwise outgrow the document.

### The 16 MB limit is a design constraint

A document cannot exceed 16 MB. Any embedded array that grows with usage will eventually hit it, and
the failure arrives in production on your most successful record. If an array has no natural
ceiling, it is a separate collection.

## Four Patterns Worth Knowing

**1. Extended reference** — copy the two or three fields you always display, keep the reference for
the rest.

```typescript
interface Order {
  customer: { _id: ObjectId; name: string; email: string }; // enough to render a list
}
```

This is the most useful pattern in practice: it removes the join from the hot read path. The cost is
staleness after a rename, so you need a job or a change stream that updates copies — and you must
decide whether stale is acceptable. For an invoice, the copy is *correct* rather than stale.

**2. Bucket** — group time-series points into one document per interval instead of one per reading.

```typescript
interface HourBucket {
  sensorId: string;
  hour: Date;
  readings: { t: Date; v: number }[]; // 60 entries, bounded by the interval
  count: number;
}
```

One document per hour rather than 3,600 cuts index size and document overhead by orders of
magnitude, and the bound comes free from the interval.

**3. Computed** — store the aggregate with the parent and maintain it on write.

```typescript
await posts.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
```

Reads never aggregate. The obligation is that every write path maintains it, and a reconciliation
job exists.

**4. Schema versioning** — stamp a version so old and new shapes can coexist.

```typescript
interface UserV2 { schemaVersion: 2; firstName: string; lastName: string }
```

Migrate lazily on read, or in a background batch. Without the field, a schema change means either
downtime or code that guesses.

## Schema Smells

| Smell | Why it hurts |
| ----- | ------------ |
| An unbounded embedded array | Approaches 16 MB, and every read fetches the whole thing |
| Field names as data — `{ "2026-01": 4, "2026-02": 7 }` | Cannot be indexed or queried by range |
| A collection per tenant | Thousands of collections, and metadata overhead |
| `$lookup` on every read | You have modelled relationally; use a relational database |
| Deeply nested documents, four or five levels | Updates need positional operators and become unreadable |

The `$lookup` smell is the one to name in an interview. If most reads join two collections, the
document model is not buying anything and a relational database would serve better.

## What Mongoose Adds

Mongoose is an ODM over the driver. It gives schema declarations, validation, middleware hooks and
population — and it introduces two costs worth knowing.

```typescript
const OrderSchema = new Schema<Order>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped'], default: 'pending' },
}, { timestamps: true });

// .lean() returns plain objects instead of hydrated documents — several times faster
// for read-only paths, at the cost of virtuals, getters and .save().
const rows = await Order.find({ userId }).lean();
```

> ⚠️ `populate()` is a second query, not a join, and inside a loop it is an N+1. Populating a list
> of 50 orders' users issues one extra query — populating each order individually issues 50. Prefer
> the extended-reference pattern for anything on a hot path.

Validation in Mongoose runs in your application, so a write from a script or another service
bypasses it. Treat it as a good error message, and put the real guarantee in JSON Schema validation
on the collection.

## Common Mistakes

**❌ Modelling the entity diagram.** A document schema that mirrors normalised tables gets the worst
of both: no joins available, and no read advantage.

**❌ Embedding because it is convenient today.** Ask what the array looks like after two years of the
most active user's activity.

**❌ Duplicating a mutable field with no update path.** The copy is fine; the missing job that
maintains it is the bug.

**❌ No index on a reference field.** `postId` without an index means every comment lookup is a
collection scan.

## 🔑 Key Takeaways

- Model the queries, then derive the documents — the opposite of relational design.
- Embed one-to-few, reference one-to-many, always reference unbounded relationships.
- The extended-reference pattern removes joins from hot reads and creates a staleness obligation you must own.
- `$lookup` on most reads is a signal that the data is relational and belongs in a relational database.
- Mongoose validation is an application-level convenience; the collection's JSON Schema is the guarantee.

## Interview Questions

**Q: How do you decide whether to embed or reference?**

By the access pattern and the growth bound. Embed when the child is always read with the parent, has
no independent identity, and is bounded — a user's addresses. Reference when the child grows without
limit, is queried on its own, or is shared. The 16 MB document limit turns "unbounded" from a style
preference into a hard constraint.

**Q: You embedded comments in posts and a popular post is failing to update. What happened?**

The document is approaching or has exceeded 16 MB, and every read of that post was already fetching
the entire comment history. The fix is to move comments to their own collection with an indexed
`postId`, optionally keeping the most recent few embedded for the first render.

**Q: How do you keep duplicated fields consistent?**

Decide first whether they should be: a price on an invoice is point-in-time and must not change. For
genuinely duplicated display fields, update them from a change stream or a scheduled job, accept a
window of staleness explicitly, and keep a reconciliation task. If the tolerance is zero, do not
duplicate.

## What to Read Next

- [Chapter ?? — MongoDB](#ch-mongodb) — the model and the operators these documents use
- [Chapter ?? — Indexing and Aggregation](#ch-nosql-indexing) — indexing an embedded array, and joining when you must
- [Chapter ?? — Database Design](#ch-database-design) — the normalised alternative, stated fairly
