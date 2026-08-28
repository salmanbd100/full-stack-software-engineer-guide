---
title: AWS X-Ray & Distributed Tracing
part: 8
chapter: 0
slug: xray
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-03
tags: [devops, monitoring, xray]
in_book: false
---

# AWS X-Ray & Distributed Tracing

Tracing answers the question metrics cannot: in a request that touched eight services, **where did the time go?**

## Why Tracing Exists

In a monolith, a stack trace tells you everything. In microservices, one user request becomes a tree of calls across services owned by different teams.

```
❌ Without tracing — "checkout is slow"
   Check the API dashboard.  Looks fine.
   Check payments dashboard. Looks fine.
   Check the database.       Looks fine.
   ...each service is individually healthy, the request is still slow.
```

```
✅ With tracing — one trace shows it immediately
Trace: POST /checkout (1,240ms)
├── api-gateway                1,240ms
    ├── auth-service              45ms
    ├── cart-service              80ms
    └── payment-service        1,100ms  ← here
        ├── fraud-check           120ms
        └── stripe API            960ms  ← actually here
```

> Metrics tell you a service is slow. Traces tell you **which** service, and which call inside it.

## Core Concepts

| Term | Meaning |
|------|---------|
| **Trace** | One request's full journey, identified by a trace ID |
| **Segment** | The work done by one service |
| **Subsegment** | A unit inside a segment — a database call, an HTTP call |
| **Annotation** | Indexed key-value — ✅ **filterable** |
| **Metadata** | Non-indexed key-value — visible but not searchable |
| **Service map** | Auto-generated graph of service dependencies |

🔴 **Annotation vs metadata is the most common X-Ray interview question.**

```typescript
import * as AWSXRay from "aws-xray-sdk-core";

const segment = AWSXRay.getSegment();

// ✅ Annotation — indexed, so you can filter traces by it. Keep it low cardinality.
segment?.addAnnotation("customer_tier", "enterprise");
segment?.addAnnotation("payment_provider", "stripe");

// ✅ Metadata — not indexed. Use for detail you want to read, not search.
segment?.addMetadata("request_body", { itemCount: 47, currency: "GBP" });
```

Then you can filter:

```
annotation.customer_tier = "enterprise" AND responsetime > 2
```

⚠️ You **cannot** filter on metadata. If you need to search by it, it must be an annotation — but annotations are indexed, so the cardinality rules apply: no user IDs, no request IDs.

## Context Propagation

Tracing only works if the trace ID travels with the request. X-Ray uses the `X-Amzn-Trace-Id` header.

```
X-Amzn-Trace-Id: Root=1-5f9a2b3c-4d5e6f7a8b9c0d1e;Parent=53995c3f42cd8ad8;Sampled=1
                      │                              │                    │
                      trace ID                       parent span          sampling decision
```

🔴 **The number one reason traces appear broken:** a service does not forward the header, so the trace splits into two unrelated fragments.

✅ Instrument the HTTP client, not just the server. The SDK does this automatically if you wrap your client:

```typescript
import * as AWSXRay from "aws-xray-sdk-core";
import * as http from "http";

// Wrapping http means outgoing calls carry the trace header automatically
AWSXRay.captureHTTPsGlobal(http);

// Wrapping the AWS SDK traces every AWS API call as a subsegment
import { S3Client } from "@aws-sdk/client-s3";
const s3 = AWSXRay.captureAWSv3Client(new S3Client({}));
```

## Sampling

You cannot trace every request at scale, and you would not want to pay for it.

**Default X-Ray rule:** 1 request per second, plus 5% of everything above that.

```json
{
  "version": 2,
  "rules": [
    {
      "description": "Trace all checkout requests",
      "host": "*",
      "http_method": "POST",
      "url_path": "/checkout*",
      "fixed_target": 10,
      "rate": 1.0,
      "priority": 100
    },
    {
      "description": "Health checks are noise",
      "http_method": "GET",
      "url_path": "/health",
      "fixed_target": 0,
      "rate": 0.0,
      "priority": 50
    }
  ],
  "default": { "fixed_target": 1, "rate": 0.05 }
}
```

| Field | Meaning |
|-------|---------|
| `fixed_target` | Trace this many requests per second regardless |
| `rate` | Fraction of the remainder to trace |
| `priority` | Lower number wins |

