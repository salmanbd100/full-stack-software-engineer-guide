---
title: Part VIII — Ship and Operate
part: 8
chapter: 0
slug: ship-and-operate-index
level: intermediate
reading_time: 3
updated: 2026-08-31
tags: [git, containers, cicd, observability, cloud, deployment]
in_book: true
---

# Part VIII — Ship and Operate

Everything here happens after the code is written: branch and rebase without fear, package a service into an
image, own the pipeline that tests and releases it, read the signals it emits once live, and get it back when
the release goes wrong. Running a cluster, Terraform and Linux administration are out of scope per `BOOK-SPEC.md` § 6.

## Sections

| Section                                      | Chapters | What it covers                                                     |
| -------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [Version Control with Git](./Git/README.md)  | 4        | The object model, recovery, branching models, monorepo trade-offs  |
| [Containers](./Containers/README.md)         | 4        | Images, layer caching, Compose, the pod spec you have to promise   |
| [CI/CD](./CICD/README.md)                    | 4        | Pipeline design, GitHub Actions, release strategies, credentials   |
| [Observability](./Observability/README.md)   | 3        | SLOs, metrics and cardinality, alerts worth waking a human for     |
| [Cloud Essentials](./Cloud/README.md)        | 3        | Regions, serverless and cold starts, object storage and the CDN    |
| [Deployment](./Deployment/README.md)         | 4        | Immutable artefacts, previews, rollback, feature flags             |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way back.**
Four questions run through all six sections; each section index adds its own.

- **Build once, promote the artefact.** A pipeline that rebuilds per environment tested one thing and
  shipped another. A separate build per stage means never having had to explain a staging/production gap.
- **Which changes are one-way doors?** Dropped columns, consumed queue messages, sent emails, records created
  in someone else's system. "We just roll back" is said by nobody whose migration outlived its deployment.
- **Can you debug what you cannot log into?** A distroless image with no shell, a cold-started function,
  a p99 hiding behind an average. Operating a system and building one are different skills.
- **Where do the credentials come from?** Long-lived cloud keys in repository secrets are still the most
  common finding; short-lived OIDC tokens are the expected answer.

## Reading Order

`Git/` → `Containers/` → `CICD/` → `Deployment/`, in that order — each assumes the vocabulary of the one
before, and `Deployment/01`'s immutable-artefact model is what makes rollback and feature flags make sense.
`Observability/` and `Cloud/` are independent and fit anywhere.

**Interview sprint:** `Git/01`, `03` · `Containers/01`–`02`, `04` · `CICD/01`, `03`, `04` ·
`Deployment/01`, `03`, `04` · `Observability/01`, `03` · `Cloud/02`–`03`.

> ⚠️ **Three overlaps are deliberate.** Blue/green, rolling and canary live in `CICD/03` — properties of
> the pipeline, not of the platform. The CDN behaviour deciding whether a promoted build is visible is in
> `Cloud/03`. Core Web Vitals and real-user monitoring are in Part IV, with the collection mechanics.
>
> **This part was 39,703 lines and is now under 6,000** — the largest cut in the book, made at item #20.
> Terraform, Linux, Python automation, Kubernetes operations, networking and the deep AWS tour were not
> deleted: they are intact in `Archive/devops/`, by topic, just outside a book written for this reader.
