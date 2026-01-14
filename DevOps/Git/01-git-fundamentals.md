# Git Fundamentals for DevOps

## Overview

Git is the foundation of modern DevOps workflows. Understanding Git is essential for version control, collaboration, CI/CD pipelines, and infrastructure as code. This guide covers Git fundamentals with a DevOps focus.

**Why Git in DevOps:**
- Version control for code AND infrastructure (IaC)
- CI/CD pipelines triggered by Git commits
- GitOps: Git as single source of truth
- Collaboration via pull requests and code review
- Rollback capabilities for quick incident recovery

**Git Workflow Levels:**

| Level | Focus | Key Commands | Use Case |
|-------|-------|--------------|----------|
| **Individual** | Local work | `add`, `commit`, `status`, `diff` | Daily development |
| **Team** | Collaboration | `branch`, `merge`, `pull`, `push` | Feature development |
| **Project** | Management | `rebase`, `cherry-pick`, `tag` | Release management |
| **DevOps** | Automation | Hooks, CI/CD integration | Automated deployments |

## Git Basics

### Git Architecture

```
Working Directory  →  Staging Area  →  Local Repository  →  Remote Repository
    (Files)           (git add)        (git commit)         (git push)
                                           ↓
                                       .git directory
                                       (All history)
```

### Configuration

```bash
# Global configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.editor "vim"
git config --global init.defaultBranch main

# View configuration
git config --list
git config user.name

# Local repository config (override global)
git config user.email "work@company.com"

# Common aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --oneline --graph --all'
```

### Repository Initialization

```bash
# Create new repository
git init                        # Initialize in current directory
git init project-name           # Create and initialize new directory

# Clone existing repository
git clone https://github.com/user/repo.git
git clone git@github.com:user/repo.git              # SSH
git clone https://github.com/user/repo.git mydir    # Custom directory name

# Check repository status
git status                      # Detailed status
git status -s                   # Short status
git status -sb                  # Short with branch info
```

## Basic Workflow

### Staging and Committing

```bash
# Add files to staging
git add file.txt                # Add specific file
git add .                       # Add all files in current directory
git add -A                      # Add all changes (new, modified, deleted)
git add -u                      # Add modified and deleted (not new)
git add *.js                    # Add all JS files
git add -p                      # Interactive staging (patch mode)

# Unstage files
git reset HEAD file.txt         # Unstage file
git restore --staged file.txt   # Modern way to unstage

# Commit changes
git commit -m "Commit message"  # Commit with message
git commit -am "Message"        # Add and commit tracked files
git commit --amend              # Amend last commit
git commit --amend --no-edit    # Amend without changing message

# View changes
git diff                        # Changes in working directory
git diff --staged               # Changes in staging area
git diff HEAD                   # All changes since last commit
git diff branch1 branch2        # Differences between branches
git diff commit1 commit2        # Differences between commits
```

### Viewing History

```bash
# Log viewing
git log                         # Full commit history
git log --oneline               # Condensed one-line format
git log --graph                 # ASCII graph
git log --oneline --graph --all # Visual branch history
git log -p                      # Show patches (diffs)
git log -5                      # Last 5 commits
git log --since="2 weeks ago"   # Time-based filter
git log --author="John"         # Author filter
git log --grep="fix"            # Search commit messages
git log -- file.txt             # History of specific file
git log -S "function_name"      # Search code changes

# Show commit details
git show <commit-hash>          # Show commit details
git show HEAD                   # Show last commit
git show HEAD~2                 # Show 2 commits back
git show <commit>:file.txt      # Show file at specific commit

# Blame (who changed what)
git blame file.txt              # Line-by-line authorship
git blame -L 10,20 file.txt     # Lines 10-20 only
```

## Branching and Merging

### Branch Operations

