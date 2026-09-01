---
title: Offline Patterns and Caching Strategies
part: 2
chapter: 0
slug: offline-patterns
level: advanced # beginner | intermediate | advanced
reading_time: 38
updated: 2026-08-28
tags: [frontend, pwa, offline, patterns]
in_book: true
---

# Offline Patterns and Caching Strategies {#ch-offline-patterns}

> Pick a caching strategy per request type, and know what each one serves when the network is gone.

**In this chapter:** cache first · network first · stale-while-revalidate · cache only and network only · the offline page · IndexedDB for data · Workbox

## Overview

Offline support is what makes PWAs truly special. This guide covers caching strategies, offline patterns, and tools that enable seamless offline experiences. Understanding these patterns is essential for building robust PWAs and is a critical interview topic.

---

## Table of Contents

- [Strategy Overview](#strategy-overview)
- [Cache First](#cache-first)
- [Network First](#network-first)
- [Stale-While-Revalidate](#stale-while-revalidate)
- [Cache Only](#cache-only)
- [Network Only](#network-only)
- [Offline Page Pattern](#offline-page-pattern)
- [Workbox Library](#workbox-library)
- [IndexedDB for Offline Data](#indexeddb-for-offline-data)
- [Error Handling & Retry Logic](#error-handling--retry-logic)
- [Interview Questions](#interview-questions)

---

## Strategy Overview

### 💡 **The Five Caching Strategies**

| Strategy | Speed | Freshness | Offline | Best For |
|----------|-------|-----------|---------|----------|
| **Cache First** | Fastest | May be stale | Works perfectly | Static assets (CSS, JS, images) |
| **Network First** | Slower | Always fresh | Works if cached | API calls, dynamic content |
| **Stale-While-Revalidate** | Fast | Eventually fresh | Works with cache | Images, fonts, non-critical data |
| **Cache Only** | Fastest | Never updates | Always works | Versioned/immutable assets |
| **Network Only** | Varies | Always fresh | Fails | Real-time data, authentication |

---

### 💡 **Strategy Selection Guide**

| Question | If YES | If NO |
|----------|--------|-------|
| Is this a static asset? | Cache First | Continue |
| Must data always be fresh? | Network First | Continue |
| Can content be eventually fresh? | Stale-While-Revalidate | Continue |
| Is this versioned/immutable? | Cache Only | Continue |
| Is this real-time critical? | Network Only | Stale-While-Revalidate |

**Decision Flowchart:**

```text
Is this a static asset?
├── YES → Cache First
└── NO → Does user need fresh data?
         ├── YES → Network First (critical) or SWR (non-critical)
         └── NO → Is it versioned/immutable?
                  ├── YES → Cache Only
                  └── NO → Stale-While-Revalidate
```

**Key Insight:**
> Most PWAs use a combination of strategies - Cache First for assets, Network First for APIs, and Stale-While-Revalidate for images and fonts.

---

## Cache First

### 💡 **What is Cache First?**

Check cache first, only fetch from network if not cached.

**How It Works:**

```text
Request → Check Cache
          ├── Found → Return cached response
          └── Not Found → Fetch from network
                          ├── Success → Cache & return
                          └── Fail → Return error
```

---

### 💡 **When to Use**

| Use For | Avoid For |
|---------|-----------|
| ✅ CSS and JavaScript files | ❌ Dynamic content |
| ✅ Images and icons | ❌ Real-time data |
| ✅ Fonts | ❌ User-specific content |
| ✅ Static HTML pages | ❌ API responses |
| ✅ Offline-first apps | ❌ Frequently changing data |

---

### 💡 **Basic Implementation**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  event.respondWith(
    caches
      .match(event.request)
      .then(async (cached: Response | undefined): Promise<Response> => {
        // Return the cached version if there is one
        if (cached !== undefined) return cached;

        const response: Response = await fetch(event.request);

        // Never cache an error response — it would poison the cache
        if (response.status !== 200) return response;

        // Clone before returning: a body can only be read once
        const copy: Response = response.clone();
        const cache: Cache = await caches.open('static-v1');
        void cache.put(event.request, copy);

        return response;
      })
      .catch(
        async (): Promise<Response> =>
          (await caches.match('/offline.html')) ?? new Response('Offline', { status: 503 }),
      ),
  );
});
```

---

### 💡 **Production Pattern**

```typescript
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'static-v1';
const PRECACHE_URLS: readonly string[] = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/images/logo.png',
];

// Precache during install
self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache: Cache): Promise<void> => cache.addAll([...PRECACHE_URLS])),
  );
  void self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches
      .keys()
      .then((names: string[]): Promise<boolean[]> =>
        Promise.all(names.filter((name: string): boolean => name !== CACHE_NAME).map((name: string) => caches.delete(name))),
      )
      .then((): Promise<void> => self.clients.claim()),
  );
});

// Cache First for static asset types
const STATIC_DESTINATIONS: readonly RequestDestination[] = ['style', 'script', 'image'];

self.addEventListener('fetch', (event: FetchEvent): void => {
  const { destination } = event.request;
  const url = new URL(event.request.url);
  const isStatic: boolean = STATIC_DESTINATIONS.includes(destination) || url.pathname.endsWith('.woff2');
  if (!isStatic) return;

  event.respondWith(
    caches.match(event.request).then(async (cached: Response | undefined): Promise<Response> => {
      if (cached !== undefined) return cached;

      const fetched: Response = await fetch(event.request);
      if (fetched.ok) {
        const cache: Cache = await caches.open(CACHE_NAME);
        void cache.put(event.request, fetched.clone());
      }
      return fetched;
    }),
  );
});
```

---

## Network First

### 💡 **What is Network First?**

Try network first, fall back to cache if network fails.

**How It Works:**

```text
Request → Try Network
          ├── Success → Cache & return
          └── Fail → Check Cache
                     ├── Found → Return cached
                     └── Not Found → Return error
```

---

### 💡 **When to Use**

| Use For | Avoid For |
|---------|-----------|
| ✅ API calls | ❌ Static assets |
| ✅ User profiles | ❌ Rarely-changing content |
| ✅ Fresh content | ❌ Performance-critical paths |
| ✅ Social feeds | ❌ Large files |
| ✅ Frequently changing data | ❌ Bandwidth-sensitive scenarios |

---

### 💡 **Basic Implementation**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  event.respondWith(
    fetch(event.request)
      .then(async (response: Response): Promise<Response> => {
        if (response.status !== 200) return response;

        // Cache the successful response for the next offline read
        const copy: Response = response.clone();
        const cache: Cache = await caches.open('api-v1');
        void cache.put(event.request, copy);

        return response;
      })
      .catch(
        // Network failed — fall back to whatever the cache still holds
        async (): Promise<Response> =>
          (await caches.match(event.request)) ?? new Response('Offline', { status: 503 }),
      ),
  );
});
```

---

### 💡 **With Timeout**

Prevents long waits on slow networks.

```typescript
declare const self: ServiceWorkerGlobalScope;

// "Offline" and "on a train with one bar" are different failures. Only a
// timeout catches the second one
async function fetchWithTimeout(request: Request, timeout = 3000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout((): void => controller.abort(), timeout);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

self.addEventListener('fetch', (event: FetchEvent): void => {
  if (!event.request.url.includes('/api/')) return;

  event.respondWith(
    fetchWithTimeout(event.request, 3000)
      .then(async (response: Response): Promise<Response> => {
        const cache: Cache = await caches.open('api-v1');
        void cache.put(event.request, response.clone());
        return response;
      })
      .catch(
        async (): Promise<Response> =>
          (await caches.match(event.request)) ?? new Response('Offline', { status: 503 }),
      ),
  );
});
```

**Key Insight:**
> Always add a timeout to Network First strategies. Users shouldn't wait indefinitely on slow networks - 3 seconds is a good default.

---

## Stale-While-Revalidate

### 💡 **What is Stale-While-Revalidate?**

Return cached content immediately, then update cache in background.

**How It Works:**

```text
Request → Check Cache
          ├── Found → Return cached (immediately)
          │           └── Fetch in background → Update cache
          └── Not Found → Fetch from network
                          └── Cache & return
```

---

### 💡 **When to Use**

| Use For | Why |
|---------|-----|
| ✅ Images | Fast display, eventual freshness |
| ✅ Fonts | Rarely change, speed matters |
| ✅ Non-critical data | User experience over freshness |
| ✅ Social feeds | Show something immediately |
| ✅ Avatars and thumbnails | Speed is more important |

**Benefits:**

- Fast (serves cached immediately)
- Eventually fresh (updates in background)
- Works offline (has cached version)
- Best user experience for most content

---

### 💡 **Basic Implementation**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  event.respondWith(
    caches.match(event.request).then((cached: Response | undefined): Response | Promise<Response> => {
      // Start the refresh, but do not block on it
      const fetchPromise: Promise<Response> = fetch(event.request).then(
        async (response: Response): Promise<Response> => {
          if (response.status === 200) {
            const cache: Cache = await caches.open('swr-cache');
            void cache.put(event.request, response.clone());
          }
          return response;
        },
      );

      // Cached answer now; the network result lands in the cache for next time
      return cached ?? fetchPromise;
    }),
  );
});
```

---

### 💡 **With Update Notification**

Notify clients when content is updated.

```typescript
declare const self: ServiceWorkerGlobalScope;

