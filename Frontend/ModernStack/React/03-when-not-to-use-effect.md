---
title: useEffect and When Not to Use It
part: 3
chapter: 0
slug: when-not-to-use-effect
level: advanced # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-03
tags: [react, useeffect, derived-state, event-handlers, code-review]
in_book: true
---

# useEffect and When Not to Use It {#ch-when-not-to-use-effect}

> Delete the four effects that should never have been written, and say precisely what the remaining ones are synchronising.

**In this chapter:** the one question to ask · derived state · resetting state · event logic in the wrong place · the effects that stay

## 💡 The Core Idea

An effect exists to synchronise React with something **outside** React — a socket, a browser API, a
third-party widget, the document title. If nothing outside React is involved, the effect is not
synchronising anything. It is a render that runs a second time to fix up the first.

This is the highest-signal topic in a React code review round. Unnecessary effects are not a style
problem: each one adds a render, a paint the user can see, and a dependency array that has to stay
correct forever.

> Ask one question of every effect: **what outside React am I keeping in step with?** If the answer is
> "some other state in this same component", delete the effect.

## How It Works

### Derived state is not state

If a value can be computed from props and state, compute it during render. Storing it means holding two
sources of truth that a future edit can push out of step.

**❌ An effect to keep a total up to date:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState<number>(0);

useEffect(() => {
  setTotal(items.reduce((sum: number, i: Item) => sum + i.price, 0));
}, [items]);
```

Two renders per change, and the first one paints a total that does not match the list.

**✅ Compute it:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const total: number = items.reduce((sum: number, i: Item) => sum + i.price, 0);
```

If the calculation is genuinely expensive — measure first — wrap it in `useMemo`. That is still not an
effect: it stays inside the render, so the value and the list can never disagree.

### Resetting state belongs to `key`

**❌ Clearing fields when the record changes:**

```tsx
useEffect(() => {
  setDraft("");
  setDirty(false);
}, [contactId]);
```

The old values are painted first, then cleared, and every new piece of state has to be added to this
list by hand.

**✅ Give React a new identity and let it rebuild:**

```tsx
<EditForm key={contact.id} contact={contact} />
```

One render, no flash, and state added later resets automatically because the whole subtree is new.

### Event logic belongs in the event handler

An effect cannot tell *why* it ran. If the answer is "because the user did something", the code belongs
where that something was handled.

**❌ A purchase that fires twice:**

```tsx
useEffect(() => {
  if (submitted) {
    void postOrder(cart);
    showToast("Order placed");
  }
}, [submitted, cart]);
```

In development this runs twice under Strict Mode, and in production it runs again on any remount. A
`submitted` flag in state is almost always a sign that an event handler was turned into a state machine
for no reason.

**✅ Do it where it happened:**

```tsx
async function handleSubmit(): Promise<void> {
  await postOrder(cart);
  showToast("Order placed");
}
```

The test is whether the code should run because the screen shows something, or because the user did
something. Showing is an effect. Doing is a handler.

### External data belongs in `useSyncExternalStore`

Reading a browser API into state with an effect gives you a render of the wrong value first, and a
subscription that resubscribes whenever the dependency array changes.

**❌ Subscribe, then mirror into state:**

```tsx
const [isOnline, setIsOnline] = useState<boolean>(true);

useEffect(() => {
  const update = (): void => setIsOnline(navigator.onLine);
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}, []);
```

**✅ Read it during render instead** — the `useOnlineStatus` hook in the previous chapter does this in
five lines with `useSyncExternalStore`, and it gives the server a correct value to render as well.

### The effects that stay

Deleting effects is not the goal; deleting the ones that synchronise nothing is.

