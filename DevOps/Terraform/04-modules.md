# Terraform Modules

A module is a folder of `.tf` files with defined inputs and outputs. It is Terraform's only unit of reuse.

## Every Configuration Is Already a Module

The directory you run `terraform apply` in is the **root module**. When it calls another folder, that folder is a **child module**.

```
live/prod/apps/          ← root module (you run terraform here)
└── calls module "vpc"   ← child module
    └── calls module "subnets"   ← nested child module
```

There is no special syntax that makes a folder a module. Any folder with `.tf` files can be one.

## Why Modules Exist

❌ **Without modules — copy-paste per environment:**

```
environments/
├── dev/main.tf        # 400 lines
├── staging/main.tf    # the same 400 lines, slightly edited
└── prod/main.tf       # the same 400 lines, differently edited
```

A security fix now needs three identical edits. Within a month the three files have drifted and staging no longer predicts production.

✅ **With modules — one definition, three calls:**

```
modules/
└── service/           # 400 lines, written once
live/
├── dev/main.tf        # 15 lines of inputs
├── staging/main.tf    # 15 lines of inputs
└── prod/main.tf       # 15 lines of inputs
```

| Benefit | What It Means |
|---------|--------------|
| **One place to fix** | A security change lands everywhere |
| **Environments provably similar** | Same code, different inputs |
| **Encodes standards** | Encryption, tags, and logging are built in, not remembered |
| **Readable root config** | The root shows intent, not 400 lines of detail |

## Module Structure

```
modules/service/
├── main.tf         # resources
├── variables.tf    # inputs
├── outputs.tf      # what callers can read
├── versions.tf     # required_version and provider constraints
└── README.md       # what it does, and an example call
```

**A minimal, well-written module:**

```hcl
# modules/service/variables.tf
variable "name" {
  description = "Service name, used as a prefix for all resource names"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.name))
    error_message = "name must be lowercase letters, digits and hyphens (3-21 chars)."
  }
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 2
}

variable "tags" {
  description = "Tags applied to every resource"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/service/main.tf
locals {
  # Merge caller tags with tags the module always enforces
  tags = merge(var.tags, {
    Module = "service"
    Name   = var.name
  })
}

resource "aws_ecs_service" "this" {
  name            = var.name
  desired_count   = var.desired_count
  task_definition = aws_ecs_task_definition.this.arn
  tags            = local.tags
}
```

```hcl
# modules/service/outputs.tf
output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.this.id
}
```

✨ Name the primary resource in a module `this`. It reads well at the call site: `module.api.service_arn` rather than `module.api.aws_ecs_service_api_service_arn`.

## Calling a Module

```hcl
module "api" {
  source  = "git::https://github.com/acme/tf-modules.git//service?ref=v2.4.0"

  name          = "payments-api"
  desired_count = 6

  tags = {
    Environment = "prod"
    Team        = "payments"
  }
}

# Read an output
output "api_arn" {
  value = module.api.service_arn
}
```

**Source types:**

| Source | Example | Use For |
|--------|---------|---------|
| Local path | `./modules/service` | Modules private to this repo |
| Terraform Registry | `terraform-aws-modules/vpc/aws` | Well-maintained public modules |
| Git with tag | `git::https://...//service?ref=v2.4.0` | Your shared internal modules |
| S3 / private registry | `s3::https://...` | Air-gapped or enterprise setups |

🔴 **Always pin a version.** An unpinned Git source means your infrastructure changes because someone else merged to `main`.

```hcl
# ❌ Whatever is on main right now
source = "git::https://github.com/acme/tf-modules.git//service"

# ✅ Reproducible
source = "git::https://github.com/acme/tf-modules.git//service?ref=v2.4.0"
```

```hcl
# Registry modules use a separate version argument
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"   # allow 5.8.x patches, block 6.0
}
```

## Interface Design

The variables and outputs are the module's public API. Getting them right is what separates a useful module from a painful one.

**✅ Good interface — small and intention-revealing:**

```hcl
module "database" {
  source = "./modules/database"

  name        = "orders"
  size        = "medium"      # module maps this to instance class + storage
  environment = "prod"        # module decides multi-AZ, backups, deletion protection
}
```

**❌ Bad interface — every AWS argument exposed:**

