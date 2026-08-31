---
title: Version Control with Git
part: 8
chapter: 0
slug: ship-git-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [git, version-control, branching, code-review, monorepo]
in_book: true
---

# Version Control with Git

Git is the one tool in this part you touch every hour of every working day, and the one where a
shaky mental model costs you the most. Most engineers learn Git as a list of commands that usually
work. The senior version is different: you know what a commit *is*, so you can reason about what
`rebase`, `cherry-pick` and `reset --hard` will do before you type them, and you know how to get
back when they do something else.

These four chapters build that model first, then apply it to the decisions a team actually argues
about — trunk-based or GitFlow, squash or merge, one repository or twenty.

## Chapters

| #  | Chapter                                                                              | What it answers                                                |
| -- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 01 | [Git Fundamentals](./01-git-fundamentals.md)                                         | What is a commit, and what do the three trees actually hold?   |
| 02 | [Advanced Git](./02-advanced-git.md)                                                 | How do you get back work you thought you had lost?             |
| 03 | [Branching and Review Workflow](./03-branching-and-review-workflow.md)               | Which branching model, and what makes a change reviewable?      |
| 04 | [Repository Strategies](./04-repository-strategies.md)                                | Monorepo or polyrepo, and what does each one cost you?          |

## What Interviewers Probe For

Two Git-specific questions, on top of the part-level signals in the Part VIII opener:

- **Can you recover?** "You force-pushed over a colleague's branch — what now?" A senior reaches for
  the reflog and explains why the objects are still there. The question is really asking whether you
  understand that Git rarely deletes anything.
- **Do you have a reason for your branching model?** Naming GitFlow is worth nothing. Explaining that
  long-lived branches make merge conflicts a scheduling problem, and that trunk-based development
  trades that for feature flags and better tests, is worth a lot.

## Reading Order

Straight through. Chapters 01 and 02 are the pair that matters — 03 assumes you can picture the object
graph, because "squash or rebase merge" is a question about what happens to commits. Chapter 04 is the
only one you can safely read out of order.
