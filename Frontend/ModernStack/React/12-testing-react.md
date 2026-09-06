---
title: Testing React
part: 3
chapter: 0
slug: testing-react
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-06
tags: [react, testing, rsc, suspense, vitest, playwright]
in_book: true
---

# Testing React {#ch-testing-react}

> Decide what is worth asserting in a React application, and where Server Components and Suspense move the test rather than break it.

**In this chapter:** the one rule · what to test at which level · testing a Server Component · async and Suspense · what not to test

## 💡 The Core Idea

There is one rule, and every other decision follows from it: **test the contract, not the
implementation.** The contract is what the user and the caller depend on — what appears on screen, what
happens when they click, what the component asks the server for. The implementation is the state
variables, the hook order, the class names and the file layout.

The difference shows up on refactor day. A test written against the contract keeps passing when
`useState` becomes `useReducer`, and fails when the button stops saving. A test written against the
implementation does the opposite, which is worse than no test: it costs work and it does not warn you.

> A test suite that breaks whenever the code is tidied has taught the team that refactoring is
> expensive. That is the real cost of testing implementation details.

## How It Works

### The level a test belongs at

React tempts you to write everything as a component test. Most things belong elsewhere.

| What you are testing                          | Test at                            | Why                                          |
| --------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| A calculation, a formatter, a reducer         | A plain unit test                   | No React needed; a hundred cases cost nothing |
| A component's visible behaviour                | Testing Library, in Vitest          | Renders, interacts, asserts on the DOM        |
| A custom hook with no UI                       | `renderHook`                        | Faster than building a host component         |
| A route that composes server data and UI       | Playwright against a real build     | The composition is what breaks                |
| A prop or return-type contract                 | `tsc`                               | The compiler is already a test runner         |

The mistake worth naming: pushing logic *into* components so that it can only be tested through the DOM.
Extract the calculation, test it directly, and let the component test assert that the number reaches the
screen.

### Querying the way a user does

