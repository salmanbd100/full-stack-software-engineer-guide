---
title: Keyboard and Focus Management
part: 2
chapter: 17
slug: keyboard-and-focus
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [accessibility, keyboard, focus, dialog, inert, spa]
in_book: true
---

# Keyboard and Focus Management {#ch-keyboard-and-focus}

> Make the whole interface reachable with a keyboard, and put focus somewhere sensible after every action that changes the page.

**In this chapter:** focus is the keyboard cursor · tab order and `tabindex` · visible focus · modals with `<dialog>` and `inert` · focus after an action · composite widgets

## 💡 The Core Idea

Focus is the keyboard user's cursor. Everything about keyboard accessibility follows from treating it that
way. You can always see where it is, and it moves in an order that matches the page. After any action that
changes what is on screen, **somebody has to decide where it goes.** Skip that decision and the browser
makes a bad one. Usually it sends focus back to the top of the document, and the user tabs through the
header again to get back.

This is also the accessibility area that helps the widest group of people. Screen reader users,
keyboard-only users, and users with tremors or RSI (repetitive strain injury) all depend on it. Power
users of your own product notice at once when it is good.

> Two questions catch most defects. Can I do this with a keyboard? After I do it, where is focus?

## How It Works

### Tab order follows the DOM

The browser builds the tab sequence from document order, restricted to focusable elements. That gives one
strong rule and one small vocabulary.

| Value | Behaviour | Use it |
| --- | --- | --- |
| No `tabindex` | Natively focusable elements only | Always the default |
| `tabindex="0"` | Focusable, in DOM order | A custom control that has to be reachable |
| `tabindex="-1"` | Focusable by script, skipped by Tab | A focus target after an action |
| `tabindex="1"` and above | **Jumps ahead of everything** | Never |

A positive `tabindex` pulls the element in front of the entire natural order. The sequence then drifts
every time the markup changes, and nobody remembers why. If the tab order is wrong, **fix the DOM order**.
CSS `order` and `grid-area` do not move focus. That is the most common reason a page looks sensible but
tabs sideways.

### Focus has to be visible

```css
/* ❌ Removes the only cursor a keyboard user has. A 2.4.7 failure. */
*:focus { outline: none; }

/* ✅ Ring for keyboard interaction, suppressed for mouse. */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

People delete outlines because they appear on mouse click. `:focus-visible` exists for exactly that
reason. The browser's own heuristic already solves the problem, so no argument for `outline: none` is left.

Two details are worth knowing. First, **1.4.11 requires 3 : 1 contrast** for the indicator against
adjacent colours, which rules out a faint one-pixel line. The 2 px, 3 : 1 ring above comes from 2.4.13
Focus Appearance. That criterion is AAA, but it is the practical bar a design system should hit. Second,
**2.4.11 Focus Not Obscured** is new at AA in WCAG 2.2. A sticky header or cookie bar must not completely
cover the focused element. Add `scroll-margin-top` to focusable content, rather than finding out in an audit.

### A skip link, still

The first Tab stop on a page with a large header should let the user reach the content.

```html
<a class="skip-link" href="#main">Skip to content</a>
<!-- … header, navigation … -->
<main id="main" tabindex="-1">…</main>
```

`tabindex="-1"` on the target matters. Without it, some browsers move the viewport but not focus, so the
next Tab continues from the header. The link may be visually hidden until focused, but it must become
visible when it is.

### Modals: the native element does four things for you

A dialog owes the user four behaviours. Focus moves in, Tab stays inside, Escape closes, and focus returns
to whatever opened it. `<dialog>` with `showModal()` supplies three of the four, plus an inert background.

```typescript
const dialog = document.querySelector<HTMLDialogElement>('#confirm')!;

