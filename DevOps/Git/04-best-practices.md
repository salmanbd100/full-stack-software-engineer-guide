# Git Best Practices

## Commit Messages

### 💡 **Use Conventional Commits**

A standard format makes history readable and enables automated changelogs.

**Format:**

```
<type>(<scope>): <subject>

<body — explain WHY, optional>

<footer — issue refs, breaking changes>
```

**Types:**

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(api): add user auth` |
| `fix` | Bug fix | `fix(auth): resolve token expiry` |
| `docs` | Documentation | `docs(readme): add setup steps` |
| `refactor` | No behavior change | `refactor(db): simplify queries` |
| `test` | Tests | `test(api): add user endpoint tests` |
| `chore` | Maintenance | `chore(deps): upgrade react to v19` |
| `ci` | CI/CD changes | `ci: add docker build step` |
| `perf` | Performance | `perf(db): add index on user_id` |

**Good vs bad:**

❌ **Bad:**
```bash
git commit -m "fix"
git commit -m "stuff"
git commit -m "updated files"
git commit -m "fixed login and added tests and updated docs"
```

✅ **Good:**
```bash
git commit -m "fix(auth): resolve login redirect loop"
git commit -m "feat(api): add user profile endpoint"
git commit -m "test(auth): add integration tests for login"
```

**Atomic commits — one logical change per commit:**

✅ Good:
```bash
git commit -m "feat(api): add user endpoint"
git commit -m "test(api): add user endpoint tests"
```

❌ Bad:
```bash
git commit -m "added endpoint, wrote tests, fixed bug, updated docs"
```

> A good commit message explains **why** the change was made, not just what changed.

---

## Branch Naming

**Format:** `<type>/<ticket-id>-<brief-description>`

✅ Good branch names:
```
feature/JIRA-123-user-authentication
fix/JIRA-456-memory-leak
hotfix/security-patch-xss
refactor/database-layer
docs/api-documentation
```

❌ Bad branch names:
```
my-branch
fix-bug
test
temp
johns-work
```

**Branch lifespan:**
- ✅ 1–3 days: ideal
- ⚠️ > 1 week: getting stale
- 🔴 > 2 weeks: merge conflicts guaranteed

**Keep branches updated:**

```bash
git fetch origin
git rebase origin/main     # Rebase onto latest main
git push --force-with-lease
```

---

## Pull Request Best Practices

### 💡 **Small PRs are reviewed faster and merged sooner**

| Lines changed | Review time | Status |
|---------------|------------|--------|
| 0–200 | 5–30 min | ✅ Good |
| 200–400 | 30–60 min | ⚠️ Large |
| 400+ | 1–2+ hours | 🔴 Split it up |

**Before creating a PR:**

```bash
git diff main..HEAD          # Review your own changes first
npm test && npm run lint      # Tests and lint must pass
git fetch origin
git rebase origin/main        # Update from main
```

**A good PR has:**
- ✅ Short, clear title (`feat(auth): add OAuth login`)
- ✅ Description that explains *why*, not just *what*
- ✅ Link to the issue or ticket
- ✅ Screenshots if there's a UI change
- ✅ Test evidence

**PR merge options:**

| Method | Result | When to use |
|--------|--------|-------------|
| **Merge commit** | Preserves all commits + branch history | Want full history |
| **Squash merge** | Single commit on main | Messy WIP history |
| **Rebase merge** | Linear history, no merge commit | Clean history preference |

---

## Security

### 💡 **Never commit secrets**

❌ Never do this:
```bash
const API_KEY = "sk_live_abc123xyz"
const DB_PASSWORD = "admin123"
```

✅ Always do this:
```typescript
const apiKey: string = process.env.API_KEY ?? '';
const dbPassword: string = process.env.DB_PASSWORD ?? '';
```

**Prevent secrets from entering Git:**

```bash
# Check staged changes for secrets before committing
git diff --cached | grep -iE 'password|secret|key|token|api_key'

# Use git-secrets to block AWS credentials
git secrets --install
git secrets --register-aws
```

**If you committed a secret:**

1. Remove from history: `git filter-repo --path secrets.txt --invert-paths`
2. Force push: `git push --force-with-lease`
3. **Rotate the secret immediately** — assume it was seen

**What to put in `.gitignore`:**

```bash
# Secrets
.env
.env.*
*.pem
*.key
credentials.json
.aws/credentials

# Dependencies
node_modules/
vendor/

# Build
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Terraform
*.tfstate
*.tfstate.backup
.terraform/
```

---

## Repository Hygiene

**Clean up merged branches:**

```bash
# Delete all local branches merged into main
git branch --merged main | grep -v "main" | xargs git branch -d

# Remove local references to deleted remote branches
git fetch --prune
```

**Protect important branches (set up in GitHub/GitLab):**
- ✅ Require PR reviews (min 2 for critical paths)
- ✅ Require status checks (CI must pass)
- ✅ Disable force push on `main`
- ✅ Require branches to be up to date

---

## Interview Q&A

**Q: What makes a good commit message?**

It uses conventional commit format, has a short subject under 50 characters, and explains **why** the change was made (not just what). The body adds context for reviewers and future maintainers.

---

**Q: How do you handle a secret accidentally committed to Git?**

1. Remove from all history with `git filter-repo`
2. Force push
3. Rotate the secret — assume it is compromised
4. Add the path to `.gitignore`
5. Add a pre-commit hook to catch future mistakes

---

**Q: How large should a PR be?**

Under 400 lines changed is a good target. If a PR takes more than an hour to review, split it into smaller logical chunks.

---

**Q: What should be in `.gitignore`?**

Secrets, build artifacts, dependencies, IDE files, OS files, logs, and anything auto-generated at runtime. Never commit things that can be regenerated or that contain sensitive information.

---

[← Branching Strategies](./03-branching-strategies.md) | [Next: Git Platforms →](./05-git-platforms.md)
