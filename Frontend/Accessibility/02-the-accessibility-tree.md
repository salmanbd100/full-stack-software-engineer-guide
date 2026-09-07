---
title: The Accessibility Tree
part: 2
chapter: 0
slug: accessibility-tree
level: advanced
reading_time: 10
updated: 2026-09-07
tags: [accessibility, accessibility-tree, semantics, accessible-name, landmarks]
in_book: true
---

# The Accessibility Tree {#ch-accessibility-tree}

> Read the tree the browser builds from your markup, so you can debug what a screen reader says instead of guessing.

**In this chapter:** what the tree is · role, name, state, properties · how a name is computed · what removes a node · landmarks and headings as navigation · inspecting it

## 💡 The Core Idea

A screen reader never reads your DOM. The browser builds a second structure from it — the
**accessibility tree** — and exposes that to assistive technology through the operating system. Each node
carries at most four things: a **role** (what this is), a **name** (what to call it), a **state** (what is
true now), and **properties** (what is permanently true).

Almost every accessibility bug is a mismatch between what you meant and what landed in that tree. A
`<div onclick>` produces a node with no role and no name, so there is nothing to announce and nothing to
focus. An icon button produces a node with a role and an empty name, so it announces as "button" and the
user has to guess. Neither is visible in the browser window, and both are obvious in the tree.

> Stop reasoning about what a screen reader "will say". Open the tree and read the node. It is a data
> structure, not a black box.

## How It Works

The pipeline is short and worth having in your head, because each stage can drop information.

```text
HTML + ARIA + CSS  →  DOM  →  accessibility tree  →  platform API  →  screen reader
```

**The pipeline from markup to speech. CSS participates — `display: none` removes a node entirely.**

### The four things a node carries

| Part | Question | Where it comes from |
| --- | --- | --- |
| **Role** | What kind of thing is this? | The element (`<button>` → `button`), or an explicit `role` |
| **Name** | What is it called? | Computed — see below |
| **State** | What is true right now? | `checked`, `disabled`, `aria-expanded`, `aria-selected` |
| **Properties** | What is always true? | `aria-describedby`, `aria-required`, `aria-haspopup`, level |

