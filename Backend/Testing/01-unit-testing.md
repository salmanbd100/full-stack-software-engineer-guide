---
title: Testing a Node Service
part: 5
chapter: 0
slug: unit-testing
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [testing, nodejs, vitest, test-doubles, backend]
in_book: true
---

# Testing a Node Service {#ch-unit-testing}

> Decide what a service's unit tests are worth testing, and inject dependencies so you barely need mocks.

**In this chapter:** where the value is in a backend test suite · what to unit test · injection against module mocking · time, randomness and the clock · error paths

## 💡 The Core Idea

The discipline of testing — the pyramid, arrange-act-assert, the vocabulary of doubles, when to
practise TDD — is [Chapter ?? — Testing Fundamentals](#ch-testing-fundamentals) in Part IV, and it
applies unchanged here. This chapter is about what is different on the server.

Two things are. First, **most of a service's behaviour is in its integration with a database and an
HTTP boundary**, not in its pure functions — so the pyramid for a backend is flatter than for a UI,
with more weight on integration tests. Second, **a service's dependencies are processes, not
components**: a database, a queue, a payment provider. How you substitute those decides how much of
your suite is worth running.

The practical consequence: unit test the logic that is genuinely branchy, and let integration tests
cover the wiring. A unit test of a controller that mocks the database, the logger and the clock tests
your mocks.

## What to Unit Test

| Test it | Do not |
| ------- | ------ |
| Business rules with branches — pricing, eligibility, state transitions | A controller that reads a request and calls one service method |
| Pure transformations — parsers, formatters, mappers | An ORM query with the ORM mocked |
| Validation schemas, including the rejections | A configuration object |
| Error translation — provider error to your error type | A getter |
| Anything a bug report has ever come from | Code with no branches |

The highest-value backend unit test is the one over a rule with several conditions, because that is
where the combinations are and where reading the code is not enough to be sure.

```typescript
// The rule under test is worth testing: four branches, all reachable.
describe('refundEligibility', () => {
  const order = (over: Partial<Order> = {}): Order =>
    ({ status: 'paid', total: 100, paidAt: daysAgo(5), ...over }) as Order;

  it.each([
    ['allows a recent paid order',        order(),                              'allowed'],
    ['refuses an unpaid order',           order({ status: 'pending' }),          'not_paid'],
    ['refuses beyond the 30-day window',  order({ paidAt: daysAgo(31) }),        'window_closed'],
    ['refuses above the agent limit',     order({ total: 5_000 }),               'over_limit'],
  ])('%s', (_name, input, expected) => {
    expect(refundEligibility(input, { refundLimit: 1_000 }).reason).toBe(expected);
  });
});
```

A table-driven test like this one is the right shape for a rule: the cases are readable side by
side, and adding the fifth condition is one row.

## Injection Beats Module Mocking

Every dependency a function reaches for directly is a dependency you must mock. Every dependency
passed in is one you can substitute with three lines.

```typescript
// ❌ Reaches for the world. Testing it needs vi.mock on three modules.
export async function chargeOrder(orderId: string): Promise<void> {
  const order = await db.orders.findUnique({ where: { id: orderId } });
  await stripe.charges.create({ amount: order!.total });
  logger.info({ orderId }, 'charged');
}

// ✅ Dependencies are parameters. The test passes a fake object, no framework involved.
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

```typescript
it('marks the order paid with the charge id', async () => {
  const markPaid = vi.fn();
  await chargeOrder({
    orders: { find: async () => ({ id: 'o1', total: 100 }) as Order, markPaid },
    payments: { charge: async () => ({ id: 'ch_1' }) },
    clock: () => new Date('2026-09-01T00:00:00Z'),
  }, 'o1');

  expect(markPaid).toHaveBeenCalledWith('o1', 'ch_1', new Date('2026-09-01T00:00:00Z'));
});
```

`vi.mock` and `jest.mock` are hoisted, module-scoped and order-sensitive, which makes them the most
common source of confusing test failures. Reach for them when you cannot change the code — a
third-party module imported deep in a call chain — and not as the default.

> ⚠️ Mocking your own database layer to unit test a query is the highest-cost, lowest-value test
> there is. It asserts that your code calls the ORM the way you wrote it, passes when the query is
> wrong, and breaks whenever you refactor. Test queries against a real database — see
> [Chapter ?? — Integration Testing a Service](#ch-integration).

## Time, Randomness and Ids

Anything non-deterministic must be injectable, or the test is flaky by construction.

```typescript
// Fake timers for code you cannot restructure — retries, debounces, schedulers.
it('backs off before the second attempt', async () => {
  vi.useFakeTimers();
  const attempt = vi.fn().mockRejectedValueOnce(new TimeoutError()).mockResolvedValue('ok');

  const promise = retry(attempt, 3);
  await vi.advanceTimersByTimeAsync(1_000); // No real waiting.

  await expect(promise).resolves.toBe('ok');
  expect(attempt).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
```

The same argument applies to `Math.random`, `crypto.randomUUID` and `Date.now`. Passing a `clock`
and an `idGenerator` costs one parameter and removes a whole class of intermittent failure.

## Error Paths Are the Point

Backend bugs live in the failure branches, which is exactly where coverage is usually thinnest.

```typescript
it('translates a provider timeout into a 502, preserving the cause', async () => {
  const cause = new TimeoutError('stripe');
  const deps = { ...base, payments: { charge: async () => { throw cause; } } };

  const error = await chargeOrder(deps, 'o1').catch((e: unknown) => e as AppError);

  expect(error.status).toBe(502);
  expect(error.expose).toBe(false); // The client must not see the provider's message.
  expect(error.cause).toBe(cause);
});
```

Assert on the **shape you promised** — status, code, exposure — not on the message text, which is
prose and will change.

## Common Mistakes

**❌ Asserting on implementation.** `expect(repo.find).toHaveBeenCalledWith(...)` breaks on every
refactor and passes when the behaviour is wrong. Assert on the outcome where you can.

**❌ Chasing 100% coverage.** Coverage is a floor for finding untested branches, not a target. A
suite written to satisfy a percentage tests getters.

**❌ Shared mutable state between tests.** A module-level array or a seeded record that one test
mutates makes the suite order-dependent, and it will only fail in CI.

**❌ Snapshotting an API response.** Every field change becomes a snapshot update nobody reads.
Assert on the fields that form the contract.

## 🔑 Key Takeaways

- A backend pyramid is flatter than a frontend one: most behaviour is in the integration, not in pure functions.
- Unit test branchy rules and pure transformations; let integration tests cover controllers and queries.
- Dependencies as parameters remove the need for module mocking, which is the main source of confusing failures.
- Mocking your own data layer produces tests that pass while the query is broken.
- Inject the clock and the id generator; non-determinism is what makes a suite flaky.

## Interview Questions

**Q: What do you not unit test in a service?**

Controllers that only translate a request into one service call, and any query with the database
mocked — both assert that the code is written the way it is written. They break on refactors and stay
green when the behaviour is wrong. Those belong in integration tests against a real database and a
real HTTP layer.

**Q: Dependency injection or `vi.mock`?**

Injection wherever the code is mine. A fake object passed as a parameter is explicit, type-checked,
and has no hoisting or module-registry behaviour to reason about. `vi.mock` is for modules I cannot
restructure — a third-party client imported several levels down — and it should be the exception,
because module mocks are the usual cause of tests that fail depending on import order.

**Q: How do you test code that retries with exponential backoff?**

Fake timers, so the test advances the clock instead of waiting: assert the number of attempts and,
if the schedule matters, the delay between them. The alternative is injecting the sleep function,
which is cleaner still. What you must not do is shorten the real delays for tests, because then the
schedule is not what production runs.

## What to Read Next

- [Chapter ?? — Integration Testing a Service](#ch-integration) — the real database, the real HTTP layer
- [Chapter ?? — Testing Fundamentals](#ch-testing-fundamentals) — the pyramid, AAA and the vocabulary of doubles
- [Chapter ?? — Error Handling in Node](#ch-nodejs-error-handling) — the error shape these tests assert on
