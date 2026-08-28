---
title: Prometheus
part: 8
chapter: 0
slug: prometheus
level: intermediate # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-28
tags: [devops, monitoring, prometheus]
in_book: true
---

# Prometheus

Prometheus is the de facto standard for metrics in container environments. This file covers the architecture, PromQL, and the operational limits you will be asked about.

## Architecture

```
                    ┌──────────────┐
   targets  ◄────── │  Prometheus  │ ──────► Alertmanager ──► PagerDuty
  (/metrics)  pull  │              │  fires        │           Slack
                    │  TSDB (local)│               └──► dedupe, group, silence
                    └──────┬───────┘
                           │ PromQL
                    ┌──────▼───────┐
                    │   Grafana    │
                    └──────────────┘
```

| Component | Job |
|-----------|-----|
| **Prometheus server** | Scrapes targets, stores samples, evaluates rules |
| **Exporters** | Translate something else's metrics into Prometheus format |
| **Alertmanager** | Deduplicates, groups, routes, and silences alerts |
| **Pushgateway** | Holds metrics from short-lived jobs so they can be scraped |

**Key architectural facts interviewers check:**

- ✅ Prometheus **pulls** — it scrapes an HTTP endpoint, usually `/metrics`
- ✅ Storage is **local by default** — a single server, on its own disk
- 🔴 It is **not** a long-term store, and it is **not** highly available out of the box
- 🔴 It is **not** for logs or events — it stores numeric time series only

## The Exposition Format

A target exposes plain text over HTTP:

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",endpoint="/checkout"} 84021
http_requests_total{method="GET",status="500",endpoint="/checkout"} 37

# HELP http_request_duration_seconds Request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 71204
http_request_duration_seconds_bucket{le="0.5"} 83100
http_request_duration_seconds_bucket{le="1.0"} 84001
http_request_duration_seconds_bucket{le="+Inf"} 84058
http_request_duration_seconds_sum 12043.7
http_request_duration_seconds_count 84058
```

⚠️ Note what a histogram really is: a set of **cumulative** counters, one per bucket, plus a sum and a count. `le="0.5"` means "requests taking 0.5s **or less**". Percentiles are calculated from these buckets at query time, not stored.

## Metric Types

| Type | Behaviour | Query With |
|------|-----------|-----------|
| **Counter** | Monotonically increasing | `rate()` — never the raw value |
| **Gauge** | Goes up and down | Read directly |
| **Histogram** | Cumulative buckets | `histogram_quantile()` |
| **Summary** | Pre-computed quantiles | Read directly, ⚠️ cannot aggregate |

🔴 **Never graph a counter directly.** It only goes up, so the graph is a meaningless upward line that resets to zero when the process restarts. Always wrap it in `rate()`.

```promql
# ❌ Meaningless
http_requests_total

# ✅ Requests per second, and resets are handled correctly
rate(http_requests_total[5m])
```

## PromQL

The query language. These patterns cover most real use.

### Rate and Increase

```promql
# Per-second rate over a 5-minute window
rate(http_requests_total[5m])

# Total count over the window (not per-second)
increase(http_requests_total[1h])

# For fast-moving counters — uses only the last two points, more responsive
irate(http_requests_total[5m])
```

⚠️ **The range must cover at least four scrape intervals.** With a 30-second scrape, `rate(...[1m])` has only two samples and produces erratic results. `[5m]` is the safe default.

### Aggregation

```promql
# Total across all instances
sum(rate(http_requests_total[5m]))

# Keep a dimension
sum by (status) (rate(http_requests_total[5m]))

# Drop only one dimension, keep everything else
sum without (instance) (rate(http_requests_total[5m]))

# Top 5 noisiest endpoints
topk(5, sum by (endpoint) (rate(http_requests_total[5m])))
```

### Error Rate — the most-used query in production

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(http_requests_total[5m]))
```

⚠️ `status=~"5.."` is a regex match. Note that the denominator is the **total**, not the sum of non-5xx.

### Latency Percentiles

```promql
# p99 across the fleet — aggregate buckets FIRST, then compute the quantile
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
)
```

🔴 **Order matters.** Computing `histogram_quantile` per instance and then averaging is mathematically wrong. You must `sum by (le)` first.

```promql
# ❌ Wrong — averaging percentiles
avg(histogram_quantile(0.99, rate(..._bucket[5m])))

# ✅ Right — aggregate buckets, then quantile
histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))
```

### Other Patterns Worth Knowing

```promql
# Saturation: how close to the limit
container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.9

# Predict: will the disk fill in the next 4 hours?
predict_linear(node_filesystem_avail_bytes[6h], 4 * 3600) < 0

# Did anything restart in the last hour?
increase(kube_pod_container_status_restarts_total[1h]) > 0

# Is a target down?
up{job="payments"} == 0

# Compare to a week ago — useful for traffic anomalies
sum(rate(http_requests_total[5m]))
  /
sum(rate(http_requests_total[5m] offset 1w))
```

## Recording Rules

Pre-compute expensive queries on a schedule, then query the cheap result.

