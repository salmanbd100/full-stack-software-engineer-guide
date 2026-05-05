# Git Fundamentals

## Overview

### 💡 **What is Git?**

Git is a distributed version control system. Every developer has a complete copy of the project history. You can work offline, and every clone is a backup.

**Why Git matters in DevOps:**

| Area | How Git helps |
|------|--------------|
| **CI/CD** | Commits trigger automated pipelines |
| **GitOps** | Git is the single source of truth |
| **Rollback** | Revert to any previous state instantly |
| **Collaboration** | Pull requests enable code review |

---

## Git's Four-Stage Architecture

### 💡 **How Git stores your work**

```
Working Directory  →  Staging Area  →  Local Repository  →  Remote Repository
    (edit files)       (git add)         (git commit)           (git push)
```

- **Working Directory** — your actual files, not yet tracked
- **Staging Area** — changes you have selected to commit
- **Local Repository** — committed history inside `.git/`
- **Remote Repository** — shared copy on GitHub, GitLab, etc.

> The staging area is what makes Git unique. It lets you craft precise commits by choosing exactly which changes to include.

---

## Setup

**Initial config:**

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

**Useful aliases:**

```bash
git config --global alias.st status
git config --global alias.lg "log --oneline --graph --all"
git config --global alias.undo "reset --soft HEAD~1"
```

---

## Basic Workflow

### 💡 **The daily cycle: add → commit → push**

**Staging files:**

```bash
git add file.txt          # Stage one file
git add .                 # Stage everything in current directory
git add -p                # Stage interactively (choose hunks)
git restore --staged file # Unstage a file
```

**Committing:**

```bash
git commit -m "feat: add login endpoint"
git commit --amend --no-edit   # Add forgotten file to last commit
```

⚠️ Only amend commits that have NOT been pushed.

**Viewing changes:**

```bash
git diff              # Unstaged changes
git diff --staged     # Staged changes
git log --oneline     # Compact history
git log --oneline --graph --all   # Visual branch history
```

---

## Branches

### 💡 **Branches are cheap — use them for everything**

A branch is just a lightweight pointer to a commit. Creating one takes milliseconds.

**Common commands:**

```bash
git switch -c feature-xyz        # Create and switch (modern)
git switch main                  # Switch branches
git branch -d feature-xyz        # Delete merged branch
git branch -D feature-xyz        # Force delete
git push origin --delete feature # Delete remote branch
```

### Merge vs Rebase

| Aspect | Merge | Rebase |
|--------|-------|--------|
| **History** | Preserves branch history | Creates linear history |
| **Merge commit** | Yes | No |
| **Safe for shared branches** | ✅ Yes | ❌ No |
| **Use case** | Feature → main | Clean up private branch |

```bash
git merge feature-xyz           # Merge (adds merge commit)
git merge --no-ff feature-xyz   # Force merge commit
git rebase main                 # Rebase onto main (private only!)
git rebase --abort              # Abort if needed
```

> **Golden rule:** Never rebase commits that have been pushed to a shared branch.

### Merge Conflicts

```bash
# Git marks conflicts like this:
<<<<<<< HEAD
your version
=======
incoming version
>>>>>>> feature-xyz

# Resolve: edit the file, then:
git add resolved-file.txt
git commit
# Or abort:
git merge --abort
```

---

## Remote Repositories

**Fetch vs pull:**

| Command | What it does | When to use |
|---------|-------------|-------------|
| `git fetch` | Downloads changes, does NOT merge | Review before merging |
| `git pull` | Downloads + merges automatically | When you trust changes |

```bash
git fetch origin           # Safe: review first
git log origin/main        # See what changed
git merge origin/main      # Merge when ready

git pull --rebase          # Pull + rebase (cleaner history)
```

**Push:**

```bash
git push -u origin feature-xyz   # First push (sets upstream)
git push                         # Subsequent pushes
git push --force-with-lease      # Safer force push (private branches only)
```

⚠️ Never force push to `main` or any shared branch.

