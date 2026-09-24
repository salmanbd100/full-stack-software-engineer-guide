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

Build tooling stopped being a specialism and became a literacy. Vite is at 98% usage among developers
who use a bundler at all, hand-written Webpack configuration has fallen close to zero, and the survey
answer to "what is the worst part of the ecosystem" is now complexity itself. That changes what an
interview asks. Nobody wants your `webpack.config.js`. They want to know whether you understand what a
bundler does when the build is slow and nobody knows why.

Five chapters. Chapter 01 is the mechanism every other chapter assumes. Chapter 02 is the tools of this
generation and the reason they were rewritten in Rust. Chapters 03–05 are what tooling looks like once a
codebase has several packages, several teams and a CI bill.

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
  talks about the task graph and what is genuinely affected by a change, not about buying bigger
  runners. It is the same reasoning as Docker layer caching in Part VIII, applied to a different tree.
- **"Why did that dependency end up in the client bundle?"** Tree shaking needs static imports, side-effect
  honesty in `package.json`, and an ESM build to shake. A candidate who can read a bundle analysis and
  name the barrel file responsible has done this for real.

## Reading Order

01 first — it is the mechanism, and 02 is meaningless without it. Then 02.

Chapters 03 and 04 are independent and are the ones that matter most in a large organisation.
Supply-chain controls on dependencies live in Part VIII's pipeline security chapter.

Chapter 05 is independent too, and it is the one that reaches back into React: the styling decision is
constrained by the Server Component boundary, so read it after the React section rather than before.

**Interview sprint:** 01 → 02. Everything after that is job knowledge.
