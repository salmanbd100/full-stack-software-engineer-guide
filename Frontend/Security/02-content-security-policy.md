---
title: Content Security Policy and Security Headers
part: 4
chapter: 13
slug: content-security-policy
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-24
tags: [frontend, security, csp, headers, hsts, clickjacking, helmet]
in_book: true
---

# Content Security Policy and Security Headers {#ch-content-security-policy}

> Write a policy that survives a successful injection, set the headers around it, and roll both out without breaking the site.

**In this chapter:** how CSP works · nonces and strict-dynamic · report-only rollout · HSTS, nosniff and clickjacking · helmet and testing

## 💡 The Core Idea

**Security headers** are HTTP response headers that switch on extra browser protections. Each one
removes a browser capability that an attacker could use. Most of them cost one line.

The biggest is **Content Security Policy (CSP)**. It tells the browser which sources may supply scripts,
styles and other content. Anything not on the list is blocked. CSP is **defence in depth for XSS**: it
assumes an injection already succeeded and stops the injected script from running. It backs up output
encoding. It does not replace it.

> ⚠️ **Moving target:** the header set is not fixed. `Feature-Policy` became `Permissions-Policy`,
> `X-XSS-Protection` went from recommended to harmful, and cross-origin isolation headers arrived later.
> The durable principle is that each header switches a capability off by default. For any new header,
> ask what it switches off, and whether anything you ship still needs it.

## How CSP Works

The browser enforces the `Content-Security-Policy` header on that page. A policy is a list of
**directives**, each with a **source list**, separated by semicolons.

**What `script-src 'self'` allows:**

```typescript
// <script src="https://evil.com/x.js"></script>  ❌ blocked
// <script>alert(1)</script>                       ❌ blocked (inline)
// <script src="/js/app.js"></script>              ✅ allowed (same origin)
```

The big win is blocking inline scripts. Most XSS payloads are inline, such as `<script>…</script>` or an
`onerror=` attribute. A policy without `'unsafe-inline'` blocks them all by default.

| Directive         | Controls                                        |
| ----------------- | ----------------------------------------------- |
| `default-src`     | The fallback for any directive not set          |
| `script-src`      | Where scripts may load from — the one that matters |
| `frame-ancestors` | Who may embed your page in a frame              |
| `object-src`      | `<object>` and `<embed>` — set to `'none'`      |
| `base-uri`        | The `<base>` tag — set to `'none'` or `'self'`  |

| Source value       | Meaning                                         |
| ------------------ | ----------------------------------------------- |
| `'self'`           | Same origin only                                |
| `'nonce-<random>'` | Scripts carrying this exact nonce               |
| `'sha256-<hash>'`  | An inline script matching this hash             |
| `'strict-dynamic'` | Scripts loaded by an already-trusted script     |
| `'unsafe-inline'`  | Any inline script — ❌ avoid                    |

> ⚠️ **`'unsafe-inline'` in `script-src` defeats the whole point of CSP.** An injected inline script
> runs normally. Use a nonce or a hash instead.

## Nonces and Strict CSP

Sometimes you need an inline script. A **nonce** ("number used once") is a random value the server
makes for each request. The browser runs only inline scripts that carry the matching nonce. Injected
scripts do not know it, so they are blocked. A static or reused nonce gives no protection at all.

**A per-request nonce in Express:**

```typescript
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

app.use((_req: Request, res: Response, next: NextFunction) => {
  const nonce: string = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce; // the template puts this on every trusted <script>
  res.setHeader(
    "Content-Security-Policy",
    `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none'; base-uri 'none'`,
  );
  next();
});
```

Domain allowlists are fragile: a CDN hosts thousands of libraries, and one weak entry can be abused.
Google recommends this strict policy instead. `'strict-dynamic'` lets a nonced script load more
scripts, so trust flows from the nonce. `https:` and `'unsafe-inline'` only serve old browsers.

## Rolling CSP Out Safely

A strict CSP can break a live site. Ship it first as `Content-Security-Policy-Report-Only`. The browser
reports what it *would* block and blocks nothing.

**Report-only header and a collector:**

```typescript
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Security-Policy-Report-Only", "script-src 'self'; report-uri /csp-report");
  next();
});

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

Stay in report-only until every report is one you understand. Enforce on a few low-risk pages, then everywhere.

## The Other Headers

| Header                      | Stops                            | Value                                  |
| --------------------------- | -------------------------------- | -------------------------------------- |
| `Strict-Transport-Security` | Downgrade to HTTP, SSL stripping | `max-age=63072000; includeSubDomains`  |
| `X-Content-Type-Options`    | MIME sniffing                    | `nosniff`                              |
| `Referrer-Policy`           | URL leaks through `Referer`      | `strict-origin-when-cross-origin`      |
| `Permissions-Policy`        | Unwanted camera, mic, location   | `camera=(), microphone=(), geolocation=()` |
| `X-XSS-Protection`          | Nothing now — the filter was buggy | `0`                                  |

