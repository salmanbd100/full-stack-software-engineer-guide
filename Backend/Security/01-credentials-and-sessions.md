---
title: Credentials, Sessions and Tokens
part: 5
chapter: 0
slug: credentials-and-sessions
level: advanced
reading_time: 11
updated: 2026-09-08
tags: [security, passwords, argon2, jwt, sessions, cookies]
in_book: true
---

# Credentials, Sessions and Tokens {#ch-credentials-and-sessions}

> Store a password so a database leak is not an account leak, then choose between a session and a token for a stated reason.

**In this chapter:** hashing a password · the login endpoint · session against JWT · access and refresh tokens · where the credential lives · the attacks that matter

## 💡 The Core Idea

Authentication is two problems that get discussed as one. **Proving the user is who they say** happens
once, at the login form. **Remembering that it happened** covers every request afterwards.

Both come down to holding a credential you can invalidate. A password is one you must never store —
only a slow, one-way derivation of it. A session or token is one you issue, and the design question
is whether you kept the ability to take it back.

> ⚠️ **Moving target:** the recommended hashing algorithm and its parameters are revised as hardware
> gets faster — bcrypt's cost factor and Argon2id's memory and time settings are both higher than the
> guidance a few years ago, and the current numbers live in OWASP's cheat sheet rather than in a book.
> The durable principle is the reason for them: the hash must stay slow relative to an attacker's GPU,
> so the parameters are meant to be raised on a schedule.

## How It Works

### Storing a password

You store a value derived from the password by a function that is deliberately slow and impossible
to reverse. "Deliberately slow" is what general-purpose hashes get wrong: a GPU computes billions of
SHA-256 hashes a second, so a leaked SHA-256 table of common passwords is cracked in minutes.

| Algorithm | Verdict | Notes |
| --------- | ------- | ----- |
| **Argon2id** | ✅ First choice | Memory-hard, so GPUs and ASICs lose their advantage |
| **bcrypt** | ✅ Still fine | Everywhere, well understood; caps input at 72 bytes |
| SHA-256, MD5, SHA-1 | ❌ Never | Fast by design — that is the whole problem |

**Hashing with Argon2id:**

```typescript
// OWASP's 2026 baseline. Tune upwards until hashing takes ~250ms on your hardware.
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB — the memory-hard parameter, the one that matters
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);
```

`argon2.verify()` reads the parameters back out of the stored hash — wrap it so a malformed value
returns `false` rather than throwing a 500 at a login endpoint. Because those parameters live inside
the hash string, you can raise them later and rehash each user on their next login.

A **salt** is random per password and embedded by the library — never write salt-handling code. A
**pepper** is one secret shared by every password and kept outside the database, so a database leak
alone is not enough to start cracking. The salt is mandatory and free; the pepper is optional and
costs a rehash-on-login when it rotates.

> ⚠️ bcrypt silently truncates input at 72 bytes, so a 100-character generated password has 28
> characters doing nothing — and pre-hashing to work around it risks password shucking. Argon2id
> has no such limit.

### The login endpoint

```typescript
async function login(email: string, password: string): Promise<Session> {
  const user = await db.users.findUnique({ where: { email: email.toLowerCase() } });

  // Always do the work, even for an unknown email, or response time leaks which
  // addresses are registered.
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

  if (!user || !ok) {
    // One message for both cases. "No such user" is an account enumeration oracle.
    throw new AppError('Invalid email or password', 401, 'invalid_credentials');
  }

  // Opportunistic upgrade: the cost parameters changed since this hash was made.
  if (argon2.needsRehash(user.passwordHash, OPTIONS)) {
    await db.users.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }

  return createSession(user.id);
}
```

Three properties there are the whole answer to "how do you write a login endpoint": comparable work
whether or not the account exists, one generic error message, and an opportunistic rehash.

### Remembering the answer

A **session** stores the state on the server and gives the client an opaque id. Every request looks
it up; revocation is a delete.

A **JWT** puts the state in the token, signed so the server can trust it without a lookup. Nothing
to store, nothing to look up — and nothing to delete when you want to revoke it.

That is the entire trade, and the interview answer people get wrong is its direction. A JWT is not
"more secure" than a session; it is **stateless**, which buys horizontal scale and costs revocation.

A JWT is three base64url segments — header, payload, signature — and base64url is encoding, not
encryption, so `JSON.parse(atob(payload))` works for anyone holding the token.

> ⚠️ **Never put anything secret in a JWT.** The payload is readable by the client, by any proxy that
> logs it, and by anyone who finds it in browser storage.

Four claims carry the weight: `sub` is the user id you wanted, `exp` must be short because it is your
only automatic revocation, `iss` and `aud` must both be **verified** or a token issued by another of
your services is accepted, and `jti` is the handle a denylist needs.

**Signing and verifying:**

```typescript
const opts = { issuer: 'api.example.com', audience: 'app.example.com' };
const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '15m', ...opts });

// Pin the algorithm and check issuer and audience. All three are security-critical.
const claims = jwt.verify(token, SECRET, { algorithms: ['HS256'], ...opts }) as Claims;
```

`HS256` uses one shared secret, which is fine within one service. `RS256` signs with a private key
and verifies with a public one — what you want when several services verify tokens they do not issue.

## When to Use It

| Situation | Choose |
| --------- | ------ |
| One web application, one backend | **Session** — simpler, revocable, and the scale argument rarely applies |
| Many services verifying tokens they did not issue | JWT with `RS256` |
| Immediate revocation is a hard requirement | Session, or JWT plus a denylist |

## Access and Refresh Tokens

