---
sourceHash: "ef3018d986924097fbb9853124927fa874e929d8d5669bceb9d04e34f731b5d3"
title: "Non-Relational Store বাছাই: Document ও Redis"
translatedAt: "2026-10-12T12:20:08.163Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Non-Relational Store বাছাই: Document ও Redis {#ch-document-databases}

> কখন document model মানায়, কখন Redis মানায়, আর কখন Postgres-ই এখনো উত্তর, তা বলুন — আর প্রতিটি সিদ্ধান্তের দাম কী, সেটাও বলুন।

**এই অধ্যায়ে:** প্রতিটি store কী ছেড়ে দেয় · query থেকে document model করা · embed নাকি reference · Redis-এর structure, expiry আর eviction · কখন Postgres জেতে

## 💡 মূল ধারণা

একটি relational database প্রতিটি তথ্য একবারই রাখে। দরকারি আকারটা সে read-এর সময় join দিয়ে আবার তৈরি করে।
এই অধ্যায়ের দুটো store সেটা ছেড়ে দেয়, আর প্রত্যেকে বদলে কিছু একটা পায়।

একটি **document database** সেই আকারটাই রাখে, যেটা application পড়ে। Variant আর image সহ একটি product page একটি
fetch, চারটি table-এর join নয়। দাম হলো duplication। একটি value দশ হাজার document-এ copy হলে, সব copy একসাথে মিলিয়ে
রাখার দায় এখন আপনার।

**Redis** value রাখে memory-তে, একটি key-এর নিচে, একটি thread-এ। Read হয় microsecond-এ, আর প্রতিটি command lock
ছাড়াই atomic। দাম হলো, data-কে RAM-এ আঁটতে হবে। তার ওপর, একটি crash শেষ এক সেকেন্ডের write হারিয়ে ফেলতে পারে।

তাই প্রশ্নটা কখনো "SQL নাকি NoSQL" নয়। প্রশ্নটা হলো: আমি কী পড়ি, আর কী হারানোর সামর্থ্য আমার আছে?

> ⚠️ **যা বদলাতে থাকে:** API নয়, licence। Redis 2024-এ open source ছেড়ে দেয়, তারপর Valkey fork আসে। এরপর Redis 8
> licence-এর একটি option হিসেবে AGPL যোগ করে। "আমরা Redis চালাই" কথাটার মানে এখন কয়েকটি fork-এর যেকোনো একটি হতে
> পারে। টেকসই নীতি হলো, data structure আর তাদের atomic guarantee সবগুলোতেই এক। Feature list দেখার আগে licence আর
> fork দেখে নিন।

## কীভাবে কাজ করে

| | Relational | Document (MongoDB) | Key-value (Redis) |
| --- | ---------- | ------------------ | ----------------- |
| একক | Row | Document | Key আর একটি typed value |
| Read | যেকোনো query, join, একটি planner | যে আকারের জন্য design করেছেন, সেই অনুযায়ী | শুধু key দিয়ে |
| Atomic একক | Transaction | একটি document | একটি command |
| Schema | Engine enforce করে | আপনি enforce করেন | নেই |
| Durable | হ্যাঁ | হ্যাঁ | যতটা পারা যায় |

### Document: entity নয়, query-কে model করুন

Relational database-এ আপনি data model করেন, আর তা থেকে query বের করেন। Document database-এ উল্টোটা করেন। আপনি
**query model করেন, আর তা থেকে document বের করেন।** একটি domain-এর জন্য একটিমাত্র সঠিক schema নেই। আছে শুধু একটি,
যেটা আপনার access pattern-এর সাথে মানায়।

"Schemaless" কথাটা engine-এর বর্ণনা, আপনার data-র নয়। প্রতিটি application-এর একটি schema আছে। প্রশ্ন শুধু, সেটা
লিখে রাখা হয়েছে কি না। MongoDB-তে এটা লিখে রাখুন একটি `$jsonSchema` validator হিসেবে, সাথে
`validationLevel: 'strict'`। তাহলে কোনো script বা পুরনো deployment থেকে আসা খারাপ write engine-এই fail করবে।
পরে, যে service সেটা পরের বার পড়বে, সেখানে fail করবে না।

টাকা রাখুন `Decimal128` হিসেবে, কখনো `double` হিসেবে নয়, কারণ binary floating point `0.1 + 0.2`-কে ভুল করে।

**একটি single-document update atomic, তাই filter-টিই আপনার concurrency guard:**

