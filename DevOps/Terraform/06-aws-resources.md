# Terraform for AWS Resources

The building blocks you will be asked to write on a whiteboard: a VPC, compute, a database, and an EKS cluster. This file covers the patterns and the traps, not every argument.

## Provider Setup

```hcl
# versions.tf
terraform {
  required_version = "~> 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"   # allow patches, block the 6.0 breaking change
    }
  }
}

provider "aws" {
  region = var.region

  # Tags applied to every resource this provider creates
  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "acme/infrastructure"
    }
  }
}
```

✅ `default_tags` is the cleanest way to enforce tagging. You stop writing `tags = merge(...)` on every resource.

🔴 Never put credentials in the provider block. Use an IAM role — an EC2 instance profile locally, or OIDC in CI.

## VPC — the Foundation

Almost every AWS Terraform question starts here. The shape you need to be able to draw:

```
VPC 10.0.0.0/16
├── Public subnet  eu-west-1a  10.0.0.0/24   → IGW      (ALB, NAT)
├── Public subnet  eu-west-1b  10.0.1.0/24   → IGW
├── Private subnet eu-west-1a  10.0.100.0/24 → NAT      (apps, pods)
├── Private subnet eu-west-1b  10.0.101.0/24 → NAT
├── Isolated       eu-west-1a  10.0.200.0/24 → no route (RDS)
└── Isolated       eu-west-1b  10.0.201.0/24 → no route
```

```hcl
locals {
  azs = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr        # "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true                # required for EKS and RDS endpoints

  tags = { Name = "${var.name}-vpc" }
}

# Public subnets — computed with cidrsubnet, not hard-coded
resource "aws_subnet" "public" {
  for_each = { for i, az in local.azs : az => i }

  vpc_id                  = aws_vpc.main.id
  availability_zone       = each.key
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, each.value)
  map_public_ip_on_launch = true

  tags = {
    Name                     = "${var.name}-public-${each.key}"
    "kubernetes.io/role/elb" = "1"    # tells the ALB controller to use these
  }
}

resource "aws_subnet" "private" {
  for_each = { for i, az in local.azs : az => i }

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, each.value + 100)

  tags = {
    Name                              = "${var.name}-private-${each.key}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}
```

**NAT gateways — the cost decision every interviewer probes:**

```hcl
resource "aws_nat_gateway" "this" {
  # One NAT per AZ in prod (highly available), one shared in dev (cheap)
  for_each = var.single_nat_gateway ? { (local.azs[0]) = 0 } : { for i, az in local.azs : az => i }

  subnet_id     = aws_subnet.public[each.key].id
  allocation_id = aws_eip.nat[each.key].id

  depends_on = [aws_internet_gateway.main]
}
```

| Setup | Cost | Failure Impact |
|-------|------|---------------|
| One NAT per AZ | ~3× | An AZ failure only affects that AZ |
| One shared NAT | 1× | That AZ dies → all private subnets lose egress |

⚠️ Cross-AZ NAT traffic is also charged per GB. A single shared NAT saves on hourly cost but adds data transfer cost.

✅ **VPC endpoints for S3** remove NAT charges for S3 traffic entirely, and they are free for the gateway type:

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = values(aws_route_table.private)[*].id
}
```

**Subnet sizing trap:** on EKS with the VPC CNI, every pod gets a real VPC IP address. A `/24` private subnet holds 251 usable addresses, so roughly 200 pods per subnet including node and ENI overhead. Plan `/20` or larger for private subnets on any cluster you expect to grow.

## Security Groups

```hcl
# ✅ Reference security groups, not CIDR blocks, for internal traffic
resource "aws_security_group" "app" {
  name_prefix = "${var.name}-app-"
  vpc_id      = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true    # other SGs reference this one
  }
}

# Separate rule resources — avoids the "Terraform reverts my manual rule" cycle
resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  description                  = "ALB to app"
}

resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
```

> Define rules as separate `aws_vpc_security_group_*_rule` resources rather than inline `ingress` blocks. Inline blocks make Terraform treat the rule set as one attribute, so any change rewrites all of them.

**Why reference a security group instead of a CIDR:** the ALB's IPs change. `referenced_security_group_id` means "anything in the ALB security group", which stays correct forever and is self-documenting.

## Compute — Autoscaling Group

```hcl
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_launch_template" "app" {
  name_prefix   = "${var.name}-"
  image_id      = data.aws_ami.al2023.id
  instance_type = var.instance_type

  iam_instance_profile { name = aws_iam_instance_profile.app.name }
  vpc_security_group_ids = [aws_security_group.app.id]

  metadata_options {
    http_tokens                 = "required"   # IMDSv2 only — blocks SSRF credential theft
    http_put_response_hop_limit = 1
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 30
      volume_type = "gp3"
      encrypted   = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh.tftpl", {
    environment = var.environment
  }))

  lifecycle { create_before_destroy = true }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.name}-asg"
  vpc_zone_identifier = values(aws_subnet.private)[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"                    # not "EC2" — checks the app, not the host

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  # Roll instances automatically when the launch template changes
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
      instance_warmup        = 120
    }
  }

  lifecycle {
    # Autoscaling owns this at runtime
    ignore_changes = [desired_capacity]
  }
}
```

**Two things interviewers look for here:**

- `health_check_type = "ELB"` — with `"EC2"`, a hung application keeps receiving traffic because the instance is technically running
- `instance_refresh` — without it, changing the launch template affects only *new* instances, and existing ones run the old config indefinitely

## RDS

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "${var.name}-db"
  subnet_ids = values(aws_subnet.isolated)[*].id
}

resource "aws_db_instance" "main" {
  identifier     = "${var.name}-db"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 500          # storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  # Password from Secrets Manager, rotated by AWS — never in Terraform
  manage_master_user_password = true
  master_user_secret_kms_key_id = aws_kms_key.rds.arn
  username                      = "app"

  multi_az                = var.environment == "prod"
  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window           = "03:00-04:00"

  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.name}-final" : null

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  lifecycle {
    prevent_destroy = true
    # AWS applies minor version patches in the maintenance window
    ignore_changes = [engine_version]
  }
}
```

**Arguments that cause a replacement** — every one of these destroys your database:

| Change | Result |
|--------|--------|
| `identifier` | 🔴 Replace |
| `engine` | 🔴 Replace |
| `db_subnet_group_name` | 🔴 Replace |
| `storage_encrypted` (false → true) | 🔴 Replace |
| `instance_class` | ✅ In-place, brief failover |
| `allocated_storage` (increase) | ✅ In-place |

> `manage_master_user_password = true` is the correct modern answer to "where do you put the database password?" AWS generates it, stores it in Secrets Manager, and rotates it. It never appears in your code *or* your state file.

## EKS

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.name
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = values(aws_subnet.private)[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.admin_cidrs   # not 0.0.0.0/0
  }

  # Envelope-encrypt Kubernetes Secrets with your own KMS key
  encryption_config {
    resources = ["secrets"]
    provider { key_arn = aws_kms_key.eks.arn }
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  access_config {
    authentication_mode = "API"   # modern replacement for the aws-auth ConfigMap
  }
}

resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "default"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = values(aws_subnet.private)[*].id

  instance_types = ["m6i.large"]
  capacity_type  = "ON_DEMAND"

  scaling_config {
    min_size     = 2
    max_size     = 10
    desired_size = 3
  }

  update_config { max_unavailable_percentage = 25 }

  lifecycle {
    # Cluster Autoscaler or Karpenter owns this
    ignore_changes = [scaling_config[0].desired_size]
  }
}
```

**Pod-level AWS permissions — IRSA:**

```hcl
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
}

