---
title: "Writing the Tests: Vitest and React Testing Library"
part: 4
chapter: 16
slug: vitest
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-09-24
tags: [vitest, testing-library, react, testing, queries, userevent, mocking, fake-timers, snapshots]
in_book: true
---

# Writing the Tests: Vitest and React Testing Library {#ch-vitest}

> Set up the runner once, query the way a user would, and mock only at the boundary.

**In this chapter:** why the runner shares the build config · queries and their priority · `userEvent` and async without waits · mocks and fake timers · snapshots and their trap

## 💡 The Core Idea

**Vitest runs tests through the application's own build pipeline.** It reads the same Vite config,
plugins and aliases, so code behaves in a test exactly as in the build. A runner with its own
transform gives you the worst kind of bug: the test passes and the build fails.

**Testing Library gives you no access to the component.** No instance, no state, no props: only the
DOM and the handles a user has, such as text, roles and labels. A test that cannot see implementation
details survives every refactor that keeps the behaviour the same. And because the best queries are
accessibility queries, a component that is hard to query is usually hard for a screen reader too.

## How It Works

### Config and setup, written once

**The runner config beside the build config, and the setup file it runs before every test file:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()], // the same plugin the app builds with
  test: {
    environment: "jsdom", // "node" for anything without a DOM
    setupFiles: ["./vitest.setup.ts"],
  },
});

