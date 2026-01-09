# CAP Theorem

## Overview

### 💡 **What is the CAP Theorem?**

The CAP Theorem states that a distributed database system can only guarantee **two out of three** properties simultaneously:

- **C**onsistency
- **A**vailability
- **P**artition Tolerance

**The Fundamental Trade-off:**

```
You MUST choose between:
    CP: Consistency + Partition Tolerance (sacrifice Availability)
    AP: Availability + Partition Tolerance (sacrifice Consistency)

Note: Partition Tolerance is mandatory in distributed systems
      (network failures happen), so the real choice is CA vs AP.
```

**Key Insight:**
> In distributed systems, network partitions are inevitable. The CAP theorem forces you to choose: Do you want consistency or availability when the network fails?

---

## The Three Properties

### 🎯 **C - Consistency**

Every read receives the most recent write or an error. All nodes see the same data at the same time.

**How It Works:**

```
Client writes value=5 to Node A
    ↓
System replicates to all nodes
    ↓
All nodes have value=5
    ↓
Client reads from Node B
    ↓
Returns value=5 (consistent)
```

**Guarantees:**

1. **Single System Image:**
   - All clients see the same data
   - No stale reads
   - Appears as one logical system

2. **Strong Consistency:**
   - Read reflects all prior writes
   - Linearizability
   - No lag or delay

**Example - Banking System:**

```javascript
// Consistent system
await db.write('account_balance', 1000);  // Write to all replicas

// Read from any node returns same value
const balance1 = await db.read('account_balance');  // 1000
const balance2 = await db.read('account_balance');  // 1000
const balance3 = await db.read('account_balance');  // 1000
// All reads return 1000 ✅
```

**Trade-off:**

```
✅ Pros:
- Guaranteed correctness
- No data conflicts
- Simple application logic

❌ Cons:
- Higher latency (wait for all replicas)
- Lower availability (if any node fails)
- Reduced throughput
```

**Real-World Examples:**

| System | Why Consistency Matters |
|--------|------------------------|
| **Banking** | Account balance must be accurate |
| **E-commerce checkout** | Inventory count must be correct |
| **Booking systems** | Seat availability must be synchronized |
| **Financial trading** | Stock prices must be consistent |

---

### ✅ **A - Availability**

Every request receives a (non-error) response, without guarantee that it contains the most recent write.

**How It Works:**

```
Node A: value=5
Node B: value=3 (not yet replicated)
Network partition occurs

Client 1 reads from Node A → Returns 5
Client 2 reads from Node B → Returns 3 (stale!)

System remains available but inconsistent
```

**Guarantees:**

1. **Always Responsive:**
   - Every request gets a response
   - No timeouts or errors
   - System never "down"

2. **Partial Data Acceptable:**
   - May return stale data
   - Eventually consistent
   - Accepts temporary inconsistency

**Example - Social Media Feed:**

```javascript
// Available system
await db.write('post_likes', 100);  // Write to Node A

// Immediately read from Node B (not yet replicated)
const likes = await db.read('post_likes');
// Returns: 95 (stale value)
// But request succeeds (available) ✅
```

**Trade-off:**

```
✅ Pros:
- Always responsive
- Low latency (read from nearest node)
- High throughput
- Fault tolerant

❌ Cons:
- Stale reads possible
- Data conflicts
- Complex conflict resolution
```

**Real-World Examples:**

| System | Why Availability Matters |
|--------|-------------------------|
| **Social media** | Posts/likes can lag slightly |
| **News feeds** | Content can be eventually consistent |
| **Search engines** | Index can be slightly stale |
| **DNS** | Must always resolve, even if cached |

---

### 🔌 **P - Partition Tolerance**

The system continues to operate despite network failures that partition the system into isolated groups.

**How It Works:**

```
Before Partition:
    [Node A] ←→ [Node B] ←→ [Node C]
    All nodes communicate

During Partition:
    [Node A] ←X→ [Node B] ←→ [Node C]
    Network failure between A and B

System must handle:
    - Requests to isolated nodes
    - Data inconsistency
    - Split-brain scenarios
```

**Guarantees:**

1. **Network Failure Resilience:**
   - System functions despite network issues
   - Handles disconnected nodes
   - Continues serving requests

