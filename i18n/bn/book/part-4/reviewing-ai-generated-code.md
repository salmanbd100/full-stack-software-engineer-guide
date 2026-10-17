---
sourceHash: "fd9498869926821149fd265d5d6c2998d1fbfad46edc6b7b5cb598e2bed6794c"
title: "AI-এর লেখা Code Review"
translatedAt: "2026-10-17T01:38:55.028Z"
model: "claude-opus-5-5 (Claude Code)"
---

# AI-এর লেখা Code Review {#ch-reviewing-ai-generated-code}

> Generate করা code-এ যে ধরনের defect বিশেষ করে থাকে, সেগুলো ধরুন: যা compile হয়, পড়তে ভালো লাগে, অথচ এমন কিছু নিয়ে ভুল, যা শুধু আপনার codebase জানে।

**এই অধ্যায়ে:** generate করা code কীভাবে অন্যভাবে ভাঙে · তিনটি defect, যা দেখামাত্র চেনা উচিত · generate করা diff-কে যে প্রশ্নগুলো করবেন · মনোযোগের ভরসা ছেড়ে automation-এ gate বসানো

## 💡 মূল ধারণা

মানুষের লেখা code ভাঙে সেখানে, যেখানে লেখক বিভ্রান্ত ছিলেন। সাধারণত diff দেখেই সেটা বোঝা যায়: নামগুলো অস্পষ্ট হয়ে
আসে, comment-গুলো আত্মরক্ষার সুরে লেখা, আর কোনো edge case বাদ পড়েছে, কারণ লেখক সেটার কথা ভাবেনইনি। Review কাজ করে,
কারণ বিভ্রান্তি চিহ্ন রেখে যায়।

Generate করা code কোনো চিহ্ন রাখে না। Model তাকে দেওয়া prompt-এর সবচেয়ে সম্ভাব্য সমাধানটা লেখে। আর সেই prompt-এ আপনার
codebase-এর জানা প্রায় কিছুই ছিল না: কোন component memoise করা, কোন route critical path-এ, কোন field-কে server বিশ্বাস করে
না। তাই output-টা **নিজের জায়গায় বিশ্বাসযোগ্য, পুরো system-এর হিসেবে ভুল**। Syntax ঠিক, গড়ন idiomatic, নামগুলোও
আত্মবিশ্বাসী। আবার এর মধ্যেই একটি ভাঙা ধারণা থাকে, ঠিক সেই জিনিস নিয়ে, যা prompt-এ ছিল না।

> Review-এর প্রশ্ন বদলে যায়: *"লেখক কি এটা বুঝেছিলেন?"* থেকে *"এই file-এর বাইরে থাকা কোন invariant এটা চুপচাপ
> ভেঙে দিল?"*

## কীভাবে কাজ করে

### Generate করা code আসলে কোথায় ভাঙে

Model যত ভালোই হোক, defect-এর ধরনগুলো একই থাকে, কারণ সবগুলোই আসে একই অনুপস্থিত input থেকে: সেই context, যা model কখনো
পায়নি।

| Defect-এর ধরন | Model কেন এটা লেখে | দেখতে কেমন |
| ------------ | ----------------------- | ------------------ |
| **Reference identity** | ছোট একটি snippet-এ বোঝা যায় না component কতবার render হয় | প্রতিটি render-এ নতুন object, array বা function literal |
| **মানে ভুল এমন ARIA** | Training corpus ভরা এমন ARIA-তে, যা validate হয় | যে element-এর আগেই role আছে, তাতে আবার `role`; role নেই এমন কিছুতে label |
| **দেখতে নিরাপদ security** | আত্মরক্ষামূলক চেহারার code corpus-এ প্রচুর | Regex দিয়ে বানানো "sanitiser"; এমন validation, যা আসল জরুরি field পর্যন্ত পৌঁছায়ই না |
| **বানানো API** | পুরনো major-এর option-গুলো এখনো corpus-এ আছে | এমন config key, যার অস্তিত্বই নেই, বা দুই release আগে নাম বদলেছে |
| **যে test ফেল করতে পারে না** | Corpus-এ সবচেয়ে বেশি থাকে pass করা test | যে unit test হচ্ছে, সেটাই mock করা; assertion শুধু mock-টাই আবার বলে |
| **Version drift** | Training data-য় পুরনো pattern নতুনগুলোর চেয়ে সংখ্যায় বেশি | `getServerSideProps`, class component, `FID`, যেখানে থাকার কথা `INP` |

এখানে grep সত্যিকারের একজন reviewer। আগে পড়ুন `role=`, `aria-`, `dangerouslySetInnerHTML`, `any`, `as ` আর প্রতিটি নতুন
lockfile entry-র hit-গুলো। ছয়টি search-এই ওপরের তালিকার বড় একটি অংশ ধরা পড়ে।