```typescript
interface Order {
  _id: ObjectId;
  userId: ObjectId;
  status: 'pending' | 'processing' | 'paid' | 'cancelled';
  items: { sku: string; qty: number; unitPrice: Decimal128 }[];
  createdAt: Date;
}

const orders = db.collection<Order>('orders');

// Compare-and-swap with no transaction: the write only lands if the status is still 'pending'.
await orders.updateOne(
  { _id: id, status: 'pending' },
  { $set: { status: 'paid', paidAt: new Date() }, $inc: { attempts: 1 } },
);

// Claim the oldest job in one round trip, with no race between workers.
const claimed = await orders.findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'processing', claimedAt: new Date() } },
  { sort: { createdAt: 1 }, returnDocument: 'after' },
);
```

Multi-document transaction আছে, কিন্তু এর জন্য একটি replica set লাগে, আর খরচ অনেক বেশি। সবসময় এটা দরকার হলে বুঝবেন,
আপনি একটি document store-এর ভেতরে table model করেছেন।

### Embed নাকি reference

একটি post তার comment-গুলো একটি array-তে রাখতে পারে, তাহলে এক read-এ দুটোই আসে। অথবা comment-গুলো নিজস্ব
collection-এ থাকতে পারে, একটি indexed `postId` সহ। Access pattern-ই ঠিক করে।

| সংকেত | Embed | Reference |
| ------ | ----- | --------- |
| সবসময় একসাথে পড়া হয়, আর child একা কোনো অর্থ রাখে না | ✅ | |
| ছোট আর সীমিত, যেমন address বা variant | ✅ | |
| সীমা ছাড়া বাড়ে, যেমন comment বা event | | ✅ |
| আলাদাভাবে query হয়, বা অনেক parent ভাগ করে নেয় | | ✅ |

বেশিরভাগ ক্ষেত্রের নিয়ম: **one-to-few embed করুন, one-to-many reference করুন।** একজন user-এর তিনটি address embed
হয়। একটি post-এর comment হয় না, কারণ comment-এর কোনো ঊর্ধ্বসীমা নেই।

> ⚠️ একটি document 16 MB-এর বেশি হতে পারে না। ব্যবহারের সাথে বাড়তে থাকা একটি embedded array সেই সীমায় পৌঁছাবে, আর
> পৌঁছাবে production-এ, আপনার সবচেয়ে active record-এ। যে array-র কোনো স্বাভাবিক সীমা নেই, তার জায়গা নিজস্ব
> collection-এ।

সবচেয়ে কাজের মাঝামাঝি পথ হলো **extended reference**। যে দুই-তিনটি field আপনি সবসময় দেখান, সেগুলো copy করুন, যেমন
`customer: { _id, name }`, আর বাকিটার জন্য reference রাখুন। এতে hot read path থেকে join সরে যায়। দাম হলো rename-এর
পরে একটি পুরনো নাম, তাই কোনো একটা কিছুকে copy-গুলো update করতে হবে।

### Redis: memory-তে, একটি thread-এ

দুটো তথ্য Redis-কে ব্যাখ্যা করে। **Memory-তে** মানে microsecond-এর read, আর একটি কঠিন size limit: RAM। **Single
threaded** মানে প্রতিটি command একা চলে, তাই প্রতিটি atomic। এই কারণেই counter, lock আর queue সেখানে থাকে। এর মানে
এটাও যে একটি ধীর command বাকি সব client-কে আটকে দেয়। এক million key-এর ওপর `KEYS *` পুরো server-কে থামিয়ে দেয়।

| Structure | কী রাখে | কীসের জন্য |
| --------- | ----- | ------- |
| **String** | Byte | Cached JSON, counter (`INCR` atomic), flag |
| **Hash** | Field–value map | এমন session, যেখানে একবারে একটি field update করেন |
| **List** | ক্রমানুসারে সাজানো, দুই প্রান্তেই push আর pop | একটি সাধারণ queue |
| **Set** | Unique member | Tag, কে online আছে |
| **Sorted set** | Score সহ unique member | Leaderboard, sliding window, delayed job |

**Sorted set একটি structure দিয়েই ranking আর time window সামলায়:**

```typescript
// Leaderboard: the score is points.
await redis.zAdd('leaderboard', { score: 4820, value: userId });
const top = await redis.zRangeWithScores('leaderboard', 0, 9, { REV: true });

// Sliding window: the score is a timestamp, so trimming old entries is a range delete.
await redis.zRemRangeByScore(`window:${userId}`, 0, Date.now() - 60_000);
const inWindow = await redis.zCard(`window:${userId}`);
```

### Expiry, eviction আর durability

