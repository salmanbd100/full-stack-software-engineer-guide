---
title: Load Balancing
part: 6
chapter: 7
slug: load-balancing
level: intermediate
reading_time: 9
updated: 2026-09-02
tags: [system-design, load-balancing, health-checks, scaling, availability]
in_book: true
---

# Load Balancing {#ch-load-balancing}

> Choose a layer and an algorithm to match the traffic, and be able to say exactly what happens when a node dies.

**In this chapter:** layer 4 vs layer 7 · routing algorithms · the health check that causes outages · draining and auto-scaling · service discovery · going multi-region

## 💡 The Core Idea

A load balancer turns a set of servers into one logical service. Clients call a single name, and the
balancer decides which machine answers. Every other scaling move depends on this step. A second server
is no use until something is willing to send traffic to it.

The interesting part is not the distribution. It is the failure handling. Picture a balancer that
spreads traffic evenly but takes ninety seconds to notice a dead node. It has not bought you
availability. It has bought you a slower outage. Most of the design work is in the health check.

## How It Works

The balancer accepts every request on one public address, picks a healthy backend, and forwards it. In
parallel it probes each backend every ten to thirty seconds and removes the ones that stop answering.
One address in front, a pool behind it, and a probe deciding who is in the pool.

### Layer 4 vs layer 7

The layer decides how much of the request the balancer is allowed to read.

| | Layer 4 (transport) | Layer 7 (application) |
| --- | --- | --- |
| **Sees** | IP and port | Path, host, headers, cookies |
| **Routes on** | Connection tuple | Anything in the request |
| **Added latency** | Under a millisecond | One to two milliseconds |
| **TLS termination** | No — the bytes pass through | Yes |
| **Reach for it when** | Raw TCP, latency budgets in microseconds | HTTP services, path-based routing to microservices |

Layer 7 is the default for web work. You give up a millisecond and gain the ability to send `/api/*`
to one service and `/images/*` to another without the client knowing there are two.

### Routing algorithms

| Algorithm | Sends the request to | Best for |
| --- | --- | --- |
| **Round-robin** | The next server in rotation | Equal machines, stateless requests of similar cost |
| **Weighted round-robin** | Higher-weight servers, proportionally | Mixed instance sizes, or shifting traffic during a rolling deploy |
| **Least connections** | The server holding the fewest open connections | Requests of wildly different duration — uploads, WebSockets |
| **IP hash** | The server that client IP maps to | Soft session affinity, when nothing better is available |

**The two that cover almost every case:**

```typescript
interface Server { url: string; weight: number; activeConnections: number; healthy: boolean }

// Weighted: expanding by weight is fine for a pool of tens, not for a hot path.
function weightedRoundRobin(servers: Server[]): Server | null {
  const pool = servers.filter((s) => s.healthy).flatMap((s) => Array<Server>(s.weight).fill(s));
  return pool.length === 0 ? null : pool[Math.floor(Math.random() * pool.length)];
}

// Least connections: the right default when request durations vary widely.
function leastConnections(servers: Server[]): Server | null {
  const healthy = servers.filter((s) => s.healthy);
  return healthy.length === 0
    ? null
    : healthy.reduce((min, s) => (s.activeConnections < min.activeConnections ? s : min));
}
```

IP hash deserves a warning. Mobile clients move between WiFi and cellular and change IP mid-session.
Affinity built on the client address breaks exactly when a user walks out of a building. If you need
session state, put it in Redis and keep every server interchangeable.

### The health check that causes outages

A health check that tests shared dependencies will eventually take your whole fleet down at once.

**❌ One endpoint, checking everything:**

```typescript
// Every instance depends on the same database. When it blips, every instance
// fails the check in the same second and the balancer empties the pool.
app.get("/health", async (_req, res) => {
  await db.query("SELECT 1");
  await redis.ping();
  res.sendStatus(200);
});
```

**✅ Two endpoints, answering two different questions:**

```typescript
// Liveness: is the process alive? Nothing external, so a dependency blip degrades
// the service instead of deleting the fleet.
app.get("/health", (_req, res) => res.sendStatus(200));

// Readiness: can this instance serve right now? Short timeout, so a slow dependency
// cannot hang the probe itself.
app.get("/ready", async (_req, res) => {
  res.sendStatus((await checkDbPool({ timeoutMs: 1000 })) ? 200 : 503);
});
```

The thresholds are arithmetic, and worth doing out loud:

```text
Time to remove a dead server = interval x unhealthy threshold  = 15s x 3 = 45s
Time to return a recovered one = interval x healthy threshold  = 15s x 2 = 30s
```

> ⚠️ A 5-second interval with a threshold of 2 detects failure in ten seconds. It also evicts healthy
> servers during a garbage-collection pause. Faster detection means more flapping — servers dropping
> out of the pool and coming back.

### Draining and auto-scaling

The balancer and the auto-scaler share the instance lifecycle between them.

A new instance joins the pool only after it passes readiness. A departing one stops receiving new requests, then drains. **Scale-out waits for a probe; scale-in waits for a drain.**

