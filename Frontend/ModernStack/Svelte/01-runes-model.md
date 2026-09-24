---
title: The Runes Model, Components and Snippets
part: 3
chapter: 20
slug: svelte-runes
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-09-24
tags: [svelte, runes, signals, state, reactivity, snippets, components]
in_book: true
---

# The Runes Model, Components and Snippets {#ch-svelte-runes}

> Say which values are reactive, pass markup around as a value, and let the compiler update only the DOM nodes that depend on them.

**In this chapter:** what a rune actually is · `$state`, `$derived` and `$effect` · fine-grained updates against React's re-render · `$props` and `$bindable` · snippets in place of slots

## 💡 The Core Idea

A rune is not a function you call. It is a **compiler instruction** that looks like one. `$state(0)` never
runs at runtime. The compiler sees it, turns the variable into a signal, and rewrites every read and write.

That is why runes have no import: `$state` is syntax. It is also why reactivity in Svelte 5 is **per value,
not per component**. React re-runs a component function and compares the result. Svelte builds a graph of
which values feed which DOM nodes. Changing one value updates the nodes that read it, and nothing else runs.

Components follow the same idea. A **snippet** is markup with a name, and declaring one produces a value.
You pass it as a prop, like anything else. Svelte 4's slots were a separate mechanism; snippets delete it.

> ⚠️ **Moving target:** runes and snippets are Svelte 5. Svelte 4's `let` reactivity, `$:` statements,
> `writable` stores and `<slot />` still compile in legacy mode. Real codebases contain both, and search
> results mix them. The durable principle: reactivity is *declared*, and Svelte 5 declares it on the value.

## How It Works

### The four runes you use every day

| Rune       | Declares                            | Nearest React idea                  |
| ---------- | ----------------------------------- | ----------------------------------- |
| `$state`   | A value that can change              | `useState`, without the setter      |
| `$derived` | A value computed from other values   | A plain expression during render    |
| `$props`   | The component's inputs               | The `props` argument                |
| `$effect`  | Work to run after the DOM updates    | `useEffect`                         |

**A derived total, with no dependency array:**

```svelte
<script lang="ts">
  let quantity = $state(1);
  let unitPrice = $state(4.5);
  let total = $derived(quantity * unitPrice);
</script>

<input type="number" bind:value={quantity} />
<p>Total: {total.toFixed(2)}</p>
```

There is no dependency array and no memo. `total` records what it reads while it evaluates, so
refactoring the expression cannot silently break it. A derived value is **pulled, not pushed**: it is
marked stale, and recomputed the next time something reads it. Use `$derived.by` for multi-statement
computations.

### `$state` is deep, and that costs something

`$state` on an object or array returns a **proxy**. Mutating a nested property is reactive, so
`form.address.city = city` just works, with no spread and no setter.

A proxy is not the original object. Unwrap it with `$state.snapshot(form)` before handing it to
`structuredClone`, a charting library or a `fetch` body. Proxying a 10,000-row API response also costs
real time. `$state.raw` fixes that: the value is reactive when **reassigned**, and never proxied.

### `$effect` is the escape hatch

An effect runs after the DOM updates, tracks what it read, and re-runs when those values change. It exists
for **synchronising with things outside Svelte**: a canvas, a map, an event listener, an analytics call.

**An effect that drives a non-Svelte chart:**

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

> ⚠️ An `$effect` that writes state it also reads builds an infinite loop. If an effect's job is to set a
> value, that value should have been `$derived`.

### Fine-grained updates against React's re-render

| Dimension                   | React 19 (virtual DOM)          | Svelte 5 (compiled signals)           |
| --------------------------- | ------------------------------- | ------------------------------------- |
| Update granularity          | Component subtree               | Individual DOM node                   |
| Runtime shipped             | Larger — the reconciler         | Small — most logic compiles away      |
| Where mistakes cost you     | Re-render boundaries            | Effects that write state              |

React keeps the diff because a pure render can be thrown away and restarted, which concurrency and
Suspense need. Neither model is faster in general, and for most products it is not the constraint.

### `$props` and `$bindable`

Props are destructured from `$props()`. Defaults and rest use ordinary JavaScript syntax.

**A typed props declaration with one bindable prop:**

```svelte
<script lang="ts">
  let { label, value = $bindable("") }: { label: string; value?: string } = $props();
</script>
```

In Svelte 5, **no prop is two-way by default**. A parent writing `bind:value` needs the child to opt in
with `$bindable`. That reverses Svelte 4, and it catches people migrating.

### Snippets: `children` and named snippet props

Content between a component's tags arrives as a `children` prop. A snippet declared inside the tags
becomes a prop with that name. Together they replace `<slot />` and named slots.

**A panel with a required header and an optional footer:**