### প্রথম defect — যেখানে কিছু identity দেখে চলে, সেখানে নতুন reference

**❌ "Dashboard-এ chart যোগ" নামের pull request-এ যা আসে:**

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

`Chart` `React.memo`-তে মোড়া, কারণ কেউ একজন মেপে দেখেছিলেন এটা ব্যয়বহুল। Generate করা version-এ page-এর অন্য কোথাও প্রতিটি
keystroke-এ chart আবার render হয়। কিছুই ফেল করে না। ঠিক করার ছয় মাস পরে chart-টা শুধু আবার ধীর হয়ে যায়।

> ⚠️ React Compiler 1.0 চালু থাকা React 19 codebase-এ compiler নিজের compile করা component-গুলোর ভেতরে এই ধরনের অনেকটাই
> সরিয়ে দেয়। Compiler পুরোপুরি নেওয়া codebase-এ এই diff ক্ষতিহীন। তিনটি ক্ষেত্রে এটা কাজে আসে না: file-টা compile হয়
> না (আংশিকভাবে নেওয়াটাই স্বাভাবিক), value-টা React-এর বাইরে তৈরি হয়, কিংবা যে জিনিসটা value-টা ব্যবহার করে, সেটা নিজেই identity দেখে চলে,
> যেমন একটি `Map`। টেকসই প্রশ্নটা "এটা কি পরিপাটি" নয়, বরং **"এই reference কে ব্যবহার করে, আর reference বদলালে তার কিছু
> যায় আসে কি?"**

### দ্বিতীয় defect — যে ARIA validate হয়, অথচ মিথ্যা বলে

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

Model যে ARIA attribute-ই যোগ করে, সেটা **এমন আচরণের দাবি, যা model লেখেনি**। `role="button"` প্রতিশ্রুতি দেয় focus করা যাবে,
Enter আর Space-এ চালু হবে, আর একটি disabled অবস্থা থাকবে। Native `<button>` তিনটিই দেয়। `<div>` কোনোটাই দেয় না, অথচ
দুই ক্ষেত্রেই linter খুশি, কারণ markup বৈধ। নিয়মটা ছোট। Generate করা code যদি `role` যোগ করে, জিজ্ঞেস করুন এটা কোন
native element-এর নকল করছে, আর সেই element-টাই কেন ব্যবহার করা হলো না।

### তৃতীয় defect — নিরাপত্তার অভিনয়

**❌ যা আসে:**

```typescript
function sanitise(html: string): string {
  return html.replace(/<script[^>]*>.*?<\/script>/gi, ""); // "Sanitised."
}
```

Onerror handler, `javascript:` URL, SVG payload আর nested tag, সবই এটা পেরিয়ে যায়। তবু function-এর নাম দেখে পরের reviewer
ভাবেন এটা নিরাপদ। Blocklist browser-এর কাছে হারে। Allowlist sanitiser ব্যবহার করুন, নয়তো HTML render-ই করবেন না।
দেখুন [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention)।

এর সাধারণ রূপটার নাম দিন, কারণ এই ধরনটাই সবচেয়ে বেশি production-এ পৌঁছায়। এটা হলো **এমন code, যা দেখতে নিরাপত্তার
ব্যবস্থার মতো, কিন্তু আসলে কোনো ব্যবস্থা নয়।** যে validation body দেখে, session দেখে না। যে rate limiter-এর key এমন
header, যা client নিজেই বসায়। যে check চলে শুধু client-এ।

### Generate করা diff-কে যে তিনটি প্রশ্ন করবেন

প্রতিটি line পড়ার চেয়ে লেখককে এগুলো জিজ্ঞেস করা দ্রুত, আর chat-এও চলে:

1. **এই file-এর বাইরের কী কী এটা ধরে নিয়েছে?** Render কতবার হয়, API response-এর shape, কোনো value বিশ্বাসযোগ্য কি না।
   Defect প্রায় সবসময় এখানেই থাকে।
2. **কোন অংশগুলো যাচাই করেছেন, আর কীভাবে?** "চালিয়ে দেখেছি" আর "ওই option-এর docs পড়েছি" আলাদা উত্তর। অচেনা API-র
   ক্ষেত্রে আপনি দ্বিতীয়টাই খুঁজছেন।
3. **এটা ভুল হলে কোন test ধরত?** উত্তর না থাকলে block-টা review হয়নি, শুধু মেনে নেওয়া হয়েছে।

