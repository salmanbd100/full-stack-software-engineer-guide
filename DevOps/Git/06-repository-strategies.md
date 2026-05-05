# Repository Strategies: Monorepo vs Polyrepo

## Overview

How you organize repositories affects code sharing, CI/CD speed, team autonomy, and onboarding. There is no universal best choice — each approach has trade-offs.

**Quick comparison:**

| Aspect | Monorepo | Polyrepo |
|--------|----------|---------|
| **Code sharing** | Direct imports | Published packages (npm, etc.) |
| **Atomic changes** | ✅ Single commit across projects | ❌ Multiple PRs required |
| **Versioning** | Unified | Independent per project |
| **CI/CD** | Complex — needs selective builds | Simple — build each repo fully |
| **Access control** | Limited (all-or-nothing) | Granular per repo |
| **Tooling** | Requires Nx / Turborepo | Standard Git |
| **Onboarding** | Clone once, see everything | Clone multiple repos |

---

## Monorepo

### 💡 **One repository, multiple projects**

A monorepo stores all your apps, services, and shared libraries in a single Git repository. Used by Google, Meta, Microsoft, and Uber at massive scale.

**Typical structure:**

```
company-monorepo/
├── apps/
│   ├── web-app/
│   ├── mobile-app/
│   └── admin-dashboard/
├── services/
│   ├── auth-service/
│   ├── user-service/
│   └── payment-service/
├── packages/              # Shared code — imported directly
│   ├── ui-components/
│   ├── utils/
│   └── api-client/
├── tools/
│   └── scripts/
├── nx.json                # or turbo.json
└── package.json
```

### Why use a monorepo?

✅ **Benefits:**

1. **Atomic changes** — one commit can update an API and its consumers at the same time. No version coordination needed.
2. **Direct imports** — shared code is a local import, not a published package.
3. **Unified tooling** — one ESLint config, one CI pipeline, one TypeScript config.
4. **Easier refactoring** — rename a function and fix all callers in one PR.
5. **Visibility** — anyone can see the full impact of a change.

❌ **Challenges:**

1. **Slow Git operations** — large repos make `git status`, `git log`, and clones slow.
2. **Complex CI/CD** — you only want to build and test what changed, not everything.
3. **Access control** — Git permissions are all-or-nothing; you can't easily hide one service from another team.
4. **Tooling investment** — you need Nx or Turborepo to keep builds fast.

### Monorepo Tools

| Tool | Best for | Key feature |
|------|---------|------------|
| **Nx** | Large projects, any language | Smart rebuild, dependency graph |
| **Turborepo** | JavaScript / TypeScript | Remote caching, fast pipelines |
| **Lerna** | npm package publishing | Versioning and publishing |
| **Yarn/npm Workspaces** | Simple setups | Built in, no extra install |

**Nx example:**

```bash
# Only build and test what changed since main
nx affected:build --base=main --head=HEAD
nx affected:test  --base=main --head=HEAD

# Visualize the dependency graph
nx graph
```

**Turborepo example:**

```bash
# turbo.json — only rebuild if inputs changed
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test":  { "dependsOn": ["build"] },
    "lint":  { "outputs": [] }
  }
}

turbo run build   # First run: full build
turbo run build   # Second run: instant cache hit
```

---

## Polyrepo

### 💡 **One repository per project**

Each app, service, or library lives in its own Git repository with independent history, CI/CD, and versioning.

**Typical structure:**

```
# Each repo is independent
web-app/       → its own git, package.json, Dockerfile, CI pipeline
api-service/   → its own git, package.json, Dockerfile, CI pipeline
ui-components/ → published to npm as @company/ui-components
```

**Sharing code between repos:**

```bash
# ui-components is published to npm
npm publish --access public

# web-app installs it
npm install @company/ui-components@^2.1.0
```

### Why use a polyrepo?

✅ **Benefits:**

1. **Independence** — teams deploy at their own pace, on their own schedule.
2. **Simple Git operations** — small repos are fast to clone and search.
3. **Granular access** — restrict who can access sensitive services.
4. **Standard tooling** — no special tools needed.
5. **Clear ownership** — each repo has one team responsible for it.

❌ **Challenges:**

1. **Cross-repo changes** — updating a shared API requires multiple PRs and version bumps.
2. **Config duplication** — every repo has its own ESLint, CI pipeline, TypeScript config.
3. **Dependency drift** — repos end up on different versions of the same library.
4. **Harder debugging** — tracing a bug across service boundaries is more work.

---

## Decision Framework

```
How tightly coupled are your projects?
├── Frequently change together  →  Monorepo
└── Rarely change together      →  Polyrepo

How many production versions?
├── One version (SaaS)          →  Either works
└── Many versions (Enterprise)  →  Polyrepo (independent versioning)

Team structure?
├── Single team, shared codebase  →  Monorepo
└── Many autonomous teams          →  Polyrepo

Tooling investment?
├── Can adopt Nx/Turborepo  →  Monorepo
└── Want standard Git only   →  Polyrepo
```

### Good fits for monorepo

- ✅ Frontend + Backend for a single product
- ✅ Microservices with many shared libraries
- ✅ Design system + all consuming apps
- ✅ Small to medium teams (< 100 developers)

### Good fits for polyrepo

- ✅ Truly independent products with separate teams
- ✅ Acquisitions or partner codebases
- ✅ Open source libraries
- ✅ Large organizations (100+ developers) with clear team boundaries

### Hybrid approach

Many companies use both:

```
organization/
├── frontend-monorepo/    # Web + mobile + shared UI (one team)
├── backend-monorepo/     # All microservices (another team)
├── shared-libraries/     # Published to internal npm registry
└── infrastructure/       # Terraform + Kubernetes configs
```

---

## Interview Q&A

**Q: What's the difference between monorepo and polyrepo?**

Monorepo stores multiple projects in one Git repository. Polyrepo gives each project its own repo. Monorepo enables atomic changes and direct imports. Polyrepo gives teams independence and simpler Git tooling.

---

**Q: When would you recommend a monorepo?**

When projects change together often, when teams share a lot of code, and when the team can invest in tooling like Nx or Turborepo. Best for small-to-medium teams where cross-project refactoring is common.

---

**Q: What are the main challenges of a monorepo?**

Slow Git operations as the repo grows, complex CI/CD that must only build affected projects, difficult access control, and the overhead of learning and maintaining monorepo tools.

---

**Q: How do you share code in a polyrepo setup?**

Publish shared code as packages to npm (or a private registry). Consumers install it via `package.json`. Semantic versioning and a well-tested publish pipeline are essential to avoid breaking consumers.

---

**Q: What tools help manage monorepos?**

Nx (smart incremental builds, dependency graph visualization), Turborepo (fast parallel builds with remote caching), and Lerna (npm package versioning and publishing). For simpler cases, Yarn or npm Workspaces alone can work.

---

[← Git Platforms](./05-git-platforms.md) | [Back to DevOps →](../README.md)
