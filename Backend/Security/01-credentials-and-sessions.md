---
title: Credentials, Sessions, CORS and CSRF
part: 5
chapter: 18
slug: credentials-and-sessions
level: advanced
reading_time: 15
updated: 2026-09-24
tags: [security, passwords, argon2, jwt, sessions, cookies, cors, csrf, samesite]
in_book: true
---

# Credentials, Sessions, CORS and CSRF {#ch-credentials-and-sessions}

> Store a password safely, choose between a session and a token for a stated reason, and defend the cookie that carries it.

**In this chapter:** hashing a password · session against JWT · refresh tokens and where they live · how CSRF rides a cookie · why CORS is not a defence

## 💡 The Core Idea

Authentication is two problems: **proving who the user is**, once, and **remembering it** on every
request after. A password you never store — only a slow, one-way hash. A session or token you issue,
and the design question is whether you can still revoke it.

Once that credential is a cookie, the browser sends it on its own. **CSRF** is the attack that rides
that cookie. **CORS** is the browser rule people confuse with a defence against it. They are
opposites: CORS decides who may *read* your responses, CSRF is about who may *cause* your writes.

> ⚠️ **Moving target:** the recommended hashing algorithm and its settings rise as hardware gets
> faster. Current numbers live in OWASP's cheat sheet, not in a book. The durable principle: the hash
> must stay slow relative to an attacker's GPU, so you raise the settings on a schedule.

## How It Works

### Storing a password

Store a value from a function that is slow on purpose and cannot be reversed. General-purpose hashes
fail here. A GPU computes billions of SHA-256 hashes a second, so a leaked table cracks in minutes.

| Algorithm | Verdict | Notes |
| --------- | ------- | ----- |
| **Argon2id** | ✅ First choice | Memory-hard, so GPUs lose their advantage |
| **bcrypt** | ✅ Still fine | Well understood, but silently truncates input at 72 bytes |
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

The settings live inside the hash string, so you can raise them and rehash each user at next login.

### The login endpoint

**Login without leaking which accounts exist:**

```typescript
async function login(email: string, password: string): Promise<Session> {
  const user = await db.users.findUnique({ where: { email: email.toLowerCase() } });

  // Always do the work, even for an unknown email, or timing leaks who is registered.
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

  if (!user || !ok) {
    // One message for both cases. "No such user" is an enumeration oracle.
    throw new AppError('Invalid email or password', 401, 'invalid_credentials');
  }

  if (argon2.needsRehash(user.passwordHash, OPTIONS)) {
    await db.users.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }

  return createSession(user.id);
}
```

