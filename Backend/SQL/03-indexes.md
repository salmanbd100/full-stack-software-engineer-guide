# Indexes & Optimization

## Overview

Indexes improve query performance by creating data structures that allow fast data retrieval. Understanding indexes is crucial for database optimization and is frequently tested in interviews.

## What is an Index?

An index is a data structure that improves data retrieval speed. Like a book index, it helps find data without scanning every row.

**Trade-offs:**
- ✅ Faster SELECT queries
- ❌ Slower INSERT/UPDATE/DELETE
- ❌ Additional storage space

## Index Types

### Primary Key Index

```sql
-- Automatically creates unique index
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100)
);
```

### Unique Index

```sql
-- Ensures uniqueness
CREATE UNIQUE INDEX idx_email ON users(email);

-- Or with constraint
ALTER TABLE users ADD UNIQUE (email);
```

### Single Column Index

```sql
CREATE INDEX idx_last_name ON users(last_name);
```

### Composite Index (Multi-Column)

```sql
-- Order matters! Can use for (last_name) or (last_name, first_name)
CREATE INDEX idx_name ON users(last_name, first_name);

-- Can use index for:
WHERE last_name = 'Smith';  -- ✅ Uses index
WHERE last_name = 'Smith' AND first_name = 'John';  -- ✅ Uses index
WHERE first_name = 'John';  -- ❌ Doesn't use index (not leftmost)
```

### Full-Text Index

```sql
-- For text searching
CREATE FULLTEXT INDEX idx_content ON articles(title, content);

-- Use with MATCH AGAINST
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('database optimization');
```

### Spatial Index (MySQL)

```sql
-- For geographic data
CREATE SPATIAL INDEX idx_location ON stores(location);
```

## Creating Indexes

```sql
-- Create index
CREATE INDEX idx_name ON users(name);

-- Create unique index
CREATE UNIQUE INDEX idx_email ON users(email);

-- Create composite index
CREATE INDEX idx_city_country ON addresses(city, country);

-- Create index on expression (PostgreSQL)
CREATE INDEX idx_lower_email ON users(LOWER(email));

-- Drop index
DROP INDEX idx_name ON users;

-- Show indexes
SHOW INDEX FROM users;
```

## When to Use Indexes

### ✅ Good Candidates for Indexing

```sql
-- Foreign keys
CREATE INDEX idx_user_id ON orders(user_id);

-- Columns in WHERE clause
CREATE INDEX idx_status ON orders(status);

-- Columns in JOIN conditions
CREATE INDEX idx_product_id ON order_items(product_id);

-- Columns in ORDER BY
CREATE INDEX idx_created_at ON posts(created_at);

-- Columns in GROUP BY
CREATE INDEX idx_category ON products(category_id);
```

### ❌ Poor Candidates for Indexing

- Small tables (< 1000 rows)
- Columns with low cardinality (few unique values)
- Frequently updated columns
- Large text/blob columns

## Query Optimization

### EXPLAIN Statement

```sql
-- Analyze query execution
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';
```

### Using Indexes Effectively

```sql
-- ✅ Uses index
SELECT * FROM users WHERE email = 'john@example.com';

-- ❌ Doesn't use index (function on column)
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- ✅ Solution: functional index (PostgreSQL)
CREATE INDEX idx_lower_email ON users(LOWER(email));

-- ❌ Doesn't use index (leading wildcard)
SELECT * FROM users WHERE name LIKE '%john%';

-- ✅ Uses index
SELECT * FROM users WHERE name LIKE 'john%';

-- ❌ Doesn't use index (OR on different columns)
SELECT * FROM users WHERE first_name = 'John' OR last_name = 'Doe';

-- ✅ Better: UNION
SELECT * FROM users WHERE first_name = 'John'
UNION
SELECT * FROM users WHERE last_name = 'Doe';
```

### Composite Index Strategies

