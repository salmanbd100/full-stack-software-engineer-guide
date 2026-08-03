# Services & Networking

Pod IPs change constantly. A Service is a stable address in front of a changing set of pods.

## Why Services Exist

```
Without a Service:                With a Service:
client ──▶ 10.0.1.5  (pod dies)   client ──▶ api-svc (stable ClusterIP + DNS)
           ✗ IP gone                              │
                                                  ├──▶ pod 10.0.1.5
                                                  ├──▶ pod 10.0.2.9
                                                  └──▶ pod 10.0.3.4
```

A Service gives you: a stable virtual IP, a DNS name, and load balancing across all **ready** pods.

> The link between Service and pods is the **label selector** — not a list of IPs. Pods matching the selector are added to an EndpointSlice when their readiness probe passes, and removed when it fails.

## Service Types

| Type | Reachable From | How It Works |
|------|---------------|--------------|
| **ClusterIP** | Inside the cluster only | Virtual IP, routed by kube-proxy (default) |
| **NodePort** | Any node's IP on a high port | Opens port 30000–32767 on **every** node |
| **LoadBalancer** | The internet / VPC | Provisions a cloud load balancer (NLB on AWS) |
| **ExternalName** | — | A DNS CNAME to an external hostname |
| **Headless** (`clusterIP: None`) | Inside cluster | No virtual IP — DNS returns pod IPs directly |

```
ClusterIP ──▶ internal only
NodePort  ──▶ builds on ClusterIP, adds a port on each node
LoadBalancer ▶ builds on NodePort, adds a cloud LB in front
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api                # matches pod labels
  ports:
    - port: 80              # the Service's port
      targetPort: 3000      # the container's port
```

**Headless Services** are for when you want the pod IPs, not load balancing:

```yaml
spec:
  clusterIP: None           # DNS returns all pod IPs
  selector: { app: postgres }
```

✅ Used with StatefulSets so clients can reach a specific member (`db-0.postgres.default.svc.cluster.local`), and by clients that do their own connection pooling or sharding.

⚠️ **NodePort is rarely the right answer in production.** It occupies a port on every node, gives you no TLS termination, and exposes an ugly high port number. Use it for local development or as the plumbing under a LoadBalancer.

## DNS in the Cluster

CoreDNS gives every Service a predictable name:

```
<service>.<namespace>.svc.cluster.local

api.production.svc.cluster.local     # fully qualified
api.production                       # from another namespace
api                                  # from within the production namespace
```

**Debugging DNS:**

```bash
kubectl run tmp --rm -it --image=nicolaka/netshoot -- bash
  nslookup api.production
  curl -v http://api.production:80/health
  dig +short api.production.svc.cluster.local
```

⚠️ **The `ndots:5` performance trap.** Kubernetes sets `ndots:5` in `/etc/resolv.conf`, so any hostname with fewer than 5 dots is first tried against every search domain. Looking up `api.example.com` generates several failed queries before the correct one. Under load this saturates CoreDNS.

✅ Fix by using a fully qualified name with a trailing dot (`api.example.com.`) for external hosts, and running **NodeLocal DNSCache** on busy clusters.

## kube-proxy and Traffic Routing

kube-proxy watches Services and EndpointSlices, then programs the node's networking to make Service IPs work.

| Mode | Behaviour | Scale |
|------|-----------|-------|
| **iptables** | Linear chain of NAT rules | Degrades past a few thousand Services |
| **IPVS** | Kernel hash table | Better at large scale |
| **eBPF** (Cilium, replaces kube-proxy) | Programmable kernel datapath | Best performance and observability |

> A Service IP is **virtual** — nothing listens on it. It exists only as routing rules on each node. This is why you cannot ping a ClusterIP but you can connect to its port.

**`externalTrafficPolicy` controls a real tradeoff:**

| Value | Behaviour |
|-------|-----------|
| `Cluster` (default) | Any node accepts traffic and forwards it, possibly to another node. Even balancing, but **source IP is lost** (SNAT) and there is an extra hop |
| `Local` | Only nodes running a pod accept traffic. **Preserves source IP**, no extra hop, but uneven balancing |

✅ Use `Local` when you need the real client IP for logging, rate limiting, or geo-based logic.

## Ingress and the AWS Load Balancer Controller

A `LoadBalancer` Service per application means one cloud load balancer per application — expensive and hard to manage. Ingress solves this with layer-7 routing behind one load balancer.

