---
sourceHash: "35a8855af35360a3b284e0b260e8f1083e5fa31850bf5199bf89e93cef53f74e"
title: "Node Service Testing"
translatedAt: "2026-10-17T13:59:01.234Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Node Service Testing {#ch-testing-node-services}

> বেশিরভাগ ভরসা রাখুন সেই test-গুলোর ওপর, যেগুলো আসল HTTP layer পেরিয়ে আসল database পর্যন্ত যায়। আর সেগুলোকে একটি আরেকটি থেকে আলাদা রাখুন, যাতে দ্রুত চলে।

**এই অধ্যায়ে:** backend-এর pyramid কেন বেশি চ্যাপ্টা · কী unit test করবেন · module mocking-এর বদলে injection · container-এ আসল database · isolation, factory আর third party

## 💡 মূল ধারণা

Testing-এর নিয়মকানুন Part IV-এর [Chapter ?? — Testing Strategy](#ch-testing-strategy)-এ আছে:
pyramid, arrange-act-assert, test double-এর পরিভাষা, কখন TDD করবেন। এখানেও সেগুলো হুবহু খাটে। এই অধ্যায়ের
বিষয় শুধু server-এ কী আলাদা।

আলাদা দুটি জিনিস। প্রথমত, **service-এর বেশিরভাগ আচরণ থাকে database আর HTTP boundary-র সঙ্গে তার যোগাযোগে**,
pure function-এ নয়। তাই backend-এর pyramid UI-এর চেয়ে চ্যাপ্টা। দ্বিতীয়ত, **service-এর dependency হলো আলাদা
process, component নয়**: database, queue, payment provider। এগুলোর জায়গায় কী বসাবেন, তার ওপরই ঠিক হয় আপনার
suite-এর কতটা আসলে চালানোর মতো।

ফলে যে logic-এ সত্যিই অনেক branch আছে, সেটা unit test করুন। আর wiring ঠিক আছে কি না, সেটা দেখুক আসল boundary
পেরিয়ে যাওয়া test। Database, logger আর clock সব mock করে controller-এর unit test লিখলে আপনি আসলে নিজের mock-গুলোকেই
test করছেন।

## কখন ব্যবহার করবেন

| আচরণ | কোথায় test করবেন | কেন |
| --------- | ------- | --- |
| Branch-ওয়ালা business rule — pricing, eligibility, state transition | Unit | ঝুঁকি থাকে combination-গুলোতে, আর সেগুলো গুনে গুনে লেখা সস্তা |
| Pure transformation, validation schema, error translation | Unit | ফল নির্দিষ্ট, I/O নেই, দ্রুত |
| Routing, middleware-এর ক্রম, serialisation, status code | Integration | আসল stack না চললে এগুলো আসল নয় |
| যেকোনো query, যেকোনো transaction | Integration | Mock করা ORM শুধু বলে দেয় যে আপনি যা লিখেছেন তা-ই লিখেছেন |
| যে controller request পড়ে একটি method call করে | কোনোটিই না | ভুল হওয়ার মতো কোনো branch নেই |
| হাতে গোনা কয়েকটি জরুরি user journey | End-to-end | কয়েক মিনিট লাগে, আর মাঝে মাঝে অকারণে fail করে — তাই অল্প কয়েকটির জন্যই এটা পোষায় |

## কীভাবে কাজ করে

### Module mocking-এর চেয়ে injection ভালো

Function যে dependency সরাসরি নিজে টেনে আনে, প্রতিটিকে আপনাকে mock করতে হবে। আর যে dependency parameter হিসেবে
আসে, সেটা বদলাতে তিন line লাগে।

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

`vi.mock` আর `jest.mock` hoisted হয় (মানে file-এর একদম ওপরে সরে যায়), module-scoped, আর ক্রমের ওপর নির্ভর
করে। এ কারণেই test-এর সবচেয়ে বিভ্রান্তিকর failure-গুলো সাধারণত এদের থেকেই আসে। Code বদলাতে না পারলে এগুলো
ব্যবহার করুন, যেমন call chain-এর অনেক গভীরে import করা কোনো third-party module। কিন্তু default হিসেবে নয়।

Non-determinism-এর ক্ষেত্রেও একই যুক্তি। একটি `clock` আর একটি `idGenerator` inject করতে খরচ মাত্র একটি করে
parameter, অথচ মাঝে মাঝে fail করা test-এর পুরো একটি শ্রেণি এতে দূর হয়। কিছু code-এর গঠন বদলানো যায় না: retry,
debounce, scheduler। সেখানে fake timer দিয়ে clock এগিয়ে দিন। আসল delay ছোট করবেন না, কারণ ছোট করা schedule
production-এর schedule নয়।

> ⚠️ Query unit test করার জন্য নিজের database layer mock করা হলো সবচেয়ে দামি আর সবচেয়ে কম কাজের test।
> এটা শুধু যাচাই করে যে আপনার code ORM-কে ঠিক সেভাবেই call করছে, যেভাবে আপনি লিখেছেন। Query ভুল হলেও test
> pass করে, আর refactor করলেই ভেঙে যায়।

### আসল HTTP layer দিয়ে

`supertest` app-টাকে একই process-এ চালায় আর আসল socket দিয়ে request পাঠায়। ফলে middleware, parser, error
handler আর status code সবই আসলে চলে।

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

প্রতিটি endpoint-এর জন্য তিনটি test-এর ছাঁচটা অনুসরণ করার মতো: **একটি সফল request, একটি বাতিল হওয়া input, একটি
বাতিল হওয়া caller।** এই তিনটিতেই happy path, validation boundary আর authorisation boundary ঢাকা পড়ে। Mass
assignment-ও এর মধ্যে আসে, মানে request এমন কোনো field পাঠায় যা সেট করার অধিকার তার নেই, যেমন
`status: 'paid'`। Schema-কে অচেনা key-টা নাম ধরে বাতিল করতে হবে।

### নকল নয়, আসল database

Postgres-এর জায়গায় SQLite, বা আসল MongoDB-র জায়গায় in-memory MongoDB বসালে আপনি অন্য একটি engine test করছেন।
তার type আলাদা, constraint-এর আচরণ আলাদা, transaction আর locking-এর নিয়মও আলাদা। Integration test আছেই ঠিক এই
পার্থক্যগুলো ধরার জন্য। নকল engine দিলে suite pass করে, আর production ভাঙে।

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

আসল migration চালানো জরুরি। খালি database-এ যে migration fail করে, production-এও সেটা fail করবে। আর সেটা
আপনি জানতে পারেন এখানেই।

### আসল সমস্যা isolation

যে integration suite ধীর আর অনির্ভরযোগ্য, প্রায় সবসময় দেখা যায় সেখানে test-গুলো একে অপরের data দেখতে পায়।
Isolation ঠিক করুন, তাহলে suite এত দ্রুত হবে যে প্রতিটি commit-এ চালানো যাবে।

| কৌশল | গতি | Isolation | কখন ব্যবহার করবেন |
| -------- | ----- | --------- | -------- |
| **প্রতি test-এ একটি transaction, শেষে rollback** | ✅ সবচেয়ে দ্রুত | ✅ পুরোপুরি | Test-এর অধীন code নিজে transaction চালায় না |
| **প্রতি test-এর মাঝে table truncate** | ⚠️ মোটামুটি | ✅ পুরোপুরি | Default পছন্দ; সহজ, আর কী হবে আগে থেকে জানা |
| **প্রতি worker-এ আলাদা schema বা database** | ⚠️ Setup ধীর | ✅ পুরোপুরি | Suite parallel-এ চালালে |
| **শুধু test-এর বানানো row delete** | ✅ দ্রুত | ❌ ভঙ্গুর | কখনোই না — একটি row বাদ পড়লেই পরের test fail করে |

`afterEach`-এ একটি statement-ই সব পরিষ্কার করে দেয়: `pg_tables` থেকে `public`-এর সব table বেছে নিন, শুধু
migration ledger বাদ দিয়ে। তারপর `TRUNCATE "a", "b", … RESTART IDENTITY CASCADE`। `CASCADE` foreign key
সামলায়, আর `RESTART IDENTITY` sequence আবার শুরু থেকে গোনায়, তাই id আগে থেকে আন্দাজ করা যায়।

Rollback আরও দ্রুত, কিন্তু একটি ফাঁদ আছে। Test-এর অধীন code নিজে transaction খুললে আপনি nested transaction
পেয়ে যান। তখন যে আচরণ test করছেন, সেটা আর production-এর আচরণ নয়। Truncate করলে এই প্রশ্নই ওঠে না।

> ⚠️ Test suite কখনো shared development বা staging database-এর দিকে তাক করবেন না। Test hook-এর
> `TRUNCATE` অনেক আসল data মুছে দিয়েছে। Connection string আসতে হবে সেই container থেকে, যেটা suite নিজে চালু করেছে।

### Factory আর third party

Factory একটি valid object বানায়, আর test যে field-গুলো নিয়ে ভাবে সেগুলো override করার সুযোগ দেয়। জরুরি দুটি
line চোখের সামনে থাকে, আর বাধ্যতামূলক বিশটি field আড়ালে থাকে:

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

Shared seed file-এর বদলে factory ব্যবহার করুন। Seed file হলো global state: সব test তার ওপর নির্ভর করে, কেউ
নিরাপদে সেটা বদলাতে পারে না, আর test পড়ে বোঝা যায় না data দেখতে কেমন।

Third party-র ক্ষেত্রে নিজের client mock না করে HTTP boundary-তে request আটকান। তাহলে client কীভাবে request
বানায় আর error সামলায়, সেটাও test-এর আওতায় থাকে।

```typescript
// MSW intercepts at the network boundary, so the real client code runs.
const server = setupServer(
  http.post('https://api.stripe.com/v1/charges', () =>
    HttpResponse.json({ id: 'ch_test_1', status: 'succeeded' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // Catch unexpected calls.
```

`onUnhandledRequest: 'error'` setting-টা রেখে দিন। এটা না থাকলে যে test অপ্রত্যাশিতভাবে internet-এ চলে যায়,
সেটা local-এ pass করে আর CI-তে fail করে।

## সাধারণ ভুল

**❌ Implementation-এর ওপর assert করা।** `expect(repo.find).toHaveBeenCalledWith(...)` প্রতিটি refactor-এ ভাঙে,
আর আচরণ ভুল হলেও pass করে। যেখানে পারেন, ফলাফলের ওপর assert করুন।

**❌ API response-এর snapshot নেওয়া।** প্রতিটি field বদলালেই snapshot update করতে হয়, যা কেউ পড়ে না।
Contract যে field-গুলো দিয়ে তৈরি, শুধু সেগুলোর ওপর assert করুন।

**❌ Test-এর মধ্যে shared mutable state।** Module-level কোনো array, বা seed করা কোনো record, যা একটি test বদলে
দেয় — এতে suite ক্রমের ওপর নির্ভরশীল হয়ে পড়ে। আর fail করবে শুধু CI-তে।

**❌ 100% coverage-এর পেছনে ছোটা।** Coverage হলো test না হওয়া branch খুঁজে পাওয়ার একটি নিচের সীমা, লক্ষ্য নয়।
শতাংশ পূরণ করতে লেখা suite getter test করে। যে suite error-এর *message*-এর লেখা মিলিয়ে দেখে, সেটা ভাষা
বদলালেই ভাঙে। আপনি যে shape-এর প্রতিশ্রুতি দিয়েছেন, সেটাই assert করুন: status, code, বাইরে দেখানো নিরাপদ কি না।

## 🔑 মূল শিক্ষা

- Backend-এর pyramid frontend-এর চেয়ে চ্যাপ্টা, কারণ বেশিরভাগ আচরণ থাকে integration-এ, pure function-এ নয়।
- Dependency parameter হিসেবে দিলে module mocking-এর দরকার পড়ে না, আর বিভ্রান্তিকর failure-এর মূল উৎস সেটাই।
- নিজের data layer mock করলে এমন test হয়, যা query ভাঙা থাকলেও pass করে।
- Container-এ আসল database engine চালান, আর আসল migration দিয়ে সেটা তৈরি করুন।
- ধীর গতি আর অকারণ failure প্রায় সবসময় shared state থেকে আসে। Test-এর মাঝে truncate করুন, বা প্রতি worker-এ আলাদা schema দিন।

## Interview-এর প্রশ্ন

**Q: Service-এ কী unit test করবেন না?**

যে controller শুধু request-কে একটি service call-এ অনুবাদ করে, আর database mock করা যেকোনো query। দুটিই শুধু
যাচাই করে যে code যেভাবে লেখা, সেভাবেই লেখা আছে। Refactor করলে ভাঙে, আর আচরণ ভুল হলেও সবুজ থাকে। এগুলোর জায়গা
আসল database আর আসল HTTP layer-এর বিরুদ্ধে চালানো test-এ।

**Q: Dependency injection, নাকি `vi.mock`?**

Code যেখানে আমার নিজের, সেখানে injection। Parameter হিসেবে দেওয়া fake object স্পষ্ট, type-check হয়, আর তাতে
hoisting বা module registry নিয়ে মাথা ঘামাতে হয় না। `vi.mock` সেই module-এর জন্য, যার গঠন আমি বদলাতে পারি না,
যেমন কয়েক স্তর নিচে import করা কোনো third-party client। এটা ব্যতিক্রম হওয়া উচিত। Import-এর ক্রমের ওপর নির্ভর করে
যে test fail করে, তার পেছনে সাধারণত module mock-ই থাকে।

**Q: Integration suite isolated রেখেও দ্রুত রাখবেন কীভাবে?**

Isolation বাদ না দিয়ে সেটাকে সস্তা করে। প্রতি test-এ একটি transaction খুলে শেষে rollback করা সবচেয়ে দ্রুত।
কিন্তু যে code নিজে transaction চালায়, তার সঙ্গে এটা গোলমাল করে। তাই `CASCADE` আর `RESTART IDENTITY` দিয়ে সব
table truncate করাই নির্ভরযোগ্য default। Parallel-এ চালাতে চাইলে প্রতিটি worker-কে আলাদা schema দিন, তাহলে
isolation হয় worker ধরে, test file ধরে নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — pyramid, AAA আর test double-এর পরিভাষা
- [Chapter ?? — Transaction ও Concurrency](#ch-sql-transactions) — আসল engine আপনাকে যে নিয়মগুলো দেয়
- [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) — browser layer, আর কেন এমন test অল্প থাকা উচিত
