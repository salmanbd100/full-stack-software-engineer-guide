# Responsive Design

> Designing interfaces that adapt to any screen, input mode, and user preference — not just three breakpoints.

---

## 1. Mobile-First Philosophy

### 💡 **Why `min-width` Beats `max-width`**

Mobile-first means writing base styles for small screens, then progressively enhancing for larger ones using `min-width` queries.

**How It Works:** Browsers parse CSS top-down. Mobile-first ships the lightest layout first (no overrides), then layers complexity. Desktop-first does the opposite — every small screen pays the cost of unwinding desktop styles.

**When to Use:**
- ✅ Almost always. 60%+ of global traffic is mobile.
- ❌ Internal dashboards that will never load on phones.

**Common Mistakes:**
- ❌ Mixing `min-width` and `max-width` chaotically → specificity wars.
- ✅ Pick one direction (usually `min-width`) and stack queries in ascending order.

```css
/* Mobile-first */
.card { padding: 1rem; }

@media (min-width: 768px) {
  .card { padding: 2rem; }
}

@media (min-width: 1200px) {
  .card { padding: 3rem; }
}
```

> **Key Insight:** Mobile-first is about *cascade hygiene*, not just small screens. You write less CSS and override less.

---

## 2. The Viewport Meta Tag

### 💡 **What It Actually Does**

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

**How It Works:** Without this tag, mobile browsers render at a virtual 980px viewport then scale down — making text tiny and media queries useless. `width=device-width` tells the browser to use the device's actual CSS pixel width. `initial-scale=1` prevents zoom-out on load.

**Common Mistakes:**
- ❌ `user-scalable=no` — breaks accessibility (WCAG fail). Users must be able to zoom.
- ✅ Let users zoom. Use `maximum-scale=5` if you need a cap.

> **Key Insight:** No viewport tag = your media queries effectively do nothing on mobile.

---

## 3. Fluid Units

### 💡 **Choosing the Right Unit**

| Unit | What It Is | Best For |
|------|------------|----------|
| `%` | Relative to parent | Layout widths inside containers |
| `vw` / `vh` | 1% of viewport width/height | Hero sections, full-screen modals |
| `rem` | Relative to root font-size | Spacing, typography (respects user font-size) |
| `em` | Relative to current element's font-size | Component-internal scaling |
| `ch` | Width of "0" character | Line-length caps for readability |
| `dvh` / `svh` / `lvh` | Dynamic/small/large viewport height | Mobile heroes (handles URL bar) |

⚠️ Use `dvh` instead of `vh` for full-height layouts on mobile — `vh` ignores the dynamic browser chrome.

### 💡 **`clamp()` — The Interview Favorite**

`clamp(MIN, PREFERRED, MAX)` returns the preferred value, bounded by min and max.

```css
/* Fluid typography — no media queries needed */
h1 {
  font-size: clamp(1.5rem, 4vw + 1rem, 3rem);
}

/* Fluid spacing */
section {
  padding: clamp(1rem, 5vw, 4rem);
}
```

**How It Works:** The middle value scales with the viewport (`4vw + 1rem`). `clamp()` clips it between `1.5rem` and `3rem` so it never gets too small or too large.

**When to Use:**
- ✅ Typography, spacing, gaps that should scale smoothly.
- ❌ Breakpoint-specific layout changes (use media queries).

> **Key Insight:** `clamp()` replaces dozens of media queries with one line. Mention it whenever fluid scaling comes up.

---

## 4. Media Queries Beyond Width

### 💡 **Modern Media Features**

```css
/* Dark mode */
@media (prefers-color-scheme: dark) { ... }

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

/* Touch vs mouse */
@media (hover: hover) and (pointer: fine) {
  .button:hover { transform: scale(1.05); }
}

/* High contrast */
@media (prefers-contrast: more) { ... }

/* Orientation */
@media (orientation: landscape) { ... }
```

| Feature | What It Detects |
|---------|-----------------|
| `prefers-color-scheme` | OS dark/light mode |
| `prefers-reduced-motion` | Motion sensitivity setting |
| `hover` | Can the primary input hover? (mouse=yes, touch=no) |
| `pointer` | Precision: `fine` (mouse), `coarse` (finger), `none` |
| `prefers-contrast` | High-contrast accessibility setting |

> **Key Insight:** `hover: hover` is the right way to gate hover effects. Width-based detection ("is screen small? then it's touch") is wrong — tablets, hybrids, and touch laptops break that assumption.

---

## 5. Container Queries — The Modern Answer

### 💡 **`@container` vs `@media`**

Media queries respond to the **viewport**. Container queries respond to a **parent element's size**. This lets a component adapt based on where it's placed.

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

.card { display: block; }

@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

**How It Works:** Declare an ancestor as a query container (`container-type: inline-size`). Children can then query that container's width — independent of the viewport.

