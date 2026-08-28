---
title: Pods and Deployments
part: 8
chapter: 0
slug: pods-and-deployments
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-08-28
tags: [devops, kubernetes, pods, deployments]
in_book: true
---

# Pods and Deployments

Pods are disposable. Controllers keep the right number of them running. Everything in this topic is about that relationship.

## Pod Lifecycle

```
Pending ──▶ Running ──▶ Succeeded   (batch job finished)
   │            │
   │            └────▶ Failed       (non-zero exit, no restart left)
   │
   └── stuck here = scheduling or image problem
```

| Phase | Meaning |
|-------|---------|
| **Pending** | Accepted but not running — unscheduled, or pulling images |
| **Running** | Bound to a node, at least one container started |
| **Succeeded** | All containers exited 0 and will not restart |
| **Failed** | All containers terminated, at least one failed |
| **Unknown** | Node unreachable — kubelet stopped reporting |

**Container states inside a pod:**

| State | Common Reason |
|-------|--------------|
| `ContainerCreating` | Pulling image, mounting volumes |
| `ImagePullBackOff` | Bad image name, missing registry credentials |
| `CrashLoopBackOff` | Container starts then exits repeatedly |
| `OOMKilled` | Exceeded its memory limit |
| `Error` | Exited non-zero |

⚠️ `CrashLoopBackOff` is not the error — it is Kubernetes backing off between restarts. Find the real cause with `kubectl logs <pod> --previous`.

## Health Probes

Probes are the single most impactful thing to get right. Missing readiness probes cause the 502 errors people blame on the load balancer.

| Probe | Question | On Failure |
|-------|----------|-----------|
| **startupProbe** | Has the app finished booting? | Restarts container; disables the other probes until it passes |
| **readinessProbe** | Can it serve traffic *right now*? | Removed from Service endpoints. **Not restarted** |
| **livenessProbe** | Is it permanently broken? | Container is **restarted** |

```yaml
spec:
  containers:
    - name: api
      image: api:1.4.2

      # Slow-starting app: allows 30 × 5s = 150s to boot
      startupProbe:
        httpGet: { path: /health, port: 3000 }
        failureThreshold: 30
        periodSeconds: 5

      # Checks dependencies — DB reachable, cache warm
      readinessProbe:
        httpGet: { path: /ready, port: 3000 }
        periodSeconds: 5
        failureThreshold: 3

      # Only checks that the process is not deadlocked
      livenessProbe:
        httpGet: { path: /health, port: 3000 }
        periodSeconds: 10
        failureThreshold: 3
```

**The critical distinction:**

| Endpoint | Should Check | Should NOT Check |
|----------|-------------|------------------|
| `/health` (liveness) | The process responds | Database, cache, downstream APIs |
| `/ready` (readiness) | Dependencies are usable | — |

❌ **A classic outage:** the liveness probe checks the database. The database has a brief hiccup, so every pod fails liveness, and Kubernetes restarts the entire fleet at once — turning a 10-second blip into a full outage with cold caches.

✅ Liveness answers "is this process wedged?" Readiness answers "should traffic come here?" Only readiness may depend on external systems.

## Resource Requests and Limits

```yaml
resources:
  requests:            # used for SCHEDULING — guaranteed reservation
    memory: "256Mi"
    cpu: "100m"        # 100 millicores = 0.1 core
  limits:              # enforced ceiling at RUNTIME
    memory: "512Mi"
    cpu: "500m"
```

**CPU and memory behave completely differently when exceeded:**

| Resource | Over the Limit |
|----------|---------------|
| **CPU** | **Throttled** — the container runs slower, keeps living |
| **Memory** | **OOMKilled** — the container is killed immediately |

> Memory is incompressible. There is no way to give a process "less memory now" — so the kernel kills it.

**QoS classes, which decide eviction order under node pressure:**

| Class | Condition | Evicted |
|-------|-----------|---------|
| **Guaranteed** | requests == limits for all containers | Last |
| **Burstable** | requests < limits | Middle |
| **BestEffort** | No requests or limits | **First** |

✅ Always set requests. A pod with no requests is BestEffort and is the first thing killed when a node runs out of memory.

⚠️ **The CPU limits debate:** CPU limits cause throttling even when the node is idle, which adds latency to p99. A common senior position is to set CPU *requests* accurately and omit CPU *limits* for latency-sensitive services, while always setting memory requests and limits to the same value.

## Deployments

