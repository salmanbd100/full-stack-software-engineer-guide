---
sourceHash: "56070c101ace28d3ec881af5ee7a4cc50b1af84fc341e8c7c01b49e0a5aceafa"
title: "Rate Limiting"
translatedAt: "2026-10-12T12:21:58.050Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Rate Limiting {#ch-rate-limiting}

> আপনার traffic-এর ধরনের সাথে মেলে এমন একটি algorithm implement করুন, আর counter-কে প্রতিটি instance জুড়ে সঠিক রাখুন।

**এই অধ্যায়ে:** fixed window আর তার সীমানার burst · sliding window counter · token bucket · Redis-এ atomic গণনা · কীসের ওপর key করবেন · header আর failure mode

## 💡 মূল ধারণা

Rate limiting একটি নির্দিষ্ট সময়ের window-এ একজন caller আপনার কাছে কতটা কাজ চাইতে পারে, তার সীমা বাঁধে। এটা capacity রক্ষা করে, অপব্যবহার আটকায়, third-party-র bill অনুমানযোগ্য রাখে আর pricing tier বলবৎ করে।

Interview-এ যে framing নম্বর পায়: rate limiting খারাপ লোকদের আটকানোর ব্যাপার নয়। এটা হলো **প্রতিযোগিতার মধ্যে ন্যায্যতা**, যখন অনেক caller একই capacity-র জন্য লড়ে। যে limit একটি buggy client-কে বাকি সবাইকে না খাইয়ে রাখা থেকে আটকায়, কেউ আক্রমণ না করলেও সেটা তার কাজ করছে।

এই অধ্যায় limiter-টি বানায়। দুটো প্রশ্ন অন্য অধ্যায়ের: stack-এর কোথায় enforcement বসে (CDN, gateway, তারপর service), আর সেকেন্ডে দশ লাখ request-এ এর খরচ কত। দেখুন [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries)।

## কীভাবে কাজ করে

প্রতিটি algorithm একই প্রশ্নের উত্তর দেয়: এই caller কি বেশি নিয়ে ফেলেছে? তাদের পার্থক্য হলো, তারা কী মনে রাখে।

| Algorithm | Memory | নির্ভুলতা | Burst | কখন ব্যবহার করবেন |
| --------- | ------ | -------- | ------ | -------- |
| **Fixed window** | প্রতি key-তে O(1) | দুর্বল | সীমানায় 2× | সহজ internal API |
| **Sliding window log** | O(requests) | নিখুঁত | নেই | কম volume, কড়া ন্যায্যতা |
| **Sliding window counter** | O(1) | ভালো | সামান্য | স্থির traffic, সীমানায় spike নেই |
| **Token bucket** | O(1) | ভালো | নিয়ন্ত্রিত | ✅ Production-এর default: public API, পরিবর্তনশীল খরচ |
| **Leaky bucket (queue)** | O(queue) | নিখুঁত | নেই — output মসৃণ করে | একটি দুর্বল downstream-কে রক্ষা করা |

**বেশিরভাগ API-র জন্য সংক্ষিপ্ত উত্তর: token bucket।** এটা একটি সত্যিকারের burst অনুমতি দেয়, আর আসল client-রা burst করেই: একটি page load একসাথে আটটি request পাঠায়। তবু এটা দীর্ঘমেয়াদি গড় ধরে রাখে। আর এটা স্বাভাবিকভাবেই "এই endpoint-এর খরচ 10, ওটার 1" পর্যন্ত বাড়ানো যায়।

### Fixed Window আর তার সীমানার সমস্যা

প্রতিটি calendar window-এ request গুনুন, আর সীমানায় reset করুন।

ত্রুটিটা এই, আর এটা আপনার এঁকে দেখাতে পারা উচিত:

```text
limit = 100 per minute

12:00:59  ████████████████ 100 requests   ← fills window 1
12:01:00  ████████████████ 100 requests   ← window resets, fills window 2
          200 requests in ~1 second
```

**যেকোনো সীমানা জুড়ে একজন client limit-এর 2× পায়।** যে limit capacity রক্ষা করার জন্য আছে, তার জন্য ঠিক এই মুহূর্তেই সেটা fail করে।

> ⚠️ **In-memory version-টি একাধিক instance-এও ভুল।** একটি local `Map`-সহ চারটি pod মানে কার্যকর limit আপনার configure করা limit-এর 4×। আর pod scale হলে এটা সরে যেতে থাকে।

### Sliding Window Counter

**Sliding window log** প্রতিটি request-এর একটি timestamp রাখে, আর পেছনের window-এর ভেতরে যা পড়ে তা গোনে। এটা নিখুঁত, কিন্তু traffic-এর সাথে memory বাড়ে। মিনিটে 10k request করা একজন client-এর খরচ 10k timestamp।

