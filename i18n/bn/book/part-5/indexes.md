---
sourceHash: "caca59d3378021947b691eaa9e882b14fa42b1eccb64a477702e6c0e477fb814"
title: "Index, Query Plan, ORM ও Migration"
translatedAt: "2026-10-17T14:01:14.743Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Index, Query Plan, ORM ও Migration {#ch-indexes}

> ORM আসলে কোন SQL পাঠায় তা দেখুন, তার plan পড়ুন, আর downtime ছাড়াই চালু schema বদলান।

**এই অধ্যায়ে:** B-tree কী পারে আর কী পারে না · ORM যে query-গুলো আড়ালে রাখে · `EXPLAIN ANALYZE` পড়া · connection pooling · expand-then-contract migration

## 💡 মূল ধারণা

Index হলো কয়েকটি column-এর সাজানো একটি copy, যার প্রতিটি entry আসল row-এর দিকে pointer রাখে। সাজানো তালিকা তার sort
key-এর একটি **prefix**-এর ওপর equality আর range-এর প্রশ্নের উত্তর দিতে পারে, এর বাইরে আর কিছু নয়। তাই
`WHERE lower(email) = $1` `email`-এর index ব্যবহার করতে পারে না: index-এ রাখা আছে `email`, `lower(email)` নয়।

এসবের ওপরে বসে থাকে ORM। ORM row-কে object-এ রূপ দেয় আর আপনার হয়ে SQL লিখে দেয়। এতে অনেক boilerplate বাঁচে।
কিন্তু যেটা আপনার সবচেয়ে বেশি দেখা দরকার, সেটাই আড়ালে চলে যায়: **আপনার code কয়টি query পাঠায়, আর প্রতিটির খরচ
কত।** যে property পড়া বিনা খরচের মনে হয়, সেটা আসলে database পর্যন্ত একটি round trip। আর migration tool এমন সঠিক
SQL লিখতে পারে, যা আপনার পুরো table lock করে দেয়।

তাই রুটিন 90% query ORM-কে লিখতে দিন। যে SQL চলেছে, তার plan সবসময় পড়ুন। আর schema বদলান এমন ধাপে ধাপে, যাতে পুরনো
আর নতুন দুই code-ই টিকে থাকে।

> ⚠️ **যা বদলাতে থাকে:** Prisma, Drizzle আর TypeORM প্রতিটি major version-এ query API বদলায়, আর Prisma তার engine-এর
> architecture একাধিকবার বদলেছে। টেকসই নীতি হলো: generated SQL চোখে দেখা যেতে হবে, আর schema-র পরিবর্তন তখনও চলতে
> থাকা code-এর জন্য নিরাপদ হতে হবে। Method-এর নাম বদলাবেই।

## কীভাবে কাজ করে

### Composite index-এ column-এর ক্রমই আসল খেলা

প্রায় সব ক্ষেত্রেই default B-tree যথেষ্ট। GIN লাগে `jsonb`, array আর full-text-এ কিছু আছে কি না খুঁজতে। `(a, b, c)`-এর
ওপর B-tree হলো একটি তালিকা, যা সাজানো আগে `a` দিয়ে, তারপর `b`, তারপর `c`। এখান থেকেই আসে **leftmost prefix rule**:
index শুধু সেই query-র কাজে লাগে, যা তার column-গুলোর একটি prefix-এর ওপর শর্ত দেয়।

**User-এর order history-র জন্য একটি composite index:**

```sql
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);
```

| Query-র শর্ত | Index ব্যবহার হয়? |
| --------------- | --------------- |
| `user_id = 1 AND status = 'paid' ORDER BY created_at DESC` | ✅ পুরোপুরি, আর sort বিনা খরচে |
| `user_id = 1` | ✅ এক column-এর prefix |
| `status = 'paid'` | ❌ প্রথম column-টাই বাদ পড়েছে |
| `user_id = 1 AND created_at > $1` | ⚠️ আংশিক: `user_id` ব্যবহার করে, তারপর filter করে |

