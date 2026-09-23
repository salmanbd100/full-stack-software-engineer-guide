# Improvement Plan — Phase 9: Cut and Simplify

> **Purpose:** take the finished 1,370-page manuscript of **_The Senior Full Stack Handbook —
> Frontend-Heavy, 2027 Edition_** down to about **940 pages**, and make every surviving sentence easy
> to read for someone whose first language is not English.
>
> **This file is not part of the book.** It lives in the repo and the book build skips it.

---

## ▶️ How to Resume — read this first, every session

Attach this file and say **"continue"**. That is the whole instruction. Claude then does this:

| # | Step | What it means |
| - | ---- | ------------- |
| 1 | **Find the first unchecked item** | Run `pnpm plan:next`. Take that item, not a later one that looks easier |
| 2 | **Read the whole item** | Every item has a **Done when** line. That line is the test, not advice |
| 3 | **Do that one item** | One item per session. No tidy-ups from other items |
| 4 | **Run the checks** | The shared checklist below, plus the item's own **Done when**. If something fails, say so and show the output |
| 5 | **Mark it done** | `- [ ]` → `- [x]`, add ` — ✅ **done YYYY-MM-DD**` to the heading, and write a short **Delivered:** block |
| 6 | **Update the counters** | The header counter and the Progress Tracker row. Then run `pnpm plan:check` |
| 7 | **Report and stop** | Say what was done, what was verified, and what was left |

**An item is not finished until steps 5 and 6 are done.** Otherwise the next session starts in the
wrong place.

If an item turns out to be wrong or blocked, **amend it and say so.** Do not skip it quietly.

> **Also fine:** _"do #101"_ to jump to one item, and _"skip #101"_ to move past one. Both beat the
> first-unchecked rule.

**Last updated:** 2026-09-23 · **Progress:** 0 / 25
**Owner:** Salman Rahman
**Locked spec:** [BOOK-SPEC.md](./BOOK-SPEC.md) — the authority on scope and budgets. If this file and
the spec disagree, **the spec wins.**

---

## ✅ What Is Already Done — Phases 0–8

The first 104 items turned a pile of interview notes into a finished, typeset book. They are closed.
The full record — every item, every **Delivered** block, every correction — is archived in
[`Archive/planning/improvement-plan-phases-0-8.md`](./Archive/planning/improvement-plan-phases-0-8.md).

| Phase | What it did | Size | Finished |
| ----- | ----------- | ---- | -------- |
| **0** | Locked the spec, the chapter standard, the build pipeline and the lint script | 7 items | 2026-08-27 |
| **1** | Fixed links, fences, front matter, READMEs and chapter openings | 12 items | 2026-08-28 |
| **2** | Cut DevOps from 147 files to 25, merged the duplicated topics, trimmed six parts to budget | 18 items | 2026-09-03 |
| **3** | Wrote Part III — React, Next.js, Svelte, rendering, state, tooling | 12 items | 2026-09-07 |
| **4** | Wrote Part VII — AI foundations, integration, RAG, agents, production, AI UX | 10 items | 2026-09-07 |
| **5** | Filled the gaps — accessibility, architecture, testing, performance, behavioural | 13 items | 2026-09-08 |
| **6** | 2027-proofing — version stamps, moving-target callouts, the AI-era interview | 6 items | 2026-09-17 |
| **7** | Book assembly — front and back matter, print design, PDF, EPUB, the companion site | 15 items | 2026-09-22 |
| **8** | Closed the spec — the frontend spine, the DSA companion, the cover, CI, a test suite | 11 items | 2026-09-23 |

**One old item was dropped, not finished.** Item #92 asked for a cover-to-cover voice pass. It is
replaced by items **#105–#113** here, which do the same work — but after the cut, so no session is
spent editing prose that is about to be deleted.

---

## 📏 Where the Book Stands Today

Measured on 2026-09-23 with `pnpm book:pages`, off the real typeset PDF:

| Part | Chapters | Lines | Pages |
| ---- | -------- | ----- | ----- |
| Front matter | 2 | 315 | 48 |
| I — Foundations | 27 | 5,036 | 106 |
| II — The Browser Platform | 29 | 5,936 | 130 |
| III — The Modern Frontend Stack | 58 | 11,672 | 262 |
| IV — Frontend at Scale | 28 | 5,559 | 126 |
| V — Backend for Frontend Engineers | 35 | 6,500 | 138 |
| VI — System Design | 35 | 6,293 | 156 |
| VII — AI Engineering | 39 | 7,385 | 182 |
| VIII — Ship and Operate | 27 | 5,495 | 120 |
| IX — The Human Layer | 13 | 2,500 | 61 |
| Back matter | 4 | 1,919 | 41 |
| **Total** | **314** | **58,610** | **1,370** |

The DSA appendix ships as its own 96-page companion volume and is **not** part of these numbers.
Item **#95a** retires it, which is why no cut item mentions DSA: it was never in the 1,370 pages.

**The problem in one line: 1,370 pages is two books.** It is roughly 2.5 kg in print, it cannot be
read cover to cover before an interview, and a reader who opens it does not know where to start.

---

## 🎯 What Phase 9 Changes

Three things, in this order.

