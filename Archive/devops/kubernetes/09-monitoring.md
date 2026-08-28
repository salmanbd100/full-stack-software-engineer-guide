---
title: Monitoring & Logging
part: 8
chapter: 0
slug: kubernetes-monitoring
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-03
tags: [devops, kubernetes, monitoring]
in_book: false
---

# Monitoring & Logging

You cannot debug what you cannot see. In Kubernetes, pods are ephemeral — so observability must live outside them.

## The Three Pillars

| Pillar | Answers | Tool on EKS |
|--------|---------|-------------|
| **Metrics** | Is it healthy? How much? Trending which way? | Prometheus, CloudWatch |
| **Logs** | What exactly happened in this request? | CloudWatch Logs, OpenSearch |
| **Traces** | Where did the latency come from across services? | X-Ray, Jaeger, OpenTelemetry |

```
Alert fires on a METRIC (error rate up)
        ↓
TRACE shows which service in the chain is slow
        ↓
LOGS show the exact error for that request
```

> Metrics tell you *something* is wrong. Traces tell you *where*. Logs tell you *why*. A stack missing one of these leaves a gap in that chain.

## Why Kubernetes Changes Monitoring

| Traditional | Kubernetes |
|-------------|-----------|
| Monitor named hosts | Hosts are interchangeable; pods come and go |
| Log into the box to read logs | The pod is already gone |
| Static list of targets | Targets change every minute |
| One process per host | Dozens of pods sharing a node |

✅ This is why Prometheus dominates: it **discovers** targets from the Kubernetes API instead of using a static config file.

⚠️ Never write logs to a file inside a container expecting to read them later. Write to stdout/stderr and ship them off the node.

## The Golden Signals

Measure these four per service before anything else.

| Signal | Metric | Why |
|--------|--------|-----|
| **Latency** | p50, p95, p99 (never the average) | Averages hide the pain |
| **Traffic** | Requests per second | Context for every other number |
| **Errors** | 5xx rate, exception rate | Direct user impact |
| **Saturation** | CPU/memory usage vs limits, queue depth | Predicts the next failure |

❌ **Average latency lies.** A 200 ms average can be 95% of requests at 50 ms and 5% at 3 seconds. Alert on p99.

## Prometheus on EKS

```
     Prometheus (scrapes every 15–30s, pull model)
        │
        ├── kube-state-metrics    → object state: replicas desired vs ready
        ├── node-exporter         → node CPU, memory, disk (DaemonSet)
        ├── cAdvisor (in kubelet) → per-container resource usage
        └── your app's /metrics   → business + application metrics
        │
        ├──▶ Alertmanager ──▶ SNS / PagerDuty / Slack
        └──▶ Grafana (dashboards)
```

| Component | Provides |
|-----------|----------|
| **kube-state-metrics** | Kubernetes object state — deployment replica counts, pod phases, PVC status |
| **node-exporter** | Node-level OS metrics |
| **cAdvisor** | Container CPU, memory, network (built into kubelet) |
| **Metrics Server** | Lightweight, for HPA and `kubectl top` only — **not** a monitoring system |

⚠️ **Metrics Server is not Prometheus.** It keeps a short in-memory window purely so HPA and `kubectl top` work. It stores no history and cannot alert.

**Service discovery via annotations or a ServiceMonitor:**

```yaml
# Prometheus Operator: declarative scrape target
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api
  labels: { release: prometheus }
spec:
  selector:
    matchLabels: { app: api }
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

✅ Install the whole stack with `kube-prometheus-stack` — it bundles Prometheus Operator, Alertmanager, Grafana, kube-state-metrics, and node-exporter with working default dashboards and alerts.

### PromQL You Actually Need

```promql
# Error rate as a percentage over 5 minutes
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
  / sum(rate(http_requests_total[5m])) by (service) * 100

# p99 latency from a histogram
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Pods restarting — the clearest sign of trouble
sum(increase(kube_pod_container_status_restarts_total[1h])) by (pod)

# Memory usage as a fraction of the limit (predicts OOMKills)
container_memory_working_set_bytes{container!=""}
  / container_spec_memory_limit_bytes{container!=""}

# CPU throttling — invisible latency cause
rate(container_cpu_cfs_throttled_seconds_total[5m])

# Deployments not at desired replicas
kube_deployment_status_replicas_available
  != kube_deployment_spec_replicas
