---
title: React Testing Library
part: 4
chapter: 0
slug: react-testing-library
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-09
tags: [testing-library, react, queries, userevent, accessibility, testing]
in_book: true
---

# React Testing Library {#ch-react-testing-library}

> Query the way a user would, so a refactor changes the markup without changing a single test.

**In this chapter:** why the query API is shaped like this · the three variants · query priority · `userEvent` over `fireEvent` · async without arbitrary waits · one render for every provider

## 💡 The Core Idea

Testing Library gives you **no access to the component**. There is no instance, no state, no props —
only the DOM it produced and the same handles a user has: visible text, accessible roles, labels.

That restriction is the entire design. A test that can only see what a user sees cannot assert on an
implementation detail, so it survives every refactor that keeps behaviour intact. Rename a hook, split
a component in three, move state to a store: the test does not notice, because none of that changed
what appeared on screen.

The second-order effect is the one worth mentioning in an interview. Because the best queries are
accessibility queries, a component that is hard to query is usually a component a screen reader cannot
use either — so the test suite becomes an accessibility check by accident. That connection is made
properly in [Chapter ?? — Testing Accessibility](#ch-testing-accessibility).

## How It Works

### Three query variants, one decision

The prefix decides what happens when the element is not there, and picking the wrong one is the most
common source of a confusing failure.

| Variant | Missing element | Async | Use for |
| ------- | --------------- | ----- | ------- |
| `getBy…` | Throws, printing the DOM | No | It should be there right now |
| `queryBy…` | Returns `null` | No | Asserting something is **absent** |
| `findBy…` | Throws after the timeout | Yes | It appears after a promise resolves |

```tsx
expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // absence
expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument(); // appears later
expect(screen.getAllByRole("listitem")).toHaveLength(3);
```

`getBy` for absence is the mistake: it throws instead of returning null, so the assertion never runs.
And always query through `screen` rather than destructuring from `render` — the failure output is
better and the tests read the same everywhere.

### Query priority is not a style preference

```tsx
screen.getByRole("button", { name: /submit/i }); // 1. how a user and a screen reader find it
screen.getByLabelText(/email/i); // 2. form fields, by their label
screen.getByText(/welcome back/i); // 3. non-interactive content
screen.getByAltText(/profile photo/i); // 4. images
screen.getByTestId("chart-canvas"); // 5. last resort — a canvas has no accessible content
```

Work down that list, and stop at the first one that works. The reason to prefer role and label is
mechanical: those are the properties assistive technology uses, so a query that cannot find a control
is evidence that the markup is wrong, not that the test needs a test id.

`getByTestId` is legitimate for things with no accessible representation, such as a chart canvas. It
is not legitimate as a way past a missing label.

### `userEvent`, not `fireEvent`

`fireEvent` dispatches one event. `userEvent` performs an **interaction**, which is a sequence:
pointer down, focus, key down, input, key up, change. That difference is what catches real bugs.

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

`userEvent` also **refuses to interact with a disabled or hidden element**, which is how a test catches
a button that should have been disabled during submission — `fireEvent.click` on a disabled button
happily fires, and the bug ships. Keep `fireEvent` for the few low-level events `userEvent` does not
model, such as `scroll`. Every call returns a promise, and a missing `await` lets the assertion run
before React re-renders, producing a failure that looks like a component bug and is not.

### Async, without a single arbitrary wait

```tsx
it("shows the loading state, then the profile", async () => {
  render(<UserProfile userId="1" />);

  expect(screen.getByRole("status")).toBeInTheDocument(); // loading
  expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument(); // resolved
  expect(screen.queryByRole("status")).not.toBeInTheDocument(); // gone
});
```

`findBy` polls until the element exists or the timeout expires, so it waits exactly as long as
needed. Reach for `waitFor` only when the condition is not a single query — a count, or two
assertions that must hold together — and `waitForElementToBeRemoved` when the thing you care about is
a disappearance.

> ⚠️ `waitFor(() => screen.getByText("x"))` is `findByText` written the long way, with worse error
> output. If you have written that, replace it.

### One custom render for the provider tree

Nearly every component needs a router, a query client and a theme. Wrapping them per test is how the
setup drifts between files.

```tsx
// test-utils.tsx — re-exports everything from the real module, with render shadowed
function AllProviders({ children }: { children: ReactNode }) {
  // retry: false — otherwise a failing request test waits out three retries
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
export { customRender as render }; // shadow the real render
```

A fresh `QueryClient` per render matters: a shared one carries cached data into the next test, which
is the leaked-state failure from [Chapter ?? — Testing Strategy](#ch-testing-strategy) in its most
confusing form.

### Read the failure before changing the query

```tsx
screen.debug(); // the current DOM
logRoles(screen.getByRole("form")); // every role available, with its accessible name
```

When `getByRole` fails, the output already lists the roles that exist. Nine times in ten it says the
button has no accessible name, which is the actual bug.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| A component's visible behaviour | Testing Library in Vitest | Fast, and asserts what a user observes |
| A hook with no UI of its own | `renderHook` | Cheaper than building a host component |
| A hook with meaningful UI consequences | A small host component | Closer to real usage; catches render-loop bugs |
| Layout, focus rings, real scrolling | Browser mode or Playwright | jsdom has no layout engine |
| A whole journey across pages | Playwright — [Chapter ?? — End-to-End Testing with Playwright](#ch-end-to-end-testing) | Routing and a real build are the thing being tested |

## Common Mistakes

❌ **`getBy` when asserting absence.** It throws before the assertion runs, so the test fails for the
wrong reason.
✅ `queryBy` returns `null`, which is what `not.toBeInTheDocument()` needs.

❌ **A missing `await` on a `userEvent` call.** The assertion runs before React re-renders.
✅ `await` every interaction; `userEvent.setup()` once per test.

❌ **`getByTestId` because the role query failed.** The failing query was telling you the markup has
no accessible name.
✅ Fix the label. Keep test ids for content with no accessible representation.

❌ **`container.querySelector("div > button")`.** Any markup change breaks it, and it asserts nothing
a user cares about.
✅ Roles and accessible names, which survive restructuring.

❌ **Sharing a `QueryClient` between tests.** Cached data leaks forward and produces order-dependent
failures.
✅ Construct it inside the wrapper so each render gets a fresh one.

## 🔑 Key Takeaways

- Testing Library exposes only the DOM, which is what makes its tests survive refactors.
- The query prefix decides missing-element behaviour: `getBy` throws, `queryBy` returns null, `findBy` waits.
- Query priority follows what assistive technology uses, so a failing role query is usually a markup bug.
- `userEvent` fires the whole interaction sequence and refuses disabled elements; `fireEvent` does neither.
- `findBy` removes every reason to write an arbitrary wait.

## Interview Questions

**Q: Why does Testing Library refuse to give you access to component state?**

Because a test that can read internals will assert on them, and then every refactor breaks tests
without any behaviour changing. Restricting the test to the DOM means it fails only when what the user
sees changes — which is the only failure worth a developer's attention. The cost is that genuinely
internal logic has to be extracted and unit-tested separately, which is usually better structure anyway.

**Q: When is `getByTestId` acceptable?**

When the element has no accessible representation to query — a chart canvas, a map layer, a decorative
wrapper you need to assert exists. It is not acceptable as a workaround for a control with no
accessible name, because there the failing role query is a real accessibility defect and the test id
hides it.

**Q: How do you test a custom hook?**

`renderHook` for a hook with no UI consequences — it is faster than building a host component and the
assertions are direct. For anything whose point is what it renders, or that could loop on re-render,
build a small component and test through it: that is closer to real usage and catches the class of bug
`renderHook` cannot see, like an effect that re-runs forever.

## What to Read Next

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — the same queries against a faked network
- [Chapter ?? — Testing React](#ch-testing-react) — Server Components, Suspense, and which level a React test belongs at
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — where the role queries above become a conformance check
