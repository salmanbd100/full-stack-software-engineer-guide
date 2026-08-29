---
title: SQL Injection Prevention
part: 5
chapter: 0
slug: sql-injection
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-28
tags: [backend, security, sql, injection]
in_book: true
---

# SQL Injection Prevention {#ch-sql-injection-prevention}

> Parameterise everything, and handle the two cases where you cannot.

**In this chapter:** how the attack works · the kinds of injection · parameterised queries · ORMs and query builders · identifiers and `ORDER BY` · least privilege

## 💡 The Core Idea

SQL injection happens when user input stops being **data** and becomes part of the **command**.

It has been in the OWASP Top 10 for over twenty years, and it's still found in production systems — because the vulnerable version of the code is the one that's easier to type.

> **The fix is not "escape the input." The fix is to never build a query by concatenating strings.** Parameterized queries send the SQL and the data over separate channels, so the data can never change the query's meaning.

## How the Attack Works

```typescript
// 🔴 Vulnerable
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
```

The developer pictures this:

```sql
SELECT * FROM users WHERE email = 'a@b.com' AND password = 'hunter2'
```

An attacker submits `admin@site.com' --` as the email, and the database receives:

```sql
SELECT * FROM users WHERE email = 'admin@site.com' --' AND password = '...'
                                                   ^^ everything after is a comment
```

The password check is gone. They're logged in as admin.

**Other classic payloads:**

| Input                       | Resulting effect                        |
| --------------------------- | --------------------------------------- |
| `' OR '1'='1`               | Condition always true — returns all rows |
| `'; DROP TABLE users; --`   | Stacked query (if the driver allows it) |
| `' UNION SELECT ... --`     | Appends attacker-chosen data to results |

> **The root cause is a channel problem.** The query text and the user's data travel together in one string, so the parser can't tell them apart. Everything below is about separating those channels.

## Types of SQL Injection

| Type              | How the attacker learns the answer            | Speed          |
| ----------------- | --------------------------------------------- | -------------- |
| **In-band (UNION)** | Data comes back in the normal response        | Fast           |
| **Error-based**   | Database error messages leak table/column names | Fast         |
| **Blind (boolean)** | Page changes subtly for true vs false         | Slow           |
| **Blind (time)**  | `SLEEP(5)` makes the response take 5 seconds   | Very slow      |
| **Out-of-band**   | Database makes a DNS/HTTP call to the attacker | Bypasses filters |

Blind injection matters for interviews because it defeats the naive "we don't show errors, so we're fine" argument. An attacker only needs **one bit** of feedback per request to extract an entire database, given time.

```sql
-- Time-based blind: if the first character of the admin's hash is 'a', wait 5 seconds
' AND IF(SUBSTRING((SELECT password FROM users WHERE id=1),1,1)='a', SLEEP(5), 0) --
```

## Fix 1: Parameterized Queries

The query text is sent to the database first and **planned**. The values arrive separately and are bound into the plan. There is no point at which the value can be parsed as SQL.

**PostgreSQL (`pg`):**

```typescript
import { Pool } from "pg";

const pool = new Pool();

export async function findUserByEmail(email: string) {
  // $1 is a placeholder — the value never touches the SQL string.
  const result = await pool.query("SELECT id, email, role FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0];
}
```

**MySQL (`mysql2`):**

```typescript
import mysql from "mysql2/promise";

const pool = mysql.createPool({ host: "localhost", database: "app" });

export async function findUserByEmail(email: string) {
  const [rows] = await pool.execute("SELECT id, email, role FROM users WHERE email = ?", [
    email,
  ]);
  return rows;
}
```

> ⚠️ **In `mysql2`, use `execute()`, not `query()`.** `execute()` uses real prepared statements; `query()` with placeholders only escapes client-side. Both are far better than concatenation, but `execute()` is the stronger guarantee.

**What the attacker's input becomes:**

```text
Input:  admin@site.com' --
Bound:  the literal string "admin@site.com' --"
Result: zero rows. Nothing is executed.
```

