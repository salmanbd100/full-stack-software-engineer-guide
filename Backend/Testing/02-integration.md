# Integration Testing

## 💡 What Is an Integration Test?

An integration test runs **multiple real components together** — usually your app code plus a real database, real HTTP server, and real third-party clients (or close fakes). It checks that the seams between layers actually work.

> A unit test asks "does this function compute correctly?" An integration test asks "does my code talk to the database and HTTP layer correctly?"

---

## When to Use

| Scenario                                | Use Integration Test? |
| --------------------------------------- | --------------------- |
| Test a SQL query returns right rows     | ✅                     |
| Test API endpoint returns 201 on create | ✅                     |
| Test ORM relations load correctly       | ✅                     |
| Test pure utility function              | ❌ Use unit test       |
| Test third-party billing flow           | ❌ Use E2E or sandbox  |

---

## API Testing with Supertest

`supertest` wraps your Express/Fastify app and makes HTTP-style assertions without binding a real port.

```typescript
import request from "supertest";
import { app } from "../src/app";

describe("POST /users", () => {
  test("creates a user and returns 201", async () => {
    const response = await request(app)
      .post("/users")
      .send({ email: "ada@example.com", name: "Ada" })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: "ada@example.com",
    });
  });

  test("returns 400 when email is missing", async () => {
    await request(app)
      .post("/users")
      .send({ name: "Ada" })
      .expect(400);
  });
});
```

---

## Database Testing

Three common strategies:

### 1. Real DB + Transactions (Recommended)

Wrap each test in a transaction, roll back at the end. Fast and isolated.

```typescript
import { db } from "../src/db";

beforeEach(async () => {
  await db.query("BEGIN");
});

afterEach(async () => {
  await db.query("ROLLBACK");
});

test("inserts a user", async () => {
  await db.query("INSERT INTO users (email) VALUES ($1)", ["ada@example.com"]);
  const { rows } = await db.query("SELECT * FROM users");
  expect(rows).toHaveLength(1);
});
```

### 2. Testcontainers

Spin up a real database container per test run. Slower start, real parity.

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container;
let connectionUri: string;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  connectionUri = container.getConnectionUri();
});

afterAll(async () => {
  await container.stop();
});
```

### 3. In-Memory Stand-in

SQLite for tests when prod is Postgres. Fast but loses DB-specific features (`JSONB`, window functions). **Risky** — production behavior may differ.

> Senior teams usually pick #1 or #2. Don't fake the DB in integration tests if the schema or queries are non-trivial.

---

## Test Data Setup

**❌ Bad — every test creates its own users from scratch:**

```typescript
test("a", async () => {
  await db.query("INSERT INTO users ...");
  await db.query("INSERT INTO orders ...");
  // ...20 more lines
});
```

**✅ Good — use factories:**

```typescript
// test-factories.ts
export async function createUser(overrides: Partial<User> = {}): Promise<User> {
  return userRepo.insert({
    email: `user-${Date.now()}@example.com`,
    name: "Test User",
    ...overrides,
  });
}

// in tests
test("user can place order", async () => {
  const user = await createUser({ tier: "pro" });
  // ...
});
```

---

## Avoiding Cross-Test Pollution

**Problem:** Test A inserts a user, Test B counts users — gets 1 unexpectedly.

**Solutions (best to worst):**

1. Transaction rollback per test (fastest)
2. Truncate tables in `beforeEach`
3. Unique data per test (random emails)

```typescript
beforeEach(async () => {
  await db.query("TRUNCATE users, orders, payments RESTART IDENTITY CASCADE");
});
```

---

## Mocking External Services

Internal DB → keep real.
External APIs (Stripe, SendGrid) → mock at the HTTP boundary.

```typescript
import nock from "nock";

test("sends welcome email on signup", async () => {
  const scope = nock("https://api.sendgrid.com")
    .post("/v3/mail/send")
    .reply(202);

  await request(app).post("/signup").send({ email: "ada@example.com" });

  expect(scope.isDone()).toBe(true);
});
```

> Mock at the HTTP layer (`nock`, `msw`), not inside your service code. This catches request-shape bugs.

---

## Parallel Tests

Jest runs test files in parallel by default. For DB tests this means **separate schemas per worker**:

```typescript
// jest.setup.ts
const workerId = process.env.JEST_WORKER_ID;
process.env.DATABASE_URL = `postgres://localhost/test_db_${workerId}`;
```

Without isolation, parallel tests trample each other.

---

## Speed Tips

| Tactic                         | Speedup                          |
| ------------------------------ | -------------------------------- |
| Transaction rollback           | 10–50× faster than truncate      |
| Reuse DB connection            | Skips TCP handshake              |
| Skip migrations between runs   | Use `--passWithNoTests` smartly  |
| Tag slow tests, run separately | Keep dev loop snappy             |

---

## Interview Q&A

**Q: How do you keep integration tests isolated?**
A: Wrap each test in a transaction and roll back, or truncate tables between tests. Use unique data per test if both approaches are too slow.

**Q: Should you mock the database in integration tests?**
A: No. The whole point is to verify the real DB queries work. Mock at the *external* boundary (HTTP APIs, message queues), not at your own data layer.

**Q: Integration tests are slow — what do you do?**
A: Use transaction rollback over truncate, parallelize with isolated schemas, mock external HTTP calls, and split fast/slow suites so dev feedback stays under a minute.

---

## Best Practices

✅ Use a real database — same engine and version as production
✅ Reset state between tests (transactions or truncate)
✅ Use factories for test data, not copy-pasted inserts
✅ Mock only external HTTP services
✅ Run in CI with isolated DB per worker
❌ Don't share state across tests
❌ Don't use SQLite to test Postgres-specific features
❌ Don't mock your own service layer in integration tests

---

[← Previous: Unit Testing](./01-unit-testing.md) | [Next: E2E Testing →](./03-e2e.md)
