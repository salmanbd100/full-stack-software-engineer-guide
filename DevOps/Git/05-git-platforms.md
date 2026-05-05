# Git Platforms

## Overview

Git platforms add hosting, collaboration, CI/CD, and project management on top of Git. The three most common are GitHub, GitLab, and AWS CodeCommit.

**Platform comparison:**

| Feature | GitHub | GitLab | AWS CodeCommit |
|---------|--------|--------|----------------|
| **Hosting** | Cloud + Enterprise | Cloud + Self-hosted | AWS only |
| **CI/CD** | GitHub Actions | Built-in pipelines | CodePipeline |
| **Issue tracking** | ✅ Yes | ✅ Advanced | ❌ No |
| **Self-hosted** | Enterprise only | ✅ Free | ❌ No |
| **Container registry** | GHCR | ✅ Built-in | Use ECR |
| **Security scanning** | ✅ Built-in | ✅ Built-in | Use 3rd party |
| **AWS integration** | Good | Good | ✅ Excellent |
| **Market share** | ~70% | ~15% | ~5% |

---

## GitHub

### 💡 **The largest platform — best for open source and most teams**

**Key strengths:**
- Largest developer community (100M+ developers)
- Extensive marketplace for Actions and Apps
- GitHub Copilot integration
- Built-in secret scanning and Dependabot
- Strong ecosystem of third-party integrations

### GitHub Actions (CI/CD)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Lint + Test + Build
        run: |
          npm run lint
          npm test
          npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy
        run: aws s3 sync dist/ s3://my-bucket/
```

### Branch Protection

Set these in **Settings → Branches → Add rule**:

- ✅ Require pull request reviews (min 2 for critical branches)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date
- ✅ Require signed commits
- ✅ Do not allow force pushes
- ✅ Include administrators

### Useful CLI (gh)

```bash
gh pr create --title "Add feature X" --fill
gh pr list --state open
gh pr checkout 123                     # Check out a PR locally
gh pr merge 123 --squash

gh issue create --title "Bug: Login fails" --label bug
gh issue close 123 --comment "Fixed in PR #124"
```

### Security Features

- **Secret scanning** — automatically detects AWS credentials, GitHub tokens, API keys
- **Dependabot** — opens PRs for outdated or vulnerable dependencies
- **CodeQL** — static analysis for security vulnerabilities

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
```

**When to choose GitHub:**
- ✅ Open source project
- ✅ Want the largest ecosystem and marketplace
- ✅ Need GitHub Copilot
- ✅ Standard cloud-hosted workflow

---

## GitLab

### 💡 **Complete DevOps platform — everything built in**

**Key strengths:**
- Built-in CI/CD — no external service needed
- Self-hosted option with full features
- Built-in container registry
- Integrated security scanning (SAST, DAST)
- Advanced project management

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

variables:
  NODE_VERSION: "20"

test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - npm ci
  script:
    - npm run lint
    - npm test
    - npm run build

deploy:staging:
  stage: deploy
  script:
    - aws s3 sync dist/ s3://staging-bucket/
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy:production:
  stage: deploy
  script:
    - aws s3 sync dist/ s3://prod-bucket/
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual   # Require manual approval
```

**When to choose GitLab:**
- ✅ Want a complete DevOps platform in one tool
- ✅ Need self-hosted Git (compliance or security)
- ✅ Want built-in CI/CD without extra cost
- ✅ Advanced project management needed

---

## AWS CodeCommit

### 💡 **AWS-native Git — deep IAM integration**

**Key strengths:**
- IAM-based access control (no separate user management)
- Encrypted at rest and in transit by default
- Tight integration with CodeBuild, CodePipeline, CodeDeploy
- No repository size limits

**Limitations:**
- AWS only — cannot use outside of AWS
- Basic web UI compared to GitHub/GitLab
- No built-in issue tracking or project management
- Smaller community and fewer integrations

### Setup

```bash
# Configure Git credential helper for HTTPS
git config --global credential.helper \
  '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true

# Create a repository
aws codecommit create-repository \
  --repository-name my-repo \
  --repository-description "My app"

# Clone
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo
```

### CodePipeline Integration

```bash
# CodeCommit → CodeBuild → CodeDeploy pipeline
# Trigger: push to main → build → deploy to ECS/S3/EC2

aws codepipeline create-pipeline --cli-input-json file://pipeline.json
```

**When to choose CodeCommit:**
- ✅ AWS-native application
- ✅ IAM-based access control required
- ✅ Already using CodeBuild/CodePipeline/CodeDeploy
- ✅ Encryption at rest required by policy
- ❌ Need issue tracking or project management

---

## Platform Selection Guide

| Situation | Use |
|-----------|-----|
| Open source project | GitHub |
| SaaS startup, fast iteration | GitHub |
| Enterprise, need self-hosted | GitLab |
| Complete DevOps in one tool | GitLab |
| AWS-native, IAM access control | CodeCommit |
| Heavy AWS DevOps toolchain | CodeCommit |

---

## Interview Q&A

**Q: What's the difference between GitHub Actions and GitLab CI?**

GitHub Actions uses YAML workflows with a large marketplace of reusable actions. It runs on GitHub-hosted or self-hosted runners. GitLab CI is built into GitLab with `.gitlab-ci.yml`, includes its own runners, and is part of a single platform. GitLab CI is more tightly integrated; GitHub Actions has a larger ecosystem.

---

**Q: Why would you choose GitLab over GitHub?**

When you need self-hosted Git (for compliance), built-in CI/CD without extra cost, or a single integrated platform covering planning, source, CI/CD, and monitoring.

---

**Q: What are branch protection rules and why do they matter?**

They prevent direct pushes to important branches, require code review, and enforce CI checks before merging. They stop accidental changes to production and enforce team standards automatically.

---

**Q: What security features should be enabled on a Git platform?**

Branch protection, required code review, required CI status checks, secret scanning, dependency scanning, CODEOWNERS file, signed commits, and two-factor authentication.

---

[← Best Practices](./04-best-practices.md) | [Next: Repository Strategies →](./06-repository-strategies.md)
