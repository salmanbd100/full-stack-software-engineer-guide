# Repository Strategies: Monorepo vs Polyrepo

## Overview

Repository structure is a fundamental architectural decision affecting team collaboration, build systems, deployment, and code sharing. The monorepo vs polyrepo debate has no universal answer—each approach has trade-offs.

**Repository Strategy Comparison:**

| Aspect | Monorepo | Polyrepo |
|--------|----------|----------|
| **Structure** | Single repository, multiple projects | Multiple repositories, one project each |
| **Code Sharing** | Direct imports, shared code | Published packages (npm, Maven) |
| **Versioning** | Unified versioning | Independent versioning |
| **CI/CD** | Complex, selective builds | Simple, full builds |
| **Onboarding** | Clone once, see everything | Clone multiple repos |
| **Tooling** | Requires special tools | Standard Git tooling |

## Monorepo

### 💡 **What is a Monorepo?**

A monorepo (monolithic repository) stores multiple projects, libraries, and services in a single Git repository with shared history and dependencies.

**Famous Monorepo Users:**
- Google (largest monorepo: billions of lines)
- Facebook/Meta
- Microsoft
- Uber
- Twitter
- Airbnb

**Key Characteristics:**
- Single source of truth
- Atomic commits across projects
- Shared tooling and configuration
- Simplified dependency management
- Unified CI/CD

### Monorepo Structure

```bash
# ========================================
# Typical Monorepo Structure
# ========================================

my-company-monorepo/
├── .git/                          # Single Git repository
├── packages/                      # Shared packages/libraries
│   ├── ui-components/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── utils/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── api-client/
│       ├── src/
│       ├── tests/
│       └── package.json
├── apps/                          # Applications
│   ├── web-app/
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── mobile-app/
│   │   ├── src/
│   │   ├── android/
│   │   ├── ios/
│   │   └── package.json
│   └── admin-dashboard/
│       ├── src/
│       ├── package.json
│       └── Dockerfile
├── services/                      # Microservices
│   ├── auth-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── user-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── payment-service/
│       ├── src/
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
├── tools/                         # Shared tooling
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── test.sh
│   │   └── build.sh
│   └── generators/
├── docs/                          # Documentation
│   ├── architecture/
│   ├── api/
│   └── guides/
├── .github/                       # CI/CD
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── package.json                   # Root package.json
├── tsconfig.json                  # Root TypeScript config
├── .eslintrc.js                   # Shared linting
├── jest.config.js                 # Shared test config
├── nx.json                        # Nx configuration (if using Nx)
├── lerna.json                     # Lerna configuration (if using Lerna)
└── README.md
```

### Monorepo Tooling

**Popular Monorepo Tools:**

| Tool | Best For | Language | Features |
|------|----------|----------|----------|
| **Nx** | Large projects | Any | Smart rebuilds, graph visualization |
| **Turborepo** | Fast builds | JavaScript/TypeScript | Remote caching, parallel execution |
| **Lerna** | npm packages | JavaScript | Publishing, versioning |
| **Rush** | Large teams | JavaScript/TypeScript | Policy enforcement |
| **Bazel** | Massive scale | Any | Google's tool, steep learning curve |
| **Yarn Workspaces** | Simple setups | JavaScript | Built into Yarn |
| **npm Workspaces** | Simple setups | JavaScript | Built into npm 7+ |

### Nx Monorepo Setup

```bash
# ========================================
# Nx Monorepo Setup
# ========================================

# Install Nx
npm install -g nx

# Create new Nx workspace
npx create-nx-workspace@latest my-workspace \
  --preset=ts \
  --packageManager=npm

cd my-workspace

# Generate applications
nx generate @nx/react:app web-app
nx generate @nx/node:app api-service

# Generate libraries
nx generate @nx/react:library ui-components
nx generate @nx/js:library utils

# Project structure created:
# my-workspace/
# ├── apps/
# │   ├── web-app/
# │   └── api-service/
# ├── libs/
# │   ├── ui-components/
# │   └── utils/
# └── nx.json

# ========================================
# Nx Commands
# ========================================

# Build specific project
nx build web-app

# Test specific project
nx test web-app

# Run all tests
nx run-many --target=test --all

# Build affected projects only (smart rebuilds)
nx affected:build --base=main --head=HEAD

# Run affected tests
nx affected:test --base=main --head=HEAD

# Visualize dependency graph
nx graph

# Run with caching
nx build web-app
# Second run uses cache (instant!)

# ========================================
# Nx Configuration
# ========================================

# nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "parallel": 3
      }
    }
  },
  "affected": {
    "defaultBase": "main"
  }
}

# apps/web-app/project.json
{
  "name": "web-app",
  "sourceRoot": "apps/web-app/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "outputPath": "dist/apps/web-app"
      }
    },
    "serve": {
      "executor": "@nx/webpack:dev-server",
      "options": {
        "buildTarget": "web-app:build",
        "port": 3000
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/web-app/jest.config.ts"
      }
    }
  }
}
```

