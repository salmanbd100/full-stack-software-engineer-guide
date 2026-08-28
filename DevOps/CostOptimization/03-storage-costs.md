---
title: Storage Cost Optimization
part: 8
chapter: 0
slug: storage-costs
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-04
tags: [devops, cost, optimization, storage, costs]
in_book: false
---

# Storage Cost Optimization

Storage looks cheap per gigabyte, so it is rarely reviewed. It becomes expensive because **nothing ever deletes itself** and because the real cost is often data transfer, not storage.

## The Three Things You Pay For

```
Storage cost = capacity  +  requests  +  data transfer out
                 ↑             ↑                ↑
            per GB/month   per 1,000 ops   per GB egress
```

⚠️ For small-object workloads, **requests can exceed capacity cost**. A million 4 KB objects is 4 GB of storage but potentially millions of billed GET requests.

> Egress is the charge people forget. Moving 50 TB out of S3 to the internet costs far more than storing it for a year.

## S3 Storage Classes

| Class | Use For | Retrieval | Minimum Duration |
|-------|---------|-----------|-----------------|
| **Standard** | Active data, unknown access | Instant | None |
| **Intelligent-Tiering** | ✅ Unpredictable access | Instant | None |
| **Standard-IA** | Known-infrequent, needs instant access | Instant | 30 days |
| **One Zone-IA** | Reproducible data (thumbnails, caches) | Instant | 30 days |
| **Glacier Instant Retrieval** | Archive, still needs millisecond access | Instant | 90 days |
| **Glacier Flexible Retrieval** | Backups, minutes to hours acceptable | 1 min – 12 h | 90 days |
| **Glacier Deep Archive** | Compliance retention, cheapest | 12–48 h | 180 days |

**The decision rule:**

| Do you know the access pattern? | Choose |
|--------------------------------|--------|
| ❌ No | **Intelligent-Tiering** — let AWS move it |
| ✅ Yes, and it's predictable | Explicit class via lifecycle policy |

✅ **Intelligent-Tiering is the safe default** for user-uploaded content, logs, and data lakes. It has a small per-object monitoring fee and moves objects automatically with no retrieval charge between the instant-access tiers.

⚠️ **The minimum duration trap:** deleting a Standard-IA object after 5 days still bills you for 30 days. Moving small, short-lived objects to IA can cost *more* than leaving them in Standard.

⚠️ **The transition cost trap:** each lifecycle transition is a billed request. Transitioning ten million tiny objects can cost more than the storage you save. Below roughly 128 KB, objects are usually not worth transitioning at all.

## Lifecycle Policies

A lifecycle policy is the only reliable way to stop storage growing forever.

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "log-tiering"
    status = "Enabled"
    filter { prefix = "app-logs/" }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
    expiration {
      days = 400          # ✅ actually delete it
    }
  }

  # 🔴 Almost always missing — silent, invisible cost
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }

  # Versioned buckets grow without this
  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}
```

**The three rules every bucket needs:**

| Rule | What It Prevents |
|------|-----------------|
| `abort_incomplete_multipart_upload` | Invisible partial uploads billed forever |
| `noncurrent_version_expiration` | Versioning turning a 1 TB bucket into 10 TB |
| `expiration` | Data living past its useful or legal life |

🔴 Failed multipart uploads do **not** appear in the console object listing but are fully billed. On a bucket with a flaky upload client this can be terabytes.

## EBS Optimization

**The single easiest storage win in AWS: `gp2` → `gp3`.**

| | gp2 | gp3 |
|---|-----|-----|
| **Price per GB** | Higher | ~20% lower |
| **IOPS** | Tied to size (3 IOPS/GB) | 3,000 baseline, independent |
| **Throughput** | Tied to size | 125 MB/s baseline, independent |

❌ **The gp2 anti-pattern:** provisioning a 1 TB volume to get 3,000 IOPS when you only need 100 GB of space. You are buying 900 GB of storage as a way to buy IOPS.
✅ **gp3:** 100 GB volume, 3,000 IOPS included. Same performance, a fraction of the cost.

```bash
# Online modification — no downtime, no snapshot needed
aws ec2 modify-volume --volume-id vol-0abc123 --volume-type gp3
```

**Other EBS waste:**

| Waste | Cause | Fix |
|-------|-------|-----|
| **Unattached volumes** | `DeleteOnTermination=false` | Set it true; sweep for `status=available` |
| **Snapshot sprawl** | Manual snapshots, no expiry | Data Lifecycle Manager policy |
| **Over-provisioned io2** | Chosen "for safety" | Measure — most workloads fit gp3 |
| **Volumes far larger than used** | Grown for a one-off migration | EBS cannot shrink; recreate from snapshot |

⚠️ EBS volumes can be **grown but never shrunk**. Provision conservatively; growing later is a single online command.

**Find unattached volumes:**

```bash
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[].{ID:VolumeId,GB:Size,Created:CreateTime}' \
  --output table
