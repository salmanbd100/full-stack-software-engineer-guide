---
title: The React Mental Model
part: 3
chapter: 0
slug: react-mental-model
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-03
tags: [react, rendering, reconciliation, keys, state]
in_book: true
---

# The React Mental Model {#ch-react-mental-model}

> Predict what React will do when state changes, and explain why the list you reordered kept the wrong text in its inputs.

**In this chapter:** render against commit · reconciliation · why a component re-renders · keys as identity · state as a snapshot

## 💡 The Core Idea

React asks you to describe what the screen should look like for a given state. It does not ask you to
describe how to get there from the last screen. You write a function from state to elements; React works
out the difference and applies it.

That one sentence explains most React behaviour that surprises people. **Rendering is a calculation, not
a DOM write.** Calling your component is cheap and happens often. Touching the DOM is expensive and
happens rarely, only for the parts that actually differ.

> Your component function may run five times and change nothing on screen. That is React working, not
> React wasting effort. The question worth asking is never "did it render?" but "did it commit?"

## How It Works

### Two phases: render, then commit

An update moves through fixed stages. Nothing touches the DOM until the last two.

```mermaid
flowchart LR
  A[State updated] --> B[Render: call components]
  B --> C[Reconcile: diff against last tree]
  C --> D[Commit: apply DOM changes]
  D --> E[Run layout and passive effects]
```

**The path from `setState` to pixels. Only the Commit stage writes to the DOM.**

The render phase must be pure. React may call your component twice in development to check that, and
may throw the result away entirely if a more urgent update arrives. Side effects belong in event
handlers or effects, never in the body of a component.

### Reconciliation

React compares the element tree it just produced against the previous one, node by node, and follows
three rules.

| What changed                | What React does                                     | Cost                        |
| --------------------------- | --------------------------------------------------- | --------------------------- |
| Element type is the same    | Keeps the DOM node and its state, updates props only | Cheap                       |
| Element type is different   | Destroys the whole subtree and rebuilds it           | Expensive, and state is lost |
| Position in a list          | Matched by `key`, or by index when no key is given   | Depends entirely on the key |

The second row is the one that bites. `<div>` to `<span>` throws away every child, every DOM node and
every piece of state below it. So does swapping between two different components in the same slot.

### Why a component re-renders

There is a short list, and one popular answer is not on it.

| Cause                                     | Re-renders?                                       |
| ----------------------------------------- | ------------------------------------------------- |
| Its own state changed                     | ✅ Yes                                            |
| Its parent re-rendered                    | ✅ Yes — by default, regardless of props          |
| A context it reads changed value          | ✅ Yes                                            |
| Its props changed                         | ❌ Not a cause on its own                         |

A child re-renders because its parent did. Props are along for the ride. Props only become a *cause*
when you wrap the child in `memo`, which asks React to compare them and skip the render if they match.
Understanding that order — parent first, props second — is what separates a real answer to "why is this
re-rendering?" from a guess.

### State is a snapshot

Each render sees the state values it was called with. They do not change underneath it.

**Three updates, one increment:**

```tsx
const [count, setCount] = useState<number>(0);

function handleClick(): void {
  setCount(count + 1); // count is 0 in this render
  setCount(count + 1); // still 0
  setCount(count + 1); // still 0 — final value is 1
}
```

**The fix — describe the change, not the result:**

```tsx
function handleClick(): void {
  setCount((c: number) => c + 1); // React applies each in turn — final value is 3
}
```

The updater form is not a style preference. It is the only correct choice when the next value depends on
the previous one, and it is what makes a callback safe to pass down without re-creating it.

### Keys are identity

A `key` tells React which item in a list is which across renders. It is not a label and it is not for
ordering. Give React the wrong identity and it moves state to the wrong row.

**❌ Index as key — state follows the position:**

```tsx
{rows.map((row: Row, i: number) => <EditableRow key={i} row={row} />)}
```

Delete the first row and every remaining row shifts down one index. React sees "the item at index 0
changed its props", keeps the DOM node it already had, and the half-typed text in row 1 is now sitting
in what used to be row 2.

**✅ A stable identity from the data:**

