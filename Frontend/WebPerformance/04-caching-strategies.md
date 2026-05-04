# Caching Strategies

## Overview

Caching means **saving copies of files so they don't need to be downloaded again**. It's like keeping notes from class — you don't ask the teacher to repeat everything every day.

> **Why It's Powerful:**
> A cached file loads in 0 milliseconds. No network. No waiting. Caching is the single biggest performance win you can get.

---

## Table of Contents
- [Why Caching Matters](#why-caching-matters)
- [Browser Caching](#browser-caching)
- [Service Workers](#service-workers)
- [CDN Caching](#cdn-caching)
- [Cache Invalidation](#cache-invalidation)
- [Application-Level Caching](#application-level-caching)
- [Interview Questions](#interview-questions)

---

## Why Caching Matters

### 💡 **The Layers of Caching**

```
User opens your site
    ↓
Browser cache (fastest)         ← 1st check
    ↓ (not found)
Service Worker cache            ← 2nd check
    ↓ (not found)
CDN edge server (close to user) ← 3rd check
    ↓ (not found)
Origin server (slowest)         ← Last resort
```

> **Key Insight:**
> Each layer is a chance to skip a slow network request. Use all of them when possible.

---

## Browser Caching

### 💡 **HTTP Cache Headers**

The server tells the browser how long to cache a file with HTTP headers.

```javascript
// Express.js example
app.use('/static', express.static('public', {
  maxAge: '1y',     // Cache for 1 year
  immutable: true   // File will never change at this URL
}));

// Custom cache headers
app.get('/api/data', (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=3600',  // 1 hour
    'ETag': generateETag(data),
    'Last-Modified': new Date().toUTCString()
  });
  res.json(data);
});
```

### 💡 **Cache-Control Directives**

The most important header. Here are the common patterns:

| Use Case | Header | What It Does |
|----------|--------|--------------|
| HTML pages | `Cache-Control: no-cache` | Always check for updates |
| API responses | `Cache-Control: public, max-age=3600` | Cache for 1 hour |
| Static assets (JS/CSS with hash) | `Cache-Control: public, max-age=31536000, immutable` | Cache for 1 year |
| User-specific data | `Cache-Control: private, max-age=600` | Only cache in browser |
| Sensitive data | `Cache-Control: no-store` | Don't cache anywhere |

```http
# Don't cache (HTML pages, dynamic content)
Cache-Control: no-cache, no-store, must-revalidate

# Cache for 1 hour (API responses)
Cache-Control: public, max-age=3600

# Cache for 1 year (static assets with hash in filename)
Cache-Control: public, max-age=31536000, immutable

# Private cache (user-specific data, only browser)
Cache-Control: private, max-age=600
```

### 💡 **Common Directives Explained**

| Directive | Meaning |
|-----------|---------|
| `public` | CDN and browser can cache |
| `private` | Only browser can cache |
| `max-age=N` | Cache for N seconds |
| `no-cache` | Cache, but check before using |
| `no-store` | Don't cache at all |
| `immutable` | Never check for updates |
| `must-revalidate` | Check after expiration |

### 💡 **ETag and Last-Modified**

These let the browser ask "did this change?" without downloading the whole file.

**ETag (Hash-Based):**

```javascript
const crypto = require('crypto');

function generateETag(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

app.get('/api/data', (req, res) => {
  const data = getData();
  const etag = generateETag(JSON.stringify(data));

  // Did the client already have this version?
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // 304 = Not Modified
  }

  res.set('ETag', etag);
  res.json(data);
});
```

**Last-Modified (Timestamp-Based):**

```javascript
app.get('/api/resource', (req, res) => {
  const resource = getResource();
  const lastModified = resource.updatedAt;

  if (req.headers['if-modified-since'] === lastModified.toUTCString()) {
    return res.status(304).end();
  }

  res.set('Last-Modified', lastModified.toUTCString());
  res.json(resource);
});
```

| ETag | Last-Modified |
|------|---------------|
| Hash of content | Timestamp |
| Stronger validation | Weaker (1-second precision) |
| Works for any content | Works for static files |

### 💡 **Cache Busting Strategies**

When you update a file, how do you make sure users don't keep using the old cached version?

**❌ Bad (Query Strings):**

```html
<!-- Some proxies ignore the query string -->
<link rel="stylesheet" href="styles.css?v=1.0.0" />
```

**✅ Good (File Hashing):**

```html
<!-- Different hash = different URL = browser fetches new file -->
<link rel="stylesheet" href="styles.abc123.css" />
```

**Webpack Configuration:**

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js'
  }
};
```

**Vite Configuration:**

```javascript
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    }
  }
};
```

> **Key Insight:**
> With file hashing, you can cache files for a year because the URL itself changes when the file changes.

---

## Service Workers

### 💡 **What Are Service Workers?**

Service Workers are like a programmable proxy between your app and the network. They intercept requests and can serve cached responses, even when offline.

**What They Enable:**

- 📱 Offline functionality
- ⚡ Custom caching strategies
- 🔔 Push notifications
- 🔄 Background sync

### 💡 **Basic Service Worker**

```javascript
// sw.js
const CACHE_NAME = 'my-app-v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/main.js',
  '/images/logo.png'
];

// 1. Install: cache initial files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// 2. Fetch: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// 3. Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});
```

### 💡 **Caching Strategies**

There are different ways to decide between cache and network. Pick the right one for each resource type.

| Strategy | Behavior | Best For |
|----------|----------|----------|
| **Cache First** | Check cache → fall back to network | Static assets (logos, fonts) |
| **Network First** | Try network → fall back to cache | Fresh API data, news |
| **Stale While Revalidate** | Serve cache + update in background | Most content |
| **Network Only** | Always network | Sensitive data |
| **Cache Only** | Always cache | Offline-first apps |

**Cache First (Static Assets):**

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Found in cache → return it
      return response || fetch(event.request).then((fetchResponse) => {
        // Not in cache → fetch + save it
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});
```

**Network First (API Calls):**

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Got fresh data → save and return
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request)) // Offline → use cache
  );
});
```

**Stale While Revalidate (The Best of Both):**

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Update cache in the background
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      // Return cache instantly, update will happen async
      return cachedResponse || fetchPromise;
    })
  );
});
```

