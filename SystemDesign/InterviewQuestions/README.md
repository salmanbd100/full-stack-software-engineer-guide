---
title: Part VI — Case Studies
part: 6
chapter: 0
slug: part-case-studies
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [system-design, case-studies, interviews]
in_book: true
---

# Part VI — Case Studies

Twenty worked design problems. Each one is a complete round: requirements, estimates, a data model, an
API surface, and the two or three tradeoffs an interviewer will push on.

Use them as rehearsal, not as answers to memorise. The value is in the reasoning path — clarify,
estimate, sketch, then defend — and that path is the same whether the prompt is a URL shortener or
something nobody has written up.

> ⚠️ **This directory is being rebalanced.** Improvement #28 renames it to `CaseStudies/`, keeps ten
> of these twenty, and archives the rest — they are all backend-shaped, and this book's reader walks
> into **frontend** system design rounds. Improvement #43 adds five frontend case studies alongside.
> The ten marked **Keep** below are the ones that survive.

## Case Studies

| #  | Case Study                                                    | Core problem                          | Fate  |
| -- | ------------------------------------------------------------- | ------------------------------------- | ----- |
| 01 | [Twitter](./01-twitter.md)                                    | Fan-out on write vs read              | —     |
| 02 | [Instagram](./02-instagram.md)                                | Media pipeline and feed generation    | Keep  |
| 03 | [Facebook Newsfeed](./03-facebook-newsfeed.md)                | Ranking and feed caching              | Keep  |
| 04 | [Uber](./04-uber.md)                                          | Geospatial indexing and matching      | —     |
| 05 | [WhatsApp](./05-whatsapp.md)                                  | Delivery guarantees at scale          | —     |
| 06 | [YouTube](./06-youtube.md)                                    | Transcoding and delivery              | —     |
| 07 | [Netflix](./07-netflix.md)                                    | CDN strategy and prefetching          | —     |
| 08 | [Amazon](./08-amazon.md)                                      | Inventory consistency                 | —     |
| 09 | [Google Search](./09-google-search.md)                        | Indexing and ranking                  | —     |
| 10 | [Dropbox](./10-dropbox.md)                                    | Sync, chunking and conflict           | —     |
| 11 | [URL Shortener](./11-url-shortener.md)                        | ID generation and read scaling        | Keep  |
| 12 | [Rate Limiter](./12-rate-limiter.md)                          | Token bucket and sliding window       | Keep  |
| 13 | [Notification System](./13-notification-system.md)            | Fan-out and delivery channels         | Keep  |
| 14 | [Chat System](./14-chat-system.md)                            | Connection state and ordering         | Keep  |
| 15 | [Web Crawler](./15-web-crawler.md)                            | Politeness and deduplication          | —     |
| 16 | [Typeahead](./16-typeahead.md)                                | Latency budget and trie caching       | Keep  |
| 17 | [API Gateway](./17-api-gateway.md)                            | Edge concerns and thin routing        | Keep  |
| 18 | [Distributed Cache](./18-distributed-cache.md)                | Consistent hashing and eviction       | Keep  |
| 19 | [Parking Lot](./19-parking-lot.md)                            | An OOP modelling exercise             | —     |
| 20 | [Ticketmaster](./20-ticketmaster.md)                          | Contention and the virtual queue      | Keep  |

## What Interviewers Probe For

The senior signal for Part VI is **drives the round — clarifies requirements, states assumptions,
defends tradeoffs.** In a case study specifically:

- **Do you scope before you design?** Every one of these prompts is deliberately under-specified.
  The first three minutes are for narrowing it, and skipping them is the most common failure.
- **Do your numbers inform your design?** An estimate you calculate and then ignore is worse than no
  estimate. The read/write ratio should visibly change what you draw next.
- **Can you go deeper on demand?** The interviewer will pick one box and ask you to open it. Depth on
  the component you chose to highlight is what separates a pass from a strong pass.
- **Do you know your design's failure mode?** "What breaks first if traffic goes up ten times?" has a
  specific answer for a specific design, and it should be one you volunteer.

## Reading Order

Start with 11 and 12 — they are the smallest complete rounds and the easiest to hold in your head.
Then 14 and 16, which are the two most likely to be asked of a frontend-heavy candidate. 18 and 20
are the hardest and the best value once the pattern is familiar.

**Interview sprint:** 11 → 12 → 16 → 14 → 13.
