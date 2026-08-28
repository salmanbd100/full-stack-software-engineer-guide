---
title: IAM Deep Dive
part: 8
chapter: 0
slug: iam-deep-dive
level: advanced # beginner | intermediate | advanced
reading_time: 17
updated: 2026-08-03
tags: [devops, security, iam]
in_book: false
---

# IAM Deep Dive

IAM is the foundation of everything on AWS, and policy evaluation logic is where interviews get precise.

> For the basics — users, groups, roles, policy structure — see [AWS IAM](../AWS/02-iam.md). This file covers evaluation order, boundaries, and privilege escalation.

## 🔴 Policy Evaluation Logic

The single most important thing to know cold. Given a request, AWS decides like this:

```
1. Is there an explicit DENY anywhere?           → DENY. Stop. Always.
2. Does an SCP allow the action?                 → no → DENY
3. Does a resource control policy allow it?      → no → DENY
4. Is it within the permission boundary?         → no → DENY
5. Is it within the session policy?              → no → DENY
6. Does an identity or resource policy ALLOW?    → yes → ALLOW
7. Otherwise                                     → DENY (implicit)
```

**Two rules that follow from this:**

| Rule | Consequence |
|------|------------|
| **Explicit deny always wins** | No allow anywhere can override it |
| **Default is deny** | Permissions must be granted; nothing is implicit |

> ✅ **An explicit `Deny` is absolute.** This is why a `Deny` statement is the right tool for a hard guardrail, and why an SCP denying an action cannot be worked around by any IAM policy.

**The AND relationship people get wrong:**

```
Effective permissions = SCP ∩ permission boundary ∩ identity policy ∩ session policy
                        (an intersection — every layer must allow)
```

⚠️ A role with `AdministratorAccess` attached but a permission boundary of read-only can **only read**. The boundary is not additive; it is a ceiling.

## Identity vs Resource Policies

```
Identity policy: attached to a principal — "this role may read that bucket"
Resource policy: attached to a resource  — "that bucket may be read by this role"
```

**Same account:** either one is sufficient.

**Cross-account:** 🔴 **both are required.**

```
Account A role wants to read Account B's bucket:

Account A: identity policy allowing s3:GetObject on B's bucket   ✅ required
Account B: bucket policy allowing A's role                        ✅ required

Missing either one → access denied
```

✅ This is the most common cross-account debugging answer. People configure one side and are confused that it does not work.

```json
// Account B's bucket policy
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::111122223333:role/data-reader" },
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::acme-shared-data",
      "arn:aws:s3:::acme-shared-data/*"
    ]
  }]
}
```

⚠️ Note both ARNs. `ListBucket` acts on the **bucket**; `GetObject` acts on **objects**. Omitting the bucket ARN gives you object reads but a failing list operation.

## Roles and `sts:AssumeRole`

A role has two policies, and confusing them is a classic error.

| Policy | Answers |
|--------|---------|
| **Trust policy** | *Who* may assume this role |
| **Permissions policy** | *What* the role can do once assumed |

```json
// Trust policy — cross-account with an external ID
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::444455556666:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "acme-unique-value-9f3c" },
      "Bool": { "aws:MultiFactorAuthPresent": "true" }
    }
  }]
}
```

### 🔴 The Confused Deputy Problem

The reason `ExternalId` exists, and a favourite interview question.

```
You hire vendor V. You create a role trusting V's account so they can manage your infrastructure.

V also serves customer C.

C tells V: "manage the account with role ARN arn:aws:iam::YOU:role/vendor-access"

V assumes YOUR role on C's behalf.
→ C now has access to your account. 🔴
```

✅ **The fix:** the trust policy requires an `ExternalId` that only you and V know for *your* relationship. C cannot supply it, so V cannot be tricked into acting against your account.

⚠️ For AWS *services* assuming roles, the equivalent conditions are `aws:SourceAccount` and `aws:SourceArn`:

