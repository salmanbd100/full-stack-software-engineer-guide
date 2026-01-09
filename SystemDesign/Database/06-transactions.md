# Database Transactions & ACID

## Overview

### 💡 **What is a Database Transaction?**

A database transaction is a sequence of one or more operations performed as a single logical unit of work. All operations in a transaction must either complete successfully (commit) or fail completely (rollback).

**How It Works:**

```
Transaction = All operations succeed OR all operations fail

BEGIN TRANSACTION
    Operation 1: Deduct $100 from Account A
    Operation 2: Add $100 to Account B
COMMIT (if both succeed) OR ROLLBACK (if any fails)
```

**Key Characteristics:**

| Without Transaction | With Transaction |
|-------------------|------------------|
| Partial updates possible | All-or-nothing guarantee |
| Data inconsistency | Data integrity maintained |
| No failure recovery | Automatic rollback on failure |
| Race conditions | Isolation guarantees |

**Real-World Analogy:**
> Money transfer between bank accounts. Either both the debit and credit happen, or neither does. You can't have money disappear or double up.

---

## ACID Properties

### 🔐 **A - Atomicity**

All operations in a transaction succeed or all fail. No partial execution.

**How It Works:**

```
Transaction: Transfer $100 from Alice to Bob

BEGIN TRANSACTION
    1. Deduct $100 from Alice    ✅ Success
    2. Add $100 to Bob           ❌ Failure (insufficient balance check)
ROLLBACK
    → Both operations undone
    → Alice still has $100
```

**Guarantees:**

1. **All-or-Nothing:**
   - Complete success → COMMIT
   - Any failure → ROLLBACK
   - No partial state

2. **Failure Recovery:**
   - System crash → Automatic rollback
   - Network error → Automatic rollback
   - Constraint violation → Automatic rollback

**SQL Example:**

```sql
-- Banking transfer
BEGIN TRANSACTION;

    -- Step 1: Deduct from sender
    UPDATE accounts
    SET balance = balance - 100
    WHERE user_id = 1;

    -- Step 2: Add to receiver
    UPDATE accounts
    SET balance = balance + 100
    WHERE user_id = 2;

    -- Check: Ensure sender has sufficient balance
    SELECT balance FROM accounts WHERE user_id = 1;
    -- If balance < 0, ROLLBACK will be triggered

COMMIT;  -- Both updates succeed
-- OR
ROLLBACK;  -- Both updates undone
```

**JavaScript Example:**

```javascript
const db = require('pg');

async function transferMoney(fromUserId, toUserId, amount) {
  const client = await db.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Deduct from sender
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [amount, fromUserId]
    );

    // Check sender balance
    const result = await client.query(
      'SELECT balance FROM accounts WHERE user_id = $1',
      [fromUserId]
    );

    if (result.rows[0].balance < 0) {
      throw new Error('Insufficient balance');
    }

    // Add to receiver
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, toUserId]
    );

    // Commit transaction
    await client.query('COMMIT');
    return { success: true };

  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    return { success: false, error: error.message };

  } finally {
    client.release();
  }
}
```

**When Atomicity Fails:**

❌ **Without Transaction:**
```sql
-- Operation 1: Success
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;

-- System crashes here ⚠️

-- Operation 2: Never executes
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;

-- Result: $100 disappeared! 💸
```

✅ **With Transaction:**
```sql
BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
    -- System crashes here ⚠️
ROLLBACK;  -- Automatic rollback on crash
-- Result: No money lost ✅
```

---

### 🎯 **C - Consistency**

Database moves from one valid state to another valid state. All constraints, triggers, and rules are enforced.

**How It Works:**

```
Valid State → Transaction → Valid State

Invariant: Total money in system = Constant
Before: Alice $100 + Bob $50 = $150
After:  Alice $50  + Bob $100 = $150 ✅
```

**Guarantees:**

1. **Constraint Enforcement:**
   - Primary keys remain unique
   - Foreign keys reference valid rows
   - CHECK constraints satisfied
   - NOT NULL rules enforced

2. **Data Integrity:**
   - Business rules maintained
   - Referential integrity preserved
   - Custom validation logic executed

**SQL Example:**

```sql
-- Define constraints
CREATE TABLE accounts (
  user_id INTEGER PRIMARY KEY,
  balance DECIMAL(10,2) NOT NULL,
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- This transaction will be rejected
BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
    -- balance becomes -900 (violates CHECK constraint)
ROLLBACK;  -- Automatic rollback due to constraint violation

-- Consistency maintained ✅
```

**Real-World Example - E-commerce Order:**

```sql
-- Business rule: Can't place order with 0 items
CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_items (
  item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Consistent transaction
BEGIN TRANSACTION;
    -- Create order
    INSERT INTO orders (user_id, total)
    VALUES (1, 99.99) RETURNING order_id;

    -- Add order items
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (1, 101, 2, 49.99);

    -- Decrement inventory
    UPDATE products
    SET stock = stock - 2
    WHERE product_id = 101;

COMMIT;  -- All constraints satisfied ✅
```

**JavaScript Example with Validation:**

```javascript
async function createOrder(userId, items) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Business rule: Must have items
    if (items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING order_id',
      [userId, total]
    );
    const orderId = orderResult.rows[0].order_id;

    // Add order items and update inventory
    for (const item of items) {
      // Insert order item
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, item.price]
      );

      // Update inventory (with constraint check)
      const result = await client.query(
        'UPDATE products SET stock = stock - $1 WHERE product_id = $2 AND stock >= $1 RETURNING stock',
        [item.quantity, item.productId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }

    await client.query('COMMIT');
    return { success: true, orderId };

  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

---

### 🔒 **I - Isolation**

Concurrent transactions don't interfere with each other. Each transaction executes as if it's the only one running.

**How It Works:**

```
Transaction A: Read balance ($100) → Deduct $50 → Write ($50)
Transaction B: Read balance ($100) → Deduct $30 → Write ($70)

