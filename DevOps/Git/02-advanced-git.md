# Advanced Git for DevOps

## Overview

Advanced Git techniques are essential for complex DevOps workflows, managing large repositories, and handling sophisticated version control scenarios. This guide covers advanced Git operations that go beyond the fundamentals.

**When You Need Advanced Git:**
- Managing complex project histories
- Working with monorepos or large codebases
- Handling emergency hotfixes and patches
- Recovering from Git mistakes
- Debugging production issues
- Managing multiple project versions simultaneously

## Git Reflog - The Safety Net

### 💡 **What is Reflog?**

Reflog (reference log) records every change to Git references (HEAD, branches). It's your safety net for recovering lost commits, even after hard resets or branch deletions.

**How It Works:**

Reflog maintains a local log of where HEAD and branch tips have pointed. Even if commits become "unreachable" in normal Git history, reflog remembers them for ~90 days.

### Reflog Commands

```bash
# View reflog
git reflog                          # Show all HEAD movements
git reflog show HEAD                # Same as above
git reflog show main                # Show main branch movements
git reflog show --all               # All references

# Reflog with details
git reflog show --date=iso          # With timestamp
git log -g                          # Reflog as log format
git log -g --abbrev-commit --pretty=oneline

# Example reflog output:
abc1234 HEAD@{0}: commit: Add feature X
def5678 HEAD@{1}: reset: moving to HEAD~1
ghi9012 HEAD@{2}: commit: Bad commit
jkl3456 HEAD@{3}: checkout: moving from dev to main
```

### Recovering Lost Commits

```bash
# Scenario: Accidentally reset and lost commits
git reset --hard HEAD~3             # Oops, lost 3 commits!

# Recover using reflog
git reflog                          # Find the commit hash before reset
# abc1234 HEAD@{0}: reset: moving to HEAD~3
# def5678 HEAD@{1}: commit: Important feature

git reset --hard def5678            # Restore to that commit
# or
git reset --hard HEAD@{1}           # Use reflog reference

# Recover deleted branch
git branch -D feature-xyz           # Accidentally deleted
git reflog show feature-xyz         # Find last commit
git checkout -b feature-xyz abc1234 # Recreate branch
```

### Reflog Best Practices

```bash
# Find commits by message
git reflog | grep "important"

# Recover from specific date
git reflog --date=iso
git reset --hard HEAD@{2.days.ago}

# Clean old reflog entries (careful!)
git reflog expire --expire=30.days.ago --all
git reflog expire --expire-unreachable=now --all

# ⚠️ Reflog is local only!
# Lost after git clone - it doesn't travel with remotes
```

## Git Bisect - Binary Search for Bugs

### 💡 **What is Bisect?**

Git bisect uses binary search to find which commit introduced a bug. It's incredibly powerful for debugging production issues when you know it worked before.

**Key Benefits:**
- ✅ Efficient: O(log n) instead of O(n) commit checking
- ✅ Automated: Can run tests automatically
- ✅ Precise: Pinpoints exact commit that broke things

### Manual Bisect Workflow

```bash
# Start bisect session
git bisect start

# Mark current commit as bad
git bisect bad                      # Current version has bug

# Mark known good commit
git bisect good v1.0.0              # Version 1.0.0 was working
# or
git bisect good abc1234             # Specific commit was good

# Git checks out middle commit
# Test the code manually

# If bug exists:
git bisect bad

# If bug doesn't exist:
git bisect good

# Git continues binary search
# Repeat until Git finds the culprit commit

# End bisect session
git bisect reset                    # Return to original HEAD
```

### Automated Bisect

```bash
# Automated bisect with test script
git bisect start
git bisect bad HEAD
git bisect good v1.0.0

# Run bisect with test command
git bisect run npm test
# or
git bisect run pytest tests/
# or custom script
git bisect run ./test-script.sh

# Git will automatically:
# 1. Checkout middle commit
# 2. Run the test command
# 3. Mark as good (exit 0) or bad (exit 1-127, except 125)
# 4. Continue until finding the bug
# 5. Show the first bad commit

# Exit code meanings:
# 0     = good commit
# 1-127 = bad commit (except 125)
# 125   = cannot test (skip)

# End session
git bisect reset
```

