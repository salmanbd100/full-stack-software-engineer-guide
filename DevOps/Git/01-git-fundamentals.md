# Git Fundamentals for DevOps

## Overview

### 💡 **What is Git?**

Git is a distributed version control system that forms the backbone of modern DevOps workflows. Every developer has a complete copy of the repository history, enabling offline work and providing built-in backup.

**Why Git Matters in DevOps:**

| Area | How Git is Used | Impact |
|------|----------------|--------|
| **Version Control** | Track code AND infrastructure changes | Full audit trail |
| **CI/CD** | Commits trigger automated pipelines | Faster deployments |
| **GitOps** | Git as single source of truth | Declarative infrastructure |
| **Collaboration** | Pull requests and code review | Quality assurance |
| **Rollback** | Instant revert to previous versions | Quick incident recovery |

**Git Workflow Levels:**

| Level | Focus | Key Commands | Use Case |
|-------|-------|--------------|----------|
| **Individual** | Local work | `add`, `commit`, `status`, `diff` | Daily development |
| **Team** | Collaboration | `branch`, `merge`, `pull`, `push` | Feature development |
| **Project** | Management | `rebase`, `cherry-pick`, `tag` | Release management |
| **DevOps** | Automation | Hooks, CI/CD integration | Automated deployments |

> **Key Insight:** Git is distributed - every clone contains the complete history. This means you can work offline, and every copy serves as a backup.

---

## Git Basics

### 💡 **Git's Four-Stage Architecture**

Understanding Git's architecture is crucial for effective use.

```
Working Directory  →  Staging Area  →  Local Repository  →  Remote Repository
    (Files)           (git add)        (git commit)         (git push)
     ↓                    ↓                  ↓
  Your files         Index/Cache         .git directory
  (modified)         (prepared)         (committed history)
```

**How It Works:**

**1. Working Directory:**
- Your actual project files
- Where you make changes
- Not tracked until you stage them

**2. Staging Area (Index):**
- Intermediate holding area
- Lets you choose what to commit
- Prepare commits piece by piece

**3. Local Repository:**
- Your `.git` directory
- Contains complete history
- All commits stored here

**4. Remote Repository:**
- Shared repository (GitHub, GitLab)
- Team collaboration point
- Backup and distribution

> **Key Insight:** The staging area is Git's unique feature - it lets you craft precise commits by choosing exactly what changes to include.

---

### Configuration

**Initial Setup:**

```bash
# Global configuration (applies to all repositories)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.editor "vim"
git config --global init.defaultBranch main
```

**View Configuration:**

```bash
git config --list              # All settings
git config user.name           # Specific setting
```

**Local Repository Config (Overrides Global):**

```bash
# Different email for work projects
git config user.email "work@company.com"
```

**Useful Aliases:**

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --oneline --graph --all'
```

> **Pro Tip:** Set up aliases early - they'll save you hours of typing over your career.

---

### Repository Initialization

**Creating a New Repository:**

```bash
git init                        # Initialize in current directory
git init project-name           # Create and initialize new directory
```

**Cloning an Existing Repository:**

```bash
# HTTPS (requires password/token)
git clone https://github.com/user/repo.git

# SSH (requires SSH key setup - recommended)
git clone git@github.com:user/repo.git

# Custom directory name
git clone https://github.com/user/repo.git my-project
```

**✅ Best Practice:** Use SSH for authentication - it's more secure and convenient than HTTPS with passwords.

**Checking Repository Status:**

```bash
git status                      # Detailed status
git status -s                   # Short status
git status -sb                  # Short with branch info
```

---

## Basic Workflow

### 💡 **The Add-Commit-Push Cycle**

This is the fundamental Git workflow you'll use daily.

**Step-by-Step Process:**

```
1. Make changes to files
    ↓
2. Stage changes (git add)
    ↓
3. Commit to local repo (git commit)
    ↓
4. Push to remote (git push)
```

### Staging and Committing

**Adding Files to Staging:**

```bash
# Specific file
git add file.txt

# All files in current directory
git add .

# All changes everywhere (new, modified, deleted)
git add -A

# Only modified and deleted (not new files)
git add -u

# Pattern matching
git add *.js

# Interactive staging (choose hunks)
git add -p
```

**When to Use Each:**

| Command | Use When | What It Does |
|---------|----------|--------------|
| `git add file.txt` | Single file change | Stages one specific file |
| `git add .` | Multiple files in directory | Stages current directory |
| `git add -A` | Want everything staged | Stages all changes everywhere |
| `git add -u` | Only update tracked files | Ignores new files |
| `git add -p` | Need precise control | Interactive hunk selection |

**Unstaging Files:**

```bash
# Old way
git reset HEAD file.txt

# Modern way (Git 2.23+)
git restore --staged file.txt
```

**Committing Changes:**

```bash
# Commit with message
git commit -m "feat: add user authentication"

# Add and commit tracked files in one step
git commit -am "fix: resolve login bug"

# Amend last commit (change message or add files)
git commit --amend

# Amend without changing message
git commit --amend --no-edit
```

**⚠️ Warning:** Only amend commits that haven't been pushed! Amending rewrites history.

**Viewing Changes:**

```bash
# Changes in working directory (unstaged)
git diff

# Changes in staging area (staged)
git diff --staged

# All changes since last commit
git diff HEAD

