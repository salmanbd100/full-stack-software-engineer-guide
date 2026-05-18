# Design YouTube

## How to Open This Answer

"I'll design YouTube's core video platform — upload pipeline, transcoding, adaptive streaming, and view counting at scale. Before diving in, let me clarify requirements so we agree on scope."

## Problem Statement

YouTube serves 2 billion logged-in users per month. Users upload 500 hours of video every minute. The system must handle upload, transcoding, CDN delivery, and approximate view counts with minimal latency.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Users can upload videos up to 10 GB in size
- Videos transcode into multiple resolutions (360p, 720p, 1080p, 4K)
- Playback uses adaptive bitrate streaming (HLS/DASH)
- View count updates are visible within a few seconds (approximate)
- Users receive recommendations based on watch history

### Non-Functional (pick 3-4)

- Availability: 99.99% — video playback must never go dark
- Latency: playback starts within 2 seconds on any network
- Scale: 1 billion video views per day, ~11,500 views/second peak
- Durability: uploaded video is never lost after acknowledgment

## A — Architecture

### High-Level Diagram

```
┌─────────┐   upload    ┌──────────────┐   enqueue   ┌──────────────────┐
│ Client  │────────────▶│ Upload API   │────────────▶│  Transcoding     │
└─────────┘             │ (chunked)    │             │  Queue (Kafka)   │
                        └──────────────┘             └────────┬─────────┘
                                                              │
                                               ┌─────────────▼──────────┐
                                               │  Transcoder Workers    │
                                               │  (FFmpeg, GPU fleet)   │
                                               └─────────────┬──────────┘
                                                             │
                         ┌──────────────┐      store        │
                         │  Object      │◀──────────────────┘
                         │  Storage     │  (S3 / GCS)
                         │  (segments)  │
                         └──────┬───────┘
                                │  replicate
                         ┌──────▼───────┐
                         │     CDN      │  (edge PoPs worldwide)
                         │  (edge nodes)│
                         └──────┬───────┘
                                │  stream HLS/DASH
                         ┌──────▼───────┐
                         │   Client     │
                         │  (ABR player)│
                         └──────────────┘

  ┌─────────────────────┐        ┌──────────────────┐
  │  View Count Service  │        │  Recommendation  │
  │  (Redis + Kafka +    │        │  Engine (offline │
  │   batch flush to DB) │        │   ML pipeline)   │
  └─────────────────────┘        └──────────────────┘
```

The upload path is fully async. The client uploads raw video in chunks to the Upload API, which persists the raw file to object storage and publishes a job to Kafka. Transcoder workers consume jobs, produce HLS/DASH segments at multiple bitrates, and push segments back to object storage. The CDN pulls segments on first request and caches them at edge. View counts use a Redis counter with periodic Kafka flush to the database — exact consistency is sacrificed for throughput.

## D — Data Model

```typescript
interface Video {
  videoId: string;          // UUID
  uploaderId: string;
  title: string;
  description: string;
  status: "uploading" | "processing" | "ready" | "failed";
  durationSeconds: number;
  uploadedAt: Date;
  publishedAt: Date | null;
  thumbnailUrl: string;
  tags: string[];
}

interface VideoRendition {
  videoId: string;
  resolution: "360p" | "480p" | "720p" | "1080p" | "4k";
  codec: "h264" | "vp9" | "av1";
  bitrateKbps: number;
  manifestUrl: string;  // HLS .m3u8 or DASH .mpd location
  segmentPrefix: string; // e.g. s3://bucket/videos/{videoId}/720p/
  createdAt: Date;
}

interface ViewEvent {
  videoId: string;
  userId: string | null;   // null for anonymous
  watchedSeconds: number;
  deviceType: "mobile" | "desktop" | "tv";
  region: string;
  recordedAt: Date;
}

interface WatchHistory {
  userId: string;
  videoId: string;
  lastWatchedAt: Date;
  progressSeconds: number;  // resume position
  completed: boolean;
}
```

## I — Interface (APIs)

