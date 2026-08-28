---
title: Security in Pipelines
part: 8
chapter: 0
slug: pipeline-security
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-04
tags: [devops, devsecops, pipeline, security]
in_book: false
---

# Security in Pipelines

This topic is about **designing the security stages** of a pipeline: what runs where, what blocks, and how findings reach an owner.

> For hardening the CI system itself — runner isolation, OIDC, script injection, signing — see [Pipeline Security](../CICD/08-security.md). This page is the security-gate design.

## The Reference Pipeline

```
┌ Local ────────────────────────────────────────────┐
│ pre-commit: gitleaks, lint, format          ~5s   │
└───────────────────────────────────────────────────┘
                    ↓
┌ Pull Request ─────────────────────────────────────┐
│ 1. Secrets scan (full history)              ~20s  │ 🔴 blocks
│ 2. SAST, diff-aware                         ~60s  │ 🔴 blocks (new only)
│ 3. SCA on the lockfile                      ~30s  │ 🔴 blocks (fixable crit/high)
│ 4. IaC scan on the resolved plan            ~90s  │ 🔴 blocks (high/critical)
│ 5. Unit + authorization tests               ~3m   │ 🔴 blocks
└───────────────────────────────────────────────────┘
                    ↓
┌ Build ────────────────────────────────────────────┐
│ 6. Build image (pinned digest base)               │
│ 7. Image scan                                     │ 🔴 blocks (fixable crit/high)
│ 8. Generate SBOM + sign image                     │ 🔴 blocks on failure
└───────────────────────────────────────────────────┘
                    ↓
┌ Deploy to staging ────────────────────────────────┐
│ 9. Admission control verifies signature           │ 🔴 blocks
│ 10. DAST baseline (passive)                 ~2m   │ 🔴 blocks
│ 11. Smoke tests                                   │ 🔴 blocks
└───────────────────────────────────────────────────┘
                    ↓
┌ Production ───────────────────────────────────────┐
│ 12. Manual approval (change record)               │
│ 13. Canary + automatic rollback on SLO breach     │
└───────────────────────────────────────────────────┘
                    ↓
┌ Continuous ───────────────────────────────────────┐
│ Registry rescan · AWS Config · GuardDuty · nightly DAST │
└───────────────────────────────────────────────────┘
```

**Total added PR time: under 5 minutes.** That is the design constraint — beyond roughly ten minutes, engineers route around the pipeline.

## Choosing What Blocks

| Stage | Blocks On | Rationale |
|-------|-----------|-----------|
| Secrets | 🔴 **Any** verified finding | Zero tolerance, near-zero false positives |
| SAST | 🔴 New high/critical in the diff | Pre-existing findings are a separate backlog |
| SCA | 🔴 Critical/high **with a fix available** | Blocking on unfixable is unfair and gets bypassed |
| IaC | 🔴 High/critical | Direct exposure paths |
| Image | 🔴 Critical/high fixable | Base image change usually fixes it |
| Signing / SBOM | 🔴 Failure to produce | Non-negotiable, no judgement needed |
| DAST baseline | 🔴 Missing headers, weak TLS | Fast and deterministic |
| DAST full | 📋 Report only | Too slow and too variable to gate |

> The rule: **block on things that are unambiguous and fixable now. Report everything else with an owner and a deadline.**

## Fail Fast, Fail Cheap

Order stages by cost so failures surface early.

```
❌ Bad order — 12 minutes to learn a secret was committed
   build image (4m) → integration tests (6m) → secrets scan (20s)

✅ Good order — 20 seconds
   secrets (20s) → lint (10s) → SAST (60s) → unit (2m) → build (4m) → integration (6m)
```

**Run independent scans in parallel:**

```yaml
jobs:
  security:
    strategy:
      fail-fast: false          # ✅ report ALL findings, not just the first failure
      matrix:
        scan: [secrets, sast, sca, iac]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: ${{ matrix.scan == 'secrets' && 0 || 1 }}
      - run: make scan-${{ matrix.scan }}
```