# Differences between branches
git diff branch1 branch2

# Differences between commits
git diff commit1 commit2
```

---

### Viewing History

**Basic Log Commands:**

```bash
# Full commit history
git log

# Condensed one-line format
git log --oneline

# Visual branch history
git log --oneline --graph --all

# Show patches (actual code changes)
git log -p

# Last N commits
git log -5
```

**Filtering Log Output:**

```bash
# Time-based
git log --since="2 weeks ago"
git log --until="2024-01-01"

# Author-based
git log --author="John"

# Search commit messages
git log --grep="fix"

# Search code changes
git log -S "function_name"

# Specific file history
git log -- file.txt
```

**Examining Specific Commits:**

```bash
# Show commit details
git show <commit-hash>

# Show last commit
git show HEAD

# Show 2 commits back
git show HEAD~2

# Show file at specific commit
git show <commit>:file.txt
```

**Finding Who Changed What:**

```bash
# Line-by-line authorship
git blame file.txt

# Specific line range
git blame -L 10,20 file.txt
```

---

## Branching and Merging

### 💡 **Why Branches Matter**

Branches are Git's killer feature - they're fast, lightweight, and enable parallel development.

**How Branches Work:**

- A branch is just a moveable pointer to a commit
- Creating a branch takes milliseconds (just creates a 41-byte file)
- Switching branches updates your working directory instantly

> **Key Insight:** Branches are cheap - use them liberally! Create a branch for every feature, bug fix, or experiment.

### Branch Operations

**Listing Branches:**

```bash
git branch                      # Local branches
git branch -r                   # Remote branches
git branch -a                   # All branches (local + remote)
git branch -v                   # With last commit info
git branch --merged             # Branches merged into current
git branch --no-merged          # Branches not yet merged
```

**Creating Branches:**

```bash
# Create branch (but don't switch)
git branch feature-xyz

# Create and switch to branch (old way)
git checkout -b feature-xyz

# Create and switch to branch (modern way, Git 2.23+)
git switch -c feature-xyz
```

**Switching Branches:**

```bash
# Old way
git checkout main

# Modern way (Git 2.23+)
git switch main

# Switch to previous branch
git checkout -
```

**Deleting Branches:**

```bash
# Delete merged branch (safe)
git branch -d feature-xyz

# Force delete unmerged branch
git branch -D feature-xyz

# Delete remote branch
git push origin --delete feature-xyz
```

**Renaming Branches:**

```bash
# Rename specific branch
git branch -m old-name new-name

# Rename current branch
git branch -M new-name
```

---

### 💡 **Merge vs Rebase: The Critical Decision**

Understanding the difference between merge and rebase is essential for maintaining clean history.

**Comparison:**

| Aspect | Merge | Rebase |
|--------|-------|--------|
| **History** | Preserves complete history | Creates linear history |
| **Commits** | Adds merge commit | No merge commit |
| **Traceability** | Shows when branches merged | Looks like linear development |
| **Safety** | Safe for public branches | Dangerous for shared branches |
| **Use Case** | Feature branches → main | Clean up local branch |
| **Conflicts** | Resolve once | May resolve multiple times |

**Merge:**

```bash
# Merge feature into current branch
git merge feature-xyz

# Force merge commit (no fast-forward)
git merge --no-ff feature-xyz

# Squash all commits into one
git merge --squash feature-xyz
```

**When to Use Merge:**

- ✅ Merging feature branches into main
- ✅ Public/shared branches
- ✅ Want to preserve full history
- ✅ Want to see when feature was integrated

**Rebase:**

```bash
# Rebase current branch onto main
git rebase main

# Continue after resolving conflicts
git rebase --continue

# Skip current commit
git rebase --skip

# Abort rebase
git rebase --abort
```

**When to Use Rebase:**

- ✅ Clean up private branch before merging
- ✅ Update feature branch with main's changes
- ✅ Want linear, clean history
- ❌ **NEVER** on public/shared branches!

> **Critical Rule:** Never rebase commits that exist outside your repository. Rewriting public history breaks everyone's work.

---

### Interactive Rebase

### 💡 **Rewriting History Safely**

Interactive rebase lets you edit, squash, reorder, or drop commits before sharing them.

```bash
# Rebase last 3 commits
git rebase -i HEAD~3

# Rebase onto main with options
git rebase -i main
```

**Interactive Rebase Commands:**

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `pick` | Use commit as-is | Keep commit unchanged |
| `reword` | Use commit, edit message | Fix typo in message |
| `edit` | Use commit, stop for amending | Add forgotten file |
| `squash` | Combine with previous, keep message | Merge related commits |
| `fixup` | Combine with previous, discard message | Merge cleanup commits |
| `drop` | Remove commit entirely | Delete unwanted commit |

**Example Interactive Rebase:**

```bash
pick abc123 Add feature
reword def456 Fix bug          # Will prompt to edit message
squash ghi789 Update tests     # Will combine with previous
fixup jkl012 Fix typo          # Will combine, discard message
drop mno345 Bad commit         # Will remove
```

**⚠️ Golden Rule:** Interactive rebase is for private branches only!

---

### Handling Merge Conflicts

**What Causes Conflicts:**

Conflicts occur when the same lines are changed differently in two branches.

**Conflict Resolution Process:**

**Step 1: Git marks conflicts in files**

```
<<<<<<< HEAD
Current branch content
=======
Incoming branch content
>>>>>>> feature-xyz
```

**Step 2: Resolve conflicts manually**

Edit the file to keep what you want, remove the markers.

**Step 3: Stage resolved files**

```bash
git add resolved-file.txt
```

**Step 4: Complete merge**

```bash
git commit
```

**Aborting a Merge:**

```bash
git merge --abort
```

> **Pro Tip:** Use a merge tool for complex conflicts: `git mergetool`

---

## Remote Repositories

### 💡 **Working with Remotes**

Remote repositories enable collaboration by providing a shared location for code.

**Viewing Remotes:**

```bash
git remote                      # List remotes
git remote -v                   # List with URLs
git remote show origin          # Detailed remote info
```

**Adding/Removing Remotes:**

```bash
# Add remote
git remote add origin https://github.com/user/repo.git

