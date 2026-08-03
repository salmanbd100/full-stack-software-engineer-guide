# Secrets Management

A secret is anything that grants access: database passwords, API keys, private keys, tokens. The goal is that no human ever sees one and no system stores one it does not need.

## The Hierarchy of Bad to Good

```
🔴 Hard-coded in source                 → in Git forever, every clone has it
🔴 In a committed .env file             → same problem, feels safer
🔴 Environment variable from a CI secret→ visible in process listings and crash dumps
⚠️  Environment variable from a vault    → better; still visible in the process
✅ Fetched at runtime, held in memory   → never on disk, never in an image
✅ No secret at all — IAM               → nothing to leak
```

> ✅ **The best secret is the one that does not exist.** IAM database authentication, IRSA, and instance profiles remove the credential entirely rather than protecting it.

## Secrets Manager vs Parameter Store

Both store secrets on AWS. The choice comes up constantly.

| | Secrets Manager | Parameter Store (SecureString) |
|---|---|---|
| **Cost** | ~$0.40/secret/month + API calls | ✅ Free (standard tier) |
| **Rotation** | ✅ Built in, with Lambda | 🔴 Build it yourself |
| **Cross-account** | ✅ Resource policy | Advanced tier only |
| **Size limit** | 64 KB | 4 KB (8 KB advanced) |
| **Random generation** | ✅ Yes | No |
| **RDS integration** | ✅ Native, managed rotation | No |
| **Versioning** | Staged labels (AWSCURRENT/AWSPREVIOUS) | Version history |

**The decision rule:**

| Use | For |
|-----|-----|
| **Secrets Manager** | Database credentials, anything needing rotation, cross-account secrets |
| **Parameter Store** | Configuration, API keys that rarely change, cost-sensitive high volume |

✅ A pragmatic split many teams use: Parameter Store for the hundreds of config values, Secrets Manager for the dozen things that genuinely rotate.

## The Best Answer: No Secret At All

### RDS Managed Passwords

```hcl
resource "aws_db_instance" "main" {
  identifier = "acme-prod"
  engine     = "postgres"
  username   = "app"

  # ✅ AWS generates the password, stores it in Secrets Manager, rotates it.
  # It never enters Terraform variables OR Terraform state.
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.rds.arn
}
```

> 🔴 **Remember the Terraform rule: anything you pass as a value ends up in state in plaintext.** `manage_master_user_password` is the only approach where the password never touches Terraform at all.

### IAM Database Authentication

Removes the password entirely — the application requests a short-lived token.

```hcl
resource "aws_db_instance" "main" {
  iam_database_authentication_enabled = true
}
```

```typescript
import { Signer } from "@aws-sdk/rds-signer";
import { Pool } from "pg";

interface DbConfig {
  host: string;
  port: number;
  user: string;
  database: string;
  region: string;
}

async function createPool(cfg: DbConfig): Promise<Pool> {
  const signer = new Signer({
    hostname: cfg.host,
    port: cfg.port,
    username: cfg.user,
    region: cfg.region,
  });

  return new Pool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    database: cfg.database,
    ssl: { rejectUnauthorized: true },
    // Token is valid for 15 minutes — regenerated per connection
    password: async (): Promise<string> => signer.getAuthToken(),
  });
}
```

✅ **There is no password to leak, rotate, or store.** Access is controlled by IAM, so revoking it is removing a policy — instant, and auditable in CloudTrail.

⚠️ IAM auth has a connection-rate limit (roughly 200 new connections per second), so it suits pooled applications rather than serverless functions opening a connection per invocation.

## Rotation

