---
sourceHash: "fd9498869926821149fd265d5d6c2998d1fbfad46edc6b7b5cb598e2bed6794c"
title: "AI-এর লেখা Code Review"
translatedAt: "2026-10-12T12:15:05.045Z"
model: "claude-opus-5-5 (Claude Code)"
---

# AI-এর লেখা Code Review {#ch-reviewing-ai-generated-code}

> Generated code-এ যেসব defect স্বভাবগতভাবে বেশি দেখা যায়, সেগুলো ধরুন — যেগুলো compile হয়, পড়তে ভালো লাগে, আর এমন কিছু নিয়ে ভুল যা শুধু আপনার codebase জানে।

**এই অধ্যায়ে:** generated code কীভাবে অন্যভাবে ব্যর্থ হয় · তিনটি defect যা দেখামাত্র চেনা উচিত · একটি generated diff-কে যে প্রশ্নগুলো করবেন · gate-কে মনোযোগ থেকে automation-এ সরানো

## 💡 মূল ধারণা

মানুষের লেখা code ব্যর্থ হয় সেখানে, যেখানে author বিভ্রান্ত ছিলেন। সাধারণত diff-এই সেটা দেখা যায়: নামগুলো অস্পষ্ট হয়ে
যায়, comment-গুলো আত্মরক্ষামূলক হয়ে ওঠে, edge case বাদ পড়ে কারণ author সেটা কখনো ভাবেননি। Review কাজ করে কারণ
বিভ্রান্তি চিহ্ন রেখে যায়।

Generated code কোনো চিহ্ন রাখে না। একটি model তাকে দেওয়া prompt-এর সবচেয়ে সম্ভাব্য সমাধান তৈরি করে। আপনার codebase যা
জানে, তার প্রায় কিছুই সেই prompt-এ ছিল না: কোন component memoise করা, কোন route critical path-এ আছে, কোন field-কে
server বিশ্বাস করে না। তাই output হয় **স্থানীয়ভাবে বিশ্বাসযোগ্য আর সামগ্রিকভাবে ভুল**। এর syntax ঠিক, গড়ন idiomatic,
নামগুলো আত্মবিশ্বাসী। আবার prompt-এ যে একটি জিনিস ছিল না, সেটা নিয়ে এর একটি ভাঙা ধারণাও আছে।

> Review সরে যায় *"author কি এটা বুঝেছিলেন?"* থেকে *"এই file-এর বাইরে থাকা কোন invariant এটা চুপচাপ ভেঙে
> দিয়েছে?"*-তে

## কীভাবে কাজ করে

### Generated code আসলে কোথায় ব্যর্থ হয়

Model যত উন্নত হোক, defect-এর শ্রেণিগুলো একই থাকে, কারণ সবগুলো আসে একই অনুপস্থিত input থেকে: এমন context যা model-এর
কাছে কখনো ছিল না।

| Defect-এর শ্রেণি | Model কেন এটা তৈরি করে | দেখতে কেমন |
| ------------ | ----------------------- | ------------------ |
| **Reference identity** | একটি snippet-এ render-এর হার দেখা যায় না | প্রতিটি render-এ নতুন object, array বা function literal |
| **অর্থের দিক থেকে ভুল ARIA** | Training corpus validate হওয়া ARIA-তে ভরা | যে element-এর আগে থেকেই `role` আছে, তাতে আবার একটি; role নেই এমন কিছুর ওপর label |
| **বিশ্বাসযোগ্য-দেখতে security** | আত্মরক্ষামূলক-দেখতে code প্রচুর আছে | একটি regex "sanitiser"; এমন validation যা গুরুত্বপূর্ণ field পর্যন্ত পৌঁছায়ই না |
| **বানানো API surface** | পুরনো major-এ থাকা option এখনো corpus-এ আছে | এমন config key যা নেই, বা দুই release আগে নাম বদলেছে |
| **যে test fail করতে পারে না** | Corpus-এ সবচেয়ে বেশি থাকে pass করা test | যে unit test হচ্ছে সেটাই mock করা; assertion শুধু mock-টাই আবার বলে |
| **Version drift** | Training data-য় নতুন pattern-এর চেয়ে পুরনো pattern বেশি | `getServerSideProps`, class component, `INP`-এর বদলে `FID` |