তাই **আগে equality-র column, তারপর range বা sort-এর column।** Range থাকলে তার ডান দিকের কোনো column-এ index আর
সাহায্য করে না। কারণ range-এর ভেতরের row-গুলো পরের column ধরে সাজানো থাকে না।

### Covering আর partial index

**Covering** index-এ query-র দরকারি সব column থাকে। Database শুধু index থেকেই উত্তর দেয়, table ছোঁয়ই না। একে বলে
index-only scan। **Partial** index-এ থাকে শুধু সেই row-গুলো, যেগুলো আপনি query করেন। তাই সেটা ছোট, আর হালনাগাদ রাখাও
সস্তা।

**Covering আর partial index:**

```sql
-- INCLUDE adds payload columns without making them part of the sort key.
CREATE INDEX idx_orders_cover ON orders (user_id, created_at DESC) INCLUDE (total, status);

-- 2% of rows are pending, so the index is 2% of the size and stays in memory.
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';
```

প্রতিটি index-এর দাম দিতে হয় write-এর সময়: প্রতিটি `INSERT`, `UPDATE` আর `DELETE` সবগুলো index update করে।

## ORM যে query পাঠায়

ORM schema থেকে type দেয়, আর default হিসেবে parameterised query দেয়। বিনিময়ে তার SQL কখনো কখনো একেবারেই ভালো হয় না।
Prisma নিজস্ব schema language ব্যবহার করে। Drizzle schema রাখে TypeScript-এ, আর দেখতে অনেকটা SQL-এর মতো। কোনটা বাছছেন
তার চেয়ে বেশি জরুরি, শেষে কোন SQL বেরোয় তা জানা।

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

`include` সমাধান, আবার পরের ফাঁদও। তিনটি one-to-many relation include করলে join ফেরত দেয় তাদের row-সংখ্যার গুণফল।
যে page-এ 20টি row আসার কথা, সেখানে আসে 4,000, আর ORM memory-তে বসে duplicate বাদ দেয়। এমন হলে আলাদা আলাদা query
পাঠান, আর ফলগুলো জোড়া দিন। GraphQL-এ `DataLoader` ঠিক এই কাজটাই করে।

**শুধু দরকারি column select করুন:**

```typescript
// Every column by default defeats covering indexes and inflates the payload.
const rows = await prisma.post.findMany({
  select: { id: true, title: true, author: { select: { name: true } } },
  take: 20,
});
```

**Development-এ query logging চালু করুন।** ORM-এর সবচেয়ে কাজের setting এটাই। SQL দেখতে না পেলে সেটা review করতে
পারবেন না, তার ওপর `EXPLAIN`-ও চালাতে পারবেন না।

### Connection pooling

Database-এর connection-এর একটি কড়া সীমা আছে। Pool অল্প কয়েকটি connection বারবার ব্যবহার করে, সাধারণত প্রতি instance-এ
10–20টি। হিসাবটাতেই মানুষ ধরা খায়। চল্লিশটি serverless instance, প্রতিটিতে 10-এর pool — মোট 400 connection, অথচ সীমা
100। Autoscale হওয়া app-এ বাইরের একটি pooler লাগে, যেমন PgBouncer, transaction mode-এ। এই mode-এ `SET`, advisory
lock আর `LISTEN`-এর মতো session-এর feature কাজ করে না।

## Plan পড়া

`EXPLAIN` দেখায় planner কী করতে চায়। `EXPLAIN ANALYZE` query-টা চালায় আর দেখায় আসলে কী হলো।

