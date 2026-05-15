# Consistency Models

### 💡 **Concept**

Consistency defines **when and how** a write becomes visible across a distributed system. Stronger models give correctness. Weaker models give speed and availability.

You pick a model per operation, not per database.

## The Spectrum

| Model | Guarantee | Cost | Use For |
| --- | --- | --- | --- |
| **Strong** | Every read sees the latest write | Slow, less available | Money, inventory, auth |
| **Read-your-writes** | A user always sees their own updates | Minor session tracking | Profiles, settings, drafts |
| **Causal** | Related events appear in order | Vector clocks | Comments, chats, edits |
| **Eventual** | Replicas converge eventually | Cheap, fast | Feeds, catalogs, DNS |

## Strong Consistency

Every read returns the most recent committed write. All clients see updates in the same order (linearizability).

```
Client A: write X = 1   ─▶  all nodes
Client B: read X        ─▶  always returns 1
```

**Cost:** Higher latency, lower availability. Writes wait for majority replication.

**Systems:** Spanner, CockroachDB, etcd, ZooKeeper, RDBMS with synchronous replicas.

## Eventual Consistency

Updates spread asynchronously. Replicas may briefly disagree, then converge.

```
Write X=1 to Node A  →  Node B: X=0 (stale)
                        Node C: X=0 (stale)
... after seconds ...   all nodes: X=1
```

**Cost:** Application must tolerate stale reads and concurrent writes.

**Systems:** Cassandra, DynamoDB, Riak, Memcached replicas.

## Read-Your-Writes

A user always sees their own writes. Other users may still see old data.

**Why it matters:** If a user updates their profile and refreshes to old data, they think it failed.

```typescript
class SessionConsistency {
  private lastWriteAt = new Map<string, number>();

  async write(userId: string, key: string, value: unknown): Promise<void> {
    const version: number = Date.now();
    await db.write(key, value, version);
    this.lastWriteAt.set(userId, version);
  }

  async read(userId: string, key: string): Promise<unknown> {
    const minVersion: number = this.lastWriteAt.get(userId) ?? 0;
    // Read from a replica that has caught up to the user's last write
    return db.readFromReplica(key, { minVersion });
  }
}
```

**Common implementations:** sticky sessions, read-from-leader after a write, version tokens.

## Causal Consistency

If A causes B (a reply to a comment), every node sees A before B. Independent events can appear in any order.

```
Comment posted    →  always seen first
Reply to comment  →  always seen after
Unrelated like    →  can appear anywhere
```

Implemented with **vector clocks** — each node tracks the count of events it has seen from every other node.

```typescript
class VectorClock {
  constructor(
    private nodeId: number,
    private clock: number[] = []
  ) {}

  tick(): void {
    this.clock[this.nodeId] = (this.clock[this.nodeId] ?? 0) + 1;
  }

  merge(other: number[]): void {
    for (let i = 0; i < Math.max(this.clock.length, other.length); i++) {
      this.clock[i] = Math.max(this.clock[i] ?? 0, other[i] ?? 0);
    }
    this.tick();
  }

  happensBefore(other: number[]): boolean {
    let strictlyLess = false;
    for (let i = 0; i < this.clock.length; i++) {
      if ((this.clock[i] ?? 0) > (other[i] ?? 0)) return false;
      if ((this.clock[i] ?? 0) < (other[i] ?? 0)) strictlyLess = true;
    }
    return strictlyLess;
  }
}
```

**Use for:** chat threads, comments, collaborative editing.

## Quorum Reads and Writes

You can dial consistency on a per-request basis using quorum math.

> **R + W > N** guarantees that reads see the latest write.

```
N = total replicas
W = nodes that must ack a write
R = nodes that must ack a read
```

| Setting | Behavior |
| --- | --- |
| R = W = N | Strongest, lowest availability |
| R = W = ⌊N/2⌋ + 1 | Balanced — most common |
| R = 1, W = 1 | Fastest, eventual only |

```typescript
class QuorumStore<T> {
  constructor(
    private replicas: Replica<T>[],
    private R: number,
    private W: number
  ) {
    if (R + W <= replicas.length) {
      throw new Error("R + W must be greater than N");
    }
  }

  async write(key: string, value: T): Promise<void> {
    const version: number = Date.now();
    const acks: PromiseSettledResult<void>[] = await Promise.allSettled(
      this.replicas.map((r) => r.write(key, value, version))
    );
    const ok: number = acks.filter((a) => a.status === "fulfilled").length;
    if (ok < this.W) throw new Error("Write quorum not reached");
  }

  async read(key: string): Promise<T> {
    const results = await Promise.all(
      this.replicas.slice(0, this.R).map((r) => r.read(key))
    );
    // Latest version wins
    return results.reduce((a, b) => (a.version > b.version ? a : b)).value;
  }
}
```

## Consensus: How Strong Consistency Works

Strong consistency across replicas needs a consensus algorithm. **Raft** is the standard choice today (etcd, Consul, CockroachDB).

**Raft in one paragraph:**

1. Nodes elect a **leader** by majority vote.
2. Clients send writes to the leader.
3. Leader appends to its log and replicates to followers.
4. Once a majority acks, the entry is **committed**.
5. If the leader dies, followers elect a new one with the latest log.

This guarantees: every committed entry survives leader changes, and all replicas apply entries in the same order.

> Raft replaced Paxos in most new systems because it is easier to reason about. Same guarantees, clearer roles.

## Conflict Resolution

When two nodes accept conflicting writes during a partition, you need a rule to merge them.

| Strategy | How | Risk |
| --- | --- | --- |
| **Last-Write-Wins** | Newest timestamp wins | Clock skew loses data |
| **Vector clocks** | Detect concurrent writes, return both | App must merge |
| **CRDTs** | Math-based merge (set union, counter add) | Limited data shapes |

**Shopping cart with additive merge:**

```typescript
type Cart = Map<string, number>;

function mergeCarts(a: Cart, b: Cart): Cart {
  const merged: Cart = new Map(a);
  for (const [itemId, qty] of b) {
    merged.set(itemId, (merged.get(itemId) ?? 0) + qty);
  }
  return merged;
}
```

Two devices add items offline. On reconnect, both carts merge without losing items.

## Choosing a Model

| Scenario | Model | Why |
| --- | --- | --- |
| Payment, transfer | Strong | Wrong number is catastrophic |
| Inventory at checkout | Strong | Cannot oversell |
| User profile edit | Read-your-writes | User must see their change |
| Chat or comment thread | Causal | Order of replies matters |
| Home feed, recommendations | Eventual | Stale is fine, speed wins |
| Analytics dashboard | Eventual | Approximate is acceptable |

## Common Mistakes

❌ **Assuming strong consistency by default.** Most databases default to weaker modes. Read the docs for your write and read concerns.

❌ **Using Last-Write-Wins with system clocks.** Clock skew across servers loses concurrent updates silently. Use logical clocks or CRDTs.

❌ **Ignoring replication lag.** A read replica can be seconds behind. Monitor lag and route writes to the leader when freshness matters.

❌ **Forgetting read-your-writes.** Users notice when their own edit "disappears". This breaks trust faster than any other consistency bug.

❌ **Picking one model for the whole app.** Tune per operation. Payments need strong; activity feed needs eventual. Same database, different reads.

## Key Insight

> Consistency is a budget you spend per request. Strong reads cost latency. Weak reads cost correctness. A senior design separates the two so users always feel fast where it matters and always feel right where it counts.

---
[← Back to SystemDesign](../README.md)
