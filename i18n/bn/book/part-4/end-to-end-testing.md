---
sourceHash: "8e5cf20b529399171c8a79de9eab89a5b4c7d4e36fcbf070e44877820e6e5a3a"
title: "Playwright দিয়ে End-to-End, Visual ও Contract Testing"
translatedAt: "2026-10-12T12:14:47.941Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Playwright দিয়ে End-to-End, Visual ও Contract Testing {#ch-end-to-end-testing}

> যে অল্প কয়েকটি browser test তাদের runtime-এর যোগ্য, শুধু সেগুলো লিখুন। তারপর সেটা cover করুন, যা কোনো assertion দেখতে পায় না: page দেখতে কেমন, আর API এখনো একমত কি না।

**এই অধ্যায়ে:** শুধু একটি আসল browser কী প্রমাণ করতে পারে · locator, auto-waiting আর বারবার ব্যবহার করা login · রোজকার noise ছাড়া visual regression · API drift-এর বিরুদ্ধে contract check · CI-তে কোনটা কোথায় চলে

## 💡 মূল ধারণা

End-to-end test-ই একমাত্র test, যেটা **আপনার আসল build চালায়, আসল browser engine-এ, আসল server-এর বিরুদ্ধে**। এর
পুরো মূল্য এটুকুই। এ কারণেই এটা ধীর, আর মাঝে মাঝে আপনার কোনো দোষ ছাড়াই fail করে। তাই **journey-গুলোর সবচেয়ে ছোট
set বেছে নিন, যাদের failure মেনে নেওয়া যায় না, আর সেই সংখ্যাটা রক্ষা করুন**: বেশিরভাগ product-এর জন্য তিন থেকে দশটি।

বাকি সব test একটি প্রত্যাশিত value-কে একটি আসল value-এর সাথে তুলনা করে। এভাবে তিনটি failure-এ পৌঁছানো যায় না:

| Failure | কেন assertion সেখানে পৌঁছাতে পারে না | Tool |
| ------- | -------------------------------- | -------- |
| "Layout ভেঙে গেছে" | চেহারা হাজার হাজার pixel, একটি value নয় | Visual regression |
| "API বদলে গেছে" | আপনার test API-টাকে fake করেছে, তাই সে নিজের সাথেই একমত | Contract testing |
| "আমাদের test bug ধরে না" | Pass করা suite নিজের অন্ধ জায়গাগুলোর কথা জানাতে পারে না | Mutation testing |

## কীভাবে কাজ করে

### Component testing কোথায় থামে আর E2E কোথায় শুরু হয়

| Environment | Layout engine | Network | প্রতি test-এর খরচ |
| ----------- | ------------- | ------- | ------------- |
| **jsdom** (Vitest-এর default) | নেই | Intercepted | ~10 ms |
| **Browser mode** — আসল engine, একটি component | আসল | Intercepted | ~100 ms |
| **End-to-end** — আসল engine, আসল app | আসল | আসল | কয়েক সেকেন্ড |

- **jsdom-এর কোনো layout engine নেই।** Element-এর size, scroll, `IntersectionObserver` আর sticky header — সবগুলোর
  জন্যই আসল browser লাগে।
- **শুধু end-to-end-এর আসল server আছে।** Header, cookie, redirect আর built bundle শুধু এখানেই test করা যায়, কারণ
  নিচের প্রতিটি layer server-কে fake করে।

একটি flow *লম্বা* বলে E2E বেছে নেবেন না। বারো ধাপের একটি form-ও একটি integration test,
[Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) যেমনটা দেখায়।

### কেন Playwright-ই default

Cypress test-টা page-এর *ভেতরে* চালায়। এতে চমৎকার একটি debugger পাওয়া যায়, কিন্তু tab, cross-origin আর iframe
ঝামেলার। Playwright browser-কে *বাইরে* থেকে চালায়, তাই এগুলোর কোনোটাই বিশেষ কিছু নয়। এটা WebKit-ও চালায়।

### Locator নিজে থেকে অপেক্ষা করে, আর এতেই বেশিরভাগ flake দূর হয়

Playwright-এর locator হলো একটি **query, যেটা প্রতিবার ব্যবহারের সময় আবার চলে**। কোনো action-এর আগে Playwright
অপেক্ষা করে, যতক্ষণ না element-টি attached, visible, stable আর enabled হয়।

