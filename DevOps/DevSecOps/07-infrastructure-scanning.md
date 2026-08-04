# Infrastructure Security Scanning

Infrastructure-as-code scanning catches misconfiguration **before it exists in the cloud**. This is the cheapest security control available, because the fix is editing a file rather than remediating a live resource.

> For Terraform-specific patterns, see [Terraform Security](../Terraform/09-security.md). This page covers the scanning and policy-as-code layer across tools.

## Why This Is the Highest-Value Scanner

Most cloud breaches are misconfiguration, not exploited code.

| Root Cause | Typical Share of Cloud Incidents |
|-----------|--------------------------------|
| **Misconfiguration** (public bucket, open SG, over-broad IAM) | 🔴 The large majority |
| Vulnerable dependency | Smaller |
| Application code flaw | Smaller |

```
Cost to fix, by where you catch it:

IaC scan on a PR      →  edit 1 line          💰
Config rule post-apply →  remediate live resource  💰💰
Penetration test      →  incident + change window  💰💰💰
Breach                →  disclosure, fines, trust  💰💰💰💰
```

## The Findings That Actually Matter

Every IaC scanner reports dozens of rules. These are the ones with a direct path to compromise:

| Finding | Why It Is Serious |
|---------|------------------|
| **S3 bucket public** | Direct data exposure, no exploit needed |
| **Security group `0.0.0.0/0` on 22 / 3389 / 5432** | Internet-reachable admin or database port |
| **IAM policy with `"Action": "*"` on `"Resource": "*"`** | Any compromise becomes account takeover |
| **Unencrypted storage (EBS, RDS, S3)** | Compliance failure, snapshot exposure |
| **No logging** (CloudTrail, VPC Flow, ALB access logs) | You cannot investigate what you cannot see |
| **Public RDS instance** | Database on the internet |
| **IMDSv1 allowed** | SSRF becomes credential theft |
| **Secrets in plaintext** in IaC or state | Leak on every clone |

🔴 **IMDSv1 is the one most people miss.** With IMDSv1, a server-side request forgery bug in your application can read instance credentials via a simple GET. IMDSv2 requires a PUT with a token, which the same SSRF cannot perform.

```hcl
# ✅ Blocks the SSRF-to-credential-theft path
resource "aws_launch_template" "app" {
  metadata_options {
    http_tokens                 = "required"  # IMDSv2 only
    http_put_response_hop_limit = 1           # cannot be reached from a container
    http_endpoint               = "enabled"
  }
}
```

## Tooling

| Tool | Covers | Notes |
|------|--------|-------|
| **Checkov** | Terraform, CFN, K8s, Helm, ARM, Dockerfile | ✅ Broadest coverage, good defaults |
| **tfsec** (now in Trivy) | Terraform | Fast; merged into Trivy |
| **Trivy** | IaC + images + dependencies + secrets | ✅ One tool for everything |
| **Terrascan** | Multi-IaC, OPA-based | Good if you already use Rego |
| **OPA / Conftest** | Anything expressible as JSON | ✅ For custom organizational policy |
| **cfn-guard** | CloudFormation | AWS-native, own DSL |
| **AWS Config** | Live resources | Detective, catches drift and console changes |

✅ Practical combination: **Checkov or Trivy** for the known-misconfiguration ruleset, **OPA/Conftest** for policies specific to your organization, and **AWS Config** to catch anything that bypassed the pipeline.

## Scanning the Plan, Not Just the Code

This distinction matters and is a strong interview point.

| Scan Target | Sees | Misses |
|------------|------|--------|
| **HCL source** | Literal configuration | ⚠️ Anything from variables, modules, or `for_each` |
| **`terraform plan` JSON** | ✅ Fully resolved values | Nothing — this is what will actually exist |

```hcl
# A source scan cannot evaluate this — the value is unknown until plan time
resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = var.block_public   # could be false in one tfvars file
  ignore_public_acls      = var.block_public
  block_public_policy     = var.block_public
  restrict_public_buckets = var.block_public
}
```

