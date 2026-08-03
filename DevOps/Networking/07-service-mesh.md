# Service Mesh

A service mesh moves retries, timeouts, mTLS, and traffic routing out of your application and into infrastructure. The most important interview skill here is knowing when **not** to use one.

## The Problem It Solves

In a microservices system, every service needs the same set of concerns:

```
retries · timeouts · circuit breaking · mTLS · tracing headers
        · load balancing · rate limiting · access control
```

❌ **Without a mesh — every service reimplements them:**

```
Node service  → axios-retry, custom circuit breaker
Java service  → Resilience4j, different defaults
Go service    → hand-rolled, no circuit breaker at all
Python service→ nothing, because nobody had time
```

Inconsistent behaviour, no central policy, and a new language means starting again.

✅ **With a mesh — a sidecar proxy handles it uniformly:**

```
┌─────────────────────────┐      ┌─────────────────────────┐
│ Pod                     │      │ Pod                     │
│  ┌──────┐   ┌────────┐  │ mTLS │  ┌────────┐   ┌──────┐  │
│  │ app  │──►│ proxy  │──┼──────┼─►│ proxy  │──►│ app  │  │
│  └──────┘   └────────┘  │      │  └────────┘   └──────┘  │
└─────────────────────────┘      └─────────────────────────┘
        data plane                      data plane
                    ▲              ▲
                    └──────┬───────┘
                    ┌──────────────┐
                    │ control plane│  policy, certificates, config
                    └──────────────┘
```

The application makes a plain HTTP call to `http://payments`. The proxy adds mTLS, retries, timeouts, and tracing.

| Plane | Job |
|-------|-----|
| **Data plane** | The proxies (Envoy) carrying actual traffic |
| **Control plane** | Distributes configuration and certificates; carries no traffic |

## What You Get

| Capability | Value |
|-----------|-------|
| **Automatic mTLS** | ✅ Every service-to-service call encrypted and authenticated, no app changes |
| **Traffic splitting** | Canary by percentage, or by header |
| **Retries and timeouts** | Consistent policy, centrally configured |
| **Circuit breaking** | Eject failing instances automatically |
| **Golden signal metrics** | ✅ Latency, traffic, errors for every service, free |
| **Authorisation policy** | "Only the checkout service may call payments" |
| **Fault injection** | Deliberately inject latency and errors for testing |

> ✅ **Automatic mTLS is the strongest single argument for a mesh.** Achieving encrypted, mutually authenticated service-to-service traffic without touching application code is genuinely hard any other way.

## Traffic Management

```yaml
# Istio: 95/5 canary split
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payments
spec:
  hosts: [payments]
  http:
    # Header-based routing first — internal testers get v2
    - match:
        - headers:
            x-canary: { exact: "true" }
      route:
        - destination: { host: payments, subset: v2 }

    # Everyone else: weighted split
    - route:
        - destination: { host: payments, subset: v1 }
          weight: 95
        - destination: { host: payments, subset: v2 }
          weight: 5
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure
      timeout: 10s
```

```yaml
# Circuit breaking — eject hosts that keep failing
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payments
spec:
  host: payments
  trafficPolicy:
    connectionPool:
      tcp: { maxConnections: 100 }
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50    # ✅ never eject more than half
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }
```

⚠️ **`maxEjectionPercent` matters.** Without a cap, a widespread problem ejects every instance and you have taken your own service down.

🔴 **Retries can amplify an outage.** Three retries per hop across four hops is up to 81 requests for one user action. Set retry budgets, and never retry non-idempotent operations.

## mTLS and Authorization

```yaml
# Require mTLS mesh-wide
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT       # ✅ reject any plaintext traffic
```

```yaml
# Zero-trust: default deny, then explicit allows
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}               # empty spec = deny everything
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payments-callers
  namespace: production
spec:
  selector:
    matchLabels: { app: payments }
  rules:
    - from:
        - source:
            # ✅ Cryptographic identity, not an IP address
            principals: ["cluster.local/ns/production/sa/checkout"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/v1/charge"]
```

✅ **This is identity-based access control, not network-based.** The `principal` is derived from the workload's certificate, so it cannot be spoofed by taking over an IP address — which is a meaningfully stronger property than a NetworkPolicy.

⚠️ Adopt `STRICT` mTLS gradually. Start in `PERMISSIVE` mode, which accepts both plaintext and mTLS, confirm every workload has a sidecar, then switch. Going straight to `STRICT` breaks anything not yet in the mesh.

