---
title: Part V — Backend Security
part: 5
chapter: 17
slug: backend-security-index
level: advanced
reading_time: 2
updated: 2026-09-24
tags: [security, auth, jwt, oauth, validation]
in_book: true
---

# Part V — Backend Security

Security is the part of the backend a frontend engineer is most often expected to have opinions on
and least often taught properly. The questions are rarely about cryptography. They are about where a
check belongs, what the browser does automatically, and which defence stops which attack.

This section runs in order on purpose: prove who someone is, then decide what they may do, then stop
the request itself being hostile.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Credentials, Sessions, CORS and CSRF](#ch-credentials-and-sessions) | Is the session revocable, and why does CORS not prevent CSRF? |
| 02 | [OAuth, OIDC and Authorisation](#ch-oauth) | What is each redirect protecting, and does this user own *this* object? |
| 03 | [Input Validation and Injection](#ch-backend-input-validation) | Where does data become code? |

## What Interviewers Probe For

- **Sessions or JWTs, and why.** The trade is statelessness against revocation. Candidates who call
  a JWT "more secure" have not thought about it.
- **Broken object-level authorisation.** Changing an id in a URL and reading someone else's data is
  the most common real vulnerability in production APIs.
- **Whether CORS protects anything.** It relaxes a browser rule, and the browser enforces it on the
  response, after your handler ran. The follow-up asks for three reasons it cannot stop CSRF.
- **Why parameterisation beats escaping.** The value never becomes part of the statement.
- **Where a token is stored.** `localStorage` turns one XSS into a persistent account takeover.

## Reading Order

01 → 02 covers authentication and authorisation end to end. The second half of 02 is where the real
bugs are. 03 stands alone.

**Interview sprint:** 01 → 02. Credential design, the CORS/CSRF distinction and object-level
authorisation come up in almost every senior loop.