interface CacheUpdated {
  type: 'CACHE_UPDATED';
  url: string;
}

self.addEventListener('fetch', (event: FetchEvent): void => {
  if (event.request.destination !== 'image') return;

  event.respondWith(
    caches.match(event.request).then((cached: Response | undefined): Response | Promise<Response> => {
      const fetchPromise: Promise<Response> = fetch(event.request)
        .then(async (response: Response): Promise<Response> => {
          if (response.status !== 200) return response;

          const cache: Cache = await caches.open('images-v1');
          await cache.put(event.request, response.clone());

          // Tell every open page the cached copy has moved on
          const clients: readonly Client[] = await self.clients.matchAll();
          for (const client of clients) {
            client.postMessage({ type: 'CACHE_UPDATED', url: event.request.url } satisfies CacheUpdated);
          }

          return response;
        })
        .catch((): Response => cached ?? new Response('Offline', { status: 503 }));

      return cached ?? fetchPromise;
    }),
  );
});
```

**Client-Side Handler:**

```typescript
navigator.serviceWorker.addEventListener('message', (event: MessageEvent<CacheUpdated>): void => {
  if (event.data.type === 'CACHE_UPDATED') {
    console.log('Updated:', event.data.url);
    // The page can now swap the stale image for the fresh one
  }
});
```

---

## Cache Only

### 💡 **What is Cache Only?**

Only serve from cache, never fetch from network.

**How It Works:**

```text
Request → Check Cache
          ├── Found → Return cached
          └── Not Found → Return error (404)
