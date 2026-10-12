---
sourceHash: "356695d4312610a21761b6e94ef65893c2b9704d27eca9e51da1b1ab9614d0af"
title: "Data Fetching ও Caching"
translatedAt: "2026-10-12T07:53:21.285Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Data Fetching ও Caching {#ch-nextjs-data-and-caching}

> একটি request ঠিক কোথায় যায়, তার উত্তর কতক্ষণ বেঁচে থাকে, আর কী সেটাকে ভুল করে — প্রথম "এই page stale কেন" ticket আসার আগেই বলতে পারুন।

**এই অধ্যায়ে:** Server Component-এ fetch করা · request memoisation · `use cache` · lifetime আর tag · invalidation · waterfall

## 💡 মূল ধারণা

Next.js 16 default উল্টে দিয়েছে। Data fetching **dynamic, যদি না আপনি ইচ্ছা করে cache করেন**, আর caching হলো একটি
directive, যেটা আপনি সেই function-এর পাশে লেখেন, যার এটা দরকার। Version 13 আর 14 default-ভাবে `fetch` cache করত।
ফলে অনেক team "cache" শব্দটা একবারও না লিখে একটি stale page ship করেছে। App Router নিয়ে এটাই ছিল সবচেয়ে বেশি
report করা সমস্যা।

বাকি সবকিছু মিলে যায়, যদি একটি cache entry-কে তিন column-এর একটি row হিসেবে ভাবেন: **একটি key**, **একটি
lifetime**, আর **একটি tag, যা দিয়ে এটা মুছে ফেলা যায়**। যেকোনো একটি বাদ পড়লে আপনি একটি অনুমেয় আকারের caching bug
পাবেন। Key না থাকলে সব user একটি entry share করে। Lifetime না থাকলে এটা চিরকাল stale থাকে। Tag না থাকলে ঠিক
করার একমাত্র উপায় একটি redeploy।

> ⚠️ **চলমান লক্ষ্য:** caching-এর নিয়ম Next.js 15-এ বদলেছে, 16-এ আবার বদলেছে। `unstable_cache` আর
> `experimental.ppr` চলে গেছে, তাদের জায়গা নিয়েছে `cacheComponents` আর `use cache`। স্থায়ী নীতি হলো ওপরের তিনটি
> column: একটি key, একটি lifetime, আর ইচ্ছা করে invalidate করার একটি উপায়।

## কীভাবে কাজ করে

### Data যেখানে, fetch সেখানে

একটি Server Component সরাসরি database query করতে পারে। লেখার মতো কোনো API layer নেই, browser থেকে কোনো round
trip নেই, আর client-এ পৌঁছাতে হবে এমন কোনো secret নেই।

```tsx
export default async function UsersPage() {
  const users = await db.user.findMany(); // runs on the server, ships no JavaScript
  return <UserList users={users} />;
}
```

Route Handler সেই caller-দের জন্য, যাদের আপনি নিয়ন্ত্রণ করেন না, যেমন একটি mobile client, একটি webhook বা কোনো
third party। শুধু একটি Server Component call করবে বলে একটি বানালে অকারণে একটি round trip যোগ হয়।

### Request memoisation

একটি render pass-এর ভেতরে React `cache()`-এ মোড়ানো একই রকম call-গুলো deduplicate করে, আর Next.js একই রকম
`fetch` call-এর জন্য একই কাজ করে। তিনটি component প্রত্যেকে current user চাইতে পারে, তবু query চলে একটিই।

```tsx
import { cache } from "react";

export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));
```

এটা per-request, কোনো স্থায়ী cache নয়। এর ফলে আপনি data props দিয়ে নিচে পাঠানোর বদলে যেখানে ব্যবহার হয় সেখানেই
fetch করতে পারেন। গভীর component tree-তে data fetching-কে সুস্থ রাখে এটাই।

### `use cache` — ইচ্ছা করে caching

একবার চালু করুন, তারপর কী cache হবে তা চিহ্নিত করুন।

```typescript
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { cacheComponents: true };
export default nextConfig;
```

Directive-টি তিনটি scope-এ কাজ করে: একটি function, একটি component, বা একটি পুরো file, যেখানে প্রতিটি export
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

**Next.js আপনার জন্য key তৈরি করে** function-এর identity, তার serialise করা যায় এমন argument, তার capture করা
closure value আর build ID থেকে। Build ID মানে একটি deploy সবকিছু invalidate করে। Argument মানে
`getProduct("a")` আর `getProduct("b")` আলাদা entry, আর আপনাকে কোনো key লিখতে হয় না। এর আরও মানে, একটি argument
pass করতে ভুলে গেলে দুজন user একটি entry share করবেন।

### Lifetime

`cacheLife` একটি নামযুক্ত profile নেয় — `minutes`, `hours`, `days`, `weeks`, `max` — অথবা একটি explicit object।

```tsx
cacheLife({
  stale: 3600,      // serve this entry while revalidating behind it
  revalidate: 7200, // how often to refresh in the background
  expire: 86400,    // after this, never serve it — fetch fresh
});
```

