---
title: Latency and Throughput
part: 6
chapter: 0
slug: latency-and-throughput
level: intermediate
reading_time: 10
updated: 2026-09-02
tags: [system-design, performance, latency, percentiles, queueing]
in_book: true
---

# Latency and Throughput {#ch-latency-and-throughput}

> Read a latency distribution correctly, find where a request actually spends its time, and say which fix buys what.

**In this chapter:** latency versus throughput · why the average lies · tail latency and fan-out · Little's Law and queueing · latency budgets · making a slow endpoint fast

## 💡 The Core Idea

Latency is how long one request takes. Throughput is how many requests finish per second. They are not
the same number and they often move in opposite directions — batching raises throughput and raises
latency, adding a queue protects throughput and destroys latency for whoever is at the back of it. A
performance conversation that does not say which of the two it is about is going nowhere.

> Users feel latency. Bills are paid for throughput. Know which one the requirement is written in.

## How It Works

### Why the average lies

A mean latency of 120 ms is compatible with almost any user experience. It hides both the shape of the
distribution and the size of the tail.

| Statistic | Reads as                                    | Use it for                                 |
| --------- | ------------------------------------------- | ------------------------------------------ |
| Mean      | Total time ÷ requests                        | Capacity maths only — never user experience |
| p50       | Half of requests are faster                  | The typical case                           |
| p95       | 1 request in 20 is slower                    | The complaint threshold                    |
| p99       | 1 request in 100 is slower                   | The SLO people actually set                |
| p99.9     | 1 request in 1,000 is slower                 | What the heaviest users see constantly     |

A user who makes 100 requests loading one page has a good chance of hitting the p99 on at least one of
them. That is why p99 is not an edge case: at any real request volume, **the tail is somebody's median**.

```typescript
// Percentiles do not average. Averaging p99 across five servers is meaningless —
// merge the underlying histograms, or take the maximum and say that is what you did.
interface LatencyBucket { upperBoundMs: number; count: number }

function percentile(buckets: LatencyBucket[], p: number): number {
  const total: number = buckets.reduce((n: number, b: LatencyBucket) => n + b.count, 0);
  const target: number = total * p;
  let seen = 0;
  for (const b of buckets) {
    seen += b.count;
    if (seen >= target) return b.upperBoundMs;
  }
  return buckets[buckets.length - 1].upperBoundMs;
}
```

### Tail latency and fan-out

Fan-out amplifies the tail. If one backend call is slow 1% of the time, a request that makes ten
parallel calls and waits for all of them is slow **1 − 0.99¹⁰ ≈ 9.6%** of the time. Ten calls turn a p99
problem into a p90 problem.

Three defences, in order of how often they apply:

| Defence            | How it works                                            | Cost                              |
| ------------------ | ------------------------------------------------------- | --------------------------------- |
| Fewer calls        | Batch, or denormalise so one read answers the question   | Write-path complexity             |
| Hedged requests    | After p95, send a duplicate to another replica and take the first answer | A few percent more load |
| Partial results    | Return what arrived before the deadline, mark the rest missing | The UI must handle absence  |

### Little's Law and the queue

```text
concurrency = arrival rate × average latency
```

One formula explains most capacity surprises. A service handling 500 requests a second at 200 ms each is
holding 100 requests in flight. If it has a thread pool of 50, half the arrivals are queueing before any
work starts.

The important consequence: **as utilisation approaches 100%, queueing time goes to infinity.** At 50%
utilisation, queue wait is roughly equal to service time. At 90% it is nine times service time. This is
why a system that looks fine at 70% CPU falls over at 85% — the CPU number moved a little and the wait
time moved a lot.

Plan for a utilisation ceiling, not a capacity ceiling. Around 70% is the usual target for a
latency-sensitive tier.

### Where the time actually goes

| Stage                          | Typical cost              | Usual fix                             |
| ------------------------------ | ------------------------- | ------------------------------------- |
| DNS + TLS handshake            | 50–200 ms, first request  | Connection reuse, HTTP/2 or HTTP/3    |
| Network round trip             | 0.5 ms same DC, 80 ms cross-continent | Move the data closer, or the compute |
| Load balancer                  | 1–5 ms                    | Rarely the problem                    |
| Application logic              | 1–50 ms                   | Profile before guessing               |
| Database query                 | 1 ms indexed, seconds unindexed | An index, or fewer queries      |
| Serialisation of a large payload | 10–100 ms               | Send less, paginate, compress         |

