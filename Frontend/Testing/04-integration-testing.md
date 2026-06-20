# Integration Testing

## Overview

Integration tests check that several parts work **together** — components, state, and the network layer. They are the most valuable tests for frontend apps because they match how users actually use the product, while staying much faster than E2E. The key tool is **Mock Service Worker (MSW)**, which mocks the network instead of your code.

## Table of Contents

- [Unit vs Integration](#unit-vs-integration)
- [Mock Service Worker (MSW)](#mock-service-worker-msw)
- [Testing a Data-Fetching Flow](#testing-a-data-fetching-flow)
- [Testing Forms End to End](#testing-forms-end-to-end)
- [Testing Error and Loading States](#testing-error-and-loading-states)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

## Unit vs Integration

```typescript
// UNIT — one isolated function
function cartTotal(items: { price: number; qty: number }[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

// INTEGRATION — form + state + child components + total, working together
it("adds an item and updates the total", async () => {
  const user = userEvent.setup();
  render(<ShoppingCart />);

  await user.type(screen.getByLabelText(/item name/i), "Book");
  await user.type(screen.getByLabelText(/price/i), "20");
  await user.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getByText("Total: $20.00")).toBeInTheDocument();
});
```

> Integration tests render **real** child components and **real** state. The only thing you fake is the network.

## Mock Service Worker (MSW)

MSW intercepts requests at the network level. Your `fetch`/`axios` code runs unchanged — it just gets a fake response. This is far better than mocking `fetch` directly because you test the real request code.

```bash
npm install -D msw
```

**Define handlers and a server:**

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: Number(params.id), name: "Ada Lovelace" });
  }),
  http.post("/api/users", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ id: 99, ...body }, { status: 201 });
  }),
];

// mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

**Wire it into Vitest setup** (`vitest.setup.ts`):

```typescript
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers()); // undo per-test overrides
afterAll(() => server.close());
```

> `onUnhandledRequest: "error"` fails the test if code hits a URL you forgot to mock — no silent real network calls.

## Testing a Data-Fetching Flow

```typescript
import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";

it("loads and shows the user", async () => {
  render(<UserProfile userId={1} />);

  // MSW returns the mocked user; findBy waits for it
  expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
});
```

## Testing Forms End to End

```typescript
import userEvent from "@testing-library/user-event";

it("creates a user and shows a success message", async () => {
  const user = userEvent.setup();
  render(<CreateUserForm />);

  await user.type(screen.getByLabelText(/name/i), "Grace Hopper");
  await user.click(screen.getByRole("button", { name: /create/i }));

  // Form posts to the mocked endpoint, then shows confirmation
  expect(await screen.findByText(/user created/i)).toBeInTheDocument();
});
```

## Testing Error and Loading States

Override a handler **per test** to simulate failures:

```typescript
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";

it("shows an error when the API fails", async () => {
  server.use(
    http.get("/api/users/:id", () =>
      HttpResponse.json({ error: "boom" }, { status: 500 })
    )
  );

  render(<UserProfile userId={1} />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load/i);
});
```

For loading states, add a delay:

```typescript
import { delay } from "msw";

server.use(
  http.get("/api/users/:id", async () => {
    await delay(200);
    return HttpResponse.json({ id: 1, name: "Ada" });
  })
);
// assert the spinner shows before the data arrives
expect(screen.getByRole("status")).toBeInTheDocument();
```

## Best Practices

- ✅ **Mock the network, not your modules** — MSW keeps your fetch code under test
- ✅ **Test user-visible behavior** — what shows on screen, not internal state
- ✅ **Reset handlers between tests** with `server.resetHandlers()`
- ✅ **Cover the unhappy paths** — errors, empty results, slow responses
- ❌ **Don't mock `fetch` by hand** — brittle and skips real request logic
- ❌ **Don't share one big test** for many flows — one behavior per test

## Interview Questions

**Q1: Why are integration tests the "sweet spot" for frontend?**

They render real components and state together, so they catch bugs in how pieces connect — the most common source of real failures. Yet they run in jsdom in milliseconds, far faster than E2E. That balance of confidence and speed is why the testing trophy weights them heaviest.

**Q2: Why use MSW instead of mocking `fetch`?**

MSW intercepts at the network boundary, so your actual request code (URLs, headers, error handling, response parsing) runs unchanged. Hand-mocking `fetch` replaces that code, so bugs in it go untested. MSW handlers are also reusable across tests, Storybook, and the browser.

**Q3: How do you test an error state with MSW?**

Override the handler for that one test with `server.use(...)` returning a 500 (or network error), then assert the UI shows the error message. `afterEach(() => server.resetHandlers())` undoes the override so other tests are unaffected.

**Q4: What should you mock and what should you keep real?**

Mock external boundaries you don't own — APIs, payment gateways, time, randomness. Keep everything you own real: child components, hooks, reducers, utilities. Over-mocking turns an integration test into a brittle unit test that proves nothing about how parts connect.

---

**Next:** [E2E Testing →](./05-e2e-testing.md)

**Previous:** [← React Testing Library](./03-react-testing-library.md)

[← Back to Testing](./README.md) | [↑ Frontend](../README.md)
