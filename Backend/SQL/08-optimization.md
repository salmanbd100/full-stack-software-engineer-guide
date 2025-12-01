# Query Optimization

## N+1 Problem

The N+1 problem occurs when you make 1 query to fetch N items, then N additional queries to fetch related data.

```javascript
// ❌ N+1 Problem: 1 + N queries
const users = await User.findAll();  // 1 query
for (const user of users) {
  const posts = await Post.findAll({ where: { userId: user.id } });  // N queries
}

// ✅ Solution: Eager loading
const users = await User.findAll({
  include: [Post]  // 1 query with JOIN
});
```

## Query Optimization Techniques

### 1. Use Appropriate Indexes

```sql
-- Add index on frequently queried columns
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_user_id ON orders(user_id);
```

### 2. Select Only Needed Columns

```sql
-- ❌ Bad
SELECT * FROM users;

-- ✅ Good
SELECT id, name, email FROM users;
```

### 3. Limit Results

```sql
-- Pagination
SELECT * FROM users LIMIT 20 OFFSET 40;
```

### 4. Avoid Subqueries in SELECT

```sql
-- ❌ Slow
SELECT
  name,
  (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
FROM users;

-- ✅ Faster
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### 5. Use EXISTS Instead of COUNT

```sql
-- ❌ Slower
SELECT * FROM users WHERE (SELECT COUNT(*) FROM orders WHERE user_id = users.id) > 0;

-- ✅ Faster
SELECT * FROM users WHERE EXISTS (SELECT 1 FROM orders WHERE user_id = users.id);
```

### 6. Batch Operations

```javascript
// ❌ Multiple queries
for (const user of users) {
  await User.update({ status: 'active' }, { where: { id: user.id } });
}

// ✅ Single query
await User.update({ status: 'active' }, { where: { id: { [Op.in]: userIds } } });
```

## Connection Pooling

```javascript
// TypeORM
{
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'mydb',
  extra: {
    max: 10,  // Maximum connections
    min: 2,   // Minimum connections
    idleTimeoutMillis: 30000
  }
}
```

## Caching Strategies

### 1. Query Result Caching

```javascript
// Cache frequently accessed data
const users = await cache.wrap('all_users', async () => {
  return await User.findAll();
}, { ttl: 300 });  // 5 minutes
```

### 2. Database Query Cache

```sql
-- MySQL Query Cache (deprecated in 8.0)
SET SESSION query_cache_type = ON;
```

### 3. Application-Level Caching

```javascript
const Redis = require('redis');
const client = Redis.createClient();

// Cache user
await client.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

// Get cached user
const cached = await client.get(`user:${id}`);
```

## Database Optimization

### 1. Analyze Queries

```sql
-- MySQL
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

### 2. Optimize Table Structure

```sql
-- Analyze table
ANALYZE TABLE users;

-- Optimize table
OPTIMIZE TABLE users;

-- Check table
CHECK TABLE users;
```

### 3. Partitioning

```sql
CREATE TABLE orders (
  id INT,
  order_date DATE,
  total DECIMAL(10,2)
) PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024)
);
```

## Interview Questions

**Q: What is the N+1 problem?**
A: Making 1 query to fetch N items, then N additional queries for related data. Solution: eager loading with JOINs.

**Q: How do you optimize slow queries?**
A:
1. Add appropriate indexes
2. Use EXPLAIN to analyze
3. Select only needed columns
4. Avoid subqueries in SELECT
5. Use connection pooling
6. Implement caching

**Q: What is connection pooling?**
A: Reusing database connections instead of creating new ones for each request. Improves performance significantly.

**Q: When should you use caching?**
A: For frequently accessed, rarely changed data. Use Redis/Memcached for distributed caching.

## Best Practices

✅ Profile queries with EXPLAIN
✅ Index foreign keys and WHERE columns
✅ Use connection pooling
✅ Implement caching for read-heavy data
✅ Batch operations when possible
✅ Monitor slow queries
✅ Use read replicas for scaling reads
❌ Don't over-index
❌ Don't cache everything
❌ Don't ignore N+1 problems
❌ Don't use SELECT *

## Summary

- Prevent N+1 with eager loading
- Use indexes strategically
- Implement connection pooling
- Cache frequently accessed data
- Use EXPLAIN to analyze queries
- Batch operations when possible
- Monitor and optimize slow queries

---

[← Previous: Migrations](./07-migrations.md) | [Back to Backend →](../README.md)
