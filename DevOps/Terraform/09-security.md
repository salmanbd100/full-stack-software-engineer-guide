# Terraform Security

Terraform holds the keys to your entire cloud estate. This file covers the four things interviewers probe: secrets, state, credentials, and scanning.

## 🔴 The Rule That Explains Everything

**Every value Terraform touches ends up in the state file, in plaintext.**

```hcl
variable "db_password" {
  type      = string
  sensitive = true      # ← hides it from CLI output ONLY
}

resource "aws_db_instance" "main" {
  password = var.db_password
}
```

```bash
terraform plan
# password = (sensitive value)     ← looks safe
```

```bash
terraform state pull | jq '.resources[0].instances[0].attributes.password'
# "SuperSecret123!"                ← 🔴 plaintext in state
```

`sensitive = true` prevents accidental display in logs and plan output. It does **not** encrypt anything.

> Anyone who can read the state file can read every secret that has ever passed through Terraform.

## Handling Secrets Properly

The right pattern: **Terraform creates the secret container, something else fills it in.**

### ✅ Best — let AWS own the value

```hcl
resource "aws_db_instance" "main" {
  identifier = "acme-prod"
  username   = "app"

  # AWS generates the password, stores it in Secrets Manager, and rotates it.
  # It never touches Terraform's variables or state.
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.rds.arn
}
```

The application reads the secret at runtime with its own IAM role. Terraform never sees the value.

### ✅ Good — create an empty secret, populate out of band

```hcl
resource "aws_secretsmanager_secret" "api_key" {
  name       = "acme/prod/stripe-api-key"
  kms_key_id = aws_kms_key.secrets.arn
}

# Note: no aws_secretsmanager_secret_version resource.
# The value is set by a human or a separate process, once.
```

```bash
# Done once, outside Terraform
aws secretsmanager put-secret-value \
  --secret-id acme/prod/stripe-api-key \
  --secret-string "$STRIPE_KEY"
```

⚠️ If you later add a `secret_version` resource with the value, Terraform will show a permanent diff — or overwrite the real secret. Use `ignore_changes = [secret_string]` if you must manage the version resource.

### ⚠️ Acceptable — read an existing secret at plan time

```hcl
data "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "acme/prod/stripe-api-key"
}

resource "aws_ecs_task_definition" "app" {
  container_definitions = jsonencode([{
    name = "app"
    # ✅ Pass the ARN — the container fetches the value itself
    secrets = [{
      name      = "STRIPE_KEY"
      valueFrom = aws_secretsmanager_secret.api_key.arn
    }]
  }])
}
```

✅ Passing an **ARN** is safe. Reading the secret value into Terraform puts it in state.

### 🔴 Never

```hcl
# Committed to Git forever, visible in every clone
variable "db_password" {
  default = "SuperSecret123!"
}
```

```hcl
# In state in plaintext, and shown in the plan diff
resource "aws_secretsmanager_secret_version" "bad" {
  secret_string = var.db_password
}
```

```bash
# terraform.tfvars with real secrets, accidentally committed
```

**Comparison:**

| Approach | Secret in State? | In Git? |
|----------|-----------------|---------|
| `manage_master_user_password` | ❌ No | ❌ No |
| Empty secret + out-of-band value | ❌ No | ❌ No |
| Pass secret ARN to the app | ❌ No | ❌ No |
| `random_password` resource | 🔴 Yes | ❌ No |
| Variable from CI secret | 🔴 Yes | ❌ No |
| Hard-coded default | 🔴 Yes | 🔴 Yes |

> ⚠️ `random_password` feels secure but the generated value is stored in state in plaintext. It is better than a hard-coded default, but worse than letting AWS manage it.

## Protecting the State File

Since state contains secrets, treat it like a secret.

```hcl
# The state bucket — created once during bootstrap
resource "aws_s3_bucket" "state" {
  bucket = "acme-terraform-state"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn   # customer-managed key
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Deny anything not using TLS
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = ["${aws_s3_bucket.state.arn}", "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}
```

| Control | Protects Against |
|---------|-----------------|
| KMS encryption with a customer-managed key | Reading state via S3 access alone — you also need KMS permissions |
| Versioning | Corruption and accidental overwrite |
| Public access block | The classic exposed-bucket breach |
| Deny non-TLS | Interception in transit |
| CloudTrail data events on the bucket | Detecting who read state |
| Tight bucket policy | Only the CI roles can read |

