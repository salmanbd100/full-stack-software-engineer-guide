---
title: Advanced CSS
part: 2
chapter: 0
slug: advanced-css
level: advanced # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-01
tags: [css, custom-properties, oklch, has, nesting, subgrid]
in_book: true
---

# Advanced CSS {#ch-advanced-css}

> Use the CSS that shipped across evergreen browsers since 2023, and say in an interview what each feature replaced.

**In this chapter:** custom properties as a runtime API · perceptual colour with `oklch` · `:has()` · `aspect-ratio` · native nesting · subgrid

## 💡 The Core Idea

A cluster of features landed between 2022 and 2024 that between them removed most of the reasons to
reach for a preprocessor or for JavaScript. Custom properties made CSS values dynamic. `oklch` made
colour maths behave the way eyes do. `:has()` let a parent respond to its children. Subgrid let
independent components share one set of tracks. The interview value is not that you can name them —
it is that you can say what each one deleted, because that is the same as knowing why it exists.

> The question behind each of these is "what did we used to do instead?" Answer that and the feature
> explains itself.

## How It Works

### Custom properties are a runtime API, not variables

A preprocessor variable is a constant that disappears at build time. A custom property lives in the
DOM, inherits, responds to media queries and pseudo-classes, and can be read and written from
JavaScript. That last point is the one that matters architecturally: it is the only way to pass a value
from JavaScript into CSS without writing inline style strings.

```css
:root {
  --brand: #2563eb;
  --space: 1rem;
}

.card {
  /* Scoped override: only this subtree sees the larger value. */
  --space: 1.5rem;
  padding: var(--space);
  color: var(--brand, #000); /* second argument is the fallback */
}

/* The value responds to context, which a build-time variable cannot do. */
@media (prefers-color-scheme: dark) {
  :root { --brand: #60a5fa; }
}
```

```typescript
const root: HTMLElement = document.documentElement;
root.style.setProperty('--brand', '#ef4444');
// Reading needs getComputedStyle — the property may be inherited rather than set here.
const current: string = getComputedStyle(root).getPropertyValue('--brand');
```

### Colour that behaves the way eyes do

`hsl` is readable and **not perceptually uniform**: yellow at 50% lightness looks far brighter than blue
at 50% lightness. Any ramp built by stepping HSL lightness therefore looks uneven, and dark-mode
inversion by flipping lightness produces muddy results.

```css
.button {
  --brand: oklch(60% 0.2 250);
  background: var(--brand);

  /* Derive states from one token instead of declaring five hex values. */
  border: 1px solid oklch(from var(--brand) calc(l - 0.15) c h);
}

.button:hover {
  background: color-mix(in oklch, var(--brand) 85%, white);
}
```

| Function | Reach for it when |
| -------- | ----------------- |
| `hsl()` | A human is picking one colour by hand |
| `oklch()` | Design tokens, ramps, gradients — anywhere steps must look even |
| `color-mix()` | Hover and active states derived from a single token |
| `oklch(from …)` | Borders and shadows that must track a base colour |

### `:has()` — the parent selector

Twenty years of "CSS cannot do that" ended here. `:has()` styles an element based on what it contains
or what follows it, which moves a whole category of logic out of JavaScript.

```css
.card:has(img) { display: grid; grid-template-columns: 100px 1fr; }
label:has(input:invalid) { color: #dc2626; }
body:has(dialog[open]) { overflow: hidden; }
.list:not(:has(.item)) { display: none; }
```

Each of those replaced an effect that toggled a class. The last two are the most valuable, because
"is the modal open" and "is the list empty" were state React had to hold purely so CSS could see it.

> ⚠️ Browsers implement `:has()` with invalidation tracking, so it is production-safe. The one shape to
> avoid is an unqualified `*:has(…)` over a very large tree, where the engine has no cheap way to narrow
> the candidate set.

### `aspect-ratio`

```css
/* ❌ The old hack: a percentage padding whose value nobody could read. */
.video { position: relative; padding-bottom: 56.25%; }

/* ✅ */
.video { aspect-ratio: 16 / 9; }
.avatar { aspect-ratio: 1; width: 48px; } /* height follows */
```

Reserving the ratio before the asset loads is also what stops the image contributing to layout shift.

### Native nesting

Nesting shipped natively in 2023, which removes one of the last standing arguments for a preprocessor.

