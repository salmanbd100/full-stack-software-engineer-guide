---
sourceHash: "ef3018d986924097fbb9853124927fa874e929d8d5669bceb9d04e34f731b5d3"
title: "Non-Relational Store বাছাই: Document ও Redis"
translatedAt: "2026-10-17T14:03:27.652Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Non-Relational Store বাছাই: Document ও Redis {#ch-document-databases}

> কখন document model মানায়, কখন Redis মানায়, আর কখন উত্তর এখনও Postgres — বলুন, আর প্রতিটি পছন্দের দাম কী তাও বলুন।

**এই অধ্যায়ে:** প্রতিটি store কী ছেড়ে দেয় · query থেকে document-এর model · embed নাকি reference · Redis structure, expiry আর eviction · কখন Postgres জেতে

## 💡 মূল ধারণা

Relational database প্রতিটি তথ্য একবারই রাখে। যে shape আপনার দরকার, সেটা read-এর সময় join দিয়ে আবার গড়ে নেয়। এই
অধ্যায়ের দুটি store সেটা ছেড়ে দেয়, আর বিনিময়ে প্রতিটি কিছু একটা পায়।

**Document database** রাখে ঠিক সেই shape, যেটা application পড়ে। Variant আর ছবিসহ একটি product page মানে একবার fetch,
চারটি table-এর join নয়। দাম হলো duplication। কোনো value দশ হাজার document-এ copy হলে সবগুলো copy একসঙ্গে ঠিক রাখা
এখন আপনার কাজ।

**Redis** value রাখে memory-তে, একটি key-এর নিচে, একটি thread-এ। Read হয় microsecond-এ, আর lock ছাড়াই প্রতিটি command
atomic। দাম হলো data-কে RAM-এ আঁটতে হবে। তা ছাড়া crash হলে শেষ এক সেকেন্ডের write হারিয়ে যেতে পারে।

তাই প্রশ্নটা কখনো "SQL নাকি NoSQL" নয়। প্রশ্ন হলো: আমি কী পড়ি, আর কী হারানোর সামর্থ্য আমার আছে?

> ⚠️ **যা বদলাতে থাকে:** API নয়, licence। Redis 2024-এ open source ছেড়ে দেয়, তারপর আসে Valkey fork। এরপর Redis 8
> licence-এর একটি বিকল্প হিসেবে AGPL যোগ করে। "আমরা Redis চালাই" কথাটার মানে এখন কয়েকটি fork-এর যেকোনো একটি হতে পারে।
> টেকসই নীতি হলো, data structure আর তাদের atomic নিশ্চয়তা সবগুলোতেই একই। Feature list দেখার আগে licence আর fork
> দেখে নিন।

## কীভাবে কাজ করে

| | Relational | Document (MongoDB) | Key-value (Redis) |
| --- | ---------- | ------------------ | ----------------- |
| একক | Row | Document | Key আর typed value |
| Read | যেকোনো query, join, planner | যে shape-এর জন্য design করেছেন, সেভাবে | শুধু key দিয়ে |
| Atomic একক | Transaction | একটি document | একটি command |
| Schema | Engine মানায় | আপনি মানান | নেই |
| Durable | হ্যাঁ | হ্যাঁ | যথাসাধ্য |

### Document: entity নয়, query-র model বানান

Relational database-এ আপনি data-র model বানান, আর তা থেকে query বের করেন। Document database-এ ঠিক উল্টো। আপনি
**query-র model বানান, আর তা থেকে document বের করেন।** কোনো domain-এর একটিমাত্র সঠিক schema নেই। আছে শুধু সেটা, যা আপনার
access pattern-এর সঙ্গে মানায়।

"Schemaless" কথাটা engine-এর বর্ণনা, আপনার data-র নয়। প্রতিটি application-এরই schema আছে। প্রশ্ন শুধু সেটা কোথাও লেখা
আছে কি না। MongoDB-তে সেটা লিখে রাখুন `validationLevel: 'strict'`-সহ একটি `$jsonSchema` validator হিসেবে। তাহলে কোনো
script বা পুরনো deployment থেকে আসা খারাপ write engine-এই fail করে। পরে, যে service সেটা পরের বার পড়বে সেখানে গিয়ে
fail করে না।

