---
title: Observability
part: 8
chapter: 0
slug: ship-observability-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [observability, monitoring, metrics, dashboards, alerting, slo]
in_book: true
---

# Observability

Monitoring answers questions you thought of in advance. Observability is whether you can answer the
question you did not think of, at two in the morning, from the data you already collect. That
distinction is the whole section, and it is the fastest way an interviewer can tell whether you have
operated a system or only built one.

Three chapters, in the order the work actually happens: decide what to measure and what you are
committing to, collect it and put it on a screen, then turn it into something that wakes a human.
Alerting is last on purpose — an alert is only ever as good as the signal underneath it.

## Chapters

| #  | Chapter                                                                   | What it answers                                                     |
| -- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [Monitoring and Observability Fundamentals](./01-fundamentals.md)         | What do you measure, and what does an SLO commit you to?            |
| 02 | [Metrics and Dashboards](./02-metrics-and-dashboards.md)                  | How are metrics collected and queried, and what makes a screen readable? |
| 03 | [Alerting and On-Call](./03-alerting-and-on-call.md)                      | What makes an alert worth waking a human for?                       |

## What Interviewers Probe For

Four observability-specific questions, on top of the part-level signals in the Part VIII opener:

- **Why percentiles, not averages?** An average latency of 200 ms can hide a p99 of nine seconds. The
  follow-up is the real test: you cannot average percentiles across instances — you aggregate the
  histogram buckets first, then compute the quantile.
- **What is cardinality, and why does it end careers?** The number of time series is the product of
  every label's distinct values. A user ID or a request ID in a label is how a metrics backend runs
  out of memory. Candidates who have caused it never forget it.
- **Would you alert on high CPU?** No — page on user-visible symptoms and keep resource metrics on the
  dashboard for diagnosis. High CPU is not an outage; a rising error rate is.
- **An alarm never fired during an outage. Why?** Because the service stopped reporting and the rule
  treated missing data as healthy. Silence has to mean broken.

## Reading Order

01 first, always — the rest of the section assumes its vocabulary, particularly cardinality and the
error budget. Then 02, because the burn-rate alerts in 03 query the recording rules 02 defines. Finish
with 03.
