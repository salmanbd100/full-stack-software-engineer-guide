---
title: Designing for Latency
part: 7
chapter: 0
slug: designing-for-latency
level: intermediate
reading_time: 10
updated: 2026-09-07
tags: [ai, ux, latency, streaming, perceived-performance, frontend]
in_book: true
---

# Designing for Latency {#ch-designing-for-latency}

> Design for a wait measured in seconds, where the first token matters more than the last and the interface has to earn the delay.

**In this chapter:** the number that matters · what fills the wait · optimistic and speculative work · progress for long tasks · the two-second ceiling that no longer applies

## 💡 The Core Idea

Web performance work assumes the target is milliseconds. An AI feature's honest floor is **hundreds of
milliseconds to first token and several seconds to a complete answer**, and no amount of engineering
removes that — the tokens are generated one at a time.

So the goal changes. You are not making it fast. You are making a slow thing feel responsive, which is a
design problem with a well-understood toolkit: show progress early, show it continuously, and give the
user something to do or read while they wait.

**Time to first token is the metric.** A response that starts at 400 ms and finishes at eight seconds
feels better than one that starts at four seconds and finishes at five — the same total, the opposite
impression.

> Users forgive a slow answer. They do not forgive an interface that shows them nothing.

## How It Works

### The latency budget

| Stage | Typical | Reducible? |
| --- | --- | --- |
| Network to your server | 20–80 ms | Marginally |
| Retrieval | 50–400 ms | Yes — index, *k*, reranking |
| Prompt assembly | 1–20 ms | Rarely worth it |
| **Time to first token** | 200 ms – 2 s | Yes — smaller model, shorter prompt, caching |
| Token generation | 20–150 tokens/s | Only by generating less |

Two of those rows are where the wins are. **Retrieval and reranking sit entirely before the first token**,
so a 400 ms reranker delays every visible byte — that is the honest cost to weigh against its precision
gain. And prompt length affects first-token time, which is one more reason to send five good chunks
rather than twenty.