🔴 **Never commit a state file.** Add to `.gitignore`:

```gitignore
*.tfstate
*.tfstate.*
*.tfstate.backup
.terraform/
.terraform.tfstate.lock.info
*.tfvars          # allow example files only
!*.tfvars.example
tfplan
plan.json
```

⚠️ Plan files also contain sensitive values. `tfplan` and `plan.json` must never be committed, and CI artifacts holding them need short retention and restricted access.

## Least Privilege for Terraform's Own Role

Terraform needs broad permissions, which makes its role a high-value target.

**Split by job:**

| Role | Permissions | Assumed By |
|------|------------|------------|
| `terraform-plan` | `ReadOnlyAccess`, state read, lock write | Pull request pipeline |
| `terraform-apply` | Write, scoped to managed services | Merge-to-main pipeline |
| `terraform-destroy` | Delete permissions | Break-glass, manual approval, alerts on use |

**Deny the operations you never want automated:**

```hcl
resource "aws_iam_role_policy" "apply_guardrails" {
  role = aws_iam_role.terraform_apply.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = [
          "rds:DeleteDBInstance",
          "rds:DeleteDBCluster",
          "dynamodb:DeleteTable",
          "s3:DeleteBucket",
        ]
        Resource = "*"
      },
      {
        # Terraform must never be able to widen its own permissions
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:CreateAccessKey",
          "iam:AttachRolePolicy",
          "iam:PutRolePolicy",
        ]
        Resource = aws_iam_role.terraform_apply.arn
      },
    ]
  })
}
```

> **Privilege escalation is the subtle risk.** If Terraform's role can modify IAM, then anyone who can merge a Terraform change can grant themselves administrator. Deny IAM writes against Terraform's own role and require a separate approval path for IAM changes.

✅ Additional controls that matter:

- **Separate AWS account per environment.** The strongest boundary there is — dev Terraform physically cannot reach production.
- **Permission boundaries** on roles Terraform creates, so it cannot create something more privileged than itself.
- **Service Control Policies** at the organisation level as a ceiling nothing can exceed.

## Security Scanning

```bash
# Checkov — broad policy library
checkov -d . --framework terraform

# Trivy — successor to tfsec
trivy config .

# Secret detection before anything is committed
gitleaks detect --source . --verbose
trufflehog filesystem .
```

**Pre-commit hooks — catch it before it reaches Git:**

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.92.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
      - id: terraform_checkov

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks
```

⚠️ Pre-commit hooks are a convenience, not a control — anyone can skip them with `--no-verify`. The same checks must run in CI, where they cannot be bypassed.

**What scanners commonly find:**

| Finding | Fix |
|---------|-----|
| Unencrypted S3 bucket, EBS volume, or RDS instance | Enable encryption, use a customer-managed KMS key |
| Security group with `0.0.0.0/0` on port 22 | SSM Session Manager instead of SSH |
| IAM policy with `"Action": "*"` | Enumerate the actions actually needed |
| No S3 public access block | Add `aws_s3_bucket_public_access_block` |
| IMDSv1 allowed on EC2 | `http_tokens = "required"` |
| No VPC flow logs | Enable, ship to CloudWatch or S3 |

## If a Secret Leaks

A secret in a state file or a commit is a compromised secret. Assume it is public.

```
1. Rotate the credential immediately     ← first, always
2. Check CloudTrail for use of the old value
3. Remove it from the code and state
4. Purge Git history if it was committed
5. Fix the pattern that allowed it
```

```bash
# Rotate — do this before anything else
aws secretsmanager rotate-secret --secret-id acme/prod/db