**Sliding window counter** বাস্তবসম্মত আপস: বর্তমান window-এর গণনা আর আগের window-এর গণনা রাখুন, আর আগেরটির কতটা এখনো overlap করছে, সেই অনুপাতে তাকে weight দিন।

প্রতি key-তে দুটো counter, O(1), আর সীমানায় 2× burst নেই। একটি window-এর ভেতরে traffic অসমান হলে এটা কয়েক শতাংশ ভুল হতে পারে। Cloudflare একই কারণে এই বিনিময় মেনে নিয়েছে।

### Token Bucket

একটি bucket সর্বোচ্চ `capacity`-টি token ধরে, আর `refillPerSec` হারে ভরে ওঠে। প্রতিটি request তার খরচের সমান token খরচ করে। খালি bucket মানে reject।

**দুটো dial, দুটো অর্থ** — interviewer-রা এই অংশটাই খোঁচান:

| Dial | নিয়ন্ত্রণ করে | উদাহরণ |
| ---- | -------- | ------- |
| `capacity` | কত বড় burst আপনি সহ্য করবেন | 100 → 100টি call পাঠানো একটি page সফল হয় |
| `refillPerSec` | টানা হার | 10/s → দীর্ঘমেয়াদে মিনিটে 600 |

**খরচ-ভিত্তিক limiting হলো senior চাল।** `GET /users/me` আর `POST /reports/export` একই request নয়। আসল খরচ অনুযায়ী token নিন (GraphQL-এর ক্ষেত্রে query complexity অনুযায়ী)। তাহলে কোনো caller একটি endpoint দিয়ে আরেকটির জন্য ঠিক করা limit এড়াতে পারে না। Complexity কীভাবে হিসাব করা হয়, তার জন্য দেখুন [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)।

**Leaky bucket** হলো queue-আকৃতির ভাইবোন: request reject না হয়ে অপেক্ষা করে, আর একটি স্থির হারে বেরিয়ে যায়। যখন একটি downstream system-এর এমন কড়া rate সীমা আছে যা ছাড়ানো চলবে না, তখন এটা ব্যবহার করুন। সেখানে আপনি নিজের output মসৃণ করছেন; কোনো caller-কে পাহারা দিচ্ছেন না।

## কখন ব্যবহার করবেন

| Traffic-এর ধরন | Algorithm | কারণ |
| ------------- | --------- | ------ |
| Public API, client-রা বৈধভাবে burst করে | Token bucket | Burst চলে, গড় ধরে রাখা হয় |
| Request-এর খরচ ভীষণ আলাদা | প্রতি-endpoint খরচসহ token bucket | একটি dial-ই দুটো সামলায় |
| স্থির traffic, সহজ সঠিকতা চান | Sliding window counter | O(1), আর সীমানায় spike নেই |
| একটি downstream সীমা ছাড়ানো চলবে না | Leaky bucket | Reject না করে output মসৃণ করে |
| Internal service, অপব্যবহার নিয়ে চিন্তা নেই | Fixed window | কাজ করে এমন সবচেয়ে সস্তা জিনিস |

## Instance জুড়ে গণনা

একাধিক instance-এর একটি shared counter দরকার, আর check-টি হতে হবে **atomic**। Read, refill আর write একটি ধাপে হতে হবে, নইলে একসাথে আসা দুটো request দুটোই শেষ token-টি দেখে।

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

এটা `redis.eval` দিয়ে call করুন: bucket key `keys`-এ, আর capacity, refill rate, বর্তমান সময় আর খরচ
`arguments`-এ। তারপর দুই element-এর reply-টি `[allowed, remaining]` হিসেবে পড়ুন।

**কেন Lua, `INCR` আর `EXPIRE` নয়:** ওগুলো দুটো round trip। দুটোর মাঝে process মারা গেলে আপনি পান TTL ছাড়া একটি key, যেটা caller-কে চিরকাল আটকে রাখে। Lua পুরো সিদ্ধান্তটাকে একটি atomic operation বানায়।

> ⚠️ **এখন প্রতিটি request-এর খরচ একটি Redis round trip।** বেশি volume-এ একটি local pre-check যোগ করুন: প্রতি instance-এ একটি ছোট বরাদ্দ রাখুন, আর সেটা ফুরোলে তবেই Redis-কে জিজ্ঞেস করুন। আপনি latency-র বদলে নির্ভুলতা ছাড়ছেন। সাধারণত সেটাই সঠিক সিদ্ধান্ত, কিন্তু মুখে বলুন। Redis বিনামূল্যে, এমন ভান করবেন না।

**বাস্তবে library ব্যবহার করুন।** `rate-limit-redis`-সহ `express-rate-limit` production-এ ভালোভাবে পরীক্ষিত।
মিলিত `RateLimit` header-এর জন্য `standardHeaders: "draft-8"` set করুন, পুরনো
`X-RateLimit-*` header-গুলো বাদ দিন, `ipv6Subnet: 56` set করুন যাতে একজন client 2^72-টি নয়, একটিই key হয়, আর
নিজের `keyGenerator` দিন।

