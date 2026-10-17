---
sourceHash: "8e5cf20b529399171c8a79de9eab89a5b4c7d4e36fcbf070e44877820e6e5a3a"
title: "Playwright দিয়ে End-to-End, Visual ও Contract Testing"
translatedAt: "2026-10-17T14:04:48.721Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Playwright দিয়ে End-to-End, Visual ও Contract Testing {#ch-end-to-end-testing}

> অল্প কয়েকটি browser test লিখুন, যেগুলো তাদের runtime-এর দাম তোলে। তারপর ঢাকুন সেই জিনিসগুলো, যা কোনো assertion দেখতে পায় না: page দেখতে কেমন, আর API এখনও একমত কি না।

**এই অধ্যায়ে:** যা শুধু আসল browser প্রমাণ করতে পারে · locator, auto-waiting আর আবার ব্যবহার করা login · রোজকার noise ছাড়া visual regression · API সরে যাওয়ার বিরুদ্ধে contract check · CI-তে কোথায় কী চলে

## 💡 মূল ধারণা

End-to-end test-ই একমাত্র test, যা **আপনার আসল build চালায়, আসল browser engine-এ, আসল server-এর বিপরীতে**। এর পুরো
মূল্য এটুকুই। আবার এই কারণেই এটা ধীর, আর মাঝে মাঝে আপনার কোনো দোষ ছাড়াই fail করে। তাই **এমন journey-গুলোর
সবচেয়ে ছোট set বেছে নিন, যাদের failure মেনে নেওয়া যায় না, আর সেই সংখ্যাটা আঁকড়ে ধরে রাখুন**: বেশিরভাগ product-এ
তিন থেকে দশটি।

বাকি প্রতিটি test একটি প্রত্যাশিত value-কে আসল value-র সঙ্গে মেলায়। এভাবে তিনটি failure-এ পৌঁছানো যায় না:

| Failure | Assertion কেন এখানে পৌঁছায় না | Tool |
| ------- | -------------------------------- | -------- |
| "Layout ভেঙে গেছে" | চেহারা মানে হাজার হাজার pixel, একটি value নয় | Visual regression |
| "API বদলে গেছে" | আপনার test API নকল করেছে, তাই সেটা নিজের সঙ্গেই একমত | Contract testing |
| "আমাদের test bug ধরে না" | Pass করা suite নিজের অন্ধ জায়গার কথা জানাতে পারে না | Mutation testing |

## কীভাবে কাজ করে

### Component testing কোথায় থামে, আর E2E কোথায় শুরু

| Environment | Layout engine | Network | প্রতি test-এর খরচ |
| ----------- | ------------- | ------- | ------------- |
| **jsdom** (Vitest-এর default) | নেই | Intercept করা | ~10 ms |
| **Browser mode** — আসল engine, একটি component | আসল | Intercept করা | ~100 ms |
| **End-to-end** — আসল engine, আসল app | আসল | আসল | কয়েক সেকেন্ড |

- **jsdom-এ কোনো layout engine নেই।** Element-এর size, scroll, `IntersectionObserver` আর sticky header, সবকিছুর
  জন্য আসল browser লাগে।
- **আসল server আছে শুধু end-to-end-এ।** Header, cookie, redirect আর build করা bundle test করা যায় শুধু এখানেই,
  কারণ নিচের প্রতিটি স্তর server নকল করে।

Flow *লম্বা* বলে E2E বেছে নেবেন না। বারো ধাপের একটি form-ও integration test-ই থাকে, যেমনটা
[Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) দেখায়।

### Playwright কেন default

Cypress test চালায় page-এর *ভেতরে*। তাতে debugger দারুণ হয়, কিন্তু tab, cross-origin আর iframe নিয়ে ঝামেলা হয়।
Playwright browser চালায় *বাইরে* থেকে, তাই এগুলোর কোনোটিই বিশেষ কিছু নয়। এটা WebKit-ও চালায়।

### Locator নিজে থেকেই অপেক্ষা করে, আর তাতেই বেশিরভাগ flake দূর হয়

