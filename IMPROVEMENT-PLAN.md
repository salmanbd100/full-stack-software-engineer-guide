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
| 7 | **Update both counters** | The **Phase Map** row and the **Progress Tracker** table at the bottom, plus `Progress: N / 90` in the header |
| 8 | **Report** | What was done, what was verified, and what was left. Then stop |

**Marking an item done is part of the item.** An item is not finished until steps 6 and 7 are done —
otherwise the next session starts from the wrong place.

If an item turns out to be wrong, blocked, or already handled, **say so and amend the item** rather than
silently skipping it or doing something adjacent. Corrections to this plan are expected — three have already
happened: the budget arithmetic in #1, the frontend-share rule, and the line-budget attribution that added
**#31a–#31e** on 2026-08-30, **#58a** on 2026-09-02 when #31e turned out to be blocked on its own
ordering note, and **#31f** on 2026-09-03 when the edition picked up a hard 700-page ceiling.

> **Item ids can carry a letter.** #31a–#31f are Phase 2 items and #58a is a Phase 4 item, all added
> after the plan was numbered.
> `scripts/plan-status.ts` sorts `31a` between `31` and `32`, so step 1 finds them in the right place.

> **Also fine:** _"do improvement #23"_ to jump to a specific item, and _"skip #23"_ to move past one.
> Both override the first-unchecked rule.

**Last updated:** 2026-09-07 · **Progress:** 60 / 90
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
| 1–2, 4–5, 13, 17–18, 20, 22–24, 26–29, 31a–31f, 31–65, 58a, 69, 72–73, 76, 78, 80–82, 77 | **Opus 5** `claude-opus-5` | `high`–`xhigh` | Judgement and prose. Every new chapter (#32–65), every merge decision, every budget trim (#31a–31f, #58a), everything with a voice |
| 3, 6–12, 14–16, 19, 21, 25, 30, 66–68, 70–71, 74–75, 79, 83 | **Sonnet 5** `claude-sonnet-5` | `low`–`medium` | The decision is already written in the item; the work is applying it hundreds of times without drifting |

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
| **2** | Restructure & prune           | 20–31 · 31a–31f | 12–16 sessions | **Opus 5** (Sonnet for 21, 25, 30) |
| **3** | 🆕 `Frontend/ModernStack/`    | 32–43   | 12–16 sessions | **Opus 5** throughout |
| **4** | 🆕 `AI/`                      | 44–53   | 10–14 sessions | **Opus 5** throughout |
| **5** | Fill the remaining gaps       | 54–63 · 58a | 8–12 sessions  | **Opus 5** throughout |
| **6** | 2027-proofing                 | 64–69   | 4–6 sessions   | mixed — Sonnet for 66–68 |
| **7** | Book assembly & publish       | 70–83   | 6–8 sessions   | mixed — Sonnet for the sweeps |

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
>
> ✅ **Resolved by #23 (2026-08-29): the directory stays, and #23's list was corrected.** The trim it
> still needs — roughly 8 chapters down to 5 — is flagged in #23's Delivered block and starts with #31.

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

### - [x] 20. Cut DevOps from 147 files to ~25 `L` — ✅ **done 2026-08-29**

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

**Done when:** `ShipAndOperate/` holds **22 chapters across six sections** — 28 files with the section
READMEs — and everything cut is under `Archive/devops/`.

> ⚠️ **Amended by run #6 (2026-08-29).** The original line said *~25 files*, which never reconciled with
> the keep table's own 27 chapters or `BOOK-SPEC.md`'s ~18. `BOOK-SPEC.md` decision #12 settles it at
> **22 chapters / 5,500 lines**; this line now matches the spec rather than contradicting it.

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
| 1 | ~~`Cloud/` 4 → 3: merge object storage and CDN, and make all four bodies cloud-neutral rather than AWS-only~~ | **Done in run #3** |
| 2 | ~~`Observability/` — fold the useful half of the archived `kubernetes/09-monitoring.md` in, and add frontend RUM~~ | **Done in run #4** — the RUM half became a cross-reference, not a chapter. See the correction there |
| 3 | ~~`Git/` 6 → 4: archive `05-git-platforms.md`, fold `04-best-practices.md` into `03-`~~ | **Done in run #5** — targets revised up; see the callout there |
| 4 | The trim to budget — **6,402 lines across 26 chapters** against `BOOK-SPEC.md`'s 3,500 across ~18 | The only remaining piece of this item. `Containers/` (7 → 4) and `CICD/` (5 → 4) are untouched, and run #5's callout says the budget itself has to be amended first |

> ⚠️ **Run #2 made the budget gap wider, knowingly.** Part VIII went from 7,070 to 7,992 lines because
> the item's own keep table requires a `Deployment/` section and it had none. The trim run now has to
> cut roughly 4,500 lines rather than 3,500. That is the right order: `Deployment/` is the only content
> in Part VIII written to the current standard, so it sets the shape the trim cuts *towards* rather than
> being another thing to cut. The obvious candidates are `Git/` at 1,609 chapter lines across six and
> `Containers/` at 1,457 across seven (1,665 and 1,518 with their READMEs) — the two largest sections, and the two furthest from the
> "what a frontend-heavy full stack engineer is asked about" test.


**Delivered — run #3, 2026-08-28: `Cloud/` 4 → 3, and the AWS branding taken out of the prose.**

Run #1 retitled these four chapters off their AWS names and flagged the bodies as still AWS-only; run #2
did `Deployment/` instead. This run closes that debt. `Cloud/` is now **3 chapters, 681 lines**, down
from 4 chapters and 980, and all three are written to the Book Chapter Standard rather than patched
towards it.

| File | Lines | What changed |
| ---- | ----- | ------------ |
| `01-fundamentals.md` | 204 | Rewritten. Four primitives, region/zone/edge, the managed-service ladder, the responsibility line. The AWS CLI setup, AWS Organizations and Well-Architected sections are gone |
| `02-serverless.md` | 227 | Rewritten around the **instance lifecycle** — one init, many handler calls — plus invocation shapes, cold-start anatomy and concurrency. Lambda CLI recipes, layers and SQS config blocks are gone |
| `03-storage-and-delivery.md` | 250 | **`03-object-storage.md` + `04-cdn.md` merged**, as the item's keep table asked for (*"storage + CDN"*). Presigned upload path, origin lock-down, cache keys, `max-age` vs `s-maxage`, why invalidation is a smell |
| `README.md` | 57 | Chapter table rebuilt for three, reading order and sprint path updated |

**Four decisions this run made:**

- **The merge target is `03-storage-and-delivery.md`, not a new file.** `git mv` from
  `03-object-storage.md` (originally `DevOps/AWS/07-s3.md`) so history follows the larger source.
  `04-cdn.md` went back to `Archive/devops/aws/12-cloudfront.md` — its original name — with
  `in_book: false`, a restored `aws-cloudfront` slug and its nav footer repointed. Nothing deleted.
  As a side effect the archived `11-route53.md` and `13-load-balancers.md` nav links to
  `./12-cloudfront.md`, broken since run #1, now resolve again.
- **Slug `content-delivery-networks` is retired.** Its one inbound reference — the What to Read Next
  in `Deployment/01-platform-deploys.md` — is repointed at `#ch-object-storage-and-delivery`. That was
  the only one in the book.
- **Vendor-neutral means principle first, product second — not product-free.** Each chapter names AWS,
  Vercel and Cloudflare where the shape genuinely differs, and says which platform a number belongs to.
  `02-` carries the required moving-target callout, because every published serverless limit moves.
- **Code is TypeScript now, not shell.** The old chapters were ~15 `bash` and `json` fences of CLI
  recipes. The replacements carry six `typescript` fences that teach something — module-scope client
  reuse, partial batch failure, presigned upload issuance, cache-header pairs — plus three mermaid
  diagrams. That is where the `fence-language` drop below comes from.

**Context7 was used** (`/websites/vercel`, `/websites/developers_cloudflare_workers`) for per-route
`maxDuration`/`memory` configuration, fluid compute, and the Workers CPU-time model (30 s default,
5 min on paid, billed on CPU rather than wall time). Exact ceilings are deliberately not stated as
durable facts — the moving-target callout says to check the current limit instead.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0, `too-long`
  47 (unchanged). `fence-language` **91 → 81**; `.lint-baseline.json` committed at 81
- `scripts/add-frontmatter.ts`: 331 files, all slugs unique, every in-book file has a part.
  Part VIII is **35** in-book files, down from 36
- `pnpm book:collect`: 277 files, 95,444 lines — down from 279 / 95,795
- No dangling references to `04-cdn.md`, `03-object-storage.md` or `#ch-content-delivery-networks`
  anywhere outside `Archive/`

**Part VIII now stands at 7,418 lines across 29 chapters** (7,766 with the six section READMEs), against
`BOOK-SPEC.md`'s 3,500 across ~18. Run #3 removed 300 lines and one chapter. The gap is still roughly
3,900 lines.

**A target shape for the remaining trim**, so the next run is not re-deciding it from scratch. Derived
from reading every chapter's heading outline; the per-section calls are still the trim runs' to make:

| Section | Now | Target | The cut |
| ------- | --- | ------ | ------- |
| `Git/` | 6 / 1,633 | 3–4 / ~750 | `05-git-platforms.md` archives — a GitHub-vs-GitLab-vs-CodeCommit tour, and CodeCommit is closed to new customers. `04-best-practices.md` folds its commit-message and PR halves into `03-` |
| `Containers/` | 7 / 1,481 | 4 / ~750 | `04-docker-security.md` merges into `02-` (they already share "non-root" and "minimal base image"). `06-` + `07-` become one Kubernetes-literacy chapter; StatefulSets, DaemonSets and scheduling controls are operator scope per § 6 |
| `CICD/` | 5 / 1,480 | 4 / ~800 | `04-testing.md` + `05-security.md` overlap `Frontend/Testing`, `Backend/Security` and #24 — cut to what is pipeline-specific |
| `Observability/` | 4 / 1,276 | 3 / ~650 | `02-prometheus.md` + `03-grafana.md` become one metrics-and-dashboards chapter; PromQL depth, Alertmanager and the managed-AWS sections go. Item 2 above lands here |
| `Cloud/` | **3 / 681** | 3 / ~680 | ✅ done, run #3 |
| `Deployment/` | 4 / 867 | 4 / 867 | ✅ already to standard — the shape everything else cuts towards |

That lands at **21–22 chapters and ~4,300 lines**. Reaching a literal 18 / 3,500 would mean cutting
`Git/` to two and `Containers/` to three, which fails the item's own *"all 6 — daily use, high interview
frequency"* line for Git. **Whoever runs the final trim has to pick one**: amend `BOOK-SPEC.md` § 4's
Part VIII budget up to ~4,300 / ~21, or amend #20's keep table down. They cannot both stand.


**Delivered — run #4, 2026-08-28: `Observability/` 4 → 3, and the last non-trim piece of this item.**

`Observability/` is now **3 chapters, 865 lines**, down from 4 chapters and 1,276. All three were
rewritten to the Book Chapter Standard rather than patched — none of the four had Key Takeaways, a
What to Read Next, or a `## Interview Questions` heading, and all four carried retired `🔴` and `✨`
callouts and a relative-path nav footer.

| File | Lines | What changed |
| ---- | ----- | ------------ |
| `01-fundamentals.md` | 271 | Rewritten. Pillars, cardinality, structured logs, traces and sampling, golden signals, percentiles, SLO/error budget. Gained the container log rule and a **Where the Frontend Fits** section; lost the push/pull table to `02-` and the symptom/cause table to `03-` |
| `02-metrics-and-dashboards.md` | 299 | **`02-prometheus.md` + `03-grafana.md` merged**, as the target table asked. Scraping and service discovery, exposition format, the four queries that matter, recording rules, dashboards as code, dashboard design |
| `03-alerting-and-on-call.md` | 295 | From `04-alerting.md`. Same spine, restructured to the six blocks, and the Terraform block replaced by the principle it was demonstrating |
| `README.md` | 59 | Chapter table rebuilt for three; reading order now explains *why* 02 precedes 03 |

**The archived Kubernetes monitoring chapter contributed three things, not a section.** From
`Archive/devops/kubernetes/09-monitoring.md`: the *why ephemeral infrastructure changes monitoring*
argument, which is now the reason `02-` teaches service discovery at all; the **stdout/stderr, never a
file inside the container** log rule in `01-`; and three container queries in `02-` — memory against
the limit as an out-of-memory predictor, CPU throttling as latency with no errors, and restart count.
The Prometheus Operator, EKS, Fluent Bit and `kubectl` material stayed archived, per `BOOK-SPEC.md` § 6.

**Frontend RUM is a cross-reference, not a chapter — this corrects the item's keep table.** The keep
table asks for "frontend RUM" in Part VIII. It already exists in Part IV, **twice**:
`Frontend/WebPerformance/07-performance-monitoring.md` (`performance-monitoring`) and
`SystemDesign/Frontend/12-monitoring.md` (`frontend-monitoring`), both `part: 4`, both covering RUM,
`web-vitals`, `PerformanceObserver` and field-versus-lab data. Writing a third would breach
**non-negotiable #7** — one canonical home, cross-references everywhere else. So `01-` gets a 12-line
**Where the Frontend Fits** section making the transfer explicit (Core Web Vitals are SLIs, a p75 INP
target is an SLO, and a URL with an ID in it is as dangerous a label in a RUM tool as in a metrics
backend) and points at `#ch-performance-monitoring` for the mechanics. The section README says the same.

> ⚠️ **A duplicate pair for a later dedup item.** `performance-monitoring` and `frontend-monitoring`
> are ~80% the same chapter in two different directories, and **no plan item currently covers them** —
> #31 handles WebSockets, rate limiting and API gateway; #24 handles security. Whoever next touches
> Part IV should fold `frontend-monitoring` into `performance-monitoring` or give it a distinct scope.

**Four other decisions this run made:**

- **`03-grafana.md` went back to the Archive, not to a delete.** `git mv` to
  `Archive/devops/monitoring/04-grafana.md` — its original path — with `in_book: false` and its nav
  footer repointed at archive siblings. As a side effect `05-xray.md`'s `← Grafana` link, broken since
  run #1, resolves again. It is the only one of the three moves whose history git still traces —
  `02-metrics-and-dashboards.md` and `03-alerting-and-on-call.md` were both `git mv`'d (from
  `02-prometheus.md` and `04-alerting.md`), but the rewrites were extensive enough that rename
  detection no longer scores them, so `git log --follow` on either starts at run #4's commit. Use
  `git log --diff-filter=D -- ShipAndOperate/Observability/02-prometheus.md` to reach the old file.
- **Slugs `prometheus` and `grafana` are retired; `metrics-and-dashboards` replaces them.** Both had
  **zero inbound references** anywhere in the book, so nothing needed repointing. `monitoring-fundamentals`
  and `alerting` are kept unchanged — they have four inbound references between them, from
  `DevOps/Agile/README.md`, `Deployment/03-rollback.md` and `Cloud/02-serverless.md`.
- **The `hcl` fence is gone.** `04-alerting.md` carried a 45-line Terraform block defining an SNS topic
  and a CloudWatch alarm. Terraform is out of scope per § 6, and the block's actual teaching — that
  missing data must count as a breach, and that you should notify on recovery — is now a prose section
  (*Silence Has to Mean Broken*) that applies to any alerting system. That was the repo's only `hcl` fence.
- **PromQL is fenced as `text`.** `promql` is not on non-negotiable #1's allow-list and the nine PromQL
  fences were counting as violations. `text` is what run #2 used for the same problem. ⚠️ **There is a
  case for adding `promql` on the same footing as `sql` and `graphql`** — a query language with no
  TypeScript form, which is exactly the reasoning behind Decision #10. That is a spec amendment, so it
  was flagged rather than taken unilaterally.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0, `too-long`
  47 (unchanged). `fence-language` **81 → 53** — all 28 Observability violations cleared;
  `.lint-baseline.json` committed at 53
- `scripts/add-frontmatter.ts`: 330 files, **idempotent on the second pass** (`changed: 0`), all slugs
  unique, every in-book file has a part. Part VIII is **34** in-book files, down from 35
- `pnpm book:collect`: **276 files, 95,036 lines** — down from 277 / 95,444
- Six blocks present in all three, H1 anchors correct, zero relative links in bodies, zero `####`, zero
  retired emoji, `⚠️` at 3/3/2 against the standard's budget of 3
- No dangling references to `02-prometheus.md`, `03-grafana.md`, `04-alerting.md`, `#ch-prometheus` or
  `#ch-grafana` outside `Archive/` and this plan's own prose

**Length was cut twice and still missed the ~650 target — this is worth recording rather than glossing.**
First drafts came to 957 chapter lines. Two trim passes took out interview-answer padding, then genuine
cross-chapter duplication, landing at **865** — an average of 288 per chapter against the standard's
~220. The residual is structural: the mandatory closing blocks cost ~55 lines a chapter, and `02-`
carries two former chapters' worth of teaching. Cutting to 220 each would mean dropping either the
query material or the dashboard material from `02-`, which are its two reasons to exist. **The ~650
figure in run #3's target table was estimated from heading outlines and was too tight by about 200.**

**Part VIII now stands at 7,007 lines across 28 chapters** (7,359 with the six section READMEs). Run #4
removed 411 lines and one chapter. Against `BOOK-SPEC.md`'s 3,500 / ~18 the gap is still ~3,500 lines.

| Section | Now | Target | Status |
| ------- | --- | ------ | ------ |
| `Git/` | 6 / 1,633 | 3–4 / ~750 | Untouched — the largest remaining cut |
| `Containers/` | 7 / 1,481 | 4 / ~750 | Untouched |
| `CICD/` | 5 / 1,480 | 4 / ~800 | Untouched |
| `Observability/` | **3 / 865** | 3 / ~900 | ✅ done, run #4 — target revised up from ~650 |
| `Cloud/` | 3 / 681 | 3 / ~680 | ✅ done, run #3 |
| `Deployment/` | 4 / 867 | 4 / 867 | ✅ already to standard |

With the revised Observability figure the target shape lands at **21–22 chapters and ~4,550 lines**.
The choice run #3 identified is unchanged and still open: **amend `BOOK-SPEC.md` § 4's Part VIII budget
up to ~4,550 / ~21, or amend #20's keep table down.** Three of the six sections are now done, so the
remaining three carry the whole decision — and `Git/` at six chapters is the one the item's own
*"all 6 — daily use, high interview frequency"* line protects.

**Delivered — run #5, 2026-08-28: `Git/` 6 → 4, the first of the three trim sections.**

Run #4 named `Git/` as the largest remaining cut and run #3 wrote the target: archive
`05-git-platforms.md`, fold `04-best-practices.md` into `03-`. Both done. `Git/` is now **4 chapters,
1,026 lines**, down from 6 and 1,633. All four were rewritten to the Book Chapter Standard rather than
patched — none of the six had Key Takeaways or a What to Read Next, all six opened with `## Overview`
instead of `## 💡 The Core Idea`, all six used `### 💡 **Bold heading**` sub-headings that breach the
one-💡-per-chapter budget, and all six ended in a relative-path nav footer.