---

## Undoing Changes

### 💡 **Choose the right undo tool**

| Situation | Command | Safe? |
|-----------|---------|-------|
| Discard working directory changes | `git restore file` | ✅ Yes |
| Unstage a file | `git restore --staged file` | ✅ Yes |
| Undo commits (private branch) | `git reset` | ⚠️ Rewrites history |
| Undo commits (public branch) | `git revert` | ✅ Yes |

**Git reset modes:**

| Mode | HEAD | Staging | Working Dir | Use case |
|------|------|---------|-------------|---------|
| `--soft` | Moves | Unchanged | Unchanged | Re-commit with more changes |
| `--mixed` (default) | Moves | Reset | Unchanged | Unstage, keep changes |
| `--hard` | Moves | Reset | Reset | **Discard everything — DANGER** |

```bash
git reset --soft HEAD~1    # Keep changes staged
git reset HEAD~1           # Keep changes unstaged
git reset --hard HEAD~1    # Discard all changes (permanent!)

git revert HEAD            # Create undo commit (safe for public)
```

> If you pushed, use `git revert`. If you didn't push, use `git reset`.

---

## Stashing

### 💡 **Save work temporarily to switch context**

```bash
git stash                  # Save uncommitted changes
git stash pop              # Apply latest stash and remove it
git stash list             # See all stashes
git stash apply stash@{1}  # Apply specific stash
git stash drop             # Delete latest stash
```

**Common scenario:**

```bash
# Working on feature, urgent bug comes in
git stash
git switch hotfix-branch
# ... fix bug, commit, push ...
git switch feature-branch
git stash pop
```

---

## Tags

### 💡 **Mark release points in history**

| Type | Command | Use case |
|------|---------|---------|
| Lightweight | `git tag v1.0.0` | Quick local marks |
| Annotated | `git tag -a v1.0.0 -m "msg"` | **Production releases** |

```bash
git tag -a v1.0.0 -m "Release 1.0.0"   # Create annotated tag
git push origin v1.0.0                  # Push tag
git push origin --tags                  # Push all tags
git tag -d v1.0.0                       # Delete local tag
```

Always use annotated tags for releases — they include author, date, and message.

---

## .gitignore

**What to ignore:**

| Category | Examples |
|----------|---------|
| Secrets | `.env`, `*.pem`, `credentials.json` |
| Dependencies | `node_modules/`, `vendor/` |
| Build output | `dist/`, `build/` |
| IDE files | `.vscode/`, `.idea/` |
| OS files | `.DS_Store`, `Thumbs.db` |
| Logs | `*.log`, `logs/` |

```bash
# Check if a file is ignored
git check-ignore -v file.txt
```

> Never commit secrets. If you do, assume they are compromised — rotate them immediately.

---

## Interview Q&A

**Q: What's the difference between `git fetch` and `git pull`?**

`fetch` downloads remote changes into remote-tracking branches but does not touch your working directory. `pull` is `fetch` + `merge`. Use `fetch` when you want to review changes before merging.

---

**Q: When to use `merge` vs `rebase`?**

Use `merge` for public/shared branches — it preserves history. Use `rebase` only on private branches to create a clean, linear history before merging.

---

**Q: How do you undo a commit that's already pushed?**

```bash
git revert HEAD    # Creates a new "undo" commit — safe for shared branches
```

Never use `git reset` on pushed commits. It rewrites history and breaks everyone's work.

---

**Q: What do the three `git reset` modes do?**

`--soft` moves HEAD but keeps changes staged. `--mixed` (default) unstages changes but keeps them in your files. `--hard` deletes changes permanently.

---

**Q: How do you resolve a merge conflict?**

1. Git marks conflicts with `<<<<<<<`, `=======`, `>>>>>>>`
2. Edit the file to choose what to keep
3. Run `git add <file>` then `git commit`

---

[Next: Advanced Git →](./02-advanced-git.md)

[← Back to DevOps](../README.md)