### Bisect Example Scenarios

```bash
# Example: Test script for bisect
cat > test-bug.sh << 'EOF'
#!/bin/bash
# Test if API endpoint works

response=$(curl -s http://localhost:3000/api/users)

if echo "$response" | grep -q "error"; then
    exit 1  # Bad commit
else
    exit 0  # Good commit
fi
EOF

chmod +x test-bug.sh
git bisect run ./test-bug.sh

# Skip commits (e.g., build failures)
git bisect skip                     # Skip current commit
git bisect skip v1.0.1..v1.0.5      # Skip range

# Visualize bisect
git bisect visualize                # Open gitk
git bisect view                     # Same as above
```

**When to Use Bisect:**
- ✅ Bug appeared between two known versions
- ✅ Have reproducible test or check
- ✅ Many commits between good and bad states
- ❌ Don't use if history is non-linear or messy

## Git Worktrees

### 💡 **What are Worktrees?**

Worktrees allow multiple working directories attached to the same repository. Work on multiple branches simultaneously without stashing or switching.

**Use Cases:**
- Emergency hotfix while working on feature
- Review pull request without stashing current work
- Run tests on different branches simultaneously
- Compare implementations across branches

### Worktree Commands

```bash
# Create new worktree
git worktree add ../project-hotfix hotfix-branch
# Creates new directory with hotfix-branch checked out

git worktree add ../project-feature-xyz feature-xyz
# Work on feature while main directory stays on current branch

# Create worktree with new branch
git worktree add -b new-feature ../project-new-feature main
# Creates new branch from main

# List all worktrees
git worktree list
# /path/to/project            abc1234 [main]
# /path/to/project-hotfix     def5678 [hotfix-branch]
# /path/to/project-feature    ghi9012 [feature-xyz]

# Remove worktree
cd ../project                       # Go back to main directory
git worktree remove ../project-hotfix
# or
git worktree prune                  # Clean up deleted worktrees

# Move worktree
git worktree move ../project-hotfix ../new-location/project-hotfix
```

### Worktree Workflow Example

```bash
# Working on feature in main directory
cd ~/project
git checkout feature-auth

# Emergency: Production bug needs hotfix!
# Create hotfix worktree
git worktree add ../project-hotfix main

# Work on hotfix in separate directory
cd ../project-hotfix
git checkout -b hotfix/security-patch
# Fix bug, commit, push
git push origin hotfix/security-patch

# Back to feature work (no stashing needed!)
cd ~/project
# Continue feature work

# After hotfix is merged
git worktree remove ../project-hotfix
```

**Worktree Best Practices:**

✅ **Do:**
- Use for temporary parallel work
- Clean up worktrees when done
- Use descriptive directory names

❌ **Don't:**
- Create too many permanent worktrees
- Forget to remove old worktrees
- Nest worktrees inside each other

## Git Submodules

### 💡 **What are Submodules?**

Submodules allow you to keep a Git repository as a subdirectory of another Git repository. Common for including shared libraries or dependencies.

**Key Characteristics:**
- Submodule points to specific commit of external repo
- Tracked by parent repository
- Must be explicitly updated
- Each submodule maintains its own Git history

### Submodule Commands

```bash
# Add submodule
git submodule add https://github.com/user/lib.git lib/
git commit -m "Add lib submodule"

# Clone repository with submodules
git clone --recursive https://github.com/user/project.git
# or
git clone https://github.com/user/project.git
git submodule init
git submodule update

# Update submodules
git submodule update --remote                    # Update to latest
git submodule update --remote --merge            # Merge changes
git submodule update --remote --rebase           # Rebase changes

# View submodule status
git submodule status
# Shows commit hash, submodule path, and branch

# Execute command in all submodules
git submodule foreach 'git pull origin main'
git submodule foreach 'git checkout main'

# Remove submodule
git submodule deinit lib/
git rm lib/
rm -rf .git/modules/lib
git commit -m "Remove lib submodule"
```

### Submodule Workflow

