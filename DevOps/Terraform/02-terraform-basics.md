# Terraform Basics for DevOps

## Overview

Terraform is the leading Infrastructure as Code (IaC) tool for provisioning and managing cloud infrastructure. It uses declarative configuration files to define infrastructure that can be versioned, shared, and reused. This guide covers Terraform essentials for AWS-focused DevOps engineers.

**Why Terraform:**
- Infrastructure as Code (version control, review, reuse)
- Declarative (describe what, not how)
- Provider agnostic (AWS, Azure, GCP, 1000+ providers)
- State management (tracks real infrastructure)
- Plan before apply (preview changes)
- Immutable infrastructure (destroy/recreate vs modify)

**Terraform vs Alternatives:**

| Feature | Terraform | CloudFormation | Ansible |
|---------|-----------|----------------|---------|
| **Type** | Declarative IaC | Declarative IaC | Procedural Config Mgmt |
| **Clouds** | Multi-cloud | AWS only | Any (via modules) |
| **State** | Explicit state file | Implicit (AWS) | No state |
| **Language** | HCL | JSON/YAML | YAML |
| **Best For** | Multi-cloud IaC | AWS-only shops | Config management |

## What is Terraform?

### Key Concepts

**Infrastructure as Code (IaC)**: Define infrastructure in code files instead of manual configuration
**Declarative**: Specify *what* you want, not *how* to create it
**Provider**: Plugin that manages resources (AWS, Azure, GCP, etc.)
**Resource**: Infrastructure component (EC2, S3, VPC, etc.)
**State**: Terraform's record of managed infrastructure
**Plan**: Preview of changes before applying
**Apply**: Execute planned changes

### Terraform Workflow

```
1. Write     - Define infrastructure in .tf files
2. Init      - Initialize working directory
3. Plan      - Preview changes
4. Apply     - Create/update infrastructure
5. Destroy   - Remove infrastructure (when needed)
```

## Installation

### Linux/Mac

```bash
# Download Terraform (check for latest version)
curl -O https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip

# Unzip
unzip terraform_1.5.0_linux_amd64.zip

# Move to PATH
sudo mv terraform /usr/local/bin/

# Verify installation
terraform version
```

### Using tfenv (Version Manager)

```bash
# Install tfenv
git clone https://github.com/tfutils/tfenv.git ~/.tfenv
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install Terraform version
tfenv install 1.5.0
tfenv use 1.5.0

# List versions
tfenv list
```

## HCL Syntax (HashiCorp Configuration Language)

### Basic Syntax

```hcl
# Single-line comment
// Also single-line comment
/* Multi-line
   comment */

# Block structure
<BLOCK_TYPE> "<BLOCK_LABEL>" "<BLOCK_LABEL>" {
  # Block body
  <IDENTIFIER> = <EXPRESSION>
}

# Examples:
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "WebServer"
    Env  = "Production"
  }
}
```

### Data Types

```hcl
# String
variable "region" {
  type    = string
  default = "us-east-1"
}

# Number
variable "instance_count" {
  type    = number
  default = 3
}

# Boolean
variable "enable_monitoring" {
  type    = bool
  default = true
}

# List
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Map
variable "instance_types" {
  type = map(string)
  default = {
    dev  = "t2.micro"
    prod = "t3.large"
  }
}

# Object
variable "server_config" {
  type = object({
    instance_type = string
    ami          = string
    disk_size    = number
  })
  default = {
    instance_type = "t2.micro"
    ami          = "ami-12345678"
    disk_size    = 20
  }
}

# Set (unique values)
variable "security_groups" {
  type    = set(string)
  default = ["sg-12345", "sg-67890"]
}

# Tuple (ordered collection)
variable "mixed_list" {
  type    = tuple([string, number, bool])
  default = ["example", 42, true]
}
```

## Terraform Configuration Files

### Project Structure

```
terraform-project/
├── main.tf              # Primary resource definitions
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── providers.tf         # Provider configuration
├── terraform.tfvars     # Variable values (don't commit secrets!)
├── terraform.tfstate    # State file (managed by Terraform)
├── .terraform/          # Terraform working directory
└── modules/             # Reusable modules
    └── vpc/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### main.tf Example

```hcl
# main.tf - EC2 instance with VPC

