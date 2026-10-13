---
sourceHash: "188ab8440eb778caa8074c4d7ca5f966c374ea80d9e2ff0936b23f37baabc6fc"
title: "Transaction ও Concurrency"
translatedAt: "2026-10-12T12:23:47.184Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Transaction ও Concurrency {#ch-sql-transactions}

> ভেবেচিন্তে একটি isolation level বেছে নিন, আর সেই lost update আটকান, যেটা read-committed আপনার হয়ে আটকাবে না।

**এই অধ্যায়ে:** ACID আসলে কী প্রতিশ্রুতি দেয় · চারটি isolation level আর তাদের anomaly · optimistic বনাম pessimistic locking · deadlock · application code-এ transaction

## 💡 মূল ধারণা

Transaction কয়েকটি statement-কে একটি অবিভাজ্য operation-এ পরিণত করে: হয় সবগুলো ঘটে, নয়তো একটিও ঘটে না। এটা
সহজ অর্ধেক, আর interview এটা নিয়ে নয়।

কঠিন অর্ধেক হলো **concurrency**। আপনার transaction একা চলছে না, আর isolation level ঠিক করে অন্যদের চলমান কাজের কতটুকু
এটা দেখতে পারবে। Postgres আর বেশিরভাগ engine-এ default হলো `READ COMMITTED`। এটা dirty read আটকায়, কিন্তু lost
update হতে দেয়। তাই অসাবধানে লেখা read-modify-write logic load-এর মধ্যে চুপচাপ ভুল হয়, অথচ একবারে একটি request চালানো
প্রতিটি test-এ সঠিক থাকে।

## ACID কী প্রতিশ্রুতি দেয়

| Property | প্রতিশ্রুতি | কে পূরণ করে |
| -------- | ------- | ------------ |
| **Atomicity** | হয় সব statement commit হয়, নয়তো একটিও না | Write-ahead log আর rollback |
| **Consistency** | Commit-এর সময় constraint বজায় থাকে | আপনার constraint — database শুধু সেটাই প্রয়োগ করে, যেটা আপনি declare করেছেন |
| **Isolation** | একসাথে চলা transaction একে অপরকে নষ্ট করে না | MVCC আর lock, isolation level যতটুকু নির্দিষ্ট করে ততটুকু |
| **Durability** | Commit হওয়া write crash-এর পরেও টিকে থাকে | Write-ahead log-এর `fsync` |

মানুষ যেটা ভুল বলে, সেটা consistency। Database আপনার business rule জানে না। আপনি যে constraint লিখেছেন, সেটাই প্রয়োগ
করে। একটি `CHECK`-এ ভুলে যাওয়া একটি `AND` isolation-এর সমস্যা নয়।

## Isolation Level

| Level | Dirty read | Non-repeatable read | Phantom read | Lost update |
| ----- | ---------- | ------------------- | ------------ | ----------- |
| `READ UNCOMMITTED` | সম্ভব | সম্ভব | সম্ভব | সম্ভব |
| `READ COMMITTED` (default) | না | সম্ভব | সম্ভব | **সম্ভব** |
| `REPEATABLE READ` | না | না | না (Postgres-এ) | ধরা পড়ে — transaction abort হয় |
| `SERIALIZABLE` | না | না | না | না |

- **Dirty read** — অন্য একটি transaction-এর uncommitted write দেখা। Postgres কোনো level-এই এটা হতে দেয় না।
- **Non-repeatable read** — একটি transaction-এর ভেতরে একই row দুবার পড়ে আলাদা value পাওয়া, কারণ মাঝখানে কেউ
  commit করেছে।
- **Phantom read** — একটি query আবার চালিয়ে নতুন row খুঁজে পাওয়া। Postgres-এর snapshot isolation `REPEATABLE READ`-এ
  এটা আটকায়, যেটা SQL standard দাবি করে না।
- **Lost update** — দুটি transaction একই value পড়ে, দুজনেই সেটা থেকে হিসাব করে, আর দ্বিতীয় write প্রথমটার ওপর
  overwrite করে।

