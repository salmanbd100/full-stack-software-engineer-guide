---
title: Part VIII — Ship and Operate
part: 8
chapter: 0
slug: ship-and-operate-index
level: intermediate
reading_time: 3
updated: 2026-09-25
tags: [git, containers, cicd, observability, cloud, deployment]
in_book: true
---

# Part VIII — Ship and Operate

Everything here happens after the code is written. You branch and recover without fear, build the image
the pipeline ships, keep credentials out of the build, read the signals a live service sends, and get
the release back when it goes wrong. A frontend-heavy engineer ships, watches and rolls back. They do not
run the platform, so clusters, Terraform and Linux administration are out of scope per `BOOK-SPEC.md` § 6.

## Sections

| Section                                        | Chapters | What it covers                                                    |
| ---------------------------------------------- | -------- | ----------------------------------------------------------------- |
| [Version Control with Git](#ch-ship-git-index) | 2        | The object model, recovery, branching, monorepo or polyrepo       |
| [CI/CD](#ch-ship-cicd-index)                   | 3        | Pipeline design, container images, GitHub Actions and its security |
| [Observability](#ch-ship-observability-index)  | 2        | SLOs, metrics and cardinality, alerts worth waking a human for    |
| [Cloud Essentials](#ch-ship-cloud-index)       | 2        | Regions, identity, object storage and the CDN, serverless         |
| [Deployment](#ch-ship-deployment-index)        | 2        | Immutable artefacts, previews, strategies, rollback, feature flags |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way back.**
Two questions run through every section, and each section index adds its own.

- **Can you debug what you cannot log into?** A distroless image with no shell, a cold-started function,
  a p99 hiding behind an average. Operating a system and building one are different skills.
- **Where do the credentials come from?** Long-lived cloud keys in repository secrets are still the most
  common finding. Short-lived OIDC tokens are the expected answer.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "How do you deploy?" | "The pipeline builds and deploys per environment" | "Build once, promote the artefact — a rebuild per stage means staging tested something else" |
| "How do you roll back?" | "We just roll back the deploy" | "Code rolls back; a dropped column, a consumed message and a sent email do not. Here is which of those we have" |
| "Something is broken in production" | "I'd check the logs" | "p99 by route first, because an average hides it — then traces on the slow path, then logs" |

## Reading Order

`Git/` → `CICD/` → `Deployment/`, in that order. Each uses the words of the one before, and the
immutable-artefact model in `Deployment/01` is what makes rollback and feature flags make sense.
`Observability/` and `Cloud/` stand alone and fit anywhere.

**Interview sprint:** `Git/02` · `CICD/02`–`03` · `Deployment/01`–`02` · `Observability/02` · `Cloud/01`.

> ⚠️ **This part was 39,703 lines and is now under 3,400.** Item #20 made the first cut and #103
> the second. Terraform, Linux, Kubernetes, Docker Compose and the deep AWS tour were not deleted. They are
> in `Archive/devops/` and `Archive/ship-and-operate/`, just outside a book written for this reader.
