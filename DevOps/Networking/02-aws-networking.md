# AWS Networking Advanced

Beyond a single VPC: how to connect many VPCs, many accounts, and on-premises networks — and what each option costs.

> For single-VPC basics — subnets, route tables, internet and NAT gateways — see [AWS VPC](../AWS/03-vpc.md).

## VPC Design Patterns

### The Three-Tier Standard

```
VPC 10.0.0.0/16
├── Public   /20  → IGW      ALB, NAT gateways, bastion
├── Private  /20  → NAT      applications, EKS pods
└── Isolated /20  → no route RDS, ElastiCache, Redshift
```

✅ **The isolated tier is what separates a considered design from a default one.** A database with no route to a NAT gateway cannot be exfiltrated to the internet even if the instance is compromised.

⚠️ Isolated subnets need **VPC endpoints** to reach AWS APIs — that is the tradeoff you accept for removing internet egress.

### Hub and Spoke

The pattern for a multi-account organisation.

```
                    ┌──────────────────┐
                    │  Transit Gateway │
                    └────────┬─────────┘
        ┌────────────┬───────┼───────┬────────────┐
        ↓            ↓       ↓       ↓            ↓
   shared-services  prod  staging   dev    on-premises
   (DNS, AD, tools)                         (VPN / DX)
```

✅ Each spoke connects once to the hub instead of to every other spoke. Adding the sixth VPC means one attachment, not five peering connections.

## Connectivity Options

| Option | Topology | Transitive? | Bandwidth | Cost Shape |
|--------|----------|-------------|-----------|-----------|
| **VPC Peering** | 1-to-1 | 🔴 No | No limit | ✅ Free (same-AZ data transfer only) |
| **Transit Gateway** | Hub and spoke | ✅ Yes | 50 Gbps per attachment | Per attachment-hour + per GB |
| **PrivateLink** | Service endpoint | N/A — one service | Scales with the NLB | Per endpoint-hour + per GB |
| **Site-to-Site VPN** | To on-premises | Via TGW | ~1.25 Gbps per tunnel | Per connection-hour + per GB |
| **Direct Connect** | To on-premises | Via TGW | 1–100 Gbps dedicated | Port-hour + per GB (cheaper egress) |

### VPC Peering

```hcl
resource "aws_vpc_peering_connection" "prod_to_shared" {
  vpc_id      = aws_vpc.prod.id
  peer_vpc_id = aws_vpc.shared.id
  auto_accept = true
}

# 🔴 Routes must be added on BOTH sides — this is the usual omission
resource "aws_route" "prod_to_shared" {
  route_table_id            = aws_route_table.prod_private.id
  destination_cidr_block    = aws_vpc.shared.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.prod_to_shared.id
}

resource "aws_route" "shared_to_prod" {
  route_table_id            = aws_route_table.shared_private.id
  destination_cidr_block    = aws_vpc.prod.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.prod_to_shared.id
}
```

🔴 **Peering is not transitive.** If A peers with B, and B peers with C, then A **cannot** reach C. This is the most-asked peering question.

```
A ←→ B ←→ C

A to B: ✅
B to C: ✅
A to C: 🔴 no route, and you cannot create one
```

✅ Beyond about four VPCs, peering becomes n(n-1)/2 connections. Six VPCs is 15 peerings, each needing routes on both sides. Move to Transit Gateway.

⚠️ **Overlapping CIDRs make peering impossible.** There is no NAT option and no workaround — one side must be renumbered, which for a live VPC means rebuilding it.

### Transit Gateway

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description                     = "acme hub"
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "disable"  # ✅ control routing explicitly
  default_route_table_propagation = "disable"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.prod.id
  subnet_ids         = values(aws_subnet.prod_tgw)[*].id  # one small subnet per AZ
}
```

✅ **Disable default association and propagation.** With defaults enabled, every VPC can reach every other VPC — including dev reaching production. Explicit route tables let you enforce isolation.

**Segmentation with route tables — the real reason to use TGW:**

```
Route table "prod":   routes to shared-services and on-premises only
Route table "dev":    routes to shared-services only
Route table "shared": routes to everything
```

```
dev  →  shared:      ✅
dev  →  prod:        🔴 blocked by routing, not just security groups
prod →  on-premises: ✅
```

> This is network-level segmentation. It holds even if someone misconfigures a security group, which is why auditors like it.

⚠️ **TGW has a per-attachment hourly charge plus per-GB data processing.** For two VPCs that talk constantly, peering is free and TGW is not. The crossover is roughly four VPCs, or whenever you need transitive routing or segmentation.

### PrivateLink

Expose **one service** privately, rather than connecting whole networks.

```
Consumer VPC                        Provider VPC
┌──────────────┐                   ┌──────────────┐
│ Interface    │ ─────────────────► │  NLB         │
│ endpoint     │   AWS backbone     │  → service   │
│ (an ENI)     │                    └──────────────┘
└──────────────┘
```

✅ **What makes PrivateLink different from peering:**

- Only the specific service is reachable, not the whole VPC
- Traffic is **unidirectional** — the consumer initiates, the provider cannot reach back
- 🔴 **Overlapping CIDRs are fine** — the endpoint is an ENI in the consumer's own subnet

> ✅ **PrivateLink is the correct answer for exposing a service to another company, or to a VPC whose address range overlaps yours.** It is also how AWS itself exposes services to your VPC.

**VPC endpoints — the same technology, for AWS services:**

| Type | Services | Cost | Mechanism |
|------|----------|------|-----------|
| **Gateway** | S3, DynamoDB only | ✅ Free | A route table entry |
| **Interface** | Everything else | Per hour + per GB | An ENI with a private IP |

```hcl
# ✅ Free, and removes NAT data charges for S3 traffic entirely
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = values(aws_route_table.private)[*].id
}

