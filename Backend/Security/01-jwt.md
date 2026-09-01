---
title: Sessions and JWTs
part: 5
chapter: 0
slug: jwt
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [security, jwt, sessions, auth, cookies]
in_book: true
---

# Sessions and JWTs {#ch-jwt}

> Choose between a session and a token for a stated reason, and store the credential where an XSS cannot read it.

**In this chapter:** what a JWT is and is not · signing and verifying · access and refresh tokens · where to store the credential · the four attacks that matter

## 💡 The Core Idea

There are two ways to remember who a request is from.

A **session** stores the state on the server and gives the client an opaque id. Every request looks
the state up. Revocation is a delete.

A **JWT** puts the state in the token itself, signed so the server can trust it without a lookup.
Nothing to store, nothing to look up — and nothing to delete when you want to revoke it.

That is the entire trade, and the interview answer people get wrong is the direction of it. A JWT
is not "more secure" than a session; it is **stateless**, which buys horizontal scale and costs
revocation.

## How It Works

A JWT is three base64url segments joined by dots: header, payload, signature.

```typescript
// Base64url is encoding, not encryption. Anyone can read the payload.
const [header, payload, signature] = token.split('.');
JSON.parse(Buffer.from(payload, 'base64url').toString()); // → { sub, exp, role, ... }
```

> ⚠️ **Never put anything secret in a JWT.** It is signed, not encrypted. The payload is readable by
> the client, by any proxy that logs it, and by anyone who finds it in a browser's storage.

| Claim | Means | Why it matters |
| ----- | ----- | -------------- |
| `sub` | Subject — the user id | The thing you actually needed |
| `exp` | Expiry, seconds since epoch | Must be short; it is your only automatic revocation |
| `iat` | Issued at | Lets you reject tokens older than a password change |
| `iss` / `aud` | Issuer and audience | **Verify both**, or a token from another service of yours is accepted |
| `jti` | Token id | The handle for a denylist |

**Signing and verifying:**

```typescript
const token = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '15m', issuer: 'api.example.com', audience: 'app.example.com' },
);

// Pin the algorithm and check issuer and audience. All three are security-critical.
const claims = jwt.verify(token, process.env.JWT_SECRET!, {
  algorithms: ['HS256'],
  issuer: 'api.example.com',
  audience: 'app.example.com',
}) as { sub: string; role: string };
```

`HS256` uses one shared secret — fine within one service. `RS256` signs with a private key and
verifies with a public one, which is what you want when several services verify tokens they do not
issue.

## Access and Refresh Tokens

A short access token limits the damage of a leak; a long refresh token keeps the user logged in.
The refresh token is the sensitive one, so it is stored server-side and rotated on every use.

```typescript
async function refresh(presented: string): Promise<Tokens> {
  const row = await db.refreshTokens.findUnique({ where: { hash: sha256(presented) } });
  if (!row || row.expiresAt < new Date()) throw new AppError('Invalid refresh token', 401, 'invalid_token');

  // Reuse detection: a rotated token presented again means it was stolen.
  if (row.usedAt) {
    await db.refreshTokens.deleteMany({ where: { familyId: row.familyId } }); // kill the family
    throw new AppError('Token reuse detected', 401, 'token_reuse');
  }

  await db.refreshTokens.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return issue(row.userId, row.familyId); // new access token + new refresh token
}
```

Three details make this correct. **Store a hash**, not the token — a leaked database should not hand
over live sessions. **Rotate on every use**, so a stolen token is valid for one call. And **detect
reuse**: if a rotated token appears again, either the client or an attacker has an old copy, and
revoking the whole family is the only safe response.

| Token | Lifetime | Stored where |
| ----- | -------- | ------------ |
| Access | 5–15 minutes | Memory, or an `HttpOnly` cookie |
| Refresh | 7–30 days, rotated | `HttpOnly`, `Secure`, `SameSite=Strict` cookie, path-scoped to the refresh route |

## Where to Store the Credential

