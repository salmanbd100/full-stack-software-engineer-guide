---
sourceHash: "1c58ba7303b6135732e68a5c0a41ed17f3d1624ccc31780c213b0040462d03fa"
title: "Route Handler ও BFF"
translatedAt: "2026-10-17T01:36:06.448Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Route Handler ও BFF {#ch-route-handlers-and-the-bff}

> কোনো endpoint কাদের জন্য, সেটা জানলেই বুঝবেন সেটা আদৌ আপনার Next.js app-এ থাকা উচিত কি না।

**এই অধ্যায়ে:** Route Handler কী · কখন action বেশি ভালো · backend-for-frontend pattern · Next.js 16-এ `GET` cache করা · কোথায় গিয়ে Next.js আর আপনার backend থাকে না

## 💡 মূল ধারণা

Route Handler হলো `route.ts` নামের একটি file, যা HTTP method-এর নামে function export করে। এর ওপরে কোনো framework
layer নেই। Argument একটি `Request`, return value একটি `Response`, আর মাঝখানে যা আছে সবই আপনার।

আসল প্রশ্ন কখনোই এটা নয় যে Next.js API serve *করতে পারে* কি না। পারে। প্রশ্ন হলো **এই endpoint কে call করে**।
Server Component সরাসরি আপনার database-এর সঙ্গে কথা বলতে পারে, আর আপনার নিজের form Server Action দিয়ে mutation
করতে পারে। কারও URL লাগে না। Endpoint-এর দরকার পড়ে তখনই, যখন caller এমন কিছু যা আপনার নিয়ন্ত্রণে নেই: webhook,
mobile app, partner, কিংবা অন্যের page-এ বসানো `<script>`।

> ⚠️ **যা বদলাতে থাকে:** `GET` handler-এর caching দুবার বদলেছে। Next.js 14-এ default ছিল cached, 15-এ default
> uncached। 16-এর Cache Components-এ `GET` prerender হয়, যদি না সেটা runtime data ছোঁয়। আর helper-এ `use cache`
> দিলে `dynamic = 'force-static'`-এর আর দরকার হয় না। টেকসই নীতি: caching নিজে থেকে চালু করতে হয়, আর cache করা
> প্রতিটি জিনিসের এমন key লাগে, যা invalidate করা যায়।

## কীভাবে কাজ করে