```hcl
module "database" {
  source = "./modules/database"

  instance_class          = "db.r6g.xlarge"
  allocated_storage       = 200
  multi_az                = true
  backup_retention_period = 30
  # ...40 more variables
}
```

The bad version is a wrapper with no value. The caller still needs to know everything about RDS, and nothing stops them setting `multi_az = false` in production.

| Rule | Why |
|------|-----|
| **Few required inputs** | A module with 30 required variables is not reusable |
| **Safe defaults** | Encryption on, public access off, backups enabled |
| **Describe every variable** | The description is the documentation |
| **Validate inputs** | Fail at plan time with a clear message, not mid-apply |
| **Output what callers need** | ARNs, endpoints, security group IDs |

> Design a module around the **decision** the caller makes ("this is a production database"), not around the AWS API surface.

## Composition Over Nesting

Deep module trees are hard to debug. A change to a leaf module has unclear effects three levels up.

❌ **Too deep:**

```
root → platform → environment → networking → vpc → subnets
```

✅ **Flat composition — the root wires modules together:**

```hcl
module "network" {
  source = "./modules/network"
  cidr   = "10.0.0.0/16"
}

module "cluster" {
  source     = "./modules/eks"
  vpc_id     = module.network.vpc_id      # explicit wiring
  subnet_ids = module.network.private_subnet_ids
}

module "api" {
  source       = "./modules/service"
  cluster_name = module.cluster.name
}
```

✅ Keep nesting to **two levels at most**. The root module should read like a diagram of your system.

## Providers in Modules

**Rule: child modules do not configure providers.** They inherit them from the root.

```hcl
# ❌ Never do this inside a reusable module
provider "aws" {
  region = "eu-west-1"
}
```

A module with its own provider block cannot be used with `for_each`, cannot be given a different region by the caller, and cannot be removed cleanly.

✅ **Declare requirements, let the caller pass the provider:**

```hcl
# modules/replica/versions.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      configuration_aliases = [aws.replica]
    }
  }
}
```

```hcl
# Root module — multi-region call
provider "aws" {
  region = "eu-west-1"
}

provider "aws" {
  alias  = "replica"
  region = "us-east-1"
}

module "backup" {
  source = "./modules/replica"

  providers = {
    aws         = aws
    aws.replica = aws.replica
  }
}
```

## Iterating Over Modules

```hcl
variable "services" {
  type = map(object({
    desired_count = number
    cpu           = number
  }))
}

module "service" {
  source   = "./modules/service"
  for_each = var.services

  name          = each.key
  desired_count = each.value.desired_count
  cpu           = each.value.cpu
}
```

```hcl
# terraform.tfvars
services = {
  api      = { desired_count = 6, cpu = 1024 }
  worker   = { desired_count = 2, cpu = 512 }
  scheduler = { desired_count = 1, cpu = 256 }
}
```

Addresses become `module.service["api"]`. Adding a service to the map does not disturb the others.

⚠️ Use `for_each` rather than `count` here. With `count`, removing the middle item renumbers everything after it, and Terraform destroys and recreates resources that should not have been touched.

## Versioning Shared Modules

Treat internal modules like published libraries.

```
v2.4.0
│ │ │
│ │ └─ Patch: bug fix, no interface change
│ └─── Minor: new optional variable, new output
└───── Major: variable removed or renamed, resource replaced
```

**Release workflow:**

```bash
git tag v2.4.0
git push origin v2.4.0
```

**Rolling out a major version:**

1. Tag `v3.0.0` with a migration note in the changelog
2. Bump one non-critical environment first
3. Read the plan carefully — look for `must be replaced`
4. Promote through staging, then production

✅ Keep a `CHANGELOG.md` in the module repo. When a plan wants to replace a database, the changelog is what tells you whether that is expected.

## Public vs Private Modules

**Public modules** — `terraform-aws-modules/*` on the Registry are genuinely good and widely used.

**Pros:**
- Battle-tested edge cases you would not think of
- Maintained as AWS adds features

**Cons:**
- Very large interfaces (the VPC module has over 200 variables)
- You inherit someone else's opinions and upgrade schedule
- Upgrades can produce surprising replacement plans

✅ A practical middle ground: wrap a public module in a thin internal module that fixes your organisation's defaults.