| Effect                                              | Keep? | Because                                    |
| ---------------------------------------------------- | ----- | ------------------------------------------- |
| Connecting a chat socket for the current room        | ✅    | An external connection with a real lifetime |
| Setting `document.title`                             | ✅    | The document is outside React               |
| Initialising a map, chart or editor library          | ✅    | A third-party instance to create and destroy |
| Sending an analytics page view on route change       | ✅    | Caused by the screen, not by a click        |
| Fetching data in a client component with no framework or library | ⚠️ | Works, but you are hand-writing a cache |

The last row is the honest one. An effect can fetch, but it cannot deduplicate, cache, retry, or
survive a back button on its own. In an App Router application the fetch belongs on the server; in a
client-heavy application it belongs in a query library.

## When to Use It

| The code should run…                       | Put it in            | Signal it is wrong                        |
| ------------------------------------------- | -------------------- | ----------------------------------------- |
| Because a value can be computed             | The render body      | Two states that must agree                |
| Because the user did something              | The event handler    | A boolean flag watched by an effect       |
| Because a different record is being shown   | A `key` prop         | A list of `setX("")` calls                |
| Because the component is on screen          | `useEffect`          | —                                         |
| Because data lives outside React            | `useSyncExternalStore` | An effect that copies a value into state |

## Common Mistakes

**❌ Chains of effects.** One effect sets state, which triggers a second, which triggers a third. Each
link is a render, the order is implicit, and a cycle is one edit away. **✅ Compute the whole next state
in the event handler that started it.**

**❌ Notifying the parent with an effect:**

```tsx
useEffect(() => { onChange(value); }, [value, onChange]);
```

The parent learns about the change one render late. **✅ Call `onChange` in the same handler that calls
`setValue`**, or lift the state so the parent owns it.

**❌ Blaming Strict Mode for a double-fire.** Development remounts every component once on purpose, to
surface effects with no cleanup. An effect that breaks under it is broken in production too, on the
next remount. Write the cleanup instead of removing the check.

> ⚠️ `useEffect` with an empty dependency array is not "run once". It is "run once per mount", and
> React reserves the right to mount a component again. Anything that must genuinely happen once per
> application load belongs at module scope, outside the component.

## 🔑 Key Takeaways

- An effect synchronises React with something outside React; if nothing outside is involved, delete it.
- Anything computable from props and state should be computed during render, not stored and synchronised.
- Resetting state on a new record is a `key` change, not a list of setters in an effect.
- Logic that runs because the user did something belongs in the event handler that handled it.
- An empty dependency array means once per mount, not once per application load.

## Interview Questions

**Q: How do you decide whether a piece of logic belongs in an effect or an event handler?**

Ask why it should run. If it runs because the user did something specific — clicked buy, submitted a
form — it belongs in that handler, because an effect cannot see the cause and will run again on any
remount. If it runs because the component is on screen in a particular state, and it touches something
outside React, it is an effect.

**Q: What is wrong with storing a filtered list in state and updating it in an effect?**

It creates a second source of truth that can disagree with the first, and it costs an extra render in
which the screen shows a filtered list that does not match the data. Computing it during render makes
the two impossible to desynchronise. If profiling shows the filter is genuinely expensive, `useMemo`
keeps it inside the render rather than after it.

**Q: Your effect fires twice in development. Is that a bug?**

The double fire is not the bug; it is the check. Strict Mode mounts, unmounts and remounts each
component to reveal effects whose cleanup is missing or incomplete, and anything that breaks under it
will break in production the next time React remounts the subtree. The fix is a cleanup that fully
reverses the setup, or moving the work out of the effect entirely.

**Q: When is fetching in `useEffect` still the right answer?**

Rarely, and it is worth saying so plainly. It works for a small client-only application with one or two
requests, but it gives you no deduplication, no caching, no revalidation and no cancellation beyond
what you write yourself. On a server-rendered framework the fetch belongs on the server; in a
client-heavy application it belongs in a query library that already solved those four problems.

## What to Read Next

- [Chapter ?? — Hooks in Depth](#ch-react-hooks-in-depth) — writing the effects that do survive the audit
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — where the fetch moves to
- [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) — why server data was never client state