### 1. Cut the book to about 940 pages

The rule for what stays is narrow and easy to apply:

| Keep it if… | Cut it if… |
| ----------- | ---------- |
| An interviewer asks about it in a senior frontend or full stack loop | It is reference material the reader would look up instead of recall |
| A frontend-heavy engineer decides it, builds it, or owns it | It belongs to a backend, platform or SRE specialist |
| It explains **why** something works or what it costs | It lists every flag, option or edge case |
| It is the only place the book teaches that idea | Another chapter already teaches it |

Chapters do not get deleted. They get **merged into a stronger chapter** or **moved to `Archive/`**,
the same way Phase 2 handled DevOps. Nothing is lost from the repo; it just leaves the book.

### 2. Make the English simple

Half of this book's readers do not speak English as a first language. `BOOK-SPEC.md` § 3 already says
the rule: **short sentences, everyday words, active voice.** The ideas stay senior. The sentences
carrying them get shorter.

Measured today, prose only, with code, tables and headings excluded:

| Part | Average words per sentence | Sentences over 32 words |
| ---- | -------------------------- | ----------------------- |
| I | 20.8 | 105 |
| II | 21.5 | 142 |
| III | 19.0 | 251 |
| IV | 18.5 | 115 |
| V | 18.7 | 122 |
| VI | 19.3 | 152 |
| VII | 21.1 | 238 |
| VIII | 19.2 | 131 |
| IX | 19.8 | 61 |

The target is the standard's **15–20 words**. The count is a pointer, not a quota — a 28-word
sentence that reads in one breath stays.

### 3. Make the book kinder to read and easier to file

Three smaller fixes, all of them about the reader's experience rather than the words.

| What | Today | After |
| ---- | ----- | ----- |
| **Body text colour** | Pure black — `gray 0.00` in `tokens.tex` | **`#1F1F1F`** on a white page. Pure black at 10pt is the highest contrast the book can produce, and it is what makes a long screen session tiring |
| **Built file names** | `build/handbook.pdf` | The book's real name, so a reader's Downloads folder says what they bought |
| **The cover** | A front cover only — no back cover anywhere in the repo | A back cover carrying the blurb and the author's web address |

⚠️ **The page stays white, and that is a decision.** A warm paper tint reads better on a laptop, but
it means full-page ink on every one of ~940 pages, which costs real money the day this goes to a
printer. Softening the ink alone takes the edge off and keeps the book cheap to print. Contrast is
still 16.5:1 against white — far above WCAG's 7:1 — so nothing is lost for a reader with low vision.

---

## 🔢 The New Part Budgets

These replace the numbers in `BOOK-SPEC.md` § 5. Item **#95** writes them into the spec, which is
what makes them real — the lint script reads the spec, not this file.

| Part | Now | New budget | Cut | Chapters now → after |
| ---- | --- | ---------- | --- | -------------------- |
| I — Foundations | 5,036 | **3,600** | −1,436 | 27 → ~19 |
| II — Browser Platform | 5,936 | **3,800** | −2,136 | 29 → ~18 |
| III — Modern Stack | 11,672 | **8,400** | −3,272 | 58 → ~40 |
| IV — Frontend at Scale | 5,559 | **4,000** | −1,559 | 28 → ~19 |
| V — Backend | 6,500 | **4,000** | −2,500 | 35 → ~19 |
| VI — System Design | 6,293 | **4,400** | −1,893 | 35 → ~20 |
| VII — AI Engineering | 7,385 | **5,200** | −2,185 | 39 → ~23 |
| VIII — Ship and Operate | 5,495 | **3,400** | −2,095 | 27 → ~13 |
| IX — Human Layer | 2,500 | **1,800** | −700 | 13 → ~9 |
| **Book total** | **56,376** | **38,600** | **−17,776** | **291 → ~180** |

**The two spec rules still hold, and they are the reason the cut is not even across parts:**

| Rule | After the cut | Source |
| ---- | ------------- | ------ |
| Parts I–IV are at least half the book | 19,800 of 38,600 = **51.3%** | Decision #2 |
| Part III is the largest single part | 8,400 = **21.8%** | § 5 |

**The page arithmetic:** 38,600 part lines, plus 315 lines of front matter, plus roughly 1,500 lines
of back matter once the generated question index shrinks with the chapter count. That is about 40,400
lines at the measured 42.8 lines per page — **roughly 940 pages.** Fewer chapters also means fewer
part-opening pages, so the real number should land slightly under. Item **#114** measures it.

> ⚠️ **940 is not 700.** Decision #13's 700-page ceiling stays out of reach without dropping a whole
> part, and item #87 already proved the print design has no slack left to give. 940 is a book a reader
> can hold and finish. It is also 430 pages lighter than what exists today.

---

## 🧰 The Checklist Every Cut Session Runs

Items #96–#104 all do the same kind of work on a different part. Rather than repeat this nine times,
it is written once. **Every cut session runs all seven steps.**