# Interface endpoints — required for isolated subnets to reach AWS APIs
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = values(aws_subnet.private)[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true   # ✅ so the normal AWS hostname resolves privately
}
```

✨ **The S3 gateway endpoint is free money.** Any workload pulling significant data from S3 through a NAT gateway is paying per-GB NAT charges for traffic that could be free.

⚠️ Interface endpoints cost per hour **per AZ**. Ten endpoints across three AZs is thirty billed ENIs — for a small dev VPC, a NAT gateway may be cheaper.

## Hybrid Connectivity

| | Site-to-Site VPN | Direct Connect |
|---|---|---|
| **Path** | Over the public internet, encrypted | ✅ Private fibre |
| **Bandwidth** | ~1.25 Gbps per tunnel | 1–100 Gbps |
| **Latency** | Variable | ✅ Consistent |
| **Setup time** | ✅ Under an hour | Weeks to months |
| **Cost** | Low hourly + data | High port fee, ✅ cheaper egress |
| **Encryption** | ✅ Built in (IPsec) | 🔴 None — add a VPN or MACsec |

🔴 **Direct Connect is not encrypted by default.** It is private, which is not the same as encrypted. For regulated data you run an IPsec VPN over the Direct Connect link.

✅ **The standard production pattern:** Direct Connect as primary, Site-to-Site VPN as automatic backup over the internet. BGP handles the failover.

```
On-premises ──── Direct Connect (primary, BGP preferred) ────► TGW
            └─── Site-to-Site VPN (backup) ──────────────────►
```

## DNS Across the Hybrid Boundary

```hcl
# Resolve on-premises names from inside AWS
resource "aws_route53_resolver_endpoint" "outbound" {
  direction          = "OUTBOUND"
  security_group_ids = [aws_security_group.resolver.id]

  ip_address { subnet_id = aws_subnet.private["eu-west-1a"].id }
  ip_address { subnet_id = aws_subnet.private["eu-west-1b"].id }
}

resource "aws_route53_resolver_rule" "corp" {
  domain_name          = "corp.acme.internal"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip { ip = "192.168.10.53" }   # the on-premises DNS server
}
```

| Endpoint | Direction |
|----------|-----------|
| **Outbound** | AWS resolves on-premises names |
| **Inbound** | On-premises resolves AWS private zones |

✅ Share one **private hosted zone** from the shared-services account and associate it with every VPC, rather than duplicating zones per account.

## Data Transfer Costs

The question that separates people who have owned an AWS bill from those who have not.

| Path | Cost |
|------|------|
| Within one AZ, private IPs | ✅ Free |
| 🔴 **Between AZs in a region** | Charged **both directions** |
| Between regions | Charged, higher |
| Out to the internet | Most expensive |
| Through a NAT gateway | Per-GB processing **on top of** transfer |
| Via VPC peering, same AZ | ✅ Free |
| Via Transit Gateway | Per-GB processing per attachment |
| To S3 via gateway endpoint | ✅ Free |

🔴 **Cross-AZ transfer is the silent line item.** A chatty microservice architecture spread across three AZs pays for a large share of its own internal traffic.

**How to reduce it:**

| Technique | Effect |
|-----------|--------|
| **Topology-aware routing** in Kubernetes | Keeps service-to-service traffic in-AZ |
| **S3 and DynamoDB gateway endpoints** | Removes NAT charges entirely |
| **CloudFront in front of S3** | Cheaper egress than S3 direct |
| **Compress payloads** | Directly proportional saving |
| **Consolidate chatty services** | Fewer network hops |

⚠️ Multi-AZ is a resilience requirement, so the answer is never "use one AZ" — it is to keep traffic in-AZ where possible while remaining spread for failure tolerance.

## IPv6

```hcl
resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
}