```

## Data Transfer — The Invisible Bill

Data transfer is usually the least understood part of an AWS bill, and it cannot be tagged.

| Path | Cost |
|------|------|
| Into AWS from internet | **Free** |
| Within one AZ, private IP | **Free** |
| **Between AZs in a region** | Charged **both** directions |
| Between regions | Charged, higher |
| Out to internet | Most expensive |
| Via NAT Gateway | Hourly **plus** per-GB processing |
| S3/DynamoDB via **Gateway Endpoint** | **Free** |
| Other services via **Interface Endpoint** | Hourly per AZ + per-GB, still cheaper than NAT |
| Out via **CloudFront** | Cheaper than direct S3/EC2 egress |

**The two highest-value fixes:**

```
❌ Private subnet → NAT Gateway → S3
   Pay NAT hourly + NAT per-GB + nothing saved

✅ Private subnet → S3 Gateway Endpoint → S3
   Free, and traffic never leaves the AWS network
```

```hcl
# Free, and removes the largest NAT cost driver for container workloads
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids
}
```

✨ ECR image layers are stored in S3. An S3 gateway endpoint plus ECR interface endpoints often removes most NAT data processing cost on an EKS or ECS cluster.

⚠️ **Cross-AZ chatter** is the silent one. A service in AZ-a calling a database in AZ-b pays per GB in both directions on every query. High availability requires multi-AZ, so the fix is not collapsing to one AZ — it is keeping chatty request paths AZ-local where possible, and being aware of the trade.

## Logs and Backups

| Source | The Problem | Fix |
|--------|------------|-----|
| **CloudWatch log groups** | Default retention is "never expire" | Set retention on **every** group |
| **VPC Flow Logs to CloudWatch** | Enormous ingestion charges | Send to S3 instead |
| **`DEBUG` left on in prod** | ~10× log volume | `INFO` default, per-request override |
| **Health check logs** | 30–60% of Kubernetes log lines | Drop at the log shipper |
| **RDS automated backups** | Free up to DB size, then charged | Right-size retention window |
| **AMI sprawl** | Each AMI holds snapshots | Deregister and delete snapshots together |

```bash
# Find every log group with no retention — usually the biggest CloudWatch line item
aws logs describe-log-groups \
  --query 'logGroups[?!retentionInDays].logGroupName' \
  --output table
```

✅ Enforce retention with an AWS Config rule (`cw-loggroup-retention-period-check`) or set it in Terraform whenever the group is created.

## Interview Q&A

**Q: How would you reduce S3 costs for a bucket holding 200 TB of application logs?**

First check what is actually in there, using S3 Storage Lens or an inventory report, because the answer differs for a few large objects versus millions of tiny ones. For logs, access almost always drops off sharply after a few days, so a lifecycle policy is the main tool: keep recent data in Standard for querying, transition to Standard-IA or Glacier Instant Retrieval after a month, and — most importantly — set an expiration so the data eventually leaves. I would also add rules to abort incomplete multipart uploads and expire non-current versions, which are commonly missed and invisible in the console. If the objects are small, I would check whether transition request charges exceed the savings, and consider compacting them into larger files first, which also makes Athena queries far cheaper.

**Q: What is the difference between gp2 and gp3, and why is migrating almost always correct?**

With gp2, performance is tied to volume size at three IOPS per gigabyte, so the only way to get more IOPS is to buy more capacity you do not need. gp3 decouples them: every volume gets 3,000 IOPS and 125 MB/s of throughput as a baseline regardless of size, and you can provision more independently. gp3 is also around 20% cheaper per gigabyte. So a team that provisioned a 1 TB gp2 volume purely to reach 3,000 IOPS can move to a much smaller gp3 volume with identical performance. The migration is an online volume modification with no downtime and no snapshot, which makes it one of the rare optimizations with real savings and essentially no risk.

**Q: Where does data transfer cost come from, and how do you reduce it?**

Inbound traffic is free and same-availability-zone private traffic is free, but almost everything else is charged. The three big sources are internet egress, cross-availability-zone traffic, and NAT Gateway processing. NAT is the one most teams get wrong: private subnets routing S3, ECR, and DynamoDB traffic through NAT pay both an hourly charge and a per-gigabyte processing charge for traffic that could travel free. Adding S3 and DynamoDB gateway endpoints costs nothing and removes that entirely, and interface endpoints for ECR, Secrets Manager, and similar services are cheaper than NAT at volume. For internet egress, serving through CloudFront is cheaper per gigabyte than direct from S3 or an instance. Cross-availability-zone charges are the hardest, since you need multi-AZ for availability — the goal there is keeping chatty paths zone-local rather than removing redundancy.

**Q: Why do failed uploads cost money in S3?**

A multipart upload stores each uploaded part immediately, but the parts only become an object when the upload is completed. If the client fails partway through and never aborts, those parts stay in the bucket indefinitely. They are fully billed as storage, but they do not appear when you list objects in the console, so nobody notices. On a bucket with an unreliable upload path this can quietly reach terabytes. The fix is a one-line lifecycle rule that aborts incomplete multipart uploads after seven days, which should be on every bucket by default.

---

[← Optimization Strategies](./02-optimization.md) | [Index](./README.md) | [Performance Tuning →](./04-performance.md)
