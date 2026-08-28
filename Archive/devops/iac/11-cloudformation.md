---
title: AWS CloudFormation
part: 8
chapter: 0
slug: cloudformation
level: intermediate # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-03
tags: [devops, iac, cloudformation]
in_book: false
---

# AWS CloudFormation

CloudFormation is AWS's own IaC service. You will meet it in interviews mainly as the comparison against Terraform — and because it is what CDK, SAM, and Serverless Framework compile down to.

## How It Differs From Terraform

The single biggest difference: **AWS manages the state, not you.**

| | Terraform | CloudFormation |
|---|---|---|
| **State** | You own an S3 state file | AWS owns it inside the stack |
| **Locking** | You configure it | Automatic |
| **Language** | HCL | YAML or JSON |
| **Scope** | 3000+ providers | AWS only |
| **Rollback** | Manual — fix forward | Automatic on failure |
| **Diff preview** | `terraform plan` | Change sets |
| **Drift** | Scheduled plan | Built-in drift detection |
| **New AWS features** | Wait for the provider | Usually available at launch |

> Losing a state file is a real Terraform risk that does not exist in CloudFormation. Automatic rollback is a real CloudFormation feature that Terraform does not have.

## Template Anatomy

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Application stack with an ALB and ECS service

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
  InstanceType:
    Type: String
    Default: t3.medium

Mappings:
  EnvConfig:
    dev:      { MinSize: 1, MultiAZ: false }
    prod:     { MinSize: 6, MultiAZ: true }

Conditions:
  IsProd: !Equals [!Ref Environment, prod]

Resources:
  AppBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain            # keep the bucket if the stack is deleted
    UpdateReplacePolicy: Retain
    Properties:
      BucketName: !Sub 'acme-${Environment}-app'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms

  Database:
    Type: AWS::RDS::DBInstance
    Condition: IsProd                  # only created in prod
    Properties:
      Engine: postgres
      MultiAZ: !FindInMap [EnvConfig, !Ref Environment, MultiAZ]
      ManageMasterUserPassword: true   # AWS generates and rotates it

Outputs:
  BucketName:
    Value: !Ref AppBucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'   # other stacks can import this
```

**The sections that matter:**

| Section | Purpose |
|---------|---------|
| `Parameters` | Inputs, with type and allowed-value validation |
| `Mappings` | Static lookup tables — the environment-config pattern |
| `Conditions` | Create a resource only when something is true |
| `Resources` | The only required section |
| `Outputs` | Values other stacks can import |

## Intrinsic Functions

CloudFormation's equivalent of Terraform expressions. These are the ones you need.

```yaml
!Ref MyBucket                       # resource ID, or a parameter value
!GetAtt MyBucket.Arn                # a specific attribute
!Sub 'acme-${Environment}-logs'     # string interpolation
!Sub                                # with explicit variable mapping
  - '${Bucket}/data/*'
  - Bucket: !GetAtt MyBucket.Arn
!FindInMap [EnvConfig, prod, MinSize]
!If [IsProd, 'db.r6g.xlarge', 'db.t4g.micro']
!ImportValue network-stack-VpcId    # a value exported by another stack
!Join ['-', ['acme', !Ref Environment]]
```

⚠️ `!Ref` returns different things for different resource types — a bucket name for S3, an instance ID for EC2, an ARN for some others. You have to check the documentation per resource. This is a common source of confusion.

## Change Sets

CloudFormation's answer to `terraform plan`.

```bash
aws cloudformation create-change-set \
  --stack-name acme-prod-app \
  --change-set-name review-2024-08 \
  --template-body file://template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=prod \
  --capabilities CAPABILITY_IAM

aws cloudformation describe-change-set \
  --stack-name acme-prod-app \
  --change-set-name review-2024-08

aws cloudformation execute-change-set \
  --stack-name acme-prod-app \
  --change-set-name review-2024-08
```

**The field to look for:**

```json
{
  "Action": "Modify",
  "Replacement": "True",        // 🔴 destroy and recreate
  "ResourceChange": {
    "LogicalResourceId": "Database"
  }
}
```

`"Replacement": "True"` is CloudFormation's `must be replaced`. On a database, that is data loss.

⚠️ Change sets are less readable than `terraform plan`. They also often report `Replacement: "Conditionally"`, meaning CloudFormation cannot tell in advance — which is not a comfortable answer for a production database.

## Deletion Policies

The controls that stop a stack deletion taking your data with it.

```yaml
Database:
  Type: AWS::RDS::DBInstance
  DeletionPolicy: Snapshot          # take a final snapshot, then delete
  UpdateReplacePolicy: Snapshot     # also on replacement

LogsBucket:
  Type: AWS::S3::Bucket
  DeletionPolicy: Retain            # leave it behind, orphaned but intact
  UpdateReplacePolicy: Retain
