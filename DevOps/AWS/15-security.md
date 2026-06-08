# Security Services (CloudTrail, GuardDuty, Config, KMS)

AWS provides four core security services — each answers a different question about your environment.

## The Four Services at a Glance

| Service | Question It Answers | What It Looks At |
|---------|--------------------|--------------------|
| **CloudTrail** | Who did what, when? | API calls (Console, CLI, SDK) |
| **AWS Config** | Are resources configured correctly? | Resource configurations over time |
| **GuardDuty** | Is something malicious happening? | Traffic patterns, API behavior |
| **Security Hub** | What is my overall security posture? | Aggregates findings from all three + more |

> Think of it this way: CloudTrail is your **audit log**, Config is your **compliance checker**, GuardDuty is your **threat detector**, and Security Hub is your **security dashboard**.

## CloudTrail

CloudTrail records every AWS API call. Every action in the Console, every CLI command, every SDK call — it all produces an event.

**What each event captures:**

- Who made the call (IAM user, role, account)
- What action was called (`DeleteBucket`, `RunInstances`, `AssociateRouteTable`)
- When it happened (timestamp)
- Where it came from (source IP address)
- Was it successful or denied?

### Event Types

| Type | Examples | Cost |
|------|----------|------|
| **Management events** | Create VPC, delete IAM role, modify security group | Free (first copy per region) |
| **Data events** | S3 GetObject/PutObject, Lambda Invoke | Extra cost — enable only when needed |

⚠️ CloudTrail does **not** deliver logs in real time. Expect a ~15 minute delay before events appear in S3. If you need near-real-time, stream CloudTrail to CloudWatch Logs.

### Common Use Cases

- Audit who deleted a production S3 bucket
- Prove that no one accessed sensitive data during an audit window
- Track all IAM changes in the last 90 days
- Satisfy compliance requirements (PCI-DSS, SOC 2, HIPAA)

```bash
# Find who deleted an S3 bucket named "prod-backups"
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteBucket \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z
```

## AWS Config

AWS Config continuously records the **configuration state** of your AWS resources. It tracks every change — what changed, when, and what it looked like before.

### Config Rules

Rules evaluate whether resources comply with your policies.

| Rule Type | How It Works | Example |
|-----------|-------------|---------|
| **Managed rules** | Pre-built by AWS, enable with one click | `s3-bucket-server-side-encryption-enabled` |
| **Custom rules** | You write a Lambda function | Check if EC2 has a specific tag |

**Common managed rules:**

- `encrypted-volumes` — EBS volumes must be encrypted
- `restricted-ssh` — Security groups must not allow unrestricted SSH (0.0.0.0/0)
- `root-account-mfa-enabled` — Root account must have MFA
- `vpc-default-security-group-closed` — Default VPC security group must have no rules

### Remediation

Config can auto-fix non-compliant resources using SSM Automation documents.

```
Config Rule detects non-compliant resource
    ↓
Remediation action triggers SSM Automation
    ↓
SSM Automation fixes the resource (e.g. enables encryption)
    ↓
Config re-evaluates — resource is now compliant
```

✅ Use Config for continuous compliance. It proves to auditors that you've been compliant, not just that you are today.

```bash
# List non-compliant resources for a specific rule
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name encrypted-volumes \
  --compliance-types NON_COMPLIANT
```

## GuardDuty

GuardDuty uses machine learning to detect threats and suspicious behavior. It analyzes three data sources automatically:

| Data Source | What It Detects |
|-------------|----------------|
| **CloudTrail events** | Unusual API calls, credential misuse |
| **VPC Flow Logs** | Port scanning, unusual traffic patterns |
| **DNS logs** | Communication with known malicious domains |

### What GuardDuty Finds

- **Compromised EC2** — instance communicating with a known command-and-control server
- **Crypto mining** — unusual CPU usage + outbound connections to mining pools
- **Credential theft** — API calls from an unusual IP or country
- **S3 data exfiltration** — large GetObject calls from an unknown source
- **Privilege escalation** — IAM role assuming unusual permissions

✅ GuardDuty is **agentless**. Enable it with one click. No software to install.

❌ Don't disable GuardDuty to "save costs." The monthly cost is low. A breach costs far more.

### Automated Response

GuardDuty findings publish to EventBridge. You can trigger a Lambda to respond automatically.

```
GuardDuty finds crypto mining on EC2
    ↓
EventBridge rule matches finding type
    ↓
Lambda isolates the instance (remove from security group)
    ↓
SNS notifies security team
```

## Security Hub

Security Hub aggregates findings from multiple sources into one place.

**Sources it integrates with:**

- GuardDuty
- AWS Config
- Amazon Inspector (vulnerability scanning)
- Amazon Macie (S3 data classification)
- IAM Access Analyzer
- Third-party tools (CrowdStrike, Palo Alto, etc.)

### Security Standards

Security Hub scores your account against published benchmarks:

