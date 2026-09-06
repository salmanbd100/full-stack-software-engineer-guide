---
title: Components and Snippets
part: 3
chapter: 0
slug: svelte-snippets
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-06
tags: [svelte, snippets, slots, composition, components]
in_book: true
---

# Components and Snippets {#ch-svelte-snippets}

> Name a chunk of markup, pass it around like any other value, and render it where it belongs.

**In this chapter:** what replaced slots · `children` · snippets that take arguments · typing them · what a snippet is not

## 💡 The Core Idea

A snippet is **markup with a name and, optionally, parameters**. Declaring one produces a value. That
value can be passed as a prop, stored in a variable, chosen with a ternary, or rendered twice.

Svelte 4's slots were not values. They were a separate mechanism with their own syntax for naming
(`slot="header"`), their own syntax for passing data back up (`let:item`), and their own rules. Snippets
delete all of it: markup became a first-class thing you can hold, and the ordinary rules about props
took over.

If you know React, the closest analogy is a render prop — a function returning markup, passed in as a
prop. The difference is that a snippet is declarative syntax rather than a function you write by hand.

## How It Works

### Declaring and rendering

```svelte
<script lang="ts">
  let items = $state(["alpha", "beta"]);
</script>

{#snippet badge(text: string)}
  <span class="badge">{text}</span>
{/snippet}

{#each items as item}
  {@render badge(item)}
{/each}
```

`{#snippet name(args)}` declares; `{@render name(args)}` renders. Nothing else is involved.

### `children` is the default snippet

Content placed between a component's tags arrives as a prop called `children`:

```svelte
<!-- Button.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, onclick }: { children: Snippet; onclick?: () => void } = $props();
</script>

<button {onclick}>{@render children()}</button>
```

```svelte
<Button onclick={save}>Save changes</Button>
```

This is the whole replacement for `<slot />`. Use `{@render children?.()}` when the content is optional —
the prop is `undefined` if the caller passed nothing, and the optional call renders nothing rather than
throwing.

### Named slots become named props

A snippet declared inside a component's tags becomes a prop with that name:

```svelte
<!-- Panel.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    header: Snippet;
    children: Snippet;
    footer?: Snippet;
  }

  let { header, children, footer }: Props = $props();
</script>

<section>
  <h2>{@render header()}</h2>
  <div>{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</section>
```

```svelte
<Panel>
  {#snippet header()}Invoices{/snippet}
  {#snippet footer()}<a href="/invoices/new">New invoice</a>{/snippet}

  <InvoiceTable {invoices} />
</Panel>
```

Note what happened to the `footer` check. Because a snippet is a value, `{#if footer}` is a plain
truthiness test — there is no `$$slots` object and no special API for asking whether content was passed.

### Snippets take arguments, which is what `let:` was for

The pattern that makes headless components possible: the component owns the logic and the loop, the
caller owns the markup for one row.

```svelte
<!-- DataTable.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props<T> {
    rows: T[];
    row: Snippet<[T]>;
    empty?: Snippet;
  }

  let { rows, row, empty }: Props<Invoice> = $props();
</script>

{#if rows.length}
  <table>
    <tbody>
      {#each rows as item}
        <tr>{@render row(item)}</tr>
      {/each}
    </tbody>
  </table>
{:else}
  {@render empty?.()}
{/if}
```

```svelte
<DataTable rows={invoices}>
  {#snippet row(invoice)}
    <td>{invoice.reference}</td>
    <td>{formatMoney(invoice.total)}</td>
  {/snippet}
  {#snippet empty()}<p>No invoices this month.</p>{/snippet}
</DataTable>
```

`Snippet<[T]>` is the type: the array holds the parameter types, so `Snippet<[Invoice, number]>` is a
snippet taking two arguments and `Snippet` alone takes none.

### What a snippet is not

It is not a component. A snippet has **no state of its own, no lifecycle, and no props object** — it is a
closure over the scope where it was declared, so it reads that scope's variables directly.

That is the whole selection rule. If the markup needs its own `$state`, an `$effect`, or a file of its
own, it is a component. If it is markup that belongs to the caller but is rendered by the callee, it is a
snippet.

> ⚠️ A snippet declared inside `{#each}` closes over that iteration's variables. Passing it upward and
> rendering it after the loop has moved on gives you the values it captured, which is usually what you
> want and occasionally very confusing.

## When to Use It

| You need                                          | Use                          |
| ------------------------------------------------- | ---------------------------- |
| Markup passed into a component                     | A snippet prop               |
| The default content between tags                   | `children`                   |
| The caller to render one row of the callee's data  | `Snippet<[Row]>`             |
| Repeated markup within one component               | A local snippet, rendered twice |
| Markup that owns state or an effect                | A component                  |
| To ask whether the caller supplied something       | `{#if name}` — it is a value |

## Common Mistakes

**❌ Reaching for a component for every fragment.** A snippet costs one block and no file. Components
earn their overhead when they own state.

**❌ Calling `{@render children()}` when the prop is optional.** Use `{@render children?.()}`, or the
render throws when nothing was passed.

**❌ Expecting a snippet to have its own reactive state.** It closes over the declaring scope. State
belongs to the component that declares it.

**❌ Recreating `$$slots`.** There is no slot registry any more. A snippet prop is `undefined` when it
was not supplied, so `{#if header}` is the whole test.

**❌ Leaving `<slot />` in a migrated component.** It still compiles in legacy mode, which means a
codebase can carry both mechanisms for years and nobody notices which file uses which.

## 🔑 Key Takeaways

- A snippet is markup as a value: passable, storable, renderable more than once.
- `children` is the default snippet and replaces `<slot />` entirely.
- `Snippet<[T]>` types a snippet that takes arguments, which is what `let:` used to do.
- Snippets have no state and no lifecycle — that is the line between a snippet and a component.
- Because snippets are ordinary props, checking whether one was passed is a plain `{#if}`.

## Interview Questions

**Q: How do you pass markup into a Svelte 5 component?**

As a snippet. Content between the tags arrives as a `children` prop rendered with `{@render children()}`,
and anything else is declared with `{#snippet name()}` inside the component's tags, arriving as a prop of
that name. Slots and `let:` are gone; the replacement is ordinary props whose values happen to be markup.

**Q: When is something a snippet rather than a component?**

When it has no state of its own. A snippet is a closure over the scope that declared it, with no
lifecycle and no props object, so it is the right shape for markup the caller supplies and the callee
positions. As soon as the fragment needs its own `$state` or an effect, it wants to be a component.

**Q: How would you build a table component that lets the caller render each row?**

Take the data as a prop and a `Snippet<[Row]>` for the row. The component owns the loop, the empty state
and any sorting; the caller passes `{#snippet row(item)}` and writes the cells. That is the headless
pattern — logic in the component, presentation with the caller — and it is the direct equivalent of a
render prop in React.

**Q: What does `Snippet<[T]>` mean, and why is the parameter a tuple?**

It types a snippet that is rendered with arguments, and the tuple lists them in order — `Snippet` takes
none, `Snippet<[Invoice]>` takes one, `Snippet<[Invoice, number]>` takes two. A tuple rather than a
single type is what makes multiple parameters expressible with one generic.

## What to Read Next

- [Chapter ?? — Svelte 5 and the Runes Model](#ch-svelte-runes) — where the state a snippet reads comes from
- [Chapter ?? — React Composition Patterns](#ch-react-composition-patterns) — render props, the same idea in React
- [Chapter ?? — SvelteKit Routing and Loading](#ch-sveltekit-routing-and-loading) — where these components get their data
