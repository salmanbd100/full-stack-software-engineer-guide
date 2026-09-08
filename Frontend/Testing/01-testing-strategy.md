---
title: Testing Strategy
part: 4
chapter: 0
slug: testing-strategy
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [testing, strategy, pyramid, test-doubles, coverage, flaky-tests]
in_book: true
---

# Testing Strategy {#ch-testing-strategy}

> Decide what to test at which layer, then keep the suite fast and honest enough that people still run it a year later.

**In this chapter:** the four layers and what each costs · pyramid against trophy · test doubles · what coverage does and does not tell you · why suites get abandoned

## 💡 The Core Idea

A test suite is a **budget**, not a virtue. Every test costs runtime on every push and maintenance on
every refactor, and buys back some amount of confidence. Strategy is deciding which tests are worth
their price.

The two ways teams get this wrong are symmetrical. One writes thousands of unit tests that assert on
internals, so every refactor breaks a hundred tests and nothing is learned about whether the product
works. The other writes only end-to-end tests, so the suite takes forty minutes, fails randomly twice
a week, and gets skipped. Both end up with a suite nobody trusts, which is functionally the same as
no suite.

So the useful question is never "are we testing enough". It is **at which layer does this particular
risk get caught most cheaply.**

## How It Works

### Four layers, four price tags

| Layer | Scope | Speed | Catches | Breaks when |
| ----- | ----- | ----- | ------- | ----------- |
| **Static** | Types and lint | Instant | Wrong shapes, missing cases | Rarely — it is the cheapest layer |
| **Unit** | One function | Milliseconds | Logic and edge cases | You change the function's internals |
| **Component/integration** | A flow with a faked network | Under a second | Wiring, state, user-visible behaviour | The user-visible behaviour changes |
| **End-to-end** | The real app in a real browser | Seconds to minutes | Everything the other layers fake | Anything at all — including nothing |

The compiler is the layer people forget to count. A prop contract checked by `tsc` needs no test at
all, and a hundred type-level guarantees cost nothing per push. Reaching for a test to check something
the type system already proves is pure overhead.

**Choosing a layer:**

```text
Pure logic or a calculation?      → unit
Wiring, state, or what a user sees? → component/integration
A journey that loses money if broken? → end-to-end
A data shape or a contract?         → the type checker
```

