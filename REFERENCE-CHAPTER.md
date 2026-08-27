# The Reference Chapter

> **This file is not part of the book.** It is the pointer the `write-topic-docs` skill uses when the
> written standard and your instinct disagree.

**The canonical chapter is [`Backend/API/01-rest-best-practices.md`](./Backend/API/01-rest-best-practices.md).**

Open it. Every rule in the Book Chapter Standard is visible in that one file, applied to real content
rather than to a placeholder. `CHAPTER-TEMPLATE.md` shows you the _skeleton_; this shows you the
_finished thing_.

It is a pointer rather than a copy on purpose. A duplicated exemplar drifts from the chapter it was
copied from, and then two files claim to be the standard.

---

## What to copy from it

| Look at                | To learn                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Lines 1–17             | Front matter, the H1 anchor, the one-sentence promise, the `In this chapter:` line     |
| `## 💡 The Core Idea`  | A mental model stated in plain words before any API name, closed by one memorable line |
| `## How It Works`      | `###` subsections, tables before prose, one Mermaid diagram with a bold caption under it |
| `## When to Use It`    | A decision table that names the _alternative_ honestly, not a list of reasons to agree |
| Body sections after it | Topic-specific sections go **after** `When to Use It`, never before                    |
| `## Common Mistakes`   | ❌/✅ pairs where the ❌ block carries the consequence in a comment                     |
| `## 🔑 Key Takeaways`  | Complete sentences that survive being read out of context                              |
| `## Interview Questions` | Answer _shapes_ in 2–4 sentences, including one judgement call                       |
| `## What to Read Next` | `#ch-<slug>` anchors with a reason each — never a relative file path                   |

## What it is not

- **Not a length model.** It runs to ~350 lines because REST design has unusually wide surface area.
  The target is **~220**, which is what the Part V budget divides to. Write to the target, not to this file.
- **Not a subject model.** A chapter on a volatile topic also needs a `⚠️ Moving target` callout, which
  REST does not carry — REST semantics have been stable since 1999.
- **Not editable in isolation.** If the standard changes, this chapter changes with it. It is the thing
  every other chapter is measured against, so it goes stale loudly rather than quietly.

## The order to work in

1. Copy `.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md` — it is the skeleton with the rules inline
2. Read the canonical chapter above for how a finished one reads
3. Check against the Quality Checklist in `.claude/skills/write-topic-docs/SKILL.md`
4. Run `pnpm lint:docs` before you call it done
