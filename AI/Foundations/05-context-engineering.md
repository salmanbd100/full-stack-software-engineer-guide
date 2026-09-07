---
title: Context Engineering
part: 7
chapter: 0
slug: context-engineering
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [ai, context-window, prompt-caching, compaction, tokens, retrieval]
in_book: true
---

# Context Engineering {#ch-context-engineering}

> Decide what occupies a finite, ordered, expensive window on every request — and what gets cut.

**In this chapter:** the reframe · the window as a budget · why order decides your bill · what to cut and how · more context is not better

## 💡 The Core Idea

Prompt engineering asks *what should I say to the model*. Context engineering asks the question that
actually determines the answer in a production system: **what is in the window on this request, in what
order, and what did it displace?**

The reframe happened because the job changed. A 2023 feature sent a handwritten prompt. A 2026 feature
assembles a request from a system prompt, a set of tool definitions, a conversation history, several
retrieved documents and a user message — most of it selected by code, at runtime, from far more material
than could ever fit. Nobody writes that by hand. Something decides, every request, and that decider is
the most consequential component in the system.

> The model does not have a memory problem. Your assembly step has an allocation problem.

## How It Works

### The window is a budget with five claimants

One number covers everything: instructions, tool schemas, history, retrieved context and the answer. The
answer is allocated last, so it is what gets squeezed —
[Chapter ?? — How LLMs Behave](#ch-how-llms-behave) has the mechanics.

Budget it explicitly rather than discovering the limit at the provider:

```typescript
interface Budget {
  readonly total: number;      // the model's context limit
  readonly reserveForOutput: number; // subtract this first, always
}

function assemble(b: Budget, parts: { instructions: string; tools: number; history: Message[]; retrieved: Doc[] }) {
  let left = b.total - b.reserveForOutput - count(parts.instructions) - parts.tools;
  const docs = takeWhileFits(parts.retrieved, () => left, 0.4);  // retrieval gets a share
  const history = takeRecentWhileFits(parts.history, () => left); // history gets the rest
  return { docs, history };
}
```

Reserving output space **first** is the detail that matters. An assembler that fills the window and then
asks for an answer produces truncated responses under exactly the conditions — long conversation, lots of
retrieval — where the answer matters most.

Count with the provider's own token counter. A character heuristic is off by three times on JSON and
code, which is enough to turn a safe assembly into a rejected request.

### Order decides your bill

Caching is a **prefix match**: providers cache from the start of the request up to a breakpoint, and any
byte that changes anywhere in that prefix invalidates everything after it. So the ordering rule is
mechanical.

```text
Stable and reusable  →  ...  →  volatile and per-request
```

| Position | Content | Why there |
| --- | --- | --- |
| First | Tool definitions, system instructions | Identical every request; the cache lives here |
| Middle | Long-lived conversation history | Grows by appending, so the prefix survives |
| Last | Retrieved documents, the user's question | Different every request; must not sit in front |

One timestamp, request id or shuffled JSON key near the front of the prompt silently drops the hit rate
to zero, and nothing errors — the bill just goes up. Verify by reading the cache-read token count the
provider returns, not by assuming the arrangement worked:

```typescript
const { usage } = await generateText({ model: MODEL, instructions: STABLE, messages });
usage.inputTokenDetails?.cacheReadTokens; // zero across repeats means a silent invalidator
```

### More context is not better

The intuition that a bigger window means you should fill it is wrong, and measurably so. Model accuracy
degrades as irrelevant material is added, and material in the **middle** of a long context is attended to
less reliably than material at either end. Ten well-chosen paragraphs beat a hundred that include them.

This is why retrieval quality, not window size, is the constraint in a retrieval system — and why the
right response to "the answer was wrong" is to look at what was retrieved before touching the prompt.

> ⚠️ A million-token window is a capacity, not an instruction. Filling it costs latency and money on every
> request and usually costs accuracy too.

### What to cut, and the three ways to cut it

Eventually history does not fit. There are three mechanisms and they are not interchangeable.

| Mechanism | What it does | Costs | Use when |
| --- | --- | --- | --- |
| **Truncation** | Drops the oldest turns | Loses facts silently | Chat with no long-range dependencies |
| **Summarisation / compaction** | Replaces old turns with a summary | A model call; detail is lost, chosen by a model | Long conversations that reference earlier decisions |
| **Clearing tool results** | Removes bulky tool outputs, keeps the turns | Nothing, if the result is no longer needed | Agents — tool output dominates their history |

The third is the one teams miss and the cheapest by far. In an agent loop, the bulk of the window is
usually tool output that was read once and never referenced again. Clearing it keeps the conversation's
shape and reclaims most of the space, without a summarisation call and without a model deciding what
mattered.

> ⚠️ **Moving target:** server-side compaction and context-editing APIs arrived recently and their names,
> triggers and beta flags move release to release. The durable principle is the table above — three
> distinct mechanisms with three distinct costs. Check the current API before writing the call.

### Retrieval is context selection

A retrieval system is a context engineering system with a database attached. Chunk size decides the
granularity of what you can put in the window; *k* decides how much of the budget retrieval takes;
reranking decides which of the candidates earns the space. All three are budget decisions before they are
search decisions, and Part VII's `RAG/` section is about getting them right.

## When to Use It

| Symptom | The lever | Not this |
| --- | --- | --- |
| Answers truncate under load | Reserve output tokens before assembling | A bigger model |
| Cost grows faster than traffic | Fix the cache prefix; check cache-read tokens | A cheaper model |
| Long conversations lose earlier facts | Compaction, not truncation | A bigger window |
| An agent fills its window in ten steps | Clear old tool results | Summarising every turn |
| Answers get worse as you add sources | Retrieve fewer, better chunks | Retrieving more |

## Common Mistakes

**❌ Putting a timestamp at the top of the system prompt**

> `You are a support agent. The current time is ${new Date().toISOString()}.`

The prefix changes every request, so nothing caches and every call pays full price. If the model needs
the time, put it at the end, after the last cache breakpoint.

**❌ Filling the window because it is available**

Latency, cost and error rate all rise with irrelevant context. The question is never "does it fit" but
"does it earn its space".

**✅ Reserve the output allowance before anything else is packed**

> Subtract the maximum answer you are willing to pay for from the budget first. Everything else competes
> for what is left, and truncated answers stop happening.

## 🔑 Key Takeaways

- Context engineering is an allocation problem: what occupies the window this request, in what order, and what it displaced.
- Reserve the output allowance before packing anything else, or the answer is what gets truncated.
- Caching is a prefix match, so stable content goes first and volatile content last — verify with cache-read tokens.
- Truncation, compaction and clearing tool results are three different mechanisms with three different costs.
- Adding irrelevant context measurably lowers answer quality; a large window is a capacity, not an instruction.

## Interview Questions

**Q: What is context engineering, and how is it different from prompt engineering?**

Prompt engineering is about the wording you control directly. Context engineering is about the assembly
step that runs on every request — which documents were retrieved, how much history survived, what order
everything went in, and how many tokens were left for the answer. In a 2026 feature most of the window is
selected by code rather than written by a person, so the selection logic is where the quality and the
cost actually live.

**Q: Your cost per request doubled with no traffic change and no deploy. Where do you look?**

At the cache-read token count first. A prefix that used to cache and now does not is the usual cause, and
it takes almost nothing to introduce — a timestamp, a request id, a tool list that reordered, a system
prompt that started interpolating a variable. The second place is retrieved context growing quietly as
the corpus grew, because *k* is fixed but chunk size was not.

**Q: A conversation is about to exceed the window. What do you do?**

It depends on what the conversation is. If nothing early is referenced later, drop the oldest turns.
If earlier decisions matter, compact them into a summary and accept that a model chose what to keep. If
it is an agent, clear the old tool results first — that is usually most of the window, costs nothing, and
preserves the structure. Reaching for a bigger model is the expensive way to avoid the decision.

**Q: Does a million-token window mean retrieval quality stops mattering?**

No, it inverts the reason it matters. It stops being about fitting and starts being about attention and
cost: accuracy falls as irrelevant material is added, material in the middle is used less reliably, and
you pay for every token on every request. A bigger window raises the ceiling on what is possible and
raises the price of being careless.

**Q: How do you count tokens reliably before sending a request?**

With the provider's token-counting endpoint, which is exact and free. Character heuristics are off by a
factor of three on JSON, code and non-Latin text, and a client-side tokenizer trained on a different
model is a guess with extra steps. If a request has to fit, measure it rather than estimating it.

## What to Read Next

- [Chapter ?? — How LLMs Behave](#ch-how-llms-behave) — the token and window mechanics this chapter allocates against
- [Chapter ?? — Retrieval](#ch-retrieval) — choosing which documents earn a place in the window
- [Chapter ?? — Cost Engineering](#ch-cost-engineering) — caching, batching and the rest of the token bill