Playwright-এর locator হলো **এমন query, যা প্রতিবার ব্যবহার করলে নতুন করে চলে**। কোনো action নেওয়ার আগে Playwright
অপেক্ষা করে, যতক্ষণ না element attach হয়, দেখা যায়, স্থির থাকে আর enabled হয়।

**Web-first assertion সহ একটি login journey:**

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

Locator বাছুন [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest)-এর মতো করে: আগে role আর
label, accessible text না থাকলে test id, CSS কখনো নয়।

> ⚠️ ধীর আর flaky suite-এর একক সবচেয়ে বড় কারণ `page.waitForTimeout(2000)`। প্রতিটি সত্যিকারের অপেক্ষার একটি শর্ত
> থাকে: `toBeVisible`, `toHaveURL`, `waitForResponse`। ব্যস্ত CI runner-এ নির্দিষ্ট sleep যথেষ্ট লম্বা হয় না, আর দ্রুত
> runner-এ সেটা শুধু সময় নষ্ট।

### একবার login করুন, আর CI সাবধানে configure করুন

`beforeEach`-এর ভেতরে login করতেই প্রায়ই suite-এর runtime-এর বেশিরভাগ চলে যায়। একবার login করে state-টা আবার
ব্যবহার করুন।

**একটি setup project, আর CI-র যে setting-গুলোর পক্ষে যুক্তি দেওয়া উচিত:**

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

এমন একটি test রাখুন, যা stored state ব্যবহার **করে না**, যাতে login নিজেই test হয়। `webServer`-কে **production
build**-এ চালালে suite build output-এর bug-ও ধরতে পারে। Retry থাকলে একটি flake merge আটকে দেয় না। কিন্তু retry
flake-কে **লুকিয়েও ফেলে**, তাই retry হওয়া test-গুলোর report রাখুন আর সেগুলোর পেছনে লাগুন।

### Visual regression pixel মেলায়, DOM নয়

Markup না বদলালে DOM snapshot pass করে। ভুল colour token, 1280px-এ overlap, বা button লুকিয়ে ফেলা একটি `z-index`,
এর কোনোটিই এটা দেখতে পায় না। এগুলোর জন্য image লাগে।

**এমন screenshot test, যা অকারণে চেঁচায় না:**

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

ওই option-গুলো না দিলে test প্রতিবার fail করে, আর team না পড়েই diff approve করতে শেখে। **যে platform-এ তুলনা হবে,
baseline বানান সেখানেই।** macOS-এর baseline প্রায় প্রতিটি glyph-এ Linux runner-এর থেকে আলাদা। Visual test-এর লাভ
সবচেয়ে বেশি design system-এর component-এ: চারটি state-এ চল্লিশটি component মানে 160টি screenshot, যা কেউ হাতে
check করতে পারত না।

### আপনার mock যে সরে যাওয়া লুকিয়ে রাখে, contract testing তা ধরে

Integration test-এর handler ধরে রাখে, frontend *বিশ্বাস করে* API কী return করে। Server কোনো field-এর নাম বদলালে
সেই test-গুলোর প্রতিটি তবু pass করে।

**সস্তা সমাধান — যে schema দিয়ে parse করেন, তার বিপরীতে একটি আসল response check করুন:**

```typescript
import { z } from "zod";

const User = z.object({ id: z.string().uuid(), name: z.string(), email: z.string().email() });

// Runs against a real deployed environment, not a mock.
test("the users endpoint still returns the shape we parse", async ({ request }) => {
  const res = await request.get(`${process.env.API_URL}/api/users/1`);
  expect(User.safeParse(await res.json()).success).toBe(true);
});
```

