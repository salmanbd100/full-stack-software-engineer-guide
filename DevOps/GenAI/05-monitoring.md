# AI for Monitoring & AIOps

AIOps means applying machine learning to operational data. The genuinely useful applications are narrow: **anomaly detection, correlation, and noise reduction**. The rest is mostly marketing.

## What AI Actually Solves in Monitoring

| Problem | AI Helps? | Why |
|---------|-----------|-----|
| **Static thresholds don't fit seasonal traffic** | ✅ Yes | Learns the daily and weekly shape |
| **200 alerts from one root cause** | ✅ Yes | Correlation and grouping |
| **Unknown-unknowns** | ✅ Yes | Flags "different from normal" without a rule |
| **Finding the anomalous metric among 5,000** | ✅ Yes | Humans cannot scan that many |
| **Deciding what to alert on** | ❌ No | Needs to know user impact |
| **Root cause** | ⚠️ Partly | Correlation, not causation |
| **Bad instrumentation** | ❌ No | 🔴 Cannot infer what you never emitted |

> AIOps cannot compensate for missing telemetry. If you do not emit a metric, no model will infer it.

## The Threshold Problem

```
Static threshold: alert if requests/min < 1000

  requests │      ╭─╮      ╭─╮        ← normal daily cycle
    /min   │     ╱   ╲    ╱   ╲
      1000 ├────────────────────────  ← threshold
           │  ╱          ╲╱
           └──────────────────────►
              3am           3am
           ❌ fires every night (noise)
           ❌ misses a 40% daytime drop (real incident)
```

**Anomaly detection learns the band instead:**

```
  requests │    ░░╭─╮░░    ░░╭─╮░░    ░░ = expected range
    /min   │   ░╱   ╲░    ░╱   ╲░
           │  ░      ░░░░░      ░
           └──────────────────────►
              ✅ a daytime drop below the band fires
              ✅ a normal 3am trough does not
```

```hcl
# CloudWatch anomaly detection — no threshold to tune
resource "aws_cloudwatch_metric_alarm" "request_anomaly" {
  alarm_name          = "checkout-requests-anomalous"
  comparison_operator = "LessThanLowerThreshold"
  evaluation_periods  = 2
  threshold_metric_id = "band"
  treat_missing_data  = "breaching"   # 🔴 silence means dead

  metric_query {
    id          = "band"
    expression  = "ANOMALY_DETECTION_BAND(requests, 2)"  # 2 std deviations
    label       = "Expected range"
    return_data = true
  }

  metric_query {
    id          = "requests"
    return_data = true
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions  = { LoadBalancer = var.alb_suffix }
    }
  }
}
```

⚠️ **The training data problem:** anomaly detection learns from history, including the incident last week. If an outage is in the training window, degraded behaviour becomes "normal". Exclude known incident periods.

## Where Anomaly Detection Fits — and Does Not

| Metric | Use Anomaly Detection? |
|--------|----------------------|
| Request rate, traffic volume | ✅ Yes — strongly seasonal |
| Queue depth | ✅ Yes |
| Login or signup rate | ✅ Yes — a drop is a real signal |
| Cost per day | ✅ Yes — Cost Anomaly Detection |
| **Error rate** | ❌ No — use a fixed SLO threshold |
| **Latency against an SLO** | ❌ No — the SLO *is* the threshold |
| **Availability** | ❌ No — you have a target |

> If you have a defined objective, alert against the objective. Anomaly detection is for signals where "normal" is the only reference you have.

✅ Practical split: **SLO burn-rate alerts** for user-facing symptoms, **anomaly detection** for the supporting signals you have no target for.

## Alert Correlation and Noise Reduction

One failure produces dozens of alerts. Correlation is the highest-value AIOps capability.

```
Database fails over
   ↓
47 alerts fire:
   - RDS failover event
   - 12 services: connection errors
   - 12 services: p99 latency
   - 8 services: health check failures
   - queue depth growing
   - 5 dependent services: timeouts
   ...

✅ Correlated: 1 incident — "RDS failover", 47 symptoms, 12 services affected
```

