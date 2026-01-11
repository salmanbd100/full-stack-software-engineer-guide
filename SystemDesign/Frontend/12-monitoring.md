# Monitoring and Observability

## Overview
Monitoring enables proactive issue detection, performance optimization, and understanding user experience. Effective observability combines metrics, logs, and traces to provide complete visibility into frontend applications.

## 💡 **Three Pillars of Observability**

Comprehensive observability requires collecting metrics, logs, and traces to understand system behavior and diagnose issues.

### 1. Metrics

Quantitative measurements over time.

```javascript
// Custom performance metrics
class PerformanceMonitor {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.metrics = [];
  }

  // Track page load metrics
  trackPageLoad() {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];

      this.track({
        type: 'page_load',
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        ttfb: perfData.responseStart - perfData.requestStart,
        download: perfData.responseEnd - perfData.responseStart,
        domInteractive: perfData.domInteractive,
        domComplete: perfData.domComplete,
        loadComplete: perfData.loadEventEnd
      });
    });
  }

  // Track Core Web Vitals
  trackWebVitals() {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      this.track({
        type: 'lcp',
        value: lastEntry.renderTime || lastEntry.loadTime,
        element: lastEntry.element?.tagName
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.track({
          type: 'fid',
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

      this.track({
        type: 'cls',
        value: clsScore
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Track custom metrics
  track(metric) {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    this.flush();
  }

  // Send metrics to backend
  flush() {
    if (this.metrics.length === 0) return;

    const data = [...this.metrics];
    this.metrics = [];

    navigator.sendBeacon(
      this.endpoint,
      JSON.stringify(data)
    );
  }
}

// Initialize
const monitor = new PerformanceMonitor('/api/metrics');
monitor.trackPageLoad();
monitor.trackWebVitals();
```

### 2. Logs

Detailed event records.

```javascript
// Structured logging
class Logger {
  constructor(context = {}) {
    this.context = context;
    this.endpoint = '/api/logs';
    this.queue = [];
  }

  log(level, message, metadata = {}) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      console[level](message, metadata);
    }

    // Queue for backend
    this.queue.push(logEntry);

    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  info(message, metadata) {
    this.log('info', message, metadata);
  }

  warn(message, metadata) {
    this.log('warn', message, metadata);
  }

  error(message, metadata) {
    this.log('error', message, metadata);
  }

  debug(message, metadata) {
    this.log('debug', message, metadata);
  }

  flush() {
    if (this.queue.length === 0) return;

    const logs = [...this.queue];
    this.queue = [];

    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs }),
      keepalive: true
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
}

// Usage
const logger = new Logger({ app: 'frontend', version: '1.0.0' });

logger.info('User logged in', { userId: '123' });
logger.error('API request failed', {
  endpoint: '/api/products',
  status: 500,
  error: error.message
});
```

### 3. Traces

Distributed request tracking.

```javascript
// Simple trace implementation
class Tracer {
  constructor() {
    this.traceId = this.generateId();
    this.spans = [];
  }

  startSpan(name, attributes = {}) {
    const span = {
      spanId: this.generateId(),
      traceId: this.traceId,
      name,
      startTime: performance.now(),
      attributes
    };

    this.spans.push(span);

    return {
      end: () => {
        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;
      },
      setAttribute: (key, value) => {
        span.attributes[key] = value;
      }
    };
  }

  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  flush() {
    fetch('/api/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traceId: this.traceId,
        spans: this.spans
      }),
      keepalive: true
    });
  }
}

// Usage
const tracer = new Tracer();

async function fetchUserData(userId) {
  const span = tracer.startSpan('fetch_user_data', { userId });

  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();

    span.setAttribute('status', 'success');
    return data;
  } catch (error) {
    span.setAttribute('status', 'error');
    span.setAttribute('error', error.message);
    throw error;
  } finally {
    span.end();
  }
}
```

## Error Tracking

Capturing and reporting application errors with context for debugging and monitoring production issues.

### Error Boundaries (React)

React component lifecycle method for catching errors in component tree and displaying fallback UI.

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Send to Sentry
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>We've been notified and are working on a fix.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### Global Error Handling

Window-level error listeners to catch unhandled errors and promise rejections across the application.

```javascript
// Catch unhandled errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });

  // Send to monitoring service
  sendErrorToMonitoring({
    type: 'unhandled_error',
    message: event.message,
    stack: event.error?.stack,
    url: window.location.href
  });
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  });

  sendErrorToMonitoring({
    type: 'unhandled_rejection',
    reason: String(event.reason),
    url: window.location.href
  });
});

// Network errors
window.addEventListener('error', (event) => {
  if (event.target.tagName === 'IMG') {
    logger.warn('Image failed to load', {
      src: event.target.src
    });
  }
}, true);
```