```bash
# Working with submodules
cd myproject

# Update specific submodule
cd lib/
git fetch
git checkout v2.0.0
cd ..
git add lib/
git commit -m "Update lib to v2.0.0"

# Pull with submodule updates
git pull
git submodule update --init --recursive

# Push with submodule check
git push --recurse-submodules=check    # Fail if submodules not pushed
git push --recurse-submodules=on-demand # Push submodules automatically
```

### Submodule Configuration

```bash
# .gitmodules file
[submodule "lib"]
    path = lib
    url = https://github.com/user/lib.git
    branch = main

# Shallow submodules (faster)
git submodule update --init --depth 1

# Change submodule URL
git submodule set-url lib https://new-url.com/lib.git
```

**Submodules vs Alternatives:**

| Approach | When to Use | Pros | Cons |
|----------|------------|------|------|
| **Submodules** | Specific version needed | Precise control | Complex workflow |
| **Subtrees** | Want to modify code | Simpler | Harder to update |
| **Package Manager** | Public libraries | Easy updates | Version conflicts |

## Git Subtrees

### 💡 **What are Subtrees?**

Subtrees merge external repositories into your project as a subdirectory. Unlike submodules, the code is part of your repository's history.

**Key Differences from Submodules:**
- Subtree code is copied into parent repo
- No extra .gitmodules complexity
- Easier for collaborators (no submodule update needed)
- Can modify subtree code easily
- Harder to push changes back upstream

### Subtree Commands

```bash
# Add subtree
git subtree add --prefix lib https://github.com/user/lib.git main --squash
# Adds lib repo content to lib/ directory

# Pull updates from subtree
git subtree pull --prefix lib https://github.com/user/lib.git main --squash

# Push changes back to subtree repo
git subtree push --prefix lib https://github.com/user/lib.git feature-branch

# Split subtree changes into separate branch
git subtree split --prefix lib -b lib-changes
```

### Subtree vs Submodule Comparison

```bash
# ✅ Subtree Advantages:
# - Simpler for collaborators (just git clone)
# - Can modify subtree code easily
# - No .gitmodules complexity
# - Everything in one repository

# ❌ Subtree Disadvantages:
# - Larger repository size
# - More complex push workflow
# - History can be confusing
# - Manual updates needed

# When to use Submodules:
# ✅ Need specific versions
# ✅ Multiple projects share code
# ✅ Don't modify external code
# ✅ Want independent versioning

# When to use Subtrees:
# ✅ Want to modify included code
# ✅ Simplify collaborator workflow
# ✅ Repository size not a concern
# ✅ Rare upstream updates
```

## Git Patches

### 💡 **What are Patches?**

Patches are text files containing commits in diff format. Useful for sharing changes without pushing to remote, or applying commits across repositories.

**Use Cases:**
- Share commits via email or file
- Apply commits to repository without remote access
- Cherry-pick across unrelated repositories
- Code review without GitHub/GitLab

### Creating Patches

```bash
# Create patch from last commit
git format-patch -1 HEAD
# Creates: 0001-commit-message.patch

# Create patches from multiple commits
git format-patch -3                          # Last 3 commits
git format-patch HEAD~3..HEAD                # Commit range
git format-patch main..feature-branch        # Branch range

# Create single patch file
git format-patch main..feature-branch --stdout > feature.patch

# Include cover letter
git format-patch --cover-letter -3
# Creates cover letter + 3 patches

# Create patch with statistics
git format-patch -1 HEAD --stat
```

### Applying Patches

```bash
# Apply patch with git am (apply mailbox)
git am 0001-feature.patch
git am *.patch                               # Apply multiple patches

# Apply patch with git apply (more basic)
git apply feature.patch
git apply --check feature.patch              # Test without applying

# Apply patch with 3-way merge
git am --3way 0001-feature.patch

# Abort failed patch application
git am --abort

# Skip current patch
git am --skip

# Continue after resolving conflicts
git am --continue
```

### Patch Workflow Example

```bash
# Developer A: Create patches
git checkout feature-branch
git format-patch main..feature-branch --stdout > feature-complete.patch

# Share feature-complete.patch via email/file

# Developer B: Apply patches
git checkout main
git am < feature-complete.patch

# Or for review and selective application
git apply --stat feature-complete.patch      # Show stats
git apply --check feature-complete.patch     # Check for conflicts
git am feature-complete.patch                # Apply
```