প্রতিটি endpoint-এর জন্য একটি করে, staging-এর বিপরীতে, নির্দিষ্ট সময় পরপর চালান। Field-এর নাম যেদিন বদলে ship হয়,
সেদিনই ধরা পড়ে। পুরো সংস্করণটি হলো **consumer-driven contract**: consumer প্রকাশ করে তার কী লাগবে, আর কোনো বদল তা
ভাঙলে provider-এর নিজের pipeline fail করে। এর জন্য একটি shared broker আর API team-এর সম্মতি লাগে। কয়েকটি team একটি
API ব্যবহার করলে এটা করার মতো। একই team দুই দিকই ship করলে বাড়াবাড়ি।

> ⚠️ **যা বদলাতে থাকে:** contract-testing tool ঘন ঘন বদলায়, আর OpenAPI বা GraphQL schema থেকে generate করা client
> এখন তাদের কাজের অনেকটাই করে দেয়। টেকসই নীতি হলো, mock আপনার অনুমান, আর কিছু একটাকে সেটা provider-এর বাস্তবের
> সঙ্গে মেলাতে হবে। একই repo-তে API end-to-end typed হলে সেই কাজ compiler-ই করে — দেখুন
> [Chapter ?? — GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)।

### Mutation testing, আর কোথায় কী চলে

Coverage গোনে কোন line চলেছে। Mutation testing আপনার code বদলে দেয় (`age >= 18` হয়ে যায়
`age > 18`), আর দেখে কোনো test fail করে কি না। একটিও না করলে, `age === 18` untested, 100% coverage থাকলেও। প্রতিটি
mutant-এর জন্য suite একবার করে চলে, তাই এটা দামি module-এর audit, gate নয়।

| ধাপ | যা চলে | কেন সেখানে |
| ----- | ---- | --------- |
| প্রতিটি pull request | Unit, integration, বদলানো component-এ visual, মূল journey-তে E2E | যথেষ্ট দ্রুত; diff-টাই review |
| নির্দিষ্ট সময় পরপর | Staging-এর বিপরীতে contract check | Deploy করা environment লাগে |
| Deploy-এর পরে | Smoke test — production-এর বিপরীতে সেই কয়েকটি journey | "Site কি সত্যিই চালু আছে?" |
| মাঝে মাঝে | Pricing, permission, তারিখের হিসাবে mutation testing | Gate করার পক্ষে খুব ধীর |

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী দিয়ে test করবেন | কেন |
| --------- | --------- | --- |
| Login, checkout, payment | End-to-end | Failure মানে টাকার ক্ষতি; কয়েকটি ধীর test-এর দাম আছে |
| Security header, cookie flag বা redirect | End-to-end | নিচের কোনো স্তরে আসল server নেই |
| Validation সহ লম্বা form flow | Integration | লম্বা হওয়া end-to-end-এ যাওয়ার কারণ নয় |
| Design system, বা token refactor | Visual regression | Failure-টা সংজ্ঞা অনুযায়ীই চোখে দেখার |
| অন্য team-এর API, যা তারা একাই release করে | Consumer-driven contract | Fail করা উচিত তাদের pipeline, আপনারটা নয় |
| আপনার team-এর API, একই repo-তে | Typed client, বা schema check | সস্তা; কাজটা compiler-ই করে |

## সাধারণ ভুল

❌ **Live third-party API-র ওপর নির্ভর করা।** তাদের outage হয়ে যায় আপনার লাল pipeline।
✅ External call-টা `page.route` দিয়ে সামলান, আর নিজের backend আসল রাখুন।

❌ **Data share করা test।** ক্রমে চালালে pass করে, parallel-এ চালালে fail করে, অথচ parallel-ই default।
✅ প্রতিটি test নিজের যা লাগে নিজেই বানায়, UI দিয়ে নয়, API দিয়ে।

❌ **Local-এ বানানো visual baseline, live content mask না করে।** প্রতিবার সবকিছুতে diff আসে।
✅ CI-তে baseline বানান, live content mask করুন, আর animation বন্ধ রাখুন।

❌ **Request mock-কে contract ভাবা।** এগুলো আপনার অনুমান, আর চিরকাল আপনার সঙ্গেই একমত থাকবে।
✅ যে schema দিয়ে parse করেন, তার বিপরীতে নির্দিষ্ট সময় পরপর একটি আসল response check করুন।

