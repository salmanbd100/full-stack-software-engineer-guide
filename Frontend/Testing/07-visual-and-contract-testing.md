---
title: Visual and Contract Testing
part: 4
chapter: 0
slug: visual-and-contract-testing
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [visual-regression, contract-testing, mutation-testing, ci, testing]
in_book: true
---

# Visual and Contract Testing {#ch-visual-and-contract-testing}

> Cover the three failures assertions structurally cannot see — how it looks, whether the API still agrees, and whether your tests would catch a bug.

**In this chapter:** what an assertion cannot express · visual regression without daily false positives · contract testing against real API drift · mutation testing as the honest quality metric · what belongs in which CI stage

## 💡 The Core Idea

Every test in the previous six chapters works the same way: you state an expected value and compare.
That covers a lot, and it structurally cannot cover three things.

| Failure | Why an assertion cannot reach it | The tool |
| ------- | -------------------------------- | -------- |
| "The layout is broken" | There is no value to compare. Appearance is thousands of pixels, not a string | Visual regression |
| "The API changed" | Your test faked the API, so it agrees with itself | Contract testing |
| "Our tests do not actually catch bugs" | A passing suite cannot report its own blind spots | Mutation testing |

Each is a different kind of check: one compares images, one compares your assumption against someone
else's reality, and one attacks your suite instead of your code. They belong in one chapter because
they share a practical problem — all three are easy to set up in a way that produces noise, and noise
gets them switched off within a month.

## How It Works

### Visual regression compares pixels, not the DOM

A DOM snapshot passes when the markup is unchanged. It says nothing about a colour token that resolved
to the wrong value, an overlap at 1280px, or a `z-index` that hid a button. Those need an image.

```typescript
import { test, expect } from "@playwright/test";

test("the pricing page is visually unchanged", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page).toHaveScreenshot("pricing.png", {
    animations: "disabled", // freeze transitions, or every run differs
    mask: [page.getByTestId("live-user-count")], // black out genuinely dynamic content
    maxDiffPixels: 100, // absorb sub-pixel font rendering
  });
});
```

Those three options are the whole difference between a useful check and an abandoned one:

| Option | Without it |
| ------ | ---------- |
| `animations: "disabled"` | Screenshots land mid-transition, so every run diffs |
| `mask` | A timestamp, an ad slot or a live counter fails the test daily |
| `maxDiffPixels` | Font antialiasing differs between the developer's machine and the CI runner |

**Baselines must be generated on the same platform that runs them.** A baseline captured on macOS and
compared on a Linux runner differs on nearly every glyph. Generate them in CI, commit them, and treat
an intentional change as a reviewed baseline update — the diff image in the report is the review.

Component-level visual testing — one component, many states, usually paired with a component
explorer — is where this pays best. A design system with forty components and four states each is 160
screenshots that nobody could check by hand, and exactly the place a token change silently breaks
something.

### Contract testing catches the drift your mocks hide

[Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) is explicit about its
blind spot: the handlers encode what the frontend *believes* the API returns. If the server renames a
field, every one of those tests still passes.

Two ways to close it, and they cost very differently.

**The cheap version — validate a real response against a schema:**

```typescript
import { z } from "zod";

const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

// Runs against a real deployed environment, not a mock.
it("the users endpoint still returns the shape we parse", async () => {
  const res = await fetch(`${process.env.API_URL}/api/users/1`);
  expect(User.safeParse(await res.json()).success).toBe(true);
});
```

That is one test per endpoint you depend on, run against staging on a schedule. It finds a renamed or
retyped field the day it ships, which is most of the value for most teams.

**The full version — consumer-driven contracts.** The consumer publishes what it needs, the provider
verifies against every published expectation in its own pipeline, and the provider's build fails when
a change would break a consumer. That is the real guarantee, and it costs a shared broker plus
buy-in from the API team. Worth it when several teams consume one API and releases are independent;
overkill when the same team ships both sides.

The same schema is reusable at runtime as the parse boundary, which is how one declaration covers both
the contract check and the "the API returned something unexpected" error path.

