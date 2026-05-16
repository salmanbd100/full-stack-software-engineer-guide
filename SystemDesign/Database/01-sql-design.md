# SQL Database Design

## 💡 What SQL Is For

SQL databases store data in tables with rows and columns. Every table has a fixed schema. Relationships between tables use foreign keys. The database enforces constraints and guarantees ACID properties.

Use SQL when your data is structured, your queries need JOINs, or you need transactions that span multiple rows.

---

## Normalization

Normalization removes redundancy. It prevents update anomalies — where you change data in one place but forget another.

### 1NF — First Normal Form

**Rule:** Each column holds one atomic value. No arrays, no comma-separated lists.

❌ Violates 1NF:

```sql
-- products column stores "laptop,mouse,keyboard"
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer  VARCHAR(100),
  products  VARCHAR(500)
);
```

✅ 1NF compliant:

```sql
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer VARCHAR(100)
);

CREATE TABLE order_items (
  order_id     INT REFERENCES orders(order_id),
  product_name VARCHAR(100),
  PRIMARY KEY (order_id, product_name)
);
```

### 2NF — Second Normal Form

**Rule:** Must be 1NF. Every non-key column must depend on the **whole** primary key, not just part of it.

❌ Violates 2NF — `product_name` depends only on `product_id`, not on the full `(order_id, product_id)` key:

```sql
CREATE TABLE order_items (
  order_id     INT,
  product_id   INT,
  product_name VARCHAR(100),  -- partial dependency
  quantity     INT,
  PRIMARY KEY (order_id, product_id)
);
```

✅ 2NF compliant — move `product_name` to its own table:

```sql
CREATE TABLE products (
  product_id   INT PRIMARY KEY,
  product_name VARCHAR(100)
);

CREATE TABLE order_items (
  order_id   INT REFERENCES orders(order_id),
  product_id INT REFERENCES products(product_id),
  quantity   INT,
  PRIMARY KEY (order_id, product_id)
);
```

### 3NF — Third Normal Form

**Rule:** Must be 2NF. No column should depend on another non-key column (no transitive dependencies).

❌ Violates 3NF — `department_name` depends on `department_id`, not on `employee_id`:

```sql
CREATE TABLE employees (
  employee_id     INT PRIMARY KEY,
  employee_name   VARCHAR(100),
  department_id   INT,
  department_name VARCHAR(100)  -- transitive dependency
);
```

✅ 3NF compliant:

```sql
CREATE TABLE departments (
  department_id   INT PRIMARY KEY,
  department_name VARCHAR(100)
);

CREATE TABLE employees (
  employee_id   INT PRIMARY KEY,
  employee_name VARCHAR(100),
  department_id INT REFERENCES departments(department_id)
);
```

### When to Denormalize

Normalized schemas require JOINs. For read-heavy workloads, JOINs become expensive. Denormalize deliberately — not by accident.

| Scenario | Normalize | Denormalize |
|----------|-----------|-------------|
| Frequent writes | ✅ | ❌ |
| Complex JOINs on hot path | ❌ | ✅ |
| Reporting / analytics | ❌ | ✅ |
| Strong consistency needed | ✅ | ❌ |

---

## JOIN Types

```sql
-- INNER JOIN: rows that match in both tables
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN: all users, even those with no orders
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- Self JOIN: hierarchical data (employee → manager)
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

| JOIN Type | Returns |
|-----------|---------|
| INNER | Only matching rows from both sides |
| LEFT | All left rows + matched right rows (NULL if no match) |
| RIGHT | All right rows + matched left rows (NULL if no match) |
| FULL OUTER | All rows from both, NULL where no match |

> Use INNER JOIN by default. Use LEFT JOIN when the right-side data is optional.

---

## Indexing Basics in SQL

Add an index on any column you filter or sort by often.

```sql
-- Index on a frequently filtered column
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Composite index for (filter + sort) queries
CREATE INDEX idx_orders_user_created
  ON orders(user_id, created_at DESC);

-- Partial index — only index active records
CREATE INDEX idx_users_active
  ON users(email)
  WHERE is_active = true;
```

> Composite index column order matters: put the equality filter column first, then the range/sort column.

---

## SQL vs NoSQL

| Factor | SQL | NoSQL |
|--------|-----|-------|
| Schema | Fixed, enforced | Flexible, per-document |
| Scaling | Vertical (bigger machine) | Horizontal (more machines) |
| Transactions | ACID across tables | Eventual consistency (usually) |
| Queries | Expressive SQL with JOINs | Key-based or limited query API |
| Relationships | Foreign keys, JOINs | Embed or denormalize |
| Best fit | Complex queries, financial data | High write volume, flexible data |

**Choose SQL when:**
- You need multi-row transactions (banking, inventory)
- Your data has clear relationships
- Query patterns are complex or unknown upfront
- Examples: PostgreSQL, MySQL

**Choose NoSQL when:**
- You need horizontal write scaling
- Schema changes frequently
- You query by a single key or simple filter
- Examples: MongoDB, DynamoDB, Cassandra

---

## Common Design Patterns

**Many-to-many — use a junction table:**

```sql
CREATE TABLE student_courses (
  student_id INT REFERENCES students(id),
  course_id  INT REFERENCES courses(id),
  enrolled_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (student_id, course_id)
);
```

**Soft delete — never actually delete rows:**

```sql
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMP NULL;

-- Query active posts only
SELECT * FROM posts WHERE deleted_at IS NULL;
```

**Audit trail — track all changes:**

```sql
CREATE TABLE price_history (
  id           BIGSERIAL PRIMARY KEY,
  product_id   INT REFERENCES products(id),
  price        NUMERIC(10, 2),
  effective_at TIMESTAMP DEFAULT NOW(),
  changed_by   INT REFERENCES users(id)
);
```

---

## Common Mistakes

❌ **No index on foreign keys** — every JOIN becomes a full scan.

❌ **SELECT \*** — pulls columns you don't need; kills covering index benefits.

❌ **Normalizing a read-heavy reporting table** — JOINs in analytics queries are slow; denormalize or use a data warehouse.

❌ **Using VARCHAR(255) everywhere** — choose appropriate column sizes; affects storage and index efficiency.

---

## Interview Answer Template

> "I'd use PostgreSQL here because the data has clear relationships — users, orders, and products — and we need transactional integrity when inventory changes. I'd normalize to 3NF to start: separate tables for each entity with foreign key constraints. For read performance, I'd add indexes on the JOIN columns and any filtered columns. If reads become a bottleneck, I'd consider read replicas or selective denormalization for reporting queries — but I'd keep the transactional tables normalized."
