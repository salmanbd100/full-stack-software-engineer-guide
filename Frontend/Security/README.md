---
title: Part IV — Frontend Security
part: 4
chapter: 11
slug: frontend-security-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-24
tags: [security, xss, csp, headers, validation]
in_book: true
---

# Part IV — Frontend Security

This is the browser half of the book's security spine. Two chapters cover the attacks that run in a
user's browser against your origin, and the platform features that stop them. The server half (tokens,
sessions, authorisation, transport, injection into a database) lives in
[Part V — Backend Security](#ch-backend-security-index).

The core idea: browser security is defence in depth, in a set order. Output encoding stops most
cross-site scripting. Content Security Policy (CSP) saves you when the encoding misses one. Security
headers close whole kinds of attack before anyone tries them. A candidate who names only one layer has
described a single point of failure.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [XSS Prevention and Untrusted Input](#ch-xss-prevention) | Where exactly does your framework stop protecting you, and which inputs never reach the server? |
| 02 | [Content Security Policy and Security Headers](#ch-content-security-policy) | How do you write a policy that survives a successful injection, and which headers close the rest? |

## What Interviewers Probe For

In security, the word "boundary" is literal. Every question is about a trust boundary:

- **Can you explain XSS by context?** HTML text, an attribute, a URL and a script block each need
  different encoding. "I escape the input" is a mid-level answer. The senior answer encodes at the
  point of output, for the context you write into.
- **Do you know where React's protection ends?** JSX escapes text children. It does not escape
  `dangerouslySetInnerHTML`, `href`, `style`, or anything rendered by a third-party widget. Naming
  those unprompted is a strong signal.
- **Can you roll out a CSP without breaking the site?** `Content-Security-Policy-Report-Only` first,
  collect violations, then enforce. A candidate who has actually shipped one always mentions this.
- **Which inputs never reach your server?** A `postMessage` payload, a value read from
  `location.hash`, a `?next=` redirect target. There is no server handler to review, so the browser is
  the only place the check can exist. Chapter 01 ends on that distinction.

## Reading Order

Read 01 first. It covers the attack and the input side of the trust boundary. 02 is the header layer,
and it reads best once you know what that layer defends against.

**Interview sprint:** 01 → 02. Almost every senior frontend loop asks about cross-site scripting, CSP
and the header set by name. CSRF (cross-site request forgery) comes up just as often. The answer is in
[Chapter ?? — Credentials, Sessions, CORS and CSRF](#ch-credentials-and-sessions), because the defence is configured on the server.