✅ **Sampling strategy that works:** exclude health checks entirely, sample normal traffic lightly, and trace business-critical paths at 100%.

**Head-based vs tail-based:**

| | Head-based | Tail-based |
|---|---|---|
| **Decision made** | At the first span | After the trace completes |
| **X-Ray native** | ✅ Yes | ❌ No |
| **Catches rare errors** | 🔴 Only by luck | ✅ Always |
| **Needs** | Nothing | A collector buffering spans |

🔴 **X-Ray is head-based**, which means a 1-in-10,000 error is probably not sampled — exactly the trace you wanted. To get tail-based sampling, run the **OpenTelemetry Collector** with the `tail_sampling` processor in front of X-Ray.

## Correlating Traces With Logs

This is what makes the metric → trace → log workflow actually work.

```typescript
interface LogFields {
  level: string;
  message: string;
  trace_id?: string;
}

function log(level: string, message: string): void {
  const segment = AWSXRay.getSegment();

  const entry: LogFields = {
    level,
    message,
    // ✅ Put the trace ID in every log line
    trace_id: segment?.trace_id,
  };

  console.log(JSON.stringify(entry));
}
```

Then in CloudWatch Logs Insights:

```sql
fields @timestamp, service, @message
| filter trace_id = "1-5f9a2b3c-4d5e6f7a8b9c0d1e"
| sort @timestamp asc
```

✅ One query returns every log line from every service for that single request. Without the trace ID, you are matching timestamps across log groups by hand.

## OpenTelemetry — the Direction of Travel

**OpenTelemetry (OTel)** is the vendor-neutral CNCF standard for traces, metrics, and logs. It has effectively won.

```
Application (OTel SDK)
        ↓
ADOT Collector  ──┬──► X-Ray
                  ├──► Amazon Managed Prometheus
                  └──► Jaeger / Datadog / Honeycomb
```

| | X-Ray SDK | OpenTelemetry |
|---|---|---|
| **Lock-in** | 🔴 AWS only | ✅ Portable |
| **Backends** | X-Ray | Any, several at once |
| **Tail sampling** | ❌ | ✅ Via the Collector |
| **Status** | ⚠️ Effectively legacy | ✅ AWS's recommended path |

✅ **AWS Distro for OpenTelemetry (ADOT)** is AWS's supported OTel distribution. For anything new, instrument with OTel and export to X-Ray — you keep the AWS integration and can change backend later without touching application code.

```yaml
# ADOT Collector — tail sampling, then export to X-Ray
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: keep-all-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: keep-slow-requests
        type: latency
        latency: { threshold_ms: 1000 }
      - name: sample-the-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }

exporters:
  awsxray:
    region: eu-west-1

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [awsxray]
```

> That config is the answer to X-Ray's biggest weakness: **100% of errors and slow requests kept, 5% of the boring ones.**

## Service Map

X-Ray builds a dependency graph automatically from trace data.

```
[ users ] → [ api-gateway ] → [ auth ]     ✅ 12ms   0.01%
                            → [ cart ]     ✅ 80ms   0.02%
                            → [ payments ] 🔴 1.1s   4.2%
                                         → [ stripe ] 🔴 960ms
```

✅ What the service map is genuinely good for:

- Finding the slow node in a chain without reading dashboards
- Discovering dependencies nobody documented
- Spotting a service calling another one it should not

⚠️ It only shows what is instrumented. An uninstrumented service appears as a gap, and the map looks wrong rather than incomplete.

## Common Problems

| Symptom | Cause | Fix |
|---------|-------|-----|
| Trace splits into fragments | A service drops `X-Amzn-Trace-Id` | Instrument the HTTP client |
| No traces at all | Missing IAM permission | Add `AWSXRayDaemonWriteAccess` |
| Errors never appear in traces | Head-based sampling missed them | Tail sampling via ADOT |
| Trace has service gaps | An uninstrumented service in the path | Instrument it |
| Cannot filter by a field | It was added as metadata | Make it an annotation |
| High X-Ray cost | Tracing health checks | Sampling rule with `rate: 0` |
| Lambda traces missing subsegments | Active tracing not enabled | `tracing_config { mode = "Active" }` |

