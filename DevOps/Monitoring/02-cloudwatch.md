# CloudWatch Deep Dive

CloudWatch is the AWS-native answer to all three pillars. This file covers the parts that separate someone who has clicked around the console from someone who has run it in production.

> For the basics — namespaces, standard metrics, simple alarms, the agent — see [AWS CloudWatch](../AWS/14-cloudwatch.md). This file goes further.

## What CloudWatch Actually Charges For

Cost drives most CloudWatch design decisions, so know the shape of the bill.

| Item | Cost Driver |
|------|------------|
| **Custom metrics** | Per metric per month — a *metric* is each unique dimension combination |
| **API calls** | `PutMetricData` and `GetMetricData` requests |
| **Logs ingestion** | 🔴 Per GB ingested — usually the largest line item |
| **Logs storage** | Per GB per month after ingestion |
| **Logs Insights queries** | Per GB scanned |
| **Dashboards** | Per dashboard per month |

🔴 **The cardinality trap applies here too.** A custom metric with a `request_id` dimension creates one metric per request, each billed individually. Teams have generated five-figure monthly bills this way.

✅ **Ingestion is where the money goes.** Cutting `DEBUG` logs in production is usually the single largest saving available.

## Metric Resolution and Retention

```
Standard resolution: 60-second granularity
High resolution:     1-second granularity (costs more)
```

**Retention is automatic and cannot be changed:**

| Age | Granularity Available |
|-----|----------------------|
| 0–3 hours | 1 second (high-res only) |
| 3 hours–15 days | 1 minute |
| 15–63 days | 5 minutes |
| 63 days–15 months | 1 hour |
| After 15 months | 🔴 Deleted |

⚠️ **CloudWatch aggregates old data, it does not keep it.** A 1-minute spike from two months ago is invisible today — it has been rolled into a 1-hour average. If you need long-term high-resolution history for capacity planning or audits, export to S3 or use Amazon Managed Prometheus.

## Metric Math

Computing new metrics from existing ones, without instrumenting anything. This is CloudWatch's most underused feature.

**Error rate as a percentage** — the metric AWS does not give you:

```
# In an alarm or dashboard, using metric math
errors = SUM(HTTPCode_Target_5XX_Count)
total  = SUM(RequestCount)
rate   = (errors / total) * 100
```

```json
[
  { "Id": "errors", "MetricStat": { "Metric": {
      "Namespace": "AWS/ApplicationELB",
      "MetricName": "HTTPCode_Target_5XX_Count" }, "Period": 300, "Stat": "Sum" },
    "ReturnData": false },
  { "Id": "total", "MetricStat": { "Metric": {
      "Namespace": "AWS/ApplicationELB",
      "MetricName": "RequestCount" }, "Period": 300, "Stat": "Sum" },
    "ReturnData": false },
  { "Id": "error_rate", "Expression": "(errors / total) * 100",
    "Label": "5xx error rate %", "ReturnData": true }
]
```

✅ **Always alert on error *rate*, not error count.** 50 errors is a crisis at 100 requests per minute and noise at 100,000.

**Useful math functions:**

| Function | Use |
|----------|-----|
| `RATE(m1)` | Per-second rate of change |
| `FILL(m1, 0)` | Treat missing data as zero |
| `ANOMALY_DETECTION_BAND(m1, 2)` | Expected range from learned behaviour |
| `SEARCH('{AWS/EC2} CPUUtilization', 'Average')` | Match many metrics dynamically |
| `AVG([m1, m2, m3])` | Aggregate across specific metrics |

**`SEARCH` for dashboards that stay current:**

```
SEARCH('{AWS/ApplicationELB,LoadBalancer} MetricName="TargetResponseTime"', 'Average', 300)
```

✅ New load balancers appear on the dashboard automatically. No dashboard edit needed.

## Alarms Done Properly

### Missing Data — the setting that causes silent failures

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name payments-5xx-rate \
  --treat-missing-data breaching \
  ...
```

| Setting | Behaviour | Use When |
|---------|-----------|----------|
| `missing` | Alarm keeps its previous state | Default; usually wrong |
| `notBreaching` | Treated as healthy | Sparse but genuinely optional metrics |
| `breaching` | Treated as a problem | ✅ Heartbeats — no data means dead |
| `ignore` | State unchanged | Very intermittent metrics |

🔴 **The classic silent failure:** an alarm on application error count, with `treat-missing-data: notBreaching`. The application crashes, stops emitting any metrics at all, and the alarm sits happily in OK. Nobody is paged.

✅ For anything where absence means failure, use `breaching`.

### M-out-of-N Evaluation

```bash
--evaluation-periods 5 \
--datapoints-to-alarm 3 \
--period 60
```

Alarms when 3 of the last 5 minutes breach. This absorbs a single spiky minute without missing a real sustained problem.

✅ Better than a single long period, because a 5-minute average dilutes a severe 1-minute breach.

### Composite Alarms

Combine alarms with boolean logic — the main tool against alert storms.

```bash
aws cloudwatch put-composite-alarm \
  --alarm-name payments-service-down \
  --alarm-rule "ALARM(payments-5xx-rate) AND ALARM(payments-latency-p99)" \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:pager
