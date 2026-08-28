---
title: Part II — Progressive Web Apps
part: 2
chapter: 0
slug: frontend-pwa-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [pwa, service-workers, offline, manifest, push]
in_book: true
---

# Part II — Progressive Web Apps

A service worker is a programmable proxy that sits between your application and the network, runs
when no tab is open, and keeps running the old version until you deliberately replace it. That
sentence is the whole section. Everything here — caching strategy, offline writes, push, install —
is a consequence of it.

This is the most operationally dangerous material in Part II. A bad service worker does not fail
loudly; it serves a stale build to a user who cannot clear it, sometimes for weeks. So the section is
written around lifecycle and update control as much as around capability. The interview version of
that is the question every senior candidate gets: *how do you ship a fix to someone whose browser is
already caching the broken version?*

## Chapters

| #  | Chapter                                                                | What it answers                                                   |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 00 | [Progressive Web Apps](./00-pwa-introduction.md)                       | What does a PWA buy the user, and when is native still right?     |
| 01 | [Service Workers](./01-service-workers.md)                             | How do you update one without stranding an open tab?              |
| 02 | [Web App Manifest](./02-web-app-manifest.md)                           | What does the user see before your JavaScript runs?               |
| 03 | [Offline Patterns and Caching Strategies](./03-offline-patterns.md)    | Which strategy per request type, and what does it serve offline?  |
| 04 | [Background Sync](./04-background-sync.md)                             | How do you accept a write with no connection?                     |
| 05 | [Push Notifications](./05-push-notifications.md)                       | How do you ask for permission without getting blocked?            |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** For
service workers, the probes are unusually practical because the failure modes are unusually painful:

- **Can you describe the lifecycle?** Install, wait, activate — and the fact that a new worker sits
  in `waiting` until every controlled tab closes. A candidate who cannot explain that cannot explain
  why their fix did not reach users.
- **Do you pick a strategy per request?** Cache-first for hashed assets, network-first for HTML,
  stale-while-revalidate for data that tolerates being a few seconds old. One strategy for everything
  is the mid-level answer.
- **What is your escape hatch?** Every production service worker needs a way to unregister itself.
  Being able to name that before being asked is a strong signal.
- **When would you not build a PWA?** Background execution, deep hardware access and app-store
  distribution are still native's. Saying so makes the rest of the answer credible.

## Reading Order

00 → 01 → 03 is the spine; those three carry the concepts everything else depends on. Chapter 02 is
short and can be read at any point. Chapters 04 and 05 are optional unless the role is offline-first
or engagement-driven.

**Interview sprint:** 01 → 03. The lifecycle question and the caching-strategy question are what
actually get asked; the rest is depth for a role that needs it.

> ⚠️ **This section is 6,002 lines against a 400-line-per-chapter limit** — every chapter here is
> over, several by a factor of three. The budget table in `IMPROVEMENT-PLAN.md` counts the 6,200-line
> browser-platform cut, but **no numbered item currently owns it**. The material is right; the length
> is not.
