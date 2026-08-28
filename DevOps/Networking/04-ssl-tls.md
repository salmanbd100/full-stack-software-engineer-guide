---
title: SSL/TLS & Certificate Management
part: 8
chapter: 0
slug: ssl-tls
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-08-03
tags: [devops, networking, ssl, tls]
in_book: false
---

# SSL/TLS & Certificate Management

Expired certificates cause outages with dull regularity. This file covers how TLS works, how ACM removes most of the risk, and what to do when ACM cannot help.

## What TLS Actually Provides

| Property | Meaning |
|----------|---------|
| **Encryption** | Nobody in the middle can read the traffic |
| **Authentication** | The client verifies the server is who it claims |
| **Integrity** | Tampering is detectable |

⚠️ **Encryption without authentication is nearly worthless.** A self-signed certificate encrypts fine, but the client cannot tell your server from an attacker's — which is exactly what the certificate authority system exists to solve.

## The Handshake

```
Client                                    Server
  │── ClientHello ────────────────────────►│  supported ciphers, SNI hostname
  │◄─ ServerHello + Certificate ───────────│  chosen cipher, cert chain
  │   verify chain against trust store      │
  │── key exchange ───────────────────────►│
  │◄═══ encrypted application data ═══════►│
```

| Version | Round Trips | Status |
|---------|------------|--------|
| TLS 1.0 / 1.1 | 2 | 🔴 Deprecated, fails PCI DSS |
| TLS 1.2 | 2 | ✅ Minimum acceptable |
| TLS 1.3 | ✅ 1 | ✅ Preferred — faster and simpler |

✅ **TLS 1.3 halves handshake latency**, which is significant for mobile clients on high-latency connections.

**SNI (Server Name Indication)** — the client sends the hostname *before* encryption starts, so one IP can serve many certificates. This is what lets an ALB host multiple domains on one listener.

## The Certificate Chain

```
Root CA               (in the client's trust store — self-signed)
   │ signs
Intermediate CA       (🔴 the server MUST send this)
   │ signs
Leaf certificate      (yours: acme.com)
```

🔴 **The most common TLS misconfiguration is a missing intermediate certificate.** It works in browsers, which cache intermediates from previous sites, and fails in `curl`, Java clients, and mobile apps — which is why it reaches production undetected.

```bash
# Verify the chain the server actually sends
openssl s_client -connect acme.com:443 -servername acme.com -showcerts

# ✅ "Verify return code: 0 (ok)" is what you want
# 🔴 "unable to get local issuer certificate" = missing intermediate
```

## AWS Certificate Manager

✅ **ACM is the answer to almost every certificate question on AWS**, because it removes the failure mode entirely.

| | ACM | Self-managed |
|---|---|---|
| **Cost** | ✅ Free for AWS services | Purchase or Let's Encrypt |
| **Renewal** | ✅ Fully automatic | Your cron job, your problem |
| **Private key** | ✅ Never exportable | You handle it |
| **Chain assembly** | ✅ Automatic | You get it wrong |
| **Works with** | ALB, NLB, CloudFront, API Gateway | Anything |
| **On EC2** | 🔴 Not possible | Required |

🔴 **ACM certificates cannot be installed on EC2 instances.** The private key is not exportable by design. If you terminate TLS on an instance, you need Let's Encrypt or a purchased certificate — or better, terminate at the load balancer.

```hcl
resource "aws_acm_certificate" "main" {
  domain_name       = "acme.com"
  validation_method = "DNS"          # ✅ DNS, not EMAIL

  subject_alternative_names = [
    "www.acme.com",
    "*.api.acme.com",   # wildcard covers one level only
  ]

  lifecycle {
    create_before_destroy = true     # ✅ no gap during replacement
  }
}

# DNS validation records — automatic renewal depends on these staying in place
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.validation : r.fqdn]
}
```

🔴 **Use DNS validation, never email.** With DNS validation the record stays in place and ACM renews automatically forever. Email validation requires a human to click a link every renewal — which is a scheduled outage waiting to happen.

⚠️ **If you delete the validation CNAME after issuance, automatic renewal silently fails.** The certificate works until it expires, then you have an outage with no warning. Keep the records in Terraform.

**Region rules that catch people out:**

| Service | Certificate must be in |
|---------|----------------------|
| ALB / NLB | The same region as the load balancer |
| 🔴 **CloudFront** | **us-east-1**, always |
| API Gateway (edge-optimised) | us-east-1 |
| API Gateway (regional) | The API's region |

```hcl
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# CloudFront certificates must live in us-east-1 regardless of your region
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = "cdn.acme.com"
  validation_method = "DNS"
}
```

