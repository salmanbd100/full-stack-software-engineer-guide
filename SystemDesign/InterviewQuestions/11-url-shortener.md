# Design URL Shortener (TinyURL/Bitly)

## 💡 **Problem Statement**

Design a URL shortening service like TinyURL or Bitly that converts long URLs into short, shareable links.

**Core Functionality:**
- User enters long URL → System generates short URL
- User clicks short URL → Redirects to original long URL
- Track analytics (clicks, geographic data, referrers)

**Real-World Examples:**
- **Bitly**: 600M+ short links/month, 10B+ clicks tracked
- **TinyURL**: 7.5B+ URLs shortened since 2002
- **bit.ly**: Used by Twitter (280 char limit), SMS marketing

---

## Requirements

### 💡 **Functional Requirements**

| Priority | Requirement | Details |
|----------|-------------|---------|
| **P0** | Shorten URL | Convert long URL to short unique code |
| **P0** | Redirect | Short URL redirects to original URL |
| **P1** | Custom aliases | Users can request custom short codes (bit.ly/mylink) |
| **P1** | Expiration | URLs can expire after set time |
| **P2** | Analytics | Track clicks, geography, devices, referrers |
| **P2** | API access | RESTful API for programmatic access |

### 💡 **Non-Functional Requirements**

| Requirement | Target | Reasoning |
|-------------|--------|-----------|
| **Availability** | 99.99% | Short links must always work |
| **Latency** | < 100ms | Fast redirects critical for UX |
| **Scale** | 100M new URLs/day | Handle high write volume |
| **Durability** | No data loss | Short links must never break |
| **Read-Heavy** | 100:1 read/write ratio | Redirects >> URL creation |

---

## Capacity Estimation

### 💡 **Traffic Estimates**

```
Assumptions:
- 100M new URLs created per day
- 100:1 read/write ratio (10B redirects per day)
- 10% URLs account for 90% of traffic (Pareto principle)

Write Operations:
- URLs created/day: 100M
- URLs created/sec: 100M / (24 * 3600) = ~1,150/sec
- Peak (3x avg): 3,500/sec

Read Operations:
- Redirects/day: 10B
- Redirects/sec: 10B / (24 * 3600) = ~115,000/sec
- Peak: 350,000/sec
```

### 💡 **Storage Estimates**

```
Per URL Storage:
- Short code: 7 characters = 7 bytes
- Original URL: 200 bytes (avg)
- Created timestamp: 8 bytes
- Expiry: 8 bytes
- User ID: 8 bytes
- Metadata: 50 bytes
Total: ~280 bytes per URL

Storage for 5 years:
- URLs/day: 100M
- URLs/year: 36.5B
- URLs/5 years: 182.5B
- Total storage: 182.5B * 280 bytes = 51TB
- With replication (3x): 153TB
```

### 💡 **Bandwidth Estimates**

```
Write Bandwidth:
- 1,150 URLs/sec * 280 bytes = 322 KB/sec = ~2.5 Mbps

Read Bandwidth:
- 115,000 redirects/sec * 500 bytes (with headers) = 57.5 MB/sec = 460 Mbps
- Peak: 1.4 Gbps
```

---

## High-Level Architecture

### 💡 **System Components**

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN / Edge                          │
│              (Serve most popular URLs from edge)            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Load Balancer │
                  └───────┬───────┘
                          │
          ┌───────────────┼───────────────┐
          │                               │
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  API Servers     │            │  API Servers     │
│  (Stateless)     │            │  (Stateless)     │
└────────┬─────────┘            └─────────┬────────┘
         │                                │
         │                                │
    ┌────┴────────────────────────────────┴─────┐
    │                                            │
    ▼                                            ▼
┌─────────────────┐                    ┌──────────────────┐
│  Redis Cache    │                    │ Zookeeper/etcd   │
│  (Hot URLs)     │                    │ (ID Generation)  │
│  95%+ hit rate  │                    └──────────────────┘
└─────────────────┘
         │
         │ Cache miss
         ▼
┌─────────────────────────────────┐
│   Primary Database (Cassandra)  │
│   - Distributed, highly available│
│   - Handles 115K reads/sec       │
└─────────────────────────────────┘
         │
         │ Async write
         ▼
