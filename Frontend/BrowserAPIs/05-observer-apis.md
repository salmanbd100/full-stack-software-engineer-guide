---
title: The Observer APIs
part: 2
chapter: 11
slug: observer-apis
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-23
tags: [intersection-observer, resize-observer, mutation-observer, performance, browser-apis]
in_book: true
---

# The Observer APIs {#ch-observer-apis}

> Replace scroll and resize handlers with four browser APIs that tell you when something happened instead of asking sixty times a second.

**In this chapter:** why polling was always wrong · IntersectionObserver · ResizeObserver · MutationObserver · PerformanceObserver · the cleanup rule

## 💡 The Core Idea

The browser already knows when an element enters the viewport, changes size, or gets a new child. Before
the observers, the only way to find out was to ask — a `scroll` listener that runs on every frame, a
`resize` listener that fires in a storm, a `setInterval` that checks the DOM. All of that runs on the
main thread, and the work you do inside it usually reads geometry, which forces the browser to finish
layout before it can answer.

An observer inverts it. You register interest once, the browser calls you when the thing actually
happens, and it delivers the measurements it had already computed — so nothing you do forces a layout.

> The observers are not a nicer syntax for a scroll handler. They are the difference between reading
> geometry the browser has already calculated and making it calculate geometry again to answer you.

## How It Works

Four observers, one shape. You construct with a callback, call `observe` on targets, and call
`disconnect` when you are finished.

| Observer | Tells you | Replaces |
| -------- | --------- | -------- |
| `IntersectionObserver` | An element entered or left a viewport or ancestor | `scroll` + `getBoundingClientRect()` |
| `ResizeObserver` | An element's own box changed size | `resize` + a per-element measurement |
| `MutationObserver` | The DOM under a node changed | Polling, or patching methods |
| `PerformanceObserver` | A performance entry was recorded | Reading `performance.getEntries()` on a timer |

### IntersectionObserver

The one that matters most in interviews, because lazy loading, infinite scroll, sticky-header state and
impression tracking are all the same problem.

```typescript
// `rootMargin` grows the trigger area: start loading 200px before it is visible.
const observer = new IntersectionObserver(
  (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      loadImage(entry.target as HTMLImageElement);
      observer.unobserve(entry.target); // Once is enough.
    }
  },
  { rootMargin: "200px", threshold: 0 },
);

document.querySelectorAll("img[data-src]").forEach((img: Element) => observer.observe(img));
```

`threshold` is how much of the element must be visible: `0` means one pixel, `1` means all of it, and an
array asks to be called at each crossing. `root` defaults to the viewport and can be any scrolling
ancestor.

### ResizeObserver

Element-level sizing, which `resize` on the window cannot give you — a sidebar can change width because
a panel opened, with no window event at all.

```typescript
const chart: Element = document.querySelector(".chart")!;

const resize = new ResizeObserver((entries: ResizeObserverEntry[]) => {
  for (const entry of entries) {
    // Already measured by the browser — reading this does not force layout.
    const { inlineSize, blockSize } = entry.contentBoxSize[0];
    redraw(chart, inlineSize, blockSize);
  }
});

resize.observe(chart);
```

> ⚠️ **Writing to the DOM inside a `ResizeObserver` callback can loop.** If the callback changes a size
> that the observer is watching, it fires again. The browser detects the cycle and logs
> `ResizeObserver loop completed with undelivered notifications` rather than hanging — treat that message
> as a bug in your callback, not as noise to filter out of the console.

### MutationObserver

For DOM you do not control — a third-party widget, a rich-text editor, content injected by an extension.
Inside your own components, state is the answer and a mutation observer is a sign something has gone
wrong.

### PerformanceObserver

The only correct way to read Core Web Vitals, because the metrics change after the page has loaded. LCP
updates as larger elements appear; CLS accumulates until the page is hidden. A snapshot taken at
`load` measures none of it.

```typescript
// `buffered: true` delivers entries recorded before this observer existed.
new PerformanceObserver((list: PerformanceObserverEntryList) => {
  for (const entry of list.getEntries()) {
    report({ metric: entry.entryType, value: entry.startTime });
  }
}).observe({ type: "largest-contentful-paint", buffered: true });
```

## When to Use It

