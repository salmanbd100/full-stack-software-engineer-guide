# CloudFront (CDN)

CloudFront is AWS's global CDN. It caches content at 400+ edge locations so users get responses from a server close to them — not from your origin in us-east-1.

## How CloudFront Works

```
User in London
    ↓
CloudFront Edge Location (London)
    ↓ cache miss → fetches from origin
S3 Bucket / ALB / API Gateway (us-east-1)
    ↓ stores response at edge
Next request → served from London edge (cache hit)
```

**Key terms:**

| Term | What It Is |
|------|-----------|
| **Distribution** | The CloudFront resource. You get a domain like `abc123.cloudfront.net`. |
| **Origin** | Where CloudFront fetches content — S3, ALB, EC2, API Gateway, or any HTTP server. |
| **Edge Location** | The 400+ global PoPs where content is cached and served. |
| **Cache Behavior** | A rule that maps a URL path pattern to an origin + cache settings. |

## Origins

### S3 Origin

Use S3 for static assets: HTML, CSS, JS, images.

⚠️ **Block direct S3 access.** Without this, users can bypass CloudFront and hit your S3 URL directly. This breaks signed URL enforcement and wastes origin requests.

**Fix: use OAC (Origin Access Control).**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789:distribution/DIST_ID"
        }
      }
    }
  ]
}
```

> OAC replaced the older OAI (Origin Access Identity). Use OAC for all new distributions.

✅ Set your S3 bucket to **block all public access** — CloudFront handles delivery.  
❌ Don't enable S3 static website hosting if you use OAC — it changes the S3 endpoint type and breaks the integration.

### ALB / API Gateway Origin

Use for dynamic content. CloudFront can still cache responses at the edge if your origin sets `Cache-Control` headers.

```
/api/*  → ALB (dynamic, no cache or short TTL)
/*      → S3 (static, long TTL)
```

## Cache Behaviors

A distribution has one **default behavior** (`/*`) and optional additional behaviors matched by path prefix.

```
Path Pattern    Origin          Cache TTL   Notes
/api/*          ALB             0s          No caching, pass-through
/static/*       S3              1 year      Immutable assets
/*              S3              1 day       HTML files
```

**TTL settings:** Each behavior has min, max, and default TTL. CloudFront respects `Cache-Control: max-age` from the origin if it falls within min/max bounds.

**Cache policy** — controls what gets cached (query strings, headers, cookies).  
**Origin request policy** — controls what CloudFront forwards to the origin.

> Keep the cache key small. Every unique query string or cookie value creates a separate cache entry.

❌ Forwarding all cookies to the origin defeats caching for static files.  
✅ Strip cookies and query strings for assets that don't need them.

## Cache Invalidation

After a deploy, users might get stale HTML from the edge.

```bash
# Invalidate specific paths after a release
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths "/index.html" "/static/*"
```

⚠️ Invalidations cost money after the first 1,000 paths per month. Prefer **cache-busting filenames** instead.

✅ Better approach: use content-hashed filenames (`main.abc123.js`). When content changes, the filename changes — no invalidation needed. Only invalidate `index.html`.

## Security

### HTTPS

```bash
# Redirect HTTP to HTTPS in your distribution behavior
# Viewer Protocol Policy: Redirect HTTP to HTTPS
aws cloudfront create-distribution \
  --distribution-config file://dist-config.json
```

Always set **Viewer Protocol Policy** to "Redirect HTTP to HTTPS".

### Signed URLs and Signed Cookies

Use for private content — videos, downloads, time-limited access.

| | Signed URL | Signed Cookie |
|--|-----------|--------------|
| **Best for** | Single file access | Multiple files (whole section) |
| **How** | Token in the URL | Token in a browser cookie |
| **Example** | Video download link | Premium member section |

### WAF Integration

Attach an AWS WAF Web ACL to your distribution to block SQL injection, XSS, and bad bot traffic at the edge — before it reaches your origin.

### Geo-Restriction

Block or allow users by country. Built into CloudFront — no WAF needed for simple country blocking.

## CloudFront Functions vs Lambda@Edge

| | CloudFront Functions | Lambda@Edge |
|--|---------------------|------------|
| **Runtime** | Lightweight JS only | Full Lambda (Node.js, Python) |
| **Events** | Viewer request, viewer response | All 4 events (+ origin request/response) |
| **Latency** | Sub-millisecond | Single-digit ms |
| **Max duration** | 1ms CPU | 5s (viewer), 30s (origin) |
| **Cost** | Cheapest | More expensive |
| **Use case** | URL rewrites, header manipulation, A/B redirects | Auth, complex transforms, API calls |

**Which to pick?**

✅ Use **CloudFront Functions** for simple header manipulation, URL rewrites, redirects.  
✅ Use **Lambda@Edge** when you need network calls, auth token verification, or complex logic.

```bash
# Example: add security headers with a CloudFront Function
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  headers['strict-transport-security'] = { value: 'max-age=63072000' };
  headers['x-frame-options'] = { value: 'DENY' };
  return response;
}
```

## Useful CLI Commands

```bash
# List all distributions
aws cloudfront list-distributions

# Get a specific distribution config
aws cloudfront get-distribution --id EDFDVBD6EXAMPLE

# Create an invalidation
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths "/*"

# Create a distribution (from config file)
aws cloudfront create-distribution \
  --distribution-config file://dist-config.json
```

## Interview Q&A

**Q: What is the difference between hosting a static site on S3 vs S3 + CloudFront?**

S3 alone gives you a single-region endpoint with no HTTPS on custom domains and slower response times for global users. Adding CloudFront gives you HTTPS with ACM certs, global edge caching, OAC for private buckets, WAF integration, and much lower latency for users outside your S3 region.

---

**Q: What is OAC and why should you use it?**

OAC (Origin Access Control) is a CloudFront feature that lets the distribution authenticate to your private S3 bucket using the CloudFront service principal. You add a bucket policy that only allows requests from your specific distribution. This blocks all direct S3 URL access. OAC replaced the older OAI — it supports all S3 regions and server-side encryption with KMS.

---

**Q: How do you invalidate the cache after a deploy?**

Run `aws cloudfront create-invalidation` with the paths you want to purge. For long-lived assets (JS, CSS), prefer content-hashed filenames so the URL itself changes on each deploy — no invalidation needed. Only invalidate `index.html` or other entry points that reference the new hashed filenames.

---

**Q: When would you use CloudFront Functions vs Lambda@Edge?**

CloudFront Functions for anything simple and latency-sensitive: URL rewrites, header injection, redirect logic, A/B testing flags. Lambda@Edge when you need real compute — calling an auth service, parsing JWTs, transforming large responses, or anything that needs more than 1ms of CPU.

---

**Q: How do you serve both a REST API and a static frontend from the same domain?**

Use path-based cache behaviors. Route `/api/*` to an ALB or API Gateway origin with TTL set to 0 (no caching). Route `/*` to an S3 origin with a long TTL. Both share the same CloudFront distribution and custom domain. Users see one domain; CloudFront fans traffic to the right origin based on the URL path.

---

[← Route 53](./11-route53.md) | [Load Balancers →](./13-load-balancers.md)
