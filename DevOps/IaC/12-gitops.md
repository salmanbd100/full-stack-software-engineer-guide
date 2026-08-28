---
title: GitOps
part: 8
chapter: 0
slug: gitops
level: intermediate # beginner | intermediate | advanced
reading_time: 17
updated: 2026-08-03
tags: [devops, iac, gitops]
in_book: false
---

# GitOps

GitOps is a deployment model where Git is the single source of truth, and an agent running **inside** the cluster continuously pulls and applies it.

## The Core Idea

The shift is from **push** to **pull**.

```
❌ Push (traditional CI/CD):
   CI pipeline holds cluster credentials → kubectl apply → cluster
   The pipeline reaches into the cluster.

✅ Pull (GitOps):
   CI pipeline → updates a Git repo
                        ↑
                  agent in cluster polls, then applies
   The cluster reaches out. Nothing external has credentials.
```

**The four GitOps principles:**

| Principle | Meaning |
|-----------|---------|
| **Declarative** | The whole system is described as data, not scripts |
| **Versioned** | Git is the single source of truth, with full history |
| **Pulled automatically** | An agent applies approved changes without being told |
| **Continuously reconciled** | The agent corrects drift, not just deploys |

> The last one is what makes GitOps more than "CI/CD with YAML in Git". The agent runs the reconciliation loop forever, so a manual `kubectl edit` gets reverted within minutes.

## Why Pull Beats Push

| | Push (`kubectl` from CI) | Pull (GitOps agent) |
|---|---|---|
| **Cluster credentials** | 🔴 In the CI system | ✅ Never leave the cluster |
| **Cluster network** | Must be reachable from CI | Can be fully private |
| **Drift** | Undetected until the next deploy | Corrected continuously |
| **What is deployed** | Whatever the last pipeline did | Whatever Git says, always |
| **Rollback** | Re-run an older pipeline | `git revert` |
| **New cluster** | Replay the pipeline history | Point the agent at the repo |

✅ **The credential argument is the strongest one.** In push mode, compromising your CI system gives an attacker cluster-admin on production. In pull mode, CI can only write to a Git repository — a change that is reviewable and revertible.

## Argo CD

The most widely used GitOps tool. It has a good UI, which is why teams pick it.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-api
  namespace: argocd
spec:
  project: production

  source:
    repoURL: https://github.com/acme/k8s-manifests
    targetRevision: main
    path: apps/payments-api/overlays/prod

  destination:
    server: https://kubernetes.default.svc
    namespace: payments

  syncPolicy:
    automated:
      prune: true       # delete resources removed from Git
      selfHeal: true    # revert manual cluster changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff: { duration: 10s, factor: 2, maxDuration: 3m }
```

**The two settings that define the behaviour:**

| Setting | Off | On |
|---------|-----|-----|
| `prune` | Deleting from Git leaves the resource running | Deleting from Git deletes the resource |
| `selfHeal` | A manual `kubectl edit` survives | Reverted within minutes |

⚠️ `prune: true` is what makes Git genuinely authoritative — but it means deleting a file deletes production resources. Combine it with branch protection and the `Prune=false` annotation on anything that must never be auto-deleted.

**The ApplicationSet pattern** — generate Applications rather than writing dozens by hand:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-services
spec:
  generators:
    - git:
        repoURL: https://github.com/acme/k8s-manifests
        revision: main
        directories:
          - path: apps/*/overlays/prod
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/acme/k8s-manifests
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[1]}}'
      syncPolicy:
        automated: { prune: true, selfHeal: true }
```

Adding a new service directory to the repo creates its Application automatically.

**Sync waves** — control ordering within a sync:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"    # database migrations first
```

Lower numbers apply first. Argo CD waits for each wave to be healthy before starting the next.

## Flux CD

The other main option. No built-in UI, but a cleaner controller model and native Kubernetes CRDs throughout.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: manifests
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/acme/k8s-manifests
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: payments-api
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/payments-api/overlays/prod
  prune: true
  sourceRef:
    kind: GitRepository
    name: manifests
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: payments-api
      namespace: payments
```

**Flux can also watch a container registry and update Git itself:**

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: payments-api
spec:
  imageRepositoryRef: { name: payments-api }
  policy:
    semver: { range: '>=1.0.0 <2.0.0' }
