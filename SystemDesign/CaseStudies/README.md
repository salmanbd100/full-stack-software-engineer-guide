---
title: Part VI — Case Studies
part: 6
chapter: 0
slug: part-case-studies
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-30
tags: [system-design, case-studies, interviews]
in_book: true
---

# Part VI — Case Studies

Ten worked design problems. Each one is a complete round: requirements, estimates, a data model, an
API surface, and the two or three trade-offs an interviewer will push on.

Use them as rehearsal, not as answers to memorise. The value is in the reasoning path — clarify,
estimate, sketch, then defend — and that path is the same whether the prompt is a URL shortener or
something nobody has written up.

These ten are **backend and distributed-systems shaped**, because that is still what a general system
design round asks for. They are not the whole picture for this reader. Improvement #43 adds five
**frontend** case studies alongside them, and those are the rounds a frontend-heavy candidate is more
likely to face and less likely to have rehearsed.

## Case Studies

| #   | Case Study                                            | Core problem                        |
| --- | ----------------------------------------------------- | ----------------------------------- |
| 01  | [URL Shortener](./01-url-shortener.md)                | ID generation and read scaling      |
| 02  | [Rate Limiter](./02-rate-limiter.md)                  | Where to enforce, tiers, capacity   |
| 03  | [Typeahead](./03-typeahead.md)                        | Latency budget and trie caching     |
| 04  | [Chat System](./04-chat-system.md)                    | Connection state and ordering       |
| 05  | [Notification System](./05-notification-system.md)    | Fan-out and delivery channels       |
| 06  | [News Feed](./06-news-feed.md)                        | Ranking and feed caching            |
| 07  | [Instagram](./07-instagram.md)                        | Media pipeline and feed generation  |
| 08  | [API Gateway](./08-api-gateway.md)                    | Edge concerns and thin routing      |
| 09  | [Distributed Cache](./09-distributed-cache.md)        | Consistent hashing and eviction     |
| 10  | [Ticketmaster](./10-ticketmaster.md)                  | Contention and the virtual queue    |

The numbering is the reading order: 01 is the smallest complete round and 10 is the hardest.

## What Interviewers Probe For

The senior signal for Part VI is **drives the round — clarifies requirements, states assumptions,
defends trade-offs.** In a case study specifically:

- **Do you scope before you design?** Every one of these prompts is deliberately under-specified.
  The first three minutes are for narrowing it, and skipping them is the most common failure.
- **Do your numbers inform your design?** An estimate you calculate and then ignore is worse than no
  estimate. The read/write ratio should visibly change what you draw next.
- **Can you go deeper on demand?** The interviewer will pick one box and ask you to open it. Depth on
  the component you chose to highlight is what separates a pass from a strong pass.
- **Do you know your design's failure mode?** "What breaks first if traffic goes up ten times?" has a
  specific answer for a specific design, and it should be one you volunteer.

## Reading Order

Read them in order. 01 and 02 are the smallest complete rounds and the easiest to hold in your head.
03 and 04 are the two most likely to be asked of a frontend-heavy candidate. 09 and 10 are the
hardest and the best value once the pattern is familiar.

**Interview sprint:** 01 → 02 → 03 → 04 → 05.

## What Is Not Here

Ten further studies — Twitter, Uber, WhatsApp, YouTube, Netflix, Amazon, Google Search, Dropbox, a
web crawler and a parking lot — were cut in improvement #28. They are backend-heavy variations on
patterns these ten already teach, and the parking lot is an object modelling exercise rather than a
system design one. Nothing was deleted: they live under `Archive/systemdesign/case-studies/`.
