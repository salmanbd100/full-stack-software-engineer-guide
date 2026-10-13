---
sourceHash: "236560a0876cdddeb4aec13936397658be61ecf65085ede7163832b4de24a6d2"
title: "Edge বনাম Origin Rendering"
translatedAt: "2026-10-12T12:09:56.468Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Edge বনাম Origin Rendering {#ch-edge-vs-origin-rendering}

> প্রতিটি কাজ সেই tier-এ রাখুন, যেটা তার data dependency-র সঙ্গে মেলে, আর বলতে পারুন কখন edge ভুল উত্তর।

**এই অধ্যায়ে:** তিনটি tier · latency-র হিসাব · cold start-এর এখনো কতটা গুরুত্ব · edge-এ কী মানায় · compute-কে data-র কাছে বেঁধে রাখা · streaming নিয়ে ভুল ধারণা

## 💡 মূল ধারণা

Code চলার তিনটি জায়গা আছে, আর তাদের পার্থক্য একটিই বৈশিষ্ট্যে: **data থেকে তারা কত দূরে।**

একটি CDN node সব জায়গায় আছে, কিন্তু তার কোনো data নেই। একটি edge runtime কয়েক ডজন জায়গায় আছে, তারও কোনো data
নেই। তার আছে শুধু যা সে fetch করতে পারে। একটি origin region এক বা দুই জায়গায় থাকে, আর database ঠিক পাশেই।

Computation-কে user-এর কাছে সরালে লাভ হয় শুধু তখনই, যখন computation শেষ করতে তাকে আর অন্য কোথাও যেতে হয় না।
যে মুহূর্তে যেতে হয়, আপনি কাজটিকে তার input থেকে দূরে সরিয়ে ফেলেছেন। এখন প্রতিটি fetch সেই দূরত্বের দাম দেয়,
যেটা আপনি request-এ এইমাত্র বাঁচিয়েছিলেন।

আপনাকে edge নিয়ে যত প্রশ্ন করা হবে, তার প্রায় সবগুলোর উত্তর এই একটি ধারণাই ঠিক করে।

> ⚠️ **যা বদলাতে থাকে:** cold-start-এর যুক্তির সংখ্যাগুলো এই বইয়ের অন্য যেকোনো সংখ্যার চেয়ে বেশি বদলেছে।
> Origin runtime এখন request-এর পর request warm instance আবার ব্যবহার করে, আর compiled bytecode cache করে।
> একটি instance অনেকগুলো concurrent invocation সামলায়। তাই পুরোনো তুলনা — "edge এক millisecond-এ শুরু হয়,
> Node নেয় দুই সেকেন্ড" — আর production-এর ছবি দেয় না। নিজের platform-এ আবার মাপুন। যে নীতি টিকে থাকে, সেটা
> বদলায়নি: **data পর্যন্ত latency সাধারণত user পর্যন্ত latency-কে ছাপিয়ে যায়**।

## কীভাবে কাজ করে

### তিনটি tier

| Tier | কোথায় চলে | Compute | Data access | কীসের জন্য ঠিক |
| ---- | ------------- | ------- | ----------- | --------- |
| **CDN cache** | শত শত জায়গায় | নেই | নেই | যা কিছু আগেই render হয়ে আছে |
| **Edge runtime** | কয়েক ডজন জায়গায় | শুধু Web API, ছোট limit | শুধু network | Request নিয়ে সিদ্ধান্ত |
| **Origin region** | এক বা কয়েকটি | পুরো runtime, npm, দীর্ঘ সময় | Local, pooled | Rendering, database-এর কাজ |

Tier-গুলো একটির পর একটি নামতে থাকে, এদের মধ্যে বাছাই করতে হয় না। একটি request CDN-এ পৌঁছায়, আর শুধু
CDN যার উত্তর দিতে পারে না, সেটাই আরও এগোয়। সবচেয়ে দ্রুত route সেটাই, যা কখনো প্রথম tier ছেড়ে যায় না।
**Placement-এর চেয়ে caching প্রতিবারই জেতে।** এ কারণেই
[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) এই অধ্যায়ের আগে আসে।

