---
title: Client State
part: 3
chapter: 0
slug: client-state
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [zustand, jotai, context, useState, redux, client-state]
in_book: true
---

# Client State {#ch-client-state}

> Move state up the ladder only when something forces you to, and know what each rung costs.

**In this chapter:** the four rungs · why Context re-renders everything · Zustand and selector subscriptions · Jotai and bottom-up atoms · where Redux still wins · persisting client state

## 💡 The Core Idea

Once server state has a cache and form state has a form library, what is left is smaller than people
expect: a theme, an open panel, a wizard step, a selected row, a draft that is not in a form.

For that residue the question is never "which library". It is **how far does this value need to travel?**
The answer puts it on one of four rungs, and every rung above the first is paid for in re-renders,
indirection, or both.

Start at the bottom. Climb only when a specific requirement forces it.

## How It Works

### The four rungs

| Rung | Reach | Cost | Use when |
| ---- | ----- | ---- | -------- |
| **`useState`** | One component | None | The value is used where it is declared |
| **Lift to a parent** | A subtree | Prop drilling | Two siblings need it, and the parent is close |
| **Context** | A subtree, without drilling | Every consumer re-renders | The value is stable, or changes rarely |
| **A store** | Anywhere | A dependency, and state outside React | Frequent updates, or genuinely global reach |

Most values never leave rung one. The interview signal is being able to say why a value is on the rung it
is on, not which library is on rung four.

### Context is delivery, not storage

React Context solves prop drilling. It is a way of *delivering* a value to a subtree without passing it
through every layer. It has no subscription model, so when the provider's value changes identity, **every
consumer re-renders**, whether or not it reads the part that changed.

**❌ One context holding everything:**

```typescript
// Any change to any field re-renders every consumer of this context.
const AppContext = createContext<{
  theme: Theme;
  user: User;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
} | null>(null);
```

**✅ Split by change rate:**

```typescript
// Changes on login. Read everywhere, re-rendered almost never.
const UserContext = createContext<User | null>(null);

// Changes on every toggle. Consumed by two components.
const SidebarContext = createContext<SidebarApi | null>(null);
```

The rule: **split contexts by how often they change, not by what they are about.** A value that changes
on every keystroke and a value that changes on login do not belong in the same provider.

Context is the right tool for a theme, a locale, a configuration object, a translation function, or a
handle to something else — a query client, a store. It is the wrong tool for a value that changes
frequently and is read widely.

### Zustand: one store, selector subscriptions

Zustand keeps state outside React and lets each component subscribe to a slice of it. A component that
selects `count` does not re-render when `text` changes, which is the thing Context cannot do.

```typescript
import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  activePanel: string | null;
  toggleSidebar: () => void;
  setPanel: (panel: string | null) => void;
}

// The curried create<T>()(...) form exists to make TypeScript infer the store correctly.
export const useUiStore = create<UiStore>()((set) => ({
  sidebarOpen: false,
  activePanel: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPanel: (activePanel) => set({ activePanel }),
}));

// Subscribe to one field. This component ignores every other change.
const open = useUiStore((s) => s.sidebarOpen);
```

> ⚠️ **Zustand 5 requires stable selector output.** A selector returning a new object or array on every
> call — `(s) => ({ a: s.a, b: s.b })` — now causes repeated re-renders and can throw "maximum update
> depth exceeded". Select one value per call, or wrap the selector in `useShallow` from
> `zustand/react/shallow`. This is the single most common upgrade break from version 4.

Actions are stable references, so selecting them separately from values is safe and cheap.

### Jotai: state assembled from atoms

Jotai inverts the direction. Instead of one store you split into slices, you declare small atoms and
compose them. Derived atoms recompute from their dependencies, and a component re-renders only for the
atoms it actually reads.

```typescript
import { atom, useAtom, useAtomValue } from 'jotai';

const filterAtom = atom<string>('');
const itemsAtom = atom<Item[]>([]);

// Derived — recomputed when either dependency changes, and cached until then.
const visibleItemsAtom = atom((get) =>
  get(itemsAtom).filter((item) => item.name.includes(get(filterAtom))),
);

const visible = useAtomValue(visibleItemsAtom);
```

The tradeoff is real in both directions. Bottom-up composition suits state that is fragmented and heavily
derived — an editor, a canvas, a filter panel. It suits a small shared store less well, because atoms are
declared in many files and the shape of the whole is harder to see at a glance.

### Where Redux Toolkit still wins

Redux is no longer the default, and pretending it is would be wrong. But it is still the best answer to
three specific requirements:

