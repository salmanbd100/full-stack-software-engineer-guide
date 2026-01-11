# Caching

## 💡 **Problem → Solution**

| Aspect | Details |
|--------|---------|
| **Problem** | Read + Bottleneck |
| **Solution** | Cache |
| **Performance Gain** | 200ms → 5ms |
| **Load Reduction** | 80-95% |

**When to Use:**

| Scenario | Metric |
|----------|--------|
| ✅ Read-heavy workload | 90%+ read ratio |
| ✅ Slow response times | > 500ms unacceptable |
| ✅ Repeated queries | Same data fetched often |
| ✅ Scaling challenges | DB vertical scaling limits |

---

## Pattern Overview

### What is Caching?

**Caching** is a performance optimization technique that stores frequently accessed data in a fast-access storage layer (typically in-memory) to reduce latency and database load. Think of it as keeping a copy of your most popular items at the front of a store instead of making customers walk to the back warehouse every time.

A cache sits between your application and your database, intercepting read requests. When data is requested, the cache is checked first (cache hit = fast path). If the data isn't in the cache (cache miss = slow path), it's fetched from the database and stored in the cache for future requests. This simple pattern can reduce database queries by 80-95% and improve response times from hundreds of milliseconds to single-digit milliseconds.

Caching is one of the most impactful optimizations in system design - a properly configured cache can handle 10-100x more requests than the database alone, at a fraction of the cost. However, it introduces complexity around cache invalidation, consistency, and the famous quote: "There are only two hard things in Computer Science: cache invalidation and naming things."

### Key Characteristics

- **Speed**: In-memory access (Redis: 1-5ms) vs database query (50-200ms) = 10-100x faster
- **Hit Rate**: Measures cache effectiveness; production caches typically achieve 80-95% hit rates
- **TTL (Time To Live)**: Data expires after configured time (e.g., 5 minutes, 1 hour) to prevent stale data
- **Eviction Policies**: LRU (Least Recently Used), LFU (Least Frequently Used), FIFO determine what to remove when cache is full
- **Capacity**: Typically 10-20% of database size (cache hot data only, not everything)
- **Complexity**: Time O(1) for get/set operations, Space O(n) where n = number of cached items

### Real-World Applications

- **Facebook**: Uses Memcached clusters with petabytes of cache to serve 3+ billion users, reducing database load by 99% (cache hit rate: 95%+)
- **Twitter**: Employs Redis to cache timelines and tweets, handling 500,000+ QPS with average latency of 1-2ms vs 50-100ms without cache
- **Reddit**: Caches posts, comments, and user data in Redis, reducing PostgreSQL queries from 50,000 to 2,500 QPS (95% cache hit rate) during peak hours

---

## Core Concepts

### Architecture Pattern

```
                    ┌──────────────┐
                    │  Application │
                    └──────┬───────┘
                           │
                    1. Check cache first
                           │
                           ▼
                    ┌──────────────┐
            ┌──────▶│    Cache     │──────┐
            │       │   (Redis)    │      │
            │       └──────────────┘      │
            │                             │
       2a. Cache HIT              2b. Cache MISS
      (Return data)              (Fetch from DB)
            │                             │
            │                             ▼
            │                      ┌──────────────┐
            │                      │   Database   │
            │                      │ (PostgreSQL) │
            │                      └──────┬───────┘
            │                             │
            │                    3. Store in cache
            │                             │
            └─────────────────────────────┘
                    Return data
```

### Key Components

1. **Cache Store**: In-memory data store (Redis, Memcached) holding frequently accessed data
2. **Cache Key**: Unique identifier for cached data (e.g., `user:12345`, `post:67890`)
3. **TTL (Time To Live)**: Expiration time after which cached data is automatically deleted
4. **Eviction Policy**: Algorithm for removing data when cache is full (LRU, LFU, random)
5. **Cache Invalidation**: Mechanism to remove or update stale data when source changes

### How It Works

**Cache-Aside (Lazy Loading) Pattern**:

**Step 1**: Application receives read request for user ID 12345

**Step 2**: Check cache first:
```javascript
const cached = await redis.get('user:12345');
```

**Step 3**: If cache hit (data found):
- Return data immediately (1-5ms response time)
- No database query needed

**Step 4**: If cache miss (data not found):
- Query database: `SELECT * FROM users WHERE id = 12345` (50-200ms)
- Store result in cache: `redis.set('user:12345', userData, 'EX', 3600)` (1 hour TTL)
- Return data to user

**Step 5**: Subsequent requests hit cache (fast path) until TTL expires

---

## Example 1: Cache-Aside Pattern - JavaScript

### Scenario

You're building a social media API serving 100,000 requests/minute. User profiles are queried repeatedly (same users log in multiple times per day). Without caching, your PostgreSQL database struggles at 10,000 QPS. With caching, you achieve 95% cache hit rate, reducing database queries to 500 QPS.

### Implementation

