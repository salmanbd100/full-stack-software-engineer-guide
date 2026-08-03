# Infrastructure Security

Protecting the perimeter and the account itself: WAF, Shield, account-level guardrails, and the controls that stop the misconfigurations that cause real breaches.

> For security group mechanics see [Security Groups & NACLs](../Networking/05-security-groups.md). This file covers layer 7 protection and account-level controls.

## AWS WAF

WAF inspects HTTP requests at CloudFront, ALB, API Gateway, or AppSync and blocks what matches your rules.

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "acme-prod"
  scope = "CLOUDFRONT"      # or "REGIONAL" for ALB/API Gateway

  default_action { allow {} }

  # 1. Rate limiting — the highest-value single rule
  rule {
    name     = "rate-limit"
    priority = 1

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 2000       # per 5-minute window, per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # 2. AWS managed rules — OWASP-style common attacks
  rule {
    name     = "common-rule-set"
    priority = 10

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        # Large uploads legitimately exceed the body size rule
        rule_action_override {
          name          = "SizeRestrictions_BODY"
          action_to_use { count {} }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common-rule-set"
      sampled_requests_enabled   = true
    }
  }

  # 3. Known bad inputs, SQL injection, and credential stuffing protection
  rule {
    name     = "known-bad-inputs"
    priority = 20
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "known-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "acme-prod"
    sampled_requests_enabled   = true
  }
}
```

**Managed rule groups worth knowing:**

| Rule Group | Blocks |
|-----------|--------|
| `AWSManagedRulesCommonRuleSet` | ✅ Baseline — XSS, path traversal, bad user agents |
| `AWSManagedRulesKnownBadInputsRuleSet` | ✅ Exploit payloads including Log4Shell |
| `AWSManagedRulesSQLiRuleSet` | SQL injection |
| `AWSManagedRulesATPRuleSet` | Credential stuffing on login endpoints |
| `AWSManagedRulesBotControlRuleSet` | Scrapers and automated traffic |
| `AWSManagedRulesAmazonIpReputationList` | Known malicious sources |

🔴 **Always deploy new rules in `count` mode first.** Managed rules generate false positives on real applications — a file upload endpoint trips body size rules, and a rich text editor trips XSS rules. Blocking straight away means blocking legitimate users.

```
Week 1: count mode      → observe CloudWatch metrics and sampled requests
Week 2: block the rules with zero false positives
Week 3: tune or override the remainder
```

✅ **Rate limiting is the highest-value rule and almost never causes false positives.** It stops credential stuffing, scraping, and small-scale denial of service with one configuration block.

## Shield

| | Shield Standard | Shield Advanced |
|---|---|---|
| **Cost** | ✅ Free, automatic | $3,000/month organisation-wide |
| **Protects against** | Layer 3/4 (SYN flood, UDP reflection) | ✅ Also layer 7 |
| **Response team** | ❌ | ✅ 24/7 DDoS Response Team |
| **Cost protection** | ❌ | ✅ Refunds scaling costs from an attack |
| **Health-based detection** | ❌ | ✅ Route 53 health check integration |

✅ **Shield Standard is on by default and handles the volumetric attacks most organisations face.** Shield Advanced is justified when downtime cost is high, when you need the response team on call, or when the cost-protection guarantee matters — a large layer 7 attack can generate a very large autoscaling and data transfer bill.

**Architectural DDoS resistance matters more than the subscription tier:**

| Practice | Effect |
|----------|--------|
| CloudFront in front of everything | Absorbs attacks across hundreds of edge locations |
| ✅ Origin not publicly reachable | Attacker cannot bypass the edge |
| Autoscaling with sane maximums | Absorb bursts without unbounded cost |
| WAF rate limiting | Blocks at the edge before compute is consumed |
| Route 53 rather than a fixed IP | Failover is a DNS change |

## AWS Network Firewall

Stateful inspection at the VPC level, for things security groups cannot express.

```hcl
resource "aws_networkfirewall_rule_group" "egress_allowlist" {
  name     = "egress-domains"
  type     = "STATEFUL"
  capacity = 100

  rule_group {
    rules_source {
      rules_source_list {
        generated_rules_type = "ALLOWLIST"
        target_types         = ["TLS_SNI", "HTTP_HOST"]
        targets = [
          ".amazonaws.com",
          ".acme.com",
          "api.stripe.com",
        ]
      }
    }
  }
}
```

✅ **Domain-based egress filtering is the capability worth knowing.** Security groups work on IP addresses, so they cannot express "this workload may only reach `api.stripe.com`". Network Firewall inspects the TLS SNI and HTTP Host header, which is how you actually restrict outbound traffic — and outbound restriction is what limits data exfiltration after a compromise.

| Tool | Layer | Use |
|------|-------|-----|
| **Security group** | 4, per-ENI, stateful | Default choice for allow rules |
| **NACL** | 3/4, per-subnet, stateless | Explicit deny, subnet guarantee |
| **Network Firewall** | 3–7, per-VPC, stateful | ✅ Domain filtering, IPS, deep inspection |
| **WAF** | 7, HTTP only | Application attacks, rate limiting |

## Account-Level Guardrails

🔴 **These prevent the misconfigurations that cause most real breaches.**

```hcl
# 1. S3 public access blocked account-wide — no bucket can opt out
resource "aws_s3_account_public_access_block" "main" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. EBS encrypted by default
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}

