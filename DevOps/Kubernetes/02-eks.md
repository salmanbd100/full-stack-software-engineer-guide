# AWS EKS

EKS is managed Kubernetes. AWS runs the control plane across three availability zones; you own the worker nodes, add-ons, and workloads.

## What AWS Manages vs What You Manage

| Layer | Managed by AWS | Managed by You |
|-------|---------------|----------------|
| **etcd** | ✅ Backup, encryption, HA | — |
| **API server / scheduler / controllers** | ✅ Patching, scaling, multi-AZ | — |
| **Control plane upgrades** | Triggered by you, executed by AWS | Choosing when |
| **Worker nodes** | Partially (managed node groups) | AMI, sizing, upgrades |
| **Add-ons** (CNI, CoreDNS, kube-proxy) | Versions available | Which version, when to upgrade |
| **Workloads, RBAC, NetworkPolicy** | — | ✅ All yours |

> EKS removes the hardest operational work — a highly available, patched control plane — but you still own node lifecycle, add-on upgrades, and every security control inside the cluster.

## Compute Options

This is the first architectural decision, and a guaranteed interview question.

| | Managed Node Groups | Karpenter | Fargate |
|-|--------------------|-----------|---------|
| **What it is** | EKS-managed EC2 ASGs | Node provisioner controller | Serverless pods |
| **Node control** | You pick instance types | Karpenter picks per workload | None |
| **Scaling speed** | Minutes (ASG) | ~40 seconds | ~60 seconds |
| **Bin packing** | Poor — fixed instance types | Excellent — right-sizes nodes | One pod per micro-VM |
| **Spot support** | ✅ Manual config | ✅ Automatic, with interruption handling | ❌ No |
| **DaemonSets** | ✅ Yes | ✅ Yes | ❌ Not supported |
| **Privileged pods** | ✅ Yes | ✅ Yes | ❌ No |
| **Cost** | Pay for whole instances | Best — matches actual demand | Highest per vCPU |
| **Best for** | Baseline, predictable load | Most production clusters | Bursty jobs, small clusters |

✅ **Recommended production pattern:** a small managed node group for cluster-critical add-ons (CoreDNS, controllers), plus Karpenter for application workloads with spot capacity.

⚠️ **Fargate limitations bite in real clusters:** no DaemonSets means no node-level log agent or security agent, no privileged containers, no GPU, and only 20 GB of ephemeral storage. It is best for isolated batch work, not general-purpose platforms.

## Cluster Access: The Two Authorization Models

EKS authentication uses IAM; authorization uses Kubernetes RBAC. Mapping between them has changed.

```
IAM identity ──▶ EKS authenticates via IAM ──▶ maps to a K8s user/group ──▶ RBAC decides
```

| Model | How Mapping Works | Status |
|-------|------------------|--------|
| **`aws-auth` ConfigMap** | Edit a ConfigMap in `kube-system` | Legacy — a bad edit locks everyone out |
| **EKS Access Entries** | An EKS API call per IAM principal | ✅ Current approach |

**Access Entries (preferred):**

```bash
aws eks create-access-entry \
  --cluster-name prod \
  --principal-arn arn:aws:iam::123456789:role/platform-team \
  --type STANDARD \
  --kubernetes-groups platform-admins

# Or attach a managed access policy instead of your own RBAC
aws eks associate-access-policy \
  --cluster-name prod \
  --principal-arn arn:aws:iam::123456789:role/developers \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy \
  --access-scope type=namespace,namespaces=dev
```

✅ Access Entries are an API call with CloudTrail coverage, and no risk of bricking cluster access with a YAML typo.

⚠️ The IAM principal that **created** the cluster has implicit admin access that does not appear in any ConfigMap. If that is a personal IAM user, you have an invisible admin. Always create clusters with a dedicated role.

## Giving Pods AWS Permissions

Never put AWS access keys in a pod. There are two supported mechanisms.

### EKS Pod Identity (current recommendation)

```bash
aws eks create-pod-identity-association \
  --cluster-name prod \
  --namespace production \
  --service-account api-sa \
  --role-arn arn:aws:iam::123456789:role/api-role
```

**Trust policy — the same for every cluster:**

```json
{
  "Effect": "Allow",
  "Principal": { "Service": "pods.eks.amazonaws.com" },
  "Action": ["sts:AssumeRole", "sts:TagSession"]
}
```

