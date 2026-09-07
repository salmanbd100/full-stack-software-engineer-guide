---
title: Package Management
part: 3
chapter: 0
slug: package-management
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [pnpm, npm, yarn, lockfile, supply-chain, dependencies]
in_book: true
---

# Package Management {#ch-package-management}

> Know exactly what a lockfile guarantees, why phantom dependencies exist, and which settings actually reduce supply-chain risk.

**In this chapter:** resolution against installation · what a lockfile promises · hoisting and phantom dependencies · the three managers · lifecycle scripts · release-age delays

## 💡 The Core Idea

A package manager makes two promises, and they fail in different ways.

**Resolution** turns a range — `^19.2.0` — into one exact version, for every package in the tree. The
**lockfile** is the written record of that decision, so the next install reproduces it.

**Installation** puts those files where the runtime can find them. This is where the three managers
genuinely differ, and it is where the surprising bugs live.

Most package-manager confusion is treating these as one thing. A lockfile guarantees *which versions*.
It says almost nothing about *what your code can import*, and the gap between those two is where a build
breaks on a machine that is not yours.

## How It Works

### What a lockfile guarantees, and what it does not

| Guaranteed | Not guaranteed |
| ---------- | -------------- |
| The exact version of every direct and transitive dependency | That the published tarball is the same code as the repository tag |
| An integrity hash for every package | That a postinstall script does not run |
| The resolved dependency tree shape | The Node.js version, the operating system, or native build outputs |

The lockfile only takes effect if you install from it. In continuous integration the command must be the
one that **fails** when the lockfile and `package.json` disagree — `npm ci`, or
`pnpm install --frozen-lockfile` — rather than the one that quietly rewrites it.

Using `install` in a pipeline means the pipeline can resolve a different tree from the one that was
reviewed, which defeats the purpose of committing the file at all.

### Hoisting, and the phantom dependency

Historically, npm and Yarn flatten the dependency directory. Every transitive dependency is placed at the
top level, and the runtime's directory walk finds it.

That makes this work:

```typescript
// Nothing in package.json declares `lodash`. Some dependency depends on it,
// so it was hoisted, so this resolves — until that dependency drops it.
import { debounce } from 'lodash';
```

This is a **phantom dependency**: an import that works by accident. It survives review, passes
continuous integration, and breaks in a patch release of an unrelated package.

pnpm's layout removes the accident. Packages live once in a global content-addressable store and are
hard-linked into a private directory, with symlinks placing **only declared dependencies** where the
runtime can see them. An undeclared import fails immediately, on the machine where it was written.

The disk saving is the headline, but the strictness is the reason to prefer it.

### The three managers

| | npm | Yarn | pnpm |
| --- | --- | --- | --- |
| **Layout** | Hoisted, flat | Hoisted, or Plug'n'Play | Content-addressable store plus symlinks |
| **Phantom dependencies** | Possible | Possible (impossible under PnP) | Prevented |
| **Disk per version** | Once per project | Once per project | Once per machine |
| **Workspaces** | Yes | Yes | Yes, with the `workspace:` protocol |
| **Runs install scripts by default** | Yes | Yes | **No** — allow-listed |

Yarn's Plug'n'Play removes the dependency directory entirely and resolves through a manifest, which is
the strictest option available and also the one most likely to need patches for tools that assume a real
directory exists.

The practical position for 2026: **pnpm is the default choice**, npm is the safe choice when tooling
compatibility outweighs everything, and Yarn is what you use when a repository already uses it. Never
switch a repository's manager casually — the lockfiles are not interchangeable and the resolved trees
will differ.

### Lifecycle scripts are arbitrary code execution

Installing runs `postinstall` scripts from your dependencies, transitively, with your user's permissions
and your environment variables. This is the mechanism behind essentially every registry compromise:
publish a version with a malicious `postinstall`, wait for continuous integration to run it.

pnpm changed the default here, and it is the most consequential recent change in this area — dependency
build scripts do not run unless you allow them:

```yaml
# pnpm-workspace.yaml — only these dependencies may run build scripts.
allowBuilds:
  esbuild: true
  sharp: true
```

The allow-list is short in practice: packages with native binaries to compile or download. Everything else
does not need to run code at install time, and now cannot.

> ⚠️ **Moving target:** the setting name has changed twice. pnpm 10 used `onlyBuiltDependencies` in the
> npm-style configuration file; pnpm 11 replaced it and its siblings with `allowBuilds` in the workspace
> file. The durable idea — install-time script execution is opt-in, not default — is what to carry
> forward.

### Delaying new releases is the highest-value setting

A compromised package version is typically identified and pulled within hours of publication. The teams
that get hit are the ones that installed it in that window — usually because a pipeline ran with a caret
range and picked up the newest version minutes after it appeared.

