---
sourceHash: "2a1e5dbe91e2687c8ee78baf948d64a752ff3829a6e3673d957ecd72d976bea6"
title: "Back-of-Envelope Estimation"
translatedAt: "2026-10-17T14:00:59.933Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Back-of-Envelope Estimation {#ch-back-of-envelope-estimation}

> Traffic-এর একটি সংখ্যা থেকে দুই মিনিটে storage, bandwidth আর server-এর সংখ্যা বের করুন, এমন হিসাবে যা জোরে বলে করা যায়।

**এই অধ্যায়ে:** যে সংখ্যাগুলো মুখস্থ রাখার মতো · চারটি formula · round করার নিয়ম · তিনটি করে দেখানো উদাহরণ · estimate আসলে কীসের জন্য

## 💡 মূল ধারণা

Design round-এ estimation গণিতের পরীক্ষা নয়। এর কাজ একটাই সিদ্ধান্ত নেওয়া: এটা কি এক machine-এ ধরবে, নাকি fleet
লাগবে? পরের প্রতিটি পছন্দ (sharding, caching, replication, queueing) নির্ভর করে আপনি সেই রেখার কোন পাশে পড়লেন তার
ওপর। তাই হিসাবটা দুই গুণের মধ্যে ঠিক হলেই যথেষ্ট। ধীরে আর নিখুঁত হওয়ার চেয়ে দ্রুত আর মোটামুটি ঠিক হওয়া প্রতিবারই
ভালো।

> যে estimate কোনো সিদ্ধান্ত বদলায় না, সেটা round-এর সময় নষ্ট। সবসময় এই বাক্যে শেষ করুন: _"তার মানে…"_।

## কীভাবে কাজ করে

### যে সংখ্যাগুলো মুখস্থ রাখার মতো

| পরিমাণ | মান |
| ----- | --- |
| এক দিনে সেকেন্ড | ~86,400 → round করে **100,000** |
| এক মাসে সেকেন্ড | ~2.5 million |
| L1 cache reference | 1 ns |
| Main memory reference | 100 ns |
| SSD random read | 100 µs |
| একই data centre-এর ভেতরে round trip | 0.5 ms |
| Disk seek (ঘোরা disk) | 10 ms |
| এক মহাদেশ জুড়ে round trip | 50–80 ms |
| এক মহাদেশ থেকে আরেক মহাদেশে round trip | 150–250 ms |

| আকার | মোটা দাগের হিসাব |
| ---- | -------------- |
| একটি `char`, একটি `boolean` | 1 byte |
| একটি `int`, একটি 32-bit float | 4 bytes |
| Text হিসেবে একটি UUID | 36 bytes |
| Metadata-সহ ছোট একটি text post | ~1 KB |
| Compress করা একটি web page | ~100 KB |
| Phone-এ তোলা একটি photo | ~2 MB |
| 1080p video-র এক মিনিট | ~50 MB |

| সাধারণ একটি machine-এর capacity | মোটা দাগের হিসাব |
| ----------------------------- | -------------- |
| Memory | 64–256 GB |
| সেকেন্ডে request (সাধারণ JSON) | ~10,000 |
| সেকেন্ডে Postgres write | ~5,000–10,000 |
| সেকেন্ডে Redis operation | ~100,000 |

> ⚠️ এগুলো মাত্রা বোঝার নোঙর, benchmark নয়। বলার সময় "মোটামুটি" বলুন। Interviewer-এর কাছে অন্য সংখ্যা থাকলে তা নিয়ে
> কখনো তর্ক করবেন না। আসল কথা হিসাবের পদ্ধতি, constant-টা নয়।

### চারটি formula

```typescript
// 1. Average requests per second from a daily count.
const rps = (dailyEvents: number): number => dailyEvents / 100_000;

// 2. Peak. Consumer traffic is spiky; 2-3x average is the standard assumption.
const peakRps = (avg: number, multiplier: number = 3): number => avg * multiplier;

// 3. Storage over a retention window.
const storageBytes = (
  writesPerDay: number,
  bytesPerWrite: number,
  years: number,
): number => writesPerDay * bytesPerWrite * 365 * years;

// 4. Bandwidth out of the edge.
const egressBytesPerSecond = (readsPerSecond: number, bytesPerRead: number): number =>
  readsPerSecond * bytesPerRead;
```

Replication বাদ দিয়ে storage-এর estimate করলে সেটা ঠিক replication factor-এর গুণ কম হয়। আলাদা কিছু না বলে থাকলে 3
দিয়ে গুণ করুন।

