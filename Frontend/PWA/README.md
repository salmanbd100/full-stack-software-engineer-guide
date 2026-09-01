---
title: Part II — Progressive Web Apps
part: 2
chapter: 0
slug: frontend-pwa-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-01
tags: [pwa, service-workers, offline, manifest, push]
in_book: true
---

# Part II — Progressive Web Apps

A service worker is a programmable proxy that sits between your application and the network, runs
when no tab is open, and keeps serving the old version until you deliberately replace it. That
sentence is the whole section. Everything here — caching strategy, offline writes, push, install —
is a consequence of it.

This is the most operationally dangerous material in Part II. A bad service worker does not fail
loudly; it serves a stale build to a user who cannot clear it, sometimes for weeks. So the section is
written around lifecycle and update control as much as around capability. The interview version of
that is the question every senior candidate gets: *how do you ship a fix to someone whose browser is
already caching the broken version?*

## Chapters

| #  | Chapter                                                                     | What it answers                                                  |
| -- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Service Workers](./01-service-workers.md)                                  | How do you update one without stranding an open tab?             |
| 02 | [Caching Strategies and Offline UX](./02-caching-and-offline.md)             | Which strategy per request type, and where do offline writes go?  |
| 03 | [Installability and Push Notifications](./03-install-and-push.md)            | How do you ask for permission without getting blocked?           |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** For
service workers, the probes are unusually practical because the failure modes are unusually painful:

- **Can you describe the lifecycle?** Install, wait, activate — and the fact that a new worker sits
  in `waiting` until every controlled tab closes. A candidate who cannot explain that cannot explain
  why their fix did not reach users.
- **Do you pick a strategy per request?** Cache-first for hashed assets, network-first for HTML,
  stale-while-revalidate for data that tolerates being a few seconds old. One strategy for everything
  is the mid-level answer.
- **Where does an offline write live?** In IndexedDB, replayed sequentially with an idempotency key.
  Candidates who answer "Background Sync" have named the wake-up, not the mechanism.
- **What is your escape hatch?** Every production service worker needs a way to unregister itself.
  Being able to name that before being asked is a strong signal.
- **When would you not build a PWA?** Background execution, deep hardware access and app-store
  distribution are still native's. Saying so makes the rest of the answer credible.

## Reading Order

01 → 02 is the spine, and those two carry everything the other chapters depend on. Chapter 03 is
optional unless the role is engagement-driven or ships to mobile home screens.

**Interview sprint:** 01 → 02. The lifecycle question and the caching-strategy question are what
actually get asked; installability and push are depth for a role that needs them.

> The five earlier chapters in this section — the PWA introduction, the standalone manifest and
> background-sync chapters, and the long offline-patterns tour — were folded into these three by
> improvement #31b. They live in `Archive/pwa/` if the source material is needed.
