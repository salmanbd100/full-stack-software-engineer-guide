# Storage

## 💡 **Concept**

Cloud storage splits into three categories: **object storage** (files and blobs via HTTP), **block storage** (network disks attached to VMs), and **file storage** (shared NFS drives). Picking the wrong type wastes money and adds latency.

**How to answer in an interview:** "I'll separate storage concerns: S3 for user-uploaded files and static assets, EBS for database disks, ElastiCache for ephemeral session data, and Glacier for long-term archival."

---

## The Three Storage Types

| Type | AWS Service | Access pattern | Use case |
|------|------------|---------------|---------|
| **Object** | S3 | HTTP GET/PUT | Files, images, backups, static sites |
| **Block** | EBS | Disk (POSIX) | EC2 root disk, database data files |
| **File** | EFS | NFS mount | Shared config, CMS media |

---

## S3 — Object Storage

S3 stores objects up to 5 TB. No server management. 11 nines of durability.

### Storage classes

| Class | Access frequency | Cost vs STANDARD | Retrieval latency |
|-------|-----------------|-----------------|------------------|
| **STANDARD** | Daily | 1× | ms |
| **STANDARD_IA** | Monthly | 0.5× | ms |
| **GLACIER** | Quarterly | 0.05× | 3–5 hours |
| **GLACIER_DEEP_ARCHIVE** | Rarely | 0.02× | 12 hours |

> Use **S3 Lifecycle Policies** to auto-tier: move to IA after 30 days, Glacier after 90 days.

### Pre-signed URLs — never proxy large files

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function getUploadUrl(bucket: string, key: string): Promise<string> {
  const client = new S3Client({ region: "us-east-1" });
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "image/jpeg"
  });
  // Client uploads directly to S3 — your server never handles bytes
  return getSignedUrl(client, command, { expiresIn: 300 });
}
```

**Why pre-signed URLs:** clients upload directly to S3. No bandwidth cost or timeout risk on your server.

### Versioning and Replication

- **Versioning**: keeps all previous versions. Protects against accidental deletes.
- **Cross-Region Replication (CRR)**: async copy to another region for disaster recovery or latency.

---

## EBS — Block Storage

EBS is a network-attached disk for EC2. It persists after the instance stops (unlike instance store).

### Volume types

| Type | Use case | Max IOPS |
|------|---------|---------|
| **gp3** | General (OS, apps) | 16,000 |
| **io2 Block Express** | High-IOPS databases | 256,000 |
| **st1** | Sequential reads (analytics) | 500 MB/s |
| **sc1** | Cold data, lowest cost | 250 MB/s |

> **Always use gp3 for new volumes.** It decouples IOPS from size (unlike gp2), so you pay only for what you need.

### EBS vs Instance Store

| | EBS | Instance Store |
|--|-----|---------------|
| Persists on stop | ✅ | ❌ |
| Network latency | < 1 ms | < 0.1 ms (local NVMe) |
| Use case | Production data | Temp cache, scratch |

---

## EFS — File Storage

EFS is a shared NFS file system that multiple EC2 instances mount simultaneously.

**Use EFS when:**
- ✅ Multiple servers need the same files (CMS, shared config)
- ✅ Lambda functions need shared writable storage
- ❌ High-IOPS database — use EBS io2

---

## Decision Tree

```
What are you storing?
├── User uploads / static assets → S3
├── Database data files / OS disk → EBS gp3 (or io2 for high IOPS)
├── Shared files across instances → EFS
├── Ephemeral session data        → ElastiCache (Redis)
└── Compliance / long-term logs   → S3 Glacier Deep Archive
```

---

## Common Mistakes

❌ **Serving S3 files through your API** — use CloudFront in front of S3 directly  
❌ **Using gp2 instead of gp3** — gp3 is cheaper and lets you configure IOPS independently  
❌ **No S3 lifecycle policy** — old objects accumulate cost silently  
❌ **Storing secrets in S3** — use AWS Secrets Manager or Parameter Store

**Key insight:**

> S3 is the default for any file storage need. EBS is for EC2 disks only. If two services need the same files, use S3 (with CloudFront) — it's globally scalable and cheaper than EFS at scale.

---
[← Back to SystemDesign](../README.md)