```javascript
const redis = require('redis');
const { promisify } = require('util');

class UserCache {
    constructor(db, redisClient) {
        this.db = db;
        this.redis = redisClient;
        this.getAsync = promisify(redisClient.get).bind(redisClient);
        this.setAsync = promisify(redisClient.setex).bind(redisClient);
        this.delAsync = promisify(redisClient.del).bind(redisClient);

        // Track cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0
        };
    }

    // Cache-aside (lazy loading) pattern
    async getUser(userId) {
        const cacheKey = `user:${userId}`;

        try {
            // Step 1: Try cache first (fast path)
            const cached = await this.getAsync(cacheKey);

            if (cached) {
                this.stats.hits++;
                console.log(`Cache HIT for ${cacheKey}`);
                return JSON.parse(cached);
            }

            // Step 2: Cache miss - query database (slow path)
            this.stats.misses++;
            console.log(`Cache MISS for ${cacheKey} - querying database`);

            const user = await this.db.query(
                'SELECT id, name, email, created_at FROM users WHERE id = $1',
                [userId]
            );

            if (!user.rows[0]) {
                // User not found - cache negative result to prevent repeated DB queries
                await this.setAsync(cacheKey, 300, JSON.stringify(null));
                return null;
            }

            const userData = user.rows[0];

            // Step 3: Store in cache with 1 hour TTL
            await this.setAsync(
                cacheKey,
                3600, // 1 hour TTL
                JSON.stringify(userData)
            );

            return userData;

        } catch (error) {
            this.stats.errors++;
            console.error(`Cache error for ${cacheKey}:`, error);

            // Fallback: Query database if cache fails (cache should never break app)
            const user = await this.db.query(
                'SELECT id, name, email, created_at FROM users WHERE id = $1',
                [userId]
            );
            return user.rows[0] || null;
        }
    }

    // Invalidate cache when user is updated
    async updateUser(userId, updates) {
        const cacheKey = `user:${userId}`;

        try {
            // Step 1: Update database first
            const result = await this.db.query(
                'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
                [updates.name, updates.email, userId]
            );

            if (result.rows[0]) {
                // Step 2: Invalidate cache (delete old data)
                await this.delAsync(cacheKey);
                console.log(`Cache invalidated for ${cacheKey}`);

                // Step 3: Optionally pre-populate cache with new data
                await this.setAsync(
                    cacheKey,
                    3600,
                    JSON.stringify(result.rows[0])
                );

                return result.rows[0];
            }

        } catch (error) {
            console.error(`Update error for user ${userId}:`, error);
            throw error;
        }
    }

    // Get cache statistics
    getCacheStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            errors: this.stats.errors,
            total: total,
            hitRate: `${hitRate}%`
        };
    }
}

// Usage
const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379
});

const userCache = new UserCache(db, redisClient);

// API endpoint
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await userCache.getUser(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update endpoint
app.put('/api/users/:id', async (req, res) => {
    const updated = await userCache.updateUser(req.params.id, req.body);
    res.json(updated);
});

// Stats endpoint
app.get('/api/cache/stats', (req, res) => {
    res.json(userCache.getCacheStats());
});
```

### Explanation

**Why Cache-Aside**: Most flexible pattern - application controls caching logic. Cache failures don't break the application (fallback to database).

**Cache Key Design**: Use descriptive prefixes (`user:`, `post:`) to organize cache and enable pattern-based deletion (`user:*`).

**Negative Caching**: Cache "user not found" results to prevent repeated database queries for non-existent users (common during attacks or bot traffic).

**Graceful Degradation**: If Redis fails, application continues working (queries database directly). Cache should enhance performance, not create new failure points.

### Trade-offs

- ✅ **Pros**: Simple to implement, cache failures don't affect availability, works with any database
- ✅ **Pros**: High cache hit rates (80-95%) for read-heavy workloads
- ✅ **Pros**: Easy to reason about - cache is just a performance optimization
- ❌ **Cons**: First request always misses cache (cold start problem)
- ❌ **Cons**: Manual cache invalidation required (must delete cache on updates)
- ❌ **Cons**: Potential for stale data if TTL is too long or invalidation fails

---

## Example 2: Write-Through Cache - Python

### Scenario

You're building a content management system where posts are frequently updated. You need strong consistency - readers should see latest data immediately after writes. Write-through pattern ensures cache is always synchronized with database.

### Implementation

