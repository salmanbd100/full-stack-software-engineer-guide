# Performance Tuning

Performance and cost are the same conversation. A faster system needs fewer resources, and most "we need bigger instances" requests are really unmeasured bottlenecks.

## Measure Before You Tune

> You cannot tune what you have not measured, and you will almost always guess the bottleneck wrong.

**The four resources anything can be limited by:**

```
CPU  ·  Memory  ·  Disk I/O  ·  Network
                ↓
   Find which one saturates first — that is the bottleneck.
   Everything else is noise.
```

❌ **Bad process:** "It's slow, let's use a bigger instance." Cost doubles, latency unchanged, because the bottleneck was a missing database index.
✅ **Good process:** measure → identify the saturated resource → fix that one thing → re-measure.

**Where the answer usually is, in order of frequency:**

| Rank | Cause | How You Spot It |
|------|-------|----------------|
| 1 | **Database query / missing index** | Slow query log, RDS Performance Insights |
| 2 | **N+1 queries** | Trace shows 200 tiny DB spans per request |
| 3 | **No caching** | Identical expensive work repeated |
| 4 | **Serial calls that could be parallel** | Trace shows a staircase, not a block |
| 5 | Undersized compute | CPU actually pinned at 100% |

✨ Undersized compute is last on this list, but first in most engineers' guesses.

## Reading Latency Correctly

| Statistic | What It Tells You | Use For |
|-----------|------------------|---------|
| **Average** | Almost nothing | ❌ Avoid |
| **p50** | The typical experience | Reporting |
| **p95 / p99** | The bad experience | ✅ Alerting and SLOs |
| **Max** | One outlier, often a cold start | Investigation only |

⚠️ An average of 200 ms can hide a p99 of 8 seconds. If a page makes 20 requests, most page loads hit at least one p95 request.

> Alert on p99. Report p50. Never make a decision from an average.

See [Monitoring Fundamentals](../Monitoring/01-fundamentals.md) for why you cannot average percentiles across instances.

## Compute Tuning

**EC2 / container level:**

| Check | Why It Matters |
|-------|---------------|
| **Instance family matches workload** | `c` for CPU-bound, `r` for memory-bound, `m` for balanced |
| **Graviton** | ~20% cheaper, often faster per core |
| **Burstable credit exhaustion** | A `t3` out of CPU credits throttles hard and silently |
| **EBS-optimized throughput ceiling** | Instance network limit can cap disk before the volume does |
| **Enhanced networking / placement groups** | Only for genuinely network-bound workloads |

🔴 **The `t3` trap:** burstable instances earn CPU credits at a fixed rate. A service that sustains 40% CPU on a `t3.medium` (baseline 20%) will exhaust credits and throttle to baseline. It looks like a random performance cliff hours after deploy.

```bash
# If this trends toward zero, the instance is about to throttle
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 --metric-name CPUCreditBalance \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --start-time "$(date -u -v-6H +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 300 --statistics Minimum
```

✅ Use `t` family for genuinely spiky, low-average workloads. Use `m`/`c` for anything with steady load.

**Container level:**

| Setting | Guidance |
|---------|----------|
| **CPU request** | Set to realistic steady use — this drives scheduling |
| **CPU limit** | ⚠️ Often better left unset; limits cause throttling even with idle nodes |
| **Memory request = limit** | Memory is not compressible; avoid overcommit and OOM kills |
| **Replicas vs size** | Prefer more small replicas — better availability and bin-packing |

🔴 CPU limits in Kubernetes throttle a container at the end of every 100 ms period even when the node is idle. This shows up as p99 latency spikes with normal average CPU. See [Kubernetes Autoscaling](../Kubernetes/10-autoscaling.md).

## Lambda Tuning

Lambda has one main knob, and it behaves in a way that surprises people.

> Memory and CPU scale **together**. You are billed for memory × duration. More memory can therefore cost the *same or less*.

```
128 MB   →  9.0 s  →  cost 1.00×   (CPU-starved)
512 MB   →  2.1 s  →  cost 0.93×   ✅ cheaper AND 4× faster
1024 MB  →  1.4 s  →  cost 1.24×
```

✅ Use **AWS Lambda Power Tuning** (a Step Functions state machine) to find the real optimum instead of guessing.

**Cold starts — what actually helps:**

| Fix | Effect |
|-----|--------|
| **Smaller deployment package** | Less to download and unpack |
| **Lazy-init heavy clients outside the handler** | Paid once per container, not per invocation |
| **ARM64 (Graviton)** | Cheaper, often faster start |
| **Provisioned Concurrency** | Removes cold starts, costs money when idle |
| **SnapStart** (Java) | Large improvement for JVM runtimes |
| ❌ "Warming" pings | Fragile, does not scale with concurrency |

```typescript
// ✅ Created once per container — reused across invocations
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({}); // outside the handler

interface OrderEvent {
  orderId: string;
}

export const handler = async (event: OrderEvent): Promise<void> => {
  // ❌ new DynamoDBClient({}) here would rebuild the client every invocation
  await processOrder(db, event.orderId);
};
```

## Database Performance

Most application slowness is database slowness.

| Problem | Symptom | Fix |
|---------|---------|-----|
| **Missing index** | One query dominates the slow log | Add index; verify with `EXPLAIN` |
| **N+1 queries** | Hundreds of tiny identical queries per request | Batch, join, or use a dataloader |
| **Connection exhaustion** | `too many connections` under load | **RDS Proxy** or a pooler |
| **Reads starving writes** | Write latency rises with traffic | Read replicas for read-only queries |
| **Undersized instance** | CPU or memory genuinely pinned | Scale up — last resort |