### হিসাবটা

ধরুন একজন user Sydney-তে, আর database Virginia-তে, round trip প্রায় 200 ms।

**Origin-এ render (Virginia):**

```text
User → origin:        200 ms
Render, 3 queries:     15 ms   (queries are local, ~2 ms each)
Origin → user:        200 ms
Total:                415 ms
```

**Edge-এ render (Sydney):**

```text
User → edge:            5 ms
3 sequential queries:  600 ms   (each crosses the Pacific)
Edge → user:            5 ms
Total:                 610 ms
```

Edge version 195 ms আগে শুরু হয়েছে, আর 195 ms পরে শেষ হয়েছে। Query-গুলো parallel-এ চালালে কিছুটা লাভ হয়: একসঙ্গে
তিনটি চালালে 210 ms, মোটামুটি সমান সমান। কিন্তু যে query আগের কোনো ফলাফলের ওপর নির্ভর করে, সেটা edge-কে আবার
পিছিয়ে দেয়। আর বেশিরভাগ আসল page-এ অন্তত একটি এমন query থাকে।

**নিয়ম: data round trip-এর সংখ্যাকে data পর্যন্ত দূরত্ব দিয়ে গুণ করুন। গুণফল যদি user পর্যন্ত দূরত্বের চেয়ে বড়
হয়, origin-এ render করুন।**

### Edge-এ আসলে যা মানায়

যে কাজ O(1), যার কোনো data লাগে না, আর যা একটি page নয়, একটি সিদ্ধান্ত তৈরি করে:

- Path, host বা একটি cookie থেকে **redirect আর rewrite**।
- **Experiment আর feature-flag বরাদ্দ**: একটি cookie পড়ুন, একটি bucket বাছুন, একটি header set করুন।
- Request-এর নিজের metadata থেকে **geolocation আর locale routing**।
- একটি দামি route-এ পৌঁছানোর আগে **bot আর abuse filter**।
- **Optimistic authentication gating**: আদৌ কোনো session cookie আছে কি? আসল যাচাই হয় সেখানে, যেখানে data আছে।