### 💡 **Workbox (Easier Way)**

Workbox is Google's library that makes Service Workers much simpler.

```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache files defined at build time
precacheAndRoute(self.__WB_MANIFEST);

// Cache images with Cache First strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache API with Network First (5 minute fallback)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60,
      }),
    ],
  })
);

// CSS/JS: Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);
```

---

## CDN Caching

### 💡 **What is a CDN?**

A CDN (Content Delivery Network) is a global network of servers that cache your files close to users.

```
User in Tokyo → Tokyo CDN server (50ms)
User in London → London CDN server (30ms)
User in New York → NYC CDN server (40ms)
```

Without a CDN, all users hit your single origin server, which could be far away.

### 💡 **CDN Configuration**

Different cache rules for different file types:

```javascript
app.use((req, res, next) => {
  // Static assets → cache for 1 year
  if (req.path.match(/\.(css|js|jpg|png|woff2)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('CDN-Cache-Control', 'max-age=31536000');
  }
  // HTML → never cache
  else if (req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache');
  }
  // API → short cache
  else if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  }
  next();
});
```

### 💡 **Purging the CDN**

When you deploy changes, you need to clear the CDN cache.

```javascript
// Cloudflare API example
async function purgeCDNCache(urls) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files: urls })
    }
  );
  return response.json();
}

// Run after deployment
await purgeCDNCache([
  'https://example.com/main.js',
  'https://example.com/styles.css'
]);
```

---

## Cache Invalidation

> **Famous Quote:**
> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

### 💡 **Versioning Strategies**

Different ways to give caches a clean break:

```javascript
// 1. Semantic versioning
const CACHE_VERSION = 'v1.2.3';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// 2. Timestamp versioning
const CACHE_NAME = `app-cache-${Date.now()}`;

// 3. Git commit hash (best for CI/CD)
const CACHE_NAME = `app-cache-${process.env.GIT_COMMIT}`;

// Clean up old caches when activating
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.startsWith('app-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});
```

### 💡 **Time-Based Invalidation**

Sometimes you want to expire cached items after a certain time.

```javascript
// Save with timestamp
async function cacheWithTimestamp(request, response) {
  const cache = await caches.open(CACHE_NAME);
  const headers = new Headers(response.headers);
  headers.set('sw-cached-time', Date.now());

  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });

  await cache.put(request, modifiedResponse);
}

// Check if too old
async function isStale(cachedResponse, maxAge) {
  const cachedTime = cachedResponse.headers.get('sw-cached-time');
  if (!cachedTime) return true;

  const age = Date.now() - parseInt(cachedTime);
  return age > maxAge;
}

// Use in fetch handler
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (!cachedResponse || await isStale(cachedResponse, 3600000)) {
        const freshResponse = await fetch(event.request);
        await cacheWithTimestamp(event.request, freshResponse.clone());
        return freshResponse;
      }
      return cachedResponse;
    })
  );
});
```

---

## Application-Level Caching

### 💡 **In-Memory Cache**

Simple cache that lives in JavaScript memory. Lost on page reload.

```javascript
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttl = 3600000) { // Default 1 hour
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const cache = new MemoryCache();

async function fetchUser(id) {
  const cached = cache.get(`user-${id}`);
  if (cached) return cached;

  const user = await api.getUser(id);
  cache.set(`user-${id}`, user, 5 * 60 * 1000); // 5 minutes
  return user;
}
```

### 💡 **LocalStorage Cache**

Persists across page reloads. Limited to ~5MB.

```javascript
class LocalStorageCache {
  set(key, value, ttl = 3600000) {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  get(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return item.value;
  }

  remove(key) {
    localStorage.removeItem(key);
  }

  clear() {
    localStorage.clear();
  }
}

// React hook for cached fetches
function useCachedFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cache = new LocalStorageCache();

  useEffect(() => {
    const cached = cache.get(url);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        cache.set(url, data, 5 * 60 * 1000); // 5 minutes
        setData(data);
        setLoading(false);
      });
  }, [url]);

  return { data, loading };
}
```

