# Advanced CSS

Modern CSS features that ship in every evergreen browser. These are what separates senior frontend engineers from "I know flexbox" — and they show up constantly in Staff-level interviews.

---

## 💡 **Custom Properties (CSS Variables)**

Real cascading variables, not preprocessor constants. They live in the DOM and respond to media queries, `:hover`, JS, everything.

**How It Works:** Defined with `--name`, read with `var(--name, fallback)`. Inherit through the DOM tree. Scoped to the element they're declared on.

```css
:root {
  --color-brand: #2563eb;
  --space: 1rem;
}

.card {
  /* Scoped override — only this subtree sees it */
  --space: 1.5rem;
  padding: var(--space);
  color: var(--color-brand, #000); /* fallback if undefined */
}

/* Variables respond to media queries — runtime theming */
@media (prefers-color-scheme: dark) {
  :root { --color-brand: #60a5fa; }
}
```

**JS Interop:**

```ts
const root = document.documentElement;
root.style.setProperty('--color-brand', '#ef4444');
const current = getComputedStyle(root).getPropertyValue('--color-brand');
```

**When to Use:**
- ✅ Theming, dark mode, runtime customization
- ✅ Component variants without class explosion
- ❌ Static values that never change (use Sass variables or just write the value)

> **Key Insight:** Custom properties are the only way to pass values from JS into CSS without inline `style` strings. They're the bridge.

---

## 💡 **Modern Color Functions**

`hex` and `rgb` are dead. Use these.

```css
/* hsl — intuitive: hue, saturation, lightness */
color: hsl(220 90% 56%);

/* oklch — perceptually uniform. Lightness 50% looks 50% to humans. */
color: oklch(60% 0.2 250);

/* color-mix — blend two colors */
background: color-mix(in oklch, var(--brand) 80%, white);

/* Relative color syntax — derive variants from a base */
.button {
  --brand: oklch(60% 0.2 250);
  background: var(--brand);
  border: 1px solid oklch(from var(--brand) calc(l - 0.15) c h);
}
```

| Function | Use Case |
|----------|----------|
| `hsl()` | Human-readable manual picks |
| `oklch()` | Design tokens, gradients, perceptual ramps |
| `color-mix()` | Hover/active states from a single token |
| `oklch(from ...)` | Derive border/shadow/hover from base |

> **Key Insight:** `oklch` makes uniform color ramps. Going from `oklch(90%...)` to `oklch(10%...)` in steps gives a clean palette. RGB ramps look muddy.

---

## 💡 **`@layer` — Cascade Layers**

Explicit control over specificity. No more `!important` wars with vendor CSS.

```css
@layer reset, base, components, utilities;

@layer reset {
  * { margin: 0; }
}

@layer components {
  .btn { padding: 0.5rem 1rem; }
}

@layer utilities {
  .p-0 { padding: 0; }
}
```

**Rules:**
- Later layers win over earlier ones, regardless of selector specificity.
- Unlayered styles win over **all** layered styles.
- `@import url(...) layer(vendor)` — drop third-party CSS into a low-priority layer.

**When to Use:**
- ✅ Wrapping a third-party UI lib so your styles override without `!important`
- ✅ Design systems with reset / tokens / components / utilities ordering
- ❌ Tiny projects — overhead isn't worth it

> **Key Insight:** Cascade layers invert the usual specificity rule. A `.btn` in a later layer beats `#header .btn` in an earlier one.

---

## 💡 **`:has()` — The Parent Selector**

The most requested CSS feature for 20 years. It styles a parent based on its children.

```css
/* Card that contains an image gets a different layout */
.card:has(img) { display: grid; grid-template-columns: 100px 1fr; }

/* Form label turns red if its input is invalid */
label:has(input:invalid) { color: #dc2626; }

/* Body modifier when a modal is open */
body:has(dialog[open]) { overflow: hidden; }

/* Sibling-aware: previous sibling style based on next */
h2:has(+ p) { margin-bottom: 0.5rem; }
```

**Gotcha:** `:has()` doesn't bubble up infinitely — keep selectors specific. It is heavily optimized in modern browsers, but `*:has(...)` on huge trees can still hurt.

> **Key Insight:** `:has()` replaces a huge category of JS that existed only to add classes to parents. Modal open, empty list states, "has icon" variants — all CSS now.

---

## 💡 **Container Queries**

Style based on a container's size, not the viewport. Full coverage in [05-responsive.md](./05-responsive.md).

```css
.sidebar { container-type: inline-size; container-name: sidebar; }

@container sidebar (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

> **Key Insight:** Components become truly reusable — the same card adapts to a narrow sidebar or wide main column without knowing the viewport.

---

## 💡 **Logical Properties**

Replace `left`/`right`/`top`/`bottom` with `inline-start`/`inline-end`/`block-start`/`block-end`. Critical for RTL languages (Arabic, Hebrew) and vertical writing modes (Japanese, Mongolian).

| Physical | Logical |
|----------|---------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-top` | `padding-block-start` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `text-align: left` | `text-align: start` |

```css
/* ❌ Breaks in RTL — padding stays on the wrong side */
.card { padding-left: 1rem; border-left: 4px solid blue; }

/* ✅ Flips automatically with dir="rtl" */
.card { padding-inline-start: 1rem; border-inline-start: 4px solid blue; }
```

