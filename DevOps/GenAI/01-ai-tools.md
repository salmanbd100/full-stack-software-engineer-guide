# AI Tools for DevOps

AI coding tools have moved from autocomplete to agents that read a repository, run commands, and open pull requests. Knowing where each fits — and where they fail — is now an expected engineering skill.

## The Three Generations

```
1. Completion       → suggests the next few lines as you type
2. Chat             → you ask, it answers, you copy the answer in
3. Agentic          → reads files, runs commands, edits, iterates, opens a PR
```

| Generation | You Provide | It Provides | Risk |
|-----------|-------------|-------------|------|
| **Completion** | Cursor position | Line or block | Low — you see everything |
| **Chat** | A question + pasted context | An explanation or snippet | Low — you apply it manually |
| **Agentic** | A goal | Multi-file changes, commands run | 🔴 Higher — it acts |

> The shift that matters for DevOps is agentic. A tool that can run `terraform apply` or `kubectl delete` is an operator, and needs the same controls as any other operator.

## The Landscape

| Tool | Type | Where It Fits in DevOps |
|------|------|------------------------|
| **GitHub Copilot** | IDE completion, chat, agent mode, PR review | Everyday coding, PR review, repo-wide instructions |
| **Claude Code** | Terminal / IDE agent | Multi-file refactors, debugging, repo-wide changes |
| **Amazon Q Developer** | IDE + CLI agent (`q chat`) | ✅ AWS-aware: reads your account, explains resources, writes IaC |
| **Cursor / Windsurf** | AI-native editor | Tight edit loops with repo context |
| **Amazon Bedrock** | Model API | Building your **own** automation (log triage, summarizers) |
| **Amazon DevOps Guru** | Managed AIOps | Anomaly detection on AWS resources, no prompting |

⚠️ **AWS CodeWhisperer no longer exists as a separate product** — it became **Amazon Q Developer** in 2024. Referring to CodeWhisperer in an interview dates your knowledge.

## What Makes Amazon Q Developer Different

It can query your actual AWS account, not just your code.

```bash
# Interactive session with AWS context
q chat

# Useful DevOps prompts:
#   "Why is my ECS service checkout-api not reaching steady state?"
#   "Which S3 buckets in this account allow public access?"
#   "Write Terraform for a VPC matching the one in eu-west-1"
```

**Custom agents scope what it may touch — this is the important part:**

```json
{
  "name": "infra-review",
  "description": "Read-only AWS infrastructure reviewer",
  "prompt": "You are an AWS infrastructure specialist. Never modify resources.",
  "tools": ["fs_read", "execute_bash", "use_aws"],
  "allowedTools": ["fs_read", "use_aws"],
  "toolsSettings": {
    "use_aws": {
      "allowedServices": ["s3", "ec2", "cloudformation"]
    }
  },
  "resources": ["file://infrastructure/**/*.tf", "file://docs/architecture.md"]
}
```

✅ `allowedTools` is the auto-approve list; anything in `tools` but not `allowedTools` prompts first. For infrastructure work, keep write tools out of the allowed list.

## Repository Instructions — The Highest-Value Setup

The single biggest quality improvement is telling the tool your conventions once, in a file, instead of repeating them in every prompt.

| File | Read By |
|------|---------|
| `.github/copilot-instructions.md` | GitHub Copilot, repository-wide |
| `.github/instructions/*.instructions.md` | Copilot, path-scoped via `applyTo` |
| `AGENTS.md` | Widely supported convention across agents |
| `CLAUDE.md` | Claude Code |

```markdown
<!-- .github/copilot-instructions.md -->
# Repository conventions

## Infrastructure
- Terraform only. Never generate CloudFormation.
- Every module must accept a `tags` variable and apply it to all resources.
- Remote state is S3 + DynamoDB locking. Never suggest local state.
- Region variables only — no hard-coded region strings.

## Pipelines
- GitHub Actions. Authenticate to AWS with OIDC — never store access keys.
- Every job starts from `permissions: {}` and grants only what it needs.
- Pin actions to a commit SHA, not a tag.

## Containers
- Multi-stage builds, distroless runtime, non-root user.
- Tag images by commit SHA. Never `latest`.
```

✨ This turns "the AI keeps suggesting the wrong pattern" into a solved problem, and it doubles as onboarding documentation for new engineers.

## Where AI Is Genuinely Strong for DevOps

| Task | Why It Works Well |
|------|------------------|
| **Boilerplate IaC** | Terraform and Kubernetes manifests are verbose and highly patterned |
| **Translating between formats** | Docker Compose → Kubernetes, CloudFormation → Terraform |
| **Explaining unfamiliar code** | A 400-line Jenkinsfile someone left behind |
| **Regex, `jq`, and AWS CLI queries** | Fiddly syntax, instantly verifiable |
| **Log and stack trace triage** | Pattern matching across noisy text |
| **Writing tests** | Tedious, and the test either passes or fails |
| **First draft of a runbook or postmortem** | Structure is formulaic, content needs you |
| **Bash scripts with proper error handling** | Easy to forget `set -euo pipefail` |

✅ The pattern: AI is strong where output is **verbose, patterned, and cheap to verify**.

## Where AI Is Weak — and Why

| Task | Failure Mode |
|------|-------------|
| **Architecture decisions** | No knowledge of your constraints, cost model, or team |
| **Anything security-sensitive** | Confidently generates over-permissive IAM |
| **Recent service features** | Training cutoff — invents parameters that do not exist |
| **Production incident judgement** | Suggests plausible fixes with no way to assess risk |
| **Cost implications** | Will happily generate a NAT gateway per subnet |
| **Your undocumented context** | Cannot know why that "unused" security group must stay |

