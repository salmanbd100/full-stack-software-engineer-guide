---
title: Alerting and On-Call
part: 8
chapter: 0
slug: alerting
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-02
tags: [observability, alerting, on-call, slo, burn-rate, incident-response]
in_book: true
---

# Alerting and On-Call {#ch-alerting}

> Write alerts a tired engineer can act on at 3am, and delete the ones nobody trusts any more.

**In this chapter:** urgent, actionable, real · symptoms over causes · burn-rate alerting · reducing noise · sustainable on-call

## 💡 The Core Idea

**Every page must be urgent, actionable, and real.** If any one of the three is missing, it should not
be a page.

| Test | If it fails |
| ---- | ----------- |
| **Urgent** — must be fixed now, not tomorrow | Make it a ticket |
| **Actionable** — a human can do something about it | Fix the system, or automate the response |
| **Real** — something is genuinely broken | Fix the threshold, or delete the alert |

Alert fatigue is the actual failure mode of monitoring, not missing coverage. Once a team learns that
most pages are noise, response time to real incidents collapses — and it collapses invisibly, because
the dashboards still look thorough. A system with two hundred noisy alerts is worse than one with ten
good ones.

> The useful audit is pages per on-call shift. Above roughly two, the monitoring is broken, not the
> infrastructure.

## How It Works

### Symptoms, Not Causes

The highest-leverage principle in alerting, and the one candidates most often get wrong.

| ✅ Page on this (a symptom — users affected) | ❌ Not this (a cause) |
| ------------------------------------------ | -------------------- |
| Error rate breaching the SLO burn threshold | CPU at 90% |
| p99 latency above one second | A container restarted |
| Queue depth rising for fifteen minutes | Memory at 80% |
| Zero successful logins in five minutes | Disk at 70% |
| Payment success rate down ten points | A node became unhealthy |

High CPU with users unaffected is not an incident, and nor is a container that restarted and was
replaced automatically. Paging on causes produces volume without meaning, and if a cause is genuinely
harmful the symptom alert fires anyway. ✅ Cause metrics belong on **dashboards** and in **runbooks** —
you need them to diagnose, just not to wake anyone.

### Three Severities, and Only Three

| Severity | Response | Channel | Example |
| -------- | -------- | ------- | ------- |
| **Critical** | Now, wake someone | Pager or phone | Checkout failing; risk of data loss |
| **Warning** | Next working day | Chat or ticket | Disk fills in four days; slow budget burn |
| **Info** | None | Log or dashboard | Deploy completed |

More than three and nobody remembers the difference. ⚠️ If everything is critical, nothing is.

### Burn-Rate Alerting

The problem with a fixed threshold is a genuine tradeoff you cannot escape by tuning: a short
evaluation window pages on every transient blip, and a long one is slow to catch a real outage.

Burn-rate alerting fixes it by alerting on **how fast you are consuming the error budget**, and
requiring a short *and* a long window to breach before it fires.

| Burn rate | Budget consumed | Detect within | Severity |
| --------- | --------------- | ------------- | -------- |
| **14.4×** | 2% in 1 hour | 2 min | Critical — page |
| **3×** | 10% in 1 day | 1 hour | Warning — ticket |

```yaml
# Fast burn — at this rate the whole month's budget is gone in about two days
- alert: ErrorBudgetBurnFast
  expr: |
    (job:http_errors:ratio5m{job="checkout"} > 14.4 * 0.001)
      and
    (job:http_errors:ratio1h{job="checkout"} > 14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
    team: checkout
  annotations:
    summary: "Checkout burning error budget 14x — {{ $value | humanizePercentage }}"
    runbook: "https://runbooks.internal/checkout-errors"

# Slow burn — same shape at 3x over the 6h and 1d windows, severity: warning
```

✅ The short window gives fast detection; the long window confirms it is sustained. A thirty-second
spike does not page, because the long window has not moved. The `for` duration is what stops flapping
on a single bad scrape.

### Silence Has to Mean Broken

The most common real-world alerting failure is an alarm that never fired during a total outage. The
cause is almost always missing-data handling.

