---
title: ARIA, and When Not to Use It
part: 2
chapter: 0
slug: aria
level: advanced
reading_time: 10
updated: 2026-09-07
tags: [accessibility, aria, roles, live-regions, apg]
in_book: true
---

# ARIA, and When Not to Use It {#ch-aria}

> Use ARIA only where HTML has no element for the job, and never let an attribute promise behaviour you did not implement.

**In this chapter:** the five rules · roles, states and properties · what ARIA cannot do · live regions · the patterns worth learning · the misuse that makes things worse

## 💡 The Core Idea

ARIA is a vocabulary for telling assistive technology about things HTML cannot express. It is not a
polyfill and it is not a feature — **it changes what is reported and nothing else.** No focus behaviour,
no keyboard handling, no state management, no styling.

That single fact explains almost every ARIA bug in production. `aria-expanded="true"` on a menu that does
not expand is a lie the screen reader repeats faithfully. `role="button"` on a `div` produces an element
announced as a button that ignores Enter and Space and cannot be focused. In both cases the attribute made
the experience worse than no attribute, because it replaced "this is unclear" with "this is wrong".

> No ARIA is better than bad ARIA. The WebAIM Million audit finds pages using ARIA average *more*
> detectable failures than pages using none — because ARIA gets reached for first and understood second.

## How It Works

### The five rules, in the order they actually get broken

The W3C publishes five rules of ARIA use. Learn them in this order, because that is the frequency with
which teams break them.

| # | Rule | What it means in review |
| --- | --- | --- |
| 1 | **Use a native element instead** | If HTML has an element with the role and behaviour, use it |
| 2 | **Do not change native semantics** | `<h2 role="tab">` is wrong; wrap or nest instead |
| 3 | **Every ARIA control must be keyboard operable** | Anything with an interactive role needs `tabindex` and key handlers |
| 4 | **Never `aria-hidden` a focusable element** | It creates a control that cannot be announced |
| 5 | **Every interactive element needs an accessible name** | Role without a name announces as its type only |

Rule 1 is subtractive, and it is where most of the value is. A `<button>` arrives with a role, focus, a
disabled state, Enter and Space handling, and a form-submit behaviour. Reproducing that on a `div` takes
an ARIA role, a `tabindex`, two key handlers, an `aria-disabled` and a pointer-events rule — and it will
still miss something.

```html
<!-- ❌ Five lines of JavaScript away from being a button, and never quite one. -->
<div class="btn" onclick="save()">Save</div>

<!-- ✅ Role, focusability, keyboard activation and disabled state, free. -->
<button type="button" onclick="save()">Save</button>
```

### Roles, states and properties

| Kind | Answers | Examples | Changes at runtime? |
| --- | --- | --- | --- |
| **Role** | What is this thing? | `dialog`, `tab`, `listbox`, `alert` | Almost never |
| **State** | What is true right now? | `aria-expanded`, `aria-checked`, `aria-selected`, `aria-invalid` | Yes — you must update it |
| **Property** | What is always true? | `aria-label`, `aria-describedby`, `aria-controls`, `aria-required` | Rarely |

The distinction is practical: **states are the ones you have to keep in sync with your own code.** A
state attribute set once at render and never updated is the same defect as a stale cache, and it is the
most common ARIA bug in component libraries.

```typescript
// The pattern that keeps a state honest: derive it, never assign it once.
function renderDisclosure(isOpen: boolean): string {
  return `
    <button type="button" aria-expanded="${isOpen}" aria-controls="panel">Details</button>
    <div id="panel" ${isOpen ? '' : 'hidden'}></div>
  `;
}
```

In a framework this is free, because the attribute is bound to the same state that renders the panel. It
is hand-written DOM manipulation where the two drift apart.

### What ARIA cannot do

| People expect | Reality |
| --- | --- |
| `role="button"` makes it clickable by keyboard | No — add `tabindex="0"` and Enter/Space handlers yourself |
| `aria-disabled` prevents interaction | No — it announces disabled; you must also block the handler |
| `aria-required` enforces a value | No — it announces required; validation is still yours |
| `role="dialog"` traps focus | No — focus management is entirely yours, or use `<dialog>` |
| `aria-label` on a `div` makes it a control | No — a name without a role is not announced as anything |

`aria-disabled` is worth dwelling on, because it exists for a good reason: a natively `disabled` button is
removed from the tab order, so a keyboard user cannot reach it to discover why it is unavailable. Using
`aria-disabled="true"` plus a handler that returns early keeps it focusable and explains itself. That is a
deliberate trade, not a workaround.

### Live regions — announcing without moving focus

Some things change without the user doing anything: a save completes, a filter returns 12 results, a token
expires. A **live region** announces the change while leaving focus where it is.

```html
<!-- role="status" implies aria-live="polite". Waits for a pause in speech. -->
<div role="status" id="save-status"></div>

<!-- role="alert" implies aria-live="assertive". Interrupts. Errors only. -->
<div role="alert" id="form-errors"></div>
```

Three rules make them work, and all three are commonly missed.

- **The region must exist in the tree before the text changes.** Creating the element and its content in
  the same tick usually announces nothing, because assistive technology is watching for a mutation inside
  a region it already knows about.
- **Polite by default.** `assertive` interrupts whatever is being read, which is right for a submission
  error and wrong for "3 items in basket".
- **Clear it, or an identical message is silent.** Writing the same string twice is not a mutation. Reset
  the region, then write.