# Add upstream for forked repo
git remote add upstream https://github.com/original/repo.git

# Remove remote
git remote remove origin

# Rename remote
git remote rename origin upstream
```

### Fetch vs Pull

### 💡 **The Critical Difference**

| Command | What It Does | Safety | When to Use |
|---------|-------------|--------|-------------|
| `git fetch` | Downloads changes, doesn't merge | Safe | Review changes first |
| `git pull` | Downloads + merges automatically | Can cause conflicts | When you trust changes |

**Fetch Commands:**

```bash
# Fetch from default remote
git fetch

# Fetch from specific remote
git fetch origin

# Fetch from all remotes
git fetch --all

# Fetch and prune deleted branches
git fetch --prune
```

**Pull Commands:**

```bash
# Fetch + merge
git pull

# Fetch + rebase (cleaner history)
git pull --rebase

# Pull specific branch
git pull origin main
```

**✅ Best Practice:** Use `fetch` first to review changes, then merge manually:

```bash
git fetch origin
git log origin/main        # Review changes
git merge origin/main      # Merge when ready
```

---

### Push Operations

**Basic Push:**

```bash
# Push to default remote
git push

# Push to specific branch
git push origin main

# Push and set upstream (first push)
git push -u origin feature-xyz
```

**Advanced Push:**

```bash
# Push all branches
git push --all

# Push tags
git push --tags

# Delete remote branch
git push origin --delete feature-xyz
```

**Force Push:**

```bash
# Force push (DANGEROUS!)
git push --force

# Safer force push (fails if remote updated)
git push --force-with-lease
```

**⚠️ Warning:** Never force push to shared branches like `main`! Only use on your own feature branches.

---

### Working with Forks

**Fork Workflow:**

**Step 1: Fork on GitHub (use the Fork button)**

**Step 2: Clone your fork**

```bash
git clone https://github.com/yourusername/repo.git
cd repo
```

**Step 3: Add upstream remote**

```bash
git remote add upstream https://github.com/original/repo.git
```

**Step 4: Keep your fork updated**

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

**Step 5: Create feature branch**

```bash
git checkout -b feature/new-feature
```

**Step 6: Make changes, commit, push**

```bash
git push origin feature/new-feature
```

**Step 7: Create Pull Request on GitHub**

---

## Undoing Changes

### 💡 **Reset vs Revert: Choose Wisely**

Different situations require different undo strategies.

| Situation | Use This | Why |
|-----------|----------|-----|
| Uncommitted changes | `git restore` | Safest, only affects working directory |
| Wrong files staged | `git restore --staged` | Unstage without losing changes |
| Private branch commits | `git reset` | Rewrite history cleanly |
| Public branch commits | `git revert` | Safe, doesn't rewrite history |
| Lost commits | `git reflog` | Find and recover |

### Undoing Uncommitted Changes

**Discard Working Directory Changes:**

```bash
# Modern way (Git 2.23+)
git restore file.txt            # Discard changes in file
git restore .                   # Discard all changes

# Old way
git checkout -- file.txt
```

**Remove Untracked Files:**

```bash
git clean -n                    # Dry run (preview)
git clean -f                    # Remove untracked files
git clean -fd                   # Remove files and directories
git clean -fX                   # Remove only ignored files
git clean -fx                   # Remove ignored and untracked
```

---

### 💡 **Git Reset Modes Explained**

The `reset` command has three modes that do different things.

**Comparison:**

| Mode | HEAD | Staging | Working Dir | Use Case |
|------|------|---------|-------------|----------|
| `--soft` | ✅ Moves | ❌ Keeps | ❌ Keeps | Redo commit with more changes |
| `--mixed` (default) | ✅ Moves | ✅ Resets | ❌ Keeps | Unstage everything, keep changes |
| `--hard` | ✅ Moves | ✅ Resets | ✅ Resets | **Discard everything (DANGER!)** |

**Visual Example:**

```
Before: A -- B -- C -- D (HEAD, main)

git reset --soft HEAD~2
After:  A -- B (main)
        Changes from C and D are staged

git reset --mixed HEAD~2
After:  A -- B (main)
        Changes from C and D are unstaged in working directory

git reset --hard HEAD~2
After:  A -- B (main)
        Changes from C and D are GONE FOREVER
```

**Reset Commands:**

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged (default)
git reset HEAD~1

# Undo last commit, discard all changes (DANGEROUS!)
git reset --hard HEAD~1

# Undo multiple commits
git reset --hard HEAD~3

# Reset to specific commit
git reset --hard <commit-hash>
```

