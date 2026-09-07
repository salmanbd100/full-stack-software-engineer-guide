---
title: Cost Engineering
part: 7
chapter: 0
slug: cost-engineering
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [ai, cost, prompt-caching, batching, routing, tokens, typescript]
in_book: true
---

# Cost Engineering {#ch-cost-engineering}

> Find where the money goes before changing anything, then pull the four levers in the order that costs the least quality.

**In this chapter:** why input dominates · the levers, ranked · prompt caching · routing and cascades · batching and streaming · the unit economics question

## 💡 The Core Idea

An AI feature is the first thing most web teams have shipped whose **marginal cost per user is visible and
significant.** A page view costs a fraction of a penny in compute. A single assistant question can cost
several pence, and a chatty user can cost pounds a day.

That changes the engineering. Cost is a first-class design constraint here, not a hosting-bill footnote,
and it is measurable per request — which means it can be attributed, budgeted and optimised the way
latency is.

The most common mistake is reaching for the biggest lever first. **Downgrading the model is the change
that costs the most quality and is almost never the largest saving available.**

> Measure the token profile before changing the model. The answer is usually in the input, and the input
> is usually fixable without touching quality.

## How It Works

### Input dominates, and it is not obvious

A typical retrieval-backed request:

| Component | Tokens | Share |
| --- | --- | --- |
| System prompt and tool definitions | 1,200 | 15% |
| Retrieved chunks (k=5) | 4,000 | 50% |
| Conversation history | 2,400 | 30% |
| The user's question | 60 | <1% |
| **Output** | 400 | 5% |

Output tokens are priced several times higher than input, but there are ten to twenty times fewer of
them. **Input is usually the majority of the bill**, and input is exactly what your assembly code
controls. Shortening answers is the intuitive move and rarely the effective one.

### The levers, ranked by saving per unit of quality lost

| # | Lever | Typical saving | Quality cost |
| --- | --- | --- | --- |
| 1 | **Prompt caching** on a stable prefix | 40–80% of input cost | None |
| 2 | **Route simple tasks to small models** | 60–90% on those tasks | None, if evaluated |
| 3 | **Retrieve fewer, better chunks** | 20–40% of input | Usually improves quality |
| 4 | **Compact conversation history** | 20–40% on long chats | Small, if done well |
| 5 | **Batch anything not interactive** | ~50% on that traffic | None; latency only |
| 6 | **Cap output tokens** | 5–15% | None if the cap is sensible |
| 7 | **Downgrade the main model** | Large | Real, and everywhere |

Work down that list. Rows one to three are free quality-wise and usually add up to more than row seven.

### Prompt caching

Providers cache a request's prefix and charge a fraction of the normal rate to read it. It is the largest
free saving available and the easiest to lose.

```typescript
// Order is the whole mechanism: stable first, volatile last.
const request = {
  instructions: SYSTEM_PROMPT,     // identical every request — cached
  tools: TOOL_DEFINITIONS,         // identical — cached
  messages: [
    ...history,                    // grows by appending, so the prefix survives
    { role: 'user', content: `${retrievedContext}\n\n${question}` }, // volatile — last
  ],
};
```

Any byte that changes near the front invalidates everything after it. A timestamp in the system prompt, a
request id, a tool list whose order comes from an object literal, a JSON blob serialised with unstable
key order — each silently drops the hit rate to zero, and nothing errors.

**Verify with the numbers, not the arrangement.** Read the cache-read token count the provider returns;
if it is zero across repeated requests, something in the prefix is moving.

### Routing and cascades

