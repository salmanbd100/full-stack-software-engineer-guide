# Docker with AWS

## Overview

AWS provides comprehensive container services that integrate seamlessly with Docker. This guide covers Amazon ECR for container registry, ECS for container orchestration, Fargate for serverless containers, and production deployment patterns on AWS.

### 💡 **Why Docker with AWS**

**The AWS Container Ecosystem:**
- **ECR (Elastic Container Registry)** - Private Docker registry with vulnerability scanning and lifecycle policies
- **ECS (Elastic Container Service)** - AWS-native container orchestration without Kubernetes complexity
- **Fargate** - Serverless compute for containers (no EC2 instances to manage)
- **IAM Integration** - Fine-grained security with task roles and execution roles
- **CloudWatch** - Native logging and monitoring integration

**Why Choose AWS for Containers:**
- **Managed Infrastructure** - Fargate eliminates server management entirely
- **Security Integration** - Secrets Manager, IAM, VPC, security groups work seamlessly
- **Cost Optimization** - Fargate Spot offers 70% savings, EC2 launch type for predictable workloads
- **Enterprise Features** - Auto-scaling, load balancing, service discovery built-in
- **CI/CD Integration** - Native support with CodePipeline, CodeBuild, GitHub Actions

**Key Value:**
> AWS ECS + Fargate provides the simplest path to production containers - deploy Docker images without managing Kubernetes complexity or EC2 instances, while maintaining enterprise-grade security, scalability, and observability.

