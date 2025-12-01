# PostgreSQL

## Overview

PostgreSQL is an advanced open-source relational database known for reliability, robustness, and performance.

## PostgreSQL-Specific Features

### JSONB Data Type

```sql
-- Store JSON
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  attributes JSONB
);

INSERT INTO products (name, attributes) VALUES
  ('Laptop', '{"brand": "Dell", "ram": 16, "ssd": 512}');

-- Query JSON
SELECT * FROM products WHERE attributes->>'brand' = 'Dell';
SELECT * FROM products WHERE attributes->>'ram' = '16';

-- Index JSON
CREATE INDEX idx_attributes ON products USING gin(attributes);

-- Update JSON
UPDATE products SET attributes = attributes || '{"warranty": "2 years"}'
WHERE id = 1;
```

### Arrays

```sql
-- Array column
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  tags TEXT[]
);

INSERT INTO posts (title, tags) VALUES
  ('PostgreSQL Tutorial', ARRAY['database', 'sql', 'postgres']);

-- Query arrays
SELECT * FROM posts WHERE 'database' = ANY(tags);
SELECT * FROM posts WHERE tags @> ARRAY['sql'];
```

### Full-Text Search

```sql
-- Add tsvector column
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- Update search vector
UPDATE articles SET search_vector =
  to_tsvector('english', title || ' ' || content);

-- Create index
CREATE INDEX idx_search ON articles USING gin(search_vector);

-- Search
SELECT * FROM articles
WHERE search_vector @@ to_tsquery('english', 'database & optimization');
```

### Window Functions

```sql
-- Rank employees by salary per department
SELECT
  name,
  department,
  salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank
FROM employees;
```

### CTEs and Recursive Queries

```sql
-- Recursive CTE for hierarchy
WITH RECURSIVE employee_tree AS (
  SELECT id, name, manager_id, 0 as level
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, et.level + 1
  FROM employees e
  JOIN employee_tree et ON e.manager_id = et.id
)
SELECT * FROM employee_tree;
```

### UUID

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(100) UNIQUE
);
```

## Performance Features

### EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';
```

### Materialized Views

```sql
CREATE MATERIALIZED VIEW user_stats AS
SELECT user_id, COUNT(*) as order_count, SUM(total) as total_spent
FROM orders
GROUP BY user_id;

-- Refresh
REFRESH MATERIALIZED VIEW user_stats;
```

### Partitioning

```sql
-- Range partitioning
CREATE TABLE orders (
  id SERIAL,
  order_date DATE,
  total DECIMAL(10,2)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2023 PARTITION OF orders
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
```

## Interview Questions

**Q: What is JSONB?**
A: Binary JSON storage in PostgreSQL. More efficient than JSON type, supports indexing with GIN indexes.

**Q: Difference between JSON and JSONB?**
A: JSON stores exact text, JSONB stores binary format. JSONB is faster for queries but slower for inserts.

**Q: What are PostgreSQL advantages over MySQL?**
A: JSONB support, full-text search, better SQL standard compliance, advanced data types, extensibility.

## Best Practices

✅ Use JSONB for semi-structured data
✅ Index JSONB columns with GIN
✅ Use appropriate data types (UUID, ARRAY)
✅ Leverage CTEs for complex queries
✅ Use EXPLAIN ANALYZE for optimization

---

[← Previous: Transactions](./04-transactions.md) | [Next: ORMs →](./06-orms.md)
