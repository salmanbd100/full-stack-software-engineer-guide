---
title: Measuring in Production
part: 4
chapter: 0
slug: measuring-in-production
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-09
tags: [rum, web-vitals, error-tracking, sampling, slo, observability]
in_book: true
---

# Measuring in Production {#ch-measuring-in-production}

> Collect the field data that makes performance and errors debuggable, without shipping user data to a vendor or drowning in noise.

**In this chapter:** field against lab, and what each cannot see · `web-vitals` and attribution · the four places an error reaches you · the context that gets a bug fixed · redaction and sampling · crash-free sessions as the frontend SLO

## 💡 The Core Idea

Performance and error tracking are the same instrument. Both answer "what actually happened to real
users", both are collected in the browser and sent to something you did not build, and both are
useless without the same three fields: **which release, which user, which page**.

The reason to treat them as one chapter is that the interesting failures are correlated. A spike in
INP and a spike in unhandled rejections after a deploy are the same incident described twice. Wiring
them separately gives you two dashboards nobody joins up.

The uncomfortable half is that all of this data leaves the browser. Session replay in particular is a
recording of somebody using your product, and treating that as a technical decision rather than a
privacy one is how teams end up with card numbers in a vendor's database.

## How It Works

### Field and lab answer different questions

| | Field (real users) | Lab (a scripted load) |
| --- | --- | --- |
| Tells you | Whether you have a problem, and for whom | Why, with a waterfall and a trace |
| Device and network | Whatever users have | One profile you chose |
| Can measure INP | Yes | No — nobody is interacting |
| Good in CI | No — needs traffic | Yes, and deterministic enough to gate on |

You need both, and the split is clean: **lab data gates the pull request, field data tells you what to
work on.** A team with only lab data optimises for a synthetic profile; a team with only field data
knows it is slow and cannot say why.

