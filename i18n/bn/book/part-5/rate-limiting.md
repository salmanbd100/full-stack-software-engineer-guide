---
sourceHash: "56070c101ace28d3ec881af5ee7a4cc50b1af84fc341e8c7c01b49e0a5aceafa"
title: "Rate Limiting"
translatedAt: "2026-10-17T14:06:13.668Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Rate Limiting {#ch-rate-limiting}

> আপনার traffic-এর ধরনের সঙ্গে মেলে এমন algorithm লিখুন, আর counter যেন প্রতিটি instance জুড়ে ঠিক থাকে, তা নিশ্চিত করুন।

**এই অধ্যায়ে:** fixed window আর তার সীমানার burst · sliding window counter · token bucket · Redis-এ atomic গণনা · কীসের ওপর key করবেন · header আর failure-এর ধরন

## 💡 মূল ধারণা

Rate limiting ঠিক করে দেয়, একটি নির্দিষ্ট সময়ের মধ্যে একজন caller আপনাকে দিয়ে কতটা কাজ করাতে পারবেন। এটা capacity রক্ষা করে, অপব্যবহার আটকে রাখে, third-party-র bill অনুমানযোগ্য রাখে, আর pricing tier বলবৎ করে।

Interview-এ যে ব্যাখ্যা নম্বর পায়: rate limiting খারাপ লোক আটকানোর জন্য নয়। এটা **প্রতিযোগিতার মধ্যে ন্যায্যতা**, যখন অনেক caller একই capacity-র জন্য লড়ছেন। একটি bug-ওয়ালা client যাতে বাকি সবাইকে বঞ্চিত না করে, সেটা আটকালেই limit তার কাজ করছে, কেউ আক্রমণ না করলেও।

এই অধ্যায়ে limiter-টা বানানো হয়। দুটি প্রশ্ন অন্য অধ্যায়ের: stack-এর কোথায় enforcement বসে (CDN, gateway, তারপর service), আর সেকেন্ডে দশ লাখ request-এ এর খরচ কত। দেখুন [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries)।

## কীভাবে কাজ করে

প্রতিটি algorithm একই প্রশ্নের উত্তর দেয়: এই caller কি বেশি নিয়ে ফেলেছেন? তফাত শুধু কে কী মনে রাখে, তাতে।

| Algorithm | Memory | নির্ভুলতা | Burst | কখন ব্যবহার করবেন |
| --------- | ------ | -------- | ------ | -------- |
| **Fixed window** | key-প্রতি O(1) | কম | সীমানায় 2× | সহজ internal API |
| **Sliding window log** | O(requests) | নিখুঁত | নেই | কম traffic, কড়া ন্যায্যতা |
| **Sliding window counter** | O(1) | ভালো | সামান্য | স্থির traffic, সীমানায় spike চলবে না |
| **Token bucket** | O(1) | ভালো | নিয়ন্ত্রিত | ✅ Production-এর default: public API, ভিন্ন ভিন্ন খরচ |
| **Leaky bucket (queue)** | O(queue) | নিখুঁত | নেই — output মসৃণ করে | ভঙ্গুর downstream রক্ষা করা |

**বেশিরভাগ API-র জন্য ছোট উত্তর: token bucket।** এটা সত্যিকারের burst চলতে দেয়, আর আসল client burst করেই: একটি page load একসঙ্গে আটটি request ছোড়ে। তবু দীর্ঘ মেয়াদের গড় ধরে রাখে। আর "এই endpoint-এর খরচ 10, ওটার 1", এই ধারণাতেও স্বাভাবিকভাবে বাড়ানো যায়।

### Fixed Window আর তার সীমানার সমস্যা

প্রতিটি ক্যালেন্ডার window-এ request গুনুন, আর সীমানায় পৌঁছালে শূন্য থেকে শুরু করুন।

ত্রুটিটা এখানে, আর এটা এঁকে দেখাতে পারা উচিত:

```text
limit = 100 per minute

12:00:59  ████████████████ 100 requests   ← fills window 1
12:01:00  ████████████████ 100 requests   ← window resets, fills window 2
          200 requests in ~1 second
```

