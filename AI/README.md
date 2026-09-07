---
title: Part VII — AI Engineering
part: 7
chapter: 0
slug: part-ai-engineering
level: advanced
reading_time: 4
updated: 2026-09-07
tags: [ai, llm, rag, agents, evals, ai-ux, typescript]
in_book: true
---

# Part VII — AI Engineering

This part is for engineers who **build features with models**, not for engineers who train them. There is
no CUDA here, no PyTorch, no gradient descent, and no maths beyond what cosine similarity needs. What
there is instead is the work a full stack engineer is actually handed in 2027: call a model from
TypeScript, stream the answer, keep it structured, give it tools, retrieve the right context, measure
whether any of it works, and design the interface around a system that is slow, occasionally wrong, and
never quite deterministic.

Every survey of 2026 hiring lands on the same three skills — **RAG, agents, and evaluation** — and names
evaluation as the most under-taught of the three. That is the shape of this part. Five sections teach the
mechanics; `Production/` teaches the measurement that separates someone who has built a demo from someone
who has shipped a feature; `AIUX/` covers the interface layer, which is the weakest chapter in every AI
book written by backend and ML people.

> The senior question in an AI round is never "can you call the API". It is "how do you know it works,
> and what did you do when it did not".

## The Running Project

One small application threads through the whole part: a **documentation assistant** that answers questions
about a codebase's own docs. It is deliberately unglamorous and deliberately complete — by the end of the
part it calls a model, streams to a browser, retrieves from a vector store, uses tools, has an eval suite
with a golden set, costs a known amount per question, and degrades honestly when the model refuses.

Eight disconnected snippets teach eight things. One application that grows for thirty-one chapters teaches
how the pieces constrain each other, which is what the interview is about.

## Sections

| Section                                    | Chapters | What it covers                                                              |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| [Foundations](./Foundations/README.md)     | 5        | How models behave, choosing one, prompting, embeddings, context engineering |
| [Integration](./Integration/README.md)     | 6        | Calling, streaming, structured output, tools, MCP, multi-provider            |
| [RAG](./RAG/README.md)                     | 5        | When to retrieve, ingestion, retrieval, vector stores, retrieval evaluation  |
| [Agents](./Agents/README.md)               | 5        | The loop, the tool surface, memory, durability, multi-agent patterns         |
| [Production](./Production/README.md)       | 6        | Evals, error analysis, observability, cost, guardrails, prompt injection     |
| [AIUX](./AIUX/README.md)                   | 4        | Latency, generative UI, trust and correctness, failure states                |

A closing chapter, **AI in Interviews**, sits at the root of this part and covers how these topics are
actually asked: _design a RAG system_, _how would you evaluate this feature_, _your agent is looping,
debug it_, _what breaks when the model changes version_.

> ⚠️ **Moving target, by construction.** Provider SDKs, the AI SDK, and the Model Context Protocol all
> ship breaking changes on a scale of months — this part is version-stamped against **AI SDK 7** and **MCP
> revision 2025-11-25**. The durable material is underneath the API names: a token budget is a budget
> whatever the parameter is called, retrieval quality is measurable whatever the store is, and an eval
> suite outlives every SDK in it. Where a chapter names a version, it says why.

## What Interviewers Probe For

The senior signal for this part is **measures before improving — treats a wrong answer as a retrieval bug
or an eval gap, not as bad luck.**

- **Do you have a number?** "It feels better" is the answer that ends an AI interview badly. A golden set
  of fifty questions and a pass rate is the answer that does not.
- **Can you locate a failure?** When the assistant answers wrongly, the candidate who asks whether the
  right chunk was retrieved is ahead of the candidate who rewrites the prompt.
- **Do you know what it costs?** Tokens per request, cache hit rate, and the price of the request path
  under load. AI features are the first features in years whose marginal cost is visible per user.
- **Have you designed the unhappy path?** Refusals, timeouts, partial answers and rate limits are normal
  operating conditions here, not edge cases.
- **Do you know where the security boundary is?** Prompt injection is the discipline's defining
  vulnerability, and "the model reads untrusted text and can call tools" is the sentence that explains it.

## Reading Order

`Foundations/` → `Integration/` is the spine, and it is the half most readers will use at work first.
Then split by role: a product-facing engineer should go to `AIUX/` and `RAG/` next; anyone building
internal tooling should go to `Agents/`. `Production/` is last in the numbering and first in the
interview — read it whatever your route.

**Interview sprint:** `Foundations/01`, `Integration/03`–`04`, `RAG/01` and `05`, `Production/01`. That is
the mental model, the two mechanics that always come up, the decision most teams get wrong, and the skill
the market is short of.

> ⚠️ **This part is still filling up.** `Foundations/` is written (#45); the other five section indexes
> list chapters that are planned, and their titles appear as plain text until the file exists. Items
> #46–#53 fill them in.
