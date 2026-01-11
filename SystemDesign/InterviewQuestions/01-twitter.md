# Design Twitter

## 💡 **Problem Statement**

Design a scalable social media platform like Twitter where users can post short messages (tweets), follow other users, and view a personalized timeline.

**Core Functionality:**
- Post tweets (280 characters)
- Follow/unfollow users
- View home timeline (tweets from followed users)
- Like, retweet, reply to tweets
- Search tweets and users
- Trending topics

**Real-World Scale (Twitter/X):**
- **400M+ monthly active users**
- **500M tweets/day** (~6,000 tweets/second)
- **100:1 read/write ratio** (timeline views >> tweet posts)
- **5-10 seconds** for tweet to appear in all followers' timelines
- **Highly skewed distribution**: 10% users have 90% of followers (celebrities)

---

## Requirements

### 💡 **Functional Requirements**

| Priority | Feature | Details |
|----------|---------|---------|
| **P0** | Post tweets | 280 char limit, text + media |
| **P0** | Follow/unfollow | Build social graph |
| **P0** | Home timeline | View tweets from followed users |
| **P1** | Interactions | Like, retweet, reply |
| **P1** | User profile | View user's tweets and info |
| **P2** | Search | Search tweets by keyword, hashtag |
| **P2** | Trending topics | What's popular now |
| **P2** | Notifications | Likes, retweets, mentions |

### 💡 **Non-Functional Requirements**

| Requirement | Target | Reasoning |
|-------------|--------|-----------|
| **Availability** | 99.99% | Social media must be always on |
| **Latency** | < 200ms | Fast timeline load for good UX |
| **Eventual consistency** | 5-10 seconds | Tweet doesn't need instant delivery |
| **Scale** | 400M users, 500M tweets/day | Handle massive read/write |
| **Read-heavy** | 100:1 ratio | Far more reads than writes |

---

## Capacity Estimation

### 💡 **Traffic Estimates**

```
Daily Active Users (DAU): 200M (50% of MAU)
Average tweets viewed per user per day: 100

Write Operations:
- Tweets/day: 500M
- Tweets/sec: 500M / 86,400 = ~6,000/sec
- Peak (3x): 18,000/sec

Read Operations (Timeline views):
- Timeline loads/day: 200M users × 100 views = 20B
- Timeline loads/sec: 20B / 86,400 = ~231,000/sec
- Peak: 693,000/sec

Read/Write Ratio: 231,000 / 6,000 = ~40:1 (read-heavy)
```

### 💡 **Storage Estimates**

```
Per Tweet:
- Tweet ID: 8 bytes
- User ID: 8 bytes
- Text: 280 chars × 2 bytes (UTF-8) = 560 bytes
- Media URL: 100 bytes
- Metadata (timestamps, counts): 100 bytes
Total: ~780 bytes per tweet

Tweets Storage:
- 500M tweets/day × 780 bytes = 390 GB/day
- 390 GB × 365 days = 142 TB/year
- With replication (3x): 426 TB/year

Timeline Cache:
- Store 500 latest tweets per user
- 200M active users × 500 tweets × 8 bytes (tweet IDs) = 800 GB
- With metadata: ~1.5 TB
```

### 💡 **Bandwidth Estimates**

```
Incoming (Writes):
- 6,000 tweets/sec × 780 bytes = 4.6 MB/sec = 37 Mbps

Outgoing (Reads):
- 231,000 timeline requests/sec × 10 tweets × 780 bytes = 1.8 GB/sec = 14.4 Gbps
- With images (average 200KB): 231,000 × 10 × 200KB = 462 GB/sec (CDN handles this)
```

---

## High-Level Architecture

### 💡 **System Components**

```
┌─────────────────────────────────────────────────────────────┐
│                    Clients (Web/Mobile/API)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Load Balancer│
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌────────────┐   ┌────────────┐   ┌────────────┐
│   Tweet    │   │  Timeline  │   │   Social   │
│  Service   │   │  Service   │   │   Graph    │
│            │   │            │   │  Service   │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │                │                │
      │                │                │
      ▼                ▼                ▼
┌──────────────────────────────────────────────┐
│              Cache Layer (Redis)              │
│  - Timeline cache                             │
│  - Tweet cache                                │
│  - User cache                                 │
└────────────────────┬─────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Tweet   │  │ Timeline │  │  Social  │
│  DB      │  │   DB     │  │ Graph DB │
│(Cassandra)│  │ (Redis)  │  │ (Neo4j)  │
└──────────┘  └──────────┘  └──────────┘
      │
      │ Async
      ▼
┌──────────────────┐
│  Kafka Queue     │
│  (Tweet events)  │
└────────┬─────────┘
         │
    ┌────┴─────┬────────────┬──────────┐
    ▼          ▼            ▼          ▼
┌────────┐ ┌────────┐ ┌─────────┐ ┌───────┐
│Timeline│ │ Search │ │Analytics│ │Notif. │
│Fanout  │ │Indexer │ │Service  │ │Service│
└────────┘ └────────┘ └─────────┘ └───────┘
```

