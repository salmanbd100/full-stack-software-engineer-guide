---
title: Terraform Best Practices
part: 8
chapter: 0
slug: devops-terraform-best-practices
level: intermediate # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-03
tags: [devops, terraform]
in_book: false
---

# Terraform Best Practices

Everything in this file is a decision you will be asked to defend: how the repository is laid out, how environments are separated, and what you refuse to do.

## Repository Structure

The layout that scales, and the reasoning behind it:

```
infrastructure/
├── modules/                    # reusable building blocks
│   ├── network/
│   ├── service/
│   └── database/
├── live/                       # actual deployed infrastructure
│   ├── prod/
│   │   ├── 10-network/         # ← one state file each
│   │   ├── 20-data/
│   │   ├── 30-platform/
│   │   └── 40-apps/
│   ├── staging/
│   │   └── (same shape)
│   └── dev/
│       └── (same shape)
├── policy/                     # OPA policies checked against plans
└── .github/workflows/
```

**Why this shape:**

| Choice | Reason |
|--------|--------|
| `modules/` separate from `live/` | A module is a definition; `live/` is a deployment |
| Directory per environment | Separate state, separate credentials, visible in code review |
| Numbered layers | Shows dependency order and the order to rebuild from scratch |
| One state file per layer | Small plans, contained blast radius, independent locks |

**Inside a layer:**

```
live/prod/40-apps/
├── backend.tf       # backend block only
├── providers.tf     # provider + default_tags
├── main.tf          # module calls
├── variables.tf
├── outputs.tf
└── terraform.tfvars # environment values (no secrets)
```

✅ Keeping `backend.tf` separate makes it obvious which state each directory writes to. That is the file reviewers should check first.

## Environment Separation

**The hierarchy, strongest first:**

```
Separate AWS account per environment       ← strongest
Separate state file per environment
Separate directory per environment
Workspaces                                 ← weakest, don't use for environments
```

✅ **Separate accounts** is the real answer. A dev pipeline with credentials for the dev account physically cannot touch production, no matter what the code says. It also isolates service quotas and makes cost attribution automatic.

❌ **Workspaces for environments** — the classic wrong answer:

- One provider configuration, so one set of credentials for all environments
- Easy to apply to the wrong environment without noticing
- The environment is invisible in the code, so reviewers cannot see it
- Real environments diverge, and expressing that in conditionals gets ugly

**Handling genuine differences between environments:**

```hcl
# live/prod/terraform.tfvars
environment        = "prod"
instance_type      = "m6i.xlarge"
min_size           = 6
multi_az           = true
single_nat_gateway = false
log_retention_days = 90
```

```hcl
# live/dev/terraform.tfvars
environment        = "dev"
instance_type      = "t3.medium"
min_size           = 1
multi_az           = false
single_nat_gateway = true
log_retention_days = 7
```

Same module, different inputs. The differences are explicit, in a file, reviewable.

⚠️ Some differences belong in the module, not the tfvars. If production *must* have backups, encode that in the module (`backup_retention_period = var.environment == "prod" ? 30 : 7`) rather than trusting every caller to set it.

## Naming Conventions

Pick one scheme and apply it everywhere.

```
<org>-<environment>-<component>-<resource>

acme-prod-payments-api
acme-staging-payments-db
```

**Resource naming in code:**

```hcl
# ✅ Don't repeat the type in the name — the type is already there
resource "aws_s3_bucket" "logs" { }              # aws_s3_bucket.logs
resource "aws_security_group" "database" { }     # aws_security_group.database

# ❌ Stutters at every reference
resource "aws_s3_bucket" "logs_s3_bucket" { }    # aws_s3_bucket.logs_s3_bucket
```

```hcl
# ✅ Use "this" for a module's single primary resource
resource "aws_ecs_service" "this" { }
```

| Rule | Example |
|------|---------|
| `snake_case` for names in code | `aws_subnet.private_app` |
| Singular resource names | `aws_subnet.private`, not `private_subnets` |
| Hyphens in actual AWS names | `acme-prod-api` |
| No environment in the code name | The directory already tells you |

## Tagging

Tags are how you answer "what is this and who pays for it?" six months later.

```hcl
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project
      Team        = var.team
      ManagedBy   = "terraform"
      Repository  = "acme/infrastructure"
    }
  }
}
```

✅ `default_tags` applies to everything the provider creates. You stop writing `merge()` on every resource.

| Tag | Used For |
|-----|----------|
| `Environment` | Cost separation, policy conditions |
| `Team` / `CostCentre` | Chargeback and ownership |
| `ManagedBy = terraform` | Spotting resources created by hand |
| `Repository` | Finding the code for a mystery resource |

✅ Enforce required tags with an AWS Config rule or a Conftest policy, so an untagged resource fails the plan.

