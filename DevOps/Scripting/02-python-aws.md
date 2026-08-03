# Python for AWS (Boto3)

Boto3 is the AWS SDK for Python and the default choice for automation that is too complex for bash — anything with real data structures, error handling, or retry logic.

> ⚠️ **Language note:** this repository standardises on TypeScript for code examples. This topic is Python by definition, so the examples here are Python. For the TypeScript SDK, see [AWS SDK](./04-aws-sdk.md).

## When Python Beats Bash

| Use Bash | Use Python |
|----------|-----------|
| Under 50 lines | Real data structures needed |
| A sequence of CLI calls | Pagination, retries, error branching |
| Glue between tools | Parsing and transforming JSON |
| Cron wrappers | ✅ Lambda functions |
| Local developer tooling | Anything that needs unit tests |

🔴 **The signal to switch:** the moment you reach for `jq` inside a loop, or your script has functions taking more than two arguments, bash has stopped being the right tool.

## Client vs Resource

Boto3 has two interfaces, and interviewers ask which you use.

```python
import boto3

# Client — low-level, mirrors the AWS API exactly
s3_client = boto3.client("s3")
response = s3_client.list_objects_v2(Bucket="acme-data", Prefix="logs/")
for obj in response.get("Contents", []):       # ✅ .get() — key absent if empty
    print(obj["Key"], obj["Size"])

# Resource — higher-level, object-oriented
s3 = boto3.resource("s3")
bucket = s3.Bucket("acme-data")
for obj in bucket.objects.filter(Prefix="logs/"):
    print(obj.key, obj.size)                    # ✅ auto-paginates
```

| | Client | Resource |
|---|---|---|
| **API coverage** | ✅ Complete | Partial, and 🔴 no longer developed |
| **Pagination** | Manual, or via paginators | ✅ Automatic |
| **Style** | Dictionaries | Objects |
| **Recommendation** | ✅ Use this | Legacy — fine in existing code |

⚠️ **AWS has stopped adding resource interfaces for new services.** Use `client` for anything new so you are not blocked when a feature has no resource equivalent.

## 🔴 Pagination — the Bug That Ships

The most common Boto3 mistake: AWS truncates responses, and code that ignores it silently processes only the first page.

```python
# ❌ Returns at most 1000 objects. Works in dev, breaks in production.
response = s3.list_objects_v2(Bucket="acme-data")
for obj in response["Contents"]:
    process(obj)

# ✅ Paginator — handles continuation tokens for you
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="acme-data", Prefix="logs/"):
    for obj in page.get("Contents", []):
        process(obj)
```

```python
# ✅ Server-side filtering with JMESPath — less data transferred
paginator = ec2.get_paginator("describe_instances")
pages = paginator.paginate(
    Filters=[{"Name": "instance-state-name", "Values": ["running"]}],
)

for instance_id in pages.search("Reservations[].Instances[].InstanceId"):
    print(instance_id)
```

> 🔴 **Almost every `list_*` and `describe_*` call paginates.** If the code does not use a paginator or check `NextToken`, assume it is silently incomplete.

## Error Handling

```python
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client("s3")


def bucket_exists(bucket: str) -> bool:
    try:
        s3.head_bucket(Bucket=bucket)
        return True
    except ClientError as exc:
        # ✅ Branch on the error code, don't swallow everything
        code = exc.response["Error"]["Code"]
        if code in ("404", "NoSuchBucket"):
            return False
        if code == "403":
            raise PermissionError(f"no access to {bucket}") from exc
        raise
```

⚠️ **Do not use a bare `except ClientError: return False`.** A permissions error then looks identical to "does not exist", and you create a bucket that already exists in another account — or worse, conclude a resource is gone and delete its replacement.

```python
# Service-specific exceptions are cleaner where they exist
try:
    secret = secrets.get_secret_value(SecretId="acme/prod/db")
except secrets.exceptions.ResourceNotFoundException:
    ...
except secrets.exceptions.DecryptionFailure:
    ...
```

## Retries and Throttling

```python
from botocore.config import Config
import boto3

# ✅ Adaptive mode adds client-side rate limiting on top of retries
config = Config(
    retries={"max_attempts": 10, "mode": "adaptive"},
    connect_timeout=5,
    read_timeout=60,
    max_pool_connections=50,
)

ec2 = boto3.client("ec2", config=config)
```

| Retry mode | Behaviour |
|-----------|-----------|
| `legacy` | Old default, limited scope |
| `standard` | Consistent across SDKs, retries throttling and 5xx |
| ✅ `adaptive` | Standard plus client-side rate limiting that backs off automatically |

✅ **`adaptive` is the right default for bulk operations**, because it slows the client down when AWS starts throttling rather than hammering harder.

⚠️ Set explicit timeouts. The defaults are long, so a hung connection can stall a Lambda until it times out with no useful error.

## Sessions and Assuming Roles

