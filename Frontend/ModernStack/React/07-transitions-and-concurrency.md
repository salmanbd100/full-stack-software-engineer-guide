---
title: Transitions and Concurrency
part: 3
chapter: 0
slug: transitions-and-concurrency
level: advanced # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-03
tags: [react, useTransition, useDeferredValue, concurrency, responsiveness]
in_book: true
---

# Transitions and Concurrency {#ch-transitions-and-concurrency}

> Keep the input responsive while an expensive screen renders behind it, and know which of the two hooks the situation calls for.

**In this chapter:** urgent against non-urgent · `useTransition` · `useDeferredValue` · choosing between them · what a transition does not fix

## 💡 The Core Idea

Rendering used to be one uninterruptible block: React started, and the browser could not do anything
else — including respond to typing — until it finished. Concurrent rendering removed that constraint.
React can now start rendering, pause, let the browser handle an event, and either resume or throw the
work away.

Nothing takes advantage of that automatically. **You mark which updates are allowed to wait.** Everything
unmarked stays urgent, and urgent work interrupts non-urgent work.

> Two updates from one keystroke: the character appearing in the input, and the ten thousand rows
> filtering behind it. Only one of them has to happen in the next frame.

## How It Works

### `useTransition` — for an update you trigger

Wrap the state update, not the value. React renders the new screen in the background and keeps showing
the old one until it is ready, giving you a pending flag to show meanwhile.

```tsx
const [isPending, startTransition] = useTransition();
const [tab, setTab] = useState<TabId>("about");

function selectTab(next: TabId): void {
  startTransition(() => {
    setTab(next); // Non-urgent: the old tab stays on screen until the new one is ready
  });
}
```

Without the transition, clicking a slow tab freezes the interface until it renders. With it, the button
responds at once, the old tab stays visible, and `isPending` lets you dim it.

React 19 also allows an async function here, which is what Actions are built on:

```tsx
startTransition(async () => {
  await saveDraft(draft);
  setSaved(true);
});
```

### `useDeferredValue` — for a value you receive

Sometimes you do not own the `setState`. A component is handed a prop, or the state lives above it. Defer
the *value* instead: React renders once with the previous value, then again with the new one at lower
priority.

```tsx
const [query, setQuery] = useState<string>("");
const deferredQuery: string = useDeferredValue(query);

return (
  <>
    <input value={query} onChange={(e) => setQuery(e.target.value)} />
    {/* Re-renders on every keystroke — cheap and must stay urgent */}
    <Results query={deferredQuery} />
    {/* Lags behind by design; wrap in memo so it skips the urgent render */}
  </>
);
```

`Results` must be wrapped in `memo` for this to help. Otherwise it re-renders on the urgent pass anyway
and the deferral buys nothing.

You can tell the user the content is stale rather than pretending it is not:

```tsx
const isStale: boolean = query !== deferredQuery;
<div style={{ opacity: isStale ? 0.6 : 1 }}><Results query={deferredQuery} /></div>
```

### Choosing between them

| Question                                   | `useTransition`             | `useDeferredValue`               |
| ------------------------------------------ | --------------------------- | --------------------------------- |
| Do you own the state update?               | ✅ Yes — you call `setState` | ❌ No — the value arrives as a prop |
| What do you mark                           | The update                  | The value                         |
| Pending flag                               | Built in — `isPending`      | Derive it by comparing the two values |
| Needs `memo` on the expensive child        | No                          | Yes, in practice                  |

The rule of thumb: **own the setter, use a transition; own only the value, defer it.**

### What a transition is not

A transition changes *what blocks*, never how long the work takes. Filtering ten thousand rows still
costs the same milliseconds — the difference is that the input now stays responsive while it happens.

It also does nothing for a slow network. If the screen is waiting on a request, the fix is caching,
prefetching, or a Suspense boundary. Marking the update non-urgent only means the user waits with a
responsive input instead of a frozen one.

## When to Use It

| Situation                                            | Reach for                            |
| ----------------------------------------------------- | ------------------------------------ |
| Typing in a box that filters a large list             | `useDeferredValue` on the query      |
| Switching to a tab that renders something expensive   | `useTransition` around the setter    |
| Client-side navigation between routes                 | `useTransition` — your router likely does this already |
| Content that does not exist yet                       | A Suspense boundary, not a transition |
| A slow API call                                        | Caching or prefetching; concurrency is not the tool |
| Sixty updates a second from a pointer or scroll       | A ref, and no render at all          |

## Common Mistakes

**❌ Deferring the input's own value:**

```tsx
<input value={deferredQuery} onChange={(e) => setQuery(e.target.value)} />
```

The character the user typed now lags behind the keyboard. The input must always be urgent; defer what
it *drives*, never what it shows.

**❌ Deferring without memoising.** `useDeferredValue` gives React permission to render the child twice.
If the child is not `memo`-wrapped, the urgent pass renders it anyway and you have added work rather
than removed it.

**❌ Using a transition to hide a slow request.** `isPending` will sit true for two seconds and the user
sees a dimmed screen with no explanation. A Suspense fallback or a skeleton communicates far more.

**❌ Reaching for concurrency before profiling.** The most common cause of a janky keystroke is not
priority — it is a component re-rendering that had no reason to, or a filter running on an unindexed
array. Fix the render first; a transition is for work that is genuinely expensive and genuinely needed.

## 🔑 Key Takeaways

- Concurrent rendering lets React pause, resume or discard work, but only for updates you mark as non-urgent.
- `useTransition` marks an update you trigger; `useDeferredValue` marks a value you were handed.
- The old screen stays visible during a transition, which is why it beats Suspense for content being replaced.
- `useDeferredValue` only pays off when the expensive child is wrapped in `memo`.
- A transition changes what blocks, not how long the work takes — it fixes jank, never latency.

## Interview Questions

**Q: What problem do transitions actually solve?**

Input responsiveness during expensive renders. Before concurrent rendering, one long render blocked the
main thread, so a keystroke that triggered a large re-render dropped frames and the input froze. Marking
that update as a transition lets React render it in the background, interrupting itself whenever
something urgent — such as the next keystroke — arrives.

**Q: `useTransition` or `useDeferredValue`?**

Whether you own the state update. If you call `setState`, wrap that call in `startTransition` and use the
`isPending` flag it gives you. If the value arrives from a parent or a store and you only consume it,
`useDeferredValue` is the version for consumers, and you derive the pending state by comparing the
deferred value with the current one.

**Q: Why must the expensive child be memoised for `useDeferredValue` to help?**

Deferring means React renders the tree twice — once urgently with the old value, once at low priority
with the new one. Without `memo`, the child re-renders during the urgent pass too, so you have paid for
the expensive render *and* added a second one. The memo comparison is what lets the urgent pass skip it.

**Q: The list still feels slow after adding a transition. What now?**

A transition never made anything faster, so the question is where the time goes. Profile the commit: it
is usually a component rendering that need not, an unstable prop defeating a memo, or a filter running
over an unindexed array on every keystroke. If the list is genuinely large, virtualisation removes the
work rather than rescheduling it — and if the wait is a request, this was a data problem all along.

## What to Read Next

- [Chapter ?? — Suspense and Streaming](#ch-suspense-and-streaming) — the tool for content that does not exist yet
- [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms) — transitions with pending state built in
- [Chapter ?? — Performance and the React Compiler](#ch-react-performance-and-the-compiler) — profiling before reaching for either