None of this replaces the ordinary budget. The page still answers to an INP target, and a streaming pane
that re-renders on every token will fail it — see [Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

### What fills the wait

| Duration | Show | Why |
| --- | --- | --- |
| Under 300 ms | Nothing | A flashed spinner is worse than no spinner |
| 300 ms – 1 s | A subtle indicator | Acknowledge the input |
| 1–3 s | Named stage: "searching the docs" | Progress that means something |
| 3–10 s | Streamed content | The answer itself is the progress bar |
| Over 10 s | Step-by-step progress, cancel button | The user needs control |

The third row is the one teams skip. **A stage label is not decoration; it is information.** "Searching
the docs" tells the user the system understood a documentation question, and if that is wrong they can
stop and rephrase instead of waiting eight seconds to find out.

### Streaming is the primary tool

Streaming converts one long wait into an early start plus text arriving faster than a person reads. The
mechanics are in [Chapter ?? — Streaming Responses](#ch-streaming-responses); the interface consequences
are here.

- **Render at token granularity, not sentence granularity.** Buffering to sentence boundaries reintroduces
  a wait you already paid to remove.
- **Keep the layout stable.** Text arriving into a container that reflows on every chunk reads as broken.
  Reserve the space.
- **Never auto-scroll past the user.** If they have scrolled up to read, they are reading. Pin to bottom
  only while they are already at the bottom.
- **Show a cancel control from the first token.** It is the only control the user has over cost and time.

### Doing work before the answer arrives

| Technique | Buys | Costs |
| --- | --- | --- |
| Prefetch retrieval on input focus | 100–300 ms | Some wasted retrievals |
| Warm the connection on keystroke | Handshake latency | Nothing meaningful |
| Optimistic echo of the user's message | Instant acknowledgement | Nothing |
| Speculative call on a likely question | Perceived instant answer | A wasted model call, sometimes |

The first three are close to free. The fourth is the one to be careful with: a speculative model call that
is not used is money spent for nothing, and at scale that arithmetic turns negative quickly.

> ⚠️ Optimistic UI has a different meaning here. You can optimistically show that a request started; you
> cannot optimistically show the answer, because you do not know it. Confusing the two produces an
> interface that guesses on the user's behalf.

### Long-running work

Past ten seconds a chat interface stops being the right shape. Anything running for minutes — an agent
doing real work — needs the vocabulary of a background job: a visible plan, step-by-step progress, a
cancel that actually cancels, and a result that survives the user navigating away.

Showing the plan before executing it is worth more than it appears. It is the point at which a user
notices the system misunderstood, and stopping at step one instead of step twelve is a cost control as
much as a courtesy.

## When to Use It

| Feature | Design |
| --- | --- |
| Chat or assistant | Stream, cancel control, stage labels |
| Inline suggestion in an editor | Small fast model; a slow suggestion is worse than none |
| Search with an AI summary | Show results first, stream the summary above them |
| Form field extraction | Optimistic field-by-field fill as the object streams |
| Multi-minute agent run | Background job UI: plan, progress, cancel, resumable result |

## Common Mistakes

**❌ A spinner for an eight-second wait**

> It communicates nothing and time passes more slowly. Stream, or at minimum name the stage.

**❌ Buffering the stream to sentence boundaries**

> You paid for streaming and then reintroduced the wait.

**❌ Auto-scrolling while the user is reading**

> The most common complaint about streaming interfaces, and it is one condition in the scroll handler.

**✅ Name the stage while the user waits**

> "Searching the docs" is progress *and* a correction opportunity — the user can stop a misunderstood
> request before it costs eight seconds.

## 🔑 Key Takeaways

- Time to first token is the metric users feel; total duration is nearly irrelevant to perceived quality.
- Retrieval and reranking happen before the first token, so their latency is fully visible to the user.
- Stage labels are information, not decoration — they let a user catch a misunderstanding early.
- Stream at token granularity, keep the layout stable, and never auto-scroll past a reading user.
- Past ten seconds, use background-job vocabulary: a visible plan, progress, cancel, and a durable result.

## Interview Questions

**Q: The model takes eight seconds. What does the user see?**

Not a spinner. Ideally streamed text starting at a few hundred milliseconds, so the wait becomes an early
start followed by content arriving faster than they read. Before the first token there is still work
happening — retrieval, assembly — so I would name that stage rather than showing an anonymous loader.
The difference between those two interfaces is larger than any model upgrade would buy, and it is a
frontend change.

**Q: Which latency number do you optimise, and why?**

Time to first token. Total duration barely affects perceived quality once content is streaming, because
the user is reading while the rest generates. It also points at different work: first-token time is
improved by shorter prompts, prompt caching, a smaller model and faster retrieval, whereas total duration
is mostly a function of how many tokens you asked for.

**Q: You add a reranker that improves answer quality and costs 300 ms. Is it worth it?**

It depends where the 300 ms lands, and here it lands entirely before the first visible byte — the user
stares at nothing for an extra third of a second on every request. So it is not a free quality win, and I
would want the retrieval eval to show a real recall@5 improvement to justify it. On a corpus small enough
that the answer is already in the top five, it is pure latency for no gain.

**Q: How is optimistic UI different for AI features?**

You can be optimistic about the request, not about the answer. Echoing the user's message immediately and
showing that generation started is honest and instant. Showing a predicted answer is not, because you do
not have one — and an interface that guesses on the user's behalf is worse than one that admits it is
working. The place optimism genuinely applies is streamed structured output, where fields can fill in as
they arrive.

**Q: What changes for a task that takes four minutes?**

The interface stops being a chat and becomes a background job. That means a visible plan before work
starts, step-level progress, a cancel that actually aborts the upstream request, and a result the user
can navigate away from and come back to. Showing the plan first is the part I would insist on — it is
where a user notices the system misunderstood, and stopping at step one rather than step twelve saves
both time and money.

## What to Read Next

- [Chapter ?? — Streaming Responses](#ch-streaming-responses) — the transport that makes this possible
- [Chapter ?? — Failure States](#ch-failure-states) — what the same interface does when it goes wrong
- [Chapter ?? — Cost Engineering](#ch-cost-engineering) — why a cancel button is a cost control