```svelte
<!-- Panel.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { header, children, footer }: { header: Snippet; children: Snippet; footer?: Snippet } = $props();
</script>

<section>
  <h2>{@render header()}</h2>
  <div>{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</section>
```

**The caller declares the named snippets inside the tags:**

```svelte
<Panel>
  {#snippet header()}Invoices{/snippet}
  <InvoiceTable {invoices} />
</Panel>
```

Because a snippet is a value, `{#if footer}` is a plain truthiness test. There is no `$$slots` object.

### Snippets take arguments, which is what `let:` was for

This is the headless pattern. The component owns the loop and the logic. The caller owns the markup for
one row. It is the direct equivalent of a render prop in React.

**A table that lets the caller render each row:**

```svelte
<!-- DataTable.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { rows, row, empty }: { rows: Invoice[]; row: Snippet<[Invoice]>; empty?: Snippet } = $props();
</script>

{#each rows as item}
  <tr>{@render row(item)}</tr>
{:else}
  {@render empty?.()}
{/each}
```

`Snippet<[T]>` is the type. The tuple lists the parameter types in order, so `Snippet<[Invoice, number]>`
takes two arguments and `Snippet` alone takes none.

A snippet is **not a component**. It has no state and no lifecycle; it is a closure over its declaring
scope. If the markup needs its own `$state` or `$effect`, make it a component.

> ⚠️ A snippet declared inside `{#each}` closes over that iteration's variables. Rendered later, it shows
> the values it captured — usually what you want, and occasionally very confusing.

## When to Use It

| You want                                    | Reach for                     | Not                        |
| ------------------------------------------- | ----------------------------- | -------------------------- |
| A value computed from other values           | `$derived` or `$derived.by`   | `$effect` that assigns     |
| A large, read-only payload                   | `$state.raw`                  | `$state` — the proxy costs |
| To hand state to a non-Svelte library        | `$state.snapshot`             | The proxy itself           |
| Two-way binding from a parent                | `$bindable` on the prop       | `bind:` alone              |
| Markup passed into a component               | A snippet prop or `children`  | `<slot />`                 |
| Markup that owns state or an effect          | A component                   | A snippet                  |

## Common Mistakes

**❌ Using `$effect` to keep one piece of state in sync with another.** That adds a render pass and a loop
risk. **✅ `let full = $derived(`${first} ${last}`)`** — one line, no lifecycle.

**❌ Passing `$state` objects straight to an external library.** They are proxies. `structuredClone`
throws and deep-equality checks misbehave. Snapshot first.

**❌ Calling `{@render children()}` when the prop is optional.** Use `{@render children?.()}`, or the
render throws when nothing was passed.

## 🔑 Key Takeaways

- Runes are compiler syntax, not imported functions, which is why they need no dependency array.
- `$state` is deeply reactive through a proxy, so snapshot it before handing it to code outside Svelte.
- `$derived` is the default and `$effect` is the exception, reserved for talking to things outside Svelte.
- Props are one-way unless the child declares `$bindable`.
- A snippet is markup as a value; `children` and snippet props replace slots, and a snippet has no state of its own.

## Interview Questions

**Q: What is a rune, and why does it not need a dependency array?**

It is compiler syntax. `$state` and `$derived` are compiled into signal reads and writes. Dependencies
are recorded as the expression actually evaluates, not declared by hand. That removes the bugs where a
hook's dependency list drifts from the code above it.

**Q: Why is `$effect` the wrong tool for computing a value?**

It runs after the DOM has updated, so the value is always one pass behind, and an effect that writes
state can retrigger itself. `$derived` computes lazily on read and cannot loop. Effects are for reaching
outside Svelte.

**Q: How does Svelte 5's update model differ from React's, and does it matter?**

React re-runs the component and diffs the output, so work scales with what re-rendered. Svelte updates
the exact nodes that read a changed value. React keeps the diff because replayable renders power
concurrency. For most products, team, ecosystem and rendering strategy decide more than the model does.

**Q: How would you build a table component that lets the caller render each row?**

Take the data as a prop and a `Snippet<[Row]>` for the row. The component owns the loop, the empty state
and any sorting; the caller writes the cells in `{#snippet row(item)}`. It is React's render prop pattern.

**Q: When is something a snippet rather than a component?**

When it has no state of its own. A snippet is a closure with no lifecycle, so it suits markup the caller
supplies and the callee positions. Once it needs its own `$state` or an effect, make it a component.

## What to Read Next

- [Chapter ?? — SvelteKit Routing and Loading](#ch-sveltekit-routing-and-loading) — where these components get their data
- [Chapter ?? — When Not to Use Effect](#ch-when-not-to-use-effect) — the same argument about effects, in React
- [Chapter ?? — React Composition Patterns](#ch-react-composition-patterns) — render props, the React version of snippets