**Connection draining is the step people skip.** Without it, stopping an instance kills the requests
it was still serving. Those failures land on real users, while the dashboard reports a successful
scale-in. Thirty to sixty seconds covers almost any HTTP request. Long-lived WebSocket connections
need an application-level "reconnect now" nudge instead.

### Finding the instances in the first place

A balancer needs a list of healthy backends, and in an auto-scaled estate that list changes every few
minutes. Service discovery is what keeps it current.

| Model            | How it works                                                     | Where you meet it              |
| ---------------- | ---------------------------------------------------------------- | ------------------------------ |
| Server-side      | Instances register with a registry; the balancer reads it         | AWS target groups, Kubernetes Services |
| Client-side      | The caller queries the registry and picks an instance itself      | Consul, Eureka, gRPC name resolvers |
| DNS-based        | A service name resolves to current instance addresses             | Kubernetes cluster DNS         |

Server-side is the default for external traffic and needs nothing from the application. Client-side
removes a network hop and gives the caller control over the algorithm, at the cost of a discovery client
in every service. DNS is the simplest of the three and the easiest to get wrong. Clients cache
resolutions past the TTL, so an instance that has gone away can keep receiving traffic for minutes.

The registry itself must not become the single point of failure. Callers cache the last good instance
list and keep using it when the registry is unreachable. A stale list is far better than no list.

### Going multi-region

Once you run in more than one region, a global balancer sits in front of the regional ones. It
announces a single address from every location and routes on network distance and regional health.

| Layer | Decides | Failure it handles |
| --- | --- | --- |
| **Global balancer** | Which region | A whole region going dark |
| **Regional balancer** | Which server | A single instance dying |
| **Cross-zone balancing** | Which availability zone within a region | One zone becoming unbalanced or unhealthy |

Interviewers ask for the failover story. Say the Singapore region fails its health checks. The global
balancer stops answering with Singapore addresses, and traffic lands in the next-nearest healthy region
within a minute or so. Latency gets worse, but the service stays up.

## When to Use It

| Scenario | What to do |
| --- | --- |
| One server is saturated | Add a balancer and a second server — in that order |
| You need better than 99.9% uptime | The balancer removing failed servers is the mechanism that buys it |
| Zero-downtime deploys | Rolling update behind the balancer: drain old, add new, weight the shift |
| Long-lived connections | Least connections, and plan for reconnects on scale-in |
| Sessions must survive | Move them to Redis rather than pinning users to servers |

## Common Mistakes

❌ **Sessions on the app server.** The next request lands on a different machine and the user is
logged out. ✅ Keep session state in Redis or a signed token, so every server is interchangeable.

❌ **A health check that tests the shared database.** One blip fails every instance at the same time,
and the pool empties. ✅ Split liveness from readiness, and never probe a shared dependency in the check
that controls fleet membership.

❌ **Round-robin for WebSockets.** Connections are long-lived and unequal, so an even share of new
connections becomes a wildly uneven share of load. ✅ Least connections.

❌ **No connection draining.** In-flight requests die on every scale-in and every deploy. ✅ Configure a
drain window and make the deploy wait for it.

❌ **One balancer, no redundancy.** The thing you added to remove a single point of failure becomes
one. ✅ Managed balancers run redundant nodes across zones by default. Use that, not a single
self-hosted instance.

## 🔑 Key Takeaways

- A load balancer's value is failure detection, not distribution. The routing algorithm is the easy half.
- Layer 7 costs about a millisecond and buys routing on path, host and header. It is the default for HTTP.
- Liveness and readiness are different questions, and merging them turns a dependency blip into an outage.
- Detection time is interval times threshold, and tightening it trades flapping for speed.
- Draining is what separates a clean scale-in from a burst of user-visible errors.

## Interview Questions

**Q: Layer 4 or layer 7 for an HTTP API, and why?**

Layer 7, unless there is a specific reason not to. It can route on path and host, terminate TLS in one
place, and give per-route metrics. The cost is a millisecond or two of added latency and the balancer
seeing plaintext. Layer 4 wins when the protocol is not HTTP, or when the latency budget is tight
enough that a millisecond matters.

**Q: Your health check hits the database. What is wrong with that?**

Every instance shares that database, so a brief database problem fails every check at once. The
balancer then removes every server and returns 503 with an empty pool. That outage is worse than the
original blip. Liveness should test only the process. Readiness may test a dependency, but with a
short timeout, and knowing that a shared dependency will fail it across the whole fleet.

**Q: When would you not put a load balancer in front of a service?**

When there is exactly one instance and no plan for a second. The balancer then adds a hop, a cost and
another thing to configure, and buys no availability. Internal single-instance tools and background
workers reached only through a queue are the usual cases. The moment uptime matters, or a second
instance appears, the calculation flips.

## What to Read Next

- [Chapter ?? — Scalability, Latency and Throughput](#ch-scalability) — where balancing sits among the scaling levers
- [Chapter ?? — Service Boundaries and the API Gateway](#ch-service-boundaries) — the layer above, doing auth and rate limiting rather than distribution
- [Chapter ?? — Reliability, Consistency and CAP](#ch-consistency-and-cap) — what the nines actually cost
