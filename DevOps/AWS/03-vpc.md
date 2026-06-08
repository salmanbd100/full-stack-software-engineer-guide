# VPC (Virtual Private Cloud)

A VPC is your own isolated network inside AWS. Think of it as a private data centre you control. Every resource you launch — EC2, RDS, Lambda in a VPC — lives inside one.

## VPC Overview

```
AWS Region (us-east-1)
└── VPC: 10.0.0.0/16  (65,536 IPs)
    ├── Availability Zone A (us-east-1a)
    │   ├── Public Subnet:  10.0.1.0/24  (256 IPs)
    │   └── Private Subnet: 10.0.2.0/24  (256 IPs)
    ├── Availability Zone B (us-east-1b)
    │   ├── Public Subnet:  10.0.3.0/24
    │   └── Private Subnet: 10.0.4.0/24
    └── Availability Zone C (us-east-1c)
        ├── Public Subnet:  10.0.5.0/24
        └── Private Subnet: 10.0.6.0/24
```

**CIDR blocks:** The `/16` gives you 65,536 addresses for the whole VPC. Each subnet carves out a `/24` (256 addresses). AWS reserves 5 IPs per subnet for its own use.

## Subnets: Public vs Private

> **The difference between public and private is the route table — not a label on the subnet.**

A subnet is "public" if its route table has a route to an Internet Gateway. That's it.

| | Public Subnet | Private Subnet |
|--|--------------|----------------|
| **Route to IGW** | ✅ Yes (`0.0.0.0/0 → igw-xxx`) | ❌ No |
| **Inbound from internet** | ✅ Possible | ❌ Not possible |
| **Outbound to internet** | ✅ Direct | ✅ Via NAT Gateway |
| **Typical resources** | ALB, Bastion Host, NAT Gateway | App servers, databases |

## Internet Gateway (IGW)

An IGW connects your VPC to the internet. It is horizontally scaled and fully managed — no bandwidth limits.

```
Internet
    │
    ▼
Internet Gateway (IGW)
    │
    ▼
Public Subnet Route Table:
  0.0.0.0/0  →  igw-abc123   ← this route makes the subnet "public"
  10.0.0.0/16 → local
    │
    ▼
EC2 instance (needs a public IP or Elastic IP)
```

Without a public IP on the instance, the IGW route alone is not enough — the instance still can't receive traffic from the internet.

## NAT Gateway

A NAT Gateway lets private subnet resources reach the internet **outbound only**. Inbound connections are blocked. This is how app servers get software updates without being exposed to the internet.

```
Private Subnet
    │  (outbound request: apt-get update)
    ▼
Private Route Table:
  0.0.0.0/0  →  nat-xyz789   ← route to NAT Gateway
    │
    ▼
NAT Gateway (lives in a PUBLIC subnet, has Elastic IP)
    │
    ▼
Internet Gateway
    │
    ▼
Internet
```

⚠️ **NAT Gateway costs money.** It charges per hour and per GB of data processed. One per AZ is the right setup for production (avoid a single point of failure).

✅ Place NAT Gateway in a public subnet. It needs a route to the IGW itself.

## Security Groups

Security Groups act as a **virtual firewall at the instance level**.

**Key rules:**
- Stateful — if you allow inbound traffic, the reply is automatically allowed outbound
- Allow rules only — no explicit deny rules
- All rules are evaluated; most permissive rule wins
- Applied to network interfaces (ENIs), not subnets

```bash
# Allow inbound HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow inbound on port 5432 only from the app security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-db-99999 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-app-11111
```

> Referencing another security group (not a CIDR) is better than using IPs. It works even when instances scale or change IPs.

## NACLs (Network Access Control Lists)

NACLs act as a **firewall at the subnet level**.

**Key rules:**
- Stateless — you must allow both inbound AND outbound for a connection to work
- Allow and deny rules
- Rules are evaluated in order (lowest number first)
- Applies to all resources in the subnet

```
NACL Rule Example — Inbound:
Rule 100:  ALLOW TCP  0.0.0.0/0  port 443
Rule 200:  ALLOW TCP  0.0.0.0/0  port 1024-65535  ← ephemeral ports (return traffic)
Rule *:    DENY  ALL  0.0.0.0/0
```

⚠️ Forgetting ephemeral ports is the most common NACL mistake. Return traffic uses ports 1024–65535. If you block those, responses never reach the client.

