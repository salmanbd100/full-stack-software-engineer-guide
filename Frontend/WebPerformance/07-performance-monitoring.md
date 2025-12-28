# Performance Monitoring

## Overview

Measuring performance is essential for optimization. This guide covers Lighthouse, Web Vitals API, Performance Observer, Real User Monitoring (RUM), and synthetic testing tools to track and improve web performance.

## Table of Contents
- [Lighthouse](#lighthouse)
- [Web Vitals API](#web-vitals-api)
- [Performance Observer](#performance-observer)
- [Real User Monitoring](#real-user-monitoring-rum)
- [Synthetic Testing](#synthetic-testing)
- [Interview Questions](#interview-questions)

## Lighthouse

### Running Lighthouse

Lighthouse is Google's automated performance auditing tool that analyzes your web app across five categories: Performance, Accessibility, Best Practices, SEO, and PWA. It simulates real-world conditions (throttled CPU and network) to provide consistent, repeatable measurements. Lighthouse identifies specific issues with actionable recommendations - not just "your site is slow" but "defer offscreen images to save 500KB". Run Lighthouse in CI/CD pipelines to catch performance regressions before deployment. The programmatic API enables custom testing scenarios and integration with your monitoring infrastructure.

```bash
# CLI
npm install -g lighthouse
lighthouse https://example.com --view

# Programmatic
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

### Lighthouse CI

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

### Key Lighthouse Metrics

```javascript
const lighthouseMetrics = {
  // Performance
  FCP: 'First Contentful Paint',
  LCP: 'Largest Contentful Paint',
  TBT: 'Total Blocking Time',
  CLS: 'Cumulative Layout Shift',
  SI: 'Speed Index',

  // Opportunities
  'unused-javascript': 'Remove unused JavaScript',
  'uses-responsive-images': 'Properly size images',
  'offscreen-images': 'Defer offscreen images',

  // Diagnostics
  'mainthread-work-breakdown': 'Minimize main thread work',
  'bootup-time': 'Reduce JavaScript execution time',
  'dom-size': 'Avoid excessive DOM size'
};
```

## Web Vitals API

### Using web-vitals Library

The web-vitals library provides the easiest way to measure Core Web Vitals and other performance metrics from real users in production. Unlike Lighthouse which provides lab data in controlled conditions, web-vitals captures field data reflecting actual user experiences across diverse devices, networks, and usage patterns. This Real User Monitoring (RUM) approach reveals how your site performs for real users, not just in synthetic tests. Send this data to your analytics platform to track performance over time, segment by user demographics or device types, and correlate performance with business metrics like conversion rates.

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

  // Or custom endpoint
  fetch('/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value, rating, delta, id })
  });
}

// Monitor all metrics
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Attribution for Debugging

```javascript
import { onLCP } from 'web-vitals/attribution';

onLCP((metric) => {
  console.log('LCP:', metric.value);
  console.log('LCP Element:', metric.attribution.element);
  console.log('LCP URL:', metric.attribution.url);
  console.log('LCP Time to First Byte:', metric.attribution.timeToFirstByte);
  console.log('LCP Resource Load Duration:', metric.attribution.resourceLoadDuration);
  console.log('LCP Element Render Delay:', metric.attribution.elementRenderDelay);
});
```

### React Integration

```jsx
import { useEffect } from 'react';
import { onCLS, onINP, onLCP } from 'web-vitals';

function useWebVitals() {
  useEffect(() => {
    const handleMetric = (metric) => {
      // Send to analytics
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

## Performance Observer

### Basic Usage

The Performance Observer API provides efficient access to browser performance measurements without polling. Instead of repeatedly calling `performance.getEntries()`, you register an observer that asynchronously notifies you when new performance entries are recorded. This approach has minimal performance impact compared to polling. Observers can track various entry types: navigation timing, resource timing, paint timing, layout shifts, and user-defined marks/measures. The buffered option retrieves entries that occurred before the observer was created, ensuring you don't miss early page events.

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

### Monitoring Different Entry Types

```javascript
// Navigation timing
const navObserver = new PerformanceObserver((list) => {
  const [entry] = list.getEntries();
  console.log('DNS lookup:', entry.domainLookupEnd - entry.domainLookupStart);
  console.log('TCP connection:', entry.connectEnd - entry.connectStart);
  console.log('Request:', entry.responseStart - entry.requestStart);
  console.log('Response:', entry.responseEnd - entry.responseStart);
  console.log('DOM processing:', entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart);
});

navObserver.observe({ type: 'navigation', buffered: true });

// Resource timing
const resObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('Resource:', entry.name);
    console.log('Duration:', entry.duration);
    console.log('Size:', entry.transferSize);
  });
});

resObserver.observe({ type: 'resource', buffered: true });

// Long tasks
const longTaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('Long task:', entry.duration, 'ms');
    console.log('Attribution:', entry.attribution);
  });
});

longTaskObserver.observe({ type: 'longtask', buffered: true });
```

### Custom Performance Marks

```javascript
// Mark specific points
performance.mark('start-data-fetch');

await fetchData();

performance.mark('end-data-fetch');

// Measure duration between marks
performance.measure('data-fetch-duration', 'start-data-fetch', 'end-data-fetch');

// Get measurement
const measure = performance.getEntriesByName('data-fetch-duration')[0];
console.log('Data fetch took:', measure.duration, 'ms');

// Observe custom measurements
const measureObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}:`, entry.duration, 'ms');
  });
});

measureObserver.observe({ type: 'measure', buffered: true });
```

## Real User Monitoring (RUM)

### Basic RUM Implementation

```javascript
class PerformanceMonitor {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.metrics = {};

    this.init();
  }

  init() {
    // Monitor page load
    window.addEventListener('load', () => {
      this.collectNavigationMetrics();
    });

    // Monitor Core Web Vitals
    import('web-vitals').then(({ onCLS, onINP, onLCP }) => {
      onCLS(this.sendMetric.bind(this));
      onINP(this.sendMetric.bind(this));
      onLCP(this.sendMetric.bind(this));
    });

    // Monitor errors
    window.addEventListener('error', this.handleError.bind(this));

    // Monitor unhandled promise rejections
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
      keepalive: true  // Send even if page is unloading
    });
  }
}

// Initialize
new PerformanceMonitor('/api/performance');
```

### Google Analytics 4 Integration

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

## Synthetic Testing

### WebPageTest

```javascript
// Using WebPageTest API
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

### Puppeteer Performance Testing

```javascript
const puppeteer = require('puppeteer');

async function measurePerformance(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Collect metrics
  const metrics = {};

  // Navigation timing
  await page.goto(url, { waitUntil: 'networkidle2' });

  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  metrics.loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
  metrics.domContentLoaded = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;

  // Get Lighthouse metrics
  const { metrics: lighthouseMetrics } = await page.metrics();
  metrics.JSHeapSize = lighthouseMetrics.JSHeapUsedSize;
  metrics.DOMNodes = lighthouseMetrics.Nodes;

  await browser.close();

  return metrics;
}

measurePerformance('https://example.com').then(console.log);
```

## Interview Questions

**Q1: What is the difference between RUM and synthetic monitoring?**
A:
- **RUM (Real User Monitoring)**: Measures actual user experiences, real devices/networks, shows true performance
- **Synthetic**: Controlled lab environment, consistent testing, good for debugging

Use both: Synthetic for development, RUM for production insights.

**Q2: How do you implement Core Web Vitals monitoring?**
```javascript
import { onCLS, onINP, onLCP } from 'web-vitals';

onCLS((metric) => sendToAnalytics(metric));
onINP((metric) => sendToAnalytics(metric));
onLCP((metric) => sendToAnalytics(metric));
```

**Q3: What metrics does Lighthouse measure?**
A:
- **Performance**: LCP, TBT, CLS, FCP, Speed Index
- **Accessibility**: ARIA, contrast, alt text
- **Best Practices**: HTTPS, console errors, deprecated APIs
- **SEO**: Meta tags, crawlability
- **PWA**: Service worker, manifest

**Q4: How does Performance Observer work?**
```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.name, entry.duration);
  });
});

observer.observe({ type: 'measure', buffered: true });
```
Observes performance events asynchronously without polling.

**Q5: What's the difference between User Timing API and Performance Observer?**
A:
- **User Timing**: Create custom marks/measures (`performance.mark()`)
- **Performance Observer**: Listen to performance events

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
A: Time from navigation start to first byte of response.

```javascript
const perfData = performance.getEntriesByType('navigation')[0];
const ttfb = perfData.responseStart - perfData.requestStart;

// Good: < 600ms
// Poor: > 1800ms
```
Indicates server response time.

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
Long tasks (> 50ms) block main thread and impact INP.

**Q9: What tools are available for performance monitoring?**
A:
- **Browser DevTools**: Performance panel, Network tab
- **Lighthouse**: Automated auditing
- **Web Vitals**: JavaScript library for CWV
- **WebPageTest**: Detailed waterfall analysis
- **Google PageSpeed Insights**: Field + lab data
- **Chrome UX Report**: Real user data from Chrome
- **Sentry/DataDog**: Production monitoring
- **New Relic**: APM and RUM

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

// 3. Monitor all vitals
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);

// 4. Aggregate and analyze in backend
// 5. Set up alerts for regressions
```

## Summary

**Monitoring Strategies:**
- **Development**: Lighthouse, DevTools
- **CI/CD**: Lighthouse CI, performance budgets
- **Production**: RUM with web-vitals library
- **Testing**: WebPageTest, Puppeteer

**Key Metrics to Track:**
- Core Web Vitals (LCP, INP, CLS)
- FCP, TTFB
- Bundle size
- Resource loading times
- Error rates

**Best Practices:**
- Monitor both lab and field data
- Set performance budgets
- Track metrics over time
- Alert on regressions
- Test on real devices/networks

---

[← Bundle Optimization](./06-bundle-optimization.md) | [Next: Rendering Optimization →](./08-rendering-optimization.md)
