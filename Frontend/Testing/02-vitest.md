---
title: Vitest
part: 4
chapter: 0
slug: vitest
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [vitest, testing, mocking, fake-timers, coverage, runner]
in_book: true
---

# Vitest {#ch-vitest}

> Configure the runner once, mock only at the boundary, and control the clock instead of waiting for it.

**In this chapter:** why the runner shares the build config · setup that every suite needs · function and module mocks · fake timers · snapshots and their trap · coverage

## 💡 The Core Idea

Vitest's one structural idea is that **the test runner uses the application's own build pipeline.**
It reads the same Vite config, applies the same plugins, and resolves the same aliases — so TypeScript,
path aliases, environment variables and JSX all behave in a test exactly as they do in the build.

That sounds like a convenience and is actually a correctness property. The alternative — a runner with
its own transform, its own module resolution and its own idea of what a `.ts` file means — produces the
category of bug where a test passes and the build fails, or the test passes against code the bundler
would have transformed differently.

Everything else is API surface. `describe`, `it`, `expect` and the matchers behave the way the
previous generation's did, which is why the migration from Jest is mostly renaming `jest` to `vi`.

## How It Works

### Config lives beside the build config

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()], // the same plugin the app builds with
  test: {
    environment: "jsdom", // "node" for anything without a DOM
    setupFiles: ["./vitest.setup.ts"],
    coverage: { provider: "v8", exclude: ["**/*.config.ts", "**/main.tsx"] },
  },
});
```

```typescript
// vitest.setup.ts — runs before every test file
import "@testing-library/jest-dom/vitest"; // DOM matchers: toBeVisible, toHaveAccessibleName
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup); // unmount between tests, or the DOM leaks across them
```

Two decisions in there are worth defending. `environment: "jsdom"` costs startup time per file, so a
codebase with a lot of pure logic is faster with `environment: "node"` as the default and jsdom
applied only to the files that need it. And the `cleanup` in setup rather than in each test file is
what makes isolation the default instead of a thing people remember.

> ⚠️ **Moving target:** Vitest reached 4.x in 2025, browser mode moved to a provider package, and the
> multi-environment `workspace` file was replaced by a `projects` field in the main config. The
> durable principle is that the runner inherits the build's transform and resolution. Check the
> current config shape before copying one.

### `vi.fn` for a boundary, `vi.spyOn` for an observation

```typescript
import { vi, expect, it } from "vitest";

// A double you pass in — no real implementation behind it.
const onSubmit = vi.fn();
onSubmit({ email: "a@b.com" });
expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.com" });

// Queued return values, for a retry or a polling loop.
const poll = vi.fn().mockResolvedValueOnce("pending").mockResolvedValue("ready");

// A spy leaves the real function in place and records the calls.
const spy = vi.spyOn(analytics, "track");
```

The reset policy matters more than the API, and it belongs in the setup file once:
`vi.clearAllMocks()` in `afterEach` drops call history while leaving implementations,
`resetAllMocks` drops the implementations too, and `restoreAllMocks` puts spied-on originals back.
Leaked mock state is the second most common cause of a test that passes alone and fails in the suite,
after shared data — both covered in [Chapter ?? — Testing Strategy](#ch-testing-strategy).

### Module mocks are hoisted, which is why they surprise people

`vi.mock` is lifted above the imports in the file, whatever line you wrote it on. So the factory
cannot reference anything defined in the file body — it runs first.

```typescript
import { getUser } from "./api";
import { vi, expect, it } from "vitest";

vi.mock("./api"); // hoisted above the import above it

