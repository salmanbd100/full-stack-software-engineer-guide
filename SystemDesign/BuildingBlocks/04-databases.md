# Databases

## 💡 **Concept**

Choosing the right database is one of the most consequential system design decisions. The wrong choice causes pain at scale that is expensive to undo.

**The core question:** does your data have a fixed schema with complex relationships (SQL), or flexible structure at massive scale (NoSQL)?

---

## SQL vs NoSQL Decision Framework

| | SQL (Relational) | NoSQL |
|---|---|---|
| **Schema** | Fixed, enforced | Flexible or schema-less |
| **Relationships** | JOINs, foreign keys | Denormalized, embedded |
| **Consistency** | ACID by default | BASE (eventually consistent) |
| **Scale pattern** | Vertical first, then read replicas | Horizontal sharding |
| **Query flexibility** | Rich (any column, any join) | Limited (partition key required) |
| **Transactions** | Multi-table, multi-row | Often single-document or none |
| **Best for** | Financial data, user accounts, orders | Activity feeds, sessions, time-series, caches |

---

## ACID vs BASE

**ACID (SQL guarantee):**
- **Atomic** — all steps of a transaction succeed or none do
- **Consistent** — DB moves from one valid state to another
- **Isolated** — concurrent transactions don't interfere
- **Durable** — committed data survives crashes

**BASE (NoSQL trade-off):**
- **Basically Available** — system stays up even during failures
- **Soft state** — data may be inconsistent temporarily
- **Eventually Consistent** — all nodes converge to the same value eventually

---

## Database Comparison

| Database | Type | Consistency | Scale target | Best for |
|---|---|---|---|---|
| **PostgreSQL** | Relational SQL | ACID | Vertical + read replicas | User accounts, orders, finance |
| **MySQL** | Relational SQL | ACID | Vertical + read replicas | Web apps, e-commerce |
| **MongoDB** | Document (NoSQL) | Tunable | Horizontal sharding | Catalogs, CMS, variable schema |
| **DynamoDB** | Key-value (NoSQL) | Eventually consistent | Unlimited (managed) | Sessions, carts, IoT, leaderboards |
| **Cassandra** | Wide-column (NoSQL) | Eventually consistent | Linear horizontal | Activity feeds, time-series, write-heavy |
| **Redis** | In-memory key-value | Eventual (persistence optional) | Horizontal | Caching, sessions, rate limiting, pub/sub |
| **Elasticsearch** | Search engine | Eventual | Horizontal | Full-text search, log analytics |

---

## TypeScript Repository Pattern

An abstraction that decouples business logic from the database implementation:

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, "id" | "createdAt">): Promise<User>;
  update(id: string, data: Partial<Pick<User, "name">>): Promise<User>;
  delete(id: string): Promise<void>;
}

// PostgreSQL implementation
class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: DatabasePool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query<User>(
      "SELECT id, email, name, created_at FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const result = await this.db.query<User>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *",
      [data.email, data.name]
    );
    return result.rows[0];
  }

  // ... other methods
}

// DynamoDB implementation — same interface, different internals
class DynamoUserRepository implements UserRepository {
  constructor(private readonly client: DynamoDBDocumentClient) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.client.send(new GetCommand({
      TableName: "Users",
      Key: { id },
    }));
    return (result.Item as User) ?? null;
  }

  // ...
}
```

---

## When to Choose Which Database

### Choose PostgreSQL when:
- Data has complex relationships (orders → line items → products)
- You need multi-table transactions
- Schema is well-defined and stable
- Reporting and ad-hoc queries are important

### Choose DynamoDB / Cassandra when:
- Write throughput is very high (> 50k writes/sec)
- You know the access patterns up front
- Data partitions naturally by user ID, device ID, or time
- Global distribution is required (DynamoDB Global Tables)

### Choose Redis when:
- You need sub-millisecond reads
- Data fits in memory (hot tier only)
- Use cases: session store, rate limiting, leaderboards, pub/sub

### Choose MongoDB when:
- Schema changes frequently
- Data is document-shaped (blog posts, product catalogs)
- You want horizontal scaling with flexible queries

---

## Polyglot Persistence

Large systems use multiple databases for different purposes:

```
User accounts    → PostgreSQL  (ACID, relationships)
Product catalog  → MongoDB     (flexible schema, fast reads)
Shopping cart    → Redis       (fast reads/writes, ephemeral)
Activity feed    → Cassandra   (write-heavy, time-ordered)
Search           → Elasticsearch (full-text, faceted)
```

---

## Common Mistakes

❌ **Using NoSQL to avoid data modeling** — NoSQL requires thinking about access patterns up front. Random queries are painful without indexes.

❌ **Using PostgreSQL for everything** — a 10M writes/sec IoT stream will overwhelm any relational DB. Match tool to workload.

❌ **Ignoring the N+1 problem** — querying users, then looping to query each user's orders. Use JOINs or batch loading.

❌ **No indexes on JOIN / WHERE columns** — unindexed queries on large tables cause full table scans.

✅ **Default to PostgreSQL** — it handles most workloads well. Switch only when you have a concrete reason.

---

## Real-World Example

A social platform uses PostgreSQL for user accounts and followers (complex relationships, ACID needed), Cassandra for activity feeds (write-heavy, time-ordered, fan-out to millions), Redis for session storage and rate limiting (sub-millisecond reads), and Elasticsearch for user and post search. Each database does what it is best at — none is forced outside its strength.

---

## Key Insight

> Start with PostgreSQL. It handles more than most engineers expect. Add a specialized database only when you have a measured, concrete bottleneck it would solve.

**Related:** [Database Scaling](../Scalability/05-database-scaling.md) · [SQL Design](../Database/01-sql-design.md)

---

[← Back to SystemDesign](../README.md)
