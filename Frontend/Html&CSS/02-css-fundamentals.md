# CSS Fundamentals

> The model, the cascade, and the units. Master these and 80% of CSS bugs disappear.

---

## The Box Model

Every element is a rectangle made of four layers: **content → padding → border → margin**.

```
┌─────────────────────── margin ───────────────────────┐
│   ┌─────────────────── border ───────────────────┐   │
│   │   ┌─────────────── padding ───────────────┐  │   │
│   │   │             content                   │  │   │
│   │   └───────────────────────────────────────┘  │   │
│   └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### `box-sizing` — The One Setting That Matters

```css
/* Default — width = content only. Padding + border ADD to it. */
.a { box-sizing: content-box; width: 200px; padding: 20px; border: 2px; }
/* Renders 244px wide. Surprise. */

/* Modern — width = the actual rendered width. Padding + border fit INSIDE. */
.b { box-sizing: border-box; width: 200px; padding: 20px; border: 2px; }
/* Renders 200px wide. As expected. */
```

**The universal reset every codebase needs:**

```css
*, *::before, *::after { box-sizing: border-box; }
```

> **Key Insight:** Without `border-box`, every responsive width calculation becomes a math problem. With it, `width: 50%` always means 50% of the parent.

### Margin Collapse — The Gotcha

Vertical margins between adjacent block elements **collapse** to the larger of the two. Horizontal margins never collapse. Padding never collapses.

```css
.a { margin-bottom: 30px; }
.b { margin-top: 20px; }
/* Gap between a and b is 30px, not 50px. */
```

It also collapses through empty parents and between a parent and its first/last child. Common fix: give the parent `padding: 1px` or `display: flex` (flex/grid items don't collapse).

---

## Specificity and the Cascade

Most "why isn't my style applying?" bugs come from misunderstanding the cascade order:

1. **Origin & importance** — user-agent → user → author → `!important` reverses the order
2. **Cascade layers** (`@layer`) — later layers beat earlier ones
3. **Specificity** — see below
4. **Source order** — last declaration wins

### Specificity Calculation

A four-part score: `[inline, IDs, classes/attrs/pseudo-classes, elements/pseudo-elements]`.

| Selector | Score |
|---|---|
| `*` | 0,0,0,0 |
| `div` | 0,0,0,1 |
| `.card` | 0,0,1,0 |
| `.card:hover` | 0,0,2,0 |
| `a[href="/x"]` | 0,0,2,0 |
| `#main` | 0,1,0,0 |
| `style="..."` (inline) | 1,0,0,0 |
| `!important` | overrides everything in its origin |

Compare left-to-right. `0,1,0,0` (ID) beats `0,0,99,0` (99 classes). A single `#main` always wins against any pile of classes.

### 💡 **The Rules That Save You**

- **Never use IDs for styling.** They're too specific to override. Reserve them for JS hooks and fragment links.
- **Avoid `!important`.** It's a future-bug factory. Use it only inside utility classes (Tailwind does this deliberately) or to override third-party styles you don't control.
- **Keep specificity flat.** `.btn-primary` beats `.card .header .btn` every time, because the flat one is easier to override later.

```css
/* ❌ Bad: 0,1,2,1 — only an ID can override this */
#sidebar .widget h2.title { ... }

/* ✅ Good: 0,0,1,0 — easy to override and reason about */
.widget-title { ... }
```

> **Key Insight:** Specificity wars are a code smell. If you keep raising specificity to win, your architecture is fighting you.

---

## Selectors Worth Knowing

### Combinators

| Selector | Meaning |
|---|---|
| `A B` | `B` descendant of `A` (any depth) |
| `A > B` | `B` direct child of `A` |
| `A + B` | `B` immediately follows `A` |
| `A ~ B` | `B` follows `A` (any sibling after) |

### Pseudo-Classes That Punch Above Their Weight