```typescript
// 1. Initiate chunked upload — returns upload session
// POST /api/v1/videos/upload/init
interface InitUploadRequest {
  filename: string;
  fileSizeBytes: number;
  mimeType: "video/mp4" | "video/webm";
  title: string;
}
interface InitUploadResponse {
  uploadId: string;
  chunkSizeBytes: number;   // server-dictated chunk size (e.g. 5 MB)
  uploadUrls: string[];     // pre-signed S3 URLs per chunk
}

// 2. Complete upload — triggers transcoding pipeline
// POST /api/v1/videos/upload/complete
interface CompleteUploadRequest {
  uploadId: string;
  eTags: string[];   // S3 multipart ETags
  metadata: { title: string; description: string; tags: string[] };
}
interface CompleteUploadResponse {
  videoId: string;
  status: "processing";
  estimatedReadyAt: Date;
}

// 3. Get video manifest for playback
// GET /api/v1/videos/:videoId/manifest
interface ManifestResponse {
  videoId: string;
  status: "ready" | "processing";
  hlsUrl: string;    // master .m3u8
  dashUrl: string;   // master .mpd
  renditions: Array<{ resolution: string; bitrateKbps: number }>;
}

// 4. Record view event (fire-and-forget from client)
// POST /api/v1/videos/:videoId/view
interface ViewEventRequest {
  watchedSeconds: number;
  deviceType: "mobile" | "desktop" | "tv";
}
interface ViewEventResponse {
  approximate_view_count: number;  // Redis-sourced, not exact
}

// 5. Get video feed / search results
// GET /api/v1/videos/search?q=&page=&limit=
interface VideoSearchResponse {
  videos: Array<{
    videoId: string;
    title: string;
    thumbnailUrl: string;
    channelName: string;
    viewCount: number;
    durationSeconds: number;
    publishedAt: Date;
  }>;
  nextPageToken: string | null;
}

// 6. Get personalized recommendations
// GET /api/v1/users/:userId/recommendations?limit=20
interface RecommendationResponse {
  videos: Array<{ videoId: string; score: number; reason: string }>;
  generatedAt: Date;
}
```

## O — Optimizations & Trade-offs

### Scaling Concerns

| Concern | Naive Approach | Production Approach |
|---|---|---|
| View count hotspot | Single DB counter | Redis INCR + Kafka batch flush |
| Transcoding latency | Single FFmpeg server | GPU worker pool, parallel renditions |
| Global video delivery | Single origin server | CDN with 100+ PoPs |
| Duplicate uploads | No check | SHA-256 fingerprint dedup before transcode |
| Cold start playback | Full download then play | HLS chunked segments, player starts on segment 1 |

### Adaptive Bitrate Streaming

> HLS splits video into 2–10 second segments. The ABR player measures throughput and switches quality levels between segments — no rebuffering on network drops.

- ❌ Serving a single large MP4 file — buffering on slow networks
- ✅ HLS/DASH with 5–6 quality levels — smooth degradation

### View Count Approximate Counting

> Exact counts require a database write on every view. At 11,500 views/second, that is catastrophic for write throughput.

- ❌ `UPDATE videos SET view_count = view_count + 1` per request
- ✅ `INCR video:{videoId}:views` in Redis, batch flush every 30 seconds

### Transcoding Cost vs. Latency

| Strategy | Cost | Time-to-ready |
|---|---|---|
| Transcode all resolutions upfront | High | ~10 minutes |
| Transcode 720p first, rest async | Medium | ~3 minutes for 720p |
| On-demand transcode (lazy) | Low | High latency on first view |

Recommended: eager 720p, async 1080p/4K.

### CDN Cache Invalidation

- ❌ Purging CDN on video edit — expensive, misses edge nodes
- ✅ Immutable segment URLs with version in path — never invalidate, just re-upload

### Storage Tiering

> Raw uploads are accessed once during transcoding, then rarely again. Transcoded segments are hot for 30 days, then cold.

| Tier | Storage Class | Use Case |
|---|---|---|
| Hot | S3 Standard | Segments for videos uploaded in last 30 days |
| Warm | S3 Standard-IA | Segments 30–180 days old |
| Cold | S3 Glacier | Raw uploads, archived segments > 180 days |

Lifecycle policies automate tier transitions. This reduces storage cost by ~60% without affecting playback performance.

## Common Follow-up Questions

**Q: How do you handle video resumption?**
Store `progressSeconds` in `WatchHistory`. On load, fetch it and pass to the HLS player as `startTime`. Works across devices via the same user session.

**Q: How does the recommendation engine work?**
Two-tower neural network: one tower encodes the user's watch history, one tower encodes video embeddings. Nearest-neighbor lookup in a vector DB returns candidates. A ranker re-scores for freshness, diversity, and CTR. See [../BuildingBlocks/](../BuildingBlocks/) for ML serving patterns.

**Q: How do you prevent hot-shard problems on popular videos?**
Shard view counters by `videoId % N`. Aggregate shards for the final count. CDN absorbs nearly all read traffic so the origin never sees per-view load.

**Q: How do you handle copyright detection?**
Content ID fingerprints the raw upload using audio/video hashing before transcoding completes. Matched videos are held in `processing` status pending rights-holder decision.

**Q: What if a transcoder worker crashes mid-job?**
Kafka offset is not committed until the worker writes all segments to object storage. On crash, another worker picks up the same message. Idempotency: segment keys are deterministic (`{videoId}/{resolution}/{segmentNum}.ts`).

---
[← Back to InterviewQuestions](../README.md)
