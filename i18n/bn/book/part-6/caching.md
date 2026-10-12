---
sourceHash: "c8ccbfedf9aed509611a750f76894cf01b5803dd8fd5e2ee4c039dfd7d2f6c1b"
title: "Caching"
translatedAt: "2026-10-12T12:26:46.100Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Caching {#ch-caching}

> Cache-কে ঠিক layer-এ রাখুন, একটি hit ratio-র দাম কত তা জানুন, আর প্রতিটি entry কীভাবে ভুল হয়ে যায় তার একটি উত্তর তৈরি রাখুন।

**এই অধ্যায়ে:** capacity-র গুণক হিসেবে hit ratio · চারটি pattern · কী cache করবেন না · stampede · warm-up আর TTL jitter

## 💡 মূল ধারণা

Cache এমন data-র একটি copy রাখে, যা তৈরি করতে খরচ বেশি, এমন জায়গায় যেখান থেকে পড়া সস্তা। পুরো mechanism এটুকুই।
হিসাবটাই একে system design-এর সবচেয়ে শক্তিশালী চাল বানায়। Cache database-কে দ্রুত করে না। বেশিরভাগ request-কে
database পর্যন্ত পৌঁছাতেই দেয় না।

এতে দেখার ভঙ্গি বদলে যায়। Caching কোনো performance-এর কৌশল নয়, যা পরে যোগ করবেন। এটা capacity-র একটি
সিদ্ধান্ত, যা server কেনার আগেই নিতে হয়। কঠিন অংশটা কখনোই store করা ছিল না। কঠিন হলো জানা, store করা copy-টি কখন
আর সত্য নেই।

## কীভাবে কাজ করে

### যে হিসাব একে যুক্তিসঙ্গত করে

Hit ratio হলো hit-এর সংখ্যাকে মোট lookup দিয়ে ভাগ করা। আর আসল গুরুত্ব origin-এ যা পৌঁছায় সেই সংখ্যার:

```text
10,000 req/s with no cache        -> 10,000 database queries/s
10,000 req/s at 90% hit ratio     ->  1,000 database queries/s
10,000 req/s at 95% hit ratio     ->    500 database queries/s
```

90% থেকে 95%-এ গেলে database-এর load অর্ধেক হয়ে যায়। Curve-টির আকারই এমন। এ কারণেই প্রায় প্রতিবার
"hit ratio বাড়ান" "একটি replica যোগ করুন"-কে হারিয়ে দেয়। 50%-এর নিচে cache তার জটিলতার দাম তুলতে পারে না। হয়
TTL খুব ছোট, নয়তো working set-এর (সক্রিয় ব্যবহারে থাকা key-গুলো) জন্য cache খুব ছোট, নয়তো data সত্যিই
পুনরাবৃত্ত হয় না।

### চারটি pattern

| Pattern | Cache-এ কে লেখে | Consistency | কখন ব্যবহার করবেন |
| --- | --- | --- | --- |
| **Cache-aside** | Application, miss হলে | Eventual | Read-heavy, সাধারণ কাজ — default |
| **Read-through** | Cache নিজেই, miss হলে | Eventual | Miss-এর logic প্রতিটি caller-এ নয়, এক জায়গায় চান |
| **Write-through** | Application দুটোতেই লেখে | Read-after-write-এ strong | Write কম, আর stale read গ্রহণযোগ্য নয় |
| **Write-behind** | Cache asynchronously flush করে | Eventual, আর crash হলে data হারায় | Write-heavy counter আর metric |

**Cache-aside, সঙ্গে যে invalidation অবশ্যই থাকতে হবে:**

```typescript
interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

async function getProduct(
  cache: CacheClient,
  db: DatabaseClient,
  productId: string,
): Promise<Product> {
  const key = `product:${productId}`; // keyed per entity, never `product:latest`

  const cached = await cache.get<Product>(key);
  if (cached) return cached;

  const product = await db.findProduct(productId);
  await cache.set(key, product, 300);
  return product;
}

// The write path owns the eviction. Skipping this line is how staleness ships.
async function updateProduct(
  cache: CacheClient,
  db: DatabaseClient,
  productId: string,
  updates: Partial<Product>,
): Promise<void> {
  await db.updateProduct(productId, updates);
  await cache.del(`product:${productId}`);
}
```

### কী cache করবেন, আর কী নয়

সিদ্ধান্তটা দুটো প্রশ্নে: কতবার পড়া হয়, আর কত দ্রুত বদলায়।