### File

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

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` আর `OPTIONS` support করে, প্রতিটির জন্য একটি export। Handler চলে
Server Component-এর মতো একই environment-এ, তাই `cookies()`, `headers()` আর Node API সবই চলে। তবে React DOM নেই,
তাই এখানে কিছুই render হয় না।

**একই segment-এ `route.ts` আর `page.tsx` থাকতে পারে না।** দুটিই একই URL দাবি করে, তাই Next.js জোড়াটা বাতিল করে
দেয়। Endpoint-গুলো রাখুন তাদের নিজস্ব path-এ।

### `GET` cache করা

Directive export করা handler-এর ওপর বসানো যায় না, তাই cache করা কাজটা চলে যায় একটি helper-এ:

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

Tag থাকায় এটা maintain করা সহজ। যে action rate বদলায়, সেটা `revalidateTag("rates")` call করে। তাতেই endpoint
invalidate হয়ে যায়, কাউকে URL মনে রাখতে হয় না। খুঁটিনাটি আছে
[Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)-এ।

### Handler, action, নাকি কোনোটাই না

| Caller যদি হয়…                           | ব্যবহার করুন                | কারণ                                          |
| --------------------------------------- | ------------------------ | -------------------------------------------- |
| Page render করা একটি Server Component    | কিছুই না — সরাসরি query    | নিজের কাছে round trip দিয়ে কোনো লাভ নেই        |
| আপনার নিজের UI-এর form বা button         | Server Action            | Progressive enhancement, endpoint-এর নাম দিতে হয় না |
| Third-party webhook                     | Route Handler            | তারা একটি URL-এ request পাঠায়, form নয়         |
| Mobile app বা partner integration       | Route Handler            | স্থির একটি contract, versioned আর documented   |
| Update-এর জন্য poll করা client component | Route Handler            | এর লাগে একটি URL আর একটি cache header           |
| Cron বা scheduled job                   | Route Handler            | বাইরে থেকে আসা request-এ চালু হয়               |

Candidate-রা ভুল করেন প্রথম row-টায়। Server Component-এর ভেতরে `fetch('/api/invoices')` call যায় আপনার নিজের
server-এই, আপনার নিজের network stack ঘুরে। আর চালায় এমন একটি query, যা component নিজেই চালাতে পারত।

### Backend-for-frontend আসলে কী

BFF হলো **একটিমাত্র** client-এর মাপে বানানো API, যার মালিক সেই client বানানো team। এটা বসে user interface আর তার
পেছনের service-গুলোর মাঝখানে। এর জায়গা পাকা হয় চারটি কাজ করে:

| কাজ                  | উদাহরণ                                                              |
| -------------------- | ---------------------------------------------------------------- |
| Aggregation          | Mobile link-এ ছয়টি service call-এর বদলে dashboard-এর একটি call       |
| Credential লুকানো    | Upstream API key থাকে server-এ, কখনো bundle-এ যায় না                |
| Response-এর আকার ঠিক করা | Screen যে বারোটি field দেখায় সেগুলোই ফেরত দিন, নব্বইটি নয়          |
| Protocol translation | Upstream-এ gRPC বা SOAP, browser-এ JSON                            |

Next.js ভালো BFF বানায়। Response-এর আকার ঠিক করার code আর render করার code থাকে একই repository-তে, review হয় একসঙ্গে,
deploy-ও হয় একসঙ্গে। Screen-এ নতুন একটি field লাগলে একটি pull request-এই দুই দিক বদলে যায়।

### আর কোথায় এটা থামে

এই একই coupling-ই এর দাম। BFF frontend-এর বিষয়, release হয় frontend-এর schedule-এ। যে কাজ এই ছাঁচে খাপ খায় না,
সেটা জোর করে এখানে ঢোকানো উচিত নয়।

| লক্ষণ                                             | এর মানে                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| এখন তিনটি client endpoint-টা ব্যবহার করে           | এটা product API, BFF নয় — এটাকে নিজস্ব service দিন          |
| কাজ request-এর পরেও চলে — job, retry, queue       | Serverless request handler এর জন্য ভুল runtime            |
| দীর্ঘস্থায়ী connection: socket, subscription       | Request/response platform-এ bill আর timeout দুটিই বাজে      |
| ভারী CPU, বা নিজস্ব scaling-ওয়ালা database         | এটা page rendering থেকে আলাদাভাবে scale হওয়া উচিত           |
| বাইরের consumer-দের versioning আর SLA লাগে         | সেটা একটি contract, আর contract-এর মালিক লাগে              |

> ⚠️ যে endpoint-ই যোগ করুন, সেটা একটি public URL। Component-এর পাশে থাকলেই সেটা সুরক্ষিত হয়ে যায় না। Body
> validate করুন, আপনার page-গুলো যে data access layer ব্যবহার করে সেখানেই session check করুন, আর authenticate না
> করা সবকিছুর rate limit দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                         | বেছে নিন                                      |
| ------------------------------------------------ | -------------------------------------------- |
| Stripe বা GitHub আপনাকে event পাঠায়               | Route Handler, signature verify করে           |
| আপনার নিজের form mutation submit করে              | Server Action                                 |
| React Native app-এর একই data লাগে                 | Versioned path-সহ Route Handler               |
| Progress bar-এর জন্য server-sent event            | Stream return করা Route Handler               |
| চার মিনিট লাগে এমন nightly report                  | App-এর বাইরে worker বা queue                  |
| এক page-এর জন্য তিনটি internal service জোড়া লাগানো | Server Component, আর client-এর লাগলে Route Handler |

## সাধারণ ভুল

**❌ Server Component থেকে নিজের Route Handler call করা।** তার বদলে function-টা import করুন। HTTP hop latency বাড়ায়,
type safety হারায়, আর framework-এর caching থেকে query-টা আড়ালে চলে যায়।

**❌ প্রতিটি form-এর জন্য Route Handler লেখা।** UI থেকে চালু হওয়া mutation-এর জন্যই Server Action আছে, আর সেটা
JavaScript ছাড়াও চলে। Endpoint-এর কাছে যান যখন caller বাইরের কেউ।

**❌ পাশাপাশি থাকা মানেই সুরক্ষা, এমন ধরে নেওয়া।** Endpoint অন্য যেকোনো URL-এর মতোই public। একই session check,
একই validation, একই rate limit লাগবে।

**❌ `page.tsx`-এর পাশে `route.ts` রাখা।** দুটি একই path-এ সংঘর্ষ করে। Endpoint-গুলো রাখুন `/api`-এর নিচে, বা
নিজস্ব কোনো segment-এ।

**❌ BFF-কে product API হয়ে যেতে দেওয়া।** অন্য team-গুলো এর ওপর নির্ভর করতে শুরু করলে আপনার প্রতিটি frontend
release তাদের outage-এর ঝুঁকি হয়ে দাঁড়ায়। দ্বিতীয় consumer আসতেই আলাদা করুন, পঞ্চমটা পর্যন্ত অপেক্ষা করবেন না।

**❌ Handler-এ দীর্ঘ job চালানো।** Serverless platform timeout বেঁধে দেয়, আর bill করে wall-clock time ধরে। কাজটা
queue-তে দিন, আর একটি id ফেরত দিন।

## 🔑 মূল শিক্ষা

- Route Handler মানে সাদামাটা `Request` ঢোকে, `Response` বের হয়। Framework শুধু routing যোগ করে, আর কিছু না।
- Caller আপনার application-এর বাইরের হলে endpoint যোগ করুন। নইলে সরাসরি query করুন বা Server Action ব্যবহার করুন।
- BFF ঠিক একটি client-এর জন্য aggregate করে, credential লুকায়, response-এর আকার ঠিক করে আর protocol translate করে।
- দ্বিতীয় স্বাধীন consumer আসা মানেই endpoint-টাকে আলাদা service-এ সরানোর সময়।
- `GET` caching চালু করতে হয় `use cache` helper দিয়ে, আর tag দিলে mutation নাম ধরে সেটা invalidate করতে পারে।

## Interview-এর প্রশ্ন

**Q: Next.js application-এর আদৌ কখন Route Handler expose করা উচিত?**

যখন caller এমন কিছু, যা আপনি render করেন না। Webhook, mobile client, partner integration, cron trigger আর poll
করা client, সবার একটি URL লাগে। আপনার নিজের page-এর লাগে না। Server Component সরাসরি database query করতে পারে,
আর আপনার নিজের UI-এর mutation Server Action সামলে নেয়, কোনো endpoint ছাড়াই।

**Q: Backend-for-frontend কী, আর এর দাম কী?**

একটিমাত্র client-এর মাপে বানানো API, যার মালিক সেই client-এর team। এটা কয়েকটি upstream call-কে একটিতে মেলায়,
credential server-এ রাখে, আর screen যে field-গুলো ব্যবহার করে শুধু সেগুলোই ফেরত দেয়। দাম হলো coupling। এটা ship
হয় frontend-এর release schedule-এ, scale হয় frontend-এর traffic-এর সঙ্গে। তাই দ্বিতীয় কোনো স্বাধীন consumer এলেই
বুঝবেন, এটা আসলে ভুল পোশাক পরা একটি product API।

**Q: Form submission-এর জন্য Route Handler নাকি Server Action?**

Server Action। এটা server-এ চলে, নাম দিতে হয় এমন কোনো public URL ছাড়াই। JavaScript load হওয়ার আগেও চলে, কারণ
এটা সত্যিকারের form submission। Router-এর revalidation-এর সঙ্গেও মিলে কাজ করে। একই কাজে Route Handler নিলে fetch,
serialisation আর error handling সব হাতে লিখতে হয়। তার ওপর secure করার মতো একটি endpoint-ও থেকে যায়।

**Q: Backend-এর কাজের জন্য Next.js কখন ভুল জায়গা?**

যখন কাজটা একটি request-এর ভেতরে আঁটে না। Background job, queue, retry, দীর্ঘস্থায়ী socket আর ভারী CPU, এগুলোর
কোনোটাই serverless request handler-এ ভালো বসে না, কারণ সেখানে সময় মাপা হয় আর bill হয় wall-clock time ধরে। অন্য
লক্ষণটা প্রতিষ্ঠানগত। কয়েকটি team endpoint ব্যবহার করতে শুরু করলে versioning, SLA আর একজন মালিক লাগে। Marketing
site-এর সঙ্গে deploy হলে এর কোনোটাই টেকে না।

## এরপর কী পড়বেন

- [Chapter ?? — Server Action](#ch-server-actions) — যে mutation path-এ কোনো endpoint লাগে না
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — public হওয়ার পর contract design করা
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — অন্য edge-গুলোর মাঝে BFF কোথায় বসে
