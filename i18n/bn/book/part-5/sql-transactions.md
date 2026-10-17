---
sourceHash: "188ab8440eb778caa8074c4d7ca5f966c374ea80d9e2ff0936b23f37baabc6fc"
title: "Transaction ও Concurrency"
translatedAt: "2026-10-17T14:02:11.980Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Transaction ও Concurrency {#ch-sql-transactions}

> Isolation level জেনে-বুঝে বেছে নিন, আর যে lost update read committed নিজে থেকে আটকায় না, সেটা আপনিই আটকান।

**এই অধ্যায়ে:** ACID আসলে কী প্রতিশ্রুতি দেয় · চারটি isolation level আর তাদের anomaly · optimistic বনাম pessimistic locking · deadlock · application code-এ transaction

## 💡 মূল ধারণা

Transaction কয়েকটি statement-কে একটি অবিভাজ্য কাজে বেঁধে দেয়: হয় সবগুলো হবে, নয়তো একটিও হবে না। এটা সহজ অর্ধেক, আর
interview এটা নিয়ে নয়।

কঠিন অর্ধেক হলো **concurrency**। আপনার transaction একা চলছে না। অন্যদের চলতে থাকা কাজের কতটা আপনার transaction দেখতে পাবে, তা ঠিক
করে isolation level। Postgres আর বেশিরভাগ engine-এর default হলো `READ COMMITTED`। এটা dirty read আটকায়, কিন্তু lost
update হতে দেয়। তাই সাবধানে না লেখা read-modify-write logic load-এর মধ্যে চুপচাপ ভুল করে। অথচ যে test একবারে একটি
request চালায়, তার প্রতিটিতে সেটা ঠিকঠাক চলে।

## ACID কী প্রতিশ্রুতি দেয়

| Property | প্রতিশ্রুতি | কে নিশ্চিত করে |
| -------- | ------- | ------------ |
| **Atomicity** | হয় সব statement commit হয়, নয়তো একটিও না | Write-ahead log আর rollback |
| **Consistency** | Commit-এর সময় constraint ঠিক থাকে | আপনার constraint — আপনি যা declare করেছেন, database শুধু সেটাই মানায় |
| **Isolation** | একসঙ্গে চলা transaction একে অপরকে নষ্ট করে না | MVCC আর lock, isolation level যতটুকু বলে ততটুকু |
| **Durability** | Commit হওয়া write crash-এর পরেও টিকে থাকে | Write-ahead log-এর `fsync` |

মানুষ সবচেয়ে বেশি ভুল বলে Consistency নিয়ে। Database আপনার business rule জানে না। আপনি যে constraint লিখেছেন, শুধু
সেটাই মানায়। `CHECK`-এ একটি `AND` লিখতে ভুলে গেলে সেটা isolation-এর সমস্যা নয়।

## Isolation Level

| Level | Dirty read | Non-repeatable read | Phantom read | Lost update |
| ----- | ---------- | ------------------- | ------------ | ----------- |
| `READ UNCOMMITTED` | হতে পারে | হতে পারে | হতে পারে | হতে পারে |
| `READ COMMITTED` (default) | না | হতে পারে | হতে পারে | **হতে পারে** |
| `REPEATABLE READ` | না | না | না (Postgres-এ) | ধরা পড়ে — transaction abort হয় |
| `SERIALIZABLE` | না | না | না | না |

- **Dirty read** — অন্য transaction-এর commit না হওয়া write দেখে ফেলা। Postgres কোনো level-এই এটা হতে দেয় না।
- **Non-repeatable read** — একই transaction-এর ভেতরে একই row দুবার পড়ে দুই রকম value পাওয়া, কারণ মাঝখানে কেউ commit
  করেছে।
- **Phantom read** — একই query আবার চালিয়ে নতুন row পাওয়া। Postgres-এর snapshot isolation `REPEATABLE READ`-এই এটা
  আটকায়, যদিও SQL standard তা দাবি করে না।
- **Lost update** — দুটি transaction একই value পড়ে, দুটিই সেটা থেকে হিসাব করে, আর দ্বিতীয় write প্রথমটাকে মুছে দেয়।

