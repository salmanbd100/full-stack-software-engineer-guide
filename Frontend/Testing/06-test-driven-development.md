# Test-Driven Development (TDD)

## Overview

TDD means writing the test **before** the code. You write a failing test, write just enough code to pass it, then clean up. The discipline forces clear requirements, testable design, and high coverage as a byproduct. It is a common senior-interview topic — be ready to explain the cycle and when it pays off.

## Table of Contents

- [The Red-Green-Refactor Cycle](#the-red-green-refactor-cycle)
- [A Worked Example](#a-worked-example)
- [TDD with a React Component](#tdd-with-a-react-component)
- [When TDD Helps (and When It Doesn't)](#when-tdd-helps-and-when-it-doesnt)
- [BDD: A Variation](#bdd-a-variation)
- [Interview Questions](#interview-questions)

## The Red-Green-Refactor Cycle

```
  ┌─────────────────────────────────┐
  │                                 │
  ▼                                 │
🔴 RED      Write a failing test     │
  │                                 │
  ▼                                 │
🟢 GREEN    Write minimal code        │
  │         to make it pass          │
  ▼                                 │
🔵 REFACTOR Improve the code,        │
            tests stay green ───────┘
```

| Step         | Goal                                    |
| ------------ | --------------------------------------- |
| 🔴 **Red**   | Prove the feature is missing             |
| 🟢 **Green** | Make it work — quick and dirty is fine   |
| 🔵 **Refactor** | Make it clean — no new behavior       |

> The key insight: you only write code to satisfy a failing test. No test, no code.

## A Worked Example

Building an email validator with TDD:

```typescript
import { describe, it, expect } from "vitest";

// 🔴 RED — write the test first; validateEmail doesn't exist yet
describe("validateEmail", () => {
  it("rejects a string with no @", () => {
    expect(validateEmail("invalid")).toBe(false);
  });

  it("accepts a well-formed email", () => {
    expect(validateEmail("ada@example.com")).toBe(true);
  });
});
```

```typescript
// 🟢 GREEN — simplest code that passes
function validateEmail(email: string): boolean {
  return email.includes("@");
}
```

```typescript
// 🔵 REFACTOR — improve the implementation, tests still pass
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

Now add a test for the new rule (a dot in the domain), watch it drive the regex — the cycle repeats.

## TDD with a React Component

You can drive a component from its tests too. Write what the user should see, then build it.

```typescript
// 🔴 RED — describe the behavior before the component exists
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";

it("increments the count when the button is clicked", async () => {
  const user = userEvent.setup();
  render(<Counter />);

  expect(screen.getByText("Count: 0")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /increment/i }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

```typescript
// 🟢 GREEN — build the minimal component to pass
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

## When TDD Helps (and When It Doesn't)

| ✅ TDD shines for                  | ❌ TDD gets in the way for          |
| ---------------------------------- | ----------------------------------- |
| Well-defined logic and algorithms  | UI/UX exploration and prototyping   |
| Bug fixes (write a failing test first) | Spikes / proof-of-concept work   |
| Pure functions and business rules  | Rapidly changing requirements       |
| API endpoints with clear contracts | Throwaway code                      |

**Pragmatic take:** use TDD for critical logic and bug fixes. For exploratory UI work, write tests right after the code stabilizes. The goal is confidence, not ceremony.

> ✨ **Bug-fix tip:** Always reproduce a bug with a failing test first. It proves the fix works and stops the bug from coming back (a regression test).

## BDD: A Variation

Behavior-Driven Development reframes TDD in **Given / When / Then** language, focusing on behavior over implementation.

```typescript
it("logs the user in with valid credentials", async () => {
  // Given a user on the login page
  render(<LoginPage />);

  // When they submit valid credentials
  await user.type(screen.getByLabelText(/email/i), "user@example.com");
  await user.type(screen.getByLabelText(/password/i), "password123");
  await user.click(screen.getByRole("button", { name: /log in/i }));

  // Then they see the dashboard
  expect(await screen.findByRole("heading", { name: /welcome/i })).toBeInTheDocument();
});
```

It's the same Arrange-Act-Assert structure with business-readable names.

## Interview Questions

**Q1: Walk me through the TDD cycle.**

Red: write a failing test for the next small behavior. Green: write the minimum code to pass it, even if ugly. Refactor: clean up the code while keeping tests green. Repeat in tiny increments. You never write production code without a failing test demanding it.

**Q2: What are the benefits and costs of TDD?**

Benefits: clearer requirements, testable design, high coverage, fearless refactoring, and a safety net. Costs: slower upfront, a learning curve, and poor fit for exploratory or fast-changing work. It trades early speed for long-term maintainability.

**Q3: When would you not use TDD?**

During spikes, prototypes, and UI exploration where the design is still unknown — writing tests first wastes effort on code you'll throw away. There, build first, then add tests once behavior settles.

**Q4: How does TDD relate to bug fixing?**

Write a test that reproduces the bug and fails first. Then fix the code until it passes. This proves your fix actually addresses the bug and leaves a permanent regression test so it can't silently return.

---

**Next:** [Specialized Testing →](./07-specialized-testing.md)

**Previous:** [← E2E Testing](./05-e2e-testing.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
