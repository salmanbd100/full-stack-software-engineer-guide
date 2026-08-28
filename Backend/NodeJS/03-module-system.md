# The Node.js Module System {#ch-node-module-system}

> Work in a codebase where CommonJS and ES modules meet, without guessing which rules apply.

**In this chapter:** the core difference · live bindings vs copies · the module cache · circular dependencies · interop · dynamic import

## 💡 Two Module Systems, One Runtime

Node started with **CommonJS** (`require`) years before JavaScript had a standard. Then the language shipped **ES Modules** (`import`). Node now supports both, and the seams between them are where the bugs live.

> Write ESM for anything new. Understand CommonJS because you'll spend your career reading it.

---

## The Core Difference

CommonJS resolves imports **while the code runs**. ESM resolves them **before any code runs**.

```typescript
// CommonJS — this is legal, it's just a function call
if (process.env.NODE_ENV === "production") {
  const metrics = require("./metrics");   // runs at this moment
}

// ESM — this is a syntax error
if (condition) {
  import { metrics } from "./metrics";    // ❌ imports are not statements
}
```

That single difference explains almost everything else:

| | CommonJS | ES Modules |
| --- | --- | --- |
| **Resolved** | At runtime | Before execution |
| **Loading** | Synchronous | Asynchronous |
| **Conditional import** | Just an `if` | `await import()` only |
| **Tree shaking** | ❌ Not possible | ✅ Statically analysable |
| **Top-level `await`** | ❌ | ✅ |
| **`__dirname`** | ✅ Available | Use `import.meta.dirname` |
| **File extension in path** | Optional | **Required** |

⚠️ **The extension rule bites everyone moving to ESM.** `import "./utils"` fails; it must be `import "./utils.js"` — and in TypeScript you still write `.js`, because that's what exists after compilation.

---

## Bindings vs Copies

CommonJS gives you a **copy** of the value at import time. ESM gives you a **live binding** to the variable.

```typescript
// counter.ts
export let count = 0;
export const bump = (): void => { count += 1; };
```

```typescript
// ESM — sees the update
import { count, bump } from "./counter.js";
bump();
console.log(count);   // ✅ 1

// CommonJS equivalent — got a snapshot of 0
const { count, bump } = require("./counter");
bump();
console.log(count);   // ❌ still 0
```

> This is a real interview question. Destructuring a CommonJS export freezes the value; ESM keeps it live.

---

## Module Caching

A module's body runs **once**. Every later import gets the same cached instance — which is why a plain exported object is already a singleton.

```typescript
// db.ts — one pool for the whole process
class Pool {
  constructor() { console.log("pool created"); }
}
export const pool = new Pool();
```

Import it from twenty files and `"pool created"` prints once.

⚠️ **The cache key is the resolved file path.** Two copies of a package in `node_modules`, or the same file reached through a symlink, are two separate modules with separate state. This is the usual cause of "my singleton isn't a singleton" and duplicate-React-style errors.

```typescript
// CommonJS lets you inspect and clear the cache — mostly a testing hack
delete require.cache[require.resolve("./config")];
```

ESM has no cache-busting API. In tests, use your test runner's module mocking instead.

---

## Circular Dependencies

Both systems allow cycles. Neither makes them pleasant.

```typescript
// a.ts
import { b } from "./b.js";
export const a = "A";

// b.ts
import { a } from "./a.js";
export const b = "B";
console.log(a);   // ⚠️ undefined in CJS; ReferenceError in ESM
```

- **CommonJS** hands you a partially-filled `exports` object — you get `undefined` and a bug that surfaces later
- **ESM** hoists declarations, so you get a loud `ReferenceError` at the point of use

> ✅ ESM failing loudly is the better outcome. A cycle is a design smell: extract the shared piece into a third module, or invert the dependency.

---

## Picking a Mode

The `"type"` field in `package.json` decides what `.js` means:

```json
{
  "type": "module"
}
```

