# Service Workers

## Overview

Service Workers are JavaScript files that run in the background, separate from the main thread, acting as proxies between web applications and the network. They enable offline functionality, background sync, and push notifications - the foundation of Progressive Web Apps.

---

## Table of Contents

- [What are Service Workers](#what-are-service-workers)
- [Service Worker Lifecycle](#service-worker-lifecycle)
- [Registration Patterns](#registration-patterns)
- [Scope and Control](#scope-and-control)
- [Fetch Events](#fetch-events)
- [Caching Strategies](#caching-strategies)
- [Service Worker Updates](#service-worker-updates)
- [skipWaiting and clients.claim](#skipwaiting-and-clientsclaim)
- [Message Passing](#message-passing)
- [Debugging](#debugging)
- [Interview Questions](#interview-questions)

---

## What are Service Workers

### 💡 **Definition**

Service Workers are event-driven scripts that run in a separate thread from the main page, acting as a programmable network proxy.

**Key Insight:**
> Service Workers sit between your app and the network, allowing you to intercept requests, cache responses, and serve content offline.

---

### 💡 **Capabilities**

| Capability | Description |
|------------|-------------|
| **Network Proxy** | Intercept all fetch requests |
| **Offline Support** | Serve cached content without network |
| **Background Sync** | Queue requests for later |
| **Push Notifications** | Receive and display notifications |
| **Persistent Storage** | Cache assets long-term |

---

### 💡 **Limitations**

| Limitation | Reason |
|------------|--------|
| **No DOM Access** | Runs in separate thread |
| **HTTPS Required** | Security requirement (localhost exempt) |
| **Async Only** | All APIs are Promise-based |
| **No localStorage** | Use Cache API or IndexedDB |
| **Scope Restricted** | Can only control pages under its path |

---

### 💡 **Before vs After Service Workers**

| Without SW | With SW |
|------------|---------|
| No offline support | Full offline capability |
| Slow repeat visits | Instant cached loads |
| No background operations | Background sync and push |
| Network failures break app | Graceful degradation |

---

## Service Worker Lifecycle

### 💡 **The Four Stages**

| Stage | Event | Purpose | When It Fires |
|-------|-------|---------|---------------|
| **Registration** | - | Start the lifecycle | `navigator.serviceWorker.register()` |
| **Installation** | `install` | Cache assets | First time SW is registered |
| **Activation** | `activate` | Clean up old caches | After install, when no old SW clients |
| **Fetch Handling** | `fetch` | Serve requests | Every network request from controlled pages |

---

### 💡 **Lifecycle Flow**

```
Register SW
    ↓
Install Event (cache assets)
    ↓
Waiting State (if old SW has clients)
    ↓
Activate Event (cleanup old caches)
    ↓
Controlling (handle fetch events)
```

---

### 💡 **Complete Lifecycle Example**

**Registration (main.js):**

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg: ServiceWorkerRegistration): void => console.log('SW registered:', reg.scope))
    .catch((err: unknown): void => console.error('SW failed:', err));
}
```

**Install Event (sw.js):**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches.open('v1').then((cache: Cache): Promise<void> =>
      cache.addAll(['/', '/index.html', '/style.css', '/app.js']),
    ),
  );
  void self.skipWaiting(); // Activate immediately, without waiting for old tabs
});
```

**Activate Event (sw.js):**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches
      .keys()
      .then((names: string[]): Promise<boolean[]> =>
        Promise.all(names.filter((name: string): boolean => name !== 'v1').map((name: string) => caches.delete(name))),
      )
      // claim() belongs inside waitUntil, not after it — the worker can be
      // killed the moment the handler returns
      .then((): Promise<void> => self.clients.claim()),
  );
});
```

**Fetch Event (sw.js):**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  event.respondWith(
    caches
      .match(event.request)
      .then((cached: Response | undefined): Response | Promise<Response> => cached ?? fetch(event.request))
      .catch((): Promise<Response | undefined> => caches.match('/offline.html')) as Promise<Response>,
  );
});
```

---

## Registration Patterns

### 💡 **Basic Registration**

```typescript
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js');
}
```

---

### 💡 **Production Registration**

```typescript
async function registerSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const reg: ServiceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', reg.scope);

    // Check for updates every hour
    setInterval((): Promise<void> => reg.update(), 60 * 60 * 1000);
  } catch (error: unknown) {
    console.error('SW registration failed:', error);
  }
}

void registerSW();
```

---

### 💡 **Registration with Scope**

```typescript
// Only control pages under /app/
void navigator.serviceWorker.register('/sw.js', {
  scope: '/app/',
} satisfies RegistrationOptions);

// Multiple workers for different sections
void navigator.serviceWorker.register('/sw-checkout.js', { scope: '/checkout/' });
void navigator.serviceWorker.register('/sw-admin.js', { scope: '/admin/' });
```

---

### 💡 **Check Registration State**

```typescript
async function checkSW(): Promise<void> {
  const reg: ServiceWorkerRegistration | undefined = await navigator.serviceWorker.getRegistration();
  if (reg === undefined) return;

  // The three slots are mutually exclusive per worker version
  console.log('Installing:', reg.installing?.state);
  console.log('Waiting:', reg.waiting?.state);
  console.log('Active:', reg.active?.state);
}
```

---

## Scope and Control

### 💡 **Scope Rules**

| SW Location | Can Control | Cannot Control |
|-------------|-------------|----------------|
| `/sw.js` | `/`, `/page.html`, `/app/` | - |
| `/app/sw.js` | `/app/`, `/app/page.html` | `/`, `/other/` |
| `/deep/sw.js` | `/deep/`, `/deep/nested/` | `/`, `/deep-other/` |

**Key Insight:**
> SW can only control pages at or below its directory level. Override with explicit `scope` option.

---

### 💡 **Scope Override**

```typescript
// A worker at /app/sw.js controlling the whole site. The default maximum scope
// is the worker's own directory, so this needs a Service-Worker-Allowed header
void navigator.serviceWorker.register('/app/sw.js', {
  scope: '/',
});
```

---

## Fetch Events

### 💡 **Intercepting Requests**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  const url = new URL(event.request.url);

  // Route by request type
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
  } else if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
```

---

### 💡 **Request Properties**

| Property | Description | Example |
|----------|-------------|---------|
| `request.url` | Full URL | `https://example.com/api/users` |
| `request.method` | HTTP method | `GET`, `POST` |
| `request.destination` | Resource type | `document`, `image`, `script` |
| `request.mode` | Request mode | `navigate`, `cors`, `same-origin` |

---

### 💡 **Filtering Requests**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  // Only handle GET. Caching a POST response is almost always a bug
  if (event.request.method !== 'GET') return;

  // Only handle same-origin
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // Skip paths that must never be served stale
  if (event.request.url.includes('/api/real-time')) return;

  // Returning without calling respondWith lets the browser do its normal fetch
  event.respondWith(handleRequest(event.request));
});
```

---

## Caching Strategies

### 💡 **Strategy Selection**

| Strategy | Best For | Speed | Freshness |
|----------|----------|-------|-----------|
| **Cache First** | Static assets (CSS, JS, images) | Fastest | May be stale |
| **Network First** | API calls, dynamic content | Slower | Always fresh |
| **Stale-While-Revalidate** | Images, fonts, non-critical | Fast | Eventually fresh |
| **Cache Only** | Immutable assets | Fastest | Never updates |
| **Network Only** | Real-time data | Network speed | Always fresh |

---

### 💡 **Cache First**

Check cache first, fallback to network.

```typescript
async function cacheFirst(request: Request): Promise<Response> {
  const cached: Response | undefined = await caches.match(request);
  if (cached !== undefined) return cached;

  try {
    const response: Response = await fetch(request);
    const cache: Cache = await caches.open('v1');
    // clone() first — a Response body can only be read once
    void cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
```

**Use for:** CSS, JS, images, fonts

---

### 💡 **Network First**

Try network first, fallback to cache.

```typescript
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response: Response = await fetch(request);
    const cache: Cache = await caches.open('v1');
    void cache.put(request, response.clone());
    return response;
  } catch {
    const cached: Response | undefined = await caches.match(request);
    return cached ?? new Response('Offline', { status: 503 });
  }
}
```

**Use for:** API calls, user content, fresh data

---

### 💡 **Stale-While-Revalidate**

Serve cache immediately, update in background.

```typescript
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache: Cache = await caches.open('v1');
  const cached: Response | undefined = await cache.match(request);

  // Start the refresh but do not await it — that is the whole point
  const fetchPromise: Promise<Response> = fetch(request).then((response: Response): Response => {
    void cache.put(request, response.clone());
    return response;
  });

  return cached ?? fetchPromise;
}
```

**Use for:** Images, fonts, non-critical data

---

### 💡 **Decision Guide**

| Question | If Yes | If No |
|----------|--------|-------|
| Rarely changes? | Cache First | Network First |
| Must be fresh? | Network First | Stale-While-Revalidate |
| Critical for UX? | Cache First | Stale-While-Revalidate |
| Real-time data? | Network Only | Cache strategy |

---

## Service Worker Updates

### 💡 **Update Flow**

| Step | What Happens |
|------|--------------|
| 1 | Browser fetches SW file (every 24 hours or on navigation) |
| 2 | If byte-different, new SW starts installing |
| 3 | New SW enters "waiting" state |
| 4 | When old SW has no clients, new SW activates |
| 5 | New SW controls future page loads |

---

### 💡 **Update Strategies**

| Strategy | Approach | User Experience |
|----------|----------|-----------------|
| **Immediate** | `skipWaiting()` + `clients.claim()` | Seamless, may cause issues |
| **User-Initiated** | Show update button | User controls timing |
| **Natural** | Wait for tab close | No disruption |

---

### 💡 **Immediate Update Pattern**

```typescript
// sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (): void => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(self.clients.claim());
});