এখানে grep সত্যিকারের একজন reviewer। আগে `role=`, `aria-`, `dangerouslySetInnerHTML`, `any`, `as ` আর প্রতিটি নতুন
lockfile entry-র hit-গুলো পড়ুন। ছয়টি search ওই তালিকার বড় একটি অংশ ধরে ফেলে।

### প্রথম defect — যেখানে কিছু identity দেখে key করে, সেখানে নতুন reference

**❌ যা আসে, "add chart to dashboard" নামের একটি pull request-এ:**

```tsx
export function Dashboard({ points }: { points: Point[] }) {
  // A new object every render. `Chart` is memoised, so this is the bug.
  return <Chart data={points} options={{ animate: false, legend: "bottom" }} />;
}
```

**✅ যা হওয়া উচিত:**

```tsx
// The options never change, so they do not belong inside the render.
const CHART_OPTIONS = { animate: false, legend: "bottom" } as const;

export function Dashboard({ points }: { points: Point[] }) {
  return <Chart data={points} options={CHART_OPTIONS} />;
}
```

`Chart` `React.memo`-তে wrap করা, কারণ কেউ এটা measure করেছিলেন আর এটা দামি ছিল। Generated version-টি page-এর অন্য
কোথাও প্রতিটি keystroke-এ এটাকে re-render করে। কিছুই fail করে না। Chart-টি শুধু আবার ধীর হয়ে যায়, ঠিক করার ছয় মাস
পরে।

> ⚠️ React Compiler 1.0 চালু থাকা একটি React 19 codebase-এ, compiler যেসব component compile করে তার ভেতরে এই শ্রেণির
> অনেকটাই সরিয়ে দেয়। পুরোপুরি গ্রহণ করা একটি codebase-এ এই diff ক্ষতিকর নয়। তিনটি ক্ষেত্রে এটা সাহায্য করে না: file-টি
> compile হয় না (আংশিক গ্রহণ স্বাভাবিক), value-টি React-এর বাইরে তৈরি হয়, অথবা consumer নিজেই identity দেখে key করে,
> যেমন একটি `Map`। টেকসই প্রশ্নটি "এটা কি গোছানো" নয়, বরং **"এই reference কে ব্যবহার করে, আর এটা বদলালে কি তার কিছু
> যায় আসে?"**

### দ্বিতীয় defect — যে ARIA validate হয় আর মিথ্যা বলে

**❌ যা আসে:**

```tsx
// Valid ARIA. No keyboard access, no focus, no Enter or Space handling.
<div role="button" aria-label="Delete invoice" onClick={remove} />;
```

**✅ যা হওয়া উচিত:**

```tsx
<button type="button" onClick={remove}>
  <TrashIcon aria-hidden="true" /> Delete invoice
</button>;
```

Model যে ARIA attribute যোগ করে, তার প্রতিটি হলো **এমন behaviour সম্পর্কে একটি দাবি, যা সে লেখেনি**। `role="button"`
প্রতিশ্রুতি দেয় focus পাওয়ার, Enter আর Space দিয়ে activate হওয়ার, আর একটি disabled state-এর। একটি native `<button>`
তিনটিই দেয়। একটি `<div>` একটিও দেয় না, আর linter দুই ক্ষেত্রেই খুশি থাকে কারণ markup বৈধ। নিয়মটি ছোট। Generated code
যদি একটি `role` যোগ করে, জিজ্ঞেস করুন এটা কোন native element-এর নকল করছে, আর সেই element-টিই কেন ব্যবহার করা হয়নি।

### তৃতীয় defect — security-র অভিনয়