## কীসের ওপর key করবেন

Limit ততটাই ভালো, যতটা ভালো তার পেছনের পরিচয়।

আপনার কাছে থাকা সবচেয়ে নির্দিষ্ট পরিচয়টা বেছে নিন: API key বা client id, তারপর user id, তারপর IP।

| Key | শক্তি | দুর্বলতা |
| --- | -------- | -------- |
| **API key / client id** | নিখুঁত, একটি billing tier-এর সাথে বাঁধা | শুধু authenticated traffic-এর জন্য |
| **User id** | বিভিন্ন network জুড়ে user-কে অনুসরণ করে | Attacker আরও account খুলতে পারে |
| **IP** | সবসময় পাওয়া যায় | NAT, অফিস আর mobile carrier-রা ভাগ করে; IPv6-এ সহজেই বদলানো যায় |

**`X-Forwarded-For` client-এর নিয়ন্ত্রণে, যদি না আপনার বিশ্বস্ত একটি proxy সেটা আবার লিখে থাকে।** প্রথম value-টি অন্ধভাবে বিশ্বাস করলে যে কেউ প্রতি request-এ একটি নতুন পরিচয় জাল করতে পারে। Express-এর `trust proxy` set করুন ঠিক যতগুলো proxy আপনি আসলে চালান, তত — কখনো বেশি নয়।

```typescript
app.set("trust proxy", 1); // exactly one trusted proxy in front of us
```

Limit-গুলো স্তরে স্তরে সাজান। ন্যায্যতার জন্য প্রতি user বা key, আর unauthenticated traffic-এর মোটা দাগের ব্যাকআপ হিসেবে প্রতি IP। Load ছাঁটার জন্য একটি global সীমা যোগ করুন, আর **login, password reset আর OTP-তে আলাদা কড়া limit** দিন। নইলে সাধারণ limit-টি credential stuffing-এর (ফাঁস হওয়া password বড় পরিসরে চেষ্টা করা) জন্য একদম ভালো একটি budget।

## Response Header আর Failure

Client-কে ঠিক কী হয়েছে বলুন, যাতে সে আপনাকে পিটিয়ে না গিয়ে বুদ্ধি করে পিছিয়ে যেতে পারে।

```typescript
res.status(429).set({
  "Retry-After": "42",                       // seconds — the one every client understands
  "RateLimit-Policy": "100;w=60",            // 100 requests per 60s window
  "RateLimit": "limit=100, remaining=0, reset=42",
}).json({ title: "Too Many Requests", status: 429, detail: "Retry in 42 seconds." });
```

Header-গুলো **সফল** response-এও পাঠান। যে client `remaining=3` দেখতে পায়, সে নিজেই গতি কমায়। যে client limit-এর কথা জানে শুধু `429`-এ, সে পারে না। আর `429` রাখুন "আপনি বেশি পাঠিয়েছেন"-এর জন্য। `503` মানে service নিজেই বিপদে, আর দুটো গুলিয়ে ফেললে downstream-এর প্রতিটি retry policy ভুল পথে যায়।

**Redis-এ পৌঁছানো না গেলে, জোরে জানিয়ে fail open করুন।** Error ধরুন, log করুন, একটি counter বাড়ান, যেমন
`ratelimit.unavailable`, আর `next()` call করুন। নিঃশব্দে মরে থাকা একটি limiter-ই আসল ঝুঁকি। আপনি চান একটি
alert, reject নয়।

সবকিছু reject করলে একটি limiter outage একটি API outage হয়ে যায়। Fallback হিসেবে একটি সস্তা in-process limiter রাখুন। তাহলে আপনি কোনো limiting ছাড়া নয়, আনুমানিক limiting-এ ফিরে যান।

## সাধারণ ভুল

❌ **কয়েকটি instance-এর পেছনে একটি local `Map`-এ counter।** কার্যকর limit configure করা limit-এর N×।
✅ Counter shared করুন, আর সিদ্ধান্তটা একটি round trip-এ atomic করুন।

❌ **দুটো call হিসেবে `INCR` তারপর `EXPIRE`।** দুটোর মাঝে crash হলে থেকে যায় TTL ছাড়া একটি key, যেটা caller-কে চিরকাল আটকে রাখে।
✅ একটি Lua script, একটি atomic সিদ্ধান্ত।

❌ **প্রথম `X-Forwarded-For` value পড়া।** যে কেউ প্রতি request-এ একটি নতুন পরিচয় জাল করতে পারে।
✅ `trust proxy`-কে আসল hop সংখ্যায় set করুন, আর যেখানে পরিচয় আছে, সেটার ওপর key করুন।

