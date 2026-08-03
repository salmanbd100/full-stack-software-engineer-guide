# Container Security

Container security spans four distinct stages, and interviewers want to hear that you cover all of them rather than just image scanning.

```
Build        →  Registry      →  Deploy         →  Runtime
minimal base    scan, sign       admission       detect, contain
non-root        immutable tags   policy          least privilege
no secrets      lifecycle        no privileged   network policy
```

> For Dockerfile hardening see [Docker Security](../Docker/06-docker-security.md); for Kubernetes RBAC and Pod Security see [Kubernetes RBAC & Security](../Kubernetes/07-rbac-security.md). This file covers the AWS-side controls and how the stages connect.

## Stage 1 — Build

**The three things that matter most:**

```dockerfile
# ✅ Distroless: no shell, no package manager, minimal attack surface
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# ✅ Non-root — distroless provides an unprivileged user
USER nonroot
EXPOSE 3000
CMD ["dist/server.js"]
```

| Control | Why |
|---------|-----|
| **Multi-stage build** | Build tools and source never reach the final image |
| **Distroless or Alpine** | 🔴 No shell means no interactive shell for an attacker |
| **`USER nonroot`** | Container escape starts from an unprivileged account |
| **No secrets in layers** | Every layer is retrievable from the registry forever |
| **Pin base image by digest** | `node:22-alpine` moves; a digest does not |

🔴 **A secret in any layer is in the image permanently**, even if a later layer deletes it. `docker history` and layer extraction reveal it.

```dockerfile
# ❌ The secret is in layer 2 forever, despite being removed in layer 3
RUN echo "$NPM_TOKEN" > .npmrc && npm ci && rm .npmrc

# ✅ BuildKit secret mount — never written to a layer
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```

## Stage 2 — Registry (ECR)

```hcl
resource "aws_ecr_repository" "app" {
  name = "payments-api"

  # 🔴 Prevents a tag being overwritten — critical for supply chain integrity
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }
}

# Enhanced scanning via Amazon Inspector — continuous, not just on push
resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "CONTINUOUS_SCAN"
    repository_filter {
      filter      = "*"
      filter_type = "WILDCARD"
    }
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep 30 most recent tagged images"
      selection = {
        tagStatus     = "tagged"
        tagPrefixList = ["v"]
        countType     = "imageCountMoreThan"
        countNumber   = 30
      }
      action = { type = "expire" }
    }]
  })
}
```

🔴 **`IMMUTABLE` tags are the most important setting here.** With mutable tags, an attacker who compromises CI can push a malicious image over `v1.2.3`, and everything that pulls that tag runs it — while the git history and audit trail still show the original.

**Basic vs enhanced scanning:**

| | Basic | Enhanced (Inspector) |
|---|---|---|
| **Trigger** | On push | ✅ Continuous rescanning |
| **Scope** | OS packages | ✅ OS **and** language dependencies |
| **New CVE published** | 🔴 Not detected until re-pushed | ✅ Existing images re-evaluated |
| **Cost** | Free | Per image per month |

✅ **Continuous scanning matters because vulnerabilities are discovered after you build.** An image scanned clean in June may be critically vulnerable in August, and basic scanning will never tell you.

## Image Signing and Provenance

✅ **Scanning tells you an image has known flaws. Signing tells you it is the image you built.**

```bash
# Sign with cosign, keylessly, using the CI workload identity
cosign sign --yes \
  "$ECR_REGISTRY/payments-api@$DIGEST"

# Verify — pinned to the exact repo and workflow that may produce images
cosign verify \
  --certificate-identity-regexp "https://github.com/acme/payments-api/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "$ECR_REGISTRY/payments-api@$DIGEST"
```

✅ **Keyless signing is the modern approach** — there is no signing key to protect. The signature is bound to the CI workload's OIDC identity, so verification proves *which workflow in which repository* built the image.

