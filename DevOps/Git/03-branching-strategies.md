# Git Branching Strategies for DevOps

## Overview

Branching strategies define how teams use Git branches to manage code, releases, and deployments. The right strategy balances development velocity, code quality, and deployment safety.

**Why Branching Strategy Matters:**
- Enables parallel development without conflicts
- Defines clear release and deployment processes
- Supports different team sizes and workflows
- Integrates with CI/CD pipelines
- Determines deployment frequency and rollback strategy

**Choosing a Strategy:**

| Team Size | Release Frequency | Complexity | Strategy |
|-----------|------------------|------------|----------|
| **Small (1-5)** | Continuous | Low | GitHub Flow |
| **Medium (5-15)** | Weekly/Bi-weekly | Medium | GitHub Flow / Trunk-Based |
| **Large (15+)** | Planned releases | High | GitFlow |
| **Enterprise** | Multiple products | Very High | GitFlow + Release Branches |

## GitFlow

### 💡 **What is GitFlow?**

GitFlow is a branching model designed for projects with scheduled release cycles. It defines specific branch types and strict rules for when branches merge.

**Branch Structure:**

```
main (production)           ──●────●────────●──────●───→
                             /      \      /        \
develop (integration)    ───●──●──●─●────●──●──●──●─●─→
                            |  |     \   /   |  |
feature/* (features)        |  ●──●──●─/    |  ●──●──→
                            |              |
release/* (releases)        ●──●──●───────/
                           /
hotfix/* (urgent fixes)   ●──●─→
```

**Core Branches:**
- `main` - Production-ready code, tagged with versions
- `develop` - Integration branch for features

**Supporting Branches:**
- `feature/*` - New features
- `release/*` - Release preparation
- `hotfix/*` - Production fixes

### GitFlow Implementation

```bash
# Initial setup
git checkout -b develop main

# ========================================
# Feature Development
# ========================================

# Start new feature
git checkout -b feature/user-authentication develop

# Work on feature
git add .
git commit -m "feat: add user login"
git commit -m "feat: add password hashing"
git commit -m "test: add authentication tests"

# Finish feature (merge to develop)
git checkout develop
git merge --no-ff feature/user-authentication
git branch -d feature/user-authentication
git push origin develop

# ========================================
# Release Process
# ========================================

# Start release branch
git checkout -b release/1.2.0 develop

# Release preparation
# - Version bumps
# - Bug fixes
# - Documentation updates
# - Final testing
git commit -m "chore: bump version to 1.2.0"
git commit -m "docs: update changelog"
git commit -m "fix: minor bug in release"

# Finish release
# 1. Merge to main
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"

# 2. Merge back to develop
git checkout develop
git merge --no-ff release/1.2.0

# 3. Delete release branch
git branch -d release/1.2.0

# 4. Push everything
git push origin main develop --tags

# ========================================
# Hotfix Process
# ========================================

# Critical bug in production!
git checkout -b hotfix/1.2.1 main

# Fix the bug
git commit -m "fix: critical security vulnerability"

# Finish hotfix
# 1. Merge to main
git checkout main
git merge --no-ff hotfix/1.2.1
git tag -a v1.2.1 -m "Hotfix 1.2.1"

# 2. Merge to develop (so fix isn't lost)
git checkout develop
git merge --no-ff hotfix/1.2.1

# 3. Delete hotfix branch
git branch -d hotfix/1.2.1

# 4. Push everything
git push origin main develop --tags

# Deploy hotfix to production
```

### GitFlow with git-flow Extension

```bash
# Install git-flow
# macOS: brew install git-flow
# Linux: apt-get install git-flow

# Initialize git-flow
git flow init
# Accept defaults: main, develop, feature/, release/, hotfix/

# Feature workflow
git flow feature start user-auth
# ... work on feature ...
git flow feature finish user-auth
# Automatically merges to develop and deletes branch

# Release workflow
git flow release start 1.2.0
# ... prepare release ...
git flow release finish 1.2.0
# Merges to main & develop, creates tag, deletes branch

# Hotfix workflow
git flow hotfix start 1.2.1
# ... fix bug ...
git flow hotfix finish 1.2.1
# Merges to main & develop, creates tag
```

### GitFlow CI/CD Integration

```yaml
# GitHub Actions example for GitFlow
name: GitFlow CI/CD

on:
  push:
    branches:
      - develop
      - 'release/**'
      - main
  pull_request:
    branches:
      - develop

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: ./deploy-staging.sh

  deploy-production:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./deploy-production.sh
```

**GitFlow Pros & Cons:**

✅ **Advantages:**
- Clear separation of production and development
- Supports planned releases
- Hotfix process doesn't disrupt development
- Multiple versions in production simultaneously

