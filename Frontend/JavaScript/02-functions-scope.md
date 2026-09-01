---
title: Functions and Scope
part: 1
chapter: 0
slug: functions-scope
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, javascript, functions, scope]
in_book: true
---

# Functions and Scope {#ch-functions-scope}

> Know where every variable lives, how long it lives, and which of the three declaration forms to reach for.

**In this chapter:** declarations vs expressions · arrow functions and what they lack · block vs function scope · hoisting and the temporal dead zone · default and rest parameters

## 💡 The Core Idea

Scope in JavaScript is **lexical**: where a variable can be read is decided by where it is written in
the source, not by who calls the function. Nesting a function inside another creates a chain that
looks outward — inner code reaches out to its parents, and never the reverse. Hoisting is the one
wrinkle in that model, and the three declaration forms differ mainly in how they hoist.

## How It Works

### Declarations, expressions and arrows

| Form                    | Written as                    | Hoisted?                 | Own `this` | `new`-able |
| ----------------------- | ----------------------------- | ------------------------ | ---------- | ---------- |
| **Declaration**         | `function f() {}`             | ✅ Name **and** body      | ✅          | ✅          |
| **Expression**          | `const f = function () {}`    | Binding only (in the TDZ) | ✅          | ✅          |
| **Arrow**               | `const f = () => {}`          | Binding only (in the TDZ) | ❌ Lexical  | ❌          |

```typescript
greet('Alice'); // ✅ works — declarations hoist body and all
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// sayHi('Bob'); // ❌ ReferenceError — the binding is in the temporal dead zone
const sayHi = (name: string): string => `Hi, ${name}!`;
```

A **named** function expression gets a self-reference that is not visible outside — useful for
recursion without leaking a name:

```typescript
const factorial = function fact(n: number): number {
  return n <= 1 ? 1 : n * fact(n - 1); // `fact` is in scope only in here
};
```

