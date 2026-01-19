# Git Best Practices for DevOps

## Overview

Git best practices ensure code quality, team collaboration, and maintainable project history. These practices are essential for professional DevOps environments and scale from small teams to enterprise organizations.

**Why Best Practices Matter:**
- Maintain clean, readable Git history
- Enable effective code review
- Facilitate debugging and rollbacks
- Support automation and CI/CD
- Improve team collaboration
- Reduce technical debt

## Commit Best Practices

### 💡 **Atomic Commits**

Make small, focused commits that do one thing well. Each commit should be a logical unit of change that can stand alone.

**Principles:**
- One logical change per commit
- If you use "and" in your commit message, it's probably too large
- Commit should pass all tests
- Easy to review, revert, or cherry-pick

### Commit Message Standards

**Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons)
- `refactor`: Code refactoring (no behavior change)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, configs)
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Reverts a previous commit

**Examples:**

```bash
# ✅ Good commit messages

feat(auth): add OAuth2 login flow

Implements OAuth2 authentication with Google and GitHub providers.
Includes token refresh mechanism and secure session storage.

Closes #123

---

fix(api): resolve race condition in user creation

Multiple simultaneous requests could create duplicate users.
Added mutex lock to ensure atomic user creation.

Fixes #456

---

docs(readme): update installation instructions

- Add Docker setup steps
- Update Node.js version requirement to 18+
- Fix broken links to API documentation

---

refactor(database): migrate to connection pooling

Improves database performance under high load.
Reduces connection overhead by 40%.

Performance metrics: https://link-to-grafana-dashboard

---

test(auth): add integration tests for login flow

Covers successful login, failed authentication, and token expiration.
Increases auth coverage from 65% to 92%.

---

chore(deps): upgrade Express to v4.18.2

Security patch for CVE-2022-24999.
No breaking changes expected.
```

```bash
# ❌ Bad commit messages

git commit -m "fix"                          # What was fixed?
git commit -m "updated files"                # Which files? Why?
git commit -m "bug fix"                      # Which bug?
git commit -m "changes"                      # Too vague
git commit -m "WIP"                          # Work in progress not descriptive
git commit -m "fixed login and added tests and updated docs"  # Multiple changes
```

### Conventional Commits

```bash
# Configure commit template
cat > ~/.gitmessage << 'EOF'
# <type>(<scope>): <subject> (max 50 char)
# |<----  Using a Maximum Of 50 Characters  ---->|

# Explain why this change is being made
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|

# Provide links or keys to any relevant tickets, articles or other resources
# Example: Github issue #23

# --- COMMIT END ---
# Type can be:
#   feat     (new feature)
#   fix      (bug fix)
#   refactor (refactoring code)
#   style    (formatting, missing semi colons, etc)
#   docs     (changes to documentation)
#   test     (adding or refactoring tests)
#   chore    (updating grunt tasks etc)
# --------------------
# Remember to:
#   - Capitalize the subject line
#   - Use the imperative mood in the subject line
#   - Do not end the subject line with a period
#   - Separate subject from body with a blank line
#   - Use the body to explain what and why vs. how
#   - Can use multiple lines with "-" for bullet points in body
EOF

git config --global commit.template ~/.gitmessage
```

### Commit Hygiene

```bash
# ✅ Good practices

# Commit frequently (at logical breakpoints)
git add src/auth.js
git commit -m "feat(auth): add login validation"

git add tests/auth.test.js
git commit -m "test(auth): add validation tests"

# Stage selectively (don't commit unrelated changes)
git add -p                              # Interactive staging
git add src/auth.js                     # Stage specific file
git add src/                            # Stage directory

# Review before committing
git diff                                # Check unstaged changes
git diff --staged                       # Check staged changes
git status                              # Overall status

# Amend last commit if needed (before pushing!)
git commit --amend                      # Edit message
git commit --amend --no-edit            # Add forgotten files

# ❌ Bad practices

# Avoid
git add .                               # Stages everything (risky)
git commit -am "stuff"                  # Vague message
git commit -m "WIP"                     # Not descriptive
git commit --no-verify                  # Skip pre-commit hooks (dangerous)

# Never commit
- Secrets, passwords, API keys
- Build artifacts (dist/, node_modules/)
- IDE configurations (.vscode/, .idea/)
- Operating system files (.DS_Store)
- Large binary files (use Git LFS)
- Personal notes or TODO lists
```

## Branch Best Practices

### Branch Naming Conventions

