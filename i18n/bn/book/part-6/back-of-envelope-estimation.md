---
sourceHash: "2a1e5dbe91e2687c8ee78baf948d64a752ff3829a6e3673d957ecd72d976bea6"
title: "Back-of-Envelope Estimation"
translatedAt: "2026-10-12T12:21:48.950Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Back-of-Envelope Estimation {#ch-back-of-envelope-estimation}

> একটি traffic-এর সংখ্যাকে দুই মিনিটে storage, bandwidth আর server-এর সংখ্যায় পরিণত করুন, এমন পাটিগণিত দিয়ে যেটা আপনি জোরে বলে করতে পারেন।

**এই অধ্যায়ে:** যে সংখ্যাগুলো মুখস্থ রাখা দরকার · চারটি formula · rounding-এর নিয়ম · তিনটি সমাধান করা উদাহরণ · estimate আসলে কীসের জন্য

## 💡 মূল ধারণা

Design round-এ estimation কোনো অঙ্কের পরীক্ষা নয়। এটা আছে একটিমাত্র সিদ্ধান্ত নেওয়ার জন্য: এটা কি এক machine-এ
আঁটে, নাকি একটি fleet লাগবে? পরের প্রতিটি পছন্দ (sharding, caching, replication, queueing) আসে আপনি সেই রেখার কোন
পাশে পড়লেন তা থেকে। তাই হিসাবটা দুই গুণের মধ্যে ঠিক হলেই যথেষ্ট। দ্রুত আর মোটামুটি ঠিক হওয়া, ধীর আর নিখুঁত হওয়াকে
প্রতিবার হারায়।

> যে estimate কোনো সিদ্ধান্ত বদলায় না, সেটা round-এর সময় নষ্ট। সবসময় এই বাক্য দিয়ে শেষ করুন
> _"তার মানে…"_।

## কীভাবে কাজ করে

### যে সংখ্যাগুলো মুখস্থ রাখা দরকার

| পরিমাণ                             | মান                       |
| --------------------------------- | ------------------------ |
| এক দিনে সেকেন্ড                    | ~86,400 → round করে **100,000** |
| এক মাসে সেকেন্ড                    | ~2.5 million             |
| L1 cache reference                | 1 ns                     |
| Main memory reference             | 100 ns                   |
| SSD random read                   | 100 µs                   |
| একটি data centre-এর ভেতরে round trip | 0.5 ms                   |
| Disk seek (ঘোরা disk)               | 10 ms                    |
| এক মহাদেশ জুড়ে round trip          | 50–80 ms                 |
| মহাদেশ পেরিয়ে round trip            | 150–250 ms               |

| আকার                               | মোটামুটি হিসাব              |
| --------------------------------- | ------------------------ |
| একটি `char`, একটি `boolean`         | 1 byte                   |
| একটি `int`, একটি 32-bit float       | 4 bytes                  |
| Text হিসেবে একটি UUID               | 36 bytes                 |
| Metadata-সহ একটি ছোট text post      | ~1 KB                    |
| একটি compressed web page           | ~100 KB                  |
| ফোনে তোলা একটি photo                | ~2 MB                    |
| 1080p video-র এক মিনিট             | ~50 MB                   |

| একটি সাধারণ machine-এর capacity      | মোটামুটি হিসাব              |
| --------------------------------- | ------------------------ |
| Memory                            | 64–256 GB                |
| প্রতি সেকেন্ডে request (সাধারণ JSON)  | ~10,000                  |
| প্রতি সেকেন্ডে Postgres write         | ~5,000–10,000            |
| প্রতি সেকেন্ডে Redis operation        | ~100,000                 |

> ⚠️ এগুলো order-of-magnitude-এর নোঙর, benchmark নয়। "মোটামুটি" বলে উল্লেখ করুন। ভিন্ন সংখ্যা জানা কোনো
> interviewer-এর সাথে কখনো তর্ক করবেন না। আসল কথা হলো হিসাবের ধাপ, constant নয়।

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

যে storage estimate replication উপেক্ষা করে, সেটা replication factor পরিমাণ ভুল। অন্য কিছু না বলে থাকলে 3 দিয়ে
গুণ করুন।

### Rounding-এর নিয়ম

