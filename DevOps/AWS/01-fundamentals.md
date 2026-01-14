# AWS Fundamentals for DevOps

## Overview

Amazon Web Services (AWS) is the leading cloud platform for modern DevOps. Understanding AWS fundamentals is essential for deploying, managing, and scaling applications in the cloud. This guide covers core AWS concepts for DevOps engineers.

**Why AWS for DevOps:**
- Market leader (32% cloud market share)
- 200+ services covering all needs
- Global infrastructure (30+ regions)
- Pay-as-you-go pricing
- Infrastructure as Code support (CloudFormation, CDK)
- Deep CI/CD integration (CodePipeline, CodeBuild)

**Core Service Categories:**

| Category | Key Services | Use Case |
|----------|-------------|----------|
| **Compute** | EC2, Lambda, ECS, EKS | Run applications |
| **Storage** | S3, EBS, EFS | Store data |
| **Database** | RDS, DynamoDB, Aurora | Manage data |
| **Networking** | VPC, Route53, CloudFront, ELB | Connect and route |
| **Security** | IAM, KMS, Secrets Manager, WAF | Control access |
| **DevOps** | CodePipeline, CodeBuild, CodeDeploy | CI/CD |

## AWS Global Infrastructure

### Regions and Availability Zones

```
AWS Global Infrastructure
├── Regions (30+)              # Geographic locations
│   ├── US East (N. Virginia) - us-east-1
│   ├── US West (Oregon) - us-west-2
│   ├── EU (Ireland) - eu-west-1
│   └── Asia Pacific (Tokyo) - ap-northeast-1
│
└── Availability Zones (AZs)   # Data centers within region
    ├── us-east-1a
    ├── us-east-1b
    ├── us-east-1c
    └── us-east-1d (3+ per region)

Edge Locations (400+)          # CDN endpoints (CloudFront)
Local Zones                    # Extension of regions
Wavelength Zones               # 5G edge computing
```

### Key Concepts

**Region**: Physical geographic area with multiple AZs (e.g., us-east-1)
**Availability Zone (AZ)**: One or more data centers with redundant power, networking
**Edge Location**: CloudFront CDN endpoint for content delivery
**Multi-AZ**: Deploy across multiple AZs for high availability
**Multi-Region**: Deploy across multiple regions for disaster recovery

### Choosing a Region

Consider these factors:
1. **Latency** - Closest to users
2. **Compliance** - Data sovereignty requirements
3. **Services** - Not all services in all regions
4. **Cost** - Prices vary by region
5. **Disaster Recovery** - Secondary region for backup

```bash
# List all regions
aws ec2 describe-regions --output table

# List AZs in a region
aws ec2 describe-availability-zones --region us-east-1
```

## AWS Account Setup

### Initial Setup

```bash
# 1. Create AWS account at aws.amazon.com
# 2. Enable MFA on root account (REQUIRED!)
# 3. Create IAM admin user (don't use root)
# 4. Set up billing alerts
# 5. Configure AWS CLI

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version

# Configure AWS CLI
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region: us-east-1
# Default output format: json

# Multiple profiles
aws configure --profile dev
aws configure --profile prod

# Use specific profile
aws s3 ls --profile prod
export AWS_PROFILE=prod  # Set for session
```

### AWS Organizations

```
Root Account (Management Account)
├── Organizational Units (OUs)
│   ├── Production OU
│   │   ├── Prod Account 1
│   │   └── Prod Account 2
│   ├── Development OU
│   │   └── Dev Account 1
│   └── Shared Services OU
│       ├── Logging Account
│       └── Security Account
│
└── Service Control Policies (SCPs)
    - Restrict services per OU
    - Enforce compliance
```

### AWS Billing

```bash
# Set up billing alerts
# 1. Enable billing alerts in preferences
# 2. Create SNS topic for notifications
aws sns create-topic --name billing-alerts

# 3. Create CloudWatch alarm
aws cloudwatch put-metric-alarm \
    --alarm-name BillingAlert \
    --alarm-description "Alert when bill > $100" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 21600 \
    --evaluation-periods 1 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold

# 4. Create budget
aws budgets create-budget \
    --account-id 123456789012 \
    --budget file://budget.json \
    --notifications-with-subscribers file://notifications.json

# View current bill
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics UnblendedCost
```

## Core AWS Services for DevOps

### Compute Services

#### EC2 (Elastic Compute Cloud)

```bash
# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t2.micro \
    --key-name my-keypair \
    --security-group-ids sg-12345678 \
    --subnet-id subnet-12345678 \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WebServer}]'

# List instances
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key==`Name`].Value|[0]]' \
    --output table

# Stop instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start instance
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Terminate instance
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0

# Connect to instance
ssh -i my-keypair.pem ec2-user@<public-ip>
# Ubuntu: ubuntu@<public-ip>
# Amazon Linux: ec2-user@<public-ip>
```

