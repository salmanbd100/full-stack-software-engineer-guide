---
sourceHash: "95cc48e7a840b78e386e6a7d26a395533f2be11c2de64a6619318b1fd071ff8e"
title: "Test লেখা: Vitest ও React Testing Library"
translatedAt: "2026-10-12T12:17:29.416Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Test লেখা: Vitest ও React Testing Library {#ch-vitest}

> Runner একবার set up করুন, একজন user যেভাবে খোঁজেন সেভাবে query করুন, আর mock করুন শুধু boundary-তে।

**এই অধ্যায়ে:** কেন runner build config share করে · query আর তাদের priority · `userEvent` আর অপেক্ষা ছাড়া async · mock আর fake timer · snapshot আর তার ফাঁদ

## 💡 মূল ধারণা

**Vitest test চালায় application-এর নিজের build pipeline দিয়ে।** এটা একই Vite config, plugin আর alias পড়ে, তাই
test-এ code ঠিক build-এর মতোই আচরণ করে। নিজস্ব transform থাকা একটি runner আপনাকে সবচেয়ে খারাপ ধরনের bug দেয়: test
pass করে, আর build fail করে।

**Testing Library আপনাকে component-এ কোনো access দেয় না।** কোনো instance নেই, state নেই, props নেই: শুধু DOM, আর
একজন user-এর হাতে যা থাকে, যেমন text, role আর label। যে test implementation detail দেখতে পায় না, সেটা behaviour একই
রাখা প্রতিটি refactor-এ টিকে থাকে। আর যেহেতু সবচেয়ে ভালো query-গুলো accessibility query, যে component query করা কঠিন,
সেটা সাধারণত একটি screen reader-এর জন্যও কঠিন।

## কীভাবে কাজ করে

### Config আর setup, একবারই লেখা

**Build config-এর পাশে runner config, আর প্রতিটি test file-এর আগে এটা যে setup file চালায়:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()], // the same plugin the app builds with
  test: {
    environment: "jsdom", // "node" for anything without a DOM
    setupFiles: ["./vitest.setup.ts"],
  },
});