**প্রতিটি key-কে একটি TTL দিন, যদি না আপনি সেই process-এর নাম বলতে পারেন যেটা সেটা delete করে।** Expiry ছাড়া
cache একটি memory leak। Value আর expiry একই command-এ set করুন, যাতে একটি crash key-টিকে অমর না রেখে যেতে পারে।

**Value আর expiry একসাথে:**

```typescript
await redis.set(key, JSON.stringify(value), { EX: 300 });
```

Memory ভরে গেলে eviction policy ঠিক করে কী বাদ যাবে। শুধু cache হলে `allkeys-lru` ব্যবহার করুন। একই instance-এ
স্থায়ী key থাকলে `volatile-lru` ব্যবহার করুন, কারণ এটা শুধু সেই key-গুলো evict করে, যাদের TTL আছে।

> ⚠️ Default policy হলো `noeviction`। তখন একটি ভরা cache জায়গা করার বদলে write reject করে। প্রতিটি instance-এর জন্য
> policy ইচ্ছা করে বেছে নিন, আর কখনো একটি cache আর একটি queue-এর মধ্যে একটি instance ভাগ করবেন না। চাপের মধ্যে
> eviction এদের আলাদা করে চিনতে পারে না।

Messaging-এর জন্য **Pub/Sub** fire-and-forget। Offline থাকা একজন subscriber message-টি মিস করে। Cache invalidation
বা WebSocket broadcast-এর জন্য এটা ঠিক আছে। **Streams** entry রেখে দেয়, সেগুলো একটি consumer group-এ ভাগ করে, আর
acknowledgement-এর হিসাব রাখে। যে কাজ হতেই হবে, তার জন্য এটা ব্যবহার করুন।

Durability-র ক্ষেত্রে, append-only persistence-ও প্রায় এক সেকেন্ড হারাতে পারে, আর replica asynchronously copy
করে। তাই **Redis কোনো system of record নয়।** যা টিকে থাকতেই হবে, তা আগে একটি durable store-এ লিখুন। Redis দ্রুত
copy-টি রাখে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --------- | ------ | --- |
| একটি document একটি screen-এর সাথে মেলে, আর read-গুলো স্থির | Document store | Join hot path থেকে সরে যায় |
| Record ভেদে attribute বদলায়, যেমন category অনুযায়ী আলাদা field সহ একটি catalogue | Document store | কোনো sparse column নেই, প্রতিটি type-এর জন্য table নেই |
| বেশিরভাগ relational, কয়েকটি flexible field সহ | Postgres `jsonb` | Team-গুলো যে কারণে MongoDB-র দিকে যায়, তার বেশিরভাগ এতেই হয় |
| Relational data, অনিশ্চিত query, reporting | Postgres | Join আর একটি query planner-ই আসল কথা |
| টাকা, order, যা কিছু হারানো যাবে না | Postgres | সত্যিকারের transaction আর durability |
| Session, cache, counter, rate limit, leaderboard | Redis | Microsecond-এর read, atomic command |
| RAM-এর চেয়ে বড় data, বা ad-hoc query | Redis নয় | Memory-ই সীমা, আর কোনো planner নেই |
| Retry আর dead letter সহ একটি job queue | Redis-এর ওপর একটি queue library | Streams primitive দেয়, framework নয় |

Senior-দের default হলো Postgres-কে system of record রাখা, পাশে speed-এর জন্য Redis। Document store-এর দিকে যান
তখনই, যখন data সত্যিই একটি tree, যেটা আপনি পুরোটা একসাথে পড়েন।

## সাধারণ ভুল

**❌ MongoDB-তে entity diagram model করা।** আপনি join পান না, read-এর কোনো সুবিধাও পান না।
**✅ Screen থেকে শুরু করুন।** Read-গুলোর তালিকা করুন, তারপর সেগুলোর কাজে লাগে এমনভাবে document সাজান।

**❌ বেশিরভাগ read-এ `$lookup`।** প্রতিটি request-এ collection join করা মানে model কোনো কাজে আসছে না।
**✅ একটি relational database ব্যবহার করুন,** অথবা extended reference দিয়ে দরকারি field-গুলো copy করুন।

**❌ Application code-এ `KEYS *`।** পুরো scan-এর সময় এটা single thread-টিকে আটকে রাখে।
**✅ `SCAN` ব্যবহার করুন,** যেটা ছোট ছোট ধাপে key-গুলো ঘুরে দেখে, অথবা যে key-গুলোর তালিকা দরকার, সেগুলোর একটি set রাখুন।

