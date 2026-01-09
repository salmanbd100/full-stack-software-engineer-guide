# SQL Database Design

## Table of Contents
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Normalization](#normalization)
- [Schema Design Patterns](#schema-design-patterns)
- [Relationships](#relationships)
- [Constraints and Integrity](#constraints-and-integrity)
- [Common Design Patterns](#common-design-patterns)
- [Implementation Examples](#implementation-examples)
- [Interview Questions](#interview-questions)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

---

## Overview

### 💡 **SQL Database Design**

Structured approach to organizing data in relational databases to ensure data integrity, optimize performance, and support business requirements.

**Why It Matters:**

Proper database design is critical for:
- Data integrity and consistency
- Query performance and scalability
- Maintenance and evolution
- Storage efficiency
- Developer productivity

---

## Core Concepts

### 💡 **Relational Model**

Data organized into tables (relations) with rows (tuples) and columns (attributes).

**Key Characteristics:**

1. **Tables (Relations):**
   - Each table represents an entity type
   - Rows are individual entity instances
   - Columns are attributes of the entity

2. **Primary Keys:**
   - Uniquely identify each row
   - Cannot be NULL
   - Immutable once assigned

3. **Foreign Keys:**
   - Reference primary keys in other tables
   - Enforce referential integrity
   - Enable relationships between tables

**Basic Structure:**

```
Table: Users
┌─────────┬──────────┬───────────────┬────────────┐
│ user_id │ username │ email         │ created_at │
├─────────┼──────────┼───────────────┼────────────┤
│ 1       │ john_doe │ john@mail.com │ 2024-01-01 │
│ 2       │ jane_doe │ jane@mail.com │ 2024-01-02 │
└─────────┴──────────┴───────────────┴────────────┘
         ↑
    Primary Key
```

---

## Normalization

### 💡 **Database Normalization**

Process of organizing data to minimize redundancy and dependency.

### Normal Forms

#### **1NF (First Normal Form)**

**Rules:**
- Each column contains atomic (indivisible) values
- Each column contains values of a single type
- Each column has a unique name
- Order of data doesn't matter

**❌ Before (Violates 1NF):**

```sql
-- Multiple values in single column
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_name VARCHAR(100),
    products VARCHAR(500)  -- "laptop,mouse,keyboard"
);
```

**Problems:**
- Cannot query for specific products easily
- Difficult to maintain data integrity
- Update anomalies

**✅ After (1NF Compliant):**

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_name VARCHAR(100)
);

CREATE TABLE order_items (
    order_id INT,
    product_name VARCHAR(100),
    PRIMARY KEY (order_id, product_name),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

#### **2NF (Second Normal Form)**

**Rules:**
- Must be in 1NF
- All non-key attributes fully depend on the primary key
- No partial dependencies

**❌ Before (Violates 2NF):**

```sql
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    product_name VARCHAR(100),      -- Depends only on product_id
    product_category VARCHAR(50),   -- Depends only on product_id
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);
```

**Problems:**
- Product info duplicated across orders
- Update anomalies (change product name in multiple places)

**✅ After (2NF Compliant):**

```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    product_category VARCHAR(50)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

#### **3NF (Third Normal Form)**

**Rules:**
- Must be in 2NF
- No transitive dependencies
- Non-key attributes depend only on the primary key

**❌ Before (Violates 3NF):**

```sql
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    employee_name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100),   -- Depends on department_id, not employee_id
    department_location VARCHAR(100) -- Depends on department_id, not employee_id
);
```

**✅ After (3NF Compliant):**

```sql
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(100),
    department_location VARCHAR(100)
);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    employee_name VARCHAR(100),
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```

### Normalization Tradeoffs

| Aspect | Normalized | Denormalized |
|--------|-----------|--------------|
| **Data Redundancy** | Minimal | Higher |
| **Storage** | Efficient | More space |
| **Update Performance** | Faster | Slower (multiple updates) |
| **Read Performance** | Slower (joins) | Faster (no joins) |
| **Data Integrity** | Strong | Weaker |
| **Complexity** | Higher | Lower |

**When to Denormalize:**
- ✅ Read-heavy workloads
- ✅ Report generation
- ✅ Caching layers
- ✅ Data warehousing
- ❌ Systems with frequent updates
- ❌ Strong consistency requirements

---

## Schema Design Patterns

### 💡 **Common Table Patterns**

#### **1. Entity Table**

Basic table representing a core business entity.

```sql
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Index for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### **2. Lookup Table (Reference Data)**

Small tables with relatively static data.

```sql
CREATE TABLE countries (
    country_code CHAR(2) PRIMARY KEY,  -- ISO code
    country_name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    population BIGINT
);

CREATE TABLE order_status (
    status_id SMALLINT PRIMARY KEY,
    status_name VARCHAR(20) UNIQUE NOT NULL,  -- 'pending', 'shipped', etc.
    description TEXT
);
```

#### **3. Junction Table (Many-to-Many)**

Links two entities in a many-to-many relationship.

```sql
-- Students can enroll in many courses
-- Courses can have many students
CREATE TABLE student_courses (
    student_id BIGINT,
    course_id BIGINT,
    enrollment_date DATE NOT NULL,
    grade DECIMAL(3,2),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX idx_student_courses_student ON student_courses(student_id);
CREATE INDEX idx_student_courses_course ON student_courses(course_id);
```

#### **4. Audit/History Table**

Track changes over time.

```sql
CREATE TABLE price_history (
    history_id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    changed_by BIGINT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_dates ON price_history(effective_from, effective_to);
```

#### **5. Soft Delete Pattern**

Mark records as deleted without removing them.

```sql
CREATE TABLE posts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,  -- NULL means not deleted
    deleted_by BIGINT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Index for active posts only
CREATE INDEX idx_posts_active ON posts(user_id) WHERE deleted_at IS NULL;

-- Query active posts
SELECT * FROM posts WHERE deleted_at IS NULL;
```

---

## Relationships

### 💡 **Types of Relationships**

#### **One-to-One (1:1)**

Each record in Table A relates to exactly one record in Table B.

**Use Cases:**
- Split large tables for performance
- Separate sensitive data
- Optional extended information

```sql
-- Core user info
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Extended profile (optional)
CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY,  -- Same as PK and FK
    bio TEXT,
    avatar_url VARCHAR(500),
    date_of_birth DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

#### **One-to-Many (1:N)**

Each record in Table A can relate to multiple records in Table B.

**Most Common Relationship Type**

```sql
-- One user, many posts
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE posts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,  -- Foreign key
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user ON posts(user_id);
```

#### **Many-to-Many (M:N)**

Records in Table A can relate to multiple records in Table B and vice versa.

**Requires Junction Table**

```sql
CREATE TABLE students (
    student_id BIGSERIAL PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
    course_id BIGSERIAL PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL
);

-- Junction table with additional attributes
CREATE TABLE enrollments (
    student_id BIGINT,
    course_id BIGINT,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    grade CHAR(2),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);
```

#### **Self-Referencing (Hierarchical)**

Table references itself for hierarchical data.

```sql
-- Employee hierarchy (manager-subordinate)
CREATE TABLE employees (
    employee_id BIGSERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    manager_id BIGINT,  -- References same table
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

-- Category hierarchy
CREATE TABLE categories (
    category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id BIGINT,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
);

CREATE INDEX idx_categories_parent ON categories(parent_category_id);
```

---

## Constraints and Integrity

### 💡 **Data Integrity Rules**

#### **Primary Key Constraint**

```sql
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,  -- Auto-incrementing
    -- OR
    product_code VARCHAR(20) PRIMARY KEY  -- Natural key
);

-- Composite primary key
CREATE TABLE order_items (
    order_id BIGINT,
    line_number INT,
    PRIMARY KEY (order_id, line_number)
);
```

#### **Foreign Key Constraint**

```sql
CREATE TABLE orders (
    order_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE     -- Delete orders when user is deleted
        ON UPDATE CASCADE     -- Update order.user_id if user.user_id changes
);

-- Common ON DELETE options:
-- CASCADE: Delete child records
-- SET NULL: Set FK to NULL
-- SET DEFAULT: Set FK to default value
-- RESTRICT: Prevent deletion (default)
-- NO ACTION: Same as RESTRICT
```

#### **Unique Constraint**

```sql
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,  -- Column constraint
    username VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    UNIQUE (username),  -- Table constraint
    UNIQUE (phone) WHERE phone IS NOT NULL  -- Partial unique
);
```

#### **Check Constraint**

```sql
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) CHECK (price > 0),  -- Price must be positive
    stock_quantity INT CHECK (stock_quantity >= 0),
    discount_percent DECIMAL(5,2) CHECK (discount_percent BETWEEN 0 AND 100)
);

CREATE TABLE employees (
    employee_id BIGSERIAL PRIMARY KEY,
    birth_date DATE,
    hire_date DATE,
    CHECK (hire_date > birth_date)  -- Must be hired after birth
);
```

#### **NOT NULL Constraint**

```sql
CREATE TABLE orders (
    order_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,  -- Required
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    shipping_address TEXT,  -- Optional
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0)
);
```

#### **Default Values**

```sql
CREATE TABLE posts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    view_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Common Design Patterns

