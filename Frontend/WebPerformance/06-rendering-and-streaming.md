---
title: Rendering and Streaming
part: 4
chapter: 0
slug: rendering-and-streaming
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [rendering, inp, debounce, virtualisation, streaming, rsc, performance]
in_book: true
---

# Rendering and Streaming {#ch-rendering-and-streaming}

> Keep the main thread free enough to answer the next click, and use server rendering and streaming as performance levers rather than as architecture.

**In this chapter:** the main thread as the scarce resource · re-render cost and where memoisation pays · debounce against throttle · animating on the right frame · virtualising long lists · streaming and RSC as performance

## 💡 The Core Idea

The browser has **one thread** for running your JavaScript, computing layout, and painting. Everything
in this chapter is about that thread's schedule, and there is one number that matters: **a task longer
than 50 ms can hold up an interaction**, because the browser cannot interrupt it.

That reframes "make the page faster" into something you can act on. It is not about total work; it is
about the *shape* of the work. Ten milliseconds of work sixty times a second is fine. Six hundred
milliseconds in one task is a page that feels broken, even though it is the same total.

So the two moves are: make the work smaller, or break it up. And the newest move — streaming from the
server — is a third option: **do the work somewhere else entirely**, which is where the second half of
this chapter goes.

## How It Works

### Re-render cost, and where memoisation actually pays

A re-render is not inherently expensive; a re-render of a large tree during an interaction is. The
useful question is not "is this component memoised" but "what does a keystroke cost".

| Tool | Caches | Pays when |
| ---- | ------ | --------- |
| `useMemo` | The result of a calculation | The calculation is genuinely expensive |
| `useCallback` | A function identity | A memoised child depends on that identity |
| `memo` | A component's render | The component is expensive **and** often re-renders with equal props |

```tsx
function ReportTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");

  // Worth memoising: 20,000 rows, and this runs on every keystroke otherwise.
  const filtered = useMemo(() => rows.filter((r) => r.name.includes(query)), [rows, query]);

  // Stable identity, so the memoised rows below do not all re-render.
  const onSelect = useCallback((id: string) => select(id), []);

  return <ul>{filtered.map((r) => <MemoRow key={r.id} row={r} onSelect={onSelect} />)}</ul>;
}
```

