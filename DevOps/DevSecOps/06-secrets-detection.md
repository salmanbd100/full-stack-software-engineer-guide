# Secrets Detection

A leaked credential is the fastest path from "code repository" to "compromised AWS account". Secrets detection finds credentials in code, history, and pipelines — before or after they leak.

## Why Git Makes This Worse

🔴 **Deleting a secret does not remove it.** Git history is immutable and distributed.

```
commit A: added API key         ← secret is HERE, forever
commit B: "oops, removed key"   ← file is clean, history is not

Anyone who cloned the repo has commit A.
Forks, CI caches, and mirrors have commit A.
```

> The moment a secret reaches a remote branch, it is compromised. **Rotate first. Clean history second, if at all.**

**The response order — this is the interview answer:**

```
1. ROTATE the credential                 ← minutes. Nothing else matters first.
2. Check logs for use (CloudTrail)       ← was it already used?
3. Revoke old sessions                   ← a rotated key does not kill active sessions
4. Fix the cause (add scanning, use Secrets Manager)
5. Optionally rewrite history            ← last, and it does not undo the exposure
```

❌ **Wrong instinct:** force-push a cleaned history and consider it handled. The secret was public for hours; assume it was harvested.

⚠️ Public GitHub is scraped continuously. Committed AWS keys are typically used within **minutes**.

## Where Secrets Hide

| Location | Example | Often Missed? |
|----------|---------|--------------|
| Source code | `const key = "AKIA..."` | No |
| `.env` committed by accident | `.env` not in `.gitignore` | Sometimes |
| **Git history** | Removed in a later commit | ✅ Yes |
| **Docker image layers** | `RUN export TOKEN=... && ...` | ✅ Yes |
| **CI logs** | `echo $DB_URL` while debugging | ✅ Yes |
| Terraform state | Plaintext secrets in `.tfstate` | ✅ Yes |
| Notebooks and test fixtures | Real credentials "just to test" | ✅ Yes |
| Kubernetes manifests | `Secret` with base64 — **not encryption** | ✅ Yes |

🔴 **Docker layer leak** — the classic mistake:

```dockerfile
# ❌ The token is in layer 2 forever, even though layer 3 deletes the file
RUN echo "$NPM_TOKEN" > .npmrc && npm ci
RUN rm .npmrc          # deletes it from the filesystem, not from the layer

# ✅ BuildKit secret mount — never written to any layer
RUN --mount=type=secret,id=npmtoken \
    NPM_TOKEN="$(cat /run/secrets/npmtoken)" npm ci
```

⚠️ `docker history` and any layer extraction tool will reveal the first version. Nothing about `rm` helps.

## Detection Methods

| Method | Finds | False Positives |
|--------|-------|----------------|
| **Regex / known patterns** | `AKIA...`, `ghp_...`, `sk_live_...` | Low — providers have fixed prefixes |
| **Entropy analysis** | High-randomness strings | ⚠️ High — hashes, minified JS, UUIDs |
| **Verification** | ✅ Calls the API to check if the key is live | Very low — proves it works |

✨ **Verification is the feature that matters.** A tool that confirms the credential is currently valid turns 500 possible findings into 3 real incidents. TruffleHog does this well.

## Tooling

| Tool | Strength |
|------|----------|
| **gitleaks** | ✅ Fast, great pre-commit and CI fit, easy custom rules |
| **TruffleHog** | ✅ Verifies credentials against live APIs |
| **GitHub Secret Scanning + Push Protection** | ✅ Free on public repos; **blocks the push** |
| **GitGuardian** | Commercial, strong dashboards and history scanning |
| **AWS Health / partner notifications** | AWS itself detects exposed keys and alerts you |

🔴 If AWS emails you that a key is exposed, an attacker found it too. Treat it as an active incident.

## Layer 1 — Pre-Commit (Best Place)

The only control that prevents the leak instead of reporting it.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: detect-private-key
      - id: check-added-large-files   # catches accidental dumps and keystores
```

```bash
# One-time setup per developer — must be part of onboarding
pre-commit install
```

⚠️ Pre-commit hooks are **local and bypassable** (`git commit --no-verify`). They are a convenience for developers, not a guarantee. Always back them with a server-side control.

✅ **GitHub Push Protection** is the strongest version: it rejects the push at the server, so the secret never reaches the remote at all.

## Layer 2 — CI (The Backstop)

```yaml
name: secrets
on: [pull_request, push]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0        # 🔴 required — depth 1 cannot scan history

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

⚠️ The default `actions/checkout` fetches a single commit. Without `fetch-depth: 0` you scan the tip only and miss everything in history.

**Tuning out false positives:**

```toml
# .gitleaks.toml
[extend]
useDefault = true

[allowlist]
description = "Test fixtures and documentation examples"
paths = [
  '''test/fixtures/.*''',
  '''docs/.*\.md''',
]
# Known-fake values used in examples
regexes = [
  '''AKIAIOSFODNN7EXAMPLE''',
]
```

✅ Allowlist by **path and specific value**, never by disabling the rule globally.