### Turborepo Setup

```bash
# ========================================
# Turborepo Setup
# ========================================

# Install Turborepo
npm install -g turbo

# Create new Turborepo
npx create-turbo@latest

cd my-turborepo

# Structure:
# my-turborepo/
# ├── apps/
# │   ├── web/
# │   └── docs/
# ├── packages/
# │   ├── ui/
# │   ├── config/
# │   └── tsconfig/
# ├── package.json
# └── turbo.json

# ========================================
# Turborepo Configuration
# ========================================

# turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false
    }
  },
  "globalDependencies": [
    "package.json",
    "tsconfig.json"
  ],
  "remoteCache": {
    "enabled": true
  }
}

# ========================================
# Turborepo Commands
# ========================================

# Build all packages/apps
turbo run build

# Test all packages/apps
turbo run test

# Run with caching
turbo run build
# Second run: instant (cache hit!)

# Force rebuild (ignore cache)
turbo run build --force

# Run in parallel
turbo run build --parallel

# Filter to specific packages
turbo run build --filter=web
turbo run build --filter=@my-company/*

# Remote caching (team-wide cache)
turbo run build --remote-only
```

### Monorepo CI/CD

```yaml
# ========================================
# GitHub Actions for Monorepo
# ========================================

name: Monorepo CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Determine affected projects
  affected:
    runs-on: ubuntu-latest
    outputs:
      affected: ${{ steps.affected.outputs.projects }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Get affected projects
        id: affected
        run: |
          AFFECTED=$(nx print-affected --type=app --select=projects)
          echo "projects=$AFFECTED" >> $GITHUB_OUTPUT

  # Build and test affected projects
  build-test:
    needs: affected
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: ${{ fromJson(needs.affected.outputs.affected) }}
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build ${{ matrix.project }}
        run: nx build ${{ matrix.project }}

      - name: Test ${{ matrix.project }}
        run: nx test ${{ matrix.project }}

      - name: Lint ${{ matrix.project }}
        run: nx lint ${{ matrix.project }}

  # Deploy affected projects
  deploy:
    needs: [affected, build-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: ${{ fromJson(needs.affected.outputs.affected) }}
    steps:
      - uses: actions/checkout@v3

      - name: Deploy ${{ matrix.project }}
        run: |
          ./scripts/deploy.sh ${{ matrix.project }}
```

```yaml
# ========================================
# Turborepo CI/CD
# ========================================

name: Turborepo CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx turbo run build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test
        run: npx turbo run test

      - name: Lint
        run: npx turbo run lint
```

### Monorepo Advantages

✅ **Benefits:**

1. **Code Sharing:**
   - Direct imports between projects
   - No need to publish internal packages
   - Shared utilities and components
   - Consistent versions

2. **Atomic Changes:**
   - Single commit across multiple projects
   - Refactoring spans entire codebase
   - No version coordination needed
   - Breaking changes caught immediately

3. **Unified Tooling:**
   - Single set of configs (ESLint, TypeScript, Jest)
   - Shared CI/CD pipelines
   - Consistent code style
   - Centralized dependency management

4. **Simplified Development:**
   - Clone once, work on everything
   - See full impact of changes
   - Easier debugging across boundaries
   - Better code discoverability

5. **Better Collaboration:**
   - All code in one place
   - Cross-team visibility
   - Easier code reviews
   - Knowledge sharing

### Monorepo Challenges

❌ **Disadvantages:**

1. **Performance:**
   - Large repository size
   - Slow git operations
   - Long clone times
   - Requires smart tooling

2. **Complexity:**
   - Requires monorepo tools (Nx, Turborepo)
   - Complex CI/CD (selective builds)
   - Steep learning curve
   - Tooling configuration overhead

3. **Access Control:**
   - Harder to restrict access by project
   - Everyone sees everything
   - Git permissions are all-or-nothing
   - Sensitive code exposure

4. **Scalability:**
   - Git performance degrades with size
   - CI/CD times increase
   - Merge conflicts more likely
   - Requires infrastructure investment

