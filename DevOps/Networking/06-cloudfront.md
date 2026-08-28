---
title: CloudFront & CDN
part: 8
chapter: 0
slug: networking-cloudfront
level: intermediate # beginner | intermediate | advanced
reading_time: 17
updated: 2026-08-28
tags: [devops, networking, cloudfront]
in_book: false
---

# CloudFront & CDN

A CDN is not just "make it faster" — it is a caching, security, and cost-reduction layer. This file covers cache strategy, which is where the real decisions are.

> For distribution basics and origin setup, see [AWS CloudFront](../AWS/12-cloudfront.md).

## What a CDN Actually Buys You

| Benefit | Mechanism |
|---------|-----------|
| **Latency** | Content served from an edge location near the user |
| **Origin offload** | ✅ A cache hit never touches your infrastructure |
| **Cost reduction** | CloudFront egress is cheaper than S3 or EC2 egress |
| **DDoS absorption** | Attacks hit hundreds of edge locations, not your origin |
| **TLS at the edge** | Handshake completes close to the user |
| **WAF attachment point** | Filter before traffic reaches your VPC |

✅ **Origin offload is the underrated one.** A 95% cache hit rate means your origin handles 5% of the traffic — often the difference between needing ten instances and needing one.

## The Cache Key

Everything about caching follows from the cache key. Get it wrong and you either serve stale content to the wrong user or cache nothing at all.

```
Cache key = origin + path + [whitelisted headers] + [whitelisted cookies] + [whitelisted query strings]
```

🔴 **The cardinality problem, again.** Every value included in the key multiplies the number of cached variants.

```
/product/123
  + header Accept-Encoding (3 values)
  + cookie session_id      (1,000,000 values)
      → 3,000,000 cache entries for ONE page
      → hit rate collapses to ~0
```

✅ **Include in the cache key only what genuinely changes the response.**

```hcl
resource "aws_cloudfront_cache_policy" "static" {
  name        = "static-assets"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    headers_config { header_behavior = "none" }        # ✅ nothing
    cookies_config { cookie_behavior = "none" }        # ✅ nothing
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_cache_policy" "api" {
  name        = "api-responses"
  default_ttl = 0
  max_ttl     = 60
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip = true

    headers_config {
      header_behavior = "whitelist"
      headers { items = ["Authorization", "Accept-Language"] }
    }
    cookies_config { cookie_behavior = "none" }
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings { items = ["page", "limit"] }
    }
  }
}
```

⚠️ **Cache policy vs origin request policy** — a distinction people get wrong:

| Policy | Controls |
|--------|----------|
| **Cache policy** | What is in the **cache key** (and is forwarded) |
| **Origin request policy** | What is forwarded to the origin **without** affecting the key |

✅ Use an origin request policy for things the origin needs but that must not fragment the cache — for example forwarding `User-Agent` for logging without creating a cache entry per browser.

## Cache Headers

The origin controls caching. CloudFront respects what you send.

```
Cache-Control: public, max-age=31536000, immutable
   → fingerprinted assets: app.a3f9c21.js — cache forever

Cache-Control: public, max-age=0, s-maxage=300
   → HTML: browser revalidates, CloudFront caches 5 min

Cache-Control: private, no-store
   → never cache: authenticated pages, personal data

Cache-Control: public, max-age=60, stale-while-revalidate=300
   → serve stale up to 5 min while refreshing in the background
```

| Directive | Effect |
|-----------|--------|
| `max-age` | Browser **and** CDN TTL |
| `s-maxage` | ✅ CDN only — overrides `max-age` for shared caches |
| `immutable` | Browser will not revalidate at all |
| `private` | 🔴 CDN must not cache; browser may |
| `no-store` | Nobody caches |
| `stale-while-revalidate` | Serve stale, refresh behind the scenes |

> ✅ **The pattern that works: fingerprint your assets and cache them forever.** `app.a3f9c21.js` with `max-age=31536000, immutable` never needs invalidating, because a new build produces a new filename. Only the HTML that references it needs a short TTL.

🔴 **`private` is a security control, not a performance one.** A page containing personal data cached at the edge without `private` will be served to the next user who requests that path.

## Invalidation vs Versioning

```bash
# Invalidation — slow and rate-limited
aws cloudfront create-invalidation \
  --distribution-id E1ABCDEF --paths "/index.html" "/api/config"
```

| | Invalidation | Versioned filenames |
|---|---|---|
| **Speed** | Minutes | ✅ Instant |
| **Cost** | Free for 1,000 paths/month, then charged | ✅ Free |
| **Reliability** | Eventually consistent across edges | ✅ Deterministic |

✅ **Use `/*` sparingly.** Invalidating everything empties the cache, so the next wave of traffic all goes to the origin — a self-inflicted thundering herd right after a deploy.

✨ The right design invalidates only the HTML entry points and relies on fingerprinting for everything else.

## Origin Access — Locking Down S3

🔴 **Never make an S3 bucket public to serve it through CloudFront.**