A native element fills in all four. `<input type="checkbox" checked>` is role `checkbox`, state
`checked`, name from its `<label>`, and it updates its own state when clicked. The equivalent `div`
supplies none of it and never will, because ARIA describes and does not implement — see
[Chapter ?? — ARIA, and When Not to Use It](#ch-aria).

### How the accessible name is computed

There is an actual algorithm, and knowing its order settles most naming arguments. The first source that
produces a non-empty string wins.

| Order | Source | Example |
| --- | --- | --- |
| 1 | `aria-labelledby` | Points at visible text elsewhere |
| 2 | `aria-label` | A string you write, invisible on screen |
| 3 | Native labelling | `<label for>`, `alt`, `<caption>`, `<legend>`, `<figcaption>` |
| 4 | The element's own text content | `<button>Save</button>` |
| 5 | `title` | Last resort, and mouse-only as a visible hint |

```html
<!-- ✅ Name comes from visible text, so it cannot drift out of sync with the UI. -->
<section aria-labelledby="settings-heading">
  <h2 id="settings-heading">Notification settings</h2>
</section>

<!-- ✅ A written name, because the visible content is an icon with no text. -->
<button type="button" aria-label="Close dialog">✕</button>

<!-- ❌ aria-label wins over the visible text, so the user sees "Save" and hears "Submit". -->
<button aria-label="Submit">Save</button>
```

That last case is a real failure and a frequent one: a voice-control user says "click Save" and nothing
happens, because the name in the tree is "Submit". **Where visible text exists, name from it.**

Descriptions are separate. `aria-describedby` adds text announced *after* the name, which is where hints
and error messages belong — see [Chapter ?? — Accessible Forms and Error Messaging](#ch-accessible-forms).

### What removes a node from the tree

Four mechanisms, and they differ in ways that matter.

| Technique | Visible? | In the tree? | Focusable? |
| --- | --- | --- | --- |
| `display: none` / `visibility: hidden` | No | No | No |
| `hidden` attribute | No | No | No |
| `aria-hidden="true"` | **Yes** | No | **Yes** — this is the trap |
| `inert` attribute | Yes | Yes, but non-interactive | No |
| Visually-hidden utility class | No | **Yes** | Yes |

`aria-hidden` on anything focusable creates a control the keyboard can reach and the screen reader cannot
describe: the user tabs to something and hears nothing. Use `inert` for a whole region that is temporarily
unavailable — behind a modal, for instance — because it removes interactivity and focusability together.

```css
/* Present to assistive technology, absent from the screen. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

That class is how you give an icon-only control a name that also works for voice control, and how a table
gets a caption a designer refused. `display: none` cannot do this job.

### Landmarks and headings are the navigation

Screen reader users do not scroll. They jump — by landmark, by heading, by link, by form control. That
makes document structure the primary navigation mechanism, not decoration.

| Element | Landmark role | Notes |
| --- | --- | --- |
| `<header>` | `banner` | Only when a direct child of `<body>` |
| `<nav>` | `navigation` | Label each one when there are several |
| `<main>` | `main` | Exactly one, and the skip-link target |
| `<aside>` | `complementary` | |
| `<footer>` | `contentinfo` | Only when a direct child of `<body>` |
| `<section>` | `region` | **Only if it has an accessible name** |

A bare `<section>` produces no landmark at all, which is why the `aria-labelledby` pattern above is the
difference between a navigable page and a flat one. Headings work the same way: they build an outline the
user moves through, so **skipping from `h1` to `h4` breaks navigation** even though it looks identical.
The element catalogue behind all of this is [Chapter ?? — Semantic HTML](#ch-semantic-html).

### Inspecting it

This is the part that turns accessibility from opinion into debugging.

| Tool | Shows you |
| --- | --- |
| Chrome DevTools → Elements → **Accessibility** pane | The computed role, name, state, and the full tree |
| Firefox DevTools → **Accessibility** panel | Same, plus a "check for issues" audit per node |
| macOS **Accessibility Inspector** (Xcode) | What the platform API exposes, including VoiceOver's view |
| `getComputedAccessibleName()` in DevTools console | The computed name for one element, quickly |

Do this before writing a single ARIA attribute. Roughly half the ARIA in a typical codebase was added to
fix a problem the author never actually inspected.

## When to Use It

| Situation | What to reach for | Why |
| --- | --- | --- |
| "The screen reader says the wrong thing" | The Accessibility pane | The name is computed; read the computation |
| An icon-only control | `aria-label`, or visually-hidden text | Role without a name announces as its type only |
| A named region users should jump to | `<section aria-labelledby>` | An unnamed section is not a landmark |
| Decorative image or duplicated icon | `alt=""` or `aria-hidden` on the non-focusable node | Removes a meaningless node from the tree |
| A region behind an open modal | `inert` | Removes interaction and focus in one attribute |

## Common Mistakes

**❌ `aria-hidden` on a focusable element**

```html
<!-- Tab still lands here; the screen reader has nothing to announce. -->
<button aria-hidden="true">Next</button>
```

**✅ Remove it from both trees, or from neither**

```html
<button hidden>Next</button>
```

**❌ An `aria-label` that contradicts the visible text**

> The tree wins, so voice control stops working and the announcement no longer matches the screen. Name
> from visible text with `aria-labelledby` instead.

**❌ Using `title` as the name**

> It is the lowest-priority source, it does not appear on touch or keyboard focus, and screen reader
> support for it varies. It is a hint, never a name.

**❌ Styling a heading level to fit the design**

> Heading levels are the outline users navigate. Pick the level for structure and use CSS for size —
> `<h2 class="text-sm">` is correct, `<h4>` for visual reasons is not.

## 🔑 Key Takeaways

- Assistive technology reads the accessibility tree, not the DOM, and each node carries a role, a name, a state and properties.
- The accessible name is computed in a fixed order: `aria-labelledby`, then `aria-label`, then native labelling, then text content, then `title`.
- Where visible text exists, name from it — an `aria-label` that disagrees with the screen breaks voice control.
- `aria-hidden` hides a node from the tree but leaves it focusable, which is the most common way to strand a keyboard user.
- Landmarks and heading levels are navigation, so an unnamed `<section>` and a skipped heading both cost users a route through the page.

## Interview Questions

**Q: What is the accessibility tree, and why does it matter to you rather than to a specialist?**

It is the structure the browser derives from the DOM and exposes to assistive technology through the
platform API, with one node per meaningful element carrying a role, name, state and properties. It matters
because it is inspectable: instead of speculating about what a screen reader will say, I open the
Accessibility pane and read the computed node. Most defects are visible there as a missing role or an
empty name, and neither is visible on screen.

**Q: How is an accessible name computed?**

In precedence order: `aria-labelledby`, `aria-label`, native labelling like `<label for>` or `alt`, then
the element's own text content, then `title` as a last resort. The practical rule is to prefer
`aria-labelledby` pointing at visible text, because a written `aria-label` overrides what the user can see
— which breaks voice control when the two disagree, and drifts the moment someone edits the button text.

**Q: What is the difference between `hidden`, `aria-hidden` and `inert`?**

`hidden` and `display: none` remove the element from both the screen and the tree, so it is neither
visible nor focusable. `aria-hidden="true"` removes it from the tree only — it stays visible and stays
focusable, which is why putting it on a button strands keyboard users on a control with nothing to
announce. `inert` keeps the element in the tree but makes it non-interactive and unfocusable, which is
what you want for the page behind an open modal.

**Q: A `<section>` is not showing up as a landmark. Why?**

Because `<section>` only maps to the `region` role when it has an accessible name. Adding
`aria-labelledby` pointing at its heading gives it one, which is also the pattern that keeps the landmark
label and the visible heading in sync. The same is true of `<nav>` when there are several — without labels
the user hears "navigation" three times and cannot tell them apart.

**Q: When is it right to hide something from screen readers?**

When it is genuinely redundant or decorative: a decorative image gets `alt=""`, an icon sitting beside its
own text label gets `aria-hidden` so it is not announced twice, and offscreen carousel slides get removed
from the tree along with their focusability. What is never right is hiding something the user can still
reach with a keyboard, or hiding real content because its announcement is inconvenient.

## What to Read Next

- [Chapter ?? — ARIA, and When Not to Use It](#ch-aria) — what to do when no element produces the role you need
- [Chapter ?? — Keyboard and Focus Management](#ch-keyboard-and-focus) — the other half of what a node in this tree needs
- [Chapter ?? — Semantic HTML](#ch-semantic-html) — the elements that fill the tree in for free
