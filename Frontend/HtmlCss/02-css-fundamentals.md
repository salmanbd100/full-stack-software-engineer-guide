---
title: CSS Fundamentals
part: 2
chapter: 0
slug: css-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-01
tags: [css, box-model, specificity, cascade, stacking-context, units]
in_book: true
---

# CSS Fundamentals {#ch-css-fundamentals}

> Read any stylesheet and predict which rule wins, why a box is the size it is, and which unit belongs where.

**In this chapter:** the box model and `box-sizing` · the cascade and specificity · inheritance and the reset keywords · stacking contexts · units · cascade layers

## 💡 The Core Idea

Almost every CSS bug that feels mysterious comes from one of three systems doing exactly what it was
designed to do: the box model deciding how large a box is, the cascade deciding which declaration wins,
or a stacking context deciding which element paints on top. None of them is complicated once you can
name the rule. What makes them feel arbitrary is guessing, and then raising specificity until the guess
works — which is how a stylesheet becomes unmaintainable.

> When a rule does not apply, the answer is always in the cascade order. When a box is the wrong size,
> it is `box-sizing`. When `z-index` is ignored, it is a stacking context.

## How It Works

### The box model

Every element is content, wrapped in padding, wrapped in a border, wrapped in margin. The only decision
that matters is what `width` refers to.

```css
/* Default: width is the content box. Padding and border are added to it. */
.a { box-sizing: content-box; width: 200px; padding: 20px; border: 2px solid; }
/* Renders 244px wide. */

/* width is the rendered width. Padding and border fit inside it. */
.b { box-sizing: border-box; width: 200px; padding: 20px; border: 2px solid; }
/* Renders 200px wide. */
```

```css
/* The reset every codebase needs, so that width: 50% means 50%. */
*, *::before, *::after { box-sizing: border-box; }
```

**Margin collapse** is the other surprise. Vertical margins between adjacent block elements collapse to
the larger of the two, not the sum; horizontal margins never collapse, and padding never collapses. It
also collapses through an empty parent and between a parent and its first or last child. Flex and grid
items do not collapse at all, which is often the simplest fix.

### The cascade

Declarations are compared in this order, and specificity is the *third* tiebreaker rather than the
first.

1. **Origin and importance** — user agent, then user, then author. `!important` reverses that order.
2. **Cascade layers** — a later layer beats an earlier one regardless of what is inside it.
3. **Specificity** — the four-part score below.
4. **Source order** — the last declaration wins.

Specificity is `[inline, IDs, classes and attributes and pseudo-classes, elements]`, compared left to
right.

| Selector | Score |
| -------- | ----- |
| `*`, `:where(...)` | 0,0,0,0 |
| `div` | 0,0,0,1 |
| `.card`, `[data-open]`, `:hover` | 0,0,1,0 |
| `#main` | 0,1,0,0 |
| `style="…"` | 1,0,0,0 |

Comparison is positional, not cumulative: `#main` at `0,1,0,0` beats ninety-nine classes at `0,0,99,0`.
That is why an ID used for styling is effectively unoverridable, and why IDs belong to fragment links
and JavaScript hooks instead.

```css
/* ❌ 0,1,2,1 — nothing but another ID can override this. */
#sidebar .widget h2.title { color: red; }

/* ✅ 0,0,1,0 — flat, greppable, overridable. */
.widget-title { color: red; }
```

`:is()` and `:where()` are worth knowing precisely for this: they group selectors identically, but
`:is()` takes the specificity of its most specific argument while `:where()` is always zero. A reset
written with `:where()` can be overridden by any single class.

### Inheritance and the four reset keywords

Some properties inherit — `color`, `font`, `line-height`, `visibility`. Most do not — `margin`,
`padding`, `border`, `background`, `width`. Every property accepts four keywords:

| Keyword | Effect |
| ------- | ------ |
| `inherit` | Take the parent's computed value, whether or not the property normally inherits |
| `initial` | The property's spec default, which is often not your design's default — `color: initial` is black |
| `unset` | `inherit` for inherited properties, `initial` for the rest |
| `revert` | Roll back to the user-agent stylesheet |

`revert` is the underused one. It is the clean way to undo a global reset for one subtree — restoring
list markers inside prose content, for instance — without knowing what the reset set them to.

### Positioning and stacking contexts

| Value | Out of flow? | Positioned against |
| ----- | ------------ | ------------------ |
| `static` | No | Normal flow |
| `relative` | No, keeps its space | Its own original position |
| `absolute` | Yes | Nearest positioned ancestor |
| `fixed` | Yes | The viewport |
| `sticky` | No, until the threshold | Nearest scrolling ancestor |

`z-index` applies only to positioned elements, and it is compared **only within one stacking context**.
A child cannot escape its parent's context however large its `z-index` is. A new context is created by
`position` plus a non-`auto` `z-index`, by `position: fixed` or `sticky`, and — the ones that catch
people — by `opacity` below 1, `transform`, `filter`, `perspective`, `will-change` and
`isolation: isolate`.

```css
.navbar { position: sticky; z-index: 10; }

/* This innocuous line creates a stacking context. */
.card { opacity: 0.95; }

/* Trapped inside .card, so it paints below the navbar despite the 9999. */
.card .modal { position: fixed; z-index: 9999; }
```