// vitest.setup.ts
import "@testing-library/jest-dom/vitest"; // DOM matchers such as toBeVisible
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup(); // unmount, or the DOM leaks into the next test
  vi.clearAllMocks(); // drop call history, keep implementations
  vi.useRealTimers(); // a frozen clock must not outlive its test
});
```

Setup file-এ reset রাখলে isolation অভ্যাস নয়, default হয়ে যায়। jsdom (JavaScript-এ লেখা একটি DOM) প্রতি file-এ
startup time খরচ করে। যে codebase-এ বেশিরভাগই pure logic, সেটা `node` default হিসেবে রাখলে দ্রুত চলে।

> ⚠️ **যা বদলাতে থাকে:** Vitest 2025-এ 4.x-এ পৌঁছেছে। Browser mode একটি provider package-এ সরে গেছে, আর
> `workspace` file হয়ে গেছে main config-এর একটি `projects` field। টেকসই নীতি হলো, runner build-এর transform আর
> resolution উত্তরাধিকার সূত্রে পায়। কোনো config copy করার আগে তার বর্তমান shape check করুন।

### Query: prefix আর priority

Element না থাকলে কী হবে, তা ঠিক করে prefix।

| Variant    | Element না থাকলে          | Async | কীসের জন্য                            |
| ---------- | ------------------------ | ----- | ---------------------------------- |
| `getBy…`   | DOM print করে throw করে | না    | এটা এখনই থাকার কথা       |
| `queryBy…` | `null` return করে           | না    | কিছু একটি **নেই**, তা assert করা  |
| `findBy…`  | Timeout-এর পর throw করে | হ্যাঁ   | একটি promise resolve হওয়ার পর এটা দেখা দেয় |

**Priority-র ক্রমে query — প্রথম যেটা কাজ করে, সেখানেই থামুন:**

```tsx
screen.getByRole("button", { name: /submit/i }); // 1. how a screen reader finds it
screen.getByLabelText(/email/i); // 2. form fields, by their label
screen.getByTestId("chart-canvas"); // 3. last resort: a canvas has nothing accessible
```

এই ক্রম style-এর ব্যাপার নয়। Assistive technology role আর label-ই ব্যবহার করে, তাই একটি role query fail করা সাধারণত
মানে markup ভুল। Fail করলে output পড়ুন: এটা page-এর প্রতিটি role তার accessible name সহ list করে।

### `userEvent` একটি interaction সম্পন্ন করে

**`fireEvent` একটি event dispatch করে; `userEvent` একজন user-এর ঘটানো পুরো sequence চালায়:**

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

`userEvent` একটি disabled বা hidden element-এ click করতেও অস্বীকার করে। একটি disabled button-এ `fireEvent.click`
তবুও fire করে, আর bug ship হয়ে যায়। Async output-এর জন্য `findBy` element দেখা না দেওয়া পর্যন্ত poll করে। একটি
`getBy`-এর চারপাশে `waitFor` একই জিনিস, শুধু error আরও খারাপ। ওটা একটি count-এর জন্য রাখুন।

### Provider tree-এর জন্য একটি custom render

**একটি shared render, যাতে provider setup file থেকে file-এ আলাদা হয়ে যেতে না পারে:**

```tsx
// test-utils.tsx
function AllProviders({ children }: { children: ReactNode }) {
  // built per render, so cached data cannot leak; retry: false, so failures are fast
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
export { customRender as render };
```

### Mock বসে boundary-তে

`vi.fn()` হলো একটি double, যেটা আপনি pass করেন। `vi.spyOn(obj, "method")` আসল function রেখে দেয়, আর তার call record
করে। Module mock-এ বেশি সাবধান হতে হয়, কারণ **`vi.mock` file-এর প্রতিটি import-এর ওপরে hoist হয়**। এর factory আগে
চলে, তাই file-এর body-তে define করা কোনো variable এটা ব্যবহার করতে পারে না।

**একটি partial module mock, যেটা একটি export বদলায় আর বাকিগুলো রেখে দেয়:**

```typescript
import { vi } from "vitest";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return { ...actual, uploadToS3: vi.fn() };
});
```

একটি whole-module mock অন্য প্রতিটি export-কে `undefined` বানিয়ে দেয়। Network call-এর জন্য module mock করবেনই না:
request intercept করুন, যাতে fetch layer আর error handling তবুও চলে।

### Clock-এর জন্য অপেক্ষা না করে, তাকে নিয়ন্ত্রণ করুন

**Fake timer দিয়ে একটি retry test:**

```typescript
it("retries after the backoff window", async () => {
  vi.useFakeTimers();
  const send = vi.fn().mockRejectedValueOnce(new Error("503")).mockResolvedValue("ok");
  const result = sendWithRetry(send); // schedules a retry with setTimeout
  await vi.advanceTimersByTimeAsync(1_000); // fires timers and flushes promises

  expect(send).toHaveBeenCalledTimes(2);
  await expect(result).resolves.toBe("ok");
});
```

Async version ব্যবহার করুন। একটি timer যে promise callback schedule করে, সেগুলো তখনই চলে, যখন microtask-ও flush হয়।
Expiry আছে এমন যেকোনো কিছুর জন্য `vi.setSystemTime()` `Date.now()`-কে থামিয়ে রাখে।

### Snapshot, আর তার ফাঁদ

ছোট, স্থির output-এর জন্য snapshot মানায়, যেমন একটি formatted error string। বড় একটি snapshot প্রতিটি সম্পর্কহীন
পরিবর্তনে fail করে, না পড়েই `-u` দিয়ে আবার তৈরি হয়, আর তারপর কিছুই assert করে না। `toMatchInlineSnapshot` বেছে নিন,
যাতে প্রত্যাশিত value সেখানে থাকে, যেখানে একজন reviewer diff দেখেন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                   | বেছে নিন                          | কেন                                           |
| ------------------------------------------- | ------------------------------- | --------------------------------------------- |
| একটি Vite, React, Svelte বা Next.js project    | Vitest                          | এটা build config আবার ব্যবহার করে                    |
| একটি component-এর দৃশ্যমান behaviour             | Vitest-এ Testing Library       | দ্রুত, আর user যা দেখেন তা নিয়ে assert করে        |
| নিজস্ব কোনো UI নেই এমন একটি hook                | `renderHook`                    | একটি host component-এর চেয়ে সস্তা                 |
| Layout, focus ring, আসল scrolling         | Browser mode বা Playwright      | jsdom-এর কোনো layout engine নেই                    |
| একাধিক page জুড়ে একটি পুরো journey                | Playwright                      | Routing আর একটি আসল build-ই এখানে test হয়   |

## সাধারণ ভুল

❌ **অনুপস্থিতি assert করতে `getBy`।** Assertion চলার আগেই এটা throw করে।
✅ `queryBy` `null` return করে, ঠিক যেটা `not.toBeInTheDocument()`-এর দরকার।

❌ **Role query fail করেছে বলে `getByTestId`।** Query আপনাকে বলছিল যে control-টির কোনো নাম নেই।
✅ Label ঠিক করুন। Test id রাখুন এমন content-এর জন্য, যেখানে query করার মতো accessible কিছু নেই।

❌ **একটি `userEvent` call-এ `await` বাদ পড়া।** React re-render করার আগেই assertion চলে যায়।
✅ প্রতিটি interaction `await` করুন, আর প্রতি test-এ একবার `userEvent.setup()` call করুন।

## 🔑 মূল শিক্ষা

- Vitest application-এর নিজের Vite pipeline-এ চলে, তাই test আর build code-কে একইভাবে দেখে।
- Testing Library শুধু DOM দেখায়, আর এ কারণেই এর test refactor-এ টিকে থাকে।
- Query priority assistive technology যা ব্যবহার করে তা অনুসরণ করে, তাই একটি fail করা role query সাধারণত একটি markup bug।
- `vi.mock` প্রতিটি import-এর ওপরে hoist হয়, তাই এর factory local variable-এর ওপর close করতে পারে না।
- Cleanup, mock reset আর real timer setup file-এ রাখুন, যাতে isolation default হয়।

## Interview-এর প্রশ্ন

**Q: একটি নতুন project-এ Jest-এর বদলে Vitest কেন বেছে নেবেন?**

এটা project-এর নিজের Vite config ব্যবহার করে, তাই test আর build একমত থাকে। এতে এক শ্রেণির মিথ্যা pass দূর হয়। API
Jest-এর সাথে মেলে, তাই বদলানো সস্তা। যে project Vite দিয়ে build হয় না, সেখানে যুক্তিটা অনেক দুর্বল।

**Q: Testing Library কেন আপনাকে component state-এ access দিতে অস্বীকার করে?**

যে test internal পড়তে পারে, সে সেগুলো নিয়ে assert করবেই। তখন behaviour না বদলালেও প্রতিটি refactor test ভাঙে। DOM-এ
সীমাবদ্ধ একটি test শুধু তখনই fail করে, যখন user যা দেখেন তা বদলায়। খরচ হলো, pure internal logic বের করে এনে আলাদাভাবে
unit-test করতে হয়।

**Q: কখন `getByTestId` গ্রহণযোগ্য?**

যখন element-এ query করার মতো accessible কিছু নেই, যেমন একটি chart canvas। Accessible name নেই এমন একটি control পার
হতে এটা কখনো ব্যবহার করবেন না। সেখানে fail করা query একটি আসল ত্রুটি, আর test id সেটা লুকিয়ে ফেলে।

**Q: একটি test একা pass করে, আর suite-এ fail করে। কোথায় খুঁজবেন?**

Leak হওয়া state, তিনটি জায়গার একটিতে: module scope-এ shared data, কখনো clear না করা mock history, বা চালু রেখে দেওয়া
fake timer। তিনটিই setup file-এ ঠিক করুন, প্রতি test-এ নয়। তবুও fail করলে, একটি worker দিয়ে চালান, যাতে ক্রমের ওপর
নির্ভরতা আর parallelism-কে আলাদা করে চেনা যায়।

**Q: কখন একটি module mock ভুল যন্ত্র?**

যখন আপনি আসলে network নকল করছেন। একটি module mock প্রমাণ করে আপনার code একটি function call করেছে, কোন request বেরিয়েছে
তা নয়। এটা fetch layer আর error handling-ও এড়িয়ে যায়। Request intercept করলে সেই code test হয়, যেটা production-এ চলে।

## এরপর কী পড়বেন

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — একই query, একটি intercept করা network-এর বিপরীতে
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — যেখানে role query একটি conformance check হয়ে যায়
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — এই অধ্যায়ের isolation-এর নিয়মগুলো যেখান থেকে আসে