### 💡 **E-commerce Schema Pattern**

```sql
-- Users
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    order_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Order Items (Junction + Details)
CREATE TABLE order_items (
    order_id BIGINT,
    product_id BIGINT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Addresses
CREATE TABLE addresses (
    address_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    address_type VARCHAR(20), -- 'shipping', 'billing'
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 💡 **Social Media Schema Pattern**

```sql
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Followers (Many-to-Many self-referencing)
CREATE TABLE follows (
    follower_id BIGINT,  -- User who is following
    followee_id BIGINT,  -- User being followed
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id),
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (followee_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (follower_id != followee_id)  -- Can't follow yourself
);

CREATE TABLE likes (
    user_id BIGINT,
    post_id BIGINT,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

CREATE TABLE comments (
    comment_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT,  -- For nested comments
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followee ON follows(followee_id);
```

---

## Implementation Examples

### JavaScript (Node.js + PostgreSQL)

```javascript
const { Pool } = require('pg');

// Connection pool
const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'postgres',
  password: 'password',
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000
});

// Create user
async function createUser(username, email, passwordHash) {
  const query = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING user_id, username, email, created_at
  `;

  try {
    const result = await pool.query(query, [username, email, passwordHash]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {  // Unique violation
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

// Get user with posts
async function getUserWithPosts(userId) {
  const query = `
    SELECT
      u.user_id,
      u.username,
      u.email,
      json_agg(
        json_build_object(
          'post_id', p.post_id,
          'title', p.title,
          'created_at', p.created_at
        ) ORDER BY p.created_at DESC
      ) FILTER (WHERE p.post_id IS NOT NULL) as posts
    FROM users u
    LEFT JOIN posts p ON u.user_id = p.user_id
    WHERE u.user_id = $1
    GROUP BY u.user_id
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0];
}

