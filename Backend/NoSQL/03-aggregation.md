# Aggregation Pipeline

## Overview
Aggregation pipeline processes documents through stages, each transforming the data.

## Common Stages

```javascript
db.orders.aggregate([
  // $match - Filter documents
  { $match: { status: "completed" } },
  
  // $group - Group and aggregate
  { $group: {
    _id: "$customerId",
    totalSpent: { $sum: "$total" },
    orderCount: { $sum: 1 },
    avgOrder: { $avg: "$total" }
  }},
  
  // $sort - Sort results
  { $sort: { totalSpent: -1 } },
  
  // $limit - Limit results
  { $limit: 10 },
  
  // $project - Shape output
  { $project: {
    customer: "$_id",
    totalSpent: 1,
    orderCount: 1,
    _id: 0
  }}
]);
```

## Aggregation Operators

```javascript
// Math
$sum, $avg, $min, $max, $multiply, $divide

// Array
$push, $addToSet, $first, $last

// String
$concat, $substr, $toLower, $toUpper

// Date
$year, $month, $day, $hour

// Conditional
$cond, $ifNull, $switch
```

## Examples

```javascript
// Sales by category
db.products.aggregate([
  { $group: {
    _id: "$category",
    totalSales: { $sum: { $multiply: ["$price", "$quantity"] } }
  }}
]);

// Top customers
db.orders.aggregate([
  { $group: { _id: "$customerId", total: { $sum: "$amount" } }},
  { $sort: { total: -1 }},
  { $limit: 5 }
]);
```

---

[← Previous: Design Patterns](./02-design-patterns.md) | [Next: Indexing →](./04-indexing.md)
