---
sourceHash: "caca59d3378021947b691eaa9e882b14fa42b1eccb64a477702e6c0e477fb814"
title: "Index, Query Plan, ORM ও Migration"
translatedAt: "2026-10-12T12:23:07.774Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Index, Query Plan, ORM ও Migration {#ch-indexes}

> আপনার ORM আসলে কোন SQL পাঠায় তা দেখুন, তার plan পড়ুন, আর downtime ছাড়া একটি live schema বদলান।

**এই অধ্যায়ে:** একটি B-tree কী পারে আর কী পারে না · ORM যে query-গুলো লুকিয়ে রাখে · `EXPLAIN ANALYZE` পড়া · connection pooling · expand-then-contract migration

## 💡 মূল ধারণা

Index হলো কয়েকটি column-এর একটি sorted copy, যার সাথে প্রতিটি row-এ ফিরে যাওয়ার একটি pointer থাকে। একটি sorted
list তার sort key-এর একটি **prefix**-এর ওপর equality আর range প্রশ্নের উত্তর দিতে পারে, আর কিছু নয়। তাই
`WHERE lower(email) = $1` `email`-এর ওপরের index ব্যবহার করতে পারে না: index `email` store করে, `lower(email)` নয়।

এসবের ওপরে বসে থাকে একটি ORM। এটা row-কে object-এ map করে আর আপনার হয়ে SQL লেখে। এতে অনেক boilerplate বাঁচে।
কিন্তু এটা সেই জিনিসটাই লুকিয়ে রাখে, যেটা আপনার সবচেয়ে বেশি দেখা দরকার: **আপনার code কতগুলো query পাঠায়, আর
প্রতিটির খরচ কত।** যে property access দেখতে বিনামূল্যে মনে হয়, সেটা একটি round trip। একটি migration tool সঠিক SQL
লিখেও আপনার পুরো table lock করে ফেলতে পারে।

তাই রুটিন 90% query ORM-কে লিখতে দিন। যে SQL চলেছে, তার plan সবসময় পড়ুন। Schema এমন ধাপে বদলান, যেটা পুরোনো আর
নতুন দুই code-ই সামলাতে পারে।

> ⚠️ **যা বদলাতে থাকে:** Prisma, Drizzle আর TypeORM সবাই major version-এর মধ্যে নিজেদের query API বদলায়, আর
> Prisma নিজের engine architecture একাধিকবার বদলেছে। টেকসই নীতিটা হলো, generated SQL অবশ্যই দেখা যেতে হবে, আর
> একটি schema পরিবর্তন তখনো চলতে থাকা code-এর জন্য নিরাপদ হতে হবে। Method-এর নাম বদলাবে।

## কীভাবে কাজ করে

### Composite column-এর ক্রমই আসল খেলা

Default B-tree প্রায় সব ক্ষেত্র cover করে। GIN হলো `jsonb`, array আর full-text-এর ওপর containment-এর জন্য।
`(a, b, c)`-এর ওপর একটি B-tree হলো একটি list, যেটা প্রথমে `a`, তারপর `b`, তারপর `c` দিয়ে sorted। এ থেকেই আসে
**leftmost prefix rule**: index শুধু সেই query-কে সাহায্য করে, যেটা এর column-গুলোর একটি prefix-কে সীমিত করে।

**একজন user-এর order history-র জন্য একটি composite index:**

```sql
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);
```

| Query predicate | Index ব্যবহার করে? |
| --------------- | --------------- |
| `user_id = 1 AND status = 'paid' ORDER BY created_at DESC` | ✅ পুরোপুরি, আর sort বিনামূল্যে |
| `user_id = 1` | ✅ এক column-এর একটি prefix |
| `status = 'paid'` | ❌ প্রথম column বাদ দেয় |
| `user_id = 1 AND created_at > $1` | ⚠️ আংশিক: `user_id` ব্যবহার করে, তারপর filter করে |

তাই **আগে equality column, তারপর range বা sort column রাখুন।** একটি range তার ডান দিকের কোনো কিছুতে index-এর
সাহায্য বন্ধ করে দেয়। একটি range-এর ভেতরের row-গুলো তার পরের column-এর হিসেবে ক্রমানুসারে থাকে না।

