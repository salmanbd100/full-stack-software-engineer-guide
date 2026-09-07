---
title: Signals and the Next Model
part: 3
chapter: 0
slug: signals-and-the-next-model
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [signals, runes, solid, jotai, derived-state, tc39]
in_book: true
---

# Signals and the Next Model {#ch-signals-and-the-next-model}

> Recognise the signal graph inside every store you already use, and know which of the four state problems it does not solve.

**In this chapter:** the three primitives · glitch-free propagation · what the stores in this section are secretly doing · the standardisation effort · what signals do not fix

## 💡 The Core Idea

Every state library in this section implements the same three things, under different names.

**A container** holding a value. **A read** that registers who is interested. **A write** that notifies
them.

Zustand calls the read a selector and asks you to write it by hand. Jotai calls the container an atom and
tracks reads automatically. Redux calls the read a selector and the write a dispatched action. Svelte 5
calls the container `$state`, Solid calls it a signal, Vue calls it a ref.

Signals are that abstraction promoted from an implementation detail to a **primitive** — with reads
tracked automatically, derived values that recompute themselves, and a dependency graph the runtime
maintains rather than you.

That is why the field is converging on them, and why the interesting question is not "are signals faster"
but **"what does having a real dependency graph let you stop writing?"**

## How It Works

### Three primitives, and that is all

| Primitive | Holds | Recomputes | Analogue you already use |
| --------- | ----- | ---------- | ------------------------ |
| **Signal** | A writable value | Never — you set it | `useState`, a store field, `$state` |
| **Computed** | A derived value | Lazily, when a dependency changed | `useMemo`, a selector, `$derived` |
| **Effect** | Nothing | Runs after its dependencies change | `useEffect`, `$effect` |

```typescript
// The shape, independent of any one library.
const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity()); // reads register dependencies

effect(() => console.log(total())); // logs 200

quantity.set(3); // logs 300 — nothing recomputed price, and nothing diffed a tree
```

The dependency edges are discovered by **running** the computation. Nothing is declared, so nothing can be
declared wrongly — which is the entire class of bug that dependency arrays exist to create.

### Glitch-free propagation is the part that is hard to hand-roll

Say `total` depends on `price` and `quantity`, and a display depends on `total` and `price`. Update both
inputs at once. A naive observer implementation notifies in write order, so the display may briefly see
the new `price` with a `total` computed from the old one.

That intermediate, impossible state is a **glitch**. Signal implementations avoid it by tracking the
graph and evaluating in dependency order, so no consumer ever observes a value derived from a mixture of
old and new.

This is the concrete reason to use a signal library rather than an event emitter and a `Set` of
callbacks. Hand-written stores produce glitches, and the resulting bugs look like race conditions.

### Laziness, and why derived values stop being a performance question

A computed value does not recompute when its dependency changes. It marks itself dirty, and recomputes
the next time somebody reads it — once, cached until the next change.

That flips the advice in [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) from a rule you
must follow into a default you get: deriving is cheap, so there is no incentive to store a derived value,
so the second-source-of-truth bug stops appearing.

### The standardisation attempt

There is a TC39 proposal to put signals into JavaScript itself. It is early — it defines the primitives
and the graph, deliberately leaving scheduling and effects to frameworks — and it may change
substantially or not ship at all.

The motivation is worth understanding even if it never lands: **interoperability**. Today a signal from
one library cannot be observed by another framework's renderer, so a shared component library has to pick
a reactivity system. A standard primitive would let a design system, a data layer and three applications
on three frameworks share one graph.

> ⚠️ **Moving target:** the TC39 signals proposal is at an early stage and its API is not stable. Do not
> build on the proposed shape directly; use your framework's primitives. The durable idea is the graph —
> container, tracked read, notified write, lazy derivation — which every implementation shares and which
> is what actually transfers between them.

### What signals do not solve

This is the part that separates a senior answer from an enthusiastic one. Signals are a **client state**
primitive. Return to the four categories and they cover exactly one of them:

| Category | Do signals help? |
| -------- | ---------------- |
| **Client state** | Yes — this is what they are |
| **Form state** | Marginally. The hard parts are validation timing and submission, not propagation |
| **URL state** | No. The URL is the container; a signal can mirror it, not replace it |
| **Server state** | **No.** No staleness policy, no deduplication, no retries, no invalidation |

