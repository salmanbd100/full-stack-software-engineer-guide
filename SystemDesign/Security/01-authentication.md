# Authentication

Authentication answers one question: **who is this user?** It is the front door of every system. Get it wrong and everything behind it breaks.

This doc covers the patterns that come up in senior interviews: password storage, sessions vs JWT, OAuth/OIDC, MFA, SSO, magic links, and password reset.

---

## 1. Password Authentication

### 💡 **Hash passwords with bcrypt or argon2 — never store them in plain text**

Passwords must never hit the database in their raw form. If the database leaks, attackers should not be able to use the stolen data to log in.

**How It Works:**

A hash is a one-way function. You can compute a hash from a password, but you cannot reverse a hash back to the password. On login, you hash the input and compare it to the stored hash.

Modern hashes also add:

- **Salt** — random bytes mixed in so two users with the same password get different hashes.
- **Cost factor** — a tunable number of rounds. Slows down brute-force attacks.

**Bcrypt example:**

```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // ~250ms on modern hardware

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Argon2 example (recommended for new systems):**

```typescript
import argon2 from "argon2";

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id, // Resists side-channel and GPU attacks
    memoryCost: 19456, // 19 MB
    timeCost: 2,
    parallelism: 1,
  });
}
```

**When to Use:**

| Algorithm  | Use Case                             |
| ---------- | ------------------------------------ |
| **bcrypt** | Default safe choice, wide support    |
| **argon2** | New systems, OWASP-recommended       |
| **scrypt** | Niche, memory-hard alternative       |
| **MD5/SHA**| Never. Built for speed, not security |

**Common Mistakes:**

- ❌ Using SHA-256 directly — it is too fast, GPUs crack it in minutes.
- ❌ Rolling your own hash logic.
- ❌ Logging passwords during debugging.
- ✅ Pick bcrypt or argon2, tune cost so login takes ~250ms.

> A password hash should be slow on purpose. Speed is the attacker's friend.

---

## 2. Sessions vs JWT

### 💡 **Pick the right token model for your architecture**

After login, the server needs a way to remember the user across requests. The two main options are server-side sessions and JSON Web Tokens.

**Sessions (stateful):**

The server stores session data (user ID, roles, expiry) in a store like Redis. The client gets an opaque session ID in a cookie.

```typescript
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";

const redis = createClient();
await redis.connect();

app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
```

**JWT (stateless):**

The server signs a token that contains user data. No server-side storage. The client sends the token with each request.

```typescript
import jwt from "jsonwebtoken";

interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

function issueToken(user: TokenPayload): string {
  return jwt.sign(user, process.env.JWT_SECRET!, {
    expiresIn: "15m",
    issuer: "api.example.com",
  });
}

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}
```

**Comparison:**

| Feature             | Session                   | JWT                          |
| ------------------- | ------------------------- | ---------------------------- |
| **Storage**         | Server (Redis/DB)         | Client only                  |
| **Revocation**      | Instant (delete session)  | Hard — must wait for expiry  |
| **Scale**           | Needs shared store        | Stateless, easy to scale     |
| **Size**            | Small ID in cookie        | Larger token (1–4 KB)        |
| **Best for**        | Web apps, admin portals   | Microservices, mobile, APIs  |

**Common Mistakes:**

- ❌ Storing JWT in `localStorage` — vulnerable to XSS.
- ❌ Using JWT for long-lived logins without refresh tokens.
- ❌ Putting sensitive data inside a JWT — it is signed, not encrypted.
- ✅ Use short-lived access tokens (15 min) + long-lived refresh tokens.

> If you need to log a user out instantly, sessions are simpler than JWT.

---

## 3. OAuth 2.0 and OpenID Connect

### 💡 **OAuth grants access. OIDC proves identity.**

OAuth 2.0 lets users grant a third-party app access to their data without sharing passwords. OpenID Connect (OIDC) sits on top of OAuth and adds identity — "who is the user?"

**How It Works (Authorization Code flow with PKCE):**

```
User → Client app: clicks "Sign in with Google"
Client → Auth server: redirects with code_challenge
Auth server → User: login + consent
Auth server → Client: redirect with auth code
Client → Auth server: exchanges code + code_verifier for tokens
Auth server → Client: returns access_token + id_token
```

The `id_token` is a JWT that proves identity. The `access_token` lets the client call APIs on the user's behalf.

**Example with `openid-client`:**

```typescript
import { Issuer } from "openid-client";

const google = await Issuer.discover("https://accounts.google.com");
const client = new google.Client({
  client_id: process.env.GOOGLE_CLIENT_ID!,
  client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirect_uris: ["https://app.example.com/callback"],
  response_types: ["code"],
});

// In callback handler
const params = client.callbackParams(req);
const tokenSet = await client.callback(
  "https://app.example.com/callback",
  params,
  { code_verifier: storedVerifier }
);

