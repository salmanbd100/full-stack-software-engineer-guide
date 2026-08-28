---
title: AWS SDK for TypeScript (v3)
part: 8
chapter: 0
slug: aws-sdk
level: intermediate # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-03
tags: [devops, scripting, aws, sdk]
in_book: false
---

# AWS SDK for TypeScript (v3)

The SDK is what you use when automation becomes an application: Lambda functions, internal tooling, and anything needing tests.

## v3 Is Modular

```typescript
// ❌ v2 — one enormous package, the whole SDK bundled
import AWS from "aws-sdk";
const s3 = new AWS.S3();

// ✅ v3 — per-service packages, tree-shakeable, much smaller bundles
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({});
```

| | v2 | v3 |
|---|---|---|
| **Packaging** | One package (~40 MB) | ✅ Per service (~1 MB each) |
| **Style** | Methods on a client | Command objects sent to a client |
| **Middleware** | Limited | ✅ Full stack you can extend |
| **Status** | 🔴 Maintenance mode | ✅ Current |

⚠️ **v2 reached end of support.** New work uses v3; the command-object pattern is the visible difference.

## The Command Pattern

```typescript
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// ✅ Client created once, at module scope — reused across Lambda invocations
const raw = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(raw);   // marshalling handled for you

interface AuditEvent {
  pk: string;
  sk: string;
  actor: string;
  action: string;
  timestamp: string;
}

async function recordEvent(event: AuditEvent): Promise<void> {
  await ddb.send(
    new PutItemCommand({
      TableName: process.env.AUDIT_TABLE!,
      Item: event as unknown as Record<string, never>,
      // ✅ Conditional write — prevents overwriting an existing record
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );
}
```

✨ **`lib-dynamodb`'s document client is worth knowing.** Without it you write `{ S: "value" }` attribute maps by hand; with it you pass plain JavaScript objects.

## 🔴 Pagination

The same trap as every SDK: list operations truncate.

```typescript
import { S3Client, ListObjectsV2Command, paginateListObjectsV2 } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

// ❌ At most 1000 objects. Works in dev, incomplete in production.
async function listBroken(bucket: string): Promise<string[]> {
  const response = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  return (response.Contents ?? []).map((o) => o.Key!);
}

// ✅ Paginator with an async iterator
async function listAll(bucket: string, prefix?: string): Promise<string[]> {
  const keys: string[] = [];

  for await (const page of paginateListObjectsV2(
    { client: s3 },
    { Bucket: bucket, Prefix: prefix },
  )) {
    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
  }

  return keys;
}
```

✅ Every `paginate*` helper returns an async iterator, so `for await` handles continuation tokens transparently. Note `?? []` — the SDK omits `Contents` entirely rather than returning an empty array.

## Error Handling

```typescript
import {
  S3Client,
  HeadObjectCommand,
  NotFound,
  S3ServiceException,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({});

async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    // ✅ Typed exception classes — no string matching
    if (error instanceof NotFound) return false;

    if (error instanceof S3ServiceException) {
      // ✅ Distinguish permission denial from absence
      if (error.$metadata.httpStatusCode === 403) {
        throw new Error(`Access denied reading s3://${bucket}/${key}`);
      }
    }
    throw error;
  }
}
```

🔴 **Never treat every error as "not found".** A 403 caught by a blanket handler makes a permissions problem look like a missing object, which leads to code creating something that already exists or deleting the wrong thing.

| Property | Contains |
|----------|---------|
| `error.name` | The API error code |
| `error.$metadata.httpStatusCode` | HTTP status |
| `error.$metadata.requestId` | ✅ Quote this to AWS support |
| `error.$metadata.attempts` | How many retries occurred |
| `error.$retryable?.throttling` | Whether it was throttling |

## Retries and Timeouts

```typescript
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const s3 = new S3Client({
  maxAttempts: 5,                   // total attempts, not extra retries
  retryMode: "adaptive",            // ✅ client-side rate limiting

  requestHandler: new NodeHttpHandler({
    connectionTimeout: 3_000,
    requestTimeout: 30_000,         // ✅ never rely on the defaults in Lambda
    httpsAgent: { maxSockets: 50 },
  }),
});
```

⚠️ **`maxAttempts` is total attempts.** `maxAttempts: 3` means the original plus two retries, not three retries.

## Credentials

```typescript
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { S3Client } from "@aws-sdk/client-s3";

// ✅ Default chain: env vars → shared config → IMDS / container role.
//    In Lambda and on EKS with Pod Identity this needs no configuration.
const s3 = new S3Client({ credentials: fromNodeProviderChain() });

// Cross-account, with automatic refresh before expiry
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";

