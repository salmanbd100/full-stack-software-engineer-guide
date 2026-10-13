---
name: continue-plan
description: Run the next unfinished item from IMPROVEMENT-PLAN.md, the Phase 11 plan for the Bangla web edition. That means #128a-#128z, which re-translate the site into natural Bangla one batch of pages per session, and #130, the docs and deploy. Use this whenever the user says "continue", "next", "next item", "what's next", "keep going", "carry on", or attaches IMPROVEMENT-PLAN.md with little or no other instruction — and also when they name a specific item ("do #128c", "do #130", "skip #128f"). Triggering matters here: without this skill the session picks the wrong item, forgets the ordering constraints, or finishes the work without ticking the box, which leaves the next session starting from the wrong place.
---

# Continue the Improvement Plan

`IMPROVEMENT-PLAN.md` is **Phase 11: the Bangla web edition**. Every page of the site has a
Bangla translation, but the owner read the first pass and found it robotic (#128). So the open work
is **#128a-#128z**: each one re-translates a batch of about 1,500-2,000 Bangla lines into natural
Bangla. After that comes **#130**, the docs and the deploy. Phases 0-10 are closed and archived in
`Archive/planning/`. The user works through it one item per session, because their usage limit is
tight, and expects each finished item to be recorded before the session ends.

That last part is the whole reason this skill exists. Doing the work is the easy half. If the
checkbox and the counters are not updated, the next session reads the plan, sees the item as
outstanding, and either redoes it or picks up in the wrong place. **An item is not finished until it
is marked finished.**

## The Loop

### 1. Find the item

```bash
node --experimental-strip-types scripts/plan-status.ts --next
```

This prints the first unchecked item, its line number, the **model and effort to use**, its
**Done when** line, and any ordering constraints. Trust it over scanning by eye.

Every open item maps to **Opus 5.5 at high effort**: writing Bangla that does not read as a
translation needs the strongest writer. The mapping lives in the plan's "Model and effort per
item" table. Edit that, not the script.

If the user named an item (`do #23`) or said to skip one, that overrides the first-unchecked rule.

### 2. Honour the ordering constraints

Items are not always safe to do in isolation. The script surfaces constraints marked 🔴 and any
other item that references this one. Read them properly.

Phase 11 has few:

- **#128a-#128z run in order**, but nothing breaks if one is skipped. Each batch is independent
- **#130 depends on nothing.** The site already serves every page, so the user can call it early
  and that is not a reordering

### The translation items (#128a-#128z)

- **Read `i18n/TRANSLATION-BRIEF.md` and the reference page `i18n/bn/book/part-1/closures.md`
  first, every session.** The brief's "Write Bangla, not translated English" section is the standard
- **Translate from the English** (`pnpm -s site:translate --source=/book/<route>`), never by
  patching the old Bangla. The first pass's sentence shapes are the problem
- **Write each page through `--write`.** It refuses a page that breaks a fence, inline code, a link
  or the table shape. Fix the Bangla and run it again. Keep en.md and bn.md in the scratchpad
- **`--check` cannot tell a first-pass page from a re-translated one**, because the English did not
  change. The item's checkbox is the only record. If the session ends mid-batch, list the finished
  routes under the item and leave it unticked
- **Do not spend the user's limit on anything else.** No tidy-ups, no build of the whole site. Run
  `pnpm site:translate --check` and `pnpm plan:check`. `lint:docs` is not needed, because `i18n/`
  is not manuscript

If the next item is blocked, **say which item has to go first and stop.** Do not quietly reorder,
and do not do the blocking item instead without saying so.

### 3. Read the whole item

Every item has a **Done when** line. That is the acceptance test, not a suggestion. Items also carry
tables, file lists, and prior **Delivered** notes — read all of it before starting. Several items
also depend on `BOOK-SPEC.md`, which is the authority on scope and budgets.

### 4. Do that one item

One item. Not the next one because it looks related, not a tidy-up you noticed along the way.

The user's constraint is real: they work in bounded sessions and expect one item to land completely
rather than three to land half-done. If you spot something worth doing that belongs to another item,
note it in your report instead of doing it.

Items marked `L` are explicitly allowed to span sessions. Say clearly which part you finished and
leave the box unticked.

### 5. Verify against "Done when"

Run the actual check. Where nothing is runnable — not every item has a runnable gate — **say so
plainly** rather than phrasing it so it reads as though something passed. A verified partial result
is worth more than an unverified claim of completion, and the user has said as much.

### 6. Mark it complete

Three edits, in the item's own section:

```diff
-### - [ ] 23. Item title `M`
+### - [x] 23. Item title `M` — ✅ **done 2026-08-27**
```

Then append a **Delivered** block under the item's existing "Done when" line:

```markdown
**Delivered:**

- What actually shipped, one bullet per real thing
- Anything deliberately left undone, and why
- Any correction this item forced on the plan itself
```

That block is what the next session reads to understand what state the repo is in. Write it for
someone with no memory of this conversation.

### 7. Update the two counters

They both have to move together:

| Counter | Where |
| ------- | ----- |
| Header | `**Progress:** N / 28` near the top |
| Progress Tracker | the table near the bottom — the phase row and the `Total` row, including the `%` |

Then prove it:

```bash
pnpm plan:check
```

It exits non-zero if any counter disagrees with the checkboxes. Do not finish the turn on a red check.

### 8. Report and stop

Lead with what was done and what was verified. State separately what was left undone and why. Then
stop — do not roll into the next item.

## When the Item Is Wrong

The plan is a working document, not scripture. It has been corrected many times — the archived phases
record six rounds of it, including one whole phase added after a review found eleven items ticked
while naming work they had left.

The translation batches were sized by line count, not by reading the pages. If a batch is clearly
too big for one session, finish what fits, list those routes under the item, and leave it
unticked. Do not cut corners on the Bangla to fit the batch in.

If an item is wrong, already done, or blocked, **amend the item and say so.** Add a note explaining
what changed and why. Silently skipping it, or doing something adjacent and ticking the box, is the
one outcome that makes the plan untrustworthy.

## Repo Conventions Worth Carrying In

- Writing or editing any markdown means invoking `write-topic-docs` first — it holds the mandatory
  Book Chapter Standard
- `BOOK-SPEC.md` § 6 lists out-of-scope topics. If an item drifts into one, flag it
- Scripts run through their `pnpm` aliases — `pnpm lint:docs`, `pnpm book:pages`, `pnpm test`
- **Cut chapters move to `Archive/`, they are never deleted** — the Phase 2 convention
- `Interview-Question-Index.md` and everything under `site/book/` are generated. Regenerate, never edit
- British English throughout