| `"type"` | `.js` is | `.mjs` | `.cjs` |
| --- | --- | --- | --- |
| `"module"` | ESM | ESM | CommonJS |
| `"commonjs"` or absent | CommonJS | ESM | CommonJS |

### `exports` — define your public API

`main` is legacy. `exports` controls exactly what consumers may reach, and blocks deep imports into your internals.

```json
{
  "name": "@acme/toolkit",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./validators": "./dist/validators.js",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "engines": { "node": ">=20" }
}
```

With this in place, `import "@acme/toolkit/dist/internal/secret.js"` throws instead of quietly coupling a consumer to your file layout.

⚠️ **`types` must come first** in each condition block — TypeScript takes the first match.

---

## Interop

**ESM importing CommonJS** works, but named exports are only detected by static analysis. When it fails, take the default and destructure:

```typescript
import pkg from "legacy-package";   // ✅ always works
const { helper } = pkg;
```

**CommonJS importing ESM** used to require `await import()`. Since Node 20.19 / 22.10, `require()` of a synchronous ES module works directly:

```typescript
const esm = require("./modern.mjs");   // ✅ modern Node
const esm = await import("./modern.mjs");  // ✅ works everywhere, always safe
```

> ⚠️ `require()` of ESM still fails if the target uses top-level `await` — there's nothing to synchronously wait on. `await import()` remains the portable choice.

**`__dirname` in ESM:**

```typescript
// ✅ Node 20.11+
const here = import.meta.dirname;

// Portable fallback
import { fileURLToPath } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
```

---

## Dynamic Import

`import()` returns a promise and works in both systems. Use it to defer expensive dependencies:

```typescript
async function renderPdf(doc: Document): Promise<Buffer> {
  const { PdfKit } = await import("pdfkit");   // 40 MB, loaded only when needed
  return new PdfKit().render(doc);
}
```

> This keeps startup fast on serverless, where cold-start time is billed and user-visible.

---

## Interview Q&A

**Q: `require` vs `import` — what actually differs?**
A: Timing and shape. `require` is a synchronous function call resolved at runtime, so it can be conditional and can be cached-busted. `import` is a static declaration resolved before execution, which is what makes tree shaking and top-level `await` possible. ESM also gives live bindings rather than a copied value.

**Q: How does Node's module cache work?**
A: Each module executes once, keyed by its fully resolved path, and every later import receives the same exports object. That's why exporting an instance gives you a process-wide singleton. The gotcha is that two paths to the same logical module — duplicate installs, symlinks — produce two independent instances.

**Q: How do you handle circular dependencies?**
A: Fix the design rather than working around it. Extract the shared code into a third module, or pass the dependency in instead of importing it. If you must live with one, move the import inside the function so it resolves after both modules finish loading. ESM at least fails immediately with a `ReferenceError` instead of silently handing you `undefined`.

**Q: Why won't my named import from a CommonJS package work?**
A: Node detects CommonJS named exports by statically analysing the file. If exports are built dynamically — assigned in a loop, or via `Object.assign` — the analysis finds nothing. Import the default and destructure from it.

**Q: What does `exports` in package.json buy you?**
A: It's an encapsulation boundary. Only the paths you list are importable, so you can restructure internals without breaking consumers. It also supports conditional resolution, so one package can ship ESM and CommonJS builds and let Node pick.

---

## Best Practices

✅ Use ESM for new code; set `"type": "module"` explicitly
✅ Define `exports` in every package you publish, with `types` listed first
✅ Include file extensions in relative ESM imports
✅ Use `import.meta.dirname` instead of recreating `__dirname`
✅ Use dynamic `import()` for large, rarely-used dependencies
✅ Break cycles by extracting shared code, not by reordering imports
❌ Don't mix `require` and `import` in the same file
❌ Don't rely on destructured CommonJS exports staying current
❌ Don't publish with `main` alone if consumers need both module formats

---

[← Previous: Streams & Buffers](./02-streams-buffers.md) | [Next: Error Handling →](./04-error-handling.md)
