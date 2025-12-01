# Database Design

## Overview

Database design is the process of organizing data according to a database model. Good database design is crucial for performance, data integrity, and maintainability. This is a core topic in backend interviews.

## Normalization

### What is Normalization?

Normalization is organizing data to minimize redundancy and dependency. It involves dividing large tables into smaller tables and defining relationships.

### First Normal Form (1NF)

**Rules:**
- Each column contains atomic (indivisible) values
- Each column contains values of single type
- Each column has unique name
- Order doesn't matter

```sql
-- ❌ Not in 1NF (phone numbers in single column)
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  phones VARCHAR(255)  -- '555-1234, 555-5678'
);

-- ✅ 1NF (atomic values)
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE user_phones (
  id INT PRIMARY KEY,
  user_id INT,
  phone VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Second Normal Form (2NF)

**Rules:**
- Must be in 1NF
- All non-key attributes fully dependent on primary key
- No partial dependencies

```sql
-- ❌ Not in 2NF (course_name depends only on course_id)
CREATE TABLE enrollments (
  student_id INT,
  course_id INT,
  course_name VARCHAR(100),
  enrollment_date DATE,
  PRIMARY KEY (student_id, course_id)
);

-- ✅ 2NF (separate tables)
CREATE TABLE courses (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE enrollments (
  student_id INT,
  course_id INT,
  enrollment_date DATE,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

### Third Normal Form (3NF)

**Rules:**
- Must be in 2NF
- No transitive dependencies
- Non-key attributes depend only on primary key

```sql
-- ❌ Not in 3NF (city depends on zip_code, not on id)
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  zip_code VARCHAR(10),
  city VARCHAR(100)
);

-- ✅ 3NF (remove transitive dependency)
CREATE TABLE zip_codes (
  zip_code VARCHAR(10) PRIMARY KEY,
  city VARCHAR(100)
);

CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  zip_code VARCHAR(10),
  FOREIGN KEY (zip_code) REFERENCES zip_codes(zip_code)
);
```

## Entity Relationships

### One-to-One (1:1)

```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255)
);

CREATE TABLE user_profiles (
  id INT PRIMARY KEY,
  user_id INT UNIQUE,
  bio TEXT,
  avatar VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### One-to-Many (1:N)

```sql
CREATE TABLE authors (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE books (
  id INT PRIMARY KEY,
  title VARCHAR(200),
  author_id INT,
  FOREIGN KEY (author_id) REFERENCES authors(id)
);
```

### Many-to-Many (M:N)

```sql
CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE courses (
  id INT PRIMARY KEY,
  title VARCHAR(100)
);

-- Junction/Bridge table
CREATE TABLE enrollments (
  student_id INT,
  course_id INT,
  enrollment_date DATE,
  grade VARCHAR(2),
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

## Data Types

### Numeric Types

```sql
-- Integers
TINYINT     -- 1 byte: -128 to 127
SMALLINT    -- 2 bytes: -32,768 to 32,767
MEDIUMINT   -- 3 bytes: -8,388,608 to 8,388,607
INT         -- 4 bytes: -2 billion to 2 billion
BIGINT      -- 8 bytes: very large numbers

-- Decimals
DECIMAL(10,2)  -- Fixed precision: 10 digits, 2 after decimal
NUMERIC(10,2)  -- Same as DECIMAL
FLOAT          -- Approximate, 4 bytes
DOUBLE         -- Approximate, 8 bytes
```

### String Types

```sql
CHAR(10)        -- Fixed length, padded
VARCHAR(100)    -- Variable length, up to specified max
TEXT            -- Large text, up to 65,535 characters
MEDIUMTEXT      -- Up to 16 MB
LONGTEXT        -- Up to 4 GB
```

### Date/Time Types

```sql
DATE            -- YYYY-MM-DD
TIME            -- HH:MM:SS
DATETIME        -- YYYY-MM-DD HH:MM:SS
TIMESTAMP       -- Auto-updates, timezone aware
YEAR            -- YYYY
```

### Other Types

```sql
BOOLEAN         -- TRUE/FALSE (usually TINYINT(1))
ENUM('S','M','L')  -- Predefined values
JSON            -- JSON data (MySQL 5.7+, PostgreSQL)
UUID            -- Universally unique identifier
```

## Constraints

```sql
CREATE TABLE users (
  -- PRIMARY KEY
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- UNIQUE
  email VARCHAR(100) UNIQUE,

  -- NOT NULL
  name VARCHAR(100) NOT NULL,

  -- DEFAULT
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',

  -- CHECK
  age INT CHECK (age >= 18),

  -- FOREIGN KEY
  role_id INT,
  FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

## Schema Design Examples

### E-commerce Database

```sql
-- Users
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Categories
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  parent_id INT,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Orders
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending','paid','shipped','delivered') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order Items
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Blog Database

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_id INT NOT NULL,
  status ENUM('draft','published') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id INT,
  tag_id INT,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  parent_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

## Interview Questions

### Q1: What is normalization and why is it important?

**Answer:**
Normalization is organizing data to reduce redundancy and improve data integrity. It prevents:
- Update anomalies
- Insertion anomalies
- Deletion anomalies
- Data inconsistency

### Q2: Explain the difference between 1NF, 2NF, and 3NF

**Answer:**
- **1NF**: Atomic values, no repeating groups
- **2NF**: 1NF + no partial dependencies
- **3NF**: 2NF + no transitive dependencies

### Q3: When would you denormalize a database?

**Answer:**
Denormalize for performance when:
- Read-heavy workloads
- Complex joins are slow
- Data doesn't change often
- Acceptable to have redundancy

Trade-off: Performance vs. Data integrity

### Q4: What is the difference between CHAR and VARCHAR?

**Answer:**
- **CHAR**: Fixed length, padded with spaces, faster for fixed-size data
- **VARCHAR**: Variable length, uses only needed space, better for varying lengths

### Q5: What are the types of relationships in databases?

**Answer:**
- **One-to-One**: User → Profile
- **One-to-Many**: Author → Books
- **Many-to-Many**: Students ↔ Courses (needs junction table)

## Best Practices

### ✅ Do's

1. **Use appropriate data types**
2. **Add constraints** for data integrity
3. **Use foreign keys** to enforce relationships
4. **Normalize to 3NF** as starting point
5. **Use meaningful table/column names**
6. **Add indexes** on foreign keys
7. **Use AUTO_INCREMENT** for primary keys

### ❌ Don'ts

1. **Don't store calculated values**
2. **Don't use generic names** (data, info, etc.)
3. **Don't over-normalize** (balance with performance)
4. **Don't forget constraints**
5. **Don't use reserved keywords** as names

## Summary

- Normalization reduces redundancy (1NF, 2NF, 3NF)
- Use appropriate data types for efficiency
- Define clear relationships (1:1, 1:N, M:N)
- Apply constraints for data integrity
- Design for current needs, plan for future
- Balance normalization with performance

---

[← Previous: SQL Fundamentals](./01-fundamentals.md) | [Next: Indexes & Optimization →](./03-indexes.md)