#### EC2 Instance Types

```
General Purpose:
- t3.micro, t3.small, t3.medium    # Burstable (dev/test)
- t3.large, t3.xlarge               # Burstable (small apps)
- m5.large, m5.xlarge               # Balanced (web apps)

Compute Optimized:
- c5.large, c5.xlarge               # CPU intensive

Memory Optimized:
- r5.large, r5.xlarge               # Memory intensive (databases)

Storage Optimized:
- i3.large, i3.xlarge               # High I/O (big data)

GPU Instances:
- p3.2xlarge                        # ML training

# Naming convention: t3.micro
# t = instance family
# 3 = generation
# micro = size
```

#### Lambda (Serverless)

```bash
# Create Lambda function
aws lambda create-function \
    --function-name my-function \
    --runtime python3.9 \
    --role arn:aws:iam::123456789012:role/lambda-role \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://function.zip \
    --environment Variables={ENV=prod,REGION=us-east-1}

# Invoke Lambda
aws lambda invoke \
    --function-name my-function \
    --payload '{"key": "value"}' \
    response.json

# Update function code
aws lambda update-function-code \
    --function-name my-function \
    --zip-file fileb://function.zip

# List functions
aws lambda list-functions

# Get function details
aws lambda get-function --function-name my-function

# Delete function
aws lambda delete-function --function-name my-function
```

### Storage Services

#### S3 (Simple Storage Service)

```bash
# Create bucket
aws s3 mb s3://my-bucket-name --region us-east-1

# List buckets
aws s3 ls

# List bucket contents
aws s3 ls s3://my-bucket-name
aws s3 ls s3://my-bucket-name/folder/ --recursive

# Upload file
aws s3 cp file.txt s3://my-bucket-name/
aws s3 cp folder/ s3://my-bucket-name/folder/ --recursive

# Download file
aws s3 cp s3://my-bucket-name/file.txt .

# Sync directory
aws s3 sync local-folder/ s3://my-bucket-name/
aws s3 sync s3://my-bucket-name/ local-folder/

# Delete file
aws s3 rm s3://my-bucket-name/file.txt
aws s3 rm s3://my-bucket-name/folder/ --recursive

# Delete bucket
aws s3 rb s3://my-bucket-name --force

# Make bucket public (use carefully!)
aws s3api put-bucket-acl \
    --bucket my-bucket-name \
    --acl public-read

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket my-bucket-name \
    --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket my-bucket-name \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'

# Lifecycle policy (transition to Glacier after 30 days)
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket-name \
    --lifecycle-configuration file://lifecycle.json
```

**S3 Storage Classes:**
```
Standard            - Frequently accessed, 11 9s durability
Standard-IA         - Infrequently accessed, lower cost
One Zone-IA         - Single AZ, lower cost
Glacier Instant     - Archive, millisecond access
Glacier Flexible    - Archive, minutes to hours access
Glacier Deep Archive - Archive, 12 hours access (cheapest)
Intelligent-Tiering - Automatic tiering based on access
```

#### EBS (Elastic Block Store)

```bash
# Create volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 10 \
    --volume-type gp3 \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=MyVolume}]'

# List volumes
aws ec2 describe-volumes

# Attach volume to instance
aws ec2 attach-volume \
    --volume-id vol-1234567890abcdef0 \
    --instance-id i-1234567890abcdef0 \
    --device /dev/sdf

# Detach volume
aws ec2 detach-volume --volume-id vol-1234567890abcdef0

# Create snapshot
aws ec2 create-snapshot \
    --volume-id vol-1234567890abcdef0 \
    --description "Backup of MyVolume"

# Delete volume
aws ec2 delete-volume --volume-id vol-1234567890abcdef0
```

**EBS Volume Types:**
```
gp3 (General Purpose SSD)  - Default, balance price/performance
gp2 (General Purpose SSD)  - Legacy, burstable
io2 (Provisioned IOPS SSD) - High performance databases
st1 (Throughput HDD)       - Big data, data warehouses
sc1 (Cold HDD)             - Infrequent access (cheapest)
```

### Networking Services

#### VPC (Virtual Private Cloud)

```bash
# Create VPC
aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=MyVPC}]'

# Create subnet
aws ec2 create-subnet \
    --vpc-id vpc-12345678 \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=PublicSubnet}]'

# Create Internet Gateway
aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=MyIGW}]'

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
    --internet-gateway-id igw-12345678 \
    --vpc-id vpc-12345678

# Create route table
aws ec2 create-route-table \
    --vpc-id vpc-12345678 \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=PublicRT}]'

# Add route to internet
aws ec2 create-route \
    --route-table-id rtb-12345678 \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id igw-12345678

# Associate route table with subnet
aws ec2 associate-route-table \
    --route-table-id rtb-12345678 \
    --subnet-id subnet-12345678

# Create NAT Gateway (for private subnets)
# 1. Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# 2. Create NAT Gateway
aws ec2 create-nat-gateway \
    --subnet-id subnet-12345678 \
    --allocation-id eipalloc-12345678
```

