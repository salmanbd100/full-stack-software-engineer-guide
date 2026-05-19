# Testing Best Practices

A cheat sheet of practices that distinguish junior-level tests from senior-level ones.

---

## Naming Tests

A test name should read like a sentence describing the behavior.

**❌ Vague:**

```typescript
test("works", () => { /* ... */ });
test("validates input", () => { /* ... */ });
test("test 1", () => { /* ... */ });
```

**✅ Descriptive:**

```typescript
test("returns 401 when token is expired", () => { /* ... */ });
test("rejects orders below minimum subtotal", () => { /* ... */ });
test("retries up to 3 times on network error", () => { /* ... */ });
```

> Read the test name out loud. If it doesn't tell you what's being tested, rename it.

---

## Test Organization

Group by **behavior**, not by method name.

**❌ Grouped by method:**

```typescript
describe("UserService.createUser", () => { /* ... */ });
describe("UserService.updateUser", () => { /* ... */ });
```

**✅ Grouped by behavior:**

```typescript
describe("when a new user signs up", () => {
  test("creates a user record", () => { /* ... */ });
  test("sends a welcome email", () => { /* ... */ });
  test("rejects duplicate emails", () => { /* ... */ });
});
```

---

## One Assertion Concept Per Test

Multiple `expect` calls are fine **if they describe the same behavior**.

**✅ All assertions describe one behavior:**

```typescript
test("creates an order in pending state", () => {
  const order = createOrder(items);
  expect(order.status).toBe("pending");
  expect(order.id).toBeDefined();
  expect(order.createdAt).toBeInstanceOf(Date);
});
```

**❌ Two separate behaviors crammed in one test:**

```typescript
test("creates order and sends email", () => {
  const order = createOrder(items);
  expect(order.status).toBe("pending");
  expect(emailService.send).toHaveBeenCalled();  // separate test
});
```

---

## Test Data Factories

Avoid sprinkling literal user objects across tests.

```typescript
// factories/user.ts
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-" + Math.random().toString(36).slice(2),
    email: `test-${Date.now()}@example.com`,
    name: "Test User",
    tier: "free",
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// in tests
const proUser = makeUser({ tier: "pro" });
```

When the `User` shape changes, you update one factory instead of 50 tests.

---

## Avoid Logic in Tests

If a test has loops, conditionals, or computed expected values, the test itself can have bugs.

**❌ Has logic:**

```typescript
test("doubles every number", () => {
  const input = [1, 2, 3];
  const expected = input.map((n) => n * 2);  // duplicates the implementation
  expect(double(input)).toEqual(expected);
});
```

**✅ Concrete values:**

```typescript
test("doubles every number", () => {
  expect(double([1, 2, 3])).toEqual([2, 4, 6]);
});
```

Tests should be **dumb and obvious**.

---

## The Test Pyramid

```
        E2E          ← Few (5–15)
      Integration    ← Some (50–200)
        Unit         ← Many (hundreds–thousands)
```

| Tier        | Speed | Scope               | Run when             |
| ----------- | ----- | ------------------- | -------------------- |
| Unit        | ms    | One function        | Every save           |
| Integration | s     | App + DB + HTTP     | Every PR             |
| E2E         | 10s+  | Full system         | Pre-deploy, nightly  |

**Inverted pyramid (anti-pattern)**: lots of slow E2E tests, few unit tests. Symptoms: 30-minute CI runs, frequent flakes, fear of refactoring.

---

## CI Strategy

Run tests in this order, fail fast:

```yaml
- lint              # < 10s
- typecheck         # < 30s
- unit              # < 1 min
- integration       # 1–5 min
- e2e               # 5–15 min (pre-deploy only)
```

Run unit + integration on **every PR**. Reserve E2E for nightly or pre-release.

---

## Coverage — A Floor, Not a Goal

```bash
jest --coverage --collectCoverageFrom='src/**/*.ts'
```

