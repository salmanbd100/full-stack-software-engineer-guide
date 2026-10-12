---
sourceHash: "bfb580351b7b09d39a388053c03fa597a5255c027c7b8b640baa785448e61232"
title: "Testing Strategy"
translatedAt: "2026-10-12T12:16:49.760Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Testing Strategy {#ch-testing-strategy}

> কোন জিনিস কোন layer-এ test করবেন তা ঠিক করুন, তারপর suite-কে এতটা দ্রুত আর সৎ রাখুন, যাতে এক বছর পরেও মানুষ এটা চালায়।

**এই অধ্যায়ে:** চারটি layer আর প্রতিটির খরচ · pyramid বনাম trophy · test double · coverage কী বলে আর কী বলে না · কেন suite পরিত্যক্ত হয়

## 💡 মূল ধারণা

একটি test suite হলো একটি **budget**, কোনো গুণ নয়। প্রতিটি test প্রতিটি push-এ runtime আর প্রতিটি refactor-এ
maintenance খরচ করে। বিনিময়ে এটা কিছুটা আত্মবিশ্বাস কেনে। Strategy মানে ঠিক করা, কোন test তাদের দামের যোগ্য।

Team-রা এটা দুটো বিপরীত উপায়ে ভুল করে। এক team হাজার হাজার unit test লেখে, যেগুলো internal নিয়ে assert করে। প্রতিটি
refactor একশোটা test ভাঙে, আর product কাজ করে কি না, তা কেউ জানতে পারে না। অন্য team শুধু end-to-end test লেখে।
Suite চল্লিশ মিনিট নেয়, সপ্তাহে দুবার এলোমেলোভাবে fail করে, আর skip হয়ে যায়। দুই team-ই শেষে পায় এমন একটি suite,
যেটা কেউ বিশ্বাস করে না, আর সেটা কোনো suite না থাকারই সমান।

তাই কাজের প্রশ্নটা কখনো "আমরা কি যথেষ্ট test করছি" নয়। প্রশ্নটা হলো **এই নির্দিষ্ট ঝুঁকিটা কোন layer-এ সবচেয়ে সস্তায় ধরা পড়ে।**

## কীভাবে কাজ করে

### চারটি layer, চারটি দাম

| Layer | পরিধি | গতি | যা ধরে | কখন ভাঙে |
| ----- | ----- | ----- | ------- | ----------- |
| **Static** | Type আর lint | তাৎক্ষণিক | ভুল shape, বাদ পড়া case | কদাচিৎ — এটাই সবচেয়ে সস্তা layer |
| **Unit** | একটি function | Millisecond | Logic আর edge case | আপনি function-এর internal বদলালে |
| **Component/integration** | নকল network সহ একটি flow | এক second-এর কম | Wiring, state, user-এর দেখা behaviour | User-এর দেখা behaviour বদলালে |
| **End-to-end** | আসল browser-এ আসল app | কয়েক second থেকে কয়েক মিনিট | অন্য layer-গুলো যা নকল করে, তার সবকিছু | যেকোনো কিছুতে — এমনকি কিছু না হলেও |

Compiler হলো সেই layer, যেটা মানুষ গুনতে ভুলে যায়। `tsc` check করা একটি prop contract-এর কোনো test-ই লাগে না। একশোটা
type-level গ্যারান্টির প্রতি push-এ কোনো খরচ নেই। যে test এমন কিছু check করে, যা type system আগেই প্রমাণ করে, সেটা
নিছক বাড়তি বোঝা।

**একটি layer বেছে নেওয়া:**

```text
Pure logic or a calculation?      → unit
Wiring, state, or what a user sees? → component/integration
A journey that loses money if broken? → end-to-end
A data shape or a contract?         → the type checker
```

সেই সিদ্ধান্তের React version-এর জন্য (component, `renderHook` বা একটি আসল build), দেখুন [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest)।

### Pyramid বনাম trophy

