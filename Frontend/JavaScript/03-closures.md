---
title: Closures
part: 1
chapter: 0
slug: closures
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, javascript, closures]
in_book: true
---

# Closures {#ch-closures}

> Use a function's captured scope on purpose — for privacy, for factories, and without leaking memory.

**In this chapter:** what a closure captures · private state · function factories · the loop-variable trap · memoisation and partial application

## 💡 The Core Idea

A closure is a function plus the scope it was written in. When a function is created it keeps a
reference to that scope, and the scope stays alive for as long as the function does — even after the
enclosing function has returned. The detail that decides every closure question is that it captures
**references, not copies**: two closures over the same variable see the same value, and a variable
that changes later changes for all of them.

## How It Works

```typescript
function outerFunction(): () => void {
  const message: string = 'still here';

  return function (): void {
    console.log(message);
  };
}

const closure: () => void = outerFunction();
closure(); // 'still here'
```

`outerFunction` has returned and its call frame is gone, but `message` is not collectable: the
returned function holds the scope that contains it. That is the whole mechanism. Everything below is
a use of it.

### Private state

Before class private fields, closures were the only real privacy in JavaScript — and they are still
the cheapest.

```typescript
function createCounter(): { increment(): number; getCount(): number } {
  let count: number = 0; // no property exposes this

  return { increment: (): number => ++count, getCount: (): number => count };
}

const a = createCounter();
const b = createCounter();
a.increment(); // 1
b.increment(); // 1 — each call to createCounter made its own `count`
```

| Approach                 | Actually private? | Reachable via                |
| ------------------------ | ----------------- | ---------------------------- |
| Closure variable         | ✅                 | Only the returned methods    |
| `_underscore` convention | ❌                 | `obj._value`                 |
| Plain property           | ❌                 | `obj.value`                  |
| Class `#field`           | ✅                 | Only code inside the class   |

### Function factories

A factory returns a function that has captured its configuration. One factory produces any number of
specialised functions with no duplication.

```typescript
type UnaryNumberFn = (n: number) => number;

function createMultiplier(multiplier: number): UnaryNumberFn {
  return (n: number): number => n * multiplier;
}

const double: UnaryNumberFn = createMultiplier(2); // remembers 2
const triple: UnaryNumberFn = createMultiplier(3); // remembers 3
```

Partial application is the same idea generalised: a `partial(fn, ...fixed)` helper captures the leading
arguments in a closure and returns a function taking the rest.

### Memoisation

The cache lives in the closure, so it is private to the wrapped function and cannot be corrupted from
outside.

```typescript
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

React hooks are this pattern with a scheduler attached: `useState` returns a setter that has closed
over which slot of state it owns, which is why a stale closure in a `useEffect` reads a stale value.

## When to Use It

| Scenario                                   | Reach for               | Why                                                    |
| ------------------------------------------ | ----------------------- | ------------------------------------------------------ |
| State that must not be reachable from outside | Closure variable      | No property exists to read, so no convention to break  |
| Many near-identical functions differing by config | Factory           | Configuration is captured once, not passed every call  |
| Expensive pure function called repeatedly   | `memoize` wrapper       | The cache is scoped to the wrapper, not global         |
| Privacy inside a `class`                    | `#private` field        | Reads better and shows up in devtools as a class member |

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

Before `let` existed the fix was an IIFE, which copied the value into a new scope:
`(function (j: number) { setTimeout(() => console.log(j), 100); })(i)`. Worth recognising in old code;
never worth writing now.

**❌ Closing over a container when you only need a value.** A closure keeps the *whole* scope alive,
not just the variables it reads:

```typescript
function leaky(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');
  return (): void => console.log('done'); // hugeArray is still pinned
}
```

**✅ Take the value out first, so nothing in the returned function reaches the array:**

```typescript
function tidy(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');
  const needed: string = hugeArray[0];
  return (): void => console.log(needed);
}
```

**❌ Adding a listener with an inline arrow and expecting to remove it later.**
`removeEventListener` matches by identity, so an inline function can never be removed and its closure
keeps the element alive after it leaves the DOM.

> ⚠️ Long-lived single-page apps are where closure leaks actually bite: components mount and unmount
> thousands of times, and each retained handler pins a whole scope. Profile with the browser's heap
> snapshot rather than guessing.

## 🔑 Key Takeaways

- A closure is a function plus the scope it was defined in, kept alive after that scope returns.
- Closures capture references, not values — which is why one shared `var` produces the loop bug.
- Each call to a factory creates a separate closure with its own captured state.
- A closure retains the entire enclosing scope, so extract the value you need instead of the container.
- `removeEventListener` matches handlers by identity, so keep a reference to anything you plan to remove.

## Interview Questions

**Q: Why does a `var` loop with `setTimeout` print the final value three times?**

`var` is function-scoped, so the loop has one `i`, and each callback closes over a reference to it
rather than a copy of its value. The callbacks run after the loop ends, so all three read 3. `let`
fixes it by creating a new binding on each iteration.

**Q: How do closures cause memory leaks?**

The engine keeps the whole enclosing scope alive, not only the variables the closure reads. A
long-lived function created next to a large array or a DOM node pins that object indefinitely. The
fix is to narrow what the closure sees, or to drop the reference to the closure itself.

**Q: When would you use a `#private` class field instead of a closure?**

When the object is already a class with several methods and instances. Closure privacy costs one
function object per method per instance, and closure-based objects show up in devtools as anonymous
functions. Closures win when there is no class, when you want per-instance behaviour rather than
shared methods, or when you are avoiding `this` entirely.

## What to Read Next

- [Chapter ?? — Functions and Scope](#ch-functions-scope) — the lexical scoping closures are built on
- [Chapter ?? — The `this` Keyword](#ch-this-keyword) — the other half of "what does this function see"
- [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance) — factories as an architectural choice
