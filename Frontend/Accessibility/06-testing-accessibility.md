---
title: Testing Accessibility
part: 2
chapter: 0
slug: testing-accessibility
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [accessibility, testing, axe, playwright, screen-readers, ci]
in_book: true
---

# Testing Accessibility {#ch-testing-accessibility}

> Gate the machine-checkable half in CI, and run the two manual passes that find everything automation cannot see.

**In this chapter:** what automation catches · where axe belongs in the pyramid · gating CI without a blanket ratchet · the keyboard pass · the screen reader pass · the audit trail

## 💡 The Core Idea

Automated accessibility rules catch somewhere between a third and a half of real defects. That number is
the whole strategy in one statistic: **automation is necessary and nowhere near sufficient**, so a team
that runs axe in CI and calls the job done has a green pipeline and an inaccessible product.

The reason is what the rules can see. A machine can tell that an image has no `alt`; it cannot tell that
the `alt` says "image123". It can tell a button has no accessible name; it cannot tell that focus lands
somewhere absurd after the dialog closes. So the testing strategy is layered: cheap automated checks
everywhere, and two short manual passes on anything with an interaction.

> The useful question is never "did axe pass". It is "can I complete this task with only a keyboard, and
> does the screen reader tell me what happened".

> ⚠️ **Moving target:** axe-core adds and revises rules across majors, so the same unchanged page can
> report a different violation count after a dependency bump — which is why a ratcheted count is a
> fragile gate. The durable principle is the split itself: automation covers roughly a third to a half
> of the criteria, and no version of any scanner is going to close the other half.

## How It Works

### What each layer catches

| Layer | Catches | Cost | Misses |
| --- | --- | --- | --- |
| **Lint** (`eslint-plugin-jsx-a11y`) | Static markup mistakes — no `alt`, `onClick` on a `div` | Free, instant | Anything runtime or computed |
| **Component tests** (axe on rendered output) | Missing names, invalid ARIA, contrast in isolation | Seconds | Page composition, focus order |
| **E2E** (axe on real routes) | Landmarks, duplicate ids, contrast in context, state after interaction | Minutes | Whether the experience makes sense |
| **Keyboard pass** (human) | Focus order, traps, focus after actions, unreachable controls | Two minutes per feature | Announcements |
| **Screen reader pass** (human) | Wrong names, missing announcements, meaningless reading order | Ten minutes per feature | Nothing you will find cheaper |