┌─────────────────────────────────┐
│   Analytics DB (ClickHouse)     │
│   - Time-series analytics        │
│   - Click tracking, aggregations │
└─────────────────────────────────┘
```

---

## Detailed Component Design

### 💡 **1. URL Shortening Algorithm**

**Key Decision: How to generate short codes?**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Hash (MD5/SHA)** | Simple, deterministic | Collisions, long output (need truncation) | ❌ Not ideal |
| **Random Generation** | Simple | Collision check needed, not scalable | ❌ Not ideal |
| **Base62 Encoding** | Short, readable, no collisions | Need counter/ID generator | ✅ **Best** |

**✅ Selected: Base62 Encoding**

```javascript
// Base62: [a-zA-Z0-9] = 62 characters
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encodeBase62(num) {
  if (num === 0) return '0';

  let encoded = '';
  while (num > 0) {
    encoded = BASE62[num % 62] + encoded;
    num = Math.floor(num / 62);
  }
  return encoded;
}

function decodeBase62(str) {
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    decoded = decoded * 62 + BASE62.indexOf(str[i]);
  }
  return decoded;
}

// Example:
// ID: 123456789 → Base62: "8M0kX"
// Short URL: https://short.ly/8M0kX
```

**Collision-Free Capacity:**

```
7-character Base62 code:
- Combinations: 62^7 = 3.5 trillion unique URLs
- At 100M URLs/day: 3.5T / 100M = 35,000 days = 96 years

6-character Base62 code:
- Combinations: 62^6 = 56 billion unique URLs
- At 100M URLs/day: 56B / 100M = 560 days = 1.5 years
```

**✅ Use 7 characters for long-term capacity**

### 💡 **2. ID Generation Strategy**

**Problem:** Need unique, sequential IDs across distributed servers

**✅ Solution: Distributed ID Generator (Snowflake)**

```
64-bit ID structure:
┌─────────────────────────────────────────────────────────────┐
│ 1 bit  │  41 bits      │  10 bits    │  12 bits            │
│ unused │  timestamp    │  machine ID │  sequence number    │
└─────────────────────────────────────────────────────────────┘

- Timestamp: 41 bits = 69 years (milliseconds since epoch)
- Machine ID: 10 bits = 1024 machines
- Sequence: 12 bits = 4096 IDs per millisecond per machine

Capacity: 4096 * 1024 = 4.2M IDs per millisecond
```

```javascript
class SnowflakeIDGenerator {
  constructor(machineId) {
    this.machineId = machineId; // 0-1023
    this.sequence = 0;
    this.lastTimestamp = -1;
    this.epoch = 1640995200000; // Custom epoch: 2022-01-01
  }