const crossAccount = new S3Client({
  credentials: fromTemporaryCredentials({
    params: {
      RoleArn: "arn:aws:iam::444455556666:role/DataReader",
      RoleSessionName: "reporting",
      DurationSeconds: 3600,
    },
  }),
});
```

✅ **`fromTemporaryCredentials` refreshes automatically**, which is why it beats calling `AssumeRoleCommand` once and holding the result — a long-running process using static assumed credentials fails after an hour.

🔴 **Never construct a client with hard-coded keys.** The provider chain covers every legitimate case.

## Lambda Handler Structure

```typescript
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { EC2Client, ModifyInstanceAttributeCommand } from "@aws-sdk/client-ec2";
import type { EventBridgeHandler } from "aws-lambda";

// ✅ Module scope — reused across warm invocations
const ec2 = new EC2Client({});
const sns = new SNSClient({});

// ✅ Fail at cold start if configuration is missing, not mid-request
const QUARANTINE_SG = process.env.QUARANTINE_SG_ID;
const ALERT_TOPIC = process.env.ALERT_TOPIC_ARN;
if (!QUARANTINE_SG || !ALERT_TOPIC) {
  throw new Error("QUARANTINE_SG_ID and ALERT_TOPIC_ARN are required");
}

interface GuardDutyDetail {
  type: string;
  resource: { instanceDetails?: { instanceId?: string } };
}

export const handler: EventBridgeHandler<
  "GuardDuty Finding",
  GuardDutyDetail,
  void
> = async (event) => {
  const instanceId = event.detail.resource.instanceDetails?.instanceId;
  if (!instanceId) {
    console.log(JSON.stringify({ level: "warn", msg: "no instance in finding" }));
    return;
  }

  await ec2.send(
    new ModifyInstanceAttributeCommand({
      InstanceId: instanceId,
      Groups: [QUARANTINE_SG],
    }),
  );

  await sns.send(
    new PublishCommand({
      TopicArn: ALERT_TOPIC,
      Subject: `Instance ${instanceId} isolated`,
      Message: `GuardDuty finding ${event.detail.type} — instance quarantined.`,
    }),
  );

  // ✅ Structured logging — queryable in Logs Insights
  console.log(JSON.stringify({ level: "info", msg: "isolated", instanceId }));
};
```

| Practice | Reason |
|----------|--------|
| ✅ Clients at module scope | Reused warm — saves 50–200 ms per invocation |
| ✅ Validate env at import | Cold-start failure beats a runtime surprise |
| ✅ Structured JSON logs | Queryable, and works with EMF for metrics |
| ✅ Let errors throw | Lambda retries and the error metric increments |
| ⚠️ Idempotency | Lambda may invoke more than once per event |

## Presigned URLs

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

interface UploadRequest {
  userId: string;
  filename: string;
  contentType: string;
}

async function createUploadUrl(req: UploadRequest): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.UPLOAD_BUCKET!,
      // ✅ Key prefixed by user — they cannot overwrite anyone else's object
      Key: `uploads/${req.userId}/${crypto.randomUUID()}/${req.filename}`,
      ContentType: req.contentType,
      ServerSideEncryption: "aws:kms",
    }),
    { expiresIn: 300 },   // ✅ short — a presigned URL is a bearer token
  );
}
```

🔴 **A presigned URL grants exactly the permissions of whoever signed it, to anyone holding the URL.** Keep expiry short, scope the key to the user, and never sign with a broadly-privileged role.

## Testing

```typescript
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { beforeEach, expect, test } from "vitest";

const s3Mock = mockClient(S3Client);

beforeEach(() => s3Mock.reset());

test("listAll follows pagination", async () => {
  s3Mock
    .on(ListObjectsV2Command)
    .resolvesOnce({
      Contents: [{ Key: "a.txt" }],
      IsTruncated: true,
      NextContinuationToken: "t1",
    })
    .resolves({ Contents: [{ Key: "b.txt" }], IsTruncated: false });

  const keys = await listAll("acme-data");

  expect(keys).toEqual(["a.txt", "b.txt"]);
  expect(s3Mock.calls()).toHaveLength(2);   // ✅ proves it paginated
});
```

✅ **`aws-sdk-client-mock` intercepts commands at the client level**, so you can assert both the result and the exact parameters sent — including that pagination actually happened, which is the bug most likely to reach production.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Ignoring pagination | 🔴 Silently incomplete | `paginate*` async iterators |
| `response.Contents.map(...)` | `TypeError` when empty | `?? []` |
| Catching all errors as "not found" | Permission errors misread | `instanceof NotFound`, check status |
| Clients inside the handler | Slower invocations | Module scope |
| Assuming a role once in a long process | Credentials expire after an hour | `fromTemporaryCredentials` |
| Hard-coded credentials | Leak risk | Default provider chain |
| `maxAttempts: 3` expecting 3 retries | Fewer retries than intended | It is total attempts |
| Long presigned URL expiry | Bearer token in the wild | Minutes, not days |
| Still using `aws-sdk` v2 | End of support | Migrate to `@aws-sdk/client-*` |

