---
sourceHash: "86eccb35a38eb345c66e02339168cb89f9f558987822f813ea477a6072a8bd0e"
title: "SvelteKit-এ Routing ও Loading"
translatedAt: "2026-10-17T01:38:06.355Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SvelteKit-এ Routing ও Loading {#ch-sveltekit-routing-and-loading}

> কোনো route-এর file-এর নাম পড়লেই বুঝে যাবেন কী server-এ চলে, কী browser-এ চলে, আর কী দুই জায়গাতেই।

**এই অধ্যায়ে:** `+` file-গুলো · universal বনাম server `load` · layout আর `await parent()` · ধীর promise stream করা · load করা data invalidate করা

## 💡 মূল ধারণা

SvelteKit 2 দুটি সিদ্ধান্ত রাখে filesystem-এ। **Directory** ঠিক করে URL। **File-এর নাম** ঠিক করে code কোথায় চলবে।

`+page.svelte` হলো component। `+page.ts` প্রথম request-এ data load করে server-এ, আর তার পরের প্রতিটি navigation-এ
browser-এ। `+page.server.ts` data load করে শুধু server-এ। শেষের এই ভাগটাই SvelteKit route-এর পুরো security আর
performance model। Directory listing দেখলেই সেটা চোখে পড়ে।

## কীভাবে কাজ করে

### `+` file-গুলো

| File                | কোথায় চলে                      | কীসের জন্য                                         |
| ------------------- | ---------------------------- | ---------------------------------------------- |
| `+page.svelte`      | আগে server, তারপর browser      | এই route-এর component                           |
| `+page.ts`          | Server আর browser দুটিতেই       | যে data যেকোনো জায়গায় নিরাপদ — যেমন public API call |
| `+page.server.ts`   | শুধু server                   | Database query, secret, form action             |
| `+layout.svelte`    | আগে server, তারপর browser      | এই segment আর তার children-এর shared shell      |
| `+layout.server.ts` | শুধু server                   | যে data প্রতিটি child-এর লাগে — যেমন session      |
| `+server.ts`        | শুধু server                   | একটি HTTP endpoint, page নয়                     |
| `+error.svelte`     | আগে server, তারপর browser      | এই segment-এর error boundary                    |

Route nest হয় directory ধরে। `src/routes/(app)/invoices/[id]/+page.svelte` serve করে `/invoices/123`। Bracket মানে
parameter। বন্ধনীর ভেতরের directory হলো **group**: layout ভাগ করে নেয়, কিন্তু URL-এ দেখা যায় না। `[[lang]]`
ঐচ্ছিক, আর `[...rest]` বাকি অংশটা ধরে।

### Universal load বনাম server load

```typescript
// src/routes/invoices/[id]/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const invoice = await db.invoice.findFirst({
    where: { id: params.id, ownerId: locals.user.id },
  });
  if (!invoice) error(404, "Not found");
  return { invoice };
};
```

```typescript
// src/routes/invoices/[id]/+page.ts — runs in the browser too
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data, fetch }) => {
  const rates = await fetch("/api/rates").then((r) => r.json());
  return { ...data, rates }; // `data` is what the server load returned
};
```

| | `+page.ts` (universal) | `+page.server.ts` (server) |
| --- | --- | --- |
| Browser-এ চলে | হ্যাঁ, client navigation-এ | কখনো না |
| Secret পড়তে পারে | না — এটা client-এ যায় | হ্যাঁ |
| Database ছুঁতে পারে | না | হ্যাঁ |
| Return value | যেকোনো কিছু, class-ও | `devalue` যা serialise করতে পারে: JSON, সঙ্গে `Date`, `Map`, `Set`, `BigInt`, `RegExp` |
| Promise stream করতে পারে | না | হ্যাঁ |

দুটিই থাকলে **server load আগে চলে**, আর তার ফলাফল universal load-এ আসে `data` হিসেবে। কীভাবে বাছবেন: যা থেকে
credential ফাঁস হতে পারে বা database connection খুলতে হয়, তা যাবে `.server.ts`-এ। বাকি সব `+page.ts`-এ। তাহলে
client-side navigation আপনার server ঘুরে round trip না করে সরাসরি সেটা fetch করতে পারে।

### Layout load আর `await parent()`

