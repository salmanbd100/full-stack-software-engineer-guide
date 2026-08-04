# Cost Optimization Strategies

Once spend is visible, optimization is two separate jobs: **use less** and **pay less for what you use**. Do them in that order.

## The Order That Matters

```
1. Delete what nobody uses          ← free, instant, zero risk
        ↓
2. Right-size what remains          ← cheap, small risk
        ↓
3. Schedule non-production off      ← ~65% saving on dev/test
        ↓
4. Change architecture              ← real engineering effort
        ↓
5. Commit for a discount            ← only now, on a clean baseline
```

❌ **The classic mistake:** buying a 3-year commitment first. You lock in your current waste for three years.

> Commitments discount the *rate*. They never fix the *usage*. Fix usage first.

## Right-Sizing

Right-sizing means matching instance size to real demand, measured — not guessed.

**What to measure, and the trap:**

| Metric | Available by Default? | Notes |
|--------|----------------------|-------|
| CPU utilization | ✅ Yes | Look at p95, not average |
| Network I/O | ✅ Yes | Catches bandwidth-bound workloads |
| **Memory utilization** | ❌ **No** | Requires the CloudWatch agent |
| Disk I/O | ✅ Yes | EBS-optimized limits matter |

⚠️ EC2 does **not** report memory usage without the CloudWatch agent installed. Teams that right-size on CPU alone routinely break memory-bound services.

**The decision rule:**

| p95 CPU over 14 days | Action |
|---------------------|--------|
| Under 10% | Downsize two steps, or consolidate |
| 10–40% | Downsize one step |
| 40–70% | ✅ Correct size |
| Over 70% sustained | Scale out, or up one step |

✨ Prefer changing **family** before changing **size**. A `t3.xlarge` running a CPU-bound service should probably be a `c6i.large` — smaller and faster.

**Graviton is usually the best single change:**

```
m6i.large  (x86)      →  m7g.large  (Graviton3)
~20% cheaper, often better performance per core
```

✅ Anything running on an interpreted or JIT runtime — Node.js, Python, Java, Go — usually moves to Graviton with only a rebuild of the container image.
⚠️ Check native dependencies. A compiled npm module without an `arm64` build will fail.

**Multi-arch image build:**

```bash
# Build one tag that works on both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "$ECR_REPO:$GIT_SHA" \
  --push .
```

## Purchase Options

This is the highest-value section for interviews. Know the difference precisely.

| Option | Discount | Commitment | Flexibility |
|--------|----------|-----------|-------------|
| **On-Demand** | 0% | None | Total |
| **Savings Plans (Compute)** | ~66% | $/hour for 1 or 3 years | Any region, family, EC2/Fargate/Lambda |
| **Savings Plans (EC2 Instance)** | ~72% | $/hour, one family + region | Size only |
| **Reserved Instances (Standard)** | ~72% | Specific instance attributes | Low; sellable on marketplace |
| **Reserved Instances (Convertible)** | ~54% | Exchangeable | Medium |
| **Spot** | ~70–90% | None | Can be reclaimed in 2 minutes |

> **Default answer for a modern stack: Compute Savings Plans.** They cover EC2, Fargate, and Lambda, and survive re-architecture. Reserved Instances only still win for RDS, ElastiCache, OpenSearch, and Redshift, which Savings Plans do not cover.

**How much to commit:**

```
Look at the last 3 months of usage.
Commit to the lowest steady baseline — not the average, not the peak.

  usage │        ╱╲    ╱╲
        │   ╱╲  ╱  ╲  ╱  ╲     ← On-Demand / Spot handles this
        │──────────────────── ← commit here (the floor)
        └──────────────────── time
```

✅ Target roughly **70–80% coverage** of steady state. Committing to 100% means paying for capacity during every dip.

**The 1-year vs 3-year call:**

| Choose | When |
|--------|------|
| **1 year, no upfront** | Growing fast, architecture in flux, cash matters |
| **3 year, all upfront** | Stable workload, predictable business, best rate |

## Spot Instances

Spot gives you spare AWS capacity at a steep discount. AWS can take it back with **two minutes' notice**.

**Safe for:**

- ✅ CI/CD runners and build agents
- ✅ Batch and data processing jobs
- ✅ Stateless web tiers behind a load balancer
- ✅ Kubernetes worker nodes for interruption-tolerant pods

**Not safe for:**

- ❌ Databases and anything holding the only copy of state
- ❌ Long jobs with no checkpointing
- ❌ Single-instance services with no redundancy

**Rules for surviving interruption:**

| Rule | Why |
|------|-----|
| **Diversify instance types** | Each type is a separate capacity pool; use 6–10 |
| **Use `capacity-optimized` allocation** | Picks the deepest pool, not the cheapest — far fewer interruptions |
| **Handle the 2-minute warning** | Drain connections, checkpoint, deregister |
| **Mix with On-Demand base** | Guarantee a floor of stable capacity |

**A mixed ASG — On-Demand floor plus Spot for the rest:**

```hcl
resource "aws_autoscaling_group" "workers" {
  name                = "workers"
  vpc_zone_identifier = var.private_subnet_ids
  min_size            = 4
  max_size            = 40

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 4      # always-available floor
      on_demand_percentage_above_base_capacity = 20     # 80% of growth is Spot
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker.id
      }
      # Diversify across pools — the key to Spot stability
      override { instance_type = "m6i.large" }
      override { instance_type = "m6a.large" }
      override { instance_type = "m5.large" }
      override { instance_type = "m5a.large" }
      override { instance_type = "m7g.large" }   # Graviton, if image is multi-arch
    }
  }
}
```

