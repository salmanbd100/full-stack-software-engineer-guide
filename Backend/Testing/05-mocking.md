# Mocking & Stubbing

## 💡 Why Replace Real Dependencies?

When testing a unit, you often want to control what its dependencies do. A real database is slow. A real payment API costs money. A real `Date.now()` makes tests time-dependent. Replacing these with fakes makes tests fast, deterministic, and focused on the unit under test.

> The goal isn't to mock things — it's to **isolate the unit you're testing**.

---

## Test Double Vocabulary

These terms are often used interchangeably, but they mean different things. Get them right in interviews.

| Term      | Purpose                                            | Example                                       |
| --------- | -------------------------------------------------- | --------------------------------------------- |
| **Dummy** | Argument that's never used                         | A `null` user passed to satisfy a signature   |
| **Fake**  | Working implementation, not production-grade       | In-memory map instead of a database           |
| **Stub**  | Returns canned answers to specific calls           | `getUser` returns a fixed object              |
| **Spy**   | Records how it was called (still real behavior)    | Wrap `console.log` to assert it was invoked   |
| **Mock**  | Pre-programmed with expectations; fails if not met | Expect `sendEmail` called exactly once        |

```typescript
// Stub — returns a canned value, no assertion
const stub = jest.fn().mockReturnValue({ id: "1", name: "Ada" });

// Spy — wraps real function, records calls
const spy = jest.spyOn(emailService, "send");
spy.mockImplementation(() => Promise.resolve());

// Mock — created with expectations baked in
const mockMailer = {
  send: jest.fn().mockResolvedValue(true),
};
```

---

## Jest Mocks in Practice

### Mock a Function

```typescript
const sendEmail = jest.fn();

test("notifies user on signup", () => {
  signupUser({ email: "ada@example.com" }, sendEmail);
  expect(sendEmail).toHaveBeenCalledWith("ada@example.com", expect.any(String));
});
```

### Mock a Module

```typescript
// emailClient.ts
export async function send(to: string, body: string): Promise<void> { /* ... */ }

// signup.test.ts
import { send } from "./emailClient";
import { signupUser } from "./signup";

jest.mock("./emailClient");

test("signup sends a welcome email", async () => {
  (send as jest.Mock).mockResolvedValue(undefined);

  await signupUser({ email: "ada@example.com" });

  expect(send).toHaveBeenCalledWith(
    "ada@example.com",
    expect.stringContaining("Welcome"),
  );
});
```

### Mock a Method on a Class

```typescript
const findByIdSpy = jest
  .spyOn(userRepository, "findById")
  .mockResolvedValue({ id: "1", email: "ada@example.com" });

await userService.getProfile("1");

expect(findByIdSpy).toHaveBeenCalledWith("1");
```

---

## Dependency Injection Beats Mocking

The cleanest tests come from code that takes its dependencies as arguments. No `jest.mock` gymnastics needed.

**❌ Hard to test — direct module dependency:**

```typescript
import { sendEmail } from "./email";

export async function signup(input: SignupInput): Promise<User> {
  const user = await db.users.create(input);
  await sendEmail(user.email, "Welcome");
  return user;
}
```

**✅ Easy to test — dependencies injected:**

```typescript
interface SignupDeps {
  createUser: (input: SignupInput) => Promise<User>;
  sendEmail: (to: string, subject: string) => Promise<void>;
}

export async function signup(input: SignupInput, deps: SignupDeps): Promise<User> {
  const user = await deps.createUser(input);
  await deps.sendEmail(user.email, "Welcome");
  return user;
}

// Test
test("creates user and sends welcome email", async () => {
  const createUser = jest.fn().mockResolvedValue({ id: "1", email: input.email });
  const sendEmail = jest.fn().mockResolvedValue(undefined);

  await signup(input, { createUser, sendEmail });

  expect(sendEmail).toHaveBeenCalledWith(input.email, "Welcome");
});
```

---

## Mocking Time

Time-dependent code is a top source of flaky tests.

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

test("token expires after 1 hour", () => {
  const token = createToken({ ttl: 3600 });
  jest.advanceTimersByTime(3601 * 1000);
  expect(isExpired(token)).toBe(true);
});
```

---

## Mocking HTTP Calls

Mock at the **HTTP layer**, not inside your service code. This catches request-shape bugs.

```typescript
import nock from "nock";

test("fetches user from external API", async () => {
  nock("https://api.example.com")
    .get("/users/1")
    .reply(200, { id: 1, name: "Ada" });

  const user = await externalService.getUser(1);
  expect(user.name).toBe("Ada");
});
```

For frontend or full-stack apps, `msw` does the same with a network-level handler.

---

## When NOT to Mock

❌ **Don't mock the language or framework**

```typescript
jest.mock("path");  // why?
```

❌ **Don't mock the type system into a lie**

```typescript
const user = { id: "1" } as User;  // missing 10 required fields
```

Use a factory that produces real shapes.

❌ **Don't mock your own internal helpers**

If you mock `formatPrice` inside the unit under test, you're testing nothing — you're testing the mock.

❌ **Don't mock the database in integration tests**

The point of integration tests is to verify the DB queries work.

---

## Verifying Mocks

```typescript
expect(mock).toHaveBeenCalled();
expect(mock).toHaveBeenCalledTimes(2);
expect(mock).toHaveBeenCalledWith("expected", "args");
expect(mock).toHaveBeenLastCalledWith(/* ... */);
expect(mock).toHaveBeenNthCalledWith(1, /* ... */);

// Inspect calls directly
expect(mock.mock.calls[0][0]).toEqual({ id: "1" });
```

> Reset mocks between tests: `beforeEach(() => jest.clearAllMocks())`.

---

## Mock vs Real Tradeoffs

| Choice              | Speed | Confidence | Maintenance     |
| ------------------- | ----- | ---------- | --------------- |
| All mocks           | Fast  | Low        | High (mocks rot)|
| Real DB + mock HTTP | Med   | High       | Low             |
| Everything real     | Slow  | Highest    | Lowest          |

> Sweet spot for most backends: **real DB + mock external HTTP**.

---

## Interview Q&A

**Q: What's the difference between a stub and a mock?**
A: A stub returns canned answers and doesn't care how it's called. A mock is pre-programmed with expectations — it fails the test if the calls don't match. In Jest, `jest.fn()` is technically a spy; treat it as a mock when you assert on calls.

**Q: When do you avoid mocking?**
A: When the dependency is fast, deterministic, and owned by you — like a pure function or in-process module. Mocking it adds noise and tests the mock instead of behavior.

**Q: How do you avoid mock-heavy, brittle tests?**
A: Inject dependencies as parameters instead of importing concrete modules. Test through the public interface. Mock at boundaries (DB, HTTP, time, randomness), not internals.

---

## Best Practices

✅ Inject dependencies — easier to substitute than `jest.mock`
✅ Mock at boundaries: HTTP, time, randomness, third-party SDKs
✅ Reset mocks between tests
✅ Use factories for test data shapes
❌ Don't mock internals of the unit you're testing
❌ Don't mock the database in integration tests
❌ Don't ignore the type checker with `as`-casts

---

[← Previous: TDD](./04-tdd.md) | [Next: Best Practices →](./06-best-practices.md)
