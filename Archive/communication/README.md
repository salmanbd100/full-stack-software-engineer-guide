# Archived from `Communication/`

Improvement **#29** took Part IX's communication section from eight chapters to six. Improvement
**#31e** took it to three, reaching Part IX's 2,500-line `BOOK-SPEC.md` § 5 budget. Four files left,
for four different reasons.

| File                        | Item    | Why it is out                                                                                                         |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `02-behavioral-interview.md` | **#29** | Superseded. It taught STAR, which `Behavioral/01-star-framework.md` also taught. The two were merged into that chapter |
| `03-english-fluency.md`      | **#29** | Personal ESL practice. Useful to one person; not something a reader paid for a book to get                             |
| `03-system-design-communication.md` | **#31e** | Duplicate. `SystemDesign/Fundamentals/01-driving-the-round.md` teaches RADIO, the time budget and the narration for a design round, in Part VI where the design material lives |
| `05-cross-cultural-communication.md` | **#31e** | Mostly etiquette-by-region, which ages badly and edges into the personal material § 6 puts out of scope. The durable part survives — see below |

## `03-system-design-communication.md` was the last of a five-place duplication

RADIO was documented in `SystemDesign/README.md`, `SystemDesign/CaseStudies/README.md`,
`SystemDesign/Fundamentals/01-driving-the-round.md` and this file. Part VI owns the design round, and
the Fundamentals chapter covers everything this file did — the five phases, the minute budget, the
scoping questions, and signposting — with the case studies alongside it. The two communication
techniques this file did best, **signposting** and **engaging the interviewer rather than presenting
at them**, moved into `Communication/02-thinking-aloud.md`.

## `05-cross-cultural-communication.md` kept its best twelve lines

The regional-directness observation is real and useful: the same sentence — "I led the migration" —
reads as ownership in one room and as overclaiming in another. That survives as a callout in
`Communication/01-technical-communication.md`, with the fix stated as saying **both** halves rather
than changing which one is true.

The "handling language barriers" phrases — asking for a repeat, buying thinking time, paraphrasing to
confirm — moved into `Communication/02-thinking-aloud.md`, which is where a reader needs them.

What did not survive is the email etiquette by culture, the safe-small-talk list, and the
company-by-region tables. Those are the two things `BOOK-SPEC.md` § 6 rules out at once: personal
practice material, and guidance that ages within a quarter.

## `02-behavioral-interview.md` was merged, not dropped

The two files overlapped almost completely — both covered the four STAR components, a worked example,
a story-bank template and a mistakes table. What this one did better survives in the merged chapter:
the **percentage time budget** per component, the sequencing reasoning inside the Action section, and
the failure story built around the systemic fix rather than the rollback.

What did not survive was the category question list and the story-bank grid, because
`Behavioral/02-preparation-grid.md` already owns both and does them at more depth.

Read this file if you want the three original worked stories in full. The merged chapter keeps two of
them, tightened.

## `03-english-fluency.md` is out of scope, not wrong

`BOOK-SPEC.md` § 6 puts personal material out of the book — English-language coaching alongside
marketing assets and planning documents. The chapter is a good set of drills. It is written for one
reader with one first language, and a book cannot be.

The part of it that is genuinely about interviews — how much directness a room expects, how to ask for
a repeat without losing authority — went into `Communication/05-cross-cultural-communication.md` at
**#29**. That file has since been archived here too, and those two ideas now sit in
`Communication/01-technical-communication.md` and `Communication/02-thinking-aloud.md`.

## What was merged rather than archived

Three more files were folded into the three survivors and are recoverable from git history:

| Was                        | Went into                                                            |
| -------------------------- | -------------------------------------------------------------------- |
| `02-active-listening.md`   | `02-thinking-aloud.md` — paraphrasing, clarifying, and reading signals |
| `04-thinking-aloud.md`     | `02-thinking-aloud.md` — the three phases of a coding round            |
| `06-written-communication.md` | `03-written-communication.md`, trimmed from 393 lines               |