Without Isolation:
    Both read $100, both write, final balance could be $50 or $70
    Lost update! ❌

With Isolation:
    A completes first: $100 → $50
    B reads $50, writes $20
    Final balance: $20 ✅
```

**Isolation Levels:**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|-----------|---------------------|--------------|-------------|
| **Read Uncommitted** | ✅ Possible | ✅ Possible | ✅ Possible | Fastest |
| **Read Committed** | ❌ Prevented | ✅ Possible | ✅ Possible | Fast |
| **Repeatable Read** | ❌ Prevented | ❌ Prevented | ✅ Possible | Moderate |
| **Serializable** | ❌ Prevented | ❌ Prevented | ❌ Prevented | Slowest |

---

#### 📖 **Isolation Level 1: Read Uncommitted**

Can read uncommitted changes from other transactions (dirty reads).

**Scenario:**

```
Transaction A:
    BEGIN
    UPDATE accounts SET balance = 1000 WHERE user_id = 1
    -- Not committed yet

Transaction B (Read Uncommitted):
    BEGIN
    SELECT balance FROM accounts WHERE user_id = 1
    -- Reads 1000 (uncommitted value)

Transaction A:
    ROLLBACK  -- Change undone

Transaction B:
    -- Read invalid data! (Dirty Read)
```

**SQL Example:**

```sql
-- Set isolation level
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

BEGIN TRANSACTION;
    -- Can read uncommitted data from other transactions
    SELECT balance FROM accounts WHERE user_id = 1;
    -- May see: $1000 (but transaction might rollback)
COMMIT;
```

**When to Use:**

| ✅ Use For | ❌ Don't Use For |
|-----------|-----------------|
| Analytics/reporting (approximate data) | Financial transactions |
| Data warehouses | Critical business logic |
| Read-only queries | Data requiring accuracy |
| Performance-critical reads | Anything needing consistency |

---

#### 📖 **Isolation Level 2: Read Committed (Default)**

Can only read committed data. Most common isolation level.

**Scenario:**

```
Transaction A:
    BEGIN
    UPDATE accounts SET balance = 1000 WHERE user_id = 1
    -- Not committed yet

Transaction B (Read Committed):
    BEGIN
    SELECT balance FROM accounts WHERE user_id = 1
    -- Reads old value (500) - waits for A to commit/rollback

Transaction A:
    COMMIT

Transaction B:
    SELECT balance FROM accounts WHERE user_id = 1
    -- Now reads 1000 (committed value)
    -- Non-repeatable read occurred
```

**SQL Example:**

```sql
-- Default isolation level in PostgreSQL, Oracle, SQL Server
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

BEGIN TRANSACTION;
    -- Read 1
    SELECT balance FROM accounts WHERE user_id = 1;
    -- Returns: $500

    -- Another transaction commits update to $1000

    -- Read 2
    SELECT balance FROM accounts WHERE user_id = 1;
    -- Returns: $1000 (different value!)
    -- Non-repeatable read
COMMIT;
```

**Problems:**

❌ **Non-Repeatable Read:**
```sql
-- User's balance check
BEGIN TRANSACTION;
    SELECT balance FROM accounts WHERE user_id = 1;
    -- balance = $500 ✅

    -- Another transaction updates balance to $100

    -- Try to deduct $200
    UPDATE accounts SET balance = balance - 200 WHERE user_id = 1;
    -- balance = -$100 ❌ (Should have been prevented)
COMMIT;
```

**When to Use:**

| ✅ Use For | ❌ Don't Use For |
|-----------|-----------------|
| Most web applications | Multi-step calculations |
| CRUD operations | Balance checks + updates |
| Single-query transactions | Aggregations over time |
| Default choice | Statistical analysis |

---

#### 📖 **Isolation Level 3: Repeatable Read**

Same query returns same results throughout transaction.

**Scenario:**

```
Transaction A (Repeatable Read):
    BEGIN
    SELECT balance FROM accounts WHERE user_id = 1
    -- Reads: $500

Transaction B:
    BEGIN
    UPDATE accounts SET balance = 1000 WHERE user_id = 1
    COMMIT

Transaction A:
    SELECT balance FROM accounts WHERE user_id = 1
    -- Still reads: $500 (repeatable read)
    -- Sees snapshot from transaction start
COMMIT
```

**SQL Example:**

```sql
-- PostgreSQL default, MySQL InnoDB default
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

BEGIN TRANSACTION;
    -- Read 1
    SELECT balance FROM accounts WHERE user_id = 1;
    -- Returns: $500

    -- Another transaction commits update to $1000

    -- Read 2
    SELECT balance FROM accounts WHERE user_id = 1;
    -- Still returns: $500 (repeatable read guarantee)
COMMIT;

-- Read 3 (new transaction)
SELECT balance FROM accounts WHERE user_id = 1;
-- Now returns: $1000
```

**Problems:**

❌ **Phantom Read:**
```sql
BEGIN TRANSACTION;
    -- Count active users
    SELECT COUNT(*) FROM users WHERE status = 'active';
    -- Returns: 100

    -- Another transaction inserts new active user

    -- Count again
    SELECT COUNT(*) FROM users WHERE status = 'active';
    -- Returns: 101 (phantom read in some databases)
    -- Note: PostgreSQL prevents this, but not all databases do