## Interview Q&A

**Q: What changed between AWS SDK v2 and v3 for JavaScript?**

v3 is modular and command-based. In v2 you installed one `aws-sdk` package containing every service, roughly forty megabytes, and called methods directly on a client. v3 splits each service into its own package, so you install only `@aws-sdk/client-s3` and the bundle is tree-shakeable — which matters a great deal for Lambda cold starts and browser bundles. The visible API change is the command pattern: instead of `s3.getObject(params)` you construct a `GetObjectCommand` and pass it to `client.send()`. That indirection exists because v3 has a full middleware stack, so you can intercept and modify requests, add custom retry logic, or inject tracing headers. v2 is now in maintenance mode, so anything new should be v3.

**Q: What is the most common SDK bug in production code?**

Ignoring pagination, exactly as in every other AWS SDK. List and describe operations return a bounded page with a continuation token, so code that sends `ListObjectsV2Command` once and maps over `Contents` processes at most a thousand objects. It passes review, works in development where the bucket has a handful of objects, and then silently handles only the first page in production — no exception, no error log, just incomplete work reported as success. The fix is the `paginate*` helper functions, which return async iterators so `for await` handles the tokens transparently. The closely-related mistake is `response.Contents.map(...)`, which throws a `TypeError` when the result is empty, because the SDK omits the field rather than returning an empty array — so it needs `?? []`.

**Q: How should Lambda functions be structured with the SDK?**

Clients constructed at module scope rather than inside the handler, so they are created once during cold start and reused across warm invocations — that saves roughly fifty to two hundred milliseconds per invocation, plus the credential resolution. Required environment variables validated at import time so a missing configuration value fails the cold start with a clear message rather than surfacing as a runtime error on a random request. Logging as structured JSON via `console.log(JSON.stringify(...))` so the output is queryable in Logs Insights, and Embedded Metric Format if you want metrics without a `PutMetricData` call. Errors should be allowed to throw rather than being caught and swallowed, because Lambda then records an invocation error, increments the error metric, and applies its retry behaviour — swallowing the error makes a broken function look healthy. And handlers need to be idempotent, since Lambda can invoke more than once for a single event.

**Q: How do you handle cross-account access in the SDK?**

With `fromTemporaryCredentials` from `@aws-sdk/credential-providers`, giving it the role ARN and session name, and passing the resulting provider as the client's `credentials`. The important property is that it refreshes automatically before expiry. The mistake is calling `AssumeRoleCommand` once, extracting the credentials, and constructing a client with those static values — that works for the first hour and then fails, which in a long-running service or a container that stays warm is a confusing intermittent failure. For the normal in-account case you should not configure credentials at all: the default provider chain resolves environment variables, shared config, the container credential endpoint, and IMDS in order, so on Lambda, ECS, and EKS with Pod Identity it works with no code. Hard-coded keys should never appear in a client constructor.

**Q: How do you test code that calls AWS?**

`aws-sdk-client-mock`, which intercepts at the client level so you can stub responses per command type and assert on what was sent. That gives you two things: control over the response, including simulating errors and throttling, and verification of the exact parameters your code constructed — so you can prove a conditional expression was set, or that a key was prefixed correctly. It is also how you test pagination properly: stub the first call to return a truncated page with a continuation token and the second to return the remainder, then assert both that all items were collected and that two calls were made. That last assertion catches the pagination bug, which is otherwise almost impossible to catch before production because a small test fixture fits in one page.

**Q: What are the risks with presigned URLs?**

A presigned URL carries the permissions of the identity that signed it and grants them to anyone who possesses the URL — there is no further authentication. So it is a bearer token, and it should be treated like one. Three practical consequences. First, expiry must be short: minutes for an upload, not days, because the URL will end up in logs, browser history, and chat messages. Second, the object key must be scoped so a user cannot affect anyone else's data — prefixing with the authenticated user's ID and a random UUID prevents both overwriting and guessing. Third, the signing identity must be narrowly privileged, because signing with a role that has broad S3 access means the URL inherits that scope for the object in question. I would also set encryption and content type in the signed command so the client cannot choose them.

---
[Scripting Index](./README.md) | [← AWS CLI](./03-aws-cli.md) | [Lambda Automation →](./05-lambda-automation.md)
