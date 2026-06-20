# Content Security Policy (CSP)

## Overview

**Content Security Policy (CSP)** is an HTTP header that tells the browser which sources it may load scripts, styles, and other content from. Anything not on the allowlist is blocked.

CSP is **defense in depth for XSS.** Even if an attacker injects `<script>`, a good CSP stops it from running. It's a backup layer — not a replacement for output encoding.

## Table of Contents

- [How CSP Works](#how-csp-works)
- [Key Directives and Source Values](#key-directives-and-source-values)
- [A Sensible Starter Policy](#a-sensible-starter-policy)
- [Nonce-Based CSP (for inline scripts)](#nonce-based-csp-for-inline-scripts)
- [Strict CSP: the Modern Recommendation](#strict-csp-the-modern-recommendation)
- [Rolling It Out Safely with Reporting](#rolling-it-out-safely-with-reporting)
- [Interview Questions](#interview-questions)

## How CSP Works

The server sends a `Content-Security-Policy` header. The browser enforces it on that page.

```typescript
// With: script-src 'self'
// <script src="https://evil.com/x.js"></script>  ❌ blocked
// <script>alert(1)</script>                       ❌ blocked (inline)
// <script src="/js/app.js"></script>              ✅ allowed (same origin)
```

A policy is a list of **directives**, each with a **source list**, separated by semicolons:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
```

### 💡 **The big win: blocking inline scripts**

Most XSS payloads are inline (`<script>...</script>` or `onerror=...`). A CSP without `'unsafe-inline'` blocks them by default. That single rule defeats a large class of attacks.

## Key Directives and Source Values

**The directives you'll actually use:**

| Directive          | Controls                                  |
| ------------------ | ----------------------------------------- |
| `default-src`      | Fallback for any directive not set        |
| `script-src`       | Where scripts can load from (most important) |
| `style-src`        | Stylesheets                               |
| `img-src`          | Images                                    |
| `connect-src`      | `fetch`, XHR, WebSocket targets           |
| `frame-ancestors`  | Who may embed your page (clickjacking)    |
| `object-src`       | `<object>`/`<embed>` — set to `'none'`    |
| `base-uri`         | `<base>` tag — set to `'none'` or `'self'`|

**Source values, from strict to loose:**

| Value               | Meaning                                          |
| ------------------- | ------------------------------------------------ |
| `'none'`            | Block everything                                 |
| `'self'`            | Same origin only                                 |
| `'nonce-<random>'`  | Allow scripts carrying this exact nonce          |
| `'sha256-<hash>'`   | Allow an inline script matching this hash        |
| `'strict-dynamic'`  | Trust scripts loaded by already-trusted scripts  |
| `https:`            | Any HTTPS URL (broad)                            |
| `'unsafe-inline'`   | Allow inline scripts/styles — ❌ **avoid**       |
| `'unsafe-eval'`     | Allow `eval()` — ❌ **avoid**                    |

> 🔴 **`'unsafe-inline'` in `script-src` defeats the whole point of CSP.** An attacker's injected inline script runs normally. Use nonces or hashes instead.

## A Sensible Starter Policy

A strict baseline for an app that serves its own assets:

```typescript
import type { Request, Response, NextFunction } from "express";

const policy: string = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'", // not embeddable — clickjacking protection
].join("; ");

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Security-Policy", policy);
  next();
});
```

**With helmet** (cleaner for Express; it ships a reasonable default policy):

```typescript
import helmet from "helmet";

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.example.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
);
```

## Nonce-Based CSP (for inline scripts)

Sometimes you genuinely need an inline script. A **nonce** ("number used once") is a random value generated per request. The browser runs only inline scripts carrying the matching nonce — so injected scripts (which lack it) are blocked.

```typescript
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

app.use((_req: Request, res: Response, next: NextFunction) => {
  const nonce: string = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;
  res.setHeader(
    "Content-Security-Policy",
    `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`,
  );
  next();
});
```

```typescript
// Render with the nonce on trusted scripts
const html = `
  <script nonce="${res.locals.nonce}">initApp();</script>  <!-- ✅ runs -->
  <script>alert("xss")</script>                            <!-- ❌ blocked -->
`;
```

> ⚠️ A nonce must be **random per request** and unguessable. A static or reused nonce gives no protection.

## Strict CSP: the Modern Recommendation

Allowlisting domains is fragile — CDNs host many libraries, and one weak entry can be abused. Google's recommended approach is a **nonce + `'strict-dynamic'`** policy. You trust your top-level scripts by nonce; they're then trusted to load their own dependencies.

```
Content-Security-Policy:
  script-src 'nonce-{random}' 'strict-dynamic' https: 'unsafe-inline';
  object-src 'none';
  base-uri 'none';
```

**How the pieces fit together:**

- `'nonce-{random}'` — only your nonced scripts run.
- `'strict-dynamic'` — a trusted script can load further scripts without listing each domain.
- `https:` and `'unsafe-inline'` — **ignored** by modern browsers when a nonce is present; they're only fallbacks for old browsers. So this stays strict where it matters.

> ✨ **Why this scales:** you stop maintaining long domain allowlists. Trust flows from your nonce outward, which is both safer and far less brittle.

## Rolling It Out Safely with Reporting

A strict CSP can break a live site. Roll it out in **report-only** mode first: the browser reports what *would* be blocked without blocking anything.

```typescript
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Content-Security-Policy-Report-Only",
    "script-src 'self'; report-uri /csp-report",
  );
  next();
});
```

```typescript
// Collect violations, fix them, then switch to the enforcing header
app.post(
  "/csp-report",
  express.json({ type: ["application/csp-report", "application/json"] }),
  (req: Request, res: Response) => {
    const report = req.body["csp-report"];
    logger.warn("CSP violation", {
      blockedUri: report?.["blocked-uri"],
      directive: report?.["violated-directive"],
    });
    res.status(204).end();
  },
);
```

**Rollout in three steps:**

```
1. Report-Only → watch violations, fix legit ones
        ↓