`isolation: isolate` is the right way to create a context deliberately, because it has no visual side
effect — unlike a `transform` or an `opacity` added for the purpose.

`position: sticky` fails silently in three situations worth memorising: an ancestor with
`overflow: hidden`, a parent no taller than the sticky element, and no `top` or `bottom` value set.

### Units

| Unit | Relative to | Use for |
| ---- | ----------- | ------- |
| `rem` | The root font size | The default for type, spacing and breakpoints — it respects text zoom |
| `em` | The element's own font size | Padding inside a component, so it scales with its own type |
| `px` | Nothing | Hairlines, borders, shadow offsets |
| `%` | The parent's same axis | Widths; heights only when the parent has one |
| `dvh` | The *visible* viewport height | Full-height layouts on mobile |
| `ch` | The width of `0` in the current font | Line length — `max-width: 65ch` for readable prose |

```css
/* ❌ 100vh includes the space under the mobile address bar, so content clips. */
.hero { height: 100vh; }

/* ✅ dvh tracks the viewport as browser chrome appears and disappears. */
.hero { height: 100dvh; }
```

### Cascade layers

`@layer` moves precedence from "who wrote the longer selector" to "which layer does this belong in".

```css
@layer reset, base, components, utilities;

@layer components {
  #sidebar .nav .btn { padding: 0.5rem 1rem; } /* high specificity… */
}

@layer utilities {
  .p-0 { padding: 0; } /* …and this still wins, because its layer is later. */
}
```

Two rules make it usable: later layers beat earlier ones regardless of specificity inside them, and
**unlayered styles beat every layered style**. That second rule is what makes `@import url(…)
layer(vendor)` so useful — third-party CSS drops into a low-priority layer and your own unlayered
styles override it without a single `!important`.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Any new project | `box-sizing: border-box` globally | Every width calculation becomes arithmetic you can do in your head |
| A reset that must be easy to override | `:where()` selectors | Zero specificity, so one class beats it |
| Overriding a third-party stylesheet | Import it into an early `@layer` | The alternative is `!important` in perpetuity |
| A deliberate paint boundary | `isolation: isolate` | No visual side effect, unlike `transform` or `opacity` |
| Undoing a global reset locally | `revert` | You do not need to know what the reset set |
| Full-height layout on mobile | `dvh` | `vh` measures a viewport the user cannot always see |

## Common Mistakes

**❌ Wrong — raising specificity to win:**

```css
.btn { background: blue; }
.card .btn { background: green; }
#page .card .btn { background: red; } /* the next override needs an ID too */
```

**✅ Right — decide it by layer or by source order:**

```css
@layer components { .btn { background: blue; } }
@layer utilities { .btn-danger { background: red; } }
```

**❌ Wrong — `width` on an inline element.** `display: inline` ignores `width`, `height` and vertical
margins entirely. Switch to `inline-block` or `block`.

**❌ Wrong — `display: none` to hide something temporarily.** It removes the element from the
accessibility tree as well as the layout, so a screen reader user loses it. `visibility: hidden` keeps
the space; a visually-hidden utility class keeps it available to assistive technology.

## 🔑 Key Takeaways

- `box-sizing: border-box` makes `width` mean the rendered width, which is what every layout calculation assumes.
- Specificity is the third tiebreaker in the cascade, after origin and cascade layers — not the first.
- Specificity is compared positionally, so one ID beats any number of classes, which is why IDs do not belong in stylesheets.
- `z-index` is only compared inside a stacking context, and `opacity`, `transform` and `filter` all create one.
- Cascade layers turn precedence into an architectural decision and remove the reason to write `!important`.

## Interview Questions

**Q: An element has `width: 200px; padding: 20px; border: 2px`. How wide does it render?**

244px by default, because `content-box` treats `width` as the content only and adds padding and border
to it. With `border-box` it renders at 200px, with the padding and border inside. Modern codebases set
`border-box` globally so that `width: 50%` genuinely means half the parent regardless of padding.

**Q: A modal with `z-index: 9999` still sits behind a navbar with `z-index: 10`. Why?**

Because the modal is inside a different stacking context, so its 9999 only competes with its siblings
inside that context. Some ancestor has `opacity` below 1, a `transform`, a `filter`, or `position` with
a `z-index` — any of those creates one. The fixes are to portal the modal to `<body>`, remove the
property creating the context, or place an `isolation: isolate` boundary deliberately.

**Q: When would you use `rem` over `em` over `px`?**

`rem` by default, because it scales with the user's root font size and does not compound. `em` inside a
self-contained component, so that `padding: 0.5em 1em` stays proportional across size variants. `px`
only for things that genuinely should not scale — a one-pixel border, a shadow offset.

**Q: What problem do cascade layers solve that BEM does not?**

BEM controls naming and keeps specificity flat within your own code. Layers control precedence between
bodies of code you may not own — a vendor stylesheet, a reset, a utility set. A single class in a later
layer beats an ID selector in an earlier one, which is exactly the case `!important` used to be reached
for.

## What to Read Next

- [Chapter ?? — Advanced CSS](#ch-advanced-css) — custom properties, `:has()` and the rest of the modern set
- [Chapter ?? — CSS Methodologies](#ch-css-methodologies) — the conventions built on top of the cascade
- [Chapter ?? — Responsive Design](#ch-responsive-design) — where the units in this chapter get used
