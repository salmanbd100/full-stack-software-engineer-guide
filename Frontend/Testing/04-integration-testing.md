---
title: Frontend Integration Testing
part: 4
chapter: 0
slug: frontend-integration-testing
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-07
tags: [integration-testing, msw, network, testing, react]
in_book: true
---

# Frontend Integration Testing {#ch-frontend-integration-testing}

> Fake the network and nothing else, so the test exercises the wiring where the real bugs live.

**In this chapter:** what "integration" means on the frontend · request interception against module mocks · a worked flow · the unhappy paths that actually ship broken · resetting between tests

## 💡 The Core Idea

An integration test on the frontend has one rule: **everything is real except the network.** Real
child components, real state, real routing, real form library, real query cache. The only substitution
is at the HTTP boundary.

That single line is doing a lot of work. It is the reason this layer catches the bugs that matter — a
loading state that never clears, a form that posts twice, an error path nobody rendered, a cache that
serves stale data after a mutation. None of those live in a function; they live in the seams between
pieces, and a test that mocks those pieces away cannot see them.

It is also why the layer is cheap. There is no browser to start and no server to run, so a
twelve-step user flow costs a few hundred milliseconds.

> ⚠️ **Moving target:** Mock Service Worker rewrote its handler API in version 2 — `rest` became `http`,
> and the `res(ctx.json())` chain became a returned `HttpResponse` — so most published examples are for
> a shape that no longer runs. The durable principle survives the rewrite: intercept at the network
> boundary, not at the module boundary.

## How It Works

### Intercept the request, do not mock the module

Both approaches make a component render fake data. Only one of them tests your code.

| | Module mock (`vi.mock("./api")`) | Request interception |
| --- | --- | --- |
| What runs | Your component | Your component **and** your fetch layer |
| Proves | A function was called | The right request was sent |
| Skips | URL building, headers, serialisation, error mapping | Nothing |
| Breaks when | You rename the module | The request contract changes — which is correct |

The second column is the important one. A module mock asserts that `getUser("1")` was called. It says
nothing about whether the resulting request had the auth header, hit the right path, or handled a 500
— and those are exactly the things that break in production.

Mock Service Worker intercepts at the network layer, so `fetch` genuinely runs:

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: String(params.id), name: "Ada Lovelace" }),
  ),
  http.post("/api/users", async ({ request }) => {
    // The body the component actually sent — assertable, not assumed.
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ id: "99", ...body }, { status: 201 });
  }),
];
```

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers()); // undo per-test overrides
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` is not optional. Without it, a request to a URL you forgot to handle
falls through to the real network — the test then passes in a session with network access and fails in
CI, or worse, quietly hits a live service.

### A flow, not an assertion

```tsx
it("creates a user and shows the confirmation", async () => {
  const user = userEvent.setup();
  render(<CreateUserForm />); // real form, real validation, real submit

  await user.type(screen.getByLabelText(/name/i), "Grace Hopper");
  await user.click(screen.getByRole("button", { name: /create/i }));

  // The whole path ran: validation, request, response mapping, render.
  expect(await screen.findByText(/user created/i)).toBeInTheDocument();
});
```

Six pieces collaborate in those four lines, and any of them can be the thing that broke. That is the
point — a unit test of the submit handler would have passed while the button stayed disabled.

### The unhappy paths are where the value is

Happy paths are what developers build and demo, so they are rarely broken. Errors, empty states and
slow responses are what nobody looked at. Override a handler per test:

```typescript
it("shows an error when the request fails", async () => {
  server.use(
    http.get("/api/users/:id", () =>
      HttpResponse.json({ error: "boom" }, { status: 500 }),
    ),
  );

  render(<UserProfile userId="1" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
});
```

```typescript
it("shows the spinner while the request is in flight", async () => {
  server.use(
    http.get("/api/users/:id", async () => {
      await delay(200); // long enough to observe the pending state
      return HttpResponse.json({ id: "1", name: "Ada" });
    }),
  );

  render(<UserProfile userId="1" />);
  expect(screen.getByRole("status")).toBeInTheDocument(); // before
  expect(await screen.findByText("Ada")).toBeInTheDocument(); // after
});
```

