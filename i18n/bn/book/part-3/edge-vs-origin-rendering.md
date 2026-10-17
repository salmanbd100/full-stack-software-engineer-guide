---
sourceHash: "236560a0876cdddeb4aec13936397658be61ecf65085ede7163832b4de24a6d2"
title: "Edge বনাম Origin Rendering"
translatedAt: "2026-10-17T01:40:36.149Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Edge বনাম Origin Rendering {#ch-edge-vs-origin-rendering}

> প্রতিটি কাজ সেই স্তরে রাখুন, যেটা তার data-র চাহিদার সঙ্গে মেলে। আর কখন edge ভুল উত্তর, সেটা বলতে পারুন।

**এই অধ্যায়ে:** তিনটি স্তর · latency-র হিসাব · cold start-এর গুরুত্ব এখন কতটা · edge-এ কী রাখা উচিত · compute-কে data-র কাছে বেঁধে রাখা · streaming নিয়ে ভুল ধারণা

## 💡 মূল ধারণা

Code চলতে পারে তিন জায়গায়, আর এদের পার্থক্য একটিই বৈশিষ্ট্যে: **data থেকে কত দূরে।**

CDN node সব জায়গায় আছে, কিন্তু তার কাছে কোনো data নেই। Edge runtime আছে কয়েক ডজন জায়গায়, তার কাছেও data নেই।
Fetch করে যা আনা যায়, তার হাতে শুধু সেটুকুই। Origin region থাকে এক বা দুই জায়গায়, আর database ঠিক পাশেই।

Computation-কে user-এর কাছে সরিয়ে লাভ হয় শুধু তখন, যখন কাজ শেষ করতে computation-কে আর কোথাও যেতে হয় না।
যেই যেতে হয়, তখনই বুঝবেন কাজটাকে তার input থেকে দূরে সরিয়ে ফেলেছেন। Request-এ যতটা দূরত্ব বাঁচিয়েছিলেন, এখন
প্রতিটি fetch সেই দূরত্বের দাম দেয়।

Edge নিয়ে যত প্রশ্ন আসবে, তার প্রায় সবগুলোর উত্তর এই একটি ধারণা থেকেই আসে।

> ⚠️ **যা বদলাতে থাকে:** এই বইয়ের অন্য যেকোনো সংখ্যার চেয়ে cold start-এর যুক্তির সংখ্যাগুলো বেশি বদলেছে। Origin
> runtime এখন request-এর পর request warm instance আবার ব্যবহার করে, আর compiled bytecode cache করে রাখে। একটি
> instance একসঙ্গে অনেকগুলো invocation সামলায়। তাই "edge চালু হয় এক millisecond-এ, Node নেয় দুই সেকেন্ড", এই
> পুরনো তুলনা আর production-এর ছবি নয়। নিজের platform-এ আবার মেপে দেখুন। টেকসই নীতিটা বদলায়নি: **user-এর
> কাছে পৌঁছানোর latency-র চেয়ে data-র কাছে পৌঁছানোর latency সাধারণত বেশি ভারী।**

## কীভাবে কাজ করে

### তিনটি স্তর

| স্তর | কোথায় চলে | Compute | Data access | কীসের জন্য ঠিক |
| ---- | ---------- | ------- | ----------- | -------------- |
| **CDN cache** | কয়েকশো জায়গায় | নেই | নেই | যা আগেই render হয়ে আছে |
| **Edge runtime** | কয়েক ডজন জায়গায় | শুধু Web API, সীমা ছোট | শুধু network দিয়ে | Request নিয়ে সিদ্ধান্ত |
| **Origin region** | এক বা কয়েকটি | পুরো runtime, npm, লম্বা সময় | Local, pooled | Rendering, database-এর কাজ |