The one hard asymmetry is INP. There is no interaction in a lab run, so Lighthouse substitutes Total
Blocking Time as a proxy. Fixing INP therefore *requires* field data — see
[Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

### Collecting vitals, and the attribution build

```typescript
import { onCLS, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

function report(metric: Metric): void {
  const { name, value, rating } = metric;
  const body = JSON.stringify({ name, value, rating, release: __APP_VERSION__, route: location.pathname });
  // sendBeacon survives the unload that finalises CLS and INP.
  navigator.sendBeacon?.("/api/vitals", body) ??
    fetch("/api/vitals", { body, method: "POST", keepalive: true });
}

[onLCP, onINP, onCLS, onTTFB].forEach((collect) => collect(report));
```

> ⚠️ **`onFID` no longer exists.** FID was retired in 2024 and removed from the library. Code or an
> article using it is out of date by more than a metric name.

A bare value tells you there is a problem. The **attribution build** tells you where:

```typescript
import { onINP, onLCP } from "web-vitals/attribution";

onLCP((m) => report({ ...m, element: m.attribution.target }));
onINP((m) => report({ ...m, target: m.attribution.interactionTarget }));
```

That turns "p75 INP is 480 ms" into "p75 INP is 480 ms, on the filter dropdown in the reports table".
Collect attribution from the start; retrofitting it means waiting another week for data.

For anything the vitals do not cover, `PerformanceObserver` watches the browser's own timeline:

```typescript
// Long tasks are the direct cause of poor INP — over 50 ms cannot be interrupted.
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) report({ name: "longtask", value: entry.duration });
  }
}).observe({ type: "longtask", buffered: true });
```

### The four places an error can reach you

Miss any one and a whole class of failure is invisible.

| Source | Catches | Invisible without it |
| ------ | ------- | -------------------- |
| Framework error boundaries | Throws during render and commit | Every render crash |
| `window.onerror` | Uncaught errors in handlers, timers, third-party code | Handler and vendor-script failures |
| `unhandledrejection` | Rejected promises with no `.catch()` | Most failed `fetch` calls |
| Explicit capture | Handled errors you still want to know about | Retries and degraded modes — the silent ones |

```typescript
window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const { reason } = event;
  const stack = reason instanceof Error ? reason.stack : undefined;
  navigator.sendBeacon("/api/errors", JSON.stringify({
    kind: "rejection", message: String(reason), stack,
    release: __APP_VERSION__, route: location.pathname,
  }));
});
```

`unhandledrejection` is the one teams forget, and it is where most real failures land: an `await fetch`
with no `try` produces a rejection, not an error, so `window.onerror` never fires. See
[Chapter ?? — Error Boundaries and Resilience](#ch-react-error-boundaries) for the render-time half.

### The context that decides whether a bug gets fixed

An error report without these is a string somebody closes.

| Field | Why it matters |
| ----- | -------------- |
| **Release version** | Whether this is new. Without it every deploy resets your baseline |
| **Source maps, uploaded per release** | A minified stack is unreadable. Keep them private, not public on the CDN |
| **Component stack** | Locates the failure in the tree when the JavaScript stack cannot |
| **Breadcrumbs** | The last few clicks, navigations and requests — the nearest thing to a reproduction |
| **A user identifier** | Turns "1,200 events" into "three users, one in a retry loop" |
| **Browser and device** | Most long-tail errors are one engine or one old version |

An **identifier, not an identity.** `user.id` is enough to count affected people; a name and an email
address in an error service is personal data you now have to account for.

### Redact in the browser, before it leaves

Every serious client offers a before-send hook. Use it — that is the last point at which the data is
still yours. Strip any query parameter or header matching `/token|password|secret|authorization|email|card/i`:
**query strings are the most common accidental leak**, because tokens routinely end up in URLs and
then in error reports.

> ⚠️ **Mask session replay by default and unmask deliberately.** An allow-list fails safe; a deny-list
> fails the first time somebody adds a form field. A replay of a checkout captures the card input
> unless you stopped it in advance, and "we will add it to the deny-list" is not a plan.

### Sampling, because both budgets are finite

An error service bills per event and a human triages per issue.

| Signal | Rate | Why |
| ------ | ---- | --- |
| Errors | 100% | They are rare, and the rare one is the interesting one |
| Performance traces | 1–10% | Continuous and expensive; a sample is statistically sufficient |
| Session replay, all sessions | ~1% | Storage and privacy cost |
| Session replay, sessions with an error | 100% | The only session you actually want is the one that broke |

Most noise is not your code: browser extensions injecting scripts, bot traffic, and `ResizeObserver
loop completed with undelivered notifications`, which is usually benign. Filter at the client
boundary rather than in triage, and drop any event whose stack has no frame from your own origin.

### Alert on user impact, not on event count

A spike of 500 events from one user in a retry loop is not an incident. Five users unable to check out
is.

| Indicator | Target | Window |
| --------- | ------ | ------ |
| Sessions with no fatal error | 99.5% | 24 h |
| Checkout started → completed | 97% | 1 h |
| p75 LCP under 2.5 s | 90% | 24 h |

**Crash-free sessions is the frontend metric to reach for first**, because it normalises by traffic. A
raw error count spikes on a good day for visitors and hides a regression behind growth; a rate does
neither. The alerting discipline itself is [Chapter ?? — Alerting and On-Call](#ch-alerting), and it
applies here unchanged.

## When to Use It

| Situation | Reach for | Why |
| --------- | --------- | --- |
| "Is the site slow?" | Field data, segmented by device | Your laptop is not the 75th percentile |
| "Why is this page slow?" | A lab run — trace and waterfall | Deterministic and inspectable |
| Poor INP with no idea where | Attribution build | Names the interaction target |
| A regression that only appears in CI | Lab, in the pipeline | Gate the pull request on it |
| A crash nobody can reproduce | Breadcrumbs, and a replay of that session | The nearest thing to a repro |
| Deciding what to fix next | Affected user count, not event count | Impact, not volume |

## Common Mistakes

❌ **Collecting vitals without attribution.** You learn there is a problem and not where.
✅ Use the attribution build from day one.

❌ **No `unhandledrejection` listener.** Most failed `fetch` calls are silent.
✅ Both window listeners, plus framework boundaries and explicit capture.

❌ **No release version on reports.** Every deploy resets the baseline and nothing is ever "new".
✅ Stamp the release, and upload matching source maps.

❌ **Session replay unmasked by default.** The first form you add leaks.
✅ Mask everything, unmask specific fields deliberately.

❌ **Alerting on error count.** It tracks traffic as much as it tracks health.
✅ Alert on crash-free sessions and completion rates.

## 🔑 Key Takeaways

- Lab data gates the pull request; field data tells you what to work on — and INP exists only in the field.
- The attribution build is what turns a bad metric into a named element or interaction.
- Four capture points are needed for full error coverage, and `unhandledrejection` is the one usually missing.
- Release version and uploaded source maps are what make a minified production stack usable at all.
- Crash-free sessions is the frontend SLO to start with, because a rate does not move with traffic.

## Interview Questions

**Q: Lighthouse gives the site 95 and users say it is slow. Who is right?**

The users. Lighthouse is one scripted load on one device profile, and it cannot measure INP at all
because nothing interacts with the page. Field data at the 75th percentile is the number that
describes reality, and it will usually show the problem is responsiveness on mid-range phones rather
than load. The lab run is still useful — just for diagnosis, not for judgement.

**Q: What do you need on an error report before it is worth triaging?**

Release version, a readable stack via uploaded source maps, the route, and a user identifier so you
can count affected people rather than events. Breadcrumbs if you can get them, because the sequence of
clicks and requests before the throw is the closest thing to a reproduction. Without the release
version in particular, you cannot tell a new regression from something that has been failing for
months.

**Q: What is the privacy exposure here, and what do you do about it?**

Everything collected leaves the browser for a third party, and session replay is a recording of
someone using your product. The controls are: redact in a before-send hook so the last decision
happens on your side, mask replay input by default and unmask specific fields deliberately, send an
opaque user id rather than a name or email, and strip sensitive query parameters — tokens in URLs
being the most common accidental leak.

## What to Read Next

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — the metrics this chapter collects and what each number means
- [Chapter ?? — Bundles, Budgets and Third Parties](#ch-bundle-optimisation) — the lab-side gate this field data should calibrate
- [Chapter ?? — Observability](#ch-observability) — the same discipline applied server-side