⚠️ `fail-fast: false` matters. A developer should see all four findings in one run, not fix one and wait for the next to appear.

## Where Findings Go

A finding nobody sees is not a control.

| Destination | Effectiveness |
|------------|--------------|
| **Inline comment on the PR diff** | ✅ Highest — the author is already there |
| Security tab / SARIF upload | ✅ Good — persistent and tracked |
| Auto-created ticket with an owner | ✅ For non-blocking findings |
| Slack channel | ⚠️ Ignored within two weeks |
| Separate vendor portal | ❌ Nobody logs in |
| Email digest | ❌ Filtered |

✅ **SARIF is the format that makes this work.** Every major scanner can emit it, and uploading SARIF puts findings on the exact changed line.

```yaml
- uses: github/codeql-action/upload-sarif@v3
  if: always()          # 🔴 without this, a failing scan uploads nothing
  with:
    sarif_file: results.sarif
    category: ${{ matrix.scan }}   # keeps each tool's results separate
```

## Exceptions and Break-Glass

Every gate needs a legitimate, auditable way past it — otherwise people build an illegitimate one.

**A good exception has:**

| Requirement | Why |
|------------|-----|
| A named **owner** | Someone accountable |
| A written **reason** | Reviewable judgement |
| An **expiry date** | Prevents permanent blindness |
| **Approval** from a second person | No unilateral bypass |
| An **audit record** | Provable for compliance |

```yaml
# .security/exceptions.yml — file is CODEOWNERS-protected
exceptions:
  - id: SEC-2026-041
    finding: CVE-2026-31337
    component: checkout-api
    reason: >
      Vulnerable code path is in the PDF export feature, which is disabled
      by feature flag in all environments. Upstream fix expected in v4.2.
    compensating_control: Feature flag off; WAF rule blocks /export/*
    owner: platform-team
    approved_by: security-lead
    created: 2026-07-14
    expires: 2026-09-14      # ⚠️ CI fails when this date passes
```

```bash
# CI check — expired exceptions become build failures
if [ "$(yq '.exceptions[] | select(.expires < now) | .id' .security/exceptions.yml)" ]; then
  echo "Expired security exceptions must be renewed or resolved"; exit 1
fi
```

✅ Break-glass deploys (skipping gates during an incident) should be **possible, loud, and reviewed**: a separate workflow, an automatic notification, and a mandatory retrospective.

❌ A gate with no exception path produces `continue-on-error: true` committed at 2am with no record.

## Least Privilege for the Pipeline

The pipeline is a highly privileged system. Treat it like production.

| Principle | Implementation |
|-----------|---------------|
| **No long-lived cloud credentials** | OIDC federation, pinned to repo **and** branch |
| **Separate roles per stage** | `plan` is read-only; only `apply` can write |
| **Minimal token permissions** | Default `permissions: {}`, grant per job |
| **Ephemeral runners** | Fresh VM per job; no state carried between builds |
| **Untrusted code never gets secrets** | Fork PRs run without credentials |

```yaml
# ✅ Default deny, then grant only what each job needs
permissions: {}

jobs:
  scan:
    permissions:
      contents: read
      security-events: write     # upload SARIF only
  deploy:
    permissions:
      id-token: write            # OIDC only for the job that deploys
      contents: read
```