### IRSA (IAM Roles for Service Accounts)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/api-role
```

**Trust policy — references this specific cluster's OIDC provider:**

```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE:aud": "sts.amazonaws.com",
      "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLE:sub": "system:serviceaccount:production:api-sa"
    }
  }
}
```

| | Pod Identity | IRSA |
|-|-------------|------|
| **Trust policy setup** | Once per role, cluster-independent | Per cluster OIDC provider |
| **Reuse across clusters** | ✅ No trust policy change | ❌ Must add each cluster's provider |
| **Trust policy size limit** | Not a factor | Caps you around 8 clusters per role |
| **Cross-account** | Supported | Supported |
| **Fargate** | ❌ Not supported | ✅ Supported |
| **Verdict** | ✅ Default for new clusters | Still required on Fargate |

> **The interview answer:** both give a pod short-lived, scoped credentials via a Kubernetes ServiceAccount. Pod Identity is simpler because the IAM trust policy is written once and works across every cluster, while IRSA embeds a specific cluster's OIDC endpoint in the trust policy.

## Networking: The AWS VPC CNI and IP Exhaustion

The AWS VPC CNI assigns each pod a **real VPC IP address**.

**Benefits:** pods are reachable from anywhere in the VPC, security groups can apply per pod, VPC Flow Logs see pod traffic, no overlay encapsulation overhead.

**The cost — IP exhaustion:**

```
Pods per node = (ENIs per instance × (IPs per ENI - 1))

m5.large  → 3 ENIs × 9 IPs  = 27 pods max
t3.medium → 3 ENIs × 5 IPs  = 17 pods max
```

⚠️ A `/24` subnet has 251 usable IPs. Two dozen nodes plus their pods exhausts it, and new pods sit in `Pending` with a CNI failure — while the nodes themselves have plenty of CPU and memory free.

**Mitigations:**

| Approach | Effect |
|----------|--------|
| **Large subnets** (`/18` or bigger) per AZ | The simplest fix — plan this at cluster creation |
| **Prefix delegation** (`ENABLE_PREFIX_DELEGATION=true`) | Assigns `/28` prefixes instead of single IPs — far more pods per node |
| **Custom networking** | Pods use a secondary CIDR (`100.64.0.0/16`), keeping primary IPs for nodes |
| **Larger instances** | More ENIs per node, fewer nodes competing for IPs |

✅ Get subnet sizing right at cluster creation. Changing a VPC's subnet layout later, with workloads running, is painful.

## Essential Add-Ons

| Add-On | Why You Need It |
|--------|----------------|
| **VPC CNI** | Pod networking (installed by default) |
| **CoreDNS** | Service DNS resolution |
| **kube-proxy** | Service routing |
| **AWS Load Balancer Controller** | Creates ALBs/NLBs from Ingress and Service objects |
| **EBS CSI driver** | PersistentVolumes on EBS — required for stateful workloads |
| **EFS CSI driver** | Shared `ReadWriteMany` storage |
| **Cluster Autoscaler or Karpenter** | Node scaling |
| **External Secrets Operator** | Syncs Secrets Manager values into Kubernetes Secrets |
| **Metrics Server** | Required by HPA |

⚠️ The first four are managed EKS add-ons — AWS provides versions, but **you decide when to upgrade**, and version skew with the control plane causes subtle failures after a cluster upgrade.

## Cluster Upgrades

EKS supports a limited set of Kubernetes versions and each has a support window. Upgrading is routine work, and interviewers ask about the order.

```
1. Read the Kubernetes changelog for removed APIs
2. Scan manifests for deprecated APIs (kubent / pluto)
3. Upgrade the CONTROL PLANE first (one minor version at a time)
4. Upgrade the ADD-ONS to versions matching the new control plane
5. Upgrade the NODES last
6. Verify workloads, then repeat for the next minor version
```

**Rules that matter:**

| Rule | Detail |
|------|--------|
| One minor version at a time | No skipping — 1.30 → 1.31 → 1.32 |
| Control plane before nodes | Nodes may be up to 3 minor versions behind; never ahead |
| No downgrades | Rolling back a control plane upgrade is impossible |
| Check API removals | The most common upgrade break |

✅ Ensure every workload has a **PodDisruptionBudget** before a node upgrade. Without one, a node group rollout can evict all replicas of a service at once.

## EKS with Terraform

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = "prod"
  kubernetes_version = "1.34"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets     # nodes in private subnets

  # Control plane audit logging — enable this
  enabled_log_types = ["api", "audit", "authenticator"]

  endpoint_public_access       = false          # private API endpoint
  endpoint_private_access      = true

  # Encrypt Secrets in etcd with your own KMS key
  encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  eks_managed_node_groups = {
    system = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2
      # Reserve these nodes for cluster add-ons
      taints = [{ key = "CriticalAddonsOnly", value = "true", effect = "NO_SCHEDULE" }]
    }
  }
}
```

**Production checklist:**