Four handler variations cover most of what goes wrong: a 500, a 401, an empty list, and a slow
response. Writing those four for each important flow buys more than doubling the unit tests.

> ⚠️ A `delay()` in a handler is a real wait, so keep it short and use it only where the pending state
> is the assertion. Ten tests with a 200 ms delay is two seconds of suite time for nothing.

### Reset, or the tests couple themselves together

`server.resetHandlers()` in `afterEach` is what keeps a per-test override from leaking into the next
test. So is a fresh query client per render — a shared cache means the second test reads the first
test's data, and the failure looks like a component bug.

## When to Use It

| Situation | Test at | Why |
| --------- | ------- | --- |
| A form that validates, submits and confirms | Integration | Every seam in one test, in under a second |
| Loading, error and empty states | Integration, with a handler override | Cheapest place to force each response |
| Cache invalidation after a mutation | Integration | Real query client, real refetch |
| A pure calculation the form uses | Unit | Faster, and covers a hundred cases |
| Routing, real cookies, cross-page state | End-to-end — [Chapter ?? — End-to-End Testing with Playwright](#ch-end-to-end-testing) | A real browser is the thing being tested |
| A back-end contract that may have drifted | Contract testing — [Chapter ?? — Visual and Contract Testing](#ch-visual-and-contract-testing) | Handlers are your assumption, not the server's truth |

The last row is the honest limitation. A handler is a statement about what the API returns, written by
the frontend. If the server changes its response, every one of these tests still passes.

## Common Mistakes

❌ **Mocking `fetch` by hand.** You then test a fake, and every call site needs its own setup.
✅ Intercept at the network layer so the real request code runs.

❌ **Omitting `onUnhandledRequest: "error"`.** Unmocked calls silently reach the real network.
✅ Set it, and treat an unhandled request as a failing test.

❌ **Only testing the happy path.** The 500, the 401 and the empty list are the ones that ship broken.
✅ A handler override per failure mode, on every flow that matters.

❌ **Mocking your own components to "isolate" the flow.** The integration is the thing under test; you
have just removed it.
✅ Render the real tree. Substitute only the network.

❌ **Leaving an override in place.** The next test inherits a 500 and fails for no visible reason.
✅ `resetHandlers()` in `afterEach`, and a fresh query client per render.

## 🔑 Key Takeaways

- On the frontend, integration means everything real except the network.
- Request interception tests your fetch layer; a module mock deletes it from the test.
- `onUnhandledRequest: "error"` is what stops a forgotten handler reaching the real network.
- The unhappy paths — 500, 401, empty, slow — are where this layer earns its cost.
- Handlers encode your assumption about the API, so they cannot detect server-side drift.

## Interview Questions

**Q: Why intercept requests instead of mocking the API module?**

Because a module mock removes the code most likely to be wrong. Interception leaves the URL building,
the headers, the serialisation and the error mapping in the test, so an assertion about what the user
sees is also an assertion that the request was right. The module mock only proves a function was
called with some arguments, which is rarely the failing part.

**Q: What does an integration test catch that a unit test cannot?**

Anything in the seams. A loading state that never clears, a submit that fires twice, an error branch
that renders nothing, a cache that serves stale data after a mutation. Each individual unit can be
correct while the composition is broken, and in a typical React application that composition is where
most of the risk sits.

**Q: What can this layer not tell you?**

Whether the real server agrees. The handlers are the frontend's assumption about the API, so if the
backend changes a field name every test still passes and production breaks. Closing that needs
something that checks against the real contract — a generated client, a shared schema, or contract
tests. It also cannot see anything requiring a real browser: layout, focus order, actual navigation.

**Q: How do you test a loading state without making the suite slow?**

Add a short delay to one handler in the one test that asserts the pending state, and assert on the
spinner before awaiting the resolved content. The mistake is a global delay, which multiplies across
every test in the suite for no additional confidence.

## What to Read Next

- [Chapter ?? — React Testing Library](#ch-react-testing-library) — the query API these flows are written with
- [Chapter ?? — End-to-End Testing with Playwright](#ch-end-to-end-testing) — what to do with the journeys this layer cannot cover
- [Chapter ?? — Visual and Contract Testing](#ch-visual-and-contract-testing) — closing the gap between your handlers and the real API
