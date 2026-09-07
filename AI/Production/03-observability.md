---
title: Observability
part: 7
chapter: 0
slug: observability
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [ai, observability, tracing, logging, metrics, privacy, typescript]
in_book: true
---

# Observability {#ch-observability}

> Record enough of every request to diagnose it a week later, and nothing you would be embarrassed to find in a log.

**In this chapter:** why a stack trace is not enough · the span tree · what to record at each level · the four metrics · what must never be logged · sampling and cost

## 💡 The Core Idea

Debugging an ordinary service means reading a stack trace: the code took a path, the path is in the code,
the trace shows which branch. **An AI feature has no such trace, because the decisions were not made in
your code.** Which chunks were retrieved, which tool the model chose, what the assembled prompt actually
contained — none of it is recoverable from the source.

So observability here is not an operational nicety on top of a working system. It is the only instrument
that makes the system debuggable at all, and it has to be built before the second feature rather than
after the first incident.

> If you cannot reconstruct a request from last Tuesday, you cannot diagnose it. You can only guess and
> redeploy.

## How It Works

### The span tree

```text
request  (4.2 s · £0.019)
├── retrieve        (310 ms · 5 chunks · top score 0.81)
├── assemble        (2 ms  · 6,400 tokens · 1,100 cached)
├── model call      (3.6 s · TTFT 380 ms · in 6,400 out 420 · stop)
└── validate        (1 ms  · schema ok)
```

**One trace per request, one span per stage, cost and tokens attributed at every level.**

The value is in attribution. "The request took four seconds" prompts a guess; "retrieval took 310 ms and
the model took 3.6 s" ends the conversation. The same applies to cost — a span tree makes the expensive
stage obvious, and it is often not the one people expect.

