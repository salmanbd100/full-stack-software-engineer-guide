---
sourceHash: "2eacdb092ad42e5cef2afe6753b9b5df11890fa074f088326de46bda05e7e407"
title: "REST Best Practice ও Versioning"
translatedAt: "2026-10-17T14:02:52.457Z"
model: "claude-opus-5-5 (Claude Code)"
---

# REST Best Practice ও Versioning {#ch-rest-best-practices}

> এমন HTTP API design করুন, যা আরেকজন engineer docs পড়ার আগেই ঠিকঠাক আন্দাজ করতে পারেন। তারপর তাঁর code না ভেঙে API বদলান।

**এই অধ্যায়ে:** resource URL · method আর idempotency · status code আর error-এর একটিই shape · scale-এ টিকে থাকা pagination · client না ভেঙে contract বদলানো

## 💡 মূল ধারণা

REST এমন কোনো specification নয়, যার compliance test-এ আপনি fail করতে পারেন। এটা HTTP-র ওপর দাঁড়ানো কিছু রীতি। লাভটা হলো
অনুমানযোগ্যতা: রীতিগুলো মানা হলে client documentation না খুলেই আন্দাজ করতে পারে একটি route কেমন আচরণ করবে।
Interviewer-রা REST design দিয়ে আরও বড় কিছু যাচাই করেন। আপনি কি একটি domain-কে model করতে পারেন, আর HTTP কি এতটা
বোঝেন যে সেটাকে নতুন করে আবিষ্কার করতে বসবেন না?

> URL একটি **জিনিসের** নাম বলে। Method বলে আপনি **তার সঙ্গে কী করছেন**। `POST /users/123/deactivate` দেখলেই সতর্ক
> হোন। `{ "status": "inactive" }` দিয়ে `PATCH /users/123` একই কাজ করে, শুধু HTTP-র ভাষায়।

অন্য team আপনার API call করতে শুরু করলেই তার shape একটি contract হয়ে যায়। প্রতিটি চালু version একটি আলাদা code path,
যা আপনাকে maintain করতে হয়। তাই senior-এর প্রশ্ন "এটা কীভাবে version করব" নয়, বরং **"নতুন version ছাড়াই এটা কীভাবে
ship করব"**।

## কীভাবে কাজ করে

### Resource-কেন্দ্রিক URL

| নিয়ম                        | ❌ খারাপ                           | ✅ ভালো                      |
| --------------------------- | -------------------------------- | ---------------------------- |
| Verb নয়, noun              | `/getUsers`, `/createUser`       | `GET /users`, `POST /users`  |
| Collection বহুবচনে           | `/user/123`                      | `/users/123`                 |
| ছোট হাতের অক্ষর, hyphen দিয়ে  | `/orderItems`, `/order_items`    | `/order-items`               |
| Nest শুধু মালিকানা দেখাতে      | `/users/1/orders/9/items/4/tax`  | `/order-items/4`             |

দুই স্তরের বেশি nest করবেন না। তার চেয়ে গভীরে গেলে child-এর নিজেরই একটি পরিচয় থাকে। CRUD নয় এমন action-ও বেশিরভাগ
সময় resource হিসেবে model করা যায়। Password reset একটি request (`POST /users/123/password-resets`), refund একটি record
(`POST /orders/9/refunds`), আর ধীর export একটি job (`POST /reports`, যা `202` return করে)। তবে একটি RPC-ধাঁচের route
এড়াতে design-কে মুচড়ে ফেলবেন না। কেউ বোঝে না এমন নকল resource-এর চেয়ে একটি `POST /cache:purge` ভালো।

### Method আর idempotency

| Method   | উদ্দেশ্য                        | Safe | Idempotent | Body |
| -------- | ------------------------------ | ---- | ---------- | ---- |
| `GET`    | পড়া                           | ✅   | ✅         | ❌   |
| `POST`   | তৈরি করা / non-idempotent action | ❌   | ❌         | ✅   |
| `PUT`    | পুরো resource বদলে দেওয়া         | ❌   | ✅         | ✅   |
| `PATCH`  | আংশিক update                 | ❌   | ❌ সাধারণত | ✅   |
| `DELETE` | মুছে ফেলা                         | ❌   | ✅         | ❌   |

**Safe** মানে কোনো state বদলায় না, তাই crawler নির্দ্বিধায় call করতে পারে। **Idempotent** মানে পাঁচবার call করলেও state
থাকে একবার call করার মতোই। এই গুণের জন্যই retry করা নিরাপদ হয়।