তিনটি সংখ্যা তিনটি আলাদা প্রশ্নের উত্তর দেয়। এগুলো গুলিয়ে ফেলাই সাধারণত "শেষমেশ update হয়েছে, কিন্তু যখন
ভেবেছিলাম তখন নয়"-এর কারণ। `stale` হলো user যতটা সহ্য করেন। `revalidate` হলো আপনার origin যতটা সহ্য করে।
`expire` হলো সেই সীমা, যার পরে data সোজাসুজি ভুল।

### Invalidation

| Function                       | প্রভাব                                                     | কখন ব্যবহার করবেন                                     |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| `revalidateTag(tag, profile)`  | Stale চিহ্নিত করে; background-এ refresh করে                    | পরের visitor নতুন data দেখতে পারেন           |
| `updateTag(tag)`               | সঙ্গে সঙ্গে invalidate করে — একই request নতুন data দেখে  | যে user এইমাত্র পরিবর্তন করলেন, তাঁকে সেটা দেখতে হবে |
| `revalidatePath(path)`         | Tag-এর বদলে route ধরে invalidate করে                     | একটি ভোঁতা হাতিয়ার; tag-ই ভালো               |

```tsx
"use server";
import { updateTag } from "next/cache";

export async function updateProduct(id: string, data: FormData) {
  await db.product.update({ where: { id }, data: parse(data) });
  updateTag(`product-${id}`); // this user sees their own edit, not the cached copy
}
```

পার্থক্যটা user দেখতে পান। একজন user নিজের profile edit করার পর `revalidateTag` call করুন, তিনি page-এ ফিরে এসে
পুরনো নাম দেখবেন। এটা bug-এর মতো দেখায়, যদিও cache ঠিকঠাক কাজ করছে।

### Cache-এর ভেতরে যা যেতে পারে না

`cookies()`, `headers()` আর `searchParams` `use cache`-এর ভেতরে পাওয়া যায় না। এগুলো request data, আর একটি
cache entry এমন কিছুর ওপর নির্ভর করতে পারে না, যা তার key-তে নেই।

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

`"use cache: private"` সেই ক্ষেত্রগুলোর জন্য, যেখানে ওই refactor সম্ভব নয়। এটা shared entry-র বদলে প্রতি user-এর জন্য
একটি entry বানায়। এটা ইচ্ছা করে ব্যবহার করুন, error চুপ করাতে নয়।

প্রতিটি call-এ বদলায় এমন value-গুলোর একই সমস্যা আছে, আরও নিঃশব্দ রূপে। `use cache`-এর ভেতরে `Math.random()` আর
`Date.now()` একবারই চলে, entry তৈরির সময়। পরের প্রতিটি পাঠক সেই value-ই দেখেন।

### Waterfall

সবচেয়ে ব্যয়বহুল caching ভুলটা আসলে কোনো caching ভুলই নয়। এটা একটি waterfall: এমন request, যেগুলো একটি আরেকটির
জন্য অপেক্ষা করে। পরপর তিনটি `await` মানে তিনটি round trip, cache হোক বা না হোক।

```tsx
// ❌ 300 ms, in series
const user = await getUser(id);
const posts = await getPosts(id);
const stats = await getStats(id);

// ✅ 100 ms, together
const [user, posts, stats] = await Promise.all([getUser(id), getPosts(id), getStats(id)]);
```

Request-গুলো যখন সত্যিই স্বাধীন আর একটি ধীর, তখন অপেক্ষাই করবেন না। ধীরটিকে তার নিজস্ব Suspense boundary-র পেছনে
রাখুন, আর page-এর বাকিটা render হতে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | যা ব্যবহার করবেন                                          |
| ----------------------------------------------- | --------------------------------------------------- |
| আপনার নিয়ন্ত্রণে থাকা একটি page-এর data পড়া              | Server Component-এ সরাসরি fetch              |
| একই data কয়েকটি component-এর দরকার       | `cache()`, আর প্রতিটিতে call করুন                       |
| এমন data, যা সবার জন্য একই               | একটি `cacheLife` profile সহ `use cache`              |
| এমন data, যা একটি mutation সঙ্গে সঙ্গে দেখাবে    | যে action এটা বদলেছে, তার ভেতরে `updateTag`           |
| এমন data, যা পরিবর্তনের পর একটু পিছিয়ে থাকতে পারে        | `revalidateTag`                                     |
| Cookie বা header থেকে আসা যেকোনো কিছু         | Cache-এর বাইরে, argument হিসেবে pass করা         |
| Mobile app বা webhook-এর জন্য একটি endpoint        | একটি Route Handler                                     |

## সাধারণ ভুল

**❌ Cache করা function-এ কোনো tag নেই।** কোনো এক সময় এটা ভুল হবেই। তখন ঠিক করার উপায় বাকি থাকে দুটি: lifetime
শেষ হওয়ার অপেক্ষা, বা একটি deploy ship করা।

