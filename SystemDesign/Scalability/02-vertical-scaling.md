# Vertical Scaling

## 💡 **Concept**

Vertical scaling (scale-up) upgrades an existing machine to a larger one — more CPU cores, more RAM, faster disk. No architectural changes are required.

**Use vertical scaling first:** it's the fastest way to buy time and is often the right answer for databases, stateful services, and legacy applications.

---

## When Vertical Beats Horizontal

| Scenario | Why vertical wins |
|---|---|
| **Database primary / writes** | No easy way to horizontally scale writes; bigger instance defers sharding |
| **Legacy stateful app** | Refactoring for statelessness is expensive; upgrade the machine |
| **Low-traffic service** | Horizontal complexity not worth it for < 1k req/sec |
| **In-memory computation** | Some workloads benefit from large RAM (analytics, ML inference) |
| **Quick fix under pressure** | Faster than re-architecting; buy time to plan properly |

---

## Hard Limits

Every cloud provider has a maximum instance size. Once you hit it, vertical scaling stops:

| Cloud | Largest instance (2024) | Max RAM | Max vCPU |
|---|---|---|---|
| **AWS** | u-24tb1.metal | 24 TB | 448 vCPU |
| **GCP** | m3-ultramem-32 | 976 GB | 32 vCPU |
| **Azure** | M416ms v2 | 11.4 TB | 416 vCPU |

In practice, cost becomes prohibitive long before you hit the technical limit.

---

## The Cost Curve

Doubling instance size roughly doubles cost — but doubling CPU does not double throughput for every workload. IO-bound services (most web apps) don't benefit from more CPUs past a saturation point.

```
Vertical scaling cost vs benefit:
  Small → Medium: strong throughput gain, reasonable cost
  Medium → Large: moderate gain, steep cost
  Large → XL: diminishing returns, very steep cost
  XL → max: near-zero throughput gain, extreme cost
```

**Rule of thumb:** When you spend more than 60% of a vertical upgrade cost just to avoid architectural work, it's time to go horizontal.

---

## Right-Sizing Before Scaling

Before scaling up, confirm the bottleneck:

| Metric is high | Bottleneck | Action |
|---|---|---|
| CPU > 80% sustained | Compute-bound | More vCPUs or optimise code |
| Memory > 85% | Memory-bound | More RAM or fix memory leak |
| Disk I/O wait > 30% | I/O-bound | Faster disk (gp3 → io2) or read replicas |
| Network throughput at limit | Network-bound | Larger instance class (more bandwidth) |

```typescript
interface InstanceMetrics {
  cpuUtilizationPercent: number;
  memoryUtilizationPercent: number;
  diskIoWaitPercent: number;
  networkMbps: number;
}

function identifyBottleneck(metrics: InstanceMetrics): string {
  if (metrics.cpuUtilizationPercent > 80) return "CPU — add vCPUs or optimise";
  if (metrics.memoryUtilizationPercent > 85) return "Memory — add RAM";
  if (metrics.diskIoWaitPercent > 30) return "Disk I/O — use faster storage";
  return "No clear bottleneck — profile the application";
}
```

---

## PostgreSQL: A Classic Vertical Scaling Path

Databases are the most common use case for vertical scaling because write operations are hard to distribute.

```
Phase 1: db.t3.medium (2 vCPU, 4 GB)   → handles 0–5k req/day
Phase 2: db.r6g.xlarge (4 vCPU, 32 GB) → handles 5k–50k req/day
Phase 3: db.r6g.4xlarge (16 vCPU, 128 GB) → handles 50k–500k req/day
Phase 4: Add read replicas (horizontal for reads)
Phase 5: Sharding (horizontal for writes — last resort)
```

Each upgrade is a few minutes of maintenance window. Each phase defers the complexity of horizontal scaling.

---

## When to Stop Scaling Vertically

Switch to horizontal scaling (or sharding) when:
- You hit 50%+ of the maximum instance cost for your workload
- You need zero-downtime deploys (vertical requires restart)
- You need fault tolerance (vertical = single point of failure)
- Write throughput exceeds what one DB instance handles

---

## Common Mistakes

❌ **Skipping profiling** — upgrading from 8 vCPU to 32 vCPU for an I/O-bound service does nothing. Identify the actual bottleneck first.

❌ **Treating vertical as a permanent solution** — it buys time. Plan the horizontal architecture before you hit the limit.

❌ **Ignoring instance restart cost** — vertical scaling requires a stop/start. For RDS, this is a 5–30 minute maintenance window. Plan for it.

✅ **Use instance families optimised for your workload** — memory-optimised (r family) for databases, compute-optimised (c family) for processing, general-purpose (m family) for balanced workloads.

---

## Real-World Example

A PostgreSQL primary serving a SaaS product hit 90% CPU during peak hours. Rather than implementing read replicas and connection pooling immediately (a multi-week project), the team upgraded from db.r6g.large (2 vCPU, 16 GB) to db.r6g.4xlarge (16 vCPU, 128 GB) in a 15-minute maintenance window. This bought 6 months of headroom and time to plan a proper read replica setup.

---

## Key Insight

> Vertical scaling is not the cowardly choice — it is often the pragmatic one. It is faster, simpler, and lower-risk than re-architecting under pressure. Scale vertically first; go horizontal when vertical stops working.

**Related:** [Horizontal Scaling](./01-horizontal-scaling.md) · [Database Scaling](./05-database-scaling.md)

---

[← Back to SystemDesign](../README.md)