❌ **Disadvantages:**
- Complex workflow for small teams
- Long-lived branches increase merge conflicts
- Slower deployment cycle
- Overhead for continuous deployment

**When to Use GitFlow:**
- ✅ Scheduled release cycles (monthly, quarterly)
- ✅ Multiple production versions maintained
- ✅ Large teams (15+ developers)
- ✅ Enterprise environments with strict processes
- ❌ Continuous deployment teams
- ❌ Small, fast-moving teams

## GitHub Flow

### 💡 **What is GitHub Flow?**

GitHub Flow is a lightweight, branch-based workflow perfect for teams that deploy frequently. Simple, predictable, and integrates seamlessly with CI/CD.

**Core Principles:**
1. `main` branch is always deployable
2. Create descriptive feature branches
3. Open pull requests early
4. Deploy after code review
5. Merge to main after deployment verification

**Branch Structure:**

```
main (always deployable)    ──●────●────●────●────●───→
                             /      \    \    \    \
feature/user-auth        ───●──●──●─/     |    |    |
                                         /     |    |
feature/dashboard       ────────●──●──●─/      |    |
                                               /    |
feature/api-v2          ──────────────●──●──●─/     |
                                                    /
hotfix/security         ───────────────────●──●──●─/
```

### GitHub Flow Implementation

```bash
# ========================================
# Feature Development
# ========================================

# Always start from updated main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-user-profile

# Make small, focused commits
git add src/profile.js
git commit -m "feat: add profile component"

git add tests/profile.test.js
git commit -m "test: add profile tests"

# Push frequently
git push -u origin feature/add-user-profile

# Open Pull Request on GitHub (even if not done)
# Title: "Add user profile feature"
# Description: Details about implementation

# Continue development
git commit -m "feat: add profile editing"
git push

# Address review comments
git commit -m "refactor: improve profile validation"
git push

# ========================================
# Merge Process
# ========================================

# After approval and CI passes:
# 1. Update from main
git checkout main
git pull
git checkout feature/add-user-profile
git rebase main      # or merge main

# 2. Final push
git push --force-with-lease

# 3. Merge via GitHub (Squash or Merge commit)

# 4. Clean up
git checkout main
git pull
git branch -d feature/add-user-profile

# ========================================
# Hotfix (Same Process)
# ========================================

git checkout main
git pull
git checkout -b hotfix/fix-login-bug

git commit -m "fix: resolve login redirect issue"
git push -u origin hotfix/fix-login-bug

# Open PR, review, merge (expedited process)
```

### GitHub Flow with GitHub Actions

```yaml
# .github/workflows/feature-branch.yml
name: Feature Branch CI

on:
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Security scan
        run: npm audit

  preview-deployment:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to preview environment
        run: |
          echo "Deploying to preview-${{ github.event.pull_request.number }}"
          ./deploy-preview.sh ${{ github.event.pull_request.number }}
```

```yaml
# .github/workflows/main-branch.yml
name: Main Branch CD

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run tests
        run: npm test

      - name: Deploy to production
        run: ./deploy-production.sh

      - name: Smoke tests
        run: ./smoke-tests.sh
```

**GitHub Flow Pros & Cons:**

✅ **Advantages:**
- Simple and easy to understand
- Fast deployment cycle
- Main always deployable
- Works great with CI/CD
- Minimal branching overhead

❌ **Disadvantages:**
- No built-in release process
- Main branch can become unstable
- Harder with scheduled releases
- Manual release tagging needed

**When to Use GitHub Flow:**
- ✅ Continuous deployment teams
- ✅ SaaS products (single production version)
- ✅ Small to medium teams (2-15 developers)
- ✅ High deployment frequency
- ✅ Strong CI/CD and automated testing
- ❌ Multiple production versions
- ❌ Scheduled release cycles

## Trunk-Based Development

### 💡 **What is Trunk-Based Development?**

Developers commit directly to a single branch (trunk/main) with very short-lived feature branches. Emphasizes small, frequent integrations with feature flags for incomplete work.

**Core Principles:**
1. Commit to trunk frequently (at least daily)
2. Short-lived feature branches (< 1 day)
3. Feature flags for incomplete features
4. Comprehensive automated testing
5. High deployment frequency

**Branch Structure:**

```
main/trunk (single branch)    ─●─●─●─●─●─●─●─●─●─●─●─●─→
                               |  |     |     |  |
short-lived branches        ──●──●   ──●   ──●──●
                              (< 1 day) (merged quickly)
```

### Trunk-Based Development Implementation

