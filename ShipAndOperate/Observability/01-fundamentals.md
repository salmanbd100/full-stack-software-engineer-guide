---
title: Monitoring & Observability Fundamentals
part: 8
chapter: 0
slug: monitoring-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-28
tags: [devops, monitoring, fundamentals]
in_book: true
---

# Monitoring & Observability Fundamentals

Monitoring tells you **that** something is wrong. Observability lets you work out **why**, for a failure you did not predict.

## Monitoring vs Observability

This distinction is the standard opening question, and most candidates give a vague answer.

| | Monitoring | Observability |
|---|---|---|
| **Question** | Is the known thing broken? | Why is this unknown thing happening? |
| **Built from** | Dashboards and alerts you defined in advance | High-detail data you can query freely |
| **Handles** | Known failure modes | Failures nobody predicted |
| **Fails when** | The failure is novel | Data lacks the dimension you need |

**A concrete example:**

- **Monitoring:** "CPU is above 80%" — you knew to watch CPU, so you set an alarm.
- **Observability:** "Checkout is slow, but only for users on Android, in Germany, who have more than 50 items in their basket." Nobody built a dashboard for that. You need to slice the data by dimensions after the fact.

> Observability is a property of your **data**, not a product you buy. If you cannot ask a new question without shipping code, you do not have it.

## The Three Pillars

| Pillar | Answers | Cost | Cardinality |
|--------|---------|------|-------------|
| **Metrics** | "How many, how fast, how often?" | Cheap | 🔴 Must stay low |
| **Logs** | "What exactly happened in this one case?" | Expensive at volume | Unlimited |
| **Traces** | "Where did the time go across services?" | Moderate (sampled) | High |

```
Alert fires (metric)  →  "error rate is 4%"
        ↓
Find affected requests (trace)  →  "the payments service adds 3s"
        ↓
Read the detail (log)  →  "connection pool exhausted at 14:32:11"
```

✅ That flow — metric to trace to log — is the answer to "how do you debug a production incident?"

### Metrics

Numbers over time, aggregated. Four types:

| Type | Meaning | Example |
|------|---------|---------|
| **Counter** | Only goes up | `http_requests_total` |
| **Gauge** | Goes up and down | `queue_depth`, `memory_bytes` |
| **Histogram** | Bucketed distribution | `request_duration_seconds` |
| **Summary** | Pre-computed quantiles | client-side p99 |

⚠️ **Use histograms, not summaries, for latency.** Summaries compute quantiles per instance, and you cannot average percentiles across instances. Histograms keep buckets, which *can* be aggregated.

### 🔴 Cardinality — the metric that kills your bill

**Cardinality** is the number of unique time series a metric produces. It is the product of every label's distinct values.

```
http_requests_total{method, status, endpoint}

method:   5 values
status:   8 values
endpoint: 20 values
                       → 800 time series ✅ fine
```

```
http_requests_total{method, status, endpoint, user_id}

user_id: 2,000,000 values
                       → 1,600,000,000 time series 🔴 outage
```

**Never use as a metric label:** user ID, request ID, session ID, email, full URL with parameters, timestamp.

✅ Those belong in **logs and traces**, which are designed for unbounded detail. This is the single most common observability mistake, and interviewers ask about it directly.

### Logs

**Always structured.** Text logs cannot be queried without fragile regex.

❌ **Unstructured:**

```
2024-08-03 14:32:11 ERROR Payment failed for user 8891 amount 42.50
```

✅ **Structured:**

```json
{
  "timestamp": "2024-08-03T14:32:11Z",
  "level": "error",
  "message": "payment failed",
  "user_id": "8891",
  "amount": 42.50,
  "trace_id": "1-5f9a2b3c-4d5e6f7a8b9c0d1e",
  "service": "payments"
}
```

✅ **The `trace_id` field is the critical one.** It is what lets you jump from a log line to the full request trace, and from a trace to all its logs.

**Log levels, used properly:**

| Level | Means | Alert on it? |
|-------|-------|--------------|
| `ERROR` | A request failed; a human may need to act | Yes, on rate |
| `WARN` | Degraded but handled — retry succeeded | On a spike |
| `INFO` | Significant business events | No |
| `DEBUG` | Detail for diagnosis | Off in production |

⚠️ If everything is `ERROR`, nothing is. Teams that log handled retries as errors end up ignoring the error graph entirely.

### Traces

A trace follows one request across every service. Each unit of work is a **span**.

```
Trace: checkout request (total 1,240ms)
├── api-gateway              1,240ms
    ├── auth-service            45ms
    ├── cart-service            80ms
    │   └── redis GET           12ms
    └── payment-service      1,100ms  ← 🔴 the problem
        ├── fraud-check         120ms
        └── stripe API          960ms  ← the real problem
```

✅ Traces answer the question metrics cannot: **which** component consumed the latency. Without them, "checkout is slow" means reading six dashboards.

