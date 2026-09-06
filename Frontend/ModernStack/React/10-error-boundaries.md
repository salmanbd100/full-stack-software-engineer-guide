---
title: Error Boundaries and Resilience
part: 3
chapter: 0
slug: react-error-boundaries
level: advanced # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-06
tags: [react, error-boundaries, resilience, suspense, error-reporting]
in_book: true
---

# Error Boundaries and Resilience {#ch-react-error-boundaries}

> Contain a render failure to the part of the page that failed, report it with enough context to fix, and give the user a way out.

**In this chapter:** why an uncaught render error blanks the screen · the boundary API · what boundaries do not catch · where to place them · recovery that is not a refresh

## 💡 The Core Idea

React's default when a component throws during render is deliberate and severe: it unmounts the entire
tree. The reasoning is that a half-rendered interface is worse than none — a banking screen showing a
stale balance next to a broken chart will be trusted, and should not be.

That default is correct and almost never what you want in production. An **error boundary** is the
component that overrides it for one subtree, turning "the application is gone" into "this panel could
not load". Resilience in a React application is almost entirely a question of where you draw those
subtrees.

> One failing widget in a dashboard should cost the user one widget. If it costs them the dashboard,
> the boundaries are in the wrong place — or there are none.

## How It Works

### The boundary itself

A boundary is still a class component, because the two lifecycle methods it needs have no hook
equivalent. You write it once per codebase.

```tsx
interface BoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<BoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  // Pure — decides what renders next. No side effects here.
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  // The side-effect half: this is where reporting belongs.
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, info.componentStack); // componentStack, not error.stack
  }

  render(): React.ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

The split matters. `getDerivedStateFromError` runs during render and must stay pure;
`componentDidCatch` runs after and is the only one of the two allowed to log, report, or touch anything
outside React.

`info.componentStack` is the part worth capturing. A JavaScript stack tells you which function threw;
the component stack tells you which route, which layout and which list item — which is usually what
identifies the bug.

Most teams use `react-error-boundary` rather than hand-rolling this. It wraps the same two methods and
adds the reset behaviour described below.

### What a boundary does not catch

This is the question interviewers ask, because the list is not obvious.

| Where the error happens                | Caught? | What catches it instead                     |
| -------------------------------------- | ------- | ------------------------------------------- |
| Rendering a child component            | ✅      | The nearest boundary above it                |
| A child's lifecycle or effect          | ✅      | The nearest boundary above it                |
| An event handler such as `onClick`     | ❌      | A `try`/`catch`, and state you render        |
| `setTimeout`, `requestAnimationFrame`  | ❌      | A `try`/`catch` inside the callback          |
| A rejected promise you never awaited   | ❌      | `.catch`, or `use()` inside a boundary       |
| The boundary's own render              | ❌      | A boundary above it                          |

The event handler case surprises people. React is not in the call stack when a click handler runs, so
there is nothing for it to intercept. If a failed save should show a message, that message is state you
set in a `catch` block — not something a boundary can produce for you.

### Reporting at the root

React 19 exposes the three error paths as root options, which is where a production error reporter
belongs. They fire for every error, including ones a boundary already handled.

```tsx
hydrateRoot(container, <App />, {
  onCaughtError: (error, info) => report("caught", error, info.componentStack),
  onUncaughtError: (error, info) => report("fatal", error, info.componentStack),
  onRecoverableError: (error, info) => report("recovered", error, info.componentStack),
});
```

`onRecoverableError` is the one worth wiring up early: it is where hydration mismatches surface. React
recovers by re-rendering on the client and the user sees nothing, so without this handler the bug stays
invisible until someone reports a flicker.

> ⚠️ Leave these unset in development. React's own error overlay is more useful than anything you will
> write, and setting the handlers unconditionally replaces it.

### Boundaries and Suspense together

They are siblings, not alternatives. Suspense handles "not here yet"; a boundary handles "will never
arrive".

```tsx
<ErrorBoundary fallback={<ChartUnavailable />}>
  <Suspense fallback={<ChartSkeleton />}>
    <RevenueChart /> {/* suspends while loading, throws if the fetch fails */}
  </Suspense>
