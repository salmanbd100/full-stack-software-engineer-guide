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

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg))
    .catch(err => console.error('SW failed:', err));
}
```

**Install Event (sw.js):**

```javascript
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/app.js'
      ]);
    })
  );
  self.skipWaiting(); // Activate immediately
});
```

**Activate Event (sw.js):**

```javascript
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== 'v1') return caches.delete(name);
        })
      );
    })
  );
  return self.clients.claim(); // Control all pages
});
```

**Fetch Event (sw.js):**

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => caches.match('/offline.html'))
  );
});
```

---

## Registration Patterns

### 💡 **Basic Registration**

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

### 💡 **Production Registration**

```javascript
async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', reg);

    // Check for updates every hour
    setInterval(() => reg.update(), 60 * 60 * 1000);
  } catch (error) {
    console.error('SW registration failed:', error);
  }
}

registerSW();
```

---

### 💡 **Registration with Scope**

```javascript
// Only control pages under /app/
navigator.serviceWorker.register('/sw.js', {
  scope: '/app/'
});

// Multiple SWs for different sections
navigator.serviceWorker.register('/sw-checkout.js', { scope: '/checkout/' });
navigator.serviceWorker.register('/sw-admin.js', { scope: '/admin/' });
```

---

### 💡 **Check Registration State**

```javascript
async function checkSW() {
  const reg = await navigator.serviceWorker.getRegistration();

  if (reg) {
    console.log('Installing:', reg.installing);
    console.log('Waiting:', reg.waiting);
    console.log('Active:', reg.active);
  }
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

```javascript
// SW at /app/sw.js controlling entire site
navigator.serviceWorker.register('/app/sw.js', {
  scope: '/' // Requires server configuration
});
```

---

## Fetch Events

### 💡 **Intercepting Requests**

```javascript
self.addEventListener('fetch', event => {
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

```javascript
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Only handle same-origin
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // Skip certain paths
  if (event.request.url.includes('/api/real-time')) return;

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

```javascript
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open('v1');
    cache.put(request, response.clone());
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

```javascript
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open('v1');
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
```

**Use for:** API calls, user content, fresh data

---

### 💡 **Stale-While-Revalidate**

Serve cache immediately, update in background.

```javascript
async function staleWhileRevalidate(request) {
  const cache = await caches.open('v1');
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });

  return cached || fetchPromise;
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

```javascript
// sw.js
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  return self.clients.claim();
});

// main.js
navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

---

### 💡 **User-Initiated Update Pattern**

```javascript
// main.js
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data.type === 'UPDATE_AVAILABLE') {
    showUpdateButton();
  }
});

function triggerUpdate() {
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
}

// sw.js
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
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

```javascript
self.addEventListener('install', event => {
  self.skipWaiting(); // Don't wait for old SW
});
```

---

### 💡 **clients.claim()**

| Without claim | With claim |
|---------------|------------|
| New pages use new SW | All pages use new SW |
| Old pages keep old SW | Old pages switch to new SW |
| Pages must reload | Immediate takeover |

```javascript
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
```

---

### 💡 **Combined Pattern**

```javascript
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(n => n !== 'v2').map(n => caches.delete(n))
      );
    })
  );
  return self.clients.claim();
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

```javascript
// main.js
function sendToSW(message) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

sendToSW({ type: 'SKIP_WAITING' });

// sw.js
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

### 💡 **Service Worker to Page**

```javascript
// sw.js
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED', version: '2.0' });
      });
    })
  );
});

// main.js
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data.type === 'SW_UPDATED') {
    showUpdateNotification(event.data.version);
  }
});
```

---

### 💡 **Two-Way with MessageChannel**

```javascript
// main.js
async function askSW(message) {
  const channel = new MessageChannel();

  navigator.serviceWorker.controller.postMessage(message, [channel.port2]);

  return new Promise(resolve => {
    channel.port1.onmessage = event => resolve(event.data);
  });
}

const cacheSize = await askSW({ type: 'GET_CACHE_SIZE' });

// sw.js
self.addEventListener('message', event => {
  if (event.data.type === 'GET_CACHE_SIZE') {
    caches.open('v1').then(cache => {
      cache.keys().then(requests => {
        event.ports[0].postMessage({ size: requests.length });
      });
    });
  }
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

```javascript
// Check registration state
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Active:', reg?.active);
  console.log('Waiting:', reg?.waiting);
  console.log('Installing:', reg?.installing);
});

// Check if controlled
console.log('Controlled:', !!navigator.serviceWorker.controller);

// Listen for errors
navigator.serviceWorker.addEventListener('error', e => {
  console.error('SW error:', e);
});

// Log cache operations
self.addEventListener('fetch', event => {
  caches.match(event.request).then(hit => {
    console.log(hit ? 'Cache HIT:' : 'Cache MISS:', event.request.url);
  });
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

```javascript
// sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// main.js
navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

**User-Initiated:**

```javascript
// Show update button, user clicks to update
navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
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

```javascript
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      // Critical assets must succeed
      return cache.addAll(['/index.html'])
        .then(() => {
          // Optional assets can fail
          cache.addAll(['/images/logo.png']).catch(() => {});
        });
    })
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

```javascript
// Validate messages
self.addEventListener('message', event => {
  // Only handle known message types
  const validTypes = ['SKIP_WAITING', 'GET_CACHE'];
  if (!validTypes.includes(event.data.type)) return;

  // Handle message
});
```

---

### 💡 **Question 8: How to implement offline page fallback?**

**Answer:**

```javascript
// Install: Cache offline page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => cache.add('/offline.html'))
  );
});

// Fetch: Serve offline page for failed navigations
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html'))
    );
  }
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

```javascript
// Check current state
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Active:', !!reg?.active);
  console.log('Waiting:', !!reg?.waiting);
  console.log('Controlled:', !!navigator.serviceWorker.controller);
});
```

---

### 💡 **Question 10: Implement message passing between page and SW**

**Answer:**

```javascript
// Page → SW
navigator.serviceWorker.controller.postMessage({ type: 'PING' });

// SW receives
self.addEventListener('message', event => {
  if (event.data.type === 'PING') {
    // Reply via port or broadcast
    event.ports[0]?.postMessage({ type: 'PONG' });
  }
});

// SW → Page (broadcast)
self.clients.matchAll().then(clients => {
  clients.forEach(c => c.postMessage({ type: 'UPDATE' }));
});

// Page receives
navigator.serviceWorker.addEventListener('message', event => {
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
