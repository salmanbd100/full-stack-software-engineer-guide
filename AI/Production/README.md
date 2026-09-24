---
title: Production
part: 7
chapter: 18
slug: ai-production-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [ai, evals, observability, cost, guardrails, prompt-injection, security]
in_book: true
---

# Production

The section that sets this book apart, and the one to read first if there is time for only one. Four
chapters on the work that starts after the demo works: measuring quality, tracing requests, controlling
cost, and defending a system whose main vulnerability has no complete fix.

The through-line is **measure, then change.** An AI feature cannot be improved by reasoning alone. The
system is non-deterministic, and a prompt change that fixes one case often breaks four others. Without a
suite and a number, the work is a random walk that feels like progress.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Evals, Retrieval Metrics and Error Analysis](#ch-evals) | What is a golden set, what is recall@k, and how do a hundred bad answers become three fixes? |
| 02 | [Observability and Cost Engineering](#ch-observability) | What does a trace look like, and which lever moves the bill most? |
| 03 | [Guardrails and Safety](#ch-guardrails-and-safety) | What do you filter, and what happens when the model refuses? |
| 04 | [Prompt Injection](#ch-prompt-injection) | Why is this the defining AI security problem, and what actually helps? |

## The Running Project

Until now the **documentation assistant** could only be improved by argument. This section makes it
improvable by measurement.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | A golden set of fifty questions with recall@5 and an answer pass rate gating merges in CI, and a week of failures sorted into three fixable groups |
| 02 | A span per request with tokens and latency, a cached system prompt, and a known cost per question |
| 03 | Scope refusal, a check that every cited id resolves, and tools that stay read-only |
| 04 | A docs page carrying injected instructions — harmless, because the tools cannot write and citations resolve on the server |

**At the end of this section** the assistant has a pass rate, a cost per question and a stated security
boundary. Those three answers are most of what the closing chapter of this part is asked about.

## What Interviewers Probe For

- **"How do you know your change made it better?"** A golden set, a pass rate, a regression run before
  merge — and an honest note about what the set does not cover.
- **"When is LLM-as-judge acceptable?"** For graded qualities with a written rubric, once the judge has
  been checked against human labels. Never as the only signal.
- **"It costs four times the forecast. What first?"** Measure the token profile before changing the model.
  An uncached system prompt, grown context and an unbounded retry loop are the usual culprits.
- **"Explain prompt injection to a backend engineer."** The model cannot tell instructions from data, and
  retrieved documents are data someone else wrote. Defence is in depth, not a filter for magic words.

## Reading Order

01 first, and read it twice; nothing else here pays off without it. 02 can wait until the system is live.
03 → 04 in order.

**Interview sprint:** 01 and 04. Evaluation is the skill most asked for and least taught. Prompt injection
now appears in every senior AI loop.
