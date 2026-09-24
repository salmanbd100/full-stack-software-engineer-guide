---
title: Trust, Correctness and Failure States
part: 7
chapter: 25
slug: trust-and-correctness-ux
level: advanced
reading_time: 13
updated: 2026-09-24
tags: [ai, ux, citations, trust, undo, confidence, review, failure, refusal, timeout, rate-limit, error-handling]
in_book: true
---

# Trust, Correctness and Failure States {#ch-trust-and-correctness-ux}

> Design an interface for a system that is usually right, sometimes wrong, equally confident either way, and fails as normal traffic.

**In this chapter:** calibrated trust and citations that verify · why confidence scores mislead · edit-before-accept and undo · the six failure states · keeping partial answers and degrading gracefully

## 💡 The Core Idea

The instinct is to make an AI feature feel trustworthy. That is the wrong target. **The goal is
calibrated trust: the user believes it about as often as it is right.** Over-trust means wrong answers
ship unchecked. Under-trust means nobody uses the feature. Over-trust is the expensive one.

A model's confidence tells you nothing about its correctness. The prose is fluent whether the fact was
retrieved or invented, and users read fluency as competence. So the interface must supply what the text
cannot: **where this came from, and how easily the user can check it.**

The same honesty applies when things go wrong. In an AI feature, **failure is a normal operating
state**: refusals happen daily, and rate limits arrive the week the feature succeeds.

> Do not ask the user to trust the answer. Give them a two-second way to check it — and when it fails,
> keep what you have, say what happened, and make the next action cheap.

## How It Works

### Citations that can be checked

A citation is only worth something if it can be checked, and has been.

| ❌ Weak | ✅ Strong |
| --- | --- |
| "According to the documentation…" | An inline link to the exact retrieved passage |
| A source list at the end | A citation attached to the specific claim |
| A citation the model composed | A citation resolved from a retrieved chunk id |

The last row is a correctness control, not a nicety. In the documentation assistant, the model emits a
chunk id and the server resolves it. A made-up citation then cannot render, because that id was never
retrieved. The check costs nothing and catches the most damaging failure a grounded assistant has.

Placement matters too. A citation next to its sentence gets checked. A source list at the bottom gets
ignored, yet it still raises trust. That is the appearance of rigour with none of the substance.

### Confidence scores usually mislead

"87% confident" reads as a measurement. It is only one if it is calibrated: across many answers, the ones
marked 87% are right about 87% of the time. Models are poor at reporting their own reliability.

| Instead of a score | Show |
| --- | --- |
| "87% confident" | The sources it used, or a note that it found none |
| "Low confidence" | "I could not find this in the documentation" |

**Grounding is the honest proxy.** "This came from three retrieved passages" and "this came from the
model's own knowledge" are two states your code can determine. Both tell the user something true.

### Edit before accept, and undo

Any output that writes somewhere should pass through the user before it lands.

**The flow, where the explicit accept is the step that must not be skipped:**

```text
Generate  →  Show as an editable draft  →  User edits  →  Explicit accept  →  Apply
```

Auto-applying is where AI features lose users for good. One silent wrong edit costs more trust than
twenty good suggestions build. Now the user must check everything, which is more work than doing it alone.

| Consequence of a wrong output | Pattern |
| --- | --- |
| Trivial and visible | Apply, with undo |
| Costly or hard to notice | Draft, review, explicit accept |
| Irreversible | Explicit confirmation naming what will happen |
| Affects other people | Review, always |

Undo does more for adoption than accuracy does, because it changes what a mistake costs. Show it when
applying, undo the whole operation, and keep the previous version.

### Honesty without disclaimer theatre

"AI can make mistakes" under every message shifts responsibility to the user without helping them. It
is read once and never again. A citation next to the claim, visible marking on generated content, and a
plain "not found in the docs" when true all do more.

> ⚠️ Hedging every sentence ("it appears that", "you may wish to") destroys the signal. If everything is
> hedged, the truly uncertain answer looks exactly like the confident one.

### The six failure states

| State | Cause | The screen needs |
| --- | --- | --- |
| **Refusal** | Policy, scope, or your guardrail | What was declined, and what *is* possible |
| **Timeout** | Model or retrieval slow | Whatever streamed, plus retry |
| **Truncation** | Output allowance used up | The partial answer, marked, plus "continue" |
| **Rate limit** | Provider or your own quota | When it will work, and the partial answer |
| **Empty retrieval** | Nothing in the corpus matched | "Not in the docs", and what the docs do cover |
| **Provider outage** | The dependency is down | Honest unavailability; do not pretend to think |

Two are often misclassified. Empty retrieval is treated as a failure when it is an honest, useful
answer. Truncation often goes undetected: `finishReason: 'length'` arrives with HTTP 200, so a half
sentence renders as a complete answer.

### Never discard a partial answer

**What the user sees when a stream breaks:**

```text
❌  [8 seconds of streamed text]  →  cleared  →  "Something went wrong"
✅  [8 seconds of streamed text]  →  kept, marked incomplete  →  "Connection lost — continue?"
```

The partial answer is often most of what the user needed, already read and already paid for. Keep it,
mark it incomplete, and offer to continue from where it stopped.

