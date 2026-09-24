---
title: Observability and Cost Engineering
part: 7
chapter: 20
slug: observability
level: advanced
reading_time: 13
updated: 2026-09-24
tags: [ai, observability, tracing, logging, metrics, privacy, cost, prompt-caching, batching, routing, tokens, typescript]
in_book: true
---

# Observability and Cost Engineering {#ch-observability}

> Record enough of every request to diagnose it a week later, then use the same trace to find where the money goes and cut it without losing quality.

**In this chapter:** the span tree and what each span records · the four metrics · what must never be logged · where the tokens go · the cost levers, ranked

## 💡 The Core Idea

Debugging an ordinary service means reading a stack trace. The code took a path, and the trace shows
which branch. **An AI feature has no such trace, because the decisions were not made in your code.**
Which chunks were retrieved, which tool the model chose, what the prompt held — none of it is in the
source.

So a trace is the only way to rebuild a request after the fact. It is also where cost is measured. An AI
feature is the first thing most web teams ship with a **visible marginal cost per user**. A page view
costs a fraction of a penny. One question to the documentation assistant can cost several pence, and a
chatty user can cost pounds a day.

Tokens per request, cache hit rate and cost per user all live on the same spans. Build the trace first,
and the cost work becomes reading numbers you already have.

## How It Works

**One documentation-assistant request, as a trace**

```text
request  (4.2 s · £0.019)
├── retrieve        (310 ms · 5 chunks · top score 0.81)
├── assemble        (2 ms  · 6,400 tokens · 1,100 cached)
├── model call      (3.6 s · TTFT 380 ms · in 6,400 out 420 · stop)
└── validate        (1 ms  · schema ok)
```