```python
import boto3
from typing import Optional


def assume_role_session(
    role_arn: str,
    session_name: str,
    external_id: Optional[str] = None,
) -> boto3.Session:
    """Return a Session using temporary credentials from an assumed role."""
    sts = boto3.client("sts")

    kwargs = {"RoleArn": role_arn, "RoleSessionName": session_name}
    if external_id:
        kwargs["ExternalId"] = external_id

    creds = sts.assume_role(**kwargs)["Credentials"]

    return boto3.Session(
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
    )


# Iterate over accounts in an organisation
def audit_all_accounts(role_name: str) -> None:
    org = boto3.client("organizations")
    paginator = org.get_paginator("list_accounts")

    for page in paginator.paginate():
        for account in page["Accounts"]:
            if account["Status"] != "ACTIVE":
                continue

            session = assume_role_session(
                f"arn:aws:iam::{account['Id']}:role/{role_name}",
                f"audit-{account['Id']}",
            )
            s3 = session.client("s3")
            # ... audit this account ...
```

🔴 **Assumed-role credentials expire** (one hour by default). A long-running script must refresh them, which `botocore`'s `RefreshableCredentials` handles — or simply re-assume per account as above.

## Common Automation Patterns

**Find and clean up untagged resources:**

```python
import boto3
from datetime import datetime, timedelta, timezone

REQUIRED_TAGS = {"Environment", "Owner", "CostCentre"}


def find_noncompliant_instances(region: str) -> list[dict[str, object]]:
    ec2 = boto3.client("ec2", region_name=region)
    paginator = ec2.get_paginator("describe_instances")
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

    findings: list[dict[str, object]] = []

    for page in paginator.paginate(
        Filters=[{"Name": "instance-state-name", "Values": ["running"]}],
    ):
        for reservation in page["Reservations"]:
            for instance in reservation["Instances"]:
                # Grace period so newly-launched instances are not flagged
                if instance["LaunchTime"] > cutoff:
                    continue

                tags = {t["Key"] for t in instance.get("Tags", [])}
                missing = REQUIRED_TAGS - tags

                if missing:
                    findings.append({
                        "instance_id": instance["InstanceId"],
                        "region": region,
                        "missing_tags": sorted(missing),
                    })

    return findings
```

**Concurrency across regions:**

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def audit_all_regions() -> list[dict[str, object]]:
    regions = [
        r["RegionName"]
        for r in boto3.client("ec2").describe_regions()["Regions"]
    ]

    results: list[dict[str, object]] = []

    # ✅ Boto3 clients are NOT thread-safe — create one per thread
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(find_noncompliant_instances, r): r for r in regions
        }
        for future in as_completed(futures):
            region = futures[future]
            try:
                results.extend(future.result())
            except Exception as exc:
                print(f"{region} failed: {exc}")

    return results
```

🔴 **Boto3 clients are not thread-safe.** Sessions are also not thread-safe. Create a client inside each worker, or use one client per thread — sharing one across threads produces intermittent, very confusing failures.

## Lambda Handlers

```python
import json
import logging
import os
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# ✅ Initialise clients OUTSIDE the handler — reused across warm invocations
ec2 = boto3.client("ec2")
sns = boto3.client("sns")