```

**Suppressing downstream noise during known maintenance:**

```
--alarm-rule "ALARM(app-errors) AND NOT ALARM(deployment-in-progress)"
```

✅ One deployment causing twenty alarms is how teams learn to ignore alarms. Composite alarms let you page once on the meaningful condition.

### Anomaly Detection

For metrics with a daily or weekly shape, where a static threshold cannot work.

```
ANOMALY_DETECTION_BAND(m1, 2)   # 2 standard deviations from learned behaviour
```

✅ Good for traffic volume, which is legitimately low at 3am and high at midday. A static "requests below 1000" threshold would page every night.

❌ Not good for error rates. Your target is zero, so a *learned* error rate normalises whatever badness already exists.

## Logs

### Log Groups and Retention

🔴 **The default retention is "never expire".** This is the most common unnecessary AWS cost in existence.

```bash
# Set retention on every log group — always
aws logs put-retention-policy \
  --log-group-name /aws/lambda/payments-api \
  --retention-in-days 30
```

```bash
# Find the ones costing you money
aws logs describe-log-groups \
  --query 'logGroups[?!retentionInDays].[logGroupName,storedBytes]' \
  --output table
```

| Log Type | Sensible Retention |
|----------|-------------------|
| Application debug | 7 days |
| Application info | 30 days |
| Access logs | 90 days |
| Audit / CloudTrail | 1–7 years (in S3, not CloudWatch) |

✅ For long retention, export to S3 with a lifecycle policy to Glacier. CloudWatch Logs storage is far more expensive than S3.

### Logs Insights

The query language. Worth knowing three or four patterns cold.

```sql
-- Slowest requests
fields @timestamp, @message, duration
| filter duration > 1000
| sort duration desc
| limit 20
```

```sql
-- Error rate over time, bucketed
fields @timestamp
| filter level = "error"
| stats count() as errors by bin(5m)
```

```sql
-- Group errors by type to find the dominant one
fields @message
| filter level = "error"
| parse @message /"error_code":"(?<code>[^"]+)"/
| stats count() as total by code
| sort total desc
```

```sql
-- p99 latency from structured logs
fields duration
| filter ispresent(duration)
| stats pct(duration, 50) as p50, pct(duration, 99) as p99 by bin(1m)
```

```sql
-- Every log line for one request, across services
fields @timestamp, service, @message
| filter trace_id = "1-5f9a2b3c-4d5e6f7a8b9c0d1e"
| sort @timestamp asc
```

⚠️ **Insights bills per GB scanned.** Always narrow the time range first — a query over 30 days of logs to answer a question about the last hour is pure waste.

### Metric Filters

Turn a log pattern into a metric, so you can alarm on it.

```bash
aws logs put-metric-filter \
  --log-group-name /aws/lambda/payments-api \
  --filter-name oom-errors \
  --filter-pattern '{ $.level = "error" && $.message = "*out of memory*" }' \
  --metric-transformations \
    metricName=OutOfMemoryErrors,metricNamespace=Acme/Payments,metricValue=1,defaultValue=0
```

✅ `defaultValue=0` is important. Without it the metric reports no data when there are no matches, and your alarm goes to `INSUFFICIENT_DATA` instead of OK.

### Embedded Metric Format (EMF)

Emit a structured log line and CloudWatch extracts metrics from it automatically. One write, both pillars.

```typescript
interface EmfLog {
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: Array<{
      Namespace: string;
      Dimensions: string[][];
      Metrics: Array<{ Name: string; Unit: string }>;
    }>;
  };
  [key: string]: unknown;
}

