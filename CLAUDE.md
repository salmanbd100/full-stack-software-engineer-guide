# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

The manuscript for **The Senior Full Stack Handbook** — a 2027 book for senior/staff, frontend-heavy full
stack roles. It began as a personal interview-prep collection and is being restructured into a book.

Two files govern the work. Read them before any substantial change:

| File                    | Role                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **`BOOK-SPEC.md`**      | The locked contract — nine parts, line budgets, out-of-scope list, twelve non-negotiables. **The authority.** If a request contradicts it, say so |
| **`IMPROVEMENT-PLAN.md`** | 89 numbered items (#31a–#31e carry letters), done one at a time. **Its "How to Resume" section at the top is the operating protocol — read it first.** _"continue"_ means: find the first unchecked `- [ ]`, do that one item, verify it against its "Done when", tick the box, update both counters, stop |

## Writing or Editing Documentation

**Invoke the `write-topic-docs` skill first** — always, for any markdown in this repo. It carries the
mandatory **Book Chapter Standard** (the six blocks, cross-reference syntax, callout vocabulary, diagram
rule) and `CHAPTER-TEMPLATE.md` to copy from. Never write topic content from default style.

Rules it enforces, worth knowing up front:

- **TypeScript only** in code fences
- **150–400 lines** per chapter, target ~220
- Cross-references are `[Chapter N — Title](#ch-slug)`, **never relative file paths** — those break in PDF and EPUB
- Callouts limited to 💡 🔑 ⚠️ ✅ ❌

Most existing files predate this standard. Editing one means bringing it up to standard, not patching around it.

## Before Writing a New Chapter

Check `BOOK-SPEC.md` § 6. If the topic is out of scope — Terraform, Linux administration, shell or Python
scripting, Kubernetes operations, deep AWS, FinOps, model training, mobile, Vue or Angular — **say so and
stop.** Those are archived deliberately, not missing.

## Repository Structure

```
├── BOOK-SPEC.md         # the contract — read first
├── IMPROVEMENT-PLAN.md  # the 89-item route from repo to manuscript
├── Frontend/            # JavaScript, TypeScript, HTML/CSS, BrowserAPIs, PWA, i18n,
│                        #   CSSArchitecture, Security, Testing, WebPerformance
├── Backend/             # Node.js, SQL, NoSQL, API, Security, Testing — plus DesignPatterns (Part I)
├── DSA/                 # 16 LeetCode patterns (appendix / companion volume)
├── SystemDesign/        # fundamentals, building blocks, frontend SD, 20 case studies
├── ShipAndOperate/      # Part VIII — Git, Containers, CI/CD, Observability, Cloud, Deployment
├── Behavioral/  Communication/
├── site/                # the free VitePress companion — generated, see below
└── scripts/             # book tooling
```

## What Does Not Exist Yet

The biggest gap: **there is no React, Next.js, Svelte or AI content at all.** `Frontend/README.md` links
to `./React/README.md` and `./NextJs/README.md` — both 404. `Backend/README.md` promises Express and
NestJS; neither exists.

Planned: `Frontend/ModernStack/` (items #32–43) and `AI/` (items #44–53). Do not assume a directory
exists because a README references it.

## Scripts

`scripts/` holds Node TypeScript that runs with no build step. Use the `pnpm` scripts:

```bash
pnpm lint:docs        # the Book Chapter Standard, all eleven rules — run this before calling a file done
pnpm lint:docs --rule=broken-link   # every occurrence of one rule
pnpm book:build       # PDF + EPUB into build/  (needs: brew install pandoc tectonic)
pnpm book:specimen    # scripts/specimen.md alone — the whole print design on two pages
pnpm plan:next        # the next unchecked plan item, its "Done when", its model
pnpm plan:check       # verify the plan's three counters still agree
pnpm index:questions  # regenerate Interview-Question-Index.md from every chapter's Q block
pnpm index:check      # fail if that index is stale — run after editing any Interview Questions
pnpm check:code-samples             # compile every TypeScript fence
pnpm check:code-samples --code=TS2304   # every occurrence of one diagnostic
pnpm site:dev         # the free VitePress companion, generated from the manuscript
pnpm site:build       # static build into site/.vitepress/dist
```

**The companion site is generated, never hand-edited.** `scripts/build-site.ts` writes
`site/book/**` and `site/.vitepress/sidebar.json` from the same `loadBook` the PDF build uses; both
are gitignored, and `site/` is in `EXCLUDED_DIRS` so the generated copies never count against a
part's budget. Only `site/index.md` and `site/.vitepress/config.ts` are written by hand. What the
site publishes — front matter, all back matter, every index page, and one sample chapter per part
named in `SAMPLE_CHAPTERS` — is BOOK-SPEC decision #17, not a technical detail.

**`Interview-Question-Index.md` is generated, never hand-edited.** It is 988 questions read out of
every chapter's `## Interview Questions` block. Change a question in a chapter and the index is stale
until `pnpm index:questions` runs; `index:check` is what catches it.

`scripts/lib/book.ts` is the shared model of what counts as a chapter — the build and the lint both
import it, so they cannot disagree. Anything new that walks the manuscript should import it too.

**The print design is five files in `scripts/tex/` plus one Lua filter.** `tokens.tex` holds every
tunable value and is the only one calibration edits; `typography.tex`, `glyphs.tex`, `structure.tex`
and `blocks.tex` read it. `scripts/lua/callouts.lua` (#81) maps the Book Chapter Standard's own
shapes — `## 💡 …`, `## 🔑 …`, `> ⚠️ …`, `**In this chapter:**`, the bold label above a fence,
every table — onto those environments, so **the design never asks a chapter to change**. It runs for
the PDF only. Check a change with `pnpm book:specimen` (two pages, seconds) before `book:pdf`
(1,500 pages, minutes).

**There is still no test suite.** What there is, since #75, is `pnpm check:code-samples`: it extracts
all 787 TypeScript fences and runs the real compiler over them, in two gates. **Syntax is hard at
zero** — a fence that does not parse fails the build, and a `typescript` fence holding JSX counts as
not parsing, because the label drives the syntax highlighting in the PDF. **Types are baselined**
against `.code-samples-baseline.json`, because fences are excerpts: they are compiled per chapter, in
reading order, and what is left is mostly a name the prose introduced two fences earlier. Every
import resolves to `any` through a wildcard ambient module, so this proves the samples parse and hang
together — **it does not prove they match any library's current API.** CI
(`.github/workflows/lint-docs.yml`) runs `lint:docs`, `number:chapters --check`, `index:check`,
`check:code-samples`, `site:pages`, `plan:check` and `book:collect`, nothing else.

`lint:docs` gates on **`.lint-baseline.json`, not zero** — most of the repo predates the standard. A
count that goes up fails; a count that goes down should be committed as the new baseline.
`check:code-samples` uses the same ratchet, with its own baseline file.

## Library / Framework Lookups

Use the **Context7 MCP** (`mcp__context7__resolve-library-id`, then `mcp__context7__query-docs`) before
writing about any library, framework, SDK, or cloud service. **Mandatory** for `Frontend/ModernStack/`
and `AI/` — the two fastest-moving parts of the book.

Skip it for general programming concepts (closures, recursion, algorithm patterns).

## Searching the Repository

1. **READMEs are the domain indexes** — 10 directories still lack one (item #13)
2. **Files are numbered sequentially** (`01-`, `02-`)
3. **Expect duplication until Phase 2 lands** — security is documented in five places, load balancing and
   caching in three each. Check whether a topic already exists elsewhere before writing it