```

---

### 💡 **When to Use**

| Use For | Avoid For |
|---------|-----------|
| ✅ Offline-first apps | ❌ Content that needs updates |
| ✅ Versioned assets (app-v1.js) | ❌ Third-party resources |
| ✅ Bundled static content | ❌ Dynamic data |
| ✅ Immutable files | ❌ User-generated content |

---

### 💡 **Implementation**

```typescript
declare const self: ServiceWorkerGlobalScope;

// Precache during install
self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches
      .open('static-v1')
      .then((cache: Cache): Promise<void> =>
        cache.addAll(['/static-v1/app.js', '/static-v1/style.css', '/static-v1/icon.png']),
      ),
  );
});

// Cache Only — safe because the URL itself carries the version, so a hit can
// never be stale and a miss is a genuine build error
self.addEventListener('fetch', (event: FetchEvent): void => {
  if (!event.request.url.includes('/static-v1/')) return;

  event.respondWith(
    caches
      .match(event.request)
      .then((cached: Response | undefined): Response => cached ?? new Response('Not in cache', { status: 404 })),
  );
});
```

**Key Insight:**
> Cache Only works best with versioned URLs (e.g., `/app.abc123.js`). When content changes, the URL changes, triggering a new cache entry.

---

## Network Only

### 💡 **What is Network Only?**

Always fetch from network, never use cache.

**How It Works:**

```text
Request → Fetch from network
          ├── Success → Return response
          └── Fail → Return error