it("renders the user", async () => {
  // vi.mocked() is a type-level helper: it tells the compiler this import is a mock
  vi.mocked(getUser).mockResolvedValue({ id: "1", name: "Ada" });
  expect((await getUser("1")).name).toBe("Ada");
});
```

**Partial mocks** keep the real module and replace one export — usually the right choice, because
replacing a whole module of utilities is how a test stops testing anything:

```typescript
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return { ...actual, uploadToS3: vi.fn() };
});
```

For anything that is really a network call, intercept the request instead of mocking the module. The
module mock proves your code called a function; request interception proves it sent the right
request — see [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing).

### Control the clock rather than waiting on it

```typescript
it("retries after the backoff window", async () => {
  vi.useFakeTimers();
  const send = vi.fn().mockRejectedValueOnce(new Error("503")).mockResolvedValue("ok");

  const result = sendWithRetry(send); // schedules a retry via setTimeout
  await vi.advanceTimersByTimeAsync(1_000); // fires timers and flushes microtasks

  expect(send).toHaveBeenCalledTimes(2);
  await expect(result).resolves.toBe("ok");
  vi.useRealTimers(); // always, or the next test inherits a frozen clock
});
```

`advanceTimersByTimeAsync` rather than the synchronous version is the detail that saves an afternoon:
promise callbacks scheduled by a timer only run if the microtask queue is flushed too.
`vi.setSystemTime(new Date("2026-01-01"))` freezes `Date.now()`, which is how you test anything with
an expiry.

### Snapshots, and the failure mode

A snapshot compares output against a stored copy. It is genuinely good for small stable output —
a formatted error string, a generated config object — and genuinely bad for anything large.

```typescript
it("formats a validation error", () => {
  expect(formatError({ code: 422, field: "email" })).toMatchInlineSnapshot(
    `"email is not a valid address (422)"`,
  );
});
```

The trap: a large snapshot fails on every unrelated change, so it gets regenerated with `-u` without
being read, and from then on it asserts nothing while looking like a test. **Inline snapshots resist
this** — the expected value sits in the test file where a reviewer sees the diff. Use property
matchers for anything genuinely variable: `expect(user).toMatchSnapshot({ createdAt: expect.any(Date) })`.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| A Vite, React, Svelte or Next.js project | Vitest | It reuses the build config, so tests and build agree |
| Migrating an existing Jest suite | Vitest | Same API; mostly renaming `jest` to `vi` |
| Node-only code with no DOM | Vitest with `environment: "node"` | Skips the jsdom startup cost per file |
| Component behaviour that depends on real layout or focus | Vitest browser mode | jsdom has no layout engine |
| A full user journey across pages | Playwright, not the runner | See [Chapter ?? — End-to-End Testing with Playwright](#ch-end-to-end-testing) |

## Common Mistakes

❌ **Referencing a file-scope variable inside a `vi.mock` factory.** The factory is hoisted and runs
before that variable exists.
✅ Define the mock's data inside the factory, or set it per test with `vi.mocked()`.

❌ **`vi.useFakeTimers()` without restoring real ones.** Every later test in the file inherits a
frozen clock and hangs on the first `await`.
✅ Restore in `afterEach`, not at the end of the test body where a failure skips it.

❌ **Mocking a whole utility module to fake one function.** Everything else in it becomes `undefined`.
✅ `importOriginal` and override the single export.

❌ **Snapshotting a rendered component tree.** It fails on every markup change and gets regenerated
unread.
✅ Assert the two or three things that matter, and leave appearance to visual regression.

❌ **A coverage threshold in the config as the quality bar.** It produces tests written to raise a
number.
✅ Report coverage, gate on the suite passing, and read the branch report for untested error paths.

## 🔑 Key Takeaways

- Vitest runs on the application's own Vite pipeline, so tests and the build resolve and transform code identically.
- Put `cleanup` and mock resets in a setup file, so isolation is the default rather than a habit.
- `vi.mock` is hoisted above every import in the file, which is why its factory cannot close over local variables.
- Use `advanceTimersByTimeAsync` when a timer schedules promise work, and always restore real timers.
- Snapshots are for small stable output; a large one gets regenerated unread and then asserts nothing.

## Interview Questions

**Q: Why would you pick Vitest over Jest for a new project?**

Mainly because it uses the project's own Vite config, so TypeScript, aliases and plugins behave the
same in tests as in the build — which removes the class of bug where a test passes against code the
bundler treats differently. Speed and native ESM support follow from that. The API is compatible, so
there is no real learning cost, and for a project not built with Vite the argument is much weaker.

**Q: A test passes on its own and fails in the suite. Where do you look?**

Leaked state, in one of three places: shared mutable data at module scope, mock call history that was
never cleared, or fake timers left installed by an earlier test. All three are fixed in the setup file
rather than per test — a factory for data, `clearAllMocks` in `afterEach`, and restoring real timers.
If it still fails, run with a single worker to find out whether it is order dependence or parallelism.

**Q: When is a module mock the wrong tool?**

When what you are actually faking is the network. A module mock asserts that your code called a
function with some arguments; it says nothing about the request that would have gone out, and it
bypasses the fetch layer, serialisation and error handling entirely. Intercepting at the request level
tests the code that actually runs in production.

## What to Read Next

- [Chapter ?? — React Testing Library](#ch-react-testing-library) — the query API that runs inside this runner
- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — request interception instead of module mocks
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — where the isolation rules this chapter enforces come from