One trace per request, one span per stage, with tokens and cost at every level. "The request took four
seconds" prompts a guess. "Retrieval took 310 ms and the model took 3.6 s" ends the conversation. Cost
works the same way: the span tree names the expensive stage, and it is often not the one people expect. Cardinality and sampling are ordinary practice, taught in
[Chapter ?? — Monitoring and Observability Fundamentals](#ch-monitoring-fundamentals).

### What each span records

| Span | Record |
| --- | --- |
| **Request** | Trace id, pseudonymous user id, feature, total latency, total cost, outcome |
| **Retrieval** | Query, chunk ids, scores, filters, count returned |
| **Assembly** | Token counts by section, cache-read tokens, what was truncated |
| **Model call** | Model and version, time to first token, input and output tokens, finish reason |
| **Output** | Schema validation result, guardrail decisions, refusal flag |

Three fields matter most and are often missing. **Chunk ids** split a retrieval bug from a generation bug
in one query. **Cache-read tokens** are the only way to see that a prefix stopped caching. **Model
version** lets you link a quality drift to a provider-side change.

**The model-call span as a type**

```typescript
interface LlmSpan {
  readonly traceId: string;
  readonly userId: string;             // pseudonymous — cost per user is a group-by on this
  readonly model: string;              // include the version, not just the family
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly ttftMs: number;
  readonly finishReason: string;
  readonly promptHash: string;         // which prompt version — the first question in every incident
  readonly retrievedChunkIds: string[];
}
```

### The four metrics

| Metric | Watch | Because |
| --- | --- | --- |
| **Time to first token** | p50 and p95 | The number users actually feel |
| **Cost per request** | p50, p95, p99 and total | The only feature class with a visible marginal cost |
| **Cache hit rate** | Trend | A silent drop is the usual cause of a cost spike |
| **Quality proxies** | Refusal, schema failure and empty-retrieval rates | Cheap signals that move before users complain |

### What must never be logged

Prompts and completions hold whatever the user typed, which is often personal data and sometimes a
credential. Redact keys and known personal-data patterns before the log call. Log chunk ids, not chunk
text — it keeps most of the diagnostic value at a fraction of the exposure and the storage bill.

At volume, full logging can cost more than the model calls. Keep **metadata on every request** and
**full content on a sample**, plus every failure and refusal. Keep content thirty days, numbers a year.

> ⚠️ Prompt and completion logs are a data-protection surface. They need a retention period, access
> control and a deletion path, and in regulated settings a lawful basis.

### Where the tokens go

A typical documentation-assistant request, read off the assembly span:

| Component | Tokens | Share |
| --- | --- | --- |
| System prompt and tool definitions | 1,200 | 15% |
| Retrieved chunks (k=5) | 4,000 | 50% |
| Conversation history | 2,400 | 30% |
| The user's question | 60 | <1% |
| **Output** | 400 | 5% |

Output tokens cost several times more than input, but there are ten to twenty times fewer of them.
**Input is usually most of the bill**, and input is exactly what your assembly code controls. Shortening
answers is the obvious move and rarely the effective one.

### The levers, ranked by saving per unit of quality lost

| # | Lever | Typical saving | Quality cost |
| --- | --- | --- | --- |
| 1 | **Prompt caching** on a stable prefix | 40–80% of input cost | None |
| 2 | **Route simple tasks to small models** | 60–90% on those tasks | None, if evaluated |
| 3 | **Retrieve fewer, better chunks** | 20–40% of input | Usually improves quality |
| 4 | **Batch anything not interactive** | ~50% on that traffic | None; latency only |
| 5 | **Downgrade the main model** | Large | Real, and everywhere |

Work down the list. Rows one to three cost no quality and usually save more than row five.

**Prompt caching.** Providers cache a request's prefix and charge a fraction of the normal rate to read
it. Order is the whole mechanism: stable first, volatile last.

**Assembly order that keeps the prefix cacheable**

```typescript
declare const SYSTEM_PROMPT: string, retrievedContext: string, question: string;
declare const TOOL_DEFINITIONS: unknown[], history: { role: 'user' | 'assistant'; content: string }[];

const request = {
  instructions: SYSTEM_PROMPT,     // identical every request — cached
  tools: TOOL_DEFINITIONS,         // identical — cached
  messages: [
    ...history,                    // grows by appending, so the prefix survives
    { role: 'user', content: `${retrievedContext}\n\n${question}` }, // volatile — last
  ],
};
```

Any byte that changes near the front invalidates everything after it. A timestamp in the system prompt,
a request id, or a tool list in unstable order drops the hit rate to zero, and nothing errors. **Check
the cache-read token count on the span, not the arrangement.**

**Routing and cascades.** Intent classification and schema-bound extraction run well on small models.
Save the frontier model for open-ended reasoning and long tool chains. A **cascade** runs the cheap
model, checks the result, and escalates on failure. Measure the escalation rate first: at 50% a cascade
costs more than the frontier model alone, because the failed cheap call still bills.

**Batching and streaming.** Batch APIs usually halve the price for a delayed result, so nightly
backfills belong there. **Streaming saves no money**, except when a user stops a wrong answer early.

> ⚠️ **Moving target:** prices, cache lifetimes and batch discounts change within weeks, and reasoning
> tokens are billed while often hidden from the response. The durable part is the ranked list and your
> own token profile. Never quote a price from a book.

**Cost computed from the span, not the invoice**

```typescript
interface Price { input: number; cachedInput: number; output: number }  // per token

function costOf(span: LlmSpan, price: Price): number {
  const uncached = span.inputTokens - span.cachedInputTokens;
  return uncached * price.input + span.cachedInputTokens * price.cachedInput + span.outputTokens * price.output;
}
```

Sum it by `userId` and track it as a percentile, not an average. The p99 user can cost fifty times the
median. A per-user token budget with a graceful limit protects both the bill and the service.

## When to Use It

| Situation | First move |
| --- | --- |
| Before the first AI feature ships | Trace id, tokens, cost, chunk ids — the minimum |
| Cost rose with no deploy | Cache hit rate over time, then assembly token counts |
| A few users cost most of the bill | Per-user budgets and rate limits |
| Users report worse answers | Model version changes, refusal rate, retrieval score trend |

## Common Mistakes

**❌ Downgrading the model first**

> The change with the largest quality cost, made before measuring where the tokens went.

**❌ Breaking the cache prefix without noticing**

> One interpolated timestamp near the front and every request pays full price. Nothing fails; the bill
> just rises.

**✅ Log chunk ids, model version and cached tokens on every request**

> A few fields on a span split retrieval bugs from generation bugs and make every cost question
> answerable.

## 🔑 Key Takeaways

- The decisions in an AI feature happen outside your code, so a trace is the only way to rebuild them.
- Tokens, cache hits and cost belong on each span, which makes cost per request and per user a query.
- Prompt and completion logs are personal data and need retention, access control and a deletion path.
- Input tokens usually dominate the bill, and prompt caching is the largest saving that costs no quality.
- Measure the token profile before downgrading the model; the fix is usually in the input.

## Interview Questions

**Q: What do you log for an AI feature that you would not log for a normal endpoint?**

The inputs to the decision, because they are not in the code. Retrieved chunk ids and scores, the token
make-up of the request, cache-read tokens, the model version, the prompt version, the finish reason and
the cost. A model chose the branch from a context built at runtime, so none of it can be recovered unless
it was recorded.

**Q: Cost doubled with no deploy. Where do you look first?**

Cache hit rate. A prefix that stopped caching is the most common cause, and an interpolated timestamp or a
reordered tool list is enough. Next is the assembled token count, because retrieved context grows as the
corpus grows. I would not touch the model until both are ruled out, because a downgrade costs quality
everywhere.

**Q: When is a cheap-model cascade a good idea?**

When the cheap model usually succeeds and a reliable check exists, such as schema validation. Measure the
escalation rate first. At about half escalating, the cascade costs more than the strong model alone,
because the failed call still bills. Below about twenty per cent it is a large saving.

## What to Read Next

- [Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals) — what to do with sampled traces
- [Chapter ?? — Context Engineering](#ch-context-engineering) — the assembly order that makes caching work
- [Chapter ?? — How LLMs Behave and How to Choose One](#ch-how-llms-behave) — the per-task choice routing depends on
