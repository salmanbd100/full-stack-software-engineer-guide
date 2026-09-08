---
title: Test-Driven Development
part: 4
chapter: 0
slug: test-driven-development
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-07
tags: [tdd, bdd, testing, workflow, refactoring]
in_book: true
---

# Test-Driven Development {#ch-test-driven-development}

> Say where writing the test first genuinely pays, and defend not doing it everywhere else.

**In this chapter:** the cycle and what each step is for · a worked example · the case it is unambiguously right for · where it gets in the way · what BDD adds

## 💡 The Core Idea

Test-driven development is not a testing technique. It is a **design** technique whose output happens
to include tests.

The mechanism is that writing the test first forces you to name the interface before you have written
anything behind it. You have to decide what the function is called, what it takes, and what it returns
while the cost of changing your mind is zero. Code written the other way round tends to expose whatever
shape the implementation happened to take, which is why "this is hard to test" so often turns out to
mean "this has the wrong interface".

That framing also explains the honest limitation. When you already know the interface — a bug fix, a
well-specified calculation — the technique pays immediately. When the interface is the thing you are
still discovering, writing tests first means writing tests for a design you are about to throw away.

## How It Works

### Three steps, three different jobs

```text
Red — a failing test that proves the behaviour is missing
    ↓
Green — the least code that makes it pass
    ↓
Refactor — improve the code with the test holding it still
```

| Step | The job | The discipline |
| ---- | ------- | -------------- |
| **Red** | Specify the next behaviour, and prove it is absent | Watch it fail. A test that passes before the code exists is testing nothing |
| **Green** | Make it pass by any means | Resist designing here. Ugly is allowed; the next step is where design happens |
| **Refactor** | Improve structure with behaviour pinned | No new behaviour. If you need a new test, you are back at red |

The step people skip is watching the test fail. A test written after the fact, or one with a typo in
the query, passes for the wrong reason — and you will not find out for months.

### A worked cycle

```typescript
import { describe, it, expect } from "vitest";

// RED — validateEmail does not exist yet, so this cannot compile, let alone pass.
describe("validateEmail", () => {
  it("rejects a string with no @", () => {
    expect(validateEmail("invalid")).toBe(false);
  });
});
```

```typescript
// GREEN — the least thing that satisfies the test. Deliberately naive.
export function validateEmail(email: string): boolean {
  return email.includes("@");
}
```

```typescript
// RED again — a new case the current implementation gets wrong.
it("rejects a domain with no dot", () => {
  expect(validateEmail("ada@example")).toBe(false);
});
```

