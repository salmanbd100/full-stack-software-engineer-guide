# Performance Optimization

## 💡 **Concept**

Frontend performance is measured by Core Web Vitals — Google's user-centric metrics that affect both SEO and conversion rates. A 100ms delay reduces conversions by 7%. Performance is an architecture concern, not an afterthought.

**How to answer in an interview:** "I'd target the three Core Web Vitals first — LCP, FID/INP, and CLS. Then I'd apply code splitting for bundle size, optimize images with modern formats, add caching layers, and instrument with RUM to catch regressions."

---

## Core Web Vitals

| Metric | Measures | Good | Poor |
|--------|----------|------|------|
| **LCP** (Largest Contentful Paint) | Load speed | < 2.5 s | > 4.0 s |
| **FID / INP** (Interaction to Next Paint) | Interactivity | < 100 ms | > 300 ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | < 0.1 | > 0.25 |

---

## LCP — Largest Contentful Paint

Optimize the hero image or above-fold text block.

```typescript
// Measure LCP programmatically
function observeLCP(onReport: (value: number) => void): void {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1] as LargestContentfulPaint;
    onReport(last.renderTime || last.loadTime);
  });
  observer.observe({ type: "largest-contentful-paint", buffered: true });
}
```

**LCP fixes:**

| Problem | Fix |
|---------|-----|
| Slow server | CDN + edge caching |
| Hero image slow | `fetchpriority="high"`, WebP/AVIF, `<link rel="preload">` |
| Render-blocking JS/CSS | Code split, defer non-critical scripts |
| No CDN | Put static assets behind CloudFront |

```html
<!-- Preload LCP image — eliminates discovery delay -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
```

---

## FID / INP — Interactivity

Long JavaScript tasks block the main thread. Break them up.

```typescript
// ❌ Blocks main thread for entire list
function processOrders(orders: Order[]): void {
  orders.forEach((order) => heavyTransform(order));
}

// ✅ Yields to browser between chunks
async function processOrdersAsync(orders: Order[]): Promise<void> {
  const CHUNK_SIZE = 50;
  for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
    const chunk = orders.slice(i, i + CHUNK_SIZE);
    chunk.forEach((order) => heavyTransform(order));
    await new Promise((resolve) => setTimeout(resolve, 0)); // yield
  }
}
```

---

## CLS — Cumulative Layout Shift

Reserve space for images and async content before they load.

```typescript
// ❌ No dimensions — image causes layout shift when it loads
<img src="/product.webp" alt="Product" />

// ✅ Width/height prevent CLS (browser reserves space)
<img src="/product.webp" alt="Product" width={400} height={300} loading="lazy" />
```

```css
/* Reserve space for dynamic content like ads or async UI */
.ad-slot { min-height: 250px; }
```

---

## Code Splitting

Never ship one large bundle. Split by route and by heavy component.

```typescript
import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Route-level splitting — each page loads its own chunk
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings  = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}

// Component-level splitting for heavy libraries
const RichTextEditor = lazy(() => import("./components/RichTextEditor")); // ~300KB
```

---

## Image Optimization

Images are 50–70% of page weight. Optimize format, size, and loading.

```typescript
// Next.js Image — automatic WebP conversion, responsive srcset, lazy loading
import Image from "next/image";

function ProductCard({ product }: { product: Product }) {
  return (
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={400}
      height={300}
      placeholder="blur"
      blurDataURL={product.blurDataUrl}
      sizes="(max-width: 768px) 100vw, 400px"
      priority={product.isFeatured}   // preload above-fold images
    />
  );
}
```

**Format decision:**
- Photos → WebP (25–35% smaller than JPEG), AVIF for modern browsers
- Icons → SVG
- Animations → WebP (better than GIF)

---

## Bundle Size

```typescript
// ❌ Imports entire lodash — 70 KB
import _ from "lodash";

// ✅ Tree-shakeable — only imports debounce
import { debounce } from "lodash-es";

// ❌ Moment.js — 232 KB
import moment from "moment";

// ✅ date-fns — 13 KB, tree-shakeable
import { format, addDays } from "date-fns";

// Analyze your bundle: run webpack-bundle-analyzer or @next/bundle-analyzer
```

---

## Caching Strategy

| Asset type | Cache header | TTL |
|------------|--------------|-----|
| JS/CSS (hashed name) | `Cache-Control: public, max-age=31536000, immutable` | 1 year |
| HTML | `Cache-Control: no-cache` | Always revalidate |
| API responses | React Query `staleTime` | 5–30 min |
| Images | `Cache-Control: public, max-age=86400` | 1 day |

---

## Common Mistakes

❌ **Measuring averages instead of percentiles** — p99 reveals tail latency that averages hide  
❌ **`loading="lazy"` on above-fold images** — delays LCP; use `loading="eager"` for the hero  
❌ **No bundle analysis** — unknown bloat often exceeds 30% of bundle size  
❌ **Shipping JS for static content** — consider SSG or Islands Architecture

**Key insight:**

> LCP is usually the highest-impact win. Preload the hero image, serve it from a CDN, and use WebP format. Those three changes alone often move LCP from "poor" to "good."

---
[← Back to SystemDesign](../README.md)
