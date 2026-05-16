# Load Balancing

## 💡 **Concept**

A load balancer distributes incoming traffic across multiple backend servers. It removes single points of failure and enables horizontal scaling beyond what one machine can handle.

**Use load balancing when:** traffic exceeds ~10k req/sec on a single server, or you need 99.9%+ availability.

---

## How It Works

```
Client
  │
  ▼
┌──────────────────┐
│   Load Balancer  │  ← health checks every 5–30s
└────────┬─────────┘
         │
   ┌─────┼─────┐
   ▼     ▼     ▼
Server1 Server2 Server3 (failed → removed from pool)
```

**Request flow:**
1. Client hits load balancer's public IP.
2. LB picks a healthy server using the routing algorithm.
3. Request is forwarded; response returns through LB (or direct via DSR).
4. If server fails health check, LB stops sending it traffic.

---

## Layer 4 vs Layer 7

| Feature | Layer 4 (Transport) | Layer 7 (Application) |
|---|---|---|
| **Operates on** | TCP/UDP packets | HTTP headers, URL, cookies |
| **Routing logic** | IP + port only | Path, hostname, content |
| **Latency** | Lower (~0.5ms) | Slightly higher (~1–2ms) |
| **SSL termination** | No | Yes |
| **Use case** | Raw TCP, low-latency | HTTP APIs, microservices |
| **Example** | AWS NLB | AWS ALB, Nginx |

---

## Routing Algorithms

| Algorithm | How it works | Best for |
|---|---|---|
| **Round-robin** | Next server in rotation | Equal capacity, stateless APIs |
| **Weighted round-robin** | More requests to higher-weight servers | Mixed instance sizes |
| **Least connections** | Route to server with fewest active connections | Variable request duration |
| **IP hash** | Same client IP → same server | Stateful apps (soft sessions) |
| **Random** | Random server selection | Simple, equal capacity |

```typescript
interface Server {
  url: string;
  weight: number;
  activeConnections: number;
  healthy: boolean;
}

function weightedRoundRobin(servers: Server[]): Server | null {
  const healthy = servers.filter(s => s.healthy);
  if (healthy.length === 0) return null;

  // Build weighted pool
  const pool: Server[] = healthy.flatMap(s =>
    Array(s.weight).fill(s)
  );

  return pool[Math.floor(Math.random() * pool.length)];
}

function leastConnections(servers: Server[]): Server | null {
  const healthy = servers.filter(s => s.healthy);
  if (healthy.length === 0) return null;

  return healthy.reduce((min, s) =>
    s.activeConnections < min.activeConnections ? s : min
  );
}
```

---

## Health Checks

A health check periodically probes each server. A server is removed from rotation when it fails N consecutive checks and re-added after M successes.

```typescript
interface HealthCheckConfig {
  path: string;           // e.g. "/health"
  intervalMs: number;     // e.g. 10000 (10s)
  timeoutMs: number;      // e.g. 2000
  unhealthyThreshold: number; // consecutive failures before removal
  healthyThreshold: number;   // consecutive successes before re-add
}

async function checkServer(
  server: Server,
  config: HealthCheckConfig
): Promise<boolean> {
  try {
    const res = await fetch(`${server.url}${config.path}`, {
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

**Health endpoint should check dependencies:**

```typescript
// app.get("/health") — check DB + cache, not just HTTP 200
async function healthHandler(): Promise<{ status: string }> {
  await db.query("SELECT 1");
  await cache.ping();
  return { status: "ok" };
}
```

---

## Load Balancer vs API Gateway

| | Load Balancer | API Gateway |
|---|---|---|
| **Primary job** | Traffic distribution | API management |
| **Features** | Health checks, SSL termination | Auth, rate limiting, request transforms |
| **Latency overhead** | < 1ms | 10–50ms |
| **Use for** | Internal service-to-service | External client-facing APIs |

> Use a load balancer for microservice-to-microservice traffic. Put an API gateway in front of client-facing endpoints.

---

## When to Use

| Scenario | Recommendation |
|---|---|
| > 10k req/sec on one server | Add LB + second server immediately |
| Need 99.9%+ uptime | LB removes failed servers automatically |
| Zero-downtime deploys | Rolling update: drain old, add new |
| Long-lived connections (WebSocket) | Least-connections algorithm |
| Stateful session required | IP hash or move sessions to Redis |

---

## Common Mistakes

❌ **Storing sessions on app servers** — When LB routes the next request to a different server, session is lost. Use Redis or JWT instead.

❌ **IP hash for mobile users** — Mobile IPs change frequently (WiFi ↔ cellular). Use Redis-backed sessions instead.

❌ **Round-robin for WebSockets** — Long-lived connections create uneven load. Use least-connections.

❌ **Health check only verifies HTTP 200** — A server can return 200 while the database is down. Check critical dependencies.

✅ **Enable connection draining** — Give in-flight requests 30s to complete before removing a server.

---

## Real-World Example

An e-commerce checkout service runs 5 Node.js instances behind an ALB. During a flash sale, traffic spikes from 5k to 80k req/sec. Auto-scaling adds 15 more instances; the LB detects them via health checks and starts routing within 30 seconds. One instance crashes mid-sale — LB marks it unhealthy after 3 failed checks and reroutes its traffic. Zero customer impact.

---

## Key Insight

> The load balancer is only as resilient as your health check. A shallow check (HTTP 200) that misses a broken database gives you false confidence. A deep check adds 10ms per interval — worth it.

**Related:** [Horizontal Scaling](../Scalability/01-horizontal-scaling.md) · [API Gateway](../Microservices/03-api-gateway.md)

---

[← Back to SystemDesign](../README.md)
