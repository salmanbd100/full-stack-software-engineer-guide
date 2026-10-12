---
sourceHash: "0556cff00d0ede5947a08b703d3f57c17c9b6c18a99d7e94616778eb4392a32c"
title: "Frontend Integration Testing"
translatedAt: "2026-10-12T12:13:51.654Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Frontend Integration Testing {#ch-frontend-integration-testing}

> শুধু network-টা fake করুন, আর কিছু নয়। তাহলে test সেই wiring-টা চালায়, যেখানে আসল bug-গুলো থাকে।

**এই অধ্যায়ে:** frontend-এ "integration" মানে কী · module mock বনাম request interception · একটি পূর্ণ flow-এর উদাহরণ · যে unhappy path-গুলো সত্যিই ভাঙা অবস্থায় ship হয় · দুই test-এর মাঝে reset

## 💡 মূল ধারণা

Frontend-এ integration test-এর একটাই নিয়ম: **network ছাড়া সবকিছু আসল।** আসল child component, আসল state, আসল
routing, আসল form library, আসল query cache। বদলানো হয় শুধু HTTP boundary-তে।

এই একটি নিয়মই অনেক কাজ করে। এ কারণেই এই layer গুরুত্বপূর্ণ bug-গুলো ধরে: এমন loading state যেটা কখনো সরে না,
এমন form যেটা দুবার post করে, এমন error path যেটা কেউ render করেনি, এমন cache যেটা mutation-এর পরেও পুরোনো data
দেয়। এগুলোর কোনোটাই একটি function-এর ভেতরে থাকে না। এরা থাকে টুকরোগুলোর মাঝের জোড়ায়। যে test সেই টুকরোগুলো
mock করে সরিয়ে দেয়, সে এগুলো দেখতে পায় না।

এ কারণেই layer-টা সস্তাও। চালু করার মতো কোনো browser নেই, চালানোর মতো কোনো server নেই। তাই বারো ধাপের একটি
user flow-এর খরচ কয়েকশো millisecond।

> ⚠️ **যা বদলাতে থাকে:** Mock Service Worker version 2-এ তার handler API নতুন করে লিখেছে। `rest` হয়ে গেছে `http`,
> আর `res(ctx.json())` chain-এর জায়গায় এখন একটি `HttpResponse` return করতে হয়। প্রকাশিত বেশিরভাগ উদাহরণ এমন
> shape ব্যবহার করে, যেটা আর চলে না। টেকসই নীতিটা এই rewrite-এর পরেও টিকে আছে: network boundary-তে intercept
> করুন, module boundary-তে নয়।

## কীভাবে কাজ করে

### Request intercept করুন, module mock করবেন না

দুই পদ্ধতিতেই component fake data render করে। কিন্তু শুধু একটিই আপনার code test করে।

| | Module mock (`vi.mock("./api")`) | Request interception |
| --- | --- | --- |
| কী চলে | আপনার component | আপনার component **আর** আপনার fetch layer |
| কী প্রমাণ করে | একটি function call হয়েছে | সঠিক request পাঠানো হয়েছে |
| কী বাদ পড়ে | URL তৈরি, header, serialisation, error mapping | কিছুই না |
| কখন ভাঙে | Module-এর নাম বদলালে | Request contract বদলালে — যেটাই সঠিক |

দ্বিতীয় column-টাই গুরুত্বপূর্ণ। Module mock assert করে যে `getUser("1")` call হয়েছে। Request-এ auth header ছিল কি না,
সঠিক path-এ গেছে কি না, বা 500 সামলেছে কি না — এ নিয়ে সে কিছুই বলে না। Production-এ ঠিক এগুলোই ভাঙে।

Mock Service Worker network layer-এ intercept করে, তাই `fetch` সত্যিই চলে:

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

`onUnhandledRequest: "error"` ঐচ্ছিক নয়। এটা না থাকলে, যে URL handle করতে ভুলে গেছেন সেখানে request গেলে সেটা আসল
network-এ চলে যায়। তখন network access থাকলে test pass করে, আর CI-তে fail করে। আরও খারাপ, এটা চুপচাপ কোনো live
service-এ আঘাত করতে পারে।