Coverage tells you what was *executed*, not what was *verified*. 100% coverage with assertion-free tests proves nothing.

> Aim for ~80% on business logic. Don't gate PRs on `100%`.

Coverage gaps are useful diagnostics:

- 0% in a module → no tests at all (fix this)
- Branch coverage low → missing edge cases
- A `catch` block uncovered → no test for the error path

---

## Speed Tips

| Problem                       | Fix                                          |
| ----------------------------- | -------------------------------------------- |
| Slow DB setup                 | Transaction rollback over truncate           |
| Sequential tests              | Run Jest in parallel (`--maxWorkers`)        |
| Reloading large modules       | Reuse a global setup file                    |
| Slow imports                  | Mock heavyweight modules at the boundary     |
| Whole suite to test one file  | `jest path/to/file.test.ts`                  |

> Dev feedback loop should be under 60 seconds. If it isn't, fix that first.

---

## Flaky Tests

Treat flakes as **bugs**, not noise.

**Common causes:**

| Cause                | Fix                                          |
| -------------------- | -------------------------------------------- |
| Shared state         | Reset between tests                          |
| Time / `Date.now()`  | Inject a clock, use fake timers              |
| Random data          | Seed the generator                           |
| Async race           | Poll for state, don't `setTimeout`           |
| Network / containers | Spin up before the suite, not per test       |
| Test order           | Sort or randomize *and fix what breaks*      |

**❌ Anti-pattern:** retry the test 3 times until it passes. This hides bugs.

**✅ Correct:** find the root cause, fix it once.

---

## Anti-Patterns to Avoid

❌ **Testing implementation details** — breaks on every refactor
❌ **Mocking the unit under test** — tests the mock, not the code
❌ **Snapshot-everything testing** — diffs nobody reads, blind approvals
❌ **Skipped tests left in the suite** — `.skip` rots silently
❌ **One huge `beforeAll`** — couples tests, slow to debug
❌ **Tests that depend on each other** — order-dependent suites
❌ **Real time, real network, real randomness** — flakiness factory

---

## Senior-Level Habits

These are the things interviewers actually probe for:

| Habit                                               | Why it matters                                |
| --------------------------------------------------- | --------------------------------------------- |
| Writes failing test *first* when fixing a bug       | Prevents regressions                          |
| Reaches for dependency injection over `jest.mock`   | Tests stay simple, code stays decoupled       |
| Picks the right tier (unit / integration / E2E)     | Fast feedback, low flake rate                 |
| Treats flakes as P1 bugs                            | Keeps the suite trustworthy                   |
| Knows when *not* to test (throwaway scripts)        | Pragmatic, not dogmatic                       |
| Refactors test code with the same care as prod code | Test code outlives prod code                  |

---

## Interview Q&A

**Q: How do you decide what to test?**
A: Test the **behavior at each tier**. Unit-test pure logic and edge cases. Integration-test the seams between your code and the DB or HTTP layer. E2E-test critical user journeys end-to-end. Don't try to cover everything at every tier.

**Q: A test is flaky in CI. What do you do?**
A: Treat it as a bug. Reproduce locally with the same seed and ordering. Find the source (shared state, time, async race) and fix it. Never paper over with retries.

**Q: How do you balance speed and confidence?**
A: Follow the test pyramid. Run unit + integration on every PR for a sub-5-minute feedback loop. Reserve slow, high-confidence E2E for nightly and pre-deploy.

---

## Best Practices Summary

✅ Behavior-driven names
✅ Group by behavior, not method
✅ Use factories for test data
✅ No logic in tests
✅ Treat flakes as bugs
✅ Pyramid: many unit, some integration, few E2E
✅ Sub-60-second local feedback loop
❌ No implementation-detail tests
❌ No retry loops to hide flakes
❌ No real time / network / randomness

---

[← Previous: Mocking](./05-mocking.md) | [Back to Backend →](../README.md)