> ⚠️ Do not wire a live region to a high-frequency stream. A token-by-token AI response or a live price
> feed piped into `aria-live` produces continuous speech the user cannot escape. Announce the completion,
> not the progress.

### The patterns worth learning

Where ARIA genuinely earns its place, someone has already specified the keyboard contract. The **ARIA
Authoring Practices Guide** documents each pattern's roles, states and expected keys — use it rather than
inventing a keyboard model users have to learn.

| Pattern | Use when | The part people get wrong |
| --- | --- | --- |
| Disclosure | Show and hide a region | Forgetting `aria-expanded` on the trigger |
| Tabs | One panel visible from a set | Arrow keys, not Tab, move between tabs |
| Combobox | Text input filtering a list | `aria-activedescendant` — DOM focus stays in the input |
| Modal dialog | Blocking interaction | Focus return, and inerting the rest of the page |
| Menu button | Application-style command menus | It is not a navigation list; do not use it for links |

The last row is a common mistake: `role="menu"` implies an application menu with arrow-key navigation and
no Tab stops. A site navigation dropdown of links is a disclosure containing a list, not a menu.

## When to Use It

| Situation | Choose | Why |
| --- | --- | --- |
| Anything a native element covers | The native element | Behaviour and semantics arrive together |
| Tabs, combobox, tree, treegrid | The APG pattern, in full | The keyboard contract is already specified |
| Async result with no focus change | A live region present at load | Focus stays where the user put it |
| A control that must stay reachable while unavailable | `aria-disabled` plus a guarded handler | Keyboard users can find out why |
| An icon-only control | `aria-label`, or visually-hidden text | Supplies the missing name |

## Common Mistakes

**❌ Redundant roles on native elements**

```html
<button role="button">Save</button>       <!-- Already a button. -->
<nav role="navigation">…</nav>            <!-- Already a navigation landmark. -->
<ul role="list">…</ul>                    <!-- Already a list, unless CSS removed the role. -->
```

**❌ A state attribute nothing updates**

> `aria-expanded="false"` rendered once and never touched tells every screen reader user the menu is
> closed while it is open on screen.

**❌ `role="alert"` for routine confirmations**

> Assertive announcements interrupt. A saved-successfully message belongs in `role="status"`; reserve
> `alert` for things the user must act on.

**✅ Deleting ARIA as the fix**

> When a component has three roles and four states, the correct patch is often a `<button>` and a
> `<dialog>`. Fewer attributes, more behaviour.

## 🔑 Key Takeaways

- ARIA changes what is reported and never adds behaviour, so any state you declare must be matched by real code.
- The first rule of ARIA is to use a native element instead, and it removes most of the need for the other four.
- States are the attributes that must stay in sync at runtime; properties and roles are set once.
- A live region must already exist in the tree, should default to polite, and needs clearing before an identical message repeats.
- For tabs, comboboxes and dialogs, implement the ARIA Authoring Practices pattern rather than inventing a keyboard model.

## Interview Questions

**Q: What is the first rule of ARIA, and why is it first?**

Use a native HTML element instead. It is first because native elements bring behaviour and semantics
together — a `<button>` is focusable, activates on Enter and Space, exposes a disabled state and submits a
form — whereas ARIA only changes what is announced. Most accessibility defects I have fixed were a `div`
with ARIA bolted on, and the fix was deleting the attributes and changing the tag.

**Q: A component sets `aria-expanded` but the menu still announces wrongly. What do you check?**

Whether anything updates the attribute. `aria-expanded` is a state, so it has to be bound to the same
value that shows and hides the panel; set once at render it goes stale immediately. I would read the
computed node in the Accessibility pane, confirm the attribute is on the trigger rather than on the panel,
and check that `aria-controls` points at an element that exists.

**Q: How do you announce that a background save succeeded?**

Write into a live region that was already in the DOM at page load — `role="status"`, which implies polite,
so the message is spoken at the next pause and focus does not move. I would clear the region before
writing so an identical second message still announces, and keep `role="alert"` for errors because it
interrupts. Moving focus to a confirmation banner is the wrong fix; it steals the user's place in the page.

**Q: When is `aria-disabled` better than `disabled`?**

When the user needs to be able to reach the control and find out why it is unavailable — a submit button
blocked by an incomplete form, for example. A native `disabled` button leaves the tab order entirely, so a
keyboard user cannot land on it or read an associated explanation. With `aria-disabled` the control stays
focusable and announces as disabled, but the click handler has to return early, because the attribute
prevents nothing on its own.

**Q: Would you build a custom select, and what would it cost?**

Only if a native `<select>` genuinely cannot meet the requirement, because native gives me the mobile
picker, the keyboard model and the screen reader behaviour outright. If it is unavoidable I would
implement the APG combobox pattern rather than improvise: a text input with `aria-expanded` and
`aria-controls`, a `role="listbox"` of `role="option"` children, arrow keys plus Home, End, Enter and
Escape, and `aria-activedescendant` so DOM focus stays in the input while the highlighted option moves.
That is a week of work and a permanent maintenance cost, which is the honest thing to say in the estimate.

## What to Read Next

- [Chapter ?? — Keyboard and Focus Management](#ch-keyboard-and-focus) — the behaviour ARIA does not supply
- [Chapter ?? — The Accessibility Tree](#ch-accessibility-tree) — how to verify what an attribute actually did
- [Chapter ?? — Accessible Forms and Error Messaging](#ch-accessible-forms) — where live regions and states earn their keep