Postgres `REPEATABLE READ`-কে snapshot isolation হিসেবে implement করে: আপনার transaction database-কে দেখে তার প্রথম
statement-এর সময় যেমন ছিল তেমন। একটি সাংঘর্ষিক write চলার সময় ধরা পড়ে, আর একটি serialisation failure তোলে। তাই
**এটা ব্যবহার করা যেকোনো application-কে retry করার জন্য তৈরি থাকতে হবে**।

## Lost Update

```sql
-- Two concurrent transactions, READ COMMITTED. Stock starts at 10.
-- T1: SELECT stock FROM products WHERE id = 1;   -- 10
-- T2: SELECT stock FROM products WHERE id = 1;   -- 10
-- T1: UPDATE products SET stock = 9 WHERE id = 1;
-- T2: UPDATE products SET stock = 9 WHERE id = 1;  -- one sale vanished
```

তিনটি সমাধান, খরচের ক্রম অনুযায়ী বাড়তে থাকা:

**1. হিসাবটা database-এ করুন।** সঠিক, সবচেয়ে সস্তা, আর যখনই নতুন value পুরোনোটার একটি function, তখন এটাই উত্তর।

```sql
UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock >= 1;
-- Zero rows affected means insufficient stock. The row lock is held only for this statement.
```

**2. Optimistic locking** — একটি version column। কোনো lock ধরে রাখা হয় না, তাই এটা scale করে। যে হারে, সে retry করে।

```sql
UPDATE products SET stock = $1, version = version + 1
WHERE id = $2 AND version = $3;
-- Zero rows affected means someone else committed first: re-read and retry.
```

**3. Pessimistic locking** — `SELECT … FOR UPDATE` transaction শেষ হওয়া পর্যন্ত একটি row lock নেয়।

```sql
BEGIN;
SELECT stock FROM products WHERE id = $1 FOR UPDATE; -- other writers block here
UPDATE products SET stock = $2 WHERE id = $1;
COMMIT;
```

| পদ্ধতি | কখন ব্যবহার করবেন | খরচ |
| -------- | -------- | ---- |
| Database-এর ভেতরে হিসাব | নতুন value পুরোনোটা থেকে আসে | কিছুই না — সবসময় এটাই বেছে নিন |
| Optimistic (version column) | Conflict বিরল; read আর write-এর মাঝে লম্বা ভাবার সময় | Retry logic, আর user-এর চোখে পড়া একটি conflict |
| Pessimistic (`FOR UPDATE`) | Conflict সাধারণ; read আর write-এর মাঝের কাজ ছোট | আটকে থাকা writer; deadlock-এর ঝুঁকি |

`FOR UPDATE SKIP LOCKED` হলো জানার মতো রূপটি। একটি SQL table-এর ওপর work queue এভাবেই বানানো হয়। প্রতিটি worker
এমন row দাবি করে, যেগুলো আর কেউ ধরে নেই, সেগুলোর পেছনে queue-তে দাঁড়ানোর বদলে।

## Deadlock

দুটি transaction-এর প্রতিটি সেটা ধরে আছে, যেটা অন্যটার দরকার। Database এই চক্রটা ধরে ফেলে আর একটি deadlock error
দিয়ে একটিকে মেরে ফেলে।

```text
T1: locks row A → waits for row B
T2: locks row B → waits for row A
```

প্রতিরোধটা একঘেয়েভাবে কার্যকর: **সবসময় একটি নির্দিষ্ট ক্রমে lock নিন।** যদি প্রতিটি transfer আগে ছোট account id-টি
lock করে, তাহলে চক্র তৈরি হতে পারে না।

```typescript
const [first, second] = [fromId, toId].sort(); // Deterministic order, no cycle possible.
await tx.query('SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE', [first]);
await tx.query('SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE', [second]);
```

একই কারণে transaction ছোট রাখুন। লম্বা transaction বেশিক্ষণ lock ধরে রাখে, conflict-এর প্রতিটি সুযোগ বড় করে দেয়।
আর এর ভেতরে কখনো ধীর কিছু করবেন না।

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

- **পুরো transaction-এর জন্য একটি client।** Pool দিয়ে পাঠানো statement আলাদা আলাদা connection-এ পৌঁছায়, তাই সেগুলো
  আলাদা transaction।
