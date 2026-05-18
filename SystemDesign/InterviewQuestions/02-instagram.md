# Design Instagram

## How to Open This Answer

"I'll design Instagram focusing on photo upload, feed generation, and the follow graph at scale. Let me start with requirements before moving to the architecture."

## Problem Statement

Build a photo-sharing platform where users upload images, follow other users, and see a personalized feed of recent posts. The system must serve hundreds of millions of users with fast feed loads and reliable media delivery.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Upload photos and videos with captions and tags
- Follow and unfollow other users
- View a home feed of posts from followed accounts, ordered by recency
- Like and comment on posts
- Discover content via explore/hashtag pages
- User profile page showing their own posts

### Non-Functional (pick 3-4)

- **Read-heavy**: Feed reads outnumber photo uploads ~100:1
- **Media latency**: Images load in < 200 ms (CDN-served)
- **Availability**: 99.99% — feed must be readable even during partial outages
- **Scale**: 500 M DAU, ~5 M photo uploads/day, ~100 M feed reads/day

## A — Architecture

### High-Level Diagram

```
Client
  │
  ├── Media upload ──► Upload Service ──► Object Store (S3)
  │                         │                    │
  │                         │              CDN (CloudFront)
  │                         │                    │
  │                   Media Processor        (serves images)
  │                  (resize/transcode)
  │
  ├── Post write ──► Post Service ──► Posts DB (Postgres)
  │                       │
  │               Fan-out Service
  │                  (Kafka)
  │                       │
  │              Fan-out Workers
  │                       │
  │              Feed Cache (Redis)
  │                       │
  └── Feed read ──► Feed Service ──► Feed Cache
                                        │
                              (miss) Post DB + Follow Graph DB
```

Photo upload and feed generation are separated. Uploads go directly to S3 via a pre-signed URL — the app server is never in the media path. Post writes trigger a fan-out job that pushes the new `postId` into each follower's feed cache in Redis. Feed reads hit Redis first; a cache miss falls back to computing the feed from the Follow Graph DB and Posts DB.

## D — Data Model

```typescript
interface User {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followerCount: number;       // denormalized counter
  followingCount: number;
  createdAt: string;
}

interface Post {
  postId: string;              // ULID — sortable by time
  authorId: string;
  mediaUrls: string[];         // CDN URLs (multiple images/videos)
  caption: string;
  hashtags: string[];
  likeCount: number;           // denormalized
  commentCount: number;        // denormalized
  createdAt: string;
}

interface Follow {
  followerId: string;
  followeeId: string;
  createdAt: string;
}

interface FeedItem {
  userId: string;              // feed owner
  postId: string;
  authorId: string;
  score: number;               // timestamp or rank score
  insertedAt: string;
}
```

## I — Interface (APIs)

```typescript
// POST /v1/media/upload-url
// Get a pre-signed S3 URL for direct upload
interface GetUploadUrlRequest {
  fileType: "image/jpeg" | "image/png" | "video/mp4";
  fileSizeBytes: number;
}
interface GetUploadUrlResponse {
  uploadUrl: string;           // pre-signed S3 URL (15 min TTL)
  mediaKey: string;            // reference to use in createPost
}

// POST /v1/posts
// Create a post after media is uploaded to S3
interface CreatePostRequest {
  mediaKeys: string[];
  caption: string;
  hashtags: string[];
}
interface CreatePostResponse {
  postId: string;
  createdAt: string;
}

// GET /v1/feed?limit=20&cursor=<postId>
// Paginated home feed for authenticated user
interface FeedResponse {
  items: Array<{
    post: Post;
    author: Pick<User, "userId" | "username" | "avatarUrl">;
    isLiked: boolean;
  }>;
  nextCursor: string | null;
}

// POST /v1/users/:userId/follow
// Follow a user
interface FollowResponse {
  followerId: string;
  followeeId: string;
  following: true;
}

// GET /v1/users/:userId/posts?limit=12&cursor=<postId>
// Profile page — user's own posts
interface UserPostsResponse {
  posts: Post[];
  nextCursor: string | null;
}

// POST /v1/posts/:postId/likes
// Like a post (idempotent)
interface LikeResponse {
  postId: string;
  likeCount: number;
}
```

## O — Optimizations & Trade-offs

### Fan-out on Write vs Read

| Strategy | Feed Load Time | Write Cost | Best For |
|---|---|---|---|
| Fan-out on write | Fast (cache hit) | High — write to N followers | Most users |
| Fan-out on read | Slow (compute at read) | Low write cost | Celebrities (10 M+ followers) |
| ✅ Hybrid | Fast for normal users | Manageable | Instagram's actual approach |

> Celebrities skip fan-out on write. Their posts are fetched and merged at read time. This avoids writing to 10 M Redis entries on every post.

### Media Pipeline

```
Upload (S3)
    │
    ▼
Media Processor (Lambda / worker)
    ├── Resize to 4 variants (thumbnail, small, medium, original)
    ├── Transcode video to HLS
    └── Write CDN-friendly filenames
    │
    ▼
CloudFront CDN
```

❌ Never serve media directly from S3 — CDN edge caching is 100x cheaper at scale.

### Feed Cache Design

Each user's feed is a Redis sorted set: `feed:{userId}` with `score = createdAt timestamp`. Fan-out pushes `postId` into this set. On read, `ZREVRANGE feed:{userId} 0 19` returns the 20 most recent post IDs. A second batch fetch hydrates the post details from cache/DB.

| Parameter | Value |
|---|---|
| Max feed entries per user | 1000 (trim older entries) |
| Cache TTL | 7 days (evict inactive users) |
| Feed cold start | Compute from Follow Graph + Posts DB |

### Like Count Consistency

❌ Don't update `likeCount` synchronously on every like — contention on a single row.
✅ Write likes to a separate `likes` table. A background job aggregates counts every 60 s and updates the post row. Display an approximate count — exact numbers don't matter.

### Follow Graph Storage

The follow graph is a separate service backed by a graph DB or wide-column store (Cassandra). Queries: "give me all followees of userId X" — this is the hot path for fan-out. Index by `followerId` for fast fan-out lookup.

## Common Follow-up Questions

**Q: How do you handle a user with 10 M followers uploading a post?**
A: Skip fan-out on write for accounts above a follower threshold (for example, 500 K). Their posts are fetched and merged into the feed at read time using a "celebrity post injection" layer. See [../Scalability/fan-out.md](../Scalability/).

**Q: How do you make the feed feel fast on first load?**
A: Pre-compute the feed for active users. When a user opens the app, serve from the Redis sorted set instantly. Background-refresh the cache as new posts arrive via Kafka fan-out.

**Q: How do you shard the Posts DB?**
A: Shard by `authorId`. All posts from the same user land on the same shard — profile pages read from one shard. Feed reads scatter across shards but are mediated by the cache. See [../Database/sharding.md](../Database/).

**Q: How do you handle image deduplication?**
A: Hash the image bytes (SHA-256) before upload. If the hash already exists in S3, return the existing CDN URL. This saves storage for re-shared memes and screenshots.

---
[← Back to InterviewQuestions](../README.md)
