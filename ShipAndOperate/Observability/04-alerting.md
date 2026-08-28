---
title: Alerting and On-Call
part: 8
chapter: 0
slug: alerting
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-28
tags: [devops, monitoring, alerting]
in_book: true
---

# Alerting and On-Call {#ch-alerting}

> Write alerts a tired engineer can act on at 3am, and delete the ones nobody trusts.

**In this chapter:** urgent, actionable, real · symptoms over causes · burn-rate alerting · reducing noise · sustainable on-call

## The Only Rule That Matters

> **Every page must be urgent, actionable, and real.**

If any of the three is missing, it should not be a page.

| Test | If it fails |
|------|------------|
| **Urgent** — must be fixed now, not tomorrow | Make it a ticket |
| **Actionable** — a human can do something | Fix the system, don't alert |
| **Real** — it is genuinely broken | Fix the alert threshold |

🔴 **Alert fatigue is the actual failure mode of monitoring.** Once a team learns that most pages are noise, response time to real incidents collapses. A monitoring system with 200 noisy alerts is worse than one with 10 good ones.

## Symptoms, Not Causes

The single highest-leverage principle in alerting.

| ✅ Page on (symptom — users affected) | ❌ Don't page on (cause) |
|-------------------------------------|-------------------------|
| Error rate above SLO burn threshold | CPU at 90% |
| p99 latency above 1s | A pod restarted |
| Queue depth rising for 15 min | Memory at 80% |
| Zero successful logins in 5 min | Disk at 70% |
| Payment success rate dropped 10% | A node became unhealthy |

**Why:** high CPU with users unaffected is not an incident. A pod that restarted and was replaced automatically is not an incident. Paging on causes generates volume without meaning.

✅ Cause metrics belong on **dashboards** and in **runbooks** — you need them to diagnose, just not to wake someone.

## Alert Severity

Three levels. More than three and nobody remembers the difference.

| Severity | Response | Channel | Example |
|----------|----------|---------|---------|
| **Critical** | Now, wake someone | Pager / phone | Checkout is failing; data loss risk |
| **Warning** | Next business day | Slack / ticket | Disk fills in 4 days; slow burn on error budget |
| **Info** | No response | Log / dashboard | Deploy completed |

🔴 **If everything is critical, nothing is.** A useful audit: count pages per week. Above roughly two per on-call shift, the system is broken, not the infrastructure.

## Burn-Rate Alerting

The SRE-grade approach: alert on how fast you are consuming your error budget, not on a fixed threshold.

**The problem with a fixed threshold:**

```
"error rate > 1% for 5 minutes"

Short window  → every transient blip pages someone
Long window   → slow to detect a real outage
```

**The fix — require a short AND a long window to breach:**

| Burn Rate | Budget Consumed | Detect Within | Severity |
|-----------|----------------|---------------|----------|
| **14.4×** | 2% in 1 hour | 2 min | 🔴 Critical — page |
| **6×** | 5% in 6 hours | 15 min | 🔴 Critical — page |
| **3×** | 10% in 1 day | 1 hour | ⚠️ Warning — ticket |
| **1×** | 100% in 30 days | 3 hours | ⚠️ Warning — ticket |

```yaml
# Fast burn — the budget will be gone in about 2 days
- alert: ErrorBudgetBurnFast
  expr: |
    (job:errors:ratio5m{job="checkout"}  > 14.4 * 0.001)
      and
    (job:errors:ratio1h{job="checkout"}  > 14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Checkout burning error budget 14x — {{ $value | humanizePercentage }}"
    runbook: "https://wiki.acme.com/runbooks/checkout-errors"

# Slow burn — degraded, not urgent
- alert: ErrorBudgetBurnSlow
  expr: |
    (job:errors:ratio6h{job="checkout"}  > 3 * 0.001)
      and
    (job:errors:ratio1d{job="checkout"}  > 3 * 0.001)
  for: 1h
  labels:
    severity: warning
```

✅ The short window gives fast detection; the long window confirms it is sustained. A 30-second spike does not page, because the long window has not moved.

## Writing an Alert Someone Can Act On

❌ **Useless:**

```
ALERT: DiskSpaceWarning
Value: 87
```

✅ **Actionable:**

```yaml
annotations:
  summary: >-
    {{ $labels.instance }} root volume is {{ $value | humanize }}% full,
    projected to fill in 3 hours
  description: >-
    Growth is 4 GB/hour, driven by /var/log.
    Immediate action: rotate logs with `logrotate -f /etc/logrotate.conf`
  runbook: "https://wiki.acme.com/runbooks/disk-full"
  dashboard: "https://grafana.acme.com/d/node/node-detail?var-instance={{ $labels.instance }}"
```

