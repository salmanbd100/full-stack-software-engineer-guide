# Security Groups & Network ACLs

The stateful versus stateless distinction is one of the most reliably asked AWS networking questions, and the source of most "why can't these two things talk?" tickets.

## The Core Difference

| | Security Group | Network ACL |
|---|---|---|
| **Attached to** | ENI (instance, pod, endpoint) | Subnet |
| **State** | ✅ **Stateful** | 🔴 **Stateless** |
| **Rules** | Allow only | Allow **and** deny |
| **Evaluation** | All rules together | 🔴 In number order, first match wins |
| **Default** | Deny inbound, allow outbound | Allow everything |
| **Return traffic** | ✅ Automatic | Needs an explicit rule |

### 🔴 Stateful vs Stateless — the thing to understand

**Security group (stateful):** allow inbound port 443, and the response is automatically permitted. The security group remembers the connection.

```
inbound  443 from 0.0.0.0/0   ✅ allowed
response on ephemeral port    ✅ automatic — no rule needed
```

**NACL (stateless):** every direction needs its own rule. Allowing inbound 443 without allowing outbound ephemeral ports means the request arrives and the response is dropped.

```
inbound  443 from 0.0.0.0/0        ✅ allowed
outbound 1024-65535 to 0.0.0.0/0   🔴 REQUIRED, or the response never leaves
```

> **This is the number one NACL mistake.** The connection appears to hang rather than fail, because the client sent its SYN, the server replied, and the reply was silently dropped on the way out.

**Ephemeral port ranges differ by client:**

| Client | Range |
|--------|-------|
| Linux | 32768–60999 |
| Windows (modern) | 49152–65535 |
| NLB / Lambda | 1024–65535 |

✅ Allow `1024-65535` outbound on NACLs. Narrower ranges break some clients in ways that are painful to diagnose.

## Security Groups in Practice

### ✅ Reference security groups, not CIDR blocks

```hcl
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = aws_vpc.main.id
  lifecycle { create_before_destroy = true }
}

resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = aws_vpc.main.id
  lifecycle { create_before_destroy = true }
}

# ✅ "anything in the ALB security group" — stays correct as IPs change
resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  description                  = "ALB to application"
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Application to PostgreSQL"
}
```

**Why this beats CIDR blocks:**

- Load balancer and instance IPs change; group membership does not
- It documents intent — "app talks to db", not "10.0.16.0/20 talks to 5432"
- Autoscaling adds instances that are covered automatically
- No subnet-wide grant, so unrelated workloads in the same subnet are not included

```
✅ Chained by reference:

internet → [alb-sg] → [app-sg] → [db-sg]
              443       3000       5432
```

### 🔴 Use separate rule resources, not inline blocks

```hcl
# ❌ Inline — Terraform treats the whole rule set as one attribute,
#    so any change rewrites all of them, and manual additions get wiped
resource "aws_security_group" "bad" {
  ingress { from_port = 443, to_port = 443, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 80,  to_port = 80,  protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] }
}

# ✅ Separate resources — each rule has its own lifecycle and its own description
resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.good.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "Public HTTPS"
}
```

✅ The newer `aws_vpc_security_group_ingress_rule` resource also gives every rule a **description**, which the older `aws_security_group_rule` could not do reliably. A security group with 30 undocumented rules is unauditable.

### Limits That Shape Design

| Limit | Default |
|-------|---------|
| Rules per security group | 60 inbound, 60 outbound |
| Security groups per ENI | 5 (raisable to 16) |
| **Rules × groups per ENI** | 🔴 1,000 — the real ceiling |

⚠️ Hitting these means your design is wrong. Use group references and prefix lists rather than enumerating CIDRs.

**Managed prefix lists** — one entry for many ranges:

```hcl
resource "aws_ec2_managed_prefix_list" "office" {
  name           = "office-networks"
  address_family = "IPv4"
  max_entries    = 20

  entry { cidr = "203.0.113.0/24", description = "London office" }
  entry { cidr = "198.51.100.0/24", description = "Berlin office" }
}

resource "aws_vpc_security_group_ingress_rule" "admin_from_office" {
  security_group_id = aws_security_group.bastion.id
  prefix_list_id    = aws_ec2_managed_prefix_list.office.id
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}
```