**Wildcard scope** — a frequent misunderstanding:

```
*.acme.com  covers  api.acme.com      ✅
                    www.acme.com      ✅
                    acme.com          🔴 NO — the apex is not covered
                    a.b.acme.com      🔴 NO — only one level
```

✅ Always add the apex domain as a subject alternative name alongside the wildcard.

## Where to Terminate TLS

```
Option A — terminate at the edge (most common)
Client ══TLS══► ALB ──plain HTTP──► backend
              (inside the VPC)

Option B — re-encrypt (compliance)
Client ══TLS══► ALB ══TLS══► backend

Option C — passthrough
Client ══════════TLS═════════════► backend   (NLB, TCP mode)
```

| Option | Pros | Cons |
|--------|------|------|
| **A: Edge termination** | ✅ Simple, ACM handles everything, ALB can route on HTTP | Unencrypted inside the VPC |
| **B: Re-encrypt** | ✅ Encrypted end to end, layer 7 routing retained | Two handshakes, backend certs to manage |
| **C: Passthrough** | ✅ Backend sees the real TLS session; mTLS possible | 🔴 No layer 7 routing, no WAF |

✅ **Option A is right for most workloads.** VPC traffic is on isolated infrastructure and AWS encrypts between availability zones at the physical layer.

✅ **Option B when a compliance framework requires encryption in transit everywhere.** The backend certificate can be self-signed, because the ALB does not validate it — a detail that surprises people.

## HTTPS Enforcement

```hcl
# Redirect all HTTP to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  # ✅ TLS 1.2 minimum; use the TLS13 policy where clients allow
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn
}
```

**HSTS** — tell browsers never to use HTTP again:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

⚠️ HSTS is hard to undo. Once a browser has cached the header, it refuses plain HTTP for `max-age` seconds. Start with a short `max-age` and increase it once you are confident.

## Mutual TLS

Both sides present certificates. Used for service-to-service authentication and regulated APIs.

```hcl
resource "aws_lb_listener" "mtls" {
  protocol = "HTTPS"
  port     = 443

  mutual_authentication {
    mode            = "verify"
    trust_store_arn = aws_lb_trust_store.clients.arn
  }
}

resource "aws_lb_trust_store" "clients" {
  name                             = "partner-clients"
  ca_certificates_bundle_s3_bucket = aws_s3_bucket.ca.id
  ca_certificates_bundle_s3_key    = "client-ca-bundle.pem"
}
```

✅ ALB supports mTLS natively now, which previously required NLB passthrough plus application-level verification.

⚠️ mTLS means you operate a certificate authority and a revocation process. It is real operational weight — use it where it is required, not by default. Inside a cluster, a service mesh automates it.

## Monitoring Expiry

🔴 Even with ACM, monitor expiry. Renewal fails when the validation record is gone or DNS is misconfigured.

```hcl
resource "aws_cloudwatch_metric_alarm" "cert_expiry" {
  alarm_name          = "acm-cert-expiring"
  namespace           = "AWS/CertificateManager"
  metric_name         = "DaysToExpiry"
  statistic           = "Minimum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 21
  comparison_operator = "LessThanThreshold"
  alarm_actions       = [aws_sns_topic.warnings.arn]

  dimensions = {
    CertificateArn = aws_acm_certificate.main.arn
  }
}
```

✅ **21 days gives real time to act.** ACM attempts renewal at 60 days, so an alert at 21 means renewal has already failed repeatedly.

```bash
# External check — what clients actually see, including the chain
echo | openssl s_client -connect acme.com:443 -servername acme.com 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer
```

✨ A blackbox exporter probe or CloudWatch Synthetics canary checking TLS expiry from outside your network catches problems ACM metrics cannot — a load balancer serving an old certificate, or a certificate on an EC2 instance nobody remembered.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Email validation on ACM | Renewal needs a human; eventual outage | DNS validation |
| Deleting the validation CNAME | 🔴 Silent renewal failure | Keep it in Terraform |
| CloudFront certificate not in us-east-1 | Cannot attach it | Provider alias for us-east-1 |
| Wildcard without the apex | `acme.com` fails, `www` works | Add apex as a SAN |
| Missing intermediate certificate | Browsers fine, `curl` and Java fail | Let ACM assemble the chain |
| TLS 1.0/1.1 still enabled | Compliance failure | TLS 1.2 minimum policy |
| No expiry monitoring | Outage with no warning | Alarm at 21 days |
| Expecting to export an ACM key | Not possible | Terminate at the LB, or use Let's Encrypt |

