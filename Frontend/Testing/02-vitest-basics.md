# Vitest Basics

## Overview

Vitest is a fast, modern test runner built on Vite. It is the default choice for new Vite, React, Vue, and Svelte projects. Its API is almost identical to Jest, so Jest knowledge transfers directly — but Vitest is faster, has native TypeScript and ESM support, and shares your app's Vite config.

> **Vitest vs Jest:** Same `describe` / `it` / `expect` API. Main change: mocking uses `vi` instead of `jest` (`vi.fn()`, `vi.mock()`, `vi.spyOn()`). Vitest is faster and needs no Babel for TypeScript.

## Table of Contents

- [Setup and Config](#setup-and-config)
- [Writing Tests](#writing-tests)
- [Matchers](#matchers)
- [Setup and Teardown](#setup-and-teardown)
- [Mocking Functions](#mocking-functions)
- [Mocking Modules](#mocking-modules)
- [Fake Timers](#fake-timers)
- [Snapshot Testing](#snapshot-testing)
- [Coverage](#coverage)
- [Interview Questions](#interview-questions)

## Setup and Config

```bash
npm install -D vitest @vitest/coverage-v8
# For React component tests:
npm install -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**`vitest.config.ts`:**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // use describe/it/expect without imports
    environment: "jsdom", // browser-like DOM (use "node" for backend)
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      thresholds: { lines: 80, branches: 75, functions: 80 },
    },
  },
});
```

**`vitest.setup.ts`** — runs before every test file:

```typescript
import "@testing-library/jest-dom/vitest"; // adds DOM matchers
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup()); // unmount components between tests
```

**`package.json` scripts:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

> `vitest` runs in **watch mode** by default. Use `vitest run` for a single pass in CI.

## Writing Tests

```typescript
import { describe, it, expect } from "vitest";

function add(a: number, b: number): number {
  return a + b;
}

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it.skip("not ready yet", () => {});
  // it.only(...) runs just this test
});
```

**Parameterized tests with `it.each`:**

```typescript
it.each([
  [1, 1, 2],
  [2, 3, 5],
  [-1, 1, 0],
])("add(%i, %i) = %i", (a: number, b: number, expected: number) => {
  expect(add(a, b)).toBe(expected);
});
```

## Matchers

```typescript
// Equality
expect(2 + 2).toBe(4); // strict (===), for primitives
expect({ name: "Ada" }).toEqual({ name: "Ada" }); // deep, for objects/arrays

// Truthiness
expect(value).toBeNull();
expect(value).toBeDefined();
expect(value).toBeTruthy();

// Numbers
expect(4).toBeGreaterThan(3);
expect(0.1 + 0.2).toBeCloseTo(0.3); // avoids float errors

// Strings & arrays
expect("hello world").toContain("world");
expect(["a", "b"]).toHaveLength(2);
expect(user).toHaveProperty("address.city", "NYC");

// Exceptions
expect(() => divide(1, 0)).toThrow("Cannot divide by zero");

// Async
await expect(Promise.resolve("ok")).resolves.toBe("ok");
await expect(Promise.reject(new Error("fail"))).rejects.toThrow("fail");

// Negation
expect(2 + 2).not.toBe(5);
```

### 💡 **`toBe` vs `toEqual`**

> `toBe` checks the **same reference** (use for numbers, strings, booleans). `toEqual` checks **same content** (use for objects and arrays).

```typescript
expect({ id: 1 }).toBe({ id: 1 }); // ❌ fails — different references
expect({ id: 1 }).toEqual({ id: 1 }); // ✅ passes — same content
```

## Setup and Teardown

```typescript
import { beforeEach, afterEach, beforeAll, afterAll } from "vitest";

beforeAll(() => {}); // once, before all tests in the file
beforeEach(() => {}); // before each test — reset shared state here
afterEach(() => {}); // after each test — clean up
afterAll(() => {}); // once, after all tests
```

**Use a factory, not shared mutable state:**

```typescript
// ❌ Bad — tests can pollute each other
let user = { age: 30 };

// ✅ Good — fresh data per test
function makeUser(overrides = {}) {
  return { name: "Ada", age: 30, ...overrides };
}
```

## Mocking Functions

`vi.fn()` creates a mock function you can inspect and control.

```typescript
import { vi, expect } from "vitest";

const onSubmit = vi.fn();
onSubmit({ email: "a@b.com" });

expect(onSubmit).toHaveBeenCalled();
expect(onSubmit).toHaveBeenCalledTimes(1);
expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.com" });

// Control return values
const getId = vi.fn().mockReturnValue(42);
const fetchUser = vi.fn().mockResolvedValue({ id: 1, name: "Ada" });
const failing = vi.fn().mockRejectedValue(new Error("Network error"));

// Different value per call
const next = vi
  .fn()
  .mockReturnValueOnce("first")
  .mockReturnValueOnce("second")
  .mockReturnValue("default");
```

**`vi.spyOn`** watches a real method (and can replace it):

```typescript
const calc = { add: (a: number, b: number): number => a + b };

const spy = vi.spyOn(calc, "add");
calc.add(2, 3);
expect(spy).toHaveBeenCalledWith(2, 3);

spy.mockRestore(); // restore the original
```

**Reset between tests:**

```typescript
afterEach(() => {
  vi.clearAllMocks(); // clear call history, keep implementation
  // vi.resetAllMocks() also clears implementations
  // vi.restoreAllMocks() restores spies to originals
});
```

## Mocking Modules

`vi.mock` replaces a whole module. It is **hoisted** — it runs before imports.

```typescript
// api.ts
export async function getUser(id: number) {
  /* real fetch */
}

// user.test.ts
import { getUser } from "./api";
import { vi, expect, it } from "vitest";

vi.mock("./api", () => ({
  getUser: vi.fn(),
}));

it("uses the mocked api", async () => {
  vi.mocked(getUser).mockResolvedValue({ id: 1, name: "Ada" });

  const user = await getUser(1);
  expect(user.name).toBe("Ada");
});
```

**Partial mock** — keep the real module, override one export:

```typescript
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return { ...actual, slowFunction: vi.fn(() => "fast") };
});
```

> `vi.mocked()` is a TypeScript helper. It tells the compiler the import is a mock, so you get `.mockResolvedValue` autocompletion with full type safety.

## Fake Timers

Control time instead of waiting for it.

```typescript
import { vi, it, expect } from "vitest";

function greetLater(cb: (msg: string) => void): void {
  setTimeout(() => cb("Hello!"), 1000);
}

it("calls back after 1 second", () => {
  vi.useFakeTimers();
  const cb = vi.fn();

  greetLater(cb);
  vi.advanceTimersByTime(1000); // jump forward

  expect(cb).toHaveBeenCalledWith("Hello!");
  vi.useRealTimers();
});
```

Other helpers: `vi.runAllTimers()`, `vi.runOnlyPendingTimers()`, `vi.setSystemTime(date)` (mock `Date.now()`).

## Snapshot Testing

Snapshots save output to a file and compare future runs against it.

```typescript
it("formats an error", () => {
  const error = formatError({ code: 404, message: "Not found" });
  expect(error).toMatchSnapshot(); // saved on first run
});

// Inline snapshot — stored in the test file itself
it("builds config", () => {
  expect({ timeout: 5000 }).toMatchInlineSnapshot(`
    {
      "timeout": 5000,
    }
  `);
});
```

Update snapshots with `vitest -u`.

**✅ Good for:** small stable output (formatted strings, config objects).
**❌ Bad for:** large components or dynamic data (dates, random IDs). Use property matchers for dynamic fields:

```typescript
expect(user).toMatchSnapshot({ createdAt: expect.any(Date) });
```

## Coverage

```bash
npm run test:coverage
```

Vitest uses the V8 provider by default. Set thresholds in config so CI fails when coverage drops:

```typescript
coverage: {
  provider: "v8",
  thresholds: { lines: 80, branches: 75, functions: 80 },
  exclude: ["**/*.config.ts", "**/main.tsx"],
}
```

## Interview Questions

**Q1: Why Vitest over Jest?**

Vitest is faster (powered by Vite's transform pipeline), supports TypeScript and ESM natively with no Babel config, and reuses your app's Vite config so test and build behave the same. The API is Jest-compatible, so migration is mostly swapping `jest` for `vi`.

**Q2: How do you mock a module in Vitest?**

Use `vi.mock('./path')`, which is hoisted above imports. Pass a factory to define the mock shape, then use `vi.mocked(fn)` for typed control over return values. For partial mocks, spread `await importOriginal()` and override only what you need.

**Q3: `clearAllMocks` vs `resetAllMocks` vs `restoreAllMocks`?**

`clearAllMocks` wipes call history only. `resetAllMocks` also removes mock implementations. `restoreAllMocks` restores `vi.spyOn` spies to their original functions. Use `clearAllMocks` in `afterEach` for isolation.

**Q4: How do you test code that uses `setTimeout`?**

Call `vi.useFakeTimers()`, trigger the code, then `vi.advanceTimersByTime(ms)` to jump forward without waiting. Restore with `vi.useRealTimers()`. This keeps timer tests instant and deterministic.

**Q5: When should you avoid snapshot tests?**

Avoid them for large components (huge, unreadable snapshots nobody reviews) and dynamic data like timestamps (they change every run). Keep snapshots small and focused, and review every snapshot change like real code.

---

**Next:** [React Testing Library →](./03-react-testing-library.md)

**Previous:** [← Testing Fundamentals](./01-testing-fundamentals.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