A short access token limits the damage of a leak; a long refresh token keeps the user signed in. The
refresh token is the sensitive one, so it lives server-side and rotates on every use.

```typescript
async function refresh(presented: string): Promise<Tokens> {
  const row = await db.refreshTokens.findUnique({ where: { hash: sha256(presented) } });
  if (!row || row.expiresAt < new Date()) throw new AppError('Invalid token', 401, 'invalid_token');

  if (row.usedAt) {
    // A rotated token presented again means it was stolen. Kill the whole family.
    await db.refreshTokens.deleteMany({ where: { familyId: row.familyId } });
    throw new AppError('Token reuse detected', 401, 'token_reuse');
  }
  await db.refreshTokens.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return issue(row.userId, row.familyId); // new access token + new refresh token
}
```

Three details make this correct. **Store a hash**, so a leaked database does not hand over live
sessions. **Rotate on every use**, so a stolen token is valid for one call. And **detect reuse** —
if a rotated token reappears, an old copy is in circulation, and revoking the family is the only
safe response.

## Where the Credential Lives

| Location | XSS | CSRF | Verdict |
| -------- | --- | ---- | ------- |
| `localStorage` / `sessionStorage` | ❌ Readable by any script | ✅ Not sent automatically | ❌ Avoid |
| JavaScript variable | ⚠️ Not persisted | ✅ | ✅ Access token only |
| `HttpOnly` cookie | ✅ Unreadable by script | ❌ Sent automatically | ✅ With `SameSite` and CSRF defence |

Set the refresh cookie `httpOnly`, `secure`, `sameSite: 'strict'` and `path: '/auth/refresh'`, so it
never reaches another endpoint. `localStorage` is convenient, and it means one XSS is a full account
takeover — the token is exfiltrated and stays valid after you fix the bug. An `HttpOnly` cookie turns
that into CSRF, which has a complete defence: [Chapter ?? — CORS and CSRF](#ch-cors-csrf).

## The Attacks That Matter

| Attack | Mechanism | Defence |
| ------ | --------- | ------- |
| **`alg: none`** | The token claims no signature and a naive library accepts it | Pin `algorithms` on verify |
| **Algorithm confusion** | An `RS256` public key used as an `HS256` secret | Never derive the algorithm from the header |
| **Account enumeration** | Login or reset replies differently for unknown emails | One message, comparable timing |

The first two are the same mistake: **trusting the token's own header to tell you how to verify it**,
which an attacker controls.

**Revocation, when you need it.** A short expiry is not revocation. "Sign out everywhere" needs state,
and that state is a lookup per request — so ask whether a session was the right answer from the start.
Login rate limiting keys on both account and source ([Chapter ?? — Rate Limiting](#ch-rate-limiting)):
per-account alone lets one password be sprayed across a million accounts, per-IP alone loses to a botnet.

## Password Rules and Reset Flows

Current NIST and OWASP guidance inverts what most systems enforce.

| Rule | Verdict | Why |
| ---- | ------- | --- |
| Minimum 12 characters, maximum at least 64 | ✅ | Length resists cracking; a low cap blocks passphrases |
| Check against a breached-password list | ✅ | The single highest-value check |
| Mandatory mixed case, digits and symbols | ❌ | Produces `Password1!` — predictable, and no stronger |
| Forced rotation every 90 days | ❌ | Produces `Summer2026`, then `Autumn2026` |

The breach check is cheap to do properly: hash with SHA-1, send the first five hex characters to the
"have I been pwned" range API, and search the suffixes it returns locally, so the service never
learns the full hash.

A reset flow is a way to obtain an account without the password, and it is attacked more often than
the login form. The token is 32+ random bytes, **stored only as a hash**, expires in 15–60 minutes,
is single-use, and returns an identical response whether or not the email exists — and **every
existing session is invalidated on success**, because the attacker may already be signed in. That
last rule is the one people miss.

**Passkeys** are the second factor worth describing: the key pair is bound to the origin and the
private key never leaves the device, which is why phishing does not work against them. TOTP is good
and needs its own rate limit; SMS is weak but beats nothing; an email code is no factor at all when
email is already the reset channel.

## 🔑 Key Takeaways

- Password hashing must be deliberately slow and tunable; Argon2id is the current first choice.
- A login endpoint takes comparable time and returns an identical message whether or not the account exists.
- The session-against-JWT trade is statelessness against revocation, not security.
- Always pin `algorithms` and verify `issuer` and `audience` — the token header is attacker-controlled.
- Store refresh tokens hashed, rotate on every use, and revoke the whole family on reuse.

## Interview Questions

**Q: Sessions or JWTs?**

Sessions unless statelessness is genuinely needed. A session is a lookup, which most systems can
afford, and revocation is a delete. A JWT removes the lookup and with it the ability to revoke, so it
earns its place when several independent services must verify tokens they did not issue, or when the
client has no cookie jar.

**Q: How do you revoke a JWT?**

Strictly you cannot — that is the point of it. In practice you keep access tokens short and store
refresh tokens server-side, so revoking the refresh token ends the session within one access-token
lifetime. If revocation must be immediate, keep a denylist of `jti` values in Redis with a TTL equal
to the remaining lifetime, and accept that this reintroduces a per-request lookup.

## What to Read Next

- [Chapter ?? — OAuth 2.1 and OpenID Connect](#ch-oauth) — delegating all of this to someone else
- [Chapter ?? — CORS and CSRF](#ch-cors-csrf) — the defence a cookie-based session needs
- [Chapter ?? — Authorisation](#ch-authorisation) — who may do what, once you know who they are
