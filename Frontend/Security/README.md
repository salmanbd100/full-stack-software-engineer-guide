# Web Security

## Overview

Frontend security is about one thing: **never trusting input you don't control** — and building layers so a single mistake isn't fatal. This module covers the attacks that show up in almost every senior frontend interview: XSS, CSRF, and the headers and validation that defend against them.

**What you'll cover:**

- Cross-Site Scripting (XSS) — injection and prevention
- Cross-Site Request Forgery (CSRF) — and modern defenses
- Content Security Policy (CSP)
- Security headers (helmet, HSTS, and friends)
- Input validation and sanitization

> **The one idea that ties it together:** defense in depth. Encode/validate so attacks can't start → CSP and headers so they can't run → `HttpOnly`/least privilege so a success can't do much damage.

## Topics

| #   | Topic                                          | Core idea                                      |
| --- | ---------------------------------------------- | ---------------------------------------------- |
| 01  | [XSS Prevention](./01-xss-prevention.md)       | Keep data as data — encode for context, sanitize HTML |
| 02  | [CSRF Protection](./02-csrf-protection.md)     | `SameSite` cookies + anti-CSRF tokens          |
| 03  | [CSP Headers](./03-csp-headers.md)             | Allowlist sources; nonces + `strict-dynamic`   |
| 04  | [Security Headers](./04-secure-headers.md)     | HSTS, `nosniff`, `frame-ancestors` via helmet  |
| 05  | [Input Sanitization](./05-input-sanitization.md) | Validate server-side; parameterize everything |

## How the Pieces Fit

```
User input ──▶ Validate / encode  (XSS, injection blocked at entry)
                     │
                     ▼
              CSP + headers        (injected code can't run)
                     │
                     ▼
        HttpOnly / SameSite / least privilege
                     │
                     ▼            (a successful attack is contained)
```

No single layer is enough. XSS can defeat CSRF tokens. A missed encoding is caught by CSP. A stolen page is useless if the session cookie is `HttpOnly`. Always think in layers.

## Suggested Study Path

**Day 1 — XSS (the most-asked topic).** Read 01. Learn the three types, context-aware encoding, and where React's auto-escaping stops protecting you.

**Day 2 — CSRF.** Read 02. Understand why browsers auto-send cookies, then `SameSite` + double-submit tokens. Note: `csurf` is deprecated — know the modern replacement.

**Day 3 — CSP + headers.** Read 03 and 04. Focus on blocking inline scripts, nonces, and what `helmet()` gives you for free.

**Day 4 — Input handling.** Read 05. Server-side validation with Zod, parameterized queries, and safe file uploads.

**Day 5 — Tie it together.** Practice the defense-in-depth narrative out loud. Most interviews reward explaining the *attack first*, then the layered defense.

## Interview Focus

Security questions appear in most senior frontend interviews. The highest-value answers:

1. **XSS** — "How does React prevent XSS, and where does it fall short?"
2. **CSRF** — "Why does CSRF work, and how do `SameSite` cookies stop it?"
3. **CSP** — "Why is `'unsafe-inline'` dangerous, and what's a nonce?"
4. **Headers** — "Which security headers matter and why is `X-XSS-Protection` dead?"
5. **Validation** — "Why isn't client-side validation security?"

**Interview tip:** explain the **attack** before the defense. It shows you understand *why* the fix works, not just the name of a library.

## Pre-Deploy Security Checklist

**Headers** (use helmet):

- [ ] `Content-Security-Policy` (no `'unsafe-inline'` in `script-src`)
- [ ] `Strict-Transport-Security` with a long `max-age`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `frame-ancestors 'none'` (or `'self'`)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` denying unused features
- [ ] `X-XSS-Protection: 0`; remove `X-Powered-By`

**Cookies & CSRF:**

- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`/`Strict`
- [ ] Anti-CSRF tokens on state-changing routes (not deprecated `csurf`)
- [ ] State changes use `POST`/`PUT`/`DELETE`, never `GET`

**Input handling:**

- [ ] Server-side validation on every input (Zod or similar)
- [ ] Parameterized SQL queries — no string concatenation
- [ ] DOMPurify for any user HTML you must render
- [ ] File uploads validated by size, declared type, and magic bytes

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the canonical risk list
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — practical, per-topic guidance
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [helmet docs](https://helmetjs.github.io/) — Node.js security headers
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitizer
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — free hands-on labs
- [securityheaders.com](https://securityheaders.com/) — grade your live headers

## Related Topics

- **Backend security** — authentication, authorization, secrets
- **DevOps security** — container hardening, secrets management
- **Network security** — HTTPS, TLS, certificates

---

**Difficulty:** Intermediate → Advanced · **Interview frequency:** Very High

Start with [01-xss-prevention.md](./01-xss-prevention.md).
</content>