```python
import redis
import json
import psycopg2
from typing import Optional, Dict
import time

class ContentCache:
    def __init__(self, db_conn, redis_client):
        self.db = db_conn
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour

    def get_post(self, post_id: int) -> Optional[Dict]:
        """
        Read-through: Check cache first, load from DB on miss
        """
        cache_key = f"post:{post_id}"

        try:
            # Try cache first
            cached = self.redis.get(cache_key)
            if cached:
                print(f"Cache HIT: {cache_key}")
                return json.loads(cached)

            # Cache miss - load from database
            print(f"Cache MISS: {cache_key}")
            with self.db.cursor() as cursor:
                cursor.execute(
                    "SELECT id, title, content, author_id, created_at "
                    "FROM posts WHERE id = %s",
                    (post_id,)
                )
                row = cursor.fetchone()

                if not row:
                    return None

                post = {
                    'id': row[0],
                    'title': row[1],
                    'content': row[2],
                    'author_id': row[3],
                    'created_at': row[4].isoformat()
                }

                # Populate cache for future reads
                self.redis.setex(
                    cache_key,
                    self.default_ttl,
                    json.dumps(post)
                )

                return post

        except Exception as e:
            print(f"Cache error: {e}")
            # Fallback to database
            with self.db.cursor() as cursor:
                cursor.execute(
                    "SELECT id, title, content, author_id, created_at "
                    "FROM posts WHERE id = %s",
                    (post_id,)
                )
                row = cursor.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'title': row[1],
                        'content': row[2],
                        'author_id': row[3],
                        'created_at': row[4].isoformat()
                    }
            return None

    def create_post(self, title: str, content: str, author_id: int) -> Dict:
        """
        Write-through: Write to database AND cache simultaneously
        Ensures cache is always in sync with database
        """
        cache_key = None

        try:
            # Step 1: Write to database first
            with self.db.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO posts (title, content, author_id, created_at) "
                    "VALUES (%s, %s, %s, NOW()) RETURNING id, created_at",
                    (title, content, author_id)
                )
                post_id, created_at = cursor.fetchone()
                self.db.commit()

            post = {
                'id': post_id,
                'title': title,
                'content': content,
                'author_id': author_id,
                'created_at': created_at.isoformat()
            }

            # Step 2: Immediately write to cache
            cache_key = f"post:{post_id}"
            self.redis.setex(
                cache_key,
                self.default_ttl,
                json.dumps(post)
            )

            print(f"Write-through: Created post {post_id} in DB and cache")
            return post

        except Exception as e:
            print(f"Write-through error: {e}")
            if cache_key:
                # If cache write failed, delete to prevent inconsistency
                self.redis.delete(cache_key)
            raise

    def update_post(self, post_id: int, updates: Dict) -> Dict:
        """
        Write-through: Update database and cache atomically
        """
        cache_key = f"post:{post_id}"

        try:
            # Step 1: Update database
            with self.db.cursor() as cursor:
                cursor.execute(
                    "UPDATE posts SET title = %s, content = %s "
                    "WHERE id = %s RETURNING *",
                    (updates['title'], updates['content'], post_id)
                )
                row = cursor.fetchone()
                self.db.commit()

                if not row:
                    return None

                post = {
                    'id': row[0],
                    'title': row[1],
                    'content': row[2],
                    'author_id': row[3],
                    'created_at': row[4].isoformat()
                }

            # Step 2: Update cache immediately
            self.redis.setex(
                cache_key,
                self.default_ttl,
                json.dumps(post)
            )

            # Step 3: Invalidate related caches
            # E.g., author's post list, homepage feed
            self.redis.delete(f"author:{post['author_id']}:posts")

            print(f"Write-through: Updated post {post_id}")
            return post

        except Exception as e:
            print(f"Update error: {e}")
            # On error, invalidate cache to prevent serving stale data
            self.redis.delete(cache_key)
            raise

    def delete_post(self, post_id: int) -> bool:
        """
        Write-through: Delete from database and cache
        """
        cache_key = f"post:{post_id}"

        try:
            # Step 1: Delete from database
            with self.db.cursor() as cursor:
                cursor.execute("DELETE FROM posts WHERE id = %s", (post_id,))
                deleted = cursor.rowcount > 0
                self.db.commit()

            if deleted:
                # Step 2: Delete from cache
                self.redis.delete(cache_key)
                print(f"Deleted post {post_id} from DB and cache")

            return deleted

        except Exception as e:
            print(f"Delete error: {e}")
            raise

# Usage
db = psycopg2.connect("dbname=cms user=postgres")
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

cache = ContentCache(db, redis_client)

# Create post (writes to both DB and cache)
post = cache.create_post(
    title="System Design Patterns",
    content="Caching is essential for scalability...",
    author_id=123
)

# Read post (cache hit on subsequent reads)
post = cache.get_post(post['id'])

# Update post (updates both DB and cache)
updated = cache.update_post(post['id'], {
    'title': 'Advanced System Design Patterns',
    'content': 'Updated content...'
})
```

### Explanation

**Why Write-Through**: Guarantees cache consistency - cache is always synchronized with database. No stale data, no manual invalidation complexity.

**Atomicity**: Database write and cache write happen together. If cache write fails, we delete cache to prevent inconsistency.

**Related Cache Invalidation**: When updating a post, we also invalidate author's post list and other derived caches.

**Error Handling**: If any operation fails, we invalidate cache rather than serve potentially stale data.

### Trade-offs

- ✅ **Pros**: Strong consistency - cache always matches database
- ✅ **Pros**: No stale data issues
- ✅ **Pros**: Simpler invalidation logic (automatic)
- ❌ **Cons**: Write penalty - every write hits both DB and cache (slower writes)
- ❌ **Cons**: Cache pollution - writes rarely-read data that wastes cache memory
- ❌ **Cons**: More complex failure handling (must handle dual-write failures)

---

## Example 3: Redis Cache with AWS ElastiCache - Terraform

### AWS Services

- **Amazon ElastiCache for Redis**: Managed Redis service with automatic failover and backups
- **VPC & Security Groups**: Network isolation for cache cluster
- **CloudWatch**: Monitoring cache hit rate, evictions, memory usage
- **Parameter Groups**: Configure eviction policy, max memory, timeout settings

### Infrastructure as Code

