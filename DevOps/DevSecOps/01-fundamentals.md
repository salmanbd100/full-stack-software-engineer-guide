# DevSecOps Fundamentals

DevSecOps means security is a **property of the pipeline**, not a review meeting before release. The goal is to make the secure path the easy path.

## The Problem It Solves

```
❌ Traditional: security as a gate at the end

  Design → Build → Test → [SECURITY REVIEW] → Release
                              ↑
                    finds a design flaw here.
                    Cost to fix: weeks. Usually shipped anyway.
```

```
✅ DevSecOps: security distributed across the lifecycle

  Design ──► Build ──► Test ──► Deploy ──► Run
    ↓         ↓         ↓         ↓         ↓
  threat    SAST     DAST     policy    runtime
  model     SCA      IaC      admission  detection
            secrets  scan     control
```

> The cost of fixing a vulnerability rises sharply the later you find it. A flaw caught by a pre-commit hook costs minutes. The same flaw found by a penetration test costs weeks and a release slip.

## Shift Left — And Shift Right

"Shift left" gets all the attention, but only half the job happens before deploy.

| Phase | Catches | Tools |
|-------|---------|-------|
| **Pre-commit (local)** | Secrets, obvious issues | `pre-commit`, gitleaks, linters |
| **Pull request** | Code flaws, bad IaC, vulnerable deps | SAST, SCA, Checkov/tfsec |
| **Build** | Vulnerable base images, no provenance | Trivy, SBOM generation, signing |
| **Pre-deploy** | Policy violations | OPA/Kyverno admission control |
| **Runtime (shift right)** | ✅ What static analysis **cannot** see | GuardDuty, Falco, WAF |

⚠️ Shift-left alone is insufficient. Static analysis cannot see a leaked credential being used, a container spawning a shell, or a zero-day in a dependency you already shipped. You need both directions.

## Guardrails vs Gates

This is the central design decision in DevSecOps, and a strong interview talking point.

| | **Gate** | **Guardrail** |
|---|---------|--------------|
| **Behaviour** | Blocks the pipeline | Makes the wrong thing impossible or auto-corrected |
| **Example** | Scan fails the build on any CVE | SCP denies unencrypted S3 buckets |
| **Developer feels** | Blocked, looks for a bypass | Nothing — the secure default just happens |
| **Scales?** | ❌ Becomes a bottleneck | ✅ Yes |

❌ **Anti-pattern:** a scanner that fails the build on 400 findings including 380 in transitive dependencies with no reachable exploit path. Within a week someone adds `|| true`.

✅ **Better:** fail only on critical and high severity **with a known fix available**, report the rest, and provide a paved-road base image that starts clean.

> A security control that developers routinely bypass provides negative value — it costs effort and gives false assurance.

## What to Break the Build For

Be deliberate. Not every finding deserves to stop a release.

| Finding | Action |
|---------|--------|
| Hard-coded secret detected | 🔴 **Fail** — always, no exceptions |
| Critical CVE with a fix available | 🔴 **Fail** |
| Critical CVE, no fix exists | ⚠️ Warn + ticket + compensating control |
| High CVE in a dev-only dependency | ⚠️ Warn |
| IaC: public S3 bucket, open security group | 🔴 **Fail** |
| Medium/low findings | 📋 Report to a dashboard |
| Unsigned image at deploy | 🔴 **Fail** at admission control |

✨ **Reachability analysis** is what makes SCA usable. A vulnerability in a function your code never calls is not an incident. Tools that distinguish reachable from present findings cut noise by 80–90%.

## The Shared Responsibility Split

DevSecOps only works when ownership is clear.

| Who | Owns |
|-----|------|
| **Security team** | Policy, threat models, tooling, triage of real risk |
| **Platform team** | Paved roads: hardened base images, secure modules, pipeline templates |
| **Product engineers** | Fixing findings in their own code, on their own schedule |

❌ "Security will review it" — a queue, and a single point of failure.
✅ "The pipeline enforces it and the platform makes it easy" — scales to hundreds of engineers.

## The Paved Road

The most effective DevSecOps investment is making the compliant path the least effort.

```
Developer wants a new service:
  ↓
  Uses the platform template
  ↓
  Gets for free:
    ✅ Hardened distroless base image
    ✅ Pipeline with SAST, SCA, secrets, IaC scan, image scan, signing
    ✅ Terraform module: private subnets, encryption, least-privilege role
    ✅ OIDC auth to AWS — no long-lived keys
    ✅ Logging, tracing, and alerting wired up
```

> If doing it securely takes less effort than doing it insecurely, you have solved most of DevSecOps.

## Supply Chain Security

The dependency and build chain is now a primary attack path.

| Attack | Example | Defence |
|--------|---------|---------|
| **Dependency confusion** | Internal package name claimed on a public registry | Scoped packages, registry pinning |
| **Typosquatting** | `reqeusts` instead of `requests` | Lockfiles, allowlists |
| **Compromised maintainer** | Malicious version published | Pin versions, delay adoption, review diffs |
| **Compromised build system** | Attacker modifies the artifact | Ephemeral runners, signing, SLSA provenance |
| **Malicious pull request** | Untrusted code runs on your CI | ❌ Never use `pull_request_target` with checkout of the PR head |