```hcl
resource "aws_secretsmanager_secret" "db" {
  name                    = "acme/prod/db"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 30    # ✅ deleted secrets are recoverable
}

resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotate.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

**The four-step rotation contract** — worth knowing because it explains why rotation is safe:

```
1. createSecret  → generate a new value, store as AWSPENDING
2. setSecret     → apply it to the service (change the DB password)
3. testSecret    → verify AWSPENDING actually works
4. finishSecret  → promote AWSPENDING to AWSCURRENT; old becomes AWSPREVIOUS
```

🔴 **The step that makes it safe is `testSecret`.** If the new credential does not work, rotation aborts and `AWSCURRENT` is untouched — so a broken rotation does not cause an outage.

⚠️ **`AWSPREVIOUS` matters for zero-downtime rotation.** Long-lived connections opened with the old password keep working until they recycle. Applications should catch an auth failure and re-fetch the secret rather than crashing.

✅ **Multi-user rotation** is the pattern for databases with zero tolerance for a failed connection: two users alternate, so one is always valid while the other rotates.

## Fetching Secrets in Applications

❌ **Fetch on every request** — adds latency and hits API throttling:

```typescript
// ❌ A Secrets Manager call per request
async function handler(): Promise<void> {
  const secret = await secretsManager.getSecretValue({ SecretId: "acme/prod/db" });
}
```

✅ **Cache with a TTL, and refresh on auth failure:**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

interface CachedSecret {
  value: string;
  fetchedAt: number;
}

class SecretCache {
  private cache = new Map<string, CachedSecret>();
  private readonly ttlMs: number;

  constructor(
    private readonly client: SecretsManagerClient,
    ttlSeconds = 300,
  ) {
    this.ttlMs = ttlSeconds * 1000;
  }

  async get(secretId: string, forceRefresh = false): Promise<string> {
    const cached = this.cache.get(secretId);
    const isFresh = cached && Date.now() - cached.fetchedAt < this.ttlMs;

    if (isFresh && !forceRefresh) return cached.value;

    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );

    const value = response.SecretString;
    if (!value) throw new Error(`Secret ${secretId} has no string value`);

    this.cache.set(secretId, { value, fetchedAt: Date.now() });
    return value;
  }

  // ✅ Called when a connection fails auth — handles rotation transparently
  async refresh(secretId: string): Promise<string> {
    return this.get(secretId, true);
  }
}
```

✨ **AWS provides this for you:** the Secrets Manager Agent (a sidecar with a local HTTP endpoint), the Parameters and Secrets Lambda Extension, and language-specific caching libraries. Prefer those over hand-rolled caches.

## Kubernetes: External Secrets Operator

🔴 **Kubernetes Secrets are base64, not encrypted.** Anyone with `get secrets` in the namespace, or read access to etcd, can read them.

✅ **The correct pattern: the manifest holds a reference, the operator fetches the value.**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager
spec:
  provider:
    aws:
      service: SecretsManager
      region: eu-west-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets    # ✅ uses IRSA — no stored credentials
            namespace: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-api
  namespace: production
spec:
  refreshInterval: 1h                 # ✅ picks up rotation automatically
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: payments-api-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: acme/prod/payments/database-url
    - secretKey: STRIPE_KEY
      remoteRef:
        key: acme/prod/payments/stripe
        property: api_key              # pull one field from a JSON secret