// main.ts
navigator.serviceWorker.addEventListener('controllerchange', (): void => {
  window.location.reload();
});
```

---

### 💡 **User-Initiated Update Pattern**

```typescript
// A shared message contract keeps both sides honest
type SWMessage = { type: 'UPDATE_AVAILABLE' } | { type: 'SKIP_WAITING' };

// main.ts
navigator.serviceWorker.addEventListener('message', (event: MessageEvent<SWMessage>): void => {
  if (event.data.type === 'UPDATE_AVAILABLE') {
    showUpdateButton();
  }
});

function triggerUpdate(): void {
  // controller is null until a worker is actually controlling this page
  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' } satisfies SWMessage);
}

// sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event: ExtendableMessageEvent): void => {
  if ((event.data as SWMessage).type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
```

---

## skipWaiting and clients.claim

### 💡 **skipWaiting()**

| Without skipWaiting | With skipWaiting |
|--------------------|------------------|
| New SW waits in "waiting" state | New SW activates immediately |
| Old SW serves until tabs close | Old SW replaced instantly |
| Safe but slow updates | Fast but may cause inconsistencies |

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (): void => {
  void self.skipWaiting(); // Do not wait for the old worker to be released
});
```

---

### 💡 **clients.claim()**

| Without claim | With claim |
|---------------|------------|
| New pages use new SW | All pages use new SW |
| Old pages keep old SW | Old pages switch to new SW |
| Pages must reload | Immediate takeover |

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(self.clients.claim());
});
```

---

### 💡 **Combined Pattern**

```typescript
declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v2';