| Technique | Deterministic Alternative |
|-----------|--------------------------|
| Temporal grouping (same 60s window) | Alertmanager `group_by` |
| Topology-aware suppression | Alertmanager `inhibit_rules` |
| Deduplication of identical alerts | Alertmanager, PagerDuty |
| ML-based clustering of related alerts | DevOps Guru, commercial AIOps |

✨ **Try the deterministic version first.** Well-configured Alertmanager inhibition rules eliminate most alert storms and are explainable, cheap, and predictable. Reach for ML only when the dependency graph is too dynamic to encode by hand.

```yaml
# Alertmanager — a cluster-down alert suppresses every per-service alert beneath it
inhibit_rules:
  - source_matchers: [severity="critical", alertname="DatabaseDown"]
    target_matchers: [severity=~"warning|critical"]
    equal: [cluster, environment]   # only within the same blast radius
```

## Amazon DevOps Guru

The main AWS-native AIOps service. Passive — no prompting, no configuration of thresholds.

**What it does:**

```
CloudWatch metrics + CloudTrail + Config + X-Ray
        ↓
learns normal behaviour per resource (2–4 weeks)
        ↓
Insight = anomalous metrics + related events + affected resources
        ↓
SNS → your on-call
```

| ✅ Strength | ⚠️ Limitation |
|------------|--------------|
| Zero configuration | Needs 2–4 weeks of data |
| Correlates metrics with config changes | Noisy with irregular traffic |
| Surfaces resources you were not watching | Cost scales with resources analysed |
| Provides likely-cause context | Insight ≠ root cause |

✅ Best value: **enable it on production, route high-severity insights to a ticket queue rather than a page.** Treat it as a second pair of eyes, not a primary alerting path.

## Log Anomaly Detection

Finding a new error pattern in millions of lines.

| Tool | Approach |
|------|----------|
| **CloudWatch Logs anomaly detector** | Learns log patterns, flags new or spiking ones |
| **OpenSearch anomaly detection** | ML on aggregated log metrics |
| **Custom Bedrock summarizer** | Cluster and explain novel error text |

✨ **The most useful signal is "an error message that has never appeared before".** That is often the first sign of a new failure mode, and it needs no threshold at all.

## Predictive Scaling

The clearest genuinely-predictive win.

| | Reactive Scaling | Predictive Scaling |
|---|-----------------|-------------------|
| **Trigger** | Metric crosses a target | Forecast from history |
| **Timing** | After demand arrives | ✅ Before |
| **Handles slow boot times** | ❌ No | ✅ Yes |
| **Handles novel spikes** | ✅ Yes | ❌ No |

✅ Use **both**: predictive scaling to warm capacity for the known daily pattern, target tracking to handle whatever the forecast missed.

```hcl
resource "aws_autoscaling_policy" "predictive" {
  name                   = "predictive-scaling"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "PredictiveScaling"

  predictive_scaling_configuration {
    metric_specification {
      target_value = 60
      predefined_metric_pair { predefined_metric_type = "ASGCPUUtilization" }
    }
    mode                   = "ForecastAndScale"
    scheduling_buffer_time = 300   # warm capacity 5 minutes early
  }
}
```

⚠️ Requires roughly 14 days of history and a genuinely repeating pattern. On erratic traffic it adds cost without benefit.

## What Does Not Work

Be able to push back on vendor claims — this is a senior signal.

| Claim | Reality |
|-------|---------|
| "AI finds the root cause" | Finds **correlation**. Causation needs system knowledge |
| "Self-healing infrastructure" | ⚠️ Automated remediation of *known* patterns — good, but not intelligence |
| "No instrumentation needed" | 🔴 False. Garbage in, garbage out |
| "Eliminates on-call" | Reduces noise; incidents still need judgement |
| "Predicts outages" | Detects leading indicators of *known* patterns |
| "Replaces SLOs" | ❌ An SLO is a business decision, not a detectable pattern |

