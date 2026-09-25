---
title: Git Fundamentals and Recovery
part: 8
chapter: 2
slug: git-fundamentals
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-25
tags: [devops, git, fundamentals, advanced, recovery]
in_book: true
---

# Git Fundamentals and Recovery {#ch-git-fundamentals}

> Predict what a Git command will do to your history before you run it, and get back any commit you thought you had lost.

**In this chapter:** commits as snapshots · the three trees · merge versus rebase · the ways to undo · the reflog, bisect and a leaked secret

## 💡 The Core Idea

A commit is a **snapshot of the whole project**, plus a pointer to the commit before it. It is not a
diff. Git shows you diffs because they are easier to read, but it stores complete trees of files. Chain
the snapshots by their parent pointers and you have a graph. Every Git command adds to that graph, moves
a label around it, or reads it back.

A branch is one of those labels — a file holding forty hex characters. Creating a branch is cheap
because there is nothing to copy. Deleting one throws away a name, not any work.

Git rarely deletes anything. A commit stops being visible when no label points at it any more, but it
stays in the object database until garbage collection runs — by default, not for ninety days. Every
recovery tool in this chapter is the same trick: find the hash of a commit nothing points at, and point
a label at it again.

> "I lost my work" almost always means "I lost the name of my work." The reflog remembers the names.

## How It Works

Three places hold a version of your files at any moment. Git calls them the **three trees**.

| Tree             | Also called       | What it holds                                   |
| ---------------- | ----------------- | ----------------------------------------------- |
| **Working tree** | working directory | The files you are editing, right now            |
| **Index**        | staging area      | The exact content your next commit will contain |
| **HEAD**         | current commit    | The snapshot at the tip of your current branch  |

**How a change moves through them:**

```text
Working tree  ──git add──▶  Index  ──git commit──▶  HEAD  ──git push──▶  remote
```

The index is the part most people skip, and it is what makes Git worth learning. It lets you commit a
subset of what you changed, so one commit means one logical change even when your afternoon did not.
`git add -p` walks each hunk and lets you choose what belongs in this commit. `git commit --amend`
rewrites the last commit — safe before you push, a history rewrite for everyone else afterwards.

### Merge and Rebase Do Different Things to the Graph

Both integrate one branch into another. They differ in what the graph looks like when they finish.

| Aspect                  | Merge                          | Rebase                                    |
| ----------------------- | ------------------------------ | ----------------------------------------- |
| **Commits created**     | One extra merge commit         | New copies of every commit replayed       |
| **Original commits**    | Kept exactly as they were      | Replaced — new hashes, new parents        |
| **History shape**       | Branching, shows what happened | Linear, shows a tidy story                |
| **Safe on shared work** | ✅ Yes                         | ❌ No — the old commits vanish for others |

Rebase is a rewrite: fine on a branch only you have, destructive on one a colleague has pulled.

A conflict is not an error. It means two commits changed the same lines and Git will not guess. Edit
the file, stage it to say "resolved", and commit — or run `git merge --abort` to go back.

### Remotes

A remote-tracking branch such as `origin/main` is a local label. It records where the remote was the
last time you spoke to it, and it moves on `fetch`, never on its own.

| Command                       | What it does                                              | When to reach for it             |
| ----------------------------- | --------------------------------------------------------- | -------------------------------- |
| `git fetch`                   | Updates `origin/*`, touches nothing else                  | You want to look before you leap |
| `git pull`                    | `fetch` then `merge` into your branch                     | You trust what is coming         |
| `git pull --rebase`           | `fetch` then replay your commits on top                   | You want no merge commits        |
| `git push --force-with-lease` | Overwrites the remote only if it matches your last fetch  | Rewriting your own pushed branch |

> ⚠️ Plain `--force` does not check what is on the remote, which is how colleagues lose commits.
> `--force-with-lease` refuses if someone pushed since your last fetch. Never use either on a shared branch.

## When to Use It

Four tools undo four different things. Picking the wrong one is how work disappears.

| You want to                          | Use                            | Rewrites history?  |
| ------------------------------------ | ------------------------------ | ------------------ |
| Throw away edits to a file           | `git restore file.ts`          | No                 |
| Take a file back out of the index    | `git restore --staged file.ts` | No                 |
| Undo commits nobody has pulled       | `git reset`                    | Yes                |
| Undo a commit that is already pushed | `git revert`                   | No — adds a commit |

**The three reset modes, which differ only in how far the reset reaches:**

| Mode                | Moves HEAD | Index     | Working tree | Use it to                          |
| ------------------- | ---------- | --------- | ------------ | ---------------------------------- |
| `--soft`            | Yes        | Untouched | Untouched    | Recommit the same work differently |
| `--mixed` (default) | Yes        | Reset     | Untouched    | Unstage everything, keep the code  |
| `--hard`            | Yes        | Reset     | Reset        | Discard the code as well           |

`git reset --hard` is the only mode that destroys uncommitted work. Uncommitted work was never in the
object database, so it is the one thing Git cannot get back for you.

## Recovery Tools

Each tool below either finds a hash you lost or rewrites commits you still own.

### The Reflog Is a Local Undo Log

Git records every movement of `HEAD` and of each branch label. Reset, rebase, checkout, merge and branch
deletion all leave an entry with the hash from before the move.

**Sample output, reading a bad reset:**

```text
abc1234 HEAD@{0}: reset: moving to HEAD~3
9f3e0a1 HEAD@{1}: commit: feat(billing): add proration
5c7b221 HEAD@{2}: commit: test(billing): cover mid-cycle upgrade
```

`HEAD@{1}` is where you were before the reset, so `git reset --hard HEAD@{1}` puts the three commits
back. A deleted branch works the same way.

**Recreating a deleted branch from its last commit:**

