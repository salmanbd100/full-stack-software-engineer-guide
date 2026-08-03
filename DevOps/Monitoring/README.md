# Monitoring & Observability - Interview Preparation

Observability questions separate engineers who have operated production systems from those who have only built them. This guide covers the theory, the AWS tooling, and the human process around incidents.

## Table of Contents

1. [Fundamentals](./01-fundamentals.md) — three pillars, cardinality, percentiles, SLI/SLO/error budgets
2. [CloudWatch Deep Dive](./02-cloudwatch.md) — metric math, composite alarms, Logs Insights, EMF, cost control
3. [Prometheus](./03-prometheus.md) — architecture, PromQL, recording rules, scaling limits, AMP
4. [Grafana](./04-grafana.md) — dashboards as code, variables, panel design, AMG
5. [AWS X-Ray](./05-xray.md) — tracing, annotations vs metadata, sampling, OpenTelemetry
6. [Log Aggregation on AWS](./06-elk-aws.md) — Fluent Bit pipelines, OpenSearch index design, tiering
7. [Alerting & On-Call](./07-alerting.md) — symptoms vs causes, burn-rate alerts, noise reduction
8. [Incident Response](./08-incident-response.md) — incident command, runbooks, blameless postmortems

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 01 Fundamentals | Cardinality, percentiles, and SLOs come up in every interview |
| 🔴 Critical | 07 Alerting | "How do you design a good alert?" is near-guaranteed |
| 🔴 Critical | 02 CloudWatch | Required for any AWS-focused role |
| 🟡 High | 08 Incident Response | Senior and lead roles always probe this |
| 🟡 High | 03 Prometheus | Expected wherever containers are used |
| 🟡 High | 05 X-Ray | Microservices debugging scenarios |
| 🟢 Good to know | 04, 06 | Dashboard design, log pipeline economics |

## Top 12 Interview Questions

1. What is the difference between monitoring and observability?
2. What is cardinality and why does it matter?
3. Why alert on percentiles rather than averages?
4. Explain SLI, SLO, SLA, and error budgets.
5. Should you alert on high CPU?
6. An alarm never fired even though the service was down. Why?
7. How do you calculate a fleet-wide p99 — and what is the common mistake?
8. Why does Prometheus pull instead of push?
9. What problem does distributed tracing solve that metrics cannot?
10. What makes a good alert?
11. Walk me through handling a production incident.
12. What makes a postmortem blameless, and why does that matter?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Monitoring vs observability** | Known failures vs answering unanticipated questions; a property of your data |
| **The debugging workflow** | Metric alerts → trace locates the service → logs give the detail, joined by trace ID |
| **Cardinality** | Series count is the product of label values. Never label by user/request/session ID |
| **Averages** | Hide the tail. Alert on p99, report p50 |
| **You cannot average percentiles** | Aggregate histogram buckets first, then compute the quantile |
| **Symptoms not causes** | Page on user impact; keep CPU and memory on dashboards |
| **Missing data** | `treat_missing_data: breaching` — silence means dead |
| **Error rate not count** | 50 errors is a crisis at 100 rps and noise at 100,000 rps |
| **Burn-rate alerts** | Short window for speed AND long window for confirmation |
| **X-Ray sampling** | Head-based, so it misses rare errors. Fix with ADOT tail sampling |
| **Mitigate before diagnose** | Roll back first; the code can be understood later |
| **Blameless** | "The pipeline allowed it", never "Sam was careless" |

## Cost Traps Cheat Sheet

The questions that show you have owned a bill.

| Trap | Cost | Fix |
|------|------|-----|
| Log group with no retention | 🔴 Largest single CloudWatch cost | Set retention on every group |
| `DEBUG` on in production | 10× log volume | `INFO` default |
| `user_id` as a metric dimension | One billed metric per user | Logs and traces instead |
| Health check logs | 30–60% of Kubernetes log volume | Drop at the shipper |
| Over-sharding OpenSearch | Wasted heap, slow queries | 10–50 GB per shard |
| VPC Flow Logs to CloudWatch | Enormous ingestion | Send to S3 |
| Insights scanning 30 days | Per-GB scanned | Narrow the time range |
| Long retention in a hot index | ~20× S3 cost | UltraWarm, then S3 + Athena |

## Debugging Cheat Sheet

| Symptom | First Thing to Check |
|---------|---------------------|
| Alert never fired during an outage | `treat_missing_data` setting |
| Prometheus OOMKilled | Cardinality — a new label with unbounded values |
| Grafana panel blank when zoomed in | Hard-coded rate window; use `$__rate_interval` |
| Trace split into fragments | A service not forwarding `X-Amzn-Trace-Id` |
| Error traces never sampled | Head-based sampling; add tail sampling |
| Cannot filter traces by a field | It was added as metadata, not an annotation |
| Cannot aggregate an OpenSearch field | Mapped as `text` instead of `keyword` |
| One failure, forty pages | No Alertmanager inhibition rules |
| Metrics from 6 months ago missing detail | CloudWatch aggregates old data — it is gone |

## Study Path

**Start here →** [Fundamentals](./01-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01: pillars, cardinality, SLOs | 3–4 hours |
| AWS native | 02, 05: CloudWatch, X-Ray | 4–5 hours |
| Open source | 03, 04: Prometheus, Grafana | 4–6 hours |
| Operations | 07, 08: alerting, incident response | 4–5 hours |
| Scale & cost | 06: log pipelines and economics | 2–3 hours |

## Related Topics

- [Kubernetes Monitoring](../Kubernetes/09-monitoring.md) — Prometheus Operator, ServiceMonitors, container metrics
- [AWS CloudWatch](../AWS/14-cloudwatch.md) — namespaces, standard metrics, the agent
- [CI/CD Fundamentals](../CICD/01-cicd-fundamentals.md) — DORA metrics and change failure rate
- [Deployment Strategies](../CICD/06-deployment-strategies.md) — canary analysis depends on good metrics
- [Terraform CI/CD](../Terraform/08-cicd.md) — drift detection as infrastructure monitoring

---
[← DevOps](../README.md)
