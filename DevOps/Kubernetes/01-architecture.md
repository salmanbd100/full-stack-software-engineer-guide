---
title: Kubernetes Architecture
part: 8
chapter: 0
slug: kubernetes-architecture
level: advanced # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-03
tags: [devops, kubernetes, architecture]
in_book: true
---

# Kubernetes Architecture

Kubernetes is a control loop system. You declare the desired state; controllers work continuously to make reality match it.

## The Core Idea: Reconciliation Loops

```
        ┌──────────────────────────────┐
        │  Desired state (your YAML)   │
        └──────────────┬───────────────┘
                       │  stored in etcd
                       ▼
        ┌──────────────────────────────┐
        │  Controller compares         │◀──── observes actual state
        │  desired vs actual           │
        └──────────────┬───────────────┘
                       │  takes action to close the gap
                       ▼
                 Actual state
```

> Everything in Kubernetes is this one pattern repeated. "3 replicas" is not a command — it is a fact the Deployment controller keeps making true, forever.

This explains most Kubernetes behaviour that surprises people:

- Delete a pod managed by a Deployment → a new one appears (the controller closes the gap)
- Manually edit a managed resource → your change gets reverted
- A node dies → its pods are rescheduled elsewhere with no human involved

## Cluster Components

```
CONTROL PLANE                          WORKER NODE
┌────────────────────────┐             ┌────────────────────────┐
│ kube-apiserver         │◀───────────▶│ kubelet                │
│   ↕                    │             │   ↕                    │
│ etcd (state store)     │             │ container runtime      │
│                        │             │   (containerd)         │
│ kube-scheduler         │             │                        │
│ kube-controller-manager│             │ kube-proxy             │
│ cloud-controller-mgr   │             │                        │
└────────────────────────┘             └────────────────────────┘
```

### Control Plane

| Component | Responsibility |
|-----------|---------------|
| **kube-apiserver** | The only component that talks to etcd. Validates and serves all API requests |
| **etcd** | Distributed key-value store holding all cluster state |
| **kube-scheduler** | Decides which node each new pod runs on. Does not start it |
| **kube-controller-manager** | Runs the built-in controllers (Deployment, ReplicaSet, Node, Job…) |
| **cloud-controller-manager** | Talks to the cloud API — provisions load balancers, volumes, node metadata |

> **The API server is the hub.** Nothing bypasses it. kubelet, controllers, `kubectl`, and the scheduler all communicate *through* the API server, never directly with each other. This is why RBAC on the API server is the entire security perimeter.

### Worker Node

| Component | Responsibility |
|-----------|---------------|
| **kubelet** | Watches for pods assigned to its node, tells the runtime to start them, reports health |
| **Container runtime** | Actually runs containers. `containerd` is the standard (Docker shim removed in 1.24) |
| **kube-proxy** | Programs iptables/IPVS rules so Service IPs route to pod IPs |

⚠️ kubelet is the only node component that talks to the control plane. If a node shows `NotReady`, the kubelet has stopped reporting — check the kubelet service and its network path to the API server first.

## What Happens When You Run `kubectl apply`

This walkthrough is one of the most common Kubernetes interview questions.

```
1. kubectl        → sends POST/PATCH to kube-apiserver (authenticated via kubeconfig)
2. apiserver      → authentication → authorization (RBAC) → admission controllers
3. apiserver      → validates the object, writes it to etcd
4. Deployment ctl → sees a new Deployment, creates a ReplicaSet
5. ReplicaSet ctl → sees replicas: 3, actual 0 → creates 3 Pod objects (nodeName empty)
6. scheduler      → watches for pods with no nodeName
                    filters nodes (resources, taints, affinity)
                    scores the survivors, picks the best
                    writes nodeName back to the Pod object
7. kubelet        → sees a pod assigned to its node
                    pulls the image, creates the container via containerd
                    sets up networking via CNI, mounts volumes via CSI
8. kubelet        → reports pod status back to the apiserver
9. endpoints ctl  → pod passes readiness → added to the Service's EndpointSlice
10. kube-proxy    → updates iptables so Service traffic reaches the new pod
```

**Key insight at each layer:**

| Question | Answer |
|----------|--------|
| Who creates the pod object? | The ReplicaSet controller, not you |
| Who picks the node? | The scheduler — it only writes `nodeName` |
| Who starts the container? | kubelet, via the container runtime |
| Who makes it reachable? | The endpoints controller + kube-proxy, after readiness passes |

## Object Hierarchy

```
Deployment          (you manage this)
└── ReplicaSet      (created per template revision — enables rollback)
    └── Pod         (created and replaced, never repaired)
        └── Container(s)
```

| Object | Purpose |
|--------|---------|
| **Pod** | Smallest deployable unit. One or more containers sharing network and storage |
| **ReplicaSet** | Keeps N identical pods running |
| **Deployment** | Manages ReplicaSets to enable rolling updates and rollback |

> Pods are **cattle, not pets**. Kubernetes never repairs a pod — it deletes it and creates a new one. That is why pod IPs are unstable and why you always need a Service.

## Why a Pod, Not Just a Container?

A pod is a shared execution context. Containers in the same pod share:

- **Network namespace** — same IP, they reach each other on `localhost`
- **Volumes** — can mount the same volume
- **Lifecycle** — scheduled together on one node, live and die together

**The main legitimate multi-container pattern is a sidecar:**

