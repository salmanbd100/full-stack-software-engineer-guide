# Caching Strategies

## Overview

Caching is one of the most effective performance optimization techniques. It stores copies of files/data to serve them faster on subsequent requests. Proper caching can reduce server load, bandwidth usage, and dramatically improve load times.

## Table of Contents
- [Browser Caching](#browser-caching)
- [Service Workers](#service-workers)
- [CDN Caching](#cdn-caching)
- [Cache Invalidation](#cache-invalidation)
- [Application-Level Caching](#application-level-caching)
- [Interview Questions](#interview-questions)

## Browser Caching

### HTTP Cache Headers

HTTP caching is one of the most effective performance optimizations available - cached resources load instantly with zero network requests. Cache-Control headers tell browsers (and CDNs) how long to cache resources before checking for updates. The maxAge directive specifies cache duration in seconds, while the immutable flag indicates the resource will never change at this URL (perfect for hash-based filenames). Proper caching reduces server load, bandwidth costs, and dramatically improves repeat visit performance. The challenge is balancing cache duration with the need to deploy updates quickly.

```javascript
// Express.js cache headers
app.use('/static', express.static('public', {
  maxAge: '1y',  // 1 year
  immutable: true
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

### Cache-Control Directives

```http
# No caching (HTML pages, dynamic content)
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0

# Cache for 1 hour (API responses)
Cache-Control: public, max-age=3600

# Cache for 1 year (static assets with hash)
Cache-Control: public, max-age=31536000, immutable

# Private cache (user-specific data)
Cache-Control: private, max-age=600

# Revalidate (check if fresh before use)
Cache-Control: public, max-age=3600, must-revalidate
```

### ETag and Last-Modified

```javascript
// ETag implementation
const crypto = require('crypto');

function generateETag(content) {
  return crypto
    .createHash('md5')
    .update(content)
    .digest('hex');
}

app.get('/api/data', (req, res) => {
  const data = getData();
  const etag = generateETag(JSON.stringify(data));

  // Check if client has fresh copy
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not Modified
  }

  res.set('ETag', etag);
  res.json(data);
});

// Last-Modified
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

### Cache Busting Strategies

```javascript
// 1. Query strings (not recommended - proxy cache issues)
<link rel="stylesheet" href="styles.css?v=1.0.0" />

// 2. File hashing (recommended)
<link rel="stylesheet" href="styles.abc123.css" />

// Webpack configuration
module.exports = {
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js'
  }
};

// Vite configuration
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

## Service Workers

### Basic Service Worker

Service Workers are programmable network proxies that intercept all network requests from your web app. They enable advanced caching strategies, offline functionality, and background sync - capabilities previously limited to native apps. Service Workers operate independently of your web pages, running in a separate thread with a lifecycle distinct from your app. They persist across page loads and can serve cached responses even when offline. The install event is your opportunity to precache critical assets, ensuring instant loads on subsequent visits. Understanding the Service Worker lifecycle is crucial for effective implementation.

```javascript
// sw.js
const CACHE_NAME = 'my-app-v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/main.js',
  '/images/logo.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Activate event - clean old caches
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

### Caching Strategies

Service Worker caching strategies determine how and when to serve cached content versus fetching from the network. Each strategy balances freshness (getting the latest content) with performance (serving cached content instantly). Cache First prioritizes speed by serving cached content immediately, perfect for static assets that rarely change. Network First ensures freshness for dynamic content like API responses while falling back to cache when offline. Stale While Revalidate provides instant responses from cache while fetching fresh content in the background - the best of both worlds for most content.

```javascript
// 1. Cache First (Good for static assets)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});

// 2. Network First (Good for API calls)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 3. Stale While Revalidate
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
```

### Workbox (Modern Service Worker Library)

```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache images (Cache First)
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

// Cache API (Network First)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache CSS/JS (Stale While Revalidate)
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);
```

## CDN Caching

### CDN Configuration

```javascript
// Cloudflare cache rules
app.use((req, res, next) => {
  // Static assets - cache for 1 year
  if (req.path.match(/\.(css|js|jpg|png|woff2)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('CDN-Cache-Control', 'max-age=31536000');
  }
  // HTML - no cache
  else if (req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache');
  }
  // API - short cache
  else if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  }
  next();
});
```

### Purging CDN Cache

```javascript
// Cloudflare API purge
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

// Usage after deployment
await purgeCDNCache([
  'https://example.com/main.js',
  'https://example.com/styles.css'
]);
```

## Cache Invalidation

### Versioning Strategy

```javascript
// 1. Semantic versioning
const CACHE_VERSION = 'v1.2.3';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// 2. Timestamp versioning
const CACHE_NAME = `app-cache-${Date.now()}`;

// 3. Git commit hash
const CACHE_NAME = `app-cache-${process.env.GIT_COMMIT}`;

// Clean old caches on activate
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

### Time-Based Invalidation

```javascript
// Store with timestamp
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

// Check if stale
async function isStale(cachedResponse, maxAge) {
  const cachedTime = cachedResponse.headers.get('sw-cached-time');
  if (!cachedTime) return true;

  const age = Date.now() - parseInt(cachedTime);
  return age > maxAge;
}

// Fetch with time-based invalidation
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

## Application-Level Caching

### In-Memory Cache

```javascript
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

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

### LocalStorage Cache

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

// React hook for cached API calls
function useCachedFetch(url, options = {}) {
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

    fetch(url, options)
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

### React Query Caching

```jsx
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  }
});

// Use in app
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfile />
    </QueryClientProvider>
  );
}

