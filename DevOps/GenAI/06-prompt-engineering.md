---
title: Prompt Engineering for DevOps
part: 8
chapter: 0
slug: prompt-engineering
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-04
tags: [devops, genai, prompt, engineering]
in_book: false
---

# Prompt Engineering for DevOps

Prompt quality determines output quality more than model choice does. For infrastructure work the goal is **specific, constrained, verifiable** output.

## The Anatomy of a Good DevOps Prompt

```
1. Role / expertise      → sets vocabulary and assumptions
2. Task                  → one clear objective
3. Context               → versions, existing code, environment
4. Constraints           → 🔴 the part that matters most
5. Output format         → so you can use or verify it directly
6. Uncertainty handling  → "say so if unsure"
```

❌ **Weak:**

```
Write a GitHub Actions workflow to deploy to AWS.
```

✅ **Strong:**

```
Write a GitHub Actions workflow that builds a Docker image and deploys to ECS Fargate.

Context:
- Node.js 20 app, monorepo, service lives in services/checkout/
- Existing ECS cluster "prod-cluster", service "checkout-api"
- ECR repo 123456789012.dkr.ecr.eu-west-1.amazonaws.com/checkout-api

Constraints:
- Authenticate with OIDC. No stored AWS access keys.
- Start from `permissions: {}` and grant per-job only what is needed.
- Pin all actions to a commit SHA, not a tag.
- Tag the image with the commit SHA. Never `latest`.
- Trigger on push to main only.
- Include Trivy scanning; fail only on fixable HIGH/CRITICAL.
- Wait for service stability and fail the job if it does not stabilise.

Output: a single YAML file with brief comments on non-obvious steps.
If any action name or input is one you are not certain exists, say so
instead of guessing.
```

## The Constraints That Do the Work

For DevOps specifically, these five recur constantly:

| Constraint | Prevents |
|-----------|----------|
| **State versions** ("Terraform 1.9, AWS provider ~> 5.0") | Deprecated syntax from old training data |
| **"Least privilege — specific actions and ARNs"** | 🔴 Wildcard IAM |
| **"No hard-coded values — use variables"** | Modules that work exactly once |
| **"Do not invent arguments; say if unsure"** | Plausible hallucinated fields |
| **"Output format: X"** | Prose you have to unpick |

✨ **"Say so instead of guessing" measurably reduces hallucination.** Models default to producing *an* answer; explicitly permitting uncertainty gives them a better option.

## Give Examples of Your Conventions

Matching your codebase matters more than generic correctness. One example beats a paragraph of description.

```
Here is one of our existing Terraform modules:

[paste modules/s3-bucket/main.tf, variables.tf, outputs.tf]

Write a modules/sqs-queue module following the same structure exactly:
- same variable naming and description style
- same use of validation blocks
- same tagging approach
- same output naming
- same file layout
```

✅ This is the highest-leverage technique available. Wrong conventions cost review time on every future change.

## Ask for Reasoning Before Output

For anything with a design decision, separate thinking from producing.

```
Before writing any code, list:
1. The AWS resources this needs and why each is required
2. The IAM permissions needed, as specific actions
3. Anything ambiguous in my requirements
4. Which choices have significant cost implications

Wait for my confirmation before writing the Terraform.
```

**Why this works:**

| Benefit | Effect |
|---------|--------|
| Surfaces wrong assumptions early | Before 300 lines are built on them |
| Exposes cost decisions | NAT per AZ becomes visible |
| Cheaper to correct | Fix a list, not a codebase |
| Reveals missing requirements | The "ambiguous" list is often the useful part |

## Debugging Prompts

The rules differ from generation prompts.

| ✅ Do | ❌ Don't |
|------|---------|
| Paste raw output — logs, events, `describe` | Paste your summary of the problem |
| Include what you have already ruled out | State your suspicion |
| Ask for **ranked** hypotheses | Ask "how do I fix it?" |
| Ask what evidence would **refute** each | Accept the first plausible answer |
| Ask for the diagnostic command | Ask for the fix immediately |

```
Kubernetes pod is CrashLoopBackOff. Raw evidence:

$ kubectl describe pod checkout-api-7d9f-x2k4  [paste, including Events]
$ kubectl logs checkout-api-7d9f-x2k4 --previous  [paste]
$ kubectl get deploy checkout-api -o yaml  [paste]

Already ruled out: image pull (it started), and the ConfigMap exists.

Give ranked hypotheses. For each:
- the mechanism
- the exact command to confirm it
- what would refute it

Do not suggest fixes yet.
```

🔴 **Never state your theory.** These models anchor hard on your framing and will find support for whatever you propose, which turns a diagnostic tool into a confirmation-bias amplifier.

## Repository Instructions — Prompt Once, Apply Always

The most durable form of prompt engineering is a file, not a message.

| File | Scope |
|------|-------|
| `.github/copilot-instructions.md` | Repository-wide (Copilot) |
| `.github/instructions/*.instructions.md` | Path-scoped via `applyTo` frontmatter |
| `AGENTS.md` | Broadly supported agent convention |
| `CLAUDE.md` | Claude Code |

```markdown
<!-- .github/instructions/terraform.instructions.md -->
---
applyTo: "**/*.tf"
---

- Terraform >= 1.9, AWS provider ~> 5.0.
- Every variable needs a description and a type. Add validation where a
  constrained set of values applies.
- No hard-coded regions, account IDs, or AMI IDs.
- IAM policies: specific actions and specific resource ARNs. Never `"*"`.
- All resources must be taggable via a `tags` variable.
- Remote state only — S3 backend with DynamoDB locking.
- Prefer `for_each` over `count` so resource addresses are stable.
```