```yaml
spec:
  containers:
    - name: app
      image: api:1.4
    - name: log-shipper           # sidecar — reads the app's log volume
      image: fluent-bit:3.1
      volumeMounts:
        - { name: logs, mountPath: /var/log/app }
```

| Pattern | Purpose |
|---------|---------|
| **Sidecar** | Adds capability: log shipping, service mesh proxy, metrics exporter |
| **Init container** | Runs to completion before app containers start (migrations, waiting on a dependency) |
| **Adapter** | Reshapes the app's output into a standard format |

❌ Do not put two independent services in one pod. They cannot scale separately, cannot be updated separately, and one crash loop takes down both.

## Networking Model

Kubernetes requires a flat network with three rules:

1. Every pod gets its own IP
2. Pods can reach any other pod directly, without NAT
3. Nodes can reach all pods

```
Node A                        Node B
├── pod 10.0.1.5  ────────────▶ pod 10.0.2.9    (direct, no NAT)
└── pod 10.0.1.6
```

The **CNI plugin** implements this. On EKS, the AWS VPC CNI gives each pod a real VPC IP address from the subnet — which is why pods are directly reachable from anywhere in the VPC, and why IP exhaustion is a real EKS capacity concern.

## Namespaces

Namespaces are a logical partition for names, quotas, and RBAC.

```bash
kubectl get pods -n production
kubectl config set-context --current --namespace=production
```

**What namespaces do and don't isolate:**

| Isolates | ✅ / ❌ |
|----------|--------|
| Object names | ✅ Yes |
| RBAC scope | ✅ Yes |
| Resource quotas | ✅ Yes |
| Network traffic | ❌ No — needs NetworkPolicy |
| Node / kernel | ❌ No — pods still share nodes |

⚠️ A namespace is **not a security boundary** on its own. Without NetworkPolicies, a pod in `dev` can call a pod in `production` directly by IP. For real isolation between untrusted tenants you need separate clusters or separate node pools plus NetworkPolicies.

**Cluster-scoped (not namespaced):** Nodes, PersistentVolumes, StorageClasses, ClusterRoles, Namespaces themselves.

## Control Plane High Availability

| Concern | Requirement |
|---------|-------------|
| **etcd quorum** | Odd number of members (3 or 5). Tolerates `(n-1)/2` failures |
| **API server** | Stateless — run several behind a load balancer |
| **Controllers/scheduler** | Run several; they use leader election, only one is active |

✅ On EKS, AWS runs and scales the control plane across three availability zones for you. This removes the hardest operational work in Kubernetes — and is the main reason to choose a managed service.

## Interview Q&A

**Q: Walk me through what happens when you run `kubectl apply -f deployment.yaml`.**

kubectl authenticates and sends the object to the API server, which runs authentication, RBAC authorization, and admission controllers, then validates the object and persists it to etcd. The Deployment controller notices the new object and creates a ReplicaSet. The ReplicaSet controller sees it needs three pods and none exist, so it creates three Pod objects with no node assigned. The scheduler watches for unassigned pods, filters nodes by resource requests, taints, and affinity rules, scores the remaining candidates, and writes the chosen node name back to each pod. The kubelet on that node sees a pod assigned to it, pulls the image, and asks containerd to start the container, wiring up networking through CNI and volumes through CSI. Once the readiness probe passes, the endpoints controller adds the pod to the Service's EndpointSlice, and kube-proxy updates the node's routing rules so traffic reaches it.

**Q: Why is a pod the smallest unit rather than a container?**

Because some workloads genuinely need multiple processes sharing a network namespace and filesystem — a service mesh proxy intercepting traffic, a log shipper reading the app's log directory, or an init container running a migration before the app starts. A pod provides that shared context: one IP address, shared volumes, and a shared lifecycle on a single node. If Kubernetes scheduled individual containers, every one of those patterns would require the user to guarantee co-location and shared networking manually.

**Q: What is the role of etcd, and why does it matter operationally?**

etcd is the single source of truth for the cluster — every object, its spec, and its status. Only the API server talks to it, which keeps the access path narrow. Operationally it matters for two reasons. First, availability: etcd needs a quorum, so you run an odd number of members, usually three, and losing quorum makes the cluster read-only. Second, security: etcd holds Secrets, so it must be encrypted at rest and its backups treated as highly sensitive. A cluster backup is effectively an etcd snapshot, and restoring one restores the entire cluster state.

**Q: Is a namespace a security boundary?**

Not by itself. Namespaces scope names, RBAC rules, and resource quotas, which handles access control to the API. But they do not isolate network traffic — by default any pod can reach any other pod in the cluster regardless of namespace — and they do not isolate the node or kernel, since pods from different namespaces run side by side on the same hosts. To get meaningful isolation you add default-deny NetworkPolicies, Pod Security admission standards, and resource quotas, and for genuinely untrusted workloads you use separate node pools or separate clusters.

**Q: What does the scheduler actually do?**

It answers one question: which node should this pod run on? It works in two phases. Filtering removes nodes that cannot run the pod — insufficient allocatable CPU or memory for the pod's requests, unmatched taints, failing node affinity or node selectors, unavailable volume zones. Scoring then ranks the surviving nodes using factors like spreading pods across nodes and zones, image locality, and resource balance. The scheduler then writes the winning node name into the pod object. Notably it does not start anything — the kubelet on that node picks it up from there. This separation is why a pod can sit in `Pending` indefinitely: no node passed the filter phase.

---

[Kubernetes Index](./README.md) | [AWS EKS →](./02-eks.md)
