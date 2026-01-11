# Content Delivery Network (CDN)

## 💡 **Problem → Solution**

| Aspect | Details |
|--------|---------|
| **Problem** | Latency + Global Distribution |
| **Solution** | Content Delivery Network (CDN) |
| **Latency Improvement** | 500ms → 20-50ms |
| **Bandwidth Savings** | 60-80% reduction |

**When to Use:**

| Scenario | Benefit |
|----------|---------|
| ✅ Global users | Reduce 500ms+ latency |
| ✅ Static content heavy | 70-90% bandwidth for assets |
| ✅ Origin overload | Reduce repeated requests |
| ✅ Page load optimization | 3s → <1s load time |

---

## Pattern Overview

### What is a CDN?

A **Content Delivery Network (CDN)** is a geographically distributed network of proxy servers (called edge servers or PoPs - Points of Presence) that cache and serve content from locations physically closer to users. Think of it as placing warehouses in every major city instead of shipping everything from a single central warehouse - goods arrive faster because they travel shorter distances.

When a user in Tokyo requests a video from your New York-based origin server, the request would normally travel 6,700 miles (11,000 km) with 150-250ms latency. With a CDN, the video is cached at a Tokyo edge location, reducing latency to 5-20ms and eliminating the transoceanic round trip. The first request (cache miss) fetches from origin and caches at the edge; all subsequent requests (cache hits) serve directly from the nearby edge location.

CDNs are essential for modern web applications - they typically handle 70-90% of internet traffic and can reduce origin server load by 80-95%. They provide performance improvements (faster page loads), cost savings (reduced bandwidth from origin), scalability (handle traffic spikes), and reliability (content remains available even if origin is down).

### Key Characteristics

- **Edge Locations**: 200-300+ PoPs globally (Cloudflare: 300+, CloudFront: 450+, Akamai: 4,000+)
- **Cache Hit Ratio**: Production CDNs achieve 85-95% hit rates for static content
- **Latency Reduction**: 150-250ms (cross-continent) → 5-50ms (edge location)
- **Bandwidth Savings**: Reduce origin bandwidth by 70-90%, saving $0.05-0.09/GB
- **Capacity**: Single PoP can handle 100+ Gbps, CDN networks handle 100+ Tbps globally
- **TTL**: Cache content from 5 minutes (dynamic) to 1 year (static assets) based on Cache-Control headers

### Real-World Applications

- **Netflix**: Uses its own CDN (Open Connect) with 17,000+ servers in 1,000+ locations, caching 100% of video content at edge to deliver 250+ million subscribers with 15+ petabytes daily
- **YouTube**: Serves 1 billion hours of video daily using Google's global CDN with aggressive edge caching, reducing latency from 400ms to 20-50ms for most users
- **Cloudflare**: Protects and accelerates 20+ million websites, handling 50+ million requests/second with 99.999% uptime and blocking 180+ billion threats daily

---

## Core Concepts

### Architecture Pattern

```
User (Tokyo)
    │
    │ 1. Request image.jpg
    ▼
┌─────────────────┐
│ Edge Location   │
│ (Tokyo PoP)     │
│                 │
│ Cache: MISS     │
└────────┬────────┘
         │
         │ 2. Fetch from origin (first request)
         │    6,700 miles, 200ms
         │
         ▼
┌─────────────────┐
│ Origin Server   │
│ (New York)      │
│                 │
│ S3 / App Server │
└────────┬────────┘
         │
         │ 3. Return image (200 OK + Cache-Control)
         │
         ▼
┌─────────────────┐
│ Edge Location   │
│ (Tokyo PoP)     │
│                 │
│ Cache: HIT      │◀─── 4. Subsequent requests
│ Serve locally   │     (5-20ms)
└─────────────────┘
```

### Key Components

1. **Edge Locations (PoPs)**: Geographically distributed servers that cache content near users
2. **Origin Server**: Source of truth (S3, web server, API) where original content lives
3. **Cache-Control Headers**: HTTP headers that define caching behavior (max-age, s-maxage, public/private)
4. **TTL (Time To Live)**: How long content stays cached before revalidation (seconds to years)
5. **Invalidation/Purge**: Mechanism to remove or update cached content before TTL expires
6. **Origin Shield**: Optional additional caching layer between edge and origin to reduce origin requests

### How It Works

**First Request (Cache Miss)**:

**Step 1**: User in Sydney requests `https://cdn.example.com/logo.png`

**Step 2**: DNS resolves to nearest edge location (Sydney PoP)

**Step 3**: Edge server checks cache - MISS (content not cached yet)

**Step 4**: Edge server fetches from origin server:
```http
GET /logo.png HTTP/1.1
Host: origin.example.com
```

**Step 5**: Origin responds with content and caching instructions:
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
Content-Type: image/png
Content-Length: 15234
```

**Step 6**: Edge caches content and serves to user (total: 300ms)

**Subsequent Requests (Cache Hit)**:

**Step 1**: Another user in Sydney requests same file

**Step 2**: Edge server checks cache - HIT (content cached)

**Step 3**: Edge serves directly from cache (total: 15ms)

**Step 4**: No origin request needed (saves bandwidth and reduces origin load)

---

## Example 1: CloudFront CDN Configuration - Terraform

### Scenario

You're serving a React application with 10 million global users. Your origin S3 bucket is in us-east-1. Users in Asia and Europe experience 2-3 second page load times due to latency. Implementing CloudFront CDN reduces this to under 500ms globally.

### Implementation

```hcl
# S3 bucket for origin content
resource "aws_s3_bucket" "website" {
  bucket = "myapp-static-content"

  tags = {
    Name = "Website Origin"
  }
}

# S3 bucket public access block (keep private, CDN accesses via OAI)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Identity (OAI) - allows CDN to access private S3
resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "OAI for website S3 bucket"
}