### 💡 **React Query (Best for React)**

React Query handles all the caching complexity for you.

```jsx
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
      cacheTime: 10 * 60 * 1000,   // Keep in memory for 10 minutes
      refetchOnWindowFocus: false   // Don't refetch on tab focus
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfile />
    </QueryClientProvider>
  );
}

function UserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return <Loading />;
  return <Profile user={data} />;
}
```

---

## Interview Questions

**Q1: What are the main HTTP cache headers?**

| Header | Purpose |
|--------|---------|
| **Cache-Control** | Main directive (max-age, no-cache, public/private) |
| **ETag** | Unique identifier for cache validation |
| **Last-Modified** | Timestamp for conditional requests |
| **Expires** | Legacy, absolute expiration time |

**Q2: Explain Cache-Control directives**

```http
Cache-Control: public, max-age=3600, must-revalidate
```

| Directive | Meaning |
|-----------|---------|
| `public` | CDN and browsers can cache |
| `private` | Only browser cache |
| `max-age=N` | Fresh for N seconds |
| `must-revalidate` | Check with server when stale |
| `no-cache` | Revalidate before use |
| `no-store` | Don't cache at all |
| `immutable` | Never revalidate (with hash URLs) |

**Q3: What are service worker caching strategies?**

| Strategy | When to Use |
|----------|-------------|
| **Cache First** | Static assets |
| **Network First** | API, dynamic data |
| **Stale While Revalidate** | Most content |
| **Network Only** | Sensitive data |
| **Cache Only** | Offline-first apps |

**Q4: How do you implement cache busting?**

```javascript
// Best: File hashing
main.abc123.js  // Hash in filename

// Webpack config
output: {
  filename: '[name].[contenthash].js'
}

// Worse: Query string
main.js?v=1.0.0
```

**Q5: ETag vs Last-Modified?**

| Feature | ETag | Last-Modified |
|---------|------|---------------|
| Type | Content hash | Timestamp |
| Strength | Stronger | Weaker (1-second precision) |
| Works with | Any content | Static files |

Use both for maximum compatibility.

**Q6: How do you invalidate CDN cache?**

```javascript
// 1. Cache busting with hashed filenames
main.[hash].js  // New hash = new URL = CDN fetches new file

// 2. API purge
await cdn.purge(['https://example.com/old-file.js']);

// 3. Versioned URLs
/v2/api/data  // New version bypasses cache
```

**Q7: What's Stale-While-Revalidate?**

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request).then((response) => {
        cache.put(event.request, response.clone());
        return response;
      });
      return cached || fresh; // Return cache instantly
    })
  );
});
```

**Best for**: balancing performance and freshness.

**Q8: How do you cache API responses client-side?**

```javascript
// 1. In-memory Map
const cache = new Map();
cache.set(url, { data, timestamp });

// 2. LocalStorage (persists)
localStorage.setItem(url, JSON.stringify({ data, expiry }));

// 3. React Query (automatic)
useQuery(['user', id], fetchUser, { staleTime: 300000 });

// 4. Service Worker
```

**Q9: What are cache invalidation challenges?**

Challenges:
- Stale data
- Cache coherence across servers
- Purging CDN caches
- Coordinating multiple cache layers

Solutions:
- ✅ TTL (time-based expiration)
- ✅ Event-based invalidation
- ✅ Cache versioning
- ✅ Immutable URLs

**Q10: How do you measure cache effectiveness?**

```javascript
// 1. Cache hit rate
const hitRate = cacheHits / (cacheHits + cacheMisses);

// 2. Check headers in DevTools
// Look for: (from disk cache) or (from memory cache)

// 3. Lighthouse report

// 4. CDN analytics

// 5. Service Worker metrics
self.addEventListener('fetch', (event) => {
  caches.match(event.request).then((response) => {
    if (response) analytics.track('cache-hit');
    else analytics.track('cache-miss');
  });
});
```

---

## Summary

### Caching Layers

| Layer | What It Caches | How to Configure |
|-------|---------------|------------------|
| **Browser** | Files | `Cache-Control` headers |
| **Service Worker** | Anything | JavaScript code |
| **CDN** | Static files | CDN dashboard |
| **App** | API data | React Query, etc. |

### Common Patterns

| Resource | Cache-Control |
|----------|--------------|
| Static assets (with hash) | `public, max-age=31536000, immutable` |
| HTML | `no-cache` |
| API responses | `public, max-age=300, must-revalidate` |
| User data | `private` |

### Best Practices

- ✅ Use content hashing for static assets
- ✅ Set proper Cache-Control headers
- ✅ Pick the right strategy per resource
- ✅ Plan cache invalidation carefully
- ✅ Monitor cache hit rates

> **Key Insight:**
> The best cache is one that's used. A 99% cache hit rate = your origin server only handles 1% of traffic.

---

[← Code Splitting](./03-code-splitting.md) | [Next: Image Optimization →](./05-image-optimization.md)
