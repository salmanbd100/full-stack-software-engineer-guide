---
title: Type-Checking and Linting at Scale
part: 3
chapter: 0
slug: type-checking-and-linting
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [typescript, eslint, biome, oxlint, project-references, ci]
in_book: true
---

# Type-Checking and Linting at Scale {#ch-type-checking-and-linting}

> Separate three jobs people run as one, and keep the whole-program work off the critical path.

**In this chapter:** three jobs, three costs · project references · `skipLibCheck` · type-aware rules and what they cost · Biome and Oxlint · what gates a merge

## 💡 The Core Idea

Three different jobs get bundled together under "code quality", and they have wildly different costs.

**Formatting** is syntactic. It reads one file, ignores everything else, and finishes instantly.

**Linting** is pattern matching. Most rules read one file and finish quickly. A minority need the whole
program, and those cost what type-checking costs.

**Type-checking** is semantic and whole-program. To know whether this call is valid it must resolve every
type it touches, transitively. It cannot be made per-file, and it cannot be skipped, because — as
[Chapter ?? — Turbopack, Rspack and Rolldown](#ch-rust-bundlers) explains — the bundler strips types
without checking them.

Almost every slow pipeline is one of these three doing work that belongs to another, or the whole-program
one being run more often than it needs to be.

> ⚠️ **Moving target:** both halves of this chapter are being rewritten in native languages. A Go port of
> the TypeScript compiler is in progress and is intended to become TypeScript 7, with roughly an
> order-of-magnitude speed-up, and Rust linters are steadily adding the type-aware rules they currently
> lack. Check what your version supports. The durable part is the cost model: whole-program work is
> expensive whoever writes the implementation.

## How It Works

### Why type-checking does not parallelise

A linter can shard a thousand files across eight cores. A type-checker cannot, because checking file A
requires the resolved types of everything A imports, and those requirements form the same graph the
bundler walks.

There are three levers, in order of value.

**`skipLibCheck: true`.** Without it, the compiler checks every `.d.ts` file in `node_modules` — tens of
thousands of declarations you did not write and cannot fix. It stays enabled in essentially every real
project.

**`incremental: true`.** The compiler writes a `.tsbuildinfo` file recording what it checked, so the next
run only re-checks what changed. Cache that file in continuous integration or the benefit exists only on
developer machines.

**Project references.** The real scaling mechanism, and the one most teams never reach for.

### Project references, and why they change the shape

Normally, checking an application means re-checking the source of every package it imports. Project
references replace that: each project is compiled once to `.d.ts` **declaration files**, and downstream
projects consume the declarations instead of the sources.

```json
// packages/web/tsconfig.json
{
  "compilerOptions": { "composite": true, "declaration": true },
  "references": [{ "path": "../ui" }, { "path": "../types" }]
}
```

`tsc --build` then walks the reference graph, checks each project once in dependency order, skips any
whose build info is still valid, and can run independent projects in parallel.

The cost is real: every referenced project needs `composite: true`, must emit declarations, and can no
longer have a circular reference to anything downstream. That last constraint is usually a benefit
disguised as a chore — it forces the package boundaries to be acyclic, which they should have been
anyway. The unit of work becomes the package rather than the repository, which is the same shift the task
graph in [Chapter ?? — Monorepos](#ch-monorepos) makes for builds.

### Two kinds of lint rule

| | Syntactic rules | Type-aware rules |
| --- | --- | --- |
| **Reads** | One file's syntax tree | The whole type graph |
| **Examples** | Unused variables, import order, hook dependency arrays | Floating promises, unsafe `any` propagation, unnecessary conditionals |
| **Cost** | Milliseconds per file, parallel | As expensive as type-checking, again |
| **Parallelises** | Yes | No |

This table is the answer to "why does linting take eight minutes". Enabling a type-aware preset makes the
linter build a second full type program. You are now type-checking twice.

The pragmatic arrangement is a split:

- **A fast Rust linter — Biome or Oxlint — on every file, on every commit.** Syntactic rules, unused
  code, import hygiene, framework rules. Fast enough to be a pre-commit hook.
- **A small, deliberate set of type-aware rules**, run once in continuous integration alongside the type
  check. Choose the ones that catch real bugs — an unawaited promise is the strongest example — rather
  than enabling the preset.

### Formatting is not linting

No lint rule should be about whitespace. Formatting is deterministic and machine-fixable, so it should
never reach a human or fail a build:

| Where | What to do |
| ----- | ---------- |
| The editor | Format on save |
| Pre-commit | Format staged files |
| Continuous integration | Check, and fail with the exact command to fix it — or fix it and push |
| Code review | Never. A comment about a blank line is a process failure |

Biome does formatting and linting in one binary, which removes the configuration seam between two tools
that has caused arguments for a decade.

### What gates a merge

Not everything has to block. A useful default:

| Check | Blocks a merge | Why |
| ----- | -------------- | --- |
| Formatting | Yes, auto-fixed | Free, and prevents diff noise |
| Fast lint rules | Yes | Seconds, catches real mistakes |
| `tsc --build` on affected projects | **Yes** | Nothing else validates types |
| Type-aware lint rules | Yes, if the set is small | Otherwise it doubles the type-check |
| Full-repository type check | Nightly | Catches drift from affected-only runs |
| Dependency and licence audit | Nightly, alert only | Not the pull request author's problem |

Two rules make the difference in practice. **Run each check in its own job**, so a red pipeline names the
actual problem instead of "build failed". And **run them on affected packages only**, with the full sweep
on a schedule.

## When to Use It

| Situation | Do |
| --------- | -- |
| One application, a few hundred files | `tsc --noEmit` with `skipLibCheck`. Nothing more needed |
| A monorepo with shared packages | Project references and `tsc --build` |
| Lint taking minutes | Split syntactic from type-aware; move the first to a Rust linter |
| Starting a new repository | Biome for formatting and fast rules, plus a small type-aware set |
| An existing large ESLint configuration | Migrate the syntactic rules first; the type-aware ones are the hard part |

## Common Mistakes

**❌ Trusting a green build to mean the types are sound.**
✅ The bundler stripped them. `tsc` is the only thing that checked.

**❌ Enabling a full type-aware lint preset because it sounds thorough.**
✅ You have doubled the most expensive check to gain rules nobody reads. Pick the ones that catch bugs.

**❌ Running `--fix` in continuous integration and committing the result.**
✅ Now the pipeline writes code. Fail with the command to run locally, or fix formatting only, in its own
step.

**❌ Turning off `skipLibCheck` for rigour.**
✅ You are now blocked by type errors in dependencies you cannot edit.

**❌ Not caching `.tsbuildinfo` between runs.**
✅ Incremental checking is doing nothing. Every run is a cold run.

**❌ Reviewing formatting in pull requests.**
✅ Automate it. Human attention on whitespace is the most expensive way to align a brace.

## 🔑 Key Takeaways

- Formatting, linting and type-checking have different costs; treating them as one makes the pipeline slow.
- Type-checking is whole-program and cannot be sharded — `skipLibCheck`, incremental builds and project references are the levers.
- Project references make the unit of checking a package by consuming declaration files instead of sources.
- Type-aware lint rules cost a second full type-check; enable them deliberately, not as a preset.
- Nothing but `tsc` validates types, so it has to gate merges.

## Interview Questions

**Q: Why can't type-checking be parallelised the way linting is?**

Because checking a file requires the resolved types of everything it imports, transitively — it is a
whole-program analysis over a dependency graph, not a per-file pass. The way to parallelise it is to cut
the graph into projects with declared boundaries, so each is checked once and downstream projects read its
declaration files rather than its sources.

**Q: How do project references speed up a large TypeScript codebase?**

Each project compiles to `.d.ts` files and records its own build info. Consumers type-check against those
declarations instead of re-checking the sources, so unchanged projects are skipped entirely and
independent ones run in parallel. The price is `composite: true`, emitted declarations, and an acyclic
package graph — which most codebases should have anyway.

**Q: Linting takes eight minutes in continuous integration. What do you look at first?**

Whether type-aware rules are enabled. Those build a full type program, so the linter is type-checking the
repository a second time. Split the configuration: syntactic rules on a fast Rust linter across
everything, and a small deliberate set of type-aware rules run once alongside the type check. Then check
that lint is running on affected packages rather than all of them.

**Q: What should block a merge, and what should not?**

Formatting, fast lint rules and the type check on affected packages should block — they are cheap and
they catch real problems. A full-repository type check, dependency audits and licence scans should run on
a schedule and alert someone, because they fail for reasons the pull request author did not cause and
cannot fix.

## What to Read Next

- [Chapter ?? — Monorepos](#ch-monorepos) — affected-only runs and caching for these same checks
- [Chapter ?? — React and TypeScript at Scale](#ch-react-typescript-at-scale) — the type patterns being checked
- [Chapter ?? — CI/CD Fundamentals](#ch-cicd-fundamentals) — where these gates sit in a pipeline