```

| Function | Use |
|----------|-----|
| `rate()` | Per-second average over a window — for counters |
| `increase()` | Total growth over a window |
| `histogram_quantile()` | Percentiles from bucket metrics |
| `sum() by (label)` | Aggregate, keeping one dimension |

⚠️ **Cardinality kills Prometheus.** Every unique label combination is a separate time series. Putting a user ID, request ID, or full URL path in a label creates millions of series and exhausts memory. Use bounded label values only — route templates, not actual paths.

## Amazon Managed Prometheus and Grafana

| Concern | Self-hosted | Amazon Managed |
|---------|-------------|----------------|
| **Long-term storage** | You run Thanos or Mimir | ✅ Handled |
| **HA and scaling** | Your problem | ✅ Handled |
| **Cost** | EC2 + EBS + engineer time | Per-sample ingested and stored |
| **Query at scale** | Degrades without extra work | ✅ Handled |

✅ **Amazon Managed Service for Prometheus (AMP)** is worth it once retention beyond a couple of weeks matters — running Prometheus HA with long retention yourself is real, ongoing work. Grafana still runs in-cluster or as Amazon Managed Grafana, which can query AMP, CloudWatch, and X-Ray together.

## CloudWatch Container Insights

The AWS-native option, no Prometheus required.

```
CloudWatch agent (DaemonSet) ──▶ cluster/node/pod/container metrics
Fluent Bit (DaemonSet)       ──▶ container logs to CloudWatch Logs
```

| | Container Insights | Prometheus |
|-|-------------------|-----------|
| **Setup** | An EKS add-on | Helm chart + configuration |
| **Custom app metrics** | Awkward (embedded metric format) | ✅ Native |
| **Query language** | CloudWatch Logs Insights | ✅ PromQL — far more expressive |
| **Cost model** | Per metric + per GB ingested | Infrastructure or per sample |
| **Integration** | ✅ Native alarms, dashboards, X-Ray | Needs Alertmanager wiring |

> Practical answer: Container Insights for infrastructure metrics and AWS-native alarms, Prometheus for application and business metrics. Grafana on top of both gives one pane of glass.

## Logging Architecture

```
Container stdout/stderr
        ▼
