---
title: Scope and Closures
part: 1
chapter: 3
slug: closures
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-24
tags: [frontend, javascript, scope, hoisting, functions, closures]
in_book: true
---

# Scope and Closures {#ch-closures}

> Know where every variable lives and how long it lives — then use a function's captured scope on purpose, for privacy and factories, without leaking memory.

**In this chapter:** lexical scope and the scope chain · hoisting and the temporal dead zone · declarations, expressions and arrows · what a closure captures · the loop-variable trap and closure leaks

## 💡 The Core Idea

Scope in JavaScript is **lexical**. Where a variable can be read is decided by where it is written,
not by who calls the function. Inner code reaches out to its parents, never the reverse.

A **closure** follows directly. A function keeps a reference to the scope it was written in, and that
scope stays alive as long as the function does — even after the outer function has returned. The
detail that decides every closure question: it captures **references, not copies**. Two closures over
one variable see the same value, and a later change reaches both.

## How It Works

**The scope chain — lookup goes outward, one link at a time:**

```typescript
function outer(): () => void {
  const message: string = 'still here';
  return function inner(): void {
    console.log(message); // own scope, then parent, then up to module scope
  };
}

const closure = outer();
closure(); // 'still here' — outer has returned, but its scope has not been collected
```

`outer`'s call frame is gone, but `message` cannot be garbage-collected. The returned function holds
the scope that contains it. That is the whole mechanism; everything below is a use of it.

### Hoisting and the temporal dead zone

All three declaration forms are hoisted to the top of their scope. They differ in what the binding
holds before the declaration line runs, and in which `{ }` counts as their scope.

| Declaration | Scope                 | Before the line runs         | Consequence                                 |
| ----------- | --------------------- | ---------------------------- | ------------------------------------------- |
| `var`       | The enclosing function | `undefined`                 | Reads silently succeed with the wrong value |
| `let`       | The nearest block     | Uninitialised — the **TDZ**  | Reads throw `ReferenceError`                |
| `const`     | The nearest block     | Uninitialised — the **TDZ**  | Reads throw `ReferenceError`                |

> ⚠️ The TDZ is a feature, not a limitation. `var`'s `undefined` turns a use-before-declare bug into
> a value that spreads. The TDZ turns it into a stack trace pointing at the line that caused it.

### Declarations, expressions and arrows

| Form            | Written as                 | Hoisted?                  | Own `this` | `new`-able |
| --------------- | -------------------------- | ------------------------- | ---------- | ---------- |
| **Declaration** | `function f() {}`          | ✅ Name **and** body       | ✅          | ✅          |
| **Expression**  | `const f = function () {}` | Binding only (in the TDZ) | ✅          | ✅          |
| **Arrow**       | `const f = () => {}`       | Binding only (in the TDZ) | ❌ Lexical  | ❌          |

