---
title: Dependency Scanning (SCA)
part: 8
chapter: 0
slug: dependency-scanning
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-04
tags: [devops, devsecops, dependency, scanning]
in_book: false
---

# Dependency Scanning (SCA)

Software Composition Analysis finds known vulnerabilities in the third-party code you depend on. In a typical Node.js service, **90%+ of shipped lines come from dependencies** — so this is where most of your vulnerable code lives.

## Direct vs Transitive

```
your-app
├── express             ← direct dependency (you chose it)
│   └── body-parser     ← transitive
│       └── qs          ← transitive  🔴 vulnerability lives here
└── lodash              ← direct
```

**Why this matters:**

| | Direct | Transitive |
|---|-------|-----------|
| **You chose it** | ✅ Yes | ❌ No |
| **You can upgrade it** | ✅ Directly | ⚠️ Only via the parent, or an override |
| **Share of total deps** | ~5% | **~95%** |
| **Share of findings** | Small | **Most** |

⚠️ Most findings are transitive, which is why they feel un-actionable. The fix is usually to upgrade the direct parent, not the vulnerable package.

**When the parent has not updated — force the resolution:**

```json
{
  "name": "checkout-api",
  "dependencies": {
    "express": "^4.19.2"
  },
  "overrides": {
    "qs": "^6.11.2"
  }
}
```

⚠️ `overrides` (npm) and `resolutions` (Yarn/pnpm) bypass the parent's declared range. Test carefully — you may introduce a breaking change the parent did not expect.

## Lockfiles Are the Security Control

> The lockfile, not `package.json`, determines what actually ships. Scanning without a committed lockfile scans a guess.

| ❌ Without a Lockfile | ✅ With a Lockfile |
|---------------------|-------------------|
| `^4.19.0` may resolve differently per build | Exact versions, byte-identical installs |
| Scan results do not match production | Scan results are authoritative |
| A malicious patch release arrives silently | Version change appears in a reviewable diff |

```bash
# ✅ Installs exactly the lockfile — fails if package.json and lock disagree
npm ci

# ❌ May update the lockfile mid-build; non-reproducible
npm install
```

✅ Use `npm ci` in every pipeline. It is faster and it makes the build reproducible.

## Tooling

| Tool | Strength | Notes |
|------|----------|-------|
| **`npm audit`** | Free, built in | ⚠️ Noisy; poor at dev-vs-prod distinction |
| **Dependabot** | Free on GitHub | ✅ Alerts **and** raises fix PRs |
| **Renovate** | Free, self-hostable | ✅ Best configurability, grouping, auto-merge |
| **Snyk** | Commercial | Reachability analysis, good fix advice |
| **Trivy** | Free | Scans repos, images, and IaC in one tool |
| **OWASP Dependency-Check** | Free | Strong for Java/.NET ecosystems |
| **GitHub Advanced Security** | Paid | Integrated with code scanning and secrets |

✅ For most teams: **Renovate or Dependabot** to keep dependencies current, plus **Trivy or Snyk** as the pipeline gate. Updating regularly prevents more vulnerabilities than scanning finds.

## Reachability — The Thing That Makes SCA Usable

Most reported vulnerabilities are not exploitable in your application.

```
CVE in lodash's `template()` function
    ↓
Does your code call template()?               ── no ──► not exploitable
Does any dependency call it on your behalf?   ── no ──► ✅ noise
    ↓ yes
Can untrusted input reach it?                 ── no ──► low risk
    ↓ yes
🔴 Real risk. Fix now.
```

✨ Reachability analysis typically removes **80–90%** of findings. Without it, teams face a list of hundreds and rationally ignore all of them.

**Prioritization signals, best to worst:**

| Signal | Value |
|--------|-------|
| **Reachable + untrusted input reaches it** | 🔴 Highest — fix immediately |
| **CISA KEV** (known exploited in the wild) | 🔴 Fix regardless of score |
| **EPSS** (probability of exploitation) | ✅ Strong practical signal |
| **CVSS severity** | ⚠️ Weak alone — context-free |
| **"Critical" label from the scanner** | ⚠️ Often just the CVSS |

> A CVSS 9.8 in a build-time-only dev dependency is less urgent than a CVSS 7.5 in a network-facing library that CISA lists as actively exploited.

## Production vs Development Dependencies

```bash
# ✅ Only what ships to production
npm audit --omit=dev --audit-level=high
```

| Dependency Type | Ships to Production? | Risk |
|----------------|---------------------|------|
| `dependencies` | ✅ Yes | 🔴 Real runtime risk |
| `devDependencies` | ❌ No | ⚠️ Risk is to your **build system** |

⚠️ Development dependencies are not risk-free — they run on your CI runner with access to secrets and the ability to modify artefacts. A compromised test framework is a supply chain attack. But the risk profile is different: it threatens the build, not the running service.

## Automating Updates

The most effective control is **staying current**, not scanning harder.

```json
// renovate.json — grouped, scheduled, with auto-merge for safe changes
{
  "extends": ["config:recommended"],
  "schedule": ["before 6am on monday"],
  "prConcurrentLimit": 5,
  "packageRules": [
    {
      "description": "Patch and dev updates: auto-merge if CI is green",
      "matchUpdateTypes": ["patch", "pin", "digest"],
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    },
    {
      "description": "Group all AWS SDK v3 packages into one PR",
      "matchPackagePatterns": ["^@aws-sdk/"],
      "groupName": "aws-sdk"
    },
    {
      "description": "Wait 3 days before adopting a brand-new release",
      "matchUpdateTypes": ["minor", "major"],
      "minimumReleaseAge": "3 days"
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "schedule": ["at any time"]
  }
}
```

