---
title: Performance and the React Compiler
part: 3
chapter: 0
slug: react-performance-and-the-compiler
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-06
tags: [react, performance, react-compiler, memo, profiling]
in_book: true
---

# Performance and the React Compiler {#ch-react-performance-and-the-compiler}

> Find out which of the three React performance problems you actually have, and stop hand-writing the one the compiler now solves.

**In this chapter:** the three separate problems · what the compiler memoises · what it cannot touch · profiling before changing anything · where `memo` still earns its place

## 💡 The Core Idea

"React is slow" is never one problem. It is three, and they have nothing to do with each other:

| Problem                     | The question                                | The fix lives in       |
| --------------------------- | ------------------------------------------- | ---------------------- |
| **How much arrives**        | How many kilobytes of JavaScript must parse before anything works? | The bundle and the server/client boundary |
| **How often it renders**    | How many components re-render when one value changes? | State placement and memoisation |
| **How long one render takes** | How much work happens inside a single render pass? | The algorithm, or not rendering it at all |

The React Compiler solves the middle one — automatically, and more thoroughly than hand-written
`memo` ever did. It does nothing whatsoever for the other two. Most applications that feel slow have a
bundle problem or a waterfall problem, and reach for `useMemo` anyway.

> ⚠️ **Moving target:** the React Compiler shipped as 1.0 alongside React 19, and its defaults,
> directives and lint packaging are still settling. The durable principle is that memoisation is a
> cache, a cache needs stable identity to work, and a cache you have not measured is a cost. Who writes
> the cache — you or the compiler — is an implementation detail.

## How It Works

### What a re-render actually costs

A re-render is three phases, and only the third touches the DOM.

```text
Render: call the component, produce an element tree
    ↓
Reconcile: diff it against the previous tree
    ↓
Commit: apply the differences to the DOM
```

**The three phases of a React update.**

A component that re-renders and produces the same output still pays for render and reconcile. That is
usually cheap — a function call and a shallow comparison. It becomes expensive when it happens to
hundreds of components sixty times a second, or when one of those components sorts ten thousand rows on
the way through.

### What the compiler does

The compiler reads your components at build time and inserts a cache around every value that could be
reused: the JSX it returns, the objects and callbacks it creates, the results of computations. The
effect is the equivalent of wrapping every component in `memo` and every derived value in `useMemo`,
without any of it appearing in your source.

**Before the compiler, this child re-rendered on every parent render:**

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

**With the compiler enabled, nothing changes in the source and the child stops re-rendering.** The
compiler sees that `name` has not changed, so it reuses the previously created element rather than
calling `ExpensiveChild` again.

Two directives control it per component when you need them:

| Directive       | Effect                                            | When you reach for it                        |
| --------------- | ------------------------------------------------- | -------------------------------------------- |
| `"use memo"`    | Opt this component or hook into compilation       | Incremental adoption, file by file            |
| `"use no memo"` | Skip this one                                     | Isolating a suspected compiler bug — temporary |

### The condition attached to all of it

The compiler only memoises what it can prove is safe, and its proof is the Rules of React: components
are pure, props and state are not mutated, hooks are called unconditionally. Break one and the compiler
**bails out of that component silently** — it keeps optimising everything else, and you get no speed-up
and no error.

`eslint-plugin-react-hooks` surfaces those bail-outs as lint diagnostics, and it works before you adopt
the compiler at all. Turning it on is the cheapest first step: it tells you how much of the codebase is
compilable today.

> ⚠️ A component that mutates a prop, or reads a `ref` during render, will pass tests, ship, and quietly
> get none of the compiler's benefit. The lint rule is the only thing that tells you.

### What the compiler cannot fix

| Symptom                                        | Why memoisation does not help                                    |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| Four seconds before the page is interactive     | The JavaScript still has to download and parse                    |
| Each request waits for the one before it        | A waterfall is a scheduling problem, not a render problem         |
| One render takes 300 ms                          | The first render is never cached — caching only helps the repeats |
| Scrolling a list of 5,000 rows stutters         | The work is real; the fix is not doing it (virtualisation)        |
| A layout thrash on every keystroke              | That cost is in the browser, after commit                         |

The first two are the ones that dominate real applications. Import directly rather than through barrel
files, load heavy widgets with a dynamic import, start independent requests together instead of
`await`-ing them in sequence, and move work across the server/client boundary. All of that outranks
anything in this section.

### Profiling, before any of it

Two tools, and both need a development build — the profiling instrumentation is stripped from
production.

