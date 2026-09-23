---
name: continue-plan
description: Run the next unfinished item from IMPROVEMENT-PLAN.md, the Phase 9 plan (#95-#116) cutting the finished book from 1,370 pages to ~940, rewriting its prose in simple English, and softening the print colours. Use this whenever the user says "continue", "next", "next item", "what's next", "keep going", "carry on", or attaches IMPROVEMENT-PLAN.md with little or no other instruction — and also when they name a specific item ("do improvement #23", "do #40", "skip #12"). Triggering matters here: without this skill the session picks the wrong item, forgets the ordering constraints, or finishes the work without ticking the box, which leaves the next session starting from the wrong place.
---

# Continue the Improvement Plan

`IMPROVEMENT-PLAN.md` is **Phase 9 — items #95-#116**, three of which carry a letter (#95a, #113a, #113b). The manuscript is finished; this phase cuts it
from 1,370 pages to about 940, then rewrites the surviving prose in simple English for readers whose
first language is not English. Phases 0-8 are closed and archived in
`Archive/planning/improvement-plan-phases-0-8.md`. The user works through it one item per session and
expects each finished item to be recorded before the session ends.

That last part is the whole reason this skill exists. Doing the work is the easy half. If the
checkbox and the three counters are not updated, the next session reads the plan, sees the item as
outstanding, and either redoes it or picks up in the wrong place. **An item is not finished until it
is marked finished.**

## The Loop

### 1. Find the item

```bash
node --experimental-strip-types scripts/plan-status.ts --next
```

This prints the first unchecked item, its line number, the **model and effort to use**, its
**Done when** line, and any ordering constraints. Trust it over scanning by eye.

Every Phase 9 item maps to **Opus 5 at high or xhigh effort**. There are no mechanical sweeps left:
each item decides what a senior interviewer actually asks, which two chapters become one, and which
sentence to break in half. The mapping lives in the plan's "Model and effort per item" table; edit
that, not the script.

If the user named an item (`do #23`) or said to skip one, that overrides the first-unchecked rule.

### 2. Honour the ordering constraints

Items are not always safe to do in isolation. The script surfaces constraints marked 🔴 and any
other item that references this one. Read them properly.

Phase 9 has three that matter:

- **#95 runs before every cut.** It writes the new budgets into `BOOK-SPEC.md`, and the lint measures
  against the spec. Cut first and nothing can tell you when a part is done
- **#104 must leave the `budget` rule at 0** for the whole book. It is the last cut item
- **The plain-English items (#105-#113) run after the cut**, never before. Editing prose that is
  about to be archived wastes the session
- **#95a runs before the cut items.** It retires the DSA companion, which changes what every later
  item builds, indexes and publishes. Running it late means regenerating the question index twice
- **#113a, #113b and #115 depend on nothing.** They sit before #114 because the final build has to
  include them, but the user can call any of them early and that is not a reordering

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
| Header | `**Progress:** N / 25` near the top |
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

The cut items name **candidate** chapters, chosen by reading titles and line counts. If a session
opens a chapter and finds the candidate is the strongest thing in its section, **say so and pick a
different one.** Hitting the line budget is the requirement; the specific list is advice.

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
