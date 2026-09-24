---
title: Memory, State and Long-Running Work
part: 7
chapter: 17
slug: durability-and-long-running-work
level: advanced
reading_time: 14
updated: 2026-09-24
tags: [ai, agents, memory, state, compaction, durability, checkpointing, retries, approval, workflow, typescript]
in_book: true
---

# Memory, State and Long-Running Work {#ch-durability-and-long-running-work}

> Keep the facts an agent needs where the window cannot lose them, and make a long run survive a crash without paying for its work twice.

**In this chapter:** three kinds of memory · clearing tool output before summarising · a working state outside the conversation · checkpoints and idempotent effects · approval as a pause

## 💡 The Core Idea

A model is stateless. Every memory is something your code put back into the window, so memory is **a
storage and selection problem you own.** It splits into three problems people mix up: what the model sees
this turn, what survives compaction, and what is still true next week.

Long runs add a fourth problem: what survives a crash. An agent loop that takes forty minutes cannot live
in an HTTP request. Deploys, timeouts and crashes all end it, and every lost step was a paid model call.
So a long-running agent is **a durable workflow that happens to call a model.**

> The conversation is a cache, not a database. The unit of durability is the step: if a step completed,
> its result must survive; if it did not, it must be safe to run again.

## How It Works

### Three kinds, three lifetimes

| Kind | Lives in | Lifetime | Cost |
| --- | --- | --- | --- |
| **Working context** | The window | This request | Tokens, every step |
| **Session state** | Your store, reloaded per turn | The task or conversation | Storage, plus selection logic |
| **Long-term memory** | A database or index | Across sessions | Storage, plus retrieval and staleness |

Most "it forgot" bugs are a missing middle row. The fact was in the window ten steps ago. Compaction
dropped it, and nothing else held it.

### Tool output eats the window

In an agent, history is **mostly tool output** — file contents, search results, API responses. The
documentation assistant reads whole pages of docs, and by step 8 tool results can be 94,000 tokens
against 6,000 of messages. Most were read once and never used again. So **clearing old tool results is the
cheapest way to get space back.** It needs no model call. Leave a marker, so the model fetches the
result again when it needs it rather than deciding the step never happened.

**Clearing stale tool results, with a marker left behind**

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