| Data | Read | বদলায় | রায় |
| --- | --- | --- | --- |
| Product catalogue | বেশি | কদাচিৎ | Cache করুন, 5–30 min TTL, update-এ evict |
| Homepage aggregation | বেশি | কদাচিৎ | Cache করুন, 1–5 min TTL — query-টি ব্যয়বহুল, উত্তরটি সবার জন্য এক |
| User profile | বেশি | মাঝে মাঝে | প্রতি user-এ cache, 5–15 min, update-এ evict |
| Live price বা stock level | বেশি | সারাক্ষণ | Cache করবেন না — কয়েক সেকেন্ডেই stale, আর ভুল হওয়া ধীর হওয়ার চেয়ে খারাপ |
| একজন user-এর balance বা order state | মাঝারি | মাঝে মাঝে | Shared cache-এ কখনো নয়; শুধু per-user key, ছোট TTL |
| One-time token | একবার | — | লাভ কিছু নেই; cache read মানে leak হওয়ার দ্বিতীয় একটি জায়গা |

### Eviction আর store বাছাই

Memory ভরে গেলে কিছু একটা সরাতে হয়। **LRU** (সবচেয়ে কম সম্প্রতি ব্যবহৃতটা evict করা) ঠিক default।
এর জন্য Redis-এ `maxmemory-policy allkeys-lru` দরকার: শুধু `maxmemory` set করা থাকলে সে বরং write reject করে।
**LFU** (সবচেয়ে কম বার ব্যবহৃত) জেতে দীর্ঘ সময় চলা cache-এ, যেখানে hot set স্থির, আর সাম্প্রতিকতা ভুল পথে নেয়।
TTL expiry আসলে eviction নয়। এটা আপনার ঘোষণা, একটি copy কতক্ষণ ভুল থাকতে পারে।

নতুন system-এর জন্য Redis default cache store। এতে string-এর বাইরেও data structure আছে, replication,
clustering আর persistence আছে। Memcached জেতে শুধু চরম scale-এ বিশুদ্ধ key-value কাজের raw throughput-এ, আর
বাকি সবকিছু ছেড়ে দেয়।

### Stampede

একটি hot key expire হলে, চলমান প্রতিটি request একই মুহূর্তে miss করে, আর সবাই একসঙ্গে database-এ গিয়ে পড়ে।
দুটো প্রতিরক্ষা আছে, আর তারা একসঙ্গে কাজ করে:

```typescript
// 1. Jitter, so related keys stop expiring in the same second.
function jitteredTtl(baseSeconds: number, jitter = 0.1): number {
  const spread = baseSeconds * jitter;
  return Math.round(baseSeconds + (Math.random() * 2 - 1) * spread);
}

// 2. A lock, so exactly one request recomputes and the rest wait, then retry.
async function getWithLock(cache: CacheClient, db: DatabaseClient, productId: string): Promise<Product> {
  const key = `product:${productId}`;
  const cached = await cache.get<Product>(key);
  if (cached) return cached;

  // SET NX EX — the first caller wins the lock; the others wait and read what it wrote.
  if (!(await cache.setIfAbsent(`${key}:lock`, "1", 10))) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return getWithLock(cache, db, productId);
  }
  const fresh = await db.findProduct(productId);
  await cache.set(key, fresh, jitteredTtl(300));
  await cache.del(`${key}:lock`);
  return fresh;
}
```

> ⚠️ Deploy আসলে ছদ্মবেশী stampede। নতুন instance ঠান্ডা local cache নিয়ে শুরু হয়। Shared cache-ও যদি flush
> হয়ে থাকে, traffic-এর প্রথম মিনিটের পুরোটাই database-এ যায়। Peak সময়ে ঠিক সেই মুহূর্তেই সেটা ভেঙে পড়ে।

### Deploy-এর সময় warm-up

যে অল্প কয়েকটি key-তে hit হবে বলে জানেন, সেগুলো ভরে নিন: homepage-এর query, feature flag, configuration
blob। এটা করুন একটি **readiness gate** হিসেবে, cutover-এর পরে background task হিসেবে নয়। যে instance cache
গরম হওয়ার আগেই traffic নেয়, সে তার প্রথম সব request database-এ পাঠায়। Rolling deploy প্রতিটি instance-এর
জন্য একবার করে এটা পুনরাবৃত্তি করে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Cache কোথায় যায় |
| --- | --- |
| একই query হাজার হাজার user-কে serve করে | Shared cache, entity অনুযায়ী key, মিনিটের TTL |
| ব্যয়বহুল aggregation, এক মিনিটের দেরি সহ্য করা যায় | Shared cache, ছোট TTL, invalidation লাগে না |
| একটি session-এ বারবার পড়া per-user data | Per-user key, ছোট TTL, write-এ evict |
| Unauthenticated client-কে public response | আরও বাইরে — CDN, আপনার cache নয় |
| যে data-কে একদম ঠিক হতেই হবে | Cache নয়; index বা read replica দিয়ে সমাধান করুন |

## সাধারণ ভুল

❌ **TTL নেই।** Expiry ছাড়া একটি key, invalidation path একবার miss করলেই, চিরকালের জন্য stale। ✅ সবসময়
একটি TTL set করুন, উদার হলেও। এটা সেই invalidation-এর backstop, যেটা আপনি ভুলে গেছেন।

