# Utility-First vs Component-First CSS

Two ways to author styles in a modern app:

- **Utility-first** — compose styles from tiny single-purpose classes in the markup (`p-4 flex gap-2`). Tailwind is the canonical example.
- **Component-first** — write semantic classes scoped to a component (`.card`, `.button--primary`). CSS Modules and styled-components are the canonical examples.

The interesting question isn't "which is better" — both work. It's **when** each one pays off and what they cost.

---

## The Core Tradeoff

| | Utility-First | Component-First |
|---|---|---|
| **Where styles live** | In the markup | In a separate stylesheet / styled block |
| **Abstraction unit** | The utility (`mt-4`) | The component (`.card`) |
| **First-paint cost** | Larger initial HTML | Larger initial CSS |
| **Refactor cost** | Cheap — change markup | Expensive — find all consumers of `.card` |
| **Design system cost** | Cheap — tokens in `tailwind.config` | Cheap — tokens in CSS vars |
| **Learning curve** | Memorize utility names | Memorize project conventions |

The split is really about **where you pay the abstraction tax** — at write time or at maintenance time.

---

## Utility-First (Tailwind)

### 💡 **What It Is**

Single-purpose classes applied directly in markup. No new CSS file per component.

```tsx
function Card({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{body}</p>
    </article>
  );
}
```

