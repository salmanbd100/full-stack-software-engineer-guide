---
title: Accessible Forms and Error Messaging
part: 2
chapter: 0
slug: accessible-forms
level: advanced
reading_time: 10
updated: 2026-09-07
tags: [accessibility, forms, labels, validation, errors, autocomplete]
in_book: true
---

# Accessible Forms and Error Messaging {#ch-accessible-forms}

> Label every control, group the ones that belong together, and make an error findable, readable and fixable without a mouse.

**In this chapter:** labels and the three ways to get one wrong · grouping · autofill · the error contract · the summary pattern · what WCAG 2.2 added for login

## 💡 The Core Idea

Forms are where accessibility failures cost money, because a form is where the user was about to do the
thing your company is paid for. They are also the most systematic part of accessibility: a small number of
rules, applied to every field, catch nearly everything.

Two ideas carry most of it. **Every control needs a programmatic label**, not just text sitting near it —
the association is what lets a screen reader announce the field on focus and lets a click on the label put
the cursor in the field. And **an error has to be three things at once**: announced when it appears,
associated with the field it belongs to, and specific enough to act on. "Invalid input" satisfies none of
those.

> A form is accessible when a user who cannot see it can tell what each field wants, what went wrong, and
> where to go to fix it — without leaving the keyboard.

## How It Works

### Labels, and the three common substitutes

```html
<!-- ✅ Explicit association. The label is clickable and announced on focus. -->
<label for="email">Email address</label>
<input id="email" type="email" name="email" autocomplete="email" />

<!-- ✅ Implicit association, when the markup suits it. -->
<label>Email address <input type="email" name="email" /></label>
```

| Substitute | Why it fails |
| --- | --- |
| **A placeholder** | Disappears on first keystroke, contrast is usually below AA, announcement varies by screen reader, and it is gone exactly when the user wants to check what the field was |
| **Text in a neighbouring `div`** | Visually fine, programmatically unlinked — nothing announces on focus, and clicking it does nothing |
| **`aria-label` only** | Works for assistive technology and gives sighted users nothing; use it only where a visible label is genuinely impossible, such as a search field with an adjacent icon |

A placeholder is legitimate as a **format example** beside a real label — `DD/MM/YYYY` — and nowhere else.

### Grouping: radios, checkboxes and multi-part fields

A radio group's individual labels are meaningless without the question they answer.

```html
<fieldset>
  <legend>Delivery speed</legend>

  <label><input type="radio" name="speed" value="standard" checked /> Standard — 3 days</label>
  <label><input type="radio" name="speed" value="express" /> Express — next day</label>
</fieldset>
```

`<legend>` is prepended to each control's announcement, so the user hears "Delivery speed, Standard, radio
button, 1 of 2". The same applies to a date split across three inputs or an address block: without a group
name the user hears "Day, edit" with no idea which date.

### Autofill is an accessibility feature

`autocomplete` tokens let the browser and password managers fill fields, which removes typing for users
with motor impairments and prevents the transcription errors that cause most form abandonment. WCAG 1.3.5
requires them at AA for common fields.

| Field | Token |
| --- | --- |
| Email | `autocomplete="email"` |
| Given / family name | `given-name`, `family-name` |
| Address line | `address-line1`, `postal-code`, `country-name` |
| New password | `new-password` |
| Existing password | `current-password` |
| One-time code | `one-time-code` |

`new-password` versus `current-password` is the pair worth remembering: it tells a password manager
whether to offer a generated value or a stored one, and getting it wrong is why so many sign-up forms
fight the browser.

### The error contract

An error message has to satisfy four things. Most implementations manage one or two.

| Requirement | How | Criterion |
| --- | --- | --- |
| Announced when it appears | Live region, or focus moved to a summary | 4.1.3 |
| Associated with its field | `aria-describedby` pointing at the message | 3.3.1 |
| Marked as invalid | `aria-invalid="true"` on the input | 3.3.1 |
| Specific enough to act on | Say what is wrong **and** what is acceptable | 3.3.3 |

```html
<label for="pw">New password</label>
<input
  id="pw"
  type="password"
  autocomplete="new-password"
  aria-describedby="pw-hint pw-error"
  aria-invalid="true"
/>
<p id="pw-hint">At least 12 characters.</p>
<p id="pw-error">Password must be at least 12 characters. This one has 8.</p>
```

`aria-describedby` accepts a list, so a hint and an error can both be announced, in that order, after the
field's name. Note that the hint is referenced whether or not there is an error — the user should hear the
requirement on focus rather than only after failing it.

### The summary pattern, for submit-time validation

On a failed submit, a keyboard user should not have to tab the whole form hunting for red.

```html
<!-- Rendered on failure, focused by script, listing every problem as a link. -->
<div role="alert" tabindex="-1" id="error-summary">
  <h2>There are 2 problems with this form</h2>
  <ul>
    <li><a href="#email">Enter an email address in the format name@example.com</a></li>
    <li><a href="#pw">Password must be at least 12 characters</a></li>
  </ul>
</div>
```

```typescript
// Move focus to the summary so it is read and the links are the next Tab stops.
document.querySelector<HTMLElement>('#error-summary')?.focus();
```

Each link jumps to the field it describes. This is the pattern the UK Government Digital Service settled
on after usability testing, and it works for everyone — sighted users get a checklist, screen reader users
get the count and the route.

### Validation timing

