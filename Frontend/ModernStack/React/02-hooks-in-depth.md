---
title: Hooks in Depth
part: 3
chapter: 0
slug: react-hooks-in-depth
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-03
tags: [react, hooks, useeffect, useref, closures, custom-hooks]
in_book: true
---

# Hooks in Depth {#ch-react-hooks-in-depth}

> Explain why the rules of hooks exist, write an effect that cleans up correctly, and spot the stale closure before it ships.

**In this chapter:** why call order is the rule · `useState` against `useRef` · effects as synchronisation · stale closures · custom hooks that are worth extracting

## 💡 The Core Idea

A hook is a way to attach something — a value, a subscription, a piece of work — to a component
instance. The component function itself is stateless and runs from top to bottom every render. The state
lives outside it, in a list held by React, and **React matches your hook calls to that list by call
order.**

Everything unusual about hooks follows from that one implementation detail. There is no name and no key;
there is only "the third hook this component called". Change the order between renders and the third
call gets the second call's state.

> This is why the rules are not style advice. `useState` inside an `if` is not ugly — it is a
> use-after-free waiting for a branch to flip.

## How It Works

### The rules, and the one exception

| Rule                                          | What breaks without it                             |
| --------------------------------------------- | --------------------------------------------------- |
| Call hooks at the top level, never in a branch, loop or early return | Call order shifts and state is read from the wrong slot |
| Call hooks only from components or other hooks | React has no instance to attach the state to        |
| Name custom hooks `useSomething`               | The linter and the React Compiler both rely on it   |

React 19 adds one deliberate exception: **`use` may be called conditionally.** It reads a promise or a
context and can appear inside an `if` or a loop, because it does not own a state slot. Every other hook
still follows the rules above.

### `useState` against `useRef`

Both survive re-renders. Only one of them causes a render.

| Need                                       | Use        | Why                                            |
| ------------------------------------------ | ---------- | ----------------------------------------------- |
| A value the UI shows                       | `useState` | Changing it must repaint the screen              |
| A DOM node to focus, measure or play       | `useRef`   | Not render output, and mutating it must not render |
| A timer id, a previous value, a scroll offset | `useRef` | Transient bookkeeping the UI never reads directly |
| An expensive initial value                 | `useState(() => build())` | The lazy form runs the builder once, not every render |

The lazy initialiser is easy to miss. `useState(buildIndex(rows))` calls `buildIndex` on **every**
render and throws the result away after the first. `useState(() => buildIndex(rows))` calls it once.

**A ref for a value that changes too often to render:**

```tsx
const lastScrollY = useRef<number>(0);

function handleScroll(event: UIEvent<HTMLDivElement>): void {
  // Sixty writes a second, zero re-renders.
  lastScrollY.current = event.currentTarget.scrollTop;
}
```

> ⚠️ Never read or write `ref.current` during render. React makes no promise about when render runs or
> whether the result is kept. Read it in an event handler or an effect.

### Effects synchronise; they are not lifecycle hooks

The useful way to read `useEffect` is: *keep this external thing in step with this state.* Not "run on
mount". The dependency array is not a list of triggers you tune until the warning goes away — it is the
list of values the effect uses, and React re-synchronises whenever any of them differs.

Every effect that starts something must be able to stop it. The cleanup runs before the next
synchronisation and again on unmount.

**Subscribe, and unsubscribe on the way out:**

```tsx
useEffect(() => {
  const socket: RoomSocket = connect(roomId);
  socket.on("message", onMessage);
  return () => socket.close(); // Runs before the next roomId, and on unmount
}, [roomId, onMessage]);
```

Fetching needs the same discipline, because responses arrive out of order. Without the guard, a slow
request for user 1 can overwrite a fast request for user 2.

**Ignore a response that is no longer wanted:**

```tsx
useEffect(() => {
  const controller = new AbortController();

  void (async () => {
    const res: Response = await fetch(`/api/users/${userId}`, { signal: controller.signal });
    setUser((await res.json()) as User);
  })();

  return () => controller.abort();
}, [userId]);
```

### Stale closures

Every render creates new functions, and each one closes over the values from *that* render. If a
function outlives the render that made it — inside an interval, a subscription, an event listener — it
keeps reading the old values forever.

**❌ The counter that stops at one:**

```tsx
useEffect(() => {
  const id: number = window.setInterval(() => {
    setCount(count + 1); // `count` is frozen at 0 from the first render
  }, 1000);
  return () => window.clearInterval(id);
}, []); // The empty array is what freezes it
```

**✅ Do not close over the value at all:**

```tsx
useEffect(() => {
  const id: number = window.setInterval(() => {
    setCount((c: number) => c + 1); // React supplies the current value
  }, 1000);
  return () => window.clearInterval(id);
}, []);
```

