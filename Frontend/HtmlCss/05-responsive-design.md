---
title: Responsive Design
part: 2
chapter: 0
slug: responsive-design
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-01
tags: [css, responsive, container-queries, clamp, images]
in_book: true
---

# Responsive Design {#ch-responsive-design}

> Build one interface that adapts to any screen, input mode and preference, without a breakpoint per device.

**In this chapter:** mobile-first as cascade hygiene · `clamp()` and fluid units · media features that are not width · container queries · responsive images · choosing breakpoints

## 💡 The Core Idea

Responsive design stopped being about breakpoints some years ago. The modern approach is to describe
*constraints* — a minimum readable column, a maximum comfortable line length, a font size that scales
between two bounds — and let the layout engine solve for the actual viewport. Breakpoints remain, but
as an exception rather than the mechanism. The shift matters for a second reason: the viewport was
always a poor proxy for the questions you actually wanted answered. How wide is this component's
container? Can this input hover? Does this user want motion? Each of those now has a direct query.

> Stop asking how wide the screen is. Ask how wide the container is, what the input can do, and what
> the user has asked for.

## How It Works

### Mobile-first is about the cascade

Writing base styles for small screens and enhancing upward with `min-width` means the lightest layout
ships with no overrides at all, and complexity is layered on. Desktop-first inverts that: every small
screen pays to unwind rules it will never use. Mixing the two directions in one stylesheet is what
produces specificity fights, so pick one — usually `min-width` — and stack queries in ascending order.

The viewport meta tag is the prerequisite, and without it media queries do nothing useful on mobile:

```html
<!-- Without this, a mobile browser renders at a virtual 980px and scales down. -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Never add `user-scalable=no`. Preventing zoom is a WCAG failure, and it is the accessibility bug most
often shipped by accident.

### `clamp()` replaces most breakpoints

```css
/* clamp(minimum, preferred, maximum). The preferred value scales; the bounds hold. */
h1 { font-size: clamp(1.5rem, 4vw + 1rem, 3rem); }
section { padding: clamp(1rem, 5vw, 4rem); }
```

The difference from media queries is continuity. A media query snaps at a threshold; `clamp()`
interpolates, so there is no width at which the type suddenly jumps. Including a `rem` term in the
preferred value matters — a pure `vw` expression does not respond to the user's font-size setting,
which makes it an accessibility problem rather than just a stylistic one.

| Unit | Use for |
| ---- | ------- |
| `rem` | Typography, spacing, breakpoints — respects the user's font size |
| `ch` | Line-length caps: `max-width: 65ch` |
| `dvh` | Full-height layouts on mobile |
| `vw` | Only inside `clamp()`, and only with a `rem` term beside it |

### The media features that are not width

```css
/* The correct way to gate hover, and the one people get wrong. */
@media (hover: hover) and (pointer: fine) {
  .button:hover { transform: scale(1.05); }
}

@media (prefers-reduced-motion: reduce) { … }
@media (prefers-color-scheme: dark) { … }
@media (prefers-contrast: more) { … }
```

Width is a proxy for input type and a bad one. A 1280px touchscreen laptop cannot hover; a 600px window
on a desktop can. `hover` and `pointer` answer the actual question.

### Container queries

A media query asks about the viewport, which a reusable component has no business caring about. A
container query asks about the component's own space.

```css
.card-slot {
  /* inline-size queries the inline axis only, which is what layout needs. */
  container-type: inline-size;
  container-name: card;
}

.card { display: block; }

@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

The same card now stacks in a 300px sidebar and goes horizontal in a 700px main column, without either
of them telling it where it is. That is the difference between a component that is reusable and one that
merely appears reusable.

| | Media query | Container query |
| - | ----------- | --------------- |
| Asks about | The viewport | An ancestor's size |
| Right for | Page layout, navigation, hero sizing | Component adaptation |
| Failure mode | Component breaks when the column narrows | None — it reads its own context |

Page-level layout stays with media queries, because there is no query container above the document.

### Responsive images

Two elements for two different problems, and conflating them is a common interview stumble.

```html
<!-- Same picture, several sizes: let the browser choose by viewport and pixel density. -->
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1600.jpg 1600w"
  sizes="(min-width: 768px) 50vw, 100vw"
  alt="Turbine field at dusk"
  width="1600"
  height="900"
/>
```

