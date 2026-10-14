---
sourceHash: "470f71b152aff8b98c8cc09eacb7e6d889c4a80b930a661386a5a2b1d140d1d3"
title: "Advanced CSS"
translatedAt: "2026-10-14T04:49:12.774Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Advanced CSS {#ch-advanced-css}

> 2023 থেকে সব evergreen browser-এ যে CSS চলে, সেটা ব্যবহার করুন, আর interview-এ বলুন প্রতিটি feature কীসের জায়গা নিয়েছে।

**এই অধ্যায়ে:** runtime API হিসেবে custom property · `oklch` দিয়ে চোখের মাপে রং · `:has()` · `aspect-ratio` · native nesting · subgrid

## 💡 মূল ধারণা

2022 থেকে 2024-এর মধ্যে একগুচ্ছ feature এসেছে। সব মিলিয়ে preprocessor বা JavaScript-এর দিকে হাত বাড়ানোর বেশিরভাগ
কারণই এরা মুছে দিয়েছে। Custom property CSS-এর value-কে dynamic করেছে। `oklch` রঙের হিসাবকে চোখের দেখার সঙ্গে
মিলিয়েছে। `:has()` parent-কে তার child দেখে সাড়া দিতে দিয়েছে। Subgrid আলাদা আলাদা component-কে একই track ভাগ করে
নিতে দিয়েছে। Interview-এ এদের নাম বলায় নম্বর নেই। নম্বর আছে বলতে পারায়, প্রতিটি কী মুছে দিয়েছে, কারণ সেজন্যই
এটা এসেছে।

> এর প্রতিটির পেছনের প্রশ্ন হলো "এটার আগে লোকে কী করত?" সেই উত্তর দিতে পারলে feature নিজেই নিজেকে ব্যাখ্যা করে।

> ⚠️ **যা বদলাতে থাকে:** নিশ্চিন্তে ship করা যায় এমন CSS feature-এর তালিকা শুধু বাড়েই, আর কয়েক মাস পরপরই বাড়ে।
> Anchor positioning, `@scope` আর container style query পরের দল, যারা সীমারেখা পার হতে চলেছে। টেকসই নীতি তালিকাটা
> নয়, যাচাইয়ের অভ্যাসটা। কোনো feature-এর ওপর ভরসা করার আগে তার Baseline status দেখে নিন (MDN আর web.dev-এর এই
> label মানে "সব বড় browser-এ চলে")। Baseline-এ পৌঁছায়নি এমন কিছু `@supports`-এ মুড়ে দিন, যাতে fallback-টা ভাঙা
> layout না হয়ে জেনে-বুঝে করা design হয়।

## কীভাবে কাজ করে

### Custom property variable নয়, runtime API

Preprocessor-এর variable একটা constant, build-এর সময় মুছে যায়। Custom property থাকে DOM-এ, আর inherit হয়। Media
query আর pseudo-class-এ সাড়া দেয়, আর JavaScript একে পড়তে ও লিখতে পারে। Architecture-এর দিক থেকে শেষ কথাটাই
সবচেয়ে জরুরি। Inline style string না লিখে JavaScript থেকে CSS-এ value পাঠানোর একমাত্র উপায় এটাই।

```css
:root {
  --brand: #2563eb;
  --space: 1rem;
}

.card {
  /* Scoped override: only this subtree sees the larger value. */
  --space: 1.5rem;
  padding: var(--space);
  color: var(--brand, #000); /* second argument is the fallback */
}

/* The value responds to context, which a build-time variable cannot do. */
@media (prefers-color-scheme: dark) {
  :root { --brand: #60a5fa; }
}
```

```typescript
const root: HTMLElement = document.documentElement;
root.style.setProperty('--brand', '#ef4444');
// Reading needs getComputedStyle — the property may be inherited rather than set here.
const current: string = getComputedStyle(root).getPropertyValue('--brand');
```

### চোখের দেখার সঙ্গে মেলে এমন রং

`hsl` পড়তে সহজ, কিন্তু **চোখের মাপে সমান নয়**। সমান সংখ্যা দেখতে সমান লাগে না: 50% lightness-এর হলুদকে 50%
lightness-এর নীলের চেয়ে অনেক উজ্জ্বল দেখায়। তাই HSL-এর lightness ধাপে ধাপে বাড়িয়ে বানানো যেকোনো ramp অসমান দেখায়।
Lightness উল্টে dark mode বানালেও রং ঘোলাটে হয়ে যায়।

```css
.button {
  --brand: oklch(60% 0.2 250);
  background: var(--brand);

  /* Derive states from one token instead of declaring five hex values. */
  border: 1px solid oklch(from var(--brand) calc(l - 0.15) c h);
}

.button:hover {
  background: color-mix(in oklch, var(--brand) 85%, white);
}
```

