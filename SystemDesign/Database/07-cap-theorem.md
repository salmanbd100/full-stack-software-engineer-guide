# CAP Theorem — Database Perspective

> For the theoretical proof and general distributed systems context, see [Fundamentals/05-cap-theorem.md](../Fundamentals/05-cap-theorem.md). This file focuses on **which databases make which CAP trade-off and why**.

---

## 💡 The Practical Summary

Every distributed database must tolerate network partitions (P). The real choice is:

- **CP** — return an error or wait when the network splits (prefer correctness)
- **AP** — return possibly stale data when the network splits (prefer uptime)

Single-node databases (one PostgreSQL instance) are effectively CA — no partition can occur on one machine — but they don't scale horizontally.

---

## Database CAP Map

| Database | CAP Position | Default Behavior | Why |
|----------|-------------|------------------|-----|
| **PostgreSQL** (single node) | CA | Consistent reads always | No network partition possible |
| **PostgreSQL** (with replication) | CP | Sync standby blocks writes if standby is down | Correctness over availability |
| **MySQL** (InnoDB Cluster) | CP | Majority quorum required for write | Uses Paxos-based Group Replication |
| **MongoDB** | CP | Primary election required; minority partition rejects writes | Replica set majority vote |
| **HBase** | CP | Relies on ZooKeeper quorum | Strong consistency for financial/log data |
| **Redis Cluster** | CP | Majority of masters required | Failover needs quorum |
| **Cassandra** | AP | Every node accepts reads/writes at any time | Leaderless, always available |
| **DynamoDB** | AP (default) | Eventual consistency by default, strong optional | AWS prioritises uptime |
| **CouchDB** | AP | Multi-master, offline-first | Designed for sync/conflict resolution |

---

## CP Databases in Detail

CP systems refuse requests from the minority partition rather than return stale data.

### MongoDB

MongoDB uses a replica set with an elected primary. Writes go to the primary only.

```typescript
import { MongoClient, WriteConcern } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI!);
const col = client.db('bank').collection('accounts');

// Majority write — blocked if primary can't reach quorum
await col.updateOne(
  { _id: accountId },
  { $inc: { balance: -100 } },
  { writeConcern: new WriteConcern('majority') }
);

// During a partition where this node is in the minority:
// → MongoServerError: not primary
// → Client must retry against the new primary
```

**Why CP makes sense here:** You cannot allow two nodes to both accept writes to a bank account — you'd get conflicting balances.

### PostgreSQL Synchronous Replication

```sql
-- Commit blocks until at least one standby confirms WAL write
ALTER SYSTEM SET synchronous_commit = 'on';
ALTER SYSTEM SET synchronous_standby_names = 'standby1';

-- If standby1 is unreachable, writes block indefinitely
-- You can set a timeout:
ALTER SYSTEM SET wal_sender_timeout = '30s';
```

---

## AP Databases in Detail

AP systems accept reads and writes on every node. Conflicting writes are resolved after the partition heals.

### Cassandra

Cassandra has no leader. Any node accepts any write. Consistency is tunable per query.

```typescript
import cassandra from 'cassandra-driver';

const client = new cassandra.Client({ contactPoints: ['node1', 'node2', 'node3'] });

// AP default — write succeeds immediately, replicated async
await client.execute(
  'UPDATE users SET last_seen = ? WHERE user_id = ?',
  [Date.now(), userId],
  { consistency: cassandra.types.consistencies.one }   // one node suffices
);

// Quorum — stronger guarantee, but fails during partition
await client.execute(
  'UPDATE accounts SET balance = ? WHERE id = ?',
  [newBalance, accountId],
  { consistency: cassandra.types.consistencies.quorum }
);
```

> Cassandra with `QUORUM` consistency behaves like CP. Cassandra with `ONE` consistency is AP. The database is tunable — pick per operation.

### DynamoDB

```typescript
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const db = new DynamoDBClient({ region: 'us-east-1' });

// AP default — returns data from any replica (may be seconds stale)
const eventualRead = await db.send(new GetItemCommand({
  TableName: 'Sessions',
  Key: { sessionId: { S: sid } },
  ConsistentRead: false          // eventual consistency
}));

// CP option — reads only from the leader replica
const strongRead = await db.send(new GetItemCommand({
  TableName: 'Sessions',
  Key: { sessionId: { S: sid } },
  ConsistentRead: true           // strongly consistent, 2× the read cost
}));
```

**DynamoDB strongly consistent reads cost twice the read capacity units and are unavailable if the leader is unreachable.** Use them only for data where staleness is unacceptable (e.g., inventory counts).

---

## Choosing CP vs AP

| If you need… | Choose |
|--------------|--------|
| Financial accuracy (balances, payments) | **CP** |
| Inventory — limited stock, can't oversell | **CP** |
| Seat / ticket booking | **CP** |
| User profiles, preferences | **AP** |
| Social media feeds and counters | **AP** |
| Shopping cart (conflicts are mergeable) | **AP** |
| Session tokens | **AP** (with sticky reads) |

---

## The PACELC Extension

CAP only describes partition behavior. **PACELC** also captures the normal-operation trade-off:

```
If Partition → choose A or C
Else          → choose L (latency) or C (consistency)
```

| Database | Partition | Normal operation |
|----------|-----------|-----------------|
| Cassandra | PA (availability) | EL (low latency) |
| DynamoDB | PA | EL |
| MongoDB | PC (consistency) | EC (still consistent) |
| HBase | PC | EC |

Most teams care about the "Else" branch more than partitions — partitions are rare; latency vs consistency is a daily trade-off.

---

## Common Mistakes

❌ **Thinking CA is a real option in distributed systems.** If you have two nodes and a network, partitions can happen. You must pick CP or AP.

❌ **Using a CP database for everything.** A social feed served from a CP database will show error pages when a partition happens. AP with stale data is better UX.

❌ **Using an AP database for financial writes without compensating logic.** Without strong consistency, two concurrent withdrawals can both succeed and overdraft an account.

---

## Key Insight

> The CAP choice is not made once for an entire system. Use **CP for writes that must be exact** (money, inventory) and **AP for reads where a brief lag is acceptable** (feeds, profiles). Many systems mix both — Cassandra at QUORUM for writes, ONE for reads.

---

## Interview Answer Template

> "Every distributed database has to handle network partitions, so the real CAP choice is CP vs AP. CP databases like MongoDB and PostgreSQL reject writes from the minority partition to stay consistent — a partition means some nodes become unavailable. AP databases like Cassandra and DynamoDB accept writes everywhere and resolve conflicts after the partition heals — you stay up but reads can be stale.
>
> I'd pick CP for anything financial or inventory-related where two nodes seeing different values would cause real harm. I'd pick AP for user profiles, feeds, or carts where a brief lag is acceptable and conflicts are either rare or easy to merge.
>
> Many databases like Cassandra and DynamoDB let you tune consistency per operation, so you can use quorum consistency for critical writes and eventual consistency for high-volume reads in the same system."

---

[← Back to Database](./README.md)