টাকা রাখুন `Decimal128` হিসেবে, কখনো `double` নয়, কারণ binary floating point-এ `0.1 + 0.2` ভুল আসে।

**একটি document-এর update atomic, তাই filter-ই আপনার concurrency-র পাহারাদার:**

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

Multi-document transaction আছে, কিন্তু তার জন্য replica set লাগে, আর খরচও অনেক বেশি। সারাক্ষণ সেটা লাগা মানে আপনি
document store-এর ভেতরে table-এর model বানিয়েছেন।

### Embed নাকি reference

একটি post তার comment-গুলো একটি array-তে রাখতে পারে, তাহলে এক read-এই দুটি পাওয়া যায়। অথবা comment থাকতে পারে নিজের
collection-এ, index করা একটি `postId`-সহ। কোনটা হবে, ঠিক করে access pattern।

| সংকেত | Embed | Reference |
| ------ | ----- | --------- |
| সবসময় একসঙ্গে পড়া হয়, আর child-এর একা কোনো অর্থ নেই | ✅ | |
| ছোট আর সীমিত, যেমন address বা variant | ✅ | |
| সীমাহীনভাবে বাড়ে, যেমন comment বা event | | ✅ |
| আলাদাভাবে query হয়, বা অনেক parent-এর মধ্যে ভাগ হয় | | ✅ |

বেশিরভাগ ক্ষেত্রে নিয়ম: **one-to-few হলে embed, one-to-many হলে reference।** একজন user-এর তিনটি address embed হয়।
Post-এর comment হয় না, কারণ comment-এর কোনো ঊর্ধ্বসীমা নেই।

> ⚠️ একটি document 16 MB-এর বেশি হতে পারে না। ব্যবহারের সঙ্গে বাড়তে থাকা embedded array একদিন সেই ছাদে ধাক্কা খাবে,
> আর খাবে production-এ, আপনার সবচেয়ে ব্যস্ত record-এ। যে array-এর কোনো স্বাভাবিক সীমা নেই, তার জায়গা নিজের collection-এ।

সবচেয়ে কাজের মাঝামাঝি পথ হলো **extended reference**। যে দুই-তিনটি field সবসময় দেখান, যেমন `customer: { _id, name }`,
সেগুলো copy করে রাখুন, আর বাকিটার জন্য reference রেখে দিন। এতে hot read path থেকে join সরে যায়। দাম হলো নাম বদলালে
copy-তে পুরনো নাম থেকে যায়, তাই কাউকে না কাউকে copy-গুলো update করতে হবে।

### Redis: memory-তে, একটি thread-এ

দুটি তথ্য জানলেই Redis বোঝা যায়। **Memory-তে** মানে microsecond-এ read, আর আকারের একটি কড়া সীমা: RAM। **Single
threaded** মানে প্রতিটি command একা চলে, তাই প্রতিটি atomic। এ কারণেই counter, lock আর queue সেখানে থাকে। এর আরেকটি মানে,
একটি ধীর command বাকি সব client-কে আটকে দেয়। দশ লাখ key-এর ওপর `KEYS *` চালালে পুরো server থমকে যায়।

| Structure | কী রাখে | কীসের জন্য |
| --------- | ----- | ------- |
| **String** | Byte | Cache করা JSON, counter (`INCR` atomic), flag |
| **Hash** | Field–value map | এমন session, যেখানে একবারে একটি field update করেন |
| **List** | ক্রম মেনে সাজানো, দুই দিক থেকেই push আর pop | সাধারণ queue |
| **Set** | অনন্য member | Tag, কে online আছে |
| **Sorted set** | Score-সহ অনন্য member | Leaderboard, sliding window, দেরিতে চলা job |

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

**প্রতিটি key-তে TTL দিন, যদি না কোন process সেটা মুছবে তার নাম বলতে পারেন।** Expiry ছাড়া cache মানে memory leak।
Value আর expiry একই command-এ সেট করুন, যাতে crash হলে key অমর হয়ে না থাকে।

**Value আর expiry একসঙ্গে:**

```typescript
await redis.set(key, JSON.stringify(value), { EX: 300 });
```

Memory ভরে গেলে কী সরবে, ঠিক করে eviction policy। শুধু cache হলে `allkeys-lru` ব্যবহার করুন। একই instance-এ স্থায়ী key-ও
থাকলে `volatile-lru`, কারণ এটা শুধু TTL-ওয়ালা key সরায়।