Layout-এর `load` তার নিচের প্রতিটি child route-এর জন্য চলে, আর তার data সেই children-এর `data`-র সঙ্গে মিশে যায়।
Children চাইলে এর জন্য অপেক্ষা করতে পারে:

```typescript
// src/routes/(app)/invoices/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent(); // from +layout.server.ts
  return { invoices: await db.invoice.findMany({ where: { ownerId: user.id } }) };
};
```

> ⚠️ `await parent()` হলো waterfall: একটি request আরেকটি শেষ হওয়ার জন্য বসে থাকে। Default-ভাবে layout আর page load
> চলে **একসঙ্গে**, আর parent-এর জন্য await করলে সেই সুবিধা চলে যায়। যত দেরিতে সম্ভব call করুন, parent-এর ওপর
> নির্ভর করে না এমন query-গুলো শুরু করে দেওয়ার পরে।

### ধীর promise stream করা

Server load value-র বদলে promise return করতে পারে। SvelteKit তখন page-এর বাকিটা সঙ্গে সঙ্গে পাঠিয়ে দেয়, আর promise
settle হলে ফলাফল stream করে:

```typescript
export const load: PageServerLoad = async ({ params }) => {
  return {
    comments: loadComments(params.slug), // not awaited — streams
    post: await loadPost(params.slug), // awaited — the page needs it
  };
};
```

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<article>{@html data.post.body}</article>