```bash
# List branches
git branch                      # Local branches
git branch -r                   # Remote branches
git branch -a                   # All branches
git branch -v                   # With last commit
git branch --merged             # Branches merged into current
git branch --no-merged          # Branches not merged

# Create branches
git branch feature-xyz          # Create branch
git checkout -b feature-xyz     # Create and switch
git switch -c feature-xyz       # Modern way (Git 2.23+)

# Switch branches
git checkout main               # Switch to main
git switch main                 # Modern way
git checkout -                  # Switch to previous branch

# Delete branches
git branch -d feature-xyz       # Delete merged branch
git branch -D feature-xyz       # Force delete unmerged branch
git push origin --delete feature-xyz  # Delete remote branch

# Rename branch
git branch -m old-name new-name # Rename branch
git branch -M new-name          # Rename current branch
```

### Merging Strategies

```bash
# Merge branches
git merge feature-xyz           # Merge into current branch
git merge --no-ff feature-xyz   # Force merge commit (no fast-forward)
git merge --squash feature-xyz  # Squash all commits into one

# Merge conflicts
# 1. Git will mark conflicts in files:
<<<<<<< HEAD
Current branch content
=======
Incoming branch content
>>>>>>> feature-xyz

# 2. Resolve conflicts manually
# 3. Stage resolved files
git add resolved-file.txt

# 4. Complete merge
git commit

# Abort merge if needed
git merge --abort
```

### Rebasing

```bash
# Basic rebase
git rebase main                 # Rebase current branch onto main
git rebase --continue           # Continue after resolving conflicts
git rebase --abort              # Abort rebase
git rebase --skip               # Skip current commit

# Interactive rebase
git rebase -i HEAD~3            # Rebase last 3 commits
git rebase -i main              # Rebase onto main with options

# Interactive rebase commands:
# pick   = use commit
# reword = use commit, edit message
# edit   = use commit, stop for amending
# squash = combine with previous commit
# fixup  = like squash, discard message
# drop   = remove commit

# Example interactive rebase:
pick abc123 Add feature
reword def456 Fix bug          # Will prompt to edit message
squash ghi789 Update tests     # Will combine with previous
drop jkl012 Bad commit         # Will remove

# Never rebase public branches!
```

## Remote Repositories

### Remote Operations

```bash
# View remotes
git remote                      # List remotes
git remote -v                   # List with URLs
git remote show origin          # Detailed remote info

# Add/remove remotes
git remote add origin https://github.com/user/repo.git
git remote add upstream https://github.com/original/repo.git
git remote remove origin
git remote rename origin upstream

# Fetch changes
git fetch                       # Fetch from default remote
git fetch origin                # Fetch from origin
git fetch --all                 # Fetch from all remotes
git fetch --prune               # Remove deleted remote branches

# Pull changes
git pull                        # Fetch + merge
git pull --rebase               # Fetch + rebase (preferred for clean history)
git pull origin main            # Pull specific branch

# Push changes
git push                        # Push to default remote
git push origin main            # Push to specific branch
git push -u origin feature-xyz  # Push and set upstream
git push --force                # Force push (dangerous!)
git push --force-with-lease     # Safer force push
git push --tags                 # Push tags
git push --all                  # Push all branches
```

### Working with Forks

```bash
# Fork workflow
# 1. Fork on GitHub
# 2. Clone your fork
git clone https://github.com/yourusername/repo.git
cd repo

# 3. Add upstream remote
git remote add upstream https://github.com/original/repo.git

# 4. Keep your fork updated
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# 5. Create feature branch
git checkout -b feature-xyz

# 6. Make changes, commit, push to your fork
git push origin feature-xyz

# 7. Create Pull Request on GitHub
```

## Undoing Changes

### Undoing Uncommitted Changes

```bash
# Discard changes in working directory
git restore file.txt            # Discard changes in file
git restore .                   # Discard all changes
git checkout -- file.txt        # Old way

# Remove untracked files
git clean -n                    # Dry run (preview)
git clean -f                    # Remove untracked files
git clean -fd                   # Remove files and directories
git clean -fX                   # Remove only ignored files
git clean -fx                   # Remove ignored and untracked
```

