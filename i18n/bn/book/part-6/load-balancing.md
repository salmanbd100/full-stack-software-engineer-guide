---
sourceHash: "dab722b09454f2df6de63f9acf094690a073391a5e5b923bf94fb9529367b213"
title: "Load Balancing"
translatedAt: "2026-10-12T12:24:00.151Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Load Balancing {#ch-load-balancing}

> Traffic-এর সাথে মিলিয়ে একটি layer আর একটি algorithm বাছুন, আর একটি node মরে গেলে ঠিক কী হয়, তা বলতে পারুন।

**এই অধ্যায়ে:** layer 4 বনাম layer 7 · routing algorithm · যে health check outage ঘটায় · draining আর auto-scaling · service discovery · multi-region-এ যাওয়া

## 💡 মূল ধারণা

Load balancer কয়েকটি server-কে একটি logical service-এ পরিণত করে। Client-রা একটি নামেই call করে, আর কোন machine
উত্তর দেবে তা balancer ঠিক করে। Scaling-এর বাকি প্রতিটি পদক্ষেপ এই ধাপের ওপর নির্ভর করে। দ্বিতীয় একটি server কোনো
কাজে আসে না, যতক্ষণ না কিছু একটি তাকে traffic পাঠাতে রাজি হয়।

মজার অংশটা বণ্টন নয়। মজার অংশটা failure handling। এমন একটি balancer ভাবুন, যেটা traffic সমানভাবে ছড়ায়, কিন্তু একটি
মৃত node টের পেতে নব্বই সেকেন্ড নেয়। এটা আপনাকে availability কিনে দেয়নি। এটা কিনে দিয়েছে একটি ধীর outage।
Design-এর বেশিরভাগ কাজ health check-এ।

## কীভাবে কাজ করে

Balancer প্রতিটি request একটি public address-এ নেয়, একটি healthy backend বাছে, আর সেখানে forward করে। একই সাথে সে
প্রতি দশ থেকে ত্রিশ সেকেন্ডে প্রতিটি backend-কে probe করে, আর যেগুলো উত্তর দেওয়া বন্ধ করে সেগুলো সরিয়ে দেয়। সামনে
একটি address, পেছনে একটি pool, আর একটি probe, যেটা ঠিক করে pool-এ কে থাকবে।

### Layer 4 বনাম layer 7

Layer ঠিক করে, request-এর কতটা balancer পড়তে পারবে।

| | Layer 4 (transport) | Layer 7 (application) |
| --- | --- | --- |
| **যা দেখে** | IP আর port | Path, host, header, cookie |
| **যার ভিত্তিতে route করে** | Connection tuple | Request-এর যেকোনো কিছু |
| **বাড়তি latency** | এক millisecond-এর কম | এক থেকে দুই millisecond |
| **TLS termination** | না — byte-গুলো সরাসরি চলে যায় | হ্যাঁ |
| **কখন ব্যবহার করবেন** | Raw TCP, microsecond-এ মাপা latency budget | HTTP service, microservice-এ path-ভিত্তিক routing |

Web-এর কাজে layer 7-ই default। আপনি একটি millisecond ছাড়েন, আর বিনিময়ে `/api/*` একটি service-এ আর `/images/*`
আরেকটিতে পাঠাতে পারেন, client না জেনেই যে দুটি আছে।

### Routing algorithm

| Algorithm | Request পাঠায় | কীসের জন্য সেরা |
| --- | --- | --- |
| **Round-robin** | পালাক্রমে পরের server-এ | সমান machine, একই রকম খরচের stateless request |
| **Weighted round-robin** | বেশি weight-এর server-এ, অনুপাতে | বিভিন্ন আকারের instance, বা rolling deploy-এর সময় traffic সরানো |
| **Least connections** | যে server-এ সবচেয়ে কম open connection | একেবারে ভিন্ন সময়ের request — upload, WebSocket |
| **IP hash** | Client IP যে server-এ map হয় | হালকা session affinity, যখন এর চেয়ে ভালো কিছু নেই |

