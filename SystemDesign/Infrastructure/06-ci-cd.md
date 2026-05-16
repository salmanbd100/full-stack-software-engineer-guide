# CI/CD

## 💡 **Concept**

CI/CD automates the path from code commit to production. **Continuous Integration (CI)** runs tests on every commit. **Continuous Delivery (CD)** automates deployment to staging or production. Together they reduce release risk and increase deployment frequency.

**How to answer in an interview:** "I'd set up a pipeline: PR triggers CI (lint, test, build, security scan). Merge to main triggers CD to staging with automated smoke tests, then a manual approval gate before production with a blue-green or canary deploy."

---

## The Pipeline Stages

```
Code push
    ↓
CI — lint → unit tests → integration tests → build image → security scan
    ↓
CD staging — deploy → smoke tests → load test
    ↓ (manual approval or auto if tests pass)
CD production — blue-green or canary deploy → health checks → rollback on failure
```

---

## GitHub Actions — Example Pipeline

```typescript
// .github/workflows/ci-cd.yml (shown as TypeScript interface for clarity)
interface GitHubWorkflow {
  name: string;
  on: { push: { branches: string[] }; pull_request: { branches: string[] } };
  jobs: Record<string, Job>;
}

interface Job {
  runsOn: string;
  steps: Step[];
}

interface Step {
  name: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
}
```

**Concrete workflow structure:**

```yaml
# CI job runs on every PR
ci:
  - Checkout code
  - Install dependencies: npm ci
  - Lint: npm run lint
  - Unit tests: npm test -- --coverage
  - Build: npm run build
  - Docker build and push to ECR

# CD job runs on merge to main
deploy-staging:
  needs: [ci]
  steps:
    - Deploy to ECS staging
    - Run smoke tests: curl /health
    - Notify Slack

deploy-production:
  needs: [deploy-staging]
  environment: production          # requires manual approval
  steps:
    - Blue-green deploy to ECS
    - Health check (5 minutes)
    - Auto-rollback if errors spike
```

---

## Deployment Strategies

| Strategy | How it works | Risk | Rollback |
|----------|-------------|------|---------|
| **Rolling** | Replace old instances gradually | Low | Slow (re-deploy) |
| **Blue-Green** | Run two identical environments, swap traffic | Very low | Instant (repoint DNS) |
| **Canary** | Route small % to new version, ramp up | Lowest | Instant (revert weights) |
| **Recreate** | Stop all old, start all new | High (downtime) | Re-deploy |

### Blue-Green with Route 53

```typescript
interface BlueGreenConfig {
  blueEnvironment: {
    albArn: string;
    targetGroup: string;
    version: string;
  };
  greenEnvironment: {
    albArn: string;
    targetGroup: string;
    version: string;   // new version
  };
  trafficSwitch: {
    type: "Route53Weighted" | "ALBTargetGroupWeights";
    rolloutPercent: number;  // 100 = full cutover
  };
}
```

**Blue-Green steps:**
1. Deploy new version to green environment
2. Run smoke tests on green
3. Shift 100% traffic to green (instant with Route 53 failover policy)
4. Keep blue running for 30 minutes (fast rollback window)
5. Terminate blue

### Canary Rollout

```typescript
interface CanaryConfig {
  stages: {
    percent: number;    // % of traffic to new version
    waitMinutes: number;
    successMetric: { errorRate: number; latencyP99: number };
  }[];
}

const rollout: CanaryConfig = {
  stages: [
    { percent: 5,  waitMinutes: 10, successMetric: { errorRate: 0.1, latencyP99: 500 } },
    { percent: 25, waitMinutes: 20, successMetric: { errorRate: 0.1, latencyP99: 500 } },
    { percent: 100, waitMinutes: 0, successMetric: { errorRate: 0.1, latencyP99: 500 } }
  ]
};
```

---

## Infrastructure as Code

Treat infrastructure the same as application code: version-controlled, reviewed, tested.

**Tools:**

| Tool | When to use |
|------|------------|
| **Terraform** | Multi-cloud, team standard, large orgs |
| **AWS CDK** | TypeScript/Python-native AWS infra |
| **CloudFormation** | AWS-only, no extra tooling |
| **Pulumi** | Full programming language (TS/Go/Python) |

```typescript
// AWS CDK example — ECS Fargate service
import { Stack, StackProps } from "aws-cdk-lib";
import { Cluster, ContainerImage, FargateTaskDefinition } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";

class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, "ApiCluster");

    new ApplicationLoadBalancedFargateService(this, "ApiService", {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      taskImageOptions: {
        image: ContainerImage.fromAsset("./"),
        containerPort: 3000
      }
    });
  }
}
```

---

## Common Mistakes

❌ **Deploying directly to production without staging** — always validate in a production-like environment first  
❌ **No rollback plan** — every deployment needs an automated rollback trigger  
❌ **Secrets in CI environment variables visible in logs** — use GitHub Secrets + Secrets Manager  
❌ **Skipping tests to "ship faster"** — broken deployments cost more time than the tests save

**Key insight:**

> The goal of CI/CD is to make deployment boring. Blue-green deployment gives instant rollback; canary releases catch regressions before they hit all users. The pipeline is as important as the application code.

---
[← Back to SystemDesign](../README.md)
