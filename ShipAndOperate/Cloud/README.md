---
title: Cloud Essentials
part: 8
chapter: 0
slug: ship-cloud-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [cloud, serverless, object-storage, cdn]
in_book: true
---

# Cloud Essentials

Clouds differ; the primitives do not. Every provider gives you somewhere to run code without a
server, somewhere to put files that is not a disk, and something that caches those files near the
user. A frontend-heavy full stack engineer reaches for those three constantly and for almost nothing
else. That is what this section covers.

Each chapter states the principle without a brand name first, then names products second — AWS most
often, because it is the one most interview panels assume, with Vercel and Cloudflare where the
frontend-facing shape differs. Saying the principle before the product is itself a senior signal.

## Chapters

| #  | Chapter                                                    | What it answers                                                  |
| -- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Cloud Fundamentals](./01-fundamentals.md)                 | What are regions, zones, and which half of security is yours?    |
| 02 | [Serverless Functions](./02-serverless.md)                 | What happens between the deploy and the handler, and what does a cold start cost? |
| 03 | [Object Storage and Delivery](./03-storage-and-delivery.md) | How do you store user files and serve them fast without touching a disk? |

## What Interviewers Probe For

Three cloud-specific questions, on top of the part-level signals in the Part VIII opener:

- **Can you separate the principle from the product?** "How would you serve user uploads?" wants
  object storage, a presigned URL, and a cache in front — not a recitation of bucket settings. Naming
  the service without the shape of the design reads as memorisation.
- **Do you know what a cold start actually costs you?** Serverless is not free of operational
  thinking. Bundle size, connection reuse, pre-warming, and whether the workload is spiky or steady
  all change the answer.
- **How do you invalidate a cache you do not control?** Content-hashed filenames and a long
  `max-age` beat purge requests, because purging is slow, metered, and usually a sign the naming
  scheme was wrong.

## Reading Order

01 first for the vocabulary — regions, the managed-service ladder, and the responsibility line all
get used by the two chapters after it. 02 and 03 are independent of each other.
