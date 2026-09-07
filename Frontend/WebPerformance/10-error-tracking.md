---
title: Error Tracking
part: 4
chapter: 0
slug: frontend-error-tracking
level: advanced # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-07
tags: [monitoring, errors, sentry, sampling, privacy, slo]
in_book: true
---

# Error Tracking {#ch-frontend-error-tracking}

> Find out the app is broken for real users before they tell you, with enough context to fix it.

**In this chapter:** what a browser error report has to carry · the four capture points · grouping and noise · redacting personal data · sampling · what a frontend should alert on

## 💡 The Core Idea

A server error report has a stack trace, a request ID and a log line either side of it. A browser
error report has a minified stack trace from a browser you do not own, on a network you cannot see,
in a session you cannot reproduce. Everything about frontend error tracking is compensating for that
gap.

Which means the value is not in *capturing* errors — every reporting SDK does that in one line. It is
in the three decisions after: what context travels with the error, what gets removed before it leaves
the browser, and which errors are allowed to wake somebody up.

## How It Works

### The four places an error can reach you

Miss any one of these and a whole class of failure is invisible.

| Source | Catches | Missed if omitted |
| ------ | ------- | ----------------- |
| React error boundary | Errors thrown during render, in lifecycle, and in the commit phase | Every render crash |
| `window.onerror` | Uncaught errors in event handlers, timers, and non-React code | Handler and third-party script failures |
| `unhandledrejection` | Rejected promises with no `.catch()` | Most failed `fetch` calls |
| Explicit capture | Handled errors you want to know about anyway | Recovered failures — retries, degraded modes |

React 19 exposes the boundary paths as root options, which is the right place for the reporter because
it sees errors from every boundary rather than one:

```typescript
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!, {
  onCaughtError: (error, info) => report("caught", error, info.componentStack),
  onUncaughtError: (error, info) => report("fatal", error, info.componentStack),
  onRecoverableError: (error, info) => report("recovered", error, info.componentStack),
});
```

The `componentStack` matters more than `error.stack` here — it tells you which part of the tree failed,
which a minified JavaScript stack often will not. See
[Chapter ?? — Error Boundaries and Resilience](#ch-react-error-boundaries) for where to place the
boundaries themselves.

**The two window-level listeners, which no framework covers for you:**

```typescript
interface ErrorReport {
  kind: "error" | "rejection";
  message: string;
  stack?: string;
  release: string;
  url: string;
}

function send(report: ErrorReport): void {
  // sendBeacon survives the page unload that often follows a crash
  navigator.sendBeacon("/api/errors", JSON.stringify(report));
}

window.addEventListener("error", (event: ErrorEvent) => {
  send({
    kind: "error",
    message: event.message,
    stack: event.error?.stack,
    release: __APP_VERSION__,
    url: location.pathname,
  });
});

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  send({
    kind: "rejection",
    message: String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
    release: __APP_VERSION__,
    url: location.pathname,
  });
});
```

### The context that makes a report actionable

An error report without these is a message string somebody will close.

| Field | Why it decides whether the bug gets fixed |
| ----- | ----------------------------------------- |
| **Release version** | Tells you whether the error is new. Without it, every deploy resets your baseline |
| **Source maps** | A minified stack is unreadable. Upload them per release and keep them private |
| **`componentStack`** | Locates the failure in the tree when the JS stack cannot |
| **Breadcrumbs** | The last few navigations, clicks and requests — the closest thing to a repro |
| **User identifier** | Turns "1,200 events" into "3 users, one of them in a loop" |
| **Browser and device** | Most long-tail errors are one engine or one old version |

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: __APP_VERSION__, // must match the source maps you uploaded
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0, // always keep the session that broke
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  // The last line of defence before anything leaves the browser
  beforeSend: (event) => redact(event),
});

// Attach an identifier, not an identity
Sentry.setUser({ id: user.id });
```

### Redacting before it leaves the browser

Anything sent to an error service leaves your control. In the EU that makes it a processing decision
under GDPR, and session replay makes it a serious one — a replay of a checkout form captures a card
field unless you stop it.

```typescript
const SENSITIVE = /token|password|secret|authorization|email|card/i;

function redact<T extends { request?: { url?: string; headers?: Record<string, string> } }>(
  event: T,
): T {
  // Query strings are the most common accidental leak — tokens end up in URLs
  if (event.request?.url) {
    const url = new URL(event.request.url, location.origin);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE.test(key)) url.searchParams.set(key, "[redacted]");
    }
    event.request.url = url.toString();
  }

  for (const key of Object.keys(event.request?.headers ?? {})) {
    if (SENSITIVE.test(key)) event.request!.headers![key] = "[redacted]";
  }

  return event;
}
```

> ⚠️ Mask replay input by default and unmask specific fields deliberately, never the other way round.
> An allow-list fails safe; a deny-list fails the first time someone adds a form field.

### Sampling and noise

An error service bills per event and a human triages per issue, so both budgets are finite.

| Signal | Rate | Reason |
| ------ | ---- | ------ |
| Errors | 100% | They are rare, and the rare one is the interesting one |
| Performance traces | 1–10% | Continuous and expensive; a sample is statistically fine |
| Session replay, all sessions | ~1% | Storage and privacy cost |
| Session replay, error sessions | 100% | The only session you actually want is the one that broke |

The noise is rarely your code. Three sources account for most of it: browser extensions injecting
scripts, bot traffic, and `ResizeObserver loop completed with undelivered notifications`, which is
usually benign. Filter them at the SDK boundary — `ignoreErrors`, `denyUrls`, and dropping events
whose stack contains no frame from your own origin.

### What to alert on

Alert on user impact, not on event count. A spike of 500 events from one user in a retry loop is not
an incident; five users failing to check out is.

**Frontend indicators worth an SLO:**

```typescript
interface FrontendSlo {
  name: string;
  indicator: string;
  target: number; // percentage of sessions that must be good
  window: "1h" | "24h" | "7d";
}