- **`catch`-এ `ROLLBACK`, `finally`-তে `release`।** একটি `release` বাদ পড়লে pool ফুরিয়ে যায়, আর লক্ষণ হলো পুরো
  service আটকে যাওয়া।
- **কখনো একটি transaction-এর ভেতরে HTTP call `await` করবেন না।** 30 সেকেন্ডের একটি timeout 30 সেকেন্ডের একটি lock হয়ে যায়।

> ⚠️ `REPEATABLE READ` আর `SERIALIZABLE`-এ serialisation failure retry করা বাধ্যতামূলক। পুরো transaction retry
> করুন, fail হওয়া statement নয়, আর চেষ্টার সংখ্যা সীমিত রাখুন।

**Savepoint** একটি transaction-এর ভেতরে আংশিক rollback দেয়। যখন একটি ঐচ্ছিক ধাপ বাকিটাকে বাতিল না করেই fail
করতে পারে, তখন এগুলো কাজে আসে। Postgres-এ savepoint set করা না থাকলে *যেকোনো* error পুরো transaction abort করে দেয়।
তাই savepoint ছাড়া একটি statement-এর চারপাশে `try`/`catch` আপনাকে চালিয়ে যেতে দেয় না।

## 🔑 মূল শিক্ষা

- `READ COMMITTED` হলো default, আর এটা lost update হতে দেয়, তাই read-modify-write-এর জন্য স্পষ্ট সুরক্ষা লাগে।
- `UPDATE` statement-এর ভেতরে হিসাব করাই বেছে নিন। এটা সঠিক আর বিনামূল্যে।
- Optimistic locking scale করে আর retry logic চায়। Pessimistic locking আটকে রাখে আর ছোট transaction চায়।
- একটি নির্ধারিত ক্রমে lock নিন, তাহলে deadlock তৈরি হতে পারে না।
- `REPEATABLE READ` বা তার ওপরের যেকোনো code-কে serialisation failure retry করতে হবে।

## Interview-এর প্রশ্ন

**Q: Lost update কী, আর default isolation level কি এটা আটকায়?**

দুটি transaction একই value পড়ে, প্রতিটি সেটা থেকে একটি নতুন value হিসাব করে, আর দ্বিতীয় write প্রথমটার ওপর
overwrite করে। একটি update হারিয়ে যায়। `READ COMMITTED` এটা আটকায় না: দুটি read-ই বৈধ, দুটি write-ও বৈধ। আপনার
লাগবে database-এর ভেতরে হিসাব, একটি version check, বা একটি row lock।

**Q: Optimistic নাকি pessimistic locking?**

Optimistic, যখন conflict বিরল বা read আর write-এর মাঝের ফাঁক লম্বা। দশ মিনিট খোলা থাকা একটি edit form-এর lock ধরে
রাখা উচিত নয়। Pessimistic, যখন conflict ঘন ঘন হয় আর read আর write-এর মাঝের কাজ ছোট, কারণ retry-এর ঝড় অল্প সময়ের
blocking-এর চেয়ে বেশি খরচের। Optimistic conflict-কে user-এর দিকে ঠেলে দেয়। Pessimistic latency-কে অন্য writer-দের
ওপর ঠেলে দেয়।

**Q: Deadlock কীভাবে আটকাবেন?**

সব code path জুড়ে একটি নির্দিষ্ট ক্রমে lock নিন, transaction ছোট রাখুন, আর যত কম সম্ভব row ছুঁয়ে দেখুন। Database
deadlock ধরে ফেলে আর একটি transaction মেরে ফেলে, তাই application-কে তবুও retry করতে হয়। Lock-এর ক্রমই প্রথম থেকে
চক্রটা তৈরি হওয়া আটকায়।

## এরপর কী পড়বেন

- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — কেন একটি lock আপনার ধারণার চেয়ে বেশিক্ষণ ধরা থাকে, আর একটি ORM কীভাবে একটি transaction মোড়ায়
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — idempotency key, এই সমস্যার HTTP-স্তরের রূপ