```bash
# Standard format:
<type>/<ticket-id>-<brief-description>

# Examples:

# ✅ Good branch names
feature/JIRA-123-user-authentication
feature/add-oauth-login
fix/JIRA-456-memory-leak
fix/login-redirect-loop
hotfix/security-patch-xss
refactor/database-layer
docs/api-documentation
test/integration-tests
chore/upgrade-dependencies
release/v1.2.0

# ❌ Bad branch names
my-branch                               # Not descriptive
test                                    # Too vague
branch-1                                # Meaningless
johns-work                              # Personal, not descriptive
fix-bug                                 # Which bug?
temp                                    # Temporary branches pile up
```

### Branch Management

```bash
# Keep branches short-lived
# ✅ Aim for: 1-3 days
# ⚠️ Warning: > 1 week
# 🔴 Problem: > 2 weeks (stale, merge conflicts)

# Update from main regularly
git checkout feature/my-feature
git fetch origin
git rebase origin/main                  # or merge
git push --force-with-lease

# Clean up merged branches
git branch --merged main | grep -v main | xargs git branch -d
git remote prune origin

# Delete remote branch after merge
git push origin --delete feature/old-feature

# Protect important branches
# On GitHub/GitLab:
# - Enable branch protection for main/develop
# - Require pull request reviews
# - Require status checks
# - Disable force push
# - Require up-to-date branches
```

## Pull Request Best Practices

### 💡 **Effective Pull Requests**

Pull requests are code review tools and documentation of why changes were made.

**Key Principles:**
- Small, focused PRs (easier to review)
- Clear description of changes and context
- Link to related issues/tickets
- Include testing evidence
- Request specific reviewers

### PR Template

```markdown
## Description

Brief description of what this PR does and why.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues

Closes #123
Related to #456

## Changes Made

- Added user authentication with JWT
- Implemented password hashing with bcrypt
- Created login and registration endpoints
- Added authentication middleware

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

### Test Coverage

```
Auth Module:  95% coverage
API Routes:   88% coverage
Overall:      91% coverage
```

### Manual Testing Steps

1. Register new user → Success ✅
2. Login with credentials → Success ✅
3. Access protected route → Success ✅
4. Invalid credentials → Proper error ✅

## Screenshots (if applicable)

[Screenshot of login page]

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No merge conflicts

## Reviewer Notes

Please pay special attention to:
- JWT token generation logic (src/auth/jwt.js:45)
- Password validation rules (src/auth/validation.js:12)

## Deployment Notes

Requires:
- JWT_SECRET environment variable
- Database migration: `npm run migrate`
```

### PR Size Guidelines

```
Lines Changed    Review Time    Recommendation
-------------    -----------    --------------
  0-50          5-10 min       ✅ Ideal
  50-200        15-30 min      ✅ Good
  200-400       30-60 min      ⚠️ Large
  400-800       1-2 hours      🔴 Too large
  800+          2+ hours       🔴 Split into multiple PRs

# ✅ Good PR sizes
feat(auth): add login endpoint          (+85, -12)
fix(api): resolve user query bug        (+23, -15)
docs(readme): update installation       (+45, -8)

# ❌ Too large
feat(complete-redesign): new UI         (+3500, -2200)
refactor(everything): code cleanup      (+1200, -980)

# Solution: Break into multiple PRs
feat(auth): add login endpoint
feat(auth): add registration endpoint
feat(auth): add JWT middleware
feat(auth): add password reset
```

### Code Review Best Practices

**For Authors:**

```bash
# Before creating PR

# 1. Self-review your changes
git diff main..HEAD

# 2. Run tests locally
npm test
npm run lint

# 3. Update from main
git fetch origin
git rebase origin/main

# 4. Create descriptive PR
# - Clear title
# - Detailed description
# - Link to issues
# - Add screenshots if UI changes

# 5. Request specific reviewers
# - Domain experts
# - Team members familiar with the area
# - At least 2 reviewers for critical changes

# During review

# 6. Respond to feedback promptly
# - Address all comments
# - Explain decisions respectfully
# - Make requested changes

# 7. Keep PR updated
git fetch origin
git rebase origin/main
git push --force-with-lease
```

**For Reviewers:**

```bash
# Review checklist

# Code Quality
- [ ] Code is readable and maintainable
- [ ] Follows project conventions
- [ ] No code duplication
- [ ] Appropriate error handling
- [ ] Security considerations addressed

# Functionality
- [ ] Implements stated requirements
- [ ] Edge cases handled
- [ ] No obvious bugs
- [ ] Performance considerations

# Tests
- [ ] Tests included
- [ ] Tests cover edge cases
- [ ] Tests are meaningful

# Documentation
- [ ] Code comments for complex logic
- [ ] README/docs updated if needed
- [ ] API documentation updated

# Review comment format
# ✅ Good comments:
# "Consider extracting this into a helper function for reusability"
# "This could cause a race condition if multiple requests occur. Suggestion: use mutex"
# "Great implementation! Minor suggestion: could use async/await for clarity"

# ❌ Bad comments:
# "This is wrong"                      # Not helpful
# "Change this"                        # No explanation
# "I wouldn't do it this way"          # Not constructive
```

