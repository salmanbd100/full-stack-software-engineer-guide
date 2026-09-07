---
title: Memory and State
part: 7
chapter: 0
slug: memory-and-state
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [ai, agents, memory, state, compaction, checkpointing, typescript]
in_book: true
---

# Memory and State {#ch-memory-and-state}

> Keep what the next step needs, drop what it does not, and put the facts that must survive somewhere the window cannot lose them.

**In this chapter:** three kinds of memory · why tool output eats the window · compaction and its cost · a working state outside the conversation · persistent memory · what not to remember

## 💡 The Core Idea

A model is stateless. Every apparent memory is something your code chose to put back into the window on
the next request — so "memory" is not a model capability, it is **a storage and selection problem you
own.**

That reframing matters because it splits into three distinct problems that get conflated. What the model
sees this turn. What survives when the conversation is compacted. And what is still true next week. They
need different mechanisms, and using the conversation history for all three is why long-running agents
forget the one fact that mattered.

> The conversation is a cache, not a database. Anything you cannot afford to lose does not live there.

## How It Works

### Three kinds, three lifetimes

| Kind | Lives in | Lifetime | Cost |
| --- | --- | --- | --- |
| **Working context** | The window | This request | Tokens, every step |
| **Session state** | Your store, reloaded per turn | The task or conversation | Storage, plus selection logic |
| **Long-term memory** | A database or index | Across sessions | Storage, plus retrieval and staleness |

Most agent bugs described as "it forgot" are a missing middle row. The fact was in the window ten steps
ago, compaction dropped it, and nothing else was holding it.

### Tool output eats the window

In a chat application, history is messages. In an agent, history is **mostly tool output** — file
contents, search results, API responses — and it grows far faster.

```text
Step 3:  system 800 · tools 1,200 · messages 2,400 · tool results 18,000
Step 8:  system 800 · tools 1,200 · messages 6,100 · tool results 94,000
```

Tool results dominate, and most of them were read once and never referenced again. That makes
**clearing old tool results the cheapest reclamation available** — it costs no model call, preserves the
shape of the conversation, and reclaims most of the space.

```typescript
function clearStaleToolResults(messages: Message[], keepRecent = 3): Message[] {
  const cutoff = messages.length - keepRecent * 2;
  return messages.map((m, i) =>
    m.role === 'tool' && i < cutoff
      ? { ...m, content: `[cleared: ${summarise(m)} — call the tool again if needed]` }
      : m,
  );
}
```

Leaving a marker rather than deleting the message matters. The model can see that a result existed and
was cleared, so it re-fetches when it genuinely needs it instead of concluding the step never happened.

### Compaction, and what it costs

