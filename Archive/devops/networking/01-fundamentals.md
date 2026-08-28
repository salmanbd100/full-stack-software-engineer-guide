---
title: Networking Fundamentals
part: 8
chapter: 0
slug: networking-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-03
tags: [devops, networking, fundamentals]
in_book: false
---

# Networking Fundamentals

Networking is where most DevOps debugging ends up. This file covers the layers, protocols, and mental models you need before any cloud-specific networking makes sense.

## The OSI Model — the Practical Version

Seven layers exist in theory. Four matter daily.

| Layer | Name | Unit | You Debug This With | Real Example |
|-------|------|------|--------------------|--------------|
| 7 | Application | Message | `curl -v` | HTTP, DNS, TLS |
| 4 | Transport | Segment | `netstat`, `ss` | TCP, UDP |
| 3 | Network | Packet | `ping`, `traceroute` | IP, ICMP |
| 2 | Data link | Frame | `arp` | Ethernet, MAC |

✅ **Why it matters in interviews:** "Is this a layer 4 or layer 7 load balancer?" is a routine question, and the answer changes what the device can do.

| | Layer 4 (NLB) | Layer 7 (ALB) |
|---|---|---|
| **Sees** | IP and port only | Full HTTP request |
| **Can route on** | Port | Path, host, header, cookie |
| **Can terminate TLS** | Optionally | ✅ Yes |
| **Speed** | ✅ Faster, lower latency | Slightly more overhead |

> A layer 4 device cannot route on URL path, because it never sees the HTTP request — it only sees TCP.

## TCP vs UDP

| | TCP | UDP |
|---|---|---|
| **Connection** | Handshake first | Fire and forget |
| **Delivery** | Guaranteed, ordered | Best effort |
| **Speed** | Slower — acknowledgements | ✅ Faster |
| **Use** | HTTP, SSH, databases | DNS, video, metrics, QUIC |

**The TCP three-way handshake** — worth knowing because failures at each stage look different:

```
Client                    Server
  │──── SYN ─────────────────►│    "can we talk?"
  │◄─── SYN-ACK ──────────────│    "yes, can you hear me?"
  │──── ACK ─────────────────►│    "yes"
  │◄═══ connected ═══════════►│
```

🔴 **Diagnosing by where it fails:**

| Symptom | Meaning |
|---------|---------|
| **Connection timeout** | SYN got no reply — a firewall or security group silently dropped it |
| **Connection refused** | Reached the host, nothing listening on that port — `RST` returned |
| **Connection reset mid-stream** | Something killed an established connection |
| **Slow then works** | DNS resolution delay, not a network problem |

> ✅ **Timeout means dropped, refused means rejected.** That single distinction resolves a large share of connectivity tickets — timeout points at security groups or NACLs, refused points at the application not running.

**TCP connection states you will see in `ss` output:**

```bash
ss -tan | awk '{print $1}' | sort | uniq -c
```

| State | Meaning | Concern |
|-------|---------|---------|
| `ESTABLISHED` | Active connection | Normal |
| `TIME_WAIT` | Closed, waiting to ensure no stragglers | Thousands is normal; exhaustion is possible |
| `CLOSE_WAIT` | 🔴 Remote closed, **your app has not** | An application bug — leaked sockets |
| `SYN_SENT` | Waiting for SYN-ACK | Piling up means unreachable destination |

🔴 **Many `CLOSE_WAIT` sockets is always an application bug** — code that is not closing connections. It leads to file descriptor exhaustion and a service that stops accepting traffic.

## IP Addressing and CIDR

CIDR notation is non-negotiable knowledge for cloud work.

```
10.0.0.0/16
│        └── 16 network bits, so 16 host bits
└── network address

/16 → 65,536 addresses  (10.0.0.0 – 10.0.255.255)
/24 → 256 addresses     (10.0.1.0 – 10.0.1.255)
/28 → 16 addresses
/32 → 1 address (a single host)
```

**The mental shortcut:** each step down in prefix length doubles the address count.

