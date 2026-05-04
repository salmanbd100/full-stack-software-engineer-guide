# Core Web Vitals

## Overview

Core Web Vitals are **3 numbers Google uses to measure user experience** on your website. Think of them as a report card from Google. Good scores help your SEO ranking and keep users happy.

> **Why You Should Care:**
> Google uses these scores to decide where your site appears in search results. Bad scores = lower ranking = fewer visitors.

---

## Table of Contents
- [What are Core Web Vitals](#what-are-core-web-vitals)
- [LCP - Largest Contentful Paint](#lcp---largest-contentful-paint)
- [INP - Interaction to Next Paint](#inp---interaction-to-next-paint)
- [CLS - Cumulative Layout Shift](#cls---cumulative-layout-shift)
- [Measuring Core Web Vitals](#measuring-core-web-vitals)
- [Optimization Strategies](#optimization-strategies)
- [Interview Questions](#interview-questions)

---

## What are Core Web Vitals

### 💡 **The Three Pillars**

Core Web Vitals measure 3 things users care about most: **how fast it loads**, **how fast it responds**, and **how stable it looks**.

**The 3 Metrics:**

| Metric | Full Name | What It Measures | Simple Meaning |
|--------|-----------|------------------|----------------|
| **LCP** | Largest Contentful Paint | Loading speed | "Did the main content show up fast?" |
| **INP** | Interaction to Next Paint | Responsiveness | "Did the page respond quickly when I clicked?" |
| **CLS** | Cumulative Layout Shift | Visual stability | "Did things jump around while loading?" |

**Target Thresholds:**

| Metric | ✅ Good | ⚠️ Needs Work | ❌ Poor |
|--------|---------|----------------|---------|
| **LCP** | < 2.5s | 2.5s – 4s | > 4s |
| **INP** | < 200ms | 200ms – 500ms | > 500ms |
| **CLS** | < 0.1 | 0.1 – 0.25 | > 0.25 |

```javascript
// Easy way to remember the limits
const thresholds = {
  LCP: { good: 2500, poor: 4000 },   // milliseconds
  INP: { good: 200, poor: 500 },     // milliseconds
  CLS: { good: 0.1, poor: 0.25 }     // score (lower is better)
};
```

### 💡 **Why They Matter**

**Business Impact:**

- A 1-second delay = 7% fewer conversions
- A 0.1-second LCP improvement = 8% more conversions
- Poor scores = lower Google ranking

**User Experience:**

- ✅ Faster loading → users stay longer
- ✅ Stable layout → less frustration
- ✅ Quick response → users feel the site is "good"

> **Key Insight:**
> Performance is not just about speed. It's about how the site **feels** to use.

---

## LCP - Largest Contentful Paint

### 💡 **What is LCP?**

LCP measures **when the biggest visible thing on your page finishes loading**. Usually this is a hero image or main heading.

**How To Think About It:**

```
You open a page
    ↓
You wait...
    ↓
The big hero image appears  ← This moment is your LCP
    ↓
LCP timer stops
```

**Common LCP Elements:**

- 🖼️ Hero images at the top of the page
- 📝 Big headlines (h1)
- 🎬 Video poster images
- 🎨 Background images set with CSS

### 💡 **Identifying the LCP Element**

Before fixing LCP, you need to find which element is your LCP. Use these tools to detect it.

**Method 1: Performance Observer**

```javascript
// Find which element is your LCP
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP Element:', lastEntry.element);
  console.log('LCP Time:', lastEntry.renderTime || lastEntry.loadTime);
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

**Method 2: Web Vitals Library (Easier)**

```javascript
import { onLCP } from 'web-vitals';

onLCP((metric) => {
  console.log('LCP:', metric.value);
  console.log('Element:', metric.entries[metric.entries.length - 1].element);
});
```

### 💡 **Optimizing LCP**

To make LCP fast, fix these things in order:

**1. Optimize Your Images**

Images are usually the LCP element, so this has the biggest impact.

**❌ Before (Bad):**

```html
<img src="hero.jpg" alt="Hero" />
```

**Problems:**
- Big file size
- No priority hint
- Same size for all devices

**✅ After (Good):**

```html
<img
  src="hero.avif"
  srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Hero"
  loading="eager"
  fetchpriority="high"
/>
```

**Benefits:**
- ✅ Modern format (AVIF) is 50% smaller
- ✅ Right size for each device
- ✅ Browser knows to load this first

**2. Preload Critical Resources**

Tell the browser "load this important file right away."

```html
<!-- Preload the LCP image -->
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />

<!-- Preload important fonts -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />

<!-- Connect early to other servers -->
<link rel="preconnect" href="https://cdn.example.com" />
```

**3. Speed Up Your Server**

```javascript
// Use a CDN to serve files from a server near the user
const imageUrl = 'https://cdn.example.com/optimized/hero.avif';

// Add cache headers so files are saved locally
// Cache-Control: public, max-age=31536000, immutable
```

**4. Remove Render-Blocking CSS/JS**

Files in `<head>` block the page from showing. Inline only the styles you need first.

**❌ Before:**

```html
<!-- This blocks rendering until styles.css loads -->
<link rel="stylesheet" href="styles.css" />
```

**✅ After:**

```html
<!-- Critical styles inline, rest loads later -->
<style>
  /* Only the styles needed for above-the-fold content */
  .hero { ... }
</style>
<link rel="preload" href="styles.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="styles.css" /></noscript>
```

**5. Use Framework Tools (Easiest)**

Modern frameworks like Next.js do most of this for you.

```jsx
import Image from 'next/image';

function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority      // ← This tells Next.js: "this is the LCP"
      quality={90}
    />
  );
}
```

> **Key Insight:**
> Find your LCP element first, then optimize it specifically. Don't waste time on non-LCP elements.

---

## INP - Interaction to Next Paint

### 💡 **What is INP?**

INP measures **how fast your page responds when you click, tap, or type**. It replaced an older metric called FID in 2024.

**How It Works:**

```
You click a button
    ↓
JavaScript runs to handle the click
    ↓
Browser updates the screen
    ↓
INP measures this WHOLE journey
```

### 💡 **INP vs FID (Old vs New)**

| Feature | FID (Old) | INP (New) |
|---------|-----------|-----------|
| **What it measures** | Only the FIRST click | ALL clicks |
| **What it tracks** | Input delay only | Input + processing + rendering |
| **Accuracy** | Limited view | Full picture |

### 💡 **Measuring INP**

```javascript
import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log('INP:', metric.value);
  console.log('Rating:', metric.rating); // 'good', 'needs-improvement', 'poor'

  sendToAnalytics({
    metric: 'INP',
    value: metric.value,
    rating: metric.rating
  });
});
```

### 💡 **Optimizing INP**

Bad INP almost always comes from **JavaScript blocking the main thread**. Fix these things:

**1. Break Up Long JavaScript Tasks**

If a function runs for more than 50ms, the browser can't respond to clicks.

**❌ Before (Blocks the page):**

```javascript
function processLargeDataset(data) {
  for (let i = 0; i < data.length; i++) {
    expensiveOperation(data[i]); // Blocks main thread
  }
}
```

**Problems:**
- Page freezes during processing
- Clicks don't register
- User feels the site is broken

**✅ After (Lets browser breathe):**

```javascript
function processLargeDataset(data) {
  const chunkSize = 100;
  let index = 0;

  function processChunk() {
    const end = Math.min(index + chunkSize, data.length);

    for (let i = index; i < end; i++) {
      expensiveOperation(data[i]);
    }

    index = end;

    if (index < data.length) {
      setTimeout(processChunk, 0); // Let browser handle other work
    }
  }

  processChunk();
}
```

**Benefits:**
- ✅ Browser can respond to clicks between chunks
- ✅ Page feels responsive
- ✅ Same total work, better experience

**Even Better with Modern API:**

```javascript
async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i++) {
    expensiveOperation(data[i]);

    if (i % 100 === 0) {
      await scheduler.yield(); // Modern way to give browser a turn
    }
  }
}
```

**2. Debounce and Throttle Events**

Some events fire many times per second (typing, scrolling). Don't run heavy code every time.

| Pattern | Use This | Why |
|---------|----------|-----|
| Search input | `debounce` | Wait until user stops typing |
| Scroll handler | `throttle` | Run at most once per 100ms |
| Window resize | `debounce` | Wait until resize ends |

```javascript
// Debounce: Wait for typing to stop
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const searchHandler = debounce((query) => {
  fetchSearchResults(query);
}, 300);

input.addEventListener('input', (e) => searchHandler(e.target.value));

// Throttle: At most once per interval
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const scrollHandler = throttle(() => {
  updateScrollPosition();
}, 100);

window.addEventListener('scroll', scrollHandler);
```

**3. Use Web Workers for Heavy Work**

Web Workers run JavaScript in a different thread, so they don't block clicks.

```javascript
// worker.js (runs in separate thread)
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

// main.js (main thread stays responsive)
const worker = new Worker('worker.js');

button.addEventListener('click', () => {
  worker.postMessage(largeDataset);
});

worker.addEventListener('message', (e) => {
  displayResults(e.data);
});
```

**4. Optimize React Event Handlers**

**❌ Before (Creates new function every render):**

```jsx
function App() {
  return (
    <button onClick={() => handleClick()}>
      Click me
    </button>
  );
}
```

**✅ After (Reuses same function):**

```jsx
import { useCallback } from 'react';

function App() {
  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  return <button onClick={handleClick}>Click me</button>;
}
```

**Memoize Expensive Calculations:**

```jsx
import { useMemo, useState } from 'react';

function DataTable({ data }) {
  const [sortColumn, setSortColumn] = useState('name');

  // Only re-sort when data or sort column changes
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      return a[sortColumn] > b[sortColumn] ? 1 : -1;
    });
  }, [data, sortColumn]);

  return <Table data={sortedData} />;
}
```

> **Key Insight:**
> Every millisecond you free up on the main thread = better INP. Watch out for tasks longer than 50ms.

---

## CLS - Cumulative Layout Shift

### 💡 **What is CLS?**

CLS measures **how much the page jumps around while loading**. You know that frustrating moment when you try to click a button and an ad pops up, pushing the button away? That's CLS.

**The Score:**

```
CLS = how much things moved × how far they moved
```

Lower is better. **Good CLS is below 0.1**.

### 💡 **Common Causes of CLS**

The main reason layout shifts happen: **the browser doesn't know how big something will be until it loads**.

**1. Images Without Dimensions**

**❌ Before (Browser doesn't know image size):**

```html
<img src="image.jpg" alt="Image" />
<!-- Image loads → suddenly takes space → everything below jumps -->
```

**✅ After (Browser reserves space):**

```html
<img src="image.jpg" alt="Image" width="800" height="600" />
```

**Or use aspect-ratio (modern way):**

```html
<img
  src="image.jpg"
  alt="Image"
  style="aspect-ratio: 16/9; width: 100%;"
