---
sourceHash: "356695d4312610a21761b6e94ef65893c2b9704d27eca9e51da1b1ab9614d0af"
title: "Data Fetching ও Caching"
translatedAt: "2026-10-17T01:38:10.718Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Data Fetching ও Caching {#ch-nextjs-data-and-caching}

> প্রথম "এই page stale কেন" ticket আসার আগেই ঠিক করে বলুন: request কোথায় যায়, উত্তর কতক্ষণ বাঁচে, আর কীসে সেটা ভুল হয়ে যায়।

**এই অধ্যায়ে:** Server Component-এ fetch · request memoisation · `use cache` · lifetime আর tag · invalidation · waterfall

## 💡 মূল ধারণা

Next.js 16 default-টা উল্টে দিয়েছে। Data fetching **dynamic, যদি না আপনি ইচ্ছে করে cache করেন**, আর caching হলো
একটি directive, যা আপনি যে function-এর দরকার তার পাশেই লেখেন। Version 13 আর 14 default-ভাবে `fetch` cache করত।
ফলে অনেক team "cache" শব্দটা একবারও না লিখে stale page ship করেছে। App Router নিয়ে এটাই ছিল সবচেয়ে বেশি রিপোর্ট
হওয়া সমস্যা।

Cache entry-কে তিন column-এর একটি row হিসেবে ভাবলে বাকি সব বোঝা যায়: **একটি key**, **একটি lifetime**, আর **একটি
tag, যা দিয়ে entry মুছে ফেলা যায়**। যেকোনো একটি বাদ পড়লেই এমন caching bug হয়, যার চেহারা আগে থেকেই বলা যায়।
Key না থাকলে সব user একটি entry share করে। Lifetime না থাকলে চিরকাল stale থাকে। Tag না থাকলে ঠিক করার একমাত্র
উপায় redeploy।

> ⚠️ **যা বদলাতে থাকে:** caching-এর নিয়ম বদলেছে Next.js 15-এ, আবার 16-এ। `unstable_cache` আর
> `experimental.ppr` আর নেই, তাদের জায়গা নিয়েছে `cacheComponents` আর `use cache`। টেকসই নীতি হলো ওপরের তিনটি
> column: একটি key, একটি lifetime, আর ইচ্ছেমতো invalidate করার একটি উপায়।

## কীভাবে কাজ করে

### Data যেখানে, fetch সেখানেই

Server Component সরাসরি database query করতে পারে। আলাদা API layer লিখতে হয় না, browser থেকে round trip হয় না,
আর কোনো secret client পর্যন্ত পৌঁছাতে হয় না।

```tsx
export default async function UsersPage() {
  const users = await db.user.findMany(); // runs on the server, ships no JavaScript
  return <UserList users={users} />;
}
```

Route Handler তাদের জন্য, যাদের caller আপনার নিয়ন্ত্রণে নেই, যেমন mobile client, webhook বা third party। শুধু
Server Component call করবে বলে একটা বানালে অকারণে একটি round trip বাড়ে।

### Request memoisation

একটি render pass-এর ভেতরে `cache()`-এ মোড়া একই রকম call-গুলো React একবারই চালায়, আর একই রকম `fetch` call-এর
বেলায় Next.js-ও তাই করে। তিনটি component আলাদাভাবে current user চাইতে পারে, অথচ query চলে মাত্র একবার।

```tsx
import { cache } from "react";

export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));
```

এটা প্রতিটি request-এর জন্য আলাদা, দীর্ঘস্থায়ী cache নয়। এর ফলে data props দিয়ে নিচে পাঠানোর বদলে যেখানে
ব্যবহার হয় সেখানেই fetch করা যায়। গভীর component tree-তে data fetching এভাবেই সামলানোর মতো থাকে।

### `use cache` — ইচ্ছে করে caching

একবার চালু করুন, তারপর যা cache হবে তা চিহ্নিত করুন।

