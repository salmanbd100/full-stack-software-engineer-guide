# Improvement Plan — Phase 11: The Bangla Web Edition

> **Purpose:** finish the Bangla edition of the web site at `www.salmanrahman.com/handbook/`. Every
> page is translated and the language switch is built. What is left is the owner's read and the
> deploy. The PDF and EPUB stay English.
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

**Last updated:** 2026-10-13 · **Progress:** 0 / 2
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
| 128, 130 | **Opus 5.5** `claude-opus-5-5` | `high` | Re-translation against the brief, docs and a deploy checked against the live site |

`pnpm plan:next` reads this table. Edit the table, not `scripts/plan-status.ts`.

---

# Phase 11 — Open Items

### - [ ] 128. The owner reads the Bangla edition `M`

All 222 pages are translated (#129). This item is the quality gate that was meant to come first: the
owner reads at least three chapters in Bangla on the site, and anything flagged (terms that should
have stayed English, a tone that is too formal, broken tables) goes into `i18n/TRANSLATION-BRIEF.md`.
The affected pages are then translated again through `site:translate --source` / `--write`.

**Done when:** the owner has said the quality is good enough. Every change to the brief is written in
the **Delivered** block, with the reason. `pnpm site:translate --check` passes.

**Known gaps to raise with the owner** (from #129, not fixed):

- **Prose inside fences stays English,** because fences are copied from the English. The STAR stories
  in Part IX are the most visible case
- **`realtime-streaming` (Part V)** has a broken inline code span in the English
  (`` `io.to(`user:${id}`).emit()` ``). Fixing the English makes that page stale
- **Two older pages use গরম/ঠান্ডা and সীমানা** where the brief now keeps hot/cold and boundary in
  English

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

---

## ✅ Progress Tracker

| Phase | Items | Done | Status |
| ----- | ----- | ---- | ------ |
| 11 | 128 · 130 | 0/2 | 🟡 In progress |
| **Total** | **2** | **0/2** | **0%** |