/>
```

**2. Dynamic Content Pushes Things Down**

**❌ Before (Ad pushes content down when it loads):**

```html
<article>
  <h1>Article Title</h1>
  <div id="ad-slot"></div>  <!-- Ad loads → pushes paragraph down -->
  <p>Article content...</p>
</article>
```

**✅ After (Space is reserved):**

```html
<article>
  <h1>Article Title</h1>
  <div id="ad-slot" style="min-height: 250px;">
    <!-- Ad loads into reserved space → no jump -->
  </div>
  <p>Article content...</p>
</article>
```

**3. Web Fonts Cause Text Reflow**

When custom fonts load, text changes size and pushes things around.

**❌ Before:**

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
}

body {
  font-family: 'CustomFont', sans-serif;
}
```

**✅ After:**

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: swap; /* Show fallback right away */
}
```

**Even better — preload the font:**

```html
<link rel="preload" href="font.woff2" as="font" crossorigin />
```

### 💡 **Measuring CLS**

```javascript
import { onCLS } from 'web-vitals';

onCLS((metric) => {
  console.log('CLS:', metric.value);

  // See which elements are shifting
  metric.entries.forEach((entry) => {
    console.log('Shifted element:', entry.sources);
  });
});
```

### 💡 **Optimizing CLS**

**The Golden Rule: Reserve space BEFORE content loads.**

**1. Use Skeleton Screens**

Show a placeholder that looks like the real content.

```jsx
function ProductCard({ loading, product }) {
  if (loading) {
    return (
      <div className="skeleton">
        <div className="skeleton-image" style={{ height: '200px' }} />
        <div className="skeleton-title" style={{ height: '24px' }} />
        <div className="skeleton-price" style={{ height: '20px' }} />
      </div>
    );
  }

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
    </div>
  );
}
```

**2. Use CSS `aspect-ratio`**

```css
/* Modern way (preferred) */
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**3. Don't Insert Content Above Existing Content**

