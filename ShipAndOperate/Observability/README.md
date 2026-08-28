---
title: Part VIII — Observability
part: 8
chapter: 0
slug: ship-observability-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [observability, monitoring, prometheus, grafana, alerting, slo]
in_book: true
---

# Part VIII — Observability

Monitoring answers questions you thought of in advance. Observability is whether you can answer the
question you did not think of, at two in the morning, from the data you already collect. That
distinction is the whole section, and it is the fastest way an interviewer can tell whether you have
operated a system or only built one.

The four chapters run from the vocabulary — pillars, cardinality, percentiles, SLOs — through the
two tools most teams standardise on, to the part that actually wakes people up. Alerting is last on
purpose: an alert is only as good as the signal underneath it.

## Chapters

| #  | Chapter                                                                        | What it answers                                                |
| -- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 01 | [Monitoring and Observability Fundamentals](./01-fundamentals.md)              | What do you measure, and what does an SLO commit you to?       |
| 02 | [Prometheus](./02-prometheus.md)                                               | How are metrics collected, and what makes one blow up memory?  |
| 03 | [Grafana](./03-grafana.md)                                                     | What makes a dashboard someone can read under pressure?        |
| 04 | [Alerting and On-Call](./04-alerting.md)                                       | What makes an alert worth waking a human for?                  |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way
back.** Four questions carry most of the weight:

- **Why percentiles, not averages?** An average latency of 200 ms can hide a p99 of nine seconds.
  The follow-up is the real test: you cannot average percentiles across instances — you aggregate the
  histogram buckets first, then compute the quantile.
- **What is cardinality, and why does it end careers?** The number of time series is the product of
  every label's distinct values. Putting a user ID or a request ID in a label is how a metrics
  backend runs out of memory. Candidates who have caused this never forget it.
- **Would you alert on high CPU?** No — alert on user-visible symptoms and keep resource metrics on
  the dashboard for diagnosis. High CPU is not an outage; a rising error rate is.
- **An alarm never fired during an outage. Why?** Because the service stopped reporting and the
  alarm treated missing data as healthy. Silence has to mean broken.

## Reading Order

01 first, always — the rest of the section assumes its vocabulary. Then 02 and 03 as a pair, since a
dashboard is only a view over the query language. Finish with 04.

**Interview sprint:** 01 → 04. Fundamentals and alerting are where nearly every observability
question lands.
