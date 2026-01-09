# Data Modeling Best Practices

## Overview

### 💡 **What is Data Modeling?**

Data modeling is the process of designing how data is stored, organized, and accessed in a database. Good data modeling balances normalization, performance, and scalability.

**Key Principles:**

1. **Model for Access Patterns**: Design based on how data is queried
2. **Denormalize When Needed**: Trade storage for read performance
3. **Plan for Scale**: Consider future growth
4. **Balance Trade-offs**: No perfect model exists

---

## SQL Data Modeling

### 📐 **Normalization Levels**

**1NF to 3NF Trade-offs:**

| Form | Pros | Cons | Use When |
|------|------|------|----------|
| **1NF** | Simple | Lots of duplicates | Never (baseline) |
| **2NF** | Less duplication | Still has redundancy | Rare |
| **3NF** | No redundancy | Many JOINs | OLTP systems |
| **Denormalized** | Fast reads | Redundancy, update anomalies | Read-heavy, OLAP |

**Example - E-commerce Orders:**

**3NF (Normalized):**

```sql
-- Orders table
CREATE TABLE orders (
  order_id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  created_at TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  item_id BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES orders(order_id),
  product_id BIGINT REFERENCES products(product_id),
  quantity INT,
  price DECIMAL(10,2)
);

-- Query requires JOIN
SELECT o.*, oi.*, p.name
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.user_id = 12345;
```

**Denormalized (for read performance):**

```sql
-- Single table with all data
CREATE TABLE orders_denormalized (
  order_id BIGINT,
  user_id BIGINT,
  user_name VARCHAR(100),  -- Denormalized from users
  product_id BIGINT,
  product_name VARCHAR(255),  -- Denormalized from products
  quantity INT,
  price DECIMAL(10,2),
  created_at TIMESTAMP
);

-- Fast query, no JOINs
SELECT * FROM orders_denormalized WHERE user_id = 12345;
```

---

### 🔑 **Choosing Primary Keys**

| Key Type | Pros | Cons | Use When |
|----------|------|------|----------|
| **Auto-increment** | Simple, sequential | Predictable, not globally unique | Single database |
| **UUID** | Globally unique, distributed-friendly | Large (16 bytes), not sequential | Multi-region, microservices |
| **Snowflake ID** | Sequential + unique, time-ordered | Requires coordination | Distributed systems |
| **Composite** | Natural grouping | Complex JOINs | Many-to-many relationships |

**Example - UUID vs Auto-increment:**

```sql
-- Auto-increment (traditional)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,  -- 1, 2, 3, ...
  username VARCHAR(50)
);
-- Pros: Small, fast, sequential
-- Cons: Not globally unique, bottleneck in distributed systems

-- UUID (distributed)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50)
);
-- Pros: Globally unique, no coordination needed
-- Cons: Larger index, not sequential (worse for B-Tree)
```

---

## NoSQL Data Modeling

### 📄 **Document Databases (MongoDB)**

**Embedding vs Referencing:**

**Embed When:**
- Data is always accessed together
- One-to-few relationships
- Data doesn't change frequently

```javascript
// Embed address in user document
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  address: {  // Embedded
    street: "123 Main St",
    city: "NYC",
    zip: "10001"
  }
}
```

**Reference When:**
- Data accessed separately
- One-to-many or many-to-many
- Data updated frequently

```javascript
// Reference posts in user document
{
  _id: ObjectId("..."),
  name: "John Doe",
  postIds: [  // Reference
    ObjectId("post1"),
    ObjectId("post2")
  ]
}

// Separate post documents
{
  _id: ObjectId("post1"),
  userId: ObjectId("..."),
  title: "My Post",
  content: "..."
}
```

---

### 🔑 **Key-Value Stores (Redis, DynamoDB)**

**Design Patterns:**

**1. Partition Key + Sort Key:**

