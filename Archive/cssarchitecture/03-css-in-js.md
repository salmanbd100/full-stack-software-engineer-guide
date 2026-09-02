---
title: CSS-in-JS
part: 2
chapter: 0
slug: css-in-js
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-01
tags: [css, css-in-js, emotion, vanilla-extract, ssr, performance]
in_book: true
---

# CSS-in-JS {#ch-css-in-js}

> Say what runtime CSS-in-JS costs at render and hydration, and pick a zero-runtime alternative when it does not earn that cost.

**In this chapter:** what CSS-in-JS bought · runtime against build-time extraction · the server-rendering problem · the measurable cost · the decision rule

## 💡 The Core Idea

CSS-in-JS answered three real problems at once: scoping without a naming convention, styles that depend
on props, and styles that live next to the component that uses them. The disagreement is not about
whether those are worth having — it is about *when* the CSS gets produced. A runtime library builds the
stylesheet while your components render, in the browser, on every render. A build-time library produces
exactly the same stylesheet before anything ships. The developer experience is nearly identical; the
cost profile is not.

> The question is never "CSS-in-JS or not". It is "at build time or at render time", and only one of
> those answers is free.

## How It Works

A runtime library turns a template literal into a hashed class name, serialises the declarations, and
inserts a rule into a stylesheet in the document head the first time the component renders.

```typescript
import styled from '@emotion/styled';

interface ButtonProps {
  // The $ prefix marks a transient prop so it is not forwarded to the DOM.
  $primary?: boolean;
}

// Define at module scope. Inside a component body this is recreated on every
// render, which throws away the class-name cache and remounts the DOM node.
const Button = styled.button<ButtonProps>`
  background: ${(props) => (props.$primary ? '#3b82f6' : '#fff')};
  padding: 8px 16px;
  border-radius: 6px;
`;
```

A build-time library takes the same idea and resolves it during compilation. The output is a plain CSS
file and a string of class names — there is no library left in the bundle.

```typescript
// button.css.ts — this file runs at build time, never in the browser.
import { style } from '@vanilla-extract/css';

export const button = style({
  background: '#3b82f6',
  padding: '8px 16px',
  ':hover': { opacity: 0.9 },
});
```

```typescript
import { button } from './button.css';

export function Button() {
  // `button` is a literal class name by the time this ships.
  return <button className={button}>Save</button>;
}
```

| | Runtime (Emotion, styled-components) | Build-time (vanilla-extract, Linaria) |
| - | ------------------------------------ | ------------------------------------- |
| Bundle cost | 7–15 KB gzipped, plus per-render work | Zero — the library is gone |
| Prop-driven styles | Direct, any expression | Through custom properties or variants |
| Theming | Context, or custom properties | Custom properties |
| Server Components | Needs `'use client'` on every styled component | Works unchanged |
| Type safety | Optional | Strong, since the tokens are TypeScript |
| First paint | Styles arrive after JavaScript executes | Styles arrive in the stylesheet |

### The server-rendering problem

A runtime library generates styles while rendering, so on the server it has to collect every rule
produced and inline it into the HTML head. Miss that and the first paint is unstyled. Get it slightly
wrong and the server and client hash class names differently, which React reports as a hydration
mismatch.

The deeper issue is architectural. React Server Components render on the server and ship no JavaScript,
so a library that needs a runtime to produce styles cannot participate — every styled component has to
become a Client Component, which pulls its subtree across the boundary with it.

> ⚠️ **Moving target:** styled-components entered maintenance mode in 2024, and library recommendations
> here change every year or two. The durable principle does not: work done during render happens on
> every render, on the user's device, and moving that work to build time is always available and always
> cheaper.

### What it actually costs

Three separate costs, and interviewers usually want the middle one.

- **Bundle:** 7–15 KB gzipped before you write a single style.
- **Render:** parsing the template, hashing, and inserting rules. On mid-range mobile a
  style-heavy tree measurably adds milliseconds per render, and it repeats on every re-render that
  changes an interpolated value.
- **Payload:** server-rendered HTML carries the collected `<style>` block, so the document grows with
  the size of the rendered tree rather than with the size of the design system.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Next.js App Router, Server Components | vanilla-extract or CSS Modules | A runtime library forces `'use client'` down the tree |
| Type-safe tokens, tight performance budget | vanilla-extract | Tokens are TypeScript and the runtime cost is zero |
| Client-heavy SPA with genuinely dynamic styles | Emotion | Prop interpolation is direct and the app is already JavaScript-bound |
| Existing styled-components codebase | Stay, unless profiling says otherwise | Migration cost is real and the library still works |
| Greenfield product UI with a token scale | A utility framework | Same constraint, no styling layer to maintain |

## Common Mistakes

**❌ Wrong — a styled component inside the render function:**

```typescript
function Card() {
  // New component identity every render: React unmounts the old subtree,
  // and the library re-inserts the rule each time.
  const Wrapper = styled.div`padding: 16px;`;
  return <Wrapper />;
}
```

**✅ Right — module scope, with the dynamic part as a custom property:**

```typescript
const Wrapper = styled.div`
  padding: 16px;
  /* A custom property changes without re-serialising the rule. */
  background: var(--card-bg);
`;

function Card({ bg }: { bg: string }) {
  return <Wrapper style={{ '--card-bg': bg } as React.CSSProperties} />;
}
```

Interpolating a changing value into the template means a new class name and a new rule for every
distinct value. Routing it through a custom property keeps one rule and lets the browser do the work.

**❌ Wrong — putting global styles through the runtime.** Resets, font declarations, and `:root` token
definitions never change per render. Ship them as a static stylesheet so they arrive with the document
rather than after the JavaScript.

## 🔑 Key Takeaways

- CSS-in-JS solved scoping, prop-driven styles and co-location, and build-time libraries keep all three without a runtime.
- Runtime libraries do work on every render, and that work lands on the user's device.
- Server-rendering a runtime library means collecting and inlining styles, which grows the HTML and risks hydration mismatches.
- Runtime CSS-in-JS cannot participate in React Server Components, so every styled component becomes a client boundary.
- Dynamic values belong in custom properties, not in template interpolations that mint a new class per value.

## Interview Questions

**Q: What does CSS-in-JS give you that plain CSS does not?**

Automatic scoping with no naming convention, styles that read props directly, and co-location so
deleting a component deletes its styles. Build-time libraries deliver all three with no runtime, which
is why the category has shifted in that direction rather than away from the idea.

**Q: Why is runtime CSS-in-JS a problem for React Server Components?**

Server Components render on the server and ship no JavaScript. A runtime library needs to execute
during render to produce class names and rules, so any component using it must be a Client Component —
and that marks the whole subtree below it. You end up shipping the JavaScript the architecture exists
to avoid.

**Q: How would you measure whether your styling layer is costing you anything?**

Bundle size for the library itself, then a CPU profile of a re-render-heavy interaction on a throttled
mid-range device — style serialisation and insertion show up as identifiable work. On the server, check
whether the inlined `<style>` block is a meaningful share of the HTML payload, because that delays
first paint directly.

**Q: When would you keep a runtime library despite the cost?**

When the application is a client-rendered SPA whose styles genuinely vary per render in ways custom
properties cannot express, or when the codebase already has thousands of styled components and
profiling shows styling is not the bottleneck. Migration is expensive and a working system that is not
your slowest path is rarely worth rewriting.

## What to Read Next

- [Chapter ?? — Utility-First vs Component-First CSS](#ch-utility-vs-component) — the two alternatives this competes with
- [Chapter ?? — Design Systems](#ch-cssarchitecture-design-systems) — the token layer any of these approaches consumes
