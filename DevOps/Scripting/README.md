---
title: Scripting & Automation - Interview Preparation
part: 8
chapter: 0
slug: devops-scripting-index
level: intermediate # beginner | intermediate | advanced
reading_time: 4
updated: 2026-08-03
tags: [devops, scripting]
in_book: false
---

# Scripting & Automation - Interview Preparation

Automation questions test judgement as much as syntax: which tool for which job, and how you make a script safe to run against production.

## Table of Contents

1. [Advanced Bash](./01-bash-advanced.md) — the safety header, quoting, traps, idempotency, locking
2. [Python for AWS](./02-python-aws.md) — Boto3, pagination, retries, threading, moto tests
3. [AWS CLI Mastery](./03-aws-cli.md) — `--query` and JMESPath, profiles, waiters, output formats
4. [AWS SDK (TypeScript)](./04-aws-sdk.md) — v3 command pattern, paginators, credentials, Lambda structure
5. [Lambda Automation](./05-lambda-automation.md) — event-driven remediation, idempotency, DLQs, Step Functions
6. [Systems Manager](./06-systems-manager.md) — Session Manager, Run Command, Patch Manager, Automation

> ⚠️ **Language note:** this repository standardises on TypeScript for code examples. Topics 1 and 2 are language-specific by definition, so they use Bash and Python respectively.

## Tool Selection

The judgement question, and the one worth being decisive about.

| Task | Tool |
|------|------|
| A few CLI calls, under 50 lines | **Bash** |
| Interactive exploration | **AWS CLI** with `--query` |
| Real data structures, needs tests | **Python** or **TypeScript** |
| Event-driven response | ✅ **Lambda** |
| Over 15 minutes, or needs rollback | ✅ **Step Functions** |
| Fleet operations on instances | ✅ **SSM Run Command** |
| Continuous drift correction | **SSM State Manager** |
| Creating infrastructure | 🔴 **Terraform**, not a script |

🔴 **The last row matters most.** Scripts that create infrastructure are a common anti-pattern — they are not idempotent, have no state, and no plan step. If it provisions resources, it belongs in Terraform.

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 01 Advanced Bash | `set -euo pipefail` and quoting come up constantly |
| 🔴 Critical | 03 AWS CLI | `--query` fluency is visibly obvious in a live exercise |
| 🔴 Critical | 06 Systems Manager | "How do you access production?" |
| 🟡 High | 05 Lambda Automation | Event-driven remediation design |
| 🟡 High | 02 / 04 SDKs | Pagination is the bug interviewers probe |
| 🟢 Good to know | Step Functions detail | Orchestration beyond Lambda |

## Top 10 Interview Questions

1. What does `set -euo pipefail` do, and why does every script need it?
2. Why is `rm -rf "$BASE/"*` dangerous?
3. Why does a counter incremented in a piped `while` loop stay at zero?
4. What is the most common Boto3 / SDK bug?
5. What is the difference between `--filters` and `--query`?
6. How do you avoid running a destructive command against the wrong account?
7. Lambda gives at-least-once delivery. How do you handle that?
8. What happens to an event if a Lambda keeps failing?
9. How do you give engineers shell access to production instances?
10. When would you use Step Functions instead of a single Lambda?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **`pipefail`** | Without it, a failed `curl` in a pipeline is invisible — exit status is the last command's |
| **`set -e` exceptions** | Condition contexts, `\|\| true`, and `local x=$(cmd)` — declare then assign |
| **Unset path guard** | `${BASE:?message}` before any `rm -rf` |
| **Piped loop counter** | Pipelines create subshells — use `< <(cmd)` process substitution |
| **Pagination** | 🔴 Every `list_*`/`describe_*` truncates. No paginator = silently incomplete |
| **`--filters` vs `--query`** | Filters are server-side and fast; query is local, after transfer |
| **Wrong account** | `aws sts get-caller-identity` first; read-only default profile |
| **Lambda idempotency** | Conditional DynamoDB write on event ID, or Powertools `@idempotent` |
| **Lambda failure** | Async retries twice then **discards** — needs a DLQ *and* an alarm on it |
| **Production access** | SSM Session Manager — no ports, no keys, every keystroke logged |
| **Auto-remediation** | Automate additive fixes only; restrictive ones can cause the outage |
| **Lambda memory** | CPU scales with memory — more memory is often *cheaper* per run |

## Safety Checklist

Before any script touches production:

- [ ] `set -Eeuo pipefail` present
- [ ] Every variable quoted
- [ ] `${VAR:?}` guarding any path used with `rm`
- [ ] `aws sts get-caller-identity` verified against an expected account
- [ ] `DRY_RUN` mode, defaulting to on for destructive scripts
- [ ] `trap cleanup EXIT` for temporary files and locks
- [ ] `flock` if it runs from cron
- [ ] Idempotent — safe to run twice
- [ ] Per-item error handling, so one failure does not abort the run
- [ ] An escape-hatch tag (`Retain`) honoured by cleanup jobs
- [ ] ShellCheck clean, running in CI

## Study Path

**Start here →** [Advanced Bash](./01-bash-advanced.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01, 03: bash safety, CLI fluency | 4–5 hours |
| Programmatic | 02, 04: SDK patterns and pagination | 3–4 hours |
| Serverless ops | 05: remediation, idempotency, orchestration | 3–4 hours |
| Fleet ops | 06: Session Manager, patching, runbooks | 2–3 hours |

## Related Topics

- [Shell Scripting](../Linux/02-shell-scripting.md) — bash basics
- [Linux Troubleshooting](../Linux/08-troubleshooting.md) — where these scripts get used
- [Secrets Management](../Security/03-secrets.md) — Parameter Store vs Secrets Manager
- [Infrastructure Security](../Security/06-infrastructure.md) — SSM instead of bastion hosts
- [Security Incident Response](../Security/08-incident-response.md) — automated containment
- [Terraform Best Practices](../Terraform/10-best-practices.md) — why provisioning is not a script
- [AWS Lambda](../AWS/06-lambda.md) — function fundamentals

---
[← DevOps](../README.md)