> ⚠️ **Moving target:** the React Compiler memoises components and values at build time, which removes
> most hand-written `useMemo` and `useCallback`. The durable principle is that memoisation is a
> main-thread optimisation and a comparison has its own cost — so it is something you apply where a
> profile shows a hotspot, not everywhere. [Chapter ?? — Performance and the React Compiler](#ch-react-performance-and-the-compiler)
> owns the current state of that tooling.

Memoising a cheap component makes it slower: you have added a props comparison to something that
rendered in a microsecond.

### Debounce and throttle answer different questions

```text
Events:    X X X X X X X X X
Debounce:                    X    ← once, after the pause
Throttle:  X      X      X        ← at most once per interval
```

| Pattern | Semantics | Use for |
| ------- | --------- | ------- |
| **Debounce** | Only the last event matters | A search field: nobody wants results for `rea` |
| **Throttle** | A steady sample matters | A scroll position readout, an analytics ping |

```typescript
function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A): void => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
```

Choosing wrongly produces a specific bug each way. Throttling a search field fires requests for
partial words. Debouncing a scroll handler means the thing you are positioning never updates while the
user is still scrolling.

### Animate on the browser's frame, not on your own timer

`setTimeout` drifts and can land mid-frame, so the browser paints a torn state;
`requestAnimationFrame` runs immediately before the next paint. The stronger version of this advice is
to animate **only `transform` and `opacity`**, because those are composited on their own layer and
need neither layout nor paint. Animating `width`, `top` or
`margin` forces layout on every frame, which is the difference between a smooth animation and a
janky one — and no amount of `requestAnimationFrame` fixes it.

### Virtualise, do not optimise, a long list

Ten thousand rows is ten thousand DOM nodes, and no memoisation makes that acceptable. Render only
what is visible and fake the rest with a spacer, so the DOM stays small and scrolling stays smooth.
Use a library, because the scroll arithmetic, variable row heights and resize handling are all
edge-case-heavy. The threshold is roughly **100 rows, or fewer if each row is heavy** — and be aware of
what it costs: browser find-in-page stops working, `Ctrl+A` selects only the rendered window, and
anchor links into the list need special handling. For a list of a few hundred simple rows,
[Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting)'s `content-visibility`
approach is cheaper and keeps all of that working.

### Streaming and server rendering are performance levers

The largest available win on main-thread work is often not to optimise it but to **move it off the
client**. Three levers, in increasing order of how much they change:

| Lever | Effect on the client | Cost |
| ----- | -------------------- | ---- |
| **Server rendering** | HTML arrives painted; JavaScript still ships for interactivity | Hydration is main-thread work, proportional to the tree |
| **Streaming** | First bytes paint before slow data resolves | Response order becomes something you design |
| **Server Components** | Component code never reaches the browser at all | A server boundary you have to reason about |

The performance framing that matters in an interview:

- **Streaming improves perceived load without reducing total work.** The server sends the shell, then
  flushes each slow section as its data resolves, so the user sees something at the speed of your
  fastest query rather than your slowest. Time to first byte and LCP improve; total server time does
  not change.
- **Server Components reduce the bytes and the main-thread work together.** A component that renders on
  the server ships no JavaScript for itself, so it costs nothing to parse and nothing to hydrate. That
  is the only lever here that improves INP structurally rather than incrementally.
- **Hydration is the hidden cost of server rendering alone.** Painted HTML that is not yet interactive
  is a page that looks ready and ignores clicks — which shows up as poor INP on exactly the
  interactions users try first.

The mechanisms belong to Part III:
[Chapter ?? — The Rendering Spectrum](#ch-rendering-spectrum) for choosing between them and
[Chapter ?? — Hydration and Its Costs](#ch-hydration-and-its-costs) for what hydration actually does.
What belongs here is the reason to reach for them: they are the only tools that reduce client work
rather than reschedule it.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| A keystroke re-renders a 20,000-row table | Memoise the filter, then virtualise | Both, in that order — the second is the real fix |
| A search field firing a request per character | Debounce, 250–300 ms | Only the final query matters |
| A scroll-linked position indicator | Throttle, or `requestAnimationFrame` | A steady sample is what you want |
| A janky animation | Move it to `transform` and `opacity` | Layout per frame is the cause |
| A list over ~100 heavy rows | Virtualise | No re-render optimisation survives that many nodes |
| A long page of static sections | `content-visibility: auto` | Cheaper than virtualisation, and find-in-page still works |
| Content that does not need client interactivity | Server Components | The only lever that removes the JavaScript entirely |
| A page blocked on one slow query | Stream it | The user sees the shell at the speed of the fast queries |

## Common Mistakes

❌ **Memoising everything.** A props comparison on a cheap component costs more than the render.
✅ Profile first; memoise the hotspot the profile names.

❌ **Throttling a search input.** It fires requests for partial words.
✅ Debounce for "only the last one matters"; throttle for "sample steadily".

❌ **Animating `width`, `top` or `margin`.** Layout runs every frame.
✅ `transform` and `opacity`, which composite without layout or paint.

❌ **Virtualising a 30-row list.** You have added scroll arithmetic and broken find-in-page for nothing.
✅ Virtualise past ~100 rows, or when rows are individually heavy.

❌ **Treating server rendering as an INP fix on its own.** Hydration is main-thread work, so a
server-rendered page can still be unresponsive.
✅ Reduce what hydrates — Server Components — rather than only where the first render happened.

## 🔑 Key Takeaways

- The main thread is the scarce resource, and a task over 50 ms can block the next interaction.
- Memoisation is a targeted fix for a profiled hotspot; applied everywhere it is a net cost.
- Debounce when only the last event matters, throttle when a steady sample matters — swapping them produces distinct bugs.
- Animate `transform` and `opacity` only; anything else forces layout on every frame.
- Streaming improves perceived load, while Server Components are the only lever that removes client work outright.

## Interview Questions

**Q: A dashboard has a poor INP. Where do you start?**

With a profile, looking for tasks over 50 ms during interaction rather than for missing memoisation.
Usually it is one of three things: a large synchronous re-render on every keystroke, a list with
thousands of DOM nodes, or a handler doing real work on a high-frequency event. The fixes are
different — narrow the re-render, virtualise the list, debounce the handler — so identifying which one
is the whole job.

**Q: Debounce or throttle for a scroll-linked progress bar?**

Throttle, or better, `requestAnimationFrame`. The bar needs a steady stream of updates while
scrolling, and debouncing would leave it frozen until the user stopped — which is exactly the
behaviour you do not want. Debounce is for cases where intermediate values are worthless, like a
search field.

**Q: Does server-side rendering fix responsiveness?**

Not on its own. It improves how quickly something is painted, but the JavaScript still ships and
hydration is main-thread work proportional to the tree — so you get a page that looks ready and
ignores the first few clicks, which is poor INP. The structural fix is reducing what hydrates at all,
which is what Server Components do: their code never reaches the browser, so it costs nothing to parse
or hydrate.

**Q: When would you not virtualise a long list?**

Below roughly a hundred simple rows, where the scroll arithmetic is more risk than the DOM nodes cost.
And when the trade-offs matter more than the frames: virtualisation breaks browser find-in-page,
select-all, and deep links into the list. For a long page of static sections, `content-visibility:
auto` gets much of the rendering benefit while keeping all of that working.

## What to Read Next

- [Chapter ?? — The Rendering Spectrum](#ch-rendering-spectrum) — choosing between client, server, static and streaming
- [Chapter ?? — Hydration and Its Costs](#ch-hydration-and-its-costs) — the main-thread cost that server rendering does not remove
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — INP, which is the metric everything here moves