`srcset` declares the candidates and their intrinsic widths; `sizes` tells the browser how wide the
image will *render*, which it needs before layout to make the choice. Always set `width` and `height`
so the box is reserved and the image contributes nothing to layout shift.

```html
<!-- Different picture per breakpoint, and format negotiation. -->
<picture>
  <source media="(min-width: 768px)" srcset="hero-wide.avif" type="image/avif" />
  <source srcset="hero-portrait.avif" type="image/avif" />
  <img src="hero-wide.jpg" alt="Turbine field at dusk" />
</picture>
```

`srcset` saves bandwidth. `<picture>` makes an editorial decision — a tight portrait crop on a phone,
a wide landscape on a desktop — or negotiates a format the browser may not support.

### Layouts with no breakpoints

```css
.grid {
  display: grid;
  /* As many columns as fit, each at least 280px, never overflowing a narrow screen. */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}
```

That goes from one column to as many as fit with no media query at all. The `min(100%, 280px)` is the
part worth understanding: without it, a viewport narrower than 280px overflows.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Type and spacing that should scale | `clamp()` with a `rem` term | Continuous rather than snapping, and one line |
| A component used in several containers | Container query | The component reads its own space, not the window's |
| Page structure — sidebar in or out | Media query | Nothing above the document to query |
| Gating a hover effect | `(hover: hover) and (pointer: fine)` | Width does not tell you what the input can do |
| A card grid of unknown length | `auto-fit` with `minmax` | The layout solves itself at every width |
| Different crop on mobile | `<picture>` with `media` | `srcset` cannot change composition |

## Common Mistakes

**❌ Wrong — using width to detect touch:**

```css
@media (max-width: 768px) {
  .button:hover { transform: none; } /* A touch laptop at 1280px still gets sticky hover. */
}
```

**✅ Right — query the input:**

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { transform: scale(1.05); }
}
```

**❌ Wrong — `100vh` for a full-height layout.** On mobile, `vh` is measured against the viewport with
browser chrome hidden, so `100vh` is taller than what the user can see and content is cut off. Use
`100dvh`, with `100vh` above it as the fallback declaration.

**❌ Wrong — breakpoints named after devices.** "iPad Pro" changes dimensions every couple of years.
Resize the window, find the first width where the design looks wrong, and put a breakpoint there.

## 🔑 Key Takeaways

- Mobile-first is cascade hygiene: the lightest layout ships with no overrides, and complexity is layered on.
- `clamp()` interpolates where a media query snaps, and it needs a `rem` term so it respects the user's font size.
- Container queries let a component adapt to its own space, which is what makes it genuinely reusable.
- Width is a bad proxy for input capability; `hover` and `pointer` answer the question directly.
- `srcset` chooses a size and `<picture>` chooses an image — they solve different problems.

## Interview Questions

**Q: Why use `clamp()` rather than three media queries?**

Because it scales continuously instead of snapping at thresholds, so there is no width at which the
type visibly jumps, and it is one declaration rather than three blocks to keep in sync. The one thing
to get right is including a `rem` term in the preferred value; a pure `vw` expression ignores the user's
font-size preference, which turns a styling choice into an accessibility defect.

**Q: When do you reach for a container query over a media query?**

Whenever the thing adapting is a component rather than the page. A card dropped into a narrow sidebar
and a wide main column wants the same rules in both places, expressed against its own container. Page
structure still needs media queries, because the document has no container above it to ask about.

**Q: Why is `100vh` wrong on mobile?**

`vh` is measured against the largest viewport — the height with browser chrome hidden. While the address
bar is visible the element is taller than the visible area, so content is clipped or the page scrolls
unexpectedly. `dvh` tracks the viewport as chrome appears and disappears.

**Q: When would you not make something responsive?**

When the context genuinely fixes the viewport — an internal tool behind a desktop-only login, a
kiosk display, an embedded panel of a known size. Even then it is worth using fluid units rather than
fixed pixels, because "desktop only" has a habit of becoming "on a tablet in the warehouse" within a
year.

## What to Read Next

- [Chapter ?? — CSS Grid](#ch-grid) — the layout model behind the breakpoint-free grid
- [Chapter ?? — Advanced CSS](#ch-advanced-css) — the rest of the 2023 platform additions
- [Chapter ?? — Accessibility](#ch-accessibility) — the user-preference queries in full