### Covering আর partial index

একটি **covering** index query-র দরকারি প্রতিটি column ধরে রাখে। Database শুধু index থেকেই উত্তর দেয়, table কখনো
ছোঁয় না। এটাকে বলে index-only scan। একটি **partial** index শুধু সেই row-গুলো ধরে, যেগুলো আপনি query করেন। তাই এটা
ছোট, আর update রাখা সস্তা।

**Covering আর partial index:**

```sql
-- INCLUDE adds payload columns without making them part of the sort key.
CREATE INDEX idx_orders_cover ON orders (user_id, created_at DESC) INCLUDE (total, status);

-- 2% of rows are pending, so the index is 2% of the size and stays in memory.
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';
```

প্রতিটি index-এর দাম দিতে হয় write-এ: প্রতিটি `INSERT`, `UPDATE` আর `DELETE` সবগুলো index update করে।

## আপনার ORM যে Query পাঠায়

একটি ORM আপনাকে schema থেকে type দেয়, আর default-ভাবে parameterised query দেয়। বিনিময়ে এর SQL কখনো কখনো
optimal থেকে অনেক দূরে থাকে। Prisma নিজের schema language ব্যবহার করে। Drizzle schema রাখে TypeScript-এ, আর দেখতে
SQL-এর মতো। কোনটা বেছে নিচ্ছেন, তার চেয়ে বেশি জরুরি কোন SQL বেরিয়ে আসছে তা জানা।

**N+1, আর তার সমাধান:**

```typescript
// ❌ One query for posts, then one per post: 21 round trips for a page of 20.
const posts = await prisma.post.findMany({ take: 20 });
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ One query, or two: the ORM batches the relation.
const withAuthors = await prisma.post.findMany({ take: 20, include: { author: true } });
```

`include` হলো সমাধান, আবার পরের ফাঁদও। তিনটি one-to-many relation include করলে join তাদের row সংখ্যার গুণফল
return করে। যে page-এর 20টি row return করার কথা, সেটা 4,000টি fetch করে, আর ORM memory-তে সেগুলোর duplicate
বাদ দেয়। এমন হলে আলাদা আলাদা query পাঠান, আর ফলাফলগুলো জোড়া লাগান। GraphQL-এ একটি `DataLoader` ঠিক এটাই করে।

**শুধু দরকারি column select করুন:**

```typescript
// Every column by default defeats covering indexes and inflates the payload.
const rows = await prisma.post.findMany({
  select: { id: true, title: true, author: { select: { name: true } } },
  take: 20,
});
```

**Development-এ query logging চালু করুন।** এটাই ORM-এর একক সবচেয়ে কাজের setting। SQL দেখতে না পেলে আপনি সেটা
review করতে পারবেন না, আর তার ওপর `EXPLAIN` চালাতেও পারবেন না।

### Connection pooling

Database-এর একটি কঠিন connection limit আছে। একটি pool কয়েকটি connection বারবার ব্যবহার করে, সাধারণত প্রতি
instance-এ 10–20টি। হিসাবটায় মানুষ ধরা খায়। 10-এর pool নিয়ে চল্লিশটি serverless instance 100-এর limit-এর বিপরীতে
400টি connection খোলে। Autoscaled app-এর একটি external pooler লাগে, যেমন PgBouncer, transaction mode-এ। সেই mode
`SET`, advisory lock আর `LISTEN`-এর মতো session feature ভেঙে দেয়।

## একটি Plan পড়া

`EXPLAIN` planner-এর ইচ্ছা দেখায়। `EXPLAIN ANALYZE` query-টি চালায় আর কী ঘটেছে তা দেখায়।