const slos: FrontendSlo[] = [
  { name: "Crash-free sessions", indicator: "sessions with no fatal error", target: 99.5, window: "24h" },
  { name: "Checkout completion", indicator: "started → completed", target: 97, window: "1h" },
  { name: "LCP good", indicator: "p75 LCP under 2.5 s", target: 90, window: "24h" },
];
```

Crash-free sessions is the metric to reach for first, because it normalises by traffic: it does not
spike when you have a good day for visitors, and it does not hide a regression behind growth. The
alerting discipline itself — severities, burn rates, and how not to page people at 3 a.m. — is
[Chapter ?? — Alerting and On-Call](#ch-alerting), and it applies unchanged here.

## When to Use It

| Situation | Do this |
| --------- | ------- |
| Any production frontend | Boundary reporting plus the two window listeners, from day one |
| Regulated or EU-facing product | Redaction in `beforeSend`, replay masked by default, and a documented retention window |
| High-traffic consumer app | Sample traces and replays; never sample errors |
| Errors reported but nobody triages | Fix ownership and grouping before adding more capture |
| A deploy caused a spike | Compare by `release`; without release tagging this is guesswork |

## Common Mistakes

❌ **No source maps uploaded.** Every stack reads `a.b is not a function` at `main.4f2a.js:1`.
✅ Upload per release, tagged with the same version string the SDK reports, and keep them off the CDN.

❌ **Personal data in error payloads.** Email addresses in a message string, tokens in a query
parameter, a card field in a replay.
✅ Redact in `beforeSend`, mask replay by default, and send an opaque user ID rather than an identity.

❌ **Sampling errors.** A 10% error sample means the bug affecting nine users looks like one.
✅ Sample traces and replays. Capture every error.

❌ **Alerting per error.** The channel fires constantly, and within a fortnight nobody reads it.
✅ Alert on crash-free session rate and on funnel completion, not on event counts.

❌ **No release tagging.** You cannot tell a new regression from a two-year-old known issue.
✅ Tag every event with the build version and diff issues by release.

## 🔑 Key Takeaways

- Four capture points cover the browser: error boundaries, `window.onerror`, `unhandledrejection`, and explicit capture.
- A report is actionable only with a release version, source maps, `componentStack` and breadcrumbs.
- Redact in the browser before sending; mask session replay by default and unmask deliberately.
- Sample traces and replays for cost, never errors — the rare error is the one that matters.
- Alert on crash-free sessions and funnel completion, because those normalise by traffic.

## Interview Questions

**Q: How do you know a deploy broke something for 2% of users?**

Crash-free session rate, broken down by release. A raw error count cannot answer it — traffic varies,
and 2% of sessions failing can be fewer events than one user stuck in a retry loop. Tag every event
with the build version, compare the rate for the new release against the previous one, and alert on
the rate rather than the count.

**Q: What do you strip from a frontend error report, and where?**

Tokens and identifiers in URLs and headers, anything that looks like an email address or a payment
field in messages, and all text in session replay unless a field has been explicitly unmasked. It
happens in the browser, in the SDK's `beforeSend` hook, because once the payload reaches the vendor it
is out of your control and inside their retention policy. Server-side scrubbing is a second layer, not
the first one.

**Q: Would you sample error events to control cost?**

No. Errors are already rare relative to traffic, so they are the cheap signal, and sampling them
destroys exactly the long-tail single-user bug you most want to see. Sample the continuous, expensive
signals instead — performance traces at 1–10%, all-session replay around 1% — and keep replay at 100%
for sessions that errored, since that is the only session you would ever watch.

**Q: Your error channel gets 400 notifications a day and the team has muted it. How do you fix it?**

Stop capturing what is not yours before touching thresholds: filter browser-extension frames, bot
traffic, and the known-benign `ResizeObserver` warning. Then move alerting off event counts and onto
crash-free session rate and funnel completion, so the alert fires on user impact. Muting is the signal
that the alerts were never actionable, so the fix is fewer and better ones, not a different channel.

## What to Read Next

- [Chapter ?? — Performance Monitoring](#ch-performance-monitoring) — the field-data half of the same instrumentation
- [Chapter ?? — Error Boundaries and Resilience](#ch-react-error-boundaries) — where the boundaries that feed this go
- [Chapter ?? — Alerting and On-Call](#ch-alerting) — the discipline these SLOs plug into