## Sentry Integration

Industry-standard error tracking.

```javascript
// Initialize Sentry
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',

  // Performance monitoring
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true
    })
  ],

  // Sample rates
  tracesSampleRate: 0.1,        // 10% of transactions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of errors

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: `myapp@${process.env.REACT_APP_VERSION}`,

  // Before send hook
  beforeSend(event, hint) {
    // Filter out errors
    if (event.message?.includes('Script error')) {
      return null;
    }

    // Add custom context
    event.user = {
      id: getCurrentUserId(),
      email: getCurrentUserEmail()
    };

    return event;
  }
});

// Manual error capture
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'checkout',
      action: 'payment'
    },
    extra: {
      orderId: '123',
      amount: 99.99
    }
  });
}

// Add breadcrumbs
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'User clicked checkout button',
  level: 'info'
});

// Set user context
Sentry.setUser({
  id: '123',
  email: 'user@example.com',
  username: 'john_doe'
});

// Set custom tags
Sentry.setTag('page_locale', 'en-US');
Sentry.setContext('character', {
  name: 'John',
  age: 30
});
```

## Performance Monitoring

Tracking real user experience metrics and custom performance marks to identify optimization opportunities.

### Real User Monitoring (RUM)

Collecting actual user interaction data and performance metrics from production environments.

```javascript
// Track user interactions
class UserMonitoring {
  constructor() {
    this.interactions = [];
    this.setupListeners();
  }

  setupListeners() {
    // Track clicks
    document.addEventListener('click', (e) => {
      this.trackInteraction('click', {
        element: e.target.tagName,
        text: e.target.textContent?.substring(0, 50),
        x: e.clientX,
        y: e.clientY
      });
    });

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      this.trackInteraction('visibility_change', {
        visible: !document.hidden
      });
    });

    // Track time on page
    let startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      this.trackInteraction('session_end', {
        duration: Date.now() - startTime
      });
    });
  }

  trackInteraction(type, data) {
    this.interactions.push({
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href
    });

    if (this.interactions.length >= 20) {
      this.flush();
    }
  }

  flush() {
    if (this.interactions.length === 0) return;

    navigator.sendBeacon(
      '/api/user-interactions',
      JSON.stringify(this.interactions)
    );

    this.interactions = [];
  }
}

new UserMonitoring();
```

### Custom Performance Marks

Using Performance API to mark and measure specific application milestones and user interactions.

```javascript
// Mark important events
performance.mark('page-interactive');

// Later, measure time between marks
performance.mark('data-loaded');
performance.measure('data-load-time', 'page-interactive', 'data-loaded');

// Get measurement
const measure = performance.getEntriesByName('data-load-time')[0];
console.log(`Data loaded in ${measure.duration}ms`);

// React hook for performance tracking
function usePerformanceMark(name) {
  useEffect(() => {
    performance.mark(`${name}-start`);

    return () => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const measure = performance.getEntriesByName(name)[0];
      logger.info(`${name} took ${measure.duration}ms`);
    };
  }, [name]);
}

// Usage
function ExpensiveComponent() {
  usePerformanceMark('expensive-component-render');

  return <div>...</div>;
}
```

## Dashboards and Alerting

Building real-time dashboards and automated alerts to monitor application health and respond to incidents.

### Creating Metrics Dashboard

Aggregating and visualizing metrics with percentiles and thresholds for monitoring Core Web Vitals.

```javascript
// Backend aggregation endpoint
app.get('/api/dashboard/metrics', async (req, res) => {
  const { startDate, endDate } = req.query;

  const metrics = await db.collection('metrics').aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          hour: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$timestamp'
            }
          }
        },
        avgValue: { $avg: '$value' },
        p50: { $percentile: { input: '$value', p: [0.5], method: 'approximate' } },
        p95: { $percentile: { input: '$value', p: [0.95], method: 'approximate' } },
        p99: { $percentile: { input: '$value', p: [0.99], method: 'approximate' } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.hour': 1 }
    }
  ]);

  res.json(metrics);
});

// React dashboard component
function MetricsDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchMetrics(timeRange).then(setMetrics);
  }, [timeRange]);

  return (
    <div className="dashboard">
      <h1>Performance Dashboard</h1>

      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

      <div className="metrics-grid">
        <MetricCard
          title="Average LCP"
          value={calculateAverage(metrics, 'lcp')}
          unit="ms"
          threshold={2500}
        />

        <MetricCard
          title="Average FID"
          value={calculateAverage(metrics, 'fid')}
          unit="ms"
          threshold={100}
        />

        <MetricCard
          title="Average CLS"
          value={calculateAverage(metrics, 'cls')}
          threshold={0.1}
        />

        <MetricCard
          title="Error Rate"
          value={calculateErrorRate(metrics)}
          unit="%"
          threshold={1}
        />
      </div>

      <Chart data={metrics} />
    </div>
  );
}
```