| # | Step | Command |
| - | ---- | ------- |
| 1 | Move cut chapters to `Archive/<part>/`, never delete them | — |
| 2 | Renumber what is left, so reading order stays continuous | `pnpm number:chapters` |
| 3 | Repair every cross-reference that pointed at a cut chapter | `pnpm lint:docs --rule=unresolved-xref` |
| 4 | Update the part-opener README's chapter table | — |
| 5 | Regenerate the question index — it is generated, never hand-edited | `pnpm index:questions` |
| 6 | Check the merged code fences still compile | `pnpm check:code-samples` |
| 7 | Prove the part is inside its budget | `pnpm lint:docs` · `pnpm book:pages` |

**When two chapters merge, the result is still one chapter of 150–400 lines.** Keep the interview
questions and takeaways that still earn a place, and drop the rest. A merged chapter that runs to 450
lines has not been merged; it has been stapled.

🔴 **The `budget` rule counts lines, not parts.** The moment #95 lands, `pnpm lint:docs` will report
about **17,776 lines over budget**. That number is the score for the whole phase. Each cut item drives
it down by its own part's share, and `.lint-baseline.json` is committed at the new lower number every
time. It must read **0** when #104 is done.

---

## 🧠 Model and Effort per Item

| Items | Model | Effort | Why |
| ----- | ----- | ------ | --- |
| 95–116, 95a, 113a, 113b | **Opus 5** `claude-opus-5` | `high`–`xhigh` | Every item here is a judgement call: what a senior interviewer actually asks, which two chapters become one, and which sentence to break in half. There is no mechanical sweep left in this plan |

`pnpm plan:next` reads this table. Edit the table, not `scripts/plan-status.ts`.

**Tools that still matter:** the `write-topic-docs` skill before touching any markdown, **Context7
MCP** before rewriting anything about a library in Parts III and VII, and `pnpm test` after anything
that touches `scripts/`.

---

# Phase 9 — Cut and Simplify

### - [ ] 95. Amend the spec for the 940-page edition `M`

Everything else in this phase measures itself against `BOOK-SPEC.md`, so the spec changes first.

Write the nine new budgets from **The New Part Budgets** above into § 5, with the new total of 38,600
and the recalculated share column. Update the two rule lines — the frontend spine reads 51.3%, Part III
reads 21.8%. Replace the page-count paragraph: the edition is no longer 1,370 pages, and the target is
940. Add three entries to the § 11 decision log: one for the cut itself and why 940 rather than 700,
one for the plain-English pass replacing old item #92, and one for retiring the DSA companion (#95a).

Then re-baseline the lint. `partBudgets` reads § 5 directly, so the `budget` rule starts reporting the
moment the spec is saved. Commit `.lint-baseline.json` with the real overage in it.

**Done when:** § 5 holds the nine new budgets, `pnpm test` is green (it parses § 5 for every part),
`pnpm lint:docs` runs with `budget` at its new baseline and every other rule still at 0, and the
decision log has all three entries.

---

### - [ ] 95a. Retire the DSA companion volume `M`

The DSA appendix stops being a product. `DSA/` moves to `Archive/dsa/` — still in the repo, still
useful as personal practice, but out of the build, out of the site, and out of the question index.

> 🔴 **This reverses two recorded decisions, so it goes in the log as a reversal, not a deletion.**
> Decision **#6** demoted DSA to an appendix and cut it 70% on the grounds that _"the reader must pass
> the round"_. Decision **#20** — improvement #86, eight days ago — built it as its own PDF and EPUB
> with its own retail identifier. Both stay in the log with the new entry beside them, saying what
> changed and why. A reader of this book will still sit a coding round; after this item the book says
> nothing about it, and that is the trade being made.

**The companion is not part of the 940-page target.** It never was — it is a separate 96-page volume,
and none of items #96–#104 touch it. Retiring it makes the handbook no shorter. What it buys is one
product instead of two, and the end of a split that is currently half-finished.

**The half-finished split, which is the concrete bug this item fixes.** `Interview-Question-Index.md`
is back matter in the **handbook**, and it still carries an `## Appendix — DSA Patterns` section: 87
questions linking to `#ch-prefix-sum`, `#ch-two-pointers` and fourteen more. `build/book.md` holds
**none** of those anchors — they are all in `build/companion.md`. So the handbook advertises 87
questions whose links resolve to nothing, and the companion ships with no question index at all.
`lint:docs` misses it because the chapters do exist in the repo; nothing checks anchors per volume.

**What has to change, in four groups:**

| Group | Files | Change |
| ----- | ----- | ------ |
| **The content** | `DSA/` — 17 files, 4,618 lines | Move to `Archive/dsa/`, the same way Phase 2 archived DevOps and items #96–#104 archive chapters |
| **The volume machinery** | `scripts/lib/book.ts`, `scripts/build-book.sh`, `scripts/collect-chapters.ts`, `scripts/measure-pages.ts`, `scripts/companion-meta.yaml`, `package.json` | Remove `COMPANION_PART`, `volumeOfPart`, `Volume`, the `--volume` flag, the `companion` build target, `pnpm book:companion`, the companion metadata file, and the companion row in the page report. One volume again |
| **The tests** | `scripts/test/book.test.ts` | `volumeOfPart` is gone, and `partBudgets` loops to `COMPANION_PART`. Both tests need rewriting, not deleting — `pnpm test` must stay at green with the same coverage |
| **The references** | `BOOK-SPEC.md` §§ 1, 4, 5, 8, 11 · `Further-Reading.md` · `Preface.md` · `How-to-Read-This-Book.md` · root `README.md` · `CLAUDE.md` | The appendix is named in the part list, the budget table, the length row, the reading paths and a resources table. All of it goes, except the decision log, which gains an entry |