**❌ Before (Pushes everything down):**

```javascript
function showNotification(message) {
  const notification = createNotificationElement(message);
  document.body.prepend(notification); // CAUSES CLS!
}
```

**✅ After (Floats on top):**

```javascript
function showNotification(message) {
  const notification = createNotificationElement(message);
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  document.body.append(notification); // No CLS!
}
```

> **Key Insight:**
> If something will appear later, reserve space for it now. Empty space is better than jumping content.

---

## Measuring Core Web Vitals

### 💡 **The web-vitals Library (Recommended)**

The easiest and most accurate way to measure all 3 metrics from real users.

**Install:**

```bash
npm install web-vitals
```

**Use:**

```javascript
import { onCLS, onINP, onLCP } from 'web-vitals';

function sendToAnalytics({ name, value, rating, delta, id }) {
  // Send to Google Analytics
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    event_label: id,
    non_interaction: true,
  });

  // Or send to your own server
  fetch('/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value, rating, id })
  });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

### 💡 **Field Data vs Lab Data**

| Type | What It Is | When to Use |
|------|-----------|-------------|
| **Field Data** | Real user measurements | What Google uses for ranking |
| **Lab Data** | Tests in controlled setup | For debugging in development |

**Field Data Tools:**
- web-vitals library
- Chrome User Experience Report (CrUX)

**Lab Data Tools:**
- Lighthouse
- WebPageTest
- Chrome DevTools

> **Key Insight:**
> Always test with **field data** because real users experience your site differently than your fast dev machine.

---

## Optimization Strategies

### 💡 **Where to Start (Priority Order)**

| Priority | Action | Impact |
|----------|--------|--------|
| 🔴 **High** | Optimize the LCP image | Biggest win for LCP |
| 🔴 **High** | Add image dimensions | Easy CLS fix |
| 🔴 **High** | Remove render-blocking CSS/JS | Helps LCP |
| 🔴 **High** | Preload critical fonts | Helps both LCP and CLS |
| 🟡 **Medium** | Code splitting | Helps INP |
| 🟡 **Medium** | Debounce/throttle handlers | Helps INP |
| 🟢 **Low** | Use AVIF format | Marginal LCP gain |
| 🟢 **Low** | Optimize third-party scripts | Depends on the script |

### 💡 **Complete Example: Optimized Landing Page**

This Next.js page implements all the best practices.

```jsx
// app/page.jsx
import Image from 'next/image';
import { Suspense, lazy } from 'react';

