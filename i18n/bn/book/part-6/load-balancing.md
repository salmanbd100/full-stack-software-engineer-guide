---
sourceHash: "dab722b09454f2df6de63f9acf094690a073391a5e5b923bf94fb9529367b213"
title: "Load Balancing"
translatedAt: "2026-10-17T14:04:01.290Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Load Balancing {#ch-load-balancing}

> Traffic-এর সঙ্গে মিলিয়ে layer আর algorithm বেছে নিন, আর একটি node মারা গেলে ঠিক কী হয়, তা বলতে পারুন।

**এই অধ্যায়ে:** layer 4 বনাম layer 7 · routing algorithm · যে health check outage ঘটায় · draining আর auto-scaling · service discovery · multi-region-এ যাওয়া

## 💡 মূল ধারণা

Load balancer কয়েকটি server-কে একটি logical service বানিয়ে দেয়। Client একটি নামেই call করে, আর কোন machine উত্তর
দেবে তা ঠিক করে balancer। Scale করার বাকি প্রতিটি পদক্ষেপ এই ধাপের ওপর নির্ভর করে। যতক্ষণ না কেউ দ্বিতীয় server-এ
traffic পাঠাতে রাজি হচ্ছে, ততক্ষণ সেটা কোনো কাজেই আসে না।

আসল মজার অংশ traffic ভাগ করা নয়, failure সামলানো। ভাবুন একটি balancer traffic সমানভাবে ছড়ায়, কিন্তু একটি মরা node
টের পেতে নব্বই সেকেন্ড লাগে। এটা আপনাকে availability দেয়নি। দিয়েছে আরও ধীর একটি outage। Design-এর বেশিরভাগ কাজ
health check-এ।

## কীভাবে কাজ করে

Balancer একটি public address-এ প্রতিটি request নেয়, একটি সুস্থ backend বেছে নেয়, আর সেখানে পাঠিয়ে দেয়। পাশাপাশি
প্রতি দশ থেকে ত্রিশ সেকেন্ডে প্রতিটি backend-কে probe করে, আর যারা উত্তর দেওয়া বন্ধ করে, তাদের সরিয়ে দেয়। সামনে
একটি address, পেছনে একটি pool, আর একটি probe ঠিক করে কে pool-এ থাকবে।

### Layer 4 বনাম layer 7

Request-এর কতটা balancer পড়তে পারবে, তা ঠিক করে layer।

| | Layer 4 (transport) | Layer 7 (application) |
| --- | --- | --- |
| **যা দেখে** | IP আর port | Path, host, header, cookie |
| **কীসের ভিত্তিতে route করে** | Connection tuple | Request-এর যেকোনো কিছু |
| **বাড়তি latency** | এক millisecond-এর কম | এক থেকে দুই millisecond |
| **TLS termination** | না, byte-গুলো সোজা চলে যায় | হ্যাঁ |
| **কখন নেবেন** | কাঁচা TCP, microsecond-এ মাপা latency budget | HTTP service, path দেখে microservice-এ routing |

Web-এর কাজে layer 7-ই default। এক millisecond ছেড়ে দিয়ে আপনি `/api/*` একটি service-এ আর `/images/*` আরেকটিতে
পাঠাতে পারেন, আর client জানতেই পারে না যে service দুটি।

### Routing algorithm

| Algorithm | Request পাঠায় | কোথায় সবচেয়ে ভালো |
| --------- | ------------ | ---------------- |
| **Round-robin** | পালা অনুযায়ী পরের server-এ | সমান machine, প্রায় একই খরচের stateless request |
| **Weighted round-robin** | বেশি weight-এর server-এ, অনুপাত মেনে | আলাদা আকারের instance, বা rolling deploy-এর সময় traffic সরানো |
| **Least connections** | যে server-এ সবচেয়ে কম connection খোলা | যে request-গুলোর সময় একেবারে আলাদা, যেমন upload, WebSocket |
| **IP hash** | Client-এর IP যে server-এ map হয় | হালকা session affinity, যখন এর চেয়ে ভালো কিছু নেই |

**যে দুটি প্রায় সব ক্ষেত্র সামলে নেয়:**

