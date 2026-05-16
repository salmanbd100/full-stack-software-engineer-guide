# Containers and Orchestration

## 💡 **Concept**

A container packages your app and all its dependencies into an isolated unit. Docker builds containers; orchestrators (ECS, Kubernetes) run and manage them at scale. Containers solve "works on my machine" by making environments reproducible.

**How to answer in an interview:** "I'll containerize the service with Docker and deploy to ECS Fargate. That gives us reproducible builds, easy scaling, and no server management. If the team already uses Kubernetes, EKS is the better fit."

---

## Docker — The Container Runtime

### Key concepts

| Term | What it is |
|------|-----------|
| **Image** | Read-only snapshot of the app + deps |
| **Container** | Running instance of an image |
| **Dockerfile** | Instructions to build an image |
| **Registry** | Storage for images (ECR, Docker Hub) |

### Production-ready Dockerfile

```dockerfile
# Multi-stage build: smaller final image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# Run as non-root for security
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

**Multi-stage builds** keep the final image small — don't ship build tools to production.

---

## ECS — Elastic Container Service

ECS is AWS's container orchestrator. Simpler than Kubernetes; tightly integrated with AWS.

### Core concepts

```typescript
interface ECSTaskDefinition {
  family: string;
  cpu: number;          // 256 = 0.25 vCPU
  memory: number;       // MB
  networkMode: "awsvpc";
  containers: ContainerDef[];
}

interface ContainerDef {
  name: string;
  image: string;        // ECR image URI
  portMappings: { containerPort: number; protocol: "tcp" }[];
  environment: { name: string; value: string }[];
  secrets: { name: string; valueFrom: string }[];  // from Secrets Manager
  logConfiguration: {
    logDriver: "awslogs";
    options: { "awslogs-group": string; "awslogs-region": string };
  };
}
```

### Fargate vs EC2 launch type

| | Fargate | EC2 |
|--|---------|-----|
| Server management | None | You manage EC2 fleet |
| Spot instance support | ✅ (Fargate Spot) | ✅ |
| GPU support | ❌ | ✅ |
| Best for | Most services | High-throughput, GPU, custom AMI |

---

## Kubernetes (EKS) Core Concepts

Kubernetes is the industry-standard orchestrator for containers at scale.

### Key objects

```typescript
// Simplified representation of a Deployment
interface K8sDeployment {
  kind: "Deployment";
  spec: {
    replicas: number;
    selector: { matchLabels: Record<string, string> };
    template: {
      containers: {
        name: string;
        image: string;
        resources: {
          requests: { cpu: string; memory: string };
          limits: { cpu: string; memory: string };
        };
        readinessProbe: { httpGet: { path: string; port: number } };
      }[];
    };
  };
}
```

### Objects to know in interviews

| Object | Purpose |
|--------|---------|
| **Pod** | One or more containers that share network and storage |
| **Deployment** | Manages pods — rolling updates, rollback |
| **Service** | Stable DNS + load balancing for pods |
| **Ingress** | HTTP routing rules (like ALB) |
| **HPA** | Horizontal Pod Autoscaler — scales replicas on CPU/memory |
| **ConfigMap / Secret** | Config and credentials for pods |

---

## Container Registry — ECR

Amazon ECR stores Docker images. Integrate with ECS/EKS automatically.

```typescript
// Image lifecycle policy — keep only last 10 tagged images
const lifecyclePolicy = {
  rules: [{
    rulePriority: 1,
    description: "Keep last 10 images",
    selection: {
      tagStatus: "tagged",
      countType: "imageCountMoreThan",
      countNumber: 10
    },
    action: { type: "expire" }
  }]
};
```

---

## ECS vs EKS Decision

| Factor | ECS (Fargate) | EKS |
|--------|--------------|-----|
| Operational complexity | Low | High |
| AWS integration | Native | Good |
| Team expertise needed | AWS basics | Kubernetes knowledge |
| Multi-cloud portability | ❌ | ✅ |
| Advanced scheduling | Limited | Full (node affinity, taints) |

**Use ECS Fargate when:** you want containers without Kubernetes overhead.  
**Use EKS when:** your team knows Kubernetes, or you need advanced scheduling / multi-cloud.

---

## Common Mistakes

❌ **Running containers as root** — always create a non-root user in Dockerfile  
❌ **No health checks** — orchestrator can't route around failed containers  
❌ **Single replica** — always run ≥ 2 replicas spread across AZs  
❌ **Baking secrets into the image** — inject via environment variables from Secrets Manager

**Key insight:**

> Containers solve environment consistency. Orchestration solves running them at scale. Start with ECS Fargate — it's 80% of Kubernetes power at 20% of the operational complexity. Add Kubernetes only when your team is ready.

---
[← Back to SystemDesign](../README.md)