| Artifact | Proves |
|----------|--------|
| **Signature** | This image came from our pipeline |
| **SBOM** | What is inside it — required to answer "are we affected by this CVE?" |
| **Provenance (SLSA)** | How it was built: source commit, builder, parameters |

✨ **The SBOM is what turns a zero-day announcement from a week of investigation into a query.** When the next Log4Shell lands, you search SBOMs instead of rebuilding everything to find out.

## Stage 3 — Deploy: Admission Control

Scanning and signing are worthless if the cluster runs unsigned or vulnerable images anyway. Admission control is the enforcement point.

```yaml
# Kyverno: only run images signed by our pipeline
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce      # ✅ block, don't just warn
  webhookTimeoutSeconds: 10
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds: [Pod]
              namespaces: [production]
      verifyImages:
        - imageReferences:
            - "111122223333.dkr.ecr.eu-west-1.amazonaws.com/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/acme/*/.github/workflows/release.yml@refs/heads/main"
                    issuer: "https://token.actions.githubusercontent.com"
---
# Block the container settings that enable escape
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-privileged
spec:
  validationFailureAction: Enforce
  rules:
    - name: no-privileged-or-host-namespace
      match:
        any: [{ resources: { kinds: [Pod] } }]
      validate:
        message: "Privileged containers and host namespaces are not permitted"
        pattern:
          spec:
            =(hostPID): "false"
            =(hostIPC): "false"
            =(hostNetwork): "false"
            containers:
              - =(securityContext):
                  =(privileged): "false"
                  =(allowPrivilegeEscalation): "false"
```

**Pod Security Standards** — the built-in, simpler baseline:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: restricted
```

| Level | Blocks |
|-------|--------|
| `privileged` | Nothing |
| `baseline` | Privileged containers, host namespaces, most capabilities |
| ✅ `restricted` | Also requires non-root, read-only root filesystem, dropped capabilities, seccomp |

✅ **Start with Pod Security Standards `restricted`**, then add Kyverno or OPA Gatekeeper only for policies PSS cannot express — like signature verification and registry allowlisting.

**The hardened pod spec that `restricted` requires:**

```yaml
spec:
  automountServiceAccountToken: false    # ✅ unless the pod calls the K8s API
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    fsGroup: 10001
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: app
      image: 111122223333.dkr.ecr.eu-west-1.amazonaws.com/app@sha256:abc123...
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: { drop: ["ALL"] }
      resources:
        limits: { memory: 512Mi, cpu: 500m }
        requests: { memory: 256Mi, cpu: 100m }
      volumeMounts:
        - { name: tmp, mountPath: /tmp }   # writable scratch, since root is read-only
  volumes:
    - name: tmp
      emptyDir: {}
```

## Stage 4 — Runtime

Everything above is preventive. Runtime security assumes prevention failed.

| Tool | Detects |
|------|---------|
| **GuardDuty Runtime Monitoring** | ✅ AWS-native; malicious behaviour in EKS/ECS |
| **Falco** | Syscall-level rules — shell spawned, sensitive file read |
| **Amazon Inspector** | Vulnerabilities in running workloads |

```yaml
# Falco rule: a shell in a production container is almost always an intrusion
- rule: Shell in container
  desc: A shell was spawned inside a running container
  condition: >
    spawned_process and container
    and shell_procs
    and not container.image.repository in (allowed_debug_images)
  output: >
    Shell spawned (user=%user.name container=%container.name
    image=%container.image.repository cmd=%proc.cmdline)
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

✅ **On distroless images this rule is nearly zero-false-positive** — there is no shell to spawn legitimately, so a shell process means something is very wrong.

🔴 **The IMDS credential theft path** — a favourite scenario question:

```
1. Attacker achieves SSRF or RCE in a pod
2. Requests http://169.254.169.254/latest/meta-data/iam/security-credentials/
3. Receives the NODE's IAM role credentials
4. That role can typically pull from ECR, write logs, describe instances...
```

✅ **Blocking it, in layers:**