### একটি flow, একটি assertion নয়

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

ওই চার line-এ ছয়টি টুকরো একসাথে কাজ করে, আর এদের যেকোনোটিই ভাঙা জিনিসটা হতে পারে। মূল কথাটা এটাই। Submit
handler-এর একটি unit test pass করে যেত, অথচ button disabled-ই থেকে যেত।

### আসল মূল্য unhappy path-এ

Happy path-ই developer-রা বানায় আর demo করে, তাই সেগুলো খুব কমই ভাঙা থাকে। Error, empty state আর ধীর response —
এগুলো কেউ দেখেনি। প্রতিটি test-এ একটি handler override করুন:

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

চারটি handler variation বেশিরভাগ ভুল ঢেকে দেয়: একটি 500, একটি 401, একটি খালি list, আর একটি ধীর response।
প্রতিটি গুরুত্বপূর্ণ flow-এর জন্য এই চারটি লেখা unit test দ্বিগুণ করার চেয়ে বেশি কাজে দেয়।

> ⚠️ Handler-এর ভেতরে একটি `delay()` সত্যিকারের অপেক্ষা। এটা ছোট রাখুন, আর শুধু সেখানে ব্যবহার করুন যেখানে
> pending state-টাই assertion। 200 ms delay-সহ দশটি test মানে কোনো লাভ ছাড়াই suite-এ দুই সেকেন্ড বাড়তি।

### Reset করুন, নইলে test-গুলো নিজেরাই একে অপরের সাথে জড়িয়ে যায়

`afterEach`-এ `server.resetHandlers()` একটি test-এর override-কে পরের test-এ চুইয়ে পড়তে দেয় না। প্রতিটি render-এ নতুন
query client-ও একই কাজ করে। Shared cache থাকলে দ্বিতীয় test প্রথম test-এর data পড়ে, আর failure-টা দেখতে
component-এর bug-এর মতো লাগে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কোথায় test করবেন | কেন |
| --------- | ------- | --- |
| যে form validate করে, submit করে আর confirm করে | Integration | এক test-এ প্রতিটি জোড়া, এক সেকেন্ডের কম সময়ে |
| Loading, error আর empty state | Integration, handler override দিয়ে | প্রতিটি response জোর করে আনার সবচেয়ে সস্তা জায়গা |
| Mutation-এর পরে cache invalidation | Integration | আসল query client, আসল refetch |
| Form যে pure calculation ব্যবহার করে | Unit | দ্রুততর, আর একশোটা case cover করে |
| Routing, আসল cookie, এক page থেকে আরেক page-এ state | End-to-end — [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) | আসল browser-টাই তখন test-এর বিষয় |
| এমন back-end contract যেটা সরে গিয়ে থাকতে পারে | Contract testing — [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) | Handler হলো আপনার অনুমান, server-এর সত্য নয় |

শেষ row-টাই সৎ সীমাবদ্ধতা। Handler হলো API কী return করে সে সম্পর্কে একটি বক্তব্য, যেটা frontend লিখেছে। Server
তার response বদলালে এই test-গুলোর প্রতিটি তবুও pass করে।

## সাধারণ ভুল

❌ **হাতে `fetch` mock করা।** তখন আপনি একটি fake test করছেন, আর প্রতিটি call site-এর নিজস্ব setup লাগে।
✅ Network layer-এ intercept করুন, যাতে আসল request code চলে।

❌ **`onUnhandledRequest: "error"` বাদ দেওয়া।** Mock না করা call চুপচাপ আসল network-এ পৌঁছে যায়।
✅ এটা set করুন, আর unhandled request-কে failing test হিসেবে ধরুন।

