---
sourceHash: "35a8855af35360a3b284e0b260e8f1083e5fa31850bf5199bf89e93cef53f74e"
title: "Node Service Testing"
translatedAt: "2026-10-12T12:21:21.407Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Node Service Testing {#ch-testing-node-services}

> বেশিরভাগ ভার দিন সেই test-গুলোর ওপর, যেগুলো আসল HTTP layer পেরিয়ে আসল database-এ যায়। আর সেগুলোকে isolated রাখুন, যাতে দ্রুত থাকে।

**এই অধ্যায়ে:** backend pyramid কেন বেশি চ্যাপ্টা · কী unit test করবেন · module mocking-এর বদলে injection · container-এ আসল database · isolation, factory আর third party

## 💡 মূল ধারণা

Testing-এর মূল নিয়মকানুন Part IV-এর [Chapter ?? — Testing Strategy](#ch-testing-strategy)-এ আছে:
pyramid, arrange-act-assert, double-এর পরিভাষা, কখন TDD করবেন। এখানে সেগুলো হুবহু খাটে। এই অধ্যায় শুধু
server-এ কী আলাদা, তা নিয়ে।

আলাদা দুটো জিনিস। প্রথমত, **একটি service-এর বেশিরভাগ behaviour থাকে database আর HTTP boundary-র সাথে তার
integration-এ**, তার pure function-এ নয়। তাই backend pyramid একটি UI-এর pyramid-এর চেয়ে বেশি চ্যাপ্টা।
দ্বিতীয়ত, **একটি service-এর dependency হলো process, component নয়**: একটি database, একটি queue, একটি payment
provider। এগুলোকে কীভাবে substitute করবেন, সেটাই ঠিক করে আপনার suite-এর কতটুকু চালানোর যোগ্য।

ফলাফল: যে logic সত্যিই অনেক branch-ওয়ালা, সেটা unit test করুন, আর wiring-এর দায়িত্ব দিন আসল boundary পেরোনো
test-কে। যে controller-এর unit test database, logger আর clock mock করে, সেটা আসলে আপনার mock-গুলোকেই test
করে।

## কখন ব্যবহার করবেন

| Behaviour | কোথায় test করবেন | কেন |
| --------- | ------- | --- |
| Branch-ওয়ালা business rule — pricing, eligibility, state transition | Unit | Combination-গুলোই ঝুঁকি, আর সেগুলো গুনে ফেলা সস্তা |
| Pure transformation, validation schema, error translation | Unit | Deterministic, কোনো I/O নেই, দ্রুত |
| Routing, middleware-এর ক্রম, serialisation, status code | Integration | আসল stack চললেই কেবল সত্যি |
| যেকোনো query, আর যেকোনো transaction | Integration | Mock করা ORM শুধু বলে, আপনি যে code লিখেছেন সেটাই লিখেছেন |
| যে controller একটি request পড়ে একটি method call করে | কোনোটাই নয় | ভুল হওয়ার মতো কোনো branch নেই |
| হাতে গোনা কয়েকটি গুরুত্বপূর্ণ user journey | End-to-end | মিনিট লাগে আর flaky — শুধু কয়েকটির জন্যই এর মূল্য আছে |

## কীভাবে কাজ করে

### Module mocking-এর চেয়ে injection ভালো

একটি function সরাসরি যে dependency-র কাছে হাত বাড়ায়, সেটা আপনাকে mock করতেই হবে। আর যে dependency
parameter হিসেবে আসে, সেটা তিন line-এ substitute করা যায়।

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

`vi.mock` আর `jest.mock` hoisted হয় (file-এর একেবারে ওপরে সরে যায়), module-scoped, আর ক্রমের ওপর নির্ভরশীল।
এ কারণেই বিভ্রান্তিকর test failure-এর সবচেয়ে সাধারণ উৎস এরাই। যখন code বদলাতে পারবেন না, তখন এগুলো ব্যবহার
করুন, যেমন call chain-এর গভীরে import করা একটি third-party module। Default হিসেবে নয়।

Non-determinism-এর ক্ষেত্রেও একই যুক্তি খাটে। একটি `clock` আর একটি `idGenerator` inject করতে প্রতিটির জন্য
একটি করে parameter লাগে, আর এতে এক পুরো শ্রেণির মাঝে মাঝে ঘটা failure দূর হয়। কিছু code-এর গঠন আপনি বদলাতে
পারবেন না: retry, debounce, scheduler। সেখানে fake timer ব্যবহার করুন আর clock এগিয়ে দিন। আসল delay ছোট
করবেন না, কারণ ছোট করা schedule production-এ চলা schedule নয়।

> ⚠️ একটি query unit test করার জন্য নিজের database layer mock করা হলো সবচেয়ে বেশি খরচের, সবচেয়ে কম মূল্যের
> test। এটা শুধু assert করে যে আপনার code ORM-কে সেভাবেই call করে, যেভাবে আপনি লিখেছেন। Query ভুল হলেও এটা
> pass করে, আর যখনই refactor করেন, ভেঙে যায়।

### আসল HTTP layer পেরিয়ে

`supertest` app-কে process-এর ভেতরেই mount করে আর একটি আসল socket দিয়ে চালায়। ফলে middleware, parser, error
handler আর status code সবই পরীক্ষা হয়।

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

প্রতিটি endpoint-এর জন্য নকল করার মতো আকার হলো তিনটি test: **একটি সফল, একটি reject হওয়া input, একটি reject
হওয়া caller।** এই তিনটি মিলে happy path, validation boundary আর authorisation boundary cover করে। এর মধ্যে
mass assignment-ও পড়ে, যেখানে একটি request এমন field পাঠায় যেটা তার set করার কথা নয়, যেমন
`status: 'paid'`। Schema-কে অচেনা key-টি নাম ধরে reject করতে হবে।

### নকল নয়, আসল database

Postgres-এর বদলে SQLite, বা আসল MongoDB-র বদলে in-memory MongoDB বসালে আপনি অন্য একটি engine test করছেন।
তার type আলাদা, constraint-এর আচরণ আলাদা, transaction আর locking-এর semantics আলাদা। Integration test-এর
অস্তিত্বই ঠিক এই পার্থক্যগুলো ধরার জন্য। ফলে suite pass করে, অথচ production ভেঙে যায়।

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

আসল migration চালানো জরুরি। যে migration একটি খালি database-এ fail করে, সেটা production-এও fail করবে, আর
এখানেই আপনি সেটা জানতে পারেন।

### Isolation-ই পুরো সমস্যা

যে integration suite ধীর আর অনির্ভরযোগ্য, প্রায় সবসময়ই সেখানে test-গুলো একে অপরের data দেখতে পায়।
Isolation ঠিক করুন, তাহলে এটা প্রতিটি commit-এ চালানোর মতো দ্রুত হয়ে যাবে।

| Strategy | গতি | Isolation | কখন ব্যবহার করবেন |
| -------- | ----- | --------- | -------- |
| **প্রতি test-এ একটি transaction, rollback করা** | ✅ সবচেয়ে দ্রুত | ✅ সম্পূর্ণ | Test-এর অধীন code নিজের transaction নিজে সামলায় না |
| **Test-এর মাঝে table truncate করা** | ⚠️ মোটামুটি | ✅ সম্পূর্ণ | Default পছন্দ; সহজ আর অনুমানযোগ্য |
| **প্রতি worker-এ একটি schema বা database** | ⚠️ Setup ধীর | ✅ সম্পূর্ণ | Suite parallel-এ চালানো |
| **শুধু test-এর তৈরি করা জিনিস delete করা** | ✅ দ্রুত | ❌ ভঙ্গুর | কখনো না — একটি row বাদ পড়লেই পরের test fail করে |

`afterEach`-এ একটি statement সবকিছু পরিষ্কার করে: `pg_tables` থেকে migration ledger বাদে `public`-এর সব table
select করুন, তারপর `TRUNCATE "a", "b", … RESTART IDENTITY CASCADE`। `CASCADE` foreign key সামলায়, আর
`RESTART IDENTITY` sequence reset করে, যাতে id অনুমানযোগ্য থাকে।

Rollback আরও দ্রুত, তবে একটি সমস্যা আছে। Test-এর অধীন code যদি নিজের transaction খোলে, তাহলে এখন আপনার একটি
nested transaction তৈরি হলো। তখন আপনি যে behaviour test করছেন, সেটা production-এর behaviour নয়। Truncation
এই প্রশ্নটাই এড়িয়ে যায়।

> ⚠️ কখনো একটি test suite-কে shared development বা staging database-এর দিকে তাক করবেন না। Test hook-এর
> `TRUNCATE` অনেক আসল data মুছে দিয়েছে। Connection string অবশ্যই আসতে হবে suite-এর নিজের চালু করা একটি
> container থেকে।

### Factory আর third party

Factory একটি valid object তৈরি করে, আর test যে field-গুলো নিয়ে মাথা ঘামায়, সেগুলোর override নেয়। দরকারি দুই
line চোখের সামনে থাকে, আর বিশটা required field লুকিয়ে থাকে:

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

Shared seed file-এর বদলে factory বেছে নিন। Seed file হলো global state: প্রতিটি test এর ওপর নির্ভর করে, কেউ
এটা নিরাপদে বদলাতে পারে না, আর একটি test পড়ে বোঝা যায় না data দেখতে কেমন।

Third party-র ক্ষেত্রে নিজের client mock না করে HTTP boundary-তে intercept করুন। তাহলে client-এর request তৈরি
আর error handling-ও test-এর আওতায় থাকে।

```typescript
// MSW intercepts at the network boundary, so the real client code runs.
const server = setupServer(
  http.post('https://api.stripe.com/v1/charges', () =>
    HttpResponse.json({ id: 'ch_test_1', status: 'succeeded' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // Catch unexpected calls.
```

`onUnhandledRequest: 'error'` হলো সেই setting, যেটা রেখে দিতে হবে। এটা ছাড়া, যে test অপ্রত্যাশিতভাবে internet-এ
পৌঁছে যায়, সেটা local-এ pass করে আর CI-তে fail করে।

## সাধারণ ভুল

**❌ Implementation-এর ওপর assert করা।** `expect(repo.find).toHaveBeenCalledWith(...)` প্রতিটি refactor-এ
ভাঙে, আর behaviour ভুল হলেও pass করে। যেখানে পারেন, ফলাফলের ওপর assert করুন।

**❌ API response-এর snapshot নেওয়া।** প্রতিটি field-এর পরিবর্তন একটি snapshot update হয়ে যায়, যেটা কেউ পড়ে না।
যে field-গুলো contract তৈরি করে, সেগুলোর ওপর assert করুন।

**❌ Test-এর মাঝে shared mutable state।** একটি module-level array বা একটি seed করা record, যেটা একটি test
বদলে দেয়, suite-কে ক্রমের ওপর নির্ভরশীল করে তোলে, আর সেটা শুধু CI-তেই fail করবে।

**❌ 100% coverage-এর পেছনে ছোটা।** Coverage হলো untested branch খোঁজার একটি ন্যূনতম মাপকাঠি, লক্ষ্য নয়।
একটি শতাংশ পূরণের জন্য লেখা suite getter test করে। যে suite error-এর *message* text-এর ওপর assert করে, সেটা
লেখার পরিবর্তনেই ভাঙে। যে আকার আপনি প্রতিশ্রুতি দিয়েছেন, সেটা assert করুন: status, code, এটা expose করা
নিরাপদ কি না।

## 🔑 মূল শিক্ষা

- Backend pyramid frontend-এর চেয়ে বেশি চ্যাপ্টা, কারণ বেশিরভাগ behaviour থাকে integration-এ, pure function-এ নয়।
- Dependency-কে parameter বানালে module mocking-এর দরকার থাকে না, আর সেটাই বিভ্রান্তিকর failure-এর প্রধান উৎস।
- নিজের data layer mock করলে এমন test তৈরি হয়, যেটা query ভাঙা থাকলেও pass করে।
- Container-এ আসল database engine ব্যবহার করুন, আসল migration দিয়ে migrate করা।
- ধীরগতি আর flakiness প্রায় সবসময় shared state থেকে আসে। Test-এর মাঝে truncate করুন, বা প্রতি worker-এ একটি schema ব্যবহার করুন।

## Interview-এর প্রশ্ন

**Q: একটি service-এ কী unit test করেন না?**

যে controller শুধু একটি request-কে একটি service call-এ অনুবাদ করে, আর database mock করা যেকোনো query। দুটোই
assert করে যে code যেভাবে লেখা, সেভাবেই লেখা। এগুলো refactor-এ ভাঙে, আর behaviour ভুল হলেও সবুজ থাকে। এগুলোর
জায়গা আসল database আর আসল HTTP layer-এর বিরুদ্ধে চলা test-এ।

**Q: Dependency injection নাকি `vi.mock`?**

যেখানে code আমার, সেখানে injection। Parameter হিসেবে পাঠানো একটি fake object স্পষ্ট, type-checked, আর এতে
hoisting বা module-registry-র কোনো আচরণ নিয়ে ভাবতে হয় না। `vi.mock` সেই module-গুলোর জন্য, যেগুলোর গঠন আমি
বদলাতে পারি না, যেমন কয়েক স্তর নিচে import করা একটি third-party client। এটা ব্যতিক্রম হওয়া উচিত। Import-এর
ক্রমের ওপর নির্ভর করে fail করা test-এর সাধারণ কারণ module mock।

**Q: একটি integration suite-কে কীভাবে isolated রেখেও দ্রুত রাখেন?**

Isolation বাদ না দিয়ে সেটাকে সস্তা করে। প্রতি test-এ একটি transaction, শেষে rollback করা, সবচেয়ে দ্রুত। কিন্তু
যে code নিজের transaction নিজে সামলায়, তার সাথে এটা গোলমাল করে। তাই `CASCADE` আর `RESTART IDENTITY` দিয়ে
প্রতিটি table truncate করাই নির্ভরযোগ্য default। Parallelism-এর জন্য প্রতিটি worker-কে নিজের schema দিন, যাতে
isolation test file প্রতি না হয়ে worker প্রতি হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — pyramid, AAA আর double-এর পরিভাষা
- [Chapter ?? — Transaction ও Concurrency](#ch-sql-transactions) — একটি আসল engine যে semantics দেয়
- [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) — browser layer, আর কেন এগুলো কম থাকা উচিত
