---
title: RAG
part: 7
chapter: 11
slug: ai-rag-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [ai, rag, retrieval, chunking, embeddings, vector-store]
in_book: true
---

# RAG

Retrieval-augmented generation is the most common enterprise LLM pattern. Three chapters: the decision,
the pipeline in, and the pipeline out. Measuring it lives in `Production/01`, next to every other eval.

The through-line is that most "the model gave a wrong answer" bugs are not model bugs. The right passage
was never retrieved, or was ranked eleventh, or was cut in half by a chunker that counted characters.
Until retrieval is measured, every fix is a guess.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [When RAG, When Fine-Tune, When Neither](#ch-when-rag-when-fine-tune-when-neither) | Which problem does each solve, and why do teams pick wrong? |
| 02 | [Ingestion and Chunking](#ch-ingestion-and-chunking) | How do you split a document without destroying its meaning? |
| 03 | [Embeddings, Vector Stores and Retrieval](#ch-retrieval) | What is a vector, is pgvector enough, and where does reranking earn its latency? |

## The Running Project

Coming in, the **documentation assistant** streams answers over a keyword query. This section replaces
the search.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | The decision out loud: the docs change weekly, so the facts belong in a store, not in weights |
| 02 | Chunking by heading, with the page, heading path and updated date on every chunk |
| 03 | Embeddings in `pgvector`, the re-embed job, and hybrid retrieval with a rerank at `k = 5` |

**At the end of this section** retrieval works and nothing measures it. The golden set and recall@5 are
the first thing `Production/01` builds.

## What Interviewers Probe For

- **"The assistant answered wrongly. Where do you look first?"** At what was retrieved. Print the chunks
  that went into the window before touching the prompt. Most candidates skip this.
- **"Why not fine-tune instead?"** Fine-tuning teaches form and behaviour; retrieval supplies facts. Facts
  that change weekly belong in a store.
- **"How big should a chunk be?"** A trap unless you answer with a method: measure recall on a golden set.

## Reading Order

01 first — it stops you building a pipeline for a problem that did not need one. Then 02 → 03, which is
the pipeline in build order. Then `Production/01`.

**Interview sprint:** 01, then the retrieval half of `Production/01`.