## Istio vs App Mesh vs Linkerd

| | Istio | AWS App Mesh | Linkerd |
|---|---|---|---|
| **Proxy** | Envoy | Envoy | Linkerd2-proxy (Rust) |
| **Complexity** | 🔴 High | Moderate | ✅ Low |
| **Features** | ✅ Most complete | Fewer | Deliberately minimal |
| **Resource cost** | Higher | Moderate | ✅ Lowest |
| **AWS integration** | Via add-ons | ✅ Native, ECS + EKS | EKS only |
| **Ambient mode** | ✅ Sidecar-free option | No | No |
| **Best for** | Complex requirements | ECS and EKS mixed estates | mTLS and metrics, minimal weight |

⚠️ **AWS announced App Mesh is being discontinued**, with migration guidance toward Istio or Amazon VPC Lattice. Know it exists and know it is not the choice for new work.

✅ **Istio's ambient mode is significant.** It replaces per-pod sidecars with a per-node proxy for layer 4 plus an optional per-namespace proxy for layer 7, cutting resource overhead substantially and removing the sidecar injection and startup-ordering problems.

## The Real Costs

🔴 **Interviewers respect candidates who lead with the downsides.**

| Cost | Detail |
|------|--------|
| **Latency** | Two extra proxy hops per call — typically 2–5 ms added |
| **Resources** | A sidecar per pod: ~100 MB memory, ~0.1 vCPU. At 500 pods that is real money |
| **Operational complexity** | Envoy config, control plane upgrades, certificate rotation |
| **Debugging** | 🔴 An extra hop where things can fail, with unfamiliar error codes |
| **Startup ordering** | The app may start before the sidecar is ready and fail its first calls |
| **Skills** | Someone must genuinely understand Envoy when it misbehaves |

**Envoy response flags you will need to recognise:**

| Flag | Meaning |
|------|---------|
| `UF` | Upstream connection failure |
| `UO` | 🔴 Upstream overflow — circuit breaker tripped |
| `UT` | Upstream timeout |
| `NR` | 🔴 No route configured — usually a VirtualService mistake |
| `RBAC` | Denied by AuthorizationPolicy |

```bash
# Is the config actually what you think it is?
istioctl proxy-status
istioctl proxy-config routes deploy/checkout
istioctl analyze -n production

# Proxy-level metrics
kubectl exec deploy/checkout -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_rq_retry
```

## Do You Actually Need One?

**You probably do not need a mesh if:**

| Situation | Simpler answer |
|-----------|---------------|
| Fewer than ~10 services | Library-level retries; a mesh is more work than it saves |
| One language across the estate | A shared internal library gives consistency |
| Encryption in transit is the only need | Application TLS, or terminate at the ALB |
| You want traffic splitting | ALB weighted target groups, or Argo Rollouts |
| You want golden-signal metrics | Prometheus with an application library |
| You want network segmentation | ✅ Kubernetes NetworkPolicy |

**You probably do need one if:**

- ✅ Dozens of services in three or more languages
- ✅ mTLS everywhere is a compliance requirement
- ✅ You need per-service authorisation policy by workload identity
- ✅ You want fine-grained canary and traffic-shifting as a platform capability
- ✅ You have a platform team that can own it

> 🔴 **The most honest answer to "should we adopt a service mesh?" is usually "not yet".** A mesh is a platform-team commitment, not a feature you switch on. Adopting one without dedicated ownership means every incident now has an extra unfamiliar layer.

**Lighter alternatives worth naming:**

| Need | Lighter option |
|------|---------------|
| Network segmentation | Kubernetes NetworkPolicy |
| Progressive delivery | Argo Rollouts, Flagger |
| mTLS between a few services | cert-manager + application TLS |
| Cross-VPC service connectivity | ✅ Amazon VPC Lattice |
| Ingress traffic management | Gateway API, ALB Ingress Controller |

✨ **Amazon VPC Lattice** is worth knowing: it provides service-to-service connectivity, authentication, and observability across VPCs and accounts without sidecars, sitting somewhere between a load balancer and a mesh.

## Interview Q&A

**Q: What is a service mesh and what problem does it solve?**

It moves cross-cutting network concerns out of application code into infrastructure. In a microservices estate every service needs retries, timeouts, circuit breaking, mutual TLS, load balancing, and trace header propagation, and without a mesh each service implements those itself — differently per language, with different defaults, and sometimes not at all. A mesh puts a proxy alongside each workload; the application makes a plain HTTP call and the proxy adds encryption, retry policy, and telemetry. Architecturally it splits into a data plane of proxies carrying real traffic and a control plane distributing configuration and certificates. The single strongest benefit is automatic mutual TLS, because achieving encrypted and mutually authenticated service-to-service traffic without modifying applications is genuinely difficult any other way, and you get golden-signal metrics for every service as a side effect.

