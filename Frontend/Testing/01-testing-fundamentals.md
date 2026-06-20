# Testing Fundamentals

## Overview

Testing proves your code does what you think it does. It catches bugs early, documents behavior, and lets you change code without fear. This file covers the core ideas every test type builds on.

## Table of Contents

- [Why Testing Matters](#why-testing-matters)
- [The Types of Testing](#the-types-of-testing)
- [Testing Pyramid vs Testing Trophy](#testing-pyramid-vs-testing-trophy)
- [The AAA Pattern](#the-aaa-pattern)
- [Test Doubles: Mock, Stub, Spy, Fake](#test-doubles-mock-stub-spy-fake)
- [Test Coverage](#test-coverage)
- [Black-Box vs White-Box](#black-box-vs-white-box)
- [Interview Questions](#interview-questions)

## Why Testing Matters

Bugs get more expensive the later you find them.

| Found during | Rough cost |
| ------------ | ---------- |
| Coding       | $          |
| Code review  | $$         |
| QA           | $$$        |
| Production    | $$$$$      |

**Tests give you:**

- ✅ **Confidence** — refactor and ship without fear
- ✅ **Living docs** — tests show how code is meant to be used
- ✅ **Better design** — code that is hard to test is usually badly designed

## The Types of Testing

There are many test types. You won't write all of them, but a senior engineer should know what each one is for.

### 💡 **Functional Levels** (test what the code does)

| Type            | Scope                          | Speed   | Example |
| --------------- | ------------------------------ | ------- | ------- |
| **Unit**        | One function or component       | ⚡ ms   | `formatPrice(100)` returns `"$100.00"` |
| **Component**   | One UI component with the DOM   | ⚡ ms   | Button shows a spinner while loading |
| **Integration** | Several units working together  | 🏃 sec  | Form validates, calls API, shows result |
| **E2E**         | The whole app in a real browser | 🐌 min  | User logs in, buys an item, sees receipt |

### 💡 **Specialized Types** (test a specific quality)

| Type                   | What it checks                                  |
| ---------------------- | ----------------------------------------------- |
| **Snapshot**           | Output has not changed unexpectedly             |
| **Visual regression**  | The rendered UI looks the same (pixel compare)  |
| **Accessibility (a11y)** | App works for screen readers and keyboards    |
| **Performance**        | Load time, bundle size, Core Web Vitals         |
| **Smoke**              | Critical paths still run after a deploy          |
| **Regression**         | A fixed bug stays fixed                          |
| **Contract**           | Frontend and API agree on the data shape         |
| **Mutation**           | Your tests actually catch broken code            |
| **Security**           | No injection, XSS, or auth holes                 |

> **Specialized types** are covered in [07-specialized-testing.md](./07-specialized-testing.md). The functional levels are the main focus of this guide.

**How to choose:**

```
Is it pure logic / a calculation?        → Unit test
Is it one component's behavior?          → Component test
Do several parts work together?          → Integration test
Is it a critical full user journey?      → E2E test
```

## Testing Pyramid vs Testing Trophy

Both balance test types. They just disagree on the mix.

### The Pyramid

```
        /\
       /E2E\        few   (slow, brittle)
      /------\
     / Integr \     some
    /----------\
   /    Unit    \    many  (fast, cheap)
  /--------------\
```

Many fast unit tests, few slow E2E tests. Best for **logic-heavy** apps (pricing engines, data pipelines).

### The Trophy (Kent C. Dodds)

```
   [   E2E   ]        ~10%
   [Integration]      ~50%  ⭐ most value
   [   Unit   ]       ~30%
   [  Static  ]       ~10%  (TypeScript, ESLint)
```

Integration tests get the most weight. Best for **UI-heavy** frontend apps where user interaction matters most.

> "Write tests. Not too many. Mostly integration." — Kent C. Dodds

**Key insight:** Integration tests hit the sweet spot — close to how users behave, but still fast.

## The AAA Pattern

Structure every test in three steps: **Arrange, Act, Assert.**

```typescript
import { describe, it, expect } from "vitest";

interface CartItem {
  name: string;
  price: number;
}

function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

describe("cartTotal", () => {
  it("sums the price of all items", () => {
    // Arrange — set up the data
    const items: CartItem[] = [
      { name: "Book", price: 20 },
      { name: "Pen", price: 5 },
    ];

    // Act — run the code under test
    const total: number = cartTotal(items);

    // Assert — check the result
    expect(total).toBe(25);
  });
});
```

The same idea in BDD wording is **Given / When / Then**.

## Test Doubles: Mock, Stub, Spy, Fake

A **test double** stands in for a real dependency. The names overlap a lot, but interviews expect this distinction:

| Double   | Purpose                                   | Verifies calls? |
| -------- | ----------------------------------------- | --------------- |
| **Stub** | Returns canned data so the test can run    | ❌ No           |
| **Spy**  | Wraps a real function and records calls    | ✅ Yes          |
| **Mock** | Fake with pre-set expectations on calls    | ✅ Yes          |
| **Fake** | Working but simplified version (in-memory DB) | ❌ No        |

```typescript
import { vi, expect } from "vitest";

// Stub — just supply a value
const getUser = vi.fn().mockResolvedValue({ id: 1, name: "Ada" });

// Spy — watch a real method without replacing it
const spy = vi.spyOn(console, "log");
console.log("hi");
expect(spy).toHaveBeenCalledWith("hi");

// Mock — assert how it was called
const save = vi.fn();
save({ id: 1 });
expect(save).toHaveBeenCalledWith({ id: 1 });
```

**Rule of thumb:** mock external dependencies (APIs, payment gateways), not the code you are testing.

## Test Coverage

Coverage measures how much code your tests run.

| Metric        | Meaning                          |
| ------------- | -------------------------------- |
| **Statement** | % of statements executed         |
| **Branch**    | % of `if`/`else` paths taken     |
| **Function**  | % of functions called            |
| **Line**      | % of lines executed              |

**Branch coverage is the one that matters most** — it catches untested paths.

```typescript
function getDiscount(age: number): number {
  if (age < 18) return 0.1; // branch 1
  return 0.05; // branch 2
}

// Tests only the adult path → 50% branch coverage
it("gives adults 5% off", () => {
  expect(getDiscount(25)).toBe(0.05);
});
```

⚠️ **100% coverage does not mean bug-free.** This passes with full line coverage but ignores `b = 0`:

```typescript
function divide(a: number, b: number): number {
  return a / b; // divide(10, 0) returns Infinity, never tested
}
```

> Aim for ~80% with **meaningful** tests. Chasing 100% leads to useless tests of trivial code.

## Black-Box vs White-Box

| | Black-box | White-box |
| ------------- | --------------------- | ---------------------- |
| **Knowledge** | No internal code       | Full internal code      |
| **Tests**     | Behavior / output      | Code paths and branches |
| **Breaks on refactor?** | Rarely       | Often                   |
| **Example**   | E2E, component tests   | Unit tests of algorithms |

> Prefer black-box where you can — it survives refactoring. React Testing Library is built on this idea.

## Interview Questions

**Q1: Difference between unit, integration, and E2E tests?**

Unit tests one function in isolation (fast, low confidence). Integration tests several units together (medium speed, good confidence). E2E tests the full app in a real browser (slow, highest confidence). Use unit for logic, integration for behavior, E2E for critical paths.

**Q2: Pyramid vs trophy?**

Pyramid favors many unit tests; good for logic-heavy backends. Trophy favors integration tests; good for UI-heavy frontends because they best match real user behavior while staying fast.

**Q3: What coverage should you aim for?**

Around 80% with meaningful tests. Coverage finds untested code; it does not prove correctness. Branch coverage matters more than line coverage. 100% often means testing trivial code for no value.

**Q4: Mock vs stub vs spy?**

A stub returns canned data. A spy records calls to a real function. A mock is a fake with expectations you assert on. Use mocks to verify interactions, stubs to control inputs, spies to observe without changing behavior.

**Q5: What makes a test flaky and how do you fix it?**

Flaky tests pass and fail randomly. Common causes: arbitrary timeouts, shared state between tests, real network calls, and random data. Fix with proper async waits, isolated state, mocked network, and seeded randomness. See [08-best-practices.md](./08-best-practices.md).

---

**Next:** [Vitest Basics →](./02-vitest-basics.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
