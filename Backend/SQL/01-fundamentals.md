# SQL Fundamentals

## Overview

SQL (Structured Query Language) is the standard language for interacting with relational databases. Understanding SQL fundamentals is essential for backend development and is extensively covered in technical interviews.

## Basic SQL Commands

### SELECT Statement

```sql
-- Select all columns
SELECT * FROM users;

-- Select specific columns
SELECT name, email FROM users;

-- Select with alias
SELECT name AS full_name, email AS email_address FROM users;

-- Select distinct values
SELECT DISTINCT country FROM users;

-- Limit results
SELECT * FROM users LIMIT 10;

-- Offset and limit (pagination)
SELECT * FROM users LIMIT 10 OFFSET 20;
```

### WHERE Clause

```sql
-- Equality
SELECT * FROM users WHERE age = 25;

-- Comparison operators
SELECT * FROM users WHERE age > 18;
SELECT * FROM users WHERE age >= 18;
SELECT * FROM users WHERE age < 65;
SELECT * FROM users WHERE age <= 65;
SELECT * FROM users WHERE age != 25;

-- Multiple conditions
SELECT * FROM users WHERE age > 18 AND country = 'USA';
SELECT * FROM users WHERE age < 18 OR age > 65;

-- NOT operator
SELECT * FROM users WHERE NOT country = 'USA';

-- IN operator
SELECT * FROM users WHERE country IN ('USA', 'Canada', 'UK');

-- BETWEEN operator
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- LIKE operator (pattern matching)
SELECT * FROM users WHERE name LIKE 'John%';  -- Starts with John
SELECT * FROM users WHERE name LIKE '%Doe';   -- Ends with Doe
SELECT * FROM users WHERE name LIKE '%son%';  -- Contains son

-- IS NULL / IS NOT NULL
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;
```

### ORDER BY

```sql
-- Ascending order (default)
SELECT * FROM users ORDER BY name;
SELECT * FROM users ORDER BY name ASC;

-- Descending order
SELECT * FROM users ORDER BY age DESC;

-- Multiple columns
SELECT * FROM users ORDER BY country, name;
SELECT * FROM users ORDER BY country ASC, age DESC;
```

### INSERT Statement

```sql
-- Insert single row
INSERT INTO users (name, email, age)
VALUES ('John Doe', 'john@example.com', 30);

-- Insert multiple rows
INSERT INTO users (name, email, age) VALUES
  ('John Doe', 'john@example.com', 30),
  ('Jane Smith', 'jane@example.com', 25),
  ('Bob Johnson', 'bob@example.com', 35);

-- Insert from SELECT
INSERT INTO archived_users
SELECT * FROM users WHERE last_login < '2023-01-01';
```

### UPDATE Statement

```sql
-- Update single column
UPDATE users SET email = 'newemail@example.com' WHERE id = 1;

-- Update multiple columns
UPDATE users
SET email = 'newemail@example.com', age = 31
WHERE id = 1;

-- Update with calculation
UPDATE products SET price = price * 1.1 WHERE category = 'electronics';

-- Update all rows (dangerous!)
UPDATE users SET status = 'active';
```

### DELETE Statement

```sql
-- Delete specific rows
DELETE FROM users WHERE id = 1;

-- Delete with condition
DELETE FROM users WHERE last_login < '2022-01-01';

-- Delete all rows (dangerous!)
DELETE FROM users;

-- TRUNCATE (faster, resets auto-increment)
TRUNCATE TABLE users;
```

## Aggregate Functions

```sql
-- COUNT
SELECT COUNT(*) FROM users;
SELECT COUNT(DISTINCT country) FROM users;

-- SUM
SELECT SUM(price) FROM orders;

-- AVG
SELECT AVG(age) FROM users;

-- MIN/MAX
SELECT MIN(age), MAX(age) FROM users;

-- Multiple aggregates
SELECT
  COUNT(*) as total_users,
  AVG(age) as average_age,
  MIN(age) as youngest,
  MAX(age) as oldest
FROM users;
```

## GROUP BY

```sql
-- Group by single column
SELECT country, COUNT(*) as user_count
FROM users
GROUP BY country;

-- Group by multiple columns
SELECT country, city, COUNT(*) as user_count
FROM users
GROUP BY country, city;

-- Group with aggregate
SELECT country, AVG(age) as avg_age
FROM users
GROUP BY country;

-- HAVING clause (filter groups)
SELECT country, COUNT(*) as user_count
FROM users
GROUP BY country
HAVING COUNT(*) > 100;

-- GROUP BY with ORDER BY
SELECT country, COUNT(*) as user_count
FROM users
GROUP BY country
ORDER BY user_count DESC;
```

## JOINs

### INNER JOIN

```sql
-- Returns matching rows from both tables
SELECT users.name, orders.order_date, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;

-- Multiple joins
SELECT u.name, o.order_date, p.product_name, oi.quantity
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id;
```

### LEFT JOIN (LEFT OUTER JOIN)

