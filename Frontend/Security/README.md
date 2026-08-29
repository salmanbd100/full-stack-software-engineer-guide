---
title: Part IV — Frontend Security
part: 4
chapter: 0
slug: frontend-security-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-29
tags: [security, xss, csp, headers, validation]
in_book: true
---

# Part IV — Frontend Security

The browser half of the security spine. Four chapters on the attacks that are executed in a user's
browser against your origin, and the platform features that stop them. The server half — tokens,
sessions, authorisation, transport, injection into a database — lives in
[`Backend/Security/`](../../Backend/Security/README.md).

The organising idea is that browser security is defence in depth with a specific ordering. Output
encoding stops most cross-site scripting. Content Security Policy is what saves you when the encoding
misses one. Security headers close whole categories before an attack is even attempted. A candidate
who names only one layer has described a single point of failure.

## Chapters

| #  | Chapter                                                          | What it answers                                                        |
| -- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 01 | [XSS Prevention](./01-xss-prevention.md)                         | Where exactly does your framework stop protecting you?                 |
| 02 | [Content Security Policy](./02-content-security-policy.md)       | How do you write a policy that survives a successful injection?        |
| 03 | [Security Headers](./03-security-headers.md)                     | Which six headers, and what does each one prevent?                     |
| 04 | [Client-Side Input Handling](./04-client-side-input-handling.md) | Which inputs never reach the server, so the browser is the only check? |

## What Interviewers Probe For

The senior signal for this part is **thinks in budgets, boundaries and migration paths rather than
features.** For security the boundary language is literal — every question is about a trust boundary:

- **Can you explain XSS by context?** HTML text, an attribute, a URL and a script block each need
  different encoding. "I escape the input" is a mid-level answer; encoding at the point of output,
  for the context being written into, is the senior one.
- **Do you know where React's protection ends?** JSX escapes text children. It does not escape
  `dangerouslySetInnerHTML`, `href`, `style`, or anything rendered by a third-party widget. Naming
  those unprompted is a strong signal.
- **Can you roll out a CSP without breaking the site?** `Content-Security-Policy-Report-Only` first,
  collect violations, then enforce. A candidate who has actually shipped one always mentions this.
- **Which inputs never reach your server?** A `postMessage` payload, a value read from
  `location.hash`, a `?next=` redirect target. There is no server handler to review, so the browser is
  the only place the check can exist. Chapter 04 is built around that distinction.

## Reading Order

01 and 04 are a pair — the attack and the input side of the trust boundary. 02 and 03 are the header
layer and read best after them, once you know what they are mitigating.

**Interview sprint:** 01 → 02 → 03. Cross-site scripting, CSP and the header set are the three that
get asked by name in almost every senior frontend loop. CSRF is asked just as often; it is answered in
[Chapter ?? — CORS and CSRF](#ch-cors-and-csrf), because the defence is configured on the server.
