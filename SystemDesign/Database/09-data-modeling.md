# Data Modeling

---

## 💡 The Core Question

Before writing a single table or document, ask: **what queries must be fast?** Data modeling is query-first design. The best model for a write-heavy OLTP system looks nothing like the best model for an analytics dashboard.

---

## Entity Relationships

Three relationship types drive most modeling decisions.

| Relationship | SQL pattern | NoSQL pattern |
|-------------|-------------|---------------|
| **One-to-one** | Foreign key on either table | Embed the sub-document |
| **One-to-many** | Foreign key on the "many" side | Embed (small) or reference (large) |
| **Many-to-many** | Junction table | Array of IDs or duplicate data |

---

## Normalization vs Denormalization

### Normalized (3NF) — SQL default

Each fact lives in exactly one place. Updates are cheap, reads need JOINs.

```typescript
// TypeScript interfaces for a normalized e-commerce schema

interface User {
  id: number;
  name: string;
  email: string;
}

interface Product {
  id: number;
  name: string;
  priceInCents: number;
  categoryId: number;
}

interface Order {
  id: number;
  userId: number;       // FK → users
  createdAt: Date;
  totalInCents: number;
}

interface OrderItem {
  id: number;
  orderId: number;      // FK → orders
  productId: number;    // FK → products
  quantity: number;
  priceInCents: number; // snapshot of price at purchase time
}
```

```sql
-- Reading an order requires JOINs
SELECT o.id, u.name, p.name, oi.quantity
FROM orders o
JOIN users u         ON u.id = o.user_id
JOIN order_items oi  ON oi.order_id = o.id
JOIN products p      ON p.id = oi.product_id
WHERE o.id = 42;
```

✅ No data duplication — updating a product name updates everywhere.
❌ JOINs are expensive at scale. Four-table JOINs on 50M row tables hurt.

### Denormalized — read-optimized

Duplicate data into one table to avoid JOINs. Writes become more complex; reads become trivial.

```typescript
// Denormalized: everything for one order in a single document or wide row
interface OrderFlat {
  orderId: number;
  userId: number;
  userName: string;         // duplicated from users
  userEmail: string;        // duplicated from users
  productId: number;
  productName: string;      // duplicated from products
  categoryName: string;     // duplicated from categories
  quantity: number;
  priceInCents: number;
  createdAt: Date;
}
```

```sql
-- No JOINs needed
SELECT * FROM orders_flat WHERE user_id = 123;
```

✅ Fast reads, perfect for dashboards and reporting.
❌ If `product.name` changes, you must update every row that duplicated it.

### When to Choose Each

| Situation | Choose |
|-----------|--------|
| OLTP — frequent small writes | Normalized |
| OLAP / reporting / analytics | Denormalized |
| Product name or price must update everywhere instantly | Normalized |
| Read performance is critical and writes are rare | Denormalized |
| You don't know the query patterns yet | Normalize first, denormalize later |

> Normalize for correctness. Denormalize for performance. Never denormalize prematurely — measure first.

---

## SQL: Choosing Primary Keys

| Key type | When to use | Trade-off |
|----------|-------------|-----------|
| **Serial / BIGINT** | Single-server OLTP | Sequential, index-friendly, but predictable and non-portable |
| **UUID v4** | Distributed inserts from multiple services | Globally unique, but random = index fragmentation |
| **UUID v7 / ULID** | Distributed + time-ordered | Best of both — globally unique and sequential |
| **Composite** | Many-to-many junction tables | Natural key, no surrogate needed |

```sql
-- UUID v7 (time-ordered) — recommended for distributed systems
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- use a v7 generator in practice
  user_id BIGINT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## NoSQL: Embedded Documents vs References

The core decision in document databases (MongoDB, Firestore) is whether to **embed** sub-data or store it separately and **reference** it.

### Embed When

- Data is always fetched together (one read, no extra query)
- The sub-data is small and bounded (an address, a handful of tags)
- The sub-data belongs exclusively to the parent (doesn't need its own lifecycle)

```typescript
// Embed: user's shipping addresses live inside the user document
interface UserDocument {
  _id: string;
  name: string;
  email: string;
  addresses: Array<{          // embedded — always loaded with the user
    label: string;
    street: string;
    city: string;
    zip: string;
  }>;
}
```

### Reference When

- The sub-data is large or grows without bound (a user's posts over years)
- The sub-data is shared across multiple parents
- You need to query the sub-data independently

```typescript
// Reference: posts live in their own collection
interface UserDocument {
  _id: string;
  name: string;
  email: string;
  // no posts here — query the posts collection by userId
}

