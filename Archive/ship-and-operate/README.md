---
title: Archive — Ship and Operate (Phase 9)
part: 0
chapter: 0
slug: archive-ship-and-operate-phase-9-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-25
tags: [archive, devops]
in_book: false
---

# Archive — Ship and Operate (Phase 9)

> Archived by improvement **#103**, which took Part VIII from 5,495 lines to under its 3,400-line budget.

A frontend-heavy engineer ships, watches and rolls back. They do not run the platform. Seven of these files
were merged into the neighbour that shared their idea. Two were archived outright, and the `Containers/`
section was folded into `CICD/`, because the image is the artefact the pipeline builds.

| Directory        | File                                  | Where it went                                                        |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `git/`           | `02-advanced-git.md`                  | Merged into *Git Fundamentals and Recovery* (`#ch-git-fundamentals`), `Git/01` |
| `git/`           | `04-repository-strategies.md`         | Merged into *Branching, Review and Repository Strategy* (`#ch-branching-and-review-workflow`), now `Git/02` |
| `containers/`    | `02-building-and-hardening-images.md` | Merged into *Container Images: Building and Hardening* (`#ch-docker-fundamentals`), now `CICD/02` |
| `containers/`    | `03-docker-compose.md`                | Archived. A local-development convenience, not an interview topic. The image chapter keeps one sentence |
| `containers/`    | `04-kubernetes-essentials.md`         | Archived. `BOOK-SPEC.md` § 6 puts Kubernetes operations out of scope, and this was the last of it in the book |
| `containers/`    | `README.md`                           | The old section opener. The section no longer exists |
| `cicd/`          | `03-pipeline-security.md`             | Merged into *GitHub Actions and Pipeline Security* (`#ch-github-actions`), now `CICD/03` |
| `observability/` | `03-alerting-and-on-call.md`          | Merged into *Metrics, Dashboards and Alerting* (`#ch-metrics-and-dashboards`), `Observability/02` |
| `cloud/`         | `03-storage-and-delivery.md`          | Merged into *Cloud Fundamentals, Storage and Delivery* (`#ch-cloud-fundamentals`), `Cloud/01` |
| `deployment/`    | `03-feature-flags.md`                 | Merged into *Deployment Strategies, Rollback and Feature Flags* (`#ch-deployment-strategies`), `Deployment/02` |
