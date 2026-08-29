---
title: Part V — Backend Security
part: 5
chapter: 0
slug: backend-security-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-29
tags: [security, jwt, oauth, tls, cors, injection, authorization]
in_book: true
---

# Part V — Backend Security

The server half of the security spine. Who the caller is, what they are allowed to do, what crosses
the wire, and what reaches a query — those are the four questions this section answers. The browser
half — cross-site scripting, Content Security Policy, the headers that harden a page — lives in
[`Frontend/Security/`](../../Frontend/Security/README.md), and the pipeline that builds and deploys
the service is hardened in [Chapter ?? — Pipeline Security](#ch-cicd-security).

The two halves are not independent, and the chapters that straddle them say so. CORS is configured on
the server and only has effects in the browser. A `SameSite` cookie is set by the server and enforced
by the browser. Where an answer needs both sides, the chapter gives both sides.

## Chapters

| #  | Chapter                                                        | What it answers                                                  |
| -- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [JWT Authentication](./01-jwt.md)                              | When would a session cookie be the better choice?                |
| 02 | [OAuth 2.0](./02-oauth.md)                                     | What is each redirect in the authorisation code flow protecting? |
| 03 | [Passwords and Multi-Factor Authentication](./03-passwords.md) | How do you make a database leak stop short of an account leak?   |
| 04 | [Encryption in Transit and at Rest](./04-encryption.md)        | What does the handshake establish, and who holds the keys?       |
| 05 | [CORS and CSRF](./05-cors-csrf.md)                             | Why is CORS not a CSRF defence?                                  |
| 06 | [Backend Input Validation](./06-validation.md)                 | How does nothing untrusted reach your business logic?            |
| 07 | [SQL Injection Prevention](./07-sql-injection.md)              | What do you do in the two cases you cannot parameterise?         |
| 08 | [Authorisation](./08-authorisation.md)                         | Authenticated is not authorised — where is that enforced?        |

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow** — and for security, *can name what each mechanism does not protect against*.

- **JWT or session?** The most reliably asked auth question in a full stack loop. The real trade is
  revocation: a session can be deleted, a signed token is valid until it expires. Short access tokens
  plus a refresh token with a server-side revocation list is the answer that shows you have shipped it.
- **Can you walk the authorisation code flow?** With PKCE, and saying what the code exchange stops —
  interception of the redirect. Implicit flow is deprecated, and knowing why is the follow-up.
- **How are passwords stored?** Argon2id or bcrypt, per-user salt, a work factor that is tuned rather
  than default. Anyone who says SHA-256 has answered the whole question.
- **Where does validation live?** At the boundary, allowlist-first, before anything touches business
  logic. Client-side validation is UX and provides no security at all — being clear about that is the
  point.
- **What does CORS actually do?** It controls whether script may *read* a cross-origin response. It
  does not stop the request being sent, which is why it is not a CSRF defence.
- **Authenticated, or authorised?** Broken access control is the most common serious finding in real
  systems, because the request carries a valid session and looks legitimate in every log. Naming
  insecure direct object references and tenant isolation unprompted is the senior signal.

## Reading Order

01 to 03 first — identity is what everything else assumes. 08 follows naturally, because authorisation
is what identity is for. 04 to 07 are the hardening layer and can be read in any order.

**Interview sprint:** 01 → 08 → 05 → 07. Token strategy, access control, the CORS-versus-CSRF
confusion, and injection are the four that come up in nearly every loop.
