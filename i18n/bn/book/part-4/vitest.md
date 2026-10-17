---
sourceHash: "95cc48e7a840b78e386e6a7d26a395533f2be11c2de64a6619318b1fd071ff8e"
title: "Test লেখা: Vitest ও React Testing Library"
translatedAt: "2026-10-17T14:03:05.582Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Test লেখা: Vitest ও React Testing Library {#ch-vitest}

> Runner একবার set up করুন, user যেভাবে খোঁজেন সেভাবে query করুন, আর mock করুন শুধু boundary-তে।

**এই অধ্যায়ে:** runner কেন build config share করে · query আর তাদের অগ্রাধিকার · `userEvent`, আর wait ছাড়া async · mock আর fake timer · snapshot আর তার ফাঁদ

## 💡 মূল ধারণা

**Vitest test চালায় application-এর নিজের build pipeline দিয়ে।** একই Vite config, plugin আর alias পড়ে, তাই test-এ
code ঠিক build-এর মতোই আচরণ করে। নিজস্ব transform থাকা runner আপনাকে সবচেয়ে খারাপ ধরনের bug দেয়: test pass করে,
অথচ build fail করে।

**Testing Library আপনাকে component-এর ভেতরে ঢুকতে দেয় না।** Instance নেই, state নেই, props নেই: আছে শুধু DOM, আর
user-এর হাতে যা থাকে, যেমন text, role আর label। যে test implementation-এর খুঁটিনাটি দেখতে পায় না, সেটা এমন প্রতিটি
refactor-এ টিকে যায়, যেখানে behaviour একই থাকে। আর সবচেয়ে ভালো query-গুলো যেহেতু accessibility query, তাই যে
component query করা কঠিন, সেটা সাধারণত screen reader-এর জন্যও কঠিন।

## কীভাবে কাজ করে

### Config আর setup, একবারই লেখা

**Build config-এর পাশে runner config, আর প্রতিটি test file-এর আগে যে setup file চলে:**

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

Setup file-এ reset রাখলে isolation অভ্যাসের ব্যাপার থাকে না, default হয়ে যায়। jsdom (JavaScript-এ লেখা একটি DOM)
প্রতিটি file-এ startup-এর সময় নেয়। যে codebase-এ বেশিরভাগই বিশুদ্ধ logic, সেখানে default হিসেবে `node` দিলে test
দ্রুত চলে।

> ⚠️ **যা বদলাতে থাকে:** 2025-এ Vitest 4.x-এ পৌঁছেছে। Browser mode চলে গেছে আলাদা একটি provider package-এ, আর
> `workspace` file হয়ে গেছে মূল config-এর একটি `projects` field। টেকসই নীতি হলো, runner build-এর transform আর
> resolution উত্তরাধিকারসূত্রে পায়। কোনো config copy করার আগে তার বর্তমান shape দেখে নিন।

### Query: prefix আর অগ্রাধিকার

Element না থাকলে কী হবে, তা ঠিক করে prefix।

| ধরন    | Element না থাকলে          | Async | কখন ব্যবহার করবেন                            |
| ---------- | ------------------------ | ----- | ---------------------------------- |
| `getBy…`   | DOM print করে throw করে | না    | এখনই থাকার কথা       |
| `queryBy…` | `null` return করে           | না    | কিছু যে **নেই**, সেটা assert করতে  |
| `findBy…`  | Timeout-এর পরে throw করে | হ্যাঁ   | কোনো promise resolve হওয়ার পরে দেখা দেয় |

**অগ্রাধিকারের ক্রমে query — প্রথম যেটা কাজ করে, সেখানেই থামুন:**

```tsx
screen.getByRole("button", { name: /submit/i }); // 1. how a screen reader finds it
screen.getByLabelText(/email/i); // 2. form fields, by their label
screen.getByTestId("chart-canvas"); // 3. last resort: a canvas has nothing accessible
```

এই ক্রম style-এর ব্যাপার নয়। Assistive technology role আর label-ই ব্যবহার করে, তাই role query fail করলে সাধারণত
বুঝতে হবে markup ভুল। Fail করলে output-টা পড়ুন: তাতে page-এর প্রতিটি role তার accessible name সহ তালিকা করা থাকে।

