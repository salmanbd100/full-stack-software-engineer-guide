---
title: Grafana
part: 8
chapter: 0
slug: grafana
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-03
tags: [devops, monitoring, grafana]
in_book: true
---

# Grafana

Grafana is the visualisation layer. It stores no metrics of its own — it queries other systems and draws the result.

## What Grafana Is and Is Not

| ✅ Grafana does | ❌ Grafana does not |
|----------------|--------------------|
| Query many data sources and unify them | Store metrics |
| Build dashboards and explore data | Scrape targets |
| Alert (Grafana Alerting, since v8) | Replace Prometheus or CloudWatch |

```
Prometheus ──┐
CloudWatch ──┼──► Grafana ──► dashboards, alerts, explore
OpenSearch ──┤
X-Ray      ──┘
```

✅ The real value is **one pane of glass**. Kubernetes metrics from Prometheus, RDS metrics from CloudWatch, and logs from OpenSearch on the same dashboard, correlated on one time axis.

## Data Sources

```yaml
# Provisioned as code — never configured by hand in the UI
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus-main          # ← dashboards reference this uid
    url: http://prometheus:9090
    isDefault: true

  - name: CloudWatch
    type: cloudwatch
    uid: cloudwatch-prod
    jsonData:
      authType: default           # use the pod's IAM role (IRSA)
      defaultRegion: eu-west-1

  - name: Amazon Managed Prometheus
    type: prometheus
    uid: amp-prod
    url: https://aps-workspaces.eu-west-1.amazonaws.com/workspaces/ws-abc123
    jsonData:
      httpMethod: POST
      sigV4Auth: true
      sigV4Region: eu-west-1
```

🔴 **Never use IAM access keys for the CloudWatch data source.** Use `authType: default` so Grafana picks up the role from IRSA or the instance profile.

✅ Give every data source a stable `uid`. Dashboards reference data sources by `uid`, so an unstable one breaks every dashboard that uses it.

## Dashboards as Code

❌ **Clicking dashboards together in the UI** means no review, no history, and no recovery when someone deletes one.

✅ **Provision from files:**