**যে দুটি প্রায় প্রতিটি ক্ষেত্র সামলায়:**

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

IP hash নিয়ে একটি সতর্কতা দরকার। Mobile client WiFi আর cellular-এর মধ্যে যাতায়াত করে, আর session-এর মাঝখানে IP
বদলায়। Client address-এর ওপর গড়া affinity ঠিক তখনই ভাঙে, যখন একজন user একটি building থেকে বেরিয়ে আসেন। Session
state দরকার হলে সেটা Redis-এ রাখুন, আর প্রতিটি server-কে বদলযোগ্য রাখুন।

### যে health check outage ঘটায়

যে health check shared dependency পরীক্ষা করে, সেটা একদিন আপনার পুরো fleet একসাথে নামিয়ে দেবে।

**❌ একটি endpoint, সবকিছু পরীক্ষা করছে:**

```typescript
// Every instance depends on the same database. When it blips, every instance
// fails the check in the same second and the balancer empties the pool.
app.get("/health", async (_req, res) => {
  await db.query("SELECT 1");
  await redis.ping();
  res.sendStatus(200);
});
```

**✅ দুটি endpoint, দুটি আলাদা প্রশ্নের উত্তর দিচ্ছে:**

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

Threshold-গুলো পাটিগণিত, আর জোরে বলে হিসাব করার মতো:

```text
Time to remove a dead server = interval x unhealthy threshold  = 15s x 3 = 45s
Time to return a recovered one = interval x healthy threshold  = 15s x 2 = 30s
```

> ⚠️ 5 সেকেন্ডের interval আর 2-এর threshold দশ সেকেন্ডে failure ধরে। এটা একটি garbage-collection pause-এর সময়
> healthy server-ও বের করে দেয়। দ্রুত ধরা মানে বেশি flapping — server-গুলো pool থেকে বেরিয়ে যায় আর ফিরে আসে।

### Draining আর auto-scaling

Instance-এর জীবনচক্র balancer আর auto-scaler নিজেদের মধ্যে ভাগ করে নেয়।

একটি নতুন instance pool-এ যোগ দেয় শুধু readiness পাস করার পরে। চলে যাওয়া একটি instance নতুন request নেওয়া বন্ধ করে, তারপর drain করে। **Scale-out অপেক্ষা করে একটি probe-এর জন্য; scale-in অপেক্ষা করে একটি drain-এর জন্য।**

**Connection draining হলো সেই ধাপ, যেটা মানুষ বাদ দেয়।** এটা ছাড়া একটি instance থামালে সেটা তখনো যে request-গুলো
সামলাচ্ছিল, সেগুলো মরে যায়। এই failure-গুলো পড়ে আসল user-দের ঘাড়ে, অথচ dashboard একটি সফল scale-in দেখায়। ত্রিশ
থেকে ষাট সেকেন্ডে প্রায় যেকোনো HTTP request শেষ হয়। দীর্ঘস্থায়ী WebSocket connection-এর জন্য বরং application-level-এ
একটি "এখনই reconnect করুন" ধাক্কা দরকার।

### প্রথমে instance-গুলো খুঁজে পাওয়া

Balancer-এর দরকার healthy backend-এর একটি তালিকা, আর auto-scaled একটি পরিবেশে সেই তালিকা কয়েক মিনিট পরপর বদলায়।
Service discovery-ই এটাকে হালনাগাদ রাখে।

| Model            | কীভাবে কাজ করে                                                    | কোথায় দেখা পাবেন                  |
| ---------------- | ---------------------------------------------------------------- | ------------------------------ |
| Server-side      | Instance-রা একটি registry-তে নিবন্ধন করে; balancer সেটা পড়ে          | AWS target group, Kubernetes Service |
| Client-side      | Caller registry-কে জিজ্ঞেস করে আর নিজেই একটি instance বাছে          | Consul, Eureka, gRPC name resolver |
| DNS-based        | একটি service-এর নাম বর্তমান instance-এর address-এ resolve হয়        | Kubernetes cluster DNS         |

