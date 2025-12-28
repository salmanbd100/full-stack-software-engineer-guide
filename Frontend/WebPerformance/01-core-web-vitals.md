# Core Web Vitals

## Overview

Core Web Vitals are a set of standardized metrics from Google that measure real-world user experience on the web. They focus on three critical aspects: loading performance, interactivity, and visual stability. These metrics are crucial for SEO rankings and user satisfaction.

## Table of Contents
- [What are Core Web Vitals](#what-are-core-web-vitals)
- [LCP - Largest Contentful Paint](#lcp---largest-contentful-paint)
- [INP/FID - Interaction to Next Paint](#inp---interaction-to-next-paint)
- [CLS - Cumulative Layout Shift](#cls---cumulative-layout-shift)
- [Measuring Core Web Vitals](#measuring-core-web-vitals)
- [Optimization Strategies](#optimization-strategies)
- [Interview Questions](#interview-questions)

## What are Core Web Vitals

### The Three Pillars

Google's Core Web Vitals consist of three key metrics that measure different aspects of user experience. Each metric targets a specific area: loading performance (how fast content appears), interactivity (how responsive the page feels), and visual stability (how stable the layout is). Understanding these metrics and their thresholds is crucial for optimizing modern web applications, as they directly impact both SEO rankings and user satisfaction.

**LCP (Largest Contentful Paint)** tracks when the largest visible element (usually a hero image or main heading) becomes visible to users. It measures perceived loading speed - when users feel the page has actually loaded.

**INP (Interaction to Next Paint)** replaced FID in 2024 and measures how quickly the page responds to user interactions like clicks, taps, or key presses. Unlike FID which only measured the first interaction, INP tracks all interactions throughout the page lifecycle.

**CLS (Cumulative Layout Shift)** measures visual stability by tracking unexpected movement of visible page content. High CLS frustrates users when buttons or links move just as they're about to click.

```javascript
// Core Web Vitals Metrics
const coreWebVitals = {
  LCP: 'Largest Contentful Paint',      // Loading Performance
  INP: 'Interaction to Next Paint',      // Interactivity (replaced FID)
  CLS: 'Cumulative Layout Shift'         // Visual Stability
};

// Target Thresholds
const thresholds = {
  LCP: { good: 2500, poor: 4000 },       // milliseconds
  INP: { good: 200, poor: 500 },         // milliseconds
  CLS: { good: 0.1, poor: 0.25 }         // score
};
```

### Why They Matter

**Business Impact:**
- 1 second delay in page load = 7% reduction in conversions
- 0.1 second improvement in LCP = 8% increase in conversion rate
- Poor Core Web Vitals = Lower Google search rankings

**User Experience:**
- Faster loading = Better engagement
- Stable layouts = Less frustration
- Responsive interactions = Higher satisfaction

## LCP - Largest Contentful Paint

### What is LCP?

LCP measures loading performance by tracking when the **largest content element** becomes visible in the viewport.

```javascript
// Good LCP: < 2.5s
// Needs Improvement: 2.5s - 4s
// Poor LCP: > 4s

// Elements that can be LCP:
// - <img> elements
// - <image> inside <svg>
// - <video> elements (poster image)
// - Background images with url()
// - Block-level elements with text
```

### Common LCP Elements

The LCP element is typically the most visually prominent piece of content in the viewport when the page first loads. Identifying which element is your LCP is crucial because optimization efforts should focus there for maximum impact. Common LCP elements include hero images, banner backgrounds, large text blocks, or video poster images. The browser automatically detects the largest element, but you need to optimize whichever element ends up being the LCP for your specific page layout.

```html
<!-- Example 1: Hero Image (Most Common) -->
<section class="hero">
  <img src="hero-image.jpg" alt="Hero" />
  <!-- This image is often the LCP element -->
</section>

<!-- Example 2: Text Block -->
<article>
  <h1>Main Headline</h1>
  <p>Large paragraph...</p>
  <!-- H1 or first paragraph might be LCP -->
</article>

<!-- Example 3: Background Image -->
<div style="background-image: url('banner.jpg'); height: 500px;">
  <!-- Background image can be LCP -->
</div>
```

### Identifying LCP Element

Before you can optimize LCP, you need to identify which element is the LCP on your page. The browser provides two methods to track this: the PerformanceObserver API for programmatic access, and the web-vitals library for easier implementation. The PerformanceObserver method gives you real-time data as the page loads, including which specific DOM element is the LCP and when it became visible. This information is essential for debugging and optimization.

```javascript
// Method 1: PerformanceObserver
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP Element:', lastEntry.element);
  console.log('LCP Time:', lastEntry.renderTime || lastEntry.loadTime);
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });

// Method 2: Web Vitals Library
import { onLCP } from 'web-vitals';

onLCP((metric) => {
  console.log('LCP:', metric.value);
  console.log('Element:', metric.entries[metric.entries.length - 1].element);
});
```

### Optimizing LCP

Optimizing LCP requires a multi-faceted approach targeting different aspects of resource loading and rendering. The strategies below address the main causes of slow LCP: large resource sizes, render-blocking resources, slow server response times, and client-side rendering delays. Each technique compounds with the others for maximum effect.

**1. Optimize Images**

Images are the most common LCP element, and optimizing them has the biggest impact. Use modern formats like AVIF or WebP that provide 30-50% better compression than JPEG. Implement responsive images with srcset to serve appropriately sized images for different screen sizes. Most importantly, add the `loading="eager"` and `fetchpriority="high"` attributes to your LCP image to ensure the browser prioritizes loading it over other resources.

```html
<!-- Bad: Large unoptimized image -->
<img src="hero.jpg" alt="Hero" />

<!-- Good: Modern format, responsive, priority -->
<img
  src="hero.avif"
  srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Hero"
  loading="eager"
  fetchpriority="high"
/>
```

**2. Preload Critical Resources**

Preloading tells the browser to start downloading critical resources immediately, even before the HTML parser discovers them. This is especially powerful for LCP images that might be referenced in CSS or lazy-loaded JavaScript. The `fetchpriority="high"` attribute further prioritizes the resource in the browser's loading queue. Preconnecting to external domains reduces DNS and TCP connection time for resources loaded from CDNs or third-party servers.

```html
<!-- Preload LCP image -->
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />

<!-- Preload critical fonts -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />

<!-- Preconnect to CDN -->
<link rel="preconnect" href="https://cdn.example.com" />
```

**3. Optimize Server Response Time**
```javascript
// Use CDN for static assets
const imageUrl = 'https://cdn.example.com/optimized/hero.avif';

// Implement caching
// Cache-Control: public, max-age=31536000, immutable

// Use HTTP/2 Server Push
// Link: </critical.css>; rel=preload; as=style
```

**4. Remove Render-Blocking Resources**

CSS and JavaScript files in the `<head>` block rendering until they're fully loaded. Critical CSS (styles needed for above-the-fold content) should be inlined directly in the HTML, while non-critical CSS can be loaded asynchronously. This allows the browser to start rendering the LCP element immediately without waiting for all stylesheets to download. The trick is identifying which CSS is truly "critical" - typically layout, typography, and styles for visible content.

```html
<!-- Bad: Blocking CSS -->
<link rel="stylesheet" href="styles.css" />

<!-- Good: Critical CSS inline, async rest -->
<style>
  /* Critical above-the-fold CSS */
  .hero { ... }
</style>
<link rel="preload" href="styles.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="styles.css" /></noscript>
```

**5. React/Next.js Optimization**

Modern frameworks like Next.js provide built-in components that automatically implement LCP optimizations. The Next.js Image component handles responsive images, modern formats, lazy loading, and preloading automatically. The `priority` prop specifically tells Next.js that this image is the LCP element and should be loaded with high priority, preloaded, and never lazy-loaded. For React applications, combining lazy loading for below-the-fold components with eager loading for critical content ensures optimal LCP.

```jsx
// Next.js Image Component (automatic optimization)
import Image from 'next/image';

function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority  // Preload LCP image
      quality={90}
    />
  );
}

// React lazy loading for non-critical components
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <>
      {/* Critical content loads immediately */}
      <Hero />

      {/* Non-critical content lazy loads */}
      <Suspense fallback={<div>Loading...</div>}>
        <HeavyComponent />
      </Suspense>
    </>
  );
}
```

## INP - Interaction to Next Paint

### What is INP?

INP measures **responsiveness** by tracking the latency of all user interactions (clicks, taps, keyboard) throughout the page lifecycle. It replaced FID (First Input Delay) in 2024.

```javascript
// Good INP: < 200ms
// Needs Improvement: 200ms - 500ms
// Poor INP: > 500ms

// INP measures:
// - Input delay (time to process event)
// - Processing time (event handler execution)
// - Presentation delay (rendering updates)
```

### INP vs FID

```javascript
// FID (First Input Delay) - OLD
// - Only measured FIRST interaction
// - Only measured input delay (not processing or rendering)

// INP (Interaction to Next Paint) - NEW
// - Measures ALL interactions
// - Includes input delay + processing + rendering
// - More comprehensive responsiveness metric
```

### Measuring INP

To optimize INP, you first need to measure it accurately. The web-vitals library provides an easy way to collect INP data from real users in production. It tracks all user interactions throughout the page lifecycle and reports the worst interaction latency (the 98th percentile). The metric includes not just the time to start processing the event, but also the actual processing time and the time to update the screen. This comprehensive measurement gives you the full picture of interaction responsiveness.

```javascript
// Using Web Vitals Library
import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log('INP:', metric.value);
  console.log('Rating:', metric.rating); // 'good', 'needs-improvement', 'poor'

  // Send to analytics
  sendToAnalytics({
    metric: 'INP',
    value: metric.value,
    rating: metric.rating
  });
});

// Manual PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId > 0) {
      const duration = entry.processingEnd - entry.processingStart;
      console.log('Interaction duration:', duration);
    }
  }
});

observer.observe({ type: 'event', buffered: true, durationThreshold: 0 });
```

### Optimizing INP

Poor INP scores typically result from long-running JavaScript tasks that block the main thread. When JavaScript executes, the browser can't respond to user interactions, leading to delays. The key strategies involve breaking up long tasks, deferring non-essential work, and offloading heavy computation to Web Workers. Each millisecond you free up on the main thread directly improves interaction responsiveness.

**1. Reduce JavaScript Execution Time**

Long-running synchronous tasks block the main thread, preventing the browser from responding to user interactions. Tasks longer than 50ms are considered "long tasks" and significantly impact INP. The solution is to break large operations into smaller chunks, yielding control back to the browser between chunks. This allows the browser to process user interactions even while heavy computation continues. Modern browsers support `scheduler.yield()` which is more efficient than setTimeout for yielding.

```javascript
// Bad: Long synchronous task
function processLargeDataset(data) {
  for (let i = 0; i < data.length; i++) {
    // Heavy processing blocks main thread
    expensiveOperation(data[i]);
  }
}

// Good: Break into chunks with setTimeout
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
      setTimeout(processChunk, 0); // Yield to browser
    }
  }

  processChunk();
}

// Better: Use scheduler.yield() (modern browsers)
async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i++) {
    expensiveOperation(data[i]);

    if (i % 100 === 0) {
      await scheduler.yield(); // Yield to browser
    }
  }
}
```

**2. Debounce and Throttle**

Debouncing and throttling are essential techniques for optimizing events that fire rapidly, like typing, scrolling, or window resizing. Without these techniques, event handlers execute on every single event, potentially hundreds of times per second, overwhelming the main thread. Debouncing waits for a pause in events before executing (ideal for search inputs), while throttling limits execution to a maximum frequency (ideal for scroll handlers). Both dramatically reduce the number of function calls and improve responsiveness.

```javascript
// Debounce: Execute after user stops typing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Usage: Search input
const searchHandler = debounce((query) => {
  fetchSearchResults(query);
}, 300);

input.addEventListener('input', (e) => searchHandler(e.target.value));

// Throttle: Execute at most once per interval
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage: Scroll handler
const scrollHandler = throttle(() => {
  updateScrollPosition();
}, 100);

window.addEventListener('scroll', scrollHandler);
```

**3. Use Web Workers for Heavy Computation**

Web Workers run JavaScript in a separate thread, completely independent of the main thread. This means CPU-intensive operations like data processing, parsing, or complex calculations won't block user interactions. The main thread remains responsive while the Worker handles the heavy lifting in the background. Communication between the main thread and Worker happens via messages, allowing asynchronous data exchange without blocking.

```javascript
// worker.js
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

function heavyComputation(data) {
  // CPU-intensive work
  return processedData;
}

// main.js
const worker = new Worker('worker.js');

button.addEventListener('click', () => {
  // Offload to worker (doesn't block main thread)
  worker.postMessage(largeDataset);
});

worker.addEventListener('message', (e) => {
  displayResults(e.data);
});
```

**4. Optimize React Event Handlers**

In React, creating new function instances on every render causes unnecessary work and can trigger re-renders in child components that depend on those functions. useCallback memoizes function references, ensuring the same function instance is reused across renders. useMemo prevents expensive recalculations by caching computed values. Together, these hooks reduce unnecessary work during user interactions, keeping the main thread available to respond to input quickly.

```jsx
// Bad: Creating new function on every render
function App() {
  return (
    <button onClick={() => handleClick()}>
      Click me
    </button>
  );
}

// Good: Use useCallback
import { useCallback } from 'react';

function App() {
  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  return <button onClick={handleClick}>Click me</button>;
}

// Good: Optimize expensive operations
import { useMemo, useState } from 'react';

function DataTable({ data }) {
  const [sortColumn, setSortColumn] = useState('name');

  // Expensive sorting only recalculates when dependencies change
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      return a[sortColumn] > b[sortColumn] ? 1 : -1;
    });
  }, [data, sortColumn]);

  return <Table data={sortedData} />;
}
```

## CLS - Cumulative Layout Shift

### What is CLS?

CLS measures **visual stability** by tracking unexpected layout shifts that occur during the page's lifetime.

```javascript
// Good CLS: < 0.1
// Needs Improvement: 0.1 - 0.25
// Poor CLS: > 0.25

// CLS Score Calculation:
// layout shift score = impact fraction × distance fraction

// Impact fraction: % of viewport affected
// Distance fraction: Distance element moved / viewport height
```

### Common Causes of CLS

Layout shifts occur when visible elements move unexpectedly during page load or user interaction. The most common causes are images loading without reserved space, dynamic content injection, web fonts swapping, and ads loading asynchronously. Each of these can push existing content down or sideways, frustrating users. The solution is always to reserve space before content loads, either with explicit dimensions, aspect ratios, or minimum heights.

**1. Images/Videos Without Dimensions**

When browsers encounter an image without specified dimensions, they don't know how much space to reserve until the image downloads. This causes the browser to initially allocate no space, then suddenly expand the layout when the image loads, shifting everything below it. Specifying width and height attributes (or using aspect-ratio CSS) tells the browser exactly how much space to reserve, preventing shifts. Modern browsers automatically calculate aspect ratio from width/height attributes.

```html
<!-- Bad: No dimensions -->
<img src="image.jpg" alt="Image" />
<!-- Browser doesn't know size until loaded → layout shift -->

<!-- Good: Specify dimensions -->
<img src="image.jpg" alt="Image" width="800" height="600" />

<!-- Good: Use aspect ratio -->
<img
  src="image.jpg"
  alt="Image"
  style="aspect-ratio: 16/9; width: 100%;"
/>
```

**2. Dynamically Injected Content**

Content that loads asynchronously - especially ads, embeds, or lazy-loaded components - commonly causes layout shifts. When this content appears, it pushes existing content down, harming CLS. The solution is to reserve space for dynamic content before it loads. Use min-height on containers, skeleton screens, or placeholder elements that match the final content's dimensions. This ensures the layout remains stable even as async content populates.

```html
<!-- Bad: Ad loads and pushes content down -->
<article>
  <h1>Article Title</h1>
  <div id="ad-slot"></div> <!-- Ad loads later, causes shift -->
  <p>Article content...</p>
</article>

<!-- Good: Reserve space -->
<article>
  <h1>Article Title</h1>
  <div id="ad-slot" style="min-height: 250px;">
    <!-- Ad loads into reserved space -->
  </div>
  <p>Article content...</p>
</article>
```

**3. Web Fonts Loading**

Web fonts cause layout shifts when text initially renders in a fallback font, then swaps to the custom font once it loads. Different fonts have different metrics (height, width, spacing), so the swap causes text to reflow and shift surrounding content. The `font-display` CSS property controls swap behavior, while preloading ensures fonts load quickly. Better yet, use `size-adjust` to make the fallback font match the custom font's metrics, minimizing shift on swap.

```css
/* Bad: FOUT (Flash of Unstyled Text) causes shift */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
}

body {
  font-family: 'CustomFont', sans-serif;
}

/* Good: Use font-display to control behavior */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: swap; /* or optional */
}

/* Better: Preload critical fonts */
/* <link rel="preload" href="font.woff2" as="font" crossorigin /> */
```

### Measuring CLS

CLS measurement tracks all layout shifts that occur without user interaction throughout the page's lifecycle. The web-vitals library automatically collects these shifts and calculates the cumulative score. Each shift entry includes information about which elements moved, helping you debug the source of shifts. The library also distinguishes between shifts caused by user interaction (which don't count) and unexpected shifts (which do count), ensuring accurate measurement.

```javascript
// Using Web Vitals Library
import { onCLS } from 'web-vitals';

onCLS((metric) => {
  console.log('CLS:', metric.value);
  console.log('Entries:', metric.entries);

  // Log elements causing shifts
  metric.entries.forEach((entry) => {
    console.log('Shifted element:', entry.sources);
  });
});

// Manual PerformanceObserver
let clsScore = 0;

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsScore += entry.value;
      console.log('Layout shift:', entry.value);
      console.log('Elements:', entry.sources);
    }
  }
});

observer.observe({ type: 'layout-shift', buffered: true });
```

### Optimizing CLS

The fundamental principle of CLS optimization is: reserve space before content loads. Every visual element that loads asynchronously needs space allocated for it beforehand. Skeleton screens, placeholder elements, explicit dimensions, and CSS containment all serve this purpose. By ensuring the layout is fully defined before content populates, you eliminate unexpected shifts and create a stable, professional user experience.

**1. Reserve Space for Dynamic Content**

Skeleton loading is a UX pattern that shows placeholder elements matching the shape and size of final content while it loads. This reserves exact space for the incoming content, preventing layout shifts. React components make this pattern easy to implement with conditional rendering - show skeletons during loading states, then swap to real content once loaded. The skeleton and actual content should have identical dimensions to ensure no shift occurs during the transition.

```jsx
// React skeleton loading
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

**2. CSS Aspect Ratio**
```css
/* Modern aspect ratio boxes */
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Fallback for older browsers */
.image-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 ratio */
}

.image-container img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

**3. Avoid Inserting Content Above Existing Content**

Inserting content above existing content (like prepending notifications or banners) is one of the worst CLS culprits because it shifts everything downward. Users might be in the middle of reading or about to click when content suddenly appears, pushing their target away. The solution is to use fixed or absolute positioning for overlays, alerts, and notifications so they appear without affecting document flow. Sticky headers and floating elements avoid shifts by living outside normal layout.

```javascript
// Bad: Prepend notification (pushes content down)
function showNotification(message) {
  const notification = createNotificationElement(message);
  document.body.prepend(notification); // CLS!
}

// Good: Fixed/absolute positioning
function showNotification(message) {
  const notification = createNotificationElement(message);
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  document.body.append(notification); // No CLS!
}
```

**4. Optimize Font Loading**
```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/main-font.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<style>
  @font-face {
    font-family: 'MainFont';
    src: url('/fonts/main-font.woff2') format('woff2');
    font-display: swap; /* Fallback font while loading */
  }

  /* Size adjust to match fallback font */
  @font-face {
    font-family: 'MainFont';
    size-adjust: 105%; /* Adjust to minimize shift */
  }
</style>
```

## Measuring Core Web Vitals

### Using Web Vitals Library

Google's web-vitals JavaScript library is the easiest and most reliable way to measure Core Web Vitals in production. It accurately tracks LCP, INP, and CLS from real user sessions, giving you field data that reflects actual user experiences. The library handles all the complexity of performance measurement APIs and provides callbacks when metrics are available. You can send this data to your analytics platform to track performance over time, identify regressions, and understand how different user segments experience your site.

```bash
npm install web-vitals
```

```javascript
// Complete implementation
import { onCLS, onINP, onLCP } from 'web-vitals';

function sendToAnalytics({ name, value, rating, delta, id }) {
  // Send to Google Analytics
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    event_label: id,
    non_interaction: true,
  });

  // Or send to custom endpoint
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

### Using Chrome DevTools

```javascript
// 1. Open DevTools → Performance tab
// 2. Click Record
// 3. Interact with page
// 4. Stop recording
// 5. Look for:
//    - LCP in "Timings" lane
//    - Long tasks in "Main" lane
//    - Layout shifts in "Experience" lane

// 6. Use Lighthouse
// 7. Generate report for real metrics
```

### Field Data vs Lab Data

```javascript
// Field Data (Real User Monitoring)
// - Actual user experiences
// - Collected via web-vitals library
// - Available in Chrome User Experience Report
// - What Google uses for ranking

// Lab Data (Synthetic Testing)
// - Lighthouse
// - WebPageTest
// - Controlled environment
// - Useful for debugging
// - May differ from field data
```

## Optimization Strategies

### Priority Matrix

```javascript
const optimizationPriority = {
  high: [
    'Optimize LCP element (hero image)',
    'Remove render-blocking resources',
    'Implement image lazy loading',
    'Add image dimensions',
    'Preload critical fonts'
  ],
  medium: [
    'Code splitting',
    'Debounce/throttle event handlers',
    'Optimize JavaScript execution',
    'Implement service worker caching'
  ],
  low: [
    'Fine-tune bundle size',
    'Optimize third-party scripts',
    'Advanced image formats (AVIF)'
  ]
};
```

### Complete Example: Optimized Landing Page

This example demonstrates a production-ready landing page that implements all Core Web Vitals optimizations. The Hero component loads immediately with optimized images using Next.js Image component with priority flag (optimizes LCP). Below-the-fold components like Reviews and Newsletter are lazy-loaded to reduce initial bundle size. Suspense fallbacks reserve space to prevent CLS. Event handlers use useCallback to optimize INP. This architecture ensures excellent Core Web Vitals scores while maintaining good user experience.

```jsx
// app/page.jsx (Next.js 13+)
import Image from 'next/image';
import { Suspense, lazy } from 'react';

// Lazy load below-the-fold components
const Reviews = lazy(() => import('./Reviews'));
const Newsletter = lazy(() => import('./Newsletter'));

export default function LandingPage() {
  return (
    <>
      {/* Critical above-the-fold content */}
      <Hero />

      {/* Non-critical content with lazy loading */}
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
      {/* Optimized LCP element */}
      <Image
        src="/hero.avif"
        alt="Hero Image"
        width={1200}
        height={600}
        priority  // Preload
        quality={90}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
      />

      <h1>Welcome to Our Site</h1>
      <button onClick={handleClick}>Get Started</button>
    </section>
  );
}

// Optimized event handler
import { useCallback } from 'react';

function handleClick() {
  const optimizedHandler = useCallback(() => {
    // Handle click
  }, []);

  return optimizedHandler;
}
```

```html
<!-- index.html head -->
<head>
  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://cdn.example.com" />

  <!-- Preload critical resources -->
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />
  <link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin />

  <!-- Critical CSS inline -->
  <style>
    .hero { min-height: 600px; }
    /* ... critical styles ... */
  </style>

  <!-- Async non-critical CSS -->
  <link rel="preload" href="/styles.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'" />
</head>
```

## Interview Questions

**Q1: What are Core Web Vitals and why do they matter?**
A: Core Web Vitals are Google's standardized metrics for user experience:
- **LCP** (Loading): Measures when main content loads (< 2.5s)
- **INP** (Interactivity): Measures responsiveness to user input (< 200ms)
- **CLS** (Visual Stability): Measures unexpected layout shifts (< 0.1)

**Impact**: Directly affect Google rankings, user engagement, and conversion rates. Pages with good CWV see better SEO and higher user satisfaction.

**Q2: How would you optimize LCP for a hero image?**
A:
```jsx
// 1. Use Next.js Image with priority
<Image src="/hero.avif" priority quality={90} />

// 2. Preload in HTML
<link rel="preload" as="image" href="/hero.avif" />

// 3. Use modern formats (AVIF/WebP)
// 4. Optimize file size (compression)
// 5. Use CDN for fast delivery
// 6. Implement responsive images
<img srcset="hero-400.avif 400w, hero-800.avif 800w" />
```

**Q3: Difference between FID and INP?**
A:
- **FID** (Old): Measured ONLY first interaction input delay
- **INP** (New): Measures ALL interactions including processing and rendering
- INP is more comprehensive and better represents overall responsiveness
- INP replaced FID as a Core Web Vital in March 2024

**Q4: What causes CLS and how do you fix it?**
A: Common causes:
1. **Images without dimensions** → Add width/height attributes
2. **Web fonts loading** → Use font-display: swap, preload fonts
3. **Dynamic content injection** → Reserve space with min-height
4. **Ads** → Set container dimensions before loading

```css
/* Fix with aspect ratio */
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
- **Field Data**: Real user measurements, varies by device/network, what Google uses for ranking
- **Lab Data**: Controlled environment (Lighthouse), consistent but may not reflect real users
- Both are important: Lab for debugging, Field for real-world performance

**Q7: How would you debug a poor INP score?**
A:
```javascript
// 1. Use Performance Observer to find slow interactions
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) {
      console.log('Slow interaction:', entry);
    }
  }
});
observer.observe({ type: 'event', durationThreshold: 200 });

// 2. Solutions:
// - Debounce/throttle event handlers
// - Break long tasks into chunks
// - Use Web Workers for heavy computation
// - Optimize React re-renders with useMemo/useCallback
```

**Q8: What's the critical rendering path and how does it affect CWV?**
A: Sequence of steps browser takes to render page:
1. HTML → DOM
2. CSS → CSSOM
3. DOM + CSSOM → Render Tree
4. Layout → Paint

**Impact on CWV**:
- Blocking CSS/JS delays LCP
- Long JavaScript execution delays INP
- Unoptimized rendering causes CLS

**Optimize**: Minimize blocking resources, inline critical CSS, defer non-critical JS

**Q9: How do you optimize web fonts to prevent CLS?**
A:
```html
<!-- Preload critical fonts -->
<link rel="preload" href="font.woff2" as="font" crossorigin />

<style>
  @font-face {
    font-family: 'MyFont';
    src: url('font.woff2') format('woff2');
    font-display: swap; /* Show fallback immediately */
  }
</style>

<!-- Use CSS font-loading API -->
<script>
  document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
  });
</script>
```

**Q10: What tools do you use for performance optimization?**
A:
- **Lighthouse**: Overall performance score
- **Chrome DevTools**: Performance profiling, network waterfall
- **Web Vitals Library**: Real user monitoring
- **WebPageTest**: Detailed waterfall analysis
- **Bundle Analyzer**: JavaScript bundle size
- **PageSpeed Insights**: Field + lab data

## Summary

**Core Web Vitals Quick Reference:**
- **LCP** < 2.5s: Optimize images, preload resources, reduce server time
- **INP** < 200ms: Debounce/throttle, break long tasks, use Web Workers
- **CLS** < 0.1: Set dimensions, reserve space, optimize fonts

**Optimization Priority:**
1. Fix LCP element (usually hero image)
2. Add image dimensions to prevent CLS
3. Debounce expensive event handlers for INP
4. Preload critical resources
5. Remove render-blocking resources

**Key Takeaways:**
- Core Web Vitals directly impact SEO rankings
- Measure both field (real users) and lab (synthetic) data
- Focus on the biggest impact items first
- Use web-vitals library for production monitoring
- Test on real devices and networks

---

[Next: Lazy Loading →](./02-lazy-loading.md) | [← Back to Web Performance](./README.md)
