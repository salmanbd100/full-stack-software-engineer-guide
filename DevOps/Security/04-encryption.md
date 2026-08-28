---
title: Encryption & KMS
part: 8
chapter: 0
slug: devops-security-encryption
level: intermediate # beginner | intermediate | advanced
reading_time: 17
updated: 2026-08-03
tags: [devops, security, encryption]
in_book: false
---

# Encryption & KMS

Encryption is the layer that assumes every other control failed. This file covers KMS mechanics, which is where the interview questions live.

## Envelope Encryption

🔴 **The concept KMS is built on, and the most-asked encryption question.**

**The problem:** KMS will not encrypt anything larger than 4 KB, and sending gigabytes to an API would be slow and expensive.

**The solution:** encrypt the data locally with a data key, then encrypt the data key with KMS.

```
1. Ask KMS for a data key
       → KMS returns TWO copies:
         • plaintext data key  (use it, then destroy it)
         • encrypted data key  (store it next to the ciphertext)

2. Encrypt your data locally with the plaintext data key (AES-256)

3. Discard the plaintext data key from memory

4. Store: [encrypted data key] + [ciphertext]

To decrypt:
1. Send the encrypted data key to KMS → get the plaintext key back
2. Decrypt the data locally
3. Discard the plaintext key
```

```
┌──────────────────────────────────────────┐
│ KMS key (CMK)  — never leaves KMS        │
│    │ encrypts                             │
│    ▼                                      │
│ Data key  — plaintext exists only briefly │
│    │ encrypts                              │
│    ▼                                       │
│ Your data — any size, encrypted locally    │
└──────────────────────────────────────────┘
```

**Why this design wins:**

| Benefit | Reason |
|---------|--------|
| **No size limit** | Bulk encryption happens locally |
| **Fast** | One small API call regardless of data size |
| **Cheap** | You pay per KMS request, not per gigabyte |
| **Key never exposed** | ✅ The CMK never leaves KMS hardware |
| **Rotation is cheap** | Re-encrypt the small data key, not the data |

✅ **Every AWS service using "encryption at rest with KMS" does exactly this** — S3, EBS, RDS, DynamoDB. Understanding it explains all of them at once.

## Key Types

| Type | Managed By | Rotation | Key Policy | Cost |
|------|-----------|----------|-----------|------|
| **AWS owned** | AWS, shared across accounts | AWS | 🔴 None — invisible to you | Free |
| **AWS managed** (`aws/s3`) | AWS, per-account | ✅ Automatic yearly | 🔴 Not editable | Free |
| **Customer managed** (CMK) | ✅ You | Optional, configurable | ✅ Full control | $1/month + requests |

🔴 **When an interviewer asks "why pay for a customer-managed key?", the answer is control, not stronger cryptography.** The algorithm is identical.

| Customer-managed key gives you | Why it matters |
|-------------------------------|----------------|
| **A key policy** | ✅ A second authorisation gate independent of IAM |
| **Cross-account sharing** | Not possible with AWS-managed keys |
| **Auditability** | Every use appears in CloudTrail with the caller |
| **Revocation** | ✅ Disable the key and the data is instantly unreadable |
| **Rotation control** | Choose the schedule |
| **Deletion** | 7–30 day waiting period, then the data is gone forever |

> ✅ **The strongest argument is the second gate.** With a customer-managed key, reading an encrypted S3 object requires both `s3:GetObject` **and** `kms:Decrypt`. An over-permissive S3 policy alone is not enough — which has turned real breaches into non-events.

## Key Policies

🔴 **A KMS key policy is not optional.** Unlike most resource policies, if the key policy does not allow an action, IAM cannot grant it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccountToDelegateViaIAM",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowApplicationUse",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/payments-api" },
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "kms:ViaService": "s3.eu-west-1.amazonaws.com" }
      }
    },
    {
      "Sid": "DenyKeyDeletion",
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["kms:ScheduleKeyDeletion", "kms:DisableKey"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": "arn:aws:iam::111122223333:role/break-glass"
        }
      }
    }
  ]
}
```

⚠️ **The `root` statement is what enables IAM delegation.** Omit it and the key becomes manageable only by whoever is explicitly listed — a genuine way to lock yourself out permanently, with no AWS support recovery.

✨ **`kms:ViaService` is the most useful condition key.** It restricts key use to requests arriving through a specific service, so a role can decrypt S3 objects but cannot call `kms:Decrypt` directly to unwrap arbitrary ciphertext.

## Encryption Context

Additional authenticated data — cryptographically bound to the ciphertext.

```typescript
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({});