/var/log/containers/*.log on the node
        ▼
Fluent Bit (DaemonSet, one per node)
        ▼
CloudWatch Logs  or  Amazon OpenSearch
```

```yaml
# Fluent Bit output to CloudWatch — key config
[OUTPUT]
    Name                cloudwatch_logs
    Match               kube.*
    region              us-east-1
    log_group_name      /aws/eks/prod/application
    log_stream_prefix   ${HOST_NAME}-
    auto_create_group   true
```

**Rules for logs in Kubernetes:**

| Rule | Why |
|------|-----|
| **Log to stdout/stderr** | The pod's filesystem disappears with the pod |
| **Structured JSON** | Makes logs queryable instead of grep-able |
| **Include a trace/correlation ID** | The only way to follow one request across services |
| **Never log secrets or PII** | Logs are widely readable and retained for months |
| **Set retention** | CloudWatch defaults to never expire — a large, silent bill |

✅ **Structured logging with a trace ID:**

```typescript
interface LogEntry {
  level: "info" | "warn" | "error";
  msg: string;
  traceId: string;
  service: string;
  [key: string]: unknown;
}

function log(entry: LogEntry): void {
  // One JSON object per line — Fluent Bit parses it into queryable fields
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
}

log({ level: "error", msg: "payment declined", traceId, service: "checkout", orderId });
```

⚠️ Fluent Bit is a DaemonSet, so it **cannot run on Fargate**. Fargate pods use a built-in log router configured through a ConfigMap instead.

## Distributed Tracing

```
User request  ──▶ gateway ──▶ api ──▶ auth
                                 └──▶ orders ──▶ postgres
                                        (the 800 ms is here)
```

A trace is a tree of spans, correlated by a trace ID propagated through request headers.

✅ Instrument with **OpenTelemetry** rather than a vendor SDK — one instrumentation, exportable to X-Ray, Jaeger, or a commercial backend without touching application code.

| Option on AWS | Notes |
|---------------|-------|
| **AWS Distro for OpenTelemetry (ADOT)** | ✅ Collector as an EKS add-on, exports to X-Ray and AMP |
| **X-Ray** | Managed, integrates with ALB and Lambda, sampled by default |
| **Jaeger** | Self-hosted, full control |

⚠️ Tracing every request is expensive. Sample — commonly a low percentage of successful requests plus **all** errors and slow requests, which is where the value is.

## Alerting That Works

```yaml
groups:
  - name: api
    rules:
      # ✅ Symptom-based: users are actually affected
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5..",service="api"}[5m]))
            / sum(rate(http_requests_total{service="api"}[5m])) > 0.05
        for: 5m                      # must persist — avoids flapping
        labels: { severity: critical }
        annotations:
          summary: "api error rate above 5% for 5 minutes"
          runbook: "https://wiki.acme.com/runbooks/api-errors"

      - alert: PodCrashLooping
        expr: increase(kube_pod_container_status_restarts_total[15m]) > 3
        for: 5m
        labels: { severity: warning }
```

| Principle | Detail |
|-----------|--------|
| **Alert on symptoms, not causes** | "Error rate up" pages someone. "CPU at 80%" usually does not |
| **Every alert must be actionable** | If there is no action, it is a dashboard, not an alert |
| **Use `for:`** | Requires the condition to persist, killing transient noise |
| **Link a runbook** | A 3 a.m. page should not require improvisation |
| **Route by severity** | Critical → page; warning → ticket or Slack |

❌ **Alert fatigue is the real failure mode.** A team receiving 50 alerts a day stops reading them, and the one that mattered is missed. Fewer, sharper alerts beat comprehensive coverage.

## SLIs, SLOs, and Error Budgets

| Term | Meaning | Example |
|------|---------|---------|
| **SLI** | The measurement | % of requests under 300 ms |
| **SLO** | Your internal target | 99.9% over 30 days |
| **SLA** | Contractual promise with penalties | 99.5% — always looser than the SLO |
| **Error budget** | Allowed failure = 100% − SLO | 99.9% → ~43 minutes per 30 days |

✅ The error budget turns reliability into a decision-making tool: budget remaining means ship features; budget exhausted means reliability work takes priority. That converts "should we deploy?" from an argument into a number.

## What to Monitor on EKS

| Layer | Key Signals |
|-------|-------------|
| **Cluster** | API server latency and error rate, etcd health, node count |
| **Nodes** | CPU, memory, disk pressure, `NotReady` count |
| **Pods** | Restart count, OOMKills, CPU throttling, pending duration |
| **Workload** | Desired vs available replicas, HPA at max, PDB blocking |
| **Application** | The four golden signals plus business metrics |
| **Cost** | Requested vs actual usage — the biggest source of waste |

## Debugging Toolkit

```bash
kubectl top nodes                          # needs Metrics Server
kubectl top pods -n production --sort-by=memory

kubectl logs -f deploy/api --tail=100
kubectl logs api-7d9f-x8k2 --previous      # logs from the crashed instance
kubectl logs -l app=api --prefix --tail=50 # all pods of a label

kubectl describe pod api-7d9f-x8k2         # events explain scheduling/probe failures
kubectl get events -n production --sort-by=.lastTimestamp

kubectl debug -it api-7d9f-x8k2 --image=nicolaka/netshoot  # ephemeral debug container
```

✅ `kubectl debug` attaches a debug container to a running pod. This is how you troubleshoot a distroless image that has no shell.

## Interview Q&A

**Q: How would you set up observability for an EKS cluster?**

Metrics from Prometheus, deployed with kube-prometheus-stack so I get the Operator, Alertmanager, Grafana, kube-state-metrics, and node-exporter together — Prometheus discovers targets from the Kubernetes API, which is essential when pods change constantly. For retention beyond a couple of weeks I would send to Amazon Managed Prometheus rather than run Thanos myself. Logs go to stdout as structured JSON, collected by Fluent Bit as a DaemonSet and shipped to CloudWatch Logs or OpenSearch, with retention set explicitly. Traces come from OpenTelemetry instrumentation exporting through the ADOT collector to X-Ray. Grafana sits on top querying all three. Then I define the four golden signals per service, set SLOs, and alert on symptoms with runbook links.

**Q: What is the difference between Metrics Server and Prometheus?**

Metrics Server is a small component that collects current CPU and memory from each kubelet and keeps a short in-memory window. Its only jobs are serving `kubectl top` and providing the resource metrics the Horizontal Pod Autoscaler needs. It stores no history, has no query language, and cannot alert. Prometheus is a full monitoring system: it scrapes and stores time series with configurable retention, provides PromQL for querying, and integrates with Alertmanager. They are complementary — you need Metrics Server for HPA to function even if Prometheus is your monitoring stack, and if you want HPA to scale on custom or Prometheus-based metrics you add an adapter on top.

**Q: What is metric cardinality and why does it matter?**

Cardinality is the number of unique time series, which is the product of every label's distinct values. Prometheus stores each unique label combination as its own series in memory, so a label with unbounded values — a user ID, request ID, session token, or raw URL path with embedded IDs — creates millions of series and will exhaust Prometheus's memory and eventually crash it. The rule is that labels must have bounded, low-cardinality values: use a route template like `/users/:id` rather than the actual path, and keep per-request identifiers in logs and traces where high cardinality is the expected design.

**Q: How do you design alerts that people actually act on?**

Alert on symptoms rather than causes: page on error rate, latency breaching the SLO, or a service being unavailable, because those mean users are affected. Resource metrics like CPU at 80% are usually dashboard material, not pages, since they may be perfectly normal. Every alert needs a `for` duration so transient spikes do not fire, a severity that routes appropriately — critical pages someone, warning creates a ticket — and a runbook link, because someone woken at 3 a.m. should not have to improvise. The failure mode to design against is alert fatigue: a team receiving dozens of alerts a day stops reading them, so a small number of sharp alerts is genuinely better than comprehensive coverage.

**Q: A service is slow but CPU and memory look fine. What do you check?**

CPU throttling first — a container with a CPU limit gets throttled by the kernel even when the node is idle, and `container_cpu_cfs_throttled_seconds_total` shows it while average CPU utilization looks healthy. Then I would look at percentiles rather than averages, since a 200 ms mean can hide a 3-second p99, and check whether the slowness is uniform or concentrated in a few pods, which might point at one unhealthy replica still in the Service endpoints. Next, distributed traces to see whether the latency is actually in this service or in something it calls — a slow database query or a downstream timeout. Other common causes worth checking are DNS resolution latency from the `ndots:5` search-domain behaviour, connection pool exhaustion, and a readiness probe flapping so pods are repeatedly removed from and returned to rotation.

---

[← Helm](./08-helm.md) | [Auto-scaling →](./10-autoscaling.md)
