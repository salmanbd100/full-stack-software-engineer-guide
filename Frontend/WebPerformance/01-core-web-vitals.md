# Core Web Vitals

## Overview

Core Web Vitals are the **3 numbers Google uses to score real user experience** on your site. Good scores help SEO and keep users happy.

> **Why You Should Care:**
> Google uses these scores to rank pages. Bad scores mean lower ranking and fewer visitors.

---

## Table of Contents
- [The Three Metrics](#the-three-metrics)
- [LCP — Largest Contentful Paint](#lcp--largest-contentful-paint)
- [INP — Interaction to Next Paint](#inp--interaction-to-next-paint)
- [CLS — Cumulative Layout Shift](#cls--cumulative-layout-shift)
- [Measuring Core Web Vitals](#measuring-core-web-vitals)
- [Optimization Priority](#optimization-priority)
- [Interview Questions](#interview-questions)

---

## The Three Metrics

Core Web Vitals measure the 3 things users feel most: **how fast it loads**, **how fast it responds**, and **how stable it looks**.

| Metric | Full Name | Measures | Plain Meaning |
|--------|-----------|----------|---------------|
| **LCP** | Largest Contentful Paint | Loading | "Did the main content show up fast?" |
| **INP** | Interaction to Next Paint | Responsiveness | "Did the page react quickly when I clicked?" |
| **CLS** | Cumulative Layout Shift | Visual stability | "Did things jump around while loading?" |

**Target Thresholds (memorize these):**

| Metric | ✅ Good | ⚠️ Needs Work | ❌ Poor |
|--------|---------|----------------|---------|
| **LCP** | < 2.5s | 2.5s – 4s | > 4s |
| **INP** | < 200ms | 200ms – 500ms | > 500ms |
| **CLS** | < 0.1 | 0.1 – 0.25 | > 0.25 |

```typescript
// The numbers worth remembering
const thresholds = {
  LCP: { good: 2500, poor: 4000 }, // milliseconds
  INP: { good: 200, poor: 500 },   // milliseconds
  CLS: { good: 0.1, poor: 0.25 },  // unitless score (lower is better)
} as const;
```

> **Key Insight:**
> Google scores you at the **75th percentile** of real users. A metric is "Good" only when 75% of visits hit the target.

---

## LCP — Largest Contentful Paint

LCP measures **when the biggest visible element finishes rendering**. Usually this is a hero image or a large headline.

**Common LCP elements:** hero images, large `<h1>` text, video poster images, CSS background images.

### 💡 **Find Your LCP Element First**

You can't fix LCP until you know which element it is.

```typescript
import { onLCP, type LCPMetric } from 'web-vitals/attribution';

onLCP((metric: LCPMetric) => {
  console.log('LCP value:', metric.value);
  console.log('LCP element:', metric.attribution.target); // CSS selector
});
```

### 💡 **Optimizing LCP**

Fix these in order of impact:

**1. Optimize the LCP image** (usually the biggest win)

```html
<!-- ❌ Before: heavy, no priority, one size for all -->
<img src="hero.jpg" alt="Hero" />

<!-- ✅ After: modern format, responsive, prioritized -->
<img
  src="hero.avif"
  srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Hero"
  fetchpriority="high"
/>
```

**2. Preload critical resources**

```html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preconnect" href="https://cdn.example.com" />
```

**3. Cut render-blocking CSS/JS** — inline only the styles needed for above-the-fold content, defer the rest.

**4. Speed up the server** — use a CDN and long cache headers so bytes arrive sooner.

**5. Let the framework help** — Next.js handles most of this:

```tsx
import Image from 'next/image';

function Hero(): JSX.Element {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority // marks this as the LCP image
      quality={90}
    />
  );
}
```

> **Key Insight:**
> Find your LCP element, then optimize that one element. Don't waste time on things below the fold.

---

## INP — Interaction to Next Paint

INP measures **how fast the page responds to clicks, taps, and key presses**. It replaced FID in March 2024, and FID was fully removed in September 2024.

```
You click → JS runs → browser paints the result
            └──────── INP measures this whole journey ────────┘
```

INP watches **every** interaction (not just the first, like the old FID) and reports the worst.

### 💡 **Optimizing INP**

Bad INP almost always means **JavaScript is blocking the main thread**.

**1. Break up long tasks** — any task over 50ms blocks input.

```typescript
// ❌ Before: one long loop freezes the page
function processAll(data: number[]): void {
  for (const item of data) expensiveWork(item);
}

// ✅ After: yield to the browser between chunks
async function processAll(data: number[]): Promise<void> {
  for (let i = 0; i < data.length; i++) {
    expensiveWork(data[i]);
    // Modern API: give the browser a turn (falls back to setTimeout)
    if (i % 100 === 0) await scheduler.yield();
  }
}
```

**2. Debounce and throttle high-frequency events**

| Event | Use | Why |
|-------|-----|-----|
| Search input | `debounce` | Wait until typing stops |
| Scroll handler | `throttle` | Run at most once per interval |
| Window resize | `debounce` | Wait until resize ends |

**3. Move heavy work to a Web Worker** so the main thread stays free for input.

**4. In React, keep handlers cheap** and memoize expensive work:

```tsx
import { useMemo, useState } from 'react';

interface Row { id: string; name: string; }

function DataTable({ data }: { data: Row[] }): JSX.Element {
  const [sortKey, setSortKey] = useState<keyof Row>('name');

  // Re-sort only when inputs change, not on every render
  const sorted = useMemo<Row[]>(
    () => [...data].sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1)),
    [data, sortKey],
  );

  return <Table data={sorted} />;
}
```

> **Key Insight:**
> Every millisecond freed on the main thread improves INP. Hunt for tasks longer than 50ms.

---

## CLS — Cumulative Layout Shift

CLS measures **how much the page jumps around while loading**. That moment when you go to click a button and an ad pushes it away — that is CLS.

The root cause is almost always: **the browser doesn't know how big something will be until it loads**.

**1. Always set image dimensions**

```html
<!-- ❌ No size → content jumps when the image loads -->
<img src="image.jpg" alt="Image" />

<!-- ✅ Reserve the space up front -->
<img src="image.jpg" alt="Image" width="800" height="600" />

<!-- ✅ Or with modern CSS -->
<img src="image.jpg" alt="Image" style="aspect-ratio: 16 / 9; width: 100%;" />
```

**2. Reserve space for dynamic content** (ads, embeds, banners)

```html
<div id="ad-slot" style="min-height: 250px;"><!-- ad loads here, no jump --></div>
```

**3. Stop web fonts from reflowing text**

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* show fallback immediately, swap when ready */
}
```

**4. Don't insert content above what the user is reading** — show notifications with `position: fixed` instead of pushing the page down.

> **Key Insight:**
> If something will appear later, reserve its space now. Empty space beats jumping content.

---

## Measuring Core Web Vitals

The `web-vitals` library is the easiest and most accurate way to measure all three from real users.

```typescript
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric): void {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,
  });
  // `sendBeacon` survives page unload; fetch fallback for older browsers
  navigator.sendBeacon?.('/api/vitals', body) ??
    fetch('/api/vitals', { body, method: 'POST', keepalive: true });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

### 💡 **Field Data vs Lab Data**

| Type | What It Is | Use For |
|------|-----------|---------|
| **Field** | Real user measurements | What Google ranks on |
| **Lab** | Controlled test (Lighthouse) | Debugging in development |

> **Key Insight:**
> Always trust **field data**. Real users on mid-range phones and slow networks see a very different site than your fast laptop.

---

## Optimization Priority

| Priority | Action | Helps |
|----------|--------|-------|
| 🔴 High | Optimize the LCP image | LCP |
| 🔴 High | Add width/height to all images | CLS |
| 🔴 High | Remove render-blocking CSS/JS | LCP |
| 🔴 High | Preload critical fonts (`font-display: swap`) | LCP + CLS |
| 🟡 Medium | Break up long tasks, debounce/throttle | INP |
| 🟡 Medium | Code splitting | INP |
| 🟢 Low | Switch to AVIF | LCP (small gain) |

---

## Interview Questions

**Q1: What are Core Web Vitals and why do they matter?**

Three field metrics from Google: **LCP** (loading, < 2.5s), **INP** (responsiveness, < 200ms), and **CLS** (visual stability, < 0.1). They affect search ranking, user retention, and conversions. Google scores at the 75th percentile of real users.

**Q2: How would you optimize LCP for a hero image?**

Use a modern format (AVIF/WebP), serve responsive sizes with `srcset`, add `fetchpriority="high"`, preload it, serve from a CDN, and remove render-blocking resources. In Next.js, the `priority` prop on `<Image>` does most of this.

**Q3: What replaced FID, and why?**

INP replaced FID in March 2024. FID measured only the delay of the **first** interaction. INP measures the full delay-plus-processing-plus-render time of **all** interactions, giving a truer picture of responsiveness.

**Q4: What causes CLS and how do you fix it?**

| Cause | Fix |
|-------|-----|
| Images without dimensions | Set `width`/`height` or `aspect-ratio` |
| Web fonts reflowing text | `font-display: swap` + preload |
| Dynamic content (ads) | Reserve space with `min-height` |
| Content inserted above the fold | Use `position: fixed` overlays |

**Q5: How do you debug a poor INP score?**

```typescript
// Log slow interactions in the field
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) console.log('Slow interaction:', entry);
  }
});
observer.observe({ type: 'event', durationThreshold: 200 } as PerformanceObserverInit);
```

Then break up long tasks, debounce handlers, move work to a Web Worker, or memoize in React.

**Q6: Field data vs lab data?**

Field data is from real users (what Google ranks on); lab data is a controlled test (good for debugging and CI). Use lab to catch regressions early, field to know real-world performance.

---

## Summary

| Metric | Target | How to Optimize |
|--------|--------|-----------------|
| **LCP** | < 2.5s | Optimize the LCP image, preload, cut blocking resources |
| **INP** | < 200ms | Break up long tasks, debounce, Web Workers |
| **CLS** | < 0.1 | Set dimensions, reserve space, `font-display: swap` |

> **Remember:**
> - Core Web Vitals directly affect SEO.
> - Trust **field data** (real users), not just lab scores.
> - Fix the biggest wins first: LCP image and image dimensions.
> - Measure in production with the `web-vitals` library.

---

[Next: Lazy Loading →](./02-lazy-loading.md) | [← Back to Web Performance](./README.md)