```
                    ┌──────────── ALB ────────────┐
internet ──▶ Ingress│ /api/*   → api-svc          │
                    │ /admin/* → admin-svc        │
                    │ shop.acme.com → shop-svc    │
                    └─────────────────────────────┘
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: public
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip          # route straight to pod IPs
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    # Share ONE ALB across multiple Ingress objects
    alb.ingress.kubernetes.io/group.name: public-apps
spec:
  ingressClassName: alb
  rules:
    - host: api.acme.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port: { number: 80 }
```

**Key annotations to know:**

| Annotation | Effect |
|-----------|--------|
| `target-type: ip` | ALB targets pod IPs directly — one less hop, works with Fargate |
| `target-type: instance` | ALB targets node ports — extra hop through kube-proxy |
| `group.name` | Multiple Ingress objects share one ALB — big cost saving |
| `scheme: internal` | Private ALB, VPC-only access |
| `certificate-arn` | TLS termination at the ALB using ACM |

✅ `target-type: ip` plus `group.name` is the standard production setup: fewer hops, real client IP preserved, and one ALB for many services.

**When to use which:**

| Need | Use |
|------|-----|
| HTTP routing by host/path, TLS, WAF | **Ingress → ALB** |
| Raw TCP/UDP, extreme throughput, static IP | **Service type LoadBalancer → NLB** |
| gRPC, header-based routing, traffic splitting | **Gateway API** or a service mesh |

## Gateway API

Gateway API is the successor to Ingress. Its value is separating responsibilities.

| Resource | Owned By | Defines |
|----------|----------|---------|
| **GatewayClass** | Platform team | The implementation (ALB, Envoy…) |
| **Gateway** | Platform team | The listener: ports, TLS, hostnames |
| **HTTPRoute** | App team | Routing rules, in their own namespace |

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-canary
spec:
  parentRefs: [{ name: public-gateway }]
  rules:
    - matches: [{ path: { type: PathPrefix, value: /api } }]
      backendRefs:
        - { name: api-v1, port: 80, weight: 90 }   # traffic splitting is
        - { name: api-v2, port: 80, weight: 10 }   # built in, no annotations
```

✅ Gateway API replaces vendor-specific annotations with real API fields, and supports weighted traffic splitting natively — which is what canary deployments need.

## NetworkPolicy

**By default, every pod can talk to every other pod in the cluster.** NetworkPolicy is how you stop that.

```yaml
# Step 1: default deny all ingress in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}                  # every pod in the namespace
  policyTypes: [Ingress]
---
# Step 2: allow only what is needed
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: production
spec:
  podSelector:
    matchLabels: { app: api }
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - podSelector: { matchLabels: { app: web } }
        - namespaceSelector: { matchLabels: { name: ingress } }
      ports: [{ protocol: TCP, port: 3000 }]
  egress:
    - to: [{ podSelector: { matchLabels: { app: postgres } } }]
      ports: [{ protocol: TCP, port: 5432 }]
    # DNS must be allowed explicitly once egress rules exist
    - to: [{ namespaceSelector: { matchLabels: { name: kube-system } } }]
      ports: [{ protocol: UDP, port: 53 }]
```

**Rules to remember:**

| Rule | Detail |
|------|--------|
| Policies are **additive allow** rules | No deny rules; union of all matching policies |
| No policy selects a pod | All traffic allowed |
| Any policy selects a pod | Only explicitly allowed traffic passes |
| Applied at pod level | Not namespace level, despite `namespaceSelector` |

⚠️ **The #1 NetworkPolicy mistake:** adding an egress policy without allowing UDP 53 to kube-system. Every DNS lookup fails and the app appears to hang rather than error.

⚠️ **On EKS, NetworkPolicy requires enforcement support.** The AWS VPC CNI supports it in recent versions (enable `enableNetworkPolicy`); older setups silently ignore policies, giving you false confidence. Cilium is the alternative with richer policy features.

## Service Mesh — When It's Worth It

A mesh injects a sidecar proxy into every pod, taking over pod-to-pod traffic.

**What it gives you:**

| Capability | Benefit |
|-----------|---------|
| **mTLS everywhere** | Encrypted, authenticated service-to-service traffic |
| **Traffic splitting** | Canary by percentage, without touching app code |
| **Retries, timeouts, circuit breaking** | Resilience as configuration |
| **Golden-signal metrics for free** | Per-service latency, error rate, throughput |

**The cost:** a proxy per pod (CPU, memory, latency), a big new control plane to operate, and much harder debugging.

| Situation | Recommendation |
|-----------|---------------|
| Under ~10 services | ❌ Not worth it — use libraries and NetworkPolicy |
| Compliance requires mTLS everywhere | ✅ Strong case |
| Dozens of services, many teams | ✅ Consistent policy beats per-app libraries |
| You only need canary deploys | Use Gateway API or Argo Rollouts instead |

> Options: Istio (most features), Linkerd (simplest), Cilium (eBPF, no sidecar), AWS App Mesh.

## Debugging Connectivity

Work outward from the pod.

```bash
# 1. Is the pod actually Ready? (not Ready = not in endpoints)
kubectl get pods -l app=api

