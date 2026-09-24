---
title: Agents
part: 7
chapter: 15
slug: ai-agents-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [ai, agents, memory, durability, orchestration]
in_book: true
---

# Agents

Two chapters that take the mystique out of the word. An agent is a loop: the model picks a tool, the tool
runs, the result goes back into the window, and the model picks again until it stops. To a backend
engineer it is a state machine whose transition function is a language model.

The through-line is that **the tool surface is the product.** Whether an agent works depends less on the
model than on how its tools are named and described, and on what their errors say. That is taught in
[Chapter ?? — Tool Calling and the Tool Surface](#ch-tool-calling); this section builds on it.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [What an Agent Is, and When to Use More Than One](#ch-what-an-agent-actually-is) | What is the loop, where does it stop, and when is one agent simply better? |
| 02 | [Memory, State and Long-Running Work](#ch-durability-and-long-running-work) | What survives a turn, a session and a deploy — and at what token cost? |

## The Running Project

The **documentation assistant** answers well now. This section asks whether it should also *do* things.
For most of the product the honest answer is no.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | The scope decision: Q&A stays a two-step workflow, and only doc triage gets a loop. The multi-agent version is deliberately not built |
| 02 | Session memory — recent turns verbatim, older ones summarised — and the nightly re-embed as a durable job |

**At the end of this section** the assistant has one bounded agent — step cap, token budget, read-only
tools — and a workflow for everything else. It still cannot say what any of it costs or how often it is
right. That is `Production/`.

## What Interviewers Probe For

- **"Your agent is looping. Debug it."** Read the trace before changing the prompt. The usual causes are
  an empty tool result that looks like failure, two overlapping tools, and no stop condition the model can meet.
- **"How do you stop it deleting production data?"** Approval gates on destructive tools, least privilege,
  and a tool surface that cannot express the dangerous operation. "We told it not to" is not a control.
- **"When is a single agent better than three?"** Almost always, at first. Multi-agent buys parallel
  context and costs coordination and a much harder debugging story. Measure the single agent first.

## Reading Order

Read the tool-calling chapter in `Integration/` first, then 01 → 02.

**Interview sprint:** 01. The loop and its stop condition answer most agent questions at senior level.
