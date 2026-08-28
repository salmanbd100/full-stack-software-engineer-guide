---
title: Capacity Planning
part: 8
chapter: 0
slug: capacity-planning
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-04
tags: [devops, cost, optimization, capacity, planning]
in_book: false
---

# Capacity Planning

Capacity planning is deciding how much infrastructure you need **before** you need it. Autoscaling handles minutes; capacity planning handles quarters.

## Why Autoscaling Is Not Enough

> Autoscaling reacts. Capacity planning predicts. You need both.

**Where autoscaling fails:**

| Situation | Why Autoscaling Cannot Save You |
|-----------|--------------------------------|
| Traffic doubles in 30 seconds | Instances take minutes to become healthy |
| Black Friday | Regional capacity or service quotas run out |
| A quota limit is hit | Scaling stops at a number nobody checked |
| The database is the bottleneck | RDS does not scale horizontally on demand |
| Steady 40% annual growth | Nothing triggers; the bill just grows |

🔴 The most common production surprise is not lack of hardware — it is an **account service quota**. Quotas are per-account, per-region, and many default low.

```bash
# Check before an event, not during it
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A          # Running On-Demand Standard instances (vCPUs)

aws service-quotas list-service-quotas --service-code lambda \
  --query 'Quotas[?contains(QuotaName,`Concurrent`)]'
```

✅ Raise quotas weeks ahead. Increase requests are reviewed by humans and are not instant.

## The Inputs You Need

```
Business forecast  ──┐
Historical growth  ──┼──► Expected demand ──► Required capacity
Known events       ──┘         ↑                    ↑
                       per-unit resource      + headroom
                       cost (measured)          + failure margin
```

**Step 1 — find the per-unit cost of work.** Load test one instance to saturation.

```
One m6i.large serves 850 requests/second at p99 = 180 ms
→ 1 instance ≈ 850 rps of usable capacity
```

**Step 2 — apply headroom.**

| Headroom For | Typical Margin |
|-------------|---------------|
| Normal operating target | Run at **50–70%** utilization |
| N+1 (survive one instance failing) | +1 instance |
| **AZ failure (N+1 zone)** | Capacity to lose a whole AZ |
| Forecast error | +20–30% |

⚠️ **The multi-AZ arithmetic people get wrong:** with three AZs, losing one leaves 67% of capacity. So each AZ must be able to run at 1.5× its normal share. Sizing each AZ for exactly one third of peak means an AZ failure becomes an outage.

```
Peak demand:        3,000 rps
Per instance:         850 rps  → 3.5 → 4 instances at 100%
Target 60% util:    4 / 0.6    → 7 instances
Survive 1 of 3 AZs: 7 × 1.5    → 11 instances  ✅ across 3 AZs
```

## Load Testing

You cannot plan capacity without knowing where the system breaks.

| Test Type | Question It Answers |
|-----------|-------------------|
| **Load test** | Does it meet SLOs at expected peak? |
| **Stress test** | ✅ Where does it break, and how? |
| **Soak test** | Does it degrade over hours? (memory leaks, connection leaks) |
| **Spike test** | Can it absorb a sudden 10× burst? |

✨ The **stress test** is the most valuable. Knowing your ceiling is 4,200 rps and that failure mode is database connection exhaustion is worth more than knowing you pass at 1,000 rps.

**How to read the results:**

```
 throughput │        ╭──────╮
            │      ╭─╯      ╰──────  ← saturation, then collapse
            │    ╭─╯               ↑
            │  ╭─╯            knee = real capacity
            │╭─╯
            └────────────────────► concurrent users
```

✅ Real capacity is the **knee** — where latency starts rising sharply — not the maximum throughput number. Past the knee, latency is already unacceptable.

⚠️ Load test against a production-shaped environment. A test against a single small instance with an empty database measures nothing useful.

**Graceful degradation matters more than the ceiling:**

| ❌ Bad Failure | ✅ Good Failure |
|---------------|----------------|
| Latency climbs to 60 s, everything times out | Excess requests rejected fast with 429 |
| Cascading retries amplify the overload | Circuit breaker opens, sheds load |
| Whole system down | Non-essential features disabled, core works |

> A system that serves 80% of traffic correctly and rejects 20% quickly is healthier than one that accepts everything and serves nothing.

## Forecasting Growth

**Two things to separate:**

| Type | Example | Handled By |
|------|---------|-----------|
| **Predictable pattern** | Daily peak, weekly cycle, month-end | Scheduled / predictive scaling |
| **Trend growth** | +8% users per month | Quarterly capacity review |
| **Known events** | Product launch, marketing campaign | Manual pre-scaling + quota checks |

```
Simple, defensible forecast:

  next_quarter_peak = current_peak
                    × (1 + monthly_growth)^3
                    × event_multiplier
                    × 1.25                  ← forecast error margin
```

✅ A rough model that is written down and reviewed beats a precise model nobody maintains.

**Scale sub-linearly where you can:**

| Growth Absorber | Effect |
|----------------|--------|
| Caching | Traffic doubles, database load barely moves |
| CDN offload | Static traffic never reaches origin |
| Async processing via queues | Spikes become backlog, not failures |
| Read replicas | Read growth handled separately from writes |

> The best capacity plan reduces how much capacity growth actually requires.

## Watching for the Ceiling

