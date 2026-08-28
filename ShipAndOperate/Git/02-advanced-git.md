---
title: Advanced Git
part: 8
chapter: 0
slug: advanced-git
level: advanced # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [devops, git, advanced, recovery]
in_book: true
---

# Advanced Git {#ch-advanced-git}

> Get back any commit you thought you had lost, and find the one that broke production in a handful of steps.

**In this chapter:** the reflog · `bisect` · worktrees · interactive rebase · getting a secret out of history

## 💡 The Core Idea

Git writes a commit object once and then leaves it alone. Labels — branches, tags, `HEAD` — move around
those objects, and a commit stops being visible when no label points at it any more. It is not deleted.
It sits in the object database until garbage collection runs, which by default is not for ninety days.

Every recovery tool in this chapter is the same trick: find the hash of a commit nothing points at any
more, and point something at it again. The tools differ only in how they help you find the hash.

> "I lost my work" almost always means "I lost the name of my work." The reflog remembers the names.

## How It Works

### The Reflog Is a Local Undo Log

Git records every movement of `HEAD` and of each branch label in a reflog. Reset, rebase, checkout,
merge, branch deletion — all of them leave an entry with the hash from before the move.

```bash
git reflog                    # Every position HEAD has held, newest first
git reflog show main          # Just the main label's movements
```

**Sample output, reading a bad reset:**

```text
abc1234 HEAD@{0}: reset: moving to HEAD~3
9f3e0a1 HEAD@{1}: commit: feat(billing): add proration
5c7b221 HEAD@{2}: commit: test(billing): cover mid-cycle upgrade
```

`HEAD@{1}` is where you were before the reset, so `git reset --hard HEAD@{1}` puts the three commits
back. A deleted branch works the same way — find its last commit in the reflog and recreate the label:

```bash
git reflog | grep feature-billing
git switch -c feature-billing 9f3e0a1
```

⚠️ The reflog is per-clone and never pushed. A commit that only ever existed on a machine you no longer
have is genuinely gone.

### Bisect Finds the Breaking Commit in O(log n)

You know the feature worked in `v2.4.0` and is broken on `main`. There are 300 commits between them.
Bisect checks out the midpoint, you say good or bad, and it halves the range — about nine steps instead
of 300.

```bash
git bisect start
git bisect bad                # HEAD is broken
git bisect good v2.4.0        # This tag was fine
# Git checks out the midpoint. Test it, then: git bisect good | git bisect bad
# Repeat until Git prints "<hash> is the first bad commit"
git bisect reset              # Back to where you started
```

The version worth knowing in an interview is the automated one, because it turns a twenty-minute manual
loop into one command:

```bash
git bisect start HEAD v2.4.0
git bisect run pnpm vitest run src/billing   # exit 0 = good, non-zero = bad
git bisect reset
```

**A check script that reports the exit codes `bisect run` expects:**

```typescript
// scripts/check-proration.ts — run by `git bisect run node --experimental-strip-types`
import { prorate } from '../src/billing/prorate.ts';

// Exit 0 marks the commit good, 1 marks it bad, 125 marks it untestable —
// 125 matters, because a commit that cannot build should be skipped, not blamed.
try {
  const result: number = prorate({ days: 15, cycle: 30, amount: 1000 });
  process.exit(result === 500 ? 0 : 1);
} catch {
  process.exit(125);
}
```

Exit code 125 is the one people miss. Without it, a commit that fails to compile is recorded as "bad"
and bisect blames the wrong change.

### Worktrees Give You Two Branches at Once

A worktree is a second working directory backed by the same `.git` object database. No stashing, no
switching, and no second clone to keep in sync.

```bash
git worktree add ../app-hotfix -b hotfix/session-leak main
cd ../app-hotfix              # Full checkout of main, your feature branch untouched
# fix, commit, push
git worktree remove ../app-hotfix
```

| Situation                                       | Stash and switch | Worktree |
| ----------------------------------------------- | ---------------- | -------- |
| Two-minute one-line fix                         | ✅ Simpler       | Overkill |
| Hotfix that needs a full install and test run   | ❌ Reinstalls twice | ✅ Keeps both `node_modules` |
| Reviewing a colleague's PR while mid-feature    | ❌ Loses your build state | ✅ Side by side |
| Running the same suite against two branches     | ❌ Impossible    | ✅ Two terminals |

### Interactive Rebase Cleans Up Before Review

Nine "wip" commits are honest but unreadable. Interactive rebase turns them into the two or three commits
that describe what you actually did.

```bash
git rebase -i HEAD~5
```

| Command  | Effect                                        |
| -------- | --------------------------------------------- |
| `pick`   | Keep the commit unchanged                     |
| `reword` | Keep the commit, edit its message             |
| `squash` | Fold into the previous commit, merge messages |
| `fixup`  | Fold into the previous commit, discard message |
| `drop`   | Remove the commit entirely                    |

