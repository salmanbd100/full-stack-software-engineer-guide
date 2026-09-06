---
title: Data Fetching and Caching
part: 3
chapter: 0
slug: nextjs-data-and-caching
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [nextjs, caching, use-cache, cacheTag, revalidation, data-fetching]
in_book: true
---

# Data Fetching and Caching {#ch-nextjs-data-and-caching}

> Say exactly where a request goes, how long its answer lives, and what makes it wrong — before the first "why is this page stale" ticket.

**In this chapter:** fetching in a Server Component · request memoisation · `use cache` · lifetimes and tags · invalidation · waterfalls

## 💡 The Core Idea

Next.js 16 inverted the default. Data fetching is **dynamic unless you cache it on purpose**, and
caching is a directive you write next to the function that needs it. Versions 13 and 14 cached `fetch`
by default, which meant a large number of teams shipped a stale page without ever having typed the word
"cache" — the single most-reported problem with the App Router.

Everything else follows from thinking of a cache entry as a row with three columns: **a key**, **a
lifetime**, and **a tag you can use to delete it**. Miss any one and you have a caching bug with a
predictable shape. No key means every user shares one entry. No lifetime means it is stale forever. No
tag means the only way to fix it is a redeploy.

> ⚠️ **Moving target:** caching semantics changed in Next.js 15 and again in 16 —
> `unstable_cache` and `experimental.ppr` are gone, `cacheComponents` and `use cache` replace them. The
> durable principle is the three columns above: a key, a lifetime, and a way to invalidate on purpose.

## How It Works

### Fetch where the data is

A Server Component can query the database directly. There is no API layer to write, no round trip from
the browser, and no secret that has to reach the client.

```tsx
export default async function UsersPage() {
  const users = await db.user.findMany(); // runs on the server, ships no JavaScript
  return <UserList users={users} />;
}
```

A Route Handler is for consumers you do not control — a mobile client, a webhook, a third party.
Building one so a Server Component can call it is a round trip bought for nothing.

### Request memoisation

Within a single render pass, React deduplicates identical calls wrapped in `cache()`, and Next.js does
the same for identical `fetch` calls. Three components can each ask for the current user and only one
query runs.

```tsx
import { cache } from "react";

export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));
```

This is per-request, not a cache in the persistent sense. It exists so you can fetch data where it is
used instead of threading it through props, which is what makes deep component trees fetch sanely.

### `use cache` — caching on purpose

Enable it once, then mark what should be cached.

```typescript
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { cacheComponents: true };
export default nextConfig;
```

The directive works at three scopes: a function, a component, or a whole file where every export is
`async`.

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function getProduct(id: string) {
  "use cache";
  cacheLife("hours");           // how long the entry lives
  cacheTag("products", `product-${id}`); // how it gets invalidated
  return db.product.findUnique({ where: { id } });
}
```

**The key is derived for you**, from the function's identity, its serialisable arguments, the closure
values it captures, and the build ID. That last part means a deploy invalidates everything, and the
arguments part means `getProduct("a")` and `getProduct("b")` are separate entries without you writing a
key. It also means an argument you forgot to pass is an entry two users share.

### Lifetimes

`cacheLife` takes a named profile — `minutes`, `hours`, `days`, `weeks`, `max` — or an explicit object.

```tsx
cacheLife({
  stale: 3600,      // serve this entry while revalidating behind it
  revalidate: 7200, // how often to refresh in the background
  expire: 86400,    // after this, never serve it — fetch fresh
});
```

The three numbers answer three different questions, and conflating them is the usual source of "it
updated eventually but not when I expected". `stale` is what the user tolerates, `revalidate` is what
your origin tolerates, `expire` is your correctness ceiling.

### Invalidation

| Function                       | Effect                                                     | Use when                                     |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| `revalidateTag(tag, profile)`  | Marks stale; refreshes in the background                    | The next visitor can see fresh data           |
| `updateTag(tag)`               | Invalidates immediately — the same request sees fresh data  | The user who just made the change must see it |
| `revalidatePath(path)`         | Invalidates by route rather than by tag                     | A blunt instrument; prefer tags               |

```tsx
"use server";
import { updateTag } from "next/cache";