</ErrorBoundary>
```

The order is fixed: the boundary goes **outside** the Suspense boundary. A rejected promise read with
`use()` throws during render, so it needs a boundary above the component that suspended — with the
Suspense boundary outermost, the throw escapes past it.

Streaming server rendering changes the shape of the recovery. If a component throws after the shell has
already been sent, React cannot un-send that HTML, so it discards the subtree and asks the client to
render it again. The client render either succeeds — the user sees a short delay — or throws too, and
then the boundary's fallback appears.

### Where to put them

| Level                    | Fallback shows                                 | Why there                                    |
| ------------------------ | ---------------------------------------------- | -------------------------------------------- |
| Root of the application  | A full-page error with a reload                | Last resort — everything below it has failed  |
| Per route                | The shell and navigation, with the page failed | The user can navigate away without a refresh  |
| Per independent widget   | One card replaced with a retry                 | A third-party chart cannot take down billing  |
| Around risky content     | A degraded but usable version                  | User-authored content, embeds, experiments    |

The useful rule: **a boundary belongs wherever the page still means something without the subtree below
it.** If losing the subtree makes the rest of the screen misleading, the boundary belongs higher.

Frameworks give you some of this by convention — in the Next.js App Router an `error.tsx` file becomes a
route-level boundary automatically, and `global-error.tsx` the root one. The placement decision is the
same either way; only the syntax belongs to the framework.

### Recovery that is not a page reload

A fallback with no way forward is a dead end. Three things make one recoverable.

- **A reset.** The boundary clears `hasError` and re-renders its children, usually from a "try again"
  button. Pair it with a key that changes on navigation, so leaving the route clears a stale error.
- **A reason.** "Could not load revenue for this quarter" is actionable; "Something went wrong" is not.
  Never render the raw error message — it leaks internals and means nothing to the user.
- **A fallback that is still useful.** A cached figure marked stale, or the table without its chart,
  beats an empty card.

## When to Use It

| Situation                                        | Reach for                                       |
| ------------------------------------------------ | ----------------------------------------------- |
| A widget rendering third-party or user data       | A boundary around that widget alone             |
| A data fetch that can legitimately fail           | Suspense inside, boundary outside               |
| A form submission that failed validation          | Error state in the component — not exceptional  |
| A record that does not exist                      | A rendered "not found" view; a 404 is data      |
| An error thrown in a click handler                | `try`/`catch` and state, never a boundary       |
| Knowing errors happened at all in production      | Root `onCaughtError` and `onUncaughtError`      |

## Common Mistakes

**❌ One boundary at the root and nothing else.** Technically there is a boundary. In practice any
failure anywhere still replaces the whole application, which is the behaviour it was installed to avoid.

**❌ Using a boundary for expected failures.** An empty search result, a rejected login, a validation
error — these are outcomes, not exceptions. Modelling them as thrown errors makes normal paths
unpredictable and buries the real crashes in the same reporting channel.

**❌ A fallback with no reset.** The subtree stays broken until a full page reload. Give the user a
retry, and reset the boundary on navigation.

**❌ Swallowing the error:**

```tsx
componentDidCatch(): void {
  // deliberately empty — "the fallback handles it"
}
```

The user sees a graceful message and nobody ever finds out. If a boundary caught something, someone
needs to know it happened.

**❌ Rendering `error.message` to the user.** It carries stack traces, internal identifiers, sometimes a
query. Log it; show a sentence written for a human.

## 🔑 Key Takeaways

- Without a boundary, one thrown error during render unmounts the whole React tree.
- A boundary catches errors in rendering, lifecycles and effects below it — never event handlers, timers, or its own render.
- `getDerivedStateFromError` chooses the fallback and stays pure; `componentDidCatch` does the reporting.
- Place the error boundary outside the Suspense boundary, and capture `componentStack` when you report.
- Expected failures are state, not exceptions — reserve boundaries for the ones you did not plan for.

## Interview Questions

**Q: What does an error boundary catch, and what does it miss?**

It catches errors thrown while rendering its subtree, and in the lifecycle methods and effects of the
components below it. It misses anything React is not on the call stack for: event handlers, timers,
unawaited promises, and errors thrown by the boundary itself. Those need an ordinary `try`/`catch` with
the result put into state.

**Q: Where do you place boundaries in a dashboard with a dozen independent widgets?**

One per widget, plus one at the route level. The widget boundaries mean a failing third-party chart
costs the user that chart and nothing else; the route boundary keeps the navigation shell alive so they
can leave without reloading. A single root boundary gives the same blank screen the default does.

**Q: Why does the error boundary go outside the Suspense boundary rather than inside?**

Because a rejected promise read during render throws, and the throw has to reach a boundary above the
component that suspended. With the Suspense boundary outermost the error escapes it entirely and lands
further up, usually at the root. Nesting the other way gives a skeleton while the data loads and a
scoped failure message when it never arrives.

**Q: When is an error boundary the wrong tool?**

When the failure is expected. Empty results, failed validation, an unauthorised response and a missing
record are all states the interface should render deliberately. Throwing for them pushes ordinary flows
down the exception path, hides genuine crashes among the same alerts, and produces generic fallback UI
where a specific, helpful message belonged.

## What to Read Next

- [Chapter ?? — Suspense and Streaming](#ch-suspense-and-streaming) — the boundary's counterpart for data that has not arrived
- [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms) — where mutation failures belong instead
- [Chapter ?? — Frontend Monitoring](#ch-frontend-monitoring) — turning caught errors into something someone acts on
