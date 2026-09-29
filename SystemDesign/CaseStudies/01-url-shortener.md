---
title: Design a URL Shortener
part: 6
chapter: 21
slug: design-url-shortener
level: intermediate
reading_time: 10
updated: 2026-09-02
tags: [system-design, case-study, url-shortener, caching, id-generation]
in_book: true
---

# Design a URL Shortener {#ch-design-url-shortener}

> Generate a short unique key with no coordination bottleneck, then serve almost every read from cache.

**In this chapter:** requirements and scale · the architecture · key generation · the data model · caching and redirect semantics

## 💡 The Core Idea

A URL shortener looks trivial, and that is exactly why it is a good interview problem: there is nowhere
to hide. Two decisions carry the whole design. **How do you mint a unique seven-character key without a
central counter that everything queues behind?** And **how do you serve ten billion redirects a day
without touching a database?** Everything else is plumbing.

> This is a read-heavy key-value problem wearing a web application's clothes. Recognise that in the
> first minute and the rest of the round follows.

## How It Works

### Requirements

**Functional:** shorten a long URL, redirect a short code to it, optional custom alias, optional
expiry, click counts.

**Out of scope, said out loud:** user accounts, analytics dashboards, link previews, spam detection.

**Non-functional:** redirects under 100 ms at p99 (the 99th percentile), and short links must never break
or be reassigned. Availability matters more than consistency. A redirect that works is worth more than a
new link that is visible everywhere at once.

**Scale:** 100 million new links a day and 10 billion redirects, a 100:1 read-to-write ratio. That is
about 1,000 writes and 100,000 reads a second on average, and roughly three times that at peak. Storage
at 500 bytes a row is 50 GB a day, so about 18 TB a year before replication.

### Architecture

```mermaid
flowchart LR
  U["Client"] --> C["CDN / edge"]
  C --> L["Load balancer"]
  L --> A["Shortener service<br/>stateless"]
  A --> R["Redis<br/>code to URL"]
  A --> K["Key range<br/>allocator"]
  A --> D[("Sharded key-value store<br/>code as partition key")]
  A -.->|"click event"| Q["Queue"]
  Q --> W["Analytics worker"]
```

**Reads stop at Redis; the datastore sees only misses and writes.**

Click counting goes through a queue. A row update on every redirect would make the write path a hundred
times busier than the create path. Nobody reads that data in real time.

### Key generation

This is the decision the round is really about.

| Approach                     | Works?                                            | Problem                                    |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Hash the URL, take 7 chars   | Yes, and it deduplicates identical URLs            | Collisions must be detected and retried    |
| Random 7 characters          | Yes                                                | Needs a uniqueness check on every write    |
| Auto-increment, base62       | Yes                                                | One global counter is a write bottleneck and the codes are guessable |
| **Pre-allocated key ranges** | **Yes — the answer to give**                       | Wasted keys when an instance dies          |

Base62 over `[a-zA-Z0-9]` gives 62⁷ ≈ **3.5 trillion** codes. That lasts 95 years at 100 million a day.
Seven characters is the right length, and saying why is part of the answer.

```typescript
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toBase62(n: number): string {
  let out = "";
  do {
    out = ALPHABET[n % 62] + out;
    n = Math.floor(n / 62);
  } while (n > 0);
  return out.padStart(7, "0");
}

// Each instance claims a block of one million ids, then mints locally with no coordination.
class KeyAllocator {
  private next = 0;
  private limit = 0;
  constructor(private readonly claimBlock: () => Promise<{ from: number; to: number }>) {}

  async take(): Promise<string> {
    if (this.next >= this.limit) {
      const block = await this.claimBlock(); // one round trip per million keys
      this.next = block.from;
      this.limit = block.to;
    }
    return toBase62(this.next++);
  }
}
```

An instance that dies wastes the rest of its block. At 3.5 trillion keys, that is not a problem worth
solving.

### Data model

```typescript
interface Link {
  code: string;       // partition key — every read is a point lookup
  longUrl: string;
  createdAt: number;
  expiresAt?: number; // TTL handled by the store, not by a cleanup job
  ownerId?: string;
}
```

The access pattern is one query: given a code, return a URL. So a key-value or wide-column store, sharded
on `code`, is the right home. A relational store is defensible but not needed.

Custom aliases need a uniqueness check. This is the one place a conditional write matters. Insert with
"if not exists" and return 409, rather than reading first and then writing.

### Interface