```hcl
# ElastiCache Subnet Group (private subnets)
resource "aws_elasticache_subnet_group" "main" {
  name       = "app-cache-subnet-group"
  subnet_ids = [
    aws_subnet.private_us_east_1a.id,
    aws_subnet.private_us_east_1b.id,
    aws_subnet.private_us_east_1c.id
  ]

  tags = {
    Name = "app-cache-subnets"
  }
}

# Redis Parameter Group (configuration)
resource "aws_elasticache_parameter_group" "main" {
  name   = "app-cache-params"
  family = "redis7"

  # Eviction policy: LRU when memory is full
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Remove least recently used keys
  }

  # Enable keyspace notifications for cache invalidation
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Notify on key expiration
  }

  # Connection timeout
  parameter {
    name  = "timeout"
    value = "300"  # 5 minutes
  }
}

# Redis Replication Group (cluster mode disabled, simpler)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "app-cache-cluster"
  replication_group_description = "Application cache cluster"

  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.r6g.large"  # 13.07 GB memory

  # High availability: 1 primary + 2 replicas
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled           = true

  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]

  # Automated backups
  snapshot_retention_limit   = 5     # Keep 5 daily snapshots
  snapshot_window           = "03:00-05:00"  # 3-5 AM UTC
  maintenance_window        = "sun:05:00-sun:07:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  # Notification topic for events
  notification_topic_arn = aws_sns_topic.cache_events.arn

  tags = {
    Name        = "app-cache-cluster"
    Environment = "production"
  }
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name        = "redis-security-group"
  description = "Allow Redis traffic from application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from app servers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_servers.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "redis-sg"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Redis CPU utilization is high"

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"  # Alert at 80% memory usage

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "cache_evictions" {
  alarm_name          = "redis-high-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"  # Alert if evicting > 1000 keys per 5 min

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Output Redis endpoint
output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  description = "Redis primary endpoint for writes"
}

output "redis_reader_endpoint" {
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
  description = "Redis reader endpoint for reads (distributes across replicas)"
}
```

### Cost Considerations

**AWS ElastiCache Pricing (us-east-1, cache.r6g.large)**:
- **Instance cost**: $0.226/hour = ~$163/month per node
- **3-node cluster** (1 primary + 2 replicas): ~$489/month
- **Data transfer**: $0.00/GB within same AZ, $0.01/GB cross-AZ
- **Backup storage**: $0.095/GB-month (5 daily snapshots)

**Total Monthly Cost** (typical):
- Cache cluster: $489
- Backup storage (10 GB): ~$1
- Cross-AZ data transfer (100 GB): ~$1
- **Total: ~$491/month**

**ROI Calculation**:
- Without cache: 50,000 DB queries/sec × $0.10/million queries = $432/day = $12,960/month (RDS costs)
- With cache (95% hit rate): 2,500 DB queries/sec = $21.60/day = $648/month
- **Savings: $12,312/month** (cache cost: $491, net savings: $11,821/month)

---

## Interview Deep Dive

### Common Interview Questions

**Q1: What is caching and when would you use it?**

**A**: Caching stores frequently accessed data in fast-access memory (RAM) to reduce latency and database load. You use it when:

1. **Read-Heavy Workload**: 90%+ reads vs writes (social media, news sites, e-commerce product catalog)
2. **Expensive Queries**: Complex joins or aggregations taking 200ms+ that execute repeatedly
3. **Hot Data**: 20% of data serves 80% of requests (Pareto principle)
4. **Database Bottleneck**: Database CPU at 80%+ or query queue depth increasing

**Real-world**: Facebook caches user profiles, news feed, and friend lists in Memcached, achieving 95%+ cache hit rate. Without caching, their database cluster would need 100x more capacity.

**Key characteristics**:
- **Speed**: 1-5ms (Redis) vs 50-200ms (database query)
- **Hit Rate**: 80-95% in production (depends on data access patterns)
- **TTL**: 5 minutes to 24 hours (trade-off between freshness and efficiency)
- **Eviction**: LRU policy removes least-used data when memory fills

**Q2: How does a cache scale to handle 1 million requests per second?**

**A**: Multi-layered caching strategy:

**Layer 1 - Application-Level Cache (In-Process)**:
- Simple HashMap/Dictionary in application memory
- Ultra-fast (< 1ms), but limited to single server
- Good for configuration data, reference data
- Example: Cache product categories (rarely change)

**Layer 2 - Distributed Cache (Redis Cluster)**:
- Shared cache across all application servers
- Sharding across multiple Redis nodes (hash slot distribution)
- Each node handles ~100k-200k req/sec
- 10 Redis nodes = 1M+ req/sec capacity

**Layer 3 - CDN (Edge Caching)**:
- Cache static content (images, CSS, JS) at edge locations
- Reduces origin requests by 80-90%
- Handles billions of requests globally

**Scaling Example** (1M req/sec):
```
Total requests: 1,000,000 req/sec
├─ CDN layer: 700,000 req/sec (70% static content)
├─ App cache: 200,000 req/sec (20% config/reference data)
└─ Redis layer: 100,000 req/sec (10% user data, sessions)
    └─ DB queries: 5,000 req/sec (5% cache misses)
```

**Redis Cluster Configuration**:
```
10 Redis nodes (cache.r6g.xlarge)
- Each node: 100k req/sec capacity
- Total capacity: 1M req/sec
- Memory per node: 26 GB
- Total cache size: 260 GB
- Monthly cost: ~$1,600
```

**Q3: What are the common failure modes of caching systems?**

**A**: Three major failure scenarios:

**Failure 1: Cache Stampede (Thundering Herd)**
- **Symptom**: Popular item's TTL expires, 10,000 simultaneous requests hit database
- **Cause**: No request coordination during cache miss
- **Impact**: Database CPU spikes to 100%, queries timeout, cascading failure
- **Solution**:
  ```javascript
  // Use mutex/lock to ensure only one request fetches data
  const lockKey = `lock:${cacheKey}`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);

  if (acquired) {
    // This request fetches data
    const data = await db.query(...);
    await redis.set(cacheKey, data, 'EX', 3600);
  } else {
    // Other requests wait for cache to be populated
    await sleep(100);
    return await redis.get(cacheKey);
  }
  ```