❌ **প্রতিটি endpoint-এর জন্য একটি limit।** একটি report export-এর জন্য খুব উদার, একটি dashboard-এর জন্য খুব কড়া।
✅ খরচ অনুযায়ী token নিন, আর auth endpoint-গুলোকে তাদের নিজস্ব কড়া limit দিন।

❌ **প্রথম দিন থেকেই নতুন limit বলবৎ করা।** আসল traffic যে কারও অনুমানের চেয়ে বেশি burst করে।
✅ এক সপ্তাহ monitor mode-এ চালান, আর কী block *হতো* তা log করুন।

> ⚠️ **Rate limiting DDoS সুরক্ষা নয়।** একটি volumetric attack আপনার middleware চলার আগেই bandwidth ভরে দেয়। এটা CDN আর WAF-এর (web application firewall) কাজ। দুটো গুলিয়ে ফেলা interview-এ একটি সাধারণ হোঁচট।

## 🔑 মূল শিক্ষা

- Public API-র default token bucket, কারণ এটা দীর্ঘমেয়াদি গড় ধরে রেখেও একটি সত্যিকারের burst সহ্য করে।
- Fixed window একটি সীমানা জুড়ে limit-এর 2× অনুমতি দেয়, আর ঠিক তখনই limit-টা দরকার ছিল।
- Distributed গণনা তখনই সঠিক, যখন read, refill আর write atomic-ভাবে হয়: একটি Lua script, দুটো command নয়।
- পাওয়া যায় এমন সবচেয়ে শক্ত পরিচয়ের ওপর key করুন, আর `X-Forwarded-For`-কে অবিশ্বস্ত ধরুন, যদি না আপনার নিজের একটি proxy সেটা আবার লিখে থাকে।
- একটি alert-সহ fail open করুন। একটি limiter outage যেন API outage না হয়ে যায়।

## Interview-এর প্রশ্ন

**Q: Fixed window-এ সমস্যা কী?**

সীমানার burst। একজন client 12:00:59-এ পুরো limit পাঠাতে পারে, আর 12:01:00-এ আবার পুরো limit। তাই প্রায় এক সেকেন্ডে সে উদ্দিষ্ট হারের 2× পায়। Sliding window counter দুটো counter আর একটি weighted overlap দিয়ে এটা ঠিক করে। এটা O(1) memory রাখে আর সীমানায় কোনো spike নেই, বিনিময়ে window-এর ভেতরে traffic অসমান হলে কয়েক শতাংশ ভুল।

**Q: অনেক server জুড়ে সঠিকভাবে কীভাবে গুনবেন?**

Redis-এ shared state, আর পুরো সিদ্ধান্ত একটি Lua script-এ, যাতে read-refill-write atomic হয়। আলাদা call হিসেবে `INCR` আর `EXPIRE` মাঝখানে process মারা গেলে TTL ছাড়া একটি key রেখে যেতে পারে। বেশি volume-এ আমি round trip কমাতে প্রতি instance-এ একটি local বরাদ্দ যোগ করব, আর মেনে নেব যে এতে কয়েকটি বাড়তি request ঢুকে যায়। প্রতিটি key-র TTL আমি bucket পুরো ভরে ওঠার সময়ের সমান রাখব, যাতে অলস key-গুলো নিজেরাই পরিষ্কার হয়ে যায়।

**Q: কীসের ওপর key করেন, আর IP কেন দুর্বল বাছাই?**

Caller authenticated হলে API key বা user id, IP শুধু fallback হিসেবে। NAT-এর পেছনের একটি অফিস একটি address ভাগ করে, আর mobile carrier-রা address বদলাতে থাকে। একটি IPv6 client-এর প্রায় অসীম address আছে, তাই একটি address নয়, একটি /56 subnet-এর ওপর key করুন। আর `X-Forwarded-For` জাল করা যায়, যদি না আপনার নিয়ন্ত্রণের একটি proxy সেটা আবার লিখে থাকে। তাই `trust proxy`-কে আসল hop সংখ্যায় set করতে হবে।

**Q: কখন একটি endpoint-এ rate limit করবেন না?**

একটি internal service-এ, যেখানে caller-রা পরিচিত, আর failure mode হলো একটি paging alert, অপব্যবহার
নয়। সেখানে limiter একটি Redis round trip আর fail করার একটি নতুন উপায় যোগ করে। আর একটি health check-এ,
যেটাকে ঠিক সেই incident-এর সময়ই উত্তর দিতে হবে, যখন একটি limiter তাকে reject করত।

## এরপর কী পড়বেন

- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — যে edge layer সাধারণত মোটা দাগের limit-গুলোর মালিক
- [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql) — কেন একটি request কাজের একটি একক নয়, আর complexity scoring কীভাবে তা ঠিক করে
