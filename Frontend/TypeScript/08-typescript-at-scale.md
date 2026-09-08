---
title: TypeScript at Scale
part: 1
chapter: 0
slug: typescript-at-scale
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-08
tags: [typescript, strict, satisfies, module-resolution, declaration-files, migration]
in_book: true
---

# TypeScript at Scale {#ch-typescript-at-scale}

> Turn on `strict` in a codebase that was never written for it, use `satisfies` instead of an annotation, and say when a type is costing more than it returns.

**In this chapter:** the language against the engineering · migrating to `strict` one flag at a time · `satisfies` and what it fixes · module resolution and `verbatimModuleSyntax` · types that get expensive · when to stop

## 💡 The Core Idea

Chapters 01 to 07 are the language. This one is the **engineering**: what changes when the codebase is
large, old, and shared — because at that point every question is about cost rather than expressiveness.

Two costs matter and they pull in opposite directions. A type that is more precise catches more bugs
and takes longer to check, and a type that is more clever catches more bugs and takes longer for the
next person to read. A senior answer here is never "make it as precise as possible" — it is knowing
which errors a type is buying and at what price.

The other half is that a large codebase is almost never `strict` from the start. It gets there by
migration, and having a migration plan that is not "turn it on and fix 4,000 errors" is one of the more
reliably asked questions on this topic.

## How It Works

### `strict` is seven flags, and they go on one at a time

`"strict": true` enables a group. Turning the group on at once in an existing codebase produces
thousands of errors and no path through them. Turning the flags on individually produces a sequence of
finishable pieces of work.

| Flag | What it catches | Migration cost |
| ---- | --------------- | -------------- |
| `noImplicitAny` | Parameters and members with no type | High — but it is where the value is |
| `strictNullChecks` | `null` and `undefined` used as if they were not | Highest, and the most bugs found |
| `strictFunctionTypes` | Unsound parameter variance in callbacks | Low |
| `strictBindCallApply` | Wrong arguments through `bind`/`call`/`apply` | Low |
| `strictPropertyInitialization` | Class fields never assigned | Low, and mostly in older code |
| `noImplicitThis` | `this` of unknown type | Low |
| `useUnknownInCatchVariables` | `catch (e)` treated as `any` | Low, and mechanical |

**The order that works:** the four low-cost flags first, because they are quick wins that build
confidence. Then `noImplicitAny`. Then `strictNullChecks` last, on its own, because it is the one that
will surface real bugs and needs the attention.

For a codebase too large for even that, `strict: true` plus a per-file opt-out is the escape hatch —
but it must come with a ratchet, or the exclusion list becomes permanent:

```json
{
  "compilerOptions": { "strict": true },
  "exclude": [],
  "include": ["src/**/*"]
}
```

Then a CI check that counts files containing `// @ts-nocheck` or `// @ts-expect-error` and **fails when
the count goes up.** A number that can only fall is what turns a migration into something that
finishes; a list of exclusions with no gate is a list that grows.

Two useful flags sit outside `strict` and are worth turning on deliberately.
`noUncheckedIndexedAccess` makes `arr[i]` yield `T | undefined`, which is the truth but is noisy in
loop-heavy code; `exactOptionalPropertyTypes` separates "absent" from "present and `undefined`", and
breaks common spread patterns. Both are opt-in precisely because the cost is real.

### `satisfies` checks without widening

This is the addition that changed how configuration objects are typed, and it is asked about because
the reason it exists is subtle.

```typescript
type Route = { path: string; auth: boolean };

// ❌ An annotation checks the value, then throws the specifics away.
const routesAnnotated: Record<string, Route> = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
};
routesAnnotated.hoem; // no error — the key type is `string`

// ✅ `satisfies` checks against the type and keeps the literal type.
const routes = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
} satisfies Record<string, Route>;

routes.hoem; // Error: property does not exist
type RouteName = keyof typeof routes; // "home" | "admin"
```

The distinction in one line: **an annotation is a claim about what the variable is; `satisfies` is a
check that the value conforms.** With the annotation you get validation and lose the keys. With
`satisfies` you get both — and `keyof typeof` becomes a usable union, which is what makes it the right
tool for route tables, theme tokens, feature-flag maps and permission lists.

The same argument applies against `as const` alone, which preserves the literals but checks nothing.
`satisfies` is the combination, and `as const satisfies T` is a legitimate pairing when you also want
readonly.

### Module resolution, and the two flags that stop surprises

Module resolution is where a project that compiles locally fails in CI, or where an import works in
the bundler and not in `tsc`.

| `moduleResolution` | Use for |
| ------------------ | ------- |
| `bundler` | Anything built by Vite, esbuild, webpack — matches what bundlers actually do |
| `nodenext` | Code Node runs directly, where `package.json` `exports` and extensions are enforced |
| `node10` | Legacy only. It predates `exports` maps entirely |

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

`verbatimModuleSyntax` is the one to be able to explain. It requires `import type` for anything used
only as a type, and then emits imports exactly as written. Without it, the compiler decides which
imports to elide, and a value import that happened to be used only in a type position disappears —
taking its side effects with it. The flag makes the erasure explicit in the source instead of implicit
in the compiler.