```css
/* The "fancy" empty-state selector */
.list:empty { display: none; }

/* Style based on which child it is */
.tabs > :first-child { border-left: none; }
.row > :nth-child(odd) { background: #f8f8f8; }

/* :not() for exclusions — cleaner than fighting specificity */
.btn:not(:disabled):hover { background: blue; }

/* :is() and :where() — grouping. :where() has ZERO specificity. */
:is(h1, h2, h3) { font-family: serif; }      /* takes specificity of most specific arg */
:where(h1, h2, h3) { font-family: serif; }   /* always 0,0,0,0 — easy to override */

/* :has() — the parent selector we finally got */
.card:has(img) { padding: 0; }
label:has(input:checked) { font-weight: bold; }
```

### Attribute Selectors

```css
input[type="email"]      { ... }
a[href^="https://"]      { ... }   /* starts with */
a[href$=".pdf"]::after   { content: " (PDF)"; }   /* ends with */
[data-state="open"]      { ... }   /* great for component state */
```

---

## Inheritance and the Reset Keywords

Some properties inherit (color, font, line-height, visibility). Most don't (margin, padding, border, background, width).

Four keywords every property accepts:

| Keyword | Effect |
|---|---|
| `inherit` | Force inheritance from parent |
| `initial` | Reset to the property's **spec default** (often not what you expect — e.g., `color: initial` is black, not your theme) |
| `unset` | `inherit` if the property inherits, else `initial` |
| `revert` | Roll back to the user-agent stylesheet (your browser's default) |

```css
/* Wipe an inherited color back to "whatever the browser would do" */
.alert a { color: revert; }

/* Common pattern for nested components — opt back into the parent's font */
.modal { font: inherit; }
```

> **Key Insight:** `revert` is underrated. It's the cleanest way to undo a global reset for one element (e.g., resurrect list bullets inside prose content).

---

## Display Values

Brief view — defer Flexbox/Grid to their own topics.

| Value | Behavior |
|---|---|
| `block` | Full width, stacks vertically. `<div>`, `<p>`, headings. |
| `inline` | Flows in text. **Ignores width/height/vertical margin.** `<span>`, `<a>`. |
| `inline-block` | Inline flow, but accepts width/height. Used to be the only layout tool. |
| `flex` | One-dimensional layout (row or column). |
| `grid` | Two-dimensional layout (rows AND columns). |
| `contents` | Element disappears from the box tree; children become children of the grandparent. Useful for grid layouts. |
| `none` | Removed from layout AND accessibility tree (vs `visibility: hidden` which keeps space). |

**Common Mistake:** Setting `width` on an `inline` element and wondering why nothing changes. Switch to `inline-block` or `block`.

---

## Position and Stacking

| Value | Removed from Flow? | Positioned Relative To |
|---|---|---|
| `static` (default) | No | Normal flow |
| `relative` | No (keeps space) | Its own original position |
| `absolute` | Yes | Nearest **positioned** ancestor (or viewport) |
| `fixed` | Yes | Viewport (almost always) |
| `sticky` | No, until threshold hit | Nearest scrolling ancestor |

### The Stacking Context Gotcha

`z-index` only works on **positioned** elements (anything not `static`). And it's **local to its stacking context** — a child with `z-index: 9999` can't escape its parent's stacking context.

A new stacking context is created by:

- `position: relative/absolute` + any `z-index` other than `auto`
- `position: fixed` or `sticky`
- `opacity` less than 1
- `transform`, `filter`, `perspective`, `will-change`, `isolation: isolate`

```css
/* ❌ Mystery bug: this modal never goes above the navbar */
.navbar { position: sticky; z-index: 10; }
.card   { opacity: 0.95; }              /* new stacking context */
.card .modal { position: fixed; z-index: 9999; }  /* trapped inside .card */

/* ✅ Fix: don't create a stacking context around portaled UI, or portal to body */
```

> **Key Insight:** `isolation: isolate` is the cleanest way to deliberately create a new stacking context without side effects (no transform, no opacity hack).

### `position: sticky` — The Underused One

```css
.section-header {
  position: sticky;
  top: 0;     /* sticks when its top hits the viewport top */
}
```

Sticks within its **scrolling ancestor** and **stops at its parent's edge**. If sticky isn't working: check that no ancestor has `overflow: hidden`, that the parent is taller than the sticky element, and that you've set a `top`/`bottom` value.

---

## Units

| Unit | Relative To | When to Use |
|---|---|---|
| `px` | Absolute (CSS pixels, not device) | Borders, fine details, shadow offsets |
| `rem` | Root `<html>` font-size | **Default choice** — font sizes, spacing, breakpoints. Respects user's browser zoom for text size. |
| `em` | The element's own font-size | Component-relative spacing (padding inside a button scales with its font) |
| `%` | Parent's same-axis dimension | Widths, sometimes heights (heights need an explicit parent height to work) |
| `vh` / `vw` | 1% of viewport height/width | Hero sections, full-screen overlays |
| `dvh` / `svh` / `lvh` | Dynamic / small / large viewport height | **Mobile** — handles browser chrome appearing/disappearing |
| `ch` | Width of `0` in current font | Line-length limits (`max-width: 65ch` for readable prose) |

```css
/* ❌ Bad: 100vh on mobile clips under the address bar */
.hero { height: 100vh; }

/* ✅ Good: dvh tracks the visible viewport */
.hero { height: 100dvh; }
```

> **Key Insight:** Use `rem` by default. Reach for `em` inside reusable components. Use `px` for hairlines. Use `dvh` on mobile.

---

## Cascade Layers (`@layer`)

Modern (2022+) feature for controlling the cascade across multiple stylesheets — without specificity wars or `!important`.

```css
@layer reset, base, components, utilities;

@layer reset {
  * { margin: 0; box-sizing: border-box; }
}

@layer components {
  .btn { padding: 0.5rem 1rem; background: blue; }
}

@layer utilities {
  /* These win over .btn regardless of specificity */
  .text-red { color: red; }
}
```

**Order matters:** later layers beat earlier ones, **regardless of specificity inside**. A single class in `utilities` beats `#x .y .z` in `components`. Unlayered styles beat all layered styles.

This is how Tailwind v3+, Open Props, and modern design systems avoid `!important` everywhere.

> **Key Insight:** Layers turn "who wrote the more specific selector?" into "which layer does this belong in?" — an architectural decision instead of an accident.

---

## Interview Questions

### Q1: An element has `width: 200px; padding: 20px; border: 2px solid`. How wide does it actually render and why?

**Answer:** Depends on `box-sizing`. With the default `content-box`, the box renders 244px wide — width is content only, padding and border add on top (200 + 20 + 20 + 2 + 2). With `border-box`, it renders 200px wide — padding and border fit inside the declared width. Modern codebases set `*, *::before, *::after { box-sizing: border-box; }` because it makes responsive layout math intuitive (`width: 50%` actually means 50% of the parent regardless of padding).

### Q2: A teammate's `z-index: 9999` modal still appears behind a navbar with `z-index: 10`. What's going on?

**Answer:** Stacking contexts. `z-index` is only compared within the same stacking context. If the modal's ancestor has `transform`, `opacity < 1`, `filter`, `will-change`, or `position` with a non-`auto` `z-index`, it creates a new stacking context — and the modal is trapped inside it. The modal's 9999 only competes against its siblings inside that context. Fixes: (1) portal the modal to `<body>` so it's a sibling of the navbar's context, (2) remove the side-effect property creating the context, or (3) use `isolation: isolate` deliberately at the top level where you want the boundary.

### Q3: When would you use `rem` vs `em` vs `px`?

**Answer:** `rem` is the default — sizes scale with the user's root font-size setting (accessibility), and you avoid the compounding surprises of `em`. Use `em` inside self-contained components where you want padding/margins to scale with the component's own font-size — e.g., a button where `padding: 0.5em 1em` always looks proportional regardless of the button's size variant. Use `px` for things that genuinely shouldn't scale: 1px borders, hairlines, fixed shadow offsets, media query breakpoints (though `em` is also valid there). I'd avoid `px` for typography and spacing because it ignores the user's zoom preference for text-only zoom.

---

[← Back to HTML & CSS](./README.md)
