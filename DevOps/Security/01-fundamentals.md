---
title: Security Fundamentals
part: 8
chapter: 0
slug: security-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-03
tags: [devops, security, fundamentals]
in_book: false
---

# Security Fundamentals

Security interviews test whether you think in terms of **blast radius** rather than checklists. This file covers the models that produce that thinking.

## The Shared Responsibility Model

The most-asked security question on AWS, and most candidates answer it too vaguely.

```
┌─────────────────────────────────────────────┐
│  CUSTOMER — security IN the cloud           │
│  • Your data, and its classification         │
│  • IAM users, roles, policies                │
│  • OS patching (EC2), application code       │
│  • Security groups, NACLs                    │
│  • Encryption choices, key management        │
├─────────────────────────────────────────────┤
│  AWS — security OF the cloud                │
│  • Physical data centres                     │
│  • Hypervisor and host OS                    │
│  • Network infrastructure                    │
│  • Managed service patching                  │
└─────────────────────────────────────────────┘
```

🔴 **The line moves with the service model.** This is the part that separates a good answer from a recited one.

| Service | AWS Patches | You Patch |
|---------|------------|-----------|
| **EC2** | Hypervisor only | 🔴 Guest OS, runtime, app, libraries |
| **RDS** | OS and database engine | Schema, users, parameter groups |
| **EKS** | Control plane | 🔴 Node OS, add-ons, container images |
| **Fargate** | OS and runtime | Container image contents |
| **Lambda** | OS and runtime | Your code and dependencies |
| **S3** | Everything infrastructural | 🔴 Bucket policy, encryption, access |

> ✅ **AWS has never had a breach caused by a customer's misconfigured bucket — the customer has.** Nearly every headline "AWS breach" is a customer-side misconfiguration: a public bucket, an over-permissive IAM policy, or a leaked access key.

## Defence in Depth

No single control is trusted. Every layer assumes the one outside it has failed.

```
Layer 7   WAF, input validation, authn/authz
Layer 6   TLS everywhere
Layer 5   Application: least privilege, secrets from a vault
Layer 4   Security groups (per-ENI, stateful)
Layer 3   NACLs, route isolation, no route to the internet
Layer 2   VPC segmentation, separate accounts
Layer 1   IAM, SCPs, permission boundaries
Layer 0   Encryption at rest — the assumption that all of the above failed
```

**Applied to one database:**

| Control | Assumes |
|---------|---------|
| Isolated subnet, no internet route | The network perimeter failed |
| Security group allows only the app tier | The subnet is compromised |
| IAM database authentication | The credential leaked |
| Encryption at rest with a customer-managed key | The storage was copied |
| Secrets Manager with rotation | The password is already known |
| CloudTrail + GuardDuty | Everything above failed and you need detection |

✅ Each layer buys **time to detect** even after the layer outside it is defeated.

## Blast Radius

> **The question to ask of every design: if this single thing is compromised, what else falls?**

| Design | Blast Radius |
|--------|-------------|
| One AWS account for everything | 🔴 Entire company |
| Account per environment | One environment |
| Account per team per environment | ✅ One team's environment |
| One IAM role for all services | 🔴 Every service's permissions |
| Role per service | ✅ That service only |
| Shared database credential | Every service using it |
| Per-service DB user, IAM auth | ✅ One service |

✅ **Separate AWS accounts are the strongest boundary AWS offers.** IAM is a policy decision that can be misconfigured; an account boundary requires an explicit cross-account trust to cross.

## Threat Modelling — STRIDE

A structured way to find what you have not thought about.

| Threat | Question | AWS Mitigation |
|--------|----------|---------------|
| **S**poofing | Can someone pretend to be another identity? | IAM roles, mTLS, MFA, OIDC |
| **T**ampering | Can data be modified undetected? | S3 versioning + Object Lock, TLS, signatures |
| **R**epudiation | Can someone deny an action? | CloudTrail, immutable audit logs |
| **I**nformation disclosure | Can data leak? | Encryption, least privilege, no public buckets |
| **D**enial of service | Can it be overwhelmed? | Shield, WAF rate limits, autoscaling, quotas |
| **E**levation of privilege | Can someone gain more access? | 🔴 Permission boundaries, SCPs, no `iam:*` |

**Applied to a file upload feature:**

```
Spoofing        → is the uploader authenticated? Cognito / signed URL
Tampering       → can they overwrite someone else's file? Key prefix per user
Repudiation     → who uploaded what? CloudTrail data events on the bucket
Disclosure      → is the bucket public? Public access block + OAC
DoS             → can they upload 10 TB? Size limit in the presigned URL policy
Elevation       → can an uploaded file execute? No execute path; scan on ingest
```

✅ Threat modelling at design time is far cheaper than a penetration test finding the same thing later.

## Least Privilege in Practice

Everyone agrees with it. Almost nobody implements it, because starting from zero is hard.

**The workflow that actually works:**