## 🔑 মূল শিক্ষা

- আসল build, browser engine আর server আছে শুধু end-to-end স্তরে, তাই এটা রাখুন সেই অল্প কয়েকটি journey-র জন্য, যা কখনো ভাঙা চলবে না।
- Component আর E2E-র সীমানা ঠিক হয় কোনটা আসল তা দিয়ে, flow কত লম্বা তা দিয়ে নয়।
- Locator নতুন করে চলে আর নিজে থেকে অপেক্ষা করে, তাই suite-এর প্রতিটি নির্দিষ্ট sleep একটি bug।
- Visual test টেকে শুধু animation বন্ধ রাখলে, live content mask করলে, আর যে platform-এ তুলনা হয় সেখানে baseline বানালে।
- Request mock API সম্পর্কে আপনার অনুমান ধরে রাখে, তাই আসল endpoint-এর বিপরীতে একটি schema check দিয়ে সেটাকে বাস্তবের সঙ্গে মেলাতে হবে।

## Interview-এর প্রশ্ন

**Q: কোনটা end-to-end test পাওয়ার যোগ্য, তা কীভাবে ঠিক করেন?**

শুধু এই স্তর যা প্রমাণ করতে পারে, তা দিয়ে: আসল build, আসল cookie আর header, আর আসল API। তারপর পরিণতি দেখে ছেঁটে
আনুন, সেই journey-গুলোতে, যাদের failure-এ টাকা যায় বা user আটকে পড়েন। সাধারণত তিন থেকে দশটি test দাঁড়ায়, আর সংখ্যাটা
ছোট বলেই সেগুলোর ওপর বিশ্বাস থাকে।

**Q: আপনার E2E suite সপ্তাহে একবার মতো কোনো স্পষ্ট কারণ ছাড়াই fail করে। কীভাবে এগোবেন?**

আগে trace নিন। `trace: "on-first-retry"` আসল failure-এর প্রতিটি ধাপ record করে। তারপর চেনা চারটি কারণ দেখুন: নির্দিষ্ট
timeout, live third-party call, test-এর মধ্যে share করা state, আর সত্যিকারের race থাকা assertion। Retry হওয়া
test-গুলোর report রাখুন, কারণ retry সংখ্যাটা লুকিয়ে ফেলে।

**Q: সব integration test pass করছে, অথচ API একটি field-এর নাম বদলানোয় production ভেঙে গেল। কী বাদ পড়েছিল?**

আসল provider-এর বিপরীতে একটি check। Handler ধরে রাখে frontend কী বিশ্বাস করত, তাই সেগুলো তার সঙ্গেই একমত থেকে যায়।
সস্তা সমাধান হলো staging-এর বিপরীতে প্রতিটি endpoint-এর জন্য নির্দিষ্ট সময় পরপর একটি schema check। পূর্ণাঙ্গ সমাধান
হলো consumer-driven contract, যেখানে আগে fail করে provider-এর pipeline।

**Q: প্রতিটি page-এ কি visual regression যোগ করবেন?**

না। যে page প্রতি সপ্তাহে বদলায়, সেখানে লাভের চেয়ে baseline বদলানোর ঝামেলাই বেশি। Header-এ একটি বদল হলেই বিশটি
full-page shot fail করে। Visual test রাখুন design system-এর component-এ, সঙ্গে দুই-তিনটি মূল layout-এ। সেখানে failure-টা
চোখে দেখার, আর কেউ হাতে সেটা check করতে পারত না।

## এরপর কী পড়বেন

- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — যে স্তরে E2E হওয়ার দাবিদার বেশিরভাগ test-এর আসল জায়গা
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — এই অধ্যায়ে যে browser আগে থেকেই খোলা, তাতেই axe চালানো
- [Chapter ?? — Testing Strategy](#ch-testing-strategy) — অন্য test স্তরগুলোর পাশে এই check-গুলো কোথায় বসে
