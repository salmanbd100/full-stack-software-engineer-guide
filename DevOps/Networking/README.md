# Networking - Interview Preparation

Networking is where most DevOps debugging ends up, and where scenario questions concentrate. This guide covers the fundamentals, AWS connectivity options, and a repeatable troubleshooting method.

## Table of Contents

1. [Fundamentals](./01-fundamentals.md) — OSI layers, TCP states, CIDR, DNS, keep-alive
2. [AWS Networking Advanced](./02-aws-networking.md) — peering, Transit Gateway, PrivateLink, hybrid, data transfer cost
3. [Load Balancing](./03-load-balancing.md) — ALB vs NLB, health checks, zero-downtime, cross-zone
4. [SSL/TLS & ACM](./04-ssl-tls.md) — handshake, chains, ACM renewal, termination strategy, mTLS
5. [Security Groups & NACLs](./05-security-groups.md) — stateful vs stateless, group references, evaluation order
6. [CloudFront & CDN](./06-cloudfront.md) — cache keys, invalidation vs versioning, OAC, edge compute
7. [Service Mesh](./07-service-mesh.md) — Istio, mTLS, traffic management, and when not to adopt one
8. [Network Troubleshooting](./08-troubleshooting.md) — Reachability Analyzer, Flow Logs, playbooks

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 05 Security Groups & NACLs | Stateful vs stateless is asked in almost every AWS interview |
| 🔴 Critical | 08 Troubleshooting | Every scenario question lands here |
| 🔴 Critical | 03 Load Balancing | ALB vs NLB, and the health check trap |
| 🔴 Critical | 01 Fundamentals | CIDR maths and timeout vs refused |
| 🟡 High | 02 AWS Networking | Peering transitivity, TGW, data transfer cost |
| 🟡 High | 04 SSL/TLS | Certificate expiry is a recurring real outage |
| 🟢 Good to know | 06, 07 | CDN caching strategy, mesh tradeoffs |

## Top 12 Interview Questions

1. What is the difference between a security group and a network ACL?
2. What is the difference between a connection timeout and connection refused?
3. Is VPC peering transitive? What do you use when it is not?
4. ALB or NLB — how do you choose?
5. Why should a load balancer health check not query the database?
6. How many usable IPs are in a `/24` subnet in AWS?
7. Why can't you use a CNAME at a zone apex?
8. Requests intermittently return 502. Diagnose it.
9. When would you use PrivateLink over peering?
10. Two instances cannot communicate. Walk me through your debugging.
11. Why is our data transfer bill so high?
12. Should we adopt a service mesh?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **SG vs NACL** | SG is stateful and per-ENI, allow-only. NACL is stateless and per-subnet, allow and deny |
| **NACL return traffic** | Stateless — must allow outbound 1024-65535 or connections hang |
| **Timeout vs refused** | Timeout = dropped (SG/NACL/route). Refused = arrived, nothing listening |
| **Peering** | 🔴 Not transitive, and overlapping CIDRs make it impossible |
| **PrivateLink** | One service, unidirectional, ✅ works with overlapping CIDRs |
| **`/24` in AWS** | 251 usable — AWS reserves 5 |
| **Apex CNAME** | Forbidden by DNS; use a Route 53 ALIAS |
| **Health checks** | Never check shared dependencies — one DB blip removes every target |
| **502 during deploy** | Backend keep-alive must exceed the ALB's 60s idle timeout |
| **NLB cross-zone** | 🔴 Off by default; ALB is always on |
| **ACM on EC2** | Not possible — the private key is never exportable |
| **Data transfer** | Cross-AZ is charged both ways; S3 gateway endpoints are free |
| **Service mesh** | Usually "not yet" — it is a platform commitment, not a feature |

## Debugging Cheat Sheet

| Symptom | First Thing to Check |
|---------|---------------------|
| Timeout | Security group inbound, then NACL, then route |
| Connection refused | Is the process bound to `0.0.0.0` and not `127.0.0.1`? |
| Works one direction only | NACL missing the ephemeral outbound rule |
| Intermittent, looks random | NAT `ErrorPortAllocation`, or one AZ misconfigured |
| 502 from the ALB | `target_processing_time = -1`, then keep-alive timeouts |
| 503 from the ALB | No healthy targets — check the health check target |
| All DNS broken in a namespace | Egress NetworkPolicy missing UDP 53 |
| TLS fails in `curl` but works in a browser | Missing intermediate certificate |
| Certificate expired despite ACM | Validation CNAME was deleted — renewal failed silently |
| Slow, "nothing changed" | `curl -w` timing breakdown to localise the layer |
| Works in AZ-a, fails in AZ-b | Compare route tables and NACLs per subnet |

## Cost Traps

| Trap | Fix |
|------|-----|
| Cross-AZ chatter between services | Topology-aware routing |
| S3 traffic through NAT | ✅ Gateway endpoint — free |
| Flow Logs to CloudWatch | Send to S3, query with Athena |
| Interface endpoints × many AZs | Compare against NAT cost for small VPCs |
| Transit Gateway for two VPCs | Peering is free |
| S3 egress direct to users | CloudFront is cheaper per GB |
| Sidecars at 500+ pods | Istio ambient mode |

## Study Path

**Start here →** [Fundamentals](./01-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01, 05: layers, CIDR, security groups | 4–5 hours |
| AWS core | 02, 03: connectivity, load balancing | 4–6 hours |
| Edge & TLS | 04, 06: certificates, CloudFront | 3–4 hours |
| Debugging | 08: tools and playbooks | 2–3 hours |
| Advanced | 07: service mesh tradeoffs | 2 hours |

## Related Topics

- [AWS VPC](../AWS/03-vpc.md) — subnets, route tables, gateways
- [AWS Load Balancers](../AWS/13-load-balancers.md) — listeners and target group basics
- [AWS CloudFront](../AWS/12-cloudfront.md) — distribution setup
- [Linux Networking](../Linux/04-networking.md) — host-level tooling
- [Kubernetes Services & Networking](../Kubernetes/04-services-networking.md) — Service types, Ingress, NetworkPolicy
- [Terraform AWS Resources](../Terraform/06-aws-resources.md) — provisioning all of this as code

---
[← DevOps](../README.md)