interface EncryptResult {
  encryptedDataKey: Uint8Array;
  plaintextDataKey: Uint8Array;
}

async function getDataKey(keyId: string, tenantId: string): Promise<EncryptResult> {
  const response = await kms.send(
    new GenerateDataKeyCommand({
      KeyId: keyId,
      KeySpec: "AES_256",
      // ✅ Bound to the ciphertext — decryption MUST supply the same context
      EncryptionContext: { tenant: tenantId, purpose: "document-store" },
    }),
  );

  return {
    encryptedDataKey: response.CiphertextBlob!,
    plaintextDataKey: response.Plaintext!,
  };
}

async function unwrapDataKey(
  encryptedDataKey: Uint8Array,
  tenantId: string,
): Promise<Uint8Array> {
  const response = await kms.send(
    new DecryptCommand({
      CiphertextBlob: encryptedDataKey,
      // 🔴 A mismatch here fails decryption — this is the security property
      EncryptionContext: { tenant: tenantId, purpose: "document-store" },
    }),
  );

  return response.Plaintext!;
}
```

✅ **Two benefits:**

1. **Tamper protection** — the ciphertext cannot be moved to a different context and decrypted
2. **Auditability** — the context appears in CloudTrail, so you see *which tenant's* data was decrypted

**And it can be enforced in the key policy:**

```json
{
  "Effect": "Allow",
  "Action": "kms:Decrypt",
  "Resource": "*",
  "Condition": {
    "StringEquals": { "kms:EncryptionContext:tenant": "${aws:PrincipalTag/tenant}" }
  }
}
```

> ✨ **That policy makes cross-tenant decryption impossible at the cryptographic layer**, which is a far stronger multi-tenant isolation guarantee than application logic.

## Key Rotation

```hcl
resource "aws_kms_key" "data" {
  description             = "Application data encryption"
  enable_key_rotation     = true
  rotation_period_in_days = 365
  deletion_window_in_days = 30    # ✅ maximum — time to notice a mistake
}

resource "aws_kms_alias" "data" {
  name          = "alias/acme-app-data"    # ✅ reference the alias, not the key ID
  target_key_id = aws_kms_key.data.key_id
}
```

🔴 **A common misconception: rotation does not re-encrypt your data.**

```
Rotation creates new key MATERIAL. The key ID stays the same.

Old data → still decrypts with the retained old material  ✅ automatic
New data → encrypted with the new material
```

✅ KMS retains all previous material forever, so nothing needs re-encrypting and nothing breaks. Deleting the key destroys **all** material and therefore all data ever encrypted with it.

⚠️ **Always reference keys by alias.** Aliases can be repointed; hard-coded key IDs cannot, so a key replacement means editing every consumer.

## Encryption at Rest

```hcl
# S3 — bucket keys reduce KMS request cost dramatically
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data.arn
    }
    bucket_key_enabled = true    # ✅ up to 99% fewer KMS calls
  }
}

# EBS — enable by default at the account level so nothing is missed
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}

