---
title: Loading and Code Splitting
part: 4
chapter: 0
slug: loading-and-code-splitting
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-09
tags: [code-splitting, lazy-loading, prefetch, intersection-observer, performance]
in_book: true
---

# Loading and Code Splitting {#ch-loading-and-code-splitting}

> Ship less on the first request, fetch the rest before the user notices, and know which things must never be deferred.

**In this chapter:** deferral as the only real lever · route and component splitting · vendor chunks and cache lifetime · prefetch against preload · preloading on intent · what never to defer

## 💡 The Core Idea

There are only two ways to make a page load faster: **send fewer bytes, or send them later.** Nearly
everything in this chapter is the second one, and the reason it works is that most of what an
application ships is never used in a given session.

The important corollary is that deferral moves cost, it does not remove it. A route split into its own
chunk is not free — it is a request that happens when the user navigates instead of at boot. So the
skill is not "split more". It is knowing which cost the user will feel and which they will not, and
then arranging for the deferred thing to arrive **before** the moment it is needed.

That is the whole game: defer aggressively, then speculatively load on the first signal of intent.

## How It Works

### Images: one attribute, and one thing you must not do

```html
<!-- Below the fold. The browser defers it until the user is close. -->
<img src="chart.png" alt="Emissions by quarter" loading="lazy" width="800" height="600" />

<!-- The LCP image. Eager, prioritised, never lazy. -->
<img src="hero.avif" alt="Dashboard" loading="eager" fetchpriority="high" width="1200" height="600" />
```

> ⚠️ **Never lazy-load the LCP image.** `loading="lazy"` on a hero image defers the exact resource the
> metric is waiting for, and it is the single most common self-inflicted performance regression. The
> rule is simple: everything below the fold lazy, the hero eager and high priority.