**When to Use:**
- ✅ Reusable components dropped into sidebars, modals, and main columns.
- ✅ Design systems where the component doesn't know its context.
- ❌ Page-level layout (still media queries — there's no container above the body).

| Aspect | Media Queries | Container Queries |
|--------|---------------|-------------------|
| Responds to | Viewport size | Ancestor element size |
| Use case | Page layout, breakpoints | Component-level adaptation |
| Composability | Component breaks in narrow containers | Component adapts anywhere |
| Browser support | Universal | Baseline 2023 (Chrome/Safari/Firefox) |

> **Key Insight:** Container queries fix the biggest weakness of media queries — components that don't know their own context.

---

## 6. Responsive Images

### 💡 **`srcset` + `sizes` (Resolution Switching)**

Let the browser pick the best image based on viewport and DPR.

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1600.jpg 1600w"
  sizes="(min-width: 768px) 50vw, 100vw"
  alt="Mountain landscape"
/>
```

**How It Works:** `srcset` lists candidate files with their intrinsic widths (`400w`). `sizes` tells the browser how wide the image will *render* at each breakpoint. Browser computes which file fits best for the current screen and DPR.

### 💡 **`<picture>` (Art Direction)**

Use when you want a *different image* per breakpoint — not just a different resolution. Classic case: tight portrait crop on mobile, wide landscape on desktop.

```html
<picture>
  <source media="(min-width: 768px)" srcset="hero-wide.jpg" />
  <source media="(max-width: 767px)" srcset="hero-portrait.jpg" />
  <img src="hero-wide.jpg" alt="Hero" />
</picture>
```

Also useful for modern format negotiation:

```html
<picture>
  <source type="image/avif" srcset="hero.avif" />
  <source type="image/webp" srcset="hero.webp" />
  <img src="hero.jpg" alt="Hero" />
</picture>
```

| Need | Use |
|------|-----|
| Same image, different sizes | `srcset` + `sizes` |
| Different crop/composition | `<picture>` with `media` |
| Format fallbacks (AVIF → WebP → JPG) | `<picture>` with `type` |

> **Key Insight:** `srcset` saves bandwidth. `<picture>` makes editorial decisions. Don't confuse them.

---

## 7. Intrinsic Design — Beyond Media Queries

### 💡 **Grid + `clamp()` + `minmax()` = No Breakpoints**

Modern CSS lets layouts adapt without explicit breakpoints.

```css
/* Auto-fitting grid — items reflow naturally */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}
```

**How It Works:** `auto-fit` creates as many columns as fit. `minmax(280px, 1fr)` enforces a minimum column width. `min(100%, 280px)` prevents overflow on narrow screens. The result: a grid that goes from 1 column to N columns with zero media queries.

> **Key Insight:** Senior frontend interviews love this pattern. It shows you understand modern CSS instead of reflexively reaching for `@media`.

---

## 8. Breakpoint Strategy

No universal answer, but a defensible starting point:

| Breakpoint | Target | Use |
|------------|--------|-----|
| `< 640px` | Phones | Base styles |
| `640px+` | Large phones, small tablets | Adjust spacing, two-column small content |
| `768px+` | Tablets | Sidebars appear, multi-column |
| `1024px+` | Laptops | Full desktop layout |
| `1280px+` | Large screens | Wider gutters, cap content width |

**Principle:** Pick breakpoints where *your design breaks*, not arbitrary device sizes. Resize the window — fix the first ugly state.

⚠️ Don't target specific devices ("iPad Pro"). Devices change yearly. Content-driven breakpoints don't.

---

## Interview Questions

### ❓ **Q: How does `clamp()` work, and why use it over media queries?**

`clamp(MIN, PREFERRED, MAX)` returns the preferred value clipped between min and max. The preferred value usually mixes a relative unit (like `vw`) with a fixed offset, giving smooth, viewport-aware scaling. Versus media queries: `clamp()` interpolates continuously between sizes, while media queries snap at breakpoints. For typography and spacing, `clamp()` produces a better visual experience with one line of CSS.

### ❓ **Q: Container queries vs media queries — when do you use each?**

Media queries respond to the viewport — use them for page-level layout decisions (sidebar visible vs hidden, nav layout, hero sizing). Container queries respond to a parent element's size — use them for components that need to adapt based on where they're placed (a card that becomes horizontal in a wide column but stacks in a narrow sidebar). Container queries make components truly reusable; media queries can't, because the same component lives in different-sized contexts.

### ❓ **Q: Why is `100vh` broken on mobile, and what fixes it?**

On mobile browsers (especially iOS Safari), `100vh` is calculated against the *largest* viewport — the area when browser chrome is hidden. When the URL bar is visible, `100vh` exceeds the visible area, causing scroll or cut-off content. Fix: use `100dvh` (dynamic viewport height) which updates as chrome shows/hides. Fallback chain: `min-height: 100vh; min-height: 100dvh;`.

### ❓ **Q: What's wrong with using `max-width` queries for hover states?**

Width is a proxy for input type — and a wrong one. A 1280px touchscreen laptop has no hover. A 600px window on a desktop does. Use `@media (hover: hover) and (pointer: fine)` instead — it detects the actual input capability, not the screen size.

---

[← Back to HTML & CSS](./README.md)
