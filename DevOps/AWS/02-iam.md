# IAM (Identity & Access Management)

IAM controls **who** can do **what** on **which** AWS resources. Every API call in AWS goes through IAM first. Get this wrong and you get breaches or broken deployments.

## IAM Hierarchy

```
AWS Account
├── Root User           — god-mode, never use daily
├── IAM Users           — human identities with long-term credentials
│   └── Access Keys     — programmatic access (risky if leaked)
├── IAM Groups          — collections of users, share permissions
│   ├── Developers
│   ├── Ops
│   └── ReadOnly
├── IAM Roles           — temporary credentials, no long-term keys
│   ├── EC2 Instance Profile   — lets EC2 call AWS APIs
│   ├── Lambda Execution Role  — lets Lambda call AWS APIs
│   └── Cross-Account Role     — lets another account assume access
└── IAM Policies        — JSON documents that define permissions
    ├── AWS Managed     — maintained by AWS
    ├── Customer Managed — you write and own these
    └── Inline          — embedded directly in user/role (avoid)
```

> **Key insight:** Users are for humans. Roles are for everything else — services, automation, cross-account access.

## Policy Anatomy

A policy is a JSON document. Every allow or deny comes from a policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadOnlyBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

| Field | Purpose | Example |
|-------|---------|---------|
| `Effect` | Allow or Deny | `"Allow"` |
| `Action` | What API calls | `"s3:GetObject"` |
| `Resource` | Which resources | ARN or `"*"` |
| `Condition` | Extra constraints | IP range, MFA, region |

> **Deny wins.** An explicit `Deny` always overrides any `Allow` — even from another policy.

## IAM Roles in Practice

### EC2 Instance Profile

Attach a role to EC2 so the app can call AWS APIs without storing keys.

```bash
# Create role with EC2 trust policy
aws iam create-role \
  --role-name MyAppRole \
  --assume-role-policy-document file://ec2-trust.json

# Attach a permissions policy to the role
aws iam attach-role-policy \
  --role-name MyAppRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create instance profile and attach role
aws iam create-instance-profile --instance-profile-name MyAppProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name MyAppProfile \
  --role-name MyAppRole
```

The trust policy (`ec2-trust.json`) says who can **assume** this role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Cross-Account Role

Account A wants to access resources in Account B.

```
Account A (123456789)          Account B (987654321)
    │                                │
    │   sts:AssumeRole               │
    │ ──────────────────────────▶    │
    │                          CrossAccountRole
    │   Temp credentials  ◀──────────│
    │                                │
    │   Access S3 in B               │
    │ ──────────────────────────▶    │
```

Trust policy on Account B's role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789:root" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Lambda Execution Role

Lambda needs a role to write logs and access other services.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Principle of Least Privilege

Give the **minimum permissions** needed to do the job. Nothing more.

**How to apply it:**

1. Start with zero permissions
2. Add only what the service needs to function
3. Use specific Actions — avoid `s3:*`
4. Use specific Resources — avoid `"*"`
5. Add Conditions to restrict by IP, MFA, or region
6. Review permissions quarterly and remove unused ones

```json
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-bucket/uploads/*"
}
```

✅ Scoped to one action, one prefix — not the whole bucket.

## IAM Best Practices

| Practice | Why It Matters |
|----------|---------------|
| ✅ Enable MFA on root account | Root can't be locked out or recovered normally |
| ✅ Never use root for daily tasks | Any mistake with root affects the whole account |
| ✅ Use Groups to assign permissions | Easier to manage than per-user policies |
| ✅ Use Roles for services and automation | No long-term keys that can leak |
| ✅ Rotate access keys regularly | Leaked old keys still work until rotated |
| ✅ Use Conditions in policies | Restricts where and how permissions apply |
| ✅ Enable CloudTrail | Audit every IAM API call |
| ✅ Use IAM Access Analyzer | Finds over-permissive policies automatically |

## Common Mistakes

❌ **Using root for deployments** — root has no restrictions; one mistake can delete everything.

❌ **Wildcard permissions** — `"Action": "s3:*"` gives delete access when you only need read.

❌ **Committing access keys to Git** — GitHub bots scan for AWS keys within seconds of a push.

❌ **Sharing credentials between services** — if one service is compromised, all others are too.

❌ **Inline policies** — they're hard to audit and can't be reused across roles.

⚠️ **IAM changes take effect immediately** — there is no staging environment for IAM.

## Useful CLI Commands

```bash
# Create an IAM user
aws iam create-user --user-name deploy-bot

# Attach a managed policy to a user
aws iam attach-user-policy \
  --user-name deploy-bot \
  --policy-arn arn:aws:iam::aws:policy/AmazonECR_FullAccess

# Create an access key for a user (programmatic access)
aws iam create-access-key --user-name deploy-bot

# List all policies attached to a role
aws iam list-attached-role-policies --role-name MyAppRole

# Simulate an API call to check if it would be allowed
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:role/MyAppRole \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::my-bucket/file.txt
```

> **`simulate-principal-policy` is your best friend.** Test permissions before deploying — not after an outage.

## Interview Q&A

**Q: What is the difference between an IAM User and an IAM Role?**

An IAM User has long-term credentials (password or access keys) tied to a specific person. An IAM Role has temporary credentials generated on-demand. Roles are for services, automation, and cross-account access. You should prefer roles — they don't have permanent keys that can leak.

**Q: When would you use access keys instead of a role?**

Access keys are for scenarios where roles are not possible — such as a local developer running CLI commands or a third-party tool that cannot assume a role. Even then, rotate them often and store them in a secrets manager, never in code.

**Q: What is an IAM policy, and how does AWS evaluate it?**

A policy is a JSON document with allow or deny statements. AWS evaluates all policies attached to the principal. The default is deny. An explicit allow grants access. An explicit deny always wins, even if another policy allows the same action.

**Q: How does cross-account access work in IAM?**

Account B creates a role with a trust policy that lists Account A as the trusted principal. A user or service in Account A calls `sts:AssumeRole` to get temporary credentials for the role in Account B. Those credentials expire automatically — no long-term access key is shared.

**Q: How do you enforce least privilege in a real project?**

Start with a deny-all baseline. Add specific Actions and Resources as the service is built. Use `aws iam simulate-principal-policy` to test before go-live. Enable IAM Access Analyzer to detect overly permissive policies. Review and tighten policies every quarter.

---
[← AWS Fundamentals](./01-fundamentals.md) | [VPC →](./03-vpc.md)
