---
title: Back-of-Envelope Estimation
part: 6
chapter: 0
slug: back-of-envelope-estimation
level: intermediate
reading_time: 9
updated: 2026-09-02
tags: [system-design, estimation, capacity, interview]
in_book: true
---

# Back-of-Envelope Estimation {#ch-back-of-envelope-estimation}

> Turn one traffic number into storage, bandwidth and server counts in two minutes, using arithmetic you can do out loud.

**In this chapter:** the numbers worth memorising · four formulas · rounding rules · three worked examples · what the estimate is actually for

## 💡 The Core Idea

Estimation in a design round is not a maths test. It exists to make one decision: does this fit on one
machine, or does it need a fleet? Every architectural choice downstream — sharding, caching, replication,
queueing — follows from which side of that line you land on. So the arithmetic only has to be right to
within a factor of two. Being fast and roughly right beats being slow and exact, every time.

> An estimate that changes no decision was a waste of the round. Always finish with the sentence
> _"so that means…"_.

## How It Works

### Numbers worth memorising

| Quantity                          | Value                    |
| --------------------------------- | ------------------------ |
| Seconds in a day                  | ~86,400 → round to **100,000** |
| Seconds in a month                | ~2.5 million             |
| L1 cache reference                | 1 ns                     |
| Main memory reference             | 100 ns                   |
| SSD random read                   | 100 µs                   |
| Round trip within one data centre | 0.5 ms                   |
| Disk seek (spinning)              | 10 ms                    |
| Round trip across a continent     | 50–80 ms                 |
| Round trip intercontinental       | 150–250 ms               |

| Size                              | Rule of thumb            |
| --------------------------------- | ------------------------ |
| One `char`, one `boolean`         | 1 byte                   |
| One `int`, one 32-bit float       | 4 bytes                  |
| A UUID as text                    | 36 bytes                 |
| A short text post with metadata   | ~1 KB                    |
| A compressed web page             | ~100 KB                  |
| A phone photo                     | ~2 MB                    |
| A minute of 1080p video           | ~50 MB                   |

| Capacity of one commodity machine | Rule of thumb            |
| --------------------------------- | ------------------------ |
| Memory                            | 64–256 GB                |
| Requests per second (simple JSON) | ~10,000                  |
| Postgres writes per second        | ~5,000–10,000            |
| Redis operations per second       | ~100,000                 |

> ⚠️ These are order-of-magnitude anchors, not benchmarks. Quote them as "roughly", and never argue with
> an interviewer who has a different figure — the point is the derivation, not the constant.

### The four formulas

```typescript
// 1. Average requests per second from a daily count.
const rps = (dailyEvents: number): number => dailyEvents / 100_000;

// 2. Peak. Consumer traffic is spiky; 2-3x average is the standard assumption.
const peakRps = (avg: number, multiplier: number = 3): number => avg * multiplier;

// 3. Storage over a retention window.
const storageBytes = (
  writesPerDay: number,
  bytesPerWrite: number,
  years: number,
): number => writesPerDay * bytesPerWrite * 365 * years;

// 4. Bandwidth out of the edge.
const egressBytesPerSecond = (readsPerSecond: number, bytesPerRead: number): number =>
  readsPerSecond * bytesPerRead;
```

Storage estimates that ignore replication are wrong by the replication factor. Multiply by 3 unless you
have said otherwise.

### Rounding rules

Round every input to one significant figure before you start. 86,400 becomes 100,000. 4.7 million
becomes 5 million. Do the whole calculation in powers of ten and fix the magnitude at the end. If you
find yourself writing long division on the whiteboard, you have rounded too little.

## Three Worked Examples

### A social feed at 100 million daily users

**Writes.** Assume each user posts twice a day. That is 200 million posts a day, so 200M ÷ 100k =
**2,000 writes per second**, peaking around 6,000.

**Reads.** Assume each user opens the feed 20 times a day and each open pulls 20 posts. That is
2 billion feed loads, so **20,000 reads per second**, peaking at 60,000. The read-to-write ratio is
about 100:1, which is the number that tells you to cache aggressively and read from replicas.

**Storage.** A post with metadata is ~1 KB. 200M × 1 KB = **200 GB a day**, 73 TB a year, and 220 TB a
year with three-way replication. So it does not fit on one machine, and posts need partitioning.

