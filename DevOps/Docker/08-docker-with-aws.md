# Docker with AWS

## Amazon ECR (Container Registry)

ECR is AWS's managed Docker registry — integrated with IAM, includes image scanning and lifecycle policies.

### Create Repository
```bash
aws ecr create-repository \
  --repository-name myapp \
  --region us-east-1
```

### Authenticate and Push
```bash
# Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build, tag, push
docker build -t myapp:v1 .
docker tag myapp:v1 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1
```

### Lifecycle Policy (Auto-cleanup Old Images)
```json
{
  "rules": [{
    "rulePriority": 1,
    "description": "Keep last 10 images",
    "selection": {
      "tagStatus": "any",
      "countType": "imageCountMoreThan",
      "countNumber": 10
    },
    "action": { "type": "expire" }
  }]
}
```

## Amazon ECS (Container Orchestration)

ECS runs containers on AWS. Two launch types:

| Launch Type | You Manage | Best For |
|-------------|-----------|----------|
| **Fargate** | Nothing (serverless) | Simplicity, most use cases |
| **EC2** | EC2 instances | Cost control, GPU, custom instances |

## ECS Task Definition

A task definition is like a Docker Compose service — it defines what runs and how.

```json
{
  "family": "myapp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [{
    "name": "api",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
    "portMappings": [{"containerPort": 3000}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"}
    ],
    "secrets": [
      {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/db"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/myapp",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }]
}
```

## Deploy to ECS Fargate

```bash
# Create cluster
aws ecs create-cluster --cluster-name myapp-cluster

# Create service
aws ecs create-service \
  --cluster myapp-cluster \
  --service-name myapp-service \
  --task-definition myapp:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-abc123],
    securityGroups=[sg-abc123],
    assignPublicIp=ENABLED
  }"

# Update service (rolling deploy)
aws ecs update-service \
  --cluster myapp-cluster \
  --service myapp-service \
  --task-definition myapp:2 \
  --force-new-deployment
```

## CI/CD with GitHub Actions

Use **OIDC** to authenticate — no long-lived access keys stored in secrets.

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/myapp:${{ github.sha }} .
          docker push $ECR_REGISTRY/myapp:${{ github.sha }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster myapp-cluster \
            --service myapp-service \
            --force-new-deployment
```

> OIDC lets GitHub Actions assume an IAM role directly — no `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` needed. Set up the IAM OIDC provider and trust policy once, then use `role-to-assume` in every workflow.

## Interview Q&A

**Q: ECR vs Docker Hub?**
ECR is private by default, IAM-controlled, with built-in vulnerability scanning and lifecycle policies. Tightly integrated with ECS, Fargate, and CodePipeline. Use ECR for anything hosted on AWS.

**Q: ECS EC2 vs Fargate?**
Fargate is simpler — no servers to manage, charges per second. EC2 gives you more control and is cheaper for steady predictable workloads. Fargate is the default choice for new services.

**Q: How does ECS handle secrets?**
Reference AWS Secrets Manager or SSM Parameter Store ARNs in the task definition's `secrets` field. ECS injects them as environment variables at runtime — they never appear in the image or task definition in plaintext.

**Q: What roles does ECS need?**
- **Execution Role** — allows ECS to pull images from ECR and write logs to CloudWatch
- **Task Role** — permissions for the app itself (S3, DynamoDB, etc.)

---
[← Production](./07-docker-in-production.md) | [Troubleshooting →](./09-docker-troubleshooting.md)
