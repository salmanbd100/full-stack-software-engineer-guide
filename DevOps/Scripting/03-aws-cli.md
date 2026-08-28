---
title: AWS CLI Mastery
part: 8
chapter: 0
slug: aws-cli
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-03
tags: [devops, scripting, aws, cli]
in_book: false
---

# AWS CLI Mastery

The CLI is the fastest way to inspect and change AWS. Two features separate fluent users from everyone else: `--query` and profiles.

## Configuration and Profiles

```ini
# ~/.aws/config
[default]
region = eu-west-1
output = json
cli_pager =                          # ✅ stop the CLI opening a pager

[profile dev]
region = eu-west-1
sso_session = acme
sso_account_id = 111122223333
sso_role_name = Developer

[profile prod]
region = eu-west-1
sso_session = acme
sso_account_id = 444455556666
sso_role_name = ReadOnly            # ✅ read-only by default for prod

[profile prod-admin]
source_profile = prod
role_arn = arn:aws:iam::444455556666:role/Admin
mfa_serial = arn:aws:iam::999988887777:mfa/salman
duration_seconds = 3600             # ✅ short session for elevated access

[sso-session acme]
sso_start_url = https://acme.awsapps.com/start
sso_region = eu-west-1
sso_registration_scopes = sso:account:access
```

```bash
aws sso login --profile dev         # ✅ no long-lived keys anywhere
export AWS_PROFILE=dev
```

✅ **Make your production profile read-only and require a separate elevated profile with MFA for changes.** The friction is the point — it prevents muscle memory from running a destructive command against production.

🔴 **`cli_pager =` (empty) is worth setting immediately.** Without it, every command opens `less`, which breaks scripts and is infuriating interactively.

## 🔴 `--query` — the Skill That Matters

JMESPath, evaluated **server-side by the CLI** before output. Learn this rather than piping everything to `jq`.

```bash
# Flat list of running instance IDs
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' \
  --output text

# Multiple fields as a table
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,PrivateIpAddress,State.Name]' \
  --output table

# Named fields — best for JSON consumers
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,AZ:Placement.AvailabilityZone}'
```

**Filtering with `?`:**

```bash
# Instances missing an Owner tag
aws ec2 describe-instances \
  --query "Reservations[].Instances[?!not_null(Tags[?Key=='Owner'].Value)].InstanceId"

# Volumes not attached to anything
aws ec2 describe-volumes \
  --query 'Volumes[?State==`available`].[VolumeId,Size,CreateTime]' \
  --output table

# Log groups with no retention set — the classic cost leak
aws logs describe-log-groups \
  --query 'logGroups[?!retentionInDays].[logGroupName,storedBytes]' \
  --output table

# Sort and take the largest
aws s3api list-objects-v2 --bucket acme-data \
  --query 'reverse(sort_by(Contents,&Size))[:10].[Key,Size]' \
  --output table
```

| JMESPath | Meaning |
|----------|---------|
| `[]` | Flatten nested arrays |
| `[0]`, `[-1]`, `[:5]` | Index and slice |
| `[?Field=='value']` | Filter — 🔴 backticks for literals, quotes for strings |
| `.{A:x,B:y}` | Project into named fields |
| `.[x,y]` | Project into a positional list |
| `length(x)` | Count |
| `sort_by(x,&Field)` | Sort |
| `not_null(x)` | First non-null |
| `contains(x,'s')` | Substring/element test |

⚠️ **`--filters` vs `--query` is a real distinction.** `--filters` is applied by the AWS service, so it reduces what is transferred and is much faster on large accounts. `--query` is applied locally by the CLI after the response arrives. Use `--filters` where the API supports it, then `--query` to shape the output.

## Output Formats

| Format | Use |
|--------|-----|
| `json` | Default; feed to `jq` or a program |
| `text` | ✅ Shell loops — tab-separated, no quotes |
| `table` | Human reading |
| `yaml` | Readable nested structures |

```bash
# ✅ text + query is the idiomatic pattern for shell iteration
for id in $(aws ec2 describe-instances \
              --filters "Name=tag:Environment,Values=dev" \
              --query 'Reservations[].Instances[].InstanceId' \
              --output text); do
  aws ec2 create-tags --resources "$id" --tags Key=Reviewed,Value=true
done
```

