# JWT Authentication

## Overview

A **JSON Web Token (JWT)** is a signed, self-contained string that carries claims about a user. The server can verify it with a key — it does not need to look the user up in a session store.

That single property is the whole tradeoff:

> **Stateless is fast, but stateless is hard to revoke.** A JWT stays valid until it expires, even if you delete the user.

## Table of Contents

- [Structure of a JWT](#structure-of-a-jwt)
- [Signing and Verifying](#signing-and-verifying)
- [Access + Refresh Token Pattern](#access--refresh-token-pattern)
- [Auth Middleware](#auth-middleware)
- [Where to Store Tokens](#where-to-store-tokens)
- [JWT vs Sessions](#jwt-vs-sessions)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Interview Questions](#interview-questions)

## Structure of a JWT

Three base64url parts joined by dots: `header.payload.signature`.

```
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxMjMifQ . SflKxwRJSMeKKF2QT4f...
      header                 payload              signature
```

| Part          | Contains                              | Encrypted?             |
| ------------- | ------------------------------------- | ---------------------- |
| **Header**    | Algorithm (`alg`) and type (`typ`)    | ❌ No — base64 only    |
| **Payload**   | Claims: `sub`, `exp`, `iat`, roles    | ❌ No — base64 only    |
| **Signature** | HMAC or RSA over `header.payload`     | It's a signature       |

> 🔴 **A JWT is signed, not encrypted.** Anyone can decode the payload. Never put passwords, card numbers, or personal data in it.

### Standard claims worth knowing

| Claim | Meaning                | Why it matters                        |
| ----- | ---------------------- | ------------------------------------- |
| `sub` | Subject (user ID)      | Who the token is about                |
| `exp` | Expiry (Unix seconds)  | Limits the damage of a stolen token   |
| `iat` | Issued at              | Lets you reject tokens issued too long ago |
| `iss` | Issuer                 | Rejects tokens from another system    |
| `aud` | Audience               | Rejects tokens meant for another API  |

## Signing and Verifying

```typescript
import jwt, { type SignOptions } from "jsonwebtoken";

interface AccessTokenPayload {
  sub: string;
  role: "user" | "admin";
}

const ACCESS_SECRET: string = process.env.JWT_ACCESS_SECRET!;

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: "15m", // short life — the main defense against theft
    issuer: "auth.example.com",
    audience: "api.example.com",
    algorithm: "HS256",
  };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // ⚠️ Always pin `algorithms` — never let the token choose its own.
  return jwt.verify(token, ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: "auth.example.com",
    audience: "api.example.com",
  }) as AccessTokenPayload;
}
```

**HS256 vs RS256:**

| Algorithm | Key setup                    | Use when                                              |
| --------- | ---------------------------- | ----------------------------------------------------- |
| **HS256** | One shared secret            | One service signs and verifies                        |
| **RS256** | Private signs, public verifies | Many services verify; only the auth server can sign |

> ✨ Reach for **RS256** in microservices. Verifiers only ever hold the public key, so a compromised API can't mint tokens.

## Access + Refresh Token Pattern

One token can't be both short-lived and convenient. So use two.

```
Login ──▶ access token  (15 min, sent on every request)
      └─▶ refresh token (7 days, stored in DB, HttpOnly cookie)

Access expires ──▶ POST /refresh ──▶ new access + new refresh
                                     (old refresh is deleted)
```

```typescript
import crypto from "node:crypto";

interface RefreshRecord {
  tokenHash: string; // store a hash, never the raw token
  userId: string;
  expiresAt: Date;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw: string = crypto.randomBytes(40).toString("hex");
  const tokenHash: string = crypto.createHash("sha256").update(raw).digest("hex");

  await db.refreshTokens.insert({
    tokenHash,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  } satisfies RefreshRecord);

  return raw; // only the client ever sees this
}

export async function rotateRefreshToken(raw: string): Promise<string> {
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const record = await db.refreshTokens.findOne({ tokenHash });

  if (!record || record.expiresAt < new Date()) {
    throw new Error("Invalid refresh token");
  }

  // Rotation: burn the old one so a stolen copy can only be used once.
  await db.refreshTokens.delete({ tokenHash });
  return issueRefreshToken(record.userId);
}
```

> ✨ **Reuse detection:** if a deleted refresh token is presented again, someone replayed it. Delete every refresh token for that user and force a re-login.

## Auth Middleware

```typescript
import type { Request, Response, NextFunction } from "express";

interface AuthedRequest extends Request {
  user?: AccessTokenPayload;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    // Don't leak why it failed — expired vs. forged is useful to an attacker.
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role: AccessTokenPayload["role"]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
```

> ⚠️ **401 vs 403:** `401` means "I don't know who you are." `403` means "I know, and you still can't."

## Where to Store Tokens

| Location             | XSS safe?         | CSRF safe? | Verdict                          |
| -------------------- | ----------------- | ---------- | -------------------------------- |
| `localStorage`       | ❌ Readable by JS | ✅ Yes     | Avoid for refresh tokens         |
| `HttpOnly` cookie    | ✅ Hidden from JS | ❌ Needs `SameSite` | Best for refresh tokens |
| In-memory variable   | ✅ Gone on reload | ✅ Yes     | Best for access tokens           |

**The common production setup:**

- **Access token** — held in memory in the SPA; lost on refresh, re-fetched via `/refresh`.
- **Refresh token** — `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/auth/refresh`.

```typescript
res.cookie("refreshToken", raw, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/auth/refresh", // never sent to any other route
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

## JWT vs Sessions

| Aspect            | JWT                              | Server session                     |
| ----------------- | -------------------------------- | ---------------------------------- |
| **State**         | Stateless                        | Stored server-side (Redis/DB)      |
| **Revocation**    | ❌ Hard — valid until `exp`      | ✅ Instant — delete the record     |
| **Scaling**       | ✅ No shared store needed        | Needs a shared store               |
| **Size**          | Larger (sent on every request)   | Small session ID                   |
| **Cross-service** | ✅ Any service can verify        | Services must reach the store      |

**Decision rule:**

| Scenario                                 | Pick        |
| ---------------------------------------- | ----------- |
| Microservices, mobile clients, third-party APIs | JWT   |
| Single app that needs instant logout/ban | Sessions    |
| Banking, admin consoles, high-risk data  | Sessions    |

> **Honest answer for interviews:** most teams use a hybrid — short-lived JWT access tokens plus stateful refresh tokens. That buys stateless verification *and* real revocation.

## Common Vulnerabilities

**🔴 The `alg: none` attack**

An attacker rewrites the header to `{"alg":"none"}` and strips the signature. A careless library accepts it.

```typescript
// ❌ Bad — the token decides its own algorithm
jwt.verify(token, secret);

// ✅ Good — the server decides
jwt.verify(token, secret, { algorithms: ["HS256"] });
```

**🔴 RS256 → HS256 confusion**

The attacker signs a token with `HS256`, using your **public** key as the HMAC secret. If you don't pin the algorithm, verification passes. Pinning `algorithms: ["RS256"]` blocks it.

**🔴 Weak secrets**

`"secret123"` is brute-forceable offline in seconds. Use at least 32 random bytes:

```typescript
// Generate once, store in your secret manager:
crypto.randomBytes(32).toString("base64");
```

**🔴 Long-lived access tokens**

A 30-day access token is a 30-day breach. Keep access tokens at 5–15 minutes and push longevity into refresh tokens you can delete.

**🔴 Trusting `jwt.decode`**

```typescript
jwt.decode(token);  // ❌ no signature check — for logging only
jwt.verify(token, secret, { algorithms: ["HS256"] }); // ✅
```

## Interview Questions

**Q1: What is a JWT and what are its three parts?**

A signed token carrying claims: header (algorithm), payload (claims like `sub` and `exp`), and signature over the first two. The signature proves the token wasn't modified. The payload is only base64-encoded, so it's readable by anyone.

**Q2: JWT or sessions — which do you choose?**

It depends on revocation needs. JWTs scale well because no shared store is needed, but you can't invalidate one before it expires. Sessions are instantly revocable but need a shared store. In practice I use short-lived JWT access tokens with stateful, rotating refresh tokens — stateless verification plus real logout.

**Q3: How do you log a user out with JWTs?**

You can't un-issue the token, so you do three things: keep access tokens short (5–15 min), delete the refresh token server-side so no new access token can be minted, and for immediate revocation keep a denylist of token IDs (`jti`) or a per-user `tokenVersion` that verification checks.

**Q4: Why not store a JWT in `localStorage`?**

Any XSS on your origin can read it. An `HttpOnly` cookie is invisible to JavaScript, so it survives XSS — but it's sent automatically, so it needs `SameSite` and CSRF protection. Common answer: access token in memory, refresh token in an `HttpOnly` cookie.

**Q5: What is the `alg: none` attack?**

The attacker sets the header algorithm to `none` and removes the signature. Libraries that read `alg` from the token will accept it as unsigned but valid. Fix: always pass an explicit `algorithms` allowlist to `verify` so the server, not the token, picks the algorithm.

**Q6: HS256 or RS256?**

HS256 uses one shared secret — fine when the same service signs and verifies. RS256 signs with a private key and verifies with a public one, so many services can verify without being able to issue tokens. For microservices, RS256.

**Q7: What is refresh token rotation?**

Every refresh issues a new refresh token and deletes the old one. If the old token appears again, it was stolen and replayed — you revoke that user's whole token family. It limits the lifetime of any single leaked token.

## Summary

**Checklist:**

- [ ] Access tokens live 5–15 minutes; refresh tokens are stored and rotated
- [ ] `algorithms` pinned on every `verify` call
- [ ] Secret is 32+ random bytes from a secret manager, not source code
- [ ] `iss` and `aud` set and validated
- [ ] No personal or secret data in the payload
- [ ] Refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie
- [ ] Refresh tokens hashed at rest, with reuse detection
- [ ] Rate limiting on login and refresh routes

**Best practices:**

1. **Treat the payload as public** — it is.
2. **Short access, revocable refresh** — the tradeoff that makes JWTs safe.
3. **Pin the algorithm** — the single most common JWT bug.
4. **Have a revocation story** before you claim "stateless."

---

[Backend Security Index](./README.md) | [Next: OAuth 2.0 →](./02-oauth.md)