`minimumReleaseAge` refuses versions published more recently than a threshold:

```yaml
minimumReleaseAge: 4320        # minutes — three days
minimumReleaseAgeExclude:
  - '@acme/*'                  # your own packages publish and install immediately
```

Three days of delay costs almost nothing — you were not going to adopt a patch within seventy-two hours
anyway — and removes most of the exposure window. It is the single best return of any setting in this
chapter.

### The rest of the supply-chain checklist

| Control | What it addresses |
| ------- | ----------------- |
| Commit the lockfile; install frozen in continuous integration | Reproducibility, and integrity hashes actually being checked |
| Scoped names for internal packages, plus a scoped registry | Dependency confusion — a public package impersonating an internal one |
| `overrides` or `resolutions` | Forcing a patched version of a transitive dependency you do not control |
| Automated dependency updates, batched and reviewed | Staying current without a quarterly upgrade crisis |
| Audit on a schedule, not on every pull request | Advisories are not the author's fault and should not block their merge |

Be honest about the last one in an interview. An audit compares your tree against a database of *known*
advisories. It cannot detect a compromise published an hour ago, which is exactly why the release-age
delay matters more than the audit does.

## When to Use It

| Situation | Choose |
| --------- | ------ |
| A new project | pnpm, with an empty build allow-list and a release-age delay set |
| An existing repository | Whatever it already uses. Do not switch casually |
| Maximum strictness, tolerant tooling | Yarn Plug'n'Play |
| A published library | Whatever you like locally; test the install with npm, which most consumers use |
| Continuous integration, any manager | The frozen-lockfile command, always |

## Common Mistakes

**❌ Running `install` instead of `ci` or `--frozen-lockfile` in a pipeline.**
✅ The tree can differ from the reviewed one, silently.

**❌ Importing something that was never declared.**
✅ It works until a transitive dependency changes. Declare every import.

**❌ Deleting the lockfile to fix an install problem.**
✅ You have replaced a known tree with a new resolution, and whatever was broken is now unreproducible.

**❌ Committing two lockfiles.**
✅ They will disagree, and the machine that reads the other one gets a different tree.

**❌ Treating `audit` as the supply-chain strategy.**
✅ It reports known advisories after the fact. Blocking install-time scripts and delaying brand-new
versions prevent more than it detects.

**❌ Switching package manager mid-project for speed.**
✅ The resolved tree changes, and you will spend the saved time on the resulting bugs.

## 🔑 Key Takeaways

- A lockfile records resolution; the installation layout is a separate promise, and that is where the differences are.
- Hoisted layouts allow phantom dependencies — imports that work by accident and break on someone else's machine.
- pnpm's store-and-symlink layout makes undeclared imports fail immediately, and saves disk as a side effect.
- Install-time lifecycle scripts are arbitrary code execution; allow-list them rather than accepting the default.
- Refusing versions published in the last few days removes most of the registry-compromise exposure window.

## Interview Questions

**Q: What does a lockfile actually guarantee?**

That every direct and transitive dependency resolves to the same exact version with the same integrity
hash as when it was written. It does not guarantee the published tarball matches the repository, does not
stop install scripts running, and does not pin the runtime or native build outputs. And it guarantees
nothing at all unless the pipeline installs from it with the frozen-lockfile command.

**Q: What is a phantom dependency and why does pnpm prevent it?**

An import of a package you never declared, which resolves because a hoisted flat layout put a transitive
dependency at the top level. It breaks when that dependency changes — often in a patch release of
something unrelated. pnpm symlinks only declared dependencies into place, so the import fails on the
machine where it was written rather than in someone else's build.

**Q: How would you reduce supply-chain risk in a frontend codebase?**

Four things, in order of value. Stop install-time scripts running by default and allow-list the few
packages that genuinely need them. Refuse versions published within the last few days, because
compromised releases are usually pulled within hours. Commit the lockfile and install frozen everywhere.
Scope internal package names and point that scope at your own registry. Auditing comes after all of those
— it finds known advisories, not new attacks.

**Q: Should you switch a project from npm to pnpm?**

Only with a reason and a plan. The benefits are real — strict resolution and much less disk — but the
resolved tree changes, so anything that depended on hoisting breaks at once. It is worth doing when
phantom dependencies or install time are causing actual pain, and it is not worth doing mid-release for
a benchmark.

## What to Read Next

- [Chapter ?? — Monorepos](#ch-monorepos) — the workspace protocol and why it refuses the registry
- [Chapter ?? — CI/CD Security](#ch-cicd-security) — where install-time execution meets your pipeline credentials
- [Chapter ?? — Modules and Bundling](#ch-modules-and-bundling) — how the installed layout becomes resolution
