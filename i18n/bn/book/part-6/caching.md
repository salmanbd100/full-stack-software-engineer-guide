---
sourceHash: "c8ccbfedf9aed509611a750f76894cf01b5803dd8fd5e2ee4c039dfd7d2f6c1b"
title: "Caching"
translatedAt: "2026-10-17T13:58:53.812Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Caching {#ch-caching}

> Cache রাখুন ঠিক layer-এ, hit ratio-র দাম কত তা জানুন, আর প্রতিটি entry কীভাবে ভুল হয়ে যায় তার একটি উত্তর তৈরি রাখুন।

**এই অধ্যায়ে:** capacity-র গুণক হিসেবে hit ratio · চারটি pattern · কী cache করবেন না · stampede · warm-up আর TTL jitter

## 💡 মূল ধারণা

যে data তৈরি করতে খরচ বেশি, cache তার একটি copy এমন জায়গায় রাখে যেখান থেকে পড়া সস্তা। পুরো কৌশলটা এটুকুই।
কিন্তু হিসাবটা করলে বোঝা যায়, system design-এ এর চেয়ে জোরালো চাল খুব কম আছে। Cache database-কে দ্রুত করে না।
বেশিরভাগ request-কে database পর্যন্ত পৌঁছাতেই দেয় না।

তাই ব্যাপারটা অন্যভাবে দেখতে হয়। Caching পরে জুড়ে দেওয়ার মতো কোনো performance-এর কৌশল নয়। এটা capacity-র
সিদ্ধান্ত, যা server কেনার আগেই নিতে হয়। কঠিন অংশটা কখনো জমিয়ে রাখা ছিল না। কঠিন হলো বোঝা, জমানো copy-টা কখন
থেকে আর সত্যি নেই।

## কীভাবে কাজ করে

### যে হিসাব একে ন্যায্য করে

Hit ratio মানে মোট lookup-এর মধ্যে কতগুলো hit। আসল ব্যাপার হলো origin-এর কাছে শেষ পর্যন্ত কতগুলো পৌঁছায়:

```text
10,000 req/s with no cache        -> 10,000 database queries/s
10,000 req/s at 90% hit ratio     ->  1,000 database queries/s
10,000 req/s at 95% hit ratio     ->    500 database queries/s
```

90% থেকে 95%-এ গেলে database-এর load অর্ধেক হয়ে যায়। Curve-টা এমনই, আর এ কারণেই "hit ratio বাড়ান" প্রায় সবসময়
"আরেকটি replica যোগ করুন"-কে হারিয়ে দেয়। 50%-এর নিচে cache তার জটিলতার দাম তুলতে পারে না। তখন হয় TTL খুব ছোট,
নয়তো working set-এর (যে key-গুলো সক্রিয়ভাবে ব্যবহার হচ্ছে) তুলনায় cache খুব ছোট, নয়তো data আসলেই বারবার আসে না।

### চারটি pattern

| Pattern | Cache-এ কে লেখে | Consistency | কখন বেছে নেবেন |
| --- | --- | --- | --- |
| **Cache-aside** | Application, miss হলে | Eventual | পড়া বেশি, সাধারণ কাজ — এটাই default |
| **Read-through** | Cache নিজেই, miss হলে | Eventual | Miss-এর logic প্রতিটি caller-এ না রেখে এক জায়গায় রাখতে চান |
| **Write-through** | Application দুই জায়গাতেই লেখে | Write-এর পরের read-এ strong | লেখা কম, আর stale read কোনোভাবেই চলবে না |
| **Write-behind** | Cache asynchronously flush করে | Eventual, crash হলে data হারায় | লেখা বেশি এমন counter আর metric |

**Cache-aside, সঙ্গে তার অবশ্যই-লাগবে invalidation:**

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

### কী cache করবেন, আর কী করবেন না

সিদ্ধান্তটা দুটি প্রশ্নের: data কত ঘন ঘন পড়া হয়, আর কত দ্রুত বদলায়।

| Data | পড়া হয় | বদলায় | রায় |
| --- | --- | --- | --- |
| Product catalogue | অনেক | কদাচিৎ | Cache করুন, 5–30 min TTL, update হলে evict |
| Homepage-এর aggregation | অনেক | কদাচিৎ | Cache করুন, 1–5 min TTL — query দামি, উত্তর সবার জন্য একই |
| User profile | অনেক | মাঝে মাঝে | প্রতি user-এর আলাদা cache, 5–15 min, update হলে evict |
| Live দাম বা stock-এর পরিমাণ | অনেক | সারাক্ষণ | Cache করবেন না — কয়েক সেকেন্ডেই stale, আর ভুল উত্তর ধীর উত্তরের চেয়ে খারাপ |
| User-এর balance বা order-এর অবস্থা | মাঝারি | মাঝে মাঝে | Shared cache-এ কখনো নয়; শুধু প্রতি user-এর key, ছোট TTL |
| একবারের token | একবার | — | লাভ কিছু নেই; cache-এ রাখলে leak হওয়ার আরেকটি জায়গা তৈরি হয় |