```bash
# ========================================
# Standard Workflow
# ========================================

# Start from latest trunk
git checkout main
git pull origin main

# Very short-lived branch for focused change
git checkout -b add-header-component

# Small, atomic change
git add src/Header.js
git commit -m "feat: add header component"

# Immediately push and create PR
git push -u origin add-header-component
# Create PR (should merge within hours)

# After quick review, merge to main
git checkout main
git pull
git branch -d add-header-component

# ========================================
# Direct Trunk Commits (Advanced Teams)
# ========================================

# Some teams commit directly to main
git checkout main
git pull

# Make change
git add .
git commit -m "feat: add search functionality"
git push origin main
# CI runs, auto-deploys if tests pass

# ========================================
# Feature Flags for Large Features
# ========================================

# Start feature development with flag
git checkout main
git pull

# Commit with feature disabled by default
cat > src/featureFlags.js << 'EOF'
export const features = {
  newDashboard: process.env.ENABLE_NEW_DASHBOARD === 'true'
};
EOF

git add .
git commit -m "feat: add feature flag for new dashboard"
git push origin main

# Continue development (flag still off)
git commit -m "feat: add dashboard component (behind flag)"
git push

# Enable in test environment
# ENABLE_NEW_DASHBOARD=true

# After testing, enable in production
# Update flag to true by default
```

### Feature Flags Example

```javascript
// Feature flag implementation
const features = {
  newDashboard: process.env.ENABLE_NEW_DASHBOARD === 'true',
  betaFeatures: process.env.ENABLE_BETA === 'true'
};

// Usage in code
function Dashboard() {
  if (features.newDashboard) {
    return <NewDashboard />;
  }
  return <OldDashboard />;
}

// Gradual rollout
const features = {
  newDashboard: () => {
    // 10% of users
    return Math.random() < 0.1;
  }
};
```

### Trunk-Based CI/CD

```yaml
# .github/workflows/trunk.yml
name: Trunk-Based CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  continuous-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Fast tests
        run: npm run test:unit
        timeout-minutes: 5

      - name: Linting
        run: npm run lint

      - name: Build
        run: npm run build

  continuous-deployment:
    needs: continuous-integration
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./deploy.sh

      - name: Smoke tests
        run: ./smoke-tests.sh

      - name: Rollback on failure
        if: failure()
        run: ./rollback.sh
```

**Trunk-Based Pros & Cons:**

✅ **Advantages:**
- Fastest integration cycle
- Minimal merge conflicts
- Forces small, reviewable changes
- Highest deployment frequency
- Simplest branching model

❌ **Disadvantages:**
- Requires excellent test coverage
- Needs feature flag infrastructure
- Demands team discipline
- Requires robust CI/CD
- Incomplete features in main

**When to Use Trunk-Based:**
- ✅ Mature engineering teams
- ✅ Excellent test coverage (>80%)
- ✅ Very frequent deployments (multiple per day)
- ✅ SaaS/web applications
- ✅ Feature flag infrastructure
- ❌ Junior teams
- ❌ Weak test coverage
- ❌ Mobile apps (app store approval delays)
- ❌ Embedded systems

## Release Branches

### 💡 **What are Release Branches?**

Long-lived branches for specific release versions. Common in enterprise software with multiple supported versions.

**Use Cases:**
- Multiple production versions simultaneously
- Enterprise customers on different versions
- Mobile apps with staged rollouts
- Long-term support (LTS) versions

### Release Branch Implementation

```bash
# Main development
main                    ─●─●─●─●─●─●─●─●─●─●─●─●─→

# Release branches
release/1.0             ─●─●─────────────────────→ (LTS)
release/2.0             ───────●─●─●─────────────→ (Current)
release/3.0             ─────────────●─●─●───────→ (Beta)

# ========================================
# Creating Release Branch
# ========================================

# Create from main when ready
git checkout -b release/2.0 main
git push -u origin release/2.0

# Tag initial release
git tag v2.0.0
git push origin v2.0.0

# ========================================
# Patch Release on Release Branch
# ========================================

# Bug found in release/2.0
git checkout release/2.0

# Fix directly on release branch
git commit -m "fix: critical bug in version 2.0"

# Tag patch release
git tag v2.0.1
git push origin release/2.0 --tags

# Cherry-pick to main if needed
git checkout main
git cherry-pick <commit-hash>

# ========================================
# Feature Development (Still on Main)
# ========================================

# New features go to main (future release)
git checkout main
git checkout -b feature/new-feature

# ... develop feature ...
git checkout main
git merge feature/new-feature

# ========================================
# Backporting Critical Fix
# ========================================

# Fix applied to main first
git checkout main
git commit -m "fix: security vulnerability"

# Backport to supported releases
git checkout release/2.0
git cherry-pick <commit-hash>
git tag v2.0.2
git push origin release/2.0 --tags

git checkout release/1.0
git cherry-pick <commit-hash>
git tag v1.0.15
git push origin release/1.0 --tags
```