Plan against **saturation**, not utilization. Every resource has a hard limit somewhere.

| Resource | The Hard Ceiling | Warning Metric |
|----------|-----------------|----------------|
| **RDS** | `max_connections`, instance size | `DatabaseConnections`, `CPUUtilization` |
| **Lambda** | Account concurrency quota | `Throttles` > 0 |
| **DynamoDB** | Partition and table throughput | `ThrottledRequests` |
| **ALB** | Target group capacity | `RejectedConnectionCount` |
| **NAT Gateway** | ~55,000 connections per destination | `ErrorPortAllocation` |
| **Kubernetes** | Pod IP exhaustion in subnets | Free IPs per subnet |
| **EBS** | Provisioned IOPS | `VolumeQueueLength` |

🔴 **VPC subnet IP exhaustion** is the classic EKS scaling wall. With the AWS VPC CNI, each pod consumes a real VPC IP address. A `/24` subnet holds ~251 usable IPs, so a cluster can stop scheduling pods while nodes sit idle with spare CPU.

✅ Alert on **percentage of quota consumed** — for example, Lambda concurrency above 70% of the account limit — not just on errors. Errors mean you already hit it.

## Cost Forecasting

Capacity planning produces a number Finance needs.

```
Quarterly forecast =
    baseline run-rate
  + (growth × cost per unit of demand)
  + new project infrastructure
  − planned optimizations
  ± Savings Plan expiry / renewal
```

⚠️ **Check Savings Plan and RI expiry dates.** A large commitment expiring mid-quarter reverts that spend to On-Demand — a sudden 30–60% jump on covered usage with no change in architecture.

✅ Track **cost per unit of business value** (per order, per active user, per tenant). If that number is flat as you grow, the architecture scales economically. If it rises, something is wrong regardless of how good the discounts are.

## Interview Q&A

**Q: How would you plan capacity for a Black Friday event expecting 10× normal traffic?**

I would start weeks out, not days. First, establish real per-instance capacity with a stress test against a production-shaped environment, so I know both the throughput per unit and where the system breaks. Then work out the required fleet including headroom: target utilization around 60%, plus enough spare to lose an availability zone, which with three zones means each zone can carry one and a half times its normal share. Critically, I would audit service quotas — EC2 vCPU limits, Lambda concurrency, NAT gateway connections, RDS connection limits, and available subnet IP addresses — because hitting an account quota is the most common way these events fail, and quota increases need human review. I would also pre-scale rather than relying on reactive autoscaling, since a sudden traffic step happens faster than instances become healthy, and I would prepare load shedding and feature-flag switches so that if we do exceed capacity we degrade gracefully instead of collapsing.

**Q: What is the difference between load testing and stress testing, and which is more useful?**

A load test verifies the system meets its objectives at expected peak — it answers "are we fine?". A stress test deliberately pushes past that to find the breaking point and observe the failure mode. The stress test is more valuable, because knowing that the ceiling is 4,200 requests per second and that failure arrives as database connection exhaustion tells you both your true headroom and what to fix. A passing load test only tells you today's traffic is survivable. I would also add a soak test for anything long-running, because memory and connection leaks only appear after hours, and those failures happen at three in the morning rather than during a test window.

**Q: You have three availability zones and need to survive losing one. How much capacity do you provision?**

Enough that two zones can carry the full peak. Losing one of three leaves 67% of capacity, so total provisioned capacity must be at least 1.5 times peak demand for the remaining zones to cope. The mistake is sizing each zone at exactly one third of peak, which means an availability zone failure immediately becomes a customer-facing outage because the survivors saturate. On top of that I would still apply a normal utilization target — running at 60% rather than 100% — because you need room for request bursts and slow scale-out, and I would confirm capacity is genuinely balanced across zones, since an autoscaling group that has drifted to be zone-heavy has the same problem in a less obvious form.

**Q: What limits scaling that people usually forget?**

Account-level service quotas and IP address space. Quotas are per-account and per-region, and several default surprisingly low — EC2 vCPU limits, Lambda concurrent executions, and NAT gateway port allocations all stop scaling with no relation to how much hardware AWS has. On Kubernetes with the AWS VPC CNI, every pod consumes a real VPC IP address, so a cluster can refuse to schedule pods while nodes have plenty of spare CPU, purely because the subnets are exhausted. Database connections are another: Lambda or a large container fleet can exhaust `max_connections` on RDS long before the database runs out of CPU, which is what RDS Proxy exists to solve. The practical takeaway is to alert on percentage of quota consumed, because by the time you see throttling errors you have already hit the wall.

**Q: How do you forecast infrastructure cost for next quarter?**

Start from the current run-rate, then add growth expressed through a measured cost per unit of demand — cost per thousand requests or per active user — rather than scaling the whole bill by a percentage, because not all costs grow with traffic. Add the infrastructure for projects that are actually landing that quarter, and subtract optimizations you have committed to and can realistically deliver. Then check two calendar items that catch people out: Savings Plan and Reserved Instance expiry dates, since a lapsing commitment reverts that usage to On-Demand and can look like a sudden large increase with no architectural change. Finally, I would report cost per unit of business value alongside the total, because that is the number that shows whether the architecture is scaling economically.

---

[← Well-Architected](./05-well-architected.md) | [Cost Optimization Index](./README.md)
