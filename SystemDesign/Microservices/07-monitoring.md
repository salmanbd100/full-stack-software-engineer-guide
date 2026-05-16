# Monitoring & Observability in Microservices

## 💡 **In a distributed system, a single request touches 10 services. You need traces, not just logs.**

Metrics and centralized logging are covered in [BuildingBlocks/10-monitoring.md](../BuildingBlocks/10-monitoring.md). This file focuses on the microservices-specific layer: **distributed tracing**, **service mesh observability**, and **structured logging** across service boundaries.

---

## The Three Pillars (Microservices Focus)

| Pillar      | What It Answers                            | Key Tool                          |
| ----------- | ------------------------------------------ | --------------------------------- |
| **Metrics** | Is the system healthy right now?           | Prometheus, CloudWatch            |
| **Logs**    | What happened in this service?             | Structured JSON logs + Loki/ELK   |
| **Traces**  | How did this request flow across services? | OpenTelemetry, Jaeger, Zipkin     |

In a monolith, a stack trace pins a bug to a file and line. In microservices, a bug might live in the 4th service of a 7-service request chain. Traces make this visible.

---

## Distributed Tracing

A **trace** represents one end-to-end request. It is made of **spans**. Each service adds a span when it receives and processes the request.

```
Trace ID: abc-123
│
├── Span: API Gateway (12 ms)
│       ↓ propagates Trace ID
├── Span: Order Service (45 ms)
│       ↓ propagates Trace ID
│       ├── Span: DB query orders_db (8 ms)
│       └── Span: HTTP call to Inventory Service (30 ms)
│               ↓ propagates Trace ID
│               └── Span: Inventory Service (25 ms)
│                       └── Span: DB query inventory_db (5 ms)
└── Total: 57 ms end-to-end
```

Without a trace, you see 5 separate log lines with no connection. With a trace, you see one waterfall diagram. Jaeger or Zipkin renders this visually.

---

## OpenTelemetry

**OpenTelemetry (OTel)** is the standard SDK for generating traces, metrics, and logs. It is vendor-neutral. You instrument once and export to Jaeger, Zipkin, Datadog, or any OTel-compatible backend.

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

// Initialize once at service startup — before any other imports
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "order-service",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION ?? "unknown",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();
```

### Adding Trace Context to Requests

The trace propagates via HTTP headers. Every service must **read context from incoming requests** and **write context to outgoing requests**.

```typescript
import { context, trace, propagation, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service");

async function processOrder(req: Request, res: Response): Promise<void> {
  // Extract trace context injected by the upstream caller (or API gateway)
  const parentContext = propagation.extract(context.active(), req.headers);

  await context.with(parentContext, async () => {
    const span = tracer.startSpan("processOrder", {
      attributes: {
        "order.id": req.body.orderId,
        "order.user_id": req.body.userId,
      },
    });

    try {
      const result = await orderService.create(req.body);

      span.setAttribute("order.status", result.status);
      span.setStatus({ code: SpanStatusCode.OK });

      res.json(result);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

// Inject context when calling downstream services
async function callInventoryService(orderId: string): Promise<InventoryResult> {
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers); // adds traceparent, tracestate headers

  const response = await fetch(`${INVENTORY_SERVICE_URL}/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ orderId }),
  });

  return response.json() as Promise<InventoryResult>;
}
```

---

## Structured Logging

Plain text logs are unqueryable at scale. Structured logs are JSON objects. Every log line is parseable.

```typescript
interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  service: string;
  traceId: string;      // links the log to a distributed trace
  spanId: string;
  message: string;
  [key: string]: unknown;
}

function createLogger(serviceName: string) {
  return {
    info(message: string, context: Record<string, unknown> = {}): void {
      const span = trace.getActiveSpan();
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        service: serviceName,
        traceId: span?.spanContext().traceId ?? "",
        spanId: span?.spanContext().spanId ?? "",
        message,
        ...context,
      };
      process.stdout.write(JSON.stringify(entry) + "\n");
    },
    error(message: string, error: Error, context: Record<string, unknown> = {}): void {
      const span = trace.getActiveSpan();
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "error",
        service: serviceName,
        traceId: span?.spanContext().traceId ?? "",
        spanId: span?.spanContext().spanId ?? "",
        message,
        errorName: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
        ...context,
      };
      process.stderr.write(JSON.stringify(entry) + "\n");
    },
  };
}

const logger = createLogger("order-service");

// Usage — every log line is linkable to a trace
logger.info("Order confirmed", { orderId: "ord-456", amount: 129.99 });
logger.error("Payment charge failed", error, { orderId: "ord-456", userId: "usr-789" });
```

The `traceId` field links a log line to its full distributed trace in Jaeger. One click in Grafana Loki takes you to the trace. One click in Jaeger shows every log from that trace.

---

## Service Mesh Observability

A **service mesh** (Istio, Linkerd) injects a **sidecar proxy** (Envoy) next to every service pod. The proxy intercepts all network traffic and reports telemetry automatically.

```
Pod
├── order-service container
└── envoy sidecar proxy ← intercepts all in/out traffic

Envoy reports:
  - Request rate, error rate, latency (p50, p95, p99)
  - Upstream/downstream service names
  - Retry attempts, circuit breaker state
  - mTLS connection status
```

You get traces, metrics, and topology maps **without changing any service code**. Kiali (for Istio) renders the live service graph — who calls whom, error rates, latency.

**Mesh gives you:**
- ✅ Automatic mTLS between services
- ✅ Traffic shaping — canary, A/B at the proxy layer
- ✅ Automatic retries and circuit breaking
- ✅ Golden signals per service pair with zero code changes

---

## Common Mistakes

**❌ Logging without a trace ID**

```typescript
console.log(`Order ${orderId} failed`);
// Which request caused this? In a system handling 10,000 req/s, this is unfindable.
```

**✅ Every log line includes traceId and spanId. Correlate logs to traces.**

---

**❌ Sampling 100% of traces in production**

High-volume services generate millions of spans per minute. Storing all of them is expensive.

**✅ Use tail-based sampling — sample 100% of error traces, 1–5% of success traces. Jaeger and OpenTelemetry Collector support this.**

---

## Key Insight

> A distributed trace is the single most important observability tool in microservices. Instrument with OpenTelemetry once, export to any backend. Propagate the trace context on every outbound call — if one service breaks the chain, you lose visibility for the rest of the request.

---

[← Deployment](./06-deployment.md) | [Next: Resilience →](./08-resilience.md)
