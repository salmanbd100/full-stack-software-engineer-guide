# Terraform Advanced Patterns

The patterns in this file are where Terraform interviews get technical. Most of them exist to answer one question: *how do I avoid Terraform destroying something I did not want destroyed?*

## `count` vs `for_each`

The highest-value topic in this file. Expect it in every mid-to-senior Terraform interview.

**`count` addresses resources by index:**

```hcl
variable "buckets" {
  type    = list(string)
  default = ["logs", "assets", "backups"]
}

resource "aws_s3_bucket" "this" {
  count  = length(var.buckets)
  bucket = "acme-${var.buckets[count.index]}"
}
```

State addresses:

```
aws_s3_bucket.this[0]  → acme-logs
aws_s3_bucket.this[1]  → acme-assets
aws_s3_bucket.this[2]  → acme-backups
```

🔴 **Now remove `"assets"` from the middle of the list:**

```
aws_s3_bucket.this[1]  → acme-backups   (was acme-assets)
aws_s3_bucket.this[2]  → gone
```

Terraform's plan:

```
# aws_s3_bucket.this[1] must be replaced
#   bucket: "acme-assets" → "acme-backups"
# aws_s3_bucket.this[2] will be destroyed
```

You wanted to delete one bucket. Terraform will delete two and recreate one. On an RDS instance, that is data loss.

✅ **`for_each` addresses resources by a stable key:**

```hcl
variable "buckets" {
  type    = set(string)
  default = ["logs", "assets", "backups"]
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = "acme-${each.key}"
}
```

State addresses:

```
aws_s3_bucket.this["logs"]
aws_s3_bucket.this["assets"]
aws_s3_bucket.this["backups"]
```

Remove `"assets"` and the plan is exactly one destroy. The other two are untouched.

| | `count` | `for_each` |
|---|---|---|
| **Input** | Number | Map or set of strings |
| **Address** | `[0]`, `[1]` | `["logs"]`, `["assets"]` |
| **Reference** | `count.index` | `each.key`, `each.value` |
| **Removing a middle item** | 🔴 Renumbers and replaces | ✅ Only that item |
| **Right use** | On/off toggle | Everything else |

**The one good use of `count` — a conditional resource:**

```hcl
resource "aws_nat_gateway" "this" {
  count = var.enable_nat ? 1 : 0

  subnet_id     = var.public_subnet_id
  allocation_id = aws_eip.nat[0].id
}

# Referencing an optional resource
output "nat_ip" {
  value = var.enable_nat ? aws_nat_gateway.this[0].public_ip : null
}
```

**`for_each` over a map of objects — the most useful shape:**

```hcl
variable "services" {
  type = map(object({
    port     = number
    replicas = number
  }))
  default = {
    api    = { port = 3000, replicas = 4 }
    worker = { port = 8080, replicas = 2 }
  }
}

resource "aws_ecs_service" "this" {
  for_each = var.services

  name          = each.key
  desired_count = each.value.replicas
}
```

⚠️ `for_each` keys must be known at plan time. If you key off an attribute that only exists after apply (an ARN, a generated ID), Terraform errors out. Key off inputs you control.

## `for` Expressions

`for` transforms collections. Not to be confused with `for_each`, which creates resources.

```hcl
locals {
  services = {
    api    = { port = 3000, public = true }
    worker = { port = 8080, public = false }
    cron   = { port = 9000, public = false }
  }

  # Map → list
  ports = [for name, cfg in local.services : cfg.port]
  # [3000, 8080, 9000]

  # Filter with if
  public_services = {
    for name, cfg in local.services : name => cfg if cfg.public
  }
  # { api = { port = 3000, public = true } }
}
```

**Flattening nested data — a real pattern for subnets across AZs:**

