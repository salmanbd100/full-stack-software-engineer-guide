# Database Replication

## Table of Contents
- [Overview](#overview)
- [Replication Types](#replication-types)
- [Primary-Replica Replication](#primary-replica-replication)
- [Multi-Primary Replication](#multi-primary-replication)
- [Replication Methods](#replication-methods)
- [Synchronous vs Asynchronous](#synchronous-vs-asynchronous)
- [Conflict Resolution](#conflict-resolution)
- [Implementation Examples](#implementation-examples)
- [Interview Questions](#interview-questions)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

---

## Overview

### 💡 **Database Replication**

Process of copying and maintaining database data across multiple servers to improve availability, reliability, and performance.

**Why Replication:**

Single database server limitations:
- Single point of failure
- Limited read capacity
- No disaster recovery
- Geographic latency
- Maintenance downtime

**Replication Benefits:**

- ✅ High availability (failover capability)
- ✅ Read scaling (distribute read load)
- ✅ Disaster recovery (data backup)
- ✅ Geographic distribution (low latency)
- ✅ Zero-downtime maintenance

**Replication vs Other Techniques:**

| Technique | Purpose | Data Distribution |
|-----------|---------|-------------------|
| **Replication** | Availability, read scaling | Full copy on each server |
| **Sharding** | Write scaling, capacity | Partition across servers |
| **Caching** | Performance | Hot data in memory |
| **Backup** | Recovery only | Offline snapshots |

---

## Replication Types

### 💡 **Main Replication Architectures**

#### **1. Primary-Replica (Master-Slave)**

One primary handles writes, replicas serve reads.

```
         Application
            ↙    ↘
    Write ↙        ↘ Read
         ↙          ↘
    Primary      Replicas
    (Write)      (Read-only)
       ↓            ↓
    [DB1]    [DB2] [DB3] [DB4]
       │      ↑     ↑     ↑
       └──────┴─────┴─────┘
         Replication
```

**Characteristics:**
- Single source of truth (primary)
- All writes go to primary
- Reads distributed across replicas
- Asynchronous or synchronous replication

**When to Use:**
- ✅ Read-heavy workloads (90% reads)
- ✅ Need high availability
- ✅ Simple architecture required
- ❌ Write-heavy workloads
- ❌ Need geographic writes

#### **2. Multi-Primary (Master-Master)**

Multiple servers accept writes simultaneously.

```
    Application Servers
    ↙   ↓   ↓   ↘
Primary1 Primary2 Primary3 Primary4
(R/W)    (R/W)    (R/W)    (R/W)
  ↕        ↕        ↕        ↕
  └────────┼────────┼────────┘
     Bi-directional Replication
```

**Characteristics:**
- Multiple write sources
- Bi-directional replication
- Conflict resolution needed
- Higher complexity

**When to Use:**
- ✅ Write-heavy workloads
- ✅ Geographic distribution
- ✅ Need write availability
- ❌ Simple consistency model needed
- ❌ Can't handle conflicts

#### **3. Chain Replication**

Linear replication chain.

```
Primary → Replica1 → Replica2 → Replica3
(Write)   (Relay)    (Relay)    (Read)
```

**Characteristics:**
- Reduces load on primary
- Replicas relay to next
- Read from tail for consistency

**When to Use:**
- ✅ Primary overloaded with replication
- ✅ Need consistent reads
- ❌ Low latency required

---

## Primary-Replica Replication

### 💡 **Most Common Pattern**

### Architecture Components

**1. Primary (Master):**
- Accepts all write operations
- Maintains replication log
- Sends changes to replicas

**2. Replicas (Slaves):**
- Receive changes from primary
- Apply changes locally
- Serve read queries
- Can be promoted to primary

**3. Replication Log:**
- Binary log (MySQL)
- Write-Ahead Log / WAL (PostgreSQL)
- Oplog (MongoDB)

### Read Scaling

**Distribution Strategies:**

```javascript
class DatabaseCluster {
  constructor(primary, replicas) {
    this.primary = primary;
    this.replicas = replicas;
    this.replicaIndex = 0;
  }

  // All writes to primary
  async write(query, params) {
    return await this.primary.execute(query, params);
  }

  // Reads from replicas (round-robin)
  async read(query, params) {
    const replica = this.getReplica();
    return await replica.execute(query, params);
  }

  getReplica() {
    // Round-robin load balancing
    const replica = this.replicas[this.replicaIndex];
    this.replicaIndex = (this.replicaIndex + 1) % this.replicas.length;
    return replica;
  }

  // Critical reads from primary (avoid replication lag)
  async readFromPrimary(query, params) {
    return await this.primary.execute(query, params);
  }
}
```

### Replication Lag

**Problem:** Replicas behind primary.

```javascript
// Replication lag scenario
await db.write('UPDATE users SET balance = 1000 WHERE id = 1');

// Immediately read from replica
const user = await db.read('SELECT * FROM users WHERE id = 1');
console.log(user.balance); // Might still be old value (900)
```

**Solutions:**

**A. Read-Your-Writes Consistency:**
```javascript
class ReplicationAwareDB {
  constructor(primary, replicas) {
    this.primary = primary;
    this.replicas = replicas;
    this.userWriteTimestamps = new Map();
  }

  async write(userId, query, params) {
    const result = await this.primary.execute(query, params);

    // Track write timestamp
    this.userWriteTimestamps.set(userId, Date.now());

    return result;
  }

  async read(userId, query, params) {
    const writeTime = this.userWriteTimestamps.get(userId);

    // Recent write? Read from primary
    if (writeTime && Date.now() - writeTime < 5000) {
      return await this.primary.execute(query, params);
    }

    // Old or no write? Use replica
    return await this.getReplica().execute(query, params);
  }
}
```

**B. Monotonic Reads:**
```javascript
// Always read from same replica per session
class SessionStickyDB {
  constructor(primary, replicas) {
    this.primary = primary;
    this.replicas = replicas;
    this.sessionReplicas = new Map();
  }

  getReplicaForSession(sessionId) {
    if (!this.sessionReplicas.has(sessionId)) {
      // Assign replica to session
      const index = this.hash(sessionId) % this.replicas.length;
      this.sessionReplicas.set(sessionId, this.replicas[index]);
    }

    return this.sessionReplicas.get(sessionId);
  }

  async read(sessionId, query, params) {
    const replica = this.getReplicaForSession(sessionId);
    return await replica.execute(query, params);
  }
}
```

### Failover Process

**Automatic Failover:**

```javascript
class ReplicaSet {
  constructor(primary, replicas) {
    this.primary = primary;
    this.replicas = replicas;
    this.checkInterval = 5000; // 5 seconds

    this.startHealthChecks();
  }

  startHealthChecks() {
    setInterval(async () => {
      const isHealthy = await this.checkPrimaryHealth();

      if (!isHealthy) {
        await this.performFailover();
      }
    }, this.checkInterval);
  }

  async checkPrimaryHealth() {
    try {
      await this.primary.ping();
      return true;
    } catch (error) {
      console.error('Primary unhealthy:', error);
      return false;
    }
  }

  async performFailover() {
    console.log('Starting failover...');

    // 1. Find most up-to-date replica
    const newPrimary = await this.findBestReplica();

    // 2. Promote replica to primary
    await newPrimary.promoteToPrimary();

    // 3. Update configuration
    this.replicas = this.replicas.filter(r => r !== newPrimary);
    const oldPrimary = this.primary;
    this.primary = newPrimary;

    // 4. Notify application
    this.emit('failover', { oldPrimary, newPrimary });

    // 5. Reconfigure other replicas
    for (const replica of this.replicas) {
      await replica.setNewPrimary(newPrimary);
    }

    console.log('Failover complete');
  }

  async findBestReplica() {
    // Choose replica with least lag
    let best = this.replicas[0];
    let minLag = await best.getReplicationLag();

    for (const replica of this.replicas) {
      const lag = await replica.getReplicationLag();
      if (lag < minLag) {
        minLag = lag;
        best = replica;
      }
    }

    return best;
  }
}
```

---

## Multi-Primary Replication

### 💡 **Multiple Write Sources**

### Conflict Types

**1. Write-Write Conflicts:**

```javascript
// Concurrent updates to same record
// Primary 1:
UPDATE users SET name = 'Alice' WHERE id = 1;

// Primary 2 (simultaneously):
UPDATE users SET name = 'Bob' WHERE id = 1;

// Conflict! Which wins?
```

**2. Uniqueness Conflicts:**

```javascript
// Primary 1:
INSERT INTO users (email) VALUES ('john@example.com');

// Primary 2 (simultaneously):
INSERT INTO users (email) VALUES ('john@example.com');

// Conflict! Unique constraint violation
```

**3. Deletion Conflicts:**

```javascript
// Primary 1:
UPDATE posts SET content = 'Updated' WHERE id = 1;

// Primary 2 (simultaneously):
DELETE FROM posts WHERE id = 1;

// Conflict! Update or delete?
```

### Conflict Resolution Strategies

#### **1. Last-Write-Wins (LWW)**

Latest timestamp wins.

```javascript
class LWWDatabase {
  async handleConflict(local, remote) {
    // Each write has timestamp
    if (remote.timestamp > local.timestamp) {
      // Remote is newer
      return this.applyRemote(remote);
    } else {
      // Local is newer or equal
      return this.keepLocal(local);
    }
  }
}

// Schema includes version/timestamp
{
  user_id: 1,
  name: 'Alice',
  updated_at: '2024-01-10T10:30:00Z',  // Timestamp
  version: 5                              // Version number
}
```

**Pros:**
- Simple to implement
- No user intervention

**Cons:**
- Data loss (losing write)
- Concurrent updates lost
- Relies on synchronized clocks

#### **2. Application-Defined Resolution**

Application decides winner.

```javascript
class AppDefinedConflictResolver {
  resolveConflict(local, remote, field) {
    // Custom rules per field
    const rules = {
      // Price: keep higher value
      price: (l, r) => Math.max(l, r),

      // Stock: sum values (inventory from both)
      stock: (l, r) => l + r,

      // Description: keep longer text
      description: (l, r) => l.length > r.length ? l : r,

      // Last update: newer timestamp
      updated_at: (l, r) => l > r ? l : r
    };

    return rules[field](local[field], remote[field]);
  }

  async mergeRecords(local, remote) {
    const merged = {};

    for (const field in local) {
      merged[field] = this.resolveConflict(local, remote, field);
    }

    return merged;
  }
}
```

#### **3. Merge (CRDT)**

Conflict-free Replicated Data Types.

```javascript
// CRDT Counter (G-Counter)
class GCounter {
  constructor(nodeId, nodes) {
    this.nodeId = nodeId;
    this.counts = {};

    // Initialize all nodes to 0
    for (const node of nodes) {
      this.counts[node] = 0;
    }
  }

  increment() {
    this.counts[this.nodeId]++;
  }

  value() {
    // Sum all node counters
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  merge(other) {
    // Take max of each node's counter
    for (const node in other.counts) {
      this.counts[node] = Math.max(
        this.counts[node] || 0,
        other.counts[node]
      );
    }
  }
}

// Usage across multiple primaries
const counter1 = new GCounter('node1', ['node1', 'node2']);
const counter2 = new GCounter('node2', ['node1', 'node2']);

counter1.increment(); // node1: {node1: 1, node2: 0}
counter2.increment(); // node2: {node1: 0, node2: 1}
counter2.increment(); // node2: {node1: 0, node2: 2}

// Merge
counter1.merge(counter2); // {node1: 1, node2: 2}
console.log(counter1.value()); // 3 - no conflicts!
```

#### **4. Manual Resolution**

Store conflicts, let users resolve.

```javascript
class ManualConflictResolver {
  async handleConflict(local, remote) {
    // Store both versions
    await this.db.conflicts.insert({
      record_id: local.id,
      local_version: local,
      remote_version: remote,
      conflict_time: new Date(),
      resolved: false
    });

    // Notify admin/user
    await this.notify({
      type: 'conflict',
      message: `Conflict detected for record ${local.id}`,
      local,
      remote
    });

    // Keep local until resolved
    return local;
  }

  async resolveConflict(conflictId, chosenVersion) {
    const conflict = await this.db.conflicts.findById(conflictId);

    // Apply chosen version
    await this.db.records.update(
      { id: conflict.record_id },
      chosenVersion
    );

    // Mark conflict resolved
    await this.db.conflicts.update(
      { id: conflictId },
      { resolved: true, resolution: chosenVersion }
    );
  }
}
```

---

## Replication Methods

### 💡 **How Data is Replicated**

#### **1. Statement-Based Replication**

Replicate SQL statements.

```sql
-- Primary executes and logs statement
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');

-- Replicas receive and execute same statement
```

**Pros:**
- Compact logs
- Easy to understand

**Cons:**
- Non-deterministic functions (NOW(), RAND())
- Triggers may behave differently
- Order-dependent operations

#### **2. Row-Based Replication**

Replicate actual data changes.

```javascript
// Binary format log entry
{
  type: 'UPDATE',
  table: 'users',
  before: { id: 1, name: 'John', balance: 100 },
  after: { id: 1, name: 'John', balance: 150 }
}
```

**Pros:**
- Deterministic
- Safe for all operations
- Faster on replicas

**Cons:**
- Larger log size
- Update many rows = huge log

#### **3. Logical (Hybrid) Replication**

Combination of both.

```javascript
// Logical decoding (PostgreSQL)
{
  lsn: '0/12345',
  xid: 1000,
  table: 'users',
  operation: 'UPDATE',
  columns: {
    name: { old: 'John', new: 'Johnny' },
    updated_at: { new: '2024-01-10T10:00:00Z' }
  }
}
```

---

## Synchronous vs Asynchronous

### 💡 **Replication Timing**

#### **Synchronous Replication**

Primary waits for replica acknowledgment.

```javascript
async function synchronousWrite(primary, replicas, data) {
  // Write to primary
  await primary.write(data);

  // Wait for ALL replicas to acknowledge
  await Promise.all(
    replicas.map(replica => replica.write(data))
  );

  // Only then return success
  return { success: true };
}
```

**Flow:**
```
Client → Primary → Replica1 ─┐
              ↓              │
            Replica2         │ All must acknowledge
              ↓              │
            Replica3 ────────┘
              ↓
      Return success to client
```

**Characteristics:**

| Aspect | Value |
|--------|-------|
| **Consistency** | Strong (replicas always current) |
| **Performance** | Slower (wait for replicas) |
| **Availability** | Lower (replica failure blocks writes) |
| **Data Loss** | Zero (replicas must confirm) |

**When to Use:**
- ✅ Strong consistency required
- ✅ Financial transactions
- ✅ Critical data
- ❌ High write throughput needed
- ❌ Geographic distribution

#### **Asynchronous Replication**

Primary doesn't wait for replicas.

```javascript
async function asynchronousWrite(primary, replicas, data) {
  // Write to primary
  await primary.write(data);

  // Return immediately
  const result = { success: true };

  // Replicate in background (fire and forget)
  replicas.forEach(replica => {
    replica.write(data).catch(error => {
      console.error('Replication error:', error);
      // Retry or alert
    });
  });

  return result;
}
```

**Flow:**
```
Client → Primary → (return immediately)
           ↓
      Background replication
           ├→ Replica1
           ├→ Replica2
           └→ Replica3
```

**Characteristics:**

| Aspect | Value |
|--------|-------|
| **Consistency** | Eventual (lag possible) |
| **Performance** | Faster (no wait) |
| **Availability** | Higher (replica failures don't affect writes) |
| **Data Loss** | Possible (if primary fails before replication) |

**When to Use:**
- ✅ High throughput needed
- ✅ Eventual consistency acceptable
- ✅ Geographic replicas
- ❌ Strong consistency required
- ❌ Zero data loss required

#### **Semi-Synchronous Replication**

Wait for at least one replica.

```javascript
async function semiSynchronousWrite(primary, replicas, data) {
  // Write to primary
  await primary.write(data);

  // Wait for at least ONE replica
  await Promise.race(
    replicas.map(replica => replica.write(data))
  );

  // Others replicate asynchronously
  return { success: true };
}
```

**Characteristics:**
- Balance between sync and async
- Faster than full sync
- Safer than full async
- At least one replica guaranteed current

---

## Implementation Examples

### PostgreSQL Streaming Replication

```bash
# Primary configuration (postgresql.conf)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
synchronous_commit = off  # Async

# Create replication user
CREATE ROLE replicator REPLICATION LOGIN PASSWORD 'password';
```

```javascript
// Node.js monitoring replication lag
const { Pool } = require('pg');

const primary = new Pool({
  host: 'primary.example.com',
  database: 'mydb'
});

const replica = new Pool({
  host: 'replica.example.com',
  database: 'mydb'
});

async function getReplicationLag() {
  // Query primary for current WAL position
  const primaryResult = await primary.query(
    "SELECT pg_current_wal_lsn() as lsn"
  );

  // Query replica for replay position
  const replicaResult = await replica.query(
    "SELECT pg_last_wal_replay_lsn() as lsn"
  );

  // Calculate lag in bytes
  const lagResult = await primary.query(`
    SELECT pg_wal_lsn_diff($1, $2) as lag_bytes
  `, [primaryResult.rows[0].lsn, replicaResult.rows[0].lsn]);

  const lagBytes = parseInt(lagResult.rows[0].lag_bytes);
  const lagMB = (lagBytes / 1024 / 1024).toFixed(2);

  console.log(`Replication lag: ${lagMB} MB`);

  return lagBytes;
}

// Monitor every minute
setInterval(getReplicationLag, 60000);
```

### MySQL Replication

```sql
-- Primary setup
CREATE USER 'replicator'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';

-- Check primary status
SHOW MASTER STATUS;
-- +------------------+----------+
-- | File             | Position |
-- +------------------+----------+
-- | mysql-bin.000001 |      154 |
-- +------------------+----------+

-- Replica setup
CHANGE MASTER TO
  MASTER_HOST='primary.example.com',
  MASTER_USER='replicator',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=154;

START SLAVE;

-- Check replica status
SHOW SLAVE STATUS\G
```

```javascript
// Node.js MySQL replication monitoring
const mysql = require('mysql2/promise');

async function monitorMySQLReplication() {
  const replica = await mysql.createConnection({
    host: 'replica.example.com',
    user: 'admin',
    password: 'password'
  });

  const [rows] = await replica.query('SHOW SLAVE STATUS');
  const status = rows[0];

  console.log('Replication Status:');
  console.log(`  Slave_IO_Running: ${status.Slave_IO_Running}`);
  console.log(`  Slave_SQL_Running: ${status.Slave_SQL_Running}`);
  console.log(`  Seconds_Behind_Master: ${status.Seconds_Behind_Master}`);
  console.log(`  Last_Error: ${status.Last_Error}`);

  // Alert if replication broken
  if (status.Slave_IO_Running !== 'Yes' || status.Slave_SQL_Running !== 'Yes') {
    await alert('Replication broken!');
  }

  // Alert if lag > 30 seconds
  if (status.Seconds_Behind_Master > 30) {
    await alert(`High replication lag: ${status.Seconds_Behind_Master}s`);
  }

  await replica.end();
}
```

### MongoDB Replica Set

```javascript
// Initialize replica set
rs.initiate({
  _id: 'myReplicaSet',
  members: [
    { _id: 0, host: 'mongo1:27017', priority: 2 },  // Preferred primary
    { _id: 1, host: 'mongo2:27017' },
    { _id: 2, host: 'mongo3:27017' }
  ]
});

// Node.js connection with replica set
const { MongoClient } = require('mongodb');

const client = new MongoClient(
  'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/mydb?replicaSet=myReplicaSet',
  {
    readPreference: 'secondaryPreferred',  // Prefer reading from secondaries
    w: 'majority',  // Write concern: wait for majority
    retryWrites: true
  }
);

async function exampleQueries() {
  await client.connect();
  const db = client.db('mydb');

  // Write to primary (automatic)
  await db.collection('users').insertOne({
    name: 'John',
    email: 'john@example.com'
  });

  // Read from secondary (if available)
  const users = await db.collection('users').find({}).toArray();

  // Force read from primary for consistency
  const user = await db.collection('users').findOne(
    { email: 'john@example.com' },
    { readPreference: 'primary' }
  );
}

// Monitor replica set status
async function monitorReplicaSet() {
  const admin = client.db().admin();
  const status = await admin.command({ replSetGetStatus: 1 });

  console.log('Replica Set Status:');
  status.members.forEach(member => {
    console.log(`  ${member.name}: ${member.stateStr} (lag: ${member.optimeDate})`);
  });
}
```

---

## Interview Questions

### Q1: Explain replication lag and how to handle it.

**Answer:**

**What is Replication Lag:**

Time delay between primary write and replica receiving/applying the change.

```
Time: T0          T1          T2          T3
Primary:  Write → [Data] ────→ Continue
                    ↓
Replica:           ↓ (network) ↓ (apply)  ↓
                   └────────────→ [Data]  Ready

                   Lag = T3 - T0
```

**Causes:**
- Network latency
- Replica overloaded (slow disk/CPU)
- Large transactions
- Synchronous commits on replica

**Impact:**

```javascript
// User updates profile
await db.primary.update('UPDATE users SET name = "Alice" WHERE id = 1');

// Immediately reads from replica
const user = await db.replica.query('SELECT * FROM users WHERE id = 1');
console.log(user.name); // Still shows "Bob" (old value)
```

**Solutions:**

**1. Read-After-Write Consistency:**
```javascript
class ConsistentDB {
  async write(userId, query) {
    await this.primary.execute(query);

    // Mark user's write timestamp
    await this.cache.set(`user:${userId}:last_write`, Date.now());
  }

  async read(userId, query) {
    const lastWrite = await this.cache.get(`user:${userId}:last_write`);
    const now = Date.now();

    // Recent write? Read from primary
    if (lastWrite && (now - lastWrite < 5000)) {
      return await this.primary.execute(query);
    }

    // Safe to read from replica
    return await this.replica.execute(query);
  }
}
```

**2. Session Consistency:**
```javascript
// Stick user session to specific replica
function getReplicaForSession(sessionId, replicas) {
  const hash = hashCode(sessionId);
  return replicas[hash % replicas.length];
}
```

**3. Critical Reads from Primary:**
```javascript
// Always read critical data from primary
const balance = await db.primary.query(
  'SELECT balance FROM accounts WHERE id = ?',
  [accountId]
);
```

### Q2: How does failover work in a replicated system?

**Answer:**

**Failover Process:**

```
1. Detection
   Primary fails or becomes unreachable
   ↓
2. Election (if automatic)
   Replicas elect new primary
   ↓
3. Promotion
   Chosen replica becomes primary
   ↓
4. Reconfiguration
   Other replicas point to new primary
   ↓
5. Resume Operations
   Applications reconnect to new primary
```

**Implementation:**

```javascript
class ReplicaSetManager {
  constructor(nodes) {
    this.nodes = nodes;
    this.primary = nodes[0];
    this.replicas = nodes.slice(1);

    this.startHeartbeat();
  }

  startHeartbeat() {
    setInterval(async () => {
      const isHealthy = await this.checkPrimaryHealth();

      if (!isHealthy) {
        await this.initiateFailover();
      }
    }, 5000); // Check every 5 seconds
  }

  async checkPrimaryHealth() {
    try {
      await this.primary.ping({ timeout: 3000 });
      return true;
    } catch (error) {
      console.error('Primary health check failed:', error);
      return false;
    }
  }

  async initiateFailover() {
    console.log('Starting failover process...');

    // 1. Stop accepting writes
    this.primary.setReadOnly();

    // 2. Find most up-to-date replica
    const candidates = await this.findFailoverCandidates();

    // 3. Elect new primary (highest priority, least lag)
    const newPrimary = this.electPrimary(candidates);

    // 4. Promote to primary
    await newPrimary.promoteToMaster();

    // 5. Update configuration
    this.replicas = this.replicas.filter(r => r !== newPrimary);
    this.replicas.push(this.primary); // Old primary becomes replica (if recovers)
    this.primary = newPrimary;

    // 6. Reconfigure replicas
    for (const replica of this.replicas) {
      await replica.changeMaster(newPrimary);
    }

    // 7. Notify application
    await this.notifyApplications({
      event: 'failover',
      newPrimary: newPrimary.host
    });

    console.log(`Failover complete. New primary: ${newPrimary.host}`);
  }

  async findFailoverCandidates() {
    const candidates = [];

    for (const replica of this.replicas) {
      try {
        const lag = await replica.getReplicationLag();
        const priority = replica.priority || 1;

        if (lag < 10000) { // Less than 10s lag
          candidates.push({ replica, lag, priority });
        }
      } catch (error) {
        // Replica unhealthy, skip
      }
    }

    return candidates;
  }

  electPrimary(candidates) {
    // Sort by priority (desc) then lag (asc)
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.lag - b.lag;
    });

    return candidates[0].replica;
  }
}
```

**Failover Types:**

| Type | Detection | Election | Reconfiguration |
|------|-----------|----------|-----------------|
| **Automatic** | Heartbeat | Consensus (Raft, Paxos) | Automatic |
| **Semi-Automatic** | Heartbeat | Manual selection | Automatic |
| **Manual** | Admin alert | Admin selects | Manual |

### Q3: What's the difference between synchronous and asynchronous replication?

**Answer:**

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| **Write Latency** | High (wait for replicas) | Low (return immediately) |
| **Data Consistency** | Strong (replicas always current) | Eventual (lag possible) |
| **Data Loss Risk** | Zero (replicas confirm) | Possible (primary fails before sync) |
| **Availability** | Lower (replica failure blocks) | Higher (independent of replicas) |
| **Use Case** | Financial, critical data | High throughput, social media |

**Synchronous Example:**

```javascript
async function synchronousReplication(data) {
  // 1. Write to primary
  const primaryResult = await primary.write(data);

  // 2. Wait for ALL replicas
  const replicaWrites = replicas.map(r => r.write(data));
  await Promise.all(replicaWrites);

  // 3. Only now return success
  return { success: true, timestamp: new Date() };
}

// Slower but guaranteed consistency
const result = await synchronousReplication({ user: 'John' });
// All replicas have the data now
```

**Asynchronous Example:**

```javascript
async function asynchronousReplication(data) {
  // 1. Write to primary
  const result = await primary.write(data);

  // 2. Return immediately
  setImmediate(() => {
    // 3. Replicate in background
    replicas.forEach(async (replica) => {
      try {
        await replica.write(data);
      } catch (error) {
        console.error('Replication failed:', error);
        // Retry logic or alert
      }
    });
  });

  return { success: true, timestamp: new Date() };
}

// Faster but potential lag
const result = await asynchronousReplication({ user: 'John' });
// Primary has data, replicas getting it
```

**Best of Both (Semi-Sync):**

```javascript
async function semiSynchronousReplication(data) {
  // Write to primary
  const primaryResult = await primary.write(data);

  // Wait for at least ONE replica
  await Promise.race(
    replicas.map(r => r.write(data))
  );

  // Others continue async
  return { success: true };
}
```

---

## Best Practices

### Replication Strategy

**✅ DO:**

1. **Monitor replication lag constantly:**
   ```javascript
   // Alert if lag > threshold
   if (replicationLag > 30000) { // 30 seconds
     alert('High replication lag!');
   }
   ```

2. **Use read replicas for read scaling:**
   - Route reports to replicas
   - Analytics on replicas
   - Search on replicas

3. **Implement retry logic:**
   ```javascript
   async function writeWithRetry(data, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await primary.write(data);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(1000 * Math.pow(2, i)); // Exponential backoff
       }
     }
   }
   ```

4. **Handle failover gracefully:**
   - Detect new primary
   - Reconnect automatically
   - Retry failed operations

5. **Test failover regularly:**
   - Simulate primary failure
   - Measure recovery time
   - Verify data consistency

**❌ DON'T:**

1. **Don't ignore replication lag**
2. **Don't assume replicas are always consistent**
3. **Don't perform critical reads from replicas**
4. **Don't forget to backup primary AND replicas**
5. **Don't use replication as backup** (have separate backups)

---

## Real-World Examples

### Reddit

```
Primary-Replica Setup:
- 1 Primary (writes)
- 12 Read Replicas (reads)
- Asynchronous replication
- Read-heavy workload (95% reads)
- Eventual consistency acceptable
```

### GitHub

```
Multi-Data Center Replication:
- Primary in US East
- Replicas in US West, Europe, Asia
- Asynchronous for performance
- Critical operations on primary
- Aggressive caching
```

### Netflix

```
Cassandra Multi-Master:
- Multiple data centers
- Writes to any node
- Tunable consistency (Quorum)
- Read repair for consistency
- Handles conflicts automatically
```

---

## Summary

**Key Takeaways:**

1. **Replication provides availability** and read scaling
2. **Primary-Replica is most common** and simplest
3. **Multi-Primary enables geographic writes** but adds complexity
4. **Sync replication is consistent**, async is fast
5. **Replication lag is inevitable** in async setups
6. **Failover must be tested** and automated

**When to Use Replication:**

| Scenario | Recommended Setup |
|----------|-------------------|
| **Read-heavy (90%+ reads)** | Primary + multiple read replicas |
| **High availability needed** | Primary + 2-3 replicas with auto-failover |
| **Geographic users** | Primary + geo-distributed replicas |
| **Critical data** | Synchronous replication |
| **High throughput** | Asynchronous replication |

**Replication Checklist:**

- [ ] Chosen replication topology (primary-replica/multi-primary)
- [ ] Configured replication lag monitoring
- [ ] Implemented read-after-write consistency strategy
- [ ] Set up automatic failover mechanism
- [ ] Tested failover process
- [ ] Documented failover procedures
- [ ] Configured backup strategy (separate from replication)

---

**Further Reading:**
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/high-availability.html)
- [MySQL Replication](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [MongoDB Replica Sets](https://www.mongodb.com/docs/manual/replication/)
- [CRDTs](https://crdt.tech/)

---
[← Previous: Sharding](./03-sharding.md) | [Back to Database Topics](./README.md) | [Next: Indexing →](./05-indexing.md)
