---
title: Performance, Transitions and the Compiler
part: 3
chapter: 9
slug: react-performance-and-the-compiler
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-24
tags: [react, performance, react-compiler, memo, useTransition, useDeferredValue, concurrency, profiling]
in_book: true
---

# Performance, Transitions and the Compiler {#ch-react-performance-and-the-compiler}

> Diagnose a slow React screen, then pull the right lever: do less work, or schedule the work you cannot avoid.

**In this chapter:** what a re-render costs · the compiler and what it memoises · transitions and deferred values · what neither lever fixes · profiling first

## 💡 The Core Idea

"React is slow" is never one problem. Two causes sit outside React: too much JavaScript arriving, and
requests that wait on each other. Inside React, you have two levers, and they do different things.

| Lever                   | What it does                                     | The tools                                  |
| ----------------------- | ------------------------------------------------ | ------------------------------------------ |
| **Do less work**        | Skip renders whose output would not change        | Memoisation — now written by the compiler   |
| **Schedule the work**   | Let urgent updates interrupt expensive ones       | `useTransition`, `useDeferredValue`         |

Doing less makes renders cheaper. Scheduling makes nothing cheaper; it changes *what blocks*. A senior
engineer can tell which lever a slowdown needs before touching either.

> ⚠️ **Moving target:** the React Compiler shipped as 1.0 alongside React 19, and its defaults,
> directives and lint packaging are still settling. The durable principle is that memoisation is a
> cache, a cache needs stable identity to work, and a cache you have not measured is a cost. Who writes
> the cache — you or the compiler — is an implementation detail.

## How It Works

### What a re-render costs

A re-render has three phases: render calls the component, reconcile diffs the new tree against the old
one, and commit applies the differences to the DOM. A component that re-renders with the same output
still pays for the first two. That is usually cheap. It gets expensive when hundreds of components do it
on every keystroke, or when one of them sorts ten thousand rows on the way through.

### Lever one: do less, with the compiler

The compiler reads your components at build time. It inserts a cache around every value that could be
reused: the returned JSX, created objects and callbacks, and derived results. The effect matches wrapping
every component in `memo` and every derived value in `useMemo`, with none of it in your source.

**Before the compiler, this child re-rendered on every click:**

```tsx
function Parent({ name }: { name: string }) {
  const [count, setCount] = useState<number>(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <ExpensiveChild name={name} /> {/* re-rendered on every click */}
    </>
  );
}
```

**With the compiler on, the source stays the same and the child stops re-rendering.** The compiler sees
that `name` has not changed. It reuses the element it made last time instead of calling `ExpensiveChild`.

Two directives control it per component. `"use memo"` opts a component or hook in, for adoption file by
file. `"use no memo"` skips one, as a temporary way to isolate a suspected compiler bug.

The compiler only memoises what it can prove safe. Its proof is the Rules of React: components are pure,
props and state are not mutated, and hooks run unconditionally. Break one, and the compiler **skips that
component silently**. Everything else still gets optimised; that component gets no speed-up and no error.

> ⚠️ A component that mutates a prop, or reads a `ref` during render, will pass tests, ship, and quietly
> get none of the compiler's benefit. `eslint-plugin-react-hooks` reports these bail-outs, and it works
> before you adopt the compiler. Turn it on first.

### Lever two: schedule the work, with transitions

Rendering used to be one block that could not be interrupted. Concurrent rendering lets React start,
pause for an event, then resume or throw the work away. Nothing uses this automatically. **You mark which
updates may wait**, and unmarked updates stay urgent. `useTransition` marks an update you trigger.

**A tab switch that keeps the button responsive:**

```tsx
const [isPending, startTransition] = useTransition();
const [tab, setTab] = useState<TabId>("about");

function selectTab(next: TabId): void {
  startTransition(() => {
    setTab(next); // Non-urgent: the old tab stays on screen until the new one is ready
  });
}
```

The button responds at once, the old tab stays visible, and `isPending` lets you dim it. React 19 also
accepts an async function here, which is what Actions are built on.

`useDeferredValue` marks a value you were handed. Use it when you do not own the `setState`. React renders
once with the old value, then again with the new one at lower priority.

**A search box whose results lag behind by design:**

```tsx
const [query, setQuery] = useState<string>("");
const deferredQuery: string = useDeferredValue(query);
const isStale: boolean = query !== deferredQuery;

return (
  <>
    <input value={query} onChange={(e) => setQuery(e.target.value)} />
    {/* Results must be memoised, or it re-renders on the urgent pass anyway */}
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <Results query={deferredQuery} />
    </div>
  </>
);
```

Here the levers meet: deferral only helps if `Results` is memoised, by hand or by the compiler.

| Question                          | `useTransition`              | `useDeferredValue`                    |
| --------------------------------- | ---------------------------- | ------------------------------------- |
| Do you own the state update?      | ✅ Yes — you call `setState`  | ❌ No — the value arrives as a prop    |
| What do you mark?                 | The update                   | The value                             |
| Pending flag                      | Built in — `isPending`       | Derive it by comparing the two values |

The rule of thumb: **own the setter, use a transition; own only the value, defer it.**

### What neither lever fixes

