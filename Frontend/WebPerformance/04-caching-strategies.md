---
title: Frontend Caching Strategies
part: 4
chapter: 0
slug: frontend-caching-strategies
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [caching, cache-control, etag, service-worker, react-query, performance]
in_book: true
---

# Frontend Caching Strategies {#ch-frontend-caching-strategies}

> Pick a cache lifetime you can defend per resource, and make sure a deploy can always invalidate it.

**In this chapter:** the four layers and who controls each · `Cache-Control` decisions · `ETag` and the 304 · content hashing as the enabler · service worker strategies · client-side data caches

## 💡 The Core Idea

Caching is one trade made repeatedly: **speed now against staleness later.** Every decision in this
chapter is choosing a point on that line for one specific resource, and the reason it is a senior topic
is that getting it wrong in the safe direction is invisible while getting it wrong in the unsafe
direction is a page nobody can fix without telling users to hard-refresh.

The rule that makes aggressive caching safe is **immutability by URL**. If a file's URL changes
whenever its content changes, you can cache it for a year with no risk, because the stale copy is
never requested again. If the URL is stable and the content is not, every cache lifetime is a bet on
how long you can tolerate the old version.

So the question is never "how long should I cache this". It is "can this URL's content ever change" —
and if it can, "how do I invalidate it".

## How It Works

### Four layers, and who controls each

```mermaid
flowchart LR
  A[Browser cache<br/>headers only] -->|miss| B[Service worker<br/>your code]
  B -->|miss| C[CDN edge<br/>headers + purge API]
  C -->|miss| D[(Origin)]
```

**Each layer is a chance to skip the next one — and a place a stale copy can hide.**

The control column is what matters in an interview. You configure the browser cache **entirely through
headers** and cannot reach into it — there is no purge. The CDN you can usually purge by API. The
service worker is code you wrote, which means it is the layer that can serve a stale application
forever if the update logic is wrong.

### `Cache-Control` decisions, per resource type

| Resource | Header | Reasoning |
| -------- | ------ | --------- |
| HTML document | `no-cache` | Must revalidate: it names the hashed assets |
| Hashed JS and CSS | `public, max-age=31536000, immutable` | The URL changes when the content does |
| Public API response | `public, max-age=300` | Tolerable staleness, big hit-rate win |
| User-specific data | `private, max-age=600` | Browser may cache; the shared CDN must not |
| Anything sensitive | `no-store` | Not written to disk anywhere |

Two headers are routinely confused. `no-cache` does **not** mean "do not cache" — it means "cache it,
but revalidate before every use". `no-store` is the one that means do not keep a copy. Using
`no-cache` for a bank statement is the mistake that follows from mixing them up.

`immutable` is the addition worth knowing: without it, a browser revalidates a long-cached asset on a
reload anyway, and `immutable` tells it not to bother.

### `ETag` turns a download into a 304

An `ETag` is a fingerprint of the response body. The browser sends it back and the server can answer
"unchanged" without resending anything.

```typescript
const etag = createHash("sha1").update(JSON.stringify(data)).digest("hex");

// The client already holds this exact body — answer 304 with no payload.
if (req.headers["if-none-match"] === etag) return res.status(304).end();
res.set("ETag", etag).json(data);
```

The round trip still happens, so this saves bandwidth rather than latency. That makes it right for
large responses that change rarely and wrong for small ones, where the request costs more than the
body it saves.

### Content hashing is what makes the year-long cache safe

```html
<!-- ❌ A query string. Some intermediaries strip or ignore it, and the path is unchanged -->
<link rel="stylesheet" href="styles.css?v=2" />

<!-- ✅ The hash is in the path, so new content is a genuinely new URL -->
<link rel="stylesheet" href="styles.a1b2c3.css" />
```

Every bundler emits this by default now — `[name].[hash].js` for entries and chunks and
`[name].[hash].[ext]` for assets. This is why the HTML must be `no-cache`: the document is the only
thing naming the hashed files, so a cached document means the browser keeps asking for last week's
bundle — a fully warm cache serving the application from before your deploy. The pattern is
**immutable assets, revalidated document.**

### Service worker strategies

A service worker is a programmable proxy. Four strategies cover nearly everything, and the choice is
"what is the cost of being one version behind".

| Strategy | Behaviour | Right for |
| -------- | --------- | --------- |
| **Cache first** | Cache, network only on miss | Hashed assets and fonts — they cannot go stale |
| **Network first** | Network, cache as fallback | Data where freshness matters more than speed |
| **Stale while revalidate** | Serve cache now, refresh in the background | Most content: instant, and current on next visit |
| **Network only** | Never cached | Anything sensitive or transactional |

```typescript
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  // Fall back to cache if the network has not answered in three seconds.
  new NetworkFirst({ cacheName: "api", networkTimeoutSeconds: 3 }),
);
```

