# End-to-End (E2E) Testing

## Overview

E2E tests drive a **real browser** through a complete user journey — login, checkout, signup — hitting the real frontend and (usually) a real backend. They give the highest confidence but are slow and brittle, so you write few of them and reserve them for critical paths. **Playwright** is the modern default; Cypress is the main alternative.

## Table of Contents

- [When to Use E2E](#when-to-use-e2e)
- [Playwright vs Cypress](#playwright-vs-cypress)
- [Writing a User Flow](#writing-a-user-flow)
- [Selectors](#selectors)
- [Page Object Model](#page-object-model)
- [Auth State and Mocking](#auth-state-and-mocking)
- [Config and CI](#config-and-ci)
- [Avoiding Flaky Tests](#avoiding-flaky-tests)
- [Interview Questions](#interview-questions)

## When to Use E2E

| ✅ Use E2E for                        | ❌ Don't use E2E for             |
| ------------------------------------- | -------------------------------- |
| Login / signup / auth flows           | Pure logic (use unit tests)      |
| Checkout and payment                  | Form field validation (integration) |
| Multi-step onboarding                 | Every edge case (too slow)       |
| Smoke tests after deploy              | Component styling (visual tests) |

> Rule: if a bug in this flow would lose money or block users, it deserves an E2E test. Otherwise push it down the pyramid.

## Playwright vs Cypress

| Feature       | Playwright                          | Cypress                       |
| ------------- | ----------------------------------- | ----------------------------- |
| **Browsers**  | Chromium, Firefox, WebKit (Safari)  | Chromium-based, Firefox       |
| **Languages** | TS/JS, Python, Java, .NET           | TS/JS only                    |
| **Multi-tab / iframe** | Native                     | Limited                       |
| **Speed**     | Faster, parallel by default         | Slightly slower               |
| **Debugging** | Trace viewer, inspector             | Time-travel UI (great DX)     |

> Pick **Playwright** for cross-browser coverage and speed. Pick **Cypress** if your team values its interactive debugger most.

## Writing a User Flow

```typescript
import { test, expect } from "@playwright/test";

test("user can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});
```

Playwright **auto-waits** for elements to be actionable before clicking or filling — no manual sleeps needed.

## Selectors

Use stable, user-facing selectors. Same priority idea as RTL.

```typescript
// ✅ Best — roles and labels (accessible + stable)
await page.getByRole("button", { name: "Submit" }).click();
await page.getByLabel("Email").fill("a@b.com");
await page.getByText("Welcome back").click();

// ✅ Good — test IDs for non-semantic elements
await page.getByTestId("cart-icon").click();

// ❌ Avoid — CSS classes and nth-child break on refactor
await page.locator("div > div > button:nth-child(3)").click();
```

## Page Object Model

POM wraps a page's selectors and actions in a class. Tests read as behavior; selectors live in one place.

```typescript
// pages/LoginPage.ts
import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Log in" }).click();
  }
}

// login.spec.ts
test("user can log in", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("user@example.com", "password123");
  await expect(page).toHaveURL(/.*dashboard/);
});
```

## Auth State and Mocking

**Reuse a logged-in session** instead of logging in before every test:

```typescript
// auth.setup.ts — runs once, saves cookies + localStorage
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: "auth.json" });
});

// In tests: reuse the saved state — no repeated logins
test.use({ storageState: "auth.json" });
```

**Mock a flaky external API** with `page.route`:

```typescript
await page.route("**/api/external", (route) =>
  route.fulfill({ status: 200, body: JSON.stringify({ data: "mock" }) })
);
```

## Config and CI

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // retry flaky tests on CI
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry", // record a debuggable trace
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

In CI: `npx playwright install --with-deps` then `npx playwright test`. Upload the HTML report and traces on failure.

## Avoiding Flaky Tests

- ✅ Rely on **auto-wait** and web-first assertions (`await expect(locator).toBeVisible()`)
- ✅ Wait for **conditions**, not time: `waitForURL`, `waitForResponse`
- ✅ **Mock external services** so tests don't depend on third parties
- ✅ Keep tests **independent** — reset state in `beforeEach`
- ❌ Never use `page.waitForTimeout(2000)` as a real wait

## Interview Questions

**Q1: When is an E2E test worth the cost?**

When the flow is critical and crosses many systems — auth, checkout, payment. E2E gives the highest confidence but is slow and flaky, so you keep the count low (top of the pyramid). Push validation and edge cases down to integration and unit tests.

**Q2: Playwright or Cypress?**

Playwright supports all three browser engines (including WebKit/Safari), multiple languages, native multi-tab/iframe, and runs parallel by default — better for broad coverage and speed. Cypress has a beloved time-travel debugger and simpler onboarding. Choose based on browser needs and team preference.

**Q3: What is the Page Object Model and why use it?**

POM puts a page's selectors and actions behind a class. Tests describe behavior (`loginPage.login(...)`) while selectors live in one file. When the UI changes you update one place, not every test — it keeps a large suite maintainable (DRY).

**Q4: How do you keep E2E tests fast and reliable?**

Reuse auth via saved `storageState`, run tests in parallel, mock unreliable external APIs, rely on auto-wait instead of fixed sleeps, and enable retries plus traces on CI. Independent tests with reset state prevent order-dependent flakiness.

---

**Next:** [Test-Driven Development →](./06-test-driven-development.md)

**Previous:** [← Integration Testing](./04-integration-testing.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