```

| Policy | Behaviour |
|--------|-----------|
| `Delete` | Default — the resource goes |
| `Retain` | Left in place, no longer managed by the stack |
| `Snapshot` | Snapshot taken first (RDS, EBS, ElastiCache, Redshift) |

🔴 `UpdateReplacePolicy` matters as much as `DeletionPolicy`. Without it, a property change that forces replacement deletes your data even though the stack itself was never deleted.

**Stack policies** — prevent updates to specific resources:

```json
{
  "Statement": [{
    "Effect": "Deny",
    "Action": "Update:Replace",
    "Principal": "*",
    "Resource": "LogicalResourceId/Database"
  }]
}
```

## Nested Stacks vs Cross-Stack References

Two ways to break up a large template.

**Nested stacks** — a parent creates children:

```yaml
Resources:
  NetworkStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/acme-templates/network.yaml
      Parameters:
        VpcCidr: 10.0.0.0/16

  AppStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/acme-templates/app.yaml
      Parameters:
        VpcId: !GetAtt NetworkStack.Outputs.VpcId
```

**Cross-stack references** — independent stacks, exported outputs:

```yaml
# In the network stack
Outputs:
  VpcId:
    Value: !Ref Vpc
    Export:
      Name: network-VpcId
```

```yaml
# In the app stack
Resources:
  Subnet:
    Properties:
      VpcId: !ImportValue network-VpcId
```

| | Nested Stacks | Cross-Stack Exports |
|---|---|---|
| **Lifecycle** | Deployed together | Independent |
| **Coupling** | Parent owns children | Loose |
| **Gotcha** | Parent update touches all children | 🔴 Cannot change an export while something imports it |

🔴 The export lock is a real operational problem. Once a stack imports `network-VpcId`, the network stack cannot modify or delete that export until every importer stops using it. Refactoring becomes a multi-step dance.

✅ Terraform has no equivalent problem, because a data source lookup creates no lock.

## StackSets

Deploy one template across many accounts and regions — CloudFormation's genuine advantage.

```bash
aws cloudformation create-stack-set \
  --stack-set-name security-baseline \
  --template-body file://baseline.yaml \
  --permission-model SERVICE_MANAGED \
  --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false
```

✅ With AWS Organizations, `auto-deployment` means every **new** account automatically gets the baseline — CloudTrail, Config rules, guardrail IAM roles. Doing this in Terraform means a provider alias per account and a pipeline that knows about new accounts.

> If the question is "how do you enforce a security baseline across 200 AWS accounts?", StackSets is a strong answer even in a Terraform shop.

## AWS CDK

CDK lets you write TypeScript that **synthesises** a CloudFormation template.

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface AppStackProps extends cdk.StackProps {
  environment: "dev" | "staging" | "prod";
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const isProd: boolean = props.environment === "prod";

    // Secure defaults come from the construct, not from you remembering
    const bucket = new s3.Bucket(this, "AppBucket", {
      encryption: s3.BucketEncryption.KMS_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: isProd,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const db = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      multiAz: isProd,
      deletionProtection: isProd,
      // CDK wires up Secrets Manager with rotation automatically
      credentials: rds.Credentials.fromGeneratedSecret("app"),
      vpc: props.vpc,
    });

    // grantRead writes the IAM policy for you — no hand-written JSON
    bucket.grantRead(db.grantPrincipal);
  }
}
```

**Why teams like CDK:**

- ✅ Real loops, types, and IDE autocomplete
- ✅ L2 constructs come with secure defaults built in
- ✅ Helper methods like `grantRead()` generate correct least-privilege IAM policies
- ✅ Unit-testable with Jest against the synthesised template

**Why teams regret it:**

- ❌ The deployed artifact is still CloudFormation, so you debug generated templates
- ❌ `cdk diff` is a change set, with the same replacement ambiguity
- ❌ Easy to build unreviewable abstractions — a one-line change can alter fifty resources
- ❌ AWS only

| | CloudFormation | CDK | Terraform |
|---|---|---|---|
| **Language** | YAML | TypeScript/Python | HCL |
| **Loops** | Painful | Native | `for_each` |
| **Diff clarity** | Change set | Change set | ✅ Best |
| **Scope** | AWS | AWS | Anything |
| **Testability** | Weak | ✅ Strong | `terraform test` |

## Common Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `UPDATE_ROLLBACK_FAILED` | Rollback itself failed | `continue-update-rollback`, possibly skipping resources |
| Stack stuck `IN_PROGRESS` | Waiting on a resource that will never signal | Wait for the timeout, or cancel the update |
| `DELETE_FAILED` on a bucket | S3 buckets must be empty to delete | Empty it, then retry |
| Cannot modify an export | Another stack imports it | Remove the import first, then change the export |
| `ROLLBACK_COMPLETE` on create | First create failed | 🔴 Cannot be updated — delete the stack and recreate |

⚠️ A stack in `ROLLBACK_COMPLETE` after a failed *initial* create is unusable. Your only option is to delete it and start again. This surprises people the first time.

## Which to Choose

**Choose CloudFormation or CDK when:**

