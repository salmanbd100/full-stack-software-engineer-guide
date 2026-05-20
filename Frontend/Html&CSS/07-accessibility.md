# Accessibility (a11y)

Accessibility means everyone can use your site — including users with disabilities, on assistive tech, or in degraded conditions (sun glare, broken mouse, slow brain day). It is also a legal requirement in most jurisdictions (ADA, EAA, AODA).

---

## 💡 **WCAG 2.1 / 2.2 — The POUR Principles**

WCAG defines four principles your site must satisfy.

| Principle | Meaning | Example |
|-----------|---------|---------|
| **P**erceivable | Content can be sensed | Alt text, captions, contrast |
| **O**perable | UI works with any input | Keyboard navigation, no time traps |
| **U**nderstandable | Predictable and readable | Clear labels, consistent nav |
| **R**obust | Works with assistive tech | Valid HTML, correct ARIA |

**Conformance levels:** A (minimum), **AA (the legal target)**, AAA (rarely required).

**WCAG 2.2 additions (2023):** focus appearance, dragging movements, target size (24×24 CSS px), consistent help, redundant entry.

> **Key Insight:** AA is the contract. AAA is aspirational. Most lawsuits hinge on AA failures — contrast, missing labels, keyboard traps.

---

## 💡 **Semantic HTML Is the Foundation**

Native elements ship with roles, states, and keyboard behavior for free. See [03-semantic-html.md](./03-semantic-html.md).

```html
<!-- ❌ Reinvents the wheel, breaks keyboard, breaks SR -->
<div class="btn" onclick="save()">Save</div>

<!-- ✅ Free focus, Enter/Space, role=button, disabled state -->
<button type="button" onclick="save()">Save</button>
```

> **Key Insight:** Every `<div onclick>` is an accessibility bug waiting for a lawsuit.

---

## 💡 **The First Rule of ARIA**

> **"No ARIA is better than bad ARIA."** — W3C ARIA Authoring Practices

Use a native element first. Only reach for ARIA when no HTML primitive exists (e.g. tabs, comboboxes, tree views).

**ARIA has three concepts:**

| Type | Purpose | Examples |
|------|---------|----------|
| **Roles** | What it is | `role="dialog"`, `role="tab"` |
| **States** | Current condition (changes) | `aria-expanded`, `aria-checked`, `aria-hidden` |
| **Properties** | Static descriptors | `aria-label`, `aria-describedby` |

**Common Mistakes:**

```html
<!-- ❌ Redundant role, button already IS a button -->
<button role="button">Save</button>

<!-- ❌ ARIA without behavior — looks expanded, isn't -->
<div aria-expanded="true">Menu</div>

<!-- ❌ aria-label ignored on non-interactive, non-landmark elements -->
<span aria-label="Important">⚠️</span>

<!-- ✅ ARIA where HTML can't help -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">One</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
```

---

## 💡 **Focus Management**

Focus is how keyboard and screen reader users navigate. Lose it and they're lost.

### Visible Focus Indicators

```css
/* ❌ Never do this. Removes focus globally. */
*:focus { outline: none; }

/* ✅ Use :focus-visible — shows ring for keyboard, hides for mouse */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**WCAG 2.2 SC 2.4.11:** focus indicator must be at least 2px and have 3:1 contrast against adjacent colors.

### Focus Order

Tab order should match visual order. Avoid `tabindex` values greater than 0 — they break the natural flow.

```html
<!-- ❌ Disrupts natural tab order -->
<input tabindex="3">
<input tabindex="1">

<!-- ✅ Only use 0 (focusable) or -1 (programmatic only) -->
<div tabindex="-1" id="error-region">...</div>
```

### Focus Trapping (Modals)

When a modal opens:
1. Move focus into it (usually the close button or first input).
2. Trap Tab and Shift+Tab inside.
3. Close on `Escape`.
4. Return focus to the trigger when it closes.

```ts
function trapFocus(modal: HTMLElement): () => void {
  const focusables = modal.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function handler(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      last.focus(); e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus(); e.preventDefault();
    }
  }
  modal.addEventListener('keydown', handler);
  return () => modal.removeEventListener('keydown', handler);
}
```

> **Key Insight:** The HTML `<dialog>` element with `showModal()` handles trapping, inert background, and Esc for you. Use it.

---

## 💡 **Keyboard Navigation**

Every interactive element must work without a mouse.

| Element | Expected Keys |
|---------|---------------|
| Button | Enter, Space |
| Link | Enter |
| Checkbox | Space |
| Radio group | Arrow keys |
| Select / combobox | Arrow keys, Enter, Esc, type-ahead |
| Tabs | Arrow keys (left/right), Home, End |
| Menu | Arrow keys, Esc, type-ahead |
| Modal | Tab cycle, Esc |

> **Key Insight:** If you build a custom widget, follow [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) patterns — don't invent your own keyboard model.

---

## 💡 **Screen Reader Patterns**

### aria-label vs aria-labelledby vs aria-describedby

```html
<!-- aria-label: string you write yourself (no visible text) -->
<button aria-label="Close dialog"><svg>×</svg></button>

<!-- aria-labelledby: references visible text by ID -->
<section aria-labelledby="sec-title">
  <h2 id="sec-title">Settings</h2>
</section>

<!-- aria-describedby: extra context (read after the label) -->
<input id="pw" aria-describedby="pw-hint">
<small id="pw-hint">Must be 12+ characters.</small>
```

**Precedence:** `aria-labelledby` > `aria-label` > native label > content.

### Live Regions

Announce dynamic content (toasts, errors, search results) without moving focus.

```html
<!-- Polite: waits for SR to finish current speech -->
<div aria-live="polite" id="status"></div>

