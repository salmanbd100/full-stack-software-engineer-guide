# System Design Communication

Articulate system design decisions, trade-offs, and architectures in senior-level interviews.

## The RADIO Framework

Structure every system design discussion with these five phases:

| Phase | Time | Goal |
|-------|------|------|
| **R** Requirements | 5–10 min | Align on scope and constraints |
| **A** Architecture | 15–20 min | Draw and explain high-level design |
| **D** Data Model | 8–10 min | Database schema and storage decisions |
| **I** Interface (API) | 5–8 min | Core API endpoints |
| **O** Optimization | 8–10 min | Caching, scaling, bottlenecks |

> **Rule:** 70% of the score is communication, 30% is technical knowledge. Think out loud always.

---

## Phase 1: Requirements

Never start designing without clarifying requirements. It shows maturity.

**Functional requirements:**
- "What are the core features? Should I focus on [X] or also include [Y]?"
- "Which of these should we prioritize for this discussion?"

**Non-functional requirements:**
- "What's the expected scale? Daily active users?"
- "What's the read-to-write ratio?"
- "What are the latency requirements? Under 200ms? Under 1s?"
- "Do we need strong consistency, or is eventual consistency acceptable?"
- "What's the uptime target — 99.9% or 99.99%?"

**Summarize before proceeding:**
```
"Let me confirm what we're building:
- 300M daily active users
- ~700 writes per second
- Read-heavy (100:1 ratio)
- Target latency: <500ms for timeline loads
- Eventual consistency is acceptable

Is that correct?"
```

**Why this matters:** Shows you don't jump to solutions, you think in requirements first.

---

## Phase 2: Architecture

### Structure

1. Start with a high-level overview (2 min)
2. Draw main components while narrating
3. Walk through a key request flow
4. Justify major decisions

**High-level opener:**
```
"At a high level, I need:
1. A client layer (web + mobile)
2. An API gateway for routing, auth, and rate limiting
3. Application services — one per domain (Tweet, Timeline, User)
4. A data layer — different stores for different access patterns
5. A CDN for static assets and media

Let me draw this out and walk through the components..."
```

**Walking through a request flow:**
```
"For posting a tweet:
1. Client → API Gateway (auth check, rate limit)
2. → Tweet Service (validates, writes to Cassandra)
3. → Publishes event to Kafka
4. → Timeline Service (fan-out to followers' cached timelines)
5. → Returns 201 to client

For reading the home timeline:
1. Client → API Gateway → Timeline Service
2. Timeline Service checks Redis cache
3. Cache HIT: return in <10ms
4. Cache MISS: query Cassandra, rebuild cache, return in ~200ms"
```

**Justifying decisions:**
```
"I chose Cassandra for tweets because:
✅ Write-optimized — handles 700 writes/sec easily
✅ Horizontally scalable — add nodes as traffic grows
❌ Eventual consistency — acceptable for our requirements
❌ More complex to operate than PostgreSQL
Verdict: worth it at this scale."
```

---

## Phase 3: Data Model

Keep it focused on the 2–3 core entities. Explain partition keys for NoSQL.

```
"Three main entities: Users, Tweets, Relationships.

Users → PostgreSQL (strong consistency needed, small data size)
  - id, username (unique/indexed), email, created_at

Tweets → Cassandra (write-heavy, massive scale)
  - Partition key: user_id (co-locate a user's tweets)
  - Clustering key: created_at DESC (efficient timeline reads)

Relationships → PostgreSQL
  - Composite PK: (follower_id, followee_id) — prevents duplicate follows
  - Index on both columns for bidirectional lookups

Timeline cache → Redis
  - Key: user_id:timeline → list of tweet IDs, TTL: 5 min
  - Store IDs only, fetch full tweets in batch"
```

---

## Phase 4: API Design

Define the 3–4 most critical endpoints. Show pagination and error handling.

```
POST /api/v1/tweets
- Body: { content, media_urls }
- Response: 201 with tweet object
- Rate limit: 50 tweets/hour

GET /api/v1/timeline/home
- Params: page_size (default 20), cursor (for pagination)
- Response: { tweets[], next_cursor, has_more }
- Use cursor-based pagination, not offset — consistent under live data

GET /api/v1/users/:username/timeline
- Same response shape as home timeline

Error format:
{ "error": { "code": "TWEET_TOO_LONG", "message": "..." } }
```

---

## Phase 5: Optimization

**Common bottleneck patterns:**

| Problem | Solution |
|---------|----------|
| Celebrity fan-out (100M followers) | Hybrid: push for regular users, pull for celebrities |
| Hot read paths | Multi-level cache (Redis → CDN → browser) |
| High write throughput | Message queue (Kafka) for async processing |
| Global latency | CDN + geo-distributed data centers |
| DB bottleneck | Read replicas + connection pooling |

**Back-of-envelope estimates:**
```
"300M DAU, 10% post daily, 2 posts each → 60M tweets/day
60M / 86,400 sec ≈ 700 tweets/second at peak
Read-heavy at 100:1 ratio → 70,000 reads/second
This confirms we need aggressive caching on the read path."
```

---

## Key Communication Techniques

### Think Out Loud

**❌ Wrong:**
[Silent for 2 minutes while thinking]

**✅ Right:**
```
"I'm thinking about the database choice. We need high write throughput
and horizontal scalability, so I'm leaning toward Cassandra over
PostgreSQL... Let me explain why."
```

### Use Signposting

```
"I'll break this into five parts: requirements first, then architecture,
data model, API design, and finally scaling considerations."
```

### Engage the Interviewer

```
"Does this approach make sense? Should I dive deeper into the caching
strategy, or shall I move on to the API design?"
```

### Back Claims with Numbers

**❌** "This is fast enough."
**✅** "This reduces latency from 800ms to 200ms — well under our 500ms target."

### Reference Real Systems

```
"This is the hybrid fan-out approach Twitter uses — push for regular
users, pull for celebrities. It balances write cost with read speed."
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Jump to solutions without clarifying requirements | Spend 5–10 min on requirements first |
| Over-engineer the first cut | Start simple (monolith + one DB), then scale |
| State "X is best" without trade-offs | Always say why, and what you gave up |
| Monologue for 15 minutes | Pause every 5 min: "Does this make sense?" |
| Vague performance claims | Back everything with numbers |

---

**Related:** [Technical Communication](./01-technical-communication.md) | [Problem-Solving Communication](./05-problem-solving-communication.md)
