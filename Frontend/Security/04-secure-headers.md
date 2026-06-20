# Security Headers

## Overview

**Security headers** are HTTP response headers that switch on extra browser protections. Each one is a small, cheap line of defense against a specific attack — clickjacking, MIME-sniffing, protocol downgrade, referrer leaks.

You don't set these one by one in production. You use **helmet**, which applies sensible defaults. But you should know what each header does and why.

## Table of Contents

- [The Headers That Matter](#the-headers-that-matter)
- [Strict-Transport-Security (HSTS)](#strict-transport-security-hsts)
- [X-Content-Type-Options: nosniff](#x-content-type-options-nosniff)
- [Clickjacking: frame-ancestors](#clickjacking-frame-ancestors)
- [Referrer-Policy](#referrer-policy)
- [Permissions-Policy](#permissions-policy)
- [helmet: One Line of Setup](#helmet-one-line-of-setup)
- [Interview Questions](#interview-questions)

## The Headers That Matter

| Header                        | Stops                          | Recommended value                          |
| ----------------------------- | ------------------------------ | ------------------------------------------ |
| `Strict-Transport-Security`   | Protocol downgrade / SSL strip | `max-age=63072000; includeSubDomains`      |
| `X-Content-Type-Options`      | MIME sniffing                  | `nosniff`                                   |
| `Content-Security-Policy`     | XSS, clickjacking              | see [03-csp-headers.md](./03-csp-headers.md) |
| `Referrer-Policy`             | URL leaks via `Referer`        | `strict-origin-when-cross-origin`          |
| `Permissions-Policy`          | Unwanted camera/mic/geo access | deny what you don't use                    |

> ⚠️ **`X-XSS-Protection` is dead — set it to `0` (or let helmet do it).** The old legacy XSS filter was buggy and could *introduce* vulnerabilities. Modern guidance is to disable it and rely on CSP instead. `X-Frame-Options` is also superseded by CSP's `frame-ancestors`.

## Strict-Transport-Security (HSTS)

HSTS forces the browser to use HTTPS for your domain. After the first HTTPS visit, the browser upgrades every later `http://` request to `https://` on its own — before any request leaves the device. This blocks SSL-stripping man-in-the-middle attacks.

```typescript
res.setHeader(
  "Strict-Transport-Security",
  "max-age=63072000; includeSubDomains; preload",
);
```

**The directives:**

- `max-age=63072000` — remember HTTPS-only for 2 years (in seconds).
- `includeSubDomains` — apply to every subdomain too.
- `preload` — opt into the browser's hardcoded list (enforced even on the very first visit).

> 🔴 **HSTS is sticky and hard to undo.** Browsers cache it for the full `max-age`. Roll out with a short `max-age` (e.g. 300s), confirm everything works over HTTPS, then raise it. Only add `preload` once you're certain — removal from preload lists is slow.

## X-Content-Type-Options: nosniff

Without this, browsers may **guess** a response's type by looking at its bytes ("MIME sniffing"). An uploaded file labeled `image/jpeg` but containing script could get executed as JavaScript.

```typescript
res.setHeader("X-Content-Type-Options", "nosniff");
// Browser now trusts your Content-Type header and won't reinterpret it
```

> ✨ One word, no downside. Always send it — especially on endpoints that serve user-uploaded files.

## Clickjacking: frame-ancestors

**Clickjacking:** an attacker loads your page in an invisible `<iframe>`, overlays fake UI, and tricks the user into clicking real buttons on your site (like "Delete account").

The modern fix is CSP's `frame-ancestors`. It replaces the older `X-Frame-Options`.

```typescript
// Nobody may embed this page
res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");

// Or: only your own origin may embed it
res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
```

| Goal                       | `frame-ancestors`            | Old `X-Frame-Options` |
| -------------------------- | ---------------------------- | --------------------- |
| Block all framing          | `'none'`                     | `DENY`                |
| Allow same-origin only     | `'self'`                     | `SAMEORIGIN`          |
| Allow specific domains     | `'self' https://partner.com` | ❌ not supported      |

> ✨ Send both `X-Frame-Options: DENY` and `frame-ancestors 'none'` for now — old browsers read the former, modern ones the latter.

## Referrer-Policy

When a user navigates from your page to another site, the browser sends a `Referer` header with the URL they came from. A full URL can leak sensitive data — like `https://app.com/account/12345`.

```typescript
res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
```

This recommended value behaves as:

| Navigation                        | What `Referer` reveals        |
| --------------------------------- | ----------------------------- |
| Same origin                       | Full URL                      |
| Cross-origin (HTTPS → HTTPS)      | Origin only (`https://app.com/`) |
| HTTPS → HTTP (downgrade)          | Nothing                       |

## Permissions-Policy

Controls which powerful browser features (camera, microphone, geolocation, etc.) the page — and any embedded third-party scripts — may use. Deny what your app doesn't need.

```typescript
res.setHeader(
  "Permissions-Policy",
  "camera=(), microphone=(), geolocation=(), usb=()",
);
// () = allowed for no one.  (self) = your origin only.
```

> A shopping site with no video chat should simply turn off `camera` and `microphone`. Then a compromised third-party ad script can't quietly request them.

## helmet: One Line of Setup

In real Express apps, let helmet apply the whole suite with safe defaults.

```typescript
import helmet from "helmet";
import express from "express";

const app = express();
app.use(helmet());
```

`helmet()` sets HSTS, `nosniff`, `frame-ancestors`/`X-Frame-Options`, a baseline CSP, a referrer policy, `X-XSS-Protection: 0`, and hides `X-Powered-By`.

**Customize the parts you care about:**

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.example.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
```

**In development**, relax what blocks your tooling (hot reload needs inline/eval):

```typescript
const isDev = process.env.NODE_ENV === "development";

app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : undefined, // helmet default in prod
    hsts: isDev ? false : undefined, // don't pin HTTPS on localhost
  }),
);
```

### Verify your headers

```typescript
// Jest + supertest
import request from "supertest";
import { app } from "./app";

describe("security headers", () => {
  it("sets HSTS and nosniff, hides X-Powered-By", async () => {
    const res = await request(app).get("/");
    expect(res.headers["strict-transport-security"]).toContain("max-age=");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
```

Also scan a live site with **securityheaders.com** or **Mozilla Observatory** for a quick grade.

## Interview Questions

**Q1: Which security headers should every site send?**

HSTS (force HTTPS), `X-Content-Type-Options: nosniff` (stop MIME sniffing), CSP (limit script sources), `Referrer-Policy` (stop URL leaks), and `Permissions-Policy` (lock down unused features). In practice, `helmet()` sets these for you.

**Q2: How does HSTS work, and what's the risk?**

After one HTTPS response carrying the header, the browser upgrades all future `http://` requests to that domain automatically, blocking SSL stripping. The risk is that it's sticky — cached for the whole `max-age` and hard to reverse, especially once preloaded. Start with a small `max-age`.

**Q3: Why is `X-XSS-Protection` no longer recommended?**

The legacy browser XSS filter it enabled was buggy and could be abused to create new vulnerabilities. Modern browsers removed it. Best practice is `X-XSS-Protection: 0` and relying on CSP — which is what helmet does by default.

**Q4: `X-Frame-Options` vs. CSP `frame-ancestors`?**

Both stop your page from being framed (clickjacking). `X-Frame-Options` is older and can't allow multiple specific domains. `frame-ancestors` is the modern, more flexible replacement. Send both during the transition for old-browser coverage.

**Q5: What does `nosniff` actually prevent?**

It stops the browser from guessing a response's content type from its bytes. Without it, a file served as `image/jpeg` that actually contains script could be executed as JavaScript. With it, the browser trusts your declared `Content-Type`.

**Q6: Why bother with `Permissions-Policy`?**

It denies powerful features (camera, mic, geolocation) you don't use — for your page *and* embedded third-party scripts. So a compromised ad or widget can't silently request the camera. Least privilege at the browser-feature level.

## Summary

**Headers checklist:**

- [ ] `Strict-Transport-Security` with a long `max-age`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Content-Security-Policy` (see CSP doc)
- [ ] `frame-ancestors 'none'` / `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` denying unused features
- [ ] `X-XSS-Protection: 0` and remove `X-Powered-By`

**Best practices:**

1. **Use helmet** — don't hand-roll the suite.
2. **HSTS is sticky** — start small, raise gradually, preload last.
3. **Prefer CSP** over the legacy `X-Frame-Options` / `X-XSS-Protection`.
4. **Test it** — automated header tests + securityheaders.com.

---

[← CSP Headers](./03-csp-headers.md) | [Next: Input Sanitization →](./05-input-sanitization.md)
</content>