✨ For EKS, **Karpenter** handles Spot diversification and consolidation automatically, and is usually a bigger win than tuning ASGs by hand. See [Kubernetes Autoscaling](../Kubernetes/10-autoscaling.md).

## Scheduling Non-Production

Development and test environments are typically needed 40 hours a week and billed for 168.

```
168 hours/week billed  →  50 hours/week (Mon–Fri, 7am–5pm)
= ~70% saving on every non-prod environment
```

**Implementation options:**

| Method | Best For |
|--------|----------|
| **EventBridge + Lambda** | EC2/RDS start-stop, fine control |
| **ASG scheduled actions** | Scaling groups to zero at night |
| **AWS Instance Scheduler** | Managed solution, tag-driven |
| **Destroy and recreate with Terraform** | ✅ Best — ephemeral environments cost nothing overnight |

✅ The strongest version is **ephemeral per-PR environments**: created on pull request open, destroyed on merge. Cost scales with active work, not with headcount.

## Storage and Serverless Quick Wins

| Change | Typical Saving |
|--------|---------------|
| `gp2` → `gp3` EBS volumes | ~20%, plus independent IOPS tuning |
| S3 Intelligent-Tiering on unpredictable data | 40–70% on cold objects |
| Delete unattached EBS volumes and old snapshots | Pure waste |
| CloudWatch log retention (30 days instead of never) | Often the largest CloudWatch line |
| Lambda memory tuning with Power Tuning | 20–50% — more memory can cost *less* |
| Fargate → Fargate Spot for batch | ~70% |
| S3 Gateway Endpoint instead of NAT for image pulls | Removes per-GB NAT processing |

⚠️ **Lambda's counter-intuitive rule:** memory and CPU scale together. Doubling memory can halve duration, leaving cost unchanged but latency far better — or even reducing total cost. Never assume the lowest memory setting is cheapest.

## Interview Q&A

**Q: What is the difference between Savings Plans and Reserved Instances, and which would you recommend?**

Reserved Instances commit you to specific instance attributes — family, region, and often size — in exchange for a discount. Savings Plans instead commit you to a dollar amount of compute spend per hour. Compute Savings Plans are the flexible option: they apply across regions, instance families, and also cover Fargate and Lambda, at roughly 66% off. EC2 Instance Savings Plans give a slightly deeper discount but lock you to one family in one region. For almost any modern workload I would recommend Compute Savings Plans, because they survive re-architecture — if you migrate from EC2 to Fargate, or from x86 to Graviton, the commitment still applies. Reserved Instances remain necessary for RDS, ElastiCache, OpenSearch, and Redshift, which Savings Plans do not cover.

**Q: How do you decide how much to commit to?**

Look at three months of usage and find the steady baseline — the floor the workload never drops below — rather than the average or the peak. Commit to about 70–80% of that floor and leave the variable portion on On-Demand or Spot. Committing to 100% means paying for capacity during every quiet period and every scale-down, which erases the discount. I would also start with a one-year term if the architecture is still changing, since a three-year commitment on a design you are about to replace is the most expensive kind of saving. Then monitor the utilization and coverage reports monthly and layer additional commitments as the baseline rises, rather than making one large bet.

**Q: When would you use Spot instances, and how do you make them safe?**

Spot suits anything interruption-tolerant: CI runners, batch and data processing, stateless web tiers behind a load balancer, and Kubernetes nodes for pods that can be rescheduled. The two things that make Spot reliable are diversification and allocation strategy. Each instance type in each availability zone is a separate capacity pool, so specifying eight or ten types across several zones means a shortage in one pool does not take out your fleet. Setting the allocation strategy to capacity-optimized rather than lowest-price makes AWS place instances in the deepest pools, which dramatically reduces interruptions for a marginal price difference. Then handle the two-minute interruption notice by draining connections and checkpointing work, and keep an On-Demand base capacity so there is always a stable floor.

**Q: Your CTO asks you to cut the AWS bill by 30%. What do you do first?**

I would not start with commitments, because they lock in existing waste. First, find and delete unused resources — unattached volumes, idle load balancers, old snapshots, forgotten environments, and log groups with no retention. That is free and carries no risk. Second, schedule non-production environments to shut down outside working hours, which is around a 70% saving on those environments alone. Third, right-size using p95 utilization over a fortnight, remembering that memory needs the CloudWatch agent to be visible, and move suitable workloads to Graviton for roughly 20%. Fourth, look at the architectural items: VPC endpoints instead of NAT for S3 and ECR traffic, and Spot for interruption-tolerant compute. Only after usage is clean would I buy Savings Plans against the remaining steady-state baseline.

**Q: Why might increasing a Lambda function's memory reduce its cost?**

Because Lambda allocates CPU proportionally to memory, and you are billed for memory multiplied by duration. If a function is CPU-bound, doubling memory roughly doubles available CPU, which can more than halve the execution time. Cost is memory times duration, so twice the memory for less than half the duration is a net saving, and the latency improves as well. This is why the lowest memory setting is often the most expensive choice. The practical approach is to run AWS Lambda Power Tuning, which invokes the function across a range of memory settings and plots cost against duration so you can pick the actual optimum rather than guessing.

---

[← Cost Management](./01-cost-management.md) | [Index](./README.md) | [Storage Costs →](./03-storage-costs.md)