`skipLibCheck` and project references belong to the build-time discussion in
[Chapter ?? — Type-Checking and Linting at Scale](#ch-type-checking-and-linting), which owns why type
checking does not parallelise and what a project graph does about it.

### Declaration files, when you have to write one

Most `.d.ts` files you write are for an untyped dependency or a non-code import.

```typescript
// types/untyped-lib.d.ts — a minimal, honest shim
declare module "legacy-charts" {
  export interface ChartOptions {
    data: number[];
    labels?: string[];
  }
  export function render(el: HTMLElement, options: ChartOptions): void;
}

// types/assets.d.ts — so importing an SVG type-checks
declare module "*.svg" {
  const src: string;
  export default src;
}
```

The rule for a shim: **type only what you call, and type it accurately.** A shim that declares the
whole library from guesswork is worse than no types, because the compiler now confidently agrees with
something wrong. `any` in one place you have not verified is more honest than an invented signature.

### When types start costing more than they return

Type-level computation is real computation, and it is single-threaded and re-run on every check.

```typescript
// ❌ A recursive conditional over a large union: compiles, and slowly.
type DeepPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? DeepPaths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`;
}[keyof T & string];

// ✅ Generate the union from the runtime source instead, or accept `string`.
```

Three signals that a type has gone past its value, and each one has a cheaper answer:

| Signal | The cheaper answer |
| ------ | ------------------ |
| Editor autocomplete takes seconds in one file | Simplify the type, or split the file |
| Only one person on the team can modify it | A validated runtime schema, with the type inferred from it |
| The error message is forty lines of nested conditionals | A narrower type and a runtime check at the boundary |

The last row is the general escape: a schema validator gives you a runtime check **and** an inferred
type from one declaration, which is usually both safer and cheaper than proving the same thing in the
type system. `tsc --generateTrace` will tell you which type is actually slow if you need evidence
rather than a hunch.

> ⚠️ **Moving target:** TypeScript adds and renames compiler flags every few releases, and the
> native-port compiler changes the performance arithmetic behind this section. The durable principle
> is that type-level work is single-threaded and re-run on every check, so precision has a measurable
> price. Verify flag names against the version you are on.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| A large codebase not on `strict` | The four cheap flags, then `noImplicitAny`, then `strictNullChecks` | Each step finishes; the group does not |
| A migration that has to run for months | `strict` plus a counted opt-out list that can only shrink | Without the ratchet the list is permanent |
| A route table, theme or flag map | `satisfies` | Validation and the literal keys |
| A discriminated union you want narrowed everywhere | An annotation | You want the wide type here |
| Data crossing a network or file boundary | A runtime schema with the type inferred | The compiler cannot check what it did not see |
| An untyped dependency | A shim covering only what you call | An invented signature is worse than `any` |
| A type nobody else can edit | Delete it and validate at runtime | The maintenance cost exceeded the bugs caught |

## Common Mistakes

❌ **Turning `strict: true` on across a large codebase in one commit.** Thousands of errors, no route
through them, and the branch is abandoned.
✅ One flag at a time, cheapest first, `strictNullChecks` last and alone.

❌ **A `@ts-nocheck` exclusion list with no gate.** It only ever grows.
✅ Count the suppressions in CI and fail when the number rises.

❌ **Annotating a configuration object with `Record<string, T>`.** The keys widen to `string` and typos
stop being errors.
✅ `satisfies`, which checks conformance and keeps the literal keys.

❌ **A hand-written `.d.ts` covering a whole untyped library.** The compiler now vouches for guesses.
✅ Declare only the surface you call; leave the rest genuinely unknown.

❌ **Proving an invariant in the type system when the data comes from the network.** Types are erased,
so the guarantee does not exist at runtime.
✅ Validate at the boundary and infer the type from the schema.

## 🔑 Key Takeaways

- `strict` is seven flags, and an existing codebase migrates by turning them on one at a time.
- A migration needs a suppression count that can only fall; without a gate the opt-out list is permanent.
- An annotation is a claim about the variable and widens it; `satisfies` is a check that keeps the literal type.
- `verbatimModuleSyntax` makes type-only erasure explicit in the source rather than a compiler decision.
- Type-level computation is single-threaded and re-run every check, so a clever type has a measurable price.

## Interview Questions

**Q: How would you get a 200,000-line codebase onto `strict`?**

Not in one commit. `strict` is seven flags, so I would turn on the four cheap ones first —
`strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis`, `useUnknownInCatchVariables` — then
`noImplicitAny`, then `strictNullChecks` on its own, because that is the one that surfaces real bugs
and deserves attention. If even that is too large, `strict: true` with per-file suppressions plus a CI
check that the suppression count only falls. The gate is the important part: without it the exclusion
list becomes the permanent state.

**Q: What does `satisfies` do that a type annotation does not?**

It checks the value against the type without widening it. An annotation says what the variable *is*, so
`Record<string, Route>` validates the entries and then throws away the specific keys — a typo in a
lookup stops being an error. `satisfies` validates the same way and keeps the literal type, so
`keyof typeof` gives you a real union of the keys. That is why it is the right tool for route tables,
theme tokens and permission maps.

**Q: When have types become too expensive?**

When the editor gets slow in one file, when only one person can safely modify a type, or when a
mismatch produces a forty-line error nobody can read. All three say the type has moved past what it
buys. The usual replacement is a runtime schema — one declaration gives both a runtime check and an
inferred type, which is safer for anything crossing a boundary and much cheaper to maintain.

## What to Read Next

- [Chapter ?? — TypeScript Advanced Types](#ch-advanced-types) — the type-level features whose cost this chapter prices
- [Chapter ?? — Type-Checking and Linting at Scale](#ch-type-checking-and-linting) — project references and keeping whole-program checks off the critical path
- [Chapter ?? — TypeScript at Scale in React](#ch-react-typescript-at-scale) — the same discipline applied to props, state and the server boundary