COMMIT;
```

**JavaScript Example:**

```javascript
async function checkAndDeduct(userId, amount) {
  const client = await db.connect();

  try {
    // Set isolation level
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await client.query('BEGIN');

    // Check balance
    const result1 = await client.query(
      'SELECT balance FROM accounts WHERE user_id = $1',
      [userId]
    );
    const balance = result1.rows[0].balance;

    console.log(`Initial balance: $${balance}`);

    // Simulate delay (another transaction might try to update)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check balance again
    const result2 = await client.query(
      'SELECT balance FROM accounts WHERE user_id = $1',
      [userId]
    );
    const balance2 = result2.rows[0].balance;

    console.log(`Balance after delay: $${balance2}`);
    // balance === balance2 (repeatable read guarantee)

    if (balance >= amount) {
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
        [amount, userId]
      );
    }

    await client.query('COMMIT');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

**When to Use:**

| ✅ Use For | ❌ Don't Use For |
|-----------|-----------------|
| Financial transactions | High-concurrency writes |
| Multi-step operations | Simple CRUD |
| Balance checks + updates | Read-only queries |
| Data consistency critical | Real-time dashboards |

---

#### 📖 **Isolation Level 4: Serializable**

Strictest isolation. Transactions execute as if they ran serially (one after another).

**Scenario:**

```
Transaction A (Serializable):
    BEGIN
    SELECT SUM(balance) FROM accounts
    -- Sum: $10,000

Transaction B (Serializable):
    BEGIN
    INSERT INTO accounts (user_id, balance) VALUES (999, 5000)
    COMMIT
    -- Waits for A to complete

Transaction A:
    SELECT SUM(balance) FROM accounts
    -- Sum: Still $10,000 (snapshot isolation)
COMMIT

Transaction B:
    -- Now executes
COMMIT
```

**SQL Example:**

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN TRANSACTION;
    -- Get all accounts with balance > $1000
    SELECT * FROM accounts WHERE balance > 1000;
    -- Returns: 10 rows

    -- Another transaction tries to insert new account
    -- It will either wait or be aborted (depends on database)

    -- Query again
    SELECT * FROM accounts WHERE balance > 1000;
    -- Still returns: 10 rows (no phantoms)
COMMIT;
```

**Implementation:**

Different databases implement Serializable differently:

**PostgreSQL - Snapshot Isolation + SSI:**
```sql
-- Serializable Snapshot Isolation
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    -- Operations
COMMIT;
-- If conflict detected, transaction aborts with error:
-- "could not serialize access due to concurrent update"
```

**MySQL InnoDB - Locking:**
```sql
-- Uses next-key locks (record + gap locks)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    SELECT * FROM accounts WHERE balance > 1000;
    -- Locks all matching rows + gaps
COMMIT;
```

**JavaScript Example with Retry:**

```javascript
async function serializableTransaction(operation, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    const client = await db.connect();

    try {
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      await client.query('BEGIN');

      // Execute operation
      const result = await operation(client);

      await client.query('COMMIT');
      client.release();
      return { success: true, result };

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();

      // Check if serialization failure
      if (error.code === '40001' || error.code === '40P01') {
        retries++;
        console.log(`Serialization failure, retry ${retries}/${maxRetries}`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
        continue;
      }

      // Other error, don't retry
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Usage
const result = await serializableTransaction(async (client) => {
  // Transfer between accounts
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE user_id = $2', [100, 1]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE user_id = $2', [100, 2]);
  return { transferred: 100 };
});
```

**When to Use:**

| ✅ Use For | ❌ Don't Use For |
|-----------|-----------------|
| Critical financial operations | High-throughput systems |
| Inventory management | Real-time applications |
| Ticket booking systems | Social media features |
| When correctness > performance | Most web applications |

---

### ⏱️ **D - Durability**

Once committed, data persists even if system crashes.

**How It Works:**

```
Transaction commits:
    1. Write to WAL (Write-Ahead Log) on disk
    2. WAL entry persisted (fsync)
    3. Return success to application
    4. Later: Apply changes to data files (asynchronous)

System crashes:
    → On restart, replay WAL
    → All committed transactions recovered ✅
```

**Guarantees:**

1. **Crash Recovery:**
   - Power failure → Data recovered
   - Hardware failure → Data persists
   - Software crash → Data intact

2. **Write-Ahead Logging:**
   - All changes logged before commit
   - Log persisted to disk
   - Can reconstruct database from log

**PostgreSQL WAL:**

```sql
-- Check WAL configuration
SHOW wal_level;  -- replica or logical
SHOW fsync;      -- on (ensures durability)

-- Force WAL flush
SELECT pg_switch_wal();
```

**MySQL InnoDB:**

```sql
-- Check durability settings
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
-- 1 = Full durability (flush log on every commit)
-- 2 = Flush to OS cache (risk: OS crash loses data)
-- 0 = Flush every second (risk: crash loses up to 1s)

-- Enable double write buffer (prevents corruption)
SHOW VARIABLES LIKE 'innodb_doublewrite';
```

**Durability Levels:**

| Setting | Durability | Performance | Risk |
|---------|-----------|-------------|------|
| **Synchronous commit** | Full | Slow | None |
| **Asynchronous commit** | Eventual | Fast | Recent commits may be lost |
| **Group commit** | Full | Moderate | None |
| **No fsync** | None | Fastest | All data loss on crash |

**JavaScript Example - Ensuring Durability:**

```javascript
async function commitWithDurability(operations) {
  const client = await db.connect();

  try {
    // Ensure synchronous commit
    await client.query('SET synchronous_commit = on');
    await client.query('BEGIN');

    // Execute operations
    for (const op of operations) {
      await client.query(op.query, op.params);
    }

    // Commit - blocks until WAL flushed to disk
    await client.query('COMMIT');

    // At this point, data is durable ✅
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

**Trade-offs:**

```
Full Durability (fsync=on):
✅ No data loss on crash
❌ Slower commits (disk I/O)
❌ Lower throughput

Relaxed Durability (fsync=off):
✅ Much faster commits
✅ Higher throughput
❌ Recent commits lost on crash
❌ Not suitable for critical data
```

---

## Concurrency Control

### 🔐 **Pessimistic Locking**

Lock resources before accessing them. Prevents conflicts by blocking other transactions.

**How It Works:**

```
Transaction A:
    SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;
    -- Acquires exclusive lock

Transaction B:
    SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;
    -- Blocked until A commits/rollbacks

Transaction A:
    UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
    COMMIT;
    -- Lock released

Transaction B:
    -- Now acquires lock and proceeds
```

**Lock Types:**

| Lock Type | SQL | Blocks | Use Case |
|-----------|-----|--------|----------|
| **Shared Lock** | `FOR SHARE` | Exclusive locks | Multiple readers |
| **Exclusive Lock** | `FOR UPDATE` | All locks | Single writer |
| **Row Lock** | `FOR UPDATE` | Only that row | Fine-grained locking |
| **Table Lock** | `LOCK TABLE` | Entire table | Bulk operations |

**SQL Examples:**

```sql
-- Exclusive row lock (write)
BEGIN TRANSACTION;
    SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;
    -- Lock acquired, other transactions wait
    UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
COMMIT;

-- Shared row lock (read)
BEGIN TRANSACTION;
    SELECT * FROM accounts WHERE user_id = 1 FOR SHARE;
    -- Multiple transactions can hold shared lock
    -- But exclusive locks are blocked
COMMIT;

-- Lock with timeout (PostgreSQL)
BEGIN TRANSACTION;
    SET LOCAL lock_timeout = '5s';
    SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;
    -- Aborts after 5s if lock not acquired
COMMIT;

-- Skip locked rows (PostgreSQL 9.5+)
SELECT * FROM queue_items
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;
-- Returns available rows, skips locked ones
```

**JavaScript Example - Queue Processing:**

```javascript
async function processQueueItem() {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock next pending item (skip locked)
    const result = await client.query(`
      SELECT * FROM queue_items
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;  // No items available
    }

    const item = result.rows[0];

    // Process item
    console.log(`Processing item ${item.id}`);
    await processItem(item);

    // Mark as completed
    await client.query(
      'UPDATE queue_items SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', item.id]
    );

    await client.query('COMMIT');
    return item;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Multiple workers can run this concurrently
// Each will lock different items (SKIP LOCKED)
```

**Problems:**

❌ **Deadlock:**
```sql
-- Transaction A
BEGIN;
SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;
-- Waits for user 2 lock...
SELECT * FROM accounts WHERE user_id = 2 FOR UPDATE;

-- Transaction B
BEGIN;
SELECT * FROM accounts WHERE user_id = 2 FOR UPDATE;
-- Waits for user 1 lock...
SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;

-- Deadlock! Both waiting for each other
-- Database detects and aborts one transaction
```

**Deadlock Prevention:**

```javascript
async function transferWithDeadlockPrevention(fromUserId, toUserId, amount) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Always lock accounts in same order (by ID)
    const [firstId, secondId] = [fromUserId, toUserId].sort((a, b) => a - b);

    // Lock first account
    await client.query(
      'SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE',
      [firstId]
    );

    // Lock second account
    await client.query(
      'SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE',
      [secondId]
    );

    // Now safe to update
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [amount, fromUserId]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, toUserId]
    );

    await client.query('COMMIT');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

**When to Use:**

| ✅ Use Pessimistic | ❌ Don't Use |
|------------------|-------------|
| High contention scenarios | Read-heavy workloads |
| Financial transactions | Low contention |
| Inventory updates | Analytics |
| Critical data modifications | Simple reads |

---

### 🎯 **Optimistic Locking**

Don't lock. Detect conflicts at commit time using version numbers or timestamps.

**How It Works:**

```
Transaction A:
    SELECT *, version FROM accounts WHERE user_id = 1;
    -- version = 5

Transaction B:
    SELECT *, version FROM accounts WHERE user_id = 1;
    -- version = 5

Transaction A:
    UPDATE accounts
    SET balance = balance - 100, version = version + 1
    WHERE user_id = 1 AND version = 5;
    -- Success (1 row updated)
    COMMIT;

Transaction B:
    UPDATE accounts
    SET balance = balance - 50, version = version + 1
    WHERE user_id = 1 AND version = 5;
    -- Failure (0 rows updated, version is now 6)
    -- Conflict detected! Retry or fail
```

**SQL Implementation:**

```sql
-- Add version column
ALTER TABLE accounts ADD COLUMN version INTEGER DEFAULT 0;

-- Optimistic update
BEGIN TRANSACTION;
    -- Read with version
    SELECT id, balance, version
    FROM accounts
    WHERE user_id = 1;
    -- Returns: id=1, balance=500, version=5

    -- Update with version check
    UPDATE accounts
    SET balance = balance - 100, version = version + 1
    WHERE user_id = 1 AND version = 5;

    -- Check if update succeeded
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        RAISE EXCEPTION 'Concurrent modification detected';
    END IF;
COMMIT;
```

**JavaScript Example:**

```javascript
async function optimisticUpdate(userId, deductAmount, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Read current state with version
      const readResult = await client.query(
        'SELECT balance, version FROM accounts WHERE user_id = $1',
        [userId]
      );

      if (readResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const { balance, version } = readResult.rows[0];

      // Check business logic
      if (balance < deductAmount) {
        throw new Error('Insufficient balance');
      }

      // Update with version check
      const updateResult = await client.query(
        `UPDATE accounts
         SET balance = balance - $1, version = version + 1
         WHERE user_id = $2 AND version = $3`,
        [deductAmount, userId, version]
      );

      if (updateResult.rowCount === 0) {
        // Conflict detected
        await client.query('ROLLBACK');
        client.release();
        retries++;
        console.log(`Conflict detected, retry ${retries}/${maxRetries}`);
        continue;
      }

      await client.query('COMMIT');
      client.release();
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}
```

**Timestamp-Based Optimistic Locking:**

```javascript
async function timestampOptimisticUpdate(userId, updates) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Read with timestamp
    const readResult = await client.query(
      'SELECT *, updated_at FROM accounts WHERE user_id = $1',
      [userId]
    );

    const account = readResult.rows[0];
    const lastUpdated = account.updated_at;

    // Update with timestamp check
    const updateResult = await client.query(
      `UPDATE accounts
       SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND updated_at = $3`,
      [updates.balance, userId, lastUpdated]
    );

    if (updateResult.rowCount === 0) {
      throw new Error('Concurrent modification detected');
    }

    await client.query('COMMIT');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

**Comparison:**

| Aspect | Pessimistic | Optimistic |
|--------|------------|-----------|
| **Locking** | Upfront | None |
| **Conflict Detection** | Prevention | Detection at commit |
| **Performance (Low Contention)** | Slower | Faster |
| **Performance (High Contention)** | Predictable | Many retries |
| **Deadlocks** | Possible | None |
| **Use Case** | Write-heavy, high contention | Read-heavy, low contention |

---

## Distributed Transactions

### 🌐 **Two-Phase Commit (2PC)**

Coordinates transactions across multiple databases to ensure atomicity.

**How It Works:**

```
Phase 1: Prepare
    Coordinator → All Participants: "Can you commit?"
    Participants: Prepare transaction, lock resources
    Participants → Coordinator: "Yes, ready" or "No, abort"

Phase 2: Commit/Abort
    If all participants voted "Yes":
        Coordinator → All Participants: "Commit"
        Participants: Commit transaction
    If any participant voted "No":
        Coordinator → All Participants: "Abort"
        Participants: Rollback transaction
```

**Diagram:**

```
Coordinator                Participant A           Participant B
     |                           |                      |
     |------- PREPARE ---------->|                      |
     |------- PREPARE --------------------------->      |
     |                           |                      |
     |<------ VOTE YES ----------|                      |
     |<------ VOTE YES --------------------------       |
     |                           |                      |
     |------- COMMIT ----------->|                      |
     |------- COMMIT ---------------------------->      |
     |                           |                      |
     |<------ ACK ---------------|                      |
     |<------ ACK ------------------------------        |
```

**SQL Example (PostgreSQL):**

```sql
-- On Coordinator
BEGIN;
    -- Prepare transaction on remote databases
    PREPARE TRANSACTION 'txn_123' ON db_a;
    PREPARE TRANSACTION 'txn_123' ON db_b;

    -- If all prepared successfully
    COMMIT PREPARED 'txn_123' ON db_a;
    COMMIT PREPARED 'txn_123' ON db_b;

    -- If any failed
    ROLLBACK PREPARED 'txn_123' ON db_a;
    ROLLBACK PREPARED 'txn_123' ON db_b;
COMMIT;
```

**JavaScript Example:**

```javascript
class TwoPhaseCommitCoordinator {
  constructor(participants) {
    this.participants = participants;  // Array of database clients
  }

  async executeDistributedTransaction(operations) {
    const transactionId = `txn_${Date.now()}`;

    try {
      // Phase 1: Prepare
      console.log('Phase 1: Prepare');
      const preparePromises = this.participants.map(async (participant, index) => {
        const client = await participant.connect();
        await client.query('BEGIN');

        // Execute operations for this participant
        await operations[index](client);

        // Prepare transaction
        await client.query(`PREPARE TRANSACTION '${transactionId}'`);
        client.release();
        return { success: true, index };
      });

      const prepareResults = await Promise.allSettled(preparePromises);

      // Check if all participants prepared successfully
      const allPrepared = prepareResults.every(r => r.status === 'fulfilled');

      if (!allPrepared) {
        // Phase 2: Abort
        console.log('Phase 2: Abort (prepare failed)');
        await this.abortPrepared(transactionId);
        return { success: false, error: 'Prepare phase failed' };
      }

      // Phase 2: Commit
      console.log('Phase 2: Commit');
      const commitPromises = this.participants.map(async (participant) => {
        const client = await participant.connect();
        await client.query(`COMMIT PREPARED '${transactionId}'`);
        client.release();
      });

      await Promise.all(commitPromises);
      return { success: true };

    } catch (error) {
      // Abort on any error
      console.log('Error, aborting transaction');
      await this.abortPrepared(transactionId);
      return { success: false, error: error.message };
    }
  }

  async abortPrepared(transactionId) {
    const abortPromises = this.participants.map(async (participant) => {
      try {
        const client = await participant.connect();
        await client.query(`ROLLBACK PREPARED '${transactionId}'`);
        client.release();
      } catch (error) {
        console.error(`Failed to abort on participant:`, error);
      }
    });

    await Promise.allSettled(abortPromises);
  }
}

// Usage
const coordinator = new TwoPhaseCommitCoordinator([dbA, dbB]);

const result = await coordinator.executeDistributedTransaction([
  // Operations for DB A
  async (client) => {
    await client.query('UPDATE accounts SET balance = balance - 100 WHERE user_id = 1');
  },
  // Operations for DB B
  async (client) => {
    await client.query('INSERT INTO audit_log (action, amount) VALUES ($1, $2)', ['transfer', 100]);
  }
]);
```

**Problems:**

❌ **Blocking Protocol:**
```
If coordinator crashes after Phase 1:
    → Participants stuck in prepared state
    → Resources locked indefinitely
    → Manual intervention required
```

❌ **Single Point of Failure:**
```
Coordinator crashes:
    → Cannot complete Phase 2
    → Participants wait forever
```

❌ **Performance:**
```
2PC is synchronous:
    → High latency (multiple round trips)
    → Reduced throughput
    → Not suitable for high-scale systems
```

**Alternatives:**

1. **Saga Pattern** (Compensating transactions)
2. **Event Sourcing** (Eventual consistency)
3. **Idempotent APIs** (Retry-safe operations)

---

### 🔄 **Saga Pattern**

Alternative to 2PC for distributed transactions. Uses sequence of local transactions with compensating actions.

**How It Works:**

```
Forward Flow:
    Service A: Deduct $100 → Success
    Service B: Add $100    → Success
    ✅ Transaction complete

Failure Flow:
    Service A: Deduct $100 → Success
    Service B: Add $100    → Failure
    Compensate Service A: Refund $100
    ❌ Transaction rolled back
```

**Types:**

**1. Choreography (Event-Driven):**

```
Transfer Service: Deducts $100
    → Publishes "AmountDeducted" event

Credit Service: Listens to "AmountDeducted"
    → Adds $100
    → Publishes "AmountCredited" event (success)
    OR
    → Publishes "CreditFailed" event (failure)

Transfer Service: Listens to "CreditFailed"
    → Compensates: Refunds $100
```

**JavaScript Example:**

```javascript
class TransferSaga {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.setupListeners();
  }

  setupListeners() {
    this.eventBus.on('TransferInitiated', this.handleTransferInitiated.bind(this));
    this.eventBus.on('AmountCredited', this.handleAmountCredited.bind(this));
    this.eventBus.on('CreditFailed', this.handleCreditFailed.bind(this));
  }

  async handleTransferInitiated(event) {
    const { sagaId, fromUserId, toUserId, amount } = event;

    try {
      // Step 1: Deduct from sender
      await db.query(
        'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
        [amount, fromUserId]
      );

      // Emit success event
      this.eventBus.emit('AmountDeducted', {
        sagaId,
        fromUserId,
        toUserId,
        amount
      });

    } catch (error) {
      // Emit failure event
      this.eventBus.emit('TransferFailed', { sagaId, error: error.message });
    }
  }

  async handleAmountCredited(event) {
    const { sagaId, toUserId, amount } = event;

    try {
      // Step 2: Credit to receiver
      await db.query(
        'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
        [amount, toUserId]
      );

      // Emit completion event
      this.eventBus.emit('TransferCompleted', { sagaId });

    } catch (error) {
      // Emit failure event (triggers compensation)
      this.eventBus.emit('CreditFailed', {
        sagaId,
        amount,
        fromUserId: event.fromUserId
      });
    }
  }

  async handleCreditFailed(event) {
    const { sagaId, fromUserId, amount } = event;

    // Compensating transaction: Refund sender
    await db.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, fromUserId]
    );

    this.eventBus.emit('TransferCompensated', { sagaId });
  }
}
```

**2. Orchestration (Centralized):**

```
Saga Orchestrator:
    1. Call Service A: Deduct $100
    2. If success, call Service B: Add $100
    3. If failure, call Service A: Compensate