- ✅ AWS-only, and you want zero state to operate
- ✅ You need StackSets across many accounts
- ✅ Service Catalog, or an AWS-native compliance requirement
- ✅ Automatic rollback on failure genuinely matters to you

**Choose Terraform when:**

- ✅ Multiple providers — DNS, monitoring, SaaS, more than one cloud
- ✅ You want the clearest possible diff before applying
- ✅ You value the module ecosystem
- ✅ The team already knows it

✅ **A common real setup:** Terraform for everything, plus CloudFormation StackSets for the organisation-wide security baseline. Using both is not a failure — they are good at different things.

## Interview Q&A

**Q: Terraform or CloudFormation?**

It depends mainly on whether the estate is AWS-only. CloudFormation's real advantage is that AWS owns the state, so there is no state bucket to secure, no locking to configure, and no risk of losing or corrupting a state file. It also rolls back automatically when an update fails, has built-in drift detection, and supports new AWS features on launch day rather than waiting for a provider release. StackSets are genuinely strong for pushing a baseline across many accounts. I would still default to Terraform for most work, because real systems are not one provider — you also manage DNS, monitoring, and SaaS configuration, and Terraform gives you one workflow for all of it. `terraform plan` is also considerably clearer than a change set, which matters most exactly when the change is risky.

**Q: What is a change set and how does it compare to `terraform plan`?**

A change set is CloudFormation's preview: you submit the new template, CloudFormation computes what would change, and you inspect it before executing. The most important field is `Replacement`, because `"True"` means destroy and recreate. The comparison with `terraform plan` is unfavourable in two ways. First, readability — a change set is JSON describing resource-level actions, whereas `terraform plan` shows attribute-level diffs with the specific attribute that forces replacement annotated inline. Second, and more seriously, change sets frequently report `Replacement: "Conditionally"`, meaning CloudFormation genuinely cannot tell in advance whether the resource will be replaced. When the resource is a production database, "possibly" is not an acceptable answer, and that ambiguity is one of the strongest practical arguments for Terraform.

**Q: What is the difference between `DeletionPolicy` and `UpdateReplacePolicy`?**

`DeletionPolicy` controls what happens to a resource when the stack is deleted or the resource is removed from the template — `Delete` by default, `Retain` to leave it in place unmanaged, or `Snapshot` to capture the data first on supported types like RDS and EBS. `UpdateReplacePolicy` controls the same thing when the resource is replaced during an update, which is the case people forget. If you set only `DeletionPolicy: Retain` and then change a property that forces replacement, CloudFormation deletes the old resource as part of a normal stack update and your data is gone, even though nobody deleted the stack. Both should be set on anything holding data. It is a rough equivalent of Terraform's `prevent_destroy`, though `prevent_destroy` is stricter because it fails the plan outright rather than salvaging a snapshot.

**Q: What are the drawbacks of cross-stack exports?**

The export lock. Once stack B imports a value exported by stack A, stack A cannot modify or delete that export until every importer has stopped using it. So a change to the network stack's VPC output becomes a multi-step deployment: remove the import from every consumer, deploy those, change the export, then add the imports back. It turns a one-line refactor into a coordinated release, and it gets worse the more consumers you have. Nested stacks avoid the lock but replace it with tight coupling, since the parent owns the children's lifecycle and a parent update ripples into all of them. Terraform does not have this problem, because reading a value with a data source creates no dependency the producer has to respect.

**Q: When would you use CDK over writing CloudFormation directly?**

When the team is comfortable in TypeScript and the value of real abstraction outweighs the cost of a generated artifact. CDK's L2 constructs come with secure defaults, so a bucket is encrypted and public access is blocked without anyone remembering to add it, and helper methods like `grantRead()` generate correct least-privilege IAM policies instead of hand-written JSON. You also get loops, types, IDE completion, and unit tests against the synthesised template. The costs are real though: what deploys is still CloudFormation, so you debug generated templates and inherit change-set ambiguity, and it is easy to build abstractions where a one-line change quietly alters fifty resources. I would use CDK on an AWS-only estate with a strong TypeScript team, and I would insist on reviewing `cdk diff` output rather than only the TypeScript.

**Q: A CloudFormation stack is stuck in `UPDATE_ROLLBACK_FAILED`. What do you do?**

That state means the update failed and the automatic rollback also failed, usually because a resource cannot return to its previous configuration — a security group rule that another resource now depends on, or an IAM permission that was removed mid-update. The recovery is `continue-update-rollback`, optionally with `--resources-to-skip` naming the resources blocking it, which leaves those resources in an inconsistent state that you then reconcile by hand before the stack is healthy again. The related trap worth knowing is `ROLLBACK_COMPLETE` after a failed *initial* create: that stack cannot be updated at all, and the only option is to delete it and start over. Both are situations Terraform handles differently — it does not roll back, so a failed apply leaves you with accurate state and partial infrastructure, which is usually easier to reason about than a stack fighting its own rollback.

---
[← Terraform Best Practices](../Terraform/10-best-practices.md) | [GitOps →](./12-gitops.md)
