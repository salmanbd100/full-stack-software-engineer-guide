# Route 53 (DNS)

AWS's scalable DNS service and domain registrar — routes internet traffic to your AWS resources.

## What Route 53 Does

Route 53 translates domain names into IP addresses. When a user types `api.example.com`, Route 53 responds with the IP of your load balancer, EC2 instance, or CloudFront distribution. It also monitors your endpoints with health checks and can reroute traffic automatically on failure.

> Route 53 is not just DNS. It is a **traffic management layer** — routing policies turn it into a load balancer, failover system, and geo-router all in one.

## DNS Record Types

| Record | Purpose | Example |
|--------|---------|---------|
| **A** | Maps domain → IPv4 address | `api.example.com → 1.2.3.4` |
| **AAAA** | Maps domain → IPv6 address | `api.example.com → 2001:db8::1` |
| **CNAME** | Maps domain → another domain name | `www.example.com → example.com` |
| **Alias** | AWS extension — maps domain → AWS resource | `example.com → my-alb.us-east-1.elb.amazonaws.com` |
| **MX** | Mail exchange — routes email | `example.com → mail.example.com` |
| **TXT** | Stores text — domain verification, SPF | `"v=spf1 include:sendgrid.net ~all"` |
| **NS** | Name server — delegates DNS zone | Points to Route 53 name servers |

## Alias vs CNAME

This is a **top interview topic**. Know the difference cold.

| Feature | CNAME | Alias |
|---------|-------|-------|
| **Points to** | Any hostname | AWS resource only |
| **Zone apex (root domain)** | ❌ Not allowed | ✅ Allowed |
| **Query cost** | Charged per query | Free for AWS targets |
| **TTL** | You set it | Managed by Route 53 |
| **Health check** | No | Yes (for some targets) |
| **Example target** | `app.example.net` | ALB, CloudFront, S3, API GW |

**Zone apex** means the root domain — `example.com` without any subdomain. DNS rules forbid a CNAME at the zone apex. Alias is AWS's solution to this.

✅ Use Alias when pointing to an AWS resource — it's free and works at root domain.  
✅ Use CNAME when pointing to a non-AWS hostname (like a third-party SaaS).  
❌ Never use CNAME for `example.com` directly — it will break.

## Routing Policies

Routing policies are the most important part of Route 53 for interviews.

| Policy | How It Works | Best For |
|--------|-------------|---------|
| **Simple** | One record, one or more values, no health checks | Single resource, basic setup |
| **Weighted** | Split traffic by percentage across multiple records | A/B testing, gradual migration |
| **Latency** | Route to the region with the lowest latency for the user | Multi-region apps |
| **Failover** | Primary active, secondary passive — switches on health check failure | High availability, disaster recovery |
| **Geolocation** | Route based on user's country or continent | Compliance, localization |
| **Geoproximity** | Route based on distance, with optional bias to shift traffic | Traffic shaping by geography |
| **Multivalue** | Returns up to 8 healthy records at random | Simple load balancing with health checks |

### Policy Deep Dive

**Weighted:**
```
api.example.com → Server A (weight 80)   ← 80% of traffic
api.example.com → Server B (weight 20)   ← 20% of traffic
```
Set weight to 0 to stop traffic to a record completely.

**Failover:**
```
Primary record  (active)  ← Route 53 sends traffic here
    ↓  health check fails
Secondary record (passive) ← Route 53 switches here automatically
```
Requires health checks on the primary record.

**Latency:**
- Route 53 measures latency from the user to each AWS region.
- Routes to the region with the lowest latency — not necessarily the closest geographically.

**Geolocation vs Geoproximity:**
- Geolocation: exact match — this country/continent gets this record.
- Geoproximity: distance-based with a **bias** you control. Increase bias to pull more traffic toward a region.

### Routing Policy Decision Guide

| Scenario | Policy to Use |
|----------|--------------|
| Blue/green deployment | Weighted (shift 0→100 gradually) |
| Disaster recovery (active/passive) | Failover |
| Lowest latency for global users | Latency |
| GDPR — EU users must hit EU servers | Geolocation |
| One app, one region | Simple |
| Multi-region with health-aware round robin | Multivalue |

