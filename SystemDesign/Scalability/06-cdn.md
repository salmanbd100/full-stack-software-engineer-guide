# CDN as a Scaling Lever

> For CDN architecture, caching strategies, cache-control headers, and provider comparison, see [BuildingBlocks: CDN](../BuildingBlocks/03-cdn.md).

## 💡 **Concept**

A CDN reduces load on your origin servers by serving cached content from edge locations near users. It is one of the cheapest and most impactful scaling levers available — often reducing origin load by 70–90% with minimal engineering effort.

**CDN is not just for performance — it is a scaling tool.** Every request served from edge is a request your servers do not have to handle.

---

## What CDN Offloads

```
Without CDN:
  1M users → 1M requests → Origin servers (overwhelmed)

With CDN (90% hit ratio):
  1M users → CDN serves 900k
           → 100k requests → Origin servers (manageable)
```

| Content type | CDN hit ratio | Origin load reduction |
|---|---|---|
| Static assets (JS, CSS, images) | 95–99% | ~98% |
| HTML pages (short TTL) | 60–80% | ~70% |
| API JSON responses (public) | 70–90% | ~80% |
| User-specific responses | 0% | None |

---

## Cache Hit Math

```typescript
function estimateOriginLoad(
  totalRps: number,
  cdnHitRatio: number
): number {
  return totalRps * (1 - cdnHitRatio);
}

// Example: 50,000 req/s, 90% CDN hit ratio
const originRps = estimateOriginLoad(50_000, 0.90);
// → 5,000 req/s reach origin (down from 50,000)
```

Increasing hit ratio from 80% → 90% halves the origin load:
- 80% hit: 20% reach origin → 10,000 req/s at origin
- 90% hit: 10% reach origin → 5,000 req/s at origin

---

## What to Put on CDN

```typescript
interface CachePolicy {
  path: string;
  cacheControl: string;
  notes: string;
}

const policies: CachePolicy[] = [
  {
    path: "/assets/*",          // hashed filenames
    cacheControl: "max-age=31536000, immutable",
    notes: "1 year — content hash changes on update",
  },
  {
    path: "/api/products",      // public product list
    cacheControl: "s-maxage=60, stale-while-revalidate=30",
    notes: "1 min CDN cache; serve stale while refreshing",
  },
  {
    path: "/",                  // HTML shell
    cacheControl: "s-maxage=300",
    notes: "5 min CDN cache; invalidate on deploy",
  },
  {
    path: "/api/user/*",        // user-specific
    cacheControl: "no-store",
    notes: "Never cache — private data",
  },
];
```

---

## Cache Purge on Deploy

Short-TTL HTML files update automatically. But for pages with longer TTLs, purge after every deploy:

```typescript
interface CDNPurgeRequest {
  paths: string[];
  distributionId: string;
}

async function purgeOnDeploy(
  cdn: CDNClient,
  distributionId: string
): Promise<void> {
  await cdn.purge({
    distributionId,
    paths: ["/", "/index.html", "/sitemap.xml"],
  });
}

// Run this as the final step of your CI/CD pipeline
```

---

## Geographic Scale

CDN is how you serve a global user base without deploying to multiple regions:

```
User in Tokyo           User in Frankfurt
  │                        │
  ▼                        ▼
Tokyo Edge PoP          Frankfurt Edge PoP
  │ (cache hit — 10ms)    │ (cache hit — 8ms)
  │                        │
  └──────── Both served without touching origin ─────────┘
```

Without CDN: Tokyo → US-East-1 origin = 150ms round trip.
With CDN: Tokyo → Tokyo PoP = 10ms.

This is latency reduction AND origin offload in one move.

---

## Common Mistakes

❌ **Long TTL on non-hashed HTML** — users see the old version after a deploy until TTL expires. Purge HTML on every deploy or use short TTLs (5 min).

❌ **Caching Set-Cookie responses** — the CDN serves one user's cookie to another. Use `no-store` for all authenticated responses or ensure `Vary: Cookie` is set.

❌ **No origin shielding** — a cache miss in 50 edge locations means 50 simultaneous origin requests for the same file. Enable origin shielding to collapse these to one.

✅ **Measure your cache hit ratio** — CDN providers surface this metric. A ratio below 70% means you are not caching aggressively enough.

---

## Real-World Example

A SaaS analytics dashboard serves 200k daily users across 40 countries. After adding Cloudflare in front of the origin, static assets reach 98% cache hit ratio. The dashboard's JSON data API (product metrics, last updated every minute) uses `s-maxage=60` — CDN serves stale data while refreshing in the background. Origin load drops from 8,000 req/s to 600 req/s. The team defers buying 10 more servers for 6 months.

---

## Key Insight

> A CDN multiplies your capacity without adding servers. For read-heavy, cacheable traffic, a CDN is cheaper and faster than any amount of horizontal scaling. Maximize cache hit ratio before adding origin capacity.

**Deep dive:** [BuildingBlocks: CDN](../BuildingBlocks/03-cdn.md)

---

[← Back to SystemDesign](../README.md)