const userInfo = await client.userinfo(tokenSet.access_token!);
```

**When to Use:**

- ✅ "Sign in with Google/Microsoft/Apple" buttons.
- ✅ Third-party API access (e.g. read user's Gmail).
- ✅ Enterprise SSO via Azure AD or Okta.
- ❌ Don't roll your own OAuth — use a library or hosted provider.

**Common Mistakes:**

- ❌ Skipping PKCE on public clients (SPAs, mobile).
- ❌ Not validating the `id_token` signature.
- ❌ Trusting the `email` claim without checking `email_verified`.

> OAuth is for delegation. OIDC adds login. People mix them up — interview tip: be precise.

---

## 4. Multi-Factor Authentication (MFA)

### 💡 **MFA adds a second proof beyond the password**

A password is "something you know". MFA adds "something you have" (phone, hardware key) or "something you are" (fingerprint).

**Common factors:**

| Factor               | Strength | Notes                                     |
| -------------------- | -------- | ----------------------------------------- |
| **SMS code**         | Weak     | SIM swap attacks, but better than nothing |
| **TOTP (Authy/1Pwd)**| Strong   | Time-based 6-digit code, RFC 6238         |
| **Push (Duo)**       | Strong   | User approves on phone                    |
| **WebAuthn / FIDO2** | Strongest| Hardware key, phishing-resistant          |

**TOTP example:**

```typescript
import { authenticator } from "otplib";

// One-time setup: generate a secret per user
const secret: string = authenticator.generateSecret();
// Save to DB. Show QR code to user with `otpauth://` URI.

// On login, verify the 6-digit code
function verifyTotp(userSecret: string, token: string): boolean {
  return authenticator.verify({ token, secret: userSecret });
}
```

**Common Mistakes:**

- ❌ Relying only on SMS for high-value accounts.
- ❌ Letting users disable MFA without re-authenticating.
- ❌ Not offering recovery codes — users get locked out.

> For public sector or banking portals, WebAuthn should be the default.

---

## 5. SSO and Magic Links

### 💡 **SSO centralizes login. Magic links replace passwords with email.**

**SSO (Single Sign-On):**

One login works across many apps. Standards: **SAML 2.0** (legacy enterprise) and **OIDC** (modern). Identity Provider (IdP) — Okta, Azure AD, Auth0 — holds the user directory. Apps trust the IdP.

```
User → App A: redirect to IdP
IdP: authenticate (once)
IdP → App A: signed assertion / id_token
User → App B: already logged in, IdP returns assertion
```

**Magic Links:**

User enters email. Server emails a one-time signed link. Clicking it logs them in.

```typescript
import crypto from "node:crypto";

async function sendMagicLink(email: string): Promise<void> {
  const token: string = crypto.randomBytes(32).toString("hex");
  const expiresAt: Date = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await db.magicLinks.insert({ email, tokenHash: sha256(token), expiresAt });
  await mailer.send(email, `https://app.example.com/auth?t=${token}`);
}
```

**When to Use:**

- ✅ SSO — enterprise apps, internal tools, multi-product suites.
- ✅ Magic links — low-friction consumer apps, Slack-style invites.
- ❌ Magic links for high-security systems (email account becomes the weak link).

---

## 6. Password Reset

### 💡 **Reset flows are a top attack surface — design them carefully**

**Safe pattern:**

1. User enters email.
2. Always show the same message: _"If that email exists, we sent a link."_ (Avoids account enumeration.)
3. Generate a single-use token, store its hash, set short expiry (15–30 min).
4. Email a link containing the raw token.
5. On click, verify the token, let user set a new password.
6. Invalidate the token and all active sessions.

**Common Mistakes:**

- ❌ Telling the user "no such email" — leaks who has an account.
- ❌ Using sequential or guessable tokens.
- ❌ Not invalidating active sessions after reset — attacker stays in.
- ✅ Hash the reset token in DB, same as a password.

---

## Quick Decision Guide

| Scenario                          | Use This                          |
| --------------------------------- | --------------------------------- |
| Internal admin dashboard          | Session + cookie + Redis          |
| Public API for mobile clients     | JWT access + refresh tokens       |
| Enterprise app with corporate IdP | OIDC / SAML SSO                   |
| Consumer app, low friction        | Magic links + optional password   |
| Banking, public sector            | Password + WebAuthn MFA           |

---

## Key Takeaways

> **Hash passwords with bcrypt or argon2 — never plain text, never fast hashes.**

> **Sessions are simpler to revoke. JWT scales better statelessly. Pick by need.**

> **Use OIDC for "Sign in with X". Use SAML only when forced by enterprise IT.**

> **MFA is no longer optional for any account that holds value.**

> **Password reset is part of authentication — design it as carefully as login.**

---

[← Back to SystemDesign](../README.md)