| Function | কখন ব্যবহার করবেন |
| -------- | ----------------- |
| `hsl()` | মানুষ যখন হাতে একটি রং বাছছেন |
| `oklch()` | Design token, ramp, gradient — যেখানেই ধাপগুলো সমান দেখাতে হবে |
| `color-mix()` | একটি token থেকে hover আর active state বানানো |
| `oklch(from …)` | এমন border আর shadow, যা base রঙের সঙ্গে তাল মিলিয়ে চলবে |

### `:has()` — parent selector

"CSS এটা পারে না" কথাটার কুড়ি বছর এখানে এসে শেষ। কোনো element-এর ভেতরে কী আছে, বা তার পরে কী আছে, তা দেখে
`:has()` সেই element-কে style দেয়। এতে পুরো এক শ্রেণির logic JavaScript থেকে বেরিয়ে আসে।

```css
.card:has(img) { display: grid; grid-template-columns: 100px 1fr; }
label:has(input:invalid) { color: #dc2626; }
body:has(dialog[open]) { overflow: hidden; }
.list:not(:has(.item)) { display: none; }
```

এর প্রতিটি এমন একটা effect-এর জায়গা নিয়েছে, যা class toggle করত। শেষ দুটি সবচেয়ে দামি। "Modal খোলা কিনা" আর
"list খালি কিনা" ছিল এমন state, যা React-কে ধরে রাখতে হতো শুধু যাতে CSS সেটা দেখতে পায়।

> ⚠️ Browser `:has()` চালায় invalidation tracking দিয়ে (কোনো বদলে যে element-গুলো প্রভাবিত হতে পারে, শুধু
> সেগুলোই আবার যাচাই করে), তাই production-এ এটা নিরাপদ। একটাই আকার এড়াতে হবে: খুব বড় tree-র ওপর শর্তহীন
> `*:has(…)`। সেখানে কোন element-গুলো যাচাই করতে হবে, সেই তালিকা সস্তায় ছোট করার উপায় engine-এর থাকে না।

### `aspect-ratio`

```css
/* ❌ The old hack: a percentage padding whose value nobody could read. */
.video { position: relative; padding-bottom: 56.25%; }

/* ✅ */
.video { aspect-ratio: 16 / 9; }
.avatar { aspect-ratio: 1; width: 48px; } /* height follows */
```

Asset load হওয়ার আগেই ratio-র জায়গা রেখে দিলে image-এর কারণে layout shift-ও হয় না।

### Native nesting

Nesting native হিসেবে এসেছে 2023-এ। Preprocessor-এর পক্ষে টিকে থাকা শেষ যুক্তিগুলোর একটি এতে বাতিল হয়ে গেল।

```css
.card {
  padding: 1rem;

  & .title { font-size: 1.25rem; }
  &:hover { background: #f9fafb; }

  @media (min-width: 768px) { padding: 2rem; }
}
```

Sass-এর পড়ার সুবিধার নিয়মটা হুবহু খাটে: দুই বা তিন স্তর, তার বেশি নয়। গভীর nesting লম্বা descendant selector
তৈরি করে, আর সেগুলো এমন specificity, যা আপনি বানাতে চাননি।

### Subgrid

এক row-তে তিনটি card ভাবুন, প্রতিটিতে title, body আর footer, আর প্রতিটির দৈর্ঘ্য আলাদা। Subgrid-এর আগে row জুড়ে
এগুলো এক লাইনে আনতে JavaScript দিয়ে মাপতে হতো।

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto; /* title, body, footer */
}

