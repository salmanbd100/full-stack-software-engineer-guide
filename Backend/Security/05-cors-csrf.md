---
title: CORS and CSRF
part: 5
chapter: 0
slug: cors-csrf
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-28
tags: [backend, security, cors, csrf]
in_book: true
---

# CORS and CSRF {#ch-cors-and-csrf}

> Configure CORS without opening a hole, and know why it is not a CSRF defence.

**In this chapter:** the same-origin policy · preflight requests · configuring CORS safely · how CSRF works · `SameSite` and tokens

## Overview

These two get confused in almost every interview. They are not related, and one does **not** protect against the other.

| Concept  | What it is                                          | Protects        |
| -------- | --------------------------------------------------- | --------------- |
| **CORS** | A way to **relax** the Same-Origin Policy            | The user's data from other sites reading it |
| **CSRF** | An **attack** that abuses automatically-sent cookies | — it's the attack, not a defense |

> **The one-liner:** CORS controls who may **read** your response. CSRF is about who may **trigger** a request. A forged `POST` still reaches your server even when CORS blocks the attacker from reading the reply — the damage is already done.

## Table of Contents

- [Same-Origin Policy](#same-origin-policy)
- [How CORS Works](#how-cors-works)
- [Configuring CORS Safely](#configuring-cors-safely)
- [How CSRF Works](#how-csrf-works)
- [CSRF Defense 1: SameSite Cookies](#csrf-defense-1-samesite-cookies)
- [CSRF Defense 2: Tokens](#csrf-defense-2-tokens)
- [Why CORS Doesn't Stop CSRF](#why-cors-doesnt-stop-csrf)
- [Interview Questions](#interview-questions)

## Same-Origin Policy

An **origin** is the triple: scheme + host + port. All three must match.

```text
https://app.example.com/dashboard   ← the page

https://app.example.com/api/users   ✅ same origin
https://api.example.com/users       ❌ different host
http://app.example.com/users        ❌ different scheme
https://app.example.com:8080/users  ❌ different port
```

The Same-Origin Policy is a **browser** rule. It stops JavaScript on one origin from reading responses from another. It does not stop the request from being sent, and it does nothing outside a browser — `curl` and server-to-server calls ignore it entirely.

## How CORS Works

CORS is the server's way of saying "this specific origin may read my response."

**Simple requests** go straight through, and the browser checks the response headers before handing the body to JavaScript.

A request stays "simple" only with `GET`, `HEAD`, or `POST`, a basic `Content-Type` (`text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data`), and no custom headers.

**Everything else triggers a preflight:**

```text
Browser                                    Server (api.example.com)
   │                                              │
   │  OPTIONS /users                              │
   │  Origin: https://app.example.com             │
   │  Access-Control-Request-Method: PUT          │
   │  Access-Control-Request-Headers: authorization
   ├─────────────────────────────────────────────▶│
   │                                              │
   │  204 No Content                              │
   │  Access-Control-Allow-Origin: https://app.example.com
   │  Access-Control-Allow-Methods: GET,PUT,POST  │
   │  Access-Control-Allow-Headers: authorization │
   │  Access-Control-Max-Age: 600                 │
   ◀─────────────────────────────────────────────┤
   │                                              │
   │  PUT /users  (the real request)              │
   ├─────────────────────────────────────────────▶│
```

> ✨ **`Access-Control-Max-Age` is a real performance win.** Without it, every non-simple request pays for two round trips. Caching the preflight for 10 minutes removes that.

**The response headers that matter:**

| Header                             | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| `Access-Control-Allow-Origin`      | Which origin may read the response            |
| `Access-Control-Allow-Credentials` | Allow cookies/auth headers to be sent         |
| `Access-Control-Allow-Methods`     | Methods allowed (preflight only)              |
| `Access-Control-Allow-Headers`     | Request headers allowed (preflight only)      |
| `Access-Control-Expose-Headers`    | Response headers JS is allowed to read        |

## Configuring CORS Safely

```typescript
import cors, { type CorsOptions } from "cors";

const ALLOWED_ORIGINS: readonly string[] = [
  "https://app.example.com",
  "https://admin.example.com",
];

const options: CorsOptions = {
  origin: (origin, callback) => {
    // No origin = same-origin, curl, or a mobile app — allow it through.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // required for cookies
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600, // cache preflight for 10 minutes
};

app.use(cors(options));
```

**🔴 The two dangerous mistakes:**

```typescript
// ❌ Wildcard with credentials — browsers reject this, and people "fix" it wrongly
app.use(cors({ origin: "*", credentials: true }));

// ❌ Reflecting whatever origin asked — this allows *every* site
app.use(cors({ origin: (o, cb) => cb(null, true), credentials: true }));
```

Reflecting the origin with `credentials: true` means any website can make authenticated requests **and read the responses**. That's a full account-data leak.

```typescript
// ✅ Explicit allowlist, always
```

> ⚠️ **`origin: "*"` is fine for a truly public, unauthenticated API.** It becomes dangerous the moment cookies or auth headers are involved.

## How CSRF Works

The browser attaches cookies to requests for a domain **automatically** — no matter which site triggered the request.

The user is logged into `bank.com`. They open `evil.com`, which silently submits a form:

```typescript
// Served by evil.com. No click required — it submits on load.
const attack = `
  <form action="https://bank.com/transfer" method="POST" id="f">
    <input name="to" value="attacker">
    <input name="amount" value="10000">
  </form>
  <script>document.getElementById("f").submit()</script>
`;
```

The browser sends the bank's session cookie. The server sees a valid session and performs the transfer.

| Operation type   | Examples                         | At risk?             |
| ---------------- | -------------------------------- | -------------------- |
| **State-changing** | `POST /transfer`, `DELETE /user` | ✅ Yes — the target  |
| **Read-only**    | `GET /profile`                   | Should be harmless   |

> ⚠️ **Never let a `GET` change state.** A state-changing `GET` can be fired by `<img src="https://bank.com/delete?id=1">` — no form, no JavaScript.

**CSRF only matters for cookie-based auth.** If your API takes a `Authorization: Bearer` header that JavaScript must add explicitly, a cross-site form can't add it — so classic CSRF doesn't apply.

## CSRF Defense 1: SameSite Cookies

The cheapest, most effective first layer. Set it on every session cookie.

| Value      | Cross-site behavior                    | Use for                          |
| ---------- | -------------------------------------- | -------------------------------- |
| **Strict** | Never sent cross-site                  | Banking, admin panels            |
| **Lax**    | Sent only on top-level `GET` navigation | Most apps (good default)        |
| **None**   | Sent on all cross-site requests        | Embedded widgets — requires `Secure` |

```typescript
res.cookie("sessionId", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax", // blocks the cross-site POST above
});
```

**Why `Lax` stops the attack:** the forged request is a cross-site `POST`, so the browser omits the cookie. The bank sees no session.

> ⚠️ **Necessary but not sufficient.** Older browsers, some OAuth redirect flows, and any cookie that must be `SameSite=None` still need tokens. Use both layers.

## CSRF Defense 2: Tokens

The server issues an unpredictable token. Real requests echo it back; a forged cross-site request can't, because the attacker can't read it.

**Heads up:** the classic `csurf` middleware is archived and unmaintained. Use `csrf-csrf` or a small custom check.

```typescript
import { doubleCsrf } from "csrf-csrf";

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: "__Host-csrf",
  cookieOptions: { sameSite: "lax", secure: true },
});

app.get("/csrf-token", (req, res) => res.json({ token: generateCsrfToken(req, res) }));
app.post("/transfer", doubleCsrfProtection, handleTransfer);
```

### The double-submit pattern, by hand

```text
Server → sets cookie:  csrfToken=abc123
Client → reads cookie, sends header:  X-CSRF-Token: abc123
Server → cookie === header ?   ✅ allow    ❌ reject
```

**Why it works:** `evil.com` cannot read your cookie (Same-Origin Policy) and cannot set a custom header on a cross-site form submission. So it can't make the two match.

```typescript
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function checkCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookie = req.cookies.csrfToken as string | undefined;
  const header = req.get("x-csrf-token");

  if (!cookie || !header) {
    res.status(403).json({ error: "CSRF token missing" });
    return;
  }

  // Constant-time compare — avoids leaking the token byte by byte via timing.
  const ok = crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
  if (!ok) {
    res.status(403).json({ error: "CSRF validation failed" });
    return;
  }
  next();
}
```

> ✨ The `__Host-` cookie prefix forces `Secure`, host-only, path `/`. It stops a compromised subdomain from overwriting your CSRF cookie.

## Why CORS Doesn't Stop CSRF

This is the question interviewers use to separate memorization from understanding.

```text
CSRF attack:  evil.com  ──POST /transfer (with cookies)──▶  bank.com
                                                              │
                                            money already moved ✅ for attacker
                                                              │
              evil.com  ◀──response blocked by CORS───────────┘
                            (attacker doesn't care)
```

**Three reasons CORS is not a CSRF defense:**

1. **CORS filters reading, not sending.** The request executes; only the response is withheld.
2. **HTML forms don't need CORS at all.** A cross-site `<form>` submit is a normal navigation, not a `fetch` — no preflight, no CORS check.
3. **Simple requests skip preflight.** A `POST` with `Content-Type: application/x-www-form-urlencoded` goes straight to your handler.

> **Say this in an interview:** "CORS is about confidentiality of the response. CSRF is about integrity of the request. Different problems, different fixes."

## Interview Questions

**Q1: What is CORS and what problem does it solve?**

CORS is a browser mechanism for safely relaxing the Same-Origin Policy. By default JavaScript can't read a response from a different origin. The server opts specific origins in using `Access-Control-Allow-Origin` and related headers. It's permission to read, not a firewall — non-browser clients ignore it completely.

**Q2: What triggers a preflight request?**

Anything that isn't a "simple" request: methods beyond `GET`/`HEAD`/`POST`, a `Content-Type` like `application/json`, or custom headers such as `Authorization`. The browser sends an `OPTIONS` request first and only proceeds if the server approves the method and headers.

**Q3: Why can't you use `origin: "*"` with credentials?**

Browsers explicitly forbid it, because it would let any site make authenticated cross-origin requests and read the responses. With credentials you must echo one specific allowed origin — which means keeping an explicit allowlist.

**Q4: What is CSRF and why does it work?**

It tricks a logged-in user's browser into sending a request they didn't intend. It works because browsers attach cookies automatically, even to requests started by another site, so the server can't distinguish a forged call from a real one.

**Q5: Does CORS protect against CSRF?**

No. CORS decides who may read a response; the forged request still executes. Cross-site form submissions don't go through CORS at all, and simple requests skip preflight. CSRF needs `SameSite` cookies and anti-CSRF tokens.

**Q6: How does `SameSite` stop CSRF?**

`Lax` or `Strict` tells the browser not to attach the cookie to cross-site requests, so the forged `POST` arrives with no session. It's the cheapest first layer, but edge cases — legacy browsers, redirect flows, `SameSite=None` cookies — mean you should still use tokens.

**Q7: Do JWT-in-header APIs need CSRF protection?**

Not for classic CSRF. A cross-site form can't set an `Authorization` header, and the browser won't add one automatically. But if you store that JWT in a cookie that's sent automatically, you're back to cookie-based auth and CSRF applies again.

## Summary

**Checklist:**

**CORS:**

- [ ] Explicit origin allowlist — never reflect arbitrary origins with credentials
- [ ] `credentials: true` only when cookies are genuinely needed
- [ ] Allowed methods and headers kept minimal
- [ ] `maxAge` set to cache preflights
- [ ] Remember: CORS is browser-only, not access control

**CSRF:**

- [ ] `SameSite=Lax` (or `Strict`) + `HttpOnly` + `Secure` on session cookies
- [ ] Anti-CSRF token on every state-changing route
- [ ] `csrf-csrf` or a custom double-submit check — not the deprecated `csurf`
- [ ] Constant-time token comparison
- [ ] `GET` never changes state
- [ ] Re-authenticate for high-risk actions (password change, payouts)

**Best practices:**

1. **Know the difference cold** — reading vs. triggering.
2. **Allowlist, never reflect** — an origin check that always says yes is no check.
3. **Layer `SameSite` and tokens** — neither is complete alone.
4. **Fix XSS first** — it bypasses every CSRF defense you have.

---

[← HTTPS & TLS](./04-https.md) | [Next: Input Validation →](./06-validation.md)