🔴 **`--output text` returns an empty string, not an error, when nothing matches.** Always guard the loop, or you silently do nothing and assume it worked.

## Pagination

```bash
# ✅ The CLI auto-paginates by default. These control it:
aws s3api list-objects-v2 --bucket acme-data --page-size 100   # per API call
aws s3api list-objects-v2 --bucket acme-data --max-items 50    # total returned

# 🔴 --max-items returns a NextToken — resume with it
aws s3api list-objects-v2 --bucket acme-data \
  --max-items 50 --starting-token "$TOKEN"
```

⚠️ `--page-size` reduces the size of each API call, which helps with timeouts on huge result sets. `--max-items` caps the total — and if there is more, the CLI prints a `NextToken` you must handle.

## Waiters

Stop writing sleep loops.

```bash
aws ec2 wait instance-running --instance-ids i-0abc123
aws ec2 wait instance-status-ok --instance-ids i-0abc123    # ✅ passes health checks
aws rds wait db-instance-available --db-instance-identifier acme-prod
aws cloudformation wait stack-create-complete --stack-name app
aws ecs wait services-stable --cluster prod --services api
```

✅ Waiters poll with correct intervals and fail with a clear error on timeout. `aws ec2 wait instance-status-ok` is the one you want after launching — `instance-running` only means the hypervisor started it, not that it is usable.

## Assuming Roles

```bash
# ✅ Best: define the role in ~/.aws/config and let the CLI handle it
aws s3 ls --profile prod-admin

# Manual, when you need the credentials in a subprocess
creds=$(aws sts assume-role \
  --role-arn arn:aws:iam::444455556666:role/Admin \
  --role-session-name cli-session \
  --duration-seconds 3600 \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text)

read -r AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN <<< "$creds"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

# 🔴 Always confirm which identity you now hold
aws sts get-caller-identity
```

## High-Value Commands

```bash
# 🔴 Who am I? Run this before anything destructive.
aws sts get-caller-identity

# Untagged running instances across every region
for r in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  aws ec2 describe-instances --region "$r" \
    --filters "Name=instance-state-name,Values=running" \
    --query "Reservations[].Instances[?!not_null(Tags[?Key=='Owner'].Value)].InstanceId" \
    --output text | tr '\t' '\n' | sed "s|^|$r: |"
done

# Unattached EBS volumes — pure waste
aws ec2 describe-volumes --filters "Name=status,Values=available" \
  --query 'sum(Volumes[].Size)'

# Security groups open to the world on SSH
aws ec2 describe-security-groups \
  --query "SecurityGroups[?IpPermissions[?FromPort==\`22\` && contains(IpRanges[].CidrIp, '0.0.0.0/0')]].[GroupId,GroupName]" \
  --output table

# What did this principal do?
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=suspicious-role \
  --query 'Events[].[EventTime,EventName,SourceIPAddress]' --output table

# Costs by service, last month
aws ce get-cost-and-usage \
  --time-period Start=2026-07-01,End=2026-08-01 \
  --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' \
  --output table
```

## S3 Commands

```bash
# High-level: sync, with the flags that matter
aws s3 sync ./dist s3://acme-assets/ \
  --delete \                                 # remove files not in source
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.map" \
  --dryrun                                   # ✅ always check first

# ✅ Two-pass pattern for correct cache headers
aws s3 sync ./dist s3://acme-assets/ --exclude "*.html" \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync ./dist s3://acme-assets/ --exclude "*" --include "*.html" \
  --cache-control "public,max-age=0,s-maxage=300"

# Total size of a prefix
aws s3 ls s3://acme-data/logs/ --recursive --human-readable --summarize | tail -2
```

⚠️ `s3 sync --delete` is destructive. `--dryrun` first, every time.

## Configuration and Debugging

