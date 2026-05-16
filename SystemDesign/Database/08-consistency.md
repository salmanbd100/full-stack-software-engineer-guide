# Database Consistency Patterns

> For general distributed consistency theory (linearizability, causal consistency, etc.), see [Fundamentals/06-consistency.md](../Fundamentals/06-consistency.md). This file covers **how storage systems implement consistency** — replication strategies, consistency levels, and session guarantees.

---

## 💡 The Core Question

When a client writes data, which replica becomes the source of truth? When does a read reflect that write? Database consistency patterns answer these two questions.

---

## Replication Architectures

### Single-Leader (Strong Consistency)

One node — the primary or leader — accepts all writes. Other nodes replicate from it.

```
Client → Primary (writes)
         ↓ replicate
       Replica A, Replica B (reads)
```

**Synchronous replication** — the primary waits for at least one replica to confirm before acknowledging the write. Strong consistency, but a slow replica blocks writes.

**Asynchronous replication** — the primary confirms immediately and replicates in the background. Fast writes, but a failover can lose recent data.

```sql
-- PostgreSQL: synchronous replication
-- Primary blocks COMMIT until standby1 writes to WAL
ALTER SYSTEM SET synchronous_standby_names = 'standby1';
ALTER SYSTEM SET synchronous_commit = 'remote_write';  -- or 'on' for full sync

-- Asynchronous (default)
ALTER SYSTEM SET synchronous_commit = 'off';
```

> Single-leader replication is what most people mean by "strong consistency" in databases. Every write goes through one node, so there is one ordering of events.

### Multi-Leader (Conflict-Prone)

Multiple nodes accept writes. Conflicts happen when two leaders accept conflicting writes before replicating to each other.

**Use case:** Multi-region writes where cross-region latency makes single-leader impractical.

**Conflict resolution strategies:**

| Strategy | How | Risk |
|----------|-----|------|
| Last-write-wins (LWW) | Highest timestamp survives | Clock skew can drop valid writes |
| Application merge | App defines merge logic | Complex, but data-safe |
| CRDT | Data structure auto-merges | Only works for specific types |

### Leaderless (Eventual Consistency)

Any node accepts any write. Cassandra and Riak use this model. Consistency is controlled by quorum.

```
Write → Node A (ack), Node B (ack), Node C (async)
Read  → reads from Node A + Node C, returns latest
```

---

## Quorum Reads and Writes

Leaderless systems use **quorum** to trade off consistency vs latency. For a cluster of `N` nodes:

- `W` — number of nodes that must confirm a write
- `R` — number of nodes consulted for a read

**Strong consistency condition:** `W + R > N`

```
N=3 nodes, W=2, R=2 → W+R=4 > 3 → strongly consistent
N=3 nodes, W=1, R=1 → W+R=2 < 3 → eventual consistency
```

### Cassandra Consistency Levels

```typescript
import cassandra from 'cassandra-driver';

const { consistencies } = cassandra.types;

// Eventual consistency — fastest, AP behaviour
await session.execute(query, params, {
  consistency: consistencies.one      // write/read from 1 node
});

// Quorum — strong if W+R > N, slower
await session.execute(query, params, {
  consistency: consistencies.quorum   // majority of nodes
});

// Linearizable — uses Paxos, most expensive
await session.execute(query, params, {
  consistency: consistencies.serial   // used for lightweight transactions
});
```

**Cassandra LWT (Lightweight Transactions)** uses Paxos to provide compare-and-swap semantics — the only way to get true strong consistency in a leaderless system.

```sql
-- Only update if the row doesn't already exist (idempotent seat booking)
INSERT INTO bookings (seat_id, user_id, booked_at)
VALUES (42, 'user-123', toTimestamp(now()))
IF NOT EXISTS;
```

### DynamoDB Consistency Levels