### The pattern that trips people up

```typescript
// ❌ Still vulnerable — the library can't help you here
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);

// ❌ Also vulnerable — placeholders exist, but the input is still interpolated
await pool.query(`SELECT * FROM users WHERE email = '${email}' AND active = $1`, [true]);

// ✅ Every user value is a parameter
await pool.query("SELECT * FROM users WHERE email = $1 AND active = $2", [email, true]);
```

### Dynamic `IN` clauses and optional filters

```typescript
// ✅ Generate the right number of placeholders — never join the values
export async function findUsersByIds(ids: number[]) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return pool.query(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
}

// ✅ Build conditions and params together
export async function searchUsers(filters: { role?: string; minAge?: number }) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.role) {
    params.push(filters.role);
    conditions.push(`role = $${params.length}`);
  }
  if (filters.minAge !== undefined) {
    params.push(filters.minAge);
    conditions.push(`age >= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return pool.query(`SELECT * FROM users ${where}`, params);
}
```

The SQL structure is written by you; only the values come from the user. That's the invariant to protect.

## Fix 2: ORMs and Query Builders

ORMs parameterize by default. That's most of their security value — but it isn't automatic immunity.

```typescript
// ✅ Prisma — parameterized, typed
const user = await prisma.user.findUnique({ where: { email } });

// ✅ Prisma raw with a tagged template — values are still parameterized
const users = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// 🔴 Prisma raw with a built string — the escape hatch that reintroduces the bug
const users = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

```typescript
// ✅ TypeORM query builder
const user = await repo
  .createQueryBuilder("user")
  .where("user.email = :email", { email }) // named parameter
  .getOne();

// 🔴 The same builder, misused
.where(`user.email = '${email}'`);
```

> **Interview point:** "An ORM prevents SQL injection as long as you stay on the paved path. Every ORM has a raw escape hatch, and that's where injection bugs live. Grepping for `queryRawUnsafe`, `$queryRawUnsafe`, and string-concatenated `where` clauses is a fast audit."

## The Cases You Cannot Parameterize

Placeholders work for **values** only. They cannot stand in for table names, column names, `ORDER BY` direction, or `LIMIT` in some drivers.

```typescript
// ❌ This does not work — and interpolating is injection
await pool.query("SELECT * FROM users ORDER BY $1", [sortColumn]);
```

**The only safe approach is an allowlist:**

```typescript
const SORT_COLUMNS = ["created_at", "name", "email"] as const;
const SORT_DIRECTIONS = ["ASC", "DESC"] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];
type SortDirection = (typeof SORT_DIRECTIONS)[number];

export async function listUsers(rawColumn: string, rawDirection: string, limit: number) {
  // Map input to a known-safe constant — don't clean it, match it.
  const column: SortColumn = SORT_COLUMNS.includes(rawColumn as SortColumn)
    ? (rawColumn as SortColumn)
    : "created_at";

  const direction: SortDirection = rawDirection.toUpperCase() === "DESC" ? "DESC" : "ASC";

  // column/direction come from our own constants; limit is still a parameter.
  return pool.query(`SELECT * FROM users ORDER BY ${column} ${direction} LIMIT $1`, [
    Math.min(limit, 100),
  ]);
}
```

> ✅ The value interpolated into the SQL is one of **your** strings, chosen by comparing against user input — not the user's string.

## Defense in Depth

Parameterization is the fix. These reduce the damage if something slips through.

**1. Least-privilege database users**

```sql
-- The app account can read and write rows. It cannot change schema.
GRANT SELECT, INSERT, UPDATE, DELETE ON app.* TO 'app_user'@'%';
-- No DROP, no CREATE, no FILE, no superuser.
```

An injection in a read-only reporting service should never be able to write.

**2. Disable multi-statement execution**

```typescript
// mysql2 — off by default; keep it that way.
mysql.createPool({ multipleStatements: false });
```

This alone kills `'; DROP TABLE users; --`.

**3. Generic error responses**

