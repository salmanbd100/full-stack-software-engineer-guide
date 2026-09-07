---
title: Integration
part: 7
chapter: 0
slug: ai-integration-index
level: advanced
reading_time: 3
updated: 2026-09-07
tags: [ai, typescript, streaming, structured-output, tool-calling, mcp]
in_book: true
---

# Integration

The section the reader will use at work on Monday. Six chapters on getting a model into a TypeScript
application and keeping it there: the call, the stream, the schema, the tools, the protocol, and the
question of what happens when the provider has an outage.

The through-line is that **a model call is a network call to an unreliable, slow, expensive service that
sometimes returns the wrong shape.** Every pattern here is one a senior engineer already applies to
third-party APIs — timeouts, retries, validation at the boundary, a failover story — applied to a
dependency that fails in one unfamiliar way: it fails while returning HTTP 200.

## Chapters

| #  | Chapter                       | What it answers                                                       |
| -- | ----------------------------- | ----------------------------------------------------------------------- |
| 01 | [Calling an LLM from TypeScript](#ch-calling-an-llm-from-typescript) | What does a production call look like once timeouts and errors are real? |
| 02 | [Streaming Responses](#ch-streaming-responses)           | How does a token reach the browser, and where does cancellation belong?  |
| 03 | [Structured Output](#ch-structured-output)             | How do you get JSON you can trust, and what do you do when you do not?   |
| 04 | [Tool Calling](#ch-tool-calling)                  | What is the call loop, and how do parallel calls and failures behave?    |
| 05 | [MCP (Model Context Protocol)](#ch-model-context-protocol)  | What does it standardise, and when is building a server worth it?        |
| 06 | [Multi-Provider Architecture](#ch-multi-provider-architecture)   | How do you fail over, route by cost, and avoid one vendor's shape?       |

## The Running Project

The **documentation assistant** becomes a running application here. Six chapters, and by the last one it
answers questions in a browser end to end — badly, but for real.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | An `/ask` route that calls the answer model with the versioned prompt, a timeout shorter than the reader's patience, and typed errors instead of thrown strings |
| 02 | Streaming to the browser, and cancellation when the reader navigates away mid-answer |
| 03 | A schema for the reply — prose plus the ids of the passages it cites — validated at the boundary, with a decided path for when it does not validate |
| 04 | Two tools, `search_docs` and `get_page`, so the model can look something up rather than guess |
| 05 | The same `search_docs` exposed over MCP, so it works inside an editor as well as in the web app |
| 06 | A second provider behind one call site, and the routing rule that sends query rewriting to the small model from `Foundations/02` |

The shape to get right is 03. An answer that carries passage ids rather than pasted text is what makes
citations, guardrails and generative UI possible later — three sections all depend on that one field.

**At the end of this section** the assistant streams cited answers and is wrong often, because "search"
is still a keyword query and nothing measures anything. `RAG/` fixes the first half of that sentence,
`Production/` the second.

## What Interviewers Probe For

- **"The request hangs. What breaks first?"** Whatever has no timeout. Model calls are the slowest
  dependency most applications have ever had, and a default HTTP timeout is usually longer than the
  user's patience by a factor of ten.
- **"The model returned JSON with a missing field. What now?"** Validate at the boundary, then choose
  deliberately between a repair round trip, a fallback value, and surfacing the failure. A candidate who
  says "the schema guarantees it" has not run this in production.
- **"Why not just wrap every provider yourself?"** Because the abstraction leaks exactly where it matters
  — tool-call shapes, streaming events, caching semantics. The interesting answer is about which
  differences you are willing to normalise and which you must expose.

## Reading Order

01 → 02 → 03 in order; they build directly. 04 depends on 03, because a tool call is structured output
with a loop around it. 05 depends on 04. Chapter 06 is independent and can wait until a second provider
is actually on the table.

**Interview sprint:** 03 and 04. Structured output and tool calling are the two mechanics that appear in
almost every applied AI interview.


> ⚠️ **Version-stamped.** These six chapters are written against **AI SDK 7** and **MCP revision
> 2025-11-25**, the two fastest-moving dependencies in the book. Each chapter names the durable principle
> underneath the API it shows.