Note the `width` and `height` on both. Deferring an image without reserving its box trades a load
problem for a layout-shift problem — see [Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

### Routes are the natural split point

Most users visit a handful of routes. Splitting per route is the highest-value split available and
costs almost nothing to set up.

```tsx
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));

function App() {
  return (
    // One boundary at the route level: the fallback is a page skeleton, not a spinner per widget.
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

A framework with file-based routing does this for you. What it cannot decide for you is the
**component-level** split: a heavy chart library, a rich text editor, a map. Those are worth splitting
when they are large and conditional — behind a tab, a modal, or a permission.

```tsx
// A browser-only charting library, 300 kB, on a tab most users never open.
const Chart = dynamic(() => import("../components/Chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

**Every lazy boundary needs an error boundary.** A chunk request can fail — a deploy rotated the
filename, the network dropped — and without a boundary the failure unmounts the tree with no
explanation. See [Chapter ?? — Error Boundaries](#ch-react-error-boundaries) for the recovery pattern.

### Vendor chunks are about cache lifetime, not size

Splitting library code out of application code does not reduce the total bytes. It changes **how often
a user has to download them.**

```typescript
// vite.config.ts — build.rollupOptions.output.manualChunks
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("react")) return "react-vendor"; // changes a few times a year
  return "vendor";
}
```

Application code changes every deploy, so its content hash changes and users re-download it.
Dependencies change rarely. Keeping them apart means a routine release invalidates a small file
instead of a large one — a caching argument, and one that belongs beside
[Chapter ?? — Frontend Caching Strategies](#ch-frontend-caching-strategies). But do not over-split:
each chunk is a request, and thirty tiny chunks cost more in round trips and compression efficiency
than they save.

### Prefetch, preload, and the difference that gets asked

| Hint | Fetches | Priority | For |
| ---- | ------- | -------- | --- |
| `preload` | Immediately, in parallel | High | Something **this** page needs and the parser will find late |
| `prefetch` | During idle time | Lowest | Something the **next** navigation will probably need |
| `preconnect` | Opens the connection only | — | A third-party origin you are about to request from |

```typescript
import(/* webpackPrefetch: true */ "./ReportsPage"); // likely next route, idle time
import(/* webpackPreload: true */ "./CriticalWidget"); // needed now, in parallel
```

Prefetching everything is a real anti-pattern: low-priority requests still consume bandwidth and
connections, so on a phone they compete with the current page. Prefetch the one or two probable next
steps, not the whole route table.

### Preload on intent, which is the pattern worth remembering

Lazy loading has one visible cost: the wait after the click. Hover and focus both precede the click by
a few hundred milliseconds, which is usually enough.

```tsx
const AdminPanel = lazy(() => import("./AdminPanel"));
const warm = (): Promise<unknown> => import("./AdminPanel"); // the second call is a cache hit

function Nav() {
  // onFocus matters as much as onMouseEnter — keyboard users get the same benefit.
  return (
    <a href="/admin" onMouseEnter={warm} onFocus={warm}>
      Admin
    </a>
  );
}
```

This gives a small initial bundle **and** no perceptible wait. It is the answer to "does code splitting
not just move the delay?" — yes, and this is how you move it somewhere the user is not looking.

### Deferring work, not just code

`IntersectionObserver` reports when an element approaches the viewport, at a fraction of the cost of a
scroll listener firing hundreds of times a second. Construct it with a `rootMargin` of a couple of
hundred pixels and `unobserve` each target once it has fired — the margin is the whole trick, because
loading at the moment of visibility is already too late to feel instant.

And the cheapest deferral of all needs no JavaScript at all:

```css
.long-report-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* reserve a plausible height, or the scrollbar jumps */
}
```

The browser skips layout and paint for off-screen sections entirely — a large first-paint win on a
long report page, for two lines of CSS. `contain-intrinsic-size` is not optional: without it the
scrollbar resizes as you scroll.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| A route most users never visit | Split it | The largest win for the least work |
| A 300 kB library behind a tab or modal | Split it, with an error boundary | Conditional and large is the ideal case |
| A 5 kB component below the fold | Leave it | The request costs more than the bytes |
| A hero image | Eager, `fetchpriority="high"` | Lazy here directly damages LCP |
| Anything needed for the first paint | Never defer | You are adding a round trip to the critical path |
| A long page of independent sections | `content-visibility: auto` | Free first-paint win, no JavaScript |
| The probable next navigation | `prefetch` on intent | Ready before the click |

## Common Mistakes

❌ **`loading="lazy"` on the LCP image.** Directly delays the metric.
✅ Eager and prioritised above the fold; lazy below it.

❌ **A lazy boundary with no error boundary.** A failed chunk request unmounts the tree silently.
✅ Wrap every boundary, with a fallback that offers a retry.

❌ **Splitting everything.** Thirty chunks means thirty requests and worse compression.
✅ Split by route first, then only large conditional components.

❌ **Prefetching every route.** Low-priority requests still compete for bandwidth on a phone.
✅ Prefetch the one or two likely next steps.

❌ **`content-visibility: auto` without `contain-intrinsic-size`.** The scrollbar jumps as sections
render.
✅ Always give an estimated height.

## 🔑 Key Takeaways

- Deferral moves cost rather than removing it, so pair every split with speculative loading on intent.
- Route splitting is the highest-value split; component splitting is worth it only when large and conditional.
- Vendor chunks are a caching decision — they change how often users re-download, not how much you ship.
- `preload` is for this page and high priority; `prefetch` is for the next page and lowest priority.
- Never lazy-load the LCP image, and never defer anything on the first-paint critical path.

## Interview Questions

**Q: Does code splitting not just move the delay to the click?**

It does, and that is why splitting alone is only half the technique. The other half is warming the
chunk on the first signal of intent — hover or focus on the link, which typically precedes the click by
a few hundred milliseconds. That gives a small initial bundle and no perceptible wait, and it is the
difference between a split that helps and one users complain about.

**Q: When is a component not worth splitting?**

When it is small, or when it is on the first-paint path. A 5 kB component behind a lazy boundary costs
a request, a loading state and an error boundary in exchange for 5 kB, which is a losing trade. And
anything the first paint needs must not be deferred at all, because you have added a serial round trip
to the critical path.

## What to Read Next

- [Chapter ?? — Bundles, Budgets and Third Parties](#ch-bundle-optimisation) — reducing the bytes rather than deferring them
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — the metrics this chapter's decisions move
- [Chapter ?? — Rendering and Streaming](#ch-rendering-and-streaming) — deferring at the framework level instead of the bundler's
