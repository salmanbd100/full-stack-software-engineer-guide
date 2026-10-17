---
sourceHash: "bfb580351b7b09d39a388053c03fa597a5255c027c7b8b640baa785448e61232"
title: "Testing Strategy"
translatedAt: "2026-10-17T14:02:21.365Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Testing Strategy {#ch-testing-strategy}

> কোন স্তরে কী test করবেন, তা ঠিক করুন। তারপর suite-টাকে এতটা দ্রুত আর সৎ রাখুন, যাতে এক বছর পরেও মানুষ সেটা চালায়।

**এই অধ্যায়ে:** চারটি স্তর আর প্রতিটির খরচ · pyramid বনাম trophy · test double · coverage কী বলে আর কী বলে না · suite কেন পরিত্যক্ত হয়

## 💡 মূল ধারণা

Test suite একটি **budget**, কোনো গুণ নয়। প্রতিটি test প্রতিবার push-এ runtime খরচ করে, আর প্রতিবার refactor-এ
maintenance। বিনিময়ে কিছুটা আত্মবিশ্বাস কেনে। Strategy মানে ঠিক করা, কোন test তার দামের যোগ্য।

Team-রা এখানে দুইভাবে ভুল করে, আর দুটি ভুল একে অন্যের উল্টো। একটি team হাজার হাজার unit test লেখে, যেগুলো ভেতরের
খুঁটিনাটির ওপর assert করে। প্রতিটি refactor-এ একশোটি test ভাঙে, আর product কাজ করছে কি না, কেউ জানতে পারে না। অন্য
team শুধু end-to-end test লেখে। Suite চলতে চল্লিশ মিনিট লাগে, সপ্তাহে দুবার এলোমেলোভাবে fail করে, আর লোকে সেটা
এড়িয়ে যায়। দুই team-এর হাতেই শেষে থাকে এমন suite, যেটা কেউ বিশ্বাস করে না। আর সেটা suite না থাকারই সমান।

তাই কাজের প্রশ্নটা কখনো "আমরা কি যথেষ্ট test করছি" নয়। প্রশ্নটা হলো **এই নির্দিষ্ট ঝুঁকিটা কোন স্তরে সবচেয়ে
সস্তায় ধরা পড়ে।**

## কীভাবে কাজ করে

### চারটি স্তর, চারটি দাম

| স্তর | পরিধি | গতি | যা ধরে | কখন ভাঙে |
| ----- | ----- | ----- | ------- | ----------- |
| **Static** | Type আর lint | সঙ্গে সঙ্গে | ভুল shape, বাদ পড়া case | কদাচিৎ — এটাই সবচেয়ে সস্তা স্তর |
| **Unit** | একটি function | Millisecond | Logic আর edge case | Function-এর ভেতরটা বদলালে |
| **Component/integration** | নকল network সহ একটি flow | এক সেকেন্ডের কম | Wiring, state, user যা দেখেন সেই behaviour | User যা দেখেন সেই behaviour বদলালে |
| **End-to-end** | আসল browser-এ আসল app | কয়েক সেকেন্ড থেকে কয়েক মিনিট | অন্য স্তরগুলো যা কিছু নকল করে, সব | যেকোনো কিছুতে — এমনকি কোনো কারণ ছাড়াই |

Compiler-কে মানুষ স্তর হিসেবে গুনতে ভুলে যায়। `tsc` যে prop contract check করে, তার জন্য কোনো test-ই লাগে না।
একশোটি type-level নিশ্চয়তার জন্য প্রতি push-এ কোনো খরচ নেই। Type system যা ইতিমধ্যে প্রমাণ করে, সেটা আবার check
করা test পুরোটাই বাড়তি বোঝা।

**স্তর বেছে নেওয়া:**

```text
Pure logic or a calculation?      → unit
Wiring, state, or what a user sees? → component/integration
A journey that loses money if broken? → end-to-end
A data shape or a contract?         → the type checker
```

এই সিদ্ধান্তের React সংস্করণের জন্য (component, `renderHook` নাকি আসল build), দেখুন [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest)।

