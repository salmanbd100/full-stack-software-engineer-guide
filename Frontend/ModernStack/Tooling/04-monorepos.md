---
title: Monorepos
part: 3
chapter: 0
slug: monorepos
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [monorepo, pnpm-workspaces, turborepo, task-graph, caching, ci]
in_book: true
---

# Monorepos {#ch-monorepos}

> Make a large repository cheap to build by declaring the task graph, hashing the right inputs, and running only what changed.

**In this chapter:** the two graphs · workspace wiring · what goes into a cache key · the environment-variable trap · affected-only runs · publishing

## 💡 The Core Idea

Whether to use a monorepo is a coordination question, and
[Chapter ?? — Repository Strategies](#ch-repository-strategies) answers it. This chapter starts one step
later: you have one, and the problem is that everything now shares a pipeline.

A monorepo without a task graph runs everything on every change. Twelve packages, one commit touching a
README, and continuous integration builds and tests all twelve. That is strictly worse than separate
repositories, and it is why "we tried a monorepo and it was slow" is such a common story.

The fix is to make the build system able to answer two questions: **what must run before what**, and
**has this exact work already been done?** Everything else in this chapter is those two questions.

> ⚠️ **Moving target:** the configuration spelling churns. Turborepo 2 renamed `pipeline` to `tasks`
> and `outputMode` to `outputLogs`, dropped the `dotEnv` keys, and moved the cache directory; Nx
> reshapes its project configuration on a similar cadence. The durable principle is the one both tools
> implement: the cache is content-addressed over the inputs you declared, so a cache that misses when it
> should hit means an input is undeclared.

## How It Works

### Two graphs, not one

| Graph | Edges | Answers |
| ----- | ----- | ------- |
| **Package graph** | `packages/ui` depends on `packages/tokens` | What is affected when this changes? |
| **Task graph** | `web#build` depends on `ui#build` | What order can these run in? |

The package graph comes from `package.json` files. The task graph is declared, and the two are related
but not identical — `test` may depend on the upstream `build` without depending on the upstream `test`.

**Declaring it:**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

The `^` prefix means "the same task in this package's **dependencies**", which is what makes the order
topological. Without the caret it means a task in the same package. That one character is the most
commonly misread piece of configuration in the file.

`cache: false` and `persistent: true` on `dev` say what they look like: a watch process produces no
cacheable artefact and never exits.

### Wiring the workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Internal dependencies use the workspace protocol, which resolves to the local package and refuses to fall
back to the registry:

```json
{ "dependencies": { "@acme/ui": "workspace:*" } }
```

That refusal is the point. Without it, a typo in a package name silently installs a stranger's package
from the registry — which is one of the ways dependency-confusion attacks work.

### What goes into a cache key

A task's cache key is a hash of everything that could change its output:

| Input | Included by default |
| ----- | ------------------- |
| The package's source files | Yes |
| The task's own configuration | Yes |
| The hashes of its dependencies' outputs | Yes |
| Declared environment variables | Only those listed in `env` |
| The lockfile | Yes |
| Everything else in the environment | **No** |

On a hit, the tool replays the recorded outputs and the logs — the task never runs. On a miss it runs and
records. A shared **remote cache** extends this across machines, which is where the real gain is: a task
built once on a colleague's laptop is a cache hit in continuous integration.

### The environment-variable trap

This is the monorepo bug that reaches production, so it is worth its own section.

An environment variable that changes a build's output but is **not** in the cache key means a staging
build can be served from a production build's cache. An environment variable that does **not** change the
output but *is* in the key means every machine has a different hash and nothing ever hits.

Two settings separate the cases:

```json
{
  "tasks": {
    "build": {
      "env": ["NEXT_PUBLIC_API_URL"],
      "passThroughEnv": ["AWS_SECRET_ACCESS_KEY"]
    }
  }
}
```

`env` is "this changes the output, hash it". `passThroughEnv` is "the task needs this, but it must not
affect the key" — the right place for credentials, which change per machine and never change the artefact.

### Running only what changed

Affected-only execution compares against a base reference and runs tasks for the changed packages and
everything downstream of them:

```bash
turbo run build test --filter='...[origin/main]'
```

Combined with caching, this is what makes a large repository feel small: a change to one leaf package
tests one leaf package, and a change to the design system tests everything that uses it — correctly, and
without anyone maintaining a list.

### Why a cache misses when it should not

| Symptom | Cause |
| ------- | ----- |
| Always a miss, everywhere | Something nondeterministic in the output — a timestamp, a build ID, a random hash |
| Always a miss in continuous integration, hits locally | An environment variable in `env` that differs per runner |
| Hit, but the output is stale | A file the task reads is not in `inputs` — configuration outside the package is the usual case |
| Hits across environments that should differ | A variable that changes the output is missing from `env` |

The third row is the dangerous one. An undeclared input means the tool believes nothing changed when
something did, and it serves a stale artefact with complete confidence.

### Publishing out of a monorepo

If packages are consumed outside the repository, versioning becomes a decision:

| Approach | Behaviour | Suits |
| -------- | --------- | ------ |
| **Fixed** | Every package moves to the same version together | A design system released as a suite |
| **Independent** | Each package versions on its own changes | Unrelated libraries in one repository |

The common tooling collects a changelog entry per pull request, then computes the version bumps and
publishes on merge. The value is that the decision about what kind of change this is gets made by the
author, at review time, rather than by whoever runs the release.

## When to Use It

| Situation | Guidance |
| --------- | -------- |
| A monorepo already, no task graph | This is the highest-value work available. Start here |
| Under about five packages | Workspaces alone may be enough; add the task runner when a full run hurts |
| Continuous integration is slow | Affected-only plus remote caching, before anything else |
| Deciding whether to have a monorepo at all | [Chapter ?? — Repository Strategies](#ch-repository-strategies) |
| Independently deployed frontends | That is a different problem — see [Chapter ?? — Micro-Frontends](#ch-micro-frontends) |

## Common Mistakes

**❌ A monorepo with one pipeline that runs everything.**
✅ You have taken the cost and left the benefit. Declare the task graph before adding the second package.

**❌ Forgetting the `^` in `dependsOn`.**
✅ `["build"]` means the same package; `["^build"]` means its dependencies. Without the caret the topology
is not enforced and builds race.

**❌ Putting credentials in `env`.**
✅ They differ per machine, so every hash differs and nothing ever hits. Use `passThroughEnv`.

**❌ Reading a file the task did not declare as an input.**
✅ The cache will not notice it changed and will serve a stale artefact. Declare shared configuration in
`inputs`.

**❌ Non-reproducible output — a build timestamp, an embedded random identifier.**
✅ Every run is a miss and the cache is decorative. Make output deterministic first.

## 🔑 Key Takeaways

- A monorepo needs a task graph; without one it is strictly worse than separate repositories.
- The package graph is derived from dependencies; the task graph is declared, and `^` makes it topological.
- A cache key hashes source, configuration, dependency outputs, the lockfile, and only the environment variables you list.
- `env` changes the key, `passThroughEnv` does not — credentials belong in the second.
- Undeclared inputs cause stale cache hits, which is the failure that reaches production.

## Interview Questions

**Q: What does a task graph buy you that workspaces alone do not?**

Workspaces make packages resolve to each other locally. They say nothing about order or repetition. The
task graph declares that a package's build depends on its dependencies' builds, which lets the runner
schedule in topological order, parallelise everything independent, and skip any task whose inputs match a
previous run. Without it, a monorepo runs everything on every change.

**Q: How is a task's cache key computed, and what breaks it?**

It hashes the package's source files, the task's configuration, the hashes of its dependencies' outputs,
the lockfile, and the environment variables you explicitly declare. It breaks in two directions.
Nondeterministic output — a timestamp or a random identifier — means never a hit. An undeclared input
means a stale hit, where the tool is confident nothing changed and is wrong.

**Q: A staging deployment came out with production configuration. How does a build cache cause that?**

The variable that selects the environment was not in the task's `env` list, so both builds hashed
identically and staging was served from production's cached artefact. Anything that changes the output
must be in the cache key; anything that does not — credentials especially — should be passed through
without affecting it.

**Q: When is a monorepo the wrong choice?**

When teams need genuinely independent release cadences, when access must be restricted per project, or
when there is no capacity to own affected-only continuous integration and a build cache. That last one is
the veto: a monorepo without that tooling has all the coupling and none of the speed.

## What to Read Next

- [Chapter ?? — Repository Strategies](#ch-repository-strategies) — the decision this chapter assumes you have made
- [Chapter ?? — Package Management](#ch-package-management) — the lockfile and the workspace protocol underneath
- [Chapter ?? — CI/CD Fundamentals](#ch-cicd-fundamentals) — where affected-only runs and remote caches plug in
