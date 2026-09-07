---
title: Failure States
part: 7
chapter: 0
slug: failure-states
level: advanced
reading_time: 10
updated: 2026-09-07
tags: [ai, ux, failure, refusal, timeout, rate-limit, error-handling]
in_book: true
---

# Failure States {#ch-failure-states}

> Design the refusal, the timeout, the half answer and the rate limit as first-class screens, because in an AI feature they are normal traffic.

**In this chapter:** failure as normal operation · the six states and what each needs · never discard a partial answer · errors that suggest a next step · degradation over dead ends · designing this first

## 💡 The Core Idea

In a conventional feature, an error is an exception — rare enough that a generic message and a retry
button are proportionate. In an AI feature, **failure is a normal operating state.** Refusals happen every
day. Timeouts happen under load. Truncation happens on long answers. Rate limits happen exactly when the
feature is popular.

Treating these as edge cases produces the pattern users complain about most: eight seconds of streaming
text replaced by a red box saying "Something went wrong". The system had most of an answer and threw it
away.

So the unhappy path is not the polish stage of an AI feature. **It is most of the engineering**, and it is
where a frontend-heavy engineer has the most to contribute.

> Every failure should leave the user better off than before they asked. Keep what you have, say what
> happened, and make the next action cheap.

## How It Works

### The six states

| State | Cause | The screen needs |
| --- | --- | --- |
| **Refusal** | Policy, scope, or your guardrail | What was declined, and what *is* possible |
| **Timeout** | Model slow, retrieval slow | Whatever streamed, plus retry |
| **Truncation** | Output allowance exhausted | The partial answer, marked, plus "continue" |
| **Rate limit** | Provider or your own quota | When it will work, and the partial answer |
| **Empty retrieval** | Nothing in the corpus matched | "Not in the docs", and what the corpus does cover |
| **Provider outage** | The dependency is down | Honest unavailability; do not pretend to be thinking |

Two of those are commonly misclassified. Empty retrieval is treated as a model failure when it is an
honest and useful answer. And truncation is often not detected at all — `finishReason: 'length'` arrives
with HTTP 200, so a half sentence renders as a complete answer.

### Never discard a partial answer

```text
❌  [8 seconds of streamed text]  →  cleared  →  "Something went wrong"
✅  [8 seconds of streamed text]  →  kept, marked incomplete  →  "Connection lost — continue?"
```

**The failed request still produced value. Deleting it is a second failure on top of the first.**

The partial answer is often most of what the user needed, they have already read it, and it was paid for.
Keep it, mark it visibly as incomplete, and offer to continue from where it stopped rather than
regenerating from scratch.

### Errors that suggest a next step

| ❌ Message | ✅ Message |
| --- | --- |
| "Something went wrong" | "The model took too long. Here is what it produced — try again?" |
| "Error 429" | "Too many requests right now. This usually clears in about a minute." |
| "I cannot help with that" | "I only cover product documentation. For account questions, try support." |
| "No results" | "Nothing in the docs matches that. The docs cover setup, API and billing." |
| "Invalid response" | "The answer came back in an unexpected format. Retrying usually fixes it." |

