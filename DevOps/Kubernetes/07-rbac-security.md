---
title: RBAC & Security
part: 8
chapter: 0
slug: rbac-security
level: advanced # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-03
tags: [devops, kubernetes, rbac, security]
in_book: false
---

# RBAC & Security

Kubernetes security has two halves: controlling **who can call the API** (RBAC) and controlling **what a running pod can do** (workload security).

## The Request Pipeline

Every API request passes through four gates:

```
Request ──▶ Authentication ──▶ Authorization ──▶ Admission ──▶ etcd
            "who are you?"     "may you?"        "is it valid /
                                                  should I change it?"
```

| Stage | Mechanism |
|-------|-----------|
| **Authentication** | Client certs, OIDC tokens, ServiceAccount tokens (IAM on EKS) |
| **Authorization** | RBAC — the focus of this topic |
| **Admission (mutating)** | Injects sidecars, adds defaults |
| **Admission (validating)** | Enforces policy — Pod Security, OPA Gatekeeper, Kyverno |

> Kubernetes has no user database. It trusts an external identity source. On EKS, that source is IAM.

## RBAC: Four Objects

```
Role / ClusterRole              = a set of permissions
        ▲
        │ referenced by
RoleBinding / ClusterRoleBinding = grants those permissions to a subject
        │
        ▼
Subject: User | Group | ServiceAccount
```

| Object | Scope |
|--------|-------|
| **Role** | Permissions within one namespace |
| **ClusterRole** | Permissions cluster-wide, **or** reusable in any namespace |
| **RoleBinding** | Grants in one namespace (can reference a ClusterRole) |
| **ClusterRoleBinding** | Grants cluster-wide |

**The combination that trips people up:**

| Role Type | Binding Type | Result |
|-----------|-------------|--------|
| Role | RoleBinding | Permissions in that one namespace |
| ClusterRole | RoleBinding | ✅ Cluster-wide role, **applied only in that namespace** — the useful pattern |
| ClusterRole | ClusterRoleBinding | Permissions in **every** namespace |
| Role | ClusterRoleBinding | ❌ Not allowed |

> The third row is the trap. Binding the built-in `admin` ClusterRole with a *ClusterRoleBinding* gives someone full access to every namespace, when a *RoleBinding* would have limited them to one.

## Writing a Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: developer
rules:
  - apiGroups: [""]                       # "" = core API group
    resources: [pods, pods/log, services, configmaps]
    verbs: [get, list, watch]
  - apiGroups: [apps]
    resources: [deployments]
    verbs: [get, list, watch, patch]      # can scale and restart, not delete
  - apiGroups: [""]
    resources: [pods/exec]                # ⚠️ shell access — grant carefully
    verbs: [create]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: production
  name: developers
subjects:
  - kind: Group
    name: developers                      # mapped from IAM via EKS Access Entries
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

**Verbs:** `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`, `deletecollection`.

⚠️ **`list` implies reading full object contents.** `list secrets` returns every secret's data, not just names. There is no "list names only" permission.

### Permissions That Are Secretly Admin

| Permission | Why It's Dangerous |
|------------|-------------------|
| `get`/`list secrets` | Reads every credential in the namespace |
| `create pods` | Mount any Secret, or a hostPath, into a pod you control |
| `create pods/exec` | Shell into any existing pod |
| `escalate` on roles | Grant yourself permissions you don't have |
| `bind` on roles | Bind an existing higher-privilege role to yourself |
| `impersonate` | Act as any user or group, including cluster-admin |
| `patch` on nodes | Remove taints, change labels to attract workloads |

> **`create pods` is the one people miss.** A user who can create a pod in a namespace can mount every Secret in it, or run a privileged pod with `hostPath: /` and read the node's filesystem. In practice, pod creation plus a permissive PodSecurity setting equals node compromise.

### Auditing Access

```bash
# Can I do this?
kubectl auth can-i delete pods --namespace production

# Can someone else? (needs impersonate)
kubectl auth can-i list secrets --as=system:serviceaccount:dev:default -n production

# Everything a subject can do
kubectl auth can-i --list --as=system:serviceaccount:production:api-sa
```

✅ `kubectl auth can-i --list` is the fastest way to review a ServiceAccount's real blast radius.

## ServiceAccounts

Every pod runs as a ServiceAccount — `default` if you don't specify one.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-sa
  namespace: production
