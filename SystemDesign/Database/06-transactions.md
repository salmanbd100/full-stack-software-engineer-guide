# Database Transactions

> For distributed systems theory, see Fundamentals/. This file covers ACID, isolation levels, and 2PC for database design interviews.

---

## 💡 What is a Transaction?

A transaction groups multiple operations into one atomic unit. Either all operations succeed, or none of them apply.

**Classic example — bank transfer:**

```
BEGIN
  Deduct $100 from Alice
  Add $100 to Bob
COMMIT   ← both succeed
-- OR --
ROLLBACK ← neither applies
```

---

## ACID Properties

| Property | What it guarantees |
|----------|--------------------|
| **Atomicity** | All-or-nothing execution |
| **Consistency** | Database moves from one valid state to another |
| **Isolation** | Concurrent transactions don't interfere |
| **Durability** | Committed data survives crashes |

### Atomicity

All operations succeed, or the transaction rolls back.

```typescript
async function transferMoney(
  fromId: number,
  toId: number,
  amount: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### Consistency

Database constraints enforce valid state. A `CHECK (balance >= 0)` constraint means a transaction that causes a negative balance is rejected and rolled back automatically.

```sql
ALTER TABLE accounts ADD CONSTRAINT positive_balance CHECK (balance >= 0);
```

### Durability

Once committed, data persists even through a crash. Databases write to a **Write-Ahead Log (WAL)** before confirming the commit. On restart they replay the log to recover all committed transactions.

```sql
-- PostgreSQL: full durability by default
SHOW fsync;   -- on

-- MySQL InnoDB
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
-- 1 = flush on every commit (full durability)
-- 0/2 = faster but recent commits may be lost on crash
```

---

## Isolation Levels

Isolation controls which anomalies concurrent transactions can cause.

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-----------------|:----------:|:-------------------:|:------------:|
| READ UNCOMMITTED | ✅ possible | ✅ possible | ✅ possible |
| READ COMMITTED | ❌ prevented | ✅ possible | ✅ possible |
| REPEATABLE READ | ❌ prevented | ❌ prevented | ✅ possible* |
| SERIALIZABLE | ❌ prevented | ❌ prevented | ❌ prevented |

*PostgreSQL prevents phantom reads even at REPEATABLE READ via MVCC.

### Anomaly Definitions

**Dirty read** — reading uncommitted data from another transaction that may roll back.

**Non-repeatable read** — the same row returns different values when read twice in one transaction.

**Phantom read** — a range query returns different rows when run twice because another transaction inserted or deleted rows.

### READ COMMITTED (default in PostgreSQL, Oracle)

Reads only see committed data. Safe for most CRUD operations.

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- Another transaction updates and commits here
SELECT balance FROM accounts WHERE id = 1;
-- May return a different value (non-repeatable read)
COMMIT;
```

✅ Use for: standard web app reads, single-query transactions.
❌ Avoid for: multi-step calculations that read the same row twice.

### REPEATABLE READ (default in MySQL InnoDB)

Rows you read stay consistent for the entire transaction.

```typescript
async function checkAndDeduct(userId: number, amount: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await client.query('BEGIN');

    const { rows } = await client.query<{ balance: number }>(
      'SELECT balance FROM accounts WHERE id = $1',
      [userId]
    );

    if (rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, userId]
    );
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

✅ Use for: balance checks, financial operations, multi-step reads.

### SERIALIZABLE (strictest)

Transactions behave as if they ran one after another. Prevents all anomalies, but may abort with a serialization error — your code must retry.

```typescript
async function serializableWithRetry<T>(
  operation: (client: PoolClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      await client.query('ROLLBACK');
      // 40001 = serialization failure, 40P01 = deadlock
      const isRetryable = err.code === '40001' || err.code === '40P01';
      if (!isRetryable || attempt === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
    } finally {
      client.release();
    }
  }
  throw new Error('Max retries exceeded');
}
```

✅ Use for: ticket booking, inventory (last item), anything where phantom reads matter.
❌ Avoid for: high-throughput systems — serialization failures kill throughput.

---

## Distributed Transactions: Two-Phase Commit (2PC)

2PC coordinates a transaction across multiple databases or services.

```
Phase 1 — Prepare:
  Coordinator → Participant A: "Can you commit?"
  Coordinator → Participant B: "Can you commit?"
  Participants: lock resources, write to WAL, reply YES or NO

Phase 2 — Commit or Abort:
  All voted YES → Coordinator sends COMMIT to all
  Any voted NO  → Coordinator sends ROLLBACK to all
```

```typescript
interface Participant {
  prepare(txId: string): Promise<boolean>;
  commit(txId: string): Promise<void>;
  rollback(txId: string): Promise<void>;
}

async function twoPhaseCommit(
  txId: string,
  participants: Participant[]
): Promise<boolean> {
  // Phase 1
  const votes = await Promise.all(
    participants.map(p => p.prepare(txId).catch(() => false))
  );

  if (votes.every(v => v)) {
    // Phase 2 — commit
    await Promise.all(participants.map(p => p.commit(txId)));
    return true;
  } else {
    // Phase 2 — abort
    await Promise.allSettled(participants.map(p => p.rollback(txId)));
    return false;
  }
}
```

### 2PC Tradeoffs

| Aspect | Detail |
|--------|--------|
| ✅ Strong atomicity | All nodes commit or none do |
| ❌ Blocking | If the coordinator crashes after Phase 1, participants hold locks indefinitely |
| ❌ Latency | Two round trips across the network |
| ❌ Single point of failure | Coordinator crash stops the transaction |

> For microservices at scale, prefer the **Saga pattern** (compensating transactions) over 2PC. Sagas trade strong atomicity for availability and lower coupling.

---

## Common Mistakes

❌ **Holding locks during user input or network calls**

```typescript
// BAD — lock held while waiting for user
await client.query('BEGIN');
await client.query('SELECT * FROM seats WHERE id = $1 FOR UPDATE', [seatId]);
const confirmed = await askUserToConfirm(); // lock held here!
await client.query('COMMIT');
```

✅ **Collect input first, then open the transaction**

```typescript
const confirmed = await askUserToConfirm(); // no lock yet
if (confirmed) {
  await client.query('BEGIN');
  await client.query('SELECT * FROM seats WHERE id = $1 FOR UPDATE', [seatId]);
  await client.query('UPDATE seats SET status = $1 WHERE id = $2', ['booked', seatId]);
  await client.query('COMMIT');
}
```

❌ **Using SERIALIZABLE for simple reads** — unnecessary overhead.

❌ **No error handling** — always ROLLBACK in the catch block or you leave dangling transactions.

---

## Decision Guide

| Scenario | Isolation Level |
|----------|----------------|
| Simple CRUD, dashboard reads | READ COMMITTED |
| Financial transfer, balance check | REPEATABLE READ |
| Ticket booking, last-item inventory | SERIALIZABLE |
| Analytics / reporting (approximate ok) | READ UNCOMMITTED |

---

## Interview Answer Template

> "A transaction wraps multiple operations into an atomic unit — either all succeed or all roll back. ACID ensures atomicity via write-ahead logging, consistency via constraints, isolation via locking or MVCC, and durability via WAL flush on commit.
>
> For isolation I default to READ COMMITTED for most operations, step up to REPEATABLE READ for financial flows, and use SERIALIZABLE with retry logic for booking or last-item scenarios.
>
> In distributed systems, 2PC gives strong atomicity but the coordinator becomes a single point of failure. I usually prefer the Saga pattern with compensating transactions for microservices — it's more resilient even though consistency is eventual."

---

[← Back to Database](./README.md)
