# Testing Terraform

"How do you test infrastructure code?" is a senior-level question. The answer is a layered pyramid, because each layer catches different failures at very different speeds and costs.

## The Testing Pyramid for Infrastructure

```
                 ┌─────────────────┐
                 │  Terratest      │  Real AWS, minutes, costs money
                 ├─────────────────┤
                 │ terraform test  │  Plan or real apply, seconds to minutes
                 ├─────────────────┤
                 │ Policy as Code  │  Checks the plan, seconds
                 ├─────────────────┤
                 │ Static scanning │  Reads the files, seconds
                 ├─────────────────┤
                 │ fmt / validate  │  Instant
                 └─────────────────┘
```

✅ Push checks as far down as possible. A `/24` subnet you should have made a `/20` can be caught by a policy in two seconds; catching it in Terratest takes fifteen minutes and a real VPC.

## Layer 1 — `fmt` and `validate`

```bash
# Fails if any file is not canonically formatted
terraform fmt -check -recursive

# Checks syntax, types, and references — no API calls, no credentials needed
terraform init -backend=false
terraform validate
```

**What `validate` catches:**

- Syntax errors
- Undefined variables and unknown resource attributes
- Type mismatches — a string where a number is expected
- References to resources that do not exist

**What it does not catch:** anything requiring real AWS knowledge. `instance_type = "m6i.enormous"` passes validate and fails at apply.

⚠️ Use `-backend=false` in CI so validation does not need credentials or a state lock.

## Layer 2 — Static Scanning

These tools read your `.tf` files and flag insecure or wasteful configuration.

| Tool | Focus |
|------|-------|
| **Checkov** | Broad policy library, multi-framework, easy custom rules |
| **tfsec / Trivy** | Fast security-focused scanning (tfsec is now part of Trivy) |
| **TFLint** | Provider-aware correctness — catches invalid instance types |
| **terraform-docs** | Generates module documentation from variables and outputs |

```bash
# Checkov — security and compliance
checkov -d . --framework terraform --quiet

# Trivy — successor to tfsec
trivy config .

# TFLint with the AWS ruleset — catches things validate cannot
tflint --init && tflint
```

**What TFLint uniquely catches:**

```hcl
resource "aws_instance" "app" {
  instance_type = "t2.mikro"   # ❌ TFLint: invalid instance type
  ami           = "ami-123"
}
```

`terraform validate` accepts this happily. TFLint knows the real AWS type list.

**Suppressing a finding — always with a reason:**

```hcl
# checkov:skip=CKV_AWS_18:Access logging goes to the central log account, not this bucket
resource "aws_s3_bucket" "assets" {
  bucket = "acme-assets"
}
```

❌ Never suppress by disabling the whole rule in config. Suppress inline, with a justification a reviewer can judge.

## Layer 3 — Policy as Code

Static scanning reads your files. Policy as code inspects the **plan**, so it can reason about what will actually happen.

```bash
# Produce a machine-readable plan
terraform plan -out=tfplan
terraform show -json tfplan > plan.json
```

**Conftest with Open Policy Agent (OPA):**

```rego
# policy/rds.rego
package terraform.rds

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.actions[_] == "delete"

  msg := sprintf("Refusing to delete database %s — needs manual approval", [resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_server_side_encryption_configuration"
  not resource.change.after

  msg := "S3 encryption configuration must not be removed"
}
```

```bash
conftest test plan.json --policy policy/
```

> This is the key advantage: a policy can block **destroys** and **replacements**, which no static file scan can see. "Fail the pipeline if any plan would delete an RDS instance" is only expressible against a plan.

**Sentinel** is HashiCorp's paid equivalent, available in HCP Terraform. Same idea, different language.

**Policies worth having on day one:**

| Policy | Catches |
|--------|---------|
| No destroy of `aws_db_instance` or `aws_s3_bucket` | Accidental data loss |
| No `0.0.0.0/0` ingress on port 22 or 3389 | Open SSH/RDP |
| Every resource carries required tags | Untraceable cost |
| No unencrypted storage | Compliance failure |
| Instance types from an approved list | Runaway cost |

## Layer 4 — `terraform test`

Terraform's built-in test framework. Tests live in `*.tftest.hcl` files and run with `terraform test`.

**A plan-only test — fast, no resources created:**

```hcl
# tests/naming.tftest.hcl
variables {
  name        = "payments"
  environment = "prod"
}

run "bucket_name_is_prefixed" {
  command = plan

  assert {
    condition     = aws_s3_bucket.this.bucket == "acme-payments-prod"
    error_message = "Bucket name did not follow the acme-<name>-<env> convention"
  }
}

run "production_enables_multi_az" {
  command = plan

  assert {
    condition     = aws_db_instance.this.multi_az == true
    error_message = "Production databases must be multi-AZ"
  }
}
```