দুটো shape-ই বলে "সস্তা layer বেশি, দামি layer কম"। মাঝখানটা কোথায় বসে, তা নিয়ে তাদের মতভেদ।

| | Pyramid | Trophy |
| --- | ------- | ------ |
| **ভার** | বেশিরভাগ unit, কিছু integration, অল্প E2E | বেশিরভাগ integration, তারপর unit, তারপর static, অল্প E2E |
| **ধরে নেয়** | ঝুঁকি logic-এ | ঝুঁকি wiring-এ |
| **মানায়** | Pricing engine, parser, data pipeline | UI-ভারী product, যেখানে interaction-ই behaviour |

Frontend-এর জন্য সাধারণত trophy-ই ঠিক, আর কেন, তা আপনার বলতে পারা উচিত। একটি সাধারণ React application-এ logic কম,
wiring অনেক বেশি। Bug থাকে সেই loading state-এ, যেটা কখনো clear হয় না, সেই form-এ, যেটা দুবার submit হয়, সেই error
path-এ, যেটা কেউ render করেনি। তিনটিই integration-level failure, আর একটি reducer-এর unit test এগুলো দেখতে পায় না।

### Test double, আর আপনার আসলে কোনটা দরকার

একটি **double** একটি আসল dependency-র জায়গায় দাঁড়ায়। Interviewer-রা প্রায়ই এই শব্দগুলো নিয়ে জিজ্ঞেস করেন। যে
পার্থক্যটা গুরুত্বপূর্ণ, তা হলো double যাচাই করে কি না, তাকে কীভাবে call করা হয়েছে।

| Double | উদ্দেশ্য | Call যাচাই করে |
| ------ | ------- | -------------- |
| **Stub** | আগে থেকে ঠিক করা data return করে, যাতে test এগোতে পারে | ❌ |
| **Spy** | একটি আসল function-কে wrap করে, আর call record করে | ✅ |
| **Mock** | এমন একটি double, যার expectation-এর ওপর আপনি assert করেন | ✅ |
| **Fake** | একটি কাজ করা সরলীকৃত implementation — একটি in-memory store | ❌ |

**যে নিয়ম বেশিরভাগ খারাপ test আটকায়: যা আপনার নিজের নয়, শুধু তারই double বানান।** Network, clock, randomness,
একটি payment gateway। নিজের component, hook আর utility-র double বানালে একটি integration test হয়ে যায় mock-গুলোর test।
আসল integration ভাঙা থাকলেও এটা দিব্যি pass করে।

### Coverage execution মাপে, সঠিকতা নয়

Coverage বলে কোন line-গুলো চলেছে। একটি assertion একটি bug ধরত কি না, তা এটা বলতে পারে না।

```typescript
function divide(a: number, b: number): number {
  return a / b;
}

it("divides", () => {
  expect(divide(10, 2)).toBe(5); // 100% line coverage
});
// divide(10, 0) returns Infinity and is never tested.
```

Branch coverage বেশি কাজের সংখ্যা, কারণ এটা না চলা line নয়, না নেওয়া path-এর নাম বলে। যেকোনোটা ব্যবহার করুন একটি
**খোঁজার যন্ত্র** হিসেবে: "কোন error path কেউ test করেনি?" কখনো এটাকে target বানাবেন না। একটি coverage target পূরণের
সবচেয়ে সস্তা উপায় হলো তুচ্ছ code test করা।

> ⚠️ CI-তে একটি coverage threshold নিশ্চিতভাবে সংখ্যা বাড়ানোর জন্য লেখা test তৈরি করে। যদি execution count নয়,
> একটি quality signal চান, তাহলে mutation testing-ই সৎ উপায়। দেখুন
> [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)।

### একটি flaky test-এর চারটি কারণ

একটি flaky test code না বদলেই pass আর fail করে। এটা একটি অনুপস্থিত test-এর চেয়েও বেশি ক্ষতি করে, কারণ এটা team-কে
failure পড়ার বদলে pipeline আবার চালাতে শেখায়।