**ORM-এর log করা query planner দিয়ে চালান:**

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
```

| Node | মানে | চিন্তার বিষয় |
| ---- | ----- | ------- |
| `Seq Scan` | প্রতিটি row পড়ে | ছোট table-এ ঠিক আছে, বড় table-এ সমস্যা |
| `Index Scan` / `Index Only Scan` | Index lookup, table fetch-সহ বা ছাড়া | ভালো / সবচেয়ে ভালো |
| `Nested Loop` | প্রতিটি outer row-এর জন্য একবার করে inner দিকটা খোঁজে | Outer row-এর estimate ভুল হলে খারাপ |

তিনটি সংখ্যা সবচেয়ে গুরুত্বপূর্ণ:

- **Estimated `rows` বনাম `actual`।** দশ গুণ ফারাক মানে statistics পুরোনো। `ANALYZE` চালান, আর সেই estimate থেকে
  নেওয়া প্রতিটি সিদ্ধান্তে অবিশ্বাস করুন।
- **`loops`।** 10,000 বার চলা একটি সস্তা node সস্তা নয়। গুণ করুন।
- **`Rows Removed by Filter`।** বড় সংখ্যা মানে index এমন row খুঁজে পেয়েছে, যেগুলো predicate পরে ফেলে দিয়েছে।
  Index-এ একটি column নেই।

### যে সমাধানগুলো কাজ করে

- **Predicate-কে indexable করুন।** Expression-টি index করুন, `CREATE INDEX … ON users (lower(email))`,
  অথবা value-টি normalised করে store করুন। `created_at::date = $1`-এর বদলে একটি range তুলনা করুন।
- **`OFFSET`-এর বদলে keyset pagination ব্যবহার করুন।** `OFFSET 100000` 100,000টি row পড়ে আর ফেলে দেয়।
- **N+1-কে batch করুন।** সবচেয়ে সাধারণ "slow query" হলো 200 বার চলা একটি দ্রুত query।
- **অব্যবহৃত index drop করুন।** একটি business cycle জুড়ে `pg_stat_user_indexes`-এ শূন্য `idx_scan` মানে শুধুই write-এর খরচ।

## Live অবস্থায় Schema বদলানো

Migration হলো একটি versioned, ক্রমানুসারে সাজানো schema পরিবর্তন, যেটা code-এর সাথে commit করা হয়। যেটা ইতিমধ্যে
কোথাও চলেছে, সেটা কখনো edit করবেন না। **Production-এ সামনে এগিয়ে ঠিক করুন**: যে `down` migration একটি drop করা
column ফিরিয়ে আনে, সেটা data ফিরিয়ে আনে না। আর data backfill-কে schema migration-এর বাইরে রাখুন, কারণ একটি
migration-এর ভেতরের backfill যতক্ষণ চলে, ততক্ষণ lock ধরে রাখে।

### আগে expand, তারপর contract

একটি deploy-এর সময় পুরোনো আর নতুন code একসাথে চলে, তাই দুটিকেই মাঝামাঝি অবস্থার schema-র সাথে কাজ করতে হবে।

**দুটি name column-কে একটি দিয়ে বদলানো:**

```sql
-- 1. EXPAND: add the new column, nullable, so no table rewrite.
ALTER TABLE users ADD COLUMN full_name text;

-- 2. BACKFILL: in batches, outside the migration, so no long lock.
UPDATE users SET full_name = first_name || ' ' || last_name
WHERE id IN (SELECT id FROM users WHERE full_name IS NULL LIMIT 5000);

-- 3. Deploy code that writes both columns and reads the new one.

-- 4. CONTRACT: only once no running code reads the old columns.
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

### যে চারটি পরিবর্তনে সাবধান থাকতে হয়

| পরিবর্তন | ঝুঁকি | নিরাপদ পথ |
| ------ | ------ | ---------- |
| একটি index যোগ করা | `CREATE INDEX` কয়েক মিনিট write আটকে রাখে | `CREATE INDEX CONCURRENTLY`, একটি transaction-এর বাইরে |
| Default-সহ একটি `NOT NULL` column যোগ করা | পুরোনো engine আর volatile default table rewrite করে | Nullable হিসেবে যোগ করুন, backfill করুন, তারপর `SET NOT NULL` |
| একটি foreign key যোগ করা | Validation দুটি table-ই scan আর lock করে | `ADD CONSTRAINT … NOT VALID`, তারপর `VALIDATE CONSTRAINT` |
| একটি column-এর type বদলানো | Exclusive lock-এর অধীনে পুরো rewrite | নতুন column, backfill, swap, drop |

> ⚠️ Live table-এ যেকোনো DDL-এর আগে একটি ছোট `lock_timeout` set করুন। Lock-এর জন্য অপেক্ষা করা একটি migration
> তার পেছনে প্রতিটি query-কে queue-তে আটকে দেয়। এভাবেই এক line-এর একটি `ALTER TABLE` outage হয়ে যায়।