### Undoing Commits

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1         # Keep changes staged
git reset HEAD~1                # Keep changes unstaged (default)
git reset --hard HEAD~1         # Discard changes (dangerous!)

# Undo multiple commits
git reset --hard HEAD~3         # Go back 3 commits

# Reset to specific commit
git reset --hard <commit-hash>

# Revert commit (create new commit that undoes)
git revert <commit-hash>        # Creates new commit
git revert HEAD                 # Revert last commit
git revert HEAD~3..HEAD         # Revert last 3 commits

# Difference:
# reset = rewrites history (don't use on public branches)
# revert = creates new commit (safe for public branches)
```

## Advanced Git

### Stashing

```bash
# Save work temporarily
git stash                       # Stash changes
git stash save "Work in progress"  # Stash with message
git stash -u                    # Include untracked files
git stash --all                 # Include ignored files

# View stashes
git stash list                  # List all stashes
git stash show                  # Show latest stash
git stash show stash@{1}        # Show specific stash
git stash show -p               # Show stash diff

# Apply stashes
git stash apply                 # Apply latest stash (keep in list)
git stash pop                   # Apply and remove from list
git stash apply stash@{2}       # Apply specific stash

# Delete stashes
git stash drop                  # Delete latest stash
git stash drop stash@{1}        # Delete specific stash
git stash clear                 # Delete all stashes

# Create branch from stash
git stash branch feature-xyz    # Create branch and apply stash
```

### Cherry-Picking

```bash
# Apply specific commits to current branch
git cherry-pick <commit-hash>   # Apply single commit
git cherry-pick abc123 def456   # Apply multiple commits
git cherry-pick abc123..def456  # Apply commit range

# Cherry-pick without committing
git cherry-pick -n <commit-hash>

# Abort cherry-pick
git cherry-pick --abort

# Continue after resolving conflicts
git cherry-pick --continue
```

### Tagging

```bash
# List tags
git tag                         # List all tags
git tag -l "v1.*"               # List matching pattern

# Create tags
git tag v1.0.0                  # Lightweight tag
git tag -a v1.0.0 -m "Version 1.0.0"  # Annotated tag
git tag -a v1.0.0 <commit-hash> # Tag specific commit

# Show tag details
git show v1.0.0

# Push tags
git push origin v1.0.0          # Push single tag
git push origin --tags          # Push all tags

# Delete tags
git tag -d v1.0.0               # Delete local tag
git push origin --delete v1.0.0 # Delete remote tag