function emitCheckoutMetric(durationMs: number, service: string): void {
  const log: EmfLog = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: "Acme/Checkout",
          // Dimensions must be low cardinality — service only
          Dimensions: [["service"]],
          Metrics: [{ Name: "CheckoutDuration", Unit: "Milliseconds" }],
        },
      ],
    },
    service,
    CheckoutDuration: durationMs,
    // High-cardinality fields stay as log properties, NOT dimensions
    trace_id: "1-5f9a2b3c-4d5e6f7a8b9c0d1e",
    user_id: "8891",
  };

  console.log(JSON.stringify(log));
}
```

✅ **This is the recommended pattern for custom metrics on Lambda and containers.** No `PutMetricData` API call, so no latency cost and no throttling, and the high-cardinality fields stay queryable in Insights while the metric stays cheap.

> EMF is the clean answer to "how do you get custom metrics without a cardinality explosion?" — dimensions stay bounded, detail stays in the log body.

## Container Insights and Application Signals

| Feature | Gives You |
|---------|----------|
| **Container Insights** | Pod, node, and cluster metrics for EKS/ECS |
| **Application Signals** | Automatic service-level SLOs, latency, error rate, dependency map |
| **Lambda Insights** | Cold starts, init duration, memory used vs allocated |
| **Synthetics Canaries** | Scripted checks from outside your VPC |

✅ **Canaries catch what internal monitoring cannot** — DNS failures, expired certificates, a CDN misconfiguration. Your services can all be healthy while users cannot reach them.

## Cost Control Checklist

- [ ] Retention set on **every** log group
- [ ] `DEBUG` disabled in production
- [ ] Long-term logs exported to S3, not held in CloudWatch
- [ ] No high-cardinality dimensions on custom metrics
- [ ] EMF used instead of `PutMetricData` loops
- [ ] Insights queries scoped to narrow time ranges
- [ ] Unused dashboards and alarms deleted
- [ ] VPC Flow Logs sampled or sent to S3, not CloudWatch

## Interview Q&A

**Q: An alarm never fired even though the service was down. What went wrong?**

Almost certainly the missing-data setting. The alarm was probably watching an application-emitted metric such as error count, with `treat-missing-data` left as `missing` or set to `notBreaching`. When the service crashed it stopped emitting metrics entirely, so instead of breaching the threshold, the metric simply stopped arriving — and the alarm either held its last OK state or actively treated the silence as healthy. The fix is `treat-missing-data: breaching` for any metric where absence means failure, which is true of all heartbeat-style metrics. Better still, alarm on something that exists independently of the application, like load balancer target health or 5xx counts, because those keep reporting even when the application is completely dead.

**Q: How do you alert on error rate rather than error count in CloudWatch?**

With metric math, because AWS does not publish a rate metric. You define two metrics with `ReturnData: false` — the sum of 5xx counts and the sum of total requests — then a third expression `(errors / total) * 100` which is the one the alarm evaluates. This matters because absolute counts are meaningless without traffic context: fifty errors a minute is a serious incident on a low-traffic internal service and statistical noise on a service handling a hundred thousand requests a minute. An alarm on count either pages constantly at peak or stays silent during an outage at 3am when traffic is low. I would also add `FILL` handling so a period with no traffic does not produce a divide-by-zero.

**Q: Why is your CloudWatch bill high, and how do you reduce it?**

Almost always log ingestion, which is charged per gigabyte and dwarfs the other line items. The first thing I check is whether `DEBUG` is enabled in production, because that alone can multiply volume tenfold. The second is retention: log groups default to never expiring, so people accumulate years of application logs at CloudWatch storage prices, and setting a 30-day retention with export to S3 for anything needing longer is a large immediate saving. The third is high-cardinality custom metrics — a dimension containing request ID or user ID creates a separately-billed metric per unique value, which produces spectacular bills. Beyond that: VPC Flow Logs going to CloudWatch instead of S3, Insights queries scanning months to answer questions about an hour, and dashboards nobody opens.

**Q: What is Embedded Metric Format and why use it?**

EMF lets you write a specially structured JSON log line, and CloudWatch automatically extracts metrics from it. You declare a `_aws` block naming the namespace, the dimensions, and which fields are metrics, and the rest of the object stays as ordinary log properties. The reason to use it is that it solves two problems at once. First, you get metrics without calling `PutMetricData`, so there is no synchronous API call adding latency to your request path and no throttling risk — which matters a lot in Lambda. Second, and more importantly, it lets you keep high-cardinality context like trace ID and user ID in the log body where it is queryable through Insights, while the declared dimensions stay low-cardinality and cheap. That is exactly the separation the cardinality problem demands.

**Q: What are composite alarms for?**

Reducing alert storms and expressing conditions a single alarm cannot. A composite alarm evaluates boolean logic over other alarms, so instead of paging on each of twenty individual alarms when one root cause trips them all, you page once on a composite that means something — for example, error rate high AND latency high, which together indicate a genuine service problem rather than a single noisy signal. The `NOT` operator is equally useful for suppression: a rule like "application errors AND NOT deployment-in-progress" stops the expected error blip during a rolling deploy from waking anyone. This matters because alert fatigue is the real failure mode of monitoring — once a team learns that pages are usually noise, they stop responding quickly to the ones that are not.

**Q: You need 1-minute resolution metrics from six months ago. Can CloudWatch do it?**

No. CloudWatch progressively aggregates metrics as they age and discards the finer granularity — after 15 days you only have 5-minute points, after 63 days only 1-hour, and after 15 months the data is deleted entirely. So a one-minute spike from six months ago has been averaged into an hourly datapoint and is effectively invisible. This catches people doing capacity planning or investigating a recurring seasonal problem. If you need long-term high-resolution history, you have to plan for it in advance: stream metrics to S3 through CloudWatch Metric Streams and query with Athena, or use Amazon Managed Prometheus where you control retention. It is worth knowing because the answer to "can you go back and check?" is often simply no.

---
[Monitoring Index](./README.md) | [← Fundamentals](./01-fundamentals.md) | [Prometheus →](./03-prometheus.md)
