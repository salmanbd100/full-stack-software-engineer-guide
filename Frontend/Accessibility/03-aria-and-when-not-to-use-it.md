---
title: ARIA, and When Not to Use It
part: 2
chapter: 16
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

ARIA (Accessible Rich Internet Applications) is a vocabulary for telling assistive technology about
things HTML cannot express. It is not a polyfill and it is not a feature. **It changes what is reported
and nothing else.** It adds no focus behaviour, no keyboard handling, no state management and no styling.

That single fact explains almost every ARIA bug in production. `aria-expanded="true"` on a menu that does
not expand is a lie, and the screen reader repeats it faithfully. `role="button"` on a `div` gives an
element that is announced as a button. It still ignores Enter and Space, and it cannot be focused. In both
cases the attribute made things worse than no attribute. It replaced "this is unclear" with "this is wrong".

> No ARIA is better than bad ARIA. The WebAIM Million audit finds that pages using ARIA average *more*
> detectable failures than pages using none. Teams reach for ARIA first and understand it second.

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
disabled state, Enter and Space handling, and a form-submit behaviour. To copy that on a `div`, you need
an ARIA role, a `tabindex`, two key handlers, an `aria-disabled` and a pointer-events rule. It will still
miss something.

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
state attribute set once at render and never updated is the same defect as a stale cache. It is the most
common ARIA bug in component libraries.

```typescript
// The pattern that keeps a state honest: derive it, never assign it once.
function renderDisclosure(isOpen: boolean): string {
  return `
    <button type="button" aria-expanded="${isOpen}" aria-controls="panel">Details</button>
    <div id="panel" ${isOpen ? '' : 'hidden'}></div>
  `;
}
```

In a framework this is free, because the attribute is bound to the same state that renders the panel. The
two drift apart in hand-written DOM code.

### What ARIA cannot do

| People expect | Reality |
| --- | --- |
| `role="button"` makes it clickable by keyboard | No — add `tabindex="0"` and Enter/Space handlers yourself |
| `aria-disabled` prevents interaction | No — it announces disabled; you must also block the handler |
| `aria-required` enforces a value | No — it announces required; validation is still yours |
| `role="dialog"` traps focus | No — focus management is entirely yours, or use `<dialog>` |
| `aria-label` on a `div` makes it a control | No — a name without a role is not announced as anything |

`aria-disabled` deserves a closer look, because it exists for a good reason. The browser removes a native
`disabled` button from the tab order. A keyboard user then cannot reach it to find out why it is
unavailable. `aria-disabled="true"` plus a handler that returns early keeps the button focusable, so it
can explain itself. That is a deliberate trade, not a workaround.

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

- **The region must exist in the tree before the text changes.** If you create the element and its content
  in the same tick, usually nothing is announced. Assistive technology watches for a mutation inside a
  region it already knows about.
- **Polite by default.** `assertive` interrupts whatever is being read. That is right for a submission
  error and wrong for "3 items in basket".
- **Clear it, or an identical message is silent.** Writing the same string twice is not a mutation. Reset
  the region, then write.

> ⚠️ Do not wire a live region to a high-frequency stream. Pipe a token-by-token AI response or a live
> price feed into `aria-live`, and the user gets continuous speech they cannot escape. Announce the
> completion, not the progress.

### The patterns worth learning

Where ARIA genuinely earns its place, someone has already specified the keyboard contract. The **ARIA
Authoring Practices Guide** (APG) documents each pattern's roles, states and expected keys. Use it rather
than inventing a keyboard model users have to learn.

| Pattern | Use when | The part people get wrong |
| --- | --- | --- |
| Disclosure | Show and hide a region | Forgetting `aria-expanded` on the trigger |
| Tabs | One panel visible from a set | Arrow keys, not Tab, move between tabs |
| Combobox | Text input filtering a list | `aria-activedescendant` — DOM focus stays in the input |
| Modal dialog | Blocking interaction | Focus return, and inerting the rest of the page |
| Menu button | Application-style command menus | It is not a navigation list; do not use it for links |

The last row is a common mistake. `role="menu"` implies an application menu with arrow-key navigation and
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

> Assertive announcements interrupt. A saved-successfully message belongs in `role="status"`. Keep
> `alert` for things the user must act on.

**✅ Deleting ARIA as the fix**

> When a component has three roles and four states, the correct patch is often a `<button>` and a
> `<dialog>`. Fewer attributes, more behaviour.

## 🔑 Key Takeaways

- ARIA changes what is reported and never adds behaviour, so real code must back every state you declare.
- The first rule of ARIA is to use a native element instead, and it removes most of the need for the other four.
- States are the attributes that must stay in sync at runtime. Properties and roles are set once.
- A live region must already exist in the tree and should default to polite. Clear it before an identical message repeats.
- For tabs, comboboxes and dialogs, implement the ARIA Authoring Practices pattern rather than inventing a keyboard model.

## Interview Questions

**Q: What is the first rule of ARIA, and why is it first?**

Use a native HTML element instead. It is first because native elements bring behaviour and semantics
together. A `<button>` is focusable, activates on Enter and Space, exposes a disabled state and submits a
form. ARIA only changes what is announced. Most accessibility defects I have fixed were a `div` with ARIA
bolted on. The fix was to delete the attributes and change the tag.

**Q: A component sets `aria-expanded` but the menu still announces wrongly. What do you check?**

Whether anything updates the attribute. `aria-expanded` is a state, so it must be bound to the same value
that shows and hides the panel. Set once at render, it goes stale immediately. I would read the computed
node in the Accessibility pane and confirm the attribute is on the trigger, not the panel. Then I would
check that `aria-controls` points at an element that exists.

**Q: How do you announce that a background save succeeded?**

Write into a live region that was already in the DOM at page load. `role="status"` implies polite, so the
screen reader speaks the message at the next pause and focus does not move. I would clear the region
before writing, so an identical second message still announces. I would keep `role="alert"` for errors,
because it interrupts. Moving focus to a confirmation banner is the wrong fix: it steals the user's place.

**Q: When is `aria-disabled` better than `disabled`?**

When the user needs to reach the control and find out why it is unavailable. A submit button blocked by
an incomplete form is the usual example. A native `disabled` button leaves the tab order entirely, so a
keyboard user cannot land on it or read an explanation. With `aria-disabled` the control stays focusable
and announces as disabled. The click handler still has to return early, because the attribute prevents
nothing on its own.

**Q: Would you build a custom select, and what would it cost?**

Only if a native `<select>` genuinely cannot meet the requirement. Native gives me the mobile picker, the
keyboard model and the screen reader behaviour outright. If a custom one is unavoidable, I would build the
APG combobox pattern rather than improvise. That means a text input with `aria-expanded` and
`aria-controls`, and a `role="listbox"` of `role="option"` children. It needs arrow keys plus Home, End,
Enter and Escape. It also needs `aria-activedescendant`, so DOM focus stays in the input while the
highlighted option moves. That is a week of work and a permanent maintenance cost. The estimate should
say so honestly.

## What to Read Next

- [Chapter ?? — Keyboard and Focus Management](#ch-keyboard-and-focus) — the behaviour ARIA does not supply
- [Chapter ?? — The Accessibility Tree](#ch-accessibility-tree) — how to verify what an attribute actually did
- [Chapter ?? — Accessible Forms and Error Messaging](#ch-accessible-forms) — where live regions and states earn their keep
