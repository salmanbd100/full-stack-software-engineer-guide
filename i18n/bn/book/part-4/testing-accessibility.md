---
sourceHash: "bbfc6ff91f55c91a538dbf38bb075f1474839b2ff4e22afc6591da381a050c51"
title: "Accessibility Testing"
translatedAt: "2026-10-12T12:15:51.669Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessibility Testing {#ch-testing-accessibility}

> যে অর্ধেকটা machine check করতে পারে, সেটা CI-তে gate করুন। তারপর দুটি manual pass চালান, যেগুলো সেই সবকিছু খুঁজে পায় যা automation দেখতে পায় না।

**এই অধ্যায়ে:** automation কী ধরে · pyramid-এ axe-এর জায়গা কোথায় · ঢালাও ratchet ছাড়া CI gate করা · keyboard pass · screen reader pass · audit-এর প্রমাণপত্র

## 💡 মূল ধারণা

Automated accessibility rule আসল defect-এর মোটামুটি এক-তৃতীয়াংশ থেকে অর্ধেক ধরে। এই সংখ্যাটাই পুরো strategy:
**automation দরকারি, কিন্তু যথেষ্ট হওয়ার ধারেকাছেও নেই**। যে team CI-তে axe (standard rule engine) চালিয়ে কাজ শেষ
বলে ধরে নেয়, তাদের pipeline সবুজ, আর product inaccessible।

কারণটা হলো rule-গুলো কী দেখতে পায়। একটি machine বলতে পারে যে একটি image-এর `alt` নেই। কিন্তু `alt`-এ যে
"image123" লেখা, সেটা বলতে পারে না। এটা বলতে পারে যে একটি button-এর accessible name নেই। কিন্তু dialog বন্ধ হওয়ার
পরে focus যে কোনো উদ্ভট জায়গায় গিয়ে পড়ছে, সেটা বলতে পারে না। তাই testing strategy স্তরে স্তরে সাজানো: সবখানে সস্তা
automated check, আর interaction আছে এমন সবকিছুতে দুটি ছোট manual pass।

> কাজের প্রশ্নটা কখনো "axe কি pass করেছে" নয়। প্রশ্নটা হলো, "আমি কি শুধু keyboard দিয়ে এই কাজটা শেষ করতে পারি, আর
> screen reader কি আমাকে বলে কী ঘটল"।

> ⚠️ **যা বদলাতে থাকে:** axe-core প্রতিটি major version-এ rule যোগ করে আর বদলায়। একই, অপরিবর্তিত page একটি
> dependency bump-এর পরে ভিন্ন violation count দেখাতে পারে, তাই ratchet করা count একটি ভঙ্গুর gate। টেকসই নীতিটা হলো
> এই ভাগটাই: automation মোটামুটি এক-তৃতীয়াংশ থেকে অর্ধেক criteria cover করে, আর কোনো scanner-এর কোনো version বাকি
> অর্ধেক পূরণ করবে না।

## কীভাবে কাজ করে

### প্রতিটি layer কী ধরে

| Layer | কী ধরে | খরচ | কী বাদ পড়ে |
| --- | --- | --- | --- |
| **Lint** (`eslint-plugin-jsx-a11y`) | Static markup-এর ভুল — `alt` নেই, `div`-এ `onClick` | বিনামূল্যে, তাৎক্ষণিক | Runtime-এ বা হিসাব করে তৈরি হওয়া যেকোনো কিছু |
| **Component test** (render করা output-এ axe) | নাম নেই, invalid ARIA, আলাদাভাবে contrast | কয়েক সেকেন্ড | Page-এর গঠন, focus order |
| **E2E** (আসল route-এ axe) | Landmark, duplicate id, প্রেক্ষাপটে contrast, interaction-এর পরের state | কয়েক মিনিট | অভিজ্ঞতাটা অর্থবহ কি না |
| **Keyboard pass** (মানুষ) | Focus order, trap, action-এর পরের focus, নাগালের বাইরের control | প্রতি feature-এ দুই মিনিট | Announcement |
| **Screen reader pass** (মানুষ) | ভুল নাম, বাদ পড়া announcement, অর্থহীন reading order | প্রতি feature-এ দশ মিনিট | এর চেয়ে সস্তায় আর কিছু পাবেন না |

Team-রা মাঝের তিনটি নিয়ে তর্ক করে। শেষ দুটিই সেই defect খুঁজে পায়, যেগুলো user-রা report করে। এই ধরনের test-এর
tooling আছে [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)-এ। এই
অধ্যায় পদ্ধতি নিয়ে।

### Component test-এ axe

Component-level check সবচেয়ে ভালো কাজ করে সেই state-গুলোতে, যেখানে page test সহজে পৌঁছাতে পারে না: error state,
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

