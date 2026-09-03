---
title: Tooling
part: 3
chapter: 0
slug: modern-stack-tooling-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [vite, bundlers, turbopack, monorepo, pnpm, typescript, linting]
in_book: true
---

# Tooling

Build tooling stopped being a specialism and became a literacy. Vite is at 98% usage among developers
who use a bundler at all, hand-written Webpack configuration has fallen close to zero, and the survey
answer to "what is the worst part of the ecosystem" is now complexity itself. That changes what an
interview asks. Nobody wants your `webpack.config.js`. They want to know whether you understand what a
bundler does when the build is slow and nobody knows why.

Six chapters. Chapter 01 is the mechanism every other chapter assumes. Chapters 02–03 are the tools of
this generation and the reason they were rewritten in Rust. Chapters 04–06 are what tooling looks like
once a codebase has several packages, several teams and a CI bill.

## Chapters

| #  | Chapter                            | What it answers                                                  |
| -- | ---------------------------------- | ---------------------------------------------------------------- |
| 01 | Modules and bundling               | What does a bundler actually do, and why did that import survive? |
| 02 | Vite and the dev loop              | Why is the dev server instant and the build not?                 |
| 03 | Turbopack, Rspack and Rolldown     | What problem did rewriting all of this in Rust solve?            |
| 04 | Monorepos                          | What does a task graph buy, and when is one repository worse?    |
| 05 | Type-checking and linting at scale | How do you keep `tsc` and CI fast as the codebase grows?         |
| 06 | Package management                 | What does the lockfile promise, and what does it not?            |

> ⚠️ **Being written.** Improvement #41 fills this table; the titles link as each chapter lands.

## What Interviewers Probe For

Two tooling questions, on top of the part-level signals in the Part III opener:

- **"CI takes 22 minutes. What do you do first?"** Measure, then cache, then split. The strong answer
  talks about the task graph and what is genuinely affected by a change, not about buying bigger
  runners. It is the same reasoning as Docker layer caching in Part VIII, applied to a different tree.
- **"Why did that dependency end up in the client bundle?"** Tree shaking needs static imports, side-effect
  honesty in `package.json`, and an ESM build to shake. A candidate who can read a bundle analysis and
  name the barrel file responsible has done this for real.

## Reading Order

01 first — it is the mechanism, and 02–03 are meaningless without it. Then 02, then 03 if the Rust
generation interests you or the role names Turbopack.

Chapters 04–06 are independent and are the ones that matter most in a large organisation. Chapter 06
carries the supply-chain material, which is the tooling topic most likely to come up in a security
conversation rather than a build one.

**Interview sprint:** 01 → 02. Everything after that is job knowledge.
