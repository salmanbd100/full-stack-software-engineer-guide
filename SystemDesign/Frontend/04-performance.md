# Performance Optimization

## Overview
Frontend performance directly impacts user experience, SEO rankings, and conversion rates. A 100ms delay can reduce conversions by 7%. This guide covers essential performance optimization techniques for modern web applications.

## Core Web Vitals

Google's user-centric performance metrics that impact SEO and user experience.

**Performance Targets:**

| Metric | Good | Needs Improvement | Poor | Impact |
|--------|------|-------------------|------|--------|
| **LCP** | < 2.5s | 2.5s - 4.0s | > 4.0s | Loading speed |
| **FID** | < 100ms | 100ms - 300ms | > 300ms | Interactivity |
| **CLS** | < 0.1 | 0.1 - 0.25 | > 0.25 | Visual stability |

### 💡 **Largest Contentful Paint (LCP)**

**What is LCP?**
Largest Contentful Paint (LCP) measures when the largest content element (image, video, or text block) becomes visible in the viewport. It's Google's primary metric for measuring perceived load speed and directly impacts SEO rankings.

**Why LCP Matters:**
- Directly correlates with perceived load speed
- Users judge page speed based on when they see main content
- Poor LCP (> 4s) increases bounce rate by 32%
- Google uses it as a ranking factor

**What Counts as LCP Element:**
- `<img>` elements
- `<video>` elements
- Background images loaded via CSS
- Block-level text elements

**LCP Targets:**
- **Good**: < 2.5 seconds
- **Needs Improvement**: 2.5 - 4.0 seconds
- **Poor**: > 4.0 seconds

**Common LCP Issues:**
1. Slow server response time (TTFB)
2. Render-blocking JavaScript/CSS
3. Slow resource load times (images, fonts)
4. Client-side rendering delay

Measures loading performance. Should occur within 2.5 seconds.

```javascript
// Measure LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);

  // Send to analytics
  analytics.send({
    metric: 'LCP',
    value: lastEntry.renderTime || lastEntry.loadTime,
    element: lastEntry.element
  });
}).observe({ entryTypes: ['largest-contentful-paint'] });

// Optimize LCP
// 1. Use CDN for static assets
// 2. Optimize images (WebP, lazy loading)
// 3. Preload critical resources
// 4. Eliminate render-blocking resources
```

**Optimization Techniques:**

```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero.jpg" as="image">

<!-- Optimize images -->
<img
  src="hero.jpg"
  alt="Hero"
  loading="eager"
  fetchpriority="high"
  width="1200"
  height="600"
/>
```

### 💡 **First Input Delay (FID)**

**What is FID?**
First Input Delay measures the time from when a user first interacts with your page (clicks a link, taps a button) to when the browser can actually begin processing that event. It captures the user's first impression of interactivity.

**Why FID Matters:**
- Measures real-world interactivity, not theoretical
- Nothing is more frustrating than clicking and nothing happening
- Poor FID makes users think the site is broken
- Google ranking factor

**What Causes High FID:**
FID happens when the main thread is busy executing JavaScript. Common culprits:
1. **Large JavaScript bundles**: Browser busy parsing/executing
2. **Long tasks**: Any task taking > 50ms blocks interaction
3. **Heavy third-party scripts**: Ads, analytics blocking main thread
4. **Inefficient event handlers**: Slow code in click/input handlers

**FID Targets:**
- **Good**: < 100ms
- **Needs Improvement**: 100 - 300ms
- **Poor**: > 300ms

**Interaction to Next Paint (INP):**
FID is being replaced by INP in 2024, which measures ALL interactions throughout the page lifetime, not just first input. Same optimization techniques apply.

Measures interactivity. Should be less than 100ms.

```javascript
// Measure FID
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const FID = entry.processingStart - entry.startTime;
    console.log('FID:', FID);

    analytics.send({
      metric: 'FID',
      value: FID
    });
  }
}).observe({ entryTypes: ['first-input'] });

// Optimize FID
// 1. Break up long tasks
// 2. Use web workers for heavy computation
// 3. Defer non-critical JavaScript
// 4. Use requestIdleCallback
```

**Code Splitting for Better FID:**

```javascript
// Split long tasks
function processLargeDataset(data) {
  const chunks = chunkArray(data, 100);

  function processChunk(index) {
    if (index >= chunks.length) {
      console.log('Processing complete');
      return;
    }

    // Process chunk
    processItems(chunks[index]);

    // Schedule next chunk
    requestIdleCallback(() => processChunk(index + 1));
  }

  processChunk(0);
}

// Use web workers
const worker = new Worker('heavy-computation.js');
worker.postMessage({ data: largeDataset });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};
```

