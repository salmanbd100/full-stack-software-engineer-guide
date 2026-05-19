# Test-Driven Development (TDD)

## 💡 What Is TDD?

Test-Driven Development is a workflow: **write the test before the code**. You write the smallest failing test, write just enough code to pass it, then clean up. Repeat.

> TDD is a *design practice* disguised as a testing practice. You design the API by being its first caller.

---

## The Red-Green-Refactor Cycle

```
   ┌──────────┐
   │   RED    │ Write a failing test
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  GREEN   │ Smallest change to make it pass
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │ REFACTOR │ Clean up while green
   └────┬─────┘
        │
        └──── loop ────┐
                       │
                       ▼
              Next failing test
```

Each cycle takes **seconds to a few minutes**, not hours.

---

## A Worked Example

**Goal:** A function `slugify(text)` that turns `"Hello World!"` into `"hello-world"`.

### Step 1: Red

```typescript
import { slugify } from "./slugify";

test("lowercases the text", () => {
  expect(slugify("Hello")).toBe("hello");
});
```

Test fails — `slugify` doesn't exist.

### Step 2: Green

```typescript
export function slugify(text: string): string {
  return text.toLowerCase();
}
```

Passes. Don't add more.

### Step 3: Red again

```typescript
test("replaces spaces with hyphens", () => {
  expect(slugify("Hello World")).toBe("hello-world");
});
```

Fails.

### Step 4: Green

```typescript
export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-");
}
```

Passes both tests.

### Step 5: Red

```typescript
test("strips punctuation", () => {
  expect(slugify("Hello, World!")).toBe("hello-world");
});
```

### Step 6: Green

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}
```

### Step 7: Refactor

Names are fine, logic is short. No refactor needed yet.

> Each step is tiny. You always have a working test suite.

---

## Why TDD Works

| Effect                          | How                                            |
| ------------------------------- | ---------------------------------------------- |
| **Better design**               | You feel the pain of bad APIs immediately      |
| **No untested code**            | Test exists before the code                    |
| **Fearless refactoring**        | Green suite catches regressions                |
| **Smaller scope per iteration** | One failing test forces one change             |
| **Documentation**               | Test names describe behavior                   |

---

## Common Mistakes

❌ **Writing huge tests first**

```typescript
test("entire user flow works", async () => {
  // 50 lines covering signup, login, post, comment
});
```

Start with one tiny behavior.

❌ **Writing more than needed to pass**

When the test only requires `return 5`, *return `5`*. Don't pre-build the general case. Generality emerges as more tests pile on.

❌ **Skipping refactor**

The third step exists for a reason. Without it, code rots while tests pile up.

❌ **TDD-ing exploration code**

Spiking on a prototype? Don't TDD. Use TDD when you know *what* to build but not *how*.

---

## When TDD Is a Great Fit

- ✅ Pure functions, calculations, parsing
- ✅ Business logic with clear inputs/outputs
- ✅ Refactoring legacy code (write characterization tests first)
- ✅ Bug fixes — write a failing test that reproduces the bug

## When TDD Is a Poor Fit

- ❌ UI exploration (the design isn't decided)
- ❌ Throwaway scripts
- ❌ Heavy I/O glue with little logic
- ❌ Early-stage spikes where requirements shift hourly

---

## TDD for Bug Fixes

This is the **easiest place to start TDD** — the bug *is* the failing test.

```typescript
// Bug report: discount applies to gift cards but shouldn't.
test("gift cards do not receive percentage discount", () => {
  const cart = new Cart();
  cart.add({ sku: "GIFT-50", price: 50, isGiftCard: true });
  cart.applyDiscount({ type: "percent", value: 10 });

  expect(cart.total).toBe(50);  // currently returns 45
});
```

Now fix the code. The test prevents the same bug from coming back.

---

## TDD Doesn't Mean 100% Coverage

TDD is about **driving design**, not chasing a coverage number. You'll still:

- Use existing libraries without testing them
- Skip tests for trivial glue (`app.get("/health", ...)`)
- Write characterization tests *after the fact* for legacy code

---

## Interview Q&A

**Q: What's the difference between TDD and just writing tests?**
A: TDD writes the test **before** the code, in tiny red-green-refactor cycles. Writing tests after means the code shape already exists — you lose the design feedback that TDD gives.

**Q: Do you always use TDD?**
A: No. TDD shines for business logic, bug fixes, and refactors. For exploratory UI work or one-off scripts, the overhead isn't worth it. Be pragmatic.

**Q: TDD slows me down — is it worth it?**
A: Short-term, yes. Medium-term it pays back by catching regressions, forcing better design, and removing the "is this broken?" debug loop. Teams that practice it report fewer production bugs and easier refactors.

---

## Best Practices

✅ Smallest failing test, smallest passing change
✅ Refactor only when green
✅ Use TDD for new business logic and bug fixes
✅ Let test names describe *what* the unit does
❌ Don't write a feature's worth of tests before any code
❌ Don't skip the refactor step
❌ Don't TDD throwaway prototypes

---

[← Previous: E2E Testing](./03-e2e.md) | [Next: Mocking →](./05-mocking.md)
