---
sourceHash: "1c58ba7303b6135732e68a5c0a41ed17f3d1624ccc31780c213b0040462d03fa"
title: "Route Handler ও BFF"
translatedAt: "2026-10-12T07:52:57.358Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Route Handler ও BFF {#ch-route-handlers-and-the-bff}

> একটি endpoint কোন caller-দের সেবা দেয় তা জানলে, আপনি এটাও জানবেন যে সেটা আদৌ আপনার Next.js app-এ থাকা উচিত কি না।

**এই অধ্যায়ে:** Route Handler কী · কখন action বেশি ভালো tool · backend-for-frontend pattern · Next.js 16-এ একটি `GET` cache করা · কোথায় Next.js আর আপনার backend থাকে না

## 💡 মূল ধারণা

Route Handler হলো `route.ts` নামের একটি file, যেটা HTTP method-এর নামে function export করে। এর ওপরে কোনো framework
layer নেই। Argument একটি `Request`, return value একটি `Response`, আর মাঝখানের সবকিছু আপনার।

আকর্ষণীয় প্রশ্নটা কখনোই এই নয় যে Next.js একটি API serve *করতে পারে* কি না। পারে। প্রশ্ন হলো **এই endpoint কে
call করে**। একটি Server Component সরাসরি আপনার database-এর সঙ্গে কথা বলতে পারে। আপনার নিজের form একটি Server
Action দিয়ে mutation করতে পারে। দুটিরই কোনো URL লাগে না। একটি endpoint তখনই তার জায়গা পায়, যখন caller এমন কিছু
যা আপনার নিয়ন্ত্রণে নেই: একটি webhook, একটি mobile app, একটি partner, অথবা অন্য কারও page-এর একটি `<script>`।

> ⚠️ **যা বদলাতে থাকে:** `GET` handler-এর caching দুবার বদলেছে। Next.js 14-এ এটা default-এ cache হতো, আর 15-এ
> default-এ cache হতো না। 16-এর Cache Components-এ একটি `GET` prerender হয়, যদি না সেটা runtime data ছোঁয়। আর একটি
> helper-এর ওপর `use cache` `dynamic = 'force-static'`-এর জায়গা নেয়। স্থায়ী নীতি: caching opt-in, আর cache করা
> প্রতিটি জিনিসের এমন একটি key দরকার, যেটা আপনি invalidate করতে পারেন।

## কীভাবে কাজ করে

### File-টি

```typescript
// app/api/invoices/[id]/route.ts
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params; // params is a promise from Next.js 15
  const invoice = await getInvoice(id); // the data access layer, with its own auth check
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}
```

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` আর `OPTIONS` support করা হয়, প্রতিটির জন্য একটি export। Handler একটি
Server Component-এর মতো একই environment-এ চলে, তাই `cookies()`, `headers()` আর Node API সবই কাজ করে। কিন্তু এখানে
কোনো React DOM নেই, তাই এখানে কিছুই render হয় না।

**একটি `route.ts` আর একটি `page.tsx` একই segment শেয়ার করতে পারে না।** দুটিই একই URL দাবি করে, তাই Next.js জোড়াটিকে
বাতিল করে। Endpoint-গুলো তাদের নিজস্ব একটি path-এর নিচে রাখুন।

### একটি `GET` cache করা

Directive-টি export করা handler-এর ওপর বসানো যায় না, তাই cache করা কাজটি একটি helper-এ সরে যায়:

```typescript
// app/api/rates/route.ts
import { cacheLife, cacheTag } from "next/cache";

export async function GET(): Promise<Response> {
  return Response.json(await getRates());
}

