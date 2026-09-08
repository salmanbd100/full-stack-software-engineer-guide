---
title: Testing a Node Service
part: 5
chapter: 0
slug: testing-node-services
level: advanced
reading_time: 11
updated: 2026-09-08
tags: [testing, nodejs, vitest, supertest, testcontainers]
in_book: true
---

# Testing a Node Service {#ch-testing-node-services}

> Put most of the weight on tests that go through the real HTTP layer into a real database, and keep them isolated so they stay fast.

**In this chapter:** why a backend pyramid is flatter · what to unit test · injection against module mocking · a real database in a container · isolation, factories and third parties

## 💡 The Core Idea

The discipline of testing — the pyramid, arrange-act-assert, the vocabulary of doubles, when to
practise TDD — is [Chapter ?? — Testing Strategy](#ch-testing-strategy) in Part IV and applies
unchanged here. This chapter is about what is different on the server.

Two things are. First, **most of a service's behaviour is in its integration with a database and an
HTTP boundary**, not in its pure functions — so the backend pyramid is flatter than a UI's. Second,
**a service's dependencies are processes, not components**: a database, a queue, a payment provider.
How you substitute those decides how much of your suite is worth running.

The consequence: unit test the logic that is genuinely branchy, and let tests through the real
boundary cover the wiring. A unit test of a controller that mocks the database, the logger and the
clock tests your mocks.

## When to Use It

| Behaviour | Test at | Why |
| --------- | ------- | --- |
| Business rules with branches — pricing, eligibility, state transitions | Unit | The combinations are the risk, and they are cheap to enumerate |
| Pure transformations, validation schemas, error translation | Unit | Deterministic, no I/O, fast |
| Routing, middleware order, serialisation, status codes | Integration | Only real if the real stack runs |
| Any query, and any transaction | Integration | A mocked ORM asserts you wrote the code you wrote |
| A controller that reads a request and calls one method | Neither | There is no branch to get wrong |
| A handful of critical user journeys | End-to-end | Minutes and flaky — worth it only for a few |

## How It Works

### Injection beats module mocking

Every dependency a function reaches for directly is a dependency you must mock. Every dependency
passed in is one you substitute with three lines.

```typescript
// The version that reaches for db, stripe and logger directly needs vi.mock on three
// modules to test. This one takes them as parameters, so the test passes a plain object
// and no framework is involved.
interface Deps {
  orders: Pick<OrderRepo, 'find' | 'markPaid'>;
  payments: { charge(amount: number): Promise<{ id: string }> };
  clock: () => Date;
}

export async function chargeOrder(deps: Deps, orderId: string): Promise<void> {
  const order = await deps.orders.find(orderId);
  if (!order) throw new NotFoundError('Order');
  const { id } = await deps.payments.charge(order.total);
  await deps.orders.markPaid(orderId, id, deps.clock());
}
```

`vi.mock` and `jest.mock` are hoisted, module-scoped and order-sensitive, which makes them the most
common source of confusing test failures. Reach for them when you cannot change the code — a
third-party module imported deep in a call chain — not as the default.

The same argument covers non-determinism: injecting a `clock` and an `idGenerator` costs one
parameter each and removes a whole class of intermittent failure. Where the code cannot be
restructured — retries, debounces, schedulers — use fake timers and advance the clock rather than
shortening the real delays, because a shortened schedule is not the one production runs.

> ⚠️ Mocking your own database layer to unit test a query is the highest-cost, lowest-value test
> there is. It asserts that your code calls the ORM the way you wrote it, passes when the query is
> wrong, and breaks whenever you refactor.

### Through the real HTTP layer

`supertest` mounts the app in-process and drives it over a real socket, so middleware, parsers, error
handlers and status codes are all exercised.

```typescript
it('creates an order and returns 201 with a Location header', async () => {
  const res = await request(app)
    .post('/orders')
    .set('Authorization', `Bearer ${await signInAs('agent')}`)
    .send({ sku: 'ABC-123', quantity: 2 })
    .expect(201);

  expect(res.headers.location).toBe(`/orders/${res.body.id}`);

  // Assert the side effect, not only the response.
  const row = await db.orders.findUnique({ where: { id: res.body.id } });
  expect(row).toMatchObject({ sku: 'ABC-123', quantity: 2, status: 'pending' });
});
```

The shape worth copying per endpoint is three tests: **one success, one rejected input, one rejected
caller.** Between them they cover the happy path, the validation boundary and the authorisation
boundary — including the mass-assignment attempt, where a request sends `status: 'paid'` and the
schema must reject the unrecognised key by name.

### A real database, not a fake one

Substituting SQLite for Postgres, or an in-memory MongoDB for the real one, tests a different engine:
different types, different constraint behaviour, different transaction and locking semantics. Those
differences are exactly what an integration test exists to catch, so the suite passes while
production breaks.

```typescript
// One container per suite run. Testcontainers owns the lifecycle.
let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  await migrate(); // The same migrations production runs — this is part of the test.
}, 60_000);

afterAll(() => container.stop());
```

Running the real migrations is not incidental: a migration that fails on an empty database will fail
in production too, and this is where you find out.

### Isolation is the whole problem

An integration suite that is slow and unreliable is almost always one where tests see each other's
data. Fix the isolation and it becomes fast enough to run on every commit.

| Strategy | Speed | Isolation | Use when |
| -------- | ----- | --------- | -------- |
| **Transaction per test, rolled back** | ✅ Fastest | ✅ Complete | The code under test does not manage its own transactions |
| **Truncate tables between tests** | ⚠️ Fair | ✅ Complete | The default choice; simple and predictable |
| **A schema or database per worker** | ⚠️ Slower setup | ✅ Complete | Running suites in parallel |
| **Delete only what the test created** | ✅ Fast | ❌ Fragile | Never — one missed row and the next test fails |

One statement in `afterEach` clears everything: select every table in `public` except the migration
ledger from `pg_tables`, then `TRUNCATE "a", "b", … RESTART IDENTITY CASCADE`. `CASCADE` handles
foreign keys, and `RESTART IDENTITY` resets sequences so ids stay predictable.

Rollback is faster and has one catch: if the code under test opens its own transaction you now have
a nested one, and the behaviour you are testing is not the behaviour production has. Truncation
avoids the question.

> ⚠️ Never point a test suite at a shared development or staging database. `TRUNCATE` in a test hook
> has deleted a great deal of real data. The connection string must come from a container the suite
> started.

### Factories and third parties

A factory builds a valid object with overrides for the fields the test cares about, so the two lines
that matter are visible and the twenty required fields are not:

```typescript
export async function makeOrder(over: Partial<Order> = {}): Promise<Order> {
  const tenant = over.tenantId ? { id: over.tenantId } : await makeTenant();
  return db.orders.create({
    data: {
      tenantId: tenant.id,
      sku: `SKU-${counter++}`, // Unique per call — no unique-constraint collisions.
      quantity: 1, status: 'pending', ...over,
    },
  });
}
```

Prefer factories over shared seed files. A seed file is global state: every test depends on it,
nobody can change it safely, and reading a test does not tell you what the data looks like.

For a third party, intercept at the HTTP boundary rather than mocking your own client, so the
client's request-building and error handling are still under test.

```typescript
// MSW intercepts at the network boundary, so the real client code runs.
const server = setupServer(
  http.post('https://api.stripe.com/v1/charges', () =>
    HttpResponse.json({ id: 'ch_test_1', status: 'succeeded' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // Catch unexpected calls.
```

`onUnhandledRequest: 'error'` is the setting to keep. Without it, a test that unexpectedly reaches
the internet passes locally and fails in CI.

## Common Mistakes

**❌ Asserting on implementation.** `expect(repo.find).toHaveBeenCalledWith(...)` breaks on every
refactor and passes when the behaviour is wrong. Assert on the outcome where you can.

**❌ Snapshotting an API response.** Every field change becomes a snapshot update nobody reads.
Assert on the fields that form the contract.

**❌ Shared mutable state between tests.** A module-level array or a seeded record that one test
mutates makes the suite order-dependent, and it will only fail in CI.

**❌ Chasing 100% coverage.** Coverage is a floor for finding untested branches, not a target. A
suite written to satisfy a percentage tests getters — and one that asserts on error *message* text
breaks on prose changes. Assert the shape you promised: status, code, whether it is safe to expose.

## 🔑 Key Takeaways

- A backend pyramid is flatter than a frontend one: most behaviour is in the integration, not in pure functions.
- Dependencies as parameters remove the need for module mocking, which is the main source of confusing failures.
- Mocking your own data layer produces tests that pass while the query is broken.
- Use the real database engine in a container, migrated by the real migrations.
- Slowness and flakiness are almost always shared state — truncate between tests, or a schema per worker.

## Interview Questions

**Q: What do you not unit test in a service?**

Controllers that only translate a request into one service call, and any query with the database
mocked — both assert that the code is written the way it is written. They break on refactors and stay
green when the behaviour is wrong. Those belong in tests against a real database and a real HTTP
layer.

**Q: Dependency injection or `vi.mock`?**

Injection wherever the code is mine. A fake object passed as a parameter is explicit, type-checked,
and has no hoisting or module-registry behaviour to reason about. `vi.mock` is for modules I cannot
restructure — a third-party client imported several levels down — and it should be the exception,
because module mocks are the usual cause of tests that fail depending on import order.

**Q: How do you keep an integration suite isolated and still fast?**

By making the isolation cheap rather than skipping it. A transaction per test rolled back at the end
is fastest but interferes with code that manages its own transactions, so truncating every table
with `CASCADE` and `RESTART IDENTITY` is the reliable default. For parallelism, give each worker its
own schema so isolation is per worker rather than per test file.

## What to Read Next

- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — the pyramid, AAA and the vocabulary of doubles
- [Chapter ?? — Transactions and Concurrency](#ch-sql-transactions) — the semantics a real engine gives you
- [Chapter ?? — End-to-End Testing](#ch-end-to-end-testing) — the browser layer, and why there should be few of them