self.addEventListener('install', (): void => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches
      .keys()
      .then((names: string[]): Promise<boolean[]> =>
        Promise.all(
          names.filter((n: string): boolean => n !== CACHE_VERSION).map((n: string) => caches.delete(n)),
        ),
      )
      .then((): Promise<void> => self.clients.claim()),
  );
});
```

**Key Insight:**
> `skipWaiting` + `clients.claim` = immediate takeover. Use when updates are safe and important.

---

## Message Passing

### 💡 **Communication Overview**

| Direction | Method |
|-----------|--------|
| Page → SW | `navigator.serviceWorker.controller.postMessage()` |
| SW → Page | `client.postMessage()` |
| Two-way | MessageChannel |

---

### 💡 **Page to Service Worker**

```typescript
// main.ts
function sendToSW(message: SWMessage): void {
  navigator.serviceWorker.controller?.postMessage(message);
}

sendToSW({ type: 'SKIP_WAITING' });

// sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event: ExtendableMessageEvent): void => {
  if ((event.data as SWMessage).type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
```

---

### 💡 **Service Worker to Page**

```typescript
interface SWUpdated {
  type: 'SW_UPDATED';
  version: string;
}

// sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('activate', (event: ExtendableEvent): void => {
  event.waitUntil(
    self.clients.matchAll().then((clients: readonly Client[]): void => {
      for (const client of clients) {
        client.postMessage({ type: 'SW_UPDATED', version: '2.0' } satisfies SWUpdated);
      }
    }),
  );
});