{#await data.comments}
  <p>Loading comments…</p>
{:then comments}
  <CommentList {comments} />
{:catch}
  <p>Comments are unavailable.</p>
{/await}
```

নিয়মটা হলো: **await করা data response আটকে রাখে, await না করা data রাখে না**। Page-এর shell রাখুন `await`-এর পেছনে,
আর ধীর সবকিছু রাখুন promise-এর পেছনে। একটি `{:catch}` রাখুন। না রাখলে stream হওয়া rejection error হিসেবে দেখা দেয়
দেরিতে, page render হয়ে যাওয়ার পরে।

### Load আবার চালানো

Load যার ওপর নির্ভর করে, তা বদলালে load আবার চলে। SvelteKit নজর রাখে `params`, `url` আর দেওয়া `fetch` দিয়ে fetch করা
যেকোনো URL-এর ওপর। অন্য কিছুর জন্য, যেমন custom client বা অন্য কোথাও হওয়া mutation, সেটা declare করুন:

```typescript
export const load: PageServerLoad = async ({ depends }) => {
  depends("app:invoices");
  return { invoices: await db.invoice.findMany() };
};
```

```typescript
import { invalidate, invalidateAll } from "$app/navigation";

await invalidate("app:invoices"); // re-run loads that declared this key
await invalidateAll(); // re-run everything — the blunt instrument
```

Default-ভাবে form action আপনার হয়ে সবকিছু invalidate করে দেয়। দেখুন
[Chapter ?? — SvelteKit Form Action](#ch-sveltekit-form-actions)।

## কখন ব্যবহার করবেন

| Data যদি হয়                                    | রাখুন                  |
| -------------------------------------------- | -------------------- |
| Database query                               | `+page.server.ts`    |
| API key-এর পেছনে                              | `+page.server.ts`    |
| এমন public API, যা browser নিজেই call করতে পারে | `+page.ts`           |
| একটি section-এর প্রতিটি route-এর লাগে            | `+layout.server.ts`  |
| ধীর, আর first paint-এর জন্য দরকার নেই            | Await না করা promise |
| App-এর বাইরের কিছুর জন্য JSON endpoint          | `+server.ts`         |

## সাধারণ ভুল

**❌ `+page.ts`-এ secret রাখা।** ওই file bundle হয়ে client-এ যায়। Private সবকিছু রাখুন `.server.ts` file-এ, যেটা
build client-এ পাঠাতে রাজি হয় না।

**❌ প্রতিটি load-এর শুরুতেই `await parent()`।** এতে যে request-গুলো একসঙ্গে চলতে পারত, সেগুলো একটির পর একটি চলে।
Value-টা সত্যিই যেখানে দরকার, শুধু সেখানে await করুন।

**❌ Server load-এ সবকিছু await করা।** সবচেয়ে ধীর query শেষ না হওয়া পর্যন্ত response শুরুই হতে পারে না। Shell-এর
যা লাগে তা await করুন, বাকিটা stream করুন।

**❌ `{:catch}` ছাড়া stream করা।** Reject হওয়া promise আসে page render হওয়ার পরে। Catch block না থাকলে সেটা UI-তে
কোনো message না হয়ে unhandled error হয়ে যায়।

**❌ Load-এর ভেতরে global `fetch` ব্যবহার করা।** `load`-এ যে fetch দেওয়া হয়, সেটা cookie বয়ে নেয়, relative URL
resolve করে, আর invalidation-এর জন্য SvelteKit-কে dependency-টা মনে রাখতে দেয়। Global-টা এর কোনোটাই করে না।

**❌ সব কিছুর জন্য `invalidateAll()`।** এটা page-এর প্রতিটি load আবার চালায়। `depends` আর একটি নাম দেওয়া key দিলে
আবার চলে শুধু যেটা বদলেছে সেটা।

## 🔑 মূল শিক্ষা

- Directory URL-এর নাম দেয়। File-এর নাম ঠিক করে code চলবে server-এ, browser-এ, নাকি দুটিতেই।
- Secret বা database connection-এর একমাত্র জায়গা `+page.server.ts`। এর return value-কে `devalue` serialisation পার হতে হবে।
- Layout আর page load একসঙ্গে চলে, তাই `await parent()` মানে জেনে-বুঝে বানানো waterfall।
- Server load থেকে await না করা promise return করলে সেটা page-এর পরে stream হয়।
- `load`-কে দেওয়া `fetch` ব্যবহার করুন — এটা cookie বয়ে নেয়, আর invalidation-এর জন্য দরকারি dependency রেকর্ড করে।

## Interview-এর প্রশ্ন

**Q: Data loading `+page.ts`-এ হবে নাকি `+page.server.ts`-এ, তা কী দিয়ে ঠিক হয়?**

Code নিরাপদে browser-এ যেতে পারে কি না, তা দিয়ে। `+page.ts` bundle হয়, আর পরের navigation-গুলোতে client-এ চলে।
তাই এতে secret রাখা বা database connection খোলা যায় না। `+page.server.ts` কখনো server ছেড়ে যায় না, তবে প্রতিটি client
navigation-এ একটি round trip লাগে। দুটিই থাকলে server load আগে চলে, আর SvelteKit তার ফলাফল universal load-কে দিয়ে দেয়।

**Q: SvelteKit load-এ streaming কীভাবে কাজ করে, আর tradeoff কী?**

Await করা value-র বদলে একটি promise return করুন। Await করা data তৈরি হলেই response শুরু হয়ে যায়। Promise-এর ফলাফল
stream হয়ে আসে পরে, আর `{#await}` সেটা render করে। Tradeoff হলো error handling আর header। Status code ততক্ষণে চলে
গেছে, তাই stream হওয়া rejection আর 500 হতে পারে না। সেটা markup-এই catch করতে হয়, এজন্যই `{:catch}` ঐচ্ছিক নয়।

**Q: Layout load session query করে বলে একটি page ধীর। কী দেখবেন?**

Page load নিজের কাজ শুরু করার আগেই `parent()`-এর জন্য await করছে কি না। Layout আর page load ইচ্ছে করেই একসঙ্গে চলে,
আর `await parent()` সেটাকে waterfall বানিয়ে দেয়। Parent-এর data লাগে না এমন সব query-র নিচে call-টা সরিয়ে দিন।
Query-টারই যদি session লাগে, তাহলে ভাবুন lookup-টা বরং hook দিয়ে `locals`-এ বসানো উচিত কি না।

**Q: Mutation-এর পর সবকিছু reload না করে একটি load কীভাবে আবার চালাবেন?**

Load-এ `depends('app:invoices')` দিয়ে একটি dependency key declare করুন, তারপর mutation-এর পরে
`invalidate('app:invoices')` call করুন। `invalidateAll()`-ও কাজ করে, কিন্তু সেটা page-এর প্রতিটি load আবার চালায়।
তখন একটি list বদলানোর দাম হয় পুরো এক দফা query।

## এরপর কী পড়বেন

- [Chapter ?? — SvelteKit Form Action](#ch-sveltekit-form-actions) — একই model-এর mutation-এর দিক
- [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching) — একই প্রশ্নের Next.js-এর উত্তর
- [Chapter ?? — Platform Deploy ও Preview Environment](#ch-platform-deploys) — এই load-গুলো আসলে কোথায় চলে