When the conversation must shrink, go cheapest first: clear tool results (free), then summarise old
turns (a model call, and a model decides what mattered). Truncating is free but loses facts silently.
[Chapter ?? — Context Engineering](#ch-context-engineering) has the full table.

> ⚠️ Summarisation loses things in ways you cannot inspect. The classic failure: the agent forgets a
> first-message constraint — "do not touch the billing service" — because a summary at step 12 judged it
> no longer relevant. Pin constraints outside the summary.

### A working state the window cannot lose

Stop treating the conversation as the source of truth. Keep a small, structured state next to the loop.
Update it as the agent works, and inject it again every turn.

**The state that survives compaction and restarts**

```typescript
interface AgentState {
  readonly goal: string;
  readonly constraints: string[];        // pinned; never summarised away
  readonly findings: Record<string, string>;
  readonly completed: string[];
  readonly failed: { step: string; reason: string }[];
}
```

It costs a few hundred tokens. Constraints survive compaction. Finished work is not repeated. Failures
stay visible, so the agent stops retrying them. And because it is structured, it can be saved to disk.

### Long-term memory

Memory across sessions is retrieval with a different corpus — see
[Chapter ?? — Embeddings, Vector Stores and Retrieval](#ch-retrieval). The hard problem is **contradiction over time.** "The user prefers
dark mode" stored in March may be wrong in June, and nothing in the store knows. Timestamp every memory,
prefer recent ones, and let new facts supersede old ones rather than only appending. Memory is also personal data. Never store secrets or tokens, give memories a time-to-live, and scope by
user id in the store, never in the prompt.

### Persist after every step

**A checkpoint, written before the next step starts**

```typescript
interface Checkpoint {
  readonly runId: string;
  readonly step: number;
  readonly messages: Message[];      // the conversation so far
  readonly state: AgentState;        // goal, constraints, findings
  readonly status: 'running' | 'awaiting-approval' | 'done' | 'failed';
  readonly spentTokens: number;
}

async function step(run: Checkpoint): Promise<Checkpoint> {
  const res = await model.generate({ messages: run.messages, tools });
  const results = await Promise.all(res.toolCalls.map((c) => dispatch(c, run.runId)));
  const next = advance(run, res, results);
  await checkpoints.put(next);        // durable before anything else observes it
  return next;
}
```

A crash now costs at most one step. A resume reads the last checkpoint; it does not replay from the
start, because a model step is not deterministic. The budget lives in the checkpoint too: in the process,
every restart resets it and a crash-loop becomes an unbounded bill.

### Duplicate effects are the hard part

Retrying a read is free. Retrying `sendEmail` sends a second email. A crash between "tool ran" and
"checkpoint written" is exactly where that happens. An idempotency key must be derived from `runId` and
step — a fresh key on retry defeats it.

| Approach | How | Fits |
| --- | --- | --- |
| **Idempotency key** | `${runId}:${step}:${toolName}` passed downstream | Any API that supports it |
| **Write-ahead intent** | Record "about to call X"; on resume, check whether it happened | Systems with no idempotency support |
| **Design it out** | `setStatus('sent')` rather than `incrementCounter()` | Always, where possible |

### Retries at three levels

1. **The tool.** Retry transient failures with backoff and the same idempotency key.
2. **The model.** If the tool is really down, return the failure as an observation — "the search index
   is unavailable" — so the model can take another route or stop honestly.
3. **The run.** If nothing works, fail checkpointed, so a retry resumes rather than restarts.

The middle level is the one people leave out. Without it, a run burns its budget on one broken tool.

### Human approval is a pause, not a prompt

An approval gate on a destructive action can suspend a run for days. That is a state, not a blocking call.

**Suspending the run until someone approves**

```typescript
if (tool.destructive) {
  await checkpoints.put({ ...run, status: 'awaiting-approval', pending: call });
  await notify(run.owner, call);
  return;                                   // the process exits; nothing is held open
}
// resumed later by an approval webhook, which loads the checkpoint and continues
```

Nothing is held open, so a deploy during the wait is harmless. The approval carries `runId` and step, so
a double-clicked button resolves to the same step and cannot run the action twice. Give approvals a
timeout, so a run does not resume a week later into a world that has moved on.

> ⚠️ **Moving target:** durable execution frameworks — hosted workflow runtimes, queue-backed schedulers,
> agent platforms — change quickly and name these ideas differently. Whatever the framework, check it
> checkpoints every step, keys effects idempotently and models approval as a suspended state.

## When to Use It

| Situation | Mechanism |
| --- | --- |
| Window full after ten steps | Clear old tool results first |
| Constraints must never be lost | Structured state injected every turn |
| Facts needed next week | Long-term store with timestamps and expiry |
| Run of 5 min or more, or scheduled | Checkpointed workflow, idempotent tools, resumable |
| Any destructive tool | Approval gate, whatever the duration |

## Common Mistakes

**❌ Treating the conversation as durable storage**

> It gets compacted, truncated and lost on restart. Anything that matters lives outside it.

**✅ Pin goal and constraints in a structured state**

> They cost a few hundred tokens, and losing them causes the worst failures.

**❌ Running a long agent inside an HTTP request, or holding it open for approval**

> The first deploy kills it, and every completed step is paid for twice.

**✅ Checkpoint every step, persist the budget, and exit while waiting**

> A resume costs at most one step, and a crash-loop stops at the budget you chose.

## 🔑 Key Takeaways

- Models are stateless, so every memory is something your code supplies again — a storage problem you own.
- Tool output fills an agent's window, so clear it before summarising anything.
- Pin goal and constraints in a small structured state, because summaries drop them silently.
- A long-running agent is a durable workflow: checkpoint every step, and persist the budget with it.
- Derive idempotency keys from run and step, and model human approval as a suspended state.

## Interview Questions

**Q: Your agent forgot a constraint from the first message. What went wrong?**

Compaction. A summary at a later step judged the constraint no longer relevant, and nothing errored. A
better summariser is not the fix. I keep goal and constraints in a structured state, injected every turn,
which costs a few hundred tokens and removes the failure mode.

**Q: An agent's window fills after ten steps. Summarise, or something else first?**

Something else first: clear old tool results. Most of the window is tool output read once and never used
again, and clearing it needs no model call. Summarising costs a call and lets a model decide what
mattered. I leave a marker so the agent knows it can fetch the result again.

**Q: How do you stop a retry from sending two emails?**

An idempotency key built from run id, step number and tool name, passed downstream so the duplicate is
ignored. The key must be derived, not generated — a fresh key on retry defeats it. Where the downstream
system has no idempotency support, I record the intent first and check on resume whether it happened.

**Q: How do you implement human approval for a destructive step?**

As a state change, not a blocking wait. The run checkpoints as "awaiting approval" with the pending call,
notifies the owner, and the process exits. A webhook loads the checkpoint and resumes, so a deploy during
the wait is harmless and a duplicate approval cannot run the action twice. The approval also expires.

## What to Read Next

- [Chapter ?? — Context Engineering](#ch-context-engineering) — the budget these mechanisms allocate against
- [Chapter ?? — What an Agent Is, and When to Use More Than One](#ch-what-an-agent-actually-is) — durability when several loops are in flight
- [Chapter ?? — Observability and Cost Engineering](#ch-observability) — reading what a forty-minute run actually did
