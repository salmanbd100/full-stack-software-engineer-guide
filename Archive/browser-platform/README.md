---
title: Archive — The Browser Platform
part: 0
chapter: 0
slug: archive-browser-platform-index
level: intermediate # beginner | intermediate | advanced
reading_time: 1
updated: 2026-09-24
tags: [archive, pwa, i18n, indexeddb, permissions]
in_book: false
---

# Archive — The Browser Platform

> Archived by improvement **#97**, which took Part II from 5,936 lines to under its 3,800-line budget.

Nothing here is wrong. These are the long versions of material the book now teaches in one chapter
each. The PWA and internationalisation sections were four and five files deep, and a senior loop asks
about each one as a single question.

| Directory       | File                          | Where it went                                                      |
| --------------- | ----------------------------- | ------------------------------------------------------------------ |
| `pwa/`          | `02-caching-and-offline.md`   | Merged into *Service Workers, Caching and Offline* (`#ch-service-workers`), now `BrowserAPIs/05`. The offline write queue is left to Part VI's *Offline-First Architecture* |
| `pwa/`          | `03-install-and-push.md`      | Archived. The manifest, the install prompt and push permission timing were dropped |
| `pwa/`          | `README.md`                   | The section is gone; its one surviving chapter lives in `BrowserAPIs/` |
| `i18n/`         | `02-pluralization.md`         | Merged into *Internationalisation and the Intl APIs* (`#ch-i18n-fundamentals`), now `BrowserAPIs/06` |
| `i18n/`         | `03-date-number-formatting.md` | Merged into the same chapter                                      |
| `i18n/`         | `04-rtl-support.md`           | Merged into the same chapter                                       |
| `i18n/`         | `README.md`                   | The section is gone, as with `pwa/`                                |
| `browser-apis/` | `03-indexeddb.md`             | Merged into *Web Storage and IndexedDB* (`#ch-storage-apis`)       |
| `browser-apis/` | `04-browser-permissions.md`   | Archived. The Permissions API and prompt timing are reference material |

Two more moves happened in #97 that did not reach this directory:

- `Accessibility/06-testing-accessibility.md` moved to `Frontend/Testing/08-testing-accessibility.md`,
  with its slug unchanged. It is now a Part IV chapter, so Part IV's cut in #99 carries its 246 lines
- `Accessibility/01-why-accessibility-and-the-law.md` **stayed**, against the plan's candidate list. It
  is Part II's sample chapter on the companion site (`SAMPLE_CHAPTERS`), and the European Accessibility
  Act is the reason the section kept five chapters