Use a library rather than hand-writing the `fetch` handler. The failure mode of a hand-rolled service
worker is not a slow page — it is a cached shell that never updates, on every device that visited
once, and you cannot purge it from the server.
[Chapter ?? — Caching Strategies and Offline UX](#ch-caching-and-offline) covers the offline side and
the update lifecycle in full.

### Client-side data caching is a cache too

A data-fetching library is the fourth cache, and the one most frontend work actually touches.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // considered fresh: no refetch at all
      gcTime: 10 * 60 * 1000, // kept in memory while unused, then dropped
    },
  },
});
```

Those two options are different questions and get conflated constantly. `staleTime` is "how long
before I bother asking again". `gcTime` is "how long I keep an unused copy in memory". A `staleTime`
of zero with a long `gcTime` means instant renders from cache followed by a background refetch — which
is stale-while-revalidate, in the client.

> ⚠️ **Moving target:** React Query renamed `cacheTime` to `gcTime` in v5, and framework-level caching
> — Next.js in particular — has changed defaults across several majors. The durable principle is that
> a cache needs an explicit freshness window and an explicit invalidation trigger. Verify the current
> option names.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| Hashed JavaScript, CSS, images | `max-age=31536000, immutable` | The URL changes with the content |
| The HTML document | `no-cache` | It names the hashed assets |
| A large JSON response that rarely changes | `ETag` and revalidate | Saves the body, not the round trip |
| A small, frequently-changing response | No cache headers | Revalidation costs more than the payload |
| Per-user data behind a CDN | `private` | Or one user's data is served to another |
| An app that must work offline | Service worker, stale-while-revalidate | Instant, and current next visit |
| Server data in a React app | A query library with explicit `staleTime` | It also gives deduplication and invalidation |

## Common Mistakes

❌ **Caching the HTML alongside the assets.** Users keep loading the previous release from a warm
cache and no deploy fixes it.
✅ `no-cache` on the document, `immutable` on hashed assets.

❌ **`no-cache` for sensitive data.** It permits storing a copy; it only requires revalidation.
✅ `no-store` is the one that means do not keep it.

❌ **Query strings for cache busting.** Some intermediaries ignore them, so the path stays the same.
✅ Put the content hash in the filename.

❌ **A hand-written service worker.** The failure mode is a permanently stale shell you cannot purge.
✅ Use a maintained library and test the update path explicitly.

❌ **Treating `staleTime` and `gcTime` as the same setting.** One controls refetching, the other memory.
✅ Set both deliberately, and know which one you meant.

## 🔑 Key Takeaways

- Caching trades speed against staleness; content-hashed URLs are what make the aggressive end of that trade safe.
- The browser cache is controlled only by headers and cannot be purged — so never long-cache a URL whose content can change.
- `no-cache` means revalidate before use; `no-store` means keep no copy.
- Immutable assets with a revalidated HTML document is the pattern that lets a deploy take effect immediately.
- A service worker is code, which makes it the one layer that can serve a stale app forever.

## Interview Questions

**Q: How would you set cache headers for a single-page application?**

Content-hash every asset and serve those with `max-age=31536000, immutable`, then serve the HTML
document with `no-cache`. The document is the only thing naming the hashed files, so it has to be
revalidated on every load — cache it and users keep booting the previous release from a warm cache,
and no deploy reaches them. That pairing is what makes the year-long asset cache safe.

**Q: What is the difference between `no-cache` and `no-store`?**

`no-cache` allows a copy to be stored but requires revalidation before it is used, so a 304 still
saves the download. `no-store` forbids keeping a copy at all. The distinction matters because
`no-cache` on sensitive data still leaves it on disk, which is the mistake the naming invites.

**Q: When is an `ETag` not worth adding?**

On small, frequently-changing responses. The conditional request still costs a full round trip, so all
you save is the body — and if the body is 400 bytes you have spent a request to save almost nothing.
It pays on large responses that change rarely, where a 304 avoids re-sending a lot of data.

**Q: A user reports the app is stuck on an old version and a normal reload does not help. What is your first hypothesis?**

A service worker serving a cached shell without an update path — that is the one layer where a bug
persists on the user's device and cannot be purged from the server. Second hypothesis is the HTML
being cached with a long `max-age`, which produces the same symptom for the same reason. Both are
checked in seconds: look at what the document's cache headers actually are, and whether a service
worker is registered and how it handles activation.

## What to Read Next

- [Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting) — why vendor chunks and cache lifetime are the same argument
- [Chapter ?? — Caching Strategies and Offline UX](#ch-caching-and-offline) — the service worker update lifecycle in full
- [Chapter ?? — Caching](#ch-caching) — the same trade at the system-design layer