```hcl
locals {
  subnets_by_az = {
    "eu-west-1a" = ["10.0.1.0/24", "10.0.2.0/24"]
    "eu-west-1b" = ["10.0.3.0/24", "10.0.4.0/24"]
  }

  # Turn nested lists into a flat map keyed for for_each
  subnets = merge([
    for az, cidrs in local.subnets_by_az : {
      for cidr in cidrs : "${az}-${cidr}" => { az = az, cidr = cidr }
    }
  ]...)   # the ... spreads the list into merge() arguments
}

resource "aws_subnet" "this" {
  for_each = local.subnets

  availability_zone = each.value.az
  cidr_block        = each.value.cidr
}
```

> The `...` spread operator turns a list of maps into separate arguments for `merge()`. It appears constantly in real Terraform and confuses people the first time.

## `dynamic` Blocks

Use `dynamic` when the **number of nested blocks** varies. Not for top-level resources.

❌ **Repetition:**

```hcl
resource "aws_security_group" "web" {
  ingress {
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

✅ **Dynamic:**

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    cidr_blocks = list(string)
    description = string
  }))
}

resource "aws_security_group" "web" {
  name = "web"

  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
}
```

**Making a whole block optional** — pass a list of zero or one items:

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.expiration_days == null ? [] : [var.expiration_days]

    content {
      id     = "expire"
      status = "Enabled"
      expiration { days = rule.value }
    }
  }
}
```

⚠️ Dynamic blocks are hard to read. Two static blocks beat one dynamic block. Reach for `dynamic` only when the count genuinely varies at plan time.

## `lifecycle` Meta-Arguments

These change how Terraform handles a resource's life. All four come up in interviews.

### `create_before_destroy`

Default order is destroy-then-create, which means downtime.

```hcl
resource "aws_launch_template" "app" {
  name_prefix = "app-"   # prefix, not name — avoids a name collision

  lifecycle {
    create_before_destroy = true
  }
}
```

```
Default:              destroy old ──→ create new     (gap = downtime)
create_before_destroy: create new ──→ destroy old    (no gap)
```

✅ Needed for launch templates, security groups referenced by other resources, and anything behind a load balancer.

⚠️ Only works if the new resource can coexist with the old. Two resources cannot share one name, which is why you use `name_prefix`.

### `prevent_destroy`

```hcl
resource "aws_db_instance" "prod" {
  identifier = "acme-prod"

  lifecycle {
    prevent_destroy = true
  }
}
```

Any plan that would destroy this resource fails instead. It is a guardrail against a bad `for_each` key change or an accidental `terraform destroy`.

⚠️ It blocks `terraform destroy` for the whole configuration, not just that resource. To genuinely delete, you must remove the `lifecycle` block first — which is a reviewable commit. That friction is the point.

### `ignore_changes`

```hcl
resource "aws_ecs_service" "app" {
  desired_count = 2

  lifecycle {
    # The autoscaler owns this value at runtime — don't fight it
    ignore_changes = [desired_count]
  }
}

resource "aws_instance" "app" {
  lifecycle {
    # Another system manages these tags
    ignore_changes = [tags["LastPatched"]]
  }
}
```

✅ The right use is when **another system legitimately owns an attribute** — autoscaling, a deployment tool, or AWS itself.

❌ The wrong use is silencing a diff you do not understand. `ignore_changes = all` means Terraform has stopped managing the resource.

### `replace_triggered_by`

```hcl
resource "aws_ecs_task_definition" "app" { ... }

resource "aws_ecs_service" "app" {
  task_definition = aws_ecs_task_definition.app.arn

  lifecycle {
    # Force a new service when the task definition changes
    replace_triggered_by = [aws_ecs_task_definition.app]
  }
}
```

Replaces this resource when another one changes. Useful for forcing a redeploy that Terraform would not otherwise consider necessary.

## Validation and Checks

Catch bad configuration at plan time rather than mid-apply.

**`validation` — constrain an input:**

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "instance_type" {
  type = string

  validation {
    condition     = can(regex("^(t3|m6i|r6g)\\.", var.instance_type))
    error_message = "instance_type must be from the t3, m6i or r6g families."
  }
}
```

**`precondition` / `postcondition` — assert about resources:**