✅ Adding an office means one prefix list entry, not editing every security group.

## When to Use NACLs

Security groups handle almost everything. NACLs are for the two things they cannot do.

| Use NACL for | Why |
|--------------|-----|
| **Explicit deny** | 🔴 Security groups cannot deny — blocking a specific IP needs a NACL |
| **Subnet-wide guarantee** | A control that holds even if someone misconfigures a security group |

```hcl
resource "aws_network_acl_rule" "block_bad_actor" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 50          # lower than the allow rules
  egress         = false
  protocol       = "-1"
  rule_action    = "deny"
  cidr_block     = "203.0.113.66/32"
}

resource "aws_network_acl_rule" "allow_https" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  from_port      = 443
  to_port        = 443
  cidr_block     = "0.0.0.0/0"
}

# 🔴 REQUIRED for stateless return traffic
resource "aws_network_acl_rule" "allow_ephemeral_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  from_port      = 1024
  to_port        = 65535
  cidr_block     = "0.0.0.0/0"
}
```

🔴 **Rule numbers matter — first match wins and evaluation stops.** A deny at rule 50 beats an allow at 100. An allow-all at rule 100 makes every rule above 100 unreachable.

✅ Number in gaps of 100 so you can insert rules later without renumbering.

⚠️ For blocking IPs at scale, **AWS WAF** is a better tool than NACLs — it has IP set rules, rate limiting, and managed threat lists, and it operates at layer 7.

## Evaluation Order

```
Inbound packet
      ↓
1. NACL inbound rules (subnet)     → deny? dropped
      ↓
2. Security group inbound (ENI)    → no allow? dropped
      ↓
   Application
      ↓
3. Security group outbound         → stateful, response auto-allowed
      ↓
4. NACL outbound rules             → 🔴 stateless, needs an explicit rule
      ↓
   Response leaves
```

✅ **Both layers must permit the traffic.** Debugging order: check the security group first, because it is the more common cause, then the NACL, then routing.

## Debugging "They Cannot Talk"

Work through this in order.

```
1. Is there a ROUTE?
   → Route table on the source subnet has a path to the destination

2. Does the SOURCE security group allow OUTBOUND?
   → Default allows all, but hardened setups often restrict it

3. Does the DESTINATION security group allow INBOUND?
   → From the source's security group or CIDR, on the right port

4. Do NACLs on BOTH subnets allow it?
   → Including outbound ephemeral ports for the return path

5. Is anything LISTENING?
   → `ss -tlnp` on the destination — bound to 0.0.0.0, not 127.0.0.1

6. Is the host firewall blocking it?
   → iptables / firewalld inside the instance
```

**The symptom tells you where to look:**

| Symptom | Likely Layer |
|---------|-------------|
| **Timeout** | Security group, NACL, or routing — packet dropped silently |
| **Connection refused** | ✅ Network is fine — nothing listening on that port |
| **Works one way only** | NACL missing the return rule |
| **Intermittent** | One subnet in a multi-AZ setup misconfigured |

```bash
# Reachability Analyzer — evaluates the actual configuration, no packets sent
aws ec2 create-network-insights-path \
  --source i-0abc123 --destination i-0def456 \
  --destination-port 5432 --protocol tcp

aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-0abc123
```

✅ **Reachability Analyzer is the fastest way to answer this.** It tells you the exact component blocking the path — a specific security group rule, a NACL entry, or a missing route — without needing access to either instance.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| NACL inbound allowed, ephemeral outbound missing | Connections hang | Allow 1024-65535 outbound |
| Expecting a security group to deny | Not possible | Use a NACL or WAF |
| NACL allow-all at a low rule number | Rules above it unreachable | Order deny before allow |
| CIDR blocks instead of group references | Breaks when IPs change | `referenced_security_group_id` |
| Inline `ingress` blocks in Terraform | Whole rule set rewritten on change | Separate rule resources |
| `0.0.0.0/0` on port 22 | 🔴 Internet-facing SSH | SSM Session Manager |
| No rule descriptions | Nobody dares delete anything | Description on every rule |
| Same security group for app and database | No segmentation at all | One group per tier |

## Interview Q&A

**Q: What is the difference between a security group and a network ACL?**