### Round করার নিয়ম

শুরুর আগেই প্রতিটি input-কে একটি significant figure-এ round করুন। 86,400 হয়ে যায় 100,000। 4.7 million হয়ে যায় 5
million। পুরো হিসাবটা দশের ঘাতে করুন, আর মাত্রাটা ঠিক করুন একদম শেষে। Whiteboard-এ লম্বা ভাগ করতে বসে গেলে বুঝবেন,
যথেষ্ট round করেননি।

## তিনটি করে দেখানো উদাহরণ

### দৈনিক 100 million user-এর একটি social feed

**Write।** ধরুন প্রত্যেক user দিনে দুবার post করেন। তাহলে দিনে 200 million post, মানে 200M ÷ 100k = **সেকেন্ডে 2,000
write**, peak-এ প্রায় 6,000।

**Read।** ধরুন প্রত্যেক user দিনে 20 বার feed খোলেন, আর প্রতিবার 20টি post আসে। তাহলে দিনে 2 billion feed load, মানে
**সেকেন্ডে 20,000 read**, peak-এ 60,000। Post ধরে গুনলে দিনে 40 billion post read: write-এর তুলনায় প্রায় 200:1। এই
অনুপাতই বলে দেয়, জোরেশোরে cache করুন আর replica থেকে পড়ুন।

**Storage।** Metadata-সহ একটি post ~1 KB। 200M × 1 KB = **দিনে 200 GB**, বছরে 73 TB, আর three-way replication-সহ বছরে
220 TB। তাই এটা এক machine-এ ধরবে না, post-গুলো partition করতে হবে।

**তার মানে:** post-এর জন্য একটি sharded store, feed-এর read path-এর সামনে একটি cache, আর fan-out হবে asynchronously,
read-এর সময় নয়।

### মাসে 100 million নতুন link-এর একটি URL shortener

**Write।** 100M ÷ 2.5M সেকেন্ড ≈ **সেকেন্ডে 40 write**। এটা কিছুই না। একটি Postgres primary অনায়াসে সামলে নেয়, তবু
জায়গা বাকি থাকে।

**Read।** 100:1 অনুপাতে **সেকেন্ডে 4,000 redirect**, peak-এ 12,000।

**Storage।** লম্বা URL আর metadata মিলিয়ে একটি row ~500 bytes। 100M × 500 B = মাসে 50 GB, বছরে 600 GB, **পাঁচ বছরে
3 TB**। এক machine-এই এটা ধরে।

**তার মানে:** বহু বছর sharding লাগবে না। পুরো সমস্যাটা read latency, আর সেটা cache-এর সমস্যা, scale-এর নয়। জোরে বলুন।
একটি system যে *ছোট*, সেটা চিনতে পারাও senior-এর লক্ষণ।

### দিনে 50 billion message-এর একটি chat service

**Write।** 50B ÷ 100k = **সেকেন্ডে 500,000 write**। কোনো একক database এটা পারে না। Partitioning এখানে ঐচ্ছিক নয়, আর
partition key-ই প্রথম জিনিস যা design করতে হবে।

**Storage।** Metadata-সহ একটি message ~200 bytes। 50B × 200 B = **দিনে 10 TB**, replication ছাড়াই বছরে 3.6 PB।

**তার মানে:** conversation দিয়ে partition করা একটি append-only store, আর পুরনো message তাড়াতাড়ি cold storage-এ সরিয়ে
দেওয়া। কতদিন data রাখা হবে, সেই retention policy-টা product-এর সিদ্ধান্ত হতে হবে, engineering-এর নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Estimate করবেন? | কেন |
| -------- | -------------- | --- |
| Prompt-এ consumer-স্তরের scale বলা আছে | হ্যাঁ, প্রথম দশ মিনিটের মধ্যে | Sharding আর caching এটাই ঠিক করে |
| Internal tool, কয়েকশো user | এক বাক্যে বলে এগিয়ে যান | সবকিছু এক machine-এ ধরে; সেটা বলে দিন |
| Interviewer বলেন "ধরে নিন এটা বিশাল" | একটি সংখ্যা বেছে নিয়ে হিসাব করুন | অস্পষ্ট assumption-এর চেয়ে চোখের সামনে থাকা assumption ভালো |
| আপনি optimisation ধাপের গভীরে | শুধু হাতের component-টার জন্য | আরেকটি পুরো estimate সময় খেয়ে নেয় |

