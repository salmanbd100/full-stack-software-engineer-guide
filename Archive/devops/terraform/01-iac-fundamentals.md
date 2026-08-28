---
title: Infrastructure as Code Fundamentals
part: 8
chapter: 0
slug: iac-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-03
tags: [devops, terraform, iac, fundamentals]
in_book: false
---

# Infrastructure as Code Fundamentals

Infrastructure as Code (IaC) means your servers, networks, and databases are defined in files you commit to Git — not clicked together in a web console.

## The Problem IaC Solves

A team builds a production environment by hand in the AWS console. Six months later they need an identical staging environment.

**What goes wrong:**

- Nobody remembers every setting that was changed
- The person who built it has left the company
- Staging ends up subtly different, so bugs only appear in production
- A misconfiguration has no author, no date, and no review

This is called **snowflake infrastructure** — every environment is unique and impossible to reproduce.

IaC fixes it with one rule: **if it is not in code, it does not exist.**

| Manual Console Work | Infrastructure as Code |
|--------------------|------------------------|
| No history | Full Git history with authors |
| No review | Pull request review |
| Not repeatable | Run it again, get the same result |
| Documentation drifts | The code *is* the documentation |
| Recovery = tribal memory | Recovery = `terraform apply` |

## 💡 **Declarative vs Imperative**

This is the most common opening question in an IaC interview.

**Imperative** — you write the steps:

```bash
# "How" — a script of instructions
aws ec2 run-instances --image-id ami-123 --count 3
```

Run this twice and you get six instances. The script does not know what already exists.

**Declarative** — you write the end state:

```hcl
# "What" — a description of the desired result
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-123"
  instance_type = "t3.micro"
}
```

Run this twice and you still have three instances. Terraform compares what you asked for against what exists, then closes the gap.

> Declarative tools are **idempotent**: applying the same config any number of times produces the same result.

**Why declarative wins for infrastructure:**

- ✅ Safe to re-run — no "did this already run?" anxiety
- ✅ The file shows current intent, not a history of changes
- ✅ The tool computes the difference, so you never write "if it exists, skip"

⚠️ Declarative does not mean magic. You still need to know the order things depend on, and some changes force a resource to be destroyed and recreated.

## The Reconciliation Loop

Every IaC tool works the same way underneath.

```
Desired state (your .tf files)
          +
Recorded state (what the tool created last time)
          +
Actual state (what is really in AWS)
          ↓
      Compute the difference
          ↓
   Create / Update / Destroy
```

**All three inputs matter.** A common interview trap:

**Q:** You delete an S3 bucket by hand in the console. What does `terraform plan` say?

**A:** It plans to create the bucket. State says it should exist, reality says it does not, so Terraform closes the gap.

## Drift

**Drift** is when real infrastructure stops matching your code.

**How drift happens:**

- Someone fixes an incident by hand at 3am and never backports it
- Another tool or AWS service changes a setting
- A resource is deleted manually

**How to handle it:**

| Approach | What It Does | When |
|----------|-------------|------|
| **Detect** | Scheduled `terraform plan` that alerts on any diff | Always — this is the baseline |
| **Correct** | Apply the code, overwriting the manual change | Normal case |
| **Absorb** | Update the code to match reality, then apply | The manual change was correct |

✅ Run a nightly plan in CI and alert when the diff is non-empty. Drift you do not know about is the dangerous kind.

❌ **Never** give humans write access to production infrastructure "just in case". Read access plus a break-glass role is enough.

## Mutable vs Immutable Infrastructure

**Mutable** — you change servers in place:

```
Server v1 → patch it → Server v1.1 → patch it → Server v1.2
```

Each server follows its own path. After a year, no two servers are the same. This is **configuration drift** at the server level.

**Immutable** — you replace servers:

```
Build image v2 → launch new servers → shift traffic → terminate old servers
```

**Why immutable is the modern default:**

- ✅ Rollback is "launch the previous image" — fast and reliable
- ✅ Every server from an image is byte-identical
- ✅ Testing the image tests production

| Pattern | Tool | Example |
|---------|------|---------|
| Immutable | Terraform + Docker/AMI | Replace the launch template, roll the ASG |
| Mutable | Ansible, Chef, Puppet | SSH in and run a playbook |

> Containers made immutable infrastructure the norm. A Docker image is an immutable server image that starts in milliseconds.

## Provisioning vs Configuration Management

Interviewers like to check that you know these are different jobs.

| | Provisioning | Configuration Management |
|---|---|---|
| **Question** | Does the VPC/instance/database exist? | Is the right software installed on it? |
| **Tools** | Terraform, CloudFormation, Pulumi | Ansible, Chef, Puppet |
| **Style** | Declarative | Mostly procedural |
| **State** | Explicit state file | Usually stateless |

✅ A common real stack: **Terraform** creates the infrastructure, **Docker** carries the application, and configuration management is barely needed.

## The Tool Landscape

| Tool | Language | Scope | Pick It When |
|------|----------|-------|--------------|
| **Terraform** | HCL | Any provider | Default choice; multi-cloud or many SaaS providers |
| **CloudFormation** | YAML/JSON | AWS only | AWS-only shop, want AWS-managed state and drift detection |
| **AWS CDK** | TypeScript, Python | AWS (compiles to CFN) | Team prefers a real programming language |
| **Pulumi** | TypeScript, Go, Python | Any provider | Want loops and types from a real language, multi-cloud |
| **Ansible** | YAML | Config management | Configuring existing servers, network devices |

