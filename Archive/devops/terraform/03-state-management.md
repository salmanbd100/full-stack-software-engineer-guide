---
title: Terraform State Management
part: 8
chapter: 0
slug: terraform-state-management
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-08-03
tags: [devops, terraform, state, management]
in_book: false
---

# Terraform State Management

State is the most operationally dangerous part of Terraform. It is also the topic interviewers use to find out whether you have really run Terraform in production.

## What State Actually Is

State is a JSON file that maps the names in your code to real resource IDs in the cloud.

```json
{
  "resources": [
    {
      "type": "aws_s3_bucket",
      "name": "logs",
      "instances": [
        {
          "attributes": {
            "id": "acme-prod-logs",
            "arn": "arn:aws:s3:::acme-prod-logs"
          }
        }
      ]
    }
  ]
}
```

Without this mapping, Terraform cannot know that `aws_s3_bucket.logs` in your code is the bucket named `acme-prod-logs` in AWS.

**Why state has to exist:**

| Job | Why State Is Needed |
|-----|--------------------|
| **Identity** | Links a code address to a cloud resource ID |
| **Deletion** | The only record of what Terraform created, so it knows what to remove |
| **Metadata** | Stores dependency order so destroys happen in reverse |
| **Performance** | Caches attributes so plans do not re-read everything |

> Delete the state file and Terraform loses all memory. It will plan to create everything again — while the real resources still exist.

## The Three States

Every `plan` compares three things. Keeping them straight answers most state questions.

| | Where It Lives | Command |
|---|---|---|
| **Desired** | Your `.tf` files | `git diff` |
| **Recorded** | The state file | `terraform state list` |
| **Actual** | The real cloud API | AWS console / CLI |

```
Config says: 3 instances
State says:  3 instances
AWS says:    2 instances (one terminated by hand)
             ↓
plan: 1 to add
```

## Local State Is Not an Option

The default is `terraform.tfstate` next to your code.

🔴 **Why this fails in a team:**

- Only one person has it — nobody else can plan or apply
- No locking, so two applies at once corrupt it
- Laptop dies, state is gone, infrastructure is orphaned
- It contains secrets in plaintext, and it is easy to commit by accident

✅ Configure a remote backend before you create your first real resource.

## S3 Backend (the AWS standard)

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "prod/network/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true   # S3-native locking
  }
}
```

**What each setting gives you:**

| Setting | Why |
|---------|-----|
| `bucket` | Durable, versioned storage |
| `key` | Path inside the bucket — one key per environment and component |
| `encrypt` | Server-side encryption at rest |
| `use_lockfile` | Prevents two applies running at the same time |

⚠️ **Locking changed.** For years the answer was a DynamoDB table with `dynamodb_table = "terraform-locks"`. Terraform now supports **S3-native locking** with `use_lockfile = true`, and DynamoDB locking is deprecated. Know both — interviewers still ask about DynamoDB, and legacy code still uses it.

```hcl
# Legacy — still very common in existing codebases
terraform {
  backend "s3" {
    bucket         = "acme-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"   # deprecated
  }
}
```

**Bucket setup that is not optional:**

```bash
# Versioning — your only recovery path from a corrupted state file
aws s3api put-bucket-versioning \
  --bucket acme-terraform-state \
  --versioning-configuration Status=Enabled

# Block all public access
aws s3api put-public-access-block \
  --bucket acme-terraform-state \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

> ✨ **Bucket versioning is the single most valuable state safety feature.** When a state file goes bad, you restore the previous object version and you are back.

**The bootstrap problem:** the bucket that holds state cannot be created by the Terraform that uses it. Create it once with a small script or a separate `bootstrap` configuration with local state, then never touch it again.

## State Locking

Locking stops two people applying at once. Without it, two concurrent applies write over each other and the state no longer matches reality.

```
Alice: apply → acquires lock → creates RDS → releases lock
Bob:   apply → waits for lock ────────────→ proceeds
```

**When a lock gets stuck** — CI job killed mid-apply, laptop closed:

```bash
# Terraform tells you the lock ID in the error message
terraform force-unlock 8f3e1a2b-4c5d-6e7f-8a9b-0c1d2e3f4a5b
```

🔴 Only force-unlock when you are certain no apply is running. Breaking a live lock is how state gets corrupted.

