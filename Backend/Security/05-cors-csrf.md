---
title: CORS and CSRF
part: 5
chapter: 0
slug: cors-csrf
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [security, cors, csrf, cookies, samesite]
in_book: true
---

# CORS and CSRF {#ch-cors-csrf}

> Configure CORS without opening your API to every origin, and explain why CORS is not a CSRF defence.

**In this chapter:** the same-origin policy · how CORS actually works · configuring it safely · how CSRF works · `SameSite` and tokens · why one does not solve the other

## 💡 The Core Idea

These two get confused constantly, and the reason is that both involve cross-origin requests. They
protect opposite things.

**The same-origin policy** stops a page on `evil.com` from *reading* a response from
`api.yourbank.com`. **CORS** is how a server opts out of that restriction for origins it trusts. So
CORS is a **relaxation** mechanism, not a protection — a permissive CORS policy removes a browser
protection you had for free.

**CSRF** exploits the fact that the same-origin policy never stopped the request being *sent*. A
form on `evil.com` can POST to your API, the browser attaches the user's cookies, and the write
happens. The attacker cannot read the response, and for a state-changing request they do not need to.

One sentence for the interview: **CORS controls who may read your responses; CSRF is about who may
cause your writes.**

## Same-Origin Policy

An origin is the triple **scheme + host + port**. All three must match.

| URL | Same origin as `https://app.example.com`? |
| --- | ----------------------------------------- |
| `https://app.example.com/api` | ✅ Path is irrelevant |
| `http://app.example.com` | ❌ Different scheme |
| `https://api.example.com` | ❌ Different host — a subdomain is a different origin |
| `https://app.example.com:8443` | ❌ Different port |

## How CORS Works

CORS is entirely a **browser** mechanism enforced on the response. The request usually reaches your
server and executes; the browser then refuses to hand the response to the calling script. That is
why a "CORS error" in the console can accompany a row that was successfully written.

Requests split into two kinds:

**Simple requests** go straight out. `GET`, `HEAD`, or `POST` with a content type of
`application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`, and no custom headers.

**Preflighted requests** are everything else — any `PUT`, `DELETE`, `PATCH`, any
`Content-Type: application/json`, any `Authorization` header. The browser first sends an `OPTIONS`
request asking permission.

```http
OPTIONS /api/orders HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PATCH
Access-Control-Request-Headers: content-type, authorization
```

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

`Access-Control-Max-Age` is the practical detail most people miss: without it, every JSON request
pays a second round trip.

### Configuring it safely

```typescript
const ALLOWED = new Set(['https://app.example.com', 'https://admin.example.com']);

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header: same-origin, curl, or a server-side call. Allow it.
    if (!origin) return callback(null, true);
    callback(null, ALLOWED.has(origin)); // Exact match — never a regex on the host.
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
}));
```

> ⚠️ `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is rejected by
> every browser — the combination would let any site read authenticated responses. Libraries that
> reflect the request's `Origin` header back are equivalent to `*` and are the most common
> misconfiguration in the wild.

Three further rules. Do not reflect an arbitrary `Origin`. Do not use a regex such as
`/example\.com$/`, which matches `evil-example.com`. And remember `Vary: Origin` on the response, or
a CDN will cache one origin's CORS headers and serve them to another.

## How CSRF Works

1. The user is logged in to `bank.example.com`, so a session cookie exists.
2. The user visits `evil.com`.
3. `evil.com` auto-submits a form to `bank.example.com/transfer`.
4. The browser attaches the cookie. The transfer happens.

The attacker never reads the response. For a write, they never needed to. Note what makes it
possible: **the credential is sent automatically.** A token in an `Authorization` header is not sent
by a cross-site form, which is why token-in-header APIs are not CSRF-vulnerable — and why moving to
cookies reintroduces the problem.

### Defence 1 — `SameSite` cookies

```typescript
res.cookie('session', id, { httpOnly: true, secure: true, sameSite: 'lax' });
```

| Value | Sent on cross-site requests | Note |
| ----- | --------------------------- | ---- |
| `Strict` | Never | Strongest; a link from an email arrives logged out |
| `Lax` (browser default) | Only on top-level `GET` navigations | The right default — blocks cross-site `POST` |
| `None` | Always | Requires `Secure`; only for a deliberate cross-site integration |

`Lax` blocks the classic attack, because a cross-site form `POST` does not carry the cookie. It is
not sufficient on its own for two reasons: an older browser may ignore it, and any state-changing
`GET` endpoint is still exposed. Which leads to the rule that `GET` must never change state — a
principle from [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) that turns out to be
a security control.

### Defence 2 — a token the attacker cannot read

The double-submit pattern: the server sets a random value in a readable cookie, and the client
echoes it in a header. A cross-site attacker can cause the cookie to be sent but cannot read it to
construct the header, because the same-origin policy stops them.

```typescript
// Issue: a readable cookie holding a random token.
app.get('/csrf', (req, res) => {
  const token = crypto.randomBytes(32).toString('base64url');
  res.cookie('csrf_token', token, { sameSite: 'lax', secure: true }); // NOT httpOnly — the app reads it
  res.json({ token });
});

