# Git Platforms: GitHub, GitLab, AWS CodeCommit

## Overview

Git platforms provide hosting, collaboration tools, CI/CD integration, and project management features on top of Git. Understanding platform-specific features is essential for modern DevOps workflows.

**Platform Comparison:**

| Feature | GitHub | GitLab | AWS CodeCommit |
|---------|--------|--------|----------------|
| **Hosting** | Cloud, Enterprise | Cloud, Self-hosted | AWS Cloud only |
| **CI/CD** | GitHub Actions | Built-in CI/CD | CodePipeline integration |
| **Free Tier** | Unlimited public repos | Unlimited repos | 5 users, 50 GB |
| **Best For** | Open source, teams | Complete DevOps | AWS-native apps |
| **Pricing** | $4/user/month | $19/user/month | Pay as you go |
| **Market Share** | ~70% | ~15% | ~5% |

## GitHub

### 💡 **GitHub Overview**

GitHub is the largest code hosting platform with 100M+ developers. It's the de facto standard for open source and widely used in enterprise.

**Key Strengths:**
- Largest developer community
- Extensive marketplace (Actions, Apps)
- Excellent documentation
- GitHub Copilot integration
- Strong security features (Dependabot, secret scanning)

### GitHub Repositories

```bash
# ========================================
# Repository Management
# ========================================

# Create repository via CLI
gh repo create my-project --public --clone
gh repo create my-project --private --source=.

# Clone repository
git clone https://github.com/username/repo.git
git clone git@github.com:username/repo.git  # SSH

# Fork repository
gh repo fork owner/repo --clone

# View repository info
gh repo view
gh repo view owner/repo --web

# Repository settings via CLI
gh repo edit --description "My awesome project"
gh repo edit --visibility public
gh repo edit --enable-issues=false
gh repo edit --enable-wiki=false

# ========================================
# Branch Protection
# ========================================

# Enable branch protection (via web UI or API)
# Settings → Branches → Add rule

# Common protections:
- Require pull request reviews (minimum 2)
- Require status checks to pass
- Require branches to be up to date
- Require conversation resolution
- Require signed commits
- Include administrators
- Restrict push access
- Allow force pushes (not recommended)
- Allow deletions (not recommended)

# Via GitHub API
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/branches/main/protection \
  -d '{
    "required_pull_request_reviews": {
      "required_approving_review_count": 2
    },
    "required_status_checks": {
      "strict": true,
      "contexts": ["ci/build", "ci/test"]
    },
    "enforce_admins": true,
    "restrictions": null
  }'
```

### Pull Requests

```bash
# ========================================
# Pull Request Management
# ========================================

# Create pull request
gh pr create --title "Add feature X" --body "Description"
gh pr create --fill  # Use commit messages
gh pr create --draft # Create draft PR

# List pull requests
gh pr list
gh pr list --state all
gh pr list --author @me
gh pr list --label bug

# View pull request
gh pr view 123
gh pr view 123 --web
gh pr view 123 --comments

# Checkout pull request locally
gh pr checkout 123

# Review pull request
gh pr review 123 --approve
gh pr review 123 --request-changes --body "Please fix..."
gh pr review 123 --comment --body "Looks good"

# Merge pull request
gh pr merge 123 --merge      # Merge commit
gh pr merge 123 --squash     # Squash and merge
gh pr merge 123 --rebase     # Rebase and merge

# Close pull request
gh pr close 123

# Reopen pull request
gh pr reopen 123

# ========================================
# PR Templates
# ========================================

# .github/pull_request_template.md
cat > .github/pull_request_template.md << 'EOF'
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
EOF
```

### GitHub Actions

```yaml
# ========================================
# GitHub Actions Workflows
# ========================================

# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build
        run: npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: aws s3 sync dist/ s3://my-bucket/
```

```yaml
# ========================================
# Reusable Workflows
# ========================================

# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      aws-access-key-id:
        required: true
      aws-secret-access-key:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to ${{ inputs.environment }}
        run: ./deploy.sh ${{ inputs.environment }}

# Usage in another workflow:
# .github/workflows/prod-deploy.yml
name: Production Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
    secrets:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### GitHub Issues

```bash
# ========================================
# Issue Management
# ========================================

# Create issue
gh issue create --title "Bug: Login fails" --body "Description"
gh issue create --label bug,urgent --assignee @me

# List issues
gh issue list
gh issue list --state open
gh issue list --label bug
gh issue list --assignee @me

# View issue
gh issue view 123
gh issue view 123 --web
gh issue view 123 --comments

# Close issue
gh issue close 123 --comment "Fixed in PR #124"

# Reopen issue
gh issue reopen 123

# ========================================
# Issue Templates
# ========================================

