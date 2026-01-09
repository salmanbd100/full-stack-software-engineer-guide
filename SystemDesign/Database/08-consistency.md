# Consistency Models

## Overview

### 💡 **What are Consistency Models?**

Consistency models define the contract between a distributed system and its clients regarding the visibility and ordering of operations. They specify **when** and **how** updates become visible to readers.

**The Spectrum:**

```
Strong Consistency ←─────────────────────→ Weak Consistency
(Expensive, Slow)                         (Cheap, Fast)

Linearizable → Sequential → Causal → Eventual
```

**Key Insight:**
> Consistency models are about trade-offs: stronger consistency = simpler programming but slower performance; weaker consistency = complex programming but faster performance.

---

## Strong Consistency Models

### 🔒 **Linearizability (Strongest)**

Operations appear to execute atomically and in real-time order.

**Guarantees:**

- Once a write completes, all subsequent reads return the new value
- Operations appear instantaneous
- Total order across all operations

**Example:**

```javascript
// Client A writes
await db.write('x', 10);  // Completes at T1

// Client B reads (after T1)
const value = await db.read('x');
// MUST return 10 (never stale value)
```

**Use Cases:**
- Banking systems
- Ticket booking
- Leader election
- Any system where stale reads are unacceptable

---

### 📋 **Sequential Consistency**

Operations appear in some sequential order, but not necessarily real-time order.

**Difference from Linearizability:**

```
Linearizable:
Time:     T1    T2    T3    T4
Write(x=1) ─┐
            └─> Read(x) must see 1

Sequential:
Write(x=1) and Read(x) may appear in different order
as long as ALL clients see same order
```

**Use Cases:**
- Distributed databases with global ordering
- Systems where ordering matters but not real-time

---

## Weak Consistency Models

### 🔄 **Causal Consistency**

Operations that are causally related are seen in order. Concurrent operations can be seen in any order.

**How It Works:**

```
If A → B (A happens before B), then all nodes see A before B
If A || B (A concurrent with B), nodes can see any order
```

**Example:**

```javascript
// Thread 1
await db.write('post', 'Hello');  // A
await db.write('like', '1');       // B (caused by A)
// A → B (causal relationship)
// All clients see A before B

// Thread 2 (concurrent)
await db.write('comment', 'Nice'); // C
// C || A, C || B (concurrent)
// Can appear in any order relative to A, B
```

**Use Cases:**
- Social media (post → like → comment chain)
- Collaborative editing
- Chat applications

---

### ⏱️ **Eventual Consistency (Weakest)**

If no updates occur, all replicas eventually converge to same value.

**Guarantees:**

- **Convergence**: Eventually all replicas agree
- **No ordering**: Concurrent updates may appear in any order
- **Conflict resolution**: Application must handle conflicts

**Example:**

```javascript
// Node A
await db.write('likes', 100);

// Node B (concurrent)
await db.write('likes', 105);

// Eventually both nodes converge to one value
// (e.g., 105 via last-write-wins)
```

**Use Cases:**
- Shopping carts
- User profiles
- News feeds
- Analytics dashboards

---

## Session Consistency

### 👤 **Read Your Writes**

A client always sees its own writes.

**Example:**

```javascript
// Client writes
await db.write('preference', 'dark_mode');

// Immediately read (from any replica)
const pref = await db.read('preference');
// MUST see 'dark_mode' (own write)

// Other clients may still see old value
```

**Implementation:**

```javascript
class SessionConsistency {
  constructor(clientId) {
    this.clientId = clientId;
    this.writeVersion = 0;
  }

  async write(key, value) {
    this.writeVersion++;
    await db.write(key, value, {
      clientId: this.clientId,
      version: this.writeVersion
    });
  }

  async read(key) {
    return await db.read(key, {
      clientId: this.clientId,
      minVersion: this.writeVersion  // Don't return older than my writes
    });
  }
}
```

---

### 📖 **Monotonic Reads**

Once a client reads a value, it never reads an older value.

**Example:**

```javascript
// T1: Read returns version 5
const v1 = await db.read('counter'); // 5

// T2: Read must return >= version 5
const v2 = await db.read('counter'); // 5 or 6 or 7... (never 4)
```

**Implementation - Sticky Sessions:**

```javascript
// Always route client to same replica
const replica = selectReplicaByHash(clientId);
const value = await replica.read(key);
```

---

### ✍️ **Monotonic Writes**

Writes from a client are applied in order.

**Example:**

```javascript
// Client writes
await db.write('counter', 5);   // W1
await db.write('counter', 10);  // W2

// All replicas see W1 before W2
// Never W2 = 10, then W1 = 5
```

---

## Interview Questions

### Q1: Explain the difference between linearizability and sequential consistency.

**Answer:**