| Symptom                                    | Why memoisation and scheduling do not help                        |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Four seconds before the page is interactive | The JavaScript still has to download and parse                    |
| Each request waits for the one before it    | A waterfall is a network problem, not a render problem            |
| One render takes 300 ms                     | The first render is never cached; a transition only moves it      |
| Scrolling 5,000 rows stutters               | The work is real; the fix is not doing it (virtualisation)        |

The first two dominate real applications. Fix them first: split the bundle, parallelise requests.

### Profiling, before any of it

Profile the interaction that feels slow, not the page. The **React DevTools Profiler** records it as a
flamegraph. Each bar names the component, its render time, and *why it rendered*: props, state, or the
parent. The **browser performance panel** shows the time after commit. If React's commit takes 4 ms and
the frame takes 200 ms, the problem is layout, paint, or a long task outside React. Confirm every win
in a production build: a 40 ms render in development may be 4 ms in production.

## When to Use It

| Symptom                                             | Reach for                                            |
| --------------------------------------------------- | ---------------------------------------------------- |
| Slow first paint, large JavaScript payload           | Move it server-side; dynamic import the rest          |
| A spinner chain — one request, then the next         | Start the requests in parallel; stream with Suspense  |
| Hundreds of components re-render on every keystroke  | The compiler — this is exactly its job                |
| One component re-renders the whole page              | Move the state down, or split the context             |
| Typing lags while a big list filters                 | `useDeferredValue` on the query, then virtualisation  |
| Switching to a tab that renders something expensive  | `useTransition` around the setter                     |
| Content that does not exist yet                      | A Suspense boundary, not a transition                 |

## Common Mistakes

**❌ Wrapping everything in `memo` "to be safe".** Every `memo` adds a props comparison on each render and
keeps the old props in memory. Applied everywhere, it costs something and buys nothing. With the compiler
on, it is also redundant.

**❌ Deferring the input's own value:**

```tsx
<input value={deferredQuery} onChange={(e) => setQuery(e.target.value)} />;
```

The typed character now lags behind the keyboard. The input must always stay urgent. Defer what it
*drives*, never what it shows.

**❌ Using a transition to hide a slow request.** `isPending` stays true for two seconds, and the user sees
a dimmed screen with no explanation. A Suspense fallback or a skeleton says far more.

**❌ Defining a component inside another component:**

```tsx
function Page() {
  function Row({ item }: { item: Item }) { /* new function identity every render */ }
  return <List renderRow={Row} />;
}
```

React sees a new component type on every render, so it unmounts and remounts the subtree. State and DOM
are thrown away. No memoisation can rescue it. Move `Row` to module level.

## 🔑 Key Takeaways

- A slow React screen needs one of two levers: do less work with memoisation, or schedule it with transitions.
- The React Compiler automates memoisation, but it silently skips any component that breaks the Rules of React.
- `useTransition` marks an update you trigger; `useDeferredValue` marks a value you were handed.
- Neither lever touches bundle size or network waterfalls, which cause most real slowness.
- Profile the specific interaction, confirm in a production build, and fix the cause rather than caching over it.

## Interview Questions

**Q: What does the React Compiler do, and what do you stop writing because of it?**

It analyses components at build time and caches what they produce — returned JSX, objects, callbacks and
derived values. That covers what `memo`, `useMemo` and `useCallback` did by hand, so most of them leave
application code. It does nothing for bundle size, waterfalls, or the cost of one expensive render.

**Q: You enable the compiler and one component still re-renders constantly. Where do you look?**

First, check whether it was compiled at all. The compiler skips any component that breaks the Rules of
React, and it does so silently; `eslint-plugin-react-hooks` reports those cases. If it was compiled, look
for a value entering from outside React with a fresh identity each time.

**Q: `useTransition` or `useDeferredValue`?**

It depends on whether you own the state update. If you call `setState`, wrap it in `startTransition` and
use `isPending`. If the value comes from a parent or a store, defer it and derive the pending state by
comparing the two values. Either way, the expensive child must be memoised, or the urgent pass renders it
anyway.

**Q: The list still feels slow after adding a transition. What now?**

A transition never made anything faster, so find where the time goes. Profile the commit. It is usually a
needless render, an unstable prop defeating a memo, or a filter over a large array on every keystroke. A
genuinely large list needs virtualisation. If the wait is a request, it was a data problem all along.

**Q: A page takes four seconds to become interactive. Where do you start?**

Not with memoisation or transitions. Four seconds is almost always payload and waterfalls. Look at the
bundle composition and the network waterfall first. Render work matters for jank during interaction,
which is a different symptom with a different measurement.

**Q: When would you still write `useMemo` by hand?**

When the value is not part of a render — a stable object handed to a non-React library, or an expensive
result that feeds an effect. Also in a component the compiler cannot compile and you cannot fix yet. Both
deserve a comment saying why, because the default answer is now "you do not".

## What to Read Next

- [Chapter ?? — Suspense, Streaming and Error Boundaries](#ch-suspense-and-streaming) — the tool for content that does not exist yet
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — the largest bundle lever there is
- [Chapter ?? — Loading, Code Splitting and Bundle Budgets](#ch-loading-and-code-splitting) — code splitting and what to measure
