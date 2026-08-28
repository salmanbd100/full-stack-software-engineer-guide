---
title: AI-Assisted Code Development
part: 8
chapter: 0
slug: code-development
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-28
tags: [devops, genai, code, development]
in_book: false
---

# AI-Assisted Code Development

The value of AI in DevOps work is concentrated in code that is **verbose, highly patterned, and cheap to verify** — which describes most infrastructure code.

## Why IaC Is a Good Fit

```
Terraform for a VPC with public/private subnets across 3 AZs
= ~200 lines of highly repetitive HCL
= 20 minutes of typing, 2 minutes of thinking
```

| Property of IaC | Why AI Helps |
|----------------|-------------|
| Verbose | Most of the work is typing, not deciding |
| Highly patterned | Millions of near-identical examples exist |
| **Declarative** | ✅ You can read the whole thing and see what it does |
| **Verifiable** | `terraform plan` tells you exactly what will happen |
| Well documented | Provider schemas are public and precise |

> `terraform plan` is the ideal safety net: a complete, reviewable description of the change before anything happens. Nothing in application development gives you that.

⚠️ The same properties make errors subtle. A wrong CIDR or a missing `depends_on` looks identical to correct code.

## Prompting for Infrastructure

The difference between a useless and a useful result is almost entirely in the constraints you state.

❌ **Vague prompt:**

```
Write Terraform for an EKS cluster.
```

Result: a hard-coded, single-AZ, public-endpoint cluster with a wildcard IAM role and no tags.

✅ **Constrained prompt:**

```
Write a Terraform module for an EKS cluster with these constraints:

- Terraform >= 1.6, AWS provider ~> 5.0
- Private API endpoint only; no public access
- Managed node groups on Graviton (arm64), mixed On-Demand + Spot
- IRSA enabled (OIDC provider created)
- Control plane logging: api, audit, authenticator
- All resources take a `tags` variable — no hard-coded tags
- Variables for region, cluster name, VPC and subnet IDs — no hard-coded values
- Least-privilege IAM: specific actions and ARNs, no wildcards
- Include variable descriptions and validation blocks

Do not invent arguments. If unsure whether an argument exists, say so.
```

**The five constraints that matter most:**

| Constraint | Prevents |
|-----------|----------|
| **Versions** (Terraform + provider) | Deprecated syntax from old training data |
| **No hard-coded values** | Copy-paste modules that only work once |
| **Least privilege, explicitly** | 🔴 Wildcard IAM |
| **Tagging requirement** | Unattributable cost |
| **"Do not invent arguments"** | Plausible-looking hallucinated fields |

✨ Paste your existing module as an example and say *"follow this structure and naming"*. Matching your conventions matters more than raw correctness — wrong conventions cost review time forever.

## The Verification Loop

This is the part that distinguishes competent use from careless use.

```
Generate
   ↓
terraform fmt          ← formatting
   ↓
terraform validate     ← does it parse? do arguments exist?
   ↓
terraform plan         ← 🔴 read EVERY line. This is the real review
   ↓
checkov / tfsec        ← security misconfiguration
   ↓
infracost              ← ✨ what will this cost?
   ↓
Human review           ← is this the right design at all?
```

⚠️ `terraform validate` catches invented arguments. `plan` catches wrong values. Neither catches a bad design — that is your job.

```bash
# The loop, as a single command
terraform fmt -recursive && \
terraform validate && \
terraform plan -out=tfplan && \
terraform show -json tfplan > tfplan.json && \
checkov -f tfplan.json --framework terraform_plan && \
infracost breakdown --path .
```

✨ **`infracost` is underused with AI-generated infrastructure.** Generated code often includes a NAT gateway per availability zone or oversized instances, because those appear in tutorials. Seeing "$487/month" before merging catches it.

## What to Check Every Time

A review checklist for AI-generated infrastructure:

| Check | Common AI Mistake |
|-------|------------------|
| **IAM scope** | 🔴 `"Action": "*"` on `"Resource": "*"` |
| **Encryption** | Omitted entirely — no KMS key specified |
| **Public exposure** | Public subnets or `0.0.0.0/0` where private was intended |
| **Hard-coded values** | Region, account ID, or AMI baked in |
| **Deletion protection** | Missing on production databases |
| **Logging** | No CloudTrail, flow logs, or access logs |
| **Cost multipliers** | NAT gateway per AZ, oversized instances |
| **Tags** | Absent, so the resource is unattributable |
| **Provider version** | Unpinned, or syntax from an old major version |
| **Deprecated arguments** | Removed in the version you actually use |

🔴 **Encryption and logging are omitted more often than anything else**, because they are optional arguments and the shortest working example does not include them.

## Translation Tasks — The Strongest Use Case

Converting between formats is where these tools are most reliable, because both sides are structured and the mapping is mechanical.

| From | To | Reliability |
|------|----|------------|
| Docker Compose | Kubernetes manifests | ✅ High |
| CloudFormation | Terraform | ✅ Good — verify with `plan` |
| Shell script | Python/Boto3 | ✅ High |
| Jenkinsfile | GitHub Actions | ✅ Good |
| Kubernetes YAML | Helm chart | ✅ High |
| IAM policy in prose | JSON policy | ⚠️ Verify scope carefully |

⚠️ Translation preserves the **original's mistakes**. A Compose file running as root and exposing a database port converts into a Kubernetes manifest that does the same. Ask for the target's best practices explicitly:

