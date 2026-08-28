---
title: Container Security Scanning
part: 8
chapter: 0
slug: devsecops-container-security
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-04
tags: [devops, devsecops, container, security]
in_book: false
---

# Container Security Scanning

This topic covers **scanning containers inside the pipeline** — choosing tools, setting thresholds, and reducing findings at the source.

> For image hardening, admission control, and runtime defence, see [Security: Container Security](../Security/05-container-security.md). This page is about the scanning pipeline.

## What a Container Scanner Actually Does

```
Image
  ↓
Read layer filesystems
  ↓
Inventory installed packages:
   OS packages (apk / apt / rpm databases)
   Language packages (package-lock.json, go.sum, requirements.txt)
  ↓
Match versions against vulnerability databases (NVD, distro advisories, GitHub)
  ↓
Report CVEs by severity
```

⚠️ Scanners do **not** analyse your code, detect logic flaws, or know whether a vulnerable function is ever called. They compare version numbers against lists.

## The Three Scan Points

Each catches something the others cannot.

| Point | Catches | Tool |
|-------|---------|------|
| **1. Build (in CI)** | Bad base image or dependency, before it ships | Trivy, Grype, Snyk |
| **2. Registry (on push + continuous)** | ✅ New CVEs in **already-shipped** images | ECR enhanced scanning (Inspector) |
| **3. Runtime** | What is actually running, and behaving oddly | Inspector, Falco |

🔴 **Point 2 is the one teams miss.** An image scanned clean in January is not clean in March — the code did not change, but the CVE list did. Only continuous registry scanning tells you that the image running in production now has a critical vulnerability.

```
Jan 10: build → scan → 0 critical → deploy ✅
Mar 04: CVE-2025-XXXXX published for openssl in that image
        Build-time scan will never run again.
        → ECR enhanced scanning (Inspector) re-evaluates continuously ✅
```

## ECR Scanning: Basic vs Enhanced

| | **Basic** | **Enhanced (Inspector)** |
|---|----------|-------------------------|
| **Cost** | Free | Per image, per scan |
| **Engine** | Clair | Amazon Inspector |
| **Scans** | On push only | ✅ On push **and continuously** |
| **Language packages** | ❌ OS only | ✅ OS + application dependencies |
| **Exploit intelligence** | ❌ No | ✅ EPSS score, known-exploited flag |

```hcl
# Enhanced scanning is configured at the registry level, not per repository
resource "aws_inspector2_enabler" "images" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["ECR", "EC2", "LAMBDA"]
}

resource "aws_ecr_repository" "app" {
  name = "checkout-api"

  image_scanning_configuration { scan_on_push = true }

  # 🔴 Critical: a tag can never be overwritten, so a digest is traceable forever
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration { encryption_type = "KMS" }
}
```

✅ **`image_tag_mutability = "IMMUTABLE"`** is the single most important ECR setting. Without it, `v1.2.3` can be silently replaced and your scan results describe an image that no longer exists.

## Scanning in CI with Trivy

```yaml
- name: Build image
  run: docker build -t "app:$GITHUB_SHA" .

# Generate an SBOM first — needed for the *next* Log4Shell, not this one
- name: SBOM
  run: |
    trivy image --format cyclonedx \
      --output sbom.cdx.json "app:$GITHUB_SHA"

- name: Scan (report everything, fail on what matters)
  run: |
    # Full report for the dashboard — never fails
    trivy image --format sarif --output trivy.sarif \
      --severity LOW,MEDIUM,HIGH,CRITICAL "app:$GITHUB_SHA"

    # The gate: only fixable critical/high issues block the build
    trivy image \
      --severity HIGH,CRITICAL \
      --ignore-unfixed \
      --exit-code 1 \
      "app:$GITHUB_SHA"

- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: trivy.sarif
```

**Why `--ignore-unfixed` matters:**

| Situation | Sensible Action |
|-----------|----------------|
| Critical CVE, **fix available** | 🔴 Fail — rebuild with the patch |
| Critical CVE, **no fix exists** | ⚠️ Warn, ticket, compensating control |

> Failing a build for a vulnerability nobody can fix teaches developers that the scanner is an obstacle rather than a signal.

## Reduce Findings at the Source

The best way to pass a container scan is to have almost nothing in the image.

| Base Image | Approximate CVE Count | Notes |
|-----------|----------------------|-------|
| `node:20` | Hundreds | Full Debian, compilers, shell |
| `node:20-slim` | Dozens | Trimmed Debian |
| `node:20-alpine` | Few | musl libc — check native modules |
| `gcr.io/distroless/nodejs20` | ✅ Very few | No shell, no package manager |
| `scratch` | Zero | Static binaries only |

```dockerfile
# ✅ Multi-stage: build tools stay out of the shipped image
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Distroless runtime — no shell means no shell for an attacker either
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER nonroot
CMD ["dist/server.js"]
```

✨ Moving from a full base image to distroless typically removes 90%+ of findings without changing a line of application code. It is the highest-return container security action available.

⚠️ Distroless has no shell, so `kubectl exec` for debugging will not work. Use ephemeral debug containers (`kubectl debug`) instead — this is a feature, not a limitation.

## The Findings You Cannot Avoid

Every image will report some CVEs. Triage, do not panic.

**Questions that determine real risk:**