# 2. Does the Service have endpoints? Empty = selector mismatch
kubectl get endpointslices -l kubernetes.io/service-name=api

# 3. Can you reach the pod directly, bypassing the Service?
kubectl exec -it debug -- curl 10.0.1.5:3000/health

# 4. Does DNS resolve?
kubectl exec -it debug -- nslookup api.production

# 5. Is a NetworkPolicy blocking it?
kubectl get networkpolicy -n production
```

| Symptom | Most Likely Cause |
|---------|------------------|
| Service has no endpoints | Selector doesn't match pod labels, or readiness failing |
| DNS fails | CoreDNS down, or egress NetworkPolicy blocking UDP 53 |
| Pod IP works, Service IP doesn't | kube-proxy problem, or wrong `targetPort` |
| Intermittent failures | One unhealthy pod still in endpoints — check readiness |
| ALB returns 503 | Target group unhealthy — check the ALB health check path |

## Interview Q&A

**Q: Explain the Kubernetes Service types and when you'd use each.**

ClusterIP is the default and gives a stable internal virtual IP with DNS, used for all service-to-service traffic. NodePort opens the same port on every node and is mostly plumbing or local development — in production it means no TLS termination and an awkward high port. LoadBalancer provisions a cloud load balancer, an NLB on AWS, which is right for raw TCP or UDP workloads and when you need a static IP. Headless, meaning `clusterIP: None`, skips load balancing entirely and returns pod IPs from DNS, which is what StatefulSet clients need to address a specific member. For HTTP workloads I would generally not use a LoadBalancer Service per app, but an Ingress or Gateway routing through one shared ALB.

**Q: What is the difference between a Service and an Ingress?**

A Service works at layer 4 and provides a stable address plus load balancing for a set of pods, selected by labels. An Ingress works at layer 7 and routes HTTP by hostname and path to different Services behind a single entry point, and it handles TLS termination. They compose rather than compete: the Ingress controller resolves rules to backend Services. The practical reason to use Ingress is cost and manageability — one ALB serving many applications instead of one load balancer per Service, plus centralized certificates and WAF.

**Q: By default, can any pod talk to any other pod? How do you restrict that?**

Yes — the Kubernetes network model requires a flat network where every pod can reach every other pod without NAT, and namespaces do not change that. To restrict it you use NetworkPolicy, which is enforced by the CNI plugin. The standard approach is a default-deny policy selecting all pods in a namespace, then narrow allow policies granting only the specific pod-to-pod paths each service needs. Two gotchas matter in interviews: policies are purely additive allow rules with no deny concept, so a pod is unrestricted until some policy selects it; and once you add any egress rule you must explicitly allow UDP 53 to kube-system or all DNS breaks, which usually presents as the application hanging rather than returning an error. On EKS you also need to confirm the CNI actually enforces policies, because older VPC CNI versions ignore them silently.

**Q: What does `externalTrafficPolicy: Local` do and why would you set it?**

With the default `Cluster` policy, any node accepts external traffic for a Service and may forward it to a pod on a different node. That balances traffic evenly but adds a network hop and applies source NAT, so the application sees a node IP instead of the real client IP. Setting `Local` means only nodes actually running a pod for that Service accept the traffic, which removes the extra hop and preserves the client source IP. The tradeoff is uneven load distribution, since nodes with more pods receive proportionally the same share of traffic as nodes with one. You choose `Local` when you need genuine client IPs for audit logging, rate limiting, or geographic routing.

**Q: A Service returns connection refused but the pods are running. How do you debug it?**

I check outward from the pod. First, are the pods actually `Ready` — a running pod failing its readiness probe is deliberately excluded from the Service. Second, does the Service have endpoints at all: an empty EndpointSlice almost always means the Service's label selector does not match the pod labels, which is the single most common cause. Third, I connect to the pod IP and port directly from a debug pod, which tells me whether the problem is the application or the Service layer. If the pod IP works but the Service IP does not, the usual suspects are a wrong `targetPort` or a kube-proxy issue on that node. Then I verify DNS resolution and finally check whether a NetworkPolicy is silently dropping the traffic.

---

[← Pods & Deployments](./03-pods-deployments.md) | [ConfigMaps & Secrets →](./05-configmaps-secrets.md)