function openConfirm(trigger: HTMLElement): void {
  dialog.showModal();          // Focus moves in, background inert, Escape closes.
  dialog.addEventListener(
    'close',
    () => trigger.focus(),     // The one step nothing does for you.
    { once: true },
  );
}
```

Add `autofocus` to the element that should receive focus inside. That is usually the first input, or the
safest button in a destructive confirmation. **A hand-rolled focus trap in 2027 signals that someone chose
the wrong element.** It is also nearly always subtly wrong. Shadow DOM, iframes and dynamically added
content all defeat a `querySelectorAll` of focusable selectors.

Where a modal is not the pattern, such as a side panel or a mega-menu, `inert` does the containment on its
own. An inert element cannot be focused, clicked or read by assistive technology.

```typescript
// Everything outside the panel becomes non-interactive and unfocusable.
document.querySelector<HTMLElement>('#app')!.inert = true;
```

### Where focus goes after an action

This is the decision that separates a competent implementation from a good one.

| Action | Focus should go | Why |
| --- | --- | --- |
| Dialog opens | Inside it, on the first control or the heading | Otherwise Tab continues behind the overlay |
| Dialog closes | Back to the trigger | Returns the user to their place |
| A row is deleted | The next row, or the list heading if empty | The trigger no longer exists |
| A step in a wizard advances | The new step's heading, with `tabindex="-1"` | Announces the change and puts Tab in the right place |
| Client-side route change | The `<h1>` or `<main>` of the new view | Nothing moves focus on a client-side navigation |
| Async result arrives | **Nowhere** — announce it in a live region | Moving focus for something the user did not initiate is hostile |

Single-page applications routinely miss the route-change row. A real navigation resets focus to the
document. A client-side route change does not, so the user tabs on from wherever they were on the
previous page.

```typescript
// Run on route change: move focus, do not scroll-jack, and let the heading be announced.
function focusNewView(): void {
  const heading = document.querySelector<HTMLElement>('main h1');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: false });
}
```

### Composite widgets have their own key model

Inside a tab list, a toolbar, a tree or a grid, Tab is not the navigation. The widget is **one** Tab stop,
and arrow keys move within it. That is what users of those patterns expect.

| Technique | How it works | Fits |
| --- | --- | --- |
| **Roving `tabindex`** | Exactly one child has `tabindex="0"`, the rest `-1`; arrow keys move it | Tabs, toolbars, radio-style groups |
| **`aria-activedescendant`** | DOM focus stays on the container; the attribute names the active child | Comboboxes, large listboxes |

Here is the trade. A roving `tabindex` gives you real DOM focus, so `:focus-visible` styling and native
scrolling work. `aria-activedescendant` keeps typing in the input, which is why a combobox needs it.

> ⚠️ WCAG 2.2 added 2.5.7 Dragging Movements at AA. Anything reordered by dragging needs a single-pointer
> alternative. Give a drag-and-drop list a keyboard route, such as Move up, Move down, or cut and paste.
> That satisfies both the criterion and every keyboard user.

## When to Use It

| Situation | Choose | Why |
| --- | --- | --- |
| A blocking dialog | `<dialog>` with `showModal()` | Focus containment, inert background and Escape are native |
| A non-modal panel that should still block the page | `inert` on the rest | One attribute instead of a trap |
| Tab order does not match the visual order | Reorder the DOM | CSS ordering never moves focus |
| A custom widget from the APG list | Roving `tabindex` or `aria-activedescendant` | Tab exits the widget; arrows move inside it |
| A background result the user did not ask for | A live region, not focus | Stealing focus loses their place |

## Common Mistakes

**❌ `outline: none` with no replacement**

> The only keyboard cursor, removed. If the mouse ring is the objection, `:focus-visible` already fixed it.

**❌ A positive `tabindex` to "fix" the order**

> It jumps the element ahead of the whole document, and the sequence rots as the markup changes. Move the
> element instead.

**❌ Closing a dialog without returning focus**

> Focus falls to the document, so the user tabs from the top of the page to get back to where they were.

**❌ Moving focus on every async update**

> A toast that grabs focus interrupts typing. Announce it politely and leave the cursor alone.

**✅ Tabbing through your own feature before opening the pull request**

> Two minutes, no tooling, and it catches more real defects than any automated rule set.

## 🔑 Key Takeaways

- Tab order comes from the DOM, so only `tabindex="0"` and `tabindex="-1"` are safe. CSS reordering never moves focus.
- `:focus-visible` gives keyboard users a ring without showing one on mouse click, so no reason is left to remove outlines.
- `<dialog>` with `showModal()` supplies focus containment, an inert background and Escape. Returning focus to the trigger is still your job.
- Every action that changes what is on screen needs an explicit decision about where focus lands, especially a client-side route change.
- Inside tabs, toolbars and comboboxes, the widget is one Tab stop and arrow keys navigate inside it, via a roving `tabindex` or `aria-activedescendant`.

## Interview Questions

**Q: What is wrong with removing focus outlines, and what do you do instead?**

It deletes the only sign a keyboard user has of where they are. That fails 2.4.7 and makes the product
unusable without a mouse. People remove it because the ring shows on mouse click, and `:focus-visible`
already solves exactly that: the browser shows the ring for keyboard use and hides it for a pointer. I
would also check it meets 3 : 1 against adjacent colours. A faint outline passes review and fails an audit.

**Q: A dialog opens and Tab keeps moving through the page behind it. What is happening?**

Nothing moved focus into the dialog, and nothing made the background inert. It is a styled overlay, not a
modal. With `<dialog>` and `showModal()`, the browser moves focus in, inerts everything behind it and
closes on Escape. If the markup cannot change, `inert` on the page container is the smallest correct fix.
Either way, I would add the focus return to the trigger on close, because nothing does that for you.

**Q: Where should focus go after the user deletes a row from a table?**

Not nowhere, which is what happens by default. The trigger has gone, so focus falls to the body. The next
row's action button is usually right. Use the previous row if the deleted one was last, or the table's
heading when the list is now empty. I would also announce the deletion in a polite live region. A focus
move alone does not tell a screen reader user what happened.

**Q: How is keyboard navigation in a single-page application different?**

A real navigation resets focus to the top of the new document. A client-side route change does not, so
the user stays focused on a link that is no longer in the layout. The fix is to move focus to the new
view's heading, with `tabindex="-1"`, on route change. That places the tab sequence correctly and gets
the new page title announced. It is the piece an SPA most often misses.

**Q: When should arrow keys navigate rather than Tab?**

Inside a composite widget, such as tabs, a toolbar, a menu, a tree or a grid. The whole widget should be
a single Tab stop, so a keyboard user can move past it in one press. Arrows move inside it. I would use a
roving `tabindex`, so DOM focus is real and `:focus-visible` works. The exception is a combobox. There
`aria-activedescendant` keeps typing in the input while the highlight moves.

## What to Read Next

- [Chapter ?? — ARIA, and When Not to Use It](#ch-aria) — the roles those composite widgets need
- [Chapter ?? — Accessible Forms and Error Messaging](#ch-accessible-forms) — focus and announcement on validation
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — the keyboard pass, and why automation misses this