# Egress-only internet gateway = the IPv6 equivalent of a NAT gateway
resource "aws_egress_only_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}
```

✅ **The real driver for IPv6 is IPv4 address exhaustion in large EKS clusters**, plus the AWS charge for public IPv4 addresses. IPv6 addresses are effectively unlimited, so pod IP exhaustion stops being a design constraint.

⚠️ Dual-stack is more complex to debug and not every AWS service supports IPv6. Adopt it for a reason, not for novelty.

## Interview Q&A

**Q: Is VPC peering transitive, and what do you do when you need it to be?**

No. If VPC A peers with B and B peers with C, A cannot reach C — and you cannot create a route to make it work, because AWS will not route traffic through an intermediate VPC's peering connection. The workaround for a small number of VPCs is a full mesh, but that scales as n(n-1)/2, so six VPCs means fifteen peering connections each needing route entries on both sides, which becomes unmanageable and error-prone. Transit Gateway is the answer: each VPC attaches once to a central hub, routing is transitive by default, and adding the tenth VPC is one attachment rather than nine peerings. The cost consideration is real though — peering has no hourly charge while TGW bills per attachment-hour plus per-gigabyte processing, so for two VPCs that exchange a lot of data, peering is genuinely cheaper.

**Q: When would you use PrivateLink instead of peering or Transit Gateway?**

When you want to expose one service rather than connect two networks. Peering and TGW join address spaces, so anything with a route and permissive security groups can reach anything else. PrivateLink puts an elastic network interface in the consumer's own subnet pointing at a network load balancer in the provider's VPC, so only that specific service is reachable and the connection is unidirectional — the provider cannot initiate anything back towards the consumer. Two properties make it the only option in some cases: it works across organisations, which is how SaaS vendors expose services to customer VPCs, and it works when the two VPCs have overlapping CIDR blocks, because the endpoint has an address in the consumer's range. Overlapping CIDRs make peering flatly impossible with no workaround.

**Q: What is the difference between a gateway and an interface VPC endpoint?**

A gateway endpoint exists only for S3 and DynamoDB, works by adding a prefix-list entry to your route table, and is free. An interface endpoint works for almost every other AWS service and is implemented as an actual elastic network interface with a private IP in your subnet, billed per hour per availability zone plus per gigabyte. The practical significance is cost. The S3 gateway endpoint is essentially free money for any workload pulling data from S3, because that traffic would otherwise cross a NAT gateway and incur per-gigabyte processing charges on top of transfer. Interface endpoints need more thought: ten of them across three AZs is thirty billed ENIs, and for a low-traffic development VPC a single NAT gateway can work out cheaper. Where they become mandatory is isolated subnets with no NAT at all, since that is the only way to reach AWS APIs.

**Q: Direct Connect is a private link. Is the traffic encrypted?**

No, and this trips people up. Direct Connect gives you a dedicated physical circuit that does not traverse the public internet, which reduces exposure and gives consistent latency, but the traffic itself is unencrypted at the network layer. Private and encrypted are different properties. For regulated data — anything under PCI DSS, HIPAA, or similar — you run an IPsec VPN over the Direct Connect link, or use MACsec on supported ports, so you get both the dedicated path and encryption in transit. The standard production topology is Direct Connect as the primary path with a Site-to-Site VPN over the internet as automatic backup, with BGP handling failover, since a single Direct Connect circuit is a single point of failure and a second one takes months to provision.

**Q: Why is our AWS data transfer bill so high?**

Usually cross-availability-zone traffic, which is charged in both directions and is easy to generate accidentally. A microservices architecture spread across three AZs for resilience will, without topology awareness, send roughly two-thirds of its service-to-service calls across an AZ boundary and pay for all of it. The second common cause is NAT gateway processing: every gigabyte through a NAT gateway carries a processing charge on top of the transfer cost, so workloads pulling large objects from S3 through NAT are paying for something a free gateway endpoint would eliminate. Beyond those, internet egress is the most expensive path, and serving assets from S3 directly rather than through CloudFront costs more per gigabyte. The fix is not to collapse to one AZ, since multi-AZ is a resilience requirement — it is topology-aware routing to keep traffic in-AZ, gateway endpoints for S3 and DynamoDB, compression, and CloudFront in front of static content.

**Q: How do you enforce that development cannot reach production at the network level?**

Transit Gateway route tables, rather than relying on security groups. When you create a TGW, you disable default route table association and propagation, then define explicit route tables per environment: the dev route table contains routes to shared services only, the prod route table contains routes to shared services and on-premises, and neither contains a route to the other. Without a route, traffic cannot flow regardless of how permissive anyone's security groups are. That is what makes it valuable for compliance — it is a control at the routing layer that survives human error in the layers above, and it is auditable as configuration rather than as the union of hundreds of security group rules. The strongest version of this is separate AWS accounts per environment as well, so IAM provides a second independent boundary.

---
[Networking Index](./README.md) | [← Fundamentals](./01-fundamentals.md) | [Load Balancing →](./03-load-balancing.md)
