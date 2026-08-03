# Load Balancing on AWS

Choosing between ALB and NLB, and knowing the failure modes of each, is standard interview material.

> For the service basics — listeners, target groups, SSL termination — see [AWS Load Balancers](../AWS/13-load-balancers.md). This file covers the decision and the gotchas.

## The Three Load Balancers

| | ALB | NLB | CLB |
|---|---|---|---|
| **Layer** | 7 (HTTP) | 4 (TCP/UDP/TLS) | 4 and 7 |
| **Routes on** | Path, host, header, query, cookie | Port only | Basic |
| **Static IP** | ❌ DNS name only | ✅ One per AZ, and Elastic IP support | ❌ |
| **Latency** | Higher | ✅ Very low | Higher |
| **Preserves client IP** | Via `X-Forwarded-For` | ✅ Natively | Via header |
| **Protocols** | HTTP/1.1, HTTP/2, gRPC, WebSocket | TCP, UDP, TLS | HTTP, TCP |
| **Status** | ✅ Current | ✅ Current | 🔴 Legacy |

**The decision rule:**

| Need | Use |
|------|-----|
| HTTP routing by path or host | **ALB** |
| gRPC or WebSocket | **ALB** |
| Extreme throughput, lowest latency | **NLB** |
| A static IP for a firewall allowlist | **NLB** |
| UDP, or a non-HTTP protocol | **NLB** |
| TLS passthrough to the backend | **NLB** |
| Anything new | ✅ Never CLB |

> ✅ **"Static IP" is the most common reason to pick NLB over ALB.** Enterprise customers and partners often need to allowlist your addresses in their firewall, and an ALB's IPs change without notice.

## ALB Routing

```hcl
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100          # lower number evaluated first

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern { values = ["/api/*"] }
  }

  condition {
    host_header { values = ["acme.com", "www.acme.com"] }
  }
}
```

⚠️ **Rules are evaluated in priority order, first match wins.** A catch-all `/*` rule at priority 1 makes every other rule dead code — a real and easily-missed misconfiguration.

**Weighted target groups — how you do canary and blue/green:**

```hcl
resource "aws_lb_listener" "https" {
  default_action {
    type = "forward"

    forward {
      target_group { arn = aws_lb_target_group.v1.arn, weight = 95 }
      target_group { arn = aws_lb_target_group.v2.arn, weight = 5 }

      stickiness {
        enabled  = true
        duration = 3600   # keep a user on one version
      }
    }
  }
}
```

✅ Shifting weight from 95/5 to 50/50 to 0/100 is a canary deployment with no DNS changes and instant rollback.

## Health Checks — Where Most Outages Start

```hcl
resource "aws_lb_target_group" "api" {
  name        = "api"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"          # "ip" for EKS/Fargate, "instance" for EC2

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15   # check every 15s
    timeout             = 5    # must respond within 5s
    healthy_threshold   = 2    # 2 passes → in service
    unhealthy_threshold = 3    # 3 fails → out of service
  }

  # ✅ Wait for in-flight requests before removing a target
  deregistration_delay = 30

  stickiness {
    type    = "lb_cookie"
    enabled = false     # avoid unless the app genuinely needs it
  }
}
```

🔴 **The health check anti-pattern that causes cascading failure:**

```typescript
// ❌ BAD — checks dependencies
app.get("/health", async (_req, res) => {
  await db.query("SELECT 1");          // if the DB blips...
  await redis.ping();                  // ...every instance fails at once
  res.sendStatus(200);
});
```

When the database has a brief problem, **every** target fails its health check simultaneously, the load balancer removes them all, and you get a 503 with no healthy targets — an outage far worse than the original blip.

```typescript
// ✅ GOOD — two distinct endpoints
// Liveness: is this process alive? Nothing external.
app.get("/health", (_req, res) => res.sendStatus(200));

// Readiness: can this instance serve traffic right now?
app.get("/ready", async (_req, res) => {
  // Check only dependencies this instance cannot function without,
  // and use a short timeout so a slow dependency does not hang the check.
  const ok = await checkDbPool({ timeoutMs: 1000 });
  res.sendStatus(ok ? 200 : 503);
});
```

✅ **Rule: the load balancer health check must not test shared dependencies.** If every instance depends on the same database, a database problem should degrade the service, not delete the whole fleet.

**Timing maths that matters:**

```
Time to detect a dead target = interval × unhealthy_threshold
                             = 15s × 3 = 45s

Time to return to service    = interval × healthy_threshold
                             = 15s × 2 = 30s
```

⚠️ Aggressive settings (5s interval, threshold 2) detect failure in 10 seconds but will remove healthy targets during a GC pause or a brief CPU spike. Balance detection speed against flapping.

