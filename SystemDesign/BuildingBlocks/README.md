---
title: Part VI — Building Blocks
part: 6
chapter: 6
slug: part-system-design-building-blocks
level: intermediate
reading_time: 2
updated: 2026-09-24
tags: [system-design, load-balancing, caching, cdn, queues, resilience]
in_book: true
---

# Part VI — Building Blocks

Every design round is assembled from the same small set of components. Once you know what each one
buys, what it costs, and where it fails, most architectures become a matter of choosing which ones the
requirements actually pay for.

Read this section for the trade-offs, not the product names. A cache is a cache whether it is Redis or
Memcached; what matters is the invalidation strategy and the stampede.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Load Balancing](#ch-load-balancing) | L4 or L7, and what happens the moment a node dies? |
| 02 | [Caching](#ch-caching) | What to cache, where, and how it goes stale |
| 03 | [Content Delivery Network](#ch-cdn) | How much traffic never reaches your origin? |
| 04 | [Queues, Async Work and WebSockets](#ch-message-queues) | What comes off the request path, and what does holding a live connection cost? |
| 05 | [Service Boundaries and the API Gateway](#ch-service-boundaries) | Where do you split, and what belongs at the edge? |
| 06 | [Resilience Patterns](#ch-resilience-patterns) | What happens when a dependency stops answering? |

## What Interviewers Probe For

- **Do you reach for the cheapest component that works?** Proposing a message broker for work that a
  database row and a cron job would carry is a common over-engineering signal.
- **Can you name what a component costs?** A cache costs staleness. A queue costs eventual consistency
  and a duplicate-delivery problem. A gateway costs a hop and a shared component.
- **Do you know the failure mode?** Every block in this section has one that shows up in production and
  never in a tutorial: the health check that takes down the fleet, the cache stampede, the retry storm.
- **Do you keep business logic out of infrastructure?** The gateway routes; services decide.

## Reading Order

01 → 02 → 03 are the components almost every round touches, in the order a request meets them. 04
covers the two ways work leaves the request path. 05 and 06 belong together — they are the
distributed-systems half of the section.

**Interview sprint:** 01, 02 and 04, then 06.

> ⚠️ Two chapters left this section at **#31d**. File storage and monitoring are owned by Part VIII —
> `ShipAndOperate/Cloud/01-fundamentals.md` and `ShipAndOperate/Observability/` — and the
> originals are in `Archive/systemdesign/building-blocks/`. #101 archived search and folded WebSockets
> and the API gateway into their neighbours; those files are in `Archive/system-design/building-blocks/`.
