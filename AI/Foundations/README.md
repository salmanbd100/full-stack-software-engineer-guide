---
title: Foundations
part: 7
chapter: 0
slug: ai-foundations-index
level: intermediate
reading_time: 3
updated: 2026-09-07
tags: [ai, llm, tokens, prompting, embeddings, context-engineering]
in_book: true
---

# Foundations

Five chapters of mental model, before any SDK. A senior engineer does not need to know how attention
works, but does need to know why the same prompt returns two different answers, why the tenth message in
a conversation costs more than the first, and why "just use the biggest model" is a cost decision
disguised as a quality one.

The through-line is that a model is a **stateless function over a token budget**. Every surprising
behaviour in the rest of the part — truncated answers, forgotten instructions, cost that scales with
conversation length, retrieval that has to be selective — follows from that one sentence.

## Chapters

| #  | Chapter                                                             | What it answers                                                             |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 01 | [How LLMs Behave](#ch-how-llms-behave)                              | Why is the output different every time, and what is a context window really? |
| 02 | [Choosing a Model](#ch-choosing-a-model)                            | When does a smaller, faster model win, and how do you decide without guessing? |
| 03 | [Prompting as Engineering](#ch-prompting-as-engineering)            | What makes a prompt an artefact you version rather than a string you tweak?  |
| 04 | [Embeddings and Similarity](#ch-embeddings-and-similarity)          | What is a vector, and when does it beat keyword search?                      |
| 05 | [Context Engineering](#ch-context-engineering)                      | What goes into the window, what gets cut, and who decides?                   |

## What Interviewers Probe For

- **"Why did the model give a different answer the second time?"** Sampling. The honest answer names
  temperature and top-p, then adds the part that matters: you cannot test a non-deterministic system with
  equality assertions, which is why `Production/01` exists.
- **"This prompt works in the playground and fails in production. Why?"** Almost always context — a
  different system prompt, a truncated window, or retrieved text the playground did not have. The
  candidate who asks to see the assembled request is the one who has debugged this before.
- **"When would you use a smaller model?"** Classification, routing, extraction, and anything on a hot
  path with a latency budget. Naming a case where you would *not* — open-ended reasoning, long-horizon
  tool use — is what makes it a judgement rather than a preference.

## Reading Order

01 first; everything else in the part assumes its vocabulary. Then 05, which is the 2026 reframe of
prompt engineering and reads better immediately after 01 than at the end. 03 and 04 are independent. 02
is the one to read last, because choosing a model is easier once you know what you are trading.

**Interview sprint:** 01 and 05. Twenty minutes, and they cover most of what a general AI question is
really testing.
