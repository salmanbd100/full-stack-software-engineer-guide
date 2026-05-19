# Transactions & ACID

## 💡 **What Is a Transaction**

A transaction is a group of database operations executed as a single logical unit. Either every statement commits, or none of them do. Transactions are the foundation of correctness in any system that touches money, inventory, or shared state.

```sql
BEGIN;  -- or START TRANSACTION

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
INSERT INTO transfers (from_id, to_id, amount) VALUES (1, 2, 100);

COMMIT;  -- or ROLLBACK on error
```

If the process crashes between the two `UPDATE`s, the database rolls the partial work back on restart — you do not lose $100 to the void.

---

## 💡 **ACID Properties**

| Letter | Guarantee                             | What it prevents                       |
| ------ | ------------------------------------- | -------------------------------------- |
| **A**  | Atomicity — all or nothing            | Partial writes after crash             |
| **C**  | Consistency — constraints always hold | Negative balances, orphaned FKs        |
| **I**  | Isolation — concurrent txns don't mix | Dirty reads, lost updates              |
| **D**  | Durability — committed data survives  | Loss of committed work on power loss   |

**Atomicity** is enforced by the transaction log (WAL). The engine writes intent before mutating data pages; on crash recovery it replays committed records and rolls back the rest.

**Consistency** is enforced by `CHECK`, `FOREIGN KEY`, `UNIQUE`, and `NOT NULL` constraints — plus your application invariants. If any constraint fails mid-transaction, the entire transaction rolls back.

**Durability** is what `fsync` to the WAL buys you. Commit returns only after the log entry is persisted to disk (or to a quorum of replicas in a synchronous-replication setup).

**Isolation** is the interesting one — covered next.

---

## 💡 **Isolation Levels**

Stricter isolation means fewer concurrency anomalies but more blocking and rollbacks. The SQL standard defines four levels by which anomalies they prevent.

| Level                | Dirty read | Non-repeatable read | Phantom read | Common default     |
| -------------------- | ---------- | ------------------- | ------------ | ------------------ |
| **READ UNCOMMITTED** | ✅ allowed | ✅ allowed          | ✅ allowed   | Rare               |
| **READ COMMITTED**   | ❌         | ✅ allowed          | ✅ allowed   | PostgreSQL default |
| **REPEATABLE READ** | ❌         | ❌                  | ⚠️ (PG: ❌)  | MySQL InnoDB       |
| **SERIALIZABLE**     | ❌         | ❌                  | ❌           | Critical writes    |

**The three anomalies:**

- **Dirty read** — reading another transaction's uncommitted change.
- **Non-repeatable read** — re-running `SELECT` returns different values for the same row because someone committed an `UPDATE` in between.
- **Phantom read** — re-running the same range query returns *new rows* because someone committed an `INSERT` in between.

> PostgreSQL's `REPEATABLE READ` (snapshot isolation) already prevents phantoms for most workloads but can still suffer write skew. Use `SERIALIZABLE` for true serializability — it adds predicate locking / SSI on top.

---

## 💡 **Lost Updates and How to Avoid Them**

Two transactions read the same row, both update based on what they read, and one overwrites the other. Classic race.

```sql
-- Both sessions read balance = 100, both write balance = 50 after deducting 50.
-- Real answer should be 0.
T1: SELECT balance FROM accounts WHERE id = 1;  -- 100
T2: SELECT balance FROM accounts WHERE id = 1;  -- 100
T1: UPDATE accounts SET balance = 50 WHERE id = 1;  -- COMMIT
T2: UPDATE accounts SET balance = 50 WHERE id = 1;  -- COMMIT (lost T1's work)
```

**Two ways to fix it:**

### Pessimistic locking — `SELECT ... FOR UPDATE`

