---
title: Continuous Integration and Delivery
part: 8
chapter: 4
slug: ship-cicd-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-25
tags: [cicd, containers, docker, github-actions, pipeline-security]
in_book: true
---

# Continuous Integration and Delivery

The pipeline is where a team's real engineering standards live. Whatever the wiki says about testing and
review, the pipeline is what is actually enforced. Senior candidates get asked about it because owning a
pipeline means owning the trade-off between shipping fast and shipping safely.

Three chapters, in the order the work happens: the principles that survive any tool, the image the
pipeline builds, then the one tool most teams use and how credentials reach it without being stored in
it. What happens to the artefact afterwards is the `Deployment/` section.

## Chapters

| #  | Chapter                                                               | What it answers                                                    |
| -- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 01 | [CI/CD Fundamentals](#ch-cicd-fundamentals)                           | What is the pipeline for, and how do you keep it under ten minutes? |
| 02 | [Container Images: Building and Hardening](#ch-docker-fundamentals)   | How do you get a small image that rebuilds fast and does not run as root? |
| 03 | [GitHub Actions and Pipeline Security](#ch-github-actions)            | How do you write a workflow that holds no long-lived credentials?   |

## What Interviewers Probe For

Three pipeline questions, on top of the part-level signals in the Part VIII opener:

- **Can you make a slow pipeline fast without deleting the tests?** Caching, parallel jobs, and running
  the expensive checks only where they change a decision. "Skip the flaky ones" is the wrong answer.
- **Do you understand layer caching?** "The image takes nine minutes to build and the only change was one
  line of code." The answer is about `COPY` order.
- **How does a secret leak out of a build?** Through a fork's pull request, a mutable action tag or a
  long-lived key. Each one has a specific fix.

## Reading Order

01 first — the other two use its words. Then 02 and 03 in either order. Chapter 03 is the one most likely
to come up in an interview.