**যেকোনো সীমানার দুই পাশ মিলিয়ে client limit-এর 2× পেয়ে যায়।** যে limit capacity রক্ষার জন্য আছে, সেটা ঠিক এই মুহূর্তেই ব্যর্থ হয়।

> ⚠️ **একাধিক instance-এ in-memory version-ও ভুল।** চারটি pod-এর প্রতিটিতে local `Map` থাকলে কার্যকর limit হয় আপনার configure করা সংখ্যার 4×। আর pod বাড়া-কমার সঙ্গে সেটাও সরতে থাকে।

### Sliding Window Counter

**Sliding window log** প্রতিটি request-এর একটি timestamp রাখে, আর পেছনের window-এর ভেতরে যা পড়ে তা গোনে। এটা নিখুঁত, কিন্তু traffic-এর সঙ্গে memory বাড়ে। মিনিটে 10k request পাঠানো একজন client মানে 10k timestamp।

**Sliding window counter** হলো বাস্তবসম্মত আপস: বর্তমান window-এর সংখ্যা আর আগের window-এর সংখ্যা রাখুন, আর আগেরটির যতটা এখনো overlap করে, সেই অনুপাতে তার ওজন দিন।

Key-প্রতি দুটি counter, O(1), আর সীমানায় 2× burst নেই। Window-এর ভেতরে traffic অসমান হলে কয়েক শতাংশ ভুল হতে পারে। Cloudflare-ও একই কারণে এই trade-off মেনে নিয়েছে।

### Token Bucket

একটি bucket-এ সর্বোচ্চ `capacity`টি token থাকে, আর `refillPerSec` হারে আবার ভরে। প্রতিটি request তার খরচের সমান token খরচ করে। Bucket খালি মানে request reject।

**দুটি knob, দুটি আলাদা অর্থ** — interviewer-রা ঠিক এই জায়গাটাই খোঁচান:

| Knob | কী নিয়ন্ত্রণ করে | উদাহরণ |
| ---- | -------- | ------- |
| `capacity` | কত বড় burst সহ্য করবেন | 100 → যে page 100টি call ছোড়ে, সেটা সফল হয় |
| `refillPerSec` | টানা চলার হার | 10/s → দীর্ঘ মেয়াদে মিনিটে 600 |

**খরচ-ভিত্তিক limiting হলো senior-এর চাল।** `GET /users/me` আর `POST /reports/export` একই রকম request নয়। আসল খরচ অনুযায়ী token নিন (GraphQL-এ query complexity অনুযায়ী)। তাহলে কোনো caller এক endpoint দিয়ে অন্য endpoint-এর জন্য ঠিক করা limit এড়াতে পারবেন না। Complexity কীভাবে গোনা হয়, দেখুন [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)।

**Leaky bucket** হলো এর queue-আকারের ভাই: request reject না হয়ে অপেক্ষা করে, আর নির্দিষ্ট হারে বেরিয়ে যায়। কোনো downstream system-এর এমন কড়া rate cap থাকলে, যা কিছুতেই ছাড়ানো যাবে না, তখন এটা ব্যবহার করুন। সেখানে আপনি নিজের output মসৃণ করছেন, কোনো caller-কে পাহারা দিচ্ছেন না।

## কখন ব্যবহার করবেন

| Traffic-এর ধরন | Algorithm | কারণ |
| ------------- | --------- | ------ |
| Public API, client-রা বৈধভাবেই burst করে | Token bucket | Burst চলে, গড় ঠিক থাকে |
| Request-এর খরচ একেকটার একেক রকম | Endpoint-প্রতি খরচসহ token bucket | একটি knob-এই দুটি সামলানো যায় |
| স্থির traffic, সহজ নির্ভুলতা চান | Sliding window counter | O(1), আর সীমানায় spike নেই |
| Downstream-এর cap কিছুতেই ছাড়ানো যাবে না | Leaky bucket | Reject না করে output মসৃণ করে |
| Internal service, অপব্যবহারের চিন্তা নেই | Fixed window | কাজ করে এমন সবচেয়ে সস্তা জিনিস |

## একাধিক Instance জুড়ে গণনা

