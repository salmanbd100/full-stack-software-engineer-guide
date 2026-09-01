---
title: CSS Animations
part: 2
chapter: 0
slug: css-animations
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-01
tags: [css, animations, compositor, performance, reduced-motion]
in_book: true
---

# CSS Animations {#ch-css-animations}

> Animate on the compositor, respect `prefers-reduced-motion`, and say why `transition: all` costs you frames.

**In this chapter:** transition against animation · `@keyframes` and fill mode · easing that looks physical · the rendering pipeline · `will-change` · reduced motion · view transitions

## 💡 The Core Idea

A browser has about 16 milliseconds to produce a frame, and it spends that budget in four stages:
style, layout, paint, composite. Which CSS property you animate decides how many of those stages run
sixty times a second. `transform` and `opacity` run only the last one, on the GPU, and stay smooth on a
cheap phone. `width`, `height`, `top` and `left` run all four, and miss frames. Every other animation
question — easing, duration, `will-change` — is polish on top of that one decision.

> Animate `transform` and `opacity`. Everything else is a performance conversation waiting to happen.

## How It Works

| | `transition` | `animation` with `@keyframes` |
| - | ------------ | ----------------------------- |
| Runs when | A property's value changes | On its own timeline, or when a class is added |
| Describes | Start to end | Any number of intermediate steps |
| Can loop | No | Yes |
| Right for | Hover, focus, a class toggle | Spinners, entrances, choreography |

The rule is simple: if the motion happens *because something changed*, it is a transition. If it runs
on its own schedule, it is an animation.

```css
.button {
  /* property duration easing delay — list properties explicitly. */
  transition: transform 200ms ease-out;
}

.button:hover { transform: scale(1.05); }
```

```css
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.toast {
  /* `both` applies the from-state before the run and holds the to-state after it. */
  animation: slide-up 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
```

`animation-fill-mode` is the property people lose an afternoon to. Without `forwards` or `both`, the
element snaps back to its pre-animation styles the instant the animation ends.

### Easing

| Curve | Use for |
| ----- | ------- |
| `ease-out` | Anything entering — it decelerates as it arrives, which reads as physical |
| `ease-in` | Anything leaving — it accelerates away |
| `linear` | Continuous loops only, such as a spinner |
| `cubic-bezier(0.4, 0, 0.2, 1)` | A reliable general-purpose curve |
| `steps(n)` | Sprite sheets and typewriter effects |

Real motion accelerates and decelerates, so `linear` reads as mechanical everywhere except a true
infinite loop. Duration matters as much: under 100ms feels instantaneous, over 500ms feels sluggish,
and UI feedback belongs in 150–300ms.

### The pipeline

```text
Style → Layout → Paint → Composite
```

| Property | Cheapest stage it reaches |
| -------- | ------------------------- |
| `transform`, `opacity` | Composite — GPU, no geometry, no repaint |
| `background-color`, `box-shadow`, `border-radius` | Paint |
| `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size` | Layout |

Layout is the expensive one because changing one element's geometry can change its siblings' and its
ancestors'. So the substitutions matter: `transform: translate()` instead of `top` and `left`,
`transform: scale()` instead of `width` and `height`.

This is also why `transition: all` is a mistake rather than a shortcut. It opts every property into
animation, including the layout-triggering ones, and a later declaration that changes `width` for an
unrelated reason silently becomes an animation.

### `will-change`

```typescript
// Promote just before the animation, and release afterwards.
element.style.willChange = 'transform';
element.addEventListener(
  'transitionend',
  () => {
    element.style.willChange = 'auto';
  },
  { once: true },
);
```

`will-change` asks the browser to promote an element to its own compositor layer *before* the animation
starts, which removes a one-frame setup cost. Each promoted layer costs GPU memory, so applying it
broadly — or permanently in a stylesheet — makes a page slower and can exhaust memory on mobile. It is
a tool you reach for after measuring, not a default.

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Motion can cause nausea and migraine for users with vestibular disorders, and the operating system
already exposes their preference. The blanket rule above is the right *floor*, but the better treatment
is per-component: replace large translations and parallax with a short fade, and keep the small motion
that carries meaning, such as a focus or state change.

### View transitions

