# Back-of-Envelope Calculations

### 💡 **Concept**

Quick math during interviews proves you can reason about scale. The goal is not precision — it is showing you can estimate **QPS, storage, bandwidth, and memory** in your head.

> State your assumptions. Round aggressively. Sanity-check the answer.

## Numbers Worth Memorizing

**Latency (cached at the back of your mind):**

| Operation | Time |
| --- | --- |
| Memory reference | 100 ns |
| SSD random read | 100 µs |
| Datacenter round trip | 500 µs |
| Disk seek (HDD) | 10 ms |
| Cross-continent round trip | 150 ms |

**Time shortcuts:**

```
1 day  ≈ 100,000 seconds   (actual 86,400 — round up for easy math)
1 month ≈ 2.5 M seconds
1 year ≈ 30 M seconds
```

**Data sizes:**

| Thing | Size |
| --- | --- |
| `char`, `boolean` | 1 byte |
| `int32`, IPv4 | 4 bytes |
| `int64`, timestamp | 8 bytes |
| UUID, IPv6 | 16 bytes |
| Tweet text | ~300 bytes |
| Thumbnail image | ~10 KB |
| Photo (compressed) | ~200 KB – 2 MB |
| 1 min of 1080p video | ~100 MB |

## The Four Formulas

```
QPS        = Daily requests / 100,000
Storage    = Items × Size × Retention
Bandwidth  = QPS × Payload size
Servers    = Peak QPS / QPS per server
```

Almost every interview estimate is one of these.

## How To Approach a Calculation

1. **State assumptions out loud.** "Let's assume 100M DAU, 2 writes per user per day."
2. **Round.** Use 100K seconds/day, 400 days/year.
3. **Compute in stages.** Daily → yearly → peak.
4. **Apply peak multiplier.** Peak ≈ 2–3× average. Plan for peak.
5. **Sanity check.** Does 2 PB/day make sense? If not, redo.

## Example 1: Twitter-Scale Feed

**Assumptions:**

- 500 M daily active users
- 2 tweets per user per day
- Tweet = 300 bytes text + 100 bytes metadata
- 20% of tweets attach a 200 KB image
- 5-year retention

**Calculation:**

```typescript
const DAU = 500_000_000;
const tweetsPerDay: number = DAU * 2;          // 1 B tweets/day
const textPerDay: number = tweetsPerDay * 400; // 400 GB/day

const imagesPerDay: number = tweetsPerDay * 0.2;        // 200 M
const mediaPerDay: number = imagesPerDay * 200_000;     // 40 TB/day

const yearlyMedia: number = mediaPerDay * 365;          // ~14.6 PB/year
const fiveYearTotal: number = yearlyMedia * 5;          // ~73 PB
```

**Result:** Text is trivial (~700 TB over 5 years). Media dominates — design around it. You will need object storage (S3) plus a CDN.

## Example 2: URL Shortener

**Assumptions:**

- 100 M new URLs per month
- 100:1 read-to-write ratio
- 10-year retention
- 260 bytes per URL row

**QPS:**

```
Writes/day = 100M / 30 ≈ 3.3M
Write QPS  = 3.3M / 100K ≈ 33 → round to 40 writes/sec
Read QPS   = 40 × 100 = 4,000 reads/sec
Peak read  = 8,000 reads/sec
```

**Storage:**

```
URLs in 10 years = 100M × 12 × 10 = 12B rows
Total            = 12B × 260 bytes ≈ 3 TB
```

**Cache (Pareto — hot 20%):**

```
Cache size = 3 TB × 20% = 600 GB
```

**Result:** Tiny write load. The system is dominated by read QPS and cache sizing. A single Redis cluster handles the hot set.

## Example 3: WhatsApp Messages

**Assumptions:**

- 1 B daily active users
- 50 messages per user per day
- 100 bytes per message

```typescript
const DAU = 1_000_000_000;
const msgsPerDay: number = DAU * 50;            // 50 B/day
const bytesPerDay: number = msgsPerDay * 100;   // 5 TB/day
const yearly: number = bytesPerDay * 365;       // ~1.8 PB/year

const avgQps: number = msgsPerDay / 100_000;    // ~500K msg/sec
const peakQps: number = avgQps * 2;             // ~1M msg/sec

const qpsPerServer = 5_000;
const servers: number = Math.ceil(peakQps / qpsPerServer); // ~200
const withRedundancy: number = Math.ceil(servers * 1.2);   // ~240
```

**Result:** 1.8 PB/year storage, ~240 messaging servers at peak. Storage strategy matters more than CPU.

## Read-to-Write Ratios

Use these defaults when the interviewer does not specify:

| System | Ratio (read : write) |
| --- | --- |
| Social media feeds | 100 : 1 |
| E-commerce browsing | 10 : 1 |
| Messaging | 1 : 1 |
| Banking | 5 : 1 |

## Peak Traffic Multipliers

| Pattern | Multiplier |
| --- | --- |
| Average → Peak hour | 2–3× |
| Weekday → Weekend | 1.5–2× |
| Normal → Black Friday / viral event | 5–10× |

Design for **peak**, not average. Add 20–50% redundancy for failover.

## Cache and Server Sizing

**Cache the hot 20% (Pareto):**

```
Hot data = total × 0.2
Target hit rate ≥ 80%
```

**Server count:**

```
Servers = ceil(peak_qps / qps_per_server)
Add N+1 redundancy (10–20% standby)
```

Rule of thumb per server: 1,000–5,000 QPS for an API, 5,000–10,000 for a thin proxy, 100K+ for in-memory caches.

## Common Mistakes

❌ **Calculating with 86,400 seconds.** Use 100,000. The interview is not a math test.

❌ **Forgetting peak.** "10K QPS average" means designing for 25K. Capacity is sized for the worst hour, not the mean.

❌ **Ignoring redundancy.** Add 20–50% for replicas, failover, and growth. A single zone is not enough.

❌ **Mixing units.** Pick MB/sec **or** Gbps and stick with it. Confusing bits and bytes is the most common slip.

❌ **Skipping the sanity check.** If your answer is "2 EB per day", you made an arithmetic error. Verify orders of magnitude.

## Key Insight

> Interviewers do not care about the exact number. They care that you state assumptions, choose round numbers, and reason about scale in stages. A senior candidate finishes with a one-line summary: "So we need ~200 servers, 2 PB storage, and a CDN for media."

---
[← Back to SystemDesign](../README.md)
