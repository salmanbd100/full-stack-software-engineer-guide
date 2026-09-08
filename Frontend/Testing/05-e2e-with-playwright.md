---
title: End-to-End Testing with Playwright
part: 4
chapter: 0
slug: end-to-end-testing
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [playwright, e2e, testing, flaky-tests, ci, browser]
in_book: true
---

# End-to-End Testing with Playwright {#ch-end-to-end-testing}

> Write the handful of browser tests worth their runtime, know where component testing stops, and keep the suite from going flaky.

**In this chapter:** what only a real browser can prove · where component testing stops and E2E starts · locators and auto-waiting · reusing a logged-in session · CI config that stays green

## 💡 The Core Idea

An end-to-end test is the only test that runs **your real build, in a real browser engine, against a
real server**. That is its entire value and the source of every complaint about it.

Because nothing is faked, it can catch things no other layer sees: a broken build output, a
Content-Security-Policy header that blocks your own script, a cookie with the wrong `SameSite`, a
redirect loop, a route that 404s only in production. Because nothing is faked, it is also slow, and it
fails for reasons unrelated to your change — a slow CI runner, a third-party API having a bad
afternoon, a database left dirty by the previous test.

So the strategy is not "add end-to-end coverage". It is **pick the smallest set of journeys whose
failure would be unacceptable, and defend that number.** Three to ten for most products. If a broken
flow would lose money or lock users out, it belongs here; everything else belongs a layer down.

## How It Works

### Where component testing stops and E2E starts

This is the boundary question, and the useful way to frame it is by what is real rather than by what
the test is called.

| Environment | DOM | Layout engine | Network | Routing | Cost per test |
| ----------- | --- | ------------- | ------- | ------- | ------------- |
| **jsdom** (Vitest default) | Simulated | None | Intercepted | In-memory router | ~10 ms |
| **Browser mode** — real engine, one component | Real | Real | Intercepted | Usually in-memory | ~100 ms |
| **End-to-end** — real engine, real app | Real | Real | Real | Real | Seconds |

Two lines in that table decide most cases:

- **jsdom has no layout engine.** It does not compute geometry, so anything depending on element size,
  scroll position, `IntersectionObserver`, sticky headers, or whether a focus ring is visible cannot be
  tested there. That is the boundary that pushes a component test into a real browser — not
  complexity, and not "it feels like an integration test".
- **Only end-to-end has a real server.** So anything about headers, cookies, redirects, the built
  bundle, or the actual API contract has to be end-to-end. Everything below that line is faking the
  server, which means it cannot detect the server being wrong.

The mistake is choosing E2E because a flow is *long*. Length is not the criterion; a twelve-step form
flow is happily an integration test, as [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing)
shows. **Realness** is the criterion.

### Playwright is the default, and why

| | Playwright | Cypress |
| --- | --- | --- |
| Browser engines | Chromium, Firefox, WebKit | Chromium-based, plus Firefox |
| Test execution | Out of process, driving the browser | Inside the browser's event loop |
| Parallelism | Built in, across workers | Paid orchestration, or manual sharding |
| Multi-tab, multi-origin, iframes | Native | Constrained by the in-browser model |
| Debugging | Traces, with a DOM snapshot per step | Interactive time-travel runner |

The structural difference is the second row. Cypress runs the test inside the page, which is what
makes its debugger so good and what makes multiple tabs, cross-origin navigation and iframes awkward.
Playwright drives the browser from outside over a protocol, so none of those are special cases — and
WebKit coverage means you actually test Safari, which is where a lot of real frontend bugs are.

Cypress remains a reasonable choice for a team that values its runner most and tests one Chromium
origin. For everything else Playwright is the default now, and it is what an interviewer expects.

### Locators auto-wait, which removes most flake

A Playwright locator is a **query, re-evaluated when used** — not a reference to an element found
earlier. Before acting, Playwright waits for the element to be attached, visible, stable and enabled.

```typescript
import { test, expect } from "@playwright/test";

test("a user can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Log in" }).click();

  // Web-first assertion: retries until it passes or times out.
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});
```