## Advanced Rebase Scenarios

### Interactive Rebase Deep Dive

```bash
# Rebase last 5 commits interactively
git rebase -i HEAD~5

# Interactive rebase commands:
pick    # Use commit
reword  # Use commit, edit message
edit    # Use commit, stop for amending
squash  # Combine with previous, keep message
fixup   # Combine with previous, discard message
drop    # Remove commit
exec    # Run command after commit

# Example interactive rebase:
pick abc1234 Add user authentication
reword def5678 Fix typo              # Will prompt for new message
squash ghi9012 Add tests             # Combine with previous
fixup jkl3456 Fix formatting         # Combine with previous, drop message
exec npm test                        # Run tests after this commit
drop mno7890 Debug logging           # Remove this commit

# Advanced: Autosquash
git commit --fixup abc1234           # Creates fixup commit
git commit --squash abc1234          # Creates squash commit
git rebase -i --autosquash main      # Automatically orders fixup/squash
```

### Rebase onto Different Base

```bash
# Rebase feature branch onto different branch
git rebase --onto main feature-old feature-new
# Takes commits from feature-old..feature-new and replays onto main

# Example: Move commits to different branch
# Current state:
#   A---B---C  main
#        \
#         D---E---F  feature-old
#              \
#               G---H  feature-new

git rebase --onto main feature-old feature-new

# Result:
#   A---B---C  main
#        \   \
#         \   G'---H'  feature-new
#          \
#           D---E---F  feature-old

# Remove commits from history
git rebase --onto HEAD~3 HEAD~1 HEAD
# Removes commits 1-3 from history
```

### Rebase with Exec

```bash
# Run tests after each commit during rebase
git rebase -i main --exec "npm test"

# Multiple exec commands
git rebase -i main \
  --exec "npm run lint" \
  --exec "npm test" \
  --exec "npm run build"

# Automatically stops on test failure
# Fix issue, then:
git add .
git rebase --continue
```

## Git Filter-Branch and Filter-Repo

### 💡 **What is Filter-Branch?**

Filter-branch rewrites Git history. Use for removing sensitive data, splitting repos, or bulk history changes.

**⚠️ Warning:** Rewrites history - only use on unpublished branches or with team coordination!

### Filter-Branch Commands

```bash
# Remove file from all history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/secrets.txt' \
  --prune-empty --tag-name-filter cat -- --all

# Remove directory from all history
git filter-branch --force --tree-filter \
  'rm -rf path/to/directory' \
  --prune-empty HEAD

# Change author email in all commits
git filter-branch --env-filter '
if [ "$GIT_COMMITTER_EMAIL" = "old@email.com" ]; then
    export GIT_COMMITTER_EMAIL="new@email.com"
    export GIT_AUTHOR_EMAIL="new@email.com"
fi' -- --all

# Clean up after filter-branch
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Git Filter-Repo (Modern Alternative)

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove file from history (faster than filter-branch)
git filter-repo --path path/to/secrets.txt --invert-paths

# Remove directory
git filter-repo --path sensitive-dir/ --invert-paths

# Replace text in all files
git filter-repo --replace-text replacements.txt
# replacements.txt:
# password123==>***REMOVED***
# secret-key==>***REMOVED***

# Change author
git filter-repo --mailmap mailmap.txt
# mailmap.txt:
# New Name <new@email.com> Old Name <old@email.com>

# Extract subdirectory as new repo
git filter-repo --subdirectory-filter lib/
```

**Filter-Branch vs Filter-Repo:**

| Tool | Speed | Safety | Ease of Use |
|------|-------|--------|-------------|
| **filter-branch** | Slow | Less safe | Complex |
| **filter-repo** | Fast | Safer | Easier |

> **Recommendation:** Use git-filter-repo for all history rewriting tasks. It's faster, safer, and easier to use.

## Advanced Git Configuration

### Conditional Configuration