### `userEvent` পুরো একটি interaction করে

**`fireEvent` একটি event dispatch করে; `userEvent` চালায় user-এর ঘটানো পুরো ধারাবাহিকতা:**

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

`userEvent` disabled বা hidden element-এ click করতেও রাজি হয় না। Disabled button-এ `fireEvent.click` তবু event
চালিয়ে দেয়, আর bug ship হয়ে যায়। Async output-এর জন্য `findBy` বারবার দেখে, যতক্ষণ না element দেখা দেয়। একটি
`getBy`-কে `waitFor`-এ মুড়ে দিলেও একই কাজ হয়, শুধু error message আরও খারাপ। ওটা রাখুন কোনো সংখ্যা গোনার জন্য।

### Provider tree-র জন্য একটিই custom render

**একটিই shared render, যাতে file ভেদে provider setup আলাদা হয়ে না যায়:**

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

### Mock থাকে boundary-তে

`vi.fn()` হলো একটি double, যা আপনি নিজে পাঠিয়ে দেন। `vi.spyOn(obj, "method")` আসল function-টাই রাখে, আর তার
call-গুলো লিখে রাখে। Module mock-এ বেশি সাবধান হতে হয়, কারণ **`vi.mock` file-এর প্রতিটি import-এর ওপরে hoist হয়**।
এর factory সবার আগে চলে, তাই file-এর body-তে define করা কোনো variable এটা ব্যবহার করতে পারে না।

**আংশিক module mock, যা একটি export বদলায়, বাকিগুলো রেখে দেয়:**

```typescript
import { vi } from "vitest";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return { ...actual, uploadToS3: vi.fn() };
});
```

পুরো module mock করলে বাকি প্রতিটি export হয়ে যায় `undefined`। Network call-এর জন্য module mock করবেনই না: request
intercept করুন, যাতে fetch layer আর error handling তবু চলে।

### Clock-এর জন্য অপেক্ষা না করে clock নিয়ন্ত্রণ করুন

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

Async সংস্করণটি ব্যবহার করুন। Timer যে promise callback schedule করে, সেগুলো চলে শুধু তখনই, যখন microtask-ও flush
হয়। মেয়াদ শেষ হওয়ার ব্যাপার আছে এমন যেকোনো কিছুর জন্য `vi.setSystemTime()` `Date.now()`-কে থামিয়ে রাখে।

### Snapshot, আর তার ফাঁদ

ছোট আর স্থির output-এর জন্য snapshot মানানসই, যেমন format করা একটি error string। বড় snapshot প্রতিটি সম্পর্কহীন
বদলে fail করে, কেউ না পড়েই `-u` দিয়ে আবার বানিয়ে ফেলে, আর তারপর সেটা কিছুই assert করে না।
`toMatchInlineSnapshot` ব্যবহার করুন, যাতে প্রত্যাশিত value এমন জায়গায় থাকে, যেখানে reviewer diff দেখতে পান।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                   | বেছে নিন                          | কেন                                           |
| ------------------------------------------- | ------------------------------- | --------------------------------------------- |
| Vite, React, Svelte বা Next.js project    | Vitest                          | Build config আবার ব্যবহার করে                    |
| Component-এর চোখে দেখা যায় এমন behaviour             | Vitest-এর ভেতরে Testing Library       | দ্রুত, আর user যা দেখেন তার ওপরই assert করে        |
| এমন hook, যার নিজের কোনো UI নেই                | `renderHook`                    | Host component-এর চেয়ে সস্তা                 |
| Layout, focus ring, আসল scrolling         | Browser mode বা Playwright      | jsdom-এ কোনো layout engine নেই                    |
| কয়েকটি page জুড়ে পুরো একটি journey                | Playwright                      | এখানে test হয় routing আর আসল build   |

## সাধারণ ভুল

