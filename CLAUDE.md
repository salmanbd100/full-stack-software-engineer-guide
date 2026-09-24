# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

The manuscript for **The Senior Full Stack Handbook** — a 2027 book for senior/staff, frontend-heavy full
stack roles. It began as a personal interview-prep collection and is being restructured into a book.

Two files govern the work. Read them before any substantial change:

| File                    | Role                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **`BOOK-SPEC.md`**      | The locked contract — nine parts, line budgets, out-of-scope list, twelve non-negotiables. **The authority.** If a request contradicts it, say so |
| **`IMPROVEMENT-PLAN.md`** | **Phase 9 — items #95–#116**, done one at a time: cut the book from 1,370 pages to ~940, rewrite the prose in simple English, and finish the edition (softer ink, named build files, a back cover). **Its "How to Resume" section at the top is the operating protocol — read it first.** _"continue"_ means: find the first unchecked `- [ ]`, do that one item, verify it against its "Done when", tick the box, update both counters, stop. Phases 0–8 are finished and archived in `Archive/planning/improvement-plan-phases-0-8.md` |

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
├── IMPROVEMENT-PLAN.md  # the live plan — Phase 9, cut the book and simplify the English
├── Frontend/            # JavaScript, TypeScript, HTML/CSS, BrowserAPIs, PWA, i18n,
│                        #   CSSArchitecture, Security, Testing, WebPerformance
├── Backend/             # Node.js, SQL, NoSQL, API, Security, Testing — plus DesignPatterns (Part I)
├── DSA/                 # 16 LeetCode patterns — Book 2, its own volume (`pnpm book:companion`)
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
pnpm book:build       # PDF + EPUB into build/
                      #   needs: brew install pandoc tectonic
                      #   and:   pnpm add -g @mermaid-js/mermaid-cli   (diagrams, #82)
                      #   and:   brew install epubcheck   (EPUB validation, #83)
pnpm book:specimen    # scripts/specimen.md alone — the whole print design, in seconds
pnpm book:pages       # pages per part, measured off the built PDF (#77)
pnpm plan:next        # the next unchecked plan item, its "Done when", its model
pnpm plan:check       # verify the plan's counters still agree with its checkboxes
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

**`Interview-Question-Index.md` and `DSA-Question-Index.md` are generated, never hand-edited.** One
index per volume (#95a): the handbook's 937 questions, and Book 2's 87, read out of every chapter's
`## Interview Questions` block. `volumeOf` in `scripts/lib/book.ts` decides which is which — Book 2's
index is `part: 0` back matter tagged `companion`. Change a question in a chapter and its index is stale
until `pnpm index:questions` runs; `index:check` catches either one. `lint:docs` has a matching
`cross-volume-xref` rule: a cross-reference must resolve inside its own volume, except one that names
the other volume by its part opener.

`scripts/lib/book.ts` is the shared model of what counts as a chapter — the build and the lint both
import it, so they cannot disagree. Anything new that walks the manuscript should import it too.

**The print design is five files in `scripts/tex/`, four Lua filters and one pandoc defaults
file.** `tokens.tex` holds every tunable value and is the only one calibration edits;
`typography.tex`, `glyphs.tex`, `structure.tex` and `blocks.tex` read it. `scripts/book-pdf.yaml`
(#82) is the whole PDF invocation as data — engine, includes, filters, highlight style, variables —
and its relative paths resolve against the **working directory**, which is why `build-book.sh` must
`cd` to the repo root first. The filters map the Book Chapter Standard's own shapes onto the
design, so **the design never asks a chapter to change**:

| Filter | Reads | Emits |
| ------ | ----- | ----- |
| `lua/xref.lua` (#82) | `[Chapter ?? — Title](#ch-slug)` | `Chapter N — Title (p. P)` in print, a filled-in anchor in EPUB |
| `lua/callouts.lua` (#81) | the shapes `callout-shapes.lua` names, plus every table | the block library in `blocks.tex` — print only |
| `lua/epub-blocks.lua` (#83) | the same shapes | divs with class names, styled by `scripts/epub.css` — EPUB only |
| `lua/mermaid.lua` (#82) | every ` ```mermaid ` fence | a vector PDF for print, an SVG for EPUB, the fence untouched for the site |

**`lua/callout-shapes.lua` (#83) is the shared classifier**, and it emits nothing: `## 💡 …`,
`## 🔑 …`, `> ⚠️ …`, `**In this chapter:**` and the bold label above a fence are named there once,
and the two back-ends decide what to do with them. It is the same arrangement as
`scripts/lib/book.ts` — **a gotcha cannot be a callout in the PDF and a plain blockquote in the
EPUB**, because only one file decides what a gotcha is. It is `require`d by path relative to the
working directory, which is one more reason `build-book.sh` must `cd` to the repo root.

🔴 **That order is load-bearing.** `callouts.lua` renders tables to LaTeX source, and 674 of the
1,662 cross-references live in the chapter tables of section indexes — so `xref.lua` has to go
first. `mermaid.lua` has to go last, because the block filter for each format needs one Mermaid
fence to still be a code block to find the label above it.

`mermaid.lua` needs **mermaid-cli** (`pnpm add -g @mermaid-js/mermaid-cli`), checked in the
build's preflight. It renders each diagram two to four times, measuring and correcting the font size
until the labels land on `\tokDiagramLabelSize` once the figure is shrunk to the measure, then
caches by content hash in `build/diagrams/` — so a cold build costs minutes and the next one costs
nothing.

Check a change with `pnpm book:specimen` (ten pages, seconds) before `book:pdf` (1,500 pages,
minutes). Both report missing glyphs and unresolved cross-references at the end; **silence there is
the failure mode**, so the counts are printed rather than left in the log.

**The EPUB is the same design in CSS, and it is validated rather than eyeballed.**
`scripts/epub.css` (#83) ports the print type scale and the three callout structures; it replaces
pandoc's default stylesheet wholesale, because `--css` substitutes rather than adds. `pnpm
book:epub` runs **epubcheck** over the result and prints the verdict — not in the preflight, since
the EPUB builds correctly without a JVM and a validator that blocks the build is one people route
around. It is worth having: its first run found 88 of the 96 diagrams shipping invalid XHTML inside
`<foreignObject>`, which nothing in the repository had noticed since #82.

**`pnpm test` is the script test suite (#94)** — 30 tests over `scripts/lib/book.ts` and over the rule
scripts' CLI behaviour, on Node's own runner with no new dependency. Alongside it, since #75, is
`pnpm check:code-samples`: it extracts
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

1. **READMEs are the domain indexes** — every content directory has one since #13; `lint:docs` fails if one goes missing
2. **Files are numbered sequentially** (`01-`, `02-`)
3. **Expect duplication until Phase 2 lands** — security is documented in five places, load balancing and
   caching in three each. Check whether a topic already exists elsewhere before writing it
