# Performance Monitoring

## Overview

You can't improve what you can't measure. Performance monitoring tools tell you **how fast your site really is** for real users, not just on your fast laptop.

> **Key Truth:**
> Your site might feel fast to you, but slow for users on old phones with poor networks. Real measurement is the only way to know.

---

## Table of Contents
- [Lab Data vs Field Data](#lab-data-vs-field-data)
- [Lighthouse](#lighthouse)
- [Web Vitals API](#web-vitals-api)
- [Performance Observer](#performance-observer)
- [Real User Monitoring](#real-user-monitoring-rum)
- [Synthetic Testing](#synthetic-testing)
- [Interview Questions](#interview-questions)

---

## Lab Data vs Field Data

### 💡 **Two Types of Performance Data**

| Type | What It Is | Best For |
|------|-----------|----------|
| **Lab Data** | Tests in a controlled environment | Debugging, CI/CD checks |
| **Field Data** | Real user measurements | Knowing how it actually performs |

```
Lab Data (Lighthouse, WebPageTest)
    ↓
Same conditions every test
    ↓
Good for catching regressions

Field Data (web-vitals library, CrUX)
    ↓
Real users, varied conditions
    ↓
Truth about user experience
```

> **Key Insight:**
> Use **lab data** for development and CI. Use **field data** for production reality.

---

## Lighthouse

### 💡 **What is Lighthouse?**

Google's free performance testing tool. Gives you a 0-100 score in 5 categories:

| Category | What It Measures |
|----------|-----------------|
| **Performance** | Loading speed, responsiveness |
| **Accessibility** | A11y for all users |
| **Best Practices** | Modern web standards |
| **SEO** | Search engine optimization |
| **PWA** | Progressive Web App features |

### 💡 **Running Lighthouse**

**CLI:**

```bash
npm install -g lighthouse
lighthouse https://example.com --view
```

**Programmatic:**

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { logLevel: 'info', output: 'html', port: chrome.port };
  const runnerResult = await lighthouse(url, options);

  console.log('Performance score:', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();
}
```

### 💡 **Lighthouse CI (Catch Regressions)**

Run Lighthouse automatically on every commit so you catch performance drops before they ship.

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Build
        run: |
          npm install
          npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      startServerCommand: 'npm run serve',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

### 💡 **Key Lighthouse Metrics**

| Metric | What It Means |
|--------|---------------|
| **FCP** | First Contentful Paint — when first content appears |
| **LCP** | Largest Contentful Paint — when main content loads |
| **TBT** | Total Blocking Time — how long page is frozen |
| **CLS** | Cumulative Layout Shift — how much things move |
| **SI** | Speed Index — how quickly content becomes visible |

**Common Recommendations:**

| Lighthouse Says | What to Do |
|----------------|-----------|
| "Remove unused JavaScript" | Code split, tree shake |
| "Properly size images" | Use responsive images |
| "Defer offscreen images" | Lazy load |
| "Minimize main thread work" | Optimize JavaScript |
| "Reduce JavaScript execution time" | Split, defer, optimize |
| "Avoid excessive DOM size" | Virtualize long lists |

---

## Web Vitals API

### 💡 **The web-vitals Library**

The simplest and most accurate way to measure Core Web Vitals from real users.

```bash
npm install web-vitals
```

```javascript
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, rating, delta, id }) {
  // Send to Google Analytics
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    event_label: id,
    non_interaction: true
  });

  // Or your own endpoint
  fetch('/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value, rating, delta, id })
  });
}

// Track all metrics
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 💡 **Attribution for Debugging**

The `attribution` build gives you deeper info — which element caused the issue.

```javascript
import { onLCP } from 'web-vitals/attribution';

onLCP((metric) => {
  console.log('LCP:', metric.value);
  console.log('LCP Element:', metric.attribution.element);
  console.log('LCP URL:', metric.attribution.url);
  console.log('Time to First Byte:', metric.attribution.timeToFirstByte);
  console.log('Resource Load Duration:', metric.attribution.resourceLoadDuration);
  console.log('Element Render Delay:', metric.attribution.elementRenderDelay);
});
```

### 💡 **React Integration**

```jsx
import { useEffect } from 'react';
import { onCLS, onINP, onLCP } from 'web-vitals';

function useWebVitals() {
  useEffect(() => {
    const handleMetric = (metric) => {
      window.gtag?.('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
        event_label: metric.id,
        non_interaction: true
      });
    };

    onCLS(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
  }, []);
}

function App() {
  useWebVitals();
  return <div>App Content</div>;
}
```

---

## Performance Observer

### 💡 **What is Performance Observer?**

A browser API that **watches** performance events without polling.

**Why It's Better Than Polling:**

| Approach | Performance | When |
|----------|-------------|------|
| Repeatedly check `performance.getEntries()` | ❌ Wasteful | Old way |
| `PerformanceObserver` | ✅ Efficient | Modern way |

### 💡 **Basic Usage**

```javascript
// Observe LCP
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
  console.log('LCP Element:', lastEntry.element);
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

### 💡 **Different Entry Types**

You can observe many different performance events:

```javascript
// Navigation timing — page load details
const navObserver = new PerformanceObserver((list) => {
  const [entry] = list.getEntries();
  console.log('DNS lookup:', entry.domainLookupEnd - entry.domainLookupStart);
  console.log('TCP connection:', entry.connectEnd - entry.connectStart);
  console.log('Request:', entry.responseStart - entry.requestStart);
  console.log('Response:', entry.responseEnd - entry.responseStart);
});

navObserver.observe({ type: 'navigation', buffered: true });

// Resource timing — every file loaded
const resObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('Resource:', entry.name);
    console.log('Duration:', entry.duration);
    console.log('Size:', entry.transferSize);
  });
});

