# React Testing Library

## Overview

React Testing Library (RTL) tests components the way a user sees them — by visible text, roles, and labels — not by internal state or props. This makes tests resilient: they keep passing when you refactor, and fail only when real behavior breaks. RTL works with any runner; here we pair it with Vitest.

> **Guiding principle:** "The more your tests resemble the way your software is used, the more confidence they can give you."

## Table of Contents

- [Setup](#setup)
- [Rendering and `screen`](#rendering-and-screen)
- [Queries](#queries)
- [Query Priority](#query-priority)
- [User Interactions](#user-interactions)
- [Testing Async Behavior](#testing-async-behavior)
- [Testing Custom Hooks](#testing-custom-hooks)
- [Custom Render with Providers](#custom-render-with-providers)
- [Debugging](#debugging)
- [Interview Questions](#interview-questions)

## Setup

```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Add `environment: "jsdom"` and the jest-dom matchers in your Vitest setup (see [02-vitest-basics.md](./02-vitest-basics.md#setup-and-config)).

## Rendering and `screen`

```typescript
import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";

it("renders a button", () => {
  render(<button>Click me</button>);
  expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
});
```

> **Always use `screen`** instead of destructuring queries from `render`. It is less code, gives better errors, and stays consistent across tests.

## Queries

Three query variants, each behaving differently when an element is missing:

| Variant     | Not found        | Use for                       |
| ----------- | ---------------- | ----------------------------- |
| `getBy...`  | ❌ throws         | Element should exist          |
| `queryBy...` | ✅ returns `null` | Asserting absence            |
| `findBy...` | ❌ throws (async, waits) | Element appears later (async) |

```typescript
// getBy — must exist now
expect(screen.getByRole("heading")).toBeInTheDocument();

// queryBy — checking something is NOT there
expect(screen.queryByRole("alert")).not.toBeInTheDocument();

// findBy — wait for async content
expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

// getAllBy / queryAllBy / findAllBy return arrays
expect(screen.getAllByRole("listitem")).toHaveLength(3);
```

## Query Priority

Query the way users find things. Prefer accessible queries; treat `getByTestId` as a last resort.

```typescript
// 1. getByRole — BEST (covers most elements)
screen.getByRole("button", { name: /submit/i });
screen.getByRole("heading", { level: 1 });

// 2. getByLabelText — form fields
screen.getByLabelText(/email/i);

// 3. getByPlaceholderText / getByText / getByDisplayValue
screen.getByText(/welcome back/i);

// 4. getByAltText / getByTitle — images, icons
screen.getByAltText(/profile photo/i);

// 5. getByTestId — only when nothing else works
screen.getByTestId("chart-canvas");
```

> Using roles and labels forces accessible markup. If your test can't find a button by its name, neither can a screen reader.

## User Interactions

Prefer `userEvent` over `fireEvent`. `userEvent` simulates a real user — it fires the full sequence of events (hover, focus, keydown, input) and respects disabled elements.

```typescript
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { vi, it, expect } from "vitest";

it("submits the search form", async () => {
  const user = userEvent.setup();
  const onSearch = vi.fn();
  render(<SearchForm onSearch={onSearch} />);

  await user.type(screen.getByRole("searchbox"), "react testing");
  await user.click(screen.getByRole("button", { name: /search/i }));

  expect(onSearch).toHaveBeenCalledWith("react testing");
});
```

Common actions: `user.click()`, `user.type()`, `user.clear()`, `user.selectOptions()`, `user.upload()`, `user.tab()`, `user.keyboard("{Enter}")`.

> Use `fireEvent` only for low-level events `userEvent` doesn't cover, like `scroll`.

## Testing Async Behavior

```typescript
// Component fetches a user, shows "Loading..." then the name
it("shows loading, then the user", async () => {
  render(<UserProfile userId={1} />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // findBy waits (default 1000ms) for the element to appear
  expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

**`waitFor`** for assertions that aren't a single query, and **`waitForElementToBeRemoved`** for disappearing elements:

```typescript
import { waitFor, waitForElementToBeRemoved } from "@testing-library/react";

await waitForElementToBeRemoved(() => screen.queryByRole("status"));

await waitFor(() => {
  expect(screen.getAllByRole("row")).toHaveLength(10);
});
```

> ✅ Prefer `findBy` over `waitFor(() => getBy...)` — it is shorter and gives clearer errors.

## Testing Custom Hooks

Use `renderHook` for hooks. Wrap state updates in `act`.

```typescript
import { renderHook, act } from "@testing-library/react";
import { it, expect } from "vitest";

function useCounter(start = 0) {
  const [count, setCount] = useState(start);
  return { count, increment: () => setCount((c) => c + 1) };
}

it("increments the counter", () => {
  const { result } = renderHook(() => useCounter(5));

  expect(result.current.count).toBe(5);

  act(() => result.current.increment());

  expect(result.current.count).toBe(6);
});
```

> For complex hooks, prefer testing them **through a small component** — it is closer to real usage.

## Custom Render with Providers

Most components need Router, Theme, or Query providers. Wrap them once in a custom render.

```typescript
// test-utils.tsx
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render }; // override the default render
```

Then import `render` from `./test-utils` in every test.

## Debugging

```typescript
screen.debug(); // print the current DOM
screen.debug(screen.getByRole("form")); // print one element

import { logRoles } from "@testing-library/react";
logRoles(container); // list every available role — great for fixing getByRole

screen.logTestingPlaygroundURL(); // opens an interactive query builder
```

When a query fails, RTL prints the full DOM and the roles it found. Read that output before guessing.

## Interview Questions

**Q1: How does RTL differ from Enzyme?**

Enzyme tests implementation details — internal state, instance methods, shallow rendering. RTL tests behavior through the rendered DOM, the way a user interacts. RTL tests survive refactors and push you toward accessible markup, which is why the React team recommends it.

**Q2: Explain `getBy` vs `queryBy` vs `findBy`.**

`getBy` throws if not found — use when the element must exist. `queryBy` returns `null` — use to assert something is absent. `findBy` returns a promise and waits — use for async content. All throw if they match multiple elements.

**Q3: Why prefer `userEvent` over `fireEvent`?**

`fireEvent` dispatches a single raw DOM event. `userEvent` simulates the full interaction — for a click that means hover, mousedown, focus, mouseup, click — and respects disabled state. It is far closer to real user behavior, so tests catch more bugs.

**Q4: What is the query priority and why does it matter?**

Role → label → text → alt/title → test ID. Higher-priority queries match how real users and assistive tech find elements, so they double as accessibility checks. Test IDs are a last resort because they are invisible to users.

**Q5: How do you test a custom hook?**

Use `renderHook` and read `result.current`. Wrap any state-changing call in `act` so React flushes updates. For hooks with heavy logic, testing them through a real component is often more reliable than testing the hook directly.

---

**Next:** [Integration Testing →](./04-integration-testing.md)

**Previous:** [← Vitest Basics](./02-vitest-basics.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
