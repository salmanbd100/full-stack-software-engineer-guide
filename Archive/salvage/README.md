# Salvage — staged, not archived

> **Nothing here is in the book yet. Everything here is *going* into the book.**

`Archive/` is where content goes when it is out of scope. This sub-directory is the opposite case:
material that is **in** scope for a part that has not been written yet. It sits under `Archive/` only
because that is the one tree the book build and the lint script already skip — see
[`Archive/README.md`](../README.md) for how the exclusion works.

A file lands here when three things are true:

1. It was cut from its old home because that home is being dissolved
2. Its subject matter belongs to a part scheduled later in [`IMPROVEMENT-PLAN.md`](../../IMPROVEMENT-PLAN.md)
3. The item that will absorb it is **named**, with a chapter number

Point 3 is what separates salvage from archive. Anything without a named destination is archived, not staged.

## What is staged

| File | Source | Absorbed by | Into |
| ---- | ------ | ----------- | ---- |
| `ai/06-prompt-engineering.md` | `DevOps/GenAI/06` (#21) | **#45** | `AI/Foundations/03-prompting-as-engineering.md` |
| `ai/07-security.md` | `DevOps/GenAI/07` (#21) | **#49** | `AI/Production/05-guardrails-and-safety.md` and `06-prompt-injection.md` |

## How to absorb one

These files predate the Book Chapter Standard and none of them will pass `lint:docs` as they are.
They are **source material for a chapter, not a chapter**. When the owning item runs:

1. Write the new chapter from [`CHAPTER-TEMPLATE.md`](../../.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md),
   lifting whatever survives from the staged file
2. Re-scope it — a file written for DevOps chores is aimed at the wrong reader
3. `git rm` the staged file once its content has a home, and strike its row from the table above

An empty `Archive/salvage/` means every staged file has been absorbed. That is the goal state.