```sql
-- Returns all rows from left table, matching rows from right table
SELECT u.name, o.order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- Users without orders
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

### RIGHT JOIN (RIGHT OUTER JOIN)

```sql
-- Returns all rows from right table, matching rows from left table
SELECT u.name, o.order_date
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

### FULL OUTER JOIN

```sql
-- Returns all rows when there's a match in either table
SELECT u.name, o.order_date
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
```

### CROSS JOIN

```sql
-- Cartesian product (all combinations)
SELECT u.name, p.product_name
FROM users u
CROSS JOIN products p;
```

### SELF JOIN

```sql
-- Join table to itself
SELECT e1.name as employee, e2.name as manager
FROM employees e1
LEFT JOIN employees e2 ON e1.manager_id = e2.id;
```

## Subqueries

```sql
-- Subquery in WHERE
SELECT name FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);

-- Subquery in SELECT
SELECT
  name,
  (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
FROM users;

-- Subquery in FROM
SELECT avg_order
FROM (
  SELECT AVG(total) as avg_order
  FROM orders
  GROUP BY user_id
) as user_averages;

-- Correlated subquery
SELECT name
FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.total > 1000
);
```

## Common Table Expressions (CTEs)

```sql
-- Simple CTE
WITH high_value_customers AS (
  SELECT user_id, SUM(total) as total_spent
  FROM orders
  GROUP BY user_id
  HAVING SUM(total) > 10000
)
SELECT u.name, hvc.total_spent
FROM users u
JOIN high_value_customers hvc ON u.id = hvc.user_id;

-- Recursive CTE (organizational hierarchy)
WITH RECURSIVE employee_hierarchy AS (
  SELECT id, name, manager_id, 0 as level
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  SELECT e.id, e.name, e.manager_id, eh.level + 1
  FROM employees e
  JOIN employee_hierarchy eh ON e.manager_id = eh.id
)
SELECT * FROM employee_hierarchy;
```

## Window Functions

```sql
-- ROW_NUMBER
SELECT
  name,
  salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) as rank
FROM employees;

-- RANK and DENSE_RANK
SELECT
  name,
  salary,
  RANK() OVER (ORDER BY salary DESC) as rank,
  DENSE_RANK() OVER (ORDER BY salary DESC) as dense_rank
FROM employees;

-- PARTITION BY
SELECT
  department,
  name,
  salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank
FROM employees;

-- LAG and LEAD
SELECT
  date,
  revenue,
  LAG(revenue) OVER (ORDER BY date) as prev_revenue,
  LEAD(revenue) OVER (ORDER BY date) as next_revenue
FROM daily_sales;

-- Running total
SELECT
  date,
  amount,
  SUM(amount) OVER (ORDER BY date) as running_total
FROM transactions;
```

## Interview Questions

### Q1: What is the difference between WHERE and HAVING?

**Answer:**
- **WHERE**: Filters rows before grouping
- **HAVING**: Filters groups after GROUP BY

```sql
SELECT country, COUNT(*) as count
FROM users
WHERE age > 18  -- Filter before grouping
GROUP BY country
HAVING COUNT(*) > 100;  -- Filter after grouping
```

### Q2: What is the difference between INNER JOIN and LEFT JOIN?

**Answer:**
- **INNER JOIN**: Returns only matching rows from both tables
- **LEFT JOIN**: Returns all rows from left table, matching rows from right table (NULL if no match)

### Q3: What is the difference between DELETE and TRUNCATE?

**Answer:**
- **DELETE**: Removes rows one by one, can use WHERE, slower, can rollback, doesn't reset auto-increment
- **TRUNCATE**: Removes all rows at once, faster, can't rollback (in most DBs), resets auto-increment

### Q4: How do you find duplicate records?

**Answer:**
```sql
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

### Q5: What are aggregate functions?

**Answer:**
Functions that perform calculations on multiple rows: COUNT(), SUM(), AVG(), MIN(), MAX()

## Best Practices

### ✅ Do's

1. **Use explicit column names** instead of SELECT *
2. **Always use WHERE clause** when updating/deleting
3. **Use indexes** on frequently queried columns
4. **Use JOINs** instead of multiple queries
5. **Use prepared statements** to prevent SQL injection
6. **Use transactions** for multiple related operations

### ❌ Don'ts

1. **Don't use SELECT *** in production
2. **Don't forget WHERE** in UPDATE/DELETE
3. **Don't use OR** on indexed columns (use IN)
4. **Don't retrieve unnecessary data**
5. **Don't use LIKE with leading wildcard** (can't use index)

## Summary

- SELECT retrieves data from tables
- WHERE filters rows, HAVING filters groups
- JOIN combines data from multiple tables
- GROUP BY aggregates data
- Subqueries and CTEs for complex queries
- Window functions for advanced analytics
- Always use WHERE with UPDATE/DELETE
- Use appropriate JOIN types

---

[← Back to Backend](../README.md) | [Next: Database Design →](./02-database-design.md)
