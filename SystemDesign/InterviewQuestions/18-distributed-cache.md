# Design Distributed Cache

## How to Open This Answer

"I'll design a distributed cache that shards data across nodes using consistent hashing, supports configurable eviction, and stays highly available through replication. The core tension I'll address is consistency vs. availability when a node fails."

## Problem Statement

Databases become bottlenecks under heavy read traffic. A distributed cache sits in front of the database and serves hot data from memory in under 1ms. The system must distribute load evenly across nodes, handle node failures without data loss, and provide predictable eviction when memory is exhausted.

## R — Requirements

### Functional (pick 4-5 that matter most)

- `GET(key)` — retrieve a value by key in O(1) average time
- `SET(key, value, ttl)` — store a key-value pair with optional expiry
- `DELETE(key)` — evict a key immediately
- Evict entries automatically when memory is full (LRU or LFU policy)
- Replicate writes to at least one replica for durability

### Non-Functional (pick 3-4)

- p99 GET latency ≤ 1ms within a data centre
- Support 1 million operations per second across the cluster
- Tolerate single-node failure with no data loss (replication factor ≥ 2)
- Scale horizontally — adding nodes rebalances with minimal disruption

## A — Architecture

### High-Level Diagram

```
Application Servers (cache clients)
        │
        │  consistent-hash(key) → node ID
        ▼
  ┌──────────────────────────────────────┐
  │        Cache Client Library          │
  │  (consistent hash ring, node pool)   │
  └──────────────────────────────────────┘
        │           │           │
        ▼           ▼           ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ Node A  │ │ Node B  │ │ Node C  │  (primary shards)
  │ LRU Map │ │ LRU Map │ │ LRU Map │
  └────┬────┘ └────┬────┘ └────┬────┘
       │            │            │
       ▼            ▼            ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │Replica A│ │Replica B│ │Replica C│  (async replicas)
  └─────────┘ └─────────┘ └─────────┘
        │
        ▼ (cache miss)
   Origin Database
```

The client library embeds the consistent hash ring. Each key maps to a primary node; writes are synchronously acknowledged by primary and asynchronously replicated to one replica. On a cache miss the application falls back to the database and populates the cache (cache-aside pattern). A Gossip protocol keeps all nodes aware of ring membership changes.

### Consistent Hashing — How Node Mapping Works

```typescript
class ConsistentHashRing {
  private ring: Map<number, string> = new Map(); // hash → nodeId
  private sortedHashes: number[] = [];
  private readonly virtualNodes = 150;

  addNode(nodeId: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const hash = this.hash(`${nodeId}:vnode:${i}`);
      this.ring.set(hash, nodeId);
    }
    this.sortedHashes = [...this.ring.keys()].sort((a, b) => a - b);
  }

  getNode(key: string): string {
    const keyHash = this.hash(key);
    // Find first node clockwise from keyHash
    const idx = this.sortedHashes.findIndex(h => h >= keyHash);
    const ringHash = this.sortedHashes[idx ?? 0];
    return this.ring.get(ringHash)!;
  }

  private hash(input: string): number {
    // FNV-1a 32-bit hash — fast, good distribution
    let h = 0x811c9dc5;
    for (const ch of input) {
      h ^= ch.charCodeAt(0);
      h = (h * 0x01000193) >>> 0;
    }
    return h;
  }
}
```

With 150 virtual nodes per physical node, adding one node to a 10-node cluster rebalances only ~1/11 of keys (9%). Without virtual nodes, keys cluster unevenly and one node absorbs far more load than others.

### Cache-Aside Read Flow

1. Application calls `cache.get("user:123")`.
2. Client library hashes key → maps to Node B.
3. Node B returns value if present and not expired.
4. On miss: application queries primary database.
5. Application writes result back: `cache.set("user:123", data, ttl=300s)`.
6. Subsequent reads hit cache until TTL expires.

## D — Data Model

```typescript
// Core entry stored in each node's memory
interface CacheEntry {
  key: string;
  value: Buffer;          // arbitrary bytes — serialise on client side
  ttlMs: number;          // 0 = no expiry
  createdAt: number;      // epoch ms
  expiresAt: number;      // epoch ms, 0 if no expiry
  accessCount: number;    // for LFU eviction policy
  lastAccessedAt: number; // for LRU eviction policy
}

// Consistent hash ring node descriptor
interface RingNode {
  nodeId: string;
  host: string;
  port: number;
  virtualNodes: number;   // default 150 vnodes for even distribution
  status: "healthy" | "suspect" | "failed";
  replicaOf?: string;     // nodeId of primary, if this is a replica
}

// Replication message sent from primary to replica
interface ReplicationEvent {
  type: "SET" | "DELETE" | "EXPIRE";
  key: string;
  value?: Buffer;
  ttlMs?: number;
  sequenceNumber: number; // monotonic, for replica catch-up
  originNodeId: string;
  timestamp: number;
}

// Stats reported by each node to cluster coordinator
interface NodeStats {
  nodeId: string;
  memoryUsedBytes: number;
  memoryLimitBytes: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  keyCount: number;
}
```