**Web-first assertion দিয়ে একটি login journey:**

```typescript
import { test, expect } from "@playwright/test";

test("a user can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Log in" }).click();

  // Web-first assertions retry until they pass or time out.
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});
```

Locator বাছুন [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest)-এর মতো করে: আগে role
আর label, accessible text না থাকলে test id, CSS কখনো নয়।

> ⚠️ `page.waitForTimeout(2000)` ধীর, flaky suite-এর একক সবচেয়ে বড় কারণ। প্রতিটি সত্যিকারের অপেক্ষার একটি
> condition থাকে: `toBeVisible`, `toHaveURL`, `waitForResponse`। একটি নির্দিষ্ট sleep ব্যস্ত CI runner-এ খুব ছোট, আর
> দ্রুত runner-এ সময়ের অপচয়।

### একবার login করুন, আর CI সাবধানে configure করুন

`beforeEach`-এর ভেতরে login করা প্রায়ই suite-এর runtime-এর বেশিরভাগ খেয়ে ফেলে। একবার login করুন, আর state-টা
বারবার ব্যবহার করুন।

**একটি setup project, আর CI setting যেগুলোর পক্ষে লড়াই করা উচিত:**

```typescript
// auth.setup.ts — runs before the test projects
setup("authenticate", async ({ page }) => {
  await logIn(page);
  await page.context().storageState({ path: ".auth/user.json" }); // cookies + localStorage
});

// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // a stray test.only cannot silently skip the suite
  retries: process.env.CI ? 2 : 0,
  use: { trace: "on-first-retry" },
  webServer: { command: "pnpm build && pnpm start", url: "http://localhost:3000" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { storageState: ".auth/user.json" }, dependencies: ["setup"] },
  ],
});
```

এমন একটি test রাখুন, যেটা stored state ব্যবহার **করে না**, যাতে login নিজেই test হয়। **Production build**-এ
`webServer` চালালে suite build output-এর bug ধরতে পারে। Retry একটি flake-কে merge আটকাতে দেয় না। কিন্তু এটা flake
**লুকিয়েও** ফেলে, তাই retry হওয়া test-গুলো report করুন আর সেগুলোর পেছনে লাগুন।

### Visual regression pixel তুলনা করে, DOM নয়

Markup না বদলালে একটি DOM snapshot pass করে। এটা ভুল colour token, 1280px-এ overlap, বা button লুকিয়ে ফেলা
`z-index` দেখতে পায় না। এগুলোর জন্য একটি image লাগে।

**এমন একটি screenshot test, যেটা চুপচাপ থাকে:**

```typescript
test("the pricing page is visually unchanged", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveScreenshot("pricing.png", {
    animations: "disabled", // freeze transitions, or every run differs
    mask: [page.getByTestId("live-user-count")], // black out live content
    maxDiffPixels: 100, // absorb sub-pixel font rendering
  });
});
```

ওই option-গুলো ছাড়া test প্রতিবার fail করে, আর team diff না পড়েই approve করতে শিখে যায়। **Baseline তৈরি করুন সেই
platform-এ, যেখানে তুলনা হয়।** macOS-এর baseline একটি Linux runner থেকে প্রায় প্রতিটি glyph-এ আলাদা। Visual test
সবচেয়ে বেশি কাজে দেয় design-system component-এ: চারটি state-এ চল্লিশটি component মানে 160টি screenshot, যেগুলো কেউ
হাতে check করতে পারত না।

### Contract testing সেই drift ধরে, যা আপনার mock লুকিয়ে রাখে

Integration test-এর handler সেটা ধরে রাখে, যা frontend *বিশ্বাস করে* API return করে। Server একটি field-এর নাম বদলালে
সেই test-গুলোর প্রতিটি তবুও pass করে।

**সস্তা সমাধান — যে schema দিয়ে parse করেন, তার বিরুদ্ধে একটি আসল response check করুন:**

```typescript
import { z } from "zod";

const User = z.object({ id: z.string().uuid(), name: z.string(), email: z.string().email() });

// Runs against a real deployed environment, not a mock.
test("the users endpoint still returns the shape we parse", async ({ request }) => {
  const res = await request.get(`${process.env.API_URL}/api/users/1`);
  expect(User.safeParse(await res.json()).success).toBe(true);
});
```