❌ **Per-user data-র জন্য shared key।** `cart:latest` একজন customer-এর basket পরের জনকে serve করে। ✅ User বা
entity-র id key-তে যায়, সবসময়।

❌ **কোথাও invalidate না করা।** Read path লেখা হয়েছে, write path হয়নি, আর update দেখা দিতে পুরো একটি TTL লাগে।
✅ Eviction-এর জায়গা write-এর একই function-এ।

❌ **Cache-কে store হিসেবে ব্যবহার করা।** Redis restart হয়। Data যদি database-এও না থাকে, সেটা স্রেফ হারিয়ে
যায়। ✅ Cache-এর সবকিছু source of truth থেকে আবার তৈরি করা যেতে হবে।

❌ **Deploy-এর সময় set করা একই রকম TTL।** প্রতিটি key একই সেকেন্ডে expire হয়, আর stampede-টা নিজেরই ডেকে আনা।
✅ দশ শতাংশ jitter দিন।

## 🔑 মূল শিক্ষা

- Cache একটি capacity-র গুণক: hit ratio 90% থেকে 95% হলে database-এ পৌঁছানো load অর্ধেক হয়।
- Cache-aside আর TTL বেশিরভাগ system-এর জন্য যথেষ্ট। এটা কাজ না করলে তবেই অন্য pattern-এর দিকে যান।
- Invalidation-এর দায় write path-এর। শুধু read path লিখলে এভাবেই stale data ship হয়।
- Hit ratio 50%-এর নিচে হলে cache যা বাঁচায় তার চেয়ে বেশি খরচ করে। TTL, size, বা key ঠিক করুন।
- TTL-এ jitter দিন আর hot key গরম করে রাখুন, নইলে একটি deploy পুরো load একসঙ্গে database-এর হাতে তুলে দেবে।

## Interview-এর প্রশ্ন

**Q: কোন caching pattern দিয়ে শুরু করবেন, আর কেন?**

Cache-aside। Application প্রথমে cache দেখে, miss হলে database-এ যায়, আর যা পেল তা cache-এ লেখে। এতে cache
write path-এর বাইরে থাকে, তাই cache outage latency-র ক্ষতি করে, correctness-এর নয়। এটা শুধু তা-ই cache করে,
যা আসলে পড়া হয়। খরচ হলো, প্রতিটি caller-কে invalidation মনে রাখতে হয়। এ কারণেই eviction-এর জায়গা update
function-এর ভেতরে, call site-এ নয়।

**Q: TTL কীভাবে ঠিক করেন?**

শুরু করুন data কতটা ভুল হওয়ার অনুমতি আছে তা থেকে, কতক্ষণ cache করতে চান তা থেকে নয়। পাঁচ মিনিট stale একটি
product listing ঠিক আছে। একটি account balance কোনো TTL-এই cache করার মতো নয়। তারপর hit ratio দেখুন। এটা কম হলে,
TTL key-গুলোকে আবার ব্যবহারের আগেই expire করে দিচ্ছে। Write-এ explicit eviction থাকলে নিরাপদে লম্বা TTL চালাতে
পারেন। তখন TTL আর freshness-এর প্রধান mechanism থাকে না, backstop হয়ে যায়।

**Q: একটি hot key expire হলো আর database ভেঙে পড়ল। কী ঘটেছে, আর আপনি কী করবেন?**

Cache stampede। একসঙ্গে চলা প্রতিটি request একই মুহূর্তে miss করেছে আর সবাই একসঙ্গে origin-এ গেছে। তিনটি
সমাধান খাটে। একটি lock শুধু একটি request-কে recompute করতে দেয়, বাকিরা অপেক্ষা করে বা stale serve করে। Jitter
দেওয়া TTL সম্পর্কিত key-গুলোকে একই সেকেন্ডে expire হতে দেয় না। আর পরিচিত hot key আগে থেকে গরম করে রাখলে,
deploy traffic পাঠানোর আগে ঠান্ডা instance-গুলো সুরক্ষিত থাকে।

**Q: কখন caching ভুল উত্তর?**

যখন data পড়ার চেয়ে দ্রুত বদলায়, বা পড়ার মুহূর্তেই একদম ঠিক হতে হবে। আবার যখন traffic-এ কোনো পুনরাবৃত্তি নেই।
প্রতিটি request অনন্য হলে প্রতিটি lookup-ই miss, আর আপনি এমন কিছু store করার দাম দেন, যা আর কেউ চায় না। তখন
আসল সমাধান সাধারণত একটি index, একটি read replica, বা একটি সস্তা query।

## এরপর কী পড়বেন

- [Chapter ?? — Content Delivery Network](#ch-cdn) — একই ধারণা, edge-এ সরিয়ে নেওয়া
- [Chapter ?? — Non-Relational Store বাছাই: Document ও Redis](#ch-document-databases) — store নিজে, আর get ও set-এর বাইরের structure
- [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) — user-এর সবচেয়ে কাছের layer