```typescript
interface Server { url: string; weight: number; activeConnections: number; healthy: boolean }

// Weighted: expanding by weight is fine for a pool of tens, not for a hot path.
function weightedRoundRobin(servers: Server[]): Server | null {
  const pool = servers.filter((s) => s.healthy).flatMap((s) => Array<Server>(s.weight).fill(s));
  return pool.length === 0 ? null : pool[Math.floor(Math.random() * pool.length)];
}

// Least connections: the right default when request durations vary widely.
function leastConnections(servers: Server[]): Server | null {
  const healthy = servers.filter((s) => s.healthy);
  return healthy.length === 0
    ? null
    : healthy.reduce((min, s) => (s.activeConnections < min.activeConnections ? s : min));
}
```

IP hash নিয়ে একটি সতর্কতা দরকার। Mobile client WiFi আর cellular-এর মধ্যে আসা-যাওয়া করে, আর session-এর মাঝখানেই IP
বদলায়। Client-এর address দিয়ে বানানো affinity ঠিক তখনই ভাঙে, যখন একজন user building থেকে বেরিয়ে যান। Session state
লাগলে সেটা Redis-এ রাখুন, আর প্রতিটি server-কে একটির জায়গায় আরেকটি বসানোর মতো রাখুন।

### যে health check outage ঘটায়

যে health check shared dependency পরীক্ষা করে, সেটা একদিন না একদিন আপনার পুরো fleet একসঙ্গে ফেলে দেবে।

**❌ একটি endpoint, যা সবকিছু পরীক্ষা করে:**

```typescript
// Every instance depends on the same database. When it blips, every instance
// fails the check in the same second and the balancer empties the pool.
app.get("/health", async (_req, res) => {
  await db.query("SELECT 1");
  await redis.ping();
  res.sendStatus(200);
});
```

**✅ দুটি endpoint, দুটি আলাদা প্রশ্নের উত্তর দেয়:**

```typescript
// Liveness: is the process alive? Nothing external, so a dependency blip degrades
// the service instead of deleting the fleet.
app.get("/health", (_req, res) => res.sendStatus(200));

// Readiness: can this instance serve right now? Short timeout, so a slow dependency
// cannot hang the probe itself.
app.get("/ready", async (_req, res) => {
  res.sendStatus((await checkDbPool({ timeoutMs: 1000 })) ? 200 : 503);
});
```

Threshold-গুলো সাধারণ হিসাব, আর জোরে বলে করার মতো:

```text
Time to remove a dead server = interval x unhealthy threshold  = 15s x 3 = 45s
Time to return a recovered one = interval x healthy threshold  = 15s x 2 = 30s
```

> ⚠️ 5 সেকেন্ডের interval আর threshold 2 হলে দশ সেকেন্ডে failure ধরা পড়ে। কিন্তু garbage-collection pause-এর সময় এটা
> সুস্থ server-কেও বের করে দেয়। দ্রুত ধরতে গেলে flapping বাড়ে, মানে server বারবার pool থেকে বেরিয়ে যায় আর ফিরে আসে।

### Draining আর auto-scaling

Instance-এর জীবনচক্র balancer আর auto-scaler ভাগ করে নেয়।

নতুন instance pool-এ ঢোকে শুধু readiness পাস করার পর। যেটা চলে যাচ্ছে, সেটা নতুন request নেওয়া বন্ধ করে, তারপর drain
হয়। **Scale-out অপেক্ষা করে একটি probe-এর জন্য, scale-in অপেক্ষা করে একটি drain-এর জন্য।**

**Connection draining-ই সেই ধাপ, যা মানুষ বাদ দিয়ে ফেলে।** এটা ছাড়া একটি instance থামালে তখনো চলতে থাকা request-গুলো
মারা যায়। সেই failure গিয়ে পড়ে সত্যিকারের user-দের ঘাড়ে, অথচ dashboard দেখায় scale-in সফল। ত্রিশ থেকে ষাট সেকেন্ডে
প্রায় যেকোনো HTTP request শেষ হয়ে যায়। দীর্ঘস্থায়ী WebSocket connection-এর জন্য বরং application-স্তরে একটি "এখনই
reconnect করুন" ইঙ্গিত লাগে।

### প্রথমে instance-গুলো খুঁজে পাওয়া

Balancer-এর সুস্থ backend-এর একটি তালিকা লাগে, আর auto-scale করা পরিবেশে সেই তালিকা কয়েক মিনিট পরপর বদলায়। তালিকাটা
হালনাগাদ রাখে service discovery।

