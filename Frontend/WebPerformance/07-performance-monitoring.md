# Performance Monitoring

## Overview

You can't improve what you can't measure. Monitoring tells you **how fast your site really is for real users** — not just on your fast laptop.

> **Key Truth:**
> Your site may feel instant to you and crawl for a user on an old phone and a weak network. Measurement is the only way to know.

---

## Table of Contents
- [Lab Data vs Field Data](#lab-data-vs-field-data)
- [Lighthouse and Lighthouse CI](#lighthouse-and-lighthouse-ci)
- [The web-vitals Library](#the-web-vitals-library)
- [Performance Observer](#performance-observer)
- [Real User Monitoring](#real-user-monitoring)
- [Interview Questions](#interview-questions)

---

## Lab Data vs Field Data

| Type | What It Is | Best For |
|------|-----------|----------|
| **Lab** | Controlled, repeatable test | Debugging, catching regressions in CI |
| **Field** | Real user measurements | Knowing actual performance (what Google ranks on) |

> **Key Insight:**
> Use lab data in development and CI; use field data for production truth. You need both.

---

## Lighthouse and Lighthouse CI

Lighthouse is Google's free auditing tool. It scores Performance, Accessibility, Best Practices, SEO, and PWA from 0–100.

```bash
npx lighthouse https://example.com --view
```

### 💡 **Catch Regressions in CI**

Lighthouse CI fails the build when performance drops below a budget — so regressions never ship.

```typescript
// lighthouserc.ts
export default {
  ci: {
    collect: { url: ['http://localhost:3000/'], numberOfRuns: 3 },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-byte-weight': ['error', { maxNumericValue: 500_000 }],
      },
    },
  },
};
```

**Common Lighthouse advice and the fix:**

| Lighthouse Says | Do This |
|-----------------|---------|
| "Remove unused JavaScript" | Code split, tree shake |
| "Properly size images" | Responsive `srcset` |
| "Defer offscreen images" | Lazy load |
| "Minimize main-thread work" | Break up long tasks |
| "Avoid excessive DOM size" | Virtualize long lists |

---

## The web-vitals Library

The simplest, most accurate way to measure Core Web Vitals from real users. The current version exports five metric functions — **`onFID` is gone** (FID was retired in 2024).

```typescript
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric): void {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
  });
  navigator.sendBeacon?.('/api/vitals', body) ??
    fetch('/api/vitals', { body, method: 'POST', keepalive: true });
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 💡 **Attribution Build for Debugging**

The attribution build tells you *which element* caused a poor score.

```typescript
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

onLCP((metric) => console.log('LCP element:', metric.attribution.target));
onINP((metric) => console.log('Slow interaction:', metric.attribution.interactionTarget));
onCLS((metric) => console.log('Biggest shift:', metric.attribution.largestShiftTarget));
```

---

## Performance Observer

A browser API that **watches** performance events asynchronously — no polling.

### 💡 **Watch Long Tasks (the cause of poor INP)**

Any task over 50ms blocks the main thread and delays interactions.

```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.log('Long task:', entry.duration, 'ms');
    }
  }
});

observer.observe({ type: 'longtask', buffered: true });
```

### 💡 **Measure Your Own Code**

```typescript
performance.mark('fetch-start');
await fetchData();
performance.mark('fetch-end');

performance.measure('data-fetch', 'fetch-start', 'fetch-end');

const [entry] = performance.getEntriesByName('data-fetch');
console.log('Fetch took', entry.duration, 'ms');
```

You can also read navigation timing for TTFB and other phases:

```typescript
const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
const ttfb = nav.responseStart - nav.requestStart; // good < 600ms
```

---

## Real User Monitoring

RUM collects performance data from actual users in production.

```
Real user loads the site
   ↓ JS collects metrics + errors
   ↓ sent to your analytics endpoint
   ↓ you see real-world performance
```

A minimal RUM setup tracks vitals plus JavaScript errors:

```typescript
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

function report(payload: object): void {
  navigator.sendBeacon('/api/rum', JSON.stringify({
    ...payload,
    url: location.href,
    timestamp: Date.now(),
  }));
}

[onCLS, onINP, onLCP].forEach((fn) =>
  fn((metric: Metric) => report({ type: 'vital', name: metric.name, value: metric.value })),
);

window.addEventListener('error', (e) =>
  report({ type: 'error', message: e.message, source: e.filename }),
);
window.addEventListener('unhandledrejection', (e) =>
  report({ type: 'rejection', reason: String(e.reason) }),
);
```

In practice, tools like **Sentry**, **Datadog**, **New Relic**, or **Vercel Analytics** provide this with dashboards and alerting.

---

## Interview Questions

**Q1: RUM vs synthetic monitoring?**

RUM measures real users in varied real-world conditions — best for production insight. Synthetic monitoring runs scripted tests in a controlled environment — best for debugging and catching regressions in CI. Use both.

**Q2: How do you monitor Core Web Vitals in production?**

Use the `web-vitals` library to capture LCP, INP, and CLS from real users, send them with `navigator.sendBeacon` (survives page unload), aggregate on the backend, and alert on regressions.

**Q3: Why does `web-vitals` no longer export `onFID`?**

FID was deprecated and replaced by INP in March 2024, then removed entirely in September 2024. The library now exports `onCLS`, `onFCP`, `onINP`, `onLCP`, and `onTTFB`.

**Q4: How does Performance Observer beat polling?**

It fires a callback only when a performance entry is recorded, instead of repeatedly calling `performance.getEntries()` on a timer. That's cheaper and doesn't add main-thread work.

**Q5: How do you track what's hurting INP?**

Observe `longtask` entries (>50ms block the main thread) and use the `web-vitals` attribution build, which reports the `interactionTarget` element behind a slow interaction.

**Q6: What is TTFB and what's a good value?**

Time to First Byte — from navigation start to the first response byte (`responseStart - requestStart`). Good is under ~600ms. High TTFB points at slow server or network, not front-end code.

---

## Summary

| Stage | Tool |
|-------|------|
| Development | Lighthouse, DevTools |
| CI/CD | Lighthouse CI with budgets |
| Production | `web-vitals` + RUM (Sentry/Datadog/Vercel) |

> **Remember:**
> - Measure both lab (CI) and field (production) data.
> - Set performance budgets and fail the build on regressions.
> - Capture vitals with `sendBeacon` so they survive page unload.
> - Track trends over time, not one-off snapshots.

---

[← Bundle Optimization](./06-bundle-optimization.md) | [Next: Rendering Optimization →](./08-rendering-optimization.md)