# Provider configuration
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg"
  description = "Security group for web server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-web-sg"
  }
}

# EC2 Instance
resource "aws_instance" "web" {
  count = var.instance_count

  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  key_name               = var.key_name

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y nginx
              systemctl start nginx
              systemctl enable nginx
              echo "<h1>Instance ${count.index + 1}</h1>" > /var/www/html/index.html
              EOF

  tags = {
    Name = "${var.project_name}-web-${count.index + 1}"
  }
}
```

### variables.tf

```hcl
# variables.tf

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
  default     = "us-east-1a"
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "SSH key pair name"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed for SSH access"
  type        = string
  default     = "0.0.0.0/0"
}
```

### outputs.tf

```hcl
# outputs.tf

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.web.id
}

output "instance_ids" {
  description = "EC2 instance IDs"
  value       = aws_instance.web[*].id
}

output "instance_public_ips" {
  description = "Public IP addresses of instances"
  value       = aws_instance.web[*].public_ip
}

output "instance_private_ips" {
  description = "Private IP addresses of instances"
  value       = aws_instance.web[*].private_ip
}

output "load_balancer_url" {
  description = "URL to access instances"
  value       = "http://${aws_instance.web[0].public_ip}"
}

# Sensitive output
output "ssh_command" {
  description = "SSH command to connect to first instance"
  value       = "ssh -i ${var.key_name}.pem ubuntu@${aws_instance.web[0].public_ip}"
  sensitive   = false
}
```

### terraform.tfvars

```hcl
# terraform.tfvars - Variable values
# WARNING: Don't commit this file if it contains secrets!

project_name      = "myapp"
environment       = "production"
aws_region        = "us-east-1"
instance_count    = 2
instance_type     = "t3.medium"
key_name          = "my-keypair"
allowed_ssh_cidr  = "203.0.113.0/24"  # Your IP range
```

## Terraform Commands

### Initialize

```bash
# Initialize working directory
terraform init

# Reconfigure backend
terraform init -reconfigure

# Upgrade provider versions
terraform init -upgrade

# Don't prompt for input
terraform init -input=false
```

### Plan

```bash
# Preview changes
terraform plan

# Save plan to file
terraform plan -out=tfplan

# Target specific resource
terraform plan -target=aws_instance.web

# Use specific var file
terraform plan -var-file="prod.tfvars"

# Pass variables directly
terraform plan -var="instance_count=3"

# Refresh state and plan
terraform plan -refresh-only
```

### Apply

```bash
# Apply changes
terraform apply

# Apply saved plan
terraform apply tfplan

# Auto-approve (no confirmation prompt)
terraform apply -auto-approve

# Target specific resource
terraform apply -target=aws_instance.web

# Use specific var file
terraform apply -var-file="prod.tfvars"

# Parallelism (default 10)
terraform apply -parallelism=20
```

### Destroy

```bash
# Destroy all resources
terraform destroy

# Auto-approve destruction
terraform destroy -auto-approve

# Destroy specific resource
terraform destroy -target=aws_instance.web

# Use specific var file
terraform destroy -var-file="prod.tfvars"
```

### State Commands

```bash
# List resources in state
terraform state list

# Show resource details
terraform state show aws_instance.web

# Remove resource from state (doesn't destroy)
terraform state rm aws_instance.web

# Move resource in state
terraform state mv aws_instance.web aws_instance.web_server

# Pull remote state
terraform state pull

# Push local state to remote
terraform state push

# Refresh state
terraform refresh
```

### Other Commands

```bash
# Validate configuration
terraform validate

# Format code
terraform fmt
terraform fmt -recursive

# Show outputs
terraform output
terraform output instance_public_ips

# Show providers
terraform providers

# Import existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Unlock state
terraform force-unlock LOCK_ID

# Show Terraform version
terraform version

# Get provider schema
terraform providers schema -json