```hcl
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "cdn_only" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/*"
      Condition = {
        # ✅ Only THIS distribution can read the bucket
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.main.arn }
      }
    }]
  })
}
```

✅ **Origin Access Control (OAC)** is the current mechanism and supports SSE-KMS. Origin Access Identity (OAI) is the legacy predecessor — know both names, use OAC.

**For a custom origin (ALB), add a shared secret header:**

```hcl
custom_header {
  name  = "X-Origin-Verify"
  value = var.origin_secret     # from Secrets Manager
}
```

Then have the ALB reject any request without it. Otherwise attackers can bypass CloudFront and WAF by hitting the ALB directly.

## Signed URLs and Cookies

For content that must not be publicly accessible.

| | Signed URL | Signed Cookie |
|---|---|---|
| **Scope** | One file | ✅ Many files, by path pattern |
| **Use** | A single download, an invoice PDF | Streaming, a paywalled section |

```typescript
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

interface SignedUrlOptions {
  path: string;
  expiresInSeconds: number;
}

function createSignedUrl({ path, expiresInSeconds }: SignedUrlOptions): string {
  return getSignedUrl({
    url: `https://cdn.acme.com${path}`,
    keyPairId: process.env.CF_KEY_PAIR_ID!,
    privateKey: process.env.CF_PRIVATE_KEY!,
    dateLessThan: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  });
}
```

⚠️ Keep expiry short — a signed URL is a bearer token, and anyone who obtains it has access until it expires.

## Edge Compute

| | CloudFront Functions | Lambda@Edge |
|---|---|---|
| **Runtime** | JavaScript, restricted | Node.js or Python, full |
| **Duration** | Under 1 ms | Up to 5 s (viewer) / 30 s (origin) |
| **Network access** | 🔴 No | ✅ Yes |
| **Cost** | ✅ ~1/6th of Lambda@Edge | Higher |
| **Triggers** | Viewer request/response | All four events |

```typescript
// CloudFront Function — header manipulation, redirects, URL rewriting.
// Author in TypeScript and compile down: the runtime itself is an ES5.1 sandbox
// with no network access, no filesystem, and a 1 ms CPU budget.
interface CloudFrontHeaderValue {
  value: string;
}

interface CloudFrontResponse {
  statusCode: number;
  headers: Record<string, CloudFrontHeaderValue>;
}

interface CloudFrontEvent {
  response: CloudFrontResponse;
}

