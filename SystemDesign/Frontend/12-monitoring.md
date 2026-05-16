# Frontend Monitoring and Observability

## 💡 **Concept**

Frontend monitoring answers: "Is the app healthy for real users?" Observability answers: "Why is it broken for this user?" You need both. The three pillars are metrics (performance numbers), errors (what broke), and traces (where time was spent).

**How to answer in an interview:** "I'd instrument with three layers: Real User Monitoring (RUM) for Core Web Vitals, Sentry for error tracking with session replay, and custom business metrics for key conversions. Alerts fire on SLO violations — like LCP degrading — not on individual errors."

---

## The Three Pillars

| Pillar | What it measures | Frontend tool |
|--------|-----------------|--------------|
| **Metrics** | Performance over time (LCP, error rate) | web-vitals, GA4, Datadog RUM |
| **Errors** | Exceptions and stack traces | Sentry, Datadog |
| **Traces** | Where request time was spent | Sentry, OpenTelemetry |

---

## Real User Monitoring (RUM)

Measure Core Web Vitals from real browsers, not synthetic tests.

```typescript
import { onCLS, onFID, onLCP, onINP, onTTFB, type Metric } from "web-vitals";

interface VitalPayload {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  page: string;
}

function sendToAnalytics(metric: Metric): void {
  const payload: VitalPayload = {
    name: metric.name,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    page: window.location.pathname,
  };
  // Send to your analytics endpoint or GA4
  navigator.sendBeacon("/api/vitals", JSON.stringify(payload));
}

// Initialize RUM — call once at app startup
export function initRUM(): void {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

---

## Error Tracking with Sentry

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,           // trace 10% of requests
  replaysSessionSampleRate: 0.05,  // record 5% of sessions
  replaysOnErrorSampleRate: 1.0,   // always record sessions with errors
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,           // PII protection
      blockAllMedia: false,
    }),
  ],
});

// Add user context to every error report
export function identifyUser(user: { id: string; email: string }): void {
  Sentry.setUser({ id: user.id, email: user.email });
}

// Manual error capture with context
export function captureError(error: Error, context: Record<string, unknown>): void {
  Sentry.captureException(error, { extra: context });
}
```

---

## React Error Boundaries

Catch render errors before they blank the page. Log them to Sentry.

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  errorId: string | null;
}

class AppErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorId: null };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const errorId = Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
    this.setState({ errorId });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert">
          <h2>Something went wrong.</h2>
          <p>Error ID: {this.state.errorId}</p>
          <button onClick={() => this.setState({ hasError: false, errorId: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## Custom Business Metrics

Track what matters to the product, not just technical health.

```typescript
interface BusinessMetric {
  event: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

class MetricsClient {
  private queue: BusinessMetric[] = [];
  private flushInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Flush batch every 10 seconds
    this.flushInterval = setInterval(() => this.flush(), 10_000);
    window.addEventListener("beforeunload", () => this.flush());
  }

  track(metric: BusinessMetric): void {
    this.queue.push({ ...metric, metadata: { page: location.pathname, ...metric.metadata } });
    if (this.queue.length >= 20) this.flush();
  }

  private flush(): void {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];
    navigator.sendBeacon("/api/metrics", JSON.stringify(batch));
  }
}

export const metrics = new MetricsClient();

// Usage
metrics.track({ event: "checkout_started" });
metrics.track({ event: "product_viewed", metadata: { productId: "p-123" } });
metrics.track({ event: "purchase_completed", value: 49.99 });
```

---

## Alerting and SLOs

Alert on symptoms (user impact), not on individual error counts.

```typescript
interface FrontendSLO {
  name: string;
  target: number;      // e.g., 95 = 95% of requests must meet threshold
  metric: string;      // e.g., "LCP"
  threshold: number;   // e.g., 2500 ms
  window: "1h" | "24h" | "7d";
}

const slos: FrontendSLO[] = [
  { name: "LCP Good",     metric: "LCP",       target: 95, threshold: 2500, window: "1h" },
  { name: "Error Rate",   metric: "js_errors",  target: 99, threshold: 0,   window: "1h" },
  { name: "INP Good",     metric: "INP",        target: 90, threshold: 200, window: "24h" },
];
```

**Alert on:**
- LCP p75 > 2.5s for 5 consecutive minutes
- JS error rate > 1% of sessions
- Checkout funnel drop > 20% baseline

**Don't alert on:**
- Individual 404s
- Single user errors
- Low-traffic page regressions

---

## Common Mistakes

❌ **Synthetic-only testing** — lab metrics don't reflect slow networks or low-end devices  
❌ **Logging PII in errors** — redact email, names, and tokens before sending to Sentry  
❌ **No sampling** — 100% trace rate causes performance overhead; 1–10% is enough  
❌ **Alert fatigue** — alerting on every error fires constantly; alert on SLO violations instead

**Key insight:**

> Monitoring averages hides tail latency. A 200ms average LCP can coexist with 10% of users experiencing 4s+ LCP. Always track p75 and p95, not mean — and set SLOs on those percentiles.

---
[← Back to SystemDesign](../README.md)
