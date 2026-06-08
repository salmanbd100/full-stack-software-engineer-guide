# Load Balancers (ALB & NLB)

AWS Elastic Load Balancing spreads incoming traffic across multiple targets. This removes single points of failure and lets you scale horizontally.

## ALB vs NLB

| Feature | ALB | NLB |
|---------|-----|-----|
| **OSI Layer** | Layer 7 (HTTP/HTTPS) | Layer 4 (TCP/UDP/TLS) |
| **Routing** | Content-based (path, host, headers) | Connection-based (IP + port) |
| **Latency** | ~1ms | Ultra-low (<1ms) |
| **Static IP** | ❌ No (use Global Accelerator) | ✅ Yes, per AZ |
| **SSL termination** | ✅ Yes (via ACM) | ✅ Yes (TLS passthrough or termination) |
| **WebSockets** | ✅ Yes | ✅ Yes |
| **gRPC** | ✅ Yes | ✅ Yes |
| **Typical use** | Web apps, APIs, microservices | Gaming, IoT, financial trading, VPC PrivateLink |

> **CLB (Classic)** is the old generation. Avoid it for new workloads — AWS recommends ALB or NLB.

## ALB Listener Rules

Rules tell the ALB where to send traffic. They run in priority order. The last rule is always the default.

### Host-Based Routing

Route different subdomains to different target groups.

```
Listener: HTTPS :443
  Rule 1: Host = api.example.com  → Target Group: api-service
  Rule 2: Host = app.example.com  → Target Group: web-frontend
  Default: → Target Group: web-frontend
```

### Path-Based Routing

Route URL paths to different backends behind a single domain.

```
Listener: HTTPS :443
  Rule 1: Path = /api/*        → Target Group: backend-service
  Rule 2: Path = /static/*     → Target Group: s3-origin (or CloudFront)
  Default: Path = /*           → Target Group: frontend-service
```

### Weighted Target Groups (Canary Deployments)

Send a percentage of traffic to a new version without a full switch-over.

```
Rule: Path = /*
  → Target Group: v1  (weight: 90)
  → Target Group: v2  (weight: 10)
```

Start at 10%, watch metrics, then shift to 100% once stable. This is built into ALB — no extra service needed.

✅ Use weighted routing for zero-downtime releases.  
❌ Don't switch 100% at once — if v2 has a bug, all users are affected.

## Target Groups

A target group is a pool of compute that receives traffic from a load balancer rule.

**Supported target types:**

| Type | Use Case |
|------|----------|
| **Instance** | EC2 instances by instance ID |
| **IP** | Any private IP (on-prem, ECS Fargate tasks) |
| **Lambda** | Invoke a Lambda from ALB |
| **ALB** | NLB → ALB chaining |

### Health Checks

The load balancer pings each target on a configurable interval. Unhealthy targets stop receiving traffic.

```bash
# Health check settings (typical values)
Protocol:              HTTP
Path:                  /health
Port:                  traffic-port
Healthy threshold:     2    # consecutive successes to mark healthy
Unhealthy threshold:   3    # consecutive failures to mark unhealthy
Timeout:               5s
Interval:              30s
```

✅ Return HTTP 200 from `/health` only when the app is ready to serve traffic.  
❌ Don't return 200 if the app is booting or if a critical dependency (DB) is down.

### Deregistration Delay

When you remove a target (deploy, scale-in), the ALB waits before stopping traffic to it. This lets in-flight requests finish.

```bash
# Default is 300 seconds — too long for fast deploys
# Set to 30–60s for most web apps
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30
```

> Reducing deregistration delay speeds up blue/green and rolling deployments.

## SSL/TLS Termination

**Terminate at the ALB (most common):**

```
Client → HTTPS → ALB (terminates TLS, decrypts) → HTTP → Targets
```

- Use ACM (AWS Certificate Manager) for free, auto-renewing certs.
- The ALB handles TLS overhead. Targets see plain HTTP.

**End-to-end encryption:**

```
Client → HTTPS → ALB (terminates) → HTTPS → Targets
```

Use when your security policy requires encryption in transit inside the VPC too. Targets need their own certs (can be self-signed for internal traffic).