**Three settings that make this work in practice:**

| Setting | Why |
|---------|-----|
| `minimumReleaseAge` | ✅ Protects against a compromised release pulled within hours |
| `groupName` | 40 separate SDK PRs is noise; one grouped PR is reviewable |
| `vulnerabilityAlerts` outside the schedule | Security fixes should not wait for Monday |

⚠️ Auto-merge requires genuinely trustworthy tests. Auto-merging into a repo with 40% coverage automates the introduction of breakage.

## License Compliance

SCA tools also report licences, which matters in enterprise and public sector work.

| Category | Examples | Typical Position |
|----------|----------|-----------------|
| **Permissive** | MIT, Apache-2.0, BSD | ✅ Generally fine |
| **Weak copyleft** | LGPL, MPL-2.0 | ⚠️ Usually fine if unmodified and dynamically linked |
| **Strong copyleft** | GPL-3.0, AGPL-3.0 | 🔴 AGPL is commonly banned for SaaS |
| **Unlicensed / unknown** | No LICENSE file | 🔴 Treat as "no rights granted" |

✅ Enforce an allowlist in CI. Discovering an AGPL dependency during an acquisition due-diligence review is an expensive way to find out.

## Supply Chain Attacks

| Attack | How | Defence |
|--------|-----|---------|
| **Dependency confusion** | Internal package name registered publicly | Scoped names (`@acme/*`), registry config, verify scopes |
| **Typosquatting** | `lodahs` instead of `lodash` | Lockfile review, allowlists |
| **Compromised maintainer** | Malicious version published to a real package | `minimumReleaseAge`, pin versions |
| **Malicious install script** | `postinstall` runs arbitrary code | `npm ci --ignore-scripts` where possible |
| **Protestware** | Maintainer sabotages their own package | Pin, review diffs of updates |

🔴 **Dependency confusion is the highest-impact and easiest to miss.** If your private package `@acme/auth-utils` is referenced without registry scoping, and an attacker publishes `acme-auth-utils` publicly with a higher version, some installers will fetch theirs.

```ini
# .npmrc — scope internal packages to the private registry explicitly
@acme:registry=https://acme.jfrog.io/artifactory/api/npm/npm-local/
//acme.jfrog.io/artifactory/api/npm/npm-local/:_authToken=${NPM_TOKEN}
```

## Interview Q&A

**Q: What is SCA and why does it matter more than scanning your own code?**

Software Composition Analysis inventories your third-party dependencies and matches their versions against vulnerability databases. It matters disproportionately because in a modern application the overwhelming majority of shipped code is not code your team wrote — a small Node.js service can easily pull in several hundred packages transitively. So statistically, most of the vulnerable code in your production artefact arrived through dependencies rather than through your own commits. The important nuance is that SCA is version matching, not analysis: it tells you a vulnerable version is present, not that the vulnerability is exploitable in your application, which is why reachability analysis is what turns SCA output from a long list into a short list.

**Q: Most SCA findings are in transitive dependencies you did not choose. How do you deal with that?**

First, accept that this is normal — around ninety-five per cent of your dependency tree is transitive, so most findings will be too. The usual fix is not to patch the vulnerable package directly but to upgrade the direct parent that pulls it in, since maintainers typically bump their own dependencies. When the parent has not updated, npm `overrides` or Yarn and pnpm `resolutions` let you force a safe version across the tree, though that needs testing because you are overriding a range the parent declared. Beyond the mechanics, the strategic answer is that continuous, automated updating through Renovate or Dependabot prevents far more vulnerabilities than reactive patching, because most of these findings would never have appeared if the tree were current.

**Q: How do you prioritize a list of 300 dependency vulnerabilities?**

I would not treat CVSS as the primary signal, because it is context-free. The strongest signal is reachability — whether your code, or a dependency acting on your behalf, actually calls the vulnerable function, and whether untrusted input can reach it. That alone usually eliminates the large majority. Next I would apply real-world exploitation data: anything in the CISA known-exploited catalogue gets fixed regardless of score, and EPSS gives a useful probability estimate for the rest. Then separate production dependencies from development ones, since a vulnerability in a test framework threatens the build system rather than the running service, which is a real but different risk. What remains after that filtering is normally a handful of genuinely urgent items, which is a list a team can actually act on.

**Q: Why is a committed lockfile a security control?**

Because the lockfile determines what actually gets installed, and therefore what ships. A version range like caret four point nineteen can resolve to different packages on different days, which means the tree you scanned in CI may not be the tree that ends up in the artefact, and a compromised patch release can enter silently with no reviewable change. With a committed lockfile and `npm ci` rather than `npm install`, installs are reproducible and byte-identical, scan results describe the real artefact, and any version change shows up as a diff in a pull request that a human can look at. That last property is what turns a silent supply chain event into something reviewable.

**Q: What is dependency confusion and how do you prevent it?**

Dependency confusion exploits how package managers resolve names when both a private and a public registry are configured. If your internal package is called something like `acme-auth-utils` and your installer is configured to fall back to the public registry, an attacker can publish a package with that exact name publicly at a very high version number, and the resolver may prefer it — executing their code inside your build with access to your CI credentials. The defences are to use scoped package names such as `@acme/auth-utils` and bind that scope explicitly to your private registry in `.npmrc`, so the public registry is never consulted for it; to claim your organization's scope on the public registry defensively; and to run installs with a lockfile so unexpected resolutions surface as diffs rather than happening silently.

---

[← Container Security](./04-container-security.md) | [Index](./README.md) | [Secrets Detection →](./06-secrets-detection.md)