```bash
# ✅ Scan the resolved plan — catches variable- and module-driven misconfiguration
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json

checkov -f tfplan.json --framework terraform_plan \
        --compact --soft-fail-on LOW,MEDIUM
```

> Scanning HCL finds obvious mistakes. Scanning the plan finds the ones hidden behind a variable in a per-environment tfvars file — which is exactly where production-only misconfiguration lives.

## Custom Policy with OPA

Built-in rules cover generic best practice. Custom policy encodes **your** rules.

```rego
# policy/require_tags.rego — every resource that costs money must be attributable
package terraform.tags

required := {"Environment", "Team", "CostCenter"}

deny[msg] {
  resource := input.resource_changes[_]
  resource.change.actions[_] == "create"
  taggable(resource.type)

  missing := required - object.keys(resource.change.after.tags)
  count(missing) > 0

  msg := sprintf("%s is missing required tags: %v", [resource.address, missing])
}

taggable(t) {
  t in {"aws_instance", "aws_db_instance", "aws_s3_bucket", "aws_lb", "aws_eks_cluster"}
}
```

```bash
conftest test --policy policy/ tfplan.json
```

**Policies worth writing for your own organization:**

| Policy | Prevents |
|--------|----------|
| Required tags on billable resources | Unattributable cost |
| Only approved regions | Data residency violations |
| Only approved AMIs / base images | Unpatched or unknown images |
| RDS must be in a private subnet | Database exposure |
| No IAM users — roles only | Long-lived credentials |
| Deletion protection on production databases | Accidental destruction |

## Pipeline Placement

```
Pre-commit ──► PR: scan HCL ──► PR: plan + scan plan ──► Apply ──► AWS Config
   fast          fast, inline      ✅ authoritative gate           catches drift
                                                                  and console edits
```

