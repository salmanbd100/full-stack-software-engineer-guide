---
title: Auto-scaling
part: 8
chapter: 0
slug: autoscaling
level: advanced # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-03
tags: [devops, kubernetes, autoscaling]
in_book: false
---

# Auto-scaling

Kubernetes scales on two axes: **pods** (more replicas or bigger replicas) and **nodes** (more capacity to put them on). Both must work together or neither works.

## The Four Autoscalers

```
        HPA  ──▶ more PODS        (horizontal, workload)
        VPA  ──▶ bigger PODS      (vertical, workload)
             ↓
   more pods need somewhere to run
             ↓
Cluster Autoscaler / Karpenter ──▶ more NODES
```

| Autoscaler | Scales | Trigger |
|-----------|--------|---------|
| **HPA** | Replica count | CPU, memory, or custom metrics |
| **VPA** | Requests and limits | Observed historical usage |
| **Cluster Autoscaler** | Node group size | Pending pods |
| **Karpenter** | Nodes directly | Pending pods, plus consolidation |

⚠️ **HPA without node scaling is a dead end.** HPA creates pods; if no node has room, they sit in `Pending` and you have gained nothing.

## Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70        # % of the CPU *request*
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0     # scale up immediately
      policies:
        - { type: Percent, value: 100, periodSeconds: 30 }   # can double every 30s
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 min before scaling down
      policies:
        - { type: Percent, value: 10, periodSeconds: 60 }    # shrink slowly
```

**The core formula:**

```
desiredReplicas = ceil(currentReplicas × (currentMetric / targetMetric))

6 pods at 90% CPU, target 70%:
  ceil(6 × 90/70) = ceil(7.7) = 8 pods
```

> **`averageUtilization` is a percentage of the pod's CPU *request*, not of the node's capacity.** If the request is wrong, HPA scales at the wrong time — this is the single most common HPA misconfiguration.

**Asymmetric behaviour is the key production setting:**

| Direction | Setting | Why |
|-----------|---------|-----|
| **Scale up** | Fast, no stabilization window | Under-capacity means user-visible errors |
| **Scale down** | Slow, 5-minute window | Prevents thrashing on spiky traffic |

⚠️ Requires **Metrics Server** installed. Without it, the HPA shows `<unknown>` for its metrics and never acts.

### Scaling on Better Metrics Than CPU

CPU is a poor proxy for load in I/O-bound services — a Node.js API waiting on a database has low CPU and a long queue.

```yaml
  metrics:
    # Requests per second per pod (via Prometheus Adapter)
    - type: Pods
      pods:
        metric: { name: http_requests_per_second }
        target: { type: AverageValue, averageValue: "100" }

    # SQS queue depth (via KEDA / external metrics)
    - type: External
      external:
        metric:
          name: sqs_messages_visible
          selector: { matchLabels: { queue: orders } }
        target: { type: AverageValue, averageValue: "30" }
```

| Workload | Best Scaling Metric |
|----------|--------------------|
| CPU-bound API | CPU utilization |
| I/O-bound API | Requests per second, or in-flight requests |
| Queue worker | ✅ Queue depth — CPU tells you nothing useful |
| WebSocket server | Active connections |

✅ **KEDA** is the standard tool for event-driven scaling. It scales on SQS depth, Kafka lag, DynamoDB streams, cron schedules, and dozens more — and can scale to **zero**, which plain HPA cannot.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-worker
spec:
  scaleTargetRef: { name: order-worker }
  minReplicaCount: 0                  # scale to zero when the queue is empty
  maxReplicaCount: 50
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/orders
        queueLength: "30"
        awsRegion: us-east-1
```

⚠️ **Never scale on memory.** Most runtimes — JVM, Node.js, Go — allocate memory and hold it. Usage rises and rarely falls, so a memory-based HPA scales up and never scales back down.

## Vertical Pod Autoscaler

VPA recommends (or applies) the right requests and limits based on observed usage.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"        # ✅ recommendation only — safest mode
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed: { cpu: 50m,  memory: 128Mi }
        maxAllowed: { cpu: "2",  memory: 2Gi }
```

| Mode | Behaviour |
|------|-----------|
| `Off` | ✅ Recommendations only — read them, apply manually |
| `Initial` | Sets requests on pod creation only |
| `Auto` / `Recreate` | **Evicts and recreates pods** to change requests |

❌ **Do not run VPA in `Auto` mode together with HPA on the same metric.** They fight: VPA raises the CPU request, which lowers utilization as a percentage of request, which makes HPA scale down, which raises per-pod load, which makes VPA raise requests again.

✅ The genuinely useful pattern is `updateMode: "Off"` — treat VPA as a right-sizing report. Over-requested resources are usually the largest source of wasted cluster spend, and VPA quantifies it.

**Safe combination:** VPA for memory requests, HPA on CPU or a custom metric.

## Cluster Autoscaler vs Karpenter

```
Cluster Autoscaler:
  Pending pod → find a node GROUP whose template fits → increase ASG desired count
                → EC2 launches → node joins → pod schedules        (~2–5 min)