# S3 bucket policy - allow CloudFront OAI to read
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.website.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Website CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"  # Use all edge locations globally

  # Origin configuration
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-Website"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
    }

    # Origin Shield - additional caching layer
    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"  # Same region as S3
    }
  }

  # Default cache behavior (for all files)
  default_cache_behavior {
    target_origin_id       = "S3-Website"
    viewer_protocol_policy = "redirect-to-https"  # Force HTTPS

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    # Managed cache policy - optimized for static content
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized

    # Compress content automatically
    compress = true

    # Function associations for edge logic
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # Custom cache behavior for static assets (longer TTL)
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "S3-Website"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    # Long TTL for versioned static assets
    min_ttl     = 0
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000  # 1 year

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    compress = true
  }

  # Custom cache behavior for API (no caching)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "S3-Website"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]

    # No caching for API requests
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host"]
      cookies {
        forward = "all"
      }
    }
  }

  # Geographic restrictions (optional)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.website.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"  # SPA routing
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  # Logging
  logging_config {
    bucket          = aws_s3_bucket.cdn_logs.bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = false
  }

  tags = {
    Name        = "Website CDN"
    Environment = "production"
  }
}

# CloudFront Function - Add security headers
resource "aws_cloudfront_function" "security_headers" {
  name    = "security-headers"
  runtime = "cloudfront-js-1.0"
  comment = "Add security headers to responses"
  publish = true

  code = <<-EOT
    function handler(event) {
      var response = event.response;
      var headers = response.headers;

      // Security headers
      headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubdomains; preload'};
      headers['x-content-type-options'] = { value: 'nosniff'};
      headers['x-frame-options'] = { value: 'DENY'};
      headers['x-xss-protection'] = { value: '1; mode=block'};
      headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin'};

      return response;
    }
  EOT
}

