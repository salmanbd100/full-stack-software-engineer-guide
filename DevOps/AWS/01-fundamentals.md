# AWS Fundamentals

AWS is the leading cloud platform. Before diving into individual services, understand the concepts that apply across everything: global infrastructure, the CLI, the shared responsibility model, and the Well-Architected Framework.

## Core Service Categories

| Category | Key Services | Use Case |
|----------|-------------|----------|
| **Compute** | EC2, Lambda, ECS, EKS | Run applications |
| **Storage** | S3, EBS, EFS | Store data |
| **Database** | RDS, DynamoDB, Aurora, ElastiCache | Manage data |
| **Networking** | VPC, Route 53, CloudFront, ALB/NLB | Connect and route |
| **Security** | IAM, KMS, Secrets Manager, WAF | Control access |
| **DevOps** | CodePipeline, CodeBuild, CodeDeploy | CI/CD |
| **Monitoring** | CloudWatch, X-Ray, CloudTrail | Observe and audit |

## Global Infrastructure

```
AWS Global Infrastructure
├── Regions (30+)              — Geographic locations
│   ├── us-east-1 (N. Virginia)  ← largest, most services, lowest cost
│   ├── us-west-2 (Oregon)
│   ├── eu-west-1 (Ireland)
│   └── ap-northeast-1 (Tokyo)
│
├── Availability Zones (3–6 per region)
│   ├── us-east-1a
│   ├── us-east-1b
│   └── us-east-1c              ← physically separate, shared region
│
└── Edge Locations (400+)       — CloudFront CDN endpoints
```

**Region** — a geographic location with multiple isolated data centers.

**Availability Zone (AZ)** — one or more physically separate data centers within a region. An AZ failure doesn't bring down other AZs in the same region.

**Edge Location** — CDN endpoint. CloudFront serves cached content from the edge closest to the user.

### How to Choose a Region

1. **Latency** — closest to your users
2. **Compliance** — data residency laws (GDPR, HIPAA, local sovereignty)
3. **Service availability** — not every service is in every region
4. **Cost** — prices vary (us-east-1 is often cheapest)

## AWS CLI Setup

```bash
# Install AWS CLI v2 (Mac)
brew install awscli

# Configure default profile
aws configure
# Enter: Access Key ID, Secret Access Key, region, output format

# Multiple profiles (dev vs prod)
aws configure --profile prod
aws s3 ls --profile prod
export AWS_PROFILE=prod       # Set for the full shell session

# Verify who you're authenticated as
aws sts get-caller-identity
```

> ⚠️ Never use root account credentials for daily work. Create an IAM user with least-privilege permissions.

```bash
# Useful CLI patterns
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress]' \
  --output table

# Output formats: json (default), table, text, yaml
aws s3 ls --output table
```

## Shared Responsibility Model

### 💡 **One of the most common interview topics**

AWS and the customer share security responsibilities. The split depends on the service type.

```
AWS is responsible for:           Customer is responsible for:
────────────────────────          ────────────────────────────
Physical security                 Data (encryption, classification)
Hardware and networking           IAM users, roles, and policies
AWS managed infra                 Application security
Managed service internals         OS patches (EC2)
                                  Network config (VPC, SGs, NACLs)
```

| Service | AWS Manages | You Manage |
|---------|------------|------------|
| **EC2** | Hardware, hypervisor | OS, patches, app, IAM |
| **RDS** | DB engine updates, hardware | DB data, users, SGs |
| **S3** | Durability, infra | Bucket policy, encryption |
| **Lambda** | Runtime, scaling, infra | Function code, IAM role |
| **EKS** | Control plane | Worker nodes, pods, apps |

**Memory aid:** AWS secures the cloud **infrastructure**, you secure what you put **in** the cloud.

## AWS Organizations

Manage multiple AWS accounts under one umbrella.

```
Root (Management Account)
├── Production OU
│   ├── Prod-App Account
│   └── Prod-DB Account
├── Development OU
│   └── Dev Account
└── Shared Services OU
    ├── Logging Account
    └── Security Account
```

**Why use separate accounts?**
- Billing isolation (charge-back by team)
- Blast radius reduction (dev mistake can't affect prod)
- Separate IAM namespaces
- Compliance and audit boundaries

**Service Control Policies (SCPs)** — enforce guardrails across all accounts. For example: block EC2 in unapproved regions, require encryption on all S3 buckets, prevent disabling CloudTrail.

## Well-Architected Framework

Five pillars that define production-ready AWS workloads:

| Pillar | Core Practice |
|--------|--------------|
| **Operational Excellence** | IaC, runbooks, observability, CI/CD |
| **Security** | Least privilege, encryption everywhere, audit logs |
| **Reliability** | Multi-AZ, auto-scaling, health checks, backups |
| **Performance Efficiency** | Right-sizing, caching, CDN, serverless where appropriate |
| **Cost Optimization** | Reserved instances, right-sizing, S3 lifecycle policies |

> In interviews, reference the Well-Architected Framework when asked to "design a resilient system" or "reduce AWS costs."

## Interview Q&A

**Q: What's the difference between Region and Availability Zone?**
A Region is a geographic location (us-east-1). An AZ is one or more physically separate data centers inside that region (us-east-1a, us-east-1b). Deploy across at least 2 AZs for high availability — one AZ going down won't take you offline.

**Q: Explain the Shared Responsibility Model.**
AWS secures the cloud infrastructure — physical hardware, global network, and managed service internals. You secure what's in the cloud — your data, IAM configuration, application code, OS patches on EC2, and network settings like VPC and Security Groups.

**Q: How would you design for high availability on AWS?**
Deploy across 2+ AZs. Use an ALB to distribute traffic. Put compute in an Auto Scaling Group so it recovers from failures. Use RDS Multi-AZ for databases. Enable health checks on all layers. Use Route 53 failover for cross-region DR.

**Q: What are SCPs and when would you use them?**
Service Control Policies are permission boundaries applied to AWS accounts within Organizations. They don't grant permissions — they restrict the maximum permissions any IAM entity in that account can have. Use them to enforce compliance: block regions you don't use, prevent deleting audit logs, require encryption tags.

**Q: What's the AWS Well-Architected Framework?**
Five pillars: Operational Excellence, Security, Reliability, Performance Efficiency, and Cost Optimization. It's a structured way to evaluate architecture decisions. AWS offers a Well-Architected Tool to review workloads against these pillars and get improvement recommendations.

---
[← DevOps](../README.md) | [IAM →](./02-iam.md)