automountServiceAccountToken: false     # ✅ if the pod never calls the K8s API
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      serviceAccountName: api-sa
```

✅ **Two rules:**

1. **Never use the `default` ServiceAccount** for real workloads — you cannot scope permissions per app if every pod shares one identity.
2. **Set `automountServiceAccountToken: false`** unless the pod actually talks to the Kubernetes API. Most application pods don't, and a mounted token is a credential an attacker can use after compromising the container.

**On EKS**, the ServiceAccount is also the AWS identity, via Pod Identity or IRSA — so it carries both Kubernetes RBAC and IAM permissions. Scope both.

## Pod Security Standards

PodSecurityPolicy was removed in 1.25. The replacement is **Pod Security Admission**, a built-in admission controller configured per namespace with a label.

| Level | Allows |
|-------|--------|
| **privileged** | Everything — no restrictions |
| **baseline** | Blocks known privilege escalations (privileged mode, hostPath, host namespaces) |
| **restricted** | ✅ Enforces hardening: non-root, no privilege escalation, dropped capabilities, seccomp |

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted   # reject violating pods
    pod-security.kubernetes.io/audit: restricted     # log violations
    pod-security.kubernetes.io/warn: restricted      # warn on kubectl apply
```

✅ Roll it out as `warn` first, fix the warnings, then switch to `enforce`. Going straight to `enforce` on an existing namespace blocks deployments immediately.

**A pod that satisfies `restricted`:**

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    fsGroup: 10001
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: api
      image: api:1.4.2
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: [ALL]
      volumeMounts:
        - { name: tmp, mountPath: /tmp }    # needed once root FS is read-only
  volumes:
    - name: tmp
      emptyDir: {}
```

**What each setting prevents:**

| Setting | Blocks |
|---------|--------|
| `runAsNonRoot` | Container root, which is often node root after a container escape |
| `allowPrivilegeEscalation: false` | setuid binaries gaining privileges |
| `readOnlyRootFilesystem: true` | Attacker writing tools or modifying binaries in the container |
| `capabilities.drop: [ALL]` | Everything from raw sockets to mounting filesystems |
| `seccompProfile: RuntimeDefault` | Dangerous syscalls |

❌ **Never set `privileged: true`.** It disables essentially all container isolation — the container can access every device on the host and is one step from full node compromise.

## Policy Engines

Pod Security Admission covers pod hardening only. For anything else you need a policy engine.

| Need | Tool |
|------|------|
| Require specific labels or tags | Kyverno / OPA Gatekeeper |
| Block `:latest` image tags | Kyverno / OPA Gatekeeper |
| Require images from your ECR only | Kyverno / OPA Gatekeeper |
| Enforce resource limits exist | Kyverno / OPA Gatekeeper |
| Verify image signatures | Kyverno (built-in cosign support) |
| Mutate — inject defaults | Kyverno |

```yaml
# Kyverno: block images not from our ECR
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-ecr-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-registry
      match:
        any: [{ resources: { kinds: [Pod] } }]
      validate:
        message: "Images must come from our ECR registry"
        pattern:
          spec:
            containers:
              - image: "123456789.dkr.ecr.us-east-1.amazonaws.com/*"
