---
title: Part II — Browser APIs
part: 2
chapter: 6
slug: frontend-browser-apis-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [storage, cookies, indexeddb, service-workers, i18n, browser]
in_book: true
---

# Part II — Browser APIs

Six chapters on what the browser gives you before any framework is involved: where state can live,
how to keep work off the main thread, how to keep working with no network, and how to speak the
user's language. Frameworks deliberately do not abstract most of this, because the consequences —
security, staleness, a broken layout in Arabic — belong to you.

The through-line is that every one of these APIs has a wrong answer that ships to production
regularly. Browser storage is not a database with a smaller quota. A service worker is not a cache you
can purge. A translation file is not internationalisation. Each chapter names the wrong answer first.

## Chapters

| #  | Chapter                                                                  | What it answers                                                  |
| -- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 01 | [Web Storage and IndexedDB](#ch-storage-apis)                            | Which store, when IndexedDB earns its cost, and why none holds a token? |
| 02 | [Cookies and SameSite](#ch-cookies-same-site)                            | Which attributes stop a cookie being read or replayed?           |
| 03 | [The Observer APIs](#ch-observer-apis)                                   | How do you stop asking the browser something sixty times a second? |
| 04 | [Web Workers and the Main Thread](#ch-web-workers)                       | What can move off the thread that handles input, and what does it cost? |
| 05 | [Service Workers, Caching and Offline](#ch-service-workers)              | How do you update a worker without stranding a tab, and which strategy does each request get? |
| 06 | [Internationalisation and the Intl APIs](#ch-i18n-fundamentals)          | How do you ship another language, plural rules and right-to-left without a rewrite? |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** For
these APIs specifically:

- **Where does the access token go?** The most common browser-storage question in a senior loop, and
  it has a real answer: an `HttpOnly` cookie, because anything JavaScript can read, an XSS can read.
- **Do you know what `SameSite=Lax` actually blocks?** Cross-site POSTs, not top-level GET
  navigations. Treating it as a complete CSRF defence is a common and expensive mistake.
- **What is the origin boundary?** Storage is partitioned by scheme, host and port. Most "the data
  disappeared" bugs are this, or eviction under storage pressure.
- **How does a service worker update?** A fix that "did not ship" is almost always a new worker stuck
  in `waiting`. Naming the kill switch unprompted is a strong signal.
- **Is `count === 1` enough?** It is wrong in most languages. The senior answer asks the locale, through
  `Intl`, and puts the locale in the URL.

## Reading Order

01 and 02 first and together — they are the two halves of "where does state live in the browser".
The rest are independent. 05 reads best after 01, because the offline write queue lives in IndexedDB.

**Interview sprint:** 01 → 02 → 05. The token question, the cookie-attributes question and the
service worker update question are the three that actually get asked. Read 06 if the product ships in
more than one language.