resObserver.observe({ type: 'resource', buffered: true });

// Long tasks — anything blocking > 50ms
const longTaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('Long task:', entry.duration, 'ms');
    console.log('Attribution:', entry.attribution);
  });
});

longTaskObserver.observe({ type: 'longtask', buffered: true });
```

### 💡 **Custom Performance Marks**

Measure your own code with `performance.mark()` and `performance.measure()`.

```javascript
// Mark specific points in time
performance.mark('start-data-fetch');

await fetchData();

performance.mark('end-data-fetch');

// Measure the time between marks
performance.measure('data-fetch-duration', 'start-data-fetch', 'end-data-fetch');

// Get the result
const measure = performance.getEntriesByName('data-fetch-duration')[0];
console.log('Data fetch took:', measure.duration, 'ms');

// Or observe measurements as they happen
const measureObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}:`, entry.duration, 'ms');
  });
});

measureObserver.observe({ type: 'measure', buffered: true });
```

---

## Real User Monitoring (RUM)

### 💡 **What is RUM?**

RUM = **Real User Monitoring**. You collect performance data from actual users in production.

```
Real user loads your site
    ↓
JavaScript collects performance data
    ↓
Data sent to your analytics
    ↓
You see real-world performance
```

### 💡 **Complete RUM Implementation**

```javascript
class PerformanceMonitor {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.metrics = {};

    this.init();
  }

  init() {
    // Page load timing
    window.addEventListener('load', () => {
      this.collectNavigationMetrics();
    });

    // Core Web Vitals
    import('web-vitals').then(({ onCLS, onINP, onLCP }) => {
      onCLS(this.sendMetric.bind(this));
      onINP(this.sendMetric.bind(this));
      onLCP(this.sendMetric.bind(this));
    });

    // JavaScript errors
    window.addEventListener('error', this.handleError.bind(this));

    // Promise rejections
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
  }

  collectNavigationMetrics() {
    const perfData = performance.getEntriesByType('navigation')[0];

    this.metrics = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      request: perfData.responseStart - perfData.requestStart,
      response: perfData.responseEnd - perfData.responseStart,
      dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      load: perfData.loadEventEnd - perfData.loadEventStart
    };

    this.send();
  }

  sendMetric(metric) {
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web-vital',
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  }

  handleError(event) {
    this.send({
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  handleRejection(event) {
    this.send({
      type: 'unhandled-rejection',
      reason: event.reason
    });
  }

  send(data = this.metrics) {
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }),
      keepalive: true  // Send even if page is closing
    });
  }
}

new PerformanceMonitor('/api/performance');
```

### 💡 **Google Analytics 4 Integration**

```javascript
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToGoogleAnalytics({ name, value, rating, delta, id }) {
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    event_label: id,
    non_interaction: true
  });
}

onCLS(sendToGoogleAnalytics);
onFCP(sendToGoogleAnalytics);
onINP(sendToGoogleAnalytics);
onLCP(sendToGoogleAnalytics);
onTTFB(sendToGoogleAnalytics);
```

---

## Synthetic Testing

### 💡 **What is Synthetic Testing?**

Synthetic = scripted tests that simulate users. Run them on a schedule to catch regressions.

### 💡 **WebPageTest**

Detailed performance testing service.

```javascript
const WebPageTest = require('webpagetest');
const wpt = new WebPageTest('www.webpagetest.org', API_KEY);

async function runTest(url) {
  return new Promise((resolve, reject) => {
    wpt.runTest(url, {
      location: 'Dulles:Chrome',
      connectivity: '4G',
      runs: 3,
      video: true,
      lighthouse: true
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

const result = await runTest('https://example.com');
console.log('Speed Index:', result.data.median.firstView.SpeedIndex);
console.log('LCP:', result.data.median.firstView.chromeUserTiming.LargestContentfulPaint);
```

### 💡 **Puppeteer (Custom Tests)**

