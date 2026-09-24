---
title: End-to-End, Visual and Contract Testing with Playwright
part: 4
chapter: 18
slug: end-to-end-testing
level: advanced # beginner | intermediate | advanced
reading_time: 14
updated: 2026-09-24
tags: [playwright, e2e, testing, flaky-tests, ci, browser, visual-regression, contract-testing, mutation-testing]
in_book: true
---

# End-to-End, Visual and Contract Testing with Playwright {#ch-end-to-end-testing}

> Write the few browser tests worth their runtime, then cover what no assertion can see: how the page looks and whether the API still agrees.

**In this chapter:** what only a real browser can prove · locators, auto-waiting and a reused login · visual regression without daily noise · contract checks against API drift · what runs where in CI

## 💡 The Core Idea

An end-to-end test is the only test that runs **your real build, in a real browser engine, against a
real server**. That is its whole value, and also why it is slow and sometimes fails for no fault of
yours. So **pick the smallest set of journeys whose failure would be unacceptable, and defend that
number** — three to ten for most products.

Every other test compares an expected value with an actual one. That cannot reach three failures:

| Failure | Why an assertion cannot reach it | The tool |
| ------- | -------------------------------- | -------- |
| "The layout is broken" | Appearance is thousands of pixels, not one value | Visual regression |
| "The API changed" | Your test faked the API, so it agrees with itself | Contract testing |
| "Our tests do not catch bugs" | A passing suite cannot report its own blind spots | Mutation testing |

## How It Works

### Where component testing stops and E2E starts

| Environment | Layout engine | Network | Cost per test |
| ----------- | ------------- | ------- | ------------- |
| **jsdom** (Vitest default) | None | Intercepted | ~10 ms |
| **Browser mode** — real engine, one component | Real | Intercepted | ~100 ms |
| **End-to-end** — real engine, real app | Real | Real | Seconds |

- **jsdom has no layout engine.** Element size, scroll, `IntersectionObserver` and sticky headers all
  need a real browser.
- **Only end-to-end has a real server.** Headers, cookies, redirects and the built bundle can only be
  tested here, because every lower layer fakes the server.

Do not choose E2E because a flow is *long*. A twelve-step form is still an integration test, as
[Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) shows.

### Why Playwright is the default

Cypress runs the test *inside* the page: a great debugger, but awkward tabs, cross-origin and iframes.
Playwright drives the browser from *outside*, so none of those are special, and it also runs WebKit.

### Locators auto-wait, which removes most flake

A Playwright locator is a **query that runs again each time you use it**. Before acting, Playwright
waits until the element is attached, visible, stable and enabled.

**A login journey with web-first assertions:**

```typescript
import { test, expect } from "@playwright/test";

test("a user can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Log in" }).click();

  // Web-first assertions retry until they pass or time out.
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});
```