```

---

### 💡 **When to Use**

| Use For | Avoid For |
|---------|-----------|
| ✅ Real-time data | ❌ Offline support |
| ✅ Authentication | ❌ Static assets |
| ✅ Streaming content | ❌ Performance-critical paths |
| ✅ Data that must be fresh | ❌ Frequently accessed content |
| ✅ Analytics and logging | ❌ Poor connectivity scenarios |

---

### 💡 **Implementation**

```typescript
declare const self: ServiceWorkerGlobalScope;

const NEVER_CACHE: readonly string[] = ['/api/real-time/', '/api/auth/'];

self.addEventListener('fetch', (event: FetchEvent): void => {
  // Network Only — a stale auth response is worse than no response
  const isLive: boolean = NEVER_CACHE.some((path: string): boolean => event.request.url.includes(path));
  if (!isLive) return;

  event.respondWith(
    fetch(event.request).catch((): Response => new Response('Offline', { status: 503 })),
  );
});
```

---

## Offline Page Pattern

### 💡 **What is the Offline Page Pattern?**

Display a custom offline page when network fails and content isn't cached.

**How It Works:**

```text
Navigation Request → Try network
                     ├── Success → Cache page & return
                     └── Fail → Try cache
                               ├── Found → Return cached page
                               └── Not Found → Return offline.html
```

---

### 💡 **Offline Page Template**

```html
<!-- offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline</title>
  <style>
    body {
      font-family: -apple-system, system-ui, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 { color: #333; margin-bottom: 0.5rem; }
    p { color: #666; }
    button {
      background: #3367D6;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
    }
    button:hover { background: #2557c6; }
    #cached-pages { text-align: left; margin-top: 1rem; }
    #cached-pages a { color: #3367D6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>Check your internet connection and try again.</p>
    <div id="cached-pages"></div>
    <button onclick="location.reload()">Try Again</button>
  </div>

  <script>
    async function showCachedPages() {
      const cache = await caches.open('pages-v1');
      const requests = await cache.keys();

      if (requests.length === 0) return;

      const list = document.getElementById('cached-pages');
      list.innerHTML = '<p><strong>Available offline:</strong></p><ul></ul>';
      const ul = list.querySelector('ul');

      requests.forEach(request => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = request.url;
        a.textContent = new URL(request.url).pathname || 'Home';
        li.appendChild(a);
        ul.appendChild(li);
      });
    }

    showCachedPages();
  </script>
</body>
</html>
```

---

### 💡 **Service Worker Integration**

```typescript
declare const self: ServiceWorkerGlobalScope;

// Cache the offline page during install
self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(caches.open('pages-v1').then((cache: Cache): Promise<void> => cache.add('/offline.html')));
});

// Serve it when a navigation fails
self.addEventListener('fetch', (event: FetchEvent): void => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then(async (response: Response): Promise<Response> => {
        if (response.status === 200) {
          const cache: Cache = await caches.open('pages-v1');
          void cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(
        async (): Promise<Response> =>
          (await caches.match('/offline.html')) ?? new Response('Offline', { status: 503 }),
      ),
  );
});
```

---

## Workbox Library

### 💡 **What is Workbox?**

Google's library that simplifies common PWA patterns.

| Feature | Benefit |
|---------|---------|
| **Precaching** | Automatic asset versioning |
| **Runtime Caching** | Easy cache strategies |
| **Background Sync** | Queue failed requests |
| **Navigation Preload** | Faster page loads |
| **Expiration** | Auto-cleanup old caches |
| **Routing** | Route-based caching |

---

### 💡 **Installation**

```bash
# npm
npm install workbox-cli --save-dev

# Or use CDN in service worker
importScripts('https://storage.googleapis.com/workbox-cdn/releases/latest/workbox-sw.js');
```

---

### 💡 **Precaching with Workbox**

```typescript
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Precache manifest — the build injects the real revisions
precacheAndRoute([
  { url: '/index.html', revision: 'abc123' },
  { url: '/styles.css', revision: 'def456' },
  { url: '/app.js', revision: 'ghi789' },
]);

// Drop precaches from earlier builds
cleanupOutdatedCaches();
```

---

### 💡 **Runtime Caching Strategies**

```typescript
import { registerRoute, type RouteMatchCallbackOptions } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Images — Cache First with expiry
registerRoute(
  ({ request }: RouteMatchCallbackOptions): boolean => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

// API calls — Network First with a timeout
registerRoute(
  ({ url }: RouteMatchCallbackOptions): boolean => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api',
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 })],
  }),
);

