# Advanced Git

## Overview

These tools go beyond daily Git usage. They help you recover mistakes, debug production issues, and work on multiple branches at the same time.

---

## Git Reflog — Your Safety Net

### 💡 **What is reflog?**

Reflog records every movement of `HEAD` and branch pointers. It keeps ~90 days of history — even for commits that look "lost" after a hard reset or branch delete.

```bash
git reflog                    # Show all HEAD movements
git reflog show main          # Show main branch movements
```

**Example output:**

```
abc1234 HEAD@{0}: commit: Add feature X
def5678 HEAD@{1}: reset: moving to HEAD~1
ghi9012 HEAD@{2}: commit: Bad commit
```

### Recovering lost commits

```bash
# Accidentally reset and lost commits
git reset --hard HEAD~3       # Oops!

# Recover using reflog
git reflog                    # Find the hash before the reset
git reset --hard HEAD@{1}     # Restore to that point

# Recover a deleted branch
git reflog | grep feature-xyz
git checkout -b feature-xyz abc1234
```

⚠️ Reflog is local only. It does not travel with `git clone`.

---

## Git Bisect — Binary Search for Bugs

### 💡 **Find exactly which commit broke something**

Bisect uses binary search to check commits between a known-good and known-bad state. It finds the culprit in O(log n) steps instead of checking one-by-one.

**Manual workflow:**

```bash
git bisect start
git bisect bad                  # Current version has the bug
git bisect good v1.0.0          # This version was fine

# Git checks out the middle commit
# Test the code, then:
git bisect good    # No bug here
git bisect bad     # Bug exists here

# Repeat until Git prints: "abc1234 is the first bad commit"

git bisect reset   # Return to original HEAD
```

**Automated workflow:**

```bash
# Run a test script automatically on each commit
git bisect start HEAD v1.0.0
git bisect run npm test         # Exit 0 = good, non-zero = bad

git bisect reset
```

**When to use bisect:**
- ✅ A bug appeared between two known versions
- ✅ You have a test that reliably reproduces the bug
- ✅ There are many commits between good and bad states

---

## Git Worktrees — Parallel Branches Without Stashing

### 💡 **Work on two branches at the same time**

Worktrees create a second working directory linked to the same Git repository. You don't need to stash or switch branches to handle an emergency.

**Creating a worktree:**

```bash
# You're on feature-auth. Urgent hotfix needed!
git worktree add ../project-hotfix main

# Work on the hotfix in a separate directory
cd ../project-hotfix
git checkout -b hotfix/security-patch
# ... fix, commit, push ...

# Back to your feature — nothing was interrupted
cd ~/project

# Clean up when done
git worktree remove ../project-hotfix
```

**Common commands:**

```bash
git worktree add ../dir branch-name       # Create worktree on existing branch
git worktree add -b new-branch ../dir main # Create worktree with new branch
git worktree list                          # See all active worktrees
git worktree remove ../dir                 # Remove worktree
git worktree prune                         # Clean up stale entries
```

**When to use worktrees:**
- ✅ Emergency hotfix while a feature is in progress
- ✅ Reviewing a PR without stashing current work
- ✅ Running tests on two branches at the same time

---

## Interactive Rebase

### 💡 **Clean up your commit history before merging**

Use interactive rebase on private branches to squash, reorder, or edit commits before sharing them.

```bash
git rebase -i HEAD~4    # Edit last 4 commits
```

**Available commands in the editor:**

| Command | What it does |
|---------|-------------|
| `pick` | Keep commit as-is |
| `reword` | Keep commit, edit its message |
| `squash` | Combine with the previous commit |
| `fixup` | Combine with previous, discard this message |
| `drop` | Remove the commit entirely |

**Example:**

```
pick abc123 Add login form
squash def456 WIP
fixup ghi789 fix typo
reword jkl012 Add tests
```

⚠️ Only use interactive rebase on branches that haven't been pushed — or haven't been shared with anyone.

---

## Removing Sensitive Data from History

### 💡 **If you accidentally committed a secret**

```bash
# Install git-filter-repo (modern, fast)
pip install git-filter-repo

# Remove a file from all history
git filter-repo --path secrets.txt --invert-paths

# Force push to remote after rewriting
git push --force-with-lease
```

**After removing the file:**
1. Rotate the compromised secret immediately — it was exposed
2. Add the file to `.gitignore`
3. Set up a pre-commit hook to catch secrets going forward

---

## Interview Q&A

**Q: How do you recover a deleted branch?**

```bash
git reflog                              # Find the last commit hash
git checkout -b recovered-branch <hash>
```

---

**Q: What is git bisect and when would you use it?**

Bisect performs binary search through commit history to find when a bug was introduced. Use it when you know a feature worked before, have many commits to check, and can reproduce the bug with a test.

---

**Q: What are git worktrees and why are they useful?**

Worktrees create multiple working directories from one repository. They let you work on two branches simultaneously without stashing. Perfect for emergency hotfixes when you are mid-way through a feature.

---

**Q: How do you safely remove sensitive data from Git history?**

Use `git filter-repo --path <file> --invert-paths` to rewrite history. Then force push and immediately rotate the exposed secret — assume it is compromised.

---

[← Git Fundamentals](./01-git-fundamentals.md) | [Next: Branching Strategies →](./03-branching-strategies.md)