🔴 A trust policy that pins only the repository lets **any branch** assume the role. An attacker who can open a branch can then deploy. Pin the `sub` claim to a branch or environment.

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:sub": "repo:acme/checkout-api:ref:refs/heads/main"
    }
  }
}
```

## Measuring the Gates

| Metric | Healthy Signal |
|--------|---------------|
| Pipeline security stage duration | Under 5 minutes total |
| False positive rate per tool | Under ~10% |
| Exceptions open past expiry | Zero |
| Break-glass uses per month | Low and always reviewed |
| Escaped findings (found in prod) | Trending down |
| `continue-on-error` occurrences in workflows | Zero |

✨ Grep your own workflows for `|| true`, `continue-on-error: true`, and `--soft-fail`. Each one is a control someone quietly turned off, and it tells you exactly which gate is too noisy.

## Interview Q&A

**Q: Design the security stages of a CI/CD pipeline.**

I would layer them by speed and by what each can see. Locally, a pre-commit hook for secrets and linting, which prevents rather than reports. On the pull request, run secrets scanning against full history, diff-aware SAST, dependency scanning against the lockfile, and infrastructure-as-code scanning against the resolved Terraform plan — all in parallel, totalling a few minutes. At build time, produce the image from a digest-pinned base, scan it, generate an SBOM, and sign it. At deploy time, admission control verifies the signature so unsigned images cannot run, and a fast passive DAST scan checks headers and TLS. Production gets a manual approval and a canary with automatic rollback. Then continuously: registry rescanning so newly published CVEs in already-deployed images surface, AWS Config for drift and console changes, and GuardDuty for runtime detection. The hard constraint is keeping the pull request path under about five minutes, because a slow pipeline gets bypassed.

**Q: Which stages should fail the build and which should only report?**

Block on findings that are unambiguous and fixable right now: any verified secret, newly introduced high or critical SAST findings within the diff, critical and high dependency or image vulnerabilities that have a fix available, high-severity infrastructure misconfiguration, and any failure to produce a signature or SBOM. Report everything else with an owner and a remediation target — pre-existing findings in legacy code, vulnerabilities with no available fix, medium and low severity issues, and full active DAST results, which are too slow and too variable to gate on. The reasoning is that a gate is only effective if developers respect it, and the fastest way to destroy that is to block a release on something the author cannot fix. Unfixable findings need a tracked exception with a compensating control, not a red build.

**Q: How do you handle a case where a team genuinely needs to ship despite a security finding?**

Provide a formal exception process, because if you do not, they will invent an informal one by adding a skip flag at two in the morning with no record. A legitimate exception needs a named owner, a written justification, an explicit compensating control, approval from someone in security, and — most importantly — an expiry date, with CI configured to fail once that date passes so it cannot become permanent. I would store this as a file in the repository protected by CODEOWNERS, so granting an exception is itself a reviewed pull request and therefore auditable. Separately, for genuine incidents, there should be a break-glass path that skips gates but is loud: a distinct workflow, an automatic notification to the security channel, and a mandatory review afterwards. Making the legitimate route easier than the workaround is the whole design goal.

**Q: What is the most dangerous mistake in pipeline permissions?**

An overly broad OIDC trust policy. Teams correctly move away from stored AWS access keys to OIDC federation, then write a trust policy that pins only the repository and not the branch or environment. That means any branch in the repository can assume the deployment role, so anyone who can push a branch — including via a pull request in some configurations — can obtain production credentials. Worse variants use a wildcard on the subject claim, which can allow other repositories, or in the worst misconfigurations any GitHub repository anywhere, to assume the role. The fix is to pin the subject claim to a specific ref or a GitHub environment with required reviewers, and to use separate roles per stage so the read-only plan role is the one exposed to untrusted pull request code while the write-capable apply role is reachable only from a protected branch.

**Q: How would you tell whether a team's security gates are actually working?**

I would grep their workflow files for the tell-tale bypasses — `|| true`, `continue-on-error: true`, soft-fail flags, and skipped scan steps. Each occurrence is a control someone disabled, and the pattern shows exactly which tool is too noisy to be trusted. Beyond that, I would look at the total duration of security stages on the pull request path, because anything over roughly ten minutes will be worked around; the false positive rate per tool, because that predicts whether findings get acted on; the number of exceptions sitting past their expiry date; and escaped findings, meaning issues discovered in production that the pipeline should have caught, which is the real measure of coverage. A pipeline with clean configuration, fast stages, few expired exceptions, and a declining escape rate is working. One that reports thousands of findings while every gate is soft-failed is theatre.

---

[← Infrastructure Scanning](./07-infrastructure-scanning.md) | [Index](./README.md) | [Compliance as Code →](./09-compliance.md)