2. **Split-Brain Handling:**
   - Manages conflicting writes
   - Resolves partitions when healed
   - Prevents data loss

**Example - Multi-Region Deployment:**

```javascript
// US Region (Node A)
await db.write('user_preference', 'dark_mode');

// Network partition occurs between US and EU

// EU Region (Node B) - isolated
const pref = await db.read('user_preference');
// Returns cached value or error, depending on CP vs AP choice
```

**Why Partition Tolerance is Mandatory:**

```
Network failures are inevitable:
- Router failures
- Data center connectivity issues
- Fiber cuts
- DDoS attacks
- Cross-region latency spikes

→ Distributed systems MUST handle partitions
→ CAP choice is really between CP and AP
```

---

## CAP Combinations

### 🔵 **CP: Consistency + Partition Tolerance**

**Sacrifices availability** to maintain consistency during partitions.

**How It Works:**

```
During network partition:
    - Minority partition rejects writes
    - Rejects reads to prevent stale data
    - Returns errors instead of stale data

Result: System unavailable but consistent ✅
```

**Behavior During Partition:**

```
5 nodes: A, B, C, D, E
Partition: [A, B] | [C, D, E]

Partition with A, B (minority):
    - Read: ERROR (cannot guarantee consistency)
    - Write: ERROR (cannot replicate to majority)

Partition with C, D, E (majority):
    - Read: SUCCESS (majority has latest data)
    - Write: SUCCESS (can replicate to majority)
```

**Example - MongoDB (CP):**

```javascript
// MongoDB with majority write concern
const result = await collection.updateOne(
  { _id: userId },
  { $set: { balance: 1000 } },
  { writeConcern: { w: 'majority' } }  // Waits for majority
);

// During partition, minority partition returns error:
// MongoError: Not enough data-bearing nodes
```

**Real-World Systems:**

| System | Type | Use Case |
|--------|------|----------|
| **HBase** | CP | Financial data, transaction logs |
| **MongoDB** | CP (configurable) | E-commerce, inventory |
| **Redis Cluster** | CP | Session storage, caching |
| **etcd** | CP | Configuration management, service discovery |
| **Zookeeper** | CP | Distributed coordination, leader election |

**When to Choose CP:**

| ✅ Good For | ❌ Bad For |
|------------|-----------|
| Financial transactions | Social media feeds |
| Inventory management | News aggregation |
| Booking systems | Analytics dashboards |
| Data requiring accuracy | Content delivery |

---

### 🟢 **AP: Availability + Partition Tolerance**

**Sacrifices consistency** to remain available during partitions.

**How It Works:**

```
During network partition:
    - All partitions accept reads (may be stale)
    - All partitions accept writes (causes conflicts)
    - Conflicts resolved later (last-write-wins, merge, etc.)

Result: System available but possibly inconsistent ⚠️
```

**Behavior During Partition:**

```
3 nodes: A, B, C
Partition: [A] | [B, C]

Node A (isolated):
    - Read: Returns local value (may be stale)
    - Write: Accepts write (stored locally)

Nodes B, C:
    - Read: Returns latest replicated value
    - Write: Accepts write (replicated between B and C)

Partition heals:
    - Conflicts detected
    - Resolved via conflict resolution strategy
```

**Example - Cassandra (AP):**

```javascript
// Cassandra with eventual consistency
await client.execute(
  'UPDATE users SET balance = 1000 WHERE user_id = ?',
  [userId],
  { consistency: cassandra.types.consistencies.one }  // Write to one node
);

// During partition, both partitions accept writes:
// Partition A: balance = 1000
// Partition B: balance = 1200
// → Conflict! Resolved by last-write-wins (timestamp)
```

**Real-World Systems:**

| System | Type | Use Case |
|--------|------|----------|
| **Cassandra** | AP | Time-series data, IoT |
| **DynamoDB** | AP | Session storage, user profiles |
| **Riak** | AP | Shopping carts, user content |
| **CouchDB** | AP | Mobile apps, offline-first |
| **DNS** | AP | Domain name resolution |

**Conflict Resolution Strategies:**

**1. Last-Write-Wins (LWW):**

