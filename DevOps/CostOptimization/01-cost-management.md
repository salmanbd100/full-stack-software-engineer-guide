---
title: Cost Management
part: 8
chapter: 0
slug: cost-management
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-04
tags: [devops, cost, optimization, management]
in_book: false
---

# Cost Management

Cost management is the practice of making AWS spend **visible and attributable** before you try to reduce it. You cannot optimize a bill you cannot read.

## Why This Is a DevOps Topic

In most companies, the person who can create a `r6i.8xlarge` is not the person who sees the invoice. That gap is where waste lives.

> Cost is a non-functional requirement, like latency or availability. An architecture that works but costs 5× the budget has failed.

**What interviewers are checking:**

- Do you know where the money actually goes? (Usually compute, then data transfer, then storage.)
- Can you attribute spend to a team or feature?
- Do you catch a cost spike in hours, not at month end?

## The Anatomy of an AWS Bill

```
Total cost = Σ (usage × rate) per usage type, per region, per account
                ↑                    ↑
         you control this      AWS sets this
         (architecture)       (you can discount it)
```

**Two independent levers:**

| Lever | Question | Tools |
|-------|----------|-------|
| **Usage** | Do we need this resource at all, this big, this long? | Right-sizing, scheduling, lifecycle policies |
| **Rate** | Are we paying list price? | Savings Plans, Reserved Instances, Spot |

❌ **Common mistake:** buying a 3-year Savings Plan for an over-sized fleet. You lock in waste.
✅ **Correct order:** reduce usage first, then commit to a discount on what remains.

## Cost Allocation Tags

Tags are the only way to answer "which team spent this?". Without them, every cost report is one giant unlabelled bucket.

**The two tag types:**

| Type | Set By | Example |
|------|--------|---------|
| **AWS-generated** | AWS | `aws:createdBy`, `aws:cloudformation:stack-name` |
| **User-defined** | You | `Team`, `Environment`, `CostCenter`, `Service` |

⚠️ A tag does **not** appear in Cost Explorer until you **activate** it in Billing → Cost Allocation Tags. Activation is not retroactive — data before activation stays untagged.

**A minimum viable tag set:**

```hcl
# Terraform provider-level default tags — applied to every taggable resource
provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      Environment = var.environment   # dev | staging | prod
      Team        = "platform"        # who to ask about it
      Service     = "checkout-api"    # what it belongs to
      CostCenter  = "CC-4471"         # who pays
      ManagedBy   = "terraform"       # is it safe to delete?
    }
  }
}
```

✅ `default_tags` at provider level is the single highest-value cost governance change in a Terraform codebase.

**Enforcing tags:**

| Method | When It Blocks | Strength |
|--------|---------------|----------|
| **Tag Policies** (Organizations) | Reports non-compliance | Detective |
| **IAM condition** `aws:RequestTag` | At creation time | Preventive |
| **AWS Config rule** `required-tags` | After creation | Detective |
| **Terraform validation** | At `plan` | Preventive, cheapest |

**IAM policy that refuses untagged instances:**

```json
{
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "*",
  "Condition": {
    "Null": { "aws:RequestTag/CostCenter": "true" }
  }
}
```

⚠️ Not everything is taggable, and data transfer charges cannot be tagged at all. Tags get you roughly 80–90% attribution, never 100%.

## Cost Explorer

The default tool for "why did the bill change?". Free for the console UI; the API costs $0.01 per request.

**The three dimensions that answer most questions:**

| Group By | Answers |
|----------|---------|
| **Service** | What kind of thing costs money (EC2? RDS? NAT?) |
| **Usage Type** | The specific charge (`EU-DataTransfer-Regional-Bytes`) |
| **Tag: Team / Service** | Who owns it |

**How to investigate a spike — in order:**

```
1. Group by Service, daily granularity  → which service jumped?
    ↓
2. Filter to that service, group by Usage Type  → which charge?
    ↓
3. Group by Tag: Team  → whose workload?
    ↓
4. CloudTrail around the start date  → what change caused it?
```

✨ Always use **daily** granularity when hunting a spike. Monthly totals hide a step change that started on the 14th.

**Amortized vs unblended cost — a classic interview question:**

| View | How It Treats an Upfront RI Payment |
|------|-------------------------------------|
| **Unblended** | Full charge on the day it was paid |
| **Amortized** | Spread evenly across the term |

> Use **amortized** cost for team chargeback and trend analysis. Use **unblended** to reconcile against the actual invoice.

## Budgets and Anomaly Detection

These are different tools for different failure modes.

| Tool | Detects | Latency |
|------|---------|---------|
| **AWS Budgets** | Crossing a threshold you chose | Up to 24h |
| **Cost Anomaly Detection** | Unusual pattern vs learned baseline | ~24h, machine learning |

❌ Budgets alone miss a service that doubles but stays under the cap.
❌ Anomaly Detection alone misses steady, predictable overspend.
✅ Run both.

