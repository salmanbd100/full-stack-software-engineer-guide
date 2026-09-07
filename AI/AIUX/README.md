---
title: AIUX
part: 7
chapter: 0
slug: ai-aiux-index
level: advanced
reading_time: 3
updated: 2026-09-07
tags: [ai, ux, streaming, generative-ui, trust, failure-states, frontend]
in_book: true
---

# AIUX

Four chapters on the interface layer, and the section only a frontend-heavy author writes well. AI
engineering books are written by backend and ML people, so this is consistently their weakest material —
here it is the edge.

The through-line is that **an AI feature is the first product surface where slow, wrong and refused are
normal operating states rather than bugs.** Everything a frontend engineer already knows about perceived
performance, optimistic updates and error boundaries applies, but the defaults change: the loading state
lasts seconds rather than milliseconds, the response arrives in pieces, and "the system is confident and
mistaken" is a state the UI has to represent.

## Chapters

| #  | Chapter                  | What it answers                                                        |
| -- | ------------------------ | ------------------------------------------------------------------------ |
| 01 | [Designing for Latency](#ch-designing-for-latency)    | Why does the first token matter more than the last, and what fills the wait? |
| 02 | [Generative UI](#ch-generative-ui)            | How do you render components from model output without opening a hole?   |
| 03 | [Trust and Correctness UX](#ch-trust-and-correctness-ux) | How does the interface show its working — citations, confidence, undo?   |
| 04 | [Failure States](#ch-failure-states)           | What does the screen do on a refusal, a timeout, or half an answer?      |

## The Running Project

The last section, and the one that decides whether the previous five are worth using. The
**documentation assistant** has a finished engine and an unfinished surface.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | A first-token target, and a retrieval phase the reader can see instead of a spinner |
| 02 | Answer components — citation chips, a diff for a suggested doc change — rendered from an allow-list, with the model emitting passage ids the server resolves |
| 03 | Citations that link to the source page, edit-before-accept on anything the assistant proposes changing, and undo |
| 04 | The failure screens: "not in the docs", a truncated answer with a continue action, and a rate limit that keeps whatever already streamed |

**At the end of the part** the documentation assistant streams cited answers from a measured retrieval
pipeline, refuses honestly when a question falls outside the corpus, costs a known amount per question,
and degrades to the plain docs index when the model is unavailable.

That is thirty-one chapters in one application, and it is also the answer to the only question that
matters in an AI round: have you shipped one of these.

## What Interviewers Probe For

- **"The model takes eight seconds. What does the user see?"** Not a spinner. Streaming turns one eight-
  second wait into a first token in 400 ms, and the difference in perceived quality is larger than any
  model upgrade would buy.
- **"The model output includes a component to render. What is the risk?"** That model output is untrusted
  input arriving from a system that reads attacker-controlled documents. Rendering it means an allow-list
  of components and props, never a general interpreter — this is `Production/06` wearing a frontend hat.
- **"How do you show the user the answer might be wrong?"** Citations that link to the retrieved source,
  edit-before-accept on anything that writes, and undo. Confidence scores read as precision the system
  does not have, and are usually the wrong answer.
- **"The request is rate-limited mid-stream. Now what?"** Keep the partial answer, say what happened, and
  make retry cheap. Discarding streamed tokens on failure throws away the only thing the user has.

## Reading Order

01 first — it changes how the other three read. 04 next, because the unhappy path is where most of the
engineering actually is. 02 and 03 are independent; 02 assumes the security boundary from
`Production/06`, so read that one first if the two are close together.

**Interview sprint:** 01 and 04. Latency and failure design are what a frontend-heavy candidate can say
about AI features that nobody else in the loop will.
