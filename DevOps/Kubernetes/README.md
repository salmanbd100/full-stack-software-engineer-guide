# Kubernetes & AWS EKS - Interview Preparation

Kubernetes is the highest-weight topic in most DevOps interviews. This guide covers the architecture, the AWS-managed specifics of EKS, and the production concerns interviewers use to separate mid from senior candidates.

## Table of Contents

1. [Kubernetes Architecture](./01-architecture.md) — reconciliation loops, control plane, what `kubectl apply` really does
2. [AWS EKS](./02-eks.md) — compute options, Pod Identity vs IRSA, VPC CNI IP exhaustion, upgrades
3. [Pods & Deployments](./03-pods-deployments.md) — probes, resources, graceful shutdown, StatefulSets, scheduling
4. [Services & Networking](./04-services-networking.md) — Service types, DNS, Ingress/ALB, NetworkPolicy, service mesh
5. [ConfigMaps & Secrets](./05-configmaps-secrets.md) — config injection, why Secrets aren't secret, External Secrets Operator
6. [Persistent Volumes](./06-storage.md) — StorageClass/PV/PVC, EBS vs EFS, the AZ binding trap, snapshots
7. [RBAC & Security](./07-rbac-security.md) — Roles vs ClusterRoles, hidden admin permissions, Pod Security, IMDS escape
8. [Helm](./08-helm.md) — chart structure, templating, releases and rollback, Helm vs Kustomize
9. [Monitoring & Logging](./09-monitoring.md) — golden signals, Prometheus, PromQL, cardinality, alerting
10. [Auto-scaling](./10-autoscaling.md) — HPA, VPA, KEDA, Karpenter vs Cluster Autoscaler, spot

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 01 Architecture | "Walk me through `kubectl apply`" is asked constantly |
| 🔴 Critical | 03 Pods & Deployments | Probes and resource limits — the most practical knowledge |
| 🔴 Critical | 04 Services & Networking | Every debugging scenario question lands here |
| 🔴 Critical | 02 EKS | Required for any AWS-focused role |
| 🟡 High | 07 RBAC & Security | Expected at senior level |
| 🟡 High | 10 Auto-scaling | Cost and reliability conversations |
| 🟡 High | 06 Storage | The EBS/EFS access-mode question is near-guaranteed |
| 🟢 Good to know | 05, 08, 09 | Config, packaging, observability depth |

## Top 12 Interview Questions

1. Walk me through what happens when you run `kubectl apply -f deployment.yaml`.
2. What is the difference between a liveness and a readiness probe?
3. Why do you get 502s during a rolling deploy even with readiness probes?
4. Explain the Service types and when you'd use each.
5. Can any pod talk to any other pod by default? How do you restrict it?
6. Why can't two pods on different nodes write to the same EBS volume?
7. How do you give a pod on EKS permission to read from S3?
8. Are Kubernetes Secrets actually secure?
9. Which RBAC permissions are effectively cluster-admin?
10. Explain HPA — and why you shouldn't scale on memory.
11. Karpenter or Cluster Autoscaler?
12. A pod is `Pending` / `CrashLoopBackOff`. How do you debug it?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Everything in Kubernetes** | A reconciliation loop: controllers close the gap between desired and actual state |
| **Probes** | Readiness controls traffic; liveness restarts. Liveness must never check dependencies |
| **Zero-downtime deploys** | `maxUnavailable: 0`, readiness probe, `preStop` sleep, SIGTERM handling, PDB |
| **Pod → AWS permissions** | ServiceAccount + Pod Identity (or IRSA), never access keys |
| **EBS vs EFS** | EBS is a block device — one node, RWO. EFS is NFS — RWX across AZs |
| **Secrets** | Base64 is not encryption. KMS at rest + RBAC + External Secrets Operator |
| **Node scaling on EKS** | Karpenter: faster, better bin packing, native spot, active consolidation |

## Debugging Cheat Sheet

| Symptom | First Thing to Check |
|---------|---------------------|
| Pod `Pending` | `kubectl describe pod` — resources, taints, AZ/volume conflict, VPC CNI IP exhaustion |
| `CrashLoopBackOff` | `kubectl logs --previous` — then exit code (137 = OOMKilled) |
| `ImagePullBackOff` | Image name, tag, and ECR pull permissions |
| Service unreachable | Do EndpointSlices exist? Selector mismatch is the usual cause |
| DNS failing | CoreDNS health, and egress NetworkPolicy allowing UDP 53 |
| 502s during deploy | Missing readiness probe or `preStop` hook |
| Slow but CPU looks fine | CPU throttling (`container_cpu_cfs_throttled_seconds_total`) |
| Nodes won't scale down | Bare pods, or a PDB that can never be satisfied |

## Study Path

**Start here →** [Kubernetes Architecture](./01-architecture.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01, 03, 04: architecture, workloads, networking | 6–8 hours |
| AWS specifics | 02, 06: EKS, storage | 4–5 hours |
| Production | 07, 09, 10: security, observability, scaling | 5–7 hours |
| Tooling | 05, 08: config, Helm | 3–4 hours |

## Related Topics

- [Docker](../Docker/README.md) — images and containers, the layer below Kubernetes
- [AWS ECS](../AWS/05-ecs.md) — the simpler alternative, and the ECS vs EKS question
- [AWS IAM](../AWS/02-iam.md) — the basis of EKS authentication
- [CI/CD Deployment Strategies](../CICD/06-deployment-strategies.md) — canary and blue/green on Kubernetes
- [AWS VPC](../AWS/03-vpc.md) — subnet sizing decides your pod capacity

---
[← DevOps](../README.md)