A Deployment manages ReplicaSets, which manage pods. The extra layer is what enables rollback.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 4
  revisionHistoryLimit: 5          # keep 5 old ReplicaSets for rollback
  selector:
    matchLabels: { app: api }      # ⚠️ immutable after creation
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0            # never lose capacity mid-deploy
  template:
    metadata:
      labels: { app: api }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/api:a3f9c21
          ports: [{ containerPort: 3000 }]
          readinessProbe:
            httpGet: { path: /ready, port: 3000 }
```

**Rollout commands:**

```bash
kubectl rollout status deployment/api          # wait for completion
kubectl rollout history deployment/api         # list revisions
kubectl rollout undo deployment/api            # roll back one revision
kubectl rollout undo deployment/api --to-revision=3
kubectl rollout restart deployment/api         # recreate pods, same image
```

⚠️ `spec.selector` is **immutable**. Changing it requires deleting and recreating the Deployment, which means downtime. Get labels right the first time.

## Graceful Shutdown

Pod termination is where "zero downtime" quietly fails.

```
1. Pod marked Terminating; removed from Service endpoints
2. preStop hook runs (if defined)
3. SIGTERM sent to PID 1
4. Grace period countdown (terminationGracePeriodSeconds, default 30s)
5. SIGKILL if still running
```

⚠️ **The race condition:** steps 1 and 3 happen in parallel. Endpoint removal must propagate to every kube-proxy and load balancer, which takes a few seconds. Meanwhile the app already got SIGTERM and stopped accepting connections — so in-flight requests get connection refused.

✅ **The fix — a small preStop sleep:**

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 5"]   # let endpoint removal propagate
terminationGracePeriodSeconds: 30
```

**The application must also handle SIGTERM:**

```typescript
const server = app.listen(3000);

process.on("SIGTERM", () => {
  // Stop accepting new connections, finish in-flight requests
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});
```

❌ If PID 1 ignores SIGTERM, every pod takes the full grace period to die, making deploys slow and dropping requests.

## PodDisruptionBudget

A PDB limits how many pods can be voluntarily evicted at once — during node upgrades, cluster autoscaling, or draining.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 3          # or maxUnavailable: 1
  selector:
    matchLabels: { app: api }
```

✅ Every production Deployment needs a PDB. Without one, `kubectl drain` during a node upgrade can evict all replicas of a service simultaneously.

⚠️ A PDB that can never be satisfied (`minAvailable: 3` with `replicas: 3`) **blocks node drains forever**. Set `minAvailable` below the replica count.

## StatefulSets

For workloads where each pod needs a stable identity and its own storage.

| | Deployment | StatefulSet |
|-|-----------|-------------|
| **Pod names** | `api-7d9f-x8k2` (random) | `db-0`, `db-1`, `db-2` (ordinal) |
| **Identity across restarts** | ❌ New name and IP | ✅ Same name, same DNS record |
| **Storage** | Shared or none | One PVC per pod, retained on restart |
| **Startup order** | Parallel | Sequential (`db-0` before `db-1`) |
| **DNS** | Service only | Per-pod: `db-0.db-headless.ns.svc` |
| **Use for** | Stateless apps | Databases, Kafka, Elasticsearch, ZooKeeper |

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless     # required — provides per-pod DNS
  replicas: 3
  selector:
    matchLabels: { app: postgres }
  template:
    metadata:
      labels: { app: postgres }
    spec:
      containers:
        - name: postgres
          image: postgres:17
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
  volumeClaimTemplates:              # one PVC created per pod
    - metadata: { name: data }
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: gp3
        resources: { requests: { storage: 100Gi } }
```

> ⚠️ A StatefulSet gives you stable names and storage. It does **not** give you replication, failover, or leader election — the application must handle those. For production databases on AWS, RDS is usually the better answer.

## DaemonSets and Jobs

| Controller | Behaviour | Use For |
|-----------|-----------|---------|
| **DaemonSet** | One pod per node, automatically on new nodes | Log agents (Fluent Bit), metrics (node-exporter), CNI |
| **Job** | Runs pods until N complete successfully | Migrations, batch processing |
| **CronJob** | Creates Jobs on a schedule | Nightly reports, cleanup |

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid          # don't overlap with a still-running job
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 3600    # kill if it runs over an hour
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - { name: report, image: reporter:1.2 }
```

✅ Always set `concurrencyPolicy` and `activeDeadlineSeconds` on CronJobs. Without them, a hung job accumulates overlapping runs until the cluster runs out of capacity.

⚠️ DaemonSets are **not supported on Fargate** — this is why Fargate-only clusters cannot run node-level log or security agents.

## Scheduling Controls

```yaml
spec:
  # Spread replicas across availability zones
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels: { app: api }

  # Only schedule onto arm64 spot nodes
  nodeSelector:
    kubernetes.io/arch: arm64
    karpenter.sh/capacity-type: spot

  # Tolerate a taint on dedicated nodes
  tolerations:
    - { key: workload, value: batch, effect: NoSchedule }