# CloudWatch alarm - High error rate
resource "aws_cloudwatch_metric_alarm" "cdn_errors" {
  alarm_name          = "cloudfront-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"  # 5% error rate

  dimensions = {
    DistributionId = aws_cloudfront_distribution.website.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Output CDN domain
output "cdn_domain" {
  value       = aws_cloudfront_distribution.website.domain_name
  description = "CloudFront distribution domain (use in DNS CNAME)"
}
```

### Explanation

**Origin Access Identity (OAI)**: Keeps S3 bucket private while allowing CloudFront to access it. Users cannot bypass CDN and access S3 directly.

**Origin Shield**: Additional caching layer between edge locations and origin. Reduces origin requests by 50-80% by consolidating cache misses from multiple edge locations.

**Cache Behaviors**: Different caching rules for different paths:
- `/static/*` → Cache for 1 year (versioned files never change)
- `/api/*` → Never cache (dynamic data)
- Default → Cache for reasonable time based on content type

**Managed Cache Policies**: AWS provides optimized policies (`CachingOptimized`) that handle Cache-Control headers intelligently.

### Trade-offs

- ✅ **Pros**: 450+ edge locations globally, 5-50ms latency for 95% of users vs 150-500ms without CDN
- ✅ **Pros**: Reduces origin bandwidth by 85-95% (cost savings of $0.05-0.08/GB)
- ✅ **Pros**: Handles traffic spikes (Super Bowl, Black Friday) without origin scaling
- ❌ **Cons**: Higher cost than serving from origin ($0.085/GB CloudFront vs $0.01/GB S3)
- ❌ **Cons**: Cache invalidation complexity - takes 5-15 minutes to propagate globally
- ❌ **Cons**: Debugging is harder (need to check which edge location served content)

---

## Example 2: Cache-Control Headers - JavaScript/Node.js

### Scenario

You're building an e-commerce site serving product images, CSS, and JavaScript. Product images change rarely (cache for 1 year), but product data changes frequently (cache for 5 minutes). Implementing proper Cache-Control headers achieves 95% CDN cache hit rate.

### Implementation

```javascript
const express = require('express');
const path = require('path');
const app = express();

// Middleware to set cache headers based on content type
function setCacheHeaders(req, res, next) {
  const filePath = req.path;

  // Static assets with content hash (e.g., main.a3f2b1.js) - immutable
  if (/\.[a-f0-9]{8,}\.(js|css|png|jpg|svg|woff2)$/.test(filePath)) {
    // Immutable files - cache forever
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
    });
  }
  // HTML files - never cache (for SPA routing)
  else if (filePath.endsWith('.html') || filePath === '/') {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  // Images without hash - cache for 1 week
  else if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(filePath)) {
    res.set({
      'Cache-Control': 'public, max-age=604800',  // 1 week
      'Expires': new Date(Date.now() + 604800 * 1000).toUTCString()
    });
  }
  // CSS and JS without hash - cache for 1 day
  else if (/\.(css|js)$/.test(filePath)) {
    res.set({
      'Cache-Control': 'public, max-age=86400',  // 1 day
      'Expires': new Date(Date.now() + 86400 * 1000).toUTCString()
    });
  }
  // Fonts - cache for 1 year
  else if (/\.(woff|woff2|ttf|eot)$/.test(filePath)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000',
      'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
    });
  }
  // Default - cache for 5 minutes
  else {
    res.set({
      'Cache-Control': 'public, max-age=300',
      'Expires': new Date(Date.now() + 300 * 1000).toUTCString()
    });
  }

  next();
}

// API responses - dynamic data with short TTL
app.get('/api/products/:id', async (req, res) => {
  const product = await db.getProduct(req.params.id);

  // Cache for 5 minutes, but allow stale content for 1 hour
  res.set({
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'ETag': `"${product.version}"`,  // For conditional requests
    'Last-Modified': product.updated_at.toUTCString()
  });

  // Handle conditional requests (304 Not Modified)
  const clientETag = req.get('If-None-Match');
  if (clientETag === `"${product.version}"`) {
    return res.status(304).end();  // Not modified - use cached version
  }

  res.json(product);
});

// Apply cache headers middleware
app.use(setCacheHeaders);

// Serve static files
app.use(express.static('public', {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Already handled by middleware above
  }
}));

// Cache invalidation endpoint (for deployments)
app.post('/api/admin/purge-cache', async (req, res) => {
  const { paths } = req.body;

  try {
    // Invalidate CloudFront cache
    const cloudfront = new AWS.CloudFront();
    const result = await cloudfront.createInvalidation({
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths  // ['/index.html', '/static/main.*.js']
        }
      }
    }).promise();

    res.json({
      success: true,
      invalidationId: result.Invalidation.Id,
      status: result.Invalidation.Status,
      message: 'Cache invalidation initiated (takes 5-15 minutes)'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check - no caching
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Explanation

**Immutable Assets**: Files with content hash (e.g., `main.a3f2b1.js`) can be cached forever. When content changes, filename changes, automatically busting cache.

**HTML Files**: Never cache HTML (or very short TTL) to ensure users get latest SPA routing and meta tags.

**stale-while-revalidate**: Allows CDN to serve stale content immediately while fetching fresh content in background. Improves performance without serving very stale data.

**ETag & Conditional Requests**: Browser/CDN sends `If-None-Match` header. If content unchanged, return `304 Not Modified` (no body), saving bandwidth.

**Cache Invalidation**: Use CloudFront API to purge specific paths when content changes. Takes 5-15 minutes to propagate to all edge locations.

### Trade-offs

- ✅ **Pros**: Fine-grained control over caching per content type
- ✅ **Pros**: Content-addressed assets (hash in filename) can be cached forever safely
- ✅ **Pros**: Conditional requests save bandwidth (304 responses have no body)
- ❌ **Cons**: Complex logic to maintain cache headers correctly
- ❌ **Cons**: Cache invalidation costs money ($0.005 per path, first 1000/month free)
- ❌ **Cons**: Risk of serving stale content if cache headers misconfigured

---

## Example 3: CDN Cache Purge Strategy - Python

### Scenario

You're deploying a new version of your application. You need to invalidate old JavaScript/CSS files without invalidating all images (which would cause cache stampede). Selective purging saves bandwidth and prevents origin overload.

### Implementation

```python
import boto3
import hashlib
import time
from typing import List, Dict

class CDNManager:
    def __init__(self, distribution_id: str):
        self.cloudfront = boto3.client('cloudfront')
        self.distribution_id = distribution_id

    def invalidate_paths(self, paths: List[str], description: str = "") -> Dict:
        """
        Invalidate specific paths in CloudFront distribution.
        Cost: $0.005 per path (first 1000/month free)
        Time: 5-15 minutes to propagate globally
        """
        try:
            # Create unique caller reference (idempotency)
            caller_ref = f"{description}-{int(time.time())}"

            response = self.cloudfront.create_invalidation(
                DistributionId=self.distribution_id,
                InvalidationBatch={
                    'Paths': {
                        'Quantity': len(paths),
                        'Items': paths
                    },
                    'CallerReference': caller_ref
                }
            )

            invalidation = response['Invalidation']

            print(f"✅ Invalidation created: {invalidation['Id']}")
            print(f"   Status: {invalidation['Status']}")
            print(f"   Paths: {len(paths)} items")
            print(f"   Estimated time: 5-15 minutes")

            return {
                'invalidation_id': invalidation['Id'],
                'status': invalidation['Status'],
                'paths': paths,
                'cost': len(paths) * 0.005  # Approximate cost
            }

        except Exception as e:
            print(f"❌ Invalidation failed: {e}")
            raise

    def invalidate_deployment(self, build_id: str):
        """
        Invalidate only changed files after deployment.
        Smart approach: Don't invalidate everything, only HTML and new JS/CSS.
        """
        paths_to_invalidate = [
            # Always invalidate HTML (entry point)
            '/',
            '/index.html',

            # Invalidate specific versioned assets
            # These have changed in this deployment
            f'/static/js/main.{build_id}.js',
            f'/static/css/main.{build_id}.css',

            # Invalidate manifest (references new asset versions)
            '/asset-manifest.json',
            '/manifest.json',

            # Service worker (controls caching)
            '/service-worker.js'
        ]

        print(f"🚀 Deployment {build_id}: Invalidating {len(paths_to_invalidate)} paths")
        return self.invalidate_paths(paths_to_invalidate, f"deploy-{build_id}")

    def invalidate_wildcard(self, pattern: str):
        """
        Invalidate using wildcard patterns.
        Warning: /* counts as ONE path for billing but may invalidate thousands of files.
        """
        result = self.invalidate_paths([pattern], f"wildcard-{pattern}")
        print(f"⚠️  Wildcard invalidation may take longer and affect many files")
        return result

    def get_invalidation_status(self, invalidation_id: str) -> str:
        """
        Check invalidation progress.
        Status: InProgress → Completed
        """
        try:
            response = self.cloudfront.get_invalidation(
                DistributionId=self.distribution_id,
                Id=invalidation_id
            )

            status = response['Invalidation']['Status']
            create_time = response['Invalidation']['CreateTime']

            print(f"Invalidation {invalidation_id}")
            print(f"  Status: {status}")
            print(f"  Created: {create_time}")

            return status

        except Exception as e:
            print(f"Error checking status: {e}")
            raise

    def list_active_invalidations(self):
        """
        List all in-progress invalidations.
        Useful to avoid creating duplicate invalidations.
        """
        try:
            response = self.cloudfront.list_invalidations(
                DistributionId=self.distribution_id,
                MaxItems='50'
            )

            invalidations = response.get('InvalidationList', {}).get('Items', [])

            print(f"Active invalidations: {len(invalidations)}")
            for inv in invalidations:
                print(f"  {inv['Id']}: {inv['Status']} (created {inv['CreateTime']})")

            return invalidations

        except Exception as e:
            print(f"Error listing invalidations: {e}")
            raise

# Usage examples

# 1. Deployment invalidation (smart, selective)
cdn = CDNManager(distribution_id='E1234567890ABC')
result = cdn.invalidate_deployment(build_id='a3f2b1c4')
# Cost: ~$0.035 (7 paths)

# 2. Full cache clear (expensive, avoid)
# cdn.invalidate_wildcard('/*')
# Cost: $0.005 (counts as 1 path but clears everything)

# 3. Invalidate specific content type
cdn.invalidate_wildcard('/images/products/*')
# Invalidates all product images

# 4. Check invalidation status
status = cdn.get_invalidation_status('I2J3K4L5M6N7O8')
# Output: InProgress or Completed

# 5. List active invalidations (prevent duplicates)
active = cdn.list_active_invalidations()
```

### Explanation

**Selective Invalidation**: Only invalidate changed files (HTML, new JS/CSS) instead of entire cache. Saves money and prevents origin overload.

**Wildcard Patterns**: `/*` invalidates everything but counts as one path ($0.005). Use sparingly - can cause cache stampede.

**Versioned Assets**: If using content-addressed assets (`main.a3f2b1.js`), you don't need to invalidate old versions - they'll naturally expire.

**Invalidation Time**: Takes 5-15 minutes to propagate to all 450+ CloudFront edge locations globally.

**Cost Optimization**: First 1,000 invalidation paths/month are free. After that, $0.005 per path. Wildcard `/*` costs $0.005 total.

### Trade-offs

- ✅ **Pros**: Selective invalidation prevents cache stampede and origin overload
- ✅ **Pros**: Wildcard patterns cheap ($0.005 for `/*`) but effective
- ✅ **Pros**: Status checking API allows monitoring invalidation progress
- ❌ **Cons**: 5-15 minute propagation delay (users may see old content)
- ❌ **Cons**: No atomic invalidation (some edges update before others)
- ❌ **Cons**: Over-invalidation wastes money and reduces cache hit rate

---

## Interview Deep Dive

### Common Interview Questions

**Q1: What is a CDN and when would you use it?**

**A**: A CDN (Content Delivery Network) is a globally distributed network of caching proxy servers that serve content from locations closest to users. You use it when:

1. **Global User Base**: Users span multiple continents (US, Europe, Asia) experiencing 200-500ms latency
2. **Static Content Heavy**: 70-90% of traffic is images, videos, CSS, JavaScript (cacheable content)
3. **Traffic Spikes**: Need to handle viral events or seasonal peaks without scaling origin
4. **Bandwidth Costs**: Serving 10+ TB/month from origin costs $900/month vs $850/month via CDN (but origin bandwidth drops to $90)

**Real-world**: Netflix streams 250+ million users using Open Connect CDN (17,000 servers globally), achieving 15-50ms latency vs 200-500ms streaming from central data centers.

**Key characteristics**:
- **Edge Locations**: 200-4,000 PoPs depending on provider
- **Latency**: 5-50ms (edge) vs 150-500ms (cross-continent origin)
- **Cache Hit Rate**: 85-95% for static content
- **Cost**: $0.085/GB (CloudFront) vs $0.09/GB (origin bandwidth)

**Q2: How does a CDN scale to serve 1 billion users globally?**

**A**: Multi-layered architecture with geographic distribution:

**Layer 1 - Global DNS (Anycast)**:
```
User queries cdn.example.com
├─ Anycast routing directs to nearest edge location
├─ Tokyo user → Tokyo PoP (10ms)
├─ London user → London PoP (8ms)
└─ Sydney user → Sydney PoP (12ms)
```

**Layer 2 - Edge PoPs (Tier 1)**:
```
Major cities, each handling 100+ Gbps:
- 300+ locations globally (Cloudflare)
- Each PoP: 10-50 servers
- Total capacity: 30+ Tbps globally
- Cache hot content (most popular 20%)
```

**Layer 3 - Regional PoPs (Tier 2)**:
```
Larger caching layer between edge and origin:
- 50 locations globally
- Each: 100-200 servers
- Aggregate requests from 10-20 edge PoPs
- Cache warm content (next 30%)
```

**Layer 4 - Origin Shield**:
```
Single caching layer in origin region:
- Consolidates misses from all regional PoPs
- Reduces origin requests by 80-90%
- Example: 1M edge requests → 50k shield requests → 5k origin requests
```

**Scaling Example** (YouTube scale):
```
Daily video views: 5 billion
Average video size: 50 MB
Total data: 250 petabytes/day

Without CDN:
- All traffic hits origin data centers
- Need 30+ Gbps per data center
- Cost: ~$20M/month in bandwidth

With CDN (95% hit rate):
- 237.5 PB served from edge (5-50ms latency)
- 12.5 PB hits origin (only for cold content)
- Cost: ~$15M/month CDN + $1M origin = $16M total
- Savings: $4M/month + better performance
```

**Q3: What are the common failure modes of CDNs?**

**A**: Three major failure scenarios:

**Failure 1: Cache Stampede After Invalidation**
- **Symptom**: Invalidate popular content, 100k edge locations simultaneously request from origin, origin overwhelmed
- **Cause**: Deployed new version, invalidated `/*` wildcard, all edges lost cache
- **Impact**: Origin CPU 100%, 10-second response times, cascading failures
- **Solution**:
  ```javascript
  // Gradual rollout with versioned assets (no invalidation needed)
  Old: /static/main.js → Cache forever
  New: /static/main.v2.js → Different URL, no cache conflict

  // Or selective invalidation
  Invalidate: ['/index.html', '/asset-manifest.json']  // Entry points only
  Don't invalidate: ['/static/*']  // Versioned files expire naturally
  ```

**Failure 2: Cache Poisoning / Bad Content Cached**
- **Symptom**: Error page (500) cached at edge, served to all users for next hour
- **Cause**: Origin returned 500 error, CDN cached it with standard TTL
- **Impact**: All users see error page even after origin recovered
- **Solution**:
  ```nginx
  # Origin server - don't cache error responses
  location / {
    proxy_pass http://backend;

    # Only cache successful responses
    proxy_cache_valid 200 1h;
    proxy_cache_valid 404 5m;
    proxy_cache_valid 500 502 503 0s;  # Never cache errors
  }
  ```

**Failure 3: Origin Shield Failure (Single Point)**
- **Symptom**: Origin shield crashes, 500k req/sec hits origin directly, origin down
- **Cause**: All regional PoPs route through single shield, shield becomes SPOF
- **Impact**: Origin overwhelmed, entire service down
- **Solution**:
  ```
  Multi-region origin shields:
  ├─ US East shield (handles US/Europe requests)
  ├─ US West shield (handles West/Asia requests)
  └─ Asia shield (handles Asia/Pacific requests)

  If shield fails: Regional PoPs bypass shield, hit origin directly (degraded but functional)
  ```

**Q4: CDN vs Caching vs Reverse Proxy - when to use each?**

**A**:

| Aspect | CDN | Application Cache (Redis) | Reverse Proxy (Nginx) |
|--------|-----|---------------------------|------------------------|
| **Location** | Global edge locations | Same datacenter as app | Same datacenter as app |
| **Latency** | 5-50ms (edge to user) | 1-5ms (app to cache) | 5-10ms (load balancer) |
| **Content** | Static (images, videos, CSS/JS) | Dynamic (user data, API responses) | Any (static + dynamic) |
| **Hit Rate** | 85-95% (static content) | 80-95% (hot data) | 60-80% (mixed) |
| **Cost** | $0.085/GB | $489/month (3-node cluster) | Included (self-hosted) |
| **Use Case** | Global users, media-heavy | Read-heavy APIs, sessions | Single region, SSL termination |
| **Example** | Netflix video delivery | Reddit API responses | Nginx before app servers |

**When to use each**:

**CDN**: Global users, static content heavy
```
cdn.example.com/images/* → CloudFront → S3 (origin)
Latency: 15ms (vs 250ms direct S3)
```

**Application Cache**: Same-region API, dynamic data
```
app.example.com/api/user/123 → Redis → Database
Latency: 2ms (vs 50ms database)
```

**Reverse Proxy**: Single-region, SSL termination, load balancing
```
example.com → Nginx → [App Server 1, App Server 2, App Server 3]
Caches responses, distributes load
```

**Best practice**: Use all three together
```
User (Tokyo)
   ↓ 15ms
CDN (Tokyo PoP) → serves /images/*, /static/*
   ↓ 20ms (on CDN miss)
Nginx (us-east-1) → SSL termination, load balance
   ↓ 5ms
App Server → checks Redis cache
   ↓ 2ms (cache hit) OR 50ms (cache miss to DB)
Redis / Database
```

**Q5: How would you design CDN caching strategy for an e-commerce site with 50 million products?**

**A**:

**Requirements**:
- 50M products × 5 images × 100 KB = 25 TB total images
- 10M daily users × 20 page views = 200M requests/day = 2,300 req/sec
- Products updated occasionally (prices change, inventory updates)
- Need: Fresh data, fast loads, low cost

**Solution - Tiered Caching Strategy**:

**Tier 1 - CDN Edge (CloudFront)**:
```javascript
// Product images - immutable, cache forever
Cache-Control: public, max-age=31536000, immutable
Path: /images/products/{sku}/{hash}.jpg
TTL: 1 year (hash changes when image changes)
Hit rate: 98% (popular products cached at edge)
```

**Tier 2 - Product Data API - Short TTL + stale-while-revalidate**:
```javascript
// Product details (price, inventory)
app.get('/api/products/:id', (req, res) => {
  res.set({
    // Cache for 5 minutes, serve stale for 1 hour while revalidating
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'ETag': `"${product.version}"`
  });
  res.json(product);
});

// Benefit: Users see data within 5 min of update, but CDN can serve stale
// during origin issues without users seeing errors
```

**Tier 3 - HTML Pages - No CDN cache (or very short)**:
```javascript
// Product detail pages (HTML)
Cache-Control: no-cache  // Or max-age=60
// Why: Contains dynamic data (recommendations, user-specific)
// Let browser cache, but not CDN
```

**Cache Key Strategy**:
```
Images: /images/products/{sku}/primary_{hash}.jpg
- Hash changes → new URL → no invalidation needed
- Old versions expire naturally

CSS/JS: /static/css/main.{hash}.css
- Versioned builds, cache forever

Product API: /api/products/{id}
- Short TTL, invalidate on update
```

**Cache Invalidation Strategy**:
```python
# When product updated
async def update_product(product_id, updates):
    # Update database
    await db.update('products', product_id, updates)

    # Option 1: Invalidate CDN (if using long TTL)
    cdn.invalidate_paths([f'/api/products/{product_id}'])

    # Option 2: Let short TTL handle it (5 min max staleness)
    # No invalidation needed if TTL=300
```

**Cost Analysis** (10M daily users, 200M requests/day):
```
Static images: 150M requests/day (75%)
├─ CloudFront cost: 150M × 0.1KB (headers) = 14 GB = $1.19/day
├─ Origin bandwidth savings: 150M × 100KB would be 15 TB = $1,350/day saved
└─ Net savings: $1,348/day = $40,440/month

API requests: 50M requests/day (25%)
├─ CloudFront cost: 50M × 1KB = 50 GB = $4.25/day
├─ Hit rate: 80% (5 min TTL, popular products hit frequently)
└─ Origin requests: 10M/day (20% misses)

Total cost:
- CloudFront: ~$165/month
- Origin bandwidth: $150/month (down from $40,590 without CDN)
- Savings: $40,275/month
```

**Performance**:
```
Without CDN:
- Global users: 200-500ms average latency
- Origin load: 2,300 req/sec

With CDN:
- Global users: 15-50ms average latency (10x faster)
- Origin load: 230 req/sec (10x reduction)
- Cache hit rate: 90% overall (98% images, 80% API)
```

---

## Tools & Technologies

### Industry Standard Solutions

| Provider | PoPs | Performance | Cost | Features |
|----------|------|-------------|------|----------|
| **Cloudflare** | 300+ cities | 10-50ms P95 | Free tier + $20/mo | DDoS protection, WAF, edge workers |
| **AWS CloudFront** | 450+ locations | 15-50ms P95 | $0.085/GB | Origin Shield, Lambda@Edge, S3 integration |
| **Akamai** | 4,000+ servers | 5-30ms P95 | Enterprise pricing | Most PoPs, media delivery, security |
| **Fastly** | 70+ PoPs | 10-40ms P95 | $0.12/GB | Real-time purge (<150ms), VCL customization |
| **Google Cloud CDN** | 140+ locations | 20-60ms P95 | $0.08/GB | GCP integration, HTTP/3, Anycast |
| **Azure CDN** | 120+ PoPs | 20-50ms P95 | $0.081/GB | Azure integration, Standard/Premium tiers |
| **Bunny CDN** | 100+ zones | 20-50ms P95 | $0.01/GB | Cheapest, good for startups, perma-cache |

### Cloud Provider Solutions

**AWS CloudFront**:
- **Edge Locations**: 450+ (275 cities in 90+ countries)
- **Features**: Origin Shield, Lambda@Edge, CloudFront Functions, field-level encryption
- **Pricing**: $0.085/GB (first 10 TB), $0.005 per invalidation path
- **Use Case**: S3 origin, AWS-heavy architecture

**GCP Cloud CDN**:
- **Edge Locations**: 140+ (Google's global network)
- **Features**: Anycast IPs, HTTP/3, signed URLs, negative caching
- **Pricing**: $0.08/GB (first 10 TB)
- **Use Case**: GCP native, YouTube-style video delivery

**Azure CDN**:
- **Edge Locations**: 120+ PoPs
- **Features**: Standard (Akamai/Verizon), Premium (Akamai), dynamic site acceleration
- **Pricing**: $0.081/GB (standard tier)
- **Use Case**: Azure-native applications

**Cloudflare**:
- **Edge Locations**: 300+ cities
- **Features**: Free tier, DDoS protection, WAF, edge workers (serverless), Argo Smart Routing
- **Pricing**: Free (limited) → $20/mo (Pro) → $200/mo (Business) → Enterprise
- **Use Case**: Best for startups, security-focused, developer-friendly

---

## Best Practices

### Do's ✅

- **Use Content-Addressed Assets (Hash in Filename)**: Enables cache forever without invalidation

```javascript
// Good: Hash in filename
/static/js/main.a3f2b1c4.js  → Cache-Control: max-age=31536000, immutable

// When content changes, filename changes automatically
/static/js/main.d5e6f7g8.js  → New URL, no cache conflict

// Bad: No versioning
/static/js/main.js → Cache-Control: max-age=86400
// Problem: Must invalidate on every deploy
```

**Why**: Immutable assets can be cached forever (1 year) at CDN and browser. No invalidation needed. Webpack/Vite handle this automatically.

- **Enable Origin Shield**: Reduces origin requests by 50-80%

```hcl
# CloudFront origin shield
origin_shield {
  enabled              = true
  origin_shield_region = "us-east-1"  # Same region as origin
}
```

**Impact**: Without shield: 1,000 edge locations × 100 misses = 100,000 origin requests. With shield: 1,000 edges → 1 shield → 5,000 origin requests (95% reduction).

- **Use stale-while-revalidate**: Serve stale content immediately while fetching fresh content

```javascript
// Serve cached content for 5 min, but allow stale for 1 hour
Cache-Control: max-age=300, stale-while-revalidate=3600

// Behavior:
// - 0-5 min: Serve from cache (fresh)
// - 5-60 min: Serve from cache (stale), fetch new version in background
// - 60+ min: Must fetch from origin (blocking)
```

**Benefit**: Users never wait for origin during revalidation. Always fast response.

- **Monitor Cache Hit Ratio**: Target 85-95% for static content

```javascript
// CloudWatch metrics
CacheHitRate = BytesDownloaded / (BytesDownloaded + BytesUploaded)

// Alert if hit rate < 85%
if (cacheHitRate < 0.85) {
  alert('Low CDN cache hit rate - investigate cache headers');
}
```

- **Use Separate Distributions for Static vs Dynamic**: Different caching strategies

```hcl
# Distribution 1: Static assets (images, CSS, JS)
resource "aws_cloudfront_distribution" "static" {
  # Long TTL, aggressive caching
  default_ttl = 86400  # 1 day
}

# Distribution 2: API / dynamic content
resource "aws_cloudfront_distribution" "api" {
  # Short TTL or no caching
  default_ttl = 0  # Don't cache by default
}
```

### Don'ts ❌

- **Don't Use Wildcard Invalidation Frequently**: Causes cache stampede and costs add up

```python
# Bad: Invalidate everything on every deploy
cdn.invalidate_paths(['/*'])  # Clears entire CDN cache!
# Result: All edges miss cache, overwhelm origin

# Good: Selective invalidation
cdn.invalidate_paths([
  '/index.html',
  '/asset-manifest.json'
])  # Only entry points
```

**Cost**: Wildcard `/*` costs $0.005 (cheap) but causes 1,000+ edge locations to hit origin simultaneously (expensive in origin load).

- **Don't Cache Personalized Content**: User-specific data should not be in shared CDN cache

```javascript
// Bad: Caching user-specific API response
app.get('/api/user/profile', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');  // WRONG!
  res.json({ name: 'John', email: 'john@example.com' });
});
// Problem: CDN caches John's data, serves it to other users!

// Good: Mark as private or no-cache
app.get('/api/user/profile', (req, res) => {
  res.set('Cache-Control', 'private, max-age=300');  // Only browser caches
  res.json({ name: 'John', email: 'john@example.com' });
});
```

- **Don't Set Long TTL Without Versioning**: Causes stale content issues

```html
<!-- Bad: Long TTL without versioning -->
<link rel="stylesheet" href="/styles.css">
<!-- Cache-Control: max-age=86400 (1 day) -->
<!-- Problem: Deploy new CSS, users see old version for 24 hours -->

<!-- Good: Content-addressed assets -->
<link rel="stylesheet" href="/styles.a3f2b1.css">
<!-- Cache-Control: max-age=31536000, immutable -->
<!-- New deploy: /styles.d5e6f7.css → automatic cache bust -->
```

- **Don't Ignore Vary Header**: Can cause incorrect caching

```javascript
// Bad: Serving different content based on Accept-Encoding, but not setting Vary
app.get('/api/data', (req, res) => {
  if (req.get('Accept-Encoding').includes('gzip')) {
    res.send(gzippedData);  // Compressed
  } else {
    res.send(plainData);  // Uncompressed
  }
  // Missing Vary header!
});
// Problem: CDN caches gzipped version, serves to non-gzip clients (corrupted)

// Good: Set Vary header
app.get('/api/data', (req, res) => {
  res.set('Vary', 'Accept-Encoding');  // Cache separate versions
  // ...
});
```

- **Don't Cache Error Responses**: 500 errors cached = all users see errors

```nginx
# Good: Never cache error responses
proxy_cache_valid 200 302 1h;
proxy_cache_valid 404 5m;
proxy_cache_valid 500 502 503 504 0s;  # Never cache errors
```

### Monitoring & Observability

**Key Metrics**:
- **Cache Hit Rate**: > 85% (static content), > 60% (overall)
- **Origin Requests**: < 15% of total traffic (85%+ from cache)
- **Latency**: P95 < 50ms (edge), < 200ms (origin on miss)
- **4xx/5xx Error Rate**: < 1%
- **Bandwidth Savings**: Origin bandwidth < 20% of total (80% served from edge)

**Alerting**:
```
Critical (page on-call):
- Cache hit rate < 50% for 30 minutes (likely cache invalidated)
- 5xx error rate > 5%
- CDN distribution disabled/misconfigured

Warning (Slack/email):
- Cache hit rate < 85% for 1 hour
- Origin latency > 500ms (P95)
- Invalidation count > 1000/day
```

**Debugging**:
```bash
# Check which edge location served request
curl -I https://cdn.example.com/image.jpg
# Response headers:
# X-Cache: Hit from cloudfront
# X-Amz-Cf-Pop: LAX50-C1  # Los Angeles edge location

# Check cache status
# X-Cache: Miss from cloudfront  → Fetched from origin
# X-Cache: Hit from cloudfront   → Served from edge
# X-Cache: RefreshHit from cloudfront → Revalidated, still fresh

# Bypass CDN to test origin
curl -H "Cache-Control: no-cache" https://origin.example.com/image.jpg
```

---

## Common Failure Modes

### Failure 1: Cache Stampede After Full Invalidation

**Symptom**: Deployed new app version, invalidated `/*`, suddenly 500k requests/sec hit origin, origin CPU 100%, database connection pool exhausted, site down for 30 minutes

**Cause**:
- Invalidated entire CDN cache (`/*`) during deployment
- 1,000 edge locations simultaneously lost all cached content
- Next user request at each edge = cache miss → all edges hit origin at once
- Origin designed for 5k req/sec, suddenly receiving 500k req/sec

**Solution**:

**Immediate** (during incident):
```bash
# Reduce origin load by temporarily returning 503 with Retry-After
# This tells CDN to retry in 60 seconds, spreading the load
nginx.conf:
location / {
  return 503;
  add_header Retry-After 60;
}
```

**Short-term** (after recovery):
```javascript
// Use versioned assets instead of invalidation
const ASSET_VERSION = 'v2.3.1';

// Old URL: /static/main.js → Cache forever
// New URL: /static/v2.3.1/main.js → Different URL, no conflict

// Only invalidate entry points
cdn.invalidate_paths([
  '/index.html',  // Points to new versioned assets
  '/asset-manifest.json'
]);
```

**Long-term** (prevention):
```javascript
// Gradual cache warm-up after invalidation
async function warmCache(urls) {
  const edgeLocations = cdn.getEdgeLocations();  // 1,000 PoPs

  // Warm 10 PoPs at a time (gradual)
  for (let i = 0; i < edgeLocations.length; i += 10) {
    const batch = edgeLocations.slice(i, i + 10);

    // Request from each PoP to cache content
    await Promise.all(batch.map(pop =>
      fetch(`https://${pop}/warm`, {
        method: 'POST',
        body: JSON.stringify(urls)
      })
    ));

    await sleep(1000);  // Wait 1 second between batches
  }
}
```

### Failure 2: Serving Stale Content After Update

**Symptom**: Deployed critical security fix at 10:00 AM, users still see vulnerable version at 2:00 PM (4 hours later), potential security breach

**Cause**:
- Cached vulnerable content with `Cache-Control: max-age=14400` (4 hours)
- Deployed fix but didn't invalidate CDN cache
- CDN continues serving cached (vulnerable) version until TTL expires
- Users remain vulnerable for 4 hours

**Solution**:

**Immediate**:
```python
# Emergency: Invalidate affected paths immediately
cdn.invalidate_paths([
  '/*',  # Nuclear option for critical security issues only
])

# Monitor invalidation progress
while True:
  status = cdn.get_invalidation_status(invalidation_id)
  if status == 'Completed':
    break
  print(f"Invalidation: {status} (5-15 minutes)")
  time.sleep(30)
```

**Short-term**:
```javascript
// Reduce TTL for security-sensitive content
app.get('/api/auth/*', (req, res) => {
  // Short TTL for auth-related endpoints
  res.set('Cache-Control', 'private, max-age=300');  // 5 minutes max
});

// Longer TTL for static assets (versioned)
app.get('/static/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
});
```

**Long-term** (prevention):
```javascript
// Automated invalidation in deployment pipeline
// .github/workflows/deploy.yml
- name: Deploy to production
  run: npm run build && aws s3 sync build/ s3://my-bucket

- name: Invalidate CDN
  run: |
    aws cloudfront create-invalidation \
      --distribution-id E1234567890ABC \
      --paths "/index.html" "/asset-manifest.json"

- name: Wait for invalidation
  run: |
    aws cloudfront wait invalidation-completed \
      --distribution-id E1234567890ABC \
      --id $INVALIDATION_ID
```

### Failure 3: Origin Shield as Single Point of Failure

**Symptom**: Origin shield in us-east-1 crashes, all 1,000 edge locations bypass shield and hit origin directly, origin receives 500k req/sec (was 5k req/sec), database overwhelmed, entire site down

**Cause**:
- Single origin shield consolidates requests from all edge locations
- Shield crashes (hardware failure, network issue, region outage)
- No fallback strategy - all edges hit origin simultaneously
- Origin designed for 5k req/sec (shield was absorbing 99% of load)

**Solution**:

**Immediate**:
```bash
# Emergency: Disable shield temporarily to stabilize
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --distribution-config '{
    "OriginShield": { "Enabled": false }
  }'

# Scale origin temporarily
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name origin-asg \
  --desired-capacity 50  # Up from 5
```

**Short-term**:
```hcl
# Configure multi-region shield
resource "aws_cloudfront_distribution" "main" {
  origin {
    # Primary shield (us-east-1)
    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"
    }
  }
}

# Fallback: Configure origin to handle spike
resource "aws_autoscaling_group" "origin" {
  min_size = 5
  max_size = 100  # Can scale to 100 if shield fails

  # Aggressive scaling policy
  target_tracking_scaling_policy {
    target_value = 50  # Scale at 50% CPU (was 70%)
  }
}
```

**Long-term** (prevention):
```hcl
# Use regional distributions with separate shields
resource "aws_cloudfront_distribution" "us_europe" {
  # US and Europe traffic
  origin {
    domain_name = "us-origin.example.com"

    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"
    }
  }
}

resource "aws_cloudfront_distribution" "asia_pacific" {
  # Asia Pacific traffic
  origin {
    domain_name = "asia-origin.example.com"

    origin_shield {
      enabled              = true
      origin_shield_region = "ap-southeast-1"
    }
  }
}

# If shield fails, only affects half the traffic
```

---

## Summary

### Key Takeaways

- **Core Concept**: Globally distributed caching network serving content from edge locations near users, reducing latency from 150-500ms to 5-50ms
- **When to Use**: Global user base across continents, static content (images/video) accounts for 70-90% of traffic, need to reduce origin bandwidth by 80-95%
- **Scaling Strategy**: 200-4,000 PoPs globally, 85-95% cache hit rate, Origin Shield reduces origin requests by 80-90%, handle 100+ Tbps globally
- **Main Trade-off**: Higher per-GB cost ($0.085 vs $0.01) but massive origin bandwidth savings (90% reduction) and better performance (10x faster)

### Related Patterns

- **Load Balancer**: CDN routes to nearest edge, load balancer distributes across origin servers
- **Cache (Application)**: CDN caches at edge (global), Redis caches in datacenter (application-level)
- **Object Storage (S3)**: CDN sits in front of S3 as origin, caches objects at edge
- **Reverse Proxy**: Nginx can function as micro-CDN (single region), CloudFront is global CDN

### Interview Checklist

- [ ] Can explain in 2 minutes: "Global network of caching servers, serve content from nearest location"
- [ ] Can draw architecture diagram: User → Edge PoP → Origin Shield → Origin Server
- [ ] Know 2-3 real examples: Netflix (Open Connect, 17k servers), YouTube (1B hours/day), Cloudflare (20M sites)
- [ ] Understand failure modes: Cache stampede after invalidation, stale content, origin shield SPOF
- [ ] Can compare with alternatives: CDN vs Redis cache vs reverse proxy (when to use each)
- [ ] Know scaling with numbers: 1,000 PoPs, 95% hit rate, 500k req/sec → 25k origin requests
- [ ] Understand cache headers: Cache-Control (max-age, s-maxage, immutable), Vary, ETag
- [ ] Can explain invalidation: CloudFront takes 5-15 min, $0.005/path, wildcard `/*`
- [ ] Know cost implications: $0.085/GB CloudFront saves $0.08/GB in origin bandwidth
- [ ] Understand TTL strategy: Immutable (1 year), Static (1 day), Dynamic (5 min), HTML (no-cache)

---

[← Back to SystemDesign](../README.md)
