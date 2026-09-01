---
title: ES2015 and Later Features
part: 1
chapter: 0
slug: es6-features
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, javascript, es2015, syntax, modules]
in_book: true
---

# ES2015 and Later Features {#ch-es6-features}

> Reach for the modern form of each pattern, and say what it replaced and why that matters.

**In this chapter:** destructuring · spread and rest · template literals · modules · `Map`, `Set` and `Symbol` · optional chaining and nullish coalescing

## 💡 The Core Idea

ES2015 was not a pile of shortcuts. Each of its additions removed a class of bug that the old form
made easy: `const` removed accidental reassignment, modules removed the global namespace, `Map`
removed key collisions with `Object.prototype`. When an interviewer asks why you use a feature, the
answer they want is **what it replaced**, not that it is shorter.

> Named editions matter here. `let`, destructuring, modules and `Map` are ES2015; optional chaining
> and nullish coalescing are ES2020; `Object.groupBy` is ES2024. Say the year when it is load-bearing.

## How It Works

### Destructuring

Pull values out by position from an array, by name from an object.

```typescript
// Objects: by name, with a rename, a default, and nesting
const { host, port = 5432, auth: { user }, ...rest } = config;

// Arrays: by position, with holes and a rest element
const [first, , third, ...others] = [1, 2, 3, 4, 5];

// Swap without a temporary
[a, b] = [b, a];
```

The most useful place is a function signature, where it names each field and gives it a default in
one line:

```typescript
function connect({ host, port = 5432, timeout = 30_000 }: Config & { timeout?: number }): void {}
```

> ⚠️ A destructuring default fires only for `undefined`. A `null` in the object passes straight
> through, so `const { port = 5432 } = { port: null }` gives you `null`.

### Spread and rest

The same `...` in two roles, told apart by position: **rest** collects on the left of an `=` or in a
parameter list; **spread** expands on the right or in an argument list.

```typescript
const merged = { ...defaults, ...overrides }; // spread — later keys win
const combined = [...a, ...b]; // spread
const [head, ...tail] = list; // rest
function sum(...ns: readonly number[]): number { return ns.reduce((a, b) => a + b, 0); } // rest
```

Both are **shallow**. `{ ...state, user: { ...state.user, age: 31 } }` is the idiom precisely because
one level is all you get.

### Template literals

Backticks interpolate expressions and keep their own line breaks. The part worth knowing at senior
level is the **tagged** form, where a function receives the literal parts and the interpolated values
separately:

```typescript
function safeHTML(strings: TemplateStringsArray, ...values: unknown[]): string {
  const escape = (v: unknown): string =>
    String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return strings.reduce((out: string, part: string, i: number): string =>
    out + part + (values[i] === undefined ? '' : escape(values[i])), '');
}
```

That split — trusted literals, untrusted values — is what lets `styled-components`, `graphql` and
i18n tags be safe rather than merely convenient.

### Modules

| Aspect      | ES modules                              | CommonJS                       |
| ----------- | --------------------------------------- | ------------------------------ |
| Syntax      | `import` / `export`                     | `require` / `module.exports`   |
| Resolution  | Static — known before running           | Dynamic — resolved at call time |
| Bindings    | Live references to the export           | A copied value                 |
| Tree-shaking | ✅ Possible                             | ❌ Not reliably                 |
| Loading     | Always asynchronous                     | Synchronous                    |

```typescript
export const VERSION = '1.0.0'; // named
export default class Client {} // default — one per module

import Client, { VERSION } from './client.js';
const { heavy } = await import('./heavy.js'); // dynamic: code-splitting boundary
```

Static resolution is what makes tree-shaking and dynamic `import()` code-splitting possible at all —
the bundler can see the graph without executing anything.

### `Map`, `Set` and `Symbol`

```typescript
// Map: any value as a key, guaranteed insertion order, a real `size`
const cache = new Map<object, string>();

// Set: unique values, O(1) membership
const unique = [...new Set(list)];

// Symbol: a unique key that no other code can collide with
const INTERNAL = Symbol('internal');
```