| CIDR | Total | AWS Usable | Typical Use |
|------|-------|-----------|-------------|
| `/16` | 65,536 | 65,531 | A whole VPC |
| `/20` | 4,096 | 4,091 | ✅ EKS private subnet |
| `/24` | 256 | 251 | A standard subnet |
| `/28` | 16 | 11 | Smallest AWS subnet allowed |

🔴 **AWS reserves 5 addresses in every subnet:**

```
10.0.1.0    network address
10.0.1.1    VPC router
10.0.1.2    DNS (base + 2)
10.0.1.3    reserved for future use
10.0.1.255  broadcast address
```

⚠️ So a `/24` gives you 251 usable addresses, not 256. This matters when sizing EKS subnets, because the VPC CNI assigns a real VPC address to every pod.

**Private address ranges (RFC 1918)** — never routable on the internet:

```
10.0.0.0/8       10.0.0.0     – 10.255.255.255   (16.7M)
172.16.0.0/12    172.16.0.0   – 172.31.255.255   (1M)
192.168.0.0/16   192.168.0.0  – 192.168.255.255  (65K)
```

✅ **Plan your ranges before you build.** Overlapping CIDRs between two VPCs makes peering impossible, and renumbering a live VPC is not a thing you can do.

## Subnetting in Practice

```
VPC: 10.0.0.0/16

Public   (via IGW)   10.0.0.0/20    → 10.0.0.0   – 10.0.15.255
Private  (via NAT)   10.0.16.0/20   → 10.0.16.0  – 10.0.31.255
Isolated (no route)  10.0.32.0/20   → 10.0.32.0  – 10.0.47.255
Spare                10.0.48.0/20   → keep space for growth
```

✅ Leave unallocated space. Needing a fourth tier later, with no room, means a secondary CIDR block and permanent inconsistency.

## DNS

DNS resolution is the cause of a surprising share of "network" incidents.

```
app needs api.acme.com
      ↓
1. /etc/hosts               ← checked first, overrides everything
2. local resolver cache
3. recursive resolver (VPC DNS at base+2, or 8.8.8.8)
4. root servers → .com → acme.com nameservers
5. authoritative answer, cached for the TTL
```

**Record types that matter:**

| Type | Maps To | Note |
|------|---------|------|
| `A` | IPv4 address | The basic one |
| `AAAA` | IPv6 address | Increasingly required |
| `CNAME` | Another name | 🔴 Cannot exist at a zone apex |
| `ALIAS` | An AWS resource | ✅ Route 53 only — works at the apex |
| `MX` | Mail servers | Has priority values |
| `TXT` | Arbitrary text | SPF, DKIM, domain verification |
| `NS` | Nameservers for the zone | Delegation |

🔴 **The apex CNAME problem** is a classic interview question:

```
❌ acme.com  CNAME  my-alb-123.eu-west-1.elb.amazonaws.com
   Invalid — the DNS standard forbids a CNAME coexisting with the
   SOA and NS records that must exist at a zone apex.

✅ acme.com  ALIAS  my-alb-123.eu-west-1.elb.amazonaws.com
   Route 53 resolves it server-side, returns A records, and it is free.
```

**TTL is an operational decision:**

| TTL | Tradeoff |
|-----|----------|
| 60s | ✅ Fast failover; more query volume and cost |
| 300s | Reasonable default |
| 86400s | Cheap, cached widely; 🔴 a day to change anything |

⚠️ **Lower TTLs *before* a planned migration**, not during it. Reducing TTL only takes effect after the old TTL expires everywhere — so drop it to 60 seconds a day ahead.

**DNS caching gotchas:**

- 🔴 **JVM caches DNS forever by default** — `networkaddress.cache.ttl` must be set, or a failed-over RDS endpoint is never picked up
- ⚠️ Some connection pools resolve once at startup and never again
- ✅ NLBs change IPs; always use the DNS name, never a resolved address

## HTTP and Keep-Alive