## Zero-Downtime Deployments

The sequence that avoids dropped requests:

```
1. New target registers                    → status: initial
2. Health checks pass ×2                   → status: healthy, traffic starts
3. Old target begins deregistration        → status: draining
4. LB stops sending NEW requests to it
5. In-flight requests complete             → deregistration_delay window
6. Old target removed
```

| Setting | Why It Matters |
|---------|---------------|
| `deregistration_delay = 30` | 🔴 At 0, in-flight requests are killed mid-response |
| Readiness probe before traffic | Prevents routing to a warming instance |
| `preStop` sleep in Kubernetes | Covers the gap between endpoint removal and iptables update |
| App handles `SIGTERM` | Finish current work, then exit |

🔴 **The 502-during-deploy problem** — the single most common load balancer question:

```
ALB idle timeout:            60s (default)
Application keep-alive:       5s (Node.js default)

→ App closes an idle pooled connection at 5s
→ ALB still thinks it is usable, sends a request
→ Connection is gone → client gets 502
```

✅ **Fix: the backend keep-alive timeout must exceed the load balancer idle timeout.**

```typescript
const server = app.listen(3000);
server.keepAliveTimeout = 65_000;   // > ALB's 60s
server.headersTimeout   = 66_000;   // must exceed keepAliveTimeout
```

## Cross-Zone Load Balancing

```
Without cross-zone:                With cross-zone:
AZ-a: 1 target  → 50% of traffic   AZ-a: 1 target → 25%
AZ-b: 3 targets → 50% (16% each)   AZ-b: 3 targets → 75% (25% each)
       🔴 imbalanced                      ✅ even
```

| | ALB | NLB |
|---|---|---|
| **Default** | ✅ Always on, cannot disable | 🔴 **Off** by default |
| **Cross-AZ data charge** | Free | Charged when enabled |

🔴 **NLB has cross-zone disabled by default**, which means uneven target counts per AZ produce uneven load. This is a favourite gotcha.

```hcl
resource "aws_lb" "nlb" {
  load_balancer_type               = "network"
  enable_cross_zone_load_balancing = true   # ← opt in, and accept the data charge
}
```

✅ Keep target counts equal across AZs and you may not need it. Uneven counts and it becomes necessary.

## Connection Draining and Sticky Sessions

**Stickiness ties a client to one target.**

| Type | Mechanism | Note |
|------|-----------|------|
| **Duration-based** | `AWSALB` cookie set by the ALB | Simple |
| **Application-based** | Your app's own cookie | ✅ More control |

❌ **Avoid stickiness where possible:**

- Uneven load — one target gets the heavy users
- Deploys are disruptive — losing a target loses those sessions
- It hides state that should be externalised

✅ Put session state in ElastiCache or DynamoDB and keep the application stateless. Then any target can serve any request.

## Access Logs

```hcl
resource "aws_lb" "main" {
  access_logs {
    bucket  = aws_s3_bucket.lb_logs.id
    prefix  = "alb"
    enabled = true
  }
}
```

**Fields worth knowing** — these answer "was it us or the backend?":

| Field | Meaning |
|-------|---------|
| `request_processing_time` | LB received → sent to target |
| `target_processing_time` | ✅ Time the **backend** took |
| `response_processing_time` | Target responded → sent to client |
| `elb_status_code` | What the client saw |
| `target_status_code` | ✅ What the backend actually returned |

🔴 **`-1` in a processing time field means the request never got that far.** A `target_processing_time` of `-1` with a 502 means the load balancer could not get a response at all.

```sql
-- Athena over ALB logs: is the backend or the LB responsible?
SELECT elb_status_code, target_status_code, COUNT(*) AS n,
       AVG(target_processing_time) AS avg_backend
FROM alb_logs
WHERE elb_status_code >= '500'
GROUP BY 1, 2 ORDER BY n DESC;
```

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Health check queries the database | 🔴 One DB blip removes every target | Liveness checks nothing external |
| Backend keep-alive < LB idle timeout | Intermittent 502s | Set app timeout above 60s |
| `deregistration_delay = 0` | Requests killed mid-flight | 30s or more |
| Catch-all rule at low priority number | All other rules dead | Catch-all last |
| NLB cross-zone left off with uneven AZs | Skewed load | Enable, or balance targets |
| Relying on ALB IPs | Break without warning | Use the DNS name, or NLB |
| Stickiness as a substitute for shared state | Uneven load, disruptive deploys | Externalise sessions |
| `health_check_type = "EC2"` on an ASG | Hung app keeps receiving traffic | Use `"ELB"` |