## Security Groups vs NACLs

| Feature | Security Group | NACL |
|---------|---------------|------|
| **Level** | Instance (ENI) | Subnet |
| **State** | Stateful | Stateless |
| **Rules** | Allow only | Allow + Deny |
| **Evaluation** | All rules | In order (lowest first) |
| **Default** | Deny all inbound | Allow all |
| **Use for** | Fine-grained per-service control | Broad subnet-level blocking |

**When to use both:**
- Use Security Groups for all normal access control
- Add NACLs to block specific IPs at the subnet level (bad actors, DDoS mitigation)

## 3-Tier VPC Design Pattern

This is the standard pattern for production web applications.

```
Internet
    │
    ▼
Internet Gateway
    │
    ▼
┌──────────────────────────────────────┐
│  PUBLIC SUBNET (10.0.1.0/24)         │
│  Application Load Balancer           │
│  NAT Gateway                         │
│  Security Group: allow 80, 443       │
└──────────────────────────────────────┘
    │  (forwards to app tier)
    ▼
┌──────────────────────────────────────┐
│  PRIVATE SUBNET — App (10.0.2.0/24)  │
│  EC2 / ECS / Lambda                  │
│  Security Group: allow 8080 from ALB │
└──────────────────────────────────────┘
    │  (queries database)
    ▼
┌──────────────────────────────────────┐
│  PRIVATE SUBNET — DB (10.0.3.0/24)   │
│  RDS / Aurora                        │
│  Security Group: allow 5432 from App │
└──────────────────────────────────────┘
```

**Why this design works:**
- ALB is public-facing; app and DB have no public IPs
- DB only accepts traffic from the app security group
- NAT Gateway allows app servers to pull updates outbound

## VPC Peering and Transit Gateway

**VPC Peering** — connects two VPCs directly. Traffic stays on the AWS backbone.
- ✅ Simple, low latency, no bandwidth limit
- ❌ Does not support transitive routing (A→B→C does not work; you need A→C directly)

**Transit Gateway** — a central hub that connects many VPCs and on-premise networks.
- ✅ Scales to thousands of VPCs
- ✅ Supports transitive routing
- ❌ Costs more than peering

Use peering for two VPCs. Use Transit Gateway for a mesh of 3+ VPCs.

## Useful CLI Commands

```bash
# Create a VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# Create a subnet
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

# Create and attach an Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-abc123 \
  --vpc-id vpc-12345678

# Add route to IGW in the public route table
aws ec2 create-route \
  --route-table-id rtb-pub-111 \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-abc123
```

## Interview Q&A

**Q: What is the difference between a public and a private subnet?**

The difference is the route table. A public subnet has a route to an Internet Gateway (`0.0.0.0/0 → igw-xxx`). A private subnet does not. The word "public" or "private" in the subnet name is just a label — AWS does not enforce it.

**Q: What is the difference between a Security Group and a NACL?**

Security Groups are stateful and operate at the instance level. If you allow inbound traffic, return traffic is automatically allowed. NACLs are stateless and operate at the subnet level. You must explicitly allow both directions. Use Security Groups for day-to-day access control. Use NACLs to block specific IPs or add a subnet-wide deny layer.

**Q: What is the difference between a NAT Gateway and an Internet Gateway?**

An Internet Gateway connects the VPC to the internet bidirectionally. Public subnet resources with a public IP can receive inbound traffic through it. A NAT Gateway only allows outbound traffic — it translates private IPs to its own public IP. Private subnet resources can initiate connections to the internet, but nothing from the internet can reach them directly.

**Q: How would you design a VPC for a 3-tier web application?**

Use three layers of subnets across multiple AZs. Put the ALB in public subnets — it needs to receive internet traffic. Put app servers in private subnets — they only need to talk to the ALB and the database. Put the database in separate private subnets — it should only accept traffic from the app layer's security group. Add a NAT Gateway in the public subnet so app servers can pull updates. Use Security Groups to enforce least-privilege access between each tier.

**Q: When would you use VPC Peering vs Transit Gateway?**

Use VPC Peering to connect two VPCs. It is simpler and cheaper. Use Transit Gateway when you have three or more VPCs and need transitive routing — peering cannot do A→B→C, but Transit Gateway can. Also use Transit Gateway when connecting VPCs to on-premise networks via VPN or Direct Connect.

---
[← IAM](./02-iam.md) | [EC2 →](./04-ec2.md)
