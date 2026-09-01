---
title: Accessibility
part: 2
chapter: 0
slug: accessibility
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-01
tags: [accessibility, wcag, aria, focus, screen-readers]
in_book: true
---

# Accessibility {#ch-accessibility}

> Ship interfaces that survive a keyboard, a screen reader and a legal audit — starting from markup rather than from ARIA.

**In this chapter:** WCAG and the AA target · why semantics come first · the first rule of ARIA · focus management · live regions and contrast · how to test

## 💡 The Core Idea

Almost every accessibility defect is a native element that was replaced by a `div`. A `<button>` already
carries a role, focus behaviour, Enter and Space handling, and a disabled state; a `<div onclick>` has
none of those and needs eight lines of code and three ARIA attributes to approximately catch up. So the
work is mostly subtractive: use the element that already means what you mean, and reach for ARIA only
where HTML has no primitive at all. This is also no longer optional — the European Accessibility Act
became enforceable in June 2025 and applies to any company serving EU consumers, wherever it is based.

> No ARIA is better than bad ARIA. The best accessibility fix is usually deleting code, not adding it.

## How It Works

WCAG organises requirements under four principles, and **AA is the conformance level that matters** —
it is what regulation and procurement ask for. A is the floor; AAA is rarely required outside specific
public-sector contexts.

| Principle | Means | Typical failure |
| --------- | ----- | --------------- |
| Perceivable | Content can be sensed | Missing alt text, insufficient contrast |
| Operable | The UI works with any input | Keyboard traps, unreachable controls |
| Understandable | Behaviour is predictable | Unlabelled fields, inconsistent navigation |
| Robust | Assistive technology can interpret it | Invalid markup, contradictory ARIA |

WCAG 2.2 added five criteria worth knowing by name: focus appearance, dragging alternatives, a 24×24 px
minimum target size, consistent help placement, and no redundant entry.

### Semantics first

```html
<!-- ❌ No focus, no Enter or Space, announced as nothing. -->
<div class="btn" onclick="save()">Save</div>

<!-- ✅ Role, focusability, keyboard activation and disabled state, free. -->
<button type="button" onclick="save()">Save</button>
```

### The three kinds of ARIA

| Kind | Answers | Examples |
| ---- | ------- | -------- |
| Role | What is this? | `role="dialog"`, `role="tab"` |
| State | What is true right now? | `aria-expanded`, `aria-checked` |
| Property | What is permanently true? | `aria-label`, `aria-describedby` |

ARIA changes only what assistive technology reports. It adds no behaviour whatsoever, which is the
source of the most common misuse: an element that claims `aria-expanded="true"` and does not expand.
Reach for ARIA when there is no native equivalent — tabs, comboboxes, tree views — and follow the ARIA
Authoring Practices patterns rather than inventing a keyboard model.

```html
<!-- ❌ Redundant: a button is already a button. -->
<button role="button">Save</button>

<!-- ❌ A promise with no implementation behind it. -->
<div aria-expanded="true">Menu</div>

<!-- ✅ ARIA where HTML has nothing to offer. -->
<div role="tablist">
  <button role="tab" id="tab-1" aria-selected="true" aria-controls="panel-1">Overview</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1"></div>
```

### Focus

Focus is the keyboard user's cursor. Three rules cover most of it.

```css
/* ❌ Removes the only indicator keyboard users have. */
*:focus { outline: none; }

/* ✅ :focus-visible shows the ring for keyboard, suppresses it for mouse. */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

WCAG 2.2 requires the indicator to be at least 2 px thick and 3:1 against adjacent colours, which rules
out a faint one-pixel ring.

**Tab order follows the DOM.** Any `tabindex` above zero pulls an element out of that order and
guarantees the sequence drifts as the markup changes. Only `0` (focusable, in order) and `-1`
(programmatically focusable, skipped by Tab) are safe.

**A modal owns focus while it is open**: move focus in, keep Tab inside, close on Escape, and return
focus to the element that opened it. The native `<dialog>` element with `showModal()` does all four,
plus making the background inert — so a hand-rolled focus trap is now a sign the wrong element was
chosen.

```typescript
const dialog = document.querySelector('dialog')!;

function open(trigger: HTMLElement): void {
  dialog.showModal(); // Focus moves in, background goes inert, Escape closes.
  // Returning focus is the step people forget; nothing does it for you.
  dialog.addEventListener('close', () => trigger.focus(), { once: true });
}
```

### Naming and announcing

```html
<!-- A name you write, for a control with no visible text. -->
<button aria-label="Close dialog">✕</button>

<!-- A name taken from visible text, which stays in sync with what users see. -->
<section aria-labelledby="settings-heading">
  <h2 id="settings-heading">Settings</h2>
</section>

