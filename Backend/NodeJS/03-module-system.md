---
title: The Module System
part: 5
chapter: 0
slug: module-system
level: intermediate
reading_time: 8
updated: 2026-09-01
tags: [nodejs, esm, commonjs, modules]
in_book: true
---

# The Module System {#ch-module-system}

> Explain why one import works and the next one throws, and pick a module mode you will not regret.

**In this chapter:** CommonJS against ESM · live bindings · the module cache · interop and dual packages

## 💡 The Core Idea

Node carries two module systems. **CommonJS** resolves and executes imports one at a time, at
runtime — `require` is an ordinary function call. **ESM** parses the whole graph first, links the
exports, then runs the modules. Everything else that confuses people follows from that one
difference: static analysis is possible in ESM and impossible in CommonJS.

The practical consequence is that ESM's imports are hoisted and asynchronous, so you cannot
`require` your way out of a circular reference, and top-level `await` becomes legal.

## How It Works

| | CommonJS | ESM |
| --- | -------- | --- |
| Syntax | `require` / `module.exports` | `import` / `export` |
| Resolution | Runtime, synchronous | Parse time, asynchronous |
| Exports | A value copied at import time | A **live binding** |
| Conditional import | `if (x) require('y')` works | Needs `await import('y')` |
| File extension in path | Optional | **Required** for relative paths |
| `__dirname` | Available | Use `import.meta.dirname` |
| Circular imports | Partial object, silently | Hoisted, often works |

**Node decides which mode a `.js` file is in by the nearest `package.json`:**

```json
{ "type": "module" }
```

`.mjs` is always ESM, `.cjs` is always CommonJS, regardless of that field.

### Live bindings are the real difference

```typescript
// counter.ts
export let count = 0;
export const increment = (): void => { count += 1; };
```

```typescript
import { count, increment } from './counter.js';
increment();
console.log(count); // 1 — the binding is re-read
```

The CommonJS equivalent logs `0`, because `const { count } = require('./counter')` copies the
number at import time. This is why a CommonJS module that reassigns `module.exports` after an
async step appears empty to whoever imported it first.

### The module cache

A module executes **once per resolved path** and its exports are cached. That is what makes the
singleton pattern work — and what makes it fragile.

```typescript
// db.ts runs once; every importer gets the same pool.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

> ⚠️ Two copies of a package in `node_modules` are two cache entries and two singletons. This is
> the usual cause of "my `instanceof` check fails" and of two open connection pools.

Because the cache is keyed by resolved path, `./utils` and `./utils.js` are the same entry, but
`./Utils.js` on a case-insensitive filesystem may not be.

### Circular dependencies

CommonJS hands the requiring module a **partially populated** `exports` object — whatever had
been assigned before the cycle closed. So the symptom is `undefined` at call time, not an error.

```typescript
// a.ts
const { b } = require('./b'); // b is {} here
exports.a = (): void => b();  // works later, because it is read on call
```

ESM hoists function declarations, so cycles between functions usually work; cycles that read a
`const` at module scope throw `ReferenceError: Cannot access before initialization`. In both
cases the cycle is a design smell — extract the shared piece into a third module.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| New service, Node 22 or later | ESM | Top-level `await`, one mode, matches the front end |
| Library published for both | ESM source, dual build | Consumers on either mode work |
| Existing large CommonJS app | Stay CommonJS | A partial migration is worse than either end state |
| A file that must be loaded by `require` | `.cjs` | Explicit beats a `package.json` guess |

For TypeScript targeting ESM, the settings that matter are
`"module": "nodenext"` and `"moduleResolution": "nodenext"`. Under those, relative imports need
the `.js` extension **in the TypeScript source**, even though the file on disk is `.ts`. It
looks wrong and it is correct — the extension refers to the emitted file.

## Interop

**ESM importing CommonJS** works, with one caveat: only the default export is guaranteed.

```typescript
import express from 'express';              // ✅ module.exports becomes default
import { Router } from 'express';           // ⚠️ works only if Node's static analysis finds it
const { Router } = await import('express'); // ✅ always works
```

**CommonJS importing ESM** cannot use `require` for a genuinely async module graph. Use dynamic
import:

```typescript
const { render } = await import('./render.js');
```

Node 22 added `require()` of synchronous ESM, which covers many cases, but a module using
top-level `await` still throws. Do not rely on it in a library.

### Dual packages

Publishing both builds means the `exports` map does the routing:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

The hazard is the **dual package hazard**: a consumer can load both builds, giving two copies of
every class and every module-level cache. Keep state out of dual-published modules.

## Common Mistakes

**❌ Reaching for `__dirname` in ESM**

```typescript
const file = path.join(__dirname, 'seed.json'); // ReferenceError
```

**✅ Use `import.meta`**

```typescript
const file = path.join(import.meta.dirname, 'seed.json');
```

**❌ Side effects at module scope.** Opening a database connection or reading a secret when the
module is imported makes the module untestable and couples startup order to import order. Export
a factory instead.

**❌ Barrel files in a large app.** `export * from './x'` in an `index.ts` forces every importer
to load the whole directory, which slows cold start and defeats tree shaking.

## 🔑 Key Takeaways

- CommonJS resolves at runtime; ESM resolves at parse time, and every other difference follows from that.
- ESM exports are live bindings; CommonJS exports are values copied at import time.
- A module runs once per resolved path, so two copies in `node_modules` mean two singletons.
- ESM requires file extensions on relative imports — including in TypeScript source under `nodenext`.
- Named imports from CommonJS are best-effort; the default import always works.

## Interview Questions

**Q: Why can ESM be tree-shaken and CommonJS cannot?**

ESM imports are static — the specifier is a string literal resolved before execution, so a
bundler can prove which exports are unused. `require` is a normal function call whose argument
can be computed, so no tool can prove anything about it without running the code.

**Q: A colleague sees `undefined` for a function imported from a circular CommonJS dependency. What happened?**

The cycle closed before that export was assigned, so `require` returned a partially populated
`exports` object and the destructure captured `undefined`. Calling through `module.exports.fn` at
call time would have worked, but the real fix is to break the cycle by extracting the shared
dependency.

**Q: When would you keep a service on CommonJS in 2027?**

When it is large, stable, and depends on packages or tooling that only ship CommonJS — some
instrumentation and mocking libraries still hook `require`. A half-migrated codebase pays the
interop cost everywhere and gets none of the benefit, so migrate wholesale or not at all.

## What to Read Next

- [Chapter ?? — Error Handling in Node](#ch-nodejs-error-handling) — where a failed import surfaces
- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — how barrel files cost you cold start