External traffic-এর জন্য server-side-ই default, আর application-এর কাছ থেকে এর কিছুই লাগে না। Client-side একটি network
hop কমায়, আর algorithm-এর নিয়ন্ত্রণ caller-কে দেয়, বিনিময়ে প্রতিটি service-এ একটি discovery client লাগে। তিনটির মধ্যে
DNS সবচেয়ে সরল, আর ভুল করাও সবচেয়ে সহজ। Client-রা TTL পেরিয়েও resolution cache করে রাখে, তাই চলে যাওয়া একটি
instance কয়েক মিনিট ধরে traffic পেতে থাকতে পারে।

Registry নিজে যেন single point of failure না হয়ে ওঠে। Caller-রা শেষ ভালো instance তালিকাটা cache করে রাখে, আর
registry-তে পৌঁছানো না গেলে সেটাই ব্যবহার করতে থাকে। কোনো তালিকা না থাকার চেয়ে একটি stale তালিকা অনেক ভালো।

### Multi-region-এ যাওয়া

একাধিক region-এ চালানো শুরু করলে regional balancer-গুলোর সামনে একটি global balancer বসে। এটা প্রতিটি location থেকে
একটি address ঘোষণা করে, আর network-এর দূরত্ব ও region-এর health দেখে route করে।

| Layer | যা ঠিক করে | যে failure সামলায় |
| --- | --- | --- |
| **Global balancer** | কোন region | পুরো একটি region অন্ধকার হয়ে যাওয়া |
| **Regional balancer** | কোন server | একটি instance মরে যাওয়া |
| **Cross-zone balancing** | Region-এর ভেতরে কোন availability zone | একটি zone ভারসাম্যহীন বা unhealthy হয়ে যাওয়া |

Interviewer-রা failover-এর গল্পটা চান। ধরুন Singapore region তার health check-এ fail করল। Global balancer Singapore-এর
address দিয়ে উত্তর দেওয়া বন্ধ করে, আর মোটামুটি এক মিনিটের মধ্যে traffic পরের সবচেয়ে কাছের healthy region-এ পৌঁছায়।
Latency খারাপ হয়, কিন্তু service চালু থাকে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | যা করবেন |
| --- | --- |
| একটি server saturated | একটি balancer আর দ্বিতীয় একটি server যোগ করুন — এই ক্রমে |
| 99.9%-এর চেয়ে ভালো uptime দরকার | Fail করা server সরিয়ে দেওয়া balancer-ই সেই mechanism, যেটা এটা কিনে দেয় |
| Zero-downtime deploy | Balancer-এর পেছনে rolling update: পুরোনোটা drain করুন, নতুনটা যোগ করুন, weight দিয়ে traffic সরান |
| দীর্ঘস্থায়ী connection | Least connections, আর scale-in-এর সময় reconnect-এর পরিকল্পনা রাখুন |
| Session টিকে থাকতে হবে | User-দের server-এ বেঁধে না রেখে session Redis-এ সরান |

## সাধারণ ভুল

❌ **App server-এ session।** পরের request অন্য machine-এ পড়ে, আর user logout হয়ে যান। ✅ Session state Redis বা একটি
signed token-এ রাখুন, যাতে প্রতিটি server বদলযোগ্য থাকে।

❌ **এমন health check, যেটা shared database পরীক্ষা করে।** একটি ছোট ঝাঁকুনিতেই প্রতিটি instance একসাথে fail করে, আর
pool খালি হয়ে যায়। ✅ Liveness আর readiness আলাদা করুন, আর fleet-এর সদস্যপদ যে check নিয়ন্ত্রণ করে, তাতে কখনো shared
dependency probe করবেন না।

❌ **WebSocket-এর জন্য round-robin।** Connection দীর্ঘস্থায়ী আর অসমান, তাই নতুন connection-এর সমান ভাগ load-এর একেবারে
অসমান ভাগে পরিণত হয়। ✅ Least connections।