🔴 **Serverless connection storm:** every Lambda container opens its own database connection. 500 concurrent executions means 500 connections, which exhausts even a large Postgres instance. **RDS Proxy** multiplexes them and is the standard answer.

✅ **RDS Performance Insights** is the fastest path to "which query is the problem" — it ranks load by SQL statement and wait event.

## Caching

Caching is the highest-leverage performance change available, and it is also a cost reduction.

```
Client → CloudFront → ALB → App → ElastiCache → RDS
           ↑                        ↑
      static + cacheable      hot queries, sessions
```

| Layer | Cache | Saves |
|-------|-------|-------|
| **Edge** | CloudFront | Egress cost and latency |
| **Application** | ElastiCache (Redis) | Database load |
| **Query result** | Redis with TTL | Repeated expensive reads |
| **HTTP** | `Cache-Control` + ETag | Full round trips |

**The rule:** cache the expensive and rarely-changing. Do not cache the cheap.

⚠️ **Cache stampede:** when a hot key expires, every request hits the database at once. Fix with a short lock around the recompute, or by refreshing slightly before expiry.

## Auto-Scaling for Performance and Cost

Scaling done well gives you performance at peak and savings at trough.

| Type | Reacts To | Speed |
|------|-----------|-------|
| **Target tracking** | ✅ A metric you care about | Good default |
| **Step scaling** | Alarm thresholds | Finer control |
| **Scheduled** | Known patterns (business hours) | Instant, predictive |
| **Predictive** | Learned daily/weekly cycle | Warms capacity ahead of demand |

**Choose the right metric:**

```
❌ CPU utilization        — wrong for I/O-bound services
✅ ALB RequestCountPerTarget — scales with actual demand
✅ SQS queue depth per worker — the correct signal for consumers
✅ p95 latency            — scales on user experience
```

⚠️ **Scale-out must be faster than demand grows.** If instances take 4 minutes to become healthy and traffic doubles in 60 seconds, autoscaling cannot save you. Fix with pre-baked AMIs, warm pools, or a higher minimum.

✅ Scale out aggressively, scale in slowly. A premature scale-in during a lull triggers another scale-out and causes latency spikes.

## Interview Q&A

**Q: A service is slow in production. Walk me through your approach.**

I start by defining "slow" numerically — which endpoint, at which percentile, and when it changed — because that immediately narrows the search. Then I check whether it correlates with a deployment, a traffic change, or a dependency, since a step change at a deploy time is a very different investigation from gradual degradation. Next I use a distributed trace to see where the time actually goes; that usually points straight at a database call, a downstream service, or a serial chain that could be parallel. Only then do I look at resource metrics to see whether CPU, memory, disk, or network is saturated. In practice the answer is a database problem — a missing index, an N+1 pattern, or connection pool exhaustion — far more often than undersized compute, so I treat "make the instance bigger" as the last hypothesis rather than the first.

**Q: Why is a t3 instance a risky choice for a production service?**

Burstable instances have a baseline CPU allocation and earn credits when running below it, which they spend when running above it. A `t3.medium` has a 20% baseline, so a service averaging 40% CPU is spending credits continuously. It performs perfectly until the credit balance hits zero, at which point it is throttled to baseline and latency collapses. The dangerous part is the delay: this can happen hours or days after the deploy that raised the load, so it does not look connected to any change. The fix is to monitor `CPUCreditBalance` and to use `t` instances only for genuinely spiky, low-average workloads, moving steady workloads to `m` or `c` families where the CPU is always there.

**Q: Why can increasing Lambda memory make a function cheaper?**

Lambda allocates CPU in proportion to memory, and billing is memory multiplied by duration. For a CPU-bound function, doubling memory roughly doubles CPU, which can more than halve the runtime — so you pay twice the rate for less than half the time and end up spending the same or less, with much better latency. This is why the minimum memory setting is frequently the most expensive option. The practical approach is to run AWS Lambda Power Tuning across a range of settings and read the cost-versus-duration curve, because the optimum depends on how parallelizable the work is. Memory-bound or I/O-bound functions behave differently, which is exactly why measuring beats reasoning here.

**Q: What metric should an autoscaling group scale on?**

Whatever metric actually correlates with demand for that workload, which is often not CPU. For a web tier behind an ALB, `RequestCountPerTarget` is better because it maps directly to work arriving. For a queue consumer, the right signal is backlog per worker — approximate number of messages divided by running tasks — since CPU can be low while a queue grows unboundedly. For latency-sensitive services, scaling on p95 latency ties capacity to user experience. The other half of the answer is timing: scale-out has to outpace how fast demand grows, so if instances take minutes to become healthy you need warm pools, pre-baked images, or a higher floor. And scale in slowly, because aggressive scale-in during a lull causes an immediate scale-out and a latency spike.

**Q: How does caching reduce cost, not just latency?**

Every cached response is work you did not do and data you did not move. A CloudFront cache hit avoids origin compute and, importantly, replaces expensive direct egress with cheaper CloudFront egress. An ElastiCache hit avoids a database query, which means the database can be a smaller instance with fewer read replicas. Caching also flattens traffic spikes, so the autoscaling group runs fewer instances at peak. The trade is staleness and complexity, so the rule is to cache expensive, frequently-requested, slowly-changing data — and to think about invalidation before adding the cache, because a cache you cannot invalidate becomes a correctness bug rather than an optimization.

---

[← Storage Costs](./03-storage-costs.md) | [Index](./README.md) | [Well-Architected →](./05-well-architected.md)