// CSS and JS — Stale-While-Revalidate
registerRoute(
  ({ request }: RouteMatchCallbackOptions): boolean =>
    request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({ cacheName: 'static' }),
);
```

---

### 💡 **Manual vs Workbox Comparison**

**❌ Without Workbox (verbose):**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches.open('v1').then((cache: Cache): Promise<void> => cache.addAll(['/index.html', '/app.js', '/style.css'])),
  );
});

self.addEventListener('fetch', (event: FetchEvent): void => {
  event.respondWith(
    caches
      .match(event.request)
      .then((cached: Response | undefined): Response | Promise<Response> => cached ?? fetch(event.request)),
  );
});
```

**✅ With Workbox (concise):**

```typescript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, type RouteMatchCallbackOptions } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

precacheAndRoute([
  { url: '/index.html', revision: 'abc123' },
  { url: '/app.js', revision: 'def456' },
]);

registerRoute(
  ({ request }: RouteMatchCallbackOptions): boolean => request.destination === 'image',
  new CacheFirst(),
);
```

---

### 💡 **Webpack Integration**

```typescript
// webpack.config.ts
import { InjectManifest } from 'workbox-webpack-plugin';
import type { Configuration } from 'webpack';

const config: Configuration = {
  plugins: [
    new InjectManifest({
      swSrc: './src/sw.ts',
      swDest: 'sw.js',
      globDirectory: 'dist',
      globPatterns: ['**/*.{js,css,html,png}'],
      // Anything larger is served from the network. Precaching a 10 MB bundle
      // costs the user that download before the app is usable
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    }),
  ],
};

export default config;
```

---

## IndexedDB for Offline Data

### 💡 **Cache API vs IndexedDB**

| Feature | Cache API | IndexedDB |
|---------|-----------|-----------|
| **Purpose** | HTTP responses | Structured data |
| **Data Type** | Request/Response | JSON objects |
| **Queryable** | By URL only | Full querying |
| **Best For** | Offline pages, assets | App data, lists |
| **Transactions** | No | Full ACID |

---

### 💡 **When to Use IndexedDB**

| Use For | Avoid For |
|---------|-----------|
| ✅ Offline data storage | ❌ Small amounts of data (use localStorage) |
| ✅ Large datasets | ❌ Binary files (use Cache API) |
| ✅ Structured data | ❌ Simple key-value pairs |
| ✅ Complex queries | ❌ HTTP response caching |

---

### 💡 **Basic IndexedDB Pattern**

