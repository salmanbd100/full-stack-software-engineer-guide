# CSS Grid

Two-dimensional layout system. You define rows **and** columns, then place items at specific intersections. Built for page-level structure.

---

## 💡 **Mental Model: Tracks, Lines, and Cells**

Grid thinks in **tracks** (rows + columns), **lines** (the grid's coordinate system), and **cells** (track intersections).

**How It Works:**
- **Explicit grid** — tracks you define with `grid-template-columns` / `grid-template-rows`.
- **Implicit grid** — tracks Grid creates automatically when content overflows your explicit layout. Sized by `grid-auto-rows` / `grid-auto-columns`.
- **Lines** are numbered from 1. A 3-column grid has lines 1, 2, 3, 4.

> **Key Insight:** Flexbox aligns items along **one axis**. Grid places items at **fixed coordinates** in a 2D plane. If you find yourself counting children to make rows line up in Flexbox, you want Grid.

---

## 💡 **Container Properties**

```css
.container {
  display: grid;                       /* or inline-grid */

  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: auto 1fr auto;

  /* Or name regions */
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";

  gap: 16px;                           /* row-gap column-gap */

  /* Alignment of items within their cells */
  justify-items: stretch;              /* inline (column) axis */
  align-items: stretch;                /* block (row) axis */

  /* Alignment of the whole grid when smaller than container */
  justify-content: start;
  align-content: start;

  /* Sizing for implicit tracks */
  grid-auto-rows: minmax(100px, auto);
  grid-auto-flow: row;                 /* row | column | dense */
}
```

**Common Mistake:** Forgetting that `justify-items` / `align-items` align items **inside their own cell**, while `justify-content` / `align-content` align the **entire grid** inside the container. Two different axes of control.

---

## 💡 **The `fr` Unit and `minmax()`**

`fr` = fraction of **leftover** space, after fixed and auto tracks are sized.

```css
grid-template-columns: 200px 1fr 2fr;
/* 200px reserved first, then remaining width split 1:2 */
```

`minmax(min, max)` defines a track that flexes within bounds.

```css
grid-template-columns: minmax(200px, 1fr) 3fr;
/* First column: never below 200px, never above 1fr share */
```

**Common Mistake:**
```css
/* ❌ Bad — 1fr alone allows tracks to shrink below content size */
grid-template-columns: 1fr 1fr 1fr;  /* long content overflows */

/* ✅ Good — guarantees minimum width */
grid-template-columns: repeat(3, minmax(0, 1fr));
```

> **Key Insight:** `1fr` has an implicit min-content size. Long words inside a `1fr` track expand the column. `minmax(0, 1fr)` is the grid equivalent of Flexbox's `min-width: 0` fix.

---

## 💡 **`repeat()` + `auto-fit` vs `auto-fill` (Interview Classic)**

```css
/* Responsive card grid — no media queries */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
```

Both `auto-fit` and `auto-fill` create as many columns as will fit. The difference shows when there are **fewer items than columns**.

| Value | Empty Tracks | Items Behavior |
|---|---|---|
| `auto-fill` | **Kept** as empty columns | Items stay at min size, gaps fill the row |
| `auto-fit` | **Collapsed** to zero | Items stretch to fill the whole row |

```
Container: 1000px, minmax(250px, 1fr), 2 items

auto-fill: [250px][250px][empty][empty]    items stay narrow
auto-fit:  [   500px   ][   500px   ]      items expand
```

> **Key Insight:** Use `auto-fit` when you want items to grow and fill. Use `auto-fill` when you want a consistent column size regardless of item count (e.g., aligning with a sibling grid).

---

## 💡 **Item Placement**

```css
.item {
  /* Line-based */
  grid-column: 1 / 3;        /* from line 1 to line 3 */
  grid-column: 1 / span 2;   /* from line 1, span 2 tracks */
  grid-row: 2 / -1;          /* row 2 to last line */

  /* Shorthand */
  grid-area: 1 / 1 / 3 / 3;  /* row-start / col-start / row-end / col-end */

  /* Or use named areas from grid-template-areas */
  grid-area: header;

  /* Override container alignment */
  justify-self: center;
  align-self: end;
}
```

**Negative line numbers count from the end.** `-1` is the last line, `-2` is second-to-last. Useful for "span to the end" without knowing column count.

---

## 💡 **`subgrid` (Modern Browsers)**

Lets a nested grid **inherit the parent's track sizing**. Without it, nested grids have independent tracks and never line up.

```css
.parent {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
}
.child {
  display: grid;
  grid-template-columns: subgrid;  /* aligns with parent's columns */
  grid-column: 1 / -1;
}
```

✅ Use when card internals (title, meta, body) must align across cards.
❌ Avoid if you support older browsers without polyfill — fall back to flat grid.

> **Key Insight:** Before subgrid, the only fix for aligned card content was reaching outside the component or duplicating track definitions. Subgrid removes that hack.

---

## 💡 **Grid vs Flexbox: When to Choose**

| Use Grid When | Use Flexbox When |
|---|---|
| Layout is **2D** — rows and columns must align | Layout is **1D** — row or column |
| You know the shape ahead of time | Content size drives layout |
| Dashboards, page shells, image galleries | Nav bars, toolbars, tag lists |
| Items need explicit placement | Items distribute along an axis |

✅ Grid: "Place this in row 2, column 3."
✅ Flex: "Spread these along the row."

Real apps nest them — Grid for page skeleton, Flexbox inside cards and toolbars.

---

## 💡 **Common Patterns**

### 1. Responsive Card Grid (No Media Queries)

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}
```

Adds columns as space allows, collapses to one column on mobile. Zero breakpoints.

### 2. Holy Grail with Named Areas

```css
.app {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 240px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header header"
    "sidebar main   aside"
    "footer  footer footer";
}
.app > header  { grid-area: header; }
.app > nav     { grid-area: sidebar; }
.app > main    { grid-area: main; }
.app > aside   { grid-area: aside; }
.app > footer  { grid-area: footer; }
```

Readable at a glance — the CSS looks like the layout.

### 3. Centered Content with Max Width

```css
.page {
  display: grid;
  grid-template-columns:
    1fr
    min(72ch, 100% - 32px)
    1fr;
}
.page > * { grid-column: 2; }
```

Side columns absorb extra space. Content stays readable. No `margin: 0 auto` on every child.

---

## ❓ **Interview Questions**

**Q: What's the difference between `auto-fit` and `auto-fill`?**
> Both fit as many columns as possible into the container. With fewer items than columns: `auto-fill` keeps the empty tracks (items stay at min size), `auto-fit` collapses them (items stretch to fill the row). Use `auto-fit` for fluid card grids, `auto-fill` when track count must stay consistent.

**Q: When do you choose Grid over Flexbox?**
> Grid for **2D layouts** where rows and columns must align — dashboards, page shells, gallery layouts. Flex for **1D, content-driven** distribution — nav bars, button rows, toolbars. They're complementary, not competing. Most apps use Grid at the page level and Flex inside components.

**Q: What does `1fr` actually mean?**
> One fraction of the **leftover** space after fixed-size and auto-sized tracks are accounted for. `1fr 2fr` splits leftover 1:2. Gotcha: `1fr` has an implicit min of content size, so long words can expand the track. Use `minmax(0, 1fr)` to prevent that.

**Q: How does the implicit grid differ from the explicit grid?**
> The explicit grid is what you define with `grid-template-columns/rows`. When you place an item outside that (or add more items than fit), Grid creates implicit tracks automatically. Their size is controlled by `grid-auto-rows` / `grid-auto-columns`. Useful for unknown-count content where structure is partly defined.

**Q: What problem does `subgrid` solve?**
> Aligning content **across sibling grid children**. Without subgrid, a nested grid has its own tracks — titles and meta lines in side-by-side cards don't line up. With `grid-template-columns: subgrid`, the child inherits the parent's track sizes and internal content aligns across cards. Modern browsers only.

---

[← Back to HTML & CSS](./README.md)
