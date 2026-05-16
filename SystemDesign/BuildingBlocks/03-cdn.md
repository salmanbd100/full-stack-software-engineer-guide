# Content Delivery Network (CDN)

## 💡 **Concept**

A CDN is a global network of edge servers that cache and serve content from locations physically close to users. Instead of every request travelling to your origin server, cached content is served from a nearby edge node.

**Use a CDN when:** you serve static assets, media files, or API responses to geographically distributed users and latency or origin bandwidth is a concern.

Typical impact: 150–250ms cross-continental latency → 5–50ms from edge; 70–90% reduction in origin bandwidth.

---

## How CDN Routing Works

```
User (Tokyo)
  │
  │ 1. DNS resolves cdn.example.com → Tokyo edge IP (Anycast)
  ▼
┌─────────────────────┐
│  Edge Node (Tokyo)  │  ← serves 95% of requests
│  Cache: HIT         │
└─────────────────────┘
         │  cache MISS (first request or expired)
         ▼
┌─────────────────────┐
│  Origin Server (NY) │  ← only 5% reach here
│  Returns content    │
│  + Cache-Control    │
└─────────────────────┘
         │
         │ Edge stores response, serves all future
         │ requests from Tokyo locally
         ▼
┌─────────────────────┐
│  Edge Node (Tokyo)  │  cache HIT on next request
└─────────────────────┘
```

**Anycast routing:** the same IP address is announced from multiple edge locations. DNS and BGP route the request to the nearest node automatically.

---

## Cache-Control Headers

The CDN respects HTTP cache headers set by the origin. This is how you control what gets cached and for how long.

```typescript
import { ServerResponse } from "http";

interface CacheDirectives {
  maxAge: number;           // browser cache seconds
  sMaxAge?: number;         // CDN edge cache seconds (overrides maxAge for CDN)
  staleWhileRevalidate?: number; // serve stale while fetching fresh
  noCache?: boolean;        // always revalidate before serving
  noStore?: boolean;        // never cache (sensitive data)
}

function setCacheHeaders(res: ServerResponse, directives: CacheDirectives): void {
  const parts: string[] = [`max-age=${directives.maxAge}`];

  if (directives.sMaxAge !== undefined) {
    parts.push(`s-maxage=${directives.sMaxAge}`);
  }
  if (directives.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${directives.staleWhileRevalidate}`);
  }
  if (directives.noCache) parts.push("no-cache");
  if (directives.noStore) parts.push("no-store");

  res.setHeader("Cache-Control", parts.join(", "));
}

// Static assets (images, JS bundles with content hash)
setCacheHeaders(res, { maxAge: 31_536_000, sMaxAge: 31_536_000 }); // 1 year

// API response cached at CDN, short TTL
setCacheHeaders(res, { maxAge: 0, sMaxAge: 60, staleWhileRevalidate: 30 });

// User-specific — never cache at CDN
setCacheHeaders(res, { maxAge: 0, noStore: true });
```

---

## Caching Strategies

| Content type | Cache-Control | TTL | Notes |
|---|---|---|---|
| Static assets (hashed filename) | `max-age=31536000, immutable` | 1 year | Content hash changes on update |
| Images, fonts | `s-maxage=86400` | 1 day | Revalidate daily |
| HTML pages | `s-maxage=300, stale-while-revalidate=60` | 5 min | Short TTL, SWR for freshness |
| JSON API (read-only) | `s-maxage=60` | 1 min | Public, non-user-specific |
| User-specific data | `no-store` | — | Never cache at CDN |

**Vary header:** tell CDN to cache separate copies per request variation:

```typescript
res.setHeader("Vary", "Accept-Encoding, Accept-Language");
```

---

## Cache Invalidation

Two approaches when content changes before TTL expires:

**1. URL-based busting (preferred):** embed content hash in filename. Old URL is never purged — it just stops being referenced.

```
/assets/main.abc123.js   ← v1
/assets/main.def456.js   ← v2 (new deploy, new hash)
```

**2. Purge API:** call CDN provider API to invalidate specific paths.

```typescript
async function purgeCDNPaths(paths: string[]): Promise<void> {
  // CloudFront example — post-deploy invalidation
  await cloudfront.createInvalidation({
    DistributionId: process.env.CF_DISTRIBUTION_ID!,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: { Quantity: paths.length, Items: paths },
    },
  });
}

// Call after every deployment for non-hashed HTML pages
await purgeCDNPaths(["/", "/index.html", "/sitemap.xml"]);
```

---

## CDN for Video Streaming

Video streaming requires special CDN features:

- **Chunked delivery:** HLS/DASH splits video into 2–10s segments. CDN caches each segment independently.
- **Range request support:** players request specific byte ranges. CDN must support partial content (206 responses).
- **Origin shielding:** a single "shield" PoP fetches from origin; other edges fetch from the shield. Reduces origin load.

```
User ──▶ Edge (Tokyo) ──▶ Shield (Singapore) ──▶ Origin (NY)
                                 ↑
                         Edge (Sydney) ──▶ Shield (Singapore) (already cached)
```

---

## CDN Providers Comparison

| | Cloudflare | AWS CloudFront | Akamai |
|---|---|---|---|
| **Edge locations** | 300+ | 450+ | 4,000+ |
| **Pricing model** | Flat rate (free tier) | Per GB + request | Enterprise contract |
| **DDoS protection** | Built-in | Shield add-on | Built-in |
| **Best for** | Startups, APIs, security | AWS-native workloads | Enterprise, media |
| **Config complexity** | Low | Medium | High |

---

## When to Use

| Scenario | Benefit |
|---|---|
| Static assets (JS, CSS, images) | Serve from edge, reduce server load |
| Global user base (> 2 continents) | Cut latency 3–10× |
| Traffic spikes (product launch, viral) | CDN absorbs spike; origin stays healthy |
| Video / large file downloads | Bandwidth savings + parallel chunk delivery |
| DDoS protection | Edge absorbs attack traffic |

**Do NOT use CDN for:** authenticated per-user responses (unless using edge auth), highly dynamic data (< 1s TTL makes caching pointless), write requests.

---

## Common Mistakes

❌ **Caching pages with `Set-Cookie`** — CDN will serve the same cookie to all users. Add `Vary: Cookie` or use `no-store` for authenticated responses.

❌ **No content hash on static assets** — if filename is static (`main.js`), a cached CDN version may persist long after a deploy. Use build-tool generated hashes.

❌ **Forgetting to purge on deploy** — HTML pages with short TTL still serve the old version during the TTL window. Post-deploy invalidation is essential for `/index.html`.

✅ **Use origin shielding** — without it, a cache miss in 20 edge locations means 20 simultaneous origin requests for the same file.

---

## Real-World Example

A video platform serves 50M daily users. Video segments (HLS chunks) are cached at 300 edge locations with a 24-hour TTL. Origin shielding means only 1 request per cache miss reaches the origin, not 300. The web app's `index.html` uses `s-maxage=300` with post-deploy CDN invalidation. Result: origin servers handle 5% of the total traffic; the CDN handles the rest. Monthly bandwidth bill drops 85%.

---

## Key Insight

> A CDN is not just a cache — it is a globally distributed layer that moves content closer to users. The most impactful thing you can do for performance and scale is keep as much traffic as possible at the edge.

**Related:** [CDN as Scaling Lever](../Scalability/06-cdn.md) · [Caching](./02-caching.md)

---

[← Back to SystemDesign](../README.md)
