# Database Sharding

## 💡 What Sharding Is

Sharding splits one large database into multiple smaller databases called shards. Each shard holds a subset of the data. All shards together hold the full dataset.

A single database server has limits — CPU, memory, storage, and network bandwidth. Sharding spreads the load across many servers. This is horizontal scaling.

```
Before sharding:
  App → Single DB (10M rows, overloaded)

After sharding:
  App → Router
             ↓        ↓        ↓
         Shard 1  Shard 2  Shard 3
         (3.3M)   (3.3M)   (3.4M)
```

**Sharding vs related techniques:**

| Technique | What It Solves | Data Distribution |
|-----------|---------------|-------------------|
| Sharding | Write capacity, storage limits | Split across servers |
| Replication | Read scaling, availability | Full copy on each server |
| Partitioning | Query performance on one server | Split within one server |

> Only shard when you've exhausted vertical scaling and read replicas. Sharding adds significant operational complexity.

---

## Sharding Strategies

### 1. Range-Based Sharding

Divide data by contiguous ranges of the shard key.

```
Shard 1: user_id 1 – 1,000,000
Shard 2: user_id 1,000,001 – 2,000,000
Shard 3: user_id 2,000,001 – 3,000,000
```

```typescript
function getShardByRange(userId: number): string {
  if (userId <= 1_000_000) return "shard-1";
  if (userId <= 2_000_000) return "shard-2";
  return "shard-3";
}
```

**Pros:**
- Range queries stay on one shard (efficient)
- Easy to add new shards at the end of the range

**Cons:**
- Hotspot problem — if new users are created sequentially, Shard 3 gets all writes
- Uneven data distribution over time

**Use when:** Time-series data sharded by date, sequential IDs with predictable growth.

---

### 2. Hash-Based Sharding

Apply a hash function to the shard key. The hash determines the shard.

```typescript
import { createHash } from "crypto";

function getShardByHash(userId: string, numShards: number): number {
  const hash = createHash("md5").update(userId).digest("hex");
  const hashInt = parseInt(hash.slice(0, 8), 16);
  return hashInt % numShards; // returns 0, 1, or 2
}
```

**Pros:**
- Even data distribution — no hotspots
- Predictable load across all shards

**Cons:**
- Range queries must hit every shard (scatter-gather)
- Adding or removing shards requires rehashing all data

**Use when:** Point lookups dominate, access patterns are unpredictable, even distribution is critical.

---

### 3. Directory-Based Sharding

A lookup table (directory) maps each entity to its shard. The router consults the directory before every query.

```typescript
interface ShardDirectory {
  lookup(entityId: string): Promise<string>;
  assign(entityId: string, shard: string): Promise<void>;
}

// Example: store the directory in Redis for fast lookups
async function getShardFromDirectory(
  userId: string,
  redis: RedisClient
): Promise<string> {
  const shard = await redis.get(`shard:user:${userId}`);
  if (!shard) throw new Error(`No shard assignment for user ${userId}`);
  return shard;
}
```

**Pros:**
- Maximum flexibility — you can move any entity to any shard
- Easy rebalancing without rehashing

**Cons:**
- Directory is a single point of failure (must be replicated)
- Extra network hop for every query

**Use when:** You need to move data between shards often, or when neither range nor hash strategies fit your access patterns.

---

## Strategy Comparison

| Factor | Range | Hash | Directory |
|--------|-------|------|-----------|
| Range queries | ✅ Efficient | ❌ Scatter-gather | Depends |
| Even distribution | ❌ Risk of hotspot | ✅ Uniform | ✅ Manual control |
| Rebalancing | Hard | Very hard | Easy |
| Operational complexity | Low | Medium | High |
| Best for | Time-series, dates | Point lookups | Custom placement |

---

## Choosing a Shard Key

The shard key is the most critical decision. A bad shard key creates a hotspot — one shard handles nearly all traffic while the others sit idle.

**Good shard key properties:**

- ✅ High cardinality — many distinct values distribute load evenly
- ✅ Matches your most common query — avoids cross-shard lookups
- ✅ Immutable — if the shard key changes, the row must move shards
- ✅ Does not correlate with time — sequential keys cause range hotspots

**Common shard key choices:**

| Entity | Shard Key | Reason |
|--------|-----------|--------|
| Users | `user_id` (hashed) | High cardinality, queries are per-user |
| Messages | `conversation_id` | Keeps a conversation on one shard |
| Orders | `user_id` or `tenant_id` | Groups by customer for locality |
| Events | `(user_id, timestamp)` | Range scans per user are efficient |

---

## The Hotspot Problem

A hotspot occurs when too many requests hit a single shard.

**Cause 1 — Sequential shard key:**
New rows always go to the last shard (range sharding by auto-increment ID).

**Cause 2 — Celebrity problem:**
One user or entity gets massive traffic. All their data is on one shard.

**Solutions:**

```typescript
// Add a random prefix to break the hotspot
function hotUserShardKey(userId: string, buckets: number = 10): string {
  const bucket = Math.floor(Math.random() * buckets);
  return `${bucket}_${userId}`;  // "3_user-456"
}

// When reading: query all buckets and merge
async function readHotUser(userId: string, buckets: number): Promise<Row[]> {
  const keys = Array.from({ length: buckets }, (_, i) => `${i}_${userId}`);
  const results = await Promise.all(keys.map((k) => db.get(k)));
  return results.flat();
}
```

---

## Cross-Shard Queries

Some queries must touch multiple shards. This is called scatter-gather.

```
Query: "Get all orders over $500 across all users"

Router broadcasts to all shards
  → Shard 1 returns its results
  → Shard 2 returns its results
  → Shard 3 returns its results
Router merges and sorts
```

**Cross-shard queries are slow.** Minimize them by designing your shard key to match your most common query pattern. If you often query across shards, consider a secondary index or a separate denormalized view.

---

## Common Mistakes

❌ **Sharding too early** — vertical scaling and read replicas handle most problems. Shard only when necessary.

❌ **Using an auto-increment ID as a range shard key** — all new writes hit the last shard.

❌ **Ignoring cross-shard transactions** — distributed transactions across shards are complex and slow.

❌ **Not planning for rebalancing** — shards fill unevenly over time; you need a strategy to move data.

---

## Interview Answer Template

> "I'd shard by `user_id` using consistent hashing. That gives even distribution and keeps all data for one user on one shard — which matches our most common query pattern. For celebrity users with extreme traffic, I'd add a random bucket prefix to split their data across multiple shards and merge on read. I'd avoid range sharding on a sequential ID because it turns the last shard into a write hotspot. Cross-shard queries like global analytics would go to a separate read replica or data warehouse — not the sharded OLTP database."