// Below-the-fold components load lazily
const Reviews = lazy(() => import('./Reviews'));
const Newsletter = lazy(() => import('./Newsletter'));

export default function LandingPage() {
  return (
    <>
      {/* Critical above-the-fold content */}
      <Hero />

      {/* Lazy-loaded sections with reserved space */}
      <Suspense fallback={<div style={{ height: '400px' }} />}>
        <Reviews />
      </Suspense>

      <Suspense fallback={<div style={{ height: '200px' }} />}>
        <Newsletter />
      </Suspense>
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      {/* Optimized LCP image */}
      <Image
        src="/hero.avif"
        alt="Hero Image"
        width={1200}
        height={600}
        priority
        quality={90}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
      />

      <h1>Welcome to Our Site</h1>
      <button onClick={handleClick}>Get Started</button>
    </section>
  );
}
```

```html
<!-- index.html head -->
<head>
  <!-- Connect early to important origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://cdn.example.com" />

  <!-- Preload the LCP image and font -->
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />
  <link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin />

  <!-- Critical CSS inline so the page can render -->
  <style>
    .hero { min-height: 600px; }
    /* ... critical styles ... */
  </style>

  <!-- Non-critical CSS loads asynchronously -->
  <link rel="preload" href="/styles.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'" />
</head>
```

---

## Interview Questions

**Q1: What are Core Web Vitals and why do they matter?**

A: Three metrics from Google that measure user experience:
- **LCP** (Loading): When the main content shows up (< 2.5s)
- **INP** (Interactivity): How fast clicks respond (< 200ms)
- **CLS** (Visual Stability): How much things jump around (< 0.1)

**Why they matter**: They affect Google rankings, user happiness, and conversion rates.

**Q2: How would you optimize LCP for a hero image?**

A:
```jsx
// 1. Use Next.js Image with priority
<Image src="/hero.avif" priority quality={90} />