function handler(event: CloudFrontEvent): CloudFrontResponse {
  const response: CloudFrontResponse = event.response;

  response.headers['strict-transport-security'] = {
    value: 'max-age=31536000; includeSubDomains',
  };
  response.headers['x-content-type-options'] = { value: 'nosniff' };
  response.headers['x-frame-options'] = { value: 'DENY' };

  return response;
}
```

✅ **Rule: if it is header manipulation, a redirect, or a URL rewrite, use a CloudFront Function.** Reach for Lambda@Edge only when you need to call another service or run real logic.

**The four trigger points:**

```
Viewer request  → before the cache is checked   (auth, redirects, normalise the key)
Origin request  → on a cache miss only          (origin selection, request rewriting)
Origin response → before caching the response   (adjust cache headers)
Viewer response → before returning to the user  (security headers)
```

⚠️ Viewer triggers run on **every request**. Origin triggers run on **cache misses only**, so they are far cheaper.

## Performance and Cost

| Setting | Effect |
|---------|--------|
| `compress = true` | ✅ Gzip and Brotli — large saving on text assets |
| `http_version = "http2and3"` | HTTP/3 reduces latency on lossy connections |
| **Origin Shield** | An extra caching layer — raises hit rate, reduces origin load |
| `price_class` | Limit to cheaper regions if your users are regional |
| Regional edge caches | ✅ Automatic mid-tier cache between edge and origin |

```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  http_version        = "http2and3"
  price_class         = "PriceClass_100"   # NA + EU only — cheaper
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id

    origin_shield {
      enabled              = true
      origin_shield_region = "eu-west-1"   # ✅ the region of your origin
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.static.id

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
  }

  web_acl_id = aws_wafv2_web_acl.main.arn
}
```

**Monitoring the hit rate:**

```
CacheHitRate = CacheHits / (CacheHits + CacheMisses)
```

| Content | Target Hit Rate |
|---------|----------------|
| Static assets | Above 95% |
| HTML | 70–90% |
| API responses | Varies — often intentionally 0 |

🔴 **A low hit rate on static content almost always means cache key fragmentation** — usually cookies or query strings being included unnecessarily.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Cookies in the cache key | 🔴 Hit rate near zero | `cookie_behavior = "none"` for static |
| Public S3 bucket behind CloudFront | Origin reachable directly, bypassing WAF | OAC with a `SourceArn` condition |
| No secret header on an ALB origin | CloudFront and WAF bypassed | Custom header the ALB verifies |
| Missing `private` on personal data | 🔴 One user's page served to another | `Cache-Control: private, no-store` |
| `/*` invalidation on every deploy | Thundering herd on the origin | Fingerprint assets; invalidate HTML only |
| Certificate not in us-east-1 | Cannot attach to the distribution | Provider alias |
| Lambda@Edge for security headers | 6× the cost, more latency | CloudFront Function |
| Forwarding all headers | Cache fragmented per browser | Whitelist, or origin request policy |

## Interview Q&A

**Q: What determines whether CloudFront serves a cache hit?**

The cache key, which by default is the origin plus the request path, extended by whichever headers, cookies, and query string parameters you configure it to include. The critical property is that every value included multiplies the number of distinct cached objects. If you include a session cookie, every user gets their own cache entry for every path, so the hit rate collapses to near zero and CloudFront becomes an expensive proxy rather than a cache. So the discipline is to include only what genuinely changes the response — `Accept-Encoding` for compression variants, perhaps `Accept-Language` if you serve localised content, and specific query parameters like page and limit. Anything the origin needs for logging or analytics but which does not change the response body should go in an origin request policy instead, which forwards it without adding it to the key.

**Q: How do you handle cache invalidation on deploy?**

Mostly by not needing it. The build fingerprints asset filenames — `app.a3f9c21.js` rather than `app.js` — and those are served with `max-age=31536000, immutable`, so they are cached at the edge and in browsers effectively forever. A new deploy produces new filenames, so there is nothing to invalidate; the old files simply stop being requested. The only thing needing a short TTL is the HTML that references the assets, which I would cache for a minute or two with `s-maxage`, and invalidate explicitly on deploy. That leaves invalidation as one or two paths rather than a wildcard. Avoiding `/*` matters because it empties the entire cache, so the next burst of traffic all reaches the origin at once — a self-inflicted thundering herd immediately after a deploy, which is the worst possible moment.

**Q: How do you stop people bypassing CloudFront and hitting your origin directly?**

It depends on the origin type. For S3, the bucket stays entirely private and you use Origin Access Control, with a bucket policy allowing the CloudFront service principal but conditioned on `AWS:SourceArn` matching your specific distribution — without that condition, any CloudFront distribution in any account could read the bucket. For a custom origin such as an ALB, CloudFront injects a secret custom header, and the ALB has a listener rule that returns 403 for any request lacking it, with the secret stored in Secrets Manager and rotated. This matters more than it first appears, because WAF is attached to the distribution: if the origin is directly reachable, an attacker simply skips CloudFront and every WAF rule with it, along with your rate limiting and DDoS absorption.

**Q: A page containing personal data was served to the wrong user. What went wrong?**

The response was cached at the edge when it should not have been, almost certainly because it lacked `Cache-Control: private` or `no-store`. CloudFront caches based on the cache key, and if the key does not include anything user-specific — which it should not, because including a session cookie destroys the hit rate — then two different users requesting the same path get the same cached object. So authenticated, personalised responses must tell the CDN not to store them at all. The mistake is often introduced by a blanket cache policy applied to a path pattern that later grew to include authenticated routes. The robust design separates them structurally: a cache behaviour for `/static/*` with aggressive caching and no cookies, and a separate behaviour for authenticated paths with caching disabled, so a missing header on one endpoint cannot leak data.

**Q: CloudFront Functions or Lambda@Edge?**

CloudFront Functions for anything that is manipulating the request or response itself — adding security headers, rewriting a URL, normalising the cache key, issuing a redirect, doing a simple token check. They run in under a millisecond, cost roughly a sixth of Lambda@Edge, and scale to millions of requests per second, but they are deliberately restricted: JavaScript only, no network access, no file system, tiny execution budget. Lambda@Edge is the answer when you need to call another service — fetching from DynamoDB, validating a token against an auth provider, choosing an origin based on external state — or when you need a real runtime and longer execution. The cost consideration is also about trigger placement: viewer triggers run on every single request, while origin triggers only run on cache misses, so putting expensive logic at an origin trigger can be dramatically cheaper.

**Q: Your cache hit rate on static assets is 40%. How do you diagnose it?**

Cache key fragmentation, in almost every case. I would look at the cache policy first and check what is being included: cookies are the usual culprit, because an application-wide analytics or session cookie forwarded on the static behaviour creates a separate cache entry per user. Query strings are the second cause — cache-busting parameters or tracking parameters like `utm_source` appended by marketing links fragment the cache even though the response is identical. Forwarding all headers does the same thing per browser variant via `User-Agent`. The fix is a dedicated cache policy for static paths with cookies and query strings set to none and only `Accept-Encoding` enabled, moving anything the origin genuinely needs into an origin request policy. Beyond the key itself, short TTLs from the origin's own `Cache-Control` headers will limit the hit rate regardless of the key, and enabling Origin Shield adds a mid-tier cache that raises the effective hit rate for traffic spread across many edge locations.

---
[Networking Index](./README.md) | [← Security Groups & NACLs](./05-security-groups.md) | [Service Mesh →](./07-service-mesh.md)
