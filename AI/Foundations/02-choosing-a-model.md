---
title: Choosing a Model
part: 7
chapter: 0
slug: choosing-a-model
level: intermediate
reading_time: 10
updated: 2026-09-07
tags: [ai, llm, model-selection, cost, latency, routing]
in_book: true
---

# Choosing a Model {#ch-choosing-a-model}

> Pick a model per route on evidence, and know what you gave up to get the price down.

**In this chapter:** the three axes · frontier versus small · how to decide with a number · routing and what it costs · when a smaller model wins

## 💡 The Core Idea

Model choice is a **per-route decision, not a per-application one** — the same shape of argument as
choosing a rendering strategy. A search-query classifier, a support-reply drafter and a code-migration
agent have three different right answers, and a codebase that gives them one answer has chosen badly for
at least two.

Three axes trade against each other: **capability**, **latency**, **cost**. You get to optimise two. The
senior skill is not knowing which model is best — that changes every few months — but having a method
that survives the next release.

> Anyone can name the strongest model. The interview question is which route you moved *off* it, and how
> you knew it was safe.

## How It Works

### The three axes

| Axis | What it means in practice | The signal to watch |
| --- | --- | --- |
| **Capability** | Multi-step reasoning, long-horizon tool use, instruction adherence | Your eval pass rate, not a public leaderboard |
| **Latency** | Time to first token for streamed output; total time otherwise | p95, on real prompt sizes, not a one-line test |
| **Cost** | Price per input and output token, which differ by roughly 5× | Cost per *completed task*, not per request |

Two of those refinements do most of the work. Time to **first** token is what a user feels when output
streams, and it is a different number from total generation time — a slower model that starts sooner can
feel faster. And cost per completed task is the only honest denominator: a cheaper model that needs two
retries and a follow-up turn is not cheaper.

### Frontier versus small

The gap between the largest models and the small fast ones is real, uneven, and narrowing with every
release. It is widest on exactly the work that is hard to specify.

| Task shape | Small model | Frontier model |
| --- | --- | --- |
| Classification into known labels | ✅ Usually indistinguishable | Wasteful |
| Extraction against a schema | ✅ Usually fine | Wasteful |
| Summarising a supplied document | ✅ Often fine | Marginal gain |
| Open-ended reasoning over ambiguity | ❌ Visibly worse | ✅ Worth the price |
| Long-horizon tool use, many steps | ❌ Drifts and loops | ✅ Worth the price |
| Writing code against a large codebase | ❌ Plausible and wrong | ✅ Worth the price |

The pattern is that a small model is strong when the task is **closed** — the answer space is bounded and
the input contains everything needed — and weak when the task is **open**. Most production AI features
are a chain with several closed steps and one open one, which is the case for varying the model by step
rather than by application.

> ⚠️ **Moving target:** model names, context limits and prices all change on a scale of months, and the
> current generation at *low* reasoning effort often beats the previous generation at high effort. Any
> specific model named in a book is stale by publication. What does not change: closed tasks are cheap,
> open tasks are not, and the only trustworthy comparison is one you ran on your own inputs.

### Deciding with a number

Model selection without an eval is preference dressed as engineering. The method is small enough to do in
an afternoon:

1. Take **fifty real inputs** from the route in question — real ones, including the awkward ones.
2. Write the grading rule first. Exact match, schema validity, a rubric, or a judge model with its own
   accuracy checked against a human-labelled sample.
3. Run every candidate model over all fifty, recording pass rate, p95 latency and tokens.
4. Take the cheapest model that clears the quality bar. Not the best one — the cheapest that passes.

Step 4 is the discipline. Absent a bar, teams reach for the strongest model everywhere and pay for
capability that the route never exercises.

Keep the model id in one place so that step 3 is a one-line change and step 4 is a deploy:

```typescript
// One constant per route, not one model for the application.
export const MODELS = {
  classifyIntent: "small-fast",       // closed task, hot path
  draftReply: "frontier",             // open task, human reviews it
  migrateCode: "frontier-high-effort" // open task, long horizon
} as const;
```

### Routing, and what it really costs

Routing means classifying the request and sending it to the cheapest model that can handle it. It is
attractive on a spreadsheet and has three costs that spreadsheets omit.

