# Networking

## 💡 **Concept**

Cloud networking isolates resources, controls traffic flow, and routes requests to the right place. In AWS, VPC is the foundation. Everything else — load balancers, security groups, Route 53 — builds on top of it.

**How to answer in an interview:** "I'll put all resources inside a VPC with public subnets for load balancers and private subnets for application servers and databases. Security groups enforce least-privilege access between layers."

---

## VPC — Virtual Private Cloud

A VPC is your private network in AWS. You control the IP range, subnets, and routing.

### Standard 3-tier layout

```
VPC: 10.0.0.0/16
│
├── Public Subnet (10.0.1.0/24, 10.0.2.0/24)   ← ALB, NAT Gateway
│
├── Private Subnet (10.0.3.0/24, 10.0.4.0/24)  ← EC2, ECS tasks
│
└── Database Subnet (10.0.5.0/24, 10.0.6.0/24) ← RDS, ElastiCache
```

**Rules:**
- One subnet per Availability Zone for HA
- Public subnets have a route to the Internet Gateway
- Private subnets route outbound traffic through a NAT Gateway
- Database subnets have no internet route

---

## Security Groups vs NACLs

| | Security Groups | NACLs |
|--|----------------|-------|
| Scope | Instance level | Subnet level |
| State | Stateful | Stateless |
| Rules | Allow only | Allow + Deny |
| Use | Primary enforcement | Extra layer for known bad IPs |

```typescript
interface SecurityGroupRule {
  protocol: "tcp" | "udp" | "icmp" | "-1";
  fromPort: number;
  toPort: number;
  source: string;   // CIDR or another security group ID
}

// ALB security group — allow public HTTPS
const albRules: SecurityGroupRule[] = [
  { protocol: "tcp", fromPort: 443, toPort: 443, source: "0.0.0.0/0" }
];

// App security group — allow only from ALB
const appRules: SecurityGroupRule[] = [
  { protocol: "tcp", fromPort: 8080, toPort: 8080, source: "sg-alb-id" }
];

// DB security group — allow only from app tier
const dbRules: SecurityGroupRule[] = [
  { protocol: "tcp", fromPort: 5432, toPort: 5432, source: "sg-app-id" }
];
```

---

## Load Balancers

AWS offers three types:

| Type | Layer | Use case |
|------|-------|---------|
| **ALB** (Application) | L7 (HTTP) | REST APIs, host/path routing, WebSockets |
| **NLB** (Network) | L4 (TCP) | Ultra-low latency, static IPs, TCP/UDP |
| **Gateway LB** | L3 | Inline security appliances |

### ALB — the default for most systems

```typescript
interface ALBListener {
  port: 443;
  protocol: "HTTPS";
  defaultAction: "forward" | "redirect" | "fixed-response";
  rules: ALBRoutingRule[];
}

interface ALBRoutingRule {
  condition: { path?: string; host?: string };
  targetGroup: string;
}

// Route /api/* to API service, everything else to web frontend
const routingRules: ALBRoutingRule[] = [
  { condition: { path: "/api/*" }, targetGroup: "tg-api" },
  { condition: {}, targetGroup: "tg-web" }
];
```

**ALB features that matter in interviews:**
- **Path-based routing**: send `/api/*` to one target group, `/static/*` to another
- **Host-based routing**: `api.example.com` → API service, `app.example.com` → web app
- **Health checks**: ALB removes unhealthy instances automatically
- **Sticky sessions**: optional; avoid for stateless services

---

## Route 53 — DNS and Traffic Routing

Route 53 provides DNS with built-in health checks and routing policies.

### Routing policies

| Policy | Use case |
|--------|---------|
| **Simple** | Single endpoint |
| **Weighted** | A/B testing (e.g., 90% v1, 10% v2) |
| **Failover** | Primary/secondary with health check |
| **Latency** | Route to lowest-latency region |
| **Geolocation** | Route by user country (compliance, localization) |

**Failover pattern:**
```
Route 53 health check → ALB us-east-1 (primary)
                      → ALB eu-west-1 (secondary, activated if primary fails)
```

---

## VPC Connectivity Patterns

| Need | Solution |
|------|---------|
| Outbound internet from private subnet | NAT Gateway |
| Private access to AWS services (S3, DynamoDB) | VPC Endpoints |
| Connect two VPCs in same or different accounts | VPC Peering |
| Connect on-premises to AWS | VPN or Direct Connect |

> **VPC Endpoints** eliminate NAT Gateway costs for S3 and DynamoDB traffic — a common optimization interviewers expect you to mention.

---

## Common Mistakes

❌ **Putting EC2 in public subnets** — only load balancers belong in public subnets  
❌ **Using the default VPC** — it has no private subnets and bad defaults for production  
❌ **Security groups allowing 0.0.0.0/0 on internal ports** — always restrict to the source security group  
❌ **Missing NAT Gateway in private subnets** — instances can't download updates or reach external APIs

**Key insight:**

> The ALB + private subnets pattern is the baseline for every production system. Put the ALB in public subnets, everything else in private. Security groups should reference each other by ID, not CIDR — that way they stay correct when IPs change.

---
[← Back to SystemDesign](../README.md)
