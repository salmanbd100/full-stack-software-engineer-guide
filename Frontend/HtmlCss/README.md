# HTML & CSS

Core HTML and CSS topics for senior frontend interviews. Focused on the patterns, tradeoffs, and gotchas that actually come up — not exhaustive reference material.

## 📚 Topics

| # | Topic | What you'll learn |
|---|-------|-------------------|
| 1 | [Semantic HTML](./01-semantic-html.md) | Landmarks, section vs article, heading order, forms, ARIA basics |
| 2 | [CSS Fundamentals](./02-css-fundamentals.md) | Box model, specificity, cascade, positioning, units, `@layer` |
| 3 | [Flexbox](./03-flexbox.md) | Axis model, `flex: 1` gotcha, `min-width: 0` trick, 1D patterns |
| 4 | [Grid](./04-grid.md) | 2D layout, `minmax(0, 1fr)`, `auto-fit` vs `auto-fill`, subgrid |
| 5 | [Responsive Design](./05-responsive-design.md) | Mobile-first, `clamp()`, container queries, `srcset` / `<picture>` |
| 6 | [CSS Animations](./06-css-animations.md) | Transition vs animation, compositor-only properties, `will-change`, reduced motion |
| 7 | [Accessibility](./07-accessibility.md) | POUR, ARIA rules, focus management, contrast, screen readers |
| 8 | [Advanced CSS](./08-advanced-css.md) | Custom properties, `oklch()`, `@layer`, `:has()`, logical properties, View Transitions |

---

## 🎯 Interview Focus

### Most asked
1. Box model + `box-sizing` — why every reset sets `border-box`
2. Specificity and cascade — the source of most CSS bugs
3. Flexbox vs Grid — when to reach for each
4. Responsive design — mobile-first, `clamp()`, container queries
5. Semantic HTML and accessibility — the senior signal

### Frequently asked
6. Positioning + stacking contexts (the `z-index` trap)
7. Units: `px` vs `rem` vs `em` vs `clamp()`
8. `auto-fit` vs `auto-fill` in grid
9. What is `:has()` and why does it matter?
10. How does the browser paint vs composite an animation?

---

## 💡 Essential Patterns

```css
/* Modern centering */
.center {
  display: grid;
  place-items: center;
}

/* Intrinsic responsive grid (no media queries) */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}

/* Fluid typography */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

/* Container query */
@container (min-width: 600px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

---

## 🔗 References

- [MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) · [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [CSS Tricks](https://css-tricks.com/) · [web.dev — Learn CSS](https://web.dev/learn/css/)
- [Can I Use](https://caniuse.com/) · [WCAG 2.2 Quick Ref](https://www.w3.org/WAI/WCAG22/quickref/)
- [Flexbox Froggy](https://flexboxfroggy.com/) · [Grid Garden](https://cssgridgarden.com/)

---

[← Back to Frontend](../README.md)