একাধিক instance-এর জন্য একটিই shared counter লাগে, আর check-টা হতে হবে **atomic**। পড়া, refill আর লেখা এক ধাপে হতে হবে, নইলে একসঙ্গে আসা দুটি request দুজনেই শেষ token-টা দেখবে।

```typescript
// Redis Lua runs atomically: no other command interleaves.
const TOKEN_BUCKET = `
  local tokens_key = KEYS[1]
  local capacity     = tonumber(ARGV[1])
  local refill_rate  = tonumber(ARGV[2])   -- tokens per second
  local now          = tonumber(ARGV[3])   -- milliseconds
  local cost         = tonumber(ARGV[4])

  local state = redis.call('HMGET', tokens_key, 'tokens', 'ts')
  local tokens = tonumber(state[1]) or capacity
  local last   = tonumber(state[2]) or now

  local elapsed = math.max(0, now - last) / 1000
  tokens = math.min(capacity, tokens + elapsed * refill_rate)

  local allowed = 0
  if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
  end

  redis.call('HSET', tokens_key, 'tokens', tokens, 'ts', now)
  -- TTL = time to refill a full bucket, so idle keys expire themselves.
  redis.call('PEXPIRE', tokens_key, math.ceil(capacity / refill_rate * 1000))

  return { allowed, math.floor(tokens) }
`;
```

`redis.eval` দিয়ে call করুন: `keys`-এ bucket-এর key, আর `arguments`-এ capacity, refill-এর হার, বর্তমান সময় আর খরচ।
তারপর দুই element-এর উত্তরটা `[allowed, remaining]` হিসেবে পড়ুন।

**কেন Lua, কেন `INCR` আর `EXPIRE` নয়:** ওগুলো দুটি round trip। মাঝখানে process মারা গেলে এমন একটি key থাকে, যার TTL নেই, আর সেটা caller-কে চিরকাল আটকে রাখে। Lua পুরো সিদ্ধান্তটা একটি atomic operation বানায়।

> ⚠️ **এখন প্রতিটি request-এ একটি Redis round trip লাগে।** Traffic বেশি হলে একটি local pre-check যোগ করুন: প্রতিটি instance-এ ছোট একটি বরাদ্দ রাখুন, আর সেটা ফুরালে তবেই Redis-কে জিজ্ঞেস করুন। এতে latency-র বদলে কিছুটা নির্ভুলতা ছাড়েন। সাধারণত এটাই ঠিক সিদ্ধান্ত, কিন্তু মুখে স্পষ্ট বলুন। Redis বিনা খরচে আসে, এমন ভান করবেন না।

**বাস্তবে library ব্যবহার করুন।** `rate-limit-redis`-সহ `express-rate-limit` production-এ ভালোভাবে পরীক্ষিত।
একত্রিত `RateLimit` header-এর জন্য `standardHeaders: "draft-8"` দিন, পুরনো
`X-RateLimit-*` header-গুলো বাদ দিন, `ipv6Subnet: 56` দিন যাতে একজন client মানে একটি key হয়, 2^72টি নয়, আর
নিজের `keyGenerator` দিন।

## কীসের ওপর Key করবেন

Limit ঠিক ততটাই ভালো, যতটা ভালো তার পেছনের পরিচয়।

হাতে থাকা সবচেয়ে নির্দিষ্ট পরিচয়টা বেছে নিন: আগে API key বা client id, তারপর user id, তারপর IP।

| Key | শক্তি | দুর্বলতা |
| --- | -------- | -------- |
| **API key / client id** | নিখুঁত, billing tier-এর সঙ্গে বাঁধা | শুধু authenticated traffic-এর জন্য |
| **User id** | Network বদলালেও user-এর পিছু নেয় | আক্রমণকারী আরও account খুলতে পারে |
| **IP** | সবসময় পাওয়া যায় | NAT, অফিস আর mobile carrier-এ অনেকে ভাগ করে; IPv6-এ সহজেই বদলানো যায় |

**আপনার ভরসার কোনো proxy নতুন করে না লিখলে `X-Forwarded-For` client-এর নিয়ন্ত্রণে।** প্রথম value চোখ বুজে বিশ্বাস করলে যে কেউ প্রতিটি request-এ নতুন পরিচয় জাল করতে পারে। Express-এর `trust proxy`-কে ঠিক ততটি proxy-তে সেট করুন, যতগুলো আপনি আসলে চালান, কখনো তার বেশি নয়।

