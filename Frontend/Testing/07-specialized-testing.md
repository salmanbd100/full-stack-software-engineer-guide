# Specialized Testing

## Overview

Beyond unit, integration, and E2E, there are test types that target one specific **quality** of your app — accessibility, visual look, speed, or even the quality of your tests themselves. You rarely write all of these, but a senior engineer should know what each catches and when to reach for it.

## Table of Contents

- [Snapshot Testing](#snapshot-testing)
- [Visual Regression Testing](#visual-regression-testing)
- [Accessibility (a11y) Testing](#accessibility-a11y-testing)
- [Performance Testing](#performance-testing)
- [Contract Testing](#contract-testing)
- [Mutation Testing](#mutation-testing)
- [Smoke and Regression Testing](#smoke-and-regression-testing)
- [Interview Questions](#interview-questions)

## Snapshot Testing

Saves the output of a component or value, then flags any future change. Good for catching **accidental** changes to stable output.

```typescript
import { render } from "@testing-library/react";
import { it, expect } from "vitest";

it("renders the badge markup", () => {
  const { container } = render(<Badge label="New" />);
  expect(container.firstChild).toMatchSnapshot();
});
```

> ⚠️ Snapshots are easy to abuse. Keep them **small**, review every change, and never snapshot whole pages or dynamic data. Covered in depth in [02-vitest-basics.md](./02-vitest-basics.md#snapshot-testing).

## Visual Regression Testing

Snapshot testing checks the **DOM**; visual regression checks the **pixels**. It screenshots the rendered UI and compares against a baseline image, catching CSS bugs a DOM snapshot misses (wrong color, broken layout, overlap).

```typescript
// Playwright has it built in
import { test, expect } from "@playwright/test";

test("homepage looks unchanged", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixels: 100, // tolerate tiny rendering differences
    animations: "disabled", // freeze animations for stable shots
  });
});
```

**Tools:** Playwright (built-in), Percy, Chromatic (pairs with Storybook).

**When to use:** design systems, component libraries, and high-value pages where look matters.

> Disable animations and hide dynamic content (ads, timestamps) or the test will be flaky.

## Accessibility (a11y) Testing

Checks the app works for screen readers and keyboard users. Automated tools catch ~30-50% of issues (missing labels, low contrast, bad ARIA); the rest needs manual testing.

**Automated with `axe`:**

```typescript
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { it, expect } from "vitest";

it("has no accessibility violations", async () => {
  const { container } = render(<SignupForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Built-in checks via RTL:** using `getByRole` and `getByLabelText` already enforces accessible markup — if the test can't find a control by its accessible name, neither can assistive tech.

**Manual checks interviewers expect you to mention:**

- ⌨️ Tab through the whole flow — every control reachable and visible focus
- 🔊 Test with a screen reader (VoiceOver, NVDA)
- 🎨 Check color contrast meets WCAG AA (4.5:1 for text)

## Performance Testing

Measures speed, not correctness. On the frontend this means load time, bundle size, and **Core Web Vitals**.

| Metric  | Measures                        | Good   |
| ------- | ------------------------------- | ------ |
| **LCP** | Largest Contentful Paint (load) | < 2.5s |
| **INP** | Interaction to Next Paint (responsiveness) | < 200ms |
| **CLS** | Cumulative Layout Shift (stability) | < 0.1 |

**Tools:**

- **Lighthouse CI** — runs in CI, fails the build if scores drop
- **WebPageTest** — detailed real-world load analysis
- **Bundle analyzers** — `rollup-plugin-visualizer` to catch bundle bloat
- **`@playwright/test`** — assert timing of real interactions

```typescript
// Fail CI if the bundle or metrics regress (lighthouserc config)
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }]
      }
    }
  }
}
```

## Contract Testing

Verifies the **frontend and backend agree** on the shape of data, without running both together. Each side tests against a shared contract. Catches breaking API changes before they reach production.

- The consumer (frontend) defines what it expects.
- The provider (backend) verifies it returns that shape.
- **Pact** is the common tool.

```typescript
// Lightweight version: validate API responses against a schema (zod)
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

it("API returns the expected user shape", async () => {
  const res = await fetch("/api/users/1");
  const data = await res.json();
  expect(() => UserSchema.parse(data)).not.toThrow();
});
```

> In a microservices org, contract tests prevent one team's API change from silently breaking another team's UI.

## Mutation Testing

Tests your **tests**. It makes small changes ("mutations") to your code — flipping `>` to `>=`, removing a line — and checks if any test fails. A surviving mutation means your tests didn't really cover that logic.

```typescript
// Original
if (age >= 18) return "adult";

// A mutation: >= becomes >
if (age > 18) return "adult";
// If no test fails, your boundary case (age === 18) is untested.
```

**Tool:** Stryker Mutator. The output is a **mutation score** — a far better quality signal than coverage %, because 80% coverage with weak assertions can still let mutations survive.

> Coverage tells you what code ran. Mutation testing tells you whether your tests would *catch a bug* in that code.

## Smoke and Regression Testing

These describe **when** you run tests, not new tooling.

- **Smoke tests** — a tiny set of critical-path checks run right after a deploy ("is the building on fire?"). Usually a handful of E2E tests on login and the core flow.
- **Regression tests** — your full existing suite, run on every change to make sure new code didn't break old behavior. Every bug fix should add one.

## Interview Questions

**Q1: Snapshot vs visual regression testing?**

Snapshot tests compare the serialized DOM/output; they catch structural changes but miss styling. Visual regression tests compare actual screenshots, catching CSS and layout bugs a DOM snapshot can't see. Use snapshots for markup/data, visual regression for look-and-feel.

**Q2: How do you test accessibility?**

Combine automated and manual. Run `axe` in unit/integration tests to catch missing labels, contrast, and ARIA issues. Use RTL's role/label queries to enforce accessible markup. Then manually tab through the app and test with a screen reader — automation only catches 30-50% of issues.

**Q3: What is mutation testing and why is it better than coverage?**

It alters your code (e.g., flips an operator) and checks if a test fails. A surviving mutation means that logic isn't truly tested. Coverage only shows which lines ran; mutation testing shows whether your assertions would actually catch a bug — a much stronger quality signal.

**Q4: What is contract testing and when do you need it?**

It verifies the consumer and provider of an API agree on the data shape, testing each side against a shared contract instead of end-to-end. It's valuable in microservices or separate frontend/backend teams, where it catches breaking API changes early without spinning up the whole system.

**Q5: How do you test frontend performance?**

Track Core Web Vitals (LCP, INP, CLS) with Lighthouse CI, which can fail the build when scores regress. Watch bundle size with an analyzer, and measure real interaction timing in Playwright. Performance budgets in CI stop slow regressions from shipping.

---

**Next:** [Best Practices →](./08-best-practices.md)

**Previous:** [← Test-Driven Development](./06-test-driven-development.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