```typescript
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand
} from '@aws-sdk/client-dynamodb';

const db = new DynamoDBClient({ region: 'us-east-1' });

// Eventual (default) — reads may be up to ~1s stale, half the RCU cost
await db.send(new GetItemCommand({
  TableName: 'Products',
  Key: { productId: { S: 'prod-42' } },
  ConsistentRead: false
}));

// Strongly consistent — reads from leader, full RCU cost
await db.send(new GetItemCommand({
  TableName: 'Products',
  Key: { productId: { S: 'prod-42' } },
  ConsistentRead: true
}));

// Transactions — ACID across multiple items (uses 2× WCU + 2× RCU)
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';

await db.send(new TransactWriteItemsCommand({
  TransactItems: [
    {
      Update: {
        TableName: 'Inventory',
        Key: { productId: { S: 'prod-42' } },
        UpdateExpression: 'SET stock = stock - :qty',
        ConditionExpression: 'stock >= :qty',
        ExpressionAttributeValues: { ':qty': { N: '1' } }
      }
    },
    {
      Put: {
        TableName: 'Orders',
        Item: { orderId: { S: 'ord-99' }, productId: { S: 'prod-42' } }
      }
    }
  ]
}));
```

---

## Session Consistency Guarantees

Even in eventually consistent systems, clients need predictable behaviour within their own session.

### Read-Your-Writes

A client always sees its own writes, even before they replicate to all nodes.

```typescript
// Problem: write goes to Node A, read hits Node B which hasn't replicated yet
await db.write('preferences', { theme: 'dark' });
const prefs = await db.read('preferences'); // may still return { theme: 'light' }

// Solution 1: Sticky sessions — route the client to the same node
// Solution 2: Read from primary for a brief window after write
// Solution 3: Return the written value from the write response and cache it client-side

class SessionConsistentClient {
  private pending = new Map<string, unknown>();

  async write(key: string, value: unknown): Promise<void> {
    await db.write(key, value);
    this.pending.set(key, value);    // cache locally
    setTimeout(() => this.pending.delete(key), 5_000); // clear after replication window
  }

  async read(key: string): Promise<unknown> {
    return this.pending.has(key) ? this.pending.get(key) : db.read(key);
  }
}
```

### Monotonic Reads

Once a client reads a value, it never reads an older version. Prevents confusing UX where refreshing a page shows older data.

**Implementation:** Route the client to the same replica for the duration of the session (sticky routing). If the replica fails, the new replica must be at least as up-to-date.

```typescript
// DynamoDB: strongly consistent reads give monotonic reads by nature
// Cassandra: always route session to same coordinator node
const coordinator = selectCoordinatorByHash(userId); // consistent hash
await cassandraSession.execute(query, params, { host: coordinator });
```

---

## Strong vs Eventual — When to Use Each

| Scenario | Pattern | Why |
|----------|---------|-----|
| Bank balance debit | **Strong** (sync replication or quorum) | Cannot allow stale balance |
| Product inventory (last units) | **Strong** (LWT or transaction) | Cannot oversell |
| User preferences | **Eventual** | Stale data causes no real harm |
| Social media likes/views counter | **Eventual** | Approximate is fine, speed matters |
| Order history (read) | **Eventual** | Historical data changes rarely |
| Seat reservation | **Strong** (LWT / serializable) | Must prevent double-booking |
| Leaderboard / analytics | **Eventual** | Approximate totals acceptable |

---

## Common Mistakes

❌ **Using eventual consistency for financial writes** — two concurrent writes can both succeed on different nodes, creating conflicting balances that are hard to reconcile.

❌ **Using strong consistency for every read** — DynamoDB strongly consistent reads cost double and are slower. Reserve them for data where staleness causes real harm.

❌ **Ignoring read-your-writes** — users who submit a form and immediately reload the page expect to see their change. Build session consistency into your client layer even if the DB is eventually consistent.

---

## Key Insight

> Strong consistency is not free. Every synchronous replica acknowledgement adds latency equal to the replica's network round-trip. Pick strong consistency for writes where correctness matters and eventual consistency for reads where speed and availability matter more. Most real systems mix both — strong writes, eventual reads.

---

## Interview Answer Template

> "Database consistency comes down to replication strategy. Single-leader with synchronous replication gives strong consistency — every committed write is durable on at least two nodes before the client gets a response. Leaderless systems like Cassandra give you a dial: write to one node for speed, or require quorum acknowledgement for stronger guarantees.
>
> In practice I use strong consistency for any write where a stale read would cause a business error — inventory, payments, bookings. I use eventual consistency for counters, feeds, and profile data where the cost of a slightly stale read is just a minor UX annoyance.
>
> Session guarantees like read-your-writes are often invisible in the DB but need explicit handling in the application layer — I typically cache the written value client-side for a short window after a write, so the user always sees their own changes."

---

[← Back to Database](./README.md)