- **A large team that needs one convention.** Slices, actions and selectors are prescriptive in a way
  minimal libraries are not, and prescriptive is valuable at scale.
- **Time-travel debugging and action replay.** Reproducing a user's bug by replaying the action log is a
  capability nothing else in this chapter offers.
- **A complex middleware pipeline** — analytics on every action, undo, event sourcing, cross-slice
  coordination.

If none of those apply, the boilerplate is a cost with no matching benefit.

### Comparison

| | Context | Zustand | Jotai | Redux Toolkit |
| --- | --- | --- | --- | --- |
| **Shape** | Delivery mechanism | One store, sliced | Many atoms, composed | One store, sliced |
| **Re-render granularity** | Whole subtree | Per selector | Per atom | Per selector |
| **Lives outside React** | No | Yes | Partly | Yes |
| **Boilerplate** | Low | Very low | Low | Moderate |
| **Best at** | Stable, widely-read values | Small global state, frequent updates | Fragmented, derived state | Convention and tooling at scale |

### Persisting it

Client state that should survive a refresh — a collapsed sidebar, a chosen theme — is usually persisted
to `localStorage` through a middleware. Two things go wrong.

**Server-rendered markup does not know what is in `localStorage`.** Rendering the persisted value on the
first client pass produces a hydration mismatch. Render the default, then apply the persisted value after
mount, accepting one frame of the default.

**Persisted shapes outlive your types.** A stored object from three releases ago will still be there.
Version the persisted state and migrate it, or validate it on read and discard what does not match.

## When to Use It

| Situation | Rung |
| --------- | ---- |
| A dropdown's open state | `useState` |
| A value two sibling components share | Lift to the nearest parent |
| Theme, locale, a client instance | Context |
| A sidebar toggled from the header and read in three places | A store |
| An editor with dozens of derived values | Atoms |
| A large team wanting one enforced pattern | Redux Toolkit |
| Anything fetched from an API | None of these — see [Chapter ?? — Server State with TanStack Query](#ch-server-state) |

## Common Mistakes

**❌ Reaching for a global store first.**
✅ Most state is local. A store that holds one component's open flag has made a local decision global for
no reason.

**❌ Putting fast-changing values in Context.**
✅ Every consumer re-renders on every change. Split the context, or move the value to a store with
selector subscriptions.

**❌ Selecting a fresh object from a store on every render.**
✅ In Zustand 5 that is an infinite render loop. Select one value per call or use `useShallow`.

**❌ Storing derived values in the store.**
✅ Derive them. A stored total is a second source of truth that will disagree with the first.

**❌ Persisting state without a version.**
✅ Old shapes survive deploys. Version and migrate, or validate on read.

## 🔑 Key Takeaways

- Client state is the residue after server, form and URL state are removed — usually small.
- Context delivers values; it has no subscriptions, so every consumer re-renders on every change.
- Zustand subscribes per selector, and version 5 requires that selector output be a stable reference.
- Jotai composes bottom-up, which suits fragmented and heavily derived state.
- Redux Toolkit still earns its place for convention at scale, action replay and middleware pipelines.

## Interview Questions

**Q: When would you use Context instead of a state library?**

For values that are read widely and change rarely — a theme, a locale, a configuration object, or a
handle to a client. Context has no subscription model, so every consumer re-renders whenever the provider
value changes identity. That is free when the value changes on login and expensive when it changes on
every keystroke.

**Q: A component re-renders whenever any part of a global store changes. What is wrong?**

It is subscribing to the whole store instead of a slice, or its selector returns a new object each call,
so the equality check always fails. Select the individual values, or wrap the selector in a shallow
comparison. In Zustand 5 the second case does not merely re-render — it can loop until React throws.

**Q: Zustand or Jotai?**

Zustand when there is a small, coherent global store that several components read and write — one file,
one shape, selector subscriptions. Jotai when state is fragmented and heavily derived, so composing small
atoms is more natural than slicing one object. Neither is for server data.

**Q: Is Redux dead?**

No — it stopped being the default. It is still the right answer when a large team needs one enforced
convention, when replaying an action log to reproduce a bug is worth real money, or when there is a
genuine middleware pipeline. What changed is that server state moved to query caches, which is what most
Redux stores actually held.

## What to Read Next

- [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) — the classification this chapter assumes
- [Chapter ?? — Signals and the Next Model](#ch-signals-and-the-next-model) — where these libraries are converging
- [Chapter ?? — Performance and the React Compiler](#ch-react-performance-and-the-compiler) — the re-render costs this chapter keeps naming
