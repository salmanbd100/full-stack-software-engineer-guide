---
title: Part VIII — Cloud Essentials
part: 8
chapter: 0
slug: ship-cloud-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [cloud, aws, serverless, object-storage, cdn]
in_book: true
---

# Part VIII — Cloud Essentials

Clouds differ; the primitives do not. Every provider gives you somewhere to run code without a
server, somewhere to put files that is not a disk, and something that caches those files near the
user. A frontend-heavy full stack engineer reaches for those three constantly and for almost nothing
else. That is what this section covers.

The examples use AWS, because it is the one most interview panels assume. Read the principle first
and the service name second — the shape of the answer transfers to every other provider, and saying
so out loud is itself a senior signal.

> ⚠️ Deep cloud coverage is out of scope. `BOOK-SPEC.md` § 6 caps this at a few condensed chapters
> rather than a service-by-service tour. The fuller AWS material is in `Archive/devops/aws/`.

## Chapters

| #  | Chapter                                                        | What it answers                                                  |
| -- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Cloud Fundamentals](./01-fundamentals.md)                     | What are regions, availability zones, and the shared responsibility line? |
| 02 | [Serverless Functions](./02-serverless.md)                     | When is a function the right unit, and what does a cold start cost? |
| 03 | [Object Storage](./03-object-storage.md)                       | How do you store and serve user files without touching a disk?   |
| 04 | [Content Delivery Networks](./04-cdn.md)                       | What does the edge cache, and how do you invalidate it correctly? |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way
back.** For cloud services, three questions do most of the work:

- **Can you separate the principle from the product?** "How would you serve user uploads?" wants
  object storage, signed URLs, and a CDN in front — not a recitation of bucket settings. Naming the
  service without the shape of the design reads as memorisation.
- **Do you know what a cold start actually costs you?** Serverless is not free of operational
  thinking. Package size, connection reuse, provisioned concurrency, and whether the workload is
  spiky or steady all change the answer.
- **How do you invalidate a cache you do not control?** Content-hashed filenames and long
  `max-age` beat invalidation requests, because invalidation is slow, rate-limited, and usually a
  sign the naming scheme was wrong.

## Reading Order

01 first for the vocabulary. After that, 03 and 04 are a pair — storing an asset and serving it are
the same job seen from two ends.

**Interview sprint:** 02 → 04. Serverless and the edge are where a frontend-heavy role gets probed;
the rest is background.