Karpenter:
  Pending pod → compute the ideal instance shape → call EC2 directly
                → node joins → pod schedules                        (~40 s)
```

| | Cluster Autoscaler | Karpenter |
|-|-------------------|-----------|
| **Mechanism** | Adjusts ASG desired counts | Calls the EC2 API directly |
| **Instance choice** | Fixed per node group | Picks from many types per workload |
| **Speed** | 2–5 minutes | ~40 seconds |
| **Bin packing** | Poor — wastes capacity | ✅ Right-sizes nodes to pending pods |
| **Spot handling** | Manual mixed-instance policy | ✅ Built in, with interruption handling |
| **Consolidation** | Removes only empty nodes | ✅ Actively repacks pods onto fewer nodes |
| **Node groups needed** | One per instance type/AZ combination | None |

✅ **Karpenter is the current recommendation for EKS.** Faster scaling, cheaper through consolidation and spot, and it removes the node-group sprawl that Cluster Autoscaler forces.

### Karpenter Configuration

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
        - { key: kubernetes.io/arch, operator: In, values: ["amd64", "arm64"] }
        - { key: karpenter.sh/capacity-type, operator: In, values: ["spot", "on-demand"] }
        - { key: karpenter.k8s.aws/instance-category, operator: In, values: ["c", "m", "r"] }
        - { key: karpenter.k8s.aws/instance-generation, operator: Gt, values: ["5"] }
      expireAfter: 720h              # recycle nodes every 30 days for patching
  limits:
    cpu: "1000"                      # cluster-wide ceiling — a cost guardrail
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
    budgets:
      - nodes: "20%"                 # limit churn
      - nodes: "0"                   # freeze disruption during business hours
        schedule: "0 9 * * mon-fri"
        duration: 8h
```

**What makes this configuration good:**

| Setting | Effect |
|---------|--------|
| Broad `requirements` | More instance types = better spot availability and price |
| `capacity-type: [spot, on-demand]` | Karpenter prefers spot, falls back automatically |
| `consolidationPolicy: WhenEmptyOrUnderutilized` | Continuously repacks — the main cost saving |
| `expireAfter` | Forces node rotation so AMI patches actually land |
| `limits` | Hard ceiling so a runaway HPA cannot scale the bill infinitely |
| `budgets` with a schedule | No voluntary disruption during peak hours |

⚠️ **Consolidation moves pods.** Without PodDisruptionBudgets, Karpenter's repacking can disrupt services. PDBs plus disruption budgets are what make consolidation safe.

### Spot Interruption

```yaml
# EC2NodeClass — Karpenter watches the interruption queue
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiFamily: Bottlerocket
  role: KarpenterNodeRole-prod
  subnetSelectorTerms:
    - tags: { "karpenter.sh/discovery": "prod" }
  securityGroupSelectorTerms:
    - tags: { "karpenter.sh/discovery": "prod" }
  metadataOptions:
    httpTokens: required             # IMDSv2
    httpPutResponseHopLimit: 1       # ✅ blocks pods stealing node credentials
```

AWS gives a 2-minute interruption warning. Karpenter consumes it from an SQS queue, cordons and drains the node, and provisions replacement capacity before the instance dies.

**Requirements for safe spot usage:**

- ✅ Diverse instance types (a narrow list means all your capacity is reclaimed together)
- ✅ PodDisruptionBudgets so draining is orderly
- ✅ Applications handle SIGTERM and shut down gracefully
- ❌ Not for single-replica stateful workloads

## Scaling Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| HPA shows `<unknown>` | Metrics Server missing, or no resource requests set | Install Metrics Server; set requests |
| HPA at max, still overloaded | `maxReplicas` too low, or a downstream bottleneck | Raise the ceiling; check the database |
| Pods `Pending`, autoscaler quiet | No node group matches; hit `limits`; EC2 quota | Widen requirements; check quotas |
| Replica count oscillating | Scale-down window too short | Raise `scaleDown.stabilizationWindowSeconds` |
| Nodes never scale down | Pods without a controller, or a blocking PDB | Add PDBs correctly; avoid bare pods |
| Slow response to traffic spikes | Node provisioning latency | Karpenter, or over-provisioning pause pods |