# .github/ISSUE_TEMPLATE/bug_report.md
---
name: Bug Report
about: Report a bug
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Browser: [e.g. Chrome 110]
 - Version: [e.g. 1.2.0]

**Additional context**
Any other information about the problem.
```

### GitHub Security

```bash
# ========================================
# Security Features
# ========================================

# Dependabot (automatic dependency updates)
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "devops-team"
    labels:
      - "dependencies"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

# Secret scanning (automatic)
# GitHub automatically scans for:
# - AWS credentials
# - GitHub tokens
# - Private keys
# - API keys from popular services

# Code scanning (CodeQL)
# .github/workflows/codeql.yml
name: "CodeQL"

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v3

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, python

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

## GitLab

### 💡 **GitLab Overview**

GitLab is a complete DevOps platform with built-in CI/CD, issue tracking, and deployment tools. It offers both cloud and self-hosted options.

**Key Strengths:**
- Complete DevOps platform (single application)
- Built-in CI/CD (no external service needed)
- Self-hosted option with full features
- Integrated security scanning
- Comprehensive project management

### GitLab CI/CD

```yaml
# ========================================
# GitLab CI/CD Pipeline
# ========================================

# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "18"
  AWS_DEFAULT_REGION: "us-east-1"

# Templates for reuse
.node_template: &node_template
  image: node:${NODE_VERSION}
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - npm ci

# Build stage
build:
  <<: *node_template
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

# Test stages (parallel)
test:unit:
  <<: *node_template
  stage: test
  script:
    - npm run test:unit
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:integration:
  <<: *node_template
  stage: test
  services:
    - postgres:14
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
  script:
    - npm run test:integration

lint:
  <<: *node_template
  stage: test
  script:
    - npm run lint

security:
  stage: test
  image: registry.gitlab.com/gitlab-org/security-products/analyzers/nodejs-scan:2
  script:
    - npm audit
  allow_failure: true

# Deploy stages
deploy:staging:
  stage: deploy
  image: registry.gitlab.com/gitlab-org/cloud-deploy/aws-base:latest
  script:
    - aws s3 sync dist/ s3://staging-bucket/
    - aws cloudfront create-invalidation --distribution-id $STAGING_DISTRIBUTION_ID --paths "/*"
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy:production:
  stage: deploy
  image: registry.gitlab.com/gitlab-org/cloud-deploy/aws-base:latest
  script:
    - aws s3 sync dist/ s3://production-bucket/
    - aws cloudfront create-invalidation --distribution-id $PROD_DISTRIBUTION_ID --paths "/*"
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual  # Require manual approval
```

### GitLab Merge Requests

```bash
# ========================================
# Merge Request Management (via CLI)
# ========================================

# Install glab CLI
brew install glab

# Authenticate
glab auth login

# Create merge request
glab mr create --title "Add feature X" --description "Description"
glab mr create --fill  # Use commit messages
glab mr create --draft

# List merge requests
glab mr list
glab mr list --state merged
glab mr list --author @me

# View merge request
glab mr view 123
glab mr view 123 --web
glab mr view 123 --comments

# Approve merge request
glab mr approve 123

# Merge merge request
glab mr merge 123

# Close merge request
glab mr close 123
```

### GitLab Runner (Self-Hosted)

```bash
# ========================================
# GitLab Runner Setup
# ========================================

# Install GitLab Runner (Ubuntu)
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt-get install gitlab-runner

# Register runner
sudo gitlab-runner register \
  --url https://gitlab.com/ \
  --registration-token $REGISTRATION_TOKEN \
  --executor docker \
  --docker-image alpine:latest \
  --description "docker-runner" \
  --tag-list "docker,aws" \
  --run-untagged="true" \
  --locked="false"

# Start runner
sudo gitlab-runner start

# Check runner status
sudo gitlab-runner status

# View runners
sudo gitlab-runner list

# Runner configuration
# /etc/gitlab-runner/config.toml
concurrent = 4
check_interval = 0

[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com/"
  token = "xxx"
  executor = "docker"
  [runners.docker]
    image = "alpine:latest"
    privileged = false
    volumes = ["/cache"]
    shm_size = 0
  [runners.cache]
    Type = "s3"
    Path = "runner"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      BucketName = "runner-cache"
      BucketLocation = "us-east-1"
```

## AWS CodeCommit

### 💡 **AWS CodeCommit Overview**

CodeCommit is AWS's managed Git service, deeply integrated with AWS services. Best for teams already using AWS infrastructure.

**Key Strengths:**
- Tight AWS integration
- IAM-based access control
- Encrypted repositories
- No repository size limits
- Pay only for what you use

**Limitations:**
- AWS-only (no standalone use)
- Basic web UI (no advanced features)
- Smaller community
- Limited third-party integrations

### CodeCommit Setup