<!-- Extra context, read after the name. -->
<input id="pw" aria-describedby="pw-hint" />
<small id="pw-hint">At least 12 characters.</small>
```

Precedence runs `aria-labelledby` → `aria-label` → a native `<label>` → the element's own text. Prefer
`aria-labelledby` where visible text exists, so the accessible name cannot drift from the visual one.

**Live regions** announce change without moving focus — a saved confirmation, a validation summary, a
result count.

```html
<!-- role="status" implies aria-live="polite". Must exist before you write to it. -->
<div role="status" id="form-status"></div>

<!-- Assertive interrupts speech. Errors only. -->
<div role="alert" id="form-errors"></div>
```

### Contrast, and colour as the only signal

| Content | Minimum ratio |
| ------- | ------------- |
| Body text | 4.5 : 1 |
| Large text (18pt, or 14pt bold) | 3 : 1 |
| UI components and meaningful graphics | 3 : 1 |
| Focus indicator against adjacent colours | 3 : 1 |

`#999` on white is roughly 2.8:1 and fails, which is the single most common design handoff defect.
Separately, colour must never be the only carrier of meaning: a red border needs an icon or text
beside it, because a colourblind user sees a border and no error.

**User preferences are queryable**, and honouring them is cheap:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| A control that triggers an action | `<button>` | Role, focus and keyboard behaviour come free |
| A modal | `<dialog>` with `showModal()` | Focus trap, inert background and Escape are native |
| A pattern HTML has no element for | ARIA APG pattern | The keyboard contract is already specified; do not invent one |
| Announcing an async result | A live region present at load | Focus stays where the user put it |
| Hiding text visually but not from AT | A visually-hidden utility class | `display: none` hides it from screen readers too |

## Common Mistakes

**❌ Wrong — `aria-hidden` on something focusable:**

```html
<!-- The screen reader skips it; Tab still lands on it. The user is focused on nothing. -->
<button aria-hidden="true">Next</button>
```

**✅ Right — remove it from both, or from neither:**

```html
<button hidden>Next</button>
```

**❌ Wrong — a placeholder instead of a label.** It disappears on first keystroke, its contrast is
usually below AA, and its announcement varies by screen reader. Use a `<label>`; add a placeholder only
as a format example.

**❌ Wrong — skipping heading levels.** An `h1` followed by an `h4` breaks the document outline that
screen reader users navigate by, and headings are the primary navigation mechanism for most of them.

**❌ Wrong — a live region created and written in the same tick.** The element has to be in the
accessibility tree before its content changes, or nothing is announced.

## 🔑 Key Takeaways

- Most accessibility defects are a native element replaced by a `div`, and the fix is usually deleting code.
- ARIA describes and never implements, so any state attribute you set must be matched by real behaviour.
- AA is the conformance level regulation asks for, and the European Accessibility Act made it enforceable in June 2025.
- The native `<dialog>` element handles focus trapping, inert background and Escape, so a hand-rolled trap signals the wrong element.
- Automated tooling finds roughly a third of issues; keyboard-only and screen reader passes are not optional.

## Interview Questions

**Q: A designer hands you a custom dropdown. How do you make it accessible?**

Try to talk them into a native `<select>` first, because it solves keyboard, mobile and screen reader
behaviour outright. If custom is required, implement the APG combobox pattern rather than improvising:
a trigger with `aria-expanded` and `aria-controls`, a `role="listbox"` with `role="option"` children,
arrow keys plus Home, End, Enter and Escape, and `aria-activedescendant` so DOM focus stays on the
trigger while the highlighted option moves.

**Q: What is wrong with removing focus outlines?**

It removes the only indication a keyboard user has of where they are, which is a WCAG 2.4.7 failure and
makes the interface unusable without a mouse. The reason people do it is that the ring appears on
mouse click, and `:focus-visible` already solves exactly that: the browser shows the ring for keyboard
interaction and suppresses it for pointer.

**Q: How do you announce a successful save without moving focus?**

Write to a live region that was already in the DOM at load — `role="status"`, which implies
`aria-live="polite"`. Focus stays where the user left it, and the message is spoken after the current
utterance finishes. Reserve `role="alert"` for errors, because it interrupts. Clear the region after a
few seconds so an identical second message announces again.

**Q: How much can you automate, and what has to be manual?**

Automated tools catch around a third — contrast, missing names, invalid ARIA, some structural issues.
What they cannot judge is whether the reading order makes sense, whether an alt text is *useful*,
whether focus lands somewhere sensible after an action, or whether a custom widget's keyboard model
matches what users expect. Those need a keyboard-only pass and a real screen reader.

## What to Read Next

- [Chapter ?? — Semantic HTML](#ch-semantic-html) — the elements that make most of this free
- [Chapter ?? — CSS Animations](#ch-css-animations) — `prefers-reduced-motion` in context
- [Chapter ?? — Right-to-Left Support](#ch-rtl-support) — the other half of what `lang` and `dir` control