```css
.card {
  padding: 1rem;

  & .title { font-size: 1.25rem; }
  &:hover { background: #f9fafb; }

  @media (min-width: 768px) { padding: 2rem; }
}
```

The readability rule from Sass carries over unchanged: two or three levels, no more. Deep nesting
produces long descendant selectors, and those are specificity you did not intend to create.

### Subgrid

Three cards in a row, each with a title, body and footer of different lengths. Before subgrid, lining
those up across the row meant measuring in JavaScript.

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto; /* title, body, footer */
}

.card {
  display: grid;
  grid-row: span 3;
  /* Adopt the parent's rows instead of creating new ones. */
  grid-template-rows: subgrid;
}
```

## When to Use It

| Need | Choose | Why |
| ---- | ------ | --- |
| Runtime theming, or a value JavaScript sets | Custom properties | The only bridge from JavaScript into CSS without inline styles |
| A colour ramp, or dark-mode inversion | `oklch` | Even steps in lightness look even |
| Styling a parent from its children's state | `:has()` | Removes state React held only so CSS could see it |
| Aligning rows across sibling components | Subgrid | The alternative is measuring in JavaScript |
| A value that never changes | Write the value | A custom property adds indirection for nothing |
| Deeply nested component styles | Two levels, then a new class | Nesting depth becomes specificity |

## Common Mistakes

**❌ Wrong — a custom property read as if it were a value:**

```typescript
// Empty string: inline styles do not include inherited custom properties.
const brand = document.documentElement.style.getPropertyValue('--brand');
```

**✅ Right — read the computed value:**

```typescript
const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
```

**❌ Wrong — treating custom properties as typed.** By default a custom property is a token stream, so
`--space: 1rem` cannot be animated and `calc()` will accept nonsense from it silently. `@property`
declares a syntax and an initial value, which makes the property animatable and validated.

**❌ Wrong — a ramp stepped in HSL.** `hsl(60 100% 50%)` and `hsl(240 100% 50%)` claim the same
lightness and differ enormously in perceived brightness, so a palette generated that way needs
hand-correction at every step.

## 🔑 Key Takeaways

- Custom properties live in the DOM, inherit, and respond to context, which makes them a runtime API rather than build-time variables.
- `oklch` is perceptually uniform, so equal steps in lightness look equal — that is what makes ramps and dark-mode inversion work.
- `:has()` moves parent-from-child styling into CSS and deletes the class-toggling effects that used to do it.
- Native nesting removes one of the last reasons to run a preprocessor, with the same depth discipline as before.
- Subgrid aligns tracks across sibling components, replacing JavaScript measurement.

## Interview Questions

**Q: Why prefer `oklch` over `hsl` for design tokens?**

Because HSL's lightness is not perceptual: yellow and blue at the same HSL lightness look nothing alike,
so a ramp stepped uniformly looks uneven and needs correcting by hand. `oklch` lightness tracks
perceived brightness, which makes generated ramps, dark-mode inversion by flipping lightness, and
contrast reasoning all behave. It also reaches colours outside sRGB on wide-gamut displays.

**Q: What did `:has()` let you delete?**

The class-toggling layer. Body scroll locking when a dialog opens, error styling on a field containing
an invalid input, empty-list states, and layout variants that depend on whether a card has an image —
all of those were React state and effects that existed only to make child state visible to CSS.

**Q: What is the difference between a custom property and a Sass variable?**

A Sass variable is substituted at build time and does not exist in the shipped stylesheet. A custom
property is a live DOM value: it inherits, it can be overridden per subtree, it responds to media
queries and pseudo-classes, and JavaScript can read and write it. Only the second one can support
runtime theming.

**Q: When is a custom property the wrong tool?**

For a value that never varies. Every `var()` is an indirection a reader has to resolve and a small
amount of work the engine has to do, and a token that is the same everywhere buys nothing for it. The
test is whether anything — a theme, a breakpoint, a subtree, a script — ever changes it.

## What to Read Next

- [Chapter ?? — CSS Fundamentals](#ch-css-fundamentals) — the cascade and cascade layers these features sit on
- [Chapter ?? — Responsive Design](#ch-responsive-design) — container queries, the other 2023 arrival
- [Chapter ?? — Right-to-Left Support](#ch-rtl-support) — logical properties in full
