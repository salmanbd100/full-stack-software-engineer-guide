---
title: Continuous Integration and Delivery
part: 8
chapter: 0
slug: ship-cicd-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-02
tags: [cicd, github-actions, deployment, pipeline-security]
in_book: true
---

# Continuous Integration and Delivery

The pipeline is where a team's real engineering standards live. Whatever the wiki says about testing
and review, the pipeline is what is actually enforced. Senior candidates get asked about it because
owning a pipeline means owning the trade-off between shipping quickly and shipping safely — and
because a badly designed one is the most expensive kind of slow.

These three chapters go from the principles that survive any tool, through the one tool most teams now
use, to the question the pipeline exists to answer safely: how the credentials reach it without being
stored in it. What the pipeline does with the artefact afterwards is the `Deployment/` section.

## Chapters

| #   | Chapter                                                    | What it answers                                                     |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| 01  | [CI/CD Fundamentals](./01-cicd-fundamentals.md)            | What is the pipeline for, and how do you keep it under ten minutes?  |
| 02  | [GitHub Actions](./02-github-actions.md)                   | How do you write a workflow that holds no long-lived credentials?    |
| 03  | [Pipeline Security](./03-pipeline-security.md)             | How does a secret leak out of a build, and how do you stop it?       |

## What Interviewers Probe For

Two pipeline-specific questions, on top of the part-level signals in the Part VIII opener:

- **Can you make a slow pipeline fast without deleting the tests?** Caching, parallel jobs, splitting
  the fast feedback loop from the full suite, and only running the expensive checks where they change
  a decision. "Skip the flaky ones" is the wrong answer.
- **What does your rollback look like?** Not "we redeploy the previous tag" — that is the happy path.
  What about a database migration? A cached asset? Feature flags exist because some changes cannot be
  un-deployed, and knowing which is a seniority marker.

## Reading Order

01 first — its vocabulary is used by the other two. Then 03, which is the one most likely to come up
in an interview, and 02 if the role names GitHub Actions.