```
HTTP/1.1  → one request at a time per connection; keep-alive reuses it
HTTP/2    → multiplexed streams over one TCP connection, header compression
HTTP/3    → over QUIC (UDP); no head-of-line blocking on packet loss
```

**Status codes that mean something specific in load balancer logs:**

| Code | Meaning | Usual Cause |
|------|---------|-------------|
| `502` | Bad gateway | Backend returned something invalid, or closed the connection |
| `503` | Unavailable | 🔴 No healthy targets in the target group |
| `504` | Gateway timeout | Backend did not respond within the idle timeout |
| `499` | Client closed request | The user gave up first |

🔴 **The 502-during-deploy problem:** the load balancer's idle timeout (60s default) is longer than the backend's keep-alive timeout. The backend closes an idle pooled connection, the load balancer tries to reuse it, and the client gets a 502.

✅ **Rule: backend keep-alive timeout must be longer than the load balancer idle timeout.** For an ALB at 60 seconds, set the application to 65 or more.

## Routing

```bash
# What route will this packet take?
ip route get 10.0.32.15

# The full routing table
ip route show
# default via 10.0.1.1 dev eth0     ← the gateway of last resort
# 10.0.0.0/16 dev eth0 scope link   ← local, no gateway needed
```

**Longest prefix match** — the rule that decides everything:

```
Routes:
  0.0.0.0/0     → internet gateway
  10.0.0.0/16   → local
  10.0.32.0/20  → NAT gateway

Packet to 10.0.32.15 matches all three.
/20 is the most specific → NAT gateway wins.
```

✅ This is exactly how AWS route tables work, and it is why adding a more specific route overrides the default without deleting anything.

## Diagnostic Toolkit

```bash
# Layer 3 — can packets reach it?
ping -c 4 10.0.32.15
traceroute -n 10.0.32.15
mtr 10.0.32.15                    # ✅ continuous traceroute, best tool

# Layer 4 — is the port open?
nc -zv 10.0.32.15 5432            # ✅ fastest port check
ss -tlnp                          # what is listening locally
ss -tan state close-wait | wc -l  # leaked sockets

# Layer 7 — is the application right?
curl -v https://api.acme.com/health
curl -w '@-' -o /dev/null -s https://api.acme.com <<'EOF'
  dns: %{time_namelookup}s  connect: %{time_connect}s
  tls: %{time_appconnect}s  ttfb: %{time_starttransfer}s
EOF

# DNS
dig +short api.acme.com
dig +trace api.acme.com           # ✅ follow the full delegation chain
dig @10.0.0.2 api.acme.com        # query the VPC resolver directly

# Packets — when nothing else explains it
tcpdump -i any -nn 'port 5432' -c 20
tcpdump -i any -nn 'tcp[tcpflags] & tcp-syn != 0'   # SYNs only
```

> ✨ **`curl -w` with timing breakdown is the highest-value command here.** It tells you instantly whether "the API is slow" is DNS, TCP, TLS, or the application — four very different problems.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Overlapping VPC CIDRs | Peering impossible, no fix | Plan an address scheme up front |
| Forgetting AWS's 5 reserved IPs | Subnet full sooner than expected | Size for 251, not 256, on a `/24` |
| `/24` private subnets on EKS | Pod IP exhaustion | `/20` or larger |
| CNAME at a zone apex | Invalid DNS | Route 53 ALIAS |
| Lowering TTL during migration | Old TTL still cached | Lower it a day ahead |
| Backend keep-alive < LB idle timeout | Intermittent 502s | Backend timeout longer |
| Hard-coding an NLB's IP | Breaks when it changes | Use the DNS name |
| Ignoring `CLOSE_WAIT` growth | File descriptor exhaustion | Fix connection closing in the app |

## Interview Q&A

**Q: What is the difference between a connection timeout and connection refused?**