Two fixes, one principle: either put the value in the dependency array so the effect re-runs with a
fresh closure, or stop reading the value and describe the change instead. Deleting a dependency to
silence the linter picks neither and hides the bug.

### Custom hooks

A custom hook is a function that calls hooks. That is the whole mechanism — there is no registry and no
sharing. Two components calling `useOnlineStatus()` get two independent pieces of state.

Extract one when the *logic* repeats, not when the code merely looks similar. A good custom hook hides a
subscription, a synchronisation or a sequence of related state transitions behind a name that says what
it does.

```tsx
function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange: () => void) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine, // Value on the client
    () => true,             // Value on the server, so SSR and hydration agree
  );
}
```

`useSyncExternalStore` is the right tool whenever the data lives outside React — a browser API, a
third-party store, a media query. It reads the value during render rather than after it, so there is no
flash of the wrong state and no tearing when React renders concurrently.

## When to Use It

| You need                                   | Reach for                | Not                                     |
| ------------------------------------------- | ------------------------ | ---------------------------------------- |
| Value that drives the UI                    | `useState`               | `useRef` — nothing will repaint          |
| Value that must not drive the UI            | `useRef`                 | `useState` — a render per change         |
| Data from a browser API or external store   | `useSyncExternalStore`   | `useEffect` + `useState`                 |
| A constant that never depends on props      | Module scope             | Any hook at all                          |
| Related state that changes together         | `useReducer`             | Five `useState` calls kept in step by hand |

## Common Mistakes

**❌ Trimming the dependency array to stop the effect re-running:**

```tsx
useEffect(() => {
  subscribe(roomId, onMessage);
}, []); // roomId and onMessage are used but not declared
```

The effect now describes a synchronisation it does not perform. **✅ Declare every value the effect
reads**, then make the unstable ones stable — move the function inside the effect, hoist it out of the
component, or wrap it in `useCallback`.

**❌ Two `useState` calls that must always agree.** If setting one without the other is a bug, they are
one piece of state. **✅ Use `useReducer`, or derive the second from the first during render.**

**❌ Subscribing with an effect and mirroring into state.** Two renders, a visible flash of the stale
value, and a resubscribe on every dependency change. **✅ `useSyncExternalStore`.**

**❌ A custom hook that only groups unrelated calls.** `usePageSetup()` wrapping four unrelated hooks
hides the dependencies without simplifying anything. Extract behaviour, not lines.

## 🔑 Key Takeaways

- React matches hooks to their state by call order, which is why they cannot sit inside a branch — `use` is the one React 19 exception.
- `useRef` holds a value across renders without causing one; `useState` exists to cause one.
- The dependency array lists what the effect reads; every effect that starts something must return the cleanup that stops it.
- A stale closure is a function outliving the render whose values it captured — fix it with a fresh dependency or an updater function.
- Data that lives outside React belongs in `useSyncExternalStore`, not in an effect that copies it into state.

## Interview Questions

**Q: Why can't hooks be called conditionally?**

React stores hook state in a list per component instance and matches calls to entries by order, since a
hook call has no name or key. A conditional call shifts every later hook by one slot, so a `useState`
would read another hook's value. React 19's `use` is exempt because it owns no slot — it reads a promise
or context rather than storing anything.

**Q: This `setInterval` increments the counter to 1 and then stops. What is wrong?**

The callback closes over `count` from the render in which the effect ran, and the empty dependency array
means the effect never re-runs, so that closure lives forever with `count` frozen at its initial value.
Passing an updater function to `setCount` removes the dependency on the captured value entirely, which
is the fix that keeps the interval from being torn down and recreated every second.

**Q: When would you choose `useRef` over `useState` for a value that changes?**

When the UI does not read it during render. A drag offset updated on every pointer move, a timer id, or
the previous value of a prop are all transient bookkeeping — putting them in state means a render per
change for output nobody sees. The test is simple: if removing the value from the JSX changes nothing on
screen, it does not belong in state.

**Q: When is extracting a custom hook the wrong call?**

When it only moves lines. A hook that wraps four unrelated calls hides which props and state the
component actually depends on, and makes the effects harder to reason about rather than easier. Extract
when the *logic* is genuinely reused or genuinely self-contained — a subscription, a synchronisation, a
state machine — not when two components happen to call the same three hooks.

## What to Read Next

- [Chapter ?? — `useEffect` and When Not to Use It](#ch-when-not-to-use-effect) — the judgement call this chapter's mechanism enables
- [Chapter ?? — The React Mental Model](#ch-react-mental-model) — why call order works at all
- [Chapter ?? — React with TypeScript](#ch-react-typescript) — typing state, refs and custom hook returns
