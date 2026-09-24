---
title: Part VII — AI Engineering
part: 7
chapter: 0
slug: part-ai-engineering
level: advanced
reading_time: 4
updated: 2026-09-24
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

Eight separate snippets teach eight things. One application that grows for twenty chapters teaches how
the pieces constrain each other, which is what the interview is about.

## Sections

| Section                                    | Chapters | What it covers                                                              |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| [Foundations](#ch-ai-foundations-index)     | 3        | How models behave and choosing one, prompting, context engineering          |
| [Integration](#ch-ai-integration-index)     | 5        | Calling, streaming, structured output, tools and the tool surface, MCP       |
| [RAG](#ch-ai-rag-index)                     | 3        | When to retrieve, ingestion, embeddings and retrieval                        |
| [Agents](#ch-ai-agents-index)               | 2        | The loop and multi-agent patterns, memory and durability                     |
| [Production](#ch-ai-production-index)       | 4        | Evals and error analysis, observability and cost, guardrails, prompt injection |
| [AIUX](#ch-ai-aiux-index)                   | 2        | Latency and generative UI, trust and failure states                          |

A closing chapter, [**AI in Interviews**](#ch-ai-in-interviews), sits at the root of this part and covers
how these topics are actually asked: _design a RAG system_, _how would you evaluate this feature_, _your
agent is looping, debug it_, _what breaks when the model changes version_.

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

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "The answers are wrong" | "I improved the prompt" | "I checked whether the right chunk was retrieved first — it is a retrieval bug, not a prompting one" |
| "Is it working?" | "It feels much better now" | "Pass rate on a fifty-question golden set went from 61% to 84%, and here is what still fails" |
| "What does it cost?" | "The API is quite cheap" | Tokens per request, cache hit rate, and the cost per user per month under real load |

## Reading Order

`Foundations/` → `Integration/` is the spine, and it is the half most readers will use at work first.
Then split by role: a product-facing engineer should go to `AIUX/` and `RAG/` next; anyone building
internal tooling should go to `Agents/`. `Production/` is last in the numbering and first in the
interview — read it whatever your route.

**Interview sprint:** `Foundations/01`, `Integration/03`–`04`, `RAG/01`, `Production/01`, then
[AI in Interviews](#ch-ai-in-interviews). That is the mental model, the two mechanics that always come up,
the decision most teams get wrong, the skill the market is short of, and the shape of the round itself.