পাঁচটিরই গড়ন এক: request পড়ুন, সিদ্ধান্ত নিন, হাতবদল করুন। কোনো database নেই, কোনো rendering নেই, ধীর কোনো
কিছুর জন্য await নেই। [Chapter ?? — Middleware, Runtime ও Deployment](#ch-nextjs-middleware-and-the-edge) দেখায়,
একটি framework এটা কীভাবে implement করে।

### Compute-এর বদলে data সরানো

একটি route যদি সত্যিই user-এর কাছে চলে লাভবান হয়, তাহলে তার data-ও সঙ্গে নিয়ে আসুন।

| কৌশল | কীসের সঙ্গে মানায় | খরচ কী |
| --------- | ------------- | ------------- |
| **Edge region-এর কাছে read replica** | Read-নির্ভর, replication lag সইতে পারে | Lag, আর এমন একটি write path যেটা তখনও মূল জায়গায় ফিরে যায় |
| **Edge key–value বা config store** | ছোট, ধীরে বদলানো value: flag, redirect, routing table | Eventual consistency; user data-র জন্য নয় |
| **Replicated বা globally-distributed database** | সত্যিকারের global product | খরচ, আর এমন একটি consistency model যা আপনাকে বুঝতে হবে |
| **Data নয়, render cache করুন** | প্রায় বাকি সবকিছু | Staleness, যেটা আপনি এমনিতেই বেছে নিচ্ছিলেন |

শেষ row-টিই সাধারণত ঠিক উত্তর, আর বেশিরভাগ candidate এটা বাদ দেন। CDN-এ cache করা একটি page user-এর শহর থেকেই
serve হয়, কোথাও কোনো compute ছাড়াই। এটা latency, availability আর খরচ — তিনটিতেই একসঙ্গে edge rendering-কে হারায়।

### Origin compute-কে database-এর কাছে বেঁধে রাখা

এটা একই ধারণার অন্য দিক। যখন একটি route-কে প্রতিটি request-এ render করতেই হবে, তখন function-টিকে সেই region-এ
রাখুন, যেখানে primary database আছে। Office-এর সবচেয়ে কাছের region বা platform-এর default region ব্যবহার করবেন না।

এখানে ভুল করাই serverless application-এ নিজের তৈরি করা latency-র সবচেয়ে সাধারণ উৎস। Virginia-র একটি function, যার
database Frankfurt-এ, প্রতিটি query-তে 90 ms দেয় — চিরকাল, প্রতিটি request-এ।

### Streaming-এর জন্য edge লাগে না

একটি প্রচলিত ভুল ধারণা বলে, stream করা response-এর জন্য edge runtime লাগে। লাগে না। Streaming HTTP response-এর
একটি বৈশিষ্ট্য, আর পূর্ণ origin runtime ঠিকঠাকই stream করে।
[Chapter ?? — Streaming HTML](#ch-streaming-html) দেখুন।

ভুল ধারণাটি আছে, কারণ দুটি feature একই platform-এ একসঙ্গে এসেছিল। Streaming পাওয়ার জন্য edge runtime বেছে নেওয়া
মানে npm package, database driver আর দীর্ঘ সময় ছেড়ে দেওয়া — এমন একটি জিনিসের জন্য, যা আপনার আগেই ছিল।

## কখন ব্যবহার করবেন

| কাজ | কোথায় রাখবেন | কারণ |
| ---- | ------ | ------- |
| আগেই render হওয়া HTML বা asset | **CDN** | কোনো compute না থাকাই সবচেয়ে দ্রুত compute |
| Redirect, rewrite, flag বরাদ্দ, bot filter | **Edge** | Constant time, কোনো data নেই |
| Database পড়ে এমন rendering | **Origin, data-র region-এ** | Round trip-ই প্রধান খরচ |
| npm package বা Node API লাগে এমন যেকোনো কাজ | **Origin** | Edge runtime-এ এগুলো নেই |
| দীর্ঘ সময় চলা বা CPU-ভারী কাজ | **Origin** | Edge-এর সময়সীমা কড়া |
| একটি globally distributed read-only dataset | **Edge, একটি replica বা KV store সহ** | Data-ও সরে গেছে |

## সাধারণ ভুল

**❌ Data round trip না গুনে latency-র জন্য edge বেছে নেওয়া।**
✅ ওপরের হিসাবটা করুন। একটি নির্ভরশীল query সাধারণত পুরো লাভটাই মুছে দেয়।

**❌ Edge middleware-এ আসল authentication check রাখা।**
✅ Edge থেকে একটি database-এর সঙ্গে session যাচাই করলে *প্রতিটি* request-এ এক মহাদেশ পার হওয়া round trip যোগ
হয়, cache করা request-এও। Edge-এ শুধু cookie আছে কি না দেখুন, আর যাচাই করুন সেখানে, যেখানে data আছে।

**❌ Matcher ছাড়া প্রতিটি request-এ middleware চালানো।**
✅ Edge middleware-এর bill হয় প্রতিটি invocation-এ, আর এটা cache-এর আগে চলে। Matcher ছাড়া middleware site-এর
প্রতিটি static asset-এ একটি function call যোগ করে।

**❌ Experiment precomputation-কে cache ফুলিয়ে দিতে দেওয়া।**
✅ Edge-এ বরাদ্দ করা flag প্রায়ই প্রতিটি combination-এর জন্য একটি prerendered variant তৈরি করে। তিনটি locale জুড়ে
চারটি flag মানে প্রতিটি page-এর বারোটি copy, যার বেশিরভাগই cold। শেষ হয়ে যাওয়া experiment সরিয়ে ফেলুন।

**❌ ধরে নেওয়া যে "edge" প্রতিটি platform-এ একই জিনিস।**
✅ Runtime limit, পাওয়া যায় এমন API, region-এর সংখ্যা আর pricing অনেক আলাদা। নিজের platform-এর documentation দেখুন,
অন্য platform নিয়ে লেখা কোনো blog post নয়।

## 🔑 মূল শিক্ষা

- তিনটি tier: CDN-এ কোনো compute নেই, edge-এ কোনো data নেই, origin-এ compute আর data দুটিই আছে।
- Data পর্যন্ত latency সাধারণত user পর্যন্ত latency-কে ছাপিয়ে যায়। Compute সরানোর আগে round trip গুনুন।
- Edge মানায় একটি request নিয়ে constant-time সিদ্ধান্তে, database পড়ে এমন rendering-এ নয়।
- Render হওয়া output cache করা latency, খরচ আর availability — তিনটিতেই একসঙ্গে edge rendering-কে হারায়।
- Streaming origin runtime-এ কাজ করে। এটা edge runtime বেছে নেওয়ার কোনো কারণ নয়।

## Interview-এর প্রশ্ন

**Q: কখন edge render করার ভুল জায়গা?**

যখন render-এর এমন data লাগে যা অন্য কোথাও থাকে। প্রতিটি query সেই দূরত্ব পার হয়, যেটা আপনি request-এ বাঁচিয়েছিলেন,
আর নির্ভরশীল query সেটাকে কয়েক গুণ করে। Virginia-র একটি database-এর সঙ্গে Sydney-তে render করলে একটি ধীর round
trip কয়েকটিতে পরিণত হয়। Data যদি কাছাকাছি replicate করা না থাকে, তাহলে database-এর region-এ origin rendering-ই জেতে।

**Q: একসময় cold start ছিল edge runtime-এর পক্ষে যুক্তি। সেটা কি এখনো সত্যি?**

অনেক কম। Origin platform এখন request-এর পর request warm instance আবার ব্যবহার করে, আর compiled bytecode cache করে।
একটি instance-এ কয়েকটি concurrent invocation চলে। তাই cold start মানুষ এখনো যে সংখ্যা বলে, তার চেয়ে বিরল আর ছোট।
ধরে না নিয়ে মাপুন। একটি সীমিত runtime মেনে নেওয়ার কারণ হিসেবে এটা আগের চেয়ে দুর্বল।

**Q: একটি globally distributed application-এ authentication কোথায় করবেন?**

দুটি স্তরে। Edge-এ একটি সস্তা উপস্থিতি-যাচাই চালান: কোনো session cookie আছে কি, আর সেটা কি ঠিক গড়নের? এটা
unauthenticated traffic-কে কোনো খরচ হওয়ার আগেই redirect করে দেয়। আসল যাচাই হয় session store বা database-এর
একই region-এ। শুধু সেখানেই এটা একটি local round trip-এ চলতে পারে।

**Q: একটি route origin-এ server-rendered, আর European user-দের জন্য ধীর। কোন কোন option আছে, ক্রম অনুযায়ী?**

প্রথমে cache করুন। HTML যদি share করা যায়, তাহলে CDN সেটা Frankfurt থেকে serve করে, কোনো compute ছাড়াই। যদি এটা
সত্যিই প্রতিটি request-এর জন্য আলাদা হয়, তাহলে দেখুন function-টি database-এর একই region-এ চলছে কি না। প্রায়ই
আসল bug সেটাই। এই দুটির পরেই শুধু আমি Europe-এ একটি read replica-র কথা ভাবব। Render-কে edge-এ সরানো শেষ option,
প্রথম নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Middleware, Runtime ও Deployment](#ch-nextjs-middleware-and-the-edge) — একটি framework-এর ভেতরে একই tradeoff
- [Chapter ?? — CDN](#ch-cdn) — এসবের কোনোটায় পৌঁছানোর আগে প্রথম tier কী করে
- [Chapter ?? — Scalability, Latency ও Throughput](#ch-scalability) — হিসাবের পেছনের সংখ্যাগুলো