### Eviction আর store বাছাই

Memory ভরে গেলে কিছু একটা সরাতেই হয়। **LRU** (সবচেয়ে কম সম্প্রতি ব্যবহৃতটা সরাও) ঠিক default।
Redis-এ এর জন্য `maxmemory-policy allkeys-lru` লাগে। শুধু `maxmemory` set করলে Redis পুরনো key না সরিয়ে নতুন write
ফিরিয়ে দেয়। **LFU** (সবচেয়ে কম বার ব্যবহৃত) জেতে অনেকদিন চলা cache-এ, যেখানে hot set স্থির থাকে আর সাম্প্রতিকতা
ভুল দিকে নিয়ে যায়। TTL-এ expire হওয়া আসলে eviction নয়। এটা আপনার ঘোষণা, একটি copy কতক্ষণ ভুল থাকতে পারে।

নতুন system-এ default cache store হলো Redis। String ছাড়াও এতে data structure আছে, replication আছে, clustering
আর persistence আছে। Memcached জেতে শুধু একটি জায়গায়: বিশাল scale-এ খাঁটি key-value কাজে raw throughput।
বাকি সব সুবিধা সেখানে ছেড়ে দিতে হয়।

### Stampede

কোনো hot key expire হলে সেই মুহূর্তে চলতে থাকা সব request একসঙ্গে miss করে, আর সবাই একসঙ্গে database-এ গিয়ে পড়ে।
বাঁচার উপায় দুটি, আর দুটি একসঙ্গেই কাজ করে:

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

> ⚠️ Deploy আসলে ছদ্মবেশী stampede। নতুন instance চালু হয় cold local cache নিয়ে। Shared cache-ও যদি flush হয়ে থাকে,
> তাহলে traffic-এর প্রথম মিনিটটা পুরোটাই যায় database-এ। Peak সময়ে ঠিক সেই মুহূর্তেই database ভেঙে পড়ে।

### Deploy-এর সময় warm-up

যে কয়েকটি key-তে hit হবে বলে আপনি জানেন, সেগুলো আগেই ভরে রাখুন: homepage-এর query, feature flag, configuration-এর
blob। কাজটা করুন **readiness gate** হিসেবে, cutover-এর পরে background task হিসেবে নয়। Cache warm হওয়ার আগেই যে
instance traffic নেয়, তার প্রথম সব request যায় database-এ। Rolling deploy-এ প্রতিটি instance-এর জন্য একই ঘটনা
একবার করে ঘটে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Cache কোথায় বসবে |
| --- | --- |
| একই query হাজার হাজার user-কে সার্ভ করে | Shared cache, entity দিয়ে key, TTL কয়েক মিনিট |
| দামি aggregation, এক মিনিট দেরি চলে | Shared cache, ছোট TTL, invalidation লাগে না |
| Session-এ বারবার পড়া প্রতি user-এর data | প্রতি user-এর key, ছোট TTL, write হলে evict |
| Unauthenticated client-এর জন্য public response | আরও বাইরে — CDN-এ, আপনার cache-এ নয় |
| যে data একদম ঠিক হতেই হবে | Cache নয়; index বা read replica দিয়ে সমাধান করুন |

## সাধারণ ভুল

❌ **TTL নেই।** Expiry ছাড়া key-কে invalidation একবার miss করলেই সেটা চিরকাল stale থাকে। ✅ সবসময় TTL দিন,
বড় হলেও। আপনি যে invalidation লিখতে ভুলে গেছেন, TTL তার শেষ ভরসা।

❌ **প্রতি user-এর data-র জন্য shared key।** `cart:latest` একজন customer-এর basket পরের জনকে দেখিয়ে দেয়। ✅ Key-তে
user বা entity-র id সবসময় থাকবে।

❌ **কোথাও invalidate না করা।** Read path লেখা হয়েছে, write path হয়নি, তাই update দেখা দিতে পুরো একটি TTL লাগে।
✅ Eviction থাকবে write-এর একই function-এর ভেতরে।