**VPC Best Practices:**
```
VPC CIDR: 10.0.0.0/16 (65,536 IPs)
├── Public Subnet AZ1:  10.0.1.0/24  (251 usable IPs)
├── Public Subnet AZ2:  10.0.2.0/24
├── Private Subnet AZ1: 10.0.11.0/24
├── Private Subnet AZ2: 10.0.12.0/24
├── DB Subnet AZ1:      10.0.21.0/24
└── DB Subnet AZ2:      10.0.22.0/24

Public Subnets:  Internet-facing resources (ALB, NAT Gateway)
Private Subnets: Application servers, containers
DB Subnets:      Databases (RDS, ElastiCache)
```

#### Security Groups

```bash
# Create security group
aws ec2 create-security-group \
    --group-name web-sg \
    --description "Security group for web servers" \
    --vpc-id vpc-12345678

# Add ingress rule (allow HTTP)
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Add multiple rules
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --ip-permissions \
    IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=10.0.0.0/16}]'

# Remove rule
aws ec2 revoke-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# List security groups
aws ec2 describe-security-groups

# Delete security group
aws ec2 delete-security-group --group-id sg-12345678
```

**Security Group vs NACL:**
```
Security Group (Stateful):
- Operates at instance level
- Stateful (return traffic allowed)
- All rules evaluated
- Only allow rules

NACL (Network ACL - Stateless):
- Operates at subnet level
- Stateless (return traffic must be explicitly allowed)
- Rules processed in order
- Allow and deny rules
```

## IAM (Identity and Access Management)

### IAM Concepts

```
IAM Hierarchy:
└── AWS Account
    ├── Users              # Individual people
    ├── Groups             # Collection of users
    ├── Roles              # For AWS services or cross-account
    └── Policies           # Permissions (JSON)
```

### IAM Users

```bash
# Create user
aws iam create-user --user-name john-dev

# Create access key
aws iam create-access-key --user-name john-dev

# Add user to group
aws iam add-user-to-group --user-name john-dev --group-name Developers

# Attach policy to user
aws iam attach-user-policy \
    --user-name john-dev \
    --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# List users
aws iam list-users

# Delete user
aws iam delete-user --user-name john-dev
```

### IAM Groups

```bash
# Create group
aws iam create-group --group-name Developers

# Attach policy to group
aws iam attach-group-policy \
    --group-name Developers \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# List groups
aws iam list-groups

# Delete group
aws iam delete-group --group-name Developers
```

### IAM Roles

```bash
# Create role (for EC2)
aws iam create-role \
    --role-name EC2-S3-Access \
    --assume-role-policy-document file://trust-policy.json

# trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "ec2.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}

# Attach policy to role
aws iam attach-role-policy \
    --role-name EC2-S3-Access \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create instance profile
aws iam create-instance-profile \
    --instance-profile-name EC2-S3-Profile

# Add role to instance profile
aws iam add-role-to-instance-profile \
    --instance-profile-name EC2-S3-Profile \
    --role-name EC2-S3-Access

# Attach to EC2 instance
aws ec2 associate-iam-instance-profile \
    --instance-id i-1234567890abcdef0 \
    --iam-instance-profile Name=EC2-S3-Profile
```

### IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket"
    },
    {
      "Effect": "Deny",
      "Action": "s3:DeleteBucket",
      "Resource": "*"
    }
  ]
}
```

**Policy Elements:**
- **Version**: Policy language version (always "2012-10-17")
- **Statement**: Array of permission statements
- **Effect**: "Allow" or "Deny"
- **Action**: AWS service actions (e.g., "s3:GetObject")
- **Resource**: ARN of resources affected
- **Condition**: Optional conditions (e.g., IP address, MFA)

### IAM Best Practices

```
✅ Enable MFA on root account
✅ Create individual IAM users (not root)
✅ Use groups to assign permissions
✅ Grant least privilege (minimum permissions needed)
✅ Use roles for EC2/Lambda (not access keys)
✅ Rotate credentials regularly
✅ Use policy conditions for extra security
✅ Monitor activity with CloudTrail
✅ Enable password policy requirements

❌ Don't use root account for daily tasks
❌ Don't share access keys
❌ Don't commit access keys to Git
❌ Don't use * wildcard permissions unless necessary
❌ Don't create overly permissive policies
```

## AWS CLI Tips and Tricks

### Query and Filter

```bash
# Query specific fields
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]' \
    --output table