Geography is the cost nothing removes. A round trip from London to Sydney is ~250 ms because of the speed
of light in fibre. No amount of optimisation beats that; only a copy of the data nearer the user does.

### Latency budgets

Give each stage a number, and the total becomes a design constraint rather than an outcome.

**A 300 ms p99 budget for an authenticated API read:**

| Stage                      | Budget  |
| -------------------------- | ------- |
| Edge and TLS (reused connection) | 20 ms  |
| Auth check (cached token)  | 10 ms   |
| Application logic          | 40 ms   |
| Primary data read          | 60 ms   |
| Two parallel enrichment calls | 100 ms |
| Serialisation and transfer | 40 ms   |
| Headroom                   | 30 ms   |

When a stage wants more, it has to take it from another stage. That conversation is the whole value of
writing the budget down.

## When to Use It

| Symptom                                   | Look at                       | Likely fix                                |
| ----------------------------------------- | ----------------------------- | ----------------------------------------- |
| p50 fine, p99 terrible                    | Tail: GC pauses, cold caches, one slow shard | Hedging, warmups, fixing the outlier |
| Everything slow, evenly                   | A shared bottleneck            | The database, or a saturated dependency   |
| Slow only at peak                         | Utilisation and queueing       | Capacity, or shed load                    |
| Fast in the region, slow abroad           | Geography                      | CDN, edge caching, regional replicas      |
| Throughput plateaus below expected        | Concurrency limits, pool sizes | Little's Law — raise the limit or the speed |

## Common Mistakes

**❌ Optimising the average**

> "We got mean latency from 140 ms to 95 ms."

The mean improves when the fast requests get faster, which no user notices. Meanwhile p99 sat still, and
p99 is what the complaints are about.

**✅ Optimising the percentile in the requirement**

> "p99 went from 1.2 s to 380 ms by removing an N+1 that only fired for users with more than 50 items."

**❌ Averaging percentiles across instances**

The p99 of the p99s is not the p99. Merge histograms, or state that you are reporting the worst instance.

**❌ Measuring latency inside the server only**

Server-side timing misses queueing before the handler, TLS, and the client's network. Measure from the
client for user-facing numbers, and be explicit about which one a dashboard shows.

## 🔑 Key Takeaways

- Latency and throughput trade against each other, and every performance requirement must say which it means.
- The mean hides the tail; p99 is not an edge case, because at scale the tail is somebody's median.
- Fan-out multiplies tail latency — ten calls turn a 1% slow path into a 10% slow request.
- Little's Law explains queueing: as utilisation approaches 100%, wait time grows without bound, so plan to a utilisation ceiling near 70%.
- Write a latency budget per stage, so that spending time in one place becomes an explicit trade against another.

## Interview Questions

**Q: p50 is 40 ms and p99 is 3 seconds. Where do you look?**

At something that affects a small fraction of requests badly rather than all requests slightly: a cold
cache, garbage collection pauses, one slow shard or replica, a code path that only large accounts reach,
or lock contention. Group the slow requests by tenant, endpoint and instance first — the tail almost
always has a shared attribute.

**Q: How do you cut latency for users on the other side of the world?**

Nothing in the application removes propagation delay, so the answer has to move data or compute closer:
a CDN for static and cacheable responses, edge compute for personalisation that does not need the origin,
and regional read replicas for data that tolerates lag. Writes usually stay in one region, and the design
question becomes how much staleness reads can accept.

**Q: When would you accept worse latency on purpose?**

When throughput or cost matters more. Batching writes, buffering telemetry and queueing background jobs
all add delay to individual items and make the system cheaper and more resilient overall. The condition
is that no user is waiting on the result — the moment one is, the trade reverses.

## What to Read Next

- [Chapter ?? — Caching](#ch-caching) — the largest single lever on read latency
- [Chapter ?? — Reliability and Availability](#ch-reliability-and-availability) — why headroom is a reliability property, not just a performance one
- [Chapter ?? — Back-of-Envelope Estimation](#ch-back-of-envelope-estimation) — where the latency constants come from
