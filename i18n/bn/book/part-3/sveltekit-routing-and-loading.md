---
sourceHash: "86eccb35a38eb345c66e02339168cb89f9f558987822f813ea477a6072a8bd0e"
title: "SvelteKit-এ Routing ও Loading"
translatedAt: "2026-10-12T12:11:00.755Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SvelteKit-এ Routing ও Loading {#ch-sveltekit-routing-and-loading}

> একটি route-এর filename-গুলো পড়লেই আপনি জেনে যান কী server-এ চলে, কী browser-এ চলে, আর কী দুই জায়গাতেই চলে।

**এই অধ্যায়ে:** `+` file-গুলো · universal বনাম server `load` · layout আর `await parent()` · একটি ধীর promise stream করা · যা load করেছেন তা invalidate করা

## 💡 মূল ধারণা

SvelteKit 2 দুটি সিদ্ধান্ত filesystem-এ রাখে। **Directory** ঠিক করে URL। **Filename** ঠিক করে code
কোথায় চলবে।

`+page.svelte` হলো component। `+page.ts` প্রথম request-এর জন্য server-এ data load করে, আর তার পরের প্রতিটি
navigation-এ browser-এ। `+page.server.ts` শুধু server-এ data load করে। এই শেষ ভাগটাই একটি SvelteKit route-এর
পুরো security আর performance model। একটি directory listing-এই আপনি এটা দেখতে পান।

## কীভাবে কাজ করে

### `+` file-গুলো

| File               | কোথায় চলে                         | কীসের জন্য                                            |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `+page.svelte`     | Server, তারপর browser         | এই route-এর component                   |
| `+page.ts`         | Server আর browser           | যে data যেকোনো জায়গায় নিরাপদ — একটি public API call  |
| `+page.server.ts`  | শুধু server                  | Database query, secret, form action         |
| `+layout.svelte`   | Server, তারপর browser         | এই segment আর এর child-দের shared shell   |
| `+layout.server.ts` | শুধু server                  | প্রতিটি child-এর যে data লাগে — যেমন session       |
| `+server.ts`       | শুধু server                  | একটি HTTP endpoint, page নয়                    |
| `+error.svelte`    | Server, তারপর browser         | এই segment-এর error boundary             |

Route-গুলো directory অনুযায়ী nest হয়। `src/routes/(app)/invoices/[id]/+page.svelte` serve করে `/invoices/123`।
Bracket মানে parameter। Parenthesis-এর ভেতরের directory একটি **group**: এটা একটি layout ভাগ করে, কিন্তু URL-এ
দেখা যায় না। `[[lang]]` ঐচ্ছিক, আর `[...rest]` বাকি অংশটা ধরে।

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
| Return value | যেকোনো কিছু, class-সহ | `devalue` দিয়ে serialise করা যায় এমন: JSON, সঙ্গে `Date`, `Map`, `Set`, `BigInt`, `RegExp` |
| Promise stream করতে পারে | না | হ্যাঁ |

দুটোই থাকলে **server load আগে চলে**, আর তার ফলাফল universal load-এ `data` হিসেবে আসে।
কীভাবে বাছবেন: যা কোনো credential ফাঁস করতে পারে বা database connection খুলতে পারে, তা `.server.ts`-এ যায়।
বাকিটার জায়গা `+page.ts`-এ। তাহলে client-side navigation সেটা সরাসরি fetch করতে পারে, আপনার server ঘুরে
round trip ছাড়াই।

### Layout load আর `await parent()`

একটি layout-এর `load` তার নিচের প্রতিটি child route-এর জন্য চলে, আর এর data সেই child-দের `data`-তে মিশে যায়।
Child-রা এর জন্য অপেক্ষা করতে পারে:

```typescript
// src/routes/(app)/invoices/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent(); // from +layout.server.ts
  return { invoices: await db.invoice.findMany({ where: { ownerId: user.id } }) };
};
```

> ⚠️ `await parent()` একটি waterfall: একটি request আরেকটির শেষ হওয়ার অপেক্ষা করে। Layout আর page load default-ভাবে
> **parallel-এ** চলে, আর parent-এর জন্য await করলে সেটা ছেড়ে দিতে হয়। এটা যত দেরিতে সম্ভব call করুন, যেসব query এর
> ওপর নির্ভর করে না সেগুলো শুরু করার পরে।

### একটি ধীর promise stream করা

একটি server load value-এর বদলে একটি promise return করতে পারে। SvelteKit page-এর বাকি অংশ সঙ্গে সঙ্গে পাঠায়,
আর promise settle হলে ফলাফল stream করে:

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

নিয়ম: **await করা data response আটকে রাখে, await না করা data রাখে না**। Page-এর shell একটি `await`-এর পেছনে
রাখুন, আর ধীর সবকিছু একটি promise-এর পেছনে। একটি `{:catch}` রাখুন। এটা না থাকলে stream করা একটি rejection
দেরিতে error হিসেবে দেখা দেয়, page render হয়ে যাওয়ার পরে।

### একটি load আবার চালানো

Load যার ওপর নির্ভর করে তা বদলালে load আবার চলে। SvelteKit `params`, `url` আর দেওয়া `fetch` দিয়ে fetch করা
যেকোনো URL track করে। অন্য কিছুর জন্য, যেমন একটি custom client বা অন্য কোথাও একটি mutation, এটা declare করুন:

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

