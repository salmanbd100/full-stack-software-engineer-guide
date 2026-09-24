---
title: Loading, Code Splitting and Bundle Budgets
part: 4
chapter: 8
slug: loading-and-code-splitting
level: advanced # beginner | intermediate | advanced
reading_time: 16
updated: 2026-09-24
tags: [code-splitting, lazy-loading, prefetch, bundle-size, tree-shaking, performance-budget, ci, third-party-scripts, performance]
in_book: true
---

# Loading, Code Splitting and Bundle Budgets {#ch-loading-and-code-splitting}

> Ship fewer bytes, send the rest just before they are needed, and put a gate in CI so the savings last.

**In this chapter:** deferral moves cost · route and component splitting · prefetch against preload · what defeats tree shaking · a budget that fails the build · third-party scripts

## 💡 The Core Idea

There are only two ways to make a page load faster: **send fewer bytes, or send them later.**

Sending them later is code splitting. It works because most of what an app ships is never used in one
session. But deferral moves cost; it does not remove it. A split route is still a request. It just
happens at the click instead of at boot. So the skill is to defer hard, then load on the first sign of
intent, before the user is waiting.

Sending fewer bytes does not stay done. Bundle size is a **ratchet that only turns one way**. An
optimisation week takes 400 kB out, and the next quarter puts 500 kB back. What lasts is a budget with
an owner and a CI gate. And much of the weight is third-party script, which you can only govern.

## How It Works

### Images: one attribute, and one thing you must not do

**Lazy below the fold, eager for the hero:**

```html
<img src="chart.png" alt="Emissions by quarter" loading="lazy" width="800" height="600" />
<img src="hero.avif" alt="Dashboard" loading="eager" fetchpriority="high" width="1200" height="600" />
```

> ⚠️ **Never lazy-load the LCP image.** `loading="lazy"` on the hero defers the exact resource the
> metric waits for. It is the most common self-inflicted performance regression.

