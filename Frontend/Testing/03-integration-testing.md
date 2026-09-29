---
title: Frontend Integration Testing
part: 4
chapter: 17
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

That single rule does a lot of work. It is why this layer catches the bugs that matter: a loading
state that never clears, a form that posts twice, an error path nobody rendered, a cache that serves
stale data after a mutation. None of those live in a function. They live in the seams between
pieces, and a test that mocks those pieces away cannot see them.

It is also why the layer is cheap. There is no browser to start and no server to run, so a
twelve-step user flow costs a few hundred milliseconds.

> ⚠️ **Moving target:** Mock Service Worker rewrote its handler API in version 2. `rest` became `http`,
> and the `res(ctx.json())` chain became a returned `HttpResponse`. Most published examples use a
> shape that no longer runs. The durable principle survives the rewrite: intercept at the network
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
nothing about whether the request had the auth header, hit the right path, or handled a 500. Those
are exactly the things that break in production.

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
falls through to the real network. The test then passes with network access and fails in CI. Worse,
it may quietly hit a live service.

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

Six pieces work together in those four lines, and any of them can be the thing that broke. That is
the point. A unit test of the submit handler would have passed while the button stayed disabled.

### The unhappy paths are where the value is

Happy paths are what developers build and demo, so they are rarely broken. Errors, empty states and
slow responses are what nobody looked at. Override a handler per test:

```tsx
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

```tsx
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

> ⚠️ A `delay()` in a handler is a real wait. Keep it short, and use it only where the pending state
> is the assertion. Ten tests with a 200 ms delay is two seconds of suite time for nothing.

### Reset, or the tests couple themselves together

`server.resetHandlers()` in `afterEach` stops a per-test override from leaking into the next test.
So does a fresh query client per render. With a shared cache, the second test reads the first test's
data, and the failure looks like a component bug.

## When to Use It

| Situation | Test at | Why |
| --------- | ------- | --- |
| A form that validates, submits and confirms | Integration | Every seam in one test, in under a second |
| Loading, error and empty states | Integration, with a handler override | Cheapest place to force each response |
| Cache invalidation after a mutation | Integration | Real query client, real refetch |
| A pure calculation the form uses | Unit | Faster, and covers a hundred cases |
| Routing, real cookies, cross-page state | End-to-end — [Chapter ?? — End-to-End, Visual and Contract Testing with Playwright](#ch-end-to-end-testing) | A real browser is the thing being tested |
| A back-end contract that may have drifted | Contract testing — [Chapter ?? — End-to-End, Visual and Contract Testing with Playwright](#ch-end-to-end-testing) | Handlers are your assumption, not the server's truth |

The last row is the honest limitation. A handler is a statement about what the API returns, written by
the frontend. If the server changes its response, every one of these tests still passes.

## Common Mistakes

❌ **Mocking `fetch` by hand.** You then test a fake, and every call site needs its own setup.
✅ Intercept at the network layer so the real request code runs.

❌ **Omitting `onUnhandledRequest: "error"`.** Unmocked calls silently reach the real network.
✅ Set it, and treat an unhandled request as a failing test.

❌ **Only testing the happy path.** The 500, the 401 and the empty list are the ones that ship broken.
✅ A handler override per failure mode, on every flow that matters.

❌ **Mocking your own components to "isolate" the flow.** The integration is the thing under test. You
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

Because a module mock removes the code most likely to be wrong. Interception keeps the URL building,
the headers, the serialisation and the error mapping in the test. So an assertion about what the user
sees also shows that the request was right. The module mock only proves a function was called with
some arguments, and that is rarely the failing part.

**Q: What does an integration test catch that a unit test cannot?**

Anything in the seams. A loading state that never clears, a submit that fires twice, an error branch
that renders nothing, a cache that serves stale data after a mutation. Each unit can be correct
while the composition is broken. In a typical React application, most of the risk sits in that
composition.

**Q: What can this layer not tell you?**

Whether the real server agrees. The handlers are the frontend's assumption about the API. If the
backend changes a field name, every test still passes and production breaks. Closing that gap needs a
check against the real contract: a generated client, a shared schema, or contract tests. It also
cannot see anything that needs a real browser: layout, focus order, actual navigation.

**Q: How do you test a loading state without making the suite slow?**

Add a short delay to one handler, in the one test that asserts the pending state. Assert on the
spinner before awaiting the resolved content. The mistake is a global delay. It multiplies across
every test in the suite and adds no confidence.

## What to Read Next

- [Chapter ?? — Writing the Tests: Vitest and React Testing Library](#ch-vitest) — the query API these flows are written with
- [Chapter ?? — End-to-End, Visual and Contract Testing with Playwright](#ch-end-to-end-testing) — the journeys this layer cannot cover, and the contract gap between your handlers and the real API