**Failure 2: Cache Invalidation Race Condition**
- **Symptom**: Stale data served after database update
- **Cause**: Update DB → Delete cache, but old cached data written between these steps
- **Timeline**:
  ```
  T1: Request A reads old data from DB (cache miss)
  T2: Request B updates DB, deletes cache
  T3: Request A writes old data to cache (stale!)
  T4: Users see old data for next hour
  ```
- **Solution**: Use versioning or write-through pattern

**Failure 3: Memory Exhaustion & Eviction Storm**
- **Symptom**: Cache hit rate drops from 95% to 20%, database overwhelmed
- **Cause**: Cache memory full, evicting useful data to make room for new data
- **Impact**: Evicted keys need to be reloaded from DB, causing more evictions (death spiral)
- **Solution**:
  ```hcl
  # Set max memory and eviction policy
  maxmemory 10gb
  maxmemory-policy allkeys-lru  # Evict least recently used

  # Monitor evictions, alert if > 1000/min
  # Scale up cache size before hitting this threshold
  ```

**Q4: Cache-Aside vs Write-Through vs Write-Behind - when to use each?**

**A**:

| Pattern | Write Flow | Consistency | Use Case | Example |
|---------|-----------|-------------|----------|---------|
| **Cache-Aside** | App writes DB, then invalidates cache | Eventual | Read-heavy, stale data acceptable | User profiles, product catalog |
| **Write-Through** | App writes DB + cache simultaneously | Strong | Need fresh data immediately | Blog posts, CMS, inventory |
| **Write-Behind** | App writes cache, async writes to DB | Weak | Ultra-high write throughput needed | Analytics, logging, metrics |

**Cache-Aside** (Most Common):
```javascript
// Write: Update DB, invalidate cache
await db.update(userId, data);
await redis.del(`user:${userId}`);

// Read: Check cache, load from DB on miss
const cached = await redis.get(`user:${userId}`);
if (!cached) {
  const data = await db.query(userId);
  await redis.setex(`user:${userId}`, 3600, data);
}
```

**When**: 90% of use cases. Simple, flexible, cache failures don't affect availability.

**Write-Through**:
```javascript
// Write: Update DB and cache together
await db.update(userId, data);
await redis.setex(`user:${userId}`, 3600, data);
```

**When**: Strong consistency required (content management, order processing).

**Write-Behind** (Advanced):
```javascript
// Write: Update cache, queue DB write
await redis.setex(`user:${userId}`, 3600, data);
await queue.publish({ type: 'UPDATE_USER', userId, data });
// Worker processes queue and writes to DB asynchronously
```

**When**: Extreme write throughput (> 100k writes/sec), eventual consistency acceptable.

**Q5: How would you design a cache for a social media feed with 100 million users?**

**A**:

**Requirements**:
- 100M users × 20 requests/day = 2B requests/day = 23k req/sec average
- Peak hour: 3x average = 70k req/sec
- Average feed: 50 items × 1 KB = 50 KB per user
- Cache capacity: 100M × 50 KB = 5 TB (impossible to cache everything)

**Solution - Multi-Layered Caching**:

**Layer 1 - User Session Cache (Redis)**:
```
Cache active users' feeds only (hot data)
- Active users: 10M simultaneous (10% of total)
- Memory needed: 10M × 50 KB = 500 GB
- Redis cluster: 20 nodes × 25 GB = 500 GB capacity
- TTL: 15 minutes (feeds refresh frequently)
- Cost: ~$3,200/month
```

**Layer 2 - Feed Item Cache**:
```
Cache individual posts (referenced by multiple feeds)
- Popular posts: 100M posts × 1 KB = 100 GB
- TTL: 1 hour
- Redis: 4 nodes × 25 GB = 100 GB
- Cost: ~$640/month
```

**Layer 3 - CDN (CloudFront)**:
```
Cache media (images, videos) at edge locations
- Reduces origin requests by 90%
- Cost: $0.085/GB = ~$5,000/month for 50 TB transfer
```

**Cache Key Strategy**:
```javascript
// Feed cache
feed:user:{userId}:timestamp:{hour}
// Example: feed:user:12345:timestamp:2024-01-15-14

// Post cache
post:{postId}
// Example: post:67890

// Cache miss: Rebuild feed from DB
async function getFeed(userId) {
  const hour = getCurrentHour();
  const cacheKey = `feed:user:${userId}:timestamp:${hour}`;

  let feed = await redis.get(cacheKey);
  if (!feed) {
    // Fetch user's following list
    const following = await db.query(
      'SELECT followee_id FROM followers WHERE follower_id = ?',
      [userId]
    );

    // Fetch recent posts from followees
    feed = await db.query(
      'SELECT * FROM posts WHERE user_id IN (?) ORDER BY created_at DESC LIMIT 50',
      [following]
    );

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(feed));
  }

  return JSON.parse(feed);
}
```

**Invalidation Strategy**:
```javascript
// When user posts new content
async function createPost(userId, content) {
  const post = await db.insert('posts', { userId, content });

  // Cache the post
  await redis.setex(`post:${post.id}`, 3600, JSON.stringify(post));

  // Invalidate feeds of all followers
  const followers = await db.query(
    'SELECT follower_id FROM followers WHERE followee_id = ?',
    [userId]
  );

  // Delete followers' cached feeds (async in background)
  for (const followerId of followers) {
    await redis.del(`feed:user:${followerId}:*`);
  }
}
```

