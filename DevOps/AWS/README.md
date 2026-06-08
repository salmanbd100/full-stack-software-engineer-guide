# AWS - Interview Preparation

AWS fundamentals for DevOps engineers. Covers the services that appear most in senior-level interviews.

## Table of Contents

1. [AWS Fundamentals](./01-fundamentals.md) — regions, CLI, shared responsibility, Well-Architected
2. [IAM](./02-iam.md) — users, roles, policies, least privilege
3. [VPC](./03-vpc.md) — subnets, gateways, security groups vs NACLs
4. [EC2](./04-ec2.md) — instance types, Auto Scaling Groups, pricing models
5. [ECS & Fargate](./05-ecs.md) — container orchestration, task definitions, deployment
6. [Lambda](./06-lambda.md) — serverless, triggers, cold starts, best practices
7. [S3](./07-s3.md) — object storage, storage classes, access control
8. [EBS & EFS](./08-storage.md) — block and file storage, when to use each
9. [RDS](./09-rds.md) — managed databases, Multi-AZ vs read replicas
10. [DynamoDB](./10-dynamodb.md) — NoSQL, partition keys, GSI, access patterns
11. [Route 53](./11-route53.md) — DNS, routing policies, health checks
12. [CloudFront](./12-cloudfront.md) — CDN, origins, cache behaviors
13. [Load Balancers](./13-load-balancers.md) — ALB vs NLB, listener rules, target groups
14. [CloudWatch](./14-cloudwatch.md) — metrics, alarms, logs, dashboards
15. [Security Services](./15-security.md) — CloudTrail, GuardDuty, Config, KMS

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | IAM, VPC | Every AWS interview — no exceptions |
| 🔴 Critical | EC2, ECS/Fargate | Core compute decisions |
| 🟡 High | S3, RDS, DynamoDB | Storage and database design |
| 🟡 High | CloudWatch, Load Balancers | Reliability and observability |
| 🟢 Good to know | Route 53, CloudFront | Architecture completeness |
| 🟢 Good to know | Security Services | Security-first mindset |

## Start Here

**→** [AWS Fundamentals](./01-fundamentals.md)

Then prioritize: **IAM → VPC → ECS → CloudWatch**. These appear in almost every DevOps interview.

---
[← DevOps](../README.md)