The query priority — role first, then label, then text, and `data-testid` only when nothing accessible
identifies the element — is the mechanical half of Testing Library and belongs to
[Chapter ?? — React Testing Library](#ch-react-testing-library). Two consequences matter here.

First, `getByRole("button", { name: "Save" })` fails when the button loses its accessible name, so a
test written this way is also an accessibility check that nobody had to schedule.

Second, `userEvent` over `fireEvent`. `fireEvent` dispatches one synthetic event; `userEvent` performs
the whole interaction — focus, key events, the change — which is what actually happens in a browser and
what your handler will actually receive.

```tsx
const user = userEvent.setup();
render(<SaveDraft />);

await user.click(screen.getByRole("button", { name: "Save" }));
expect(await screen.findByText("Draft saved")).toBeVisible();
```

### Async, Suspense and the `act` warning

Almost every confusing React test failure is the same failure: something updated state after the test
finished. The warning says "not wrapped in `act`", which is misleading — the fix is rarely to call
`act`.

```tsx
// ❌ Asserts before the request resolves, then updates state after the test ends
render(<Profile id="1" />);
expect(screen.getByText("Ada")).toBeInTheDocument();

// ✅ Wait for the state the component reaches
render(<Profile id="1" />);
expect(await screen.findByRole("heading", { name: "Ada" })).toBeVisible();
```

`findBy*` is `getBy*` plus waiting, and it is the answer nearly every time. The two other cases:

- **A Suspense fallback.** Assert that the skeleton is there, then `await findBy*` for the content. Both
  states are real and both are worth one assertion.
- **An error path.** Render the component inside its error boundary and assert on the fallback. A
  boundary test that does not include the boundary is testing nothing.

### Testing Server Components

An async Server Component is not a client component and Testing Library cannot render it. It runs on the
server, once, and returns a tree. That leaves three approaches, in order of how much they are worth.

| Approach                                        | Good for                              | Cost                                    |
| ----------------------------------------------- | ------------------------------------- | --------------------------------------- |
| Extract the data work into plain functions       | The query, the shaping, the auth check | Cheapest and catches the most bugs      |
| Call the component as a function and assert on the returned tree | Simple, single-level output | Brittle; asserts on element structure   |
| Playwright against a real build                  | The composed route, end to end        | Slowest, and the only real confidence   |

The practical division: **push everything interesting out of the Server Component and into functions you
can call directly**, then cover the assembled route with a small number of end-to-end tests. A Server
Component that only fetches and lays out has very little left to unit test — which is a sign it is
written correctly.

Client Components are unchanged. They render in a DOM, so they test exactly as they always did — which
is another reason to keep the interactive parts of a route on that side of the boundary.

> ⚠️ **Moving target:** first-class Server Component test runners are still arriving, and the
> recommended setup has changed with each React and framework release. The durable principle is that
> logic tested outside the component does not care which runner wins.

### What not to test

- **State and internals.** Asserting that `isOpen` became `true` tests the variable, not the menu.
  Assert that the menu is visible.
- **Library behaviour.** Your router navigates, your form library validates. Test your usage, not their
  implementation.
- **Everything, via snapshots.** A large snapshot fails on every change and is approved without being
  read. Snapshot small, stable output — an error message, a formatted address — or nothing.
- **Coverage for its own sake.** A line that runs during an unrelated test is covered and untested.

## When to Use It

| Situation                                              | Reach for                                     |
| ------------------------------------------------------ | --------------------------------------------- |
| Pure logic behind a component                           | A unit test on the extracted function         |
| A form with validation and a submit path                | Testing Library plus `userEvent`              |
| A hook that manages subscriptions or timers             | `renderHook` with fake timers                 |
| An async Server Component                               | Test the data functions; cover the route in E2E |
| A component that suspends                               | Assert the fallback, then `await findBy*`     |
| A regression a user reported                            | The narrowest test that would have caught it  |
| A component whose only behaviour is layout              | Nothing — or a visual regression check        |

## Common Mistakes

**❌ Reaching for `data-testid` first.** It is the escape hatch, not the default. Every `testid` query is
one that would have failed if the element stopped being reachable by role or label, and now will not.

**❌ Asserting on state instead of output:**

```tsx
// ❌ Tests the implementation — a refactor to useReducer breaks it
expect(result.current.isOpen).toBe(true);

// ✅ Tests the contract
expect(screen.getByRole("menu")).toBeVisible();
```

**❌ Mocking everything below the component.** Once every child and every hook is mocked, the test
asserts that mocks were called. Mock the network boundary — a request handler at the fetch layer — and
let the real components run.

**❌ Waiting with an arbitrary timeout.** `await new Promise((r) => setTimeout(r, 500))` is slow when it
works and flaky when it does not. Wait for the state you expect, with `findBy*` or `waitFor`.

**❌ Testing the Server Component instead of what it does.** Calling an async component and asserting on
its element tree couples the test to the JSX structure and still misses the serialisation, the streaming
and the client boundary — the three things that actually go wrong.

## 🔑 Key Takeaways

- Test the contract — what renders and what happens on interaction — never the state variables behind it.
- Extract logic out of components and test it directly; reserve component tests for behaviour.
- `findBy*` resolves nearly every "not wrapped in act" warning, because the real problem is an unawaited update.
- Async Server Components are not renderable by Testing Library — test their data functions, then cover the route end to end.
- Mock at the network boundary; mocking children turns a test into an assertion about mocks.

## Interview Questions

**Q: Why does Testing Library push you towards `getByRole` rather than a test id?**

Because a role query goes through the same accessibility tree a screen reader uses, so it only passes if
the element is actually reachable and correctly labelled. That makes the test resemble real use and
turns every query into a small accessibility assertion. `data-testid` bypasses all of it and keeps
passing after the element becomes unusable.

**Q: How do you test an async Server Component?**

Mostly by not testing it as a component. It runs on the server and returns a tree, so Testing Library
cannot render it. Move the fetching, authorisation and data shaping into plain functions and unit-test
those, then cover the assembled route with an end-to-end test against a real build. If a Server
Component has substantial logic left after that, the logic is in the wrong place.

**Q: A test fails with "an update was not wrapped in act". What is actually wrong?**

Something updated state after the assertion ran — usually a fetch that resolved once the test had moved
on. The fix is to wait for the state the component reaches, with `findBy*` or `waitFor`, rather than
wrapping things in `act`. If the update genuinely should not happen, the second option is to control the
async boundary in the test, with a mocked request handler or fake timers.

**Q: When is a component test the wrong tool?**

When the logic has nothing to do with rendering, and when the risk lives in composition. Pure functions
should be tested directly — a hundred cases in milliseconds. Routes that combine server data, streaming
and a client boundary should be tested end to end, because each piece can pass in isolation and still
fail assembled. Component tests sit between the two and are best kept for interaction behaviour.

## What to Read Next

- [Chapter ?? — React Testing Library](#ch-react-testing-library) — the query API and setup in detail
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — why the boundary changes the test
- [Chapter ?? — End-to-End Testing](#ch-e2e-testing) — where composed routes are actually covered