**❌ একটি Redis lock-কে guarantee ভাবা।** `SET key value NX EX 30` একটি lease, mutex নয়। Holder expiry পেরিয়ে
থেমে থাকলে, দুটো process-ই ভাবে lock তাদের হাতে।
**✅ এটা best-effort coordination-এর জন্য ব্যবহার করুন,** আর সুরক্ষিত operation-টিকে idempotent করুন।

## 🔑 মূল শিক্ষা

- একটি document store আপনি যে আকারে পড়েন, সেই আকারটাই রাখে, আর দাম হলো duplication, যেটা আপনাকে নিজেই মিলিয়ে রাখতে হয়।
- একটি single-document update atomic, তাই filter-এ প্রত্যাশিত state রাখলে আপনি compare-and-swap পান।
- One-to-few embed করুন আর সীমাহীন যেকোনো কিছু reference করুন, কারণ 16 MB একটি কঠিন সীমা।
- Redis প্রতিটি command এক thread-এ atomically চালায়, যার মানে একটি ধীর command প্রতিটি client-কে থামিয়ে দেয়।
- Redis কোনো system of record নয়: প্রতিটি key-কে একটি TTL দিন, eviction policy বেছে নিন, আর সত্যিকারের data Postgres-এ রাখুন।

## Interview-এর প্রশ্ন

**Q: আপনি কখন Postgres-এর বদলে MongoDB বেছে নেবেন?**

যখন data একটি tree, যেটা পুরোটা একসাথে পড়েন, read pattern জানা আর স্থির, আর একটি document একটি screen-এর সাথে
মেলে। Category অনুযায়ী আলাদা field সহ একটি catalogue হলো ক্লাসিক উদাহরণ। Query অনিশ্চিত হলে, data relational হলে,
বা reporting গুরুত্বপূর্ণ হলে Postgres জেতে। Team-গুলো MongoDB-র কাছে যা পেতে যায়, তার বেশিরভাগই এর `jsonb` দিয়ে
হয়ে যায়।

**Q: Embed করবেন নাকি reference, সেটা কীভাবে ঠিক করেন?**

Access pattern আর বৃদ্ধির সীমা দিয়ে। Child যখন সবসময় parent-এর সাথে পড়া হয়, তার নিজস্ব কোনো পরিচয় নেই, আর ছোটই
থাকে, তখন embed করুন। যখন সীমা ছাড়া বাড়ে, আলাদাভাবে query হয়, বা ভাগ করে নেওয়া হয়, তখন reference করুন। 16 MB-এর
limit "সীমাহীন" কথাটাকে style-এর প্রশ্ন থেকে একটি কঠিন বাধ্যবাধকতায় পরিণত করে।

**Q: Redis single-threaded। তাহলে এটা দ্রুত কীভাবে, আর ঝুঁকি কী?**

সবকিছু memory-তে, আর কোনো lock contention বা context switching নেই। প্রতিটি command microsecond নেয়। ঝুঁকি হলো,
একটি ব্যয়বহুল command, যেমন `KEYS` বা একটি loop চালানো Lua script, বাকি প্রতিটি client-কে আটকে দেয়। সেটা পুরো
application জুড়ে একটি latency spike হয়ে দেখা দেয়।

**Q: Pub/Sub নাকি Streams?**

যে fan-out হারানো চলে, তার জন্য Pub/Sub: cache invalidation, presence, WebSocket broadcast। Message process হতেই
হলে Streams। এরা entry রেখে দেয়, একটি consumer group-কে load ভাগ করে নিতে দেয়, আর unacknowledged entry-র হিসাব
রাখে, যাতে crash হওয়া worker-এর message আবার দাবি করা যায়।

**Q: একটি team নতুন একটি orders service-এর একমাত্র database হিসেবে Redis চায়। আপনি কী বলবেন?**

না, আর কারণ হলো durability। Append-only persistence-ও এক সেকেন্ড হারাতে পারে, আর replica asynchronously copy
করে, তাই failover-এ একটি order হারিয়ে যেতে পারে। Order-এর জন্য সবসময় যে reporting লাগে, তার জন্য Redis-এ কোনো join
বা planner-ও নেই। Order Postgres-এ রাখুন, আর session ও hot read-এর জন্য সামনে Redis ব্যবহার করুন।

## এরপর কী পড়বেন

- [Chapter ?? — SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) — normalised বিকল্পটি, ন্যায্যভাবে বলা
- [Chapter ?? — Caching](#ch-caching) — read-through, write-behind আর invalidation, Redis-এর ওপর তৈরি
- [Chapter ?? — Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore) — এক ধাপ ওপরের সিদ্ধান্ত, replication আর sharding সহ
