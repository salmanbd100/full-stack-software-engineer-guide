---
sourceHash: "bbfc6ff91f55c91a538dbf38bb075f1474839b2ff4e22afc6591da381a050c51"
title: "Accessibility Testing"
translatedAt: "2026-10-17T14:05:58.149Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessibility Testing {#ch-testing-accessibility}

> যে অর্ধেক machine দিয়ে check করা যায়, সেটা CI-তে gate করুন। আর হাতে করা দুটি pass চালান, যা automation-এর চোখে পড়ে না এমন সবকিছু খুঁজে বের করে।

**এই অধ্যায়ে:** automation কী ধরে · pyramid-এ axe-এর জায়গা কোথায় · ঢালাও ratchet ছাড়া CI gate করা · keyboard pass · screen reader pass · audit-এর নথি

## 💡 মূল ধারণা

Automated accessibility rule আসল defect-এর মোটামুটি এক-তৃতীয়াংশ থেকে অর্ধেক ধরে। পুরো strategy এই সংখ্যার ওপরেই দাঁড়িয়ে:
**automation লাগবেই, কিন্তু তা যথেষ্টর ধারেকাছেও নয়**। যে team CI-তে axe (standard rule engine) চালিয়ে ভাবে কাজ শেষ,
তাদের হাতে থাকে সবুজ pipeline, আর এমন product, যা accessible নয়।

কারণটা হলো rule-গুলো কী দেখতে পায়। Image-এ `alt` নেই, এটা machine বলতে পারে। কিন্তু `alt`-এ লেখা আছে "image123",
এটা বলতে পারে না। Button-এর accessible name নেই, এটা বলতে পারে। কিন্তু dialog বন্ধ হওয়ার পরে focus কোনো অদ্ভুত জায়গায়
গিয়ে পড়ছে, তা বলতে পারে না। তাই testing strategy কয়েক স্তরের: সব জায়গায় সস্তা automated check, আর interaction আছে এমন
যেকোনো কিছুতে হাতে করা দুটি ছোট pass।

> কাজের প্রশ্নটা কখনো "axe pass করেছে কি না" নয়। প্রশ্নটা হলো, "শুধু keyboard দিয়ে কি কাজটা শেষ করতে পারি, আর screen
> reader কি আমাকে বলে কী হলো"।

> ⚠️ **যা বদলাতে থাকে:** axe-core প্রতিটি major version-এ rule যোগ করে আর বদলায়। একই, অপরিবর্তিত page dependency
> update-এর পরে ভিন্ন সংখ্যক violation দেখাতে পারে, তাই ratchet করা সংখ্যা ভঙ্গুর gate। টেকসই নীতি হলো ভাগটা নিজেই:
> automation মোটামুটি এক-তৃতীয়াংশ থেকে অর্ধেক criterion ঢাকে, আর কোনো scanner-এর কোনো version বাকি অর্ধেক ঢাকতে পারবে না।

## কীভাবে কাজ করে

### কোন স্তর কী ধরে

| স্তর | যা ধরে | খরচ | যা বাদ পড়ে |
| --- | --- | --- | --- |
| **Lint** (`eslint-plugin-jsx-a11y`) | Static markup-এর ভুল — `alt` নেই, `div`-এ `onClick` | বিনা খরচে, সঙ্গে সঙ্গে | Runtime-এ বা হিসাব করে যা হয়, তার কিছুই না |
| **Component test** (render হওয়া output-এ axe) | বাদ পড়া নাম, ভুল ARIA, আলাদাভাবে contrast | কয়েক সেকেন্ড | Page-এর গঠন, focus order |
| **E2E** (আসল route-এ axe) | Landmark, duplicate id, প্রেক্ষাপটে contrast, interaction-এর পরের state | কয়েক মিনিট | অভিজ্ঞতাটা আদৌ বোধগম্য কি না |
| **Keyboard pass** (মানুষ) | Focus order, trap, action-এর পরে focus, যেখানে পৌঁছানো যায় না এমন control | প্রতি feature-এ দুই মিনিট | Announcement |
| **Screen reader pass** (মানুষ) | ভুল নাম, বাদ পড়া announcement, অর্থহীন পড়ার ক্রম | প্রতি feature-এ দশ মিনিট | এর চেয়ে সস্তায় পাবেন, এমন কিছুই না |

