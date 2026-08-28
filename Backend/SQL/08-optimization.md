# Query Optimisation {#ch-query-optimisation}

> Take a slow query and find out why, rather than guessing at an index.

**In this chapter:** the N+1 problem · reading a query plan · batching writes · connection pooling · caching · what to measure

## N+1 Problem

The N+1 problem occurs when you make 1 query to fetch N items, then N additional queries to fetch related data.

```typescript
// ❌ N+1 problem — 1 query for the list, then N more inside the loop
const users: User[] = await User.findAll();
for (const user of users) {
  const posts: Post[] = await Post.findAll({ where: { userId: user.id } });
}

// ✅ Eager loading — the database does the join, so it stays one round trip
const usersWithPosts: User[] = await User.findAll({
  include: [Post],
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

```typescript
import { Op } from 'sequelize';

// ❌ One UPDATE per row — N round trips
for (const user of users) {
  await User.update({ status: 'active' }, { where: { id: user.id } });
}

// ✅ One UPDATE for the whole set
const userIds: number[] = users.map((user: User): number => user.id);
await User.update({ status: 'active' }, { where: { id: { [Op.in]: userIds } } });
```

## Connection Pooling

```typescript
import { DataSource, type DataSourceOptions } from 'typeorm';

const options: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: process.env.DB_PASSWORD,
  database: 'mydb',
  extra: {
    max: 10, // Ceiling. Size it to the database's connection limit, not the app's
    min: 2, // Floor. Keeps a warm connection so the first request is not slow
    idleTimeoutMillis: 30_000,
  },
};

const dataSource = new DataSource(options);
```

## Caching Strategies

### 1. Query Result Caching

```typescript
// Cache-aside: the cache answers if it can, the database only on a miss
const users: User[] = await cache.wrap<User[]>(
  'all_users',
  async (): Promise<User[]> => User.findAll(),
  { ttl: 300 }, // seconds — short enough that stale data self-corrects
);
```

### 2. Database Query Cache

```sql
-- MySQL Query Cache (deprecated in 8.0)
SET SESSION query_cache_type = ON;
```

### 3. Application-Level Caching

```typescript
import { createClient, type RedisClientType } from 'redis';

const client: RedisClientType = createClient();
await client.connect();

// Write through, with an expiry. A cache entry with no TTL is a memory leak
await client.set(`user:${id}`, JSON.stringify(user), { EX: 3600 });

// Read back. `null` means a miss, so the caller must fall through to the database
const cached: string | null = await client.get(`user:${id}`);
const user: User | null = cached === null ? null : (JSON.parse(cached) as User);
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