```bash
# Add an HTTPS listener with an ACM cert
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## Sticky Sessions

Sticky sessions (session affinity) route the same user to the same target using a cookie.

⚠️ Use sticky sessions sparingly. They break even distribution across targets. If a target goes down, all its sticky users get a new assignment and lose session state.

✅ Better: store session state externally (Redis, DynamoDB). Then any target can serve any user.

| | Sticky Sessions | External Session Store |
|--|----------------|----------------------|
| **Complexity** | Low | Medium |
| **Scaling** | Uneven | Even |
| **Failover** | Session lost | Session preserved |
| **Recommended** | Legacy apps only | All new apps |

## Cross-Zone Load Balancing

By default, each ALB node only routes to targets in its own AZ.

With **cross-zone enabled**, each ALB node routes to all targets across all AZs. This balances traffic evenly even if AZs have different numbers of targets.

- ALB: **enabled by default**, no extra charge.
- NLB: **disabled by default**, charged per GB if enabled.

```
Without cross-zone (NLB default):
  AZ-a ALB node → only az-a targets (3 targets)
  AZ-b ALB node → only az-b targets (1 target)   ← gets 50% of traffic with 1/4 targets

With cross-zone:
  AZ-a ALB node → all targets across AZ-a and AZ-b
  AZ-b ALB node → all targets across AZ-a and AZ-b  ← even distribution
```

## Access Logs

Enable access logs to record every request to S3. Useful for debugging, auditing, and security analysis.

```bash
# Enable access logs on an ALB
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --attributes \
    Key=access_logs.s3.enabled,Value=true \
    Key=access_logs.s3.bucket,Value=my-alb-logs-bucket \
    Key=access_logs.s3.prefix,Value=my-app
```

⚠️ ALB access logs are not real-time. They are delivered in 5-minute chunks to S3. Use CloudWatch Metrics for live monitoring.

## Useful CLI Commands

```bash
# Create an ALB
aws elbv2 create-load-balancer \
  --name my-alb \
  --type application \
  --subnets subnet-abc subnet-def \
  --security-groups sg-xyz

# Create a target group
aws elbv2 create-target-group \
  --name my-targets \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-abc123 \
  --health-check-path /health

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-1234567890abcdef0

# Add a path-based routing rule
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## Interview Q&A

**Q: When do you use ALB vs NLB?**

ALB for web apps, REST APIs, and microservices — anything HTTP/HTTPS where you need content-based routing, host/path rules, or WAF integration. NLB for use cases that need ultra-low latency, static IP addresses, or non-HTTP protocols like TCP/UDP. NLB is also required if you expose services via AWS PrivateLink.

---

**Q: How do you implement path-based routing with ALB?**

Create listener rules on the ALB with a `path-pattern` condition. Each rule points to a different target group. For example, `/api/*` forwards to your backend target group and `/*` forwards to your frontend target group. Rules run in priority order, so put more specific rules first with a lower priority number.

---

**Q: How do you do canary deployments with ALB?**

Use weighted target groups on a listener rule. Set v1 to weight 90 and v2 to weight 10. ALB splits traffic proportionally. Watch error rates and latency in CloudWatch. Gradually shift weight to 100% for v2 once metrics look healthy. If something goes wrong, set v2 weight back to 0 instantly.

---

**Q: What does a target group health check do?**

The ALB sends periodic HTTP requests to each target at the configured path and port. If a target returns a non-2xx response or times out consecutively, the ALB marks it unhealthy and stops sending traffic to it. Once the target passes the healthy threshold again, it rejoins the rotation. This is how ALB handles instance failures transparently.

---

**Q: How do you get a static IP for a load balancer?**

ALBs do not have static IPs — their IPs change when the ALB scales. Two options: (1) Use an **NLB**, which assigns a static IP per AZ. (2) Put **AWS Global Accelerator** in front of your ALB — it gives you two static anycast IPs that never change, while the ALB continues to handle HTTP routing behind it.

---

[← CloudFront](./12-cloudfront.md) | [CloudWatch →](./14-cloudwatch.md)