# Checkout tag
git checkout v1.0.0             # Detached HEAD state
git checkout -b branch-v1.0.0 v1.0.0  # Create branch from tag
```

## Git in DevOps

### .gitignore

```bash
# .gitignore patterns
*.log                   # Ignore all .log files
/build/                 # Ignore build directory
node_modules/           # Ignore node_modules
*.env                   # Ignore environment files
.DS_Store               # Ignore Mac files
**/*.pyc                # Ignore Python compiled files

# Negation (don't ignore)
!important.log

# Track empty directory
logs/.gitkeep

# Global gitignore
git config --global core.excludesfile ~/.gitignore_global

# Check if file is ignored
git check-ignore -v file.txt

# Common DevOps .gitignore
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

# IDE
.vscode/
.idea/

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

### Git Hooks

```bash
# Hooks are scripts in .git/hooks/
# Remove .sample extension to activate

# Common hooks:
# pre-commit       - Before commit
# commit-msg       - Edit commit message
# pre-push         - Before push
# post-checkout    - After checkout
# post-merge       - After merge

# Example: pre-commit hook for linting
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linter before commit

echo "Running pre-commit checks..."

# Run tests
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi

# Run linter
npm run lint
if [ $? -ne 0 ]; then
    echo "Linter failed. Commit aborted."
    exit 1
fi

echo "Pre-commit checks passed!"
exit 0
EOF

chmod +x .git/hooks/pre-commit

# Example: commit-msg hook for conventional commits
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Enforce conventional commit format

commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{10,}"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
    echo "Error: Invalid commit message format"
    echo "Format: <type>(scope): <description>"
    echo "Example: feat(api): add user authentication"
    exit 1
fi
EOF

chmod +x .git/hooks/commit-msg
```

### Git for Infrastructure as Code

```bash
# Terraform with Git
.
├── .gitignore          # Ignore state files
├── README.md
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars    # Should be in .gitignore!
└── environments/
    ├── dev/
    ├── staging/
    └── production/

# Kubernetes manifests with Git
.
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    ├── staging/
    └── production/

# GitOps workflow
git commit -m "feat: update deployment replicas to 5"
git push origin main
# ArgoCD/FluxCD automatically deploys changes
```

## Branching Strategies

### GitFlow

```bash
# Branch structure:
main            # Production-ready code
develop         # Integration branch
feature/*       # New features
release/*       # Release preparation
hotfix/*        # Production fixes

# Feature workflow
git checkout develop
git checkout -b feature/user-auth
# ... work on feature ...
git push origin feature/user-auth
# Create PR to develop

# Release workflow
git checkout develop
git checkout -b release/v1.2.0
# ... final testing, version bumps ...
git checkout main
git merge release/v1.2.0
git tag v1.2.0
git checkout develop
git merge release/v1.2.0
git branch -d release/v1.2.0

# Hotfix workflow
git checkout main
git checkout -b hotfix/security-patch
# ... fix issue ...
git checkout main
git merge hotfix/security-patch
git tag v1.2.1
git checkout develop
git merge hotfix/security-patch
```

### GitHub Flow (Simpler)

```bash
# Branch structure:
main            # Always deployable
feature/*       # Feature branches

# Workflow
git checkout main
git pull origin main
git checkout -b feature/new-feature
# ... work and commit ...
git push origin feature/new-feature
# Create Pull Request
# Review, test, merge to main
# Deploy main to production
```

### Trunk-Based Development

```bash
# Single main branch
main            # Everyone commits here

# Short-lived feature branches (< 1 day)
git checkout -b short-feature
# ... quick changes ...
git push origin short-feature
# PR and merge same day

# Feature flags for incomplete features
if (featureFlags.newUI) {
  // New UI code
} else {
  // Old UI code
}
```

## Git Best Practices for DevOps

### Commit Messages

```bash
# Good commit message format
<type>(<scope>): <subject>

<body>

<footer>

# Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance

# Examples:
feat(api): add user authentication endpoint
fix(auth): resolve token expiration issue
docs(readme): update installation instructions
chore(deps): upgrade react to v18.0.0

# Atomic commits
# ✅ Good
git commit -m "feat(api): add user endpoint"
git commit -m "test(api): add user endpoint tests"

# ❌ Bad
git commit -m "Added user endpoint, tests, updated docs, fixed bugs"
```

### Security Best Practices

```bash
# Never commit secrets!
# ✅ Use environment variables
DATABASE_URL=${DATABASE_URL}

# ✅ Use secret management
aws secretsmanager get-secret-value --secret-id db-password

# Check for secrets before committing
git diff --cached | grep -i 'password\|secret\|key\|token'

# Use git-secrets tool
git secrets --install
git secrets --register-aws

# If secret was committed:
# 1. Remove from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch secrets.txt' \
  --prune-empty --tag-name-filter cat -- --all

# 2. Or use BFG Repo-Cleaner
bfg --delete-files secrets.txt

# 3. Rotate the compromised secret immediately!
```

### Repository Maintenance

```bash
# Clean up local branches
git branch --merged | grep -v "\*" | xargs git branch -d

# Prune remote tracking branches
git fetch --prune
git remote prune origin

# Garbage collection
git gc                  # Cleanup and optimize
git gc --aggressive     # More thorough cleanup

# Check repository health
git fsck                # File system check
du -sh .git             # Repository size

# Reduce repository size
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Interview Questions

**Q1: What's the difference between `git pull` and `git fetch`?**
A: `git fetch` downloads changes from remote but doesn't merge them. `git pull` = `git fetch` + `git merge`. In DevOps, `git fetch` followed by review is often safer.

**Q2: When would you use `git rebase` vs `git merge`?**
A: Use `rebase` for clean linear history on private branches. Use `merge` for public branches and to preserve feature branch history. Never rebase public/shared branches!

**Q3: How do you undo a commit that's already pushed?**
A: Use `git revert <commit-hash>` which creates a new commit that undoes changes. Avoid `git reset` on public branches as it rewrites history.

**Q4: Explain Git's three-tree architecture.**
A:
1. **Working Directory** - Current files
2. **Staging Area (Index)** - Changes to be committed
3. **Repository (.git)** - Committed history

**Q5: How do you resolve merge conflicts?**
```bash
# 1. Attempt merge
git merge feature-branch

# 2. Git marks conflicts in files
# 3. Edit files to resolve conflicts
# 4. Stage resolved files
git add resolved-file.txt

# 5. Complete merge
git commit
```

**Q6: What's the difference between `git reset --soft`, `--mixed`, and `--hard`?**
A:
- `--soft`: Moves HEAD, keeps staging and working directory
- `--mixed` (default): Moves HEAD, resets staging, keeps working directory
- `--hard`: Moves HEAD, resets staging and working directory (dangerous!)

**Q7: How do you find a commit that introduced a bug?**
```bash
# Binary search through commits
git bisect start
git bisect bad                  # Current version is bad
git bisect good v1.0.0          # v1.0.0 was good
# Git checks out middle commit
# Test and mark as good or bad
git bisect good/bad
# Repeat until found
git bisect reset                # Return to original state
```

## Summary

**Core Concepts:**

1. **Git Architecture:**
   - ✅ Working Directory → Staging Area → Local Repo → Remote Repo
   - ✅ `git add` (stage), `git commit` (save), `git push` (share)
   - ✅ `.git` directory stores all history
   - ✅ Distributed: every clone is a full backup

2. **Essential Commands:**
   - **Status**: `git status`, `git diff`, `git log`
   - **Changes**: `git add`, `git commit`, `git rm`, `git mv`
   - **Branches**: `git branch`, `git checkout`, `git merge`
   - **Remote**: `git clone`, `git pull`, `git push`, `git fetch`

3. **Branching & Merging:**
   - ✅ Branches are cheap and fast (just pointers)
   - ✅ `merge` preserves history, `rebase` rewrites it
   - ✅ Feature branches for isolation
   - ✅ Merge conflicts resolved manually

4. **History Management:**
   - ✅ `git log` with filtering (`--author`, `--since`, `--grep`)
   - ✅ `git reset` (undo commits)
   - ✅ `git revert` (undo with new commit - safe for shared history)
   - ✅ `git reflog` (recover lost commits)

5. **DevOps Integration:**
   - ✅ Git hooks for automation (pre-commit, post-receive)
   - ✅ CI/CD triggered by Git events
   - ✅ GitOps: Infrastructure changes via Git commits
   - ✅ Tags for releases (`git tag v1.0.0`)

**Key Insights:**
> - Git is distributed: every developer has full history
> - Branches are lightweight - use them liberally for features
> - Never rebase shared history (use revert instead)
> - Understanding merge vs rebase is critical for clean history
> - Git hooks enable powerful automation for DevOps workflows

---
[← Back to DevOps](../README.md) | [Next: Branching Strategies →](./03-branching-strategies.md)