async function getRates(): Promise<Rate[]> {
  "use cache";
  cacheTag("rates");
  cacheLife("hours");
  return db.rate.findMany();
}
```

Tag-টি এটাকে maintain করা সহজ করে। যে action একটি rate বদলায়, সেটা `revalidateTag("rates")` call করে। আর তাতেই
endpoint invalidate হয়, কাউকে URL মনে রাখতে হয় না। খুঁটিনাটি আছে
[Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)-এ।

### Handler, action, নাকি কোনোটাই না

| Caller হলো…                              | ব্যবহার করুন               | কারণ                                         |
| --------------------------------------- | ------------------------ | ------------------------------------------- |
| Page render করা একটি Server Component    | কিছুই না — সরাসরি query    | নিজের কাছে একটি round trip দিয়ে কিছুই পাওয়া যায় না |
| আপনার নিজের UI-এর একটি form বা button      | একটি Server Action         | Progressive enhancement, নাম দেওয়ার মতো কোনো endpoint নেই |
| একটি third-party webhook                 | একটি Route Handler         | তারা একটি URL-এ request পাঠায়, form নয়         |
| একটি mobile app বা partner integration    | একটি Route Handler         | একটি স্থির contract, versioned আর documented  |
| Update-এর জন্য poll করা একটি client component | একটি Route Handler         | এর একটি URL আর একটি cache header লাগে          |
| একটি cron বা scheduled job                | একটি Route Handler         | বাইরে থেকে আসা একটি request-এ trigger হয়        |

Candidate-রা প্রথম row-টিই ভুল করেন। একটি Server Component-এর ভেতরে `fetch('/api/invoices')` আপনার নিজের network
stack দিয়ে আপনার নিজের server-এ একটি call পাঠায়। আর সেটা এমন একটি query চালায়, যেটা component নিজেই চালাতে পারত।

### Backend-for-frontend আসলে কী

একটি BFF হলো **একটি** client-এর জন্য গড়া API, যার মালিক সেই client বানানো team। এটা একটি user interface আর তার
পেছনের service-গুলোর মাঝখানে বসে। চারটি কাজ করে এটা নিজের জায়গা পাকা করে:

| কাজ                  | উদাহরণ                                                          |
| -------------------- | ---------------------------------------------------------------- |
| Aggregation          | Mobile link-এ ছয়টি service call-এর বদলে একটি dashboard call       |
| Credential লুকানো    | Upstream API key server-এ থাকে, bundle-এ কখনো যায় না               |
| Response গড়ে দেওয়া   | Screen যে বারোটি field render করে সেগুলো return করুন, নব্বইটি নয়     |
| Protocol অনুবাদ      | Upstream-এ gRPC বা SOAP, browser-এ JSON                           |

Next.js ভালো BFF হয়। যে code response গড়ে আর যে code সেটা render করে, দুটি একই repository-তে থাকে, একসঙ্গে review
হয়, একসঙ্গে deploy হয়। Screen-এর আরেকটি field দরকার হলে একটি pull request দুই প্রান্তই বদলায়।

### আর কোথায় এটা থামে

একই coupling-টিই এর দাম। একটি BFF frontend-এর বিষয়, frontend-এর schedule-এ release হয়। যে কাজ এই ছাঁচে মেলে না,
তাকে এর ভেতরে ঠেলে দেওয়া উচিত নয়।

| Signal                                          | এর মানে                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| এখন তিনটি client endpoint-টি ব্যবহার করে          | এটা একটি product API, BFF নয় — এটাকে নিজস্ব service দিন    |
| কাজ request-এর চেয়ে বেশি টেকে — job, retry, queue  | Serverless request handler ভুল runtime                    |
| দীর্ঘস্থায়ী connection: socket, subscription       | Request/response platform-এ bill আর timeout দুটিই খারাপ    |
| ভারী CPU, বা নিজস্ব scaling-ওয়ালা একটি database   | এটা আপনার page rendering থেকে আলাদাভাবে scale হওয়া উচিত   |
| বাইরের consumer-দের versioning আর একটি SLA দরকার  | সেটা একটি contract, আর contract-এর একজন owner দরকার         |

> ⚠️ আপনি যে endpoint-ই যোগ করুন, সেটা একটি public URL। আপনার component-এর পাশে থাকা এটাকে রক্ষা করে না। Body
> validate করুন, আপনার page-গুলো যে data access layer ব্যবহার করে সেখানেই session check করুন, আর unauthenticated
> যেকোনো কিছুতে rate limit বসান।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | বেছে নিন                                       |
| ------------------------------------------------ | -------------------------------------------- |
| Stripe বা GitHub আপনাকে একটি event post করে         | Route Handler, signature যাচাই করে             |
| আপনার নিজের form একটি mutation submit করে          | Server Action                                 |
| একটি React Native app-এর একই data দরকার           | Versioned path-সহ Route Handler               |
| একটি progress bar-এর জন্য server-sent event        | একটি stream return করা Route Handler           |
| চার মিনিট লাগা একটি রাতের report                    | App-এর বাইরে একটি worker বা queue              |
| একটি page-এর জন্য তিনটি internal service একত্র করা   | Server Component, বা client-এর দরকার হলে একটি Route Handler |

## সাধারণ ভুল

**❌ একটি Server Component থেকে নিজের Route Handler call করা।** তার বদলে function-টি import করুন। HTTP hop latency
বাড়ায়, type safety হারায়, আর framework-এর caching থেকে query-টি লুকিয়ে ফেলে।

**❌ প্রতিটি form-এর জন্য একটি Route Handler লেখা।** UI থেকে trigger হওয়া mutation-এর জন্যই Server Action আছে, আর
সেটা JavaScript ছাড়াও কাজ করে। Caller বাইরের হলে তবেই endpoint-এর দিকে যান।

**❌ ধরে নেওয়া যে পাশাপাশি থাকা মানেই সুরক্ষা।** Endpoint-টি অন্য যেকোনো URL-এর মতোই public। একই session check, একই
validation, একই rate limit।

**❌ `page.tsx`-এর পাশে `route.ts` রাখা।** দুটি একই path-এ সংঘর্ষ করে। Endpoint-গুলোকে `/api` বা নিজস্ব একটি
segment-এর নিচে রাখুন।

**❌ BFF-কে product API হয়ে যেতে দেওয়া।** অন্য team-রা এর ওপর নির্ভর করতে শুরু করলে, আপনার frontend release তাদের
outage-এর ঝুঁকি হয়ে দাঁড়ায়। দ্বিতীয় consumer-এর সময়ই এটাকে আলাদা করুন, পঞ্চমটির সময় নয়।

**❌ Handler-এ দীর্ঘ job চালানো।** Serverless platform একটি timeout চাপিয়ে দেয় আর wall-clock time ধরে bill করে। কাজটি
enqueue করুন আর একটি id return করুন।

## 🔑 মূল শিক্ষা

- একটি Route Handler হলো সাধারণ `Request` ঢোকে, `Response` বেরোয় — framework শুধু routing যোগ করে, আর কিছু নয়।
- Caller আপনার application-এর বাইরে হলে endpoint যোগ করুন। নইলে সরাসরি query করুন বা একটি Server Action ব্যবহার করুন।
- একটি BFF ঠিক একটি client-এর জন্য aggregate করে, credential লুকায়, response গড়ে দেয় আর protocol অনুবাদ করে।
- দ্বিতীয় স্বাধীন consumer-ই signal যে endpoint-টিকে তার নিজস্ব service-এ সরিয়ে নিতে হবে।
- `GET` caching একটি `use cache` helper দিয়ে opt-in, আর tag দিলে একটি mutation নাম ধরে সেটা invalidate করতে পারে।

## Interview-এর প্রশ্ন

**Q: একটি Next.js application আদৌ কখন একটি Route Handler expose করবে?**

যখন caller এমন কিছু, যেটা আপনি render করেন না। Webhook, mobile client, partner integration, cron trigger আর polling
client — সবার একটি URL দরকার। আপনার নিজের page-গুলোর দরকার নেই। একটি Server Component সরাসরি database query করতে
পারে, আর একটি Server Action আপনার নিজের UI থেকে আসা mutation কোনো endpoint ছাড়াই সামলায়।

**Q: Backend-for-frontend কী, আর এর দাম কী?**

একটি client-এর জন্য গড়া একটি API, যার মালিক সেই client-এর team। এটা কয়েকটি upstream call-কে একটিতে মেলায়,
credential server-এ রাখে, আর screen যে field-গুলো ব্যবহার করে শুধু সেগুলোই return করে। দাম হলো coupling। এটা
frontend-এর release schedule-এ ship হয় আর frontend-এর traffic-এর সঙ্গে scale হয়। তাই দ্বিতীয় কোনো স্বাধীন consumer
এলেই এটা আসলে ভুল পোশাক পরা একটি product API।

**Q: Form submission-এর জন্য Route Handler নাকি Server Action?**

Server Action। এটা server-এ চলে, এমন কোনো public URL ছাড়া যার নাম আপনাকে দিতে হয়। JavaScript load হওয়ার আগেও এটা
কাজ করে, কারণ এটা একটি আসল form submission। Router-এর revalidation-এর সঙ্গেও এটা কাজ করে। একই কাজের জন্য Route
Handler মানে fetch, serialisation আর error handling হাতে লেখা। তার ওপর secure করার জন্য একটি endpoint-ও থেকে যায়।

**Q: Backend-এর কাজের জন্য Next.js কখন ভুল জায়গা?**

যখন কাজটি একটি request-এর মধ্যে আঁটে না। Background job, queue, retry, দীর্ঘস্থায়ী socket আর ভারী CPU — সবই একটি
serverless request handler-এ বেমানান, যেখানে wall-clock time ধরে timeout আর bill হয়। অন্য signal-টি সাংগঠনিক। কয়েকটি
team endpoint-টি ব্যবহার করতে শুরু করলে এর versioning, একটি SLA আর একজন owner দরকার। Marketing site-এর সঙ্গে deploy
হলে এগুলোর কোনোটাই টেকে না।

## এরপর কী পড়বেন

- [Chapter ?? — Server Action](#ch-server-actions) — যে mutation path-এ কোনো endpoint লাগে না
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — public হওয়ার পর contract design করা
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — অন্য edge-গুলোর মধ্যে একটি BFF কোথায় বসে