### 💡 **Cumulative Layout Shift (CLS)**

**What is CLS?**

Cumulative Layout Shift measures visual stability — how much the page layout shifts unexpectedly during loading. Nothing frustrates users more than clicking a button only to have the page shift and accidentally clicking something else.

**Why CLS Matters:**
- Causes accidental clicks (user frustration)
- Makes content hard to read while loading
- Damages trust in the application
- Google uses it as a ranking factor

**What Causes High CLS:**
1. **Images without dimensions**: Browser doesn't know size until loaded
2. **Dynamic content injection**: Ads, banners, or embeds pushing content down
3. **Web fonts causing FOUT/FOIT**: Text resizes when custom font loads
4. **Dynamic content above existing content**: New elements inserted above viewport

**CLS Targets:**
- **Good**: < 0.1
- **Needs Improvement**: 0.1 - 0.25
- **Poor**: > 0.25

Measures visual stability. Should be less than 0.1.

```javascript
// Measure CLS
let clsScore = 0;

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsScore += entry.value;
      console.log('CLS:', clsScore);
    }
  }
}).observe({ entryTypes: ['layout-shift'] });

// Optimize CLS
// 1. Include size attributes on images/videos
// 2. Reserve space for ads/embeds
// 3. Avoid inserting content above existing content
// 4. Use CSS transforms instead of position changes
```

**Preventing Layout Shifts:**

```css
/* Reserve space for images */
.image-container {
  aspect-ratio: 16 / 9;
}

/* Skeleton screens */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

```jsx
// React skeleton implementation
function ProductCard({ loading, product }) {
  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ height: 200 }} />
        <div className="skeleton" style={{ height: 24, marginTop: 16 }} />
        <div className="skeleton" style={{ height: 16, marginTop: 8 }} />
      </div>
    );
  }

  return (
    <div className="card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
    </div>
  );
}
```

**Key Insight:**
> CLS is the easiest Core Web Vital to fix — always set explicit width/height on images and videos, reserve space for dynamic content, and use `font-display: swap`.

## Code Optimization

### 💡 **Bundle Size Reduction**

```javascript
// 1. Tree shaking - import only what you need
import { debounce } from 'lodash-es';  // ✅ Good - only imports what's needed
import _ from 'lodash';                 // ❌ Bad - imports everything (70KB+)

// 2. Dynamic imports
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 3. Bundle analysis
// package.json
{
  "scripts": {
    "analyze": "npx webpack-bundle-analyzer dist/stats.json"
  }
}

// 4. Remove unused dependencies
npx depcheck

// 5. Use smaller alternatives
// moment.js (232KB) → date-fns (13KB) or day.js (2KB)
import { format } from 'date-fns';
```

### Code Splitting Strategies

```javascript
// Route-based splitting
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Products = lazy(() => import('./pages/Products'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// Component-based splitting
function AdminPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      <BasicSettings />
      {showAdvanced && (
        <Suspense fallback={<Spinner />}>
          <AdvancedSettings />
        </Suspense>
      )}
    </div>
  );
}

// Vendor splitting (webpack)
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### Minification and Compression

```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true  // Remove console.log in production
          }
        }
      }),
      new CssMinimizerPlugin()
    ]
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,  // Only compress files > 10KB
      minRatio: 0.8
    })
  ]
};

// Server configuration (Express)
const compression = require('compression');
app.use(compression());

// Nginx configuration
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## Asset Optimization

### Image Optimization

```html
<!-- Modern image formats -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>

<!-- Responsive images -->
<img
  srcset="
    small.jpg 400w,
    medium.jpg 800w,
    large.jpg 1200w
  "
  sizes="
    (max-width: 400px) 400px,
    (max-width: 800px) 800px,
    1200px
  "
  src="medium.jpg"
  alt="Responsive image"
  loading="lazy"
/>

<!-- Lazy loading -->
<img src="image.jpg" loading="lazy" alt="Lazy loaded">

<!-- Priority hints -->
<img src="hero.jpg" fetchpriority="high" alt="Hero image">
<img src="thumbnail.jpg" fetchpriority="low" alt="Thumbnail">
```

```javascript
// Next.js Image component
import Image from 'next/image';

function Product() {
  return (
    <Image
      src="/product.jpg"
      alt="Product"
      width={500}
      height={300}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
      quality={85}
      priority={false}  // lazy load
    />
  );
}