⚠️ **The 17 cross-references #86 repaired will break again, differently.** #86 made a reference to the
other volume keep its title and lose its link. Those 17 now point at a chapter that is in no volume at
all. Find them with `pnpm lint:docs --rule=unresolved-xref` after the move and delete the sentence
around each one — a title with no book behind it is worse than no reference.

**Done when:** `DSA/` is gone from the manuscript tree, `pnpm book:collect` and `pnpm book:pdf` build
one volume with no companion step, `pnpm index:questions` regenerates the index at **937 questions
across 238 chapters** with no DSA section, `pnpm lint:docs` has every rule at its baseline with
`unresolved-xref` at 0, `pnpm test` is green, `pnpm site:build` is clean, and the decision log records
the reversal.

---

### - [ ] 96. Cut Part I — Foundations — to 3,600 lines `M`

From 5,036 lines across 27 files. Part I teaches the language, so it cuts less than most — but three
of its chapters are reference material and two pairs overlap.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `Backend/DesignPatterns` | 6 files, 1,121 | Merge `01-oop-core-concepts` into `02-composition-over-inheritance`. Archive `05-architectural-patterns` — Part VI teaches service boundaries properly |
| `Frontend/JavaScript` | 11 files, 2,116 | Fold `08-array-object-methods` into `01-data-types-variables` — array methods are lookup material. Fold `02-functions-scope` into `03-closures`, which repeats half of it |
| `Frontend/TypeScript` | 9 files, 1,728 | Fold `07-enums-literals` into `01-basic-types`. Fold `04-utility-types` into `06-advanced-types` |

Keep every chapter on closures, `this`, prototypes, promises, the event loop, generics and type
guards. Those are the questions that actually get asked.

**Done when:** Part I reads ≤ 3,600 lines in `pnpm book:pages`, its `budget` overage is 0, and the
seven-step checklist is green.

---

### - [ ] 97. Cut Part II — The Browser Platform — to 3,800 lines `M`

From 5,936 lines across 29 files. This part holds the two weakest sections in the book for senior
interview prep: PWA and internationalisation are each five files deep and are each asked about as one
question, if at all.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `Frontend/PWA` | 4 files, 829 | Down to **one** chapter — service workers, caching and offline in a single 250-line chapter that moves into `BrowserAPIs`. Archive install and push |
| `Frontend/Internationalization` | 5 files, 932 | Down to **one** chapter covering the `Intl` APIs, plurals and RTL. Archive the rest |
| `Frontend/Accessibility` | 7 files, 1,532 | Down to 5. Fold `01-why-accessibility-and-the-law` into the part opener, and `06-testing-accessibility` into Part IV's testing section |
| `Frontend/BrowserAPIs` | 7 files, 1,568 | Merge `01-storage-apis` and `03-indexeddb` into one storage chapter. Archive `04-browser-permissions` |

⚠️ **Accessibility keeps five chapters and that is deliberate.** The European Accessibility Act is
live and it is now an interview topic, not a nice-to-have. It is the one section in this part that
grew for a reason.

**Done when:** Part II reads ≤ 3,800 lines, its `budget` overage is 0, and the checklist is green.

---

### - [ ] 98. Cut Part III — The Modern Frontend Stack — to 8,400 lines `L`

From 11,672 lines across 58 files — the biggest cut in the phase, and the most careful one. Part III
is what the book is sold on. It stays the largest part after the cut, and React and Next.js keep the
most chapters of anything in the book.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `React` | 13 files, 2,863 | Down to 10. Archive `12-testing-react` — Part IV owns testing. Merge `06-suspense-and-streaming` with `07-transitions-and-concurrency`. Fold `10-error-boundaries` into `09-performance-and-the-compiler` |
| `NextJS` | 11 files, 2,289 | Down to 8. Archive `10-migrating-to-the-app-router` — it dates fastest of anything in the book. Archive `06-images-fonts-and-assets`. Fold `09-deployment-and-runtime` into Part VIII |
| `Tooling` | 10 files, 1,967 | Down to 6. Merge `02-vite-and-the-dev-loop` with `03-rust-bundlers`. Archive `06-package-management` and `09-headless-primitives`. Move `08-web-components-and-interop` to Part II |
| `Svelte` | 7 files, 1,444 | Down to 4. Archive `02-reactivity-compared` and `06-adapters-and-deployment`. Fold `03-components-and-snippets` into `01-runes-model` |
| `Rendering` | 8 files, 1,449 | Down to 6. Fold `02-hydration-and-its-costs` into `01-rendering-spectrum`, and `05-seo-and-rendering` into `04-choosing-per-route` |
| `StateManagement` | 8 files, 1,571 | Down to 6. Archive `07-modelling-flows-as-machines`. Fold `06-signals-and-the-next-model` into `03-client-state` |