TOPIC_ARN = os.environ["ALERT_TOPIC_ARN"]   # fail fast at cold start if missing


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Isolate an instance flagged by a GuardDuty finding."""
    logger.info("event: %s", json.dumps(event))

    detail = event["detail"]
    instance_id = (
        detail["resource"]["instanceDetails"]["instanceId"]
    )
    finding = detail["type"]

    try:
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            Groups=[os.environ["QUARANTINE_SG_ID"]],
        )
        logger.info("isolated %s", instance_id)

        sns.publish(
            TopicArn=TOPIC_ARN,
            Subject=f"Instance {instance_id} isolated",
            Message=f"GuardDuty finding {finding} — instance quarantined.",
        )
        return {"statusCode": 200, "instanceId": instance_id}

    except Exception:
        # ✅ exception() logs the traceback; re-raise so Lambda records a failure
        logger.exception("failed to isolate %s", instance_id)
        raise
```

| Lambda practice | Why |
|----------------|-----|
| ✅ Clients outside the handler | Reused on warm invocations — saves 50–200 ms |
| ✅ Read required env vars at import | Fails at cold start, not mid-request |
| ✅ `logger`, not `print` | Structured, level-controlled |
| ✅ Re-raise on failure | Lambda retries and the error metric increments |
| ⚠️ Idempotency | Lambda can invoke more than once for one event |

## Testing with moto

```python
import boto3
import pytest
from moto import mock_aws


@mock_aws
def test_finds_untagged_instances() -> None:
    ec2 = boto3.client("ec2", region_name="eu-west-1")

    ec2.run_instances(
        ImageId="ami-12345678",
        MinCount=1,
        MaxCount=1,
        TagSpecifications=[{
            "ResourceType": "instance",
            "Tags": [{"Key": "Environment", "Value": "prod"}],   # Owner missing
        }],
    )

    findings = find_noncompliant_instances("eu-west-1")

    assert len(findings) == 1
    assert findings[0]["missing_tags"] == ["CostCentre", "Owner"]
```

✅ **`moto` mocks the AWS APIs in-process**, so tests run in milliseconds with no AWS account and no cost. It is the reason to write automation in Python rather than bash when correctness matters.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Ignoring pagination | 🔴 Silently processes only 1000 items | Use paginators |
| `response["Contents"]` on an empty bucket | `KeyError` | `.get("Contents", [])` |
| Bare `except ClientError` | Permission errors look like "not found" | Branch on the error code |
| Sharing a client across threads | Intermittent failures | One client per thread |
| Clients created inside a Lambda handler | Slower cold and warm starts | Module scope |
| No explicit timeouts | Hangs until the Lambda times out | Set them in `Config` |
| Not handling assumed-role expiry | Long scripts fail after an hour | Re-assume or use refreshable credentials |
| `print` in Lambda | No levels, no structure | `logging` |
| No `moto` tests | Automation only tested in production | Mock and test |

## Interview Q&A

**Q: When would you use Python instead of bash for AWS automation?**

Bash is right for short sequences of CLI calls and glue between tools — under about fifty lines, with no real data manipulation. Python becomes the right choice as soon as you need actual data structures, branching error handling, or retry logic. The practical signal is reaching for `jq` inside a loop, or writing bash functions taking several arguments: at that point you are simulating a programming language badly. Python also gives you two things bash cannot: proper exception handling so you can distinguish a throttling error from a permission error from a not-found, and unit tests with `moto` mocking the AWS APIs in-process, so automation can be tested in milliseconds without an AWS account. Anything running as a Lambda is Python or TypeScript by default rather than bash.

**Q: What is the most common Boto3 bug you see?**

Ignoring pagination. Nearly every `list_*` and `describe_*` call truncates its response — a thousand objects for S3, a smaller number for many other APIs — and returns a continuation token. Code that reads `response["Contents"]` and iterates works perfectly in development where the bucket has fifty objects, then silently processes only the first page in production. It is a particularly nasty class of bug because nothing fails: no exception, no error log, just incomplete work that looks successful. The fix is to use a paginator for every list operation, which handles continuation tokens transparently. A closely related mistake is indexing `response["Contents"]` directly, which raises `KeyError` when the result is empty, because the key is absent rather than being an empty list.

**Q: Client or resource interface?**

Client, for anything new. The resource interface is higher-level and reads more naturally — iterating `bucket.objects.filter()` handles pagination automatically, which is genuinely nicer than a paginator. But AWS has stopped developing it, so coverage is partial and no new services get resource interfaces, which means you can hit a feature that simply is not available and have to drop to a client anyway. Since mixing both in one codebase is confusing, standardising on client is the practical choice. Client also maps directly onto the AWS API documentation, so translating a CLI command or an API reference into code is mechanical. The cost is having to use paginators explicitly, which is a small price for not being blocked later.

**Q: Why can't you share a Boto3 client across threads?**

Because neither clients nor sessions are documented as thread-safe. Sharing one produces intermittent failures — corrupted responses, credential errors, occasional exceptions from deep inside botocore — that are extremely hard to diagnose because they depend on timing and do not reproduce reliably. The correct pattern is creating a client inside each worker function, so a `ThreadPoolExecutor` running region audits creates one client per region rather than passing a shared one in. Client creation has some cost, mostly loading service model JSON, but it is cached per session so it is cheap after the first. If you need to be careful about that cost, use thread-local storage to keep one client per thread. Worth noting that the underlying HTTP connection pool is configurable through `max_pool_connections`, which needs raising above its default of ten if you are running significant concurrency.

**Q: How do you handle AWS throttling in Boto3?**

Configure the retry behaviour rather than writing your own loop. Passing a `Config` object with `retries={"max_attempts": 10, "mode": "adaptive"}` gives you exponential backoff with jitter for throttling and 5xx responses, and adaptive mode adds client-side rate limiting — the SDK observes throttling responses and slows itself down, rather than continuing to hammer the API and making the problem worse. That is the behaviour you want for bulk operations across many resources. I would also set explicit connect and read timeouts, because the defaults are long enough that a hung connection can consume a whole Lambda timeout with no useful error. Beyond retries, reducing call volume helps more: server-side filtering with `Filters` and JMESPath so you fetch less, bulk APIs where they exist, and bounded rather than unlimited concurrency.

**Q: How do you test AWS automation code?**

With `moto`, which mocks the AWS APIs in-process. You decorate a test with `@mock_aws`, create real Boto3 clients inside it, and the calls are intercepted and served by an in-memory implementation — so you can create instances, tag them, and assert that your compliance-checking function finds the right violations, all in milliseconds with no AWS account and no cost. This is a strong argument for writing automation in Python rather than bash, because equivalent bash testing requires stubbing the `aws` command and is far more fragile. For the cases moto does not cover well, `botocore.stub.Stubber` lets you assert on the exact API parameters your code sends, which is useful for verifying you built a request correctly. Beyond unit tests, anything destructive should have a dry-run mode and verify the account identity before acting.

---
[Scripting Index](./README.md) | [← Advanced Bash](./01-bash-advanced.md) | [AWS CLI Mastery →](./03-aws-cli.md)
