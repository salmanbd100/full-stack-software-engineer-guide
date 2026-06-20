# Testing Best Practices

## Overview

Good tests give confidence without becoming a maintenance burden. The difference between a junior and senior test suite is not more tests — it is tests that are isolated, readable, behavior-focused, and reliable. This file covers the practices that keep a suite valuable as the codebase grows.

## Table of Contents

- [Test Organization](#test-organization)
- [Naming](#naming)
- [Test Isolation](#test-isolation)
- [Test Behavior, Not Implementation](#test-behavior-not-implementation)
- [Avoiding Flaky Tests](#avoiding-flaky-tests)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Coverage Done Right](#coverage-done-right)
- [Interview Questions](#interview-questions)

## Test Organization

Co-locate tests with the code they cover. It keeps related files together and makes imports short.

```
src/
├── components/
│   └── LoginForm/
│       ├── LoginForm.tsx
│       └── LoginForm.test.tsx   ← right next to the component
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
└── utils/
    ├── formatters.ts
    └── formatters.test.ts
```

Group related cases with `describe`, but keep nesting **shallow** (one or two levels):

```typescript
describe("ShoppingCart", () => {
  describe("adding items", () => {
    it("adds an item to an empty cart", () => {});
    it("merges duplicates by increasing quantity", () => {});
  });
});
```

## Naming

A test name should describe **behavior** — what, under which condition, with what result.

```typescript
// ✅ Good — reads like a spec
it("shows an error when the email is invalid", () => {});
it("disables the submit button while the request is in flight", () => {});

// ❌ Bad — vague or implementation-focused
it("works", () => {});
it("calls useState", () => {});
```

> A failing test's name should tell you what broke without reading the code.

## Test Isolation

Each test must pass **on its own and in any order**. Shared mutable state is the top cause of mystery failures.

```typescript
// ❌ Bad — tests share and mutate one object
let user = { name: "Ada" };

// ✅ Good — a factory gives each test fresh data
function makeUser(overrides: Partial<User> = {}): User {
  return { name: "Ada", age: 30, ...overrides };
}

afterEach(() => {
  vi.clearAllMocks(); // reset mock call history between tests
});
```

## Test Behavior, Not Implementation

Tie tests to what the user observes, not internal details. Implementation tests break on every refactor and prove nothing about correctness.

```typescript
// ❌ Bad — couples the test to internal state
const { result } = renderHook(() => useState(0));
expect(result.current[0]).toBe(0);

// ✅ Good — asserts what the user sees
render(<Counter />);
expect(screen.getByText("Count: 0")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /increment/i }));
expect(screen.getByText("Count: 1")).toBeInTheDocument();
```

## Avoiding Flaky Tests

A flaky test passes and fails without code changes. It destroys trust in the suite. The four common causes and their fixes:

| Cause              | ❌ Flaky                          | ✅ Fix                              |
| ------------------ | --------------------------------- | ----------------------------------- |
| **Timing**         | `setTimeout` then assert          | `await screen.findBy...` / `waitFor` |
| **Shared state**   | module-level mutable variable     | fresh data per test (factory)        |
| **Real network**   | calling a live API                | MSW or mocked responses              |
| **Randomness**     | `Math.random()` / `Date.now()`    | seed it / `vi.setSystemTime()`       |

```typescript
// ❌ Flaky — arbitrary wait, may be too short on slow CI
setTimeout(() => expect(screen.getByText("Done")).toBeInTheDocument(), 1000);

// ✅ Reliable — waits exactly as long as needed
expect(await screen.findByText("Done")).toBeInTheDocument();
```

## Anti-Patterns to Avoid

**❌ Testing too much in one test** — split into focused cases so a failure points to one cause.

**❌ Over-mocking** — mocking your own utils and components turns an integration test into a meaningless one. Mock only external boundaries (APIs, time).

**❌ Brittle selectors** — `container.querySelector("div > button")` breaks on any markup change. Use roles and labels.

**❌ Testing trivia** — asserting a constant equals its value or that a component "renders without crashing" adds noise, not confidence.

**❌ Ignoring async** — forgetting `await` lets a test pass before the assertion runs. Always await user events and `findBy` queries.

## Coverage Done Right

- ✅ Use coverage to **find untested paths**, not as a target to game
- ✅ Aim for ~80% with meaningful assertions; require higher on critical logic
- ✅ Prioritize **branch coverage** — it reveals untested conditions
- ❌ Don't write tests purely to raise the number
- ✨ For a real quality signal, add **mutation testing** (see [07-specialized-testing.md](./07-specialized-testing.md#mutation-testing))

> 80% coverage with strong tests beats 100% with brittle, implementation-focused ones.

## Interview Questions

**Q1: What makes a test maintainable?**

It is isolated (no shared state, runs in any order), tests behavior not implementation, uses clear behavior-describing names, and mocks only external boundaries. Such tests survive refactors and fail only when real behavior breaks, so the team trusts and keeps them.

**Q2: How do you debug and fix a flaky test?**

Identify the cause: timing, shared state, real network, or randomness. Replace arbitrary waits with `findBy`/`waitFor`, give each test fresh data, mock the network with MSW, and seed time/randomness. If a test stays flaky, it is worse than no test — quarantine and fix it.

**Q3: Why is testing implementation details bad?**

It couples tests to *how* code works, not *what* it does. Any refactor — even one that keeps behavior identical — breaks the tests, creating busywork and eroding trust. Behavior-focused tests only fail when something users care about actually breaks.

**Q4: How much should you mock?**

Mock external dependencies you don't control — APIs, payment gateways, time, randomness. Keep everything you own real: components, hooks, reducers, utilities. Over-mocking produces tests that pass while the real integration is broken.

**Q5: Is 100% coverage a good goal?**

No. Coverage shows which lines ran, not whether bugs would be caught. The last 20% usually means testing trivial code, and high coverage with weak assertions gives false confidence. Aim for ~80% meaningful tests and use mutation testing to measure real quality.

---

**Previous:** [← Specialized Testing](./07-specialized-testing.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