## সাধারণ ভুল

**❌ সবকিছু হিসাব করা**

Storage, bandwidth, QPS, memory, cache-এর আকার, server-এর সংখ্যা আর খরচ, এমন একটি system-এর জন্য যেখানে এর কোনোটিই
design বদলায় না। শুধু সেই এক-দুটি পরিমাণ estimate করুন, যা কিছু একটা ঠিক করে দেয়।

**✅ উদ্দেশ্য নিয়ে estimate করা**

> "Write সেকেন্ডে 2,000। একটি Postgres primary-র সীমা মোটামুটি 8,000, তাই আপাতত write ঠিক আছে, সমস্যা হলো read। আমি
> সময় দেব read path-এ।"

**❌ Peak ভুলে যাওয়া**

Average traffic দিয়ে কোনো কিছুর আকার ঠিক হয় না। Team-গুলো system বানায় peak ধরে, আর consumer traffic-এর peak সাধারণত
দৈনিক average-এর 2–3×। কোনো event বা time zone-এর সঙ্গে বাঁধা থাকলে আরও বেশি।

**❌ Replication আর index ভুলে যাওয়া**

Row-এর কাঁচা আকার × row-এর সংখ্যা হলো সর্বনিম্ন, উত্তর নয়। Three-way replication এটাকে তিন গুণ করে, আর index সাধারণত
তার ওপর আরও 20–50% যোগ করে।

## 🔑 মূল শিক্ষা

- Estimation একটাই প্রশ্নের উত্তর দেয়: এক machine, নাকি fleet? বাকি সবকিছু আসে এই উত্তর থেকে।
- প্রতিটি input একটি significant figure-এ round করুন, আর 86,400 সেকেন্ডকে 100,000 ধরুন।
- Storage-এর estimate-এ replication আর index-এর বাড়তি অংশ ধরতে হবে, নইলে সেটা 3–5× কম হয়।
- Peak ধরে ব্যবস্থা করুন। Consumer traffic-এ peak দৈনিক average-এর 2–3×।
- প্রতিটি estimate "তার মানে…" দিয়ে শেষ করুন, আর বলুন এইমাত্র কোন design সিদ্ধান্তটা হলো।

## Interview-এর প্রশ্ন

**Q: পাঁচ বছর পর একটি photo-sharing service-এর কত storage লাগবে?**

শুরু করুন দৈনিক upload থেকে। সেটাকে গুণ করুন photo-র গড় আকার আর thumbnail-এর বিভিন্ন সংস্করণের যোগফল দিয়ে। তারপর
365 দিয়ে, পাঁচ দিয়ে, আর শেষে replication factor দিয়ে। প্রতিটি assumption ব্যবহার করার সময়েই বলে দিন। উত্তরটার চেয়ে
বেশি গুরুত্বপূর্ণ হলো আপনার মনে ছিল কি না যে thumbnail আর replication প্রায়ই আসল photo-গুলোর চেয়ে বেশি জায়গা নেয়।

**Q: 86,400-কে 100,000-এ round করবেন কেন?**

কারণ এতে প্রতিটি ভাগ শুধু দশমিক বিন্দু সরানোর কাজ হয়ে যায়। Estimate-এর কাজ যখন "এক machine" আর "একশো machine"-এর
মধ্যে পার্থক্য করা, তখন 16% ভুল সহজেই সহ্য করা যায়। এখানে যে সময়টা বাঁচে, তা round-এর সেই অংশগুলোতে কাজে লাগে
যেখানে লক্ষণ বেশি।

**Q: আপনার estimate বলছে পুরো dataset এক server-এর RAM-এ ধরে যায়। Design কি এটাই?**

এটা শুরুর জায়গা। সোজাসুজি বলুন, কারণ এতে আলোচনা থেকে sharding বাদ পড়ে যায়। কিন্তু একটি machine মানেই single point of
failure। তাই design-এ তবু একটি replica আর failover-এর ব্যবস্থা লাগবে। Memory-তে ধরে গেলে scaling-এর সমস্যাটা হয়ে যায়
availability-র সমস্যা।

## এরপর কী পড়বেন

- [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round) — কাজের ক্রমে estimation কোথায় বসে
- [Chapter ?? — Scalability, Latency ও Throughput](#ch-scalability) — estimate যখন বলে এক machine যথেষ্ট নয়, তখন কী করবেন