```
1. Start with a broad policy in DEV only
2. Run the workload; generate real usage
3. IAM Access Analyzer → generate a policy from CloudTrail history
4. Review, tighten, add resource ARNs and conditions
5. Apply the tight policy to staging, then production
```

```bash
# Generate a least-privilege policy from what the role actually did
aws accessanalyzer start-policy-generation \
  --policy-generation-details principalArn=arn:aws:iam::111122223333:role/app \
  --cloud-trail-details '{
    "trails":[{"cloudTrailArn":"arn:aws:cloudtrail:eu-west-1:111122223333:trail/main","allRegions":true}],
    "accessRole":"arn:aws:iam::111122223333:role/AccessAnalyzerRole",
    "startTime":"2026-07-01T00:00:00Z"
  }'
```

❌ **Bad — the policy everyone writes first:**

```json
{ "Effect": "Allow", "Action": "s3:*", "Resource": "*" }
```

✅ **Good — specific actions, specific resources, with conditions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOwnPrefixOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::acme-uploads/${aws:PrincipalTag/team}/*"
    },
    {
      "Sid": "RequireEncryptionInTransit",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::acme-uploads/*",
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

> ✨ **Conditions are where real least privilege lives.** `aws:SourceIp`, `aws:SecureTransport`, `aws:PrincipalTag`, `aws:RequestedRegion`, and `aws:MultiFactorAuthPresent` narrow a policy far more than trimming the action list.

## Zero Trust

"Never trust, always verify." The practical meaning is that **network location grants nothing**.

| Old model | Zero trust |
|-----------|-----------|
| Inside the VPC is trusted | 🔴 Nothing is trusted by location |
| VPN gets you access | Identity and device posture get you access |
| Firewall at the perimeter | Authorisation at every call |
| Long-lived credentials | ✅ Short-lived, scoped tokens |

**On AWS:**

| Principle | Implementation |
|-----------|---------------|
| Identity-based access | IAM roles, IRSA / Pod Identity — never access keys |
| Short-lived credentials | STS, OIDC federation |
| Verify every request | Service mesh mTLS, or IAM auth on the service |
| No implicit network trust | NetworkPolicy, security groups, PrivateLink |
| Continuous validation | GuardDuty, Access Analyzer, Config rules |

✅ **The practical litmus test:** if a compromised pod in your cluster can reach the database because it is on the same network, you are not doing zero trust — you are doing perimeter security with extra steps.

## Compliance Frameworks — What They Require

You do not need to memorise controls. You need to know what each framework cares about.

| Framework | Applies To | Cares Most About |
|-----------|-----------|-----------------|
| **SOC 2** | SaaS vendors | Change control, access review, monitoring evidence |
| **ISO 27001** | General | A documented management system, risk register |
| **PCI DSS** | Card data | Network segmentation, encryption, no TLS 1.0/1.1 |
| **HIPAA** | Health data | Encryption, audit logs, a signed BAA with AWS |
| **GDPR** | EU personal data | Data residency, deletion, breach notification within 72h |
| **FedRAMP** | US government | GovCloud, extensive documentation |

**What auditors actually ask for, in every framework:**

- [ ] Who has access to production, and when was that last reviewed?
- [ ] Evidence that changes are reviewed before deployment
- [ ] Proof that logs are immutable and retained
- [ ] Encryption at rest and in transit, demonstrated
- [ ] A tested incident response process
- [ ] Vulnerability management with remediation timelines

> ✅ **The DevOps answer to compliance is automation.** A screenshot of a setting is weak evidence. AWS Config rules with a continuous compliance history, plus CloudTrail, plus pull request records, is strong evidence — and it is generated for free by doing the work properly.

## The Failure Modes That Actually Happen

Ranked by how often they cause real breaches.

| Rank | Cause | Prevention |
|------|-------|-----------|
| 1 | 🔴 Public S3 bucket | Account-level public access block, SCP denying it |
| 2 | 🔴 Leaked long-lived access key | No IAM users at all — roles and OIDC only |
| 3 | Over-permissive IAM (`*:*`) | Access Analyzer, permission boundaries |
| 4 | Unpatched dependency | Automated scanning, patch SLA |
| 5 | Exposed management interface | No public SSH; SSM Session Manager |
| 6 | Secrets in Git | Pre-commit and CI secret scanning |
| 7 | No MFA on a privileged account | SCP requiring MFA |
| 8 | Compromised CI system | OIDC with scoped trust, no stored keys |

✅ **Notice what is not on this list:** sophisticated zero-day exploits. Real breaches are overwhelmingly misconfiguration and credential leakage. Boring controls prevent most of them.

## Guardrails vs Gates

| | Gate | Guardrail |
|---|---|---|
| **Timing** | Blocks before the fact | Prevents or detects continuously |
| **Example** | Manual security review | SCP; Config rule with auto-remediation |
| **Scales?** | 🔴 No — becomes a bottleneck | ✅ Yes |
| **Bypassable** | Under deadline pressure, yes | Only by changing the guardrail |

```json
// SCP: no account in the organisation can disable CloudTrail. Not even root.
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": [
      "cloudtrail:StopLogging",
      "cloudtrail:DeleteTrail",
      "guardduty:DeleteDetector",
      "config:DeleteConfigurationRecorder"
    ],
    "Resource": "*"
  }]
}
```

> ✅ **A Service Control Policy is the strongest guardrail on AWS.** It caps what is possible in an account regardless of IAM, and it applies to the root user too — which no IAM policy does.

## Interview Q&A

**Q: Explain the shared responsibility model.**

AWS is responsible for security *of* the cloud — physical data centres, the hypervisor, the host operating system, the network fabric, and patching of managed services. The customer is responsible for security *in* the cloud — their data, IAM configuration, network rules, encryption choices, and application code. The part worth emphasising is that the boundary moves depending on the service model. On EC2 you patch the guest OS, the runtime, and every library. On RDS, AWS patches the engine but you own users, schema, and parameter groups. On Fargate and Lambda, AWS handles the OS and runtime and you own only the code and dependencies. It matters because almost every incident reported as an "AWS breach" is actually a customer-side misconfiguration — a public bucket, an over-broad IAM policy, or a leaked access key — all of which sit squarely on the customer side of the line.

**Q: What does blast radius mean and how does it change your designs?**

Blast radius is the answer to "if this one thing is compromised, what else falls?" It reframes security from preventing compromise, which you cannot guarantee, to limiting what a compromise reaches. It changes concrete decisions: separate AWS accounts per environment rather than one account with tags, because an account boundary requires explicit cross-account trust to cross and cannot be misconfigured away by an IAM mistake. A role per service rather than one shared role, so a compromised service does not inherit every other service's permissions. Per-service database users with IAM authentication rather than one shared credential. Stateful resources in their own Terraform state so an application deploy cannot touch them. In each case the question is not whether the control prevents an attack, but how much it contains one.

**Q: Everyone says least privilege, but how do you actually implement it?**

Not by guessing the policy up front, which is why it usually fails. I start permissive in a development account only, run the workload so it generates real activity, then use IAM Access Analyzer to generate a policy from the CloudTrail history of what that role actually did. That gives an accurate starting point rather than a theoretical one. Then I tighten it: narrow resource ARNs from wildcards to specific ones, and add conditions, which is where the real reduction happens. Conditions like `aws:SecureTransport`, `aws:RequestedRegion`, `aws:PrincipalTag`, and `aws:MultiFactorAuthPresent` constrain a policy far more than trimming the action list does. The tightened policy goes to staging, then production. Alongside that, permission boundaries cap what any role can be granted regardless of the policies attached, which protects against a well-meaning future change.

**Q: What is a Service Control Policy and why is it stronger than an IAM policy?**

An SCP sits at the AWS Organizations level and defines the maximum permissions available in an account or organisational unit. It grants nothing — it only caps. The reason it is stronger than IAM is that it applies to every principal in the account including the root user, which no IAM policy can constrain. So an SCP denying `cloudtrail:StopLogging` means nobody in that account can disable audit logging, regardless of what IAM policies exist or who holds the root credentials. That makes it the right place for organisation-wide invariants: audit logging cannot be disabled, GuardDuty cannot be deleted, resources cannot be created outside approved regions, and public S3 access cannot be enabled. It is a guardrail rather than a gate — it scales without becoming a review bottleneck, and it cannot be bypassed under deadline pressure the way a manual approval can.

**Q: What does zero trust actually mean in an AWS context?**

That network location grants no privileges. In the old perimeter model, being inside the VPC or connected to the VPN implied trust, so a compromised workload could reach whatever the network allowed. Zero trust means every request is authenticated and authorised on its own merits regardless of where it came from. Practically on AWS: workloads get identity through IAM roles rather than credentials — IRSA or Pod Identity on EKS, task roles on ECS — and those produce short-lived STS credentials rather than long-lived keys. Service-to-service calls are authenticated, whether through mesh mTLS or IAM auth on the service itself. Network controls still exist as defence in depth, but they are not the authorisation mechanism. The litmus test I use is whether a compromised pod can reach the database purely because it is on the same network; if it can, that is perimeter security regardless of what it is called.

**Q: How do you approach compliance as a DevOps engineer?**

By generating evidence automatically rather than assembling it manually at audit time. Auditors across SOC 2, ISO 27001, and PCI DSS all want broadly the same things: proof of who has production access and that it is reviewed, evidence that changes are reviewed before deployment, immutable retained logs, demonstrated encryption at rest and in transit, a tested incident response process, and vulnerability management with remediation timelines. Almost all of that is a natural by-product of doing DevOps properly. Pull requests with required reviews are change control evidence. CloudTrail with log file validation to an S3 bucket with Object Lock is immutable audit logging. AWS Config rules produce a continuous compliance timeline rather than a point-in-time screenshot, and Config with auto-remediation demonstrates that drift is corrected rather than just detected. The mindset shift is treating compliance as a monitoring problem — a control either holds continuously and is evidenced, or it does not.

---
[Security Index](./README.md) | [IAM Deep Dive →](./02-iam-deep-dive.md)
