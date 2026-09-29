---
title: Monorepos
part: 3
chapter: 38
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
[Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) answers it. This chapter starts one step
later: you have one, and the problem is that everything now shares a pipeline.

A monorepo without a task graph runs everything on every change. Twelve packages, one commit touching a
README, and continuous integration builds and tests all twelve. That is strictly worse than separate
repositories. It is why "we tried a monorepo and it was slow" is such a common story.

The fix is a build system that can answer two questions: **what must run before what**, and **has this
exact work already been done?** The rest of this chapter is those two questions.

> ⚠️ **Moving target:** the configuration names keep changing. Turborepo 2 renamed `pipeline` to `tasks`
> and `outputMode` to `outputLogs`, dropped the `dotEnv` keys, and moved the cache directory. Nx reshapes
> its project configuration just as often. Both tools implement the same durable principle. The cache is
> content-addressed over the inputs you declared: its key is a hash of them. So a cache that misses when
> it should hit means an input is undeclared.

## How It Works

### Two graphs, not one

| Graph | Edges | Answers |
| ----- | ----- | ------- |
| **Package graph** | `packages/ui` depends on `packages/tokens` | What is affected when this changes? |
| **Task graph** | `web#build` depends on `ui#build` | What order can these run in? |

The package graph comes from `package.json` files. You declare the task graph. The two are related but
not identical: `test` may depend on the upstream `build` without depending on the upstream `test`.

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

The `^` prefix means "the same task in this package's **dependencies**". That makes the order
topological: dependencies build before the packages that use them. Without the caret it means a task in
the same package. People misread that one character more than anything else in the file.

`cache: false` and `persistent: true` on `dev` mean what they say. A watch process produces no cacheable
artefact and never exits.

### Wiring the workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Internal dependencies use the workspace protocol. It resolves to the local package and refuses to fall
back to the registry:

```json
{ "dependencies": { "@acme/ui": "workspace:*" } }
```

That refusal is the point. Without it, a typo in a package name silently installs a stranger's package
from the registry. That is one way dependency-confusion attacks work.

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

On a hit, the tool replays the recorded outputs and the logs, and the task never runs. On a miss it runs
and records. A shared **remote cache** extends this across machines, and that is the real gain. A task
built once on a colleague's laptop is a cache hit in continuous integration.

### The environment-variable trap

This is the monorepo bug that reaches production, so it gets its own section.

Say an environment variable changes a build's output but is **not** in the cache key. Then a staging
build can be served from a production build's cache. Now say a variable does **not** change the output
but *is* in the key. Then every machine has a different hash, and nothing ever hits.

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
affect the key". Credentials go there: they change per machine and never change the artefact.

### Running only what changed

Affected-only execution compares against a base reference and runs tasks for the changed packages and
everything downstream of them:

```bash
turbo run build test --filter='...[origin/main]'
```

Add caching, and a large repository feels small. A change to one leaf package tests one leaf package. A
change to the design system tests everything that uses it. It gets this right, and nobody has to
maintain a list.

### Why a cache misses when it should not

| Symptom | Cause |
| ------- | ----- |
| Always a miss, everywhere | Something nondeterministic in the output — a timestamp, a build ID, a random hash |
| Always a miss in continuous integration, hits locally | An environment variable in `env` that differs per runner |
| Hit, but the output is stale | A file the task reads is not in `inputs` — configuration outside the package is the usual case |
| Hits across environments that should differ | A variable that changes the output is missing from `env` |

The third row is the dangerous one. With an undeclared input, the tool believes nothing changed when
something did. It serves a stale artefact with complete confidence.

### Publishing out of a monorepo

If packages are consumed outside the repository, versioning becomes a decision:

| Approach | Behaviour | Suits |
| -------- | --------- | ------ |
| **Fixed** | Every package moves to the same version together | A design system released as a suite |
| **Independent** | Each package versions on its own changes | Unrelated libraries in one repository |

The common tooling collects a changelog entry per pull request. Then it computes the version bumps and
publishes on merge. The value: the author decides what kind of change this is, at review time. Whoever
runs the release does not have to guess.

## When to Use It

| Situation | Guidance |
| --------- | -------- |
| A monorepo already, no task graph | This is the highest-value work available. Start here |
| Under about five packages | Workspaces alone may be enough; add the task runner when a full run hurts |
| Continuous integration is slow | Affected-only plus remote caching, before anything else |
| Deciding whether to have a monorepo at all | [Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) |
| Independently deployed frontends | That is a different problem — see [Chapter ?? — Micro-Frontends](#ch-micro-frontends) |

## Common Mistakes

**❌ A monorepo with one pipeline that runs everything.**
✅ You have taken the cost and left the benefit. Declare the task graph before adding the second package.

**❌ Forgetting the `^` in `dependsOn`.**
✅ `["build"]` means the same package. `["^build"]` means its dependencies. Without the caret the topology
is not enforced and builds race.

**❌ Putting credentials in `env`.**
✅ They differ per machine, so every hash differs and nothing ever hits. Use `passThroughEnv`.

**❌ Reading a file the task did not declare as an input.**
✅ The cache will not notice it changed and will serve a stale artefact. Declare shared configuration in
`inputs`.

**❌ Non-reproducible output — a build timestamp, an embedded random identifier.**
✅ Every run is a miss and the cache is decorative. Make output deterministic first.

## 🔑 Key Takeaways

- A monorepo needs a task graph. Without one it is strictly worse than separate repositories.
- The package graph comes from dependencies. You declare the task graph, and `^` makes it topological.
- A cache key hashes source, configuration, dependency outputs, the lockfile, and only the environment variables you list.
- `env` changes the key, and `passThroughEnv` does not. Credentials belong in the second.
- Undeclared inputs cause stale cache hits, which is the failure that reaches production.

## Interview Questions

**Q: What does a task graph buy you that workspaces alone do not?**

Workspaces make packages resolve to each other locally. They say nothing about order or repetition. The
task graph declares that a package's build depends on its dependencies' builds. So the runner can
schedule in topological order and run everything independent in parallel. It can also skip any task
whose inputs match a previous run. Without it, a monorepo runs everything on every change.

**Q: How is a task's cache key computed, and what breaks it?**

It hashes the package's source files, the task's configuration, the hashes of its dependencies' outputs,
the lockfile, and the environment variables you explicitly declare. It breaks in two directions.
Nondeterministic output, such as a timestamp or a random identifier, means never a hit. An undeclared
input means a stale hit: the tool is sure nothing changed, and it is wrong.

**Q: A staging deployment came out with production configuration. How does a build cache cause that?**

The variable that selects the environment was not in the task's `env` list. So both builds hashed the
same, and the cache served staging with production's artefact. Anything that changes the output must be
in the cache key. Anything that does not, credentials above all, should pass through without affecting
it.

**Q: When is a monorepo the wrong choice?**

When teams need truly independent release cadences, or access must be restricted per project. Or when
nobody has time to own affected-only continuous integration and a build cache. That last one is the
veto. A monorepo without that tooling has all the coupling and none of the speed.

## What to Read Next

- [Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) — the decision this chapter assumes you have made
- [Chapter ?? — CI/CD Fundamentals](#ch-cicd-fundamentals) — where affected-only runs and remote caches plug in