| When | Behaviour | Why |
| --- | --- | --- |
| On every keystroke | ❌ Announces "invalid email" while the user types the first letter | Live-region churn, and it is untrue yet |
| On blur | ✅ Field-level errors as the user leaves each field | Matches how people fill forms |
| On submit | ✅ The summary, with focus moved to it | Catches what blur validation cannot |
| While typing, for success | ✅ Password strength, characters remaining | Positive feedback is not an interruption |

> ⚠️ Announce a live-region character counter sparingly. A polite region updated on every keystroke floods
> the speech queue; announce at thresholds — "20 characters remaining" — rather than continuously.

### What WCAG 2.2 added for forms

Three of the six new criteria are form criteria, and all three are common failures.

- **3.3.7 Redundant Entry (A)** — do not ask for the same information twice in one flow. A billing address
  that repeats the delivery address needs a copy option or a prefilled value.
- **3.3.8 Accessible Authentication (Minimum) (AA)** — no cognitive function test to log in. **Paste must
  work**, password managers must not be blocked, and puzzle-style verification needs an alternative. The
  `onpaste` handler blocking paste into a password field is now a conformance failure.
- **2.5.8 Target Size (Minimum) (AA)** — checkboxes, radios and their labels need a 24 × 24 CSS px target
  or equivalent spacing. Wrapping the input in its `<label>` usually fixes this for free.

## When to Use It

| Situation | Choose | Why |
| --- | --- | --- |
| Any single control | `<label for>` | The only association that gives both click target and announcement |
| Radios, checkbox sets, multi-part fields | `<fieldset>` and `<legend>` | The group name is prepended to each control |
| A search field with only an icon | `aria-label`, or visually-hidden label text | No visible label exists to point at |
| One field failed validation | `aria-invalid` plus `aria-describedby` | Field-level, announced on focus |
| A submit failed with several errors | The focused summary with links | Gives the count and the route in one place |
| An async submit succeeded | `role="status"` | Confirms without stealing the cursor |

## Common Mistakes

**❌ Placeholder as the label**

> It vanishes when typing starts, usually fails contrast, and leaves the user unable to check what the
> field wanted.

**❌ `aria-invalid="true"` with no message**

> The user hears "invalid" and learns nothing. Pair it with `aria-describedby` and a specific sentence.

**❌ Error text in colour only**

> A red border and red text say nothing to a colourblind user and nothing at all to a screen reader. Text
> plus an icon, and the programmatic association.

**❌ Blocking paste into password or one-time-code fields**

> A WCAG 2.2 AA failure under 3.3.8, and it breaks password managers, which are the accessibility tool
> most users of these fields rely on.

**✅ Saying what is acceptable, not just what is wrong**

> "Enter a date in the format DD/MM/YYYY" is actionable. "Invalid date" is a dead end.

## 🔑 Key Takeaways

- Every control needs a programmatic label — `<label for>` — and a placeholder is a format example, never a label.
- Radios, checkbox sets and multi-part fields need `<fieldset>` and `<legend>` so the group name is announced with each option.
- `autocomplete` tokens are an accessibility requirement, and `new-password` versus `current-password` decides whether password managers cooperate.
- An error must be announced, associated with `aria-describedby`, marked with `aria-invalid`, and specific about what is acceptable.
- WCAG 2.2 made blocking paste in a login field a conformance failure, and asking twice for the same information a failure too.

## Interview Questions

**Q: A form uses placeholders instead of labels. What do you tell the designer?**

That it fails on three counts: the placeholder disappears on the first keystroke, so the user cannot check
what the field wanted; its contrast is almost always below 4.5 : 1; and its announcement is inconsistent
across screen readers, so some users get no field name at all. I would ask for visible labels above the
fields and offer the placeholder back as a format example beside the label, which is the one job it does
well.

**Q: How do you report a validation error accessibly?**

Four things together. The message is associated with the field through `aria-describedby`, the field is
marked `aria-invalid="true"`, the text says what is acceptable rather than just that something is wrong,
and the appearance of the error is announced — either by a live region for a single field-level error, or
by moving focus to an error summary on a failed submit. The summary lists each problem as a link to its
field, which gives keyboard users a route rather than a hunt.

**Q: When should validation run?**

Field-level checks on blur, and the full check on submit. Validating on every keystroke announces "invalid
email" while the user is typing the first letter, which is both untrue and noisy in a live region. Positive
feedback while typing is fine — a strength meter or a remaining-characters count — as long as it is not
announced on every character.

**Q: Why are `autocomplete` attributes an accessibility concern rather than a convenience?**

Because they remove typing, and typing is the expensive part for users with motor impairments, and because
they prevent the transcription errors that cause abandonment. WCAG 1.3.5 requires the tokens at AA for
common fields. The pair that matters most in practice is `new-password` against `current-password`, since
getting it wrong makes the form fight the password manager the user depends on.

**Q: What did WCAG 2.2 change about login forms?**

3.3.8 Accessible Authentication at AA: logging in must not require a cognitive function test, so paste has
to work, password managers must not be blocked, and any puzzle-style check needs an alternative route.
Alongside it, 3.3.7 Redundant Entry says a flow must not ask for the same information twice, which is the
billing-address-repeats-delivery-address case. Both are recent enough that most existing checkouts fail
them.

## What to Read Next

- [Chapter ?? — Keyboard and Focus Management](#ch-keyboard-and-focus) — where focus goes when a submit fails
- [Chapter ?? — ARIA, and When Not to Use It](#ch-aria) — live regions, and the states these fields set
- [Chapter ?? — Form State](#ch-form-state) — the framework side of validation and submission