```

Flux detects a new matching image, commits the updated tag to Git, then deploys from that commit. Git stays the source of truth even for automated image bumps.

| | Argo CD | Flux |
|---|---|---|
| **UI** | ✅ Strong, widely liked | CLI and CRDs only |
| **Model** | Application CRD | Composable source + reconciler CRDs |
| **Multi-tenancy** | Projects and RBAC | Namespace-scoped, Kubernetes RBAC |
| **Image automation** | Argo CD Image Updater (add-on) | ✅ Built in |
| **Progressive delivery** | Argo Rollouts | Flagger |
| **Best for** | Teams wanting visibility | Teams wanting Kubernetes-native composition |

✅ Both are CNCF graduated. Either is a defensible choice — Argo CD if visibility matters, Flux if you prefer everything as CRDs.

## Repository Structure

**Separate the application code from the manifests.** This is the most common structural question.

```
acme/payments-api          ← application source + Dockerfile + CI
acme/k8s-manifests         ← Kubernetes YAML, watched by the GitOps agent
```

**Why separate:**

- ✅ A deploy is a commit to the manifests repo — a clean audit trail
- ✅ CI does not need cluster access, only permission to open a PR
- ✅ One manifests repo shows everything running in the cluster
- ❌ The cost: two commits per change, and version correlation takes effort

**Inside the manifests repo — branches or directories?**

❌ **Branch per environment** (`dev`, `staging`, `prod` branches):

- Promotion means merging, so environment-specific config causes conflicts forever
- You cannot see the difference between environments in one place
- Cherry-picking becomes routine, which is a bad sign

✅ **Directory per environment with Kustomize overlays:**

```
apps/payments-api/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml     # replicas: 1, dev image tag
    │   └── patch-resources.yaml
    ├── staging/
    └── prod/
        ├── kustomization.yaml     # replicas: 6, HPA, PDB
        └── patch-resources.yaml
```

```yaml
# overlays/prod/kustomization.yaml
resources:
  - ../../base
patches:
  - path: patch-resources.yaml
images:
  - name: payments-api
    newTag: a3f9c21          # ← CI updates exactly this line
replicas:
  - name: payments-api
    count: 6
```

✅ Promotion is a one-line change: copy the image tag from the staging overlay to the prod overlay. The diff in the pull request is exactly the change being promoted.

## The Full Deployment Flow

```
1. Developer merges to main in the application repo
        ↓
2. CI builds and tests, pushes image acme/api:a3f9c21 to ECR
        ↓
3. CI opens a PR on the manifests repo:
   overlays/staging/kustomization.yaml — newTag: a3f9c21
        ↓
4. PR merged (auto-merge for staging, review for prod)
        ↓
5. GitOps agent notices the commit within a minute
        ↓
6. Agent applies it; reports Synced / Healthy
        ↓
7. Promotion to prod = the same one-line change in the prod overlay
```

**The CI step that updates the manifests repo:**

```yaml
- name: Bump staging image tag
  run: |
    git clone https://x-access-token:${{ secrets.MANIFESTS_TOKEN }}@github.com/acme/k8s-manifests.git
    cd k8s-manifests/apps/payments-api/overlays/staging
    kustomize edit set image payments-api=$ECR/payments-api:${{ github.sha }}
    git commit -am "deploy payments-api ${{ github.sha }} to staging"
    git push
```

⚠️ Note what CI has here: a token that can push to one Git repository. Not cluster credentials. That is the whole security benefit.

## Secrets in GitOps

The obvious problem: manifests are in Git, and Secrets cannot be.

| Approach | How | Verdict |
|----------|-----|---------|
| **External Secrets Operator** | Operator pulls from AWS Secrets Manager into a Kubernetes Secret | ✅ Best on AWS |
| **Sealed Secrets** | Encrypt with a cluster public key; only that cluster can decrypt | ✅ Good, self-contained |
| **SOPS + KMS** | Encrypted files in Git, Flux decrypts with KMS | ✅ Good, works with Flux natively |
| **Plain Secret in Git** | Base64 is not encryption | 🔴 Never |

```yaml
# External Secrets Operator — the manifest holds a reference, not a value
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-api
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: payments-api-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: acme/prod/payments/database-url
```

✅ This keeps GitOps intact: the desired state in Git is "this secret comes from that Secrets Manager path", which is a declarative fact worth versioning. The value itself lives where it belongs.

## GitOps for Infrastructure, Not Just Apps

GitOps for Kubernetes manifests is standard. Extending it to cloud infrastructure is a maturity question interviewers like.

| Tool | Approach |
|------|----------|
| **Crossplane** | Cloud resources as Kubernetes CRDs; the cluster reconciles AWS |
| **AWS Controllers for Kubernetes (ACK)** | AWS-maintained controllers per service |
| **Terraform in a pipeline** | Not GitOps by the strict definition — push, not pull |

```yaml
# Crossplane — an RDS instance as a Kubernetes resource
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: payments-db
spec:
  forProvider:
    region: eu-west-1
    instanceClass: db.r6g.large
    engine: postgres
    storageEncrypted: true