## Table of Contents
- [Amazon ECR](#amazon-ecr)
- [Amazon ECS](#amazon-ecs)
- [AWS Fargate](#aws-fargate)
- [ECS Task Definitions](#ecs-task-definitions)
- [ECS Services](#ecs-services)
- [CI/CD with AWS](#cicd-with-aws)
- [Production Patterns](#production-patterns)
- [Interview Questions](#interview-questions)

## Amazon ECR

### ECR Basics

```bash
# Amazon Elastic Container Registry (ECR)
# - Fully managed Docker registry
# - Integrated with IAM for security
# - Private and public repositories
# - Image scanning
# - Lifecycle policies
```

### Creating ECR Repository

```bash
# Create private repository
aws ecr create-repository \
  --repository-name myapp \
  --region us-east-1

# Create public repository
aws ecr-public create-repository \
  --repository-name myapp \
  --region us-east-1

# Output:
{
  "repository": {
    "repositoryArn": "arn:aws:ecr:us-east-1:123456789012:repository/myapp",
    "registryId": "123456789012",
    "repositoryName": "myapp",
    "repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp"
  }
}
```

### ECR Authentication

```bash
# Get login password (Docker CLI v2+)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Legacy method (Docker CLI v1)
$(aws ecr get-login --no-include-email --region us-east-1)

# Login to public ECR
aws ecr-public get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  public.ecr.aws
```

### Push Images to ECR

```bash
# Build image
docker build -t myapp:latest .

# Tag for ECR
docker tag myapp:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

docker tag myapp:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0

# List images
aws ecr list-images --repository-name myapp --region us-east-1

# Pull from ECR
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### ECR Lifecycle Policies

```bash
# Create lifecycle policy to clean old images
cat > lifecycle-policy.json <<EOF
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Remove untagged images after 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF

# Apply lifecycle policy
aws ecr put-lifecycle-policy \
  --repository-name myapp \
  --lifecycle-policy-text file://lifecycle-policy.json \
  --region us-east-1
```

### ECR Image Scanning

```bash
# Enable scan on push
aws ecr put-image-scanning-configuration \
  --repository-name myapp \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1

# Manual scan
aws ecr start-image-scan \
  --repository-name myapp \
  --image-id imageTag=latest \
  --region us-east-1

# Get scan findings
aws ecr describe-image-scan-findings \
  --repository-name myapp \
  --image-id imageTag=latest \
  --region us-east-1
```

## Amazon ECS

### ECS Cluster Creation

```bash
# Create ECS cluster (EC2 launch type)
aws ecs create-cluster \
  --cluster-name production-cluster \
  --region us-east-1

# Create Fargate cluster
aws ecs create-cluster \
  --cluster-name fargate-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=4 \
  --region us-east-1

# List clusters
aws ecs list-clusters --region us-east-1

# Describe cluster
aws ecs describe-clusters \
  --clusters production-cluster \
  --region us-east-1
```

### ECS Container Instances (EC2 Launch Type)

```bash
# Launch EC2 instances with ECS-optimized AMI
# User data script:
#!/bin/bash
echo ECS_CLUSTER=production-cluster >> /etc/ecs/ecs.config
echo ECS_ENABLE_TASK_IAM_ROLE=true >> /etc/ecs/ecs.config
echo ECS_ENABLE_TASK_IAM_ROLE_NETWORK_HOST=true >> /etc/ecs/ecs.config

# List container instances
aws ecs list-container-instances \
  --cluster production-cluster \
  --region us-east-1

# Describe container instances
aws ecs describe-container-instances \
  --cluster production-cluster \
  --container-instances <instance-id> \
  --region us-east-1
```

## ECS Task Definitions

### Basic Task Definition

```json
{
  "family": "myapp-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "myapp",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
      "cpu": 256,
      "memory": 512,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-password"
        }
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
    }
  ]
}
```

### Multi-Container Task Definition

```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "nginx",
      "image": "nginx:alpine",
      "cpu": 128,
      "memory": 256,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "dependsOn": [
        {
          "containerName": "app",
          "condition": "HEALTHY"
        }
      ],
      "links": ["app"],
      "volumesFrom": [
        {
          "sourceContainer": "app",
          "readOnly": true
        }
      ]
    },
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
      "cpu": 256,
      "memory": 512,
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    },
    {
      "name": "datadog-agent",
      "image": "datadog/agent:latest",
      "cpu": 128,
      "memory": 256,
      "essential": false,
      "environment": [
        {
          "name": "DD_API_KEY",
          "value": "${DD_API_KEY}"
        },
        {
          "name": "ECS_FARGATE",
          "value": "true"
        }
      ]
    }
  ]
}
```

### Register Task Definition

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1

# List task definitions
aws ecs list-task-definitions --region us-east-1

# Describe task definition
aws ecs describe-task-definition \
  --task-definition myapp-task:1 \
  --region us-east-1

# Deregister task definition
aws ecs deregister-task-definition \
  --task-definition myapp-task:1 \
  --region us-east-1
```

## ECS Services

### Create ECS Service (Fargate)

```bash
# Create service with load balancer
aws ecs create-service \
  --cluster production-cluster \
  --service-name myapp-service \
  --task-definition myapp-task:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-12345,subnet-67890],
    securityGroups=[sg-12345],
    assignPublicIp=ENABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/myapp/abc123,
    containerName=myapp,
    containerPort=3000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --region us-east-1
```

### Service with Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/production-cluster/myapp-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region us-east-1

# Create scaling policy (target tracking)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/production-cluster/myapp-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region us-east-1
```

### Update Service

```bash
# Update service with new task definition
aws ecs update-service \
  --cluster production-cluster \
  --service myapp-service \
  --task-definition myapp-task:2 \
  --desired-count 5 \
  --force-new-deployment \
  --region us-east-1

# Update deployment configuration
aws ecs update-service \
  --cluster production-cluster \
  --service myapp-service \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50" \
  --region us-east-1
```

## AWS Fargate

### Fargate vs EC2 Launch Type

| Feature | Fargate | EC2 |
|---------|---------|-----|
| Infrastructure | Serverless | Manage EC2 instances |
| Pricing | Per vCPU/Memory/second | EC2 instance cost |
| Scaling | Automatic | Manual EC2 scaling |
| Patching | AWS managed | User managed |
| Use Case | Simplicity, pay-per-use | Cost optimization, control |

### Fargate Task Definition

```json
{
  "family": "fargate-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fargate-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "fargate"
        }
      }
    }
  ]
}
```

### Fargate Spot

```bash
# Create cluster with Fargate Spot capacity provider
aws ecs create-cluster \
  --cluster-name fargate-spot-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=4 \
  --region us-east-1

# Service using Fargate Spot (70% cost savings)
aws ecs create-service \
  --cluster fargate-spot-cluster \
  --service-name myapp-service \
  --task-definition myapp-task:1 \
  --desired-count 4 \
  --capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=3 \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-12345,subnet-67890],
    securityGroups=[sg-12345]
  }" \
  --region us-east-1