**❌ Per-user data একটি shared tag-এর অধীনে cache করা।** একজন user-এর dashboard আরেকজনকে serve হয়। Value যদি
user অনুযায়ী বদলায়, তাহলে user-কে key-তে থাকতেই হবে। এটা argument হিসেবে pass করুন, ভেতরে cookie পড়ে নয়।

**❌ যেখানে user নিজের edit দেখার আশা করেন, সেখানে `revalidateTag`।** Background revalidation মানে save করার পরের
redirect-এ এখনো পুরনো value দেখায়। `updateTag`-ই এটা ঠিক করে।

**❌ `dynamic = "force-dynamic"` দিয়ে staleness ঠিক করা।** এটা কাজ করে, কিন্তু পুরো route-এর caching বন্ধ করে দেয়,
যে অংশগুলো ঠিক ছিল সেগুলোসহ। Bug ছিল একটি অনুপস্থিত tag। Fix-এর দাম হলো page-এর static shell।

**❌ পরপর এমন await, যেগুলো একটি আরেকটির ওপর নির্ভর করে না।** ঠিক করা সস্তা, আর সাধারণত trace-এর সবচেয়ে বড়
সংখ্যা।

## 🔑 মূল শিক্ষা

- Next.js 16 default-ভাবে dynamic; caching opt-in, `use cache` আর `cacheComponents` দিয়ে।
- প্রতিটি cache entry-র একটি key, একটি lifetime আর একটি tag দরকার — যেটা নেই, সেটাই বলে দেয় আপনি কোন bug পাবেন।
- Cache key argument আর closure থেকে আপনা-আপনি তৈরি হয়, তাই per-user data argument হিসেবে pass করতেই হবে।
- `updateTag` একই request-এর ভেতরে refresh করে; `revalidateTag` পরের visitor-এর জন্য refresh করে।
- Request memoisation প্রতি render-এর deduplication, cache নয় — এর ফলে data যেখানে ব্যবহার হয়, সেখানেই fetch করা যায়।

## Interview-এর প্রশ্ন

**Q: একটি `use cache` function-এর ভেতরে কেন `cookies()` পড়া যায় না?**

Cache key তৈরি হয় function-এর argument আর closure থেকে, আর cookie এর কোনোটাই নয়। Cookie-র ওপর নির্ভরশীল একটি
entry এমন একটি key-র অধীনে বসবে, যেটা cookie-র কথা বলেই না। তখন প্রথম user-এর data দ্বিতীয়জনকে serve হবে। সমাধান
হলো caller component-এ cookie পড়া আর value-টি pass করা। এতে সেটা key-তে চলে আসে।

**Q: `revalidateTag` নাকি `updateTag`?**

এটা নির্ভর করে, যিনি পরিবর্তনটা করলেন, তাঁকে ফলাফল দেখতে হবে কি না। `updateTag` একই request-এর ভেতরে invalidate
করে, তাই যে user save করে redirect হন, তিনি নিজের edit দেখেন। `revalidateTag` entry-টিকে stale চিহ্নিত করে, আর
পুরনো copy serve করতে করতে background-এ refresh করে। অন্যরা শিগগিরই পড়বেন এমন content-এর জন্য এটা ঠিক, কিন্তু
user-এর নিজের write-এর জন্য ভুল।

**Q: একটি page stale। কোথায় সমস্যা, কীভাবে বের করবেন?**

Layer-গুলো ক্রমানুসারে ধরে এগোন। Function-টি আদৌ cache হয় কি? তার `cacheLife` কী? এর কোনো tag আছে কি? সেই tag-এর
জন্য কেউ `revalidateTag` call করে কি? সামনে কোনো CDN কি নিজের copy ধরে রাখছে? প্রতিটি layer-এর fix আলাদা, আর layer-টির
নাম বলাই উত্তর। "আমি caching বন্ধ করে দেব" দেখায় যে আপনি কখনো layer-গুলো আলাদা করেননি।

**Q: কখন একটি read-এর সঠিক জায়গা Server Component নয়, Route Handler?**

যখন caller আপনার নিজের rendering pass নয়। একটি mobile client, একটি third-party integration, একটি webhook, বা GET-এ
HTTP caching দরকার এমন যেকোনো কিছু একটি Route Handler পায়। একটি Server Component call করবে বলে একটি বানালে একটি
network hop, একটি serialisation ধাপ আর secure করার মতো একটি endpoint যোগ হয়। আর এত কিছু এমন data-র জন্য, যেটা
component সরাসরি query করতে পারত।

## এরপর কী পড়বেন

- [Chapter ?? — Next.js-এ Rendering](#ch-rendering-in-nextjs) — cache করা আর dynamic content কীভাবে একটি route share করে
- [Chapter ?? — Server Action](#ch-server-actions) — invalidation আসলে কোথা থেকে call হয়
- [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) — এই সবকিছুর সামনে বসে থাকা CDN layer