> ⚠️ Default policy হলো `noeviction`। তখন ভরা cache জায়গা না করে write ফিরিয়ে দেয়। প্রতিটি instance-এর policy জেনে-বুঝে
> বাছুন, আর কখনো একই instance cache আর queue-এর মধ্যে ভাগ করবেন না। চাপের মধ্যে eviction দুটিকে আলাদা করে চিনতে পারে না।

Messaging-এর ক্ষেত্রে **Pub/Sub** পাঠিয়ে ভুলে যাওয়ার মতো। Subscriber offline থাকলে message-টা আর পায় না। Cache
invalidation বা WebSocket broadcast-এর জন্য এটা ঠিক আছে। **Streams** entry রেখে দেয়, consumer group-এর মধ্যে সেগুলো
ভাগ করে, আর acknowledgement-এর হিসাব রাখে। যে কাজ হতেই হবে, তার জন্য এটা ব্যবহার করুন।

Durability-র দিক থেকে, append-only persistence-এও প্রায় এক সেকেন্ড হারাতে পারে, আর replica copy করে asynchronously। তাই
**Redis system of record নয়।** যা টিকে থাকতেই হবে, তা আগে একটি durable store-এ লিখুন। Redis রাখে দ্রুত copy-টা।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --------- | ------ | --- |
| একটি document একটি screen-এর সঙ্গে মেলে, আর read-এর ধরন স্থির | Document store | Hot path থেকে join সরে যায় |
| Record ভেদে attribute আলাদা, যেমন category অনুযায়ী আলাদা field-ওয়ালা catalogue | Document store | ফাঁকা column নেই, প্রতিটি type-এর জন্য আলাদা table নেই |
| বেশিরভাগই relational, অল্প কিছু নমনীয় field | Postgres `jsonb` | দল যে কারণে MongoDB-র দিকে যায়, তার বেশিরভাগ এতেই মেটে |
| Relational data, আগে থেকে না জানা query, reporting | Postgres | Join আর query planner-ই তো আসল কথা |
| টাকা, order, যা কিছু হারানো চলে না | Postgres | সত্যিকারের transaction আর durability |
| Session, cache, counter, rate limit, leaderboard | Redis | Microsecond-এ read, atomic command |
| RAM-এর চেয়ে বড় data, বা ad-hoc query | Redis নয় | Memory-ই সীমা, আর কোনো planner নেই |
| Retry আর dead letter-সহ job queue | Redis-এর ওপর একটি queue library | Streams দেয় primitive, framework নয় |

Senior-দের default হলো system of record হিসেবে Postgres, পাশে গতির জন্য Redis। Document store-এর দিকে যান তখন, যখন data
সত্যিই একটি tree, যা আপনি পুরোটা একসঙ্গে পড়েন।

## সাধারণ ভুল

**❌ MongoDB-তে entity diagram-এর model বানানো।** Join-ও পান না, read-এর কোনো সুবিধাও পান না।
**✅ Screen থেকে শুরু করুন।** Read-গুলোর তালিকা করুন, তারপর সেগুলোর কাজে লাগার মতো করে document গড়ুন।

**❌ বেশিরভাগ read-এ `$lookup`।** প্রতিটি request-এ collection join করা মানে model কিছুই এনে দিচ্ছে না।
**✅ Relational database ব্যবহার করুন,** অথবা extended reference দিয়ে দরকারি field-গুলো copy করে রাখুন।

**❌ Application code-এ `KEYS *`।** পুরো scan যতক্ষণ চলে, ততক্ষণ একমাত্র thread-টা আটকে থাকে।
**✅ `SCAN` ব্যবহার করুন,** যা ছোট ছোট ধাপে key-গুলো পেরোয়, অথবা যে key-গুলোর তালিকা লাগবে সেগুলোর একটি set রাখুন।

**❌ Redis lock-কে নিশ্চয়তা ভাবা।** `SET key value NX EX 30` একটি lease, mutex নয়। Lock যে process-এর হাতে, সেটা যদি expiry পেরিয়েও
থেমে থাকে, তাহলে দুটি process-ই ভাবে lock তাদের হাতে।
**✅ যথাসাধ্য সমন্বয়ের জন্য এটা ব্যবহার করুন,** আর যে কাজটা রক্ষা করছেন সেটাকে idempotent করুন।

