---
title: Core Web Vitals
part: 4
chapter: 0
slug: core-web-vitals
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [core-web-vitals, inp, lcp, cls, performance, metrics]
in_book: true
---

# Core Web Vitals {#ch-core-web-vitals}

> Name the three metrics, the number each is judged at, and what you would change first for each one.

**In this chapter:** the 75th-percentile rule · LCP and finding the element · INP, which replaced FID · CLS and reserved space · field data against lab data · the order to fix things in

## 💡 The Core Idea

Core Web Vitals are three numbers standing in for three things a user actually feels: **did the main
content arrive, did the page respond when I touched it, and did anything move under my finger.**

The detail that changes how you work with them is the **75th percentile**. A site is not judged on its
average or on your laptop — it is judged on the visit at the 75th percentile of real users, which is a
mid-range phone on a mediocre network. So an improvement that helps the fast half of your traffic
moves the score by nothing, and a page that feels instant in development can score poorly.

That is why the vitals are a *field* measurement first. The lab tools are for diagnosis; the field
number is the one that exists.

## How It Works

### The three metrics and their thresholds

| Metric | Measures | Good | Poor |
| ------ | -------- | ---- | ---- |
| **LCP** — Largest Contentful Paint | When the largest visible element finished rendering | < 2.5 s | > 4 s |
| **INP** — Interaction to Next Paint | How long from an interaction to the next painted frame | < 200 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | How much visible content moved unexpectedly | < 0.1 | > 0.25 |

> ⚠️ **FID is gone.** INP replaced First Input Delay as a Core Web Vital in March 2024 and FID was
> removed entirely in September 2024. A great deal of published material — and a great many
> interviewers' notes — still says FID, so being precise about this is a cheap way to sound current.

The difference is not cosmetic. FID measured only the **delay before the first** interaction's handler
started. INP measures the **whole journey** — input delay, the handler running, and the browser
painting the result — for **every** interaction, and reports close to the worst. A page could score
well on FID while every subsequent click took half a second, and many did.

### LCP: find the element before optimising anything

You cannot fix LCP without knowing which element it is, and it is frequently not the one you assume.

```typescript
import { onLCP, type LCPMetric } from "web-vitals/attribution";

onLCP((metric: LCPMetric) => {
  // A CSS selector for the actual element, plus the phase breakdown.
  console.info(metric.value, metric.attribution.target, metric.attribution.resourceLoadDelay);
});
```

Then work in this order, because the returns fall off sharply:

| Fix | Typical impact |
| --- | -------------- |
| Give the LCP image `fetchpriority="high"` and the right format and size | Largest single win |
| Preload the LCP resource; `preconnect` to its origin | Removes a discovery round trip |
| Remove render-blocking CSS and JavaScript from the head | Often seconds on slow connections |
| Improve the server or CDN response time | Raises the floor for everything |

```html
<!-- The LCP image: modern format, right size per viewport, and not queued behind other requests -->
<img
  src="hero.avif"
  srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
  sizes="(max-width: 600px) 400px, 1200px"
  alt="Quarterly emissions dashboard"
  fetchpriority="high"
/>
```

`fetchpriority="high"` matters more than it looks. By default the browser discovers images late and
gives them low priority, so a hero image queues behind scripts it does not need to wait for.

### INP: the main thread is the whole story

Poor INP means the main thread was busy when the user interacted. There are only three things to do
about it, and they are all about giving the thread back.

```typescript
// ❌ One long task. Every click during it waits.
function reindex(rows: Row[]): void {
  for (const row of rows) expensiveWork(row);
}

// ✅ Yield between chunks so input can be handled.
async function reindex(rows: Row[]): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    expensiveWork(rows[i]);
    if (i % 100 === 0) await scheduler.yield(); // hand the thread back
  }
}
```

| Cause | Fix |
| ----- | --- |
| A single task over 50 ms | Chunk it and yield, or move it to a worker |
| A handler firing on every keystroke or scroll frame | Debounce or throttle it |
| A large synchronous re-render after a state change | Narrow what re-renders, or mark it non-urgent |