```sql
-- Index on (a, b, c)
CREATE INDEX idx_abc ON table(a, b, c);

-- Can be used for:
WHERE a = 1;                    -- ✅
WHERE a = 1 AND b = 2;          -- ✅
WHERE a = 1 AND b = 2 AND c = 3;-- ✅
WHERE a = 1 AND c = 3;          -- ⚠️ Partial (only uses a)

-- Cannot be used for:
WHERE b = 2;                    -- ❌
WHERE c = 3;                    -- ❌
WHERE b = 2 AND c = 3;          -- ❌
```

## Covering Index

An index that contains all columns needed for a query.

```sql
-- Query
SELECT id, name, email FROM users WHERE status = 'active';

-- Covering index (no table lookup needed)
CREATE INDEX idx_covering ON users(status, id, name, email);
```

## Index Maintenance

```sql
-- Analyze table (update statistics)
ANALYZE TABLE users;

-- Optimize table (defragment)
OPTIMIZE TABLE users;

-- Check index usage (MySQL)
SELECT * FROM sys.schema_unused_indexes;

-- PostgreSQL: Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

## Query Optimization Techniques

### 1. Avoid SELECT *

```sql
-- ❌ Bad
SELECT * FROM users WHERE id = 1;

-- ✅ Good
SELECT id, name, email FROM users WHERE id = 1;
```

### 2. Use LIMIT

```sql
-- ✅ Good for pagination
SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 40;
```

### 3. Avoid N+1 Queries

```sql
-- ❌ Bad: N+1 queries
SELECT * FROM posts;  -- 1 query
-- Then for each post:
SELECT * FROM users WHERE id = post.author_id;  -- N queries

-- ✅ Good: JOIN
SELECT p.*, u.name
FROM posts p
LEFT JOIN users u ON p.author_id = u.id;
```

### 4. Use EXISTS Instead of IN for Large Sets

```sql
-- ❌ Slower for large subquery results
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);

-- ✅ Faster
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.total > 1000
);
```

### 5. Partition Tables

```sql
-- Range partitioning (MySQL)
CREATE TABLE orders (
  id INT,
  order_date DATE,
  total DECIMAL(10,2)
)
PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p2021 VALUES LESS THAN (2022),
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024)
);
```

## Interview Questions

### Q1: What is an index and how does it work?

**Answer:**
An index is a data structure (usually B-tree) that stores sorted references to table data, allowing fast lookups without scanning entire tables. Like a book index pointing to page numbers.

### Q2: What is the difference between clustered and non-clustered index?

**Answer:**
- **Clustered**: Physical order of data matches index order (usually primary key), one per table
- **Non-clustered**: Separate structure with pointers to data, multiple per table

### Q3: When should you NOT use an index?

**Answer:**
- Small tables
- Low cardinality columns (e.g., gender with 2-3 values)
- Frequently updated columns
- When insert/update performance is critical

### Q4: What is a covering index?

**Answer:**
An index containing all columns needed for a query, eliminating the need to access the table. Improves performance significantly.

### Q5: How do composite indexes work?

**Answer:**
Composite indexes use multiple columns in specified order. Can only be used when leftmost columns are in WHERE clause.

## Best Practices

### ✅ Do's

1. **Index foreign keys**
2. **Index WHERE, JOIN, ORDER BY columns**
3. **Use composite indexes** for common query patterns
4. **Monitor index usage** and remove unused indexes
5. **Use EXPLAIN** to analyze queries
6. **Consider covering indexes**

### ❌ Don'ts

1. **Don't index everything**
2. **Don't use functions on indexed columns**
3. **Don't use leading wildcards** in LIKE
4. **Don't create duplicate indexes**
5. **Don't forget to maintain indexes**

## Summary

- Indexes speed up reads, slow down writes
- Use for foreign keys, WHERE, JOIN, ORDER BY
- Composite indexes: order matters
- Use EXPLAIN to analyze queries
- Avoid SELECT *, N+1 queries, functions on indexed columns
- Monitor and maintain indexes regularly

---

[← Previous: Database Design](./02-database-design.md) | [Next: Transactions & ACID →](./04-transactions.md)