**Testing that validation actually rejects bad input:**

```hcl
run "rejects_invalid_environment" {
  command = plan

  variables {
    environment = "produciton"   # typo
  }

  expect_failures = [var.environment]
}
```

**An apply test — creates real resources, then destroys them:**

```hcl
# tests/integration.tftest.hcl
run "setup" {
  module {
    source = "./tests/setup"   # creates a randomly-named bucket to avoid collisions
  }
}

run "create_and_verify" {
  command = apply

  variables {
    name = run.setup.random_name
  }

  assert {
    condition     = aws_s3_bucket.this.tags["ManagedBy"] == "terraform"
    error_message = "Default tags were not applied"
  }
}
```

```bash
terraform test                       # run every test file
terraform test -filter=naming.tftest.hcl
terraform test -verbose              # show the plan for each run block
```

| `command = plan` | `command = apply` |
|------------------|-------------------|
| Seconds | Minutes |
| No AWS resources created | Real resources, real cost |
| Tests logic, naming, conditionals | Tests that AWS actually accepts it |
| Run on every commit | Run on merge to main, or nightly |

✅ Most of your tests should be `plan` tests. They catch the majority of module bugs — wrong conditionals, broken naming, missing tags — in seconds.

⚠️ `terraform test` destroys what it creates, including on failure. But a crashed test run can leave resources behind, so run apply tests in a dedicated throwaway account with a cleanup job.

## Layer 5 — Terratest

Terratest is a Go library. It runs `terraform apply` against real infrastructure, makes real assertions, then destroys.

```go
// test/vpc_test.go
func TestVpcHasPrivateSubnets(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../examples/complete",
        Vars: map[string]interface{}{
            "name":     "test-" + random.UniqueId(),
            "vpc_cidr": "10.99.0.0/16",
        },
    }

    defer terraform.Destroy(t, opts)   // always clean up
    terraform.InitAndApply(t, opts)

    subnetIds := terraform.OutputList(t, opts, "private_subnet_ids")
    assert.Equal(t, 3, len(subnetIds))

    // Assert against the real AWS API, not just Terraform state
    for _, id := range subnetIds {
        assert.False(t, aws.IsPublicSubnet(t, "eu-west-1", id))
    }
}
```

**When Terratest is worth the cost:**

- ✅ You publish shared modules other teams depend on
- ✅ You need to verify real behaviour — that traffic actually reaches the app
- ✅ You are validating a major version upgrade of a module

**When it is not:**

- ❌ Testing a root configuration that only wires modules together
- ❌ Checking naming or tags — a `plan` test does that in one second
- ❌ Small teams with no Go experience; `terraform test` covers most needs

| | `terraform test` | Terratest |
|---|---|---|
| **Language** | HCL | Go |
| **Setup** | Built in | Go toolchain, dependencies |
| **Plan-only mode** | Yes | No |
| **Assert against AWS API** | Limited (via data sources) | Yes, full SDK |
| **Best for** | Module logic | Real end-to-end behaviour |

## Reviewing a Plan

The most important test is a human reading the plan. Know what to look for.

```
Plan: 2 to add, 3 to change, 1 to destroy
```

**Read the plan in this order:**

| Look For | Why |
|----------|-----|
| 🔴 `must be replaced` | Destroy and create — data loss risk |
| 🔴 `will be destroyed` | Is this intentional? |
| 🔴 `(known after apply)` on a critical field | You cannot see what the value will be |
| ⚠️ `forces replacement` annotation | Tells you exactly which attribute triggered it |
| ⚠️ Unexpected count | Touching 40 resources when you changed one line |

```
# aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" {
      ~ identifier = "acme-prod" -> "acme-production" # forces replacement
```

🔴 That plan destroys a production database. The `# forces replacement` comment is the line that tells you why.

✅ Post the plan as a pull request comment so reviewers see it without running anything.

## A Complete Pipeline

```yaml
# .github/workflows/terraform.yml
name: terraform

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.9.5      # pinned

      # Fast, no credentials
      - run: terraform fmt -check -recursive
      - run: terraform init -backend=false
      - run: terraform validate
      - uses: terraform-linters/setup-tflint@v4
      - run: tflint --recursive

      # Security scan
      - uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform

      # Module logic tests — plan only, still no AWS writes
      - run: terraform test

  plan:
    needs: validate
    runs-on: ubuntu-latest
    permissions:
      id-token: write        # OIDC
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111122223333:role/terraform-plan
          aws-region: eu-west-1

      - run: terraform init
      - run: terraform plan -out=tfplan
      - run: terraform show -json tfplan > plan.json

      # Policy gate against the plan
      - run: conftest test plan.json --policy policy/
```