Rate-limit login on both account and source IP ([Chapter ?? — Rate Limiting](#ch-rate-limiting)).

### Session against JWT

A **session** keeps state on the server and gives the client an opaque id; revocation is a delete. A
**JWT** puts the state in a signed token, so there is no lookup — and nothing to delete to revoke it.
A JWT is not "more secure". It is **stateless**, which buys scale and costs revocation.

> ⚠️ **Never put anything secret in a JWT.** The payload is base64url — encoding, not encryption.

**Signing and verifying:**

```typescript
const opts = { issuer: 'api.example.com', audience: 'app.example.com' };
const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '15m', ...opts });

// Pin the algorithm and check issuer and audience. All three are security-critical.
const claims = jwt.verify(token, SECRET, { algorithms: ['HS256'], ...opts }) as Claims;
```

Pinning `algorithms` stops `alg: none` and algorithm confusion. Both trust the token's own header,
which the attacker controls.

### Refresh tokens

A short access token limits a leak; the long refresh token is the sensitive one.

**Rotation with reuse detection:**

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

Store only a hash, so a database leak hands over no live sessions. Rotate on every use, and if a used
token comes back, an old copy is loose — revoke the whole family.

### Where the credential lives

| Location | XSS | CSRF | Verdict |
| -------- | --- | ---- | ------- |
| `localStorage` | ❌ Readable by any script | ✅ Not sent automatically | ❌ Avoid |
| JavaScript variable | ⚠️ Lost on reload | ✅ | ✅ Access token only |
| `HttpOnly` cookie | ✅ Unreadable by script | ❌ Sent automatically | ✅ With a CSRF defence |

With `localStorage`, one XSS bug is an account takeover that outlives the fix. An `HttpOnly` cookie
trades that for CSRF, which has a complete defence. The cookie attributes themselves are in
[Chapter ?? — Cookies and SameSite](#ch-cookies-same-site).

### How CSRF rides the cookie

A user logged in to `bank.example.com` visits `evil.com`. It auto-submits a form to
`bank.example.com/transfer`, the browser attaches the cookie, and the transfer happens. The attacker
never reads the response, and never needed to. **The credential is sent automatically.** A token in an `Authorization` header is not, which is why
moving from header tokens to cookies brings CSRF back.

**Defence one is `SameSite=Lax`:** a cross-site `POST` no longer carries the cookie, unless a `GET`
changes state — so "`GET` never writes" from
[Chapter ?? — REST Best Practices and Versioning](#ch-rest-best-practices) is a security control.

**Defence two is a token the attacker cannot read.** The server sets a random value in a readable
cookie, and the client echoes it in a header. A cross-site page can make the browser send the cookie,
but the same-origin policy stops it reading the value to build the header.

**Double-submit check:**

```typescript
export const csrf: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const fromCookie = req.cookies.csrf_token as string | undefined; // NOT HttpOnly — the app reads it
  const fromHeader = req.header('X-CSRF-Token');
  const ok = fromCookie && fromHeader && fromCookie.length === fromHeader.length &&
    crypto.timingSafeEqual(Buffer.from(fromCookie), Buffer.from(fromHeader));

  if (!ok) return void res.status(403).json({ error: { code: 'csrf_failed' } });
  next();
};
```

### What CORS actually does

An origin is **scheme + host + port**. The same-origin policy stops `evil.com` from *reading* your
responses, and CORS is how your server relaxes that for origins it trusts. The browser enforces it on
the response: the request usually runs, then the reply is hidden. So a "CORS error" can sit next to a
row that was written. JSON bodies trigger a preflight `OPTIONS` request, so set `maxAge`.

**Configuring CORS safely:**

```typescript
const ALLOWED = new Set(['https://app.example.com', 'https://admin.example.com']);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin, curl, or server-to-server
    callback(null, ALLOWED.has(origin)); // Exact match — never a regex on the host.
  },
  credentials: true,
  maxAge: 86_400,
}));
```

Send `Vary: Origin`, or a CDN serves one origin's headers to another. Browsers reject
`Allow-Origin: *` with credentials, but reflecting the request's `Origin` is the same hole — and they
accept it.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| One web app, one backend | **Session in an `HttpOnly` cookie** + `SameSite=Lax` | Simple, revocable, no scale problem |
| Many services verifying tokens they did not issue | JWT with `RS256` | No shared session store |
| Immediate revocation is a hard requirement | Session, or JWT plus a `jti` denylist | A JWT alone cannot be revoked |
| Frontend and API on different origins | CORS with an exact allowlist | Never reflect `Origin` |

## 🔑 Key Takeaways

- Password hashing must be slow on purpose and tunable, and Argon2id is the current first choice.
- The session-against-JWT trade is statelessness against revocation, not a difference in security.
- Store refresh tokens hashed, rotate them on every use, and revoke the whole family on reuse.
- A cookie is sent automatically, so a cookie-based session needs `SameSite` and, where that falls short, a CSRF token.
- CORS cannot stop CSRF, because the request runs anyway and the attacker never needs the response.

## Interview Questions

**Q: Sessions or JWTs?**

Sessions, unless statelessness is truly needed: one affordable lookup, and revocation is a delete.
A JWT earns its place when several services verify tokens they did not issue, or there is no cookie jar.

**Q: How do you revoke a JWT?**

Strictly, you cannot. Keep access tokens short and revoke the server-side refresh token, which ends
the session within one access-token lifetime. For instant revocation, keep a `jti` denylist in Redis
and accept the lookup is back.

**Q: Does CORS protect your API?**

No. It lets a server allow a cross-origin script to read a response, and the browser enforces it after
the request has run. Non-browser clients ignore it, and a cross-site form post writes regardless.
Authentication and authorisation protect the API.

**Q: `SameSite=Lax` is set. Do you still need CSRF tokens?**

Often not — `Lax` is the main defence. Add tokens if a `GET` changes state, a cookie must be
`SameSite=None`, or an untrusted sibling subdomain can set cookies — then sign them to the session.

## What to Read Next

- [Chapter ?? — OAuth, OIDC and Authorisation](#ch-oauth) — handing login to an identity provider, then deciding who may do what
- [Chapter ?? — XSS Prevention and Untrusted Input](#ch-xss-prevention) — the attack that makes `localStorage` tokens fatal