```

## CI/CD with AWS

### GitHub Actions with ECR and ECS

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: myapp
  ECS_CLUSTER: production-cluster
  ECS_SERVICE: myapp-service
  ECS_TASK_DEFINITION: task-definition.json
  CONTAINER_NAME: myapp

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

### AWS CodePipeline

```yaml
# buildspec.yml
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO_NAME
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:=latest}
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build -t $REPOSITORY_URI:latest .
      - docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker images...
      - docker push $REPOSITORY_URI:latest
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - echo Writing image definitions file...
      - printf '[{"name":"%s","imageUri":"%s"}]' $CONTAINER_NAME $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

## Production Patterns

### Blue-Green Deployment with ECS

```bash
# Create two target groups (blue and green)
aws elbv2 create-target-group \
  --name myapp-blue \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-12345 \
  --health-check-path /health

aws elbv2 create-target-group \
  --name myapp-green \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-12345 \
  --health-check-path /health

# Create ALB with blue target group
# Deploy new version to green target group
# Test green environment
# Switch ALB to green target group
# Monitor for issues
# If successful, update blue with new version
# If issues, switch back to blue
```

### ECS with Application Load Balancer

```json
// Task definition with ALB integration
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "myapp:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

```bash
# Create service with ALB
aws ecs create-service \
  --cluster production \
  --service-name web-service \
  --task-definition web-app:1 \
  --desired-count 3 \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,
    containerName=web,
    containerPort=80" \
  --health-check-grace-period-seconds 60
```

### ECS with RDS Database

```json
{
  "family": "app-with-db",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "myapp:latest",
      "environment": [
        {
          "name": "DB_HOST",
          "value": "mydb.abc123.us-east-1.rds.amazonaws.com"
        },
        {
          "name": "DB_PORT",
          "value": "5432"
        },
        {
          "name": "DB_NAME",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_USERNAME",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-username"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-password"
        }
      ]
    }
  ]
}
```

### ECS with EFS (Persistent Storage)

```json
{
  "family": "app-with-efs",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "volumes": [
    {
      "name": "efs-volume",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-12345678",
        "rootDirectory": "/data",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "iam": "ENABLED"
        }
      }
    }
  ],
  "containerDefinitions": [
    {
      "name": "app",
      "image": "myapp:latest",
      "mountPoints": [
        {
          "sourceVolume": "efs-volume",
          "containerPath": "/app/data",
          "readOnly": false
        }
      ]
    }
  ]
}
```

## Interview Questions

**Q1: What's the difference between ECR and Docker Hub?**
A:
- **ECR**: AWS-managed, integrated with IAM, private by default, pay for storage
- **Docker Hub**: Public/private, rate limits on free tier, community images
- **Use ECR** for: AWS workloads, enterprise security, compliance

**Q2: What are the differences between ECS Fargate and EC2 launch types?**
A:
- **Fargate**: Serverless, no infrastructure management, pay per task
- **EC2**: Manage instances, more control, potentially lower cost at scale
- **Choose Fargate**: For simplicity, variable workloads
- **Choose EC2**: For cost optimization, custom requirements

**Q3: How do you pass secrets to ECS tasks?**
A:
```json
"secrets": [
  {
    "name": "DB_PASSWORD",
    "valueFrom": "arn:aws:secretsmanager:region:account:secret:name"
  }
]
```
**Methods:**
1. AWS Secrets Manager (recommended)
2. SSM Parameter Store
3. Never use environment variables for secrets

**Q4: What's the purpose of task IAM roles?**
A:
- **Execution Role**: Pulls images from ECR, writes logs to CloudWatch
- **Task Role**: Permissions for application (S3, DynamoDB, etc.)
```json
"executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
"taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole"
```

**Q5: How does ECS service auto-scaling work?**
A: Based on CloudWatch metrics:
1. Target tracking (CPU, memory, ALB requests)
2. Step scaling (scale based on thresholds)
3. Scheduled scaling (predictable patterns)
```bash
# Example: Scale when CPU > 70%
aws application-autoscaling put-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  }'
```

**Q6: What are ECS capacity providers?**
A: Manage cluster capacity:
- **FARGATE**: Serverless capacity
- **FARGATE_SPOT**: 70% cost savings, can be interrupted
- **EC2**: Auto Scaling Groups
```bash
--capacity-provider-strategy \
  capacityProvider=FARGATE,weight=1,base=1 \
  capacityProvider=FARGATE_SPOT,weight=4