⚠️ Changing a tag on some resources forces replacement — autoscaling group tags and launch template names are the usual culprits. Check the plan.

## Version Pinning

```hcl
terraform {
  required_version = "~> 1.9.0"    # patch updates only

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"          # minor updates, blocks 6.0
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"                # exact — modules change behaviour
}
```

| Constraint | Allows | Use For |
|-----------|--------|---------|
| `= 5.8.1` | Exactly that | Modules, maximum stability |
| `~> 5.60` | 5.60.x through 5.x | Providers |
| `~> 1.9.0` | 1.9.x only | Terraform itself |
| `>= 5.0` | Anything above | ❌ Never in `live/` |

✅ **Commit `.terraform.lock.hcl`.** It records exact versions and checksums so every machine gets identical providers.

```bash
# Include hashes for CI's platform and developers' laptops
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
```

## Keep State Files Small

**Symptoms your state is too big:**

- `plan` takes more than a few minutes
- One apply can affect the VPC *and* production databases
- Everyone waits on the same lock
- A failed apply leaves an unclear situation across many services

**Where to draw the boundary:**

| Signal | Split? |
|--------|--------|
| Different change frequency | ✅ Yes — daily app changes should not plan the VPC |
| Different blast radius | ✅ Yes — keep databases away from stateless services |
| Different team owns it | ✅ Yes |
| Always changed together | ❌ No — the wiring costs more than it saves |

**Reading across boundaries — data sources, not remote state:**

```hcl
# ✅ Loosely coupled — works even if the other team restructures their state
data "aws_vpc" "main" {
  tags = { Name = "acme-prod-vpc" }
}

# ⚠️ Couples you to another state file's internal layout
data "terraform_remote_state" "network" {
  backend = "s3"
  config  = { bucket = "...", key = "prod/network/terraform.tfstate" }
}
```

## Code Quality

**Use `locals` for computed values, `variables` for inputs:**

```hcl
variable "vpc_cidr" {         # ✅ input — the caller decides
  type = string
}

locals {                      # ✅ computed — derived, not chosen
  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  public_subnets  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 100)]
}
```

**Describe and type every variable:**

```hcl
# ✅
variable "backup_retention_days" {
  description = "Days to keep automated RDS backups. Production requires 30 or more."
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "backup_retention_days must be between 1 and 35."
  }
}

# ❌ No type, no description, no constraint
variable "retention" {}
```

**Comment the *why*, never the *what*:**

```hcl
# ❌ Says what the code already says
# Create an S3 bucket
resource "aws_s3_bucket" "logs" { }

# ✅ Explains a decision a reader could not infer
# Logs stay in eu-west-1 even though the app runs in eu-west-2 —
# our SIEM ingest endpoint is region-locked.
resource "aws_s3_bucket" "logs" {
  provider = aws.eu_west_1
}
```

## Guardrails for Dangerous Resources

```hcl
resource "aws_db_instance" "prod" {
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "acme-prod-final"

  lifecycle {
    prevent_destroy = true
  }
}
```

**Layered protection:**

| Layer | Control |
|-------|---------|
| Code | `lifecycle { prevent_destroy = true }` |
| AWS | `deletion_protection = true` |
| State | Databases in their own state file |
| IAM | Apply role denied `rds:DeleteDBInstance` |
| Policy | Conftest rule failing any plan with a delete on `aws_db_instance` |

> Any one layer can be bypassed by someone determined. All five together means an accidental deletion is essentially impossible.

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|--------------|------------|-----|
| One state file for everything | 20-minute plans, huge blast radius | Split by lifecycle |
| Workspaces for environments | Shared credentials, wrong-environment applies | Directory + account per environment |
| `count` on a list of resources | Removing an item replaces others | `for_each` with stable keys |
| Unpinned provider or module versions | Infrastructure changes with no commit | Pin, and commit the lock file |
| Secrets in `.tf` or `.tfvars` | In Git forever | Secrets Manager, value set out of band |
| `terraform apply` from a laptop | No audit trail, drifting credentials | Apply only from CI |
| `-auto-approve` on a fresh plan | Applies something unreviewed | Apply the saved plan artifact |
| `ignore_changes = all` | Terraform no longer manages the resource | Ignore specific attributes only |
| Module wrapping one resource | A layer with no value | Use the resource directly |
| Copy-pasted environments | They drift; staging stops predicting prod | Shared modules, different tfvars |
| Hard-coded account IDs and AMIs | Breaks in other accounts and regions | Data sources and variables |
| No drift detection | Manual changes found during an incident | Scheduled `plan -detailed-exitcode` |

## Pull Request Checklist

What a reviewer should actually check:

- [ ] Plan output is attached, and read
- [ ] No `must be replaced` on stateful resources — or it is explained
- [ ] Resource count changed matches the intent of the diff
- [ ] `terraform fmt` is clean
- [ ] New variables have `description`, `type`, and validation where useful
- [ ] No secrets in the diff
- [ ] Module and provider versions pinned
- [ ] Applied to a lower environment first
- [ ] Tags present, or covered by `default_tags`

## Adopting Terraform in an Existing Estate

A common scenario question: infrastructure exists, built by hand.

```
1. Set up remote state and CI first — before importing anything
2. Write the modules for what you have
3. Import newest and least critical first — build confidence
4. Iterate until plan is empty for each import
5. Cut manual write access once a layer is under Terraform
6. Turn on drift detection
```

✅ Import the **VPC and networking last**. It is the foundation everything references, so a mistake there is the most disruptive.

✅ Anything created from now on is created with Terraform. That stops the hand-built estate from growing while you migrate it.

## Interview Q&A

**Q: How do you structure a Terraform repository?**

Two top-level trees: `modules/` holding reusable definitions, and `live/` holding what is actually deployed. Under `live/` there is a directory per environment, and within each environment a numbered directory per layer — `10-network`, `20-data`, `30-platform`, `40-apps` — each with its own state file. The numbering communicates dependency order and tells you the order to rebuild from nothing. The split by layer keeps plans fast and blast radius contained: a daily application change plans four resources, not four hundred, and cannot possibly touch the production database because that is in a different state file with a different lock. Each layer keeps its backend block in its own `backend.tf` so a reviewer can immediately see which state a change writes to.

**Q: How do you separate environments?**

Separate AWS accounts, which is the strongest boundary available — the dev pipeline holds credentials for the dev account and physically cannot reach production regardless of what the code says. It also isolates service quotas and makes cost attribution automatic. Below that, a directory per environment with its own state file and its own tfvars, so the environment is explicit in the code and visible in review. The differences between environments live in tfvars: instance sizes, minimum capacity, whether NAT is shared, log retention. Anything that must be true of production regardless of caller — encryption, backup retention, multi-AZ — belongs inside the module as a conditional on `environment`, rather than trusting every caller to set it correctly.

**Q: What are the signs a state file has grown too large, and how do you split it?**

Plans taking more than a couple of minutes, everyone queueing on the same lock, and a single apply having the power to touch both your VPC and your production databases. The split follows change frequency and blast radius. Networking changes rarely and everything depends on it, so it gets its own state. Stateful resources — databases, caches, buckets with data — get their own state with `prevent_destroy` and a separate IAM path. Stateless application resources change daily and get their own. Cross-layer references use data sources looked up by tag rather than `terraform_remote_state`, because reading another state file couples you to another team's internal layout. The counter-signal is resources that always change together — splitting those adds wiring without reducing risk.

**Q: What are the worst Terraform anti-patterns you have seen?**

A single state file for an entire estate, which makes every plan slow and every apply risky. Workspaces used to separate production from dev, which means one set of credentials and a real chance of applying to the wrong environment. Unpinned module sources, so infrastructure changes because someone else merged to a module's main branch. Secrets in tfvars files, committed. Applying from laptops, so nobody can say who changed production. And `ignore_changes = all` on resources that were producing confusing diffs, which means Terraform has quietly stopped managing them while the code claims otherwise. The common thread is that each one trades a small amount of short-term convenience for the loss of the property that makes Terraform valuable — that the code is a truthful, reviewable description of what is deployed.

**Q: How would you adopt Terraform for infrastructure that was built by hand?**

Set up the foundations before importing anything: a remote state backend with locking, a CI pipeline that plans on pull requests and applies on merge, and OIDC roles. Then write the modules that describe what already exists. Import in order of increasing risk — start with something recent and non-critical to build confidence in the workflow, and leave the VPC and networking until last, because everything references it and a mistake there is the most disruptive. For each import, iterate on the configuration until the plan comes back completely empty, since an empty plan is the proof that your code matches reality. Once a layer is under Terraform, remove human write access for it so it cannot drift, and enable scheduled drift detection. Critically, from day one everything new is created with Terraform, so the hand-built estate stops growing while you migrate it.

**Q: What do you look for when reviewing someone's Terraform pull request?**

The plan output first, and specifically any `must be replaced` or `will be destroyed` lines on anything holding data. Then whether the number of affected resources matches the intent — a one-line change touching forty resources usually means `count` indices have shifted or a shared local changed. I check that new variables have descriptions, types, and validation where the value matters, because those are the module's documentation. I check the diff for anything secret-shaped, and that module and provider versions are pinned rather than floating. I want to know it has been applied to a lower environment first, and that the change follows the promotion path rather than going straight to production. And I check `backend.tf` if it is touched at all, because a change there redirects state and is the most dangerous single line in the repository.

---
[Terraform Index](./README.md) | [← Security](./09-security.md) | [CloudFormation →](../IaC/11-cloudformation.md)
