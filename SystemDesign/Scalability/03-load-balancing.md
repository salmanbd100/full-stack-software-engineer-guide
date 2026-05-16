# Load Balancing as a Scaling Lever

> For algorithm deep dive, health check configuration, and Layer 4 vs Layer 7 details, see [BuildingBlocks: Load Balancing](../BuildingBlocks/01-load-balancing.md).

## 💡 **Concept**

A load balancer is what makes horizontal scaling work. It distributes incoming traffic across multiple servers, detects failures automatically, and integrates with auto-scaling to adjust capacity on demand.

**Without a load balancer, horizontal scaling is impossible.** Multiple servers without a traffic distributor are just isolated machines.

---

## How LB Enables Scale

```
Without LB:              With LB:
                              Client
Client → Server 1              │
(Server 2 sits idle)           ▼
                          Load Balancer
                          │    │    │
                          ▼    ▼    ▼
                         S1   S2   S3   (all active)
```

The load balancer:
1. Accepts all incoming traffic on one IP/hostname.
2. Routes to healthy servers using the configured algorithm.
3. Detects failed servers via health checks and stops routing to them.
4. Works with the auto-scaler to add newly launched instances to the pool.

---

## Algorithm Cheat Sheet

| Algorithm | Route to | When to use |
|---|---|---|
| **Round-robin** | Next server in rotation | Equal capacity, stateless APIs |
| **Least connections** | Server with fewest active connections | Variable-length requests (WebSockets, file uploads) |
| **IP hash** | Server determined by client IP | Soft session affinity (not for mobile) |
| **Weighted** | Higher-weight servers get more traffic | Mixed instance sizes during rolling deploys |

---

## Auto-Scaling Integration

The load balancer and auto-scaler work together:

```
Auto-scaler launches new instance
  │
  ▼
Instance passes health check (HTTP 200 on /health)
  │
  ▼
Load balancer adds instance to pool
  │
  ▼
Traffic now routes to new instance

--- scale-in ---

Auto-scaler decides to remove instance
  │
  ▼
Load balancer drains connections (30s grace period)
  │
  ▼
Instance terminates after drain completes
```

**Connection draining** is critical — without it, in-flight requests to a terminating instance fail.

---

## Global Load Balancing

For multi-region scale, a global load balancer sits in front of regional load balancers:

```
User (APAC)
  │
  ▼
Global LB (Anycast IP) → routes to nearest healthy region
  │
  ├── US-East LB → [S1][S2][S3]
  ├── EU-West LB  → [S1][S2][S3]
  └── AP-South LB → [S1][S2][S3]  ← APAC user lands here
```

**Failover:** if AP-South region fails health checks, global LB reroutes APAC traffic to EU-West (next closest).

Implementations: AWS Global Accelerator, Cloudflare Load Balancer, GCP Global HTTP Load Balancer.

---

## Common Mistakes

❌ **Single load balancer** — the LB itself becomes a single point of failure. Use managed cloud LBs (AWS ALB) which run redundant instances automatically.

❌ **Health check checks only HTTP 200** — a server can return 200 while its database connection is broken. Check critical dependencies.

❌ **No connection draining** — in-flight requests fail when an instance terminates. Always configure a drain period (30–60s).

✅ **Cross-zone load balancing** — distribute traffic evenly across availability zones, not just servers. Prevents one AZ from being overloaded.

---

## Real-World Example

A global SaaS product adds APAC coverage by deploying a third region (Singapore) with 3 servers. AWS Global Accelerator routes APAC users to the Singapore ALB. When one of the 3 Singapore servers fails a health check, the ALB removes it from the pool within 30 seconds — the other 2 handle the load. When US-East suffers a full region outage, Global Accelerator reroutes all US traffic to EU-West within 60 seconds.

---

## Key Insight

> A load balancer transforms a set of servers into a single logical unit. Scaling becomes as simple as adding more servers to the pool. The complexity moves from your application to the infrastructure layer — where it belongs.

**Deep dive:** [BuildingBlocks: Load Balancing](../BuildingBlocks/01-load-balancing.md)

---

[← Back to SystemDesign](../README.md)
