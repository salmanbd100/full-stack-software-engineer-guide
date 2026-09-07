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

**Nothing is staged.** Every file that was here has been absorbed by the item that owned it. The
records below say where each one went.

## How to absorb one

These files predate the Book Chapter Standard and none of them will pass `lint:docs` as they are.
They are **source material for a chapter, not a chapter**. When the owning item runs:

1. Write the new chapter from [`CHAPTER-TEMPLATE.md`](../../.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md),
   lifting whatever survives from the staged file
2. Re-scope it — a file written for DevOps chores is aimed at the wrong reader
3. `git rm` the staged file once its content has a home, and strike its row from the table above

`ai/07-security.md` is gone: **#49** absorbed it into `AI/Production/05-guardrails-and-safety.md` and
`06-prompt-injection.md` on 2026-09-07. What survived the re-scope is the durable security argument —
three risk boundaries rather than one, the data-egress decision being architectural rather than a filter,
an agent with real permissions being a privileged principal, the untrusted-content source table, and the
sentence the whole chapter turns on: there is no reliable way to make a model ignore injected
instructions, so constrain what a successful injection achieves. The tool-specific half — Amazon Q agent
configuration, Bedrock as the named answer, Terraform state as the leak example, and the "should
AI-generated code get a different review process" material — did not, because it is about *using* AI
coding tools rather than *building* AI features. That is the same line #21 drew and #45 applied.

`ai/06-prompt-engineering.md` is gone: **#45** absorbed it into
`AI/Foundations/03-prompting-as-engineering.md` on 2026-09-07. The techniques that survived the re-scope
are constraints over politeness, permitting uncertainty, one example of your conventions beating a
paragraph of description, withholding your theory when debugging, and conventions belonging in a file
rather than a message. The DevOps-specific material — Terraform prompts, IAM wildcards, `kubectl`
triage — did not, because it is about *using* AI tools rather than *building* AI features, which is the
line #21 drew.

`frontend/` is gone: **#39** and **#40** absorbed `rendering.md` and `state-management.md` into Part III
on 2026-09-07, and **#42** removed the directory once the rest of `SystemDesign/Frontend/` had moved.
The record of where those 412 lines went is in
[`Archive/systemdesign/frontend/README.md`](../systemdesign/frontend/README.md).

An empty `Archive/salvage/` means every staged file has been absorbed. That is the goal state.
