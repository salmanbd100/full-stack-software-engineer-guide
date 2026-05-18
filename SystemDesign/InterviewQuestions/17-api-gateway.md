# Design API Gateway

## How to Open This Answer

"I'll design an API Gateway that acts as the single entry point for all client traffic, handling auth, rate limiting, and routing before any request reaches a microservice. The key challenges are low-latency request processing and fault isolation when downstream services degrade."

## Problem Statement

Microservice architectures expose dozens of internal services. Clients should not call services directly. An API Gateway centralises cross-cutting concerns — authentication, SSL termination, rate limiting, and routing — so each microservice stays focused on business logic. At scale the gateway itself must not become a bottleneck or single point of failure.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Route incoming requests to the correct upstream microservice
- Authenticate every request (JWT validation / API key check)
- Enforce per-client rate limits (requests per second / per day)
- Terminate TLS and forward plain HTTP internally
- Transform requests and responses (add/strip headers, protocol translation)

### Non-Functional (pick 3-4)

- Add ≤ 5ms median latency overhead per request
- Handle 500k requests per second at peak
- 99.999% availability — the gateway failing means the whole platform is down
- Support horizontal scaling with no shared state between gateway instances

## A — Architecture

### High-Level Diagram

```
Clients (mobile, browser, third-party)
        │  HTTPS
        ▼
  Load Balancer (L4/L7, e.g. AWS NLB)
        │
        ▼
  ┌─────────────────────────────────┐
  │          API Gateway Cluster     │
  │  ┌──────────┐  ┌─────────────┐  │
  │  │  Auth    │  │ Rate Limiter│  │
  │  │ Middleware│  │ (Redis/     │  │
  │  └──────────┘  │  sliding    │  │
  │  ┌──────────┐  │  window)    │  │
  │  │ Router / │  └─────────────┘  │
  │  │ Proxy    │                   │
  │  └──────────┘                   │
  └─────────────────────────────────┘
        │  HTTP (internal)
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
  User Service       Order Service      Payment Service
```

Each gateway instance is stateless. Auth validation uses a shared JWT public key (no DB call). Rate-limit counters live in a Redis cluster, accessed via a sliding-window Lua script for atomicity. The router uses a config-driven route table (loaded from a config store on startup, hot-reloaded). Circuit breakers sit between the gateway and each upstream to stop cascading failures.

### Request Processing Pipeline

Every request passes through these middleware stages in order:

```
1. TLS Termination      → decrypt HTTPS, forward plain HTTP internally
2. Auth Middleware      → verify JWT signature using cached public key
3. Rate Limiter         → check Redis sliding window counter
4. Request Transformer  → strip/add headers, normalise path
5. Router               → match path pattern → upstream URL
6. Circuit Breaker      → check upstream health state
7. Proxy                → forward to upstream with timeout
8. Response Transformer → add CORS headers, strip internal headers
9. Logger               → write async audit log to Kafka
```

Each stage is a composable middleware function. Failed stages short-circuit and return an appropriate HTTP error code (401, 429, 503). This pipeline pattern allows adding new middleware without touching existing stages.

### Rate Limiting — Sliding Window Algorithm

```typescript
// Lua script executed atomically in Redis
// Key pattern: rl:{clientId}:{windowSecond}
async function checkRateLimit(
  clientId: string,
  limitPerSecond: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowKey = `rl:${clientId}:${Math.floor(now / 1000)}`;

  // Increment counter for current second window
  const count = await redis.incr(windowKey);
  if (count === 1) await redis.expire(windowKey, 2); // 2s TTL — covers window overlap

  const allowed = count <= limitPerSecond;
  return { allowed, remaining: Math.max(0, limitPerSecond - count) };
}
```

The sliding window approach is more accurate than a fixed window. It prevents burst attacks that exploit window resets at the boundary.

## D — Data Model

```typescript
// Route config — loaded from config store (etcd / Consul)
interface RouteConfig {
  id: string;
  pathPattern: string;          // e.g. "/orders/**"
  method: "GET" | "POST" | "PUT" | "DELETE" | "*";
  upstreamUrl: string;          // e.g. "http://order-svc:8080"
  stripPrefix?: string;         // remove "/orders" before forwarding
  requiredScope?: string;       // JWT scope required to access route
  rateLimit?: RateLimitPolicy;
}

interface RateLimitPolicy {
  requestsPerSecond: number;
  requestsPerDay: number;
  keyStrategy: "ip" | "apiKey" | "userId";
}

// Stored in Redis: sliding window counter key structure
// Key: `rl:{strategy}:{identifier}:{windowStart}`
interface RateLimitCounter {
  key: string;
  count: number;
  windowStartMs: number;
  ttlSeconds: number;
}

// Audit log entry (written async to Kafka)
interface GatewayRequestLog {
  requestId: string;
  clientId: string;
  path: string;
  method: string;
  upstreamService: string;
  statusCode: number;
  gatewayLatencyMs: number;
  upstreamLatencyMs: number;
  timestamp: string;
}
```

## I — Interface (APIs)

