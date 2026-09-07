---
title: RAG
part: 7
chapter: 0
slug: ai-rag-index
level: advanced
reading_time: 3
updated: 2026-09-07
tags: [ai, rag, retrieval, chunking, vector-store, evaluation]
in_book: true
---

# RAG

Retrieval-augmented generation is the most widely deployed enterprise LLM pattern, and the gap between a
tutorial RAG engineer and a production one is a single skill: **retrieval evaluation.** Five chapters,
and the last one is the reason the other four are worth reading.

The through-line is that most "the model gave a wrong answer" bugs are not model bugs. The right passage
was never retrieved, or was retrieved and ranked eleventh, or was split down the middle by a chunker that
counted characters. Until retrieval is measured, every fix is a guess.

## Chapters

| #  | Chapter                                | What it answers                                                     |
| -- | -------------------------------------- | --------------------------------------------------------------------- |
| 01 | When RAG, When Fine-Tune, When Neither | Which problem does each actually solve, and why do teams pick wrong?  |
| 02 | Ingestion and Chunking                 | How do you split a document without destroying its meaning?           |
| 03 | Retrieval                              | Vector, keyword or hybrid — and where does reranking earn its latency? |
| 04 | Vector Stores                          | Is pgvector enough, and what does a dedicated store actually cost?    |
| 05 | Evaluating Retrieval                   | What is recall@k, and how do you build a golden set worth trusting?   |

## What Interviewers Probe For

- **"The assistant answered wrongly. Where do you look first?"** At what was retrieved. Print the chunks
  that went into the window before touching the prompt. This is the single strongest signal in the whole
  section, and most candidates skip it.
- **"Why not fine-tune instead?"** Fine-tuning teaches form and behaviour; retrieval supplies facts.
  Facts that change weekly belong in a store, not in weights — and the candidate who says so has
  understood the decision rather than memorised the diagram.
- **"How big should a chunk be?"** A trap unless you answer with a method. It depends on the document's
  structure and is settled by measuring recall on a golden set, not by picking 512.

## Reading Order

01 first — it is a decision chapter and it stops the reader building a retrieval pipeline for a problem
that did not need one. Then 02 → 03 → 04 in order, which is the pipeline in build order. 05 last, and
then reread 02 and 03 with it in mind; almost every chunking and retrieval choice becomes obvious once
there is a number attached to it.

**Interview sprint:** 01 and 05. The decision and the measurement — the two halves candidates most often
lack.

> ⚠️ **Planned, not written.** Item **#47** writes all five chapters.