```bash
git reflog | grep feature-billing
git switch -c feature-billing 9f3e0a1
```

The reflog is per clone and never pushed. A commit that only ever existed on a machine you no longer
have is really gone.

### Interactive Rebase and Cherry-Pick

Nine "wip" commits are honest but unreadable. `git rebase -i HEAD~5` opens a list, and you edit one
word per line to turn them into the two or three commits that describe what you did.

**The todo list, edited:**

```text
pick   a1b2c3d feat(auth): add OAuth callback route
fixup  d4e5f6a wip
fixup  b7c8d9e typo
reword f0a1b2c test(auth): add callback tests
drop   c3d4e5f debug logging
```

`squash` and `fixup` both fold a commit into the one above; `fixup` throws its message away. Rebasing
rewrites every commit from the edit point onwards, so do it before you open the pull request.

`git cherry-pick <hash>` is the smaller cousin. It copies one commit onto the branch you are on, with a
new hash. Use it to put a single fix on a release branch without bringing the rest of `main` along.

### Bisect Finds the Breaking Commit in O(log n)

The feature worked in `v2.4.0` and is broken on `main`, with 300 commits between them. Bisect checks
out the midpoint, you say good or bad, and it halves the range — about nine steps instead of 300.

**The automated version, which turns a twenty-minute loop into one command:**

```bash
git bisect start HEAD v2.4.0
git bisect run pnpm vitest run src/billing   # exit 0 = good, non-zero = bad
git bisect reset                             # Back to where you started
```

Exit code 125 is the one people miss. It tells bisect to skip a commit it cannot test. Without it, a
commit that fails to compile is marked "bad" and bisect blames the wrong change.

### Getting a Secret Out of History

Deleting the file in a new commit does nothing. The blob is still reachable from the commit that added
it, and anyone can `git show` it. The history has to be rewritten.

**Removing the file from every commit:**

```bash
# git-filter-repo is the maintained tool; git filter-branch is deprecated
git filter-repo --path config/prod.env --invert-paths
git push --force --all        # Every hash downstream of the file changes
```

Then, in this order, because the order is the whole answer:

1. **Rotate the credential first.** Assume it was read. Rewriting history proves nothing about who
   cloned the repository yesterday.
2. Rewrite history and force-push every branch and tag.
3. Tell every collaborator to re-clone. Their old clone still holds the secret and will push it back.
4. Add a secret scanner to the pipeline so it cannot happen again.

> ⚠️ On a hosted platform, forks and cached pull request views can outlive the rewrite. Rotation is the
> only step that is sure to work.

## Common Mistakes

**❌ Wrong — reaching for `reset` on pushed commits:**

```bash
git reset --hard HEAD~2
git push --force              # Everyone who pulled now has commits that no longer exist upstream
```

**✅ Right — undo forwards, not backwards:**

```bash
git revert HEAD~1..HEAD       # Two new commits that reverse the two bad ones
git push                      # No force, nobody's clone breaks
```

Rewriting shared history moves the cost onto every other clone. Reverting keeps the mistake visible,
which is honest and costs nothing.

**❌ Wrong — bisecting with a flaky suite:**

```bash
git bisect run pnpm test      # "bad" sometimes means "unlucky"
```

**✅ Right — bisect one deterministic check:**

```bash
git bisect run pnpm vitest run src/billing/prorate.test.ts
```

Bisect is a binary search. One wrong answer sends it down the wrong half, and it reports a wrong commit
with total confidence.

## 🔑 Key Takeaways

- A commit is a full snapshot plus a parent pointer, and a branch is a file holding one commit hash.
- Commits become unreachable, not deleted, so recovery means finding the hash in the reflog and pointing a label at it.
- Merge keeps the commits it integrates, while rebase replaces them, which is why rebase is unsafe on anything shared.
- Use `reset` for history nobody has seen and `revert` for history that has been pushed.
- Removing a committed secret starts with rotating it; the history rewrite is the second step, not the fix.

## Interview Questions

**Q: What is the difference between `git fetch` and `git pull`?**

`fetch` updates your remote-tracking branches and stops, so nothing in your working tree changes. `pull`
is `fetch` followed by a merge, or a rebase with `--rebase`. Fetch first when you want to read
`git log origin/main` before deciding how to integrate.

**Q: You deleted a branch, or someone force-pushed over it. How do you get it back?**

Find the old tip in `git reflog` and recreate the label with `git switch -c <name> <hash>`, then push it
back if needed. The commits were never removed — only the name was. Then mention `--force-with-lease`,
which would have refused the force-push.

**Q: What do the three `git reset` modes actually change?**

All three move the branch label. `--soft` stops there, so the work stays staged. `--mixed` also clears
the index, and `--hard` also overwrites the working tree, which makes it the only destructive one.

**Q: When would you not use rebase or interactive rebase?**

On any branch someone else has pulled, and on `main` always. Rebase creates new commits with new hashes,
so anyone holding the originals gets a divergent history. If a shared branch is messy, squash it at merge
time instead.

**Q: Walk me through finding which commit introduced a regression.**

Mark a known-good tag and the broken `HEAD`, then let `git bisect run` drive one deterministic test. It
takes about log₂(n) steps, so 300 commits resolve in about nine. The check must fail for exactly this bug,
and exit 125 for commits that cannot build.

**Q: A secret was committed six months ago. What is your sequence?**

Rotate the credential first, because the repository has been cloned since and no rewrite can reach those
copies. Then rewrite history with `git filter-repo`, force-push every branch and tag, and have
collaborators re-clone. Finally, add secret scanning to the pipeline so the next one is caught before merge.

## What to Read Next

- [Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) — how these commands
  turn into a policy a team can follow
- [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions) — the pipeline where secret scanning catches a leak
  before it reaches history