স্তরগুলো বেছে নেওয়ার জিনিস নয়, একটার পর একটা পার হওয়ার জিনিস। Request প্রথমে CDN-এ আসে, আর CDN যা উত্তর
দিতে পারে না, শুধু সেটুকুই আরও ভেতরে যায়। সবচেয়ে দ্রুত route সেটাই, যেটা প্রথম স্তর ছেড়ে কখনো বেরোয় না।
**কোথায় চলবে তার চেয়ে caching সবসময় বেশি কাজের।** এ কারণেই
[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) এই অধ্যায়ের আগে আসে।

### হিসাবটা

ধরুন user Sydney-তে, database Virginia-য়, round trip মোটামুটি 200 ms।

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

Edge version শুরু হয়েছে 195 ms আগে, আর শেষ হয়েছে 195 ms পরে। Query-গুলো parallel-এ চালালে কিছুটা লাভ হয়:
তিনটি একসঙ্গে চালালে 210 ms, মোটামুটি সমান সমান। কিন্তু কোনো query যদি আগের query-র ফলের ওপর নির্ভর করে, edge
আবার পিছিয়ে পড়ে। আর বেশিরভাগ আসল page-এ অন্তত একটি এমন query থাকে।

**নিয়মটা হলো: data round trip-এর সংখ্যাকে data-র দূরত্ব দিয়ে গুণ করুন। গুণফল user-এর দূরত্বের চেয়ে বেশি হলে
origin-এ render করুন।**

### Edge-এ আসলে যা রাখা উচিত

যে কাজ O(1), যাতে data লাগে না, আর যার ফল একটি page নয়, একটি সিদ্ধান্ত:

- Path, host বা cookie দেখে **redirect আর rewrite**।
- **Experiment আর feature-flag বরাদ্দ**: cookie পড়ুন, একটি bucket বেছে নিন, একটি header বসান।
- Request-এর নিজের metadata দেখে **geolocation আর locale routing**।
- দামি কোনো route-এ পৌঁছানোর আগেই **bot আর abuse ছেঁকে ফেলা**।
- **আশাবাদী authentication gating**: আদৌ কোনো session cookie আছে কি? আসল যাচাই হয় data যেখানে, সেখানে।

