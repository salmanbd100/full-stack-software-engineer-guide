# Cost Optimization & Performance - Interview Preparation

Cost questions reveal whether you have owned a production AWS account or only built in one. This section covers making spend visible, reducing it, and planning capacity before you need it.

## Table of Contents

1. [Cost Management](./01-cost-management.md) — tags, Cost Explorer, budgets, anomaly detection, hidden costs
2. [Optimization Strategies](./02-optimization.md) — right-sizing, Savings Plans vs RIs, Spot, Graviton, scheduling
3. [Storage Cost Optimization](./03-storage-costs.md) — S3 classes, lifecycle rules, gp2→gp3, data transfer
4. [Performance Tuning](./04-performance.md) — finding bottlenecks, Lambda memory, databases, caching, autoscaling
5. [AWS Well-Architected](./05-well-architected.md) — six pillars, RTO/RPO, trade-offs as an answer structure
6. [Capacity Planning](./06-capacity-planning.md) — load testing, headroom maths, quotas, forecasting

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 02 Optimization | "How would you cut the bill by 30%?" is near-guaranteed |
| 🔴 Critical | 05 Well-Architected | Framework and RTO/RPO appear in every design round |
| 🔴 Critical | 01 Cost Management | Tags and "why did the bill jump?" investigations |
| 🟡 High | 04 Performance | Bottleneck diagnosis is a standard scenario question |
| 🟡 High | 03 Storage Costs | gp2→gp3 and NAT/data transfer are classic answers |
| 🟢 Good to know | 06 Capacity Planning | Senior and lead roles, event-scaling scenarios |

## Top 12 Interview Questions

1. How would you cut the AWS bill by 30%?
2. Savings Plans vs Reserved Instances — which and why?
3. How much should you commit to, and how do you decide the term?
4. When are Spot instances safe, and how do you make them reliable?
5. Why did the bill go up 40% this month — how do you investigate?
6. What is the difference between unblended and amortized cost?
7. Why does increasing Lambda memory sometimes reduce cost?
8. What is the difference between gp2 and gp3?
9. Where does AWS data transfer cost actually come from?
10. What are the Well-Architected pillars? (Careful — there are six.)
11. Explain RTO and RPO, and the four DR strategies.
12. You have three AZs and must survive losing one. How much capacity?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Order of optimization** | Delete → right-size → schedule → re-architect → *then* commit |
| **Why not commit first** | Commitments discount the rate; they lock in existing waste |
| **Default purchase option** | Compute Savings Plans — cover EC2, Fargate, Lambda, survive re-architecture |
| **RIs still needed for** | RDS, ElastiCache, OpenSearch, Redshift |
| **How much to commit** | 70–80% of the steady **floor**, not the average |
| **Spot reliability** | Diversify 6–10 types + `capacity-optimized` allocation |
| **Biggest free win** | Graviton (~20%) and gp2→gp3 (~20%, online, no downtime) |
| **Memory on EC2** | ❌ Not reported without the CloudWatch agent |
| **NAT Gateway** | Hourly **plus** per-GB — S3/DynamoDB gateway endpoints are free |
| **Cross-AZ transfer** | Charged in **both** directions, and cannot be tagged |
| **Lambda memory** | CPU scales with memory; more memory can cost less |
| **Well-Architected pillars** | **Six** — Sustainability was added in 2021 |
| **AZ failure maths** | Losing 1 of 3 leaves 67% → provision 1.5× peak |
| **Real capacity** | The **knee** of the latency curve, not peak throughput |

## Hidden Cost Cheat Sheet

The line items that cause "why is our bill so high?".

| Trap | Why It Hides | Fix |
|------|-------------|-----|
| NAT Gateway data processing | Per-GB charge invisible in design docs | S3 + ECR VPC endpoints |
| CloudWatch log groups | Default retention is **never expire** | Set retention on every group |
| Incomplete multipart uploads | Not listed in the S3 console, still billed | `abort_incomplete_multipart_upload` |
| Non-current S3 versions | Versioning silently multiplies storage | `noncurrent_version_expiration` |
| Unattached EBS volumes | Survive instance termination | `DeleteOnTermination` + sweeper |
| Cross-AZ data transfer | Charged both ways, untaggable | Keep chatty paths AZ-local |
| Idle load balancers | Billed hourly at zero traffic | Destroy with the environment |
| Public IPv4 addresses | Now charged per address per hour | IPv6, shared ALB/NAT |
| Non-prod running 168h/week | Nobody turns it off | Schedule or make it ephemeral |
| Expiring Savings Plan | Reverts to On-Demand overnight | Track renewal dates |

## Scaling Ceilings Cheat Sheet

| Wall | Warning Metric |
|------|---------------|
| EC2 vCPU service quota | Quota utilization, not errors |
| Lambda account concurrency | `Throttles` > 0 |
| RDS `max_connections` | `DatabaseConnections` — use RDS Proxy |
| NAT ~55k connections per destination | `ErrorPortAllocation` |
| EKS subnet IP exhaustion (VPC CNI) | Free IPs per subnet |
| `t3` CPU credit exhaustion | `CPUCreditBalance` trending to zero |
| DynamoDB partition throughput | `ThrottledRequests` |

## Study Path

**Start here →** [Cost Management](./01-cost-management.md)

| Level | Topics | Time |
|-------|--------|------|
| Visibility | 01: tags, Cost Explorer, budgets | 2–3 hours |
| Reduction | 02, 03: purchase options, storage, transfer | 4–5 hours |
| Efficiency | 04: bottlenecks, caching, autoscaling | 3–4 hours |
| Architecture | 05: six pillars, RTO/RPO, trade-offs | 2–3 hours |
| Forward planning | 06: load testing, quotas, forecasting | 2–3 hours |

## Related Topics

- [AWS EC2](../AWS/04-ec2.md) — instance families, ASGs, Spot mechanics
- [AWS S3](../AWS/07-s3.md) — storage classes and lifecycle configuration
- [AWS CloudWatch](../AWS/14-cloudwatch.md) — metrics, log retention, agent setup
- [Kubernetes Autoscaling](../Kubernetes/10-autoscaling.md) — HPA, Cluster Autoscaler, Karpenter
- [Monitoring Fundamentals](../Monitoring/01-fundamentals.md) — percentiles, SLOs, error budgets
- [Terraform Best Practices](../Terraform/10-best-practices.md) — `default_tags` and tagging governance
- [Networking: AWS Advanced](../Networking/02-aws-networking.md) — VPC endpoints and transfer paths

---
[← DevOps](../README.md)
