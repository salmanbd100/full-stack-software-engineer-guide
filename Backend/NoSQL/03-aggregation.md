# Aggregation Pipeline

## 💡 What Is the Aggregation Pipeline?

A pipeline is a sequence of **stages**, each transforming documents and passing the result to the next stage. Think of it as Unix pipes for MongoDB.

```
Collection ──▶ [$match] ──▶ [$group] ──▶ [$sort] ──▶ [$limit] ──▶ Result
```

> Use the pipeline anywhere you'd use SQL `GROUP BY`, `JOIN`, window functions, or string/date math.

---

## The Core Stages

| Stage      | Purpose                                  | SQL Equivalent       |
| ---------- | ---------------------------------------- | -------------------- |
| `$match`   | Filter documents                         | `WHERE`              |
| `$group`   | Aggregate by key                         | `GROUP BY`           |
| `$project` | Reshape output / pick fields             | `SELECT col1, col2`  |
| `$sort`    | Order results                            | `ORDER BY`           |
| `$limit`   | Cap result count                         | `LIMIT`              |
| `$skip`    | Offset for pagination                    | `OFFSET`             |
| `$lookup`  | Join with another collection             | `LEFT JOIN`          |
| `$unwind`  | Flatten an array into multiple documents | (no direct match)    |

---

## A Worked Example

**Goal:** top 5 customers by total spend in 2026.

```typescript
import { Collection } from "mongodb";

interface Order {
  _id: ObjectId;
  customerId: ObjectId;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: Date;
}

interface TopCustomer {
  customerId: ObjectId;
  totalSpent: number;
  orderCount: number;
}

async function topCustomers(orders: Collection<Order>): Promise<TopCustomer[]> {
  return orders.aggregate<TopCustomer>([
    // 1. Filter — only paid orders this year
    {
      $match: {
        status: "paid",
        createdAt: { $gte: new Date("2026-01-01") },
      },
    },

    // 2. Group — sum amounts per customer
    {
      $group: {
        _id: "$customerId",
        totalSpent: { $sum: "$amount" },
        orderCount: { $sum: 1 },
      },
    },

    // 3. Reshape — rename _id to customerId
    {
      $project: {
        _id: 0,
        customerId: "$_id",
        totalSpent: 1,
        orderCount: 1,
      },
    },

    // 4. Sort + limit
    { $sort: { totalSpent: -1 } },
    { $limit: 5 },
  ]).toArray();
}
```

---

## Joining Collections with `$lookup`

```typescript
const result = await orders.aggregate([
  { $match: { status: "paid" } },
  {
    $lookup: {
      from: "users",
      localField: "customerId",
      foreignField: "_id",
      as: "customer",
    },
  },
  { $unwind: "$customer" },          // single-element array → object
  {
    $project: {
      orderId: "$_id",
      amount: 1,
      "customer.name": 1,
      "customer.email": 1,
    },
  },
]).toArray();
```

> `$lookup` is MongoDB's `LEFT JOIN`. It's powerful, but expensive at scale — denormalize hot paths instead (see [[02-design-patterns]]).

---

## Useful Operators

```typescript
// Math
$sum, $avg, $min, $max, $multiply, $divide

// Array
$push, $addToSet, $first, $last, $size

// String
$concat, $substr, $toLower, $toUpper, $regexMatch

// Date
$year, $month, $dayOfMonth, $hour, $dateToString

// Conditional
$cond, $ifNull, $switch
```

**Conditional grouping:**

```typescript
{
  $group: {
    _id: "$customerId",
    paidTotal: {
      $sum: {
        $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
      },
    },
  },
}
```

---

## Performance Rules

1. **Filter early.** Put `$match` first so the rest of the pipeline runs on a smaller set.
2. **Use indexes.** A `$match` at the start can use indexes; later `$match` cannot.
3. **Project only what you need.** Don't drag unused fields through stages.
4. **`$sort` before `$group` only when grouping into an array preserves order.**
5. **Watch the 100 MB stage limit.** Use `{ allowDiskUse: true }` for big aggregations.

```typescript
const result = await orders.aggregate(
  [/* stages */],
  { allowDiskUse: true },
).toArray();
```

---

## `explain()` for Aggregations

```typescript
const plan = await orders
  .aggregate(pipeline)
  .explain("executionStats");

console.log(plan.stages);  // see how each stage was executed
```

Check for `IXSCAN` (using an index) vs `COLLSCAN` (full collection scan) in the first stage.

---

## Map-Reduce Is Dead

MongoDB once recommended `mapReduce` for analytics. **Don't use it.** The aggregation framework is faster, type-safer, and supports far more operations. `mapReduce` is deprecated.

---

## Interview Q&A

**Q: What's the difference between `find` and `aggregate`?**
A: `find` retrieves matching documents as-is. `aggregate` runs a pipeline that filters, groups, joins, reshapes, and computes. Use `find` for simple lookups; `aggregate` for analytics, joins, or derived fields.

**Q: How do you optimize a slow aggregation?**
A: Move `$match` to the front to use an index. Add a compound index covering the `$match` and `$sort` fields. Project away unused fields early. Avoid `$lookup` on hot paths — denormalize. Profile with `explain("executionStats")`.

**Q: When would you avoid `$lookup`?**
A: On request hot paths with high QPS. `$lookup` doesn't scale like relational joins — it executes per-document. Prefer denormalization (extended reference pattern) or load the related data in a separate batched query.

---

## Best Practices

✅ `$match` first — filter before anything else
✅ Index the fields used in early `$match` and `$sort`
✅ `$project` away unused fields to shrink memory
✅ Use `allowDiskUse: true` for large aggregations
✅ Run `explain()` before shipping
❌ Don't `$lookup` on read-heavy endpoints
❌ Don't sort the entire collection before filtering
❌ Don't reach for `mapReduce`

---

[← Previous: Design Patterns](./02-design-patterns.md) | [Next: Indexing →](./04-indexing.md)