// main.ts
navigator.serviceWorker.addEventListener('message', (event: MessageEvent<SWUpdated>): void => {
  if (event.data.type === 'SW_UPDATED') {
    showUpdateNotification(event.data.version);
  }
});
```

---

### 💡 **Two-Way with MessageChannel**

```typescript
interface CacheSizeReply {
  size: number;
}

// main.ts — a MessageChannel turns fire-and-forget messaging into request/response
async function askSW<T>(message: unknown): Promise<T> {
  const channel = new MessageChannel();
  navigator.serviceWorker.controller?.postMessage(message, [channel.port2]);

  return new Promise<T>((resolve): void => {
    channel.port1.onmessage = (event: MessageEvent<T>): void => resolve(event.data);
  });
}

const cacheSize: CacheSizeReply = await askSW<CacheSizeReply>({ type: 'GET_CACHE_SIZE' });

// sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event: ExtendableMessageEvent): void => {
  if ((event.data as { type: string }).type !== 'GET_CACHE_SIZE') return;

  event.waitUntil(
    caches
      .open('v1')
      .then((cache: Cache): Promise<readonly Request[]> => cache.keys())
      .then((requests: readonly Request[]): void => {
        event.ports[0]?.postMessage({ size: requests.length } satisfies CacheSizeReply);
      }),
  );
});
```

---

## Debugging

### 💡 **Chrome DevTools**

| Location | What You See |
|----------|--------------|
| Application → Service Workers | SW status, update, unregister |
| Application → Cache Storage | Cached responses |
| Network tab | "(from ServiceWorker)" for cached |
| Console | SW logs |

---

### 💡 **Debugging Techniques**

```typescript
// Check registration state
void navigator.serviceWorker
  .getRegistration()
  .then((reg: ServiceWorkerRegistration | undefined): void => {
    console.log('Active:', reg?.active?.state);
    console.log('Waiting:', reg?.waiting?.state);
    console.log('Installing:', reg?.installing?.state);
  });

// Check if controlled
console.log('Controlled:', navigator.serviceWorker.controller !== null);

// Listen for errors
navigator.serviceWorker.addEventListener('error', (e: Event): void => {
  console.error('SW error:', e);
});