```javascript
// DynamoDB table design
{
  TableName: 'Orders',
  KeySchema: [
    { AttributeName: 'userId', KeyType: 'HASH' },     // Partition key
    { AttributeName: 'createdAt', KeyType: 'RANGE' }  // Sort key
  ]
}

// Query pattern: Get user's recent orders
const params = {
  TableName: 'Orders',
  KeyConditionExpression: 'userId = :userId AND createdAt > :date',
  ExpressionAttributeValues: {
    ':userId': '12345',
    ':date': '2024-01-01'
  }
};
```

**2. Composite Key Pattern:**

```javascript
// Combine multiple attributes in key
const key = `user:${userId}:session:${sessionId}`;
await redis.set(key, sessionData, 'EX', 3600);
```

---

### 📊 **Column-Family (Cassandra)**

**Design for Queries:**

```sql
-- Anti-pattern: Design like SQL
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  name TEXT,
  email TEXT
);
-- Problem: Can only query by user_id

-- Best practice: Design for query patterns
-- Pattern 1: Get user by ID
CREATE TABLE users_by_id (
  user_id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP
);

-- Pattern 2: Get users by email
CREATE TABLE users_by_email (
  email TEXT PRIMARY KEY,
  user_id UUID,
  name TEXT,
  created_at TIMESTAMP
);

-- Trade-off: Duplicate data, but optimized queries
```

---

## Common Patterns

### 🔄 **Time-Series Data**

**Pattern:**

```sql
-- Partition by time bucket
CREATE TABLE metrics (
  metric_name VARCHAR(100),
  time_bucket DATE,           -- Partition key
  timestamp TIMESTAMP,         -- Sort key
  value DOUBLE,
  PRIMARY KEY ((metric_name, time_bucket), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Query recent data efficiently
SELECT * FROM metrics
WHERE metric_name = 'cpu_usage'
  AND time_bucket = '2024-01-15'
  AND timestamp > '2024-01-15 10:00:00';
```

---

### 👤 **User Activity Feed**

**Fan-out on Write:**

```javascript
// When user posts
async function createPost(userId, content) {
  const post = await db.posts.create({ userId, content });

  // Fan-out to all followers' feeds
  const followers = await db.followers.find({ following: userId });

  const feedEntries = followers.map(follower => ({
    userId: follower._id,
    postId: post._id,
    createdAt: new Date()
  }));

  await db.feeds.insertMany(feedEntries);
}

// Read feed (fast!)
async function getFeed(userId) {
  return await db.feeds.find({ userId }).sort({ createdAt: -1 }).limit(50);
}
```

---

### 🛒 **Shopping Cart**

**Pattern - Append-Only + Aggregation:**

```sql
-- Append-only cart events
CREATE TABLE cart_events (
  user_id BIGINT,
  event_id UUID,
  event_type VARCHAR(20),  -- 'ADD', 'REMOVE', 'UPDATE'
  product_id BIGINT,
  quantity INT,
  timestamp TIMESTAMP
);

-- Materialize current cart state
CREATE MATERIALIZED VIEW current_cart AS
SELECT user_id, product_id, SUM(quantity) as quantity
FROM cart_events
GROUP BY user_id, product_id
HAVING SUM(quantity) > 0;
```

---

## Anti-Patterns

### ❌ **Don't: Over-Normalize for OLAP**

```sql
-- Bad: Too many JOINs for analytics
SELECT COUNT(*)
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
WHERE c.name = 'Electronics';
-- 4 JOINs for simple analytics query!

-- Good: Denormalized for analytics
SELECT COUNT(*) FROM orders_flat WHERE category = 'Electronics';
```

---

### ❌ **Don't: Use NoSQL Like SQL**

```javascript
// Bad: Trying to JOIN in application code
const users = await db.users.find({});
const posts = await db.posts.find({});

// Manual JOIN (slow!)
const results = users.map(user => ({
  ...user,
  posts: posts.filter(post => post.userId === user._id)
}));

// Good: Denormalize or use proper references
const results = await db.users.aggregate([
  { $lookup: {
      from: 'posts',
      localField: '_id',
      foreignField: 'userId',
      as: 'posts'
    }
  }
]);
```

---

### ❌ **Don't: Ignore Access Patterns**