🔴 **The IAM problem is the most dangerous.** Asked for a policy that "lets Lambda read from S3", these tools very often produce `"Action": "s3:*"` on `"Resource": "*"`. It works, so it passes review by anyone not paying attention.

```json
// ❌ Typical AI-generated policy — works, and is a serious finding
{ "Effect": "Allow", "Action": "s3:*", "Resource": "*" }

// ✅ What you must ask for instead
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::acme-reports-prod/exports/*"
}
```

✅ Always follow up with: *"Rewrite this with least privilege — specific actions, specific resource ARNs, and add a condition on the source account."*

## Hallucination Patterns to Expect

| Pattern | Example |
|---------|---------|
| **Invented arguments** | A Terraform resource argument that does not exist |
| **Wrong provider version syntax** | Pre-2.0 AWS provider patterns |
| **Plausible but wrong CLI flags** | `--recursive` on a command that has no such flag |
| **Non-existent npm packages** | 🔴 A supply chain risk — attackers register hallucinated names |
| **Mixed API versions** | Kubernetes `apiVersion` from a deprecated release |

🔴 **Slopsquatting:** attackers monitor which package names AI tools hallucinate, then publish malicious packages under those exact names. Always verify a suggested dependency actually exists and is the one you meant.

## Choosing a Tool

| Need | Reach For |
|------|-----------|
| Inline completion while writing code | GitHub Copilot |
| Multi-file refactor across a repo | Claude Code, Cursor, Copilot agent mode |
| Questions about your live AWS account | Amazon Q Developer |
| Anomaly detection with no prompting | Amazon DevOps Guru |
| Custom automation you own | Amazon Bedrock + your own code |
| Reviewing a pull request | Copilot code review, plus a human |

> These tools overlap heavily and change quickly. What does not change is the requirement: **you own the output**. "The AI wrote it" is not a defence in a postmortem.

## Interview Q&A

**Q: How do you use AI tools in your DevOps work?**

I use them where output is verbose, patterned, and cheap to verify — Terraform boilerplate, Kubernetes manifests, `jq` and AWS CLI query expressions, bash with proper error handling, and first drafts of tests and runbooks. For larger work I use agentic tools that can read the whole repository, because a change that touches twelve files is where they save real time. The important part of my answer is what I do not delegate: architecture decisions, IAM policies, anything with cost implications, and production incident judgement. I also invest in repository instruction files, because encoding conventions once in `.github/copilot-instructions.md` or `AGENTS.md` is far more effective than repeating them in prompts, and it makes the suggestions match our standards by default.

**Q: What is the biggest risk of using AI to generate infrastructure code?**

Over-permissive IAM. If you ask for a policy that lets a Lambda function read from a bucket, these tools very frequently produce a wildcard action on a wildcard resource, because that satisfies the request and is the most common pattern in their training data. The danger is that it works — nothing fails, no test catches it, and it passes review unless someone is specifically looking. The same applies to security groups opened wider than needed and to unencrypted resources. My mitigations are to state least privilege explicitly in the prompt and in repository instructions, to run infrastructure-as-code scanning on the resolved Terraform plan so wildcards fail the build regardless of who wrote them, and to enforce the non-negotiable rules with service control policies, which no generated code can bypass.

**Q: What is slopsquatting?**

It is a supply chain attack that exploits AI hallucination. Language models sometimes suggest package names that do not exist, and they do so consistently — the same plausible-sounding name gets suggested repeatedly across many users. Attackers monitor for these hallucinated names, register them on public registries with malicious code, and wait for developers to install what their assistant recommended. It is effective because the developer has no reason to be suspicious: the package name came from a tool they trust and looks entirely reasonable. The defence is to verify that any suggested dependency actually exists and is the one you intended, check download counts and repository provenance, and rely on lockfiles so a new dependency appears as a reviewable diff rather than arriving silently.

**Q: Amazon CodeWhisperer — how would you compare it to Copilot?**

I would correct the premise first: CodeWhisperer no longer exists as a separate product. It was rebranded and expanded into Amazon Q Developer in 2024, which is a meaningfully different thing — as well as IDE completion it has a command line agent and, most usefully for DevOps, it can query your actual AWS account, so you can ask why an ECS service is not reaching steady state or which buckets allow public access. Compared with Copilot, the differentiator is that AWS context rather than raw code completion quality, where Copilot is generally stronger and has deeper GitHub integration for pull request review. In practice teams often use both. The part worth knowing for infrastructure work is Q's custom agent configuration, which lets you restrict which tools and which AWS services an agent may touch, and keep write operations off the auto-approved list.

**Q: Would you let an AI agent run commands against production?**

Not with unrestricted access, and not without the same controls I would apply to any other operator. An agent that can run arbitrary commands is a privileged principal, so it needs a scoped identity — read-only credentials by default, with write operations requiring explicit approval rather than being auto-approved. Amazon Q's custom agents make this concrete: you separate the tools it may use from the tools it may use without asking, and you can restrict which AWS services are in scope. Beyond that, everything the agent produces should flow through the normal pipeline — pull request, review, scanning, and a plan a human reads — rather than applying directly. For diagnosis during an incident, read-only agent access is genuinely useful and low risk; for remediation, I want a human deciding, because the agent has no way to assess the blast radius of being wrong.

---

[GenAI Index](./README.md) | [AI-Assisted Development →](./02-code-development.md)