- **React DevTools Profiler** — record an interaction, then read the flamegraph. Each bar names the
  component, its render duration, and *why it rendered*: props changed, state changed, or the parent
  did. That last one is the answer to "why is this re-rendering" in most cases.
- **The browser performance panel** — where the time between commit and pixels goes. If React's commit
  is 4 ms and the frame took 200 ms, the problem is layout, paint, or a long task that is not React's.

Profile the interaction that feels slow, not the page. "The app is slow" is not a measurement.

## When to Use It

| Symptom                                          | Reach for                                          |
| ------------------------------------------------ | -------------------------------------------------- |
| Slow first paint, large JavaScript payload        | Move it server-side; dynamic import the rest        |
| A spinner chain — one request, then the next      | Start the requests in parallel; stream with Suspense |
| Typing lags while a big list filters              | `useDeferredValue`, then virtualisation             |
| One component re-renders the whole page           | Move the state down, or split the context           |
| Hundreds of components re-render on every keystroke | The compiler — this is exactly its job              |
| A value that is expensive and not rendered        | `useMemo` still, or a ref — the compiler caches renders |
| A list that renders 5,000 rows                    | Virtualise it; no cache makes 5,000 rows free       |

## Common Mistakes

**❌ Wrapping everything in `memo` "to be safe".** Every `memo` adds a props comparison on every render
and pins the previous props in memory. Applied everywhere, it is a measurable cost buying nothing. With
the compiler enabled, it is also redundant — the compiler already did it, better.

**❌ Measuring in a development build.** Development React does extra validation, double-invokes
components under Strict Mode, and carries the profiler's own overhead. A component that renders in 40 ms
in development may render in 4 ms in production. Confirm the win in a production build.

> The sequence that works: profile, find the component, find *why* it rendered, fix the cause. The
> cause is usually state living too high in the tree, and moving it down deletes the problem instead of
> caching around it.

**❌ Defining a component inside another component:**

```tsx
function Page() {
  function Row({ item }: { item: Item }) { /* new function identity every render */ }
  return <List renderRow={Row} />;
}
```

React sees a different component type on every render, so it unmounts and remounts the subtree —
throwing away its state and its DOM. No memoisation can rescue it, and the compiler cannot optimise it.
Move `Row` to the module level.

**❌ Optimising renders when the problem is the bundle.** Shaving 3 ms off a render on a page that ships
900 KB of JavaScript is measurable work with no user-visible result. Fix the biggest number first.

## 🔑 Key Takeaways

- React performance is three unrelated problems: bundle size, render frequency, and render cost.
- The React Compiler automates memoisation and makes hand-written `memo` and `useMemo` largely obsolete.
- The compiler silently skips any component that breaks the Rules of React — the ESLint plugin is how you find out.
- Memoisation never makes the first render faster; it only makes repeats cheaper.
- Profile the specific interaction, in a production build, and fix the cause rather than caching over it.

## Interview Questions

**Q: What does the React Compiler actually do, and what do you stop writing because of it?**

It analyses components at build time and inserts caching around the values they produce — returned JSX,
created objects, callbacks, derived computations. That covers what `memo`, `useMemo` and `useCallback`
were written by hand to do, so those largely disappear from application code. It changes nothing about
bundle size, network waterfalls, or the cost of a single expensive render.

**Q: You enable the compiler and one component is still re-rendering constantly. Where do you look?**

At whether the compiler compiled it at all. It bails out of any component that breaks the Rules of React
— mutating props or state, reading a ref during render, conditional hooks — and the bail-out is silent.
`eslint-plugin-react-hooks` reports those diagnostics. If the component is compiled, the next suspect is
a value entering it from outside React with a fresh identity each time.

**Q: A page takes four seconds to become interactive. Where do you start?**

Not with memoisation. Four seconds is almost always payload and waterfalls: how much JavaScript has to
arrive and parse, and whether the requests behind the first paint run in parallel. Look at the bundle
composition and the network waterfall first. Re-render optimisation matters for jank during interaction,
which is a different symptom with a different measurement.

**Q: When would you still write `useMemo` by hand?**

When the memoised value is not part of a render — a stable object handed to a non-React library, an
expensive computation whose result feeds an effect — or in a component the compiler cannot compile and
you are not able to fix yet. Both are exceptions worth a comment explaining why the hand-written version
is there, because the default answer is now "you do not".

## What to Read Next

- [Chapter ?? — Transitions and Concurrency](#ch-transitions-and-concurrency) — scheduling work you cannot make cheaper
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — the largest bundle lever there is
- [Chapter ?? — Bundle Optimisation](#ch-bundle-optimisation) — code splitting and what to measure
