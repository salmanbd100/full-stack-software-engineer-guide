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
| 01 | Calling an LLM from TypeScript | What does a production call look like once timeouts and errors are real? |
| 02 | Streaming Responses           | How does a token reach the browser, and where does cancellation belong?  |
| 03 | Structured Output             | How do you get JSON you can trust, and what do you do when you do not?   |
| 04 | Tool Calling                  | What is the call loop, and how do parallel calls and failures behave?    |
| 05 | MCP (Model Context Protocol)  | What does it standardise, and when is building a server worth it?        |
| 06 | Multi-Provider Architecture   | How do you fail over, route by cost, and avoid one vendor's shape?       |

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

> ⚠️ **Planned, not written.** Item **#46** writes all six chapters, and is marked `L` — it spans
> sessions. Version-stamped against **AI SDK 7** and **MCP revision 2025-11-25**; check both with Context7
> before writing, because this is the fastest-moving section in the book.
