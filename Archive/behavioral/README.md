# Archived from `Behavioral/`

Improvement **#31e** took Part IX from sixteen chapters to eight, to reach its **2,500-line**
`BOOK-SPEC.md` § 5 budget from 4,553. Part IX was the only part in the book whose overage was a
**chapter-count problem rather than a length problem** — every one of the sixteen chapters was
already inside the 150–400 line standard, and 2,500 lines does not pay for sixteen of anything.

Most of the sixteen were **merged**, so they live in git history rather than here. One was cut
wholesale.

| File                     | Item     | Why it is out                                                                                          |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `08-questions-to-ask.md` | **#31e** | 356 lines of question lists, most of which a reader can generate. The durable third — what a good question tests, and what the answer tells you — is now the closing section of `Behavioral/05-engineering-culture.md` |

## What was merged rather than archived

Five files were folded into the survivors and are recoverable from git history:

| Was                            | Went into                                      |
| ------------------------------ | ---------------------------------------------- |
| `02-preparation-grid.md`       | `01-star-framework.md` § The Coverage Grid      |
| `03-leadership-teamwork.md`    | `02-leadership-and-conflict.md`                 |
| `07-conflict-resolution.md`    | `02-leadership-and-conflict.md`                 |
| `04-problem-solving.md`        | `03-problem-solving-and-failure.md`             |
| `06-challenges-failures.md`    | `03-problem-solving-and-failure.md`             |
| `05-communication.md`          | split — the explaining and framework material into `Communication/01-technical-communication.md`, the feedback and bad-news material into `02-leadership-and-conflict.md` |

`09-ways-of-working.md` and `10-engineering-culture.md` were renumbered to `04` and `05` and kept;
they were the two chapters that already met the Book Chapter Standard.

## Why the questions chapter went and the culture chapter stayed

The two overlapped more than their titles suggest. Both were about reading a team from the outside —
one as a list of things to ask, the other as a description of what good looks like. Keeping the
description and folding the best questions into it means the reader gets the questions **and** the
reason each one is worth asking, in a third of the lines.

Read this file if you want the full category lists, the per-stage question sets, and the
tailoring-by-interviewer material. None of it is wrong; there is just no budget for it.
