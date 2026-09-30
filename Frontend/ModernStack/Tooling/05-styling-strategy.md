---
title: Styling Strategy
part: 3
chapter: 40
slug: styling-strategy
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-23
tags: [css, tailwind, css-modules, css-in-js, design-tokens, rsc]
in_book: true
---

# Styling Strategy {#ch-styling-strategy}

> Argue the Tailwind question with the real tradeoff, and know which styling approaches a Server Component rules out.

**In this chapter:** the one problem every approach solves · naming, utilities, scoped files · what runtime CSS-in-JS costs · the server boundary · the decision rule

## 💡 The Core Idea

CSS has one global namespace and a cascade that rewards whoever writes the most specific selector. Every
styling approach of the last fifteen years answers that single fact. They differ only in **who enforces
the answer**: a naming convention, a build step, or the language itself.

Left alone, every team ends up with the same failure. Selectors grow longer to win cascade fights, and
`!important` appears to end them. Nobody dares delete a class, because nobody can trace its use. The
approaches below each make that failure impossible, and each one charges for it in a different place.

> Nobody is arguing about aesthetics. They are arguing about where the cost lands: in the markup, in
> the stylesheet, in the bundle, or at render time.

## How It Works

Three families, and one of them now has a hard constraint the other two do not.

| Family | Enforced by | Scoping mechanism | Cost lands in |
| ------ | ----------- | ----------------- | ------------- |
| **Naming conventions** — BEM, ITCSS | Discipline and review | A naming rule humans follow | Review, and the first engineer who ignores it |
| **Utility-first** — Tailwind CSS 4 | The framework's class set | There is nothing to scope; classes are single-purpose | Markup readability |
| **Component-scoped** — CSS Modules, vanilla-extract, Emotion | The build, or the runtime | A hashed class name per component | The build step, and for runtime libraries, every render |

### Naming conventions, and why they faded

BEM gives every class a block, an element and a modifier, such as `.card__title--featured`. Two files
cannot collide, and specificity stays flat. ITCSS orders the stylesheet so generic rules load before
specific ones. Both work, and both share one weakness: **they are agreements, not mechanisms.** Nothing
fails when someone writes `.nav ul li a.active`, so on a large team someone eventually does.

They still matter for reading old code, and for one interview answer. A method removes the *reason* to
fight the cascade. The rest of this chapter covers approaches that remove the *ability*.

### Utility-first

A utility class does one thing, such as `p-4`, `text-sm` or `flex`. The stylesheet stops growing with the number
of components, because there is no per-component CSS to write. What grows instead is the markup.

**Tailwind CSS 4 moved configuration into CSS itself:**

```css
@import "tailwindcss";

/* Design tokens are declared here and compile to plain custom properties. */
@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --font-display: "Source Sans 3", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

The output matters more than the syntax. `@theme` compiles to `--color-brand-500` on `:root`, so any
stylesheet, any component and any other approach on this page can read the tokens. **Design tokens as
custom properties are where every approach meets.** They survive whichever framework the team picks next.

### Component-scoped

CSS Modules hash the class name at build time, so scoping costs nothing at runtime:

```tsx
import styles from "./card.module.css";

export function Card({ title }: { title: string }) {
  // `styles.title` is the literal hashed class by the time this ships.
  return <h2 className={styles.title}>{title}</h2>;
}
```

CSS-in-JS extends that idea to styles that depend on props. The split that matters is **when the CSS is
produced**. A runtime library builds the stylesheet while components render, in the browser. A
build-time library produces the identical stylesheet before anything ships, and leaves no library in
the bundle.

**Build-time, with typed tokens:**

```typescript
// card.css.ts — this file runs during the build, never in the browser.
import { style } from "@vanilla-extract/css";

