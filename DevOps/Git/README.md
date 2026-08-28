---
title: Version Control & Git - Interview Preparation
part: 8
chapter: 0
slug: devops-git-index
level: intermediate # beginner | intermediate | advanced
reading_time: 4
updated: 2026-08-04
tags: [devops, git]
in_book: true
---

# Version Control & Git - Interview Preparation

Git questions are usually a filter rather than a differentiator — but the recovery questions ("I force-pushed over main") and the branching strategy questions genuinely separate candidates.

## Table of Contents

1. [Git Fundamentals](./01-git-fundamentals.md) — the four-stage model, branching, merging, undoing, stashing
2. [Advanced Git](./02-advanced-git.md) — reflog, bisect, worktrees, interactive rebase, history rewriting
3. [Branching Strategies](./03-branching-strategies.md) — GitHub Flow, GitFlow, trunk-based development
4. [Best Practices](./04-best-practices.md) — commit messages, PR hygiene, secrets, repository maintenance
5. [Git Platforms](./05-git-platforms.md) — GitHub, GitLab, AWS CodeCommit, and platform selection
6. [Repository Strategies](./06-repository-strategies.md) — monorepo vs polyrepo, Nx and Turborepo

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 03 Branching Strategies | "Which strategy and why?" is asked constantly |
| 🔴 Critical | 01 Fundamentals | Merge vs rebase, and the four-stage model |
| 🟡 High | 02 Advanced Git | reflog and bisect are the recovery and debugging answers |
| 🟡 High | 04 Best Practices | Secrets in history is a security-adjacent question |
| 🟢 Good to know | 05, 06 | Platform comparison and repo strategy trade-offs |

## Top 10 Interview Questions

1. What is the difference between merge and rebase — and when do you use each?
2. Which branching strategy would you choose, and why?
3. Why is trunk-based development preferred for CI/CD?
4. How do you recover a commit you deleted with `git reset --hard`?
5. A secret was committed and pushed. What do you do?
6. How do you find which commit introduced a bug?
7. What is the difference between `git fetch` and `git pull`?
8. What does `git cherry-pick` do, and when is it appropriate?
9. Monorepo or polyrepo — how do you decide?
10. What is the difference between `revert` and `reset`?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Merge vs rebase** | Merge preserves history; rebase rewrites it for a linear log |
| **The rebase rule** | 🔴 Never rebase a branch others have pulled |
| **Best of both** | Rebase locally to tidy, merge to integrate |
| **Recover a lost commit** | `git reflog` — it holds every HEAD move for ~90 days |
| **Find a bad commit** | `git bisect` — binary search, `O(log n)` tests |
| **Committed secret** | 🔴 **Rotate first.** History rewriting is cosmetic — assume it leaked |
| **`revert` vs `reset`** | `revert` adds an inverse commit (safe on shared branches); `reset` moves the pointer |
| **`fetch` vs `pull`** | `pull` = `fetch` + `merge`. `fetch` alone never changes your working tree |
| **Trunk-based + CI** | A long branch is not integrated, however green its own pipeline |
| **Incomplete work on main** | Merge it behind a **feature flag**, not on a long-lived branch |
| **Two parallel branches, no stash** | `git worktree add` — separate directory, same repository |
| **Squash vs merge commits** | Squash for a clean history; keep merges when the individual commits matter |

## Branching Strategy Decision Table

| Situation | Strategy |
|-----------|----------|
| SaaS, continuous deployment | ✅ **Trunk-based** or GitHub Flow |
| Need feature flags anyway | Trunk-based |
| Versioned product, supported releases | GitFlow (or release branches only) |
| Regulated environment, scheduled releases | Release branches + trunk for development |
| Mobile app with store review | Release branches |
| Small team, deploys daily | GitHub Flow |

⚠️ **GitFlow is often the wrong answer in a DevOps interview.** It was designed for versioned software with parallel supported releases. Applied to a continuously deployed web service it adds long-lived branches that fight continuous integration. Say so if asked.

## Emergency Recovery Cheat Sheet

| Situation | Command |
|-----------|---------|
| Lost commits after `reset --hard` | `git reflog` → `git reset --hard <sha>` |
| Deleted a branch | `git reflog` → `git checkout -b <name> <sha>` |
| Committed to the wrong branch | `git reset --soft HEAD~1`, switch, recommit |
| Need to undo a pushed commit | `git revert <sha>` — never `reset` a shared branch |
| Force-pushed over someone's work | Their reflog has it; or `git fsck --lost-found` |
| Wrong commit message (not pushed) | `git commit --amend` |
| Committed a large file | `git filter-repo`, then everyone re-clones |
| Mid-rebase and confused | `git rebase --abort` |
| Which commit broke it? | `git bisect start` / `good` / `bad` |

✨ **`git reflog` is the answer to most "I've lost work" questions.** Nothing is truly gone until garbage collection, roughly 90 days later.

## Study Path

**Start here →** [Git Fundamentals](./01-git-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundations | 01: staging model, branches, undoing | 2–3 hours |
| Strategy | 03: branching models and the trade-offs | 1–2 hours |
| Recovery & debugging | 02: reflog, bisect, worktrees, rebase | 2 hours |
| Hygiene | 04: commits, PRs, secrets | 1 hour |
| Platform & scale | 05, 06: platforms, monorepo vs polyrepo | 2 hours |

## Related Topics

- [CI/CD Fundamentals](../CICD/01-cicd-fundamentals.md) — trunk-based development, build once, DORA metrics
- [GitHub Actions](../CICD/03-github-actions.md) — workflow syntax, OIDC, branch protection
- [Pipeline Security](../CICD/08-security.md) — signed commits, protected branches, script injection
- [Secrets Detection](../DevSecOps/06-secrets-detection.md) — gitleaks, push protection, rotation order
- [GitOps](../IaC/12-gitops.md) — Git as the source of truth for deployment
- [CI/CD in Agile](../Agile/04-cicd-agile.md) — deploy vs release, feature flags, small batches
- [Team Practices](../Agile/08-team-practices.md) — code review size and latency

---
[← DevOps](../README.md)