```

**JavaScript Example:**

```javascript
class TransferSagaOrchestrator {
  async executeTransfer(fromUserId, toUserId, amount) {
    const sagaId = `saga_${Date.now()}`;
    const log = [];

    try {
      // Step 1: Deduct from sender
      log.push({ step: 'deduct', status: 'started' });
      await this.deductAmount(fromUserId, amount);
      log.push({ step: 'deduct', status: 'completed' });

      // Step 2: Credit to receiver
      log.push({ step: 'credit', status: 'started' });
      await this.creditAmount(toUserId, amount);
      log.push({ step: 'credit', status: 'completed' });

      // Step 3: Record transaction
      log.push({ step: 'record', status: 'started' });
      await this.recordTransaction(fromUserId, toUserId, amount);
      log.push({ step: 'record', status: 'completed' });

      return { success: true, sagaId, log };

    } catch (error) {
      console.error(`Saga ${sagaId} failed:`, error);

      // Compensate in reverse order
      await this.compensate(log);

      return { success: false, sagaId, error: error.message, log };
    }
  }

  async compensate(log) {
    // Compensate completed steps in reverse order
    const completedSteps = log
      .filter(entry => entry.status === 'completed')
      .reverse();

    for (const step of completedSteps) {
      try {
        switch (step.step) {
          case 'deduct':
            await this.refundAmount(step.userId, step.amount);
            break;
          case 'credit':
            await this.deductAmount(step.userId, step.amount);
            break;
          case 'record':
            await this.deleteTransaction(step.transactionId);
            break;
        }
      } catch (error) {
        console.error(`Compensation failed for step ${step.step}:`, error);
        // Log for manual intervention
        await this.logCompensationFailure(step, error);
      }
    }
  }

