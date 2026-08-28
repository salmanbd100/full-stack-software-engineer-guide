---
title: Part VIII — Version Control with Git
part: 8
chapter: 0
slug: ship-git-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [git, version-control, branching, code-review, monorepo]
in_book: true
---

# Part VIII — Version Control with Git

Git is the one tool in this part you touch every hour of every working day, and the one where a
shaky mental model costs you the most. Most engineers learn Git as a list of commands that usually
work. The senior version is different: you know what a commit *is*, so you can reason about what
`rebase`, `cherry-pick` and `reset --hard` will do before you type them, and you know how to get
back when they do something else.

These six chapters build that model first, then apply it to the decisions a team actually argues
about — trunk-based or GitFlow, squash or merge, one repository or twenty.

## Chapters

| #  | Chapter                                                                | What it answers                                                  |
| -- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Git Fundamentals](./01-git-fundamentals.md)                           | What is a commit, and what do the three trees actually hold?     |
| 02 | [Advanced Git](./02-advanced-git.md)                                   | How do you rewrite history without losing work?                  |
| 03 | [Git Branching Strategies](./03-branching-strategies.md)               | Trunk-based or GitFlow — which one fits this team?               |
| 04 | [Git Best Practices](./04-best-practices.md)                           | What makes a commit and a pull request reviewable?               |
| 05 | [Git Platforms](./05-git-platforms.md)                                 | What do GitHub and GitLab add on top of Git itself?              |
| 06 | [Repository Strategies](./06-repository-strategies.md)                 | Monorepo or polyrepo, and what does each cost you?               |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way
back.** For Git, that shows up in three places:

- **Can you recover?** "You force-pushed over a colleague's branch — what now?" A senior reaches for
  the reflog and explains why the objects are still there. A junior apologises. The question is
  really asking whether you understand that Git rarely deletes anything.
- **Do you have a reason for your branching model?** Naming GitFlow is worth nothing. Explaining that
  long-lived branches make merge conflicts a scheduling problem, and that trunk-based development
  trades that for feature flags and better tests, is worth a lot.
- **Do your commits help the next person?** Reviewers, `git bisect`, and release notes all read the
  same history. Engineers who write `fix stuff` commits are telling you how they treat the people
  downstream of them.

## Reading Order

Straight through, but 01 and 02 are the pair that matters — everything else assumes you can picture
the object graph. Chapter 06 is the only one you can safely read out of order.

**Interview sprint:** 01 → 03 → 04. The object model, the branching argument, and what makes a
reviewable change cover most of what gets asked.
