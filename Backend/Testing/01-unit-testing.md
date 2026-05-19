# Unit Testing

## 💡 What Is a Unit Test?

A unit test checks one small piece of code — usually a single function or method — in isolation. It does not touch the database, network, file system, or other modules' real behavior. Dependencies are replaced with fakes.

> A unit test should fail for one reason: a bug in the unit under test.

**Why unit tests matter:**

- ✅ Fast — thousands run in seconds
- ✅ Pinpoint failures to one place
- ✅ Encourage small, focused functions
- ❌ Don't catch integration bugs (wrong API contracts, bad SQL, race conditions)

---

## The Test Pyramid

```
        /\
       /E2E\        Few, slow, brittle
      /------\
     / Integ  \     Some, medium speed
    /----------\
   /   Unit     \   Many, fast, isolated
  /--------------\
```

Unit tests form the wide base. Skip this and you end up debugging integration failures that a one-line unit test would have caught.

---

## AAA Pattern

Every test follows three steps:

```typescript
import { calculateDiscount } from "./pricing";

test("applies 10% discount for orders over $100", () => {
  // Arrange — set up inputs
  const order = { subtotal: 150, customerTier: "standard" };

  // Act — call the unit
  const result = calculateDiscount(order);

  // Assert — verify outcome
  expect(result).toBe(15);
});
```

**Keep each section short.** If Arrange is 20 lines, the unit has too many dependencies.

---

## What to Test

Test **behavior**, not implementation.

**✅ Good — tests observable outcome:**

```typescript
test("returns user with hashed password removed", async () => {
  const user = await getUserById("123");
  expect(user.password).toBeUndefined();
  expect(user.email).toBe("ada@example.com");
});
```

**❌ Bad — tests internal calls:**

```typescript
test("calls bcrypt.compare once", async () => {
  await login("ada", "pw");
  expect(bcrypt.compare).toHaveBeenCalledTimes(1);
});
```

The second test breaks the moment you swap `bcrypt` for `argon2`, even though behavior is unchanged.

---

## Test Categories

| Type            | Goal                                         |
| --------------- | -------------------------------------------- |
| **Happy path**  | Normal input → expected output               |
| **Edge cases**  | Empty array, null, max int, leap year        |
| **Error path**  | Bad input → thrown error or rejected promise |
| **Boundaries** | Off-by-one, just below/above limits           |

```typescript
describe("parseAge", () => {
  test("parses valid number", () => {
    expect(parseAge("25")).toBe(25);
  });

  test("rejects negative numbers", () => {
    expect(() => parseAge("-1")).toThrow("Age must be positive");
  });

  test("rejects non-numeric input", () => {
    expect(() => parseAge("twenty")).toThrow();
  });
});
```

---

## Jest Essentials

```typescript
import { describe, test, expect, beforeEach } from "@jest/globals";

describe("ShoppingCart", () => {
  let cart: ShoppingCart;

  beforeEach(() => {
    cart = new ShoppingCart();
  });

  test("starts empty", () => {
    expect(cart.items).toHaveLength(0);
  });

  test("adds items", () => {
    cart.add({ id: "1", price: 10 });
    expect(cart.items).toHaveLength(1);
    expect(cart.total).toBe(10);
  });
});
```

**Common matchers:**

```typescript
expect(value).toBe(5);              // ===
expect(obj).toEqual({ a: 1 });      // deep equality
expect(arr).toContain("apple");
expect(fn).toThrow("error message");
expect(promise).resolves.toBe(42);
expect(promise).rejects.toThrow();
```

---

## Async Tests

```typescript
test("fetches user from database", async () => {
  const user = await userService.findById("123");
  expect(user.name).toBe("Ada");
});

test("rejects when user not found", async () => {
  await expect(userService.findById("missing")).rejects.toThrow("Not found");
});
```

> Always `await` or return the promise. Forgetting this gives false passes.

---

## Coverage — Use With Care

```bash
jest --coverage
```

Coverage tells you what was *executed*, not what was *verified*.

```typescript
// 100% coverage, zero confidence
test("runs without error", () => {
  calculateDiscount({ subtotal: 100 });
});
```

> Aim for 80% line coverage on business logic. Don't chase 100% — testing trivial getters wastes time.

---

## Common Mistakes

❌ **Testing the framework**

```typescript
test("Express returns 200", () => { /* tests Express, not your code */ });
```

❌ **Shared state between tests**

```typescript
const cart = new ShoppingCart();
test("a", () => cart.add(item));   // pollutes next test
test("b", () => expect(cart.items).toHaveLength(0));  // fails
```

✅ Use `beforeEach` to reset.

❌ **One test, many assertions** — when it fails, you don't know which behavior broke. Split into multiple tests.

---

## Interview Q&A

**Q: What's the difference between a unit test and an integration test?**
A: A unit test isolates one piece of code and fakes its dependencies. An integration test runs real dependencies (DB, HTTP client, file system) and checks they work together.

**Q: Should you test private methods?**
A: No. Test private behavior through the public interface. If a private method is too complex to reach this way, extract it into its own module — then test that module's public surface.

**Q: How do you handle randomness or time in tests?**
A: Inject the dependency. Take a `clock` or `random` argument so tests can pass a deterministic fake (`jest.useFakeTimers()`, fixed-seed generator).

**Q: What's a flaky test?**
A: A test that sometimes passes and sometimes fails without code changes. Usually caused by: shared state, time-dependence, network calls, or test-order dependence. Fix the root cause — don't retry.

---

## Best Practices

✅ One behavior per test
✅ Descriptive names: `"returns 401 when token is expired"`
✅ Use `beforeEach` for setup, not module-level state
✅ Mock at the boundary (DB, HTTP), not internals
✅ Run tests in CI on every PR
❌ Don't test implementation details
❌ Don't share mutable state between tests
❌ Don't chase 100% coverage on trivial code

---

[← Back to Backend](../README.md) | [Next: Integration Testing →](./02-integration.md)
