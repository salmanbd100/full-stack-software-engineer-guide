# System Design Interview Framework

### 💡 **Concept**

A system design interview tests how you **structure ambiguity**, not how much trivia you remember. Use a framework so you never drift.

The **RADIO framework** covers everything an interviewer wants in 45–60 minutes:

> **R**equirements → **A**rchitecture → **D**ata model → **I**nterface → **O**ptimizations

## Time Budget (45–60 min)

| Phase | Time | Goal |
| --- | --- | --- |
| Requirements | 5–10 min | Scope, scale, constraints |
| Architecture | 10–15 min | High-level boxes and arrows |
| Data model | 5–10 min | Schema, partitioning |
| Interface | 5–10 min | Key API endpoints |
| Optimizations | 10–15 min | Bottlenecks, scale, failure |
| Wrap-up | 5 min | Tradeoffs, questions |

Go broad first. Go deep only where the interviewer leans in.

## R — Requirements

Split into **functional** (what it does) and **non-functional** (how well).

**Functional:** features in scope. Ask what to skip. Out-of-scope is as important as in-scope.

**Non-functional:** scale, latency, availability, consistency, durability.

**Questions to ask every time:**

- How many DAU? Read/write ratio?
- Latency target (p95, p99)?
- Availability SLA (99.9 vs 99.99)?
- Strong or eventual consistency?
- Mobile, web, both?
- Any compliance (GDPR, PCI, HIPAA)?

> Write the answers on the board. They become your design contract.

## A — Architecture

Draw the high-level diagram. Six to eight boxes is enough.

**Standard components:**

- Client (web, mobile)
- Load balancer
- API servers (stateless, horizontally scalable)
- Cache (Redis, Memcached)
- Primary database + replicas
- Object storage (S3) for blobs
- Message queue (Kafka, SQS) for async work
- CDN for static assets

**Walk the request path out loud.** "Client hits the LB → routed to an API server → check cache → on miss, query DB → write back to cache → return."

If you cannot explain the flow in five sentences, the design is too complex.

## D — Data Model

**Pick SQL or NoSQL with a reason.**

| Use SQL when | Use NoSQL when |
| --- | --- |
| Strong relationships, joins | Flexible or evolving schema |
| ACID transactions required | Massive write throughput |
| Complex reporting | Horizontal scale needed |
| Data integrity is critical | Simple key-value access |

**Show partitioning.** "Shard by `user_id` mod N." Mention hot-key risk.

**Schema sketch — Twitter-style tweets table:**

```typescript
interface User {
  userId: bigint;          // PK
  username: string;        // unique, indexed
  email: string;           // unique
  createdAt: Date;
}

interface Tweet {
  tweetId: bigint;         // PK
  userId: bigint;          // FK, indexed
  content: string;         // ≤ 280 chars
  createdAt: Date;         // index (userId, createdAt DESC)
  likes: number;
  retweets: number;
}

interface Follow {
  followerId: bigint;      // PK part 1
  followeeId: bigint;      // PK part 2, indexed
  createdAt: Date;
}
```

For a feed read-heavy workload, also mention a **denormalized timeline table** in Cassandra keyed by `(userId, createdAt)`.

## I — Interface (API)

Pick a few key endpoints. Show request and response shape.

```typescript
// POST /api/v1/tweets
interface CreateTweetRequest {
  userId: bigint;
  content: string;
}
interface TweetResponse {
  tweetId: bigint;
  userId: bigint;
  content: string;
  createdAt: string;
  likes: number;
}

// GET /api/v1/timelines/home?limit=20&cursor=abc
interface TimelineResponse {
  tweets: TweetResponse[];
  nextCursor: string | null;
}
```

**Talking points:**

- Use **cursor pagination**, not offset (offset breaks at scale).
- Version the API (`/v1`).
- Return only fields the client needs.
- Idempotency keys for writes.

## O — Optimizations

Cover the standard five. Pick two to go deep based on the interviewer's interest.

| Lever | Problem it solves |
| --- | --- |
| **Cache** (Redis, CDN) | Slow database reads |
| **Read replicas, sharding** | Database is the bottleneck |
| **Async via queue** | Slow operations block requests |
| **Rate limiting** | Abuse and traffic spikes |
| **Graceful degradation** | Partial failures don't kill UX |

**Caching layers, in order:**

1. Browser cache (`Cache-Control`)
2. CDN edge (images, scripts, redirects)
3. Application cache (Redis)
4. Database query cache

**Async pattern:**

```typescript
// Fast path — accept and queue
async function publishTweet(t: Tweet): Promise<void> {
  await db.insert(t);
  await queue.publish("tweet.created", t);   // fan out async
}

// Slow worker — runs out-of-band
async function onTweetCreated(t: Tweet): Promise<void> {
  await pushToFollowerTimelines(t);
  await indexForSearch(t);
  await notifySubscribers(t);
}
```

## Communication: Do and Don't

✅ **Do:**

- Think out loud. Silence is the worst answer.
- State every assumption.
- Discuss tradeoffs for every decision.
- Sketch diagrams; label boxes.
- Ask "should I go deeper here?"

❌ **Don't:**

- Jump to a solution without scoping.
- Over-engineer. Start simple, scale on demand.
- Forget failure modes — what happens when the cache is cold or a zone dies?
- Defend one answer. Always offer the alternative and explain the tradeoff.

## Mini Walkthrough: URL Shortener

A compressed example showing RADIO in action.

**R — Requirements**
- 100 M new URLs/month, 100:1 read:write, p99 < 50 ms, 10-year retention. Custom aliases later.

**A — Architecture**
- Client → LB → API servers → Redis cache → Cassandra. CDN caches 301 redirects at the edge.

**D — Data Model**

```typescript
interface UrlRow {
  shortUrl: string;     // PK, 7 chars base62
  longUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  clicks: number;
}
```

Partition by `shortUrl` hash. 3 replicas.

**I — Interface**

```typescript
// POST /api/v1/shorten
interface ShortenRequest {
  longUrl: string;
  customAlias?: string;
}
interface ShortenResponse {
  shortUrl: string;
  longUrl: string;
}

// GET /:short → 301 → longUrl
```

**Short-code generation — counter-based (no collisions):**

```typescript
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function base62(n: bigint): string {
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n = n / 62n;
  }
  return out.padStart(7, "a");
}

async function makeShortCode(): Promise<string> {
  const id: bigint = await counterService.next(); // distributed counter
  return base62(id);
}
```

**O — Optimizations**
- Cache hot 20% in Redis (≈ 600 GB). TTL 1 hour.
- CDN caches redirects → most reads never hit origin.
- Rate-limit 10 creates/IP/min.
- Click analytics: emit to Kafka, aggregate offline.

## Common Mistakes

❌ **Skipping requirements.** Designing before scoping wastes 20 minutes and produces the wrong system.

❌ **Drawing 20 boxes.** A clean six-box diagram beats a busy one. Add detail on the components you discuss deeply.

❌ **No numbers.** Every design decision should reference scale: "At 200 K QPS we need read replicas."

❌ **One solution.** Senior candidates always say: "Option A gives X but costs Y; option B trades it the other way. I'd pick A because..."

❌ **Ignoring failure.** What if Redis goes down? What if a zone fails? Cover degradation before the interviewer asks.

## Key Insight

> The framework is not the goal — clarity is. RADIO gives you scaffolding so you never freeze. But the signal interviewers look for is how you handle tradeoffs out loud. Name the choice, name the cost, pick one.

---
[← Back to SystemDesign](../README.md)