`PUT` পুরোটা বদলে দেয়: `{ "name": "Ada", "email": "ada@x.com" }` দিয়ে `PUT /users/123` করলে `phone` মুছে যায়।
`{ "name": "Ada" }` দিয়ে `PATCH /users/123` করলে বাকি field যেমন ছিল তেমনই থাকে। `{ "views": "+1" }` patch প্রতিবার
আলাদা ফল দেয়, আর এ কারণেই specification `PATCH`-কে idempotent বলে নিশ্চয়তা দিতে পারে না। সাধারণ `$set` patch
বাস্তবে idempotent। দুটি কথাই বলবেন।

### Status code

| Code            | কখন ব্যবহার করবেন                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| 200 · 201 · 204 | সফল — `201` সঙ্গে একটি `Location` header দেয়, `204`-এর ফেরত দেওয়ার কিছু নেই        |
| 202             | Async কাজের জন্য queue-তে রাখা হয়েছে, এখনো কিছু তৈরি হয়নি                                    |
| 400 · 409       | Validation fail · duplicate, version-এর অমিল বা অবৈধ state বদল      |
| 401 · 403       | Authenticated নয় · authenticated, কিন্তু অনুমতি নেই                           |
| 404             | এমন resource নেই — 403-এর ক্ষেত্রে resource আছে কি না, সেটাও লুকায়                      |
| 429             | Rate limit পড়েছে — সঙ্গে `Retry-After` দিন                                             |
| 500 · 503       | আপনার bug, কখনো stack trace সহ নয় · কোনো dependency down, বা আপনি load ঝেড়ে ফেলছেন   |

### কী বদলালে client ভাঙে

| বদল                                  | Breaking?  | কেন                                                 |
| --------------------------------------- | ---------- | --------------------------------------------------- |
| Optional field বা নতুন endpoint যোগ করা | ❌ না      | যে client এটা উপেক্ষা করে, তার কিছু হয় না               |
| Field সরানো, নাম বদলানো বা type বদলানো        | ✅ হ্যাঁ     | Client আজ সেটা পড়ছে; `"5"` থেকে `5` হলে parser fail করে  |
| Optional request field-কে required করা | ✅ হ্যাঁ     | আগের caller-রা আর validation পার হয় না                    |
| Enum-এ নতুন value যোগ করা                  | ⚠️ সাধারণত | `default` ছাড়া client-এর `switch` কোনো case-এ মেলে না    |
| Validation কড়া করা, বা default বদলানো | ✅ হ্যাঁ     | দুটিকেই bug fix মনে হয়, অথচ চুপচাপ caller ভেঙে দেয় |

## কখন ব্যবহার করবেন

| পরিস্থিতি                                           | বেছে নিন           | কেন                                                              |
| -------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Public API, অচেনা অনেক client                   | REST             | Default হিসেবেই cache করা যায়, আর প্রতিটি HTTP tool এটা আগে থেকেই বোঝে |
| একটি frontend, যার নানা রকম nested data লাগে        | GraphQL          | Shape বেছে নেয় client, তাই round trip কমে যায়              |
| ভেতরের service-to-service call, দুই প্রান্তেই type আছে | gRPC বা tRPC     | Contract type থেকে generate হয়; HTTP-র semantics তেমন কিছু যোগ করে না         |
| Server client-এর কাছে push করে                        | WebSocket বা SSE | REST-এ না চাইলে কিছু পাঠানোর উপায় নেই                       |

## Error Response

সব জায়গায় machine-readable একটিই shape ব্যবহার করুন: [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)।

**Error-এর একমাত্র shape:**

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
প্রতিটি route throw করে, কোনো route format করে না। Validation error **সবগুলো** একসঙ্গে ফেরত দিন। যে form প্রতি round
trip-এ একটি করে ভুল field দেখায়, সমস্যাটা তার API-তে, frontend-এ নয়।

## Pagination

| কৌশল                               | কীভাবে কাজ করে                  | কখন ব্যবহার করবেন                                             |
| -------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| **Offset** `?page=3&limit=20`          | `OFFSET 40 LIMIT 20`          | ছোট dataset, page number লাগে এমন admin screen |
| **Cursor** `?cursor=<opaque>&limit=20` | `WHERE (createdAt, id) < (…)` | Feed, infinite scroll, বড় বা দ্রুত বদলানো data    |