### Alerting

Automated monitoring checks with threshold-based notifications to Slack or email for critical issues.

```javascript
// Server-side alert checker
async function checkAlerts() {
  const metrics = await getRecentMetrics('5m');

  // Check error rate
  const errorRate = calculateErrorRate(metrics);
  if (errorRate > 5) {
    await sendAlert({
      severity: 'critical',
      title: 'High Error Rate',
      message: `Error rate at ${errorRate.toFixed(2)}% (threshold: 5%)`,
      tags: ['frontend', 'errors']
    });
  }

  // Check LCP
  const avgLCP = calculateAverage(metrics.filter(m => m.type === 'lcp'));
  if (avgLCP > 4000) {
    await sendAlert({
      severity: 'warning',
      title: 'Slow LCP',
      message: `Average LCP at ${avgLCP}ms (threshold: 4000ms)`,
      tags: ['frontend', 'performance']
    });
  }
}

// Run every 5 minutes
setInterval(checkAlerts, 5 * 60 * 1000);

// Send alert to Slack
async function sendAlert(alert) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `*${alert.severity.toUpperCase()}*: ${alert.title}`,
      attachments: [{
        text: alert.message,
        color: alert.severity === 'critical' ? 'danger' : 'warning'
      }]
    })
  });
}
```

## Browser DevTools Integration

Integrating custom performance tracking with browser DevTools for enhanced debugging in development.

```javascript
// Custom performance panel
if (window.performance && window.performance.mark) {
  // Mark component renders
  const originalRender = React.Component.prototype.render;
  React.Component.prototype.render = function() {
    performance.mark(`${this.constructor.name}-render-start`);
    const result = originalRender.call(this);
    performance.mark(`${this.constructor.name}-render-end`);
    performance.measure(
      `${this.constructor.name}-render`,
      `${this.constructor.name}-render-start`,
      `${this.constructor.name}-render-end`
    );
    return result;
  };
}

// Console warnings in development
if (process.env.NODE_ENV === 'development') {
  // Warn about slow renders
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 16) {  // Slower than 60fps
        console.warn(`Slow render detected: ${entry.name} took ${entry.duration}ms`);
      }
    }
  });

  observer.observe({ entryTypes: ['measure'] });
}
```

## Interview Questions

**Q: What are the three pillars of observability?**

A:
1. **Metrics**: Quantitative data (e.g., LCP, error rate)
2. **Logs**: Detailed event records (e.g., error messages, user actions)
3. **Traces**: Request flow through distributed systems

Together they provide complete visibility into application health and behavior.

**Q: How do you track Core Web Vitals in production?**

A: Using PerformanceObserver API:

```javascript
import { getCLS, getFID, getLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  navigator.sendBeacon('/analytics', JSON.stringify(metric));
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```

**Q: What's the difference between synthetic monitoring and RUM?**

A:
- **Synthetic**: Simulated tests from specific locations (proactive)
  - Tools: Lighthouse, WebPageTest
  - Use: Catch issues before users
- **RUM**: Real user data from production (reactive)
  - Tools: Sentry, Google Analytics
  - Use: Understand actual user experience

Use both: Synthetic for testing, RUM for production insights.

**Q: How do you handle error monitoring at scale?**

A: Strategies:
1. **Sampling**: Don't log every error (e.g., 10% sample rate)
2. **Deduplication**: Group similar errors
3. **Rate limiting**: Prevent logging storms
4. **Filtering**: Ignore known benign errors
5. **Prioritization**: Critical vs warning levels

```javascript
const sampleRate = 0.1;
if (Math.random() < sampleRate) {
  logError(error);
}
```

## Best Practices

**Monitoring:**
- Track Core Web Vitals
- Monitor error rates and types
- Measure API response times
- Track user journeys
- Set up alerts for anomalies

**Error Tracking:**
- Use error boundaries in React
- Capture global errors and unhandled rejections
- Include context (user, session, browser)
- Don't log sensitive data
- Implement error grouping

**Performance:**
- Use PerformanceObserver API
- Track custom metrics relevant to your app
- Monitor both frontend and API performance
- Set performance budgets
- Alert on degradation

**Privacy:**
- Don't log PII without consent
- Anonymize user data
- Respect DNT (Do Not Track)
- Comply with GDPR/privacy laws
- Provide opt-out mechanism

## Summary

- Observability requires metrics, logs, and traces
- Core Web Vitals are critical for user experience
- Error tracking with Sentry provides detailed context
- RUM shows real user experience in production
- Dashboards and alerts enable proactive issue detection
- Balance monitoring detail with performance impact
- Always respect user privacy in monitoring

---
[� Back to SystemDesign](../README.md)