// Component with caching
function UserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  if (isLoading) return <Loading />;
  return <Profile user={data} />;
}
```

## Interview Questions

**Q1: What are the main HTTP cache headers?**
A:
- **Cache-Control**: Main directive (max-age, no-cache, public/private)
- **ETag**: Unique identifier for cache validation
- **Last-Modified**: Timestamp for conditional requests
- **Expires**: Legacy, absolute expiration time

**Q2: Explain Cache-Control directives**
```http
Cache-Control: public, max-age=3600, must-revalidate

public: Can be cached by CDN/proxies
private: Only browser cache
max-age=3600: Fresh for 1 hour
must-revalidate: Check with server after stale
no-cache: Revalidate before use
no-store: Don't cache at all
immutable: Never revalidate (with hash URLs)
```

**Q3: What are service worker caching strategies?**
A:
1. **Cache First**: Try cache, fallback to network (static assets)
2. **Network First**: Try network, fallback to cache (API, dynamic)
3. **Stale While Revalidate**: Serve cache, update in background
4. **Network Only**: Never cache (sensitive data)
5. **Cache Only**: Offline-first apps

**Q4: How do you implement cache busting?**
```javascript
// File hashing (best)
main.abc123.js  // Hash in filename

// Webpack
output: {
  filename: '[name].[contenthash].js'
}

// Alternative: Query string (not recommended)
main.js?v=1.0.0
```

**Q5: What's the difference between ETag and Last-Modified?**
A:
- **ETag**: Content hash, stronger validation, works for dynamic content
- **Last-Modified**: Timestamp, weaker, only second precision
- Use both for maximum compatibility

**Q6: How do you invalidate CDN cache?**
```javascript
// 1. Cache busting with hashed filenames
main.[hash].js  // New hash = new URL = CDN fetches new file

// 2. API purge
await cdn.purge(['https://example.com/old-file.js']);

// 3. Versioned URLs
/v2/api/data  // New version bypasses cache
```

**Q7: What's Stale-While-Revalidate strategy?**
```javascript
// Serve stale cache immediately, fetch fresh in background
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request).then((response) => {
        cache.put(event.request, response.clone());
        return response;
      });
      return cached || fresh; // Return cache if available
    })
  );
});
```
Best for balancing performance and freshness.

**Q8: How do you cache API responses client-side?**
```javascript
// 1. In-memory Map/Object
const cache = new Map();
cache.set(url, { data, timestamp });

// 2. LocalStorage (persists)
localStorage.setItem(url, JSON.stringify({ data, expiry }));

// 3. React Query (automatic)
useQuery(['user', id], fetchUser, { staleTime: 300000 });

// 4. Service Worker
```

**Q9: What are cache invalidation challenges?**
A: "There are only two hard things in Computer Science: cache invalidation and naming things."

Challenges:
- Stale data
- Cache coherence across servers
- Purging CDN caches
- Coordinating multiple cache layers

Solutions:
- TTL (time-based)
- Event-based invalidation
- Cache versioning
- Immutable URLs

**Q10: How do you measure cache effectiveness?**
```javascript
// 1. Cache hit rate
const hitRate = cacheHits / (cacheHits + cacheMisses);

// 2. Check headers in DevTools
// Look for: (from disk cache) or (from memory cache)

// 3. Lighthouse report
// Checks for proper caching headers

// 4. CDN analytics
// Hit rate, bandwidth saved

// 5. Service Worker metrics
self.addEventListener('fetch', (event) => {
  caches.match(event.request).then((response) => {
    if (response) {
      analytics.track('cache-hit');
    } else {
      analytics.track('cache-miss');
    }
  });
});
```

## Summary

**Caching Layers:**
1. **Browser Cache**: HTTP headers (Cache-Control, ETag)
2. **Service Worker**: Offline support, custom strategies
3. **CDN**: Global edge caching
4. **Application**: In-memory, LocalStorage, React Query

**Best Practices:**
- Use content hashing for static assets
- Implement proper Cache-Control headers
- Choose right caching strategy per resource type
- Set up effective cache invalidation
- Monitor cache hit rates

**Common Patterns:**
- Static assets: Cache-Control max-age=31536000, immutable
- HTML: Cache-Control no-cache
- API: Cache-Control max-age=300, must-revalidate
- User content: Cache-Control private

---

[← Code Splitting](./03-code-splitting.md) | [Next: Image Optimization →](./05-image-optimization.md)
