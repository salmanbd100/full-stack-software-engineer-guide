---
title: ConfigMaps & Secrets
part: 8
chapter: 0
slug: configmaps-secrets
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-03
tags: [devops, kubernetes, configmaps, secrets]
in_book: false
---

# ConfigMaps & Secrets

Configuration belongs outside the image. The same image should run in dev, staging, and production with only its config changing.

## Why Config Must Leave the Image

```
❌ Config baked into the image:
   api:1.4-dev, api:1.4-staging, api:1.4-prod   → three different artifacts

✅ Config injected at runtime:
   api:1.4  +  dev ConfigMap
   api:1.4  +  prod ConfigMap                    → one tested artifact
```

> This is the build-once-promote-many principle applied to Kubernetes. If you rebuild the image per environment, the image you tested is not the image you shipped.

## ConfigMaps

For non-sensitive configuration: feature flags, log levels, endpoints, whole config files.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "50"
  # A whole file as a value
  nginx.conf: |
    server {
      listen 80;
      location /health { return 200; }
    }
```

### Two Ways to Consume It

**As environment variables:**

```yaml
spec:
  containers:
    - name: api
      envFrom:
        - configMapRef: { name: api-config }   # imports every key
      env:
        - name: LOG_LEVEL                       # or one specific key
          valueFrom:
            configMapKeyRef: { name: api-config, key: LOG_LEVEL }
```

**As mounted files:**

```yaml
      volumeMounts:
        - { name: config, mountPath: /etc/nginx/conf.d }
  volumes:
    - name: config
      configMap:
        name: api-config
        items:
          - { key: nginx.conf, path: default.conf }
```

| | Environment Variables | Mounted Files |
|-|---------------------|---------------|
| **Updates without restart** | ❌ Never — fixed at container start | ✅ Yes, file content refreshes |
| **Good for** | Simple scalars | Config files, certificates |
| **Visible in** | `kubectl describe pod`, crash dumps, child processes | Filesystem only |
| **Size** | Small values | Up to ~1 MiB per ConfigMap |

⚠️ **The most common ConfigMap surprise:** updating a ConfigMap does **not** restart pods. With `envFrom`, pods keep the old values indefinitely. With volume mounts, the file updates within about a minute but the application must watch the file to notice.

✅ **Force a rollout on config change** by hashing the config into the pod template annotation:

```yaml
template:
  metadata:
    annotations:
      checksum/config: "a3f9c21e..."   # Helm: {{ include (print $.Template.BasePath "/cm.yaml") . | sha256sum }}
```

This changes the pod template, which triggers a normal rolling update. Without it, config changes silently do nothing.

## Secrets — And Why They Are Not Really Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:            # plaintext here; Kubernetes base64-encodes it for you
  username: apiuser
  password: s3cr3t
```

⚠️ **Secrets are base64-encoded, not encrypted.** Base64 is an encoding, not a security control:

```bash
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d
# s3cr3t
```

**What actually makes a Secret secure:**

| Control | Without It |
|---------|-----------|
| **Encryption at rest in etcd** (KMS provider) | Anyone with an etcd snapshot reads every secret |
| **RBAC restricting `get secrets`** | Any developer with read access dumps all credentials |
| **No secrets in git** | Permanent leak in history |
| **Prefer file mounts over env vars** | Env vars appear in crash dumps and leak to child processes |

✅ On EKS, enable envelope encryption with a customer-managed KMS key at cluster creation. This is the control that makes Kubernetes Secrets acceptable at all.

❌ **Never commit a Secret manifest to git.** Even in a private repo — it is in history forever, visible to every clone and every CI cache.

### Secret Types

| Type | Purpose |
|------|---------|
| `Opaque` | Arbitrary key-value (default) |
| `kubernetes.io/dockerconfigjson` | Private registry pull credentials |
| `kubernetes.io/tls` | TLS certificate and key |
| `kubernetes.io/service-account-token` | ServiceAccount token |

**Registry credentials:**

```yaml
spec:
  imagePullSecrets:
    - name: ecr-credentials
```

✅ On EKS you rarely need this — give the node role or the pod's IAM role `ecr:GetAuthorizationToken` and image pulls authenticate automatically.

## The Real Answer on AWS: External Secrets Operator

Storing secrets in Kubernetes at all is the weak point. Better: keep them in AWS Secrets Manager and sync them in.

```
AWS Secrets Manager (source of truth: rotation, audit, versioning)
        │
        ▼  External Secrets Operator polls and syncs
Kubernetes Secret (a cache, recreated on change)
        │
        ▼
      Pod
```

```yaml
apiVersion: external-secrets.io/v1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef: { name: eso-sa }   # IRSA / Pod Identity
---
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h                # picks up rotation automatically
  secretStoreRef: { name: aws-secrets, kind: SecretStore }
  target:
    name: db-credentials             # the K8s Secret it creates
  data:
    - secretKey: password
      remoteRef:
        key: prod/db/credentials
        property: password
```

**Why this is the standard production pattern:**

| Benefit | Detail |
|---------|--------|
| **Nothing sensitive in git** | The manifest holds only a *reference* |
| **Rotation works** | Rotate in Secrets Manager; ESO syncs within `refreshInterval` |
| **Central audit** | CloudTrail records every secret access |
| **Cross-cluster** | One source of truth for all clusters and environments |