```yaml
groups:
  - name: http
    interval: 30s
    rules:
      # Naming convention: level:metric:operation
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))

      - record: job:http_errors:ratio5m
        expr: |
          sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
            /
          sum by (job) (rate(http_requests_total[5m]))
```

✅ **Use recording rules when:**

- A dashboard query takes seconds to run
- The same complex expression appears in several places
- An alert needs to evaluate quickly and reliably

## Alerting Rules

```yaml
groups:
  - name: slo
    rules:
      - alert: HighErrorRate
        expr: job:http_errors:ratio5m{job="payments"} > 0.01
        for: 5m                      # ← must be true continuously
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "Payments error rate is {{ $value | humanizePercentage }}"
          runbook: "https://wiki.acme.com/runbooks/payments-errors"
```

✅ **`for` is what stops flapping.** Without it, a single bad scrape pages someone. With `for: 5m`, the condition must hold for five continuous minutes.

**Multi-window burn rate — the SRE-grade pattern:**

```yaml
# Fast burn: catastrophic, page immediately
- alert: ErrorBudgetBurnFast
  expr: |
    job:http_errors:ratio5m > (14.4 * 0.001)
      and
    job:http_errors:ratio1h > (14.4 * 0.001)
  for: 2m
  labels: { severity: critical }

# Slow burn: will exhaust the budget eventually, raise a ticket
- alert: ErrorBudgetBurnSlow
  expr: |
    job:http_errors:ratio30m > (6 * 0.001)
      and
    job:http_errors:ratio6h > (6 * 0.001)
  for: 15m
  labels: { severity: warning }
```

> Requiring **both** a short and a long window to breach is what stops a brief spike paging you while still catching sustained degradation quickly. `14.4` means burning 30 days of budget in about 2 days.

## Alertmanager

```yaml
route:
  receiver: slack-default
  group_by: [alertname, cluster, service]
  group_wait: 30s          # wait for related alerts before sending
  group_interval: 5m       # then batch updates
  repeat_interval: 4h

  routes:
    - matchers: [severity="critical"]
      receiver: pagerduty
      continue: false

    - matchers: [severity="warning"]
      receiver: slack-default

inhibit_rules:
  # If the whole cluster is down, don't also page for every service in it
  - source_matchers: [alertname="ClusterDown"]
    target_matchers: [severity="critical"]
    equal: [cluster]

receivers:
  - name: pagerduty
    pagerduty_configs:
      - service_key: "${PD_KEY}"
  - name: slack-default
    slack_configs:
      - api_url: "${SLACK_WEBHOOK}"
```

| Feature | Purpose |
|---------|---------|
| **Grouping** | One notification for 40 pods failing, not 40 notifications |
| **Inhibition** | Suppress downstream alerts when the root cause is already firing |
| **Silences** | Mute during planned maintenance |
| **Routing** | Critical to pager, warning to Slack |

✅ Inhibition is the difference between a useful page and a phone that vibrates for ten minutes.

## Scaling Limits

🔴 **A single Prometheus server has real limits.** Interviewers ask what you do when you hit them.

| Limit | Symptom |
|-------|---------|
| **Cardinality** | Memory exhaustion, OOMKill — the number one cause of Prometheus failure |
| **Local storage** | Disk fills; retention is typically 15 days |
| **No HA** | The server restarts and you have a gap in your metrics |
| **Single-cluster view** | No cross-cluster queries |

**Options, in order of complexity:**

| Approach | What It Gives |
|----------|--------------|
| **Reduce cardinality** | ✅ Always do this first — drop labels with `metric_relabel_configs` |
| **Two identical servers** | Crude HA — both scrape everything, Grafana points at one |
| **Federation** | A parent scrapes aggregated metrics from children |
| **Thanos / Mimir / Cortex** | Object-storage long-term retention, global query, deduplication |
| **Amazon Managed Prometheus** | ✅ AWS runs it — no cardinality-driven OOM to manage yourself |

**Dropping high-cardinality labels at scrape time:**

```yaml
scrape_configs:
  - job_name: app
    metric_relabel_configs:
      # Drop a metric that is exploding
      - source_labels: [__name__]
        regex: 'http_requests_by_user_total'
        action: drop
      # Or keep the metric but remove the offending label
      - regex: 'user_id'
        action: labeldrop
```

## Amazon Managed Prometheus (AMP)

✅ **The pragmatic AWS answer.** AWS operates the server; you keep PromQL.

| | Self-hosted | AMP |
|---|---|---|
| **Operations** | You own OOMs, disks, upgrades | AWS |
| **Retention** | ~15 days local | 150 days |
| **HA** | You build it | Built in |
| **Cost model** | EC2 + EBS | Per sample ingested and stored |
| **Access control** | Your own | IAM / SigV4 |

⚠️ AMP is ingestion-priced, so cardinality still costs you money — it just no longer crashes your server.

```yaml
# Remote write from a local Prometheus into AMP
remote_write:
  - url: https://aps-workspaces.eu-west-1.amazonaws.com/workspaces/ws-abc123/api/v1/remote_write
    sigv4:
      region: eu-west-1
    queue_config:
      max_samples_per_send: 1000
      capacity: 10000
```