```

✅ **This keeps GitOps intact.** What is committed is "this secret comes from that Secrets Manager path" — a declarative fact worth versioning — while the value lives where it belongs.

**Also enable encryption of Secrets at rest in etcd:**

```hcl
resource "aws_eks_cluster" "main" {
  encryption_config {
    resources = ["secrets"]
    provider { key_arn = aws_kms_key.eks.arn }
  }
}
```

⚠️ That is envelope encryption for etcd. It protects against etcd disk access — it does **not** stop someone with `get secrets` RBAC from reading them. Both controls are needed.

## Injecting Secrets into Containers

```hcl
# ECS — pass the ARN; the agent fetches the value
resource "aws_ecs_task_definition" "app" {
  container_definitions = jsonencode([{
    name = "app"

    # ✅ ARN reference, resolved by the ECS agent at task start
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db.arn },
      { name = "STRIPE_KEY",   valueFrom = "${aws_secretsmanager_secret.stripe.arn}:api_key::" },
    ]

    # Non-sensitive config only
    environment = [
      { name = "LOG_LEVEL", value = "info" },
    ]
  }])
}
```

| Method | Security |
|--------|----------|
| ✅ ARN in the task definition, agent fetches | Value never in the definition, revision, or CloudTrail |
| ⚠️ SDK fetch at startup | Fine, but needs caching and refresh logic |
| 🔴 Value in `environment` | In the task definition, visible in the console and API |
| 🔴 Baked into the image | In every registry layer, forever |

## When a Secret Leaks

```
1. ROTATE IMMEDIATELY                ← before anything else
2. Check CloudTrail for use of the old value
3. Remove it from code and state
4. Purge Git history if committed
5. Fix the pattern that allowed it
```

🔴 **Removing a secret from the latest commit achieves nothing.** It remains in history, and if the repository was ever cloned, forked, or mirrored, it is beyond your control. **Rotation is the only real remediation.**

```bash
# Rotate first
aws secretsmanager rotate-secret --secret-id acme/prod/db --rotate-immediately

# Then look for abuse
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=acme/prod/db \
  --start-time 2026-07-01T00:00:00Z

# Purge from history — rewrites commits, coordinate with the team
git filter-repo --path secrets.env --invert-paths
```

**Prevention in CI, where it cannot be bypassed:**

```yaml
- uses: gitleaks/gitleaks-action@v2
  env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

⚠️ Pre-commit hooks are convenience — anyone can use `--no-verify`. The same scan must run in CI.

## HashiCorp Vault

When you would choose it over Secrets Manager.

| Vault strength | Detail |
|---------------|--------|
| **Multi-cloud** | ✅ One secrets layer across AWS, Azure, on-premises |
| **Dynamic secrets** | ✅ Generates a database credential per request, TTL-bound |
| **Encryption as a service** | Transit engine — encrypt without handling keys |
| **PKI** | Issue short-lived certificates on demand |

**Dynamic secrets are the genuinely distinctive feature:**

```
App requests a DB credential
   → Vault creates a NEW database user, TTL 1 hour
   → App uses it
   → Vault deletes the user at expiry
```

✅ Every application instance gets a distinct credential that expires. There is no shared password, and a leaked credential is useless within an hour.

⚠️ **Vault is real operational weight** — a cluster to run, unseal keys to protect, upgrades to manage. On AWS-only estates, Secrets Manager plus IAM auth achieves most of the benefit with none of the operations.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Secret in a Terraform variable | 🔴 Plaintext in state | `manage_master_user_password`, or create an empty secret |
| Plain Kubernetes Secret in Git | Base64 is not encryption | External Secrets Operator |
| Value in an ECS `environment` block | Visible in the task definition | `secrets` with an ARN |
| Fetch on every request | Latency and throttling | Cache with TTL + refresh on auth failure |
| No refresh on auth failure | Rotation breaks the app | Catch the failure, re-fetch |
| Deleting the leaked secret from HEAD | Still in history and every clone | 🔴 Rotate — that is the only fix |
| `random_password` in Terraform | Generated value stored in state | AWS-managed generation |
| Relying on pre-commit hooks only | Bypassed with `--no-verify` | Also scan in CI |

## Interview Q&A

**Q: Where do you store a database password?**

Ideally nowhere, because the best outcome is that no password exists. On RDS I would enable IAM database authentication, so the application requests a short-lived token from STS using its role and there is no credential to store, leak, or rotate — access is revoked by removing an IAM policy. Where that is not viable, `manage_master_user_password` on the RDS instance makes AWS generate the password, store it in Secrets Manager, and rotate it, and critically the value never enters Terraform's variables or state file. The application then reads it from Secrets Manager at runtime using its own role. What I would avoid is passing the password in as a Terraform variable from a CI secret, because anything Terraform touches is written into state in plaintext, so you have moved the secret rather than protected it.

