# Design Dropbox

## How to Open This Answer

"I'll design a file sync service like Dropbox. The key challenges are efficient sync with minimal bandwidth — using chunking and delta sync — and handling conflict resolution when the same file is edited on two devices simultaneously."

## Problem Statement

Dropbox lets users store files in the cloud and sync them across multiple devices automatically. The system must handle large files efficiently, detect changes quickly, and keep all devices consistent. File storage and metadata must be treated as completely separate concerns.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Upload a file and have it appear on all linked devices
- Download the latest version of any file
- Automatic sync — detect local file changes and push them to the cloud
- File versioning — restore a previous version of a file
- Shared folders — multiple users sync the same folder

### Non-Functional (pick 3-4)

- Durability: zero data loss — files must survive hardware failures
- Sync latency < 30 seconds after a file changes
- Bandwidth efficient — only transfer the bytes that changed, not the whole file
- Scales to petabytes of stored data with millions of concurrent users

## A — Architecture

### High-Level Diagram

```
Desktop / Mobile Clients
        │
   Load Balancer
        │
  ┌─────┼────────────────┐
  │     │                │
API    Sync           Notification
Server  Server          Service
  │     │   (WebSocket)      │
  │     │                    │
  ▼     ▼                    ▼
Metadata DB          Message Queue
(PostgreSQL)            (Kafka)
        │
   Block Service ──→ Object Storage
   (chunking,         (S3 / GCS)
    dedup, CDN)
```

The client detects file changes using a local watcher. Changed files are split into chunks. Only new or modified chunks are uploaded to the Block Service, which stores them in S3. A pointer to the chunk list is written to the Metadata DB. The Notification Service pushes a "file changed" event to all other devices linked to that account. Those devices pull only the changed chunks — not the whole file.

> Separating block storage (S3) from metadata (PostgreSQL) is the key architectural decision. Metadata queries are fast; block transfers bypass your servers entirely via presigned URLs.

## D — Data Model

```typescript
interface FileMeta {
  fileId: string;
  userId: string;
  name: string;
  path: string;             // e.g. /photos/vacation.jpg
  size: number;             // bytes
  checksum: string;         // SHA-256 of full file
  currentVersionId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FileVersion {
  versionId: string;
  fileId: string;
  chunkIds: string[];       // ordered list of chunk references
  versionNumber: number;
  createdAt: Date;
  createdBy: string;        // device ID that created this version
  comment?: string;
}

interface Chunk {
  chunkId: string;          // SHA-256 of chunk content — content-addressed
  size: number;
  storageKey: string;       // S3 object key
  uploadedAt: Date;
}

interface DeviceSync {
  deviceId: string;
  userId: string;
  lastSyncedAt: Date;
  syncToken: string;        // cursor for delta sync — changes since this token
}
```

Storage notes (plain text):
- file_meta and file_versions: PostgreSQL — supports transactions for version creation, indexed on `(userId, path)`
- chunks table: PostgreSQL or DynamoDB — the chunkId is the SHA-256 hash, enabling deduplication by checking if a chunk already exists before uploading
- File blocks: S3 — stored as `chunks/{chunkId}`, never overwritten (immutable, content-addressed)
- Sync state per device: Redis (`syncToken:{deviceId}`) — fast access during sync polling

## I — Interface (APIs)

```typescript
// POST /api/v1/files/upload-url — get presigned URL to upload chunks directly to S3
interface GetUploadUrlRequest {
  chunkId: string;   // SHA-256 of the chunk
  size: number;
}
interface GetUploadUrlResponse {
  uploadUrl: string;    // S3 presigned PUT URL (5-min TTL)
  alreadyExists: boolean; // true = skip upload, chunk is already stored (dedup)
}

// POST /api/v1/files — commit a new file version after all chunks are uploaded
interface CommitFileRequest {
  path: string;
  chunkIds: string[];    // ordered list of chunk SHA-256s
  checksum: string;      // full-file SHA-256 for integrity check
  deviceId: string;
}
interface CommitFileResponse {
  fileId: string;
  versionId: string;
  updatedAt: string;
}

// GET /api/v1/files/:fileId/versions — list version history
interface VersionHistoryResponse {
  versions: Array<{
    versionId: string;
    versionNumber: number;
    size: number;
    createdAt: string;
    createdBy: string;
  }>;
}

// GET /api/v1/sync/delta?since=:syncToken — get changes since last sync
interface DeltaSyncResponse {
  changes: Array<{
    fileId: string;
    path: string;
    changeType: 'created' | 'modified' | 'deleted';
    newVersionId?: string;
    chunkIds?: string[];
  }>;
  nextSyncToken: string;
}

// GET /api/v1/files/:fileId/download-url — get presigned URL to download chunks
interface DownloadUrlResponse {
  chunks: Array<{ chunkId: string; downloadUrl: string }>;
}
```