Pick locators as in [Chapter ?? — Writing the Tests: Vitest and React Testing Library](#ch-vitest):
role and label first, test id when there is no accessible text, CSS never.

> ⚠️ `page.waitForTimeout(2000)` is the biggest single cause of a slow, flaky suite. Every real wait
> has a condition: `toBeVisible`, `toHaveURL`, `waitForResponse`. A fixed sleep is too short on a busy
> CI runner and wasted time on a fast one.

### Log in once, and configure CI with care

Logging in inside `beforeEach` is often most of a suite's runtime, so log in once and reuse the state.

**A setup project, and the CI settings worth arguing for:**

```typescript
// auth.setup.ts — runs before the test projects
setup("authenticate", async ({ page }) => {
  await logIn(page);
  await page.context().storageState({ path: ".auth/user.json" }); // cookies + localStorage
});

// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // a stray test.only cannot silently skip the suite
  retries: process.env.CI ? 2 : 0,
  use: { trace: "on-first-retry" },
  webServer: { command: "pnpm build && pnpm start", url: "http://localhost:3000" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { storageState: ".auth/user.json" }, dependencies: ["setup"] },
  ],
});
```

Keep one test that does **not** use the stored state, to test login itself. Running `webServer` on the
**production build** is what lets the suite catch a build-output bug. Retries stop one flake blocking
a merge, but they also **hide** flake, so report retried tests and chase them.

### Visual regression compares pixels, not the DOM

A DOM snapshot passes while the markup is unchanged. It cannot see a wrong colour token, an overlap at
1280px, or a `z-index` that hides a button. Those need an image.

**A screenshot test that stays quiet:**

```typescript
test("the pricing page is visually unchanged", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveScreenshot("pricing.png", {
    animations: "disabled", // freeze transitions, or every run differs
    mask: [page.getByTestId("live-user-count")], // black out live content
    maxDiffPixels: 100, // absorb sub-pixel font rendering
  });
});
```

Without those options the test fails every run, and the team learns to approve diffs unread.
**Generate baselines on the platform that compares them** — a macOS baseline differs from a Linux
runner on nearly every glyph. Visual tests pay best on design-system components: forty components in
four states is 160 screenshots nobody could check by hand.

### Contract testing catches the drift your mocks hide

Integration-test handlers encode what the frontend *believes* the API returns. If the server renames a
field, every one of those tests still passes.

**The cheap fix — check a real response against the schema you parse with:**

```typescript
import { z } from "zod";

const User = z.object({ id: z.string().uuid(), name: z.string(), email: z.string().email() });

// Runs against a real deployed environment, not a mock.
test("the users endpoint still returns the shape we parse", async ({ request }) => {
  const res = await request.get(`${process.env.API_URL}/api/users/1`);
  expect(User.safeParse(await res.json()).success).toBe(true);
});
```

Run one per endpoint against staging on a schedule. It finds a renamed field the day it ships. The
full version is **consumer-driven contracts**: the consumer publishes what it needs, and the
provider's own pipeline fails when a change breaks it. That needs a shared broker and the API team's
buy-in — worth it when several teams use one API, overkill when one team ships both sides.

> ⚠️ **Moving target:** contract-testing tools churn, and clients generated from OpenAPI or GraphQL
> schemas now do much of their job. The durable principle is that a mock is your assumption, and
> something must compare it with the provider's reality. If the API is typed end-to-end in one repo,
> the compiler does that — see [Chapter ?? — GraphQL, tRPC and Typed API Choices](#ch-graphql).

### Mutation testing, and what runs where

Coverage counts the lines that ran. Mutation testing changes your code — `age >= 18` becomes
`age > 18` — and checks whether any test fails. If none does, `age === 18` is untested, even at 100%
coverage. The suite runs once per mutant, so it is an audit of costly modules, not a gate.

| Stage | Runs | Why there |
| ----- | ---- | --------- |
| Every pull request | Unit, integration, visual on changed components, E2E on key journeys | Fast enough; the diff is the review |
| On a schedule | Contract checks against staging | Needs a deployed environment |
| After deploy | Smoke tests — the same few journeys against production | "Is it actually up?" |
| Now and then | Mutation testing on pricing, permissions, date maths | Too slow to gate on |

## When to Use It

| Situation | Test with | Why |
| --------- | --------- | --- |
| Login, checkout, payment | End-to-end | Failure costs money; a few slow tests are worth it |
| A security header, cookie flag or redirect | End-to-end | No lower layer has a real server |
| A long form flow with validation | Integration | Length is not a reason to go end-to-end |
| A design system, or a token refactor | Visual regression | The failure is visual by definition |
| An API another team owns and releases alone | Consumer-driven contracts | Their pipeline should fail, not yours |
| An API your team owns, same repo | A typed client, or a schema check | Cheaper; the compiler does the work |

## Common Mistakes

❌ **Depending on a live third-party API.** Their outage becomes your red pipeline.
✅ `page.route` the external call and keep your own backend real.

❌ **Tests that share data.** They pass in order and fail in parallel, which is the default.
✅ Each test creates what it needs, through the API rather than the UI.

❌ **Visual baselines made locally, with live content unmasked.** Everything diffs, every run.
✅ Generate baselines in CI, mask live content and disable animations.

❌ **Treating request mocks as a contract.** They are your assumption, and they agree with you forever.
✅ Check a real response against the schema you parse with, on a schedule.

## 🔑 Key Takeaways

- End-to-end is the only layer with a real build, browser engine and server, so keep it to the few journeys that must never break.
- The component-versus-E2E boundary depends on what is real, not how long the flow is.
- Locators run again and auto-wait, so every fixed sleep in a suite is a bug.
- Visual tests survive only with animations off, live content masked, and baselines made on the platform that compares them.
- Request mocks encode your assumption about an API, so a schema check against a real endpoint must compare it with reality.

## Interview Questions

**Q: How do you decide what deserves an end-to-end test?**

By what only this layer can prove: the real build, real cookies and headers, and the real API. Then
narrow by consequence, to the journeys whose failure loses money or locks users out. That is usually
three to ten tests, and a small number is what keeps them trusted.

**Q: Your E2E suite fails about once a week for no clear reason. How do you approach it?**

Get the trace first — `trace: "on-first-retry"` records each step of the real failure. Then check the
usual four: a fixed timeout, a live third-party call, state shared between tests, and a truly racy
assertion. Report retried tests, because retries hide the count.

**Q: Integration tests all pass, but production broke because the API renamed a field. What was missing?**

A check against the real provider. The handlers encode what the frontend believed, so they keep
agreeing with it. The cheap fix is a scheduled schema check per endpoint against staging. The thorough
fix is consumer-driven contracts, where the provider's pipeline fails first.

**Q: Would you add visual regression to every page?**

No. Pages that change weekly create more baseline churn than value, and one header change fails twenty
full-page shots. Put visual tests on design-system components, plus two or three key layouts — where
the failure is visual and nobody could check it by hand.

## What to Read Next

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — the layer most candidate E2E tests belong in
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — running axe in the browser this chapter already has open
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — where these checks fit against the other test layers
