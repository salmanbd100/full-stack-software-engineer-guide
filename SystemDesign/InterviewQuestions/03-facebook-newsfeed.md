# Design Facebook Newsfeed

## How to Open This Answer

"I'll design Facebook's Newsfeed, focusing on feed generation strategy, ranking, and the fan-out trade-off. Let me confirm scope — are we including ranking and ML signals, or just the delivery pipeline?"

## Problem Statement

Build the Newsfeed system that aggregates posts from a user's friends and pages, ranks them by relevance, and serves a personalized feed with low latency at 2 billion user scale.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Show a ranked, personalized feed of posts from friends and followed pages
- Support text, image, video, and link post types
- Feed updates in near-real-time as friends post new content
- User can interact: like, comment, share, hide post
- Support both chronological and ranked (algorithmic) feed modes
- Paginate feed with infinite scroll

### Non-Functional (pick 3-4)

- **Latency**: Feed loads in < 500 ms for 99th percentile users
- **Scale**: 2 B users, ~1 B DAU, ~500 K feed reads/sec at peak
- **Eventual consistency**: Slightly stale feed is acceptable (1–5 s lag)
- **Availability**: 99.99% — even during partial outages, serve a cached feed

## A — Architecture

### High-Level Diagram

```
User posts content
        │
        ▼
  Post Service ──► Posts DB (MySQL sharded)
        │
        ▼
  Fan-out Service (Kafka)
        │
        ├── Fan-out Workers (write-path)
        │         │
        │         ▼
        │   Feed Store (Redis sorted set per user)
        │
  Ranking Service (read-path)
        │
        ▼
  Feed API ──► Feed Store (cache hit)
        │            │
        │       (cache miss)
        │            ▼
        │   Edge Rank / ML Scoring Service
        │            │
        └────────────▼
               Posts DB + Social Graph DB
```

Fan-out on write pre-populates each user's feed store. The Ranking Service scores cached post IDs using ML features (affinity, recency, engagement) and reorders them at read time. This hybrid approach keeps write cost bounded while supporting personalized ranking without full feed recomputation on every read.

## D — Data Model

```typescript
interface Post {
  postId: string;                    // ULID
  authorId: string;
  type: "text" | "image" | "video" | "link";
  body: string;
  mediaUrls: string[];
  privacyLevel: "public" | "friends" | "only_me";
  likeCount: number;                 // denormalized
  commentCount: number;              // denormalized
  shareCount: number;
  createdAt: string;
}

interface FeedEntry {
  userId: string;                    // feed owner
  postId: string;
  score: number;                     // ranking score (higher = higher in feed)
  rawTimestamp: string;              // for chronological fallback
  source: "friend" | "page" | "group" | "suggested";
}

interface EdgeRankSignal {
  viewerId: string;
  authorId: string;
  affinityScore: number;            // interaction history (0.0–1.0)
  timeDecayFactor: number;          // e-^(age in hours * 0.1)
  postTypeWeight: number;           // video > image > link > text
}

interface UserFeedPreference {
  userId: string;
  mode: "ranked" | "chronological";
  hiddenAuthors: string[];
  snoozeUntil: Record<string, string>; // authorId → ISO date
}
```

## I — Interface (APIs)

```typescript
// GET /v1/feed?limit=20&cursor=<score>&mode=ranked
// Fetch paginated newsfeed for authenticated user
interface FeedRequest {
  limit: number;                    // max 50
  cursor?: string;                  // opaque score cursor
  mode: "ranked" | "chronological";
}
interface FeedResponse {
  items: Array<{
    post: Post;
    author: Pick<User, "userId" | "name" | "avatarUrl">;
    isLiked: boolean;
    score: number;
  }>;
  nextCursor: string | null;
}

// POST /v1/posts
// Create a new post; triggers fan-out
interface CreatePostRequest {
  type: "text" | "image" | "video" | "link";
  body: string;
  mediaKeys: string[];
  privacyLevel: "public" | "friends" | "only_me";
}
interface CreatePostResponse {
  postId: string;
  createdAt: string;
}

// POST /v1/feed/interactions
// Track user interactions for ranking signals
interface FeedInteractionRequest {
  postId: string;
  interactionType: "like" | "comment" | "share" | "hide" | "view";
  durationMs?: number;              // video view duration
}

// PUT /v1/feed/preferences
// Switch between ranked and chronological
interface UpdateFeedPreferenceRequest {
  mode: "ranked" | "chronological";
  hiddenAuthors?: string[];
}

// DELETE /v1/feed/entries/:postId
// Remove a post from the user's feed (hide)
interface HideFeedEntryResponse {
  postId: string;
  hidden: true;
}
```