```javascript
// Conflict: Two concurrent writes
Node A: { value: 100, timestamp: 1000 }
Node B: { value: 200, timestamp: 1001 }

// Resolution: Higher timestamp wins
Final value: 200 ✅
```

**2. Vector Clocks:**

```javascript
// Track causality
Node A: { value: 'dark', vector: {A:1, B:0, C:0} }
Node B: { value: 'light', vector: {A:0, B:1, C:0} }

// Concurrent updates (neither causally precedes the other)
// → Application resolves conflict
```

**3. CRDTs (Conflict-free Replicated Data Types):**

```javascript
// Counter CRDT (always mergeable)
Node A increments: +5
Node B increments: +3

// Merge: +5 + +3 = +8
// No conflict ✅
```

**When to Choose AP:**

| ✅ Good For | ❌ Bad For |
|------------|-----------|
| Social media | Banking |
| Content delivery | Ticket booking |
| User profiles | Inventory with limited stock |
| Shopping carts | Financial trading |
| Analytics | Double-spend prevention |

---

### ⚠️ **CA: Consistency + Availability**

**Cannot tolerate partitions.** Only possible in non-distributed systems.

**Reality:**

```
CA systems don't exist in distributed environments:
    - Network partitions are inevitable
    - Cannot guarantee both C and A during partition
    - CA only applies to single-node systems

Examples:
- Single PostgreSQL instance (not distributed)
- Single MySQL instance (not distributed)
- Traditional RDBMS on one server
```

**Why CA Doesn't Work in Distributed Systems:**

```
Scenario: 2-node distributed database (trying to be CA)

Normal operation:
    Write to Node A → Replicate to Node B → Success ✅

Network partition:
    Write to Node A → Cannot reach Node B

    Options:
    1. Accept write → Inconsistent (violates C)
    2. Reject write → Unavailable (violates A)

    → Cannot maintain both C and A during partition!
```

---

## Practical CAP Decisions

### 📊 **CAP Spectrum**

In practice, systems exist on a spectrum, not binary CP or AP.

```
Strong Consistency (CP)                    Eventual Consistency (AP)
    |-------------------------------------------|
    |         |              |                 |
  Banking   E-commerce   Social Media     Analytics
  (CP)      (Tunable)     (AP)            (AP)
```

**Tunable Consistency:**

Many systems allow you to choose per-operation:

**Cassandra Example:**

```javascript
// Strong consistency (CP-like)
await client.execute(query, params, {
  consistency: cassandra.types.consistencies.quorum  // Wait for majority
});

// Eventual consistency (AP-like)
await client.execute(query, params, {
  consistency: cassandra.types.consistencies.one  // Return immediately
});
```

**MongoDB Example:**

```javascript
// Strong consistency (CP)
await collection.find({}).readPreference('primary');

// Eventual consistency (AP)
await collection.find({}).readPreference('secondaryPreferred');
```

---

### 🎯 **Choosing Between CP and AP**

**Decision Matrix:**

| Factor | Choose CP | Choose AP |
|--------|-----------|-----------|
| **Data Correctness** | Critical | Flexible |
| **User Experience** | Can tolerate errors | Must always respond |
| **Data Conflicts** | Unacceptable | Manageable |
| **Read Pattern** | Must be latest | Stale acceptable |
| **Write Pattern** | Infrequent | High volume |
| **Network Quality** | Reliable | Unreliable |

**Example Scenarios:**

**Scenario 1: Bank Account Balance**

```
Requirements:
- Balance must be accurate
- Cannot allow overdrafts
- Conflicting transactions unacceptable

Decision: CP ✅
Database: MongoDB, etcd, PostgreSQL with sync replication

Reasoning: Money cannot be incorrect, even temporarily
```

**Scenario 2: Social Media Likes**

```
Requirements:
- Must always show feed
- Occasional stale like counts acceptable
- High read/write volume

Decision: AP ✅
Database: Cassandra, DynamoDB

Reasoning: User experience (availability) > exact like count
```

**Scenario 3: E-commerce Shopping Cart**

```
Requirements:
- Cart must always be accessible
- Occasional conflicts (add same item twice) resolvable
- Multiple devices accessing same cart

Decision: AP ✅
Database: DynamoDB, Riak

Reasoning: Never want "cart unavailable", conflicts rare and fixable
```