**Stage ordering rule:** cheapest and credential-free checks first. A formatting error should fail in ten seconds, not after a two-minute plan.

## Interview Q&A

**Q: How do you test Terraform code?**

In layers, cheapest first. `terraform fmt -check` and `terraform validate` run in seconds without credentials and catch syntax, type, and reference errors. Then static scanners — Checkov or Trivy for security misconfiguration, TFLint for provider-aware correctness like invalid instance types that `validate` will happily accept. Then policy as code with Conftest and OPA against the JSON plan, which is the only layer that can see destroys and replacements. Then `terraform test` with plan-only run blocks, which verifies module logic — naming conventions, environment conditionals, that production really does get multi-AZ — still without creating anything. At the top, Terratest or apply-mode `terraform test` against a throwaway AWS account, for shared modules where you need to prove real behaviour. The principle is that each layer up costs more time and money, so you catch as much as possible below.

**Q: What is the difference between `terraform validate` and a plan?**

`validate` is purely local and static. It parses the configuration, checks types, and confirms that every reference resolves — no credentials, no state, no API calls. It cannot know anything about your real infrastructure or about AWS's rules, so `instance_type = "m6i.enormous"` passes. A plan does the opposite: it reads the state file, refreshes against the real cloud API, and computes what would actually change. That means it catches missing permissions, invalid values the provider rejects, and drift, but it needs credentials and state access. In CI I run `validate` with `-backend=false` in a fast credential-free job, then plan in a separate job that assumes a read-only role.

**Q: Why use policy as code when you already have a security scanner?**

Because they see different things. A scanner like Checkov reads your `.tf` files and can tell you a bucket has no encryption block. It cannot tell you that this apply is about to delete a production database, because that fact does not exist in the files — it exists in the diff between the config and current state. Policy as code runs against the JSON plan, so it can write rules about actions: fail if any resource change has a `delete` action on an `aws_db_instance`, or fail if more than ten resources would be destroyed in a single apply. That makes it the right layer for blast-radius controls and change-approval rules, while static scanning stays the right layer for configuration standards.

**Q: What is `terraform test` and when do you use plan versus apply mode?**

It is Terraform's built-in test framework. Tests are `.tftest.hcl` files containing `run` blocks, each with variables and `assert` blocks that check conditions against resource attributes or outputs. In plan mode it only computes a plan, so it runs in seconds, creates nothing, and costs nothing — that is where most tests belong, because most module bugs are logic bugs: a wrong conditional, a broken naming convention, a missing tag, a validation rule that does not actually reject bad input. `expect_failures` is useful there for asserting that a variable validation does fire. Apply mode creates real resources and then destroys them, which is the only way to confirm AWS actually accepts the configuration, so I reserve it for merges to main or a nightly run in a dedicated throwaway account.

**Q: What do you look for when reviewing a `terraform plan`?**

The first thing is the summary line, and specifically whether anything is being destroyed or replaced. `must be replaced` is the line that matters most, because it means destroy and create — on a database or an EBS volume that is data loss. Terraform annotates the attribute responsible with `# forces replacement`, so I read that to understand whether the change was intentional. Next I check whether the number of affected resources matches what I changed; a one-line edit that touches forty resources usually means I have shifted `count` indices or changed something in a shared local. I also look at `(known after apply)` on important fields, because that means I cannot actually see what value will be set. And I check that the plan matches the pull request description — if the diff contains changes nobody mentioned, that is drift being silently absorbed.

**Q: `terraform test` or Terratest?**

`terraform test` for most work, Terratest when you need more. `terraform test` is built in, written in HCL so anyone on the team can read it, and crucially supports plan-only mode, which means fast feedback with no AWS spend. That covers module logic thoroughly. Terratest is a Go library, so it needs Go skills and a real apply every run, but it gives you the full AWS SDK for assertions — you can check that a subnet has no route to an internet gateway, or make an HTTP request to the load balancer you just created and assert on the response. I would use Terratest for a widely-consumed shared module where real behaviour matters and the cost is justified, and `terraform test` for everything else.

---
[Terraform Index](./README.md) | [← AWS Resources](./06-aws-resources.md) | [Terraform CI/CD →](./08-cicd.md)