### Release Branch Strategy

```
main (development)           ─●─●─●─●─●─●─●─●─●─●─●─●─→
                             /       \       \
release/1.0 (LTS)         ──●─●───────●───────────────→
                                     (backports)
release/2.0 (Current)     ────────●─●─●───────●───────→
                                               \
release/3.0 (Next)        ────────────────────●─●─────→
```

**Release Branch Maintenance:**

| Version | Status | Updates | Support |
|---------|--------|---------|---------|
| **1.0.x** | LTS | Security only | 2 years |
| **2.0.x** | Current | Bug fixes | 1 year |
| **3.0.x** | Next | Active dev | 6 months |

## Choosing the Right Strategy

### Decision Matrix

```
Question: How often do you deploy?
├─ Multiple times per day
│  └─→ Trunk-Based Development
│
├─ Daily / Few times per week
│  └─→ GitHub Flow
│
├─ Weekly / Bi-weekly
│  └─→ GitHub Flow or GitFlow (simplified)
│
└─ Monthly / Quarterly releases
   └─→ GitFlow

Question: How many production versions?
├─ Single version (SaaS)
│  └─→ GitHub Flow or Trunk-Based
│
└─ Multiple versions (Enterprise)
   └─→ GitFlow + Release Branches

Question: Team size?
├─ 1-5 developers
│  └─→ GitHub Flow
│
├─ 5-15 developers
│  └─→ GitHub Flow or Trunk-Based
│
└─ 15+ developers
   └─→ GitFlow or Trunk-Based (with discipline)
```

### Strategy Comparison

| Factor | GitFlow | GitHub Flow | Trunk-Based |
|--------|---------|-------------|-------------|
| **Complexity** | High | Low | Very Low |
| **Deploy Frequency** | Low | Medium-High | Very High |
| **Branch Lifetime** | Long | Short | Very Short |
| **Merge Conflicts** | High | Medium | Low |
| **Team Size** | Large | Any | Medium-Large |
| **Release Type** | Scheduled | Continuous | Continuous |
| **Learning Curve** | Steep | Gentle | Gentle |
| **CI/CD Integration** | Medium | Easy | Easiest |

## Interview Questions

**Q1: What's the difference between GitFlow and GitHub Flow?**
A: GitFlow has multiple long-lived branches (main, develop, release, hotfix) for scheduled releases. GitHub Flow has only main branch with short feature branches for continuous deployment.

**Q2: When would you choose Trunk-Based Development?**
A: For teams with excellent test coverage, multiple daily deployments, feature flag infrastructure, and strong CI/CD. Not suitable for teams without comprehensive automated testing.

**Q3: How do you handle hotfixes in GitHub Flow?**
A: Same as feature branches - create branch from main, fix, PR, review, merge. The process is expedited but follows same workflow.

**Q4: What are release branches and when to use them?**
A: Long-lived branches for specific versions. Use when supporting multiple production versions simultaneously (e.g., enterprise software with customers on different versions).

**Q5: How does branching strategy affect CI/CD?**
A: Simpler strategies (GitHub Flow, Trunk-Based) enable faster CI/CD cycles. Complex strategies (GitFlow) require more sophisticated pipelines with different rules per branch type.

## Summary

**Branching Strategies Overview:**

1. **GitFlow:**
   - ✅ Multiple branch types: main, develop, feature, release, hotfix
   - ✅ Best for scheduled releases and large teams
   - ✅ Clear separation of production and development
   - ❌ Complex workflow, slower deployment

2. **GitHub Flow:**
   - ✅ Simple: main + feature branches
   - ✅ Main always deployable
   - ✅ Perfect for continuous deployment
   - ✅ Great CI/CD integration

3. **Trunk-Based Development:**
   - ✅ Single trunk, very short branches (< 1 day)
   - ✅ Fastest integration, minimal conflicts
   - ✅ Requires feature flags and excellent tests
   - ✅ Highest deployment frequency

4. **Release Branches:**
   - ✅ Long-lived branches for versions
   - ✅ Support multiple production versions
   - ✅ Common in enterprise software
   - ❌ Complex maintenance

**Key Insights:**
> - No one-size-fits-all strategy
> - Match strategy to team size, deploy frequency, and product type
> - Simpler strategies enable faster deployment
> - Complex strategies provide more control but slow velocity
> - Feature flags enable trunk-based with incomplete features

---
[← Back: Advanced Git](./02-advanced-git.md) | [Next: Git Best Practices →](./04-best-practices.md)
