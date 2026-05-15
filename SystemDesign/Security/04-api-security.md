# API Security

APIs are the front door to your system. A single weak endpoint can leak data, drain accounts, or take the service down. This file covers the controls every public or internal API must have in production.

## Table of Contents

1. [HTTPS and TLS](#https-and-tls)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [CORS](#cors)
5. [Input Validation](#input-validation)
6. [Request Signing](#request-signing)
7. [Idempotency Keys](#idempotency-keys)
8. [Secrets Management](#secrets-management)

---

## HTTPS and TLS

### 💡 **Encrypt every byte in transit**

TLS protects traffic from eavesdropping and tampering. Plain HTTP is dead for any API that handles user data.

**How It Works:**

Client and server do a TLS handshake. They agree on a cipher suite, exchange keys, and verify the server's certificate. After that, every byte is encrypted.

**Production Setup:**

```typescript
import express from "express";
import helmet from "helmet";

const app = express();

// helmet sets safe security headers, including HSTS
app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

**When to Use:**

| Scenario              | Setting                       |
| --------------------- | ----------------------------- |
| Public API            | TLS 1.2 minimum, TLS 1.3 ideal |
| Internal microservice | mTLS (both sides have certs)  |
| Static assets         | TLS + HSTS preload            |

**Common Mistakes:**

❌ Terminating TLS at the load balancer and using plain HTTP inside the VPC. East-west traffic still needs protection in zero-trust networks.
✅ Use mTLS or a service mesh (Istio, Linkerd) between services.

> Free, automated certificates from Let's Encrypt or AWS ACM removed every excuse to skip TLS.

---

## Authentication

### 💡 **Prove who is calling**

Authentication answers "who are you". Authorization (the next layer) answers "what can you do". Pick the right mechanism for the caller type.

### API Keys

A long random string the client sends in a header.

```typescript
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

interface AuthedRequest extends Request {
  clientId?: string;
}

async function apiKeyAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.header("x-api-key");
  if (!key) {
    res.status(401).json({ error: "missing api key" });
    return;
  }

  // Compare hashed key, never raw, to resist timing attacks
  const hashed = crypto.createHash("sha256").update(key).digest("hex");
  const client = await db.apiKeys.findByHash(hashed);

  if (!client) {
    res.status(401).json({ error: "invalid key" });
    return;
  }

  req.clientId = client.id;
  next();
}
```

**When to Use:**

- ✅ Server-to-server traffic
- ✅ Internal scripts and CI jobs
- ❌ Browsers (a key in JS is public)

### JWT (JSON Web Token)

A signed token the server hands out after login. The client sends it on every request.

```typescript
import jwt from "jsonwebtoken";

interface AccessTokenClaims {
  sub: string;       // user id
  roles: string[];
  exp: number;       // unix seconds
}

function issueAccessToken(userId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, roles },
    process.env.JWT_SECRET as string,
    { algorithm: "HS256", expiresIn: "15m" }
  );
}

function verifyToken(token: string): AccessTokenClaims {
  return jwt.verify(token, process.env.JWT_SECRET as string) as AccessTokenClaims;
}
```

**Key Rules:**

- Access tokens: short life (5–15 min)
- Refresh tokens: stored httpOnly cookie, rotated on use
- Always set `alg` explicitly; reject `alg: none`

### OAuth 2.0

Delegated access. Use when third parties need to act on a user's behalf.

| Flow                  | Use For                             |
| --------------------- | ----------------------------------- |
| Authorization Code + PKCE | Web and mobile apps              |
| Client Credentials    | Service-to-service                  |
| Device Code           | TVs, CLIs, IoT                      |

**Common Mistakes:**

❌ Storing JWTs in `localStorage` — XSS reads them instantly.
✅ Store refresh tokens in `httpOnly; Secure; SameSite=Strict` cookies.

> If you can replace JWT with a short opaque session ID + Redis lookup, do it. Revocation is trivial. JWTs only win when you must avoid the DB hit.

---

## Rate Limiting

### 💡 **Throttle before the abuser drains you**

Rate limiting stops brute force, scraping, and accidental DDOS from a buggy client.

**Algorithms:**

| Algorithm       | How                                       | Best For        |
| --------------- | ----------------------------------------- | --------------- |
| Token bucket    | Refill N tokens/sec; spend 1 per call    | Burst-tolerant  |
| Sliding window  | Count requests in last X seconds          | Strict caps     |
| Fixed window    | Count per minute, reset on boundary       | Cheap, sloppy   |

**Redis Sliding Window:**

```typescript
import Redis from "ioredis";
const redis = new Redis();

async function isAllowed(
  userId: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const key = `rl:${userId}`;
  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  const pipe = redis.multi();
  pipe.zremrangebyscore(key, 0, windowStart); // drop old hits
  pipe.zadd(key, now, `${now}`);
  pipe.zcard(key);
  pipe.expire(key, windowSec);

  const results = await pipe.exec();
  const count = results?.[2]?.[1] as number;
  return count <= limit;
}
```

**Where to Apply Limits:**

- Per IP — blocks scrapers
- Per user — blocks compromised accounts
- Per endpoint — `/login` should be stricter than `/health`

**Common Mistakes:**

❌ Only limiting by IP. NAT and mobile carriers share IPs across thousands of users.
✅ Use a composite key: `userId + endpoint`, fall back to IP for anonymous routes.

> Return `429 Too Many Requests` with a `Retry-After` header. Polite clients will back off.

---

## CORS

### 💡 **Tell the browser which origins may call you**

CORS is a browser policy. It is not a server-side security control. It only matters for requests made by JS in a browser.

```typescript
import cors from "cors";

app.use(
  cors({
    origin: ["https://app.example.com", "https://admin.example.com"],
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PUT", "DELETE"],
    maxAge: 86400, // cache preflight 24h
  })
);
```

**When to Use:**

| Caller                | CORS needed? |
| --------------------- | ------------ |
| Same-origin web app   | No           |
| Cross-origin web app  | Yes          |
| Mobile app, server, CLI | No (no browser) |

**Common Mistakes:**

❌ `Access-Control-Allow-Origin: *` together with `Allow-Credentials: true`. Browsers reject this combination, but reflecting an arbitrary origin is just as bad.
✅ Maintain an allowlist. Reject unknown origins.

> A loose CORS policy will not protect you from a server-side caller. Never treat CORS as access control.

---

## Input Validation

### 💡 **Trust nothing the client sends**

Validate every field on the server, even if the UI already validated it. Attackers skip the UI.

**Zod Schema:**

```typescript
import { z } from "zod";
import type { Request, Response } from "express";

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  age: z.number().int().min(13).max(120),
  role: z.enum(["admin", "user", "viewer"]),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

app.post("/users", (req: Request, res: Response): void => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten() });
    return;
  }
  const input: CreateUserInput = parsed.data;
  // input is now type-safe AND validated
});
```

**Rules:**

- ✅ Whitelist allowed values, never blacklist
- ✅ Cap string and array lengths
- ✅ Reject unknown fields (`.strict()` in zod)
- ❌ Never trust `Content-Length` or client-supplied IDs

---

## Request Signing

### 💡 **Prove the request was not tampered with**

Used by AWS, Stripe webhooks, and any API where replay or modification is a real threat.

```typescript
import crypto from "crypto";