```yaml
# provisioning/dashboards/default.yaml
apiVersion: 1
providers:
  - name: acme
    type: file
    updateIntervalSeconds: 30
    allowUiUpdates: false        # UI edits are discarded — Git is the source
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

**The workflow that works in practice:**

```
1. Build and iterate in the UI (fast feedback)
2. Dashboard settings → JSON Model → copy
3. Commit the JSON to Git
4. Provisioning applies it
```

⚠️ With `allowUiUpdates: false`, UI edits are lost on the next reload. That is the point — but tell the team, or they will lose work.

✨ For anything reused across environments, generate dashboards with **Grafonnet** (Jsonnet) or the Grafana Terraform provider rather than hand-editing 2,000-line JSON.

## Variables — the Feature That Makes Dashboards Reusable

Without variables you build one dashboard per service. With them you build one dashboard, full stop.

```
Query variable:   label_values(up, job)              → dropdown of all jobs
Query variable:   label_values(up{job="$job"}, instance)  → chained to $job
Custom variable:  prod,staging,dev
Interval:         1m,5m,15m,1h                       → $__interval for rate windows
```

**Using them in a query:**

```promql
# $job and $instance come from dropdowns; $__rate_interval adapts to the time range
sum by (status) (
  rate(http_requests_total{job="$job", instance=~"$instance"}[$__rate_interval])
)
```

| Variable Trick | Effect |
|---------------|--------|
| `Multi-value` | `$instance` becomes a regex — use `=~`, not `=` |
| `Include All` | Adds an "All" option; set the custom all-value to `.*` |
| `$__rate_interval` | ✅ Auto-sizes the rate window — prevents empty graphs when zoomed in |
| `Chained variables` | `$instance` filtered by the selected `$job` |
| `Repeat panel/row` | One panel definition rendered per variable value |

✅ **`$__rate_interval` is the one to remember.** A hard-coded `[5m]` produces a blank graph when someone zooms into a 1-minute window. `$__rate_interval` scales with the selected range.

## Dashboard Design

A dashboard should answer a specific question. "All the metrics" answers none.

**The layout that works — most important at the top:**

```
┌─────────────────────────────────────────────────┐
│  Row 1: SERVICE HEALTH  (stat panels)           │
│  [ Error rate ] [ p99 ] [ RPS ] [ Availability ]│
├─────────────────────────────────────────────────┤
│  Row 2: GOLDEN SIGNALS  (time series)           │
│  [ Latency percentiles ]  [ Traffic + errors ]  │
├─────────────────────────────────────────────────┤
│  Row 3: SATURATION                              │
│  [ CPU / memory ]  [ Connection pool ] [ Queue ]│
├─────────────────────────────────────────────────┤
│  Row 4: DEPENDENCIES  (collapsed by default)    │
│  [ Database ]  [ Cache ]  [ Downstream APIs ]   │
└─────────────────────────────────────────────────┘
```

| Rule | Why |
|------|-----|
| **Three dashboards per service, not thirty** | Overview, deep-dive, business metrics |
| **Top-left is the most important panel** | Where the eye lands first |
| **Collapse detail rows** | Fast load, less noise; expand when diagnosing |
| **Thresholds on every stat panel** | Green/amber/red beats reading a number |
| **Units on every axis** | A "1.4" with no unit is useless |
| **Link panels to runbooks** | Panel → dashboard link → the fix |
| **Under 20 panels per dashboard** | Beyond that nobody reads it and it loads slowly |

⚠️ **Watch dashboard load cost.** Twenty panels each running a heavy query, auto-refreshing every 10 seconds, hammers your data source. Use recording rules for expensive expressions and set refresh to 1 minute unless there is a reason not to.

## Panel Types Worth Knowing

| Panel | Use For |
|-------|---------|
| **Time series** | The default — anything over time |
| **Stat** | One current number with a threshold colour |
| **Gauge** | Utilisation against a known limit |
| **Bar gauge** | Comparing a list — top 10 endpoints |
| **Table** | Per-instance detail, sortable |
| **Heatmap** | Latency distribution over time — shows bimodality an average hides |
| **State timeline** | Up/down status over time |
| **Logs** | Log lines from Loki, OpenSearch, or CloudWatch |

✨ **The heatmap is underused.** A p99 line hides the fact that you have two distinct populations — cache hits at 10ms and cache misses at 800ms. A heatmap makes that immediately visible.

## Grafana Alerting

Since v8, Grafana has its own unified alerting that works across all data sources.

```
Alert rule  →  evaluated on a schedule
     ↓
Labels attached
     ↓
Notification policy  →  routes by label
     ↓