❌ **Cache-কে store ভাবা।** Redis restart হয়। Data যদি database-এও না থাকে, তাহলে সেটা স্রেফ হারিয়ে যায়।
✅ Cache-এ যা আছে, সবই source of truth থেকে আবার বানানো যেতে হবে।

❌ **Deploy-এর সময় সব key-তে একই TTL।** সব key একই সেকেন্ডে expire হয়, আর stampede-টা আপনি নিজেই ডেকে আনেন।
✅ দশ শতাংশ jitter দিন।

## 🔑 মূল শিক্ষা

- Cache capacity-র গুণক: hit ratio 90% থেকে 95% হলে database-এ পৌঁছানো load অর্ধেক হয়।
- বেশিরভাগ system-এর জন্য cache-aside আর TTL-ই যথেষ্ট। অন্য pattern তখনই ধরুন, যখন এটা কাজ করে না।
- Invalidation-এর দায় write path-এর। শুধু read path লিখলেই stale data production-এ চলে যায়।
- Hit ratio 50%-এর নিচে হলে cache যত বাঁচায় তার চেয়ে বেশি খরচ করায়। TTL, size বা key ঠিক করুন।
- TTL-এ jitter দিন আর hot key-গুলো warm করে রাখুন। নাহলে deploy একবারে পুরো load database-এর ঘাড়ে চাপিয়ে দেবে।

## Interview-এর প্রশ্ন

**Q: কোন caching pattern দিয়ে শুরু করবেন, আর কেন?**

Cache-aside। Application আগে cache দেখে, miss হলে database-এ যায়, আর যা পেল তা cache-এ লিখে রাখে। Cache থাকে
write path-এর বাইরে, তাই cache বন্ধ হয়ে গেলে latency খারাপ হয়, কিন্তু ফল ভুল হয় না। আর cache-এ ওঠে শুধু সেটুকুই,
যা আসলে পড়া হয়। দামটা হলো, প্রতিটি caller-কে invalidation-এর কথা মনে রাখতে হয়। এজন্যই eviction থাকা উচিত update
function-এর ভেতরে, call site-এ নয়।

**Q: TTL কত হবে, তা কীভাবে ঠিক করেন?**

শুরু করুন data কতটা ভুল থাকতে পারে সেখান থেকে, কতক্ষণ cache করতে চান সেখান থেকে নয়। পাঁচ মিনিট পুরনো product
listing চলে। Account balance কোনো TTL-এই cache করা যায় না। তারপর hit ratio দেখুন। কম হলে বুঝবেন, key আবার
ব্যবহার হওয়ার আগেই TTL তাকে expire করে দিচ্ছে। Write হলে সরাসরি evict করলে লম্বা TTL নিরাপদে রাখা যায়। তখন
TTL আর freshness-এর মূল উপায় থাকে না, শুধু শেষ ভরসা হয়ে থাকে।

**Q: একটি hot key expire হলো, আর database ভেঙে পড়ল। কী ঘটেছে, আর আপনি কী করবেন?**

এটা cache stampede। একসঙ্গে চলা সব request একই মুহূর্তে miss করেছে, আর সবাই মিলে origin-এ গেছে। তিনটি সমাধান
কাজে লাগে। Lock রাখলে মাত্র একটি request নতুন করে হিসাব করে, বাকিরা অপেক্ষা করে বা stale data দেয়। TTL-এ jitter
দিলে সম্পর্কিত key-গুলো একই সেকেন্ডে expire হয় না। আর জানা hot key-গুলো আগে থেকে warm করে রাখলে deploy traffic
পাঠানোর আগেই cold instance সুরক্ষিত থাকে।

**Q: Caching কখন ভুল সমাধান?**

যখন data যত ঘন ঘন পড়া হয় তার চেয়ে দ্রুত বদলায়, অথবা পড়ার মুহূর্তেই একদম ঠিক হতে হয়। আবার traffic-এ কোনো
পুনরাবৃত্তি না থাকলেও। প্রতিটি request আলাদা হলে প্রতিটি lookup-ই miss, আর আপনি টাকা দিয়ে এমন জিনিস জমাচ্ছেন যা
কেউ আর চাইবে না। তখন আসল সমাধান সাধারণত একটি index, একটি read replica, বা আরও সস্তা একটি query।

## এরপর কী পড়বেন

- [Chapter ?? — Content Delivery Network](#ch-cdn) — একই ধারণা, edge-এ সরিয়ে নেওয়া
- [Chapter ?? — Non-Relational Store বাছাই: Document ও Redis](#ch-document-databases) — store নিজে, আর get-set ছাড়িয়ে তার data structure
- [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) — user-এর সবচেয়ে কাছের layer
