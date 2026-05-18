# Design Twitter

## How to Open This Answer

"I'll design a social media platform where users post short messages, follow others, and view a personalized timeline. The core challenge is the 100:1 read/write ratio and handling celebrities with millions of followers."

## Problem Statement

Twitter serves 400M+ users who post 500M tweets per day. The system is extremely read-heavy — users view timelines far more than they post. Generating a home timeline fast is the central design problem.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Post a tweet (up to 280 characters, optional media)
- Follow and unfollow other users
- View home timeline — tweets from all followed users, sorted by time
- Like and retweet
- Search tweets by keyword or hashtag

### Non-Functional (pick 3-4)

- Read latency < 200ms for timeline load
- Eventual consistency is acceptable — tweets may take 5–10 seconds to propagate
- 99.99% availability — social media must stay up
- Read-heavy optimized — 100:1 read/write ratio

## A — Architecture

### High-Level Diagram

```
Clients (Web / Mobile)
        │
   Load Balancer
        │
 ┌──────┼──────────────┐
 │      │              │
Tweet  Timeline     Social Graph
Service  Service      Service
 │      │              │
 └──────┼──────────────┘
        │
   Redis Cache
   (timeline, tweets, users)
        │
 ┌──────┼──────────┐
 │      │          │
Cassandra  Redis  Kafka
(tweets)  (timeline  (async fan-out,
           cache)     search, notifs)
```

The Tweet Service persists new tweets to Cassandra and publishes an event to Kafka. A Fan-out Worker consumes that event and writes the tweet ID into each follower's Redis timeline list. The Timeline Service reads pre-computed lists from Redis, hydrates tweet details, and returns them. The Social Graph Service stores follow relationships, partitioned by `follower_id` for fast follower lookups.

> The key insight: reads must be instant, so timelines are pre-computed on write. The only exception is celebrities, where fan-out would take too long.

## D — Data Model

```typescript
interface Tweet {
  tweetId: string;        // Snowflake ID — sortable by time
  userId: string;
  content: string;        // max 280 chars
  mediaUrls: string[];
  likeCount: number;
  retweetCount: number;
  createdAt: Date;
}

interface User {
  userId: string;
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  isCelebrity: boolean;   // true when followerCount > 10,000
}

interface Follow {
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

interface TimelineEntry {
  userId: string;          // whose timeline
  tweetIds: string[];      // pre-computed, up to 1,000 tweet IDs
}
```

Storage notes (plain text, not a code block):
- tweets table: partition key = tweet_id; Cassandra handles high write throughput
- followers table: partition key = followee_id for fan-out lookup; reverse table partition key = follower_id for "who I follow"
- timeline cache: Redis List per user, key = `timeline:{userId}`, stores up to 1,000 tweet IDs

## I — Interface (APIs)

```typescript
// POST /api/v1/tweets
interface PostTweetRequest {
  content: string;
  mediaUrls?: string[];
}
interface PostTweetResponse {
  tweetId: string;
  createdAt: string;
}

// GET /api/v1/timeline?limit=20&cursor=xyz
interface TimelineResponse {
  tweets: Array<{
    tweetId: string;
    author: { userId: string; username: string };
    content: string;
    likeCount: number;
    retweetCount: number;
    createdAt: string;
  }>;
  nextCursor: string;
}

// POST /api/v1/users/:userId/follow
interface FollowResponse {
  following: boolean;
  followerCount: number;
}

// POST /api/v1/tweets/:tweetId/like
interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

// GET /api/v1/search?q=keyword&limit=20
interface SearchResponse {
  tweets: Tweet[];
  nextCursor: string;
}
```

## O — Optimizations & Trade-offs

### 1. Fan-out Strategy: The Core Decision

| Strategy | Read Latency | Write Latency | Best For |
|---|---|---|---|
| Fan-out on Write (push) | Fast — read from pre-built cache | Slow — write to all follower caches | Regular users (< 10K followers) |
| Fan-out on Read (pull) | Slow — query all followed users at read time | Fast — just store the tweet | Celebrities only |
| Hybrid | Fast | Fast | Production — Twitter's actual approach |

✅ Use hybrid: push for regular users, pull for celebrities (threshold: 10,000 followers).