// Image optimization service
function optimizeImage(url, options = {}) {
  const params = new URLSearchParams({
    url,
    w: options.width || 'auto',
    q: options.quality || 80,
    fm: options.format || 'webp'
  });

  return `https://cdn.example.com/image?${params}`;
}
```

### Font Optimization

```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<!-- Font display strategy -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-weight: 100 900;
    font-display: swap;  /* Show fallback immediately */
  }
</style>
```

```css
/* System font stack (no download needed) */
body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    sans-serif;
}

/* Variable fonts (single file for all weights) */
@font-face {
  font-family: 'Inter var';
  font-weight: 100 900;
  src: url('Inter-var.woff2') format('woff2');
}

/* Subset fonts (only include needed characters) */
/* Use tools like glyphhanger */
```

## Runtime Performance

### React Performance Optimization

```javascript
// 1. Memoization
import { memo, useMemo, useCallback } from 'react';

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Only re-renders when data changes
  return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  // Memoize expensive computation
  const sortedItems = useMemo(() => {
    console.log('Sorting items...');
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);  // Only recompute when items change

  // Memoize callback
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);  // Function reference stays same

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveComponent data={sortedItems} onClick={handleClick} />
    </div>
  );
}

// 2. Virtualization for long lists
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index].name}
        </div>
      )}
    </FixedSizeList>
  );
}

// 3. Debouncing and throttling
import { useState, useEffect } from 'react';
import { debounce } from 'lodash-es';

function SearchInput() {
  const [query, setQuery] = useState('');

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      // API call
      fetch(`/api/search?q=${value}`);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// 4. Lazy loading components
const HeavyChart = lazy(() => import('./HeavyChart'));

function Analytics() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>Show Chart</button>
      {show && (
        <Suspense fallback={<Loading />}>
          <HeavyChart />
        </Suspense>
      )}
    </>
  );
}
```

### 💡 **JavaScript Performance**

**Key patterns for runtime performance:**

```javascript
// 1. Avoid unnecessary DOM manipulation
// ❌ Bad - multiple reflows
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.textContent = i;
  document.body.appendChild(div);  // Reflow each time
}

// ✅ Good - single reflow
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.textContent = i;
  fragment.appendChild(div);
}
document.body.appendChild(fragment);  // Single reflow

// 2. Use event delegation
// ❌ Bad - multiple listeners
items.forEach(item => {
  item.addEventListener('click', handleClick);
});

// ✅ Good - single listener
list.addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handleClick(e);
  }
});

// 3. Efficient array operations
// ❌ Bad - multiple iterations
const result = items
  .filter(item => item.active)
  .map(item => item.price)
  .reduce((sum, price) => sum + price, 0);

// ✅ Good - single iteration
const result = items.reduce((sum, item) => {
  return item.active ? sum + item.price : sum;
}, 0);

// 4. Use WeakMap for private data
const privateData = new WeakMap();

class User {
  constructor(name) {
    privateData.set(this, { name });
  }

  getName() {
    return privateData.get(this).name;
  }
}
```

## Network Performance

### Caching Strategies

```javascript
// 1. HTTP Caching
// Server response headers
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');  // Static assets
res.setHeader('Cache-Control', 'private, max-age=300');                 // User data
res.setHeader('Cache-Control', 'no-cache');                             // Always validate

// 2. Service Worker caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/styles/main.css',
        '/scripts/app.js',
        '/images/logo.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Bad response - don't cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone response
        const responseToCache = response.clone();

        caches.open('v1').then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// 3. Client-side caching with React Query
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
    refetchOnWindowFocus: false
  });

  if (isLoading) return <Skeleton />;
  return <Profile user={data} />;
}
```

### Resource Prioritization

```html
<!-- Critical CSS inline -->
<style>
  /* Above-the-fold critical styles */
  body { margin: 0; font-family: sans-serif; }
  .header { height: 60px; background: #333; }
</style>

<!-- Preload critical resources -->
<link rel="preload" href="/app.js" as="script">
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- Defer non-critical scripts -->
<script src="/analytics.js" defer></script>
<script src="/chat-widget.js" async></script>

<!-- Lazy load CSS -->
<link
  rel="stylesheet"
  href="/print.css"
  media="print"
  onload="this.media='all'"
/>
```

### CDN and Edge Caching

```javascript
// Cloudflare Workers - Edge caching
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const cache = caches.default;

  // Check cache first
  let response = await cache.match(request);

  if (!response) {
    // Fetch from origin
    response = await fetch(request);

    // Cache for 1 hour
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=3600');

    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    event.waitUntil(cache.put(request, response.clone()));
  }

  return response;
}
```

## Monitoring and Measurement

### Performance API

```javascript
// Navigation timing
const perfData = performance.getEntriesByType('navigation')[0];