## Repository Organization

### Directory Structure

```bash
# ✅ Good repository structure

project/
├── .github/                    # GitHub specific files
│   ├── workflows/             # GitHub Actions
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
├── .gitlab/                   # GitLab specific files
│   └── ci.yml
├── docs/                      # Documentation
│   ├── api/
│   ├── architecture/
│   └── deployment/
├── src/                       # Source code
│   ├── api/
│   ├── services/
│   ├── models/
│   └── utils/
├── tests/                     # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                   # Utility scripts
│   ├── deploy.sh
│   └── migrate.sh
├── config/                    # Configuration files
│   ├── development.yml
│   ├── production.yml
│   └── test.yml
├── .gitignore                 # Ignore patterns
├── .gitattributes            # Git attributes
├── README.md                  # Project overview
├── CONTRIBUTING.md            # Contribution guidelines
├── CHANGELOG.md               # Version history
├── LICENSE                    # License file
└── package.json              # Dependencies
```

### .gitignore Best Practices

```bash
# Comprehensive .gitignore

# ============================================
# Operating System Files
# ============================================
.DS_Store                      # macOS
Thumbs.db                      # Windows
*.swp                          # Vim
*~                             # Emacs

# ============================================
# IDE and Editor
# ============================================
.vscode/
.idea/
*.sublime-workspace
*.sublime-project

# ============================================
# Dependencies
# ============================================
node_modules/
vendor/
*.egg-info/
venv/
.env

# ============================================
# Build Artifacts
# ============================================
dist/
build/
*.o
*.so
*.dylib

# ============================================
# Logs
# ============================================
*.log
logs/
npm-debug.log*

# ============================================
# Secrets (CRITICAL!)
# ============================================
*.env
*.env.local
.env.production
secrets.yml
*.pem
*.key
*.p12
credentials.json
.aws/credentials

# ============================================
# Test Coverage
# ============================================
coverage/
.nyc_output/
*.coverage

# ============================================
# DevOps
# ============================================
*.tfstate
*.tfstate.backup
.terraform/
*.kubeconfig

# Useful patterns
**/.DS_Store                   # Recursive ignore
!important.log                 # Negative pattern (don't ignore)

# Use global gitignore for personal preferences
git config --global core.excludesfile ~/.gitignore_global
```

### .gitattributes

```bash
# .gitattributes - Control line endings and Git LFS

# Auto detect text files and normalize line endings
* text=auto

# Explicitly declare text files
*.md text
*.txt text
*.json text
*.yml text
*.yaml text

# Declare files that should have Unix line endings
*.sh text eol=lf
Makefile text eol=lf

# Declare files that should have Windows line endings
*.bat text eol=crlf

# Binary files
*.png binary
*.jpg binary
*.pdf binary
*.woff binary
*.woff2 binary

# Git LFS (Large File Storage)
*.psd filter=lfs diff=lfs merge=lfs -text
*.ai filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text

# Archive generation
export-ignore .gitattributes
export-ignore .gitignore
export-ignore .github/
```

## Security Best Practices

### Never Commit Secrets

```bash
# ❌ NEVER commit these:
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
DATABASE_URL=postgres://user:pass@localhost/db
API_KEY=sk_live_51HJ4...
PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----

# ✅ Use environment variables
# .env (gitignored!)
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
DATABASE_URL=postgres://user:pass@localhost/db

# Load in code
const dbUrl = process.env.DATABASE_URL;

# ✅ Use secrets management
aws secretsmanager get-secret-value --secret-id prod/api-key
kubectl get secret api-key -o jsonpath='{.data.key}' | base64 -d

# If secret was committed, remove from history!
git filter-repo --path secrets.txt --invert-paths
# Then rotate the compromised secret!
```

### Pre-commit Hooks for Security

