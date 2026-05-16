# Monitoring & Observability

## 💡 **Concept**

Observability is the ability to understand what a system is doing from its outputs. Three pillars: **metrics** (numbers over time), **logs** (structured events), **traces** (request journeys across services).

**Build observability from day one.** A system you cannot see is a system you cannot debug in production.

---

## The Three Pillars

| Pillar | Question it answers | Examples | Tools |
|---|---|---|---|
| **Metrics** | How many? How fast? How slow? | API latency P99, error rate, RPS | Prometheus, Datadog, CloudWatch |
| **Logs** | What happened? | "User 123 failed login at 14:02" | ELK, Loki, CloudWatch Logs |
| **Traces** | Where did the request go? | HTTP → Auth → DB → Cache | Jaeger, Zipkin, Datadog APM, X-Ray |

---

## RED Method

Every service should expose these three metrics:

| Signal | What to measure | Target |
|---|---|---|
| **Rate** | Requests per second | Know your baseline; alert on 3× spike |
| **Errors** | % of 5xx responses | < 0.1% for production APIs |
| **Duration** | Latency P50 / P95 / P99 | P99 < 500ms for most APIs |

```typescript
interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
}

function recordRequest(
  metrics: MetricsClient,
  endpoint: string,
  statusCode: number,
  durationMs: number
): void {
  const tags = { endpoint, status: String(statusCode) };

  metrics.increment("http.requests", tags);

  if (statusCode >= 500) {
    metrics.increment("http.errors", { endpoint });
  }

  metrics.histogram("http.duration_ms", durationMs, { endpoint });
}
```

---

## SLI / SLO / SLA

| Term | Definition | Example |
|---|---|---|
| **SLI** (Indicator) | A measured metric | P99 latency |
| **SLO** (Objective) | Target value for an SLI | P99 < 500ms for 99.9% of requests |
| **SLA** (Agreement) | Legal contract | 99.9% uptime or credits issued |
| **Error budget** | Allowed failure before SLA breach | 0.1% = 8.7 hours/year |

**Design SLOs before you build.** They tell you what to alert on.

---

## Structured Logging

```typescript
interface LogContext {
  requestId: string;
  userId?: string;
  service: string;
  traceId?: string;
}

interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

function createLogger(ctx: LogContext): Logger {
  const base = {
    service: ctx.service,
    requestId: ctx.requestId,
    userId: ctx.userId,
    traceId: ctx.traceId,
  };

  const log = (level: string, message: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level, message, ...base, ...extra, ts: new Date().toISOString() }));

  return {
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, err, ctx) => log("error", msg, {
      error: err?.message,
      stack: err?.stack,
      ...ctx,
    }),
  };
}

// Output: {"level":"info","message":"Order created","service":"order-api","requestId":"req-abc","orderId":"ord-456","ts":"2024-01-01T14:02:31.000Z"}
```

---

## Distributed Tracing

Every service propagates the trace ID in HTTP headers. This links all logs and spans for one request across all services.

```typescript
interface TraceContext {
  traceId: string;    // shared across all services for one request
  spanId: string;     // unique per service hop
  parentSpanId?: string;
}

function injectTraceHeaders(
  headers: Record<string, string>,
  ctx: TraceContext
): void {
  headers["x-trace-id"] = ctx.traceId;
  headers["x-span-id"] = ctx.spanId;
  if (ctx.parentSpanId) headers["x-parent-span-id"] = ctx.parentSpanId;
}

function extractTraceContext(headers: Record<string, string>): TraceContext {
  return {
    traceId: headers["x-trace-id"] ?? crypto.randomUUID(),
    spanId: crypto.randomUUID(),
    parentSpanId: headers["x-span-id"],
  };
}
```

---

## Alerting Strategy

Alert on **symptoms** (what users experience), not **causes** (why it happens):

| Alert | Trigger | Threshold |
|---|---|---|
| High error rate | Users see errors | 5xx > 1% for 2 min |
| High latency | Slow user experience | P99 > 2s for 5 min |
| Low availability | Service unreachable | < 99% health checks |
| DLQ depth | Processing failures | DLQ depth > 0 |
| Disk / memory | Resource exhaustion | > 85% for 10 min |

**Avoid alert fatigue.** Alert on error budget burn rate (rate at which you're spending your SLO budget), not raw metric values.

---

## Tool Comparison

| | Prometheus + Grafana | Datadog | AWS CloudWatch |
|---|---|---|---|
| **Type** | Open-source, self-hosted | SaaS | AWS-native SaaS |
| **Metrics** | Excellent | Excellent | Good |
| **Logs** | Loki add-on | Excellent | Good |
| **Tracing** | Tempo add-on | Excellent (APM) | AWS X-Ray |
| **Cost** | Infrastructure only | $$$ | Pay per use |
| **Best for** | Cost-conscious, self-hosted | Full observability | AWS-native apps |

---

## When to Use Each Pillar

| Need | Use |
|---|---|
| "Is the system healthy right now?" | Metrics dashboard |
| "What happened at 3pm?" | Logs (Elasticsearch / Loki) |
| "Which service caused the slowdown?" | Traces (Jaeger / Datadog APM) |
| Capacity planning | Metric trends over weeks |
| Cost attribution per team | Metrics with service labels |

---

## Common Mistakes

❌ **Logs without correlation IDs** — you cannot trace a request across services without a shared `requestId` / `traceId` in every log line.

❌ **Alerting on CPU/memory only** — users don't feel CPU. Alert on latency and error rate.

❌ **Averages instead of percentiles** — P99 latency is what your worst-served users experience. P50 hides outliers.

❌ **Unstructured logs** — `console.log("something happened")` is not searchable. Always use JSON structured logs.

✅ **Define SLOs before launch** — without targets, you have no basis for alerting and no way to measure improvement.

---

## Real-World Example

A microservices platform with 20 services uses Prometheus + Grafana for metrics, Loki for logs, and Jaeger for tracing. Every service labels metrics with `service`, `endpoint`, and `environment`. Alerts fire when error budget burn rate exceeds 5× in one hour — paging on-call via PagerDuty. Engineers open the trace ID from the alert in Jaeger and see the payment service taking 4s P99. Logs with the same trace ID reveal a missing database index added in the last deploy. Rollback resolves the incident in 12 minutes.

---

## Key Insight

> Observability is not a feature — it is infrastructure. Logs tell you what happened. Metrics tell you how often. Traces tell you where. You need all three to debug a distributed system.

**Related:** [Microservices: Monitoring](../Microservices/07-monitoring.md) · [Infrastructure: Monitoring](../Infrastructure/07-monitoring.md)

---

[← Back to SystemDesign](../README.md)