# 3. IMDSv2 required on all new instances in the region
resource "aws_ec2_instance_metadata_defaults" "main" {
  http_tokens                 = "required"
  http_put_response_hop_limit = 2
}
```

**And the organisation-level version, which cannot be undone by an account admin:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDisablingSecurityServices",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "guardduty:DeleteDetector",
        "guardduty:DisassociateFromMasterAccount",
        "config:DeleteConfigurationRecorder",
        "config:StopConfigurationRecorder",
        "s3:PutAccountPublicAccessBlock"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyRegionsWeDoNotUse",
      "Effect": "Deny",
      "NotAction": [
        "iam:*", "organizations:*", "route53:*", "cloudfront:*",
        "support:*", "sts:*", "budgets:*", "waf:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "us-east-1"] }
      }
    },
    {
      "Sid": "DenyRootUserActions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringLike": { "aws:PrincipalArn": "arn:aws:iam::*:root" }
      }
    }
  ]
}
```

> ✅ **The region restriction is an underrated control.** Cryptomining and data exfiltration frequently happen in regions nobody monitors. Denying unused regions removes that surface entirely, and it also stops accidental resource creation that nobody notices until the bill.

⚠️ Global services must be excluded from a region deny, since they report as `us-east-1`. Getting that list wrong locks you out of IAM.

## Bastion Hosts Are Obsolete

🔴 **Do not run a bastion with port 22 open.** SSM Session Manager replaces it entirely.

```hcl
# No inbound rules at all — SSM works over the agent's outbound connection
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = aws_vpc.main.id
  # ✅ no ingress block whatsoever
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
```

```bash
# Shell access, fully audited, no keys, no open ports
aws ssm start-session --target i-0abc123

# Port forwarding to reach a private RDS instance from a laptop
aws ssm start-session --target i-0abc123 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["acme-prod.abc.eu-west-1.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["5432"]}'
```

| SSM advantage over a bastion |
|------------------------------|
| ✅ No inbound ports — nothing to scan or brute force |
| ✅ No SSH keys to distribute, rotate, or lose |
| ✅ Access controlled by IAM, revocable instantly |
| ✅ Every session logged to CloudWatch or S3 |
| ✅ No instance to patch or pay for |

✅ **"How do you access production?" — the correct answer is SSM Session Manager with session logging**, plus a break-glass path that alerts when used.

## Config Rules with Auto-Remediation

Detection is not enough; remediate automatically where the fix is unambiguous.

```hcl
resource "aws_config_config_rule" "s3_public_read" {
  name = "s3-bucket-public-read-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
}

resource "aws_config_remediation_configuration" "s3_public_read" {
  config_rule_name = aws_config_config_rule.s3_public_read.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-DisableS3BucketPublicReadWrite"

  automatic                  = true      # ✅ fix without human involvement
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60

  parameter {
    name         = "S3BucketName"
    resource_value = "RESOURCE_ID"
  }

  parameter {
    name           = "AutomationAssumeRole"
    static_value   = aws_iam_role.config_remediation.arn
  }
}
```

**Rules worth enabling on day one:**

| Rule | Catches |
|------|---------|
| `s3-bucket-public-read-prohibited` | 🔴 The most common breach cause |
| `s3-bucket-server-side-encryption-enabled` | Unencrypted buckets |
| `encrypted-volumes` | Unencrypted EBS |
| `rds-storage-encrypted` | Unencrypted databases |
| `iam-user-mfa-enabled` | Privileged accounts without MFA |
| `access-keys-rotated` | Stale long-lived keys |
| `restricted-ssh` | 🔴 Port 22 open to the internet |
| `ec2-imdsv2-check` | IMDSv1 still permitted |
| `cloudtrail-enabled` | Audit logging turned off |

✅ Auto-remediation is appropriate where the fix cannot break anything — blocking public bucket access, enabling encryption on a new resource. It is inappropriate where remediation could cause an outage, such as deleting a security group rule an application depends on.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| WAF managed rules in block mode immediately | Legitimate users blocked | Count mode first, then tune |
| No rate limiting | Credential stuffing and scraping unimpeded | Rate-based rule, 2000/5min |
| WAF on the ALB, origin publicly reachable | 🔴 WAF bypassed entirely | Secret header the ALB verifies |
| Bastion with port 22 open | Attack surface, keys to manage | SSM Session Manager |
| Unrestricted egress | Exfiltration path after compromise | Network Firewall domain allowlist |
| No SCP protecting CloudTrail | An attacker disables logging first | SCP denying `StopLogging` |
| Config rules without remediation | Findings nobody actions | Auto-remediate the unambiguous ones |
| All regions enabled | Mining in unmonitored regions | SCP restricting `aws:RequestedRegion` |

