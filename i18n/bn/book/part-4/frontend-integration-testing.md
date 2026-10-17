---
sourceHash: "0556cff00d0ede5947a08b703d3f57c17c9b6c18a99d7e94616778eb4392a32c"
title: "Frontend Integration Testing"
translatedAt: "2026-10-17T14:03:50.619Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Frontend Integration Testing {#ch-frontend-integration-testing}

> শুধু network নকল করুন, আর কিছু নয়। তাহলে test চালাবে সেই wiring, যেখানে আসল bug-গুলো থাকে।

**এই অধ্যায়ে:** frontend-এ "integration" মানে কী · request interception বনাম module mock · একটি পুরো flow-এর উদাহরণ · যে unhappy path-গুলো সত্যিই ভাঙা অবস্থায় ship হয় · দুটি test-এর মাঝে reset করা

## 💡 মূল ধারণা

Frontend-এ integration test-এর একটিই নিয়ম: **network ছাড়া সবকিছু আসল।** আসল child component, আসল state, আসল routing,
আসল form library, আসল query cache। বদল হয় শুধু HTTP boundary-তে।

এই একটি নিয়মই অনেক কাজ করে। এই কারণেই এই স্তর সেই bug-গুলো ধরে, যেগুলো সত্যিই গুরুত্বপূর্ণ: যে loading state কখনো
সরে না, যে form দুবার post করে, যে error path কেউ render করে দেখেনি, যে cache mutation-এর পরেও stale data দেয়।
এগুলোর কোনোটিই একটি function-এর ভেতরে থাকে না। থাকে অংশগুলোর জোড়ার জায়গায়। আর যে test সেই অংশগুলোকে mock করে সরিয়ে
দেয়, সেটা এগুলো দেখতেই পায় না।

একই কারণে এই স্তর সস্তাও। কোনো browser চালু করতে হয় না, কোনো server চালাতে হয় না। তাই বারো ধাপের একটি user flow-এ
খরচ মাত্র কয়েকশো millisecond।

> ⚠️ **যা বদলাতে থাকে:** Mock Service Worker version 2-এ তার handler API নতুন করে লিখেছে। `rest` হয়ে গেছে `http`,
> আর `res(ctx.json())` chain-এর জায়গায় এখন return করা হয় একটি `HttpResponse`। প্রকাশিত উদাহরণের বেশিরভাগ এমন shape
> ব্যবহার করে, যা আর চলে না। তবে টেকসই নীতিটা এই rewrite-এর পরেও টিকে আছে: intercept করুন network boundary-তে,
> module boundary-তে নয়।

## কীভাবে কাজ করে

### Request intercept করুন, module mock করবেন না

দুই পদ্ধতিতেই component নকল data render করে। কিন্তু আপনার code test হয় শুধু একটিতে।

| | Module mock (`vi.mock("./api")`) | Request interception |
| --- | --- | --- |
| যা চলে | আপনার component | আপনার component **আর** আপনার fetch layer |
| যা প্রমাণ করে | একটি function call হয়েছে | ঠিক request-টাই পাঠানো হয়েছে |
| যা বাদ পড়ে | URL বানানো, header, serialisation, error mapping | কিছুই না |
| কখন ভাঙে | Module-এর নাম বদলালে | Request-এর contract বদলালে — যেটা ঠিকই |

দ্বিতীয় column-টাই জরুরি। Module mock assert করে যে `getUser("1")` call হয়েছে। Request-এ auth header ছিল কি না,
ঠিক path-এ গেছে কি না, বা 500 সামলেছে কি না, সে বিষয়ে কিছুই বলে না। অথচ production-এ ঠিক এগুলোই ভাঙে।

Mock Service Worker intercept করে network layer-এ, তাই `fetch` সত্যিই চলে:

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