```typescript
interface Todo {
  id?: number;
  title: string;
  done: boolean;
}

interface User {
  id: string;
  email: string;
}

// IndexedDB is event-based. One promisify helper removes most of the noise
function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject): void => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

function initDB(): Promise<IDBDatabase> {
  const request: IDBOpenDBRequest = indexedDB.open('myapp-db', 1);

  // Schema changes only ever happen here, and only on a version bump
  request.onupgradeneeded = (): void => {
    const db: IDBDatabase = request.result;

    if (!db.objectStoreNames.contains('todos')) {
      db.createObjectStore('todos', { keyPath: 'id', autoIncrement: true });
    }

    if (!db.objectStoreNames.contains('users')) {
      const userStore: IDBObjectStore = db.createObjectStore('users', { keyPath: 'id' });
      userStore.createIndex('email', 'email', { unique: true });
    }
  };

  return promisify(request);
}

async function addTodo(todo: Todo): Promise<IDBValidKey> {
  const db: IDBDatabase = await initDB();
  const store: IDBObjectStore = db.transaction('todos', 'readwrite').objectStore('todos');
  return promisify(store.add(todo));
}

async function getAllTodos(): Promise<Todo[]> {
  const db: IDBDatabase = await initDB();
  const store: IDBObjectStore = db.transaction('todos', 'readonly').objectStore('todos');
  return promisify<Todo[]>(store.getAll());
}

async function getUserByEmail(email: string): Promise<User | undefined> {
  const db: IDBDatabase = await initDB();
  const store: IDBObjectStore = db.transaction('users', 'readonly').objectStore('users');
  return promisify<User | undefined>(store.index('email').get(email));
}

async function deleteTodo(id: number): Promise<void> {
  const db: IDBDatabase = await initDB();
  const store: IDBObjectStore = db.transaction('todos', 'readwrite').objectStore('todos');
  await promisify(store.delete(id));
}
```

**Key Insight:**
> Use Cache API for HTTP responses and IndexedDB for app data. They work together - Service Worker caches pages while IndexedDB stores user data that syncs to the server.

---

## Error Handling & Retry Logic

### 💡 **Exponential Backoff**

Retry failed requests with increasing delays.

```typescript
declare const self: ServiceWorkerGlobalScope;

async function fetchWithRetry(request: Request, maxRetries = 3, initialDelay = 1000): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(request);
    } catch (error: unknown) {
      if (i === maxRetries - 1) throw error; // Final attempt failed

      // Exponential backoff — 1s, 2s, 4s. Retrying flat-out just adds load
      const delay: number = initialDelay * 2 ** i;
      await new Promise<void>((resolve): void => {
        setTimeout(resolve, delay);
      });
    }
  }
  throw new Error('unreachable');
}

// Usage in the worker
self.addEventListener('fetch', (event: FetchEvent): void => {
  if (!event.request.url.includes('/api/')) return;

  event.respondWith(
    fetchWithRetry(event.request, 3, 1000).catch(
      async (): Promise<Response> =>
        (await caches.match(event.request)) ?? new Response('Failed', { status: 503 }),
    ),
  );
});
```

**Retry Timing:**

| Attempt | Delay |
|---------|-------|
| 1st | 1 second |
| 2nd | 2 seconds |
| 3rd | 4 seconds |
| Final | Fail |

---

### 💡 **Request Queue for Offline**

Queue requests when offline, retry when online.

