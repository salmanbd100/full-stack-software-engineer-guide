---
title: AWS CodePipeline
part: 8
chapter: 0
slug: aws-codepipeline
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-03
tags: [devops, cicd, aws, codepipeline]
in_book: false
---

# AWS CodePipeline

CodePipeline is AWS's managed CI/CD orchestrator. It does not build or deploy anything itself — it wires together other services in stages.

## The AWS Developer Tools Family

Knowing which service does what is the first thing interviewers check.

| Service | Role | Equivalent |
|---------|------|-----------|
| **CodeCommit** | Managed Git repository | GitHub, GitLab |
| **CodeBuild** | Runs build and test commands in a container | GitHub Actions runner |
| **CodeDeploy** | Deploys to EC2, ECS, Lambda, on-prem | Deployment tool |
| **CodePipeline** | Orchestrates the stages | The pipeline itself |
| **CodeArtifact** | Package registry (npm, Maven, PyPI) | Artifactory, npm registry |

```
CodePipeline (orchestrator)
├── Source stage    → CodeCommit / GitHub / S3 / ECR
├── Build stage     → CodeBuild (runs buildspec.yml)
├── Test stage      → CodeBuild
├── Approval stage  → manual approval via SNS
└── Deploy stage    → CodeDeploy / ECS / CloudFormation / S3
```

> CodePipeline is glue. The real work happens in CodeBuild and CodeDeploy.

## When to Use CodePipeline

✅ **Good fit:**
- Everything already lives in AWS and you want IAM-native permissions
- Cross-account deployments (dev account → prod account)
- Compliance requires the pipeline itself to be in your AWS account
- You need CloudFormation or CDK deployments with change-set review

❌ **Poor fit:**
- Your code is on GitHub and your team already uses GitHub Actions
- You need a large marketplace of prebuilt integrations
- Multi-cloud deployment targets

> In real interviews, the honest answer is often: "We used GitHub Actions for build and test, and CodePipeline only where cross-account IAM made it simpler."

## CodeBuild and `buildspec.yml`

CodeBuild runs your commands inside a container. The `buildspec.yml` at the repo root defines the phases.

```yaml
version: 0.2

env:
  variables:
    NODE_ENV: production
  parameter-store:
    # Pulled from SSM Parameter Store at build time
    SONAR_TOKEN: /ci/sonar/token
  secrets-manager:
    NPM_TOKEN: prod/npm:token

phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - npm ci

  pre_build:
    commands:
      - echo Logging in to Amazon ECR
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
      - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-7)

  build:
    commands:
      - npm run lint
      - npm test -- --coverage
      - docker build -t $ECR_REGISTRY/api:$IMAGE_TAG .

  post_build:
    commands:
      - docker push $ECR_REGISTRY/api:$IMAGE_TAG
      # imagedefinitions.json tells the ECS deploy action which image to use
      - printf '[{"name":"api","imageUri":"%s"}]' $ECR_REGISTRY/api:$IMAGE_TAG > imagedefinitions.json

reports:
  jest:
    files:
      - 'junit.xml'
    file-format: JUNITXML

artifacts:
  files:
    - imagedefinitions.json
    - appspec.yaml

cache:
  paths:
    - 'node_modules/**/*'
```

**Phases in order:** `install` → `pre_build` → `build` → `post_build`. If a phase fails, later phases are skipped (but `post_build` still runs by default when `build` fails, which is useful for uploading logs).

**Useful built-in variables:**

| Variable | Value |
|----------|-------|
| `CODEBUILD_RESOLVED_SOURCE_VERSION` | Full commit SHA |
| `CODEBUILD_BUILD_ID` | Unique build identifier |
| `CODEBUILD_WEBHOOK_TRIGGER` | `pr/42` or `branch/main` |
| `AWS_REGION` | Region of the build |

✅ Use `parameter-store` and `secrets-manager` blocks in `env` — never hardcode credentials or pass them as plaintext environment variables.

⚠️ CodeBuild needs `privileged: true` on the project to build Docker images, because it needs access to the Docker daemon.

## Artifacts Between Stages

CodePipeline passes artifacts between stages through an **S3 artifact bucket**.

```
Source stage  → SourceArtifact (zipped repo) → S3
                      ↓
Build stage   → reads SourceArtifact, writes BuildArtifact → S3
                      ↓
Deploy stage  → reads BuildArtifact
```

✅ Encrypt the artifact bucket with KMS. It contains your source code and build outputs.

⚠️ Only files listed under `artifacts:` in `buildspec.yml` are passed forward. A missing `imagedefinitions.json` is the most common cause of a failing ECS deploy stage.

## CodeDeploy Deployment Types

CodeDeploy behaves differently per compute platform.

| Platform | Strategies Available |
|----------|---------------------|
| **ECS** | Blue/green with traffic shifting (canary, linear, all-at-once) |
| **Lambda** | Alias traffic shifting (canary, linear, all-at-once) |
| **EC2 / on-prem** | In-place or blue/green, with `appspec.yml` lifecycle hooks |

**Predefined traffic-shifting configs:**

| Config | Behaviour |
|--------|-----------|
| `AllAtOnce` | 100% immediately |
| `Canary10Percent5Minutes` | 10% for 5 min, then 100% |
| `Linear10PercentEvery1Minute` | +10% each minute |

**`appspec.yaml` for ECS blue/green:**

```yaml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: "api"
          ContainerPort: 3000
Hooks:
  # Runs against the green target group BEFORE traffic shifts
  - AfterAllowTestTraffic: "arn:aws:lambda:us-east-1:123456789:function:smoke-tests"
```

