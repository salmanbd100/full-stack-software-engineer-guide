# CSS Architecture

How to scale CSS across enterprise codebases — methodologies, scoping strategies, and design systems. The patterns interviewers actually probe at the senior level.

## 📚 Topics

| # | Topic | What you'll learn |
|---|-------|-------------------|
| 1 | [CSS Methodologies](./01-css-methodologies.md) | BEM, SMACSS, ITCSS, OOCSS — when each makes sense |
| 2 | [Utility-First vs Component-First](./02-utility-vs-component.md) | Tailwind vs CSS Modules vs styled-components — tradeoffs |
| 3 | [CSS-in-JS](./03-css-in-js.md) | styled-components, Emotion, Linaria, Vanilla Extract — runtime vs zero-runtime |
| 4 | [Atomic CSS](./04-atomic-css.md) | One-class-one-property model, design token integration, bundle size wins |
| 5 | [Design Systems](./05-design-systems.md) | Tokens, primitives, composition, theming, governance at scale |

---

## 🎯 Interview Focus

### Most asked
1. BEM vs CSS Modules vs styled-components — which when?
2. Utility-first vs component-first — what are the real tradeoffs?
3. How do you scale CSS across multiple teams?
4. CSS-in-JS runtime cost — when is it worth it?
5. How do you build a design system from scratch?

### Frequently asked
6. What is ITCSS and what problem does it solve?
7. How do you handle theming (dark mode, multi-brand)?
8. Specificity management strategies in large codebases
9. Zero-runtime CSS-in-JS — why does it matter?
10. Migrating legacy CSS — what's your strategy?

---

## 📊 Quick Comparison

### Methodologies

| Aspect | BEM | SMACSS | ITCSS | OOCSS |
|--------|-----|--------|-------|-------|
| **Learning curve** | Easy | Medium | Hard | Medium |
| **Specificity control** | Good | Good | Best | Good |
| **Best for** | Small–medium | Medium–large | Enterprise | Performance-critical |
| **Naming** | Strict | Prefixed | Layered | Object-based |

### Styling approaches

| Aspect | Utility-first | CSS Modules | CSS-in-JS | Atomic |
|--------|---------------|-------------|-----------|--------|
| **Bundle size** | Smallest | Medium | Medium–large | Smallest |
| **Runtime cost** | None | None | Low–high | None |
| **Dynamic styles** | Limited | Limited | Excellent | Limited |
| **Type safety** | Optional | Optional | Native (TS) | Optional |
| **Best for** | Speed + design system | Component libraries | React apps + dynamic theming | High-traffic sites |

---

## 💡 Decision Rule

```
New greenfield React app?
  ├─ Need speed + token system  → Tailwind + design tokens
  ├─ Need dynamic theming        → CSS-in-JS (Emotion/Vanilla Extract)
  └─ Need SSR + perf             → CSS Modules or Vanilla Extract

Enterprise app, multiple teams?
  ├─ Strict specificity needed   → ITCSS + BEM
  └─ Multi-product design system → Tokens + Atomic CSS + primitives

Legacy migration?
  └─ Gradually introduce CSS Modules + BEM for new components
```

---

## 💡 Essential Questions

1. Explain BEM and where it falls short.
2. Utility-first (Tailwind) vs component-first — when does each win?
3. Runtime vs zero-runtime CSS-in-JS — what's the tradeoff?
4. How would you structure a design system for 5 product teams?
5. What's the difference between a token, a primitive, and a component?
6. How do you handle theming without runtime overhead?
7. Why does specificity matter in large codebases?
8. Migration strategy from a 5-year-old CSS codebase?

---

## 🔗 References

- [BEM](https://bem.info/) · [SMACSS](http://smacss.com/) · [ITCSS](https://csswizardry.com/2018/11/itcss-and-skipping-levels/)
- [Tailwind CSS](https://tailwindcss.com/docs) · [CSS Modules](https://github.com/css-modules/css-modules)
- [styled-components](https://styled-components.com/) · [Emotion](https://emotion.sh/) · [Vanilla Extract](https://vanilla-extract.style/)
- [Design Tokens W3C Spec](https://www.designtokens.org/) · [Storybook](https://storybook.js.org/)

---

[← Back to Frontend](../README.md)
