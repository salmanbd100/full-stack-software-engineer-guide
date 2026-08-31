---
title: Deployment
part: 8
chapter: 0
slug: ship-deployment-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [deployment, preview-environments, rollback, feature-flags, edge]
in_book: true
---

# Deployment

The pipeline builds the change. This section is about what happens to it afterwards — how it reaches
users, who sees it first, and how it comes back. That last part is where seniority shows. Plenty of
engineers can describe a deployment. Fewer can say, before the release goes out, exactly which parts
of it a rollback will not undo.

These four chapters follow one idea through to its consequences: a deployment is an immutable artefact
and a domain is a pointer at one. Preview environments, instant rollback and per-user releases are all
things that model makes cheap.

## Chapters

| #  | Chapter                                                          | What it answers                                                    |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| 01 | [Platform and Edge Deployments](./01-platform-deploys.md)        | What does promoting a deployment actually do, and where does code run? |
| 02 | [Preview Environments](./02-preview-environments.md)             | How does every pull request get a real URL, and what about the database? |
| 03 | [Rollback and Recovery](./03-rollback.md)                        | Roll back or fix forward — and which changes cannot be undone?      |
| 04 | [Feature Flags](./04-feature-flags.md)                           | How do you release to some users without deploying again?           |

## What Interviewers Probe For

Three deployment-specific questions, on top of the part-level signals in the Part VIII opener:

- **Where does the code run, and why there?** Edge execution is a latency win and a data-access loss.
  Moving a database-backed route to the edge to make it faster is a common and confident wrong answer.
- **Do previews use production data?** The answer should be no, and the follow-up — branched database,
  seeded ephemeral, or shared-and-fragile — is where the real trade-off discussion happens.
- **Deploy versus release.** Feature flags, canaries and preview URLs are three answers to the same
  question: how do you get a change in front of a small audience before everyone?

## Reading Order

The four chapters build on each other in sequence, but only the first is a prerequisite.

01 first — every other chapter in this section depends on the immutable-artefact model it sets up.
02 and 03 can be read in either order. 04 is the one that comes up most often in senior interviews,
because it is where deployment stops being an infrastructure question and starts being a product one.