| Operation                     | Notes                                              |
| ----------------------------- | -------------------------------------------------- |
| `POST /links`                 | Body carries the long URL and an optional alias; returns 201 with the code |
| `GET /{code}`                 | The hot path — a redirect, and nothing else         |
| `GET /links/{code}/stats`     | Read from the analytics store, never the hot path   |

### Optimisations

**Caching.** With a 95% hit ratio, only 5,000 of the 100,000 reads a second reach the store. Traffic is
heavily skewed: a small fraction of links take most of it. So LRU (least recently used) eviction over a
few hundred gigabytes of Redis holds the working set comfortably.

**Redirect status code.** This is a trade, not a default.

| Code | Browser behaviour        | Consequence                                          |
| ---- | ------------------------ | ---------------------------------------------------- |
| 301  | Caches the redirect       | Fastest for the user, and later clicks never reach you — so no click counts and no ability to change the target |
| 302  | Re-asks every time        | Every click is measurable and the target can change; you pay for every request |

Use **302** when analytics or editable targets are in the requirements, which they usually are. Say why.

**Multi-region.** Codes never change once created, so replicas can serve reads anywhere with no
consistency problem. Writes go to one region. A new link may take a second to appear elsewhere. Its
creator never notices, as long as their own reads are routed to the write region.

## When to Use It

This shape (mint an opaque key, write once, read enormously) recurs far beyond shorteners. It is the
same design as an invite-code service, a file-share link, a public asset URL, or a feature-flag lookup.
What would change it:

| If the requirement adds…              | The design changes to…                                |
| ------------------------------------- | ------------------------------------------------------ |
| Real-time click analytics              | A streaming aggregation, not a queue and a batch worker |
| Editable targets                       | 302 only, and cache invalidation on update             |
| Guessable codes are unacceptable       | Longer random codes rather than sequential base62      |
| Links expiring in seconds              | TTL in the cache as well as the store                  |

## Common Mistakes

**❌ A single auto-increment counter**

> `nextId = SELECT MAX(id) + 1 FROM links`

Every write in the system now queues on one row. The codes are also easy to guess in order, so anyone
can walk the entire link database.

**✅ Pre-allocated ranges, minted locally**

> Each instance claims a block of a million ids in one round trip and then mints without coordination.

**❌ Counting clicks synchronously**

A counter update on the redirect path turns the busiest path in the system into a write path. And nobody
reads that number within the second.

**❌ Ignoring the redirect status code**

301 is faster and quietly removes your ability to count clicks or change a target. It is a real choice,
and a candidate who does not mention it has not thought about the product.

## 🔑 Key Takeaways

- The two decisions that matter are key generation without coordination and serving reads from cache.
- Pre-allocated key ranges give unique codes with one round trip per million writes and no central bottleneck.
- Base62 over seven characters is 3.5 trillion codes. Say the number, because it justifies the length.
- 301 versus 302 is a product decision about analytics and editability, not a performance detail.
- Click counting belongs on a queue; putting it on the redirect path inverts the system's read/write ratio.

## Interview Questions

**Q: How do you generate short codes at 1,000 writes a second without collisions?**

Pre-allocate ranges. A coordination service hands each instance a block of a million integers, and the
instance converts them to base62 locally. That is one round trip per million keys, not one per write, and
it needs no collision check. The only cost is wasted ids when an instance dies, which does not matter
against 3.5 trillion.

**Q: The cache is cold after a deploy and the store falls over. What went wrong?**

Every request became a miss at the same moment, so the store took the full 100,000 reads a second it
was never sized for. There are three fixes. A warm-up replays the top codes before the instance takes
traffic. Request coalescing turns a thousand concurrent misses for one code into one store read. And a
rolling deploy means the whole cache tier never empties at once.

**Q: Would you shard this database, and on what?**

Yes, on the code itself. Every read is a point lookup by code, so each one stays on a single shard.
There are no range queries and no joins, so hash-based distribution is ideal. Consistent hashing also
means that adding capacity moves only a fraction of the keys, not all of them.

## What to Read Next

- [Chapter ?? — Caching](#ch-caching) — the stampede and the hit ratio arithmetic this design depends on
- [Chapter ?? — Sharding and Transactions at Scale](#ch-sharding) — why `code` is close to a perfect shard key
- [Chapter ?? — Back-of-Envelope Estimation](#ch-back-of-envelope-estimation) — where the 100:1 ratio and the storage figures come from
