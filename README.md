---
title: The Senior Full Stack Handbook
part: 0
chapter: 0
slug: book-index
level: intermediate # beginner | intermediate | advanced
reading_time: 5
updated: 2026-10-17
tags: []
in_book: false
---

# The Senior Full Stack Handbook

**Frontend-heavy engineering for 2027: fundamentals, the modern stack, system design and AI**

This repository is the **manuscript** for a book, and the tooling that builds it. The book is written.
It is 903 pages in nine parts, short enough to read end to end. A second volume, **Book 2: DSA
Patterns**, covers the coding round.

| | |
| --- | --- |
| **The handbook** | 150 chapters in nine parts · 39,927 lines · **903 pages** · 647 interview questions |
| **Book 2** | *DSA Patterns* · 16 chapters · 101 pages · 87 interview questions · its own PDF, EPUB and question index |
| **Scope** | Locked in [`BOOK-SPEC.md`](./BOOK-SPEC.md): nine parts, line budgets, twelve non-negotiables |
| **Plan** | [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md): the open items of Phase 11, the Bangla web edition — the natural-Bangla re-translation (#128k–#128z) and the live check (#130). Finished phases are in `Archive/planning/` |
| **Reader** | 3–8 years' experience, going for a senior or staff frontend or full stack role |
| **Web** | The whole book, free, in English at [www.salmanrahman.com/handbook](https://www.salmanrahman.com/handbook/) and in Bangla at [/handbook/bn](https://www.salmanrahman.com/handbook/bn/), with an optional reading-progress tracker |

---

## Who It Is For

An engineer with **3–8 years' experience** going for a senior or staff **frontend-heavy full stack**
role. This person owns the frontend end to end. They are expected to be credible on the backend, in
the system design round, and now on the AI feature, without being a specialist in any of them.

It assumes you can already write TypeScript and use a framework. It does not stop to explain what a
hook is. It explains the layer under the definition. An assistant can answer the surface version of
every one of these questions instantly, and that is why the interview bar moved.

---

## The Nine Parts

Each part's scope and budget are locked in [`BOOK-SPEC.md`](./BOOK-SPEC.md) § 4 and § 5. The page
counts are measured off the built PDF by `pnpm book:pages`.

| Part | Covers | Chapters | Pages | Where it lives |
| ---- | ------ | -------- | ----- | -------------- |
| **I — Foundations** | JavaScript · TypeScript · design patterns | 15 | 74 | [`Frontend/JavaScript`](./Frontend/JavaScript/README.md), [`Frontend/TypeScript`](./Frontend/TypeScript/README.md), [`Backend/DesignPatterns`](./Backend/DesignPatterns/README.md) |
| **II — The Browser Platform** | HTML and CSS · browser APIs · accessibility | 15 | 86 | [`Frontend/HtmlCss`](./Frontend/HtmlCss/README.md), [`Frontend/BrowserAPIs`](./Frontend/BrowserAPIs/README.md), [`Frontend/Accessibility`](./Frontend/Accessibility/README.md) |
| **III — The Modern Frontend Stack** | React · Next.js · Svelte · rendering · state · tooling | 34 | 182 | [`Frontend/ModernStack`](./Frontend/ModernStack/README.md) |
| **IV — Frontend at Scale** | Architecture · performance · security · testing | 15 | 84 | [`Frontend/Architecture`](./Frontend/Architecture/README.md), [`Frontend/WebPerformance`](./Frontend/WebPerformance/README.md), [`Frontend/Security`](./Frontend/Security/README.md), [`Frontend/Testing`](./Frontend/Testing/README.md) |
| **V — Backend for Frontend Engineers** | Node.js · API design · SQL and NoSQL · security | 15 | 86 | [`Backend`](./Backend/README.md) |
| **VI — System Design** | Fundamentals · building blocks · frontend design · case studies | 18 | 102 | [`SystemDesign`](./SystemDesign/README.md) |
| **VII — AI Engineering** | Foundations · integration · RAG · agents · production · AI UX | 20 | 124 | [`AI`](./AI/README.md) |
| **VIII — Ship and Operate** | Git · CI/CD · observability · cloud · deployment | 11 | 74 | [`ShipAndOperate`](./ShipAndOperate/README.md) |
| **IX — The Human Layer** | Behavioural · communication | 7 | 41 | [`Behavioral`](./Behavioral/README.md), [`Communication`](./Communication/README.md) |
| *Book 2 — DSA Patterns* | Sixteen algorithm patterns | 16 | 101 | [`DSA`](./DSA/README.md) |

Parts I–IV are 51.2% of the handbook. That is the rule behind "frontend-heavy": the spec requires
at least half. The rest of the handbook's 903 pages is front matter, part openers and back matter:
the glossary, the question index, further reading and the author page.

Topics that are out of scope, such as Terraform, Kubernetes operations and deep AWS, are in
[`Archive/`](./Archive/README.md). They were cut on purpose and are not missing.

---

## How to Read It

[`How-to-Read-This-Book.md`](./How-to-Read-This-Book.md) sets out three routes.

| Route | The path | For |
| ----- | -------- | --- |
| **Interview sprint** (6 weeks) | Parts I → III → VI → IX, then Book 2 | A loop that starts in about six weeks |
| **Working reference** | Any chapter, cold, from the contents | A decision you have to make on Tuesday |
| **Cover to cover** | Parts I → IX in order | Levelling up deliberately, over months |

Every chapter stands alone. That is why cross-references are anchors rather than "as we saw earlier".

---

## Getting Started

### Prerequisites

| Tool | Version | Needed for |
| ---- | ------- | ---------- |
| **Node** | `>=22.6.0` | Every script. They are TypeScript and run unbuilt via `--experimental-strip-types` |
| **pnpm** | `9.15.0` | The package manager. Do not switch it |
| **pandoc** + **tectonic** | any recent | The PDF and EPUB. `brew install pandoc tectonic` |
| **mermaid-cli** | any recent | The diagrams. `pnpm add -g @mermaid-js/mermaid-cli` |
| **epubcheck** | any recent | EPUB validation. `brew install epubcheck` |
| **poppler** | any recent | The cover PNGs. `brew install poppler` |
| **Vercel CLI** | any recent | Only to run the reading-progress API locally with `vercel dev`. `pnpm add -g vercel` |

```bash
pnpm install
```

### Commands

| Command | What it does |
| ------- | ------------ |
| `pnpm lint:docs` | Checks every manuscript file against the Book Chapter Standard. **Run it before calling a file done** |
| `pnpm book:build` | The handbook as PDF and EPUB, into `build/The-Senior-Full-Stack-Handbook.{pdf,epub}` |
| `pnpm book:companion` | Book 2, as its own PDF and EPUB |
| `pnpm book:specimen` | The whole print design on ten pages, in seconds |
| `pnpm book:cover` | The front and back cover, as a PDF and two 1600 × 2560 PNGs |
| `pnpm book:pages` | Pages per part, measured from the built PDF |
| `pnpm index:questions` | Regenerates both question indexes from every chapter's questions |
| `pnpm check:code-samples` | Compiles every TypeScript fence in the book |
| `pnpm site:dev` · `pnpm site:build` | The free web edition, English and Bangla, generated from the manuscript |
| `pnpm site:translate` | The Bangla cache in `i18n/bn/`: what is missing or stale, and `--write` to add a translated page. `--check` fails on a stale page |
| `pnpm check:versions` · `pnpm check:stale` | Version-gated claims that name no version, and outdated terms. `--check` fails on any |
| `pnpm test` | The script test suite |
| `pnpm plan:next` · `pnpm plan:check` | The next plan item, and a check that the plan's counters agree |

`lint:docs` and `check:code-samples` gate on a baseline file, not on zero. A count that goes **up**
fails. A count that goes down should be committed as the new baseline.

CI ([`.github/workflows/lint-docs.yml`](./.github/workflows/lint-docs.yml)) runs `lint:docs`,
`number:chapters --check`, `index:check`, `check:code-samples`, `site:build`, `check:versions --check`,
`check:stale --check`, `plan:check`, `test` and `book:collect` on every push and pull request.

### How the build works

`scripts/lib/book.ts` is the one model of what counts as a chapter: exclusions, the part mapping, the
front-matter reader and the reading order. The build, the lint and the site generator all import it,
so they cannot disagree. [`Archive/`](./Archive/README.md) is skipped by everything.

The print design lives in `scripts/tex/`, and `tokens.tex` holds every value that can be tuned.

### The web edition

The site under `site/` is VitePress, and the chapters in it are generated from the manuscript.
Never edit `site/book/` or `site/bn/book/` by hand. Only these files are written by hand:

| File | What it holds |
| ---- | ------------- |
| `site/index.md` · `site/bn/index.md` | The English and Bangla home pages |
| `site/building-this-book.md` | The developer guide to this build. Web only |
| `site/.vitepress/config.ts` | The site config: `base: '/handbook/'`, the two locales, the sidebar override |
| `site/.vitepress/theme/` | A wider measure, larger type, the portfolio's teal, the EN/BN switch and the reading-progress tracker. Web only |
| `api/progress.ts` | The reading-progress API, a Vercel function over Upstash Redis |
| `site/public/` | The portfolio's favicons |

**The Bangla edition** lives at `/handbook/bn/`. Claude translates each page in Claude Code
sessions, never through an API, and `pnpm site:translate --write` stores it in `i18n/bn/`, a
committed cache keyed by a hash of the English. Edit a chapter and its Bangla page goes stale; the
site shows the English with a notice until it is translated again. The rules are in
[`i18n/TRANSLATION-BRIEF.md`](./i18n/TRANSLATION-BRIEF.md), and Bangla chapter titles in
`i18n/titles.bn.json`.

**The reading-progress tracker** lets a reader tick chapters in the sidebar and see a percentage in
the nav, after giving a name and an email. Progress is stored by email in Upstash Redis, through
`api/progress.ts`. It needs the Upstash integration on the Vercel project, and `vercel dev` to run
locally, because `pnpm site:dev` serves no `api/` folder.

**How it deploys:** the site is its own Vercel project, `senior-full-stack-handbook`, connected to this
repo. A push to `main` deploys to production, and any other branch gets a preview. The
`salman-portfolio` app rewrites `/handbook/*` to that project, so the portfolio never needs a redeploy.
`vercel.json` holds only the build settings. A failed build leaves the last good deployment live.

---

## Contributing to the Manuscript

1. **Read [`BOOK-SPEC.md`](./BOOK-SPEC.md) first.** If a topic is on the out-of-scope list, it was
   archived on purpose.
2. **Start from `.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md`**, not from a blank file. The
   Book Chapter Standard is mandatory: six blocks, TypeScript-only fences, 150–400 lines, `#ch-slug`
   cross-references.
3. **Use [`REFERENCE-CHAPTER.md`](./REFERENCE-CHAPTER.md)** as the worked example when the standard
   and your instinct disagree.
4. **Run `pnpm lint:docs`** before you call anything done.
5. **Bring the Bangla up to date.** `pnpm site:translate --list` names the pages your edit made
   stale. Translate them to the brief, `--write` them, and commit `i18n/bn/` with the chapter.

---

© Salman Rahman. All rights reserved. The manuscript in this repository is not licensed for
redistribution.