5. **Third-Party Integration:**
   - Some tools expect one repo per project
   - Deploy tooling may need customization
   - Package publishing more complex

## Polyrepo

### 💡 **What is a Polyrepo?**

A polyrepo (multiple repositories) approach stores each project, service, or library in its own Git repository with independent history and versioning.

**Key Characteristics:**
- Independent versioning
- Isolated CI/CD
- Standard Git workflows
- Clear ownership boundaries
- Simple tooling

### Polyrepo Structure

```bash
# ========================================
# Polyrepo Organization
# ========================================

# Each repository is independent:

# Repository: web-app
web-app/
├── .git/
├── src/
├── tests/
├── package.json
├── Dockerfile
└── .github/
    └── workflows/
        └── ci.yml

# Repository: api-service
api-service/
├── .git/
├── src/
├── tests/
├── package.json
├── Dockerfile
└── .github/
    └── workflows/
        └── ci.yml

# Repository: ui-components (shared library)
ui-components/
├── .git/
├── src/
├── tests/
├── package.json
└── .github/
    └── workflows/
        ├── ci.yml
        └── publish.yml

# Shared code via npm packages
# web-app/package.json
{
  "dependencies": {
    "@company/ui-components": "^2.1.0",
    "@company/utils": "^1.3.0"
  }
}
```

### Package Management in Polyrepo

```bash
# ========================================
# Publishing Shared Packages
# ========================================

# ui-components repository
# package.json
{
  "name": "@company/ui-components",
  "version": "2.1.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test",
    "publish": "npm publish --access public"
  }
}

# Publish workflow
# .github/workflows/publish.yml
name: Publish

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

# ========================================
# Consuming Packages
# ========================================

# web-app repository

# Update dependency
cd web-app
npm install @company/ui-components@latest

# package.json updated
{
  "dependencies": {
    "@company/ui-components": "^2.2.0"
  }
}

# Import in code
import { Button } from '@company/ui-components';
```

### Polyrepo CI/CD

```yaml
# ========================================
# Simple CI/CD per Repository
# ========================================

# web-app/.github/workflows/ci.yml
name: Web App CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: ./deploy.sh
```

### Polyrepo Advantages

✅ **Benefits:**

1. **Simplicity:**
   - Standard Git workflows
   - No special tooling required
   - Easy to understand
   - Lower learning curve

2. **Independence:**
   - Independent versioning
   - Separate CI/CD pipelines
   - Deploy independently
   - Teams work autonomously

3. **Performance:**
   - Fast git operations
   - Quick clones
   - No tooling overhead
   - Scales naturally

4. **Access Control:**
   - Granular permissions per repo
   - Easy to restrict access
   - Sensitive code isolated
   - Clear ownership

5. **Tooling Compatibility:**
   - Works with all standard tools
   - No special configuration
   - Third-party integrations easy
   - Proven approach

### Polyrepo Challenges

❌ **Disadvantages:**

1. **Code Sharing:**
   - Must publish packages
   - Version coordination needed
   - Dependency management complex
   - Breaking changes harder to track

2. **Cross-Repository Changes:**
   - Multiple PRs required
   - Version bumps needed
   - Coordination overhead
   - Testing across repos difficult

3. **Duplication:**
   - Repeated configs (.eslintrc, tsconfig)
   - Duplicated CI/CD pipelines
   - Tooling inconsistencies
   - Copy-paste between projects

4. **Discovery:**
   - Hard to find related code
   - No unified view
   - Code scattered across repos
   - Requires documentation

5. **Onboarding:**
   - Clone multiple repositories
   - Setup each separately
   - Understand dependencies
   - More complex local development

## Decision Framework

### When to Use Monorepo

✅ **Choose Monorepo if:**

1. **Small to Medium Teams** (< 100 developers)
   - Everyone can see everything
   - Coordination is manageable
   - Shared ownership culture

2. **Tight Coupling**
   - Projects frequently change together
   - Shared components/libraries
   - Consistent tech stack

3. **Atomic Changes Important**
   - Refactoring spans multiple projects
   - Breaking changes need immediate fixes
   - Version synchronization critical

4. **Fast Iteration**
   - Rapid development cycles
   - Frequent releases
   - Quick feedback loops

5. **Strong Tooling Investment**
   - Can adopt Nx/Turborepo
   - CI/CD expertise available
   - Infrastructure for large repos

**Example Use Cases:**
- Microservices with shared libraries
- Frontend + Backend for single product
- Mobile apps with shared code
- Design system + consuming apps

### When to Use Polyrepo

✅ **Choose Polyrepo if:**