Offset-ই সবচেয়ে প্রচলিত, আর scale-এ সেটাই ভুল। `OFFSET 1000000` দিলেও database-কে দশ লাখ row পেরিয়ে গিয়ে সেগুলো
ফেলে দিতে হয়। আরও খারাপ, user page করার মাঝে কোনো row ঢুকলে সব সরে যায়। তখন user item 20 দুবার দেখেন, আর item 21
কখনো দেখেন না। Keyset pagination দুটি সমস্যাই মেটায়:

**Opaque cursor দিয়ে keyset pagination:**

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

> ⚠️ Cursor opaque। Base64 শুধু encoding, security নয়। Cursor-এ স্পর্শকাতর কিছু থাকলে sign করুন।

Cursor-এ random access থাকে না: সরাসরি page 50-এ যাওয়া যায় না, আর মোট সংখ্যা জানতে আলাদা query লাগে। Feed-এর জন্য
এই trade-off ঠিক, paginated report-এর জন্য ভুল।

## Idempotent Write

`POST /payments` idempotent নয়, অথচ network timeout হবেই, আর client retry করবেই। সুরক্ষা না থাকলে customer দুবার টাকা
দেন। Stripe-এর API যে সমাধান ব্যবহার করে: একটি `Idempotency-Key` header, প্রতিটি যৌক্তিক operation-এর জন্য একটি key।
Server Redis-এর atomic `SET NX` দিয়ে key-টা দখল করে। প্রথম request চলার সময় একই key আবার এলে পায় `409`, আর শেষ হওয়ার
পরে এলে পায় জমিয়ে রাখা response-এর replay। ব্যর্থ হলে key মুছে দিন, যাতে retry করা যায়।

## Contract বদলানো

আগে এগুলো চেষ্টা করুন। প্রতিটি দিয়েই নতুন version ছাড়া বদল ship করা যায়:

- **বদলে দেবেন না, যোগ করুন।** `name`-এর পাশাপাশি `firstName` আর `lastName` ship করুন, আর `name`-কে deprecated চিহ্নিত করুন।
- **আগে বাড়ান, তারপর ছাঁটুন।** দুটি field-ই লিখুন, client-দের migrate করান, পুরনো field পরে মুছুন। Zero-downtime
  database migration-এর ঠিক এই pattern।

Break এড়ানো না গেলে **major** version path-এ রাখুন: `/v1/users`, কখনো `/v1.2.3` নয়। এটা log-এ দেখা যায়, আর load
balancer-এ route করা যায়। Header-এ রাখা REST-এর দিক থেকে বেশি শুদ্ধ, কিন্তু debug করার সময় চোখে পড়ে না। Version করুন
shape-এর, service-এর নয়। `/v1` আর `/v2` একই service layer ভাগ করে নেয়, সঙ্গে দুটি presenter, যারা একই `User`-কে দুই
shape-এ সাজায়। প্রতিটি version-এর জন্য service duplicate করলে bug fix পৌঁছায় শুধু একটিতে।

Contract generate করুন, কখনো হাতে লিখবেন না। প্রতিটি request একবার Zod schema হিসেবে define করুন, আর তা থেকেই বের করুন
TypeScript type, runtime validator আর OpenAPI spec। তাহলে documentation-এর contract আর আসলে চালু থাকা contract কখনো
আলাদা হতে পারে না। Spec commit করুন, আর CI-তে পাহারা দিন: commit করা file থেকে **সরে গেলে** fail করুন, আর major না
বাড়িয়ে আগের release-এর তুলনায় **breaking diff** হলেও fail করুন (`oasdiff` এটা করে)।

**Version অবসরে পাঠানোর কথা response-এ জানান, শুধু changelog-এ নয়:**

```typescript
res.set("Deprecation", "@1772323200");              // RFC 9745 — 1 Mar 2026
res.set("Sunset", "Tue, 01 Sep 2026 00:00:00 GMT"); // RFC 8594
res.set("Link", '</v2/users>; rel="successor-version"');
```

তারপর পুরনো path-এর প্রতিটি call caller-এর পরিচয়সহ log করুন। "এখন কি মুছে ফেলা নিরাপদ", এর ভরসাযোগ্য উত্তর শুধু এটাই
দেয়। ভেতরের API-র জন্য ছয় মাস যথেষ্ট। Public API-র জন্য কমপক্ষে বারো মাস।