❌ **কিছু নেই, তা assert করতে `getBy`।** Assertion চলার আগেই এটা throw করে।
✅ `queryBy` `null` return করে, আর `not.toBeInTheDocument()`-এর ঠিক এটাই দরকার।

❌ **Role query fail করেছে বলে `getByTestId`।** Query আসলে বলছিল, control-টার কোনো নাম নেই।
✅ Label ঠিক করুন। Test id রাখুন শুধু সেই content-এর জন্য, যাতে query করার মতো accessible কিছুই নেই।

❌ **`userEvent` call-এ `await` বাদ পড়া।** React আবার render করার আগেই assertion চলে যায়।
✅ প্রতিটি interaction-এ `await` দিন, আর প্রতিটি test-এ একবার `userEvent.setup()` call করুন।

## 🔑 মূল শিক্ষা

- Vitest চলে application-এর নিজের Vite pipeline-এ, তাই test আর build code-কে একইভাবে দেখে।
- Testing Library শুধু DOM দেখায়, আর সে কারণেই এর test refactor-এ টিকে যায়।
- Query-র অগ্রাধিকার assistive technology যা ব্যবহার করে তা মেনে চলে, তাই role query fail করা সাধারণত markup-এর bug।
- `vi.mock` প্রতিটি import-এর ওপরে hoist হয়, তাই এর factory local variable ধরে রাখতে পারে না।
- Cleanup, mock reset আর real timer রাখুন setup file-এ, যাতে isolation default হয়।

## Interview-এর প্রশ্ন

**Q: নতুন project-এ Jest-এর বদলে Vitest কেন বেছে নেবেন?**

এটা project-এর নিজের Vite config ব্যবহার করে, তাই test আর build একমত থাকে। এতে এক ধরনের ভুয়া pass পুরোপুরি দূর হয়।
API Jest-এর মতোই, তাই বদলানোর খরচ কম। যে project Vite দিয়ে build হয় না, সেখানে যুক্তিটা অনেক দুর্বল।

**Q: Testing Library কেন component-এর state-এ ঢুকতে দেয় না?**

যে test ভেতরের জিনিস পড়তে পারে, সেটা তার ওপরই assert করবে। তখন behaviour না বদলালেও প্রতিটি refactor-এ test ভাঙে।
যে test শুধু DOM পর্যন্ত সীমিত, সেটা fail করে শুধু তখন, যখন user যা দেখেন তা বদলায়। খরচ হলো, বিশুদ্ধ ভেতরের logic
আলাদা করে বের করে আলাদাভাবে unit test করতে হয়।

**Q: `getByTestId` কখন চলে?**

যখন element-এ query করার মতো accessible কিছু নেই, যেমন chart-এর canvas। Accessible name নেই এমন control পার হতে
এটা কখনো ব্যবহার করবেন না। সেখানে fail করা query-টা একটি আসল defect, আর test id সেটা লুকিয়ে ফেলে।

**Q: একটি test একা চালালে pass করে, suite-এ চালালে fail করে। কোথায় খুঁজবেন?**

ফাঁস হয়ে যাওয়া state-এ, তিনটি জায়গার কোনো একটিতে: module scope-এর shared data, কখনো clear না করা mock history, বা
চালু রেখে দেওয়া fake timer। তিনটিই ঠিক করুন setup file-এ, প্রতিটি test-এ আলাদা করে নয়। তবু fail করলে একটি worker
দিয়ে চালান, তাতে বোঝা যাবে সমস্যা ক্রমের ওপর নির্ভরতা, নাকি parallelism।

**Q: Module mock কখন ভুল tool?**

যখন আপনি আসলে network নকল করছেন। Module mock প্রমাণ করে আপনার code একটি function call করেছে, কোন request বেরিয়েছে
তা নয়। Fetch layer আর error handling-ও এতে বাদ পড়ে যায়। Request intercept করলে test হয় সেই code-এর, যা production-এ চলে।

## এরপর কী পড়বেন

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — একই query, intercept করা network-এর বিপরীতে
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — যেখানে role query হয়ে যায় conformance check
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — এই অধ্যায়ের isolation-এর নিয়মগুলো যেখান থেকে আসে
