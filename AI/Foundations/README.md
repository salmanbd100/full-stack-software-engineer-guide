---
title: Foundations
part: 7
chapter: 1
slug: ai-foundations-index
level: intermediate
reading_time: 3
updated: 2026-09-24
tags: [ai, llm, tokens, prompting, model-choice, context-engineering]
in_book: true
---

# Foundations

Three chapters of mental model, before any SDK. A senior engineer does not need to know how attention
works. They do need to know why the same prompt gives two different answers, why the tenth message costs
more than the first, and why "just use the biggest model" is a cost decision dressed up as a quality one.

The through-line is one sentence: **a model is a stateless function over a token budget.** Truncated
answers, forgotten instructions and cost that grows with the conversation all follow from it.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [How LLMs Behave and How to Choose One](#ch-how-llms-behave) | Why is the output different every time, and when does a smaller model win? |
| 02 | [Prompting as Engineering](#ch-prompting-as-engineering) | What makes a prompt an artefact you version rather than a string you tweak? |
| 03 | [Context Engineering](#ch-context-engineering) | What goes into the window, what gets cut, and who decides? |

## The Running Project

Nothing runs yet. This section makes the three decisions the **documentation assistant** is built on.
Each one is cheaper to change here than anywhere later.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | The token arithmetic that kills the obvious design, and two models: a small one for query rewriting, a larger one for the answer |
| 02 | `prompts/answer.md`, versioned with the code, with the grounding rule: answer only from the supplied passages |
| 03 | The window budget written down — system prompt, five passages, the last few turns — and what is dropped first |

**At the end of this section** the assistant exists on paper. Nothing calls a model yet; `Integration/`
is where it becomes an application.

## What Interviewers Probe For

- **"Why did the model give a different answer the second time?"** Sampling. Name temperature, then add
  the part that matters: you cannot test a non-deterministic system with equality checks.
- **"It works in the playground and fails in production. Why?"** Almost always context — a different
  system prompt, a cut window, or retrieved text the playground never had. Ask to see the assembled request.
- **"When would you use a smaller model?"** Routing, extraction and anything on a hot path. Naming where you
  would *not* — open-ended reasoning, long tool use — makes it a judgement, not a preference.

## Reading Order

01 first; the rest of the part assumes its vocabulary. 02 and 03 can be read in either order.

**Interview sprint:** 01 and 03. They cover most of what a general AI question is really testing.
