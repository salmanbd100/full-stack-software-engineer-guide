# AWS Well-Architected Framework

The Well-Architected Framework is AWS's checklist for reviewing a system across six areas. In interviews it is useful as a **structure for answering design questions** — not as trivia.

## The Six Pillars

```
1. Operational Excellence  — can you run and improve it?
2. Security                — can you protect it?
3. Reliability             — does it survive failure?
4. Performance Efficiency  — is it the right shape for the job?
5. Cost Optimization       — are you paying only for value?
6. Sustainability          — are you minimizing environmental impact?
```

⚠️ Most people say "five pillars". **Sustainability was added in 2021, making six.** Getting this right is a small credibility signal.

> The real value of the framework is that it forces you to state the **trade-off**. Every design choice strengthens one pillar and usually weakens another.

## Pillar 1 — Operational Excellence

Can your team run this system, understand it, and improve it safely?

| Principle | In Practice |
|-----------|-------------|
| **Perform operations as code** | Terraform, no console changes |
| **Make frequent, small, reversible changes** | Small PRs, automated deploys |
| **Anticipate failure** | Game days, chaos testing, tested runbooks |
| **Learn from all operational events** | Blameless postmortems that produce actions |
| **Use managed services** | Fewer things you must operate |

❌ A runbook that says "contact Sarah" is not operational excellence.
✅ A runbook with the exact commands, tested during an actual incident, in version control.

## Pillar 2 — Security

| Principle | In Practice |
|-----------|-------------|
| **Strong identity foundation** | IAM roles, no long-lived access keys, OIDC for CI |
| **Traceability** | CloudTrail in every region, immutable log archive |
| **Security at all layers** | VPC + security groups + WAF + application checks |
| **Automate security best practices** | Config rules, scanning in the pipeline |
| **Protect data in transit and at rest** | TLS everywhere, KMS encryption by default |
| **Keep people away from data** | Automated access, no SSH to production |
| **Prepare for security events** | Practised incident response plan |

> "Keep people away from data" is the principle most systems fail. If engineers routinely SSH into production or query the production database directly, that is an audit finding.

See [Security Fundamentals](../Security/01-fundamentals.md) for depth.

## Pillar 3 — Reliability

| Principle | In Practice |
|-----------|-------------|
| **Automatically recover from failure** | Health checks that replace, not just alert |
| **Test recovery procedures** | Restore a backup on a schedule — untested backups are not backups |
| **Scale horizontally** | Many small units, not one large one |
| **Stop guessing capacity** | Autoscaling on the right metric |
| **Manage change through automation** | Everything through the pipeline |

**The reliability numbers worth knowing:**

| Availability | Downtime per Year | Typical Architecture |
|-------------|-------------------|---------------------|
| 99% | 3.65 days | Single instance |
| 99.9% | 8.8 hours | Multi-AZ, autoscaled |
| 99.99% | 52 minutes | Multi-AZ, no single points of failure |
| 99.999% | 5 minutes | Multi-region, active-active |

⚠️ Each nine costs roughly an order of magnitude more. Asking "what does the business actually need?" is a senior response; assuming five nines is not.

**RTO vs RPO — a guaranteed question:**

```
        incident
           │
  ◄────────┼────────►
   RPO     │   RTO
 "how much │ "how long
  data can │  can we be
 we lose?" │   down?"
```

| Strategy | RTO | RPO | Cost |
|----------|-----|-----|------|
| **Backup & restore** | Hours | Hours | 💰 Lowest |
| **Pilot light** | 10s of minutes | Minutes | 💰💰 |
| **Warm standby** | Minutes | Seconds | 💰💰💰 |
| **Multi-site active-active** | Near zero | Near zero | 💰💰💰💰 |

## Pillar 4 — Performance Efficiency

| Principle | In Practice |
|-----------|-------------|
| **Democratize advanced technology** | Use managed services instead of building |
| **Go global in minutes** | CloudFront, multi-region reads |
| **Use serverless where it fits** | No servers to size or patch |
| **Experiment more often** | Cheap to test an alternative in the cloud |
| **Consider mechanical sympathy** | Match the service to the access pattern |

**"Mechanical sympathy" means picking the right tool:**

| Access Pattern | Right Choice | Wrong Choice |
|----------------|-------------|--------------|
| Key-value lookups at scale | DynamoDB | RDS with an index |
| Complex ad-hoc joins | RDS / Aurora | DynamoDB with 6 GSIs |
| Full-text search | OpenSearch | `LIKE '%term%'` |
| Analytics over history | Athena on S3 | Queries against the production DB |

## Pillar 5 — Cost Optimization

| Principle | In Practice |
|-----------|-------------|
| **Practise cloud financial management** | Someone owns the bill; tags exist |
| **Adopt a consumption model** | Turn off dev at night; scale to zero |
| **Measure overall efficiency** | Cost per request, per tenant, per order |
| **Stop spending on undifferentiated work** | Managed services over self-hosted |
| **Analyze and attribute expenditure** | Cost allocation tags, per-team showback |

✨ **Cost per business unit** is the metric that impresses. "$0.0004 per order" is a far stronger answer than "our bill is $40,000" — it shows whether cost scales sub-linearly with growth.

## Pillar 6 — Sustainability

Newest pillar, and increasingly asked about in enterprise and public sector interviews.