**❌ যা আসে:**

```typescript
function sanitise(html: string): string {
  return html.replace(/<script[^>]*>.*?<\/script>/gi, ""); // "Sanitised."
}
```

Onerror handler, `javascript:` URL, SVG payload আর nested tag — সবই এটা পেরিয়ে যায়। তবু function-এর নাম পরের reviewer-কে
বলে এটা নিরাপদ। Blocklist browser-এর কাছে হারে। একটি allowlist sanitiser ব্যবহার করুন, অথবা HTML render করাই বন্ধ করুন।
দেখুন [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention)।

সাধারণ রূপটির একটি নাম দিন, কারণ এই শ্রেণিটিই সবচেয়ে বেশি production-এ পৌঁছায়। এটা হলো **এমন code যা দেখতে একটি
control-এর মতো, কিন্তু আসলে কোনো control implement করে না।** যে validation body check করে কিন্তু session নয়। যে rate
limiter এমন একটি header দিয়ে key করা, যা client নিজে set করে। যে check শুধু client-এ চলে।

### একটি generated diff-কে যে তিনটি প্রশ্ন করবেন

প্রতিটি line পড়ার চেয়ে author-কে এগুলো জিজ্ঞেস করা দ্রুত, আর এটা chat-এও কাজ করে:

1. **এই file-এর বাইরে এটা কী ধরে নেয়?** Render-এর হার, API response-এর আকার, একটি value বিশ্বাসযোগ্য কিনা। Defect প্রায়
   সবসময় এখানেই থাকে।
2. **কোন অংশগুলো আপনি যাচাই করেছেন, আর কীভাবে?** "আমি চালিয়ে দেখেছি" আর "আমি ওই option-এর docs পড়েছি" — দুটি আলাদা
   উত্তর। অপরিচিত API surface-এ আপনি দ্বিতীয়টিই খুঁজছেন।
3. **এটা ভুল হলে কোন test সেটা ধরত?** উত্তর না থাকলে block-টি review হয়নি। এটা শুধু গ্রহণ করা হয়েছে।

যে author প্রথম প্রশ্নের উত্তর দিতে পারেন না, তিনি একটি পরিবর্তন নয়, একটি prompt ship করেছেন। Stack Overflow থেকে কপি
করা উত্তরের ক্ষেত্রে team আগেই একই সীমারেখা টেনেছে।

### Gate-কে মনোযোগ থেকে automation-এ সরান

এই অংশটি architecture-এর, শিষ্টাচারের নয়। Generated code দ্রুত আসে, বড় diff-এ আসে, আর reviewer-এর মনোযোগ সেই তালে
বাড়ে না। মোটামুটি 400 changed line পার হলে reviewer-রা আস্থার ভিত্তিতে approve করেন, যেমনটা
[Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) ব্যাখ্যা করে। তাই ওপরের
প্রতিটি defect শ্রেণির দায়িত্ব একটি machine-কে নিতে হবে:

| Defect-এর শ্রেণি | যে gate আসলে টেকে |
| ------------ | ---------------------------- |
| Reference identity | `eslint-plugin-react-hooks`, আর CI-তে একটি performance budget |
| ARIA semantics | `eslint-plugin-jsx-a11y` আর একটি axe run — কোনোটাই ভুল `role` ধরে না, তাই manual pass রেখে দিন |
| Security | একটি `dangerouslySetInnerHTML` lint rule, একটি CSP, আর dependency scanning |
| বানানো API | `strict` TypeScript, আর diff-এ কোনো `any` বা unchecked `as` নয় |
| Test করা যায় না এমন test | গুরুত্বপূর্ণ module-গুলোতে mutation testing, অথবা review-এ code ভেঙে দেখার অভ্যাস |
| Version drift | Codemod, আর প্রতিটি deprecated pattern-এর জন্য একটি lint rule |