Arrows have no own `this`, no `arguments`, no `prototype`, and cannot be constructed. The missing
`this` is the point: a callback written inside a method sees the method's `this` — see
[Chapter ?? — The `this` Keyword](#ch-this-keyword). A default parameter fires only for `undefined`,
never for `null`.

### Private state

Closures give real privacy, with no property anyone can read.

```typescript
function createCounter(): { increment(): number; getCount(): number } {
  let count: number = 0; // no property exposes this
  return { increment: (): number => ++count, getCount: (): number => count };
}

const a = createCounter();
const b = createCounter();
a.increment(); // 1
b.increment(); // 1 — each call made its own `count`
```

### Factories and memoisation

A **factory** returns a function that has captured its configuration. A **memoiser** keeps its cache
in the closure, so nothing outside can corrupt it.

```typescript
function createMultiplier(multiplier: number): (n: number) => number {
  return (n: number): number => n * multiplier; // remembers `multiplier`
}

function memoize<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  const cache = new Map<string, R>();
  return (...args: Args): R => {
    const key: string = JSON.stringify(args);
    // `has`, not a truthiness check — a cached `0` or `false` is still a hit
    if (cache.has(key)) return cache.get(key) as R;
    const result: R = fn(...args);
    cache.set(key, result);
    return result;
  };
}
```

React hooks are this pattern with a scheduler attached. A handler inside a component closes over the
props and state of the render that created it. That is why a stale closure in a `useEffect` reads a
stale value.

## When to Use It

| Scenario                                          | Reach for             | Why                                                  |
| ------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| Callback into `map`, `filter`, `then`             | Arrow                 | Concise, and inherits `this` from where you wrote it |
| Method on an object or class                      | Method shorthand      | Needs its own `this`, bound to the receiver          |
| State that must not be reachable from outside     | Closure variable      | No property exists, so there is no convention to break |
| Many near-identical functions differing by config | Factory               | Configuration is captured once, not passed every call |
| Privacy inside a `class`                          | `#private` field      | Reads better, and devtools shows it as a class member |

## Common Mistakes

**❌ `var` in a loop that defers work.** This is the most-asked closure question in interviews:

```typescript
for (var i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// 3, 3, 3
```

`var` is function-scoped, so there is exactly one `i`. All three closures capture a reference to it,
and all three read it after the loop has finished — by which point it is 3.

**✅ `let` creates a fresh binding per iteration, so each closure captures its own:**

```typescript
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// 0, 1, 2
```

**❌ An arrow as an object method.** It takes `this` from the surrounding scope, which is not the
object. Use method shorthand — `onClick(): void { ... }` — so `this` is the receiver.

**❌ Closing over a container when you need one value.** A closure keeps the *whole* scope alive, not
only the variables it reads:

```typescript
function leaky(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');
  return (): void => console.log('done'); // hugeArray may stay pinned
}

function tidy(): () => void {
  const needed: string = new Array<string>(1_000_000).fill('data')[0];
  return (): void => console.log(needed); // ✅ nothing reaches the array
}
```

**❌ Adding a listener with an inline arrow and expecting to remove it later.**
`removeEventListener` matches by identity, so an inline function can never be removed. Its closure
keeps the element alive after it leaves the DOM.

> ⚠️ Long-lived single-page apps are where closure leaks bite. Components mount and unmount thousands
> of times, and each retained handler pins a whole scope. Profile with a heap snapshot rather than
> guessing.

## 🔑 Key Takeaways

- Scope is lexical: it follows where code is written, not who calls it, and lookup only goes outward.
- `var` is function-scoped and reads as `undefined` early; `let` and `const` are block-scoped and throw in the TDZ.
- A closure is a function plus the scope it was defined in, kept alive after that scope returns.
- Closures capture references, not values — which is why one shared `var` produces the loop bug.
- A closure can retain the whole enclosing scope, so extract the value you need instead of the container.

## Interview Questions

**Q: Explain the scope chain.**

Each function keeps a reference to the scope it was defined in. Resolving a name searches the current
scope, then its parent, then upward to module scope, and takes the first match. The chain is fixed
where the function is written, so a function passed to a different caller still reads the variables
it was written next to.

**Q: What is the temporal dead zone, and why is it useful?**

It is the span between entering a block and running a `let` or `const` declaration in it. The binding
exists but is uninitialised, so reading it throws `ReferenceError`. That turns `var`'s silent
`undefined` into an error at the exact line, which is easier to debug.

**Q: Why does a `var` loop with `setTimeout` print the final value three times?**

`var` is function-scoped, so the loop has one `i`, and each callback closes over a reference to it,
not a copy. The callbacks run after the loop ends, so all three read 3. `let` fixes it by creating a
new binding on each iteration.

**Q: How do closures cause memory leaks?**

The engine can keep the whole enclosing scope alive, not only the variables the closure reads. A
long-lived function created next to a large array or a DOM node pins that object. The fix is to narrow
what the closure sees, or to drop the reference to the closure itself.

**Q: When would you use a `#private` class field instead of a closure?**

When the object is already a class with several methods and many instances. Closure privacy costs one
function object per method per instance. Closures win when there is no class, or when you want to
avoid `this` entirely.

## What to Read Next

- [Chapter ?? — The `this` Keyword](#ch-this-keyword) — the other half of "what does this function see"
- [Chapter ?? — Data Types, Variables and Built-ins](#ch-data-types-variables) — the value model these bindings hold
- [Chapter ?? — OOP and Composition over Inheritance](#ch-composition-over-inheritance) — factories as an architectural choice
