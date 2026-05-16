# Data Partitioning (Sharding)

## 💡 **Concept**

Partitioning splits a large dataset across multiple database instances. Each partition (shard) holds a subset of the data. Together they hold all the data — but no single machine holds it all.

**Partition when:** a single database instance cannot hold the data or handle the write throughput. This is a last resort — exhaust replicas, caching, and CQRS first.

---

## Partition Types

| Type | How | Example | Hot key risk |
|---|---|---|---|
| **Hash** | `shard = hash(key) % N` | `user_id → shard` | Low (even distribution) |
| **Range** | Split by value range | User IDs 0–999k on shard 0 | High (new users cluster on last shard) |
| **Directory** | Lookup table maps key → shard | Custom routing per entity | Low, but lookup is a bottleneck |
| **Geo** | Route by geographic region | EU users → EU shard | Medium |

---

## Hash Partitioning

The most common strategy for user data. Even distribution, no hot spots:

```typescript
function hashKey(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getShardIndex(key: string, shardCount: number): number {
  return hashKey(key) % shardCount;
}

function getShardUrl(userId: string, shards: string[]): string {
  const index = getShardIndex(userId, shards.length);
  return shards[index];
}

// Usage
const shards = [
  "postgres://shard0.db.internal",
  "postgres://shard1.db.internal",
  "postgres://shard2.db.internal",
  "postgres://shard3.db.internal",
];

const dbUrl = getShardUrl("user-abc123", shards);
// Always routes the same user to the same shard
```

---

## Consistent Hashing

Standard hash partitioning breaks when you add or remove shards — `key % N` and `key % (N+1)` produce different results, so almost every key must move.

Consistent hashing places keys and shards on a ring. Adding a shard only moves 1/N of the keys:

```typescript
interface RingNode {
  id: string;
  position: number; // 0 to 2^32
}

class ConsistentHashRing {
  private readonly nodes: RingNode[] = [];
  private readonly replicas = 150; // virtual nodes per physical node

  addNode(nodeId: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const position = hashKey(`${nodeId}:${i}`);
      this.nodes.push({ id: nodeId, position });
    }
    this.nodes.sort((a, b) => a.position - b.position);
  }

  removeNode(nodeId: string): void {
    const filtered = this.nodes.filter(n => n.id !== nodeId);
    this.nodes.length = 0;
    this.nodes.push(...filtered);
  }

  getNode(key: string): string {
    if (this.nodes.length === 0) throw new Error("No nodes in ring");

    const keyPosition = hashKey(key);

    // Find first node clockwise from key position
    const node = this.nodes.find(n => n.position >= keyPosition)
      ?? this.nodes[0]; // wrap around

    return node.id;
  }
}

function hashKey(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
  }
  return Math.abs(hash) % (2 ** 32);
}
```

**Adding 1 node to a 10-node ring:** only ~10% of keys move (from the new node's predecessor). Standard hashing would require remapping 90%.

---

## Hot Key Problem

Hash partitioning distributes keys evenly — but not necessarily evenly across requests. A celebrity user with 10M followers generates far more read/write traffic than a regular user on the same shard.

**Solutions:**

| Strategy | How | When |
|---|---|---|
| **Key suffix randomization** | `celebrity_id:0`, `celebrity_id:1`, … `celebrity_id:9` | Read-heavy hot keys |
| **Dedicated shard** | Route celebrity keys to their own shard | Write-heavy hot keys |
| **Caching** | Cache celebrity data aggressively | Read hot keys |

```typescript
// Read: randomize suffix to spread across replicas
function getHotKeyVariant(baseKey: string, variants: number): string {
  const suffix = Math.floor(Math.random() * variants);
  return `${baseKey}:${suffix}`;
}

// Write: broadcast to all variants; read: merge results
async function writeHotKey<T>(
  cache: CacheClient,
  baseKey: string,
  value: T,
  variants: number
): Promise<void> {
  await Promise.all(
    Array.from({ length: variants }, (_, i) =>
      cache.set(`${baseKey}:${i}`, value, 300)
    )
  );
}
```

---

## Cross-Shard Queries

The biggest pain point of sharding: queries that span multiple shards require fetching from each shard and merging results in application code.

```typescript
interface ShardClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

// Fan-out query across all shards (expensive)
async function getAllUserOrders(
  shards: ShardClient[],
  userId: string
): Promise<Order[]> {
  const results = await Promise.all(
    shards.map(shard =>
      shard.query<Order>(
        "SELECT * FROM orders WHERE user_id = $1",
        [userId]
      )
    )
  );

  return results.flat().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
```

**Minimize cross-shard queries by:**
- Choosing a partition key that collocates related data (all user's orders on the same shard as the user)
- Denormalizing to avoid joins across shards
- Using a separate analytics store (BigQuery, Redshift) for reporting queries

---

## Re-Sharding

When a shard fills up or becomes a hotspot, you must split it. This is expensive and risky:

1. Create the new shard.
2. Copy data from old shard to new shard (double-write during migration).
3. Gradually shift reads to the new shard.
4. Remove data from old shard.

> Re-sharding is why you should use consistent hashing from the start. It minimises the data that moves.

---

## Partition Key Selection

The partition key determines everything:

| Good partition key | Bad partition key |
|---|---|
| User ID (evenly distributed, collocates user data) | Timestamp (all new writes hit the last shard) |
| Hash of email | Status column (low cardinality → hot shards) |
| Random UUID | Sequential integer (same as timestamp) |
| Geographic region (if geo-partitioning) | Boolean (2 shards, one always hot) |

---

## When to Use

| Scenario | Use partitioning? |
|---|---|
| Dataset > 10 TB on one instance | Yes — storage limit reached |
| Write throughput > what one DB handles | Yes — write bottleneck |
| Reads are the bottleneck | No — use read replicas instead |
| Data fits on one large instance | No — exhaust vertical scaling first |
| Need cross-entity reporting | No — use a data warehouse instead |

---

## Common Mistakes

❌ **Partitioning too early** — complexity is enormous; defer until you genuinely need it.

❌ **Choosing a bad partition key** — sequential IDs or timestamps cause range hot spots. Use high-cardinality keys.

❌ **Ignoring cross-shard queries** — queries that fan out to all shards are O(N) expensive. Design access patterns before choosing a key.

✅ **Use consistent hashing** — standard modulo hashing makes adding nodes a nightmare. Consistent hashing limits key migration to 1/N.

---

## Real-World Example

A social platform stores posts for 500M users. A single PostgreSQL instance can hold ~5TB. At 500M users with an average of 500 posts each, the posts table is ~50 TB. The team partitions by `user_id` hash across 16 shards (each ~3 TB). Consistent hashing means future expansion to 32 shards only moves ~50% of keys. Queries for a user's own posts go to exactly one shard. The "global trending" feature uses a separate Cassandra cluster — it would require scanning all 16 shards otherwise.

---

## Key Insight

> Partitioning is the most powerful scaling technique — and the most expensive. It makes simple operations complex and complex operations very complex. Use it only when a single machine genuinely cannot hold your data or handle your writes.

**Related:** [Database Scaling](./05-database-scaling.md) · [Horizontal Scaling](./01-horizontal-scaling.md) · [Databases (BuildingBlocks)](../BuildingBlocks/04-databases.md)

---

[← Back to SystemDesign](../README.md)
