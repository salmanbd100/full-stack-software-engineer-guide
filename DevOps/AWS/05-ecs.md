# ECS & Fargate (Elastic Container Service)

ECS is AWS's managed container orchestration service. It runs Docker containers so you don't have to manage Kubernetes.

## What ECS Is

ECS answers one question: **how do I run containers reliably at scale on AWS?**

You give ECS a Docker image. ECS decides where to run it, keeps it running, replaces crashed containers, and scales up when traffic spikes. You get deployment, health checking, and load balancing — without running your own orchestration layer.

## ECS Hierarchy

```
Cluster
└── Service (maintains N running tasks, handles deploys)
    └── Task (one running instance — like a K8s Pod)
        └── Container(s) (one or more Docker containers)
```

| Concept | What It Is | Analogy |
|---------|-----------|---------|
| **Cluster** | Logical grouping of compute resources | Kubernetes cluster |
| **Service** | Keeps N tasks running, manages rolling deploys | Kubernetes Deployment |
| **Task** | One running instance of your app | Kubernetes Pod |
| **Task Definition** | Blueprint: image, CPU, memory, ports, env vars | Kubernetes Pod spec |

> **Task Definition** is a version-controlled JSON document. Deploying a new version means registering a new Task Definition revision and updating the Service to use it.

## Launch Types: Fargate vs EC2

This is the first decision you make when creating a Service.

| Feature | Fargate | EC2 |
|---------|---------|-----|
| **Server management** | ✅ AWS manages everything | ❌ You manage EC2 instances |
| **Provisioning** | Automatic per task | Manual or via ASG |
| **Cost** | Slightly higher per vCPU/GB | Lower at scale with Reserved |
| **GPU support** | ❌ No | ✅ Yes |
| **Visibility** | Less (no SSH into host) | More (you own the host) |
| **Best for** | Most teams — simpler ops | Cost optimization, GPU, custom AMIs |

✅ **Start with Fargate.** It eliminates host management entirely. Move to EC2 launch type only when you need GPU workloads or significant cost optimization with Reserved Instances at scale.

❌ Don't use EC2 launch type because it feels more familiar. The operational overhead of managing the ECS container agent, OS patches, and capacity is real cost.

## Task Definition

The Task Definition is the blueprint for your container. It is registered as versioned revisions (`:1`, `:2`, etc.).

```json
{
  "family": "api-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/api:latest",
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/api-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

**Key fields explained:**

- `cpu` / `memory` — Hard limits per task. Fargate bills on these values.
- `secrets` — Pulls values from Secrets Manager or SSM Parameter Store at task startup. The value is injected as an environment variable. ✅ Never put secrets in `environment` as plaintext.
- `logConfiguration` — `awslogs` sends container stdout/stderr to CloudWatch Logs.
- `healthCheck` — Container-level check. ECS restarts the container if it fails repeatedly.

## IAM Roles — The Most Confused Topic

ECS uses two separate IAM roles. Getting these wrong is the most common ECS mistake.

| Role | Who Uses It | What It Does |
|------|------------|-------------|
| **Execution Role** | ECS agent (not your app) | Pull image from ECR, write logs to CloudWatch, read secrets from Secrets Manager |
| **Task Role** | Your application code | Call S3, DynamoDB, SQS, or any AWS service your app needs |

```
ECS Agent (Execution Role)          Your App (Task Role)
        │                                   │
        ├── Pull ECR image                  ├── s3:GetObject
        ├── Write to CloudWatch Logs        ├── dynamodb:PutItem
        └── Read Secrets Manager           └── sqs:SendMessage
```

✅ Give the Task Role **least privilege** — only the exact AWS actions your app calls.

❌ Don't attach broad policies like `AmazonS3FullAccess` to the Task Role. An attacker who compromises the container gets those permissions.

⚠️ If your container can't pull its image or logs aren't appearing in CloudWatch, check the **Execution Role** first — that's almost always the cause.

## Service Auto Scaling

ECS Services can scale the number of running tasks automatically.

```yaml
# CloudFormation / CDK snippet — target tracking on CPU
ScalingPolicy:
  Type: AWS::ApplicationAutoScaling::ScalingPolicy
  Properties:
    PolicyType: TargetTrackingScaling
    TargetTrackingScalingPolicyConfiguration:
      TargetValue: 60.0          # Keep average CPU at 60%
      PredefinedMetricSpecification:
        PredefinedMetricType: ECSServiceAverageCPUUtilization
      ScaleInCooldown: 60        # Wait 60s before scaling in
      ScaleOutCooldown: 30       # Scale out faster than scale in