প্রতিটি endpoint-এর জন্য একটি করে, staging-এর বিরুদ্ধে, একটি schedule-এ চালান। যেদিন field-এর নাম বদলে ship হয়,
সেদিনই এটা সেটা ধরে ফেলে। পূর্ণ সংস্করণ হলো **consumer-driven contract**: consumer প্রকাশ করে তার কী লাগে, আর কোনো
পরিবর্তন সেটা ভাঙলে provider-এর নিজের pipeline fail করে। এর জন্য একটি shared broker আর API team-এর সম্মতি লাগে। একটি
API অনেক team ব্যবহার করলে এটা লাভজনক, আর একই team দুই দিক ship করলে বাড়াবাড়ি।

> ⚠️ **যা বদলাতে থাকে:** contract-testing tool ঘনঘন বদলায়, আর OpenAPI বা GraphQL schema থেকে generate করা client
> এখন তাদের কাজের বড় অংশ করে দেয়। টেকসই নীতিটা হলো, mock আপনার অনুমান, আর কিছু একটাকে সেটা provider-এর বাস্তবতার
> সাথে তুলনা করতেই হবে। API যদি একই repo-তে end-to-end typed হয়, তাহলে compiler-ই সেটা করে — দেখুন
> [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)।

### Mutation testing, আর কোনটা কোথায় চলে

Coverage গোনে কোন line-গুলো চলেছে। Mutation testing আপনার code বদলে দেয় (`age >= 18` হয়ে যায় `age > 18`) আর দেখে
কোনো test fail করে কি না। কোনোটাই না করলে `age === 18` untested, 100% coverage থাকলেও। Suite প্রতিটি mutant-এর জন্য
একবার চলে, তাই এটা দামি module-গুলোর একটি audit, gate নয়।

| ধাপ | কী চলে | কেন সেখানে |
| ----- | ---- | --------- |
| প্রতিটি pull request | Unit, integration, বদলানো component-এ visual, মূল journey-তে E2E | যথেষ্ট দ্রুত; diff-টাই review |
| একটি schedule-এ | Staging-এর বিরুদ্ধে contract check | Deploy করা environment লাগে |
| Deploy-এর পরে | Smoke test — production-এর বিরুদ্ধে সেই অল্প কয়েকটি journey | "এটা কি সত্যিই চালু আছে?" |
| মাঝে মাঝে | Pricing, permission, তারিখের হিসাবে mutation testing | Gate করার জন্য খুব ধীর |

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী দিয়ে test করবেন | কেন |
| --------- | --------- | --- |
| Login, checkout, payment | End-to-end | Failure-এ টাকা যায়; কয়েকটি ধীর test-এর দাম আছে |
| একটি security header, cookie flag বা redirect | End-to-end | নিচের কোনো layer-এর আসল server নেই |
| Validation-সহ লম্বা form flow | Integration | দৈর্ঘ্য end-to-end-এ যাওয়ার কারণ নয় |
| একটি design system, বা token refactor | Visual regression | সংজ্ঞা অনুযায়ীই failure-টা visual |
| এমন API, যেটা অন্য team-এর আর তারা একা release করে | Consumer-driven contract | Fail করা উচিত তাদের pipeline, আপনারটা নয় |
| আপনার team-এর API, একই repo-তে | একটি typed client, বা একটি schema check | সস্তা; কাজটা compiler করে |

## সাধারণ ভুল

❌ **একটি live third-party API-এর ওপর নির্ভর করা।** তাদের outage আপনার লাল pipeline হয়ে দাঁড়ায়।
✅ External call-টা `page.route` করুন, আর নিজের backend আসল রাখুন।

❌ **যে test-গুলো data share করে।** ক্রমানুসারে চললে pass করে, parallel-এ fail করে — আর parallel-ই default।
✅ প্রতিটি test তার যা লাগে নিজে তৈরি করে, UI দিয়ে নয়, API দিয়ে।

❌ **Local-এ তৈরি visual baseline, live content mask না করে।** সবকিছু diff হয়, প্রতিবার।
✅ Baseline CI-তে তৈরি করুন, live content mask করুন, আর animation বন্ধ করুন।