**Capacity Planning**:
```
Cache hit rate target: 90%
- 70k req/sec × 90% = 63k req/sec served from cache
- 7k req/sec hit database
- Database capacity needed: 7k QPS (vs 70k without cache)

Monthly savings:
- Without cache: 70k QPS DB = ~$50,000/month
- With cache: 7k QPS DB + cache = ~$14,000/month
- Savings: $36,000/month
```

---

## Tools & Technologies

### Industry Standard Solutions

| Tool | Type | Pros | Cons | Performance |
|------|------|------|------|-------------|
| **Redis** | In-memory key-value | Fast (< 1ms), rich data structures, persistence | Single-threaded writes | 100k-200k ops/sec per node |
| **Memcached** | In-memory key-value | Simple, multi-threaded, memory-efficient | No persistence, limited data types | 500k-1M ops/sec per node |
| **Hazelcast** | Distributed cache | Java-native, near-cache, computation | JVM only, complex setup | 50k-100k ops/sec |
| **Apache Ignite** | Distributed cache | SQL queries, ACID, compute grid | Complex, resource-heavy | 100k-500k ops/sec |
| **Ehcache** | In-process cache | Simple, JVM-local, no network overhead | Per-instance, not distributed | 1M+ ops/sec (in-memory) |

### Cloud Provider Solutions

**AWS**:
- **ElastiCache for Redis**: Managed Redis with automatic failover, backups, encryption
  - Engine: Redis 7.0
  - Node types: cache.t3.micro ($13/month) to cache.r6g.16xlarge ($3,420/month)
  - Features: Cluster mode, read replicas, Multi-AZ

- **ElastiCache for Memcached**: Managed Memcached with auto-discovery
  - Simpler than Redis, no persistence
  - Better for simple key-value caching

- **DAX (DynamoDB Accelerator)**: In-memory cache for DynamoDB
  - Microsecond latency
  - Fully integrated with DynamoDB
  - Use for DynamoDB-heavy workloads

**GCP**:
- **Cloud Memorystore for Redis**: Managed Redis service
  - High availability with automatic failover
  - Integration with VPC

- **Cloud Memorystore for Memcached**: Managed Memcached

**Azure**:
- **Azure Cache for Redis**: Managed Redis
  - OSS Redis and Enterprise tiers
  - Active geo-replication
  - Integration with Azure services

---

## Best Practices

### Do's ✅

- **Use TTL on All Cached Data**: Always set expiration times to prevent stale data accumulation

```javascript
// Good: TTL ensures data refreshes
await redis.setex('user:123', 3600, userData);  // 1 hour TTL

// Bad: Data never expires
await redis.set('user:123', userData);  // No TTL - memory leak!
```

**Why**: Without TTL, cache fills with stale data and eventually runs out of memory. Even for "permanent" data, use long TTL (24 hours) rather than no expiration.

- **Monitor Cache Hit Rate and Evictions**: Track cache effectiveness

```javascript
// Track hit/miss ratio
setInterval(async () => {
  const info = await redis.info('stats');
  const hits = info.keyspace_hits;
  const misses = info.keyspace_misses;
  const hitRate = hits / (hits + misses) * 100;

  console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);

  if (hitRate < 80) {
    alert('Cache hit rate below 80% - investigate!');
  }
}, 60000);
```

**Target metrics**:
- Hit rate: > 80% (ideally 90-95%)
- Evictions: < 100/min (sign cache is too small)
- Memory usage: < 80% (leave headroom for spikes)

- **Use Appropriate Eviction Policies**: Choose based on access patterns

```hcl
# Most common: Least Recently Used (LRU)
maxmemory-policy allkeys-lru  # Evict any key, least recently used

# For cache with some keys that must never evict
maxmemory-policy volatile-lru  # Only evict keys with TTL

# For time-series data
maxmemory-policy volatile-ttl  # Evict keys expiring soonest
```

- **Implement Cache Warming**: Pre-populate cache before traffic hits

```javascript
// Warm cache during deployment
async function warmCache() {
  // Load most popular items
  const topProducts = await db.query(
    'SELECT * FROM products ORDER BY views DESC LIMIT 1000'
  );

  for (const product of topProducts) {
    await redis.setex(
      `product:${product.id}`,
      3600,
      JSON.stringify(product)
    );
  }

  console.log('Cache warmed with top 1000 products');
}
```

- **Use Cache Namespacing**: Organize cache keys with prefixes

```javascript
// Good: Clear namespacing
user:12345:profile
user:12345:settings
post:67890
session:abc123

// Bad: Ambiguous keys
12345
67890
abc123
```

### Don'ts ❌

- **Don't Cache Everything**: Cache hot data only (20% of data serves 80% of requests)

**Anti-pattern**: Caching entire database
```javascript
// Bad: Caching rarely-accessed data wastes memory
for (const product of allProducts) {  // 10 million products
  await redis.setex(`product:${product.id}`, 3600, product);
}
// Result: 10M × 1KB = 10 GB cache, but only 200MB is actually accessed
```

**Better**: Cache based on access patterns
```javascript
// Good: Cache on-demand (cache-aside)
async function getProduct(id) {
  const cached = await redis.get(`product:${id}`);
  if (cached) return cached;

  const product = await db.findById(id);
  await redis.setex(`product:${id}`, 3600, product);
  return product;
}
```

