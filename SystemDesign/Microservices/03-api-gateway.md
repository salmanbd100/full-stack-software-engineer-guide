# API Gateway Pattern

## 💡 **An API gateway is the single entry point for all client traffic.**

Clients never call services directly. They call the gateway. The gateway routes, authenticates, rate-limits, and transforms — so services don't have to.

---

## What an API Gateway Does

Without a gateway, every client must know every service's address. Every service must implement auth, rate limiting, and CORS. Logic duplicates across 20 services.

The gateway centralizes cross-cutting concerns:

| Concern              | Without Gateway                        | With Gateway                        |
| -------------------- | -------------------------------------- | ----------------------------------- |
| **Authentication**   | Each service validates tokens          | Gateway validates once, forwards    |
| **Rate limiting**    | Each service implements its own        | Gateway enforces at the edge        |
| **SSL termination**  | Each service needs a cert              | Gateway terminates TLS              |
| **Routing**          | Client knows all service URLs          | Client calls one URL                |
| **Request shaping**  | Client sends different payloads        | Gateway normalizes or transforms    |
| **Logging**          | Scattered across services              | Centralized in gateway              |

---

## API Gateway vs Load Balancer

These solve different problems. Interviewers often conflate them.

| Dimension             | Load Balancer                        | API Gateway                              |
| --------------------- | ------------------------------------ | ---------------------------------------- |
| **Layer**             | Layer 4 (TCP) or Layer 7 (HTTP)      | Layer 7 (HTTP) only                      |
| **Routing**           | Distributes to instances of one svc  | Routes to different services by path     |
| **Auth**              | None                                 | JWT validation, OAuth, API keys          |
| **Rate limiting**     | None                                 | Per-client, per-route limits             |
| **Request transform** | None                                 | Header injection, body transformation    |
| **Examples**          | AWS ALB, NGINX, HAProxy              | Kong, AWS API GW, Nginx + Lua, Envoy     |

Use a **load balancer** inside your cluster to spread traffic across instances of one service. Use an **API gateway** at the edge to route and protect traffic from external clients.

---

## How Routing Works

The gateway inspects the request path (and sometimes headers) to pick the upstream service.

```
Client: GET /api/orders/123
    ↓
Gateway: path matches /api/orders/* → forward to order-service
    ↓
order-service:3001 → GET /orders/123
```

```typescript
interface RouteConfig {
  path: string;
  upstream: string;
  stripPrefix?: string;        // remove /api prefix before forwarding
  authRequired?: boolean;
  rateLimit?: RateLimitConfig;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
}

const routes: RouteConfig[] = [
  {
    path: "/api/orders",
    upstream: "http://order-service:3001",
    stripPrefix: "/api",
    authRequired: true,
    rateLimit: { requestsPerMinute: 100, burstSize: 20 },
  },
  {
    path: "/api/products",
    upstream: "http://product-service:3002",
    stripPrefix: "/api",
    authRequired: false,
    rateLimit: { requestsPerMinute: 500, burstSize: 100 },
  },
  {
    path: "/api/users",
    upstream: "http://user-service:3003",
    stripPrefix: "/api",
    authRequired: true,
    rateLimit: { requestsPerMinute: 60, burstSize: 10 },
  },
];

async function routeRequest(
  path: string,
  headers: Record<string, string>
): Promise<string> {
  const route = routes.find((r) => path.startsWith(r.path));
  if (!route) throw new Error("404 No route matched");

  if (route.authRequired) {
    validateToken(headers["authorization"]);
  }

  const forwardPath = route.stripPrefix
    ? path.replace(route.stripPrefix, "")
    : path;

  return `${route.upstream}${forwardPath}`;
}

function validateToken(authHeader: string | undefined): void {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("401 Unauthorized");
  }
  // JWT verification happens here — services receive a verified identity header
}
```

---

## Backend for Frontend (BFF) Pattern

A single gateway serving a web app, mobile app, and third-party API partners creates problems. Each client needs different data shapes. The mobile app needs smaller payloads. The partner API needs a stable versioned interface.

**BFF** creates one gateway per client type.

```
Web Browser      → Web BFF        → internal services
Mobile App       → Mobile BFF     → internal services
Partner API      → Partner BFF    → internal services
```

Each BFF is a thin layer. It aggregates calls, transforms responses, and applies client-specific rate limits. Teams that own the client own the BFF.

```typescript
// Mobile BFF — strips fields the mobile app doesn't render
interface MobileOrderSummary {
  id: string;
  status: string;
  totalAmount: number;
  // No line items, no billing address, no audit history
}

async function getMobileOrder(orderId: string): Promise<MobileOrderSummary> {
  const fullOrder = await orderService.getOrder(orderId);
  return {
    id: fullOrder.id,
    status: fullOrder.status,
    totalAmount: fullOrder.totalAmount,
  };
}

// Web BFF — includes full detail for desktop rendering
async function getWebOrder(orderId: string): Promise<FullOrderDetail> {
  const [order, user, inventory] = await Promise.all([
    orderService.getOrder(orderId),
    userService.getUser(order.userId),
    inventoryService.getStock(order.lineItems),
  ]);
  return assembleOrderDetail(order, user, inventory);
}
```

---

## Common Mistakes

**❌ Putting business logic in the gateway**

```typescript
// Gateway calculating order totals — wrong layer
if (order.lineItems.length > 10 && user.tier === "premium") {
  order.discount = 0.15;
}
```

**✅ The gateway routes and protects. Services contain business logic.**

---

**❌ A single gateway for all clients with over-fetching**

Mobile clients download full order objects (5 KB each) and discard 90% of the data. Battery and bandwidth suffer.

**✅ Use a BFF per client type. Return only what each client needs.**

---

**❌ No circuit breaking at the gateway level**

One slow upstream service causes gateway threads to pile up. The entire gateway becomes unresponsive.

**✅ Set short upstream timeouts at the gateway. Fail fast, return a degraded response.**

---

## Key Insight

> Use a gateway when multiple clients need different data shapes, or when you want to keep cross-cutting concerns (auth, rate limiting, SSL) out of individual services. Use BFF when client needs diverge significantly — one BFF per client type, owned by the client team.

---

[← Service Discovery](./02-service-discovery.md) | [Next: Communication →](./04-communication.md)
