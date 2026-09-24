---
title: AIUX
part: 7
chapter: 23
slug: ai-aiux-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [ai, ux, streaming, generative-ui, trust, failure-states, frontend]
in_book: true
---

# AIUX

Two chapters on the interface layer — the section only a frontend-heavy author writes well. AI books are
mostly written by backend and ML people, so this is usually their weakest material.

The through-line: **an AI feature is the first product surface where slow, wrong and refused are normal
states, not bugs.** What you know about perceived performance and error boundaries still applies. But the
loading state lasts seconds, the answer arrives in pieces, and "confident and mistaken" is a state the UI
has to show.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Latency and Generative UI](#ch-generative-ui) | Why does the first token matter most, and how do you render components from model output safely? |
| 02 | [Trust, Correctness and Failure States](#ch-trust-and-correctness-ux) | How does the screen show its working, and what does it do on a refusal or half an answer? |

## The Running Project

The last section, and the one that decides whether the others are worth using.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | A first-token target, a visible retrieval phase instead of a spinner, and citation chips rendered from an allow-list |
| 02 | Citations that link to the source, edit-before-accept and undo, and the failure screens: "not in the docs", a truncated answer with a continue action, a rate limit that keeps what already streamed |

**At the end of the part** the documentation assistant streams cited answers from a measured pipeline,
refuses honestly outside its corpus, costs a known amount per question, and falls back to the plain docs
index when the model is down. That is the answer to the only question that matters in an AI round: have
you shipped one of these.

## What Interviewers Probe For

- **"The model takes eight seconds. What does the user see?"** Not a spinner. Streaming turns an
  eight-second wait into a first token in 400 ms.
- **"The model output includes a component to render. What is the risk?"** Model output is untrusted
  input. Render from an allow-list of components and props, never a general interpreter.
- **"How do you show the answer might be wrong?"** Citations that link to the source, edit-before-accept
  and undo. Confidence scores suggest a precision the system does not have.
- **"It is rate-limited mid-stream. Now what?"** Keep the partial answer, say what happened, and make retry cheap.

## Reading Order

01 → 02. 01 assumes the security boundary from `Production/04`, so read that first if you can.

**Interview sprint:** both. Latency and failure design are what a frontend-heavy candidate can say that
nobody else in the loop will.