শুরু করার আগে প্রতিটি input-কে একটি significant figure-এ round করুন। 86,400 হয়ে যায় 100,000। 4.7 million হয়ে
যায় 5 million। পুরো হিসাবটা দশের ঘাতে করুন, আর শেষে magnitude ঠিক করুন। Whiteboard-এ লম্বা ভাগ লিখতে শুরু করলে
বুঝবেন, যথেষ্ট round করেননি।

## তিনটি সমাধান করা উদাহরণ

### দৈনিক 100 million user-এর একটি social feed

**Write।** ধরুন প্রত্যেক user দিনে দুবার post করেন। তাহলে দিনে 200 million post, অর্থাৎ 200M ÷ 100k =
**প্রতি সেকেন্ডে 2,000 write**, peak-এ প্রায় 6,000।

**Read।** ধরুন প্রত্যেক user দিনে 20 বার feed খোলেন, আর প্রতিবার 20টি post আসে। তাহলে 2 billion feed load, অর্থাৎ
**প্রতি সেকেন্ডে 20,000 read**, peak-এ 60,000। Post হিসেবে গুনলে দিনে 40 billion post read: write-এর তুলনায়
প্রায় 200:1। এই ratio বলে দেয়, জোরেশোরে cache করুন আর replica থেকে read করুন।

**Storage।** Metadata-সহ একটি post ~1 KB। 200M × 1 KB = **দিনে 200 GB**, বছরে 73 TB, আর three-way replication-সহ
বছরে 220 TB। তাই এটা এক machine-এ আঁটে না, post-গুলোর partitioning দরকার।

**তার মানে:** post-এর জন্য একটি sharded store, feed-এর read path-এর সামনে একটি cache, আর fan-out read-এর সময়
নয়, asynchronously করা।

### মাসে 100 million নতুন link-এর একটি URL shortener

**Write।** 100M ÷ 2.5M সেকেন্ড ≈ **প্রতি সেকেন্ডে 40 write**। এটা কিছুই না। একটি Postgres primary অনেক জায়গা
রেখেই এটা সামলায়।

**Read।** 100:1 ratio-তে **প্রতি সেকেন্ডে 4,000 redirect**, peak-এ 12,000।

**Storage।** লম্বা URL আর metadata-সহ একটি row ~500 bytes। 100M × 500 B = মাসে 50 GB, বছরে 600 GB,
**পাঁচ বছরে 3 TB**। এক machine এটা ধরে রাখতে পারে।

**তার মানে:** বছরের পর বছর কোনো sharding লাগবে না। পুরো সমস্যাটা read latency, যেটা একটি cache-এর সমস্যা, scale-এর
সমস্যা নয়। এটা জোরে বলুন। একটি system যে *ছোট*, সেটা চিনতে পারাও একটি senior signal।

### দিনে 50 billion message-এর একটি chat service

**Write।** 50B ÷ 100k = **প্রতি সেকেন্ডে 500,000 write**। কোনো একক database এটা পারে না। Partitioning ঐচ্ছিক নয়,
আর partition key-ই প্রথম জিনিস যেটা design করতে হবে।

**Storage।** Metadata-সহ একটি message ~200 bytes। 50B × 200 B = **দিনে 10 TB**, replication-এর আগেই বছরে 3.6 PB।

**তার মানে:** conversation অনুযায়ী partition করা একটি append-only store, আর পুরোনো message তাড়াতাড়ি cold storage-এ
সরানো। Retention policy-কে একটি product সিদ্ধান্ত হতে হবে, engineering সিদ্ধান্ত নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                   | Estimate করবেন?                 | কেন                                          |
| ---------------------------------------- | ------------------------------ | ------------------------------------------ |
| Prompt একটি consumer scale-এর কথা বলে       | হ্যাঁ, প্রথম দশ মিনিটে              | এটাই sharding আর caching ঠিক করে              |
| Internal tool, কয়েকশো user               | এক বাক্য, তারপর এগিয়ে যান          | সবকিছু এক machine-এ আঁটে; সেটা বলুন            |
| Interviewer বলেন "ধরে নিন এটা বিশাল"         | একটি সংখ্যা বাছুন আর হিসাব করুন      | দৃশ্যমান assumption অস্পষ্টটার চেয়ে ভালো          |
| আপনি optimisation ধাপের গভীরে               | শুধু হাতের component-টির জন্য       | দ্বিতীয় একটি পুরো estimate সময় পোড়ায়           |