```typescript
interface QueuedMeta {
  queued: string;
  url: string;
  method: string;
}

class RequestQueue {
  private readonly cacheName: string;

  constructor(cacheName = 'request-queue') {
    this.cacheName = cacheName;
  }

  async enqueue(request: Request): Promise<void> {
    const cache: Cache = await caches.open(this.cacheName);
    const meta: QueuedMeta = {
      queued: new Date().toISOString(),
      url: request.url,
      method: request.method,
    };
    await cache.put(request, new Response(JSON.stringify(meta)));
  }

  async dequeue(): Promise<void> {
    const cache: Cache = await caches.open(this.cacheName);
    const keys: readonly Request[] = await cache.keys();

    for (const request of keys) {
      try {
        const response: Response = await fetch(request);
        if (response.ok) await cache.delete(request);
      } catch {
        // Still offline. Stop, or the rest of the queue burns retries too
        break;
      }
    }
  }

  async flush(): Promise<void> {
    const cache: Cache = await caches.open(this.cacheName);
    const keys: readonly Request[] = await cache.keys();
    await Promise.all(keys.map((key: Request): Promise<boolean> => cache.delete(key)));
  }
}

const queue = new RequestQueue();

// Retry when the connection returns
window.addEventListener('online', (): void => {
  void queue.dequeue();
});
```

---

## Interview Questions

### 💡 **Question 1: Explain the five main caching strategies**

| Strategy | How It Works | Best For | Pros | Cons |
|----------|--------------|----------|------|------|
| **Cache First** | Cache → Network | Static assets | Fastest | May be stale |
| **Network First** | Network → Cache | API calls | Always fresh | Slower |
| **Stale-While-Revalidate** | Cache + Background update | Images, fonts | Fast + fresh | Complex |
| **Cache Only** | Cache only | Versioned assets | Offline works | Never updates |
| **Network Only** | Network only | Real-time data | Always fresh | Fails offline |

**Selection Rule:**
- Static assets → Cache First
- Dynamic content → Network First or SWR
- Real-time → Network Only

---

### 💡 **Question 2: How do you implement Stale-While-Revalidate?**

| Step | Action |
|------|--------|
| 1 | Check cache for existing response |
| 2 | If found, return immediately |
| 3 | Start network fetch in background |
| 4 | Cache new response when received |
| 5 | If not cached, wait for network |

```typescript
event.respondWith(
  caches.match(request).then((cached: Response | undefined): Response | Promise<Response> => {
    const fetchPromise: Promise<Response> = fetch(request).then((response: Response): Response => {
      void cache.put(request, response.clone());
      return response;
    });
    return cached ?? fetchPromise;
  }),
);
```

---

### 💡 **Question 3: Cache API vs IndexedDB**

| Aspect | Cache API | IndexedDB |
|--------|-----------|-----------|
| **Store** | HTTP responses | Structured data |
| **Query** | By URL | Full queries |
| **Use Case** | Pages, assets | App data |
| **Integration** | Service Worker | App code |

**Use together:** Cache API for offline pages, IndexedDB for app data, Background Sync to keep them synchronized.

---

### 💡 **Question 4: How handle offline requests that sync later?**

| Step | Implementation |
|------|----------------|
| 1 | Intercept form submission |
| 2 | Try to submit normally |
| 3 | On failure, store in queue |
| 4 | Register background sync |
| 5 | Show user feedback |
| 6 | When online, process queue |

```typescript
declare const self: ServiceWorkerGlobalScope;

// SyncManager is not in the DOM lib — declare what you use
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// On failure, in the page
await storeInQueue(requestData);
await registration.sync.register('sync-queue');
showMessage('Will sync when online');

// In the worker — the browser fires this when it decides connectivity is back
self.addEventListener('sync', ((event: SyncEvent): void => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processQueue());
  }
}) as EventListener);
```

---

### 💡 **Question 5: How does Workbox simplify PWA development?**

| Manual Work | Workbox Solution |
|-------------|------------------|
| Write caching logic | `workbox.strategies.CacheFirst()` |
| Handle versioning | `precacheAndRoute()` with revisions |
| Clean old caches | `cleanupOutdatedCaches()` |
| Set expiration | `ExpirationPlugin` |
| Queue offline requests | `BackgroundSyncPlugin` |

---

### 💡 **Question 6: Common caching problems and solutions**