<!-- Assertive: interrupts (use sparingly — errors only) -->
<div aria-live="assertive" role="alert" id="errors"></div>
```

**Gotcha:** the region must exist in the DOM *before* you write to it.

### sr-only (Visually Hidden)

For text that screen readers should read but you don't want visible.

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Do **not** use `display: none` or `visibility: hidden` — those hide from SR too.

---

## 💡 **Color Contrast (WCAG AA)**

| Text Type | Minimum Ratio |
|-----------|---------------|
| Normal text (< 18pt or < 14pt bold) | **4.5 : 1** |
| Large text (≥ 18pt or ≥ 14pt bold) | **3 : 1** |
| UI components, graphical objects | **3 : 1** |
| Focus indicator (WCAG 2.2) | **3 : 1** vs adjacent |

```css
/* ❌ Light gray on white — common designer trap. ~2.8:1 fails AA */
color: #999; background: #fff;

/* ✅ Passes 4.5:1 */
color: #595959; background: #fff;
```

> **Key Insight:** Color alone must never convey meaning. A red "error" border needs an icon or text label too (WCAG 1.4.1).

---

## 💡 **User Preference Media Queries**

```css
/* Respect users with vestibular disorders */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Boost contrast when user requests it */
@media (prefers-contrast: more) {
  :root { --border: #000; --text: #000; }
}

/* Respect dark mode preference */
@media (prefers-color-scheme: dark) { ... }
```

---

## ⚠️ **Common Bugs Interviewers Probe**

| Bug | Why It Fails |
|-----|--------------|
| `<div onclick>` instead of `<button>` | No focus, no Enter/Space, no role |
| Removing `:focus` outline globally | Keyboard users can't see where they are |
| Icon button with no label | SR reads "button" with no context |
| Placeholder instead of `<label>` | Disappears on type, low contrast, not announced consistently |
| Custom select via div + JS | Misses arrow keys, type-ahead, screen reader announcements |
| Modal with no focus trap | Tab escapes to background page |
| `aria-hidden="true"` on focusable element | SR skips it but keyboard reaches it — broken state |
| Color-only error state | Colorblind users miss it |
| Auto-playing carousel with no pause | WCAG 2.2.2 fail |
| Skipped heading levels (`h1` → `h4`) | Breaks SR document outline |

---

## 💡 **Testing Workflow**

| Tool | Catches |
|------|---------|
| **Keyboard only** (unplug mouse) | Focus traps, missing focus indicators, unreachable controls |
| **axe DevTools** / Lighthouse | ~30–40% of issues automatically (contrast, missing labels, ARIA misuse) |
| **NVDA** (Windows) / **VoiceOver** (Mac) | Real screen reader behavior — automation misses this |
| **Accessibility Tree** (DevTools) | What the browser actually exposes to AT |
| **WAVE** browser extension | Visual overlay of issues |
| **Storybook a11y addon** | Per-component checks in dev |

> **Key Insight:** Automation catches around a third of issues. Manual keyboard and SR testing are non-negotiable.

---

## 🎯 **Interview Questions**

### Q1: A designer hands you a custom dropdown menu. Walk through how you'd make it accessible.

**Answer:**
1. **Reach for `<select>` first** — if requirements allow, native solves everything.
2. If custom is required, follow the **ARIA APG combobox pattern**:
   - Trigger: `<button aria-haspopup="listbox" aria-expanded="false" aria-controls="list-id">`
   - List: `<ul role="listbox" id="list-id">` with `<li role="option" aria-selected="...">`
3. **Keyboard contract:** ArrowDown/Up to move, Home/End to jump, Enter/Space to select, Esc to close, type-ahead optional.
4. **Focus:** keep DOM focus on the trigger; track *active descendant* via `aria-activedescendant` on the trigger pointing to the highlighted option's ID. Don't move real focus into the list.
5. **Click-outside and Esc** close the menu and return focus to the trigger.
6. **Test:** NVDA + Firefox, VoiceOver + Safari, keyboard-only, axe.

### Q2: What's wrong with this code and how would you fix it?

```html
<div class="modal" onclick="open()">
  <span>×</span>
  <h3>Are you sure?</h3>
  <div onclick="confirm()">Yes</div>
</div>
```

**Answer:**
- `<div>` triggers aren't focusable, don't respond to Enter/Space, aren't announced as buttons.
- No `role="dialog"`, no `aria-modal`, no label association.
- Close button is unlabeled — SR reads literally "×".
- No focus management — focus doesn't enter the modal or return on close.
- No Esc handler. No focus trap. Background isn't `inert`.

**Fix:** use native `<dialog>` with `showModal()`. It gives you modal semantics, focus trap, Esc, and inert background for free. Use `<button>` for all triggers with proper `aria-label` on the close button.

### Q3: How do you announce a successful form save without moving focus?

**Answer:** Live region.

```html
<div role="status" aria-live="polite" id="form-status"></div>
```

Write the success message into it on save: `statusEl.textContent = 'Saved'`. `role="status"` is implicit `aria-live="polite" aria-atomic="true"`. Use `role="alert"` (assertive) only for errors that need to interrupt.

**Gotchas:**
- The region must be in the DOM at page load — adding it dynamically and immediately writing to it often fails to announce.
- Clear the region after a few seconds so repeated identical messages re-announce.
- Don't put critical info *only* in live regions — they're transient.

---

[← Back to HTML & CSS](./README.md)