🔴 **Run `pnpm book:pages` before and after.** This is the part that carries the frontend-spine rule.
If Part III drops below 21.8% of the book, or Parts I–IV below 50%, the cut has gone too deep here and
has to come back out of Parts V–IX instead.

**Done when:** Part III reads ≤ 8,400 lines, it is still the largest part, the spine line in
`pnpm book:pages` is green, and the checklist is green.

---

### - [ ] 99. Cut Part IV — Frontend at Scale — to 4,000 lines `M`

From 5,559 lines across 28 files. Four sections, and testing is the one that overgrew.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `Frontend/Testing` | 8 files, 1,653 | Down to 5. Merge `02-vitest` with `03-react-testing-library` into one "writing the tests" chapter. Archive `06-test-driven-development`. Fold `07-visual-and-contract-testing` into `05-e2e-with-playwright` |
| `Frontend/WebPerformance` | 8 files, 1,680 | Down to 6. Fold `04-caching-strategies` into `05-asset-delivery`. Archive `06-rendering-and-streaming` — Part III teaches it better |
| `Frontend/Security` | 5 files, 943 | Down to 4. Fold `03-security-headers` into `02-content-security-policy` |
| `Frontend/Architecture` | 6 files, 1,209 | Down to 5. Fold `04-dependencies-and-upgrades` into `03-design-systems` |

Keep `05-reviewing-ai-generated-code` whole. It is one of the few chapters in print on a question
every 2027 loop now asks.

**Done when:** Part IV reads ≤ 4,000 lines, its `budget` overage is 0, and the checklist is green.

---

### - [ ] 100. Cut Part V — Backend for Frontend Engineers — to 4,000 lines `L`

From 6,500 lines across 35 files — a 38% cut, the largest share of any part except Part VIII. The
title of the part is the rule: this is backend **for a frontend engineer**, not a backend course.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `Backend/NodeJS` | 6 files, 1,133 | Down to 4. Archive `03-module-system`. Fold `02-streams-buffers` into `05-performance-and-scaling` |
| `Backend/Frameworks` | 4 files, 726 | Down to 3. Archive `02-nestjs` — a frontend-heavy engineer meets Express and edge runtimes, rarely Nest |
| `Backend/API` | 7 files, 1,485 | Down to 5. Fold `03-versioning` into `01-rest-best-practices`. Merge `06-trpc-typed-apis` into `02-graphql` as one chapter on typed API choices |
| `Backend/SQL` | 6 files, 1,087 | Down to 4. Fold `02-database-design` into `01-fundamentals`, and `05-orms-and-migrations` into `03-indexes-and-query-plans` |
| `Backend/NoSQL` | 3 files, 481 | Down to 2. Fold `02-redis` into `01-document-databases` as one chapter on picking a non-relational store |
| `Backend/Security` | 6 files, 1,222 | Down to 4. Fold `04-cors-csrf` into Part IV's security section, where the reader already is. Fold `03-authorisation` into `02-oauth` |
| `Backend/Testing` | 2 files, 293 | Down to 1 chapter, moved under `Backend/API` |

**Done when:** Part V reads ≤ 4,000 lines, its `budget` overage is 0, and the checklist is green.

---

### - [ ] 101. Cut Part VI — System Design — to 4,400 lines `M`

From 6,293 lines across 35 files. `BOOK-SPEC.md` § 5 names the case studies as an early cut, and the
building blocks carry three pairs that teach the same idea twice.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `SystemDesign/CaseStudies` | 6 files, 1,083 | Down to 4. Archive `02-ticketmaster` and `05-live-dashboard`. Keep the URL shortener, the feed and the collaborative editor — they cover the three shapes every other study reduces to |
| `SystemDesign/BuildingBlocks` | 10 files, 1,948 | Down to 7. Archive `05-search`. Fold `06-websockets` into `04-queues-and-async`, and `07-api-gateway` into `08-service-boundaries` |
| `SystemDesign/Database` | 5 files, 901 | Down to 3. Fold `02-replication` into `01-choosing-a-datastore`, and `04-transactions-at-scale` into `03-sharding` |
| `SystemDesign/Fundamentals` | 7 files, 1,314 | Down to 5. Fold `05-latency-and-throughput` into `03-scalability`, and `04-reliability` into `06-consistency-and-cap` |
| `SystemDesign/Frontend` | 6 files, 969 | Down to 5. Fold `04-seo-analytics` into Part IV |

⚠️ **Do not cut `01-driving-the-round`.** It is the chapter that makes the rest of the part usable in
an interview.

**Done when:** Part VI reads ≤ 4,400 lines, its `budget` overage is 0, and the checklist is green.

---

### - [ ] 102. Cut Part VII — AI Engineering — to 5,200 lines `M`

