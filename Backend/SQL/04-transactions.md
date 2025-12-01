# Transactions & ACID

## Transactions

A transaction is a sequence of operations performed as a single logical unit of work. Either all operations succeed (commit) or all fail (rollback).

```sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;  -- Save changes
-- OR
ROLLBACK;  -- Undo changes
```

## ACID Properties

### Atomicity
All operations succeed or all fail. No partial transactions.

```sql
START TRANSACTION;
INSERT INTO orders (user_id, total) VALUES (1, 100);
INSERT INTO order_items (order_id, product_id, qty) VALUES (LAST_INSERT_ID(), 5, 2);
COMMIT;  -- Both succeed or both fail
```

### Consistency
Database moves from one valid state to another. Constraints are always enforced.

### Isolation
Concurrent transactions don't interfere with each other.

### Durability
Committed transactions persist even after system failure.

## Isolation Levels

### READ UNCOMMITTED
- Lowest isolation, highest performance
- Dirty reads possible

### READ COMMITTED
- Prevents dirty reads
- Non-repeatable reads possible
- Default in PostgreSQL

### REPEATABLE READ
- Prevents dirty and non-repeatable reads
- Phantom reads possible
- Default in MySQL

### SERIALIZABLE
- Highest isolation, lowest performance
- No anomalies

```sql
-- Set isolation level
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
-- queries
COMMIT;
```

## Locking

```sql
-- Shared lock (read)
SELECT * FROM accounts WHERE id = 1 FOR SHARE;

-- Exclusive lock (write)
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

-- Deadlock prevention
SET innodb_lock_wait_timeout = 50;
```

## Interview Questions

**Q: What is a transaction?**
A: A sequence of operations treated as a single unit. All succeed (commit) or all fail (rollback).

**Q: Explain ACID**
A:
- Atomicity: All or nothing
- Consistency: Valid state to valid state
- Isolation: Concurrent transactions don't interfere
- Durability: Committed changes persist

**Q: What causes deadlocks?**
A: Two transactions waiting for each other's locks. Prevent by: consistent lock order, shorter transactions, timeouts.

## Best Practices

✅ Keep transactions short
✅ Lock in consistent order
✅ Use appropriate isolation level
✅ Handle errors and rollback
❌ Don't hold locks long
❌ Don't nest transactions unnecessarily

---

[← Previous: Indexes](./03-indexes.md) | [Next: PostgreSQL →](./05-postgresql.md)