```bash
# Different Git config based on directory
# ~/.gitconfig
[includeIf "gitdir:~/work/"]
    path = ~/.gitconfig-work
[includeIf "gitdir:~/personal/"]
    path = ~/.gitconfig-personal

# ~/.gitconfig-work
[user]
    name = John Doe
    email = john.doe@company.com

# ~/.gitconfig-personal
[user]
    name = John Doe
    email = john@personal.com
```

### Advanced Aliases

```bash
# Powerful Git aliases
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

git config --global alias.undo "reset --soft HEAD~1"

git config --global alias.amend "commit --amend --no-edit"

git config --global alias.cleanup "!git branch --merged | grep -v '\\*' | xargs -n 1 git branch -d"

git config --global alias.contributors "shortlog -sn"

git config --global alias.recent "branch --sort=-committerdate"
```

## Interview Questions

**Q1: How do you recover a deleted branch?**
```bash
git reflog
git checkout -b recovered-branch <commit-hash>
```

**Q2: Explain git bisect and when to use it.**
A: Git bisect performs binary search through commit history to find when a bug was introduced. Use when you know it worked before, have many commits between good and bad states, and can reproduce the bug.

**Q3: What's the difference between git submodules and git subtrees?**
A: Submodules are references to specific commits in external repos (separate histories). Subtrees copy external code into your repo (single history). Submodules are better for independent versioning; subtrees are simpler for collaborators.

**Q4: How do you remove sensitive data from Git history?**
```bash
# Modern way (recommended):
git filter-repo --path secrets.txt --invert-paths

# Old way:
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch secrets.txt' \
  --prune-empty --tag-name-filter cat -- --all
```

**Q5: What are Git worktrees and when would you use them?**
A: Worktrees allow multiple working directories from the same repository. Use for emergency hotfixes while working on features, reviewing PRs without stashing, or running tests on different branches simultaneously.

**Q6: Explain --onto in git rebase.**
```bash
# git rebase --onto <newbase> <oldbase> <branch>
# Replays commits from oldbase..branch onto newbase
git rebase --onto main feature-old feature-new
# Moves commits unique to feature-new onto main
```

**Q7: How does reflog help recover from mistakes?**
A: Reflog records every HEAD movement locally for ~90 days, even for "deleted" commits. Use `git reflog` to find the commit before a mistake, then `git reset --hard <commit>` to recover.

## Summary

**Advanced Git Techniques:**

1. **Git Reflog:**
   - ✅ Records all reference changes locally
   - ✅ Safety net for recovery (90 days)
   - ✅ Use `git reflog` + `git reset` to recover
   - ⚠️ Local only - doesn't travel with clones

2. **Git Bisect:**
   - ✅ Binary search for bug commits (O(log n))
   - ✅ Manual or automated with test scripts
   - ✅ Perfect for "worked before, broken now" scenarios
   - ✅ Use `git bisect run <test-script>` for automation

3. **Git Worktrees:**
   - ✅ Multiple working directories, same repo
   - ✅ No stashing needed for parallel work
   - ✅ Perfect for emergency hotfixes
   - ✅ Clean up with `git worktree remove`

4. **Submodules vs Subtrees:**
   - **Submodules**: Separate repos, precise versions, complex workflow
   - **Subtrees**: Merged code, simpler for collaborators, larger repo

5. **Git Patches:**
   - ✅ Share commits without remote access
   - ✅ Create with `git format-patch`
   - ✅ Apply with `git am`
   - ✅ Useful for email-based workflows

6. **History Rewriting:**
   - ✅ Use git-filter-repo (modern, fast, safe)
   - ⚠️ Avoid filter-branch (deprecated, slow)
   - ⚠️ Only rewrite unpublished history
   - ✅ Always backup before rewriting

**Key Insights:**
> - Reflog is your emergency recovery tool - memorize it!
> - Bisect turns hours of debugging into minutes
> - Worktrees eliminate context switching overhead
> - Filter-repo is the modern way to rewrite history
> - Advanced Git separates senior engineers from juniors

---
[← Back: Git Fundamentals](./01-git-fundamentals.md) | [Next: Branching Strategies →](./03-branching-strategies.md)