function sign(payload: string, secret: string, timestamp: number): string {
  const message = `${timestamp}.${payload}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function verifyWebhook(
  payload: string,
  header: string,
  secret: string
): boolean {
  const [tsPart, sigPart] = header.split(",");
  const ts = Number(tsPart.split("=")[1]);
  const sig = sigPart.split("=")[1];

  // Reject old requests to prevent replay
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = sign(payload, secret, ts);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```

**Key Points:**

- Always include a timestamp in the signed payload
- Use `timingSafeEqual` to avoid timing attacks
- Reject requests older than 5 minutes

> Stripe, GitHub, and Shopify all sign webhooks this way. Copy the pattern.

---

## Idempotency Keys

### 💡 **Safe retries for non-GET requests**

A client sends the same `Idempotency-Key` on retry. The server returns the cached response instead of running the action twice.

```typescript
async function chargeCard(
  req: Request,
  res: Response
): Promise<void> {
  const key = req.header("idempotency-key");
  if (!key) {
    res.status(400).json({ error: "missing key" });
    return;
  }

  const cached = await redis.get(`idem:${key}`);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const result = await paymentGateway.charge(req.body);
  await redis.setex(`idem:${key}`, 86400, JSON.stringify(result));
  res.json(result);
}
```

**When to Use:**

- ✅ Payments, account creation, any side effect that costs money
- ✅ Webhook receivers (the sender will retry)
- ❌ GETs are already idempotent — no key needed

> Stripe requires idempotency keys on every `POST`. So should you.

---

## Secrets Management

### 💡 **Never put secrets in code or env files committed to git**

A secret in source code is a secret in every laptop, CI log, and Docker image forever.

**Storage Options:**

| Tool                    | Best For                          |
| ----------------------- | --------------------------------- |
| AWS Secrets Manager     | AWS workloads, auto-rotation     |
| HashiCorp Vault         | Multi-cloud, dynamic secrets      |
| GCP Secret Manager      | GCP workloads                     |
| Doppler / 1Password     | Small teams, dev workflow         |

**Fetch at Runtime:**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

async function getSecret(name: string): Promise<string> {
  const result = await client.send(new GetSecretValueCommand({ SecretId: name }));
  if (!result.SecretString) throw new Error(`secret ${name} empty`);
  return result.SecretString;
}

const dbPassword = await getSecret("prod/db/password");
```

**Rules:**

- ✅ Rotate database and API credentials at least every 90 days
- ✅ Use short-lived IAM roles instead of long-lived keys when possible
- ✅ Scan repos with `gitleaks` or `trufflehog` in CI
- ❌ Never log secret values, even on error

**Common Mistakes:**

❌ Committing a `.env` file "just for staging".
✅ Add `.env*` to `.gitignore` on day one and use a secrets manager from day one.

> If a secret was ever in git history, it is leaked. Rotate it, do not delete the commit.

---

## Interview Checklist

A senior should be able to answer these in 60 seconds each:

- Why is `localStorage` a bad place for JWTs?
- When would you use mTLS over JWT?
- How would you rate-limit a public login endpoint?
- Why does `Access-Control-Allow-Origin: *` not protect your API?
- How do idempotency keys prevent double charges?
- How does HMAC signing prevent webhook replay?

[← Back to SystemDesign](../README.md)
