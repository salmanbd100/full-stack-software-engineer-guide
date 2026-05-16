# Database Scaling

## 💡 **Concept**

Databases are almost always the bottleneck at scale. The approach depends on whether reads or writes are the constraint — and whether you can tolerate eventual consistency.

**Strategy order:** cache first → read replicas → connection pooling → CQRS → sharding.

---

## Read vs Write Scaling

Most applications are read-heavy (80–95% reads). Separate read and write scaling strategies:

| Problem | Solution |
|---|---|
| Too many read queries | Read replicas, caching |
| Too many write queries | Connection pooling, write batching, sharding |
| Both reads and writes at scale | CQRS + sharding |
| Connection pool exhaustion | PgBouncer / RDS Proxy |

---

## Read Replicas

Add one or more read-only replicas that receive a stream of writes from the primary. Route all reads to replicas; writes go to primary.

```
Write (INSERT/UPDATE/DELETE)
  → Primary DB

Read (SELECT)
  → Replica 1
  → Replica 2   ← load balanced across replicas
  → Replica 3
```

```typescript
interface DatabasePool {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface DatabaseClients {
  writer: DatabasePool;  // primary — writes + reads requiring freshness
  reader: DatabasePool;  // replica — all other reads
}

async function getUserOrders(
  db: DatabaseClients,
  userId: string
): Promise<Order[]> {
  // safe to use replica — eventual consistency is fine for listing orders
  const result = await db.reader.query<Order>(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

async function createOrder(
  db: DatabaseClients,
  order: NewOrder
): Promise<Order> {
  const result = await db.writer.query<Order>(
    "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *",
    [order.userId, order.total]
  );
  return result.rows[0];
}
```

**Replication lag:** replicas can be 10ms–1s behind the primary. For reads that must be fresh (immediately after a write), route to the primary.

---

## Connection Pooling

Databases have a hard limit on open connections (PostgreSQL default: 100). Each application server opens multiple connections. At scale, connection count = servers × connections per server can exceed the limit.

**Solution:** a connection pooler (PgBouncer, RDS Proxy) sits between app servers and the DB, multiplexing many app connections onto fewer DB connections.

```
App servers (100 instances × 10 connections = 1000)
  │
  ▼
PgBouncer (maintains 20 DB connections in pool)
  │
  ▼
PostgreSQL (max_connections = 100, now has headroom)
```

```typescript
interface ConnectionPoolConfig {
  maxConnections: number;     // total DB connections in pool
  minConnections: number;     // always-open connections
  acquireTimeoutMs: number;   // max wait for a connection
  idleTimeoutMs: number;      // close idle connections after
}

const poolConfig: ConnectionPoolConfig = {
  maxConnections: 20,       // PgBouncer manages this
  minConnections: 5,
  acquireTimeoutMs: 5_000,  // fail fast if pool exhausted
  idleTimeoutMs: 30_000,
};
```

---

## CQRS (Command Query Responsibility Segregation)

Separate the write model (commands — mutable, normalized) from the read model (queries — denormalized, optimized for specific views).

```typescript
// Write model — normalized, ACID
interface OrderCommand {
  type: "CreateOrder" | "CancelOrder" | "ShipOrder";
  orderId: string;
  payload: Record<string, unknown>;
}

// Read model — denormalized for a specific query (e.g., order summary view)
interface OrderSummaryView {
  orderId: string;
  customerName: string;   // denormalized from users table
  totalItems: number;     // pre-computed
  status: string;
  formattedTotal: string; // pre-formatted for display
}

interface CommandHandler {
  handle(command: OrderCommand): Promise<void>;
}

interface QueryHandler {
  getOrderSummary(orderId: string): Promise<OrderSummaryView | null>;
}
```

The write model updates the primary DB. An event handler projects the changes into a read-optimized store (separate table, Redis, or Elasticsearch). Reads are fast because the view is pre-computed.

---

## Database Scaling Comparison

| Technique | Scales | Complexity | Consistency |
|---|---|---|---|
| **Caching** | Reads (80–95% reduction) | Low | Eventual |
| **Read replicas** | Reads | Low | Eventual (ms lag) |
| **Connection pooling** | Connections | Low | Strong |
| **CQRS** | Reads (specific queries) | Medium | Eventual |
| **Sharding** | Reads + Writes | High | Strong per shard |

---

## Sharding (Last Resort)

Sharding splits data across multiple database instances. Each shard holds a partition of the data.

```
Shard 0: user_ids 0–999,999
Shard 1: user_ids 1,000,000–1,999,999
Shard 2: user_ids 2,000,000–2,999,999

Query for user 1,234,567:
  → hash(1,234,567) % 3 = 1
  → route to Shard 1
```

**Why sharding is hard:**
- Cross-shard JOINs are expensive or impossible
- Cross-shard transactions require 2-phase commit
- Re-sharding (when a shard fills up) is painful

> Defer sharding as long as possible. Use replicas, caching, and CQRS first. Shard only when a single machine genuinely cannot hold the data.

---

## When to Use Each Technique

| Traffic level | Approach |
|---|---|
| < 10k req/sec, < 1TB data | Single primary + caching |
| 10k–100k req/sec, mostly reads | Add read replicas + connection pooling |
| 100k+ req/sec, complex read views | CQRS + read replicas |
| Write throughput > 50k/sec | Horizontal sharding |
| > 1TB data in one table | Sharding or archive + partition |

---

## Common Mistakes

❌ **Routing all reads to primary** — wastes replicas and overloads the primary. Route reads to replicas by default.

❌ **Assuming replica reads are instant** — replication lag can be 100ms–1s under load. Don't read your own writes from a replica.

❌ **Sharding too early** — enormous operational complexity. Exhaust all other options first.

✅ **Measure before adding replicas** — confirm that reads (not writes) are the bottleneck. Adding read replicas won't help a write-heavy workload.

---

## Real-World Example

A social platform starts with a single PostgreSQL primary. At 500k DAU, read queries dominate. The team adds 3 read replicas and routes 90% of reads to them — primary CPU drops from 85% to 20%. At 2M DAU, connection pool exhaustion starts occurring; PgBouncer reduces effective connections from 800 to 40 on the DB. At 5M DAU, the user activity feed is moved to a CQRS read model backed by Cassandra — the main DB no longer serves feed queries at all.

---

## Key Insight

> Database scaling is a progression, not a choice. Start simple. Add replicas when reads are the bottleneck. Pool connections before you run out. Shard only when the data truly outgrows a single machine.

**Related:** [Databases (BuildingBlocks)](../BuildingBlocks/04-databases.md) · [Partitioning](./08-partitioning.md) · [Caching Strategies](./04-caching-strategies.md)

---

[← Back to SystemDesign](../README.md)
