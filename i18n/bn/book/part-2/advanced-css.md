---
sourceHash: "470f71b152aff8b98c8cc09eacb7e6d889c4a80b930a661386a5a2b1d140d1d3"
title: "Advanced CSS"
translatedAt: "2026-10-12T07:53:52.893Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Advanced CSS {#ch-advanced-css}

> 2023 থেকে সব evergreen browser-এ যে CSS এসেছে তা ব্যবহার করুন, আর interview-তে বলুন প্রতিটি feature কীসের জায়গা নিয়েছে।

**এই অধ্যায়ে:** runtime API হিসেবে custom property · `oklch` দিয়ে চোখে-দেখা অনুযায়ী colour · `:has()` · `aspect-ratio` · native nesting · subgrid

## 💡 মূল ধারণা

2022 থেকে 2024-এর মধ্যে একগুচ্ছ feature এসেছে। একসঙ্গে এরা preprocessor বা JavaScript-এর দিকে হাত বাড়ানোর
বেশিরভাগ কারণ সরিয়ে দিয়েছে। Custom property CSS value-কে dynamic করেছে। `oklch` colour-এর হিসাবকে চোখের দেখার মতো
আচরণ করিয়েছে। `:has()` একটা parent-কে তার children-এর প্রতি সাড়া দিতে দিয়েছে। Subgrid স্বাধীন component-দের একই
track ভাগ করে নিতে দিয়েছে। Interview-তে মূল্য এদের নাম বলায় নয়। মূল্য হলো বলা, প্রতিটি কী মুছে দিয়েছে — কারণ
সেজন্যই এটা আছে।

> এদের প্রতিটির পেছনের প্রশ্ন হলো "এর আগে লোকে কী করত?" এর উত্তর দিন, feature নিজেই নিজেকে ব্যাখ্যা
> করে দেবে।

> ⚠️ **বদলাতে থাকা লক্ষ্য:** নিরাপদে ship করা যায় এমন CSS feature-এর তালিকা শুধু বাড়েই, আর প্রতি কয়েক মাসে
> বাড়ে। Anchor positioning, `@scope` আর container style query হলো পরের দল, যারা সেই সীমা পার হবে। টেকসই নীতি হলো
> যাচাই করা, তালিকা নয়। কোনো feature-এর ওপর ভরসা করার আগে তার Baseline status (MDN আর web.dev-এর label, যার মানে
> "প্রতিটি প্রধান browser-এ কাজ করে") নিশ্চিত করুন। Baseline-এ পৌঁছায়নি এমন যেকোনো কিছু `@supports`-এ মুড়ে দিন,
> যাতে fallback একটা ইচ্ছাকৃত design হয়, ভাঙা layout নয়।

## কীভাবে কাজ করে

### Custom property একটা runtime API, variable নয়

Preprocessor-এর variable একটা constant, যা build-এর সময় মিলিয়ে যায়। Custom property DOM-এ থাকে আর inherit
হয়। এটা media query আর pseudo-class-এর প্রতি সাড়া দেয়, আর JavaScript এটা পড়তে ও লিখতে পারে। Architecture-এর
জন্য শেষ কথাটাই সবচেয়ে গুরুত্বপূর্ণ। Inline style string না লিখে JavaScript থেকে CSS-এ একটা value পাঠানোর এটাই
একমাত্র উপায়।

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

### চোখের দেখার মতো আচরণ করা colour

`hsl` পড়তে সহজ, কিন্তু **perceptually uniform নয়**। সমান সংখ্যা সমান দেখায় না: 50% lightness-এ হলুদ, 50%
lightness-এর নীলের চেয়ে অনেক বেশি উজ্জ্বল দেখায়। তাই HSL lightness ধাপে ধাপে বাড়িয়ে বানানো যেকোনো ramp অসমান
দেখায়। Lightness উল্টে দিয়ে dark mode বানালেও ফলাফল ঘোলাটে হয়।

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

| Function | কখন এটা নেবেন |
| -------- | ----------------- |
| `hsl()` | একজন মানুষ হাতে একটা colour বাছছেন |
| `oklch()` | Design token, ramp, gradient — যেখানেই ধাপগুলো সমান দেখাতে হবে |
| `color-mix()` | একটা token থেকে বের করা hover আর active state |
| `oklch(from …)` | Border আর shadow, যাদের একটা base colour-এর সঙ্গে তাল রাখতে হবে |

### `:has()` — parent selector