```

✅ Use **target tracking on CPU or request count** for most services. It is simpler and more responsive than step scaling.

## Deployments

### Rolling Update (Default)

ECS replaces tasks gradually. You control the pace with two settings:

| Setting | Default | Meaning |
|---------|---------|---------|
| `minimumHealthyPercent` | 100 | Never go below 100% of desired count |
| `maximumPercent` | 200 | Can run up to 200% during deploy |

With desired count = 4, min=100%, max=200%: ECS launches 4 new tasks, waits for them to pass health checks, then terminates the 4 old ones.

**Circuit Breaker:** Enable this so ECS automatically rolls back if the new task definition is unhealthy. Without it, a bad deploy keeps trying forever.

```json
"deploymentConfiguration": {
  "deploymentCircuitBreaker": {
    "enable": true,
    "rollback": true
  },
  "maximumPercent": 200,
  "minimumHealthyPercent": 100
}
```

### Blue/Green with CodeDeploy

Runs two environments (blue = current, green = new) behind the same ALB. Traffic shifts from blue to green either all at once or gradually (canary or linear). If the health check fails, CodeDeploy rolls back automatically.

✅ Use blue/green for zero-downtime deploys and easy rollback on production services.

## Load Balancing and Service Discovery

| Method | How It Works | Use Case |
|--------|-------------|----------|
| **ALB** | Routes HTTP/HTTPS by path or host to ECS tasks | Public-facing APIs, web apps |
| **NLB** | Routes TCP/UDP at layer 4 | Low-latency, non-HTTP services |
| **AWS Cloud Map** | DNS-based service discovery | Internal service-to-service calls |

With Fargate and `awsvpc` network mode, each task gets its own ENI and private IP. The ALB routes directly to the task IP — no host port mapping needed.

## ECS vs EKS

| | ECS | EKS |
|-|-----|-----|
| **Complexity** | Low — AWS-native, simpler API | High — full Kubernetes |
| **Ecosystem** | AWS-specific tooling | Portable, huge open-source ecosystem |
| **Learning curve** | Days | Weeks |
| **Multi-cloud** | ❌ AWS only | ✅ Runs anywhere Kubernetes runs |
| **Custom scheduling** | Limited | Full K8s scheduler flexibility |
| **Best for** | Most AWS-native teams | Teams needing K8s portability or advanced features |

> Choose ECS when your team lives in AWS and wants simplicity. Choose EKS when you need Kubernetes ecosystem tooling, multi-cloud portability, or advanced scheduling (node affinity, taints, custom controllers).

## Key CLI Commands

```bash
# Register a new task definition revision
aws ecs register-task-definition --cli-input-json file://task-def.json

# Update a service to use the new task definition
aws ecs update-service \
  --cluster my-cluster \
  --service api-service \
  --task-definition api-service:42 \
  --force-new-deployment

# List running tasks in a service
aws ecs list-tasks --cluster my-cluster --service-name api-service

# Get task details (find the private IP, status)
aws ecs describe-tasks \
  --cluster my-cluster \
  --tasks arn:aws:ecs:us-east-1:123456789:task/my-cluster/abc123

# View recent events for a service (great for debugging deploys)
aws ecs describe-services \
  --cluster my-cluster \
  --services api-service \
  --query "services[0].events[:10]"
```

## Interview Q&A

**Q: What is the difference between Fargate and EC2 launch type?**

With Fargate, AWS provisions and manages the underlying compute. You define CPU and memory per task, and AWS finds capacity automatically. With EC2 launch type, you manage a fleet of EC2 instances that join the cluster. EC2 is cheaper at scale and supports GPU workloads, but you own OS patching, capacity planning, and the ECS container agent. For most teams, Fargate is the right default — it removes a layer of operational complexity.

**Q: What is the difference between the Task Role and the Execution Role?**

The Execution Role is used by the ECS agent — the AWS infrastructure layer — to pull the container image from ECR, write logs to CloudWatch, and fetch secrets from Secrets Manager. Your application code never uses this role. The Task Role is used by your application code at runtime — it grants permissions to call AWS services like S3, DynamoDB, or SQS. If your app can't start, check the Execution Role. If your app can't call AWS APIs, check the Task Role.

**Q: How does a rolling deployment work in ECS?**

ECS registers a new Task Definition revision, then gradually replaces running tasks. It launches new tasks with the updated image, waits for them to pass the ALB health check, and only then terminates the old tasks. The `minimumHealthyPercent` and `maximumPercent` settings control how many tasks run simultaneously during the deploy. With the circuit breaker enabled, ECS will automatically roll back to the previous Task Definition revision if the new tasks fail their health checks.

**Q: When would you choose ECS over EKS?**

Choose ECS when your team is AWS-native, wants a simpler operational model, and doesn't need Kubernetes-specific ecosystem tools. ECS has less to learn and fewer moving parts. Choose EKS when you need to run the same workloads across multiple clouds, need advanced Kubernetes features (custom controllers, node affinity, service mesh integrations like Istio), or your team already has Kubernetes expertise. EKS gives you portability and a larger open-source ecosystem at the cost of significantly more operational complexity.

**Q: How do you pass secrets to an ECS container securely?**

Use the `secrets` field in the container definition, not the `environment` field. With `secrets`, ECS pulls the value from AWS Secrets Manager or SSM Parameter Store at task startup and injects it as an environment variable. The secret value never appears in the Task Definition JSON or in the ECS console. The Execution Role must have permission to read the secret. Never put actual secret values in the `environment` field — they appear in plaintext in the Task Definition and CloudWatch Logs.

---

[← EC2](./04-ec2.md) | [Lambda →](./06-lambda.md)