# Create graph (requires graphviz)
terraform graph | dot -Tpng > graph.png
```

## State Management

### Local State

```bash
# Default: terraform.tfstate in current directory
# ❌ Problems:
# - No collaboration
# - No locking
# - Risk of data loss
# - Stored secrets in plaintext
```

### Remote State (S3 Backend)

```hcl
# backend.tf

terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true

    # Optional
    role_arn       = "arn:aws:iam::123456789012:role/TerraformRole"
    profile        = "terraform"
  }
}
```

### Create S3 Backend

```bash
# 1. Create S3 bucket
aws s3 mb s3://my-terraform-state --region us-east-1

# 2. Enable versioning
aws s3api put-bucket-versioning \
    --bucket my-terraform-state \
    --versioning-configuration Status=Enabled

# 3. Enable encryption
aws s3api put-bucket-encryption \
    --bucket my-terraform-state \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'

# 4. Block public access
aws s3api put-public-access-block \
    --bucket my-terraform-state \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 5. Create DynamoDB table for locking
aws dynamodb create-table \
    --table-name terraform-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### State Locking

```hcl
# Prevents concurrent modifications
# Automatically handled with DynamoDB table

# If locked, you'll see:
# Error: Error locking state: Error acquiring the state lock

# Force unlock (use carefully!)
terraform force-unlock <LOCK_ID>
```

## Expressions and Functions

### References

```hcl
# Resource reference
resource "aws_instance" "web" {
  ami = data.aws_ami.ubuntu.id  # Reference data source
  vpc_security_group_ids = [aws_security_group.web.id]  # Reference resource
}

# Variable reference
instance_type = var.instance_type

# Local value reference
name = local.instance_name

# Module output reference
vpc_id = module.vpc.vpc_id
```

### String Functions

```hcl
# format - Format string
name = format("%s-%s", var.project, var.environment)

# join - Join list elements
tags = join(",", var.tag_list)

# split - Split string
parts = split("-", "dev-us-east-1")

# upper/lower - Change case
env = upper(var.environment)  # "PRODUCTION"

# substr - Substring
short = substr(var.name, 0, 5)

# replace - Replace substring
clean = replace(var.name, " ", "-")
```

### Collection Functions

```hcl
# length - Get length
count = length(var.availability_zones)  # 3

# concat - Combine lists
all_zones = concat(var.us_zones, var.eu_zones)

# merge - Combine maps
all_tags = merge(var.default_tags, var.custom_tags)

# element - Get element by index
first_az = element(var.availability_zones, 0)

# lookup - Get map value
instance_type = lookup(var.types, var.environment, "t2.micro")

# contains - Check if list contains value
has_prod = contains(var.environments, "production")
```

### Numeric Functions

```hcl
# min/max - Get minimum/maximum
min_size = min(var.size1, var.size2, var.size3)
max_size = max(var.size1, var.size2, var.size3)

# floor/ceil - Round down/up
rounded_down = floor(var.number)
rounded_up = ceil(var.number)
```

### Conditional Expressions

```hcl
# Ternary operator
instance_type = var.environment == "production" ? "t3.large" : "t2.micro"

# Count with condition
count = var.create_instance ? 1 : 0

# Dynamic blocks
dynamic "ingress" {
  for_each = var.enable_https ? [443] : []
  content {
    from_port = ingress.value
    to_port   = ingress.value
    protocol  = "tcp"
  }
}
```

### for Expressions

```hcl
# Transform list
upper_zones = [for az in var.availability_zones : upper(az)]

# Filter list
prod_envs = [for env in var.environments : env if env == "prod"]

# Transform map
instance_arns = {
  for name, instance in aws_instance.web :
  name => instance.arn
}

# With filtering
large_instances = {
  for name, instance in aws_instance.web :
  name => instance.id
  if instance.instance_type == "t3.large"
}
```

## Dynamic Blocks

```hcl
# Dynamic ingress rules
resource "aws_security_group" "web" {
  name = "web-sg"

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}

# Variables
variable "ingress_rules" {
  type = list(object({
    description = string
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))

  default = [
    {
      description = "HTTP"
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "HTTPS"
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}
```