  async deductAmount(userId, amount) {
    const result = await db.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1 RETURNING balance',
      [amount, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Insufficient balance');
    }
  }

  async creditAmount(userId, amount) {
    await db.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, userId]
    );
  }

  async refundAmount(userId, amount) {
    await db.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, userId]
    );
  }

  async recordTransaction(fromUserId, toUserId, amount) {
    const result = await db.query(
      'INSERT INTO transactions (from_user_id, to_user_id, amount) VALUES ($1, $2, $3) RETURNING id',
      [fromUserId, toUserId, amount]
    );
    return result.rows[0].id;
  }
}
```

**Comparison:**

| Aspect | 2PC | Saga |
|--------|-----|------|
| **Atomicity** | Strong | Eventual |
| **Consistency** | Immediate | Eventual |
| **Coupling** | Tight | Loose |
| **Performance** | Slow (blocking) | Fast (non-blocking) |
| **Complexity** | Low | High |
| **Failure Handling** | Rollback | Compensation |
| **Use Case** | Low scale, strong consistency | High scale, eventual consistency |

---

## Interview Questions

### Q1: Explain the difference between Repeatable Read and Serializable isolation levels.

**Answer:**

**Repeatable Read:**
- Guarantees same query returns same results within transaction
- Prevents dirty reads and non-repeatable reads
- **Does NOT prevent phantom reads** (in some databases)

**Serializable:**
- Strictest isolation level
- Transactions execute as if they ran sequentially
- **Prevents dirty reads, non-repeatable reads, AND phantom reads**

**Key Difference - Phantom Reads:**

```sql
-- Repeatable Read
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    -- Query 1
    SELECT COUNT(*) FROM users WHERE age > 25;
    -- Returns: 100

    -- Another transaction inserts user with age = 30

    -- Query 2 (in some databases)
    SELECT COUNT(*) FROM users WHERE age > 25;
    -- May return: 101 (phantom read)