## Splitting State

One state file for the whole company is a classic failure. Split it.

❌ **Monolith:**

```
terraform/
└── main.tf          # VPC + EKS + RDS + Lambda + DNS, all environments
```

Problems: 15-minute plans, one bad apply can touch production databases, and everyone blocks on the same lock.

✅ **Split by lifecycle and environment:**

```
live/
├── prod/
│   ├── network/        # changes rarely      → its own state
│   ├── data/           # RDS, DynamoDB       → its own state
│   └── apps/           # changes daily       → its own state
└── staging/
    ├── network/
    ├── data/
    └── apps/
```

**How to decide where the boundary goes:**

| Signal | Split |
|--------|-------|
| Different change frequency | Yes — daily app changes should not touch the VPC |
| Different blast radius | Yes — keep databases away from stateless services |
| Different team owns it | Yes |
| Always changed together | No — the coupling costs more than it saves |

**Reading across state boundaries:**

```hcl
# ✅ Preferred — a data source, no coupling to another team's state layout
data "aws_vpc" "main" {
  tags = { Name = "acme-prod" }
}

# ⚠️ Works, but couples you to the other state's internals
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "acme-terraform-state"
    key    = "prod/network/terraform.tfstate"
    region = "eu-west-1"
  }
}
```

> Prefer data sources or a shared tagging convention over `terraform_remote_state`. Reading another state file means reading another team's private implementation.

## Workspaces — and Why Not for Environments

Workspaces give you multiple state files from one configuration.

```bash
terraform workspace new staging
terraform workspace select staging
terraform workspace list
```

❌ **Do not use workspaces to separate dev/staging/prod.** This is a very common interview trap.

**Why not:**

- One set of provider credentials for every environment — no account isolation
- Easy to forget which workspace you are in and apply to production
- Environments always end up needing genuinely different config, not just different variables
- The environment is invisible in the code; you cannot review it

✅ Use separate directories and separate AWS accounts per environment instead.

✅ Workspaces are fine for short-lived parallel copies of the same thing — a per-pull-request test environment, for example.

## Importing Existing Resources

You will be asked this: infrastructure was built by hand, now bring it under Terraform.

**Modern way — `import` blocks (declarative, shows in the plan):**

```hcl
import {
  to = aws_s3_bucket.logs
  id = "acme-prod-logs"
}

resource "aws_s3_bucket" "logs" {
  bucket = "acme-prod-logs"
}
```

```bash
terraform plan    # shows what will be imported and any config mismatch
terraform apply   # performs the import
```

**Older way — the CLI:**

```bash
terraform import aws_s3_bucket.logs acme-prod-logs
```

**The workflow that actually works:**

```
1. Write a resource block with the right type and name
2. Add the import block with the real resource ID
3. terraform plan
4. Plan shows changes? → your config does not match reality
5. Edit config until plan is empty
6. Apply
```

⚠️ Import brings the resource into state; it does **not** write your configuration. An empty plan after import is the goal — that proves your code matches reality.

✨ `terraform plan -generate-config-out=generated.tf` will draft the configuration for imported resources. Treat the output as a starting point, not finished code.

## Refactoring with `moved` Blocks

Renaming a resource changes its address. Terraform sees an address it does not recognise and plans to **destroy and recreate** it.

❌ **Without a `moved` block:**

```hcl
# Renamed from "web" to "api"
resource "aws_instance" "api" { ... }
```

```
Plan: 1 to add, 1 to destroy   # 🔴 your instance is replaced
```

✅ **With a `moved` block:**

```hcl
moved {
  from = aws_instance.web
  to   = aws_instance.api
}

resource "aws_instance" "api" { ... }
```

```
Plan: 0 to add, 0 to change, 0 to destroy   # just a state rename
```

`moved` blocks also handle moving resources into modules:

```hcl
moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}
```

> `moved` blocks are committed code, so the refactor is reviewable and works for every teammate. The old `terraform state mv` command did the same thing but only on the machine where you ran it.

## State Commands

| Command | Use |
|---------|-----|
| `terraform state list` | See every address in state |
| `terraform state show <addr>` | Inspect one resource's recorded attributes |
| `terraform state pull > backup.tfstate` | Take a backup before surgery |
| `terraform state rm <addr>` | Forget a resource — leaves it running in AWS |
| `terraform state mv <a> <b>` | Rename in state (prefer a `moved` block) |
| `terraform force-unlock <id>` | Break a stuck lock |

