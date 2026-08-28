---
title: Part IV — Frontend Security
part: 4
chapter: 0
slug: frontend-security-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [security, xss, csrf, csp, headers]
in_book: true
---

# Part IV — Frontend Security

The browser half of the security spine. Five chapters on the attacks that are executed in a user's
browser against your origin, and the platform features that stop them. The server half — tokens,
sessions, transport, injection into a database — lives in
[`Backend/Security/`](../../Backend/Security/README.md).

The organising idea is that browser security is defence in depth with a specific ordering. Output
encoding stops most cross-site scripting. Content Security Policy is what saves you when the encoding
misses one. Security headers close whole categories before an attack is even attempted. A candidate
who names only one layer has described a single point of failure.

## Chapters

| #  | Chapter                                                          | What it answers                                                    |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| 01 | [XSS Prevention](./01-xss-prevention.md)                         | Where exactly does your framework stop protecting you?             |
| 02 | [CSRF Protection](./02-csrf-protection.md)                       | Why is `SameSite` on its own not enough?                           |
| 03 | [Content Security Policy](./03-csp-headers.md)                   | How do you write a policy that survives a successful injection?    |
| 04 | [Security Headers](./04-secure-headers.md)                       | Which six headers, and what does each one prevent?                 |
| 05 | [Input Validation and Sanitisation](./05-input-sanitization.md)  | Why is client-side validation only ever UX?                        |

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
- **CSRF or CORS?** They get confused constantly. CORS controls whether script can *read* a
  cross-origin response; it does nothing to stop the request being *sent*. Knowing the difference is
  the question behind chapter 02.

## Reading Order

01 and 05 are a pair — the attack and the input-side defence. 02 is independent. 03 and 04 are the
header layer and read best last, once you know what they are mitigating.

**Interview sprint:** 01 → 02 → 03. Cross-site scripting, cross-site request forgery and CSP are the
three that get asked by name in almost every senior frontend loop.

> ⚠️ Security is currently documented in five places across this repository. Improvement #24
> consolidates it into two — this directory and `Backend/Security/` — with everything else archived
> or folded in. Expect some overlap until that lands.
