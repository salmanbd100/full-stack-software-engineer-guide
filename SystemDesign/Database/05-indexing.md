# Database Indexing

## 💡 What an Index Does

An index is a separate data structure that the database maintains alongside your table. It lets the database find rows without scanning every row in the table.

Without an index, finding one row in a million-row table requires reading all one million rows — O(n). With an index, the database goes straight to the right rows — O(log n) for B-tree, O(1) for hash.

**The tradeoff:** Indexes speed up reads. They slow down writes (because the index must be updated on every insert, update, or delete). They also use storage space.

| | Without Index | With Index |
|--|---------------|------------|
| Read performance | O(n) — full table scan | O(log n) or O(1) |
| Write performance | Fast | Slower (index maintenance) |
| Storage | Table only | Table + index structure |

---

## B-Tree Index

### 💡 How It Works

B-tree (balanced tree) is the default index type in PostgreSQL, MySQL, and most SQL databases. It keeps keys sorted in a tree structure. All leaf nodes sit at the same depth, so every lookup takes the same number of steps.

```
                 [50]
                /    \
          [25, 35]   [75, 85]
          / | \       / | \
       [10][30][40] [60][80][90]
         ↓   ↓   ↓    ↓   ↓   ↓
       data data data  data ...
```

**What B-tree supports:**
- Equality (`=`)
- Range (`>`, `<`, `BETWEEN`, `>=`, `<=`)
- Sorting (`ORDER BY`)
- Prefix matching (`LIKE 'abc%'`)

**What B-tree does not support:**
- Suffix/middle matching (`LIKE '%abc'`)
- Arbitrary function on the column (`WHERE LOWER(email) = ...` — unless you index the function)

```sql
-- Default B-tree index
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Supports range queries efficiently
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY created_at DESC;

-- Prefix match works
SELECT * FROM users WHERE username LIKE 'john%';

-- Suffix match does NOT use the index
SELECT * FROM users WHERE username LIKE '%john'; -- full scan
```

**Time complexity:** O(log n) for lookup, insert, delete. O(log n + k) for range scan where k is result size.

---

## Hash Index

### 💡 How It Works

A hash index applies a hash function to the key and stores the result in a hash table. Lookup is O(1) for exact equality.

```
Key: "john@example.com"
       ↓
Hash function
       ↓
Bucket 42 → row pointer
```

**What hash supports:**
- Equality only (`=`)

**What hash does NOT support:**
- Range queries
- Sorting
- Prefix matching

```sql
-- PostgreSQL hash index (on disk)
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- O(1) equality lookup — faster than B-tree for this case
SELECT * FROM users WHERE email = 'john@example.com';

-- This will NOT use the hash index
SELECT * FROM users WHERE email > 'john@example.com'; -- full scan
```

**B-Tree vs Hash:**

| Capability | B-Tree | Hash |
|------------|--------|------|
| Equality (`=`) | ✅ O(log n) | ✅ O(1) |
| Range (`<`, `>`) | ✅ | ❌ |
| ORDER BY | ✅ | ❌ |
| LIKE 'abc%' | ✅ | ❌ |
| Default in SQL DBs | ✅ | ❌ |

> Use B-tree by default. Only reach for hash indexes if you have an equality-only column with extremely high lookup volume and no range queries.

---

## Composite Index

### 💡 How It Works

A composite index covers multiple columns. Column order matters — the index can only be used from left to right.

```sql
-- Composite index on (user_id, created_at)
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
```

**This index supports:**

```sql
-- ✅ Filter on first column only
SELECT * FROM orders WHERE user_id = 42;

-- ✅ Filter on both columns
SELECT * FROM orders WHERE user_id = 42 AND created_at > '2024-01-01';

-- ✅ Filter first + sort second
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC;

-- ❌ Filter on second column only — cannot use the index
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

### Column Order Rule

Put the **equality filter column first**, then the **range or sort column**.

```typescript
// Mental model: the index is like a phone book
// Sorted by last name first, then first name
// You can look up "Smith" → then narrow by first name
// You CANNOT look up by first name alone

// Query: WHERE user_id = ? AND status = ? AND created_at > ?
// Best index: (user_id, status, created_at)
//   - user_id: equality filter (highest cardinality, most selective)
//   - status: equality filter
//   - created_at: range filter (always last)
```

**Cardinality rule:** Put higher-cardinality columns first in equality filters. A column with more distinct values filters out more rows early.

```sql
-- users table: 1M rows, 100K unique user_ids, 3 unique statuses
-- Bad: status first (only 3 values, low selectivity)
CREATE INDEX bad_idx ON orders(status, user_id, created_at);

-- Good: user_id first (100K values, high selectivity)
CREATE INDEX good_idx ON orders(user_id, status, created_at);
```

---

## Covering Index

A covering index includes all columns needed by a query. The database never has to look at the actual table — it gets everything from the index.

```sql
-- Query needs: user_id (filter), created_at (filter), total (return value)
CREATE INDEX idx_covering ON orders(user_id, created_at) INCLUDE (total);

-- The database satisfies this query entirely from the index
SELECT total FROM orders
WHERE user_id = 42 AND created_at > '2024-01-01';
```

> Covering indexes eliminate "table heap fetches" — the extra disk read to get columns not in the index. This can be a 10x improvement for frequent queries.

---

## When to Add an Index

**Add an index when:**
- ✅ The column appears in `WHERE`, `JOIN ON`, or `ORDER BY`
- ✅ The table has more than ~10,000 rows
- ✅ The column has high cardinality (many distinct values)
- ✅ A query shows as "Seq Scan" in EXPLAIN and runs slowly

**Do not add an index when:**
- ❌ The table is small (full scan is fast anyway)
- ❌ The column has low cardinality (boolean, status with 2–3 values)
- ❌ The column is written to very frequently
- ❌ You already have an index that starts with the same column

**Checking if a query uses your index (PostgreSQL):**

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42 AND created_at > '2024-01-01';

-- Look for:
-- "Index Scan using idx_orders_user_created" → index is used ✅
-- "Seq Scan on orders" → index is not used ❌
```

---

## Common Mistakes

❌ **Index on every column** — more indexes = slower writes. Index selectively.

❌ **Wrong column order in composite index** — `(created_at, user_id)` won't help a query that filters `WHERE user_id = ?`.

❌ **Function on indexed column** — `WHERE LOWER(email) = 'john@example.com'` won't use the index on `email`. Create a function-based index or store data in a normalized form.

❌ **Unused indexes** — old indexes that no query uses still slow down every write. Drop them.

```sql
-- PostgreSQL: find unused indexes
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

---

## Interview Answer Template

> "My default is a B-tree index — it handles equality, range, and sort queries. For a query like 'get all orders for a user sorted by date', I'd create a composite index on `(user_id, created_at DESC)`. The equality column goes first, the range/sort column goes last. If the query also returns `total`, I'd add it as an INCLUDE column to make it a covering index — so the database never has to hit the table at all. I'd verify it's used with EXPLAIN ANALYZE and watch for Seq Scans on large tables."