```

> Kyverno uses Kubernetes-native YAML; Gatekeeper uses Rego. Kyverno is easier for teams already fluent in Kubernetes manifests.

## Node and Cluster Hardening on EKS

| Control | Why |
|---------|-----|
| **Private API endpoint** | Removes the control plane from the internet |
| **Control plane audit logs** | The only record of who did what — required for any investigation |
| **etcd encryption with KMS** | Secrets are otherwise stored effectively in plaintext |
| **IMDSv2, hop limit 1** | Stops a compromised pod stealing the **node's** IAM credentials |
| **Nodes in private subnets** | No direct inbound path from the internet |
| **Minimal node IAM role** | Pods should get permissions via Pod Identity, not the node role |
| **Immutable, minimal AMIs** | Bottlerocket has a read-only root filesystem and tiny attack surface |

⚠️ **IMDS is the classic EKS escape path.** By default a pod can reach `169.254.169.254` and retrieve the *node's* IAM role credentials — usually far more privileged than the pod's own role. Enforcing IMDSv2 with a hop limit of 1 means the token request cannot survive the extra network hop out of the pod, which closes it.

## Runtime Security and Image Scanning

```
Build time                          Runtime
├── Trivy / ECR scan on the image   ├── Falco / GuardDuty runtime monitoring
├── Cosign signature                ├── Audit log analysis
└── SBOM generated                  └── Drift detection
```

| Layer | Tool |
|-------|------|
| **Image vulnerabilities** | Trivy, ECR enhanced scanning |
| **Signature verification at admission** | Kyverno + cosign |
| **Runtime behaviour** | Falco, GuardDuty EKS Protection |
| **Misconfiguration audit** | kube-bench (CIS benchmark), kubescape |

✅ Enable **GuardDuty EKS Protection** — it analyses the control plane audit log and runtime activity for known attack patterns with no agent work from you.

## The Practical Hardening Checklist

- [ ] No `cluster-admin` for humans — namespace-scoped RoleBindings with ClusterRoles
- [ ] Dedicated ServiceAccount per workload, `automountServiceAccountToken: false` by default
- [ ] `restricted` Pod Security enforced on application namespaces
- [ ] Default-deny NetworkPolicy per namespace
- [ ] Private API endpoint, audit logs on, etcd encrypted with KMS
- [ ] IMDSv2 with hop limit 1 on all nodes
- [ ] Images scanned and signed; admission policy rejects unsigned or non-ECR images
- [ ] Pod-level IAM via Pod Identity; node role kept minimal
- [ ] No long-lived kubeconfig files — access through IAM and short-lived tokens

## Interview Q&A

**Q: Explain Kubernetes RBAC and the difference between a Role and a ClusterRole.**

RBAC has four objects. A Role or ClusterRole is a list of permissions — API groups, resources, and verbs — and a RoleBinding or ClusterRoleBinding grants those permissions to a user, group, or ServiceAccount. A Role is namespaced; a ClusterRole is either for cluster-scoped resources like nodes and PersistentVolumes, or a reusable permission set. The important combination is a ClusterRole bound with a RoleBinding: you define the permission set once centrally, then grant it namespace by namespace. The mistake to avoid is binding a broad ClusterRole with a ClusterRoleBinding, which silently grants it in every namespace when the intent was one.

**Q: Which RBAC permissions are effectively cluster-admin?**

Several that don't look dangerous. `list secrets` returns the full contents of every secret, since Kubernetes has no list-names-only permission. `create pods` lets a user mount any Secret in the namespace into a container they control, or run a pod with a hostPath mount and read the node's filesystem, so pod creation plus a permissive Pod Security setting is effectively node compromise. `create pods/exec` is a shell into any running pod. `escalate` and `bind` on roles let a user grant themselves permissions they do not have. And `impersonate` allows acting as any user or group, including cluster-admin. When reviewing access I look for these specifically rather than only checking who holds the admin role.

**Q: PodSecurityPolicy was removed. What replaced it and how do you use it?**

Pod Security Admission, a built-in admission controller configured with namespace labels rather than cluster-wide policy objects and bindings. There are three levels: privileged means no restrictions, baseline blocks known privilege escalations like privileged mode and host namespaces, and restricted enforces real hardening — non-root, no privilege escalation, all capabilities dropped, read-only root filesystem, seccomp. Each level can be set to enforce, audit, or warn, so the safe rollout is to start with warn and audit, fix what surfaces, then switch to enforce. The limitation compared with PSP is that it only covers pod security fields, so for anything else — required labels, allowed registries, mandatory resource limits — you add Kyverno or OPA Gatekeeper.

**Q: How could a compromised pod escalate to control the whole AWS account?**

The classic path is the instance metadata service. By default a pod can reach 169.254.169.254 and retrieve the node's IAM role credentials, and the node role is typically far more privileged than any single application's role — it can often pull from ECR, write logs, describe cluster resources, and sometimes more. From there an attacker moves laterally into AWS with credentials Kubernetes RBAC has no visibility into. The mitigations are enforcing IMDSv2 with a hop limit of 1, so the credential request cannot survive the extra hop out of a pod, keeping the node role minimal and giving pods their own permissions through Pod Identity or IRSA, and blocking egress to the metadata endpoint with a NetworkPolicy. Enforcing `restricted` Pod Security also prevents the privileged-container route to the same outcome.

**Q: What would you check first when auditing an existing cluster's security?**

Who holds cluster-admin, and whether any of those are humans or shared identities rather than narrowly scoped automation. Then the ServiceAccounts: whether workloads share the `default` account, whether tokens are automounted where the pod never calls the API, and what each account can actually do with `kubectl auth can-i --list`. Next, whether Pod Security is enforced at all — a cluster with no admission-level pod restrictions is one privileged pod away from node compromise. Then network posture: default-deny NetworkPolicies, whether the API endpoint is public, and whether IMDSv2 is enforced on nodes. Finally, whether control plane audit logging and etcd encryption are on, because without them you can neither investigate an incident nor claim Secrets were protected.

---

[← Persistent Volumes](./06-storage.md) | [Helm →](./08-helm.md)