| Model | কীভাবে কাজ করে | কোথায় দেখবেন |
| ----- | ------------- | ----------- |
| Server-side | Instance-গুলো একটি registry-তে নাম লেখায়, balancer সেটা পড়ে | AWS target group, Kubernetes Service |
| Client-side | Caller নিজে registry-তে query করে, আর নিজেই একটি instance বেছে নেয় | Consul, Eureka, gRPC name resolver |
| DNS-based | একটি service নাম resolve হয়ে বর্তমান instance-এর address দেয় | Kubernetes cluster DNS |

বাইরের traffic-এর জন্য server-side-ই default, আর এতে application-এর কিছু করতে হয় না। Client-side একটি network hop
কমায়, আর algorithm-এর নিয়ন্ত্রণ caller-এর হাতে দেয়। দাম হলো প্রতিটি service-এ একটি discovery client। তিনটির মধ্যে DNS
সবচেয়ে সহজ, আর ভুল করাও সবচেয়ে সহজ। Client-রা TTL পেরিয়ে গেলেও resolution cache করে রাখে, তাই চলে যাওয়া একটি
instance-ও কয়েক মিনিট ধরে traffic পেতে থাকতে পারে।

Registry নিজে যেন single point of failure না হয়ে যায়। Caller-রা সর্বশেষ ভালো instance-তালিকা cache করে রাখে, আর
registry-তে পৌঁছানো না গেলে সেটাই ব্যবহার করতে থাকে। কোনো তালিকা না থাকার চেয়ে একটি stale তালিকা অনেক ভালো।

### Multi-region-এ যাওয়া

একাধিক region-এ চালালে regional balancer-গুলোর সামনে বসে একটি global balancer। প্রতিটি location থেকে এটা একটিই
address ঘোষণা করে, আর network-এর দূরত্ব আর region-এর সুস্থতা দেখে route করে।

| Layer | কী ঠিক করে | কোন failure সামলায় |
| ----- | --------- | ----------------- |
| **Global balancer** | কোন region | পুরো একটি region অন্ধকার হয়ে গেলে |
| **Regional balancer** | কোন server | একটি instance মারা গেলে |
| **Cross-zone balancing** | Region-এর ভেতরে কোন availability zone | একটি zone ভারসাম্য হারালে বা অসুস্থ হলে |

Interviewer-রা failover-এর গল্পটা জানতে চান। ধরুন Singapore region health check-এ fail করছে। Global balancer Singapore-এর
address দিয়ে উত্তর দেওয়া বন্ধ করে, আর মোটামুটি এক মিনিটের মধ্যে traffic গিয়ে পড়ে পরের সবচেয়ে কাছের সুস্থ region-এ।
Latency খারাপ হয়, কিন্তু service চালু থাকে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী করবেন |
| -------- | ------- |
| একটি server ভরে গেছে | একটি balancer আর একটি দ্বিতীয় server যোগ করুন, এই ক্রমে |
| 99.9%-এর চেয়ে ভালো uptime দরকার | ব্যর্থ server সরিয়ে দেওয়ার কাজটাই balancer-কে দিয়ে সেটা পাইয়ে দেয় |
| Zero-downtime deploy | Balancer-এর পেছনে rolling update: পুরনোটা drain করুন, নতুনটা যোগ করুন, weight দিয়ে traffic সরান |
| দীর্ঘস্থায়ী connection | Least connections, আর scale-in-এর সময় reconnect-এর পরিকল্পনা রাখুন |
| Session টিকে থাকতে হবে | User-দের নির্দিষ্ট server-এ আটকে না রেখে session Redis-এ সরান |

## সাধারণ ভুল

❌ **App server-এ session রাখা।** পরের request অন্য machine-এ পড়ে, আর user logout হয়ে যান। ✅ Session state রাখুন
Redis-এ বা একটি signed token-এ, যাতে প্রতিটি server একটির জায়গায় আরেকটি বসানো যায়।

❌ **Shared database পরীক্ষা করা health check।** একটি ছোট হোঁচটেই প্রতিটি instance একসঙ্গে fail করে, আর pool খালি হয়ে
যায়। ✅ Liveness আর readiness আলাদা করুন। আর fleet-এ কে থাকবে তা যে check ঠিক করে, তাতে কখনো shared dependency probe
করবেন না।