---

## Core Challenge: Timeline Generation

### 💡 **Problem: How to generate user's home timeline?**

When user loads timeline, show tweets from all people they follow, sorted by time.

**Challenge:**
- User follows 1,000 people
- Need to fetch recent tweets from all 1,000 users
- Merge and sort by timestamp
- Fast enough for < 200ms response

### 💡 **Solution 1: Fanout on Read (Pull Model)**

**How it works:**
```
User requests timeline
    ↓
Query tweets from all followed users
    ↓
Merge and sort by timestamp
    ↓
Return top N tweets
```

**Implementation:**
```sql
-- Pseudocode
following = SELECT user_ids FROM follows WHERE follower_id = current_user
tweets = SELECT * FROM tweets
         WHERE user_id IN (following)
         ORDER BY created_at DESC
         LIMIT 100
```

**Pros:**
- ✅ Simple implementation
- ✅ No storage overhead (compute on demand)
- ✅ Works well for users with few followings

**Cons:**
- ❌ Slow for users following many people (1000+ queries)
- ❌ Heavy database load
- ❌ Can't meet 200ms latency requirement

**When to use:** Small-scale apps, users follow < 100 people

### 💡 **Solution 2: Fanout on Write (Push Model) ✅**

**How it works:**
```
User posts tweet
    ↓
Get all followers
    ↓
Write tweet ID to each follower's timeline cache
    ↓
When user requests timeline, read from their cache
```

**Implementation:**
```javascript
// When user posts tweet
async function postTweet(userId, tweetContent) {
  // 1. Store tweet
  const tweetId = await db.tweets.insert({
    user_id: userId,
    content: tweetContent,
    created_at: Date.now()
  });

  // 2. Get all followers
  const followers = await db.follows.getFollowers(userId);

  // 3. Fanout: Add tweet to each follower's timeline cache
  const pipeline = redis.pipeline();
  for (const followerId of followers) {
    pipeline.lpush(`timeline:${followerId}`, tweetId);
    pipeline.ltrim(`timeline:${followerId}`, 0, 999); // Keep latest 1000
  }
  await pipeline.exec();

  // 4. Publish to Kafka for async processing
  await kafka.produce('tweet-posted', { userId, tweetId });

  return tweetId;
}

// When user requests timeline
async function getTimeline(userId, limit = 20) {
  // Read from pre-computed cache
  const tweetIds = await redis.lrange(`timeline:${userId}`, 0, limit - 1);
  const tweets = await db.tweets.getByIds(tweetIds);
  return tweets;
}
```

**Pros:**
- ✅ Very fast reads (< 50ms from cache)
- ✅ Timeline pre-computed
- ✅ Scales well for read-heavy workload

**Cons:**
- ❌ Slow writes for users with millions of followers
- ❌ High storage overhead (duplicate tweet IDs)
- ❌ Wasted work if follower never checks timeline

**When to use:** Most users (< 10K followers)

### 💡 **Solution 3: Hybrid Approach (Twitter's Actual Solution) ✅✅**

**Insight:** 90% of users have < 1000 followers, but 0.1% have millions (celebrities)

**Strategy:**
```
Regular users (<10K followers): Fanout on write
Celebrities (>10K followers): Fanout on read

Mixed timeline:
- Pre-computed cache (from regular users)
- + Real-time fetch (from celebrity users)
- Merge and return
```

**Implementation:**
```javascript
const CELEBRITY_THRESHOLD = 10000;

async function postTweet(userId, tweetContent) {
  const tweetId = await db.tweets.insert({ user_id: userId, content: tweetContent });

  const followerCount = await db.follows.getFollowerCount(userId);

  if (followerCount < CELEBRITY_THRESHOLD) {
    // Fanout on write for regular users
    const followers = await db.follows.getFollowers(userId);
    await fanoutToFollowers(followers, tweetId);
  } else {
    // Celebrity: Don't fanout, mark for on-demand fetch
    await redis.zadd('celebrity-tweets', Date.now(), tweetId);
  }

  return tweetId;
}

async function getTimeline(userId, limit = 20) {
  // 1. Get pre-computed timeline (from regular users)
  const cachedTweets = await redis.lrange(`timeline:${userId}`, 0, 100);

  // 2. Get celebrity users this user follows
  const celebritiesFollowed = await db.follows.getCelebritiesFollowed(userId);

  // 3. Fetch their recent tweets on-demand
  const celebrityTweets = await db.tweets.getRecentFromUsers(
    celebritiesFollowed,
    limit: 100
  );

  // 4. Merge both lists, sort by timestamp
  const mergedTweets = mergeSortByTimestamp(cachedTweets, celebrityTweets);

  // 5. Return top N
  return mergedTweets.slice(0, limit);
}
```