COMMIT;

-- Serializable
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    -- Query 1
    SELECT COUNT(*) FROM users WHERE age > 25;
    -- Returns: 100

    -- Another transaction tries to insert user with age = 30
    -- Either waits for this transaction, or gets serialization error

    -- Query 2
    SELECT COUNT(*) FROM users WHERE age > 25;
    -- Still returns: 100 (no phantom read)
COMMIT;
```

**Performance:**
- Repeatable Read: Moderate overhead, good concurrency
- Serializable: High overhead, reduced concurrency, may need retries

**When to Use:**
- **Repeatable Read**: Most transactions, financial operations, balance checks
- **Serializable**: Critical operations requiring absolute consistency, inventory management, ticket booking

---

### Q2: How do you handle distributed transactions without using 2PC?

**Answer:**

Use the **Saga Pattern** with compensating transactions.

**Approach:**

1. **Break into Local Transactions:**
   - Each service has its own database
   - Each service performs its local transaction
   - Services coordinate via events or orchestration

2. **Forward Flow:**
   ```
   Service A: Execute local transaction
   Service B: Execute local transaction
   Service C: Execute local transaction
   → All succeed: Transaction complete ✅
   ```

3. **Compensation Flow:**
   ```
   Service A: Execute local transaction ✅
   Service B: Execute local transaction ✅
   Service C: Execute local transaction ❌
   → Service B: Execute compensating transaction
   → Service A: Execute compensating transaction
   → Transaction rolled back ✅
   ```

**Example:**

```javascript
// Order placement saga
class OrderSaga {
  async placeOrder(userId, items, paymentDetails) {
    const sagaId = generateId();

    try {
      // Step 1: Reserve inventory
      const reservationId = await inventoryService.reserve(items);

      try {
        // Step 2: Process payment
        const paymentId = await paymentService.charge(paymentDetails);

        try {
          // Step 3: Create order
          const orderId = await orderService.create(userId, items);

          // Success!
          return { success: true, orderId };

        } catch (error) {
          // Compensate: Refund payment
          await paymentService.refund(paymentId);
          throw error;
        }

      } catch (error) {
        // Compensate: Release inventory
        await inventoryService.release(reservationId);
        throw error;
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

**Advantages over 2PC:**
- No blocking/locking
- Better performance and scalability
- No single point of failure
- Services remain autonomous

**Trade-offs:**
- Eventual consistency (not immediate)
- More complex to implement
- Need to handle compensation failures
- Possible temporary inconsistent states

---

### Q3: What causes database deadlocks and how do you prevent them?

**Answer:**

**What Causes Deadlocks:**

Circular wait condition where transactions wait for resources held by each other.

**Example:**

```sql
-- Transaction A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;  -- Locks user 1
-- Waits for lock on user 2...
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;

-- Transaction B (running concurrently)
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE user_id = 2;   -- Locks user 2
-- Waits for lock on user 1...
UPDATE accounts SET balance = balance + 50 WHERE user_id = 1;

-- DEADLOCK: A waits for B's lock, B waits for A's lock
```

**Prevention Strategies:**

**1. Lock Resources in Same Order:**

```javascript
async function transferMoney(fromUserId, toUserId, amount) {
  // Always lock accounts in ascending order by ID
  const [firstId, secondId] = [fromUserId, toUserId].sort((a, b) => a - b);

  await db.query('BEGIN');

  // Lock first account
  await db.query(
    'SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE',
    [firstId]
  );

  // Lock second account
  await db.query(
    'SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE',
    [secondId]
  );

  // Perform updates
  await db.query(
    'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
    [amount, fromUserId]
  );

  await db.query(
    'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
    [amount, toUserId]
  );

  await db.query('COMMIT');
}
```

**2. Use Lock Timeout:**

```sql
-- PostgreSQL
SET lock_timeout = '5s';
BEGIN;
    SELECT * FROM accounts WHERE user_id = 1 FOR UPDATE;
    -- Aborts after 5s if lock not acquired
COMMIT;
```

**3. Retry with Exponential Backoff:**

```javascript
async function executeWithRetry(operation, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      // Check if deadlock error
      if (error.code === '40P01' || error.code === '40001') {
        retries++;
        const backoff = Math.pow(2, retries) * 100;
        console.log(`Deadlock detected, retry ${retries} after ${backoff}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;  // Other error, don't retry
    }
  }

  throw new Error('Max retries exceeded');
}
```

**4. Use Application-Level Locking:**

```javascript
const redis = require('redis');

async function transferWithDistributedLock(fromUserId, toUserId, amount) {
  const lockKey = `transfer:${Math.min(fromUserId, toUserId)}:${Math.max(fromUserId, toUserId)}`;

  // Acquire distributed lock
  const lock = await redis.set(lockKey, 'locked', 'EX', 10, 'NX');

  if (!lock) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    // Perform transfer
    await transferMoney(fromUserId, toUserId, amount);
    return { success: true };
  } finally {
    // Release lock
    await redis.del(lockKey);
  }
}
```

**5. Minimize Transaction Scope:**

```javascript
// Bad: Long transaction with user input
await db.query('BEGIN');
await db.query('SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE', [userId]);
const confirmation = await askUserForConfirmation();  // ❌ Locks held during user input
if (confirmation) {
  await db.query('UPDATE accounts SET balance = balance - 100 WHERE user_id = $1', [userId]);
}
await db.query('COMMIT');

