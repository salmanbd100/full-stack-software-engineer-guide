---
title: Cloud Essentials
part: 8
chapter: 11
slug: ship-cloud-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-25
tags: [cloud, serverless, object-storage, cdn]
in_book: true
---

# Cloud Essentials

Clouds differ; the primitives do not. Every provider gives you somewhere to run code without a server,
somewhere to put files that is not a disk, and something that caches those files near the user. A
frontend-heavy full stack engineer reaches for those three all the time and for almost nothing else.

Each chapter states the principle without a brand name first, then names the products — AWS most often,
because most interview panels assume it, with Vercel and Cloudflare where the frontend shape differs.

## Chapters

| #  | Chapter                                                               | What it answers                                                  |
| -- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Cloud Fundamentals, Storage and Delivery](#ch-cloud-fundamentals)    | Which half of security is yours, and how do you store and serve user files? |
| 02 | [Serverless Functions](#ch-serverless-functions)                      | What happens between the deploy and the handler, and what does a cold start cost? |

## What Interviewers Probe For

Two cloud questions, on top of the part-level signals in the Part VIII opener:

- **Can you separate the principle from the product?** "How would you serve user uploads?" wants object
  storage, a presigned URL and a cache in front — not a list of bucket settings.
- **Do you know what a cold start costs?** Bundle size, connection reuse, and whether the load is spiky or
  steady all change the answer.

## Reading Order

01 first, for the words — regions, the managed-service ladder and the responsibility line. Then 02.