The 50 ms number is worth remembering: any task longer than that can hold up an interaction, and the
browser cannot interrupt it. See
[Chapter ?? — Rendering and Streaming](#ch-rendering-and-streaming) for the framework-level version.

### CLS: reserve the space before the content arrives

Every layout shift has the same cause — **the browser did not know how big something would be.**

```html
<!-- ❌ Content jumps down when the image loads -->
<img src="chart.png" alt="Emissions by quarter" />

<!-- ✅ The box exists from the first frame -->
<img src="chart.png" alt="Emissions by quarter" width="800" height="600" />

<!-- ✅ Or with intrinsic ratio, for a fluid width -->
<img src="chart.png" alt="Emissions by quarter" style="aspect-ratio: 4 / 3; width: 100%" />
```

The same rule covers everything that arrives late: a `min-height` on an ad or embed slot, a skeleton
the same size as the content it replaces, and `font-display: swap` with matched fallback metrics so
the text does not reflow when the web font arrives —
[Chapter ?? — Asset Delivery](#ch-asset-delivery) covers that pairing.

And one behavioural rule: never insert content above what the user is already reading. A notification
banner belongs in a fixed overlay, not pushed into the flow.

### Field data and lab data answer different questions

| | Field (real users) | Lab (Lighthouse, a synthetic run) |
| --- | --- | --- |
| Measures | What actually happened, at the 75th percentile | One controlled load on one device |
| Good for | Knowing whether you have a problem | Finding out why |
| Can measure INP | Yes | No — there is no real interaction to measure |

That last row catches people. A lab run has nobody clicking, so Lighthouse reports Total Blocking Time
as a proxy. **INP only exists in the field**, which means you cannot fix it without real-user
measurement in place first — see
[Chapter ?? — Measuring in Production](#ch-measuring-in-production).

## When to Use It

| Situation | Fix first | Why |
| --------- | --------- | --- |
| A content or marketing page scoring badly | LCP: the hero image and render-blocking head | Load dominates; there is little interaction |
| A dashboard or editor scoring badly | INP: long tasks and re-render cost | The user interacts constantly |
| Ads, embeds or late-loading banners | CLS: reserve every slot | One unreserved slot can fail the metric alone |
| Good lab scores, poor field scores | Trust the field, and segment it | Your device is not the 75th percentile |
| Poor INP with no field data | Instrument first | INP cannot be measured in a lab run |

## Common Mistakes

❌ **Optimising the average.** Improving the fast half of traffic moves the 75th percentile by nothing.
✅ Segment field data by device and connection, and work on the slow tail.

❌ **Talking about FID.** It stopped being a Core Web Vital in 2024.
✅ INP, and be able to say what it measures that FID did not.

❌ **Guessing the LCP element.** Teams routinely optimise an image that is not it.
✅ Read it from attribution data, then optimise that one element.

❌ **`loading="lazy"` on the hero image.** It defers the exact resource LCP is waiting for.
✅ Eager, with `fetchpriority="high"`. Lazy-load only below the fold.

❌ **Chasing a Lighthouse score as the goal.** It is one synthetic load and it cannot see INP at all.
✅ Use lab runs to diagnose, and judge on field data.

## 🔑 Key Takeaways

- Core Web Vitals are judged at the 75th percentile of real users, not on an average or your own device.
- INP replaced FID in 2024: it measures every interaction end to end, not just the first input's delay.
- LCP work starts by identifying the element from attribution data, not by guessing.
- Every layout shift comes from unreserved space, so give late-arriving content its box up front.
- INP cannot be measured in a lab run, which makes real-user monitoring a prerequisite for fixing it.

## Interview Questions

**Q: What replaced FID, and what does it measure differently?**

INP, as of March 2024. FID only measured the delay before the first interaction's handler began, so a
page could score well and still feel unresponsive on every click after the first. INP measures the
full path — input delay, handler execution, and the next paint — across all interactions and reports
close to the worst one. It is a much harder metric to game and a much better proxy for how the page
actually feels.

**Q: A page has an LCP of 4.2 seconds. Walk me through your first hour.**

Identify the LCP element from field attribution rather than assuming, because it is often a background
image or a headline instead of the hero. Then check the sequence: is the resource discovered late,
queued behind scripts, or just too large? Most of the time the fix is the right format and size plus
`fetchpriority="high"` and a preload, and only after that would I look at render-blocking CSS or the
server's response time.

**Q: Why can Lighthouse not tell you your INP?**

Because there is no user in a lab run. INP requires real interactions to measure, so Lighthouse
reports Total Blocking Time as a proxy for main-thread congestion instead. That is why fixing INP
starts with getting field data in place — without it you are optimising against a number that
correlates but is not the metric.

**Q: Your CLS is 0.3 and you have set width and height on every image. Where else do you look?**

Late-arriving content that has no reserved box: ad and embed slots, cookie banners inserted into the
flow, consent modals, and anything appended above the current scroll position. Then web fonts — a
fallback with different metrics reflows every line when the real font swaps in, which needs
`size-adjust` and matched ascent and descent rather than just `font-display: swap`.

## What to Read Next

- [Chapter ?? — Measuring in Production](#ch-measuring-in-production) — collecting the field data these numbers come from
- [Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting) — the main lever on LCP and on main-thread work
- [Chapter ?? — Asset Delivery](#ch-asset-delivery) — images, fonts and CSS, which cause most LCP and CLS problems