// Good: Short transaction
const confirmation = await askUserForConfirmation();  // ✅ No locks yet
if (confirmation) {
  await db.query('BEGIN');
  await db.query('SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE', [userId]);
  await db.query('UPDATE accounts SET balance = balance - 100 WHERE user_id = $1', [userId]);
  await db.query('COMMIT');
}
```

---

## Best Practices

### ✅ DO:

1. **Keep Transactions Short:**
```javascript
// Bad: Long transaction
await db.query('BEGIN');
await fetchDataFromAPI();  // Network I/O
await processData();        // CPU-intensive
await db.query('UPDATE...');
await db.query('COMMIT');

// Good: Short transaction
const data = await fetchDataFromAPI();
const processed = await processData();
await db.query('BEGIN');
await db.query('UPDATE...');
await db.query('COMMIT');
```

2. **Use Appropriate Isolation Level:**
```sql
-- Default (Read Committed) for most operations
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read for financial operations
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable only when absolutely necessary
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

3. **Handle Failures Gracefully:**
```javascript
try {
  await db.query('BEGIN');
  await performOperations();
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  // Log error, retry, or fail gracefully
}
```

4. **Use Connection Pooling:**
```javascript
const pool = new Pool({
  max: 20,  // Max connections
  idleTimeoutMillis: 30000
});

// Each transaction gets connection from pool
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Operations
  await client.query('COMMIT');
} finally {
  client.release();  // Return to pool
}
```