Postgres `REPEATABLE READ` চালায় snapshot isolation হিসেবে: আপনার transaction database-কে দেখে তার প্রথম statement-এর
মুহূর্তে যেমন ছিল তেমন। সাংঘর্ষিক write চলার সময়ই ধরা পড়ে, আর serialisation failure হয়। তাই **যে application এটা
ব্যবহার করে, তাকে retry করার জন্য তৈরি থাকতে হবে**।

## Lost Update

```sql
-- Two concurrent transactions, READ COMMITTED. Stock starts at 10.
-- T1: SELECT stock FROM products WHERE id = 1;   -- 10
-- T2: SELECT stock FROM products WHERE id = 1;   -- 10
-- T1: UPDATE products SET stock = 9 WHERE id = 1;
-- T2: UPDATE products SET stock = 9 WHERE id = 1;  -- one sale vanished
```

তিনটি সমাধান, খরচ কম থেকে বেশির দিকে:

**1. হিসাবটা database-এই করুন।** এটা সঠিক, সবচেয়ে সস্তা। নতুন value যখনই পুরনো value থেকে বের হয়, উত্তর এটাই।

```sql
UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock >= 1;
-- Zero rows affected means insufficient stock. The row lock is held only for this statement.
```

**2. Optimistic locking** — একটি version column। কোনো lock ধরে রাখা হয় না, তাই scale করে। হেরে যাওয়া transaction retry করে।

```sql
UPDATE products SET stock = $1, version = version + 1
WHERE id = $2 AND version = $3;
-- Zero rows affected means someone else committed first: re-read and retry.
```

**3. Pessimistic locking** — `SELECT … FOR UPDATE` transaction শেষ না হওয়া পর্যন্ত row-এ lock রাখে।

```sql
BEGIN;
SELECT stock FROM products WHERE id = $1 FOR UPDATE; -- other writers block here
UPDATE products SET stock = $2 WHERE id = $1;
COMMIT;
```

| পদ্ধতি | কখন ব্যবহার করবেন | খরচ |
| -------- | -------- | ---- |
| Database-এর ভেতরে হিসাব | নতুন value পুরনোটা থেকে আসে | কিছুই না — সবসময় এটাকেই আগে বাছুন |
| Optimistic (version column) | Conflict কালেভদ্রে হয়; read আর write-এর মাঝে অনেক ভাবার সময় | Retry logic, আর user-এর চোখে পড়া conflict |
| Pessimistic (`FOR UPDATE`) | Conflict প্রায়ই হয়; read আর write-এর মাঝের কাজ ছোট | অন্য writer আটকে থাকে; deadlock-এর ঝুঁকি |

যে রূপটি জানা দরকার, সেটা `FOR UPDATE SKIP LOCKED`। SQL table-এর ওপর work queue এভাবেই বানানো হয়। প্রতিটি worker এমন
row নেয় যা আর কেউ ধরে রাখেনি, অন্যদের পেছনে লাইনে দাঁড়ায় না।

## Deadlock

দুটি transaction-এর প্রতিটির হাতে আছে সেটা, যা অন্যটির দরকার। Database এই চক্রটা ধরে ফেলে, আর deadlock error দিয়ে একটিকে
মেরে দেয়।

```text
T1: locks row A → waits for row B
T2: locks row B → waits for row A
```

প্রতিরোধের উপায় একঘেয়ে, কিন্তু কাজ করে: **সবসময় একই ক্রমে lock নিন।** প্রতিটি transfer যদি আগে ছোট account id-টা
lock করে, তাহলে চক্র তৈরিই হতে পারে না।

```typescript
const [first, second] = [fromId, toId].sort(); // Deterministic order, no cycle possible.
await tx.query('SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE', [first]);
await tx.query('SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE', [second]);
```

একই কারণে transaction ছোট রাখুন। লম্বা transaction বেশিক্ষণ lock ধরে রাখে, ফলে conflict-এর প্রতিটি সুযোগ বড় হয়। আর
transaction-এর ভেতরে কখনো ধীর কোনো কাজ করবেন না।

## Application Code-এ Transaction

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

এখান থেকে তিনটি নিয়ম দেখা যায়:

- **পুরো transaction-এর জন্য একটিই client।** Pool দিয়ে পাঠানো statement আলাদা আলাদা connection-এ যায়, তাই সেগুলো আলাদা
  transaction।
- **`catch`-এ `ROLLBACK`, `finally`-তে `release`।** `release` বাদ পড়লে pool ফুরিয়ে যায়, আর লক্ষণ হলো পুরো service আটকে
  যাওয়া।
- **Transaction-এর ভেতরে কখনো HTTP call-এ `await` করবেন না।** 30 সেকেন্ডের timeout হয়ে যায় 30 সেকেন্ডের lock।

> ⚠️ `REPEATABLE READ` আর `SERIALIZABLE`-এ serialisation failure হলে retry করা বাধ্যতামূলক। ব্যর্থ statement নয়, পুরো
> transaction retry করুন, আর চেষ্টার সংখ্যায় একটি সীমা দিন।

**Savepoint** দিয়ে transaction-এর ভেতরে আংশিক rollback করা যায়। যখন কোনো ঐচ্ছিক ধাপ fail করলেও বাকিটা বাতিল হওয়া উচিত
নয়, তখন এটা কাজে লাগে। Postgres-এ savepoint না থাকলে *যেকোনো* error পুরো transaction abort করে দেয়। তাই savepoint ছাড়া
একটি statement-কে `try`/`catch` দিয়ে ঘিরলেও আপনি আর এগোতে পারবেন না।

## 🔑 মূল শিক্ষা

- `READ COMMITTED` default, আর এতে lost update হতে পারে, তাই read-modify-write-কে আলাদা করে রক্ষা করতে হয়।
- `UPDATE` statement-এর ভেতরেই হিসাব করাকে আগে বাছুন। এটা সঠিক, আর এর কোনো খরচ নেই।
- Optimistic locking scale করে, কিন্তু retry logic লাগে। Pessimistic locking আটকে রাখে, তাই transaction ছোট হতে হয়।
- নির্দিষ্ট একটি ক্রমে lock নিলে deadlock তৈরিই হতে পারে না।
- `REPEATABLE READ` বা তার ওপরের level-এ চলা যেকোনো code-কে serialisation failure-এ retry করতে হবে।

## Interview-এর প্রশ্ন

**Q: Lost update কী, আর default isolation level কি সেটা আটকায়?**

দুটি transaction একই value পড়ে, প্রতিটি সেটা থেকে নতুন একটি value হিসাব করে, আর দ্বিতীয় write প্রথমটাকে মুছে দেয়। একটি
update হারিয়ে যায়। `READ COMMITTED` এটা আটকায় না: দুটি read-ই বৈধ, দুটি write-ও বৈধ। লাগবে database-এর ভেতরে হিসাব,
version check, অথবা row lock।

**Q: Optimistic নাকি pessimistic locking?**

Conflict কালেভদ্রে হলে, বা read আর write-এর মাঝে অনেক সময় থাকলে optimistic। দশ মিনিট খোলা থাকা edit form-এর জন্য lock
ধরে রাখা উচিত নয়। Conflict প্রায়ই হলে আর read-write-এর মাঝের কাজ ছোট হলে pessimistic, কারণ তখন অল্প সময়ের আটকে থাকার
চেয়ে retry-এর ঝড়ের খরচ বেশি। Optimistic conflict-টা user-এর ঘাড়ে চাপায়। Pessimistic latency চাপায় অন্য writer-দের ওপর।

**Q: Deadlock কীভাবে আটকাবেন?**

সব code path-এ একই ক্রমে lock নিন, transaction ছোট রাখুন, আর যত কম সম্ভব row ছুঁয়ে কাজ সারুন। Database deadlock ধরে
ফেলে একটি transaction মেরে দেয়, তাই application-কে তবু retry করতে হয়। কিন্তু চক্র যে গোড়াতেই তৈরি হয় না, সেটা নিশ্চিত
করে lock-এর ক্রম।

## এরপর কী পড়বেন

- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — lock কেন আপনার ধারণার চেয়ে বেশিক্ষণ থাকে, আর ORM কীভাবে transaction মুড়ে দেয়
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — idempotency key, এই একই সমস্যার HTTP-স্তরের রূপ
