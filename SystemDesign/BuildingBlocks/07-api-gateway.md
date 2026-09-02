---
title: The API Gateway Pattern
part: 6
chapter: 0
slug: api-gateway-pattern
level: intermediate
reading_time: 8
updated: 2026-09-02
tags: [system-design, microservices, api-gateway, bff]
in_book: true
---

# The API Gateway Pattern {#ch-api-gateway-pattern}

> Decide what belongs at the edge, and keep everything else out of it.

**In this chapter:** what a gateway centralises · gateway vs load balancer · gateway vs service mesh · the backend-for-frontend pattern · keeping it thin

## 💡 The Core Idea

An API gateway is the single entry point for all client traffic. Clients never call services directly — they call the gateway, and the gateway routes, authenticates and rate-limits so that twenty services do not each have to.

The pattern is a bet: cross-cutting concerns are cheaper to maintain in one place than in twenty. That bet pays off for auth, TLS, routing and limits. It stops paying the moment anything resembling business logic moves in, because the gateway is then a shared component every team must change together.

This chapter is the pattern, its boundaries, and where the cross-cutting concerns it owns belong in the stack.

## How It Works

Without a gateway, every client must know every service's address, and every service must implement auth, rate limiting and CORS. That logic duplicates across the estate and drifts.

| Concern | Without a gateway | With a gateway |
| ------- | ----------------- | -------------- |
| **Authentication** | Each service validates tokens | Gateway validates once, forwards a verified identity header |
| **Rate limiting** | Each service implements its own | Enforced at the edge, before any compute is spent |
| **TLS termination** | Each service needs a certificate | Terminated once, plain HTTP internally |
| **Routing** | Client knows every service URL | Client knows one URL |
| **Request shaping** | Every client sends its own payload shape | Normalised or transformed at the edge |
| **Audit logging** | Scattered, inconsistent | One place, one format |

Routing itself is path matching plus a forward:

```text
Client: GET /api/orders/123
    ↓
Gateway: /api/orders/* matches → strip /api → order-service
    ↓
order-service:3001 → GET /orders/123
```

**The route table is the gateway's only real state,** which is why it lives in a config store rather than in code — a new route should not need a deploy.

### Gateway vs Load Balancer

These solve different problems, and interviewers conflate them deliberately to see whether you will.

| Dimension | Load balancer | API gateway |
| --------- | ------------- | ----------- |
| **Layer** | L4 (TCP) or L7 (HTTP) | L7 only |
| **Routing** | Across instances of *one* service | Across *different* services, by path |
| **Auth** | None | JWT validation, OAuth, API keys |
| **Rate limiting** | None | Per client, per route |
| **Transformation** | None | Header injection, body transformation |
| **Examples** | AWS ALB, NGINX, HAProxy | Kong, AWS API Gateway, Envoy |