```json
{
  "Effect": "Allow",
  "Principal": { "Service": "s3.amazonaws.com" },
  "Action": "sts:AssumeRole",
  "Condition": {
    "StringEquals": { "aws:SourceAccount": "111122223333" },
    "ArnLike": { "aws:SourceArn": "arn:aws:s3:::acme-uploads" }
  }
}
```

Without those, any S3 bucket in any account could trigger your role.

## 🔴 Privilege Escalation Paths

The advanced topic that impresses interviewers. Several innocent-looking permissions are equivalent to administrator.

| Permission | Why It Is Admin |
|-----------|----------------|
| `iam:CreatePolicyVersion` | Rewrite any policy, including your own |
| `iam:AttachRolePolicy` | Attach `AdministratorAccess` to yourself |
| `iam:PutRolePolicy` | Write an inline admin policy |
| `iam:UpdateAssumeRolePolicy` | Make an admin role trust you |
| `iam:CreateAccessKey` | Create keys for an admin user |
| `iam:PassRole` + `lambda:CreateFunction` | Run code as any passable role |
| `iam:PassRole` + `ec2:RunInstances` | Launch an instance with an admin profile |
| `glue:CreateDevEndpoint` + `PassRole` | Same idea, different service |

> 🔴 **`iam:PassRole` is the quiet one.** On its own it does nothing. Combined with any service that runs code — Lambda, EC2, ECS, Glue, CodeBuild — it lets a principal execute with the permissions of whatever role they can pass.

✅ **Always scope `PassRole`:**

```json
{
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::111122223333:role/app-execution-role",
  "Condition": {
    "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" }
  }
}
```

❌ Never `"Resource": "*"` on `PassRole`. That is administrator with extra steps.

## Permission Boundaries

A ceiling on what a principal can do, regardless of attached policies. The tool for safe delegation.

**The problem it solves:** you want developers to create roles for their services, but not to create an admin role.

```json
// Boundary: the maximum any developer-created role may do
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*", "dynamodb:*", "sqs:*", "logs:*"],
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      "Action": ["iam:*", "organizations:*", "account:*"],
      "Resource": "*"
    }
  ]
}
```

```json
// Developer policy: may create roles, but ONLY with that boundary attached
{
  "Effect": "Allow",
  "Action": ["iam:CreateRole", "iam:PutRolePolicy", "iam:AttachRolePolicy"],
  "Resource": "arn:aws:iam::111122223333:role/app-*",
  "Condition": {
    "StringEquals": {
      "iam:PermissionsBoundary": "arn:aws:iam::111122223333:policy/DeveloperBoundary"
    }
  }
}
```

✅ **That condition is the whole mechanism.** Without it, a developer with `CreateRole` and `AttachRolePolicy` can create an admin role and assume it — a full escalation.

| | SCP | Permission Boundary |
|---|---|---|
| **Scope** | Whole account / OU | One principal |
| **Applies to root** | ✅ Yes | No |
| **Set by** | Organisation management | Account admin |
| **Purpose** | Organisational invariants | Safe delegation |

## ABAC — Tag-Based Access Control