// vitest.setup.ts
import "@testing-library/jest-dom/vitest"; // DOM matchers such as toBeVisible
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup(); // unmount, or the DOM leaks into the next test
  vi.clearAllMocks(); // drop call history, keep implementations
  vi.useRealTimers(); // a frozen clock must not outlive its test
});
```

Resets in the setup file make isolation the default, not a habit. jsdom costs startup time per file,
so a codebase of mostly pure logic runs faster with `node` as the default.

> ⚠️ **Moving target:** Vitest reached 4.x in 2025. Browser mode moved to a provider package, and the
> `workspace` file became a `projects` field in the main config. The durable principle is that the
> runner inherits the build's transform and resolution. Check the current config shape before copying one.

### Queries: the prefix and the priority

The prefix decides what happens when the element is not there.

| Variant    | Missing element          | Async | Use for                            |
| ---------- | ------------------------ | ----- | ---------------------------------- |
| `getBy…`   | Throws, printing the DOM | No    | It should be there right now       |
| `queryBy…` | Returns `null`           | No    | Asserting something is **absent**  |
| `findBy…`  | Throws after the timeout | Yes   | It appears after a promise resolves |

**Queries in priority order — stop at the first that works:**

```tsx
screen.getByRole("button", { name: /submit/i }); // 1. how a screen reader finds it
screen.getByLabelText(/email/i); // 2. form fields, by their label
screen.getByTestId("chart-canvas"); // 3. last resort: a canvas has nothing accessible
```

The order is not a style choice. Roles and labels are what assistive technology uses, so a role query
that fails usually means the markup is wrong. When it fails, read the output: it lists every role on
the page with its accessible name.

### `userEvent` performs an interaction

**`fireEvent` dispatches one event; `userEvent` runs the whole sequence a user causes:**

```tsx
it("submits the search term", async () => {
  const user = userEvent.setup(); // once per test, before render
  const onSearch = vi.fn();
  render(<SearchForm onSearch={onSearch} />);

  await user.type(screen.getByRole("searchbox"), "testing library");
  await user.click(screen.getByRole("button", { name: /search/i }));

  expect(onSearch).toHaveBeenCalledWith("testing library");
});
```

`userEvent` also refuses to click a disabled or hidden element. `fireEvent.click` on a disabled button
fires anyway, and the bug ships. For async output, `findBy` polls until the element appears.
`waitFor` wrapped around a `getBy` is the same thing with worse errors; keep it for a count.

### One custom render for the provider tree

**One shared render, so the provider setup cannot drift between files:**

```tsx
// test-utils.tsx
function AllProviders({ children }: { children: ReactNode }) {
  // built per render, so cached data cannot leak; retry: false, so failures are fast
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
```

### Mocks sit at the boundary

`vi.fn()` is a double you pass in. `vi.spyOn(obj, "method")` keeps the real function and records its
calls. Module mocks need more care, because **`vi.mock` is hoisted above every import in the file**.
Its factory runs first, so it cannot use a variable defined in the file body.

**A partial module mock, which replaces one export and keeps the rest:**

```typescript
import { vi } from "vitest";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return { ...actual, uploadToS3: vi.fn() };
});
```

A whole-module mock turns every other export into `undefined`. For a network call, do not mock the
module at all: intercept the request, so the fetch layer and error handling still run.

### Control the clock instead of waiting for it

**A retry test with fake timers:**

```typescript
it("retries after the backoff window", async () => {
  vi.useFakeTimers();
  const send = vi.fn().mockRejectedValueOnce(new Error("503")).mockResolvedValue("ok");
  const result = sendWithRetry(send); // schedules a retry with setTimeout
  await vi.advanceTimersByTimeAsync(1_000); // fires timers and flushes promises

  expect(send).toHaveBeenCalledTimes(2);
  await expect(result).resolves.toBe("ok");
});
```

Use the async version: promise callbacks a timer schedules only run if microtasks are flushed too.
`vi.setSystemTime()` freezes `Date.now()` for anything with an expiry.

### Snapshots, and their trap

A snapshot suits small, stable output, such as a formatted error string. A large one fails on every
unrelated change, gets regenerated with `-u` unread, and then asserts nothing. Prefer
`toMatchInlineSnapshot`, so the expected value sits where a reviewer sees the diff.

## When to Use It

| Situation                                   | Choose                          | Why                                           |
| ------------------------------------------- | ------------------------------- | --------------------------------------------- |
| A Vite, React, Svelte or Next.js project    | Vitest                          | It reuses the build config                    |
| A component's visible behaviour             | Testing Library in Vitest       | Fast, and asserts what a user observes        |
| A hook with no UI of its own                | `renderHook`                    | Cheaper than a host component                 |
| Layout, focus rings, real scrolling         | Browser mode or Playwright      | jsdom has no layout engine                    |
| A whole journey across pages                | Playwright                      | Routing and a real build are what is tested   |

## Common Mistakes

❌ **`getBy` to assert absence.** It throws before the assertion runs.
✅ `queryBy` returns `null`, which is what `not.toBeInTheDocument()` needs.

❌ **`getByTestId` because the role query failed.** The query was telling you the control has no name.
✅ Fix the label. Keep test ids for content with nothing accessible to query.

❌ **A missing `await` on a `userEvent` call.** The assertion runs before React re-renders.
✅ `await` every interaction, and call `userEvent.setup()` once per test.

## 🔑 Key Takeaways

- Vitest runs on the application's own Vite pipeline, so tests and the build treat code the same way.
- Testing Library exposes only the DOM, which is why its tests survive refactors.
- Query priority follows what assistive technology uses, so a failing role query is usually a markup bug.
- `vi.mock` is hoisted above every import, so its factory cannot close over local variables.
- Put cleanup, mock resets and real timers in the setup file, so isolation is the default.

## Interview Questions

**Q: Why would you pick Vitest over Jest for a new project?**

It uses the project's own Vite config, so tests and the build agree, which removes a class of false
passes. The API matches Jest, so the switch is cheap. For a project not built with Vite, the case is
much weaker.

**Q: Why does Testing Library refuse to give you access to component state?**

A test that can read internals will assert on them, and then every refactor breaks tests with no
change in behaviour. Limited to the DOM, it fails only when what the user sees changes. The cost is
that pure internal logic must be pulled out and unit-tested on its own.

**Q: When is `getByTestId` acceptable?**

When the element has nothing accessible to query, such as a chart canvas. Never as a way past a
control with no accessible name: there the failing query is a real defect, and the test id hides it.

**Q: A test passes on its own and fails in the suite. Where do you look?**

Leaked state, in one of three places: shared data at module scope, mock history never cleared, or
fake timers left running. Fix all three in the setup file, not per test. If it still fails, run with
one worker to tell order dependence apart from parallelism.

**Q: When is a module mock the wrong tool?**

When you are really faking the network. A module mock proves your code called a function, not what
request went out, and it skips the fetch layer and error handling. Intercepting the request tests the
code that runs in production.

## What to Read Next

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — the same queries against an intercepted network
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — where role queries become a conformance check
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — where the isolation rules in this chapter come from
