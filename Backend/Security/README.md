# Backend Security

## Overview

Backend security answers two questions on every request: **who is this?** (authentication) and **can they do this?** (authorization) — then makes sure the data they send can't change the meaning of your code.

This module covers the eight areas that come up in almost every senior backend interview.

**What you'll cover:**

- Token-based auth with JWT, and when sessions beat it
- Delegated access with OAuth 2.0 and PKCE
- Password storage that survives a database leak
- HTTPS/TLS — what the handshake actually protects
- CORS and CSRF — two things people constantly confuse
- Input validation, SQL injection, and security headers

> **The one idea that ties it together:** never trust input, and never rely on a single layer. Validate at the edge → parameterize at the database → set headers so a mistake can't be exploited → store secrets so a breach isn't fatal.

## Topics

| #   | Topic                                                       | Core idea                                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------- |
| 01  | [JWT Authentication](./01-jwt.md)                            | Signed, stateless tokens — and their revocation cost  |
| 02  | [OAuth 2.0](./02-oauth.md)                                   | Delegated access; authorization code + PKCE           |
| 03  | [Password Security](./03-passwords.md)                       | Slow hashes (Argon2id / bcrypt), never encryption     |
| 04  | [HTTPS & TLS](./04-https.md)                                 | Encryption + identity; terminate TLS, force HSTS      |
| 05  | [CORS & CSRF](./05-cors-csrf.md)                             | CORS relaxes reading; CSRF abuses automatic cookies   |
| 06  | [Input Validation](./06-validation.md)                       | Allowlist at the boundary; parse, don't just check    |
| 07  | [SQL Injection Prevention](./07-sql-injection.md)            | Parameterized queries — data never becomes code       |
| 08  | [Security Headers](./08-security-headers.md)                 | Cheap, high-leverage defense via `helmet`             |

## How the Pieces Fit

```
Request ──▶ TLS (04)              encrypted + server identity proven
              │
              ▼
        Headers + CORS (05, 08)   browser rules limit what's allowed
              │
              ▼
        AuthN: JWT / OAuth (01,02)   who is this?
              │
              ▼
        Validation (06)           input becomes a known, typed shape
              │
              ▼
        Parameterized queries (07)   data never parsed as code
              │
              ▼
        Hashed secrets at rest (03)  a leak isn't a catastrophe
```

Each layer assumes the one above it may fail. That's the point.

## Suggested Study Path

**Day 1 — Authentication.** Read 01 and 03. Be able to explain the JWT tradeoff (stateless speed vs. hard revocation) and why you hash passwords with a slow, salted algorithm.

**Day 2 — Delegated auth.** Read 02. Know the authorization code flow with PKCE end to end, and why the implicit flow is dead.

**Day 3 — Transport and browser rules.** Read 04 and 05. Focus on what TLS does and doesn't protect, and the CORS vs. CSRF distinction — this question is asked constantly.

**Day 4 — Input handling.** Read 06 and 07. Practice writing a Zod schema and a parameterized query from memory.

**Day 5 — Hardening and review.** Read 08. Then walk through the OWASP Top 10 out loud, mapping each risk to a topic in this module.

## Interview Focus

The highest-value answers, in rough order of how often they're asked:

1. **JWT vs. sessions** — "Which would you pick, and how do you log someone out?"
2. **Password storage** — "Why bcrypt or Argon2 instead of SHA-256?"
3. **CORS vs. CSRF** — "Does CORS protect against CSRF?" (No. Know why.)
4. **SQL injection** — "How do parameterized queries actually stop it?"
5. **OAuth** — "Walk me through the authorization code flow. What does PKCE add?"
6. **Validation** — "Where do you validate, and why isn't the client enough?"

**Interview tip:** describe the **attack** first, then the defense. It proves you understand why the fix works instead of naming a library.

## Pre-Deploy Security Checklist

**Authentication:**

- [ ] Passwords hashed with Argon2id or bcrypt (cost ≥ 12) — never encrypted or plain SHA
- [ ] Short-lived access tokens (5–15 min) + rotating refresh tokens
- [ ] `algorithms` pinned on every `jwt.verify` call — never trust the token's `alg`
- [ ] Rate limiting on login, register, and password reset

**Transport & headers:**

- [ ] HTTPS everywhere, HTTP redirected, HSTS with a long `max-age`
- [ ] `helmet()` enabled; CSP without `'unsafe-inline'` in `script-src`
- [ ] Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`

**Input & data:**

- [ ] Every request body, query, and param validated against a schema
- [ ] Parameterized queries or an ORM — zero string-concatenated SQL
- [ ] CORS origins from an explicit allowlist — never `*` with credentials
- [ ] Secrets in environment variables or a secret manager, never in git

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the canonical risk list
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — practical, per-topic guidance
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — requirements checklist
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — free hands-on labs
- [jwt.io](https://jwt.io/) — decode and inspect tokens
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/) — grade your TLS setup
- [securityheaders.com](https://securityheaders.com/) — grade your response headers

## Related Topics

- **[Frontend Security](../../Frontend/Security/)** — XSS, CSP, client-side input handling
- **[API Design](../API/)** — authentication and rate limiting at the API layer
- **DevOps** — secrets management, container hardening, dependency scanning

---

**Difficulty:** Intermediate → Advanced · **Interview frequency:** Very High

Start with [01-jwt.md](./01-jwt.md).
