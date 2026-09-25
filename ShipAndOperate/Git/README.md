---
title: Version Control with Git
part: 8
chapter: 1
slug: ship-git-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-25
tags: [git, version-control, branching, code-review, monorepo]
in_book: true
---

# Version Control with Git

Git is the tool in this part you touch every hour of every working day. It is also the one where a shaky
mental model costs you the most. The senior version is not a longer list of commands. You know what a
commit *is*, so you can say what `rebase`, `cherry-pick` and `reset --hard` will do before you type them,
and how to get back when they do something else.

## Chapters

| #  | Chapter                                                                              | What it answers                                              |
| -- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 01 | [Git Fundamentals and Recovery](#ch-git-fundamentals)                                | What is a commit, and how do you get back work you thought you lost? |
| 02 | [Branching, Review and Repository Strategy](#ch-branching-and-review-workflow)       | Which branching model, what makes a change reviewable, and one repository or many? |

## What Interviewers Probe For

Two Git questions, on top of the part-level signals in the Part VIII opener:

- **Can you recover?** "You force-pushed over a colleague's branch — what now?" A senior reaches for the
  reflog and explains why the objects are still there. Git rarely deletes anything.
- **Do you have a reason for your branching model?** Naming GitFlow is worth nothing. Saying that
  long-lived branches turn merge conflicts into a scheduling problem, and that trunk-based development
  trades that for feature flags and better tests, is worth a lot.

## Reading Order

01, then 02. Chapter 02 assumes you can picture the commit graph, because "squash or rebase merge" is a
question about what happens to commits.
