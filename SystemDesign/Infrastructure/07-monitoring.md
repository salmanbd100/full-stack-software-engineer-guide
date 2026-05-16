# Infrastructure Monitoring

## 💡 **Concept**

Monitoring answers: "Is the system healthy?" Observability answers: "Why is it unhealthy?" You need both. Infrastructure monitoring covers the three pillars: **metrics** (what's happening), **logs** (what happened), and **traces** (where time was spent).

**How to answer in an interview:** "I'd instrument with three layers: CloudWatch metrics and alarms for infrastructure health, structured logs shipped to CloudWatch Logs (or a log aggregator), and distributed tracing via X-Ray to track latency across service boundaries."

---

## The Three Pillars

| Pillar | What it tells you | AWS tool | Third-party |
|--------|-----------------|---------|------------|
| **Metrics** | Quantitative health over time | CloudWatch Metrics | Datadog, Prometheus |
| **Logs** | Events and errors | CloudWatch Logs | ELK, Grafana Loki |
| **Traces** | Request flow across services | AWS X-Ray | Jaeger, Datadog APM |

---

## CloudWatch — AWS Metrics and Alarms

CloudWatch collects metrics from every AWS service automatically.

### Key metrics to monitor

| Service | Metric | Alert threshold |
|---------|--------|----------------|
| **EC2** | CPUUtilization | > 80% for 5 min |
| **RDS** | FreeableMemory | < 500 MB |
| **ALB** | HTTPCode_ELB_5XX_Count | > 0 |
| **ALB** | TargetResponseTime | p99 > 1 s |
| **SQS** | ApproximateAgeOfOldestMessage | > 5 min |
| **Lambda** | Errors, Throttles | > 0 |

### Alarm with auto-remediation

```typescript
interface CloudWatchAlarm {
  alarmName: string;
  metric: {
    namespace: string;
    metricName: string;
    dimensions: Record<string, string>;
  };
  threshold: number;
  comparisonOperator: "GreaterThanThreshold" | "LessThanThreshold";
  evaluationPeriods: number;   // consecutive periods in alarm state
  periodSeconds: number;
  statistic: "Average" | "Sum" | "p99";
  alarmActions: string[];      // SNS topic ARNs
}

const highCpuAlarm: CloudWatchAlarm = {
  alarmName: "api-high-cpu",
  metric: {
    namespace: "AWS/EC2",
    metricName: "CPUUtilization",
    dimensions: { AutoScalingGroupName: "api-asg" }
  },
  threshold: 80,
  comparisonOperator: "GreaterThanThreshold",
  evaluationPeriods: 3,         // alarm after 3 consecutive periods
  periodSeconds: 60,
  statistic: "Average",
  alarmActions: ["arn:aws:sns:us-east-1:123:ops-alerts"]
};
```

### Custom metrics

```typescript
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

async function recordBusinessMetric(
  namespace: string,
  metricName: string,
  value: number,
  unit: "Count" | "Milliseconds" | "Bytes"
): Promise<void> {
  const client = new CloudWatchClient({ region: "us-east-1" });
  await client.send(new PutMetricDataCommand({
    Namespace: namespace,
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  }));
}

// Track order processing rate
await recordBusinessMetric("MyApp/Orders", "OrdersProcessed", 1, "Count");
```

---

## Structured Logging

Structured logs (JSON) are queryable and filterable. Unstructured text logs are not.

```typescript
interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  service: string;
  traceId: string;
  userId?: string;
  message: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  statusCode?: number;
}

function log(entry: Omit<LogEntry, "timestamp" | "service">): void {
  const output: LogEntry = {
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME ?? "unknown",
    ...entry
  };
  console.log(JSON.stringify(output));  // CloudWatch Logs ingests this
}

// Usage
log({
  level: "ERROR",
  traceId: "abc-123",
  userId: "user-456",
  message: "Payment processing failed",
  metadata: { orderId: "ord-789", errorCode: "INSUFFICIENT_FUNDS" }
});
```

**CloudWatch Logs Insights query:**
```
fields @timestamp, userId, message, metadata.orderId
| filter level = "ERROR" and metadata.errorCode = "INSUFFICIENT_FUNDS"
| sort @timestamp desc
| limit 100
```

---

## Distributed Tracing — X-Ray

X-Ray tracks a request as it flows through multiple services. Each service adds a span; X-Ray stitches them into a trace.

```typescript
import AWSXRay from "aws-xray-sdk-core";

// Wrap AWS SDK calls to auto-trace them
const aws = AWSXRay.captureAWS(require("aws-sdk"));

// Create a custom subsegment
async function processOrder(orderId: string): Promise<void> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment("processOrder");

  try {
    subsegment?.addAnnotation("orderId", orderId);
    await chargePayment(orderId);
    await updateInventory(orderId);
    await sendConfirmationEmail(orderId);
  } catch (error) {
    subsegment?.addError(error as Error);
    throw error;
  } finally {
    subsegment?.close();
  }
}
```

---

## Dashboards and SLOs

### Service Level Objectives

```typescript
interface SLO {
  name: string;
  objective: number;    // target % (e.g., 99.9)
  sli: {
    goodRequests: string;     // CloudWatch metric filter
    totalRequests: string;
    window: "7d" | "30d";
  };
  errorBudget: number;  // (1 - objective) * window in minutes
}

const apiAvailabilitySLO: SLO = {
  name: "API Availability",
  objective: 99.9,
  sli: {
    goodRequests: 'filter status < 500 | count',
    totalRequests: 'count',
    window: "30d"
  },
  errorBudget: 43.8  // 43.8 minutes of downtime per month
};
```

### Key dashboard sections

1. **Golden signals**: latency (p50/p95/p99), error rate, throughput, saturation
2. **Business metrics**: orders/min, signups/min, revenue/hour
3. **Infrastructure**: CPU, memory, disk, network
4. **SLO burn rate**: how fast the error budget is consuming

---

## Common Mistakes

❌ **Monitoring averages instead of percentiles** — p99 reveals tail latency that averages hide  
❌ **Alert fatigue from too many alarms** — alert only on SLO-affecting conditions  
❌ **Logging PII** — scrub user data before logging  
❌ **No distributed tracing** — hard to debug latency issues without request-level trace

**Key insight:**

> Monitor percentiles (p95, p99), not averages. An average of 200 ms can hide the fact that 5% of users wait 3+ seconds. Set alarms on the metrics that directly map to your SLOs.

---
[← Back to SystemDesign](../README.md)
