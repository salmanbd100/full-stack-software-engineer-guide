---
title: Integration Testing a Service
part: 5
chapter: 0
slug: integration
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [testing, integration, supertest, testcontainers, backend]
in_book: true
---

# Integration Testing a Service {#ch-integration}

> Test against a real database and a real HTTP layer, and keep the suite fast and independent anyway.

**In this chapter:** what an integration test covers · a real database in a container · isolation between tests · fixtures and factories · substituting third parties · running in parallel

## 💡 The Core Idea

An integration test exercises your service through its actual boundary — an HTTP request in, a real
database underneath — and asserts on what came back and what changed. It is the highest-value test
a backend has, because it covers the parts that break: routing, middleware order, validation,
serialisation, transactions and the query itself.

The two objections are speed and flakiness, and both come from the same cause: **shared state**. An
integration suite that is slow and unreliable is almost always one where tests see each other's
data. Fix the isolation and the suite becomes fast enough to run on every commit.

## Through the Real HTTP Layer

`supertest` mounts your Express app in-process and drives it over a real socket, so middleware,
parsers, error handlers and status codes are all exercised.

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('POST /orders', () => {
  it('creates an order and returns 201 with a Location header', async () => {
    const token = await signInAs('agent');

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'ABC-123', quantity: 2 })
      .expect(201);

    expect(res.headers.location).toBe(`/orders/${res.body.id}`);

    // Assert the side effect, not only the response.
    const row = await db.orders.findUnique({ where: { id: res.body.id } });
    expect(row).toMatchObject({ sku: 'ABC-123', quantity: 2, status: 'pending' });
  });

  it('rejects an unknown field with 400 and names it', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${await signInAs('agent')}`)
      .send({ sku: 'ABC-123', quantity: 2, status: 'paid' }) // mass assignment attempt
      .expect(400);

    expect(res.body.error.fields).toContainEqual({ field: 'status', code: 'unrecognized_keys' });
  });

  it('refuses a viewer with 403', async () => {
    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${await signInAs('viewer')}`)
      .send({ sku: 'ABC-123', quantity: 2 })
      .expect(403);
  });
});
```

Three tests, and between them they cover the happy path, the validation boundary and the
authorisation boundary. That is the shape worth copying per endpoint: **one success, one rejected
input, one rejected caller.**

## A Real Database, Not a Fake One

Substituting SQLite for Postgres, or an in-memory MongoDB for the real one, tests a different
engine. The dialect differs, the constraints differ, the isolation semantics differ — and those are
exactly the things an integration test exists to verify.

Run the real engine in a container, migrated to the current schema.

```typescript
// One container per suite run, torn down after. Testcontainers handles the lifecycle.
let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  await migrate(); // The same migrations production runs — this is part of the test.
}, 60_000);

afterAll(async () => { await container.stop(); });
```

Running the real migrations is not incidental. A migration that fails on an empty database will fail
in production too, and this is where you find out.

## Isolation Is the Whole Problem

| Strategy | Speed | Isolation | Use when |
| -------- | ----- | --------- | -------- |
| **Transaction per test, rolled back** | ✅ Fastest | ✅ Complete | The code under test does not manage its own transactions |
| **Truncate tables between tests** | ⚠️ Fair | ✅ Complete | The default choice; simple and predictable |
| **A schema or database per worker** | ⚠️ Slower setup | ✅ Complete | Running suites in parallel |
| **Delete only what the test created** | ✅ Fast | ❌ Fragile | Never — one missed row and the next test fails |

```typescript
// Truncate everything except the migration ledger, in one statement.
afterEach(async () => {
  const { rows } = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_migrations'`,
  );
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  // CASCADE handles foreign keys; RESTART IDENTITY resets sequences so ids are predictable.
  await db.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
});
```

The transaction-rollback strategy is faster and has one catch worth knowing: if the code under test
opens its own transaction, you now have a nested transaction, and the behaviour you are testing is
not the behaviour production has. Truncation avoids that question entirely.

> ⚠️ Never point a test suite at a shared development or staging database. `TRUNCATE` in a test
> hook has deleted a great deal of real data. The connection string must come from a container the
> suite started.

## Fixtures and Factories

A factory builds a valid object with overrides for the fields the test cares about. It is what keeps
a test readable: the two lines that matter are visible, and the twenty required fields are not.

```typescript
export async function makeOrder(over: Partial<Order> = {}): Promise<Order> {
  const tenant = over.tenantId ? { id: over.tenantId } : await makeTenant();
  return db.orders.create({
    data: {
      tenantId: tenant.id,
      sku: `SKU-${counter++}`, // Unique per call — no unique-constraint collisions.
      quantity: 1,
      status: 'pending',
      ...over,
    },
  });
}

// The test says only what is relevant to it.
const stale = await makeOrder({ status: 'paid', paidAt: daysAgo(40) });
```

Prefer factories over shared seed files. A seed file is global state: every test depends on it,
nobody can change it safely, and reading a test does not tell you what the data looks like.

## Third Parties

Do not call a real payment provider from a test suite. Intercept at the HTTP layer instead of
mocking your own client, so the client's own request-building and error handling are still tested.

```typescript
// MSW intercepts at the network boundary, so the real client code runs.
const server = setupServer(
  http.post('https://api.stripe.com/v1/charges', () =>
    HttpResponse.json({ id: 'ch_test_1', status: 'succeeded' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // Catch unexpected calls.
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` is the setting to keep. Without it, a test that unexpectedly reaches
the internet passes locally and fails in CI.

## Running in Parallel

Integration suites parallelise well once isolation is per worker rather than per suite. Give each
worker its own database — a schema per worker on one container is usually enough — and let the runner
shard the files.

Two things break under parallelism: any test that asserts on a global counter or an auto-increment
value, and any test that binds a fixed port. Use `RESTART IDENTITY` and let the OS assign the port.

## 🔑 Key Takeaways

- Integration tests cover what actually breaks: routing, middleware order, validation, transactions and the query.
- Use the real database engine in a container, migrated by the real migrations.
- Slowness and flakiness are almost always shared state — truncate between tests, or a schema per worker.
- Factories with overrides keep tests readable; shared seed files are global state nobody can change.
- Intercept third parties at the HTTP boundary so your own client code is still under test.

## Interview Questions

**Q: Why not use SQLite in place of Postgres for tests?**

Because it is a different engine: different types, different constraint behaviour, no row-level
security, different transaction and locking semantics. Those differences are precisely what an
integration test is for, so the suite passes while production breaks. A container running the real
version costs a few seconds at start-up and removes the whole class of problem.

**Q: How do you keep an integration suite isolated and still fast?**

By making the isolation cheap rather than skipping it. A transaction per test rolled back at the end
is fastest but interferes with code that manages its own transactions, so truncating every table
with `CASCADE` and `RESTART IDENTITY` is the reliable default. For parallelism, give each worker its
own schema so isolation is per worker rather than per test file.

**Q: Where do you draw the line between an integration test and an end-to-end test?**

An integration test runs the service in-process with real infrastructure and stubs anything outside
the team's control. An end-to-end test runs deployed components together, including the browser, and
is worth having for a handful of critical journeys only. The ratio follows from cost: integration
tests are seconds and deterministic; end-to-end tests are minutes and flaky.

## What to Read Next

- [Chapter ?? — Testing a Node Service](#ch-unit-testing) — what belongs below this layer
- [Chapter ?? — Transactions and Concurrency](#ch-sql-transactions) — the semantics a real engine gives you
- [Chapter ?? — End-to-End Testing](#ch-end-to-end-testing) — the browser layer, and why there should be few of them
