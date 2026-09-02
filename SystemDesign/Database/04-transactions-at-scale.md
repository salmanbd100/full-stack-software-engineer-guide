---
title: Transactions at Scale
part: 6
chapter: 0
slug: database-transactions
level: advanced
reading_time: 10
updated: 2026-09-02
tags: [system-design, transactions, isolation, locking, idempotency]
in_book: true
---

# Transactions at Scale {#ch-database-transactions}

> Name the isolation level a feature needs, choose optimistic or pessimistic locking for contention, and know what disappears once the data is spread across machines.

**In this chapter:** ACID in one page · the four anomalies · isolation levels · optimistic versus pessimistic locking · hot rows · what breaks across services

## 💡 The Core Idea

A transaction is a promise that a group of writes either all happen or none do, and that concurrent
work does not let anyone see the half-finished middle. Databases keep that promise with locks and
versioning, and both cost throughput. Isolation levels are the dial: each one gives back some
concurrency in exchange for permitting one more kind of anomaly.

Once the data is spread across shards or services, the promise weakens further, and the honest senior
answer is usually about *arranging not to need* a distributed transaction rather than performing one.

> Correctness under concurrency is the part of database work that cannot be added later. Everything
> else can be tuned.

## How It Works

### ACID, briefly

| Property    | Means                                                | Broken by                            |
| ----------- | ---------------------------------------------------- | ------------------------------------ |
| Atomicity   | All writes commit, or none do                         | A crash mid-transaction with no rollback |
| Consistency | The database's own constraints hold before and after  | Constraints you moved into application code |
| Isolation   | Concurrent transactions do not see each other's partial work | Too low an isolation level |
| Durability  | A committed write survives a crash                    | Write caches with no flush guarantee |