A load balancer spreads traffic across replicas. A gateway decides *which service* and *whether at all*. In practice you run both: an L4 load balancer in front of a stateless gateway cluster. See [Chapter ?? — Load Balancing](#ch-load-balancing) for the L4/L7 trade-offs.

### Gateway vs Service Mesh

| | API gateway | Service mesh |
| --- | ----------- | ------------ |
| Traffic | North–south: client → cluster | East–west: service → service |
| Deployment | A cluster at the edge | A sidecar next to every service |
| Owns | Auth, quotas, routing, TLS termination | mTLS, retries, per-hop tracing, traffic shifting |

They are complements, not alternatives. Mature microservice estates run both; a small one usually needs only the gateway.

### Where a cross-cutting concern belongs

Auth and rate limiting are the two the gateway is usually bought for, and both are enforced in more than
one place. The rule is that each layer rejects what it can reject most cheaply.

| Layer            | Rejects                                          | Cost of a rejection      |
| ---------------- | ------------------------------------------------ | ------------------------ |
| CDN or edge WAF  | Volumetric floods, known-bad IPs, obvious bots    | Nothing reaches you      |
| API gateway      | Unauthenticated requests, per-client quotas, per-route limits | One cheap L7 hop |
| Service          | Business rules — per-tenant plans, per-resource permissions | A full request |

The gateway is the authoritative control because it sees every external request and has the client
identity. It is not the *only* control: internal callers bypass it entirely, so a service that must not
be overwhelmed still needs its own limit as defence in depth. The algorithms and the atomic counter that
implement one are in [Chapter ?? — Rate Limiting](#ch-rate-limiting).

Two numbers make the gateway's limiter design real. At a million requests a second, the counter store is
the bottleneck, not the routing — so keys shard across a Redis cluster by client identifier, and each
check is one round trip on the hot path. And every new rule ships in **monitor mode** first, counting
what it *would* have rejected, because a limit tuned from guesses will reject a real customer on the day
it is enabled.

## When to Use It

| Situation | Gateway? |
| --------- | -------- |
| More than a handful of services with external clients | **Yes** — the duplication is already costing you |
| Several client types needing different payload shapes | **Yes**, and reach for BFF below |
| One service, one client | No — it is a hop that buys nothing |
| Internal service-to-service traffic only | No — that is a service mesh problem |
| You want response aggregation across services | Not in the routing gateway — put it behind one |

## Backend for Frontend

A single gateway serving a web app, a mobile app and third-party partners creates a shared bottleneck. Each client needs a different data shape, the mobile app needs smaller payloads, and the partner API needs a stable versioned interface that the web team must not be able to break.

**BFF creates one gateway per client type**, owned by the team that owns that client.

```text
Web browser    → Web BFF     → internal services
Mobile app     → Mobile BFF  → internal services
Partner API    → Partner BFF → internal services
```

```typescript
// Mobile BFF — strips fields the mobile app never renders
interface MobileOrderSummary {
  id: string;
  status: string;
  totalAmount: number;
  // No line items, no billing address, no audit history
}

async function getMobileOrder(orderId: string): Promise<MobileOrderSummary> {
  const order = await orderService.getOrder(orderId);
  return { id: order.id, status: order.status, totalAmount: order.totalAmount };
}

// Web BFF — aggregates for a detail page the desktop actually shows
async function getWebOrder(orderId: string): Promise<FullOrderDetail> {
  const order = await orderService.getOrder(orderId);
  const [user, inventory] = await Promise.all([
    userService.getUser(order.userId),
    inventoryService.getStock(order.lineItems),
  ]);
  return assembleOrderDetail(order, user, inventory);
}
```

The tradeoff is real: three BFFs mean three deploys, three sets of dependencies and three places a shared change lands. BFF earns that when client needs genuinely diverge — not when one client would like two fewer fields.

## Common Mistakes

❌ **Business logic in the gateway** — discount rules, order totals, entitlement calculations.
✅ The gateway routes and protects. Services own business logic, and own the tests for it.

❌ **One gateway for every client, with over-fetching.** Mobile downloads 5 KB objects and discards 90%.
✅ A BFF per client type, returning only what that client renders.

❌ **No timeout or circuit breaker on upstreams.** One slow service piles up gateway connections until the whole edge is unresponsive.
✅ Aggressive upstream timeouts and per-upstream circuit breakers — one slow service must not trip the others.

❌ **Rate limiting *only* at the gateway.** Internal callers bypass it entirely.
✅ Gateway limits as the authoritative control, in-service limits as defence in depth. See [Chapter ?? — Rate Limiting](#ch-rate-limiting).

❌ **Response aggregation inside the routing gateway.** Fan-out latency and partial failures now live in your most critical shared component.
✅ Put an aggregation service — or a GraphQL layer — *behind* the gateway.

## 🔑 Key Takeaways

- A gateway is worth its hop when it removes duplicated cross-cutting concerns, and stops being worth it the moment business logic moves in.
- A load balancer distributes across replicas of one service; a gateway routes between services and decides whether the request proceeds at all.
- Gateway and service mesh are complements: north–south versus east–west traffic.
- BFF is the answer when client needs diverge, and its cost is one more deployable per client type.
- Every upstream needs its own timeout and circuit breaker, or one slow service takes the whole edge down with it.

## Interview Questions

**Q: What is the difference between an API gateway and a load balancer?**

A load balancer distributes traffic across instances of one service and can work at L4 or L7. A gateway is L7 only and routes between *different* services by path, while also owning auth, rate limiting and request transformation. They compose rather than compete — an L4 load balancer usually sits in front of a stateless gateway cluster.

**Q: What should never go in the gateway?**

Anything that needs domain knowledge. Once discount rules or entitlement logic live at the edge, every team has to coordinate changes to the single most critical shared component, and the blast radius of a bad deploy becomes the whole platform. Response aggregation is the borderline case: it is legitimate, but it belongs in a service behind the gateway, not in the router itself.

**Q: When would you introduce a BFF rather than one shared gateway?**

When client needs diverge enough that one payload shape actively harms a client — mobile downloading and discarding most of a response, or a partner API needing a versioned contract the web team must not break. The cost is another deployable per client type, so I would not do it just to trim two fields; I would do it when the client teams are separate and their release cadences differ.

**Q: The gateway is now a single point of failure. What do you do about it?**

Keep it stateless so it scales horizontally, run it active-active across at least two availability zones behind an L4 load balancer, and cache the route config in memory so a config-store outage does not take the edge with it. Then per-upstream circuit breakers, so the gateway's own availability is not coupled to the least reliable service behind it.

## What to Read Next

- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the algorithms and the atomic counter behind the gateway's quota check
- [Chapter ?? — Load Balancing](#ch-load-balancing) — the layer beneath, and where L4 versus L7 actually matters
- [Chapter ?? — Resilience Patterns](#ch-resilience-patterns) — circuit breakers and timeouts, which the gateway needs on every upstream