**Terraform's tradeoffs:**

**Pros:**
- One workflow for AWS, Cloudflare, Datadog, GitHub, and 3000+ providers
- Huge module ecosystem
- `plan` shows exactly what will change before anything happens

**Cons:**
- You own the state file — losing or corrupting it is a real operational risk
- HCL is not a full programming language, so complex logic gets awkward
- Provider bugs and lag behind new cloud features

⚠️ **Licence note:** Terraform moved from MPL to the Business Source Licence in 2023. **OpenTofu** is the open-source fork; the language and commands are the same, so interview knowledge transfers directly.

## Core Concepts Vocabulary

Know these words cold — interviewers use them as shorthand.

| Term | Meaning |
|------|---------|
| **Provider** | Plugin that talks to an API (`aws`, `kubernetes`, `github`) |
| **Resource** | One thing you manage (`aws_s3_bucket.logs`) |
| **Data source** | Something you read but do not manage (`data.aws_ami.latest`) |
| **State** | The tool's record mapping your code to real resource IDs |
| **Plan** | The computed diff — create, update, destroy, or replace |
| **Module** | A reusable folder of resources with inputs and outputs |
| **Backend** | Where state is stored (S3, HCP Terraform, local disk) |

## The Workflow

```
write  →  init  →  validate  →  plan  →  review  →  apply
   ↑                                                  │
   └──────────── change is needed ────────────────────┘
```

| Command | What It Does |
|---------|-------------|
| `terraform init` | Downloads providers, configures the backend |
| `terraform validate` | Checks syntax and types — no API calls |
| `terraform plan` | Refreshes state, computes the diff |
| `terraform apply` | Executes the diff |
| `terraform destroy` | Removes everything in state |

> **Never apply a plan you have not read.** The one line to always look for is `must be replaced` — that means destroy and recreate, which for a database means data loss.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Local state file | No collaboration, easy to lose | Remote backend from day one |
| Secrets in `.tf` files | Committed to Git forever | Secrets Manager, injected at runtime |
| One giant state file | 40-minute plans, one blast radius | Split by lifecycle and environment |
| `terraform apply` from a laptop | No audit trail, drifting credentials | Apply only from CI |
| Copy-pasting environments | Three copies drift apart | Modules with different inputs |

## Interview Q&A

**Q: What is the difference between declarative and imperative infrastructure code?**

Imperative code lists the steps to reach a result — run this API call, then that one. It is not safe to re-run, because it does not know what already exists. Declarative code describes the desired end state, and the tool works out which actions are needed to get there. That makes it idempotent: applying the same configuration repeatedly leaves you in the same place. Terraform and CloudFormation are declarative; a Bash script full of AWS CLI calls is imperative. Declarative fits infrastructure because the file always reflects current intent, and the tool handles the diff for you.

**Q: What is configuration drift and how do you deal with it?**

Drift is when real infrastructure no longer matches the code — usually because someone made a manual change during an incident, or another system modified a setting. The danger is that your code silently stops being the source of truth, so the next apply produces a surprise. You handle it in two steps: detection and correction. Detection is a scheduled `terraform plan` in CI that alerts whenever the diff is non-empty. Correction is either applying the code to overwrite the manual change, or updating the code to match reality if the manual change was actually right. The long-term fix is to remove human write access to production so drift cannot be introduced in the first place.

**Q: Explain immutable infrastructure.**

Instead of patching a running server, you build a new image with the change baked in, launch fresh instances from it, shift traffic, and terminate the old ones. Nothing is modified in place. The benefit is that every instance is identical and reproducible, so what you tested is exactly what runs. Rollback also becomes trivial — you redeploy the previous image rather than trying to undo a patch. The mutable alternative, where you SSH in and run a playbook, means each server slowly follows its own history and no two end up the same. Containers made this the default pattern, because a Docker image is exactly this idea with a fast startup time.

**Q: Terraform or CloudFormation?**

If the estate is AWS-only and the team wants AWS to own state, locking, and drift detection, CloudFormation is a reasonable pick — there is nothing to operate, and it integrates with Service Catalog and StackSets. I would choose Terraform in most other cases. Real systems are rarely one provider: you also manage DNS in Cloudflare, dashboards in Datadog, and repositories in GitHub, and Terraform gives you one workflow and one review process for all of it. `terraform plan` output is also far clearer than a CloudFormation change set. The tradeoff is that you become responsible for the state file, which means a versioned, encrypted, locked remote backend is not optional.

**Q: Why is it a problem to run `terraform apply` from a developer laptop?**

Three reasons. First, there is no audit trail — you cannot tell who changed production or what plan they approved. Second, laptops have broad long-lived credentials, which is exactly the blast radius you do not want. Third, local runs vary: different Terraform versions, different provider versions, uncommitted local edits. Applying only from CI fixes all three. The pipeline authenticates with short-lived credentials through OIDC, runs a pinned Terraform version against committed code, records the plan it applied, and logs who approved it.

---
[Terraform Index](./README.md) | [Terraform Basics →](./02-terraform-basics.md)