**Sampling** — you cannot afford to trace everything:

| Strategy | How | Tradeoff |
|----------|-----|----------|
| **Head-based** | Decide at the first span (for example, keep 5%) | Cheap; may miss the rare error |
| **Tail-based** | Decide after the trace completes | ✅ Keeps all errors and slow requests; needs a buffer |

✅ Best practice: sample successful fast requests aggressively, keep **100% of errors and slow requests**. Those are the ones you will actually investigate.

## The Golden Signals

Google's four signals. If you monitor nothing else, monitor these per service.

| Signal | Question | Typical Metric |
|--------|----------|----------------|
| **Latency** | How slow? | p50, p95, p99 duration |
| **Traffic** | How much demand? | requests per second |
| **Errors** | How often does it fail? | 5xx rate as a percentage |
| **Saturation** | How full? | queue depth, connection pool usage, CPU |

⚠️ **Measure latency of successes and failures separately.** A fast 500 makes your average latency look excellent while the service is completely broken.

**Related frameworks:**

- **RED** — Rate, Errors, Duration. For request-driven services.
- **USE** — Utilization, Saturation, Errors. For resources like disks and CPUs.

## Percentiles, Not Averages

🔴 **Averages hide everything that matters.**

```
1000 requests:
  990 take 50ms
   10 take 5,000ms

Average:  99.5ms   ← looks fine
p99:      5,000ms  ← 10 users had a terrible experience
```

| Percentile | Read As |
|-----------|---------|
| p50 | The typical experience |
| p95 | Where the pain begins |
| p99 | Your worst-affected real users |
| p99.9 | Matters at scale — 1,000 users out of a million |

✅ Alert on **p99**, report **p50** to describe normal behaviour.

⚠️ **You cannot average percentiles.** The mean of two instances' p99 values is not the fleet p99. This is why histograms matter — you aggregate buckets, then compute the percentile.

## SLI, SLO, SLA, and Error Budgets

The vocabulary interviewers expect you to use precisely.

| Term | Definition | Example |
|------|-----------|---------|
| **SLI** | The measurement | % of requests served under 300ms |
| **SLO** | Your internal target | 99.9% of requests under 300ms over 30 days |
| **SLA** | A contract with penalties | 99.5% uptime or the customer gets credit |

```
SLA  ← the promise to customers (loosest, has money attached)
 ↑
SLO  ← your internal target (stricter, so you never breach the SLA)
 ↑
SLI  ← what you actually measure
```

✅ Always set the SLO **stricter** than the SLA. The gap is your safety margin.

### Error Budgets

If your SLO is 99.9%, then 0.1% failure is **allowed**. That allowance is the error budget.

```
SLO: 99.9% over 30 days
Error budget: 0.1% × 30 days = 43 minutes of failure
```

| Budget State | What It Means |
|-------------|---------------|
| Budget remaining | ✅ Ship features, take risks |
| Budget exhausted | 🔴 Freeze features, work on reliability |

> The error budget turns "how reliable should we be?" from an argument into a number. It also makes the case that **100% is the wrong target** — chasing it means shipping nothing.

**Nines, in real time:**

| Availability | Downtime per Month |
|-------------|-------------------|
| 99% | 7.2 hours |
| 99.9% | 43 minutes |
| 99.95% | 22 minutes |
| 99.99% | 4.3 minutes |
| 99.999% | 26 seconds |

⚠️ Each extra nine costs roughly an order of magnitude more. 99.999% means no human can be in the recovery path — automation has to do it.

## What to Actually Monitor

**Symptoms, not causes.** This is the principle that keeps alert volume sane.

| ✅ Alert on (symptom) | ❌ Don't page on (cause) |
|----------------------|-------------------------|
| Error rate above 1% | CPU at 90% |
| p99 latency above 1s | A pod restarted |
| Queue depth growing for 10 min | Memory at 75% |
| Certificate expires in 7 days | Disk at 70% |

**Why:** high CPU with users unaffected is not an incident. A pod restarting that the platform replaced automatically is not an incident. Paging on causes creates noise; paging on symptoms creates signal.

✅ Keep cause metrics on **dashboards** — you need them to diagnose, just not to wake someone up.

## Push vs Pull

| | Pull (Prometheus) | Push (CloudWatch, StatsD) |
|---|---|---|
| **Model** | Server scrapes `/metrics` | Client sends to a collector |
| **Discovery** | Server needs to find targets | Client just needs an endpoint |
| **Down target** | ✅ Scrape fails — you know it is down | Silence, which is ambiguous |
| **Short-lived jobs** | 🔴 Poor fit — needs a Pushgateway | ✅ Natural fit |
| **Firewalls** | Needs inbound access to targets | ✅ Outbound only |

