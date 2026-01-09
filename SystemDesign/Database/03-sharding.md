# Database Sharding

## Table of Contents
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Sharding Strategies](#sharding-strategies)
- [Shard Key Selection](#shard-key-selection)
- [Architecture Patterns](#architecture-patterns)
- [Implementation Examples](#implementation-examples)
- [Challenges and Solutions](#challenges-and-solutions)
- [Interview Questions](#interview-questions)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

---

## Overview

### 💡 **Database Sharding**

Horizontal partitioning technique that splits large databases across multiple servers (shards) to improve scalability and performance.

**Why Sharding:**

Traditional single-server databases hit limits:
- Storage capacity constraints
- CPU and memory bottlenecks
- Network bandwidth limits
- Single point of failure
- Cost of vertical scaling (bigger servers)

**Sharding Benefits:**

- ✅ Horizontal scalability (add more servers)
- ✅ Improved query performance (smaller data sets)
- ✅ Higher throughput (parallel processing)
- ✅ Better fault isolation
- ✅ Cost-effective scaling

**Sharding vs Other Techniques:**

| Technique | Data Distribution | Use Case |
|-----------|-------------------|----------|
| **Sharding** | Horizontal split across servers | Massive datasets |
| **Replication** | Copy full dataset to multiple servers | High availability, read scaling |
| **Partitioning** | Split within single server | Organize large tables |
| **Vertical Scaling** | Bigger single server | Simple, but limited |

---

## Core Concepts

### 💡 **How Sharding Works**

**Before Sharding:**

```
Single Database Server
┌─────────────────────────────┐
│ Users Table (10M records)   │
│ ┌───────────────────────┐   │
│ │ user_id │ name │ ...  │   │
│ ├───────────────────────┤   │
│ │ 1       │ John │ ...  │   │
│ │ 2       │ Jane │ ...  │   │
│ │ ...     │ ...  │ ...  │   │
│ │ 10M     │ ...  │ ...  │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
     Single point of failure
     Limited capacity
```

**After Sharding:**

```
        Application Layer
               ↓
        Shard Router/Proxy
          ↙    ↓    ↘
    Shard 1  Shard 2  Shard 3
    ┌─────┐  ┌─────┐  ┌─────┐
    │ U1  │  │ U4  │  │ U7  │
    │ U2  │  │ U5  │  │ U8  │
    │ U3  │  │ U6  │  │ U9  │
    └─────┘  └─────┘  └─────┘
    3.3M     3.3M     3.4M records
```

### Key Components

**1. Shard:**
- Individual database instance
- Contains subset of total data
- Independent operation

**2. Shard Key:**
- Column(s) determining data distribution
- Used to route queries to correct shard
- Critical for performance

**3. Router/Proxy:**
- Routes queries to appropriate shard(s)
- Aggregates results from multiple shards
- Examples: ProxySQL, Vitess, MongoDB mongos

**4. Config Server:**
- Stores shard mapping metadata
- Tracks which data lives on which shard
- Essential for router to function

---

## Sharding Strategies

### 💡 **1. Range-Based Sharding**

Partition data based on ranges of shard key values.

**How It Works:**

```
Shard Key: user_id

Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000
```

**Example:**

```javascript
// Shard routing logic
function getShardForUserId(userId) {
  if (userId <= 1000000) return 'shard1';
  if (userId <= 2000000) return 'shard2';
  return 'shard3';
}

// Query user
const shard = getShardForUserId(1500000); // Returns 'shard2'
const user = await db[shard].users.findOne({ user_id: 1500000 });
```

**Pros:**
- Simple to implement
- Range queries efficient (stay on one shard)
- Easy to add new shards for new ranges

**Cons:**
- Uneven data distribution (hotspots)
- Popular ranges overloaded
- Difficult to rebalance existing data

**When to Use:**
- ✅ Time-series data (shard by date)
- ✅ Sequential IDs with predictable growth
- ✅ Data naturally clustered by ranges
- ❌ Unpredictable access patterns
- ❌ Need uniform distribution

### 💡 **2. Hash-Based Sharding**

Use hash function on shard key to determine shard.

**How It Works:**

```
Shard Key: user_id
Hash Function: user_id % num_shards

user_id: 12345
Hash: 12345 % 3 = 0 → Shard 1

user_id: 67890
Hash: 67890 % 3 = 0 → Shard 1

user_id: 23456
Hash: 23456 % 3 = 2 → Shard 3
```

**Example:**

```javascript
// Consistent hashing
const crypto = require('crypto');

function getShardForUser(userId, numShards = 3) {
  const hash = crypto
    .createHash('md5')
    .update(userId.toString())
    .digest('hex');

  const hashInt = parseInt(hash.substring(0, 8), 16);
  const shardIndex = hashInt % numShards;

  return `shard${shardIndex + 1}`;
}

// Evenly distributed
getShardForUser(1);      // shard2
getShardForUser(2);      // shard3
getShardForUser(1000);   // shard1
```

**Pros:**
- Even data distribution
- No hotspots
- Predictable load balancing

**Cons:**
- Range queries require hitting all shards
- Difficult to add/remove shards (rehashing)
- No data locality

**When to Use:**
- ✅ Uniform distribution needed
- ✅ Point queries dominant (get by ID)
- ✅ Unpredictable access patterns
- ❌ Range queries common
- ❌ Need to preserve data locality

### 💡 **3. Geographic/Location-Based Sharding**

Partition data by geographic location.

**How It Works:**

```
Shard 1: North America users
Shard 2: Europe users
Shard 3: Asia users
Shard 4: Rest of world
```

**Example:**

```javascript
const shardMapping = {
  'US': 'shard-us-east',
  'CA': 'shard-us-east',
  'UK': 'shard-eu-west',
  'DE': 'shard-eu-west',
  'JP': 'shard-asia-pacific',
  'AU': 'shard-asia-pacific'
};

function getShardForUser(countryCode) {
  return shardMapping[countryCode] || 'shard-default';
}

// Query user in UK
const shard = getShardForUser('UK'); // 'shard-eu-west'
```

**Pros:**
- Low latency (data near users)
- Regulatory compliance (GDPR, data residency)
- Natural data isolation

**Cons:**
- Uneven distribution by population
- Complex cross-region queries
- Difficult to handle user migration

**When to Use:**
- ✅ Global user base
- ✅ Data residency requirements
- ✅ Latency-sensitive applications
- ❌ Users frequently change locations
- ❌ Need global queries

### 💡 **4. Directory-Based Sharding**

Maintain lookup table mapping entities to shards.

**How It Works:**

```
Directory/Lookup Table:
┌─────────┬────────┐
│ user_id │ shard  │
├─────────┼────────┤
│ 1       │ shard1 │
│ 2       │ shard2 │
│ 3       │ shard1 │
│ ...     │ ...    │
└─────────┴────────┘
```

**Example:**

```javascript
// Directory service
class ShardDirectory {
  constructor() {
    // Can use Redis, database, or in-memory cache
    this.cache = new Map();
  }

  async getShardForUser(userId) {
    // Check cache
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    // Query directory
    const result = await directoryDb.query(
      'SELECT shard FROM shard_directory WHERE user_id = ?',
      [userId]
    );

    const shard = result.rows[0].shard;
    this.cache.set(userId, shard);
    return shard;
  }

  async assignUserToShard(userId) {
    // Load balancing logic
    const shard = await this.getLeastLoadedShard();

    await directoryDb.query(
      'INSERT INTO shard_directory (user_id, shard) VALUES (?, ?)',
      [userId, shard]
    );

    return shard;
  }
}
```

**Pros:**
- Complete flexibility in data placement
- Easy to rebalance (update directory)
- Can optimize for specific patterns
- Supports complex sharding logic

**Cons:**
- Directory is single point of failure
- Extra lookup overhead
- Directory can become bottleneck
- More complex to maintain

**When to Use:**
- ✅ Need flexible data placement
- ✅ Frequent rebalancing
- ✅ Complex sharding requirements
- ❌ Ultra-low latency required
- ❌ Simple use case

### 💡 **5. Entity-Based Sharding**

Shard by related entity groups (tenant, customer, etc.).

**How It Works:**

```
Multi-tenant SaaS:
Shard 1: Company A data
Shard 2: Company B data
Shard 3: Company C data
```

**Example:**

```javascript
// Multi-tenant sharding
function getShardForTenant(tenantId) {
  // Hash tenant ID to shard
  const hash = hashFunction(tenantId);
  return `shard${hash % NUM_SHARDS}`;
}

// All queries scoped to tenant
async function getOrders(tenantId, filters) {
  const shard = getShardForTenant(tenantId);

  return await db[shard].orders.find({
    tenant_id: tenantId,
    ...filters
  });
}

// Join works within tenant (same shard)
async function getOrdersWithCustomers(tenantId) {
  const shard = getShardForTenant(tenantId);

  return await db[shard].orders.aggregate([
    { $match: { tenant_id: tenantId } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customer'
      }
    }
  ]);
}
```

**Pros:**
- Natural data boundaries
- Related data co-located (fast joins)
- Easy to isolate tenant issues
- Simple backup/restore per tenant

**Cons:**
- Uneven tenant sizes
- Large tenants can overwhelm shard
- Difficult to split large tenants

**When to Use:**
- ✅ Multi-tenant SaaS applications
- ✅ Strong tenant isolation needed
- ✅ Queries rarely cross tenants
- ❌ Tenants vary greatly in size
- ❌ Need cross-tenant analytics

---

## Shard Key Selection

### 💡 **Choosing the Right Shard Key**

Most critical decision in sharding strategy.

### Good Shard Key Characteristics

**1. High Cardinality:**
- Many distinct values
- Enables fine-grained distribution

```javascript
// Good: user_id (millions of unique values)
shard_key: user_id

// Bad: country (< 200 unique values)
shard_key: country // Most users in few countries
```

**2. Even Distribution:**
- Prevents hotspots
- Balanced load across shards

```javascript
// Good: hash(user_id) - uniform distribution
// Bad: created_date - new data all goes to one shard
```

**3. Query-Friendly:**
- Most queries include shard key
- Avoids scatter-gather queries

```javascript
// Good: Queries by user_id (shard key)
SELECT * FROM orders WHERE user_id = 123;

// Bad: Queries without shard key
SELECT * FROM orders WHERE order_date > '2024-01-01';
// ^ Hits all shards
```

**4. Rarely Changes:**
- Changing shard key requires moving data
- Causes performance issues

```javascript
// Good: user_id (never changes)
// Bad: user_status (active/inactive - may change)
```

### Shard Key Anti-Patterns

**❌ Monotonically Increasing Keys:**

```javascript
// Bad: Auto-increment ID as shard key
user_id: 1, 2, 3, 4, 5...

// Problem: All new writes go to last shard
Shard 1: 1-1M      (idle)
Shard 2: 1M-2M     (idle)
Shard 3: 2M-3M     (hot! all writes here)
```

**❌ Low Cardinality:**

```javascript
// Bad: Boolean or small enum
shard_key: is_premium // true/false only

// Problem: Only 2 shards used, uneven distribution
Shard 1: 90% of users (free)
Shard 2: 10% of users (premium)
```

**❌ Frequently Changing Values:**

```javascript
// Bad: User status as shard key
shard_key: user_status // active, suspended, deleted

// Problem: Status changes require data migration
User changes status → Move data between shards → Expensive
```

### Shard Key Selection Process

```
1. Analyze query patterns
   ↓
2. Identify high-cardinality fields
   ↓
3. Check distribution uniformity
   ↓
4. Verify query locality
   ↓
5. Test with production-like data
   ↓
6. Monitor and adjust
```

**Decision Matrix:**

| Shard Key Candidate | Cardinality | Distribution | Query Pattern | Score |
|---------------------|-------------|--------------|---------------|-------|
| user_id | High (10M) | Uniform | 80% queries include | ✅ Excellent |
| email | High (10M) | Uniform | 20% queries include | ⚠️ Good |
| country | Low (200) | Skewed | 5% queries include | ❌ Poor |
| created_date | Medium (1000) | Skewed | 30% queries include | ❌ Poor |

---

## Architecture Patterns

### 💡 **1. Application-Level Sharding**

Application handles shard routing logic.

**Architecture:**

```
┌─────────────────────────────┐
│      Application Layer      │
│  ┌───────────────────────┐  │
│  │  Sharding Logic       │  │
│  │  - Route queries      │  │
│  │  - Aggregate results  │  │
│  └───────────────────────┘  │
└──────────┬───────┬──────────┘
           │       │
    ┌──────▼───┐ ┌▼──────────┐
    │ Shard 1  │ │  Shard 2  │
    └──────────┘ └───────────┘
```

**Implementation:**

```javascript
class ShardedDatabase {
  constructor(shards) {
    this.shards = shards;
  }

  getShardForKey(key) {
    const hash = this.hash(key);
    const index = hash % this.shards.length;
    return this.shards[index];
  }

  async query(shardKey, query) {
    const shard = this.getShardForKey(shardKey);
    return await shard.execute(query);
  }

  async scatter(query) {
    // Execute on all shards
    const promises = this.shards.map(shard =>
      shard.execute(query)
    );

    // Gather results
    const results = await Promise.all(promises);
    return this.aggregate(results);
  }
}
```

**Pros:**
- Full control over logic
- No additional infrastructure
- Easy to customize

**Cons:**
- Complex application code
- Duplicate logic across services
- Harder to change strategy

### 💡 **2. Proxy-Based Sharding**

Middleware proxy handles routing.

**Architecture:**

```
Application
     ↓
┌─────────────┐
│ Proxy/Router│  (ProxySQL, Vitess, HAProxy)
│  - Routes   │
│  - Caches   │
│  - Pools    │
└──┬────┬────┬┘
   │    │    │
 Shard1 Shard2 Shard3
```

**Example with ProxySQL:**

```sql
-- ProxySQL routing rules
INSERT INTO mysql_query_rules (
  rule_id,
  match_pattern,
  destination_hostgroup,
  apply
) VALUES (
  1,
  '^SELECT.*FROM users WHERE user_id = ([0-9]+).*',
  CASE WHEN CAST(match_pattern AS UNSIGNED) % 3 = 0
    THEN 1 ELSE 2 END,
  1
);
```

**Pros:**
- Application-transparent
- Centralized routing logic
- Connection pooling
- Query caching

**Cons:**
- Single point of failure (proxy)
- Additional network hop
- Limited customization

### 💡 **3. Middleware Sharding Layer**

Dedicated sharding service.

**Architecture:**

```
    Applications
    ↓  ↓  ↓  ↓
┌──────────────────┐
│ Sharding Service │
│  - Config        │
│  - Routing       │
│  - Rebalancing   │
└──┬────┬────┬────┬┘
   │    │    │    │
 Shard Shard Shard Shard
```

**Example:**

```javascript
// Sharding service API
class ShardingService {
  async route(operation, key, data) {
    const shard = await this.config.getShardForKey(key);

    return await this.execute(shard, operation, data);
  }

  async rebalance(sourceShard, targetShard, keyRange) {
    // Move data between shards
    const data = await sourceShard.export(keyRange);
    await targetShard.import(data);
    await this.config.updateMapping(keyRange, targetShard);
  }
}
```

**Pros:**
- Centralized management
- Easy to update routing
- Supports rebalancing
- Language-agnostic

**Cons:**
- Additional infrastructure
- Potential bottleneck
- More complex deployment

---

## Implementation Examples

### JavaScript/Node.js

```javascript
const { Pool } = require('pg');

class ShardedPostgres {
  constructor(shardConfigs) {
    this.shards = shardConfigs.map(config => ({
      name: config.name,
      pool: new Pool(config),
      range: config.range // { min: 0, max: 1000000 }
    }));
  }

  getShardForUserId(userId) {
    // Range-based sharding
    return this.shards.find(shard =>
      userId >= shard.range.min && userId < shard.range.max
    );
  }

  async getUserById(userId) {
    const shard = this.getShardForUserId(userId);

    const result = await shard.pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    return result.rows[0];
  }

  async getUsersByCountry(country) {
    // Scatter-gather: query all shards
    const promises = this.shards.map(shard =>
      shard.pool.query(
        'SELECT * FROM users WHERE country = $1',
        [country]
      )
    );

    const results = await Promise.all(promises);

    // Aggregate results
    return results.flatMap(result => result.rows);
  }

  async createUser(userData) {
    // Generate user_id first
    const userId = await this.generateUserId();

    const shard = this.getShardForUserId(userId);

    const result = await shard.pool.query(
      `INSERT INTO users (user_id, name, email, country)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, userData.name, userData.email, userData.country]
    );

    return result.rows[0];
  }

  async generateUserId() {
    // Distributed ID generation
    // Option 1: Database sequences per shard
    // Option 2: Snowflake-style IDs
    // Option 3: UUIDs

    const timestamp = Date.now();
    const shardId = Math.floor(Math.random() * this.shards.length);
    const sequence = await this.getNextSequence(shardId);

    // Combine: timestamp (41 bits) + shard (10 bits) + sequence (12 bits)
    return (timestamp << 22) | (shardId << 12) | sequence;
  }
}

// Usage
const db = new ShardedPostgres([
  {
    name: 'shard1',
    host: 'localhost',
    port: 5432,
    database: 'shard1',
    range: { min: 0, max: 1000000 }
  },
  {
    name: 'shard2',
    host: 'localhost',
    port: 5433,
    database: 'shard2',
    range: { min: 1000000, max: 2000000 }
  }
]);

const user = await db.getUserById(500000);
```

### Python

```python
import hashlib
from typing import List, Dict, Any
import psycopg2
from psycopg2.pool import SimpleConnectionPool

class ShardedDatabase:
    def __init__(self, shard_configs: List[Dict]):
        self.shards = {}

        for config in shard_configs:
            self.shards[config['name']] = SimpleConnectionPool(
                minconn=1,
                maxconn=20,
                host=config['host'],
                port=config['port'],
                database=config['database'],
                user=config['user'],
                password=config['password']
            )

    def get_shard_for_key(self, key: str) -> str:
        """Hash-based sharding"""
        hash_value = int(hashlib.md5(key.encode()).hexdigest(), 16)
        shard_index = hash_value % len(self.shards)
        return list(self.shards.keys())[shard_index]

    def query_single_shard(self, shard_key: str, query: str, params: tuple = None):
        """Execute query on single shard"""
        shard_name = self.get_shard_for_key(shard_key)
        pool = self.shards[shard_name]

        conn = pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchall()
        finally:
            pool.putconn(conn)

    def query_all_shards(self, query: str, params: tuple = None):
        """Execute query on all shards (scatter-gather)"""
        results = []

        for shard_name, pool in self.shards.items():
            conn = pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    results.extend(cur.fetchall())
            finally:
                pool.putconn(conn)

        return results

    def get_user(self, user_id: int):
        """Get user by ID"""
        shard_key = str(user_id)

        result = self.query_single_shard(
            shard_key,
            "SELECT * FROM users WHERE user_id = %s",
            (user_id,)
        )

        return result[0] if result else None

    def search_users(self, email_pattern: str):
        """Search across all shards"""
        return self.query_all_shards(
            "SELECT * FROM users WHERE email LIKE %s",
            (email_pattern,)
        )
```

---

## Challenges and Solutions

### 💡 **1. Cross-Shard Queries**

**Problem:** Queries spanning multiple shards are slow.

```sql
-- Joins across shards
SELECT o.*, u.name
FROM orders o
JOIN users u ON o.user_id = u.user_id
WHERE o.status = 'pending';
-- If orders and users on different shards → expensive
```

**Solutions:**

**A. Denormalization:**
```javascript
// Duplicate user data in orders
{
  order_id: 123,
  user_id: 456,
  user_name: "John Doe",  // Denormalized
  user_email: "john@example.com",  // Denormalized
  status: "pending"
}
```

**B. Application-Level Joins:**
```javascript
async function getOrdersWithUsers(orderIds) {
  // 1. Get orders from order shards
  const orders = await getOrdersByIds(orderIds);

  // 2. Extract user IDs
  const userIds = orders.map(o => o.user_id);

  // 3. Get users from user shards
  const users = await getUsersByIds(userIds);
  const userMap = new Map(users.map(u => [u.user_id, u]));

  // 4. Join in application
  return orders.map(order => ({
    ...order,
    user: userMap.get(order.user_id)
  }));
}
```

**C. Co-locate Related Data:**
```javascript
// Shard both tables by same key
Shard 1: user_id 1-1M
  - users table
  - orders table (for these users)

Shard 2: user_id 1M-2M
  - users table
  - orders table (for these users)

// Joins work within shard
```

### 💡 **2. Distributed Transactions**

**Problem:** ACID transactions across multiple shards.

**Solutions:**

**A. Avoid Cross-Shard Transactions:**
```javascript
// Design to keep transactions within single shard
// Use entity-based sharding (tenant-based)
```

**B. Two-Phase Commit (2PC):**
```javascript
async function transferBetweenShards(fromUser, toUser, amount) {
  const fromShard = getShardForUser(fromUser);
  const toShard = getShardForUser(toUser);

  // Phase 1: Prepare
  const tx1 = await fromShard.prepare({
    debit: { user: fromUser, amount }
  });

  const tx2 = await toShard.prepare({
    credit: { user: toUser, amount }
  });

  // Phase 2: Commit or Rollback
  try {
    if (tx1.canCommit && tx2.canCommit) {
      await fromShard.commit(tx1.id);
      await toShard.commit(tx2.id);
    } else {
      await fromShard.rollback(tx1.id);
      await toShard.rollback(tx2.id);
    }
  } catch (error) {
    // Handle partial commit
    await compensate(tx1, tx2);
  }
}
```

**C. Saga Pattern:**
```javascript
// Sequence of local transactions with compensations
async function createOrderSaga(userId, items) {
  const compensations = [];

  try {
    // Step 1: Reserve inventory
    const reservation = await inventoryService.reserve(items);
    compensations.push(() => inventoryService.release(reservation));

    // Step 2: Charge payment
    const payment = await paymentService.charge(userId, total);
    compensations.push(() => paymentService.refund(payment));

    // Step 3: Create order
    const order = await orderService.create(userId, items);

    return order;

  } catch (error) {
    // Execute compensations in reverse order
    for (const compensate of compensations.reverse()) {
      await compensate();
    }
    throw error;
  }
}
```

### 💡 **3. Rebalancing Data**

**Problem:** Need to add/remove shards or fix imbalance.

**Solutions:**

**A. Consistent Hashing:**
```javascript
// Add shard with minimal data movement
class ConsistentHash {
  constructor(shards, virtualNodes = 150) {
    this.ring = new Map();

    // Add virtual nodes for better distribution
    for (const shard of shards) {
      for (let i = 0; i < virtualNodes; i++) {
        const hash = this.hash(`${shard}-${i}`);
        this.ring.set(hash, shard);
      }
    }

    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getShard(key) {
    const hash = this.hash(key);

    // Find first node >= hash
    const index = this.sortedKeys.findIndex(k => k >= hash);
    const nodeHash = index === -1
      ? this.sortedKeys[0]
      : this.sortedKeys[index];

    return this.ring.get(nodeHash);
  }

  addShard(shard, virtualNodes = 150) {
    // Only affects ~1/N data (N = num shards)
    for (let i = 0; i < virtualNodes; i++) {
      const hash = this.hash(`${shard}-${i}`);
      this.ring.set(hash, shard);
    }

    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }
}
```

**B. Live Migration:**
```javascript
async function migrateShard(sourceShardold, targetShard, keyRange) {
  // 1. Start dual writes (write to both shards)
  await enableDualWrites(oldShard, newShard, keyRange);

  // 2. Copy existing data in batches
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const batch = await oldShard.query(
      `SELECT * FROM users
       WHERE user_id >= ? AND user_id < ?
       LIMIT ? OFFSET ?`,
      [keyRange.min, keyRange.max, batchSize, offset]
    );

    if (batch.length === 0) break;

    await newShard.bulkInsert('users', batch);
    offset += batchSize;

    // Throttle to avoid overload
    await sleep(100);
  }

  // 3. Switch reads to new shard
  await updateRouter(keyRange, newShard);

  // 4. Stop dual writes, use new shard only
  await disableDualWrites(oldShard, newShard, keyRange);

  // 5. Verify and cleanup
  await verifyMigration(oldShard, newShard, keyRange);
  await oldShard.delete(keyRange);
}
```

### 💡 **4. Global Secondary Indexes**

**Problem:** Need to query by non-shard-key columns.

**Solutions:**

**A. Local Secondary Indexes:**
```javascript
// Each shard maintains its own indexes
// Query all shards (scatter-gather)
async function findUsersByEmail(email) {
  const promises = shards.map(shard =>
    shard.query('SELECT * FROM users WHERE email = ?', [email])
  );

  const results = await Promise.all(promises);
  return results.flat();
}
```

**B. Global Secondary Index Table:**
```javascript
// Separate sharded table for lookups
// email_index table sharded by email
{
  email: "john@example.com",
  user_id: 12345,
  shard: "shard2"
}

// Lookup flow:
// 1. Query email_index → get user_id and shard
// 2. Query specific shard for full user data
```

---

## Interview Questions

### Q1: How would you shard a database for a social media platform?

**Answer:**

**Requirements:**
- 100M users
- Users follow other users
- View feed of posts from followed users
- Search users by username

**Sharding Strategy:**

**1. Shard Key: user_id**
```javascript
// Hash-based sharding
shard = hash(user_id) % num_shards
```

**2. Data Model:**

```javascript
// Users table (sharded by user_id)
{
  user_id: 123,
  username: "johndoe",
  email: "john@example.com",
  shard: hash(123) % 10  // Shard 3
}

// Posts table (sharded by author_user_id)
{
  post_id: 456,
  author_user_id: 123,  // Same shard as user
  content: "Hello world!",
  shard: hash(123) % 10  // Shard 3
}

// Follows table (sharded by follower_user_id)
{
  follower_user_id: 789,
  following_user_id: 123,
  shard: hash(789) % 10  // Follower's shard
}

// Feed (denormalized, sharded by user_id)
{
  user_id: 789,
  post_id: 456,
  author_id: 123,
  content: "Hello world!",  // Denormalized
  shard: hash(789) % 10  // User's shard
}
```

**3. Query Patterns:**

```javascript
// Get user profile (single shard)
async function getUserProfile(userId) {
  const shard = getShardForUser(userId);
  return await shard.query(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );
}

// Get user's posts (single shard - co-located)
async function getUserPosts(userId) {
  const shard = getShardForUser(userId);
  return await shard.query(
    'SELECT * FROM posts WHERE author_user_id = ?',
    [userId]
  );
}

// Get user's feed (single shard - denormalized)
async function getUserFeed(userId, page = 0) {
  const shard = getShardForUser(userId);
  return await shard.query(
    `SELECT * FROM feed
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20 OFFSET ?`,
    [userId, page * 20]
  );
}

// Search by username (scatter-gather with index)
async function searchUsers(username) {
  // Global secondary index sharded by username
  const indexShard = getShardForKey(username);
  const results = await indexShard.query(
    'SELECT user_id, shard FROM username_index WHERE username LIKE ?',
    [`%${username}%`]
  );

  // Fetch full user data from respective shards
  return await Promise.all(
    results.map(r =>
      shards[r.shard].query('SELECT * FROM users WHERE user_id = ?', [r.user_id])
    )
  );
}
```

**Trade-offs:**
- ✅ User's data co-located (fast queries)
- ✅ Feed generation simplified (fan-out on write)
- ❌ Username search requires secondary index
- ❌ Viewing another user's profile may cross shards

### Q2: What happens when you need to add a new shard?

**Answer:**

**Process:**

**1. Using Consistent Hashing:**
```javascript
// Before: 3 shards
ring = {0: shard1, 33: shard2, 66: shard3}

// After: Add shard4
ring = {0: shard1, 25: shard4, 50: shard2, 75: shard3}

// Only ~25% of data needs to move
// Data between 25-33 moves from shard2 to shard4
```

**2. Migration Steps:**

```javascript
async function addNewShard(newShardConfig) {
  // 1. Provision new shard
  const newShard = await provisionShard(newShardConfig);

  // 2. Update config (don't route writes yet)
  await configService.addShard(newShard, { active: false });

  // 3. Identify data to migrate
  const dataRanges = consistentHash.getAffectedRanges(newShard);

  // 4. Copy data to new shard
  for (const range of dataRanges) {
    await migrateDataRange(range.sourceShard, newShard, range);
  }

  // 5. Enable dual writes
  await configService.enableDualWrites(newShard, dataRanges);

  // 6. Verify data consistency
  await verifyMigration(newShard, dataRanges);

  // 7. Switch reads to new shard
  await configService.updateReadRouting(newShard, dataRanges);

  // 8. Stop dual writes, cleanup old data
  await configService.activateShard(newShard);
  await cleanupOldShards(dataRanges);

  // 9. Monitor and verify
  await monitorShardHealth(newShard);
}
```

**3. Zero-Downtime Migration:**

```javascript
// Double-write period
class ShardMigrationProxy {
  async write(key, data) {
    const oldShard = this.oldHash.getShard(key);
    const newShard = this.newHash.getShard(key);

    if (oldShard === newShard) {
      // No migration needed
      return await oldShard.write(key, data);
    }

    // Write to both shards during migration
    await Promise.all([
      oldShard.write(key, data),
      newShard.write(key, data)
    ]);
  }

  async read(key) {
    // Read from new shard
    const newShard = this.newHash.getShard(key);
    const data = await newShard.read(key);

    if (data) return data;

    // Fallback to old shard (data not migrated yet)
    const oldShard = this.oldHash.getShard(key);
    return await oldShard.read(key);
  }
}
```

### Q3: How do you handle shard failures?

**Answer:**

**1. Replication Within Shard:**

```
Each shard is replicated:
Shard 1: Primary + 2 Replicas
Shard 2: Primary + 2 Replicas
Shard 3: Primary + 2 Replicas
```

**2. Failover Process:**

```javascript
class ShardManager {
  async handleShardFailure(failedShard) {
    // 1. Detect failure (health check)
    if (await this.isShardHealthy(failedShard)) {
      return; // False alarm
    }

    // 2. Mark shard as unavailable
    await this.config.markShardUnavailable(failedShard);

    // 3. Promote replica to primary
    const replica = await this.findHealthyReplica(failedShard);
    await this.promoteReplica(replica);

    // 4. Update routing
    await this.config.updateShardEndpoint(failedShard, replica);

    // 5. Alert operators
    await this.alert(`Shard ${failedShard} failed, promoted ${replica}`);

    // 6. Provision new replica
    await this.provisionReplica(failedShard);
  }
}
```

**3. Read/Write Handling During Failure:**

```javascript
class ResilientShardClient {
  async query(key, sql, params) {
    const shard = this.getShard(key);

    try {
      return await shard.primary.query(sql, params);
    } catch (error) {
      // Try replicas
      for (const replica of shard.replicas) {
        try {
          return await replica.query(sql, params);
        } catch (replicaError) {
          continue; // Try next replica
        }
      }

      // All failed - check if read-only acceptable
      if (this.isReadQuery(sql)) {
        // Return cached data or degraded mode
        return await this.getCachedData(key);
      }

      throw new Error(`Shard unavailable: ${shard.name}`);
    }
  }
}
```

---

## Best Practices

### Sharding Strategy

**✅ DO:**

1. **Start with vertical scaling first:**
   - Only shard when necessary
   - Vertical scaling is simpler

2. **Choose shard key carefully:**
   - High cardinality
   - Even distribution
   - Query-friendly
   - Immutable

3. **Over-shard initially:**
   - Easier to merge than split
   - Start with more shards than needed

4. **Monitor shard metrics:**
   - Data distribution
   - Query patterns
   - Hotspots

5. **Test with production-like data:**
   - Realistic distribution
   - Actual query patterns

**❌ DON'T:**

1. **Don't shard prematurely:**
   - Adds complexity
   - Try optimization first

2. **Don't use low-cardinality shard keys:**
   - Causes imbalance
   - Creates hotspots

3. **Don't ignore cross-shard queries:**
   - Design to minimize them
   - Consider denormalization

4. **Don't forget about backups:**
   - Backup each shard
   - Test restore procedures

5. **Don't neglect monitoring:**
   - Track per-shard performance
   - Alert on imbalances

---

## Real-World Examples

### Instagram Sharding

**Strategy:** Hash-based sharding by user_id

```
- 4096 logical shards
- Mapped to physical servers
- Use PostgreSQL
- Shard key: user_id

Schema:
users_{shard_id}
photos_{shard_id}
```

### Discord Sharding

**Strategy:** Guild-based sharding

```
- Shard by guild_id (server)
- All guild data on same shard
- Cassandra for messages
- Uses consistent hashing
```

### Slack Sharding

**Strategy:** Workspace-based (entity sharding)

```
- Each workspace on one shard
- Co-locate all workspace data
- Easy to isolate issues
- Allows workspace migration
```

---

## Summary

**Key Takeaways:**

1. **Sharding enables horizontal scaling** for massive datasets
2. **Shard key selection is critical** for performance and balance
3. **Multiple strategies exist** - choose based on use case
4. **Cross-shard queries are expensive** - design to avoid
5. **Rebalancing and migration** need careful planning
6. **Monitor and adjust** based on actual usage patterns

**When to Shard:**

| Indicator | Threshold |
|-----------|-----------|
| **Data Size** | > 1TB and growing |
| **Query Volume** | > 10,000 QPS |
| **Single Server Limit** | CPU/Memory/IO saturated |
| **Growth Rate** | Doubling yearly |

**Sharding vs Alternatives:**

| Solution | When to Use |
|----------|-------------|
| **Sharding** | Massive datasets, horizontal scale |
| **Vertical Scaling** | < 1TB, simple architecture |
| **Read Replicas** | Read-heavy, master has capacity |
| **Caching** | Hot data fits in memory |
| **Archiving** | Old data rarely accessed |

---

**Further Reading:**
- [MongoDB Sharding Guide](https://www.mongodb.com/docs/manual/sharding/)
- [Vitess (MySQL Sharding)](https://vitess.io/)
- [Instagram Sharding](https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c)
- [Consistent Hashing](https://en.wikipedia.org/wiki/Consistent_hashing)

---
[← Previous: NoSQL Design](./02-nosql-design.md) | [Back to Database Topics](./README.md) | [Next: Replication →](./04-replication.md)
