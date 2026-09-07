---
title: Production
part: 7
chapter: 0
slug: ai-production-index
level: advanced
reading_time: 3
updated: 2026-09-07
tags: [ai, evals, observability, cost, guardrails, prompt-injection, security]
in_book: true
---

# Production

The section that sets this book apart, and the one to read first if there is only time for one. Six
chapters on the work that starts after the demo works: measuring quality, reading failures, tracing
requests, controlling cost, and defending a system whose defining vulnerability has no complete fix.

The through-line is **measure, then change.** Every other part of this book can be improved by reasoning
about it. An AI feature cannot: the system is non-deterministic, the failure modes are not obvious from
the code, and a prompt change that fixes one case routinely breaks four others. Without a suite and a
number, work on an AI feature is a random walk that feels like progress.

## Chapters

| #  | Chapter               | What it answers                                                          |
| -- | --------------------- | -------------------------------------------------------------------------- |
| 01 | [Evals](#ch-evals)                 | What is a golden set, when is LLM-as-judge valid, and how does this run in CI? |
| 02 | [Error Analysis Loops](#ch-error-analysis-loops)  | How do you turn a hundred bad answers into three fixable categories?       |
| 03 | [Observability](#ch-observability)         | What does a trace look like, and what must never reach the logs?           |
| 04 | [Cost Engineering](#ch-cost-engineering)      | Where does the money go, and which lever moves it most?                    |
| 05 | [Guardrails and Safety](#ch-guardrails-and-safety) | What do you filter, and what happens when the model refuses?               |
| 06 | [Prompt Injection](#ch-prompt-injection)      | Why is this the defining AI security problem, and what actually helps?     |

## The Running Project

Everything in the **documentation assistant** so far can be improved by argument. This section makes it
improvable by measurement, which is where it stops being a demo.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | The golden set extended from retrieval to answers, with the pass rate gating merges in CI |
| 02 | A week of production traces sorted into three fixable categories, and a decision about which one to fix first |
| 03 | A span per request with tokens and latency attached, and a logging rule that keeps document text and user identifiers out of it |
| 04 | The system prompt cached, rewriting routed to the small model, and a known cost per question at expected volume |
| 05 | Scope refusal, a check that every cited id resolves, and tools that stay read-only |
| 06 | A docs page carrying injected instructions — harmless here, because the tools cannot write and citations resolve server-side |

Chapter 06 is the one that pays for the shape chosen in `Integration/03`. Passage ids resolved on the
server mean a page written by someone else cannot fabricate a citation or reach anything outside the
corpus, and that is a design decision rather than a filter.

**At the end of this section** the assistant has a pass rate, a cost per question and a stated security
boundary. Those three answers are most of what the closing chapter of this part is asked about.

## What Interviewers Probe For

- **"How do you know your change made it better?"** The question the market is short of answers to. A
  golden set, a pass rate, a regression run before merge — and an honest note about what the set does not
  cover.
- **"When is LLM-as-judge acceptable?"** For graded qualities where a rubric can be written and the judge
  itself has been checked against human labels on a sample. Not for correctness on facts the judge cannot
  verify, and never as the only signal.
- **"Your AI feature costs four times the forecast. What do you do first?"** Measure the token profile
  before changing the model. The usual culprits are an uncached system prompt, retrieved context that
  grew, and a retry loop nobody bounded — all cheaper to fix than a model downgrade, and none of them
  costs quality.
- **"Explain prompt injection to a backend engineer."** The model cannot distinguish instructions from
  data, and retrieved documents are data written by someone else. Defence is in depth — least privilege
  on tools, output filtering, approval gates — not a filter that catches the magic words.

## Reading Order

01 first and read it twice; nothing else in this section pays off without it. Then 02, which is what you
do with the failures 01 finds. 03 and 04 are independent and can be read when the system is live. 05 →
06 in order — 06 assumes the boundary vocabulary 05 sets up.

**Interview sprint:** 01 and 06. Evaluation is the skill most asked for and least taught; prompt injection
is the security question that now appears in every senior AI loop.