## Exporters

| Exporter | Exposes |
|----------|---------|
| **node_exporter** | Host CPU, memory, disk, network |
| **cAdvisor** | Container resource usage |
| **kube-state-metrics** | Kubernetes object state — deployments, pods, PDBs |
| **blackbox_exporter** | Probes endpoints from outside — HTTP, TCP, DNS, TLS expiry |
| **CloudWatch exporter** | AWS service metrics into Prometheus |
| **postgres / redis exporter** | Database internals |

⚠️ **cAdvisor and kube-state-metrics are different.** cAdvisor reports actual resource *usage*; kube-state-metrics reports the *desired and reported state* of Kubernetes objects. You need both.

## Interview Q&A

**Q: Why does Prometheus pull instead of push?**

The main benefit is that a failed scrape is itself a signal — if Prometheus cannot reach a target, the `up` metric goes to zero and you know unambiguously that the target is down. With push, missing data could mean the process died, the collector broke, or the network dropped packets, and you cannot distinguish those, which makes alerting on absence unreliable. Pull also centralises configuration, so scrape intervals, relabelling, and target discovery live in one place rather than being configured in every application. The genuine downsides are that Prometheus needs network reachability to every target, which is awkward across firewalls or NAT, and short-lived batch jobs may finish before they are ever scraped — which is what the Pushgateway works around, though it should be used sparingly because it breaks the up-signal property.

**Q: Why must you use `rate()` on a counter?**

Because a counter only ever increases, so its raw value is a cumulative total since process start and graphing it just gives you an upward line that tells you nothing about current behaviour. What you actually want is how fast it is increasing, which is `rate()`. Crucially, `rate()` also handles counter resets correctly: when a process restarts the counter goes back to zero, and a naive difference would compute a large negative value, whereas `rate()` detects the reset and accounts for it. The related detail is the range window — it needs to span at least four scrape intervals, so with 30-second scraping `rate(x[1m])` only has two samples and produces erratic output. Five minutes is the sensible default.

**Q: How do you calculate a p99 latency across many instances, and what is the common mistake?**

You aggregate the histogram buckets first and compute the quantile afterwards: `histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))`. The `sum by (le)` adds up the per-bucket counters across all instances, preserving the bucket boundaries, and then the quantile is computed from that combined distribution. The common mistake is computing `histogram_quantile` per instance and then averaging the results, which is mathematically meaningless — percentiles are not linear and cannot be averaged. This is also the reason to prefer histograms over summaries for latency: a summary computes its quantiles inside each process, so those numbers are already collapsed and there is no way to correctly combine them across a fleet.

**Q: What happens when Prometheus runs out of memory, and how do you prevent it?**

Prometheus holds the index for all active time series in memory, so memory use is driven by cardinality rather than by request volume. When someone adds a label containing a user ID, a request ID, or a full URL with query parameters, series count explodes and the server gets OOMKilled — this is the single most common Prometheus failure. Prevention starts with not creating the cardinality: bounded labels only, with unique identifiers going into logs and traces instead. When it has already happened, you use `metric_relabel_configs` at scrape time to either drop the offending metric entirely or `labeldrop` the specific label, which keeps the metric useful at lower resolution. Structurally, the fixes are Thanos or Mimir for horizontal scale, or Amazon Managed Prometheus so the ingestion capacity is AWS's problem — though with AMP the cardinality then costs you money rather than crashing a server.

**Q: Is Prometheus highly available? How would you make it so?**

Not by default — it is a single server writing to local disk, so a restart leaves a gap in your metrics and a lost disk loses your history. The crude approach is running two identical servers scraping the same targets, so if one is down the other has the data; you lose exact consistency between them but you keep coverage, and Alertmanager deduplicates the identical alerts they both fire. Federation lets a parent server scrape aggregated metrics from several children, which helps with scale but not really with availability. The proper solution is Thanos, Mimir, or Cortex, which ship blocks to object storage, deduplicate across replicas, and provide a single global query endpoint spanning clusters with long retention. On AWS, Amazon Managed Prometheus gives you the same properties without operating any of it, which is what I would reach for unless there is a specific reason not to.

**Q: What is a multi-window burn rate alert and why is it better than a simple threshold?**

It alerts on how fast you are consuming your error budget, evaluated over two time windows simultaneously, and only fires when both breach. A simple threshold like "error rate above 1% for five minutes" has a bad tradeoff: make the window short and every transient blip pages someone, make it long and you are slow to detect a real outage. The multi-window approach fixes this by pairing a short window for responsiveness with a long window for confirmation — so a thirty-second spike does not fire because the one-hour window has not moved, while a sustained problem trips both quickly. You typically run two of these: a fast-burn rule that pages because the budget will be gone in days, and a slow-burn rule that opens a ticket because the trend is bad but not urgent. It ties alerting directly to the SLO rather than to an arbitrary number.

---

[← Monitoring & Observability Fundamentals](./01-fundamentals.md) | [Observability Index](./README.md) | [Grafana →](./03-grafana.md)