**Q: Secrets Manager or Parameter Store?**

Secrets Manager when the value needs rotation, cross-account access, or native RDS integration; Parameter Store SecureString for everything else, because it is free in the standard tier while Secrets Manager charges per secret per month. That cost difference matters at scale — several hundred configuration values in Secrets Manager is a noticeable monthly line item for no benefit. So the split I would use is Parameter Store for the many configuration values and API keys that rarely change, and Secrets Manager for the handful of credentials that genuinely rotate, particularly database passwords where the managed rotation and the four-step rotation contract are worth paying for. Parameter Store also has a smaller size limit and no built-in random generation, which occasionally forces the decision.

**Q: How does Secrets Manager rotation avoid causing an outage?**

Through a four-step contract with staged version labels. First `createSecret` generates a new value and stores it under the `AWSPENDING` label, leaving `AWSCURRENT` untouched. Then `setSecret` applies it to the actual service, changing the database password. Then `testSecret` verifies the pending credential genuinely works — and this is the step that makes it safe, because if the new credential fails, rotation aborts with `AWSCURRENT` unchanged, so a broken rotation is a failed job rather than an outage. Only then does `finishSecret` promote `AWSPENDING` to `AWSCURRENT`, demoting the old value to `AWSPREVIOUS`. That previous label matters too: connections established with the old password keep working until they recycle. For workloads that cannot tolerate a single failed connection, the multi-user pattern alternates between two database users so one is always valid.

**Q: Are Kubernetes Secrets secure?**

Not by default, and the name is misleading. A Secret is base64-encoded, which is encoding rather than encryption — anyone who can read the object can trivially decode it. So the real controls are elsewhere. First, RBAC: `get secrets` in a namespace is equivalent to reading every credential in it, so that permission needs treating as privileged. Second, encryption at rest, which on EKS means the cluster's `encryption_config` pointing at a KMS key so etcd contents are envelope-encrypted — that protects against etcd disk access but does nothing against RBAC. Third, and most importantly, the values should not be in Git at all: External Secrets Operator lets you commit an `ExternalSecret` resource that references a Secrets Manager path, and the operator creates the actual Secret in-cluster and refreshes it on an interval, so rotation propagates automatically and GitOps stays intact.

**Q: A secret was committed to Git. Walk me through your response.**

Rotate first, before anything else. The moment a credential reaches Git history it should be treated as public, because the repository may have been cloned, forked, mirrored, or scraped, and no amount of history rewriting reaches those copies. So step one is rotating the credential so the leaked value stops working. Step two is checking CloudTrail, or the third party's audit log, for any use of the old value, to establish whether it was actually exploited and what it touched. Then remove it from the working tree and from Terraform state if it reached there, and purge it from history with `git filter-repo`, coordinating with the team since that rewrites commits. Finally fix the pattern: add secret scanning to CI where it cannot be bypassed, gitignore the file class properly, and move that secret to somewhere the application fetches at runtime rather than holding it in a file at all.

**Q: When would you choose HashiCorp Vault over Secrets Manager?**

When the estate is genuinely multi-cloud, or when dynamic secrets are worth the operational cost. Vault's distinctive capability is generating credentials on demand: an application requests database access and Vault creates a brand-new database user with a one-hour TTL, then deletes it at expiry. That means every instance holds a distinct short-lived credential, there is no shared password anywhere, and a leaked credential is worthless within an hour — which is stronger than rotating a shared secret every thirty days. Vault also gives you encryption as a service through the transit engine and on-demand PKI. The cost is significant though: a cluster to operate, unseal keys to protect and distribute, and upgrades to manage. On an AWS-only estate I would not introduce it, because IAM database authentication achieves the no-stored-credential outcome natively, and Secrets Manager handles the rest with no infrastructure to run.

---
[Security Index](./README.md) | [← IAM Deep Dive](./02-iam-deep-dive.md) | [Encryption →](./04-encryption.md)