### HSTS

**HSTS** forces HTTPS. After one HTTPS response with the header, the browser upgrades every later
`http://` request itself, which blocks SSL stripping. `includeSubDomains` covers subdomains, and
`preload` puts you on the browser's built-in list so even the first visit is protected.

> ⚠️ **HSTS is close to a one-way door.** Browsers cache it for the whole `max-age`, and leaving the
> preload list is slow. Start with `max-age=300`, confirm every subdomain serves valid HTTPS, then raise it.

### The One-Line Headers

Without `nosniff`, a browser may guess a type from the bytes, so an "image" upload could run as script.
`Referrer-Policy` stops a URL like `/account/12345` leaking to other sites. `Permissions-Policy` turns
off features you do not use, so a compromised ad script cannot ask for the camera.

### Clickjacking and frame-ancestors

In **clickjacking**, an attacker loads your page in an invisible `<iframe>` and lays fake UI on top. The
user thinks they click the attacker's button but clicks "Delete account" on yours.

| Goal                   | CSP `frame-ancestors`        | Older `X-Frame-Options` |
| ---------------------- | ---------------------------- | ----------------------- |
| Block all framing      | `'none'`                     | `DENY`                  |
| Same origin only       | `'self'`                     | `SAMEORIGIN`            |
| Named partner domains  | `'self' https://partner.com` | ❌ not supported        |

`frame-ancestors` replaces `X-Frame-Options`. Send both for now, for old browsers.

## helmet and Testing

In Express, **helmet** applies the whole set with sane defaults. It sets HSTS, `nosniff`,
`frame-ancestors`, a baseline CSP, a referrer policy and `X-XSS-Protection: 0`, and it hides
`X-Powered-By`. Customise the parts you care about rather than hand-rolling strings.

**helmet with a custom CSP and HSTS:**

```typescript
import helmet from "helmet";
import express from "express";

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
```

In development, pass `contentSecurityPolicy: false` and `hsts: false`. Hot reload needs inline scripts
and `eval`, and an HSTS pin on `localhost` is painful to undo.

**Assert on the headers, because a middleware reorder drops them without an error:**

```typescript
import request from "supertest";
import { app } from "./app";

it("sets the security headers", async () => {
  const res = await request(app).get("/");
  expect(res.headers["content-security-policy"]).toContain("object-src 'none'");
  expect(res.headers["x-content-type-options"]).toBe("nosniff");
  expect(res.headers["x-powered-by"]).toBeUndefined();
});
```

## 🔑 Key Takeaways

- CSP is the second line of defence: it assumes an injection succeeded and stops the script from running.
- `'unsafe-inline'` defeats the policy, and a per-request nonce with `'strict-dynamic'` scales better than a domain allowlist.
- Roll a new CSP out in report-only mode, fix what fires, and only then enforce it.
- HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy` and `Permissions-Policy` each switch off one attack for one line of config.
- Use helmet for the defaults and assert on the headers in a test, because a middleware reorder removes them silently.

## Interview Questions

**Q: Why is `'unsafe-inline'` dangerous in `script-src`?**

It re-allows inline scripts, which is exactly what most XSS payloads are. With it, an injected
`<script>` runs normally and the policy protects almost nothing. Use nonces or hashes instead.

**Q: What is `'strict-dynamic'`, and why use it?**

It trusts any script loaded by an already-trusted, nonced script. You stop curating domain allowlists,
which are fragile because one CDN entry can host an exploitable library. Trust flows from the nonce.

**Q: How do you deploy a strict CSP without breaking production?**

Start with `Content-Security-Policy-Report-Only` and a reporting endpoint. Read real violations and fix
the legitimate ones by adding nonces or moving inline code out. Then enforce, page by page first.

**Q: How does HSTS work, and what is the risk?**

After one HTTPS response with the header, the browser upgrades all later `http://` requests itself,
which blocks SSL stripping. The risk is that it is sticky for the whole `max-age`, and preloading is
slow to reverse. A strong answer starts with a short `max-age` and checks every subdomain first.

**Q: A team wants to ship without a CSP because it keeps breaking third-party widgets. What do you say?**

Weigh what a missing CSP costs against the widget. Without it, any XSS bug becomes full script
execution. Keep a strict policy in report-only while you nonce the loaders or sandbox the widget in an
iframe. Loosen one directive for one widget rather than dropping the whole header.

## What to Read Next

- [Chapter ?? — XSS Prevention and Untrusted Input](#ch-xss-prevention) — the first line of defence that CSP backs up
- [Chapter ?? — Credentials, Sessions, CORS and CSRF](#ch-credentials-and-sessions) — the headers that decide who may read a response
- [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions) — where the build steps that set these headers live