> A convention stated in a repository file is applied to every suggestion, by every engineer, forever. A convention stated in a chat message applies once.

## Iterating

Refine rather than restarting.

| Situation | Move |
|-----------|------|
| Nearly right | "Change only X, keep everything else identical" |
| Wrong approach | Restart with better constraints |
| Too broad IAM | "Rewrite with least privilege — specific actions and ARNs" |
| Missing error handling | "Add error handling; must be shellcheck-clean" |
| Suspect hallucination | ✅ "Which of these arguments are you not certain exist?" |

✨ Asking a model to audit its own output for uncertainty works surprisingly well and is faster than checking every argument against provider documentation.

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| "Make it production-ready" | Undefined — you get nothing specific |
| "Follow best practices" | Whose? Be explicit |
| Multiple unrelated tasks in one prompt | Quality drops across all of them |
| No versions given | Deprecated syntax |
| Accepting the first answer | The first answer is rarely the best |
| Leading questions | Confirms your bias |
| 🔴 Pasting real secrets or customer data | Data leaves your control |

## A Reusable DevOps Prompt Template

```
Role: Senior AWS DevOps engineer.

Task: [one clear objective]

Context:
- Stack: [Terraform 1.9 / AWS provider ~> 5.0 / Node 20 / EKS 1.30]
- Environment: [prod, eu-west-1, existing VPC vpc-abc123]
- Existing conventions: [paste an example, or reference the repo file]

Constraints:
- Least privilege IAM: specific actions, specific resource ARNs, no wildcards
- No hard-coded values — variables for everything environment-specific
- Encryption at rest and in transit, using our KMS key
- All resources tagged via the `tags` variable
- Note anything with a significant cost implication

Output: [format]

If you are not certain an argument, action name, or API exists, say so
explicitly rather than guessing.
```

## Interview Q&A

**Q: What makes a good prompt for infrastructure code?**

Constraints, above everything else. A vague request produces a hard-coded, single-availability-zone example with a wildcard IAM policy and no tags, because that is the shortest thing that satisfies the words. A good prompt states the Terraform and provider versions so you do not get deprecated syntax, demands that all environment-specific values come from variables, requires least privilege IAM with specific actions and resource ARNs, requires tagging, and specifies the output format. The one people miss is explicitly permitting uncertainty — telling it to say so rather than guess if it is unsure an argument exists measurably reduces hallucinated fields, because otherwise the model's default behaviour is to produce something plausible. I would also paste an existing module and ask it to follow that structure, since matching our conventions saves more review time than generic correctness.

**Q: How do prompts for debugging differ from prompts for writing code?**

The key difference is that you must withhold your own theory. For generation you want to be maximally prescriptive; for debugging, stating what you suspect is actively harmful, because these models anchor on the framing they are given and will find supporting evidence for whatever you propose — turning a diagnostic aid into a confirmation-bias amplifier. So I paste raw evidence rather than my interpretation: the full `describe` output including events, the previous container's logs, the actual manifest. I say what I have already ruled out, ask for ranked hypotheses with the mechanism and the command to confirm each, and specifically ask what evidence would refute each one. And I add "do not suggest fixes yet", which keeps the exchange in diagnosis where the value is, rather than jumping to a confident remediation.

**Q: What is the most durable form of prompt engineering?**

Putting the conventions in a file rather than in a message. Repository instruction files — `.github/copilot-instructions.md`, path-scoped instruction files with an `applyTo` pattern, or `AGENTS.md` — are read automatically, so every suggestion from every engineer follows the rules without anyone remembering to restate them. That is qualitatively different from a well-crafted chat message, which applies once. For a platform team it is the highest-leverage investment available: writing down that we use Terraform not CloudFormation, authenticate with OIDC not stored keys, pin actions to SHAs, and never use wildcard IAM means the tool stops generating the patterns we would reject in review. It also doubles as onboarding documentation for new engineers, since it is an explicit statement of conventions that previously lived in reviewers' heads.

**Q: How do you catch hallucinated arguments in generated infrastructure code?**

Primarily with tooling, because that is deterministic. `terraform validate` rejects arguments that do not exist in the provider schema, which catches the majority immediately and costs nothing. Then `terraform plan` catches values that exist but are wrong, and reading the plan line by line is the real review. Beyond that, a surprisingly effective prompting technique is to ask the model to audit its own output — "which of these arguments are you not certain exist?" — which typically flags the genuinely invented ones and is much faster than checking each field against the provider documentation. The reason this works is the same reason permitting uncertainty in the original prompt works: the default drive is to produce a complete-looking answer, and asking a question that makes admitting doubt the correct response changes the incentive.

**Q: Why ask a model to explain its plan before writing code?**

Because it is far cheaper to correct a list than a codebase. Asking for the resources it intends to create, the IAM permissions as specific actions, anything ambiguous in the requirements, and anything with significant cost implications surfaces wrong assumptions before three hundred lines are built on them. The cost item matters particularly, because generated infrastructure frequently includes a NAT gateway per availability zone or oversized instances — patterns that appear in tutorials without any discussion of the bill — and seeing that in a plan is much better than discovering it in infracost after review. The "ambiguous requirements" list is often the most useful output of all, since it tells you what you failed to specify, which is usually the thing that would have caused a rework.

---

[← AI for Monitoring](./05-monitoring.md) | [Index](./README.md) | [AI Security Considerations →](./07-security.md)