- **Don't Ignore Cache Failures**: Cache should enhance performance, not break functionality

```javascript
// Bad: App crashes if Redis is down
const data = await redis.get(key);
return JSON.parse(data);  // Throws if data is null!

// Good: Graceful degradation
try {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
} catch (error) {
  console.error('Cache error:', error);
  // Fall back to database
}
return await db.query(...);
```

- **Don't Store Large Objects in Cache**: Keep cached values small

```javascript
// Bad: Caching huge objects
const user = {
  profile: {...},  // 1 KB
  posts: [...1000 posts...],  // 1 MB
  followers: [...10000 followers...],  // 500 KB
  photos: [...base64 encoded...],  // 10 MB
};
await redis.set(`user:${id}`, user);  // 11.5 MB per user!

// Good: Cache specific data, store large data separately
await redis.setex(`user:${id}:profile`, 3600, user.profile);  // 1 KB
await redis.setex(`user:${id}:follower_count`, 3600, followers.length);  // Bytes
// Photos stored in S3/CDN, not cache
```

**Rule**: Keep cached values under 100 KB. Store large blobs (images, videos) in object storage (S3), cache only metadata.

- **Don't Use Cache as Primary Data Store**: Always have database as source of truth

```javascript
// Bad: Treating cache as database
async function createUser(data) {
  await redis.set(`user:${data.id}`, data);  // Only in cache!
  return data;
}
// If cache is cleared, all user data is lost!

// Good: Database is source of truth
async function createUser(data) {
  await db.insert('users', data);  // Primary storage
  await redis.setex(`user:${data.id}`, 3600, data);  // Cache
  return data;
}
```

- **Don't Forget Connection Pooling**: Reuse Redis connections

```javascript
// Bad: Creating new connection per request
app.get('/api/data', async (req, res) => {
  const redis = new Redis();  // New connection!
  const data = await redis.get('key');
  redis.quit();
  res.json(data);
});

// Good: Single connection pool
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

app.get('/api/data', async (req, res) => {
  const data = await redis.get('key');
  res.json(data);
});
```

### Monitoring & Observability

**Key Metrics**:
- **Hit Rate**: > 80% (90-95% ideal)
- **Evictions**: < 100/min (cache too small if higher)
- **Memory Usage**: < 80% (leave headroom)
- **Latency**: P99 < 5ms (Redis), P99 < 10ms (Memcached)
- **Connection Count**: < 80% of max connections

**Alerting**:
```
Critical (page on-call):
- Cache cluster down (all nodes failed)
- Hit rate < 50% for 10 minutes
- Memory usage > 95%

Warning (Slack/email):
- Hit rate < 80% for 30 minutes
- Evictions > 1000/min
- Memory usage > 80%
- P99 latency > 10ms
```

**Debugging**:
```bash
# Redis CLI commands
redis-cli INFO stats  # Hit rate, connections, commands/sec
redis-cli INFO memory  # Memory usage, evictions
redis-cli SLOWLOG get 10  # Slow commands
redis-cli --latency  # Measure latency
redis-cli --bigkeys  # Find large keys
```

---

## Common Failure Modes

### Failure 1: Cache Stampede (Thundering Herd)

**Symptom**: Popular item expires, 10,000 simultaneous requests overwhelm database, query time jumps from 50ms to 5 seconds, cascading failure

**Cause**:
- Cache TTL for hot item expires at exactly 12:00:00 PM
- 10,000 concurrent requests check cache at 12:00:01 PM (all cache miss)
- All 10,000 requests query database simultaneously
- Database connection pool exhausted, queries timeout

**Solution**:

**Approach 1 - Mutex/Lock (Best)**:
```javascript
async function getCachedData(key, ttl, fetchFn) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Acquire lock to fetch data (only one request fetches)
  const lockKey = `lock:${key}`;
  const lockAcquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);

  if (lockAcquired) {
    try {
      // This request fetches data
      const data = await fetchFn();
      await redis.setex(key, ttl, JSON.stringify(data));
      return data;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Other requests wait for cache to be populated
    await sleep(50);  // Wait 50ms
    return getCachedData(key, ttl, fetchFn);  // Retry
  }
}
```