**Shorthands:**

```css
margin-inline: 1rem 2rem; /* start end */
padding-block: 0.5rem;     /* both */
inset-inline-start: 0;     /* replaces left/right based on direction */
```

> **Key Insight:** If your product ships to any RTL market, logical properties aren't optional. Convert as you touch files.

---

## 💡 **`aspect-ratio`**

```css
/* ❌ Old padding-bottom hack with absolute positioning */
.video { position: relative; padding-bottom: 56.25%; }
.video iframe { position: absolute; inset: 0; }

/* ✅ One line */
.video { aspect-ratio: 16 / 9; }
.avatar { aspect-ratio: 1; width: 48px; } /* height computed */
```

Works on `img`, `video`, `iframe`, and any sized box. Pairs with `object-fit: cover` for cropping.

---

## 💡 **Native CSS Nesting**

Nesting without Sass. Shipped in all evergreen browsers (2023+).

```css
.card {
  padding: 1rem;
  background: white;

  & .title {
    font-size: 1.25rem;
  }

  &:hover {
    background: #f9fafb;
  }

  @media (min-width: 768px) {
    padding: 2rem;
  }
}
```

**Gotchas:**
- The `&` is required when the nested selector starts with an element name (`& div` works; `div` alone doesn't, in older specs).
- Don't nest more than 2–3 levels — same readability rules as Sass.

> **Key Insight:** Native nesting deletes one build-step justification for Sass. Combined with custom properties and `@layer`, plain CSS is now what Sass was in 2018.

---

## 💡 **Subgrid**

A grid item can adopt its parent's grid tracks. Solves the "align three cards' titles, bodies, and footers" problem without flex hacks.

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto; /* title, body, footer */
  gap: 1rem;
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* inherits the 3 rows */
}
```

Now every card's title, body, and footer line up across the row, regardless of content length.

> **Key Insight:** Before subgrid, this required JS to measure and equalize heights. Now it's free.

---

## 💡 **View Transitions API**

Animate between DOM states (page navigations in SPAs, list filters, route changes) with one function call.

```ts
function update() {
  if (!document.startViewTransition) {
    applyChanges();
    return;
  }
  document.startViewTransition(() => applyChanges());
}
```

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* Tag an element to morph between states */
.hero { view-transition-name: hero; }
```

Cross-document transitions (between full page loads) need `@view-transition { navigation: auto; }` and a same-origin navigation.

> **Key Insight:** This replaces Framer Motion's `layoutId` for many cases. Native, GPU-accelerated, zero JS for the animation itself.

---

## 🎯 **Interview Questions**

### Q1: When would you use cascade layers over BEM or specificity tricks?

**Answer:** Cascade layers solve a different problem than BEM. BEM controls *naming and authorship*; layers control *order of precedence*. Use layers when:

- You consume a third-party CSS library (Bootstrap, a date picker) and want your overrides to win without `!important`. Import their CSS into a low-priority layer.
- You have a design system with clear tiers — reset → tokens → components → utilities — and want utilities to always beat components regardless of selector specificity.
- You want utility classes like `.p-0` to win against `#header .card` without inflating selectors.

The key win: a `.btn` in `@layer utilities` beats `#sidebar .nav .btn` in `@layer components`. Specificity inside a layer still matters, but layer order trumps it.

### Q2: Explain `oklch` vs `hsl` for design tokens.

**Answer:** `hsl` is intuitive but **not perceptually uniform** — `hsl(60 100% 50%)` (yellow) looks much brighter than `hsl(240 100% 50%)` (blue) at the same lightness value. That breaks ramps and dark-mode inversion.

`oklch` is perceptually uniform: a 50% lightness yellow and 50% lightness blue look equally bright. That makes it ideal for:
- Generating consistent shade ramps (50, 100, 200, ..., 900) by stepping lightness uniformly.
- Dark-mode inversion via `oklch(from var(--c) calc(1 - l) c h)`.
- Accessible contrast — lightness in oklch correlates better with WCAG contrast than HSL.

It also has a wider gamut (`display-p3` support) so it can express colors `rgb` can't. The tradeoff: it's harder to eyeball without a picker tool.

### Q3: How does `:has()` change architecture decisions you used to push to JS?

**Answer:** Several common patterns become pure CSS:

- **"Body is locked when modal open"** — `body:has(dialog[open]) { overflow: hidden; }`. No more `useEffect` toggling a class.
- **Form validation styling** — `.field:has(:invalid) { border-color: red; }`. Previously needed JS to add `.error` class.
- **Empty states** — `.list:not(:has(.item)) { display: none; }` or show an empty placeholder.
- **Layout variants** — `.card:has(img)` vs `.card:not(:has(img))` — the same component renders differently based on content, no prop drilling.

Performance-wise, browsers (Chrome 105+, Safari 15.4+, Firefox 121+) implement `:has()` with invalidation tracking — only relevant subtrees re-evaluate on DOM mutation. It's safe in production. Avoid `*:has(...)` over the entire document body for very large DOM trees as a precaution.

The architecture shift: declarative style based on child state, instead of imperative class toggling. Less state in React, fewer effects, simpler components.

---

[← Back to HTML & CSS](./README.md)
