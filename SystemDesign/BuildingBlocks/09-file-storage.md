# File Storage

## 💡 **Concept**

File storage handles the challenge of storing, retrieving, and serving large binary files — images, videos, PDFs, documents — at scale. Application servers are not designed to store files. A dedicated storage system handles durability, availability, and bandwidth efficiently.

**Use object storage when:** users upload files, you need durable long-term storage, or you serve binary content to many users.

---

## Storage Types

| | Object Storage | Block Storage | File Storage (NAS) |
|---|---|---|---|
| **What it stores** | Files as objects with metadata | Raw disk blocks | Files in a directory tree |
| **Access** | HTTP (GET/PUT by key) | Mounted as disk | NFS/SMB mount |
| **Mutability** | Immutable (replace, not edit) | Mutable | Mutable |
| **Scale** | Unlimited (managed) | Limited to disk size | Limited |
| **Latency** | 50–200ms (network) | < 1ms (local disk) | 1–10ms (network) |
| **Cost** | Cheapest per GB | More expensive | Medium |
| **Examples** | S3, GCS, Azure Blob | EBS, Persistent Disk | EFS, Azure Files |
| **Best for** | User uploads, backups, media | Databases, OS volumes | Shared app files, legacy |

---

## How Object Storage Works

Objects use a flat key namespace (not a real filesystem):

```
Bucket: my-app-uploads
  "users/u123/profile.jpg"          ← key
  "reports/2024/q4-report.pdf"      ← key
  "videos/abc123/hls/seg001.ts"     ← key
```

Each object has: key, binary value, Content-Type, Content-Length, and optional metadata tags.

---

## Pre-Signed URLs

Never route file uploads or downloads through your application server — this wastes bandwidth and CPU. Use pre-signed URLs to let clients talk directly to storage.

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface UploadUrlRequest {
  userId: string;
  fileName: string;
  contentType: string;
}

interface UploadUrlResponse {
  uploadUrl: string;  // client PUTs directly to this URL
  fileKey: string;    // store this in your DB
  expiresIn: number;  // seconds
}

const s3 = new S3Client({ region: "us-east-1" });

async function generateUploadUrl(req: UploadUrlRequest): Promise<UploadUrlResponse> {
  const fileKey = `uploads/${req.userId}/${Date.now()}-${req.fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    ContentType: req.contentType,
    Metadata: { userId: req.userId },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return { uploadUrl, fileKey, expiresIn: 300 };
}

async function generateDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}
```

**Upload flow:**
1. Client asks API for a pre-signed upload URL.
2. API generates URL (signed with AWS credentials, 5-min expiry) and returns it.
3. Client uploads file directly to S3 via HTTP PUT.
4. Client notifies API with the `fileKey`.
5. API stores the key in the database.

---

## Multipart Upload

For files > 100 MB, upload in parallel chunks (5 MB minimum per part):

```typescript
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";

interface CompletedPart {
  PartNumber: number;
  ETag: string;
}

async function multipartUpload(fileKey: string, chunks: Buffer[]): Promise<void> {
  const { UploadId } = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: process.env.S3_BUCKET!, Key: fileKey })
  );

  const parts: CompletedPart[] = await Promise.all(
    chunks.map(async (chunk, index) => {
      const { ETag } = await s3.send(
        new UploadPartCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: fileKey,
          UploadId,
          PartNumber: index + 1,
          Body: chunk,
        })
      );
      return { PartNumber: index + 1, ETag: ETag! };
    })
  );

  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      UploadId,
      MultipartUpload: { Parts: parts },
    })
  );
}
```

---

## Storage Tiers

| Tier | Access | Retrieval | Cost (S3 us-east-1) |
|---|---|---|---|
| **Standard** | Frequent | Immediate | $0.023/GB |
| **Infrequent Access** | Monthly | Immediate | $0.0125/GB |
| **Glacier Instant** | Quarterly | Milliseconds | $0.004/GB |
| **Glacier Deep Archive** | Rarely / Compliance | 12 hours | $0.00099/GB |

Use S3 lifecycle rules to automatically tier files:

```typescript
// Files move to IA after 30d, Glacier after 90d, deleted after 365d
const lifecycleRule = {
  Status: "Enabled" as const,
  Transitions: [
    { Days: 30, StorageClass: "STANDARD_IA" },
    { Days: 90, StorageClass: "GLACIER" },
  ],
  Expiration: { Days: 365 },
};
```

---

## When to Use Which Storage

| Scenario | Storage type |
|---|---|
| User profile photos | Object storage (S3) + CDN |
| User-uploaded reports, PDFs | Object storage, pre-signed URL |
| Video files (upload + streaming) | Object storage + multipart + CDN |
| Database volumes, OS disks | Block storage (EBS) |
| Shared config across instances | File storage (EFS) |
| Backups, audit logs | Object storage + Glacier lifecycle |

---

## Common Mistakes

❌ **Routing uploads through your API server** — server becomes a bottleneck and bandwidth costs explode. Use pre-signed URLs for direct client → S3 upload.

❌ **Storing absolute URLs in the database** — URLs break when you migrate buckets or change CDN. Store the object key only; reconstruct the URL at read time.

❌ **No expiry on pre-signed URLs** — a URL without expiry is a permanent backdoor. Set short TTLs: 5 min for uploads, 1 hour for downloads.

❌ **Serving large files through the app server** — put CloudFront or another CDN in front of S3 for all file downloads.

✅ **Enable versioning for critical data** — protects against accidental deletes without a complex backup strategy.

---

## Real-World Example

An enterprise dashboard lets users upload financial reports (PDFs, Excel, up to 500 MB). The API generates a pre-signed S3 URL (5-minute expiry). The browser uploads directly to S3 using multipart for large files. On completion, the browser posts the `fileKey` to the API, which records it in PostgreSQL. Downloads use 1-hour pre-signed GET URLs. Files older than 90 days auto-tier to S3 Infrequent Access via a lifecycle rule. The API server never touches file bytes — only keys.

---

## Key Insight

> Object storage is infinitely scalable, 11-nines durable, and cheaper than block storage per GB. The design rule is simple: the application server stores only the key. All file bytes move directly between the client and the storage layer.

**Related:** [CDN](./03-cdn.md) · [Infrastructure: Storage](../Infrastructure/03-storage.md)

---

[← Back to SystemDesign](../README.md)