| Situation | Reach for | Why |
| --------- | --------- | --- |
| Lazy loading, infinite scroll, impressions | `IntersectionObserver` | No scroll handler, no forced layout |
| A component that redraws at its own size | `ResizeObserver` | The window may never change |
| A layout that only needs to *style* itself by size | A container query | No JavaScript at all — see Part II's CSS chapter |
| Reacting to third-party DOM | `MutationObserver` | Nothing else can see those changes |
| Measuring real-user performance | `PerformanceObserver` | The values are not final until later |

**Native alternatives to prefer where they exist:** `loading="lazy"` on images and iframes,
`content-visibility: auto` for off-screen rendering work, and CSS `position: sticky`. Each replaces an
observer entirely, and the platform version is always cheaper than yours.

## Common Mistakes

**❌ Never disconnecting.** An observer holds a reference to its targets and its callback holds whatever
it closes over, so a component that observes and never disconnects leaks its whole scope. Disconnect in
the teardown — `useEffect`'s cleanup, `onDestroy`, `disconnectedCallback`.

```typescript
// The cleanup is the API contract, not an optimisation.
const io = new IntersectionObserver(onIntersect);
io.observe(el);
return () => io.disconnect();
```

**❌ One observer per element.** A single observer instance handles thousands of targets and batches
their entries into one callback. A thousand instances is a thousand callbacks and a thousand allocations.

**❌ Reading geometry inside the callback.** `entry.boundingClientRect` and `entry.contentBoxSize` are
already measured. Calling `getBoundingClientRect()` on the target inside the callback forces a fresh
layout and throws away the entire advantage.

**❌ Assuming the callback fires in order with rendering.** Observer callbacks are delivered as
microtasks or at frame boundaries depending on the observer, so DOM you write in one may not be measured
by another until the next frame. Do not build a synchronous chain out of them.

## 🔑 Key Takeaways

- Observers invert the question: the browser tells you when something happened, instead of you asking on
  every frame.
- Entries arrive with measurements already computed, so reading them does not force layout — calling
  `getBoundingClientRect()` inside the callback does.
- One observer instance handles many targets, and every observer must be disconnected in teardown or it
  leaks.
- `ResizeObserver` watches the element, not the window, which is the case a `resize` listener can never
  cover.
- Prefer the platform where it exists — `loading="lazy"`, `content-visibility`, container queries and
  `position: sticky` each remove the need for an observer.

## Interview Questions

**Q: Why is `IntersectionObserver` faster than a scroll listener that does the same job?**

Two reasons. A scroll handler runs on the main thread for every scroll event, whether or not anything
crossed a boundary, and the usual implementation calls `getBoundingClientRect()`, which forces the
browser to flush layout before it can answer. The observer does the intersection test off the main
thread where the browser can, and delivers geometry it had already computed. The handler competes with
rendering; the observer is told by it.

**Q: When would you use a `ResizeObserver` rather than a container query?**

When something other than CSS needs the number. A container query can restyle a component at a given
width with no JavaScript, and that is the right tool for layout changes. A canvas chart that has to
re-render at the new pixel size, or a virtualised list that needs to recompute how many rows fit, needs
the actual measurement — that is `ResizeObserver`.

**Q: What breaks if you forget to disconnect an observer?**

The observer keeps a reference to every observed element, and the callback keeps a reference to
everything in its closure — typically the component's state and props. So an unmounted component stays
reachable, along with any DOM it was watching, and the leak grows with every mount. It is one of the few
memory leaks that is easy to reproduce: mount and unmount a route a hundred times and watch the detached
node count climb in a heap snapshot.

**Q: Why is `PerformanceObserver` the right way to collect Core Web Vitals?**

Because the values are not final when the page loads. The largest contentful paint can change as bigger
elements arrive, and layout shift accumulates until the page is hidden. Reading
`performance.getEntries()` at `load` captures an early guess. The observer, with `buffered: true`, gets
entries recorded before it existed and keeps receiving updates, which is why the field libraries are all
built on it.

## What to Read Next

- [Chapter ?? — Container Queries and Cascade Layers](#ch-container-queries-and-layers) — the CSS answer, when the reaction is only styling
- [Chapter ?? — Measuring in Production](#ch-measuring-in-production) — what to do with the entries once you have them
- [Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting) — lazy loading as a performance strategy rather than an API
