# Compute

## 💡 **Concept**

Compute is where your code runs. In AWS, you choose between virtual machines (EC2), containers (ECS/EKS), and serverless functions (Lambda). The right choice depends on workload shape, team expertise, and traffic patterns.

**How to answer in an interview:** "For compute I consider whether the workload is long-running or event-driven, and whether traffic is predictable or spiky. Long-running services use EC2 or containers; short event-driven tasks use Lambda."

---

## The Three Compute Models

| Model | You manage | Best for | Cost model |
|-------|-----------|----------|-----------|
| **EC2** | App + OS | Long-running, stateful | Per hour |
| **ECS / EKS** | App + containers | Microservices, portability | Per vCPU + memory |
| **Lambda** | App code only | Events, spiky, short tasks | Per invocation |

---

## EC2 — Virtual Machines

### Instance Families

| Family | Optimized for | Example use case |
|--------|--------------|-----------------|
| **t3/t4g** | Burstable, general | Dev, light APIs |
| **c6i** | CPU | Encoding, ML inference |
| **r6i** | Memory | In-memory DBs, caching |
| **i3** | Storage (NVMe) | High-IOPS databases |

### Auto Scaling

```typescript
interface AutoScalingPolicy {
  minInstances: number;
  maxInstances: number;
  targetMetric: "CPU" | "RequestCount" | "Custom";
  targetValue: number;
}

// Keep CPU at 60%, scale between 2–20 instances
const webTierASG: AutoScalingPolicy = {
  minInstances: 2,       // always 2+ for Multi-AZ HA
  maxInstances: 20,
  targetMetric: "CPU",
  targetValue: 60
};
```

**Scaling types:**
- **Horizontal** (scale out): add instances — preferred for stateless services
- **Vertical** (scale up): larger instance — limited ceiling, requires restart

---

## Containers — ECS and EKS

Containers package your app with its dependencies. They start faster than VMs and share the OS kernel.

### ECS (Elastic Container Service)

AWS-native orchestrator. Two launch types:

| Launch type | You manage | When to use |
|------------|-----------|------------|
| **EC2** | EC2 fleet | Need spot instances, custom OS |
| **Fargate** | Nothing | Prefer serverless containers |

### EKS (Elastic Kubernetes Service)

Managed Kubernetes. Choose EKS when:
- ✅ Team already knows Kubernetes
- ✅ Complex scheduling requirements (GPU, mixed node pools)
- ✅ Multi-cloud portability matters
- ❌ Small team — Fargate is simpler

```typescript
interface ContainerTaskConfig {
  image: string;          // ECR image URI
  cpuUnits: number;       // 256 = 0.25 vCPU
  memoryMB: number;
  desiredCount: number;   // replicas
  healthCheckPath: string;
}

const apiTask: ContainerTaskConfig = {
  image: "123456789.dkr.ecr.us-east-1.amazonaws.com/api:v1.2",
  cpuUnits: 512,
  memoryMB: 1024,
  desiredCount: 3,
  healthCheckPath: "/health"
};
```

---

## Lambda — Serverless Functions

Lambda runs code in response to events. No servers to manage or pay for when idle.

### Common event sources

| Source | Use case |
|--------|---------|
| **API Gateway** | HTTP endpoint |
| **SQS** | Process queue messages |
| **S3** | React to file uploads |
| **EventBridge** | Scheduled cron jobs |
| **DynamoDB Streams** | React to DB changes |

### Cold starts

Lambda containers sleep when idle. First invocation after sleep takes 100–500 ms extra.

**Mitigation strategies:**
- Use **Provisioned Concurrency** for latency-sensitive functions
- Keep packages small (< 50 MB)
- Prefer lightweight runtimes (Node.js, Python over Java)

```typescript
interface LambdaConfig {
  handler: string;
  runtime: "nodejs20.x" | "python3.12";
  memoryMB: number;          // also controls CPU allocation
  timeoutSeconds: number;    // max 900
  provisionedConcurrency?: number;
}

const imageResizer: LambdaConfig = {
  handler: "index.handler",
  runtime: "nodejs20.x",
  memoryMB: 1024,
  timeoutSeconds: 30
};
```

---

## Decision Guide

```
Workload shape?
├── Spiky / event-driven / < 15 min  → Lambda
├── Long-running / stateful
│   ├── Team knows Kubernetes?        → EKS
│   └── Want simpler ops?             → ECS Fargate
└── Need GPU / custom hardware        → EC2 (p3/g4 family)
```

---

## Common Mistakes

❌ **Lambda for CPU-heavy, long-running jobs** — use ECS or EC2  
❌ **EC2 without Auto Scaling** — manual scaling = 3 AM incidents  
❌ **Ignoring cold starts in Lambda** — test p99 latency before choosing Lambda for synchronous APIs  
❌ **Not using Fargate for small teams** — managing EC2 fleets for containers adds operational overhead

**Key insight:**

> Lambda is the default for new event-driven work. ECS Fargate is the default for long-running services when you want containerization without Kubernetes overhead. Only add EKS when your team is already Kubernetes-fluent.

---
[← Back to SystemDesign](../README.md)