**Every alert needs:**

- [ ] What is broken, in plain words
- [ ] Which system or instance
- [ ] The current value and the threshold
- [ ] User impact — or explicitly "no user impact yet"
- [ ] A runbook link
- [ ] A dashboard link, pre-filtered to the affected thing

> ✨ The runbook link is the highest-value field. At 3am, nobody reasons from first principles — they follow steps.

## Reducing Noise

| Technique | What It Solves |
|-----------|---------------|
| **Grouping** | 40 pods failing → 1 notification, not 40 |
| **Inhibition** | Cluster down → suppress every per-service alert inside it |
| **`for` duration** | Transient blips never fire |
| **Deployment silence** | Expected error blip during a rolling deploy |
| **Maintenance windows** | Planned work does not page |
| **Composite conditions** | Errors AND latency, not either alone |

```yaml
# Alertmanager: don't page for services when the whole cluster is already down
inhibit_rules:
  - source_matchers: [alertname="ClusterDown"]
    target_matchers: [severity="critical"]
    equal: [cluster]

  # Node down implies its pods are down — say it once
  - source_matchers: [alertname="NodeNotReady"]
    target_matchers: [alertname="PodNotReady"]
    equal: [node]
```

✅ **Inhibition is the difference between one useful page and a phone vibrating for ten minutes.**

## SNS and Routing on AWS

```hcl
resource "aws_sns_topic" "critical" {
  name              = "alerts-critical"
  kms_master_key_id = aws_kms_key.sns.id
}

resource "aws_sns_topic_subscription" "pagerduty" {
  topic_arn = aws_sns_topic.critical.arn
  protocol  = "https"
  endpoint  = "https://events.pagerduty.com/integration/${var.pd_key}/enqueue"
}

resource "aws_cloudwatch_metric_alarm" "checkout_errors" {
  alarm_name          = "checkout-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 1
  evaluation_periods  = 5
  datapoints_to_alarm = 3           # 3 of 5 — absorbs a single spiky minute
  treat_missing_data  = "breaching" # 🔴 no data means broken

  metric_query {
    id          = "error_rate"
    expression  = "(errors / total) * 100"
    label       = "5xx rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      namespace   = "AWS/ApplicationELB"
      metric_name = "HTTPCode_Target_5XX_Count"
      period      = 60
      stat        = "Sum"
    }
  }

  metric_query {
    id = "total"
    metric {
      namespace   = "AWS/ApplicationELB"
      metric_name = "RequestCount"
      period      = 60
      stat        = "Sum"
    }
  }

  alarm_actions = [aws_sns_topic.critical.arn]
  ok_actions    = [aws_sns_topic.critical.arn]   # notify on recovery too
}
```

✅ `ok_actions` matters. Without it, nobody knows the incident ended except by checking.

## On-Call That Does Not Burn People Out

| Practice | Why |
|----------|-----|
| **Minimum 6 engineers in rotation** | One week in six, not one in two |
| **One primary, one secondary** | Escalation when the primary is unreachable |
| **Handover notes** | The next person inherits context, not surprises |
| **Time off after a bad night** | Sleep debt causes the next outage |
| **On-call is paid or compensated** | It is work |
| **The on-call engineer fixes alert quality** | Whoever suffers the noise has authority to remove it |

🔴 **The last one is the most important cultural rule.** If the person being woken cannot delete or retune a bad alert, noise accumulates forever.

**Escalation policy:**

```
Page primary
  ↓ no ack in 5 min
Page secondary
  ↓ no ack in 5 min
Page team lead
  ↓ no ack in 10 min
Page engineering manager
```

✅ Escalate on **acknowledgement**, not resolution. Someone confirming they are looking is what stops the escalation.

## Alert Review

Run this monthly. It is what keeps the system trustworthy.

```
For every alert that fired last month:
  1. Was it real?          No  → fix the threshold or delete it
  2. Was it actionable?    No  → automate the fix or downgrade to a ticket
  3. Did it need a human?  No  → automate the remediation
  4. Was the runbook used? No  → the runbook is wrong or missing
```

