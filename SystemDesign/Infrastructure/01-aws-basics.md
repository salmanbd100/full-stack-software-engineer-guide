# AWS Basics for System Design

## 💡 **Why AWS Matters in Interviews**

Most system design answers assume AWS as the cloud provider. Knowing the right primitive for each job — not every service — is what interviewers test.

**How to answer in an interview:** "I'll use AWS as the cloud platform. The core services I'll reach for are EC2 or Lambda for compute, S3 for object storage, RDS or DynamoDB for data, SQS for async messaging, and CloudFront as the CDN."

---

## The 8 Primitives That Appear in Every Interview

| Service | Category | One-line purpose |
|---------|----------|-----------------|
| **EC2** | Compute | Virtual machine — full OS control |
| **Lambda** | Compute | Serverless function — event-driven, no server |
| **S3** | Storage | Object storage — files, images, backups |
| **RDS** | Database | Managed relational DB (PostgreSQL, MySQL) |
| **DynamoDB** | Database | Managed NoSQL — key-value + document |
| **SQS** | Messaging | Managed queue — async decoupling |
| **CloudFront** | CDN | Edge caching — serve assets globally |
| **Route 53** | DNS | DNS + health checks + routing policies |

---

## Compute — EC2 vs Lambda

### EC2 (Elastic Compute Cloud)

Full virtual machine. You choose CPU, memory, storage, and OS.

**When to use EC2:**
- ✅ Long-running workloads (web servers, APIs)
- ✅ Need specific OS or runtime
- ✅ Persistent state on disk
- ✅ Predictable, sustained traffic

**Scaling:**
- **Auto Scaling Group (ASG)**: adds/removes EC2 instances based on CPU or custom metrics
- **Target tracking**: "keep average CPU at 60%" — AWS adjusts instance count automatically

```typescript
// Typical EC2 setup for an API server
const config = {
  instanceType: "t3.medium",   // 2 vCPU, 4GB RAM
  ami: "ami-0abcdef123456",    // Amazon Linux 2
  autoScaling: {
    min: 2,                    // at least 2 for HA
    max: 20,
    targetCPU: 60              // scale when CPU > 60%
  }
};
```

### Lambda

Runs a function in response to an event. No server management. Billing per invocation + duration.

**When to use Lambda:**
- ✅ Event-driven work (S3 uploads, SQS messages, API triggers)
- ✅ Spiky, unpredictable traffic
- ✅ Short tasks (< 15 minutes)
- ❌ Long-running jobs
- ❌ Need warm state between invocations

---

## Storage — S3

S3 stores objects (files) up to 5 TB each. No servers to manage.

**Common patterns:**

| Use case | S3 feature |
|----------|-----------|
| Static website hosting | Enable static hosting on bucket |
| Image/video uploads | Pre-signed URLs (users upload directly) |
| Long-term backups | S3 Glacier storage class |
| CDN origin | CloudFront pulls from S3 |

> Use **pre-signed URLs** to let clients upload directly to S3 — never proxy large files through your server.

---

## Databases — RDS vs DynamoDB

### RDS (Relational Database Service)

Managed PostgreSQL, MySQL, Aurora. AWS handles backups, patches, failover.

**Multi-AZ**: standby replica in another AZ. Automatic failover in ~60 seconds.

**Read Replicas**: up to 15 read-only copies for read scaling. Not for HA (manual promotion needed).

### DynamoDB

Managed NoSQL. Single-digit ms latency at any scale. Fully serverless billing.

**When to use DynamoDB over RDS:**
- ✅ Need < 10 ms at scale
- ✅ Simple key-value lookups (user sessions, product catalog)
- ✅ Massive write throughput
- ❌ Complex joins or ad-hoc queries → use RDS

---

## Messaging — SQS

SQS is a managed queue. Producers push messages; consumers pull and process them.

**Why you reach for SQS:**
- Decouple a slow downstream service (email, video encoding)
- Buffer traffic spikes
- Retry failed work automatically

**Two queue types:**

| Type | Order guaranteed? | Best for |
|------|------------------|----------|
| **Standard** | No | High throughput, at-least-once |
| **FIFO** | Yes | Exactly-once, ordered processing |

---

## CDN — CloudFront

CloudFront caches content at 400+ edge locations globally.

**What to cache:**
- Static assets (JS, CSS, images) — TTL: 1 year
- API responses — TTL: short or disabled

**Origin types:** S3, EC2, ALB, Lambda URL

> Set `Cache-Control: public, max-age=31536000, immutable` on versioned assets. Use short TTL on API responses that change.

---

## DNS — Route 53

Route 53 provides DNS + health checks + traffic routing.

**Key routing policies:**

| Policy | Use case |
|--------|----------|
| **Simple** | Single endpoint |
| **Weighted** | A/B testing, gradual rollouts |
| **Failover** | Primary → secondary on health check failure |
| **Latency** | Route to lowest-latency region |
| **Geolocation** | Route based on user country |

---

## Common Architecture Pattern

```
User → Route 53 → CloudFront → ALB → EC2 ASG → RDS (Multi-AZ)
                                        ↓
                                      SQS → Lambda → S3
```

**Read path:** CloudFront cache → ALB → EC2 → RDS read replica  
**Write path:** ALB → EC2 → RDS primary → SQS → Lambda (async work)

---

## Common Mistakes

❌ **Using EC2 for event-driven, spiky work** — Lambda is cheaper and simpler  
❌ **Storing session state on EC2 instances** — use ElastiCache (Redis) instead  
❌ **Proxying file uploads through your API** — use S3 pre-signed URLs  
❌ **Single-AZ deployment** — always deploy to at least 2 AZs for production

**Key insight:**

> The most important AWS decision in system design is compute shape (EC2 vs Lambda) and database type (RDS vs DynamoDB). Everything else follows from those two choices.

---
[← Back to SystemDesign](../README.md)