```bash
# ========================================
# AWS CodeCommit Configuration
# ========================================

# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1
# Default output format: json

# Configure Git credentials helper
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true

# Alternative: SSH configuration
# 1. Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 2. Upload public key to IAM
aws iam upload-ssh-public-key \
  --user-name your-username \
  --ssh-public-key-body file://~/.ssh/id_rsa.pub

# 3. Get SSH Key ID
aws iam list-ssh-public-keys --user-name your-username

# 4. Configure SSH
cat >> ~/.ssh/config << EOF
Host git-codecommit.*.amazonaws.com
  User YOUR_SSH_KEY_ID
  IdentityFile ~/.ssh/id_rsa
EOF

# ========================================
# Repository Management
# ========================================

# Create repository
aws codecommit create-repository \
  --repository-name my-repo \
  --repository-description "My application repository"

# List repositories
aws codecommit list-repositories

# Get repository details
aws codecommit get-repository --repository-name my-repo

# Clone repository (HTTPS)
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo

# Clone repository (SSH)
git clone ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo

# Delete repository
aws codecommit delete-repository --repository-name my-repo

# ========================================
# Branch Management
# ========================================

# List branches
aws codecommit list-branches --repository-name my-repo

# Create branch
aws codecommit create-branch \
  --repository-name my-repo \
  --branch-name feature/new-feature \
  --commit-id abc123

# Get branch
aws codecommit get-branch \
  --repository-name my-repo \
  --branch-name main

# Update default branch
aws codecommit update-default-branch \
  --repository-name my-repo \
  --default-branch-name main

# Delete branch
aws codecommit delete-branch \
  --repository-name my-repo \
  --branch-name feature/old-feature
```

### CodeCommit Pull Requests

```bash
# ========================================
# Pull Request Management
# ========================================

# Create pull request
aws codecommit create-pull-request \
  --title "Add new feature" \
  --description "This PR adds feature X" \
  --targets repositoryName=my-repo,sourceReference=feature/new-feature,destinationReference=main

# List pull requests
aws codecommit list-pull-requests \
  --repository-name my-repo \
  --pull-request-status OPEN

# Get pull request
aws codecommit get-pull-request \
  --pull-request-id 1

# Update pull request
aws codecommit update-pull-request-description \
  --pull-request-id 1 \
  --description "Updated description"

# Post comment on pull request
aws codecommit post-comment-for-pull-request \
  --pull-request-id 1 \
  --repository-name my-repo \
  --before-commit-id abc123 \
  --after-commit-id def456 \
  --content "Looks good!"

# Merge pull request
aws codecommit merge-pull-request-by-fast-forward \
  --pull-request-id 1 \
  --repository-name my-repo

# Close pull request
aws codecommit update-pull-request-status \
  --pull-request-id 1 \
  --pull-request-status CLOSED
```

### CodeCommit with CodePipeline

```yaml
# ========================================
# CodePipeline Integration
# ========================================

# CloudFormation template for pipeline
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # CodeCommit Repository
  MyRepository:
    Type: AWS::CodeCommit::Repository
    Properties:
      RepositoryName: my-app
      RepositoryDescription: My application

  # CodeBuild Project
  MyBuildProject:
    Type: AWS::CodeBuild::Project
    Properties:
      Name: my-app-build
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Artifacts:
        Type: CODEPIPELINE
      Environment:
        Type: LINUX_CONTAINER
        ComputeType: BUILD_GENERAL1_SMALL
        Image: aws/codebuild/standard:5.0
      Source:
        Type: CODEPIPELINE
        BuildSpec: |
          version: 0.2
          phases:
            install:
              runtime-versions:
                nodejs: 18
            pre_build:
              commands:
                - npm ci
            build:
              commands:
                - npm test
                - npm run build
          artifacts:
            files:
              - '**/*'
            base-directory: dist

  # CodePipeline
  MyPipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: my-app-pipeline
      RoleArn: !GetAtt CodePipelineRole.Arn
      ArtifactStore:
        Type: S3
        Location: !Ref ArtifactBucket
      Stages:
        - Name: Source
          Actions:
            - Name: SourceAction
              ActionTypeId:
                Category: Source
                Owner: AWS
                Provider: CodeCommit
                Version: '1'
              Configuration:
                RepositoryName: !GetAtt MyRepository.Name
                BranchName: main
              OutputArtifacts:
                - Name: SourceOutput

        - Name: Build
          Actions:
            - Name: BuildAction
              ActionTypeId:
                Category: Build
                Owner: AWS
                Provider: CodeBuild
                Version: '1'
              Configuration:
                ProjectName: !Ref MyBuildProject
              InputArtifacts:
                - Name: SourceOutput
              OutputArtifacts:
                - Name: BuildOutput

        - Name: Deploy
          Actions:
            - Name: DeployAction
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: S3
                Version: '1'
              Configuration:
                BucketName: !Ref DeployBucket
                Extract: true
              InputArtifacts:
                - Name: BuildOutput
```