```typescript
app.set("trust proxy", 1); // exactly one trusted proxy in front of us
```

Limit স্তরে স্তরে সাজান। ন্যায্যতার জন্য user বা key-প্রতি limit, আর unauthenticated traffic-এর জন্য মোটা দাগের backstop হিসেবে IP-প্রতি limit। Load ঝেড়ে ফেলার জন্য একটি global ছাদ যোগ করুন, আর **login, password reset আর OTP-র জন্য আলাদা কড়া limit** রাখুন। নইলে সাধারণ limit-টাই credential stuffing-এর (বড় আকারে ফাঁস হওয়া password চেষ্টা করা) জন্য দিব্যি একটি budget হয়ে যায়।

## Response Header আর Failure

Client-কে ঠিক কী হয়েছে জানিয়ে দিন, যাতে client বারবার আঘাত না করে বুদ্ধি করে পিছিয়ে যেতে পারে।

```typescript
res.status(429).set({
  "Retry-After": "42",                       // seconds — the one every client understands
  "RateLimit-Policy": "100;w=60",            // 100 requests per 60s window
  "RateLimit": "limit=100, remaining=0, reset=42",
}).json({ title: "Too Many Requests", status: 429, detail: "Retry in 42 seconds." });
```

**সফল** response-এও header পাঠান। `remaining=3` দেখতে পেলে client নিজেই গতি কমায়। আর limit-এর কথা যদি জানা যায় শুধু `429` পেয়ে, তখন আর গতি কমানোর সুযোগ থাকে না। আর `429` রাখুন শুধু "আপনি বেশি পাঠিয়েছেন" বোঝাতে। `503` মানে service নিজেই বিপদে। দুটি গুলিয়ে ফেললে downstream-এর প্রতিটি retry policy ভুল পথে যায়।

**Redis-এ পৌঁছানো না গেলে fail open করুন, তবে জোরে জানিয়ে।** Error ধরুন, log করুন, `ratelimit.unavailable`-এর মতো
একটি counter বাড়ান, আর `next()` call করুন। আসল ঝুঁকি হলো চুপচাপ মরে থাকা limiter। আপনার দরকার alert, reject নয়।

সব reject করলে limiter-এর outage গোটা API-র outage হয়ে যায়। Fallback হিসেবে process-এর ভেতরে একটি সস্তা limiter রাখুন। তাহলে limit একেবারে উঠে না গিয়ে আনুমানিক limit-এ নেমে আসে।

## সাধারণ ভুল

❌ **কয়েকটি instance-এর পেছনে local `Map`-এ counter।** কার্যকর limit হয় configure করাটার N×।
✅ Counter shared রাখুন, আর এক round trip-এ atomic সিদ্ধান্ত নিন।

❌ **দুটি আলাদা call-এ `INCR`, তারপর `EXPIRE`।** মাঝখানে crash হলে TTL ছাড়া একটি key থেকে যায়, যা caller-কে চিরকাল আটকে রাখে।
✅ একটি Lua script, একটি atomic সিদ্ধান্ত।

❌ **`X-Forwarded-For`-এর প্রথম value পড়া।** যে কেউ প্রতিটি request-এ নতুন পরিচয় জাল করতে পারে।
✅ `trust proxy`-কে আসল hop-এর সংখ্যায় সেট করুন, আর পরিচয় থাকলে সেটার ওপর key করুন।

❌ **সব endpoint-এর জন্য একটিই limit।** Report export-এর জন্য বেশি উদার, dashboard-এর জন্য বেশি কড়া।
✅ খরচ অনুযায়ী token নিন, আর auth endpoint-কে তার নিজের কড়া limit দিন।

❌ **প্রথম দিন থেকেই নতুন limit বলবৎ করা।** আসল traffic যে কারও অনুমানের চেয়ে বেশি burst করে।
✅ এক সপ্তাহ monitor mode-এ চালান, আর কী কী block *হতো*, তা log করুন।

