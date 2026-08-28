---
title: Part VI — System Design Building Blocks
part: 6
chapter: 0
slug: part-system-design-building-blocks
level: intermediate
reading_time: 4
updated: 2026-08-28
tags: [system-design, caching, load-balancing, queues, cdn]
in_book: true
---

# Part VI — System Design Building Blocks

Almost every system in a design round is assembled from the same ten components. This section is the
parts catalogue: what each one does, what it costs, what it fails like, and — the part candidates
usually skip — when *not* to reach for it.

Read these as a reference rather than a narrative. In a round you will pull two or three of them off
the shelf, and what matters is that you can say why that one and not the neighbouring one.

## Chapters

| #  | Chapter                                                          | What it answers                                              |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Load Balancing](./01-load-balancing.md)                         | L4 or L7, and which algorithm for this traffic?               |
| 02 | [Caching](./02-caching.md)                                       | Which layer, which strategy, and how does it get invalidated? |
| 03 | [Content Delivery Network](./03-cdn.md)                          | What belongs at the edge, and what must not?                  |
| 04 | [Databases](./04-databases.md)                                   | Relational or not — and what does the access pattern say?     |
| 05 | [Message Queues and Event Streaming](./05-message-queues.md)     | Queue or log? At-least-once or exactly-once?                  |
| 06 | [WebSockets and Real-Time](./06-websockets.md)                   | Polling, SSE or a socket — what does this feature need?       |
| 07 | [Search](./07-search.md)                                         | When does a `LIKE` query stop being enough?                   |
| 08 | [Notifications](./08-notifications.md)                           | How do you fan out to millions without melting anything?      |
| 09 | [File Storage](./09-file-storage.md)                             | Where do the bytes live, and who is allowed to fetch them?    |
| 10 | [Monitoring and Observability](./10-monitoring.md)               | What do you instrument before the incident, not after?        |

## What Interviewers Probe For

- **Do you reach for the simplest thing that works?** Proposing Kafka for a feature that needs a
  database table is a common and costly reflex. So is proposing a cache before anyone has established
  there is a read problem.
- **Can you talk about failure?** Every component in this catalogue fails in a characteristic way —
  cache stampede, queue backlog, hot shard, thundering herd on reconnect. Naming the failure mode is
  the senior half of the answer.
- **Do you know what invalidation actually costs?** Caching is easy to add and hard to reason about.
  The interesting question is never "should we cache" — it is "how does this entry become wrong, and
  how do we find out".
- **Is observability part of the design, or bolted on?** Candidates who mention what they would
  measure while designing, rather than when asked, stand out immediately.

## Reading Order

Any order — this is a catalogue. If you are reading it cold, 01 → 02 → 04 covers the three that
appear in nearly every round, and 10 is the one most candidates neglect.

**Interview sprint:** 01, 02, 04, 05.