interface PostDocument {
  _id: string;
  userId: string;   // reference back to users
  content: string;
  createdAt: Date;
  likesCount: number;
}
```

```typescript
// Two queries, but posts collection stays manageable
const user = await db.collection('users').findOne({ _id: userId });
const posts = await db.collection('posts')
  .find({ userId })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();
```

---

## NoSQL: DynamoDB Key Design

DynamoDB requires you to declare your access patterns at design time. The partition key determines which node stores the data. The sort key enables range queries within a partition.

```typescript
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

// Table: Orders
// PK: userId (partition key)  SK: createdAt (sort key)
// Access pattern: "get all orders for user X after date Y"

const db = new DynamoDBClient({ region: 'us-east-1' });

const result = await db.send(new QueryCommand({
  TableName: 'Orders',
  KeyConditionExpression: 'userId = :uid AND createdAt > :since',
  ExpressionAttributeValues: {
    ':uid':   { S: userId },
    ':since': { S: '2024-01-01T00:00:00Z' }
  },
  ScanIndexForward: false   // descending by sort key = newest first
}));
```

**Hot partition problem:** If every write goes to the same partition key (e.g., `date = today`), one node handles all traffic. Add a random suffix or use a composite key to spread load.

---

## Fan-Out Pattern (Social Feeds)

Social feeds require a design choice between two strategies:

| Strategy | Write path | Read path | Best for |
|----------|-----------|-----------|----------|
| **Fan-out on write** | Write tweet to every follower's feed | Single DB read | Most users (< 10K followers) |
| **Fan-out on read** | Write tweet once | Merge celebrity tweets at read time | Celebrity accounts |

```typescript
async function publishTweet(authorId: string, content: string): Promise<void> {
  const tweet = await tweetsCol.insertOne({ authorId, content, createdAt: new Date() });
  const followers = await followersCol.find({ followingId: authorId }).toArray();

  if (followers.length < 10_000) {
    // Fan-out on write — push to each follower's feed
    const feedDocs = followers.map(f => ({
      ownerId: f.followerId,
      tweetId: tweet.insertedId,
      authorId,
      content,                    // denormalized — no extra read at feed time
      createdAt: new Date()
    }));
    await feedsCol.insertMany(feedDocs);
  }
  // For celebrities, the feed read merges the pre-computed feed with a live query
}

async function getFeed(userId: string): Promise<FeedItem[]> {
  return feedsCol
    .find({ ownerId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}
```

---

## Common Mistakes

❌ **Designing SQL tables without knowing query patterns** — you end up with full table scans and multi-JOIN queries at scale.

❌ **Embedding unbounded arrays in MongoDB documents** — a user document with 100K embedded comments hits the 16 MB document limit and slows all reads of that document.

❌ **Using MongoDB like a relational DB** — doing application-level JOINs in a loop is the NoSQL N+1 problem. Use `$lookup` for occasional joins or denormalize.

❌ **Storing everything in one DynamoDB partition key** — all traffic routes to one node. Model partition keys to distribute load evenly.

---

## Key Insight

> There is no universally correct data model. A normalized SQL schema is correct for OLTP and wrong for analytics. An embedded MongoDB document is correct for a user's addresses and wrong for a user's lifetime posts. Model for your dominant access pattern, then add secondary indexes or materialized views for the others.

---

## Interview Answer Template

> "Data modeling starts with access patterns — what queries need to be fast? For OLTP I default to 3NF SQL: no duplication, easy updates, foreign keys enforce integrity. When reads become the bottleneck I denormalize into wider tables or separate read models.
>
> For NoSQL I decide embed vs reference based on data size and access frequency. Small, always-co-accessed data goes embedded. Large, independently-queried data goes in its own collection with a reference.
>
> For DynamoDB I design partition and sort keys around the queries I need, then add GSIs for secondary access patterns. The fan-out pattern for social feeds is a good example — fan-out on write is fast for reads but expensive for celebrities, so hybrid systems fan out for normal users and do a live merge for high-follower accounts."

---

[← Back to Database](./README.md)
