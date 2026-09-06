---
title: Svelte 5 and the Runes Model
part: 3
chapter: 0
slug: svelte-runes
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [svelte, runes, signals, state, reactivity]
in_book: true
---

# Svelte 5 and the Runes Model {#ch-svelte-runes}

> Say which values are reactive, and let the compiler work out exactly which DOM nodes depend on them.

**In this chapter:** what a rune actually is · `$state` and its depth · `$derived` against `$effect` · `$props` and `$bindable` · reactive state outside a component

## 💡 The Core Idea

A rune is not a function you call. It is a **compiler instruction** that happens to look like one.
`$state(0)` is never invoked at runtime — the compiler sees it, rewrites the variable into a signal, and
rewrites every read and write of that variable into signal operations.

That is why runes have no import. There is nothing to import; `$state` is syntax. And it is why
reactivity in Svelte 5 is **per value, not per component**. React re-runs a component function and
compares the result. Svelte compiles a graph of which values feed which DOM nodes, so changing one value
updates the nodes that read it and runs nothing else.

> ⚠️ **Moving target:** runes are Svelte 5. Svelte 4's implicit `let` reactivity, `$:` statements and
> `writable` stores still compile in legacy mode, so real codebases contain both, and search results will
> mix them freely. The durable principle is that reactivity has to be *declared* somewhere — Svelte 5
> moved the declaration from the file's position to the value itself.

## How It Works

### The four runes you use every day

| Rune       | Declares                            | Nearest React idea                  |
| ---------- | ----------------------------------- | ----------------------------------- |
| `$state`   | A value that can change              | `useState`, without the setter      |
| `$derived` | A value computed from other values   | A plain expression during render    |
| `$props`   | The component's inputs               | The `props` argument                |
| `$effect`  | Work to run after the DOM updates    | `useEffect`                         |

```svelte
<script lang="ts">
  let quantity = $state(1);
  let unitPrice = $state(4.5);
  let total = $derived(quantity * unitPrice);
</script>

<input type="number" bind:value={quantity} />
<p>Total: {total.toFixed(2)}</p>
```

There is no dependency array and no memo. `total` knows it reads `quantity` and `unitPrice` because it
was **evaluated** and the reads were recorded — tracking is at runtime, so refactoring the expression
cannot silently break it.

### `$state` is deep, and that costs something

`$state` on an object or array returns a **proxy**. Mutating a nested property is reactive, which is what
makes Svelte code read like plain JavaScript:

```svelte
<script lang="ts">
  let form = $state({ name: "", address: { city: "" } });

  function setCity(city: string): void {
    form.address.city = city; // reactive, no spread, no setter
  }
</script>
```

Two consequences follow. A proxy is not the original object, so anything handed to an external library —
`structuredClone`, a charting library, a `fetch` body — should be unwrapped with `$state.snapshot(form)`
first. And proxying a 10,000-row API response costs real time for reactivity nobody needs, which is what
`$state.raw` is for: the value is reactive when **reassigned**, and not proxied at all.

| Rune            | Reactive on                | Use for                                  |
| --------------- | -------------------------- | ---------------------------------------- |
| `$state`        | Mutation and reassignment  | Forms, editable models, most things       |
| `$state.raw`    | Reassignment only          | Large lists, immutable data from the wire |
| `$state.snapshot` | — (returns a plain copy) | Handing state to code outside Svelte      |

### `$derived` is pulled, not pushed

A derived value is not recomputed when its inputs change. It is marked stale, and recomputed **the next
time something reads it**. If the recomputed result is referentially identical to the last one, nothing
downstream updates at all.

This is why `$derived` is almost always the right answer and `$effect` almost always the wrong one for
computing a value. Use `$derived.by` when the computation needs statements rather than one expression:

```svelte
<script lang="ts">
  let items = $state<Array<{ price: number; qty: number }>>([]);

  let summary = $derived.by(() => {
    let total = 0;
    for (const item of items) total += item.price * item.qty;
    return { total, count: items.length };
  });
</script>
```

### `$props` and `$bindable`

Props are destructured from `$props()`, with defaults and rest handled by ordinary JavaScript syntax:

```svelte
<script lang="ts">
  interface Props {
    label: string;
    variant?: "primary" | "ghost";
    value?: string;
  }

  let { label, variant = "primary", value = $bindable("") }: Props = $props();
</script>
```

`$bindable` is the notable one. In Svelte 5 **no prop is two-way by default** — a parent writing
`bind:value` needs the child to have opted in. That reverses Svelte 4, and it is the change that catches
people migrating: `bind:` silently becoming one-way is a compile error now, not a runtime surprise.

### `$effect` is the escape hatch

An effect runs after the DOM has updated, tracks whatever it read, and re-runs when those values change.
It exists for **synchronising with things outside Svelte**: a canvas, a map instance, an event listener,
an analytics call.