Not every request needs the best model — see
[Chapter ?? — Choosing a Model](#ch-choosing-a-model).

| Task | Model | Why |
| --- | --- | --- |
| Intent classification, routing | Small | Fixed output space; also the latency win |
| Schema-constrained extraction | Small to mid | Constrained decoding carries it |
| Answering from retrieved context | Mid | The context holds the facts |
| Open-ended reasoning, long tool chains | Frontier | Where capability genuinely differs |

A **cascade** runs the cheap model, checks the result, and escalates only on failure. It pays when the
cheap model succeeds most of the time and the check is reliable. Measure the escalation rate first: at
50% escalation a cascade costs more than going straight to the frontier model, because the failed cheap
call is not free.

### Batching and streaming

**Batch APIs** typically halve the price in exchange for a delayed result. Anything without a user
waiting — nightly summarisation, backfilling classifications, re-scoring a corpus — belongs there, and it
is a configuration change rather than an engineering project.

**Streaming saves no money at all.** It changes perceived latency, which is worth saying because it is
often listed as an optimisation. What it does save is abandoned generations: a user who can see a wrong
answer forming stops it at token 40 instead of paying for 400.

> ⚠️ **Moving target:** prices, cache TTLs and batch discounts change on a scale of weeks, and reasoning
> tokens are billed while often being invisible in the response. The durable principle is the ranked
> lever list and measuring your own token profile. Never quote a price from a book.

### The unit economics question

At some point someone asks what a user costs. Have the number ready.

```typescript
const costPerRequest =
  (inputTokens - cachedTokens) * inPrice + cachedTokens * cachedPrice + outputTokens * outPrice;
```

Track it as a percentile, not an average. The p99 user in an assistant product can cost fifty times the
median, and a per-user token budget with a graceful limit is the control that protects both the bill and
the service.

## When to Use It

| Symptom | First move |
| --- | --- |
| Cost rose, no deploy | Cache hit rate, then assembled token counts |
| Cost scales worse than traffic | Conversation history growing unbounded |
| A high-volume simple task dominates spend | Route it to a small model |
| A few users cost most of the bill | Per-user budgets and rate limits |
| Nothing is interactive | Batch API |
| All of the above already done | Then consider the model |

## Common Mistakes

**❌ Downgrading the model first**

> The change with the largest quality cost, made before measuring where the tokens went.

**❌ Breaking the cache prefix without noticing**

> One interpolated timestamp near the front and every request pays full price. Nothing fails; the bill
> just rises.

**❌ Optimising output length**

> Output is typically 5% of the tokens. Shortening answers is visible to users and barely visible on the
> invoice.

**✅ Attribute cost per request, per feature and per user**

> Every conversation about AI spend is unanswerable without it, and it is a few fields on a span.

## 🔑 Key Takeaways

- Input tokens usually dominate the bill, and input is what your assembly code controls.
- Prompt caching is the largest free saving and the easiest to lose to one volatile byte near the front.
- Route simple, high-volume tasks to small models before touching the model that answers hard questions.
- Streaming does not reduce cost; it reduces perceived latency and lets users abandon early.
- Track cost per request as a percentile — the p99 user can cost fifty times the median.

## Interview Questions

**Q: An AI feature costs four times the forecast. What do you do first?**

Measure the token profile before changing anything. The usual causes are a broken cache prefix, retrieved
context that grew as the corpus grew, and an unbounded retry or agent loop — all cheaper to fix than a
model downgrade and none of them costs quality. Changing the model first is the instinct and it is the
change with the largest quality cost, made before knowing where the money actually went.

**Q: How does prompt caching work, and how do you break it?**

Providers cache the prefix of a request and charge a reduced rate to read it, so identical leading
content across requests is nearly free. You break it by putting anything volatile near the front — a
timestamp, a request id, a tool list in nondeterministic order, a JSON object serialised with unstable
keys. Nothing errors when it breaks; the hit rate goes to zero and the bill rises. The check is the
cache-read token count the provider returns, not the arrangement looking right.

**Q: Where does most of the cost actually sit?**

In input, for most retrieval-backed features. Output tokens are priced higher per token but there are
ten to twenty times fewer of them, so the retrieved context, the system prompt and the conversation
history typically make up the majority of the bill. That is useful because input is what my assembly code
controls — retrieving five good chunks instead of twenty mediocre ones cuts cost and usually improves the
answer.

**Q: When is a cheap-model cascade a good idea?**

When the cheap model succeeds most of the time and I have a reliable way to check its output — a schema
validation, a confidence signal, a programmatic test. The number to measure first is the escalation rate.
At around half escalating, the cascade costs more than going straight to the strong model, because the
failed cheap call still bills and adds latency. Below about twenty per cent it is a substantial saving.

**Q: Does streaming reduce cost?**

No. It changes when tokens arrive, not how many are generated, so the bill is identical. It gets listed
as an optimisation because it makes the feature feel much faster, which is real and worth doing. The one
genuine saving is indirect: a user watching a wrong answer form can stop it at token 40 rather than
paying for 400, which matters more than it sounds in an assistant with an impatient audience.

## What to Read Next

- [Chapter ?? — Observability](#ch-observability) — the token and cache numbers this acts on
- [Chapter ?? — Context Engineering](#ch-context-engineering) — the assembly order that makes caching work
- [Chapter ?? — Choosing a Model](#ch-choosing-a-model) — the per-task decision routing depends on
