# Caching Strategies

## Overview

Caching means **saving copies of files so they don't get downloaded again**. A cached file loads instantly — no network, no wait.

> **Why It's Powerful:**
> The fastest request is the one you never make. Caching is often the single biggest performance win available.

---

## Table of Contents
- [The Caching Layers](#the-caching-layers)
- [HTTP Cache Headers](#http-cache-headers)
- [Cache Busting](#cache-busting)
- [Service Worker Strategies](#service-worker-strategies)
- [Client-Side Data Caching](#client-side-data-caching)
- [Interview Questions](#interview-questions)

---

## The Caching Layers

```
Browser cache         ← fastest, checked first
   ↓ (miss)
Service Worker cache  ← programmable, works offline
   ↓ (miss)
CDN edge server       ← close to the user
   ↓ (miss)
Origin server         ← slowest, last resort
```

> **Key Insight:**
> Each layer is a chance to skip a slow network request. Use the ones that fit your app.

---

## HTTP Cache Headers

The server tells the browser how long to cache a file. `Cache-Control` is the main header.

```typescript
import express, { type Request, type Response } from 'express';

const app = express();

// Hashed static assets never change at a given URL → cache for a year
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
}));

// API data → short cache, revalidate with ETag
app.get('/api/data', (req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(getData());
});
```

### 💡 **Common Patterns**

| Resource | `Cache-Control` | Meaning |
|----------|-----------------|---------|
| HTML pages | `no-cache` | Always revalidate before use |
| Hashed JS/CSS | `public, max-age=31536000, immutable` | Cache 1 year, never recheck |
| API responses | `public, max-age=300` | Cache 5 minutes |
| User-specific data | `private, max-age=600` | Browser only, not the CDN |
| Sensitive data | `no-store` | Never cache anywhere |

### 💡 **ETag — Revalidate Without Re-downloading**

An ETag is a fingerprint of the content. The browser asks "still valid?" and the server replies `304 Not Modified` if nothing changed — no body re-sent.

```typescript
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

function etagFor(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

app.get('/api/data', (req: Request, res: Response) => {
  const data = getData();
  const etag = etagFor(JSON.stringify(data));

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end(); // client already has this version
    return;
  }

  res.set('ETag', etag);
  res.json(data);
});
```

---

## Cache Busting

When a file changes, its URL must change so browsers fetch the new version. The reliable way is a **content hash in the filename**.

```html
<!-- ❌ Query strings: some proxies ignore them -->
<link rel="stylesheet" href="styles.css?v=2" />

<!-- ✅ Content hash: new content = new URL = guaranteed fresh fetch -->
<link rel="stylesheet" href="styles.abc123.css" />
```

Bundlers add the hash for you:

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]',
      },
    },
  },
};
```

> **Key Insight:**
> Content hashing lets you cache assets for a year safely — the URL itself changes whenever the file does.

---

## Service Worker Strategies

A Service Worker is a programmable proxy between your app and the network. It can serve cached responses and work offline.

| Strategy | Behavior | Best For |
|----------|----------|----------|
| **Cache First** | Cache → fall back to network | Static assets, fonts |
| **Network First** | Network → fall back to cache | Fresh API data, news |
| **Stale While Revalidate** | Serve cache, update in background | Most content |
| **Network Only** | Always network | Sensitive data |

**Stale-While-Revalidate** — instant response plus a background refresh:

```typescript
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        caches.open('v1').then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
      return cached ?? network; // serve cache now, freshen for next time
    }),
  );
});
```

### 💡 **Use Workbox in Real Projects**

Hand-written Service Workers are easy to get wrong. Google's Workbox gives you the strategies as one-liners:

```typescript
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api', networkTimeoutSeconds: 3 }),
);
```

---

## Client-Side Data Caching

For API data in React, a data-fetching library handles caching, deduplication, and revalidation for you. Prefer this over hand-rolled `Map`/`localStorage` caches.

```tsx
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000,      // keep unused data in memory for 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function UserProfile({ userId }: { userId: string }): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Loading />;
  return <Profile user={data} />;
}
```

> **Note:** In React Query v5, the old `cacheTime` option was renamed to `gcTime`.

---

## Interview Questions

**Q1: What are the main HTTP cache headers?**

`Cache-Control` (the main directive: `max-age`, `public`/`private`, `no-cache`/`no-store`, `immutable`), `ETag` (content fingerprint for revalidation), and `Last-Modified` (timestamp-based revalidation).

**Q2: Difference between `no-cache` and `no-store`?**

`no-cache` allows caching but forces revalidation with the server before each use. `no-store` forbids caching entirely — used for sensitive data.

**Q3: How do you cache aggressively but still ship updates?**

Put a content hash in the filename and serve it with `max-age=31536000, immutable`. When the file changes, the hash and URL change, so the browser fetches the new version automatically. HTML stays `no-cache` so it always points at the latest hashed assets.

**Q4: Name the Service Worker caching strategies and when to use each.**

Cache First (static assets), Network First (fresh API data), Stale-While-Revalidate (most content — instant plus background refresh), Network Only (sensitive data).

**Q5: How does an ETag save bandwidth?**

The browser sends the stored ETag in `If-None-Match`. If the content is unchanged, the server replies `304 Not Modified` with no body, so the browser reuses its cached copy — only headers travel over the wire.

**Q6: Why is cache invalidation hard?**

You must keep multiple layers (browser, Service Worker, CDN, app) consistent without serving stale data. Common tools: content hashing for assets, TTLs for data, versioned cache names in Service Workers, and CDN purges on deploy.

---

## Summary

| Layer | Caches | Configure With |
|-------|--------|----------------|
| Browser | Files | `Cache-Control` headers |
| Service Worker | Anything | Workbox strategies |
| CDN | Static files | CDN rules + headers |
| App | API data | React Query / SWR |

> **Remember:**
> - Content-hash static assets, then cache them for a year.
> - Keep HTML `no-cache`.
> - Pick a Service Worker strategy per resource type.
> - Let a data library handle client-side API caching.

---

[← Code Splitting](./03-code-splitting.md) | [Next: Image Optimization →](./05-image-optimization.md)
