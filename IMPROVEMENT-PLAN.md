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

**Last updated:** 2026-08-28 · **Progress:** 19 / 78
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

### - [x] 3. Add YAML front matter to every topic file `M` — ✅ **done 2026-08-28**

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
| No content lost | `git diff --numstat \| awk '$2>0'` | deletions only on files that already had front matter |
| Newline fix works | `git diff --numstat \| awk '{s+=$1} END {print s}'` | ~12 insertions per newly-stamped file |
| Idempotent | run the script a second time | `changed: 0` |

`git checkout -- .` reverts cleanly if any check fails.

> **Numbers corrected on completion.** The original table said `0` deletions and `5016` insertions
> (12 × 418 files). Both were stale: item #13 added 10 READMEs and #19 added `About-the-Author.md`, so
> the tree is now **425** files, and **13 of them already carried hand-written front matter** — those
> re-serialise rather than gain a block, producing 25 unavoidable deletions. Actual: **425 files,
> 4,969 insertions, 25 deletions**, every deletion inside those 13 files.

> ✅ **Idempotency now verified.** The fix at `scripts/add-frontmatter.ts:318` was previously on disk
> but never executed. A second run reports `changed: 0` with an unchanged diff.

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

**Delivered:**

- Ran `scripts/add-frontmatter.ts` across the tree. **425 files stamped**, `+4,969 / −25`. Every one of
  the 25 deletions is inside the 13 files that already had front matter — 12 `level:` lines gaining the
  inline `# beginner | intermediate | advanced` comment, plus 12 recomputed `reading_time` values and one
  in `About-the-Author.md`. **No prose was touched in any file**
- **Idempotent, verified:** a second run reports `changed: 0` and leaves the diff byte-identical. This
  closes the ⚠️ that stood on `add-frontmatter.ts:318` since the script was written
- `pnpm lint:docs` — **"Missing or invalid front matter" went 411 → 0**. No other rule regressed against
  `.lint-baseline.json`. Front matter is now the first rule in the repo at zero
- **`.lint-baseline.json` tightened** to the new counts: `front-matter` 411 → **0** (so it now hard-fails
  on any regression), `fence-language` 614 → 97, `too-long` 59 → 49. The last two dropped mainly because
  the lint only walks in-book files, and 148 files just left that set — not because they improved
- **The archive decisions now bite.** `pnpm book:collect` went from 417 files / 134,298 lines to
  **277 files / 98,278 lines** — 148 files carry `in_book: false`. That 40k-line drop is #3's whole point:
  #20–#31 now have machine-readable instructions instead of prose ones
- All **69 hardcoded paths** in the script's mapping tables re-verified as still resolving — the renames
  from #11 and the numbering fixes in #14–#16 did not break any of them
- Chapters by part, as stamped: **I** 34 · **II** 32 · **IV** 30 · **V** 49 · **VI** 60 · **VIII** 33 ·
  **IX** 22 · **Appendix** 17. Parts III and VII are empty, as expected — items #32–43 and #44–53 create them

**Four fixes the run forced on `scripts/add-frontmatter.ts`:**

| Fix | Why it mattered |
| --- | --- |
| `build` added to `EXCLUDED_DIRS` | The script walked `build/book.md` — the generated manuscript from #5 — and stamped front matter into it. `scripts/lib/book.ts` already excluded `build`; this script predated it |
| `SystemDesign/Security` added to `OUT_OF_BOOK_DIRS` | Item #24 archives it, and #13 had already hand-marked its README `in_book: false`, but the script's dir list omitted it — so its 6 chapters would have defaulted to `in_book: true` and survived into the manuscript |
| `"About-the-Author.md": 9` added to `PART_OVERRIDES` | Root-level, so no prefix mapping could reach it. Its hand-set `part: 9` was being preserved by luck; `--force` would have silently reset it to `0` |
| `deriveTitle` no longer strips backticks | `Frontend/JavaScript/04-this-keyword.md` derived `title: The this Keyword` against an H1 of ``The `this` Keyword`` — the one front-matter lint violation left after the run. Backticks are ordinary characters in a YAML plain scalar |

> **Also amended:** the verification table above. Its expected numbers were written before #13 and #19
> existed and could not have passed.

> **Known limitation, not fixed here:** derived `tags` come from splitting the path on word boundaries,
> so `SystemDesign/Frontend/05-micro-frontends.md` gets `[system, design, frontend, micro, frontends]`.
> Valid, machine-readable, and not what a human would write. Tags are cosmetic until something consumes
> them; worth a pass when one does.

> **Still deliberately open:** `chapter: 0` on all 425 files. Item **#70** assigns real numbers, and
> nothing reads `chapter` until then.

---

### - [x] 4. Build the reference chapter `M` — ✅ **done 2026-08-27**

Pick **one** existing strong file — `Backend/API/01-rest-best-practices.md` is the best-written file in the
repo — and rewrite it to the finished book standard from item 2. This becomes the template every other
chapter is measured against.

**Done when:** the file passes the item-2 standard end to end, and is linked from the skill as
`REFERENCE-CHAPTER.md`.

**Delivered:**