From 7,385 lines across 39 files. Part VII is the book's 2027 differentiator and it keeps that role —
but it was written six sections wide, and several chapters teach one idea between them.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `AI/Foundations` | 6 files, 1,086 | Down to 4. Fold `02-choosing-a-model` into `01-how-llms-behave`, and `04-embeddings-and-similarity` into the RAG retrieval chapter that needs it |
| `AI/Integration` | 7 files, 1,398 | Down to 6. Archive `06-multi-provider-architecture` — a gateway concern, and it dates fast |
| `AI/RAG` | 6 files, 1,169 | Down to 4. Fold `04-vector-stores` into `03-retrieval`, and `05-evaluating-retrieval` into the evals chapter in `Production` |
| `AI/Agents` | 6 files, 1,177 | Down to 4. Fold `03-memory-and-state` into `04-durability-and-long-running-work`, and `05-multi-agent-patterns` into `01-what-an-agent-actually-is` |
| `AI/Production` | 7 files, 1,373 | Down to 5. Fold `02-error-analysis-loops` into `01-evals`, and `04-cost-engineering` into `03-observability` |
| `AI/AIUX` | 5 files, 876 | Down to 3. Fold `04-failure-states` into `03-trust-and-correctness-ux`, and `01-designing-for-latency` into `02-generative-ui` |

Keep `01-evals`, `06-prompt-injection` and `07-ai-in-interviews` whole. Evals are the through-line of
the whole part, and the other two are the questions being asked right now.

**Done when:** Part VII reads ≤ 5,200 lines, its `budget` overage is 0, and the checklist is green.

---

### - [ ] 103. Cut Part VIII — Ship and Operate — to 3,400 lines `M`

From 5,495 lines across 27 files — the deepest proportional cut, and the spec already names this part
as the first place to take pages from. A frontend-heavy engineer ships, watches and rolls back. They
do not run the platform.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `ShipAndOperate/Containers` | 5 files, 1,067 | Down to 2. Merge `01-docker-fundamentals` with `02-building-and-hardening-images`. Archive `04-kubernetes-essentials` — § 6 puts Kubernetes operations out of scope, and this chapter is the last of it left in the book. Archive `03-docker-compose` |
| `ShipAndOperate/Git` | 5 files, 1,032 | Down to 3. Fold `04-repository-strategies` into `03-branching-and-review-workflow`, and trim `02-advanced-git` to the five commands that come up |
| `ShipAndOperate/Observability` | 4 files, 887 | Down to 3. Fold `03-alerting-and-on-call` into `02-metrics-and-dashboards` |
| `ShipAndOperate/Cloud` | 4 files, 734 | Down to 2. Fold `03-storage-and-delivery` into `01-fundamentals` |
| `ShipAndOperate/CICD` | 4 files, 852 | Down to 3. Fold `03-pipeline-security` into `02-github-actions` |
| `ShipAndOperate/Deployment` | 4 files, 860 | Down to 3. Fold `03-feature-flags` into `02-deployment-strategies-and-rollback` |

**Done when:** Part VIII reads ≤ 3,400 lines, its `budget` overage is 0, and the checklist is green.

---

### - [ ] 104. Cut Part IX — The Human Layer — to 1,800 lines `S`

From 2,500 lines across 13 files. The smallest part and the smallest cut — but two behavioural
chapters overlap, and one communication chapter is thin.

| Section | Now | Candidate |
| ------- | --- | --------- |
| `Behavioral` | 7 files, 1,434 | Down to 5. Fold `04-ways-of-working` into `02-leadership-and-conflict`, and `05-engineering-culture` into `06-influence-scope-and-saying-no` |
| `Communication` | 5 files, 992 | Down to 4. Fold `01-technical-communication` into `02-thinking-aloud` |

Keep `04-the-ai-assisted-interview` whole. It is the most current chapter in the part.

**Done when:** Part IX reads ≤ 1,800 lines, **`pnpm lint:docs` reports `budget` at 0 for the whole
book**, and the checklist is green.

---

### - [ ] 105. Plain English — Part I `M`

The cut is finished; now every surviving chapter gets read line by line. One part per session, nine
sessions, items #105–#113. They share one method:

| Do | Why |
| -- | --- |
| Break sentences over ~25 words into two | The standard's rule is 15–20 words |
| Cut clauses stacked on commas | One idea per sentence |
| Swap the long word for the everyday one — "use" not "utilise", "help" not "facilitate" | § 3 of the spec |
| Write "for example" and "such as", never "e.g." and "i.e." | Latin abbreviations stop a non-native reader cold |
| Say who does what — "React updates the DOM", not "the DOM is updated" | Active voice reads faster |
| Define a term in plain words the first time it appears | The reader may know the concept under a different name |

| Do not | Why |
| ------ | --- |
| Simplify the **idea** | The book stays senior. Only the sentences get shorter |
| Rewrite code, tables or diagrams | Those are not prose and the lint already governs them |
| Reflow a chapter that already reads well | A 28-word sentence that reads in one breath stays |

Part I measures **20.8 words a sentence with 105 sentences over 32 words** — the third-densest part.

**Done when:** every chapter in Part I has been read line by line, the part's average is inside 15–20
words a sentence, and `pnpm lint:docs`, `pnpm index:check` and `pnpm check:code-samples` are green.

---

### - [ ] 106. Plain English — Part II `M`

The densest part in the book: **21.5 words a sentence, 142 sentences over 32 words**. The method is in
item #105.

**Done when:** Part II has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 107. Plain English — Part III `L`

The longest part, at **19.0 words a sentence with 251 sentences over 32 words** — the most long
sentences of any part, simply because it is the biggest. Expect this one to run long. The method is in
item #105.