export const title = style({
  fontSize: "1.25rem",
  color: "var(--color-brand-500)",
  ":hover": { opacity: 0.9 },
});
```

## When to Use It

The Server Component boundary is what turned this from a preference into a constraint.

A runtime CSS-in-JS library produces styles *while rendering*, so it needs its runtime wherever a styled
component renders. React Server Components render on the server and ship no JavaScript. So every styled
component has to be marked `'use client'`, and that pulls its whole subtree across the boundary with it.
Two components deep into a page, the styling library has decided the app's architecture.

| Situation | Choose | Why |
| --------- | ------ | --- |
| React 19 Server Components, or Next.js App Router | Tailwind, CSS Modules or vanilla-extract | No runtime, so nothing is forced across the client boundary |
| A design system consumed by many teams | Tokens as custom properties, plus CSS Modules | The contract is the token, not the framework |
| Product UI on a tight performance budget | Utility-first | The stylesheet stops growing; there is no styling layer to maintain |
| Genuinely dynamic styles in a client-heavy SPA | Emotion | Prop interpolation is direct, and the app is already JavaScript-bound |
| An existing styled-components codebase | Stay, unless profiling says otherwise | Migration is real work, and the library still runs |

> ⚠️ **Moving target:** styled-components entered maintenance mode in 2024. Tailwind moved to CSS-first
> configuration in v4. The recommended zero-runtime library changes every year or two. The lasting
> principle does not change: work done during render happens on every render, on the user's device.
> Moving that work to build time is always possible and always cheaper.

### What runtime CSS-in-JS actually costs

Three separate costs. Interviewers usually want the middle one.

- **Bundle:** 7–15 KB gzipped before a single style is written.
- **Render:** parsing the template, hashing it and inserting the rule. This repeats on every re-render
  that changes an interpolated value, and it runs on the user's device, not yours.
- **Payload:** server-rendered HTML carries the collected `<style>` block. The document grows with the
  size of the rendered tree, not with the size of the design system.

## Common Mistakes

**❌ Defining a styled component inside a component body.**

```tsx
import styled from "@emotion/styled";

function Panel() {
  // Recreated on every render: the class-name cache is thrown away and React
  // remounts the DOM node, losing focus and scroll position with it.
  const Box = styled.div`padding: 8px;`;
  return <Box />;
}
```

**✅ Define it at module scope**, where it is created once. Or move the varying part to a custom
property and keep the rule static.

**❌ Treating "Tailwind versus CSS Modules" as the whole question.** Both are zero-runtime, and both
use the same tokens. A team can use utilities for layout and modules for a complex component, and most
large codebases end up there. The answer that scores names the constraint first, then picks. The
constraint is the server boundary, the performance budget or the size of the team.

**❌ Letting the styling approach own the design tokens.** Say the brand colour lives only in a Tailwind
config, or only in a TypeScript theme object. Then the next framework migration is a rewrite. Declare
tokens as custom properties, and every approach on this page can read them.

## 🔑 Key Takeaways

- Every styling approach answers one problem, the global namespace. They differ in whether a human, the
  build or the runtime enforces the answer.
- Runtime CSS-in-JS costs bundle size, per-render work and a larger server-rendered document. Build-time
  libraries produce the same CSS and leave nothing behind.
- A runtime styling library forces `'use client'` down the tree. It makes an architectural decision, not
  a styling one.
- Design tokens belong in custom properties, not in a framework's config, because they outlive the
  framework.
- Utility-first and component-scoped CSS are not opposites. Large codebases usually run both against one
  token set.

## Interview Questions

**Q: A team wants to add styled-components to a Next.js App Router project. What do you say?**

That it works, and that it costs more than the styling. A runtime library produces CSS during render, so
every styled component needs `'use client'`. That pulls its subtree out of the server tree with it, and
the bundle grows for a reason that has nothing to do with the feature. CSS Modules or vanilla-extract
give the same way of writing styles with no runtime. If the codebase already runs styled-components
everywhere, staying is defensible. Adding it to a new App Router project is not.

**Q: Where does utility-first CSS actually save you, and where does it cost you?**

It saves you the naming. The costly part of component-first CSS is not writing the rule. It is inventing
a name for every visual variant, then keeping the name true as the design moves. Utilities remove that
job, and the stylesheet stops growing with the component count. The cost is dense markup and a real
onboarding step. It is an argument about maintenance cost, not about keystrokes.

**Q: Why are design tokens usually custom properties rather than a TypeScript object?**

Because every layer can read a custom property at once: a utility framework, a CSS Module, an inline
style, and a third-party component that knows nothing about your build. Only code that imports a
TypeScript token object can read it. So it splits the design system in two the moment anything outside
the bundle needs a colour. Custom properties also change at runtime. That is how theming and dark mode
work without shipping a second stylesheet.

**Q: When would you not reach for a styling framework at all?**

When the surface is small and the constraint is payload, such as a marketing page, an embedded widget or
an email template. A few hundred lines of hand-written CSS with custom properties beats any framework on
bytes, and it has no upgrade path to maintain. A framework earns its place once several people write
styles at the same time and the naming starts to break.

## What to Read Next

- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — the boundary that rules out runtime styling libraries
- [Chapter ?? — Design Systems, Dependencies and Upgrades](#ch-design-systems-at-scale) — where the token contract is actually set
- [Chapter ?? — Loading, Code Splitting and Bundle Budgets](#ch-loading-and-code-splitting) — how to see what a styling library costs in a real build