```text
pick   a1b2c3d feat(auth): add OAuth callback route
fixup  d4e5f6a wip
fixup  b7c8d9e typo
reword f0a1b2c test(auth): add callback tests
drop   c3d4e5f debug logging
```

⚠️ Rebasing rewrites every commit from the edit point onwards. Do it before you open the pull request,
or after, only on a branch that is unquestionably yours.

## When to Use It

| Symptom                                      | Reach for              | Why                                          |
| -------------------------------------------- | ---------------------- | -------------------------------------------- |
| "My commits are gone after a reset"          | `git reflog`           | The old tip is still recorded locally         |
| "This worked last release, broken now"       | `git bisect run`       | Binary search beats reading 300 diffs        |
| "Urgent fix, and my branch is mid-build"     | `git worktree add`     | Two checkouts, one object database            |
| "My branch is nine wip commits"              | `git rebase -i`        | Reviewers read commits, not just the diff     |
| "A key got committed three months ago"       | `git filter-repo`      | Only a history rewrite removes the blob       |

### Getting a Secret Out of History

Deleting the file in a new commit does nothing — the blob is still reachable from the commit that added
it, and anyone can `git show` it. The history has to be rewritten.

```bash
# git-filter-repo is the maintained tool; git filter-branch is deprecated
git filter-repo --path config/prod.env --invert-paths
git push --force --all        # Every branch and tag hash downstream of the file changes
```

Then, in this order, because the order is the whole answer:

1. **Rotate the credential first.** Assume it was read. Rewriting history proves nothing about who
   cloned the repository yesterday.
2. Rewrite history and force-push all branches and tags.
3. Tell every collaborator to re-clone. Their old clone still contains the secret and will push it back.
4. Add the path to `.gitignore` and a secret scanner to the pipeline so it cannot recur.

> ⚠️ On a hosted platform, forks and cached pull request views can outlive the rewrite. Rotation is the
> only step that is guaranteed to work.

## Common Mistakes

**❌ Wrong — treating the removal as the fix:**

```bash
git rm config/prod.env
git commit -m "chore: remove leaked env file"   # The blob is still in every clone
```

**✅ Right — rotate, then rewrite:**

```bash
# 1. Rotate the key in the provider console — the only step that actually helps
# 2. Then remove the blob from every commit that ever contained it
git filter-repo --path config/prod.env --invert-paths
```

**❌ Wrong — bisecting without a reliable test:**

```bash
git bisect run pnpm test      # Suite is flaky, so "bad" sometimes means "unlucky"
```

**✅ Right — bisect one deterministic check:**

```bash
git bisect run pnpm vitest run src/billing/prorate.test.ts
```

Bisect is a binary search, so one wrong answer sends it down the wrong half and it reports a confidently
wrong commit. Narrow the check until it is deterministic before you start.

## 🔑 Key Takeaways

- Commits become unreachable, not deleted; recovery is finding the hash and pointing a label at it again.
- The reflog is local and unpushed, so it can rescue your own mistakes and nobody else's.
- `git bisect run` needs a deterministic check and should exit 125 for commits that cannot be tested.
- A worktree earns its keep when the second branch needs its own install or build, not for a one-line fix.
- Removing a committed secret starts with rotating it — the history rewrite is the second step, not the fix.

## Interview Questions

**Q: How do you recover a branch you deleted by accident?**

Find its last commit in the reflog, then recreate the label with `git switch -c <name> <hash>`. The
commit objects were never removed — deleting a branch only removed the name pointing at them, and
garbage collection leaves unreachable objects alone for about ninety days.

**Q: Walk me through finding which commit introduced a regression.**

Mark a known-good tag and the broken `HEAD`, then let `git bisect run` drive a single deterministic test
across the midpoints. It takes roughly log₂(n) steps, so 300 commits resolve in about nine. The
precondition is a check that fails for exactly this bug and nothing else.

**Q: A secret was committed six months ago. What is your sequence?**

Rotate the credential first, because the repository has been cloned since and the rewrite cannot reach
those copies. Then rewrite history with `git filter-repo`, force-push every branch and tag, have
collaborators re-clone, and add secret scanning to the pipeline so the next one is caught before merge.

**Q: When would you not use interactive rebase?**

On a branch other people are committing to, and on anything already merged. It replaces every commit
from the edit point onwards with new hashes, so collaborators end up with two copies of the same work.
If the branch is shared and the history is messy, squash it at merge time instead.

## What to Read Next

- [Chapter ?? — Branching and Review Workflow](#ch-branching-and-review-workflow) — the commit and pull
  request habits that mean you need these tools less often
- [Chapter ?? — Pipeline Security](#ch-cicd-security) — secret scanning that catches a leak before it
  reaches history