**Scenario 4: Inventory with 1 Item Left**

```
Requirements:
- Cannot oversell (only 1 item in stock)
- Must prevent double-booking
- Accuracy critical

Decision: CP ✅
Database: PostgreSQL, MongoDB with majority writes

Reasoning: Cannot sell same item twice (consistency critical)
```

---

## PACELC Extension

### 📐 **Beyond CAP: PACELC**

CAP only describes behavior during partitions. **PACELC** extends this:

```
PACELC Theorem:
    If Partition:
        Choose Availability or Consistency
    Else (no partition):
        Choose Latency or Consistency
```

**The Four Scenarios:**

| Scenario | Database Examples | Characteristics |
|----------|------------------|----------------|
| **PA/EL** | Cassandra, DynamoDB | Availability during partition, Low latency normally |
| **PA/EC** | Riak | Availability during partition, Consistency normally |
| **PC/EL** | MongoDB, Redis | Consistency during partition, Low latency normally |
| **PC/EC** | HBase, Zookeeper | Consistency during partition, Consistency normally |

**Examples:**

**Cassandra (PA/EL):**

```javascript
// During partition (PA): Choose Availability
await client.execute(query, { consistency: ONE });
// Returns immediately, may be stale

// Normal operation (EL): Choose Low Latency
await client.execute(query, { consistency: ONE });
// Fast response, eventual consistency
```

**MongoDB (PC/EC):**

```javascript
// During partition (PC): Choose Consistency
await collection.updateOne(filter, update, {
  writeConcern: { w: 'majority' }
});
// Waits for majority, may error if partition

// Normal operation (EC): Choose Consistency
await collection.updateOne(filter, update, {
  writeConcern: { w: 'majority' }
});
// Ensures consistency, higher latency
```

---

## Real-World Systems

### 🌐 **CAP in Production**

**Amazon DynamoDB (AP):**

```javascript
// Default: Eventual consistency (AP)
const params = {
  TableName: 'Users',
  Key: { userId: '123' },
  ConsistentRead: false  // Eventual consistency
};
const result = await dynamodb.get(params);

// Optional: Strong consistency (CP-like, single region)
const paramsStrong = {
  TableName: 'Users',
  Key: { userId: '123' },
  ConsistentRead: true  // Strong consistency
};
```

**Google Spanner (CP with high availability):**

```sql
-- Strong consistency with global distribution
-- Uses TrueTime for global clock synchronization

BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
COMMIT;

-- Guarantees serializable isolation globally
```

**Cassandra (AP with tunable consistency):**

```javascript
// AP: Low latency, eventual consistency
await client.execute(query, {
  consistency: cassandra.types.consistencies.one
});

// CP-like: Strong consistency, higher latency
await client.execute(query, {
  consistency: cassandra.types.consistencies.quorum
});

// Strong consistency for critical operations
await client.execute(query, {
  consistency: cassandra.types.consistencies.all
});
```

---

## Interview Questions

### Q1: Can you have all three (C, A, P) in a distributed system?

**Answer:**

**No**, you cannot have all three simultaneously in a distributed system. This is the fundamental constraint of the CAP theorem.

**Why Not:**

During a network partition:

```
Scenario: 2-node system, network partition occurs

Option 1: Choose Consistency (CP)
    - Wait for all nodes to sync
    - Minority partition rejects requests
    - Result: Unavailable ❌

Option 2: Choose Availability (AP)
    - Both partitions accept requests
    - Nodes have different data
    - Result: Inconsistent ❌

Cannot have both during partition!
```

**Proof by Contradiction:**

```
Assume C + A + P are all possible:

1. Network partition occurs: [Node A] | [Node B]
2. Client writes X=1 to Node A
3. Client immediately reads from Node B

For Consistency (C): Must return X=1
For Availability (A): Must return a value (not error)
But: Node B hasn't received update (partition!)

→ Node B returns old value (violates C)
→ OR Node B returns error (violates A)

Contradiction! Cannot have C + A + P
```

**Exception:**

CA is possible in **single-node** (non-distributed) systems:
- No network partitions (single machine)
- Can be both consistent and available
- Example: Single PostgreSQL instance