## Interview Q&A

**Q: How would you configure WAF for a new application?**

Starting with rate limiting, because it is the highest-value rule and almost never produces false positives — a rate-based rule at a couple of thousand requests per five minutes per IP stops credential stuffing, scraping, and small-scale denial of service on its own. Then the AWS managed rule groups, specifically the common rule set and known bad inputs, which cover OWASP-style attacks and exploit payloads. The critical part is deployment method: managed rules go in `count` mode first, never straight to block, because they reliably produce false positives on real applications — file upload endpoints trip body size restrictions and rich text editors trip XSS rules. I would run in count mode for a week or two, examine the CloudWatch metrics and sampled requests, then promote the rules with no false positives to block and override the specific sub-rules causing problems. Blocking from day one means blocking paying customers.

**Q: You have WAF on your ALB. How could an attacker bypass it?**

By going directly to the ALB's DNS name, or to the origin behind CloudFront, rather than through the protected path. WAF is attached to a specific distribution or load balancer, so if the origin is independently reachable on the internet, every WAF rule, rate limit, and Shield protection is simply skipped. The fix depends on the topology. For CloudFront in front of an ALB, CloudFront injects a secret custom header and the ALB has a listener rule returning 403 for any request lacking it, with the secret in Secrets Manager and rotated. For an S3 origin, the bucket stays entirely private with Origin Access Control and a bucket policy conditioned on the specific distribution ARN. Where possible the origin should not have a public IP at all — an internal ALB with CloudFront reaching it through VPC origins, so there is no public path to bypass to.

**Q: How do you give engineers access to production instances?**

SSM Session Manager, with no bastion host and no inbound ports open at all. The SSM agent makes an outbound connection to the service, so the instance security group needs no ingress rules whatsoever, which removes the entire attack surface of an internet-facing SSH endpoint. Access is granted through IAM rather than by distributing SSH keys, so revoking someone is removing a policy rather than hunting for their public key on every host, and every session is logged to CloudWatch or S3 including the commands typed. It also handles port forwarding, so an engineer can reach a private RDS instance from their laptop through the tunnel without the database being exposed. On top of that I would restrict day-to-day access to read-only and put interactive production access behind a break-glass role that raises an alert whenever it is assumed.

**Q: Security groups only work on IP addresses. How do you restrict outbound traffic to specific domains?**

AWS Network Firewall, which does stateful inspection at the VPC level and can build allowlists based on the TLS SNI field and the HTTP Host header rather than IP addresses. That matters because modern endpoints sit behind CDNs with large and changing address ranges, so expressing "this workload may reach `api.stripe.com` and nothing else" is simply not possible with a security group. Egress restriction is worth the effort because it is what limits damage after a compromise — an attacker with code execution in a workload that can only reach two known domains has no exfiltration path and cannot pull down a second-stage payload. The complementary control is VPC endpoints for AWS services, so that traffic never leaves the VPC at all and does not need a firewall rule.

**Q: What account-level guardrails would you put in place first?**

The account-wide S3 public access block, because a public bucket is the single most common cause of real data breaches and this setting makes it impossible for any bucket in the account to be public regardless of its individual policy. Then EBS encryption by default with a customer-managed key, and IMDSv2 required by default at the region level, since both close whole classes of problem for every future resource without anyone needing to remember. At the organisation level, an SCP denying the disabling of CloudTrail, GuardDuty, and Config — because a competent attacker turns off logging first, and an SCP applies even to the root user, which no IAM policy does. I would also add an SCP restricting `aws:RequestedRegion` to the regions actually in use, since cryptomining and exfiltration commonly happen in unmonitored regions, taking care to exclude global services which report as `us-east-1`.

**Q: When is auto-remediation on Config rules appropriate, and when is it dangerous?**

It is appropriate where the remediation cannot plausibly break anything — enabling S3 public access block on a bucket, enabling default encryption, adding a missing tag. Those are strictly-safer changes, so applying them automatically is better than filing a ticket that sits for three weeks while the bucket is exposed. It is dangerous where the fix could cause an outage. Automatically deleting a security group rule that permits 0.0.0.0/0 sounds attractive until it removes the rule allowing legitimate public traffic to your load balancer, and automatically stopping non-compliant instances can take down production. The distinction I apply is whether the remediation is additive or restrictive: adding a protective setting is safe to automate, while removing access that something may depend on needs a human. For those, the rule should alert and create a ticket with a defined remediation SLA rather than acting.

---
[Security Index](./README.md) | [← Container Security](./05-container-security.md) | [Compliance & Auditing →](./07-compliance.md)
