# Improvement Plan — Phase 11: The Bangla Web Edition

> **Purpose:** finish the Bangla edition of the web site at `www.salmanrahman.com/handbook/`. Every
> page is translated and the language switch is built. The owner read it (#128) and found it robotic,
> so what is left is re-translating every page into natural Bangla (#128a–#128z), then the deploy. The
> PDF and EPUB stay English.
>
> **This file holds only open work.** Finished items move to `Archive/planning/` with their
> **Delivered** blocks. This file is not part of the book; the book build skips it.

---

## ▶️ How to Resume — read this first, every session

Attach this file and say **"continue"**. Claude then does this:

| # | Step | What it means |
| - | ---- | ------------- |
| 1 | **Find the first unchecked item** | Run `pnpm plan:next` |
| 2 | **Read the whole item** | Its **Done when** line is the test, not advice |
| 3 | **Do that one item** | One item per session. No tidy-ups from other items |
| 4 | **Run the checks** | The item's **Done when**, plus `pnpm test` and `pnpm lint:docs` if `scripts/` or markdown changed. If something fails, say so and show the output |
| 5 | **Mark it done** | `- [ ]` → `- [x]`, add ` — ✅ **done YYYY-MM-DD**` to the heading, and write a short **Delivered:** block |
| 6 | **Update the counters** | The header counter and the Progress Tracker. Then run `pnpm plan:check` |
| 7 | **Report and stop** | Say what was done, what was verified, and what was left |

**An item is not finished until steps 5 and 6 are done.** If an item is wrong or blocked, **amend it
and say so.**

**Last updated:** 2026-10-19 · **Progress:** 27 / 28
**Owner:** Salman Rahman
**Locked spec:** [BOOK-SPEC.md](./BOOK-SPEC.md) — the authority. If this file and the spec disagree,
**the spec wins.**

---

## ✅ What Is Already Done

Every finished item is archived whole, with its **Delivered** block:

| Phases | What they did | Record |
| ------ | ------------- | ------ |
| **0–8** (#1–#94) | Turned interview notes into a finished, typeset book | [`improvement-plan-phases-0-8.md`](./Archive/planning/improvement-plan-phases-0-8.md) |
| **9–10** (#95–#122) | Cut it to 903 pages, rewrote it in plain English, got it ready to print | [`improvement-plan-phases-9-11.md`](./Archive/planning/improvement-plan-phases-9-11.md) |
| **11** (#123–#127, #129) | The spec, shared routing, the validator, `site:translate`, the locale and switcher, all 222 pages translated | the same file |

---

## 🌐 How the Bangla Edition Works

```
manuscript (English) ──▶ Claude, in Claude Code sessions ──▶ pnpm site:translate --write ──▶ i18n/bn/**  (committed cache)
manuscript + i18n/bn ──▶ pnpm site:build ──▶ /handbook/book/** (en)  +  /handbook/bn/book/** (bn)
```

- **Translation runs in Claude Code sessions, never through the API.** Its output is committed. The
  rules for translators are in `i18n/TRANSLATION-BRIEF.md`; chapter titles come from
  `i18n/titles.bn.json`
- **The cache key is a SHA-256 of the English body.** Edit a chapter and only that page goes stale;
  `pnpm site:translate --list` names it
- **A stale or missing page falls back to English** with a Bangla notice, so a Bangla link never 404s
- **Code never changes.** Fences, inline code, link targets, Mermaid source and the `**Q: **` markers
  come back byte-identical, or the validator refuses the page

---

## 🧠 Model and Effort per Item

| Items | Model | Effort | Why |
| ----- | ----- | ------ | --- |
| 128, 128a–128z, 130 | **Opus 5.5** `claude-opus-5-5` | `high` | Natural Bangla needs the strongest writer; docs and a deploy checked against the live site |

`pnpm plan:next` reads this table. Edit the table, not `scripts/plan-status.ts`.

---

# Phase 11 — Open Items

### - [x] 128. The owner reads the Bangla edition `M` — ✅ **done 2026-10-13**

All 222 pages are translated (#129). This item is the quality gate that was meant to come first: the
owner reads at least three chapters in Bangla on the site, and anything flagged (terms that should
have stayed English, a tone that is too formal, broken tables) goes into `i18n/TRANSLATION-BRIEF.md`.
The affected pages are then translated again through `site:translate --source` / `--write`.

**Done when:** the owner has said the quality is good enough. Every change to the brief is written in
the **Delivered** block, with the reason. `pnpm site:translate --check` passes.

**Delivered:**

- **The owner's verdict on the first pass:** _"translation is bit robotic. it should be more natural
  language in bangla. when anyone read he feel that he is reading a bangla book."_
- **Brief change:** `i18n/TRANSLATION-BRIEF.md` gains **"Write Bangla, not translated English"**.
  It is a table of the translationese habits in the first pass and what to write instead: `একটি`
  used as an English article, English word order, stiff verbs such as `পরিণত করে` and `গণ্য হয়`,
  `সে` for things, noun stacks, and missing connectives. It also covers `-টা` over `-টি` in prose,
  and how to keep the validator's backtick count without repeating an identifier. **Reason:** the
  owner's verdict above. The old rules said "natural" but gave no examples, and the first pass did
  not reach it
- **The sample:** `part-1/closures`, the brief's reference page, was re-translated to that standard.
  **The owner approved it the same day** (_"yes its looks good"_). The first-pass version is in git
  at `bfccbc5`
- **The other 221 pages are split into #128a–#128z**, one session each, so the work fits the owner's
  usage limit. `--check` cannot tell a first-pass page from a re-translated one, because the English
  did not change. Those checkboxes are the only record of which pages are done
- **Not fixed, still open** (see Open Notes): prose inside fences stays English, the
  `realtime-streaming` inline code bug, and whether *warm / warm up* stays English
- `pnpm site:translate --check`: 222 fresh, 0 invalid

---

## Re-translating to natural Bangla — #128a–#128z

Every page approved before #128 is in the first-pass style. Each item below re-translates one
balanced batch of about 1,500–2,000 Bangla lines, in book order. **Per page:**

```bash
pnpm -s site:translate --source=/book/<route> > en.md     # route as listed, e.g. part-1/generics
# write bn.md fresh from en.md, to the brief — do not edit the old Bangla line by line
pnpm site:translate --write=/book/<route> --from=bn.md
```

Read `i18n/TRANSLATION-BRIEF.md` and `i18n/bn/book/part-1/closures.md` at the start of every
session. **Translate from the English, not from the old Bangla.** Patching the first pass keeps its
sentence shapes, and the sentence shapes are the problem. Put en.md and bn.md in the scratchpad,
never the repo. If a session runs out before its batch is done, list the finished pages under the
item and leave it unticked.

These items do not block #130, which can be done at any time. The site already serves every page.

---

### - [x] 128a. Natural Bangla: Front matter and Part 1 (1 of 2) `M` — ✅ **done 2026-10-13**

11 pages, about 1720 Bangla lines:

`front/preface` · `front/how-to-read-this-book` · `part-1/part-foundations` · `part-1/frontend-javascript-index` · `part-1/data-types-variables` · `part-1/this-keyword` · `part-1/prototypes-inheritance` · `part-1/promises-async` · `part-1/event-loop` · `part-1/frontend-typescript-index` · `part-1/basic-types`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 11 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Every one passed the validator on the first attempt
- The two front-matter pages now use their mapped titles from `i18n/titles.bn.json` in the `#` heading
  (the first pass left `# Preface` and `# How to Read This Book` in English)
- One deliberate adaptation: the Preface's "the spelling is British" now reads as the *English*
  edition's spelling, since the sentence is otherwise false of a Bangla page
- No brief changes. Counting words follow the `-টি` rule; no `দুটো`/`তিনটে`/`পাঁচটা` in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128b. Natural Bangla: Front matter and Part 1 (2 of 2) `M` — ✅ **done 2026-10-14**

9 pages, about 1729 Bangla lines:

`part-1/interfaces-types` · `part-1/generics` · `part-1/type-guards` · `part-1/advanced-types` · `part-1/typescript-at-scale` · `part-1/backend-design-patterns-index` · `part-1/composition-over-inheritance` · `part-1/solid-principles` · `part-1/design-patterns-in-typescript`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 9 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Eight passed on the first attempt; `advanced-types` was refused once for
  one extra `` `Pick` `` span (a repeat mention the English leaves implicit) and passed once it was
  written plainly
- Numbers stay in Western grouping (`200,000`, not the Bangla lakh form `2,00,000`)
- SOLID and pattern section headings (`Single Responsibility (SRP)`, `Strategy`, `Observer`, …) stay in
  English, since they are the names engineers use; the surrounding prose is Bangla
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা` or `পরিণত করে` in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128c. Natural Bangla: Part 2 (1 of 2) `M` — ✅ **done 2026-10-14**

10 pages, about 1773 Bangla lines:

`part-2/part-browser-platform` · `part-2/frontend-html-css-index` · `part-2/semantic-html` · `part-2/advanced-css` · `part-2/container-queries-and-layers` · `part-2/animation-and-view-transitions` · `part-2/frontend-browser-apis-index` · `part-2/storage-apis` · `part-2/cookies-same-site` · `part-2/observer-apis`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 10 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Nine passed on the first attempt; `semantic-html` was refused once for
  one extra `` `<div>` `` span (a repeat mention the English leaves implicit) and passed once that
  mention was written plainly
- The two part-index headings now use their mapped titles (`Part II — Browser Platform`,
  `Part II — Browser API`) rather than the English
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা` or `পরিণত করে` in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128d. Natural Bangla: Part 2 (2 of 2) `M` — ✅ **done 2026-10-17**

9 pages, about 1886 Bangla lines:

`part-2/web-workers` · `part-2/service-workers` · `part-2/i18n-fundamentals` · `part-2/frontend-accessibility-index` · `part-2/accessibility-and-the-law` · `part-2/accessibility-tree` · `part-2/aria` · `part-2/keyboard-and-focus` · `part-2/accessible-forms`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 9 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Eight passed on the first attempt; `accessibility-tree` was refused once
  for one missing `` `div` `` span (written plainly in the Bangla) and passed once the backticks
  were restored
- Law and standard names (European Accessibility Act, WCAG success-criterion titles such as
  `2.4.11 Focus Not Obscured`), ARIA pattern names and dates such as `28 June 2025` stay in English,
  since they are what an audit or procurement form uses; the prose around them is Bangla
- Country and language names in `i18n-fundamentals` are in Bangla (জার্মান, রুশ, আরবি); the quoted
  English example sentences stay English, because they are the thing being translated
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128e. Natural Bangla: Part 3 (1 of 5) `M` — ✅ **done 2026-10-17**

8 pages, about 1556 Bangla lines:

`part-3/part-modern-frontend-stack` · `part-3/modern-stack-react-index` · `part-3/react-mental-model` · `part-3/react-hooks-in-depth` · `part-3/when-not-to-use-effect` · `part-3/react-composition-patterns` · `part-3/server-components-vs-client-components` · `part-3/suspense-and-streaming`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Seven passed on the first attempt;
  `server-components-vs-client-components` was refused once for one extra `` `Footer` `` span (a
  repeat mention the English leaves implicit) and passed once it was written plainly
- React API and concept names (Server Component, Suspense boundary, Server Function, `'use client'`,
  hydration, transition) stay in English, as the brief's term list does for React itself
- A pass for `সে` used of things (component, effect, compiler) found six in this batch and two in
  #128d's `i18n-fundamentals` and `aria`; all eight were rewritten and re-written through `--write`.
  First-pass pages later in Part 3 still have them; their own batches will replace those
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128f. Natural Bangla: Part 3 (2 of 5) `M` — ✅ **done 2026-10-17**

8 pages, about 1717 Bangla lines:

`part-3/react-actions-and-forms` · `part-3/react-performance-and-the-compiler` · `part-3/react-typescript-at-scale` · `part-3/modern-stack-nextjs-index` · `part-3/app-router-mental-model` · `part-3/nextjs-data-and-caching` · `part-3/server-actions` · `part-3/rendering-in-nextjs`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with #128g–#128j, one subagent per batch. Seven passed
  on the first attempt; `react-typescript-at-scale` was refused once for two extra spans (repeat
  mentions of `` `React.FC` `` and `` `children` ``) and passed once those were written plainly
- Three `সে` used of things (the compiler, a Server Action) were rewritten after the write
- "Moving target" callouts read `**যা বদলাতে থাকে**`. Partial Prerendering's "holes" are `ফাঁকা জায়গা`
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128g. Natural Bangla: Part 3 (3 of 5) `M` — ✅ **done 2026-10-17**

9 pages, about 1702 Bangla lines:

`part-3/nextjs-middleware-and-the-edge` · `part-3/nextjs-auth-patterns` · `part-3/route-handlers-and-the-bff` · `part-3/modern-stack-svelte-index` · `part-3/svelte-runes` · `part-3/sveltekit-routing-and-loading` · `part-3/sveltekit-form-actions` · `part-3/modern-stack-rendering-index` · `part-3/rendering-spectrum`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 9 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. All nine passed on the first attempt
- Headings use their mapped titles. Framework terms (middleware, edge, cold start, `warm`, BFF, Route
  Handler, rune, snippet, load, form action, hydration, islands, resumability, the rendering
  acronyms) stay in English
- Section-index tables use the column headers `অধ্যায়` and `কোন প্রশ্নের উত্তর দেয়`
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে`, গরম or `সে` for things in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128h. Natural Bangla: Part 3 (4 of 5) `M` — ✅ **done 2026-10-17**

8 pages, about 1562 Bangla lines:

`part-3/streaming-html` · `part-3/choosing-per-route` · `part-3/edge-vs-origin-rendering` · `part-3/choosing-a-meta-framework` · `part-3/modern-stack-state-management-index` · `part-3/four-kinds-of-state` · `part-3/server-state` · `part-3/client-state`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. All eight passed on the first attempt
- `সে` used of things in four pages (`client-state`, `choosing-per-route`, `edge-vs-origin-rendering`,
  `modern-stack-state-management-index`) was rewritten and re-written through `--write`. The
  demonstrative `সে বিষয়ে` stays
- State terms (stale, cache, invalidate, store, atom, selector, signal) stay in English. The
  client-state "ladder" and its "rungs" are `মই` and `ধাপ`
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128i. Natural Bangla: Part 3 (5 of 5) `M` — ✅ **done 2026-10-17**

8 pages, about 1558 Bangla lines:

`part-3/form-state` · `part-3/url-as-state` · `part-3/modern-stack-tooling-index` · `part-3/modules-and-bundling` · `part-3/vite-and-the-dev-loop` · `part-3/monorepos` · `part-3/type-checking-and-linting` · `part-3/styling-strategy`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. All eight passed on the first attempt
- Tooling terms (bundler, tree shaking, HMR, dev server, monorepo, workspace, task graph, remote
  cache, barrel file, chunk, source map, CSS Modules, design token) stay in English
- "Verdict" columns read `রায়`; "durable principle" is `টেকসই নীতি`. `গরমিল` became `অমিল`, so a
  search for গরম stays clean
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা` or `পরিণত করে` in the batch; `সে` only for people
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128j. Natural Bangla: Part 4 (1 of 2) `M` — ✅ **done 2026-10-17**

10 pages, about 1771 Bangla lines:

`part-4/part-frontend-at-scale` · `part-4/frontend-architecture-index` · `part-4/frontend-architecture-patterns` · `part-4/micro-frontends` · `part-4/design-systems-at-scale` · `part-4/reviewing-ai-generated-code` · `part-4/frontend-web-performance-index` · `part-4/core-web-vitals` · `part-4/loading-and-code-splitting` · `part-4/asset-delivery`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 10 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. All ten passed on the first attempt
- Performance and architecture terms (micro-frontend, design system, Core Web Vitals, LCP/INP/CLS,
  code splitting, CDN, remote/shell, token, codemod, budget, `warm`) stay in English
- "Security theatre" is `নিরাপত্তার অভিনয়`; "load-bearing" is `ভার বহনকারী`. In the AI-review
  version-drift row the inline-code order (`FID` before `INP`) is kept to satisfy the validator
- Every `সে` used of a thing was rewritten. No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`,
  `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128k. Natural Bangla: Part 4 (2 of 2) `M` — ✅ **done 2026-10-17**

10 pages, about 1953 Bangla lines:

`part-4/measuring-in-production` · `part-4/frontend-security-index` · `part-4/xss-prevention` · `part-4/content-security-policy` · `part-4/frontend-testing-index` · `part-4/testing-strategy` · `part-4/vitest` · `part-4/frontend-integration-testing` · `part-4/end-to-end-testing` · `part-4/testing-accessibility`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 10 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with #128l–#128o, one subagent per batch. All ten
  passed on the first attempt
- Security and testing terms (XSS, sink/source, sanitise, nonce, allowlist, CSP directives, HSTS,
  stub/spy/mock/fake, flaky, quarantine, coverage, snapshot, locator, contract testing, session
  replay, VPAT/ACR) stay in English
- "Layer" is `স্তর`, "defence in depth" `কয়েক স্তরের প্রতিরক্ষা`, "escape hatches" `ফাঁকফোকর`, a data
  "leak" `ফাঁস`. The XSS "crossings" are `সীমানা`. That is a translation of *crossing*, not the term
  *boundary*, which the brief keeps in English
- Two `সে` used of things (Lighthouse, a browser) were rewritten before the write; the demonstrative
  `সে কারণেই` stays. No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128l. Natural Bangla: Part 5 (1 of 2) `M` — ✅ **done 2026-10-17**

10 pages, about 1841 Bangla lines:

`part-5/backend-index` · `part-5/backend-nodejs-index` · `part-5/event-loop-async` · `part-5/nodejs-performance` · `part-5/express` · `part-5/backend-api-index` · `part-5/rest-best-practices` · `part-5/graphql` · `part-5/rate-limiting` · `part-5/realtime-streaming`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 10 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with #128k and #128m–#128o, one subagent per batch.
  Nine passed on the first attempt; `realtime-streaming` was refused once for one missing
  `` `user:<id>` `` span (a repeat mention written plainly) and passed once the backticks were back
- The broken English span in `realtime-streaming` (`` `io.to(`user:${id}`).emit()` ``) is copied
  byte for byte. The English is untouched, so the Open Note still stands
- Runtime and API terms (event loop, microtask, thread pool, backpressure, worker thread, middleware,
  resolver, DataLoader, token bucket, sliding window, fail open, sticky session, idempotency, cursor
  pagination, `cold start`) stay in English. "Fire-and-forget" is `ছুড়ে দিয়ে ভুলে যায়`; "a million
  rows" is `দশ লাখ row`
- Six `সে` used of things (a promise source, clients in `realtime-streaming` and `rate-limiting`) were
  rewritten and re-written through `--write`. No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`,
  `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128m. Natural Bangla: Part 5 (2 of 2) `M` — ✅ **done 2026-10-17**

11 pages, about 1990 Bangla lines:

`part-5/testing-node-services` · `part-5/part-sql-and-relational-data` · `part-5/sql-fundamentals` · `part-5/indexes` · `part-5/sql-transactions` · `part-5/backend-nosql-index` · `part-5/document-databases` · `part-5/backend-security-index` · `part-5/credentials-and-sessions` · `part-5/oauth` · `part-5/backend-input-validation`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 11 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with #128k, #128l, #128n and #128o, one subagent per
  batch. Ten passed on the first attempt; `sql-transactions` was refused once for one extra
  `` `READ COMMITTED` `` span (the English has plain "read-committed") and passed once it was written
  plainly
- Database and security terms (B-tree, query plan, ORM, isolation level, lost update, MVCC, embed /
  reference, system of record, JWT, refresh token, CSRF, CORS, PKCE, RBAC/ABAC, mass assignment,
  SSRF, prototype pollution) stay in English. Isolation-level table cells read `হতে পারে` / `না`
- Three `সে` used of things (a transaction, a lock holder) were rewritten before the write. No brief
  changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- **Not verified in the repo:** the secrets hook blocks any file named `credentials*`, so the
  banned-form grep could not read `i18n/bn/book/part-5/credentials-and-sessions.md`. It was run on
  the scratchpad draft that `--write` took instead
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128n. Natural Bangla: Part 6 (1 of 3) `M` — ✅ **done 2026-10-17**

8 pages, about 1289 Bangla lines:

`part-6/system-design-index` · `part-6/part-system-design-fundamentals` · `part-6/driving-the-round` · `part-6/back-of-envelope-estimation` · `part-6/scalability` · `part-6/consistency-and-cap` · `part-6/part-system-design-building-blocks` · `part-6/load-balancing`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with #128k–#128m and #128o, one subagent per batch.
  All eight passed on the first attempt
- System-design terms (shard, replica, quorum, failover, fan-out, hedged request, p50/p99, SLO,
  error budget, RPO/RTO, sticky session, the RADIO steps, CAP/PACELC, the consistency model names)
  stay in English. The scaling "ladder of levers" is `উপায়ের মই` with `ধাপ`, as in #128h; the
  consistency "spectrum" is `বর্ণালি`
- Index pages use `## অংশগুলো` with `অংশ | অধ্যায় | কী নিয়ে`, and chapter tables use `অধ্যায়` /
  `কোন প্রশ্নের উত্তর দেয়`. One sentence says "a million" as the words `দশ লাখ`; digits stay in
  Western grouping
- No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে`, গরম or `সে` for things in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128o. Natural Bangla: Part 6 (2 of 3) `M` — ✅ **done 2026-10-17**

7 pages, about 1398 Bangla lines:

`part-6/caching` · `part-6/cdn` · `part-6/message-queues` · `part-6/service-boundaries` · `part-6/resilience-patterns` · `part-6/part-system-design-database` · `part-6/choosing-a-datastore`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 7 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with #128k–#128n, one subagent per batch. All seven
  passed on the first attempt
- Caching, CDN, queue and resilience terms (hit ratio, TTL, cache-aside, stampede, jitter, `warm`,
  PoP, origin shielding, at-least-once, idempotent, dead letter queue, back-pressure, saga, BFF,
  service mesh, bulkhead, circuit breaker, load shedding, replica lag, split brain, ACID/BASE) stay
  in English
- "Verdict" columns read `রায়`, as in #128i; "the seam" is `জোড়ের জায়গা`; store "families" are
  `পরিবার`. Headings use their mapped titles
- Three `সে` used of things (CDN, edge, gateway) were rewritten before the write. No brief changes.
  No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128p. Natural Bangla: Part 6 (3 of 3) `M` — ✅ **done 2026-10-19**

9 pages, about 1491 Bangla lines:

`part-6/sharding` · `part-6/part-frontend-system-design` · `part-6/frontend-real-time-features` · `part-6/offline-first-architecture` · `part-6/frontend-authentication` · `part-6/part-system-design-case-studies` · `part-6/design-url-shortener` · `part-6/design-collaborative-editor` · `part-6/design-infinite-feed`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 9 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other five of #128p–#128u, one subagent per batch. All nine passed on the first attempt
- Sharding, real-time, offline, auth and case-study terms (shard key, consistent hashing,
  scatter-gather, saga, outbox, SSE, backoff, jitter, CRDT/OT, tombstone, last-write-wins, silent
  refresh, refresh-token rotation, cursor pagination, virtualisation, base62, `warm-up`) stay in English
- "Shape" of a problem is `ধাঁচ` (the case-studies column reads `যে ধাঁচ শেখায়`); short- and
  long-lived tokens are `স্বল্পায়ু` / `দীর্ঘায়ু`; a stampede is `হুড়োহুড়ি`
- Three `সে` used of things (all in `frontend-real-time-features`) were rewritten before the write;
  the demonstratives `সে বিষয়ে` / `সে কারণেই` stay. No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`,
  `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128q. Natural Bangla: Part 7 (1 of 3) `M` — ✅ **done 2026-10-19**

10 pages, about 1726 Bangla lines:

`part-7/part-ai-engineering` · `part-7/ai-foundations-index` · `part-7/how-llms-behave` · `part-7/prompting-as-engineering` · `part-7/context-engineering` · `part-7/ai-integration-index` · `part-7/calling-an-llm-from-typescript` · `part-7/streaming-responses` · `part-7/structured-output` · `part-7/tool-calling`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 10 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other five of #128p–#128u, one subagent per batch. All ten passed on the first attempt
- AI and integration terms (token, context window, system prompt, temperature, eval, golden set,
  prompt caching, compaction, constrained decoding, JSON mode, repair loop, tool call, dispatcher,
  approval gate, SSE, backpressure) stay in English
- "The Running Project" is `## চলমান Project`, used the same way in #128r and #128s. "Constrained" is
  `বাঁধা`; "untrusted" `অবিশ্বস্ত`; "Moving target, by construction" `যা বদলাতে থাকে, আর সেটা স্বভাবগতভাবেই`
- A `পরিণত করে`, a `দুটো` and three `সে` used of things were fixed before the write; a `তাকে` used of
  a subscriber in `streaming-responses` was fixed after it and the page re-written. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128r. Natural Bangla: Part 7 (2 of 3) `M` — ✅ **done 2026-10-19**

9 pages, about 1547 Bangla lines:

`part-7/model-context-protocol` · `part-7/ai-rag-index` · `part-7/when-rag-when-fine-tune-when-neither` · `part-7/ingestion-and-chunking` · `part-7/retrieval` · `part-7/ai-agents-index` · `part-7/what-an-agent-actually-is` · `part-7/durability-and-long-running-work` · `part-7/ai-production-index`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 9 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other five of #128p–#128u, one subagent per batch. All nine passed on the first attempt
- MCP, RAG and agent terms (host/client/server, transport, `stdio`, trust boundary, chunk, embedding,
  recall@k, reranker, BM25, HNSW, pgvector, agent loop, step limit, orchestrator, handoff,
  checkpoint, idempotency key, durable workflow) stay in English
- Index pages use `## চলমান Project` with `অধ্যায় | Assistant-এ কী যোগ হয়`. "Stop condition" is
  `থামার শর্ত`, "stale" `বাসি`, "ten million" `এক কোটি`. In `durability-and-long-running-work` the
  inline-code order (`setStatus('sent')` before `incrementCounter()`) is kept for the validator
- Six `সে` used of things and a `দুটো` were fixed before the write; four counting `একটা` became `একটি`
  after it and three pages were re-written. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128s. Natural Bangla: Part 7 (3 of 3) `M` — ✅ **done 2026-10-19**

8 pages, about 1693 Bangla lines:

`part-7/evals` · `part-7/observability` · `part-7/guardrails-and-safety` · `part-7/prompt-injection` · `part-7/ai-aiux-index` · `part-7/generative-ui` · `part-7/trust-and-correctness-ux` · `part-7/ai-in-interviews`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other five of #128p–#128u, one subagent per batch. All eight passed on the first attempt
- All 8 were then re-written once more to move about 170 counting `একটা` (and three `পাঁচটা`) to the
  `-টি` form; every rewrite passed
- Eval, safety and AI-UX terms (golden set, grader, LLM-as-judge, rubric, holdout, guardrail,
  over-refusal, prompt injection, lethal trifecta, exfiltration channel, egress allow-list, citation
  chip, `warm`) stay in English. "Calibrated trust" is `মাপা বিশ্বাস`; "disclaimer theatre"
  `disclaimer-এর অভিনয়`, after #128k; "exfiltration" `data পাচার`
- Three `সে` and two `তাকে` used of things were rewritten; `সে` for the attacker and `সে কারণেই` stay.
  `পরিণত অবস্থায়` in `evals` became `পোক্ত হলে`. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128t. Natural Bangla: Part 8 (1 of 2) `M` — ✅ **done 2026-10-19**

9 pages, about 1593 Bangla lines:

`part-8/ship-and-operate-index` · `part-8/ship-git-index` · `part-8/git-fundamentals` · `part-8/branching-and-review-workflow` · `part-8/ship-cicd-index` · `part-8/cicd-fundamentals` · `part-8/docker-fundamentals` · `part-8/github-actions` · `part-8/ship-observability-index`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 9 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other five of #128p–#128u, one subagent per batch. All nine passed on the first attempt
- Git, CI/CD, container and pipeline-security terms (rebase, reflog, bisect, pipeline, artefact,
  quality gate, flaky, image, layer, distroless, digest, SBOM, OIDC, reusable workflow, provenance,
  the DORA metric names, trunk-based, GitFlow) stay in English
- Long- and short-lived credentials are `দীর্ঘমেয়াদি` / `স্বল্পমেয়াদি`; "least privilege" is `ন্যূনতম
  অধিকার`; "compromised" `বেহাত`. The part opener's sections table follows #128n
- Three `সে` used of things (in `github-actions` and `docker-fundamentals`) were rewritten and those
  pages re-written. No brief changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128u. Natural Bangla: Part 8 (2 of 2) `M` — ✅ **done 2026-10-19**

8 pages, about 1701 Bangla lines:

`part-8/monitoring-fundamentals` · `part-8/metrics-and-dashboards` · `part-8/ship-cloud-index` · `part-8/cloud-fundamentals` · `part-8/serverless-functions` · `part-8/ship-deployment-index` · `part-8/platform-deploys` · `part-8/deployment-strategies`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 8 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other five of #128p–#128u, one subagent per batch. All eight passed on the first attempt
- Six pages were re-written once to drop `একটি` used as an English article (305 down to 134 across the
  batch), keeping it where it means "one"; every rewrite passed
- Observability, cloud and deployment terms (cardinality, histogram, SLI/SLO, error budget, burn rate,
  runbook, presigned URL, cold start, `warm`, dead-letter queue, version skew, blue/green, canary,
  feature flag, expand/contract) stay in English. The managed-service ladder is `মই` / `ধাপ`, as in
  #128h; "one-way doors" `একমুখী দরজা`; "tradeoff" `লাভ-ক্ষতি`
- One `পরিণত হয়` was reworded before the write and one `সে` used of a provider after it. No brief
  changes. No `দুটো`/`তিনটে`/`চারটে`/`পাঁচটা`, `পরিণত করে` or গরম in the batch
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128v. Natural Bangla: Part 9 `M` — ✅ **done 2026-10-19**

10 pages, about 1716 Bangla lines:

`part-9/part-human-layer` · `part-9/behavioral-index` · `part-9/star-framework` · `part-9/leadership-teamwork` · `part-9/problem-solving` · `part-9/engineering-culture` · `part-9/communication-index` · `part-9/thinking-aloud` · `part-9/written-communication` · `part-9/ai-assisted-interview`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 10 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other four of #128v–#128z, one subagent per batch. All ten passed on the first attempt
- Behavioural and communication terms (the STAR parts, story bank, coverage grid, escalation,
  blameless post-mortem, psychological safety, WIP limit, cycle time, the DORA names, on-call, bus
  factor, ADR, RFC, BLUF, SBI) stay in English. The interviewer is `তিনি` / `তাঁরা`, the reader `আপনি`
- "Trade-off" is `লাভ-ক্ষতি`, as in #128u; "narration" `ধারাবিবরণী`; "judgement" `বিচারবুদ্ধি`; the
  debugging beats `পর্যবেক্ষণ / অনুমান / যাচাই / প্রতিরোধ`. Fenced STAR stories stay English (Open Notes)
- Three `সে` and one `ওর` used of a model were fixed before the write; `ওরাই` for grid cells and `তাকে`
  for a practice after it, and two pages re-written. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128w. Natural Bangla: Book 2 (part-10) (1 of 3) `M` — ✅ **done 2026-10-19**

7 pages, about 1508 Bangla lines:

`part-10/dsa-index` · `part-10/time-and-space-complexity` · `part-10/prefix-sum` · `part-10/two-pointers` · `part-10/sliding-window` · `part-10/fast-and-slow-pointers` · `part-10/in-place-linked-list-reversal`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 7 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other four of #128v–#128z, one subagent per batch. All seven passed on the first attempt
- All 7 were re-written once more after the sweep moved 53 `একটা` to a `-টি` count or dropped them
  where they only copied "a/an"; every rewrite passed
- Algorithm terms (array, pointer, window, hash map, linked list, prefix sum, invariant, subarray,
  dummy node, off-by-one, `warm-up`) and LeetCode problem names stay in English. "Shape" is `ধাঁচ`, as
  in #128p; "signal" `সংকেত`; a list's "tail" `লেজ`. Practice tables read `কঠিনতা | কী অনুশীলন হয়`
- Two people-words used of indices and values (`যারা`, `কারও`) were reworded. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128x. Natural Bangla: Book 2 (part-10) (2 of 3) `M` — ✅ **done 2026-10-19**

5 pages, about 1381 Bangla lines:

`part-10/monotonic-stack` · `part-10/top-k-elements` · `part-10/overlapping-intervals` · `part-10/modified-binary-search` · `part-10/binary-tree-traversal`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 5 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other four of #128v–#128z, one subagent per batch. All five passed on the first attempt
- Stack, heap, interval, binary-search and tree terms (min-heap, deque, sweep line, predicate, answer
  space, BST, the traversal orders, quickselect, sentinel) stay in English. "kth" is `k-তম`
- Daily Temperatures' "warmer day" is `তাপমাত্রা বাড়তে আর কত দিন বাকি`, so গরম stays out. Clock times
  keep `-টা`, as the brief allows
- A `সে`, two `তাকে` and a `তাদের` used of elements and bars, one `একটা` and nine article `একটি` were
  fixed; four pages re-written. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128y. Natural Bangla: Book 2 (part-10) (3 of 3) `M` — ✅ **done 2026-10-19**

5 pages, about 1568 Bangla lines:

`part-10/depth-first-search` · `part-10/breadth-first-search` · `part-10/backtracking` · `part-10/dynamic-programming` · `part-10/graph-algorithms`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 5 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other four of #128v–#128z, one subagent per batch. All five passed on the first attempt
- Graph, backtracking and DP terms (DFS/BFS, pruning, memoisation, tabulation, recurrence, base case,
  topological sort, in-degree, Dijkstra, Bellman-Ford, Union-Find, frontier, back edge) stay in English
- "Prune" is `ছেঁটে ফেলা`; "settled node" `হিসাব মিটে যাওয়া node`; a state's "shape" `গড়ন`
- Five `একটা` and two `সে` used of things (the FIFO queue, BFS itself) were fixed and four pages
  re-written. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [x] 128z. Natural Bangla: Back matter `M` — ✅ **done 2026-10-19**

5 pages, about 1551 Bangla lines:

`back/glossary` · `back/further-reading` · `back/dsa-question-index` · `back/interview-question-index` · `back/about-the-author`

**Done when:** every page above is re-translated to the brief's **"Write Bangla, not translated
English"** standard and written through `--write`. `pnpm site:translate --check` passes.

**Delivered:**

- All 5 pages re-translated from the English (`--source`), not patched from the first pass, and
  written through `--write`. Done in parallel with the other four of #128v–#128z, one subagent per batch. All five passed on the first attempt
- Glossary terms stay in English, with Bangla definitions that start from the bare noun rather than an
  article `একটি`. Further-reading titles stay English; its tiers are `মূল উৎস` / `গভীরতা` / `অনুশীলন`
- About-the-author uses `লেখক` throughout, with no gendered pronoun
- The interview index's 647 questions were matched in order against each chapter's Bangla `**Q:`
  line, and 108 were rewritten to drop article `একটি`. **Not fully aligned:** the indexes were
  written while #128v–#128y ran, so the 87 DSA questions and a few Part IX questions may differ
  slightly from the new chapter wording (see Open Notes)
- One `সে` and one `তাকে` used of things and three article `একটা` were fixed. No brief changes
- `pnpm site:translate --check`: 222 fresh, 0 stale, 0 invalid, 0 missing

---

### - [ ] 130. Document it, deploy it, and check it live `S`

- **`CLAUDE.md`:** add `site:translate` to Scripts, and point at `i18n/TRANSLATION-BRIEF.md`. In the
  web-edition paragraph, say that `i18n/bn/` is a generated cache (hand-fix a page only if you accept
  that a re-translation overwrites it), that `site/bn/book/**` is generated and gitignored, and that
  `site/bn/index.md` is hand-written and guarded
- **`site/building-this-book.md`:** a short section on how the Bangla edition is made, and that it is
  machine-translated
- **After a chapter edit:** run `pnpm site:translate --list`, translate the stale pages, then commit
  the cache. Write that in CLAUDE.md where the editing workflow is
- Push to `main` and check the Vercel deploy

**Done when:** `www.salmanrahman.com/handbook/bn/` is live. The switcher works there, and a Bangla
chapter loads with its font. `pnpm plan:check` passes.

---

## 📝 Open Notes (not items)

- **`pnpm site:dev` shows a blank page for every route, English included.** Mermaid's dev-mode import
  of `dayjs` fails under pnpm (`does not provide an export named 'default'`), so the app never mounts.
  `site:build` and `vitepress preview` are fine, and #127 was checked on those. Likely fix: add the
  failing CommonJS deps to `vite.optimizeDeps.include` in `config.ts`, or hoist them. Found
  2026-10-13; not yet confirmed whether it predates #127
- **Open from #128, not fixed:** prose inside fences stays English, because fences are copied from the
  English. The STAR stories in Part IX show it most. `realtime-streaming` (Part V) has a broken
  inline code span in the English (`` `io.to(`user:${id}`).emit()` ``). Fixing it makes that page stale
- **warm / warm up:** 31 first-pass pages use গরম, mostly for *warm*, and সীমানা. The brief keeps
  hot, cold and boundary in English but says nothing about warm. The owner has not ruled on it. Until
  they do, #128a–#128z write `warm` / `warm up` in English, the same as hot and cold
- **The Bangla question indexes may drift from their chapters.** `back/interview-question-index` and
  `back/dsa-question-index` were re-translated (#128z) in parallel with Part IX and Book 2 (#128v–#128y),
  so a few Part IX questions and the 87 DSA questions may be worded differently from the new
  chapter `**Q:` lines. A sweep that copies each chapter's Bangla question into its index would fix it

---

## ✅ Progress Tracker

| Phase | Items | Done | Status |
| ----- | ----- | ---- | ------ |
| 11 | 128 · 128a–128z · 130 | 27/28 | 🟡 In progress |
| **Total** | **28** | **27/28** | **96%** |