| Location | XSS | CSRF | Verdict |
| -------- | --- | ---- | ------- |
| `localStorage` | ❌ Readable by any script | ✅ Not sent automatically | ❌ Avoid |
| `sessionStorage` | ❌ Same | ✅ | ❌ Avoid |
| JavaScript variable | ⚠️ Lost on reload, but not persisted | ✅ | ✅ Access token only |
| `HttpOnly` cookie | ✅ Unreadable by script | ❌ Sent automatically | ✅ With `SameSite` and CSRF defence |

The practical answer for a browser client is an `HttpOnly`, `Secure`, `SameSite` cookie plus the CSRF
defence from [Chapter ?? — CORS and CSRF](#ch-cors-csrf). `localStorage` is convenient and it means
one XSS is a full account takeover, with the token exfiltrated and still valid after you fix the bug.

```typescript
res.cookie('refresh_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/auth/refresh', // Not sent to any other endpoint.
  maxAge: 7 * 24 * 3600 * 1000,
});
```

## The Attacks That Matter

| Attack | Mechanism | Defence |
| ------ | --------- | ------- |
| **`alg: none`** | Token claims no signature; a naive library accepts it | Pin `algorithms` on verify |
| **Algorithm confusion** | An `RS256` public key used as an `HS256` secret | Pin the algorithm; never derive it from the header |
| **No expiry check** | `decode()` used instead of `verify()` | Only ever `verify()` |
| **Weak secret** | `HS256` with a short or default secret is brute-forceable | 32+ random bytes, from a secret manager |

The first two are the same mistake: **trusting the token's own header to tell you how to verify it.**
An attacker controls that header.

**Revocation, when you need it.** A short expiry is not revocation. If "log out everywhere" or
"disable this account now" is a requirement, you need state — which means either sessions, or a
denylist of `jti` values in Redis with a TTL matching the token's remaining life, checked on every
request. At that point you are doing a lookup per request, so ask whether a session was the right
answer from the start.

## When to Use Which

| Situation | Choose |
| --------- | ------ |
| One web application, one backend | **Session** — simpler, revocable, and the scale argument rarely applies |
| Many services verifying tokens they did not issue | JWT with `RS256` |
| Mobile or third-party API clients | JWT — no cookie jar to rely on |
| Immediate revocation is a hard requirement | Session, or JWT plus a denylist |
| A short-lived signed link — password reset, invite | JWT, single-use, tightly scoped |

## 🔑 Key Takeaways

- A JWT is signed, not encrypted: the payload is public, so nothing secret goes in it.
- The real trade is statelessness against revocation, not security.
- Always pin `algorithms` and verify `issuer` and `audience` — the token's header is attacker-controlled.
- Store refresh tokens hashed, rotate on every use, and revoke the whole family on reuse.
- `localStorage` turns one XSS into a persistent account takeover; use `HttpOnly` cookies.

## Interview Questions

**Q: Sessions or JWTs?**

Sessions unless statelessness is genuinely needed. A session is a lookup, which most systems can
afford, and revocation is a delete. A JWT removes the lookup and with it the ability to revoke, so
it earns its place when several independent services must verify tokens they did not issue, or when
the client has no cookie jar.

**Q: How do you revoke a JWT?**

Strictly, you cannot — that is the point of it. In practice you keep access tokens short, store
refresh tokens server-side so revoking the refresh token ends the session within one access-token
lifetime, and if immediate revocation is required, maintain a denylist of `jti` values in Redis with
a TTL equal to the remaining lifetime. That last option reintroduces the per-request lookup.

**Q: Why is `localStorage` a bad place for a token?**

Because any JavaScript on the page can read it, including a script injected through XSS or pulled in
by a compromised dependency. The token is exfiltrated and remains valid until it expires, so fixing
the XSS does not end the compromise. An `HttpOnly` cookie is unreadable by script, which converts
the problem into CSRF — and CSRF has a complete, well-understood defence.

## What to Read Next

- [Chapter ?? — Password Security](#ch-password-security) — what happens before a token is issued
- [Chapter ?? — CORS and CSRF](#ch-cors-csrf) — the defence a cookie-based session needs
- [Chapter ?? — OAuth 2.1 and OIDC](#ch-oauth) — delegated authentication, where the tokens come from someone else
