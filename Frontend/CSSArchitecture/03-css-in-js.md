# CSS-in-JS

> Write CSS inside JavaScript. Styles get scoped, dynamic, and co-located with components.

---

## 💡 **What CSS-in-JS Is**

CSS-in-JS lets you write styles directly in component files. The library generates unique class names at runtime (or build time) and injects styles into the page.

**Why it exists:**
- **Scoping** — no global class name collisions.
- **Dynamic styles** — change styles based on props, theme, or state.
- **Co-location** — styles live next to the component that uses them.
- **Dead code removal** — unused components mean unused styles get dropped.

**Two main camps:**

| Approach | Examples | Cost |
|----------|----------|------|
| **Runtime** | styled-components, Emotion | JS overhead at render time |
| **Zero-runtime** | Linaria, Vanilla Extract | Extracts CSS at build time |

---

## 💡 **styled-components**

The most popular runtime library. Uses tagged template literals to define styled elements.

**How It Works:** Each `styled.div` call generates a unique class name and injects CSS into the document head when the component first renders.

```typescript
import styled from 'styled-components';

interface ButtonProps {
  $primary?: boolean;
  $size?: 'sm' | 'md' | 'lg';
}

const Button = styled.button<ButtonProps>`
  background: ${(props) => (props.$primary ? '#3b82f6' : '#fff')};
  color: ${(props) => (props.$primary ? '#fff' : '#111')};
  padding: ${(props) => (props.$size === 'lg' ? '12px 24px' : '8px 16px')};
  border-radius: 6px;
  border: 1px solid #e5e7eb;

  &:hover {
    opacity: 0.9;
  }
`;

// Usage
<Button $primary $size="lg">Save</Button>
```

**Transient props** — Use the `$` prefix so React doesn't forward the prop to the DOM.

**When to Use:**
- ✅ Heavily dynamic styles driven by props or theme.
- ✅ Component-library projects where styles ship with the component.
- ❌ Static marketing sites (use CSS or Tailwind).
- ❌ Performance-critical apps with many style variants.

**Common Mistakes:**

❌ **Bad** — Defining styled components inside render:
```typescript
function Card() {
  const Wrapper = styled.div`padding: 16px;`; // Recreated every render
  return <Wrapper />;
}
```

✅ **Good** — Define at module scope:
```typescript
const Wrapper = styled.div`padding: 16px;`;

function Card() {
  return <Wrapper />;
}
```

> **Key Insight:** styled-components is convenient but adds runtime cost. Every render evaluates template literals and may inject new style rules.

---

## 💡 **Emotion**

Similar API to styled-components plus a `css` prop for one-off styles. Smaller, slightly faster, more flexible.

```typescript
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import styled from '@emotion/styled';

// Same styled API as styled-components
const Card = styled.div`
  padding: 16px;
  background: #fff;
`;

// Inline css prop
function Banner() {
  return (
    <div
      css={css`
        background: #fef3c7;
        padding: 12px;
      `}
    >
      Notice
    </div>
  );
}
```

**Emotion vs styled-components:**

| Feature | styled-components | Emotion |
|---------|-------------------|---------|
| Bundle size | ~12 KB | ~7 KB |
| `css` prop | No | Yes |
| Performance | Slower | Faster |
| API surface | Smaller | Larger |
| Active maintenance | Slower | Faster |

For most new projects, Emotion is the better runtime pick.

---

## 💡 **Zero-Runtime CSS-in-JS**

Libraries like **Linaria** and **Vanilla Extract** extract CSS at build time. You write CSS-in-JS syntax, but the output is plain static CSS files. No runtime cost.

### Vanilla Extract

Type-safe CSS using TypeScript. Generates static CSS at build time.

```typescript
// button.css.ts
import { style } from '@vanilla-extract/css';

export const button = style({
  background: '#3b82f6',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 6,
  ':hover': {
    opacity: 0.9,
  },
});

// Button.tsx
import { button } from './button.css';

export function Button() {
  return <button className={button}>Save</button>;
}
```

### Linaria

Looks like styled-components but extracts to CSS files:

```typescript
import { styled } from '@linaria/react';

const Button = styled.button`
  background: #3b82f6;
  color: #fff;