resource "aws_iam_role" "app" {
  name = "${var.name}-app"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.eks.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          # Scoped to one namespace and one service account
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:production:api"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}
```

⚠️ The `:sub` condition is what scopes the role to one service account. Leave it out and any pod in the cluster can assume the role.

✨ **EKS Pod Identity** is the newer, simpler alternative — an add-on plus an association resource, no OIDC provider or trust policy templating. Know IRSA for interviews since most existing clusters use it.

## Structuring an AWS Stack

Where the module boundaries go — a common design question:

```
live/prod/
├── 10-network/     # VPC, subnets, NAT, endpoints    → rarely changes
├── 20-data/        # RDS, ElastiCache, S3            → prevent_destroy
├── 30-platform/    # EKS cluster, node groups, ALB   → monthly
└── 40-apps/        # ECS services, Lambda, DNS       → daily
```

Each directory is its own state file. Numbering shows the dependency order and the apply order for a rebuild from scratch.

**Wiring between layers — tags, not remote state:**

```hcl
# In 30-platform, read the network built by 10-network
data "aws_vpc" "main" {
  tags = { Name = "acme-prod-vpc" }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = { Tier = "private" }
}
```

## Interview Q&A

**Q: Walk me through the Terraform for a production-ready VPC.**

A `/16` VPC with DNS support and hostnames enabled, then three tiers of subnets across at least two availability zones. Public subnets hold the load balancer and NAT gateways and route to an internet gateway. Private subnets hold application instances or pods and route outbound through NAT. Isolated subnets hold the database and have no route to the internet at all. I compute the subnet CIDRs with `cidrsubnet` off the VPC range rather than hard-coding them, and I create them with `for_each` over the AZ list so removing an AZ does not renumber the others. NAT gateways are the main cost decision: one per AZ in production so an AZ failure is contained, one shared in dev to save money. I add a gateway VPC endpoint for S3 because it is free and removes NAT data charges for S3 traffic. Flow logs go on for network debugging and security investigation.

**Q: How do you size private subnets for EKS?**

Larger than people expect, because the AWS VPC CNI gives every pod a real VPC IP address rather than an overlay address. A `/24` has 251 usable IPs, and after node ENIs and warm IP pools you get roughly two hundred pods in that subnet. For any cluster expected to grow, I plan `/20` private subnets, which gives about four thousand addresses per AZ. This matters because it is very hard to fix later — you cannot resize a subnet, so you end up adding secondary CIDR blocks to the VPC or moving to custom networking. The symptom when you get it wrong is pods stuck in `ContainerCreating` with a failed-to-assign-IP error, which looks like a Kubernetes problem but is a VPC design problem.

**Q: Where do you store a database password in Terraform?**

Nowhere in Terraform. On RDS I set `manage_master_user_password = true`, which makes AWS generate the password, store it in Secrets Manager, and handle rotation. The password never appears in the configuration and, importantly, never lands in the state file either. The application reads it from Secrets Manager at runtime using its IAM role. The alternative patterns are all worse: a variable passed in from CI still writes the value into state in plaintext, and a `random_password` resource is stored in state too. This is the general rule with Terraform — anything you pass as a value ends up in state, so the right approach is to create the secret container in Terraform and let something else populate it.

**Q: What Terraform changes to an RDS instance cause data loss?**

The dangerous ones are anything that forces a replacement rather than an in-place update: changing the `identifier`, changing the `engine`, moving to a different `db_subnet_group_name`, or turning on `storage_encrypted` for an existing unencrypted instance. Each of those shows up in the plan as `must be replaced`, which means destroy and create — your data is gone unless a final snapshot is taken and manually restored. Scaling `instance_class` or increasing `allocated_storage` is safe and happens in place, with a brief failover on multi-AZ. The protections I put in place are `prevent_destroy` in the lifecycle block, `deletion_protection = true` on the AWS side, `skip_final_snapshot = false`, and reading every production plan specifically looking for the words "must be replaced".

**Q: How does a pod on EKS get permission to read from S3?**

Through IRSA — IAM Roles for Service Accounts. You register the cluster's OIDC issuer as an IAM identity provider, then create an IAM role whose trust policy allows `sts:AssumeRoleWithWebIdentity` from that provider, with a condition on the `:sub` claim scoping it to one namespace and service account, such as `system:serviceaccount:production:api`. You annotate the Kubernetes service account with the role ARN, and the AWS SDK inside the pod picks up a projected token and exchanges it for temporary credentials. The condition on `:sub` is the security-critical part — without it, any pod in the cluster could assume the role. The newer alternative is EKS Pod Identity, which replaces the OIDC provider and trust policy with a simple association resource and is what I would use on a new cluster.

**Q: Why use `health_check_type = "ELB"` on an autoscaling group?**

Because `"EC2"`, the default, only checks whether the instance itself is running. If your application deadlocks or the process dies but the host stays up, EC2 health checks pass and the autoscaling group keeps that instance in service receiving traffic. `"ELB"` makes the group use the load balancer's target group health check, which actually calls your application's health endpoint, so a hung application gets replaced. The related point is `instance_refresh` on the autoscaling group: without it, changing the launch template only affects newly launched instances, so your existing fleet keeps running the old AMI and old user data indefinitely, and you have drift that no plan will show you.

---
[Terraform Index](./README.md) | [← Advanced Patterns](./05-advanced-patterns.md) | [Testing →](./07-testing.md)