```hcl
# modules/acme-vpc/main.tf — our opinionated wrapper
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = var.name
  cidr = var.cidr

  # Our standards, not negotiable per team
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "prod"
  enable_flow_log        = true
  enable_dns_hostnames   = true
}
```

Teams call `acme-vpc` with three variables and get a compliant VPC.

## When Not to Write a Module

❌ **A module wrapping one resource with no added logic:**

```hcl
# Pointless — adds a layer, adds nothing
module "bucket" {
  source = "./modules/s3-bucket"
  name   = var.name
}
```

Just write the resource. A module earns its place when it adds defaults, enforces standards, or ties several resources together.

| Write a module when | Skip the module when |
|--------------------|---------------------|
| Used in 3+ places | Used once |
| Groups 3+ related resources | Wraps a single resource |
| Enforces security or tagging standards | Adds no logic |
| Hides genuinely complex wiring | Just renames arguments |

## Interview Q&A

**Q: What is a Terraform module and why use one?**

A module is just a directory of `.tf` files with declared inputs and outputs — the directory you run Terraform in is itself the root module. The reason to use them is that they are Terraform's only mechanism for reuse. Without modules you copy the same configuration into each environment, so a single security fix becomes three identical edits and the copies gradually drift apart until staging stops predicting production. With a module, the definition lives in one place and each environment supplies different inputs. Modules are also where you encode organisational standards: if the module always enables encryption and blocks public access, nobody has to remember to.

**Q: How do you version modules, and why does it matter?**

Tag the module repository with semantic versions and reference the tag in the source, for example `?ref=v2.4.0` for a Git source, or the `version` argument for a Registry module. It matters because an unpinned source means your infrastructure can change without you changing anything — someone merges to the module's main branch, you run `apply`, and you get their change. Semantic versioning also communicates risk: a patch is a bug fix, a minor adds an optional variable, and a major means an interface change or something that will be replaced. You roll a major version out one environment at a time and read every plan for `must be replaced` lines, because that is where data loss hides.

**Q: What makes a good module interface?**

A small number of required inputs, safe defaults for everything else, and variables that express a decision rather than an AWS argument. If a caller has to set forty variables including `multi_az` and `backup_retention_period`, the module has added a layer without adding value — they still need to know all of RDS, and nothing stops them disabling multi-AZ in production. A better interface takes `environment = "prod"` and lets the module decide multi-AZ, backup retention, and deletion protection. Every variable should have a description, because that is the documentation, and inputs worth constraining should use `validation` blocks so bad values fail at plan time with a clear message rather than halfway through an apply.

**Q: Should a child module contain a provider block?**

No. Child modules should declare which providers they need in `required_providers` and inherit the actual configuration from the root module. A module that configures its own provider cannot be called with `for_each`, cannot be pointed at a different region by the caller, and creates problems when you try to remove it. If a module genuinely needs a second provider — say a cross-region replica — it declares a `configuration_aliases` entry, and the root passes the aliased provider explicitly through a `providers` block. That keeps provider configuration and credentials in exactly one place, which is also what you want for auditability.

**Q: `count` or `for_each` when creating several copies of a module?**

`for_each`, in almost every case. `count` gives resources index-based addresses like `module.service[0]`, so removing an item from the middle of the list renumbers everything after it. Terraform then sees different addresses and plans to destroy and recreate resources that you never intended to touch — which on a database is catastrophic. `for_each` keys resources by a stable string, giving addresses like `module.service["api"]`, so adding or removing an entry only affects that entry. The only reasonable use for `count` is a simple on/off toggle, where you write `count = var.enabled ? 1 : 0`.

**Q: Would you use public Registry modules or write your own?**

Both, layered. The `terraform-aws-modules` collection handles a lot of edge cases well and is actively maintained, so reimplementing a VPC module from scratch is usually wasted effort. The downside is a very large interface and inheriting someone else's defaults and upgrade timing. The pattern I prefer is a thin internal wrapper: our module takes three or four variables, calls the public module with a pinned version, and hard-codes our standards such as flow logs on, NAT gateways per AZ in production, and our tagging scheme. Teams get a compliant VPC without needing to know the two hundred variables underneath, and when we need to change a standard we change it in one place.

---
[Terraform Index](./README.md) | [← State Management](./03-state-management.md) | [Advanced Patterns →](./05-advanced-patterns.md)