Contact point  →  PagerDuty / Slack / SNS
```

**When to use which:**

| Use | For |
|-----|-----|
| **Prometheus + Alertmanager** | Prometheus-only stacks; alerts as code next to the rules |
| **CloudWatch alarms** | AWS-native metrics, especially for auto-scaling actions |
| **Grafana Alerting** | ✅ Alerts spanning several data sources, or a mixed stack |

✅ Grafana Alerting's real advantage: one rule can combine a Prometheus query with a CloudWatch query. Neither Alertmanager nor CloudWatch can do that.

⚠️ Pick one primary alerting system. Alerts defined in three places is how conditions get missed and duplicated pages happen.

## Amazon Managed Grafana (AMG)

| | Self-hosted | AMG |
|---|---|---|
| **Operations** | You run and upgrade it | AWS |
| **Auth** | You configure OIDC/SAML | ✅ IAM Identity Center or SAML built in |
| **Data source auth** | IRSA / keys | ✅ Native IAM to CloudWatch, AMP, X-Ray |
| **Cost** | EC2/EKS + effort | Per active user per month |
| **Plugins** | Anything | Curated set only |

✅ AMG is a strong default on AWS. The IAM Identity Center integration alone removes a real amount of work, and per-user pricing suits teams where only a handful of people open Grafana.

❌ Choose self-hosted if you need a plugin AMG does not allow, or you have hundreds of viewers and per-user pricing becomes expensive.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Dashboards built only in the UI | No review, lost on deletion | Provision from Git |
| Hard-coded `[5m]` rate windows | Blank graphs when zoomed in | `$__rate_interval` |
| No variables | One dashboard per service | Query variables + repeat |
| 60 panels on one dashboard | Slow, unread, hammers the data source | Split; collapse detail rows |
| 10-second auto-refresh everywhere | Constant load on Prometheus | 1 minute unless needed |
| Averages on the main graph | Tail latency hidden | Percentiles, or a heatmap |
| IAM keys for CloudWatch | Long-lived credentials in Grafana | IRSA with `authType: default` |
| No units or thresholds | Numbers nobody can interpret | Set both on every panel |

## Interview Q&A

**Q: What does Grafana actually do?**

It is a visualisation and alerting layer with no storage of its own — it queries other systems and renders the results. That distinction matters because people sometimes talk about "storing metrics in Grafana", which is not a thing. Its value is unification: a single dashboard can show Kubernetes metrics from Prometheus, RDS metrics from CloudWatch, and application logs from OpenSearch on one shared time axis, which is exactly what you want during an incident when you are trying to correlate a latency spike with a database event. Since version 8 it also has unified alerting that can evaluate rules across multiple data sources, which is something neither Alertmanager nor CloudWatch alarms can do on their own.

**Q: Why should dashboards be defined as code?**

The same reasons as any infrastructure. A dashboard built by clicking in the UI has no review, no history, and no recovery path — if someone deletes it or edits it badly, the previous version is gone. Provisioning from JSON in Git means changes go through pull requests, you can see who changed a threshold and why, and a fresh Grafana instance rebuilds every dashboard automatically. In practice the workflow is pragmatic: build it in the UI because the feedback loop is fast, then export the JSON model and commit it, with `allowUiUpdates: false` so Git stays authoritative. For anything reused across environments I would generate the JSON with Grafonnet or the Terraform provider rather than hand-maintaining thousands of lines.

**Q: What is `$__rate_interval` and why does it matter?**

It is a Grafana variable that automatically sizes the range window in a `rate()` query based on the dashboard's selected time range and the data source's scrape interval. It matters because a hard-coded window breaks. If a panel says `rate(x[5m])` and someone zooms into a two-minute window to look closely at an incident, there are not enough samples in range and the graph goes blank — exactly when they need it most. `$__rate_interval` scales the window so the query always has at least four scrape intervals of data. It is a small detail, but it is the difference between a dashboard that works during an incident and one that mysteriously empties when you zoom in.

**Q: How would you design a dashboard for a service?**

Around a question, not around available metrics. I would build three dashboards rather than one: an overview that answers "is this service healthy right now?", a deep-dive for diagnosis, and a business-metrics view. The overview leads with stat panels carrying thresholds — error rate, p99, requests per second, availability against the SLO — because a colour tells you the state faster than a number. Below that the golden signals as time series, then saturation, then dependencies in a collapsed row so the page loads fast and expands when you are actually debugging. Every panel gets units and a threshold, and panels link to the relevant runbook. I keep it under twenty panels, because beyond that nobody reads it and the query load starts to matter.

**Q: When would you use Grafana Alerting over Alertmanager or CloudWatch alarms?**

When the alert needs to span data sources, which Grafana is uniquely able to do — a rule combining a Prometheus latency query with a CloudWatch RDS metric is not expressible in either of the others. It is also the pragmatic choice for a mixed stack where you would otherwise define alerts in three separate systems. I would still use Alertmanager for a pure Prometheus stack, because the alert rules then live in Git next to the recording rules and the whole thing is one coherent configuration, and CloudWatch alarms specifically when the alarm needs to drive an AWS action such as an auto-scaling policy. The important principle is to pick one primary system — alerts scattered across three places is how you end up with duplicate pages and conditions nobody is actually watching.

**Q: Amazon Managed Grafana or self-hosted?**

AMG by default on AWS. The authentication integration is the strongest argument: IAM Identity Center or SAML works out of the box, and the CloudWatch, Amazon Managed Prometheus, and X-Ray data sources authenticate natively through IAM rather than needing credentials configured. That removes a meaningful amount of setup and a class of security problems. The reasons to self-host are a plugin AMG does not permit, since it only allows a curated set, and cost at scale — AMG is priced per active user per month, so a large number of occasional viewers gets expensive compared with running one container on a cluster you already operate. For a typical platform team with a handful of regular users, AMG wins.

---
[Monitoring Index](./README.md) | [← Prometheus](./03-prometheus.md) | [AWS X-Ray →](./05-xray.md)