```
Convert this Compose file to Kubernetes manifests. Additionally:
- add resource requests and limits
- add liveness and readiness probes
- run as non-root with a read-only root filesystem
- move the database credentials to a Secret reference, not literal values
- add a NetworkPolicy allowing only the app to reach the database
```

## Bash — Where AI Reliably Beats Most Humans

Correct error handling in shell scripts is easy to forget and easy to verify.

```bash
#!/usr/bin/env bash
# ✅ AI reliably produces this preamble; most humans skip it
set -euo pipefail          # exit on error, undefined var, and pipe failure
IFS=$'\n\t'

readonly CLUSTER="${1:?usage: $0 <cluster-name>}"
readonly REGION="${AWS_REGION:-eu-west-1}"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }

cleanup() {
  local code=$?
  [[ -n "${TMPDIR_LOCAL:-}" ]] && rm -rf "$TMPDIR_LOCAL"
  exit "$code"
}
trap cleanup EXIT INT TERM

TMPDIR_LOCAL="$(mktemp -d)"

log "Draining nodes in $CLUSTER ($REGION)"
```

✅ Ask for `shellcheck`-clean output. It is a hard, objective standard the tool can meet and you can verify in one command.

## Reviewing AI-Generated Pull Requests

Agentic tools now open pull requests. The review changes shape.

| Human PR | AI PR |
|----------|-------|
| Author understands the intent | ⚠️ No persistent intent to interrogate |
| Errors follow human patterns | Errors are confidently plausible |
| Scope usually matches the ticket | May silently touch unrelated files |
| You can ask "why?" | Answer is regenerated, not recalled |

**Review priorities for AI-generated changes:**

```
1. Diff scope     — did it change files it had no reason to touch?
2. Deletions      — did it remove a check, test, or guard "for clarity"?
3. Security       — IAM, secrets, network exposure, encryption
4. Cost           — new billable resources
5. Correctness    — does plan/test output match the stated intent?
```

🔴 Watch for **quietly deleted safety mechanisms**: a removed `depends_on`, a dropped validation block, a deleted test that was "failing", `prevent_destroy` removed to make an apply succeed.

## Interview Q&A

**Q: How do you use AI to write infrastructure code safely?**

The safety comes from the verification loop, not from trusting the output. I write heavily constrained prompts stating the Terraform and provider versions, that all values must come from variables, that IAM must be least privilege with specific actions and ARNs, and that every resource must accept tags — and I explicitly tell it not to invent arguments. Then I run the loop: format, validate to catch hallucinated arguments, plan and read every line of it, security scan the resolved plan with Checkov, and run infracost to see what it will cost. The plan output is the key artefact, because it is a complete description of what will actually happen before anything does, which is a safety net application code does not have. Finally a human reviews the design itself, since none of the tooling can tell me whether this is the right architecture.

**Q: What does AI-generated Terraform most commonly get wrong?**

Three things consistently. IAM is too broad — wildcard actions on wildcard resources, because that satisfies the request and is the most common pattern in training data. Encryption and logging are omitted, because they are optional arguments and the shortest working example leaves them out, so you get an unencrypted RDS instance with no flow logs and nothing fails. And values get hard-coded — region strings, account IDs, AMI identifiers — which produces a module that works exactly once. Beyond those, cost multipliers are common, like a NAT gateway in every availability zone, because tutorials show that pattern without discussing the bill. All four are caught by tooling: plan-based Checkov scanning finds the IAM, encryption, and logging problems, and infracost finds the cost ones.

**Q: Why is format translation such a reliable use case?**

Because both the input and the output are structured, the mapping between them is largely mechanical, and the result is immediately verifiable. Converting Docker Compose to Kubernetes manifests, CloudFormation to Terraform, or a Jenkinsfile to a GitHub Actions workflow is tedious pattern transformation rather than design work, which is exactly where these tools are strong and humans are slow and error-prone. The caveat is that translation faithfully preserves the original's flaws — a Compose service running as root with a database port exposed converts to a Kubernetes manifest that does the same thing. So I always ask for the target platform's best practices as part of the conversion: resource limits, probes, non-root with a read-only filesystem, secrets by reference, and network policies.

**Q: How does reviewing an AI-generated pull request differ from reviewing a colleague's?**

The main difference is that there is no persistent author intent to interrogate. With a colleague you can ask why they made a choice and get a real answer; with an agent you get a freshly generated rationalization, which may not reflect what actually drove the change. AI errors are also confidently plausible rather than following recognizable human patterns, so they survive a skim. Practically, I check three things first that I would not prioritize on a human PR: whether the diff scope extends beyond what the task required, whether anything was deleted — particularly tests, validation blocks, `depends_on` edges, or `prevent_destroy` — and whether new billable resources appeared. The pattern to watch for is a safety mechanism quietly removed to make something pass, since that is a very common way these changes achieve a green build.

**Q: Where would you not use AI in infrastructure work?**

Architecture decisions and anything where the cost of being confidently wrong is high and verification is weak. Choosing between ECS and EKS, deciding a multi-region strategy, or setting an availability target depends on business constraints, team capability, and cost tolerance that the tool has no access to — and it will produce a fluent, plausible recommendation regardless. I am also cautious during production incidents: it is genuinely useful for reading logs and suggesting hypotheses, but it cannot assess the blast radius of a suggested remediation, and under time pressure a plausible wrong answer is worse than no answer. And I would not use it to author IAM policies or security boundaries without treating the output as a first draft that must survive scanning and human review, because that is its most reliable failure mode.

---

[← AI Tools](./01-ai-tools.md) | [Index](./README.md) | [AI for Documentation →](./03-documentation.md)