**⚠️ Critical Warning:** `git reset --hard` permanently deletes uncommitted changes. There's no undo!

---

### 💡 **Git Revert: The Safe Undo**

Unlike `reset`, `revert` creates new commits that undo changes - it doesn't rewrite history.

```bash
# Revert specific commit (creates new commit)
git revert <commit-hash>

# Revert last commit
git revert HEAD

# Revert range of commits
git revert HEAD~3..HEAD
```

**When to Use Revert:**

- ✅ Undoing commits on public/shared branches
- ✅ Want to preserve history
- ✅ Need to track that changes were undone
- ✅ CI/CD has already deployed the commit

**When to Use Reset:**

- ✅ Private branches only
- ✅ Clean up messy commit history
- ✅ Changes not yet pushed

> **Key Insight:** If you've pushed, use `revert`. If you haven't pushed, use `reset`.

---

## Advanced Git

### 💡 **Stashing: Temporary Storage**

Stash saves your uncommitted changes temporarily so you can switch branches.

**Creating Stashes:**

```bash
# Stash changes
git stash

# Stash with descriptive message
git stash save "Work in progress on auth feature"

# Include untracked files
git stash -u

# Include ignored files too
git stash --all
```

**Viewing Stashes:**

```bash
# List all stashes
git stash list

# Show latest stash
git stash show

# Show specific stash
git stash show stash@{1}

# Show stash diff
git stash show -p
```

**Applying Stashes:**

```bash
# Apply latest stash (keeps in list)
git stash apply

# Apply and remove from list
git stash pop

# Apply specific stash
git stash apply stash@{2}
```

**Deleting Stashes:**

```bash
# Delete latest stash
git stash drop

# Delete specific stash
git stash drop stash@{1}

# Delete all stashes
git stash clear
```

**Creating Branch from Stash:**

```bash
# Create branch and apply stash in one step
git stash branch feature-xyz
```

**Use Cases:**

| Scenario | Solution |
|----------|----------|
| Need to switch branches | `git stash` |
| Accidentally started work on wrong branch | `git stash && git switch correct-branch && git stash pop` |
| Pull failed due to conflicts | `git stash && git pull && git stash pop` |
| Want to experiment | `git stash` before trying risky changes |

---

### Cherry-Picking

### 💡 **Selectively Apply Commits**

Cherry-pick applies specific commits from one branch to another.

```bash
# Apply single commit
git cherry-pick <commit-hash>

# Apply multiple commits
git cherry-pick abc123 def456

# Apply commit range
git cherry-pick abc123..def456

# Cherry-pick without committing (stage only)
git cherry-pick -n <commit-hash>
```

**Handling Conflicts:**

```bash
# Continue after resolving conflicts
git cherry-pick --continue

# Abort cherry-pick
git cherry-pick --abort
```

**When to Use Cherry-Pick:**

- ✅ Apply hotfix from main to release branch
- ✅ Pull single feature from experimental branch
- ✅ Backport bug fixes to older versions
- ❌ Don't use for regular merging (use `merge` instead)

---

### Tagging

### 💡 **Marking Release Points**

Tags mark specific points in history as important (usually releases).

**Types of Tags:**

| Type | Storage | Contains | Use Case |
|------|---------|----------|----------|
| **Lightweight** | Just a pointer | Only commit reference | Quick temporary marks |
| **Annotated** | Git object | Author, date, message, GPG signature | Production releases |

**Creating Tags:**

```bash
# Lightweight tag
git tag v1.0.0

# Annotated tag (recommended for releases)
git tag -a v1.0.0 -m "Version 1.0.0 - Initial release"

# Tag specific commit
git tag -a v1.0.0 <commit-hash>
```

**Listing Tags:**

```bash
# All tags
git tag

# Pattern matching
git tag -l "v1.*"

# Show tag details
git show v1.0.0
```

**Pushing Tags:**

```bash
# Push single tag
git push origin v1.0.0

# Push all tags
git push origin --tags
```

**Deleting Tags:**

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin --delete v1.0.0
```

**Checking Out Tags:**

```bash
# View code at tag (detached HEAD)
git checkout v1.0.0