❌ **WebSocket-এর জন্য round-robin।** Connection-গুলো দীর্ঘস্থায়ী আর অসমান, তাই নতুন connection সমান ভাগ হলেও load ভাগ
হয় একেবারে অসমানভাবে। ✅ Least connections।

❌ **Connection draining না রাখা।** প্রতিটি scale-in আর প্রতিটি deploy-এ চলমান request মারা যায়। ✅ একটি drain window
configure করুন, আর deploy-কে তার জন্য অপেক্ষা করান।

❌ **একটিই balancer, কোনো redundancy নেই।** Single point of failure দূর করতে যেটা যোগ করলেন, সেটাই একটি single point of
failure হয়ে যায়। ✅ Managed balancer default-এ বিভিন্ন zone জুড়ে redundant node চালায়। সেটাই ব্যবহার করুন, নিজে host
করা একটিমাত্র instance নয়।

## 🔑 মূল শিক্ষা

- Load balancer-এর আসল দাম failure ধরায়, traffic ভাগ করায় নয়। Routing algorithm হলো সহজ অর্ধেকটা।
- Layer 7-এর দাম প্রায় এক millisecond, আর বিনিময়ে path, host আর header দেখে routing পাওয়া যায়। HTTP-র জন্য এটাই default।
- Liveness আর readiness আলাদা প্রশ্ন। দুটি মিশিয়ে ফেললে dependency-র একটি ছোট হোঁচট outage হয়ে দাঁড়ায়।
- ধরতে কত সময় লাগবে = interval × threshold। এটা কমালে গতি বাড়ে, কিন্তু flapping-ও বাড়ে।
- Draining-ই একটি পরিষ্কার scale-in-কে user-দের চোখে পড়া একঝাঁক error থেকে আলাদা করে।

## Interview-এর প্রশ্ন

**Q: HTTP API-র জন্য layer 4 না layer 7, আর কেন?**

Layer 7, যদি না না-নেওয়ার নির্দিষ্ট কোনো কারণ থাকে। এটা path আর host দেখে route করতে পারে, এক জায়গায় TLS terminate
করতে পারে, আর route ধরে metrics দেয়। দাম হলো এক-দুই millisecond বাড়তি latency, আর balancer plaintext দেখতে পায়। Layer
4 জেতে যখন protocol HTTP নয়, বা latency budget এত টানটান যে একটি millisecond-ও গুরুত্বপূর্ণ।

**Q: আপনার health check database-এ যায়। এতে সমস্যা কী?**

প্রতিটি instance একই database ভাগ করে, তাই database-এ সামান্য সমস্যা হলেই প্রতিটি check একসঙ্গে fail করে। তখন balancer
প্রতিটি server সরিয়ে দেয়, আর খালি pool নিয়ে 503 return করে। সেই outage মূল হোঁচটের চেয়ে খারাপ। Liveness শুধু process-টা
পরীক্ষা করবে। Readiness একটি dependency পরীক্ষা করতে পারে, তবে ছোট timeout দিয়ে, আর এটা জেনে যে shared dependency পুরো
fleet জুড়ে একসঙ্গেই একে fail করাবে।

**Q: কখন একটি service-এর সামনে load balancer রাখবেন না?**

যখন instance ঠিক একটিই, আর দ্বিতীয়টির কোনো পরিকল্পনা নেই। তখন balancer একটি hop, একটি খরচ আর configure করার মতো আরেকটি
জিনিস যোগ করে, কিন্তু কোনো availability দেয় না। একটিমাত্র instance-এর internal tool, আর শুধু queue দিয়ে পৌঁছানো যায় এমন
background worker হলো সাধারণ উদাহরণ। যে মুহূর্তে uptime গুরুত্বপূর্ণ হয়, বা দ্বিতীয় একটি instance আসে, হিসাবটা উল্টে যায়।

## এরপর কী পড়বেন

- [Chapter ?? — Scalability, Latency ও Throughput](#ch-scalability) — scale করার উপায়গুলোর মধ্যে balancing কোথায় বসে
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — ওপরের layer, যা traffic ভাগ নয়, auth আর rate limiting করে
- [Chapter ?? — Reliability, Consistency ও CAP](#ch-consistency-and-cap) — nine-গুলোর আসল দাম