### Errors that suggest a next step

| ❌ Message | ✅ Message |
| --- | --- |
| "Something went wrong" | "The model took too long. Here is what it produced — try again?" |
| "Error 429" | "Too many requests right now. This usually clears in about a minute." |
| "I cannot help with that" | "I only cover product documentation. For account questions, try support." |

A good message has three parts: **what happened, whether a retry is worth it, and what else to try.** It is
the same discipline as a tool's error message for a model — see
[Chapter ?? — Tool Calling and the Tool Surface](#ch-tool-calling) — written for a human.

A failed feature should also fall back to what the product did before it existed. Failed AI search shows
keyword results. A missing summary shows the full document. **An inline assistive feature should fail
invisibly** — an editor that shows an error box for a missing suggestion is worse than no suggestions.

### Retry without being annoying

Retry a transient failure with no partial content — a 500, or a timeout before the first token — once,
silently. Never auto-retry a refusal or a content filter: it is a decision, not an outage, and it costs
again. A manual retry must keep the question. After three failures in a row, say the dependency is down.

> ⚠️ Auto-retrying a streamed request that already produced tokens double-charges and can stitch two
> different answers together. Continue from the partial state, or start cleanly — not both.

## When to Use It

| Feature | Trust design | Priority failure state |
| --- | --- | --- |
| Grounded answer from your docs | Inline citations resolved from chunk ids | Empty retrieval and refusal |
| A generated draft | Edit-before-accept, always | Timeout, keeping the draft |
| Extracted form fields | Fill, mark as generated, keep undo | Silent fallback to manual entry |
| Long summary | Link each point to its source | Truncation and continue |
| Inline editor suggestions | Visible marking | Silent failure; never interrupt |
| High-traffic consumer feature | Plain answers, no blanket disclaimer | Rate limit, with a clear wait time |

Design the failure states before the first screen. They are not rare here, so designing them last
means designing most of the product last.

## Common Mistakes

**❌ Showing a confidence percentage**

> It reads as a measurement and is not calibrated. Show grounding instead.

**❌ Auto-applying generated changes**

> One silent wrong edit costs more trust than twenty good suggestions build.

**❌ Clearing streamed text on failure, or rendering a truncated answer as complete**

> The first throws away what the user already read and you already paid for. The second ships a half
> sentence, because a `length` finish arrives with HTTP 200 and nothing throws.

**✅ Resolve citations from retrieved chunk ids, and say what happened when it fails**

> A made-up citation cannot render, and a message with a next step turns a dead end into an action.

## 🔑 Key Takeaways

- The goal is calibrated trust, not maximum trust, and over-trust is the expensive failure.
- Citations attached to the claim and resolved from chunk ids get checked, while confidence scores only look like measurements.
- Anything that writes should be a draft with an explicit accept, and undo does more for adoption than accuracy does.
- Refusals, timeouts, truncation and rate limits are normal traffic, so keep partial output and detect a `length` finish explicitly.
- Retry transient failures once and silently, never a refusal, and never on top of a partial stream.

## Interview Questions

**Q: How do you show the user the answer might be wrong?**

By making it cheap to check, not by telling them. Citations sit next to the claim and link to the exact
retrieved passage. Grounding is stated honestly, and "I could not find that" replaces a fluent answer from
general knowledge. A disclaimer under every message shifts responsibility without giving anyone a way to act.

**Q: Why not show a confidence score?**

Because it looks like a measurement and is not one. Unless answers marked 80% are right about 80% of the
time, verified over many cases, it is just a value the model produced. Worse, a precise-looking number
raises trust more than a vague one, so it pushes users towards over-trust.

**Q: When would you auto-apply a generated change?**

Only when a wrong result is trivial, immediately visible, and undo is right there. Anything costly, hard to
notice, irreversible, or affecting other people goes through a draft with an explicit accept. One silent
wrong edit makes the user check every output, and that loss is permanent.

**Q: The request is rate-limited halfway through streaming. What does the user see?**

The text that already arrived, kept and marked incomplete, plus a plain note of what happened and roughly
when it will work. The pane must not clear to a generic error, which throws away content already read and
already paid for. Continuing from the partial state is the primary action; regenerating is the fallback.

**Q: When do you retry automatically?**

For transient failures with no partial content — a 500, an overload, a timeout before the first token —
once, silently. Not for refusals or content filters, which return the same result and charge again. Not on
top of a stream that already produced tokens, because that double-charges and can stitch two answers together.

**Q: Why design the failure states first?**

Because in this feature class they are not rare, so designing them last means designing most of the
product last. Refusal and empty retrieval happen daily in a scoped assistant. Sketching them first also
forces a clear answer to what the feature does when it cannot do the impressive thing.

## What to Read Next

- [Chapter ?? — Latency and Generative UI](#ch-generative-ui) — the same interface while it is working, and the citation block that carries an id
- [Chapter ?? — Guardrails and Safety](#ch-guardrails-and-safety) — where refusals come from, and verifying citations in code
- [Chapter ?? — Streaming Responses](#ch-streaming-responses) — keeping the partial result when a stream breaks