// Log cache hits and misses, in sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent): void => {
  event.waitUntil(
    caches.match(event.request).then((hit: Response | undefined): void => {
      console.log(hit !== undefined ? 'Cache HIT:' : 'Cache MISS:', event.request.url);
    }),
  );
});
```

---

### 💡 **Common Issues**

| Issue | Cause | Fix |
|-------|-------|-----|
| SW not updating | Browser caching | DevTools → Update on reload |
| Pages not controlled | Missing `clients.claim()` | Add to activate event |
| Cache not working | Wrong cache name | Check cache version |
| Offline not working | Missing offline fallback | Add offline.html to cache |

---

## Interview Questions

### 💡 **Question 1: What is a Service Worker?**

**Answer:**

A Service Worker is a JavaScript file that:
- Runs in background, separate from main thread
- Acts as network proxy between app and network
- Enables offline functionality via caching
- Supports background sync and push notifications
- Requires HTTPS (or localhost)

| Characteristic | Description |
|----------------|-------------|
| **Thread** | Separate from main thread |
| **DOM Access** | None |
| **APIs** | Promise-based only |
| **Persistence** | Survives page reloads |
| **Security** | HTTPS required |

---

### 💡 **Question 2: Explain the Service Worker lifecycle**

**Answer:**

| Stage | Event | Purpose |
|-------|-------|---------|
| **Registration** | - | Start lifecycle via `register()` |
| **Installation** | `install` | Cache critical assets |
| **Waiting** | - | Wait for old SW to release clients |
| **Activation** | `activate` | Clean up old caches |
| **Controlling** | `fetch` | Handle network requests |

**Flow:**

```
Register → Install → [Wait] → Activate → Fetch
                ↑
         skipWaiting() skips
```

---

### 💡 **Question 3: Difference between skipWaiting() and clients.claim()**

**Answer:**

| Method | Purpose | Used In |
|--------|---------|---------|
| `skipWaiting()` | Activate new SW immediately, skip waiting | `install` event |
| `clients.claim()` | Control existing pages without reload | `activate` event |

| Scenario | Without | With |
|----------|---------|------|
| **skipWaiting** | New SW waits for old SW clients to close | New SW activates immediately |
| **clients.claim** | Old pages keep using old SW | All pages use new SW immediately |

---

### 💡 **Question 4: When to use each caching strategy?**

**Answer:**

| Strategy | Use For | Example |
|----------|---------|---------|
| **Cache First** | Static, rarely-changing assets | CSS, JS, images, fonts |
| **Network First** | Dynamic, must be fresh | API calls, user data |
| **Stale-While-Revalidate** | Frequently updated, speed important | Social feeds, images |
| **Cache Only** | Immutable assets | Versioned files |
| **Network Only** | Real-time, never cache | WebSocket, auth |

---

### 💡 **Question 5: How do you handle SW updates?**

**Answer:**

**Immediate Update:**

```typescript
// sw.ts
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (): void => void self.skipWaiting());
self.addEventListener('activate', (event: ExtendableEvent): void => event.waitUntil(self.clients.claim()));

// main.ts
navigator.serviceWorker.addEventListener('controllerchange', (): void => {
  window.location.reload();
});
```

**User-Initiated:**

```typescript
// Show an update button; the user clicks it when they are ready to reload
navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' } satisfies SWMessage);
```

---

### 💡 **Question 6: What happens if install event fails?**

**Answer:**

| Scenario | Result |
|----------|--------|
| `cache.addAll()` fails | SW enters "redundant" state |
| Old SW present | Old SW continues controlling |
| No old SW | Pages uncontrolled |
| Next page load | Browser retries registration |

**Prevention:**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    caches.open('v1').then((cache: Cache): Promise<void> =>
      // addAll is all-or-nothing: one 404 fails the whole install. Split the
      // list so a missing optional asset cannot block the worker
      cache.addAll(['/index.html']).then((): void => {
        void cache.addAll(['/images/logo.png']).catch((): void => {});
      }),
    ),
  );
});
```

---

### 💡 **Question 7: Security considerations for Service Workers**

**Answer:**