A signal holding fetched data is the same mistake as a Redux slice holding fetched data, in newer
syntax. The library that solves that problem is a query cache, and it exists in every signal ecosystem
for exactly this reason.

### Why React went the other way

React did not adopt signals; it shipped a compiler that inserts memoisation instead. The reason is
architectural: React's rendering model depends on being able to abandon and replay a render, and a
fine-grained subscription that has already written to the DOM cannot be replayed.
[Chapter ?? — Reactivity Compared](#ch-reactivity-compared) makes the full argument.

The practical consequence is that a React codebase gets the *ergonomics* — derive instead of store, no
manual dependency lists — without the propagation model, and that is most of what a state author wanted.

## When to Use It

| Situation | Guidance |
| --------- | -------- |
| Working in Svelte, Solid, Vue or Angular | Use the framework's signals. They are the idiomatic state layer |
| Working in React | Jotai is the closest thing; otherwise let the compiler handle derivation |
| Sharing state across frameworks today | A framework-agnostic store with subscribers, not signals |
| Caching fetched data | A query cache, in every ecosystem — see [Chapter ?? — Server State with TanStack Query](#ch-server-state) |
| Building on the TC39 proposal | Not yet |

## Common Mistakes

**❌ Using an effect to copy one signal into another.**
✅ That is a derived value written the slow way — an extra render pass, and a window where the two
disagree. Use a computed. This is the same error as
[Chapter ?? — useEffect and When Not to Use It](#ch-when-not-to-use-effect), in a different runtime.

**❌ Putting fetched data in a signal and calling it state management.**
✅ There is still no staleness policy, no deduplication and no invalidation. It is a cache with none of
the behaviour of one.

**❌ Deep chains of computed values.**
✅ Each layer is a cache to invalidate and a place for a cycle to hide. Two or three levels is usually
plenty; deeper graphs get hard to reason about at exactly the moment they misbehave.

**❌ Writing to a signal from inside an effect that reads it.**
✅ A cycle. Some libraries detect it, some loop. Effects are for reaching outside the graph — the DOM, the
network, storage — not for updating it.

**❌ Choosing a framework on its reactivity benchmark.**
✅ The graph is not the bottleneck in a real application. Data fetching, bundle size and render count are.

## 🔑 Key Takeaways

- Signal, computed and effect are the three primitives, and every store in this section is a partial implementation of them.
- Dependencies are discovered by running the computation, which removes the entire dependency-array class of bug.
- Glitch-free propagation — never observing a half-updated graph — is the hard part that hand-rolled stores get wrong.
- Computed values are lazy and cached, so deriving instead of storing stops being a tradeoff.
- Signals solve client state only; server state still needs a cache with staleness and invalidation.

## Interview Questions

**Q: What is a signal, in terms of things a React developer already uses?**

A `useState` whose reads are tracked, plus a `useMemo` that knows its own dependencies and recomputes
lazily, plus a `useEffect` with no dependency array to get wrong. The difference is that the runtime
builds the dependency graph by observing reads, rather than trusting a list you wrote by hand.

**Q: What is a glitch, and why does it matter?**

It is a consumer observing a value derived from a mix of old and new inputs — possible whenever two
dependencies update and the notification order is not the dependency order. Signal implementations
evaluate in topological order so it cannot happen. A store built from an event emitter and a callback
list generally can, and the resulting bugs look like race conditions.

**Q: Do signals replace TanStack Query?**

No. A signal propagates a change; it has no opinion about staleness, deduplication, retries,
invalidation, or refetching on focus. Data fetched from a server needs all of those regardless of what
holds the value, which is why every signal-based ecosystem has a query library of its own.

**Q: Why hasn't React adopted signals?**

Because React's concurrency model relies on being able to start a render, abandon it, and replay it. That
requires rendering to be a pure function of state with no side effects committed along the way, and
fine-grained subscriptions that write directly to the DOM are the opposite of that. React shipped a
compiler to recover the ergonomics instead of changing the model.

## What to Read Next

- [Chapter ?? — Reactivity Compared](#ch-reactivity-compared) — the same three models judged as rendering strategies
- [Chapter ?? — Svelte 5 and the Runes Model](#ch-svelte-runes) — signals as a framework's primary API
- [Chapter ?? — Client State](#ch-client-state) — the one category this chapter's primitives actually cover