```bash
# Install git-secrets
brew install git-secrets
# or
git clone https://github.com/awslabs/git-secrets.git

# Setup in repository
git secrets --install
git secrets --register-aws

# Scan for secrets
git secrets --scan

# Pre-commit hook example
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Check for secrets
if git secrets --scan -r .; then
    echo "✅ No secrets detected"
else
    echo "❌ Secrets detected! Commit aborted."
    exit 1
fi

# Check for large files
if git diff --cached --name-only | xargs du -sh | awk '$1 ~ /M$/ { if ($1+0 > 5) print }'; then
    echo "❌ Large files detected (>5MB). Use Git LFS."
    exit 1
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
```

## Performance and History

### Keep Repository Clean

```bash
# Find large files
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | \
  sort --numeric-sort --key=2 | \
  cut -c 1-12,41- | \
  $(command -v gnumfmt || echo numfmt) --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest

# Reduce repository size
git gc --aggressive --prune=now

# Remove old reflog entries
git reflog expire --expire=30.days --all
git gc --prune=now

# Use shallow clone for CI/CD
git clone --depth 1 https://github.com/user/repo.git
```

### Git LFS for Large Files

```bash
# Install Git LFS
brew install git-lfs
git lfs install

# Track large files
git lfs track "*.psd"
git lfs track "*.mp4"
git lfs track "*.zip"

# .gitattributes is updated automatically
git add .gitattributes

# Normal git workflow
git add large-file.psd
git commit -m "Add design file"
git push
```

## Team Workflow Patterns

### Feature Branch Workflow

```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b feature/JIRA-123-user-auth

# 2. Develop in small commits
git add src/auth.js
git commit -m "feat(auth): add login endpoint"

# 3. Keep updated with main
git fetch origin
git rebase origin/main

# 4. Push and create PR
git push -u origin feature/JIRA-123-user-auth
# Create PR on GitHub/GitLab

# 5. Address review feedback
git add .
git commit -m "refactor(auth): improve error handling"
git push

# 6. After approval, merge
# Use GitHub/GitLab UI or:
git checkout main
git pull origin main
git merge --no-ff feature/JIRA-123-user-auth
git push origin main

# 7. Clean up
git branch -d feature/JIRA-123-user-auth
git push origin --delete feature/JIRA-123-user-auth
```

## Interview Questions

**Q1: What makes a good commit message?**
A: Clear, concise summary (<50 chars), detailed body explaining why (not what), follows conventional commit format, references issues, describes impact.

**Q2: How do you handle a secret accidentally committed to Git?**
A:
1. Remove from history: `git filter-repo --path secret.txt --invert-paths`
2. Force push: `git push --force`
3. **Immediately rotate the compromised secret**
4. Add to .gitignore
5. Implement pre-commit hooks to prevent recurrence

**Q3: What should be in .gitignore?**
A: Build artifacts, dependencies (node_modules/), secrets (.env), logs, OS files (.DS_Store), IDE configs, test coverage, and anything generated or personal.

**Q4: How large should a PR be?**
A: Ideally < 200 lines changed. Aim for 30-60 minute review time. Break larger changes into multiple PRs.

**Q5: What's the difference between merge and rebase in PRs?**
A: Merge creates a merge commit, preserving branch history. Rebase replays commits on top of main, creating linear history. Squash merge combines all commits into one.

## Summary

**Git Best Practices:**

1. **Commits:**
   - ✅ Atomic, focused changes
   - ✅ Conventional commit format
   - ✅ Clear, descriptive messages
   - ✅ Test before committing

2. **Branches:**
   - ✅ Descriptive naming: `type/ticket-description`
   - ✅ Short-lived (< 1 week)
   - ✅ Regularly updated from main
   - ✅ Clean up after merge

3. **Pull Requests:**
   - ✅ Small, reviewable size (< 400 lines)
   - ✅ Clear description with context
   - ✅ Link to issues/tickets
   - ✅ Include testing evidence

4. **Repository:**
   - ✅ Comprehensive .gitignore
   - ✅ Clear directory structure
   - ✅ Good documentation (README, CONTRIBUTING)
   - ✅ Security scanning (git-secrets)

5. **Security:**
   - ✅ Never commit secrets
   - ✅ Use .env files (gitignored)
   - ✅ Pre-commit hooks for validation
   - ✅ Rotate compromised secrets immediately

6. **Team Workflow:**
   - ✅ Feature branch workflow
   - ✅ Code review required
   - ✅ Automated testing
   - ✅ Protected main branch

**Key Insights:**
> - Good Git practices enable effective teamwork
> - Clear commit history is future documentation
> - Small, frequent commits are better than large, rare ones
> - Security should be baked into Git workflow
> - Automation (hooks, CI/CD) enforces best practices

---
[← Back: Branching Strategies](./03-branching-strategies.md) | [Next: Git Platforms →](./05-git-platforms.md)