// Transaction example
async function transferFunds(fromUserId, toUserId, amount) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Deduct from sender
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [amount, fromUserId]
    );

    // Add to receiver
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, toUserId]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions (from_user_id, to_user_id, amount)
       VALUES ($1, $2, $3)`,
      [fromUserId, toUserId, amount]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Python (with psycopg2)

```python
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

# Connection pool
from psycopg2 import pool
connection_pool = pool.SimpleConnectionPool(
    1, 20,
    host='localhost',
    database='myapp',
    user='postgres',
    password='password'
)

@contextmanager
def get_db_connection():
    conn = connection_pool.getconn()
    try:
        yield conn
    finally:
        connection_pool.putconn(conn)

# Create user
def create_user(username, email, password_hash):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute("""
                    INSERT INTO users (username, email, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING user_id, username, email, created_at
                """, (username, email, password_hash))

                conn.commit()
                return cur.fetchone()
            except psycopg2.IntegrityError:
                conn.rollback()
                raise ValueError("Username or email already exists")

# Get user with posts
def get_user_with_posts(user_id):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    u.user_id,
                    u.username,
                    json_agg(
                        json_build_object(
                            'post_id', p.post_id,
                            'title', p.title,
                            'created_at', p.created_at
                        ) ORDER BY p.created_at DESC
                    ) FILTER (WHERE p.post_id IS NOT NULL) as posts
                FROM users u
                LEFT JOIN posts p ON u.user_id = p.user_id
                WHERE u.user_id = %s
                GROUP BY u.user_id
            """, (user_id,))

            return cur.fetchone()

# Transaction example
def transfer_funds(from_user_id, to_user_id, amount):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            try:
                # Deduct from sender
                cur.execute(
                    "UPDATE accounts SET balance = balance - %s WHERE user_id = %s",
                    (amount, from_user_id)
                )

                # Add to receiver
                cur.execute(
                    "UPDATE accounts SET balance = balance + %s WHERE user_id = %s",
                    (amount, to_user_id)
                )

                # Record transaction
                cur.execute(
                    """INSERT INTO transactions (from_user_id, to_user_id, amount)
                       VALUES (%s, %s, %s)""",
                    (from_user_id, to_user_id, amount)
                )

                conn.commit()
            except Exception as e:
                conn.rollback()
                raise
```

---

## Interview Questions

### Q1: How do you design a database schema for a blogging platform?

**Answer:**

**Requirements Analysis:**
- Users can write posts
- Posts have categories and tags
- Users can comment on posts
- Users can follow other users

**Schema Design:**

```sql
-- Core entities
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- URL-friendly
    content TEXT NOT NULL,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL
);

-- Post categories (one-to-many)
ALTER TABLE posts ADD COLUMN category_id INT REFERENCES categories(category_id);

-- Tags (many-to-many)
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
    post_id BIGINT,
    tag_id INT,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- Comments (hierarchical)
CREATE TABLE comments (
    comment_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id)
);

-- Follows (many-to-many)
CREATE TABLE follows (
    follower_id BIGINT,
    following_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
```

**Key Decisions:**
- Slug field for SEO-friendly URLs
- Separate categories (one) and tags (many)
- Hierarchical comments with parent_comment_id
- Published_at allows draft posts (NULL)

### Q2: What's the difference between natural and surrogate keys?

**Answer:**

| Aspect | Natural Key | Surrogate Key |
|--------|------------|---------------|
| **Definition** | Business-meaningful data | System-generated identifier |
| **Example** | Email, SSN, ISBN | Auto-increment ID, UUID |
| **Uniqueness** | Naturally unique | Enforced by system |
| **Stability** | Can change | Immutable |
| **Visibility** | User-facing | Internal only |
| **Performance** | Variable | Optimized (integers) |

**Natural Key Example:**

```sql
CREATE TABLE countries (
    country_code CHAR(2) PRIMARY KEY,  -- ISO code: 'US', 'UK'
    country_name VARCHAR(100) NOT NULL
);
```

**Pros:**
- Self-documenting
- No need for joins to display
- Meaningful to users

**Cons:**
- May need to change (company changes email domain)
- May be composite (first_name + last_name + dob)
- May be large (email strings)

**Surrogate Key Example:**

```sql
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,  -- Surrogate key
    email VARCHAR(255) UNIQUE NOT NULL,  -- Natural key as unique constraint
    username VARCHAR(50) UNIQUE NOT NULL
);
```

**Pros:**
- Never changes
- Small and efficient (8 bytes for BIGINT)
- Simple foreign key references
- No business logic in keys

**Cons:**
- Not meaningful to users
- Additional column overhead
- Need unique constraints on natural keys anyway

**Best Practice:**

Use surrogate keys as PRIMARY KEY, add UNIQUE constraints on natural keys:

```sql
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,           -- Surrogate (internal)
    sku VARCHAR(50) UNIQUE NOT NULL,            -- Natural (business)
    upc VARCHAR(12) UNIQUE,                     -- Natural (optional)
    name VARCHAR(255) NOT NULL
);
```

### Q3: How do you handle many-to-many relationships with additional attributes?

**Answer:**

Add extra columns to the junction table.

**Scenario:** Students enroll in courses with grade and enrollment date.

**❌ Wrong Approach:**

```sql
-- Can't add attributes to pure junction table
CREATE TABLE student_courses (
    student_id BIGINT,
    course_id BIGINT,
    PRIMARY KEY (student_id, course_id)
);
-- Where do we put grade and enrollment_date?
```

**✅ Correct Approach:**

```sql
-- Junction table becomes a full entity
CREATE TABLE enrollments (
    enrollment_id BIGSERIAL PRIMARY KEY,  -- Optional: add surrogate key
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    grade CHAR(2),
    credits_earned DECIMAL(3,1),
    UNIQUE (student_id, course_id),  -- Maintain uniqueness
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);
```

**Benefits:**
- Can add unlimited attributes
- Can reference enrollments from other tables
- Maintains referential integrity
- Easy to query enrollment history

**Query Examples:**

```sql
-- Get all courses for a student with grades
SELECT
    c.course_name,
    e.grade,
    e.enrolled_at,
    e.completed_at
FROM enrollments e
JOIN courses c ON e.course_id = c.course_id
WHERE e.student_id = 123
ORDER BY e.enrolled_at DESC;

-- Get average grade for a course
SELECT
    c.course_name,
    AVG(CASE
        WHEN e.grade = 'A' THEN 4.0
        WHEN e.grade = 'B' THEN 3.0
        WHEN e.grade = 'C' THEN 2.0
        ELSE 0.0
    END) as avg_gpa
FROM enrollments e
JOIN courses c ON e.course_id = c.course_id
WHERE e.completed_at IS NOT NULL
GROUP BY c.course_id, c.course_name;
```

---

## Best Practices

### Schema Design

**✅ DO:**

1. **Use appropriate data types:**
   ```sql
   -- Use smallest type that fits data
   user_id BIGSERIAL        -- Large auto-increment
   age SMALLINT             -- 0-150
   price DECIMAL(10,2)      -- Exact for money
   is_active BOOLEAN        -- Not TINYINT or CHAR(1)
   created_at TIMESTAMP     -- Not VARCHAR
   ```

2. **Always have a primary key:**
   ```sql
   CREATE TABLE sessions (
       session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       -- Even temporary tables need PKs
   );
   ```

3. **Use meaningful names:**
   ```sql
   -- Clear and consistent
   user_id, username, created_at, is_active

   -- Not: uid, uname, cr_dt, act
   ```

4. **Index foreign keys:**
   ```sql
   CREATE TABLE posts (
       post_id BIGSERIAL PRIMARY KEY,
       user_id BIGINT NOT NULL REFERENCES users(user_id)
   );

   CREATE INDEX idx_posts_user_id ON posts(user_id);
   ```

5. **Use constraints to enforce business rules:**
   ```sql
   CREATE TABLE orders (
       order_id BIGSERIAL PRIMARY KEY,
       total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
       status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered')),
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       shipped_at TIMESTAMP,
       CHECK (shipped_at IS NULL OR shipped_at > created_at)
   );
   ```

**❌ DON'T:**

1. **Don't use generic column names:**
   ```sql
   -- Bad
   CREATE TABLE products (
       id INT,        -- id of what?
       name VARCHAR,  -- product_name is clearer
       value DECIMAL  -- price? cost? value?
   );
   ```

2. **Don't store computed values (usually):**
   ```sql
   -- Bad: total_amount is sum of order_items
   CREATE TABLE orders (
       order_id BIGSERIAL PRIMARY KEY,
       total_amount DECIMAL(10,2)  -- Can become out of sync
   );

   -- Good: Calculate on query
   SELECT
       o.order_id,
       SUM(oi.quantity * oi.unit_price) as total_amount
   FROM orders o
   JOIN order_items oi ON o.order_id = oi.order_id
   GROUP BY o.order_id;

   -- Or use a view
   CREATE VIEW order_totals AS
   SELECT
       o.order_id,
       COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_amount
   FROM orders o
   LEFT JOIN order_items oi ON o.order_id = oi.order_id
   GROUP BY o.order_id;
   ```

3. **Don't use too many columns:**
   ```sql
   -- Bad: 50+ columns in one table
   CREATE TABLE users (
       user_id BIGINT PRIMARY KEY,
       -- 50 more columns...
   );

   -- Good: Split into related tables
   CREATE TABLE users (
       user_id BIGINT PRIMARY KEY,
       email VARCHAR(255),
       username VARCHAR(50)
   );

   CREATE TABLE user_profiles (
       user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
       bio TEXT,
       avatar_url VARCHAR(500)
   );
   ```

### Naming Conventions

**Table Names:**
- Plural nouns: `users`, `products`, `orders`
- Or singular: `user`, `product`, `order`
- Be consistent across your schema

**Column Names:**
- Snake_case: `user_id`, `created_at`, `is_active`
- Not camelCase: `userId`, `createdAt`

**Indexes:**
- `idx_tablename_columnname`: `idx_users_email`
- `idx_tablename_col1_col2`: `idx_posts_user_created`

**Foreign Keys:**
- `fk_tablename_ref`: `fk_posts_users`
- Or let database auto-generate

**Junction Tables:**
- `table1_table2`: `student_courses`, `post_tags`
- Or descriptive name: `enrollments`, `follows`

---

## Real-World Examples

### Uber/Lyft Ride-Sharing Schema

```sql
CREATE TABLE drivers (
    driver_id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    rating DECIMAL(3,2) CHECK (rating BETWEEN 0 AND 5),
    is_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE riders (
    rider_id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rating DECIMAL(3,2) CHECK (rating BETWEEN 0 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
    vehicle_id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL UNIQUE,  -- One vehicle per driver
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    color VARCHAR(30),
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);

CREATE TABLE rides (
    ride_id BIGSERIAL PRIMARY KEY,
    rider_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,
    pickup_location POINT NOT NULL,      -- PostGIS for location
    dropoff_location POINT NOT NULL,
    pickup_time TIMESTAMP NOT NULL,
    dropoff_time TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'requested',
    fare_amount DECIMAL(10,2),
    distance_km DECIMAL(10,2),
    duration_minutes INT,
    FOREIGN KEY (rider_id) REFERENCES riders(rider_id),
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled'))
);

CREATE TABLE ride_ratings (
    rating_id BIGSERIAL PRIMARY KEY,
    ride_id BIGINT NOT NULL UNIQUE,
    rider_rating SMALLINT CHECK (rider_rating BETWEEN 1 AND 5),
    driver_rating SMALLINT CHECK (driver_rating BETWEEN 1 AND 5),
    rider_comment TEXT,
    driver_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

CREATE INDEX idx_rides_rider ON rides(rider_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_pickup_time ON rides(pickup_time);
```

### Netflix-Style Streaming Service

```sql
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    profile_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    profile_name VARCHAR(50) NOT NULL,
    avatar_url VARCHAR(500),
    is_kids_profile BOOLEAN DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE content (
    content_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(20) NOT NULL,  -- 'movie', 'series'
    release_year INT,
    duration_minutes INT,
    rating VARCHAR(10),
    thumbnail_url VARCHAR(500),
    video_url VARCHAR(500),
    CHECK (content_type IN ('movie', 'series'))
);

CREATE TABLE series_episodes (
    episode_id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL,  -- References parent series
    season_number INT NOT NULL,
    episode_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    video_url VARCHAR(500),
    UNIQUE (content_id, season_number, episode_number),
    FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE
);

CREATE TABLE genres (
    genre_id SERIAL PRIMARY KEY,
    genre_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE content_genres (
    content_id BIGINT,
    genre_id INT,
    PRIMARY KEY (content_id, genre_id),
    FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE watch_history (
    history_id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    content_id BIGINT NOT NULL,
    episode_id BIGINT,  -- NULL for movies
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_seconds INT NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES series_episodes(episode_id) ON DELETE CASCADE
);

CREATE TABLE ratings (
    profile_id BIGINT,
    content_id BIGINT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, content_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE
);

CREATE INDEX idx_watch_history_profile ON watch_history(profile_id);
CREATE INDEX idx_watch_history_content ON watch_history(content_id);
```

---

## Summary

**Key Takeaways:**

1. **Normalization reduces redundancy** but may impact read performance
2. **Primary keys uniquely identify rows**, foreign keys create relationships
3. **Constraints enforce business rules** at the database level
4. **Indexes improve query performance** but slow down writes
5. **Choose appropriate data types** for storage efficiency
6. **Use transactions** for multi-step operations requiring atomicity

**When to Use SQL Databases:**

| Use Case | Why |
|----------|-----|
| **Structured data** | Well-defined schemas |
| **ACID requirements** | Financial transactions, orders |
| **Complex queries** | Joins, aggregations, analytics |
| **Relationships** | Many foreign keys and joins |
| **Data integrity** | Strong consistency needed |

**Design Process:**

```
1. Identify entities (nouns)
   ↓
2. Identify attributes (properties)
   ↓
3. Identify relationships (verbs)
   ↓
4. Define primary and foreign keys
   ↓
5. Apply normalization
   ↓
6. Add constraints
   ↓
7. Create indexes
   ↓
8. Denormalize where needed
```

**Interview Focus:**

- Normalization forms (1NF, 2NF, 3NF)
- Primary vs foreign keys
- Types of relationships (1:1, 1:N, M:N)
- Index strategies
- Transaction management
- Schema design for specific scenarios

---

**Further Reading:**
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [SQL Style Guide](https://www.sqlstyle.guide/)

---
[← Back to Database Topics](./README.md) | [Next: NoSQL Design →](./02-nosql-design.md)