resource "aws_ebs_default_kms_key" "main" {
  key_arn = aws_kms_key.ebs.arn
}
```

✨ **S3 Bucket Keys are the single best KMS cost optimisation.** Without them, every object operation is a KMS request. With them, S3 generates a bucket-level key and reuses it, cutting KMS calls by up to 99% on high-volume buckets.

| Service | Encryption Notes |
|---------|-----------------|
| **S3** | Enable bucket keys; consider `aws:kms:dsse` for double encryption |
| **EBS** | 🔴 Cannot encrypt an existing unencrypted volume — snapshot, copy with encryption, restore |
| **RDS** | 🔴 Cannot encrypt an existing unencrypted instance — snapshot, copy encrypted, restore |
| **DynamoDB** | Encrypted by default; choose a CMK for control |
| **EFS** | Must be set at creation |
| **EKS** | `encryption_config` for Secrets envelope encryption in etcd |

🔴 **"Can you enable encryption on an existing RDS instance?" — No.** You take a snapshot, copy the snapshot with encryption enabled, and restore from the copy. That is a migration with downtime, which is why encryption must be set at creation.

## Encryption in Transit

```json
// Refuse any unencrypted request to the bucket
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::acme-data", "arn:aws:s3:::acme-data/*"],
  "Condition": { "Bool": { "aws:SecureTransport": "false" } }
}
```

| Layer | Control |
|-------|---------|
| **Client to edge** | ACM certificate, TLS 1.2 minimum, HSTS |
| **Edge to backend** | Re-encrypt, or accept VPC-internal plaintext |
| **Service to service** | Mesh mTLS, or application TLS |
| **To RDS** | `rds.force_ssl = 1` parameter, and verify the CA in the client |
| **To S3** | `aws:SecureTransport` deny statement |
| **Cross-AZ** | ✅ AWS encrypts at the physical layer automatically |

⚠️ **Setting `rds.force_ssl` is not enough on its own.** The client must also verify the server certificate — otherwise the connection is encrypted but vulnerable to interception, which is the same mistake as trusting a self-signed certificate.

## Multi-Region Keys

```hcl
resource "aws_kms_key" "primary" {
  multi_region = true
  description  = "Multi-region data key"
}

resource "aws_kms_replica_key" "replica" {
  provider                = aws.us_east_1
  primary_key_arn         = aws_kms_key.primary.arn
  deletion_window_in_days = 30
}
```

✅ Replica keys share key material, so **ciphertext encrypted in one region decrypts in the other** — which single-region keys cannot do.

**Use for:**

- Cross-region disaster recovery of encrypted backups
- Global DynamoDB tables
- Cross-region S3 replication of encrypted objects

⚠️ Shared material means a wider blast radius. If the material is compromised, it is compromised everywhere. Use multi-region keys only where cross-region decryption is genuinely required.

## Cost Control

| Cost | Driver |
|------|--------|
| $1/month per customer-managed key | Key count |
| Per 10,000 requests | 🔴 `Decrypt` and `GenerateDataKey` volume |

🔴 **KMS request charges surprise people.** A high-traffic S3 workload without bucket keys can generate millions of KMS requests a day.

| Optimisation | Effect |
|-------------|--------|
| ✅ S3 Bucket Keys | Up to 99% fewer requests |
| ✅ Data key caching in the app | Reuse one data key across many operations |
| One key per data classification, not per resource | Fewer keys, simpler policies |
| AWS-managed keys where control is not needed | Free |

⚠️ Data key caching trades security for cost — a cached key covers more data, so a leak exposes more. The AWS Encryption SDK's caching materials manager lets you bound it by time, message count, and bytes.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Key policy without the `root` statement | 🔴 Permanently locked out, unrecoverable | Always include it |
| Hard-coded key IDs | Cannot replace a key | Reference the alias |
| Expecting rotation to re-encrypt data | Misplaced confidence | Rotation adds material; old material is retained |
| No bucket keys on a high-volume bucket | Large KMS bill | `bucket_key_enabled = true` |
| Planning to encrypt RDS/EBS later | Not possible in place | Set at creation |
| `deletion_window_in_days = 7` | Little time to catch a mistake | Use 30 |
| Same key for every environment | Dev can decrypt prod data | Key per environment, ideally per account |
| `force_ssl` without CA verification | Encrypted but interceptable | Verify the certificate client-side |

## Interview Q&A

**Q: Explain envelope encryption.**

KMS will not encrypt data larger than 4 KB, and pushing gigabytes through an API would be slow and expensive, so envelope encryption uses two layers of keys. You ask KMS for a data key and it returns two versions: a plaintext copy and a copy encrypted under your KMS key. You encrypt your data locally with the plaintext key using AES-256, then discard the plaintext key from memory, and store the encrypted data key alongside the ciphertext. To decrypt, you send the encrypted data key back to KMS, get the plaintext version, decrypt locally, and discard it again. The benefits are that there is no size limit because bulk encryption is local, it is fast and cheap because the API call is small and independent of data size, and the KMS key itself never leaves KMS hardware. Every AWS service offering encryption at rest with KMS works exactly this way, so understanding it explains S3, EBS, RDS, and DynamoDB simultaneously.

**Q: Why would you pay for a customer-managed key instead of using the free AWS-managed one?**

Control and auditability, not stronger cryptography — the algorithm is identical. The most valuable property is that a customer-managed key has a key policy, which is a second authorisation gate independent of IAM. Reading an encrypted S3 object then requires both `s3:GetObject` and `kms:Decrypt`, so an over-permissive bucket policy alone does not expose the data, which has turned real incidents into non-events. Beyond that, you get cross-account sharing, which AWS-managed keys cannot do; CloudTrail records showing exactly which principal decrypted what and when; control over the rotation schedule; and the ability to disable the key, which makes the data instantly unreadable everywhere — a genuine emergency control. The costs are a dollar a month per key plus request charges, which is negligible next to those properties for anything sensitive.

**Q: Does key rotation re-encrypt your data?**

No, and this is a common misconception. Rotation generates new cryptographic material while keeping the same key ID and ARN. New encryption operations use the new material; existing ciphertext continues to decrypt using the retained old material, which KMS keeps indefinitely. So rotation is transparent, requires no re-encryption, and cannot break existing data. The corollary is important: because all previous material lives inside the key, deleting the key destroys every version of the material and therefore every piece of data ever encrypted with it, which is why the deletion window exists and why I always set it to the maximum thirty days. If you genuinely need old data re-encrypted under new material — for example to satisfy a cryptographic-erasure requirement — that is a separate re-encryption job you have to run yourself.

**Q: What is encryption context and why is it useful?**

It is additional authenticated data supplied at encryption time and cryptographically bound to the ciphertext, so decryption must present exactly the same context or it fails. Two things make it valuable. First, tamper protection: ciphertext encrypted for one tenant cannot be moved and decrypted in another tenant's context, because the context is part of the authentication. Second, auditability: the context appears in CloudTrail, so instead of seeing that a role called `kms:Decrypt` you see which tenant's data was decrypted, which is far more useful during an investigation. The strongest use is enforcing it in the key policy with a condition like `kms:EncryptionContext:tenant` matching the caller's principal tag — that makes cross-tenant decryption impossible at the cryptographic layer, which is a much better multi-tenant isolation guarantee than relying on application logic to filter correctly.

**Q: Can you enable encryption on an existing unencrypted RDS instance?**

No, not in place. The path is to take a snapshot of the unencrypted instance, copy that snapshot with encryption enabled specifying your KMS key, then restore a new instance from the encrypted copy and cut over. That means a migration with downtime, or a more involved replication-based approach if downtime is unacceptable. The same constraint applies to EBS volumes — you snapshot, copy with encryption, and create a new volume. This is precisely why encryption has to be a creation-time decision, and why I would enable EBS encryption by default at the account level and set a default KMS key, so no unencrypted volume can be created by accident. It is also a good reason to have a Config rule detecting unencrypted resources, since finding out later is expensive.

**Q: Why is our KMS bill unexpectedly high?**

Request volume rather than key count, almost certainly. Keys cost a dollar a month, which is trivial, but `Decrypt` and `GenerateDataKey` are charged per ten thousand requests and a busy workload generates enormous numbers of them. The classic case is a high-traffic S3 bucket with SSE-KMS but without S3 Bucket Keys enabled, where every single object operation becomes a separate KMS request — enabling bucket keys makes S3 generate a bucket-level key and reuse it, cutting KMS calls by up to ninety-nine percent, and it is a one-line change. The other contributor is an application calling KMS per operation rather than caching a data key and reusing it across many records; the AWS Encryption SDK's caching materials manager does this with explicit bounds on time, message count, and bytes, so you can trade cost against blast radius deliberately rather than accidentally.

---
[Security Index](./README.md) | [← Secrets Management](./03-secrets.md) | [Container Security →](./05-container-security.md)
