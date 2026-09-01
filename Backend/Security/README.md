---
title: Part V — Backend Security
part: 5
chapter: 0
slug: backend-security-index
level: advanced
reading_time: 2
updated: 2026-09-01
tags: [security, auth, jwt, oauth, validation]
in_book: true
---

# Part V — Backend Security

Security is the part of the backend a frontend engineer is most often expected to have opinions on
and least often taught properly. The questions are rarely about cryptography. They are about where a
check belongs, what the browser does automatically, and which defence stops which attack.

This section is deliberately ordered as a flow: prove who someone is, then decide what they may do,
then stop the request itself being hostile.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Sessions and JWTs](./01-jwt.md) | Stateless or revocable — which did you actually need? |
| 02 | [OAuth 2.1 and OpenID Connect](./02-oauth.md) | What is each redirect in the flow protecting? |
| 03 | [Password Security](./03-passwords.md) | Is a database leak also an account leak? |
| 04 | [Authorisation](./04-authorisation.md) | Does this user own *this* object? |
| 05 | [CORS and CSRF](./05-cors-csrf.md) | Why does CORS not prevent CSRF? |
| 06 | [Input Validation and Injection](./06-validation.md) | Where does data become code? |

## What Interviewers Probe For

- **Sessions or JWTs, and why.** The trade is statelessness against revocation. Candidates who call
  a JWT "more secure" have not thought about it.
- **Broken object-level authorisation.** Changing an id in a URL and reading someone else's data is
  the most common real vulnerability in production APIs.
- **Whether CORS protects anything.** It is a relaxation mechanism enforced on the response, after
  your handler ran. Three reasons it cannot stop CSRF is the follow-up.
- **Why parameterisation beats escaping.** The value never becomes part of the statement.
- **Where a token is stored.** `localStorage` turns one XSS into a persistent account takeover.

## Reading Order

01 → 02 → 03 covers authentication end to end. 04 next, because it is where the real bugs are. 05 and
06 are independent and can be read in either order.

**Interview sprint:** 01 → 04 → 05. Token design, object-level authorisation and the CORS/CSRF
distinction come up in almost every senior loop.