## সাধারণ ভুল

**❌ সবকিছু হিসাব করা**

Storage, bandwidth, QPS, memory, cache size, server-এর সংখ্যা আর খরচ, এমন একটি system-এর জন্য যেখানে এর কোনোটাই
design বদলায় না। শুধু সেই এক-দুটো পরিমাণ estimate করুন, যেগুলো কিছু একটা ঠিক করে।

**✅ উদ্দেশ্য নিয়ে estimate করা**

> "Write প্রতি সেকেন্ডে 2,000। একটি Postgres primary প্রায় 8,000-এ গিয়ে আটকায়, তাই write আপাতত ঠিক আছে, আর
> সমস্যা হলো read। আমি read path-এ সময় দেব।"

**❌ Peak-এর কথা ভুলে যাওয়া**

গড় traffic দিয়ে কোনো কিছুর আকার ঠিক হয় না। Team-গুলো system provision করে peak-এর জন্য, আর consumer peak সাধারণত
দৈনিক গড়ের 2–3×। কোনো event বা time zone-এর সাথে বাঁধা যেকোনো কিছুর ক্ষেত্রে এটা আরও বেশি।

**❌ Replication আর index-এর কথা ভুলে যাওয়া**

কাঁচা row size × row-এর সংখ্যা হলো সর্বনিম্ন, উত্তর নয়। Three-way replication এটাকে তিন গুণ করে, আর index
সাধারণত তার ওপর আরও 20–50% যোগ করে।

## 🔑 মূল শিক্ষা

- Estimation একটি প্রশ্নের উত্তর দেয়: এক machine নাকি একটি fleet? বাকি সবকিছু সেই উত্তর থেকে আসে।
- প্রতিটি input-কে একটি significant figure-এ round করুন, আর 86,400 সেকেন্ডকে 100,000 ধরুন।
- Storage estimate-এ replication আর index-এর overhead থাকতেই হবে, নইলে সেটা 3–5× কম হয়।
- Peak-এর বিপরীতে provision করুন, যেটা consumer traffic-এর ক্ষেত্রে দৈনিক গড়ের 2–3×।
- প্রতিটি estimate শেষ করুন "তার মানে…" দিয়ে, যে design সিদ্ধান্তটা এইমাত্র হলো তার নাম বলে।

## Interview-এর প্রশ্ন

**Q: পাঁচ বছর পরে একটি photo-sharing service-এর কত storage লাগবে?**

দিনে কত upload হয় তা দিয়ে শুরু করুন। গড় photo size আর thumbnail variant-এর আকার দিয়ে গুণ করুন, তারপর 365 আর
পাঁচ দিয়ে, তারপর replication factor দিয়ে। প্রতিটি assumption ব্যবহার করার সময় বলুন। উত্তরের চেয়ে বেশি গুরুত্বপূর্ণ
হলো আপনার মনে ছিল কি না যে thumbnail আর replication প্রায়ই মূল ছবিগুলোর চেয়ে বেশি জায়গা নেয়।

**Q: 86,400-কে 100,000-এ round করবেন কেন?**

কারণ এতে প্রতিটি ভাগ শুধু দশমিক বিন্দু সরানো হয়ে যায়। 16% ভুলটা একটি estimate-এর সহনসীমার অনেক ভেতরে, যখন তার
কাজ হলো "এক machine" আর "একশো machine" আলাদা করা। এখানকার গতি round-এর সেই অংশগুলোর জন্য সময় কেনে, যেখানে বেশি
signal থাকে।

**Q: আপনার estimate বলছে পুরো dataset এক server-এর RAM-এ আঁটে। এটাই কি design?**

এটা শুরুর বিন্দু। সেটা সরাসরি বলুন, কারণ এতে sharding আলোচনা থেকে বাদ পড়ে যায়। কিন্তু একটি machine মানে একটি
single point of failure, তাই design-এ তখনো একটি replica আর একটি failover-এর গল্প লাগবে। Memory-তে আঁটলে scaling-এর
সমস্যাটা availability-র সমস্যায় পরিণত হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round) — চলার ক্রমে estimation কোথায় বসে
- [Chapter ?? — Scalability, Latency ও Throughput](#ch-scalability) — estimate যখন বলে এক machine যথেষ্ট নয়, তখন কী করবেন