Arrows drop five things regular functions have: their own `this`, the `arguments` object, a
`prototype`, constructor behaviour, and the ability to be a generator. Four of those are
restrictions; the missing `this` is the whole point — see
[Chapter ?? — The `this` Keyword](#ch-this-keyword).

<!-- lint-allow-fence: javascript — the point is that arrows have no own `this` and no `arguments`; TypeScript rejects `this.value` in an object-literal arrow and `arguments` in an arrow, so the errors would replace the lesson -->
```javascript
const obj = {
    regular() { console.log(this.value); },   // 42
    arrow: () => { console.log(this.value); } // undefined — `this` is the outer scope
};
const arrowFunc = () => { console.log(arguments); }; // ReferenceError
const withRest = (...args) => { console.log(args); }; // ✅ the replacement
```

### The scope chain

```typescript
function outer(): void {
  const outerVar: string = 'outer';

  function inner(): void {
    console.log(outerVar); // reaches the parent, and on up to module scope
  }

  inner();
  // console.log(innerVar); // ❌ scope only looks outward, never inward
}
```

Lookup walks one link at a time — own scope, then parent, then grandparent, up to module scope — and
stops at the first match. Nothing searches downward, which is why a function's locals are private by
default.

### What counts as a block

`let` and `const` are scoped to the nearest `{ }`: an `if`, a loop body, a `switch` case, a bare
block, a function body. `var` ignores all of those and is scoped to the enclosing function.

```typescript
function varLeaks(): void {
  if (true) {
    var loose: string = 'function scoped';
    let tight: string = 'block scoped';
  }
  console.log(loose); // ✅ 'function scoped' — escaped the block
  // console.log(tight); // ❌ ReferenceError
}
```

### Hoisting and the temporal dead zone

All three forms are hoisted to the top of their scope. They differ in what the binding holds until
the declaration runs.

| Declaration | Before the line runs                | Consequence                                  |
| ----------- | ----------------------------------- | -------------------------------------------- |
| `var`       | `undefined`                         | Reads silently succeed with the wrong value  |
| `let`       | Uninitialised — the **TDZ**         | Reads throw `ReferenceError`                 |
| `const`     | Uninitialised — the **TDZ**         | Reads throw `ReferenceError`                 |

> ⚠️ The TDZ is a feature, not a limitation. `var`'s `undefined` turns a use-before-declare bug into
> a value that propagates; the TDZ turns it into a stack trace pointing at the line that caused it.

### Parameters

```typescript
// Defaults are expressions, evaluated per call, and can read earlier parameters
function greetAt(name: string, greeting: string = `Hello ${name}`): string {
  return greeting;
}

// A rest parameter collects the remainder into a real array — and must be last
function sum(...numbers: readonly number[]): number {
  return numbers.reduce((t: number, n: number): number => t + n, 0);
}
```

A default fires only for `undefined`, never for `null`. `greetAt('Ada', null!)` keeps the `null`.

## When to Use It

| Scenario                                    | Reach for              | Why                                                   |
| ------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| Callback into `map`, `filter`, `then`        | Arrow                  | Concise, and inherits `this` from where you wrote it   |
| Method on an object or class                 | Method shorthand       | Needs its own `this` bound to the receiver             |
| Top-level utility, or recursive helper       | Declaration            | Hoists, so call order in the file stops mattering      |
| Anything called with `new`                   | `class`, or declaration | Arrows have no `[[Construct]]`                        |

## Common Mistakes

**❌ An arrow as an object method.** It captures the surrounding scope's `this`, which for a module
top-level object is not the object:

```typescript
const button = {
  text: 'Click me',
  onClick: () => console.log(this.text), // undefined
};
```

**✅ Method shorthand, which binds `this` to the receiver:**

```typescript
const button = {
  text: 'Click me',
  onClick(): void {
    console.log(this.text); // 'Click me'
  },
};
```

**❌ Assigning without a declaration keyword.** In non-strict code this creates a global; in a module
or under `'use strict'` it throws. Either way it is never what you meant:

<!-- lint-allow-fence: javascript — the mistake is an undeclared assignment creating an implicit global; TypeScript refuses to compile it, so the fence has to stay untyped to show it -->
```javascript
function createUser() {
    userName = 'Alice'; // ❌ leaks to globalThis
}
```

**❌ Using `var` in a loop whose body defers work.** All iterations share one binding, so every
deferred callback sees the final value. `let` gives each iteration a fresh binding — the mechanism is
covered in [Chapter ?? — Closures](#ch-closures).

## 🔑 Key Takeaways

- Scope is lexical: it follows where code is written, not who calls it, and lookup only goes outward.
- Function declarations hoist name and body; expressions and arrows hoist only the binding, into the TDZ.
- `var` is function-scoped and initialises to `undefined`; `let` and `const` are block-scoped and throw if read early.
- Arrows have no own `this`, no `arguments`, no `prototype`, and cannot be constructed.
- A default parameter fires on `undefined` only — `null` is a value and passes straight through.

## Interview Questions

**Q: Explain the scope chain.**

Each function keeps a reference to the scope it was defined in. Resolving an identifier searches the
current scope, then its parent, then upward until module or global scope, taking the first match. The
chain is fixed when the function is written, which is why a function moved into a different caller
still reads the variables it was written next to.

**Q: What is the temporal dead zone, and why is it useful?**

It is the span between entering a block and executing a `let` or `const` declaration in it. The
binding exists but is uninitialised, so reading it throws `ReferenceError`. It converts
use-before-declare from `var`'s silent `undefined` into an error at the exact line, which is strictly
easier to debug.

**Q: When would you deliberately not use an arrow function?**

Whenever the function needs its own `this` — object methods, class methods, prototype methods, and
DOM handlers that want `this` to be the element. Also for anything constructed with `new`, for
generators, and for a long top-level utility where a real name in the stack trace helps more than the
brevity does.

## What to Read Next

- [Chapter ?? — Closures](#ch-closures) — what a function keeps hold of after its scope has returned
- [Chapter ?? — The `this` Keyword](#ch-this-keyword) — the binding arrows deliberately do not have
- [Chapter ?? — Data Types and Variables](#ch-data-types-variables) — the value model these bindings hold