- [`Backend/API/01-rest-best-practices.md`](./Backend/API/01-rest-best-practices.md) rewritten to the six
  blocks. It is currently **the only file in the repo with zero lint violations** (verified with the
  script from #6)
- Front matter stamped by hand (`part: 5`, `chapter: 0`, `slug: rest-best-practices`), H1 carries
  `{#ch-rest-best-practices}` and matches `title`
- **Added:** `## 💡 The Core Idea`, `## When to Use It` (a REST vs GraphQL vs gRPC vs WebSocket decision
  table that names the alternative honestly), `## Common Mistakes`, `## 🔑 Key Takeaways`,
  `## What to Read Next`, and one Mermaid `flowchart` with a caption
- **Removed:** the hand-written Table of Contents, the `[API Index] | [GraphQL →]` back-link footer, the
  `## Summary` checklist (non-negotiable #11), and a retired ✨ and 🔴 callout
- **Cross-references converted:** `./03-versioning.md` and `../Security/README.md` were the only two
  relative links; both are now `#ch-<slug>` anchors. Interview questions cut 8 → 5, with the
  judgement-call question ("when would you not build a REST API?") written fresh
- 🆕 [`REFERENCE-CHAPTER.md`](./REFERENCE-CHAPTER.md) at the repo root — resolves the link item #2 left
  dangling. It is a **pointer with a "what to copy from it" table**, not a copy: a duplicated exemplar
  drifts, and then two files claim to be the standard
- Added `REFERENCE-CHAPTER.md` to `EXCLUDED_FILES` in `add-frontmatter.ts` so #3 does not stamp it

> **Deliberately left:** the chapter is **350 lines against the ~220 target** — inside the 150–400 hard
> limit, but REST has the widest surface area in Part V. `REFERENCE-CHAPTER.md` says explicitly that it is
> not a length model, so it cannot be cited as licence to write 350-line chapters.

---

### - [x] 5. Set up the book build pipeline `M` — ✅ **done 2026-08-27**

Choose one and wire it up:

| Option        | Best for                          | Verdict                                       |
| ------------- | --------------------------------- | --------------------------------------------- |
| **Pandoc + LaTeX** | Real PDF/EPUB, full typography control | ✅ **Recommended** — best print output   |
| VitePress     | Web-first docs site                | Good companion site, weak PDF                 |
| Honkit/GitBook| Zero config                        | Fastest start, least control                  |

Recommended: **Pandoc** for the book (`scripts/build-book.sh` → PDF + EPUB), **VitePress** later for a free
web companion that markets the book. Order comes from front matter `part` + `chapter`.

**Done when:** `pnpm book:build` produces a PDF with a working table of contents from current content.

**Delivered — verified, not assumed:**

```
417 files · 134,298 lines → build/book.md
build/handbook.pdf   3,692 pages, A4, 7.9 MB, linked TOC to depth 2
build/handbook.epub  3.0 MB
```

- 🆕 `package.json` — `pnpm` scripts `book:build` · `book:pdf` · `book:epub` · `book:collect` ·
  `lint:docs` · `plan:next` · `plan:check` · `frontmatter`. `@types/node` added, so `scripts/*.ts`
  typecheck for the first time
- 🆕 `scripts/lib/book.ts` — the shared model of *what is in the book*: exclusions, the part mapping,
  the front-matter reader, reading order. #5 and #6 both import it, so the build and the lint can never
  disagree about what counts as a chapter
- 🆕 `scripts/collect-chapters.ts` — assembles `build/book.md`. Strips each file's front matter (pandoc
  would otherwise read it as book metadata and the last `title` would win) and pushes every heading down
  one level, freeing level 1 for the part dividers it inserts
- 🆕 `scripts/build-book.sh` (`pdf` · `epub` · `all`), `scripts/book-meta.yaml`, `scripts/book-header.tex`
- **Installed:** `pandoc 3.10.2` + `tectonic 0.17.0` via Homebrew, as this item's tooling note specified
- **Ordering degrades gracefully.** Reading order is front matter `part` + `chapter`, falling back to the
  directory prefix — so the book builds correctly *today*, before #3 has stamped anything

Three things that were not obvious and are worth writing down:

- **The reader had to be `markdown`, not `gfm`.** GFM cannot parse `{#ch-slug}` header attributes, which
  every cross-reference in the book targets. `raw_tex` and the maths extensions are switched off so a `$`
  or a backslash in prose stays literal
- **`yaml_metadata_block` had to be switched off.** Chapters use `---` as a horizontal rule; pandoc read
  the prose after one as metadata and the build died. Book metadata comes from `--metadata-file` instead
- **Emoji rendered as tofu.** Tectonic's fonts have no emoji, so the entire callout vocabulary printed as
  boxes. `book-header.tex` maps the sanctioned set via `newunicodechar` — ✅/❌ become real dingbats, ⚠️
  becomes a bold bang, 💡/🔑 are dropped because their headings already say what they mean

> **Left for #77:** retired emoji (🗺️ 📚 🚀 and friends) and the box-drawing characters in ASCII diagrams
> still print as tofu — #12 and #74 delete those files' contents anyway. Table overflow and long code
> lines run into the margin; `\emergencystretch` softens it, but the real typesetting pass is #77.
> VitePress is **not** set up — this item recommended it "later", and nothing depends on it yet.

---

### - [x] 6. Add a lint script for the standard `M` — ✅ **done 2026-08-27**

`scripts/lint-docs.ts` fails CI on:

- Missing or invalid front matter
- Broken relative links
- Non-TypeScript code fences (allow-list: `bash`, `json`, `yaml`, `css`, `html`, `sql`, `mermaid`, `text`)
- Files over 400 lines with `in_book: true`
- Missing `README.md` in a content directory
- Heading level jumps (`##` → `####`)

**Done when:** `pnpm lint:docs` runs, reports the current violation count, and is wired into a GitHub Action.

**Delivered — `pnpm lint:docs` across 417 files, 2,227 violations:**

| Rule | Count | Cleared by |
| ---- | ----- | ---------- |
| Missing or invalid front matter | **416** | #3 |
| Broken relative link | **32** | #9 |
| Code fence outside the allow-list | **1,704** | #10, #20 |
| File over 400 lines with `in_book: true` | **61** | #17, #18, #23 |
| Content directory with no README.md | **10** | #13 |
| Heading level jump | **4** | #12 |

**Three of those numbers independently confirm the audit at the top of this file** — #9 predicted 32
broken links, #13 predicted 10 missing READMEs, and #10 predicted 415 JavaScript fences against a
measured 417. The linter and the audit were derived separately, so they corroborate each other.

- 🆕 `scripts/lint-docs.ts` — all six rules, plus front-matter checks the item did not ask for and the
  standard needs: **globally unique slugs**, and **H1 text matching front matter `title`** (the build
  trusts one of them, so a mismatch is unresolvable)
- 🆕 `.github/workflows/lint-docs.yml` — runs `lint:docs`, `plan:check`, and `book:collect` on push and PR
- 🆕 `.lint-baseline.json` — **the gate is the baseline, not zero.** A hard zero would leave CI red until
  #19 and train everyone to ignore it. A count that goes **up** fails the build; a count that goes down is
  committed as the new ceiling. Each rule becomes a hard gate on its own the moment it reaches 0.
  Verified by adding a stray ` ```python ` fence: `1705 (baseline 1704 — REGRESSED)`, exit 1
- Flags: `--strict` (fail on any violation), `--rule=<id>` (every occurrence of one rule),
  `--update-baseline`. Advisory line for files under 150 lines — a merge prompt, not a failure

Two corrections to this item as written:

- **The allow-list here omitted `tsx`**, which `BOOK-SPEC.md` non-negotiable #1 includes. The spec wins;
  the linter allows `tsx`. This item's list is the stale one
- **"Non-TypeScript code fences" needed widening to unlabelled ones.** 1,019 of the 1,704 fence violations
  are fences with *no* language at all, which typeset without highlighting and are invisible to #10's
  sweep if the rule only looks for ` ```javascript `

> **Worth knowing before #10:** the fence backlog is not 1,704 files' worth of work. 174 are `hcl`
> (Terraform) and most of the rest sit in `DevOps/`, which #20 archives. Re-run the linter after #20 and
> the real number will be far smaller.

---

### - [x] 7. Create `Archive/` and the exclusion rule `S` — ✅ **done 2026-08-27**

Make `Archive/` at the repo root with a `README.md` explaining it holds content that is useful reference but
out of the book. The build script skips it. Nothing is deleted in this plan — it is **moved**.

**Done when:** `Archive/README.md` exists and `scripts/build-book.sh` ignores the directory.

**Delivered:**

- 🆕 [`Archive/README.md`](./Archive/README.md) — why the directory exists (deleting makes the
  keep-or-archive judgement unrecoverable), the out-of-scope categories lifted from
  `BOOK-SPEC.md` § 6, the planned layout (`planning/` from #8, `devops/` from #20), and the
  **move-in / move-back procedures**
- **The exclusion was already live** — `EXCLUDED_DIRS` in `scripts/lib/book.ts` (built in #5) lists
  `Archive`, and both the build and the lint import it. This item confirmed it rather than adding it
- `build-book.sh` now names that list in its header comment, so the next reader finds the exclusion
  from the build script instead of guessing

**Verified empirically, not by reading the code.** Dropped a probe file at
`Archive/planning/__exclusion-probe.md` containing a ` ```python ` fence and a broken relative link —
two guaranteed violations — then re-ran everything:

| Check | Result |
| ----- | ------ |
| `pnpm book:collect` | 417 files, unchanged. `--list \| grep Archive` → **0** |
| `build/book.md` | Probe content **absent** |
| `pnpm lint:docs` | **2,227 violations, unchanged.** No rule regressed |

Probe removed afterwards. `Archive/README.md` is itself excluded — it is repo documentation, not a
chapter, so it gets no front matter and #3 will not stamp it.

> **One rule worth keeping:** archiving should make the `.lint-baseline.json` counts **fall**. Commit
> the lower numbers each time, so the gate ratchets down as #20–#31 run and can never drift back up.

---

# Phase 1 — Hygiene & Consistency

### - [x] 8. Remove planning artefacts from the content tree `S` — ✅ **done 2026-08-28**

Move to `Archive/planning/`:

- `Frontend/CONTENT_PLAN.md` (590 lines — describes work already done)
- `Frontend/PROGRESS.md` (290 lines — claims React/NextJs READMEs exist; they do not)
- `SystemDesign/REFACTOR-PLAN.md` (456 lines — refactor is complete)
- `Frontend/WebPerformance/LINKEDIN-CAROUSEL.md` (251 lines — marketing asset, not a chapter)

**Done when:** no planning or marketing file sits inside a content directory.

**Delivered:**

- All four `git mv`'d into `Archive/planning/`, renamed to source-prefixed lowercase names so their
  origin stays readable: `frontend-content-plan.md`, `frontend-progress.md`,
  `systemdesign-refactor-plan.md`, `webperformance-linkedin-carousel.md`
- `scripts/add-frontmatter.ts` — the four entries in `OUT_OF_BOOK_FILES` removed. They are under
  `Archive/` now, which `EXCLUDED_DIRS` already skips, so listing them again would be dead config
- `.claude/skills/linkedin-carousel/SKILL.md` — retargeted at `Archive/planning/`. It previously told
  Claude to write carousels "in the same directory as the source material", which would have
  recreated this exact violation on the next run. Small fix, outside the item's literal scope, but it
  guards the Done-when
- `pnpm lint:docs`: **2,227 → 2,218**. `front-matter` 416→412, `fence-language` 1704→1701,
  `too-long` 61→59. `.lint-baseline.json` committed at the lower numbers
- Nothing deleted; `git mv` throughout, so history follows each file

---

### - [x] 9. Fix all 32 broken internal links `M` — ✅ **done 2026-08-28**

Confirmed broken (run the checker again before starting — the list moves):

| File                                          | Broken targets                                      |
| --------------------------------------------- | --------------------------------------------------- |
| `Frontend/README.md`                          | `./React/README.md`, `./NextJs/README.md`           |
| `DSA/04`–`DSA/10` (7 files)                   | Off-by-one prev/next links after renumbering        |
| `Frontend/Html&CSS/07`, `08`                  | `./03-semantic-html.md`, `./05-responsive.md`       |
| `SystemDesign/InterviewQuestions/16`–`20`     | 11 links to files that were merged away             |
| `SystemDesign/Microservices/01`, `08`         | `./README.md` (directory has none)                  |

The `Frontend/README.md` ones resolve themselves in Phase 3. Fix the rest now.

**Done when:** the link checker reports zero broken relative links, once #13 and #18 have run.

> **Amended 2026-08-28.** The original "zero, now" was not reachable inside this item. Four of the 32
> are owned by later Phase 1 items: two point at `SystemDesign/Microservices/README.md`, which **#13**
> creates, and two at `Frontend/README.md`'s React/NextJs entries, which **#18** removes. Every link
> this item could fix is fixed; the count is 32 → 4.

**Delivered:**

- `Frontend/Html&CSS/07`, `08` — `03-semantic-html.md` → `01-semantic-html.md`,
  `05-responsive.md` → `05-responsive-design.md`
- `SystemDesign/InterviewQuestions/03` — the `RankingAndRecommendations.md` cross-reference **removed**,
  not repointed. No ranking chapter exists anywhere in the repo, and `BOOK-SPEC.md` does not plan one
- `SystemDesign/InterviewQuestions/16`–`20` — 11 links repointed at the numbered filenames that
  actually exist. Three targets had no equivalent and were rehomed by meaning rather than by name:
  `Scalability/rate-limiting.md` → `InterviewQuestions/12-rate-limiter.md` (used twice),
  `Scalability/consistent-hashing.md` → `Scalability/08-partitioning.md`,
  `../OOP/…` → `../../OOP/01-oop-fundamentals.md` (OOP sits at the repo root, so the old path was one
  level short as well as wrong)
- `DSA/04`–`10` — the seven off-by-one prev/next footers corrected. Link **text** was already right;
  only the filenames lagged the renumbering. `DSA/01` still has no footer at all — that is **#16**
- Links were repaired as relative paths, not converted to `#ch-<slug>` anchors. Anchors need front
  matter slugs, and **#3** has not run yet; **#71** does the conversion sweep
- `pnpm lint:docs --rule=broken-link`: **32 → 4**. Baseline committed at 4

---

### - [x] 10. Convert the remaining 415 JavaScript fences to TypeScript `L` — ✅ **done 2026-08-28**

Against a TypeScript-only rule. Distribution:

- `Frontend/JavaScript/` — 11 files (the bulk; expected, since it teaches JS — **decide explicitly**:
  recommendation is to keep plain-JS fences here only where the topic _is_ untyped JS semantics, mark them
  with an allow-list comment, and convert everything else)
- `Frontend/PWA/` — 7 files (convert all)
- `Backend/SQL/` — 2 files, `DevOps/Networking/` — 1 file (convert all)

Also normalise the 3 stray `​```ts`, 1 `​```jsx`, and 19 `​```tsx` fences (tsx is fine — keep it, add it to the
allow-list).

**Done when:** the fence check passes outside `DevOps/`, with a documented allow-list.

> **Amended 2026-08-28.** The original "the fence check passes" could not be met by this item, because
> 614 of the violations live in `DevOps/`, which **#20** archives ~80% of. Converting them would be
> work thrown away, and the plan already said so in #6's note. Everything outside `DevOps/` is now
> **zero**; re-run the count after #20 and finish whatever survives there.

**Delivered:**

- **All 415 `javascript` fences resolved: 378 converted, 37 exempted.** Not relabelled — retyped.
  Real interfaces, `ServiceWorkerGlobalScope` declarations, `FetchEvent`/`ExtendableEvent` parameters,
  generics on `memoize`, `partial`, `asyncHandler` and `batchFetch`, `satisfies` on message contracts,
  discriminated unions in place of `{ success: boolean }` result objects, and `catch (error: unknown)`
  with narrowing throughout — which is the correct 2027 pattern and the one the old code got wrong
- **632 unlabelled fences labelled `text`** across 175 files, in one scripted pass driven by the
  linter's own output. Every one was an ASCII diagram, a directory tree, an interview transcript or a
  worked-example trace — no code was hiding among them. **#74** converts the diagrams that warrant
  Mermaid; this item only had to stop them typesetting as unhighlighted mystery blocks
- **The allow-list mechanism**, in `scripts/lint-docs.ts` (`FENCE_EXEMPTION` / `fenceExemption`):

  ```markdown
  <!-- lint-allow-fence: javascript — why this fence has to stay untyped -->
  ```

  The reason after the em dash is required, and a marker naming a different language than the fence
  below it is reported as its own violation — so a marker cannot silently cover a fence that later
  changes language. Markers are HTML comments: invisible in the rendered book, visible in source
- **The 37 exemptions are all in `Frontend/JavaScript/01`–`05`**, and each states its own reason.
  They are the cases where TypeScript refuses to compile the exact thing the fence teaches: implicit
  coercion and `[] == ![]`, `arguments` inside an arrow, `this` inside an object-literal arrow, an
  undeclared assignment creating an implicit global, constructor functions assigning to `this`, and
  prototype-chain manipulation. `04-this-keyword.md` and `05-prototypes-inheritance.md` hold 30 of
  them, which is exactly what those two chapters are about
- Where a fence *could* carry an explicit `this:` parameter it was converted rather than exempted —
  `call`, `apply`, `bind` and method borrowing now teach how TypeScript models `this`, which is more
  useful than the untyped original
- Two fences were pseudo-syntax rather than code (`() => expression`, `obj.method() → this = obj`)
  and became ` ```text `; two React fences became ` ```tsx `
- **`BOOK-SPEC.md` amended to v1.1**, decision log rows **#10** and **#11**. Non-negotiable #1's
  allow-list gains `graphql`, `prisma`, `dockerfile`, `nginx` and `http`. This **completes** the list
  rather than relaxing the rule: these are declarative schema and configuration languages with no
  TypeScript form at all, on exactly the same footing as `sql`, `yaml` and `css`, which were already
  allowed. § 10's "relaxing the TypeScript-only rule" bar is not engaged — general-purpose languages
  still have to opt out one fence at a time. `ALLOWED_FENCES` in `scripts/lib/book.ts` regrouped and
  commented to make that distinction explicit
- Six ` ```markdown ` fences (PR, RFC and STAR templates) became ` ```text `. Nesting a markdown
  fence inside a markdown book invites confusion, and `text` already covers "copy this verbatim"
- `pnpm lint:docs`: `fence-language` **1701 → 614**, and every one of the 614 is in `DevOps/`

**Left for after #20:** the `DevOps/` remainder — 385 unlabelled and 229 labelled, of which 174 are
`hcl` (Terraform, out of scope per `BOOK-SPEC.md` § 6 and archived wholesale).

<!-- superseded partial note follows; kept so the amendment above has context -->

> ⚠️ **Superseded — this was the partial state before the item was finished.** This is an `L` item and the
> plan's own model table puts it on **Sonnet 5 at `low` effort**. The judgement half is finished; what
> remains is a mechanical sweep across 7 files. Do not redo the decisions below — apply them.

**Delivered so far:**

- **The allow-list mechanism now exists**, in `scripts/lint-docs.ts` (`FENCE_EXEMPTION` /
  `fenceExemption`). A single fence opts out of the TypeScript rule by carrying a marker on the line
  directly above it:

  ```markdown
  <!-- lint-allow-fence: javascript — why this fence has to stay untyped -->
  ```

  The language in the marker must match the fence, and the reason after the em dash is required.
  A marker that names a different language than the fence below it is reported as its own violation,
  so a marker cannot silently cover a fence that later changes. Markers are HTML comments: invisible
  in the rendered book, visible in source.
- **Converted in full:** `Backend/SQL/07`, `08` (7 fences), `DevOps/Networking/06-cloudfront.md` (1),
  all of `Frontend/PWA/` (107 across 7 files), and `Frontend/JavaScript/01`, `02`, `03` (62).
  Not relabelled — retyped: real interfaces, `ServiceWorkerGlobalScope` declarations, `FetchEvent` /
  `ExtendableEvent` parameters, generics on `memoize` and `partial`, `satisfies` on message contracts.
- **Six fences exempted**, each with its own reason — all in `Frontend/JavaScript/01`–`03`, all cases
  where TypeScript refuses to compile the very thing the fence teaches: implicit coercion,
  `[] == ![]`, `arguments` inside an arrow, `this` inside an object-literal arrow, an undeclared
  assignment creating an implicit global.
- One fence in `02-functions-scope.md` was pseudo-syntax, not code (`() => expression`). It became a
  ` ```text ` fence rather than being typed.
- `pnpm lint:docs`: `fence-language` **1701 → 1524**. Baseline committed at 1524.

**The decision to apply to the remaining 7 files** — this is the item's real content, now settled:

| File | Fences | Call |
| ---- | ------ | ---- |
| `04-this-keyword.md` | 35 | **Mostly exempt.** The chapter's subject is dynamic `this`; most fences demonstrate bindings TypeScript rejects under `noImplicitThis`. Convert only those not turning on `this`: the `bind(null, …)` partial application, the `class` field arrow, and the pseudo-syntax line (→ ` ```text `). Where a fence *can* carry an explicit `this:` parameter, prefer that over exempting — it teaches how TypeScript models `this` |
| `05-prototypes-inheritance.md` | 26 | **Mixed.** Prototype-chain manipulation (`Object.create`, `__proto__`, `Constructor.prototype.method = …`) stays JavaScript; anything expressible as a `class` converts |
| `06-promises-async.md` | 27 | **Convert all.** `Promise<T>` is where types earn their keep |
| `07-event-loop.md` | 10 | **Convert all.** Scheduling order does not depend on typing |
| `08-es6-features.md` | 44 | **Convert all** |
| `09-array-object-methods.md` | 55 | **Convert all.** Generic signatures on `map` / `filter` / `reduce` are the point |
| `10-error-handling.md` | 42 | **Convert all**, using `catch (error: unknown)` and narrowing — the correct 2027 pattern |
| `README.md` | 1 | Convert |

**Still out of scope for this item:** the 1,017 unlabelled fences. They are a separate backlog the
plan already noted mostly lives in `DevOps/`, which **#20** archives. Re-count after #20 rather than
burning a session on files that are about to leave the book.

---

### - [x] 11. Rename `Frontend/Html&CSS/` → `Frontend/HtmlCss/` `S` — ✅ **done 2026-08-28**

The `&` breaks URLs, shell globs, and some static-site generators. Update all inbound links.

**Done when:** directory renamed, no link references the old path.

**Delivered:**

- `git mv "Frontend/Html&CSS" Frontend/HtmlCss` — all 9 files moved with history intact
- Three inbound references updated: `Frontend/README.md` (the index link),
  `scripts/lib/book.ts` (`PART_DIRS`) and `scripts/add-frontmatter.ts` (its own copy of the
  part mapping). Missing either script would have put these 8 chapters in the wrong book part
- `grep` across every content directory and `scripts/` returns no remaining `Html&CSS`. The two
  surviving mentions are in `Archive/planning/frontend-progress.md` and this plan file, where they
  are historical record rather than live links
- `pnpm lint:docs`: no rule regressed

---

### - [x] 12. Unify chapter openings across all files `L` — ✅ **done 2026-08-28**

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

> ✅ **Finished in run #3.** The block that was here said `DevOps/` was blocked behind #20. It no
> longer is: #20 runs #1 and #2 archived ~80% of the directory, renamed the rest to `ShipAndOperate/`
> and settled every surviving slug, which was the whole reason to wait. Run #3 closed the remaining
> 29 files.
>
> Nothing is half-applied in any of the three runs: work proceeds one file at a time and every
> directory attempted was finished.

**The canonical opening, now settled.** Three blocks, nothing between them, no `---` rule after:

```markdown
# Chapter Title {#ch-chapter-slug}

> One sentence saying what the reader can *do* after this chapter.

**In this chapter:** item · item · item · item
```

Rules learned while applying it:

- The H1 slug is the chapter's identity — **#3** must derive the same `slug`, and **#71** points every
  cross-reference at it. Pick it here, once, and do not change it later
- The old opening runs from the H1 down to the **first `## ` heading**. That whole block gets replaced,
  which removes the hand-written tables of contents, the `[← Back to …]` back-links and the stray `---`
  rules in one pass
- The promise is one sentence and says what the reader can *do* — not what the topic *is*.
  "Predict the exact order a piece of asynchronous code will log" beats "an overview of the event loop"
- **In this chapter:** is 4–6 items joined by ` · `, no full stop

**Delivered:**

- `Frontend/HtmlCss/` — all 8 chapters. Four already had a blockquote promise and four had a bare
  paragraph; all eight now match, and all eight gained `{#ch-…}` anchors and an **In this chapter:** line
- `Frontend/JavaScript/` — all 10 chapters. These were the worst offenders: `# Title` →
  `## Understanding …` with no promise at all. Two titles were also corrected in passing —
  "ES6+ Features" → "ES2015 and Later Features" and "Data Types & Variables" → "Data Types and
  Variables" (non-negotiable #8 forbids a version-less "modern"; an ampersand in a title fights the
  same URL problem #11 just fixed)

**Done — 244 chapters, every part except VIII:**

| Directory | Chapters |
| --------- | -------- |
| `Frontend/` — HtmlCss, JavaScript, TypeScript, BrowserAPIs, Internationalization, CSSArchitecture, PWA, Security, Testing, WebPerformance | 76 |
| `Backend/` — API, DesignPatterns, NoSQL, NodeJS, SQL, Security, Testing | 46 |
| `SystemDesign/` — BuildingBlocks, Database, Frontend, Fundamentals, Infrastructure, Microservices, Scalability, Security | 71 |
| `SystemDesign/InterviewQuestions/` — the 20 case studies | 20 |
| `DSA/` | 16 |
| `OOP/` · `Behavioral/` · `Communication/` | 22 |

**How it was applied.** `scripts/`-adjacent helper, kept in the session scratchpad rather than
committed: find the H1, find the first `## ` below it, replace everything between. That removes the
hand-written table of contents, the `[← Back to …]` back-link and the stray `---` rule in the same
pass, which is why `heading-jump` fell to **0** as a side effect — those files opened `# Title` →
`### Something`. Front matter, where present, is preserved.

**Two things this exposed, worth knowing before finishing:**

- **A chapter's slug is decided here and nowhere else.** #3 must derive the same `slug`, and #71
  points every cross-reference at it. Renaming one later breaks both. Two titles were corrected in
  passing for this reason — "ES6+ Features" → "ES2015 and Later Features" (non-negotiable #5 forbids
  a version-less label) and "Data Types & Variables" → "Data Types and Variables" (an ampersand in a
  title fights the same URL problem #11 just fixed).
- **The promise has to say what the reader can *do*.** "Predict the exact order a piece of
  asynchronous code will log" is a promise; "an overview of the event loop" is a table of contents
  entry. Roughly a third of the first drafts had to be rewritten on that test alone.

**Delivered — run #2, 2026-08-28: the part-opener READMEs.**

**The decision the previous session left open: yes, the READMEs are this item's job.** The "Done
when" says *every in-book file*, and a README that still opened with `## 📚 Topics Covered` was the
last surviving competing convention. They follow the *other* standard — `write-topic-docs` §
"Part-Opener READMEs": 60–150 lines, `chapter: 0`, **no `{#ch-}` anchor**, a chapter table and a
**What Interviewers Probe For** section — so "the same three blocks" means the part-opener three, not
the chapter three. The ten written at **#13** were the model.

**22 READMEs rewritten.** Every in-book README outside `DevOps/` now carries: `# Part N — Name`, one
or two paragraphs on why the section exists, a chapter table with a *what it answers* column, **What
Interviewers Probe For** built on the part's senior signal from `BOOK-SPEC.md` § 4, and a **Reading
Order** with an interview-sprint path.

| Part | READMEs |
| ---- | ------- |
| I | `Frontend/JavaScript` · `Frontend/TypeScript` · `Backend/DesignPatterns` |
| II | `Frontend/HtmlCss` · `Frontend/BrowserAPIs` · `Frontend/CSSArchitecture` · `Frontend/Internationalization` · `Frontend/PWA` |
| IV | `Frontend/Security` · `Frontend/Testing` · `Frontend/WebPerformance` |
| V | `Backend` (part opener) · `Backend/API` · `Backend/NodeJS` · `Backend/NoSQL` · `Backend/Security` |
| VI | `SystemDesign` (part opener) · `SystemDesign/Database` |
| IX | `Behavioral` · `Communication` |
| Appendix | `DSA` |

Plus `OOP/README.md` as a **transitional index** (`in_book: false`), matching the three written at
**#13** for directories that later items dissolve: a per-chapter destination table pointing at #26,
and a line saying no part-opener is written for a part that is being dissolved.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0, no rule
  regressed. `too-long` **49 → 48** — `Frontend/PWA/README.md` was 517 lines and is now 65.
  `.lint-baseline.json` committed at the lower number

**Delivered — run #3, 2026-08-28: Part VIII, and the item closes.**

**29 files, and the last competing convention is gone.** The blocker this item carried for two runs
was #20, and #20's structural half discharged it: the archive is done, `ShipAndOperate/` exists, and
every surviving slug is fixed. Nothing here had to guess at a path that might move.

| Where | Files | What they were opening with |
| ----- | ----- | --------------------------- |
| `ShipAndOperate/Git/` | 6 | `# Title` → `## Overview`, or straight into `## Commit Messages` |
| `ShipAndOperate/Containers/` | 7 | five with `## Overview`, two with a bare paragraph |
| `ShipAndOperate/CICD/` | 5 | bare paragraph, no promise, no anchor |
| `ShipAndOperate/Observability/` | 4 | bare paragraph, no promise, no anchor |
| `ShipAndOperate/Cloud/` | 4 | bare paragraph, no promise, no anchor |
| `DevOps/Agile/` | 3 | bare paragraph — the three chapters #3 marks `in_book: true` |

`ShipAndOperate/Deployment/`'s four chapters already complied (written to standard at #20 run #2), and
all six `ShipAndOperate/` section READMEs were written to the part-opener standard in the same item.

**The audit that decides this, not a spot check.** A scratchpad script walks `loadBook()` and asserts,
for every in-book non-README file, that the H1 carries `{#ch-…}`, that line H1+2 is a `> ` promise and
that line H1+4 is an **In this chapter:** line — the exact three blocks, in the exact positions.
It reports **244 chapters ok, 0 failing.** A second pass over the 34 in-book READMEs confirms every
one opens `# Part N — Name` (`DSA/README.md` opens `# Appendix — DSA Patterns`, correct by design).

**Three identity corrections, made here because this is the item that owns chapter identity:**

- **`ShipAndOperate/Git/04-best-practices.md`: slug `devops-git-best-practices` → `git-best-practices`.**
  The `devops-` prefix was a depth-2 qualification from when the file lived under `DevOps/Git/`; the
  brand it names no longer exists. `git-best-practices` was free, and `add-frontmatter.ts` confirms all
  **332 slugs unique** after the change. It was the only in-book `ShipAndOperate/` slug still carrying
  the dead prefix, and #71 has not bound to it yet.
- **Two ampersand titles fixed**, on the same rule that corrected "Data Types & Variables" in run #1:
  "Monitoring & Observability Fundamentals" → "Monitoring and Observability Fundamentals", and
  "Alerting & On-Call" → "Alerting and On-Call". `DevOps/Agile/07`'s "Metrics & KPIs" → "Metrics and
  KPIs" for the same reason. Slugs are derived from the **filename**, not the title, so none moved.
  Two stale nav-footer labels inside `Observability/` were updated to match.

**`DevOps/Agile/README.md` became a transitional index**, exactly as `OOP/README.md` did in run #2 and
for the same reason: it was the last file in the book still opening `# … - Interview Preparation` →
`## Table of Contents`, and **#25** dissolves the directory into two Part IX chapters. Writing a real
`# Part IX — …` opener for a section that stops existing would be work created for a later item to
delete. It is now `in_book: false`, with a per-chapter destination table pointing at #25 and a line
saying no part-opener is written for a section being dissolved. That drops Part IX from 22 in-book
files to 21 and the book from 279 files to 278.

**What a promise had to earn.** The same test as run #1 — say what the reader can *do*. "Explain what
happens between `kubectl apply` and a running pod, and why the system is a loop rather than a script"
survives it; "an overview of Kubernetes architecture" does not. The `Cloud/` promises were also written
**cloud-neutral** even though the bodies are still AWS-only, because #20's remaining trim has to make
those bodies neutral and the opening should not have to be rewritten twice.

**Verified:**

- Opening audit: **244 chapters pass all three blocks, 0 fail**; all 34 in-book READMEs are part openers
- `pnpm lint:docs`: 278 files — `front-matter` **0**, `broken-link` **0**, `missing-readme` **0**,
  `heading-jump` **0**. `fence-language` **91** and `too-long` **47**, both unchanged at baseline —
  **no rule regressed**, and no new baseline commit was needed
- `scripts/add-frontmatter.ts`: **332 slugs, all unique**, every in-book file has a part, and
  **idempotent on the second pass** (`changed: 0`) — the hand-set titles and the renamed slug survive it
- `pnpm book:collect`: **278 files, 95,745 lines**, no unmapped files
- `git status`: **30 files modified, none added or deleted**

**One thing deliberately left undone.** `DevOps/GenAI/` (9 files) got no openings — every file there is
`in_book: false`, so it is outside this item's "every in-book file", and **#21** archives the directory.
- `pnpm book:collect`: 276 files, 96,505 lines, no unmapped files
- All 28 in-book non-DevOps READMEs check out mechanically: `chapter: 0`, a chapter or section table,
  a **What Interviewers Probe For** section, a **Reading Order**, and **zero `{#ch-}` anchors**
- Every file is 59–77 lines, inside the 60–150 budget bar `Backend/NoSQL` and `Frontend/BrowserAPIs`
  landing a line or two either side of the floor. `OOP/` is 38, matching the #13 transitional shape
- Retired emoji (`📚 🎯 🚀 📁 📋 ✨ 🔴 …`) are gone from all 22; the only callout used is `⚠️`

**Three corrections this run forced:**

- **`Backend/README.md` and `SystemDesign/README.md` are real part openers, not domain indexes.**
  Both map entirely to one part (V and VI), so both were rewritten as `# Part N —` openers listing
  *sections* rather than chapters. `Frontend/README.md` cannot be one — it spans Parts I, II, III and
  IV — which is why **#18** correctly left it `in_book: false`
- **`OOP/` has no SOLID chapter.** The first draft of its transitional index claimed SOLID was
  duplicated between `OOP/` and `Backend/DesignPatterns/`. It is not — `grep` returns nothing.
  SOLID exists once, in `Backend/DesignPatterns/05-solid-principles.md`
- **Chapter counts in the two section tables were wrong on first pass** — `Backend/Testing` is 6 not
  5, `SystemDesign/Frontend` is 13 not 12. Both corrected against `ls`

> 🔴 **Gap this run exposed — nobody owns the PWA trim.** `Frontend/PWA/` is **6,002 lines** across
> six chapters, every one over the 400-line limit and three over 1,000. The budget table at the
> bottom of this plan counts a **6,200-line "browser platform trimmed (PWA is 6,002 lines today)"**
> cut, but **no numbered item performs it** — #74 is Mermaid diagrams, #76 is the editorial voice
> pass, and neither trims length. Either a new item is needed or #76's scope has to grow. The
> `Frontend/PWA/README.md` callout records this so it is not lost.

**Still to do — Part VIII. Updated after #20 run #1, 2026-08-28.**

The old estimate said *130 chapters and 16 READMEs*. #20 has now archived 98 of those files and moved
the survivors, so what is actually left is much smaller:

| Where | Chapters | READMEs | Note |
| ----- | -------- | ------- | ---- |
| `ShipAndOperate/` | 26 | **0** | #20 run #1 wrote five section READMEs; run #2 added `Deployment/` — its 4 chapters and README **already comply**, so they are not counted here |
| `ShipAndOperate/README.md` | — | 1 | Does not exist yet. **#30** writes it |
| `DevOps/Agile/` | 8 | 1 | **#25** condenses these into two Part IX chapters — do not open them here |
| `DevOps/GenAI/` | 8 | 1 | **#21** salvages two files into `AI/`; the rest archives |

**So this item's remaining work is 26 chapter openings in `ShipAndOperate/`**, and nothing else — the
Agile and GenAI files are about to be rewritten or archived by #21 and #25. Those 26 still carry their
old `# Title` → `## Overview` shape and a relative-link nav footer at the bottom; #20 regenerated the
footers so they resolve, but they are still relative paths for **#71** to convert.

⚠️ **Wait for #20 to finish before writing these openings.** Run #1 moved the files; the trim runs still
have to cut Part VIII from 7,070 lines to its 3,500-line budget, and `Cloud/` still merges 4 chapters
into 3. An opening written for a chapter that is about to be merged is thrown away.

---

### - [x] 13. Add the 10 missing directory READMEs `M` — ✅ **done 2026-08-28**

Missing in: `Backend/Testing`, `Backend/SQL`, `SystemDesign/Microservices`, `SystemDesign/Fundamentals`,
`SystemDesign/InterviewQuestions`, `SystemDesign/Frontend`, `SystemDesign/Security`,
`SystemDesign/BuildingBlocks`, `SystemDesign/Scalability`, `SystemDesign/Infrastructure`.

Each README becomes a **part opener** in the book: what the part covers, why it matters, reading order,
and what an interviewer is actually probing for.

**Done when:** every content directory has a README and it reads as a part/chapter opener.

**Delivered:**

- `pnpm lint:docs --rule=missing-readme` is **0**, down from 10. That rule now hard-fails on its own.
- **Seven full part-openers**, to the standard in `write-topic-docs` (title, why the part exists,
  chapter table with "what it answers", **What Interviewers Probe For** lifted from the matching
  senior signal in `BOOK-SPEC.md`, and a reading order with an interview-sprint path):
  `Backend/SQL`, `Backend/Testing`, `SystemDesign/Fundamentals`, `SystemDesign/BuildingBlocks`,
  `SystemDesign/Frontend`, `SystemDesign/Microservices`, `SystemDesign/InterviewQuestions`
- **Three deliberately short transitional indexes** for directories that later items dissolve:
  `SystemDesign/Security` (#24 merges it into `Frontend/Security/` and `Backend/Security/`),
  `SystemDesign/Scalability` and `SystemDesign/Infrastructure` (#23 folds and archives them).
  Each says plainly that it is transitional and gives a per-chapter destination, which is more useful
  to the next session than a part-opener for a part that is about to stop existing. All three carry
  `in_book: false` so the build never collects them.
- All ten got front matter in the same pass. Without it `front-matter` would have gone **412 → 422**
  and failed CI; part-openers use `chapter: 0` per the standard.
- The `InterviewQuestions` opener marks which ten of the twenty case studies **#28** keeps, so that
  item arrives with the decision already visible.
- `.lint-baseline.json`: `missing-readme` 10 → **0**, `broken-link` 4 → **2**.

> 🔴 **Gap this item exposed — `SystemDesign/Microservices/` is unaccounted for.** #23's "Done when"
> lists the five directories `SystemDesign/` should end with — `Fundamentals/`, `BuildingBlocks/`,
> `Database/`, `Frontend/`, `CaseStudies/` — and Microservices is not one of them. But no item moves,
> merges or archives it, and its 8 chapters (1,756 lines) are not in any budget. #23 needs a decision
> added: fold the useful chapters into `BuildingBlocks/` and `Backend/`, or keep the directory and
> correct #23's list. A full part-opener was written for it in the meantime, on the assumption the
> content survives somewhere.

---

### - [x] 14. Fix the Behavioral numbering gaps `S` — ✅ **done 2026-08-28**

Present: `01, 03, 04, 05, 06, 07, 11, 14`. Missing: `02, 08, 09, 10, 12, 13`.
Either write the missing topics (item 61) or renumber to a contiguous `01`–`08`. **Recommendation:**
renumber now, add new topics at the end later.

**Done when:** `Behavioral/` is contiguously numbered and the README index matches.

**Delivered:**

- Renumbered to a contiguous `01`–`08` by `git mv`, taking the plan's recommendation (renumber now,
  write the missing topics at #61 rather than leave six holes in the meantime):
  `03`→`02`, `04`→`03`, `05`→`04`, `06`→`05`, `07`→`06`, `11`→`07`, `14`→`08`
- Every inbound link rewritten — both the `./NN-name.md` form and the bare `NN-name.md` form the
  README uses. The bare form is easy to miss: a first pass that only handled `./` left two broken
  links that `lint:docs` caught
- Two link labels in `Behavioral/README.md` were bare numbers (`see [14](…)`, `read [01](…)`) and
  would have gone stale silently. Replaced with the chapter titles, which cannot drift
- `pnpm lint:docs --rule=broken-link` clean for `Behavioral/`

---

### - [x] 15. Fix the Communication numbering gap `S` — ✅ **done 2026-08-28**

Present: `01–06, 08, 09`. Missing: `07`. Renumber contiguous.

**Done when:** `Communication/` is `01`–`08` with a matching README.

**Delivered:**

- `08-written-communication`→`07`, `09-active-listening`→`08`. Now contiguous `01`–`08`
- **The README did not actually match, and the gap was not the only reason.** Its numbered list was in
  *reading-priority* order (01, 02, 05, 04, 09, 03, 06, 07), so its ordinals disagreed with the
  filenames regardless of the missing `07`. Rewritten in file order, with a one-line pointer to the
  existing **Study Priority** section for the route through them — the two orderings are both useful,
  they just cannot share one list
- The Study Priority routes still referenced `09`; updated to `08`
- `Communication/03-english-fluency.md` keeps its number, so `scripts/add-frontmatter.ts:238` needed
  no change. Worth checking after any renumber — that path is hardcoded there

---

### - [x] 16. Fix the DSA prev/next chain `S` — ✅ **done 2026-08-28**

Files `04`–`10` link to filenames from an older numbering scheme (`./02-two-pointers.md` when the file is
`03-two-pointers.md`). Regenerate the prev/next footer for all 16 files from the README order.

**Done when:** every DSA file's prev/next links resolve.

**Delivered:**

- All 16 footers **regenerated from `DSA/README.md`'s order**, not patched. The README's numbered list
  is parsed for `(title, filename)` pairs and the footer is derived — so the chain cannot drift from
  the index again, and the same script re-runs cheaply after any renumber
- `01-time-space-complexity.md` had **no footer at all**; it now opens the chain. That one was outside
  #9's scope, which only saw the seven files whose links were broken rather than missing
- Titles in the footers now come from the README too, so "In-place Reversal of LinkedList" and
  "Top 'K' Elements" match the index exactly instead of the abbreviated forms that were there
- `pnpm lint:docs --rule=broken-link` reports nothing in `DSA/`. The only two left in the repo are
  `Frontend/README.md`'s React and NextJs entries, which **#18** removes

---

### - [x] 17. Rewrite the root `README.md` `M` — ✅ **done 2026-08-28**

Current problems: advertises React and Next.js coverage that does not exist; lists a 2024-era resource
section (Clément Mihailescu, "JavaScript: The Good Parts"); mixes a personal checklist with a repository index;
ends with a Steve Jobs quote.

New root README should be: what the book is → the nine parts with links → who it is for → how to read it →
status table. Move the personal checklist to `Behavioral/` or `Archive/`.

**Done when:** the root README is a book front door, not a personal to-do list.

**Delivered:**

- Restructured to the item's shape: what the book is → **the nine parts, as a table** with each part's
  budget and the directory it currently lives in → the two holes in the hull → who it is for → how to
  read it (the three reading paths from `BOOK-SPEC.md` § 8) → repository layout → how to contribute
- The **Career Readiness Checklist** and the 2024 **Resources** list moved to
  `Archive/planning/personal-readiness-checklist.md`, not deleted. That file also carries the note
  that #73 writes the book's Further Reading from scratch rather than salvaging it
- `salmanrahman.com` is gone from the root README — the last remaining personal URL there
- Status table corrected: progress 6 → 13, file count 417 → 423. The "builds to a 3,694-page PDF"
  claim was dropped rather than updated; nothing in this session re-ran `book:pdf`, so it would have
  been an unverified number
- **Two of the item's stated problems were already fixed** and are recorded here so the next session
  does not go looking: the Steve Jobs quote and the React/Next.js *advertising* in the root README had
  both gone in an earlier pass. What remained was the checklist, the resource list and the personal URL

---

### - [x] 18. Rewrite `Frontend/README.md` `M` — ✅ **done 2026-08-28**

Same problems, plus dead links and `**Last Updated**: November 2024`. Rebuild it around the new
Part II + Part III + Part IV structure.

**Done when:** `Frontend/README.md` indexes only directories that exist, with no date stamp in the body
(front matter carries `updated`).

**Delivered:**

- Rebuilt around the part structure. The correction worth knowing: the item says "Part II + Part III +
  Part IV", but `Frontend/` actually carries **Parts I, II and IV** — `JavaScript/` and `TypeScript/`
  map to Part I in `scripts/lib/book.ts`, not Part II. Part III is the empty `ModernStack/`. The new
  README opens with a table making that three-way split explicit, because "Frontend = one part" is the
  misreading the old file encouraged
- Dead `./React/README.md` and `./NextJs/README.md` links removed, with a line saying plainly that
  those directories never existed. **`broken-link` is now 0** across the whole repository — which also
  completes **#9**'s original "Done when", as that item predicted
- Gone: `**Last Updated**: November 2024`, `salmanrahman.com`, the three study tracks, the personal
  interview checklist, the FAANG-vs-startup section, the 2024 book list (including
  *JavaScript: The Good Parts*, which #17 flags), and the closing "Good luck! 🎉"
- Each part now carries its **senior signal** from `BOOK-SPEC.md`, and there is a reading order with
  an interview-sprint path — the same shape as the part-openers written at #13
- Fixed a duplicate `["Frontend/HtmlCss", 2]` entry in `scripts/lib/book.ts`. #11's rename had
  rewritten both the original line and the "post-rename" placeholder beneath it into the same value
- `.lint-baseline.json`: `broken-link` 2 → **0**. That rule now hard-fails on its own

---

### - [x] 19. Purge personal identity from in-book content `S` — ✅ **done 2026-08-28**

`salmanrahman.com` appears in at least 6 files, alongside a personal interview checklist and an author-specific
resource list. In a published book these belong in **About the Author** and **Further Reading**, once each,
not sprinkled through chapters.

**Done when:** no chapter body contains a personal URL; a single `About-the-Author.md` exists for the back matter.

**Delivered:**

- `grep -rn salmanrahman` across every content directory returns **nothing**. Three of the six
  occurrences had already gone with #17 and #18 (root README, `Frontend/README.md`); this item removed
  the last live one, in `DSA/README.md`'s resource list. The only surviving mentions are in
  `Archive/planning/` and in this plan file, neither of which is in the book
- `About-the-Author.md` written at the repo root, to the Book Chapter Standard, with `part: 9` and
  `chapter: 99` so it sorts into the back matter. It carries the two things that actually explain the
  book's shape rather than a biography: **why it is frontend-heavy** and **why Svelte is one of the
  three frameworks** — both of which `BOOK-SPEC.md` § 4 asserts without ever saying who is asserting it
- Also removed `Good luck with your AWS DevOps engineering journey! 🚀` from `DevOps/README.md` — the
  same class of personal-note sign-off, caught by the same sweep
- The two cross-references in `About-the-Author.md` point at `#ch-preface` and `#ch-further-reading`,
  which **#72** and **#73** create. Anchors, not file paths, so the link checker stays green
- `pnpm book:collect` places it correctly and reports no unmapped files

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

**Delivered — run #1, 2026-08-28: the structural move. Box stays unticked; the trim half is not done.**

`DevOps/` had **147 files**. They are now **31 in `ShipAndOperate/`**, **98 in `Archive/devops/`**, and
**18 still in `DevOps/`** — `Agile/` (9, belongs to **#25**) and `GenAI/` (9, belongs to **#21**). 147
accounted for, nothing deleted, every move a `git mv` so history follows the file.

**#3 did the deciding, exactly as its ordering note promised.** Every keep-or-archive call was already
in the front matter as `in_book: true` / `false`, so this run was "move the files the metadata already
marked" rather than 147 fresh judgement calls. Running #3 first was worth what the note claimed.

| `ShipAndOperate/` section | Chapters | From                                        |
| ------------------------- | -------- | ------------------------------------------- |
| `Git/`                    | 6        | `DevOps/Git/` — all of it, unchanged         |
| `Containers/`             | 7        | `Docker/` 5 of 9 + `Kubernetes/` 2 of 10     |
| `CICD/`                   | 5        | `CICD/` 5 of 8 — the vendor pipelines go     |
| `Observability/`          | 4        | `Monitoring/` 4 of 8                         |
| `Cloud/`                  | 4        | `AWS/` 4 of 15                               |
| `Deployment/`             | **0**    | **not written — 4 new chapters, run #2**     |

**Four decisions this run had to make, because the item did not:**

- **Kubernetes has no section in the item's keep table, but #3 marks two of its chapters `in_book: true`.**
  They are now `Containers/06-kubernetes-architecture.md` and `07-pods-and-deployments.md`, sitting under
  Docker in a renamed `Containers/` section. A two-chapter `Kubernetes/` section with its own README would
  have been thin, and "my service runs in a pod somewhere" — the scope `BOOK-SPEC.md` § 6 allows — is
  container literacy, not a section of its own.
- **Chapters were renumbered to close the gaps.** `Docker/01,02,03,06,09` became `Containers/01–05`, and
  the same for `CICD`, `Observability` and `Cloud`. `slug:` is derived from the title, not the filename,
  so no slug moved and **#71** is unaffected.
- **`Cloud/` chapters were retitled off their AWS branding** — `AWS Fundamentals` → `Cloud Fundamentals`,
  `AWS Lambda (Serverless)` → `Serverless Functions`, `S3` → `Object Storage`, `CloudFront (CDN)` →
  `Content Delivery Networks`. ⚠️ **The bodies are still AWS-only.** Retitling fixed the chapter identity
  now, before **#12** and **#71** bind to it; making the prose cloud-neutral is run #2's job.
- **`DevOps/README.md` went to `Archive/devops/README.md`.** It was a 1,378-line index of content that is
  now 80% archived, and every one of its ~250 links pointed at a moved file. `ShipAndOperate/` currently
  has **no part opener** — that is **#30**, which the plan already schedules for after this item. The lint
  is quiet about it because `missing-readme` only fires on a directory holding loose `.md` files, and
  `ShipAndOperate/` holds only sub-directories.

**The five section READMEs were rewritten, not patched.** `Git`, `Containers`, `CICD`, `Observability`
and `Cloud` each got a part-opener README to the `write-topic-docs` standard — 55–61 lines, `chapter: 0`,
no `{#ch-}` anchor, a chapter table with a *what it answers* column, **What Interviewers Probe For** built
on Part VIII's senior signal (*owns the change all the way to production, including the way back*), and a
**Reading Order** with an interview-sprint path. Pruning the old "Interview Preparation" indexes link by
link would have left them describing chapters that no longer exist; only this item knows what each section
now is. **This closes five of the sixteen READMEs #12 was waiting on.**

**Links.** 95 broken links appeared the moment the files moved; all 95 are fixed. The 26 chapter nav
footers were regenerated against the new sequence, `DevOps/Agile/` was repointed at
`../../ShipAndOperate/…` for the four targets that survived, and the pointer in `02-prometheus.md` at
the archived `Kubernetes/09-monitoring.md` was removed.

**Verified:**

- `pnpm lint:docs`: `broken-link` **0** (95 → 0), `front-matter` 0, `missing-readme` 0, `heading-jump` 0.
  `fence-language` **97 → 91** and `too-long` **48 → 47** as the archived files left the in-book set;
  `.lint-baseline.json` committed at the lower numbers
- `scripts/add-frontmatter.ts` re-run and **idempotent on the second pass** (`changed: 0`, 327 files,
  all slugs unique). Part VIII now reports **31** in-book files, down from 33
- `pnpm book:collect`: **274 files, 94,868 lines**, no unmapped files — down from 276 / 96,505
- `147 = 31 + 98 + 18`, and `git status` shows **no deletions**

**Two corrections the run forced:**

- **The item's own arithmetic does not close.** Its keep table sums to **27 chapters** — 6 + 5 + 5 + 4 + 4
  + 3 — but the "Done when" says **~25 files**, which would have to include the READMEs too.
  `BOOK-SPEC.md` § 4 says something different again: **~18 chapters** in 3,500 lines. Part VIII today is
  **7,070 lines across 26 chapters**, before `Deployment/` adds four more. Whichever target is real,
  roughly half the surviving prose still has to go. The trim runs decide which; nobody has yet.
- **`scripts/add-frontmatter.ts` was cleaned of dead paths.** Eight `OUT_OF_BOOK_DIRS` entries and 30
  `OUT_OF_BOOK_FILES` entries named `DevOps/` paths that are now under `Archive/`, which `findMarkdown()`
  already skips. They were harmless but misleading. `DevOps/GenAI` and the `DevOps/Agile/*` entries stay,
  because #21 and #25 have not run.

**Delivered — run #2, 2026-08-28: `ShipAndOperate/Deployment/`, the section that did not exist.**

The keep table promised four new chapters and run #1 wrote none of them, because they are new book
prose rather than a file move. They exist now — 867 lines across four chapters and a section README,
every one written to the Book Chapter Standard from the start rather than inherited and patched.

| File | Lines | What it owns |
| ---- | ----- | ------------ |
| `01-platform-deploys.md` | 220 | The immutable artefact, atomic promotion, edge versus regional execution, version skew |
| `02-preview-environments.md` | 218 | Per-branch deployments, the database problem, protecting a preview, when not to make one |
| `03-rollback.md` | 207 | One-way doors, roll back versus fix forward, automating the trigger |
| `04-feature-flags.md` | 223 | Deploy versus release, the four kinds of flag, where to evaluate, flag debt |
| `README.md` | 64 | Section opener, to the same standard as the other five |

**These are the first files in Part VIII that already satisfy #12.** Each has the six blocks, an H1
carrying `{#ch-<slug>}`, a one-sentence promise, an **In this chapter:** line, Key Takeaways, Interview
Questions and What to Read Next. Deliberately **no relative-path nav footer** — the other 26 chapters
have one and #71 has to strip them; adding four more would have been work created for a later item.
So #12's remaining Part VIII scope is **26 openings, not 30.**

**Context7 was used** (`/websites/vercel`) for promotion, instant rollback, immutable deployment URLs,
skew protection, per-branch preview environment variables and protection bypass. Platform specifics are
named as platform specifics; the chapters lead with the concept, per non-negotiable #9.

**One de-duplication this forced.** `CICD/03-deployment-strategies.md` carried a 27-line "Feature Flags"
section and a rollback section that the new chapters now own properly. Both are cut to a short table
plus a cross-reference — 293 → 284 lines. The canary-versus-flag comparison stays in both places on
purpose: it is the question the pipeline round asks, and it reads differently from each side.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0.
  `fence-language` and `too-long` both unchanged at baseline (91 / 47) — **no rule regressed.**
  One unlabelled fence in the new `01-` was caught by the lint and labelled `text`
- `scripts/add-frontmatter.ts`: 332 files, **all slugs unique**, every in-book file has a part.
  Part VIII is now **36** in-book files, up from 31
- `pnpm book:collect`: 279 files, 95,795 lines, no unmapped files

**Still to do before this box can be ticked:**

| # | Work | Why it was not done now |
| - | ---- | ----------------------- |
| 1 | `Cloud/` 4 → 3: merge object storage and CDN, and make all four bodies cloud-neutral rather than AWS-only | Prose rewrite, not a move |
| 2 | `Observability/` — fold the useful half of the archived `kubernetes/09-monitoring.md` in, and add frontend RUM | The item asks for both; neither is a file move |
| 3 | The trim to budget — **7,992 lines across 30 chapters** against `BOOK-SPEC.md`'s 3,500 across ~18 | The largest remaining piece of this item. See the arithmetic correction above |

> ⚠️ **Run #2 made the budget gap wider, knowingly.** Part VIII went from 7,070 to 7,992 lines because
> the item's own keep table requires a `Deployment/` section and it had none. The trim run now has to
> cut roughly 4,500 lines rather than 3,500. That is the right order: `Deployment/` is the only content
> in Part VIII written to the current standard, so it sets the shape the trim cuts *towards* rather than
> being another thing to cut. The obvious candidates are `Git/` at 1,609 chapter lines across six and
> `Containers/` at 1,457 across seven (1,665 and 1,518 with their READMEs) — the two largest sections, and the two furthest from the
> "what a frontend-heavy full stack engineer is asked about" test.

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

> **Updated after #20 run #1, 2026-08-28.** The 1,378-line file is now at `Archive/devops/README.md`
> and `ShipAndOperate/` has **no README at all** — the lint stays quiet because `missing-readme` only
> fires on a directory holding loose `.md` files. This item now writes a new file rather than trimming
> an old one. The five section READMEs beneath it (`Git`, `Containers`, `CICD`, `Observability`,
> `Cloud`) already exist and are the model to match; a sixth is due when `Deployment/` is written.

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
| 0     | 1–7     | 7/7  | ✅ Complete    |
| 1     | 8–19    | 12/12 | ✅ Complete    |
| 2     | 20–31   | 0/12 | ⬜ Not started  |
| 3     | 32–43   | 0/12 | ⬜ Not started  |
| 4     | 44–53   | 0/10 | ⬜ Not started  |
| 5     | 54–63   | 0/10 | ⬜ Not started  |
| 6     | 64–69   | 0/6  | ⬜ Not started |
| 7     | 70–78   | 0/9  | ⬜ Not started |
| **Total** | **78** | **19/78** | **24%**   |

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
