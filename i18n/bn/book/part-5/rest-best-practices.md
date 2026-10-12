---
sourceHash: "2eacdb092ad42e5cef2afe6753b9b5df11890fa074f088326de46bda05e7e407"
title: "REST Best Practice ও Versioning"
translatedAt: "2026-10-12T12:20:05.146Z"
model: "claude-opus-5-5 (Claude Code)"
---

# REST Best Practice ও Versioning {#ch-rest-best-practices}

> এমন একটি HTTP API design করুন, যেটা অন্য একজন engineer docs পড়ার আগেই ঠিকঠাক আন্দাজ করতে পারেন। তারপর তাঁদের না ভেঙে সেটা বদলান।

**এই অধ্যায়ে:** resource URL · method আর idempotency · status code আর একটিমাত্র error shape · scale-এ টিকে থাকা pagination · client না ভেঙে contract বদলানো

## 💡 মূল ধারণা

REST এমন কোনো specification নয়, যার compliance test-এ আপনি fail করতে পারেন। এটা HTTP-র ওপর গড়া কিছু convention।
লাভটা হলো predictability: convention মানা হলে একজন client documentation না খুলেই আন্দাজ করতে পারে একটি route কেমন
আচরণ করবে। Interviewer-রা REST design দিয়ে আরও বড় কিছু যাচাই করেন। আপনি কি একটি domain model করতে পারেন? আর
HTTP কি এতটা ভালো বোঝেন যে সেটা নতুন করে আবিষ্কার করা বন্ধ করবেন?

> URL একটি **জিনিসের** নাম দেয়। Method বলে আপনি **সেটার সাথে কী করছেন**। `POST /users/123/deactivate`
> একটি বিপদসংকেত। `{ "status": "inactive" }`-সহ `PATCH /users/123` একই কাজ, HTTP-র ভাষায় বলা।

অন্য team আপনার API call করতে শুরু করলেই এর shape একটি contract হয়ে যায়। প্রতিটি চালু version একটি code path,
যেটা আপনাকে maintain করতে হয়। তাই senior প্রশ্নটা "এটা কীভাবে version করব" নয়, বরং **"নতুন version ছাড়া এটা কীভাবে
ship করব"**।

## কীভাবে কাজ করে

### Resource-কেন্দ্রিক URL

| নিয়ম                        | ❌ খারাপ                           | ✅ ভালো                      |
| --------------------------- | -------------------------------- | ---------------------------- |
| বিশেষ্য, ক্রিয়া নয়            | `/getUsers`, `/createUser`       | `GET /users`, `POST /users`  |
| Collection বহুবচনে          | `/user/123`                      | `/users/123`                 |
| ছোট হাতের অক্ষর, hyphen দিয়ে      | `/orderItems`, `/order_items`    | `/order-items`               |
| শুধু মালিকানা দেখাতে nest করুন | `/users/1/orders/9/items/4/tax`  | `/order-items/4`             |

দুই স্তরে nesting থামান। এর চেয়ে গভীরে child-এর নিজস্ব পরিচয় থাকে। CRUD নয় এমন action-ও বেশিরভাগ সময় resource
হিসেবেই model করা যায়। Password reset একটি request (`POST /users/123/password-resets`), refund একটি record
(`POST /orders/9/refunds`), আর ধীর একটি export একটি job (`POST /reports`, যেটা `202` return করে)। তবে একটি RPC-ধাঁচের
route এড়াতে design বাঁকাবেন না। কেউ বোঝে না এমন একটি নকল resource-এর চেয়ে একটি `POST /cache:purge` ভালো।

### Method আর idempotency

| Method   | উদ্দেশ্য                        | Safe | Idempotent | Body |
| -------- | ------------------------------ | ---- | ---------- | ---- |
| `GET`    | পড়া                           | ✅   | ✅         | ❌   |
| `POST`   | তৈরি / non-idempotent action | ❌   | ❌         | ✅   |
| `PUT`    | পুরো resource বদলে দেওয়া         | ❌   | ✅         | ✅   |
| `PATCH`  | আংশিক update                 | ❌   | ❌ সাধারণত | ✅   |
| `DELETE` | মুছে ফেলা                         | ❌   | ✅         | ❌   |

**Safe** মানে কোনো state বদলায় না — একটি crawler এটা ইচ্ছেমতো call করতে পারে। **Idempotent** মানে পাঁচবার call
করলে state একবার call করার মতোই থাকে। এই গুণটাই একটি retry-কে নিরাপদ করে।