```sql
-- Bad: Generic table design
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type VARCHAR(50),
  data JSONB,
  created_at TIMESTAMP
);

-- Query is slow (full table scan)
SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT 100;

-- Good: Design for access pattern
CREATE TABLE events (
  user_id UUID,
  created_at TIMESTAMP,
  event_type VARCHAR(50),
  data JSONB,
  PRIMARY KEY (user_id, created_at)
) PARTITION BY RANGE (created_at);
```

---

## Interview Question

### Q: How would you model a Twitter-like social media feed?

**Answer:**

**Requirements Analysis:**

- Users post tweets
- Users follow other users
- Users see feed of tweets from people they follow
- High read:write ratio (more reads than writes)

**Approach: Fan-out on Write**

**Schema:**

```javascript
// Users collection
{
  _id: ObjectId,
  username: String,
  followersCount: Number,
  followingCount: Number
}

// Tweets collection
{
  _id: ObjectId,
  userId: ObjectId,
  content: String,
  createdAt: Date,
  likesCount: Number,
  retweetsCount: Number
}

// Followers collection
{
  followerId: ObjectId,
  followingId: ObjectId,
  createdAt: Date
}

// Feed collection (denormalized)
{
  userId: ObjectId,  // Whose feed this is
  tweetId: ObjectId,
  authorId: ObjectId,
  authorUsername: String,  // Denormalized
  content: String,          // Denormalized
  createdAt: Date
}
```

**Write Path (Fan-out on Write):**

```javascript
async function createTweet(userId, content) {
  // 1. Create tweet
  const tweet = await db.tweets.create({
    userId,
    content,
    createdAt: new Date()
  });

  // 2. Get followers
  const followers = await db.followers.find({ followingId: userId });

  // 3. Fan-out to followers' feeds
  const feedEntries = followers.map(follower => ({
    userId: follower.followerId,  // Feed owner
    tweetId: tweet._id,
    authorId: userId,
    authorUsername: username,     // Denormalized
    content: content,              // Denormalized
    createdAt: tweet.createdAt
  }));

  await db.feeds.insertMany(feedEntries);
}
```

**Read Path (Fast):**

```javascript
async function getFeed(userId, limit = 50) {
  return await db.feeds
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
  // No JOINs needed!
}
```

**Trade-offs:**

✅ **Pros:**
- Fast reads (no JOINs)
- Scales well for read-heavy workload
- Real-time feed updates

❌ **Cons:**
- High write cost (celebrity problem)
- Storage duplication
- Eventual consistency

**Optimization for Celebrities:**

```javascript
// Hybrid approach
async function createTweet(userId, content) {
  const user = await db.users.findOne({ _id: userId });

  if (user.followersCount < 10000) {
    // Fan-out on write (normal users)
    await fanOutOnWrite(userId, content);
  } else {
    // Fan-out on read (celebrities)
    await db.tweets.create({ userId, content });
  }
}

async function getFeed(userId) {
  // Combine pre-computed feed + celebrity tweets
  const [precomputedFeed, celebrityTweets] = await Promise.all([
    db.feeds.find({ userId }).limit(50),
    getCelebrityTweets(userId)
  ]);

  return mergeFeedsSorted(precomputedFeed, celebrityTweets);
}
```

---

## Summary

### Key Takeaways

1. **Design for Access Patterns**: Model based on how data is queried
2. **Denormalize for Reads**: Trade storage for performance
3. **Choose Right Database**: SQL for complex queries, NoSQL for scale
4. **Plan for Scale**: Partition data, use sharding strategies

### Best Practices

| Practice | SQL | NoSQL |
|----------|-----|-------|
| **Normalization** | 3NF for OLTP, denormalize for OLAP | Denormalize aggressively |
| **Primary Keys** | Auto-increment or UUID | Composite keys for query patterns |
| **Relationships** | Foreign keys, JOINs | Embed or reference based on access |
| **Indexes** | B-Tree on query columns | Secondary indexes on partition/sort keys |

---
[← Back to SystemDesign](../README.md)