| কারণ | Flaky version | সমাধান |
| ----- | ----------------- | ------- |
| **Timing** | Assert করার আগে একটি নির্দিষ্ট `setTimeout` | `await screen.findBy...`, যেটা ঠিক যতক্ষণ দরকার ততক্ষণ অপেক্ষা করে |
| **Shared state** | একটি module-level object, যেটা দুটো test বদলায় | একটি factory, যেটা প্রতি test-এ নতুন data return করে |
| **আসল network** | একটি live API call | Request interception — দেখুন [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) |
| **Randomness** | `Math.random()`, `Date.now()` | Seed করুন, বা `vi.setSystemTime()` দিয়ে clock থামিয়ে দিন |

```typescript
// ❌ Arbitrary wait — passes locally, fails on a loaded CI runner
setTimeout(() => expect(screen.getByText("Saved")).toBeInTheDocument(), 1000);

// ✅ Waits for the condition, not for the clock
expect(await screen.findByText("Saved")).toBeInTheDocument();
```

প্রতিটি test-কে একা, আর যেকোনো ক্রমে pass করতে হবে। Isolation কোনো শৌখিনতা নয়। যে suite-এর test-গুলো execution-এর
ক্রমের ওপর নির্ভর করে, সেটা parallel-এ চলতে পারে না, আর তাতে এটা এত slow হয় যে skip হয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কোথায় test করবেন | কেন |
| --------- | ------- | --- |
| বারোটি edge case সহ একটি currency formatter | Unit | একশোটা case-এর খরচ শূন্য |
| এমন একটি form, যেটা validate করে, submit করে আর একটি error দেখায় | Integration | আসল bug-গুলো এখানেই থাকে |
| Login, checkout, signup | End-to-end, আর শুধু এগুলোই | Failure-এ টাকা খরচ হয়; তিনটি test-এর জন্য slow হওয়া মেনে নেওয়া যায় |
| একটি prop বা API response-এর shape | Type checker | প্রতিটি build-এ আগে থেকেই বিনামূল্যে |
| একটি design token বা spacing পরিবর্তন | Visual regression, assertion নয় | Assert করে "ঠিক দেখাচ্ছে"-তে পৌঁছানো যায় না |
| Production-এ সদ্য report হওয়া একটি bug | আগে একটি fail করা unit বা integration test | এটা fix প্রমাণ করে, আর regression থামায় |

## সাধারণ ভুল

❌ **Implementation detail test করা।** Internal state বা একটি hook-এর return value নিয়ে assert করা মানে, behaviour
না বদলালেও প্রতিটি refactor test ভাঙে।
✅ User যা দেখতে পায়, তা নিয়ে assert করুন। তখন test শুধু আসল কিছু ভাঙলেই fail করে।

❌ **অতিরিক্ত mock করা।** নিজের component আর utility বদলে দিলে test হয় double-গুলোর।
✅ Network, clock আর third party-র double বানান। নিজের সবকিছু আসল রাখুন।

❌ **Quality gate হিসেবে একটি coverage threshold।** Getter test করলেই এটা পূরণ হয়ে যায়।
✅ Untested branch খুঁজতে coverage ব্যবহার করুন, আর gate করুন suite pass করার ওপর।

❌ **একটি flaky test সহ্য করা।** একটি flake সবাইকে pipeline আবার চালাতে শেখায়। তখন পুরো suite একটি signal হিসেবে
কাজ করা বন্ধ করে দেয়।
✅ সেদিনই ঠিক করুন বা quarantine করুন। Flake-কে একটি কারণসহ bug হিসেবে দেখুন।

❌ **গভীর `describe` nesting আর অস্পষ্ট নাম।** চারটি block-এর ভেতরে `it("works")` রাত 2টায় fail করলে আপনাকে কিছুই
বলে না।
✅ এক বা দুই স্তর, আর এমন একটি নাম, যেটা শর্ত আর প্রত্যাশিত ফল বলে।

## 🔑 মূল শিক্ষা