```hcl
# Require IMDSv2 and prevent container hops
metadata_options {
  http_tokens                 = "required"   # IMDSv2 — SSRF cannot do a PUT
  http_put_response_hop_limit = 1            # 🔴 containers are hop 2 — blocked
  http_endpoint               = "enabled"
}
```

```yaml
# Belt and braces: NetworkPolicy denying the link-local address
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-imds
  namespace: production
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except: ["169.254.169.254/32"]    # ✅ block IMDS
    - to:                                      # allow DNS
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
      ports:
        - { protocol: UDP, port: 53 }
```

> ✅ **`http_put_response_hop_limit = 1` is the elegant fix.** IMDSv2 requires a PUT to obtain a token, and the response TTL decrements per hop — a container is one hop further than the host, so the token response never reaches it while host-level agents still work.

## Pod Identity — Not Node Roles

🔴 **If pods use the node's IAM role, every pod has every permission any pod needs.**

```hcl
# ✅ EKS Pod Identity — simpler than IRSA, no OIDC trust policy templating
resource "aws_eks_pod_identity_association" "payments" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "production"
  service_account = "payments-api"
  role_arn        = aws_iam_role.payments.arn
}

resource "aws_iam_role" "payments" {
  name = "eks-payments-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "pods.eks.amazonaws.com" }
      Action    = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}
```

✅ **Pod Identity is the current recommendation**; IRSA still works and is what most existing clusters use. Either way, the node role should hold only what the kubelet and CNI genuinely need.

## Fargate vs EC2 Nodes

| | EC2 nodes | Fargate |
|---|---|---|
| **Node OS patching** | 🔴 Yours | ✅ AWS |
| **Kernel isolation** | Shared between pods on a node | ✅ Per-pod microVM |
| **Privileged containers** | Possible | 🔴 Not permitted |
| **DaemonSets** | ✅ Supported | Not supported |
| **Runtime security agents** | ✅ Falco, GuardDuty agent | Limited |

✅ **Fargate removes a whole class of risk** — no shared kernel between pods and no node OS to patch. The tradeoff is no DaemonSets, so runtime security tooling and log shippers need a different approach.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Mutable image tags | 🔴 Malicious image pushed over a known-good tag | `image_tag_mutability = "IMMUTABLE"` |
| Scan on push only | New CVEs never detected | Enhanced continuous scanning |
| Scanning without admission control | Vulnerable images still run | Kyverno / PSS enforcement |
| Pods using the node IAM role | Every pod has every permission | Pod Identity or IRSA |
| IMDSv1 allowed | SSRF steals node credentials | `http_tokens = "required"`, hop limit 1 |
| Running as root | Escape starts privileged | `runAsNonRoot`, `USER` in the Dockerfile |
| Secret in a build layer | In the registry forever | BuildKit secret mounts |
| `automountServiceAccountToken` left on | Token available to any code in the pod | Disable unless needed |
| Deploying by tag, not digest | Tag may point elsewhere | Deploy by `@sha256:` digest |

## Interview Q&A

**Q: How do you secure a container pipeline end to end?**

In four stages, because controls at one stage do not compensate for gaps in another. At build: multi-stage builds so compilers and source never reach the final image, a distroless or minimal base so there is no shell for an attacker to use, a non-root user, base images pinned by digest, and BuildKit secret mounts so credentials never land in a layer. At the registry: immutable tags, KMS encryption, and Inspector enhanced scanning with continuous rescanning, plus cosign signatures and an SBOM. At deploy: admission control that actually enforces — Pod Security Standards set to restricted, and Kyverno verifying signatures and blocking privileged containers, so an image that failed scanning cannot run. At runtime: GuardDuty Runtime Monitoring or Falco to detect behaviour that prevention missed, NetworkPolicy to limit lateral movement, and per-pod IAM through Pod Identity so a compromised pod holds only its own permissions.

**Q: Why do immutable tags matter?**