**When `state rm` is the right answer:**

- You are handing a resource over to another team's Terraform
- The resource was deleted outside Terraform and you want state to agree
- You are splitting one state file into two

🔴 Always `terraform state pull` to a backup file before any `rm` or `mv`.

## Interview Q&A

**Q: What is the Terraform state file and why does it exist?**

It is a JSON record mapping each address in your configuration to the real resource it created — for example, that `aws_s3_bucket.logs` is the bucket `acme-prod-logs`. Terraform needs it for identity, because cloud APIs have no idea what you called something in your code. It is also the only record of what Terraform owns, which is what makes deletion possible: if you remove a resource block, Terraform knows from state that the resource used to exist and should now be destroyed. It additionally stores dependency information so destroys run in reverse order, and caches attributes so plans are faster. Lose it and Terraform will plan to create everything from scratch while the real resources are still running.

**Q: How do you set up remote state on AWS, and how does locking work now?**

An S3 bucket with versioning and encryption enabled, public access fully blocked, and a state key per environment and component — something like `prod/network/terraform.tfstate`. For locking, the current approach is S3-native locking with `use_lockfile = true` in the backend block; Terraform writes a `.tflock` object next to the state and refuses to proceed if one already exists. The older pattern used a DynamoDB table via `dynamodb_table`, and that is now deprecated, though you will still find it in most existing codebases. Bucket versioning matters most in practice — it is your recovery path if a state file is ever corrupted. The bucket itself has to be created outside the configuration that uses it, so it is a one-time bootstrap step.

**Q: Should you use workspaces to separate dev, staging, and production?**

No, and this is a common trap. Workspaces give you separate state files from one configuration, but they share provider credentials, so all environments end up in the same AWS account with no isolation. It is also very easy to forget which workspace is selected and apply to the wrong environment, and the environment is invisible in the code, so reviewers cannot see what they are approving. Real environments also diverge — production needs multi-AZ, larger instances, stricter policies — and expressing that through workspace conditionals gets ugly fast. The better structure is a directory per environment with its own backend key, pointing at a separate AWS account. Workspaces are genuinely useful for short-lived parallel copies, like an ephemeral environment per pull request.

**Q: How do you bring existing manually-created infrastructure under Terraform?**

Write the resource block first, then add an `import` block giving the real resource ID, then run `plan`. The import block is declarative and shows up in the plan, so the whole thing is reviewable, unlike the older `terraform import` CLI command that only affected your local run. The key point is that import only populates state — it does not write your configuration for you. So after importing, the plan will usually show differences, and you iterate on the config until the plan is completely empty. An empty plan is the proof that your code now describes reality. For large imports, `plan -generate-config-out` will draft the resource blocks, which saves time, but the output needs cleaning up before it is production code.

**Q: You renamed a resource and the plan says it will be destroyed and recreated. Why, and how do you avoid it?**

Terraform tracks resources by their address in the configuration. Renaming `aws_instance.web` to `aws_instance.api` means the old address is gone from the config and a new one has appeared, so Terraform plans to destroy one and create the other — even though you only wanted a rename. The fix is a `moved` block declaring `from = aws_instance.web` and `to = aws_instance.api`. Terraform then updates the address in state and the plan comes out empty. Because `moved` blocks are committed code, the refactor works for everyone and shows up in review, which is why they are preferred over the older `terraform state mv` command.

**Q: Two engineers ran apply at the same time and state is now inconsistent. What happened and how do you prevent it?**

Without locking, both runs read the same state, each computed a plan against it, and the second one to finish overwrote the first one's state. The result is state that has forgotten resources that actually exist, so the next plan tries to create duplicates. Prevention is state locking — `use_lockfile = true` on the S3 backend — so the second apply waits instead of racing. For recovery, S3 bucket versioning lets you restore the state object from just before the conflict, then run a plan to confirm it matches reality. The structural fix is that applies should only happen from CI, where the pipeline serialises runs per environment and nobody applies from a laptop at all.

---
[Terraform Index](./README.md) | [← Terraform Basics](./02-terraform-basics.md) | [Modules →](./04-modules.md)