const metrics = {
  dns: perfData.domainLookupEnd - perfData.domainLookupStart,
  tcp: perfData.connectEnd - perfData.connectStart,
  ttfb: perfData.responseStart - perfData.requestStart,
  download: perfData.responseEnd - perfData.responseStart,
  domInteractive: perfData.domInteractive - perfData.fetchStart,
  domComplete: perfData.domComplete - perfData.fetchStart,
  loadComplete: perfData.loadEventEnd - perfData.fetchStart
};

// Resource timing
const resources = performance.getEntriesByType('resource');
resources.forEach(resource => {
  console.log(`${resource.name}: ${resource.duration}ms`);
});

// User timing
performance.mark('task-start');
// ... perform task
performance.mark('task-end');
performance.measure('task-duration', 'task-start', 'task-end');

const measure = performance.getEntriesByName('task-duration')[0];
console.log(`Task took ${measure.duration}ms`);
```

### Real User Monitoring (RUM)

```javascript
// Send metrics to analytics
function sendMetrics() {
  if ('PerformanceObserver' in window) {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];

      sendToAnalytics({
        metric: 'LCP',
        value: lcp.renderTime || lcp.loadTime
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        sendToAnalytics({
          metric: 'FID',
          value: entry.processingStart - entry.startTime
        });
      }
    }).observe({ entryTypes: ['first-input'] });

    // CLS
    let clsScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      }

      sendToAnalytics({
        metric: 'CLS',
        value: clsScore
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

function sendToAnalytics(data) {
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', JSON.stringify(data));
  } else {
    fetch('/analytics', {
      method: 'POST',
      body: JSON.stringify(data),
      keepalive: true
    });
  }
}
```

## Interview Questions

**Q: What are the Core Web Vitals and why do they matter?**

A: Core Web Vitals are user-centric performance metrics:
- **LCP**: Loading performance (< 2.5s)
- **FID**: Interactivity (< 100ms)
- **CLS**: Visual stability (< 0.1)

They matter because they impact SEO rankings and directly correlate with user experience and conversion rates.

**Q: How would you optimize a React app with slow initial load time?**

A: Multi-pronged approach:
1. Code splitting (route-based and component-based)
2. Lazy load non-critical components
3. Optimize bundle size (tree shaking, analyze with webpack-bundle-analyzer)
4. Use SSR/SSG for initial render
5. Compress assets (Gzip/Brotli)
6. Optimize images (WebP, lazy loading)
7. Implement CDN for static assets

**Q: Explain the difference between debouncing and throttling.**

A: Both limit function execution:
- **Debouncing**: Delays execution until after wait period of no calls (e.g., search input - wait until user stops typing)
- **Throttling**: Limits execution to once per time period (e.g., scroll handler - execute max once per 100ms)

**Q: How do you prevent memory leaks in React?**

A: Common strategies:
1. Clean up subscriptions in useEffect return
2. Cancel pending requests on unmount
3. Clear timers/intervals
4. Remove event listeners
5. Use WeakMap for cached data

```javascript
useEffect(() => {
  const subscription = dataSource.subscribe(data => setData(data));
  return () => subscription.unsubscribe();  // Cleanup
}, []);
```

## Best Practices

**Performance Budget:**
- Set maximum bundle size (e.g., 200KB)
- Monitor with CI/CD checks
- Fail builds that exceed budget

**Optimization Priority:**
1. Measure first (don't optimize blindly)
2. Fix render-blocking resources
3. Optimize critical rendering path
4. Defer non-critical resources
5. Implement progressive enhancement

**Tools:**
- Lighthouse (automated audits)
- WebPageTest (detailed analysis)
- Chrome DevTools (profiling)
- webpack-bundle-analyzer (bundle analysis)
- React DevTools Profiler (React performance)

## Summary

- Core Web Vitals (LCP, FID, CLS) are critical for SEO and UX
- Code splitting and lazy loading reduce initial bundle size
- Asset optimization (images, fonts) significantly improves load time
- Caching strategies reduce server load and improve speed
- Measure performance with real user monitoring
- Set performance budgets and monitor in CI/CD
- Optimize critical rendering path first

---
[← Back to SystemDesign](../README.md)
