---
title: Part VIII — Continuous Integration and Delivery
part: 8
chapter: 0
slug: ship-cicd-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [cicd, github-actions, deployment, testing, pipeline-security]
in_book: true
---

# Part VIII — Continuous Integration and Delivery

The pipeline is where a team's real engineering standards live. Whatever the wiki says about testing
and review, the pipeline is what is actually enforced. Senior candidates get asked about it because
owning a pipeline means owning the trade-off between shipping quickly and shipping safely — and
because a badly designed one is the most expensive kind of slow.

These five chapters go from the principles that survive any tool, through the one tool most teams
now use, to the two things a pipeline is for besides running the build: proving the change works,
and stopping it shipping a credential.

## Chapters

| #  | Chapter                                                                | What it answers                                                |
| -- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [CI/CD Fundamentals](./01-cicd-fundamentals.md)                        | What is the pipeline for, and what do the DORA metrics measure? |
| 02 | [GitHub Actions](./02-github-actions.md)                               | How do you build a workflow that is fast and readable?         |
| 03 | [Deployment Strategies](./03-deployment-strategies.md)                 | Blue-green, canary, rolling — which risk are you buying down?  |
| 04 | [Testing in CI/CD](./04-testing.md)                                    | Which tests run on every push, and which run before release?   |
| 05 | [Pipeline Security](./05-security.md)                                  | How does a secret leak out of a build, and how do you stop it? |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way
back.** In the pipeline round, that means:

- **Build once, promote the artefact.** Rebuilding per environment means the thing you tested is not
  the thing you shipped. Candidates who describe a separate build per stage have usually never had to
  explain a difference between staging and production.
- **Can you make a slow pipeline fast without deleting the tests?** Caching, parallel jobs, splitting
  the fast feedback loop from the full suite, and only running the expensive checks where they change
  a decision. "Skip the flaky ones" is the wrong answer.
- **What does your rollback look like?** Not "we redeploy the previous tag" — that is the happy path.
  What about a database migration? A cached asset? Feature flags exist because some changes cannot
  be un-deployed, and knowing which is a seniority marker.
- **Where do the credentials come from?** Long-lived cloud keys in repository secrets are still the
  most common finding. Short-lived OIDC tokens are the expected answer.

## Reading Order

01 first — the vocabulary in it is used by the other four. After that, 03 and 05 are the two most
likely to come up in an interview.

**Interview sprint:** 01 → 03 → 05. Principles, release strategy, and the credential question.