```javascript
const puppeteer = require('puppeteer');

async function measurePerformance(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  const metrics = {
    loadTime: performanceTiming.loadEventEnd - performanceTiming.navigationStart,
    domContentLoaded: performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart
  };

  const { metrics: chromeMetrics } = await page.metrics();
  metrics.JSHeapSize = chromeMetrics.JSHeapUsedSize;
  metrics.DOMNodes = chromeMetrics.Nodes;

  await browser.close();
  return metrics;
}

measurePerformance('https://example.com').then(console.log);
```

---

## Interview Questions

**Q1: What is the difference between RUM and synthetic monitoring?**

| Feature | RUM | Synthetic |
|---------|-----|-----------|
| Data source | Real users | Scripted tests |
| Conditions | Varied (real world) | Controlled |
| Best for | Production insights | Debugging, CI |

Use both: synthetic for development, RUM for real-world insights.

**Q2: How do you implement Core Web Vitals monitoring?**

```javascript
import { onCLS, onINP, onLCP } from 'web-vitals';

onCLS((metric) => sendToAnalytics(metric));
onINP((metric) => sendToAnalytics(metric));
onLCP((metric) => sendToAnalytics(metric));
```

**Q3: What does Lighthouse measure?**

| Category | Metrics |
|----------|---------|
| Performance | LCP, TBT, CLS, FCP, Speed Index |
| Accessibility | ARIA, contrast, alt text |
| Best Practices | HTTPS, console errors |
| SEO | Meta tags, crawlability |
| PWA | Service worker, manifest |

**Q4: How does Performance Observer work?**

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.name, entry.duration);
  });
});

observer.observe({ type: 'measure', buffered: true });
```

Watches performance events asynchronously. No polling needed.

**Q5: User Timing API vs Performance Observer?**

| Tool | Purpose |
|------|---------|
| **User Timing** | Create your own marks/measures |
| **Performance Observer** | Listen to performance events |

Used together:

```javascript
performance.mark('start');
// ... code ...
performance.mark('end');
performance.measure('duration', 'start', 'end');

// Observer collects the measure
```

**Q6: How do you set performance budgets?**

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-byte-weight': ['error', { maxNumericValue: 500000 }]
      }
    }
  }
};
```

**Q7: What's Time to First Byte (TTFB)?**

A: Time from navigation start to receiving the first byte from the server.

```javascript
const perfData = performance.getEntriesByType('navigation')[0];
const ttfb = perfData.responseStart - perfData.requestStart;
```

| Rating | Threshold |
|--------|-----------|
| ✅ Good | < 600ms |
| ❌ Poor | > 1800ms |

Indicates server response speed.

**Q8: How do you track long tasks?**

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 50) {
      console.log('Long task:', entry.duration, 'ms');
      sendToAnalytics({
        name: 'long-task',
        duration: entry.duration
      });
    }
  });
});

observer.observe({ type: 'longtask', buffered: true });
```

Long tasks (> 50ms) block the main thread and hurt INP.

**Q9: What tools are available for performance monitoring?**

| Tool | Purpose |
|------|---------|
| **Browser DevTools** | Profiling, network analysis |
| **Lighthouse** | Automated auditing |
| **Web Vitals** | JavaScript library for CWV |
| **WebPageTest** | Detailed waterfall view |
| **Google PageSpeed Insights** | Field + lab data |
| **Chrome UX Report** | Real Chrome user data |
| **Sentry/DataDog** | Production monitoring |
| **New Relic** | APM and RUM |

**Q10: How do you monitor performance in production?**

```javascript
// 1. Web Vitals library
import { onCLS, onINP, onLCP } from 'web-vitals';

// 2. Send to analytics
function sendToAnalytics(metric) {
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
    keepalive: true
  });
}

// 3. Track all vitals
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);

// 4. Aggregate in your backend
// 5. Alert on regressions
```

---

## Summary

### Monitoring Strategies

| Stage | Tool |
|-------|------|
| **Development** | Lighthouse, DevTools |
| **CI/CD** | Lighthouse CI, performance budgets |
| **Production** | RUM with web-vitals library |
| **Testing** | WebPageTest, Puppeteer |

### Key Metrics to Track

- ✅ Core Web Vitals (LCP, INP, CLS)
- ✅ FCP, TTFB
- ✅ Bundle size
- ✅ Resource loading times
- ✅ Error rates

### Best Practices

- ✅ Monitor both lab and field data
- ✅ Set performance budgets
- ✅ Track over time, not just snapshots
- ✅ Alert on regressions
- ✅ Test on real devices and slow networks

> **Key Insight:**
> Performance monitoring is not "set and forget." Check metrics regularly and act on what you see.

---

[← Bundle Optimization](./06-bundle-optimization.md) | [Next: Rendering Optimization →](./08-rendering-optimization.md)