❌ **Request mock-কে contract হিসেবে ধরা।** এগুলো আপনার অনুমান, আর চিরকাল আপনার সাথেই একমত থাকে।
✅ যে schema দিয়ে parse করেন, তার বিরুদ্ধে একটি schedule-এ আসল response check করুন।

## 🔑 মূল শিক্ষা

- End-to-end-ই একমাত্র layer, যেখানে আসল build, browser engine আর server আছে। তাই এটা সেই অল্প কয়েকটি journey-তে সীমিত রাখুন, যেগুলো কখনো ভাঙা চলবে না।
- Component বনাম E2E-এর সীমারেখা নির্ভর করে কী আসল তার ওপর, flow কত লম্বা তার ওপর নয়।
- Locator আবার চলে আর নিজে থেকে অপেক্ষা করে, তাই suite-এ প্রতিটি নির্দিষ্ট sleep একটি bug।
- Visual test টিকে থাকে শুধু তখনই, যখন animation বন্ধ, live content mask করা, আর baseline তৈরি হয় সেই platform-এ যেখানে তুলনা হয়।
- Request mock একটি API সম্পর্কে আপনার অনুমান ধরে রাখে, তাই একটি আসল endpoint-এর বিরুদ্ধে schema check-কে সেটা বাস্তবতার সাথে তুলনা করতে হবে।

## Interview-এর প্রশ্ন

**Q: কোনটা end-to-end test পাওয়ার যোগ্য, সেটা কীভাবে ঠিক করবেন?**

শুধু এই layer যা প্রমাণ করতে পারে, তা দিয়ে: আসল build, আসল cookie আর header, আর আসল API। তারপর পরিণতি দিয়ে ছাঁটাই
করুন, সেই journey-গুলোতে যাদের failure-এ টাকা যায় বা user-রা আটকে পড়ে। সাধারণত সেটা তিন থেকে দশটি test, আর এই
ছোট সংখ্যাটাই তাদের ওপর ভরসা টিকিয়ে রাখে।

**Q: আপনার E2E suite সপ্তাহে প্রায় একবার কোনো স্পষ্ট কারণ ছাড়া fail করে। কীভাবে এগোবেন?**

আগে trace নিন। `trace: "on-first-retry"` আসল failure-এর প্রতিটি ধাপ record করে। তারপর সাধারণ চারটি জিনিস দেখুন: একটি
নির্দিষ্ট timeout, একটি live third-party call, test-গুলোর মাঝে shared state, আর সত্যিকারের race থাকা একটি assertion।
Retry হওয়া test-গুলো report করুন, কারণ retry সংখ্যাটা লুকিয়ে ফেলে।

**Q: সব integration test pass করে, কিন্তু API একটি field-এর নাম বদলানোয় production ভেঙে গেছে। কী বাদ ছিল?**

আসল provider-এর বিরুদ্ধে একটি check। Handler সেটা ধরে রাখে, যা frontend বিশ্বাস করত, তাই সে frontend-এর সাথে একমত
থাকতেই থাকে। সস্তা সমাধান হলো staging-এর বিরুদ্ধে প্রতিটি endpoint-এর জন্য scheduled একটি schema check। পূর্ণাঙ্গ
সমাধান হলো consumer-driven contract, যেখানে provider-এর pipeline আগে fail করে।

**Q: আপনি কি প্রতিটি page-এ visual regression যোগ করবেন?**

না। যে page প্রতি সপ্তাহে বদলায়, সেগুলো মূল্যের চেয়ে বেশি baseline-এর ঝামেলা তৈরি করে। Header-এ একটি পরিবর্তন কুড়িটি
full-page shot fail করায়। Visual test রাখুন design-system component-এ, সাথে দুই-তিনটি মূল layout-এ। সেখানে failure-টা
visual, আর কেউ সেটা হাতে check করতে পারত না।

## এরপর কী পড়বেন

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — বেশিরভাগ সম্ভাব্য E2E test আসলে যে layer-এর
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — এই অধ্যায় যে browser আগেই খুলে রেখেছে, তাতে axe চালানো
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — অন্য test layer-গুলোর তুলনায় এই check-গুলো কোথায় বসে
