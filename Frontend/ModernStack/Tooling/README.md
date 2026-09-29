---
title: Tooling
part: 3
chapter: 35
slug: modern-stack-tooling-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [vite, bundlers, turbopack, monorepo, pnpm, typescript, linting]
in_book: true
---

# Tooling

Build tooling stopped being a specialism and became basic literacy. Among developers who use a bundler
at all, 98% use Vite. Hand-written Webpack configuration has fallen close to zero. And the survey answer
to "what is the worst part of the ecosystem" is now complexity itself. That changes what an interview
asks. Nobody wants your `webpack.config.js`. They want to know whether you understand what a bundler
does when the build is slow and nobody knows why.

Five chapters. Chapter 01 is the mechanism every other chapter assumes. Chapter 02 covers the tools of
this generation and why they were rewritten in Rust. Chapters 03–05 show tooling once a codebase has
several packages, several teams and a CI bill.

## Chapters

| #  | Chapter                                                                          | What it answers                                                  |
| -- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Modules and Bundling](#ch-modules-and-bundling)                                 | What does a bundler actually do, and why did that import survive? |
| 02 | [Vite, Rust Bundlers and the Dev Loop](#ch-vite-and-the-dev-loop)                | Why is the dev server instant and the build not, and what did Rust fix? |
| 03 | [Monorepos](#ch-monorepos)                                                       | What does a task graph buy, and when is one repository worse?    |
| 04 | [Type-Checking and Linting at Scale](#ch-type-checking-and-linting)              | How do you keep `tsc` and CI fast as the codebase grows?         |
| 05 | [Styling Strategy](#ch-styling-strategy)                                          | Utilities or scoped files, and what does a runtime library cost?  |

## What Interviewers Probe For

Two tooling questions, on top of the part-level signals in the Part III opener:

- **"CI takes 22 minutes. What do you do first?"** Measure, then cache, then split. The strong answer
  talks about the task graph and what a change really affects, not about buying bigger runners. It is
  the same reasoning as Docker layer caching in Part VIII, applied to a different tree.
- **"Why did that dependency end up in the client bundle?"** Tree shaking (dropping unused code) needs
  static imports, honest side-effect flags in `package.json`, and an ESM build to shake. A candidate who
  can read a bundle analysis and name the barrel file to blame has done this for real.

## Reading Order

01 first. It is the mechanism, and 02 makes no sense without it. Then 02.

Chapters 03 and 04 are independent. They matter most in a large organisation. Supply-chain controls on
dependencies live in Part VIII's pipeline security chapter.

Chapter 05 is independent too, and it reaches back into React. The Server Component boundary limits the
styling decision, so read it after the React section, not before.

**Interview sprint:** 01 → 02. Everything after that is job knowledge.