```typescript
function navigate(update: () => void): void {
  // Progressive enhancement: no API, no transition, same result.
  if (!document.startViewTransition) return update();
  // The callback must mutate the DOM synchronously — the browser snapshots either side of it.
  document.startViewTransition(update);
}
```

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}

/* A matching name on both sides makes the browser morph between them. */
.hero { view-transition-name: hero; }
```

The API snapshots the document before and after a DOM change and animates between the two, which
replaces the FLIP-pattern JavaScript that route changes and list reorders used to need.

> ⚠️ **Moving target:** same-document view transitions are widely available; cross-document
> transitions are still rolling out. The durable principle is that the browser can interpolate between
> two states more cheaply than JavaScript can, so treat it as enhancement and keep the un-animated path
> correct.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Hover, focus, a toggled class | `transition` on named properties | Simplest thing that reads the state change |
| A spinner or a looping pulse | `animation` with `linear` or `ease-in-out` | Continuous motion has no start state to transition from |
| Moving an element | `transform: translate()` | `top` and `left` recompute layout every frame |
| Resizing an element | `transform: scale()` | Same reason, plus text stays crisp under a scale |
| An element entering the page | `ease-out` and `animation-fill-mode: both` | Deceleration reads as arriving; fill mode stops the snap-back |
| A route change or list reorder | View transitions, as enhancement | The browser interpolates two document states for you |

## Common Mistakes

**❌ Wrong — animating layout:**

```css
.drawer {
  transition: left 300ms; /* Layout on every frame; janky on mobile. */
  left: -300px;
}
```

**✅ Right — animating the compositor:**

```css
.drawer {
  transition: transform 300ms ease-out;
  transform: translateX(-100%);
}
```

**❌ Wrong — `transition: all`.** It animates properties you never intended, including layout ones, and
it makes future changes to the element surprising.

**❌ Wrong — `will-change` in a stylesheet on a common class.** A hundred promoted layers is a hundred
allocations of GPU memory, held for the life of the page.

**❌ Wrong — motion as the only signal.** If a state change is communicated purely by movement, users
with reduced motion enabled — and anyone who looked away — miss it entirely.

## 🔑 Key Takeaways

- Only `transform` and `opacity` animate on the compositor alone, which is why they stay smooth on slow devices.
- Layout-triggering properties recompute geometry every frame and will miss the 16ms budget on mobile.
- `animation-fill-mode` decides whether the element holds its final state; without it, it snaps back.
- `will-change` trades GPU memory for a smoother first frame, so it belongs on one element at a time and after measurement.
- `prefers-reduced-motion` is an operating-system signal about health, and the right response is smaller motion rather than none.

## Interview Questions

**Q: Why animate `transform` rather than `top` and `left`?**

Because the rendering pipeline is style, layout, paint, composite, and `transform` skips the first three
of those — the browser hands the layer to the GPU and moves it. `top` and `left` change geometry, so
layout runs for the element and potentially its siblings on every frame. With roughly 16ms per frame at
60fps, that is the difference between smooth and visibly janky on a mid-range phone.

**Q: What does `will-change` actually do, and why is it dangerous?**

It tells the browser to promote the element to its own compositor layer ahead of time, so the first
animated frame does not pay the setup cost. Each layer consumes GPU memory, so declaring it on a shared
class or leaving it applied permanently can make the page slower than it was and exhaust memory on
mobile. Apply it just before the animation and remove it after.

**Q: How do you make an animation accessible?**

Honour `prefers-reduced-motion` by replacing large translation and parallax with a short fade rather
than removing all feedback. Never carry information in motion alone — pair it with text or a state
change. Keep durations short, and avoid flashing patterns, which can trigger photosensitive seizures.

**Q: When would you not animate something at all?**

When the motion delays information the user asked for. A staggered entrance on a data table means the
numbers arrive later than they could have, and on a repeat visit it is purely a cost. Motion earns its
place when it explains a spatial relationship — where a panel came from, what expanded into what — and
not when it is decoration on a path the user takes twenty times a day.

## What to Read Next

- [Chapter ?? — Accessibility](#ch-accessibility) — the rest of the user-preference queries
- [Chapter ?? — Advanced CSS](#ch-advanced-css) — the platform features that landed alongside these