The pattern is three parts: **what happened, whether it is worth retrying, and what else to try.** The
same discipline as writing a tool's error message for a model — see
[Chapter ?? — Designing the Tool Surface](#ch-designing-the-tool-surface) — applied to a human reader.

### Degradation beats a dead end

A failed AI feature should fall back to whatever the product did before it existed.

| Instead of | Offer |
| --- | --- |
| AI search failed | The keyword search results |
| Summary unavailable | The full document |
| Assistant is down | The documentation index, or contact support |
| Suggestions unavailable | The plain editor, silently |

That last row is a rule for anything inline. **An assistive feature that fails should fail invisibly.** A
code editor that shows an error box because a suggestion could not be generated has made itself worse
than an editor with no suggestions at all.

### Retry, and how not to be annoying

- **Retry transient failures once, automatically and silently** — a 500 or a timeout with no partial
  content. The user need not know.
- **Never auto-retry a refusal or a content filter.** It is a decision, not an outage, and it will return
  the same answer while costing again.
- **Make manual retry preserve context.** Retrying should not clear the conversation or the question.
- **Bound it.** Three failures in a row is a broken dependency; say so rather than offering a fourth
  button.

> ⚠️ Auto-retrying a streamed request that already produced tokens double-charges and can produce two
> divergent answers stitched together. Continue from the partial state, or start cleanly — not both.

### Design this first

Building the happy path first and adding error handling later produces an interface where failure states
were bolted on, and it shows. The states above are not rare here: refusal and empty retrieval are daily
occurrences in a scoped assistant, and rate limits arrive the week the feature succeeds.

Sketching all six before the first screen also tends to improve the happy path, because it forces the
question of what the feature is actually for when it cannot do the impressive thing.

## When to Use It

| Feature | Priority failure state |
| --- | --- |
| Scoped assistant over docs | Empty retrieval and refusal — the two most common |
| Long generation | Truncation and continue |
| High-traffic consumer feature | Rate limit, with a clear wait time |
| Inline editor suggestions | Silent failure; never interrupt |
| Anything with tools | Tool failure surfaced as "could not check", not as an exception |

## Common Mistakes

**❌ Clearing streamed text on failure**

> Throwing away the only thing the user has, and the only thing you already paid for.

**❌ Rendering a truncated answer as complete**

> `finishReason: 'length'` arrives with HTTP 200. Nothing throws, and a half sentence ships.

**❌ Auto-retrying a refusal**

> It is a decision, not an outage. The same answer comes back and it costs again.

**✅ Say what happened, whether retrying helps, and what else to try**

> Three clauses. It is the difference between a dead end and a next step.

## 🔑 Key Takeaways

- Refusals, timeouts, truncation and rate limits are normal traffic in an AI feature, not exceptions.
- Keep partial output on failure — it is most of an answer, already read and already paid for.
- Detect truncation explicitly; a `length` finish arrives with HTTP 200 and renders as a complete answer.
- Degrade to whatever the product did before the AI feature existed; inline assistance should fail invisibly.
- Retry transient failures once and silently, never a refusal, and never on top of a partial stream.

## Interview Questions

**Q: The request is rate-limited halfway through streaming. What does the user see?**

The text that already arrived, kept and marked incomplete, plus a plain statement of what happened and
roughly when it will work. What they must not see is the pane clearing and a generic error, which throws
away content they have already read and I have already paid for. If continuing from the partial state is
possible, that is the primary action; regenerating from scratch is the fallback.

**Q: Which failure states does an AI feature have that a normal one does not?**

Refusal, truncation and empty retrieval, and all three are normal rather than exceptional. Refusal is a
decision the system made and needs an explanation of scope plus an alternative. Truncation is the sneaky
one, because it comes back as HTTP 200 with a `length` finish reason, so nothing throws and a half
sentence renders as a finished answer. Empty retrieval is usually misfiled as a failure when it is an
honest and useful answer.

**Q: How should an inline suggestion feature fail?**

Silently. If a suggestion cannot be generated, the user should get the plain editor and no interruption
at all. An error box in an assistive surface makes the product worse than not having the feature, because
it costs attention to dismiss and offers nothing. That is different from a primary assistant surface,
where the user explicitly asked and deserves to know what happened.

**Q: When do you retry automatically?**

For transient failures with no partial content — a 500, an overload, a timeout before the first token —
once, silently. Not for refusals or content filters, which are decisions and will return the same result
while charging again. And not on top of a stream that already produced tokens, because that
double-charges and risks stitching two divergent answers together. After a few consecutive failures I
would stop offering a retry and say the dependency is down.

**Q: Why design the failure states first?**

Because in this feature class they are not rare, so designing them last means designing most of the
product last. Refusal and empty retrieval happen daily in a scoped assistant, and rate limits arrive the
week it becomes popular. Sketching them first also sharpens the happy path, since it forces a clear
answer to what the feature is for when it cannot do the impressive thing — and that answer is usually the
fallback the product should have anyway.

## What to Read Next

- [Chapter ?? — Designing for Latency](#ch-designing-for-latency) — the same interface while it is working
- [Chapter ?? — Guardrails and Safety](#ch-guardrails-and-safety) — where refusals come from, in both directions
- [Chapter ?? — Streaming Responses](#ch-streaming-responses) — keeping the partial result when a stream breaks