| File | Lines | What changed |
| ---- | ----- | ------------ |
| `01-git-fundamentals.md` | 251 | Rewritten around **a commit is a snapshot plus a parent pointer, and a branch is a file holding one hash**. Three trees, merge-versus-rebase as two different graph operations, remotes, the four-way undo table. The `git config` and alias section is gone, and so is the `.gitignore` inventory |
| `02-advanced-git.md` | 254 | Rewritten around **commits become unreachable, not deleted** — every tool in the chapter is then the same trick. Reflog, `bisect`, worktrees, interactive rebase, secret removal. Gained the `bisect run` **exit-code 125** rule and a stash-versus-worktree decision table |
| `03-branching-and-review-workflow.md` | 300 | **`03-branching-strategies.md` + the useful half of `04-best-practices.md`**, as the target table asked. Reframed around **branch lifetime as the deciding variable**; the three models, then conventional commits, branch naming, pull request size, merge method and branch protection |
| `04-repository-strategies.md` | 221 | From `06-`, renumbered. Reframed around **a repository boundary is a coordination boundary**. Lerna dropped for pnpm workspaces and Changesets; affected-only CI is now stated as the entry fee rather than a tip |
| `README.md` | 56 | Chapter table rebuilt for four; reading order and the interview sprint updated (01 → 03, with 02's reflog and `bisect` sections as the ten-minute extra) |

**Two files archived, nothing deleted.** `04-best-practices.md` and `05-git-platforms.md` `git mv`'d to
a new `Archive/devops/git/` with `in_book: false`, their nav footers repointed at each other, and the two
matching links in `Archive/devops/README.md` repointed from `./Git/` to `./git/` so they resolve again.
The other four links in that README still point at files now under `ShipAndOperate/` — broken since run
#1, and a general Archive README cleanup rather than this item's business.

**Four decisions this run made:**

- **`05-git-platforms.md` archives whole, and none of it was rescued.** Its three unique assets were a
  GitHub Actions workflow, a GitLab CI workflow, and a branch-protection checklist. `CICD/02-github-actions.md`
  already owns Actions properly — OIDC, environments, reusable workflows, caching — so the chapter's
  Actions YAML was a worse second copy. GitLab CI is vendor tooling this book does not teach. The branch
  protection checklist is the one thing worth keeping, and it is now five lines in `03-` where the
  workflow that needs it lives. CodeCommit is closed to new customers, which settles the rest.
- **`04-best-practices.md` split three ways rather than folding whole.** Commit messages, branch naming,
  pull request size, merge method and branch protection went into `03-`. The secret-removal recipe was
  already in `02-` and stayed there, now with the rotate-first ordering made explicit. The `.gitignore`
  inventory — `node_modules/`, `dist/`, `.DS_Store` — was cut outright: it is not senior content, and it
  duplicated a table in the old `01-`. Prevention is now one line in `02-`'s recovery sequence pointing
  at `#ch-cicd-security`, which owns secret scanning.
- **The merged chapter is `branching-and-review-workflow`, not `branching-strategies`.** `git mv` from
  `03-branching-strategies.md` because that is the chapter's spine, even though `04-` was the larger
  file. ⚠️ **Neither in-book rename survives rename detection** — not even at `-M10%`, because both
  files were rewritten end to end — so `git log --follow` on `03-branching-and-review-workflow.md` or
  `04-repository-strategies.md` starts at run #5's commit. Use
  `git log --diff-filter=D -- ShipAndOperate/Git/03-branching-strategies.md` to reach the old file.
  The two Archive moves score `R097` and keep their history. The slug `branching-strategies` is retired and `git-best-practices` and `git-platforms` go with
  it to the Archive. **All three had zero inbound references** — in fact the entire `Git/` section had
  zero inbound cross-references from anywhere in the book, so nothing needed repointing. Worth knowing:
  Part VIII's most-read section is currently a cul-de-sac. The new chapters point outward at
  `#ch-cicd-fundamentals`, `#ch-cicd-security` and `#ch-feature-flags`, and `CICD/01-cicd-fundamentals.md`
  now points back at `#ch-branching-and-review-workflow` from its Trunk-Based Development section, which
  is the one place the two chapters genuinely overlapped.
- **Bash stays the primary fence language here, deliberately.** Git chapters are about commands; `bash`
  is on non-negotiable #1's allow-list and converting `git rebase -i` into TypeScript would be theatre.
  Two TypeScript fences earn their place — a `bisect run` check script that demonstrates exit codes
  0/1/125, and the feature-flag component that makes trunk-based development possible. Four ASCII and
  sample-output fences were labelled `text`.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0, `too-long`
  47 (unchanged). `fence-language` **53 → 39** — all 14 `Git/` violations cleared;
  `.lint-baseline.json` committed at 39
- `scripts/add-frontmatter.ts`: 328 files, **idempotent on the second pass** (`changed: 0`), all slugs
  unique, every in-book file has a part. Part VIII is **32** in-book files, down from 34
- `pnpm book:collect`: **274 files, 94,429 lines** — down from 276 / 95,036
- Six blocks present in all four, H1 anchors correct, zero relative links in bodies, zero `####`, zero
  retired emoji, 💡 and 🔑 at exactly 1 each and ⚠️ at 3/3/2/1 against the standard's budget of 3
- No dangling references to `03-branching-strategies.md`, `06-repository-strategies.md`,
  `#ch-branching-strategies`, `#ch-git-best-practices` or `#ch-git-platforms` outside `Archive/` and
  this plan's own prose

**1,026 lines against a ~750 target — the same miss run #4 recorded, and for the same reason.** Four
chapters averaging 257 lines against the standard's ~220. The closing blocks cost ~55 lines each before
any teaching happens, and `03-` carries two former chapters at 300 lines. The honest read is that
run #3's per-section line targets were estimated from heading outlines and run **~30% low across the
board**; the chapter *counts* in that table have held up exactly, the line figures have not.

**Part VIII now stands at 6,402 lines across 26 chapters** (6,754 with the six section READMEs). Run #5
removed 605 lines and two chapters.

| Section | Now | Target | Status |
| ------- | --- | ------ | ------ |
| `Git/` | **4 / 1,026** | 4 / ~1,030 | ✅ done, run #5 — target revised up from ~750 |
| `Containers/` | 7 / 1,481 | 4 / ~1,000 | Untouched — now the largest remaining cut |
| `CICD/` | 5 / 1,482 | 4 / ~1,000 | Untouched |
| `Observability/` | 3 / 865 | 3 / ~900 | ✅ done, run #4 |
| `Cloud/` | 3 / 681 | 3 / ~680 | ✅ done, run #3 |
| `Deployment/` | 4 / 867 | 4 / 867 | ✅ already to standard |

Two sections are left, needing 7 → 4 and 5 → 4. With the line targets corrected for what four
standard-compliant chapters actually cost, the end state is **22 chapters and ~5,440 lines**.

> ⚠️ **The budget decision cannot be deferred past the next two runs.** `BOOK-SPEC.md` § 4 says Part VIII
> is 3,500 lines across ~18 chapters. Four of the six sections are now finished to the standard and they
> total **3,439 lines across 14 chapters** — 98% of the part's entire line budget, with twelve chapters of
> Docker, Kubernetes literacy and CI/CD still to trim. Even cutting those twelve to eight leaves 61 lines
> to share between them. That is not a chapter; it is a paragraph. **Either § 4's Part VIII budget rises
> to ~5,450 / ~22, or the keep table loses whole sections** — and the keep table is this item's own
> contract, so raising the budget is the honest correction. Whoever runs `Containers/` should make that
> amendment first, with a Revision History entry, rather than trimming towards a number four finished
> sections already disprove.


**Delivered — run #6, 2026-08-29: `Containers/` 7 → 4, and the budget amendment run #5 said could not wait.**

Two things happened this run: `BOOK-SPEC.md` § 4's Part VIII budget was amended, and `Containers/` was cut
from 7 chapters to 4. The amendment came first because run #5's callout was right — trimming towards 3,500
lines is trimming towards a number that five finished sections disprove.

**The amendment: Part VIII is now 5,500 lines · ~22 chapters** (`BOOK-SPEC.md` v1.1 → **v1.2**, decision
log entry **#12**). The reasoning, and the constraint it creates, are both worth carrying forward:

- Five sections were finished at the time of the amendment — Git, Containers, Observability, Cloud,
  Deployment — at **4,556 lines across 18 chapters**, or 130% of the old 3,500 budget with CI/CD untouched.
- 22 chapters is the structural floor consistent with the keep table. At the book's own average of 221
  lines that is 4,862; the finished sections average **253**, because the six mandatory closing blocks cost
  ~55 lines before any teaching happens.
- **5,500 is not an estimate — it is the arithmetic maximum the frontend-spine rule permits.** Non-negotiable
  #3 requires Parts I–IV ≥ 50% of the book. At 5,500 the total is 57,000 and the spine is 28,500 = **exactly
  50.0%**, down from 51.8%. One more line into any Part V–IX budget breaks the spec. That constraint is now
  recorded as a ⚠️ under § 5's sums table, because the next amendment will otherwise walk straight into it.
- Everything downstream of the total was recalculated: § 1's length, all nine share percentages, the
  253-chapter count, the 225-line average, the ~62,600 bound-in-DSA figure, and the page estimate
  (950–1,050). § 4's *Covers* line also gained `Cloud`, which it had been missing since run #1 created the
  section.
- This item's **Done when** was amended to match — it said *~25 files*, which agreed with neither the keep
  table's 27 chapters nor the spec's ~18.

**The one number the amendment does not close:** Part VIII's projected end state is ~5,550 chapter lines
plus ~350 of section READMEs, so roughly **400 lines over the new ceiling** even after CI/CD is trimmed.
That residual is a ~25-line-per-chapter trim across 22 chapters, which is **#76's editorial pass**, not a
structural cut. Recorded rather than hidden.

> ⚠️ **Worth knowing before any other part is trimmed:** Part VIII is the *least* over-budget part in the
> book. Measured now, in-book lines against § 5 budgets: Part I is at 17,929 against 5,000, Part II 12,146
> against 6,000, Part V 12,889 against 6,500, Part VI 13,397 against 6,500, the DSA appendix 19,370 against
> 5,600 — and Part VIII 6,422 against its new 5,500. The book totals **94,057 lines against 57,000**. No
> plan item owns the trim for Parts I, II, V or VI; #27 covers DSA and #29 covers Communication. Run #5's
> framing of a "Part VIII budget gap" was true but local — the gap is book-wide, and Part VIII is simply
> the part far enough along to have hit it first.

**`Containers/` is now 4 chapters, 1,117 lines**, down from 7 and 1,481. All four were rewritten to the
Book Chapter Standard rather than patched — not one of the seven had Key Takeaways, a What to Read Next or
a `## 💡 The Core Idea`, all seven ended in `## Interview Q&A` with compressed answers rather than the
standard's answer shapes, and all seven closed with a relative-path nav footer.

| File | Lines | What changed |
| ---- | ----- | ------------ |
| `01-docker-fundamentals.md` | 233 | Rewritten around **a container is a process with a restricted view of the machine** — namespaces, cgroups, a layered filesystem, no guest OS. Gained the exit-code table and the four-step debugging order from the old `05-`, plus the SIGTERM/PID 1 contract. Lost the Compose section (it duplicated `03-`) and the command inventory |
| `02-building-and-hardening-images.md` | 274 | **`02-dockerfile-best-practices.md` + `04-docker-security.md` merged**, as the target table asked. Reframed around *every instruction is a cache key and a shipped layer*. Gained BuildKit secret mounts, `read_only`/`cap_drop`/`no-new-privileges`, SBOMs and scheduled scanning, and the image-size tools from the old `05-` |
| `03-docker-compose.md` | 281 | Reframed around **Compose is a development environment as code, not an orchestrator**. Gained `develop: watch`, the `depends_on` condition table, file-based secrets, and the service-to-service debugging sequence from the old `05-`. Lost the 60-line "full-stack production example", which taught nothing the smaller examples do not |
| `04-kubernetes-essentials.md` | 329 | **`06-kubernetes-architecture.md` + `07-pods-and-deployments.md` merged.** Reconciliation loop, the apply walkthrough, why a pod, probes, requests and limits, rollout and rollback, the shutdown race. StatefulSets, DaemonSets, Jobs, CronJobs, scheduling controls and control-plane HA are gone — operator scope per § 6 |
| `README.md` | 60 | Chapter table rebuilt for four; reading order now explains why 04 is worth reading even off Kubernetes |

**Five decisions this run had to make:**

- **The target table's own cut list does not reach four chapters — it reaches five.** It named two merges
  (`04-` into `02-`, and `06-` + `07-` into one) against a 7 → 4 target, which leaves `05-docker-troubleshooting.md`
  unaccounted for. It **split three ways** instead, the same treatment run #5 gave `04-git-best-practices.md`:
  exit codes and the debugging order into `01-`, image size and build cache into `02-`, network and DNS
  checks into `03-`. `docker system prune`, `docker system df` and `dive` were cut outright — disk
  housekeeping is not senior interview content. The section README's old interview sprint pointed at that
  chapter, so the sprint now points at `01-` → `02-` plus `04-`'s probe and shutdown sections.
- **Three chapters were renamed, and only the Archive moves keep their history.** `02-building-and-hardening-images.md`
  (from `02-dockerfile-best-practices.md`), `03-docker-compose.md` (from `03-docker-compose-advanced.md`,
  which also fixes a filename that said *advanced* under a title that did not) and `04-kubernetes-essentials.md`
  (from `07-pods-and-deployments.md`, the larger of the two merged sources). ⚠️ **None of the three scores as
  a rename even at `-M10%`**, because each was rewritten end to end, so `git log --follow` on them starts at
  run #6's commit. Use `git log --diff-filter=D -- ShipAndOperate/Containers/02-dockerfile-best-practices.md`
  to reach the old file. The three Archive moves score **R096/R096/R098** and keep their history.
- **Six slugs retired, three created, and exactly one inbound reference existed.** Out:
  `dockerfile-best-practices`, `docker-compose-advanced`, `docker-security`, `docker-troubleshooting`,
  `kubernetes-architecture`, `pods-and-deployments`. In: `building-and-hardening-images`, `docker-compose`,
  `kubernetes-essentials`. The only inbound cross-reference in the whole book was
  `Observability/02-metrics-and-dashboards.md` → `#ch-kubernetes-architecture`, repointed at
  `#ch-kubernetes-essentials`. Like `Git/` before it, `Containers/` was almost a cul-de-sac; the new
  chapters point outward at `#ch-github-actions`, `#ch-cicd-security`, `#ch-rollback-and-recovery` and
  `#ch-monitoring-fundamentals`.
- **Kubernetes keeps only what a pod spec makes you decide.** Probes, requests and limits, rollout strategy,
  `preStop` and graceful shutdown, and one paragraph each on PodDisruptionBudgets and why a namespace is not
  a security boundary. Everything an operator owns — node pools, taints and affinity, topology spreading,
  StatefulSets, DaemonSets, autoscaling, etcd quorum — went with the archived chapter. The `When to Use It`
  block is now a two-column table of *what you own* against *what the platform owns*, which is the actual
  interview question.
- **Three archived files, three nav footers repointed, and two long-broken links fixed as a side effect.**
  `06-docker-security.md` and `09-docker-troubleshooting.md` returned to `Archive/devops/docker/` and
  `01-architecture.md` to `Archive/devops/kubernetes/`, all three under their original names with
  `in_book: false`. `Archive/devops/kubernetes/02-eks.md` and `04-services-networking.md` pointed at
  `03-pods-deployments.md`, which has been in-book since run #1 and is now `04-kubernetes-essentials.md`;
  both are repointed at `../../ShipAndOperate/…`, the same treatment run #1 gave `DevOps/Agile/`. The two
  `Docker/` links in `Archive/devops/README.md` are still broken, still that README's own cleanup.

**Context7 was used** (`/docker/docs`) for the BuildKit secret mount's `env=` option and its matching
`--secret id=…,env=…` CLI form, Compose's `develop: watch` actions, and confirmation that the top-level
`version:` key is obsolete in Compose V2. Version-stamped throughout: Node 24 (Active LTS), `postgres:17`,
`nginx:1.27`, and sidecars as init containers with `restartPolicy: Always` since Kubernetes 1.29. `04-`
carries the required moving-target callout, because Kubernetes deprecates APIs on a three-releases-a-year
schedule.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0, `too-long` 47
  (unchanged). `fence-language` **39 → 30** — all 9 unlabelled `Containers/` fences cleared, seven of them
  the ASCII diagrams in the two Kubernetes chapters, which are now two Mermaid diagrams and two `text`
  fences; `.lint-baseline.json` committed at 30
- `scripts/add-frontmatter.ts`: 325 files, **idempotent on the second pass** (`changed: 0`), all slugs
  unique, every in-book file has a part. Part VIII is **29** in-book files, down from 32
- `pnpm book:collect`: **271 files, 94,061 lines** — down from 274 / 94,429
- Six blocks present in all four, in order; H1 anchors match `slug`; zero relative links in bodies; zero
  `####`; zero retired emoji; 💡 and 🔑 at exactly 1 each and ⚠️ at 1/2/2/3 against the standard's budget of 3
- No dangling references to any of the six retired slugs or the five old filenames outside `Archive/` and
  this plan's own prose

**Part VIII now stands at 6,038 lines across 23 chapters** (6,389 with the six section READMEs). Run #6
removed 364 lines and three chapters.

| Section | Now | Target | Status |
| ------- | --- | ------ | ------ |
| `Git/` | 4 / 1,026 | 4 / ~1,030 | ✅ done, run #5 |
| `Containers/` | **4 / 1,117** | 4 / ~1,100 | ✅ done, run #6 — target revised up from ~1,000 |
| `CICD/` | 5 / 1,482 | 4 / ~1,000 | **Untouched — the only section left** |
| `Observability/` | 3 / 865 | 3 / ~900 | ✅ done, run #4 |
| `Cloud/` | 3 / 681 | 3 / ~680 | ✅ done, run #3 |
| `Deployment/` | 4 / 867 | 4 / 867 | ✅ already to standard |

**One section left, and then this box ticks.** `CICD/` 5 → 4: the target table's cut is `04-testing.md` +
`05-security.md` down to what is genuinely pipeline-specific, since both overlap `Frontend/Testing`,
`Backend/Security` and item #24. Two things the next run should know. First, `CICD/01-cicd-fundamentals.md`
and its siblings hold **18 of the 30 remaining `fence-language` violations** — the whole rest of the
baseline is `DevOps/Agile/`, which belongs to item #25 — so the number should drop again sharply. Second, the budget
ceiling is now fixed at 5,500 and `CICD/` has ~940 lines of room in it; landing at ~1,000 is fine and
leaves the ~400-line residual to #76, but growing the section is not.



**Delivered — run #7, 2026-08-29: `CICD/` 5 → 4, and the box ticks. Item complete.**

The last section. `CICD/` is now **4 chapters, 1,108 lines**, down from 5 and 1,482. All four were
rewritten to the Book Chapter Standard rather than patched — not one of the five had a `## 💡 The Core
Idea`, Key Takeaways or a What to Read Next, all five closed with `## Interview Q&A` rather than the
standard's heading, and all five ended in a relative-path nav footer.

| File | Lines | What changed |
| ---- | ----- | ------------ |
| `01-cicd-fundamentals.md` | 258 | Rewritten around **a pipeline turns a commit into one promotable artefact, then tries to prove it unsafe**. Gained the fail-fast stage table, the which-tier-runs-where table and quality gates from the archived `04-testing.md`, plus flaky tests and blanket retries as Common Mistakes. Lost the pipeline-as-code tool inventory and the artefact tagging code fence |
| `02-github-actions.md` | 305 | Reframed around **every job gets a clean machine** — the fact that explains artefacts, caches and `needs:`. Gained service containers with the health-check race, and test sharding in the matrix. Lost the standalone Environments section (now four lines), the self-hosted runner section (now one interview question) and the pipeline-speed question that `01-` answers better |
| `03-deployment-strategies.md` | 252 | Reframed around **how many users see the new version before you find out it is broken**. Shadow deployment dropped — it appeared once in a table and was never explained. Expand/contract kept in full; it is the part candidates get wrong |
| `04-pipeline-security.md` | 293 | From `05-security.md`, renumbered. Reframed around **the pipeline holds more privilege than any developer**, with a *paths in* table that makes the chapter answerable as a list. Gained build provenance attestations alongside `cosign`. Lost the Terraform/`checkov` IaC blocks, the shift-left cost diagram and the AWS-specific runtime-detection stack |
| `README.md` | 60 | Chapter table rebuilt for four; sprint path now 01 → 03 → 04, and a closing note saying where testing strategy actually lives |

**Four decisions this run made:**

- **`04-testing.md` archives and splits three ways — the same treatment run #5 gave `04-git-best-practices.md`
  and run #6 gave `05-docker-troubleshooting.md`.** It was largely a third copy: the test pyramid is in
  `Backend/Testing/01` and `06`, contract testing in `Frontend/Testing/07` and `Backend/Testing/03`,
  flaky tests in five files across the two directories, and Testcontainers in `Backend/Testing/02`. What
  is genuinely pipeline-specific moved: stage ordering by cost, which tier runs where, and quality gates
  into `01-`; service containers with health checks and matrix sharding into `02-`. The Terraform testing
  section was cut outright, out of scope per § 6. `01-` now cross-references
  `#ch-testing-fundamentals` for the tier argument itself, per non-negotiable #7.
- **Security stayed a chapter, because #24 requires it to.** The target table in run #3 named `04-testing.md`
  *and* `05-security.md` as the cut, but #24's own target line says *"add one `ShipAndOperate/pipeline-security.md`
  (Part VIII)"*. Merging security into another chapter would have pre-broken the item that has to land on
  it. It is renamed `04-pipeline-security.md` to match both its title and #24's naming, and **the slug
  `cicd-security` is unchanged** — it has three inbound references, from `Deployment/02-preview-environments.md`,
  `Git/02-advanced-git.md` and `Containers/02-building-and-hardening-images.md`.
- **One slug retired, none created, zero inbound references.** `cicd-testing` goes to the Archive with its
  file. `cicd-fundamentals`, `github-actions`, `deployment-strategies` and `cicd-security` all keep their
  slugs, so **every existing cross-reference into Part VIII still resolves.** ⚠️ `04-pipeline-security.md`
  was `git mv`'d from `05-security.md` but the rewrite is extensive enough that rename detection no longer
  scores it; use `git log --diff-filter=D -- ShipAndOperate/CICD/05-security.md` to reach the old file.
  The archive move scores a clean rename and keeps its history.
- **`04-testing.md` went back as `Archive/devops/cicd/07-testing.md` — its original name** — with
  `in_book: false` and its nav footer repointed at `05-jenkins.md`, its archive sibling. Nothing deleted;
  `git status` shows no deletions anywhere.

**Context7 was used** (`/websites/github_en_actions`) and it caught a stale version: the workflows said
`actions/setup-node@v5`, and the current major is **v7**. `actions/checkout@v6` and `actions/cache@v4`
were confirmed correct. Node matrix moved from `[20, 22]` to `[22, 24]`, `postgres:17` kept. `02-` carries
the required moving-target callout, because action majors move roughly yearly — with the durable principle
named underneath: a version tag is mutable, a commit SHA is not.

**Verified:**

- `pnpm lint:docs`: `front-matter` 0, `broken-link` 0, `missing-readme` 0, `heading-jump` 0, `too-long` 47
  (unchanged). `fence-language` **30 → 12** — all 18 `CICD/` violations cleared; the entire remaining
  baseline is now `DevOps/Agile/`, which belongs to **#25**. `.lint-baseline.json` committed at 12
- `scripts/add-frontmatter.ts`: 324 files, **idempotent on the second pass** (`changed: 0`), all slugs
  unique, every in-book file has a part. Part VIII is **28** in-book files, down from 29
- `pnpm book:collect`: **270 files, 93,689 lines** — down from 271 / 94,061
- Six blocks present in all four, in order; H1 anchors match `slug`; zero relative links in bodies; zero
  `####`; zero retired emoji; 💡 and 🔑 at exactly 1 each and ⚠️ at 3/3/2/3 against the standard's budget of 3
- No dangling references to `04-testing.md`, `05-security.md` or `#ch-cicd-testing` outside `Archive/`
  and this plan's own prose

**The "Done when" is met, measured rather than asserted:**

| Claim | Measured |
| ----- | -------- |
| 22 chapters across six sections | **22** — Git 4, Containers 4, CICD 4, Observability 3, Cloud 3, Deployment 4 |
| 28 files with the section READMEs | **28** — `find ShipAndOperate -name '*.md' \| wc -l` |
| Everything cut is under `Archive/devops/` | **106** archived files, **0** deletions in `git status` |

`147 = 28 + 106 + 18 − 5`: the 18 still in `DevOps/` are `Agile/` (9, **#25**) and `GenAI/` (9, **#21**),
and the 5 are `Deployment/`, written new in run #2. Every original file is accounted for.

**Part VIII closes at 5,664 chapter lines across 22 chapters** (6,018 with the six section READMEs),
against the amended `BOOK-SPEC.md` § 4 budget of **5,500 / ~22**. The chapter count is exact. The line
count is **518 over** — a ~24-line-per-chapter editorial trim, which is **#76**, not a structural cut.
Run #6 projected ~400 and the real figure is 518; the difference is that `CICD/` landed at 1,108 rather
than the ~1,000 run #6 hoped for, for the reason every trim run has now recorded: **the six mandatory
closing blocks cost ~55 lines before any teaching happens**, so four standard-compliant chapters do not
fit in 1,000 lines. Every per-section line target in run #3's table was ~30% low; every chapter *count*
in it was exact.

| Section | Final | Run #3's target | Done in |
| ------- | ----- | --------------- | ------- |
| `Git/` | 4 / 1,026 | 3–4 / ~750 | run #5 |
| `Containers/` | 4 / 1,117 | 4 / ~750 | run #6 |
| `CICD/` | **4 / 1,108** | 4 / ~800 | **run #7** |
| `Observability/` | 3 / 865 | 3 / ~650 | run #4 |
| `Cloud/` | 3 / 681 | 3 / ~680 | run #3 |
| `Deployment/` | 4 / 867 | — | run #2, written new |

> ⚠️ **A duplicate anchor this run found and did not fix, because no item owns it.**
> `SystemDesign/Microservices/06-deployment.md` has `slug: deployment` in its front matter but carries
> `{#ch-deployment-strategies}` on its H1 — the same anchor as `ShipAndOperate/CICD/03-deployment-strategies.md`.
> `lint:docs` cannot see it: `front-matter` checks slug uniqueness, not anchor uniqueness, and
> `broken-link` only checks relative paths. So **five inbound cross-references to `#ch-deployment-strategies`
> are currently ambiguous**, and the two chapters overlap by roughly half — 228 lines of blue/green, canary
> and rolling in Part VI against 252 in Part VIII. #22 and #23 cover the SystemDesign scalability
> triplicate but not this pair. Two things worth doing: **make the anchor match its own slug** as a
> one-line fix, and **decide which part owns deployment strategy** per non-negotiable #7. Whoever runs
> #22 is the natural owner. ⚠️ It is also worth adding an **anchor-uniqueness rule to `lint:docs`** —
> #71 rewrites cross-references and will bind to whichever anchor it finds first.

> ⚠️ **`updated:` in front matter lags by one commit.** `scripts/add-frontmatter.ts` derives `updated`
> from the file's last *git commit* date, not the filesystem, so it rewrote this run's hand-set
> `2026-08-29` back to `2026-08-28`. Re-running the script after committing sets it correctly. This is
> the script's design, not a bug, but it means the date is only right on files that are already
> committed — worth knowing for **#70** and **#71**, which both touch front matter.

---

### - [x] 21. Replace `DevOps/GenAI/` with the real `AI/` directory `S` — ✅ **done 2026-08-29**

`DevOps/GenAI/` (8 topics + README, 1,853 lines) covers "AI tools for DevOps" — using Copilot for scripts, AI for
runbooks. It is thin and it is not what the 2027 reader needs. Two files are worth salvaging into Part VII:
`06-prompt-engineering.md` and `07-security.md`.

**Done when:** the two salvageable files are staged for Phase 4, the rest is in `Archive/devops/genai/`,
and the directory is gone from the content tree.

**Delivered — 2026-08-29.**

All 9 files moved by `git mv`, so history follows each one. `DevOps/GenAI/` no longer exists; `DevOps/`
now holds only `Agile/`, which belongs to **#25**.

| Where | Files | Which |
| ----- | ----- | ----- |
| `Archive/devops/genai/` | 7 | `01-ai-tools`, `02-code-development`, `03-documentation`, `04-troubleshooting`, `05-monitoring`, `08-future`, and the section `README.md` |
| `Archive/salvage/ai/` | 2 | `06-prompt-engineering.md` → **#45**, `07-security.md` → **#49** |

**"Staged for Phase 4" needed somewhere to mean.** There was no holding area for in-scope material whose
part has not been written, and the two obvious options were both wrong: leaving the files in the content
tree puts unwritten-part material in front of `lint:docs` and the book build, while dropping them into
`Archive/devops/genai/` loses the distinction the done-when line draws between *the two* and *the rest*.
So this run added **`Archive/salvage/`** — under `Archive/` because that is the one tree the build and the
lint already skip, but explicitly not out of scope. A file qualifies only if the item that will absorb it is
named with a chapter number; anything vaguer is archived, not staged. `Archive/salvage/README.md` states
the rule and the absorb procedure, and `Archive/salvage/ai/README.md` records what is worth lifting from
each of the two. **The goal state is an empty `Archive/salvage/`** — #45 and #49 delete their file once
its content has a chapter.

Also fixed: the dangling `../GenAI/03-documentation.md` link in `DevOps/Agile/06-collaboration.md` (the
runbook sentence now stands without it), the two `GenAI/` lines in the root `README.md`, the layout block
and the "still in `DevOps/`" paragraph in `Archive/README.md`, and the now-dead `"DevOps/GenAI"` entry in
`OUT_OF_BOOK_DIRS` in `scripts/add-frontmatter.ts` — the directory is physically archived, so the
metadata override is redundant.

**Left deliberately:** `Archive/devops/README.md` still links to `./GenAI/…` in old capitalised paths. It
links that way to every archived section — `./Linux/`, `./Docker/`, 144 links in all — because it is the
preserved 1,378-line curriculum index, a historical artefact rather than a maintained page. `Archive/` is
not linted, so nothing breaks. **#30** splits it and is the place to decide its fate.

`pnpm lint:docs`: 270 files, 59 violations, **no rule regressed** — the two counts still on baseline
(12 fence, 47 too-long) were unmoved by this item, so `.lint-baseline.json` needed no change.

---

### - [x] 22. Merge the SystemDesign scalability triplicate `M` — ✅ **done 2026-08-29**

Load balancing, caching, and CDN each appear in **three** directories:

| Topic          | `BuildingBlocks/` | `Scalability/` | `Infrastructure/` | `DevOps/Networking/` |
| -------------- | ----------------- | -------------- | ----------------- | -------------------- |
| Load balancing | `01` (183)        | `03` (123)     | —                 | `03` (303)           |
| Caching        | `02` (207)        | `04` (166)     | —                 | —                    |
| CDN            | `03` (203)        | `06` (161)     | —                 | `06` (344)           |

Keep the `BuildingBlocks/` version as canonical (it is the better-structured set), fold in the unique
material from the others, and delete the duplicates.

**Done when:** each of the three topics exists in exactly one place, with the best content from all copies.

**Delivered — 2026-08-29.**

`SystemDesign/Scalability/03`, `04` and `06` are deleted. The three `BuildingBlocks/` chapters absorbed
what was unique in them and were rewritten to the Book Chapter Standard — they had the opening block
from #12 but none of the closing three, so this was a bring-up-to-standard edit, not a paste.

| Canonical chapter | Lines | Folded in from the duplicates |
| ----------------- | ----- | ----------------------------- |
| `01-load-balancing.md` | 255 | Auto-scaling ↔ balancer lifecycle, connection draining, multi-region and cross-zone routing, the single-balancer SPOF |
| `02-caching.md` | 265 | Hit-ratio-as-capacity arithmetic, the cache/do-not-cache decision table, warm-up on deploy, TTL jitter |
| `03-cdn.md` | 207 | Origin-offload framing, achievable hit ratio by content type, geographic latency, purge-on-deploy narrowed to entry points |

**The `DevOps/Networking/` column of the table above was already archived by #20** — but one thing in it
was worth rescuing anyway. `Archive/devops/networking/03-load-balancing.md` argues that a health check
testing shared dependencies fails every instance at once and empties the pool, which is an outage
strictly worse than the blip that triggered it. The canonical chapter said the opposite ("health
endpoint should check dependencies"). That is now corrected to a liveness/readiness split with the
detection-time arithmetic — the best single paragraph the merge recovered, and it came from an archived
file, so "the best content from all copies" meant reading the archived ones too.

⚠️ **A fourth copy of CDN exists, and #22's table predates it.** `ShipAndOperate/Cloud/03-storage-and-delivery.md`
(#20 run #4) covers cache keys, `Cache-Control` and invalidation from Part VIII's side. Per
non-negotiable #7 this run drew the line rather than leaving it ambiguous: **Part VI owns the
architecture** — what a CDN offloads, the hit-ratio arithmetic, anycast, origin shielding, what may not
go to an edge — and **Part VIII owns the operation** — bucket wiring, origin access control, cache-key
configuration, storage tiers, the header mechanics. The Part VI chapter now keeps a four-row policy
table and cross-references `#ch-object-storage-and-delivery` for the directive semantics instead of
restating them. Cut on the way through, as vendor detail that ages badly: the three-provider comparison
table and the load-balancer-vs-API-gateway table (**#31** owns API gateway deduplication).

**Two slugs changed**, now that nothing competes for them: `building-blocks-load-balancing` → `load-balancing`
and `building-blocks-cdn` → `cdn`. Both files already carried `{#ch-load-balancing}` and `{#ch-cdn}` as
their H1 anchors, so this closes the slug/anchor mismatch the #20 notes flagged rather than widening it.
`caching` was already consistent. Nothing referenced the old slugs.

**Also updated:** `SystemDesign/InterviewQuestions/16-typeahead.md` pointed at the deleted
`Scalability/04` — retargeted to `#ch-caching` as a chapter cross-reference, not a relative path.
`SystemDesign/Scalability/README.md` lost its three duplicate rows. `SystemDesign/README.md` needed
nothing: its section table was already written for the post-#23 shape.

`pnpm lint:docs`: 270 files, 59 violations, **no rule regressed**. The file count is unchanged because
the deleted duplicates were `in_book: false` and `loadBook()` filters those out before counting —
`.lint-baseline.json` is untouched for the same reason.

---

### - [x] 23. Dissolve `SystemDesign/Scalability/` and `SystemDesign/Infrastructure/` `M` — ✅ **done 2026-08-29**

After item 22, `Scalability/` has ~4 unique files (horizontal/vertical scaling, database scaling, async
processing, partitioning) and `Infrastructure/` has ~8 that overlap `ShipAndOperate/` and `SystemDesign/Fundamentals/`.

- Move `07-async-processing.md` and `08-partitioning.md` → `BuildingBlocks/`
- Fold `01-horizontal-scaling.md` + `02-vertical-scaling.md` + `05-database-scaling.md` → `Fundamentals/02-scalability.md`
- Archive `Infrastructure/` entirely — Part VIII covers it better

**Done when:** ~~`SystemDesign/` has 5 directories~~ — **amended, see below.** `SystemDesign/` no longer
contains `Scalability/` or `Infrastructure/`, and every chapter that was in them is either merged into a
surviving chapter or archived.

**Delivered — 2026-08-29.**

`SystemDesign/Scalability/` and `SystemDesign/Infrastructure/` are both gone. Four chapters were
rewritten to the Book Chapter Standard in the process, because folding content into a chapter that had
only the #12 opening block meant finishing it:

| File | Lines | What happened |
| ---- | ----- | ------------- |
| `Fundamentals/02-scalability.md` | 243 | Rewritten as the ladder of levers. Absorbed horizontal, vertical and database scaling; **shed** the caching, load balancing, async and microservices sections it used to restate |
| `BuildingBlocks/11-async-processing.md` | 246 | Moved from `Scalability/07`, rewritten, `in_book: false` → `true` |
| `Database/03-sharding.md` | 291 | Absorbed the unique half of `Scalability/08-partitioning.md` |
| `BuildingBlocks/01`–`03` | — | Already done by #22 |

`Archive/systemdesign/infrastructure/` holds all 9 Infrastructure files, with a new
`Archive/systemdesign/README.md` explaining why. The `Scalability/` files were **merged, not archived** —
they were duplicates or fold-ins, git history holds the originals, and an archive copy would just be a
third version of text that now lives in one place.

⚠️ **Amendment 1 — partitioning did not go to `BuildingBlocks/`.** `Database/03-sharding.md` already
owned range/hash/directory strategies, shard-key selection, the hotspot problem and cross-shard queries.
Moving `Scalability/08-partitioning.md` next to it would have manufactured exactly the duplicate #22 and
#23 exist to remove. Instead its genuinely unique material went into the sharding chapter: **consistent
hashing with virtual nodes**, and the **re-sharding procedure**. Both were gaps the chapter had promised
and not delivered — its "In this chapter" line advertised re-sharding with no section behind it, and its
interview template recommended consistent hashing without ever explaining it.

⚠️ **Amendment 2 — the five-directory "Done when" was never reachable by this item.** It describes the
state after **#24** (which dissolves `Security/`) and **#28** (which renames `InterviewQuestions/` to
`CaseStudies/`), neither of which #23 may touch under the one-item rule. The line is now scoped to what
this item can actually verify. `SystemDesign/` today: `Fundamentals/`, `BuildingBlocks/`, `Database/`,
`Frontend/`, `Microservices/`, `InterviewQuestions/`, `Security/`.

🔴 **The `Microservices/` gap #13 flagged is now decided: keep it.** #13 left #23 two options — fold its
8 chapters into `BuildingBlocks/` and `Backend/`, or keep the directory and correct this list. Keeping
it, for three reasons: service boundaries, resilience and distributed data are asked directly in senior
system design rounds; redistributing 8 chapters is an item's worth of work, not a sub-task of this one;
and #13 already wrote it a full part-opener. **But it is not free.** Part VI's budget is ~34 chapters and
Part VI currently holds 8 + 11 + 10 + 13 + 8 + 20 + 6 = **76**, so the part is over budget with or
without it — #24, #28 and #31 all cut into that number and none of them is enough alone. A later item
should trim `Microservices/` to about 5 chapters; **#31** already removes its API gateway duplication and
is the natural place to start.

**Also updated:** eight dangling cross-references — `InterviewQuestions/02`, `07`, `09`, `18` and
`BuildingBlocks/04`, `05`, `09`, `10` all pointed into the dissolved directories, and are now
`#ch-` anchors rather than the relative paths they were. `SystemDesign/README.md` (transitional-directory
callout, Building Blocks count 10 → 11), `SystemDesign/BuildingBlocks/README.md` (chapter 11 row),
`Archive/README.md` (layout block), and `OUT_OF_BOOK_DIRS` in `scripts/add-frontmatter.ts`, which is now
down to its last entry — `SystemDesign/Security`, waiting on #24.

`pnpm lint:docs`: 271 files, 59 violations, **no rule regressed**; 0 broken links, 0 missing READMEs.
The file count rose by one because `11-async-processing.md` became `in_book: true` while the merged-away
files were already `in_book: false`. `.lint-baseline.json` unchanged — neither of the two non-zero rules
moved.

---

### - [x] 24. Consolidate security into one coherent spine `L` — ✅ **done 2026-08-29**

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

**Delivered:**

Security is now **two** directories plus one pipeline chapter, down from five directories and 37 files
to 12 chapters and one pipeline chapter. The five-place table above was already stale when this item
ran: `DevOps/Security/` and `DevOps/DevSecOps/` went to `Archive/devops/` at #20, and #20 also wrote
`ShipAndOperate/CICD/04-pipeline-security.md`, which is the chapter this item planned to add. It covers
the secrets hierarchy, OIDC over stored credentials, secret scanning, SCA/SAST/DAST/container scanning,
SBOM and provenance — everything the two archived directories contributed. **Nothing new was written for
Part VIII.** The item's `ShipAndOperate/pipeline-security.md` path is amended to the file that exists.

**`Frontend/Security/` — 5 chapters → 4, browser-side:**

| Was                          | Now                                | Change                                              |
| ---------------------------- | ---------------------------------- | --------------------------------------------------- |
| `01-xss-prevention.md`       | `01-xss-prevention.md`             | Six-block close; TOC and back-link removed          |
| `02-csrf-protection.md`      | — deleted                          | CSRF is a server-enforced defence; canonical in `Backend/Security/05` |
| `03-csp-headers.md`          | `02-content-security-policy.md`    | Renumbered                                          |
| `04-secure-headers.md`       | `03-security-headers.md`           | Renumbered; canonical for the whole header set      |
| `05-input-sanitization.md`   | `04-client-side-input-handling.md` | Rewritten — see below                               |

`04-client-side-input-handling.md` is a new chapter on the same file path. The old one duplicated
`Backend/Security/06` (server validation, Zod middleware) and `Backend/Security/07` (SQL and command
injection) almost line for line. What it now teaches is the part only the browser can do: sharing one Zod
schema across the boundary so the two sides cannot drift, browser-side upload checks and why they are UX,
`postMessage` origin and payload validation, and open redirects. Those last two were undocumented
anywhere in the repository.

**`Backend/Security/` — 8 chapters → 8, server-side:**

| #  | Chapter                                     | Change                                                    |
| -- | ------------------------------------------- | --------------------------------------------------------- |
| 02 | `02-oauth.md`                               | Gained SSO (SAML vs OIDC) and magic links from `SystemDesign/Security/01` |
| 03 | `03-passwords.md` → *Passwords and MFA*     | Gained TOTP, WebAuthn, recovery codes; slug now matches its anchor |
| 04 | `04-https.md` → `04-encryption.md`          | Retitled *Encryption in Transit and at Rest*; gained AES-GCM at rest, KMS envelope encryption, key rotation |
| 05 | `05-cors-csrf.md`                           | Canonical CSRF; gained the SPA token-wrapper section from the deleted frontend chapter |
| 06 | `06-validation.md`                          | Gained SSRF as a URL-validation problem, from `SystemDesign/Security/05` |
| 08 | `08-security-headers.md` → deleted          | Fully duplicated `Frontend/Security/02` and `03`, helmet setup included |
| 08 | `08-authorisation.md` — **new**             | RBAC, ABAC, ACLs, policy engines, tenant isolation, scopes, IDOR — from `SystemDesign/Security/02` |

Authorisation was the largest genuine gap the audit found. `SystemDesign/Security/02` was the only place
it existed, the directory was already marked `in_book: false`, so the manuscript had no chapter on the
vulnerability class that has topped the OWASP Top 10 since 2021.

**`SystemDesign/Security/` — archived whole** to `Archive/systemdesign/security/` (6 chapters + README)
after the merges above. Two chapters were archived without merging, deliberately:

- **`04-api-security.md`** — HTTPS, JWT, OAuth, CORS and input validation were all duplicates. Rate
  limiting is `Backend/API/04`. Secrets management is the pipeline chapter. **Request signing and
  idempotency keys are API-design topics with no home yet** — flagged for **#56**, not lost.
- **`06-compliance.md`** — GDPR, HIPAA, PCI-DSS, SOC 2, audit logging, data retention and residency.
  Genuinely unique and genuinely out of scope: `BOOK-SPEC.md` § 4 gives no part that covers governance,
  and the frontend-relevant slice of it (the European Accessibility Act) is already Part II's.

**Also fixed along the way:** all four `Frontend/Security/` chapters ended with a stray `</content>`
and `</invoke>` pair — an authoring artefact that had been in the tree since the files were written and
would have been typeset verbatim. Every hand-written Table of Contents and `[← Back]` navigation footer
in both directories is gone, the two retired emoji in use (🔴 and ✨) are replaced, and the four relative
`./NN-file.md` cross-references in chapter bodies are now `#ch-` anchors — a small down payment on **#71**.

`OUT_OF_BOOK_DIRS` in `scripts/add-frontmatter.ts` is now **empty**, and the comment says it should stay
that way: every archived directory is physically under `Archive/`, which `findMarkdown()` already skips.
Archiving by moving beats archiving by flag.

**Left undone:** the surviving 12 chapters are not all at the six-block standard. The eight this item
materially edited are; `Backend/Security/01-jwt.md` and `07-sql-injection.md` keep an `## Overview` and a
checklist-shaped tail that **#76**'s editorial pass should finish. Said plainly rather than implied.

`pnpm lint:docs`: 270 files, 59 violations, **no rule regressed**; 0 broken links, 0 missing READMEs.
`.lint-baseline.json` unchanged.

---

### - [x] 25. Move Agile into the human layer `S` — ✅ **done 2026-08-29**

`DevOps/Agile/` (8 topics + README, 1,650 lines) is about Scrum, Jira, and team metrics — that is Part IX, not DevOps,
and 8 files is too many. Condense to **two**: `Behavioral/ways-of-working.md` (Agile, Scrum, sprint rituals,
DORA metrics) and fold collaboration content into the existing communication chapters. Archive the rest.

**Done when:** `DevOps/Agile/` is gone, two condensed chapters exist in Part IX.

**Delivered:**

`DevOps/Agile/` is at `Archive/devops/agile/`, and **`DevOps/` no longer exists** — this item removed
the last directory in it. 1,650 lines across 8 chapters became **456 lines across 2**, plus about 90
lines folded into an existing communication chapter.

| New chapter | Lines | Built from |
| ----------- | ----- | ---------- |
| `Behavioral/09-ways-of-working.md` | 217 | `01-fundamentals`, `02-scrum`, `04-cicd-agile`, `07-metrics` |
| `Behavioral/10-engineering-culture.md` | 239 | `03-devops-culture`, `08-team-practices` |

The split is deliberate. **09** is how a team delivers — Scrum against Kanban, work in progress,
deploy versus release, feature flags, the four DORA metrics with their performance bands, honest
measurement, and error budgets. **10** is how a team behaves — you build it you run it, blameless
post-mortems, psychological safety, code review, sustainable on-call, and planning to 80% of capacity.
Both are written for a behavioural round rather than as process reference: every section ends in
something a candidate can say out loud, and each chapter's interview questions are scenario-shaped.

**`06-collaboration.md` folded into `Communication/07-written-communication.md`** as the item asked —
choosing the right home for a document, architecture decision records with a worked example, runbooks
and the "last tested" date, and the async decision request with an explicit deadline and default.
That chapter was 322 lines and the limit is 400, so paying for the addition meant cutting something:
the two full interview email templates went, condensed to a short paragraph. They were thin,
duplicated the behavioural material, and carried the author's name in a chapter body, which
non-negotiable #11 does not allow. **#29** would have cut them anyway.

**Archived without merging:** `05-jira.md` — tool-specific and the fastest-dating file in the
directory — and the ceremony detail from `02-scrum.md`. `BOOK-SPEC.md` § 6 lists "Agile ceremonies in
depth" as out of scope, and eight files was the thing it was describing.

**`Behavioral/` is now "Part IX — Behaviour and Ways of Working"**, ten chapters rather than eight. The
retitle is honest: 09 and 10 are not interview technique, they are the raw material several of the
STAR stories come out of, and the README says so.

**Also updated:** `scripts/add-frontmatter.ts` lost its four `PART_OVERRIDES` entries and its five
`OUT_OF_BOOK_FILES` entries for `DevOps/Agile/*`, and both scripts lost the `["DevOps", 8]` prefix
mapping — the directory is gone, so the mapping was dead. `Archive/README.md`, the root `README.md`
layout block and `CLAUDE.md` no longer list `DevOps/`.

`pnpm lint:docs`: 269 files, 47 violations. **`fence-language` went 12 → 0** — every one of the twelve
remaining unlabelled fences in the repository was in `DevOps/Agile/`, exactly as #20's note predicted.
`.lint-baseline.json` updated to 0 for that rule.

---

### - [x] 26. Merge `OOP/` into `Backend/DesignPatterns/` `M` — ✅ **done 2026-08-29**

`OOP/` is 8 files / 4,662 lines. `Backend/DesignPatterns/` is 6 files / 2,210 lines including its own
SOLID chapter. In a frontend-heavy book, four chapters on encapsulation/inheritance/polymorphism/abstraction
is more than the topic earns.

**Target:** one `Foundations/oop-and-patterns/` section of ~5 chapters — OOP core concepts (one chapter,
merged from the current four), composition vs inheritance, SOLID, GoF patterns you actually use in TS
(factory, observer, strategy, adapter, decorator), architectural patterns.

**Done when:** OOP content is 5 chapters, SOLID exists once, and `OOP/` no longer exists as a top-level directory.

**Delivered:**

`OOP/` (7 chapters + README, 4,662 lines) and `Backend/DesignPatterns/` (5 chapters, 2,210 lines) are
now **one five-chapter section of 1,492 lines** — 12 chapters to 5, and 6,872 lines to 1,492, a 78%
cut. `OOP/` no longer exists as a top-level directory.

| #  | Chapter | Lines | Built from |
| -- | ------- | ----- | ---------- |
| 01 | `01-oop-core-concepts.md` | 261 | `OOP/01`–`05` — four pillars in one chapter |
| 02 | `02-composition-over-inheritance.md` | 242 | `OOP/06` |
| 03 | `03-solid-principles.md` | 350 | the existing SOLID chapter, renumbered from 05 |
| 04 | `04-patterns-in-typescript.md` | 303 | the creational, structural and behavioural chapters, condensed |
| 05 | `05-architectural-patterns.md` | 336 | the existing chapter, renumbered from 04 |

**The amendment this item needed.** Its **Target** line said `Foundations/oop-and-patterns/`, but its
own title and its "Done when" both say `Backend/DesignPatterns/`, and so do the two transitional
READMEs #13 wrote — `OOP/README.md` and `DesignPatterns/README.md` — which had already committed to
the merge target in print. Creating a new top-level `Foundations/` for one section would have left
Part I scattered across **three** trees instead of two, and no other item creates or populates it.
Merged into `Backend/DesignPatterns/`, which both scripts already map to Part I. The README now says
plainly why a Part I section lives under `Backend/`.

**What the writing had to decide.** Four chapters on encapsulation, inheritance, polymorphism and
abstraction collapse into one, and the way to make 261 lines carry 3,249 is to drop the definitions
and keep what a senior interview probes: that TypeScript's `private` is erased at compile time while
`#field` is enforced by the runtime, that structural typing means `implements` is an annotation rather
than a condition, and that an abstraction with one implementation is indirection. Chapter 04 does the
same to the Gang of Four — six patterns with code, and a table mapping the rest to the TypeScript form
that replaces them, because a singleton is a module and a decorator is a higher-order function here.

**Dependency injection moved.** It was a full section in the architectural-patterns chapter and it is
now taught in 02, where composition is the subject. What 05 keeps is the composition root — the one
module that names concrete classes — which is the architectural half of the idea. That trade is what
brought 05 from 402 lines to 336.

**Archived, not deleted:** `Archive/foundations/`, new, with `oop/` (all 7 + README) and `patterns/`
(the three merged chapters). Nine patterns lost their worked examples — abstract factory, prototype,
proxy, composite, bridge, command, state, chain of responsibility, template method — and the archive
README names all nine, so the decision is reviewable rather than silent.

**Also fixed:** `SystemDesign/InterviewQuestions/19-parking-lot.md` pointed at `../../OOP/01-…md`,
which this item would have broken; it is now a `#ch-` anchor. Both scripts lost the `["OOP", 1]`
prefix mapping. The retired `🔴` and `✨` callouts in the two surviving chapters are replaced, the
`### 💡 **Intent**` headings are gone, and both chapters now close with Key Takeaways → Interview
Questions → What to Read Next.

`pnpm lint:docs`: 262 files, 36 violations. **`too-long` went 47 → 36** — all eleven files this item
removed from the manuscript were over 400 lines. `.lint-baseline.json` updated to 36.

---

### - [x] 27. Trim the DSA chapters to book length `L` — ✅ **done 2026-08-30**

DSA is 19,115 lines across 16 files — files run 647 to 2,006 lines against the repo's own 150–400 rule.
`16-graph-algorithms.md` alone is 2,006 lines; `11-binary-tree-traversal.md` is 1,809.

**Recommendation:** DSA becomes a **companion volume / appendix**, not Part I of the main book. Trim each
pattern to: what the pattern is → how to recognise it → one worked template → 2 worked examples →
complexity → 6–8 curated LeetCode problems as a table (not solved inline).

Target: 16 files × ~350 lines = ~5,600 lines (down from 19,115).

**Split across sessions:** 3–4 patterns per session.

**Done when:** every DSA file is under 400 lines and the solved-solution bulk lives in a linked repo or appendix.

**Delivered:**

- All **sixteen** DSA chapters trimmed to the Book Chapter Standard across four runs in one day:
  **19,281 lines → 4,520**, every chapter between **218 and 363** lines against the 400-line limit and
  the ~220 target. The appendix budget is 5,600, so it lands under.
- Each chapter carries the six blocks, a curated 8-row LeetCode table instead of solved solutions,
  Key Takeaways, Interview Questions, `#ch-` cross-references only, and TypeScript-only fences.
- The solved-solution bulk went to **`Archive/dsa-solutions/`** — a `git mv`, not a delete. There is no
  linked repository yet, so this directory is it. Its README records what every chapter dropped and what
  each one kept, so the cuts are reviewable.
- `.lint-baseline.json` `too-long` dropped **47 → 20** over the item's four runs. All 16 DSA files are
  off the violation list.
- **#16's prev/next footers are dissolved inside `DSA/`** — the standard forbids back-links. `grep` over
  `DSA/` returns none. The chain survives intact inside `Archive/dsa-solutions/`, where all sixteen
  originals now sit, so it resolves end to end there. #16 is not reopened; it fixed a real breakage at
  the time and this supersedes it.

**Deliberately not done:** no separate linked repository was created. `BOOK-SPEC.md` asks for "a linked
repository" and `Archive/` is the repo's existing answer to "useful, but not in the book" — the same
treatment #26 gave `Archive/foundations/`. If a standalone solutions repo is ever published, the sixteen
files move wholesale and the READMEs' pointers change; nothing else does.

**A correction this item forced on the plan.** The item's own header said DSA was "19,115 lines across 16
files". Measured from the archived originals it is **19,281**. The target arithmetic — 16 × ~350 = ~5,600 —
held; the starting figure was 166 lines low.

**Progress — runs #1–4, 2026-08-30. All sixteen chapters done.**

**Where the bulk went.** There is no linked repo, so the originals were `git mv`d to
**`Archive/dsa-solutions/`** — the repository's existing answer to "useful, but not in the book", and
the same treatment #26 gave `Archive/foundations/`. Each archived file keeps the name its trimmed
successor now uses in `DSA/`, so the pairing is obvious. `Archive/dsa-solutions/README.md` names what
each chapter dropped, so the cuts are reviewable rather than silent, and `Archive/README.md`'s layout
tree and prose both mention it — it is the one sub-tree whose originals were **replaced** rather than
removed.

**Run #1:**

| File                          | Was   | Now | Kept                                                     |
| ----------------------------- | ----- | --- | -------------------------------------------------------- |
| `01-time-space-complexity.md` | 1,629 | 273 | Growth table, a new **constraint → target complexity** table, loop and recurrence rules, space including the call stack, five mistakes, two reference tables |
| `02-prefix-sum.md`            | 862   | 218 | The leading-zero build, the range formula, the running-sum + frequency-map variant and the rearrangement behind it |
| `03-two-pointers.md`          | 1,397 | 243 | Converging and read/write shapes, both correctness arguments, the 3Sum duplicate guard, one Mermaid decision diagram |
| `04-sliding-window.md`        | 907   | 239 | Fixed and dynamic templates, why the inner `while` is still `O(n)`, a table of what "state" means per question type |

4,795 lines → 973. Every chapter carries the six blocks, an 8-row curated problem table, Key
Takeaways, Interview Questions and `#ch-` cross-references.

**What the trim actually preserved.** The cut was not proportional. What survived is the material a
reader cannot reconstruct from the problem statement — the *argument* for why a pattern is correct:
why moving the shorter wall in Container With Most Water is safe, why a nested `while` inside a `for`
is still linear, why `sum(i…j) = k` becomes a hash-map lookup. What went is repetition — the same
idea as prose, then ASCII art, then a numbered trace, then an FAQ entry.

**#16's prev/next footers are being dissolved.** The Book Chapter Standard forbids back-links, so
each trimmed chapter drops its footer and ends on `What to Read Next` instead. The remaining 12 keep
theirs and still resolve, because the files they point at are all still in `DSA/`. Once this item
completes, nothing in `DSA/` has a footer and the chain lives only inside `Archive/dsa-solutions/`.
**#16 is not being reopened** — it fixed a real breakage at the time, and this supersedes it.

**Verified:** `pnpm lint:docs` — `too-long` **36 → 32**, all four files removed from the violation
list, every other rule still 0. `.lint-baseline.json` updated to 32. `pnpm book:collect` collects 262
files. All 29 TypeScript fences in the four new chapters were extracted and compiled with
`tsc --strict --target es2022`: **zero errors**. Every `#ch-` anchor used resolves to exactly one H1
(`#ch-fast-slow-pointers` was wrong on first write and is corrected to `#ch-fast-and-slow-pointers`).

---

**Run #2, 2026-08-30 — chapters 05–08.**

| File                                 | Was   | Now | Kept                                                                                    |
| ------------------------------------ | ----- | --- | --------------------------------------------------------------------------------------- |
| `05-fast-slow-pointers.md`           | 1,275 | 272 | The gap-closes-by-one argument, cycle detection, both midpoint offsets, the full `a = (k − 1)(b + c) + c` derivation as a Mermaid diagram plus four lines of algebra, Happy Number as a cycle with no list |
| `06-linkedlist-in-place-reversal.md` | 810   | 240 | The three-pointer loop with a table of what breaks if the three lines are reordered, the dummy-node head-insertion sublist reversal, the `O(n)` stack cost of the recursive version |
| `07-monotonic-stack.md`              | 665   | 260 | The discard rule, the template, a four-row increasing/decreasing table with the pop-versus-push distinction, the amortised `O(n)` argument, the circular `2n` pass, a Mermaid diagram of the histogram measure step |
| `08-top-k-elements.md`               | 784   | 304 | Why `k` largest needs a **min**-heap, a compact 25-line generic `Heap<T>`, top-k by frequency, and a six-row table of when quickselect or bucket sort beats a heap — with the linear bucket-sort solution written out |

3,534 lines → 1,076.

**Two things this run had to fix, not just trim.** `08-top-k-elements.md` contained a **Python**
solution for Top K Frequent Elements, against the repo's TypeScript-only rule — rewritten in
TypeScript, and the Python-specific `heapq` takeaway ("Python's heapq is a min-heap by default")
replaced with the fact that actually matters in an interview: **JavaScript ships no heap at all**, so
the chapter now carries a compact one. `06-linkedlist-in-place-reversal.md` used `####` headings,
which the standard forbids; the whole four-level breakdown is gone rather than re-levelled.

**Verified:** `pnpm lint:docs` — `too-long` **32 → 28**, all four files removed from the violation
list, every other rule still 0. `.lint-baseline.json` updated to 28. All **35** TypeScript fences in
the four new chapters were extracted, concatenated per chapter, and compiled with
`tsc --strict --target es2022`: **zero errors**. Every `#ch-` anchor referenced resolves to exactly one
H1 within the manuscript, checked through `loadBook()` rather than by grep so `Archive/` is excluded
the way the build excludes it.

**One pre-existing defect found, not fixed** — it belongs to another item. `ch-deployment-strategies`
is a **duplicate anchor** across two in-book files: `SystemDesign/Microservices/06-deployment.md` and
`ShipAndOperate/CICD/03-deployment-strategies.md`. Nothing in the lint checks anchor uniqueness, so it
is silent today, and any cross-reference to it in print will resolve to whichever comes first.
Closest owner is **#31** (deduplicate the smaller triplicates) or **#70** (assign chapter numbers).

---

**Run #3, 2026-08-30 — chapters 09–12.**

| File                            | Was   | Now | Kept                                                                                              |
| ------------------------------- | ----- | --- | ------------------------------------------------------------------------------------------------- |
| `09-overlapping-intervals.md`   | 820   | 263 | The single overlap test that replaces the four-case gallery, merging with the `Math.max` extension, the decoupled sweep line as a Mermaid diagram, a six-row sort-key table, and the exchange argument for sorting by **end** |
| `10-modified-binary-search.md`  | 720   | 312 | The reframe that the search space is the *predicate*, the two distinct loop shapes stated as separate templates, the rotated sorted-half test, `lowerBound` with LC 34 falling out of it, and answer-space search via Koko Eating Bananas |
| `11-binary-tree-traversal.md`   | 1,825 | 284 | The four orders as one table, why inorder on a BST is sorted, the iterative inorder as the only one worth memorising, level order with the `levelSize` trick and the `shift()` warning, `O(h)` versus `O(w)` space |
| `12-depth-first-search.md`      | 1,583 | 327 | Mark-on-entry as the defining rule, grids as implicit graphs with a single top guard, path tracking with push/pop and the copy, the explicit-stack version and its pop-side visited check, two-state directed-cycle detection |

4,948 lines → 1,186.

**A division of labour had to be drawn, not just a trim.** Chapters 11–14 and 16 all covered the same
ground in the originals — 11 and 12 both taught level-order BFS, 12 duplicated 14's backtracking and
16's topological sort. The trimmed set splits it: **11** owns the traversal *orders* and what each one is
for, **12** owns DFS as a strategy on graphs and grids (visited sets, marking, path tracking), and both
cross-reference 13, 14 and 16 rather than restating them. That is the same call #26 and #31 make about
duplication, applied inside the appendix.

**Verified:** `pnpm lint:docs` — `too-long` **28 → 24**, all four files off the violation list, every
other rule still 0. `.lint-baseline.json` updated to 24. All **40** TypeScript fences compiled with
`tsc --strict --target es2022`: **zero errors**. All 11 `#ch-` anchors referenced by the new chapters
resolve to exactly one in-book H1, checked through `loadBook()`. `ch-graph-algorithms`,
`ch-backtracking` and `ch-breadth-first-search` resolve against the still-untrimmed 13, 14 and 16, so
the forward references are live rather than dangling.

**The `ch-deployment-strategies` duplicate anchor logged in run #2 is still open.** It is unrelated to
this item; owner is #31 or #70.

---

**Run #4, 2026-08-30 — chapters 13–16. Item complete.**

| File                          | Was   | Now | Kept                                                                                            |
| ----------------------------- | ----- | --- | ----------------------------------------------------------------------------------------------- |
| `13-breadth-first-search.md`  | 1,692 | 307 | Why first arrival is shortest arrival, the ring-swap template that avoids `shift()`, mark-on-enqueue, multi-source seeding as a Mermaid diagram, and the `O(w)` versus `O(h)` cost that makes BFS the wrong default |
| `14-backtracking.md`          | 1,544 | 321 | Choose/explore/un-choose, the copy rule, a four-row table separating subsets from combinations from permutations from reuse, `close < open` as the canonical prune, the `i > start` duplicate skip, and the exponential bounds stated plainly |
| `15-dynamic-programming.md`   | 750   | 294 | The two preconditions as a table, the five questions, both directions of Coin Change, rolling to `O(1)` space, the four state shapes, and the `[1, 3, 4]` greedy counterexample |
| `16-graph-algorithms.md`      | 2,022 | 363 | The four properties to clarify first, a representation table, Kahn's with its free cycle check, Dijkstra with the stale-entry skip standing in for decrease-key, Union-Find with both optimisations, and a nine-row algorithm-selection table |

6,008 lines → 1,285.

**15 did not need expanding after all.** Run #3 flagged it as a possible under-400 file needing growth
rather than a cut; at 294 lines it sits comfortably above the 150 floor and near the ~220 target. It was
the only chapter in the appendix whose original was already close to book length, and the trim was mostly
removing the duplicated top-down/bottom-up explanations rather than solution bulk.

**16 was the largest file in the appendix and had the most duplication to shed.** Four of its sections
were DFS and BFS templates copied wholesale from chapters 12 and 13. Those are gone; the chapter now
opens by handing traversal to those two chapters and covers only what is built on top — topological sort,
Dijkstra, Union-Find, and the selection table.

**Verified:** `pnpm lint:docs` — `too-long` **24 → 20**, all four files off the list, every other rule
still 0. `.lint-baseline.json` updated to 20. All **42** TypeScript fences compiled with
`tsc --strict --target es2022`: **zero errors** (Dijkstra's fence uses a `declare class Heap<T>` to name
the heap from chapter 08 rather than restating it). All **16** distinct `#ch-` anchors referenced from
`DSA/` resolve to exactly one in-book H1, and **every** DSA chapter's own anchor is referenced by at
least one other DSA chapter — the appendix is fully navigable with no orphans. `grep` confirms no
prev/next footer survives in `DSA/`.

**Still open, and not this item's:** `ch-deployment-strategies` is a duplicate anchor across
`SystemDesign/Microservices/06-deployment.md` and `ShipAndOperate/CICD/03-deployment-strategies.md`.
Nothing lints anchor uniqueness, so it is silent. Owner is **#31** or **#70**. A `duplicate-anchor` lint
rule would be a cheap addition to #70.

---

### - [x] 28. Rename `SystemDesign/InterviewQuestions/` → `CaseStudies/` and rebalance `M` — ✅ **done 2026-08-30**

20 case studies, all backend/distributed-systems shaped (Twitter, Uber, YouTube, parking lot). For a
**frontend-heavy** book this is the wrong balance.

- **Keep 10:** URL shortener, rate limiter, chat system, notification system, typeahead, news feed,
  distributed cache, API gateway, Instagram, Ticketmaster
- **Archive 10:** parking lot (OOP exercise, not system design), Google Search, Amazon, Dropbox,
  web crawler, WhatsApp, Netflix, YouTube, Facebook newsfeed (duplicates news feed), Uber
- **Add frontend case studies** in item 41

**Done when:** `CaseStudies/` holds 10 backend studies, ready for frontend studies to join them.

**Delivered:**

- `SystemDesign/InterviewQuestions/` is now `SystemDesign/CaseStudies/`, holding **10 chapters**
  renumbered `01`–`10` in reading order — url-shortener, rate-limiter, typeahead, chat-system,
  notification-system, news-feed, instagram, api-gateway, distributed-cache, ticketmaster. The
  numbering now *is* the difficulty ramp the old README described in prose.
- The other 10 moved to **`Archive/systemdesign/case-studies/`** by `git mv` — Twitter, Uber,
  WhatsApp, YouTube, Netflix, Amazon, Google Search, Dropbox, web crawler, parking lot.
- **Correction to this item's own keep/archive list.** It said keep "news feed" and archive
  "Facebook newsfeed (duplicates news feed)" — but there was never a separate news-feed file. The
  duplicate pair was `01-twitter.md` and `03-facebook-newsfeed.md`, both fan-out-on-write designs.
  The README's own `Keep` column and `scripts/add-frontmatter.ts` had already settled it the same
  way and agreed with each other: **Twitter goes, Facebook Newsfeed stays as the news-feed study.**
  Its title was already *Design a News Feed*, so it is now `06-news-feed.md`, slug `news-feed`,
  anchor `#ch-design-news-feed`. Ten in, ten out, exactly as budgeted.
- **Part-opener README rewritten** — 71 lines, ten-row table, a `What Is Not Here` section naming
  the archived ten and where they went, and the frontend-studies promise pointed at **#43** rather
  than the #41 this item's body said (#41 is Tooling; #43 is the frontend case studies).
- **Cross-references brought to the standard.** All 10 chapters carried a forbidden
  `[← Back to InterviewQuestions](../README.md)` footer — removed. Nine relative file links in
  chapter bodies became `#ch-` anchors (`#ch-caching`, `#ch-sharding`, `#ch-realtime-communication`,
  `#ch-load-balancing`, `#ch-message-queues`, `#ch-database-transactions`,
  `#ch-design-rate-limiter`). Three pointed at chapters that do not exist — Snowflake internals,
  pagination, idempotency — and those sentences now stand without a dangling promise.
- **Two stale slugs fixed:** `interview-questions-api-gateway` → `case-studies-api-gateway` (it was
  named for a directory that no longer exists; the collision it avoids is with
  `microservices-api-gateway`, which still holds), and `facebook-newsfeed` → `news-feed`.
- **Inbound references updated:** `SystemDesign/README.md`'s section table (20 → 10, new path),
  and `BuildingBlocks/07-search.md` + `08-notifications.md`, whose `**Related:**` lines linked the
  old paths and now use anchors.
- **Tags rewritten** on all ten. Every one read `[system, design, interview, questions, <noun>]` —
  tokenised from the old directory name. Now `[system-design, case-study, <topic>, <topic>]`.
- **`scripts/add-frontmatter.ts`:** the ten `OUT_OF_BOOK_FILES` entries are gone, replaced by the
  comment the file already uses for archived-by-move content. Nothing in `scripts/` or CI names
  `InterviewQuestions` any more.
- **`Archive/README.md`** tree and **`Archive/systemdesign/README.md`** updated. The latter was also
  missing its `security/` row from **#24**; added, since the top-level archive index already
  documented it and the sub-README contradicted it.
- **Plan corrected:** **#31**'s file list pointed at `CaseStudies/12-rate-limiter.md` and
  `CaseStudies/17-api-gateway.md`. Repointed at `02-` and `08-` with current line counts.

**Verified:** `pnpm lint:docs` — **262 files** (was 272), every rule still at baseline, `too-long`
unchanged at 20, `broken-link` and `missing-readme` still **0**. `.lint-baseline.json` needed no
change; none of the twenty case studies was ever over 400 lines. `book:collect` builds 262 files into
`build/book.md`, and a scan of the assembled book finds **89 `#ch-` references against 261 unique
anchors with zero dangling references from `CaseStudies/`**. All ten kept chapters sit between 222
and 320 lines, inside the 150–400 budget.

**Not done, and not this item's:** the ten chapters use the RADIO section flow (`R — Requirements`,
`A — Architecture`, …) rather than the Six Blocks, so they have no `## 🔑 Key Takeaways` or
`## What to Read Next`. That is the whole directory's shape and predates the standard; converting it
is a rewrite of ten chapters, not a rename. Owner is **#70**.

**Still open, and not this item's:** four dangling anchors book-wide — `ch-preface` and
`ch-further-reading` (`About-the-Author.md`, waiting on the front matter #72 writes),
`ch-versioning` (`Backend/API/01`), and `ch-web-performance-caching-strategies`
(`ShipAndOperate/Cloud/03`). Plus the `ch-deployment-strategies` duplicate anchor logged at #27.
Owner for all five is **#31** or **#70**; a `duplicate-anchor` and `dangling-anchor` lint rule would
catch every one of them and is a cheap addition to **#70**.

---

### - [x] 29. Trim `Communication/` to book-relevant chapters `S` — ✅ **done 2026-08-30**

`03-english-fluency.md` (195 lines) is personal ESL practice, not book content — archive it.
`06-cross-cultural-communication.md` and `09-active-listening.md` are worth keeping but thin.
Merge `02-behavioral-interview.md` into `Behavioral/` where it belongs (it duplicates STAR material).

**Done when:** `Communication/` is 5–6 focused chapters with no duplication against `Behavioral/`.

**Delivered:**

- `Communication/` is **six chapters**, renumbered `01`–`06`: technical-communication,
  active-listening, system-design-communication, thinking-aloud, cross-cultural-communication,
  written-communication. 2,086 lines → **1,659**.
- **`03-english-fluency.md` archived** to `Archive/communication/` — personal ESL practice, out of
  scope per `BOOK-SPEC.md` § 6.
- **`02-behavioral-interview.md` merged into `Behavioral/01-star-framework.md`, then archived.** This
  was a real merge, not a move: both files taught the four STAR components, a worked example, a
  story-bank template and a mistakes table. `01-star-framework.md` was rewritten from both — 254
  lines of pre-standard material (an `## Overview`, a `## Summary`, a back-link footer, American
  spellings) becomes **192 lines to the Six Blocks**, keeping the percentage time budget and the
  systemic-fix failure story from the Communication file and the component depth from the Behavioral
  one. The category question list and the story-bank grid were dropped rather than merged:
  `Behavioral/02-preparation-grid.md` already owns both at more depth, and duplicating them is what
  this item exists to stop.
- **Reading order changed while renumbering.** Active listening moved from last to `02` — it is the
  habit that stops you answering a question nobody asked, so it belongs beside chapter 01 rather than
  after the two interview-room chapters. Written communication moved to last, matching the README's
  own note that it is the chapter to return to on the job rather than before an interview.
- **`05-problem-solving-communication.md` → `04-thinking-aloud.md`.** Its title and anchor were
  already *Thinking Aloud*; only the filename and slug still carried the old name. Slug
  `problem-solving-communication` → `thinking-aloud`.
- **Five broken `**Related:**` footers rewritten** as `## What to Read Next` blocks with `#ch-`
  anchors. Every one pointed at relative paths this item renumbered or archived, so they had to
  change; the standard says what they should change into. `06-written-communication.md` already had
  a correct block and was left alone.
- **README rewritten** — six rows, a line pointing behavioural answers at `Behavioral/`, and a
  reading order that matches the new numbering. The old `⚠️` note announcing this item is gone.
- `Archive/README.md` tree, a new `Archive/communication/README.md` explaining both files, and
  `scripts/add-frontmatter.ts` — the `Communication/03-english-fluency.md` entry in
  `OUT_OF_BOOK_FILES` is replaced by the archived-by-move comment the file uses elsewhere.

**Correction to this item's text:** it named `09-active-listening.md`. Item **#15** renumbered that
file to `08-` back on 2026-08-28, so the reference was already stale when this item was written.

**Verified:** `pnpm lint:docs` — **261 files** (was 262), every rule at baseline, `broken-link` and
`missing-readme` still **0**, `too-long` unchanged at 20. `book:collect` assembles 261 files; scanning
`build/book.md` finds **95 `#ch-` references against 260 unique anchors, with zero dangling references
from `Communication/` or `Behavioral/`** — the same four pre-existing dangling anchors and one
duplicate as at #28, none of them touched here. All six chapters are 220–393 lines and the rewritten
STAR chapter is 192, all inside the 150–400 budget.

**Not done, and not this item's:** the five surviving chapters that were not rewritten still lack
`## 🔑 Key Takeaways` and `## Interview Questions`. Adding them is the editorial pass at **#76**, and
doing it here would push Part IX further over a budget it is already well past.

⚠️ **A gap in the plan itself.** `BOOK-SPEC.md` § 5 budgets Part IX at **2,500 lines**, and this
plan's own line-budget table (§ Where the Line Budget Goes) records a required **−3,400**. Part IX is
now **4,479 lines** across `Behavioral/` (10 chapters) and `Communication/` (6) — still **1,979 over**
after this item's 489-line cut. **No item in the plan burns it down**, and two items add to it: #61
writes six new Behavioural chapters and #64 adds the AI-era interview chapter. `BOOK-SPEC.md` § 6 even
fixes the order of cuts — Part VIII, then Part IX, then the Part VI case studies — so the cut is
specified but unowned. This needs either a new Phase 2 item or an explicit widening of #76's remit.

---

### - [x] 30. Split `DevOps/README.md` (1,378 lines) `S` — ✅ **done 2026-08-31**

It is a full curriculum index for content that is about to be 80% archived. Rewrite as a ~120-line
`ShipAndOperate/README.md` part opener after item 20 lands.

**Done when:** the part opener matches the surviving content.

> **Updated after #20 run #1, 2026-08-28.** The 1,378-line file is now at `Archive/devops/README.md`
> and `ShipAndOperate/` has **no README at all** — the lint stays quiet because `missing-readme` only
> fires on a directory holding loose `.md` files. This item now writes a new file rather than trimming
> an old one. The five section READMEs beneath it (`Git`, `Containers`, `CICD`, `Observability`,
> `Cloud`) already exist and are the model to match; a sixth is due when `Deployment/` is written.

**Delivered:**

- **`ShipAndOperate/README.md` written — 59 lines**, the Part VIII opener. Sections table for all six
  sections with chapter counts, the part-level senior signal (four questions), a consolidated reading
  order and eleven-chapter interview sprint, and a closing note on the three deliberate cross-section
  overlaps plus what #20 moved to `Archive/devops/`. `Deployment/` and its README existed by the time
  this ran, so all six sections are covered — the note above expected five.
- **The six section READMEs are no longer pretending to be part openers.** Each was titled
  `# Part VIII — <Section>` and each repeated the same part-level senior-signal paragraph verbatim
  (`CICD` and `Deployment` also shared the "build once, promote the artefact" bullet word for word).
  Titles are now the section name; each probe list keeps only its section-specific questions and
  points at the opener for the part-level ones. Their per-section `**Interview sprint:**` lines are
  gone — the opener carries one consolidated sprint covering the same chapters.
- **Net line change for Part VIII: zero.** 354 lines of section READMEs became 294; the 59-line opener
  spends exactly what the dedup freed. `pnpm lint:docs` reports Part 8 at 6,046 — the same figure as
  before this item — and the `budget` tally unchanged at 31,241, so nothing regressed and
  `.lint-baseline.json` needed no edit. `pnpm book:collect` picks up 262 files, one more than before.
- **Deliberately not done:** Part VIII is still +546 over its 5,500 budget. That cut belongs to
  **#31e** and its table is correct as written — this item neither helped nor hurt it.
- **Note for #31e and Phase 3.** The opener's length was set by the `budget` ratchet, not by taste: a
  part opener is a required structural file, but the `budget` rule counts it like any chapter, so
  writing one for an over-budget part means finding the lines somewhere in that part first. Part III's
  and Part VII's openers will hit the same wall if they are written before #31a–#31e land.

---

### - [x] 31. Deduplicate WebSockets, rate limiting, and API gateway `S` — ✅ **done 2026-08-31**

Smaller triplicates found:

- **WebSockets:** `Backend/API/06-websockets.md` (365) + `SystemDesign/BuildingBlocks/06-websockets.md` (224)
  + `SystemDesign/Frontend/06-real-time.md` (184)
- **Rate limiting:** `Backend/API/04-rate-limiting.md` (415) + `SystemDesign/CaseStudies/02-rate-limiter.md` (323)
- **API gateway:** `SystemDesign/Microservices/03-api-gateway.md` (203) + `SystemDesign/CaseStudies/08-api-gateway.md` (272)

Keep the implementation chapter in Backend, the design chapter in SystemDesign, and make each explicitly
cross-reference the other instead of repeating it.

**Done when:** each pair has a clear division of labour and a cross-reference.

**Delivered:**

- **Division of labour, written into each chapter's opening.** Every one of the seven files now names
  what it owns and points at its counterpart by anchor, in the first 25 lines:

  | Chapter | Owns | Gave up |
  | ------- | ---- | ------- |
  | `Backend/API/06-websockets.md` (381 → **288**) | The **server**: what the upgrade skips, typed event contracts, handshake auth and revalidation, rooms, the Redis adapter wiring, backpressure, heartbeats | The WebSocket/SSE/polling comparison and the client reconnection code |
  | `SystemDesign/BuildingBlocks/06-websockets.md` (240 → **163**) | The **choice and the topology**: the three transports compared, the handshake, the stateful-connection problem, fan-out cost, capacity numbers, buy-vs-build | The room-manager and heartbeat implementations, the client reconnect snippet |
  | `SystemDesign/Frontend/06-real-time.md` (200 → **197**) | The **client**: `WebSocket` vs `EventSource`, backoff with jitter, gap recovery by last-event-id, a bounded live-feed hook, what the UI owes the user | The comparison tables and the scaling topology |
  | `Backend/API/04-rate-limiting.md` (432 → **383**) | The **implementation**: all five algorithms in code, the boundary-burst proof, the atomic Lua script, keying and `trust proxy`, headers, fail-open middleware | The CDN → gateway → application enforcement stack |
  | `SystemDesign/CaseStudies/02-rate-limiter.md` (320 → **241**) | The **design**: where enforcement belongs, the hot path, rules and tiers, monitor mode, the management API, multi-dimension checks, Redis Cluster sharding, capacity at 1M rps | Both algorithm implementations and the algorithm comparison table |
  | `SystemDesign/Microservices/03-api-gateway.md` (219 → **177**) | The **pattern**: what a gateway centralises, gateway vs load balancer, gateway vs service mesh, BFF, keeping it thin | The 62-line route-matching implementation |
  | `SystemDesign/CaseStudies/08-api-gateway.md` (272 → **225**) | The **design**: the nine-stage pipeline and why order is a cost decision, route config and hot reload, per-route timeouts, the control-plane API, SPOF and capacity | Its own rate-limiting snippet, and the gateway-vs-mesh answer |

- **2,064 lines became 1,674 — a 390-line cut.** `pnpm lint:docs` `budget` falls from **31,241 to
  30,852**: Part V 13,010 → 12,869, Part VI 13,736 → 13,488. `too-long` falls from **20 to 19** —
  `Backend/API/04-rate-limiting.md` was 432 and is now 383. `.lint-baseline.json` committed with both
  lower numbers.
- **Five chapters brought to the Six Blocks** while they were open — the two Backend chapters, the two
  SystemDesign building-block/frontend chapters, and the Microservices pattern chapter. That meant
  deleting two hand-written TOCs and five `[← Back]` footers, replacing `## Summary` checklists with
  `## 🔑 Key Takeaways`, adding `## What to Read Next` to all five, and stripping every retired ✨ and
  🔴 callout. The two **CaseStudies** chapters keep the RADIO section flow — that directory's
  conversion is **#70**'s, as recorded at #28.
- **Cross-references are anchors, not paths.** Four relative links in chapter bodies converted:
  `02-graphql.md` × 2, `BuildingBlocks/08-notifications.md` × 1, plus the `04-rate-limiting.md`
  reference inside the WebSockets chapter. Four part-opener README descriptions rewritten where the
  division of labour changed them (`Backend/API`, `SystemDesign/Frontend`, `SystemDesign/CaseStudies`,
  and `BuildingBlocks`, whose row said "WebSockets and Real-Time" for a chapter titled *Real-Time
  Communication*).
- **Three ASCII diagrams became Mermaid** where they had branches or more than three nodes — the
  handshake sequence, the split-pod broadcast failure, and both case-study architecture diagrams. All
  node labels are quoted, since several contain colons and `<br/>`.

**Correction to the budget table above.** It attributes **~600 lines** of Part V cutting to this item.
That was never reachable: the two Part V files in scope held **813 lines between them**, so a 600-line
cut would leave 213 lines across two chapters — below the 150-line floor for even one. The realistic
figure was ~250 and the item delivered **141** in Part V (plus 249 in Part VI, which the table credits
to no one). **#31a–#31e are now carrying ~250 lines more than the table says.**

**Verified:** `pnpm lint:docs` — 262 files, `front-matter`, `broken-link`, `fence-language`,
`missing-readme` and `heading-jump` all still **0**; `too-long` 19 (was 20); `budget` 30,852 (was
31,241); no rule regressed. `pnpm book:collect` builds 262 files / 72,962 lines. A scan of the
assembled book finds **293 `#ch-` references against 261 anchors with zero new dangling references** —
the same four pre-existing ones (`ch-preface`, `ch-further-reading`, `ch-versioning`,
`ch-web-performance-caching-strategies`) and the one pre-existing duplicate anchor
(`ch-deployment-strategies`) logged at #27 and #28. All seven chapters sit inside the 150–400 budget.

---

## The budget items — #31a–#31e

> **Why these exist, and why they are lettered.** Added 2026-08-30, after **#29**.
>
> The budget table at the bottom of this plan attributes 92,900 lines of cutting to numbered items.
> None of those items carries a **line target** in its *Done when* — they say "the directory is
> gone", "5–6 focused chapters", "each pair has a cross-reference". So each one lands, ticks its
> box, and under-delivers against a number nobody measures. **#13** caught this for `Frontend/PWA/`
> on 2026-08-28 and logged it; **#29** caught it again for Part IX. Measuring the whole tree found
> the real size of it:
>
> | Part | Now | Budget | Over | Assigned cutting items | Status |
> | ---- | --- | ------ | ---- | ---------------------- | ------ |
> | I — Foundations | ~~12,601~~ **4,976** | 5,000 | ~~+7,601~~ **0** | #26, **#31a** | ✅ **under budget** |
> | II — Browser Platform | ~~12,146~~ **5,775** | 6,000 | ~~+6,146~~ **0** | **#31b** | ✅ **under budget** |
> | IV — Frontend at Scale | 6,649 | 5,500 | +1,149 | #42, #57, #58 | pending |
> | V — Backend | ~~13,010~~ **6,458** | 6,500 | ~~+6,510~~ **0** | #24, #31, **#31c** | ✅ **under budget** |
> | VI — System Design | ~~13,736~~ **6,345** | 6,500 | ~~+7,236~~ **0** | #22, #23, #28, **#31d** | ✅ **under budget** |
> | VIII — Ship and Operate | 6,046 | 5,500 | +546 | #20, #25 | ✅ all done |
> | IX — Human Layer | 4,553 | 2,500 | **+2,053** | #25, #29 | ✅ all done |
> | Appendix — DSA | 4,610 | 5,600 | −990 ✅ | #27 | ✅ done |
>
> **31,241 lines over, and 23,582 of it with no remaining owner.** _(#31a has since cleared Part I's
> 7,601; the live figure is **23,251**, which `pnpm lint:docs --rule=budget` reports. #31b has since cleared Part II's 6,146; the live figure is **17,105**. #31c cleared Part V's 6,510 and #31d Part VI's 7,236; #31e cleared Parts VIII and IX. The live figure is **1,149**, all of it Part IV, owned by **#58a**, placed after #42, #57 and #58.)_ Parts III and VII then add 19,500
> lines that have not been written yet, so the book as planned lands near **88,000 against a 57,000
> budget and a 60,000 hard ceiling**.
>
> These five items own the cut. They are lettered rather than numbered 32–36 because inserting them
> would renumber forty-seven items and every `#N` reference between them; numbering them 79–83 would
> put Phase 2 work at the far end of Phase 7. `scripts/plan-status.ts` understands the suffix and
> sorts `31a` between `31` and `32`.
>
> **They come before Phase 3 deliberately.** Writing 19,500 new lines on top of an already
> over-budget book is how the cut stops being possible at all.

**The check is now machine-run.** `pnpm lint:docs` has a `budget` rule reading the ceilings straight
out of [BOOK-SPEC.md § 5](./BOOK-SPEC.md) and measuring the tree against them. It is counted in
**lines, not occurrences** — the summed overage across every part — so a part cannot grow without the
number moving. Baseline: ~~31,241~~ ~~23,251~~ **17,105** after #31a and #31b. Like every other rule it ratchets down; commit the lower number.

---

### - [x] 31a. Trim Part I — Foundations — to its 5,000-line budget `L` — ✅ **done 2026-09-01**

**+7,601 over.** `#26` merged `OOP/` into `Backend/DesignPatterns/` and was the only cutting item
assigned to this part. It did what it said and the part is still 2.5× its ceiling.

| Directory | Files | Lines | Note |
| --------- | ----- | ----- | ---- |
| `Frontend/JavaScript` | 11 | **8,558** | The whole overage lives here. `01` is 525, `02` is 761, `03` is 776 — nine of the eleven are over the 400-line chapter limit |
| `Frontend/TypeScript` | 9 | 2,479 | Roughly at budget already |
| `Backend/DesignPatterns` | 6 | 1,564 | Post-#26, already condensed |

BOOK-SPEC § 5 budgets this part at **~22 chapters**; it holds 26. The work is almost entirely
`Frontend/JavaScript` — the same trim `#27` did to DSA, applied to the language chapters: keep the
mechanism and the interview-relevant depth, cut the exhaustive API tours.

**Done when:** `pnpm lint:docs` reports Part 1 at or under its BOOK-SPEC § 5 budget.

**Delivered:**

- **Part I is 12,601 → 4,976 lines, 24 under the 5,000 ceiling.** `pnpm lint:docs` no longer reports a
  Part 1 budget violation. The `budget` baseline drops 30,852 → **23,251**; `too-long` drops 19 → **8**
  (all eleven remaining Part I over-400 files are gone). Both committed to `.lint-baseline.json`.
- **All 23 chapters rewritten to the Book Chapter Standard**, not merely shortened. Every one now has the
  six blocks in order, `{#ch-<slug>}` matching its front-matter slug, and no hand-written TOC, back-link,
  `####`, retired emoji or relative link. `Frontend/JavaScript` and `Frontend/TypeScript` predated the
  standard entirely — they carried `📚 🎯 🚨 🎓 📊 🔗` headings, "External Resources" and "Related Topics"
  sections, and title-derived H1 anchors that did not match their slugs.
- **The cut fell almost entirely where the item predicted.** `Frontend/JavaScript` 8,558 → 2,133;
  `Frontend/TypeScript` 2,479 → 1,672; `Backend/DesignPatterns` 1,564 → 1,171.
- **Deduplication, not just trimming.** The loop-variable trap now lives only in `03-closures`; the `this`
  gotchas only in `04-this-keyword`; `08-es6-features` dropped its `let`/`const`, arrow-function, class,
  promise and async/await tours, which chapters 01, 02, 05 and 06 already own. `08` gained the optional
  chaining and nullish coalescing its opening promised but never covered.
- **One correctness fix.** `Frontend/TypeScript/08-react-typescript.md` taught `forwardRef` as the way to
  pass a ref. Context7 confirms React 19 makes `ref` an ordinary prop and `forwardRef` is slated for
  deprecation; the chapter now teaches the current form and says what to do on React 18.
- **Chapters average 208 lines, not the ~220 target, and that is arithmetic rather than choice.**
  BOOK-SPEC § 5 budgets Part I at ~22 chapters; it holds 23 plus three part-opener READMEs (193 lines),
  which leaves 4,807 ÷ 23 = 209. Every chapter is inside the mandatory 150–400 range (189–216). Merging
  two chapters to reach the spec's 22 was considered and rejected: the natural candidates
  (`enums-literals` into `advanced-types`) would bury a frequently-asked interview topic inside a chapter
  named for something else.
- **Left undone, deliberately:** `Backend/Security/06-validation.md` has `slug: validation` but an H1
  anchor of `{#ch-backend-input-validation}`. Five pre-existing chapters already link to the anchor, and
  the three new links from Part I match them, so every cross-reference resolves. Fixing the mismatch is
  Part V work, not this item.

---

### - [x] 31b. Trim Part II — Browser Platform — to its 6,000-line budget `L` — ✅ **done 2026-09-01**

**+6,146 over, and never assigned to anyone.** The budget table counts a 6,200-line "browser platform
trimmed (PWA is 6,002 lines today)" cut with no item behind it. `#13` flagged this on 2026-08-28;
this item is the answer.

| Directory | Files | Lines | Note |
| --------- | ----- | ----- | ---- |
| `Frontend/PWA` | 7 | **5,836** | The entire overage. Every chapter over 400 lines, three over 1,000 |
| `Frontend/HtmlCss` | 9 | 2,394 | Fine |
| `Frontend/Internationalization` | 5 | 1,483 | Fine |
| `Frontend/CSSArchitecture` | 6 | 1,277 | Fine |
| `Frontend/BrowserAPIs` | 5 | 1,156 | Fine |

⚠️ **Ask the scope question first.** PWA at 5,836 lines is larger than Part IX entire. A senior
frontend loop asks about service workers, caching strategy and offline UX — it does not ask for a
full PWA manual. Consider whether this is six chapters trimmed to ~220 each, or **three chapters**
plus an archive, the way `#20` treated DevOps.

**Done when:** `pnpm lint:docs` reports Part 2 at or under its BOOK-SPEC § 5 budget.

**Delivered:**

- **Part II is 12,146 → 5,775 lines, 225 under the 6,000 ceiling.** `pnpm lint:docs` no longer reports a
  Part 2 budget violation. The `budget` baseline drops 23,251 → **17,105**; `too-long` drops 8 → **2** (only
  `Backend/API/02-graphql.md` and `Backend/SQL/02-database-design.md` remain, both Part V). Both committed
  to `.lint-baseline.json`.
- **The scope question was answered "three chapters plus an archive".** `Frontend/PWA` was six chapters and
  5,829 lines — larger than Part IX entire, and every chapter over 400 lines. It is now **three chapters,
  758 lines**, written from scratch to the Book Chapter Standard:
  - `01-service-workers.md` — lifecycle, scope, `fetch` interception, the update path, the kill switch
  - `02-caching-and-offline.md` — the five strategies, Cache API against IndexedDB, the offline write queue
    with idempotency keys, and Background Sync framed as the wake-up rather than the mechanism
  - `03-install-and-push.md` — manifest, display modes, maskable icons, `beforeinstallprompt`, the
    three-party push system, VAPID, permission timing
  The six originals are in `Archive/pwa/`. Nothing linked to them — they had no cross-references in or out —
  so the consolidation broke no anchors.
- **`Frontend/CSSArchitecture` went 5 chapters → 4.** `04-atomic-css.md` was almost entirely a subset of
  `02-utility-vs-component.md` (both taught Tailwind, tokens-as-config, and the same pros and cons). It is
  archived to `Archive/cssarchitecture/`; its one distinct argument — why a utility stylesheet stops growing,
  and why `@apply` throws that away — is now in `02`. `05-design-systems.md` renumbered to `04`.
- **16 chapters rewritten to the Book Chapter Standard**, not merely shortened: the 3 new PWA chapters, all 4
  in `Internationalization`, 5 of 8 in `HtmlCss` (`02`, `05`, `06`, `07`, `08`), and all 4 in
  `CSSArchitecture`. Every one now has the six blocks in order, `{#ch-<slug>}` matching its front matter, and
  no hand-written TOC, back-link, `####`, retired emoji or relative body link. The `HtmlCss`, `i18n` and
  `CSSArchitecture` files predated the standard entirely — they carried `### 💡 **Bold Heading**` throughout,
  `## 🎯 Interview Questions`, `## Navigation` blocks and "Last Updated: June 2026" footers.
- **Deduplication, not just trimming.** `08-advanced-css` dropped container queries (owned by `05-responsive-design`),
  logical properties (owned by `04-rtl-support`) and the View Transitions API (owned by `06-css-animations`),
  and dropped `@layer` to `02-css-fundamentals`, where the cascade already lives. That is where roughly a third
  of the `HtmlCss` saving came from.
- **Three anchor/slug mismatches fixed** in files this item touched the neighbourhood of:
  `04-grid.md` (`#ch-css-grid` → `#ch-grid`), `01-storage-apis.md` (`#ch-web-storage-apis` → `#ch-storage-apis`),
  `02-cookies-same-site.md` (`#ch-cookies-and-samesite` → `#ch-cookies-same-site`). Nothing linked to the old
  anchors, and the new cross-references from Part II resolve.
- **Left undone, deliberately:** the four `Frontend/BrowserAPIs` chapters (1,143 lines) are still pre-standard —
  hand-written TOCs, `### Q:` interview headings, no Key Takeaways or What to Read Next. They were never over
  budget and trimming them was not needed to clear the ceiling, so they are left for a standards pass. The two
  `[← Previous]` nav footers in `02` and `03` were removed, since those are a flat violation of the standard.
- **Headroom is 225 lines and two Phase 5 items will spend it.** #54 creates `Frontend/Accessibility/` in Part II
  and #55 moves micro-frontend material out to Part IV. If #54 lands more than ~200 lines of net new content, it
  either absorbs `HtmlCss/07-accessibility.md` (254 lines) rather than sitting beside it, or Part II goes back over.
  Decide that at #54, not after.

---

### - [x] 31c. Trim Part V — Backend — to its 6,500-line budget `L` — ✅ **done 2026-09-01**

**+6,510 over.** `#24` consolidated security and is done. `#31` dedups three topic pairs and is worth
roughly 600 lines — a tenth of what is needed.

| Directory | Files | Lines |
| --------- | ----- | ----- |
| `Backend/Security` | 9 | 2,836 |
| `Backend/SQL` | 9 | 2,389 |
| `Backend/API` | 7 | 2,336 |
| `Backend/NodeJS` | 9 | 2,185 |
| `Backend/Testing` | 7 | 1,602 |
| `Backend/NoSQL` | 7 | 1,597 |

BOOK-SPEC § 5 budgets **~30 chapters**; there are 49. No single directory is the problem — the part is
uniformly about twice the size it should be, which makes this a chapter-count decision rather than a
line-trimming one. `Backend/Security` at 2,836 lines is the first place to look, since `#24` moved
content *into* it.

🔴 **Ordering: run after #31.** #31 moves rate limiting and API gateway material between Part V and
Part VI. Trimming first means trimming lines that are about to move anyway.

**Done when:** `pnpm lint:docs` reports Part 5 at or under its BOOK-SPEC § 5 budget.

**Delivered:**

- **Part V is 12,869 → 6,458 lines, 42 under the 6,500 ceiling.** `pnpm lint:docs` no longer reports a
  Part 5 budget violation. The `budget` baseline drops 17,105 → **10,736**; `too-long` drops 2 → **0**,
  because the last two over-length files in the book were both Part V (`API/02-graphql.md` 449 and
  `SQL/02-database-design.md` 451). Both committed to `.lint-baseline.json`. `pnpm book:collect` now
  builds 244 files / 52,575 lines, down from 262 / 72,962.
- **49 files became 35: 28 chapters and 7 READMEs, down from 42 chapters.** The item was right that this
  is a chapter-count decision rather than a line-trimming one — no directory was individually wrong.
  BOOK-SPEC § 5 budgets ~30 chapters; 28 is what the line budget actually pays for at the 150-line floor.

  | Section | Was | Now | What changed |
  | ------- | --- | --- | ------------ |
  | `NodeJS` | 8 ch / 2,176 | **6 ch / 1,326** | `07-child-processes` + `08-clustering` → `06-scaling-node`; `06-security` folded into `Backend/Security/` |
  | `API` | 6 ch / 2,188 | **5 ch / 1,206** | `05-documentation` merged into `03-versioning` (now *Versioning and Contracts*); `06-websockets` → `05-realtime-and-streaming`, gaining SSE and HTTP streaming |
  | `SQL` | 8 ch / 2,380 | **5 ch / 1,101** | `05-postgresql`, `07-migrations` and `08-optimization` distributed across `02`–`05`, which now carry them by concept rather than by tool |
  | `NoSQL` | 6 ch / 1,590 | **4 ch / 855** | `04-indexing` merged into `03-indexing-and-aggregation`; `05-mongoose` folded into `01` and `02` |
  | `Security` | 8 ch / 2,827 | **6 ch / 1,342** | `07-sql-injection` merged into `06-validation`; `04-encryption` cut on scope |
  | `Testing` | 6 ch / 1,595 | **2 ch / 481** | `03-e2e`, `04-tdd`, `05-mocking`, `06-best-practices` archived — Part IV owns the discipline |

- **The largest single saving was deduplicating `Backend/Testing` against Part IV.** `Frontend/Testing`
  (1,938 lines) already owns the pyramid, AAA, the test-double vocabulary, coverage, TDD, Playwright and
  flakiness. Part V now keeps only what is backend-specific — `01-unit-testing.md` (*Testing a Node
  Service*: what is worth unit testing, injection over `vi.mock`, fake timers, error paths) and
  `02-integration.md` (*Integration Testing a Service*: supertest, a real Postgres in Testcontainers,
  the four isolation strategies, factories, MSW, parallelism) — and says so in its README. That is 1,114
  lines, and none of it was a judgement call about value.
- **All 28 chapters were written or rewritten to the Book Chapter Standard**, verified by script: six
  blocks in order, 150–400 lines (192–259, mean 217), exactly one `## 💡` and one `## 🔑`, at most three
  blockquote `⚠️` callouts, no retired emoji, no `####`, no hand-written TOC, no back-link, no relative
  link in any body, 3–6 interview questions with at least one judgement call, and balanced code fences.
  Only `NodeJS/05`, `API/01` and `API/04` were trims of already-conforming files; the rest were full
  rewrites, because `SQL/*` and `NoSQL/*` predated the standard entirely (`## 💡 **Bold Heading**`
  throughout, `## 📚 Interview Q&A`, `## ✅ Best Practices`) and `API/02–03`, `API/05` and `Security/01`
  still carried `## Overview`, `## Table of Contents` and `## Summary`.
- **27 pre-existing slug/anchor mismatches found and closed.** Almost every Backend chapter had an H1
  anchor that did not match its front matter `slug` — `slug: event-loop-async` under
  `{#ch-node-event-loop}`, `slug: jwt` under `{#ch-jwt-authentication}`, and 25 more. Every surviving
  chapter now has `{#ch-<slug>}`. This includes the one **#31a explicitly deferred to Part V**:
  `Security/06-validation.md` had `slug: validation` against `{#ch-backend-input-validation}`, and since
  five chapters outside Part V link to that anchor, the **slug** was changed to match the anchor rather
  than the reverse. Two Part IV files (`Frontend/Security/03-security-headers.md` and its README) were
  updated from `#ch-cors-and-csrf` to `#ch-cors-csrf` for the same reason.
- **Zero dangling cross-references.** A scan of every removed anchor found no live referrer for any of
  the 31 that went away; the two SystemDesign chapters pointing at `#ch-websockets` were repointed to
  `#ch-realtime-streaming`. `#ch-versioning`, one of the four dangling references recorded at #31, now
  resolves — the merged chapter kept that slug deliberately.
- **One scope cut, stated plainly.** `Security/04-encryption.md` (374 lines — the TLS handshake,
  certificate chains, encryption at rest, envelope encryption and key rotation) is archived. Judged the
  least-asked material in Part V for this reader against a hard ceiling; HSTS, TLS termination and
  certificate basics are already covered by `Frontend/Security/03-security-headers.md` in Part IV, whose
  single reference to the removed chapter was repointed. If Part V ever gains budget, this is the first
  thing to bring back.
- **`Archive/backend/` created, mirroring the source layout** (`api/`, `nodejs/`, `nosql/`, `security/`,
  `sql/`, `testing/`) as `Archive/README.md` requires, with all 15 files moved by `git mv` so rename
  detection holds, and the layout tree in that README updated.
- **Headroom is 42 lines, and #54–#55 do not touch Part V** — but two later items do. #70 assigns real
  chapter numbers, which rewrites every `Chapter ??` reference and may change line counts slightly, and
  #75 adds `check:code-samples`, which will need the fences to compile. Neither should add net lines.
  Any future Part V addition has to be paid for by a cut, exactly as BOOK-SPEC § 5 requires.

**Correction to the budget table below.** Its Part V row credits "#24 ✅, #31 pending" with ~5,800 lines
and gives #31c the remaining +6,510. The realised split is **#24 and #31 delivered ~390 in Part V
between them, and this item delivered 6,411** — so #31c carried nearly the whole overage, not the
remainder of it. The table's attribution for Part V is now closed and correct at the total; only the
per-item split was wrong.

---

### - [x] 31d. Trim Part VI — System Design — to its 6,500-line budget `L` — ✅ **done 2026-09-02**

**+7,236 over, with every assigned item already complete** — `#22`, `#23` and `#28` between them
delivered 6,464 of the 13,700 lines the budget table credits them with.

| Directory | Files | Lines |
| --------- | ----- | ----- |
| `SystemDesign/Database` | 11 | 2,750 |
| `SystemDesign/CaseStudies` | 11 | 2,702 |
| `SystemDesign/BuildingBlocks` | 12 | 2,608 |
| `SystemDesign/Fundamentals` | 9 | 2,050 |
| `SystemDesign/Microservices` | 9 | 1,946 |
| `SystemDesign/Frontend` | 8 | 1,601 |

BOOK-SPEC § 5 budgets **~34 chapters**; there are 61. Six sections at roughly 2,000–2,700 lines each
is the shape of the problem: no section is individually wrong, and the part is 2.1× its ceiling.

⚠️ `SystemDesign/Frontend` is the one section to **protect** — it is the part of Part VI this book's
reader is most likely to be examined on, and `#42` moves half of it to Part IV anyway.

**Done when:** `pnpm lint:docs` reports Part 6 at or under its BOOK-SPEC § 5 budget.

**Delivered:**

- **Part VI is 13,488 → 6,345 lines, 155 under the 6,500 ceiling.** `pnpm lint:docs` no longer reports a
  Part 6 budget violation. The `budget` baseline drops 10,736 → **3,748**, committed to
  `.lint-baseline.json`; every other rule is still **0**. `pnpm book:collect` builds 217 files / 45,432
  lines, down from 244 / 52,575.
- **61 chapters became 28, across five sections instead of six.** BOOK-SPEC § 5 budgets ~34 chapters; 28
  is what 6,500 lines buys once the seven protected `Frontend/` chapters take 1,175 of them. `Microservices/`
  was dissolved — BOOK-SPEC § 4's own description of Part VI lists *Fundamentals · Building blocks ·
  Frontend system design · case studies* and no microservices section, and its eight chapters were either
  Part VIII's or belonged beside the building blocks.

  | Section | Was | Now | What changed |
  | ------- | --- | --- | ------------ |
  | `Fundamentals` | 8 ch / 2,041 | **6 ch / 1,257** | `01-basics` + `08-framework` → `01-driving-the-round`; `07-calculations` → `02-estimation`; `04-performance` → `05-latency-and-throughput`; `05-cap-theorem` + `06-consistency` + `Database/07` + `Database/08` → `06-consistency-and-cap` |
  | `BuildingBlocks` | 11 ch / 2,519 | **9 ch / 1,772** | `05-message-queues` + `11-async-processing` + `08-notifications` → `04-queues-and-async`; `07-search` rewritten as `05`; `Microservices/03` → `07-api-gateway`; `Microservices/01`+`04`+`05` → `08-service-boundaries`; `Microservices/08` → `09-resilience`; `Microservices/02` folded into `01-load-balancing`; `04-databases` merged into `Database/01` |
  | `Database` | 10 ch / 2,739 | **4 ch / 847** | `01`+`02`+`09` → `01-choosing-a-datastore`; `04` → `02-replication`; `06` → `04-transactions-at-scale`; indexing and query optimisation handed to Part V, which owns them at implementation depth |
  | `CaseStudies` | 10 ch / 2,565 | **4 ch / 862** | Kept the four distinct shapes — a key-value read path, fan-out, a stateful edge, contention. Six archived |
  | `Microservices` | 8 ch / 1,895 | **dissolved** | 5 chapters became `BuildingBlocks/07`–`09`; deployment and distributed tracing archived to Part VIII |
  | `Frontend` | 13 ch / 2,952 | **11 ch / 2,540** | **Protected, and untouched** apart from six front-matter `slug` fixes. Two chapters were staged for Part III — see below. Six of the eleven already count against Part IV via `PART_OVERRIDES`, so only 1,115 lines sit in Part VI |

- **All 24 chapters this item wrote or edited conform to the Book Chapter Standard**, verified by script:
  six blocks in order, H1 anchor matching the front-matter `slug`, 150–400 lines (160–261, mean 210),
  exactly one `## 💡` and one `## 🔑`, at most three `⚠️` callouts, no `####`, no hand-written TOC, no
  back-link, no relative link in any body, 3–6 interview questions **including a judgement call in every
  one**, and balanced code fences. That includes converting the four surviving case studies from the RADIO
  section flow to the six blocks with RADIO inside `## How It Works` — the debt **#28** logged and
  assigned to #70 is now closed for Part VI.
- **Two chapters staged rather than cut: `Archive/salvage/frontend/`.** `SystemDesign/Frontend/02-state-management.md`
  (216) and `03-rendering.md` (196) are Part III material that **#42** already schedules for absorption by
  **#39** and **#40**. Moving them early was the least damaging 412 lines available, and it honours a
  decision the plan had already taken rather than inventing one. Both keep their front matter with
  `in_book: false`, per the `salvage/` convention, and nothing in the book links to either anchor.
  `SystemDesign/Frontend/` now has gaps at `02` and `03`; **#42 renumbers the section anyway.**
- **Zero new dangling anchors, and one pre-existing defect closed.** 31 anchors went away; every inbound
  reference was repointed. `Backend/API/04-rate-limiting.md`'s two references to `#ch-design-rate-limiter`
  now point at `#ch-api-gateway-pattern`, which absorbed the CDN → gateway → service enforcement stack and
  the million-requests-a-second numbers **#31** had put in the case study. `BuildingBlocks/06-websockets.md`
  repoints from `#ch-design-notification-system` to `#ch-design-chat-system`. **The `ch-deployment-strategies`
  duplicate anchor logged at #27, #28 and #30 is gone** — it was `Microservices/06-deployment.md`, now
  archived, and all four inbound references were already targeting the `ShipAndOperate/CICD` chapter.
  The three remaining book-wide danglers (`ch-preface`, `ch-further-reading`,
  `ch-web-performance-caching-strategies`) are pre-existing and belong to **#72** and **#70**.
- **Six slug/anchor mismatches closed** in `BuildingBlocks/06` and five `Frontend/` chapters — the same
  defect class **#31c** fixed across Part V. These are front-matter-only edits; no `Frontend/` chapter body
  was touched.
- **Archived, not merged: 11 files.** `Archive/systemdesign/building-blocks/` (file storage, monitoring —
  Part VIII owns both), `Archive/systemdesign/microservices/` (deployment, distributed tracing, and the old
  section README), and six more case studies numbered `20`–`25` in `Archive/systemdesign/case-studies/` to
  avoid colliding with **#28**'s ten. Everything else was **merged**, so it is in git history rather than in
  `Archive/` — the rule `Archive/README.md` already states and `Scalability/` already follows. Both archive
  READMEs and `Archive/salvage/README.md` updated.

**Correction to #43 — decide it here, not at #43.** Part VI now stands at 6,345. **#42** removes a further
~410 lines of `Frontend/` chapters (`04-performance`, `09-assets`, `12-monitoring` are already counted
against Part IV; `01`, `05` and `08` move to `Frontend/Architecture/`), leaving roughly **5,930**. That
gives #43 about **570 lines for five frontend case studies** — 114 each, below the 150-line chapter floor.
The item as written says 250–350 lines each, which needs 1,250–1,750. **It cannot be paid for out of Part
VI's budget as it stands.** Three options, and one of them has to be chosen at #43:

1. Write the five at ~200 lines each (1,000) and take Part VI to ~6,930 — **over budget, not acceptable**
2. Write the five at ~200 lines and cut two more backend case studies, leaving 2 backend + 5 frontend
3. Write **four** frontend studies at ~220 (880) and cut one backend study, leaving 3 backend + 4 frontend

Option 3 is the recommendation: four frontend studies still triples the frontend coverage this reader
needs, and 3 + 4 = 7 studies is a section, not a token. #43 has been amended with this note.

**Correction to BOOK-SPEC § 4's Part VI description.** It promises "ten case studies… joined by five
frontend ones" — fifteen studies. At the 150-line floor that is 2,250 lines, 35% of the part, alongside a
Fundamentals section, a Building Blocks section and eleven `Frontend/` chapters. **The prose and § 5's
6,500-line budget do not close.** § 5 is the contract the lint enforces, so this item honoured the budget;
the prose needs an amendment at **#71** or **#76**, and the honest number is seven or eight case studies,
not fifteen.

**Not done, and not this item's.** Four `SystemDesign/Frontend/` chapters — `00-interview-strategy`,
`07-offline-first`, `10-seo-analytics`, `11-auth` — still predate the Book Chapter Standard: no six blocks,
no interview questions, a `[← Back to README]` footer and a relative link in each, and `00` is 149 lines,
one under the floor. This item was told to **protect** that section, and converting four chapters would
have cost the budget headroom it exists to defend. Owner is **#42** (which reshapes the section) or
**#70**. Fixing all four would also return ~40 lines to the part.



---

### - [x] 31e. Trim Parts VIII and IX to their budgets `M` — ✅ **done 2026-09-02**

> **Rescoped on 2026-09-02, at the moment of doing it.** The item was written to cover Parts IV, VIII
> and IX, and then carried a 🔴 ordering note saying Part IV must wait for **#42**, **#57** and **#58** —
> three items in Phases 3 and 4. Those two statements cannot both hold in one session. Part IV's trim is
> now **#58a**, ordered where it belongs; this item is Parts VIII and IX, which were unblocked.

The three small overages, together because none is a session on its own. **+3,748 total.**

| Part | Now | Budget | Over | Chapters now | § 5 says |
| ---- | --- | ------ | ---- | ------------ | -------- |
| IV — Frontend at Scale | 6,649 | 5,500 | +1,149 | 29 | ~24 |
| VIII — Ship and Operate | 6,046 | 5,500 | +546 | 28 | ~22 |
| IX — Human Layer | 4,553 | 2,500 | **+2,053** | 19 | ~18 |

**Part IX is a chapter-count problem, not a length problem** — and that distinction is the whole item.
All 19 of its chapters are already inside the 150–400 line standard; the longest is 394. Hitting 2,500
lines means roughly **eleven** chapters, not nineteen. `Behavioral/` (10) and `Communication/` (6)
overlap by subject — communication stories, conflict, cross-cultural work — and the merge candidates
are obvious once the two indexes are read side by side.

⚠️ **#61 and #64 both add to Part IX.** #61 writes six new Behavioural chapters and #64 adds the
AI-era interview chapter. Either this item leaves headroom for seven more chapters, or #61's list gets
cut to fit. Decide it here rather than discovering it at #64.

Part VIII is an ordinary trim, evenly spread across six sections at 741–1,182 lines each.

**Done when:** `pnpm lint:docs` reports Parts 8 and 9 at or under their BOOK-SPEC § 5 budgets.

**Delivered:**

- **Part IX: 4,553 → 1,999 against a 2,500 budget. Sixteen chapters became eight.** The item's own
  diagnosis was right — every one of the sixteen was already inside the 150–400 line standard, so this
  was a chapter-count problem and merging was the only lever. `Behavioral/` is now five chapters
  (`01` STAR + the coverage grid, `02` leadership + teamwork + conflict, `03` problem solving +
  challenges + failure, `04` ways of working, `05` engineering culture) and `Communication/` is three
  (`01` technical communication, `02` listening + thinking aloud, `03` written communication). Both
  part-opener READMEs rewritten. Six of the eight are new prose, not patched files — ten of the sixteen
  predated the Book Chapter Standard entirely (retired emoji in headings, `[← Back]` footers, relative
  links, quoted first-person answers, US spelling), so bringing them up to standard meant rewriting.
- **Part VIII: 6,046 → 5,501 against a 5,500 budget. Twenty-three chapters became twenty-one.** Two
  merges and six trims. `CICD/03-deployment-strategies` + `Deployment/03-rollback` →
  `Deployment/02-deployment-strategies-and-rollback` (they shared expand/contract and the "every
  release must work against both schemas" invariant); `Deployment/02-preview-environments` →
  `Deployment/01-platform-deploys` (previews are a consequence of the immutable-artefact model that
  chapter sets up). `CICD/` and `Deployment/` renumbered, both section READMEs and the part opener
  updated.
- **`Containers/04-kubernetes-essentials` cut 330 → 261 on a spec mandate, not for budget.**
  BOOK-SPEC § 6 puts Kubernetes past "my service runs in a pod somewhere" out of scope, and the chapter
  was carrying control-plane component internals and PodDisruptionBudget detail. What stayed is the part
  a service owner promises: probes, requests and limits, rollout gating, and the endpoint-removal/SIGTERM
  race that produces 502s.
- **Zero new dangling anchors.** Nine slugs retired; every inbound reference repointed. `ch-preview-environments`
  and `ch-rollback-and-recovery` folded into `ch-platform-deploys` and `ch-deployment-strategies`
  (the merged chapters kept the slug with the most inbound references, so `ch-deployment-strategies`'s
  four survived untouched). All nine retired Part IX slugs were referenced only from inside Part IX.
  The three book-wide danglers that remain (`ch-preface`, `ch-further-reading`,
  `ch-web-performance-caching-strategies`) are pre-existing and belong to **#72** and **#70**.
- **Archived, not merged: 4 files.** `Archive/behavioral/` (new — `08-questions-to-ask.md`, 356 lines of
  question lists whose durable third is now the closing section of `05-engineering-culture.md`) and
  `Archive/communication/` (`03-system-design-communication.md`, a full duplicate of Part VI's
  `ch-driving-the-round`; `05-cross-cultural-communication.md`, etiquette-by-region that ages within a
  quarter). Nine more files were **merged**, so they are in git history rather than `Archive/` — the rule
  `Archive/README.md` states. Both archive READMEs and the top-level one updated.
- **`.lint-baseline.json` budget: 3,748 → 1,149.** All six other rules still at zero.

**Part IX headroom was the decision this item had to make, and #61's list is the thing that gives.**
Part IX now sits 501 lines under budget, which pays for **two** more chapters at ~230, not seven.
**#61 has been amended** — four of its six proposed chapters already exist as sections of chapters that
survived (mentoring in `02`, disagreement with a senior stakeholder in `02`, ADRs in `Communication/03`,
blameless post-mortems in `05`), so its real gap is one chapter, not six. That leaves the second slot for
**#64**'s AI-era interview chapter, which BOOK-SPEC § 4 names explicitly.

**Correction to BOOK-SPEC § 5's chapter count for Part IX.** § 5 says "~18 chapters" against a
2,500-line budget. At the 150-line chapter floor eighteen chapters is 2,700 lines, so **the two numbers
have never been compatible.** The honest figure is **eleven** — eight now plus #61's one and #64's one,
with a little slack. § 5's budget is the contract the lint enforces, so this item honoured it; the
chapter count needs an amendment at **#71** or **#76**. Part VIII's "~22" is fine: it lands at 21.

---

### - [x] 31f. Archive CSS layout mechanics and `CSSArchitecture/` `M` — ✅ **done 2026-09-03**

Added on 2026-09-03, after the edition picked up a hard **700-page ceiling** — BOOK-SPEC decision #13.
Numbered `31f` because it is Phase 2 work (restructure and prune) and it is already complete, so unlike
**#58a** it carries no ordering constraint that a Phase 2 slot would strand.

**Two independent findings, and they pointed the same way.**

**Duplication.** `Frontend/CSSArchitecture/04-design-systems.md` and `SystemDesign/Frontend/08-design-systems.md`
are near-verbatim — same subject, same "forty teams" pull quote, same subtopic list, different part stamps
(2 and 4). That is a plain non-negotiable #7 violation, and design tokens had a **third** home in
`HtmlCss/08-advanced-css.md`. #42 moves the SystemDesign file into `Frontend/Architecture/`, so archiving
the CSSArchitecture one removes a duplicate rather than a topic.

**Audience.** CSS layout mechanics — the box model, flexbox, grid, breakpoints, keyframes — are assumed
knowledge for a staff candidate and are essentially never asked to be recited. What a senior round probes
is the part with a legal or architectural consequence: which element was chosen, whether the page works
without a mouse, and which post-2023 feature replaced a workaround still being carried.

**The corroborating measurement.** Every one of the nine archived chapters had **zero inbound
cross-references**. The three keepers had 2, 5 and 4. The archived set was orphaned, so the move cost no
link repair — `lint:docs` reports 0 broken links after it.

| Kept (renumbered) | Lines | Inbound | Why it stays |
| ----------------- | ----: | ------: | ------------ |
| `01-semantic-html.md` | 256 | 2 | Feeds `Accessibility/02` at #54 |
| `02-accessibility.md` (was `07`) | 254 | 5 | BOOK-SPEC § 4 names it a legal requirement and a senior/mid differentiator |
| `03-advanced-css.md` (was `08`) | 236 | 4 | Container queries, `:has()`, cascade layers, subgrid, `oklch()` |

**Done when:** Part II is under budget with the three keepers renumbered `01`–`03`, `lint:docs` reports
zero broken links and zero missing-README violations, and BOOK-SPEC records the decision and the spine
consequence.

**Delivered:**

- **`Archive/htmlcss/`** — 5 of 8: `02-css-fundamentals`, `03-flexbox`, `04-grid`, `05-responsive-design`,
  `06-css-animations` (1,213 lines). **`Archive/cssarchitecture/`** — all 4 + README (855 lines), joining
  the `04-atomic-css.md` an earlier pass had already put there. All `git mv`, no deletes.
- Keepers renumbered `07`→`02` and `08`→`03`. **Slugs are filename-independent**, so all 11 inbound
  `#ch-` anchors still resolve; `chapter: 0` front matter means `orderDocs()` falls through to filename
  sort, so reading order is preserved.
- `Frontend/HtmlCss/README.md` rewritten to the part-opener standard — 64 lines, 3-chapter table. Its old
  second paragraph claimed responsive design was the second differentiator; BOOK-SPEC § 4 says
  internationalisation, and it now says that.
- `Frontend/README.md`, `Archive/README.md` and BOOK-SPEC § 5 + § 11 updated. Spec bumped **1.2 → 1.3**
  with decision rows **#13** (the 700-page cap) and **#14** (this archive).
- **Part II: 5,795 → 3,718** against a 6,000 budget. In-book total **37,714 → 35,637**.
- `pnpm lint:docs`: 197 files, six rules at zero, the one violation still Part IV's pre-existing +1,149.
  **`.lint-baseline.json` unchanged** — no count moved, so there was nothing to ratchet.

**Deliberately left — two open threads, both recorded rather than fixed:**

1. **A 554-line spine breach, deferred to #77.** Non-negotiable #3 needs Parts I–IV ≥ 50%. With #58a
   trimming Part IV to 5,500 and #54 refilling Part II by ~1,046 net, the finished book projects to
   **27,240 of 55,034 = 49.5%**. The 554-line gap must be paid from Parts V–IX in § 5's fixed cut order
   — Part VIII first — never from Parts I–IV. Deferred because #77's calibration changes every input.
2. **No Part III home for the styling argument.** `01-css-methodologies`, `02-utility-vs-component` and
   `03-css-in-js` were **archived, not staged under `salvage/`**, because `salvage/README.md` requires a
   *named* destination item with a chapter number and no Part III item has one — #41's `Tooling/` table
   has no styling chapter. The durable content (why utility-first won, what CSS-in-JS costs at runtime)
   is worth one Part III chapter. **That needs a new item; this one did not invent it.**

---

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

### - [x] 32. Scaffold `Frontend/ModernStack/` and write the part opener `S` — ✅ **done 2026-09-03**

Create all six subdirectories with READMEs and a Part III opener explaining the through-line:
_the framework is an implementation detail; the rendering model and the state model are the architecture._

**Done when:** the tree exists, READMEs list planned chapters, and `Frontend/README.md` links resolve (fixes item 9's outstanding two).

**Delivered:**

- `Frontend/ModernStack/` created with all six subdirectories and **seven READMEs, 441 lines**:
  the Part III opener plus `React/`, `NextJS/`, `Svelte/`, `Rendering/`, `StateManagement/`, `Tooling/`.
  Part III goes from 0 to 441 of its 12,000-line budget
- The opener carries the part's through-line — *the framework is an implementation detail; the rendering
  model and the state model are the architecture* — and the half-and-half structure that justifies it:
  three tool sections, three model sections, so half the part survives the next major release
- All 46 planned chapters are listed across the six section tables with a "what it answers" column,
  matching the chapter lists in #33–41 exactly. **Titles are plain text, not links** — the files do not
  exist yet and a link to one would be a `broken-link` violation. Each table carries a ⚠️ note naming the
  item that fills it, and `Rendering/`/`StateManagement/` name the two chapters staged in
  `Archive/salvage/frontend/` that #39 and #40 absorb
- Section indexes follow the `ShipAndOperate/` precedent, not the `Part N — X` one: the part opener is
  `ModernStack/README.md` and the six below it take bare titles, because all six live under one directory
- Context7 checked before writing. Version-stamped **React 19, Next.js 16, Svelte 5**, with a
  moving-target callout in the opener and another in `NextJS/` for the caching semantics that changed in
  15 and again in 16
- `Frontend/README.md`: Part III added to the parts table, given its own section body, and the "does not
  exist yet" paragraph replaced. Reading order is now `I → II → III → IV` with no parenthetical
- `README.md` (repo root): Part III's "Where it lives today" cell now links at `ModernStack/`, the "two
  holes in the hull" section says *almost* no React content rather than none, the stale claim that
  `Frontend/README.md` links to `./React/` and `./NextJs/` is gone, and the layout tree says Parts I–IV
- **Item 9's outstanding two were already closed by #18**, which deleted the `./React/` and `./NextJs/`
  links rather than waiting for this item to make them resolve. `broken-link` was already 0 on entry and
  is still 0; this item added the working links the plan expected, one item late in bookkeeping terms
- `pnpm lint:docs`: 197 → **204 files**, six rules at zero, the one violation still Part IV's
  pre-existing +1,149. **`.lint-baseline.json` unchanged.** `pnpm book:collect`: 204 files, 40,695 lines

---

### - [x] 33. Write `React/` chapters 01–04 — the model `L` — ✅ **done 2026-09-03**

Use **Context7 MCP** for current React docs before writing.

| #   | Chapter                         | Must cover                                                          |
| --- | ------------------------------- | ------------------------------------------------------------------- |
| 01  | The React mental model          | Declarative UI, reconciliation, why re-renders happen, keys          |
| 02  | Hooks in depth                  | Rules, `useState`/`useEffect` correctly, `useRef`, custom hooks, closures over stale state |
| 03  | `useEffect` and when **not** to use it | The single most common senior red flag — derived state, event handlers, `useSyncExternalStore` |
| 04  | Component composition patterns  | Compound components, render props today, slots, controlled vs uncontrolled |

> **Amended 2026-09-03 — this item had no "Done when" line.** #33 through #41 were all written without
> one; the acceptance test for a chapter-writing item is the same each time, so it is stated here and
> should be copied into #34–#41 as each is picked up.

**Done when:** all four chapters exist under `Frontend/ModernStack/React/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body),
`pnpm lint:docs` shows no rule regressed, and the section README links them.

**Delivered:**

- Four chapters, **965 lines** — `01-react-mental-model.md` (227), `02-hooks-in-depth.md` (249),
  `03-when-not-to-use-effect.md` (231), `04-composition-patterns.md` (258). All inside the 150–400 band,
  all seven `##` headings in the Book Chapter Standard's order, no `####`, no relative links in a body
- Part III is now **1,406 of its 12,000-line budget** across 11 files. The book is 208 files, 41,664 lines
- **The split between 02 and 03 is deliberate and worth keeping.** 02 is the *mechanism* — call order,
  `useState` against `useRef`, dependency arrays, cleanup, stale closures, custom hooks. 03 is the
  *judgement* — the four effects to delete (derived state, `key` resets, event logic, external stores) and
  the table of the ones that stay. Writing both as "useEffect" chapters would have been a non-negotiable
  #7 duplication
- Context7 checked against `/reactjs/react.dev` before writing. Three React 19 facts the chapters depend
  on and that pre-19 training data gets wrong: **`ref` is a plain prop** and `forwardRef` is heading for
  deprecation; **`<Context value={…}>`** replaces `<Context.Provider>`; and **`use` is the one hook that
  may be called conditionally**. `vercel:react-best-practices` was also consulted per the
  `write-topic-docs` companion table — it supplied the lazy-`useState`-initialiser, no-components-inside-
  components and derive-during-render points
- **Slugs are now fixed for the whole React section**, because 01–04 cross-reference forward and #34/#35
  must match them. `react-mental-model`, `react-hooks-in-depth`, `when-not-to-use-effect`,
  `react-composition-patterns`, then `server-components-vs-client-components`, `suspense-and-streaming`,
  `transitions-and-concurrency`, `react-actions-and-forms`, `react-performance-and-the-compiler`,
  `react-error-boundaries`, `react-typescript-at-scale`, `testing-react`. Chapter 03 also points forward
  at `four-kinds-of-state`, which #40 owns. Note `react-typescript` is **taken** by
  `Frontend/TypeScript/08-react-typescript.md` until #35 moves it, which is why chapter 11's slug differs
- Forward cross-references use the `[Chapter ?? — Title](#ch-slug)` form the standard allows. **#70 has to
  replace every `??` with a real number** — there are 5 in this set
- `pnpm lint:docs`: 204 → **208 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 34. Write `React/` chapters 05–08 — the concurrent era `L` — ✅ **done 2026-09-03**

| #   | Chapter                       | Must cover                                                             |
| --- | ----------------------------- | ---------------------------------------------------------------------- |
| 05  | Server Components vs Client Components | The boundary, what serialises, `'use client'`, why this is _the_ 2026–27 interview question |
| 06  | Suspense and streaming        | Boundaries, fallbacks, streaming SSR, hydration mismatch debugging      |
| 07  | Transitions and concurrency   | `useTransition`, `useDeferredValue`, urgent vs non-urgent updates       |
| 08  | Actions and forms             | React 19 Actions, `useActionState`, `useOptimistic`, `useFormStatus`, server mutations |

**Done when:** all four chapters exist under `Frontend/ModernStack/React/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body),
`pnpm lint:docs` shows no rule regressed, and the section README links them. _Added at #34, per #33's
amendment — #35–#41 still need the same line copied in._

**Delivered:**

- Four chapters, **841 lines** — `05-server-and-client-components.md` (230),
  `06-suspense-and-streaming.md` (185), `07-transitions-and-concurrency.md` (186),
  `08-actions-and-forms.md` (240). All in the 150–400 band, all seven `##` headings in order, no `####`,
  no relative links in a body, ⚠️ callouts at 0–1 per chapter against a budget of 3
- `React/` is now 8 of 12 chapters and **1,806 lines**. Part III is at **2,247 of 12,000**
- Context7 supplied four things that decide whether these chapters are right, and that pre-19 training
  data gets wrong. **`'use client'` marks a boundary on the module dependency graph, not the render
  tree** — which is why a Client Component can render a Server Component passed as `children` but cannot
  import one; that is chapter 05's central argument. The **exact serialisable-props list** (primitives,
  iterables, `Date`, plain objects, JSX, promises, Server Functions — never classes, closures or
  null-prototype objects). **`useActionState` returns a three-tuple** `[state, action, isPending]`.
  And **React replays a form submission made before hydration finished**, which is chapter 08's
  progressive-enhancement claim
- 06 and 07 came in at 185 and 186 lines against a ~220 target. Both are inside the band and were left
  rather than padded; they are tight because the API surface is small and the judgement is in the
  placement, which the decision tables carry
- **Slug reservations this item makes for later items.** Chapter 06 points at `#ch-streaming-html` and
  chapter 05 at `#ch-rendering-spectrum` — both **#39**, which should use `rendering-spectrum`,
  `hydration-and-its-costs`, `streaming-html`, `choosing-per-route`, `seo-and-rendering`,
  `edge-vs-origin`. Chapter 08 points at `#ch-form-state`, which **#40** owns. Chapter 03 already
  reserved `four-kinds-of-state` from the same item
- Forward `[Chapter ?? — …]` references now total **12 across chapters 01–08**, all for #70 to number
- `pnpm lint:docs`: 208 → **212 files**, six rules at zero, the one violation still Part IV's
  pre-existing +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 35. Write `React/` chapters 09–12 — production React `M` — ✅ **done 2026-09-06**

| #   | Chapter                        | Must cover                                                           |
| --- | ------------------------------ | -------------------------------------------------------------------- |
| 09  | Performance and the React Compiler | What the compiler memoises for you, when `memo`/`useMemo` still matter, profiling |
| 10  | Error boundaries and resilience| Boundaries, recovery UX, error reporting, Suspense + error interplay  |
| 11  | React + TypeScript at scale    | Typing props/generics/refs/context, discriminated unions for state (merge/expand `Frontend/TypeScript/08-react-typescript.md`) |
| 12  | Testing React                  | RTL philosophy, testing RSCs, async and Suspense, what not to test    |

> Item 12's existing `Frontend/TypeScript/08-react-typescript.md` should be **moved here**, not duplicated.

**Done when:** all four chapters exist under `Frontend/ModernStack/React/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body),
`pnpm lint:docs` shows no rule regressed, and the section README links them. _Copied in at #35, per #34's
note — #36–#41 still need the same line._

**Delivered:**

- Four chapters, **965 lines** — `09-performance-and-the-compiler.md` (217),
  `10-error-boundaries.md` (240), `11-react-typescript-at-scale.md` (300), `12-testing-react.md` (208).
  All in the 150–400 band, all seven `##` headings in order, no `####`, no relative links in a body,
  ⚠️ callouts at 1–2 per chapter against a budget of 3
- **`React/` is complete — 12 chapters, 2,838 lines.** Part III is at **3,212 of 12,000** across 15 files.
  The book is 215 files
- **The TypeScript React chapter moved, it was not copied.** `Frontend/TypeScript/08-react-typescript.md`
  (212 lines, not the 478 this item claimed — that figure was wrong) is deleted and its content is now
  chapter 11, expanded with discriminated-union async state, generic components, `useActionState` typing
  and the rule that TypeScript **cannot** model the server/client boundary. `Frontend/TypeScript/README.md`
  drops its row for 08 and points at Part III instead; Part I is now 7 chapters
- **Slug change other items must know about.** The old `react-typescript` slug is **retired**; chapter 11
  is `react-typescript-at-scale`, as #33 reserved. The two live references — `React/02` and `React/04` —
  were rewritten. Nothing else in the tree pointed at it
- Context7 checked against `/reactjs/react.dev` and `/testing-library/testing-library-docs`. Four facts
  the chapters rest on: the **React Compiler bails out silently** on any component that breaks the Rules
  of React, and `eslint-plugin-react-hooks` surfaces those diagnostics even before adoption; the
  `"use memo"` / `"use no memo"` directives; React 19's **root-level `onCaughtError` / `onUncaughtError` /
  `onRecoverableError`** options, which is where hydration mismatches actually surface; and that profiling
  instrumentation is stripped from production builds, so profiles must be read with that in mind.
  `vercel:react-best-practices` supplied the three-problems framing in chapter 09 — bundle, waterfalls
  and re-renders are separate problems and only the third is the compiler's
- **One duplication resolved against #57, which is amended.** #57's add-list included "testing Server
  Components, testing async/Suspense" for `Frontend/Testing/` — the same ground as chapter 12. Chapter 12
  keeps the React-specific *judgement* (what to test at which level, why an async Server Component is not
  renderable by Testing Library, `findBy*` against the `act` warning, what not to test) and defers the
  RTL query API to `Frontend/Testing/03`, which it cross-references. #57 now says so explicitly. This
  also leaves Part IV's +1,149 overage no worse
- Forward `[Chapter ?? — …]` references in `React/` total **38 across chapters 01–12**, all for #70 to
  number. The figures logged at #33 ("5") and #34 ("12") were undercounts — they missed the
  in-body references and counted only part of each "What to Read Next" block. 38 is the measured count
- `pnpm lint:docs`: 212 → **215 files** (four added, one deleted), six rules at zero, the one violation
  still Part IV's pre-existing +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 36. Write `NextJS/` chapters 01–05 — the framework `L` — ✅ **done 2026-09-06**

Use **Context7 MCP** — Next.js moves fast and training data goes stale quickly.

| #   | Chapter                    | Must cover                                                        |
| --- | -------------------------- | ----------------------------------------------------------------- |
| 01  | App Router mental model    | File conventions, layouts, templates, route groups, parallel/intercepting routes |
| 02  | Data fetching and caching  | Server-side fetching, request memoisation, `use cache`, `cacheLife`, `cacheTag`, revalidation |
| 03  | Server Actions             | Mutations, validation, progressive enhancement, security (never trust the client) |
| 04  | Rendering in Next.js       | Static, dynamic, streaming, **Partial Prerendering (PPR)** — the flagship 2026 concept |
| 05  | Middleware and the edge    | Request interception, auth gating, personalisation, edge vs Node runtime tradeoffs |

**Done when:** all five chapters exist under `Frontend/ModernStack/NextJS/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body),
`pnpm lint:docs` shows no rule regressed, and the section README links them. _Copied in at #36, per #34's
note — #37–#41 still need the same line._

**Delivered:**

- Five chapters, **1,129 lines** — `01-app-router-mental-model.md` (216),
  `02-data-fetching-and-caching.md` (255), `03-server-actions.md` (236), `04-rendering-in-nextjs.md` (214),
  `05-middleware-and-the-edge.md` (208). All in the 150–400 band, all seven `##` headings in order, no
  `####`, no relative links in a body, ⚠️ callouts at 1–2 per chapter against a budget of 3. Every chapter
  carries a moving-target callout, which this section needs more than any other
- Part III is at **4,343 of 12,000** across 20 files. The book is **220 files**
- **Slugs are now fixed for the whole Next.js section**, because 01–05 cross-reference forward and #37
  must match: `app-router-mental-model`, `nextjs-data-and-caching`, `server-actions`,
  `rendering-in-nextjs`, `nextjs-middleware-and-the-edge`, then for #37 `nextjs-assets`,
  `nextjs-auth-patterns`, `route-handlers-and-the-bff`, `nextjs-deployment-and-runtime`,
  `migrating-to-the-app-router`. Chapter 04 points forward at `#ch-rendering-spectrum`, which **#39** owns
- **Context7 against `/vercel/next.js` changed four things a pre-16 draft would have got wrong**, and #37
  needs all four. **`middleware.ts` is renamed `proxy.ts`** (export `proxy`, `skipMiddlewareUrlNormalize`
  → `skipProxyUrlNormalize`) and **`proxy` runs on Node.js only** — the runtime is not configurable and
  route-segment `runtime` config in that file is a build error; edge-runtime code must stay in
  `middleware.ts`. **`cacheComponents: true` replaces `experimental.ppr`**, and the per-route
  `experimental_ppr` export is removed. **`revalidateTag` now takes a cache profile as a second
  argument**, and `updateTag` is the same-request counterpart. **Synchronous access to `cookies()`,
  `headers()`, `params` and `searchParams` is fully removed in 16**
- `vercel:nextjs` and `vercel:next-cache-components` supplied the platform judgement the reference docs
  do not spell out: the three content types under Cache Components, the rule that runtime APIs cannot be
  read inside `use cache` and must be passed as arguments so they land in the key, `default.tsx` being
  mandatory for every parallel slot, and `router.back()` rather than `router.push()` for closing an
  intercepted modal. Both are vendor skills — the marketing register was stripped and the platform is
  named only where a detail genuinely differs, per the `write-topic-docs` caution
- **Chapter 05's title is kept as "Middleware and the Edge" deliberately.** The file is `proxy.ts` in
  Next.js 16, but "middleware" is the word the interview uses and the word a reader scans the contents
  for. The rename is handled inside the chapter, in the moving-target callout and a naming table
- **No duplication with `Frontend/Security` or `Backend/Security`.** Chapter 03 covers Server Action
  security as an *App Router* problem — the generated endpoint, the four checks, closure encryption — and
  cross-references `#ch-backend-input-validation` for schema design rather than restating it
- Forward `[Chapter ?? — …]` references in `NextJS/` total **21 across chapters 01–05**, for #70 to number
- `pnpm lint:docs`: 215 → **220 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 37. Write `NextJS/` chapters 06–10 — production Next `M` — ✅ **done 2026-09-06**

| #   | Chapter                     | Must cover                                                     |
| --- | --------------------------- | -------------------------------------------------------------- |
| 06  | Images, fonts, and assets   | `next/image`, `next/font`, CLS prevention, asset budget         |
| 07  | Auth patterns               | Session vs JWT in App Router, middleware gating, cookie strategy |
| 08  | Route handlers and BFF      | When Next _is_ your backend, when it should not be              |
| 09  | Deployment and runtime      | Vercel vs self-host, ISR at the edge, preview deployments, env strategy |
| 10  | Migrating Pages → App Router| Incremental adoption — a real interview scenario                 |

**Done when:** all five chapters exist under `Frontend/ModernStack/NextJS/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body),
`pnpm lint:docs` shows no rule regressed, and the section README links them. _Copied in at #37, per #34's
note — #38–#41 still need the same line._

**Delivered:**

- Five chapters, **1,091 lines** — `06-images-fonts-and-assets.md` (219), `07-auth-patterns.md` (227),
  `08-route-handlers-and-the-bff.md` (207), `09-deployment-and-runtime.md` (226),
  `10-migrating-to-the-app-router.md` (212). All in the 150–400 band, all seven `##` headings in order,
  no `####`, no relative links in a body, ⚠️ callouts at 1–2 per chapter against a budget of 3. **The
  Next.js section is complete at ten chapters** and the README's "being written" callout is gone
- Slugs are as #36 reserved them: `nextjs-assets`, `nextjs-auth-patterns`, `route-handlers-and-the-bff`,
  `nextjs-deployment-and-runtime`, `migrating-to-the-app-router`. Every forward reference written in
  01–05 now resolves
- Part III measures **5,455 of 12,000** across 29 files — 22 chapters plus 7 section openers. (#36's
  "4,343 across 20 files" counted chapters only and against a slightly earlier tree; the figure above is
  every Part III file as `loadBook` sees it, which is what the budget rule counts.) The book is
  **225 files**
- **Context7 against `/vercel/next.js` supplied five facts a pre-16 draft would have got wrong.**
  `images.domains` is removed in favour of `remotePatterns`; **`images.qualities` is now an allow-list
  defaulting to `[75]`**, so a `quality` prop outside it fails the build; `16` was dropped from the
  default `imageSizes`. `use cache` **cannot be applied to a `GET` export** — the cached work moves into
  a helper, replacing `dynamic = 'force-static'`. And `unauthorized()` / `forbidden()` are **still
  experimental behind `experimental.authInterrupts`**, which chapter 07 says rather than presenting them
  as stable
- `vercel:nextjs` supplied the self-hosting judgement chapter 09 rests on: standalone output **does not
  include `public/` or `.next/static`**, the per-instance filesystem cache is what breaks ISR behind a
  load balancer, and `cacheMaxMemorySize: 0` is the half of the cache-handler fix that gets skipped. The
  16-era `cacheHandlers` map (`default` / `remote`) is named in the moving-target callout alongside the
  older single `cacheHandler`, because both are live depending on version
- **Three duplication boundaries drawn deliberately, none of them new content.** Chapter 06 keeps the
  `next/image` and `next/font` mechanics and defers formats, compression and CDNs to
  `#ch-image-optimization`. Chapter 07 keeps *where* the check runs in an App Router app and defers token
  mechanics to `#ch-jwt` and permission modelling to `#ch-authorisation`. Chapter 09 keeps what
  `next build` emits and defers previews, artefact promotion and version skew to `#ch-platform-deploys`,
  which already covers all three — so the item's "preview deployments" line is answered by a
  cross-reference rather than a second telling. That is the one place this item's brief was narrowed, and
  it was narrowed to avoid a non-negotiable #7 violation
- Forward `[Chapter ?? — …]` references in `NextJS/` now total **44 across chapters 01–10** (21 from #36,
  23 new), for #70 to number
- `pnpm lint:docs`: 220 → **225 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 38. Write `Svelte/` chapters 01–06 `L` — ✅ **done 2026-09-06**

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

**Done when:** all six chapters exist under `Frontend/ModernStack/Svelte/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, no relative links in the body), `pnpm lint:docs` shows no
rule regressed, and the section README links them. _Copied in at #38, per #34's note — #39–#41 still need
the same line._

**Delivered:**

- Six chapters, **1,376 lines** — `01-runes-model.md` (239), `02-reactivity-compared.md` (194),
  `03-components-and-snippets.md` (237), `04-sveltekit-routing-and-loading.md` (231),
  `05-sveltekit-form-actions.md` (246), `06-adapters-and-deployment.md` (229). All in the 150–400 band,
  all seven `##` headings in order, no `####`, no relative links in a body, ⚠️ callouts at 1–2 per
  chapter against a budget of 3. Done in one session despite the `L` marking
- Slugs: `svelte-runes`, `reactivity-compared`, `svelte-snippets`, `sveltekit-routing-and-loading`,
  `sveltekit-form-actions`, `sveltekit-adapters-and-deployment`. Filenames are `01-runes-model.md`
  through `06-adapters-and-deployment.md`
- **`BOOK-SPEC.md` amended — version 1.3 → 1.4, decision log row 15.** Non-negotiable #1's fence
  allow-list gains **`svelte`**, and `ALLOWED_FENCES` in `scripts/lib/book.ts` with it. A `.svelte` file
  is a component template with **no TypeScript form** — its markup, `{#snippet}` blocks and `{@render}`
  tags are compiler syntax, and the only TypeScript in it already sits inside `<script lang="ts">`. This
  is decision 10 (`graphql`, `dockerfile`, `nginx`, `http`) applied to a language the original list did
  not anticipate, with `tsx` as the precedent for a component syntax being allowed outright. The
  alternative — the decision-11 `lint-allow-fence` marker — would have meant an identical comment above
  all **17** `svelte` fences and every future one, turning a deliberate per-fence exception into
  boilerplate. § 10's "relaxing the TypeScript-only rule" bar is **not** engaged: general-purpose
  languages still opt out one fence at a time
- **Context7 against `/websites/svelte_dev` and `/websites/svelte_dev_kit` fixed five things.** Exported
  reassignable `let` from a `.svelte.ts` module **cannot** be observed by importers — the compiler
  rewrites one file at a time — so shared state exports an object or accessors. `$state.raw` and
  `$state.snapshot` are the two escape hatches from proxying, and both earned a table row. Prerendering
  discovers pages by **crawling**, which is the whole explanation for the "marked as prerenderable but
  not prerendered" build failure and why `entries` exists. SvelteKit's four `$env` modules split on two
  axes — build/runtime and private/public — which is the same build-once-promote argument as #37's
  chapter 09, so the two chapters cross-reference rather than repeat. And **remote functions**
  (`query`/`form`/`command`/`prerender` in `.remote.ts`) are real but still behind
  `kit.experimental.remoteFunctions`, so chapter 05 names them in its moving-target callout rather than
  teaching them as the current API
- **Chapter 02 is the one that pays for the section.** It is framework-agnostic — the three reactivity
  strategies, the comparison table, and *why React declined signals* (interruptible rendering needs
  replayable renders; the compiler removes the bookkeeping instead). It is the chapter to keep if Part III
  ever has to be cut, and the README's reading order already says so
- **No duplication with `React/`.** Chapter 01 cross-references `#ch-when-not-to-use-effect` rather than
  re-arguing it, chapter 03 points at `#ch-react-composition-patterns` for render props, and chapter 02
  defers React's own answer to `#ch-react-performance-and-the-compiler`. Chapter 05 pairs with
  `#ch-server-actions` as the same problem with two answers, and chapter 06 defers previews and rollback
  to `#ch-platform-deploys`
- Part III now measures **6,835 of 12,000** across 35 files. The book is **231 files**
- Forward `[Chapter ?? — …]` references in `Svelte/` total **21 across chapters 01–06**, for #70 to number
- `pnpm lint:docs`: 225 → **231 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 39. Write `Rendering/` chapters 01–06 — the framework-agnostic core `M` — ✅ **done 2026-09-07**

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

**Done when:** all six chapters exist under `Frontend/ModernStack/Rendering/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, no relative links in the body), `pnpm lint:docs` shows no
rule regressed, the section README links them, and the salvaged `rendering.md` is deleted. _Line added at
#39, per #38's note._

**Delivered:**

- Six chapters, **1,201 lines** — `01-rendering-spectrum.md` (187), `02-hydration-and-its-costs.md` (192),
  `03-streaming-html.md` (231), `04-choosing-per-route.md` (190), `05-seo-and-rendering.md` (196),
  `06-edge-vs-origin.md` (205). All in the 150–400 band, all seven `##` headings in order, no `####`, no
  relative links in a body, ⚠️ callouts at 0–2 per chapter against a budget of 3
- Slugs: `rendering-spectrum`, `hydration-and-its-costs`, `streaming-html`, `choosing-per-route`,
  `seo-and-rendering`, `edge-vs-origin-rendering`
- **`Archive/salvage/frontend/rendering.md` deleted**, its decision matrix absorbed into chapter 04's route
  inventory and its CSR/SSR/SSG/ISR comparison into chapter 01. `Archive/salvage/frontend/README.md`
  updated to show one file remaining, for #40. Nothing linked to `#ch-rendering-strategies`
- **Chapter 04 is the one that pays for the section** — the route inventory table is the artefact a
  candidate draws on a whiteboard, and the four questions (audience · allowed staleness · indexed · is the
  cache key bounded) are the procedure behind it. Chapter 01's spectrum exists to give it vocabulary
- Research corrected three things the training data would have got wrong. **Streaming does not need an edge
  runtime** — it works on full origin runtimes, and chapter 06 says so as a named myth. **The cold-start
  argument for the edge has weakened**: warm-instance reuse, bytecode caching and per-instance concurrency
  have narrowed the gap, so chapter 06 carries a moving-target callout around the numbers rather than
  quoting them. And **PPR does not remove the function invocation** — a route with holes runs a function on
  every request; what it removes is the wait. Context7 against `/withastro/docs` and `/qwikdev/qwik` fixed
  the islands and resumability material in chapter 02: Astro's `client:*` directives are per-island
  *loading* strategies, and Qwik's model serialises listener references plus state into the HTML rather
  than replaying the application
- **Four duplication boundaries drawn deliberately.** Chapter 02 defers hydration-mismatch diagnosis to
  `#ch-suspense-and-streaming` and the server/client boundary to `#ch-server-components-vs-client-components`.
  Chapter 03 keeps the *transport* — chunked encoding, the placeholder-and-swap trick, what silently
  buffers a response — and defers the React API to `#ch-suspense-and-streaming` and PPR-in-Next.js to
  `#ch-rendering-in-nextjs`. Chapter 05 keeps *what a crawler receives* and defers meta tags, structured
  data and sitemaps to Part VI's `#ch-seo-and-analytics`, which already covers all three. Chapter 06
  deepens the compact edge/origin table in `#ch-nextjs-middleware-and-the-edge` rather than repeating it,
  and defers tier one to `#ch-cdn`
- Forward `[Chapter ?? — …]` references in `Rendering/` total **21 across chapters 01–06**, for #70 to number
- `pnpm lint:docs`: 231 → **237 files** (six added, one deleted), six rules at zero, the one violation still
  Part IV's pre-existing +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 40. Write `StateManagement/` chapters 01–06 `M` — ✅ **done 2026-09-07**

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

**Done when:** all six chapters exist under `Frontend/ModernStack/StateManagement/`, each passes the Book
Chapter Standard (six blocks in order, 150–400 lines, no relative links in the body), `pnpm lint:docs`
shows no rule regressed, the section README links them, and the salvaged `state-management.md` is deleted.
_Line added at #40, per #38's note._

**Delivered:**

- Six chapters, **1,321 lines** — `01-four-kinds-of-state.md` (206), `02-server-state.md` (244),
  `03-client-state.md` (244), `04-form-state.md` (225), `05-url-as-state.md` (205),
  `06-signals-and-the-next-model.md` (197). All in the 150–400 band, all seven `##` headings in order, no
  `####`, no relative links in a body, ⚠️ callouts at 0–2 per chapter against a budget of 3
- Slugs: `four-kinds-of-state`, `server-state`, `client-state`, `form-state`, `url-as-state`,
  `signals-and-the-next-model`
- **`Archive/salvage/frontend/state-management.md` deleted**, and with it the salvage directory is empty
  of chapters — `Archive/salvage/frontend/README.md` now records where both files went and notes that #42
  may remove the directory. The old file's server-versus-client split became chapter 01's four-category
  framing; its Context, Zustand and Redux Toolkit sections became chapter 03, corrected (see below)
- **Chapter 01 is the one that pays for the section**, as the README already claimed. The classification
  question — "if two browser tabs disagreed, which one would be wrong?" — is the whole framing, and
  chapters 02–05 are one category each
- Context7 corrected four things, and one of them was a bug in the salvaged file. **Zustand 5 requires
  stable selector output**: the salvaged example selected `(state) => ({ users, fetchUsers })`, which in
  version 5 re-renders repeatedly and can throw "maximum update depth exceeded" — chapter 03 carries this
  as a ⚠️ and names `useShallow` as the fix. **TanStack Query v5** renamed `cacheTime` → `gcTime` and
  `isLoading` → `isPending`, requires array keys, and later v5 releases renamed the mutation callback
  arguments again, so chapter 02's optimistic-update example names the third argument positionally and
  carries a moving-target callout. **Zod 4** promoted string formats to top level (`z.email()`, not
  `z.string().email()`) and reorganised the issue types. **nuqs** replaced `throttleMs` with
  `limitUrlUpdates: { method, timeMs }`
- **Chapter 06 was re-scoped to avoid a #7 violation.** The item's brief — "why do signals work, why has
  React not adopted them" — is already answered in depth by `#ch-reactivity-compared` (#38's chapter 02),
  which argues it as a *rendering* question. Chapter 06 therefore takes signals as a **state-container**
  primitive: the three primitives, glitch-free propagation, laziness, the TC39 proposal and its
  interoperability motive, and the section's sharpest point — signals cover exactly one of the four
  categories and do nothing for server state. React's reason for declining gets one paragraph and a
  cross-reference rather than a second telling
- Three further duplication boundaries. Chapter 02 defers server-side caching to `#ch-nextjs-data-and-caching`
  and `#ch-caching`. Chapter 04 keeps *where validation lives* and the draft lifecycle, deferring submit
  mechanics to `#ch-react-actions-and-forms`, `#ch-server-actions` and `#ch-sveltekit-form-actions`, and
  server-side revalidation to `#ch-backend-input-validation`. Chapter 05 defers canonical URLs and variant
  indexing to #39's `#ch-seo-and-rendering`
- Forward `[Chapter ?? — …]` references in `StateManagement/` total **28 across chapters 01–06**, for #70
  to number
- `pnpm lint:docs`: 237 → **243 files** (six added, one deleted), six rules at zero, the one violation still
  Part IV's pre-existing +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 41. Write `Tooling/` chapters 01–06 `M` — ✅ **done 2026-09-07**

Research finding: Vite is at 98% usage; raw Webpack config has fallen to near zero; complexity is "the loser".

| #   | Chapter                      | Must cover                                                |
| --- | ---------------------------- | --------------------------------------------------------- |
| 01  | Modules and bundling         | ESM, tree shaking, code splitting, what a bundler does     |
| 02  | Vite and the dev loop        | Dev server vs build, HMR, plugin model                     |
| 03  | Turbopack, Rspack, Rolldown  | The Rust-based generation and why it happened              |
| 04  | Monorepos                    | pnpm workspaces, Turborepo, task graphs, when _not_ to     |
| 05  | Type-checking and linting at scale | `tsc --build`, project references, Biome vs ESLint, CI gates |
| 06  | Package management           | pnpm vs npm vs yarn, lockfiles, supply-chain safety        |

**Done when:** all six chapters exist under `Frontend/ModernStack/Tooling/`, each passes the Book Chapter
Standard (six blocks in order, 150–400 lines, no relative links in the body), `pnpm lint:docs` shows no
rule regressed, and the section README links them. _Line added at #41, per #38's note._

**Delivered:**

- Six chapters, **1,281 lines** — `01-modules-and-bundling.md` (215), `02-vite-and-the-dev-loop.md` (208),
  `03-rust-bundlers.md` (187), `04-monorepos.md` (240), `05-type-checking-and-linting.md` (210),
  `06-package-management.md` (221). All in the 150–400 band, all seven `##` headings in order, no `####`,
  no relative links in a body, ⚠️ callouts at 0–2 per chapter against a budget of 3
- Slugs: `modules-and-bundling`, `vite-and-the-dev-loop`, `rust-bundlers`, `monorepos`,
  `type-checking-and-linting`, `package-management`
- **Research changed the substance of three chapters, not just the version numbers.** **Vite 8 ships
  Rolldown as its single bundler**, replacing the esbuild-in-dev / Rollup-in-build split — so the familiar
  "dev and build use different bundlers, hence the interop bugs" explanation is now *history*, and chapter
  02 carries it as a moving-target callout rather than as current fact. **pnpm no longer runs dependency
  build scripts by default**, and pnpm 11 replaced `onlyBuiltDependencies` with `allowBuilds`; with
  `minimumReleaseAge`, this is the strongest supply-chain material in the book and chapter 06 leads on it.
  **Turborepo v2 uses `tasks`, not `pipeline`**, and the `env` versus `passThroughEnv` split got its own
  section in chapter 04 because getting it wrong is how a staging build gets served from a production
  cache. Also confirmed: Turbopack is the Next.js 16 default with stable on-disk dev caching, and the
  TypeScript Go port is real and heading for TypeScript 7
- **Chapter 03's thesis is that the three Rust bundlers differ by which ecosystem they preserve** — Rspack
  keeps Webpack configuration, Rolldown keeps Rollup plugins, Turbopack is built into Next.js — not by
  throughput, and that you normally inherit one by choosing a framework. It also carries the point that
  SWC, Oxc and esbuild *strip* types without checking them, which is the setup for chapter 05
- **Chapter 04 was re-scoped to avoid a #7 violation.** The item's "when *not* to" line is already answered
  in full by `#ch-repository-strategies` (ShipAndOperate/Git), which owns the monorepo-versus-polyrepo
  decision with its own decision table. Chapter 04 therefore starts one step later — you have a monorepo,
  now make it cheap — and covers the two graphs, cache-key composition, affected-only runs and publishing,
  deferring the choice itself with a cross-reference in the opening paragraph
- Two further duplication boundaries. Chapter 01 keeps *what a bundler is* — the four steps, `exports`
  resolution, the graph, chunking as partitioning, source maps — and defers tree shaking, minification and
  compression to `#ch-bundle-optimisation` and splitting technique to `#ch-code-splitting`, both Part IV,
  which is already +1,149 over budget. Chapter 05 defers the type patterns themselves to
  `#ch-react-typescript-at-scale`
- **Anchor correction worth carrying forward.** Three Part IV and Part VI files have front-matter slugs
  that do not match their H1 anchors — `bundle-optimization` versus `{#ch-bundle-optimisation}`,
  `image-optimization` versus `{#ch-image-optimisation}`, `frontend-architecture` versus
  `{#ch-frontend-architecture-patterns}`. The new chapters link to the **H1 anchors**, which resolve.
  Chapters from #35–37 link to the slugs, which do not: **9 unresolved `#ch-` references remain repo-wide,
  all pre-existing, for #70 to reconcile**
- Forward `[Chapter ?? — …]` references in `Tooling/` total **25 across chapters 01–06**, for #70 to number
- **Part III is complete at 46 chapters.** `Frontend/ModernStack/README.md`'s "being written" note is
  replaced by a statement of what shipped, and `Archive/salvage/frontend/` now holds only its README
- `pnpm lint:docs`: 243 → **249 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,149. **`.lint-baseline.json` unchanged**

---

### - [x] 42. Move frontend architecture out of SystemDesign into Part IV `M` — ✅ **done 2026-09-07**

`SystemDesign/Frontend/` has 12 files at ~200 lines each. Several belong beside the new stack chapters:

| File                       | Action                                                 |
| -------------------------- | ------------------------------------------------------ |
| `02-state-management.md`   | Absorbed by item 40                                    |
| `03-rendering.md`          | Absorbed by item 39                                    |
| `01-architecture.md`, `05-micro-frontends.md`, `08-design-systems.md` | Move → new `Frontend/Architecture/` (Part IV) |
| `04-performance.md`, `09-assets.md`, `12-monitoring.md` | Merge into `Frontend/WebPerformance/`  |
| `00-interview-strategy.md`, `06`, `07`, `10`, `11` | Stay as frontend system design (Part VI) |

> **Amended at #31d.** `02-state-management.md` and `03-rendering.md` are already out of the section —
> they are staged in `Archive/salvage/frontend/` with `in_book: false`, waiting for #39 and #40. Two
> consequences for this item. The directory now has **11 files numbered 00–12 with gaps at 02 and 03**,
> so this item's move should renumber the survivors contiguously. And the six files
> `PART_OVERRIDES` in `scripts/lib/book.ts` already counts against Part IV — `01`, `04`, `05`, `08`, `09`,
> `12` — must have their override entries **deleted** as they move, or they will be double-counted once
> their paths change. Four of the five stayers (`00`, `07`, `10`, `11`) still predate the Book Chapter
> Standard; #31d left them deliberately, and this item or #70 has to convert them.

**Done when:** each file lives in exactly one part with no duplicated content.

**Delivered:**

- **`Frontend/Architecture/` created** (Part IV, `PART_BY_PREFIX` already mapped it) with three chapters
  moved out of `SystemDesign/Frontend/` and **rewritten to the Book Chapter Standard** — all six blocks,
  Key Takeaways, Interview Questions, What to Read Next, no `[← Back to]` footer, `## 💡 The Core Idea`
  in place of the old `## 💡 **Concept**`. `01-architecture.md` → `01-frontend-architecture-patterns.md`,
  `05-micro-frontends.md` → `02-micro-frontends.md`, `08-design-systems.md` → `03-design-systems.md`.
  Numbering matches **#55**'s table, leaving `04` and `05` free for the two chapters it adds
- **A #7 violation fixed inside the move.** Old `01-architecture.md` carried a "Micro-Frontend
  Architecture" section with its own Module Federation config, duplicating `05-micro-frontends.md`
  near-verbatim. Chapter 01 now keeps micro-frontends as one row in its decision table and
  cross-references `#ch-micro-frontends`
- **Two slug/anchor mismatches cleared.** `01`'s front matter said `frontend-architecture` while its H1
  said `{#ch-frontend-architecture-patterns}`; `08`'s said `frontend-design-systems` against
  `{#ch-design-systems-at-scale}`. Both now agree, and the one inbound reference (from
  `StateManagement/01`) still resolves. **12 slug/anchor mismatches remain repo-wide**, all
  pre-existing, for #70
- **`04-performance.md` archived rather than merged**, to `Archive/systemdesign/frontend/`. Every one of
  its sections duplicated a `Frontend/WebPerformance/` chapter — the Core Web Vitals table, LCP, INP and
  CLS (01), code splitting (03), caching headers (04), images (05), bundle size (06). It was a summary
  of the section it sat beside, with zero inbound references. −216 lines from Part IV
- **`09-assets.md` merged as `Frontend/WebPerformance/09-font-and-css-delivery.md`**, rescoped to the
  half that was not already in the section: `font-display` and the FOIT/FOUT trade, `unicode-range`
  subsetting, preload and why `crossorigin` is mandatory, metric-override fallback faces, critical CSS
  and `cssCodeSplit`, and icon delivery. Its images and CDN halves were dropped as duplicates of
  chapters 05 and 04
- **`12-monitoring.md` merged as `Frontend/WebPerformance/10-error-tracking.md`**, rescoped to the four
  capture points, the context that makes a report actionable, redaction in `beforeSend`, sampling
  policy, and crash-free sessions as the frontend SLO. Its RUM/`web-vitals` half duplicated chapter 07
  and its alerting rules duplicated `#ch-alerting` in Part VIII; both are now cross-references
- **One inbound reference retargeted.** `React/10-error-boundaries.md` pointed at
  `#ch-frontend-monitoring`; it now points at `#ch-frontend-error-tracking`. A reciprocal reference was
  added from `NextJS/06-images-fonts-and-assets.md` to `#ch-font-and-css-delivery`, because that chapter
  owns the `next/font` wrapper and the new chapter owns the platform mechanics underneath it — the
  `next/font` code sample was cut from the new chapter to keep that boundary clean
- **The five survivors renumbered contiguously `01`–`05`**: interview strategy, real-time, offline-first,
  SEO and analytics, auth. The old `00-` prefix is gone, which also matches every other section in the
  repo — `SystemDesign/Fundamentals/01-driving-the-round.md` is the equivalent lead-in chapter and is
  numbered 01
- **All six `PART_OVERRIDES` entries deleted** from `scripts/lib/book.ts`; the map is now empty with a
  comment saying why, so nothing is double-counted
- **Four READMEs updated and one written.** New `Frontend/Architecture/README.md`;
  `SystemDesign/Frontend/README.md` rebuilt (its old chapter table and reading order both referenced
  `02` and `03`, gone since #31d); `Frontend/WebPerformance/README.md` gains rows 09 and 10;
  `Frontend/README.md` gains `Architecture/` in the Part IV row and its "for frontend system design, see
  `SystemDesign/Frontend/`" paragraph corrected
- **`Archive/salvage/frontend/` removed**, as its own README invited once the section had moved.
  `Archive/salvage/README.md` and `Archive/README.md` updated, and
  `Archive/systemdesign/frontend/README.md` written as the record of where all twelve files went
- `pnpm lint:docs`: **249 files, six rules at zero.** Part IV **6,649 → 6,581 (+1,081)**;
  `.lint-baseline.json` budget lowered **1149 → 1081**. Unresolved `#ch-` references unchanged at **9**,
  all pre-existing

> 🔴 **Correction for #43 — #42 frees no Part VI lines, and #31d's arithmetic for #43 was wrong.** #31d
> predicted this item would remove "roughly 410 more" from Part VI, leaving ~5,930 and giving #43 about
> 570 lines. It does not, and could not: `PART_OVERRIDES` already counted all six moved files against
> **Part IV**, not Part VI. Part VI went **6,345 → 6,337** — eight lines, from stripped footers. So #43's
> real headroom is **163 lines**, not 570. Four frontend studies at ~220 (880) therefore needs roughly
> **720 lines cut from the backend studies**, not the single study #31d costed. #43's note has been
> amended.

⚠️ **Not done, and still unowned: the four pre-standard survivors.** `01-interview-strategy`,
`03-offline-first`, `04-seo-analytics` and `05-auth` still have no six blocks, no Key Takeaways, no
Interview Questions and no What to Read Next. This item stripped their `[← Back to SystemDesign]`
footers — the standard forbids them and #71 would have swept them anyway — which leaves
`01-interview-strategy` at **145 lines**, five under the chapter floor rather than the two #31d recorded.
Converting all four is a session of writing, not a tail-end of this one. #70 is *numbering*, not
conversion, so it cannot absorb this: a note has been added under #70 naming it explicitly.

---

### - [x] 43. Add frontend system design case studies `M` — ✅ **done 2026-09-07**

Part VI currently has 20 backend case studies and zero frontend ones. Add 5, matching what 2026–27
frontend system design rounds actually ask:

1. **Design a collaborative document editor** — CRDT vs OT, offline edits, undo in a shared doc
2. **Design an autocomplete/typeahead component** — debouncing, caching, cancellation, a11y, keyboard nav
3. **Design an infinite feed** — virtualisation, pagination, image loading, restoring scroll position
4. **Design a design system for 40 teams** — versioning, theming, breaking changes, adoption
5. **Design a dashboard with 50 live widgets** — data fan-in, WebSocket vs SSE vs polling, render budget

Each follows RADIO and stays 250–350 lines.

> 🔴 **Amended at #31d, and re-costed at #42 — the length is not affordable and the count has to change.**
> Part VI stands at **6,337** lines against a 6,500 ceiling, so this item has **163 lines**, not the
> 1,250–1,750 that five studies at 250–350 need. #31d put the figure at ~570 on the assumption that #42
> would free another ~410 from Part VI; **it did not, because `PART_OVERRIDES` already counted those six
> files against Part IV.** The recommendation still stands — **four frontend studies at ~220 lines each
> (880)** — but paying for it now means cutting roughly **720 lines of backend studies (three of the
> four), not one**, ending at 1 backend + 4 frontend and roughly 6,300 lines. Weigh that against cutting
> to three frontend studies (660) and two backend, which is the cheaper trade. Drop the typeahead or the infinite feed — the feed
> overlaps `CaseStudies/02-news-feed.md` and the typeahead overlaps `BuildingBlocks/05-search.md`, so
> either can go without leaving a gap. The alternative is to cut two backend studies and keep all five.
> **Do not write five at 250–350; it puts Part VI ~1,200 lines over and breaks the budget #31d just met.**
>
> Follow the six blocks, with RADIO inside `## How It Works` — that is the shape the four surviving
> backend studies now use, and it closed the conversion debt #28 logged.

**Done when:** Part VI holds frontend case studies alongside the backend ones, each following the six
blocks with RADIO inside `## How It Works`; `pnpm lint:docs` shows no rule above `.lint-baseline.json`,
which means **Part VI is at or under 6,500 lines**; the section README and the Part VI opener list the
real chapters; and no live chapter points at an archived one.

**Delivered:**

- **Three frontend case studies written**, not five, at Part VI's own budget rate of ~191 lines rather
  than the 250–350 the item asked for: `03-collaborative-editor.md` (195),
  `04-infinite-feed.md` (189), `05-live-dashboard.md` (193). Six blocks each, RADIO inside
  `## How It Works`, TypeScript-only fences, one mermaid diagram each with a caption
- **The two dropped studies, and why.** _Typeahead_ — `BuildingBlocks/05-search.md` already teaches the
  shape, and an archived `21-typeahead.md` still exists for rehearsal. _Design system for 40 teams_ —
  #42 created `Frontend/Architecture/03-design-systems.md` (`design-systems-at-scale`), which covers
  versioning, theming, breaking changes and adoption. Neither leaves a gap; the #42 note had not seen
  the second overlap, because the chapter that creates it was written by #42 itself
- **Two backend studies archived to pay for it** — `02-news-feed.md` and `03-chat-system.md` →
  `Archive/systemdesign/case-studies/26-` and `27-`. Both were the most duplicated of the four: fan-out
  is `BuildingBlocks/04-queues-and-async.md`, and the stateful edge is `BuildingBlocks/06-websockets.md`
  plus `SystemDesign/Frontend/02-real-time.md`. `04-ticketmaster.md` renumbered to `02-`. The section
  ends at **2 backend + 3 frontend**, which is the "cheaper trade" the #42 note recommended
- **Three dangling cross-references repointed** as a result — `BuildingBlocks/04` → `#ch-design-infinite-feed`,
  `BuildingBlocks/06` and `SystemDesign/Frontend/02` → `#ch-design-live-dashboard`
- **`SystemDesign/CaseStudies/README.md` rewritten** and the Part VI opener corrected: its Sections table
  claimed 13 frontend chapters (there are 5) and 4 case studies, and its opening paragraph still
  advertised the typeahead and the design system as forthcoming. Empty leftover `SystemDesign/Microservices/`
  removed — #31d emptied it and left the directory
- `pnpm lint:docs`: **250 files, six rules at zero**, budget count unchanged at **1,081** (Part IV only).
  Part VI **6,337 → 6,499** against its 6,500 ceiling

> ⚠️ **Part VI now has one line of headroom, and #70 needs about 200.** 6,499 of 6,500. Converting the
> four pre-standard `SystemDesign/Frontend/` chapters — the job #42 handed to #70 — adds the six blocks to
> each, which is roughly 50 lines apiece; #70's own note guesses this *returns* 40 lines to Part VI, and
> that is the wrong sign. There is nowhere in Part VI left to pay from at chapter granularity: the two
> longest survivors, `CaseStudies/01-url-shortener.md` (226) and `02-ticketmaster.md` (218), are together
> only 63 lines above the part's 191-line rate. **Either #76's editorial trim runs across Part VI before
> #70's conversion, or Part VI's ceiling is raised and paid for out of Part IX**, which is at 1,999
> against 2,500 — the only slack outside Parts I–IV, and the only move BOOK-SPEC § 5's amendment rule
> permits. A note has been added under #70.
>
> **BOOK-SPEC § "Part VI" is now stale in two places** and #77 or #76 should correct it: it says the case
> studies are "cut to ten and joined by five frontend ones". They are two and three.

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

### - [x] 44. Scaffold `AI/` and write the part opener `S` — ✅ **done 2026-09-07**

The opener must set the frame: **this part is for engineers who build AI features, not for ML engineers.**
No model training, no CUDA, no PyTorch. TypeScript throughout, consistent with the rest of the book.

**Done when:** `AI/` exists with the part opener and all six section indexes, each listing its planned
chapters and naming the item that writes them; `README.md` (repo root) links at `AI/` instead of saying
"nothing yet"; and `pnpm lint:docs` shows no rule regressed.

**Delivered:**

- `AI/` created with all six subdirectories and **seven READMEs, 440 lines** — the Part VII opener plus
  `Foundations/`, `Integration/`, `RAG/`, `Agents/`, `Production/`, `AIUX/`. Part VII goes from 0 to 440
  of its 7,500-line budget. Naming follows the `ModernStack/` precedent: the opener is `Part VII — AI
  Engineering`, the six below it take bare titles
- All 31 planned chapters listed across the six section tables with a "what it answers" column, matching
  #45–#50 exactly. **Titles are plain text, not links** — the files do not exist, and neither a relative
  path nor a `#ch-` anchor to a missing chapter should be written yet. Each table carries a ⚠️ note naming
  the item that fills it, and `Foundations/` and `Production/` name the two salvage files they absorb
- Each section index also carries its own **What Interviewers Probe For** and **Reading Order**, so the
  scaffold is readable as a part rather than as six stubs
- **Context7 checked before writing.** Version-stamped **AI SDK 7** and **MCP revision 2025-11-25**, with
  a moving-target callout in the opener and a second in `Integration/` naming both
- `README.md` (repo root): the Part VII row now links at `AI/README.md`; the "two holes in the hull"
  section says *almost* no AI content and points at #45–53; the layout tree gains `AI/`
- `pnpm lint:docs`: 250 → **257 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

> 🔴 **Two corrections this item forced on the plan.**
>
> 1. **#45 and #49 name a path that no longer exists.** Both say to salvage from `DevOps/GenAI/` —
>    `06-prompt-engineering.md` into `Foundations/03`, `07-security.md` into `Production/05`–`06`. `DevOps/`
>    was renamed at #20 and the section archived at #21; the two files were staged at
>    **`Archive/salvage/ai/`** and that is where they are. Both items' notes have been corrected.
> 2. **#51's chapter had no home in the target structure.** The tree at the head of Phase 4 lists six
>    sections and no place for the interview chapter, and #49's Production is fixed at 01–06. It is placed
>    at the **root of `AI/`** as the part's closing chapter, introduced in the opener; #70 assigns its
>    number, which is what puts it last.

⚠️ **Part openers do not sort first, and #70 owns it.** `orderDocs` in `scripts/lib/book.ts` breaks a tie
between two `chapter: 0` files by path, so `AI/Agents/README.md` precedes `AI/README.md` — Part III has
had the same problem since #32, where `ModernStack/NextJS/README.md` currently opens the part. Nothing is
lost and nothing errors; the built book simply reads in the wrong order. #70 sets real `chapter` numbers
for every in-book file, which fixes it as a side effect — a note has been added there.

⚠️ **Half of #52 is already done.** #52's "Done when" is that the Part VII opener introduces the running
project and each section extends it. The opener introduces it — a documentation assistant — because
BOOK-SPEC § Part VII commits to it and an opener that omitted it would be wrong on delivery. The second
half, each section actually extending it, is untouched and is still #52's.

---

### - [x] 45. Write `AI/Foundations/` 01–05 `M` — ✅ **done 2026-09-07**

| #   | Chapter                     | Must cover                                                     |
| --- | --------------------------- | -------------------------------------------------------------- |
| 01  | How LLMs behave             | Tokens, context windows, temperature, sampling, non-determinism — the mental model, no maths |
| 02  | Choosing a model            | Capability vs latency vs cost, frontier vs small models, routing, when a smaller model wins |
| 03  | Prompting as engineering    | System vs user prompts, few-shot, structure, versioning prompts like code |
| 04  | Embeddings and similarity   | What a vector is, cosine similarity, when embeddings beat keyword search |
| 05  | Context engineering         | The 2026 reframe of "prompt engineering" — what goes in the window and what gets cut |

> Salvage `Archive/salvage/ai/06-prompt-engineering.md` into chapter 03. ⚠️ **Path corrected at #44** —
> `DevOps/` was renamed at #20 and the section archived at #21; the file is staged under `Archive/salvage/ai/`.

**Done when:** all five chapters exist under `AI/Foundations/`, each passes the Book Chapter Standard (six
blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs`
shows no rule regressed, the section README links them, and the staged salvage file is removed.

**Delivered:**

- Five chapters, **1,008 lines** — `01-how-llms-behave.md` (192), `02-choosing-a-model.md` (184),
  `03-prompting-as-engineering.md` (231), `04-embeddings-and-similarity.md` (195),
  `05-context-engineering.md` (206). Part VII **440 → 1,446** of its 7,500-line budget. Figures are the
  build's own count from `scripts/lib/book.ts`, which is what the budget rule reads — it runs one higher
  than `wc -l` per file
- **Context7 checked before writing.** The chapters are version-stamped against **AI SDK 7**, and one v7
  change is load-bearing rather than cosmetic: the system prompt moved to an `instructions` property and
  system messages inside `messages` are rejected by default — chapter 03 shows the current shape and
  carries a moving-target callout. Chapter 04's `embed` / `embedMany` / `cosineSimilarity` example is the
  current `ai` package surface
- **The dated-prior trap in chapter 01 is called out rather than repeated.** Several 2026 frontier models
  have removed `temperature` and `top_p` outright and reject requests that send them, exposing a reasoning
  effort control instead. The chapter teaches sampling as the mechanism, shows the parameter, and says in a
  moving-target callout that the knob's name and existence move — a chapter that simply said "tune
  temperature" would already be wrong on some providers
- **Salvage absorbed and retired.** `Archive/salvage/ai/06-prompt-engineering.md` is `git rm`-ed and its
  row struck from `Archive/salvage/README.md`, which now records what survived the re-scope: constraints
  over politeness, permitting uncertainty, one example beating a paragraph, withholding your theory when
  debugging, and conventions belonging in a file. The DevOps-specific half — Terraform, IAM wildcards,
  `kubectl` triage — did not survive, because it is about *using* AI tools rather than *building* AI
  features, which is the line #21 drew. Only `ai/07-security.md` is still staged, for #49
- `AI/Foundations/README.md` now links all five chapters by `#ch-` anchor and its "planned, not written"
  note is gone; the Part VII opener's closing note names `Foundations/` as written
- `pnpm lint:docs`: 257 → **262 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**. `pnpm book:collect`: 262 files, 52,214 lines

> 🔴 **Two cross-reference corrections, one of them mine from #43.** An anchor audit written for this item
> found that `Frontend/WebPerformance/05` and `08` carry **British** H1 anchors — `#ch-image-optimisation`,
> `#ch-rendering-optimisation` — against **American** front-matter slugs, which is two of the twelve
> mismatches #70 owns. #43's two new case studies had linked the slug spelling, so those three references
> resolved to nothing; they now use the anchors that exist. #70 still owns reconciling slug and anchor.
>
> **Unresolved `#ch-` references are now 17 distinct, up from 8.** Eight are pre-existing and dead (they
> point at chapters #31f archived, or at front matter that does not exist yet). **Seven are new and will
> resolve on their own** — `ch-evals`, `ch-cost-engineering`, `ch-prompt-injection`, `ch-retrieval`,
> `ch-ingestion-and-chunking`, `ch-vector-stores`, `ch-structured-output` — because they are forward links
> into Part VII chapters that #46–#49 write. They are deliberate: a Foundations chapter that did not point
> forward at retrieval or evals would be less useful than one that does. #70's audit should separate the
> two categories rather than treating the count as one number.

---

### - [x] 46. Write `AI/Integration/` 01–06 — the full stack engineer's core `L` — ✅ **done 2026-09-07**

This is the section your reader will use at work on Monday. Use **Context7 MCP** for current SDK APIs.

| #   | Chapter                       | Must cover                                                    |
| --- | ----------------------------- | ------------------------------------------------------------- |
| 01  | Calling an LLM from TypeScript| Provider SDKs, the unified-SDK approach, error/timeout handling |
| 02  | Streaming responses           | SSE, backpressure, cancellation, partial rendering             |
| 03  | Structured output             | Schema-constrained generation, Zod validation, repair loops     |
| 04  | Tool calling                  | Defining tools, the call loop, parallel calls, failure handling |
| 05  | MCP (Model Context Protocol)  | What it standardises, servers vs clients, when to build one     |
| 06  | Multi-provider architecture   | Gateways, failover, cost routing, avoiding vendor lock-in       |

**Done when:** all six chapters exist under `AI/Integration/`, each passes the Book Chapter Standard (six
blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs`
shows no rule regressed, and the section README links them.

**Delivered:**

- Six chapters, **1,297 lines** — `01-calling-an-llm-from-typescript.md` (220),
  `02-streaming-responses.md` (204), `03-structured-output.md` (216), `04-tool-calling.md` (231),
  `05-model-context-protocol.md` (218), `06-multi-provider-architecture.md` (208). Part VII
  **1,446 → 2,750** of its 7,500-line budget
- **Context7 checked before writing**, three queries against `/vercel/ai`. Three v7 surfaces are
  load-bearing rather than cosmetic: structured output is `Output.object({ schema })` on `generateText` /
  `streamText` rather than a separate `generateObject` call, the tool loop bounds on
  `stopWhen: isStepCount(n)`, and the MCP client is `createMCPClient` from `@ai-sdk/mcp` with `type: 'http'`
  streamable transport — SSE is legacy. Each chapter carries a moving-target callout naming the durable
  principle underneath
- **`ch-structured-output` now resolves.** It was one of the seven forward links #45 left open. The other
  six (`ch-evals`, `ch-cost-engineering`, `ch-prompt-injection`, `ch-retrieval`, `ch-ingestion-and-chunking`,
  `ch-vector-stores`) are still forward links, and #47 and #49 close them
- `AI/Integration/README.md` links all six by `#ch-` anchor, its "planned, not written" note is replaced
  by a version stamp
- `pnpm lint:docs`: 262 → **268 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**. `pnpm book:collect`: 268 files, 53,518 lines

> ⚠️ **The security boundary is stated in three chapters and owned by one.** `04-tool-calling` puts
> authorisation in the dispatcher, `05-model-context-protocol` names tool descriptions as untrusted prompt
> text, and both forward-link `#ch-prompt-injection`. #49 writes that chapter and should treat these two as
> the setup rather than restating them.

---

### - [x] 47. Write `AI/RAG/` 01–05 `M` — ✅ **done 2026-09-07**

Research finding: RAG is the most widely deployed enterprise LLM pattern, and the gap between a tutorial
RAG engineer and a production one is **retrieval evaluation**.

| #   | Chapter                    | Must cover                                                  |
| --- | -------------------------- | ----------------------------------------------------------- |
| 01  | When RAG, when fine-tune, when neither | The decision most teams get wrong                |
| 02  | Ingestion and chunking     | Chunk size, overlap, structure-aware splitting, metadata      |
| 03  | Retrieval                  | Vector vs keyword vs hybrid, reranking, filters               |
| 04  | Vector stores              | pgvector vs dedicated stores, index types, the operational cost |
| 05  | Evaluating retrieval       | Recall@k, golden sets, why "the answer was wrong" is usually a retrieval bug |

**Done when:** all five chapters exist under `AI/RAG/`, each passes the Book Chapter Standard (six blocks
in order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs` shows no
rule regressed, and the section README links them.

**Delivered:**

- Five chapters, **1,085 lines** — `01-when-rag-when-fine-tune-when-neither.md` (195),
  `02-ingestion-and-chunking.md` (236), `03-retrieval.md` (222), `04-vector-stores.md` (206),
  `05-evaluating-retrieval.md` (226). Part VII **2,750 → 3,839** of its 7,500-line budget
- **Three of #45's seven forward links now resolve** — `ch-retrieval`, `ch-ingestion-and-chunking`,
  `ch-vector-stores`. The remaining three (`ch-evals`, `ch-cost-engineering`, `ch-prompt-injection`) are
  #49's
- **Chapter 01 answers "neither" honestly**, which the item's framing invited but did not require: a corpus
  of a few hundred pages fits in a cached window, and building an ingestion pipeline for it is the most
  common over-engineering in this part of the stack. The chapter ranks four options by cost and tells the
  reader to stop at the first that works
- **Chapter 04 carries one SQL fence**, the pgvector schema and query. `sql` is on the Book Chapter
  Standard allow-list; the rule is TypeScript for *code*, and a schema is not TypeScript in any honest
  rendering. Every other fence in the section is TypeScript or mermaid
- `AI/RAG/README.md` links all five by `#ch-` anchor and its "planned, not written" note is gone
- `pnpm lint:docs`: 268 → **273 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

---

### - [x] 48. Write `AI/Agents/` 01–05 `M` — ✅ **done 2026-09-07**

| #   | Chapter                       | Must cover                                                 |
| --- | ----------------------------- | ---------------------------------------------------------- |
| 01  | What an agent actually is     | The loop: model → tool → observation → model. Nothing mystical |
| 02  | Designing the tool surface    | Granularity, naming, descriptions as prompts, error messages the model can act on |
| 03  | Memory and state             | Short-term context, summarisation, persistent memory, checkpointing |
| 04  | Durability and long-running work | Retries, resumption, human-in-the-loop approval gates    |
| 05  | Multi-agent patterns          | Orchestrator/worker, when a single agent is genuinely better |

**Done when:** all five chapters exist under `AI/Agents/`, each passes the Book Chapter Standard (six
blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs`
shows no rule regressed, and the section README links them.

**Delivered:**

- Five chapters, **1,097 lines** — `01-what-an-agent-actually-is.md` (218),
  `02-designing-the-tool-surface.md` (218), `03-memory-and-state.md` (214),
  `04-durability-and-long-running-work.md` (223), `05-multi-agent-patterns.md` (224). Part VII
  **3,839 → 4,940** of its 7,500-line budget
- **The section's ordering note held.** `AI/Agents/README.md` said 01 and 02 depend on `Integration/04`;
  that chapter landed at #46, so both link `#ch-tool-calling` and neither restates the loop mechanics
- **Chapter 05 argues against the item's own framing, deliberately.** The plan asked for orchestrator /
  worker and "when a single agent is genuinely better". The chapter names the only two things splitting
  buys — context isolation and parallelism — and reclassifies reviewer, router and specialist agents as
  patterns that should not be agents at all. That is the senior signal the section index promised
- `AI/Agents/README.md` links all five by `#ch-` anchor and its "planned, not written" note is gone
- `pnpm lint:docs`: 273 → **278 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

> ⚠️ **Four new forward links, all owned by #49** — `ch-evals`, `ch-observability`, `ch-cost-engineering`
> and `ch-prompt-injection`. `ch-observability` is new here; the other three were already outstanding from
> #45 and #46. All four resolve when #49 lands.

---

### - [x] 49. Write `AI/Production/` 01–06 — the section that sets the book apart `L` — ✅ **done 2026-09-07**

| #   | Chapter                   | Must cover                                                       |
| --- | ------------------------- | ---------------------------------------------------------------- |
| 01  | Evals                     | Golden datasets, LLM-as-judge, regression suites, CI for prompts — **the most under-taught senior skill** |
| 02  | Error analysis loops      | Reading traces, categorising failures, the improve-measure cycle   |
| 03  | Observability             | Tracing spans, token accounting, latency budgets, what to log (and what never to) |
| 04  | Cost engineering          | Prompt caching, model routing, batching, streaming perceived-latency wins |
| 05  | Guardrails and safety     | Input/output filtering, refusal handling, PII, tool permissioning   |
| 06  | Prompt injection          | Direct and indirect, why it is the #1 AI security issue, defence in depth |

> Salvage `Archive/salvage/ai/07-security.md` into chapters 05–06. ⚠️ **Path corrected at #44** —
> `DevOps/` was renamed at #20 and the section archived at #21; the file is staged under `Archive/salvage/ai/`.

**Done when:** all six chapters exist under `AI/Production/`, each passes the Book Chapter Standard (six
blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs`
shows no rule regressed, the section README links them, and the staged salvage file is removed.

**Delivered:**

- Six chapters, **1,283 lines** — `01-evals.md` (203), `02-error-analysis-loops.md` (198),
  `03-observability.md` (214), `04-cost-engineering.md` (217), `05-guardrails-and-safety.md` (233),
  `06-prompt-injection.md` (218). Part VII **4,940 → 6,226** of its 7,500-line budget
- **All remaining forward links from #45, #46 and #48 now resolve** — `ch-evals`, `ch-cost-engineering`,
  `ch-prompt-injection` and `ch-observability`. Part VII's internal cross-references are complete except
  for the four that point into `AIUX/` (#50) and the interview chapter (#51)
- **Salvage absorbed and retired.** `Archive/salvage/ai/07-security.md` is `git rm`-ed. What survived the
  re-scope: three risk boundaries rather than one, the data-egress decision being architectural rather
  than a filter, an agent with real permissions as a privileged principal, the untrusted-content source
  table, and the sentence 06 turns on — there is no reliable way to make a model ignore injected
  instructions, so constrain what success achieves. What did not: Amazon Q agent configuration, Bedrock
  as the named answer, Terraform state as the leak example, and the "different review process for
  AI-generated code" material, all of which is about *using* AI coding tools rather than *building* AI
  features. `Archive/salvage/README.md` records both halves and its staged table is now empty;
  `Archive/salvage/ai/README.md` is rewritten as a record so the inbound references from
  `Archive/README.md` still resolve
- **Chapter 06 leads with the lethal trifecta** — private data, untrusted content, an outward channel —
  because it is the framing that turns a vague worry into a design-review checklist, and it names the
  third leg as the one usually added last by someone improving a feature
- `AI/Production/README.md` links all six by `#ch-` anchor and its "planned, not written" note is gone
- `pnpm lint:docs`: 278 → **284 files**, six rules at zero, the one violation still Part IV's
  pre-existing +1,081. **`.lint-baseline.json` unchanged**

> ⚠️ **Part VII's budget is now the binding constraint.** 6,226 of 7,500 lines used with #50 (4 chapters),
> #51 (1 chapter) and #52's running-project extensions still to come. At the section's ~215-line average
> that is roughly 1,075 lines of chapters plus #52, against 1,274 remaining. #50 and #51 should target
> **~195 lines**, not the book-wide ~220, or Part VII becomes the second part over budget.

---

### - [x] 50. Write `AI/AIUX/` 01–04 — the frontend-heavy angle `M` — ✅ **done 2026-09-07**

**This is the section only a frontend-heavy author can write well.** It is your book's edge over the
AI-engineering books written by backend and ML people.

| #   | Chapter                      | Must cover                                                     |
| --- | ---------------------------- | -------------------------------------------------------------- |
| 01  | Designing for latency        | Streaming, skeletons, optimistic UI, why the first token matters more than the last |
| 02  | Generative UI                | Rendering components from model output, safety boundaries, hydration |
| 03  | Trust and correctness UX     | Citations, confidence, edit-before-accept, undo, showing the model's work |
| 04  | Failure states               | Refusals, timeouts, partial answers, rate limits — designing the unhappy path |

**Done when:** all four chapters exist under `AI/AIUX/`, each passes the Book Chapter Standard (six
blocks in order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs`
shows no rule regressed, and the section README links them.

**Delivered:**

- Four chapters, **794 lines** — `01-designing-for-latency.md` (187), `02-generative-ui.md` (208),
  `03-trust-and-correctness-ux.md` (202), `04-failure-states.md` (197). Part VII **6,226 → 7,022** of its
  7,500-line budget. Deliberately written at **~198 lines** rather than the book-wide ~220, per the budget
  note added at #49
- **Every `#ch-` reference in `AI/` now resolves.** An audit of all 31 written files against every `slug:`
  in the repo returns zero unresolved anchors — the seven forward links #45 opened are closed, and so are
  the four #46 and #48 added. Part VII is internally complete
- **02 and 03 carry the security argument into the frontend**, which is what makes this section the one
  only a frontend author writes. A model-supplied `src` or `href` is the third leg of `Production/06`'s
  lethal trifecta added by a rendering decision; the fix — emit a chunk id, resolve it server-side — is
  also the citation-verification control from `Production/05`, so one pattern does correctness and
  security at once
- **04 argues the unhappy path is most of the engineering**, not the polish stage, because refusal and
  empty retrieval are daily traffic in a scoped assistant. It also names the truncation trap explicitly:
  `finishReason: 'length'` arrives with HTTP 200, so a half sentence renders as a finished answer
- `AI/AIUX/README.md` links all four by `#ch-` anchor and its "planned, not written" note is gone
- `pnpm lint:docs`: 284 → **288 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

> 🔴 **Part VII has 478 lines left and two items still to spend them.** 7,022 of 7,500 used. #51's
> interview chapter has a 150-line floor from the Book Chapter Standard, and #52 has to extend six section
> READMEs with the running project. The only combination that fits is **#51 at ~190 lines** and **#52
> adding ~45 lines per section README**. Both items' notes have been updated. If either overruns, Part VII
> becomes the second part over budget and `lint:docs` will report a new violation — that is a baseline
> change, not a passing run.

---

### - [x] 51. Write `AI/` interview chapter `S` — ✅ **done 2026-09-07**

A dedicated chapter on how AI topics appear in interviews: "design a RAG system", "how would you evaluate
this feature", "your agent is looping, debug it", "what breaks when the model changes version".

> ⚠️ **Location set at #44.** The Phase 4 target tree gave this chapter no home and #49's `Production/` is
> fixed at 01–06, so it goes at the **root of `AI/`** as the part's closing chapter. The Part VII opener
> already announces it under the title **AI in Interviews**; #70 assigns the `chapter` number that puts it
> last.

> 🔴 **Budget: ~190 lines, not ~220.** Part VII stood at 7,022 of 7,500 when #50 finished. This chapter
> and #52 share the remaining 478. The Book Chapter Standard's floor is 150, so there is room — but not
> for an average-length chapter.

**Done when:** the chapter exists at the root of `AI/`, passes the Book Chapter Standard (six blocks in
order, 150–400 lines, TypeScript-only fences, no relative links in the body), `pnpm lint:docs` shows no
rule regressed, and the Part VII opener links it. _("Done when" was missing from this item and was added
when it was executed — the acceptance test is the same as #49's and #50's.)_

**Delivered:**

- `AI/07-ai-in-interviews.md`, **203 lines**, slug `ai-in-interviews`. Part VII **7,023 → 7,225** of its
  7,500-line budget. Written 13 lines over the ~190 target and still inside it — **275 lines remain for
  #52**, which its note budgets at ~280 across six section READMEs. #52 should aim at **~45 per README**
  and treat that as a ceiling, not an estimate
- **Numbered `07-` rather than `01-`** so the filename sorts after the six section directories it closes.
  Front matter keeps `chapter: 0`; #70 assigns the real number
- **Structured as the four archetypes named in this item**, one `###` round each: design a RAG system,
  how would you evaluate this feature, your agent is looping, what breaks on a version change. Each round
  teaches the *method* — the phases to drive, the order to bisect in, the artefact the answer produces —
  and cross-references the section chapter that owns the mechanics, so nothing is restated. Retrieval
  causes of loops live in `Agents/01`–`02`, version pinning in `Foundations/02` and `Production/01`
- **The loop round turns on a three-line trace** showing the same tool called with the same arguments and
  the same empty result. That is the fastest way to show that a looping agent is a tool-surface bug rather
  than a reasoning failure, and asking for the trace at all is most of what the question scores
- **Only two code fences**, deliberately: the trace, and an `UpgradeReport` interface whose `regressions`
  field is the one list that blocks a release. The eval-case shape was left to `Production/01` rather than
  duplicated here
- `AI/README.md` links the chapter by `#ch-ai-in-interviews` from both the Sections block and the
  interview-sprint path, and its status note now reads **all thirty-one chapters written**
- Every `#ch-` anchor used in `AI/` still resolves — audited against every `slug:` in the repo, zero
  unresolved
- `pnpm lint:docs`: 288 → **289 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

---

### - [x] 52. Add a "build it once" running project to Part VII `M` — ✅ **done 2026-09-07**

Every chapter set in Part VII should thread through **one small application** — a documentation assistant,
say — so the reader ends the part with something whole rather than eight disconnected snippets.

**Done when:** the Part VII opener introduces the project and each section extends it.

> ⚠️ **Half of this is already done** — the opener introduced the documentation assistant at #44. What
> remains is each of the six section READMEs extending it.
>
> 🔴 **Budget: ~45 lines per section README, ~280 total.** Part VII stood at 7,022 of 7,500 after #50,
> and #51 takes roughly 190 of the remaining 478.

> ⚠️ **Half done at #44.** The opener introduces the project — a documentation assistant — because
> BOOK-SPEC § Part VII commits to it and an opener that omitted it would have shipped wrong. What remains
> for this item is the other half: each section actually extending the same application.

**Delivered:**

- **A `## The Running Project` section in all six section READMEs**, placed identically — after the
  Chapters table, before `## What Interviewers Probe For`. Each one has the same three parts: the state
  the documentation assistant arrives in, a row per chapter saying what that chapter adds to it, and an
  **"At the end of this section"** line naming what the assistant still cannot do plus which section
  fixes it. Read in order the six blocks are a continuous build log
- **121 lines total, ~20 per README** rather than the ~45 this item budgeted. The tables carry the
  content, so the prose around them stayed short. Part VII **7,225 → 7,345** of 7,500, leaving **155
  lines spare** — #53's cross-linking sweep has room
- **The arc, so #53 and #70 do not have to reconstruct it:** `Foundations/` produces three decisions and
  no running code — a prompt file, a small model for rewriting and a large one for answers, a written
  window budget. `Integration/` makes it an application that streams cited answers over a keyword query.
  `RAG/` replaces the query with hybrid retrieval and produces the project's first number, recall@5.
  `Agents/` adds one bounded triage agent and deliberately keeps the answer path a workflow.
  `Production/` adds the pass rate, the cost per question and the security boundary. `AIUX/` finishes the
  surface and states what the reader ends the part holding
- **The through-line that ties the sections together is `Integration/03`'s reply schema** — an answer
  carrying passage ids rather than pasted text. `RAG/05` measures against those ids, `Production/05` and
  `06` resolve them server-side so an injected docs page cannot fabricate a citation, and `AIUX/02` renders
  them as chips from an allow-list. Three sections depend on one field, which is the point of a running
  project rather than eight snippets
- **Fixed a stale fragment in `AI/Agents/README.md`** — a dangling blockquote reading "> `Integration/04`,
  which must be written first", left over from the pre-#48 planning note. All of `Integration/` is written,
  so the line was both broken markdown and wrong
- `AI/README.md`'s status note now records the part as complete: thirty-one chapters, every internal
  cross-reference resolving, and the running project threaded through all six indexes
- `pnpm lint:docs`: **289 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

> ⚠️ **Budget note corrected.** This item's 🔴 note allowed ~45 lines per section README on the assumption
> that Part VII would be nearly full. It came in at ~20, so Part VII closes at 7,345 of 7,500 rather than
> at the ceiling. Nothing in Phase 4 is now budget-blocked.

---

### - [x] 53. Cross-link AI into the rest of the book `S` — ✅ **done 2026-09-07**

Add explicit cross-references: Part V (API design for streaming endpoints), Part IV (performance budgets for
AI features), Part VI (system design for an AI product), Part VIII (deploying and monitoring AI workloads),
Part IX (the AI-assisted interview loop).

**Done when:** each of the five named parts has an explicit `#ch-` cross-reference to `AI/` and one back
from `AI/`, every anchor resolves to an existing H1, no part crosses its BOOK-SPEC § 5 budget, and
`pnpm lint:docs` shows no rule regressed. _("Done when" was missing and was added when the item ran.)_

**Delivered:**

- **Ten cross-references, five pairs, both directions.** Each is placed in the body sentence that earns it
  rather than appended to a `What to Read Next` list — the six affected AI chapters already carried three
  links each, which is the standard's ceiling

| Part | Into `AI/` | Back out of `AI/` |
| ---- | ---------- | ----------------- |
| IV — performance budgets | `WebPerformance/README.md` → `ch-designing-for-latency` | `AIUX/01` → `ch-core-web-vitals`, on the INP target a streaming pane still has to meet |
| V — streaming endpoints | `API/05` → `ch-streaming-responses` (the client half: first token, cancellation, partial answers) | `Integration/02` → `ch-realtime-streaming` (the server half: proxy buffering, keep-alive ping, HTTP/1.1 connection limit) |
| VI — AI product design | `CaseStudies/README.md` → `ch-ai-in-interviews`, named as the sixth shape the section does not carry | `07-ai-in-interviews` → `ch-driving-the-round` |
| VIII — deploy and monitor | `Observability/01` → `ch-observability`; `Deployment/03` → `ch-choosing-a-model` | `Production/03` → `ch-monitoring-fundamentals`; `Foundations/02` → `ch-feature-flags` |
| IX — the AI-assisted loop | `Communication/02` → `ch-ai-in-interviews` | `07-ai-in-interviews` → `ch-thinking-aloud` |

- **Two parts had no line budget left, so their inbound links were made line-neutral.** Part IV is
  1,081 lines over (the standing baseline violation) and Part VI had exactly one line spare, so adding
  even a bullet to either would have raised the `lint:docs` count and turned CI red. Both links were paid
  for inside the same file: `Frontend/WebPerformance/README.md` gained the AI sentence and gave a line back
  by tightening its INP paragraph, `SystemDesign/CaseStudies/README.md` the same with its opening
  paragraph. **Part IV is unchanged at 6,581 and Part VI unchanged at 6,500**
- **The Part IX link is about the loop, not the topic** — some 2026–27 coding rounds allow an AI
  assistant, which raises the narration bar rather than lowering it, because the interviewer already knows
  the model can write the function. That note is now in `Communication/02`, ahead of its three-phase
  section
- **Fixed a defect found on the way:** `ShipAndOperate/Deployment/03-feature-flags.md` listed
  `ch-deployment-strategies` **twice** in `What to Read Next` under two different titles. One of the pair
  became the `ch-choosing-a-model` link, so the fix cost nothing. Related: **#27's open note about
  `ch-deployment-strategies` being a duplicate *anchor* is now moot** — both of the files it named
  (`SystemDesign/Microservices/06-deployment.md`, `ShipAndOperate/CICD/03-deployment-strategies.md`) were
  removed by later Phase 2 items, and exactly one H1 carries the anchor today
- Budgets after: **IV 6,581 / 5,500 (unchanged), V 6,460 / 6,500, VI 6,500 / 6,500, VII 7,359 / 7,500,
  VIII 5,496 / 5,500, IX 2,004 / 2,500**
- All eleven anchors used were checked to resolve to exactly one H1 carrying `{#ch-<slug>}`
- `pnpm lint:docs`: **289 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

> ⚠️ **Phase 4 is complete** — `AI/` is thirty-one chapters, seven indexes, a running project through all
> six sections, and cross-links into five other parts.
>
> ⚠️ **A backlog this item saw and did not touch:** a repo-wide audit found **77 distinct `#ch-` anchors
> that resolve to nothing**, in the older parts — for example `ch-content-security-policy` where the slug
> is `csp-headers`, and `ch-image-optimisation` where it is `image-optimization`. Nothing lints anchor
> resolution, so they are silent and will only surface as broken links in the PDF and EPUB. **#71** owns
> cross-reference rewriting and should either fix them or gain an `unresolved-anchor` lint rule; a
> `duplicate-anchor` rule for #70 is still worth the same trade.

---

# Phase 5 — Fill the Remaining Gaps

### - [x] 54. Create `Frontend/Accessibility/` `M` — ✅ **done 2026-09-07**

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

**Done when:** the six chapters and a section README exist under `Frontend/Accessibility/`, each passes the
Book Chapter Standard, the absorbed chapter is gone from `HtmlCss/` with every inbound cross-reference
repointed, Part II is still under its 6,000-line budget, and `pnpm lint:docs` shows no rule regressed.
_("Done when" was missing and was added when the item ran.)_

**Delivered:**

- **Seven files, 1,527 lines.** `README.md` (70), `01-why-accessibility-and-the-law.md` (233),
  `02-the-accessibility-tree.md` (246), `03-aria-and-when-not-to-use-it.md` (233),
  `04-keyboard-and-focus-management.md` (247), `05-accessible-forms.md` (256),
  `06-testing-accessibility.md` (242). Slugs: `accessibility-and-the-law`, `accessibility-tree`, `aria`,
  `keyboard-and-focus`, `accessible-forms`, `testing-accessibility`, `frontend-accessibility-index`
- **Part II: 3,718 → 4,990 of 6,000.** Net **+1,272**, not the ~1,046 the #31d note projected, because the
  six chapters came in at the standard's ~220–250 rather than being trimmed to fit a projection
- **The old chapter was absorbed, not moved beside.** `Frontend/HtmlCss/02-accessibility.md` (255 lines) is
  `git rm`-ed and its material is distributed: WCAG structure and the AA numbers into 01, name computation
  and the tree into 02, the three kinds of ARIA and live regions into 03, focus and `<dialog>` into 04,
  labels and errors into 05, the automation ceiling into 06. `03-advanced-css.md` is renumbered to `02`
- **`HtmlCss/` is now two chapters**, and its README says why — the accessibility material outgrew a
  section about markup and styling. Cross-directory links there use relative paths, because part-opener
  H1s carry no `{#ch-}` anchor in this repo and an anchor link to one would not resolve
- **Three inbound cross-references repointed** — `Internationalization/04-rtl-support` → `#ch-accessibility-tree`,
  `Architecture/03-design-systems` → `#ch-accessibility-and-the-law`,
  `ModernStack/StateManagement/04-form-state` → `#ch-accessible-forms`. Every `#ch-` anchor in the new
  section resolves; `Frontend/README.md` lists the directory in both its Part II table and its Part II prose
- **`HtmlCss/01-semantic-html.md` was deliberately left where it is.** #31d's note says it "feeds
  `Accessibility/02`", and that is what happened: 02 covers what the browser *computes* from markup — the
  tree, role/name/state, the accessible-name algorithm, what removes a node — and cross-references
  semantic HTML for the element catalogue. Moving it would have left `HtmlCss/` with one chapter and
  duplicated the catalogue in two places
- **Four factual corrections against the chapter it replaced**, all of which a 2027 audit would catch: the
  2 px / 3 : 1 focus indicator is **2.4.13 Focus Appearance, which is AAA**, not an AA requirement (AA
  gives you 1.4.11 at 3 : 1 and the new 2.4.11 Focus Not Obscured); the WCAG 2.2 additions at A and AA are
  **six, named precisely** — 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8 — rather than a list of five
  including a AAA criterion; **4.1.1 Parsing was removed** in 2.2, which older audit templates still flag;
  and the automation ceiling is stated as a third to a half rather than a flat third
- **Context7 checked** for `axe-core` before writing 06. `AxeBuilder` with `.withTags()` / `.exclude()` /
  `.analyze()` is current, and the tag list is scoped to the conformance level claimed
  (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) rather than running every rule axe ships
- **BOOK-SPEC § 5's spine callout amended with the measured input.** Its projection assumed this item would
  add ~1,046 net; at +1,272 the finished book projects to **27,466 of 55,260 = 49.7%**, so the deferred
  breach against non-negotiable #3 falls from **554 lines to 164**. Still #77's to close, still from Parts
  V–IX in the fixed cut order
- `pnpm lint:docs`: 289 → **295 files**, six rules at zero, the one violation still Part IV's pre-existing
  +1,081. **`.lint-baseline.json` unchanged**

> ⚠️ **A boundary #57 must respect.** `Frontend/Testing/07-specialized-testing.md` already carries ~25
> lines of a11y testing — `vitest-axe`, RTL role queries, the automation percentage. The split now is that
> **`Accessibility/06` owns the method** (which layer catches what, CI gating and baselining, the keyboard
> and screen reader passes, the conformance report) and **`Testing/07` owns the tool catalogue** among
> visual and contract tests. #57's planned "accessibility testing in CI" addition should cross-reference
> `#ch-testing-accessibility` rather than restate it, or the two will drift.

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
- Add: component testing vs the E2E boundary
- Add: visual regression and accessibility testing in CI

⚠️ **Amended at #35 (2026-09-06).** "Testing Server Components" and "testing async/Suspense" were
removed from the list above — `Frontend/ModernStack/React/12-testing-react.md` now owns both, along with
the wider question of what to test at which level. This section keeps the **tool** layer: the runner,
the query API in `03-react-testing-library.md`, Playwright, and CI. Chapter 12 cross-references `03` for
the queries; keep that split rather than restating either side.

---

### - [ ] 58. Refresh `Frontend/WebPerformance/` for 2027 `M`

Absorbs `SystemDesign/Frontend/04`, `09`, `12` (item 42). Add or update:

- **INP** as the responsiveness metric (replaced FID in 2024 — check every mention)
- Performance budgets and how to enforce them in CI
- RSC and streaming as performance strategies
- Third-party script governance
- Real user monitoring vs lab data

---

### - [ ] 58a. Trim Part IV to its budget `M`

Split out of **#31e** on 2026-09-02 and **numbered 58a rather than 31f on purpose**: #31e carried a 🔴
note saying Part IV must wait for #42, #57 and #58, so an item in Phase 2 could never run. Placing it
immediately after the last of its three blockers makes the constraint structural instead of a comment
the next session has to notice.

Part IV is **6,649 against 5,500 — +1,149**, with 29 chapters where § 5 says ~24. All three blockers
move content into or out of it:

| Item | What it does to Part IV |
| ---- | ----------------------- |
| **#42** | Moves `SystemDesign/Frontend/01`, `05`, `08` into a new `Frontend/Architecture/`, and merges `04`, `09`, `12` into `Frontend/WebPerformance/`. Six files already counted against Part IV by `PART_OVERRIDES` in `scripts/lib/book.ts` — those entries must be **deleted** as the files move, or the lines are counted twice |
| **#57** | Rewrites `Frontend/Testing/` (1,947 now) around Vitest and Playwright |
| **#58** | Rewrites `Frontend/WebPerformance/` (2,300 now) for INP and absorbs #42's three files |

The two fat sections are `Frontend/WebPerformance` and `Frontend/Testing`. Because #57 and #58 rewrite
both, **the cheapest path is for them to land inside budget rather than for this item to trim after
them** — which may make this item a verification rather than a session of work. Check that before
starting.

⚠️ **Four `SystemDesign/Frontend/` chapters still predate the Book Chapter Standard** — `00-interview-strategy`
(also 149 lines, one under the floor), `07-offline-first`, `10-seo-analytics`, `11-auth`. Logged at #31d,
still open. Converting them returns roughly 40 lines to Part VI, not Part IV, but they belong to whoever
touches that directory next: this item, #42, or #70.

**Done when:** `pnpm lint:docs` reports Part 4 at or under its BOOK-SPEC § 5 budget of 5,500.

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

> **Amended at #31e — cut from six chapters to one.** Part IX came in at 1,999 against its 2,500 budget,
> which pays for two more chapters, and **#64** owns one of them. Four of the six below already exist as
> substantial sections of chapters that survived #31e's merge, so writing them as chapters would be
> duplicating the book against itself.

| Proposed chapter | Verdict at #31e |
| ---------------- | --------------- |
| Influence without authority | ✅ **Write it.** The one real gap. `02-leadership-and-conflict.md` has the leading-without-authority table but not a chapter's worth |
| Scope negotiation and saying no | Fold into the same chapter — it is influence without authority pointed the other way |
| Technical decision-making and writing an ADR | ❌ Exists — `Communication/03-written-communication.md` § Architecture Decision Records |
| Incident ownership and blameless post-mortems | ❌ Exists — `Behavioral/05-engineering-culture.md` § Blameless Post-Mortems |
| Mentoring and growing engineers | ❌ Covered — `02-leadership-and-conflict.md`, including the "when is mentoring the wrong thing to offer" question |
| Handling disagreement with a senior stakeholder | ❌ Covered — `02-leadership-and-conflict.md` § Disagreeing with someone senior, with a worked answer |

**So this item is now one chapter:** *Influence, Scope and Saying No*, ~230 lines, in `Behavioral/` as
`06`. Budget it against Part IX's 501 lines of headroom, leaving the rest for **#64**. Item 14's
renumbering no longer applies — #31e renumbered the section.

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

> ⚠️ **Added at #44 — part openers currently do not open their parts.** `orderDocs` in
> `scripts/lib/book.ts` breaks a tie between two `chapter: 0` files by path, so a section index sorts ahead
> of the part opener above it: Part III opens on `ModernStack/NextJS/README.md` and Part VII on
> `AI/Agents/README.md`. Assigning real `chapter` numbers here fixes it; verify the built book's part
> order afterwards rather than assuming it.

> ⚠️ **Added at #42 — two jobs here are not numbering, and had no owner.** #31d and #58a both wrote
> "owner is #42 or #70" for work this item as written cannot do. Both are now explicitly this item's:
>
> 1. **Convert four `SystemDesign/Frontend/` chapters to the Book Chapter Standard** —
>    `01-interview-strategy` (also **145 lines**, five under the floor), `03-offline-first`,
>    `04-seo-analytics`, `05-auth`. None has the six blocks, Key Takeaways, Interview Questions or What
>    to Read Next. #42 stripped their back-link footers and renumbered them; the writing is left.
>    Converting them returns roughly 40 lines to Part VI — ⚠️ **wrong sign, corrected at #43.** Adding
>    six blocks to four chapters *costs* roughly 200 lines, and after #43 Part VI stands at **6,499 of
>    6,500**. This conversion cannot start until #76 has trimmed Part VI or the ceiling has been raised
>    and paid for out of Part IX's 501 unused lines — see the note under #43
> 2. **Reconcile 12 slug/anchor mismatches**, where front-matter `slug` disagrees with the H1's
>    `{#ch-…}`. Ten are Part IV — `Frontend/Security/02`, `03`; `Frontend/Testing/04`, `05`, `07`, `08`;
>    `Frontend/WebPerformance/04`, `05`, `06`, `08` — and two are the appendix, `DSA/01` and `05`. Plus
>    the **9 unresolved `#ch-` references** the same audit found: `ch-css-animations`,
>    `ch-css-fundamentals`, `ch-responsive-design` (all three point at chapters #31f archived),
>    `ch-web-performance-caching-strategies` ×2, `ch-bundle-optimization`, `ch-e2e-testing`,
>    `ch-preface`, `ch-further-reading`

---

### - [ ] 71. Replace every relative link with a chapter cross-reference `M`

Relative paths break in PDF and EPUB. Convert to the item-2 syntax and have the build resolve them to
"see Chapter N" in print and to anchors on the web.

🔴 **Ordering:** the *resolution* half needs a pandoc filter that does not exist. **#82 builds it and
closes this item** — do the markdown conversion here, then tick both there.

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

**Correction (2026-09-03):** the "exactly one" count is stale — `build/book.md` now holds **52** Mermaid
fences. The conversion is largely done; what is missing is that **nothing renders them**. Pandoc emits
them as code blocks, so the PDF prints Mermaid source. **#82 builds the renderer and closes this item.**
117 files also still carry box-drawing characters that print as tofu — #81 maps those.

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

### - [ ] 77. Calibrate the page budget, then produce the final PDF and EPUB `M`

🔴 **Ordering:** last in Phase 7 — after #79–#83, which build the design system this item tunes.

Item #5 deferred every real typographic decision to this item and left it without a "Done when". It is
now the calibration and proof step, and it carries the plan's largest open risk.

🔴 **This item now also owns two things #31f deferred to it:**

1. **The 700-page ceiling** — BOOK-SPEC decision #13. § 1's "850–1,050" and § 5's "950–1,050" are both
   stale and this item replaces them with measured numbers.
2. **A 554-line spine breach** — #31f archived 2,077 lines from Part II, projecting Parts I–IV to
   **49.5%** against non-negotiable #3's 50% floor. Close it from Parts V–IX in § 5's fixed cut order
   (Part VIII first), never from Parts I–IV.

**The page budget does not currently close.** BOOK-SPEC § 5 assumes ~55 markdown lines per typeset page
and a 950–1,050 page book. The only recorded real build (#5) produced **3,692 A4 pages from 134,000
lines — 36 lines per page**, optimistic by roughly 50%. Carrying that rate forward:

| | |
| --- | --- |
| Manuscript today | 39,855 lines (`build/book.md`) |
| Finished, with Parts III and VII | ≈ 59,000 lines |
| At 36 lines/page | ~1,640 pages |
| Plus 253 chapters each opening a fresh page | **~1,765 pages** |
| BOOK-SPEC § 5 target | **950–1,050 pages** |

The tightening in #79–#81 — leading 1.60 → 1.32, paragraph space 0.9em → 0.30em, table rows 30pt → 15pt,
callout padding 19pt → 7pt, chapter opening 146pt → 78pt — should reach 48–50 lines/page, landing near
**1,330–1,400**. Still ~30% over.

So this item measures rather than guesses, then presents the levers with real numbers:

1. **XCharter in place of Source Serif 4** — sets ~6% narrower at the same apparent size. One line in
   `tokens.tex`.
2. **Chapters run on instead of opening a fresh page** — recovers ~125 pages. Costs thumb-navigability.
3. **Crown Quarto 189×246mm instead of A4** — recovers a further ~180 and gives a 72-character measure
   instead of A4's 90. Costs nothing but the decision.

Both 2 and 3 are single token values, so no work in #79–#83 is wasted whichever way they go.

Add `scripts/measure-pages.ts`, importing `loadBook`/`orderDocs`/`PART_NAMES` from `scripts/lib/book.ts`
the way `lint-docs.ts` and `collect-chapters.ts` already do, and expose it as `pnpm book:pages`: pages per
part against the § 5 budget, plus the true lines-per-page rate.

Then run the full build and check pagination, code-block wrapping, table overflow and diagram rendering
in both formats.

**Amending the spec is part of this item.** `BOOK-SPEC.md` is locked at v1.2 and names no trim size, no
typeface and no page-count method. Recording them in § 1 requires its own § 10 procedure: a decision-log
row, a statement of what changed and why, and a version bump to 1.3. Leave § 5's table row shape alone —
`partBudgets()` in `scripts/lib/book.ts` parses it with a regex and throws if a row goes missing.

**Done when:** `pnpm book:build` completes with zero overfull boxes wider than 5pt, `pnpm book:pages`
reports the page count per part against the § 5 budget, and BOOK-SPEC § 1 records the trim, the
typefaces and the measured lines-per-page rate.

---

### - [ ] 78. Decide distribution and set up the companion `M`

Options: Leanpub (iterative, pays while you write), Gumroad (full control), self-host on `salmanrahman.com`.
**Recommendation:** Leanpub for the book plus a free VitePress companion site built from the same markdown —
the site markets the book and the book funds the site.

---

### - [ ] 79. Vendor the print typefaces and build the design-token layer `M`

The book has no typeface. `scripts/build-book.sh` passes `--variable=fontsize:10pt` and nothing else, so
tectonic falls back to Latin Modern — a 1970s Computer Modern revival that sets thin and grey at 10pt on
uncoated stock. `BOOK-SPEC.md` § 1 names no face either.

Vendor three OFL families into `assets/fonts/` — the repo's first binary assets:

| Role | Face | Why |
| ---- | ---- | --- |
| Body | **Source Serif 4** | Built for extended reading; holds colour at 10pt |
| Display | **Source Sans 3** | Stays legible at the 8–8.5pt of eyebrows, labels and folios |
| Code | **Source Code Pro** | Tall x-height; readable at 8.5pt, same family metrics |

Load them with `fontspec` + `Path=` so the build is reproducible without system font installs. Tectonic
runs XeTeX, so `fontspec` works unchanged.

Then split the design surface into a token layer. `scripts/book-header.tex` becomes an `\input` shim over
five files under `scripts/tex/`: `tokens.tex` (palette, type scale, geometry, leading — **the only file
tuned during calibration**), `typography.tex`, `structure.tex`, `blocks.tex`, `glyphs.tex`. The existing
`fancyhdr` footer and `newunicodechar` emoji table move across unchanged; they are correct.

**Greyscale palette — five tones, chosen for how ink behaves, not how the screen looks:**

| Token | Value | Used for |
| ----- | ----- | -------- |
| `ink` | 100% K | Body, chapter titles, H2, H3 |
| `ink-mid` | 55% K | Eyebrow, captions, source notes, folio, running head |
| `ink-light` | 35% K | Hairlines, table rules |
| `tint-1` | 6% K | Code ground, table zebra |
| `tint-2` | 12% K | Warning-callout ground |

Two tint steps only, deliberately: **tints under 6% vanish on uncoated stock, and 13–25% goes muddy behind
10pt text.** Everything else is carried by rule weight and type weight. This is why the source design
cannot simply be desaturated — see #81.

**Done when:** `pdffonts build/handbook.pdf` reports the three vendored families and no fallback face.

---

### - [ ] 80. Page architecture — geometry, running heads, part and chapter openings `M`

🔴 **Ordering:** after #79 — the token layer defines the values this item consumes.

Today: A4, `margin=2.2cm` uniform, `fancyhdr` heads showing `\leftmark`/`\rightmark` in default type. No
mirrored margins, so the gutter is the same width as the fore-edge and the text block drifts toward the
spine on every recto.

Build the real page:

- **A4 210×297mm, `twoside`**, mirrored: inner 26mm · outer 28mm · top 22mm · bottom 24mm. Starting
  values — #77 calibrates them.
- `\flushbottom`, `\widowpenalty=10000`, `\clubpenalty=10000`, `\raggedbottom` off.
- **Part openers force a recto.** Number set 60pt at 35% K, title 28pt sans bold beneath it.
- **Chapters start a fresh page.** Opening block is: eyebrow (8.5pt sans semibold caps, +140/1000 tracking,
  55% K) → 12pt → number and title (22pt sans bold, 12pt apart) → 14pt → **1.2pt** rule → 18pt → deck
  (11pt serif italic, 55% K). Total 78pt, against the 146pt the source design spends before its first word.
- Running heads: verso = part name, recto = chapter title, both 8pt caps at 55% K. Folio outer, 8pt, 55% K.
  Keep the existing copyright footer.
- `\needspace` guards so the six closing blocks never split across a chapter's last two pages.

**Done when:** `pdfinfo build/handbook.pdf` reports A4; every part opener falls on an odd page; no chapter
opening block sits at the foot of a page with fewer than three lines of body under it.

---

### - [ ] 81. The black-and-white block library `L`

🔴 **Ordering:** after #80.

The book prints in black and white. The reference design carries three of its distinctions in hue alone,
and all three collapse:

| Reference | Greyscale | Consequence |
| --------- | --------- | ----------- |
| Navy headings `#1B3A5F` | 28% K | — |
| Teal headings `#0F7B62` | 40% K | Too close to navy; two heading levels merge |
| Mint callout `#E3F2EC` | 94% K | — |
| Lavender callout `#EBEFF7` | 94% K | **Identical to mint** |
| Pale-gold callout `#FAF3E0` | 95% K | **Identical to both** |

So the three callout types must differ by **structure**, not fill — structure survives greyscale,
photocopying and e-ink:

| Block | Treatment |
| ----- | --------- |
| 💡 The Core Idea | 0.4pt full box, no tint |
| 🔑 Key Takeaways | 0.4pt rules top and bottom only, no tint |
| ⚠️ Gotcha | 2.5pt solid left bar + `tint-2` |
| Metadata pill | 8pt sans bold caps, 0.4pt box, 4pt padding |
| Table | 100% K header band with reversed 8.5pt sans bold; body 9/11.5 sans; `tint-1` zebra; 4pt cell padding |
| Code | 8.5/10.5 mono on `tint-1`, 5pt padding, no border; 8.5pt sans bold label above |
| Pull quote | 12/15 serif italic, centred, 0.4pt rules, 10pt clear |

Each callout keeps its uppercase sans label — that is what actually carries the meaning. Build them with
`tcolorbox`; tables with `tabularray`. A `scripts/lua/callouts.lua` filter maps the standard's `## 💡 …`
and `## 🔑 …` headings and `> ⚠️ …` blockquotes onto the environments, so **no markdown changes**.

Also here: the emoji substitutions. `scripts/tex/glyphs.tex` extends the existing table — 💡 and 🔑 become
a solid square set in the heading's own weight rather than being silently dropped as they are today; ⚠️
becomes a boxed **!**; ✅ ❌ stay `\ding{51}`/`\ding{55}`, which already work because the two glyphs differ
in shape, not colour. **117 files still carry box-drawing characters** that print as tofu; map them here.

Add `scripts/specimen.md` — a fixture chapter exercising every block — and a `pnpm book:specimen` script,
so the system can be proved on two pages instead of a 1,400-page build.

**Done when:** `pnpm book:specimen` renders all six blocks, and a mono laser print of
`build/specimen.pdf` keeps the three callout types tellable apart.

---

### - [ ] 82. Lua filters — Mermaid rendering and print cross-references `M`

🔴 **Ordering:** after #81. **This item closes #71 and #74** — mark both done here rather than
duplicating the work.

Two of Phase 7's items describe a build feature that does not exist. Neither can be finished by editing
markdown:

- **#74 (Mermaid).** `build/book.md` holds **52** Mermaid fences. Pandoc emits them as unrendered code
  blocks — the PDF prints Mermaid *source*. `scripts/lua/mermaid.lua` shells out to `mmdc`
  (`pnpm add -g @mermaid-js/mermaid-cli`) to render each fence to vector PDF, cached by content hash so a
  rebuild does not re-render 52 diagrams. Force a monochrome theme; the default palette greys out.
- **#71 (cross-references).** Non-negotiable #8 requires `[Chapter N — Title](#ch-slug)`, which pandoc
  turns into a bare hyperlink — useless on paper. `scripts/lua/xref.lua` resolves each to
  "Chapter N, page P" in print and leaves it an anchor in EPUB.

Wire both into `scripts/book-pdf.yaml`, a pandoc defaults file that also replaces the eight `--variable`
flags currently inlined in `build-book.sh`.

**Done when:** no `mermaid` fence survives into `build/handbook.pdf` as text, and no `#ch-slug` link
renders without a page number.

---

### - [ ] 83. Translate the design system to EPUB CSS `S`

🔴 **Ordering:** after #81 — it ports that system.

`build_epub` passes no `--css`, no `--epub-embed-font`, no cover: the EPUB is pandoc default styling.
`scripts/book-meta.yaml` also has no `subject`, `identifier`, `publisher` or `description`, all of which
retailers expect, and its `subtitle` **disagrees with `BOOK-SPEC.md` § 1** — reconcile them here.

Write `scripts/epub.css` carrying the same scale and structure as print. The black-and-white constraint is
print-only, so EPUB keeps colour and keeps real emoji — but the callouts must still read correctly on a
monochrome e-ink screen, which means the structural distinctions from #81 carry over unchanged.

**Done when:** `pnpm book:epub` passes `epubcheck` with zero errors and the output carries the stylesheet.

---

## ✅ Progress Tracker

| Phase | Items   | Done | Status         |
| ----- | ------- | ---- | -------------- |
| 0     | 1–7     | 7/7  | ✅ Complete    |
| 1     | 8–19    | 12/12 | ✅ Complete    |
| 2     | 20–31 · 31a–31f | 18/18 | ✅ Complete    |
| 3     | 32–43   | 12/12 | ✅ Complete    |
| 4     | 44–53   | 10/10 | ✅ Complete    |
| 5     | 54–63 · 58a | 1/11 | 🔄 In progress |
| 6     | 64–69   | 0/6  | ⬜ Not started |
| 7     | 70–83   | 0/14 | ⬜ Not started |
| **Total** | **90** | **60/90** | **67%**   |

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
| SystemDesign deduped and archived — #22, #23, #28, #31d  | 13,700      |
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

> 🔴 **This table was aspirational, and it went unchecked for nine items.** Corrected 2026-08-30,
> after **#29**.
>
> Every row above credits a set of items with a line total, but **no item's *Done when* contains a
> line target** — they are worded as structural outcomes ("the directory is gone", "5–6 focused
> chapters"). An item can therefore be finished, correct, and still deliver a fraction of the cut
> attributed to it, with nothing to notice. Measured against the tree on 2026-08-30:
>
> | Row | Credited | Actually delivered | Items | Owner of the rest |
> | --- | -------- | ------------------ | ----- | ----------------- |
> | DevOps archived | 34,600 | ~34,050 | #20, #25, **#31e** ✅ | — |
> | SystemDesign deduped | 13,700 | ~6,464 | #22, #23, #28 ✅ | **#31d** (+7,236) |
> | DSA trimmed | 13,500 | 14,490 ✅ **over-delivered** | #27 ✅ | — |
> | Foundations consolidated | 12,500 | ~4,899 | #26 ✅ | **#31a** (+7,601) |
> | Browser platform trimmed | 6,200 | **6,371** ✅ **over-delivered** | #31b ✅ | — |
> | Backend deduped | 5,800 | ~0 so far | #24 ✅, #31 pending | **#31c** (+6,510) |
> | Human layer condensed | 3,400 | 1,683 | #25, #29, **#31e** ✅ | — |
> | Frontend-at-scale net trim | 1,300 | 0 so far | #42, #57, #58 pending | **#58a** (+1,149) |
>
> The `budget` rule in `pnpm lint:docs` now measures this every run, so the gap cannot reopen
> silently. **#31a–#31e** are done; **#58a** owns the 1,149 lines still outstanding, placed after its
> three blockers #42, #57 and #58.

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