**How It Works:** A build step (Tailwind's JIT compiler) scans your source files for class names and generates only the CSS you actually use. Unused utilities never ship.

### Pros

- ✅ **No naming.** You don't bikeshed over `.card-wrapper` vs `.card-container`.
- ✅ **Local reasoning.** Styles live next to markup; no jumping between files.
- ✅ **Dead code = zero.** If a class isn't in markup, the build doesn't emit it.
- ✅ **Tiny CSS payload.** Production CSS is usually 10–20 KB gzipped regardless of app size.
- ✅ **Design system is the config.** `tailwind.config.ts` holds tokens; designers and engineers share one source of truth.

### Cons

- ❌ **Long class strings.** A complex component can hit 200+ characters of `className`.
- ❌ **Markup churn on design tweaks.** Changing a button's padding means editing every button instance (unless you extract a component — which you should).
- ❌ **Hard to override deeply.** Pseudo-selectors, complex media queries, and `:has()` work but feel awkward.
- ❌ **Lock-in to one toolchain.** Tailwind's build step is non-negotiable.

### When to Reach for It

- ✅ Greenfield app with a small-to-medium team
- ✅ Strong component framework (React/Vue/Svelte) — you abstract repetition into components, not classes
- ✅ You ship a lot of one-off marketing pages or admin UIs
- ❌ You need to support unscoped legacy CSS at the same time — Tailwind's resets will fight it
- ❌ Email templates or CMS rich-text — utilities don't survive HTML sanitizers

> **Key Insight:** Tailwind isn't "CSS in your HTML." It's **a constrained design system enforced through class names.** The constraint is the point — engineers can't invent a `#3B82F7` blue when the only blue is `bg-blue-500`.

---

## Component-First (CSS Modules / styled-components)

### 💡 **What It Is**

A semantic class per component, scoped automatically so name collisions can't happen.

**CSS Modules:**
```css
/* Card.module.css */
.card {
  padding: 16px;
  border-radius: 8px;
  background: var(--color-surface);
}

.title {
  font-size: 18px;
  font-weight: 600;
}
```

```tsx
import styles from "./Card.module.css";

interface CardProps {
  title: string;
  body: string;
}

function Card({ title, body }: CardProps) {
  return (
    <article className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <p>{body}</p>
    </article>
  );
}
```

**How It Works:** The bundler rewrites class names to something unique (`Card_card__a3f9`) at build time. Two files can both declare `.card` without conflict.

### Pros

- ✅ **Semantic class names.** `.card` reads as "the card" — easier to grep, easier to debug in DevTools.
- ✅ **Full CSS power.** Media queries, `:has()`, container queries, keyframes — all natural.
- ✅ **Clean markup.** `className={styles.card}` instead of 12 utilities.
- ✅ **Familiar.** Junior engineers don't need to learn a utility vocabulary.

### Cons

- ❌ **More files.** Every component gets a `.module.css` sibling.
- ❌ **CSS can drift from markup.** Delete a component, forget the stylesheet.
- ❌ **Token discipline is on you.** No tooling stops someone from writing `padding: 17px` instead of using `var(--space-4)`.
- ❌ **Runtime cost (styled-components).** Generating styles in JS adds bundle size and a render-time cost. The library officially moved to maintenance mode in 2024 — prefer CSS Modules or [vanilla-extract](https://vanilla-extract.style/) for new projects.

### When to Reach for It

- ✅ Component libraries published to npm — consumers don't want to install Tailwind
- ✅ Apps with complex, dynamic styling driven by props (themes, A/B variants)
- ✅ Teams with strong existing CSS skills who hate utility soup
- ❌ Marketing pages with lots of one-off layouts — you'll write throwaway CSS files

> **Key Insight:** CSS Modules give you the **scoping** of utility-first without the **constraint**. That's a feature for component libraries and a bug for product apps where consistency matters more than flexibility.

---

## The Hybrid (What Most Real Teams Do)

In practice, large codebases use both:

- **Tailwind for layout and one-off styling** — `flex`, `gap-4`, `mt-2`, spacing utilities
- **Component-scoped CSS for complex internals** — animations, `:has()` selectors, container queries, anything that gets ugly inline

```tsx
import styles from "./DataTable.module.css";

function DataTable() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <table className={styles.table}>{/* complex selectors live in CSS */}</table>
    </div>
  );
}
```

This works because Tailwind and CSS Modules don't fight — they target different problems. Tailwind handles the boring 80% (spacing, flex, colors). Modules handle the messy 20% (cross-element selectors, complex animations).

⚠️ The trap: teams adopt both **without rules** about which to use when. Result: half the codebase is utilities, half is modules, nobody knows where to look. **Write the rule down** — even one sentence in the README.

---

## Tradeoff Table

| Concern | Utility-First | Component-First |
|---------|---------------|-----------------|
| **Cold-start dev velocity** | Slow (memorize utilities) | Fast (write what you know) |
| **6-month-in velocity** | Fast (no naming, no file hop) | Slower (more files to navigate) |
| **Design system enforcement** | Strong (config-bound) | Weak (developer discipline) |
| **Final CSS bundle size** | Tiny (10–20 KB) | Grows with components (50–200 KB) |
| **Refactoring a color/spacing token** | Edit config, rebuild | Edit CSS var, rebuild |
| **Refactoring a layout pattern** | Edit every instance or extract a component | Edit one class |
| **DevTools debugging** | Hard (which utility set padding?) | Easy (one named class) |
| **Server-side rendering** | Trivial | Trivial (Modules), harder (styled-components) |

---

## Decision Rule

| Project Shape | Pick |
|---------------|------|
| Product app, React/Vue, small-to-medium team | **Tailwind**, extract components when class lists repeat |
| Published component library (`@acme/ui`) | **CSS Modules** or **vanilla-extract** — don't force consumers to use Tailwind |
| Design-system-heavy enterprise app | **Tailwind for tokens + CSS Modules for complex components** |
| Legacy app with existing BEM CSS | **Keep BEM**, don't introduce Tailwind on top — pick one and migrate |
| Email or sanitized HTML | **Inline styles** — neither approach survives email clients |

⚠️ Avoid styled-components for new code in 2026. It's in maintenance mode and the runtime cost is real. CSS Modules, vanilla-extract, or Tailwind cover the same ground without the JS overhead.

---

## Interview Questions

### 💡 **Q: Tailwind looks like inline styles. Why isn't it?**

Inline styles can't do media queries, hover states, pseudo-elements, or theming. They also can't be deduplicated — every instance ships the same bytes. Tailwind's utilities are **real classes** that the browser caches once and reuses everywhere. The "looks like inline" part is purely visual; the runtime behavior is completely different.

### 💡 **Q: A teammate says Tailwind violates "separation of concerns." How do you respond?**

Separation of concerns was about **separating logic from presentation**, not separating HTML from CSS. With component frameworks, the unit of concern is the **component** — markup, styles, and behavior travel together because they describe one thing. Tailwind doesn't break the principle; it relocates the boundary. The real concern to separate is **design tokens** (in config) from **layout** (in markup) — and Tailwind enforces that more strictly than ad-hoc CSS does.

### 💡 **Q: How do you keep utility class lists from becoming unreadable?**

Three rules. **One:** extract a component the moment a class list repeats — `<PrimaryButton />` not 14 buttons with the same 8 utilities. **Two:** use `clsx` or `cva` (class-variance-authority) to organize variant-driven classes. **Three:** sort utilities consistently (Tailwind's Prettier plugin does this automatically). If you're still drowning in classes after that, the component is doing too much — split it.

---

[← Back to CSS Architecture](./README.md)
