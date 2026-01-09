# NoSQL Database Design

## Table of Contents
- [Overview](#overview)
- [Types of NoSQL Databases](#types-of-nosql-databases)
- [Document Databases](#document-databases)
- [Key-Value Stores](#key-value-stores)
- [Column-Family Stores](#column-family-stores)
- [Graph Databases](#graph-databases)
- [Data Modeling Patterns](#data-modeling-patterns)
- [Schema Design](#schema-design)
- [Implementation Examples](#implementation-examples)
- [Interview Questions](#interview-questions)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

---

## Overview

### 💡 **NoSQL Databases**

Non-relational databases designed for distributed data storage, horizontal scalability, and flexible schemas.

**Why NoSQL:**

NoSQL databases solve specific problems that traditional SQL databases struggle with:
- Massive scale (billions of records)
- Unstructured or semi-structured data
- Rapid schema evolution
- Horizontal scalability
- High write throughput
- Low latency at scale

**Key Characteristics:**

1. **Schema Flexibility:**
   - No fixed schema
   - Different documents can have different fields
   - Easy to evolve over time

2. **Horizontal Scalability:**
   - Add more servers to handle load
   - Distribute data across nodes
   - Linear performance scaling

3. **Eventual Consistency:**
   - Prioritize availability over consistency
   - Data eventually becomes consistent
   - Faster writes, relaxed reads

---

## Types of NoSQL Databases

### 💡 **Four Main Categories**

| Type | Best For | Examples | Use Cases |
|------|----------|----------|-----------|
| **Document** | Flexible schemas, complex queries | MongoDB, CouchDB | Content management, user profiles, catalogs |
| **Key-Value** | Simple lookups, caching | Redis, DynamoDB | Sessions, caching, real-time analytics |
| **Column-Family** | Time-series, analytics | Cassandra, HBase | IoT data, metrics, logs |
| **Graph** | Relationships, networks | Neo4j, Neptune | Social networks, recommendations, fraud detection |

**Decision Tree:**

```
Need relationships/connections? → Graph DB
  ↓ NO
Need complex queries on documents? → Document DB
  ↓ NO
Need simple key lookups? → Key-Value Store
  ↓ NO
Need wide columns/time-series? → Column-Family Store
```

---

## Document Databases

### 💡 **MongoDB-Style Document Store**

Store data as JSON-like documents with flexible schemas.

### Core Concepts

**Document Structure:**

```javascript
// User document
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "john_doe",
  "email": "john@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 30,
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY"
    }
  },
  "interests": ["programming", "music", "travel"],
  "createdAt": ISODate("2024-01-01T00:00:00Z")
}
```

### Data Modeling Patterns

#### **1. Embedding (Denormalization)**

Store related data together in a single document.

**When to Embed:**
- ✅ One-to-one relationships
- ✅ One-to-few relationships (< 100 items)
- ✅ Data accessed together
- ✅ Atomic updates needed

**Example: Blog Post with Comments**

```javascript
// Embedded comments (good for < 100 comments)
{
  "_id": ObjectId("..."),
  "title": "Introduction to NoSQL",
  "content": "...",
  "author": {
    "userId": ObjectId("..."),
    "name": "Jane Doe",
    "avatar": "https://..."
  },
  "comments": [
    {
      "commentId": ObjectId("..."),
      "userId": ObjectId("..."),
      "username": "john_doe",
      "text": "Great article!",
      "createdAt": ISODate("2024-01-02")
    },
    {
      "commentId": ObjectId("..."),
      "userId": ObjectId("..."),
      "username": "alice",
      "text": "Very informative",
      "createdAt": ISODate("2024-01-03")
    }
  ],
  "tags": ["nosql", "databases", "tutorial"],
  "createdAt": ISODate("2024-01-01")
}
```

**Pros:**
- Single query to get all data
- Atomic updates (update post and comments together)
- Better read performance
- Data locality

**Cons:**
- Document size limits (16MB in MongoDB)
- Difficult to query embedded data independently
- Data duplication
- Can't efficiently paginate embedded arrays

#### **2. Referencing (Normalization)**

Store relationships using references between documents.

**When to Reference:**
- ✅ One-to-many with many items (> 100)
- ✅ Many-to-many relationships
- ✅ Data needs independent querying
- ✅ Frequently updated data

**Example: Blog Post with Many Comments**

```javascript
// Posts collection
{
  "_id": ObjectId("post123"),
  "title": "Introduction to NoSQL",
  "content": "...",
  "authorId": ObjectId("user456"),  // Reference
  "tags": ["nosql", "databases"],
  "commentCount": 5000,  // Denormalized count
  "createdAt": ISODate("2024-01-01")
}

// Comments collection (separate)
{
  "_id": ObjectId("comment789"),
  "postId": ObjectId("post123"),  // Reference to post
  "userId": ObjectId("user789"),   // Reference to user
  "username": "john_doe",          // Denormalized for performance
  "text": "Great article!",
  "createdAt": ISODate("2024-01-02")
}

// Query: Get post with paginated comments
db.posts.findOne({ _id: ObjectId("post123") })
db.comments
  .find({ postId: ObjectId("post123") })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(20)
```

**Pros:**
- No document size limits
- Easy to query comments independently
- Can paginate comments
- No duplication

**Cons:**
- Multiple queries required
- More complex application code
- Potential consistency issues

#### **3. Hybrid Approach**

Combine embedding and referencing for optimal performance.

```javascript
// Post with embedded recent comments + references for all
{
  "_id": ObjectId("post123"),
  "title": "Introduction to NoSQL",
  "content": "...",
  "author": {  // Embedded author info
    "userId": ObjectId("user456"),
    "name": "Jane Doe",
    "avatar": "https://..."
  },
  "recentComments": [  // Embed last 3 comments
    {
      "commentId": ObjectId("comment789"),
      "username": "john_doe",
      "text": "Great!",
      "createdAt": ISODate("2024-01-03")
    }
  ],
  "commentCount": 5000,
  "stats": {
    "views": 10000,
    "likes": 500
  },
  "tags": ["nosql", "databases"],
  "createdAt": ISODate("2024-01-01")
}

// Full comments in separate collection
// (same as referencing pattern)
```

### Schema Design Examples

#### **E-commerce Product Catalog**

```javascript
// Products collection
{
  "_id": ObjectId("..."),
  "sku": "LAPTOP-001",
  "name": "MacBook Pro 14-inch",
  "description": "Powerful laptop...",
  "price": {
    "amount": 1999.99,
    "currency": "USD"
  },
  "inventory": {
    "quantity": 50,
    "warehouse": "NYC-01",
    "lastUpdated": ISODate("2024-01-10")
  },
  "specifications": {  // Flexible schema
    "processor": "M3 Pro",
    "ram": "16GB",
    "storage": "512GB SSD",
    "display": "14.2-inch Retina"
  },
  "categories": ["Electronics", "Computers", "Laptops"],
  "images": [
    {
      "url": "https://cdn.example.com/laptop-1.jpg",
      "alt": "Front view",
      "primary": true
    }
  ],
  "reviews": {  // Summary only, full reviews separate
    "averageRating": 4.5,
    "totalReviews": 127,
    "distribution": {
      "5": 80,
      "4": 30,
      "3": 10,
      "2": 5,
      "1": 2
    }
  },
  "isActive": true,
  "createdAt": ISODate("2024-01-01"),
  "updatedAt": ISODate("2024-01-10")
}
```

#### **User Profile with Activity**

```javascript
// Users collection
{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "username": "johndoe",
  "passwordHash": "...",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": ISODate("1990-01-01"),
    "avatar": "https://...",
    "bio": "Software engineer..."
  },
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": false
    }
  },
  "security": {
    "twoFactorEnabled": true,
    "lastPasswordChange": ISODate("2024-01-01")
  },
  "metadata": {
    "lastLogin": ISODate("2024-01-10T10:30:00Z"),
    "loginCount": 150,
    "createdAt": ISODate("2023-01-01"),
    "updatedAt": ISODate("2024-01-10")
  }
}

// Activity log (separate collection)
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "eventType": "purchase",
  "details": {
    "orderId": "ORD-123",
    "amount": 99.99
  },
  "timestamp": ISODate("2024-01-10T10:30:00Z")
}
```

---

## Key-Value Stores

### 💡 **Redis-Style Key-Value Store**

Simple data structure: key → value. Extremely fast for lookups.

### Common Patterns

#### **1. Session Storage**

```javascript
// Key: "session:abc123def456"
// Value: JSON string
{
  "userId": "user123",
  "username": "johndoe",
  "email": "john@example.com",
  "loginTime": "2024-01-10T10:00:00Z",
  "permissions": ["read", "write"]
}

// TTL: 3600 seconds (1 hour)
```

```javascript
// Node.js with Redis
const redis = require('redis');
const client = redis.createClient();

// Set session
await client.setEx(
  'session:abc123',
  3600,  // Expire in 1 hour
  JSON.stringify(sessionData)
);

// Get session
const session = JSON.parse(
  await client.get('session:abc123')
);

// Delete session (logout)
await client.del('session:abc123');
```

#### **2. Caching**

```javascript
// Cache database query results
const cacheKey = `user:${userId}`;

// Try cache first
let user = await redis.get(cacheKey);

if (!user) {
  // Cache miss - query database
  user = await db.users.findOne({ _id: userId });

  // Store in cache for 5 minutes
  await redis.setEx(
    cacheKey,
    300,
    JSON.stringify(user)
  );
} else {
  user = JSON.parse(user);
}
```

#### **3. Rate Limiting**

```javascript
// Allow 100 requests per minute
const key = `rate:${userId}:${minute}`;

const count = await redis.incr(key);

if (count === 1) {
  // First request in this minute - set expiry
  await redis.expire(key, 60);
}

if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

#### **4. Real-time Analytics**

```javascript
// Page view counter
await redis.incr('pageviews:total');
await redis.incr(`pageviews:${date}`);
await redis.incr(`pageviews:${userId}`);

// Trending posts (sorted set)
await redis.zIncrBy('trending:posts', 1, postId);

// Get top 10 trending posts
const trending = await redis.zRevRange('trending:posts', 0, 9);
```

### Common Data Structures

| Structure | Use Case | Example |
|-----------|----------|---------|
| **String** | Simple values, JSON | `"user:123" → "John Doe"` |
| **Hash** | Object fields | `"user:123" → {name: "John", age: 30}` |
| **List** | Queues, logs | `"queue:jobs" → [job1, job2, job3]` |
| **Set** | Unique items | `"tags:post123" → {tag1, tag2}` |
| **Sorted Set** | Rankings, leaderboards | `"leaderboard" → {user1: 100, user2: 90}` |

---

## Column-Family Stores

### 💡 **Cassandra-Style Wide Column Store**

Organize data in rows and columns, but columns can vary per row.

**Data Model:**

```
Table: user_activity

Row Key: user_id
┌─────────────┬────────────────┬────────────────┬────────────────┐
│ Row Key     │ timestamp:t1   │ timestamp:t2   │ timestamp:t3   │
├─────────────┼────────────────┼────────────────┼────────────────┤
│ user_123    │ login          │ purchase       │ logout         │
│ user_456    │ pageview       │ click          │ (sparse)       │
└─────────────┴────────────────┴────────────────┴────────────────┘
```

**When to Use:**
- ✅ Time-series data
- ✅ Write-heavy workloads
- ✅ Horizontal scalability required
- ✅ High availability needed

**Example: IoT Sensor Data**

```sql
-- CQL (Cassandra Query Language)
CREATE TABLE sensor_readings (
    sensor_id UUID,
    timestamp TIMESTAMP,
    temperature DECIMAL,
    humidity DECIMAL,
    pressure DECIMAL,
    PRIMARY KEY (sensor_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Insert reading
INSERT INTO sensor_readings (sensor_id, timestamp, temperature, humidity, pressure)
VALUES (uuid(), toTimestamp(now()), 22.5, 65.0, 1013.25);

-- Query recent readings
SELECT * FROM sensor_readings
WHERE sensor_id = 550e8400-e29b-41d4-a716-446655440000
AND timestamp > '2024-01-10 00:00:00'
ORDER BY timestamp DESC
LIMIT 100;
```

---

## Graph Databases

### 💡 **Neo4j-Style Graph Database**

Store data as nodes (entities) and relationships (edges).

**Data Model:**

```
    (User:John)
        │
        ├──[FOLLOWS]──→ (User:Jane)
        │
        └──[LIKES]────→ (Post:123)
                           │
                           └──[CREATED_BY]──→ (User:Alice)
```

**When to Use:**
- ✅ Complex relationships
- ✅ Social networks
- ✅ Recommendation engines
- ✅ Fraud detection
- ✅ Network analysis

### Graph Modeling

**Social Network Example:**

```cypher
// Create users (nodes)
CREATE (john:User {userId: "user123", name: "John Doe", email: "john@example.com"})
CREATE (jane:User {userId: "user456", name: "Jane Smith", email: "jane@example.com"})
CREATE (alice:User {userId: "user789", name: "Alice Johnson", email: "alice@example.com"})

// Create relationships
CREATE (john)-[:FOLLOWS {since: date("2024-01-01")}]->(jane)
CREATE (john)-[:FOLLOWS {since: date("2024-01-05")}]->(alice)
CREATE (jane)-[:FOLLOWS {since: date("2024-01-10")}]->(alice)

// Create posts
CREATE (post1:Post {postId: "post123", title: "Hello World", content: "..."})
CREATE (post2:Post {postId: "post456", title: "GraphDB Tutorial", content: "..."})

// User created posts
CREATE (john)-[:CREATED {createdAt: datetime()}]->(post1)
CREATE (jane)-[:CREATED {createdAt: datetime()}]->(post2)

// User liked posts
CREATE (john)-[:LIKED {likedAt: datetime()}]->(post2)
CREATE (alice)-[:LIKED {likedAt: datetime()}]->(post1)
CREATE (alice)-[:LIKED {likedAt: datetime()}]->(post2)

// Query: Find friends of friends
MATCH (john:User {name: "John Doe"})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(fof)
WHERE NOT (john)-[:FOLLOWS]->(fof) AND john <> fof
RETURN DISTINCT fof.name AS recommendation

// Query: Find popular posts in network
MATCH (john:User {name: "John Doe"})-[:FOLLOWS]->(friend)-[:LIKED]->(post)
RETURN post.title, COUNT(*) AS likes
ORDER BY likes DESC
LIMIT 10
```

**Recommendation Engine:**

```cypher
// Find products similar to what user bought
MATCH (user:User {userId: "user123"})-[:PURCHASED]->(product:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (user)-[:PURCHASED]->(recommendation)
RETURN recommendation.name, COUNT(*) AS score
ORDER BY score DESC
LIMIT 5
```

---

## Data Modeling Patterns

### 💡 **Common NoSQL Patterns**

#### **1. Attribute Pattern**

Store variable attributes as key-value pairs within a document.

**Use Case:** Products with different specifications.

```javascript
// Bad: Fixed schema
{
  "_id": ObjectId("..."),
  "name": "Laptop",
  "cpu": "Intel i7",
  "ram": "16GB",
  "storage": "512GB"
}

// Good: Flexible attributes
{
  "_id": ObjectId("..."),
  "name": "Laptop",
  "category": "Electronics",
  "attributes": [
    { "key": "cpu", "value": "Intel i7" },
    { "key": "ram", "value": "16GB" },
    { "key": "storage", "value": "512GB" }
  ]
}

// Query by any attribute
db.products.createIndex({ "attributes.key": 1, "attributes.value": 1 })
db.products.find({ "attributes": { $elemMatch: { key: "cpu", value: "Intel i7" }}})
```

#### **2. Bucket Pattern**

Group related data into buckets to reduce document count.

**Use Case:** Time-series data, sensor readings.

```javascript
// Bad: One document per reading (millions of docs)
{
  "sensorId": "sensor123",
  "timestamp": ISODate("2024-01-10T10:00:00Z"),
  "temperature": 22.5
}

// Good: Bucket by hour (fewer docs)
{
  "sensorId": "sensor123",
  "bucketDate": ISODate("2024-01-10T10:00:00Z"),
  "readings": [
    { "timestamp": ISODate("2024-01-10T10:00:15Z"), "temp": 22.5 },
    { "timestamp": ISODate("2024-01-10T10:00:30Z"), "temp": 22.7 },
    { "timestamp": ISODate("2024-01-10T10:00:45Z"), "temp": 22.6 }
    // ... up to 60 readings per minute
  ],
  "summary": {
    "avg": 22.6,
    "min": 22.5,
    "max": 22.7
  }
}
```

#### **3. Computed Pattern**

Precompute and store aggregations for fast reads.

```javascript
// Real-time updates with aggregations
{
  "_id": ObjectId("post123"),
  "title": "My Post",
  "content": "...",

  // Computed/aggregated fields
  "stats": {
    "viewCount": 1500,
    "likeCount": 120,
    "commentCount": 45,
    "shareCount": 30,
    "lastViewed": ISODate("2024-01-10T10:30:00Z")
  }
}

// Increment view count
db.posts.updateOne(
  { _id: ObjectId("post123") },
  {
    $inc: { "stats.viewCount": 1 },
    $set: { "stats.lastViewed": new Date() }
  }
)
```

#### **4. Polymorphic Pattern**

Store documents with different schemas in the same collection.

```javascript
// Orders collection with different order types
{
  "_id": ObjectId("..."),
  "orderType": "physical",  // Discriminator
  "userId": ObjectId("..."),
  "items": [...],
  "shippingAddress": {  // Only for physical orders
    "street": "123 Main St",
    "city": "NYC"
  },
  "trackingNumber": "TRACK123"
}

{
  "_id": ObjectId("..."),
  "orderType": "digital",  // Different type
  "userId": ObjectId("..."),
  "items": [...],
  "downloadLinks": [  // Only for digital orders
    { "item": "ebook", "url": "https://..." }
  ],
  "licenseKey": "XXXX-XXXX"
}
```

---

## Schema Design

### SQL vs NoSQL Design Approach

| Aspect | SQL Design | NoSQL Design |
|--------|-----------|--------------|
| **Starting Point** | Data structure | Query patterns |
| **Relationships** | Normalize, use JOINs | Denormalize, embed |
| **Schema** | Fixed upfront | Flexible, evolve |
| **Optimization** | Indexes, query tuning | Data duplication |
| **Transactions** | ACID across tables | Single document |

### Design Process

```
1. Identify access patterns
   ↓
2. Design for most frequent queries
   ↓
3. Decide embed vs reference
   ↓
4. Plan for scalability
   ↓
5. Add indexes for queries
   ↓
6. Denormalize for performance
   ↓
7. Handle data consistency
```

### Embedding vs Referencing Decision

| Factor | Embed | Reference |
|--------|-------|-----------|
| **Relationship** | One-to-few | One-to-many |
| **Data size** | Small (< 100 items) | Large (> 100 items) |
| **Update frequency** | Rarely updated | Frequently updated |
| **Query pattern** | Always together | Sometimes separate |
| **Consistency** | Atomic updates | Eventual consistency |

---

## Implementation Examples

### MongoDB (JavaScript)

```javascript
const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('myapp');

// Create user
async function createUser(userData) {
  const result = await db.collection('users').insertOne({
    username: userData.username,
    email: userData.email,
    passwordHash: userData.passwordHash,
    profile: {
      firstName: userData.firstName,
      lastName: userData.lastName
    },
    preferences: {
      theme: 'light',
      language: 'en'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return result.insertedId;
}

// Get user with recent posts (embedded)
async function getUserWithPosts(userId) {
  return await db.collection('users').aggregate([
    { $match: { _id: new ObjectId(userId) }},
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'userId',
        as: 'posts'
      }
    },
    {
      $project: {
        username: 1,
        email: 1,
        profile: 1,
        recentPosts: { $slice: ['$posts', -10] }  // Last 10 posts
      }
    }
  ]).toArray();
}

// Update nested field
async function updateUserProfile(userId, profileData) {
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        'profile.bio': profileData.bio,
        'profile.avatar': profileData.avatar,
        updatedAt: new Date()
      }
    }
  );
}

// Increment counter (computed pattern)
async function incrementPostViews(postId) {
  await db.collection('posts').updateOne(
    { _id: new ObjectId(postId) },
    {
      $inc: { 'stats.viewCount': 1 },
      $set: { 'stats.lastViewed': new Date() }
    }
  );
}

// Array operations
async function addComment(postId, comment) {
  await db.collection('posts').updateOne(
    { _id: new ObjectId(postId) },
    {
      $push: {
        comments: {
          $each: [comment],
          $slice: -100  // Keep only last 100 comments
        }
      },
      $inc: { 'stats.commentCount': 1 }
    }
  );
}

// Find with complex criteria
async function findProducts(filters) {
  const query = {};

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.minPrice || filters.maxPrice) {
    query['price.amount'] = {};
    if (filters.minPrice) query['price.amount'].$gte = filters.minPrice;
    if (filters.maxPrice) query['price.amount'].$lte = filters.maxPrice;
  }

  if (filters.inStock) {
    query['inventory.quantity'] = { $gt: 0 };
  }

  return await db.collection('products')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}
```

### Python with MongoDB

```python
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

client = MongoClient('mongodb://localhost:27017/')
db = client.myapp

# Create user
def create_user(user_data):
    result = db.users.insert_one({
        'username': user_data['username'],
        'email': user_data['email'],
        'passwordHash': user_data['passwordHash'],
        'profile': {
            'firstName': user_data.get('firstName'),
            'lastName': user_data.get('lastName')
        },
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    })
    return result.inserted_id

# Get user with posts
def get_user_with_posts(user_id):
    pipeline = [
        {'$match': {'_id': ObjectId(user_id)}},
        {
            '$lookup': {
                'from': 'posts',
                'localField': '_id',
                'foreignField': 'userId',
                'as': 'posts'
            }
        },
        {
            '$project': {
                'username': 1,
                'email': 1,
                'profile': 1,
                'recentPosts': {'$slice': ['$posts', -10]}
            }
        }
    ]

    result = list(db.users.aggregate(pipeline))
    return result[0] if result else None

# Update with operators
def update_user_preferences(user_id, preferences):
    db.users.update_one(
        {'_id': ObjectId(user_id)},
        {
            '$set': {
                f'preferences.{key}': value
                for key, value in preferences.items()
            },
            '$currentDate': {'updatedAt': True}
        }
    )

# Array operations
def add_tag_to_post(post_id, tag):
    db.posts.update_one(
        {'_id': ObjectId(post_id)},
        {'$addToSet': {'tags': tag}}  # Add only if not exists
    )
```

---

## Interview Questions

### Q1: How do you model a social media feed in NoSQL?

**Answer:**

**Requirements:**
- Users follow other users
- See posts from followed users
- Real-time updates
- Paginated feed

**Solution: Fan-out on Write**

```javascript
// Users collection
{
  "_id": ObjectId("user123"),
  "username": "johndoe",
  "following": [ObjectId("user456"), ObjectId("user789")],
  "followerCount": 150,
  "followingCount": 200
}

// Posts collection
{
  "_id": ObjectId("post123"),
  "userId": ObjectId("user456"),
  "username": "janedoe",  // Denormalized
  "content": "Hello world!",
  "mediaUrls": ["https://..."],
  "stats": {
    "likes": 42,
    "comments": 5,
    "shares": 3
  },
  "createdAt": ISODate("2024-01-10T10:00:00Z")
}

// Feed collection (fan-out writes)
{
  "_id": ObjectId("..."),
  "userId": ObjectId("user123"),  // Feed owner
  "postId": ObjectId("post123"),
  "authorId": ObjectId("user456"),
  "authorUsername": "janedoe",
  "content": "Hello world!",  // Denormalized
  "stats": {...},
  "createdAt": ISODate("2024-01-10T10:00:00Z")
}
```

**When user creates post:**
```javascript
// 1. Insert post
const post = await db.posts.insertOne(postData);

// 2. Fan out to all followers' feeds
const followers = await db.users
  .find({ following: userId })
  .toArray();

const feedEntries = followers.map(follower => ({
  userId: follower._id,
  postId: post._id,
  authorId: userId,
  ...postData  // Denormalize data
}));

await db.feeds.insertMany(feedEntries);
```

**Get user feed:**
```javascript
// Simple query - no joins!
const feed = await db.feeds
  .find({ userId: currentUserId })
  .sort({ createdAt: -1 })
  .skip(page * 20)
  .limit(20)
  .toArray();
```

**Trade-offs:**
- ✅ Fast reads (no joins)
- ✅ Scales for reads
- ❌ Slow writes (fan-out to many)
- ❌ Storage overhead (duplication)
- ❌ Data consistency challenges

### Q2: When should you use embedding vs referencing in MongoDB?

**Answer:**

| Scenario | Strategy | Reason |
|----------|----------|--------|
| **User + Address** | Embed | 1:1, always accessed together |
| **Blog + Comments (< 50)** | Embed | 1:few, atomic updates |
| **Blog + Comments (> 100)** | Reference | Document size limits, independent queries |
| **Products + Categories** | Reference | Many:many, independent entities |
| **Order + Order Items** | Embed | 1:few, transactional |
| **User + Activity Log** | Reference | 1:many (unbounded), time-series |

**Example: E-commerce Order**

```javascript
// Good: Embed order items
{
  "_id": ObjectId("order123"),
  "userId": ObjectId("user456"),
  "orderDate": ISODate("2024-01-10"),
  "status": "shipped",
  "items": [  // Embedded - fixed at order time
    {
      "productId": ObjectId("prod789"),
      "name": "Laptop",  // Snapshot at purchase time
      "price": 1200,
      "quantity": 1
    }
  ],
  "shipping": {  // Embedded - part of order
    "address": "123 Main St",
    "method": "express"
  },
  "total": 1200
}

// Products collection - referenced, can update independently
{
  "_id": ObjectId("prod789"),
  "name": "Laptop",  // Can change without affecting orders
  "currentPrice": 1100,  // Price may change
  "inventory": 50
}
```

### Q3: How do you handle transactions in NoSQL databases?

**Answer:**

**1. Single Document Transactions (Atomic)**

MongoDB guarantees atomicity at document level:

```javascript
// All updates succeed or fail together
await db.accounts.updateOne(
  { _id: accountId },
  {
    $inc: { balance: -100 },
    $push: {
      transactions: {
        amount: -100,
        type: 'withdrawal',
        timestamp: new Date()
      }
    }
  }
);
```

**2. Multi-Document Transactions (MongoDB 4.0+)**

```javascript
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    // Debit account A
    await db.accounts.updateOne(
      { _id: accountA },
      { $inc: { balance: -100 } },
      { session }
    );

    // Credit account B
    await db.accounts.updateOne(
      { _id: accountB },
      { $inc: { balance: 100 } },
      { session }
    );

    // Record transaction
    await db.transactions.insertOne({
      from: accountA,
      to: accountB,
      amount: 100,
      timestamp: new Date()
    }, { session });
  });
} finally {
  await session.endSession();
}
```

**3. Application-Level Compensation (Saga Pattern)**

```javascript
// Two-Phase Commit simulation
async function transferMoney(fromAccount, toAccount, amount) {
  const transactionId = new ObjectId();

  try {
    // Step 1: Reserve funds (pending state)
    await db.accounts.updateOne(
      { _id: fromAccount, balance: { $gte: amount } },
      {
        $inc: { balance: -amount },
        $push: {
          pendingTransactions: {
            id: transactionId,
            amount: -amount,
            state: 'pending'
          }
        }
      }
    );

    // Step 2: Add funds to receiver
    await db.accounts.updateOne(
      { _id: toAccount },
      {
        $inc: { balance: amount },
        $push: {
          pendingTransactions: {
            id: transactionId,
            amount: amount,
            state: 'pending'
          }
        }
      }
    );

    // Step 3: Commit transaction
    await db.accounts.updateMany(
      { 'pendingTransactions.id': transactionId },
      { $set: { 'pendingTransactions.$.state': 'committed' } }
    );

  } catch (error) {
    // Rollback: Return funds
    await db.accounts.updateOne(
      { _id: fromAccount },
      {
        $inc: { balance: amount },
        $pull: { pendingTransactions: { id: transactionId } }
      }
    );
    throw error;
  }
}
```

**Best Practices:**
- Design schema to minimize cross-document transactions
- Use embedded documents for transactional consistency
- Implement idempotency for retry safety
- Use eventual consistency where acceptable

---

## Best Practices

### Data Modeling

**✅ DO:**

1. **Design for query patterns, not data structure:**
   ```javascript
   // If you always need user + recent posts together:
   // Embed recent posts in user document
   ```

2. **Denormalize for read performance:**
   ```javascript
   {
     "_id": ObjectId("comment123"),
     "postId": ObjectId("post456"),
     "userId": ObjectId("user789"),
     "username": "johndoe",  // Denormalized - avoid join
     "userAvatar": "https://..."  // Denormalized
   }
   ```

3. **Use appropriate data types:**
   ```javascript
   {
     "_id": ObjectId("..."),  // Not string
     "createdAt": ISODate("..."),  // Not string
     "price": NumberDecimal("19.99"),  // Not float for money
     "isActive": true  // Not "true" string
   }
   ```

4. **Index heavily-queried fields:**
   ```javascript
   db.users.createIndex({ email: 1 }, { unique: true });
   db.posts.createIndex({ userId: 1, createdAt: -1 });
   db.products.createIndex({ category: 1, "price.amount": 1 });
   ```

**❌ DON'T:**

1. **Don't normalize like SQL:**
   ```javascript
   // Bad: Too normalized
   // Requires 3 queries to display a post
   Posts → Users → Comments

   // Good: Denormalize where needed
   Post {
     author: { name, avatar },  // Denormalized
     recentComments: [...]      // Embedded
   }
   ```

2. **Don't create unbounded arrays:**
   ```javascript
   // Bad: Array can grow indefinitely
   {
     "postId": "...",
     "comments": [/* thousands of comments */]
   }

   // Good: Reference or use bucket pattern
   ```

3. **Don't ignore document size limits:**
   ```javascript
   // MongoDB: 16MB limit per document
   // Keep documents reasonable size
   ```

### Performance

1. **Use projections to limit returned fields:**
   ```javascript
   // Only fetch needed fields
   db.users.find(
     { status: 'active' },
     { username: 1, email: 1, _id: 0 }
   );
   ```

2. **Use covered queries (index-only):**
   ```javascript
   // Query uses only indexed fields
   db.users.createIndex({ username: 1, email: 1 });
   db.users.find(
     { username: 'johndoe' },
     { username: 1, email: 1, _id: 0 }
   );
   ```

3. **Batch operations:**
   ```javascript
   // Insert multiple documents at once
   await db.posts.insertMany(postsArray);

   // Bulk updates
   const bulkOps = posts.map(post => ({
     updateOne: {
       filter: { _id: post._id },
       update: { $set: { status: 'published' } }
     }
   }));
   await db.posts.bulkWrite(bulkOps);
   ```

---

## Real-World Examples

### Netflix Content Catalog

```javascript
// Content document (flexible schema for movies/series)
{
  "_id": ObjectId("..."),
  "type": "series",
  "title": "Stranger Things",
  "description": "...",
  "releaseYear": 2016,
  "genres": ["Sci-Fi", "Horror", "Drama"],
  "rating": "TV-14",
  "cast": [
    {
      "actorId": ObjectId("..."),
      "name": "Millie Bobby Brown",
      "role": "Eleven",
      "order": 1
    }
  ],
  "seasons": [
    {
      "seasonNumber": 1,
      "episodes": [
        {
          "episodeNumber": 1,
          "title": "Chapter One: The Vanishing of Will Byers",
          "duration": 47,
          "videoId": "vid123",
          "thumbnailUrl": "https://..."
        }
      ]
    }
  ],
  "metadata": {
    "totalSeasons": 4,
    "totalEpisodes": 34,
    "language": "en",
    "subtitles": ["en", "es", "fr"]
  },
  "engagement": {
    "viewCount": 1000000,
    "averageRating": 4.8,
    "completionRate": 0.85
  }
}
```

### Uber Ride History

```javascript
// Ride document
{
  "_id": ObjectId("..."),
  "rideId": "RIDE-123",
  "riderId": ObjectId("..."),
  "driverId": ObjectId("..."),
  "status": "completed",

  // Denormalized user data (snapshot at ride time)
  "rider": {
    "name": "John Doe",
    "phone": "+1234567890",
    "rating": 4.9
  },
  "driver": {
    "name": "Jane Driver",
    "phone": "+1987654321",
    "vehicleInfo": {
      "make": "Toyota",
      "model": "Camry",
      "plate": "ABC123"
    }
  },

  // Embedded trip details
  "trip": {
    "requestedAt": ISODate("2024-01-10T10:00:00Z"),
    "acceptedAt": ISODate("2024-01-10T10:02:00Z"),
    "pickupTime": ISODate("2024-01-10T10:10:00Z"),
    "dropoffTime": ISODate("2024-01-10T10:30:00Z"),

    "pickup": {
      "location": {
        "type": "Point",
        "coordinates": [-73.935242, 40.730610]
      },
      "address": "123 Main St, New York, NY"
    },

    "dropoff": {
      "location": {
        "type": "Point",
        "coordinates": [-73.985428, 40.748817]
      },
      "address": "456 Park Ave, New York, NY"
    },

    "route": {
      "distance": 5.2,  // km
      "duration": 20,   // minutes
      "path": [/* array of coordinates */]
    }
  },

  // Pricing
  "fare": {
    "base": 5.00,
    "perKm": 1.50,
    "perMinute": 0.30,
    "surge": 1.5,  // multiplier
    "subtotal": 12.75,
    "tax": 1.28,
    "total": 14.03,
    "currency": "USD"
  },

  // Ratings (after ride)
  "ratings": {
    "riderRating": 5,
    "driverRating": 5,
    "riderComment": "Great ride!",
    "driverComment": "Friendly passenger"
  }
}
```

---

## Summary

**Key Takeaways:**

1. **NoSQL trades consistency for scalability** and flexibility
2. **Design based on query patterns**, not data structure
3. **Denormalization is normal** in NoSQL for performance
4. **Choose the right NoSQL type** for your use case
5. **Embedded vs referenced** depends on data size and access patterns
6. **Transactions are limited** - design to minimize need

**When to Use NoSQL:**

| Use Case | NoSQL Type |
|----------|------------|
| **Flexible schemas** | Document (MongoDB) |
| **Massive scale** | Any NoSQL type |
| **Caching/sessions** | Key-Value (Redis) |
| **Time-series data** | Column-Family (Cassandra) |
| **Social networks** | Graph (Neo4j) |
| **Real-time analytics** | Key-Value (Redis) |

**Design Checklist:**

- [ ] Identified primary query patterns
- [ ] Decided embed vs reference for relationships
- [ ] Planned for data growth and scaling
- [ ] Added indexes for frequent queries
- [ ] Considered data duplication trade-offs
- [ ] Handled eventual consistency scenarios
- [ ] Tested with realistic data volumes

---

**Further Reading:**
- [MongoDB Data Modeling Guide](https://www.mongodb.com/docs/manual/data-modeling/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Cassandra Data Modeling](https://cassandra.apache.org/doc/latest/data_modeling/)
- [Neo4j Graph Modeling](https://neo4j.com/developer/graph-modeling/)

---
[← Previous: SQL Design](./01-sql-design.md) | [Back to Database Topics](./README.md) | [Next: Sharding →](./03-sharding.md)