✅ Pair with the checksum-annotation trick or Reloader so pods actually restart when a synced secret changes.

**Alternative — Secrets Store CSI Driver:** mounts secrets from Secrets Manager directly as files, with no Kubernetes Secret object at all. Stronger isolation, but only file mounts (no env vars) and the pod must restart to pick up changes.

## GitOps-Safe Alternatives

If you want secrets *in* git for GitOps, they must be encrypted before commit.

| Tool | How It Works |
|------|-------------|
| **Sealed Secrets** | Encrypt with the cluster controller's public key. Only that cluster can decrypt |
| **SOPS + KMS** | Encrypt values with a KMS key; decrypt in the pipeline or by the operator |
| **External Secrets Operator** | ✅ No secret in git at all — only a reference |

> Ranked for production on AWS: External Secrets Operator > Secrets Store CSI Driver > SOPS > Sealed Secrets > plain Kubernetes Secrets.

## Immutable ConfigMaps and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config-v3      # version in the name
immutable: true
data:
  LOG_LEVEL: "info"
```

**Benefits:**
- Prevents accidental edits breaking running pods
- The kubelet stops watching it, reducing API server load significantly on large clusters
- Forces a versioned, explicit rollout: create `-v4`, update the Deployment reference

✅ On clusters with thousands of pods, immutable ConfigMaps are a real performance improvement — every non-immutable ConfigMap and Secret is watched by every kubelet that mounts it.

## Configuration Precedence

When several sources define the same variable, later wins:

```
1. Image ENV (Dockerfile)
2. envFrom (ConfigMap, then Secret in listed order)
3. env (explicit entries)          ← highest precedence
```

```yaml
env:
  - name: LOG_LEVEL
    value: "debug"        # wins over envFrom, useful for a temporary override
envFrom:
  - configMapRef: { name: api-config }
```

## Interview Q&A

**Q: Are Kubernetes Secrets actually secure?**

Not by default. A Secret is base64-encoded, which is an encoding rather than encryption — anyone who can read the object gets the value with a single command. Three controls make them acceptable. First, encryption at rest: configure a KMS provider so etcd stores them encrypted, which on EKS means enabling envelope encryption with a customer-managed key at cluster creation. Second, RBAC: `get secrets` in a namespace is effectively full credential access, so it should be tightly restricted and audited. Third, keep them out of git. For production on AWS I would go further and keep the source of truth in Secrets Manager, syncing values in with the External Secrets Operator so rotation and audit happen centrally and no sensitive value is ever committed.

**Q: You update a ConfigMap. What happens to the running pods?**

Nothing automatically, and this catches people out. If the config was injected with `envFrom` or `env`, the values were resolved when the container started and will never change — the pods keep the old configuration until they are recreated for some unrelated reason. If it was mounted as a volume, the files on disk are updated within roughly a minute, but the application still has to watch the file and reload to actually use the new values. The standard fix is to hash the config content into an annotation on the pod template, so any config change alters the pod template and triggers a normal rolling update. Helm does this with a `checksum/config` annotation; tools like Reloader automate the same thing.

**Q: How would you manage secrets for an application on EKS?**

Keep the source of truth in AWS Secrets Manager, and use the External Secrets Operator to sync them into Kubernetes Secrets. The operator authenticates to AWS through a ServiceAccount backed by Pod Identity or IRSA, so there are no static credentials anywhere. The manifest committed to git contains only a reference to the secret name, never a value, which makes the whole thing GitOps-safe. Rotation happens in Secrets Manager and the operator picks it up on its refresh interval, with CloudTrail providing a central audit trail across every cluster. I would also enable etcd encryption with a customer-managed KMS key, restrict `get secrets` through RBAC, and mount secrets as files rather than environment variables, since environment variables leak into crash dumps, process listings, and child processes.

**Q: Environment variables or mounted files for configuration?**

Environment variables are simpler and fine for non-sensitive scalars like a log level, but they have two real drawbacks: they are fixed at container start so they can never be updated in place, and they are broadly visible — in `kubectl describe pod`, in crash dumps, and inherited by any child process the application spawns. Mounted files avoid both problems: the content refreshes when the ConfigMap or Secret changes, and access is scoped to the filesystem. So I use environment variables for ordinary configuration and file mounts for anything sensitive and for whole config files like an nginx or TLS configuration.

**Q: What are immutable ConfigMaps and why use them?**

Setting `immutable: true` means the object's data can never be changed — to alter configuration you create a new, differently named ConfigMap and update the Deployment to reference it. There are two benefits. Operationally it prevents someone editing a live ConfigMap in a way that breaks pods on their next restart, and it forces configuration changes to go through a versioned, explicit rollout that is visible in the Deployment's revision history. Technically it is a meaningful performance win on large clusters: kubelets watch every mutable ConfigMap and Secret they mount, so on a cluster with thousands of pods those watches put real sustained load on the API server, and immutability removes them entirely.

---

[← Services & Networking](./04-services-networking.md) | [Persistent Volumes →](./06-storage.md)