The metric-to-trace-to-log chain, cardinality limits and sampling economics are ordinary practice, taught
in [Chapter ?? — Monitoring and Observability Fundamentals](#ch-monitoring-fundamentals). What is specific
to an AI feature is token and cost attribution per span, and the rule about prompt text below.

### What each span records

| Span | Record |
| --- | --- |
| **Request** | Trace id, user id (pseudonymous), feature, total latency, total cost, outcome |
| **Retrieval** | Query, chunk ids, scores, filters applied, count returned |
| **Assembly** | Token counts by section, cache-read tokens, what was truncated |
| **Model call** | Model and version, time to first token, input and output tokens, finish reason, temperature or effort |
| **Tool call** | Tool name, arguments, result size, duration, error |
| **Output** | Schema validation result, guardrail decisions, refusal flag |

Three of those are load-bearing and routinely missing.

- **Chunk ids** turn "the answer was wrong" into a one-query diagnosis of which half failed.
- **Cache-read tokens** are the only way to notice that a prefix stopped caching, which shows up as a
  cost rise with no deploy attached.
- **Model version** is what lets you correlate a quality drift with a provider-side change, which is
  otherwise unattributable.

```typescript
interface LlmSpan {
  readonly traceId: string;
  readonly model: string;              // include the version, not just the family
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly ttftMs: number;
  readonly finishReason: string;
  readonly promptHash: string;         // which prompt version produced this
  readonly retrievedChunkIds: string[];
}
```

`promptHash` costs nothing and answers the question every incident asks: which version of the prompt was
this. Version prompts as artefacts and record the version on every request.

### The four metrics

| Metric | Watch | Because |
| --- | --- | --- |
| **Time to first token** | p50 and p95 | The number users actually feel |
| **Cost per request** | p50, p95 and total | The only feature class with a visible marginal cost |
| **Cache hit rate** | Trend | A silent drop is the usual cause of a cost spike |
| **Quality proxies** | Refusal rate, schema failure rate, empty retrieval rate | Cheap signals that move before users complain |

The fourth row is the one worth building deliberately. Real quality needs an eval suite, but refusal
rate, schema violation rate and empty-retrieval rate are free, computed from data you already log, and
they move before anyone files a ticket.

### What must never be logged

Prompts and completions contain whatever the user typed, which in a support or internal tool is
frequently personal data, and sometimes credentials.

| ❌ Never | ✅ Instead |
| --- | --- |
| Full prompts and completions, unconditionally | Hashes, token counts, and content behind a short retention and access control |
| API keys, tokens, connection strings | Nothing — redact before the log call |
| Personal data in plain text | Pseudonymous ids; redact known patterns at the boundary |
| Retrieved document contents | Chunk ids; fetch the text when investigating |
| Raw stack traces in a model's context | A sentence describing the failure |

Logging chunk ids instead of chunk text is the change that gives most of the diagnostic value at a
fraction of the privacy exposure and the storage bill.

> ⚠️ Prompt and completion logs are a data-protection surface. They need a retention period, access
> control and a deletion path, and in regulated settings they need a lawful basis. "We log everything for
> debugging" is not a policy that survives an audit.

### Sampling and cost

Full-fidelity logging of every prompt and completion can cost more than the model calls at volume. A
workable default:

- **Metadata on 100% of requests** — tokens, latency, cost, chunk ids, finish reason. Small and cheap.
- **Full content on a sample**, plus 100% of failures, refusals and schema violations. The interesting
  requests are rare, so sampling by outcome beats sampling at random.
- **Short retention on content, long on metadata.** Thirty days of prompts, a year of the numbers.

## When to Use It

| Situation | Build |
| --- | --- |
| Before the first AI feature ships | Trace id, tokens, cost, chunk ids. Minimum viable |
| Cost rose with no deploy | Cache hit rate over time, then assembly token counts |
| Users report worse answers | Model version changes, refusal rate, retrieval score trend |
| Latency complaints | Span breakdown; the model is not always the slow part |
| Building an eval golden set | Sampled real requests — logs are where the set comes from |

## Common Mistakes

**❌ Logging only the final output**

> Every interesting question is about what went into the request, and none of it is recoverable
> afterwards.

**❌ Logging full prompts and completions with no retention policy**

> A personal-data store nobody designed, growing until someone asks about it in an audit.

**❌ Recording the model family but not the version**

> Quality drifts when the provider updates a version, and without the version there is nothing to
> correlate against.

**✅ Log retrieved chunk ids on every request**

> The cheapest, highest-value line in the whole system: it splits a retrieval bug from a generation bug
> in one query.

## 🔑 Key Takeaways

- The decisions in an AI feature happen outside your code, so a trace is the only way to reconstruct them.
- One span per stage with tokens and cost attributed turns "it is slow" or "it is expensive" into a named stage.
- Log chunk ids, cache-read tokens, prompt version and model version — the four fields incidents keep needing.
- Prompt and completion logs are personal data: retention, access control and a deletion path are required.
- Sample content by outcome — keep all failures — and keep cheap metadata on every request.

## Interview Questions

**Q: What do you log for an AI feature that you would not log for a normal endpoint?**

The inputs to the decision, because they are not in the code. Retrieved chunk ids and scores, the token
composition of the assembled request, cache-read tokens, the model and its version, the prompt version,
the finish reason, and the cost. A normal service can be debugged from a stack trace; here the branch was
chosen by a model from a context I assembled at runtime, and none of that is recoverable after the fact
unless I recorded it.

**Q: Cost doubled with no deploy. Where do you look first?**

Cache hit rate. A prefix that used to cache and now does not is the most common cause, and it takes
almost nothing to introduce — an interpolated timestamp, a reordered tool list, a system prompt that
started including a variable. Second place is the assembled token count, because retrieved context grows
quietly as the corpus grows even when *k* has not changed. Both are visible immediately if the spans
carry token composition.

**Q: How do you log prompts without creating a data-protection problem?**

By logging metadata on everything and content on a sample, with the sample weighted towards failures.
Metadata — tokens, latency, cost, chunk ids, finish reason — carries most of the diagnostic value and
almost none of the risk. Content gets a short retention, access control, redaction of known sensitive
patterns at the boundary, and a deletion path. Logging chunk ids rather than chunk text is the single
biggest reduction in exposure for the least loss of usefulness.

**Q: Which metrics would you put on the dashboard?**

Time to first token at p50 and p95, because it is what users feel; cost per request and total, because
this is the first feature class with a visible marginal cost; cache hit rate, because it is the leading
indicator for cost; and cheap quality proxies — refusal rate, schema failure rate, empty retrieval rate.
Those proxies are not quality, but they move before anyone files a ticket and they cost nothing to
compute.

**Q: A user says the answer was wrong last Tuesday. What can you tell them?**

If the tracing is right, exactly what happened: which chunks were retrieved and with what scores, what
the assembled request contained, which model version answered, and whether it truncated or refused. That
turns a complaint into a diagnosis in one query and routes it to retrieval or generation. If all I logged
was the output, I can tell them nothing, and the only available response is to change something and hope.

## What to Read Next

- [Chapter ?? — Error Analysis Loops](#ch-error-analysis-loops) — what to do with the traces
- [Chapter ?? — Cost Engineering](#ch-cost-engineering) — acting on the token numbers this records
- [Chapter ?? — Evals](#ch-evals) — the suite whose cases come from sampled real requests