But in distributed systems, partitions are inevitable, so you must choose CP or AP.

---

### Q2: How does eventual consistency work in AP systems?

**Answer:**

Eventual consistency means that if no new updates are made, all replicas will **eventually** converge to the same value.

**How It Works:**

**1. Accept Writes Immediately:**

```javascript
// Client writes to nearest replica
await db.write('user_status', 'active');
// Write accepted immediately (low latency)
```

**2. Asynchronous Replication:**

```
Node A receives write
    ↓
Acknowledge to client immediately
    ↓
Asynchronously replicate to Node B, C, D...
    ↓
Eventually all nodes have the same data
```

**3. Conflict Detection:**

```javascript
// Concurrent writes to different nodes
Node A: write value=100 at time=1000
Node B: write value=200 at time=1001

// During replication, conflict detected
// Resolution strategy applied (e.g., last-write-wins)
Final value: 200 (higher timestamp)
```

**Timeline:**

```
T0: All nodes have value=5

T1: Client writes value=10 to Node A
    Node A: value=10 ✅
    Node B: value=5 (stale)
    Node C: value=5 (stale)
    → Inconsistent

T2: Replication to Node B completes
    Node A: value=10
    Node B: value=10 ✅
    Node C: value=5 (stale)
    → Still inconsistent

T3: Replication to Node C completes
    Node A: value=10
    Node B: value=10
    Node C: value=10 ✅
    → Eventually consistent ✅
```

**Guarantees:**

1. **Convergence:**
   - All replicas converge to same value
   - Given sufficient time without updates

2. **Read Your Writes (optional):**
   - Client's own writes visible immediately
   - Implemented via session consistency

3. **Monotonic Reads (optional):**
   - Once you read value X, won't read older value
   - Implemented via sticky sessions

**Implementation Techniques:**

**Anti-Entropy (Background Sync):**

```javascript
// Periodic sync between replicas
setInterval(async () => {
  const diffs = await compareWithReplicas();
  await syncDifferences(diffs);
}, 60000);  // Every minute
```

**Read Repair:**

```javascript
async function read(key) {
  const results = await readFromMultipleReplicas(key);

  // Detect inconsistencies
  if (results.hasDifferences()) {
    // Fix stale replicas in background
    fixStalReplicas(key, results.latestValue());
  }

  return results.latestValue();
}
```

**Hinted Handoff:**

```javascript
// Node A unavailable, write to Node B
// Node B stores "hint" for Node A
await db.write(key, value, {
  hint: { targetNode: 'A', reason: 'unavailable' }
});

// When Node A recovers, transfer hinted data
```

**Trade-offs:**

| Aspect | Benefit | Cost |
|--------|---------|------|
| **Latency** | Low (immediate response) | Stale reads possible |
| **Availability** | High (always writable) | Conflicts need resolution |
| **Complexity** | High (conflict resolution) | More application logic |
| **Consistency** | Eventual | Temporary inconsistencies |

---

### Q3: When would you choose a CP system over an AP system?

**Answer:**

Choose **CP (Consistency + Partition Tolerance)** when **data correctness is more important than availability**.

**Choose CP When:**

**1. Financial Transactions:**

```javascript
// Bank transfer - cannot allow inconsistency
async function transfer(fromAccount, toAccount, amount) {
  // MUST be atomic and consistent
  await db.transaction(async (tx) => {
    await tx.deduct(fromAccount, amount);
    await tx.add(toAccount, amount);
  });
  // Cannot have partial execution or stale reads
}
```

**Why:** Money cannot be inconsistent, even temporarily. Overdrafts or double-spending unacceptable.

**2. Inventory with Limited Stock:**

```javascript
// Last item in stock
async function purchaseItem(itemId, userId) {
  await db.transaction(async (tx) => {
    const item = await tx.get(itemId, { lock: true });

    if (item.stock < 1) {
      throw new Error('Out of stock');
    }

    await tx.update(itemId, { stock: item.stock - 1 });
  });
}
```

**Why:** Cannot oversell last item. Two customers cannot buy the same last item.

**3. Seat Booking/Reservation:**