**Linearizability:**
- Operations respect **real-time ordering**
- If operation A completes before operation B starts, all nodes see A before B
- Strongest consistency model

**Sequential Consistency:**
- Operations appear in **some** sequential order
- Does NOT respect real-time ordering
- All nodes see same order, but not necessarily real-time order

**Example:**

```
Time:        T1    T2    T3    T4
Client A:    W(x=1)─┘          R(x)→?
Client B:          └─W(x=2)

Linearizable:
- R(x) MUST return 2 (W(x=2) happened before R(x) in real-time)

Sequential:
- R(x) MAY return 1 or 2
- As long as all clients see same order
- E.g., all see: W(x=1), R(x), W(x=2) → R(x)=1 ✅
```

**Key Difference:**

| Aspect | Linearizability | Sequential |
|--------|----------------|-----------|
| **Real-time order** | ✅ Enforced | ❌ Not enforced |
| **Total order** | ✅ Yes | ✅ Yes |
| **Performance** | Slower | Faster |
| **Complexity** | High (needs global clock) | Moderate |

---

### Q2: How does eventual consistency handle conflicts?

**Answer:**

Eventual consistency uses **conflict resolution strategies**:

**1. Last-Write-Wins (LWW):**

```javascript
// Conflict: Two concurrent writes
Node A: write(x=100, timestamp=1000)
Node B: write(x=200, timestamp=1001)

// Resolution: Higher timestamp wins
Final value: 200
```

**Pros:** Simple, deterministic
**Cons:** May lose data

**2. Vector Clocks:**

```javascript
// Track causality per node
Node A: {value: 100, vector: {A:1, B:0}}
Node B: {value: 200, vector: {A:0, B:1}}

// Concurrent writes detected
// Application resolves (e.g., merge, prompt user)
```

**Pros:** Detects all conflicts
**Cons:** Complex, requires application logic

**3. CRDTs (Conflict-free Replicated Data Types):**

```javascript
// Counter CRDT
Node A: increment(5)   → {A:5, B:0}
Node B: increment(3)   → {A:0, B:3}

// Merge: sum all increments
Final value: 5 + 3 = 8
// No conflict!
```

**Pros:** Automatic merge, no conflicts
**Cons:** Limited data types

**4. Application-Specific:**

```javascript
// Shopping cart: merge items
Cart A: [{item: 'A', qty: 1}]
Cart B: [{item: 'B', qty: 2}]

// Merge: combine both
Final: [{item: 'A', qty: 1}, {item: 'B', qty: 2}]
```

---

### Q3: When would you choose eventual consistency over strong consistency?

**Answer:**

Choose **Eventual Consistency** when:

**1. High Availability is Critical:**

```javascript
// Social media feed - must always load
async function getFeed(userId) {
  // Stale data acceptable
  return await db.query({ userId }, { consistency: 'eventual' });
}
```

**Why:** User experience > exact data

**2. Conflicts are Rare/Resolvable:**

```javascript
// Shopping cart - conflicts easily merged
async function addToCart(userId, item) {
  // Concurrent adds are mergeable
  return await db.append(`cart:${userId}`, item);
}
```

**Why:** Conflicts don't cause data loss

**3. Global Distribution:**

```javascript
// CDN content - low latency critical
async function getContent(key) {
  // Read from nearest replica
  return await cdn.get(key, { nearest: true });
}
```

**Why:** Latency matters more than consistency

**4. High Write Throughput:**

```javascript
// Analytics - millions of events/sec
async function trackEvent(event) {
  // Fire-and-forget, eventual consistency fine
  await analytics.track(event, { async: true });
}
```

**Why:** Can't block on synchronous replication

**Choose Strong Consistency when:**

| Scenario | Why |
|----------|-----|
| Financial transactions | Money must be accurate |
| Inventory (last item) | Can't oversell |
| Leader election | Must have single leader |
| Access control | Security critical |

---

## Summary

### Key Takeaways

1. **Consistency Models Spectrum:**
   - Linearizable (strongest, slowest)
   - Sequential
   - Causal
   - Eventual (weakest, fastest)

2. **Trade-offs:**
   - Strong consistency: Simple programming, slow performance
   - Weak consistency: Complex programming, fast performance

3. **Session Guarantees:**
   - Read Your Writes
   - Monotonic Reads
   - Monotonic Writes

4. **Practical Choice:**
   - Use strong consistency for critical data
   - Use eventual consistency for user experience
   - Most systems use mix of both

### Decision Matrix

| Requirement | Choose |
|------------|--------|
| Must see own writes | Read-your-writes consistency |
| Can tolerate stale reads | Eventual consistency |
| Ordering matters | Causal or Sequential |
| Real-time ordering critical | Linearizability |
| Global low latency | Eventual consistency |

---
[← Back to SystemDesign](../README.md)
