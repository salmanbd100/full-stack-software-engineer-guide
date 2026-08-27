# The Senior Full Stack Handbook

**Frontend-Heavy — Fundamentals, Modern Stack, System Design and AI Engineering for 2027**

This repository is the **manuscript** for a book. It began as a personal interview-prep collection and is
being restructured, chapter by chapter, into something that can be bound and printed.

It is still useful as a knowledge base while that happens — but treat every directory as work in progress,
not as a finished reference.

| | |
| --- | --- |
| **Progress** | 6 of 78 improvements · [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) |
| **Scope** | Locked in [`BOOK-SPEC.md`](./BOOK-SPEC.md) — nine parts, line budgets, twelve non-negotiables |
| **Current size** | 417 files · ~134,000 lines · builds to a 3,694-page PDF |
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
| `pnpm lint:docs` | Checks all 417 files against the Book Chapter Standard — front matter, broken links, code fences, chapter length, missing READMEs, heading jumps. **Run this before calling any file done** |
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

## Repository Structure

### [Frontend](./Frontend/README.md)

JavaScript, TypeScript, HTML/CSS, Browser APIs, PWA, i18n, CSS architecture, security, testing,
web performance.

> ⚠️ **There is no React, Next.js or Svelte content yet.** `Frontend/README.md` links to `./React/` and
> `./NextJs/`; both 404. `Frontend/ModernStack/` is planned as improvements #32–43 and is the biggest gap
> in the book.

### [Backend](./Backend/README.md)

Node.js internals, API design (REST, GraphQL, versioning, rate limiting, WebSockets), SQL and NoSQL,
auth and security, design patterns, testing.

> ⚠️ `Backend/README.md` promises Express and NestJS sections. Neither exists yet.

[`Backend/API/01-rest-best-practices.md`](./Backend/API/01-rest-best-practices.md) is the **reference
chapter** — the only file currently passing the standard with zero violations. See
[`REFERENCE-CHAPTER.md`](./REFERENCE-CHAPTER.md).

### [Data Structures & Algorithms](./DSA/README.md)

16 LeetCode patterns plus a complexity primer. Ships as a **companion volume**, not inside the main book.

Array and string patterns (prefix sum, two pointers, sliding window) · linked list patterns (fast/slow
pointers, reversal) · tree and graph traversal (DFS, BFS) · backtracking, dynamic programming, graph
algorithms.

### [System Design](./SystemDesign/README.md)

Fundamentals (scalability, CAP, load balancing), building blocks, frontend system design, and 20
real-world case studies.

### [DevOps](./DevOps/README.md) → becoming `ShipAndOperate/`

Currently 30% of the repository and around 8% of the book's value. Improvement #20 cuts it from 147 files
to roughly 25 — Git, Docker, CI/CD, observability, deployment. Terraform, Linux administration,
Kubernetes operations and deep AWS move to `Archive/`, not the bin.

### [OOP](./OOP/README.md)

SOLID and design patterns. Merges into `Backend/DesignPatterns/` at improvement #26.

### [Behavioral](./Behavioral/README.md) · [Communication](./Communication/README.md)

STAR-framework stories, leadership and conflict scenarios, technical communication, and written
documentation. Become Part IX, *The Human Layer*.

### Not yet written

`AI/` does not exist. For a 2027 book this is the second-biggest gap after the modern frontend stack —
building *with* models, not training them. Planned as improvements #44–53.

---

## Contributing to the Manuscript

1. **Read [`BOOK-SPEC.md`](./BOOK-SPEC.md) first.** If a topic is on the out-of-scope list, it is archived
   deliberately, not missing
2. **Start from `.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md`**, not from a blank file. The Book
   Chapter Standard — six blocks, TypeScript-only fences, 150–400 lines, `#ch-slug` cross-references — is
   mandatory
3. **Use [`REFERENCE-CHAPTER.md`](./REFERENCE-CHAPTER.md)** as the worked example when the written
   standard and your instinct disagree
4. **Run `pnpm lint:docs`** before you call anything done

Say _"continue"_ with [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) attached to pick up the next item.

---

## Career Readiness Checklist

### Technical

- [ ] Complete 100+ LeetCode problems across all patterns
- [ ] Master your primary stack (React/Next.js or Node.js/NestJS)
- [ ] Design 10+ systems from scratch
- [ ] Build 3–5 portfolio projects showcasing skills
- [ ] Understand production deployment

### Behavioural

- [ ] Develop 15+ STAR stories (leadership, challenges, conflicts)
- [ ] Prepare company-specific examples
- [ ] Practise 2–3 minute story delivery
- [ ] Record and review responses
- [ ] Prepare questions to ask interviewers

### Communication

- [ ] Practise technical explanations, recorded
- [ ] Achieve B2–C1 English proficiency
- [ ] Complete 10+ practice sessions
- [ ] Master whiteboard and virtual presentation
- [ ] Develop a clear, concise speaking style

### Professional

- [ ] Update CV, tailored to target companies
- [ ] Polish LinkedIn profile
- [ ] Update portfolio site ([salmanrahman.com](https://www.salmanrahman.com/))
- [ ] Research target companies thoroughly
- [ ] Test video and audio setup, and prepare a quiet space

---

## Resources

**Practice:** LeetCode · Frontend Mentor · Pramp / Interviewing.io · iTalki / Cambly

**Watch:** Gaurav Sen (system design) · Web Dev Simplified (frontend) · Clément Mihailescu (career)

**Listen:** Syntax.fm · JavaScript Jabber · Software Engineering Daily · The Changelog

**Read:** [System Design Primer](https://github.com/donnemartin/system-design-primer) ·
[Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/)

---

**Salman Rahman** — [www.salmanrahman.com](https://www.salmanrahman.com/)

© Salman Rahman. All rights reserved. The manuscript in this repository is not licensed for
redistribution.
