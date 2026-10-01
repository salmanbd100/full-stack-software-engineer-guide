---
title: Context Engineering
part: 7
chapter: 4
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
really decides the answer in production. **What is in the window on this request, in what order, and
what did it push out?** The *window* is everything the model reads in one request.

The reframe happened because the job changed. A 2023 feature sent a handwritten prompt. A 2026 feature
builds a request from a system prompt, tool definitions, conversation history, several retrieved
documents and a user message. Code selects most of it at runtime, from far more material than could ever
fit. Nobody writes that by hand. Something decides on every request, and that decider is the component
with the most effect on the system.

> The model does not have a memory problem. Your assembly step has an allocation problem.

## How It Works

### The window is a budget with five claimants

One number covers everything: instructions, tool schemas, history, retrieved context and the answer. The
answer is allocated last, so it is what gets squeezed.
[Chapter ?? — How LLMs Behave and How to Choose One](#ch-how-llms-behave) has the mechanics.

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
asks for an answer gives truncated responses. It does so under exactly the conditions where the answer
matters most: a long conversation and lots of retrieval.

Count with the provider's own token counter. A character heuristic is off by three times on JSON and
code, which is enough to turn a safe assembly into a rejected request.

### Order decides your bill

Caching is a **prefix match**. Providers cache from the start of the request up to a breakpoint. Any byte
that changes anywhere in that prefix invalidates everything after it. So the ordering rule is
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
to zero. Nothing errors. The bill just goes up. Verify by reading the cache-read token count the provider
returns, not by assuming the arrangement worked:

```typescript
const { usage } = await generateText({ model: MODEL, instructions: STABLE, messages });
usage.inputTokenDetails?.cacheReadTokens; // zero across repeats means a silent invalidator
```

### More context is not better

A bigger window does not mean you should fill it, and you can measure why. Model accuracy falls as you
add irrelevant material. The model also uses material in the **middle** of a long context less reliably
than material at either end. Ten well-chosen paragraphs beat a hundred that include them.

So retrieval quality, not window size, is the constraint in a retrieval system. And the right response to
"the answer was wrong" is to look at what was retrieved before touching the prompt.

> ⚠️ A million-token window is a capacity, not an instruction. Filling it costs latency and money on every
> request and usually costs accuracy too.

### What to cut, and the three ways to cut it

Eventually history does not fit. There are three mechanisms and they are not interchangeable.

| Mechanism | What it does | Costs | Use when |
| --- | --- | --- | --- |
| **Truncation** | Drops the oldest turns | Loses facts silently | Chat with no long-range dependencies |
| **Summarisation / compaction** | Replaces old turns with a summary | A model call; detail is lost, chosen by a model | Long conversations that reference earlier decisions |
| **Clearing tool results** | Removes bulky tool outputs, keeps the turns | Nothing, if the result is no longer needed | Agents — tool output dominates their history |

The third is the one teams miss, and the cheapest by far. In an agent loop, most of the window is
usually tool output that was read once and never used again. Clearing it keeps the conversation's shape
and wins back most of the space. It needs no summarisation call, and no model decides what mattered.

> ⚠️ **Moving target:** server-side compaction and context-editing APIs are still provider betas. They
> postdate the AI SDK 7 surface this part is stamped against. Their names, triggers and beta flags change
> from release to release. The lasting principle is the table above: three distinct mechanisms with three
> distinct costs. Check the current API before writing the call.

### Retrieval is context selection

A retrieval system is a context engineering system with a database attached. Chunk size decides how
fine-grained the pieces in the window are. *k*, the number of chunks returned, decides how much of the
budget retrieval takes. Reranking decides which candidates earn the space. All three are budget decisions
before they are search decisions, and Part VII's `RAG/` section is about getting them right.

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

Latency, cost and error rate all rise with irrelevant context. The question is never "does it fit". It
is "does it earn its space".

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
step that runs on every request. Which documents were retrieved? How much history survived? What order
did everything go in, and how many tokens were left for the answer? In a 2026 feature, code selects most
of the window rather than a person writing it. So the selection logic is where quality and cost live.

**Q: Your cost per request doubled with no traffic change and no deploy. Where do you look?**

At the cache-read token count first. The usual cause is a prefix that used to cache and now does not. It
takes almost nothing to introduce: a timestamp, a request id, a reordered tool list, or a system prompt
that started pasting in a variable. The second place is retrieved context growing quietly as the corpus
grew, because *k* is fixed but chunk size was not.

**Q: A conversation is about to exceed the window. What do you do?**

It depends on what the conversation is. If nothing early is referenced later, drop the oldest turns.
If earlier decisions matter, compact them into a summary and accept that a model chose what to keep. If
it is an agent, clear the old tool results first. They are usually most of the window, clearing costs
nothing, and it keeps the structure. Reaching for a bigger model is the expensive way to avoid the decision.

**Q: Does a million-token window mean retrieval quality stops mattering?**

No, it flips the reason it matters. It stops being about fitting and starts being about attention and
cost. Accuracy falls as irrelevant material is added. The middle is used less reliably. And you pay for
every token on every request. A bigger window raises the ceiling on what is possible and
raises the price of being careless.

**Q: How do you count tokens reliably before sending a request?**

With the provider's token-counting endpoint, which is exact and free. Character heuristics are off by a
factor of three on JSON, code and non-Latin text, and a client-side tokenizer trained on a different
model is a guess with extra steps. If a request has to fit, measure it rather than estimating it.

## What to Read Next

- [Chapter ?? — How LLMs Behave and How to Choose One](#ch-how-llms-behave) — the token and window mechanics this chapter allocates against
- [Chapter ?? — Embeddings, Vector Stores and Retrieval](#ch-retrieval) — choosing which documents earn a place in the window
- [Chapter ?? — Observability and Cost Engineering](#ch-observability) — caching, batching and the rest of the token bill