An alarm watching a counter the application itself emits has nothing to compare when the application
dies — the metric does not breach a threshold, it stops existing. If the rule treats absent data as
healthy, the outage is silent. Two fixes, and you want both:

- Configure the rule so **missing data breaches**, not the reverse. Every metrics system has this
  setting and its default is rarely what you want.
- Alert on something that exists **independently of the application** — load balancer target health,
  5xx counts at the edge, or an external prober. Those keep reporting when every instance is dead.

✅ Notify on recovery too. Without it, nobody knows the incident ended except by going and checking.

## When to Use It

### Writing One Someone Can Act On

❌ **Useless:** `ALERT: DiskSpaceWarning` · `Value: 87`

✅ **Actionable:**

```yaml
annotations:
  summary: >-
    {{ $labels.instance }} root volume is {{ $value | humanize }}% full,
    projected to fill in 3 hours
  description: >-
    Growth is 4 GB/hour, driven by /var/log. Rotate logs, then find the writer.
  runbook: "https://runbooks.internal/disk-full"
  dashboard: "https://grafana.internal/d/node?var-instance={{ $labels.instance }}"
```

Every alert needs six things: what is broken in plain words, which instance, the value against the
threshold, user impact (or explicitly "none yet"), a runbook link, and a dashboard link already
filtered to the affected thing.

> The runbook link is the highest-value field on the whole alert. At 3am nobody reasons from first
> principles — they follow steps.

### Reducing Noise

| Technique | What it solves |
| --------- | -------------- |
| **Grouping** | Forty failing instances become one notification, not forty |
| **Inhibition** | Cluster down suppresses every per-service alert inside it |
| **Deployment silence** | The expected error blip during a rolling deploy |
| **Composite conditions** | Errors *and* latency, rather than either alone |

```yaml
inhibit_rules:
  # The whole cluster is down — don't also page for every service inside it
  - source_matchers: [alertname="ClusterDown"]
    target_matchers: [severity="critical"]
    equal: [cluster]
```

✅ **Inhibition is the difference between one useful page and a phone vibrating for ten minutes.**

### On-Call That Does Not Burn People Out

| Practice | Why |
| -------- | --- |
| At least six engineers in the rotation | One week in six, not one in two |
| A primary and a secondary | Escalation when the primary is unreachable |
| Written handover notes | The next person inherits context, not surprises |
| Compensated time off after a bad night | Sleep debt causes the next outage |
| On-call is paid | It is work |
| **The person woken can delete the alert** | Whoever suffers the noise has authority to remove it |

⚠️ The last row is the one that decides whether any of the others hold. If the engineer being paged
cannot retune or delete a bad alert, noise accumulates forever, because nobody who feels it can fix it.

**Escalate on acknowledgement, not resolution** — `primary → 5 min no ack → secondary → 5 min no ack →
lead`. Someone confirming they are looking is what stops the chain; requiring a fix means it fires in
the middle of a legitimate long incident.

### The Monthly Alert Review

For every alert that fired last month, four questions. Each "no" has a fixed consequence.

| Question | If no |
| -------- | ----- |
| Was it real? | Fix the threshold, or delete the alert |
| Was it actionable? | Automate the fix, or downgrade it to a ticket |
| Did it need a human? | Automate the remediation |
| Was the runbook used? | The runbook is wrong or missing |

Four numbers make the review objective: pages per shift (under two), share actionable (above 90%),
alerts with a runbook (100%), and mean time to acknowledge (under five minutes).

## Common Mistakes

| Mistake | Consequence | Fix |
| ------- | ----------- | --- |
| Paging on causes | Constant noise, ignored pages | Alert on symptoms |
| No `for` duration | Every blip fires | A duration the condition must hold for |
| Missing data treated as healthy | Silent failure when the app dies | Missing data breaches |
| Alerting on absolute error counts | Wrong at every traffic level | Alert on a rate or a ratio |
| No runbook, or no owning team | Slow response, then nothing gets fixed | A runbook link and a `team` label on every alert |

## 🔑 Key Takeaways

- A page must be urgent, actionable, and real; anything failing one of those is a ticket, an
  automation task, or a deletion.
