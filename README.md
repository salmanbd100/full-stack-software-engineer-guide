---
title: The Senior Full Stack Handbook
part: 0
chapter: 0
slug: book-index
level: intermediate # beginner | intermediate | advanced
reading_time: 7
updated: 2026-08-28
tags: []
in_book: false
---

# The Senior Full Stack Handbook

**Frontend-Heavy — Fundamentals, Modern Stack, System Design and AI Engineering for 2027**

This repository is the **manuscript** for a book. It began as a personal interview-prep collection and is
being restructured, chapter by chapter, into something that can be bound and printed.

It is still useful as a knowledge base while that happens — but treat every directory as work in progress,
not as a finished reference.

| | |
| --- | --- |
| **Progress** | 16 of 78 improvements · [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) |
| **Scope** | Locked in [`BOOK-SPEC.md`](./BOOK-SPEC.md) — nine parts, line budgets, twelve non-negotiables |
| **Current size** | 423 files · ~134,000 lines |
| **Target** | ~55,000 lines in-book. Everything else moves to [`Archive/`](./Archive/README.md) |
| **Reader** | 3–8 years' experience, targeting senior or staff frontend / full stack roles |

---

## Getting Started

### Prerequisites

| Tool | Version | Needed for |
| ---- | ------- | ---------- |
| **Node** | `>=22.6.0` | Every script. They are TypeScript and run unbuilt via `--experimental-strip-types` |
| **pnpm** | `9.15.0` | The package manager. Do not switch it |
| **pandoc** + **tectonic** | any recent | PDF and EPUB only. `brew install pandoc tectonic` (~250 MB) |

```bash
pnpm install
```

The only dependency is `@types/node`, so `scripts/*.ts` typecheck. There is no framework here and nothing
to build — this repository is markdown and tooling.

### Commands

Every script in [`package.json`](./package.json):