```yaml
name: iac-security
on: pull_request

permissions:
  id-token: write        # OIDC — no stored AWS keys
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/tf-plan-readonly
          aws-region: eu-west-1

      - name: Plan
        run: |
          terraform init -backend-config=env/prod.hcl
          terraform plan -out=tfplan.binary
          terraform show -json tfplan.binary > tfplan.json

      - name: Checkov on the resolved plan
        run: |
          pip install checkov
          checkov -f tfplan.json --framework terraform_plan \
                  --output sarif --output-file-path . \
                  --soft-fail-on LOW,MEDIUM        # only HIGH/CRITICAL block

      - name: Organizational policy
        run: conftest test --policy policy/ tfplan.json

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

🔴 The plan role must be **read-only**. A pipeline that runs `plan` on untrusted pull request code with write credentials is a straightforward path to account compromise.

## Guardrails Beyond Scanning

Scanning only sees changes that go through your pipeline. Someone clicking in the console bypasses it entirely.

| Control | Scope | Bypassable? |
|---------|-------|------------|
| **IaC scanning** | Pipeline changes | ✅ Console, CLI, other pipelines |
| **AWS Config rules** | All resources, after creation | Detective only |
| **Service Control Policies** | 🔴 **Entire organization, preventively** | ❌ Not even by the root user |
| **Permission boundaries** | What a principal can grant | ❌ No |
| **S3 account-level public access block** | All buckets in the account | ❌ No |

```json
{
  "Sid": "DenyUnencryptedAndWrongRegion",
  "Effect": "Deny",
  "Action": "s3:PutObject",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
  }
}
```

> The strongest version of "no public S3 buckets" is not a scanner rule. It is the account-level public access block plus an SCP — controls that cannot be bypassed by any path.

## Common Mistakes

| Mistake | Consequence |
|---------|------------|
| Scanning HCL only, never the plan | Misses variable-driven misconfiguration |
| Enabling all rules and failing on all | Hundreds of findings, `--soft-fail` everywhere |
| No custom policies | Generic best practice only, no organizational rules |
| Scanning IaC but not live resources | Blind to console changes and drift |
| Write credentials on PR-triggered plans | Untrusted code with production access |
| Secrets in `.tfstate` unencrypted | State bucket becomes the highest-value target |

## Interview Q&A

**Q: Why is infrastructure-as-code scanning the highest-value security scanner?**

Because misconfiguration causes the majority of cloud security incidents, not exploited application code. A publicly readable S3 bucket or a security group allowing the world to reach a database port requires no exploit at all — it is simply open. IaC scanning catches those before the resource exists, when the fix is a one-line change in a pull request rather than a remediation on a live system with data already exposed. It is also cheap to run, produces findings with a clear and unambiguous fix, and maps directly onto compliance requirements. Compared with SAST, which has to reason about data flow and produces false positives, an IaC rule like "this bucket allows public access" is deterministic.

**Q: What is the difference between scanning Terraform HCL and scanning the plan output?**

Scanning HCL analyses the source as written, so it only sees literal values. Anything supplied by a variable, computed by a module, or generated through `for_each` is opaque to it — which means a bucket whose public access block is driven by a variable set to false in the production tfvars file passes the source scan cleanly. Scanning the JSON output of `terraform plan` evaluates fully resolved values, so it sees what will actually be created in the account, including everything the modules and variables produced. That is where real-world misconfiguration hides, because it is almost always environment-specific rather than hard-coded. The trade-off is that plan-based scanning needs credentials and a backend, so I would run a fast HCL scan for immediate feedback and treat the plan scan as the authoritative gate.

**Q: IaC scanning only sees changes that go through your pipeline. How do you cover the rest?**

With layered controls that have different bypass properties. AWS Config rules evaluate live resources continuously, so they catch anything created by hand in the console, by another pipeline, or by drift, and they can trigger automatic remediation — but they are detective, so exposure exists briefly. Service Control Policies are preventive at the organization level and cannot be bypassed by any principal in the account, including the root user, which makes them the right place for absolute rules like "no resources outside approved regions" or "cannot disable CloudTrail". Account-level settings such as the S3 public access block work the same way. So the model is: IaC scanning for fast developer feedback, SCPs and account-level guardrails for the rules that must never be broken, and Config for detection and drift.

**Q: Why does IMDSv2 matter, and why do people miss it?**

The instance metadata service returns temporary IAM credentials for the role attached to an instance. With IMDSv1, that data is available from a plain HTTP GET to a link-local address, which means any server-side request forgery vulnerability in your application — an image fetcher or webhook caller that follows a user-supplied URL — can retrieve your credentials and hand the attacker your role's permissions. IMDSv2 requires a PUT request to obtain a session token first, which a typical SSRF cannot issue, so the same bug becomes harmless. People miss it because IMDSv1 is the historical default and nothing breaks when it is left enabled, so it never surfaces as a problem until an incident. Setting `http_tokens = "required"` in the launch template, plus a hop limit of one so containers cannot reach it, closes the path.

**Q: How would you stop developers disabling IaC scan rules to get a build through?**

Partly by design and partly by process. On the design side, tune the gate so it only fails on high and critical findings that have a clear fix, and report everything else, because a gate that fails on eighty low-severity items invites exactly this behaviour. Provide Terraform modules where the secure configuration is the default and cannot easily be turned off, so the compliant path requires less work than the workaround. On the process side, require suppressions to be narrowly scoped with a documented reason, an owner, and an expiry date, and make the suppression file itself require review from the platform or security team through CODEOWNERS. And for the rules that genuinely must never be broken, do not rely on the scanner at all — enforce them with Service Control Policies, which no pipeline change can bypass.

---

[← Secrets Detection](./06-secrets-detection.md) | [Index](./README.md) | [Pipeline Security →](./08-pipeline-security.md)
