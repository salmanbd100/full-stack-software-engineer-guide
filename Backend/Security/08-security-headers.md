---
title: Backend Security Headers
part: 5
chapter: 0
slug: security-headers
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-28
tags: [backend, security, headers]
in_book: true
---

# Backend Security Headers {#ch-backend-security-headers}

> Set the response headers that harden every page, from one place in the server.

**In this chapter:** CSP · HSTS · frame protection and MIME sniffing · `Referrer-Policy` and `Permissions-Policy` · helmet

## Overview

Security headers are instructions your server sends with every response, telling the browser how to treat your content.

They are the **highest-value-per-effort** security work available: a few lines of middleware turn on browser-enforced protections that would otherwise take real engineering to build.

> **They are a second layer, not a first.** CSP doesn't fix an XSS bug — it limits what the bug can do. Fix the code, then add headers so mistakes are survivable.

## Table of Contents

- [The Headers That Matter](#the-headers-that-matter)
- [Content-Security-Policy](#content-security-policy)
- [Strict-Transport-Security](#strict-transport-security)
- [Frame Protection and MIME Sniffing](#frame-protection-and-mime-sniffing)
- [Referrer-Policy and Permissions-Policy](#referrer-policy-and-permissions-policy)
- [Setting Them with Helmet](#setting-them-with-helmet)
- [Headers to Remove](#headers-to-remove)
- [Interview Questions](#interview-questions)

## The Headers That Matter

| Header                          | Protects against         | Priority |
| ------------------------------- | ------------------------ | -------- |
| **Content-Security-Policy**     | XSS, injection           | 🔴 Highest |
| **Strict-Transport-Security**   | SSL stripping, MITM      | 🔴 Highest |
| **X-Content-Type-Options**      | MIME sniffing            | ✅ Easy win |
| **X-Frame-Options** / `frame-ancestors` | Clickjacking     | ✅ Easy win |
| **Referrer-Policy**             | URL/token leakage        | ✅ Easy win |
| **Permissions-Policy**          | Unwanted camera/mic/geo  | ⚠️ Nice to have |
| **Cross-Origin-*** headers      | Spectre-class side channels | ⚠️ Only if you need `SharedArrayBuffer` |

Everything else you'll see in older blog posts (`X-XSS-Protection`, `Expect-CT`, `Public-Key-Pins`) is deprecated. Knowing *that* is itself a good interview signal.

## Content-Security-Policy

CSP tells the browser which sources of script, style, image, and connection are allowed. Anything else is blocked, even if an attacker got it onto the page.

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

| Directive         | Controls                       |
| ----------------- | ------------------------------ |
| `default-src`     | Fallback for everything else   |
| `script-src`      | JavaScript sources             |
| `style-src`       | CSS sources                    |
| `connect-src`     | `fetch`, XHR, WebSocket targets |
| `frame-ancestors` | Who may embed **you**          |
| `object-src`      | Plugins — set to `'none'`      |
| `base-uri`        | `<base>` tag — set to `'self'` |

### Why `'unsafe-inline'` defeats the point

```text
script-src 'self' 'unsafe-inline'    ← 🔴 injected <script> now runs
```

Blocking inline script is the *entire* mechanism by which CSP stops XSS. If you allow it, you have a policy that reports well and protects nothing.

**Use a nonce instead.** Generate a random value per response and put it on the scripts you control:

```typescript
import crypto from "node:crypto";
import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";

app.use((_req, res: Response, next: NextFunction) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          (_req: Request, res: Response) => `'nonce-${res.locals.nonce}'`,
          "'strict-dynamic'", // scripts loaded *by* a trusted script are trusted
        ],
        "style-src": ["'self'", "'unsafe-inline'"], // pragmatic for CSS-in-JS
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "https://api.example.com"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "base-uri": ["'self'"],
        "upgrade-insecure-requests": [],
      },
    },
  }),
);
```

An attacker who injects `<script>` cannot guess the nonce, so the browser refuses to run it.

> ✨ **Roll it out in report-only mode first.** `reportOnly: true` sends `Content-Security-Policy-Report-Only`, which logs violations without breaking anything. Watch the reports for a week, fix the noise, then enforce.

**Helmet's default CSP** is a reasonable starting point:

```text
default-src 'self'; base-uri 'self'; font-src 'self' https: data:;
form-action 'self'; frame-ancestors 'self'; img-src 'self' data:;
object-src 'none'; script-src 'self'; script-src-attr 'none';
style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests
```

## Strict-Transport-Security

Tells the browser: for this domain, use HTTPS only — don't even try HTTP.

```typescript
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

Without HSTS, the very first request to `http://example.com` travels in the clear before your redirect fires. That window is enough for an attacker on the same network to hijack the connection.

> 🔴 **`includeSubDomains` and `preload` are hard to reverse.** Every subdomain must serve valid HTTPS, and preload removal takes months. Ship a short `max-age` first, verify, then increase it.

## Frame Protection and MIME Sniffing

**Clickjacking** puts your site in an invisible iframe over a decoy button, so the user's real click lands on your "Confirm payment".

```typescript
// Modern: a CSP directive. Preferred, and supports an allowlist of origins.
"frame-ancestors": ["'none'"]

// Legacy: still worth sending for very old browsers.
// X-Frame-Options: DENY
```

| Need                             | Use                                        |
| -------------------------------- | ------------------------------------------ |
| Nobody may embed you             | `frame-ancestors 'none'`                    |
| Only your own pages may embed you | `frame-ancestors 'self'`                   |
| Specific partners may embed you  | `frame-ancestors https://partner.example.com` |

**MIME sniffing** is the browser second-guessing your `Content-Type`. If a user uploads a "image" that's really HTML, sniffing can execute it as a page on your origin.

```text
X-Content-Type-Options: nosniff
```

One header, no configuration, no downside. Always send it.

## Referrer-Policy and Permissions-Policy

**Referrer-Policy** controls how much of the current URL is sent when a user clicks a link out.

```text
Referrer-Policy: strict-origin-when-cross-origin
```

That's the modern browser default and the right choice: full URL for same-origin navigation, only the origin cross-origin, nothing when downgrading to HTTP.

> ⚠️ This matters if your URLs contain reset tokens or IDs — a full referrer sends them to third-party sites and analytics.

**Permissions-Policy** disables browser features you don't use, so an injected script can't turn them on:

```typescript
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  next();
});
```

Empty parentheses mean "no origin, including this one."

## Setting Them with Helmet

One line covers most of the list with sensible defaults:

```typescript
import express from "express";
import helmet from "helmet";

const app = express();

app.use(helmet()); // sets ~13 headers, including a default CSP
```

**A realistic production configuration:**

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'strict-dynamic'"],
        "connect-src": ["'self'", "https://api.example.com"],
        "frame-ancestors": ["'none'"],
      },
      // useDefaults is true by default — these merge over Helmet's baseline
    },
    strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false, // breaks third-party embeds; enable deliberately
  }),
);
```

> ⚠️ **Helmet doesn't cover `Permissions-Policy`.** Set that one yourself.

**If TLS terminates at Nginx or a CDN**, you can set headers there instead — just don't set them in both places, or you'll ship duplicates that browsers handle inconsistently.

```nginx
add_header Content-Security-Policy "default-src 'self'; object-src 'none'" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Headers to Remove

| Header              | Why remove it                                        |
| ------------------- | ---------------------------------------------------- |
| `X-Powered-By`      | Tells attackers you run Express, and roughly what version |
| `Server`            | Same problem for your web server                     |
| `X-AspNet-Version`  | Same again                                            |

```typescript
app.disable("x-powered-by"); // helmet() also does this
```

**And two headers you should stop setting:**

- **`X-XSS-Protection`** — the legacy browser XSS auditor was removed because it introduced its own vulnerabilities. Send `X-XSS-Protection: 0` (Helmet's default) or nothing. Use CSP instead.
- **`Public-Key-Pins`** — removed from browsers. Pinning a bad key bricked sites permanently.

## Testing Security Headers

```bash
# See exactly what you send
curl -sI https://example.com | grep -i -E 'content-security|strict-transport|x-frame|nosniff'
```

- [securityheaders.com](https://securityheaders.com/) — letter grade plus missing headers
- [Mozilla Observatory](https://observatory.mozilla.org/) — broader scan with explanations
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) — finds bypasses in your policy

> ✨ Add a header check to CI. A refactor that drops your CSP is silent — nothing breaks, you just lose the protection.

## Interview Questions

**Q1: Which security headers do you consider essential?**

CSP and HSTS first — they block the two highest-impact problems, XSS execution and downgrade attacks. Then `X-Content-Type-Options: nosniff`, `frame-ancestors` for clickjacking, and `Referrer-Policy`. I'd add `Permissions-Policy` for anything handling media or location.

**Q2: How does CSP prevent XSS?**

It defines which script sources the browser will execute. Injected inline script has no matching source, so the browser refuses to run it even though it's in the DOM. That only holds if the policy avoids `'unsafe-inline'` — otherwise it's decoration.

**Q3: What is a CSP nonce and why use one?**

A random value generated per response, added to the CSP header and to the script tags you control. The browser runs only scripts carrying that nonce. It lets you keep legitimate inline scripts without opening the door to injected ones, since an attacker can't predict the value.

**Q4: What is `'strict-dynamic'`?**

It says: any script already trusted by a nonce or hash may load further scripts. That solves the practical problem of allowlisting every CDN and bundle-loaded chunk, and it's more secure — host allowlists are frequently bypassable via open redirects or JSONP endpoints on trusted domains.

**Q5: What does HSTS do that a redirect doesn't?**

A redirect still requires one plain-HTTP request, which can be intercepted and stripped before the redirect arrives. HSTS makes the browser rewrite the request to HTTPS locally, so that first hop never happens after the initial visit.

**Q6: `X-Frame-Options` or `frame-ancestors`?**

`frame-ancestors` — it's the modern CSP directive, supports multiple allowed origins, and takes precedence in browsers that support both. I still send `X-Frame-Options: DENY` alongside it for very old clients.

**Q7: Why is `X-XSS-Protection` deprecated?**

The built-in browser XSS auditors were unreliable and introduced their own information-leak vulnerabilities, so Chrome and Edge removed them. The current recommendation is `X-XSS-Protection: 0` and a real CSP.

## Summary

**Checklist:**

- [ ] `helmet()` enabled, with CSP tuned to your app
- [ ] CSP has no `'unsafe-inline'` or `'unsafe-eval'` in `script-src`
- [ ] Nonce or hash based inline scripts, ideally with `'strict-dynamic'`
- [ ] CSP rolled out in report-only mode first, with a report endpoint
- [ ] HSTS with a long `max-age` after verifying every subdomain
- [ ] `frame-ancestors 'none'` (plus `X-Frame-Options: DENY`)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` denying unused features
- [ ] `X-Powered-By` and `Server` removed
- [ ] Headers verified in CI and graded on securityheaders.com

**Best practices:**

1. **Headers are a safety net** — they contain bugs, they don't fix them.
2. **Report-only first** — a broken CSP means a broken site.
3. **Nonce over allowlist** — host allowlists are easier to bypass than people expect.
4. **Set them in one place** — app or edge, not both.

---

[← SQL Injection Prevention](./07-sql-injection.md) | [Backend Security Index](./README.md)
