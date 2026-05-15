# CAP Theorem

### 💡 **Concept**

A distributed system can guarantee only **two of three** properties: Consistency, Availability, and Partition tolerance.

In practice, network partitions will happen. So the real choice is **CP** (consistent) or **AP** (available).

## The Three Properties

| Property | Meaning | Example |
| --- | --- | --- |
| **Consistency (C)** | Every read returns the most recent write. | Bank balance must be accurate. |
| **Availability (A)** | Every request gets a response (even if stale). | Social feed always loads. |
| **Partition Tolerance (P)** | System keeps working when the network splits. | US-East cannot reach US-West, but both serve traffic. |

> Partitions are not optional in real systems. Pick C or A when one happens.

## How It Works

When the network splits, two healthy nodes cannot talk to each other:

```
Client → Node A   ─X─   Node B ← Client
         (write)         (read)
```

You must pick one behavior:

- **CP** — Refuse the request until nodes resync. No stale data, but downtime.
- **AP** — Serve the request from each side. No downtime, but stale data.

You cannot have both. The nodes cannot agree without communicating.

## CP vs AP

| Dimension | CP (Consistent) | AP (Available) |
| --- | --- | --- |
| **During partition** | Returns error or blocks | Returns possibly stale data |
| **Best for** | Money, inventory, auth | Feeds, catalogs, search |
| **Examples** | MongoDB (majority writes), HBase, etcd, ZooKeeper, Spanner | Cassandra, DynamoDB, Riak, DNS |

## When to Use

**Choose CP when wrong data is worse than no data:**

- Financial transactions (transfer, payment)
- Seat or room booking (double-booking is fatal)
- Inventory counts at checkout
- Authentication and authorization

**Choose AP when downtime is worse than stale data:**

- Social media feeds and timelines
- Product catalogs and recommendations
- Search results
- Analytics dashboards

## Code Examples

**CP write — reject on partition:**

```typescript
interface TransferResult {
  success: boolean;
  error?: string;
}

async function transferMoney(
  from: string,
  to: string,
  amount: number
): Promise<TransferResult> {
  const tx = await db.beginTransaction();
  try {
    await db.lock([from, to]);
    const balance: number = await db.get(from);
    if (balance < amount) throw new Error("Insufficient funds");

    await db.update(from, balance - amount);
    await db.update(to, (await db.get(to)) + amount);

    // Wait for majority replication — fails fast on partition
    await tx.commit({ writeConcern: "majority" });
    return { success: true };
  } catch {
    await tx.rollback();
    return { success: false, error: "Service unavailable" };
  }
}
```

**AP write — always accept, reconcile later:**

```typescript
interface Post {
  id: string;
  text: string;
}

async function publishPost(userId: string, post: Post): Promise<void> {
  // consistency: 'ONE' — succeed if any replica accepts
  await db.write(userId, post, { consistency: "ONE" });
  // Background replication handles the rest
  replicateAsync(post);
}
```

## PACELC: The Missing Half

CAP only describes behavior during a partition. **PACELC** adds the normal-state tradeoff.

> If **P**artition: choose **A** or **C**. **E**lse: choose **L**atency or **C**onsistency.

| System | Partition | Normal | Profile |
| --- | --- | --- | --- |
| Cassandra, DynamoDB | AP | EL | Always fast, eventually consistent |
| MongoDB, HBase, Spanner | CP | EC | Slower, always correct |
| Cosmos DB | tunable | tunable | Pick per operation |

## Common Mistakes

❌ **Treating CAP as a permanent choice.** It only matters during a partition. Many systems are tunable per query.

❌ **Picking "CA" for a distributed system.** True CA only exists on a single server. The moment you replicate, P becomes mandatory.

❌ **Assuming the network is reliable.** Datacenter links, cloud zones, and routers fail. Design for partitions, then test them with chaos tools.

❌ **Ignoring replication lag.** "Eventually consistent" can mean seconds or minutes. Monitor lag — never assume.

❌ **Using strong consistency by default.** It costs latency and availability. Use it only where wrong data hurts the business.

## Key Insight

> CAP is a runtime tradeoff, not a database label. Modern systems let you tune consistency per request — strict for payments, loose for feeds. Design the choice into each operation, not the whole stack.

---
[← Back to SystemDesign](../README.md)
