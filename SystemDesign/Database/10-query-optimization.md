# Query Optimization

## Overview

### 💡 **What is Query Optimization?**

Query optimization is the process of improving database query performance through better query writing, indexing, and database configuration. The goal is to minimize response time and resource usage.

**Key Principles:**

1. **Use Indexes Effectively**: Ensure queries use available indexes
2. **Minimize Data Retrieved**: Select only needed columns and rows
3. **Avoid N+1 Queries**: Batch operations and use JOINs
4. **Understand Query Plans**: Use EXPLAIN to analyze execution

---

## Analysis Tools

### 📊 **EXPLAIN Plan**

**PostgreSQL:**

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 12345;

-- Output shows:
-- Seq Scan on orders  (cost=0.00..18334.00 rows=10 width=100)
--   Filter: (user_id = 12345)
-- Planning Time: 0.123 ms
-- Execution Time: 234.567 ms
```

**Key Metrics:**

| Metric | Meaning |
|--------|---------|
| **cost** | Estimated resource usage (lower is better) |
| **rows** | Estimated number of rows returned |
| **width** | Average row size in bytes |
| **Execution Time** | Actual query duration |

**Scan Types:**

| Type | Speed | When Used |
|------|-------|-----------|
| **Index Scan** | Fast | Using index |
| **Index Only Scan** | Fastest | Covering index |
| **Bitmap Scan** | Moderate | Multiple indexes combined |
| **Seq Scan** | Slow | No suitable index |

---

## Optimization Techniques

### 🎯 **Use Indexes**

**Before (Slow):**

```sql
-- No index: Sequential scan
SELECT * FROM users WHERE email = 'john@example.com';
-- Execution time: 450ms (1M rows scanned)
```

**After (Fast):**

```sql
-- Create index
CREATE INDEX idx_users_email ON users(email);

-- Now uses index
SELECT * FROM users WHERE email = 'john@example.com';
-- Execution time: 2ms (index seek)
```

---

### 📉 **Select Only Needed Columns**

**Bad:**

```sql
-- Retrieves all columns (inefficient)
SELECT * FROM orders WHERE user_id = 12345;
```

**Good:**

```sql
-- Only needed columns
SELECT order_id, total, created_at FROM orders WHERE user_id = 12345;
-- Faster: Less data transferred, may use covering index
```

---

### 🔁 **Avoid N+1 Queries**

**Bad (N+1 Problem):**

```javascript
// 1 query for users
const users = await db.query('SELECT * FROM users LIMIT 100');

// 100 queries for posts (N+1!)
for (const user of users) {
  user.posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [user.id]);
}
```

**Good (JOIN or Batch):**

```sql
-- Single query with JOIN
SELECT u.*, p.*
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.id IN (SELECT id FROM users LIMIT 100);
```

---

### ⚡ **Use WHERE Instead of HAVING**

**Bad:**

```sql
-- HAVING filters after aggregation (slow)
SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
HAVING user_id = 12345;
```

**Good:**

```sql
-- WHERE filters before aggregation (fast)
SELECT user_id, COUNT(*) as order_count
FROM orders
WHERE user_id = 12345
GROUP BY user_id;
```

---

### 🔢 **Limit Results**

**Bad:**

```sql
-- Returns all rows (potentially millions)
SELECT * FROM logs;
```

**Good:**

```sql
-- Limit + pagination
SELECT * FROM logs ORDER BY created_at DESC LIMIT 100 OFFSET 0;
```

---

### 📍 **Partition Large Tables**

```sql
-- Partition by date range
CREATE TABLE orders (
  order_id BIGINT,
  user_id BIGINT,
  total DECIMAL(10,2),
  created_at DATE
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2024_q1 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Query only searches relevant partition
SELECT * FROM orders WHERE created_at >= '2024-01-01' AND created_at < '2024-04-01';
-- Only scans orders_2024_q1 partition
```

---

## Interview Question

### Q: How would you optimize a slow query?

**Answer:**

**Step-by-Step Approach:**

**1. Analyze with EXPLAIN:**

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';

-- Output:
-- Seq Scan on orders (cost=0.00..18334.00 rows=50000)
--   Filter: (status = 'pending')
-- Execution Time: 2345ms
```

**Problem Identified:** Sequential scan, no index

**2. Create Index:**

```sql
CREATE INDEX idx_orders_status ON orders(status);

-- Re-run EXPLAIN
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';

-- Output:
-- Index Scan using idx_orders_status (cost=0.42..1234.56 rows=50000)
-- Execution Time: 45ms
```

**Improvement:** 2345ms → 45ms (52x faster)

**3. Check if Index is Used:**

If index not used, possible reasons:

**a) Low Selectivity:**