- একটি test suite হলো একটি budget: প্রতিটি layer-এর একটি দাম আছে, আর strategy মানে সেটা সেখানে খরচ করা, যেখানে ঝুঁকি ধরা সবচেয়ে সস্তা।
- Type checker একটি testing layer, আর সবচেয়ে সস্তাটা — এটা যা আগেই প্রমাণ করে, তা test করবেন না।
- UI-ভারী frontend-এ trophy shape জেতে, কারণ bug থাকে logic-এ নয়, wiring-এ।
- শুধু যা আপনার নিজের নয়, তারই double বানান; নিজের code-এর double বানালে test হয় double-গুলোর।
- Coverage মাপে কোন line চলেছে, কখনো এটা নয় যে একটি bug ধরা পড়ত কি না।

## Interview-এর প্রশ্ন

**Q: কোনো কিছু unit test পাবে নাকি integration test, তা কীভাবে ঠিক করেন?**

ঝুঁকিটা আসলে কোথায়, তা জিজ্ঞেস করে। অনেক edge case সহ pure logic unit test হিসেবে cover করা সবচেয়ে সস্তা, কারণ একশোটা
case millisecond-এ চলে। Wiring bug শুধু তখনই দেখা যায়, যখন অংশগুলো একসাথে চলে: যে state clear হয় না, যে error path
কেউ render করেনি, যে request দুবার fire হয়। তাই এগুলোর জায়গা integration layer। একটি সাধারণ React app-এ ঝুঁকির
বেশিরভাগটাই এটা। এ কারণেই integration layer সবচেয়ে বেশি ভার পায়।

**Q: আপনার suite 25 মিনিট নেয়, আর মানুষ এটা ছাড়াই merge করছে। আপনি কী করবেন?**

আগে খুঁজে বের করুন সময়টা কোথায় যাচ্ছে। উত্তর প্রায় সবসময় কয়েকটি end-to-end test, যেগুলো এমন জিনিস cover করে, যা একটি
integration test ধরতে পারত। সেগুলো এক layer নিচে নামান। E2E রাখুন সেই journey-গুলোর জন্য, যেগুলোর failure-এ টাকা খরচ
হয়। নিশ্চিত করুন বাকিগুলো parallel-এ চলতে পারে, যার মানে সাধারণত shared state ঠিক করা। দ্রুত আর বিশ্বস্ত suite পুঙ্খানুপুঙ্খ
কিন্তু skip হওয়া suite-কে হারায়।

**Q: 100% coverage কি লক্ষ্য রাখার মতো?**

না, আর শেষ অংশটা কঠিন বলে নয়। Coverage চলা line গোনে, ধরা bug নয়। কোনো অর্থপূর্ণ assertion ছাড়া একটি test coverage
বাড়ায়, কিন্তু কিছুই ধরে না। CI-তে একটি threshold নিশ্চিতভাবে ঠিক এমন test-ই তৈরি করে। Untested error path খুঁজতে
coverage কাজের। Test একটি defect ধরত কি না, সেটা আসলে মাপে mutation testing।

**Q: কখন আপনি test লিখবেন না?**

যখন type checker আগেই এটা প্রমাণ করে, বা যখন assertion শুধু implementation-টাই আবার বলবে। এছাড়া যখন জিনিসটা সত্যিই
visual: "spacing ঠিক দেখাচ্ছে" হলো visual regression-এর কাজ, assertion-এর নয়। জানা অল্প আয়ুর throwaway code-এর
ক্ষেত্রেও একই কথা। এটা সৎভাবে বলা এমন একটি standard-এর ভান করার চেয়ে ভালো, যেটা কেউ বজায় রাখবে না।

## এরপর কী পড়বেন

- [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest) — এই section-এর প্রতিটি উদাহরণ যে runner আর query API ব্যবহার করে
- [Chapter ?? — Frontend Integration Testing](#ch-frontend-integration-testing) — যে layer সবচেয়ে বেশি ভার পাওয়ার যোগ্য বলে এই অধ্যায় যুক্তি দেয়