```typescript
// ❌ Leaks table names, column names, and dialect to the attacker
res.status(500).json({ error: err.message });

// ✅ Log the detail, return nothing useful
logger.error({ err }, "query failed");
res.status(500).json({ error: "Internal server error" });
```

**4. Validate input shape.** A user ID should be an integer. Rejecting `1 OR 1=1` at the schema layer means it never reaches the database — see [06-validation.md](./06-validation.md).

**5. A WAF is a speed bump, not a fix.** It buys time against automated scanners; it does not make vulnerable code safe.

## NoSQL Injection

Same root cause, different syntax. In MongoDB the danger is passing a user-supplied **object** where a string is expected.

```typescript
// 🔴 Vulnerable: body { "email": "a@b.com", "password": { "$ne": null } }
const user = await db.collection("users").findOne({
  email: req.body.email,
  password: req.body.password, // becomes { $ne: null } → matches any password
});
```

**Fixes:**

```typescript
// ✅ 1. Validate types — a schema guarantees strings, not operator objects
const { email, password } = z
  .object({ email: z.email(), password: z.string() })
  .parse(req.body);

// ✅ 2. Never compare passwords in the query — fetch, then verify the hash
const user = await db.collection("users").findOne({ email });
const ok = user ? await verifyPassword(user.passwordHash, password) : false;
```

> ⚠️ Also avoid `$where` and `mapReduce` with user input — those evaluate JavaScript on the server.

## 🔑 Key Takeaways

- Parameterised queries are the fix, and they work because the query plan is fixed before the value ever arrives.
- String escaping is not a defence: encodings, numeric contexts and second-order injection all get past it.
- Identifiers — table names, column names, sort direction — cannot be parameterised, so they need an allowlist.
- An ORM removes the common case, not the risk: raw fragments, `$queryRaw` and dynamic `where` builders are still yours to get right.
- NoSQL injection is the same bug with a different syntax — reject object-typed values where a string is expected.

## Interview Questions

**Q1: What is SQL injection?**

An attack where untrusted input is concatenated into a SQL statement, so the database parses part of that input as SQL instead of data. It can bypass authentication, dump or modify data, and in some configurations run OS commands.

**Q2: How do parameterized queries actually prevent it?**

The SQL text is sent and parsed first, producing a query plan with placeholders. Values are then bound into that plan as data. Because parsing already happened, no value can introduce new syntax — quotes and comment markers are just characters in a string.

**Q3: Isn't escaping enough?**

No. Escaping depends on getting the rules right for the exact database, character set, and context, and it fails for numeric contexts, identifiers, and multibyte encoding tricks. Parameterization removes the whole class of bug instead of trying to filter it.

**Q4: Does an ORM make you safe?**

Mostly, because it parameterizes by default. But every ORM has a raw-query escape hatch, and misused query builders can still concatenate. ORMs also don't help with identifiers like sort columns. Treat the ORM as a good default, not a guarantee.

**Q5: How do you handle a user-supplied `ORDER BY` column?**

You can't parameterize identifiers. I match the input against a hard-coded allowlist of column names and use my own constant in the query, falling back to a default if there's no match. The direction is normalized to exactly `ASC` or `DESC`.

**Q6: What is blind SQL injection?**

Injection where the response contains no data or errors, so the attacker infers information one bit at a time — through a changed page for true/false conditions, or through response delay using something like `SLEEP()`. It's slow but fully automatable, which is why hiding error messages isn't a fix.

**Q7: Beyond parameterization, how do you limit the damage?**

Least-privilege database accounts, multi-statement execution disabled, generic error responses, input validation at the edge, and monitoring for unusual query patterns. Then code review and static analysis focused on raw-query escape hatches.

## What to Read Next

- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — the boundary that stops most of this earlier
- [Chapter ?? — Authorisation](#ch-authorisation) — the other way a valid query returns the wrong rows
- [Chapter ?? — SQL Indexes](#ch-sql-indexes) — why the parameterised plan is also the faster one