// Verify: the header must match the cookie, compared in constant time.
export const csrf: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const fromCookie = req.cookies.csrf_token as string | undefined;
  const fromHeader = req.header('X-CSRF-Token');
  const ok = fromCookie && fromHeader && fromCookie.length === fromHeader.length &&
    crypto.timingSafeEqual(Buffer.from(fromCookie), Buffer.from(fromHeader));

  if (!ok) return void res.status(403).json({ error: { code: 'csrf_failed' } });
  next();
};
```

The stronger variant is the **signed double-submit**: the cookie holds a value signed with a
server-side secret and bound to the session, so an attacker who can set cookies on a sibling
subdomain still cannot forge a valid pair.

> ⚠️ Do not put the CSRF token in `localStorage`. Then an XSS reads it and the defence is gone — and
> the point of the pattern is that reading requires same-origin access.

## Why CORS Does Not Stop CSRF

Three reasons, and being able to give them is the answer to the most common question in this area:

1. **The request is still sent.** CORS is enforced on the response, after your handler ran.
2. **Simple requests are not preflighted at all.** A cross-site form `POST` with
   `application/x-www-form-urlencoded` never asks permission.
3. **The attacker does not need the response.** A transfer that succeeds is a successful attack even
   if the browser discards the reply.

## 🔑 Key Takeaways

- CORS relaxes the same-origin policy; it is a permission mechanism, not a protection.
- CORS is enforced on the response, so a blocked read may still have executed a write.
- `Allow-Origin: *` with credentials is invalid, and reflecting the request's `Origin` is equivalent to it.
- `SameSite=Lax` blocks the classic CSRF form post, provided no `GET` endpoint changes state.
- CORS cannot prevent CSRF, because the request is sent regardless and the attacker never needs the response.

## Interview Questions

**Q: Does CORS protect your API?**

No. CORS is how a server grants permission for a cross-origin script to *read* a response; it is
enforced by the browser, after the request has reached your server. A non-browser client ignores it
entirely, and a cross-site form post executes whether or not CORS allows the reading of the reply.
Authentication and authorisation protect the API; CORS decides who may read the answer.

**Q: Why is reflecting the `Origin` header a vulnerability?**

Because it makes every origin an allowed origin, and combined with `Allow-Credentials: true` it lets
any website make authenticated requests to your API and read the responses. It is functionally
`Allow-Origin: *` with credentials, which browsers reject outright — reflection is the accidental
version that browsers accept.

**Q: `SameSite=Lax` is set. Do you still need CSRF tokens?**

For most applications `Lax` is the main defence and is close to sufficient. Tokens are still
warranted if any state-changing endpoint responds to `GET`, if you must support browsers that
predate `SameSite`, if a cookie is `SameSite=None` for a deliberate integration, or if a sibling
subdomain you do not fully control could set cookies on the parent domain.

## What to Read Next

- [Chapter ?? — Sessions and JWTs](#ch-jwt) — where the credential lives, and why cookies win
- [Chapter ?? — Input Validation and Injection](#ch-backend-input-validation) — the other half of not trusting a request
- [Chapter ?? — Security Headers](#ch-security-headers) — the response headers that close the neighbouring attacks