Keep `width` and `height` on both. Deferring an image without reserving its box swaps a load problem
for a layout-shift problem. See [Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

### Routes are the natural split point

Most users visit a handful of routes. Splitting per route is the biggest win for the least work.

**One Suspense boundary at the route level:**

```tsx
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

File-based routing does this for you. Split a **component** (a chart library, an editor, a map) only
when it is large and conditional — behind a tab, a modal or a permission.

**Every lazy boundary needs an error boundary.** A chunk request can fail. A deploy rotated the file
name, or the network dropped. Without a boundary, the tree unmounts with no explanation. See
[Chapter ?? — Suspense, Streaming and Error Boundaries](#ch-suspense-and-streaming) for the retry pattern.

### Vendor chunks are about cache lifetime, not size

Splitting library code from app code does not cut the total bytes. It changes **how often users
download them again.** App code changes every deploy; dependencies change a few times a year. Kept
apart, a release invalidates a small file, not a large one. See
[Chapter ?? — Caching and Asset Delivery](#ch-asset-delivery). Do not over-split, though.
Thirty tiny chunks cost more in round trips and worse compression than they save.

### Prefetch, preload, and preloading on intent

| Hint | Fetches | Priority | For |
| ---- | ------- | -------- | --- |
| `preload` | Now, in parallel | High | Something **this** page needs that the parser finds late |
| `prefetch` | In idle time | Lowest | Something the **next** page will probably need |
| `preconnect` | The connection only | — | A third-party origin you will request from soon |

Do not prefetch every route: on a phone, idle requests still compete with the current page. The
pattern worth remembering is **preload on intent**. Hover and focus come a few hundred milliseconds
before the click, which is usually enough.

**Warm the chunk on hover and focus:**

```tsx
const AdminPanel = lazy(() => import("./AdminPanel"));
const warm = (): Promise<unknown> => import("./AdminPanel"); // the second call is a cache hit

function Nav() {
  // onFocus matters as much as onMouseEnter: keyboard users get the same head start.
  return (
    <a href="/admin" onMouseEnter={warm} onFocus={warm}>
      Admin
    </a>
  );
}
```

### Tree shaking, and the three things that defeat it

Tree shaking drops exports you never use. It must prove the removal is safe, so anything that hides
the module graph turns it off.

| Requirement | What breaks it |
| ----------- | -------------- |
| ES modules | A CommonJS build — `require` is dynamic, so nothing can be proved unused |
| A production build | Development builds skip it |
| No import-time side effects | A module that changes globals on import cannot be dropped |

**Import style is a size decision — same function, thirty-five times the cost:**

```typescript
import _ from "lodash"; // ❌ the whole CommonJS build, around 70 kB
import { debounce } from "lodash-es"; // ✅ the ES module build, around 2 kB
```

Before optimising, read the treemap from `rollup-plugin-visualizer`, using the **compressed** size.
Minification plus Brotli removes 80–90% of JavaScript, so raw sizes mislead. One dependency often takes
a third of the bundle, and it is rarely the one you guessed.

### A budget is only a budget if it fails the build

A number in a document is a wish. A budget needs two things: **an owner** who decides when it moves,
and **a CI gate** that fails the build. Two kinds of gate catch different regressions.

**Asset size per entry point — fast, runs on every pull request:**

```json
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "170 kB" },
    { "path": "dist/assets/react-vendor-*.js", "limit": "45 kB" }
  ]
}
```

The second gate is a **metric budget**: Lighthouse CI against a preview deploy, failing when LCP
passes 2,500 ms or blocking time passes 300 ms. A size limit catches a dependency someone added. A
metric budget catches a change in *how* things load, such as a script that became render-blocking.

| Rule | Why |
| ---- | --- |
| Set the limit just above today's number | A budget that starts red gets switched off in a week |
| Fail the build, do not warn | A warning in a log is not a budget |
| Post the delta on the pull request | "+14 kB" starts a review question; a red cross just gets retried |

> ⚠️ **Moving target:** Lighthouse assertion names, bundle-size actions and CDN compression defaults
> all churn. The durable principle is two gates: **a deterministic size check on every pull request,
> and a metric check against a real deployed load.** Check the current config format before copying.

### The bytes you do not control

On a commercial page, analytics, tag managers, chat widgets and consent tools are often most of the
JavaScript. You cannot tree-shake a tag manager. You can govern it.

| Control | What it prevents |
| ------- | ---------------- |
| An owner and a review for every new tag | The tag manager becoming an unreviewed deploy channel |
| A reason and an expiry date per script | Scripts nobody remembers, still loading years later |
| Load on idle or after interaction, never in the head | A vendor blocking your first paint |
| A separate budget line for third-party bytes | First-party savings quietly paying for vendor growth |

A tag manager is **a production deploy with no code review**. Marketing can ship any JavaScript to
every user without a pull request. Treat container changes as releases, with an owner and a rollback.
Otherwise your budget is only advice.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| A route most users never visit | Split it | The biggest win for the least work |
| A 300 kB library behind a tab or modal | Split it, with an error boundary | Large and conditional is the ideal case |
| A 5 kB component below the fold | Leave it | The request costs more than the bytes |
| Anything the first paint needs | Never defer it | You add a round trip to the critical path |
| Size creeping up every release | A size limit in CI, with an owner | The only fix that survives team changes |
| A vendor script added last quarter | Owner, expiry, and defer it | This is where most commercial pages lose |

## Common Mistakes

❌ **A lazy boundary with no error boundary.** A failed chunk request unmounts the tree silently.
✅ Wrap every boundary, with a fallback that offers a retry.

❌ **Splitting everything, or prefetching every route.** More requests, worse compression, and
bandwidth stolen from the current page.
✅ Split by route first, then large conditional components; prefetch one or two next steps.

❌ **A budget that only warns, or starts red.** Nobody reads the log, and a red gate gets disabled.
✅ Fail the build, set the limit just above today, and ratchet it down on purpose.

## 🔑 Key Takeaways

- Deferral moves cost rather than removing it, so pair every split with loading on the first sign of intent.
- Route splitting is the highest-value split, and component splitting pays only when the code is large and conditional.
- Tree shaking needs ES modules, a production build and no import-time side effects, and only the compressed size is worth deciding on.
- A budget lasts only with an owner and a CI gate: a size check on every pull request and a metric check on a real load.
- Third-party scripts are often most of the page's JavaScript, and the only levers are ownership, expiry and deferral.

## Interview Questions

**Q: Does code splitting not just move the delay to the click?**

It does, which is why splitting is only half the technique. The other half is warming the chunk on
the first signal of intent. Hover or focus usually comes a few hundred milliseconds before the click.
That gives a small initial bundle and no wait users can see.

**Q: You import one function from a library and the bundle grows by 70 kB. What happened?**

Almost certainly a default import against a CommonJS build. `require` is dynamic, so the bundler
cannot prove any of the library is unused and keeps all of it. The fix is a named import from the ES
module build. Import style is a size decision, not a style one.

**Q: How do you stop bundle size regressing over a year?**

Give the budget an owner and a size limit per entry point that fails the build, set just above today.
Post the delta on every pull request, because "+14 kB" gets a question in review and a red cross gets
retried. Pair it with a metric budget on a preview deploy, since a size check cannot see a script that
became render-blocking.

**Q: A page ships 2 MB of JavaScript and half is third-party. Where do you start?**

The first-party half is splitting and refactoring work. The third-party half is governance. Every
script gets a named owner and a reason, anything unclaimed comes out, and nothing vendor-supplied
loads in the head. Give third-party bytes their own budget line, or first-party effort quietly funds
vendor growth.

## What to Read Next

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — the metrics these loading decisions move
- [Chapter ?? — Measuring in Production](#ch-measuring-in-production) — the field data a metric budget should be set against
- [Chapter ?? — Vite, Rust Bundlers and the Dev Loop](#ch-vite-and-the-dev-loop) — the build tooling behind chunks and tree shaking