> The honest summary: AIOps is very good at **"this is unusual"** and **"these 47 alerts are one thing"**. It is not good at **"here is why, and here is what to do"**.

## Interview Q&A

**Q: What does AI genuinely add to monitoring?**

Three things. First, dynamic baselines: static thresholds fail on seasonal traffic because a value that is normal at three in the afternoon is an incident at three in the morning, and anomaly detection learns that shape so you stop choosing between nightly false alarms and missing a real daytime drop. Second, correlation: a single database failover can produce dozens of alerts across many services, and grouping those into one incident with many symptoms is the difference between a responder orienting in one minute or ten. Third, scanning breadth — a human cannot watch five thousand metrics, and a model can flag which one is behaving unusually. What it does not add is judgement about what matters, and it cannot compensate for missing instrumentation, because no model can infer a metric you never emitted.

**Q: When would you use anomaly detection instead of a static threshold?**

When I have no defined objective for the signal and "normal" is the only reference available. Request volume, queue depth, signup rate, and daily cost all have strong daily and weekly seasonality with no correct value, so a learned band works much better than a fixed number. Where I would not use it is anything with an actual target: error rate, latency against an SLO, and availability all have thresholds that come from a business decision, and replacing a 99.9% objective with "unusual compared to last week" is strictly worse — it will tolerate steadily degrading performance because the degradation becomes the new normal. The practical split is SLO burn-rate alerts for user-facing symptoms and anomaly detection for the supporting signals underneath.

**Q: What is the biggest trap with anomaly detection?**

The training window includes your incidents. These models learn from recent history, so if last week's outage sits inside the training period, degraded behaviour gets absorbed into the expected range and the same failure will not alert next time. The same effect happens gradually with slow regressions: performance that erodes a little each week never looks anomalous because each day resembles the last. So you need to exclude known incident periods from training, and you need SLO-based alerting alongside anomaly detection to catch the slow drift that a learned baseline is structurally blind to. There is also a cold start problem — most of these systems need two to four weeks of data — which means they are not available exactly when a new service is most fragile.

**Q: How would you reduce alert noise — with AI or without?**

I would exhaust the deterministic options first, because they are explainable, free, and predictable. Well-configured Alertmanager grouping collapses alerts arriving in the same window, and inhibition rules encode the dependency graph so a cluster-down alert suppresses every per-service alert beneath it, which eliminates most alert storms on its own. Alerting on symptoms rather than causes removes a whole category of noise, since paging on user-facing impact instead of CPU means fewer alerts that require no action. Beyond that, routing by tier so only genuinely urgent things page, and filtering non-production environments, does most of the rest. I would reach for ML-based correlation only where the dependency topology is too dynamic to encode by hand — a large microservices estate with frequently changing call graphs — because that is the case where hand-maintained inhibition rules genuinely cannot keep up.

**Q: A vendor claims their AIOps platform finds root cause automatically. How do you respond?**

I would ask what they mean by root cause, because what these systems actually produce is correlation — a set of metrics and events that moved together around the same time. That is genuinely valuable and saves real minutes in an investigation, but it is not causation, and distinguishing the two requires knowing how your system is wired, what changed deliberately, and what the business context is. I would also ask about instrumentation requirements, because any claim that no instrumentation is needed is false — the quality of the output is bounded by the telemetry going in. Then I would ask for a concrete evaluation: run it against three past incidents we have already written postmortems for and show me what it would have surfaced and how quickly. That converts a marketing claim into a measurable one, and in my experience the honest answer is that these tools are very good at "this is unusual" and "these forty-seven alerts are one thing", and much weaker at "here is why".

---

[← AI-Powered Troubleshooting](./04-troubleshooting.md) | [Index](./README.md) | [Prompt Engineering →](./06-prompt-engineering.md)