### Pyramid বনাম trophy

দুটি আকারই বলে, "সস্তা স্তর বেশি, দামি স্তর কম"। দ্বিমত শুধু মাঝখানটা কোথায় বসবে, তা নিয়ে।

| | Pyramid | Trophy |
| --- | ------- | ------ |
| **ভার** | বেশিরভাগ unit, কিছু integration, অল্প E2E | বেশিরভাগ integration, তারপর unit, তারপর static, অল্প E2E |
| **ধরে নেয়** | ঝুঁকি logic-এ | ঝুঁকি wiring-এ |
| **মানায়** | Pricing engine, parser, data pipeline | UI-প্রধান product, যেখানে interaction-ই behaviour |

Frontend-এর জন্য সাধারণত trophy-ই ঠিক, আর কেন, সেটা আপনার বলতে পারা উচিত। সাধারণ একটি React application-এ logic
কম, wiring অনেক। Bug থাকে এমন loading state-এ, যা কখনো সরে না; এমন form-এ, যা দুবার submit হয়; এমন error path-এ,
যা কেউ render করে দেখেনি। তিনটিই integration স্তরের failure, আর reducer-এর unit test এগুলো দেখতে পায় না।

### Test double, আর আপনার আসলে কোনটা দরকার

**Double** একটি আসল dependency-র জায়গায় দাঁড়ায়। Interviewer-রা প্রায়ই এর শব্দগুলো নিয়ে জিজ্ঞেস করেন। যে পার্থক্যটা
আসলে জরুরি, তা হলো double তাকে কীভাবে call করা হয়েছে, সেটা যাচাই করে কি না।

| Double | উদ্দেশ্য | Call যাচাই করে |
| ------ | ------- | -------------- |
| **Stub** | আগে থেকে ঠিক করা data দেয়, যাতে test এগোতে পারে | ❌ |
| **Spy** | একটি আসল function-কে মুড়ে রাখে, আর call-গুলো লিখে রাখে | ✅ |
| **Mock** | এমন double, যার expectation-এর ওপর আপনি assert করেন | ✅ |
| **Fake** | কাজ করে এমন সরল implementation — যেমন in-memory store | ❌ |

**যে নিয়মে বেশিরভাগ খারাপ test আটকায়: যা আপনার নিজের নয়, শুধু সেটাই double করুন।** Network, clock, randomness,
payment gateway। নিজের component, hook আর utility double করলে integration test হয়ে যায় mock-গুলোর test। আসল
integration ভাঙা থাকলেও সেটা দিব্যি pass করে।

### Coverage মাপে কোন code চলেছে, ঠিক কি না তা নয়

Coverage বলে কোন line চলেছে। কোনো assertion একটি bug ধরতে পারত কি না, তা বলতে পারে না।

```typescript
function divide(a: number, b: number): number {
  return a / b;
}

it("divides", () => {
  expect(divide(10, 2)).toBe(5); // 100% line coverage
});
// divide(10, 0) returns Infinity and is never tested.
```

Branch coverage বেশি কাজের সংখ্যা, কারণ এটা না-চলা line নয়, না-নেওয়া path-এর নাম বলে। যেটাই ব্যবহার করুন, করুন
**খুঁজে বের করার যন্ত্র** হিসেবে: "কোন error path কেউ test করেনি?" Target হিসেবে কখনো নয়। Coverage target পূরণ
করার সবচেয়ে সস্তা উপায় হলো তুচ্ছ code test করা।

> ⚠️ CI-তে coverage threshold থাকলে নিশ্চিতভাবেই এমন test আসে, যা শুধু সংখ্যা বাড়াতে লেখা। কোন code চলল তার হিসাব
> নয়, যদি quality-র signal চান, তাহলে সৎ উপায় হলো mutation testing। দেখুন
> [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)।

### Flaky test-এর চারটি কারণ

Flaky test code না বদলেও কখনো pass করে, কখনো fail। এটা test না থাকার চেয়েও বেশি ক্ষতি করে, কারণ team তখন failure
পড়ার বদলে pipeline আবার চালাতে শেখে।