## সাধারণ ভুল

**❌ ভুল, তারপর ✅ ঠিক — সাফল্যের পোশাক পরা error:**

```typescript
// ❌ Every cache, proxy, retry and error dashboard reads the status line, so this "succeeded".
res.status(200).json({ success: false, error: "user not found" });
// ✅ Let the status code carry the outcome.
res.status(404).json({ type: "https://errors.example.com/not-found", title: "User not found", status: 404 });
```

**❌ User input সরাসরি sort বা filter clause-এ দেওয়া।** `{ [req.query.sort]: -1 }` একই সঙ্গে injection, আর নিশ্চিত
table scan। Sort আর filter করা যায় এমন প্রতিটি key-এর allowlist রাখুন — দেখুন
[Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation)।

**❌ "v1 কেউ ব্যবহার করে না" ভেবে version মুছে ফেলা।** আগে telemetry যোগ করুন। প্রায়ই দেখা যায় উত্তরটা দুই বছর আগের
একটি mobile app release, যা আর update করা যায় না।

> ⚠️ Authorisation-কে শুধু route নয়, **object**-ও যাচাই করতে হবে। `GET /orders/9`-কে নিশ্চিত করতে হবে যে order 9
> caller-এরই। শুধু route guard থাকলে যেকোনো authenticated user সব order পড়তে পারেন।

## 🔑 মূল শিক্ষা

- URL resource-এর নাম বলে, method বলে action-এর নাম। Path-এ verb থাকলে বুঝবেন design পিছলে গেছে।
- Timeout-এর পরে client, proxy বা load balancer নিরাপদে retry করতে পারবে কি না, তা ঠিক করে idempotency।
- বড় table আর একসঙ্গে চলা insert-এর মধ্যে টিকে থাকে একমাত্র cursor pagination।
- কিছু যোগ করা নিরাপদ। কিন্তু সরানো, type বদলানো, validation কড়া করা আর default বদলানো, সবই client ভাঙে।
- Runtime যে schema দিয়ে validate করে, সেটা থেকেই contract generate করুন। আর version মুছুন তখনই, যখন তার telemetry চুপ।

## Interview-এর প্রশ্ন

**Q: কোন method-গুলো idempotent, আর এটা জরুরি কেন?**

`GET`, `PUT`, `DELETE`, `HEAD` আর `OPTIONS`। Timeout-এর পরে retry করা নিরাপদ কি না, তা এটাই ঠিক করে। টাকা সরায় এমন
`POST`-এর জন্য আমি একটি `Idempotency-Key` নিই, আর server-এ deduplicate করি।

**Q: এক কোটি row কীভাবে paginate করবেন?**

Keyset pagination দিয়ে। `OFFSET` বাদ দেওয়া প্রতিটি row-ও scan করে, আর একসঙ্গে insert চললে duplicate আর ফাঁক তৈরি হয়।
আমি শেষ row-এর sort key আর id একটি opaque cursor-এ encode করি, আর `limit + 1`টি row আনি।

**Q: Client না ভেঙে কীভাবে required request field যোগ করবেন?**

করা যায় না — সংজ্ঞা অনুযায়ীই এটা breaking। প্রথমে optional হিসেবে যোগ করুন, এমন default দিয়ে যা আজকের আচরণ বজায় রাখে।
কতজন caller field-টা পাঠাচ্ছেন মাপুন, তারপর পরের major version-এ required করুন।

**Q: কখন `/v2` ship করবেন না?**

প্রায় সবসময়, যদি বদলটা যোগ করে করা যায়। নতুন version প্রতিটি consumer-কে migrate করতে বাধ্য করে, যাদের ওপর বদলের কোনো
প্রভাব নেই তাদেরও, আর test-এর পরিমাণ দ্বিগুণ করে। সাধারণত নতুন optional field, বা আগে বাড়িয়ে পরে ছাঁটা, দিয়েই কাজ হয়ে
যায়। Version-এর খরচ সার্থক শুধু তখন, যখন জিনিসটার সংজ্ঞাই নতুন করে লেখা হচ্ছে।

## এরপর কী পড়বেন

- [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql) — shape client বেছে নিলে কী পান, আর version ছাড়াই schema-র বিবর্তন
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — `429`-এর পথ, আর limit কীভাবে অনুমানযোগ্য করবেন
- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — schema-র ওপর আগে বাড়িয়ে পরে ছাঁটার pattern