## O — Optimizations & Trade-offs

### 1. Chunking Strategy — Reduce Bandwidth

Split files into fixed-size chunks (4 MB default). Each chunk is identified by its SHA-256 hash.

```typescript
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB

async function getFileChunks(filePath: string): Promise<string[]> {
  const chunkIds: string[] = [];
  const fileBuffer = await fs.readFile(filePath);

  for (let offset = 0; offset < fileBuffer.length; offset += CHUNK_SIZE) {
    const chunk = fileBuffer.subarray(offset, offset + CHUNK_SIZE);
    const chunkId = sha256(chunk);
    chunkIds.push(chunkId);
  }
  return chunkIds;
}
```

Before uploading, the client calls `GET /upload-url?chunkId=...`. If `alreadyExists: true`, the chunk is skipped — no upload needed. This is block-level deduplication.

| Scenario | Without Chunking | With Chunking |
|---|---|---|
| Edit 1 line in a 1 GB file | Upload 1 GB | Upload 1 chunk (4 MB) |
| Two users upload same file | Store 2 copies | Store 1 copy (dedup) |
| Resume after interrupted upload | Restart from zero | Resume from last chunk |

### 2. Conflict Resolution — Last Write Wins vs Fork

When two devices edit the same file while offline and both come back online, there is a conflict.

❌ Don't silently overwrite — data loss.
✅ Dropbox's approach: keep both versions. Rename one to `file (conflicted copy 2024-01-10).txt`. Let the user resolve manually.

```typescript
async function commitVersion(
  fileId: string, deviceId: string, newChunks: string[]
): Promise<FileVersion> {
  const current = await db.fileVersions.findLatest(fileId);
  const isConflict = current.createdBy !== deviceId &&
    current.updatedAt > syncState.lastSyncedAt;

  if (isConflict) {
    // Fork: create a conflict copy instead of overwriting
    await createConflictCopy(fileId, deviceId, newChunks);
    return current; // return existing version unchanged
  }

  return db.fileVersions.create({ fileId, chunkIds: newChunks, createdBy: deviceId });
}
```

### 3. Delta Sync — Sync Token Cursor

❌ Don't poll "all files" every 30 seconds — too many DB reads.
✅ Use a monotonic sync token (timestamp or sequence ID). Each device stores its last sync token. `GET /sync/delta?since={token}` returns only files changed after that point.

### 4. Notification — Push vs Poll

| Method | Latency | Server Load |
|---|---|---|
| Long polling | 5–30s | High — many idle connections |
| WebSocket (persistent) | < 1s | Medium — one connection per device |
| Server-Sent Events (SSE) | < 1s | Low — unidirectional, simpler |

✅ Use WebSocket for desktop clients (bidirectional needed for sync control). SSE is fine for mobile clients that mostly receive.

### 5. Storage Cost — Dedup + Compression

| Layer | Savings |
|---|---|
| Block deduplication (same chunk, different files) | 30–50% for enterprise teams |
| Compression (gzip before storing chunk) | 20–40% for text files |
| CDN caching for frequently downloaded chunks | Reduces egress cost |

❌ Don't store chunks without dedup — identical images uploaded by 1M users waste petabytes.
✅ Content-addressed storage (SHA-256 as key) gives dedup for free.

## Common Follow-up Questions

**Q: How do you handle very large files (100 GB video)?**

Use multipart upload: split into chunks client-side, upload each in parallel, commit the ordered chunk list in one metadata write. Client can resume from any chunk boundary on network failure. See [../BuildingBlocks/](../BuildingBlocks/) for chunked upload patterns.

**Q: How do you implement shared folders?**

A shared folder has its own `folderId` with an ACL table mapping `(folderId, userId, permission)`. When any member commits a change, the Notification Service fans out a sync event to all members. Conflict resolution applies at the file level, same as personal files.

**Q: How does versioning work without unlimited storage?**

Keep the last 30 versions for free-tier users. Each version stores only chunk references (< 1 KB of metadata), not duplicate file content. Chunks are reference-counted; a chunk is deleted from S3 only when no version references it. This is garbage collection — run daily.

**Q: How would you scale to 500M users and 5 petabytes of data?**

S3 scales to exabytes natively — no changes needed there. Shard PostgreSQL by `userId` hash. Use read replicas for metadata queries. Shard the Notification Service by `userId % N` nodes. CDN handles download traffic; most requests never reach origin servers.

---

[← Back to InterviewQuestions](../README.md)
