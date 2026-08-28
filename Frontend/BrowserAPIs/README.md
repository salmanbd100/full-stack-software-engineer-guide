---
title: Part II — Browser APIs
part: 2
chapter: 0
slug: frontend-browser-apis-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [storage, cookies, indexeddb, permissions, browser]
in_book: true
---

# Part II — Browser APIs

Four chapters on the browser's own storage and permission model — the part of the platform that
frameworks deliberately do not abstract, because the security consequences belong to you. Every one
of these APIs has a version of the question "where do I put the token?", and every one has a wrong
answer that ships to production regularly.

The through-line is that browser storage is not a database with a smaller quota. Each store has a
different lifetime, a different origin model, a different exposure to script, and a different answer
when the user clears site data. Choosing between them is a threat-modelling exercise.

## Chapters

| #  | Chapter                                                    | What it answers                                                  |
| -- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Web Storage APIs](./01-storage-apis.md)                   | localStorage or sessionStorage — and why neither holds a token?  |
| 02 | [Cookies and SameSite](./02-cookies-same-site.md)          | Which attributes stop a cookie being read or replayed?           |
| 03 | [IndexedDB](./03-indexeddb.md)                             | How do you store structured data past the 5MB wall?              |
| 04 | [Browser Permissions](./04-browser-permissions.md)         | How do you ask, given that a denial is usually permanent?        |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** For
these APIs specifically:

- **Where does the access token go?** This is the most common browser-storage question in a senior
  loop and it has a real answer: an `HttpOnly` cookie, because anything JavaScript can read, an XSS
  can read. A candidate who says `localStorage` without naming that trade-off has failed the follow-up.
- **Do you know what `SameSite=Lax` actually blocks?** It stops cross-site POSTs, not cross-site GETs
  from top-level navigation. Treating it as a complete CSRF defence is a common and expensive mistake.
- **Can you justify IndexedDB over something simpler?** It is asynchronous, versioned and awkward.
  The reason to pay that cost is size, structure, or offline writes — not preference.
- **Do you handle a permanent denial?** The interface still has to work when the user says no. That
  answer separates people who have shipped a permission prompt from people who have read about one.
- **What is the origin boundary?** Storage is partitioned by scheme, host and port, so `http://` and
  `https://` on the same domain see different data, and a subdomain does not share with its parent
  unless a cookie's `Domain` attribute says so. Most "the data disappeared" bugs are this.
- **What happens when the quota runs out?** Every one of these APIs can fail on a write, and browsers
  evict without warning under storage pressure. Treating any of them as durable is a design error.

## Reading Order

Chapters 01 and 02 first and together — they are the two halves of "where does state live in the
browser". Chapters 03 and 04 are independent and can be read in either order.

**Interview sprint:** 01 → 02. The storage-and-token question and the cookie-attributes question are
the two that actually get asked; 03 and 04 come up mainly when the role is offline-first.

> ⚠️ Service workers and the Cache API are the browser's other storage layer, and they live in
> [PWA](../PWA/README.md) rather than here, because their lifecycle is what makes them difficult.