# Purge from Git history (rewrites history — coordinate with the team)
git filter-repo --path secrets.tfvars --invert-paths
```

🔴 Removing a secret from the latest commit does nothing. It stays in history, and if the repository was ever cloned or mirrored, it is out of your control. **Rotation is the only real remediation.**

## Interview Q&A

**Q: Where do you store secrets in Terraform?**

Nowhere in Terraform, because anything Terraform touches ends up in the state file in plaintext. The pattern is that Terraform creates the container and something else supplies the value. For RDS, `manage_master_user_password = true` makes AWS generate the password, store it in Secrets Manager, and rotate it, so the value never enters Terraform's variables or state. For third-party API keys, Terraform creates an empty Secrets Manager secret and the value is put in once out of band, then the application reads it at runtime with its own IAM role. When wiring an application up, you pass the secret's ARN, never its value — an ECS task definition references `valueFrom` with the ARN and the container fetches the secret itself. The pattern to avoid is passing a secret in as a variable from CI, because that writes it straight into state.

**Q: `sensitive = true` — what does it actually do?**

It stops Terraform printing the value in plan output, apply output, and CLI errors, replacing it with `(sensitive value)`. It also propagates: anything derived from a sensitive value is treated as sensitive, and you get an error if you try to use one in an output without marking that output sensitive too. What it does not do is encrypt anything. The value is still stored in the state file in plaintext, so anyone with read access to the state bucket and its KMS key can extract it with `terraform state pull`. It is a protection against accidental disclosure in logs and screen-shares, not a security boundary. The security boundary is not putting the secret through Terraform at all.

**Q: How do you secure the Terraform state file?**

Treat it as a secret store, because that is effectively what it is. An S3 bucket with encryption using a customer-managed KMS key, so reading state requires both S3 and KMS permissions and the KMS key policy becomes a second gate. Versioning enabled, which is also your recovery path from corruption. Full public access block. A bucket policy denying any request where `aws:SecureTransport` is false. Access limited to the specific CI roles that need it — plan roles get read, apply roles get read and write, and no humans get either by default. CloudTrail data events on the bucket so you can see who read state. And in `.gitignore`, all of `*.tfstate*`, `.terraform/`, `*.tfvars`, and plan files, because plan files contain sensitive values too.

**Q: What permissions should Terraform's own role have?**

Least privilege split by pipeline stage. The plan role gets `ReadOnlyAccess` plus read on the state object and write on the lock, and nothing else — it never needs to change anything. The apply role gets write permissions scoped to the services it actually manages, with explicit `Deny` statements for the operations you never want a pipeline to perform, such as deleting RDS instances or S3 buckets. The subtle one is IAM: if Terraform's role can attach policies or create access keys, then anyone who can merge a change to the repository can grant themselves administrator. So the apply role has an explicit deny on IAM write actions against its own role, and IAM changes go through a separate approval path. The strongest boundary of all is a separate AWS account per environment, so the dev pipeline physically cannot reach production.

**Q: A secret was committed in a `.tfvars` file. Walk me through your response.**

Rotate first, before anything else. The moment a credential is in Git history it should be considered public — the repository may have been cloned, forked, or mirrored, and history rewriting cannot reach those copies. So step one is rotating the credential in Secrets Manager or the third-party provider so the leaked value stops working. Step two is checking CloudTrail, or the provider's audit log, for any use of the old value to establish whether it was actually exploited. Then remove it from the working tree and from state if it made it there, and purge it from history with `git filter-repo`, coordinating with the team since that rewrites commits. Finally, fix the pattern that allowed it: add gitleaks to CI where it cannot be bypassed, make sure `*.tfvars` is gitignored with only `.example` files allowed, and move that secret to a pattern where Terraform never holds the value.

**Q: How do you stop Terraform being used to escalate privileges?**

Two layers. First, the apply role has an explicit `Deny` on IAM write actions targeting itself — `iam:AttachRolePolicy`, `iam:PutRolePolicy`, `iam:CreateAccessKey` — so a merged Terraform change cannot widen Terraform's own permissions. Second, permission boundaries on any role Terraform creates, which cap what those roles can do regardless of the policies attached, so Terraform cannot create something more privileged than itself. Above both, Service Control Policies at the organisation level set a ceiling that nothing in the account can exceed, including a compromised Terraform role. Operationally, IAM changes route through a separate pipeline with different reviewers, and policy-as-code rules in the plan gate flag any change that touches IAM so it gets human attention rather than sliding through with a routine infrastructure change.

---
[Terraform Index](./README.md) | [← Terraform CI/CD](./08-cicd.md) | [Best Practices →](./10-best-practices.md)