## I — Interface (APIs)

```typescript
// Cache operations (binary protocol in production; shown as typed TS)

// GET — retrieve value
interface GetRequest {
  key: string;
}
interface GetResponse {
  key: string;
  value: Buffer | null;   // null = cache miss
  ttlRemainingMs: number; // -1 if no expiry
  hit: boolean;
}

// SET — store value
interface SetRequest {
  key: string;
  value: Buffer;
  ttlMs?: number;         // omit for no expiry
  nx?: boolean;           // set only if key does not exist (for locks)
}
interface SetResponse {
  stored: boolean;        // false if nx=true and key already existed
}

// DELETE — remove key
interface DeleteRequest {
  keys: string[];         // batch delete supported
}
interface DeleteResponse {
  deletedCount: number;
}

// MGET — multi-get (reduces round trips)
interface MGetRequest {
  keys: string[];
}
interface MGetResponse {
  results: Array<{
    key: string;
    value: Buffer | null;
    hit: boolean;
  }>;
}

// Cluster management — admin API
// GET /cluster/nodes
interface ClusterNodesResponse {
  nodes: RingNode[];
  ringVersion: number;
}
```

## O — Optimizations & Trade-offs

### Scaling concerns

| Concern | Problem | Solution |
|---|---|---|
| Hot keys | One key (e.g. celebrity profile) overwhelms a single node | Local in-process L1 cache (LRU, 1000 entries) on each app server; jitter reads across replicas |
| Node failure rebalancing | Adding/removing a node moves too many keys | Consistent hashing with 150 virtual nodes limits rebalance to ~1/N of keys |
| Cache stampede | Many threads miss simultaneously and flood DB | Mutex lock on first miss ("dogpile" prevention); or probabilistic early refresh |
| Eviction policy choice | LRU evicts recently-unused keys; LFU evicts low-frequency keys | Use LFU for content caches (media), LRU for session/user data |
| Write-through vs cache-aside | Write-through keeps cache fresh but couples writes | Cache-aside for read-heavy workloads; write-through for write-heavy + consistency-sensitive |

### Pitfalls

| Pitfall | Verdict |
|---|---|
| Single cache node (no sharding) | ❌ SPOF and memory ceiling hit immediately |
| Synchronous replication on every SET | ❌ Doubles SET latency — use async replication with at-least-once guarantee |
| Not setting TTLs | ❌ Memory fills with stale data; always set a sensible default TTL |
| Caching mutable objects without invalidation | ❌ Leads to stale reads — use versioned keys or event-driven invalidation |
| Trusting cache as source of truth | ❌ Cache is derived data — always treat the database as the authority |

### Eviction policy comparison

| Policy | Best for | Weakness |
|---|---|---|
| LRU (Least Recently Used) | Session data, user profiles | Scan resistance needed for large sequential reads |
| LFU (Least Frequently Used) | Media, popular content | Slow to adapt to access pattern shifts |
| TTL-based | Any time-sensitive data | Memory waste if TTL set too high |

> Consistent hashing solves the "which node?" problem elegantly. But the hard operational problem is detecting node failure quickly enough (under 1 second) so clients stop routing to it. Use Gossip protocol with a suspicion timer rather than a central coordinator.

See [../Scalability/consistent-hashing.md](../Scalability/consistent-hashing.md) for ring implementation details and [../BuildingBlocks/caching.md](../BuildingBlocks/caching.md) for cache-aside vs write-through patterns.

## Common Follow-up Questions

**Q: How do you handle cache invalidation across multiple app servers?**
A: Publish invalidation events to a message queue (Kafka/Redis Pub/Sub). All app servers subscribe and evict their local L1 cache entry. The distributed cache layer handles its own TTL-based expiry.

**Q: What is the difference between Redis Cluster and your design?**
A: Redis Cluster is a production implementation of exactly this design — consistent hashing, gossip, 16384 hash slots, async replication. In an interview, design the concepts; then say "Redis Cluster is the battle-tested open-source implementation."

**Q: How do you prevent a thundering herd after a cache node restarts?**
A: Pre-warm the cache by replaying the replica's replication log on startup. Use a "warming" state where the node accepts writes but serves reads from its replica until local memory is sufficiently populated.

**Q: When would you choose Memcached over Redis?**
A: Memcached is simpler — pure key-value, multi-threaded, lower memory overhead per key. Choose it for plain object caching. Choose Redis when you need sorted sets, pub/sub, persistence, or Lua scripting.

**Q: How do you size the cache cluster?**
A: Target 20% of working-set data in cache (Pareto principle). Measure hit rate — if below 80%, add memory. If above 95%, you can reduce. Start with `(peak RPS × p99 object size) × replication_factor` as initial sizing.

---
[← Back to InterviewQuestions](../README.md)