| Consideration | Requirement |
|---------------|-------------|
| **HTTPS** | Required (prevents MITM) |
| **Same-Origin** | SW must be same origin as page |
| **Scope Limit** | SW only controls pages in scope |
| **Cache Validation** | Don't cache sensitive data |
| **Message Validation** | Verify message origin |

```typescript
declare const self: ServiceWorkerGlobalScope;

// Any page on the origin can post to the worker. Validate before acting
const VALID_TYPES = ['SKIP_WAITING', 'GET_CACHE'] as const;
type ValidType = (typeof VALID_TYPES)[number];

function isValid(data: unknown): data is { type: ValidType } {
  return (
    typeof data === 'object' &&
    data !== null &&
    VALID_TYPES.includes((data as { type: ValidType }).type)
  );
}

self.addEventListener('message', (event: ExtendableMessageEvent): void => {
  if (!isValid(event.data)) return;

  // Handle message
});
```

---

### 💡 **Question 8: How to implement offline page fallback?**

**Answer:**

```typescript
declare const self: ServiceWorkerGlobalScope;

// Install — cache the offline page
self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(caches.open('v1').then((cache: Cache): Promise<void> => cache.add('/offline.html')));
});

// Fetch — serve it when a navigation fails
self.addEventListener('fetch', (event: FetchEvent): void => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(
      async (): Promise<Response> =>
        (await caches.match('/offline.html')) ?? new Response('Offline', { status: 503 }),
    ),
  );
});
```

---

### 💡 **Question 9: How to debug Service Workers?**

**Answer:**

| Tool | Use For |
|------|---------|
| DevTools → Application → Service Workers | Status, update, unregister |
| DevTools → Application → Cache Storage | View cached content |
| DevTools → Network | See cached responses |
| `console.log` in SW | Debugging output |

```typescript
// Check current state
void navigator.serviceWorker
  .getRegistration()
  .then((reg: ServiceWorkerRegistration | undefined): void => {
    console.log('Active:', reg?.active != null);
    console.log('Waiting:', reg?.waiting != null);
    console.log('Controlled:', navigator.serviceWorker.controller !== null);
  });
```

---

### 💡 **Question 10: Implement message passing between page and SW**

**Answer:**

```typescript
declare const self: ServiceWorkerGlobalScope;

interface Ping {
  type: 'PING' | 'PONG' | 'UPDATE';
}

// Page → worker
navigator.serviceWorker.controller?.postMessage({ type: 'PING' } satisfies Ping);

// Worker receives
self.addEventListener('message', (event: ExtendableMessageEvent): void => {
  if ((event.data as Ping).type === 'PING') {
    // Reply down the port the page opened, or broadcast to every client
    event.ports[0]?.postMessage({ type: 'PONG' } satisfies Ping);
  }
});

// Worker → pages (broadcast)
void self.clients.matchAll().then((clients: readonly Client[]): void => {
  for (const c of clients) c.postMessage({ type: 'UPDATE' } satisfies Ping);
});

// Page receives
navigator.serviceWorker.addEventListener('message', (event: MessageEvent<Ping>): void => {
  console.log('From SW:', event.data);
});
```

---

## Summary

### 💡 **Key Takeaways**

| Concept | Summary |
|---------|---------|
| **Lifecycle** | Register → Install → Activate → Fetch |
| **Caching** | Choose strategy based on content type |
| **Updates** | Use skipWaiting + claim for immediate |
| **Communication** | postMessage for page-SW communication |
| **Security** | HTTPS required, same-origin only |

**Key Insight:**
> Service Workers are the foundation of PWAs. Master the lifecycle and caching strategies to build reliable offline experiences.

---

## Navigation

**Previous:** [00 - PWA Introduction](./00-pwa-introduction.md)

**Next:** [02 - Web App Manifest](./02-web-app-manifest.md)

---

[Back to PWA](./README.md) | [Back to Frontend](../README.md)