| Principle | In Practice |
|-----------|-------------|
| **Maximize utilization** | An idle instance wastes 100% of its footprint |
| **Use more efficient hardware** | Graviton uses substantially less energy per unit work |
| **Reduce downstream impact** | Smaller payloads and images mean less device energy |
| **Choose managed services** | Higher shared utilization than your own servers |
| **Region selection** | Some regions run on far more renewable energy |

> Sustainability and cost optimization mostly point the same way: **higher utilization, less waste, more efficient hardware**. Graviton, right-sizing, and deleting idle resources score on both pillars.

## Using the Framework in an Interview

When asked "design X on AWS", walk the pillars as your closing structure. It shows breadth without rambling.

```
"Here's the design.
 Reliability: multi-AZ, health-check replacement, tested restores.
 Security: private subnets, IAM roles, KMS, no inbound SSH.
 Performance: DynamoDB because access is key-value; CloudFront at the edge.
 Cost: Graviton, Savings Plans on the baseline, Spot for the async workers.
 Operations: Terraform, one pipeline, runbooks, SLOs with error budgets.
 Sustainability: Graviton and high utilization via bin-packing.
 The main trade-off I'm making is ___, because ___."
```

✅ Naming the trade-off explicitly is what distinguishes a senior answer. Every design sacrifices something.

**Common trade-offs to have ready:**

| Choose | Gain | Give Up |
|--------|------|---------|
| Multi-region active-active | Reliability | Cost, and consistency complexity |
| Spot instances | Cost | Predictability |
| Managed service | Operations, security | Control, and sometimes cost |
| Aggressive caching | Performance, cost | Freshness |
| Strong consistency | Correctness | Latency, availability under partition |
| Microservices | Team autonomy | Operational and network complexity |

## The Review Process

| Step | What Happens |
|------|-------------|
| 1. Scope a **workload** | One application, not the whole company |
| 2. Answer the questions | AWS Well-Architected Tool, free in the console |
| 3. Get a risk list | High Risk Items (HRIs) and Medium Risk Items |
| 4. Prioritize | Fix HRIs first; not everything must be fixed |
| 5. Re-review | After major changes; it is continuous, not one-off |

✅ Reviews are most valuable **before** launch and **after** an incident. A review nobody acts on is documentation theatre.

## Interview Q&A

**Q: What are the pillars of the Well-Architected Framework?**

There are six: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability. Sustainability was added in 2021, so anyone answering "five" is working from older material. The framework's real purpose is not the list but the discipline it enforces — each pillar has a set of design questions that surface risks you would otherwise miss, and reviewing across all six forces you to acknowledge that pillars conflict. Making a system more reliable usually costs more, and making it cheaper often reduces redundancy, so the framework is a way of making those trade-offs explicit and deliberate rather than accidental.

**Q: Explain RTO and RPO and how they drive a disaster recovery design.**

Recovery Time Objective is how long the business can tolerate the system being unavailable. Recovery Point Objective is how much data the business can tolerate losing, measured backwards from the incident. They are independent, and they come from the business rather than from engineering. Once you have them, the architecture follows: backup and restore gives you hours for both and costs almost nothing; pilot light keeps the data replicated with minimal compute running, giving tens of minutes; warm standby runs a scaled-down live copy for minutes of RTO; and multi-site active-active gives near-zero on both but roughly doubles infrastructure cost and introduces data consistency problems across regions. The most important discipline is testing the recovery, because an untested restore procedure is an assumption, not a capability.

**Q: How would you use the framework when designing a system in an interview?**

I would use it as the closing structure rather than the opening one. First I would gather requirements and present a design, because leading with a framework sounds rehearsed. Then, to show breadth, I would walk each pillar briefly and say what the design does for it — multi-AZ and tested restores for reliability, private subnets and IAM roles for security, the data store choice for performance, Graviton and Savings Plans for cost, Terraform and runbooks for operations, and utilization for sustainability. The part that matters most is finishing with the trade-off I am consciously making and why, since that is what separates someone who has made these decisions from someone who has memorized the pillars.

**Q: How do sustainability and cost optimization relate?**

They point in the same direction almost all the time, because both are fundamentally about eliminating waste. An idle instance burns money and energy for zero output. Right-sizing improves utilization, which is the core sustainability metric. Moving to Graviton reduces both cost and energy per unit of work. Bin-packing containers more densely, scaling to zero outside working hours, and deleting unused storage all score on both pillars. They diverge occasionally — reducing payload sizes to lower device energy costs engineering effort with no infrastructure saving, and choosing a low-carbon region may mean higher latency for your users — but as a general rule, the cost optimization backlog is also the sustainability backlog.

**Q: Is 99.999% availability a good target?**

Usually not, and the willingness to say so is the point. Five nines means about five minutes of downtime a year, which effectively requires multi-region active-active, no single points of failure anywhere including your deployment pipeline, and automated recovery with no human in the loop. Each additional nine costs roughly an order of magnitude more, and beyond a certain point your availability is limited by dependencies you do not control. The right approach is to ask what the business actually loses per minute of downtime and set the target from that, then express it as an SLO with an error budget so the team has a principled way to trade release velocity against stability.

---

[← Performance Tuning](./04-performance.md) | [Index](./README.md) | [Capacity Planning →](./06-capacity-planning.md)