2. Enforce on a few low-risk pages
        ↓
3. Enforce everywhere
```

## Interview Questions

**Q1: What problem does CSP solve?**

It limits where the browser may load scripts and other resources, and blocks inline scripts by default. That stops most injected XSS from running, even when output encoding was missed. It's a second layer, not the first.

**Q2: Why is `'unsafe-inline'` dangerous in `script-src`?**

It re-allows inline scripts — exactly what most XSS payloads are. With it, an injected `<script>` runs normally and CSP gives you almost nothing for scripts. Use nonces or hashes instead of `'unsafe-inline'`.

**Q3: How do nonces make inline scripts safe?**

The server generates a random nonce each request and puts it both in the header and on its own `<script>` tags. The browser runs only scripts with the matching nonce. An injected script can't know the nonce, so it's blocked. The value must be random and unguessable per request.

**Q4: What is `'strict-dynamic'` and why use it?**

It says: trust scripts loaded by an already-trusted (nonced) script, without listing every domain. This lets you drop fragile domain allowlists — trust propagates from your nonce. It's the core of a modern strict CSP.

**Q5: CSP vs. CORS — what's the difference?**

CSP controls what **your page** is allowed to load (an inbound-to-the-page guard). CORS controls which other origins may **read responses from your API** (a cross-origin access guard). Different directions, different problems.

**Q6: How do you deploy a strict CSP without breaking production?**

Start with `Content-Security-Policy-Report-Only` and a reporting endpoint. Watch real violations, fix the legitimate ones (add nonces, move inline scripts out), then switch to the enforcing header — ideally page-by-page first.

## Summary

**CSP checklist:**

- [ ] Start in `Report-Only` mode with a reporting endpoint
- [ ] Avoid `'unsafe-inline'` and `'unsafe-eval'`
- [ ] Use nonces + `'strict-dynamic'` over long domain allowlists
- [ ] Set `object-src 'none'` and `base-uri 'none'`
- [ ] Set `frame-ancestors 'none'` (or `'self'`) for clickjacking
- [ ] Use a fresh random nonce per request
- [ ] Enforce gradually, fixing violations as you go

**Why it matters:**

- Blocks injected scripts even when encoding is missed
- Prevents clickjacking via `frame-ancestors`
- No runtime cost — just a header (a few hundred bytes)

---

[← CSRF Protection](./02-csrf-protection.md) | [Next: Security Headers →](./04-secure-headers.md)
</content>