**Pros:**
- ✅ Fast reads for most users
- ✅ Fast writes for celebrities
- ✅ Optimal storage usage
- ✅ Handles skewed distribution well

**This is Twitter's actual approach!**

---

## Database Design

### 💡 **Schema Design**

**Users Table (Cassandra):**
```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    display_name VARCHAR(100),
    bio TEXT,
    profile_image_url VARCHAR(500),
    followers_count INT,
    following_count INT,
    created_at TIMESTAMP
);
```

**Tweets Table (Cassandra):**
```sql
CREATE TABLE tweets (
    tweet_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    content TEXT,
    media_urls TEXT[],
    like_count INT,
    retweet_count INT,
    reply_count INT,
    created_at TIMESTAMP
);

-- Index for user's tweets
CREATE INDEX idx_tweets_user_time ON tweets (user_id, created_at);
```

**Follows Table (Cassandra):**
```sql
CREATE TABLE follows (
    follower_id BIGINT,
    followee_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);

-- Reverse index for followers
CREATE TABLE followers (
    followee_id BIGINT,
    follower_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (followee_id, follower_id)
);
```

**Timeline Cache (Redis):**
```
Key: timeline:{user_id}
Type: List (LPUSH for new tweets)
Value: [tweet_id_1, tweet_id_2, ..., tweet_id_1000]
TTL: No expiry (persisted)

Key: tweet:{tweet_id}
Type: Hash
Value: { user_id, content, created_at, like_count, ... }
TTL: 24 hours
```

### 💡 **Why Cassandra?**

| Requirement | Cassandra Solution |
|-------------|-------------------|
| **High write throughput** | 6,000 tweets/sec easily handled |
| **Partition by user** | Efficient user tweet queries |
| **Time-series data** | Optimized for timestamp ordering |
| **No complex joins** | Denormalized data model |
| **Horizontal scaling** | Add nodes easily |

---

## API Design

### 💡 **Tweet APIs**

```http
POST /api/v1/tweets
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Hello World! #firsttweet",
  "media_urls": ["https://cdn.twitter.com/image1.jpg"]
}

Response (201 Created):
{
  "tweet_id": "1234567890",
  "user_id": "9876543210",
  "content": "Hello World! #firsttweet",
  "created_at": "2024-01-10T12:00:00Z",
  "like_count": 0,
  "retweet_count": 0
}
```

**Timeline API:**
```http
GET /api/v1/timeline?limit=20&cursor=xyz
Authorization: Bearer {token}

Response (200 OK):
{
  "tweets": [
    {
      "tweet_id": "123",
      "user": {
        "user_id": "456",
        "username": "john_doe",
        "display_name": "John Doe"
      },
      "content": "Just deployed our new feature!",
      "created_at": "2024-01-10T12:30:00Z",
      "like_count": 42,
      "retweet_count": 12
    }
  ],
  "next_cursor": "abc123"
}
```

**Follow API:**
```http
POST /api/v1/users/{user_id}/follow
Authorization: Bearer {token}

Response (200 OK):
{
  "following": true,
  "follower_count": 1234
}
```

---

## Deep Dives

### 💡 **1. Handling Celebrity Tweets**

**Problem:** Elon Musk tweets → 150M followers

**Naive fanout:** Write to 150M timelines = 30+ minutes

**Solution:**
```
1. Don't fanout celebrity tweets
2. Mark as "celebrity tweet" in cache
3. When follower requests timeline:
   - Check if they follow celebrities
   - Fetch celebrity tweets on-demand
   - Merge with regular timeline
```

### 💡 **2. Tweet Interactions (Like, Retweet)**

**Challenge:** Update counts atomically

**Solution: Counter Service**
```javascript
// Increment counters asynchronously
async function likeTweet(userId, tweetId) {
  // 1. Add to user's likes (instant)
  await db.likes.insert({ user_id: userId, tweet_id: tweetId });

  // 2. Increment counter async (eventual consistency OK)
  await kafka.produce('tweet-liked', { tweet_id: tweetId });

  return { success: true };
}

// Counter service consumes Kafka events
async function processLikeEvent(event) {
  await redis.hincrby(`tweet:${event.tweet_id}`, 'like_count', 1);

  // Batch update to DB every 5 seconds
  await batchUpdateCounters();
}
```

### 💡 **3. Search & Trending**

**Challenge:** Search 500M tweets/day by keyword

**Solution: Elasticsearch**
```
Tweet posted
    ↓
Kafka event
    ↓
Elasticsearch indexer
    ↓
Index tweet (async, within 5 seconds)
```