For the React-specific version of that decision — component against `renderHook` against a real
build — see [Chapter ?? — Testing React](#ch-testing-react), which owns that table.

### Pyramid against trophy

Both shapes say "more of the cheap layers, fewer of the expensive ones". They disagree about where the
middle sits.

| | Pyramid | Trophy |
| --- | ------- | ------ |
| **Weighting** | Mostly unit, some integration, few E2E | Mostly integration, then unit, then static, few E2E |
| **Assumes** | The risk is in the logic | The risk is in the wiring |
| **Fits** | Pricing engines, parsers, data pipelines | UI-heavy products where interaction is the behaviour |

For a frontend the trophy is usually right, and the reason is worth being able to state: in a typical
React application there is not much logic and there is a great deal of wiring. The bugs are in the
loading state that never clears, the form that submits twice, the error path nobody rendered — and all
three are integration-level failures that a unit test of a reducer cannot see.

### Test doubles, and which one you actually want

A **double** stands in for a real dependency. The vocabulary is asked about often and the distinction
that matters is whether the double verifies how it was called.

| Double | Purpose | Verifies calls |
| ------ | ------- | -------------- |
| **Stub** | Returns canned data so the test can proceed | ❌ |
| **Spy** | Wraps a real function and records calls | ✅ |
| **Mock** | A double with expectations you assert on | ✅ |
| **Fake** | A working simplified implementation — an in-memory store | ❌ |

**The rule that prevents most bad tests: double the things you do not own.** The network, the clock,
randomness, a payment gateway. Doubling your own components, hooks and utilities turns an integration
test into a test of the mocks, which passes happily while the real integration is broken.

### Coverage measures execution, not correctness

Coverage tells you which lines ran. It cannot tell you whether an assertion would have caught a bug.

```typescript
function divide(a: number, b: number): number {
  return a / b;
}

it("divides", () => {
  expect(divide(10, 2)).toBe(5); // 100% line coverage
});
// divide(10, 0) returns Infinity and is never tested.
```

Branch coverage is the more useful number, because it names untaken paths rather than unexecuted
lines. Use either as a **finder** — "which error paths has nobody tested?" — and never as a target,
because a coverage target is satisfied most cheaply by testing trivial code.

> ⚠️ A coverage threshold in CI reliably produces tests written to raise the number. If you want a
> quality signal rather than an execution count, mutation testing is the honest one — see
> [Chapter ?? — Visual and Contract Testing](#ch-visual-and-contract-testing).

### The four causes of a flaky test

A flaky test passes and fails without a code change, and it is more damaging than a missing test:
it teaches the team to re-run the pipeline instead of reading the failure.

| Cause | The flaky version | The fix |
| ----- | ----------------- | ------- |
| **Timing** | A fixed `setTimeout` before asserting | `await screen.findBy...`, which waits exactly as long as needed |
| **Shared state** | A module-level object two tests mutate | A factory that returns fresh data per test |
| **Real network** | A live API call | Request interception — see [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) |
| **Randomness** | `Math.random()`, `Date.now()` | Seed it, or freeze the clock with `vi.setSystemTime()` |

```typescript
// ❌ Arbitrary wait — passes locally, fails on a loaded CI runner
setTimeout(() => expect(screen.getByText("Saved")).toBeInTheDocument(), 1000);

// ✅ Waits for the condition, not for the clock
expect(await screen.findByText("Saved")).toBeInTheDocument();
```

Every test must pass on its own and in any order. Isolation is not a nicety — a suite whose tests
depend on execution order cannot be parallelised, which is what makes it slow enough to skip.

## When to Use It

| Situation | Test at | Why |
| --------- | ------- | --- |
| A currency formatter with twelve edge cases | Unit | A hundred cases cost nothing |
| A form that validates, submits and shows an error | Integration | This is where the real bugs are |
| Login, checkout, signup | End-to-end, and only these | Failure costs money; slowness is acceptable for three tests |
| A prop or API response shape | The type checker | Already free on every build |
| A design token or spacing change | Visual regression, not an assertion | You cannot assert your way to "looks right" |
| A bug just reported in production | A failing unit or integration test first | It proves the fix and stops the regression |

## Common Mistakes

❌ **Testing implementation details.** Asserting on internal state or on a hook's return value means
every refactor breaks tests while behaviour is unchanged.
✅ Assert what the user can observe. The test then fails only when something real breaks.

❌ **Over-mocking.** Replacing your own components and utilities produces a test of the doubles.
✅ Double the network, the clock and third parties. Keep everything you own real.

❌ **A coverage threshold as the quality gate.** It is satisfied by testing getters.
✅ Use coverage to find untested branches, and gate on the suite passing instead.

❌ **Tolerating a flaky test.** One flake teaches everyone to re-run the pipeline, which disables the
whole suite as a signal.
✅ Fix it or quarantine it the same day, and treat the flake as a bug with a cause.

❌ **Deep `describe` nesting and vague names.** `it("works")` inside four blocks tells you nothing
when it fails at 2am.
✅ One or two levels, and a name stating condition and expected result.

## 🔑 Key Takeaways

- A test suite is a budget: each layer has a price, and strategy is spending it where risk is cheapest to catch.
- The type checker is a testing layer, and the cheapest one — do not test what it already proves.
- For UI-heavy frontends the trophy shape wins, because the bugs are in wiring rather than logic.
- Double only what you do not own; doubling your own code tests the doubles.
- Coverage measures which lines ran, never whether a bug would be caught.

## Interview Questions

**Q: How do you decide whether something gets a unit test or an integration test?**

By asking where the risk actually is. Pure logic with many edge cases is cheapest to cover as a unit
test, because a hundred cases run in milliseconds. Anything about wiring — state that does not clear,
an error path nobody rendered, a request fired twice — only shows up when the pieces run together, so
it belongs at the integration layer. In a typical React app that is most of the risk, which is why the
integration layer gets the most weight.

**Q: Your suite takes 25 minutes and people are merging without it. What do you do?**

Find out where the time goes first, because the answer is almost always a handful of end-to-end tests
covering things an integration test could catch. Push those down a layer, keep E2E for the journeys
whose failure costs money, and make sure the remainder can run in parallel — which usually means
fixing shared state. Fast and trusted beats thorough and skipped.

**Q: Is 100% coverage worth aiming for?**

No, and not because the last stretch is hard — because coverage counts executed lines rather than
caught bugs. A test with no meaningful assertion raises coverage and catches nothing, and a threshold
in CI reliably produces exactly those tests. Coverage is useful for finding untested error paths;
mutation testing is the metric that actually measures whether tests would catch a defect.

**Q: When would you not write a test?**

When the type checker already proves it, when the assertion would restate the implementation, or when
the thing is genuinely visual — "the spacing looks right" is a visual regression job, not an
assertion. Also for throwaway code with a known short life, where honestly saying so is better than
pretending to a standard nobody will maintain.

## What to Read Next

- [Chapter ?? — Vitest](#ch-vitest) — the runner every example in this section uses
- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — the layer this chapter argues deserves the most weight
- [Chapter ?? — Testing React](#ch-testing-react) — the same layer decision made for React specifically