`PUT` বদলে দেয়: `{ "name": "Ada", "email": "ada@x.com" }`-সহ `PUT /users/123` `phone` মুছে দেয়।
`{ "name": "Ada" }`-সহ `PATCH /users/123` বাকি field-গুলোতে হাত দেয় না। `{ "views": "+1" }`-এর একটি patch প্রতিটি call-এ
আলাদা ফল দেয়। এজন্যই specification প্রতিশ্রুতি দিতে পারে না যে `PATCH` idempotent। একটি সাধারণ `$set` patch
বাস্তবে idempotent। দুটো কথাই বলুন।

### Status code

| Code            | কখন ব্যবহার করবেন                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| 200 · 201 · 204 | সফল — `201` একটি `Location` header যোগ করে, `204`-এর ফেরত দেওয়ার কিছু নেই        |
| 202             | Async কাজের জন্য queue-তে রাখা হয়েছে; এখনো কিছু তৈরি হয়নি                                    |
| 400 · 409       | Validation fail · duplicate, version না মেলা বা অবৈধ state পরিবর্তন      |
| 401 · 403       | Authenticated নয় · authenticated, কিন্তু অনুমতি নেই                           |
| 404             | এমন কোনো resource নেই — 403-এর ক্ষেত্রে অস্তিত্বও লুকায়                      |
| 429             | Rate limited — `Retry-After` যোগ করুন                                             |
| 500 · 503       | আপনার bug, কখনো stack trace-সহ নয় · একটি dependency down, বা আপনি load ছাঁটছেন   |

### কী একটি client ভাঙে

| পরিবর্তন                                  | Breaking?  | কেন                                                 |
| --------------------------------------- | ---------- | --------------------------------------------------- |
| একটি optional field বা নতুন endpoint যোগ করা | ❌ না      | যে client এটা উপেক্ষা করে, তার কিছু হয় না               |
| একটি field মুছে ফেলা, নাম বা type বদলানো        | ✅ হ্যাঁ     | একজন client আজ এটা পড়ে; `"5"` থেকে `5` হলে parser fail করে  |
| একটি optional request field-কে required করা | ✅ হ্যাঁ     | চালু caller-রা validation-এ আটকে যায়                    |
| একটি enum-এ নতুন value যোগ করা                  | ⚠️ সাধারণত | `default` ছাড়া একটি client `switch` কোনো case-এ ধরে না    |
| Validation কড়া করা, বা একটি default বদলানো | ✅ হ্যাঁ     | দুটোই bug fix-এর মতো দেখায়, আর চুপচাপ caller ভাঙে |

## কখন ব্যবহার করবেন

| পরিস্থিতি                                           | বাছাই           | কেন                                                              |
| -------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Public API, অনেক অজানা client                   | REST             | Default-ভাবেই cache করা যায়, আর প্রতিটি HTTP tool এটা আগে থেকেই বোঝে |
| একটি frontend, যার নানা রকম nested data দরকার        | GraphQL          | Client shape বেছে নেয়, তাই round trip কমে যায়              |
| ভেতরের service-থেকে-service call, দুই দিকেই typed | gRPC বা tRPC     | Type থেকে contract তৈরি হয়; HTTP semantics সামান্যই যোগ করে         |
| Server client-এ push করে                        | WebSocket বা SSE | না চাইলে কিছু পাঠানোর কোনো উপায় REST-এর নেই                      |

## Error Response

সব জায়গায় একটি machine-readable shape ব্যবহার করুন: [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)।

**একটিমাত্র error shape:**

```typescript
interface ProblemDetails {
  type: string;      // stable URI identifying the error class
  title: string;     // short human summary
  status: number;    // matches the HTTP status
  errors?: { field: string; code: string; message: string }[];
  traceId?: string;  // ties the response to your logs
}
```