এর কোনোটাই নতুন tooling নয়। নতুন হলো **অনুপাত**। যে team তার বেশিরভাগ code হাতে লেখে, সে একটি পাতলা gate চালিয়ে review-এর
ওপর ভরসা করতে পারে। যে team-এর অর্ধেক diff generated, সে পারে না। Senior পদক্ষেপ হলো defect rate সেটা প্রমাণ করার আগেই
কথাটা বলা।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কীভাবে review করবেন | কেন |
| --------- | ---------------- | --- |
| পড়ার মতো test সহ একটি leaf utility | স্বাভাবিক review | ক্ষতির পরিধি ছোট, আর test যাচাই করা যায় |
| Auth, টাকা বা migration ছোঁয় এমন যেকোনো কিছু | Line ধরে ধরে, untrusted input হিসেবে | এখানে বিশ্বাসযোগ্য-দেখতে হওয়াটাই ব্যর্থতার ধরন |
| একটি generated test | আগে assertion পড়ুন, তারপর code ভাঙুন | যে test fail করতে পারে না, সেটা test না থাকার চেয়েও খারাপ |
| Generated ARIA বা i18n | Manual pass, সবসময় | Lint syntax check করে; এ দুটি ব্যর্থ হয় অর্থে |
| অপরিচিত API বা config key | আপনার install করা version-এর docs-এর সাথে মিলিয়ে দেখুন | বানানো option এখানেই এসে পড়ে |
| একটি বড় generated refactor | ভাগ করতে ফেরত পাঠান | 400 line-এর বেশি হলে কেউই কিছু review করছে না |

> ⚠️ **যা বদলাতে থাকে:** কোন model code লিখেছে, আর সেটা কতটা ভালো, তা কয়েক মাস পরপর বদলায়। ওপরের defect শ্রেণিগুলো
> অনেক ধীরে বদলায়, কারণ এগুলো আসে অনুপস্থিত context থেকে, model-এর মান থেকে নয়। টেকসই নীতি: **একটি model ততটাই
> আত্মবিশ্বাসী, training data-য় একটি pattern যতটা সাধারণ — আপনার codebase-এর জন্য সেটা কতটা ঠিক, তার অনুপাতে নয়।**

## সাধারণ ভুল

❌ **Test pass করছে বলে বেশি নরমভাবে review করা।** Generated test আর generated code একই ভুল ধারণা ভাগ করে নেয়, তাই
তারা একে অপরের সাথে একমত হয়।
✅ একমত হওয়াটা নয়, ধারণাটা review করুন। Implementation ভেঙে দিন আর নিশ্চিত হোন যে একটি test লাল হচ্ছে।

❌ **Generated বলেই একটি পরিবর্তন বাতিল করা।** উৎস কোনো defect নয়। Tool ছাড়া team-এর চেয়ে tool সহ team দ্রুত হলেই এই
অবস্থান হেরে যায়।
✅ Code review করুন। নিজের code-কে যে মানদণ্ডে রাখেন, এটাকেও সেই মানদণ্ডে রাখুন — যা বেশি উঁচু, আলাদা নয়।

❌ **Review-এ author-কে "AI এটা লিখেছে" বলতে দেওয়া।** এতে দায়িত্ব এমন কিছুর ওপর চলে যায়, যাকে আপনি পাল্টা প্রশ্ন করতে
পারেন না।
✅ Pull request-এ যার নাম, তিনিই এর প্রতিটি line-এর মালিক, যে line কেউ type করেনি সেগুলোসহ।

❌ **আরো মন দিয়ে পড়ে সীমারেখা ধরে রাখার চেষ্টা।** মনোযোগ একমাত্র input যা generation-এর গতির সাথে বাড়ে না।
✅ একই review comment প্রথমবার দুবার লিখলেই সেটাকে একটি lint rule-এ পরিণত করুন।

## 🔑 মূল শিক্ষা