❌ **কোনো connection draining নেই।** প্রতিটি scale-in আর প্রতিটি deploy-এ in-flight request মরে যায়। ✅ একটি drain
window configure করুন, আর deploy-কে সেটার জন্য অপেক্ষা করান।

❌ **একটি balancer, কোনো redundancy নেই।** Single point of failure সরাতে যেটা যোগ করেছিলেন, সেটাই একটি হয়ে যায়।
✅ Managed balancer default-এই zone জুড়ে redundant node চালায়। সেটা ব্যবহার করুন, নিজে host করা একটি instance নয়।

## 🔑 মূল শিক্ষা

- Load balancer-এর মূল্য failure ধরায়, বণ্টনে নয়। Routing algorithm সহজ অর্ধেক।
- Layer 7-এর খরচ প্রায় এক millisecond, আর এটা path, host আর header দেখে routing কিনে দেয়। HTTP-র জন্য এটাই default।
- Liveness আর readiness আলাদা প্রশ্ন, আর এদের এক করলে একটি dependency-র ছোট ঝাঁকুনি outage হয়ে যায়।
- ধরার সময় = interval × threshold, আর এটা কমালে গতির বিনিময়ে flapping আসে।
- Draining-ই একটি পরিচ্ছন্ন scale-in-কে user-এর চোখে পড়া error-এর ঝাঁক থেকে আলাদা করে।

## Interview-এর প্রশ্ন

**Q: একটি HTTP API-র জন্য layer 4 নাকি layer 7, আর কেন?**

Layer 7, যদি না না-করার নির্দিষ্ট কোনো কারণ থাকে। এটা path আর host দেখে route করতে পারে, এক জায়গায় TLS terminate
করতে পারে, আর প্রতিটি route-এর metric দিতে পারে। খরচ হলো এক-দুই millisecond বাড়তি latency, আর balancer plaintext
দেখে। Layer 4 জেতে, যখন protocol HTTP নয়, বা latency budget এত টাইট যে একটি millisecond-ও গুরুত্বপূর্ণ।

**Q: আপনার health check database-এ hit করে। এতে সমস্যা কী?**

প্রতিটি instance সেই database ভাগ করে, তাই database-এর একটি সংক্ষিপ্ত সমস্যা একসাথে প্রতিটি check fail করায়।
Balancer তখন প্রতিটি server সরিয়ে দেয়, আর একটি খালি pool নিয়ে 503 ফেরত দেয়। সেই outage মূল ঝাঁকুনির চেয়ে খারাপ।
Liveness-এর শুধু process-টা পরীক্ষা করা উচিত। Readiness একটি dependency পরীক্ষা করতে পারে, কিন্তু ছোট timeout দিয়ে,
আর এটা জেনে যে একটি shared dependency পুরো fleet জুড়ে এটাকে fail করাবে।

**Q: কখন আপনি একটি service-এর সামনে load balancer রাখবেন না?**

যখন ঠিক একটি instance আছে, আর দ্বিতীয়টির কোনো পরিকল্পনা নেই। তখন balancer একটি hop, একটি খরচ আর configure করার
আরেকটি জিনিস যোগ করে, আর কোনো availability কিনে দেয় না। Internal single-instance tool আর শুধু একটি queue দিয়ে পৌঁছানো
background worker হলো সাধারণ উদাহরণ। যে মুহূর্তে uptime গুরুত্বপূর্ণ হয়, বা দ্বিতীয় একটি instance আসে, হিসাব উল্টে যায়।

## এরপর কী পড়বেন

- [Chapter ?? — Scalability, Latency ও Throughput](#ch-scalability) — scaling lever-গুলোর মধ্যে balancing কোথায় বসে
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — ওপরের layer, যেটা বণ্টনের বদলে auth আর rate limiting করে
- [Chapter ?? — Reliability, Consistency ও CAP](#ch-consistency-and-cap) — nine-গুলোর আসল খরচ