Team-রা তর্ক করে মাঝের তিনটি নিয়ে। User-রা যে defect report করেন, সেগুলো খুঁজে পায় শেষ দুটি। এই ধরনের test-এর
tooling আছে
[Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)-এ। এই অধ্যায় পদ্ধতি নিয়ে।

### Component test-এ axe

Component স্তরের check সবচেয়ে ভালো কাজ করে সেই state-গুলোতে, যেখানে page test সহজে পৌঁছাতে পারে না: error state,
expanded state, loading state।

```tsx
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PasswordField } from './PasswordField';

it('has no violations while showing an error', async () => {
  const { container } = render(<PasswordField error="Must be at least 12 characters" />);

  // Rendered state matters: this component passes when valid and failed when invalid.
  expect(await axe(container)).toHaveNoViolations();
});
```

এর আরেকটি নীরব সুবিধা আছে। **Role আর label দিয়ে query করাটাই একটি accessibility test।**
`getByRole('button', { name: 'Save' })` যদি control-টা খুঁজে না পায়, তাহলে screen reader বা voice control ব্যবহারকারীও
পাবেন না। দেখুন [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest)।

### End-to-end test-এ axe

Page স্তরের check সেগুলো ধরে, যা component test গঠনগতভাবেই পারে না: landmark-এর কাঠামো, জোড়া লাগানো component-গুলো
জুড়ে duplicate id, আর আসল background-এর বিপরীতে contrast।

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/checkout');

  const results = await new AxeBuilder({ page })
    // Scope to the standard you claim conformance with, not every rule axe ships.
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Third-party iframes you cannot fix, excluded explicitly rather than silently.
    .exclude('iframe[title="Payment provider"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

ওই snippet-এর দুটি সিদ্ধান্তই আসল আকর্ষণ। **Tag বাছাই** test-কে বেঁধে দেয় সেই conformance level-এর সঙ্গে, যার দাবি আপনি
আসলে করেন। Best practice সহ axe-এর সব rule চালালে এমন failure আসে, যা ঠিক করতে কেউ রাজি হয়নি। **স্পষ্ট করে বাদ দেওয়া**
একটি third-party widget-কে আপনার pipeline আটকাতে দেয় না। সঙ্গে কী কী check হচ্ছে না, তার একটি নথিও থাকে। Skip করা test-এর
সৎ রূপ এটাই।

শুধু load-এর সময় নয়, interaction-এর পরেও assert করুন। খোলা dialog, expand করা accordion, error সহ submit হওয়া form,
defect থাকে এগুলোতেই।

### নিজেকে না ঠকিয়ে CI gate করা

| Strategy | আচরণ | কখন |
| --- | --- | --- |
| **যেকোনো violation-এ fail** | কড়া | নতুন code, নতুন component, নতুন route |
| **সংখ্যার baseline রাখা, বাড়লে fail** | ধীরে ধীরে কমে আসে | এমন পুরনো codebase, যার জমে থাকা কাজের হিসাব জানা |
| **শুধু report** | কখনো আটকায় না | দুই sprint-এর মধ্যেই অকেজো; সবাই পড়া ছেড়ে দেয় |

বড় একটি পুরনো product-এ baseline রাখা উচিত। Baseline কাজ করে যে নিয়মে, তা হলো **সংখ্যাটা শুধু কমতেই পারে**। যে pull
request একটি violation যোগ করে, সেটা fail করে। আর যে fix একটি সরায়, সেটা file-টা update করে। Accessibility dashboard-এ
চারশো অস্পর্শিত issue জমে থাকে report-only mode-এর কারণেই।

পরিধিও ঠিক করুন। প্রতিটি commit-এ প্রতিটি route-এ axe চালানো ধীর, আর noise-এ ভরা। জরুরি journey-গুলো চালান প্রতিটি pull
request-এ, আর পুরো route list প্রতি রাতে।

### Keyboard pass

দুই মিনিট, কোনো tooling লাগে না, আর যেকোনো rule set-এর চেয়ে বেশি খুঁজে পায়। Pull request খোলার আগে করুন।

- ওপর থেকে Tab চাপুন। ক্রমটা কি চোখে দেখা ক্রমের সঙ্গে মেলে, আর প্রতিটি থামার জায়গায় কি দেখতে পান আপনি কোথায়?
- প্রতিটি control-এ পৌঁছান। যা click করা যায়, তাতে পৌঁছে Enter বা Space দিয়ে চালু করতে পারা উচিত।
- Dialog খুলুন। Focus কি ভেতরে যায়, ভেতরে থাকে, Escape-এ বন্ধ হয়, আর trigger-এ ফিরে আসে?
- কাজটা শেষ করুন। Form submit করুন, একটি error ঠিক করুন, একটি row মুছুন। প্রতিবার দেখুন focus কোথায় গিয়ে পড়ে।
- 200%-এ zoom করুন আর 320 px পর্যন্ত সরু করুন। কোনো কিছু কি নাগালের বাইরে চলে যায়, বা দুই দিকে scroll হয়?

### Screen reader pass

আপনাকে দক্ষ ব্যবহারকারী হতে হবে না। শুধু শুনতে হবে announcement-গুলো সত্যি কি না।

| Platform | Reader | শুরু করুন |
| --- | --- | --- |
| Windows | Chrome বা Firefox-এর সঙ্গে NVDA (বিনা মূল্যে) | আসল ব্যবহারকারীদের মধ্যে সবচেয়ে প্রচলিত জুটি |
| macOS / iOS | VoiceOver | ভেতরেই আছে — Cmd + F5, অথবা side button-এ তিনবার click |
| Android | TalkBack | ভেতরেই আছে |

চারটি gesture শিখলেই pass চালাতে পারবেন: পরের item পড়া, heading-এর list, landmark-এর list, আর form control-এর list।
তারপর তিনটি জিনিস check করুন। প্রতিটি control কি এমন নাম বলে, যা screen-এ লেখার সঙ্গে মেলে? Heading-এর list কি page-টা
বর্ণনা করে? প্রতিটি action-এর পরে কি কিছু announce হয়? একটি screen reader-এ test করাই চল, আর কোনোটিতে না করার চেয়ে
অনেক ভালো। তবে reader ভেদে আচরণ বদলায়, তাই যে defect শুধু NVDA-তে ধরা পড়ে, সেটাও defect।

> ⚠️ নিজের screen reader session-কে প্রতিবন্ধী ব্যবহারকারীদের সঙ্গে test করার বিকল্প ভাববেন না। এটা বলে markup ঠিক
> আছে কি না। যিনি প্রতিদিন এভাবেই navigate করেন, তাঁর জন্য flow-টা কাজ করে কি না, তা বলে না।

### শেষে যে নথি থাকে

Enterprise বা সরকারি খাতে বিক্রি হয় এমন যেকোনো কিছুর জন্য, এই সবকিছুর ফল হলো একটি **conformance report**। এটা হলো
একটি VPAT (standard template), ACR (Accessibility Conformance Report) হিসেবে পূরণ করা। প্রতিটি criterion ধরে ধরে এতে
লেখা থাকে, product প্রতিটি শর্ত support করে, আংশিক support করে, নাকি support করে না। Automated ফল এতে যোগ হয়, আর বেশিরভাগ
row ঠিক করে হাতে করা pass। তারিখ সহ একটি সৎ "আংশিক support করে" procurement-এ অর্জন না করা "support করে"-র চেয়ে ভালো টেকে।
আইনি প্রেক্ষাপট আছে [Chapter ?? — Accessibility কেন, আর আইন কী বলে](#ch-accessibility-and-the-law)-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --- | --- | --- |
| নতুন component | Lint, আর প্রতিটি state-এ component test-এ axe | নামকরণ বা ARIA-র ভুল ধরার সবচেয়ে সস্তা জায়গা |
| জরুরি user journey | E2E-তে axe, সঙ্গে একটি keyboard pass | গঠনের defect দেখা দেয় শুধু আসল page-এ |
| বড় legacy codebase | Violation-এর সংখ্যার baseline রেখে ratchet | কড়া mode লাল হয়েই থাকবে, আর কেউ পাত্তা দেবে না |
| এমন third-party widget, যা বদলাতে পারবেন না | স্পষ্ট করে বাদ দিন আর লিখে রাখুন | সৎ, আর pipeline আটকায় না |
| Compliance-এর দাবি সহ release-এর আগে | হাতে করা pass, তারপর ACR update | এগুলোই সেই row, যা automation পূরণ করতে পারে না |

## সাধারণ ভুল

**❌ সবুজ axe run-কে compliance ভাবা**

> এটা এক-তৃতীয়াংশ থেকে অর্ধেক criterion ঢাকে। আসল ব্যবহারকারীদের report আসে বাকি অর্ধেক থেকেই।

**❌ Best practice সহ axe-এর প্রতিটি rule চালানো**

> এতে এমন failure আসে, যা ঠিক করতে কেউ রাজি হয়নি, আর team job-টাকে উপেক্ষা করতে শেখে। যে level-এর দাবি করেন, তার
> tag-এ পরিধি বেঁধে দিন।

**❌ Violation-এর array-র snapshot নেওয়া**

> Snapshot একটি violation-কে প্রত্যাশিত হিসেবে লিখে রেখে স্থায়ী করে দেয়। সংখ্যার ওপর assert করুন, অথবা খালি কি না তার ওপর।

**❌ শুধু প্রথম render-এ assert করা**

> Dialog, error state আর expand করা menu-তেই defect থাকে। Load-এর সময়ের check এগুলোর কোনোটিই দেখে না।

**✅ Pull request template-এ keyboard pass যোগ করা**

> একটি checkbox, দুই মিনিট, আর review-এ কী পৌঁছায় তা বদলে যায়।

## 🔑 মূল শিক্ষা

- Automated rule আসল defect-এর এক-তৃতীয়াংশ থেকে অর্ধেক ধরে, তাই এগুলো gate, strategy নয়।
- Component test প্রতিটি state-এর নাম আর ARIA ঢাকে; end-to-end test ঢাকে landmark, গঠন আর প্রেক্ষাপটে contrast।
- যে conformance level-এর দাবি করেন, axe-কে তার tag-এ বেঁধে দিন, আর third-party frame চুপচাপ নয়, স্পষ্ট করে বাদ দিন।
- Legacy codebase-এ violation-এর সংখ্যার baseline রাখুন, আর সেটা শুধু কমতে দিন; report-only mode-কে কেউ পাত্তা দেয় না।
- Keyboard pass দুই মিনিটের, আর এমন focus defect খুঁজে পায়, যা কোনো rule set দেখে না; screen reader pass খুঁজে পায় ভুল নাম আর বাদ পড়া announcement।

## Interview-এর প্রশ্ন

**Q: Accessibility কীভাবে test করেন?**

স্তরে স্তরে। Static markup-এর ভুলের জন্য lint। প্রতিটি অর্থপূর্ণ state-এর জন্য component test-এর ভেতরে axe, আর জরুরি
journey-গুলোতে end-to-end test-এ। যে level-এর দাবি করেন, তার WCAG tag-এ পরিধি বেঁধে দিন, আর শুধু load-এ নয়, interaction-এর
পরেও assert করুন। তারপর হাতে করা দুটি pass: keyboard দিয়ে কাজটা শুরু থেকে শেষ পর্যন্ত করা, আর screen reader দিয়ে দেখা
যে নাম screen-এর সঙ্গে মেলে আর action announce হয়। Automation এক-তৃতীয়াংশ থেকে অর্ধেক criterion ঢাকে, তাই হাতে করা pass
ঐচ্ছিক বাড়তি কিছু নয়।

**Q: Automated tooling কী ধরতে পারে না?**

যেকোনো কিছু, যার জন্য বিচারবুদ্ধি লাগে। `alt` text শুধু আছেই, নাকি কাজেরও? পড়ার ক্রম কি বোধগম্য? Dialog বন্ধ হওয়ার
পরে focus কি যুক্তিসঙ্গত জায়গায় পড়ে? Custom widget-এর keyboard model কি user-দের প্রত্যাশার সঙ্গে মেলে? Error message কি
user-কে বলে কী করতে হবে? User-রা ঠিক এই defect-গুলোই report করেন। সে কারণেই সবুজ pipeline আর অব্যবহারযোগ্য product এত
প্রায়ই পাশাপাশি থাকে।

**Q: বড় একটি legacy codebase-এ accessibility gate কীভাবে চালু করবেন?**

আগে baseline, তারপর ratchet। শত শত পুরনো violation থাকা codebase-এ কড়া gate লাল হয়েই থাকে, আর চিরকাল লাল থাকা check
সবাইকে সেটা উপেক্ষা করতে শেখায়। তাই আমি প্রতিটি rule-এর বর্তমান সংখ্যা লিখে রাখতাম। যে pull request সংখ্যাটা বাড়ায়,
সেটা fail করে, আর কোনো fix land করলেই কম baseline commit হয়। নতুন component প্রথম দিন থেকেই কড়া gate পায়, কারণ তাদের
ছাড় দেওয়ার মতো কোনো জমে থাকা কাজ নেই।

**Q: কোন screen reader দিয়ে test করবেন, আর বাছাইটা কতটা গুরুত্বপূর্ণ?**

Windows-এ Chrome বা Firefox-এর সঙ্গে NVDA, কারণ এই জুটিই আসল ব্যবহারকারীদের হাতে যা থাকে, তার সবচেয়ে কাছাকাছি।
Product Apple-নির্ভর হলে macOS বা iOS-এ VoiceOver। আদৌ test করার চেয়ে বাছাইটা কম গুরুত্বপূর্ণ। Reader ভেদে আচরণ আলাদা,
তাই যে defect শুধু একটিতে ধরা পড়ে, সেটাও defect। আমার নিজের দশ মিনিটের session যে প্রতিদিন এভাবে navigate করেন এমন
মানুষদের সঙ্গে test করার বিকল্প, এমন দাবি আমি করতাম না।

**Q: একটি pull request এমন component যোগ করেছে, যার কোনো accessibility test নেই। কী চাইবেন?**

আগের test-গুলোতে `data-testid` নয়, role আর name দিয়ে একটি query, কারণ সেই assertion নিজেই একটি accessibility check।
তারপর component-এর আসলে যে state-গুলো আছে, error আর expanded সহ, সেগুলোর ওপর একটি axe assertion। Author নিজে Tab চেপে
দেখেছেন কি না, সেটাও জিজ্ঞেস করতাম। Focus order আর interaction-এর পরের focus এমন অংশ, যা ওই pull request-এর কোনো test
দেখতে পায় না।

## এরপর কী পড়বেন

- [Chapter ?? — Accessibility কেন, আর আইন কী বলে](#ch-accessibility-and-the-law) — এই test-গুলো যে standard-এর বিপরীতে মাপে
- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — হাতে করা keyboard pass যা খোঁজে
- [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) — অন্য বিশেষায়িত test-গুলোর মধ্যে a11y check-এর জায়গা