`onUnhandledRequest: "error"` ঐচ্ছিক নয়। এটা না থাকলে, যে URL handle করতে ভুলে গেছেন, তার request সোজা আসল
network-এ চলে যায়। তখন network access থাকলে test pass করে, আর CI-তে fail করে। আরও খারাপ হলো, চুপচাপ কোনো live
service-এ request চলে যেতে পারে।

### Assertion নয়, একটি flow

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

ওই চার line-এ ছয়টি অংশ একসঙ্গে কাজ করে, আর যেকোনো একটিই ভাঙা অংশ হতে পারে। আসল কথা সেটাই। Submit handler-এর unit test
pass করে যেত, অথচ button disabled হয়েই থাকত।

### আসল লাভ unhappy path-এ

Happy path developer-রা বানান আর demo দেখান, তাই সেগুলো কদাচিৎ ভাঙা থাকে। Error, empty state আর ধীর response-এর দিকে
কেউ তাকায়নি। প্রতিটি test-এ handler override করুন:

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

চার রকম handler-এই বেশিরভাগ গোলমাল ঢাকা পড়ে: 500, 401, খালি list, আর ধীর response। প্রতিটি গুরুত্বপূর্ণ flow-এর
জন্য এই চারটি লিখলে unit test দ্বিগুণ করার চেয়ে বেশি লাভ।

> ⚠️ Handler-এ `delay()` মানে সত্যিকারের অপেক্ষা। ছোট রাখুন, আর শুধু সেখানেই ব্যবহার করুন, যেখানে pending state-টাই
> assertion। 200 ms delay সহ দশটি test মানে বিনা কারণে suite-এর দুই সেকেন্ড।

### Reset করুন, নইলে test-গুলো একে অন্যের সঙ্গে জড়িয়ে যায়

`afterEach`-এ `server.resetHandlers()` রাখলে এক test-এর override পরের test-এ চুইয়ে পড়ে না। প্রতিটি render-এ নতুন
query client দিলেও একই কাজ হয়। Cache shared থাকলে দ্বিতীয় test প্রথম test-এর data পড়ে, আর failure-টা দেখতে লাগে
component-এর bug-এর মতো।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কোথায় test করবেন | কেন |
| --------- | ------- | --- |
| এমন form, যা validate করে, submit করে আর নিশ্চিত করে | Integration | প্রতিটি জোড়া একটি test-এ, এক সেকেন্ডের কম সময়ে |
| Loading, error আর empty state | Integration, handler override সহ | প্রতিটি response জোর করে আনার সবচেয়ে সস্তা জায়গা |
| Mutation-এর পরে cache invalidation | Integration | আসল query client, আসল refetch |
| Form যে বিশুদ্ধ হিসাব ব্যবহার করে | Unit | আরও দ্রুত, আর একশোটি case ঢাকে |
| Routing, আসল cookie, এক page থেকে আরেক page-এ state | End-to-end — [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) | যা test হচ্ছে, সেটা আসল browser নিজেই |
| Back-end-এর এমন contract, যা হয়তো সরে গেছে | Contract testing — [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) | Handler হলো আপনার অনুমান, server-এর সত্য নয় |

শেষ row-টাই সৎ সীমাবদ্ধতা। Handler হলো API কী return করে, সে সম্পর্কে frontend-এর লেখা একটি বক্তব্য। Server তার
response বদলালেও এই test-গুলোর প্রতিটি তবু pass করে।

## সাধারণ ভুল

❌ **হাতে `fetch` mock করা।** তখন আপনি test করছেন একটি নকল জিনিস, আর প্রতিটি call site-এ আলাদা setup লাগে।
✅ Network layer-এ intercept করুন, যাতে আসল request code চলে।

❌ **`onUnhandledRequest: "error"` বাদ দেওয়া।** Mock না করা call চুপচাপ আসল network-এ পৌঁছে যায়।
✅ এটা set করুন, আর unhandled request-কে fail করা test হিসেবে ধরুন।

❌ **শুধু happy path test করা।** 500, 401 আর খালি list-ই ভাঙা অবস্থায় ship হয়।
✅ প্রতিটি গুরুত্বপূর্ণ flow-এ, প্রতিটি failure mode-এর জন্য একটি handler override।