**Approach 2 - Probabilistic Early Expiration**:
```javascript
// Refresh cache before TTL expires (based on probability)
async function getWithProbabilisticRefresh(key, ttl, fetchFn) {
  const result = await redis.get(key);

  if (result) {
    const data = JSON.parse(result);
    const timeLeft = await redis.ttl(key);

    // Probability of refresh increases as TTL approaches 0
    // When 10% of TTL remains, refresh with 10% probability
    const refreshProbability = 1 - (timeLeft / ttl);
    if (Math.random() < refreshProbability) {
      // Refresh cache in background (don't wait)
      fetchFn().then(newData => {
        redis.setex(key, ttl, JSON.stringify(newData));
      });
    }

    return data;
  }

  // Cache miss - fetch and cache
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

**Prevention**: Set TTL with jitter (randomize expiration)
```javascript
const baseTTL = 3600;  // 1 hour
const jitter = Math.random() * 300;  // ±5 minutes
const ttl = baseTTL + jitter;
await redis.setex(key, ttl, data);
```

### Failure 2: Stale Data After Update

**Symptom**: User updates their profile, but sees old data for next 30 minutes. Customer complaints about "changes not saving"

**Cause**: Race condition in cache invalidation
```
T0: User profile cached with TTL=1800 (30 min)
T1: User updates profile
T2: Database updated successfully
T3: Cache invalidated (deleted)
T4: Another request reads profile (cache miss)
T5: Request fetches OLD data from read replica (replication lag)
T6: Request caches OLD data with fresh TTL
T7: User sees stale data for next 30 minutes
```

**Solution**:

**Approach 1 - Write-Through Pattern**:
```javascript
async function updateProfile(userId, newData) {
  // Write to database first
  await db.update('users', { id: userId }, newData);

  // Immediately update cache (don't delete, update)
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(newData));

  return newData;
}
```

**Approach 2 - Cache Versioning**:
```javascript
// Include version number in cache key
async function updateProfile(userId, newData) {
  // Increment version
  const version = await redis.incr(`user:${userId}:version`);

  // Update database
  await db.update('users', { id: userId }, newData);

  // Cache with new version
  await redis.setex(
    `user:${userId}:v${version}`,
    3600,
    JSON.stringify(newData)
  );

  // Delete old versions
  await redis.del(`user:${userId}:v${version - 1}`);

  return newData;
}
```

**Approach 3 - Short TTL + Event-Based Invalidation**:
```javascript
// Use very short TTL (60 seconds) for frequently updated data
await redis.setex(key, 60, data);

// Listen to database change events and invalidate immediately
db.on('user_updated', async (userId) => {
  await redis.del(`user:${userId}`);
});
```

### Failure 3: Memory Exhaustion & Eviction Storm

**Symptom**: Cache hit rate drops from 95% to 15% in 5 minutes, database CPU spikes to 100%, application response time degrades from 50ms to 5 seconds

**Cause**:
- Cache reaches max memory (10 GB)
- New data being cached causes evictions
- Evicted data includes hot keys
- Next request for evicted key = cache miss → database query → cache write → more evictions
- Death spiral: more misses → more DB queries → more cache writes → more evictions

**Solution**:

**Immediate** (stop the bleeding):
```bash
# Increase max memory temporarily
redis-cli CONFIG SET maxmemory 15gb

# Or clear cache entirely and start fresh
redis-cli FLUSHALL
```

**Short-term**:
```javascript
// Monitor evictions and scale up cache before hitting limit
const info = await redis.info('stats');
const evictions = parseInt(info.match(/evicted_keys:(\d+)/)[1]);

if (evictions > 1000) {
  alert('High evictions - scale up cache size!');
}
```

**Long-term**:
```hcl
# Provision cache with 50% headroom
# If working set is 10 GB, provision 15 GB cache
resource "aws_elasticache_replication_group" "main" {
  node_type = "cache.r6g.xlarge"  # 26 GB memory
  # Working set: 10 GB, headroom: 16 GB
}

# Set eviction policy appropriately
parameter {
  name  = "maxmemory-policy"
  value = "allkeys-lru"  # Evict least recently used
}

# Alert before hitting 80% memory
resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  metric_name = "DatabaseMemoryUsagePercentage"
  threshold   = "80"
}
```

**Prevention**: Cache only hot data
```javascript
// Don't cache everything - use access tracking
const accessCount = await redis.incr(`access:${key}`);

if (accessCount > 5) {
  // Only cache if accessed 5+ times (hot data)
  await redis.setex(key, 3600, data);
}
```

---

## Summary

### Key Takeaways

- **Core Concept**: In-memory storage for frequently accessed data, reducing latency from 50-200ms to 1-5ms and database load by 80-95%
- **When to Use**: Read-heavy workloads (90%+ reads), expensive queries, hot data serving majority of requests
- **Scaling Strategy**: Multi-layer (app cache → distributed cache → CDN), achieve 90-95% hit rate, scale cache size to match working set + 50% headroom
- **Main Trade-off**: Added complexity and consistency challenges vs massive performance gains and cost savings

### Related Patterns

- **CDN**: Edge caching for static content, works upstream of application cache
- **Database Read Replicas**: Distribute read load across replicas, cache can reduce replica count needed
- **Circuit Breaker**: Protect cache from request storms, fall back to database if cache is down
- **Event Sourcing**: Cache materialized views of events, invalidate when new events arrive

### Interview Checklist

- [ ] Can explain in 2 minutes: "In-memory storage for frequently read data"
- [ ] Can draw architecture diagram: App → Cache → Database with hit/miss flows
- [ ] Know 2-3 real examples: Facebook (Memcached, 95% hit rate), Twitter (Redis timelines), Reddit (95% cache hits)
- [ ] Understand failure modes: Cache stampede, stale data race conditions, memory exhaustion
- [ ] Can compare patterns: Cache-Aside vs Write-Through vs Write-Behind (when to use each)
- [ ] Know scaling with numbers: 10 Redis nodes = 1M req/sec, $3,200/month, saves $36k/month in DB costs
- [ ] Understand eviction policies: LRU (most common), LFU, TTL-based
- [ ] Can explain cache invalidation strategies: TTL, event-based, versioning
- [ ] Know metrics: Hit rate > 80%, evictions < 100/min, memory < 80%, P99 latency < 5ms
- [ ] Understand Redis vs Memcached: Redis (rich data structures, persistence) vs Memcached (simple, faster)

---

[← Back to SystemDesign](../README.md)