- Generated code ব্যর্থ হয় সেখানে, যেখানে prompt-এ context ছিল না, author যেখানে বিভ্রান্ত ছিলেন সেখানে নয়। তাই এটা
  স্বাভাবিক লক্ষণ না রেখেই ব্যর্থ হয়।
- স্থায়ী defect শ্রেণিগুলো হলো reference identity, অর্থের দিক থেকে ভুল ARIA, security-র অভিনয়, বানানো API surface,
  যে test fail করতে পারে না, আর version drift।
- Model যে ARIA attribute লেখে, তার প্রতিটি এমন behaviour সম্পর্কে একটি দাবি, যা সে implement করেনি।
- জিজ্ঞেস করুন code নিজের file-এর বাইরে কী ধরে নেয়, author কী যাচাই করেছেন, আর এটা ভুল হলে কোন test সেটা ধরত।
- Reviewer-এর মনোযোগ generation-এর গতির সাথে বাড়ে না। প্রতিটি বারবার ফিরে আসা defect-কে একটি lint rule, একটি type,
  বা একটি CI check হতে হবে।

## Interview-এর প্রশ্ন

**Q: যে pull request-এর বেশিরভাগ একটি assistant লিখেছে, তাতে আপনি কী খোঁজেন?**

যেকোনো review-এ যা খুঁজি, সেগুলোই, সাথে generated code যেসব শ্রেণির defect-প্রবণ সেগুলো। খুঁজুন এমন নতুন reference,
যেখানে কিছু identity দেখে memoise বা cache করে। খুঁজুন এমন ARIA, যা validate হয় কিন্তু এমন behaviour-এর প্রতিশ্রুতি দেয়
যা code implement করে না, আর এমন validation যা দেখতে control-এর মতো কিন্তু আসলে control নয়। তারপর author-কে একটি প্রশ্ন
করুন: এটা system-এর বাকি অংশ সম্পর্কে কী ধরে নেয়? Defect সাধারণত সেখানেই থাকে, কারণ prompt ঠিক ওটাই বহন করতে পারেনি।

**Q: একটি team-এর velocity বেড়েছে, আর তার সাথে defect rate-ও বেড়েছে। আপনি কী বদলাবেন?**

Review-এর মানদণ্ড নয়, কারণ ব্যর্থ হচ্ছে ঠিক সেটাই। আমি বারবার ফিরে আসা দুই-তিনটি defect খুঁজে বের করে প্রতিটির দায়িত্ব
একটি machine-কে দেব। মানে একটি lint rule, একটি কড়া type, একটি axe run (একটি automated accessibility check), বা CI-তে একটি
performance budget। তখন review-এর সময় যায় সেই জিনিসে, যা machine বিচার করতে পারে না: পরিবর্তনটি আদৌ ঠিক পরিবর্তন কিনা।
যে measurement দেখবেন তা হলো production-এ পৌঁছানো defect, প্রতি pull request-এ review comment নয়।

**Q: কখন আপনি generated code-এর বাড়তি review-এর জন্য গতি কমাবেন না?**

যখন ক্ষতির পরিধি ছোট আর feedback দ্রুত, যেমন একটি leaf utility, একটি styling পরিবর্তন বা একটি ফেলে দেওয়ার মতো script।
সেখানে সতর্ক review-এর খরচ bug-এর চেয়ে বেশি। বাঁচানো মনোযোগ আমি বরং auth, payment আর data-migration path-এ খরচ করব।
সেখানে বিশ্বাসযোগ্য-কিন্তু-ভুল ঠিক ব্যর্থতার ধরন, আর পরের কোনো ধাপ সেটা ধরবে না।

## এরপর কী পড়বেন

- [Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) — reference-identity-র কোন defect compiler সরিয়ে দেয়, আর কোনগুলো রেখে দেয়
- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — কেন একটি native element প্রতিবার একটি সঠিক `role`-কেও হারায়
- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — এই অধ্যায় যে review mechanics ধরে নেয়, diff-এর আকার কেন review-এর মান ঠিক করে তা সহ
