---
title: CSS Methodologies
part: 2
chapter: 0
slug: css-methodologies
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-01
tags: [css, methodologies, bem, itcss, specificity]
in_book: true
---

# CSS Methodologies {#ch-css-methodologies}

> Name and organise styles so a stranger can add a rule without breaking three others.

**In this chapter:** the three problems every methodology attacks · BEM · ITCSS · the two OOCSS rules worth keeping · when methodology stops mattering

## 💡 The Core Idea

CSS has one global namespace and a cascade that rewards whoever writes the most specific selector.
Left alone, a team converges on the same failure: selectors grow longer to win cascade fights,
`!important` appears to end them, and nobody dares delete a class because they cannot trace its use. A
methodology is a written agreement about naming and file order that removes the incentive to fight. It
does not make CSS better; it makes CSS boring, which at forty engineers is the same thing.

> The methodologies differ in vocabulary and agree on the mechanism: keep specificity flat and
> predictable, and the cascade stops being a hazard.

## How It Works

Three structural problems, and each methodology picks one to attack.

| Problem | What happens without an agreement | Attacked by |
| ------- | --------------------------------- | ----------- |
| Global namespace | `.button` in one file silently overrides `.button` in another | BEM |
| Specificity cascade | `.nav ul li a.active` beats `.active`, so everyone escalates | ITCSS |
| Container coupling | A heading changes size because of where it happens to sit | OOCSS |

### BEM — naming

`block__element--modifier`. A **block** is a standalone component (`card`), an **element** is a child
with no meaning outside it (`card__title`), a **modifier** is a variant or state (`card--featured`).

```css
.card { padding: 16px; border-radius: 8px; }
.card__title { font-size: 18px; font-weight: 600; }
.card--featured { border: 2px solid gold; }
```

```html
<article class="card card--featured">
  <h2 class="card__title">Title</h2>
</article>
```

The double underscores are not the point. The point is that **every selector is a single class**, so
every rule has specificity `0,1,0` and later rules win by source order rather than by cleverness. That
one constraint removes most specificity bugs on its own.

Two things go wrong in practice. Nesting elements — `.card__header__title` — breaks the flat rule for
no gain; the element level is always one below the block, wherever it physically sits. And using
modifiers for layout — `.card--margin-top-20` — turns a semantic variant system into a badly named
utility set. Modifiers describe what the block *is*, not where it sits.

### ITCSS — import order

ITCSS orders the stylesheet so specificity only ever climbs.

```text
Settings → Tools → Generic → Elements → Objects → Components → Utilities
```

Low-specificity, wide-reaching rules load first; narrow, high-specificity rules load last. Because each
layer only adds specificity and never subtracts, a rule in a later layer wins without needing a longer
selector. It is an import-order convention, not a naming one, which is why ITCSS and BEM compose
rather than compete: ITCSS decides *where* a rule lives, BEM decides *what* it is called.

### OOCSS — two rules worth keeping

**Separate structure from skin.** A reusable layout class should not carry colour.

```css
.media { display: flex; gap: 12px; }        /* structure — reused everywhere */
.skin-card { background: white; border-radius: 8px; }  /* skin — swapped */
```

**Separate container from content.** Do not style a child based on its ancestor.

```css
/* ❌ The heading's size now depends on where it happens to be rendered. */
.sidebar h2 { font-size: 14px; }

/* ✅ The rule travels with the element. */
.heading-sm { font-size: 14px; }
```

OOCSS lost as a brand and won as a habit. Utility-first CSS is these two rules taken to their limit,
and component frameworks enforce the second one by construction.

### SMACSS — categories

SMACSS categorises rules — base, layout, module, state, theme — rather than naming them. Most of it
dissolved once components arrived, but its `is-` prefix for transient state (`.is-active`,
`.is-loading`) outlived the rest and is worth adopting on its own: it marks a class as something
JavaScript toggles, not something a designer owns.

## When to Use It

| You are building | Pick | Why |
| ---------------- | ---- | --- |
| Component-scoped React, Vue or Svelte app | Skip the methodology | The bundler already scopes. Keep only BEM's one-class rule |
| Large design system in plain CSS or Sass | ITCSS for order, BEM for names | They solve different problems and compose cleanly |
| Server-rendered app with no build-time scoping | BEM alone | Naming is the only problem you actually have |
| Legacy stylesheet full of `!important` | ITCSS, applied to new code only | Layer order is what stops the escalation |
| Marketing site with several themes | SMACSS categories plus BEM naming | Theme and state need somewhere to live |

> ⚠️ Methodology is a team contract, and a contract nobody checks is a preference. Enforce it with a
> linter rule, or expect drift within two quarters.

## Common Mistakes

**❌ Wrong — winning the cascade with length:**

```css
/* Each of these was added to beat the one above it. */
.sidebar .nav ul li a.active { color: red; }
.page .sidebar .nav ul li a.active { color: blue !important; }
```

**✅ Right — one class, decided by layer:**

```css
/* Components layer. */
.nav__link { color: var(--color-text); }

/* Utilities layer, imported last, so it wins without extra specificity. */
.is-active { color: var(--color-accent); }
```

The long selector does not just lose readability. It sets a precedent, and the next engineer has to
write a longer one to override it.

**❌ Wrong — layering a methodology on a scoped system.** Adding BEM names inside CSS Modules gives you
`Card_card__a3f9 card__title` and two scoping mechanisms for one problem. Pick the one the toolchain
already gives you.

## 🔑 Key Takeaways

- Every methodology exists to make the cascade predictable, and they differ mainly in vocabulary.
- BEM's real rule is one class per selector, which flattens specificity to `0,1,0` everywhere.
- ITCSS is about import order, not naming, so it composes with BEM rather than replacing it.
- OOCSS's two rules — structure apart from skin, content apart from container — apply whatever else you use.
- In a component-scoped codebase most of a methodology is redundant, because the bundler solves the namespace problem.

## Interview Questions

**Q: Why does BEM use double underscores instead of nested selectors?**

To keep specificity flat. `.card__title` is `0,1,0`; `.card .title` is `0,2,0` and starts an arms race
where every override needs one more selector. BEM trades a visually ugly class name for a cascade you
can reason about, which is the right trade once more than one person edits the stylesheet.

**Q: Would you choose ITCSS or BEM?**

Both, because they answer different questions. ITCSS is import order — where a rule lives and therefore
when it loads. BEM is naming — what a class is called. In a large Sass codebase you use ITCSS for the
layers and BEM inside the components layer.

**Q: How do you migrate a legacy stylesheet with specificity wars?**

Contain rather than rewrite. Add one low-specificity namespace for new work, build every new screen
inside it, and leave the old rules untouched. Then replace screen by screen. Big-bang CSS rewrites fail
because the regressions are visual and invisible to tests until a user finds them.

**Q: When is a methodology the wrong answer?**

When the toolchain already scopes styles. In a React codebase with CSS Modules or a utility framework,
BEM's naming buys nothing and SMACSS's categories blur, because every component is already its own
namespace. The one part worth keeping is the single-class habit.

## What to Read Next

- [Chapter ?? — Utility-First vs Component-First CSS](#ch-utility-vs-component) — what replaced these conventions and what it kept
- [Chapter ?? — Design Systems](#ch-cssarchitecture-design-systems) — where the tokens these rules reference come from