```

⚠️ **Be honest about this in interviews.** A Terraform pipeline is excellent CI/CD for infrastructure, but it is push-based and only reconciles when it runs, so it is not GitOps in the strict sense. The pragmatic answer most teams land on: GitOps for everything inside the cluster, Terraform in a pipeline for the cloud account and cluster itself, with scheduled drift detection filling the reconciliation gap.

## Common Problems

| Problem | Cause | Fix |
|---------|-------|-----|
| App stuck `OutOfSync` | A controller mutates a field the agent keeps reverting | `ignoreDifferences` for that field |
| Sync loop every minute | A webhook or defaulting controller rewrites the resource | Identify the mutator, ignore that path |
| Manual fix keeps disappearing | `selfHeal: true` doing exactly its job | Change Git, not the cluster |
| Deleted a file, production went down | `prune: true` doing exactly its job | Branch protection; `Prune=false` on critical resources |
| Cannot tell which commit is live | No traceability from image to commit | Tag images with the Git SHA |

✅ "The manual fix keeps disappearing" is the most common complaint from teams new to GitOps. It is not a bug — it is the reconciliation loop working. The cultural shift is that the cluster is no longer somewhere you make changes.

## Interview Q&A

**Q: What is GitOps and how does it differ from normal CI/CD?**

GitOps makes Git the single source of truth for the deployed state, with an agent running inside the target environment that continuously pulls from Git and reconciles reality against it. The difference from conventional CI/CD is direction and persistence. Conventional CI/CD pushes: the pipeline holds cluster credentials and runs `kubectl apply`, then stops caring. GitOps pulls: the pipeline only commits to a repository, and the in-cluster agent applies it. Because the agent keeps reconciling rather than running once, drift gets corrected automatically — someone editing a deployment by hand sees it reverted within minutes. That continuous reconciliation is the real distinguishing property; a pipeline that applies YAML from Git is not GitOps if it only runs when triggered.

**Q: Why is pull better than push?**

Mainly credentials. In push mode, your CI system holds cluster-admin, so compromising CI — a malicious dependency, a leaked token, a workflow injection — gives an attacker production. In pull mode, CI can only open a pull request against a Git repository, which is reviewable and revertible, and the cluster credentials never leave the cluster. It also means the cluster's API server does not need to be reachable from your CI provider, so it can be fully private with no ingress. Beyond security, pull gives you continuous drift correction rather than drift that sits undetected until the next deploy, and rebuilding a cluster becomes pointing a fresh agent at the repository instead of replaying pipeline history.

**Q: Branch per environment, or directory per environment?**

Directories with overlays, essentially always. Branch-per-environment sounds tidy but breaks down immediately, because each environment has genuinely different configuration — replica counts, resource limits, ingress hostnames — so those differences live as permanent divergence between branches. Every promotion merge then hits conflicts on exactly those files, and teams end up cherry-picking, which loses the audit trail. With directories, `base/` holds what is common and each overlay patches what differs, so you can see all three environments side by side in one commit. Promotion becomes a one-line change: copy the image tag from the staging overlay to the production overlay. The pull request diff is then exactly the change being promoted, which is what a reviewer actually needs to see.

**Q: How do you handle secrets in GitOps?**

The manifest in Git holds a reference, never a value. On AWS the best fit is External Secrets Operator: you commit an `ExternalSecret` resource that says which Secrets Manager path to read, and the operator creates the actual Kubernetes Secret in the cluster and refreshes it on an interval. Nothing sensitive is in Git, and the desired state — "this secret comes from that path" — is still declarative and worth versioning, so GitOps is intact. The alternatives are Sealed Secrets, where you encrypt with a public key that only the target cluster can decrypt, and SOPS with KMS, which Flux supports natively. What you never do is commit a plain Kubernetes Secret, because base64 is encoding, not encryption, and anyone who can read the repository can read the value.

**Q: What do `prune` and `selfHeal` do, and what are the risks?**

`prune` means resources removed from Git get deleted from the cluster, and `selfHeal` means manual changes in the cluster get reverted to what Git says. Together they are what make Git genuinely authoritative rather than merely advisory. Both have sharp edges. With `prune` enabled, deleting a file — or an accidental bad merge that removes a directory — deletes production resources, so it needs branch protection and a `Prune=false` annotation on anything that must never be auto-removed. `selfHeal` is what causes the most confusion for teams new to GitOps: someone fixes something with `kubectl edit` during an incident and watches it revert a minute later. That is correct behaviour, but it requires a cultural shift, because the cluster stops being a place you make changes. For genuine emergencies you disable auto-sync for that Application, fix it, then reconcile Git.

**Q: Can you do GitOps for cloud infrastructure, not just Kubernetes?**

Yes, but be precise about the definition. Tools like Crossplane and AWS Controllers for Kubernetes represent cloud resources as Kubernetes custom resources, so an in-cluster controller reconciles your AWS estate — that is genuinely GitOps, with continuous reconciliation and no external credentials. A Terraform pipeline is not, strictly speaking: it is push-based and only reconciles when it runs, so between runs drift is invisible. That does not make it wrong, and it is what most teams use, but the honest framing is that a Terraform pipeline is excellent CI/CD for infrastructure rather than GitOps. The pragmatic split most organisations land on is GitOps for everything inside the cluster, Terraform in a pipeline for the AWS account and the cluster itself, and scheduled drift detection to cover the reconciliation gap Terraform leaves open.

---
[← CloudFormation](./11-cloudformation.md) | [Terraform Index](../Terraform/README.md) | [DevOps](../README.md)