```typescript
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { cacheComponents: true };
export default nextConfig;
```

Directive-টা তিনটি পরিসরে কাজ করে: একটি function, একটি component, অথবা পুরো একটি file, যার প্রতিটি export
`async`।

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function getProduct(id: string) {
  "use cache";
  cacheLife("hours");           // how long the entry lives
  cacheTag("products", `product-${id}`); // how it gets invalidated
  return db.product.findUnique({ where: { id } });
}
```

**Key-টা Next.js নিজেই বানায়**: function-এর identity, তার serialisable argument, closure-এ ধরা value, আর build ID
দিয়ে। Build ID থাকায় deploy করলেই সব invalidate হয়। Argument থাকায় `getProduct("a")` আর `getProduct("b")`
আলাদা entry, আর আপনাকে কোনো key লিখতে হয় না। এর মানে এটাও যে, কোনো argument পাঠাতে ভুলে গেলে দুজন user একটি
entry share করে।

### Lifetime

`cacheLife` নেয় একটি নামওয়ালা profile — `minutes`, `hours`, `days`, `weeks`, `max` — অথবা একটি explicit object।

```tsx
cacheLife({
  stale: 3600,      // serve this entry while revalidating behind it
  revalidate: 7200, // how often to refresh in the background
  expire: 86400,    // after this, never serve it — fetch fresh
});
```

তিনটি সংখ্যা তিনটি আলাদা প্রশ্নের উত্তর দেয়। এগুলো গুলিয়ে ফেলাই "শেষমেশ update হলো, কিন্তু যখন ভেবেছিলাম তখন
নয়"-এর সাধারণ কারণ। `stale` হলো user কতটা মেনে নেয়। `revalidate` হলো আপনার origin কতটা মেনে নেয়। `expire`
হলো সেই সীমা, যার পরে data সোজাসুজি ভুল।

### Invalidation

| Function                       | কী হয়                                                       | কখন ব্যবহার করবেন                              |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| `revalidateTag(tag, profile)`  | Stale চিহ্নিত করে; background-এ refresh করে                | পরের visitor নতুন data দেখলেই চলবে           |
| `updateTag(tag)`               | সঙ্গে সঙ্গে invalidate — একই request-ই নতুন data দেখে        | যে user এইমাত্র বদলাল, তাকে সেটা দেখতেই হবে  |
| `revalidatePath(path)`         | Tag-এর বদলে route ধরে invalidate করে                        | ভোঁতা অস্ত্র; tag-ই ভালো                       |

```tsx
"use server";
import { updateTag } from "next/cache";

export async function updateProduct(id: string, data: FormData) {
  await db.product.update({ where: { id }, data: parse(data) });
  updateTag(`product-${id}`); // this user sees their own edit, not the cached copy
}
```

পার্থক্যটা user চোখেই দেখতে পায়। User নিজের profile edit করার পরে `revalidateTag` call করলে, page-এ ফিরে এসে সে
পুরনো নামটাই দেখে। Cache ঠিকঠাক কাজ করলেও এটা bug-এর মতো দেখায়।

### Cache-এর ভেতরে যা রাখা যায় না

`use cache`-এর ভেতরে `cookies()`, `headers()` আর `searchParams` পাওয়া যায় না। এগুলো request data, আর cache entry
এমন কিছুর ওপর নির্ভর করতে পারে না, যা তার key-তে নেই।

```tsx
// ❌ Request data inside a cached function
async function CachedProfile() {
  "use cache";
  const session = (await cookies()).get("session")?.value; // error
  return <Profile id={session} />;
}

// ✅ Read it outside, pass it in — the argument becomes part of the key
async function ProfilePage() {
  const session = (await cookies()).get("session")?.value ?? "";
  return <CachedProfile sessionId={session} />;
}