1. **Large Organizations** (100+ developers)
   - Many independent teams
   - Clear ownership boundaries
   - Need access control

2. **Loose Coupling**
   - Projects rarely change together
   - Independent release cycles
   - Different tech stacks

3. **Independent Products**
   - Separate products/services
   - Different customers
   - Isolated deployments

4. **Distributed Teams**
   - Teams in different locations
   - Different time zones
   - Autonomous operation needed

5. **Standard Workflows**
   - Want simple Git operations
   - No special tooling budget
   - Proven traditional approach

**Example Use Cases:**
- Multiple independent products
- Acquisitions/separate companies
- Open source libraries
- Consulting projects

### Hybrid Approach

**Meta-Repo:**
- Multiple monorepos
- Each team has a monorepo
- Company-wide packages separate

**Example:**
```
Company Organization:
├── frontend-monorepo/          # Frontend team
│   ├── web-app/
│   ├── mobile-app/
│   └── shared-ui/
├── backend-monorepo/           # Backend team
│   ├── api-gateway/
│   ├── auth-service/
│   └── user-service/
├── shared-libraries/           # Published packages
│   ├── utils/
│   ├── constants/
│   └── types/
└── infrastructure/             # DevOps
    ├── terraform/
    ├── kubernetes/
    └── scripts/
```

## Comparison Table

| Aspect | Monorepo | Polyrepo |
|--------|----------|----------|
| **Clone Time** | Slow (large repo) | Fast (small repos) |
| **Code Sharing** | Direct imports | npm packages |
| **Atomic Changes** | ✅ Easy | ❌ Hard (multiple PRs) |
| **CI/CD** | Complex (selective) | Simple (full build) |
| **Versioning** | Unified | Independent |
| **Tooling** | Nx, Turborepo | Standard Git |
| **Access Control** | Limited | Granular |
| **Onboarding** | Clone once | Clone many |
| **Coordination** | Easier | Harder |
| **Scalability** | Requires tooling | Natural |

## Interview Questions

**Q1: What's the main difference between monorepo and polyrepo?**
A: Monorepo stores multiple projects in one Git repository with shared history. Polyrepo has one repository per project with independent history. Monorepo enables atomic changes across projects; polyrepo provides independence and isolation.

**Q2: When would you recommend a monorepo?**
A: For teams with tight coupling between projects, frequent cross-project changes, shared libraries, and willingness to invest in tooling (Nx, Turborepo). Best for small-medium teams (< 100 devs) with shared ownership culture.

**Q3: What are the challenges of monorepos?**
A: Large repository size, slower Git operations, complex CI/CD (need selective builds), harder access control, and requiring special tooling. CI/CD must intelligently build only affected projects.

**Q4: How do you share code between projects in polyrepo?**
A: Publish shared code as npm packages (or Maven, etc.), manage versions via package.json, and use semantic versioning. Requires CI/CD to publish packages and coordination for breaking changes.

**Q5: What tools help manage monorepos?**
A: Nx (smart rebuilds, caching), Turborepo (fast builds, remote cache), Lerna (publishing), Bazel (Google's tool), Yarn/npm Workspaces (simple cases). Each offers different features for builds, caching, and task orchestration.

## Summary

**Repository Strategies:**

1. **Monorepo:**
   - ✅ Single repository for multiple projects
   - ✅ Atomic changes, direct imports
   - ✅ Unified tooling and versioning
   - ❌ Requires special tools (Nx, Turborepo)
   - ❌ Performance challenges at scale

2. **Polyrepo:**
   - ✅ One repository per project
   - ✅ Independent versioning and deployment
   - ✅ Simple Git workflows
   - ❌ Code sharing via packages
   - ❌ Coordination overhead

3. **Decision Factors:**
   - Team size and structure
   - Coupling between projects
   - Need for atomic changes
   - Access control requirements
   - Tooling investment capacity

4. **Popular Tools:**
   - **Monorepo**: Nx, Turborepo, Lerna
   - **Polyrepo**: Standard Git, package managers
   - Both support CI/CD integration

5. **Hybrid Approaches:**
   - Multiple monorepos per team
   - Shared libraries as separate repos
   - Flexible middle ground

**Key Insights:**
> - No universal best choice—depends on context
> - Monorepo requires tooling investment but enables tight integration
> - Polyrepo is simpler but requires more coordination
> - Many companies use hybrid approaches
> - Choice significantly impacts development workflow

---
[← Back: Git Platforms](./05-git-platforms.md) | [Back to DevOps →](../README.md)