export async function updateProduct(id: string, data: FormData) {
  await db.product.update({ where: { id }, data: parse(data) });
  updateTag(`product-${id}`); // this user sees their own edit, not the cached copy
}
```

The distinction is a user-visible one. `revalidateTag` after a user edits their own profile means they
land back on the page and see the old name — which reads as a bug even though the cache is behaving.

### What cannot go inside a cache

`cookies()`, `headers()` and `searchParams` are unavailable inside `use cache`, and the reason is
structural: they are request data, and a cache entry must not depend on something absent from its key.

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

`"use cache: private"` exists for cases where that refactor is not possible, and produces a per-user
entry rather than a shared one. Reach for it knowingly, not to silence the error.

Non-deterministic values have the same problem in a quieter form: `Math.random()` and `Date.now()`
inside `use cache` run once, when the entry is created, and every later reader sees that frozen value.

### Waterfalls

The most expensive caching mistake is not a caching mistake at all. Three sequential `await`s cost the
sum of three round trips whether or not any of them is cached.

```tsx
// ❌ 300 ms, in series
const user = await getUser(id);
const posts = await getPosts(id);
const stats = await getStats(id);

// ✅ 100 ms, together
const [user, posts, stats] = await Promise.all([getUser(id), getPosts(id), getStats(id)]);
```

When the requests are genuinely independent and one is slow, do not wait at all: put the slow one behind
its own Suspense boundary and let the rest of the page render.

## When to Use It

| Situation                                       | Reach for                                          |
| ----------------------------------------------- | --------------------------------------------------- |
| Reading data for a page you control              | Fetch directly in the Server Component              |
| The same data needed by several components       | `cache()` and call it in each                       |
| Data that is the same for everyone               | `use cache` with a `cacheLife` profile              |
| Data that must reflect a mutation immediately    | `updateTag` in the action that changed it           |
| Data that can lag a little after a change        | `revalidateTag`                                     |
| Anything derived from a cookie or header         | Outside the cache, passed in as an argument         |
| An endpoint for a mobile app or a webhook        | A Route Handler                                     |

## Common Mistakes

**❌ No tag on a cached function.** It will be wrong at some point, and the only remedy left is waiting
for the lifetime to expire or shipping a deploy.

**❌ Caching per-user data under a shared tag.** One user's dashboard is served to another. If the value
varies by user, the user must be in the key — as an argument, not a cookie read inside the function.

**❌ `revalidateTag` where the user expects to see their own edit.** Background revalidation means the
redirect after saving still shows the old value. `updateTag` is the one that fixes it.

**❌ Fixing staleness with `dynamic = "force-dynamic"`.** It works, and it turns off caching for the
entire route including the parts that were correct. The bug was one missing tag; the fix cost the page
its static shell.

**❌ Sequential awaits that had no dependency on each other.** Cheap to fix, and usually the largest
number on the trace.

## 🔑 Key Takeaways

- Next.js 16 is dynamic by default; caching is opt-in with `use cache` and `cacheComponents`.
- Every cache entry needs a key, a lifetime and a tag — a missing one predicts the bug you will get.
- Cache keys derive automatically from arguments and closures, so per-user data must be passed in as an argument.
- `updateTag` refreshes within the same request; `revalidateTag` refreshes for the next visitor.
- Request memoisation is per-render deduplication, not a cache — it lets you fetch where the data is used.

## Interview Questions

**Q: Why can you not read `cookies()` inside a `use cache` function?**

Because the cache key is built from the function's arguments and closures, and a cookie is neither. An
entry that depended on a cookie would be stored under a key that does not mention it, so the first
user's data would be served to the second. The fix is to read the cookie in the calling component and
pass the value in, which puts it in the key.

**Q: `revalidateTag` or `updateTag`?**

Whether the person who triggered the change has to see the result. `updateTag` invalidates within the
same request, so a user who saves and is redirected sees their own edit. `revalidateTag` marks the entry
stale and refreshes it behind a stale-while-revalidate serve, which is right for content that other
people will read shortly but wrong for the user's own write.

**Q: A page is stale. How do you work out where?**

Walk the layers in order: is the function cached at all, what is its `cacheLife`, does it carry a tag,
does anything call `revalidateTag` for that tag, and is there a CDN in front holding its own copy. Each
layer has a different fix, and naming the layer is the answer — "I would turn off caching" is the answer
that says the layers were never separated.

**Q: When is a Route Handler the right place for a read, rather than a Server Component?**

When the caller is not your own rendering pass. A mobile client, a third-party integration, a webhook or
anything needing HTTP cache semantics on a GET is a Route Handler. Building one so that a Server
Component can call it adds a network hop, a serialisation step and an endpoint to secure, all to reach
data the component could have queried directly.

## What to Read Next

- [Chapter ?? — Rendering in Next.js](#ch-rendering-in-nextjs) — how cached and dynamic content share one route
- [Chapter ?? — Server Actions](#ch-server-actions) — where invalidation is actually called from
- [Chapter ?? — Frontend Caching Strategies](#ch-web-performance-caching-strategies) — the CDN layer sitting in front of all of this
