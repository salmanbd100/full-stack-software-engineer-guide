# CSS Methodologies

A CSS methodology is a convention for **naming, scoping, and organizing styles** so a codebase stays predictable as it grows. The real problems it solves: avoiding specificity wars, preventing global name clashes, and making styles safe to delete.

You rarely need every rule from a methodology. You need the parts that stop your CSS from turning into `!important` soup at 50k lines.

---

## Why Methodologies Exist

Plain CSS has three structural problems:

| Problem | What Happens Without a Methodology |
|---------|-------------------------------------|
| **Global namespace** | `.button` in one file overrides `.button` in another |
| **Specificity cascade** | Teams stack selectors (`.nav ul li a.active`) to win battles, then fight back with `!important` |
| **Dead code** | Nobody dares delete a class because they can't trace its usage |

A methodology gives you a shared rule for class names and file structure. That's it. Everything else (utilities, design tokens, etc.) sits on top.

---

## BEM (Block, Element, Modifier)

The most widely used naming convention. If your team picks one methodology, it's usually this.

### 💡 **The Pattern**

A flat naming scheme: `block__element--modifier`.

- **Block** — standalone component (`card`, `nav`, `search-form`)
- **Element** — child that has no meaning outside the block (`card__title`, `nav__item`)
- **Modifier** — variant or state (`card--featured`, `nav__item--active`)

**How It Works:** Every class is a single class selector. No nesting, no descendant combinators. Specificity stays flat at `0,1,0`.

```css
/* Block */
.card { padding: 16px; border-radius: 8px; }

/* Elements */
.card__title { font-size: 18px; font-weight: 600; }
.card__body  { color: #444; }

/* Modifiers */
.card--featured       { border: 2px solid gold; }
.card__title--large   { font-size: 24px; }
```

```html
<article class="card card--featured">
  <h2 class="card__title card__title--large">Title</h2>
  <p class="card__body">Body text</p>
</article>
```

**When to Use:**
- ✅ Large teams where consistency matters more than brevity
- ✅ Component-driven apps without scoped styles (no CSS Modules)
- ❌ Small projects — the verbosity hurts more than it helps
- ❌ Codebases already using CSS Modules or Tailwind (BEM duplicates their scoping)

### Common Mistakes

❌ **Nesting elements in class names:**
```css
.card__header__title { } /* Wrong */
```

✅ **Keep it flat — element is always one level below the block:**
```css
.card__title { } /* Right, even if it lives inside .card__header */
```

❌ **Using BEM modifiers for layout:**
```css
.card--margin-top-20 { margin-top: 20px; }
```

✅ **Modifiers describe the block's variant, not arbitrary spacing. Use utilities or composition for layout:**
```css
.card--featured { } /* semantic variant */
```

> **Key Insight:** BEM's real value isn't the double underscores — it's the rule that **every selector is a single class**. That alone kills 90% of specificity bugs.

---

## SMACSS (Scalable and Modular Architecture for CSS)

A way to **categorize** rules, not a naming convention. You can combine SMACSS with BEM.

### The Five Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Base** | Element defaults, resets | `body`, `a`, `h1` |
| **Layout** | Page sections, grids | `.l-header`, `.l-sidebar` |
| **Module** | Reusable components | `.card`, `.btn`, `.modal` |
| **State** | Temporary states | `.is-active`, `.is-hidden` |
| **Theme** | Visual variants | `.theme-dark` |

**When to Use:**
- ✅ When you need a clear folder structure but don't want strict naming rules
- ✅ Codebases with lots of theming or state-driven UI
- ❌ Component-scoped systems (React + CSS Modules) — categories blur

> **Key Insight:** SMACSS's `is-` prefix for state (`.is-active`, `.is-loading`) survived into most modern codebases even when the rest of SMACSS didn't.

---

## ITCSS (Inverted Triangle CSS)

A way to **order your stylesheet** so specificity climbs gradually instead of zig-zagging.

### The Seven Layers

