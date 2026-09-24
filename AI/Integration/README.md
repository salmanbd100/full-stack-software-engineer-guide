---
title: Integration
part: 7
chapter: 5
slug: ai-integration-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [ai, typescript, streaming, structured-output, tool-calling, mcp]
in_book: true
---

# Integration

The section you will use at work on Monday. Five chapters on getting a model into a TypeScript
application: the call, the stream, the schema, the tools and the protocol.

The through-line: **a model call is a network call to a slow, expensive service that sometimes returns
the wrong shape.** Timeouts, retries and validation at the boundary all still apply. The new failure is
that it fails while returning HTTP 200.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Calling an LLM from TypeScript](#ch-calling-an-llm-from-typescript) | What does a production call look like once timeouts and errors are real? |
| 02 | [Streaming Responses](#ch-streaming-responses) | How does a token reach the browser, and where does cancellation belong? |
| 03 | [Structured Output](#ch-structured-output) | How do you get JSON you can trust, and what do you do when you do not? |
| 04 | [Tool Calling and the Tool Surface](#ch-tool-calling) | What is the call loop, and what makes a tool the model uses correctly? |
| 05 | [MCP (Model Context Protocol)](#ch-model-context-protocol) | What does it standardise, and when is building a server worth it? |

## The Running Project

The **documentation assistant** becomes a running application here. By the last chapter it answers
questions in a browser end to end — badly, but for real.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | An `/ask` route with the versioned prompt, a timeout shorter than the reader's patience, and typed errors |
| 02 | Streaming to the browser, and cancellation when the reader leaves mid-answer |
| 03 | A reply schema — prose plus the ids of the passages it cites — validated at the boundary |
| 04 | Two tools, `search_docs` and `get_page`, and a `search_docs` that says "no match, try these terms" instead of returning nothing |
| 05 | The same `search_docs` over MCP, so it works inside an editor too |

The shape to get right is 03. Passage ids rather than pasted text are what make citations, guardrails and
generative UI possible later.

**At the end of this section** the assistant streams cited answers and is often wrong. Search is still a
keyword query and nothing is measured. `RAG/` fixes the first half of that, `Production/` the second.

## What Interviewers Probe For

- **"The request hangs. What breaks first?"** Whatever has no timeout. A default HTTP timeout is usually
  ten times longer than the user's patience.
- **"The model returned JSON with a missing field. What now?"** Validate at the boundary, then choose on
  purpose between a repair call, a fallback and showing the failure. "The schema guarantees it" is wrong.
- **"Your agent keeps calling the wrong tool."** Read the descriptions. Two tools with overlapping
  descriptions, or one that returns an empty result, cause most tool-use bugs.

## Reading Order

01 → 02 → 03 in order. 04 depends on 03, because a tool call is structured output with a loop around it.
05 depends on 04.

**Interview sprint:** 03 and 04. They appear in almost every applied AI interview.

> ⚠️ **Version-stamped.** These chapters are written against **AI SDK 7** and **MCP revision
> 2025-11-25**. Each one names the durable principle underneath the API it shows.
