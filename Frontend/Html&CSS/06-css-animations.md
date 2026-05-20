# CSS Animations

> Motion that respects performance budgets, accessibility, and the rendering pipeline — not just `transition: all`.

---

## 1. Transition vs Animation

### 💡 **Two Tools, Different Jobs**

| Aspect | `transition` | `animation` (`@keyframes`) |
|--------|--------------|----------------------------|
| Triggered by | State change (hover, class toggle) | Automatically or via class |
| Defines | Start → end only | Multi-step sequence |
| Loops | No | Yes (`infinite`) |
| Best for | Hover, focus, simple state | Spinners, complex choreography |

**When to Use:**
- ✅ `transition` — color changes on hover, sliding a modal in on class toggle, button feedback.
- ✅ `animation` — loading spinners, attention-getting pulses, multi-step entrance choreography.
- ❌ Don't use `animation` with `infinite` for state-driven UI — that's a transition.

> **Key Insight:** If the motion runs because something changed, use `transition`. If it runs on its own timeline, use `animation`.

---

## 2. Transition Properties

```css
.button {
  transition: transform 200ms ease-out 0ms;
  /*          property   duration  easing     delay */
}

.button:hover { transform: scale(1.05); }
```

| Property | Purpose |
|----------|---------|
| `transition-property` | Which property animates (or `all`) |
| `transition-duration` | How long (use `ms`, e.g., `200ms`) |
| `transition-timing-function` | Easing curve |
| `transition-delay` | Wait before starting |

**Common Mistakes:**
- ❌ `transition: all 300ms` — animates every property, including layout-triggering ones. Costly.
- ✅ List specific properties: `transition: transform 200ms, opacity 200ms`.

⚠️ Durations under 100ms feel instant; over 500ms feel sluggish. UI feedback lives in 150–300ms.

---

## 3. `@keyframes` and Animation Properties

```css
@keyframes slide-in {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

.panel {
  animation: slide-in 300ms ease-out both;
  /*         name      dur   easing   fill-mode */
}
```

| Property | Purpose |
|----------|---------|
| `animation-name` | Keyframes to use |
| `animation-duration` | Length per iteration |
| `animation-timing-function` | Easing |
| `animation-delay` | Wait before start |
| `animation-iteration-count` | Number of loops (`infinite` allowed) |
| `animation-direction` | `normal`, `reverse`, `alternate` |
| `animation-fill-mode` | Apply styles before/after run (`forwards`, `backwards`, `both`) |
| `animation-play-state` | `running` or `paused` |

> **Key Insight:** Without `animation-fill-mode: forwards`, the element snaps back to its pre-animation state when the animation ends. This bites people constantly.

---

## 4. Timing Functions

```css
transition-timing-function: ease;            /* default — slow-fast-slow */
transition-timing-function: linear;          /* constant speed */
transition-timing-function: ease-in;         /* slow start */
transition-timing-function: ease-out;        /* slow end */
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* custom */
transition-timing-function: steps(4, end);   /* discrete steps (sprite animation) */
```

**Choosing:**
- `ease-out` — most natural for elements *entering* (decelerate as they arrive).
- `ease-in` — for elements *leaving* (accelerate as they exit).
- `linear` — only for continuous motion like spinners.
- `cubic-bezier(0.4, 0, 0.2, 1)` — Material Design's "standard" curve; reliable default.
- `steps()` — sprite sheets, typewriter effects.

> **Key Insight:** Real-world motion accelerates and decelerates. `linear` looks robotic except for true infinite loops.

---

## 5. Performance — The Critical Section

### 💡 **The Rendering Pipeline**

Each frame can go through:

```
Style → Layout → Paint → Composite
```

- **Layout** (reflow): geometry recalc. Slowest. Triggered by `width`, `height`, `top`, `margin`, `padding`, `font-size`, etc.
- **Paint**: filling pixels. Triggered by `color`, `background`, `box-shadow`, `border-radius`.
- **Composite**: layer compositing on the GPU. Cheapest. Triggered by `transform` and `opacity`.

### 💡 **The Two Magic Properties**

```css
/* Composite-only — GPU accelerated, 60fps even on slow devices */
transform: translateX(100px);
opacity: 0.5;
```

**Why:** `transform` and `opacity` skip layout *and* paint. The browser promotes the element to its own compositor layer and animates it on the GPU.

**Common Mistakes:**
- ❌ Animating `width`, `height`, `top`, `left` — triggers layout every frame. Janky.
- ✅ Use `transform: translate()` instead of `top/left`. Use `transform: scale()` instead of `width/height`.