| Metric to track | Healthy |
|----------------|---------|
| Pages per on-call shift | Under 2 |
| Percentage of pages that were actionable | Above 90% |
| Alerts with a runbook | 100% |
| Mean time to acknowledge | Under 5 min |

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Paging on causes | Constant noise | Alert on symptoms |
| No `for` duration | Every blip fires | `for: 5m` |
| `treat_missing_data: notBreaching` | Silent failure when the app dies | `breaching` |
| Alerting on absolute error counts | Wrong at every traffic level | Alert on rate |
| Everything marked critical | Severity means nothing | Three levels, enforced |
| No runbook link | Slow response at 3am | Link every alert |
| Alerts nobody owns | Nothing gets fixed | `team` label routing to an owner |
| No inhibition | One failure, forty pages | Alertmanager inhibit rules |

## Interview Q&A

**Q: What makes a good alert?**

Three properties, all required: it must be urgent, actionable, and real. Urgent means it cannot wait until tomorrow — otherwise it is a ticket, not a page. Actionable means a human can actually do something about it right now; if the response is always the same fix, that fix should be automated instead. Real means it reflects genuine breakage rather than a threshold set too tight. Beyond that, the alert text has to be useful at three in the morning: what is broken, which system, the current value against the threshold, whether users are affected, and a link to a runbook and a pre-filtered dashboard. The runbook link is the highest-value part, because under pressure nobody reasons from first principles — they follow steps.

**Q: Why alert on symptoms rather than causes?**

Because causes generate volume without meaning. High CPU with users completely unaffected is not an incident, and a pod that restarted and was immediately replaced is not an incident either — paging on those trains the team to ignore pages. Symptoms are user-visible: error rate breaching the SLO, p99 latency above target, a queue that has been growing for fifteen minutes. If a cause is genuinely harmful, the symptom alert fires anyway, and the cause metric is the first thing you look at while diagnosing. So cause metrics belong on dashboards and in runbooks rather than in the paging path. The exception is slow-burn capacity signals like a disk that will fill in four hours, which warrant a ticket during working hours because the symptom would arrive as an outage.

**Q: Explain burn-rate alerting.**

It alerts on how quickly you are consuming your error budget rather than on a fixed error-rate threshold, and it evaluates two time windows at once. The problem it solves is a genuine tradeoff in simple thresholds: a short evaluation window means every transient spike pages someone, while a long window means slow detection of a real outage. Burn-rate alerting pairs a short window for responsiveness with a long window for confirmation, and only fires when both breach — so a thirty-second blip is ignored because the one-hour window has not moved, while a sustained failure trips both within minutes. You typically run several tiers: a 14.4× burn rate pages because the entire month's budget will be gone in two days, while a 3× rate opens a ticket because the trend is bad but not urgent. It also ties alerting directly to the SLO instead of to an arbitrary number.

**Q: How do you stop one failure generating forty pages?**

Grouping and inhibition in Alertmanager, or the equivalent composite alarms in CloudWatch. Grouping batches alerts sharing labels into one notification, so forty failing pods produce a single message listing them rather than forty separate pages. Inhibition is the more powerful one: you declare that when a cluster-down alert is firing, every critical alert scoped to that cluster is suppressed, because they are all consequences of the same root cause. Similarly, a node-not-ready alert inhibits the pod-not-ready alerts for pods on that node. Alongside those, a `for` duration prevents transient conditions firing at all, and a deployment-in-progress silence stops the expected error blip during a rolling deploy from waking anyone. Without inhibition, the on-call phone vibrates for ten minutes and the actual signal is buried.

**Q: An alarm never fired even though the service was completely down. Why?**

Most likely the missing-data configuration. The alarm was probably watching a metric the application itself emits, such as an error counter, with `treat_missing_data` left as the default or set to `notBreaching`. When the application died it stopped emitting anything, so rather than breaching a threshold the metric simply vanished — and the alarm either held its previous OK state or actively treated the silence as healthy. The fix is `breaching` for any metric where absence means failure. More robustly, alarm on something that exists independently of the application, such as load balancer target health or 5xx counts at the ALB, because those keep reporting even when every instance is dead. This is one of the most common real-world monitoring failures.

**Q: How do you make on-call sustainable?**

Structurally and culturally. Structurally: at least six people in the rotation so it is one week in six rather than one in two, a primary and secondary with escalation on acknowledgement rather than resolution, written handover notes so the next person inherits context, and compensated time off after a night that was actually disrupted. Culturally, the rule that matters most is that the person being woken has the authority to delete or retune the alert that woke them. If they cannot, noise accumulates indefinitely because nobody who suffers it can fix it. I would also run a monthly alert review asking, for every alert that fired, whether it was real, whether it was actionable, and whether a human was genuinely needed — and track pages per shift, aiming to stay under two, treating a higher number as a defect in the monitoring rather than bad luck.

---

[← Grafana](./03-grafana.md) | [Observability Index](./README.md)
