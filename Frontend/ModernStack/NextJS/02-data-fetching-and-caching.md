---
title: Data Fetching and Caching
part: 3
chapter: 13
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

Next.js 16 flipped the default. Data fetching is **dynamic unless you cache it on purpose**, and caching
is a directive you write next to the function that needs it. Versions 13 and 14 cached `fetch` by
default. So many teams shipped a stale page without ever typing the word "cache". It was the most
reported problem with the App Router.

Everything else follows if you think of a cache entry as a row with three columns: **a key**, **a
lifetime**, and **a tag you can use to delete it**. Miss any one and you get a caching bug with a
predictable shape. No key means every user shares one entry. No lifetime means it is stale forever. No
tag means the only way to fix it is a redeploy.

> ⚠️ **Moving target:** caching rules changed in Next.js 15 and again in 16. `unstable_cache` and
> `experimental.ppr` are gone, and `cacheComponents` and `use cache` replace them. The lasting principle
> is the three columns above: a key, a lifetime, and a way to invalidate on purpose.

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

A Route Handler is for callers you do not control, such as a mobile client, a webhook or a third
party. Building one just so a Server Component can call it adds a round trip for nothing.

### Request memoisation

Within a single render pass, React deduplicates identical calls wrapped in `cache()`, and Next.js does
the same for identical `fetch` calls. Three components can each ask for the current user and only one
query runs.

```tsx
import { cache } from "react";

export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));
```

This is per-request, not a lasting cache. It lets you fetch data where it is used instead of passing it
down through props. That is what keeps data fetching sane in deep component trees.

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

**Next.js builds the key for you** from the function's identity, its serialisable arguments, the
closure values it captures, and the build ID. The build ID means a deploy invalidates everything. The
arguments mean `getProduct("a")` and `getProduct("b")` are separate entries, and you write no key. It
also means that if you forget to pass an argument, two users share one entry.

### Lifetimes

`cacheLife` takes a named profile — `minutes`, `hours`, `days`, `weeks`, `max` — or an explicit object.

```tsx
cacheLife({
  stale: 3600,      // serve this entry while revalidating behind it
  revalidate: 7200, // how often to refresh in the background
  expire: 86400,    // after this, never serve it — fetch fresh
});
```

The three numbers answer three different questions. Mixing them up is the usual cause of "it updated
in the end, but not when I expected". `stale` is what the user tolerates. `revalidate` is what your
origin tolerates. `expire` is the limit beyond which the data is simply wrong.

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

The user can see the difference. Call `revalidateTag` after a user edits their own profile, and they
land back on the page and see the old name. That looks like a bug, even though the cache is working.

### What cannot go inside a cache

`cookies()`, `headers()` and `searchParams` are not available inside `use cache`. They are request
data, and a cache entry must not depend on something that is not in its key.

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

`"use cache: private"` is for cases where that refactor is not possible. It makes a per-user entry
instead of a shared one. Use it on purpose, not to silence the error.

Values that change on every call have the same problem in a quieter form. `Math.random()` and
`Date.now()` inside `use cache` run once, when the entry is created. Every later reader sees that value.

### Waterfalls

The most expensive caching mistake is not a caching mistake at all. It is a waterfall: requests that
wait for each other. Three sequential `await`s cost three round trips, cached or not.

```tsx
// ❌ 300 ms, in series
const user = await getUser(id);
const posts = await getPosts(id);
const stats = await getStats(id);

// ✅ 100 ms, together
const [user, posts, stats] = await Promise.all([getUser(id), getPosts(id), getStats(id)]);
```

When the requests are truly independent and one is slow, do not wait at all. Put the slow one behind
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

**❌ No tag on a cached function.** It will be wrong at some point. Then the only fixes left are to wait
for the lifetime to expire or to ship a deploy.

**❌ Caching per-user data under a shared tag.** One user's dashboard is served to another. If the value
varies by user, the user must be in the key. Pass it as an argument, not a cookie read inside.

**❌ `revalidateTag` where the user expects to see their own edit.** Background revalidation means the
redirect after saving still shows the old value. `updateTag` is the one that fixes it.

**❌ Fixing staleness with `dynamic = "force-dynamic"`.** It works, but it turns off caching for the
whole route, including the parts that were correct. The bug was one missing tag. The fix cost the page
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

The cache key is built from the function's arguments and closures, and a cookie is neither. An entry
that depended on a cookie would sit under a key that does not mention it. The first user's data would
then be served to the second. The fix is to read the cookie in the calling component and pass the value
in. That puts it in the key.

**Q: `revalidateTag` or `updateTag`?**

It depends on whether the person who made the change must see the result. `updateTag` invalidates
within the same request, so a user who saves and is redirected sees their own edit. `revalidateTag`
marks the entry stale and refreshes it in the background while serving the old copy. That is right for
content other people will read soon, but wrong for the user's own write.

**Q: A page is stale. How do you work out where?**

Walk the layers in order. Is the function cached at all? What is its `cacheLife`? Does it carry a tag?
Does anything call `revalidateTag` for that tag? Is a CDN in front holding its own copy? Each layer has a
different fix, and naming the layer is the answer. "I would turn off caching" shows you never separated
the layers.

**Q: When is a Route Handler the right place for a read, rather than a Server Component?**

When the caller is not your own rendering pass. A mobile client, a third-party integration, a webhook,
or anything that needs HTTP caching on a GET gets a Route Handler. Building one for a Server Component
to call adds a network hop, a serialisation step and an endpoint to secure. All that to reach data the
component could have queried directly.

## What to Read Next

- [Chapter ?? — Rendering in Next.js](#ch-rendering-in-nextjs) — how cached and dynamic content share one route
- [Chapter ?? — Server Actions](#ch-server-actions) — where invalidation is actually called from
- [Chapter ?? — Caching and Asset Delivery](#ch-asset-delivery) — the CDN layer sitting in front of all of this