```svelte
<script lang="ts">
  let chart = $state<HTMLCanvasElement | undefined>();
  let data = $state<number[]>([]);

  $effect(() => {
    if (!chart) return;
    const instance = drawChart(chart, data); // reads `data`, so re-runs when it changes
    return () => instance.destroy(); // teardown, like useEffect's cleanup
  });
</script>
```

> ⚠️ Writing state inside an `$effect` that the same effect reads is how you build an infinite loop.
> If an effect's job is to set a value, the value should have been `$derived`.

### Reactive state outside a component

Rune syntax works in any file named `.svelte.ts` (or `.svelte.js`), which is how shared state is written
now — no store, no `subscribe`, the same syntax as inside a component:

```typescript
// lib/cart.svelte.ts
export const cart = $state({ items: [] as string[] });

export function add(item: string): void {
  cart.items.push(item);
}
```

One rule governs this file. **Export an object and mutate its properties, or export functions.** You
cannot export a reassignable `let` and have importers see updates, because the compiler rewrites reads
and writes one file at a time and cannot reach across the import.

## When to Use It

| You want                                | Reach for               | Not                        |
| --------------------------------------- | ----------------------- | -------------------------- |
| A value the user can change              | `$state`                | —                          |
| A value computed from other values       | `$derived`              | `$effect` that assigns     |
| A multi-statement computation            | `$derived.by`           | `$effect` that assigns     |
| A large, read-only payload               | `$state.raw`            | `$state` — the proxy costs |
| To talk to a non-Svelte library          | `$effect` + `$state.snapshot` | `$state` passed raw   |
| Shared state across routes               | A `.svelte.ts` module   | A Svelte 4 store           |
| Two-way binding from a parent            | `$bindable` on the prop | `bind:` alone              |

## Common Mistakes

**❌ Using `$effect` to keep one piece of state in sync with another.** That is a derived value with extra
steps, and it introduces an extra render pass plus a loop risk.

**✅ `let full = $derived(`${first} ${last}`)`** — one line, no lifecycle.

**❌ Passing `$state` objects straight to an external library.** They are proxies. `structuredClone`
throws, deep-equality checks misbehave, and serialisation picks up traps. Snapshot first.

**❌ Exporting a reassignable `let` from a `.svelte.ts` module.** Importers get a stale value or, in
development, an object where they expected a number. Export an object or a getter.

**❌ Assuming `bind:` still works without `$bindable`.** Svelte 5 made two-way binding opt-in on the
child side.

**❌ Wrapping a 5,000-item response in `$state`.** Every object in it gets proxied on access. `$state.raw`
gives you reassignment reactivity for none of the cost.

## 🔑 Key Takeaways

- Runes are compiler syntax, not imported functions, which is why they need no dependency array.
- `$state` is deeply reactive through a proxy — snapshot before handing it to anything outside Svelte.
- `$derived` is recomputed on read and skipped when the result is unchanged; it is the default, and `$effect` is the exception.
- Props are one-way unless the child declares `$bindable`.
- `.svelte.ts` files carry rune syntax, so shared state needs no store — but exports must be objects or functions.

## Interview Questions

**Q: What is a rune, and why does it not need a dependency array?**

It is compiler syntax. `$state` and `$derived` are read at build time and compiled into signal reads and
writes, so dependencies are recorded as the expression actually evaluates rather than being declared by
hand. That removes the whole class of bugs where a hook's dependency list drifts from the code above it.

**Q: When would you choose `$state.raw` over `$state`?**

When the value is large and replaced wholesale rather than edited in place — a list of rows from an API,
a parsed document, anything read-only. `$state` proxies the object deeply so that nested mutation is
tracked, and that tracking is wasted work if nothing ever mutates. `$state.raw` keeps reassignment
reactive and skips the proxy entirely.

**Q: Why is `$effect` the wrong tool for computing a value?**

Because it runs after the DOM has already updated, so the computed value is always one pass behind, and
because an effect that writes state can retrigger itself. `$derived` computes lazily on read, skips
downstream work when the result is unchanged, and cannot loop. Effects are for reaching outside
Svelte — a canvas, a subscription, a third-party widget.

**Q: How do you share reactive state between routes without a store?**

Put it in a `.svelte.ts` module and use runes there. The one constraint is the export: the compiler
rewrites reads and writes within a single file, so a reassignable `let` cannot be observed by an
importer. Export a `$state` object and mutate its properties, or export accessor functions.

## What to Read Next

- [Chapter ?? — Reactivity Compared](#ch-reactivity-compared) — what this model costs against a virtual DOM
- [Chapter ?? — Components and Snippets](#ch-svelte-snippets) — passing markup once slots are gone
- [Chapter ?? — When Not to Use Effect](#ch-when-not-to-use-effect) — the same argument, in React