বিশ বছরের "CSS এটা পারে না" এখানেই শেষ। `:has()` একটা element-কে style করে, তার ভেতরে কী আছে বা তার পরে কী আসে
তার ভিত্তিতে। এতে একটা পুরো শ্রেণির logic JavaScript থেকে বেরিয়ে আসে।

```css
.card:has(img) { display: grid; grid-template-columns: 100px 1fr; }
label:has(input:invalid) { color: #dc2626; }
body:has(dialog[open]) { overflow: hidden; }
.list:not(:has(.item)) { display: none; }
```

এগুলোর প্রতিটি এমন একটা effect-এর জায়গা নিয়েছে, যা একটা class toggle করত। শেষ দুটোই সবচেয়ে মূল্যবান। "Modal
কি খোলা" আর "list কি খালি" — এগুলো ছিল এমন state, যা React-কে ধরে রাখতে হতো শুধু যাতে CSS তা দেখতে পায়।

> ⚠️ Browser-গুলো `:has()` implement করে invalidation tracking দিয়ে (একটা পরিবর্তন যে element-গুলোকে প্রভাবিত
> করতে পারে, শুধু সেগুলোই আবার যাচাই করে), তাই এটা production-এ নিরাপদ। একটাই রূপ এড়িয়ে চলবেন: খুব বড় tree-র
> ওপর qualifier ছাড়া `*:has(…)`। সেখানে যাচাই করার element-এর set ছোট করার কোনো সস্তা উপায় engine-এর হাতে নেই।

### `aspect-ratio`

```css
/* ❌ The old hack: a percentage padding whose value nobody could read. */
.video { position: relative; padding-bottom: 56.25%; }

/* ✅ */
.video { aspect-ratio: 16 / 9; }
.avatar { aspect-ratio: 1; width: 48px; } /* height follows */
```

Asset load হওয়ার আগেই ratio-টা জায়গা রেখে দিলে image-এর কারণে layout shift-ও বন্ধ হয়।

### Native nesting

Nesting 2023-এ native-ভাবে এসেছে। এতে preprocessor-এর পক্ষে টিকে থাকা শেষ যুক্তিগুলোর একটা সরে গেল।

```css
.card {
  padding: 1rem;

  & .title { font-size: 1.25rem; }
  &:hover { background: #f9fafb; }

  @media (min-width: 768px) { padding: 2rem; }
}
```

Sass-এর পাঠযোগ্যতার নিয়ম বদল ছাড়াই এখানেও খাটে: দুই বা তিন level, এর বেশি নয়। গভীর nesting লম্বা descendant
selector বানায়, আর সেগুলো এমন specificity, যা আপনি তৈরি করতে চাননি।

### Subgrid

এক row-তে তিনটি card কল্পনা করুন, প্রতিটিতে title, body আর footer, যাদের দৈর্ঘ্য আলাদা। Subgrid-এর আগে row জুড়ে
এগুলো এক সারিতে মেলাতে হলে JavaScript-এ মাপতে হতো।

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

| প্রয়োজন | বেছে নিন | কেন |
| ---- | ------ | --- |
| Runtime theming, বা JavaScript যে value set করে | Custom property | Inline style ছাড়া JavaScript থেকে CSS-এ যাওয়ার একমাত্র সেতু |
| একটা colour ramp, বা dark-mode inversion | `oklch` | Lightness-এ সমান ধাপ সমান দেখায় |
| Children-এর state থেকে parent-কে style করা | `:has()` | React যে state শুধু CSS-কে দেখানোর জন্য ধরে রাখত, তা সরিয়ে দেয় |
| Sibling component-দের মধ্যে row মেলানো | Subgrid | বিকল্প হলো JavaScript-এ মাপা |
| এমন value, যা কখনো বদলায় না | Value-টাই লিখুন | Custom property অকারণে একটা indirection যোগ করে |
| গভীরভাবে nested component style | দুই level, তারপর নতুন class | Nesting-এর গভীরতা specificity হয়ে যায় |

## সাধারণ ভুল

**❌ ভুল — custom property-কে এমনভাবে পড়া, যেন সেটা একটা value:**

```typescript
// Empty string: inline styles do not include inherited custom properties.
const brand = document.documentElement.style.getPropertyValue('--brand');
```

**✅ সঠিক — computed value পড়ুন:**

```typescript
const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
```

**❌ ভুল — custom property-কে typed ধরে নেওয়া।** Default-ভাবে একটা custom property হলো একটা token stream
(type-হীন text)। তাই `--space: 1rem` animate করা যায় না, আর `calc()` এটা থেকে আসা অর্থহীন জিনিসও চুপচাপ মেনে
নেয়। `@property` একটা syntax আর একটা initial value ঘোষণা করে। এতে property-টা animate করা যায় আর validate হয়।

