---
title: System Design — Security
part: 6
chapter: 0
slug: systemdesign-security-index
level: advanced # beginner | intermediate | advanced
reading_time: 1
updated: 2026-08-28
tags: [security, transitional]
in_book: false
---

# System Design — Security

> ⚠️ **This directory is transitional.** Improvement #24 consolidates security into two canonical
> homes — `Frontend/Security/` (browser-side, Part IV) and `Backend/Security/` (server-side, Part V) —
> plus one pipeline-security chapter in Part VIII. Unique material here merges into those; the rest is
> archived. No part-opener is written for it, because the part it would open is being dissolved.

Security is currently documented in **five** directories with substantial overlap: CSRF appears three
times, security headers twice, encryption three times. That duplication is the reason for #24, not an
accident of this directory in particular.

## Chapters

| #  | Chapter                                                  | Merges toward                        |
| -- | -------------------------------------------------------- | ------------------------------------ |
| 01 | [Authentication](./01-authentication.md)                 | `Backend/Security/`                  |
| 02 | [Authorization](./02-authorization.md)                   | `Backend/Security/`                  |
| 03 | [Encryption](./03-encryption.md)                         | `Backend/Security/`                  |
| 04 | [API Security](./04-api-security.md)                     | `Backend/Security/`                  |
| 05 | [Common Attacks and Prevention](./05-common-attacks.md)  | split — browser half to `Frontend/`  |
| 06 | [Compliance and Data Governance](./06-compliance.md)     | Part VIII, or `Archive/`             |

All six are currently over the 400-line chapter limit and will be trimmed as part of the merge.
Until #24 runs, treat these as the authoritative copy for design-round security questions.
