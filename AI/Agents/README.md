---
title: Agents
part: 7
chapter: 0
slug: ai-agents-index
level: advanced
reading_time: 3
updated: 2026-09-07
tags: [ai, agents, tool-calling, memory, durability, orchestration]
in_book: true
---

# Agents

Five chapters that take the mystique out of the word. An agent is a loop: the model picks a tool, the
tool runs, the observation goes back into the window, and the model picks again until it stops. Nothing
in that sentence is new to a backend engineer — it is a state machine whose transition function happens
to be a language model.

The through-line is that **the tool surface is the product.** Model choice matters less than most teams
expect; what decides whether an agent works is how the tools are named, how granular they are, what their
descriptions say, and whether their error messages tell the model something it can act on. An agent that
loops is nearly always an agent whose tools lie to it.

## Chapters

| #  | Chapter                          | What it answers                                                    |
| -- | -------------------------------- | -------------------------------------------------------------------- |
| 01 | [What an Agent Actually Is](#ch-what-an-agent-actually-is)        | What is the loop, and where does it stop?                            |
| 02 | [Designing the Tool Surface](#ch-designing-the-tool-surface)       | How granular should a tool be, and what makes a description work?    |
| 03 | [Memory and State](#ch-memory-and-state)                 | What survives a turn, a session, a restart — and at what token cost? |
| 04 | [Durability and Long-Running Work](#ch-durability-and-long-running-work) | How does a job that takes an hour survive a deploy?                  |
| 05 | [Multi-Agent Patterns](#ch-multi-agent-patterns)             | When does splitting help, and when is one agent simply better?       |

## The Running Project

The **documentation assistant** answers well now. This section asks whether it should also *do* things,
and for most of the product the honest answer is no.

| Chapter | What it adds to the assistant |
| ------- | ----------------------------- |
| 01 | The scope decision: question-and-answer stays a two-step workflow, and only doc triage — which pages cover this, and what changed — gets a loop |
| 02 | `search_docs` returning "no match, try these terms" instead of an empty array, which is what stops the triage agent looping |
| 03 | Session memory — the last few turns verbatim, older ones summarised, with the token cost of both written down |
| 04 | The nightly re-embed as a durable job, so a deploy halfway through does not leave the index half-built |
| 05 | The multi-agent version, deliberately not built, with the single-agent measurement as the reason |

Row 01 is the one to notice. A section about agents whose running project keeps most traffic on a plain
workflow is making the argument the section exists to make.

**At the end of this section** the assistant has one bounded agent — step cap, token budget, read-only
tools — and one workflow serving everything else. What it still has no view of is what any of it costs or
how often it is right, which is `Production/`.

## What Interviewers Probe For

- **"Your agent is looping. Debug it."** Read the trace before changing the prompt. The usual causes are a
  tool that returns an empty result indistinguishable from failure, two tools whose descriptions overlap,
  and no stop condition the model can satisfy. Naming the trace first is the senior move.
- **"How do you stop it deleting production data?"** Approval gates on destructive tools, least privilege
  on credentials, and a tool surface that cannot express the dangerous operation. "We told it not to" is
  not a control.
- **"When is a single agent better than three?"** Almost always, at first. Multi-agent buys parallel
  context and costs coordination, duplicated work and a much harder debugging story. A candidate who
  reaches for an orchestrator before measuring the single-agent version is showing the wrong instinct.

## Reading Order

01 → 02 in order; 02 is where most of the practical value in this section lives, and it is the chapter to
reread. 03 follows naturally from the token arithmetic in `Foundations/05`. 04 and 05 are independent —
04 matters if the work is long, 05 matters if the context is wide.

**Interview sprint:** 01 and 02. The loop and the tool surface answer most agent questions asked at
senior level.