| কারণ | Flaky সংস্করণ | সমাধান |
| ----- | ----------------- | ------- |
| **Timing** | Assert করার আগে নির্দিষ্ট একটি `setTimeout` | `await screen.findBy...`, যা ঠিক যতক্ষণ দরকার ততক্ষণই অপেক্ষা করে |
| **Shared state** | Module-level একটি object, যা দুটি test বদলায় | এমন factory, যা প্রতিটি test-কে নতুন data দেয় |
| **আসল network** | Live API call | Request interception — দেখুন [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) |
| **Randomness** | `Math.random()`, `Date.now()` | Seed দিন, অথবা `vi.setSystemTime()` দিয়ে clock থামিয়ে রাখুন |

```typescript
// ❌ Arbitrary wait — passes locally, fails on a loaded CI runner
setTimeout(() => expect(screen.getByText("Saved")).toBeInTheDocument(), 1000);

// ✅ Waits for the condition, not for the clock
expect(await screen.findByText("Saved")).toBeInTheDocument();
```

প্রতিটি test-কে একা চালালেও pass করতে হবে, যেকোনো ক্রমে চালালেও। Isolation কোনো বিলাসিতা নয়। যে suite-এর test
চলার ক্রমের ওপর নির্ভর করে, সেটা parallel-এ চলতে পারে না। ফলে এত ধীর হয়ে যায় যে লোকে এড়িয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কোথায় test করবেন | কেন |
| --------- | ------- | --- |
| বারোটি edge case সহ একটি currency formatter | Unit | একশোটি case-এরও কোনো খরচ নেই |
| এমন form, যা validate করে, submit করে আর error দেখায় | Integration | আসল bug এখানেই থাকে |
| Login, checkout, signup | End-to-end, আর শুধু এগুলোই | Failure মানে টাকার ক্ষতি; তিনটি test-এর জন্য ধীরগতি মেনে নেওয়া যায় |
| Prop বা API response-এর shape | Type checker | প্রতিটি build-এ এমনিতেই বিনা খরচে হয় |
| Design token বা spacing-এর বদল | Visual regression, assertion নয় | Assert করে "দেখতে ঠিক আছে" পর্যন্ত পৌঁছানো যায় না |
| Production-এ এইমাত্র report হওয়া একটি bug | আগে একটি fail করা unit বা integration test | এটা fix প্রমাণ করে, আর regression আটকায় |

## সাধারণ ভুল

❌ **Implementation-এর খুঁটিনাটি test করা।** ভেতরের state বা hook-এর return value-র ওপর assert করলে behaviour
না বদলালেও প্রতিটি refactor-এ test ভাঙে।
✅ User যা দেখতে পান, তার ওপর assert করুন। তাহলে test fail করবে শুধু সত্যিই কিছু ভাঙলে।

❌ **অতিরিক্ত mock করা।** নিজের component আর utility বদলে দিলে test হয় double-গুলোর।
✅ Network, clock আর third party double করুন। নিজের যা কিছু, সব আসল রাখুন।

❌ **Quality gate হিসেবে coverage threshold।** Getter test করলেই সেটা পূরণ হয়ে যায়।
✅ Untested branch খুঁজতে coverage ব্যবহার করুন, আর gate রাখুন suite pass করার ওপর।

❌ **Flaky test সহ্য করা।** একটি flake সবাইকে pipeline আবার চালাতে শেখায়। তারপর পুরো suite আর signal হিসেবে কাজ করে না।
✅ সেদিনই ঠিক করুন, নয়তো quarantine করুন। Flake-কে এমন একটি bug হিসেবে দেখুন, যার একটি কারণ আছে।

❌ **গভীর `describe` nesting আর অস্পষ্ট নাম।** চারটি block-এর ভেতরে `it("works")` রাত দুটায় fail করলে কিছুই
বলে না।
✅ এক বা দুই স্তর, আর এমন নাম, যাতে শর্ত আর প্রত্যাশিত ফল দুটিই লেখা।

## 🔑 মূল শিক্ষা