| Problem | Solution |
|---------|----------|
| **Stale content** | Version caches, clean old ones on activate |
| **Cache bloat** | Use ExpirationPlugin with maxEntries/maxAge |
| **Network timeouts** | Add timeout to Network First (3s default) |
| **No offline page** | Precache offline.html, serve on navigation failure |
| **API fails silently** | Use retry with exponential backoff |

---

### 💡 **Question 7: Offline-first todo app architecture**

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI** | DOM | Display todos |
| **Local Storage** | IndexedDB | Store todos offline |
| **Sync Flag** | `synced: boolean` | Track sync status |
| **Sync Trigger** | Background Sync | Retry when online |
| **Network** | Fetch API | Send to server |

**Flow:**
1. User adds todo → Store in IndexedDB (synced: false)
2. Try to sync → On success, set synced: true
3. On failure → Queue for Background Sync
4. Online event → Retry all unsynced items

---

### 💡 **Question 8: How to test offline functionality?**

| Method | How |
|--------|-----|
| **DevTools** | Network tab → Check "Offline" |
| **Application tab** | Service Workers → Offline checkbox |
| **Lighthouse** | Run PWA audit |
| **Programmatic** | Mock fetch failures in tests |

```typescript
// Test pattern
test('works offline', async (): Promise<void> => {
  // First load populates the cache
  await fetch('/');

  // Then simulate offline — DevTools' throttling, or a mocked fetch
  // Should still resolve, from the cache
  const response: Response = await fetch('/');
  expect(response.ok).toBe(true);
});
```

---

### 💡 **Question 9: Security considerations for offline data**

| Risk | Mitigation |
|------|------------|
| **Sensitive data exposure** | Don't cache tokens, passwords |
| **Data validation** | Validate before using cached data |
| **Stale permissions** | Re-validate on sync |
| **Logout cleanup** | Clear all caches and IndexedDB |

```typescript
// Offline storage survives logout unless you clear it. On a shared device that
// is a data leak, not a convenience
async function logout(): Promise<void> {
  localStorage.clear();
  indexedDB.deleteDatabase('app-db');

  const names: string[] = await caches.keys();
  await Promise.all(names.map((name: string): Promise<boolean> => caches.delete(name)));
}
```

---

### 💡 **Question 10: Choosing between storage options**

| Storage | Size | Best For |
|---------|------|----------|
| **localStorage** | ~5MB | Simple key-value |
| **sessionStorage** | ~5MB | Tab-specific data |
| **Cache API** | 50MB+ | HTTP responses |
| **IndexedDB** | 50MB+ | Structured app data |

**Decision Guide:**

| If you need... | Use |
|----------------|-----|
| Store form input temporarily | sessionStorage |
| User preferences | localStorage |
| Offline pages | Cache API |
| Offline app data with queries | IndexedDB |

---

## Summary

### 💡 **Strategy Quick Reference**

| Content Type | Strategy | Why |
|--------------|----------|-----|
| CSS/JS | Cache First | Rarely changes, speed matters |
| API data | Network First | Needs freshness |
| Images | Stale-While-Revalidate | Show fast, update later |
| Versioned files | Cache Only | URL changes = new cache |
| Real-time data | Network Only | Must be current |

### 💡 **Best Practices**

| Do | Don't |
|----|-------|
| ✅ Use Workbox for complex caching | ❌ Reinvent caching logic |
| ✅ Version your caches | ❌ Keep stale caches forever |
| ✅ Add timeouts to Network First | ❌ Let users wait indefinitely |
| ✅ Provide offline fallback page | ❌ Show broken UI when offline |
| ✅ Use both Cache API and IndexedDB | ❌ Use one for everything |

---

## Navigation

**Previous:** [02 - Web App Manifest](./02-web-app-manifest.md)

**Next:** [04 - Background Sync](./04-background-sync.md)

**Related Topics:**
- Service Workers - Foundation for caching
- Background Sync - Queue offline requests
- Push Notifications - Engage users

[Back to PWA Guide](./README.md)