যে লেখক প্রথম প্রশ্নের উত্তর দিতে পারেন না, তিনি একটি prompt ship করেছেন, কোনো বদল নয়। Stack Overflow থেকে copy করা
উত্তর নিয়েও team আগেই ঠিক এই সীমারেখা টেনেছিল।

### মনোযোগের ভরসা ছেড়ে automation-এ gate বসান

এই অংশটা শিষ্টাচারের নয়, architecture-এর। Generate করা code আসে দ্রুত, আর বড় diff নিয়ে। Reviewer-এর মনোযোগ সেই
তালে বাড়ে না। মোটামুটি 400 line বদলের পরে reviewer-রা ভরসার ওপর approve করেন, যেমনটা
[Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) দেখায়। তাই ওপরের প্রতিটি
defect-এর ধরনের দায়িত্ব নিতে একটি machine লাগে:

| Defect-এর ধরন | যে gate আসলে আটকায় |
| ------------ | ---------------------------- |
| Reference identity | `eslint-plugin-react-hooks`, আর CI-তে একটি performance budget |
| ARIA-র মানে | `eslint-plugin-jsx-a11y` আর একটি axe run — কোনোটাই ভুল `role` ধরে না, তাই হাতে দেখার ধাপটা রাখুন |
| Security | একটি `dangerouslySetInnerHTML` lint rule, একটি CSP, আর dependency scanning |
| বানানো API | `strict` TypeScript, আর diff-এ কোনো `any` বা যাচাই না করা `as` নেই |
| যে test ফেল করে না | জরুরি module-গুলোতে mutation testing, কিংবা review-এ code ভেঙে দেখার অভ্যাস |
| Version drift | Codemod, আর প্রতিটি deprecated pattern-এর জন্য একটি lint rule |

এর কোনোটাই নতুন tool নয়। নতুন হলো **অনুপাত**। যে team বেশিরভাগ code হাতে লেখে, তারা পাতলা একটি gate রেখে review-এর ওপর
ভরসা করতে পারে। যে team-এর diff-এর অর্ধেক generate করা, তারা পারে না। Senior-এর কাজ হলো defect rate প্রমাণ করে দেওয়ার আগেই
কথাটা বলা।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কীভাবে review করবেন | কেন |
| --------- | ---------------- | --- |
| পড়ে বোঝা যায় এমন test-সহ একটি leaf utility | স্বাভাবিক review | ক্ষতির সীমা ছোট, আর test-টা যাচাই করা যায় |
| Auth, টাকা বা migration ছুঁয়ে যায় এমন যেকোনো কিছু | Line ধরে ধরে, untrusted input-এর মতো | এখানে দেখতে ঠিক লাগাটাই আসল বিপদ |
| Generate করা test | আগে assertion পড়ুন, তারপর code ভেঙে দেখুন | যে test ফেল করতে পারে না, সেটা test না থাকার চেয়েও খারাপ |
| Generate করা ARIA বা i18n | সবসময় হাতে দেখুন | Lint syntax দেখে; এই দুটিই ভুল হয় মানে-তে |
| অচেনা API বা config key | আপনার install করা version-এর docs-এর সঙ্গে মিলিয়ে নিন | বানানো option এখানেই এসে পড়ে |
| Generate করা বড় refactor | ভাগ করে আনতে ফেরত পাঠান | 400 line-এর বেশি হলে কেউই আসলে কিছু review করছে না |

> ⚠️ **যা বদলাতে থাকে:** কোন model code লিখল, আর সেটা কতটা ভালো, তা কয়েক মাস পরপর বদলায়। ওপরের defect-এর ধরনগুলো বদলায়
> অনেক ধীরে, কারণ এগুলো আসে context না থাকা থেকে, model-এর মান থেকে নয়। টেকসই নীতি: **model-এর আত্মবিশ্বাস নির্ভর করে
> training data-য় pattern-টা কতটা সাধারণ তার ওপর, আপনার codebase-এর জন্য সেটা কতটা ঠিক তার ওপর নয়।**

## সাধারণ ভুল

❌ **Test pass করছে বলে নরমভাবে review করা।** Generate করা test আর generate করা code একই ভুল ধারণা ভাগ করে, তাই একে অপরের
সঙ্গে মিলে যায়।
✅ মিলটা নয়, ধারণাটা review করুন। Implementation ভেঙে দেখুন কোনো test লাল হয় কি না।

❌ **Generate করা বলেই কোনো বদল বাতিল করা।** কোথা থেকে এসেছে, সেটা defect নয়। Tool হাতে team যখন tool ছাড়ার চেয়ে দ্রুত,
তখনই এই অবস্থান হেরে যায়।
✅ Code-টা review করুন। নিজের code-কে যে মানে ধরেন, এটাকেও সেই মানে ধরুন। মানটা বেশি, আলাদা নয়।