**Search API:**
```javascript
async function searchTweets(query, limit = 20) {
  const results = await elasticsearch.search({
    index: 'tweets',
    body: {
      query: {
        multi_match: {
          query: query,
          fields: ['content', 'user.username']
        }
      },
      sort: [{ created_at: 'desc' }],
      size: limit
    }
  });

  return results.hits.hits;
}
```

**Trending Topics:**
```javascript
// Count hashtag occurrences in last hour (sliding window)
async function getTrending() {
  const trending = await redis.zrevrange('hashtags:1h', 0, 10, 'WITHSCORES');
  // Returns: [{"#AI", 12500}, {"#Tesla", 8900}, ...]
  return trending;
}

// Background job updates trending every minute
setInterval(async () => {
  const hashtags = await getTweetHashtagsLastHour();
  await updateTrendingCache(hashtags);
}, 60000);
```

### 💡 **4. Notifications**

**Challenge:** User gets 1000 likes → don't send 1000 notifications

**Solution: Notification Aggregation**
```javascript
// Aggregate notifications in 5-minute windows
async function processLikeNotification(event) {
  const key = `notif:${event.tweet_author}:${event.tweet_id}:likes`;

  await redis.sadd(key, event.liker_id);
  await redis.expire(key, 300); // 5 minutes

  // Check if threshold reached
  const count = await redis.scard(key);

  if (count === 1) {
    // First like: Send immediate notification
    await sendNotification(event.tweet_author, `${event.liker_name} liked your tweet`);
  } else if (count === 10 || count === 100) {
    // Milestone: Send aggregate notification
    await sendNotification(event.tweet_author, `${count} people liked your tweet`);
  }
}
```

---

## Scalability

### 💡 **Handling 10x Growth (4B users)**

| Component | Current (400M users) | Scaled (4B users) | Solution |
|-----------|---------------------|-------------------|----------|
| **API Servers** | 500 servers | 5,000 servers | Horizontal scaling |
| **Timeline Cache** | 1.5 TB | 15 TB | Redis Cluster (sharding) |
| **Tweet DB** | 50 nodes | 500 nodes | Cassandra partitioning |
| **Kafka** | 20 brokers | 200 brokers | Add brokers |
| **Elasticsearch** | 50 nodes | 500 nodes | Add nodes |

### 💡 **Geographic Distribution**

```
Multi-Region Setup:

US-East                   EU-West                  Asia-Pacific
┌──────────┐             ┌──────────┐             ┌──────────┐
│ API      │             │ API      │             │ API      │
│ Timeline │             │ Timeline │             │ Timeline │
│ Cache    │             │ Cache    │             │ Cache    │
└────┬─────┘             └────┬─────┘             └────┬─────┘
     │                         │                         │
     └─────────────────────────┼─────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Global Cassandra   │
                    │   (Multi-DC)        │
                    └─────────────────────┘

Benefits:
- Low latency for users worldwide (< 100ms)
- Timeline cache is local (fast reads)
- Tweets replicate globally (eventual consistency)
```

---

## Trade-offs

### 💡 **Key Design Decisions**

| Decision | Chosen | Alternative | Trade-off |
|----------|--------|-------------|-----------|
| **Timeline** | Hybrid (fanout write + read) | Pure fanout write | Handles celebrities well |
| **Consistency** | Eventual (5-10s) | Strong | Better availability & performance |
| **Database** | Cassandra | PostgreSQL + sharding | Better write throughput |
| **Cache** | Redis | Memcached | Persistence + data structures |
| **Search** | Elasticsearch | Database fulltext | Better search performance |

### 💡 **Fanout Comparison**

| Aspect | Fanout on Write | Fanout on Read | Hybrid |
|--------|----------------|----------------|--------|
| **Read latency** | ⚡ Fast (< 50ms) | 🐌 Slow (500ms+) | ⚡ Fast (< 100ms) |
| **Write latency** | 🐌 Slow for celebrities | ⚡ Fast (< 50ms) | ⚡ Fast (< 100ms) |
| **Storage** | High (duplicate IDs) | Low | Medium |
| **Best for** | Regular users | Celebrities only | **Production (Both)** |

---

## Summary

### 💡 **Key Takeaways**

**Architecture Highlights:**
1. **Hybrid fanout** (write + read) for timeline generation
2. **Cassandra** for scalable tweet storage
3. **Redis** for timeline cache (pre-computed)
4. **Kafka** for async processing (search, analytics, notifications)
5. **Elasticsearch** for search and trending

**Scalability:**
- Handles 400M users, 500M tweets/day
- 100:1 read/write ratio optimized
- Eventual consistency acceptable (social media)

**Interview Focus:**
- Timeline generation algorithms (most important!)
- Handling celebrity users
- Read-heavy optimization (cache everything)
- Trade-off: consistency vs availability
- Sharding strategy for social graph

---

[← Back to SystemDesign](../README.md)