**❌ ভুল — HSL-এ ধাপে ধাপে বানানো ramp।** `hsl(60 100% 50%)` আর `hsl(240 100% 50%)` একই lightness দাবি করে,
কিন্তু চোখে দেখা উজ্জ্বলতায় বিশাল পার্থক্য। এভাবে বানানো palette-এর প্রতিটি ধাপ হাতে ঠিক করতে হয়।

## 🔑 মূল শিক্ষা

- Custom property DOM-এ থাকে, inherit হয়, আর প্রসঙ্গ অনুযায়ী সাড়া দেয়। তাই এটা একটা runtime API, build-time variable নয়।
- `oklch` perceptually uniform, তাই lightness-এ সমান ধাপ সমান দেখায়। এর জোরেই ramp আর dark-mode inversion কাজ করে।
- `:has()` child থেকে parent-কে style করা CSS-এ নিয়ে আসে, আর আগে যে class-toggle করা effect-গুলো এটা করত, সেগুলো মুছে দেয়।
- Native nesting preprocessor চালানোর শেষ কারণগুলোর একটা সরিয়ে দেয়, গভীরতার শৃঙ্খলা আগের মতোই রেখে।
- Subgrid sibling component-দের মধ্যে track মেলায়, JavaScript দিয়ে মাপার জায়গা নিয়ে।

## Interview-এর প্রশ্ন

**Q: Design token-এর জন্য `hsl`-এর চেয়ে `oklch` কেন ভালো?**

কারণ HSL-এর lightness চোখের দেখা অনুযায়ী নয়। একই HSL lightness-এ হলুদ আর নীল একেবারেই এক রকম দেখায় না। তাই
সমান ধাপে বানানো একটা ramp অসমান দেখায়, আর হাতে ঠিক করতে হয়। `oklch`-এর lightness চোখে দেখা উজ্জ্বলতার সঙ্গে
তাল রাখে। এতে generate করা ramp, lightness উল্টে dark-mode inversion, আর contrast নিয়ে যুক্তি — সবই ঠিকঠাক
কাজ করে। Wide-gamut display-তে এটা sRGB-র বাইরের colour-ও ধরতে পারে।

**Q: `:has()` আপনাকে কী মুছে ফেলতে দিয়েছে?**

Class toggle করার স্তরটা। ভাবুন dialog খুললে body-র scroll lock করা, বা যে field-এ একটা invalid input আছে তার
error styling। এর সঙ্গে যোগ করুন খালি list-এর state, আর card-এ image আছে কি না তার ওপর নির্ভর করা layout-এর
variant। এগুলোর সবই ছিল React state আর effect, যেগুলো ছিল শুধু child-এর state CSS-এর কাছে দৃশ্যমান করার জন্য।

**Q: একটা custom property আর একটা Sass variable-এর মধ্যে পার্থক্য কী?**

Sass তার variable build-এর সময় বসিয়ে দেয়, তাই ship করা stylesheet-এ এর কোনো অস্তিত্ব থাকে না। Custom property
একটা জীবন্ত DOM value। এটা inherit হয়, আর প্রতিটি subtree-তে আলাদাভাবে override করা যায়। এটা media query আর
pseudo-class-এর প্রতি সাড়া দেয়, আর JavaScript এটা পড়তে ও লিখতে পারে। Runtime theming শুধু custom property-ই
সামলাতে পারে।

**Q: কখন custom property ভুল tool?**

এমন value-র জন্য, যা কখনো বদলায় না। প্রতিটি `var()` একটা indirection, যা পাঠককে resolve করতে হয়, আর engine-এর
জন্যও একটু কাজ। যে token সব জায়গায় একই, সেটা এই খরচের বিনিময়ে কিছুই দেয় না। পরীক্ষা হলো, কোনো কিছু কখনো এটা
বদলায় কি না: একটা theme, একটা breakpoint, একটা subtree বা একটা script।

## এরপর কী পড়বেন

- [Chapter ?? — Semantic HTML](#ch-semantic-html) — যে markup-এর ওপর cascade প্রয়োগ হয়
- [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) — বিভিন্ন team জুড়ে design token হিসেবে custom property
- [Chapter ?? — Internationalisation ও Intl API](#ch-i18n-fundamentals) — logical property আর right-to-left layout