The locator priority is the same as in [Chapter ?? — React Testing Library](#ch-react-testing-library) —
role and label first, test id for anything without accessible content, CSS never. `page.locator("div >
div > button:nth-child(3)")` breaks on any markup change and tells you nothing about what the user did.

> ⚠️ `page.waitForTimeout(2000)` is the single largest cause of a slow, flaky Playwright suite. Every
> genuine wait has a condition: `toBeVisible`, `toHaveURL`, `waitForResponse`. A fixed sleep is either
> too short on a loaded CI runner or wasted time on a fast one, and usually both in the same suite.

### Log in once, not per test

Authentication in `beforeEach` is often most of a suite's runtime. Do it once and reuse the storage
state.

```typescript
// auth.setup.ts — a setup project that runs before the test projects
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: ".auth/user.json" }); // cookies + localStorage
});
```

```typescript
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /auth\.setup\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], storageState: ".auth/user.json" },
    dependencies: ["setup"],
  },
],
```

Every test in the `chromium` project now starts logged in. Test the login flow itself in one test that
does **not** use the stored state — otherwise the thing that gets everything else working is the one
thing nobody covers.

### The config decisions that matter in CI

```typescript
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // a stray test.only cannot silently skip the suite
  retries: process.env.CI ? 2 : 0,
  use: { trace: "on-first-retry", screenshot: "only-on-failure" },
  webServer: {
    command: "pnpm build && pnpm start", // the real build, not the dev server
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

Three of those are worth arguing for. `webServer` running the **production build** rather than the dev
server is what makes the test able to catch a build-output bug — the whole reason to have this layer.
`trace: "on-first-retry"` gives a step-by-step DOM recording of exactly the failures you need to debug,
without paying the recording cost on every pass. And `retries: 2` is a pragmatic concession, not a
fix: it stops one flake blocking a merge, and it also **hides** flake, so a retried test should still
be reported and chased.

## When to Use It

| Situation | Test at | Why |
| --------- | ------- | --- |
| Login, checkout, signup, payment | End-to-end | Failure costs money; a few slow tests are worth it |
| A security header, cookie flag or redirect | End-to-end | Nothing below this layer has a real server |
| Anything that must work in Safari | End-to-end, WebKit project | The only place a real WebKit engine runs |
| Sticky positioning, scroll, `IntersectionObserver` | Browser mode, or E2E | jsdom computes no geometry |
| A long form flow with validation | Integration | Length is not a reason; it fakes only the network |
| One component's visible behaviour | Testing Library in jsdom | 10 ms against seconds |
| "Does the page look right" | Visual regression — [Chapter ?? — Visual and Contract Testing](#ch-visual-and-contract-testing) | You cannot assert your way to an appearance |

## Common Mistakes

❌ **`page.waitForTimeout()` as a real wait.** Too short under load, wasted otherwise.
✅ Wait on a condition — a web-first assertion, `waitForURL`, or `waitForResponse`.

❌ **Testing against the dev server.** You then never exercise the build output, which is one of the
few things only this layer can check.
✅ Point `webServer` at the production build.

❌ **Depending on a live third-party API.** Their outage becomes your red pipeline.
✅ `page.route` the external call; keep your own backend real.

❌ **Tests that depend on each other's data.** They pass in order and fail in parallel, which is the
default.
✅ Each test creates what it needs, ideally through the API rather than the UI.

❌ **Turning integration tests into E2E tests because they feel more thorough.** A forty-minute suite
gets skipped, and then there is no coverage at all.
✅ Keep the count small and defend it; push everything else down a layer.

## 🔑 Key Takeaways

- End-to-end is the only layer with a real build, a real browser engine and a real server — that is its whole value.
- The component-versus-E2E boundary is about what is real, not how long the flow is; jsdom's missing layout engine is the usual trigger.
- Playwright drives the browser from outside the page, which is why multi-tab, cross-origin and WebKit are not special cases.
- Locators re-query and auto-wait, so every fixed sleep in a suite is a bug.
- Reuse a stored login state, and test the login flow itself in exactly one test that does not.

## Interview Questions

**Q: How do you decide what deserves an end-to-end test?**

By what only this layer can prove. Anything involving the real build, real cookies and headers, real
routing, or a real API contract has to be end-to-end because every other layer fakes the server. Then
narrow by consequence: the journeys whose failure loses money or locks users out. That is usually three
to ten tests, and keeping the number small is what keeps them trusted.

**Q: A component test needs to check that a sticky header stays visible on scroll. Where does it go?**

Not in jsdom, because jsdom computes no layout — element geometry, scroll position and visibility are
all simulated. That needs a real browser engine, which means Vitest's browser mode for a single
component or Playwright for the page. This is the concrete version of the component-versus-E2E
boundary: it is decided by whether the test needs real rendering, not by how big the test feels.

**Q: Playwright or Cypress?**

Playwright by default, mainly for WebKit coverage and because it drives the browser out of process —
which makes multiple tabs, cross-origin navigation and iframes ordinary rather than special cases, and
gives real parallelism without paid orchestration. Cypress still has the better interactive debugger,
so a team testing one Chromium origin that values that most has a defensible reason to stay.

**Q: Your E2E suite fails about once a week for no clear reason. How do you approach it?**

Get the trace first — with `trace: "on-first-retry"` there is a per-step DOM recording of the actual
failure, so it stops being guesswork. Then check the usual four: a fixed timeout somewhere, a live
third-party dependency, shared state between tests that only bites in parallel, and a test asserting
on something that is genuinely racy. Retries keep the pipeline moving but hide the count, so report
retried tests rather than treating a green run as clean.

## What to Read Next

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — the layer most candidate E2E tests belong in
- [Chapter ?? — Visual and Contract Testing](#ch-visual-and-contract-testing) — appearance and API drift, which assertions cannot cover
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — running axe in the browser this chapter already has open