  generate() {
    let timestamp = Date.now();

    // If same millisecond, increment sequence
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 4095; // 12 bits = 4096

      // Sequence overflow, wait for next millisecond
      if (this.sequence === 0) {
        while (timestamp <= this.lastTimestamp) {
          timestamp = Date.now();
        }
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    // Combine: timestamp (41) | machineId (10) | sequence (12)
    const id =
      ((BigInt(timestamp - this.epoch) << 22n)) |
      (BigInt(this.machineId) << 12n) |
      BigInt(this.sequence);

    return id;
  }
}

// Usage
const generator = new SnowflakeIDGenerator(1); // Machine ID = 1
const uniqueId = generator.generate();
const shortCode = encodeBase62(Number(uniqueId));
// Result: "8M0kX" (7 characters)
```

### 💡 **3. API Design**

**Create Short URL:**
```http
POST /api/v1/shorten
Content-Type: application/json

{
  "longUrl": "https://example.com/very/long/url/with/many/parameters?foo=bar",
  "customAlias": "mylink",  // Optional
  "expiresAt": "2024-12-31T23:59:59Z"  // Optional
}

Response (201 Created):
{
  "shortUrl": "https://short.ly/8M0kX",
  "longUrl": "https://example.com/very/long/url/with/many/parameters?foo=bar",
  "shortCode": "8M0kX",
  "createdAt": "2024-01-10T12:00:00Z",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Redirect (GET short URL):**
```http
GET /8M0kX

Response (301 Moved Permanently):
Location: https://example.com/very/long/url/with/many/parameters?foo=bar

OR (302 Found) for temporary redirect with analytics
```

**Get Analytics:**
```http
GET /api/v1/analytics/8M0kX?period=7d

Response (200 OK):
{
  "shortCode": "8M0kX",
  "totalClicks": 12540,
  "uniqueVisitors": 8920,
  "clicksByDate": [
    { "date": "2024-01-10", "clicks": 1850 },
    { "date": "2024-01-09", "clicks": 2100 }
  ],
  "topCountries": [
    { "country": "US", "clicks": 5200 },
    { "country": "UK", "clicks": 2100 }
  ],
  "referrers": [
    { "source": "twitter.com", "clicks": 4200 },
    { "source": "facebook.com", "clicks": 2800 }
  ]
}
```

---

## Database Design

### 💡 **Schema Design**

**URL Mappings Table (Cassandra):**

```sql
CREATE TABLE url_mappings (
    short_code TEXT PRIMARY KEY,
    long_url TEXT,
    user_id BIGINT,
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_custom BOOLEAN,
    click_count COUNTER
);

-- Partition key: short_code (random distribution)
-- Read pattern: Given short_code, get long_url (O(1) lookup)
```

**Analytics Events Table (ClickHouse):**

```sql
CREATE TABLE click_events (
    event_id UUID,
    short_code String,
    clicked_at DateTime,
    ip_address String,
    country String,
    city String,
    user_agent String,
    referrer String,
    device_type String
) ENGINE = MergeTree()
ORDER BY (short_code, clicked_at);

-- Optimized for time-series analytics queries
```

### 💡 **Why Cassandra?**

| Requirement | Cassandra Solution |
|-------------|-------------------|
| **High write throughput** | 1,150 writes/sec easily handled |
| **High read throughput** | 115K reads/sec with proper partitioning |
| **Availability** | Multi-datacenter replication |
| **Scalability** | Horizontal scaling (add nodes) |
| **No single point of failure** | Distributed, peer-to-peer |

---

## Deep Dives

### 💡 **1. Caching Strategy**

**Problem:** 115K redirects/sec - database can't handle all reads

**Solution: Multi-Layer Caching**

```
Layer 1: CDN/Edge (Cloudflare, Akamai)
- Cache top 10% hottest URLs at edge
- Reduce latency: 200ms → 20ms
- Hit rate: 80-90%

Layer 2: Redis Cache (Application layer)
- Cache remaining popular URLs
- TTL: 24 hours
- Hit rate: 95%+

Layer 3: Database (Cassandra)
- Only 5% of requests reach DB
- 115K reads/sec → 5.8K reads/sec (manageable)
```

**Cache Implementation:**
```javascript
// LRU cache with Redis
const redis = require('redis');
const client = redis.createClient({ maxmemory: '10gb', maxmemory_policy: 'allkeys-lru' });

async function getURL(shortCode) {
  // Try cache first
  const cached = await client.get(`url:${shortCode}`);
  if (cached) {
    // Track analytics async (don't block response)
    trackClickAsync(shortCode);
    return cached;
  }

  // Cache miss - fetch from DB
  const longUrl = await db.query('SELECT long_url FROM url_mappings WHERE short_code = ?', [shortCode]);

  // Store in cache (TTL: 24 hours)
  await client.setex(`url:${shortCode}`, 86400, longUrl);

  trackClickAsync(shortCode);
  return longUrl;
}
```

### 💡 **2. Custom Aliases**

**Challenge:** Handle custom short codes (bit.ly/mycompany)

**Solution:**

```javascript
async function createShortURL(longUrl, customAlias = null) {
  if (customAlias) {
    // Check if custom alias already exists
    const exists = await db.query('SELECT short_code FROM url_mappings WHERE short_code = ?', [customAlias]);

    if (exists) {
      throw new Error('Custom alias already taken');
    }

    shortCode = customAlias;
  } else {
    // Generate unique ID and encode
    const id = idGenerator.generate();
    shortCode = encodeBase62(Number(id));
  }

  await db.insert('url_mappings', {
    short_code: shortCode,
    long_url: longUrl,
    is_custom: !!customAlias,
    created_at: new Date()
  });

  return `https://short.ly/${shortCode}`;
}
```

### 💡 **3. Preventing Abuse**

**Challenges:**
- Spam URLs (malware, phishing)
- Rate limiting (prevent abuse)
- Duplicate URL handling

**Solutions:**

**Rate Limiting:**
```javascript
// Token bucket algorithm (1000 requests/hour per user)
const rateLimiter = {
  async checkLimit(userId) {
    const key = `ratelimit:${userId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 3600); // 1 hour
    }

    if (current > 1000) {
      throw new Error('Rate limit exceeded');
    }
  }
};
```

**Duplicate Detection:**
```javascript
// Hash long URL to check for duplicates
const crypto = require('crypto');

async function findExisting(longUrl) {
  const hash = crypto.createHash('sha256').update(longUrl).digest('hex');
  const existing = await db.query('SELECT short_code FROM url_mappings WHERE url_hash = ?', [hash]);
  return existing?.short_code;
}
```

### 💡 **4. Analytics at Scale**

**Challenge:** Track 10B clicks/day without slowing redirects

**Solution: Async Event Processing**

```
User clicks short URL
         │
         ▼
API returns redirect (< 50ms)
         │
         │ (Non-blocking)
         ▼
Write event to Kafka queue
         │
         ▼
Stream processor (Flink/Spark)
         │
         ├─→ Real-time aggregations (Redis)
         │
         └─→ Batch write to ClickHouse (every 5 sec)
```

```javascript
async function handleRedirect(shortCode) {
  // 1. Get URL (fast path - from cache)
  const longUrl = await getURL(shortCode);

  // 2. Return redirect immediately (don't wait for analytics)
  res.redirect(301, longUrl);

  // 3. Track analytics async (fire-and-forget)
  kafka.produce('click-events', {
    short_code: shortCode,
    timestamp: Date.now(),
    ip: req.ip,
    user_agent: req.headers['user-agent'],
    referrer: req.headers['referer']
  });
}
```

---

## Scalability & Optimization

### 💡 **Handling 1M Writes/Sec (10x Growth)**

| Component | Current (100K w/s) | Scaled (1M w/s) | Solution |
|-----------|-------------------|-----------------|----------|
| **API Servers** | 20 servers | 200 servers | Horizontal scaling |
| **ID Generator** | 1 Zookeeper cluster | Multiple clusters | Shard by region |
| **Database** | 10 Cassandra nodes | 100 nodes | Add nodes |
| **Cache** | 5 Redis nodes | 50 nodes | Redis Cluster |

### 💡 **Geographic Distribution**

```
Global Architecture:

US-East                      EU-West                    Asia-Pacific
┌─────────────┐             ┌─────────────┐            ┌─────────────┐
│ API Servers │             │ API Servers │            │ API Servers │
│ + Cache     │             │ + Cache     │            │ + Cache     │
└──────┬──────┘             └──────┬──────┘            └──────┬──────┘
       │                            │                           │
       └────────────────────────────┴───────────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │ Global Cassandra  │
                          │  (Multi-DC)       │
                          └───────────────────┘

Benefits:
- Low latency for users worldwide (< 50ms)
- High availability (region failure doesn't affect others)
- Data replication across regions
```

---

## Trade-offs

### 💡 **Key Design Decisions**

| Decision | Chosen | Alternative | Trade-off |
|----------|--------|-------------|-----------|
| **ID Generation** | Snowflake | UUID | Snowflake is sortable, more compact |
| **Encoding** | Base62 | Base64 | Base62 is URL-safe without escaping |
| **Redirect Type** | 301 (Permanent) | 302 (Temporary) | 301 = cacheable (faster), 302 = trackable (better analytics) |
| **Database** | Cassandra | PostgreSQL + read replicas | Cassandra scales better, eventual consistency OK |
| **Code Length** | 7 characters | 6 characters | 7 chars = 96 years capacity vs 1.5 years |

### 💡 **301 vs 302 Redirect**

| Aspect | 301 Permanent | 302 Temporary |
|--------|---------------|---------------|
| **Browser caching** | Yes (faster) | No (always hits server) |
| **Analytics** | Limited (cached requests don't hit server) | Full (every click tracked) |
| **SEO** | Passes link juice | Doesn't pass link juice |
| **Use case** | High-performance, don't need perfect analytics | Need accurate click tracking |

**✅ Recommendation:** Use 302 for better analytics

---

## Summary

### 💡 **Key Takeaways**

**Core Components:**
1. **Snowflake ID Generator** → Unique, distributed ID generation
2. **Base62 Encoding** → Convert IDs to short codes
3. **Cassandra** → Scalable, available database
4. **Redis Cache** → 95%+ hit rate reduces DB load
5. **Kafka + ClickHouse** → Async analytics at scale

**Scalability:**
- Handles 100M writes/day, 10B reads/day
- Scales horizontally across all components
- Multi-region deployment for global low latency

**Interview Focus:**
- ID generation strategy (most important!)
- Base62 encoding math
- Caching layers
- Handling 100:1 read/write ratio
- Analytics without slowing redirects

---

[← Back to SystemDesign](../README.md)