```bash
# Retry behaviour — important for bulk scripts
aws configure set retry_mode adaptive
aws configure set max_attempts 10

# See the actual HTTP requests
aws ec2 describe-instances --debug 2>&1 | grep -E 'MainThread|body'

# Skip the CLI's own credential lookup delay in CI
export AWS_EC2_METADATA_DISABLED=true
```

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Not running `get-caller-identity` first | Command hits the wrong account | Verify before destructive actions |
| `--query` where `--filters` exists | Slow, transfers everything | Filter server-side first |
| Unguarded `--output text` loop | Silently does nothing | Check for empty output |
| `sleep 60` instead of a waiter | Flaky, slow | `aws … wait …` |
| `s3 sync --delete` without dryrun | 🔴 Deletes the wrong files | `--dryrun` |
| Long-lived keys in `~/.aws/credentials` | Leak risk | SSO |
| Write access on the default prod profile | Accidental changes | Read-only default, MFA for elevation |
| Forgetting `--region` on a global loop | Silently queries only one region | Iterate `describe-regions` |

## Interview Q&A

**Q: What is the difference between `--filters` and `--query`?**

`--filters` is sent to the AWS service, which applies it before responding, so less data crosses the network and the call is much faster on a large account. `--query` is JMESPath applied locally by the CLI after the full response has arrived. That makes them complementary rather than interchangeable: use `--filters` to reduce what the API returns wherever the API supports it, then `--query` to shape and project the fields you want. Getting this wrong matters at scale — describing every instance in an account with thousands of them and filtering locally is slow, and can hit timeouts, where a server-side filter returns in a fraction of the time. Not all APIs support filters, and the filter syntax differs per service, which is why people reach for `--query` for everything.

**Q: How do you avoid running a destructive command against the wrong account?**

Several layers. First, `aws sts get-caller-identity` before anything destructive, which is a one-second check that has saved a great many people. Second, profile design: the default production profile is read-only, and making changes requires an explicitly-named elevated profile that requires MFA and has a short session duration. The friction is deliberate, because the failure mode is muscle memory rather than ignorance. Third, in scripts, an explicit account verification function that compares `get-caller-identity` against an expected account ID and exits if it does not match. Fourth, dry-run defaults on anything destructive, so acting requires a flag. And for the specific case of `s3 sync --delete`, always `--dryrun` first, because the combination of a wrong prefix and `--delete` removes data rather than just adding it.

**Q: Why use waiters instead of sleep loops?**

Because sleep loops are simultaneously too slow and too fragile. A fixed `sleep 60` wastes time when the resource is ready in ten seconds and fails when it takes ninety. A hand-written polling loop has to get the polling interval, the timeout, and the terminal-state detection right, and usually gets at least one wrong. Waiters implement all of that per resource type with intervals AWS has tuned, and they fail with a clear error on timeout rather than continuing silently. The important detail is choosing the right waiter: after launching an instance, `instance-running` only means the hypervisor has started it, whereas `instance-status-ok` means it has passed both system and instance status checks and is actually usable. Using the wrong one produces scripts that intermittently fail against a freshly-launched host.

**Q: How should credentials be configured for CLI use?**

Through IAM Identity Center with `aws sso login`, so there are no long-lived access keys in `~/.aws/credentials` at all. Each profile maps to an account and a permission set, and the CLI handles retrieving and caching short-lived credentials. For roles that need assuming, the profile declares `source_profile` and `role_arn` with an `mfa_serial`, and the CLI performs the assume-role transparently — so you never manually export credentials. The design principle I would apply is that the profile you have selected by default should be the least dangerous one: read-only in production, with a separate profile name for elevated access. In CI, none of this applies — that should be OIDC federation with no stored credentials whatsoever.

**Q: A command works but returns nothing in a loop. What is going on?**

Almost certainly `--output text` with a `--query` that matched nothing, which returns an empty string rather than an error, so the `for` loop iterates zero times and the script reports success having done nothing. It is a genuinely dangerous silent failure, because the script logs no error and exits zero. The fix is to capture the output into a variable, check whether it is empty, and handle that case explicitly before looping. A related cause is a JMESPath expression that is subtly wrong — for instance forgetting the flattening `[]` on nested arrays, so `Reservations[].Instances[].InstanceId` becomes `Reservations[*].Instances` and produces nested output that does not iterate as expected. Testing the query with `--output json` first, before switching to `text`, makes the structure visible.

---
[Scripting Index](./README.md) | [← Python for AWS](./02-python-aws.md) | [AWS SDK →](./04-aws-sdk.md)