**Done when:** Part III has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 108. Plain English — Part IV `M`

Already the cleanest part at **18.5 words a sentence**, with 115 long sentences to break up. The method
is in item #105.

**Done when:** Part IV has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 109. Plain English — Part V `M`

**18.7 words a sentence, 122 long sentences.** The method is in item #105.

**Done when:** Part V has been read line by line, its average is inside 15–20 words a sentence, and the
three checks are green.

---

### - [ ] 110. Plain English — Part VI `M`

**19.3 words a sentence, 152 long sentences.** System design prose runs long because it qualifies
everything — watch for the "which means that… , which in turn…" chain. The method is in item #105.

**Done when:** Part VI has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 111. Plain English — Part VII `M`

The second-densest part: **21.1 words a sentence, 238 long sentences.** The AI chapters were written
fast and it shows in the rhythm. The method is in item #105.

**Done when:** Part VII has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 112. Plain English — Part VIII `M`

**19.2 words a sentence, 131 long sentences.** The method is in item #105.

**Done when:** Part VIII has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 113. Plain English — Part IX `S`

The smallest part: **19.8 words a sentence, 61 long sentences.** It is also the part a reader reads
last and most tired, so it earns the care. The method is in item #105.

**Done when:** Part IX has been read line by line, its average is inside 15–20 words a sentence, and
the three checks are green.

---

### - [ ] 113a. Soften the reading colours `S`

The book sets body text in pure black. On paper that is correct and normal. On a screen — which is
where a PDF is read — black on white at 10pt is the harshest pairing the design can produce, and it
is the first thing a reader feels after twenty minutes.

Move the ink one step off black. The page stays white, so nothing about printing changes.

| Token | Now | After | Used by |
| ----- | --- | ----- | ------- |
| `ink` | `gray 0.00` — `#000000` | **`gray 0.122`** — `#1F1F1F` | Body, chapter titles, H2, H3, rules, callout borders |
| `inklight` | `gray 0.65` — `#A6A6A6` | **`gray 0.60`** — `#999999` | Hairlines and table rules, so they stay a clear step below the softened ink |
| `inkmid`, `tintone`, `tinttwo` | — | unchanged | The greys are already tuned to each other |

**Three places hold a colour outside `tokens.tex`, and all three have to move together:**

| File | What it holds | Why it matters |
| ---- | ------------- | -------------- |
| `scripts/mermaid-theme.json` | Roughly thirty hardcoded `#000000` values | Mermaid has no include mechanism, so this is the one place the palette is written twice. Miss it and all 96 diagrams print darker than the text beside them |
| `scripts/epub.css` | `#1a1a1a` for body ink, in light and dark mode | Already soft, already correct in principle. Set it to the same `#1F1F1F` so one value means one thing |
| `site/.vitepress/config.ts` | The site's theme | VitePress ships its own dark mode. Check the body colour against the same value rather than redefining the theme |

🔴 **Changing the Mermaid theme invalidates the diagram cache.** `scripts/lua/mermaid.lua` caches by
content hash in `build/diagrams/`, so the next PDF re-renders all 96 diagrams two to four times each.
Expect a cold build of several minutes, once.

**Done when:** `pnpm book:specimen` builds clean and its body text reads `#1F1F1F`, `pnpm book:pdf`
builds with zero missing glyphs, the diagrams match the body ink, `pnpm book:epub` passes epubcheck,
and `pnpm site:build` is clean.

---

### - [ ] 113b. Give the built files meaningful names `S`

`build/handbook.pdf` says nothing once it is in somebody's Downloads folder. Four outputs get the
book's real name:

| Now | After |
| --- | ----- |
| `build/handbook.pdf` | `build/The-Senior-Full-Stack-Handbook.pdf` |
| `build/handbook.epub` | `build/The-Senior-Full-Stack-Handbook.epub` |

Two outputs, not four — **#95a** retires the companion, so `build/companion.*` no longer exists. If
#95a has not run yet when this item does, rename those two as well and expect to delete the rename in
#95a.

No version and no year in the name. The edition is on the title page, and a filename that carries a
version number has to be explained every time it changes.

**Logs and intermediates keep their short names** — `book.md`, `handbook.log`, `epubcheck.log`. They
are build scaffolding and nobody downloads them.

**Four files reference the old names and will break silently:**

| File | What breaks |
| ---- | ----------- |
| `scripts/build-book.sh` | Six `--output` paths and the echo lines that report them |
| `scripts/measure-pages.ts` | It reads `build/handbook.pdf` directly. Miss this and `pnpm book:pages` reports "not found" and exits |
| `CLAUDE.md` | The scripts table names `build/handbook.pdf` |
| `.github/workflows/lint-docs.yml` | Check whether any step names a built file |

Define the names once as shell variables at the top of `build-book.sh`, and export the same strings
from `scripts/lib/book.ts` for the TypeScript side, so the next rename is one edit rather than four.

**Done when:** `pnpm book:build` produces the named PDF and EPUB, `pnpm book:pages` finds the PDF and
reports normally, `pnpm test` is green, and nothing in the repo outside `Archive/` still says
`handbook.pdf`.