✅ Use the `AfterAllowTestTraffic` hook to run smoke tests against the new version before real users reach it. If the Lambda returns failure, CodeDeploy rolls back automatically.

## Defining the Pipeline in Terraform

The pipeline itself should be infrastructure as code.

```hcl
resource "aws_codepipeline" "api" {
  name     = "api-pipeline"
  role_arn = aws_iam_role.pipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
    encryption_key {
      id   = aws_kms_key.artifacts.arn
      type = "KMS"
    }
  }

  stage {
    name = "Source"
    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"  # modern GitHub integration
      version          = "1"
      output_artifacts = ["source"]
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "acme/api"
        BranchName       = "main"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source"]
      output_artifacts = ["build"]
      configuration = { ProjectName = aws_codebuild_project.api.name }
    }
  }

  stage {
    name = "ApproveProd"
    action {
      name     = "ManualApproval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"
      configuration = { NotificationArn = aws_sns_topic.approvals.arn }
    }
  }

  stage {
    name = "DeployProd"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build"]
      configuration = {
        ClusterName = "prod-cluster"
        ServiceName = "api"
        FileName    = "imagedefinitions.json"
      }
    }
  }
}
```

✅ Use **CodeStar Connections** for GitHub, not the deprecated OAuth token or webhook approach.

## Cross-Account Deployment

This is the pattern CodePipeline handles better than most tools, and a favourite senior interview question.

```
Tooling account (pipeline lives here)
├── CodePipeline + CodeBuild
├── S3 artifact bucket   ← KMS key shared with prod account
└── assumes role ─────────┐
                          ↓
              Production account
              └── CrossAccountDeployRole (trusts tooling account)
                  └── deploys to ECS / CloudFormation
```

**The three things you must get right:**

1. The artifact S3 bucket policy must allow the target account to read
2. The **KMS key** policy must allow the target account to decrypt — this is the step people forget
3. The target account role must trust the tooling account, and the pipeline role must be allowed to `sts:AssumeRole` into it

⚠️ "Cross-account CodePipeline fails at the deploy stage" is almost always a KMS key policy problem, not an S3 or IAM role problem.

## CodePipeline vs GitHub Actions

| | CodePipeline | GitHub Actions |
|-|-------------|----------------|
| **Setup effort** | Higher (IAM, buckets, roles) | Very low |
| **AWS IAM integration** | Native | Via OIDC |
| **Ecosystem** | Small | Huge marketplace |
| **Cross-account** | First-class | Possible, more manual |
| **Cost model** | Per active pipeline + build minutes | Free tier, then per-minute |
| **Runs on your VPC** | ✅ CodeBuild in VPC | Needs self-hosted runners |
| **Best for** | AWS-only, compliance-heavy | Most teams |

## Interview Q&A

**Q: Walk me through a CI/CD pipeline on AWS for a containerized service.**

A push to `main` triggers CodePipeline through a CodeStar Connection. The Source stage pulls the repo into the S3 artifact bucket. The Build stage runs CodeBuild against `buildspec.yml`, which installs dependencies, runs lint and unit tests, builds a Docker image tagged with the commit SHA, pushes it to ECR, and emits `imagedefinitions.json` as an artifact. A test stage runs integration tests against a dev deployment. A manual approval stage notifies the team through SNS. The final stage uses CodeDeploy blue/green to shift traffic to the new ECS task set, with a smoke-test Lambda in the `AfterAllowTestTraffic` hook so a failure triggers automatic rollback.

**Q: What is the difference between CodeBuild and CodeDeploy?**

CodeBuild is a build service — it spins up a container, runs the commands in `buildspec.yml`, and produces artifacts. It handles compiling, testing, and packaging. CodeDeploy is a deployment service — it takes an already-built artifact and rolls it out to compute targets, managing traffic shifting, health checks, and rollback. CodeBuild produces the thing; CodeDeploy moves the thing into production safely. CodePipeline orchestrates both.

**Q: How does a cross-account deployment work in CodePipeline?**

The pipeline lives in a central tooling account. The artifact bucket must be encrypted with a customer-managed KMS key whose policy grants decrypt permission to the target account, and the bucket policy must grant that account read access. In the target account you create a deployment role that trusts the tooling account, and the pipeline's role is granted `sts:AssumeRole` on it. The pipeline's deploy action specifies the target account's role ARN. The common failure is forgetting the KMS key policy — the pipeline can list the artifact but cannot decrypt it, and the deploy stage fails with an access error.

**Q: How do you handle secrets in CodeBuild?**

Reference them in the `env` block using `parameter-store` for SSM Parameter Store values or `secrets-manager` for Secrets Manager values. CodeBuild fetches them at build start and injects them as environment variables, so the values never live in the repository or the project configuration. The CodeBuild service role needs read permission on the specific parameter or secret ARNs. Avoid plaintext `env.variables` for anything sensitive, since those values are visible in the project definition and in build logs.

**Q: Why would you choose CodePipeline over GitHub Actions?**

Mainly for AWS-native permissions and compliance. CodeBuild can run inside your VPC with no public runner, IAM handles authorization without any federated identity setup, and cross-account deployments with KMS-encrypted artifacts are a supported first-class pattern. If an audit requires the entire build and deploy process to run inside your own AWS account with CloudTrail coverage, CodePipeline is the straightforward answer. For everything else, GitHub Actions is usually faster to build and easier to maintain.

---

[← CI/CD Fundamentals](./01-cicd-fundamentals.md) | [GitHub Actions →](./03-github-actions.md)
