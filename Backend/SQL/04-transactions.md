---
title: Transactions and Concurrency
part: 5
chapter: 0
slug: sql-transactions
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [sql, transactions, acid, isolation, locking]
in_book: true
---

# Transactions and Concurrency {#ch-sql-transactions}

> Pick an isolation level on purpose, and stop the lost update that read-committed will not stop for you.

**In this chapter:** what ACID actually promises · the four isolation levels and their anomalies · optimistic against pessimistic locking · deadlocks · transactions in application code

## 💡 The Core Idea

A transaction turns several statements into one indivisible operation: all of them happen, or none
of them do. That is the easy half, and it is not what interviews are about.

The hard half is **concurrency**. Your transaction is not running alone, and the isolation level
decides what it is allowed to see of everyone else's in-flight work. The default in Postgres and
most engines is `READ COMMITTED`, which prevents dirty reads and permits lost updates — so
read-modify-write logic written without thinking about it is silently wrong under load, and correct
in every test that runs one request at a time.

## What ACID Promises

| Property | Promise | Delivered by |
| -------- | ------- | ------------ |
| **Atomicity** | All statements commit or none do | The write-ahead log and rollback |
| **Consistency** | Constraints hold at commit | Your constraints — the database only enforces what you declared |
| **Isolation** | Concurrent transactions do not corrupt each other | MVCC and locks, to the degree the isolation level specifies |
| **Durability** | A committed write survives a crash | `fsync` of the write-ahead log |

Consistency is the one people misstate. The database does not know your business rules; it enforces
the constraints you wrote. An `AND` you forgot in a `CHECK` is not an isolation problem.

## Isolation Levels

| Level | Dirty read | Non-repeatable read | Phantom read | Lost update |
| ----- | ---------- | ------------------- | ------------ | ----------- |
| `READ UNCOMMITTED` | Possible | Possible | Possible | Possible |
| `READ COMMITTED` (default) | No | Possible | Possible | **Possible** |
| `REPEATABLE READ` | No | No | No (in Postgres) | Detected — the transaction aborts |
| `SERIALIZABLE` | No | No | No | No |

- **Dirty read** — seeing another transaction's uncommitted write. Postgres never allows this at
  any level.
- **Non-repeatable read** — reading the same row twice inside one transaction and getting different
  values, because someone committed in between.
- **Phantom read** — re-running a query and finding new rows. Postgres's snapshot isolation
  prevents this at `REPEATABLE READ`, which the SQL standard does not require.
- **Lost update** — two transactions read the same value, both compute from it, and the second
  write overwrites the first.

Postgres implements `REPEATABLE READ` as snapshot isolation: your transaction sees the database as
of its first statement. Conflicting writes are detected at commit and raise a serialisation
failure, which means **any application using it must be prepared to retry**.

## The Lost Update

```sql
-- Two concurrent transactions, READ COMMITTED. Stock starts at 10.
-- T1: SELECT stock FROM products WHERE id = 1;   -- 10
-- T2: SELECT stock FROM products WHERE id = 1;   -- 10
-- T1: UPDATE products SET stock = 9 WHERE id = 1;
-- T2: UPDATE products SET stock = 9 WHERE id = 1;  -- one sale vanished
```

Three fixes, in increasing order of cost:

**1. Do the arithmetic in the database.** Correct, cheapest, and the answer whenever the new value
is a function of the old one.

```sql
UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock >= 1;
-- Zero rows affected means insufficient stock. The row lock is held only for this statement.
```

**2. Optimistic locking** — a version column. No lock is held, so it scales; the loser retries.

```sql
UPDATE products SET stock = $1, version = version + 1
WHERE id = $2 AND version = $3;
-- Zero rows affected means someone else committed first: re-read and retry.
```

**3. Pessimistic locking** — `SELECT … FOR UPDATE` takes a row lock until the transaction ends.

```sql
BEGIN;
SELECT stock FROM products WHERE id = $1 FOR UPDATE; -- other writers block here
UPDATE products SET stock = $2 WHERE id = $1;
COMMIT;
```