```

| Mechanism | Purpose |
|-----------|---------|
| **nodeSelector** | Simple "must have this label" |
| **nodeAffinity** | Same, with `preferred` (soft) rules and operators |
| **podAntiAffinity** | Keep replicas off the same node |
| **topologySpreadConstraints** | ✅ Modern, cheaper way to spread across zones |
| **Taints + tolerations** | Reserve nodes — the node repels pods that don't tolerate it |

> Taints are the **node** saying "stay away". Tolerations are the **pod** saying "I accept that". Affinity is the pod expressing a preference.

✅ Prefer `topologySpreadConstraints` over `podAntiAffinity` for zone spreading — anti-affinity is expensive to evaluate on large clusters.

## Interview Q&A

**Q: What is the difference between a liveness and a readiness probe?**

A readiness probe decides whether the pod receives traffic. On failure the pod is removed from the Service's endpoints but is left running, so it can recover and rejoin. A liveness probe decides whether the container is beyond recovery. On failure the container is restarted. The practical consequence is what each endpoint should check: readiness may check dependencies like the database, because being unable to serve is a valid temporary state; liveness must only check that the process itself is responsive. If liveness checks the database, a brief database blip fails liveness on every pod at once and Kubernetes restarts the whole fleet, turning a short degradation into a full outage.

**Q: A pod is in `CrashLoopBackOff`. How do you debug it?**

`CrashLoopBackOff` just means the container keeps exiting and Kubernetes is backing off between restarts, so the first step is finding the actual exit reason. `kubectl logs <pod> --previous` shows output from the crashed instance rather than the one currently starting. `kubectl describe pod` gives the exit code and events: 137 means it was killed, usually OOMKilled if the memory limit was too low; 1 or 2 usually means the application failed on startup, often a missing environment variable, an unreachable dependency, or a failed migration. Also check whether a liveness probe is failing during a slow startup, which restarts the container before it ever becomes ready — the fix there is a startup probe rather than a longer liveness delay.

**Q: Why do you get 502 errors during a rolling deployment even with readiness probes configured?**

Because endpoint removal and SIGTERM happen in parallel during termination. The moment a pod is marked Terminating, the API server removes it from the endpoints list, but that removal has to propagate to every kube-proxy and to the load balancer's target group, which takes a few seconds. Meanwhile the container has already received SIGTERM and typically stopped accepting connections, so requests still being routed to it are refused. The fix is a `preStop` hook that sleeps for a few seconds, which delays SIGTERM until the endpoint removal has propagated, combined with an application that handles SIGTERM by draining in-flight requests before exiting. Setting `maxUnavailable: 0` also prevents capacity dropping during the roll.

**Q: When would you use a StatefulSet instead of a Deployment?**

When each replica needs a stable identity or its own persistent storage. A Deployment treats pods as interchangeable, giving them random names and new IPs on every restart. A StatefulSet gives ordinal names like `db-0` that survive restarts, a stable DNS record per pod through a headless Service, one PersistentVolumeClaim per pod that is reattached to the same ordinal, and ordered startup and shutdown. That is what clustered software like Kafka, Elasticsearch, or a Postgres cluster requires, since members must find each other at predictable addresses. Worth stating in an interview: a StatefulSet only provides identity and storage — replication, failover, and leader election are still the application's job, which is why a managed service like RDS is usually the better choice on AWS.

**Q: Should you set CPU limits?**

Memory limits, yes — memory is incompressible, so without a limit one leaking pod can trigger node-wide OOM kills and take down unrelated workloads. CPU limits are more debatable. CPU is compressible, so exceeding the request just means competing for cycles, but a CPU *limit* causes the kernel to throttle the container even when the node is otherwise idle, which shows up as p99 latency spikes. A defensible senior position is: set accurate CPU requests so scheduling and autoscaling work correctly, set memory request equal to memory limit for predictable behaviour and Guaranteed QoS, and omit CPU limits for latency-sensitive services while keeping them on batch workloads that should not be allowed to starve their neighbours.

---

[← Kubernetes Architecture](./06-kubernetes-architecture.md) | [Containers Index](./README.md)