**So that means:** a sharded store for posts, a cache in front of the feed read path, and fan-out done
asynchronously rather than on the read.

### A URL shortener at 100 million new links a month

**Writes.** 100M ÷ 2.5M seconds ≈ **40 writes per second**. That is nothing — one Postgres primary
handles it with room to spare.

**Reads.** At a 100:1 ratio, **4,000 redirects per second**, peaking at 12,000.

**Storage.** A row is ~500 bytes with the long URL and metadata. 100M × 500 B = 50 GB a month, 600 GB a
year, **3 TB over five years**. One machine can hold that.

**So that means:** no sharding needed for years. The whole problem is read latency, which is a cache
problem, not a scale problem. Say that out loud — recognising that a system is *small* is a senior
signal too.

### A chat service at 50 billion messages a day

**Writes.** 50B ÷ 100k = **500,000 writes per second**. No single database does this. Partitioning is not
optional, and the partition key is the first thing to design.

**Storage.** A message with metadata is ~200 bytes. 50B × 200 B = **10 TB a day**, 3.6 PB a year before
replication.

**So that means:** an append-only store partitioned by conversation, aggressive tiering of old messages
to cold storage, and a retention policy that has to be a product decision rather than an engineering one.

## When to Use It

| Situation                                | Estimate?                      | Why                                        |
| ---------------------------------------- | ------------------------------ | ------------------------------------------ |
| Prompt names a consumer scale            | Yes, in the first ten minutes  | It decides sharding and caching            |
| Internal tool, hundreds of users         | One sentence, then move on     | Everything fits on one machine; say so     |
| Interviewer says "assume it is huge"     | Pick a number and derive       | A visible assumption beats a vague one     |
| You are deep in the optimisation step    | Only for the component in hand | A second full estimate burns time          |

## Common Mistakes

**❌ Calculating everything**

Storage, bandwidth, QPS, memory, cache size, server count, and cost — for a system where none of it
changes the design. Estimate the one or two quantities that decide something.

**✅ Estimating with a purpose**

> "Writes are 2,000 a second. One Postgres primary tops out around 8,000, so writes are fine for now and
> reads are the problem. I will spend my time on the read path."

**❌ Forgetting the peak**

Average traffic sizes nothing. Systems are provisioned for peak, and consumer peak is usually 2–3× the
daily average — higher for anything tied to an event or a time zone.

**❌ Forgetting replication and indexes**

Raw row size × row count is the floor, not the answer. Three-way replication triples it, and indexes
commonly add 20–50% on top.

## 🔑 Key Takeaways

- Estimation exists to answer one question: one machine or a fleet — and everything else follows from the answer.
- Round every input to one significant figure and treat 86,400 seconds as 100,000.
- Storage estimates must include replication and index overhead, or they are low by 3–5×.
- Provision against peak, which for consumer traffic is 2–3× the daily average.
- Finish every estimate with "so that means…", naming the design decision it just made.

## Interview Questions

**Q: How much storage does a photo-sharing service need after five years?**

Start from uploads per day, multiply by average photo size plus thumbnail variants, then by 365 and by
five, then by the replication factor. State each assumption as you use it. The answer matters less than
whether you remembered that thumbnails and replication often outweigh the originals.

**Q: Why round 86,400 to 100,000?**

Because it makes every division a shift of the decimal point, and a 16% error is well inside the
tolerance of an estimate whose purpose is to distinguish "one machine" from "a hundred machines". Speed
here buys time for the parts of the round that carry more signal.

**Q: Your estimate says the whole dataset fits in RAM on one server. Is that the design?**

It is the starting point, and worth saying explicitly because it removes sharding from the conversation.
But a single machine is a single point of failure, so the design still needs a replica and a failover
story. Fitting in memory changes the scaling problem into an availability problem.

## What to Read Next

- [Chapter ?? — Driving the Design Round](#ch-driving-the-round) — where estimation sits in the running order
- [Chapter ?? — Scalability](#ch-scalability) — what to do once the estimate says one machine is not enough
- [Chapter ?? — Latency and Throughput](#ch-latency-and-throughput) — reading the numbers a live system reports back