- **The router is a request.** It adds latency to every call and has its own error rate, and a
  misrouted hard question is worse than an expensive right answer.
- **Caches are model-scoped.** A cached prefix on one model is not a cached prefix on another, so a
  cascade forfeits cache reuse across its models — frequently enough to erase the saving.
- **Two models are two eval suites,** two sets of failure modes, and two things to re-verify on every
  provider release.

Measure the simpler thing first: the strongest model at a **lower reasoning effort**, on the same tasks.
One model, one cache namespace, one suite — and often the same saving.

## When to Use It

| If the route… | Choose | Why |
| --- | --- | --- |
| Classifies, extracts, or routes | The smallest model that passes | Closed task; capability is not the constraint |
| Runs on a user-facing hot path | Optimise time to first token | Perceived speed is the product here |
| Reasons over ambiguity | Frontier, higher effort | This is the gap that has not closed |
| Runs in a batch overnight | Cheapest that passes, batched | Latency is free when nobody is waiting |
| Handles regulated or auditable work | Pin an exact version | "Latest" is an uncontrolled dependency |

## Common Mistakes

**❌ Choosing on a public benchmark**

> "It is top of the leaderboard, so we use it."

Benchmarks measure a task distribution that is not yours. Fifty of your own inputs tell you more than any
public score, and take an afternoon.

**❌ Building a cost cascade before measuring lower effort**

Two models mean two cache namespaces, two suites and a router in the request path. The single-model,
lower-effort version is one config change and frequently saves as much.

**✅ Pin the version and re-run the suite on every change**

> A model id that resolves to "whatever is newest" is an unpinned dependency in your critical path.
> Pin it, and treat the upgrade as a change that has to pass the suite — because it is one.

Ship the switch behind a flag as well, so a bad upgrade is a toggle rather than a deploy —
[Chapter ?? — Feature Flags](#ch-feature-flags).

## 🔑 Key Takeaways

- Model choice is per route; one model for a whole application is wrong for most of its routes.
- Capability, latency and cost trade against each other, and cost is only meaningful per completed task.
- Small models match frontier ones on closed tasks and visibly lose on open-ended reasoning and long tool chains.
- Choose the cheapest model that clears a measured bar on fifty of your own inputs, not the strongest available.
- Routing adds a request, splits your cache and doubles your eval surface — measure lower effort on one model first.

## Interview Questions

**Q: How would you decide between a frontier model and a cheaper one for a feature?**

By running both against the same fifty real inputs with the grading rule written before the results are
seen, and comparing pass rate, p95 latency and cost per completed task. Then take the cheapest that
clears the bar rather than the best overall. Without a bar the comparison has no stopping condition and
the strongest model wins by default, which is how teams end up paying frontier prices for classification.

**Q: Where would you not use a small model?**

Anywhere the task is open-ended — reasoning over ambiguous requirements, long chains of tool calls, code
changes across an unfamiliar codebase. Small models fail there in the expensive way: the output is
fluent and plausible rather than obviously broken, so the error surfaces in review or in production
rather than in a try-catch.

**Q: Your AI feature costs four times the forecast. What do you change first?**

Not the model. Measure the token profile first — the usual causes are a system prompt that is not being
cached, retrieved context that grew without anyone noticing, and an unbounded retry loop. All three are
cheaper to fix than a model downgrade and none of them costs quality. Downgrading before measuring
trades quality for a saving you might not have needed.

**Q: A provider ships a new version behind the same model name. What is your process?**

Treat it as a dependency upgrade in the critical path: pin exact versions so it cannot happen silently,
run the eval suite against the new one, compare pass rate and cost, and roll forward deliberately. The
failure mode is quiet — quality shifts a few percent in either direction with no error and no deploy of
yours — which is exactly why the suite has to exist before the upgrade does.

## What to Read Next

- [Chapter ?? — How LLMs Behave](#ch-how-llms-behave) — the token and latency mechanics behind these trade-offs
- [Chapter ?? — Evals](#ch-evals) — how to build the bar that makes this decision evidence
- [Chapter ?? — Cost Engineering](#ch-cost-engineering) — the levers to pull before changing model