## O — Optimizations & Trade-offs

### Fan-out Strategy

| Strategy | Feed Load | Write Cost | Staleness |
|---|---|---|---|
| Fan-out on write | Fast (< 50 ms) | O(followers) per post | Low (near real-time) |
| Fan-out on read | Slow (500 ms+) | O(1) per post | Always fresh |
| ✅ Hybrid (write + lazy read) | Fast for most | Bounded | Seconds |

> For users with > 5 K friends (power users), skip write fan-out. Merge their friends' posts at read time from a separate "celebrity feed" layer.

### Ranking: EdgeRank Simplified

```
score = affinity × timeDecay × postTypeWeight

affinity:      how often viewer interacts with this author (0–1)
timeDecay:     e^(-age_hours × 0.1)  — older posts rank lower
postTypeWeight: video=1.5, image=1.2, link=1.0, text=0.9
```

ML models replace this formula in production, but this is the right mental model for interviews. Ranking runs at read time on the top ~1000 candidate posts from the feed cache. See [../SystemDesign/RankingAndRecommendations.md](../SystemDesign/).

### Feed Cache Sizing

| Parameter | Value |
|---|---|
| Entries per user feed | 1500 (trim beyond this) |
| Redis sorted set score | Unix timestamp or rank score |
| Cache TTL | 24 h for active users; evict inactive |
| Cold start | Pull from Social Graph + Posts DB |

❌ Don't store full post objects in the feed cache — store only `postId`. Hydrate post details separately to keep cache memory lean.

### Real-Time Updates

New posts from friends appear in the feed within seconds. On post creation, fan-out workers insert the `postId` into follower feed caches with a score above existing entries. Active users connected via SSE or polling see an "X new posts" banner — they pull the feed refresh on demand rather than auto-inserting posts (which disrupts reading position).

### Privacy Filtering

Fan-out must respect `privacyLevel`. Posts with `only_me` are never fanned out. Posts with `friends` are only inserted into feeds of mutual friends. Privacy checks happen at fan-out time — not at read time — to keep the read path fast.

## Common Follow-up Questions

**Q: How does Facebook decide what goes at the top of my feed?**
A: EdgeRank (affinity × time decay × content weight) is the baseline. Production uses a multi-stage ML pipeline: candidate generation → coarse ranking → fine ranking with hundreds of features. The interview answer is: affinity score, time decay, and content type weight are the three key signals.

**Q: How do you handle a user with 5000 friends posting frequently?**
A: A user with 5000 friends can receive ~500 posts/hour during peak times. The feed cache stores the top 1500 scored entries. Fan-out workers batch-insert and trim the sorted set atomically. Feed reads always hit the cache — no DB query needed for active users.

**Q: How do you keep the feed consistent across devices?**
A: The cursor-based pagination uses the score as the cursor. The same cursor on any device returns the same slice of the feed. New posts above the cursor appear in the "new posts" banner. See [../BuildingBlocks/pagination.md](../BuildingBlocks/).

**Q: What happens when a user unfriends someone?**
A: The fan-out service stops sending new posts. Existing posts from that person remain in the feed cache until they age out or the cache is rebuilt. For immediate removal, a background job scans and prunes the feed cache — this is eventually consistent, which is acceptable.

**Q: How would you add Stories (24-hour expiry content)?**
A: Stories are a separate data model with a hard TTL. Fan-out works the same way, but the feed cache entry has a TTL equal to the story expiry. A background sweeper removes expired story IDs from feed caches.

---
[← Back to InterviewQuestions](../README.md)