❌ **শুধু happy path test করা।** 500, 401 আর খালি list — এগুলোই ভাঙা অবস্থায় ship হয়।
✅ গুরুত্বপূর্ণ প্রতিটি flow-এ, প্রতিটি failure mode-এর জন্য একটি করে handler override।

❌ **Flow-কে "isolate" করতে নিজের component mock করা।** Integration-টাই test-এর বিষয়। আপনি সেটাই সরিয়ে
দিয়েছেন।
✅ আসল tree render করুন। শুধু network বদলান।

❌ **একটি override রেখে দেওয়া।** পরের test একটি 500 উত্তরাধিকারে পায়, আর কোনো দৃশ্যমান কারণ ছাড়াই fail করে।
✅ `afterEach`-এ `resetHandlers()`, আর প্রতিটি render-এ নতুন query client।

## 🔑 মূল শিক্ষা

- Frontend-এ integration মানে network ছাড়া সবকিছু আসল।
- Request interception আপনার fetch layer test করে; module mock সেটাকে test থেকে মুছে দেয়।
- `onUnhandledRequest: "error"`-ই ভুলে যাওয়া handler-কে আসল network-এ পৌঁছাতে দেয় না।
- Unhappy path — 500, 401, খালি, ধীর — এখানেই এই layer তার খরচ উসুল করে।
- Handler API সম্পর্কে আপনার অনুমান ধরে রাখে, তাই server-এর দিকের পরিবর্তন সে ধরতে পারে না।

## Interview-এর প্রশ্ন

**Q: API module mock না করে request intercept কেন করবেন?**

কারণ module mock সেই code-টাই সরিয়ে দেয়, যেটার ভুল হওয়ার সম্ভাবনা সবচেয়ে বেশি। Interception URL তৈরি, header,
serialisation আর error mapping-কে test-এর ভেতরে রাখে। তাই user কী দেখে সে বিষয়ে একটি assertion এটাও দেখায় যে
request সঠিক ছিল। Module mock শুধু প্রমাণ করে যে একটি function কিছু argument নিয়ে call হয়েছে, আর ভাঙা অংশটা খুব
কমই সেটা হয়।

**Q: Integration test এমন কী ধরে, যা unit test পারে না?**

জোড়ার ভেতরের যেকোনো কিছু। এমন loading state যেটা কখনো সরে না, এমন submit যেটা দুবার fire হয়, এমন error branch
যেটা কিছুই render করে না, এমন cache যেটা mutation-এর পরেও পুরোনো data দেয়। প্রতিটি unit সঠিক হতে পারে, অথচ তাদের
জোড়াটা ভাঙা। একটি সাধারণ React application-এ ঝুঁকির বেশিরভাগটাই থাকে এই জোড়ায়।

**Q: এই layer আপনাকে কী বলতে পারে না?**

আসল server একমত কি না। Handler হলো API সম্পর্কে frontend-এর অনুমান। Backend একটি field-এর নাম বদলালে প্রতিটি test
তবুও pass করে, আর production ভেঙে যায়। এই ফাঁক বন্ধ করতে আসল contract-এর বিরুদ্ধে একটি check লাগে: একটি generated
client, একটি shared schema, বা contract test। এটা এমন কিছুও দেখতে পায় না, যার জন্য আসল browser লাগে: layout,
focus order, সত্যিকারের navigation।

**Q: Suite ধীর না করে কীভাবে একটি loading state test করবেন?**

যে একটি test pending state assert করে, শুধু সেখানে একটি handler-এ ছোট একটি delay যোগ করুন। Resolve হওয়া content-এর
জন্য await করার আগে spinner-এর ওপর assert করুন। ভুলটা হলো একটি global delay। সেটা suite-এর প্রতিটি test-এ গুণ হয়ে
যায়, আর কোনো বাড়তি আস্থা দেয় না।

## এরপর কী পড়বেন

- [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest) — যে query API দিয়ে এই flow-গুলো লেখা হয়
- [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) — যে journey-গুলো এই layer cover করতে পারে না, আর আপনার handler ও আসল API-এর মাঝের contract-এর ফাঁক