"Consistency" here means constraint integrity — foreign keys, uniqueness, checks. It is a different word
from the distributed-systems consistency in [Chapter ?? — Consistency and CAP](#ch-consistency-and-cap),
and conflating the two is a common interview stumble.

### The four anomalies

| Anomaly              | What happens                                                   |
| -------------------- | -------------------------------------------------------------- |
| Dirty read           | You read a value another transaction has not committed          |
| Non-repeatable read  | You read the same row twice and get different values            |
| Phantom read         | You run the same query twice and a new row appears              |
| Lost update          | Two read-modify-writes, and one silently overwrites the other   |

### Isolation levels

| Level             | Prevents                                    | Cost                       |
| ----------------- | ------------------------------------------- | -------------------------- |
| Read uncommitted  | Nothing                                     | None — and almost never useful |
| Read committed    | Dirty reads                                 | Low. PostgreSQL's default  |
| Repeatable read   | Dirty and non-repeatable reads              | Moderate. MySQL InnoDB's default |
| Serializable      | All four                                    | High — retries under contention |

**Read committed is the right default**, and lost updates are the anomaly it still permits — which is
exactly the one that matters for counters, balances and inventory. That is what locking is for.

### Optimistic or pessimistic

**Pessimistic — take the lock first:**

```sql
BEGIN;
SELECT quantity FROM inventory WHERE sku = 'A1' FOR UPDATE; -- blocks other writers
UPDATE inventory SET quantity = quantity - 1 WHERE sku = 'A1';
COMMIT;
```

**Optimistic — detect the conflict at write time:**

```typescript
// The version column turns a lost update into a visible, retryable failure.
async function decrement(db: Db, sku: string, expectedVersion: number): Promise<boolean> {
  const rows: number = await db.update(
    "UPDATE inventory SET quantity = quantity - 1, version = version + 1 " +
      "WHERE sku = $1 AND version = $2 AND quantity > 0",
    [sku, expectedVersion],
  );
  return rows === 1; // 0 means someone else won — reload and retry
}
```

| | Pessimistic | Optimistic |
| --- | ----------- | ---------- |
| Behaviour under contention | Waits, then possibly deadlocks | Fails fast, then retries |
| Best when | Conflicts are common, work is short | Conflicts are rare |
| Worst when | A lock is held across a network call | Contention is high — retries thrash |
| Risk | Deadlock, and lock convoys | Livelock on a genuinely hot row |

The rule that avoids most production incidents: **never hold a database lock across a network call.**
A row locked while you wait for a payment provider is a row locked for the provider's p99.

### Hot rows

A single row that everyone updates — a global counter, the last seat, a popular product's stock — is a
serialisation point that no isolation level fixes.

| Technique              | How                                                     | Cost                              |
| ---------------------- | ------------------------------------------------------- | --------------------------------- |
| Sharded counters       | Split into N rows, sum on read                           | Reads become an aggregate         |
| Queue the writes       | Serialise through one consumer per key                   | Latency, and eventual consistency |
| Reserve then confirm   | Take a short-lived hold, confirm or expire it            | A reaper for expired holds        |
| Move it out of the database | An atomic counter in Redis                          | A second store, and durability questions |

Reserve-then-confirm is the pattern behind every ticketing and booking system: the seat is held for ten
minutes, the payment happens outside the transaction, and an expiry job returns unconfirmed holds.

### What breaks once data is distributed

Across shards or services, a single transaction no longer covers everything.

| Need                          | Answer                                                  |
| ----------------------------- | ------------------------------------------------------- |
| Two writes in one shard        | An ordinary transaction — design the shard key so related data lands together |
| Two writes in two shards       | Some stores support it, at a cost; most do not          |
| Two writes in two services     | A saga with compensations                               |
| A message sent with a write    | The outbox pattern — write the event in the same transaction |

Two-phase commit exists and is almost always the wrong choice across services: it holds locks over the
network and blocks every participant if the coordinator dies. Idempotency is the property that makes the
alternatives work, because every retry-based approach will apply the same operation twice.

## When to Use It

| Situation                              | Choose                            |
| -------------------------------------- | --------------------------------- |
| Ordinary CRUD                           | Read committed, no explicit locks  |
| Read-modify-write on a rarely contended row | Optimistic, with a version column |
| Inventory or seats under heavy contention | Pessimistic, or reserve-then-confirm |
| Reporting over a moving dataset         | Repeatable read or a snapshot      |
| A workflow spanning services            | A saga, never a distributed transaction |

## Common Mistakes

**❌ Read-modify-write without protection**

> `SELECT balance` → subtract in application code → `UPDATE balance`.

Two concurrent transfers both read 100, both write 50, and 50 disappears. This is the lost update, and
read committed does not prevent it.

**✅ Let the database do the arithmetic, or version the row**

> `UPDATE accounts SET balance = balance - 50 WHERE id = $1 AND balance >= 50`

**❌ Long-running transactions**

A transaction open for thirty seconds holds locks and blocks vacuum. Keep them short, and do slow work
outside them.

**❌ Serializable everywhere as a precaution**

It converts contention into serialisation failures the application must retry, and most code has no
retry path — so the "safe" choice produces user-visible errors.

## 🔑 Key Takeaways

- Isolation levels trade concurrency for the anomalies they permit; read committed is the sensible default.
- Read committed still allows lost updates, which is why counters and balances need locking or an atomic expression.
- Optimistic locking suits rare conflicts; pessimistic suits frequent ones — and neither should hold a lock across a network call.
- A hot row is a serialisation point that no isolation level fixes; shard it, queue it, or reserve and confirm.
- Across services there is no transaction, only sagas and idempotency, so design the shard key to keep related writes together.

## Interview Questions

**Q: Two users buy the last item at the same time. How do you stop overselling?**

Make the decrement conditional and atomic in one statement — `UPDATE ... SET quantity = quantity - 1
WHERE sku = $1 AND quantity > 0` — and treat zero affected rows as "sold out". If the flow needs to hold
stock while a payment completes, switch to reserve-then-confirm with an expiry, because holding a
database lock for the duration of a payment call is not viable.

**Q: What isolation level would you choose, and why not serializable?**

Read committed for almost everything, with explicit locking or version columns on the few paths where
lost updates matter. Serializable pushes conflicts into serialisation errors the application must catch
and retry, and code that has no retry path turns that safety into 500s for users.

**Q: Optimistic or pessimistic locking?**

Optimistic when conflicts are rare, because nothing blocks in the common case and the failure is a cheap
retry. Pessimistic when contention is high or a retry loop would thrash — a popular product's stock row,
for instance. The deciding number is the observed conflict rate, not a preference.

## What to Read Next

- [Chapter ?? — Service Boundaries](#ch-service-boundaries) — sagas and the outbox, in the context that needs them
- [Chapter ?? — Consistency and CAP](#ch-consistency-and-cap) — the other meaning of consistency, and the one CAP is about
- [Chapter ?? — Design Ticketmaster](#ch-design-ticketmaster) — reserve-then-confirm under real contention