| Standard | Focus |
|----------|-------|
| AWS Foundational Security Best Practices | AWS-specific controls |
| CIS AWS Foundations Benchmark | Industry baseline |
| PCI-DSS | Payment card compliance |

✅ Use Security Hub with AWS Organizations to see findings across all accounts in one place.

## KMS (Key Management Service)

KMS manages encryption keys. Every major AWS service (S3, RDS, EBS, Lambda) integrates with it.

### Key Types

| Key Type | Managed By | Cost | Control |
|----------|------------|------|---------|
| **AWS managed keys** | AWS | Free | Limited (can't rotate manually, can't set custom policy) |
| **Customer managed keys (CMK)** | You | $1/month + API calls | Full (rotation, key policy, grants) |

### Envelope Encryption

AWS services don't encrypt your data directly with the KMS key. That would be slow for large objects. Instead, they use **envelope encryption**:

```
1. KMS generates a Data Encryption Key (DEK)
2. The DEK encrypts your actual data (fast, local)
3. KMS encrypts the DEK with your CMK (the "envelope")
4. The encrypted DEK is stored alongside the data
5. To decrypt: KMS decrypts the DEK, DEK decrypts the data
```

> This is how S3, RDS, and EBS encryption work under the hood. The CMK never leaves KMS. Only the encrypted DEK travels with your data.

### Key Rotation

```bash
# Enable automatic annual key rotation for a CMK
aws kms enable-key-rotation --key-id alias/my-app-key

# Verify rotation is enabled
aws kms get-key-rotation-status --key-id alias/my-app-key
```

✅ Enable automatic rotation for all customer managed keys. AWS rotates the backing key material annually. Old data encrypted with old key material can still be decrypted.

## WAF (Web Application Firewall)

WAF operates at Layer 7. It inspects HTTP requests before they reach your app.

| Attack | WAF Blocks It |
|--------|---------------|
| SQL injection | ✅ |
| Cross-site scripting (XSS) | ✅ |
| Bad bots | ✅ |
| DDoS (volumetric) | ❌ Use AWS Shield instead |

**WAF attaches to:** CloudFront, ALB, API Gateway, AppSync.

✅ Use AWS-managed rule groups for common protections. Enable them with one click — no custom rules needed to start.

## Useful CLI Commands

```bash
# Search CloudTrail for recent events by username
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=john.doe

# List GuardDuty findings (sorted by severity)
aws guardduty list-findings \
  --detector-id <detector-id> \
  --finding-criteria '{"Criterion":{"severity":{"Gte":7}}}'

# Check AWS Config recorder status
aws configservice describe-configuration-recorders

# List non-compliant Config rules
aws configservice describe-compliance-by-config-rule \
  --compliance-types NON_COMPLIANT
```

## Interview Q&A

**Q: What is the difference between CloudTrail and CloudWatch?**

CloudTrail records **who did what** — API calls, console actions, CLI commands. It is an audit log of human and automated actions on AWS resources. CloudWatch monitors **system performance** — CPU, errors, latency, and application logs. Use CloudTrail for security auditing and compliance. Use CloudWatch for operational monitoring and alerting. They serve different purposes and you use both.

**Q: How do you find out who deleted a production S3 bucket?**

Query CloudTrail. The `DeleteBucket` API call produces a CloudTrail event. Use `aws cloudtrail lookup-events` filtered by `EventName=DeleteBucket`. The event record includes the IAM principal (user or role), source IP address, and timestamp. If the bucket was deleted more than 90 days ago, you need to search the S3 bucket where CloudTrail delivers its logs.

**Q: What is GuardDuty and how does it detect threats?**

GuardDuty is a managed threat detection service. It analyzes CloudTrail events, VPC Flow Logs, and DNS query logs using machine learning models trained on AWS-wide threat intelligence. It looks for anomalies — unusual API call patterns, connections to known malicious IPs, and behaviors that deviate from the account's baseline. When it finds a threat, it creates a finding with a severity score. You can respond automatically via EventBridge and Lambda.

**Q: When do you use CloudTrail vs AWS Config?**

Use CloudTrail when you need to answer "who did something" — an audit of actions. Use AWS Config when you need to answer "is this resource compliant" — a snapshot and history of resource configurations. CloudTrail tells you that someone ran `ModifyDBInstance` at 3pm. Config tells you that the RDS instance changed from unencrypted to encrypted at 3pm and shows you both the before and after state. They complement each other.

**Q: What is envelope encryption?**

Envelope encryption is a two-key approach. A data encryption key (DEK) encrypts the actual data locally — this is fast. Then KMS encrypts the DEK using your CMK — this is the "envelope." The CMK never leaves KMS and never touches your data directly. To decrypt, KMS first decrypts the DEK, then the DEK decrypts the data. This is how all AWS storage services (S3, EBS, RDS) handle encryption with KMS under the hood.

---

[← CloudWatch](./14-cloudwatch.md) | [← Back to AWS](./README.md)