পাঁচটির ধরন একই: request পড়ুন, সিদ্ধান্ত নিন, হাতবদল করুন। কোনো database নেই, rendering নেই, ধীর কোনো কিছুর
জন্য await নেই। একটি framework এটা কীভাবে করে, দেখুন
[Chapter ?? — Middleware, Runtime ও Deployment](#ch-nextjs-middleware-and-the-edge)-এ।

### Compute নয়, data সরানো

কোনো route যদি সত্যিই user-এর কাছে চলে লাভবান হয়, তাহলে তার data-ও সঙ্গে নিয়ে যান।

| কৌশল | কীসের জন্য মানানসই | খরচ কী |
| ---- | ----------------- | ------ |
| **Edge region-এর কাছে read replica** | যেখানে read বেশি, আর replication lag চলে | Lag, আর write-এর পথ তখনও বাড়ি ফেরে |
| **Edge key–value বা config store** | ছোট, ধীরে বদলানো value: flag, redirect, routing table | Eventual consistency; user data-র জন্য নয় |
| **Replicated বা globally-distributed database** | সত্যিকারের global product | খরচ, আর এমন একটি consistency model, যা আপনাকে বুঝতে হবে |
| **Data নয়, render-টা cache করুন** | বাকি প্রায় সবকিছু | পুরনো হওয়া, যেটা আপনি এমনিতেও বেছে নিচ্ছিলেন |

শেষ সারিটাই সাধারণত ঠিক উত্তর, আর বেশিরভাগ candidate এটা বাদ দিয়ে যান। CDN-এ cache করা page user-এর নিজের শহর
থেকেই serve হয়, কোথাও কোনো compute ছাড়াই। Latency, availability আর খরচ, তিন দিকেই একসঙ্গে এটা edge rendering-কে
হারিয়ে দেয়।

### Origin compute-কে database-এর কাছে বেঁধে রাখা

এটা একই ধারণার অন্য দিক। কোনো route-কে প্রতিটি request-এ render করতেই হলে function-টা রাখুন সেই region-এ, যেখানে
primary database আছে। Office-এর সবচেয়ে কাছের region বা platform-এর default region নেবেন না।

Serverless application-এ নিজের হাতে তৈরি latency-র সবচেয়ে সাধারণ কারণ এটাই। Function Virginia-য় আর database
Frankfurt-এ থাকলে প্রতিটি request-এর প্রতিটি query-তে 90 ms লাগে, চিরকাল।

### Streaming-এর জন্য edge লাগে না

একটি প্রচলিত ভুল ধারণা হলো, streamed response-এর জন্য edge runtime লাগে। লাগে না। Streaming HTTP response-এর
বৈশিষ্ট্য, আর পুরো origin runtime দিব্যি stream করতে পারে। দেখুন
[Chapter ?? — Streaming HTML](#ch-streaming-html)।

ভুল ধারণাটা এসেছে কারণ দুটি feature একই platform-এ একসঙ্গে এসেছিল। Streaming পাওয়ার জন্য edge runtime বেছে নেওয়া
মানে npm package, database driver আর লম্বা duration ছেড়ে দেওয়া, এমন একটি জিনিসের জন্য যা আপনার আগে থেকেই ছিল।

## কখন ব্যবহার করবেন

| কাজ | কোথায় রাখবেন | কারণ |
| --- | ------------ | ---- |
| আগেই render হওয়া HTML বা asset | **CDN** | Compute না থাকাই সবচেয়ে দ্রুত compute |
| Redirect, rewrite, flag বরাদ্দ, bot filter | **Edge** | সময় স্থির, data লাগে না |
| Database পড়ে এমন rendering | **Origin, data-র region-এ** | Round trip-ই আসল খরচ |
| npm package বা Node API লাগে এমন যেকোনো কাজ | **Origin** | Edge runtime-এ এগুলো নেই |
| দীর্ঘ সময় চলা বা CPU-ভারী কাজ | **Origin** | Edge-এর duration-এর সীমা কড়া |
| সারা বিশ্বে ছড়ানো read-only dataset | **Edge, replica বা KV store সহ** | Data-ও সরে গেছে |

## সাধারণ ভুল

**❌ Data round trip না গুনেই latency-র জন্য edge বেছে নেওয়া।**
✅ ওপরের হিসাবটা করুন। নির্ভরশীল একটি query-ই সাধারণত পুরো লাভ মুছে দেয়।

**❌ Edge middleware-এ আসল authentication check বসানো।**
✅ Edge থেকে database-এ session যাচাই করলে *প্রতিটি* request-এ এক মহাদেশ থেকে আরেক মহাদেশে একটি round trip যোগ
হয়, cache হওয়া request-এও। Edge-এ শুধু দেখুন cookie আছে কি না, আর যাচাই করুন data যেখানে, সেখানে।

**❌ Matcher ছাড়া প্রতিটি request-এ middleware চালানো।**
✅ Edge middleware-এর bill হয় প্রতিটি invocation-এ, আর এটা cache-এর আগে চলে। Matcher ছাড়া middleware site-এর
প্রতিটি static asset-এ একটি করে function call যোগ করে।

**❌ Experiment precomputation দিয়ে cache ফুলিয়ে ফেলা।**
✅ Edge-এ বরাদ্দ করা flag প্রায়ই প্রতিটি combination-এর জন্য আলাদা prerendered variant তৈরি করে। তিনটি locale জুড়ে
চারটি flag মানে প্রতিটি page-এর বারোটি copy, যার বেশিরভাগই cold। শেষ হওয়া experiment সরিয়ে ফেলুন।

**❌ ধরে নেওয়া যে "edge" সব platform-এ একই জিনিস।**
✅ Runtime-এর সীমা, কোন API পাওয়া যায়, কয়টি region, দাম কত, সবই অনেক আলাদা। অন্য platform নিয়ে লেখা blog post
নয়, নিজের platform-এর documentation দেখুন।

## 🔑 মূল শিক্ষা

- তিনটি স্তর: CDN-এ compute নেই, edge-এ data নেই, origin-এ compute আর data দুটিই আছে।
- User-এর কাছে পৌঁছানোর latency-র চেয়ে data-র কাছে পৌঁছানোর latency সাধারণত বেশি ভারী। Compute সরানোর আগে round trip গুনুন।
- Edge মানানসই request নিয়ে স্থির সময়ের সিদ্ধান্তের জন্য, database পড়ে এমন rendering-এর জন্য নয়।
- Render হওয়া output cache করা latency, খরচ আর availability, তিন দিকেই একসঙ্গে edge rendering-কে হারায়।
- Origin runtime-এও streaming চলে। Edge runtime বেছে নেওয়ার কারণ এটা নয়।

## Interview-এর প্রশ্ন

**Q: কখন edge render করার ভুল জায়গা?**

যখন render-এর এমন data লাগে, যা অন্য কোথাও থাকে। Request-এ যে দূরত্ব বাঁচিয়েছিলেন, প্রতিটি query সেই দূরত্ব পার
হয়, আর নির্ভরশীল query থাকলে সেটা গুণ হয়ে যায়। Virginia-র database নিয়ে Sydney-তে render করলে একটি ধীর round
trip কয়েকটি হয়ে যায়। Data কাছাকাছি replicate করা না থাকলে database-এর region-এ origin rendering-ই জেতে।

**Q: একসময় edge runtime-এর পক্ষে যুক্তি ছিল cold start। এখনও কি তাই?**

অনেক কম। Origin platform এখন request-এর পর request warm instance আবার ব্যবহার করে, আর compiled bytecode cache করে।
একটি instance-এ একসঙ্গে কয়েকটি invocation চালায়। তাই cold start এখন বিরল, আর মানুষ এখনও যে সংখ্যা বলে, তার চেয়ে
ছোট। অনুমান না করে মেপে দেখুন। সীমাবদ্ধ runtime মেনে নেওয়ার কারণ হিসেবে এটা আগের চেয়ে অনেক দুর্বল।

**Q: সারা বিশ্বে ছড়ানো একটি application-এ authentication কোথায় করবেন?**

দুই স্তরে। Edge-এ সস্তা একটি উপস্থিতি যাচাই চালান: session cookie আছে কি, আর তার গঠন ঠিক আছে কি? এতে
unauthenticated traffic কোনো খরচ তৈরি করার আগেই redirect হয়ে যায়। আসল যাচাই হয় session store বা database-এর
একই region-এ। শুধু সেখানেই এটা একটি local round trip-এ শেষ হতে পারে।

**Q: একটি route origin-এ server-rendered, আর ইউরোপের user-দের জন্য ধীর। বিকল্পগুলো কী, কোন ক্রমে?**

প্রথমে cache করুন। HTML share করা গেলে CDN সেটা Frankfurt থেকেই serve করবে, কোনো compute ছাড়া। সত্যিই প্রতি
request-এ আলাদা হলে দেখুন function database-এর একই region-এ চলছে কি না। প্রায়ই আসল bug এটাই। এই দুটির পরেই
শুধু ইউরোপে read replica-র কথা ভাবব। Render-কে edge-এ সরানো শেষ বিকল্প, প্রথম নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Middleware, Runtime ও Deployment](#ch-nextjs-middleware-and-the-edge) — একটি framework-এর ভেতরে একই tradeoff
- [Chapter ?? — CDN](#ch-cdn) — এসবে পৌঁছানোর আগে প্রথম স্তর কী করে
- [Chapter ?? — Scalability, Latency ও Throughput](#ch-scalability) — হিসাবের পেছনের সংখ্যাগুলো