> ⚠️ **Moving target:** the contract-testing tool landscape churns, and generated clients from an
> OpenAPI or GraphQL schema have absorbed a lot of what contract tests were used for. The durable
> principle is that a mock is your assumption and something has to compare it against the provider's
> reality. If the API is typed end-to-end in one repository, that comparison is the compiler's job —
> see [Chapter ?? — tRPC and Typed APIs](#ch-trpc).

### Mutation testing is the metric coverage pretends to be

Coverage counts executed lines. Mutation testing changes your code and checks whether any test
notices.

```typescript
// Original
if (age >= 18) return "adult";

// A mutant: >= becomes >
if (age > 18) return "adult";
```

If no test fails on that mutant, the boundary case `age === 18` is untested — and coverage was
reporting 100% for that line the whole time. The output is a **mutation score**: the percentage of
mutants your suite killed.

It is expensive, because the suite runs once per mutant. So it is a periodic audit rather than a gate:
run it on the modules where a bug is genuinely costly — pricing, permissions, date arithmetic — and
read the surviving mutants as a to-do list. Running it across a whole application weekly buys a number
nobody acts on.

### Accessibility and performance already have owners

Both belong in CI, and neither belongs in this chapter.

| Check | Where it lives | What this chapter contributes |
| ----- | -------------- | ----------------------------- |
| Automated `axe` runs, keyboard and screen reader passes, CI gating | [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) | Nothing. That chapter owns the method |
| Performance budgets, Lighthouse assertions, bundle-size gates | [Chapter ?? — Bundle Optimisation and Performance Budgets](#ch-bundle-optimisation) | Nothing. That chapter owns the budget |

The reason to say so explicitly: a "specialised testing" chapter is where duplication accumulates. The
tool list belongs next to the discipline that uses it, not next to the other tools.

### What runs where in the pipeline

| Stage | Runs | Why there |
| ----- | ---- | --------- |
| Every pull request | Types, lint, unit, integration, visual regression on changed components | Fast, and the diff is the review |
| Every pull request | End-to-end on the critical journeys | Minutes, and worth the wait |
| Nightly or on a schedule | Contract checks against staging | Needs a deployed environment |
| After deploy | Smoke tests — the same handful of journeys against production | "Is it actually up?" |
| Periodically, by hand | Mutation testing on high-risk modules | Too slow to gate on |

Smoke and regression are scheduling words rather than techniques: a smoke test is a few end-to-end
tests pointed at production after a release, and a regression test is any test that exists because
something broke once.

## When to Use It

| Situation | Reach for | Why |
| --------- | --------- | --- |
| A design system or component library | Component-level visual regression | 160 states nobody can check by hand |
| A refactor of shared CSS or design tokens | Visual regression on key pages | The failure is visual by definition |
| An API owned by another team, released independently | Consumer-driven contracts | Their pipeline should fail, not yours |
| An API owned by your team, same repository | A typed client, or a schema check | Cheaper, and the compiler does the work |
| Pricing, permissions or date logic | Mutation testing on those modules | Where a silent bug is most expensive |
| A marketing page that changes weekly | None of these | The baseline churn would exceed the value |

## Common Mistakes

❌ **Visual regression without masking dynamic content.** A timestamp fails the test every run and the
team learns to approve diffs unread.
✅ Mask live content, disable animations, and allow a small pixel tolerance.

❌ **Baselines generated locally.** Font rendering differs from the CI runner, so everything diffs.
✅ Generate and commit baselines from CI, on the platform that will compare them.

❌ **Full-page screenshots as the only visual coverage.** One header change fails twenty pages.
✅ Component-level shots for breadth; whole-page shots for two or three key layouts.

❌ **Treating request mocks as a contract.** They are your assumption, and they will agree with you
forever.
✅ Check a real response against the schema you parse with, on a schedule.

❌ **Mutation testing in the pull-request pipeline.** It multiplies suite runtime by the mutant count.
✅ Run it periodically on high-risk modules and act on the surviving mutants.

## 🔑 Key Takeaways

- Visual regression, contract testing and mutation testing cover the three failures an assertion structurally cannot express.
- Visual tests survive only with animations disabled, dynamic content masked, and baselines generated on the platform that compares them.
- Request mocks encode your assumption about an API; something has to compare it against the provider's reality.
- A schema check against a real endpoint gets most of contract testing's value for a fraction of the cost.
- Mutation testing measures whether tests would catch a bug, which is what coverage is mistaken for.

## Interview Questions

**Q: What does visual regression catch that a snapshot test does not?**

Anything about appearance rather than structure. A DOM snapshot passes when the markup is unchanged, so
a design token resolving to the wrong colour, an overlap at one breakpoint, or a `z-index` covering a
button all sail through. Those are pixel differences with no value to assert on, which is why the
comparison has to be an image.

**Q: Your integration tests all pass and production is broken because the API renamed a field. What was missing?**

A check against the real provider. Those tests used handlers written by the frontend, so they encode
what we believed the API returns and will keep agreeing with us indefinitely. The cheap fix is one
schema validation per endpoint run against staging on a schedule; the thorough fix is consumer-driven
contracts, where the provider's own pipeline fails when a change breaks a published expectation.

**Q: Why is mutation testing a better signal than coverage?**

Because coverage counts which lines executed, and mutation testing checks whether a test would fail if
that line were wrong. A line covered by a test with a weak assertion reports 100% and catches nothing,
which is exactly the case a surviving mutant reveals. The cost is that the suite runs once per mutant,
so it is a periodic audit on high-risk code rather than a merge gate.

## What to Read Next

- [Chapter ?? — End-to-End Testing with Playwright](#ch-end-to-end-testing) — the browser these visual checks run in
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — the CI check this chapter deliberately does not restate
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — where these three fit against the four assertion layers