## Health Checks

Health checks monitor your endpoints. Route 53 sends requests to your endpoint every 10–30 seconds.

```
Route 53 health checker → HTTP GET /health → expects 2xx response
                        → fails 3 times in a row → marks endpoint unhealthy
                        → Failover policy activates secondary record
```

**Three types:**
- **Endpoint** — monitors an IP or domain name directly
- **Calculated** — combines multiple health checks (AND/OR logic)
- **CloudWatch alarm** — triggers on a metric (useful for private resources)

⚠️ Health checks originate from **multiple AWS regions**. Make sure your security group allows inbound traffic from Route 53 health check IP ranges.

✅ Attach health checks to Failover, Weighted, Latency, and Multivalue policies to auto-remove unhealthy endpoints.

## Hosted Zones

A hosted zone is a container for DNS records for a domain.

| Type | Scope | Use Case |
|------|-------|---------|
| **Public hosted zone** | Internet-facing | `api.example.com` for public users |
| **Private hosted zone** | Within a VPC | `api.internal` for internal services |

Private hosted zones enable **service discovery** inside your VPC. One microservice can reach another at `payments.internal` without exposing anything to the internet.

```bash
# Create a private hosted zone (VPC-only DNS)
aws route53 create-hosted-zone \
  --name internal.example.com \
  --caller-reference "$(date +%s)" \
  --hosted-zone-config PrivateZone=true \
  --vpc VPCRegion=us-east-1,VPCId=vpc-abc12345
```

## Key CLI Commands

```bash
# Create a public hosted zone
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "$(date +%s)"

# List all hosted zones
aws route53 list-hosted-zones

# List records in a hosted zone
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234ABCDEF

# Create or update a DNS record (upsert)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234ABCDEF \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'
```

⚠️ DNS changes are not instant. TTL determines how long resolvers cache the old value. Lower TTL before a migration so traffic cuts over faster.

## Interview Q&A

**Q: Alias vs CNAME — when do you use each?**

Use Alias when pointing to an AWS resource (ALB, CloudFront, S3, API Gateway). It works at the zone apex (root domain like `example.com`), costs nothing per query, and supports health checks. Use CNAME when pointing to a non-AWS hostname. Never use CNAME at the root domain — DNS forbids it.

---

**Q: How do you do a blue/green deployment at the DNS level?**

Use the **Weighted routing policy**. Create two records for the same domain — one pointing to the blue environment (weight 100) and one to green (weight 0). Deploy and validate green. Then gradually shift: blue 90 / green 10, then 50/50, then 0/100. Set a low TTL (30–60 seconds) before the shift so traffic moves quickly. To roll back, flip the weights back.

---

**Q: How does Route 53 failover work?**

You create two records: a Primary (active) and a Secondary (passive) with the Failover routing policy. Route 53 runs a health check on the primary endpoint. If the primary fails three consecutive checks, Route 53 stops returning the primary record and starts returning the secondary. When the primary recovers, Route 53 switches back automatically. This gives you automatic DNS-level failover with no manual intervention.

---

**Q: Which routing policy do you use for multi-region latency optimization?**

The **Latency routing policy**. You deploy your app in multiple AWS regions and create one latency record per region pointing to that region's load balancer. Route 53 measures the latency from the user's location to each region and responds with the record for the lowest-latency region. It does not use physical distance — it measures actual network latency.

---

**Q: What is the difference between public and private hosted zones?**

A public hosted zone is accessible from the internet. Anyone querying DNS can resolve records in it — used for customer-facing domains. A private hosted zone is only resolvable from within one or more VPCs you associate it with. It is invisible to the public internet. Use private zones for internal service-to-service communication (for example, `payments.internal` resolving to a private IP), which avoids exposing internal endpoints publicly.

---

[← DynamoDB](./10-dynamodb.md) | [CloudFront →](./12-cloudfront.md)