❌ **Flow-কে "isolate" করতে নিজের component mock করা।** যা test হচ্ছে, সেটাই তো integration। আপনি সেটাই সরিয়ে দিলেন।
✅ আসল tree render করুন। বদলান শুধু network।

❌ **Override রেখে দেওয়া।** পরের test একটি 500 পেয়ে যায়, আর দৃশ্যমান কোনো কারণ ছাড়াই fail করে।
✅ `afterEach`-এ `resetHandlers()`, আর প্রতিটি render-এ নতুন query client।

## 🔑 মূল শিক্ষা

- Frontend-এ integration মানে network ছাড়া সবকিছু আসল।
- Request interception আপনার fetch layer test করে; module mock সেটাকে test থেকেই মুছে দেয়।
- ভুলে যাওয়া handler যাতে আসল network-এ না পৌঁছায়, সেটা আটকায় `onUnhandledRequest: "error"`।
- Unhappy path — 500, 401, খালি, ধীর — এখানেই এই স্তর তার খরচ তুলে আনে।
- Handler API সম্পর্কে আপনার অনুমান ধরে রাখে, তাই server-এর দিকে কিছু সরে গেলে সেটা ধরতে পারে না।

## Interview-এর প্রশ্ন

**Q: API module mock না করে request intercept কেন করবেন?**

কারণ module mock ঠিক সেই code-টাই সরিয়ে দেয়, যেটা ভুল হওয়ার সম্ভাবনা সবচেয়ে বেশি। Interception থাকলে URL বানানো,
header, serialisation আর error mapping test-এর ভেতরেই থাকে। তাই user কী দেখছেন, তা নিয়ে একটি assertion দেখিয়ে দেয়
request-টাও ঠিক ছিল। Module mock শুধু প্রমাণ করে, কিছু argument দিয়ে একটি function call হয়েছে, আর সেই অংশটা কদাচিৎ
ভাঙে।

**Q: Integration test এমন কী ধরে, যা unit test পারে না?**

জোড়ার জায়গার যেকোনো কিছু। যে loading state কখনো সরে না, যে submit দুবার চলে, যে error branch কিছুই render করে না,
যে cache mutation-এর পরেও stale data দেয়। প্রতিটি unit আলাদাভাবে ঠিক থাকতে পারে, অথচ সব মিলিয়ে ভাঙা। সাধারণ একটি React
application-এ ঝুঁকির বেশিরভাগ থাকে এই মেলানোর জায়গাতেই।

**Q: এই স্তর আপনাকে কী বলতে পারে না?**

আসল server একমত কি না। Handler হলো API সম্পর্কে frontend-এর অনুমান। Backend কোনো field-এর নাম বদলালে প্রতিটি test
তবু pass করে, আর production ভেঙে যায়। এই ফাঁক বন্ধ করতে আসল contract-এর বিপরীতে একটি check লাগে: generate করা client,
shared schema, বা contract test। যা কিছুর জন্য আসল browser লাগে, এই স্তর সেগুলোও দেখতে পায় না: layout, focus order,
সত্যিকারের navigation।

**Q: Suite ধীর না করে loading state কীভাবে test করবেন?**

যে একটি test pending state assert করে, সেখানে একটি handler-এ ছোট একটি delay দিন। Resolve হওয়া content-এর জন্য await
করার আগেই spinner-এর ওপর assert করুন। ভুল হলো global delay দেওয়া। সেটা suite-এর প্রতিটি test-এ গুণ হয়ে যায়, আর কোনো
আত্মবিশ্বাসও যোগ করে না।

## এরপর কী পড়বেন

- [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest) — এই flow-গুলো যে query API দিয়ে লেখা
- [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) — যে journey-গুলো এই স্তর ঢাকতে পারে না, আর আপনার handler ও আসল API-র মাঝের contract-এর ফাঁক