Default-ভাবে form action আপনার হয়ে সবকিছু invalidate করে। দেখুন
[Chapter ?? — SvelteKit Form Action](#ch-sveltekit-form-actions)।

## কখন ব্যবহার করবেন

| Data-টি                                  | কোথায় রাখবেন            |
| -------------------------------------------- | -------------------- |
| একটি database query                              | `+page.server.ts`    |
| একটি API key-এর পেছনে                             | `+page.server.ts`    |
| এমন public API, যেটা browser নিজেই call করতে পারে    | `+page.ts`           |
| একটি section-এর প্রতিটি route-এর লাগে            | `+layout.server.ts`  |
| ধীর, আর প্রথম paint-এর জন্য লাগে না          | Await না করা একটি promise |
| App-এর বাইরের কিছুর জন্য একটি JSON endpoint | `+server.ts`         |

## সাধারণ ভুল

**❌ `+page.ts`-এ একটি secret রাখা।** এই file bundle হয়ে পাঠানো হয়। Private যেকোনো কিছুর জায়গা একটি
`.server.ts` file-এ, যেটা build client-এ পাঠাতে অস্বীকার করে।

**❌ প্রতিটি load-এর একেবারে ওপরে `await parent()`।** যে request-গুলো একসঙ্গে চলতে পারত, সেগুলোকে এটা একটির পর
একটি চালায়। শুধু যেখানে value-টি সত্যিই লাগে, সেখানে await করুন।

**❌ Server load-এ সবকিছু await করা।** সবচেয়ে ধীর query শেষ না হওয়া পর্যন্ত response শুরু হতে পারে না।
Shell-এর যা লাগে তা await করুন, বাকিটা stream করুন।

**❌ `{:catch}` ছাড়া stream করা।** একটি rejected promise page render হওয়ার পরে আসে। Catch block ছাড়া এটা
UI-তে একটি message না হয়ে একটি unhandled error হয়ে যায়।

**❌ Load-এর ভেতরে global `fetch` ব্যবহার করা।** `load`-এ যেটা দেওয়া হয়, সেটা cookie বহন করে, relative URL
resolve করে, আর SvelteKit-কে invalidation-এর জন্য dependency track করতে দেয়। Global-টি এর কিছুই করে না।

**❌ সবকিছুর জন্য `invalidateAll()` ব্যবহার করা।** এটা page-এর প্রতিটি load আবার চালায়। `depends`, সঙ্গে একটি
নামযুক্ত key, শুধু যেটা বদলেছে সেটাই আবার চালায়।

## 🔑 মূল শিক্ষা

- Directory URL-এর নাম ঠিক করে। Filename ঠিক করে code server-এ, browser-এ, না দুই জায়গাতেই চলবে।
- Secret বা database connection-এর একমাত্র জায়গা `+page.server.ts`। এর return value-কে `devalue` serialisation-এ টিকে থাকতে হবে।
- Layout আর page load parallel-এ চলে, তাই `await parent()` একটি ইচ্ছাকৃত waterfall।
- Server load থেকে await না করা একটি promise return করলে সেটা page-এর পরে stream হয়।
- `load`-কে দেওয়া `fetch` ব্যবহার করুন — এটা cookie বহন করে, আর invalidation-এর যে dependency লাগে তা register করে।

## Interview-এর প্রশ্ন

**Q: Data loading `+page.ts`-এ হবে না `+page.server.ts`-এ, সেটা কী ঠিক করে?**

Code নিরাপদে browser-এ পৌঁছাতে পারে কিনা। `+page.ts` bundle হয়, আর পরের navigation-গুলোতে client-এ চলে,
তাই এটা secret রাখতে বা database connection খুলতে পারে না। `+page.server.ts` কখনো server ছাড়ে না, কিন্তু
প্রতিটি client navigation-এ একটি round trip খরচ করে। দুটোই থাকলে server load আগে চলে, আর SvelteKit তার
ফলাফল universal-টিকে দেয়।

**Q: SvelteKit load-এ streaming কীভাবে কাজ করে, আর tradeoff কী?**

Await করা value-এর বদলে একটি promise return করুন। Await করা data তৈরি হলেই response শুরু হয়।
Promise-এর ফলাফল পরে stream হয়ে আসে, আর `{#await}` সেটা render করে। Tradeoff হলো error handling
আর header। Status code আগেই পাঠানো হয়ে গেছে, তাই stream করা একটি rejection আর 500 হতে পারে না। আপনাকে এটা
markup-এ catch করতে হবে, আর এজন্যই `{:catch}` ঐচ্ছিক নয়।

**Q: একটি layout load session query করায় একটি page ধীর। আপনি কী দেখবেন?**

Page load নিজের কাজ শুরু করার আগে `parent()` await করছে কিনা। Layout আর page load design অনুযায়ীই parallel-এ
চলে, আর `await parent()` সেটাকে waterfall বানিয়ে দেয়। Parent-এর data লাগে না এমন সব query-র নিচে call-টি সরিয়ে
দিন। Query-টিরই যদি session লাগে, তাহলে প্রশ্ন করুন lookup-টির জায়গা বরং `locals`-এ কিনা, যেটা একটি hook set করে।

**Q: সবকিছু reload না করে একটি mutation-এর পর শুধু একটি load কীভাবে আবার চালাবেন?**

Load-এ `depends('app:invoices')` দিয়ে একটি dependency key declare করুন, তারপর mutation-এর পর
`invalidate('app:invoices')` call করুন। `invalidateAll()`-ও কাজ করে, কিন্তু এটা page-এর প্রতিটি load আবার
চালায়। তখন একটি বদলে যাওয়া list-এর জন্য পুরো এক দফা query খরচ হয়।

## এরপর কী পড়বেন

- [Chapter ?? — SvelteKit Form Action](#ch-sveltekit-form-actions) — একই model-এর mutation-এর অংশ
- [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching) — Next.js একই প্রশ্নের উত্তর কীভাবে দেয়
- [Chapter ?? — Platform Deploy ও Preview Environment](#ch-platform-deploys) — এই load-গুলো আসলে কোথায় চলে