> ⚠️ **Rate limiting DDoS protection নয়।** Volumetric attack আপনার middleware চলার আগেই bandwidth ভরিয়ে দেয়। ওটা CDN আর WAF-এর (web application firewall) কাজ। দুটিকে গুলিয়ে ফেলা interview-এ খুব চেনা হোঁচট।

## 🔑 মূল শিক্ষা

- Public API-র জন্য default হলো token bucket, কারণ এটা সত্যিকারের burst সহ্য করে, আবার দীর্ঘ মেয়াদের গড়ও ধরে রাখে।
- Fixed window সীমানার দুই পাশ মিলিয়ে limit-এর 2× চলতে দেয়, আর ঠিক তখনই limit-টা সবচেয়ে বেশি দরকার ছিল।
- Distributed গণনা ঠিক থাকে শুধু তখন, যখন পড়া, refill আর লেখা atomic ভাবে হয়: একটি Lua script, দুটি command নয়।
- হাতে থাকা সবচেয়ে শক্ত পরিচয়ের ওপর key করুন, আর আপনার নিজের proxy নতুন করে না লিখলে `X-Forwarded-For`-কে অবিশ্বাস্য ধরুন।
- Alert দিয়ে fail open করুন। Limiter-এর outage যেন API-র outage না হয়ে যায়।

## Interview-এর প্রশ্ন

**Q: Fixed window-এ সমস্যা কী?**

সীমানার burst। একজন client 12:00:59-এ পুরো limit পাঠাতে পারেন, আবার 12:01:00-এ পুরো limit। ফলে মোটামুটি এক সেকেন্ডে উদ্দিষ্ট হারের 2× পেয়ে যান। Sliding window counter দুটি counter আর ওজন দেওয়া overlap দিয়ে এটা ঠিক করে। Memory থাকে O(1), সীমানায় spike থাকে না, আর window-এর ভেতরে traffic অসমান হলে ভুল হয় কয়েক শতাংশ।

**Q: অনেক server জুড়ে ঠিকভাবে কীভাবে গুনবেন?**

Redis-এ shared state, আর পুরো সিদ্ধান্তটা একটি Lua script-এ, যাতে পড়া-refill-লেখা atomic হয়। `INCR` আর `EXPIRE` আলাদা call হলে মাঝখানে process মারা গেলে TTL ছাড়া key থেকে যেতে পারে। Traffic বেশি হলে round trip কমাতে আমি instance-প্রতি একটি local বরাদ্দ যোগ করব, আর মেনে নেব যে এতে কয়েকটি বাড়তি request পার হয়ে যায়। প্রতিটি key-এর TTL রাখব bucket পুরো ভরতে যত সময় লাগে, তত। তাহলে অলস key নিজে থেকেই মুছে যায়।

**Q: কীসের ওপর key করবেন, আর IP কেন খারাপ পছন্দ?**

Caller authenticated হলে API key বা user id, IP শুধু fallback হিসেবে। NAT-এর পেছনের একটি অফিস একটিই address ভাগ করে, আর mobile carrier address বদলাতে থাকে। IPv6 client-এর address প্রায় অফুরন্ত, তাই একটি address নয়, একটি /56 subnet-এর ওপর key করুন। আর আপনার নিয়ন্ত্রণের কোনো proxy নতুন করে না লিখলে `X-Forwarded-For` জাল করা যায়, তাই `trust proxy`-কে আসল hop-এর সংখ্যায় সেট করতেই হবে।

**Q: কখন একটি endpoint-এ rate limit দেবেন না?**

এমন internal service-এ, যার caller-রা চেনা, আর failure মানে অপব্যবহার নয়, একটি paging alert। সেখানে limiter শুধু
একটি Redis round trip আর ব্যর্থ হওয়ার একটি নতুন পথ যোগ করে। Health check-এও নয়। ঠিক যে incident-এ limiter health
check-কে reject করত, তখনই সেটার উত্তর দেওয়া সবচেয়ে জরুরি।

## এরপর কী পড়বেন

- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — edge-এর সেই স্তর, যা সাধারণত মোটা দাগের limit-গুলো সামলায়
- [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql) — একটি request কেন কাজের এক একক নয়, আর complexity scoring কীভাবে তা ঠিক করে