## Platform Comparison for DevOps

### Feature Matrix

| Feature | GitHub | GitLab | CodeCommit |
|---------|--------|--------|------------|
| **Repository Hosting** | ✅ Excellent | ✅ Excellent | ✅ Good |
| **CI/CD** | GitHub Actions | Built-in CI/CD | CodePipeline |
| **Issue Tracking** | ✅ Yes | ✅ Advanced | ❌ No |
| **Wiki** | ✅ Yes | ✅ Yes | ❌ No |
| **Code Review** | ✅ Pull Requests | ✅ Merge Requests | ✅ Basic |
| **Self-Hosted** | Enterprise only | ✅ Yes | ❌ No |
| **Container Registry** | GHCR | ✅ Built-in | ❌ Use ECR |
| **Security Scanning** | ✅ Built-in | ✅ Built-in | ❌ Use 3rd party |
| **Project Management** | ✅ Projects | ✅ Advanced | ❌ No |
| **AWS Integration** | ✅ Good | ✅ Good | ✅ Excellent |
| **API** | ✅ Extensive | ✅ Extensive | ✅ AWS SDK |

### When to Use Each Platform

**Choose GitHub if:**
- ✅ Open source project
- ✅ Large developer community matters
- ✅ Want extensive marketplace
- ✅ Need GitHub Copilot
- ✅ Standard cloud workflows

**Choose GitLab if:**
- ✅ Want complete DevOps platform
- ✅ Need self-hosted option
- ✅ Want built-in CI/CD
- ✅ Advanced project management needed
- ✅ Prefer single integrated tool

**Choose CodeCommit if:**
- ✅ AWS-native applications
- ✅ IAM-based access control
- ✅ Heavy AWS integration needed
- ✅ Want AWS encryption by default
- ✅ Already using AWS DevOps tools

## Interview Questions

**Q1: What's the difference between GitHub Actions and GitLab CI?**
A: GitHub Actions uses YAML workflows with marketplace actions, runs on GitHub-hosted or self-hosted runners. GitLab CI is built into GitLab, uses .gitlab-ci.yml, and includes GitLab Runners. GitLab CI is more tightly integrated as a single platform.

**Q2: How does AWS CodeCommit differ from GitHub?**
A: CodeCommit is AWS-managed Git with IAM integration, best for AWS-native apps. GitHub offers superior UI, community, marketplace, and project management features. CodeCommit lacks issues, wikis, and advanced collaboration tools.

**Q3: What are branch protection rules and why are they important?**
A: Branch protection prevents direct pushes to important branches, requires PR reviews, enforces status checks, and prevents force pushes. Critical for maintaining code quality and preventing accidental changes to production.

**Q4: How do you integrate Git platforms with CI/CD?**
A:
- GitHub: GitHub Actions workflows
- GitLab: .gitlab-ci.yml with GitLab Runners
- CodeCommit: AWS CodePipeline integration
All support webhooks for custom integrations.

**Q5: What security features should be enabled on Git platforms?**
A: Branch protection, required code reviews, required status checks, secret scanning, dependency scanning, CODEOWNERS file, signed commits, and two-factor authentication.

## Summary

**Git Platforms Overview:**

1. **GitHub:**
   - ✅ Largest community and ecosystem
   - ✅ GitHub Actions for CI/CD
   - ✅ Excellent for open source
   - ✅ Copilot and advanced security
   - ❌ Limited self-hosted options

2. **GitLab:**
   - ✅ Complete DevOps platform
   - ✅ Built-in CI/CD runners
   - ✅ Self-hosted with full features
   - ✅ Advanced project management
   - ❌ Smaller community than GitHub

3. **AWS CodeCommit:**
   - ✅ Deep AWS integration
   - ✅ IAM-based security
   - ✅ Encrypted by default
   - ❌ Basic features only
   - ❌ AWS-only platform

4. **Platform Selection:**
   - **Open source**: GitHub
   - **Complete DevOps**: GitLab
   - **AWS-native**: CodeCommit
   - **Enterprise self-hosted**: GitLab

5. **Common Features:**
   - Repository hosting
   - Branch protection
   - Code review (PR/MR)
   - CI/CD integration
   - Security scanning

**Key Insights:**
> - GitHub dominates market share and community
> - GitLab offers most complete single-platform solution
> - CodeCommit best for AWS-centric workflows
> - All support modern DevOps workflows
> - Choose based on team needs, not features alone

---
[← Back: Best Practices](./04-best-practices.md) | [Next: Repository Strategies →](./06-repository-strategies.md)