## Interview Questions

**Q1: What is Terraform state and why is it important?**
A: State is Terraform's record of managed infrastructure. It maps configuration to real resources, tracks metadata, and enables performance optimization. Without state, Terraform can't determine what changes are needed.

**Q2: What's the difference between `terraform plan` and `terraform apply`?**
A: `plan` shows what changes will be made without executing them. `apply` actually creates/modifies/destroys infrastructure. Best practice: Always run `plan` first to review changes.

**Q3: How do you manage secrets in Terraform?**
A:
1. Use AWS Secrets Manager/Parameter Store
2. Use environment variables: `TF_VAR_password`
3. Use `.tfvars` files (add to .gitignore)
4. Never commit `terraform.tfvars` with secrets
5. Use `-var-file` for environment-specific configs

**Q4: What's the difference between `count` and `for_each`?**
A:
- `count` creates N identical resources (accessed by index)
- `for_each` creates resources from a map/set (accessed by key)
- `for_each` is better when resources may be added/removed (no index shifting)

**Q5: How do you import existing infrastructure into Terraform?**
```bash
# 1. Write resource configuration
resource "aws_instance" "web" {
  # ... configuration ...
}

# 2. Import existing resource
terraform import aws_instance.web i-1234567890abcdef0

# 3. Verify state
terraform state show aws_instance.web

# 4. Adjust configuration to match
terraform plan  # Should show no changes
```

**Q6: What's terraform taint and when would you use it?**
A: `terraform taint` marks a resource for recreation on next apply. Useful when a resource is damaged or needs to be rebuilt. In Terraform 0.15.2+, use `terraform apply -replace` instead.

**Q7: How do you handle multiple environments (dev, staging, prod)?**
A: Multiple approaches:
1. Separate directories with different `.tfvars`
2. Workspaces: `terraform workspace new prod`
3. Separate state files with different backends
4. Terragrunt for DRY configurations

Best practice: Separate directories with environment-specific `.tfvars` files.

## Summary

**Core Concepts:**

1. **Terraform Workflow:**
   - ✅ **Write**: Define infrastructure in `.tf` files (HCL)
   - ✅ **Init**: `terraform init` (download providers)
   - ✅ **Plan**: `terraform plan` (preview changes)
   - ✅ **Apply**: `terraform apply` (create infrastructure)
   - ✅ **Destroy**: `terraform destroy` (remove infrastructure)

2. **Key Components:**
   - **Provider**: Plugin for cloud/service (AWS, Azure, GCP)
   - **Resource**: Infrastructure component (EC2, S3, VPC)
   - **Data Source**: Read-only information (AMI, VPC)
   - **Variable**: Input parameters
   - **Output**: Exported values
   - **Module**: Reusable configuration

3. **State Management:**
   - ✅ `terraform.tfstate` tracks real infrastructure
   - ✅ Remote state for team collaboration (S3 + DynamoDB)
   - ✅ State locking prevents concurrent modifications
   - ⚠️ Never edit state file manually
   - ✅ Use `terraform state` commands for operations

4. **Best Practices:**
   - ✅ Remote state with locking (S3 + DynamoDB)
   - ✅ Use modules for reusability
   - ✅ Separate environments (dev, staging, prod)
   - ✅ Version control everything (except state)
   - ✅ Use `.tfvars` for environment-specific values
   - ✅ Always run `plan` before `apply`

5. **Common Commands:**
   - `terraform init`: Initialize directory
   - `terraform plan`: Preview changes
   - `terraform apply`: Execute changes
   - `terraform destroy`: Remove infrastructure
   - `terraform fmt`: Format code
   - `terraform validate`: Check syntax
   - `terraform state list`: List resources in state

**Key Insights:**
> - Plan before apply - never apply without reviewing changes
> - State is the source of truth - protect it (remote backend + locking)
> - Modules promote reusability and DRY principles
> - Immutable infrastructure: replace, don't modify
> - Terraform is declarative - it converges to desired state

---
[← Back to DevOps](../README.md) | [Next: State Management →](./03-state-management.md)