## Interview Q&A

**Q: What problem does distributed tracing solve that metrics do not?**

Metrics are aggregates, so they can tell you that a service's p99 latency has risen but not which part of a specific request consumed the time. In a microservices architecture one user action fans out across many services, and it is entirely possible for every service's own dashboard to look healthy while the end-to-end request is slow — because each contributes a tolerable amount, or because the slowness is in a specific downstream call that the service-level metric averages away. A trace follows one request across every hop and shows the latency of each span, so you can see immediately that payments took 1.1 seconds of a 1.24-second request, and that 960 milliseconds of that was a call to Stripe. It turns an investigation across six dashboards into reading one waterfall.

**Q: What is the difference between an annotation and metadata in X-Ray?**

Annotations are indexed, so you can filter and search traces by them; metadata is stored and displayed but not indexed, so it is not searchable. That makes the choice a design decision about how you will use the data. If you want to answer "show me all slow traces from enterprise customers", `customer_tier` has to be an annotation. If you just want to see the request body when you have already found the trace, metadata is correct and cheaper. Because annotations are indexed, the usual cardinality discipline applies — bounded values like tier, region, or provider name are fine, but user IDs or request IDs as annotations recreate the cardinality problem. Those go in metadata, or in the correlated logs.

**Q: X-Ray uses head-based sampling. Why is that a problem, and what do you do about it?**

Head-based means the sampling decision is made at the very first span, before anything is known about how the request turns out. So with a 5% sampling rate, a rare error that happens once in ten thousand requests has a 5% chance of being traced — which means the trace you most wanted almost certainly does not exist. Tail-based sampling fixes this by buffering all spans for a trace, waiting for it to complete, and then deciding based on the outcome. X-Ray does not do this natively, so the answer is to run the AWS Distro for OpenTelemetry Collector in front of it with the `tail_sampling` processor: policies that keep 100% of traces containing an error, 100% of traces above a latency threshold, and a small probabilistic sample of everything else. You get complete coverage of the interesting traces at a fraction of the cost of tracing everything.

**Q: A trace shows up as two separate fragments. What went wrong?**

Context propagation broke. X-Ray passes the trace context in the `X-Amzn-Trace-Id` header, and if a service receives that header but does not forward it on its outgoing calls, the downstream service starts a brand new trace with a new root ID. You end up with two traces that are actually one request, and the service map shows a gap. The usual cause is instrumenting the inbound side only — the middleware that creates a segment for incoming requests is in place, but the HTTP client making outbound calls has not been wrapped. The fix is to instrument the client too, which the SDK does when you wrap the http module and the AWS SDK clients. It also happens at boundaries like SQS or EventBridge, where the context has to be carried in message attributes rather than headers.

**Q: Would you use the X-Ray SDK or OpenTelemetry for a new service?**

OpenTelemetry, through the AWS Distro for OpenTelemetry. It is the CNCF standard, it is what AWS itself now recommends, and it means the instrumentation in the application is not tied to a backend — you export to X-Ray today and could add or move to Jaeger, Datadog, or Honeycomb by changing collector configuration rather than redeploying every service. Practically, it also unlocks tail-based sampling through the collector, which is X-Ray's most significant gap. The X-Ray SDK still works and there is no urgency to rewrite existing services, but it is effectively legacy and it locks the application code to one vendor for no benefit. The one thing OTel costs you is running the collector, which on EKS is a DaemonSet or sidecar and on Lambda is a layer.

**Q: How do you connect a trace to the logs for the same request?**

By writing the trace ID into every log line as a structured field. The tracing SDK exposes the current segment's trace ID, so the logging wrapper reads it and includes `trace_id` in the JSON it emits. Once that is in place, finding everything about one request is a single Logs Insights query filtering on that trace ID, and it returns lines from every service in timestamp order. This is the piece that makes the metric-to-trace-to-log workflow real: an alert on error rate leads you to a trace showing which service failed, and the trace ID takes you straight to that service's log lines with the actual error message. Without the correlation ID you are reduced to guessing at timestamps across separate log groups, which under incident pressure is where most of the time goes.

---
[Monitoring Index](./README.md) | [← Grafana](./04-grafana.md) | [ELK on AWS →](./06-elk-aws.md)
