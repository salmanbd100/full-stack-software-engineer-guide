# Improvement Plan — Road to the 2027 Book

> **Purpose:** turn this repository from a personal interview-prep dump into the manuscript for
> **_The Senior Full Stack Handbook — Frontend-Heavy, 2027 Edition_**.
>
> **This file is not part of the book.** It lives in the repo and is excluded from the book build.

---

## ▶️ How to Resume — read this first, every session

Attach this file and say **"continue"**. That is the whole instruction. On receiving it, Claude must:

| # | Step | Detail |
| - | ---- | ------ |
| 1 | **Find the first unchecked item** | Scan top to bottom for the first `- [ ]`. That is the next job — not a later item that looks easier or more interesting |
| 2 | **Check the ordering notes** | Some items carry a 🔴 ordering constraint (see #3 → before #20). Honour it. If the next unchecked item is blocked, say which one must go first and stop |
| 3 | **Read the item in full** | Every item has a **"Done when"** line. That is the acceptance test, not a suggestion |
| 4 | **Do exactly that one item** | Not the next one too. Not a related tidy-up. One item per session unless told otherwise |
| 5 | **Verify against "Done when"** | Run the check. If there is nothing runnable, say so plainly rather than implying it passed |
| 6 | **Mark it complete** | `- [ ]` → `- [x]`, append ` — ✅ **done YYYY-MM-DD**` to the heading, and add a short **Delivered:** block listing what actually shipped and anything deliberately left |
| 7 | **Update both counters** | The **Phase Map** row and the **Progress Tracker** table at the bottom, plus `Progress: N / 78` in the header |
| 8 | **Report** | What was done, what was verified, and what was left. Then stop |

**Marking an item done is part of the item.** An item is not finished until steps 6 and 7 are done —
otherwise the next session starts from the wrong place.

If an item turns out to be wrong, blocked, or already handled, **say so and amend the item** rather than
silently skipping it or doing something adjacent. Corrections to this plan are expected — two have already
happened (the budget arithmetic in #1, the frontend-share rule).

> **Also fine:** _"do improvement #23"_ to jump to a specific item, and _"skip #23"_ to move past one.
> Both override the first-unchecked rule.

**Last updated:** 2026-08-26 · **Progress:** 2 / 78
**Owner:** Salman Rahman
**Locked spec:** [BOOK-SPEC.md](./BOOK-SPEC.md) — the authority on scope, budget, and non-negotiables.

---

## 🔌 Tooling — what is installed, what is needed, when

**No new MCP server is needed for this book.** Adding servers costs context on every turn and buys
almost nothing for a markdown manuscript. The one that matters is already configured.

| Tool | Status | Used for |
| ---- | ------ | -------- |
| **Context7 MCP** | ✅ configured (`.mcp.json`) | Current library docs. **Mandatory** for Parts III and VII — training data on React, Next.js and AI SDKs goes stale fast |
| **`write-topic-docs` skill** | ✅ in repo | The Book Chapter Standard. Invoke before writing any markdown |
| **`continue-plan` skill** | ✅ in repo | Runs the resume protocol above. Say _"continue"_ |
| **Vercel plugin skills** | ✅ installed, ✅ **wired in** | Bound to their destination directories inside `write-topic-docs` |
| **Node 22.22** | ✅ | Runs `scripts/*.ts` directly via `--experimental-strip-types` |

### Repo scripts

| Script | Does |
| ------ | ---- |
| `scripts/plan-status.ts` | `--next` prints the next unchecked item, its "Done when" and its ordering constraints. `--check` verifies the three counters still agree with the checkboxes |
| `scripts/add-frontmatter.ts` | Item #3 — stamps front matter on every content file |

### Vercel plugin skills — now bound by directory

`write-topic-docs` maps each of these to the directory that needs it, so a session writing a Next.js
chapter pulls the right one automatically. Use them **alongside** Context7 — they carry platform
judgement the reference docs do not — but lead with the concept and strip the vendor register
(`BOOK-SPEC.md` non-negotiables #4 and #9):

| Skill | Items it serves |
| ----- | --------------- |
| `vercel:nextjs` · `vercel:next-cache-components` | #36–37 — App Router, caching, PPR |
| `vercel:ai-sdk` · `vercel:ai-gateway` | #46 — streaming, tool calling, MCP, multi-provider |
| `vercel:react-best-practices` | #33–35, #65 |
| `vercel:turbopack` | #41 — bundlers |
| `vercel:microfrontends` | #55 — micro-frontend architecture |
| `vercel:vercel-functions` · `vercel:cdn-caching` | #39 — edge vs origin rendering |

### Model per item

Two models, split by whether the item needs judgement or just careful repetition. Sonnet 5 is $2/$10
per Mtok against Opus 5's $5/$25 — **2.5× cheaper on both** — with the same 1M context, so the sweeps
that touch hundreds of files are where the saving actually lands.

| Items | Model | Effort | Why |
| ----- | ----- | ------ | --- |
| 1–2, 4–5, 13, 17–18, 20, 22–24, 26–29, 31–65, 69, 72–73, 76, 78 | **Opus 5** `claude-opus-5` | `high`–`xhigh` | Judgement and prose. Every new chapter (#32–65), every merge decision, everything with a voice |
| 3, 6–12, 14–16, 19, 21, 25, 30, 66–68, 70–71, 74–75, 77 | **Sonnet 5** `claude-sonnet-5` | `low`–`medium` | The decision is already written in the item; the work is applying it hundreds of times without drifting |

**The four that matter most for cost** — #10 (415 fence conversions), #12 (chapter openings across
every file), #71 (every cross-reference), #74 (ASCII → Mermaid). Between them they touch more files
than the rest of the plan combined. Running those on Opus is the largest avoidable spend here.

**Effort is the bigger lever than model.** Claude Code defaults to `xhigh`; the mechanical items have
nothing to reason about, so `/effort low` cuts spend with no quality loss. Keep `xhigh` for #32–65
and #76, where the output is what a reader actually pays for.

**Not worth it for this work:** Fable 5 ($10/$50 — its edge is long-horizon autonomous work, not book
prose), Haiku 4.5 (200K context is too small to hold enough of this repo safely), and fast mode
(`/fast`, Opus 5 only — buys wall-clock at premium price, the wrong trade on a usage-limited plan).

### Needed later — system installs, not MCP

Nothing below is needed yet. Install at **item #5**, not before — it is ~250 MB and three items away.

```bash
brew install pandoc tectonic          # PDF/EPUB build; tectonic beats MacTeX (250MB vs 4GB, no config)
pnpm add -g @mermaid-js/mermaid-cli   # renders Mermaid to images for print (item #74)
```

`@types/node` is also worth adding once a `package.json` exists (#5) — the scripts run correctly today
but do not typecheck, since nothing provides Node's types.

---

## 📊 Where the Repository Stands Today

| Domain            | Files | Lines      | Verdict for the book                                   |
| ----------------- | ----- | ---------- | ------------------------------------------------------ |
| **Frontend**      | 80    | 29,765     | ⚠️ Strong base, but **no React / Next / Svelte at all** |
| **Backend**       | 53    | 14,506     | ✅ Good depth, missing Express/NestJS/edge runtime      |
| **DSA**           | 17    | 19,115     | ⚠️ Excellent content, 3–5× too long per file            |
| **SystemDesign**  | 94    | 21,903     | ⚠️ Heavy internal duplication                           |
| **DevOps**        | 147   | 39,703     | 🔴 **30% of the repo, ~8% of the book's value**         |
| **OOP**           | 8     | 4,662      | ⚠️ Overlaps Backend/DesignPatterns                      |
| **Behavioral**    | 9     | 2,317      | ⚠️ Numbering gaps, thin                                 |
| **Communication** | 9     | 1,918      | ⚠️ Partly personal notes, not book material             |
| **AI**            | 0     | 0          | 🔴 **Does not exist — the single biggest 2027 gap**     |
| **TOTAL**         | 421   | ~134,000   | ≈ 2,400 print pages. Target: **~55,000 lines**          |

### The Five Findings That Matter Most

1. 🔴 **There is no React, Next.js, or Svelte content.** `Frontend/README.md` links to `./React/README.md`
   and `./NextJs/README.md` — both are **404**. For a frontend-heavy senior book this is the hole in the hull.
2. 🔴 **There is no AI content.** `DevOps/GenAI/` (8 files) is about _using_ AI tools for DevOps chores.
   It is not about _building_ AI features, which is what 2027 interviews and 2027 readers want.
3. 🔴 **DevOps is 30% of the repository.** Terraform (4,647 lines), Linux (2,930), Scripting (2,287),
   AWS (15 files), Networking (8), Kubernetes (10). A frontend-heavy full stack engineer needs
   Git + Docker + CI/CD + observability + deploy. The rest is a different book.
4. ⚠️ **Style is not consistent enough to bind.** Six different chapter-opening conventions, 415 `​```javascript`
   fences against a TypeScript-only rule, 32 broken internal links, 10 directories with no README.
5. ⚠️ **Heavy duplication.** Load balancing appears in 3 places, caching in 3, CDN in 3, security in 5.
   A reader who buys a book and reads the same page three times asks for a refund.

---

## 🎯 The Book Specification (decide this first, everything else follows)

**Title:** _The Senior Full Stack Handbook — Frontend-Heavy_
**Subtitle:** _Fundamentals, modern stack, system design, and AI engineering for 2027_
**Reader:** engineer with 3–8 years' experience, targeting senior/staff frontend or full stack roles at MNCs.
**Promise:** every chapter answers _why it exists, when to reach for it, what the tradeoff is_ — and gives the
interview-grade version of the answer.

### Target Structure

```
Part I     Foundations                JavaScript · TypeScript
Part II    The Browser Platform       HTML/CSS · Browser APIs · Accessibility · i18n · PWA
Part III   The Modern Frontend Stack  React · Next.js · Svelte · Rendering · State · Tooling   ← NEW
Part IV    Frontend at Scale          Architecture · Performance · Security · Testing
Part V     Backend for Frontend Eng.  Node · APIs · Data · Auth · Testing
Part VI    System Design              Fundamentals · Building blocks · Frontend SD · Case studies
Part VII   AI Engineering             Foundations · Integration · RAG · Agents · Production · AI UX  ← NEW
Part VIII  Ship & Operate             Git · Docker · CI/CD · Observability · Deployment
Part IX    The Human Layer            Behavioural · Communication · The AI-era interview loop
Appendix   DSA Patterns               (companion volume — 16 patterns)
```

**Budget:** ~55,000 lines in-book (≈ 900–1,000 print pages), with the DSA appendix shipping separately as a
companion. Everything else stays in the repo under `Archive/`, still useful to you, invisible to the book build.

> 📐 The authoritative per-part budget lives in [BOOK-SPEC.md § 5](./BOOK-SPEC.md). If the two files ever
> disagree, **the spec wins.**

---

## 🗺️ Phase Map

| Phase | Theme                         | Items   | Rough effort   | Model |
| ----- | ----------------------------- | ------- | -------------- | ----- |
| **0** | Decide & set the rails        | 1–7     | 3–4 sessions   | mixed — see per-item table |
| **1** | Hygiene & consistency         | 8–19    | 6–8 sessions   | **Sonnet 5** (Opus for 13, 17–18) |
| **2** | Restructure & prune           | 20–31   | 8–10 sessions  | **Opus 5** (Sonnet for 21, 25, 30) |
| **3** | 🆕 `Frontend/ModernStack/`    | 32–43   | 12–16 sessions | **Opus 5** throughout |
| **4** | 🆕 `AI/`                      | 44–53   | 10–14 sessions | **Opus 5** throughout |
| **5** | Fill the remaining gaps       | 54–63   | 8–12 sessions  | **Opus 5** throughout |
| **6** | 2027-proofing                 | 64–69   | 4–6 sessions   | mixed — Sonnet for 66–68 |
| **7** | Book assembly & publish       | 70–78   | 6–8 sessions   | mixed — Sonnet for the sweeps |

**Effort key:** `S` = one short session · `M` = one full session · `L` = split across 2–4 sessions.

**Model:** the authoritative per-item mapping is in [Tooling → Model per item](#model-per-item).
`scripts/plan-status.ts --next` reads it and tells you which model and effort to switch to.

---

# Phase 0 — Decide & Set the Rails

> Do not write a single new topic file until items 1–7 are done. Every page written before the
> template exists will have to be rewritten.

### - [x] 1. Lock the book specification `S` — ✅ **done 2026-08-26**

Write `BOOK-SPEC.md` at the repo root recording: title, subtitle, reader profile, promise, the nine-part
structure above, the line budget, and what is explicitly **out of scope** (deep AWS, Terraform, K8s ops,
Python, mobile). Every later decision gets checked against this file.

**Done when:** `BOOK-SPEC.md` exists and the nine parts are named and justified in one paragraph each.

**Delivered:** [BOOK-SPEC.md](./BOOK-SPEC.md) v1.0 — 11 sections covering identity, the promise and the
competitive gap, reader profile, all nine parts with budgets and senior signals, the budget summary,
out-of-scope list, 12 non-negotiables, three reading paths, 10 success criteria, an amendment procedure,
and a decision log.

> ⚠️ **Two things changed during this item — both corrections to this plan:**
>
> 1. **The budget was wrong.** The per-part rows above summed to 81,600 against a stated 45,000 total.
>    Rebuilt bottom-up from chapter counts: **55,000 lines for the book**, plus a 5,600-line DSA companion.
>    All tables in this file now match the spec.
> 2. **"Frontend-heavy" is now a measurable rule:** Parts I–IV ≥ 50% of the book, and Part III must remain
>    the single largest part. The earlier "Parts II–IV ≥ 55%" was not achievable with realistic chapter counts.

---

### - [x] 2. Extend the `write-topic-docs` skill into a book chapter standard `M` — ✅ **done 2026-08-26**

The current skill is a good style guide but was written for scattered notes, not a bound book. Add:

- **One chapter opening pattern** (currently there are six — see item 12)
- **Front matter block** (item 3)
- **Chapter close pattern:** Key Takeaways → Interview Questions → What to read next
- **Cross-reference syntax:** `→ See Chapter 12, "React Server Components"` rather than raw relative links
- **Callout vocabulary:** fix the set to 💡 ⚠️ ❌ ✅ 🔑 and forbid the rest
- **Diagram rule:** Mermaid for anything with more than three boxes, ASCII only for linear flows

**Done when:** `.claude/skills/write-topic-docs/SKILL.md` contains a "Book Chapter Standard" section and
one reference chapter is linked as the canonical example.

**Delivered:**

- `SKILL.md` § **📖 The Book Chapter Standard (MANDATORY)** — **The Six Blocks** (front matter → opening →
  body → Key Takeaways → Interview Questions → What to Read Next), each specified with rules and an example
- **Cross-reference mechanism settled:** every H1 carries `{#ch-<slug>}`; references are
  `[Chapter 14 — Title](#ch-slug)`. Renders as a link on the web and _"see page N"_ in print. Relative
  file paths are banned from chapter bodies
- **Callout vocabulary fixed** to 💡 🔑 ⚠️ ✅ ❌ with per-chapter budgets. Retired 🔴 ✨ and ten other
  decorative emoji; no emoji in headings beyond the two fixed ones
- **Diagram rule:** Mermaid above 3 nodes or any branch/cycle, ASCII only for linear ≤3-step flows,
  `flowchart` / `sequenceDiagram` / `stateDiagram-v2` only
- **Moving-target callout** specified, including the requirement to name the durable principle
- **Part-opener README standard** added — unblocks item #13
- **Quality checklist split** into blocking (lint-enforceable) and craft
- **"When Editing Existing Files" rewritten** — editing now means bringing a file up to standard, since
  every existing file predates it
- 🆕 [`CHAPTER-TEMPLATE.md`](./.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md) — copy-paste starting
  point with inline guidance comments
- Domain notes added for `Frontend/ModernStack/` and `AI/`; `DevOps/` note now states the out-of-scope list
- Fixed a real bug: the Context7 tool names in the skill were wrong
  (`mcp__plugin_context7_context7__*` → `mcp__context7__*`) and would have failed on call

> **Deliberately left dangling:** the link to `REFERENCE-CHAPTER.md`. That file is item #4's deliverable.

---

### - [ ] 3. Add YAML front matter to every topic file `M`

The book build needs machine-readable ordering and metadata. Standard block:

```yaml
---
title: React Server Components
part: 3
chapter: 14
slug: react-server-components
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-01
tags: [react, rsc, rendering, nextjs]
in_book: true
---
```

Write a script (`scripts/add-frontmatter.ts`) that adds the block with sensible defaults, then hand-correct
`part` / `chapter` / `level`. `in_book: false` is how content stays in the repo but out of the manuscript.

**Done when:** every `.md` outside `Archive/` and `.claude/` has valid front matter.

> ✅ **The script is written and committed** (`29933ad`). Item #3 is the act of *running* it.
> It was run once and the 418 resulting edits were discarded; the script itself was kept.

**To run it** — from the repo root, Node 22.6+ (this machine has v22.22.0):

```bash
node --experimental-strip-types scripts/add-frontmatter.ts --dry-run   # review, writes nothing
node --experimental-strip-types scripts/add-frontmatter.ts             # apply
```

Add `--list` to print the full per-file table. `--force` re-derives every key, discarding
hand-corrections — only needed after editing the script's mapping tables. Without it, re-running
preserves anything you edited by hand.

**Then verify** — these three checks are the whole review surface, since the diff is purely mechanical:

| Check | Command | Pass |
| --- | --- | --- |
| No content lost | `git diff --numstat \| awk '{s+=$2} END {print s+0}'` | `0` deletions |
| Newline fix works | `git diff --stat \| tail -1` | `5016` insertions (12/file). `5434` means it did not |
| Idempotent | run the script a second time | `changed: 0` |

`git checkout -- .` reverts cleanly if any check fails.

> ⚠️ **Unverified:** the script's idempotency fix (`scripts/add-frontmatter.ts:318`) is on disk but
> was never executed — an earlier version stripped one leading newline while re-adding two, so every
> re-run grew the gap by a line. The three checks above prove it either way.

**🔴 Ordering — run this _before_ #20:**

The script hardcodes **143 file paths** as they exist today, encoding the keep-or-archive decisions
from `BOOK-SPEC.md` § 6 and items #20–#31. Item #20 renames `DevOps/` → `ShipAndOperate/` and moves
files into `Archive/`. Run #3 *after* that and every path misses, so all 143 files silently default
to `in_book: true` and the decisions are lost.

Run #3 first and #20 becomes "move the files the metadata already marked" — easier, and checkable.

| Sequence | Why |
| --- | --- |
| **#8** → **#3** → **#6** → **#20** | #8 first is tidiness (4 fewer files to stamp), not a dependency. #6 and #70 need front matter to exist. #11 can run either side — both directory spellings normalise to the same slug |

**Two deviations to note when ticking this off:**

- `CLAUDE.md`, `BOOK-SPEC.md` and `IMPROVEMENT-PLAN.md` are excluded — repo tooling, not manuscript.
  The "done when" above says *every* `.md`; these three are the exception.
- `chapter:` is left at `0` for every file. Item #70 assigns the real numbers.

---

### - [ ] 4. Build the reference chapter `M`

Pick **one** existing strong file — `Backend/API/01-rest-best-practices.md` is the best-written file in the
repo — and rewrite it to the finished book standard from item 2. This becomes the template every other
chapter is measured against.

**Done when:** the file passes the item-2 standard end to end, and is linked from the skill as
`REFERENCE-CHAPTER.md`.

---

### - [ ] 5. Set up the book build pipeline `M`

Choose one and wire it up:

| Option        | Best for                          | Verdict                                       |
| ------------- | --------------------------------- | --------------------------------------------- |
| **Pandoc + LaTeX** | Real PDF/EPUB, full typography control | ✅ **Recommended** — best print output   |
| VitePress     | Web-first docs site                | Good companion site, weak PDF                 |
| Honkit/GitBook| Zero config                        | Fastest start, least control                  |

Recommended: **Pandoc** for the book (`scripts/build-book.sh` → PDF + EPUB), **VitePress** later for a free
web companion that markets the book. Order comes from front matter `part` + `chapter`.

**Done when:** `pnpm book:build` produces a PDF with a working table of contents from current content.

---

### - [ ] 6. Add a lint script for the standard `M`

`scripts/lint-docs.ts` fails CI on:

- Missing or invalid front matter
- Broken relative links
- Non-TypeScript code fences (allow-list: `bash`, `json`, `yaml`, `css`, `html`, `sql`, `mermaid`, `text`)
- Files over 400 lines with `in_book: true`
- Missing `README.md` in a content directory
- Heading level jumps (`##` → `####`)

**Done when:** `pnpm lint:docs` runs, reports the current violation count, and is wired into a GitHub Action.

---

### - [ ] 7. Create `Archive/` and the exclusion rule `S`

Make `Archive/` at the repo root with a `README.md` explaining it holds content that is useful reference but
out of the book. The build script skips it. Nothing is deleted in this plan — it is **moved**.

**Done when:** `Archive/README.md` exists and `scripts/build-book.sh` ignores the directory.

---

# Phase 1 — Hygiene & Consistency

### - [ ] 8. Remove planning artefacts from the content tree `S`

Move to `Archive/planning/`:

- `Frontend/CONTENT_PLAN.md` (590 lines — describes work already done)
- `Frontend/PROGRESS.md` (290 lines — claims React/NextJs READMEs exist; they do not)
- `SystemDesign/REFACTOR-PLAN.md` (456 lines — refactor is complete)
- `Frontend/WebPerformance/LINKEDIN-CAROUSEL.md` (251 lines — marketing asset, not a chapter)

**Done when:** no planning or marketing file sits inside a content directory.

---

### - [ ] 9. Fix all 32 broken internal links `M`

Confirmed broken (run the checker again before starting — the list moves):

| File                                          | Broken targets                                      |
| --------------------------------------------- | --------------------------------------------------- |
| `Frontend/README.md`                          | `./React/README.md`, `./NextJs/README.md`           |
| `DSA/04`–`DSA/10` (7 files)                   | Off-by-one prev/next links after renumbering        |
| `Frontend/Html&CSS/07`, `08`                  | `./03-semantic-html.md`, `./05-responsive.md`       |
| `SystemDesign/InterviewQuestions/16`–`20`     | 11 links to files that were merged away             |
| `SystemDesign/Microservices/01`, `08`         | `./README.md` (directory has none)                  |

The `Frontend/README.md` ones resolve themselves in Phase 3. Fix the rest now.

**Done when:** the link checker reports zero broken relative links.

---

### - [ ] 10. Convert the remaining 415 JavaScript fences to TypeScript `L`

Against a TypeScript-only rule. Distribution:

- `Frontend/JavaScript/` — 11 files (the bulk; expected, since it teaches JS — **decide explicitly**:
  recommendation is to keep plain-JS fences here only where the topic _is_ untyped JS semantics, mark them
  with an allow-list comment, and convert everything else)
- `Frontend/PWA/` — 7 files (convert all)
- `Backend/SQL/` — 2 files, `DevOps/Networking/` — 1 file (convert all)

Also normalise the 3 stray `​```ts`, 1 `​```jsx`, and 19 `​```tsx` fences (tsx is fine — keep it, add it to the
allow-list).

**Done when:** the lint script's fence check passes with a documented allow-list.

---

### - [ ] 11. Rename `Frontend/Html&CSS/` → `Frontend/HtmlCss/` `S`

The `&` breaks URLs, shell globs, and some static-site generators. Update all inbound links.

**Done when:** directory renamed, no link references the old path.

---

### - [ ] 12. Unify chapter openings across all files `L`

Six competing conventions exist today:

| File                                 | Opens with                          |
| ------------------------------------ | ----------------------------------- |
| `Frontend/JavaScript/03-closures.md` | `# Title` → `## Understanding…`     |
| `Frontend/TypeScript/03-generics.md` | `# Title` → `## Table of Contents`  |
| `Backend/API/01-rest-…md`            | `# Title` → `## Overview` → TOC     |
| `SystemDesign/Frontend/03-…md`       | `# Title` → `## 💡 **Concept**`     |
| `DevOps/Docker/01-…md`               | `# Title` → `## Overview` → table   |
| `OOP/01-oop-fundamentals.md`         | `# Title` → back-link → TOC         |

Pick the item-4 reference pattern and apply it everywhere. Suggested canonical opening:

```markdown
# Chapter Title

> One-sentence promise: what the reader can do after this chapter.

**In this chapter:** bullet · bullet · bullet

## 💡 The Core Idea
```

Split this across sessions by domain: Frontend → Backend → SystemDesign → the rest.

**Done when:** every in-book file opens with the same three blocks.

---

### - [ ] 13. Add the 10 missing directory READMEs `M`

Missing in: `Backend/Testing`, `Backend/SQL`, `SystemDesign/Microservices`, `SystemDesign/Fundamentals`,
`SystemDesign/InterviewQuestions`, `SystemDesign/Frontend`, `SystemDesign/Security`,
`SystemDesign/BuildingBlocks`, `SystemDesign/Scalability`, `SystemDesign/Infrastructure`.

Each README becomes a **part opener** in the book: what the part covers, why it matters, reading order,
and what an interviewer is actually probing for.

**Done when:** every content directory has a README and it reads as a part/chapter opener.

---

### - [ ] 14. Fix the Behavioral numbering gaps `S`

Present: `01, 03, 04, 05, 06, 07, 11, 14`. Missing: `02, 08, 09, 10, 12, 13`.
Either write the missing topics (item 61) or renumber to a contiguous `01`–`08`. **Recommendation:**
renumber now, add new topics at the end later.

**Done when:** `Behavioral/` is contiguously numbered and the README index matches.

---

### - [ ] 15. Fix the Communication numbering gap `S`

Present: `01–06, 08, 09`. Missing: `07`. Renumber contiguous.

**Done when:** `Communication/` is `01`–`08` with a matching README.

---

### - [ ] 16. Fix the DSA prev/next chain `S`

Files `04`–`10` link to filenames from an older numbering scheme (`./02-two-pointers.md` when the file is
`03-two-pointers.md`). Regenerate the prev/next footer for all 16 files from the README order.

**Done when:** every DSA file's prev/next links resolve.

---

### - [ ] 17. Rewrite the root `README.md` `M`

Current problems: advertises React and Next.js coverage that does not exist; lists a 2024-era resource
section (Clément Mihailescu, "JavaScript: The Good Parts"); mixes a personal checklist with a repository index;
ends with a Steve Jobs quote.

New root README should be: what the book is → the nine parts with links → who it is for → how to read it →
status table. Move the personal checklist to `Behavioral/` or `Archive/`.

**Done when:** the root README is a book front door, not a personal to-do list.

---

### - [ ] 18. Rewrite `Frontend/README.md` `M`

Same problems, plus dead links and `**Last Updated**: November 2024`. Rebuild it around the new
Part II + Part III + Part IV structure.

**Done when:** `Frontend/README.md` indexes only directories that exist, with no date stamp in the body
(front matter carries `updated`).

---

### - [ ] 19. Purge personal identity from in-book content `S`

`salmanrahman.com` appears in at least 6 files, alongside a personal interview checklist and an author-specific
resource list. In a published book these belong in **About the Author** and **Further Reading**, once each,
not sprinkled through chapters.

**Done when:** no chapter body contains a personal URL; a single `About-the-Author.md` exists for the back matter.

---

# Phase 2 — Restructure & Prune

> This phase is where the book stops being 1,800 pages. Nothing is deleted — it moves to `Archive/`.

### - [ ] 20. Cut DevOps from 147 files to ~25 `L`

This is the single highest-leverage change in the plan. Target `DevOps/` → renamed **`ShipAndOperate/`**
(Part VIII), containing only what a frontend-heavy full stack engineer is actually asked about:

**Keep and trim (~25 files):**

| Section         | Keep                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `Git/`          | All 6 — daily use, high interview frequency                            |
| `Docker/`       | 5 of 9 — fundamentals, Dockerfile, Compose, security, troubleshooting   |
| `CICD/`         | 5 of 8 — fundamentals, GitHub Actions, deployment strategies, testing, security |
| `Observability/`| 4 — merge `Monitoring/` + the useful half of `Kubernetes/09` + frontend RUM |
| `Deployment/`   | 4 — **new**: Vercel/edge deploys, preview environments, rollback, feature flags |
| `Cloud/`        | 3 — condensed from `AWS/`: core services, serverless, storage + CDN     |

**Archive (~120 files, ~32,000 lines):** `Terraform/` (10), `Linux/` (8), `Scripting/` (6),
`Networking/` (8), `CostOptimization/` (6), `IaC/` (2 orphans), most of `AWS/` (11 of 15),
most of `Kubernetes/` (8 of 10), `DevSecOps/` (10 — see item 24), `Agile/` (8 — see item 25).

> ⚠️ This is a keep-or-archive decision, not a delete. If you later want a DevOps volume, it is all there.

**Split across sessions:** one section per session.

**Done when:** `ShipAndOperate/` has ~25 files and the rest is under `Archive/devops/`.

---

### - [ ] 21. Replace `DevOps/GenAI/` with the real `AI/` directory `S`

`DevOps/GenAI/` (8 topics + README, 1,853 lines) covers "AI tools for DevOps" — using Copilot for scripts, AI for
runbooks. It is thin and it is not what the 2027 reader needs. Two files are worth salvaging into Part VII:
`06-prompt-engineering.md` and `07-security.md`.

**Done when:** the two salvageable files are staged for Phase 4, the rest is in `Archive/devops/genai/`,
and the directory is gone from the content tree.

---

### - [ ] 22. Merge the SystemDesign scalability triplicate `M`

Load balancing, caching, and CDN each appear in **three** directories:

| Topic          | `BuildingBlocks/` | `Scalability/` | `Infrastructure/` | `DevOps/Networking/` |
| -------------- | ----------------- | -------------- | ----------------- | -------------------- |
| Load balancing | `01` (183)        | `03` (123)     | —                 | `03` (303)           |
| Caching        | `02` (207)        | `04` (166)     | —                 | —                    |
| CDN            | `03` (203)        | `06` (161)     | —                 | `06` (344)           |

Keep the `BuildingBlocks/` version as canonical (it is the better-structured set), fold in the unique
material from the others, and delete the duplicates.

**Done when:** each of the three topics exists in exactly one place, with the best content from all copies.

---

### - [ ] 23. Dissolve `SystemDesign/Scalability/` and `SystemDesign/Infrastructure/` `M`

After item 22, `Scalability/` has ~4 unique files (horizontal/vertical scaling, database scaling, async
processing, partitioning) and `Infrastructure/` has ~8 that overlap `ShipAndOperate/` and `SystemDesign/Fundamentals/`.

- Move `07-async-processing.md` and `08-partitioning.md` → `BuildingBlocks/`
- Fold `01-horizontal-scaling.md` + `02-vertical-scaling.md` + `05-database-scaling.md` → `Fundamentals/02-scalability.md`
- Archive `Infrastructure/` entirely — Part VIII covers it better

**Done when:** `SystemDesign/` has 5 directories: `Fundamentals/`, `BuildingBlocks/`, `Database/`,
`Frontend/`, `CaseStudies/`.

---

### - [ ] 24. Consolidate security into one coherent spine `L`

Security currently lives in **five** places with real overlap:

| Directory                | Files | Overlaps                                          |
| ------------------------ | ----- | ------------------------------------------------- |
| `Frontend/Security/`     | 5     | XSS, CSRF, CSP, headers, sanitisation             |
| `Backend/Security/`      | 8     | JWT, OAuth, passwords, HTTPS, CORS/CSRF, headers  |
| `SystemDesign/Security/` | 6     | authn, authz, encryption, API security, attacks   |
| `DevOps/Security/`       | 8     | IAM, secrets, encryption, containers              |
| `DevOps/DevSecOps/`      | 10    | SAST, DAST, scanning, compliance                  |

CSRF is documented three times. Security headers twice. Encryption three times.

**Target:** keep `Frontend/Security/` (browser-side, Part IV) and `Backend/Security/` (server-side, Part V) as
the two canonical homes, add one `ShipAndOperate/pipeline-security.md` (Part VIII), archive the rest after
merging unique content.

**Split across sessions:** audit overlaps → merge frontend → merge backend → archive.

**Done when:** no security topic is documented twice, and each has an obvious home.

---

### - [ ] 25. Move Agile into the human layer `S`

`DevOps/Agile/` (8 topics + README, 1,650 lines) is about Scrum, Jira, and team metrics — that is Part IX, not DevOps,
and 8 files is too many. Condense to **two**: `Behavioral/ways-of-working.md` (Agile, Scrum, sprint rituals,
DORA metrics) and fold collaboration content into the existing communication chapters. Archive the rest.

**Done when:** `DevOps/Agile/` is gone, two condensed chapters exist in Part IX.

---

### - [ ] 26. Merge `OOP/` into `Backend/DesignPatterns/` `M`

`OOP/` is 8 files / 4,662 lines. `Backend/DesignPatterns/` is 6 files / 2,210 lines including its own
SOLID chapter. In a frontend-heavy book, four chapters on encapsulation/inheritance/polymorphism/abstraction
is more than the topic earns.

**Target:** one `Foundations/oop-and-patterns/` section of ~5 chapters — OOP core concepts (one chapter,
merged from the current four), composition vs inheritance, SOLID, GoF patterns you actually use in TS
(factory, observer, strategy, adapter, decorator), architectural patterns.

**Done when:** OOP content is 5 chapters, SOLID exists once, and `OOP/` no longer exists as a top-level directory.

---

### - [ ] 27. Trim the DSA chapters to book length `L`

DSA is 19,115 lines across 16 files — files run 647 to 2,006 lines against the repo's own 150–400 rule.
`16-graph-algorithms.md` alone is 2,006 lines; `11-binary-tree-traversal.md` is 1,809.

**Recommendation:** DSA becomes a **companion volume / appendix**, not Part I of the main book. Trim each
pattern to: what the pattern is → how to recognise it → one worked template → 2 worked examples →
complexity → 6–8 curated LeetCode problems as a table (not solved inline).

Target: 16 files × ~350 lines = ~5,600 lines (down from 19,115).

**Split across sessions:** 3–4 patterns per session.

**Done when:** every DSA file is under 400 lines and the solved-solution bulk lives in a linked repo or appendix.

---

### - [ ] 28. Rename `SystemDesign/InterviewQuestions/` → `CaseStudies/` and rebalance `M`

20 case studies, all backend/distributed-systems shaped (Twitter, Uber, YouTube, parking lot). For a
**frontend-heavy** book this is the wrong balance.

- **Keep 10:** URL shortener, rate limiter, chat system, notification system, typeahead, news feed,
  distributed cache, API gateway, Instagram, Ticketmaster
- **Archive 10:** parking lot (OOP exercise, not system design), Google Search, Amazon, Dropbox,
  web crawler, WhatsApp, Netflix, YouTube, Facebook newsfeed (duplicates news feed), Uber
- **Add frontend case studies** in item 41

**Done when:** `CaseStudies/` holds 10 backend studies, ready for frontend studies to join them.

---

### - [ ] 29. Trim `Communication/` to book-relevant chapters `S`

`03-english-fluency.md` (195 lines) is personal ESL practice, not book content — archive it.
`06-cross-cultural-communication.md` and `09-active-listening.md` are worth keeping but thin.
Merge `02-behavioral-interview.md` into `Behavioral/` where it belongs (it duplicates STAR material).

**Done when:** `Communication/` is 5–6 focused chapters with no duplication against `Behavioral/`.

---

### - [ ] 30. Split `DevOps/README.md` (1,378 lines) `S`

It is a full curriculum index for content that is about to be 80% archived. Rewrite as a ~120-line
`ShipAndOperate/README.md` part opener after item 20 lands.

**Done when:** the part opener matches the surviving content.

---

### - [ ] 31. Deduplicate WebSockets, rate limiting, and API gateway `S`

Smaller triplicates found:

- **WebSockets:** `Backend/API/06-websockets.md` (365) + `SystemDesign/BuildingBlocks/06-websockets.md` (224)
  + `SystemDesign/Frontend/06-real-time.md` (184)
- **Rate limiting:** `Backend/API/04-rate-limiting.md` (415) + `SystemDesign/CaseStudies/12-rate-limiter.md` (307)
- **API gateway:** `SystemDesign/Microservices/03-api-gateway.md` (203) + `CaseStudies/17-api-gateway.md` (258)

Keep the implementation chapter in Backend, the design chapter in SystemDesign, and make each explicitly
cross-reference the other instead of repeating it.

**Done when:** each pair has a clear division of labour and a cross-reference.

---

# Phase 3 — 🆕 `Frontend/ModernStack/` (The Biggest Gap)

> **Why this matters most:** a senior frontend book with no React chapter is not publishable. Research for
> 2026–27 hiring is unambiguous — Server Components vs Client Components, React 19 Actions, the `use` hook,
> the React Compiler, and rendering-strategy judgement are now the _core_ of the senior loop, not extras.

### Target structure

```
Frontend/ModernStack/
├── README.md                 Part III opener
├── React/                    01–12
├── NextJS/                   01–10
├── Svelte/                   01–06
├── Rendering/                01–06
├── StateManagement/          01–06
└── Tooling/                  01–06
```

---

### - [ ] 32. Scaffold `Frontend/ModernStack/` and write the part opener `S`

Create all six subdirectories with READMEs and a Part III opener explaining the through-line:
_the framework is an implementation detail; the rendering model and the state model are the architecture._

**Done when:** the tree exists, READMEs list planned chapters, and `Frontend/README.md` links resolve (fixes item 9's outstanding two).

---

### - [ ] 33. Write `React/` chapters 01–04 — the model `L`

Use **Context7 MCP** for current React docs before writing.

| #   | Chapter                         | Must cover                                                          |
| --- | ------------------------------- | ------------------------------------------------------------------- |
| 01  | The React mental model          | Declarative UI, reconciliation, why re-renders happen, keys          |
| 02  | Hooks in depth                  | Rules, `useState`/`useEffect` correctly, `useRef`, custom hooks, closures over stale state |
| 03  | `useEffect` and when **not** to use it | The single most common senior red flag — derived state, event handlers, `useSyncExternalStore` |
| 04  | Component composition patterns  | Compound components, render props today, slots, controlled vs uncontrolled |

---

### - [ ] 34. Write `React/` chapters 05–08 — the concurrent era `L`

| #   | Chapter                       | Must cover                                                             |
| --- | ----------------------------- | ---------------------------------------------------------------------- |
| 05  | Server Components vs Client Components | The boundary, what serialises, `'use client'`, why this is _the_ 2026–27 interview question |
| 06  | Suspense and streaming        | Boundaries, fallbacks, streaming SSR, hydration mismatch debugging      |
| 07  | Transitions and concurrency   | `useTransition`, `useDeferredValue`, urgent vs non-urgent updates       |
| 08  | Actions and forms             | React 19 Actions, `useActionState`, `useOptimistic`, `useFormStatus`, server mutations |

---

### - [ ] 35. Write `React/` chapters 09–12 — production React `M`

| #   | Chapter                        | Must cover                                                           |
| --- | ------------------------------ | -------------------------------------------------------------------- |
| 09  | Performance and the React Compiler | What the compiler memoises for you, when `memo`/`useMemo` still matter, profiling |
| 10  | Error boundaries and resilience| Boundaries, recovery UX, error reporting, Suspense + error interplay  |
| 11  | React + TypeScript at scale    | Typing props/generics/refs/context, discriminated unions for state (merge/expand `Frontend/TypeScript/08-react-typescript.md`) |
| 12  | Testing React                  | RTL philosophy, testing RSCs, async and Suspense, what not to test    |

> Item 12's existing `Frontend/TypeScript/08-react-typescript.md` (478 lines) should be **moved here**, not duplicated.

---

### - [ ] 36. Write `NextJS/` chapters 01–05 — the framework `L`

Use **Context7 MCP** — Next.js moves fast and training data goes stale quickly.

| #   | Chapter                    | Must cover                                                        |
| --- | -------------------------- | ----------------------------------------------------------------- |
| 01  | App Router mental model    | File conventions, layouts, templates, route groups, parallel/intercepting routes |
| 02  | Data fetching and caching  | Server-side fetching, request memoisation, `use cache`, `cacheLife`, `cacheTag`, revalidation |
| 03  | Server Actions             | Mutations, validation, progressive enhancement, security (never trust the client) |
| 04  | Rendering in Next.js       | Static, dynamic, streaming, **Partial Prerendering (PPR)** — the flagship 2026 concept |
| 05  | Middleware and the edge    | Request interception, auth gating, personalisation, edge vs Node runtime tradeoffs |

---

### - [ ] 37. Write `NextJS/` chapters 06–10 — production Next `M`

| #   | Chapter                     | Must cover                                                     |
| --- | --------------------------- | -------------------------------------------------------------- |
| 06  | Images, fonts, and assets   | `next/image`, `next/font`, CLS prevention, asset budget         |
| 07  | Auth patterns               | Session vs JWT in App Router, middleware gating, cookie strategy |
| 08  | Route handlers and BFF      | When Next _is_ your backend, when it should not be              |
| 09  | Deployment and runtime      | Vercel vs self-host, ISR at the edge, preview deployments, env strategy |
| 10  | Migrating Pages → App Router| Incremental adoption — a real interview scenario                 |

---

### - [ ] 38. Write `Svelte/` chapters 01–06 `L`

Svelte 5 has the **highest retention rate of any framework** (91% would use again) and SvelteKit is the
#2 meta-framework. It is also your day-job stack — this section will be the most authentic writing in the book.

| #   | Chapter                        | Must cover                                                   |
| --- | ------------------------------ | ------------------------------------------------------------ |
| 01  | Svelte 5 and the runes model   | `$state`, `$derived`, `$effect`, `$props` — signals vs React's model |
| 02  | Reactivity compared            | Signals vs virtual DOM vs fine-grained — the tradeoff table interviewers want |
| 03  | Components and snippets        | Snippets replacing slots, `{#snippet}`/`{@render}`            |
| 04  | SvelteKit routing and loading  | `+page.ts`, `+page.server.ts`, `load`, streaming promises      |
| 05  | SvelteKit form actions         | Progressive enhancement, `use:enhance`, validation             |
| 06  | Adapters and deployment        | Node/Vercel/static adapters, prerendering, SSR toggles         |

---

### - [ ] 39. Write `Rendering/` chapters 01–06 — the framework-agnostic core `M`

> This is the chapter set that makes the book last past 2027. Frameworks change; rendering models do not.

| #   | Chapter                        | Must cover                                                     |
| --- | ------------------------------ | -------------------------------------------------------------- |
| 01  | The rendering spectrum         | CSR → SSR → SSG → ISR → PPR → islands, with a decision table    |
| 02  | Hydration and its costs        | Full, partial, progressive, resumability (Qwik), islands (Astro)|
| 03  | Streaming HTML                 | How it works over the wire, TTFB vs FCP vs LCP consequences     |
| 04  | Choosing per route, not per app| The senior answer: mixed strategies in one application          |
| 05  | SEO and rendering              | Crawlers, metadata, structured data, what actually needs SSR    |
| 06  | Edge vs origin rendering       | Latency, cold starts, data locality, when the edge is wrong     |

> ⚠️ `SystemDesign/Frontend/03-rendering.md` (179 lines) already covers part of this — **absorb and delete it**,
> leaving a cross-reference.

---

### - [ ] 40. Write `StateManagement/` chapters 01–06 `M`

Research finding for 2026–27: the field has moved to a **category-first model** — server state, client state,
form state, and URL state are four different problems. Redux is no longer the default; Zustand has overtaken
it in downloads; TanStack Query owns server state.

| #   | Chapter                          | Must cover                                             |
| --- | -------------------------------- | ------------------------------------------------------ |
| 01  | The four kinds of state          | Server · client · form · URL — the framing senior candidates are expected to reach for |
| 02  | Server state with TanStack Query | Cache keys, staleness, mutations, optimistic updates, invalidation |
| 03  | Client state                     | Zustand, Jotai, Context — and when plain `useState` wins |
| 04  | Form state                       | React Hook Form, schema validation with Zod, server-action forms |
| 05  | URL as state                     | Search params, shareable state, `nuqs`-style patterns   |
| 06  | Signals and the next model       | Svelte runes, Solid signals, why React has not adopted them |

> Absorb `SystemDesign/Frontend/02-state-management.md` (199 lines) and cross-reference.

---

### - [ ] 41. Write `Tooling/` chapters 01–06 `M`

Research finding: Vite is at 98% usage; raw Webpack config has fallen to near zero; complexity is "the loser".

| #   | Chapter                      | Must cover                                                |
| --- | ---------------------------- | --------------------------------------------------------- |
| 01  | Modules and bundling         | ESM, tree shaking, code splitting, what a bundler does     |
| 02  | Vite and the dev loop        | Dev server vs build, HMR, plugin model                     |
| 03  | Turbopack, Rspack, Rolldown  | The Rust-based generation and why it happened              |
| 04  | Monorepos                    | pnpm workspaces, Turborepo, task graphs, when _not_ to     |
| 05  | Type-checking and linting at scale | `tsc --build`, project references, Biome vs ESLint, CI gates |
| 06  | Package management           | pnpm vs npm vs yarn, lockfiles, supply-chain safety        |

---

### - [ ] 42. Move frontend architecture out of SystemDesign into Part IV `M`

`SystemDesign/Frontend/` has 12 files at ~200 lines each. Several belong beside the new stack chapters:

| File                       | Action                                                 |
| -------------------------- | ------------------------------------------------------ |
| `02-state-management.md`   | Absorbed by item 40                                    |
| `03-rendering.md`          | Absorbed by item 39                                    |
| `01-architecture.md`, `05-micro-frontends.md`, `08-design-systems.md` | Move → new `Frontend/Architecture/` (Part IV) |
| `04-performance.md`, `09-assets.md`, `12-monitoring.md` | Merge into `Frontend/WebPerformance/`  |
| `00-interview-strategy.md`, `06`, `07`, `10`, `11` | Stay as frontend system design (Part VI) |

**Done when:** each file lives in exactly one part with no duplicated content.

---

### - [ ] 43. Add frontend system design case studies `M`

Part VI currently has 20 backend case studies and zero frontend ones. Add 5, matching what 2026–27
frontend system design rounds actually ask:

1. **Design a collaborative document editor** — CRDT vs OT, offline edits, undo in a shared doc
2. **Design an autocomplete/typeahead component** — debouncing, caching, cancellation, a11y, keyboard nav
3. **Design an infinite feed** — virtualisation, pagination, image loading, restoring scroll position
4. **Design a design system for 40 teams** — versioning, theming, breaking changes, adoption
5. **Design a dashboard with 50 live widgets** — data fan-in, WebSocket vs SSE vs polling, render budget

Each follows RADIO and stays 250–350 lines.

---

# Phase 4 — 🆕 `AI/` (The 2027 Differentiator)

> **Why:** research is consistent that the three skills hiring managers screen for in 2026–27 are
> **RAG, agents, and evaluation** — and that evaluation is the most under-taught of the three. No competing
> full stack interview book covers this properly yet. This is the section that makes your book a **2027** book.

### Target structure

```
AI/
├── README.md              Part VII opener
├── Foundations/           01–05
├── Integration/           01–06
├── RAG/                   01–05
├── Agents/                01–05
├── Production/            01–06
└── AIUX/                  01–04
```

---

### - [ ] 44. Scaffold `AI/` and write the part opener `S`

The opener must set the frame: **this part is for engineers who build AI features, not for ML engineers.**
No model training, no CUDA, no PyTorch. TypeScript throughout, consistent with the rest of the book.

---

### - [ ] 45. Write `AI/Foundations/` 01–05 `M`

| #   | Chapter                     | Must cover                                                     |
| --- | --------------------------- | -------------------------------------------------------------- |
| 01  | How LLMs behave             | Tokens, context windows, temperature, sampling, non-determinism — the mental model, no maths |
| 02  | Choosing a model            | Capability vs latency vs cost, frontier vs small models, routing, when a smaller model wins |
| 03  | Prompting as engineering    | System vs user prompts, few-shot, structure, versioning prompts like code |
| 04  | Embeddings and similarity   | What a vector is, cosine similarity, when embeddings beat keyword search |
| 05  | Context engineering         | The 2026 reframe of "prompt engineering" — what goes in the window and what gets cut |

> Salvage `DevOps/GenAI/06-prompt-engineering.md` into chapter 03.

---

### - [ ] 46. Write `AI/Integration/` 01–06 — the full stack engineer's core `L`

This is the section your reader will use at work on Monday. Use **Context7 MCP** for current SDK APIs.

| #   | Chapter                       | Must cover                                                    |
| --- | ----------------------------- | ------------------------------------------------------------- |
| 01  | Calling an LLM from TypeScript| Provider SDKs, the unified-SDK approach, error/timeout handling |
| 02  | Streaming responses           | SSE, backpressure, cancellation, partial rendering             |
| 03  | Structured output             | Schema-constrained generation, Zod validation, repair loops     |
| 04  | Tool calling                  | Defining tools, the call loop, parallel calls, failure handling |
| 05  | MCP (Model Context Protocol)  | What it standardises, servers vs clients, when to build one     |
| 06  | Multi-provider architecture   | Gateways, failover, cost routing, avoiding vendor lock-in       |

---

### - [ ] 47. Write `AI/RAG/` 01–05 `M`

Research finding: RAG is the most widely deployed enterprise LLM pattern, and the gap between a tutorial
RAG engineer and a production one is **retrieval evaluation**.

| #   | Chapter                    | Must cover                                                  |
| --- | -------------------------- | ----------------------------------------------------------- |
| 01  | When RAG, when fine-tune, when neither | The decision most teams get wrong                |
| 02  | Ingestion and chunking     | Chunk size, overlap, structure-aware splitting, metadata      |
| 03  | Retrieval                  | Vector vs keyword vs hybrid, reranking, filters               |
| 04  | Vector stores              | pgvector vs dedicated stores, index types, the operational cost |
| 05  | Evaluating retrieval       | Recall@k, golden sets, why "the answer was wrong" is usually a retrieval bug |

---

### - [ ] 48. Write `AI/Agents/` 01–05 `M`

| #   | Chapter                       | Must cover                                                 |
| --- | ----------------------------- | ---------------------------------------------------------- |
| 01  | What an agent actually is     | The loop: model → tool → observation → model. Nothing mystical |
| 02  | Designing the tool surface    | Granularity, naming, descriptions as prompts, error messages the model can act on |
| 03  | Memory and state             | Short-term context, summarisation, persistent memory, checkpointing |
| 04  | Durability and long-running work | Retries, resumption, human-in-the-loop approval gates    |
| 05  | Multi-agent patterns          | Orchestrator/worker, when a single agent is genuinely better |

---

### - [ ] 49. Write `AI/Production/` 01–06 — the section that sets the book apart `L`

| #   | Chapter                   | Must cover                                                       |
| --- | ------------------------- | ---------------------------------------------------------------- |
| 01  | Evals                     | Golden datasets, LLM-as-judge, regression suites, CI for prompts — **the most under-taught senior skill** |
| 02  | Error analysis loops      | Reading traces, categorising failures, the improve-measure cycle   |
| 03  | Observability             | Tracing spans, token accounting, latency budgets, what to log (and what never to) |
| 04  | Cost engineering          | Prompt caching, model routing, batching, streaming perceived-latency wins |
| 05  | Guardrails and safety     | Input/output filtering, refusal handling, PII, tool permissioning   |
| 06  | Prompt injection          | Direct and indirect, why it is the #1 AI security issue, defence in depth |

> Salvage `DevOps/GenAI/07-security.md` into chapters 05–06.

---

### - [ ] 50. Write `AI/AIUX/` 01–04 — the frontend-heavy angle `M`

**This is the section only a frontend-heavy author can write well.** It is your book's edge over the
AI-engineering books written by backend and ML people.

| #   | Chapter                      | Must cover                                                     |
| --- | ---------------------------- | -------------------------------------------------------------- |
| 01  | Designing for latency        | Streaming, skeletons, optimistic UI, why the first token matters more than the last |
| 02  | Generative UI                | Rendering components from model output, safety boundaries, hydration |
| 03  | Trust and correctness UX     | Citations, confidence, edit-before-accept, undo, showing the model's work |
| 04  | Failure states               | Refusals, timeouts, partial answers, rate limits — designing the unhappy path |

---

### - [ ] 51. Write `AI/` interview chapter `S`

A dedicated chapter on how AI topics appear in interviews: "design a RAG system", "how would you evaluate
this feature", "your agent is looping, debug it", "what breaks when the model changes version".

---

### - [ ] 52. Add a "build it once" running project to Part VII `M`

Every chapter set in Part VII should thread through **one small application** — a documentation assistant,
say — so the reader ends the part with something whole rather than eight disconnected snippets.

**Done when:** the Part VII opener introduces the project and each section extends it.

---

### - [ ] 53. Cross-link AI into the rest of the book `S`

Add explicit cross-references: Part V (API design for streaming endpoints), Part IV (performance budgets for
AI features), Part VI (system design for an AI product), Part VIII (deploying and monitoring AI workloads),
Part IX (the AI-assisted interview loop).

---

# Phase 5 — Fill the Remaining Gaps

### - [ ] 54. Create `Frontend/Accessibility/` `M`

Accessibility is one 343-line file inside `Html&CSS/`. Since **June 2025 the European Accessibility Act is
enforceable** — any consumer-facing site serving the EU must comply, regardless of where the company is.
For a European-based senior engineer this is a differentiator, and research shows a11y is one of the two
things (with i18n) that separates senior from mid in frontend system design rounds.

| #   | Chapter                     |
| --- | --------------------------- |
| 01  | Why accessibility, and the law (EAA, EN 301 549, WCAG 2.2 AA, ADA) |
| 02  | Semantic HTML and the accessibility tree |
| 03  | ARIA — and when not to use it |
| 04  | Keyboard, focus management, and modals |
| 05  | Accessible forms and error messaging |
| 06  | Testing a11y — axe, screen readers, CI gates |

Move and expand `Html&CSS/07-accessibility.md` here.

---

### - [ ] 55. Create `Frontend/Architecture/` `M`

Receives the moved files from item 42 plus new material. Part IV chapters:

| #   | Chapter                        | Source                                    |
| --- | ------------------------------ | ----------------------------------------- |
| 01  | Structuring a large frontend   | New — feature folders, boundaries, layering |
| 02  | Micro-frontends                | Moved + expanded (Module Federation, single-spa, when it is the wrong answer) |
| 03  | Design systems at scale        | Moved from `SystemDesign/Frontend/08`      |
| 04  | Monorepo vs polyrepo frontends | New                                        |
| 05  | Managing dependencies and upgrades | New — the senior maintenance skill    |

---

### - [ ] 56. Add the missing Backend chapters `M`

`Backend/README.md` and the root README promise Express and NestJS; neither exists.

| Add                                  | Why                                                       |
| ------------------------------------ | --------------------------------------------------------- |
| `Backend/Frameworks/01-express.md`   | Still the reference Node framework in interviews           |
| `Backend/Frameworks/02-nestjs.md`    | Enterprise Node default; DI and module patterns            |
| `Backend/Frameworks/03-hono-edge.md` | Edge runtimes — the 2026–27 shift                          |
| `Backend/API/07-trpc-typed-apis.md`  | End-to-end type safety, the full stack TS answer           |
| `Backend/API/08-sse-vs-websockets.md`| SSE matters now because of AI streaming                    |

---

### - [ ] 57. Modernise `Frontend/Testing/` `M`

Currently 8 files that reference Jest and Cypress-era practice. Research: **Vitest and Playwright both gained
14 points of usage year-over-year** — the largest increases in the ecosystem.

- Make Vitest the default runner throughout (partly done — `02-vitest-basics.md` exists)
- Replace Cypress-first E2E with Playwright-first
- Add: testing Server Components, testing async/Suspense, component testing vs E2E boundary
- Add: visual regression and accessibility testing in CI

---

### - [ ] 58. Refresh `Frontend/WebPerformance/` for 2027 `M`

Absorbs `SystemDesign/Frontend/04`, `09`, `12` (item 42). Add or update:

- **INP** as the responsiveness metric (replaced FID in 2024 — check every mention)
- Performance budgets and how to enforce them in CI
- RSC and streaming as performance strategies
- Third-party script governance
- Real user monitoring vs lab data

---

### - [ ] 59. Add `Frontend/JavaScript/11-modern-js.md` `S`

The JavaScript section stops at ES6+. Add one chapter on what has landed since and shows up in code review:
`Array.prototype.at`, `structuredClone`, `Object.groupBy`, top-level `await`, `AbortController` patterns,
`Intl` beyond formatting, temporal-style date handling, and the pipeline of proposals worth knowing.

---

### - [ ] 60. Add `Frontend/TypeScript/09-typescript-at-scale.md` `S`

The TS section covers the language but not the engineering: project references, `strict` migration strategy,
type-level performance, `satisfies`, module resolution, declaration files, and when types are costing more
than they return.

---

### - [ ] 61. Fill the Behavioral gaps with senior-level material `M`

After renumbering (item 14), add the chapters a senior/staff loop actually probes:

- Influence without authority
- Technical decision-making and writing an ADR
- Mentoring and growing engineers
- Handling disagreement with a senior stakeholder
- Scope negotiation and saying no
- Incident ownership and blameless post-mortems

---

### - [ ] 62. Add a "senior signals" chapter to each part opener `M`

For each of the nine parts, add a short section to the README: **what an interviewer is listening for at
senior level in this part**, and the two or three answers that mark someone as mid rather than senior.
This is the connective tissue that makes it a book and not a wiki.

---

### - [ ] 63. Add a glossary `M`

One `Glossary.md` for the back matter. Every term bolded on first use in a chapter gets an entry.
Especially important for Part VII, where the vocabulary is new to most readers.

---

# Phase 6 — 2027-Proofing

### - [ ] 64. Write the AI-era interview chapter `M`

The most current, most saleable chapter in the book. Research findings to build it on:

- **Google** is adding a "code comprehension" round in 2026 — read, debug, and optimise an existing codebase
  with an AI assistant available
- **Meta** lets candidates choose between models mid-interview and scores on four axes: problem solving,
  code quality, verification, communication
- **38%** of US companies now allow AI in technical interviews; **62%** still prohibit it — you must be ready for both
- Candidates who lean on AI without demonstrating understanding are **failed**; the ones who pass use it for
  well-defined subtasks while owning the design

Chapter covers: how to use AI in an interview without failing it, how to verify generated code out loud,
prompt hygiene under time pressure, and what to do when AI is banned.

**Home:** `Behavioral/` or a new `InterviewCraft/` section in Part IX.

---

### - [ ] 65. Add "reviewing AI-generated code" to Part IV `S`

A 2026–27 senior signal: catching that generated code creates new object references that defeat memoisation,
or that generated ARIA attributes are syntactically valid but semantically wrong. This is a genuinely new
skill and almost nothing published covers it.

---

### - [ ] 66. Add a "what's changing" note to volatile chapters `S`

For chapters on fast-moving tools (Next.js caching, React Compiler, AI SDKs, bundlers), add a short
`> ⚠️ **Moving target:**` callout naming what is likely to change and what the durable principle is.
This is how a 2027 book survives to 2028.

---

### - [ ] 67. Version-stamp every framework claim `M`

Every version-specific statement gets an explicit version: "React 19", "Next.js 16", "Svelte 5", "TypeScript 5.x".
Vague claims like "modern React" age badly and make a reader distrust the book.

---

### - [ ] 68. Audit for 2024-era content `M`

Sweep for content that is now wrong or stale: FID instead of INP, `getServerSideProps` as the default,
Jest/Cypress as defaults, Redux as the default state solution, Webpack config as a required skill,
CSS-in-JS runtime libraries as a recommendation.

---

### - [ ] 69. Update all external resource lists `S`

The root README's resources are 2024-era. Rebuild around current sources: GreatFrontEnd, Frontend Interview
Handbook, the official React/Next/Svelte docs, `web.dev`, DeepLearning.AI for Part VII, and Alex Xu for Part VI.

---

# Phase 7 — Book Assembly & Publish

### - [ ] 70. Fix final chapter ordering and numbering `M`

Set `part` and `chapter` in front matter for every in-book file so the build produces the right sequence.
Verify no part exceeds ~12 chapters (split if it does).

---

### - [ ] 71. Replace every relative link with a chapter cross-reference `M`

Relative paths break in PDF and EPUB. Convert to the item-2 syntax and have the build resolve them to
"see Chapter N" in print and to anchors on the web.

---

### - [ ] 72. Write the front matter `M`

Preface (why this book exists, who it is for, what it will not teach), how to read it (three paths:
interview sprint, working reference, cover to cover), and the full table of contents.

---

### - [ ] 73. Write the back matter `S`

About the author, glossary (item 63), further reading, and an index of interview questions collected from
every chapter — that index alone is worth the purchase for a lot of readers.

---

### - [ ] 74. Normalise all diagrams to Mermaid `M`

There is exactly **one** Mermaid diagram in 134,000 lines. ASCII diagrams do not survive PDF typesetting well.
Convert structural diagrams to Mermaid; keep ASCII only for short linear flows.

---

### - [ ] 75. Verify every code sample compiles `L`

Extract all TypeScript fences to a scratch project and type-check them. Broken code in a published book is
the fastest way to a one-star review. Add it to CI so it stays true.

**Done when:** `pnpm check:code-samples` passes.

---

### - [ ] 76. Full editorial pass for voice `L`

Read cover to cover for one voice. The repo currently swings between textbook-neutral
(`DevOps/Docker/01`), essayistic (`Backend/API/01`), and bullet-heavy (`SystemDesign/Frontend/03`).
Pick one — the `Backend/API/01` voice is the strongest — and edit toward it.

**Split across sessions:** one part per session.

---

### - [ ] 77. Produce PDF and EPUB `M`

Run the full build, check pagination, code-block wrapping, table overflow, and diagram rendering in both formats.

---

### - [ ] 78. Decide distribution and set up the companion `M`

Options: Leanpub (iterative, pays while you write), Gumroad (full control), self-host on `salmanrahman.com`.
**Recommendation:** Leanpub for the book plus a free VitePress companion site built from the same markdown —
the site markets the book and the book funds the site.

---

## ✅ Progress Tracker

| Phase | Items   | Done | Status         |
| ----- | ------- | ---- | -------------- |
| 0     | 1–7     | 2/7  | 🟡 In progress |
| 1     | 8–19    | 0/12 | ⬜ Not started |
| 2     | 20–31   | 0/12 | ⬜ Not started |
| 3     | 32–43   | 0/12 | ⬜ Not started |
| 4     | 44–53   | 0/10 | ⬜ Not started |
| 5     | 54–63   | 0/10 | ⬜ Not started |
| 6     | 64–69   | 0/6  | ⬜ Not started |
| 7     | 70–78   | 0/9  | ⬜ Not started |
| **Total** | **78** | **2/78** | **3%**   |

---

## 🔢 Where the Line Budget Goes

Budgets below match [BOOK-SPEC.md § 5](./BOOK-SPEC.md) exactly. "Now" figures are measured from the
current tree; content is mapped to its destination part, so `DevOps/Agile` counts under IX, not VIII.

| Part                          | Now         | After       | Change      |
| ----------------------------- | ----------- | ----------- | ----------- |
| I — Foundations (JS · TS · OOP · patterns) | 17,500 | 5,000  | −12,500     |
| II — Browser Platform         | 12,200      | 6,000       | −6,200      |
| III — **Modern Stack** 🆕     | 0           | 12,000      | **+12,000** |
| IV — Frontend at Scale        | 6,800       | 5,500       | −1,300      |
| V — Backend                   | 12,300      | 6,500       | −5,800      |
| VI — System Design            | 20,200      | 6,500       | −13,700     |
| VII — **AI Engineering** 🆕   | 0           | 7,500       | **+7,500**  |
| VIII — Ship & Operate         | 38,100      | 3,500       | −34,600     |
| IX — Human Layer              | 5,900       | 2,500       | −3,400      |
| **Book subtotal**             | **113,000** | **55,000**  | **−51%**    |
| Appendix — DSA (companion)    | 19,100      | 5,600       | −13,500     |
| Planning artefacts + root     | 1,900       | 0           | −1,900      |
| **Total**                     | **134,000** | **60,600**  | **−55%**    |

> Content is counted against its **destination** part, not its current directory — so `DevOps/Agile/` counts
> under IX, `Backend/DesignPatterns/` under I, and the architecture half of `SystemDesign/Frontend/` under IV.

**The two flows behind the net −73,400:**

| Gross cuts                                             | Lines       |
| ------------------------------------------------------ | ----------- |
| DevOps archived — #20, #25                              | 34,600      |
| SystemDesign deduped and archived — #22, #23, #28       | 13,700      |
| DSA trimmed to pattern-recognition only — #27           | 13,500      |
| Foundations consolidated (OOP ⟷ patterns, JS/TS) — #26  | 12,500      |
| Browser platform trimmed (PWA is 6,002 lines today)     | 6,200       |
| Backend deduped — #24, #31                              | 5,800       |
| Human layer condensed — #25, #29                        | 3,400       |
| Frontend-at-scale net trim — #42, #57, #58              | 1,300       |
| Planning artefacts and root files — #8, #17             | 1,900       |
| **Total removed**                                       | **92,900**  |

| New content written                                     | Lines       |
| ------------------------------------------------------ | ----------- |
| Part III — `Frontend/ModernStack/` — #32–43             | 12,000      |
| Part VII — `AI/` — #44–53                               | 7,500       |
| **Total added**                                         | **19,500**  |

**92,900 out, 19,500 in, net −73,400.**

> The book gets **shorter and far more valuable**. Roughly 62% of the cutting is DevOps and DSA bulk, and
> **a third of the final book (Parts III and VII) is content that does not exist yet.**

---

## 🚦 If You Only Have Time for Ten

In strict order — this is the sequence that turns the repo into a publishable manuscript fastest:

| Order | Item | Why                                                        |
| ----- | ---- | ---------------------------------------------------------- |
| 1     | #1   | Lock the spec — everything else is guesswork without it     |
| 2     | #2   | The chapter standard, before writing a single new page      |
| 3     | #20  | Cut DevOps — removes a third of the repo in one phase       |
| 4     | #32  | Scaffold ModernStack — the structural hole closes           |
| 5     | #33–35 | React chapters — the book is unsellable without them     |
| 6     | #36–37 | Next.js chapters                                          |
| 7     | #44  | Scaffold AI — the 2027 differentiator                       |
| 8     | #46  | AI integration — the most immediately useful section        |
| 9     | #49  | AI production/evals — the section nobody else has written   |
| 10    | #64  | The AI-era interview chapter — the most current thing in print |

---

## 📚 Research Sources

The 2027 targeting in this plan is based on:

- [100+ React Interview Questions from Ex-interviewers (2026) — GreatFrontEnd](https://www.greatfrontend.com/blog/100-react-interview-questions-straight-from-ex-interviewers)
- [Frontend Engineering 2026: Core Web Vitals, React 19 & DX Patterns — MockExperts](https://www.mockexperts.com/blog/frontend-engineering-2026-performance-dx)
- [Front End System Design Interview — Frontend Interview Handbook 2026](https://www.frontendinterviewhandbook.com/front-end-system-design)
- [Frontend System Design: The Complete Guide 2026 — System Design Handbook](https://www.systemdesignhandbook.com/guides/frontend-system-design/)
- [State of JavaScript 2025 — Libraries](https://2025.stateofjs.com/en-US/libraries/) and [Meta-Frameworks](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)
- [React State Management in 2026: A Data-Driven Comparison](https://saschb2b.com/blog/react-state-management-2026)
- [Andrew Ng & DeepLearning.AI — The AI Engineering Skills Map (2026)](https://www.deeplearning.ai/the-batch/the-ai-engineering-skills-map)
- [AI Developer Hiring 2026: Skills That Actually Matter](https://www.digitalapplied.com/blog/ai-developer-hiring-skills-that-matter-2026)
- [AI SDK — Vercel](https://vercel.com/ai-sdk)
- [Google's AI-Assisted Coding Interview (2026 Guide) — Exponent](https://www.tryexponent.com/blog/google-ai-coding-interview)
- [Engineering Interviews in 2026: 3 Trends Hiring Leaders Must Prepare For — Karat](https://karat.com/engineering-interview-trends-2026/)
- [European Accessibility Act 2026: EAA Compliance Guide — Level Access](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/)
- [Understanding the European Accessibility Act and WCAG 2.2 — OneTrust](https://www.onetrust.com/blog/understanding-the-european-accessibility-act-and-wcag-22/)