**Over-provisioning for burst traffic** — a trick worth knowing:

```yaml
# Low-priority placeholder pods hold spare capacity.
# Real pods preempt them instantly, and the autoscaler replaces the placeholders.
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: { name: overprovisioning }
value: -10                    # negative: always evicted first
globalDefault: false
```

✅ This converts node provisioning latency into instant scheduling — you pay for a little idle capacity to remove the 40-second gap.

## Cost Impact

| Lever | Typical Saving |
|-------|---------------|
| **Right-size requests** (via VPA reports) | Often the largest single win |
| **Karpenter consolidation** | 20–40% |
| **Spot for stateless workloads** | 50–70% on that portion |
| **Graviton (arm64)** | ~20% better price/performance |
| **Scale to zero for workers** (KEDA) | 100% of idle time |
| **HPA `minReplicas` tuned per environment** | Dev clusters do not need 3 replicas |

> The biggest waste in most clusters is not missing autoscaling — it is resource requests set two to five times higher than actual usage, which makes every node bigger than it needs to be and defeats bin packing.

## Interview Q&A

**Q: Explain how the Horizontal Pod Autoscaler works.**

HPA queries a metrics API on an interval and compares the current metric against a target, then computes desired replicas as current replicas times current metric over target, rounded up. For CPU the target is a percentage of the pod's CPU *request*, not the node's capacity, which is why an inaccurate request breaks HPA behaviour entirely. It needs Metrics Server for CPU and memory, or a Prometheus adapter for custom metrics. In production the important part is the `behavior` block: I scale up fast with no stabilization window because being under capacity causes user-visible errors, and scale down slowly with a five-minute window to prevent thrashing on spiky traffic. And HPA is only half the story — without node autoscaling, the extra pods just sit in `Pending`.

**Q: Why shouldn't you autoscale on memory?**

Because most runtimes allocate memory and do not return it. A JVM heap, a Node.js process, or a Go program with a large in-use arena grows toward its limit and stays there even after load drops. So a memory-based HPA scales up during a spike and then never scales back down, because memory usage remains high regardless of actual traffic. Worse, memory is often a poor signal of load in the first place. CPU is better for compute-bound work, and for I/O-bound services the right signal is requests per second or in-flight requests. For queue workers, queue depth is the correct metric, which is what KEDA provides.

**Q: Compare Cluster Autoscaler and Karpenter.**

Cluster Autoscaler works by adjusting the desired count of Auto Scaling Groups: it sees a pending pod, finds a node group whose instance template could fit it, and increases that group's size. That means you must pre-create node groups for every instance type and availability zone combination you want, bin packing is poor because instance sizes are fixed, and scaling takes several minutes. Karpenter watches pending pods and calls the EC2 API directly, choosing an instance shape that actually fits the pending workload, typically in around forty seconds. It handles spot selection and interruption natively and continuously consolidates by repacking pods onto fewer nodes, which is where most of the cost saving comes from. Karpenter is the current recommendation for EKS; the caveat is that consolidation moves pods, so PodDisruptionBudgets and disruption budgets are required to make it safe.

**Q: How would you scale a worker consuming from an SQS queue?**

CPU-based HPA is wrong here — a worker blocked on I/O shows low CPU while the queue backs up. The right signal is queue depth, so I would use KEDA with an SQS trigger, setting a target of some number of messages per replica. KEDA also scales to zero, which plain HPA cannot, so an idle queue costs nothing in compute. On the node side, Karpenter provisions spot capacity for these workers since they are stateless and interruption-tolerant. The application must handle SIGTERM by finishing the message in flight and not acknowledging anything it has not completed, so a scale-down or spot reclaim does not lose work. A visibility timeout longer than the processing time plus the grace period covers the rest.

**Q: Pods are stuck in `Pending` and no new nodes are being created. What do you investigate?**

First `kubectl describe pod` for the scheduler's own explanation, which usually names the constraint directly. Common causes are resource requests larger than any instance type the node pool allows, node affinity or topology spread constraints that no candidate node satisfies, an unsatisfiable taint, or a PersistentVolumeClaim bound to an availability zone where no node can be created. Then I check the autoscaler side: whether the Karpenter NodePool's requirements exclude every viable instance type, whether the NodePool's `limits` ceiling has been reached, whether the EC2 service quota or a spot capacity shortage is blocking provisioning, and whether the subnets have free IP addresses — on EKS the VPC CNI needs an address per pod, so IP exhaustion presents exactly like a capacity problem while nodes look idle. The autoscaler's own logs generally say which of these it is.

---

[← Monitoring & Logging](./09-monitoring.md) | [Kubernetes Index](./README.md)