5. **Monitor Transaction Performance:**
```sql
-- PostgreSQL: Long-running transactions
SELECT
  pid,
  now() - xact_start AS duration,
  state,
  query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY duration DESC;
```

### ❌ DON'T:

1. **Don't Hold Locks During User Input:**
```javascript
// Bad
await db.query('BEGIN');
await db.query('SELECT * FROM seats WHERE id = 1 FOR UPDATE');
const confirmed = await askUser('Confirm booking?');  // ❌
await db.query('COMMIT');
```

2. **Don't Nest Transactions (not supported in most databases):**
```sql
-- Bad (won't work as expected)
BEGIN;
    UPDATE accounts SET balance = balance - 100;
    BEGIN;  -- ❌ Ignored or error
        UPDATE orders SET status = 'paid';
    COMMIT;  -- Commits outer transaction
COMMIT;
```

3. **Don't Use Wrong Isolation Level:**
```sql
-- Bad: Serializable for simple read
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM products WHERE id = 1;  -- Overkill
COMMIT;
```

4. **Don't Forget Error Handling:**
```javascript
// Bad
await db.query('BEGIN');
await db.query('UPDATE...');
await db.query('COMMIT');  // No error handling

// Good
try {
  await db.query('BEGIN');
  await db.query('UPDATE...');
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

---

## Summary

### Key Takeaways

1. **ACID Properties:**
   - **Atomicity**: All-or-nothing execution
   - **Consistency**: Valid state to valid state
   - **Isolation**: Transactions don't interfere
   - **Durability**: Committed data persists

2. **Isolation Levels:**
   - **Read Uncommitted**: Dirty reads possible
   - **Read Committed**: Default, prevents dirty reads
   - **Repeatable Read**: Consistent reads within transaction
   - **Serializable**: Strictest, prevents all anomalies

3. **Concurrency Control:**
   - **Pessimistic**: Lock upfront (FOR UPDATE)
   - **Optimistic**: Detect conflicts at commit (version checking)

4. **Distributed Transactions:**
   - **2PC**: Strong consistency, blocking
   - **Saga**: Eventual consistency, non-blocking

### Decision Matrix

| Scenario | Isolation Level | Locking Strategy | Reason |
|----------|----------------|------------------|--------|
| Simple read | Read Committed | None | Fast, no blocking |
| Financial transfer | Repeatable Read | Pessimistic | Strong consistency needed |
| Inventory update | Repeatable Read | Optimistic or Pessimistic | Prevent overselling |
| Analytics query | Read Uncommitted | None | Approximate data acceptable |
| Ticket booking | Serializable | Pessimistic | Absolute consistency required |
| High-concurrency reads | Read Committed | Optimistic | Minimal blocking |

### Performance Tips

1. Keep transactions short
2. Use lowest isolation level that meets requirements
3. Lock resources in consistent order
4. Use connection pooling
5. Monitor and tune based on workload

### Interview Focus

- Explain ACID properties with examples
- Understand isolation levels and their trade-offs
- Know when to use pessimistic vs optimistic locking
- Explain distributed transaction patterns (2PC, Saga)
- Handle deadlocks and failures
- Real-world scenarios (banking, e-commerce, booking systems)

---
[← Back to SystemDesign](../README.md)