Two differences matter. First, scope: a security group attaches to an elastic network interface, so it protects an individual instance, pod, or endpoint, while a NACL attaches to a subnet and applies to everything in it. Second, and more importantly, security groups are stateful and NACLs are stateless. With a security group, allowing inbound traffic on port 443 automatically permits the response, because the connection is tracked. With a NACL, every direction needs its own explicit rule, so allowing inbound 443 without also allowing outbound on the ephemeral port range means the request arrives, the server responds, and the response is dropped on the way out. Beyond that, security groups can only allow, while NACLs support both allow and deny and are evaluated in rule-number order with first match winning.

**Q: You allowed inbound HTTPS on a NACL but connections still hang. Why?**

The return traffic is being dropped. NACLs are stateless, so the inbound allow on port 443 lets the client's request in, but the server's response goes back out to the client's ephemeral source port — typically somewhere in 32768 to 60999 on Linux — and unless there is an outbound rule permitting that range, the NACL drops it. The client sees a hang rather than a refusal, because from its point of view the SYN was sent and nothing came back. The fix is an outbound allow for TCP 1024 to 65535. I would use that full range rather than a narrower one, because different clients use different ephemeral ranges — Windows uses 49152 upwards, NLB and Lambda can use from 1024 — and a range that is too narrow produces intermittent failures that are very hard to attribute.

**Q: Why reference security groups instead of CIDR blocks?**

Because it stays correct as infrastructure changes, and it documents intent. If the application's security group allows inbound from the load balancer's security group, that rule remains accurate no matter how many load balancer nodes exist or what addresses they take — and ALB addresses do change without notice. A CIDR-based rule either has to be updated when addresses change, or is written broadly enough to cover a whole subnet, which grants access to every unrelated workload in that subnet too. It also makes the configuration readable: "app accepts traffic from alb" is a sentence a reviewer can evaluate, whereas "10.0.16.0/20 may reach port 3000" requires cross-referencing to understand. With autoscaling it is essentially mandatory, since new instances are covered automatically by group membership.

**Q: How do you block a specific malicious IP address?**

Not with a security group, because security groups only support allow rules — there is no deny, so you cannot subtract an address from a broader allow. The options are a network ACL with a deny rule at a low rule number so it is evaluated before the allow rules, or AWS WAF with an IP set rule. For anything beyond a handful of addresses, WAF is the better tool: it operates at layer 7, supports rate-based rules that block automatically when a source exceeds a request threshold, includes AWS-managed threat intelligence lists, and does not consume the limited NACL rule space. NACL denies are appropriate when you need the block enforced at the network layer regardless of the application path, or for non-HTTP protocols that WAF does not inspect.

**Q: Two instances cannot communicate. Walk me through your debugging.**

I start with whether the network path can exist at all, then narrow. First, routing: does the source subnet's route table have a path to the destination, which matters particularly across peering connections where routes are needed on both sides. Second, the source security group's outbound rules, which default to allow-all but are often restricted in hardened environments. Third, the destination security group's inbound rules, checking both the port and whether the source is permitted by group reference or CIDR. Fourth, NACLs on both subnets, including outbound ephemeral ports for the return path. Fifth, whether anything is actually listening, using `ss -tlnp` to confirm the process is bound to 0.0.0.0 rather than only to localhost. Sixth, host-level firewalls inside the instance. In practice I would run Reachability Analyzer first, because it evaluates the real configuration and names the exact blocking component without needing access to either instance — it turns a twenty-minute investigation into about a minute.

**Q: When is a NACL actually the right tool?**

Two situations. The first is when you need an explicit deny, since security groups cannot express one — blocking a specific address or range requires a NACL or WAF. The second is when you want a subnet-wide guarantee that holds independently of security group configuration. That is valuable for compliance: a NACL on the isolated database subnets denying all outbound internet traffic is a control that survives someone attaching an overly permissive security group to an instance, and it is auditable as a single piece of configuration rather than as the union of many security group rules. Outside those cases I would default to security groups, because they are stateful, easier to reason about, and support group references. The failure mode to avoid is trying to build your primary access control in NACLs, where the stateless behaviour and rule-number ordering make mistakes very easy.

---
[Networking Index](./README.md) | [← SSL/TLS & ACM](./04-ssl-tls.md) | [CloudFront & CDN →](./06-cloudfront.md)