এটা বানান **একটি** error handler-এ, যা আছে [Chapter ?? — Node.js Event Loop, Async ও Error](#ch-event-loop-async)-এ।
প্রতিটি route throw করে, কোনো route format করে না। **সব** validation error একবারে return করুন। যে form প্রতি round trip-এ
একটি করে ভুল field দেখায়, সেটা খারাপ API, খারাপ frontend নয়।

## Pagination

| কৌশল                               | কীভাবে কাজ করে                  | কখন ব্যবহার করবেন                                             |
| -------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| **Offset** `?page=3&limit=20`          | `OFFSET 40 LIMIT 20`          | ছোট dataset, page number লাগে এমন admin screen |
| **Cursor** `?cursor=<opaque>&limit=20` | `WHERE (createdAt, id) < (…)` | Feed, infinite scroll, বড় বা দ্রুত বদলানো data    |

Offset সবচেয়ে প্রচলিত বাছাই, আর scale-এ ভুল বাছাই। `OFFSET 1000000` এখনো database-কে দশ লাখ row হেঁটে পার হয়ে ফেলে
দিতে বাধ্য করে। আরও খারাপ, user page করার সময় একটি row insert হলে সবকিছু সরে যায় — সে item 20 দুবার দেখে আর item 21
কখনো দেখে না। Keyset pagination দুটোই ঠিক করে:

**একটি opaque cursor-সহ keyset pagination:**

```typescript
// Encode the full sort key, not just the id — ties must break deterministically.
const encode = (o: Order): string =>
  Buffer.from(`${o.createdAt.toISOString()}|${o.id}`).toString("base64url");

async function listOrders(cursor?: string, limit = 20): Promise<{ data: Order[]; nextCursor: string | null }> {
  const capped = Math.min(limit, 100); // ✅ always cap a client-supplied limit
  const [createdAt, id] = cursor ? Buffer.from(cursor, "base64url").toString().split("|") : [];
  const where = cursor ? { $or: [{ createdAt: { $lt: createdAt } }, { createdAt, id: { $lt: id } }] } : {};
  // Fetch one extra row to learn whether a next page exists — no COUNT(*) needed.
  const rows: Order[] = await db.orders.find(where).sort({ createdAt: -1, id: -1 }).limit(capped + 1).toArray();
  const data = rows.slice(0, capped);
  return { data, nextCursor: rows.length > capped ? encode(data[data.length - 1]) : null };
}
```

> ⚠️ Cursor opaque। Base64 হলো encoding, security নয় — এটা সংবেদনশীল কিছু প্রকাশ করলে sign করুন।

Cursor random access ছেড়ে দেয়: page 50-এ লাফ দেওয়া যায় না, আর মোট সংখ্যার জন্য আলাদা query লাগে। একটি feed-এর
জন্য এটা সঠিক বিনিময়, আর paginate করা report-এর জন্য ভুল।

## Idempotent Write

`POST /payments` idempotent নয়, কিন্তু network timeout হবে আর client retry করবে। সুরক্ষা ছাড়া customer দুবার pay
করে। Stripe-এর API সমাধানটা ব্যবহার করে: একটি `Idempotency-Key` header, প্রতিটি logical operation-এর জন্য একটি key।
Server একটি atomic Redis `SET NX` দিয়ে সেটা দখল করে। প্রথম request চলার সময় একটি পুনরাবৃত্তি পায় `409`, আর পরে পায়
তার সংরক্ষিত response-এর replay। Failure হলে key মুছে দিন, যাতে retry করা যায়।

## Contract বদলানো

আগে এগুলো চেষ্টা করুন। প্রতিটিই নতুন version ছাড়া একটি পরিবর্তন ship করে:

- **যোগ করুন, বদলাবেন না।** `name`-এর পাশাপাশি `firstName` আর `lastName` ship করুন, আর `name`-কে deprecated চিহ্নিত করুন।
- **আগে বাড়ান, তারপর ছাঁটুন।** দুটো field-ই লিখুন, client-দের migrate করুন, পরে পুরনো field মুছে দিন — zero-downtime
  database migration-এর একই pattern।

ভাঙা যখন এড়ানো যায় না, **major** version path-এ রাখুন: `/v1/users`, কখনো `/v1.2.3` নয়। এটা log-এ দেখা যায়, আর load
balancer-এ route করা যায়। Header বেশি খাঁটি REST, কিন্তু debug করার সময় চোখে পড়ে না। Service নয়, shape version
করুন। `/v1` আর `/v2` একটি service layer ভাগ করে নেয়, দুটো presenter-সহ, যারা একই `User`-কে নিজ নিজ shape-এ map করে।
প্রতি version-এ service duplicate করলেই একটি bug fix শুধু একটিতে গিয়ে পড়ে।

Contract generate করুন; কখনো হাতে লিখবেন না। প্রতিটি request একবার একটি Zod schema হিসেবে define করুন, আর সেখান থেকে
TypeScript type, runtime validator আর OpenAPI spec বের করুন। তখন documented contract আর enforce করা contract-এর মধ্যে
অমিল হতে পারে না। Spec commit করুন আর CI-তে gate করুন: commit করা file থেকে **drift** হলে fail করুন, আর শেষ release-এর
বিপরীতে একটি **breaking diff** হলেও (`oasdiff` এটা করে), যদি না major বদলে থাকে।

**একটি version শুধু changelog-এ নয়, response-এই অবসরে পাঠান:**

```typescript
res.set("Deprecation", "@1772323200");              // RFC 9745 — 1 Mar 2026
res.set("Sunset", "Tue, 01 Sep 2026 00:00:00 GMT"); // RFC 8594
res.set("Link", '</v2/users>; rel="successor-version"');
```

তারপর পুরনো path-এ প্রতিটি call caller-এর পরিচয়সহ log করুন। শুধু এটাই "এখন কি মুছে ফেলা নিরাপদ" প্রশ্নের নির্ভরযোগ্য
উত্তর দেয়। একটি internal API-র জন্য ছয় মাস যথেষ্ট। Public API-র জন্য বারো মাস ন্যূনতম।

## সাধারণ ভুল

**❌ ভুল, তারপর ✅ ঠিক — সাফল্যের পোশাকে একটি error:**

```typescript
// ❌ Every cache, proxy, retry and error dashboard reads the status line, so this "succeeded".
res.status(200).json({ success: false, error: "user not found" });
// ✅ Let the status code carry the outcome.
res.status(404).json({ type: "https://errors.example.com/not-found", title: "User not found", status: 404 });
```

**❌ User input সরাসরি একটি sort বা filter clause-এ পাঠানো।** `{ [req.query.sort]: -1 }` একই সাথে একটি injection আর
নিশ্চিত একটি table scan। Sort আর filter করা যায় এমন প্রতিটি key allowlist করুন — দেখুন
[Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation)।

**❌ "v1 কেউ ব্যবহার করে না" বলে একটি version মুছে ফেলা।** আগে telemetry যোগ করুন। উত্তরটা প্রায়ই দুই বছর আগের একটি
mobile app release, যেটা update করা যায় না।

> ⚠️ Authorisation-কে শুধু route নয়, **object** যাচাই করতে হবে। `GET /orders/9`-কে যাচাই করতে হবে যে order 9
> caller-এর। শুধু একটি route guard থাকলে যেকোনো authenticated user প্রতিটি order পড়তে পারে।

## 🔑 মূল শিক্ষা

- URL একটি resource-এর নাম দেয়, আর method action-এর নাম দেয়। Path-এ একটি ক্রিয়া মানে design পিছলে গেছে।
- Idempotency ঠিক করে, একটি timeout-এর পর client, proxy বা load balancer নিরাপদে retry করতে পারবে কি না।
- বড় table আর একসাথে চলা insert-এ টিকে থাকে শুধু cursor pagination।
- যোগ করা পরিবর্তন নিরাপদ। কিন্তু মুছে ফেলা, type বদলানো, কড়া validation আর বদলানো default — সবই client ভাঙে।
- Runtime যে schema দিয়ে validate করে, সেখান থেকেই contract generate করুন। আর একটি version মুছুন শুধু তখন, যখন তার telemetry চুপ।

## Interview-এর প্রশ্ন

**Q: কোন method-গুলো idempotent, আর এটা কেন গুরুত্বপূর্ণ?**

`GET`, `PUT`, `DELETE`, `HEAD` আর `OPTIONS`। এটা ঠিক করে, timeout-এর পর একটি retry নিরাপদ কি না। টাকা সরায় এমন
একটি `POST`-এর জন্য আমি একটি `Idempotency-Key` নিই আর server-এর দিকে deduplicate করি।

**Q: এক কোটি row কীভাবে paginate করবেন?**

Keyset pagination। `OFFSET` এখনো বাদ দেওয়া প্রতিটি row scan করে, আর একসাথে চলা insert duplicate আর ফাঁক তৈরি করে।
আমি শেষ row-এর sort key আর id একটি opaque cursor-এ encode করি, আর `limit + 1` row fetch করি।

**Q: Client না ভেঙে একটি required request field কীভাবে যোগ করবেন?**

করবেন না — সংজ্ঞা অনুযায়ীই এটা breaking। এটা optional হিসেবে যোগ করুন, এমন একটি default-সহ যেটা আজকের আচরণ ধরে রাখে।
কতজন caller এটা পাঠায় তা মাপুন, তারপর পরের major version-এ required করুন।

**Q: কখন আপনি একটি `/v2` ship করবেন না?**

প্রায় সবসময়, যদি পরিবর্তনটা যোগ করার মতো হয়। নতুন version প্রতিটি consumer-কে migrate করতে বাধ্য করে, যাদের কিছু
হয়নি তাদেরও, আর আপনার test করার পরিমাণ দ্বিগুণ করে। একটি নতুন optional field বা আগে-বাড়ান-তারপর-ছাঁটুন সাধারণত কাজটা
করে দেয়। একটি version তার খরচ পোষায় শুধু সত্যিকারের নতুন সংজ্ঞার ক্ষেত্রে।

## এরপর কী পড়বেন

- [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql) — client shape বেছে নিলে কী পাওয়া যায়, আর version ছাড়া schema-র বিবর্তন
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — `429`-এর পথ, আর limit-কে কীভাবে অনুমানযোগ্য করবেন
- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — একটি schema-তে আগে-বাড়ান-তারপর-ছাঁটুন প্রয়োগ