**The two artefacts that prove supply chain hygiene:**

| Artefact | Answers |
|----------|---------|
| **SBOM** (CycloneDX/SPDX) | "What is inside this image?" — essential when the next Log4Shell lands |
| **Provenance / signature** | "Did our pipeline build this, from which commit?" |

See [Pipeline Security](../CICD/08-security.md) for signing and SBOM implementation.

## Metrics That Matter

❌ **Vanity metrics:** number of vulnerabilities found, number of scans run, coverage percentage.

✅ **Outcome metrics:**

| Metric | What It Shows |
|--------|--------------|
| **Mean time to remediate (by severity)** | Do fixes actually happen? |
| **% of services on the paved road** | Is the secure path being adopted? |
| **Escaped vulnerabilities** | Found in production that scanning missed |
| **False positive rate** | Is the tooling trusted? |
| **Secrets detected pre-commit vs post-commit** | Is shift-left working? |

> "We found 4,000 vulnerabilities" is not a result. "Critical findings are remediated in under 5 days and 90% of services use the hardened base image" is.

## Culture

The hardest part is not tooling.

| ✅ Do | ❌ Don't |
|------|---------|
| Blameless postmortems for security incidents | Punish the person who clicked the link |
| Security champions inside product teams | A central team that says no |
| Explain *why* a finding matters | Paste a CVSS score with no context |
| Fix the class of bug, not the instance | Close the ticket and move on |
| Make security work visible in the sprint | Expect it to happen in spare time |

⚠️ If reporting a mistake gets someone in trouble, mistakes stop being reported. You lose the information you most need.

## Interview Q&A

**Q: What is DevSecOps, and how is it different from having a security team?**

DevSecOps means security controls are built into the delivery pipeline and the platform, so they run automatically on every change rather than as a review stage before release. The difference is structural: a security team acting as a gate becomes a queue, scales badly, and is usually overruled by delivery pressure, and because it reviews late, the flaws it finds are expensive to fix. In a DevSecOps model, the security team still exists, but its job shifts to setting policy, building tooling, and triaging genuine risk, while the pipeline enforces the routine checks and the platform team provides secure defaults. The measure of success is not how much the security team catches, but how little reaches them because the paved road prevented it.

**Q: What does "shift left" mean, and what is the limit of it?**

Shifting left means moving security checks earlier — secrets detection in a pre-commit hook, static analysis and dependency scanning on the pull request, infrastructure-as-code scanning before apply. It works because the cost of fixing a problem rises steeply with how late you find it. The limit is that static analysis can only reason about code and configuration as written. It cannot see a credential being used from an unexpected country, a container spawning an interactive shell, an authorization flaw that only appears with real data, or a zero-day in a dependency you shipped last month. So shift left has to be paired with shift right: runtime detection through GuardDuty and tools like Falco, WAF at the edge, and anomaly detection on logs. Teams that only shift left have good hygiene and no visibility.

**Q: How do you stop security scanning from becoming noise developers ignore?**

Be selective about what fails the build. I would break the build for hard-coded secrets, critical and high vulnerabilities that have a fix available, and infrastructure misconfigurations with direct exposure such as a public bucket or an open security group. Everything else gets reported to a dashboard with an owner and a service-level target for remediation. Reachability analysis matters enormously here, because most dependency findings are in code paths your application never executes, and filtering those out typically removes the large majority of the noise. I would also make sure the paved-road base image starts with zero findings, so the only things a team sees are the ones they introduced. The failure mode to design against is a developer adding a flag to skip the scan, because at that point the control is worse than nothing — it consumes effort and provides false assurance.

**Q: What is the difference between a guardrail and a gate?**

A gate blocks a process until a check passes — a scan that fails a build, or an approval someone must click. A guardrail makes the undesirable outcome impossible or automatically corrected, so nobody experiences a block at all. For example, a gate would be a pipeline step that fails when Terraform declares an unencrypted S3 bucket; the guardrail equivalent is a service control policy that denies unencrypted bucket creation organization-wide, plus a Terraform module where encryption is the default and cannot be disabled. Guardrails scale better because they do not create queues or bypass incentives, and they cover the paths that skip your pipeline entirely, such as someone using the console. Gates are still necessary where judgement is required, but the strategic goal is to convert gates into guardrails over time.

**Q: How would you measure whether DevSecOps is working?**

Not by counting findings, because that measures scanner verbosity rather than risk. The metrics I would use are mean time to remediate broken down by severity, which tells you whether fixes actually happen; the proportion of services using the paved-road template and hardened base image, which tells you whether the secure path is winning; escaped vulnerabilities, meaning issues found in production that the pipeline should have caught, which tells you where coverage is weak; and false positive rate, because a tool nobody trusts is a tool nobody acts on. I would also track secrets caught pre-commit versus post-commit, since that is a direct read on whether shift-left controls are effective. Together those answer the only question that matters — is the risk actually going down.

---

[DevSecOps Index](./README.md) | [SAST →](./02-sast.md)