একটি দ্বিতীয়, চুপচাপ সুবিধাও আছে। **Role আর label দিয়ে query করা নিজেই একটি accessibility test।**
`getByRole('button', { name: 'Save' })` যদি control-টি খুঁজে না পায়, তাহলে কোনো screen reader বা voice-control
user-ও পাবে না। দেখুন [Chapter ?? — Test লেখা: Vitest ও React Testing Library](#ch-vitest)।

### End-to-end test-এ axe

Page-level check সেটা ধরে, যা component test গঠনগতভাবেই পারে না: landmark-এর গঠন, জোড়া লাগানো component-গুলোর মধ্যে
duplicate id, আর আসল background-এর বিপরীতে contrast।

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

ওই snippet-এর দুটি সিদ্ধান্তই আকর্ষণীয় অংশ। **Tag বাছাই** test-কে সেই conformance level-এর সাথে বাঁধে, যেটা আপনি
আসলে দাবি করেন। axe-এর সব rule চালালে, best-practice rule-সহ, এমন failure তৈরি হয় যেগুলো ঠিক করতে কেউ রাজি হয়নি।
**স্পষ্ট exclusion** একটি third-party widget-কে আপনার pipeline আটকাতে দেয় না। এগুলো কী check হচ্ছে না তার একটি
record-ও রেখে যায়, যেটা skip করা test-এর সৎ সংস্করণ।

শুধু load-এর সময় নয়, interaction-এর পরেও assert করুন। Dialog খোলা state, expanded accordion, আর error-সহ submit
করা form — defect-গুলো সেখানেই থাকে।

### নিজেকে না ঠকিয়ে CI gate করা

| Strategy | আচরণ | কখন |
| --- | --- | --- |
| **যেকোনো violation-এ fail** | কড়া | নতুন code, নতুন component, নতুন route |
| **Count-এর baseline রাখুন, বাড়লে fail** | ধাপে ধাপে কমে | পরিচিত backlog-সহ একটি পুরোনো codebase |
| **শুধু report** | কখনো আটকায় না | দুই sprint-এর মধ্যেই অকেজো; সবাই পড়া বন্ধ করে দেয় |

বড় একটি পুরোনো product-এর baseline রাখা উচিত। Baseline কাজ করানোর নিয়মটা হলো, **সংখ্যাটা শুধু কমতে পারে**। যে
pull request একটি violation যোগ করে, সেটা fail করে, আর যে fix একটি violation সরায়, সেটা file-টা update করে। Report-only
mode-এর কারণেই accessibility dashboard-এ চারশোটি অছোঁয়া issue জমে।

এর scope-ও ঠিক করুন। প্রতিটি commit-এ প্রতিটি route-এ axe চালানো ধীর আর গোলমেলে। প্রতিটি pull request-এ critical
journey-গুলো চালান, আর পুরো route list রাতে।

### Keyboard pass

দুই মিনিট, কোনো tooling নেই, আর এটা যেকোনো rule set-এর চেয়ে বেশি খুঁজে পায়। Pull request খোলার আগে এটা করুন।

- ওপর থেকে Tab চাপুন। Order কি চোখে দেখা order-এর সাথে মেলে, আর প্রতিটি থামায় কি দেখতে পান আপনি কোথায়?
- প্রতিটি control-এ পৌঁছান। যা কিছু click করা যায়, সেখানে পৌঁছে Enter বা Space দিয়ে চালু করতে পারা উচিত।
- Dialog খুলুন। Focus কি ভেতরে যায়, ভেতরে থাকে, Escape-এ বন্ধ হয়, আর trigger-এ ফিরে আসে?
- কাজটা শেষ করুন। Form submit করুন, একটি error ঠিক করুন, একটি row delete করুন। প্রতিবার focus কোথায় পড়ে দেখুন।
- 200%-এ zoom করুন আর 320 px-এ সরু করুন। কিছু কি নাগালের বাইরে চলে যায়, বা দুই দিকে scroll হয়?

### Screen reader pass

আপনাকে expert user হতে হবে না। আপনাকে শুধু শুনতে হবে announcement-গুলো সত্যি কি না।

| Platform | Reader | শুরু করুন |
| --- | --- | --- |
| Windows | NVDA (বিনামূল্যে), Chrome বা Firefox-এর সাথে | আসল user-দের মধ্যে সবচেয়ে প্রচলিত জুটি |
| macOS / iOS | VoiceOver | Built in — Cmd + F5, বা side button-এ তিনবার click |
| Android | TalkBack | Built in |

চারটি gesture শিখলেই pass চালাতে পারবেন: পরের item পড়া, heading-এর list, landmark-এর list, আর form control-এর list।
তারপর তিনটি জিনিস check করুন। প্রতিটি control কি এমন একটি নাম announce করে, যেটা screen-এ যা আছে তার সাথে মেলে?
Heading-এর list কি page-টাকে বর্ণনা করে? প্রতিটি action-এর পরে কি কিছু announce হয়? একটি screen reader-এ test করাই
স্বাভাবিক, আর একটিতেও না করার চেয়ে অনেক ভালো। কিন্তু reader-ভেদে আচরণ বদলায়, তাই যে defect শুধু NVDA দেখায়,
সেটাও একটি defect।

> ⚠️ নিজের screen reader session-কে disabled user-দের সাথে testing-এর বিকল্প হিসেবে ধরবেন না। এটা আপনাকে বলে markup
> ঠিক আছে কি না। এটা বলে না যে, যিনি রোজ এভাবে navigate করেন, তাঁর জন্য flow-টা কাজ করে কি না।

### শেষের প্রমাণপত্র

Enterprise বা public sector-এ বিক্রি হওয়া যেকোনো কিছুর জন্য, এই সবকিছুর ফলাফল একটি **conformance report**। এটা একটি
VPAT (standard template), যেটা ACR (Accessibility Conformance Report) হিসেবে পূরণ করা হয়। প্রতিটি criterion ধরে ধরে
এটা বলে product প্রতিটি requirement support করে, আংশিক support করে, নাকি support করে না। Automated ফলাফল এতে যোগ হয়,
আর বেশিরভাগ row ঠিক করে manual pass-গুলো। তারিখসহ একটি সৎ "আংশিক support করে" procurement-এ অর্জন না করা একটি
"support করে"-এর চেয়ে ভালো টেকে। আইনি কাঠামো আছে [Chapter ?? — Accessibility কেন, আর আইন কী বলে](#ch-accessibility-and-the-law)-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী বেছে নেবেন | কেন |
| --- | --- | --- |
| একটি নতুন component | Lint, সাথে component test-এ প্রতিটি state-এর জন্য axe | নাম বা ARIA-র ভুল ধরার সবচেয়ে সস্তা জায়গা |
| একটি critical user journey | E2E-তে axe, সাথে একটি keyboard pass | গঠনের defect শুধু আসল page-এ দেখা দেয় |
| বড় একটি legacy codebase | Violation count-এর baseline রাখুন আর ratchet করুন | কড়া mode লাল হয়েই থাকবে, আর উপেক্ষিত হবে |
| এমন third-party widget, যেটা বদলাতে পারবেন না | স্পষ্টভাবে exclude করুন আর record রাখুন | সৎ, আর pipeline আটকায় না |
| Compliance দাবি-সহ একটি release-এর আগে | Manual pass-গুলো, তারপর ACR update করুন | এই row-গুলোই automation পূরণ করতে পারে না |

## সাধারণ ভুল

**❌ সবুজ axe run-কে compliance হিসেবে ধরা**

> এটা এক-তৃতীয়াংশ থেকে অর্ধেক criteria cover করে। বাকি অর্ধেক থেকেই আসল user-দের report আসে।

**❌ Best practice-সহ axe-এর সব rule চালানো**

> এটা এমন failure তৈরি করে, যেগুলো ঠিক করতে কেউ রাজি হয়নি, আর team job-টাকে উপেক্ষা করতে শিখে যায়। যে level দাবি
> করেন, সেটার tag-এ scope সীমিত রাখুন।

**❌ Violation-এর array snapshot করা**

> Snapshot একটি violation-কে প্রত্যাশিত হিসেবে record করে সেটাকে স্থায়ী করে দেয়। Count-এর ওপর, বা খালি থাকার ওপর
> assert করুন।

**❌ শুধু প্রথম render-এ assert করা**

> Dialog, error state আর expanded menu — defect-গুলো থাকে সেখানেই। Load-এর সময়ের check এদের কোনোটাই দেখে না।

**✅ Pull request template-এ keyboard pass যোগ করা**

> একটি checkbox, দুই মিনিট, আর এটা বদলে দেয় review পর্যন্ত কী পৌঁছায়।

## 🔑 মূল শিক্ষা

- Automated rule আসল defect-এর এক-তৃতীয়াংশ থেকে অর্ধেক ধরে, তাই এগুলো একটি gate, strategy নয়।
- Component test প্রতিটি state-এর নাম আর ARIA cover করে; end-to-end test cover করে landmark, গঠন আর প্রেক্ষাপটে contrast।
- যে conformance level দাবি করেন, axe-কে সেটার tag-এ সীমিত রাখুন, আর third-party frame চুপচাপ নয়, স্পষ্টভাবে exclude করুন।
- Legacy codebase-এ violation count-এর baseline রাখুন, আর শুধু কমতে দিন; report-only mode উপেক্ষিত হয়।
- Keyboard pass-এ দুই মিনিট লাগে, আর এটা এমন focus defect খুঁজে পায় যা কোনো rule set দেখে না; screen reader pass খুঁজে পায় ভুল নাম আর বাদ পড়া announcement।

## Interview-এর প্রশ্ন

**Q: আপনি accessibility কীভাবে test করেন?**

স্তরে স্তরে। Static markup-এর ভুলের জন্য lint। প্রতিটি অর্থবহ state-এর জন্য component test-এর ভেতরে axe চালান, আর
critical journey-গুলোর end-to-end test-এ। যে level দাবি করেন, সেটার WCAG tag-এ scope সীমিত রাখুন, আর শুধু load-এ নয়,
interaction-এর পরেও assert করুন। তারপর দুটি manual pass করুন: কাজটার মধ্য দিয়ে একটি keyboard run, আর একটি screen
reader run, যাতে check হয় নামগুলো screen-এর সাথে মেলে আর action-গুলো announce হয়। Automation এক-তৃতীয়াংশ থেকে অর্ধেক
criteria cover করে, তাই manual pass ঐচ্ছিক বাড়তি কিছু নয়।

**Q: Automated tooling কী ধরতে পারে না?**

বিচারবুদ্ধি লাগে এমন যেকোনো কিছু। `alt` text কি কাজের, শুধু উপস্থিত নয়? Reading order কি অর্থবহ? Dialog বন্ধ হওয়ার
পরে focus কি কোনো যুক্তিসঙ্গত জায়গায় পড়ে? একটি custom widget-এর keyboard model কি user-দের প্রত্যাশার সাথে মেলে?
একটি error message কি user-কে বলে কী করতে হবে? User-রা ঠিক এই defect-গুলোই report করে। এ কারণেই সবুজ pipeline আর
অব্যবহারযোগ্য product এত প্রায়ই পাশাপাশি থাকে।

**Q: বড় একটি legacy codebase-এ accessibility gate কীভাবে আনবেন?**

আগে baseline, তারপর ratchet। শত শত বিদ্যমান violation-সহ একটি codebase-এ কড়া gate লাল হয়েই থাকে, আর চিরকাল লাল
থাকা একটি check সবাইকে সেটা উপেক্ষা করতে শেখায়। তাই আমি প্রতিটি rule-এর বর্তমান count record করব। যে pull request
সেটা বাড়ায়, সেটা fail করে, আর প্রতিবার একটি fix land করলে একটি কম baseline commit হয়। নতুন component প্রথম দিন থেকেই
কড়া gate পায়, কারণ তাদের ছাড় দেওয়ার মতো কোনো backlog নেই।

**Q: কোন screen reader দিয়ে test করবেন, আর বাছাইটা কতটা গুরুত্বপূর্ণ?**

Windows-এ Chrome বা Firefox-এর সাথে NVDA, কারণ সেই জুটিটাই আসল user-দের যা আছে তার সবচেয়ে কাছাকাছি। Product
Apple-নির্ভর হলে macOS বা iOS-এ VoiceOver। বাছাইয়ের চেয়ে আদৌ করাটা বেশি গুরুত্বপূর্ণ। Reader-ভেদে আচরণ আলাদা, তাই
যে defect শুধু একটি reader দেখায়, সেটাও একটি defect। আমি দাবি করব না যে আমার নিজের দশ মিনিটের session সেই মানুষদের
সাথে testing-এর বিকল্প, যাঁরা রোজ এভাবে navigate করেন।

**Q: একটি pull request এমন একটি component যোগ করে, যার কোনো accessibility test নেই। আপনি কী চাইবেন?**

বিদ্যমান test-এ একটি role-আর-name query, `data-testid` নয়, কারণ সেই assertion নিজেই একটি accessibility check। তারপর
component-টির আসলে যে state-গুলো আছে, error আর expanded-সহ, সেগুলোর ওপর একটি axe assertion। আমি এটাও জিজ্ঞেস করব
author এটার মধ্য দিয়ে Tab করে দেখেছেন কি না। Focus order আর interaction-এর পরের focus — এগুলোই সেই অংশ, যা ওই pull
request-এর কোনো test দেখতে পায় না।

## এরপর কী পড়বেন

- [Chapter ?? — Accessibility কেন, আর আইন কী বলে](#ch-accessibility-and-the-law) — এই test-গুলো যে standard-এর বিপরীতে মাপে
- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — manual keyboard pass কী খোঁজে
- [Chapter ?? — Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) — অন্য বিশেষায়িত test-গুলোর মাঝে a11y check-এর জায়গা কোথায়