- Test suite একটি budget: প্রতিটি স্তরের একটি দাম আছে, আর strategy মানে যেখানে ঝুঁকি সবচেয়ে সস্তায় ধরা পড়ে, সেখানে খরচ করা।
- Type checker-ও একটি testing স্তর, আর সবচেয়ে সস্তা — যা এটা ইতিমধ্যে প্রমাণ করে, তা test করবেন না।
- UI-প্রধান frontend-এ trophy আকারই জেতে, কারণ bug থাকে logic-এ নয়, wiring-এ।
- শুধু যা আপনার নিজের নয়, তা double করুন; নিজের code double করলে test হয় double-গুলোর।
- Coverage মাপে কোন line চলেছে, কখনো এটা নয় যে কোনো bug ধরা পড়ত কি না।

## Interview-এর প্রশ্ন

**Q: কোনো কিছুর জন্য unit test হবে নাকি integration test, সেটা কীভাবে ঠিক করেন?**

ঝুঁকিটা আসলে কোথায়, সেটা জিজ্ঞেস করে। অনেক edge case সহ বিশুদ্ধ logic unit test-এ সবচেয়ে সস্তায় ঢাকা যায়, কারণ
একশোটি case millisecond-এ চলে যায়। Wiring-এর bug দেখা দেয় শুধু তখন, যখন অংশগুলো একসঙ্গে চলে: যে state সরে না, যে
error path কেউ render করেনি, যে request দুবার যায়। তাই এগুলোর জায়গা integration স্তরে। সাধারণ একটি React app-এ ঝুঁকির
বেশিরভাগ এটাই। সে কারণেই integration স্তর সবচেয়ে বেশি ভার পায়।

**Q: আপনার suite চলতে 25 মিনিট লাগে, আর লোকে সেটা ছাড়াই merge করছে। কী করবেন?**

আগে খুঁজে বের করুন সময়টা কোথায় যায়। উত্তর প্রায় সবসময় অল্প কয়েকটি end-to-end test, যেগুলো এমন জিনিস ঢাকে, যা
integration test-ই ধরতে পারত। সেগুলোকে এক স্তর নিচে নামিয়ে দিন। E2E রাখুন শুধু সেই journey-গুলোর জন্য, যাদের
failure মানে টাকার ক্ষতি। বাকিগুলো যেন parallel-এ চলতে পারে, তা নিশ্চিত করুন। সাধারণত এর মানে shared state ঠিক করা।
সব ঢাকা অথচ এড়িয়ে যাওয়া suite-এর চেয়ে দ্রুত আর বিশ্বস্ত suite ভালো।

**Q: 100% coverage কি লক্ষ্য রাখার মতো?**

না, আর শেষের অংশটুকু কঠিন বলে নয়। Coverage গোনে কোন line চলেছে, কোন bug ধরা পড়েছে তা নয়। অর্থপূর্ণ কোনো
assertion ছাড়া একটি test coverage বাড়ায়, কিন্তু কিছুই ধরে না। CI-তে threshold থাকলে নিশ্চিতভাবেই ঠিক এই রকম test
আসে। Untested error path খুঁজতে coverage কাজের। Test আসলে কোনো defect ধরত কি না, তা মাপে mutation testing।

**Q: কখন test লিখবেন না?**

যখন type checker ইতিমধ্যে সেটা প্রমাণ করে, অথবা assertion শুধু implementation-টাই আবার বলবে। আর যখন জিনিসটা সত্যিই
চোখে দেখার: "spacing ঠিক দেখাচ্ছে" হলো visual regression-এর কাজ, assertion-এর নয়। অল্প দিনের জন্য লেখা, ফেলে দেওয়ার
মতো code-এর বেলাতেও একই কথা। এটা সৎভাবে বলা ভালো, এমন একটি standard-এর ভান করার চেয়ে, যা কেউ বজায় রাখবে না।

## এরপর কী পড়বেন

- [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest) — এই section-এর প্রতিটি উদাহরণ যে runner আর query API ব্যবহার করে
- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — এই অধ্যায়ের মতে যে স্তর সবচেয়ে বেশি ভার পাওয়ার যোগ্য