```typescript
const CELEBRITY_THRESHOLD = 10_000;

async function onTweetPosted(userId: string, tweetId: string): Promise<void> {
  const followerCount = await socialGraphService.getFollowerCount(userId);

  if (followerCount < CELEBRITY_THRESHOLD) {
    // Fan-out on write: push tweet ID to each follower's timeline cache
    const followers = await socialGraphService.getFollowers(userId);
    const pipeline = redis.pipeline();
    for (const followerId of followers) {
      pipeline.lpush(`timeline:${followerId}`, tweetId);
      pipeline.ltrim(`timeline:${followerId}`, 0, 999);
    }
    await pipeline.exec();
  }
  // Celebrities: skip fan-out; their tweets are fetched on read
}

async function getTimeline(userId: string, limit: number): Promise<Tweet[]> {
  // 1. Read pre-computed timeline (regular followees)
  const cachedIds = await redis.lrange(`timeline:${userId}`, 0, limit - 1);

  // 2. Fetch recent tweets from celebrities followed (on demand)
  const celebrities = await socialGraphService.getCelebritiesFollowed(userId);
  const celTweets = await tweetService.getRecentFromUsers(celebrities, limit);

  // 3. Merge and sort by createdAt
  return mergeSortByTime(cachedIds, celTweets).slice(0, limit);
}
```

### 2. Like Counter — Avoid Write Amplification

❌ Don't increment Cassandra on every like — too many writes under viral tweets.
✅ Increment Redis counter (`HINCRBY tweet:{id} likeCount 1`), batch-flush to Cassandra every 5 seconds via a background job.

### 3. Storage for Timeline Cache

- Each user stores up to 1,000 tweet IDs (8 bytes each) = 8 KB per user.
- 200M active users × 8 KB = ~1.5 TB — fits in a Redis Cluster.

### 4. Search — Elasticsearch via Kafka

❌ Don't run full-text search on Cassandra.
✅ Kafka fan-out worker also writes to Elasticsearch. Search latency: < 200ms. Trending hashtags: Redis sorted set (`ZINCRBY hashtags:1h #AI 1`), refreshed every minute.

### 5. Counter Updates — Avoid Write Amplification

Like and retweet counts are updated millions of times per second on viral tweets.

```typescript
// Increment in Redis immediately — O(1), < 1ms
async function likeTweet(userId: string, tweetId: string): Promise<void> {
  await db.likes.insert({ userId, tweetId }); // for idempotency check
  await redis.hincrby(`tweet:${tweetId}`, 'likeCount', 1);
  // Background job flushes Redis counters to Cassandra every 5 seconds
}
```

❌ Don't write counter increments directly to Cassandra — too many small writes under load.
✅ Buffer in Redis, batch-flush to Cassandra every 5 seconds. Small staleness (< 5s) is acceptable.

### 5. Pitfalls to Call Out

| Pitfall | Fix |
|---|---|
| ❌ Fan-out for celebrities causes 30-min write storm | ✅ Hybrid model — skip fan-out, fetch on read |
| ❌ Strong consistency required | ✅ Eventual consistency (5–10s) is fine for social |
| ❌ Timeline query hits DB every load | ✅ Redis cache — 95%+ of reads never touch Cassandra |
| ❌ Like count written to Cassandra on every click | ✅ Buffer in Redis, batch-flush every 5s |

## Common Follow-up Questions

**Q: How do you handle a celebrity with 150M followers posting a tweet?**

Skip fan-out entirely for accounts above the threshold. When any follower loads their timeline, fetch the celebrity's recent tweets in real time and merge with the pre-computed cache. The merge is cheap — it's just a sorted union of two small lists.

**Q: What if a user follows 5,000 celebrities?**

Set a second threshold: if a user follows more than N celebrities, pre-compute celebrity tweets into their cache lazily on first load and refresh via a background job. This is an edge case affecting < 0.1% of users.

**Q: How do you handle eventual consistency? A follower sees a tweet 10 seconds late — is that OK?**

Yes for social media. Users expect near-real-time, not guaranteed real-time. The SLA is "tweet visible to all followers within 10 seconds." Kafka's consumer lag SLA enforces this.

**Q: How would you shard the Cassandra tweet table?**

Partition key is `tweet_id` (Snowflake ID). This distributes writes uniformly. For user-specific queries (profile page), maintain a secondary `user_tweets` table partitioned by `user_id` with clustering on `tweet_id DESC`.

**Q: How does search scale to 500M tweets/day?**

Elasticsearch ingests tweets asynchronously from Kafka. Index only the last 7 days for search (cold tweets go to S3). Use an alias-based index rotation strategy — one index per day, alias pointing to last 7.

---

[← Back to InterviewQuestions](../README.md)