```hcl
resource "aws_db_instance" "prod" {
  multi_az = var.environment == "prod"

  lifecycle {
    precondition {
      condition     = var.environment != "prod" || var.backup_retention_period >= 30
      error_message = "Production databases require 30+ days of backup retention."
    }
  }
}

data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  lifecycle {
    postcondition {
      condition     = self.architecture == "arm64"
      error_message = "AMI must be arm64 to match the Graviton instance type."
    }
  }
}
```

**`check` — a non-blocking assertion, reported as a warning:**

```hcl
check "health" {
  data "http" "endpoint" {
    url = "https://api.acme.com/health"
  }

  assert {
    condition     = data.http.endpoint.status_code == 200
    error_message = "API health check is not returning 200."
  }
}
```

| Feature | Fails the run? | Use For |
|---------|---------------|---------|
| `validation` | Yes | Input values |
| `precondition` | Yes | Assumptions before creating a resource |
| `postcondition` | Yes | Guarantees about what was created |
| `check` | No — warning only | Ongoing health signals |

## Conditionals and Null Handling

```hcl
locals {
  # Ternary
  instance_type = var.environment == "prod" ? "m6i.xlarge" : "t3.medium"

  # coalesce — first non-null value
  region = coalesce(var.region, data.aws_region.current.name)

  # try — first expression that does not error
  bucket_name = try(var.bucket_name, "acme-${var.environment}-default")

  # lookup with a fallback
  cidr = lookup(var.cidrs_by_env, var.environment, "10.0.0.0/16")
}

resource "aws_instance" "app" {
  # null means "don't set this argument at all", not "set it to empty"
  key_name = var.key_name != "" ? var.key_name : null
}
```

**Optional object attributes:**

```hcl
variable "config" {
  type = object({
    name     = string
    replicas = optional(number, 2)     # default if omitted
    tags     = optional(map(string), {})
  })
}
```

## Functions Worth Knowing

Do not memorise the full list. These are the ones that appear in real code.

| Function | Use |
|----------|-----|
| `merge(a, b)` | Combine tag maps — later wins |
| `lookup(map, key, default)` | Safe map access |
| `try(a, b)` | Fall back when an expression errors |
| `coalesce(a, b)` | First non-null value |
| `cidrsubnet(cidr, bits, n)` | Carve subnets out of a VPC range |
| `templatefile(path, vars)` | Render user-data or a policy document |
| `jsonencode(obj)` | Build IAM policies without heredocs |
| `flatten(list)` | Collapse nested lists |
| `toset(list)` | Convert a list for `for_each` |
| `one(list)` | Single element or null — safe unwrapping |

**`cidrsubnet` — subnet maths without a calculator:**

```hcl
locals {
  vpc_cidr = "10.0.0.0/16"

  # Add 8 bits → /24 subnets; index picks which one
  public_subnets  = [for i in range(3) : cidrsubnet(local.vpc_cidr, 8, i)]
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]

  private_subnets = [for i in range(3) : cidrsubnet(local.vpc_cidr, 8, i + 100)]
  # ["10.0.100.0/24", "10.0.101.0/24", "10.0.102.0/24"]
}
```

**`jsonencode` for IAM policies:**

```hcl
resource "aws_iam_role_policy" "app" {
  role = aws_iam_role.app.id

  # ✅ jsonencode — interpolation is safe, syntax errors caught at plan
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.data.arn}/*"
    }]
  })
}
```

❌ Avoid heredoc JSON (`<<EOF ... EOF`). Terraform cannot validate it, and a missing comma fails at apply time.

## `depends_on` — Last Resort

Terraform builds a dependency graph automatically from references.

```hcl
# ✅ Implicit dependency — Terraform knows subnet needs the VPC
resource "aws_subnet" "app" {
  vpc_id = aws_vpc.main.id
}
```

```hcl
# ⚠️ Explicit — only for dependencies Terraform cannot see
resource "aws_instance" "app" {
  # The app reads from S3 at boot; there is no attribute reference to prove it
  depends_on = [aws_s3_bucket_policy.data]
}
```