# 20% Fargate, 80% Fargate Spot
```

**Q7: How do you implement zero-downtime deployments on ECS?**
A:
1. Configure health checks
2. Set deployment configuration:
   - `maximumPercent`: 200 (double running tasks)
   - `minimumHealthyPercent`: 100 (always keep 100% healthy)
3. Use rolling updates
4. Configure health check grace period

**Q8: What's the purpose of ECS Service Discovery?**
A: AWS Cloud Map integration for service discovery:
- DNS-based service discovery
- API-based service discovery
- Automatic health checking
- No hardcoded endpoints
```bash
aws ecs create-service \
  --service-registries "registryArn=arn:aws:servicediscovery:..."
```

**Q9: How do you monitor ECS tasks?**
A:
1. **CloudWatch Logs**: Container logs
2. **CloudWatch Metrics**: CPU, memory, network
3. **Container Insights**: Enhanced metrics
4. **X-Ray**: Distributed tracing
5. **Third-party**: Datadog, New Relic

**Q10: What's the cost difference between Fargate and EC2?**
A:
- **Fargate**: ~$30-40/month for 1 vCPU, 2GB (running 24/7)
- **EC2 (t3.small)**: ~$15/month (2 vCPU, 2GB)
- **Breakeven**: ~3-5 containers per EC2 instance
- **Fargate Spot**: 70% discount (interruptible)

## Summary

**Core Concepts:**

1. **Amazon ECR (Container Registry):**
   - ✅ **Private/Public Registries**: Host Docker images with IAM-based access control
   - ✅ **Image Scanning**: Automatic vulnerability scanning on push (scanOnPush=true)
   - ✅ **Lifecycle Policies**: Auto-delete old images (keep last 10, remove untagged after 7 days)
   - ✅ **Authentication**: `aws ecr get-login-password` for Docker login
   - ✅ **Replication**: Cross-region and cross-account replication for DR
   - **Format**: `123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest`

2. **Amazon ECS (Container Orchestration):**
   - ✅ **Task Definitions**: JSON blueprints defining containers, CPU, memory, ports, environment
   - ✅ **Services**: Maintain desired count of tasks, integrate with ALB, auto-scale
   - ✅ **Clusters**: Logical grouping of tasks/services (EC2 or Fargate capacity)
   - ✅ **Launch Types**: EC2 (manage instances) vs Fargate (serverless)
   - ✅ **Network Mode**: awsvpc (each task gets ENI, security groups, private IP)

3. **AWS Fargate vs EC2 Launch Type:**
   - **Fargate**: Serverless, pay per vCPU/memory/second, no instance management, quick start
   - **EC2**: Manage instances, lower cost at scale (3-5+ containers), more control
   - **Fargate Spot**: 70% cost savings, interruptible for fault-tolerant workloads
   - **When to use Fargate**: Simplicity, variable workloads, small teams
   - **When to use EC2**: Cost optimization, predictable workloads, custom requirements

4. **IAM Roles:**
   - ✅ **Execution Role**: Pulls images from ECR, writes logs to CloudWatch, reads secrets from Secrets Manager
   - ✅ **Task Role**: Application permissions (S3, DynamoDB, SQS, etc.)
   - ⚠️ Never confuse these - execution role = ECS agent, task role = application

5. **Secrets Management:**
   - ✅ **AWS Secrets Manager**: Recommended, automatic rotation, encrypted at rest
   - ✅ **SSM Parameter Store**: Simple key-value, free tier available
   - ✅ **Task Definition**: Use `secrets` field (not `environment`) with `valueFrom` ARN
   - ❌ Never use environment variables for secrets (visible in console, logs)

6. **ECS Service Features:**
   - ✅ **Auto-Scaling**: Target tracking (CPU 70%), step scaling, scheduled scaling
   - ✅ **Load Balancing**: ALB integration with health checks, target groups
   - ✅ **Service Discovery**: AWS Cloud Map for DNS-based discovery
   - ✅ **Deployment**: Rolling updates with `maximumPercent: 200`, `minimumHealthyPercent: 100`
   - ✅ **Blue-Green**: CodeDeploy integration for blue-green deployments

**Best Practices:**

**Do:**
- ✅ Use ECR for private images (IAM integration, scanning, lifecycle policies)
- ✅ Enable image scanning on push (catch vulnerabilities before deployment)
- ✅ Implement lifecycle policies to prevent storage bloat
- ✅ Use Secrets Manager for all secrets (DB passwords, API keys)
- ✅ Configure task and execution roles with least privilege
- ✅ Use Fargate for simplicity and variable workloads
- ✅ Use EC2 launch type for cost optimization at scale (5+ containers)
- ✅ Configure health checks in task definitions (interval: 30s, retries: 3)
- ✅ Set resource limits (CPU, memory) to prevent runaway tasks
- ✅ Use awsvpc network mode for security groups per task
- ✅ Configure auto-scaling based on CPU, memory, or ALB metrics
- ✅ Centralize logs with CloudWatch Logs
- ✅ Automate deployments with GitHub Actions or CodePipeline
- ✅ Use Fargate Spot for fault-tolerant workloads (70% savings)

**Don't:**
- ❌ Never use Docker Hub for production (rate limits, no IAM integration)
- ❌ Never skip image scanning (vulnerabilities can be exploited)
- ❌ Never store secrets in environment variables (use Secrets Manager)
- ❌ Never use default execution role (create role with least privilege)
- ❌ Never skip health checks (can't detect unhealthy tasks)
- ❌ Never use `latest` tag (unpredictable, no version control)
- ❌ Never hardcode credentials in task definitions
- ❌ Never use public subnets for tasks (use private subnets + NAT gateway)
- ⚠️ Never assume Fargate is always cheaper (EC2 better at scale)

**Key Insights:**
> - **ECR replaces Docker Hub** - private, IAM-secured, no rate limits, vulnerability scanning
> - **Fargate eliminates infrastructure management** - no EC2 instances to patch, scale, or monitor
> - **ECS is simpler than Kubernetes** - no control plane, no worker nodes, less operational overhead
> - **Task roles enable least privilege** - each container gets only the AWS permissions it needs
> - **Secrets Manager integration is seamless** - secrets injected at runtime, never in environment
> - **Auto-scaling is built-in** - scale on CPU, memory, ALB requests without custom code
> - **Fargate Spot = 70% savings** - use for batch jobs, dev/test, fault-tolerant workloads

**Production Checklist:**
- [ ] ECR repositories created for all images
- [ ] Lifecycle policies configured (keep last 10, remove untagged after 7 days)
- [ ] Image scanning enabled (scanOnPush=true)
- [ ] Task definitions created with health checks
- [ ] Resource limits set (CPU, memory)
- [ ] Execution role created with ECR pull, CloudWatch logs, Secrets Manager access
- [ ] Task role created with application-specific permissions (S3, DynamoDB, etc.)
- [ ] Secrets stored in Secrets Manager (not environment variables)
- [ ] Task definitions use `secrets` field with ARN references
- [ ] ECS cluster created (Fargate or EC2 launch type)
- [ ] VPC configured with private subnets and NAT gateway
- [ ] Security groups configured (least privilege)
- [ ] ALB created with target groups and health checks
- [ ] ECS service created with desired count (2+)
- [ ] Auto-scaling configured (target: CPU 70%)
- [ ] CloudWatch Logs log groups created
- [ ] CloudWatch alarms configured (high CPU, task failures)
- [ ] Service discovery configured (if microservices)
- [ ] CI/CD pipeline automated (GitHub Actions or CodePipeline)
- [ ] Blue-green deployment strategy tested
- [ ] Fargate Spot considered for non-critical workloads
- [ ] Cost monitoring enabled (Cost Explorer, Budgets)

---

[← Docker in Production](./07-docker-in-production.md) | [Docker Troubleshooting →](./09-docker-troubleshooting.md)