## Interview Q&A

**Q: Why is a missing intermediate certificate such a common problem?**

Because it fails asymmetrically. A browser will often succeed anyway, since it has cached the intermediate from some other site that served it correctly, or it fetches it via the authority information access extension. So the person deploying tests in a browser, sees a padlock, and considers it done. Then non-browser clients fail: `curl`, Java HTTP clients, Go, mobile SDKs, and anything with a minimal trust store cannot build a path from your leaf certificate to a trusted root without the intermediate, and they reject the connection with an "unable to get local issuer certificate" error. The result is an outage that affects API consumers and mobile apps but not the website, which makes it confusing to diagnose. The way to verify properly is `openssl s_client -showcerts` and checking for verify return code 0, and the way to avoid it entirely on AWS is to let ACM assemble the chain.

**Q: Can you use an ACM certificate on an EC2 instance?**

No. ACM never exports the private key — that is a deliberate design decision and part of why it is safe — so there is no way to install the certificate on an instance you manage. ACM certificates can only be attached to integrated AWS services: ALB, NLB, CloudFront, API Gateway, and a few others. If you genuinely need TLS terminating on an instance, you use Let's Encrypt with something like certbot, or a purchased certificate, and you own the renewal automation. The better answer in most cases is not to terminate TLS on the instance at all: put a load balancer in front, terminate there with ACM, and let the instance serve plain HTTP inside the VPC, or re-encrypt to the backend with a self-signed certificate if a compliance rule requires encryption on the internal hop.

**Q: What is the trap with ACM automatic renewal?**

That it depends on the DNS validation record continuing to exist. People create the certificate, ACM issues it after the CNAME validates, and then someone tidies up the "temporary" validation record — or it was created manually in the console and never captured in Terraform, so a later state reconciliation removes it. The certificate keeps working for its full thirteen months, so nothing looks wrong. Then ACM tries to renew at sixty days out, cannot validate the domain, retries, and eventually the certificate expires and every client fails at once with no warning. The prevention is keeping the validation records in Terraform alongside the certificate so they are never orphaned, and monitoring the `DaysToExpiry` metric with an alarm at around twenty-one days, which is late enough to mean renewal has definitely failed and early enough to fix it calmly.

**Q: Where should TLS terminate?**

Usually at the load balancer, which is the simplest correct answer for most workloads: ACM manages the certificate and renewal entirely, and terminating at layer 7 lets the ALB route on path and host and apply a WAF. Traffic then travels unencrypted inside the VPC, which is acceptable for most threat models given the VPC is isolated and AWS encrypts inter-AZ traffic at the physical layer. Where a compliance framework demands encryption in transit everywhere, you re-encrypt from the load balancer to the backend — and a useful detail is that the backend certificate can be self-signed, because the ALB does not validate it. Full passthrough, where TLS terminates on the backend, is necessary when the application must see the original TLS session, for example to do its own mutual TLS, but it costs you all layer 7 features including path routing and WAF inspection.

**Q: What does a wildcard certificate actually cover?**

Exactly one label, and not the apex. A certificate for `*.acme.com` covers `api.acme.com` and `www.acme.com`, but it does not cover `acme.com` itself, and it does not cover `a.b.acme.com` because that is two levels deep. Both of those catch people out. The apex omission is the more damaging one in practice, because the site works at `www` and fails at the bare domain, which is often the address people actually type. The fix is to include the apex as a subject alternative name on the same certificate, which ACM supports at no extra cost. For deeper subdomains you need either an additional wildcard for that level or explicit SANs. ACM allows a generous number of SANs, so listing the names you actually serve is often clearer than relying on wildcards at all.

**Q: What is mutual TLS and when would you use it?**

Standard TLS authenticates only the server — the client verifies the server's certificate but presents nothing itself. Mutual TLS has both sides present certificates, so the server also cryptographically verifies the client's identity, which is much stronger than an API key because the private key never crosses the network. The typical uses are partner and B2B APIs where you need certainty about which organisation is calling, regulated environments such as open banking where it is mandated, and service-to-service authentication inside a cluster. ALB now supports it natively with a trust store of client CA certificates, which is simpler than the old approach of NLB passthrough plus application-level verification. The cost is genuine operational weight: you are running a certificate authority, issuing and rotating client certificates, and handling revocation. Inside a Kubernetes cluster a service mesh automates all of that, which is why mTLS between services is usually a mesh feature rather than something applications implement.

---
[Networking Index](./README.md) | [← Load Balancing](./03-load-balancing.md) | [Security Groups & NACLs →](./05-security-groups.md)