**ORM-এর log করা query planner দিয়ে চালান:**

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
```

| Node | মানে | চিন্তার বিষয় |
| ---- | ----- | ------- |
| `Seq Scan` | প্রতিটি row পড়ে | ছোট table-এ ঠিক আছে, বড় table-এ সমস্যা |
| `Index Scan` / `Index Only Scan` | Index-এ খোঁজে, table থেকে আনতে হয় বা হয় না | ভালো / সবচেয়ে ভালো |
| `Nested Loop` | বাইরের প্রতিটি row-এর জন্য একবার করে ভেতরের দিকে খোঁজে | বাইরের row-এর আন্দাজ ভুল হলে খারাপ |

তিনটি সংখ্যা সবচেয়ে জরুরি:

- **আনুমানিক `rows` বনাম `actual`।** দশ গুণ ফারাক মানে statistics পুরনো। `ANALYZE` চালান, আর সেই আন্দাজের ভিত্তিতে নেওয়া
  প্রতিটি সিদ্ধান্তে সন্দেহ করুন।
- **`loops`।** যে node সস্তা, কিন্তু 10,000 বার চলে, সেটা সস্তা নয়। গুণ করে দেখুন।
- **`Rows Removed by Filter`।** সংখ্যাটা বড় মানে index যে row-গুলো খুঁজে পেয়েছে, শর্ত পরে সেগুলো ফেলে দিয়েছে। Index-এ একটি
  column কম আছে।

### যে সমাধানগুলো কাজ করে

- **শর্তটাকে index-যোগ্য করুন।** Expression-এর ওপর index দিন, `CREATE INDEX … ON users (lower(email))`, অথবা value
  normalise করে store করুন। `created_at::date = $1`-এর বদলে একটি range-এর সঙ্গে তুলনা করুন।
- **`OFFSET`-এর বদলে keyset pagination।** `OFFSET 100000` 100,000টি row পড়ে ফেলে দেয়।
- **N+1-কে batch করুন।** সবচেয়ে সাধারণ "slow query" আসলে একটি দ্রুত query, যা 200 বার চলে।
- **অব্যবহৃত index drop করুন।** পুরো একটি business cycle জুড়ে `pg_stat_user_indexes`-এ `idx_scan` শূন্য মানে সেটা শুধুই
  write-এর খরচ।

## চালু অবস্থায় schema বদলানো

Migration হলো version দেওয়া, ক্রম মেনে চলা একটি schema পরিবর্তন, যা code-এর সঙ্গে commit হয়। যে migration কোথাও একবার
চলেছে, সেটা আর কখনো edit করবেন না। **Production-এ সামনের দিকে ঠিক করুন**: drop করা column ফিরিয়ে আনা `down` migration
data ফেরত আনে না। আর data backfill schema migration-এর বাইরে রাখুন, কারণ migration-এর ভেতরের backfill যতক্ষণ চলে,
ততক্ষণ lock ধরে রাখে।

### আগে expand, তারপর contract

Deploy-এর সময় পুরনো আর নতুন code একসঙ্গে চলে। তাই মাঝামাঝি অবস্থার schema-তে দুটিকেই কাজ করতে হবে।

**নামের দুটি column-এর জায়গায় একটি:**

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

| পরিবর্তন | বিপদ | নিরাপদ পথ |
| ------ | ------ | ---------- |
| Index যোগ করা | `CREATE INDEX` কয়েক মিনিট write আটকে রাখে | Transaction-এর বাইরে `CREATE INDEX CONCURRENTLY` |
| Default-সহ একটি `NOT NULL` column যোগ করা | পুরনো engine-এ, আর volatile default থাকলে, পুরো table আবার লেখা হয় | আগে nullable যোগ করুন, backfill করুন, তারপর `SET NOT NULL` |
| Foreign key যোগ করা | Validation দুটি table-ই scan করে আর lock করে | আগে `ADD CONSTRAINT … NOT VALID`, তারপর `VALIDATE CONSTRAINT` |
| Column-এর type বদলানো | Exclusive lock নিয়ে পুরো table আবার লেখা | নতুন column, backfill, swap, তারপর drop |

> ⚠️ চালু table-এ যেকোনো DDL-এর আগে একটি ছোট `lock_timeout` সেট করুন। যে migration lock-এর জন্য অপেক্ষা করছে, তার
> পেছনে প্রতিটি query লাইনে দাঁড়িয়ে যায়। এভাবেই এক line-এর `ALTER TABLE` থেকে outage হয়।

## সাধারণ ভুল

**❌ প্রতিটি column-এ আলাদা আলাদা index।** ✅ ঠিক ক্রমে একটি composite index তিনটি আলাদা index-এর চেয়ে ভালো।

**❌ ORM typed বলে তাকে বিশ্বাস করা।** Round trip নিয়ে type কিছুই বলে না। ✅ SQL log করুন, আর তার plan পড়ুন।

**❌ বড় table-এ এক statement-এ backfill।** এটা lock ধরে রাখে, WAL ফুলিয়ে দেয়, আর মাঝপথে timeout হতে পারে। ✅ সীমিত
loop-এ batch করে চালান, মাঝে মাঝে বিরতি দিয়ে।

## 🔑 মূল শিক্ষা

- Index একটি সাজানো copy, তাই সেটা শুধু তার sort key-এর prefix নিয়ে প্রশ্নের উত্তর দেয়, আর কিছুর নয়।
- ORM-এর আসল খরচ আড়ালের round trip আর row-এর বিস্ফোরণ, তাই development-এ generated SQL log করুন।
- `EXPLAIN ANALYZE`-এ আনুমানিক আর আসল row-এর মধ্যে বড় ফারাকই সাধারণত আসল খবর।
- Pool size গুণ instance-এর সংখ্যা database-এর connection সীমার নিচে থাকতে হবে।
- যেকোনো breaking schema পরিবর্তনের নিরাপদ ক্রম: expand, backfill, deploy, তারপর contract।

## Interview-এর প্রশ্ন

**Q: `(user_id, status, created_at)`-এর ওপর একটি index আছে। কোন query-গুলো এটা ব্যবহার করে?**

যে query বাঁ দিক থেকে একটি prefix-এর ওপর শর্ত দেয়: শুধু `user_id`, `user_id` আর `status`, বা তিনটিই। তিনটি থাকলে
`ORDER BY created_at` বিনা খরচে হয়, কারণ index আগে থেকেই সেই ক্রমে সাজানো। শুধু `status`-এর ওপর query এটা ব্যবহার
করতে পারে না। `user_id`-এর সঙ্গে `created_at`-এর range থাকলে প্রথম column-টা ব্যবহার হয়, তারপর filter চলে।

**Q: Query-তে index আছে, তবু ধীর। কী কী দেখবেন?**

আগে plan। সাধারণ কারণগুলো হলো index করা column-এর ওপর কোনো function বা cast, কিংবা পুরনো statistics, যা row-এর ভুল
আন্দাজ দেয় আর nested loop বেছে নেয়। অথবা index এত বেশি row-এর সঙ্গে মেলে যে planner ঠিকভাবেই সেটা উপেক্ষা করে।
`Rows Removed by Filter` বড় হলে বুঝবেন, শর্তের যে column দরকার, index-এ সেটা নেই।

**Q: কখন ORM ছেড়ে raw SQL-এ নামবেন?**

Window function বা recursive CTE-ওয়ালা analytical query-র জন্য, আর এমন bulk কাজে, যেখানে ORM প্রতি row-এর জন্য একটি
করে statement পাঠায়। তা ছাড়া যখন generated plan খারাপ, আর API দিয়ে সেটা বদলানো যায় না। Raw SQL-ও parameterised রাখুন,
আর একটি typed function-এর পেছনে রাখুন।

**Q: Zero downtime-এ column-এর নাম কীভাবে বদলাবেন?**

Expand আর contract করে। নতুন column যোগ করুন, এমন code deploy করুন যা দুটিতেই লেখে আর নতুনটা থেকে পড়ে, আর batch-এ
backfill করুন। পুরনো column আর কেউ পড়ছে না নিশ্চিত হয়ে পরের release-এ সেটা drop করুন। সরাসরি rename করলে deploy-এর
সময় তখনও চলতে থাকা প্রতিটি পুরনো instance ভেঙে যায়।

## এরপর কী পড়বেন

- [Chapter ?? — SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) — এই index আর migration যে schema-র জন্য
- [Chapter ?? — Node.js Performance, Stream ও Scaling](#ch-nodejs-performance) — application-এর দিক থেকে slow query খুঁজে বের করা
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — API layer-এ expand আর contract