- Alert on user-visible symptoms and keep cause metrics for diagnosis, because a cause with no impact
  is not an incident.
- Burn-rate alerting on two windows escapes the choice between paging on blips and detecting outages
  slowly.
- Absent data must count as a breach, and the strongest alerts watch something that survives the
  application's death.
- The engineer being woken must have authority to delete the alert that woke them, or noise
  accumulates permanently.

## Interview Questions

**Q: What makes a good alert?**

Three properties, all required: urgent, actionable, and real. Urgent means it cannot wait until
tomorrow, or it is a ticket rather than a page. Actionable means a human can do something right now —
and if the response is always the same fix, automate that instead. Real means genuine breakage rather
than a threshold set too tight. Beyond that the text has to be useful at 3am: what is broken, which
system, the current value against the threshold, whether users are affected, and links to a runbook
and a pre-filtered dashboard. The runbook link is the highest-value part, because under pressure
nobody reasons from first principles.

**Q: Why alert on symptoms rather than causes?**

Because causes generate volume without meaning. High CPU with users unaffected is not an incident, and
a container that restarted and was immediately replaced is not one either — paging on those trains the
team to ignore pages, which is the failure you cannot see coming. Symptoms are user-visible: error
rate breaching the SLO, p99 above target, a queue growing for fifteen minutes. If a cause is genuinely
harmful the symptom alert fires anyway, and the cause metric is then the first thing you look at while
diagnosing. The exception is slow-burn capacity signals like a disk filling in four hours, which
deserve a ticket in working hours because the symptom would arrive as an outage.

**Q: Explain burn-rate alerting.**

It alerts on how quickly you are consuming the error budget rather than on a fixed error rate, and it
evaluates two windows at once. The tradeoff it escapes is real: a short window pages on every
transient spike, a long one detects a genuine outage slowly. Pairing a short window for responsiveness
with a long one for confirmation, and firing only when both breach, means a thirty-second blip is
ignored while a sustained failure trips both within minutes. You run tiers — 14.4× pages because the
month's budget will be gone in two days, 3× opens a ticket. It also ties alerting to the SLO rather
than to a number someone guessed.

**Q: An alarm never fired even though the service was completely down. Why?**

Almost certainly missing-data handling. The alarm was watching a metric the application itself emits,
such as an error counter, and when the application died it stopped emitting anything — so rather than
breaching a threshold, the metric simply vanished, and the rule either held its last healthy state or
actively treated silence as healthy. The fix is to configure absence as a breach for any metric where
no data means failure. More robustly, alert on something that exists independently of the application
— load balancer target health, 5xx counts at the edge, or an external prober — because those keep
reporting when every instance is dead.

**Q: How do you stop one failure generating forty pages?**

Grouping and inhibition. Grouping batches alerts sharing labels into a single notification, so forty
failing instances produce one message listing them. Inhibition is the more powerful one: while a
cluster-down alert is firing, every critical alert scoped to that cluster is suppressed, because they
are all consequences of one root cause — and a dead node likewise inhibits the alerts for the
containers on it. Alongside those, a `for` duration stops transient conditions firing at all, and a
deploy-in-progress silence stops the expected blip during a rolling release from waking anyone.

**Q: How do you make on-call sustainable?**

Structurally and culturally. Structurally: at least six people so it is one week in six, a primary and
secondary with escalation on acknowledgement rather than resolution, written handovers, and
compensated time off after a night that was genuinely disrupted. Culturally, the rule that decides
whether any of that holds is that the person woken has authority to delete or retune the alert that
woke them — without it noise accumulates indefinitely, because nobody who suffers it can act. I would
also run the monthly review, and track pages per shift as a defect rate in the monitoring rather than
as bad luck.

## What to Read Next

- [Chapter ?? — Monitoring and Observability Fundamentals](#ch-monitoring-fundamentals) — the SLO and error budget these alerts are derived from
- [Chapter ?? — Metrics and Dashboards](#ch-metrics-and-dashboards) — the recording rules the burn-rate expressions query
- [Chapter ?? — Deployment Strategies and Rollback](#ch-deployment-strategies) — what happens after the page is acknowledged