❌ Adding `depends_on` because "the apply failed once" usually hides a missing reference. Fix the reference instead.

## Interview Q&A

**Q: What is the difference between `count` and `for_each`, and which should you use?**

`count` creates resources addressed by numeric index, so state holds `resource[0]`, `resource[1]`, and so on. `for_each` takes a map or set and addresses resources by a stable string key, giving `resource["api"]`. The practical difference shows up when you remove an item from the middle of a list. With `count`, everything after it shifts down an index, so Terraform sees the resource at index 1 now needs different attributes and plans to replace it, plus destroy the last index. You asked to delete one thing and Terraform destroys two and recreates one — on a database, that is data loss. With `for_each`, removing a key only affects that key. So `for_each` is the default choice, and the only good use of `count` is a boolean toggle written as `count = var.enabled ? 1 : 0`.

**Q: When would you use `create_before_destroy`?**

When replacing a resource would otherwise cause downtime. Terraform's default replacement order is destroy first, then create, which leaves a gap where the resource does not exist. For a launch template behind an autoscaling group, or a security group other resources reference, that gap is an outage. Setting `create_before_destroy = true` in the lifecycle block inverts the order: the new resource comes up, references switch over, then the old one goes away. The catch is that the two must be able to exist at the same time, so you cannot use a fixed `name` — you use `name_prefix` and let Terraform generate a unique suffix, otherwise the create fails on a name collision.

**Q: What does `ignore_changes` do, and when is it the wrong answer?**

It tells Terraform not to plan changes for specific attributes, even when the config and reality differ. The legitimate use is when another system genuinely owns that attribute — an ECS service's `desired_count` managed by application autoscaling, or a tag written by a patching tool. Without it, every plan shows a diff and every apply fights the other system. It is the wrong answer when you use it to silence a diff you do not understand; you have then hidden drift rather than resolved it. `ignore_changes = all` is almost always wrong, because at that point Terraform is no longer managing the resource and the code is lying about what is deployed.

**Q: How do you stop someone accidentally destroying a production database?**

Several layers. In the code, `lifecycle { prevent_destroy = true }` makes any plan that would destroy it fail outright, so removing it requires a reviewable commit that deletes the guardrail. At the resource level, `deletion_protection = true` and `skip_final_snapshot = false` mean AWS itself refuses the delete. Structurally, production databases live in their own state file separate from application resources, so an apply on the app layer physically cannot touch them. And the CI role that applies to production should not hold `rds:DeleteDBInstance` at all — deletions go through a separate break-glass role with explicit approval.

**Q: What is the difference between `validation`, `precondition`, and `check`?**

They differ in what they inspect and whether they stop the run. A `validation` block sits on a variable and constrains the input value — for example, that `environment` is one of dev, staging, or prod. A `precondition` sits in a resource's lifecycle block and asserts something before that resource is created, which lets you express cross-variable rules like "production requires at least thirty days of backup retention". A `postcondition` asserts something about what was actually created or read, such as a data source AMI being arm64. All three fail the run. A `check` block is different: it runs assertions after apply and reports failures as warnings without failing the run, which suits ongoing health signals like an endpoint returning 200. The rule of thumb is to fail early on things you control, and warn on things you only observe.

**Q: Why prefer `jsonencode` over a heredoc for IAM policies?**

Because `jsonencode` gives you a real data structure that Terraform type-checks. A missing comma or unbalanced brace is caught at plan time, interpolated ARNs are escaped correctly, and the policy is readable HCL rather than a string blob. With a heredoc, the JSON is just text as far as Terraform is concerned, so syntax errors surface when AWS rejects the API call mid-apply, and interpolating values into raw JSON is easy to get subtly wrong. The `aws_iam_policy_document` data source is another good option and reads well for complex policies with conditions, but `jsonencode` is the simplest correct default.

---
[Terraform Index](./README.md) | [← Modules](./04-modules.md) | [AWS Resources →](./06-aws-resources.md)