```tsx
{rows.map((row: Row) => <EditableRow key={row.id} row={row} />)}
```

The same mechanism works in reverse. Changing a key deliberately destroys the subtree and rebuilds it,
which is the cleanest way to reset state when the thing being edited changes.

```tsx
// Every piece of state inside EditForm resets when a different contact is selected.
<EditForm key={contact.id} contact={contact} />
```

## When to Use It

Re-render problems have four common shapes, and only one of them is solved by memoisation.

| Symptom                                      | Reach for                              | Why                                          |
| -------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| A whole page re-renders on every keystroke   | Move the state down into the input     | Keep the update local to what actually changed |
| A layout re-renders when one child's state changes | Pass the expensive part as `children` | `children` is created by the parent, so it does not re-render |
| A leaf is genuinely expensive and props are stable | `memo` on that leaf                | Turns props into a real skip condition        |
| State is lost when a list reorders           | Fix the key, not the render            | This is an identity bug, not a performance bug |

Reach for the first two before the third. Restructuring costs nothing at runtime; memoisation adds a
comparison on every render and a cache entry to keep correct.

## Common Mistakes

**❌ Defining a component inside another component:**

```tsx
function Page() {
  // A new function identity on every render — React sees a different type each time.
  function Row({ item }: { item: Item }) {
    return <li>{item.name}</li>;
  }
  return <ul>{items.map((i: Item) => <Row key={i.id} item={i} />)}</ul>;
}
```

Every render creates a new `Row`, so reconciliation takes the "different type" path, destroys the
subtree and rebuilds it. All state inside is lost, every time. **✅ Move `Row` to module scope.**

**❌ Mutating state and calling `set` with the same reference:**

```tsx
items.push(newItem);
setItems(items); // Same array identity — React skips the update
```

**✅ Produce a new value:**

```tsx
setItems((prev: Item[]) => [...prev, newItem]);
```

**❌ Treating "it rendered" as a bug.** A render that commits nothing is nearly free. Profile before
optimising, and measure the commit, not the render count.

## 🔑 Key Takeaways

- Rendering is a calculation; only the commit phase writes to the DOM.
- A component re-renders because its parent re-rendered — props matter only once `memo` is involved.
- A different element type destroys the subtree and every piece of state inside it.
- Keys give list items identity, so an index key moves state to the wrong row on reorder or delete.
- State is a snapshot within a render; use the updater form whenever the next value depends on the last.

## Interview Questions

**Q: Why does this component re-render when its props have not changed?**

Because its parent re-rendered. By default React re-renders the whole subtree below an update; it does
not compare props first. Wrapping the child in `memo` adds that comparison, but it only helps if the
props are referentially stable — a new object or arrow function created in the parent's render defeats
it immediately.

**Q: What actually goes wrong when you use the array index as a key?**

React matches list items across renders by key. With an index, deleting or inserting an item shifts
every key after it, so React thinks existing components received new props rather than that items moved.
The DOM nodes and their internal state stay in place while the data slides past them, which shows up as
input text, scroll position or focus attached to the wrong row.

**Q: How would you reset a form when the selected record changes — and why not an effect?**

Pass the record's id as the `key` to the form component. React sees a different identity, unmounts the
old subtree and mounts a fresh one, so every field resets in a single render. An effect that clears the
fields runs *after* the browser has already painted the old values, which the user can see, and it has
to be kept in step with every new piece of state you add.

**Q: When would you not reach for `memo`?**

When the component is cheap, when its props are objects or callbacks created inline by the parent, or
when the real fix is moving state down. `memo` adds a comparison on every render and a correctness
burden. Under the React Compiler most of these decisions are made for you, which makes hand-memoising a
thing to justify rather than a default.

## What to Read Next

- [Chapter ?? — Hooks in Depth](#ch-react-hooks-in-depth) — how state and effects attach to a component instance
- [Chapter ?? — `useEffect` and When Not to Use It](#ch-when-not-to-use-effect) — the effects this chapter's model makes unnecessary
- [Chapter ?? — Component Composition Patterns](#ch-react-composition-patterns) — the restructuring that beats memoisation