Take an exclusive row lock at read time. Other readers using `FOR UPDATE` wait.

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- now nobody else can lock or update this row until COMMIT
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
COMMIT;
```

Use when contention is high and conflicts are expected (seat booking, inventory decrement).

### Optimistic locking — version column

No locks. Each row has a `version` (or `updated_at`) column; updates fail if the version changed since you read it.

```sql
-- read
SELECT id, balance, version FROM accounts WHERE id = 1;
-- write only if version still matches
UPDATE accounts
SET balance = $1, version = version + 1
WHERE id = 1 AND version = $oldVersion;
-- affected rows = 0 means someone beat you; retry
```

```typescript
async function withdraw(accountId: number, amount: number): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { balance, version } = await db.one(
      "SELECT balance, version FROM accounts WHERE id = $1",
      [accountId]
    );
    if (balance < amount) throw new Error("Insufficient funds");

    const result = await db.result(
      `UPDATE accounts SET balance = $1, version = version + 1
       WHERE id = $2 AND version = $3`,
      [balance - amount, accountId, version]
    );
    if (result.rowCount === 1) return;  // success
  }
  throw new Error("Too much contention");
}
```

| Strategy        | Use when                                 | Cost                          |
| --------------- | ---------------------------------------- | ----------------------------- |
| **Pessimistic** | High contention, short critical section  | Blocking, deadlock risk       |
| **Optimistic**  | Low contention, retry is cheap           | Wasted work on conflicts      |

---

## 💡 **Deadlocks**

A deadlock is a cycle: T1 holds lock A and waits for B; T2 holds B and waits for A. The database detects the cycle and kills one transaction with a deadlock error.

**Prevention:**

- **Lock rows in a consistent order.** If two transfers between the same two accounts always lock the lower ID first, no cycle can form.
- **Keep transactions short.** Never wait on a network call or user input while holding locks.
- **Catch and retry.** Deadlock errors (PG: `40P01`, MySQL: `1213`) are safe to retry.

```typescript
async function transfer(fromId: number, toId: number, amount: number): Promise<void> {
  const [lo, hi] = fromId < toId ? [fromId, toId] : [toId, fromId];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.tx(async (t) => {
        // Always lock in (lo, hi) order to prevent deadlocks
        await t.none("SELECT 1 FROM accounts WHERE id IN ($1, $2) ORDER BY id FOR UPDATE", [lo, hi]);
        await t.none("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, fromId]);
        await t.none("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, toId]);
      });
      return;
    } catch (err: any) {
      if (err.code === "40P01" && attempt < 2) continue;  // deadlock: retry
      throw err;
    }
  }
}
```

---

## 💡 **Savepoints**

Savepoints let you roll back part of a transaction without losing the whole thing — useful when one optional step might fail.

```sql
BEGIN;
INSERT INTO orders (...) VALUES (...);

SAVEPOINT before_email;
INSERT INTO email_queue (...) VALUES (...);
-- if the email insert fails:
ROLLBACK TO SAVEPOINT before_email;

COMMIT;  -- order is still saved
```

ORMs use savepoints under the hood to implement "nested transactions".

---

## 📚 **Interview Q&A**

**Q1. Walk me through ACID with an example of each property being violated.**
Atomicity: crash between two `UPDATE`s leaves $100 deducted but not credited. Consistency: an `UPDATE` that would drop balance below zero violates a `CHECK` constraint. Isolation: two concurrent withdrawals both read the same balance and overdraw the account. Durability: server crashes right after `COMMIT` but the change is gone — only happens if you disabled `fsync`.

**Q2. What's the difference between Repeatable Read and Serializable in Postgres?**
Both use snapshot isolation, so neither has dirty reads or non-repeatable reads. Repeatable Read can still produce write skew — two transactions read the same data, each updates a disjoint row, and the resulting state violates a multi-row invariant. Serializable adds Serializable Snapshot Isolation (SSI) which tracks read/write dependencies and aborts one transaction if cycles form. Use Serializable when the invariant spans multiple rows.

**Q3. When would you choose optimistic over pessimistic locking?**
Optimistic when conflicts are rare and retries are cheap (most CRUD on per-user data). Pessimistic when conflicts are likely and the critical section is short (seat booking, inventory decrement, ID generation). Pessimistic blocks; optimistic wastes work on conflict.

---

## ✅ **Best Practices**

- ✅ Keep transactions short — no HTTP calls or user input inside.
- ✅ Acquire locks in a consistent order across the codebase.
- ✅ Use `READ COMMITTED` by default; bump up only when an invariant demands it.
- ✅ Always wrap transaction logic in try/catch with explicit rollback.
- ✅ Treat deadlock errors as retryable, not as bugs.
- ❌ Don't use `READ UNCOMMITTED` to "make things faster" — it's almost always wrong.
- ❌ Don't rely on application-layer locking when the database can do it correctly.

---

[← Previous: Indexes](./03-indexes.md) | [Next: PostgreSQL →](./05-postgresql.md)