- ✅ Nodes in **private** subnets, NAT or VPC endpoints for egress
- ✅ Private API endpoint, or public with `public_access_cidrs` restricted
- ✅ Control plane audit logs to CloudWatch
- ✅ Secrets encryption with a customer-managed KMS key
- ✅ IMDSv2 enforced with hop limit 1 on nodes

## Cost Optimization

| Lever | Typical Saving |
|-------|---------------|
| **Karpenter with Spot** | 50–70% on stateless workloads |
| **Right-size requests** | Large — over-requesting is the biggest hidden waste |
| **Graviton (arm64) nodes** | ~20% better price/performance |
| **Karpenter consolidation** | Continuously repacks pods onto fewer nodes |
| **Single NAT Gateway in dev** | Removes 2 of 3 NAT charges |

⚠️ The control plane costs a flat hourly fee per cluster. Running a separate cluster per developer gets expensive fast — use namespaces with quotas instead.

## Interview Q&A

**Q: How do you give a pod on EKS permission to read from an S3 bucket?**

Attach an IAM role to a Kubernetes ServiceAccount, then run the pod with that ServiceAccount. With EKS Pod Identity you create a pod identity association linking the cluster, namespace, and service account to the role, and the role's trust policy simply trusts the `pods.eks.amazonaws.com` service principal. With IRSA you annotate the ServiceAccount with the role ARN, and the role's trust policy federates the cluster's OIDC provider with a condition pinning the `sub` claim to that exact namespace and service account. Either way the pod receives short-lived STS credentials that the AWS SDK picks up automatically, so there are no access keys in the container or in a Secret. Pod Identity is the better default now because the trust policy is written once and works across all clusters; IRSA is still required on Fargate.

**Q: Pods are stuck in `Pending` but the nodes show plenty of free CPU and memory. What is happening on EKS?**

The most likely cause is IP exhaustion from the AWS VPC CNI. Each pod gets a real VPC IP, and both the instance type and the subnet size cap how many pods can exist. If the subnet has no free addresses, or the node has used all the IPs its ENIs can hold, the CNI cannot allocate an address and the pod never starts despite idle CPU. Check the CNI plugin logs and the subnet's available IP count. Fixes are prefix delegation to assign `/28` blocks instead of individual IPs, larger instance types with more ENIs, custom networking to move pods onto a secondary CIDR, or properly sized subnets. Other possibilities worth ruling out are unmatched taints, node affinity or topology constraints, and a PersistentVolume bound to an availability zone with no schedulable node.

**Q: What is the correct order for an EKS cluster upgrade?**

First check for removed and deprecated APIs in the target version and scan manifests with a tool like kubent, because API removal is the most common break. Then upgrade the control plane, one minor version at a time — skipping versions is not supported and there is no downgrade path. Next upgrade the add-ons, particularly the VPC CNI, CoreDNS, and kube-proxy, to versions compatible with the new control plane, since version skew here causes subtle DNS and networking failures. Upgrade nodes last, because nodes may lag the control plane by a few minor versions but must never run ahead of it. Before the node rollout, confirm every workload has a PodDisruptionBudget so the rolling replacement cannot evict all replicas of a service simultaneously.

**Q: Managed node groups, Karpenter, or Fargate — how do you choose?**

Managed node groups are EKS-managed Auto Scaling Groups: predictable, simple, but poor at bin packing because the instance types are fixed and scaling takes minutes. Karpenter watches unschedulable pods and provisions right-sized nodes directly through the EC2 API in around forty seconds, handles spot interruption, and continuously consolidates workloads onto fewer nodes, which usually makes it both faster and significantly cheaper. Fargate runs each pod in its own micro-VM with no node management at all, but it cannot run DaemonSets, privileged containers, or GPU workloads, which rules out most node-level logging and security agents. The common production pattern is a small managed node group carrying the cluster-critical add-ons, with Karpenter provisioning spot capacity for application workloads.

**Q: How do you control who can access an EKS cluster?**

Authentication is IAM and authorization is Kubernetes RBAC, with a mapping between them. The modern mechanism is EKS Access Entries: you create an entry per IAM principal through the EKS API, mapping it to Kubernetes groups or attaching an AWS-managed access policy scoped to specific namespaces. That is auditable through CloudTrail and cannot lock you out through a YAML mistake, unlike the legacy `aws-auth` ConfigMap. On top of that, restrict the API endpoint — private-only, or public with an allowlisted CIDR — and enable control plane audit logging. One subtlety worth raising: the IAM principal that created the cluster holds implicit admin rights that appear in no configuration, so clusters should always be created by a dedicated role rather than a personal user.

---

[← Kubernetes Architecture](./01-architecture.md) | [Pods & Deployments →](./03-pods-deployments.md)