async function CachedProfile({ sessionId }: { sessionId: string }) {
  "use cache";
  return <Profile data={await fetchUserData(sessionId)} />;
}
```

`"use cache: private"` সেই ক্ষেত্রগুলোর জন্য, যেখানে ওই refactor সম্ভব নয়। এটা shared entry-র বদলে প্রতিটি user-এর
জন্য আলাদা entry বানায়। জেনে-বুঝে ব্যবহার করুন, শুধু error চুপ করাতে নয়।

যে value প্রতিটি call-এ বদলায়, তাদেরও একই সমস্যা, শুধু আরও চুপচাপ। `use cache`-এর ভেতরে `Math.random()` আর
`Date.now()` চলে একবারই, entry তৈরির সময়। পরে যে-ই পড়ুক, সেই value-টাই দেখে।

### Waterfall

সবচেয়ে দামি caching ভুলটা আসলে caching-এর ভুলই নয়। সেটা waterfall: এমন request, যারা একে অপরের জন্য অপেক্ষা করে।
পরপর তিনটি `await` মানে তিনটি round trip, cache থাকুক বা না থাকুক।

```tsx
// ❌ 300 ms, in series
const user = await getUser(id);
const posts = await getPosts(id);
const stats = await getStats(id);

// ✅ 100 ms, together
const [user, posts, stats] = await Promise.all([getUser(id), getPosts(id), getStats(id)]);
```

Request-গুলো সত্যিই একে অপরের ওপর নির্ভর না করলে, আর একটি ধীর হলে, অপেক্ষাই করবেন না। ধীরটাকে তার নিজের Suspense
boundary-র পেছনে রাখুন, আর page-এর বাকিটা render হতে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | কী ব্যবহার করবেন                                      |
| ----------------------------------------------- | --------------------------------------------------- |
| আপনার নিয়ন্ত্রণের কোনো page-এর data পড়া          | সরাসরি Server Component-এ fetch                     |
| একই data কয়েকটি component-এর দরকার               | `cache()`, আর প্রতিটিতে call করুন                    |
| সবার জন্য একই data                                | `cacheLife` profile সহ `use cache`                  |
| Mutation-এর পরপরই যে data বদলে দেখাতে হবে         | যে action বদলাল, তার ভেতরে `updateTag`              |
| বদলের পরে একটু পিছিয়ে থাকলেও চলে এমন data        | `revalidateTag`                                     |
| Cookie বা header থেকে বের করা যেকোনো কিছু         | Cache-এর বাইরে, argument হিসেবে পাঠানো               |
| Mobile app বা webhook-এর জন্য endpoint             | Route Handler                                       |

## সাধারণ ভুল

**❌ Cache করা function-এ কোনো tag নেই।** কোনো এক সময় এটা ভুল হবেই। তখন হাতে থাকে শুধু দুটি উপায়: lifetime শেষ
হওয়ার অপেক্ষা, অথবা deploy।

**❌ প্রতিটি user-এর data shared tag-এর নিচে cache করা।** এক user-এর dashboard আরেকজনের কাছে চলে যায়। Value যদি
user অনুযায়ী বদলায়, তাহলে user-কে key-তে থাকতেই হবে। ভেতরে cookie না পড়ে argument হিসেবে পাঠান।

**❌ User যেখানে নিজের edit দেখার আশা করে, সেখানে `revalidateTag`।** Background revalidation মানে save করার পরের
redirect-এও পুরনো value দেখায়। এটা ঠিক করে `updateTag`।

**❌ `dynamic = "force-dynamic"` দিয়ে staleness ঠিক করা।** কাজ করে, কিন্তু পুরো route-এর caching বন্ধ হয়ে যায়,
যে অংশগুলো ঠিক ছিল সেগুলোরও। Bug ছিল একটি হারানো tag। আর সমাধানের দাম দিতে হলো page-এর static shell দিয়ে।

**❌ একে অপরের ওপর নির্ভর না করা পরপর await।** ঠিক করা সস্তা, আর সাধারণত trace-এ এটাই সবচেয়ে বড় সংখ্যা।

## 🔑 মূল শিক্ষা

- Next.js 16 default-ভাবে dynamic; caching নিজে চালু করতে হয় `use cache` আর `cacheComponents` দিয়ে।
- প্রতিটি cache entry-র লাগে একটি key, একটি lifetime আর একটি tag — কোনটা নেই, তা দেখেই বলা যায় কোন bug হবে।
- Cache key নিজে থেকেই তৈরি হয় argument আর closure থেকে, তাই প্রতিটি user-এর data argument হিসেবেই পাঠাতে হবে।
- `updateTag` একই request-এর মধ্যেই refresh করে; `revalidateTag` refresh করে পরের visitor-এর জন্য।
- Request memoisation প্রতিটি render-এ duplicate বাদ দেয়, এটা cache নয় — এর ফলে data যেখানে ব্যবহার হয় সেখানেই fetch করা যায়।

## Interview-এর প্রশ্ন

**Q: `use cache` function-এর ভেতরে `cookies()` পড়া যায় না কেন?**

Cache key তৈরি হয় function-এর argument আর closure থেকে, আর cookie এর কোনোটাই নয়। Cookie-র ওপর নির্ভর করা entry
এমন একটি key-র নিচে থাকত, যাতে cookie-র উল্লেখই নেই। তখন প্রথম user-এর data চলে যেত দ্বিতীয় user-এর কাছে।
সমাধান হলো call করা component-এ cookie পড়ে value-টা পাঠিয়ে দেওয়া। তাতে সেটা key-তে ঢুকে যায়।

**Q: `revalidateTag` নাকি `updateTag`?**

নির্ভর করে, যিনি বদলটা করলেন তাঁকে ফল দেখতে হবে কি না তার ওপর। `updateTag` একই request-এর মধ্যে invalidate করে,
তাই save করে redirect হওয়া user নিজের edit দেখতে পান। `revalidateTag` entry-কে stale চিহ্নিত করে, পুরনো copy
দেখাতে দেখাতে background-এ refresh করে। অন্যরা শিগগির পড়বে এমন content-এর জন্য এটা ঠিক, কিন্তু user-এর নিজের
লেখার জন্য ভুল।

**Q: একটি page stale। কোথায় সমস্যা, তা কীভাবে বের করবেন?**

Layer ধরে ধরে ক্রমানুসারে এগোন। Function-টা আদৌ cache হচ্ছে কি? এর `cacheLife` কী? এতে কোনো tag আছে? ওই tag-এর
জন্য কেউ `revalidateTag` call করে? সামনে কোনো CDN কি নিজের copy ধরে রেখেছে? প্রতিটি layer-এর সমাধান আলাদা, আর
layer-টার নাম বলাই উত্তর। "আমি caching বন্ধ করে দেব" বললে বোঝা যায়, আপনি কখনো layer-গুলো আলাদা করে দেখেননি।

**Q: কখন read-এর জন্য Server Component-এর বদলে Route Handler ঠিক জায়গা?**

যখন caller আপনার নিজের rendering pass নয়। Mobile client, third-party integration, webhook, অথবা GET-এ HTTP caching
লাগে এমন যেকোনো কিছু Route Handler পায়। Server Component call করবে বলে একটা বানালে বাড়ে একটি network hop, একটি
serialisation ধাপ, আর secure করার মতো আরেকটি endpoint। সবই এমন data পেতে, যা component সরাসরি query করতে পারত।

## এরপর কী পড়বেন

- [Chapter ?? — Next.js-এ Rendering](#ch-rendering-in-nextjs) — cached আর dynamic content কীভাবে একই route share করে
- [Chapter ?? — Server Action](#ch-server-actions) — invalidation আসলে কোথা থেকে call হয়
- [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) — এই সবকিছুর সামনে বসে থাকা CDN layer