A timeout means the SYN packet got no response at all — something dropped it silently, which in AWS almost always means a security group or network ACL is not permitting the traffic, or there is no route to the destination. Connection refused means the packet reached the host and the host actively sent back a TCP RST, which tells you the network path is fine and nothing is listening on that port — so the process has crashed, is bound to localhost only, or is on a different port. The distinction is genuinely useful because it splits the problem space in half immediately: timeout sends you to network configuration, refused sends you to the application. It is the first thing I establish when someone says "I can't connect".

**Q: Why can't you use a CNAME at a zone apex, and what do you use instead?**

Because the DNS specification says a CNAME cannot coexist with any other record for the same name, and a zone apex must have SOA and NS records by definition. So `acme.com CNAME my-alb.elb.amazonaws.com` is invalid, even though the equivalent works fine for `www.acme.com`. This is a real problem in AWS because load balancer endpoints are DNS names, not fixed IPs, so you cannot just use an A record either. Route 53's answer is the ALIAS record, which is a proprietary extension: it looks like a CNAME to you, but Route 53 resolves it server-side and returns actual A records to the client. It also works at the apex, supports health checks, and ALIAS queries to AWS resources are not charged.

**Q: A service intermittently returns 502 through the load balancer. What is your first hypothesis?**

A keep-alive timeout mismatch between the load balancer and the backend. The ALB holds idle connections open for 60 seconds by default, and if the application's keep-alive timeout is shorter — Node's default used to be 5 seconds — then the backend closes a pooled connection that the ALB still believes is usable. The next request the ALB sends down that connection fails, and the client sees a 502. It is intermittent because it only affects requests unlucky enough to land on a connection in that window, which is why it is so often dismissed as a transient glitch. The fix is to make the backend's keep-alive timeout longer than the load balancer's idle timeout, so the load balancer is always the side that closes. The other common 502 cause is the backend returning a malformed response or dying mid-request.

**Q: How many usable IP addresses are in a `/24` subnet in AWS?**

251. A `/24` has 256 addresses in total, and AWS reserves five in every subnet: the network address, the VPC router at base plus one, the DNS resolver at base plus two, one reserved for future use at base plus three, and the broadcast address at the top. This matters most on EKS, because the VPC CNI plugin assigns a real VPC address to every pod rather than using an overlay network, so subnet size directly caps pod density. Once you account for node ENIs and warm IP pools, a `/24` supports roughly two hundred pods, which sounds like plenty until a cluster grows. Since you cannot resize a subnet after creation, I plan `/20` private subnets for anything expected to scale — the symptom of getting it wrong is pods stuck in ContainerCreating with IP assignment failures, which looks like a Kubernetes problem but is a VPC design problem.

**Q: You see thousands of sockets in `CLOSE_WAIT`. What does that tell you?**

That it is an application bug, not a network problem. `CLOSE_WAIT` means the remote end has sent a FIN to close the connection and the local application has not called close on its socket. The kernel is waiting for the application to act, and it will wait indefinitely. So growing `CLOSE_WAIT` counts point directly at code that opens connections — usually an HTTP client or a database connection — without closing them on all paths, particularly error paths. The consequence is file descriptor exhaustion: eventually the process cannot open new sockets and the service stops accepting traffic, often with a confusing "too many open files" error rather than anything network-shaped. It is worth knowing because the symptom presents as a networking incident and the fix is entirely in the application.

**Q: How do you work out whether "the API is slow" is DNS, TCP, TLS, or the application?**

`curl -w` with a timing format string, which breaks a single request into named phases: `time_namelookup` for DNS, `time_connect` for the TCP handshake, `time_appconnect` for the TLS handshake, and `time_starttransfer` for time to first byte. Comparing those numbers tells you immediately which layer is responsible, and they are four completely different problems with different owners. A slow namelookup points at resolver configuration or a DNS server issue. A slow connect suggests network distance or SYN retransmission. A slow appconnect means TLS negotiation, often a certificate chain being fetched. A slow starttransfer with everything else fast means the application itself. Without that breakdown, people guess, and "the network is slow" gets escalated to the wrong team.

---
[Networking Index](./README.md) | [AWS Networking →](./02-aws-networking.md)