Because mutable tags break the link between what you reviewed and what runs. With mutable tags, anyone who can push to the registry — including an attacker who has compromised CI — can overwrite `v1.2.3` with a malicious image. Everything that pulls that tag then runs the malicious version, while git history, the pull request record, and the deployment audit trail all still show the original legitimate build. Nothing looks wrong. Setting `image_tag_mutability = "IMMUTABLE"` on the ECR repository makes that push fail. The complementary practice is deploying by digest rather than tag, so the manifest pins `@sha256:...` and there is no indirection at all — what is deployed is cryptographically identified. Together they make the supply chain verifiable rather than trusted.

**Q: What is the difference between basic and enhanced ECR scanning, and why does it matter?**

Basic scanning runs when an image is pushed and covers operating system packages. Enhanced scanning uses Amazon Inspector, covers both OS packages and language dependencies — npm, pip, Maven and so on — and crucially rescans existing images continuously as new vulnerabilities are published. That last property is the important one, because vulnerabilities are discovered after you build. An image that scanned completely clean in June may contain a critical remotely-exploitable flaw in August, and with basic scanning you will never learn that unless someone happens to rebuild and re-push. Continuous scanning re-evaluates what is already in the registry against the current CVE database, so you find out that your running production image is now vulnerable. It costs per image per month, which is easily justified for anything in production.

**Q: A pod is compromised via SSRF. How does the attacker escalate, and how do you prevent it?**

The standard path is the instance metadata service. The attacker uses the SSRF to make the pod request `http://169.254.169.254/latest/meta-data/iam/security-credentials/`, which returns temporary credentials for the *node's* IAM role — and node roles typically carry ECR pull, CloudWatch write, and EC2 describe permissions, which is a substantial foothold for reconnaissance and lateral movement. The primary prevention is IMDSv2 with `http_tokens = "required"`, because obtaining a token requires a PUT request with a header, which simple SSRF cannot construct. The elegant additional control is `http_put_response_hop_limit = 1`: the token response TTL decrements per network hop, and a container sits one hop further than the host, so the response never reaches the container while host-level agents keep working. On top of that, a NetworkPolicy denying egress to the link-local address, and per-pod IAM through Pod Identity so the node role holds almost nothing worth stealing.

**Q: Is scanning images enough?**

No, and this is the gap I look for. Scanning produces information; without an enforcement point it changes nothing. I have seen pipelines that scan diligently, generate reports nobody reads, and deploy the vulnerable image anyway because the scan step was set to continue on error. The enforcement point is admission control: Pod Security Standards at the restricted level blocks privileged containers, host namespaces, and running as root, and Kyverno or OPA Gatekeeper adds what PSS cannot express — verifying that the image carries a valid signature from your pipeline, and that it comes from your registry rather than an arbitrary public one. With `validationFailureAction: Enforce`, a pod that fails those checks simply does not start. Scanning also has to be continuous rather than push-time, and paired with an SBOM so that when the next widely-exploited CVE is announced you can answer "are we affected?" with a query instead of a week of investigation.

**Q: What security advantage does Fargate have over EC2 nodes?**

Two significant ones. First, there is no node operating system for you to patch — AWS owns the OS and the container runtime entirely, which removes an entire category of vulnerability management work and the risk of nodes drifting behind on patches. Second, and more importantly, each pod runs in its own microVM with its own kernel, so there is no shared kernel between workloads. On EC2 nodes, a container escape or a kernel vulnerability potentially exposes every pod co-located on that node; on Fargate the isolation boundary is hardware-assisted virtualisation. Fargate also refuses privileged containers outright, which eliminates the most common escape prerequisite. The tradeoffs are real: no DaemonSets, so log shippers and runtime security agents like Falco need a different pattern, less control over the node environment, and higher per-vCPU cost. For workloads handling sensitive data I would treat the isolation as worth it.

---
[Security Index](./README.md) | [← Encryption](./04-encryption.md) | [Infrastructure Security →](./06-infrastructure.md)
