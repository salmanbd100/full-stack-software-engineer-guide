# CSRF Protection

## Overview

**Cross-Site Request Forgery (CSRF)** tricks a logged-in user's browser into sending a request they didn't intend. The browser **automatically attaches cookies** to requests — even ones triggered by another site. The server sees a valid session and acts on it.

The mental model:

> **XSS** abuses the user's trust in your site. **CSRF** abuses your site's trust in the user's browser.

## Table of Contents

- [How a CSRF Attack Works](#how-a-csrf-attack-works)
- [Defense 1: SameSite Cookies (the baseline)](#defense-1-samesite-cookies-the-baseline)
- [Defense 2: Anti-CSRF Tokens](#defense-2-anti-csrf-tokens)
- [Double-Submit Cookie (stateless)](#double-submit-cookie-stateless)
- [Token Sources Are Naturally Safe](#token-sources-are-naturally-safe)
- [React / SPA Integration](#react--spa-integration)
- [Interview Questions](#interview-questions)

## How a CSRF Attack Works

The user is logged into `bank.com`. They visit `evil.com`, which auto-submits a hidden form to the bank. The browser adds the session cookie, and the transfer goes through.

```typescript
// evil.com serves this. No click needed — it submits on load.
const attack = `
  <form action="https://bank.com/transfer" method="POST" id="f">
    <input name="to" value="attacker">
    <input name="amount" value="10000">
  </form>
  <script>document.getElementById("f").submit()</script>
`;
```

### CSRF targets state changes

| Operation type        | Examples                          | At risk?            |
| --------------------- | --------------------------------- | ------------------- |
| **State-changing**    | `POST /transfer`, `DELETE /user`  | ✅ Yes — the target |
| **Read-only (safe)**  | `GET /profile`, `GET /search`     | Should be harmless  |

> ⚠️ **Never let a `GET` change state.** A `GET` endpoint that deletes data can be fired by an `<img src="...">` tag — no form, no script needed.

## Defense 1: SameSite Cookies (the baseline)

The `SameSite` cookie attribute tells the browser when to send the cookie across sites. This is your **first and cheapest** defense — set it on every session cookie.

| Value      | Cross-site behavior                       | Use for                         |
| ---------- | ----------------------------------------- | ------------------------------- |
| **Strict** | Never sent cross-site                     | Banking, admin panels           |
| **Lax**    | Sent only on top-level GET navigation     | Most apps (good default)        |
| **None**   | Sent on all cross-site requests           | Embedded widgets (needs Secure) |

```typescript
res.cookie("sessionId", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax", // blocks cross-site POST/PUT/DELETE
});
```

**Why `Lax` stops the attack above:** the forged request is a cross-site `POST`, so the browser **omits** the cookie. The bank sees no session and rejects it.

> ⚠️ **`SameSite` is necessary but not sufficient.** Older browsers, certain redirect flows, and `SameSite=None` cases still need token-based protection. Use both.

## Defense 2: Anti-CSRF Tokens

The server issues a secret, unpredictable token. Legitimate requests include it; forged requests from another origin can't, because the attacker can't read it.

### Heads up: `csurf` is deprecated

The classic `csurf` middleware is **archived and no longer maintained.** For new Express apps, use `csrf-csrf` (stateless double-submit) or `SameSite` + a custom token check.

```typescript
import { doubleCsrf } from "csrf-csrf";

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: "__Host-csrf",
  cookieOptions: { sameSite: "lax", secure: true, httpOnly: true },
});

// Hand the token to the client (e.g. via a meta tag or JSON endpoint)
app.get("/csrf-token", (req, res) => {
  res.json({ token: generateCsrfToken(req, res) });
});

// Protect state-changing routes — rejects requests without a valid token
app.post("/transfer", doubleCsrfProtection, (req, res) => {
  res.json({ ok: true });
});
```

## Double-Submit Cookie (stateless)

This is the pattern `csrf-csrf` implements, and it's worth understanding directly. The token lives in **two places** — a cookie and a request header — and the server checks they match.

```
Server  → sets cookie: csrfToken=abc123
Client  → reads cookie, sends header: X-CSRF-Token: abc123
Server  → cookie value === header value?  ✅ allow   ❌ reject
```

**Why it works:** an attacker on `evil.com` **cannot read** your cookie (Same-Origin Policy) and **cannot set** a custom header on a cross-site request. So they can't make the two values match.

```typescript
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies.csrfToken) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", token, {
      httpOnly: false, // client JS must read it to echo it back
      secure: true,
      sameSite: "strict",
    });
  }
  next();
}

function checkCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookie = req.cookies.csrfToken as string | undefined;
  const header = req.get("x-csrf-token");
  if (!cookie || !header || cookie !== header) {
    res.status(403).json({ error: "CSRF validation failed" });
    return;
  }
  next();
}
```

> ✨ **`__Host-` prefix:** naming the cookie `__Host-csrf` forces it to be `Secure`, host-only, and path `/`. It blocks a subdomain from overwriting your CSRF cookie.

## Token Sources Are Naturally Safe

A header-based token works because of two browser rules an attacker can't break:

- **Same-Origin Policy** — `evil.com` JavaScript cannot read cookies or responses from `bank.com`.
- **Custom headers** — a cross-site form or `<img>` can't set `X-CSRF-Token`. Only a same-origin `fetch`/`XHR` can.

This is also why **storing the CSRF token in `localStorage` is fine for reading**, but the protection itself comes from the header the attacker can't forge — not from where you keep it.

## React / SPA Integration

Fetch the token once, then attach it to every state-changing request. A small wrapper keeps it consistent.

```typescript
async function getCsrfToken(): Promise<string> {
  const res = await fetch("/csrf-token", { credentials: "same-origin" });
  const { token } = (await res.json()) as { token: string };
  return token;
}

async function secureFetch(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "same-origin", // send cookies
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
  });
}
```

```typescript
function TransferButton({ token }: { token: string }) {
  async function handleClick(): Promise<void> {
    const res = await secureFetch("/transfer", token, {
      method: "POST",
      body: JSON.stringify({ to: "alice", amount: 100 }),
    });
    if (res.status === 403) throw new Error("CSRF check failed");
  }
  return <button onClick={handleClick}>Transfer</button>;
}
```

## Interview Questions

**Q1: What is CSRF and why does it work?**

It tricks a logged-in user's browser into sending an unwanted request. It works because browsers attach cookies automatically — even to requests started by another site — so the server can't tell intent from a forged call apart from a real one.

**Q2: XSS vs. CSRF — what's the difference?**

XSS injects and runs attacker script in your page (abuses the user's trust in your site). CSRF makes the browser send a forged request using cookies it already has (abuses your site's trust in the browser). XSS can also defeat most CSRF defenses, so fix XSS first.

**Q3: How does `SameSite` help, and why isn't it enough on its own?**

`SameSite=Lax`/`Strict` stops the browser from sending the session cookie on cross-site requests, which blocks the classic forged `POST`. It's not enough alone because of edge cases — older browsers, some redirect/OAuth flows, and any cookie that must be `SameSite=None`. Pair it with tokens.

**Q4: Explain the double-submit cookie pattern.**

The server puts a random token in a cookie. The client reads it and echoes it in a custom header. The server checks the two match. An attacker can't read the cookie (Same-Origin Policy) or set the custom header cross-site, so they can't make them match. It's stateless — no server-side token storage.

**Q5: Are `GET` requests vulnerable to CSRF?**

Only if a `GET` changes state — which it shouldn't. A state-changing `GET` can be triggered by `<img src="/delete?id=1">` and `SameSite=Lax` even allows the cookie on top-level GET navigation. Keep `GET` read-only and idempotent.

**Q6: Why not store the CSRF token in `localStorage`?**

You can read it from there, but `localStorage` is readable by any XSS on your origin. The real protection is the custom header an attacker can't forge cross-site. If you have XSS, `localStorage` tokens are exposed — another reason XSS is the bigger priority.

## Summary

**Protection checklist:**

- [ ] Set `SameSite=Lax` (or `Strict`) + `HttpOnly` + `Secure` on session cookies
- [ ] Require an anti-CSRF token on every state-changing route
- [ ] Use `csrf-csrf` or a custom double-submit check — not the deprecated `csurf`
- [ ] Send the token in a custom header from same-origin requests
- [ ] Use `POST`/`PUT`/`DELETE` for state changes — never `GET`
- [ ] Validate on the server; client checks don't count
- [ ] Prefix the cookie with `__Host-` and serve over HTTPS

**Best practices:**

1. **Layer defenses** — `SameSite` cookies **and** tokens.
2. **State changes use unsafe methods** — `POST`/`PUT`/`DELETE`.
3. **Trust browser rules** — Same-Origin Policy and custom headers are what make tokens safe.
4. **Fix XSS first** — it can bypass every CSRF defense.

---

[← XSS Prevention](./01-xss-prevention.md) | [Next: CSP Headers →](./03-csp-headers.md)
</content>
