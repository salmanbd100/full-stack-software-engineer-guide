# Flexbox

One-dimensional layout for arranging items in a row or column. Built for component-level layouts where content size drives spacing.

---

## 💡 **Mental Model: Main Axis vs Cross Axis**

Flexbox does not have rows and columns. It has a **main axis** and a **cross axis**. Everything else follows from that.

**How It Works:**
- `flex-direction` sets the main axis (default `row` = horizontal).
- `justify-content` aligns items along the **main** axis.
- `align-items` aligns items along the **cross** axis.

> **Key Insight:** Switch `flex-direction` to `column` and the axes flip. `justify-content` now controls vertical alignment, `align-items` controls horizontal. Senior candidates name the axis before naming the property.

| Property | row (default) | column |
|---|---|---|
| `justify-content` | horizontal | vertical |
| `align-items` | vertical | horizontal |

---

## 💡 **Container Properties**

```css
.container {
  display: flex;              /* or inline-flex */
  flex-direction: row;        /* row | row-reverse | column | column-reverse */
  flex-wrap: nowrap;          /* nowrap | wrap | wrap-reverse */
  flex-flow: row wrap;        /* shorthand: direction + wrap */

  justify-content: flex-start;/* main axis: start | end | center | space-between | space-around | space-evenly */
  align-items: stretch;       /* cross axis: stretch | flex-start | flex-end | center | baseline */
  align-content: stretch;     /* multi-line cross axis (only when wrapping) */

  gap: 16px;                  /* row-gap column-gap */
}
```

**Common Mistake:** Setting `align-content` on a single-line flex container. It only works when items wrap onto multiple lines. For single-line use `align-items`.

---

## 💡 **Item Properties: The `flex` Shorthand**

`flex` is shorthand for `flex-grow flex-shrink flex-basis`. This is where most flex bugs live.

```css
.item {
  flex: 1;          /* = 1 1 0%   → grow, shrink, basis 0 */
  flex: 1 1 auto;   /* grow, shrink, basis = content size */
  flex: 0 0 200px;  /* rigid 200px, no grow, no shrink */
  flex: auto;       /* = 1 1 auto */
  flex: none;       /* = 0 0 auto (rigid) */
}
```

### The Gotcha: `flex: 1` vs `flex: 1 1 auto`

| Shorthand | Resolves To | Behavior |
|---|---|---|
| `flex: 1` | `1 1 0%` | All items become **equal width**, ignoring content |
| `flex: 1 1 auto` | `1 1 auto` | Items size by **content first**, then share leftover space |
| `flex: auto` | `1 1 auto` | Same as above |

**Common Mistake:**
```css
/* ❌ Bad — you want equal columns but used auto basis */
.col { flex: 1 1 auto; }  /* widths vary by content */

/* ✅ Good — true equal columns */
.col { flex: 1; }         /* basis 0, content ignored */
```

> **Key Insight:** `flex: 1` makes items equal because basis is `0` — the entire width becomes "leftover" to distribute. With `auto`, content size is reserved first and only the remainder gets shared.

### Other Item Properties

```css
.item {
  align-self: center;  /* override align-items for this item */
  order: -1;           /* visual reorder — beware accessibility */
}
```

**⚠️ `order` does not change DOM order.** Screen readers and tab focus follow the DOM. Use it only for visual tweaks, never to convey meaning.

---

## 💡 **The `min-width: 0` Trick**

Flex items have an implicit `min-width: auto` (or `min-height: auto` in column). This means a flex item will **refuse to shrink below its content's intrinsic size** — long text or a wide child overflows the container instead of shrinking.

```css
/* ❌ Bad — long text overflows, sibling gets pushed */
.item { flex: 1; }

/* ✅ Good — item can shrink, text truncates */
.item {
  flex: 1;
  min-width: 0;          /* override implicit min-width: auto */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

> **Key Insight:** Whenever a flex child contains text or a long element and you want it to truncate, set `min-width: 0`. This is the single most common interview-level flex bug.

The same applies to `min-height: 0` in `flex-direction: column` layouts (e.g., scrollable panes inside a flex column).

---

## 💡 **Flexbox vs Grid: When to Choose**

| Use Flexbox When | Use Grid When |
|---|---|
| Layout is **1D** — row or column | Layout is **2D** — rows AND columns aligned |
| Content size drives layout | You want a fixed layout shape |
| Components: nav bars, toolbars, cards | Page-level structure, dashboards |
| You don't know item count ahead of time | Item placement matters |

✅ Flexbox: "Distribute these items along one axis."
✅ Grid: "Place items at specific row/column intersections."

Most real apps use **both** — Grid for page skeleton, Flexbox inside cells.

---

## 💡 **Common Patterns**

### 1. Perfect Centering

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

### 2. Equal Columns with a Fixed Sidebar

```css
.layout {
  display: flex;
  gap: 24px;
}
.sidebar { flex: 0 0 240px; }   /* rigid 240px */
.main    { flex: 1; min-width: 0; }  /* fills rest, can shrink */
```

### 3. Holy Grail Header / Body / Footer

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.app > header,
.app > footer { flex: 0 0 auto; }   /* size to content */
.app > main   { flex: 1; }          /* eats remaining space */
```

### 4. Space Between Logo and Nav

```css
.navbar {
  display: flex;
  align-items: center;
}
.logo { margin-right: auto; }  /* push everything else right */
```

> **Key Insight:** `margin: auto` inside a flex container absorbs free space. Cleaner than wrapping things in extra divs.

---

## ❓ **Interview Questions**

**Q: What's the difference between `flex: 1` and `flex: 1 1 auto`?**
> `flex: 1` expands to `1 1 0%` — basis zero, so all items get **equal** share of the container width regardless of content. `flex: 1 1 auto` reserves content size first, then distributes leftover space — items end up **unequal**. Use `flex: 1` for equal columns.

**Q: A flex item with long text is overflowing its container. Why?**
> Flex items have `min-width: auto` by default, which equals the intrinsic content width. The item refuses to shrink below that. Fix: set `min-width: 0` on the item (plus `overflow: hidden` to truncate). Same applies to `min-height: 0` in column layouts.

**Q: When would you choose Flexbox over Grid?**
> Flexbox for **1D, content-driven** layouts where item count is dynamic or order matters — nav bars, tag lists, toolbars, card internals. Grid for **2D structural** layouts where rows and columns must align — page shells, dashboards, image galleries. Real apps nest them.

**Q: How do you center a div both vertically and horizontally?**
> `display: flex; justify-content: center; align-items: center;` on the parent. Three lines, no hacks. Pre-2017 this was a famous CSS pain point.

**Q: What's wrong with using `order` to reorder items?**
> It only changes visual order. DOM order is unchanged, so keyboard tab order and screen readers still follow the source. Using `order` to convey meaning breaks accessibility. Fine for purely visual tweaks (e.g., reordering on mobile).

---

[← Back to HTML & CSS](./README.md)