| Property | Pipeline Cost |
|----------|---------------|
| `transform` | Composite only ✅ |
| `opacity` | Composite only ✅ |
| `background-color` | Paint ⚠️ |
| `box-shadow` | Paint ⚠️ |
| `width`, `height`, `top`, `left` | Layout ❌ |
| `margin`, `padding` | Layout ❌ |

> **Key Insight:** "Animate transform and opacity" is the single most important CSS performance rule. Bring it up in any animation interview.

---

## 6. `will-change` — Use Sparingly

### 💡 **A Hint, Not a Free Pass**

```css
.modal {
  will-change: transform, opacity;
}
```

**How It Works:** `will-change` tells the browser to promote an element to its own compositor layer *before* animation starts, avoiding a one-frame setup hiccup.

**When to Use:**
- ✅ Right before an expensive animation, ideally toggled via JS.
- ❌ Globally, on many elements, or "just in case."

**Why "sparingly":** Each promoted layer consumes GPU memory. Slapping `will-change` everywhere can crash mobile browsers and make things *slower*.

```typescript
// Toggle just-in-time, then remove
element.style.willChange = 'transform';
element.addEventListener('transitionend', () => {
  element.style.willChange = 'auto';
}, { once: true });
```

> **Key Insight:** `will-change` is a debugging tool you reach for *after* measuring a problem — not a default.

---

## 7. `prefers-reduced-motion` — Accessibility

Some users get nausea, headaches, or vestibular issues from motion. The OS exposes a setting; respect it.

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

⚠️ Don't kill animation entirely — some motion conveys meaning (focus rings, state changes). Replace large parallax/translation with simple fades.

> **Key Insight:** Mentioning `prefers-reduced-motion` in an interview signals senior-level a11y awareness instantly.

---

## 8. View Transitions API — Modern Briefly

The View Transitions API animates between two DOM states automatically — even across pages (with the Cross-Document variant in Chrome).

```typescript
// Same-document
document.startViewTransition(() => {
  updateTheDOM(); // synchronous DOM mutation
});
```

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}
```

**Why it matters:** Previously, animating between page states (route changes, list reorders) required heavy JS libraries. Now the browser handles snapshots, layout diffing, and crossfade. Pair with `view-transition-name` to animate specific elements between states.

⚠️ Baseline 2024 (Chrome, Edge). Safari/Firefox catching up. Use as progressive enhancement.

---

## 9. Common Patterns

### Fade In
```css
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.item { animation: fade-in 200ms ease-out both; }
```

### Slide In
```css
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.toast { animation: slide-up 250ms cubic-bezier(0.4, 0, 0.2, 1) both; }
```

### Spinner
```css
@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  animation: spin 1s linear infinite;
  /* linear is correct here — continuous motion */
}
```

### Pulse (Attention)
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
.badge { animation: pulse 1.5s ease-in-out infinite; }
```

---

## Interview Questions

### ❓ **Q: Why animate `transform` and `opacity` instead of `top`/`left`/`width`?**

The browser's rendering pipeline goes Style → Layout → Paint → Composite. `transform` and `opacity` only touch the composite step, which runs on the GPU and doesn't recompute geometry or repaint pixels. `top`, `left`, `width`, and `height` trigger layout — the most expensive step — for every frame. On a 60fps target you have 16ms per frame; layout-triggering animations blow past that on mobile, causing jank.

### ❓ **Q: When should you use `will-change`, and what's the risk of overusing it?**

Use `will-change` immediately before an expensive animation starts, on a specific element, then remove it after. It forces the browser to promote the element to its own compositor layer, avoiding a setup hiccup on the first animated frame. The risk: each promoted layer costs GPU memory. Applying `will-change` globally or to many elements can exhaust memory, especially on mobile, making the page slower or crashing it. Treat it as a precision tool, not a default.

### ❓ **Q: How do you make animations accessible?**

Three things. First, respect `prefers-reduced-motion` — wrap heavy motion in a `@media` query and tone it down (short fades instead of large translations). Second, don't convey critical information through motion alone — pair it with text or color changes. Third, keep durations short (under 400ms) and avoid flashing patterns that can trigger photosensitive seizures.

### ❓ **Q: When would you reach for the View Transitions API over a CSS animation?**

When the motion needs to bridge two different DOM states — like a route change, a list reorder, or expanding a thumbnail into a detail view. CSS animations work on a single element transitioning between styles; View Transitions snapshot the before and after states of the entire document (or named regions) and crossfade or morph between them. It replaces a lot of FLIP-pattern JS code with a single API call.

---

[← Back to HTML & CSS](./README.md)