**Q: What are the costs of running a service mesh?**

Latency, resources, and complexity. Every call traverses two extra proxies, adding a few milliseconds, which matters on a deep call chain. Each sidecar consumes roughly a hundred megabytes of memory and a fraction of a CPU, so at several hundred pods you are paying for a meaningful amount of infrastructure to run proxies. The largest cost is operational: someone has to understand Envoy configuration, manage control plane upgrades, handle certificate rotation, and debug an entirely new failure surface. Incidents get harder, because there is now an extra hop that can fail and the errors arrive as Envoy response flags like `UO` for a tripped circuit breaker or `NR` for a missing route, which are unfamiliar to most engineers. There is also a startup-ordering problem where an application can begin making calls before its sidecar is ready. Istio's ambient mode reduces the resource and sidecar-lifecycle costs considerably by using per-node proxies instead.

**Q: When would you tell a team not to adopt a service mesh?**

Most of the time, and particularly when they cannot name who will own it. If there are fewer than about ten services, the mesh is more operational work than the problem it solves. If everything is one language, a shared internal library gives you consistent retries and timeouts far more cheaply. If the actual requirement is encryption in transit, application-level TLS or terminating at the load balancer is simpler. If it is traffic splitting for canaries, weighted target groups on an ALB or Argo Rollouts does that without a mesh. If it is network segmentation, Kubernetes NetworkPolicy is the right tool. The pattern I would push back on is adopting a mesh for one feature — usually canary deployments — and inheriting the entire operational surface for it. A mesh is a platform commitment, so without a team that can genuinely own Envoy, it makes every future incident harder.

**Q: How does mesh authorisation differ from a Kubernetes NetworkPolicy?**

NetworkPolicy operates at layers 3 and 4 using pod selectors and IP ranges, so it can express "pods labelled app=checkout may reach pods labelled app=payments on port 8080". A mesh authorisation policy operates on cryptographic workload identity derived from the mTLS certificate, so it expresses "the service account production/checkout may send POST requests to /v1/charge on payments". Two things are stronger there. First, the identity cannot be spoofed by taking over an IP or a pod label, because it is proven by a certificate. Second, it is layer 7, so you can restrict specific HTTP methods and paths rather than whole ports. They compose well rather than competing: NetworkPolicy as a coarse network-level boundary that holds even if the mesh is misconfigured, and mesh policy for fine-grained identity-based rules. For most teams, NetworkPolicy alone is sufficient and much cheaper.

**Q: Retries in a mesh sound like a free win. What is the risk?**

Retry amplification during an outage. If each hop retries three times and a request traverses four services, one user action can become up to eighty-one requests to the deepest service. So the moment a downstream dependency starts to struggle, the mesh multiplies the load on it, which is precisely the wrong response and can convert a partial degradation into a total collapse. The mitigations are retry budgets, which cap retries as a percentage of total traffic rather than allowing a fixed count per request, combining retries with circuit breaking so a consistently failing host is ejected rather than retried, and keeping the retry count low at inner layers. There is also a correctness dimension: retries must only apply to idempotent operations, so retrying a GET is fine while retrying a POST that charges a card is not — which is why `retryOn` conditions should be limited to connect failures and resets rather than blanket 5xx.

**Q: Which mesh would you choose today?**

Istio for a complex estate, and I would use ambient mode rather than sidecars on anything new, because it removes most of the per-pod resource cost and the sidecar lifecycle problems while keeping the layer 7 features available where you need them. Linkerd is a strong choice when the requirements are genuinely just mTLS and metrics — it is deliberately minimal, noticeably lighter, and much easier to operate, and choosing it is often the more mature decision. AWS App Mesh I would not choose for new work, since AWS has announced it is being discontinued with migration guidance pointing at Istio and VPC Lattice. VPC Lattice is worth considering as an alternative rather than a mesh: it handles service-to-service connectivity, authentication, and observability across VPCs and accounts without any sidecars, which suits estates that are not entirely inside one Kubernetes cluster.

---
[Networking Index](./README.md) | [← CloudFront & CDN](./06-cloudfront.md) | [Network Troubleshooting →](./08-troubleshooting.md)
