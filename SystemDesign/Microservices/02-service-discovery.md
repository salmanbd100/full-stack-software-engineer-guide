# Service Discovery

## 💡 **Service discovery lets services find each other without hardcoded addresses.**

In a microservices system, services start, stop, and move between machines constantly. Hardcoding IP addresses breaks immediately. Service discovery solves this.

---

## The Core Problem

A service instance starts at `10.0.1.42:3001`. An hour later, Kubernetes restarts it at `10.0.2.19:3001`. Any service that hardcoded the first address now fails.

Service discovery gives services a **stable name** (`order-service`) and resolves it to the current address at call time.

---

## Client-Side vs Server-Side Discovery

These are the two architectural patterns. They differ in **who does the lookup**.

| Dimension            | Client-Side Discovery                    | Server-Side Discovery                     |
| -------------------- | ---------------------------------------- | ----------------------------------------- |
| **Who resolves?**    | The calling service                      | A load balancer or proxy                  |
| **Registry access**  | Client queries registry directly         | Load balancer queries registry            |
| **Client coupling**  | Client must know registry API            | Client just calls a stable DNS name       |
| **Load balancing**   | Client implements load balancing logic   | Load balancer handles it centrally        |
| **Examples**         | Netflix Eureka, self-built               | AWS ALB + ECS, Kubernetes DNS             |
| **Best for**         | VM-based deployments, custom stacks      | Kubernetes, managed cloud environments    |

---

## How Client-Side Discovery Works

```
Service A wants to call Service B

1. Service A → Service Registry: "Where is order-service?"
2. Service Registry → Service A: ["10.0.1.42:3001", "10.0.2.19:3001"]
3. Service A picks one (round-robin, least-connections, etc.)
4. Service A → 10.0.1.42:3001 (direct call)
```

The client holds discovery logic. This makes the client more complex but removes a network hop.

---

## How Server-Side Discovery Works

```
Service A wants to call Service B

1. Service A → Load Balancer: "order-service/api/orders"
2. Load Balancer → Service Registry: "Where are order-service instances?"
3. Service Registry → Load Balancer: [list of instances]
4. Load Balancer → picks one and forwards the request
5. Response returns through the load balancer
```

The client knows only one address — the load balancer. Kubernetes DNS uses this pattern. Every service gets a stable DNS name like `order-service.default.svc.cluster.local`.

---

## Service Registry

The registry is the source of truth for service locations. Services **register** when they start and **deregister** when they stop.

**Key registries:**
- **Consul** — popular for VM-based deployments; supports health checks and KV store
- **Kubernetes DNS** — built-in; services get DNS names automatically
- **AWS Cloud Map** — managed registry for ECS and EKS

### Health Checks

Stale entries kill reliability. The registry must know when an instance goes down.

**Two health check models:**

- **Active (pull)** — registry calls a health endpoint on the service
- **Passive (heartbeat)** — service sends periodic signals to the registry

Consul uses both. Kubernetes uses liveness and readiness probes. A service fails its health check and the registry removes it from the pool.

---

## TypeScript Example: Registering and Discovering a Service

```typescript
interface ServiceRegistration {
  name: string;
  address: string;
  port: number;
  healthCheckPath: string;
  ttl: number; // seconds until registration expires without heartbeat
}

interface ServiceInstance {
  address: string;
  port: number;
  healthy: boolean;
}

class ServiceRegistry {
  private instances = new Map<string, ServiceInstance[]>();

  register(registration: ServiceRegistration): void {
    const existing = this.instances.get(registration.name) ?? [];
    existing.push({
      address: registration.address,
      port: registration.port,
      healthy: true,
    });
    this.instances.set(registration.name, existing);
    this.scheduleHeartbeat(registration);
  }

  discover(serviceName: string): ServiceInstance[] {
    return (this.instances.get(serviceName) ?? []).filter((i) => i.healthy);
  }

  private scheduleHeartbeat(registration: ServiceRegistration): void {
    setInterval(async () => {
      const healthy = await this.checkHealth(registration);
      this.updateHealth(registration.name, registration.address, healthy);
    }, registration.ttl * 1000);
  }

  private async checkHealth(registration: ServiceRegistration): Promise<boolean> {
    const url = `http://${registration.address}:${registration.port}${registration.healthCheckPath}`;
    const response = await fetch(url);
    return response.ok;
  }

  private updateHealth(name: string, address: string, healthy: boolean): void {
    const instances = this.instances.get(name) ?? [];
    const instance = instances.find((i) => i.address === address);
    if (instance) instance.healthy = healthy;
  }
}

// Client-side load balancing on top of discovery
class ServiceClient {
  private roundRobinIndex = 0;

  constructor(private readonly registry: ServiceRegistry) {}

  getEndpoint(serviceName: string): string {
    const instances = this.registry.discover(serviceName);
    if (instances.length === 0) throw new Error(`No healthy instances for ${serviceName}`);

    const instance = instances[this.roundRobinIndex % instances.length];
    this.roundRobinIndex++;
    return `http://${instance.address}:${instance.port}`;
  }
}
```

---

## Kubernetes DNS: The Simpler Path

In Kubernetes, server-side discovery is automatic. Every `Service` object gets a DNS name.

```
order-service.default.svc.cluster.local
     ↑              ↑         ↑
  service name   namespace  cluster domain
```

Pods call `http://order-service` and kube-proxy routes to a healthy pod. No registry code needed. The registry is etcd and the DNS is CoreDNS — both managed by Kubernetes.

---

## Common Mistakes

**❌ No health checks — stale entries cause call failures**

```typescript
// Registering without a TTL or health check
registry.register({ name: "order-service", address: "10.0.1.42", port: 3001 });
// Instance dies. Registry still returns the dead address. Callers fail.
```

**✅ Always pair registration with a health check and TTL.**

---

**❌ Caching discovery results forever**

```typescript
// Discovered once at startup — stale after first deployment
const endpoint = await registry.discover("order-service")[0];
```

**✅ Cache with a short TTL (5–30 seconds). Re-query the registry periodically.**

---

## Key Insight

> Use server-side discovery in Kubernetes — DNS handles it automatically and you write no discovery code. Use client-side discovery on VMs or hybrid clouds where you need more control over routing and load balancing.

---

[← Architecture](./01-architecture.md) | [Next: API Gateway →](./03-api-gateway.md)