Scales better than writing a policy per team.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ec2:StartInstances", "ec2:StopInstances"],
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        // The principal's team tag must match the resource's team tag
        "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
      }
    }
  }]
}
```

✅ **One policy serves every team forever.** A new team needs a tag, not a new policy.

⚠️ ABAC only works if tagging is enforced. Pair it with a `Deny` on resource creation without the required tags, or an SCP doing the same — otherwise untagged resources are accessible to nobody or everybody depending on the policy shape.

```json
// Enforce the tag at creation time
{
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": { "Null": { "aws:RequestTag/Team": "true" } }
}
```

## Eliminating Long-Lived Credentials

🔴 **Leaked access keys are the second most common cause of real breaches.** The goal is to have none.

| Instead of | Use |
|-----------|-----|
| IAM user keys for CI | ✅ OIDC federation with a scoped trust policy |
| Keys in an EC2 instance | ✅ Instance profile |
| Keys in a container | ✅ ECS task role, EKS Pod Identity or IRSA |
| Keys for a human | ✅ IAM Identity Center with SSO |
| Keys for a partner | ✅ Cross-account role with `ExternalId` |
| Keys in a Lambda | ✅ Execution role |

```json
// GitHub Actions OIDC — note how tightly the sub condition is scoped
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:acme/infra:environment:production"
    }
  }
}
```

🔴 **A wildcard in `sub` is a critical vulnerability.** `repo:acme/*` lets any repository in the organisation assume the role. `repo:acme/infra:*` lets any branch — including a branch pushed by an outside contributor in a fork-based workflow — assume a production role.

**Find and kill existing keys:**

```bash
# Every key older than 90 days
aws iam list-users --query 'Users[].UserName' --output text | tr '\t' '\n' | \
  while read -r u; do
    aws iam list-access-keys --user-name "$u" \
      --query "AccessKeyMetadata[?CreateDate<='$(date -u -v-90d +%Y-%m-%d)'].[UserName,AccessKeyId,CreateDate]" \
      --output text
  done

# Which permissions has this role never used? (last-accessed data)
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::111122223333:role/app
```

✅ Service last-accessed data is the practical tool for pruning unused permissions — it shows which services a role has actually touched.

## Auditing Access

```bash
# ✅ Does anything outside my account/org have access to this resource?
aws accessanalyzer list-findings \
  --analyzer-arn "$ANALYZER_ARN" \
  --filter '{"status":{"eq":["ACTIVE"]}}'

# Simulate before deploying a policy change
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::111122223333:role/app \
  --action-names s3:DeleteObject \
  --resource-arns arn:aws:s3:::acme-prod-data/file.txt
```

| Tool | Answers |
|------|---------|
| **IAM Access Analyzer** | ✅ What is reachable from outside the account or org? |
| **Access Analyzer policy generation** | What should this policy be, based on real usage? |
| **`simulate-principal-policy`** | Would this request be allowed? |
| **Service last-accessed** | Which granted permissions are unused? |
| **Credential report** | Keys, ages, MFA status for every user |

✅ **Access Analyzer's external-access findings are the highest-value automated check on AWS.** It catches the public bucket and the over-broad cross-account trust before an attacker does.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| `iam:PassRole` on `"*"` | 🔴 Full privilege escalation | Scope to specific roles + `iam:PassedToService` |
| Cross-account: only one side configured | Access denied, confusing | Both identity and resource policy |
| Wildcard in an OIDC `sub` condition | 🔴 Any repo/branch can assume the role | Pin repo and environment |
| No `ExternalId` for a vendor role | Confused deputy | Require `sts:ExternalId` |
| `CreateRole` without a boundary condition | Developer escalates to admin | `iam:PermissionsBoundary` condition |
| `ListBucket` without the bucket ARN | Listing fails, gets fixed with `*` | Both bucket and object ARNs |
| IAM users for services | Long-lived keys leak | Roles and OIDC only |
| Assuming a boundary adds permissions | Confusion when access is denied | It is a ceiling, not a grant |

## Interview Q&A

**Q: Walk me through how AWS evaluates whether a request is allowed.**

It starts by looking for an explicit deny anywhere in the applicable policies — organisation SCPs, resource policies, identity policies, permission boundaries, session policies — and if there is one, the request is denied and evaluation stops. An explicit deny can never be overridden. If there is no deny, the request must be permitted by every applicable layer: the SCP must allow it, any resource control policy must allow it, it must fall within the permission boundary and any session policy, and an identity or resource policy must actually grant it. That relationship is an intersection, not a union, which is the part people get wrong — a role with AdministratorAccess attached but a read-only permission boundary can only read, because the boundary caps rather than adds. If nothing explicitly allows the action, the implicit default is deny.

**Q: What is the confused deputy problem and how does `ExternalId` solve it?**

It arises when a third party acts on behalf of multiple customers. Suppose you engage a monitoring vendor and create a role in your account trusting the vendor's AWS account so they can read your metrics. That vendor also serves other customers. Another customer can tell the vendor "my role ARN is the one in your account", supplying *your* role ARN, and the vendor's system dutifully assumes it — giving that customer access to your account. The vendor is the confused deputy: it has legitimate permission and was tricked into misusing it. The fix is an `ExternalId` condition in your trust policy, a value known only to you and the vendor for your specific relationship, which the vendor must pass when assuming the role. Another customer cannot supply it, so the substitution fails. For AWS services assuming roles, the equivalent conditions are `aws:SourceAccount` and `aws:SourceArn`.

**Q: Why is `iam:PassRole` dangerous?**

Because on its own it looks harmless — it does not grant access to anything directly — but combined with any service that executes code it becomes privilege escalation. If a principal has `iam:PassRole` on `"*"` plus `lambda:CreateFunction`, they can create a function configured with an administrator role and invoke it, running arbitrary code with full account permissions. The same applies with `ec2:RunInstances` and an admin instance profile, or with ECS, Glue, CodeBuild, and several others. So `PassRole` should always be scoped to specific role ARNs, with an `iam:PassedToService` condition restricting which service the role can be passed to. It is worth calling out in reviews because the permission reads as administrative plumbing rather than as a security-critical grant, so it frequently gets wildcarded by people who would never write `iam:*`.

**Q: What is a permission boundary and how does it differ from an SCP?**

Both are ceilings rather than grants, but they operate at different scopes. A permission boundary attaches to an individual IAM principal and caps what that principal can do regardless of the policies attached to it. An SCP attaches to an account or organisational unit and caps everything in it, including the root user — which no IAM mechanism can constrain. The classic use for a boundary is safe delegation: you want developers to create roles for their own services without being able to create an admin role. You grant them `CreateRole` and `AttachRolePolicy`, but with a condition requiring `iam:PermissionsBoundary` to equal a specific boundary policy. Without that condition the delegation is a full escalation path, since anyone who can create a role and attach a policy can create an administrator and assume it. SCPs are for organisational invariants — CloudTrail cannot be disabled, resources cannot be created outside approved regions.

**Q: A role in account A cannot read a bucket in account B, and the identity policy looks correct. Why?**

Cross-account access requires both sides to permit it. The identity policy in account A grants the role permission to attempt the action, and the bucket policy in account B must independently allow that specific principal. Missing either one produces access denied, and because people usually configure the side they own, only one is present. Within a single account either policy alone is sufficient, which is why this catches people moving from same-account to cross-account. The second common cause is ARN scope: `s3:ListBucket` operates on the bucket resource while `s3:GetObject` operates on objects, so the policy needs both `arn:aws:s3:::bucket` and `arn:aws:s3:::bucket/*`. Listing fails with only the object ARN, and the usual reaction is to wildcard the resource rather than add the missing ARN. If the bucket uses SSE-KMS, the key policy also has to permit the cross-account principal.

**Q: How would you eliminate long-lived access keys?**

By replacing every use case with a role, since each one has a role-based equivalent. CI systems federate through OIDC and exchange a short-lived token for STS credentials. EC2 instances use instance profiles. Containers use ECS task roles or, on EKS, Pod Identity or IRSA. Humans use IAM Identity Center with SSO rather than IAM users. Partners and vendors get a cross-account role with an `ExternalId` condition. Lambda uses its execution role. Once those are in place, an SCP denying `iam:CreateAccessKey` prevents new keys appearing, and the credential report identifies existing ones to retire. The critical detail with OIDC is the trust policy's `sub` condition: it must pin the specific repository and environment, because a wildcard like `repo:acme/*` lets any repository in the organisation assume the role, which is a worse outcome than the keys you were removing.

---
[Security Index](./README.md) | [← Fundamentals](./01-fundamentals.md) | [Secrets Management →](./03-secrets.md)