| Command | What it does |
| ------- | ------------ |
| `pnpm lint:docs` | Checks every manuscript file against the Book Chapter Standard — front matter, broken links, code fences, chapter length, missing READMEs, heading jumps. **Run this before calling any file done** |
| `pnpm lint:docs --rule=<id>` | Every occurrence of one rule, e.g. `--rule=broken-link` |
| `pnpm lint:docs --strict` | Fail on any violation at all, rather than on a regression |
| `pnpm book:build` | The full book — PDF and EPUB into `build/` |
| `pnpm book:pdf` | PDF only. The faster one while iterating |
| `pnpm book:epub` | EPUB only |
| `pnpm book:collect` | Assembles `build/book.md` without typesetting it. Catches ordering and front-matter breakage cheaply |
| `pnpm plan:next` | The next unchecked plan item, its "Done when", and which model to use |
| `pnpm plan:check` | Verifies the plan's three progress counters still agree |
| `pnpm frontmatter` | Stamps YAML front matter across the manuscript (improvement #3) |

> **`lint:docs` gates on `.lint-baseline.json`, not zero.** Most of this repository predates the standard,
> so a hard zero would sit red for months and train everyone to ignore it. A count that goes **up** fails
> the build; a count that goes down should be committed as the new, lower ceiling.

### How the build works

`scripts/lib/book.ts` is the single model of what counts as a chapter — exclusions, the part mapping, the
front-matter reader, reading order. The build and the linter both import it, so they cannot disagree.
Anything new that walks the manuscript should import it too.

Reading order comes from front matter `part` + `chapter`, falling back to the directory prefix for files
that have not been stamped yet. [`Archive/`](./Archive/README.md) is skipped by everything.

CI ([`.github/workflows/lint-docs.yml`](./.github/workflows/lint-docs.yml)) runs `lint:docs`,
`plan:check` and `book:collect` on every push and pull request.

---

## The Nine Parts

Scope, reason and line budget for each are locked in [`BOOK-SPEC.md`](./BOOK-SPEC.md) § 4. 🆕 marks a
part that does not exist in the repository yet.

| Part | Covers | Budget | Where it lives today |
| ---- | ------ | ------ | -------------------- |
| **I — Foundations** | JavaScript semantics · TypeScript · OOP and design patterns | 5,000 | [`Frontend/JavaScript`](./Frontend/JavaScript/), [`Frontend/TypeScript`](./Frontend/TypeScript/), [`OOP`](./OOP/README.md) |
| **II — The Browser Platform** | HTML and CSS · Browser APIs · Accessibility · i18n · PWA | 6,000 | [`Frontend/HtmlCss`](./Frontend/HtmlCss/README.md), [`Frontend/BrowserAPIs`](./Frontend/BrowserAPIs/), [`Frontend/PWA`](./Frontend/PWA/README.md) |
| **III — The Modern Frontend Stack** 🆕 | React · Next.js · Svelte · Rendering · State · Tooling | **12,000** | **Nothing yet.** Planned as `Frontend/ModernStack/` |
| **IV — Frontend at Scale** | Architecture · Web performance · Frontend security · Testing | 5,500 | [`Frontend/WebPerformance`](./Frontend/WebPerformance/), [`Frontend/Security`](./Frontend/Security/), [`Frontend/Testing`](./Frontend/Testing/) |
| **V — Backend for Frontend Engineers** | Node internals · API design · SQL and NoSQL · Auth | 6,500 | [`Backend`](./Backend/README.md) |
| **VI — System Design** | Fundamentals · Building blocks · Frontend SD · Case studies | 6,500 | [`SystemDesign`](./SystemDesign/README.md) |
| **VII — AI Engineering** 🆕 | LLM foundations · Integration · RAG · Agents · Evals · AI UX | 7,500 | **Nothing yet.** Planned as `AI/` |
| **VIII — Ship and Operate** | Git · Containers · CI/CD · Observability · Cloud · Deployment | 3,500 | [`ShipAndOperate`](./ShipAndOperate/) — `Deployment/` still to be written |
| **IX — The Human Layer** | Behavioural · Communication · Ways of working · The AI-era loop | 2,500 | [`Behavioral`](./Behavioral/README.md), [`Communication`](./Communication/README.md) |
| *Appendix — DSA* | 16 LeetCode patterns | *5,600* | [`DSA`](./DSA/README.md) — ships as a companion volume |

**Total: ~249 chapters, 55,000 lines.** Budgets are ceilings, not allocations — a part that comes in
under does not hand its surplus to another.

### The two holes in the hull

These are the reason the book is worth writing, and they are both empty:

- **There is no React, Next.js or Svelte content.** Part III is the largest part in the book at 22% of
  the budget, and the part most readers are buying it for. Planned as improvements #32–43.
- **There is no AI content.** `DevOps/GenAI/` is about *using* AI tools for DevOps chores, not about
  *building* AI features, which is what a 2027 senior loop asks about. Planned as #44–53.

`Frontend/README.md` links to `./React/` and `./NextJs/`; both 404. `Backend/README.md` promises
Express and NestJS; neither exists. Do not assume a directory exists because a README references it.

---

## Who It Is For

A developer with **3–8 years' experience** targeting a senior or staff **frontend-heavy full stack**
role — someone who owns the frontend end to end and is expected to be credible on the backend, the
system design round, and now the AI feature, without pretending to be a specialist in any of them.

It assumes you can already write JavaScript and use a framework. It does not stop to explain what a
hook is. What it explains is the layer underneath the definition — because an assistant can answer the
surface version of every one of these questions instantly, and that is precisely why the interview bar
moved.

---

## How to Read It

The book has to work three ways. The front matter written at improvement #72 makes these explicit.

| Path | Route | For |
| ---- | ----- | --- |
| **Interview sprint** (6 weeks) | Part I → III → VI → IX, then the Appendix | A loop starting in a month |
| **Working reference** | Any chapter, cold, via the index | Tuesday afternoon |
| **Cover to cover** | I → IX in order | Levelling up deliberately |

The working-reference path is the demanding one. It is why every chapter has to stand alone without
the two before it, and why cross-references are anchors rather than "as we saw earlier".

---

## Repository Layout

```text
├── BOOK-SPEC.md         the contract — nine parts, budgets, twelve non-negotiables
├── IMPROVEMENT-PLAN.md  the 78-item route from repository to manuscript
├── REFERENCE-CHAPTER.md pointer at the worked example of the standard
├── Frontend/            Parts I, II and IV
├── Backend/             Part V
├── SystemDesign/        Part VI
├── ShipAndOperate/      Part VIII — what survived the #20 cut
├── DevOps/              only Agile/ (→ #25) and GenAI/ (→ #21) are left
├── OOP/                 merges into Backend/DesignPatterns at #26
├── Behavioral/          Part IX
├── Communication/       Part IX
├── DSA/                 the companion volume
├── Archive/             out of scope, never deleted
└── scripts/             the build, the linter, the plan tooling
```

[`Backend/API/01-rest-best-practices.md`](./Backend/API/01-rest-best-practices.md) is the **reference
chapter** — currently the only file passing the standard with zero violations.

---

## Contributing to the Manuscript

1. **Read [`BOOK-SPEC.md`](./BOOK-SPEC.md) first.** If a topic is on the out-of-scope list, it was
   archived deliberately. It is not missing.
2. **Start from `.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md`**, not from a blank file. The
   Book Chapter Standard — six blocks, TypeScript-only fences, 150–400 lines, `#ch-slug`
   cross-references — is mandatory.
3. **Use [`REFERENCE-CHAPTER.md`](./REFERENCE-CHAPTER.md)** as the worked example when the written
   standard and your instinct disagree.
4. **Run `pnpm lint:docs`** before you call anything done.

Say _"continue"_ with [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) attached to pick up the next item.

---

© Salman Rahman. All rights reserved. The manuscript in this repository is not licensed for
redistribution.