✅ Pull's real advantage is that a failed scrape is itself a signal. With push, "no data" could mean the service is dead or the network is broken — you cannot tell.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| User ID as a metric label | Cardinality explosion, huge bill | Put it in logs and traces |
| Alerting on averages | Miss the tail entirely | Alert on p99 |
| Alerting on causes | Alert fatigue, ignored pages | Alert on symptoms |
| Unstructured logs | Cannot query without regex | JSON with a `trace_id` |
| No trace ID correlation | Manual timestamp matching across services | Propagate context |
| Dashboards nobody reads | Effort with no payoff | Build dashboards to answer specific questions |
| `DEBUG` in production | Enormous log bill | `INFO` default, dynamic level change |

## Interview Q&A

**Q: What is the difference between monitoring and observability?**

Monitoring is checking whether things you already know can break are broken — you decide in advance what to measure, build a dashboard, and set alerts. Observability is the ability to answer questions you did not anticipate, without shipping new code. The distinction shows up under pressure: monitoring handles "the disk filled up", but only observability handles "checkout is slow for Android users in Germany with large baskets", because nobody built that dashboard. It is a property of your data rather than a tool you buy — if the data has high enough detail and enough dimensions to slice on, you can explore; if it is pre-aggregated into a handful of counters, you cannot, no matter what vendor you use.

**Q: What are the three pillars, and how do you use them together?**

Metrics, logs, and traces. Metrics are cheap numeric aggregates and are what you alert on, but they cannot tell you about an individual request. Logs are detailed records of specific events, unlimited in detail but expensive at volume. Traces follow one request across service boundaries and show where the time went. In practice they form a workflow: a metric alert tells you the error rate is up, a trace tells you which service in the chain is responsible, and logs from that service tell you exactly what failed. The thing that makes the workflow function is correlation — every log line and every span carries the same trace ID, so you can move between the three instead of manually matching timestamps.

**Q: What is cardinality and why does it matter?**

Cardinality is the number of unique time series a metric generates, which is the product of the distinct values of all its labels. It matters because metric storage cost and query performance scale with cardinality, not with request volume. A counter labelled by method, status, and endpoint might produce a few hundred series, which is fine. Add a `user_id` label and you get one series per user — millions of them — which will take down your metrics backend and produce an enormous bill. The rule is that metric labels must be bounded and low-value-count, so unique identifiers like user ID, request ID, session ID, or full URLs with query parameters must never be labels. Those dimensions belong in logs and traces, which are built for unbounded detail.

**Q: Why alert on percentiles instead of averages?**

Because averages hide the tail, and the tail is where users suffer. If 990 requests take 50 milliseconds and 10 take 5 seconds, the average is under 100 milliseconds and looks healthy, while ten users had an experience bad enough to leave. The p99 shows 5 seconds and tells you the truth. I alert on p99 and report p50 as the description of normal behaviour. There is an important technical caveat: you cannot average percentiles across instances — the mean of two hosts' p99 values is not the fleet p99. That is why latency should be recorded as a histogram rather than a summary, because histogram buckets can be aggregated correctly and the percentile computed afterwards.

**Q: Explain SLI, SLO, SLA, and error budgets.**

The SLI is the measurement — for example, the proportion of requests served successfully in under 300 milliseconds. The SLO is the internal target for that measurement, such as 99.9% over a rolling 30 days. The SLA is a contract with a customer that has financial consequences, and it should always be looser than the SLO so you have margin before you owe anyone money. The error budget falls out of the SLO: 99.9% over thirty days permits about 43 minutes of failure, and that allowance is a budget you are allowed to spend. Its value is political as much as technical — while budget remains, the team ships features and takes risks, and when it is exhausted, reliability work takes priority. It also makes clear that 100% is the wrong target, because pursuing it means never shipping.

**Q: Should you alert on high CPU?**

Generally no, not as a page. CPU is a cause, not a symptom, and high CPU with users unaffected is not an incident — you would be waking someone up for a number rather than a problem. What deserves a page is user-visible impact: error rate above threshold, p99 latency breaching the SLO, a queue that has been growing for ten minutes. If CPU saturation is genuinely causing harm, the latency or error alert fires anyway, and CPU is then the first thing you look at while diagnosing. So cause metrics belong on dashboards and in runbooks, not in the paging path. The exception is slow-burn capacity signals like a disk that will fill in four hours, which should raise a ticket during working hours rather than a page at 3am.

**Q: What is the advantage of a pull-based metrics system?**

The main one is that a failed scrape is itself a signal. When Prometheus cannot reach a target, it records that the target is down, which is unambiguous. In a push model, the absence of data could mean the service is dead, the collector is broken, or the network dropped the packets — you cannot distinguish those, and "no data" is the hardest state to alert on correctly. Pull also centralises configuration, so scrape intervals and relabelling live in one place rather than in every application. The tradeoffs are real though: pull needs network access from the server to every target, which is awkward across firewalls, and it fits short-lived batch jobs poorly, since a job may finish before it is ever scraped — which is what the Pushgateway exists to work around.

---

[Observability Index](./README.md) | [Prometheus →](./02-prometheus.md)