| Question | If No |
|----------|-------|
| Is the vulnerable package actually **used** at runtime? | Low risk — probably a build-time dependency left in |
| Is the vulnerable **code path reachable**? | Low risk |
| Is it network-reachable, or does it need local access? | Local-only in a container is much lower risk |
| Is there a **known exploit in the wild**? (CISA KEV, EPSS) | Deprioritize |
| Is there a compensating control? (no shell, read-only root, NetworkPolicy) | Risk reduced |

✅ **EPSS and the CISA Known Exploited Vulnerabilities catalogue** are better prioritization signals than CVSS alone. A CVSS 9.8 with an EPSS of 0.02% is less urgent than a CVSS 7.5 that is actively exploited.

**Documenting an accepted risk:**

```yaml
# .trivyignore
# CVE-2025-11111 — glibc, requires local shell access.
# Image is distroless with no shell and runs read-only as non-root.
# Reviewed: 2026-07-01 · Expires: 2026-10-01 · Owner: platform-team
CVE-2025-11111
```

⚠️ Every exception needs an **owner and an expiry date**. An ignore file without expiries becomes permanent blindness within a year.

## Patch Cadence

You cannot only rebuild when the code changes.

| Practice | Why |
|----------|-----|
| **Scheduled weekly rebuild** of all active images | Picks up base image patches automatically |
| **Pin base images by digest**, bump via automation | Reproducible builds, controlled updates |
| **Renovate / Dependabot on the Dockerfile** | Base image bumps arrive as reviewable PRs |
| **Alert on running images** with new critical CVEs | Inspector findings → SNS → ticket |

```dockerfile
# ✅ Digest-pinned — reproducible; Renovate raises a PR when it changes
FROM gcr.io/distroless/nodejs20-debian12@sha256:9f6a1c...  AS runtime
```

## Common Mistakes

| Mistake | Consequence |
|---------|------------|
| Build-time scanning only | Blind to CVEs published after the build |
| Mutable tags | Scan results describe an unknown image |
| Failing on all severities | Scanner disabled within a week |
| Scanning but never rebuilding | Findings accumulate, nothing improves |
| `latest` in production | Cannot reproduce or trace what ran |
| Full base image with hundreds of CVEs | Real findings buried in noise |
| No SBOM | Cannot answer "are we affected?" in the next zero-day |

## Interview Q&A

**Q: Where should container scanning happen in a delivery pipeline?**

In at least three places, because each catches something different. At build time in CI, so a vulnerable base image or dependency never gets pushed — this is the fast feedback loop for the developer. In the registry, both on push and continuously, which is the one teams usually miss: an image that scanned clean three months ago may now contain a critical vulnerability because the CVE list changed, not the image, and only continuous registry scanning such as ECR enhanced scanning with Inspector will tell you that. And at runtime, both to know what is actually deployed and to detect behaviour that scanning cannot predict. I would also add admission control at deploy time to enforce that only signed images from the pipeline can run, which is a different control but closes the gap between scanning and running.

**Q: What is the difference between ECR basic and enhanced scanning?**

Basic scanning is free, uses Clair, runs only when an image is pushed, and covers operating system packages only. Enhanced scanning uses Amazon Inspector, is charged per image scan, and differs in two ways that matter: it scans continuously rather than once, so newly published vulnerabilities in existing images are surfaced without a rebuild, and it covers application-level dependencies such as npm and pip packages, not just OS packages. It also provides exploitability context like EPSS scores. For anything running in production I would use enhanced scanning, because the failure mode of basic scanning — a clean scan from months ago on an image that is now vulnerable — is exactly the situation that causes incidents.

**Q: How do you keep container scanning from producing unmanageable noise?**

The main lever is the base image, not the scanner configuration. A full Debian-based image carries hundreds of CVEs in packages the application never uses, so moving to a slim, Alpine, or distroless base typically removes over ninety per cent of findings without touching application code. After that, tune the gate: fail the build only on critical and high severity issues that have a fix available, using something like Trivy's ignore-unfixed flag, and report everything else to a dashboard. Prioritize using EPSS and the CISA known-exploited catalogue rather than CVSS alone, because a high CVSS score with negligible real-world exploitation is less urgent than a medium score being actively used. Finally, any accepted risk goes in an ignore file with a named owner, a documented reason, and an expiry date, so exceptions get re-reviewed instead of becoming permanent.

**Q: Why does image tag immutability matter for security?**

Because without it, the relationship between a scan result and a running container is unreliable. If tags are mutable, someone can push a different image over `v1.2.3`, so the scan you ran and the artefact in production may be different bytes with the same name, and your audit trail is fiction. With immutable tags, a tag maps permanently to one digest, which means a scan result, an SBOM, and a signature all refer to something specific and verifiable. It also blocks a straightforward supply chain attack, where an attacker with push access replaces a trusted tag rather than introducing an obviously new one. In practice you combine immutable tags with tagging by commit SHA, so every running container traces back to an exact commit.

**Q: Why generate an SBOM if the scanner already lists vulnerabilities?**

Because they answer different questions at different times. A scan tells you which known vulnerabilities exist today, according to today's databases. An SBOM records what is actually inside the artefact, which is what you need when a new critical vulnerability is announced and someone asks whether you are affected. Without SBOMs stored alongside your images, answering that means rebuilding or re-scanning everything under time pressure; with them, it is a query across your inventory that takes minutes. That is precisely the scenario Log4Shell created for most organizations. SBOMs are also increasingly a contractual and regulatory requirement, and they are what supply chain provenance and signing attach to.

---

[← DAST](./03-dast.md) | [Index](./README.md) | [Dependency Scanning →](./05-dependency-scanning.md)