❌ **Review-এ লেখককে "AI লিখেছে" বলতে দেওয়া।** এতে মালিকানা চলে যায় এমন কিছুর কাছে, যাকে পাল্টা প্রশ্ন করা যায় না।
✅ Pull request-এ যার নাম, প্রতিটি line-এর মালিক তিনিই, যে line কেউ type করেনি সেগুলোরও।

❌ **আরও মন দিয়ে পড়ে মান ধরে রাখার চেষ্টা।** Generation-এর গতির সঙ্গে যে একটি জিনিস বাড়ে না, তা হলো মনোযোগ।
✅ একই review comment দ্বিতীয়বার লিখতেই সেটাকে একটি lint rule বানিয়ে ফেলুন।

## 🔑 মূল শিক্ষা

- Generate করা code ভাঙে সেখানে, যেখানে prompt-এ context ছিল না, লেখক বিভ্রান্ত ছিলেন বলে নয়। তাই এটা ভাঙে চেনা চিহ্ন
  না রেখেই।
- টেকসই defect-এর ধরনগুলো: reference identity, মানে ভুল এমন ARIA, নিরাপত্তার অভিনয়, বানানো API, যে test ফেল করতে পারে না,
  আর version drift।
- Model যে ARIA attribute-ই লেখে, সেটা এমন আচরণের দাবি, যা model implement করেনি।
- জিজ্ঞেস করুন code-টা নিজের file-এর বাইরে কী ধরে নিয়েছে, লেখক কী যাচাই করেছেন, আর এটা ভুল হলে কোন test ধরত।
- Reviewer-এর মনোযোগ generation-এর গতির সঙ্গে বাড়ে না। বারবার ফিরে আসা প্রতিটি defect-কে lint rule, type বা CI check
  বানাতে হবে।

## Interview-এর প্রশ্ন

**Q: যে pull request-এর বেশিরভাগ assistant লিখেছে, তাতে আপনি কী খোঁজেন?**

যেকোনো review-এ যা খুঁজি, তা-ই, সঙ্গে generate করা code-এর চেনা ধরনগুলো। খুঁজি এমন নতুন reference, যেখানে কিছু identity
দেখে memoise বা cache করে। খুঁজি এমন ARIA, যা validate হয়, কিন্তু এমন আচরণের প্রতিশ্রুতি দেয় যা code implement করে না।
আর এমন validation, যা দেখতে নিরাপত্তার ব্যবস্থার মতো, অথচ আসলে তা নয়। তারপর লেখককে একটি প্রশ্ন করি: এটা বাকি system
সম্পর্কে কী ধরে নিয়েছে? Defect সাধারণত সেখানেই থাকে, কারণ prompt ঠিক ওই জিনিসটাই বয়ে আনতে পারেনি।

**Q: একটি team-এর velocity বেড়েছে, সঙ্গে defect rate-ও বেড়েছে। আপনি কী বদলাবেন?**

Review-এর মান নয়, কারণ ব্যর্থ হচ্ছে তো সেটাই। আমি বারবার ফিরে আসা দুই-তিনটি defect খুঁজে বের করব, আর প্রতিটির দায়িত্ব দেব
একটি machine-কে। মানে একটি lint rule, আরও কড়া একটি type, একটি axe run (accessibility-র automated check), কিংবা CI-তে
একটি performance budget। তখন review-এর সময় যায় সেই প্রশ্নে, যা machine বিচার করতে পারে না: বদলটা ঠিক বদল কি না। নজর
রাখার মতো সংখ্যা হলো production-এ পৌঁছানো defect, pull request-প্রতি review comment নয়।

**Q: কখন generate করা code-এর জন্য বাড়তি review করে গতি কমাবেন না?**

যখন ক্ষতির সীমা ছোট আর feedback দ্রুত, যেমন একটি leaf utility, styling-এর বদল, বা ফেলে দেওয়ার মতো একটি script। সেখানে
যত্ন নিয়ে review করার খরচ bug-এর চেয়ে বেশি। বাঁচানো মনোযোগ আমি বরং দেব auth, payment আর data-migration-এর path-এ।
দেখতে ঠিক অথচ ভুল, এটাই সেখানকার আসল বিপদ, আর পরে কোথাও কিছু সেটা ধরবে না।

## এরপর কী পড়বেন

- [Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) — compiler কোন reference-identity defect সরায়, আর কোনগুলো রেখে দেয়
- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — সঠিক `role`-এর চেয়েও native element কেন সবসময় ভালো
- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — এই অধ্যায় যে review-এর কলকবজা জানা ধরে নেয়, diff-এর আকার কেন review-এর মান ঠিক করে তা-সহ