.card {
  display: grid;
  grid-row: span 3;
  /* Adopt the parent's rows instead of creating new ones. */
  grid-template-rows: subgrid;
}
```

## কখন ব্যবহার করবেন

| দরকার | কী বেছে নেবেন | কেন |
| ---- | ------ | --- |
| Runtime-এ theme বদলানো, বা এমন value যা JavaScript দেয় | Custom property | Inline style ছাড়া JavaScript থেকে CSS-এ যাওয়ার একমাত্র সেতু |
| রঙের ramp, বা dark-mode-এর জন্য উল্টানো | `oklch` | Lightness-এর সমান ধাপ দেখতেও সমান |
| Child-দের state দেখে parent-কে style দেওয়া | `:has()` | যে state React ধরে রাখত শুধু CSS-কে দেখাতে, সেটা সরিয়ে দেয় |
| পাশাপাশি component-এর row এক লাইনে আনা | Subgrid | বিকল্প হলো JavaScript দিয়ে মাপা |
| এমন value, যা কখনো বদলায় না | Value-টাই লিখে দিন | Custom property অকারণে একটা ঘুরপথ যোগ করে |
| গভীরভাবে nested component style | দুই স্তর, তারপর নতুন class | Nesting যত গভীর, specificity তত বেশি |

## সাধারণ ভুল

**❌ ভুল — custom property-কে value ভেবে পড়া:**

```typescript
// Empty string: inline styles do not include inherited custom properties.
const brand = document.documentElement.style.getPropertyValue('--brand');
```

**✅ ঠিক — computed value পড়ুন:**

```typescript
const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
```

**❌ ভুল — custom property-কে typed ধরে নেওয়া।** Default-এ custom property একটা token stream (type ছাড়া লেখা)।
তাই `--space: 1rem` animate করা যায় না, আর `calc()` এর থেকে আসা আজেবাজে value-ও চুপচাপ মেনে নেয়। `@property`
একটা syntax আর একটা initial value declare করে। তাতে property-টা animate করা যায়, আর validate-ও হয়।

**❌ ভুল — HSL-এ ধাপে ধাপে বানানো ramp।** `hsl(60 100% 50%)` আর `hsl(240 100% 50%)`-এর lightness কাগজে-কলমে এক,
কিন্তু চোখে উজ্জ্বলতায় বিরাট ফারাক। এভাবে বানানো palette-এর প্রতিটি ধাপ হাতে ঠিক করতে হয়।

## 🔑 মূল শিক্ষা

- Custom property DOM-এ থাকে, inherit হয়, আর প্রসঙ্গ বুঝে সাড়া দেয়। তাই এটা runtime API, build-time-এর variable নয়।
- `oklch` চোখের মাপে সমান, তাই lightness-এর সমান ধাপ দেখতেও সমান। Ramp আর dark-mode-এর উল্টানো কাজ করে এজন্যই।
- `:has()` child দেখে parent-কে style দেওয়ার কাজটা CSS-এ নিয়ে আসে, আর আগে যে class-toggle করা effect এটা করত, সেগুলো মুছে দেয়।
- Native nesting preprocessor চালানোর শেষ কারণগুলোর একটি সরিয়ে দেয়, তবে গভীরতার নিয়ম আগের মতোই।
- Subgrid পাশাপাশি component-গুলোর track এক লাইনে আনে, JavaScript দিয়ে মাপার জায়গা নেয়।

## Interview-এর প্রশ্ন

**Q: Design token-এর জন্য `hsl`-এর চেয়ে `oklch` কেন ভালো?**

কারণ HSL-এর lightness চোখের মাপে নয়। একই HSL lightness-এ হলুদ আর নীল দেখতে মোটেই এক রকম নয়, তাই সমান ধাপে বানানো
ramp অসমান দেখায়, আর হাতে ঠিক করতে হয়। `oklch`-এর lightness চোখে দেখা উজ্জ্বলতার সঙ্গে মেলে। ফলে generate করা
ramp, lightness উল্টে dark mode, আর contrast-এর হিসাব, সবই ঠিকঠাক কাজ করে। Wide-gamut display-এ এটা sRGB-র বাইরের
রঙেও পৌঁছায়।

**Q: `:has()` আসার পর কী মুছে ফেলতে পেরেছেন?**

Class toggle করার পুরো স্তরটা। যেমন dialog খুললে body-র scroll আটকানো, বা ভেতরে invalid input থাকলে field-এ error-এর
style। এর সঙ্গে যোগ করুন খালি list-এর state, আর card-এ image আছে কিনা তার ওপর নির্ভর করা layout variant। এগুলো সবই
ছিল React-এর state আর effect, যাদের একমাত্র কাজ ছিল child-এর state CSS-কে দেখানো।

**Q: Custom property আর Sass variable-এর পার্থক্য কী?**

Sass তার variable বসিয়ে দেয় build-এর সময়, তাই ship হওয়া stylesheet-এ সেটার অস্তিত্বই থাকে না। Custom property
DOM-এর জীবন্ত value। এটা inherit হয়, আর যেকোনো subtree-তে override করা যায়। Media query আর pseudo-class-এ সাড়া দেয়,
আর JavaScript একে পড়তে ও লিখতে পারে। Runtime-এ theme বদলানো সম্ভব শুধু custom property দিয়েই।

**Q: কখন custom property ভুল জিনিস?**

এমন value-র জন্য, যা কখনো বদলায় না। প্রতিটি `var()` একটা ঘুরপথ, যা পাঠককে খুঁজে বের করতে হয়, আর engine-এরও একটু
কাজ বাড়ে। যে token সব জায়গায় একই, সে এই খরচের বিনিময়ে কিছুই দেয় না। পরীক্ষাটা হলো, কোনো কিছু কি কখনো এটা বদলায়:
theme, breakpoint, subtree, বা script?

## এরপর কী পড়বেন

- [Chapter ?? — Semantic HTML](#ch-semantic-html) — যে markup-এর ওপর cascade খাটে
- [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) — নানা team জুড়ে design token হিসেবে custom property
- [Chapter ?? — Internationalisation ও Intl API](#ch-i18n-fundamentals) — logical property আর right-to-left layout