## 🔑 মূল শিক্ষা

- Document store রাখে সেই shape, যেটা আপনি পড়েন। দাম হলো duplication, যার সব copy আপনাকেই মিলিয়ে রাখতে হবে।
- একটি document-এর update atomic, তাই filter-এ প্রত্যাশিত অবস্থাটা দিলে compare-and-swap পেয়ে যান।
- One-to-few হলে embed, আর সীমাহীন যেকোনো কিছু হলে reference, কারণ 16 MB একটি কড়া ছাদ।
- Redis প্রতিটি command একটি thread-এ atomic-ভাবে চালায়, তাই একটি ধীর command প্রতিটি client-কে থামিয়ে দেয়।
- Redis system of record নয়: প্রতিটি key-তে TTL দিন, eviction policy বাছুন, আর সত্যিকারের data রাখুন Postgres-এ।

## Interview-এর প্রশ্ন

**Q: কখন Postgres-এর বদলে MongoDB বাছবেন?**

যখন data একটি tree যা পুরোটা একসঙ্গে পড়া হয়, read-এর ধরন জানা আর স্থির, আর একটি document একটি screen-এর সঙ্গে মেলে।
Category অনুযায়ী আলাদা field-ওয়ালা catalogue এর চেনা উদাহরণ। Query আগে থেকে জানা না থাকলে, data relational হলে, বা
reporting জরুরি হলে Postgres জেতে। দল যা পেতে MongoDB-র দিকে যায়, তার বেশিরভাগ Postgres-এর `jsonb`-ই দিয়ে দেয়।

**Q: Embed করবেন নাকি reference, কীভাবে ঠিক করেন?**

Access pattern আর কতটা বাড়তে পারে তার সীমা দেখে। Child যদি সবসময় parent-এর সঙ্গে পড়া হয়, নিজের কোনো পরিচয় না থাকে,
আর ছোট থাকে, তাহলে embed। যদি সীমাহীনভাবে বাড়ে, আলাদাভাবে query হয়, বা ভাগ হয়, তাহলে reference। 16 MB-এর সীমা
"সীমাহীন" কথাটাকে রুচির প্রশ্ন থেকে একটি কড়া constraint বানিয়ে দেয়।

**Q: Redis single-threaded। তাহলে এত দ্রুত কীভাবে, আর ঝুঁকিটা কী?**

সবকিছু memory-তে, আর lock নিয়ে কাড়াকাড়ি বা context switching নেই। প্রতিটি command microsecond-এ শেষ হয়। ঝুঁকি হলো একটি
দামি command, যেমন `KEYS` বা loop চালানো Lua script, বাকি সব client-কে আটকে দেয়। পুরো application জুড়ে latency হঠাৎ
বেড়ে যাওয়া হিসেবে এটা চোখে পড়ে।

**Q: Pub/Sub নাকি Streams?**

যে fan-out হারালেও চলে, তার জন্য Pub/Sub: cache invalidation, presence, WebSocket broadcast। Message যখন process হতেই হবে,
তখন Streams। Streams entry রেখে দেয়, consumer group-কে কাজ ভাগ করে নিতে দেয়, আর acknowledge না হওয়া entry-র হিসাব রাখে,
যাতে crash করা worker-এর message আবার দাবি করা যায়।

**Q: একটি দল নতুন orders service-এর একমাত্র database হিসেবে Redis চায়। কী বলবেন?**

না, আর কারণ durability। Append-only persistence-এও এক সেকেন্ড হারাতে পারে, আর replica copy করে asynchronously, তাই
failover-এ একটি order হারিয়ে যেতে পারে। তা ছাড়া order-এর ক্ষেত্রে যে reporting সবসময় লাগে, তার জন্য Redis-এ join বা
planner নেই। Order রাখুন Postgres-এ, আর session ও hot read-এর জন্য সামনে Redis বসান।

## এরপর কী পড়বেন

- [Chapter ?? — SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) — normalise করা বিকল্পটি, ন্যায্যভাবে বলা
- [Chapter ?? — Caching](#ch-caching) — Redis-এর ওপর গড়া read-through, write-behind আর invalidation
- [Chapter ?? — Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore) — এক স্তর ওপরের সিদ্ধান্ত, replication আর sharding-সহ