## Layer 3 — Don't Have Secrets to Leak

The real fix is architectural: remove long-lived credentials entirely.

| ❌ Long-Lived Secret | ✅ Short-Lived Identity |
|--------------------|------------------------|
| AWS access key in GitHub Secrets | **OIDC** — GitHub assumes an IAM role, no stored key |
| Database password in env var | IAM database authentication, or Secrets Manager at runtime |
| Static key in a container image | Fetch from Secrets Manager / Parameter Store on start |
| Long-lived token in Kubernetes `Secret` | IRSA or EKS Pod Identity |

```yaml
# ✅ No AWS keys stored anywhere — the token is minted per job and expires
permissions:
  id-token: write     # required for OIDC
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-deploy
      aws-region: eu-west-1
```

> If there is no long-lived credential, there is nothing to leak. OIDC federation eliminates the most commonly leaked secret class outright.

See [Secrets Management](../Security/03-secrets.md) for Secrets Manager, Parameter Store, and rotation.

## Rotation Readiness

Detection is worthless if rotating takes three days.

| Question | Good Answer |
|----------|------------|
| How long to rotate a database password? | Minutes, automated |
| Is it hard-coded anywhere? | No — read at runtime from Secrets Manager |
| Will rotation cause downtime? | No — two-secret or versioned rotation |
| Do you know every consumer of this secret? | Yes — inventoried |

⚠️ **Rotating an AWS access key does not terminate active sessions.** Temporary credentials already issued remain valid until expiry. Attach an IAM policy denying actions before a timestamp, or revoke role sessions explicitly.

## Interview Q&A

**Q: A developer commits an AWS access key and pushes it to a public repository. What do you do?**

Rotate the credential immediately — that is the first action and everything else waits, because public repositories are scraped continuously and committed AWS keys are typically used within minutes. Then investigate whether it was already used, by checking CloudTrail for activity from that access key across every region, not just the one you normally use, since attackers deliberately operate in unused regions. Revoke any active sessions, remembering that deleting an access key does not invalidate temporary credentials already issued from it, so you may need a deny-before-timestamp policy on the role. Only then deal with the repository: add secrets scanning and push protection so it cannot recur, and move the workload to OIDC federation so there is no long-lived key to leak. Rewriting git history is last and largely cosmetic — the secret was public, so treat it as compromised regardless.

**Q: Why is removing the secret in a follow-up commit not enough?**

Because git history is immutable and distributed. The commit that introduced the secret still exists in the repository, in every clone, in every fork, in CI caches, and in any mirror, so anyone with access can retrieve it with a single command. Even rewriting history with filter-repo or BFG does not help meaningfully: it requires every collaborator to re-clone, forks retain the old objects, GitHub may keep unreferenced commits accessible by SHA, and none of it changes the fact that the secret was publicly visible for some window of time. The only action that actually reduces risk is rotating the credential, which makes the exposed value useless.

**Q: Where should secrets scanning run?**

In three layers, because each has a different guarantee. Locally as a pre-commit hook, which is the only place that prevents the leak rather than reporting it — but it is bypassable with no-verify and depends on every developer installing it, so it cannot be the only control. Server-side push protection, such as GitHub's, is the strongest layer because it rejects the push before the secret ever reaches the remote. And in CI as a backstop, scanning the full history with fetch-depth set to zero, since the default shallow checkout only sees the tip commit and would miss everything historical. Beyond scanning, I would also scan built container images, because secrets baked into a layer survive being deleted in a later layer.

**Q: How do you get rid of long-lived credentials in CI?**

Use OIDC federation. Instead of storing an AWS access key in the CI system, you configure AWS to trust the CI provider's OIDC identity provider, and the pipeline requests a short-lived token that it exchanges for temporary role credentials scoped to that specific repository, and ideally that specific branch or environment. Nothing durable is stored, the credentials expire in minutes, and there is no secret to rotate or leak. The trust policy is where the security lives — it must pin the subject claim to the exact repository and reference, because a loosely written condition can allow any repository in the organization, or in some misconfigurations any repository anywhere, to assume the role. This single change removes the most commonly leaked class of secret.

**Q: What makes secrets scanning tools noisy, and how do you fix it?**

Entropy-based detection is the main source of noise: it flags any high-randomness string, which means hashes, UUIDs, minified JavaScript, base64 test fixtures, and lockfile integrity hashes all trigger findings. Pattern-based detection is much cleaner, because real providers use recognizable prefixes such as AWS keys starting with AKIA or GitHub tokens with ghp underscore. The feature that really solves it is verification — a tool that calls the provider's API to check whether the credential is currently live, which collapses hundreds of possible findings into the handful that are genuinely active. Beyond tool choice, I would allowlist by specific path and specific known-fake value, such as the documented AWS example key, rather than disabling rules, so real findings in those areas still surface.

---

[← Dependency Scanning](./05-dependency-scanning.md) | [Index](./README.md) | [Infrastructure Scanning →](./07-infrastructure-scanning.md)