The middle three are the ones teams argue about; the last two are the ones that find the defects users
report. The tooling-level catalogue of these test types lives in
[Chapter ?? — Specialised Testing](#ch-specialized-testing) — this chapter is about the method.

### axe in a component test

Component-level checks work best on the states a page test cannot easily reach — the error state, the
expanded state, the loading state.

```tsx
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PasswordField } from './PasswordField';

it('has no violations while showing an error', async () => {
  const { container } = render(<PasswordField error="Must be at least 12 characters" />);

  // Rendered state matters: this component passes when valid and failed when invalid.
  expect(await axe(container)).toHaveNoViolations();
});
```

There is a second, quieter benefit. **Querying by role and label is itself an accessibility test.** If
`getByRole('button', { name: 'Save' })` cannot find the control, no screen reader or voice-control user
can either — see [Chapter ?? — React Testing Library](#ch-react-testing-library).

### axe in an end-to-end test

Page-level checks catch what component tests structurally cannot: landmark structure, duplicate ids across
composed components, and contrast against real backgrounds.

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/checkout');

  const results = await new AxeBuilder({ page })
    // Scope to the standard you claim conformance with, not every rule axe ships.
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Third-party iframes you cannot fix, excluded explicitly rather than silently.
    .exclude('iframe[title="Payment provider"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

Two decisions in that snippet are the interesting part. **Tag selection** ties the test to the
conformance level you actually claim — running every rule axe has, including best-practice ones, produces
failures nobody agreed to fix. **Explicit exclusions** keep a third-party widget from blocking your
pipeline while leaving a record of what is unchecked, which is the honest version of a skipped test.

Also assert after interaction, not only on load. The dialog open state, the expanded accordion and the
submitted-with-errors form are where the defects are.

### Gating CI without lying to yourself

| Strategy | Behaviour | When |
| --- | --- | --- |
| **Fail on any violation** | Strict | New code, new components, a new route |
| **Baseline the count and fail on increase** | Ratchets down | An existing codebase with a known backlog |
| **Report only** | Never blocks | Useless within two sprints; everyone stops reading it |

A large existing product should baseline. The rule that makes a baseline work is that **the number may
only go down**: a pull request that adds a violation fails, and a fix that removes one updates the file.
Report-only mode is how accessibility dashboards end up with four hundred untouched issues.

Scope it too. Running axe against every route on every commit is slow and noisy; run the critical journeys
on every pull request and the full route list nightly.

### The keyboard pass

Two minutes, no tooling, and it finds more than any rule set. Do it before opening the pull request.

- Tab from the top. Does the order match the visual order, and can you see where you are at every stop?
- Reach every control. Anything you can click, you should be able to reach and activate with Enter or Space.
- Open the dialog. Does focus go in, stay in, close on Escape, and return to the trigger?
- Complete the task. Submit the form, fix an error, delete a row — and check where focus lands each time.
- Zoom to 200% and narrow to 320 px. Does anything become unreachable or scroll in two directions?

### The screen reader pass

You do not need to be an expert user; you need to hear whether the announcements are true.

| Platform | Reader | Start with |
| --- | --- | --- |
| Windows | NVDA (free) with Chrome or Firefox | The most common combination among real users |
| macOS / iOS | VoiceOver | Built in — Cmd + F5, or triple-click the side button |
| Android | TalkBack | Built in |

Learn four gestures and you can run the pass: read next item, list headings, list landmarks, and list form
controls. Then check three things — does every control announce a name that matches what is on screen,
does the heading list describe the page, and after each action does something get announced. Testing on
one screen reader is the norm and is far better than testing on none, but remember that behaviour varies
between them, so a defect that only NVDA exposes is still a defect.

> ⚠️ Do not treat your own screen reader session as a substitute for testing with disabled users. It tells
> you whether the markup is right; it does not tell you whether the flow works for someone who navigates
> this way daily.

### The artefact at the end

For anything sold to enterprise or public sector, the output of all this is a **conformance report** — a
VPAT filled in as an ACR, stating criterion by criterion whether the product supports, partially supports
or does not support each requirement. Automated results feed it, the manual passes decide most rows, and
an honest "partially supports" with a date survives procurement better than an unearned "supports". The
legal frame behind that document is
[Chapter ?? — Why Accessibility, and the Law](#ch-accessibility-and-the-law).

## When to Use It

| Situation | Choose | Why |
| --- | --- | --- |
| A new component | Lint plus axe in a component test, per state | Cheapest place to catch a naming or ARIA error |
| A critical user journey | axe in E2E, plus a keyboard pass | Composition defects only appear on a real page |
| A large legacy codebase | Baseline the violation count and ratchet | Strict mode would stay red and be ignored |
| A third-party widget you cannot change | Exclude it explicitly and record it | Honest, and does not block the pipeline |
| Before a release with a compliance claim | The manual passes, then update the ACR | These are the rows automation cannot fill |

## Common Mistakes

**❌ Treating a green axe run as compliance**

> It covers a third to a half of criteria. The other half is where the reports from real users come from.

**❌ Running every axe rule, including best practice**

> It produces failures nobody agreed to fix, and the team learns to ignore the job. Scope to the tags for
> the level you claim.

**❌ Snapshotting the violations array**

> A snapshot makes a violation permanent by recording it as expected. Assert on the count, or on empty.

**❌ Only asserting the initial render**

> The dialog, the error state and the expanded menu are where the defects live, and a load-time check sees
> none of them.

**✅ Adding the keyboard pass to the pull request template**

> One checkbox, two minutes, and it changes what reaches review.

## 🔑 Key Takeaways

- Automated rules catch a third to a half of real defects, so they are a gate rather than a strategy.
- Component tests cover per-state naming and ARIA; end-to-end tests cover landmarks, composition and contrast in context.
- Scope axe to the tags for the conformance level you claim, and exclude third-party frames explicitly rather than silently.
- Baseline the violation count on a legacy codebase and only ever let it fall; report-only mode gets ignored.
- The keyboard pass takes two minutes and finds focus defects no rule set can see; the screen reader pass finds wrong names and missing announcements.

## Interview Questions

**Q: How do you test accessibility?**

In layers. Lint for static markup mistakes, axe inside component tests for each meaningful state, axe in
end-to-end tests on the critical journeys — scoped to the WCAG tags for the level we claim, and asserted
after interaction rather than only on load. Then the two manual passes: a keyboard run through the task,
and a screen reader run to check that names match the screen and actions are announced. Automation covers
a third to a half of the criteria, so the manual passes are not optional extras.

**Q: What can automated tooling not catch?**

Anything requiring judgement. Whether `alt` text is useful rather than merely present, whether the reading
order makes sense, whether focus lands somewhere sensible after a dialog closes, whether a custom widget's
keyboard model matches what users expect, and whether an error message tells the user what to do. Those
are exactly the defects users report, which is why a green pipeline and an unusable product coexist so
often.

**Q: How would you introduce accessibility gates into a large legacy codebase?**

Baseline first, then ratchet. A strict gate on a codebase with hundreds of existing violations stays red,
and a permanently red check trains everyone to ignore it. So I would record the current count per rule,
fail any pull request that increases it, and commit a lower baseline whenever a fix lands. New components
get the strict gate from day one, since there is no backlog to grandfather.

**Q: Which screen reader would you test with, and how much does the choice matter?**

NVDA with Chrome or Firefox on Windows, because that combination is closest to what real users have, and
VoiceOver on macOS or iOS when the product is Apple-heavy. The choice matters less than doing it at all —
behaviour differs between readers, so a defect only one exposes is still a defect. What I would not claim
is that my own ten-minute session substitutes for testing with people who navigate this way every day.

**Q: A pull request adds a component with no accessibility tests. What do you ask for?**

A role-and-name query in the existing tests rather than a `data-testid`, since that assertion is itself an
accessibility check, and an axe assertion on the states the component actually has — including the error
and expanded ones. Then I would ask whether the author tabbed through it, because focus order and focus
after interaction are the parts no test in that pull request can see.

## What to Read Next

- [Chapter ?? — Why Accessibility, and the Law](#ch-accessibility-and-the-law) — the standard these tests are measuring against
- [Chapter ?? — Keyboard and Focus Management](#ch-keyboard-and-focus) — what the manual keyboard pass is looking for
- [Chapter ?? — Specialised Testing](#ch-specialized-testing) — where a11y checks sit among visual and contract tests
