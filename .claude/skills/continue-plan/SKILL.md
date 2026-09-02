---
name: continue-plan
description: Run the next unfinished item from IMPROVEMENT-PLAN.md, the 89-item plan turning this repo into the book manuscript. Use this whenever the user says "continue", "next", "next item", "what's next", "keep going", "carry on", or attaches IMPROVEMENT-PLAN.md with little or no other instruction — and also when they name a specific item ("do improvement #23", "do #40", "skip #12"). Triggering matters here: without this skill the session picks the wrong item, forgets the ordering constraints, or finishes the work without ticking the box, which leaves the next session starting from the wrong place.
---

# Continue the Improvement Plan

`IMPROVEMENT-PLAN.md` is an 89-item plan turning this repository into the manuscript for
**The Senior Full Stack Handbook**. The user works through it one item per session and expects
each finished item to be recorded before the session ends.

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
**Done when** line, and any ordering constraints. Trust it over scanning by eye — the file is
~1,400 lines and the first `- [ ]` is easy to miss.

If the recommended model is not the one running, **say so before starting.** Roughly a third of the
items are mechanical sweeps across hundreds of files where Sonnet 5 at low effort does the same job
for 2.5× less — #10, #12, #71 and #74 between them touch more files than the rest of the plan
combined. The mapping lives in the plan's "Model per item" table; edit that, not the script.

If the user named an item (`do #23`) or said to skip one, that overrides the first-unchecked rule.

### 2. Honour the ordering constraints

Items are not always safe to do in isolation. The script surfaces constraints marked 🔴 and any
other item that references this one. Read them properly.

The live example: **#3 must run before #20.** The front matter script hardcodes 143 file paths that
#20 renames and moves. Run #3 afterwards and every path misses, so 143 archive decisions vanish
silently — nothing errors, the data is just gone.

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

Run the actual check. Where nothing is runnable — this repo has no test suite and no CI — **say so
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

### 7. Update the three counters

They all have to move together:

| Counter | Where |
| ------- | ----- |
| Header | `**Progress:** N / 89` near the top |
| Phase Map | the `Items` / `Done` row for that item's phase |
| Progress Tracker | the table near the bottom, including the `%` |

Then prove it:

```bash
node --experimental-strip-types scripts/plan-status.ts --check
```

It exits non-zero if any counter disagrees with the checkboxes. Do not finish the turn on a red check.

### 8. Report and stop

Lead with what was done and what was verified. State separately what was left undone and why. Then
stop — do not roll into the next item.

## When the Item Is Wrong

The plan is a working document, not scripture. Items have already been corrected twice: #1's budget
arithmetic was wrong, and its "frontend-heavy" rule was not achievable with real chapter counts.

If an item is wrong, already done, or blocked, **amend the item and say so.** Add a note explaining
what changed and why. Silently skipping it, or doing something adjacent and ticking the box, is the
one outcome that makes the plan untrustworthy.

## Repo Conventions Worth Carrying In

- Writing or editing any markdown means invoking `write-topic-docs` first — it holds the mandatory
  Book Chapter Standard
- `BOOK-SPEC.md` § 6 lists out-of-scope topics. If an item drifts into one, flag it
- Scripts run as `node --experimental-strip-types scripts/<name>.ts` — no build step, no `package.json`
- British English throughout