// 2. Preload it
<link rel="preload" as="image" href="/hero.avif" />

// 3. Use modern formats (AVIF/WebP)
// 4. Compress the file
// 5. Use a CDN
// 6. Use responsive images
<img srcset="hero-400.avif 400w, hero-800.avif 800w" />
```

**Q3: What's the difference between FID and INP?**

A:
| Feature | FID (Old) | INP (New) |
|---------|-----------|-----------|
| Measures | First click only | All clicks |
| Includes | Input delay only | Delay + processing + rendering |

INP replaced FID in March 2024.

**Q4: What causes CLS and how do you fix it?**

A: Common causes and fixes:

| Cause | Fix |
|-------|-----|
| Images without dimensions | Add `width` and `height` |
| Web fonts loading | Use `font-display: swap` |
| Dynamic content | Reserve space with `min-height` |
| Ads | Set container size before loading |

```css
/* Easy fix with aspect-ratio */
img { aspect-ratio: 16/9; width: 100%; }
```

**Q5: How do you measure Core Web Vitals?**

A:
```javascript
// Production: web-vitals library
import { onCLS, onINP, onLCP } from 'web-vitals';

onLCP((metric) => sendToAnalytics(metric));

// Development: Chrome DevTools + Lighthouse
// Field data: Chrome User Experience Report
// Lab testing: Lighthouse, WebPageTest
```

**Q6: What's the difference between field and lab data?**

A:
- **Field Data**: Real users (what Google uses for ranking)
- **Lab Data**: Controlled tests (good for debugging)

Both are useful — lab for debugging, field for real-world performance.

**Q7: How would you debug a poor INP score?**

A:
```javascript
// 1. Find slow interactions
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) {
      console.log('Slow interaction:', entry);
    }
  }
});
observer.observe({ type: 'event', durationThreshold: 200 });

// 2. Common fixes:
// - Debounce/throttle event handlers
// - Break long tasks into chunks
// - Use Web Workers for heavy work
// - Use useMemo/useCallback in React
```

**Q8: What is the critical rendering path?**

A: The steps the browser takes to show the page:

```
HTML → DOM
    ↓
CSS → CSSOM
    ↓
DOM + CSSOM → Render Tree
    ↓
Layout → Paint
```

**Effects on CWV:**
- Blocking CSS/JS slows LCP
- Long JavaScript slows INP
- Bad rendering causes CLS

**Fix**: Inline critical CSS, defer non-critical JS.

**Q9: How do you optimize web fonts to prevent CLS?**

A:
```html
<!-- Preload critical fonts -->
<link rel="preload" href="font.woff2" as="font" crossorigin />

<style>
  @font-face {
    font-family: 'MyFont';
    src: url('font.woff2') format('woff2');
    font-display: swap; /* Show fallback right away */
  }
</style>
```

**Q10: What tools do you use for performance optimization?**

A:
- **Lighthouse**: Overall performance score
- **Chrome DevTools**: Profiling and network analysis
- **Web Vitals Library**: Real user data
- **WebPageTest**: Detailed waterfall view
- **Bundle Analyzer**: Find big JavaScript files
- **PageSpeed Insights**: Both field and lab data

---

## Summary

### Quick Reference

| Metric | Target | How to Optimize |
|--------|--------|-----------------|
| **LCP** | < 2.5s | Optimize images, preload, reduce server time |
| **INP** | < 200ms | Debounce, break long tasks, use Web Workers |
| **CLS** | < 0.1 | Set dimensions, reserve space, optimize fonts |

### Optimization Priority

1. ✅ Fix the LCP element (usually a hero image)
2. ✅ Add dimensions to all images
3. ✅ Debounce expensive event handlers
4. ✅ Preload critical resources
5. ✅ Remove render-blocking resources

### Key Takeaways

> **Remember:**
> - Core Web Vitals affect SEO directly
> - Use **field data** (real users) — not just lab data
> - Focus on the biggest wins first
> - Use the `web-vitals` library in production
> - Test on real devices, not just your fast laptop

---

[Next: Lazy Loading →](./02-lazy-loading.md) | [← Back to Web Performance](./README.md)
