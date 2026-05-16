# Deployment Strategies

## 💡 **The deployment strategy you choose determines how much risk each release carries.**

Microservices let you deploy one service without touching others. But "independently deployable" still means you need a strategy for rolling out changes safely.

---

## The Three Strategies

| Strategy        | How It Works                                    | Rollback Speed | Risk Level | Traffic Shift         |
| --------------- | ----------------------------------------------- | -------------- | ---------- | --------------------- |
| **Blue-Green**  | Run old + new in parallel, cut all traffic at once | Instant        | Medium     | 0% → 100% at once     |
| **Canary**      | Route a small % of traffic to new version       | Fast           | Low        | 1% → 5% → 50% → 100% |
| **Rolling**     | Replace old instances one at a time             | Slow           | Medium     | Gradual, instance by instance |

---

## Blue-Green Deployment

Two identical environments run in parallel. **Blue** is production. **Green** is the new version.

```
Load Balancer
    |
    ├── Blue (v1)  ← currently serving 100% of traffic
    └── Green (v2) ← new version deployed, tested, standing by
```

When you're ready, the load balancer switches all traffic from Blue to Green. If Green fails, switch back to Blue in seconds.

**When to use:**
- ✅ You need instant rollback with zero downtime
- ✅ Database migrations are backward compatible
- ✅ You have budget to run double infrastructure briefly

**When not to use:**
- ❌ Database migrations change schema in a breaking way — both environments share the database
- ❌ The service holds stateful connections (sockets, streams) that break on cutover

---

## Canary Deployment

Route a small percentage of real traffic to the new version. Watch metrics. Gradually increase traffic if healthy.

```
Load Balancer
    ├── v1 instances (95% of traffic) ← stable
    └── v2 instances (5% of traffic)  ← canary

Wait 15 minutes. Error rate normal? Increase to 20%.
Wait 15 minutes. Error rate normal? Increase to 50%.
Wait 15 minutes. Error rate normal? Promote to 100%.
```

```typescript
interface CanaryConfig {
  stableVersion: string;       // "v1.4.2"
  canaryVersion: string;       // "v1.4.3"
  canaryWeightPercent: number; // 5 — route 5% to canary
  promotionThresholds: {
    errorRatePercent: number;  // abort if error rate exceeds this
    latencyP99Ms: number;      // abort if p99 latency exceeds this
  };
}

function shouldRouteToCanary(config: CanaryConfig): boolean {
  return Math.random() * 100 < config.canaryWeightPercent;
}

// Kubernetes does this natively with two Deployments and adjusted replica counts:
// v1 Deployment: 19 replicas (95%)
// v2 Deployment:  1 replica  (5%)
```

**When to use:**
- ✅ You want to test with real traffic before full rollout
- ✅ You can monitor error rates and latency per version
- ✅ Your team has a clear promotion and abort criteria

---

## Rolling Deployment

Replace old instances one at a time. No parallel environment needed.

```
Start:     [v1] [v1] [v1] [v1]
Step 1:    [v2] [v1] [v1] [v1]
Step 2:    [v2] [v2] [v1] [v1]
Step 3:    [v2] [v2] [v2] [v1]
Step 4:    [v2] [v2] [v2] [v2]
```

Both versions serve traffic simultaneously during the rollout. API must be **backward compatible** during this window.

**When to use:**
- ✅ Low-cost — no extra infrastructure
- ✅ Simple services where backward compatibility is guaranteed
- ✅ You want Kubernetes to handle it automatically (the default)

**When not to use:**
- ❌ Breaking API changes — old and new run together during rollout
- ❌ You need fast rollback — rolling back means rolling forward through all instances again

---

## Kubernetes Deployment Configuration

Kubernetes' default strategy is rolling. Canary requires two `Deployment` objects.

```yaml
# Rolling deployment — Kubernetes default
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1   # at most 1 pod down at a time
      maxSurge: 1         # at most 1 extra pod during rollout
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v1-4-3
    spec:
      containers:
        - name: order-service
          image: registry.example.com/order-service:1.4.3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 10
```

The `readinessProbe` is critical. Kubernetes only routes traffic to a pod after it passes the readiness check. This prevents the new version from receiving traffic before it is warm.

### Canary with Two Deployments

```yaml
# Stable — 19 replicas (95% traffic)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-stable
spec:
  replicas: 19
  template:
    metadata:
      labels:
        app: order-service
        track: stable
---
# Canary — 1 replica (5% traffic)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-canary
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: order-service
        track: canary
```

One `Service` selects `app: order-service` — both deployments match. Kubernetes distributes requests proportionally to replica counts.

---

## Common Mistakes

**❌ No readiness probe — pods receive traffic before they are ready**

A pod starts, Kubernetes routes traffic immediately. The app takes 10 seconds to load config. First 10 seconds of requests fail.

**✅ Always define a readiness probe. Traffic only arrives after the probe passes.**

---

**❌ Breaking API changes in a rolling deployment**

Old pods (v1) and new pods (v2) run simultaneously. v2 removes a field that v1 clients expect. Old clients hitting v2 pods break.

**✅ Apply the expand-contract pattern. Add the new field first. Remove the old field in a later release once all clients are updated.**

---

## Key Insight

> Use canary when you need gradual rollout with quick rollback. Use blue-green when you need instant cutover and can run double infrastructure. Use rolling when cost matters and your API is backward compatible.

---

[← Data Management](./05-data-management.md) | [Next: Monitoring →](./07-monitoring.md)
