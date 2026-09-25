---
title: Deployment
part: 8
chapter: 14
slug: ship-deployment-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-25
tags: [deployment, preview-environments, rollback, feature-flags, edge]
in_book: true
---

# Deployment

The pipeline builds the change. This section is about what happens next: how it reaches users, who sees it
first, and how it comes back. That last part is where seniority shows. Many engineers can describe a
deployment. Fewer can say, before the release goes out, which parts of it a rollback will not undo.

Both chapters follow one idea: a deployment is an immutable artefact, and a domain is a pointer at one.
Preview environments, instant rollback and per-user releases are all things that model makes cheap.

## Chapters

| #  | Chapter                                                                            | What it answers                                                   |
| -- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 01 | [Platform Deploys and Preview Environments](#ch-platform-deploys)                  | What does promoting a deployment do, and how does a pull request get a real URL? |
| 02 | [Deployment Strategies, Rollback and Feature Flags](#ch-deployment-strategies)     | Which risk are you buying down, and which changes cannot be undone? |

## What Interviewers Probe For

Three deployment questions, on top of the part-level signals in the Part VIII opener:

- **Where does the code run, and why there?** Edge execution is a latency win and a data-access loss.
  Moving a database-backed route to the edge to make it faster is a common, confident wrong answer.
- **Do previews use production data?** The answer should be no. The follow-up — branched database, seeded
  ephemeral, or shared and fragile — is where the real trade-off discussion happens.
- **Deploy versus release.** Feature flags, canaries and preview URLs are three answers to one question:
  how do you get a change in front of a small audience before everyone?

## Reading Order

01 first — chapter 02 depends on the immutable-artefact model it sets up.