When the conversation itself must shrink, you have three mechanisms with three different prices —
[Chapter ?? — Context Engineering](#ch-context-engineering) sets out the full table. For agents the
ordering is:

1. **Clear tool results.** Free, no information the model chose to keep is lost.
2. **Summarise old turns.** A model call, and a model decides what mattered.
3. **Truncate.** Free, and silently loses facts.

> ⚠️ Summarisation is lossy in a way you cannot inspect. The classic failure is an agent forgetting the
> constraint it was given in the first message — "do not touch the billing service" — because a summary
> written at step 12 judged it no longer relevant. Pin the constraints outside the summary.

### A working state the window cannot lose

The fix for that failure is to stop treating the conversation as the source of truth. Keep a small,
structured state next to the loop, updated as the agent works, and re-inject it every turn.

```typescript
interface AgentState {
  readonly goal: string;
  readonly constraints: string[];        // pinned; never summarised away
  readonly findings: Record<string, string>;
  readonly completed: string[];
  readonly failed: { step: string; reason: string }[];
}
```

This is cheap — a few hundred tokens — and it changes the failure modes considerably. Constraints survive
compaction. Completed work is not repeated after a summary loses it. Failures are visible, so the agent
stops retrying what already failed. And because it is structured, it survives a process restart, which is
what [Chapter ?? — Durability and Long-Running Work](#ch-durability-and-long-running-work) builds on.

### Long-term memory

Memory across sessions is a retrieval problem, and it is
[Chapter ?? — Retrieval](#ch-retrieval) with a different corpus.

| Approach | Fits | Watch for |
| --- | --- | --- |
| Append every conversation to an index | Support and assistant products | Retrieving stale or contradictory facts |
| Extract facts explicitly, store as records | Preferences, settings, entities | Extraction errors become permanent |
| A user profile the model may update via a tool | Personalisation | The model writing things the user did not say |

All three share one hard problem: **contradiction over time.** "The user prefers dark mode" stored in
March is wrong in June, and nothing in the store knows that. Timestamp every memory, prefer recent ones,
and give the system a way to supersede rather than only append.

### What not to remember

Memory is a data-protection surface with a retention policy, whether or not anyone wrote one.

- Do not store secrets, tokens or personal data that arrived in a conversation.
- Give memories a time-to-live; an assistant that remembers everything for ever is a liability.
- Let users see and delete what is stored about them — increasingly a legal requirement, not a courtesy.
- Never let one user's memory reach another's session. Scope by user id in the store, not in the prompt.

## When to Use It

| Situation | Mechanism |
| --- | --- |
| Agent filling its window in ten steps | Clear old tool results first |
| Long conversation referencing early decisions | Summarise, with constraints pinned outside |
| Constraints must never be lost | Structured state re-injected every turn |
| Facts needed next week | Long-term store with timestamps |
| Short task, few steps | Nothing — the window is enough |

## Common Mistakes

**❌ Treating the conversation as durable storage**

> It gets compacted, truncated and lost on restart. Anything that matters lives outside it.

**❌ Summarising when clearing tool results would have done**

> A model call and a lossy rewrite, to reclaim space a free operation would have reclaimed.

**❌ Long-term memory with no expiry or supersede path**

> Stale preferences and contradictory facts accumulate, and the agent gets confidently outdated.

**✅ Pin goal and constraints outside the summarisable history**

> They are a few hundred tokens and they are the facts whose loss produces the worst failures.

## 🔑 Key Takeaways

- Models are stateless; every memory is something your code re-supplies, so it is a storage problem you own.
- Tool output, not messages, is what fills an agent's window — clear it before summarising anything.
- Summarisation is lossy in ways you cannot inspect, so pin goals and constraints outside it.
- A small structured state re-injected each turn survives compaction and process restarts.
- Long-term memory needs timestamps and a supersede path, or it becomes confidently stale.

## Interview Questions

**Q: How does an agent "remember" anything?**

It does not — the model is stateless, and every request is judged only on what is in the window. Memory
is whatever my code puts back: the conversation history for this turn, a stored state for this task, and
a retrieval store for anything that has to survive across sessions. Those are three different mechanisms
with three lifetimes, and conflating them is why long-running agents lose the one constraint that
mattered.

**Q: An agent's window fills up after ten steps. What do you do first?**

Clear old tool results. In an agent, most of the window is tool output — file contents, search results —
read once and never referenced again. Clearing them costs nothing, needs no model call, and keeps the
conversation's structure, whereas summarisation costs a call and lets a model decide what mattered. I
would leave a marker where each result was so the agent knows it can re-fetch rather than concluding the
step never happened.

**Q: Your agent forgot a constraint from the first message. What went wrong?**

Compaction. The constraint was in the history, a summarisation pass at some later step judged it no
longer relevant, and it disappeared without anything erroring. The fix is not a better summariser — it is
to stop keeping constraints in the summarisable history at all. I keep goal and constraints in a small
structured state and re-inject them every turn, which costs a few hundred tokens and removes the failure
mode.

**Q: How would you build memory across sessions?**

As a retrieval problem, with a store keyed by user, timestamps on every record, and a way to supersede
facts rather than only appending them. The hard part is contradiction over time: a preference recorded in
March may be false in June, and nothing in an append-only store knows that, so the agent retrieves both
and acts confidently on the wrong one. I would also scope strictly by user in the store rather than
relying on the prompt, and put a retention policy on it, since remembered conversation content is
personal data.

**Q: What would you deliberately not store?**

Secrets, tokens and personal data that happened to appear in a conversation, and anything without a
retention period. An assistant that remembers everything for ever is a data-protection liability and a
breach that has not happened yet. Users should be able to see and delete what is held about them, which
is now a legal requirement in most of the markets this book's readers work in rather than a nice
gesture.

## What to Read Next

- [Chapter ?? — Context Engineering](#ch-context-engineering) — the budget these mechanisms allocate against
- [Chapter ?? — Durability and Long-Running Work](#ch-durability-and-long-running-work) — this state, persisted across restarts
- [Chapter ?? — Retrieval](#ch-retrieval) — long-term memory is retrieval with a different corpus