## সাধারণ ভুল

**❌ প্রতিটি column আলাদাভাবে index করা।** ✅ সঠিক ক্রমের একটি composite index তিনটির চেয়ে ভালো।

**❌ Typed বলে ORM-কে বিশ্বাস করা।** Type round trip নিয়ে কিছুই বলে না। ✅ SQL log করুন আর তার plan পড়ুন।

**❌ বড় table-এ এক statement-এ backfill।** এটা lock ধরে রাখে, WAL ফুলিয়ে দেয়, আর মাঝপথে time out হতে পারে।
✅ বিরতিসহ একটি সীমিত loop-এ batch করে চালান।

## 🔑 মূল শিক্ষা

- Index হলো একটি sorted copy, তাই এটা তার sort key-এর একটি prefix নিয়ে প্রশ্নের উত্তর দেয়, আর কিছু নয়।
- একটি ORM-এর আসল খরচ হলো লুকোনো round trip আর row-এর বিস্ফোরণ, তাই development-এ generated SQL log করুন।
- `EXPLAIN ANALYZE`-এ estimated আর actual row-এর মধ্যে বড় ফারাকই সাধারণত আসল আবিষ্কার।
- Pool size গুণ instance সংখ্যা অবশ্যই database-এর connection limit-এর নিচে থাকতে হবে।
- যেকোনো breaking schema পরিবর্তনের নিরাপদ ক্রম হলো expand, backfill, deploy, তারপর contract।

## Interview-এর প্রশ্ন

**Q: আপনার `(user_id, status, created_at)`-এর ওপর একটি index আছে। কোন query-গুলো এটা ব্যবহার করে?**

যেকোনো query, যেটা একটি leftmost prefix-কে সীমিত করে: শুধু `user_id`, `status`-সহ `user_id`, বা তিনটিই। তিনটি থাকলে
`ORDER BY created_at` বিনামূল্যে, কারণ index আগে থেকেই সেই ক্রমে আছে। শুধু `status`-এর ওপর একটি query এটা ব্যবহার
করতে পারে না। `created_at`-এর ওপর range-সহ `user_id` প্রথম column ব্যবহার করে, তারপর filter করে।

**Q: একটি query-র index আছে, তবুও ধীর। কী যাচাই করবেন?**

আগে plan। সাধারণ কারণ হলো index করা column-এর ওপর একটি function বা cast, বা পুরোনো statistics, যেটা একটি খারাপ row
estimate আর একটি nested loop দেয়। অথবা index এত বেশি row-এর সাথে মেলে যে planner যথার্থভাবেই এটা উপেক্ষা করে।
বড় `Rows Removed by Filter` মানে index-এ এমন একটি column নেই, যেটা predicate-এর দরকার।

**Q: কখন ORM ছেড়ে raw SQL-এ নামবেন?**

Window function বা recursive CTE-সহ analytical query-র জন্য, আর এমন bulk কাজের জন্য, যেখানে ORM প্রতি row-এ একটি
statement পাঠায়। এছাড়া যখন generated plan খারাপ আর API দিয়ে সেটা বদলানো যায় না। Raw SQL parameterised রাখুন,
আর একটি typed function-এর পেছনে রাখুন।

**Q: Zero downtime-এ একটি column-এর নাম কীভাবে বদলাবেন?**

Expand আর contract। নতুন column যোগ করুন, এমন code deploy করুন যেটা দুটিতেই লেখে আর নতুনটা থেকে পড়ে, আর batch-এ
backfill করুন। যাচাই করুন যে কেউ পুরোনো column পড়ে না, তারপর পরের কোনো release-এ সেটা drop করুন। সরাসরি rename
করলে deploy চলার সময় তখনো চলতে থাকা প্রতিটি পুরোনো instance ভেঙে যায়।

## এরপর কী পড়বেন

- [Chapter ?? — SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) — যে schema-র সেবায় এই index আর migration
- [Chapter ?? — Node.js Performance, Stream ও Scaling](#ch-nodejs-performance) — application-এর দিক থেকে ধীর query খুঁজে বের করা
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — API layer-এ expand আর contract
