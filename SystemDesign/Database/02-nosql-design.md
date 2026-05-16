# NoSQL Database Design

## 💡 Why NoSQL Exists

SQL databases scale vertically — you buy a bigger machine. NoSQL databases scale horizontally — you add more machines. They trade some query power and consistency guarantees for massive scale and schema flexibility.

Pick NoSQL when you have high write volume, unpredictable schema, or simple access patterns that don't need JOINs.

---

## The 4 NoSQL Types

| Type | Data Model | Primary Use Case | Examples |
|------|-----------|-----------------|---------|
| **Document** | JSON-like documents | User profiles, product catalogs, CMS | MongoDB, CouchDB |
| **Key-Value** | Simple key → value map | Caching, sessions, feature flags | Redis, DynamoDB |
| **Column-Family** | Rows with dynamic columns | Time-series, IoT, logs | Cassandra, HBase |
| **Graph** | Nodes and edges | Social networks, fraud detection | Neo4j, Amazon Neptune |

**Quick decision flow:**

```
Traversing complex relationships? → Graph DB
Flexible nested documents, rich queries? → Document DB
Simple key lookups, sub-ms latency? → Key-Value Store
High write throughput, time-ordered data? → Column-Family
```

---

## Document Databases (MongoDB)

### 💡 Concept

Store data as self-contained JSON documents. Related data lives together in one document — no JOINs needed for common reads.

**How it works:**

```typescript
// A product document — all data in one place
interface Product {
  _id: string;
  name: string;
  price: number;
  variants: Array<{ color: string; stock: number }>;
  tags: string[];
  createdAt: Date;
}
```

**When to use:**

- ✅ Schema changes often (adding new fields is free)
- ✅ Data is naturally nested (user + address + preferences)
- ✅ You query whole documents by ID or simple filter
- ❌ You need JOINs across many collections
- ❌ Strong transactional consistency across documents

**Embedding vs referencing:**

```typescript
// Embed when data is always read together
interface Order {
  _id: string;
  userId: string;
  items: Array<{         // embedded — read with every order
    productName: string;
    quantity: number;
    price: number;
  }>;
}

// Reference when data is large or shared
interface Post {
  _id: string;
  authorId: string;      // reference — author profile is fetched separately
  content: string;
}
```

> Embed when you always read the child with the parent. Reference when the child is large, shared, or queried independently.

**MongoDB index example:**

```typescript
// Compound index for a common filter + sort pattern
db.orders.createIndex({ userId: 1, createdAt: -1 });

// Sparse index — only index documents where the field exists
db.users.createIndex({ phoneNumber: 1 }, { sparse: true });
```

---

## Key-Value Stores (Redis / DynamoDB)

### 💡 Concept

Store values by a unique key. Lookup is O(1). No query language — you get a value by its exact key.

**How it works:**

```typescript
// Redis — in-memory key-value store
// Cache user session with TTL
await redis.setEx(`session:${sessionId}`, 3600, JSON.stringify(sessionData));

// Retrieve it
const raw = await redis.get(`session:${sessionId}`);
const session = raw ? JSON.parse(raw) : null;
```

**DynamoDB access pattern:**

```typescript
// DynamoDB — key-value at scale
// Table: Orders | PK: userId | SK: orderId
const result = await dynamodb.query({
  TableName: "Orders",
  KeyConditionExpression: "userId = :uid AND orderId BETWEEN :start AND :end",
  ExpressionAttributeValues: {
    ":uid": { S: "user-123" },
    ":start": { S: "2024-01-01" },
    ":end": { S: "2024-12-31" },
  },
});
```

**When to use:**

- ✅ Caching (session data, computed results)
- ✅ Rate limiting counters
- ✅ Feature flags
- ✅ Leaderboards (Redis sorted sets)
- ❌ Complex queries or multiple access patterns without a secondary index

---

## Column-Family Stores (Cassandra)

### 💡 Concept

Data is organized by partition key. All data for one key lives together on one node. Write throughput is extremely high because writes are append-only.

**How it works:**

```sql
-- Cassandra query language (CQL)
-- Table designed for "get all readings for a device, newest first"
CREATE TABLE sensor_readings (
  device_id  UUID,
  recorded_at TIMESTAMP,
  temperature FLOAT,
  humidity    FLOAT,
  PRIMARY KEY (device_id, recorded_at)
) WITH CLUSTERING ORDER BY (recorded_at DESC);
```

**Design rule:** The table structure follows the query, not the entity. Design your table around how you query it.

**When to use:**

- ✅ Append-heavy workloads (logs, metrics, events)
- ✅ Time-series data with predictable query patterns
- ✅ Need to handle millions of writes per second
- ❌ Ad-hoc queries with unknown filter columns
- ❌ Data that needs frequent updates or deletes

---

## Graph Databases (Neo4j)

### 💡 Concept

Store data as nodes (entities) and edges (relationships). Traversing relationships is a first-class operation — not a JOIN.

**How it works:**

```typescript
// Cypher query — "friends of friends who like the same movies"
const query = `
  MATCH (user:User {id: $userId})-[:FOLLOWS]->(:User)-[:LIKED]->(movie:Movie)
  WHERE NOT (user)-[:LIKED]->(movie)
  RETURN movie.title, COUNT(*) AS score
  ORDER BY score DESC
  LIMIT 10
`;
```

**When to use:**

- ✅ Social graphs (followers, connections)
- ✅ Recommendation engines
- ✅ Fraud detection (relationship patterns)
- ✅ Knowledge graphs
- ❌ Simple CRUD with no relationship traversal needed

---

## NoSQL Type Comparison

| Factor | Document | Key-Value | Column-Family | Graph |
|--------|----------|-----------|---------------|-------|
| Query flexibility | Medium | Low | Low | High (for graphs) |
| Write throughput | High | Very high | Extremely high | Medium |
| Read latency | Low | Very low | Low | Low |
| Schema flexibility | High | High | Medium | Medium |
| Consistency | Configurable | Eventual | Tunable | ACID (Neo4j) |
| Horizontal scale | ✅ | ✅ | ✅ | Limited |

---

## Common Mistakes

❌ **Modeling NoSQL like SQL** — don't try to normalize. Design around access patterns.

❌ **Unbounded arrays in documents** — a document that grows without limit will hit size limits and slow reads.

❌ **Wrong partition key in Cassandra** — a bad partition key creates hotspots. One partition handles all the load.

❌ **Using MongoDB for everything** — key-value lookups with no queries → use Redis. Time-series → use Cassandra.

---

## Interview Answer Template

> "I'd pick MongoDB here because the data is document-shaped — each product has nested variants and attributes that vary per category. Schema changes are frequent early on, and MongoDB handles that without migrations. I'd embed the variants in the product document since they're always read together, but reference the category separately since it's shared. For access patterns, I'd create a compound index on category and price for browse queries. If write volume spikes significantly, Cassandra would be the next option — but I'd start with MongoDB for flexibility."
