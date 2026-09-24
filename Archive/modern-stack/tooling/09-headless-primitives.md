---
title: Headless Primitives and Accessible Components
part: 3
chapter: 57
slug: headless-primitives
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-23
tags: [react, accessibility, radix, react-aria, component-library, headless]
in_book: true
---

# Headless Primitives and Accessible Components {#ch-headless-primitives}

> Decide honestly whether to build the combobox or adopt one, and know what the library is actually doing for you.

**In this chapter:** what "headless" means · the six things a real dialog does · the build-or-adopt decision · the candidates · what adopting costs · the parts you still own

## 💡 The Core Idea

A design system's hardest components are not the ones with the most design. They are the ones with the
most **behaviour** — dialog, combobox, menu, tabs, date picker — and the behaviour is specified in
documents most teams have never read.

A headless primitive supplies that behaviour and none of the appearance. It gives you the roles, the
keyboard interaction, the focus management and the ARIA state, and leaves every pixel to you. So the
choice is not "our design or theirs". It is **"our behaviour or theirs"**, and behaviour is where the
bugs and the legal exposure are.

> The reason teams stopped hand-rolling comboboxes is not that they could not build one. It is that the
> one they built failed on a screen reader nobody on the team runs.

## How It Works

### What a dialog actually owes the user

A `<div>` with an overlay and a close button is perhaps a fifth of a dialog. The rest:

| Requirement | What goes wrong without it |
| ----------- | -------------------------- |
| Focus moves into the dialog on open | The keyboard user is still behind the overlay |
| Focus is trapped while it is open | Tab escapes to the page underneath and nothing announces it |
| Focus returns to the trigger on close | The user lands at the top of the document |
| Background content is inert | A screen reader reads straight through the overlay |
| `Escape` closes it, and only the topmost one | Nested dialogs close together |
| Scroll is locked without the layout shifting | The page jumps by the scrollbar width on open |

Every one of those is a WAI-ARIA Authoring Practices requirement, and all six are why the seventh
in-house dialog in a company is still subtly wrong.

> ⚠️ The platform has taken some of this back. `<dialog>` with `showModal()` gives focus trapping,
> `Escape`, the top layer and inertness for free, and `popover` covers a large share of menus and
> tooltips. Check what the platform does before adding a dependency — this is the one area where the
> right answer has genuinely changed since 2023.

### What headless means in practice

The library owns state and behaviour; you own the markup and every class name:

```tsx
import * as Dialog from "@radix-ui/react-dialog";

export function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="btn">Delete</Dialog.Trigger>
      <Dialog.Portal>
        {/* The library supplies role, aria-modal, focus trap, Escape and inertness. */}
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="panel">
          <Dialog.Title className="panel__title">Delete this invoice?</Dialog.Title>
          <button onClick={onConfirm}>Confirm</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

There is no theme to override and no `!important` to write, because the library shipped no styles. That
is the whole point of the category: the thing teams used to fight — a component library's opinions about
appearance — is absent, and the thing they used to get wrong is supplied.

### The candidates

| Library | Shape | Notes |
| ------- | ----- | ----- |
| **Radix Primitives** | Compound components, React only | The common default; composition mirrors the DOM |
| **React Aria (Adobe)** | Hooks, plus components | The most rigorous on internationalisation and touch; more assembly |
| **Ark UI / Zag** | State machines, multi-framework | The same behaviour in React, Svelte and Vue — see the interop chapter |
| **Base UI, Headless UI** | Components | Narrower surfaces, smaller dependency |

Distribution differs too. A copy-in approach — the shadcn model, where generated source lands in your
repository — gives you ownership and the job of tracking upstream fixes yourself. A package dependency
gives you upgrades and less control.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Dialog, menu, combobox, tabs, date picker | Adopt a primitive | Behaviour-heavy, specified, and easy to get subtly wrong |
| Button, card, badge, input | Build it | The behaviour is the platform's already; a dependency buys nothing |
| One product, one framework, no design system | Adopt, and move on | The time is better spent on the product |
| A library shipped to several frameworks | A multi-framework primitive | One behaviour implementation, three renderers |
| A genuinely novel interaction | Build it, and test with a screen reader | No primitive exists, so the behaviour is yours to own |

### What you still own after adopting

Adopting is not outsourcing accessibility. It moves the line, and what stays on your side is:

- **Labels and names.** A primitive cannot know what your button means. `aria-label`, `aria-describedby`
  and the visible text are yours.
- **Colour contrast and focus visibility.** You shipped the styles, so you own 1.4.3 and 2.4.7.
- **Reading order and heading structure** in the content you put inside it.
- **Testing with a real screen reader**, at least once, on the flows that matter.

## Common Mistakes

**❌ Assuming the dependency makes the product accessible.** Roughly half of typical WCAG failures —
contrast, labelling, images, structure — are outside what any primitive can control.

**❌ Styling by reaching into the library's internals.** A selector matching a generated class or an
internal data attribute is a private API, and it breaks on a patch release. Use the documented data
attributes for state instead.

**❌ Adopting five primitive libraries.** Each ships its own focus-management and portal machinery, and
two of them fighting over the top layer is a bug nobody can reproduce. Pick one.

**❌ Wrapping the primitive so hard that composition is gone.** A single `<Dialog title footer body />`
prop soup looks tidy for a month, and then the tenth variant needs something the props do not express.
Wrap the styling, keep the composition.

## 🔑 Key Takeaways

- Headless primitives supply behaviour and no appearance, so the disagreement they used to cause — about
  design — no longer exists.
- The behaviour is the expensive part: a real dialog owes the user six things, all specified, all easy to
  get subtly wrong.
- Check the platform first — `<dialog>` and `popover` have absorbed a real share of what these libraries
  were for.
- Adopt for dialog, menu, combobox, tabs and date picker; build buttons and inputs yourself.
- Adopting does not transfer accessibility: labels, contrast, focus visibility and reading order stay
  yours, and they are about half of the failures.

## Interview Questions

**Q: A team is about to build its own modal. What do you tell them?**

Ask what happens to focus on open, on close, on `Escape`, and what a screen reader reads while it is
open. Most teams have an answer for the first and not for the rest, which is the argument. Then point at
`<dialog>` with `showModal()`, which gives focus trapping, the top layer, inertness and `Escape` with no
dependency at all — and if the requirement goes beyond that, a headless primitive, because the
alternative is reimplementing a specification nobody on the team has read.

**Q: What is the difference between a component library and a headless primitive?**

A component library ships behaviour and appearance, so adopting one means adopting its design language
and fighting it wherever your designer disagrees. A headless primitive ships behaviour and no styles at
all — it hands you roles, keyboard interaction, focus management and ARIA state, and you supply every
class name. The tradeoff moves from "can we restyle this" to "do we accept their composition model".

**Q: Does adopting Radix or React Aria make a product accessible?**

No, and saying so is the answer that scores. It makes the interaction patterns correct, which is the
part that is hardest to get right. It cannot give a button a meaningful name, cannot fix 3:1 contrast,
cannot supply alt text, and cannot impose a sane heading structure — and those are roughly half of what
an audit finds. The primitive raises the floor; the team still owns the content.

**Q: When would you deliberately build the primitive yourself?**

When the interaction is genuinely novel and no primitive models it, when the dependency budget is hard —
an embedded widget measured in kilobytes — or when you are the platform team shipping to several
frameworks and want one behaviour implementation you control. In all three cases the commitment is the
same: read the authoring practices, and test with a real screen reader rather than an automated checker.

## What to Read Next

- [Chapter ?? — ARIA, and When Not to Use It](#ch-aria) — the rules the primitives are implementing
- [Chapter ?? — Keyboard and Focus Management](#ch-keyboard-and-focus) — the behaviour half, in detail
- [Chapter ?? — Web Components and Framework Interop](#ch-web-components-and-interop) — how one behaviour implementation reaches three frameworks