# Create branch from tag
git checkout -b release-v1.0.0 v1.0.0
```

**✅ Best Practice:** Use semantic versioning (v1.2.3) and annotated tags for releases.

---

## Git in DevOps

### 💡 **.gitignore: What NOT to Track**

Not everything should be version controlled.

**Common Patterns:**

```bash
# .gitignore patterns
*.log                   # Ignore all .log files
/build/                 # Ignore build directory
node_modules/           # Ignore dependencies
*.env                   # Ignore environment files
.DS_Store               # Ignore Mac files
**/*.pyc                # Ignore Python compiled files

# Negation (explicitly track)
!important.log

# Track empty directory
logs/.gitkeep
```

**Useful Commands:**

```bash
# Set global gitignore
git config --global core.excludesfile ~/.gitignore_global

# Check if file is ignored
git check-ignore -v file.txt

# Check why file is ignored
git check-ignore -v path/to/file
```

**DevOps .gitignore Template:**

```bash
cat > .gitignore << 'EOF'
# Terraform
*.tfstate
*.tfstate.backup
.terraform/
*.tfvars

# Kubernetes
*.kubeconfig

# Docker
.dockerignore

# Secrets
*.pem
*.key
secrets.yaml
.env
credentials.json

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Build
build/
dist/
*.zip
*.tar.gz
EOF
```

**What to Ignore:**

| Category | Examples | Why |
|----------|----------|-----|
| **Build artifacts** | `dist/`, `build/`, `*.o` | Generated from source |
| **Dependencies** | `node_modules/`, `vendor/` | Downloaded via package manager |
| **Secrets** | `.env`, `*.pem`, `credentials.json` | Security risk |
| **IDE files** | `.vscode/`, `.idea/` | Personal preference |
| **OS files** | `.DS_Store`, `Thumbs.db` | System-specific |
| **Logs** | `*.log`, `logs/` | Generated at runtime |

> **Critical:** Never commit secrets! If you do, assume they're compromised and rotate them immediately.

---

### 💡 **Git Hooks: Automation Power**

Hooks are scripts that run automatically on Git events.

**Common Hooks:**

| Hook | When It Runs | Use Case |
|------|-------------|----------|
| `pre-commit` | Before commit | Run linters, tests |
| `commit-msg` | After commit message entered | Enforce commit conventions |
| `pre-push` | Before push | Run full test suite |
| `post-checkout` | After checking out branch | Update dependencies |
| `post-merge` | After successful merge | Update environment |

**Example: Pre-Commit Linting**

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linter before commit

echo "Running pre-commit checks..."

# Run tests
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Commit aborted."
    exit 1
fi

# Run linter
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linter failed. Commit aborted."
    exit 1
fi

echo "✅ Pre-commit checks passed!"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

**Example: Conventional Commit Enforcement**

```bash
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Enforce conventional commit format

commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{10,}"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
    echo "❌ Invalid commit message format"
    echo "Format: <type>(scope): <description>"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, test, chore"
    echo "Example: feat(api): add user authentication"
    exit 1
fi
EOF

chmod +x .git/hooks/commit-msg
```

**✅ Best Practice:** Use tools like [Husky](https://typicode.github.io/husky/) to share hooks with your team via Git.

---

### 💡 **Git for Infrastructure as Code**

Git is essential for managing infrastructure - GitOps treats Git as the single source of truth.

**Terraform with Git:**

```bash
project/
├── .gitignore          # Ignore state files!
├── README.md
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars    # Should be in .gitignore
└── environments/
    ├── dev/
    ├── staging/
    └── production/
```

**Kubernetes Manifests with Git:**

```bash
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    ├── staging/
    └── production/
```

**GitOps Workflow:**

```bash
# 1. Make infrastructure change
git add terraform/main.tf
git commit -m "feat(infra): scale deployment to 5 replicas"

# 2. Push to Git
git push origin main

# 3. ArgoCD/FluxCD detects change and applies automatically
# No manual kubectl apply needed!
```

**Benefits of GitOps:**

- ✅ Infrastructure changes are code-reviewed
- ✅ Full audit trail of who changed what
- ✅ Easy rollback with `git revert`
- ✅ Declarative - Git is source of truth
- ✅ Automated deployment via CI/CD

> **Key Insight:** GitOps means your Git repository defines your infrastructure. Push to Git, infrastructure updates automatically.

---

## Branching Strategies

### 💡 **Choosing the Right Strategy**

Different teams need different branching models.

**Comparison:**

| Strategy | Complexity | Release Frequency | Team Size | Best For |
|----------|-----------|------------------|-----------|----------|
| **GitFlow** | High | Scheduled releases | Large | Enterprise, regulated industries |
| **GitHub Flow** | Low | Continuous | Small-Medium | Continuous deployment |
| **Trunk-Based** | Very Low | Continuous | Any | High-performing teams, DevOps |

---

### GitFlow

**Branch Structure:**

```
main            # Production code
develop         # Integration branch
feature/*       # New features
release/*       # Release preparation
hotfix/*        # Production fixes
```

**Feature Workflow:**

```bash
# Start feature
git checkout develop
git checkout -b feature/user-auth

# ... work on feature ...
git push origin feature/user-auth

# Create PR to develop
# After merge, delete feature branch
```

**Release Workflow:**

```bash
# Create release branch
git checkout develop
git checkout -b release/v1.2.0

# Final testing, version bumps, bug fixes

# Merge to main
git checkout main
git merge release/v1.2.0
git tag v1.2.0

# Merge back to develop
git checkout develop
git merge release/v1.2.0

# Delete release branch
git branch -d release/v1.2.0
```

**Hotfix Workflow:**

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/security-patch

# Fix critical issue

# Merge to main
git checkout main
git merge hotfix/security-patch
git tag v1.2.1

# Merge to develop
git checkout develop
git merge hotfix/security-patch
```

**When to Use GitFlow:**

- ✅ Scheduled releases (not continuous)
- ✅ Multiple versions in production
- ✅ Need long-lived release branches
- ✅ Regulated industries requiring approval gates

---

### GitHub Flow

**Branch Structure:**

```
main            # Always deployable
feature/*       # Feature branches
```

**Simple Workflow:**

```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes, commit frequently
git commit -m "feat: add feature"

# 4. Push to remote
git push origin feature/new-feature

# 5. Create Pull Request on GitHub

# 6. Review, discuss, make changes

# 7. Merge to main (via PR)

# 8. Deploy main to production

# 9. Delete feature branch
```

**When to Use GitHub Flow:**

- ✅ Continuous deployment
- ✅ Single production version
- ✅ Small to medium teams
- ✅ Fast iteration needed

**Key Rules:**

- Main branch is **always deployable**
- Every change goes through PR and code review
- Deploy immediately after merging to main

---

### Trunk-Based Development

**Philosophy:**

All developers work on a single branch (trunk/main) with short-lived feature branches.

**Branch Structure:**

```
main            # Everyone commits here (directly or via short PR)
```

**Workflow:**

```bash
# Option 1: Direct commits to main (advanced teams)
git checkout main
git pull origin main
# ... make small change ...
git commit -m "feat: add validation"
git push origin main

# Option 2: Very short-lived feature branches (< 1 day)
git checkout -b quick-feature
# ... quick changes ...
git push origin quick-feature
# Create PR, merge same day
```

**Feature Flags:**

```javascript
// Ship incomplete features behind flags
if (featureFlags.newUI) {
  return <NewUI />
} else {
  return <OldUI />
}
```

**When to Use Trunk-Based:**

- ✅ High-performing DevOps teams
- ✅ Continuous integration is critical
- ✅ Want fastest feedback loop
- ✅ Can deploy multiple times per day

**Requirements:**

- Strong automated testing
- Feature flags for incomplete work
- Fast code review process
- Small, atomic commits

> **Key Insight:** Trunk-based development requires discipline but enables the fastest delivery.

---

## Git Best Practices for DevOps

### 💡 **Write Better Commit Messages**

Good commit messages are documentation for your project's history.

**Conventional Commits Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(api): add user authentication` |
| `fix` | Bug fix | `fix(auth): resolve token expiration` |
| `docs` | Documentation | `docs(readme): update installation steps` |
| `style` | Formatting (no code change) | `style: fix indentation` |
| `refactor` | Code restructuring | `refactor(api): simplify error handling` |
| `test` | Adding tests | `test(api): add user endpoint tests` |
| `chore` | Maintenance | `chore(deps): upgrade react to v18` |
| `perf` | Performance improvement | `perf(api): add database indexing` |
| `ci` | CI/CD changes | `ci: add docker build step` |

**Good vs Bad Examples:**

❌ **Bad:**
```bash
git commit -m "fixes"
git commit -m "update stuff"
git commit -m "changes"
git commit -m "Added feature, fixed bugs, updated docs"
```

✅ **Good:**
```bash
git commit -m "feat(api): add user authentication endpoint"
git commit -m "fix(auth): resolve token expiration issue"
git commit -m "docs(readme): add environment setup instructions"
git commit -m "test(api): add comprehensive user endpoint tests"
```

**Atomic Commits:**

✅ **One logical change per commit:**
```bash
git commit -m "feat(api): add user endpoint"
git commit -m "test(api): add user endpoint tests"
git commit -m "docs(api): document user endpoint"
```

❌ **Multiple unrelated changes:**
```bash
git commit -m "Added user endpoint, tests, updated docs, fixed bugs"
```

> **Key Insight:** A good commit message explains **why** the change was made, not just **what** changed.

---

### 💡 **Security Best Practices**

**Never Commit Secrets:**

❌ **Bad:**
```javascript
const API_KEY = "sk_live_abc123xyz"
const DB_PASSWORD = "admin123"
```

✅ **Good:**
```javascript
const API_KEY = process.env.API_KEY
const DB_PASSWORD = process.env.DB_PASSWORD
```

**Check for Secrets Before Committing:**

```bash
# Manual check
git diff --cached | grep -iE 'password|secret|key|token|api_key'

# Use git-secrets tool
git secrets --install
git secrets --register-aws

# Scan repository
git secrets --scan
```

**If You Committed a Secret:**

**Step 1: Remove from history**

```bash
# Using BFG Repo-Cleaner (recommended)
bfg --delete-files secrets.txt

# Using git filter-branch
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch secrets.txt' \
  --prune-empty --tag-name-filter cat -- --all
```

**Step 2: Force push**

```bash
git push --force-with-lease
```

**Step 3: Rotate the secret immediately!**

The secret is compromised and must be changed in all systems.

**Security Checklist:**

- ✅ Use environment variables for secrets
- ✅ Add `*.env`, `*.pem`, `*.key` to `.gitignore`
- ✅ Use secret management (AWS Secrets Manager, Vault)
- ✅ Enable secret scanning (GitHub Advanced Security)
- ✅ Review PRs for accidental secrets
- ✅ Use pre-commit hooks to block secrets

---

### Repository Maintenance

**Clean Up Local Branches:**

```bash
# Delete branches that have been merged
git branch --merged | grep -v "\*" | xargs git branch -d

# Delete branches that have been merged to main
git branch --merged main | grep -v "\* main" | xargs git branch -d
```

**Prune Remote Tracking Branches:**

```bash
# Remove local references to deleted remote branches
git fetch --prune
git remote prune origin
```

**Repository Optimization:**

```bash
# Garbage collection (cleanup and optimize)
git gc

# Aggressive garbage collection (slower, more thorough)
git gc --aggressive

# Check repository health
git fsck

# Check repository size
du -sh .git
```

**Reduce Repository Size:**

```bash
# Expire reflog entries
git reflog expire --expire=now --all

# Garbage collect with pruning
git gc --prune=now --aggressive
```

**Maintenance Schedule:**

| Task | Frequency | Command |
|------|-----------|---------|
| Delete merged branches | Weekly | `git branch --merged \| xargs git branch -d` |
| Prune remote branches | Weekly | `git fetch --prune` |
| Garbage collection | Monthly | `git gc` |
| Repository health check | Quarterly | `git fsck` |

---

## Interview Questions

### Q1: What's the difference between `git pull` and `git fetch`?

**Answer:**

| Command | What It Does | Result |
|---------|-------------|--------|
| `git fetch` | Downloads changes from remote | Changes in remote tracking branches, working directory unchanged |
| `git pull` | Downloads + merges automatically | `git fetch` + `git merge` - working directory updated |

**In DevOps practice:** `git fetch` is safer because you can review changes before merging.

```bash
# Safer workflow
git fetch origin
git log origin/main       # Review what changed
git merge origin/main     # Merge when ready

# Convenient but risky
git pull                  # Immediate merge, possible conflicts
```

---

### Q2: When would you use `git rebase` vs `git merge`?

**Answer:**

**Use `git merge` when:**
- ✅ Merging feature branches into main
- ✅ Working on public/shared branches
- ✅ Want to preserve complete history
- ✅ Want to see exactly when feature was integrated

**Use `git rebase` when:**
- ✅ Cleaning up private branch before merging
- ✅ Updating feature branch with main's changes
- ✅ Want linear, clean history
- ❌ **NEVER** on public branches

**Critical rule:** Never rebase commits that exist outside your repository!

---

### Q3: How do you undo a commit that's already pushed?

**Answer:**

Use `git revert` (NOT `git reset`) for public branches:

```bash
# Creates new commit that undoes changes
git revert <commit-hash>

# Revert last commit
git revert HEAD

# Revert range of commits
git revert HEAD~3..HEAD
```

**Why not reset?**
```bash
# ❌ BAD for public branches (rewrites history)
git reset --hard HEAD~1
git push --force  # Breaks everyone's work!

# ✅ GOOD for public branches (preserves history)
git revert HEAD
git push  # Creates undo commit
```

> **Key Point:** `revert` is safe for public branches, `reset` is only for private branches.

---

### Q4: Explain Git's three-tree architecture.

**Answer:**

Git has three main areas:

**1. Working Directory:**
- Your actual project files
- Where you make changes
- Not tracked until staged

**2. Staging Area (Index):**
- Holds changes prepared for commit
- Allows selective commits
- Unique to Git (other VCS don't have this)

**3. Repository (.git directory):**
- Contains all committed history
- Compressed and efficient
- Complete project history

**Flow:**
```
Working Directory  →  Staging Area  →  Repository
   (git add)           (git commit)
```

---

### Q5: How do you resolve merge conflicts?

**Answer:**

**Step-by-step process:**

```bash
# 1. Attempt merge
git merge feature-branch
# CONFLICT: Merge conflict in app.js

# 2. Git marks conflicts in files
<<<<<<< HEAD
const version = "1.0.0";  // Current branch
=======
const version = "2.0.0";  // Incoming branch
>>>>>>> feature-branch

# 3. Edit file to resolve (remove markers, choose code)
const version = "2.0.0";

# 4. Stage resolved files
git add app.js

# 5. Complete merge
git commit

# If you want to abort instead:
git merge --abort
```

**Pro tips:**
- Use `git mergetool` for complex conflicts
- Test after resolving
- Communicate with the other developer

---

### Q6: What's the difference between `git reset --soft`, `--mixed`, and `--hard`?

**Answer:**

| Mode | HEAD | Staging | Working Dir | Use Case |
|------|------|---------|-------------|----------|
| `--soft` | Moves | Unchanged | Unchanged | Redo commit with more changes |
| `--mixed` | Moves | Reset | Unchanged | Unstage everything |
| `--hard` | Moves | Reset | Reset | **Discard all changes (DANGER!)** |

**Examples:**

```bash
# Keep changes staged (can re-commit immediately)
git reset --soft HEAD~1

# Keep changes unstaged (can edit before re-committing)
git reset --mixed HEAD~1  # or just: git reset HEAD~1

# Discard all changes (PERMANENT!)
git reset --hard HEAD~1
```

⚠️ **Warning:** `--hard` permanently deletes uncommitted changes!

---

### Q7: How do you find a commit that introduced a bug?

**Answer:**

Use `git bisect` for binary search through commits:

```bash
# 1. Start bisect
git bisect start

# 2. Mark current version as bad
git bisect bad

# 3. Mark known good version
git bisect good v1.0.0

# Git checks out middle commit
# 4. Test and mark as good or bad
git bisect good   # if test passes
git bisect bad    # if test fails

# 5. Repeat until found
# Git will tell you: "X is the first bad commit"

# 6. Return to original state
git bisect reset
```

**Automated bisect:**

```bash
# Run test script automatically
git bisect start HEAD v1.0.0
git bisect run npm test
```

---

### Q8: What are Git hooks and how are they used in DevOps?

**Answer:**

Git hooks are scripts that run automatically on Git events.

**Common DevOps Uses:**

| Hook | Use Case | Example |
|------|----------|---------|
| `pre-commit` | Run linters/formatters | Ensure code quality |
| `commit-msg` | Enforce conventions | Validate commit format |
| `pre-push` | Run tests | Prevent pushing broken code |
| `post-receive` | Deploy code | Auto-deploy on push (GitOps) |

**Example: Prevent commits without tests:**

```bash
# .git/hooks/pre-commit
#!/bin/bash
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

---

### Q9: What's the difference between a lightweight and annotated tag?

**Answer:**

| Type | Storage | Contains | Command | Use Case |
|------|---------|----------|---------|----------|
| **Lightweight** | Pointer to commit | Only commit hash | `git tag v1.0` | Temporary marks |
| **Annotated** | Full Git object | Author, date, message, GPG signature | `git tag -a v1.0 -m "msg"` | **Production releases** |

**Best practice:** Always use annotated tags for releases:

```bash
# ✅ Good - annotated tag
git tag -a v1.0.0 -m "Release 1.0.0"

# ❌ Bad for releases - lightweight tag
git tag v1.0.0
```

---

### Q10: How does GitOps work?

**Answer:**

GitOps treats Git as the single source of truth for infrastructure.

**How it works:**

```
1. Developer commits infrastructure change to Git
   ↓
2. Git triggers CI/CD pipeline
   ↓
3. Pipeline validates changes
   ↓
4. ArgoCD/FluxCD detects Git change
   ↓
5. Automatically applies changes to cluster
   ↓
6. Monitors and reconciles state continuously
```

**Benefits:**
- ✅ Infrastructure changes are code-reviewed
- ✅ Full audit trail (who changed what, when, why)
- ✅ Easy rollback (`git revert`)
- ✅ Declarative - Git defines desired state
- ✅ No manual `kubectl apply` needed

**Example:**
```bash
# Change replica count in Git
git add k8s/deployment.yaml
git commit -m "feat: scale to 5 replicas"
git push

# ArgoCD automatically applies change to cluster
# No manual intervention needed!
```

---

## Summary

### Core Concepts

**1. Git Architecture:**

```
Working Directory  →  Staging Area  →  Local Repository  →  Remote Repository
```

- ✅ Distributed: Every clone has full history
- ✅ `.git` directory stores complete history
- ✅ Staging area enables precise commits
- ✅ Three-tree architecture: working → staging → repository

**2. Essential Workflow:**

```bash
git add .              # Stage changes
git commit -m "msg"    # Commit to local repo
git push               # Share with team
```

**3. Branching Philosophy:**

- ✅ Branches are lightweight pointers (cheap and fast)
- ✅ Use liberally - branch for every feature/fix
- ✅ Merge preserves history, rebase creates linear history
- ✅ Never rebase public/shared branches

**4. Merge vs Rebase:**

| Use Case | Use This | Why |
|----------|----------|-----|
| Feature → main | `git merge` | Preserve history |
| Clean up local branch | `git rebase` | Linear history |
| Public branches | **Always merge** | Never rewrite shared history |

**5. Undo Strategies:**

| Situation | Command | Safety |
|-----------|---------|--------|
| Uncommitted changes | `git restore` | Safe |
| Private branch commits | `git reset` | Rewrites history |
| Public branch commits | `git revert` | Safe, preserves history |

**6. DevOps Integration:**

- ✅ Git hooks automate quality checks (pre-commit, pre-push)
- ✅ CI/CD pipelines triggered by Git events
- ✅ GitOps: Infrastructure as code in Git
- ✅ Tags mark release points (`v1.0.0`)
- ✅ Conventional commits provide meaningful history

**7. Branching Strategies:**

| Strategy | Best For | Release Cadence |
|----------|----------|----------------|
| **GitFlow** | Enterprise, scheduled releases | Weekly/monthly |
| **GitHub Flow** | Continuous deployment | Daily |
| **Trunk-Based** | High-performing DevOps teams | Multiple times/day |

### Key Insights

> **Git is distributed:** Every developer has the complete history - you can work offline, and every clone is a full backup.

> **Branches are cheap:** Creating a branch takes milliseconds. Use them liberally for every feature, bug fix, or experiment.

> **Never rebase shared history:** Rewriting public commits breaks everyone's work. Use `git revert` instead.

> **Staging area is powerful:** It lets you craft precise, atomic commits by selectively staging changes.

> **Commit messages are documentation:** Good messages explain **why** changes were made, not just **what** changed.

> **Git enables GitOps:** Infrastructure as code + Git = automated, auditable deployments.

### Best Practices Checklist

- ✅ Use conventional commits (`feat:`, `fix:`, `docs:`)
- ✅ Write atomic commits (one logical change each)
- ✅ Never commit secrets (use `.gitignore` and environment variables)
- ✅ Use annotated tags for releases (`git tag -a v1.0.0`)
- ✅ Prefer `git revert` over `git reset` for public branches
- ✅ Use `git fetch` + review before merging
- ✅ Set up Git hooks for automated quality checks
- ✅ Use `.gitignore` for build artifacts and secrets
- ✅ Clean up merged branches regularly
- ✅ Use SSH for authentication (more secure than HTTPS)

---

**Next Steps:**
- [Advanced Git →](./02-advanced-git.md) - Reflog, bisect, worktrees, submodules
- [Branching Strategies →](./03-branching-strategies.md) - Deep dive into GitFlow, GitHub Flow, Trunk-Based
- [Best Practices →](./04-best-practices.md) - Security, automation, team workflows

---

[← Back to DevOps](../README.md)