# Filter running instances
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[Tags[?Key==`Name`].Value|[0],InstanceId,PublicIpAddress]'

# Count instances by state
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].State.Name' \
    | jq -r '.[][]' | sort | uniq -c
```

### Output Formats

```bash
# JSON (default)
aws ec2 describe-instances --output json

# Table
aws ec2 describe-instances --output table

# Text (for scripting)
aws ec2 describe-instances --output text

# YAML
aws ec2 describe-instances --output yaml
```

### Environment Variables

```bash
# Set default region
export AWS_DEFAULT_REGION=us-east-1

# Use specific profile
export AWS_PROFILE=production

# Set access keys (not recommended, use profiles)
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Interview Questions

**Q1: What's the difference between Region and Availability Zone?**
A: A **Region** is a geographic location with multiple data centers (e.g., us-east-1). An **Availability Zone** is one or more data centers within a region (e.g., us-east-1a). Deploy across multiple AZs for high availability.

**Q2: Explain the AWS Shared Responsibility Model.**
A:
- **AWS is responsible for**: Physical security, hardware, networking, managed service infrastructure
- **Customer is responsible for**: Data, applications, IAM, OS patches (for EC2), encryption, network configuration

**Q3: What's the difference between Security Group and NACL?**
A:
- **Security Group**: Instance-level, stateful (return traffic auto-allowed), only allow rules
- **NACL**: Subnet-level, stateless (must explicitly allow return traffic), allow and deny rules

**Q4: When would you use S3 vs EBS vs EFS?**
A:
- **S3**: Object storage, static files, backups, data lakes (not mounted to EC2)
- **EBS**: Block storage, attached to single EC2 instance, databases, root volumes
- **EFS**: Network file system, shared across multiple EC2 instances, NFS protocol

**Q5: What's an IAM Role and when would you use it?**
A: An IAM Role is an identity with permissions that can be assumed by AWS services or users. Use cases:
- EC2 accessing S3 (attach role to EC2)
- Lambda accessing DynamoDB
- Cross-account access
- Federated users

**Q6: How do you make an EC2 instance publicly accessible?**
A:
1. Launch in **public subnet** (subnet with Internet Gateway route)
2. Assign **public IP** or Elastic IP
3. **Security Group** allows inbound traffic (port 80/443)
4. **NACL** allows inbound/outbound traffic (default allows all)

**Q7: What's the difference between Stop and Terminate an EC2 instance?**
A:
- **Stop**: Instance is shutdown, EBS volume persists, can restart later, hourly charges stop (storage charges continue)
- **Terminate**: Instance is deleted, EBS volume deleted (unless configured otherwise), cannot restart, all charges stop

## Summary

**Core Concepts:**

1. **Global Infrastructure:**
   - ✅ **Regions**: Geographic locations (30+)
   - ✅ **Availability Zones**: Data centers within region (3+ per region)
   - ✅ **Edge Locations**: CDN endpoints (400+)
   - ✅ Multi-AZ for high availability, Multi-Region for DR

2. **Compute:**
   - **EC2**: Virtual machines, flexible, full control
   - **Lambda**: Serverless functions, auto-scaling, pay-per-use
   - **ECS/EKS**: Container orchestration (Docker, Kubernetes)

3. **Storage:**
   - **S3**: Object storage, 11 9's durability, web-scale
   - **EBS**: Block storage, attached to EC2, persistent
   - **EFS**: Network file system, shared across EC2

4. **Networking:**
   - ✅ **VPC**: Isolated network (your own data center)
   - ✅ **Subnets**: Public (internet access) vs Private (internal)
   - ✅ **Security Groups**: Stateful firewall (instance-level)
   - ✅ **NACLs**: Stateless firewall (subnet-level)
   - ✅ **Internet Gateway**: VPC to internet
   - ✅ **NAT Gateway**: Private subnet to internet (outbound)

5. **Security (IAM):**
   - **Users**: Individual identities
   - **Groups**: Collection of users
   - **Roles**: Assumed by services/users
   - **Policies**: JSON permissions documents
   - ⚠️ Principle of least privilege

6. **AWS CLI:**
   - ✅ Automation and scripting
   - ✅ Access keys (programmatic access)
   - ✅ Profiles for multiple accounts
   - ✅ Essential for DevOps workflows

**Key Insights:**
> - Always deploy across multiple AZs for high availability
> - Use IAM roles instead of access keys for EC2/Lambda
> - S3 is object storage (not a filesystem), EFS is NFS
> - Security Groups are stateful (return traffic automatic)
> - Public subnet = Internet Gateway route, Private = no direct internet

---
[← Back to DevOps](../README.md) | [Next: IAM Deep Dive →](./02-iam.md)