`;
// Compiles to a regular .css file at build time
```

**Why they matter:**
- Zero JS runtime cost.
- Smaller client bundle.
- Faster First Contentful Paint.
- Plays well with SSR and React Server Components.

---

## 💡 **Runtime vs Zero-Runtime Tradeoffs**

| Aspect | Runtime (styled-components, Emotion) | Zero-Runtime (Linaria, Vanilla Extract) |
|--------|-------------------------------------|-----------------------------------------|
| Dynamic prop-based styles | Easy | Limited — usually via CSS variables |
| Bundle size | +7–15 KB | 0 KB runtime |
| Render performance | Slower (serialize + inject) | Same as plain CSS |
| Theming | Trivial via context | Via CSS variables |
| React Server Components | Limited / hacky | Full support |
| Type safety | Optional | Strong (Vanilla Extract) |

**Decision flow:**
1. Need React Server Components? → Zero-runtime or CSS Modules.
2. Heavy dynamic styling and SPA? → Emotion or styled-components.
3. Want type-safe tokens and zero overhead? → Vanilla Extract.
4. Just want to ship fast? → Tailwind.

---

## 💡 **SSR Considerations**

Runtime libraries must collect styles on the server and inject them into the HTML response.

```typescript
// Next.js pages router with styled-components
import { ServerStyleSheet } from 'styled-components';

const sheet = new ServerStyleSheet();
const html = renderToString(sheet.collectStyles(<App />));
const styleTags = sheet.getStyleElement();
```

**Common SSR problems:**
- **FOUC** — unstyled flash if styles aren't extracted properly.
- **Hydration mismatch** — server and client generate different class names.
- **RSC incompatibility** — styled-components needs `'use client'` everywhere.

Zero-runtime libraries avoid all of this. CSS is just CSS.

---

## 💡 **Performance and Bundle Size**

This comes up often in interviews.

**Runtime cost breakdown:**
- Library code: 7–15 KB gzipped.
- Per-component cost: template parsing + hashing + style insertion.
- Re-render cost: re-evaluates template literals.

**Real-world impact:**
- Heavy CSS-in-JS apps can drop 5–15 ms per render on mid-range mobile.
- First paint slows because styles inject after JS executes.
- Server-rendered HTML balloons with inlined `<style>` tags.

**Mitigations:**
- Use `styled.div.attrs()` to avoid recreating styles.
- Memoize expensive style interpolations.
- Move global styles to a static CSS file.
- Consider migrating to Vanilla Extract or Tailwind for hot paths.

> **Key Insight:** styled-components became popular when React was new. Today, with RSC and stricter perf budgets, zero-runtime options are the better default for new code.

---

## 💡 **Decision Rule**

| Use Case | Pick |
|----------|------|
| Dynamic theming, SPA, fast iteration | Emotion |
| Type-safe design system, perf matters | Vanilla Extract |
| Next.js App Router / React Server Components | Vanilla Extract or CSS Modules |
| Existing styled-components codebase | Stick unless perf forces migration |
| Greenfield app, no special needs | Tailwind |

---

## 🎯 **Interview Questions**

**Q1: What problem does CSS-in-JS solve that plain CSS doesn't?**
Three things: automatic scoping (no global collisions), dynamic styles tied to props or state, and co-location of styles with components. It also enables dead-code elimination — if a component is tree-shaken, its styles go with it.

**Q2: Why are zero-runtime libraries like Vanilla Extract gaining traction?**
Runtime CSS-in-JS adds JS to parse, serialize, and inject styles on every render. Zero-runtime libraries do all that at build time. The output is a static CSS file. You keep the developer experience of writing styles in TS but pay zero runtime cost. They also work with React Server Components, which runtime libraries struggle with.

**Q3: What's the SSR challenge with styled-components and how do you solve it?**
On the server, styled-components must collect every style rule rendered, then inline them in the HTML head. Without this, the client sees a flash of unstyled content. You use `ServerStyleSheet.collectStyles()` and `getStyleElement()`. The downside: it serializes a lot of CSS into HTML, increasing payload size, and it doesn't work cleanly with React Server Components.

---

[← Back to CSS Architecture](./README.md)