```typescript
// The gateway proxies all routes — these are management APIs

// GET /gateway/routes — list all active routes
interface ListRoutesResponse {
  routes: RouteConfig[];
  version: string;        // config version hash
}

// POST /gateway/routes — add or update a route (admin only)
interface UpsertRouteRequest {
  route: Omit<RouteConfig, "id">;
}
interface UpsertRouteResponse {
  id: string;
  appliedAt: string;
}

// GET /gateway/rate-limit/status?clientId=<id>
interface RateLimitStatusResponse {
  clientId: string;
  requestsThisSecond: number;
  requestsToday: number;
  limitPerSecond: number;
  limitPerDay: number;
  resetAt: string;        // ISO 8601 when daily window resets
}

// POST /gateway/circuit-breaker/reset  — manual reset (ops tool)
interface CircuitBreakerResetRequest {
  upstreamService: string;
}
interface CircuitBreakerResetResponse {
  service: string;
  previousState: "open" | "half-open" | "closed";
  newState: "closed";
}

// GET /gateway/health
interface GatewayHealthResponse {
  status: "ok" | "degraded";
  upstreams: Array<{
    service: string;
    state: "open" | "half-open" | "closed";
    latencyP99Ms: number;
  }>;
}
```

## O — Optimizations & Trade-offs

### Scaling concerns

| Concern | Problem | Solution |
|---|---|---|
| Gateway as SPOF | All traffic flows through one cluster | Deploy in multiple AZs; use active-active with L4 load balancer in front |
| Redis rate-limit latency | Redis round-trip adds 1–2ms | Co-locate Redis in same AZ; use pipelining; local in-memory token bucket as L1 |
| JWT validation overhead | Verify RSA signature on every request | Cache validated JWTs by `jti` with TTL = token expiry; skip DB lookup |
| Hot route config reloading | Restart causes connection drops | Use config versioning with hot-reload via etcd watch; zero-downtime update |
| Upstream slow response | Slow service ties up gateway connections | Set aggressive upstream timeouts (2s); use circuit breaker with 50% failure threshold |

### Pitfalls

| Pitfall | Verdict |
|---|---|
| Putting business logic in the gateway | ❌ Gateway handles cross-cutting concerns only |
| Rate limiting only at the gateway | ❌ Also add limits inside each microservice as defence-in-depth |
| Single Redis node for rate limiting | ❌ SPOF — use Redis Cluster with 3+ shards |
| Synchronous auth service call per request | ❌ Too slow — validate JWT locally with cached public key |
| Global circuit-breaker threshold | ✅ Use per-upstream thresholds; one slow service shouldn't trip others |

> The gateway is not a microservice. It is infrastructure. Keep it thin — authentication, routing, rate limiting. Any logic beyond that belongs in a dedicated service.

See [../BuildingBlocks/load-balancers.md](../BuildingBlocks/load-balancers.md) for L4 vs L7 trade-offs and [../Scalability/rate-limiting.md](../Scalability/rate-limiting.md) for sliding-window algorithm details.

## Common Follow-up Questions

**Q: How do you handle WebSocket or gRPC traffic?**
A: WebSockets require a persistent connection — use L4 pass-through for those routes. For gRPC, terminate TLS at the gateway and proxy as HTTP/2 to upstreams. Most managed gateways (AWS API GW, Kong) support this natively.

**Q: How do you do canary deployments through the gateway?**
A: Add a weight field to RouteConfig (`canaryWeight: 10` sends 10% traffic to v2). The router uses weighted random selection. Gradually increase weight while monitoring error rates.

**Q: What if the config store (etcd) goes down?**
A: Gateway instances cache the last-known route config in memory. They continue serving traffic with stale routes. Alert ops but do not crash — availability over consistency for read traffic.

**Q: How do you prevent DDoS at the gateway layer?**
A: Combine IP-based rate limiting (sliding window in Redis) with a WAF (AWS WAF / Cloudflare) in front of the load balancer. The WAF handles volumetric attacks before they reach the gateway.

**Q: Gateway vs service mesh — when do you use each?**
A: Gateway handles north-south traffic (client → cluster). Service mesh (Istio, Linkerd) handles east-west traffic (service → service). Use both in mature microservice deployments.

**Q: How do you do blue/green deployments with an API gateway?**
A: Add a `version` field to `RouteConfig`. Route 100% traffic to `upstreamUrl-blue`. When deploying green, set `canaryWeight: 5` to send 5% to green. Monitor error rates; ramp to 100% then remove blue. The gateway config store (etcd) makes this a live change with no deployment.

**Q: How do you handle request fan-out (one client call hits 3 services)?**
A: Two options. First, an Aggregation Gateway pattern: a thin service behind the gateway calls multiple upstream services and merges responses. Second, GraphQL gateway: client specifies exactly which fields to fetch and a resolver fans out. Do not put aggregation logic in the routing gateway itself.

### Capacity Estimation (quick numbers to state in the interview)

| Metric | Estimate |
|---|---|
| Total RPS across all services | 500k |
| Gateway processing overhead per request | ~2ms (Redis + routing) |
| Gateway instances needed (at 50k RPS each) | 10 nodes |
| Redis rate-limit ops per request | 2 (INCR + EXPIRE) |
| Peak Redis IOPS | 1 million/s (well within Redis single-node limits) |
| Avg route table size | 200 routes |
| Config hot-reload frequency | Every 30 seconds |
| Audit log throughput | ~500k events/s → Kafka with 6 partitions |

State these numbers to show you understand the gateway is a thin, high-throughput layer — not a compute-heavy service. The bottleneck is almost always Redis or network, not CPU.

---
[← Back to InterviewQuestions](../README.md)