```typescript
// GREEN, then REFACTOR — the regex is driven by the failing cases, not guessed up front.
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

Notice what the cycle produced: a regex justified case by case rather than pasted in and hoped for.
Each character in it corresponds to a test that failed without it, which is a much better position to
be in during review.

### The one case where it is not a matter of taste

**A bug fix always starts with a failing test.** This is the least controversial claim in the whole
subject, and it holds even for people who never otherwise write tests first.

```typescript
// The reported bug: a cart with a 100% discount charged the full amount.
it("charges nothing when the discount covers the total", () => {
  expect(cartTotal([{ price: 20, qty: 1 }], { percentOff: 100 })).toBe(0);
});
```

Three things happen in order. The test fails, which proves you have actually reproduced the bug rather
than guessed at it. It then passes, which proves the fix addresses that bug and not something adjacent.
And it stays in the suite, so the bug cannot come back silently — which matters because a bug that
happened once is evidence the code invites it.

### Driving a component

The cycle works on a component, and it produces better markup, because you write the query before the
element exists and the accessible name is therefore not an afterthought.

```tsx
// RED — describe what a user does and sees, before <Counter/> exists.
it("increments the count when the button is clicked", async () => {
  const user = userEvent.setup();
  render(<Counter />);

  expect(screen.getByText("Count: 0")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /increment/i }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

The `getByRole("button", { name: /increment/i })` written first is the useful part: it commits you to a
button with an accessible name, so the component cannot be built with a `div` and an `onClick`. See
[Chapter ?? — React Testing Library](#ch-react-testing-library) for why that query shape is the one to
reach for.

### What BDD adds, and what it does not

Behaviour-driven development is the same cycle with the naming pushed towards the language of the
domain — Given, When, Then instead of Arrange, Act, Assert.

```tsx
it("shows the dashboard after a successful login", async () => {
  render(<LoginPage />); // Given a user on the login page
  await user.type(screen.getByLabelText(/email/i), "user@example.com");
  await user.click(screen.getByRole("button", { name: /log in/i })); // When they submit
  expect(await screen.findByRole("heading", { name: /welcome/i })).toBeInTheDocument(); // Then
});
```

The structure is identical. What changes is that the test name is readable by someone who does not
write code, which is worth real money when acceptance criteria are contested — and worth nothing when
they are not. Treat it as a naming convention, not a different methodology.

## When to Use It

| Situation | Verdict |
| --------- | ------- |
| A bug fix | ✅ Always. The failing test is what proves the reproduction |
| A calculation, parser or reducer with known rules | ✅ The cases are the specification |
| A well-specified API or contract | ✅ The interface is already agreed, so writing it first costs nothing |
| Refactoring existing code | ✅ Write tests against current behaviour first, then change the code |
| A UI whose design is still being explored | ❌ You would be specifying a layout nobody has agreed |
| A spike or proof of concept | ❌ Tests for code you intend to delete |
| Requirements changing week to week | ⚠️ Test the stable core; leave the churn until it settles |

**The pragmatic position, and it is defensible in an interview:** test-first for logic and bug fixes,
test-immediately-after for exploratory UI. The goal is confidence, not compliance with a ritual.

## Common Mistakes

❌ **Not watching the test fail.** A test that passes before the implementation exists is asserting
something else, or nothing.
✅ Run it red first, every time. It takes two seconds and validates the test.

❌ **Designing during green.** Building the elegant version to satisfy the first test skips the step
where the tests give you room to be wrong.
✅ Make it pass crudely, then refactor under a green suite.

❌ **Adding behaviour during refactor.** The suite is no longer holding anything still, and you have
lost the safety the cycle provides.
✅ New behaviour means a new failing test first.

❌ **Test-first on exploratory UI.** You specify a design that changes tomorrow and write tests twice.
✅ Build, let it settle, then add tests to the parts that survived.

❌ **Presenting TDD as a coverage strategy.** Coverage is a by-product; the value is in the interface
you were forced to name.
✅ Argue it as design, which is also the honest answer to "does it slow you down".

## 🔑 Key Takeaways

- TDD is a design technique: writing the test first forces you to name the interface before anything depends on it.
- Watching the test fail is the step that validates the test, and the one most often skipped.
- Green means "make it pass"; all design belongs in refactor, under a green suite.
- A bug fix always starts with a failing test — that is what proves the reproduction and prevents the regression.
- Test-first pays when the interface is known and costs when the interface is what you are discovering.

## Interview Questions

**Q: Walk me through the cycle, and say what each step is actually for.**

Red specifies the next behaviour and proves it is missing — you have to watch it fail, or the test may
be passing for a reason unrelated to the code. Green makes it pass by the crudest means available,
deliberately, so that design decisions happen with tests already in place. Refactor improves the
structure with behaviour pinned by the suite, and adds nothing new. The moment you want new behaviour
you are back at red.

**Q: Does TDD slow you down?**

In the first hour of a feature, yes. Over the life of the code it depends on whether the interface was
knowable up front. For a calculation or a bug fix it is faster almost immediately, because the cases
are the specification and you never debug by hand. For UI whose design is unsettled it is genuinely
slower, because you write tests for a shape that changes — which is why the reasonable position is
test-first for logic and test-soon-after for exploratory work.

**Q: When would you refuse to use it?**

During a spike, or on UI still being explored. Both mean writing tests for code you expect to throw
away, and a test suite pinned to a design nobody has agreed makes changing that design more expensive
rather than less. The one thing I would not skip is a failing test for a bug fix, regardless of how
the rest of the code was written.

**Q: What does BDD change?**

Mostly the naming — Given/When/Then instead of Arrange/Act/Assert, so test names read as behaviour a
non-engineer can check. That is valuable when acceptance criteria are genuinely contested between
product and engineering, and it is ceremony when they are not. Structurally it is the same cycle, so I
would not present it as a different approach.

## What to Read Next

- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — which layer the tests this cycle produces belong at
- [Chapter ?? — Vitest](#ch-vitest) — the runner and the watch mode that make a fast cycle possible
- [Chapter ?? — React Testing Library](#ch-react-testing-library) — the query API that makes component-level TDD improve the markup