```sql
-- If 95% of rows have status='pending', index not worth it
-- Solution: Use partial index for minority value
CREATE INDEX idx_orders_completed ON orders(status) WHERE status = 'completed';
```

**b) Function on Column:**

```sql
-- Bad: Function prevents index use
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- Good: Functional index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

**c) OR Conditions:**

```sql
-- Bad: OR prevents index use
SELECT * FROM orders WHERE status = 'pending' OR user_id = 12345;

-- Good: Use UNION
SELECT * FROM orders WHERE status = 'pending'
UNION
SELECT * FROM orders WHERE user_id = 12345;
```

**4. Optimize Query Structure:**

```sql
-- Bad: SELECT *
SELECT * FROM orders WHERE user_id = 12345;

-- Good: Specific columns + covering index
CREATE INDEX idx_orders_user_covering ON orders(user_id) INCLUDE (order_id, total);
SELECT order_id, total FROM orders WHERE user_id = 12345;
```

**5. Consider Denormalization:**

```sql
-- Bad: Multiple JOINs
SELECT o.*, u.name, p.name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id;

-- Good: Denormalize for read-heavy workload
CREATE TABLE orders_denormalized (
  order_id BIGINT,
  user_id BIGINT,
  user_name VARCHAR(100),  -- Denormalized
  product_name VARCHAR(255),  -- Denormalized
  total DECIMAL(10,2)
);
```

---

## Common Performance Pitfalls

### ❌ **Implicit Type Conversion**

```sql
-- Bad: user_id is INT, but comparing with string
SELECT * FROM orders WHERE user_id = '12345';
-- Forces type conversion, prevents index use

-- Good: Use correct type
SELECT * FROM orders WHERE user_id = 12345;
```

### ❌ **NOT IN with NULL Values**

```sql
-- Bad: NOT IN doesn't handle NULL correctly
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM deleted_users);
-- If deleted_users.user_id has NULL, returns no rows!

-- Good: Use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (SELECT 1 FROM deleted_users d WHERE d.user_id = u.id);
```

### ❌ **SELECT DISTINCT on Large Result Sets**

```sql
-- Bad: DISTINCT on large dataset
SELECT DISTINCT user_id FROM orders;  -- Slow on millions of rows

-- Good: Use GROUP BY or index
SELECT user_id FROM orders GROUP BY user_id;
```

---

## Summary

### Key Takeaways

1. **Always use EXPLAIN** to understand query execution
2. **Create indexes** on frequently queried columns
3. **Select only needed columns** to reduce data transfer
4. **Avoid N+1 queries** by using JOINs or batching
5. **Partition large tables** by time or other dimensions
6. **Monitor query performance** and optimize bottlenecks

### Optimization Checklist

- [ ] Indexes on WHERE, JOIN, ORDER BY columns
- [ ] SELECT specific columns (not SELECT *)
- [ ] WHERE instead of HAVING when possible
- [ ] LIMIT results for pagination
- [ ] Avoid functions on indexed columns
- [ ] Use covering indexes for hot queries
- [ ] Partition tables > 100M rows
- [ ] Monitor with EXPLAIN ANALYZE

---
[← Back to SystemDesign](../README.md)