**A budget with a forecast alert — catches overspend mid-month:**

```hcl
resource "aws_budgets_budget" "monthly_prod" {
  name         = "prod-monthly"
  budget_type  = "COST"
  limit_amount = "12000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Environment$prod"]
  }

  # Fires when spend has already happened
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.finops.arn]
  }

  # ✨ Fires early — projected to exceed by month end
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.finops.arn]
  }
}
```

> A `FORECASTED` alert is the useful one. An `ACTUAL` 100% alert tells you the money is already gone.

## The Hidden Costs Everyone Forgets

These are the questions that separate people who have owned a bill from people who have read a blog post.

| Cost | Why It Surprises People | Fix |
|------|------------------------|-----|
| **NAT Gateway** | ~$32/month each **plus** per-GB processing | VPC endpoints for S3/ECR/DynamoDB |
| **Cross-AZ data transfer** | Charged both directions, invisible in design docs | AZ-aware routing, topology-aware hints |
| **Idle load balancers** | Charged hourly even with zero traffic | Delete with the environment |
| **Unattached EBS volumes** | Survive instance termination | `DeleteOnTermination`, sweeper job |
| **Old EBS snapshots** | Accumulate forever | Data Lifecycle Manager |
| **CloudWatch log groups with no retention** | Store forever, biggest CloudWatch line item | Set retention on every group |
| **Public IPv4 addresses** | Now charged per hour, per address | IPv6, shared NAT/ALB |
| **Empty multipart uploads in S3** | Invisible in the console, still billed | Lifecycle rule to abort them |

✨ NAT Gateway data processing is the single most common "why is our bill so high?" answer for container workloads pulling images. An ECR + S3 gateway endpoint often pays for itself in a week.

## Showback and Chargeback

| Model | What Happens | Effect |
|-------|-------------|--------|
| **Showback** | Teams see their spend, no invoice | Awareness, low friction |
| **Chargeback** | Cost moves to the team's budget | Strong incentive, political |

✅ Start with showback. A weekly automated cost report per team, posted to their own Slack channel, changes behaviour faster than a governance policy.

## Interview Q&A

**Q: How would you find out why the AWS bill went up 40% this month?**

Start in Cost Explorer with daily granularity grouped by service — this shows whether the increase is a step change on a specific date or gradual growth. Then filter to the service that jumped and group by usage type, because that names the exact charge, such as NAT gateway data processing rather than just "EC2". Next, group by cost allocation tag to identify the owning team. Finally, correlate the start date with CloudTrail events and deployment history to find the change that caused it. In practice the answer is usually one of a few things: a new environment left running, a log group without retention, cross-AZ or NAT data transfer from a new service, or an autoscaling group whose minimum was raised during an incident and never lowered.

**Q: What is the difference between blended, unblended, and amortized cost?**

Unblended cost is the actual charge as it appears on the invoice on the day it was incurred, so a one-year upfront Reserved Instance payment shows as a single large charge. Amortized cost spreads that upfront payment evenly across the commitment term, which gives a smooth, honest picture of what each month's workload really costs. Blended cost averages rates across all accounts in an organization, which is mostly a legacy view and rarely what you want. For team chargeback, capacity planning, and trend analysis, use amortized. To reconcile against the invoice, use unblended.

**Q: Why are cost allocation tags so important, and what are their limits?**

Tags are the only mechanism that maps AWS charges back to a team, service, or feature. Without them, every optimization discussion is guesswork because nobody knows who owns the spend. The limits matter though: tags must be explicitly activated in the billing console before they appear in Cost Explorer, and activation is not retroactive. Not all resources are taggable, and some of the largest charges — particularly data transfer — cannot be tagged at all. Realistically you reach 80–90% attribution, so you also need a rule for allocating the shared remainder, usually proportionally or to a platform cost centre.

**Q: Should you use AWS Budgets or Cost Anomaly Detection?**

Both, because they catch different failures. Budgets check spend against a threshold you set, so they enforce a known limit but cannot notice that one service silently doubled while the total stayed under the cap. Cost Anomaly Detection learns a baseline per service and flags statistically unusual changes, so it catches surprises you did not think to threshold — but it will not complain about spend that is high and consistent. Configure Budgets with forecasted alerts rather than only actual, so you are warned mid-month while there is still time to act.

**Q: A team says they need a bigger instance type. How do you respond?**

Ask for the evidence first: which resource is saturated, at what percentile, and over what window. Most requests come from a peak that lasted ten minutes, or from a memory metric nobody is actually collecting, since EC2 does not report memory by default. If the workload really is constrained, check whether a different instance family fits better than a bigger one in the same family — a compute-bound service on a memory-optimized instance is paying for RAM it never touches. Also check whether horizontal scaling is the better answer, since it improves availability at the same time. Then, once the size is right, cover the steady-state portion with a Savings Plan.

---

[Cost Optimization Index](./README.md) | [Optimization Strategies →](./02-optimization.md)