---

### - [ ] 114. Rebuild and measure the 940-page edition `M`

Everything has moved. This item puts the book back together and proves the number.

| Step | Command |
| ---- | ------- |
| Renumber every chapter across all nine parts | `pnpm number:chapters` |
| Regenerate the question index and the glossary cross-references | `pnpm index:questions` |
| Regenerate the companion site | `pnpm site:pages` |
| Build the PDF and the EPUB — one volume, since #95a | `pnpm book:build` |
| Measure | `pnpm book:pages` |
| Run everything CI runs | `pnpm lint:docs` · `pnpm test` · `pnpm check:code-samples` · `pnpm plan:check` |

Watch for the two things that a cut this size breaks quietly: **cross-references that now resolve to
the wrong chapter number**, and **part openers still listing chapters that are gone**. Both build
clean and are wrong.

**Done when:** the PDF builds with zero missing glyphs and zero unresolved cross-references, the page
count is **≤ 950**, the frontend spine line is green, and every CI check passes.

---

### - [ ] 115. Build the back cover and put the web address on it `M`

> 🔴 **A correction to this plan.** An earlier draft of this item said the cover's spine width comes
> from the page count. It does not. `scripts/cover.tex` is a **front cover only** — a 100 × 160mm
> ebook jacket at the 1:1.6 ratio the stores ask for, with no spine and no back. So the back cover is
> not an edit. It has to be built.

Add a second page to `scripts/cover.tex`, same trim, same typefaces, same tokens, carrying the four
things a back cover exists to carry:

| Block | Content |
| ----- | ------- |
| **The blurb** | Three short paragraphs: who the book is for, what it covers, what the reader can do at the end. Lift the promise from `BOOK-SPEC.md` § 2 rather than writing a new one |
| **What is inside** | The nine parts as a short list, with the real chapter and page count from #114 |
| **The author line** | Name, the one-line description from `About-the-Author.md` |
| **The web address** | At the foot, set in `inkmid` at `\tokSmallSize` — present, not shouting |

🔴 **The address is `<AUTHOR-URL>` and the author supplies it.** It is not in the repository: the only
links that exist today are `https://leanpub.com/` placeholders in `site/index.md` and
`site/.vitepress/config.ts`. **Do not invent one, and do not ship the placeholder.** Ask, then use
the same string in all three places so the site, the cover and the book agree.

Write it once as `\newcommand{\coverurl}{…}` beside the title and author commands, so the address
appears in exactly one place in the source.

**Done when:** `pnpm book:cover` produces a two-page PDF, both pages rasterise cleanly at thumbnail
size, the web address is the author's real one in the cover, `site/index.md` and
`site/.vitepress/config.ts`, and no `leanpub.com` placeholder is left.

---

### - [ ] 116. Update the launch material for the new edition `S`

The book is a different object now, and three things still describe the old one.

| What | Change |
| ---- | ------ |
| The store description | It sells a 1,370-page book. Rewrite around what the cut bought: one volume, readable end to end, at the real page count from #114 |
| `Preface.md` and `How-to-Read-This-Book.md` | The reading paths name chapters, and some of those chapters are now in `Archive/` |
| The companion site | `SAMPLE_CHAPTERS` in `scripts/build-site.ts` may point at a chapter that no longer exists |

**Done when:** the three documents describe the edition that now exists, `pnpm site:build` is clean,
and the launch checklist from #91 has been re-read against the new edition.

---

## ✅ Progress Tracker

| Phase | Items | Done | Status |
| ----- | ----- | ---- | ------ |
| 9 | 95–116 · 95a · 113a · 113b | 0/25 | 🚧 In progress |
| **Total** | **25** | **0/25** | **0%** |

> **Three items carry a letter**, all added on 2026-09-23 after the plan was numbered. **#95a** sits
> straight after the spec amendment because retiring the companion changes what every later item
> builds and indexes. **#113a** and **#113b** sit before #114 because the final build has to include
> them. `pnpm plan:next` sorts `95a` between `95` and `96`, and `113a` between `113` and `114`.

Phases 0–8 are closed. Their 104 items are recorded in
[`Archive/planning/improvement-plan-phases-0-8.md`](./Archive/planning/improvement-plan-phases-0-8.md).

---

## 🚦 If You Only Have Time for Five

In this order. This is the sequence that takes the most weight off the book fastest:

| Order | Item | Why |
| ----- | ---- | --- |
| 1 | #95 | The spec first. Nothing else can measure itself until the budgets change |
| 2 | #103 | Part VIII — the deepest cut, and the least painful. 2,095 lines, none of them missed |
| 3 | #100 | Part V — 2,500 lines of backend depth a frontend engineer is not asked for |
| 4 | #98 | Part III — the biggest single cut, and the one that needs the most care |
| 5 | #114 | Rebuild and measure. Without it, the cut is a claim rather than a number |

Those four cuts alone take about **10,000 lines — roughly 240 pages** — off the book.

**#113a, #113b and #115 do not depend on the cut.** They are placed late only because #114's final
build has to include them. If the black text is uncomfortable to read now, say _"do #113a"_ — it is a
short session and it makes every following session easier on the eyes.