```
┌─────────────────────────┐
│ 1. Settings  (variables) │  ← low specificity, wide reach
│ 2. Tools     (mixins)    │
│ 3. Generic   (resets)    │
│ 4. Elements  (h1, a)     │
│ 5. Objects   (.o-grid)   │
│ 6. Components(.c-card)   │
│ 7. Utilities (.u-mt-2)   │  ← high specificity, narrow reach
└─────────────────────────┘
```

You import layers in this order. Each layer only adds specificity — never subtracts. That single rule eliminates most cascade fights.

**When to Use:**
- ✅ Large monolithic stylesheets (design systems, marketing sites)
- ✅ When the team keeps adding `!important` to win cascade wars
- ❌ Component-scoped React apps — most layers collapse into one file per component

> **Key Insight:** ITCSS isn't about names — it's about **import order**. The triangle exists to enforce: low-specificity selectors load first, high-specificity ones load last.

---

## OOCSS (Object-Oriented CSS)

Two principles, both worth keeping even if you never call it OOCSS.

### 💡 **The Two Principles**

**1. Separate structure from skin.**
A reusable layout class (structure) should not include colors or borders (skin).

```css
/* Structure — reusable */
.media { display: flex; gap: 12px; }

/* Skin — swappable */
.skin-card    { background: white; border-radius: 8px; }
.skin-warning { background: #fff3cd; border: 1px solid #ffc107; }
```

**2. Separate container from content.**
Don't style children based on their parent.

❌ **Bad — content depends on container:**
```css
.sidebar h2 { font-size: 14px; }
```

✅ **Good — content is independent:**
```css
.heading-sm { font-size: 14px; }
```

**When to Use:**
- ✅ Always, as a habit — these two rules apply regardless of methodology
- ❌ As a full methodology — OOCSS predates components, and React already enforces composition

> **Key Insight:** OOCSS lost as a brand but won as a mindset. Tailwind's utility composition is OOCSS taken to its logical extreme.

---

## Comparison

| Methodology | Solves | Best For | Downside |
|-------------|--------|----------|----------|
| **BEM** | Naming + flat specificity | Component libraries without scoped CSS | Verbose class names |
| **SMACSS** | File organization | Theming and state-heavy UIs | Vague category boundaries |
| **ITCSS** | Specificity cascade | Large monolithic stylesheets | Overkill for component apps |
| **OOCSS** | Reusability | Any codebase, as a principle | Too abstract as a full system |

---

## Decision Rule

| You're Building | Pick |
|-----------------|------|
| Component-scoped React/Vue app | **Skip methodologies** — CSS Modules or Tailwind scope for you. Borrow BEM's "one class per element" rule. |
| Large design system, plain CSS/SCSS | **ITCSS + BEM** — ITCSS for layer order, BEM for naming |
| Server-rendered app (Rails, Django) | **BEM** alone is usually enough |
| Marketing site with many themes | **SMACSS** for organization, BEM for naming |

⚠️ Methodology is a team contract. Picking the "best" one matters less than picking one and enforcing it via linters (`stylelint-bem-pattern`, `stylelint-selector-bem-pattern`).

---

## Interview Questions

### 💡 **Q: Why does BEM use double underscores instead of nested selectors?**

Double underscores keep specificity flat. `.card__title` and `.card__body` both have specificity `0,1,0`. A nested version `.card .title` would be `0,2,0` and start a specificity arms race. BEM trades visual ugliness for predictable cascade.

### 💡 **Q: When would you choose ITCSS over BEM?**

They solve different problems. BEM is a naming convention; ITCSS is an import-order convention. In a large SCSS codebase you use both: ITCSS for **where** rules live, BEM for **what** classes are called. The question is misleading — they compose.

### 💡 **Q: How do you migrate a legacy CSS codebase with specificity wars to a methodology?**

You don't rewrite — you contain. Add a single new layer (e.g. `.app-v2` namespace) with low-specificity rules. New components live there. Old code stays untouched. Over time, replace screens one at a time. Big-bang CSS rewrites almost always fail because regressions are invisible until production.

---

[← Back to CSS Architecture](./README.md)