## Interview Q&A

**Q: ALB or NLB — how do you choose?**

It comes down to what layer you need to act at. ALB operates at layer 7, so it can see the HTTP request and route on path, host, header, or cookie, and it supports gRPC and WebSocket — that covers most web applications, and weighted target groups make canary deployments straightforward. NLB operates at layer 4, so it only sees IP and port, but it is much lower latency, handles non-HTTP protocols including UDP, preserves the client IP natively without needing `X-Forwarded-For`, and critically it can have a static IP per availability zone with Elastic IP support. That static IP is often the deciding factor: enterprise customers frequently need to allowlist your addresses in their firewalls, and an ALB's addresses change without notice. NLB is also the right answer when you want TLS to terminate at the backend rather than the load balancer. Classic Load Balancer is legacy and should never be chosen for new work.

**Q: Why should a load balancer health check not check the database?**

Because it converts a partial degradation into a total outage. If the health endpoint queries the database, then a brief database problem causes every instance to fail its health check at the same moment. The load balancer removes all of them, the target group has no healthy targets, and every request gets a 503 — which is far worse than the original blip, and it persists until the database recovers and the healthy threshold is met again. The correct pattern separates liveness from readiness: the load balancer health check confirms only that the process is alive and able to serve, checking nothing external, while a separate readiness signal handles per-instance conditions with a short timeout. The general principle is that a health check on a shared dependency has no discriminating power — it cannot tell you which instance to remove, because the answer is always all of them.

**Q: Requests intermittently return 502 during and after deploys. Diagnose it.**

The most likely cause is a keep-alive timeout mismatch. The ALB holds idle connections open for 60 seconds by default, while many application servers default to much less — Node.js historically used 5 seconds. So the backend closes a pooled connection that the ALB still considers usable, and the next request sent down it fails with a 502. It presents as intermittent because only requests that land on a connection in that window are affected. The fix is to set the application's keep-alive timeout above the load balancer's idle timeout, so the load balancer is always the party that closes, and in Node you also need `headersTimeout` set above `keepAliveTimeout`. The other contributor around deploys specifically is `deregistration_delay` set too low, which kills in-flight requests when a target is removed — thirty seconds is a reasonable default, and in Kubernetes a `preStop` sleep covers the gap between endpoint removal and the iptables rules actually updating.

**Q: What is cross-zone load balancing and what is the trap?**

Cross-zone load balancing lets the load balancer distribute traffic to targets in any availability zone rather than only to targets in its own zone. Without it, traffic is split evenly across zones first, then divided among the targets in each — so one target in zone A receives the same total share as three targets in zone B, giving that single target three times the load. The trap is that the two load balancer types differ in default: ALB has cross-zone always enabled and you cannot turn it off, while NLB has it disabled by default and you have to opt in. So an NLB with uneven target counts across zones silently distributes load unevenly, which shows up as one group of instances running much hotter than the rest. Enabling it on an NLB does introduce cross-AZ data transfer charges, so the alternative is keeping target counts equal per zone, which is what an autoscaling group configured across subnets will do anyway.

**Q: How do you do a canary deployment with an ALB?**

Weighted target groups on the listener. You create two target groups, one running the current version and one running the new version, and configure the listener's forward action to split traffic between them by weight — starting at 95/5, then 75/25, then 50/50, and finally 0/100 once metrics look good. Because it is a load balancer configuration change, shifting weight takes effect in seconds and rolling back is instant, with no DNS TTL to wait out. Enabling stickiness in the forward block keeps an individual user on one version for the duration, which avoids the confusing experience of alternating between old and new behaviour mid-session. The critical part is what you watch during the shift: error rate and p99 latency for the canary target group specifically, compared against the stable one, since aggregate metrics will hide a problem affecting only 5% of traffic.

**Q: A user reports a 502 and you have ALB access logs. How do you tell whether it was the load balancer or the backend?**

The `target_status_code` and `target_processing_time` fields. If `target_status_code` shows an actual code, the backend responded and the problem is in that response — a 502 with a target code means the backend returned something the ALB considered malformed. If `target_processing_time` is `-1`, the request never reached a target at all, which points at no healthy targets, a connection that could not be established, or the keep-alive race. Comparing `request_processing_time`, `target_processing_time`, and `response_processing_time` also localises latency: a large target time means the backend is slow, while a large response processing time can indicate the client is slow to read. I would query this with Athena over the logs in S3, grouping by the two status codes, which usually makes the pattern obvious within a minute.

---
[Networking Index](./README.md) | [← AWS Networking](./02-aws-networking.md) | [SSL/TLS & ACM →](./04-ssl-tls.md)
