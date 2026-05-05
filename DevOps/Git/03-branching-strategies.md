# Git Branching Strategies

## Overview

A branching strategy defines how your team uses Git branches to ship code. The right choice depends on your team size, deployment frequency, and product type.

**Quick comparison:**

| Strategy | Complexity | Deploy Frequency | Best For |
|----------|-----------|-----------------|---------|
| **GitHub Flow** | Low | Continuous | Small teams, SaaS |
| **GitFlow** | High | Scheduled | Enterprise, versioned releases |
| **Trunk-Based** | Very Low | Multiple per day | High-performing DevOps teams |

---

## GitHub Flow

### 💡 **One rule: `main` is always deployable**

The simplest strategy. Create a branch, open a PR, merge to `main`, deploy.

**Branch structure:**

```
main (always deployable)
feature/*   short-lived feature branches
```

**Workflow:**

```bash
# 1. Start from updated main
git switch main && git pull origin main

# 2. Create a short-lived feature branch
git switch -c feature/user-profile

# 3. Commit small, focused changes
git commit -m "feat: add profile component"

# 4. Push and open a PR
git push -u origin feature/user-profile

# 5. Review → merge to main → deploy

# 6. Clean up
git branch -d feature/user-profile
```

**Rules:**
- ✅ Every change goes through PR and code review
- ✅ Deploy immediately after merging to `main`
- ✅ `main` must always pass CI

**When to use:**
- ✅ Continuous deployment (daily or more often)
- ✅ Single production version (SaaS)
- ✅ Small to medium teams (2–15 developers)
- ❌ Scheduled release cycles
- ❌ Multiple supported versions

---

## GitFlow

### 💡 **Structured branches for planned releases**

GitFlow has two permanent branches and three types of supporting branches.

**Branch structure:**

```
main        Production-ready code, tagged with versions
develop     Integration branch — features merge here first

feature/*   New features (branch from develop)
release/*   Release preparation (branch from develop)
hotfix/*    Emergency production fixes (branch from main)
```

**Feature workflow:**

```bash
git switch -c feature/auth develop    # Branch from develop

# ... develop feature ...

git switch develop
git merge --no-ff feature/auth        # Merge back to develop
git branch -d feature/auth
```

**Release workflow:**

```bash
git switch -c release/1.2.0 develop   # Branch from develop
# ... version bump, final tests ...

git switch main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"

git switch develop
git merge --no-ff release/1.2.0       # Keep develop in sync

git branch -d release/1.2.0
git push origin main develop --tags
```

**Hotfix workflow:**

```bash
git switch -c hotfix/1.2.1 main       # Branch from main (not develop!)

# ... fix critical bug ...

git switch main
git merge --no-ff hotfix/1.2.1
git tag -a v1.2.1 -m "Hotfix 1.2.1"

git switch develop
git merge --no-ff hotfix/1.2.1        # Apply fix to develop too

git branch -d hotfix/1.2.1
git push origin main develop --tags
```

**When to use:**
- ✅ Scheduled releases (weekly, monthly, quarterly)
- ✅ Multiple versions in production
- ✅ Large teams (15+ developers)
- ✅ Regulated industries with approval gates
- ❌ Continuous deployment
- ❌ Small, fast-moving teams

---

## Trunk-Based Development

### 💡 **Everyone commits to one branch, frequently**

Developers commit directly to `main` (or merge very short-lived branches the same day). Incomplete features are hidden behind feature flags.

**Branch structure:**

```
main    Everyone integrates here (daily at minimum)
         Short-lived branches: < 1 day, merged immediately
```

**Workflow:**

```bash
git switch main && git pull origin main

# Very short-lived branch (a few hours max)
git switch -c add-validation
git commit -m "feat: add input validation"
git push -u origin add-validation
# Open PR → fast review → merge same day

git switch main && git pull
git branch -d add-validation
```

**Feature flags for incomplete work:**

```typescript
// Ship code to main, hide it behind a flag
const features = {
  newDashboard: process.env.ENABLE_NEW_DASHBOARD === 'true'
};

function App(): JSX.Element {
  return features.newDashboard ? <NewDashboard /> : <OldDashboard />;
}
```

**When to use:**
- ✅ Multiple deploys per day
- ✅ Strong automated test coverage (>80%)
- ✅ Feature flag infrastructure
- ✅ Mature, disciplined teams
- ❌ Weak test coverage
- ❌ Junior-heavy teams
- ❌ Mobile apps (app store delays make frequent releases impractical)

> Trunk-based development requires discipline but enables the fastest delivery cycle.

---

## Choosing a Strategy

```
How often do you deploy?
├── Multiple times per day  →  Trunk-Based Development
├── Daily / few times a week  →  GitHub Flow
└── Weekly / monthly releases  →  GitFlow

How many production versions?
├── One version (SaaS)  →  GitHub Flow or Trunk-Based
└── Multiple versions (Enterprise)  →  GitFlow

Team size?
├── 1–15 developers  →  GitHub Flow
├── 15+ developers  →  GitFlow or Trunk-Based (with discipline)
```

---

## Interview Q&A

**Q: What's the difference between GitFlow and GitHub Flow?**

GitHub Flow is simple — `main` plus short-lived feature branches for continuous deployment. GitFlow adds `develop`, `release`, and `hotfix` branches for scheduled releases. GitFlow gives more control but moves slower.

---

**Q: When would you choose Trunk-Based Development?**

When the team deploys multiple times per day, has excellent automated test coverage, and has feature flag infrastructure. Not suitable for teams without comprehensive CI or for mobile apps.

---

**Q: How do you handle hotfixes in GitHub Flow?**

Same as any feature branch — branch from `main`, fix, open a PR, expedite the review, merge. The workflow is identical, just the priority is higher.

---

**Q: How does branching strategy affect CI/CD?**

Simpler strategies (GitHub Flow, Trunk-Based) have straightforward pipelines — push to `main` triggers a deploy. GitFlow needs more complex pipelines that behave differently per branch type.

---

[← Advanced Git](./02-advanced-git.md) | [Next: Best Practices →](./04-best-practices.md)