| Approach | Use when | Cost |
| -------- | -------- | ---- |
| In-database arithmetic | The new value derives from the old one | None — always prefer it |
| Optimistic (version column) | Conflicts are rare; a long think-time between read and write | Retry logic, and a user-visible conflict |
| Pessimistic (`FOR UPDATE`) | Conflicts are common; the work between read and write is short | Blocked writers; deadlock risk |

`FOR UPDATE SKIP LOCKED` is the variant worth knowing: it is how you build a work queue on a SQL
table, because each worker claims rows nobody else holds instead of queueing behind them.

## Deadlocks

Two transactions each hold what the other needs. The database detects the cycle and kills one with
a serialisation error.

```text
T1: locks row A → waits for row B
T2: locks row B → waits for row A
```

The prevention is boringly effective: **always acquire locks in a consistent order.** If every
transfer locks the lower account id first, the cycle cannot form.

```typescript
const [first, second] = [fromId, toId].sort(); // Deterministic order, no cycle possible.
await tx.query('SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE', [first]);
await tx.query('SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE', [second]);
```

Keep transactions short for the same reason — a long transaction holds locks longer, widening
every window for conflict. And never do anything slow inside one.

## Transactions in Application Code

```typescript
async function transfer(fromId: string, toId: string, amount: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1',
      [amount, fromId],
    );
    if (rowCount === 0) throw new AppError('Insufficient funds', 409, 'insufficient_funds');

    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // Without this, the pool leaks a connection per call.
  }
}
```

Three rules this shows:

- **One client for the whole transaction.** Statements issued through the pool land on different
  connections and are therefore different transactions.
- **`ROLLBACK` in `catch`, `release` in `finally`.** A missing `release` exhausts the pool, and the
  symptom is the whole service hanging.
- **Never `await` an HTTP call inside a transaction.** A 30-second timeout becomes a 30-second lock.

> ⚠️ Retrying a serialisation failure is mandatory at `REPEATABLE READ` and `SERIALIZABLE`. Retry
> the whole transaction, not the failed statement, and cap the attempts.

**Savepoints** give partial rollback inside a transaction — useful when one optional step may fail
without invalidating the rest. In Postgres, note that *any* error aborts the whole transaction
unless a savepoint was set, so a `try`/`catch` around one statement without a savepoint does not
let you continue.

## 🔑 Key Takeaways

- `READ COMMITTED` is the default and it permits lost updates, so read-modify-write needs explicit protection.
- Prefer arithmetic in the `UPDATE` statement; it is correct and free.
- Optimistic locking scales and needs retry logic; pessimistic locking blocks and needs short transactions.
- Acquire locks in a deterministic order and deadlocks cannot form.
- Any code at `REPEATABLE READ` or above must retry serialisation failures.

## Interview Questions

**Q: What is a lost update, and does the default isolation level prevent it?**

Two transactions read the same value, each computes a new one from it, and the second write
overwrites the first — one update disappears. `READ COMMITTED` does not prevent it: both reads are
legal and both writes are legal. You need in-database arithmetic, a version check, or a row lock.

**Q: Optimistic or pessimistic locking?**

Optimistic when conflicts are rare or the gap between read and write is long — an edit form open
for ten minutes should not hold a lock. Pessimistic when conflicts are frequent and the work
between read and write is short, because retry storms cost more than brief blocking. Optimistic
pushes the conflict to the user; pessimistic pushes latency onto other writers.

**Q: How do you prevent deadlocks?**

Acquire locks in a consistent order across all code paths, keep transactions short, and touch as
few rows as possible. Detection is the database's job, and it will kill one transaction — so the
application still needs to retry. Lock ordering is what stops the cycle forming in the first place.

## What to Read Next

- [Chapter ?? — Indexes and Query Plans](#ch-indexes) — why a lock is held longer than you expected
- [Chapter ?? — ORMs and Migrations](#ch-orms) — how an ORM wraps a transaction, and where it does not
- [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) — idempotency keys, the HTTP-level version of this problem
