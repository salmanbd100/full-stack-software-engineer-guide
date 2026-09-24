---
title: Client State and Signals
part: 3
chapter: 32
slug: client-state
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-24
tags: [zustand, jotai, context, useState, redux, client-state, signals, runes, solid, derived-state, tc39, state-machines]
in_book: true
---

# Client State and Signals {#ch-client-state}

> Move state up the ladder only when something forces you to, and recognise the signal graph inside every store you use.

**In this chapter:** the four rungs · why Context re-renders everything · Zustand, Jotai and Redux · signals as the shared primitive · what signals do not fix

## 💡 The Core Idea

Once server and form state have their own libraries, little is left: a theme, an open panel, a row.

For that residue, the question is never "which library". It is **how far does this value need to
travel?** The answer puts it on one of four rungs. Every rung above the first costs re-renders,
indirection, or both. Start at the bottom, and climb only when a real requirement forces you.

Underneath, every store does the same three things. It holds a value, tracks who reads it, and
notifies them on a write. Signals make that pattern a primitive.

## How It Works

### The four rungs

| Rung | Reach | Cost | Use when |
| ---- | ----- | ---- | -------- |
| **`useState`** | One component | None | The value is used where it is declared |
| **Lift to a parent** | A subtree | Prop drilling | Two siblings need it, and the parent is close |
| **Context** | A subtree, without drilling | Every consumer re-renders | The value changes rarely |
| **A store** | Anywhere | A dependency, and state outside React | Frequent updates, or truly global reach |

Most values never leave rung one. The interview signal is saying why a value sits on its rung.

### Context is delivery, not storage

Context solves prop drilling. It *delivers* a value to a subtree. It has no subscription model. So
when the provider's value changes identity, **every consumer re-renders**, even if it reads nothing
that changed.

The rule: **split contexts by how often they change, not by what they are about.** A user that
changes on login and a sidebar flag that changes on every click belong in separate providers. Context
suits a theme, a locale, or a handle to a client. It does not suit a value that changes often.

### Zustand: one store, selector subscriptions

Zustand keeps state outside React. Each component subscribes to one slice. A component that selects
`sidebarOpen` does not re-render when another field changes. Context cannot do that.

**A typed Zustand store:**

```typescript
import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

// The curried create<T>()(...) form exists to make TypeScript infer the store correctly.
export const useUiStore = create<UiStore>()((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// Subscribe to one field. This component ignores every other change.
const open = useUiStore((s) => s.sidebarOpen);
```

> ⚠️ **Zustand 5 requires stable selector output.** A selector that returns a new object each call —
> `(s) => ({ a: s.a, b: s.b })` — causes repeated re-renders and can throw "maximum update depth
> exceeded". Select one value per call, or wrap the selector in `useShallow` from
> `zustand/react/shallow`.

### Jotai and Redux Toolkit

Jotai works the other way round. You declare small atoms and compose them. Derived atoms recompute
from their dependencies. A component re-renders only for the atoms it reads.

**Derived state as a Jotai atom:**

```typescript
import { atom, useAtomValue } from 'jotai';

const filterAtom = atom<string>('');
const itemsAtom = atom<Item[]>([]);

// Recomputed when either dependency changes, and cached until then.
const visibleItemsAtom = atom((get) =>
  get(itemsAtom).filter((item) => item.name.includes(get(filterAtom))),
);

const visible = useAtomValue(visibleItemsAtom);
```

Atoms suit fragmented, heavily derived state: an editor, a canvas, a filter panel. They suit a small
shared store less well, because the shape of the whole is spread across files.

Redux Toolkit is no longer the default. It still wins in three cases: a large team that needs one
enforced convention, time-travel debugging by replaying the action log, and a real middleware
pipeline. Without those, the boilerplate is a cost with no matching benefit.

### Signals: the primitive under every store

Zustand calls the tracked read a selector, and you write it by hand. Jotai calls the container an
atom and tracks reads for you. Svelte 5 calls it `$state`, Solid a signal, Vue a ref. Signals make
the pattern explicit, with three primitives.

| Primitive | Holds | Recomputes | Analogue you already use |
| --------- | ----- | ---------- | ------------------------ |
| **Signal** | A writable value | Never — you set it | `useState`, a store field, `$state` |
| **Computed** | A derived value | Lazily, after a dependency changed | `useMemo`, a selector, `$derived` |
| **Effect** | Nothing | After its dependencies change | `useEffect`, `$effect` |

**The shape, independent of any one library:**

```typescript
const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity()); // reading registers a dependency

effect(() => renderTotal(total())); // renders 200

quantity.set(3); // renders 300 — price was not recomputed, and no tree was diffed
```

The runtime finds dependencies by **running** the computation. Nothing is declared, so nothing is
declared wrongly.

Two properties make a signal library worth more than an event emitter and a `Set` of callbacks:

- **Glitch-free propagation.** Update `price` and `quantity` together, and a naive emitter can show
  new `price` with an old `total`. Signals evaluate in dependency order, so no one sees that
  half-updated state. Hand-rolled stores get this wrong, and the bugs look like race conditions.
- **Lazy, cached derivation.** A computed marks itself dirty and recomputes on the next read, once.
  Deriving becomes cheap, so nobody is tempted to store a derived value as a second source of truth.

> ⚠️ **Moving target:** a TC39 proposal would add signals to JavaScript itself. It is early, its API
> is not stable, and it may never ship. Use your framework's primitives, not the proposed shape. The
> durable idea is the graph — container, tracked read, notified write, lazy derivation — and that
> transfers between every implementation.

React did not adopt signals. Concurrent rendering must abandon and replay renders, and a subscription
that has already written to the DOM cannot be replayed. React shipped a memoising compiler instead.

### What signals do not solve

Signals are a **client state** primitive. They cover one of the four kinds of state.

| Kind | Do signals help? |
| ---- | ---------------- |
| **Client state** | Yes — this is what they are |
| **Form state** | Marginally. The hard parts are validation timing and submission |
| **URL state** | No. The URL is the container; a signal can only mirror it |
| **Server state** | **No.** No staleness policy, no deduplication, no retries, no invalidation |

### A multi-step flow is one state, not five booleans

A wizard with `isLoading`, `isError`, `isSubmitting` and `isSuccess` has sixteen combinations. Only
four are real, but the others are reachable. Store one status as a discriminated union instead:

**One status, so impossible combinations cannot exist:**

```typescript
type Checkout =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'invalid'; message: string } // message exists only here
  | { status: 'success'; orderId: string };
```

A reducer that switches on the current status ignores events that make no sense. A second `SUBMIT`
after `success` then does nothing, with no guard clause to remember.

## When to Use It

| Situation | Choice |
| --------- | ------ |
| A value two sibling components share | Lift to the nearest parent |
| Theme, locale, a client instance | Context |
| An editor with dozens of derived values | Atoms, or your framework's signals |
| A large team wanting one enforced pattern | Redux Toolkit |
| Svelte, Solid or Vue | The framework's signals — they are the idiomatic state layer |
| A checkout or onboarding flow | One discriminated-union status |
| Anything fetched from an API | None of these — see [Chapter ?? — Server State with TanStack Query](#ch-server-state) |

## Common Mistakes

**❌ Storing derived values.**
✅ Derive them. A stored total is a second source of truth that will disagree with the first.

**❌ Using an effect to copy one signal into another.**
✅ That is a derived value written the slow way, with a window where the two disagree. Use a computed.
It is the same error as [Chapter ?? — useEffect and When Not to Use It](#ch-when-not-to-use-effect).

## 🔑 Key Takeaways

- Client state is what is left after server, form and URL state — usually small, and usually local.
- Context delivers values but has no subscriptions, so every consumer re-renders on every change.
- Zustand subscribes per selector, Jotai per atom, and Redux earns its place for convention at scale.
- Every store is a partial signal graph: a container, a tracked read, and a write that notifies.
- Signals solve client state only; server data still needs a cache with staleness and invalidation.

## Interview Questions

**Q: When would you use Context instead of a state library?**

For values that are read widely and change rarely — a theme, a locale, a handle to a client. Context
has no subscriptions, so every consumer re-renders when the provider value changes identity. That is
free when it changes on login, and expensive when it changes on every keystroke.

**Q: What is a signal, in terms a React developer already uses?**

A `useState` whose reads are tracked, a `useMemo` that knows its own dependencies, and a `useEffect`
with no dependency array to get wrong. The runtime builds the graph by watching reads, rather than
trusting a list you wrote.

**Q: What is a glitch, and why does it matter?**

A consumer sees a value derived from a mix of old and new inputs. It happens when two dependencies
update and notification order is not dependency order. Signal libraries evaluate in dependency order,
so it cannot happen. A store built from an emitter and a callback list usually can.

**Q: Do signals replace TanStack Query?**

No. A signal propagates a change. It has no view on staleness, deduplication, retries, invalidation
or refetch on focus. Server data needs all of those whatever holds the value. That is why every
signal ecosystem has its own query library.

**Q: Your team wants to move all client state into Redux. Would you?**

Probably not. Fetched data belongs in a query cache, and most values belong in `useState`. Redux
is right when the team needs one convention, action replay or a middleware pipeline. Without those,
it is boilerplate with no matching benefit.

## What to Read Next

- [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) — the classification this chapter assumes
- [Chapter ?? — The Runes Model, Components and Snippets](#ch-svelte-runes) — signals as a framework's primary API
- [Chapter ?? — Performance, Transitions and the Compiler](#ch-react-performance-and-the-compiler) — the re-render costs this chapter keeps naming