```javascript
// Concert ticket booking
async function bookSeat(seatId, userId) {
  const result = await db.updateIf(
    { seatId, status: 'available' },
    { status: 'booked', userId },
    { consistency: 'strong' }
  );

  if (!result.success) {
    throw new Error('Seat already booked');
  }
}
```

**Why:** Cannot double-book seats. Must prevent conflicts atomically.

**4. Leader Election:**

```javascript
// Distributed system needs single leader
const leader = await zookeeper.election('/election', nodeId, {
  consistency: 'strong'
});

// Only ONE node can be leader
// Strong consistency critical
```

**Why:** Cannot have multiple leaders (split-brain). Must have consensus.

**Choose AP When:**

**1. Social Media Feeds:**

```javascript
// Twitter-like feed
async function getUserFeed(userId) {
  // Stale data acceptable
  const posts = await db.query({
    followers: userId,
    limit: 50
  }, { consistency: 'eventual' });

  return posts;
}
```

**Why:** Showing feed immediately more important than exact like counts.

**2. Shopping Carts:**

```javascript
// E-commerce cart
async function addToCart(userId, itemId, quantity) {
  // Always accept, resolve conflicts later
  await db.add(`cart:${userId}`, {
    itemId,
    quantity,
    timestamp: Date.now()
  }, { consistency: 'eventual' });
}
```

**Why:** Cart should always be accessible. Conflicts (duplicate items) easily resolved.

**3. User Profiles:**

```javascript
// User profile updates
async function updateProfile(userId, updates) {
  // Last write wins
  await db.update(userId, {
    ...updates,
    updatedAt: Date.now()
  }, { consistency: 'eventual' });
}
```

**Why:** Profile updates not critical. Last update wins is acceptable.

**Decision Table:**

| Requirement | Choose |
|------------|--------|
| Cannot tolerate data conflicts | **CP** |
| Must prevent double-operations (double-spend, double-book) | **CP** |
| Financial accuracy required | **CP** |
| Can tolerate temporary inconsistency | **AP** |
| High availability critical | **AP** |
| Conflict resolution acceptable | **AP** |
| Stale reads acceptable | **AP** |
| Global distribution with low latency | **AP** |

**Best Practice:**

Most applications need **both** CP and AP for different features:

```javascript
// CP for critical operations
await orderService.checkout(cart, payment, {
  consistency: 'strong'  // CP: Inventory must be accurate
});

// AP for non-critical operations
await socialService.updateFeed(userId, post, {
  consistency: 'eventual'  // AP: Feed can be eventually consistent
});
```

---

## Summary

### Key Takeaways

1. **CAP Theorem:**
   - **C**onsistency: All nodes see same data
   - **A**vailability: Every request gets response
   - **P**artition Tolerance: Works despite network failures
   - **Can only have 2 of 3** in distributed systems

2. **Real Choice:**
   - Partition tolerance is mandatory (failures happen)
   - Real choice: **CP vs AP**
   - CP: Consistency over availability
   - AP: Availability over consistency

3. **Trade-offs:**
   - CP: Accurate but may be unavailable during partitions
   - AP: Always available but may return stale data

4. **Practical Approach:**
   - Use **CP** for critical data (money, inventory)
   - Use **AP** for user experience (feeds, carts)
   - Many systems are **tunable** (Cassandra, MongoDB)

### Decision Framework

```
Is data correctness critical?
    ├─ YES → Choose CP (MongoDB, PostgreSQL, etcd)
    └─ NO  → Is high availability critical?
            ├─ YES → Choose AP (Cassandra, DynamoDB)
            └─ NO  → Consider CA (single instance)
```

### Real-World Systems

| System | Type | Best For |
|--------|------|----------|
| **PostgreSQL** | CP | Relational data, transactions |
| **MongoDB** | CP (tunable) | Document storage, e-commerce |
| **Cassandra** | AP (tunable) | Time-series, high writes |
| **DynamoDB** | AP | Key-value, user profiles |
| **Redis** | CP | Caching, sessions |
| **Riak** | AP | Shopping carts, user content |

### Interview Focus

- Understand CAP trade-offs deeply
- Know when to choose CP vs AP
- Explain eventual consistency
- Discuss real-world system examples
- Understand PACELC extension
- Know conflict resolution strategies

---
[← Back to SystemDesign](../README.md)