| Need                                     | `Object`                       | `Map`                        |
| ---------------------------------------- | ------------------------------ | ---------------------------- |
| Keys that are not strings                | ❌ Coerced to strings           | ✅ Any value, including objects |
| Frequent add and delete                  | Slower                         | ✅ Optimised for it           |
| Counting entries                         | `Object.keys(o).length`        | ✅ `.size`                    |
| Risk of clashing with `toString` etc.    | ✅ Real risk                    | ❌ None                       |
| JSON serialisation                       | ✅ Direct                       | ❌ Needs conversion           |

`WeakMap` and `WeakSet` hold keys weakly, so an entry disappears when nothing else references its
key — the right store for metadata attached to DOM nodes or class instances.

### Optional chaining and nullish coalescing (ES2020)

```typescript
const city = user?.address?.city; // undefined instead of a TypeError
const name = user.getName?.(); // only calls if it exists
const first = list?.[0];

const port = config.port ?? 5432; // falls back only on null/undefined
```

`??` exists because `||` also replaces `0`, `''` and `false` — which silently turns a legitimate
`0` into a default.

## When to Use It

| Scenario                                         | Reach for                    | Why                                              |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------------ |
| Many optional named arguments                     | Destructured parameter object | Names and defaults in the signature, order-free  |
| Keys that are objects, or a cache you delete from | `Map`                        | No string coercion, no prototype collisions      |
| Metadata that must not keep its subject alive     | `WeakMap`                    | Entry is collected with the key                  |
| A default that must survive `0` or `''`           | `??`                         | Logical OR treats those as absent                |
| A large feature only some users reach              | `await import()`             | Static graph plus a code-splitting boundary      |

## Common Mistakes

**❌ Using `||` for defaults on numbers or strings:**

```typescript
const pageSize = options.pageSize || 20; // ❌ pageSize: 0 becomes 20
const pageSize = options.pageSize ?? 20; // ✅ only null/undefined fall back
```

**❌ Treating spread as a deep copy.** It copies one level; nested objects stay shared.

**❌ Destructuring a possibly-`undefined` value.** `const { a } = maybe` throws when `maybe` is
`null` or `undefined`. Give the whole pattern a default: `const { a } = maybe ?? {}`.

**❌ Using an object as a lookup table with untrusted keys.** A key of `constructor` or `__proto__`
collides with the prototype chain, which is a real vulnerability class in query parsers. `Map` has no
prototype chain to collide with.

**❌ Reaching for optional chaining everywhere.** `a?.b?.c?.d` hides a broken assumption: if `a`
should never be null, `?.` converts a loud failure into a silent `undefined` three lines later. Use
it where absence is genuinely expected.

## 🔑 Key Takeaways

- Destructuring defaults, and `??`, trigger on `undefined` only — `null` and `0` pass through.
- Spread and rest are the same syntax in two positions, and both copy only one level deep.
- ES modules are statically resolvable, which is what enables tree-shaking and dynamic `import()`.
- `Map` accepts any key type and has no prototype chain to collide with; `Object` coerces keys to strings.
- A tagged template receives literals and values separately, which is what makes escaping possible.

## Interview Questions

**Q: When would you choose a `Map` over a plain object?**

When keys are not strings — objects, numbers you need to stay numbers — when you add and delete
frequently, when insertion order matters, or when the keys come from user input and could collide with
`Object.prototype` names. Objects still win for JSON round-trips and for fixed, known shapes.

**Q: Why can ES modules be tree-shaken when CommonJS cannot?**

`import` and `export` are static: the bindings are known before any code runs, so a bundler can prove
which exports are unreachable and drop them. `require` is an ordinary function call whose argument
can be computed, so the graph is only knowable by executing the program.

**Q: When is optional chaining the wrong tool?**

When the value should never be absent. `?.` turns a violated invariant into `undefined` that
propagates and fails somewhere unrelated, which is harder to debug than the original `TypeError`.
Reserve it for genuinely optional data — an API field that may be missing, a DOM query that may not
match.

## What to Read Next

- [Chapter ?? — Array and Object Methods](#ch-array-object-methods) — the built-ins these features are usually combined with
- [Chapter ?? — Data Types and Variables](#ch-data-types-variables) — why spread being shallow matters
- [Chapter ?? — Code Splitting](#ch-code-splitting) — dynamic `import()` as a performance tool
