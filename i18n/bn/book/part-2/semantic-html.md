---
sourceHash: "fafc436018868e61e9426aaaa70398887fe81ef1dc69b8e8245ad95f524665b0"
title: "Semantic HTML"
translatedAt: "2026-10-12T07:53:08.373Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Semantic HTML {#ch-semantic-html}

> এমন element বেছে নিন, যা বলে দেয় একটা জিনিস আসলে *কী*, আর accessibility, SEO আর keyboard behaviour নিজে একটাও না লিখে পেয়ে যান।

**এই অধ্যায়ে:** document landmark · `<section>` বনাম `<article>` বনাম `<div>` · heading hierarchy · form semantics · কখন ARIA-র দিকে হাত বাড়াবেন

## 💡 মূল ধারণা

একটা HTML element হলো content আসলে *কী*, সে বিষয়ে একটা প্রতিশ্রুতি। Browser সেই প্রতিশ্রুতি অনুযায়ী কাজ করে।
এটা থেকে সে একটা accessibility tree বানায় (page-এর সেই model, যা assistive technology পড়ে)। সে landmark (নাম
দেওয়া অঞ্চল) দেখায়, যেগুলোর মধ্যে একজন screen reader user লাফিয়ে যেতে পারেন। Reader mode কী রাখবে, সেটা সে ঠিক
করে। একটা `<button>`-কে সে focus আর keyboard activation দেয়, যা কাউকে লিখতে হয়নি। একটা `<div>` কোনো প্রতিশ্রুতি
দেয় না, তাই browser কিছুই করে না। তখন যে behaviour-গুলো এটা আপনাকে দিত, তার প্রতিটি আপনাকে হাতে নতুন করে বানাতে
হয় — নির্ভুলভাবে, চিরকাল।

এই কারণেই এটা সবচেয়ে সস্তা accessibility-র জয়, সবচেয়ে সস্তা SEO-র জয়, আর সবচেয়ে সস্তা maintenance-এর জয়।
প্রতিটি `<div>` হলো হাল ছেড়ে দেওয়ার একটা ছোট কাজ। কোনো element না মিললে তবেই এটা নিন, প্রথমেই নয়।

## কীভাবে কাজ করে

| বিষয় | Element আপনাকে কী দেয় |
| ------- | -------------------------- |
| **Accessibility** | কোনো ARIA ছাড়াই landmark, heading আর form label প্রকাশিত হয় |
| **SEO** | Crawler-রা `<article>`, `<h1>` আর `<nav>`-কে `<div>`-এর স্তূপ থেকে আলাদা গুরুত্ব দেয় |
| **Maintainability** | `<article>` দেখামাত্রই উদ্দেশ্য বোঝায়; `<div class="post">`-এর জন্য CSS-এ খুঁজে বেড়াতে হয় |
| **Resilience** | CSS আর JavaScript ছাড়াও কাজ করে — reader mode, RSS আর watch summary সবাই এটা parse করে |

### Document landmark

Screen reader user-রা landmark ধরে navigate করেন, scroll করে নয়। নিচের element-গুলোই landmark তৈরি করে।

```html
<body>
  <header>           <!-- Site or section banner -->
    <nav>...</nav>   <!-- Primary navigation -->
  </header>

  <main>             <!-- The unique content of this page. Only ONE per page -->
    <article>...</article>
    <aside>...</aside>   <!-- Tangentially related content -->
  </main>

  <footer>...</footer>
</body>
```

**Landmark-এর তালিকা, আর প্রতিটি কীসের জন্য নয়:**

| Tag | যেখানে ব্যবহার করবেন | যেখানে করবেন না |
| --- | ------- | --------- |
| `<header>` | Page-এর ওপরে **অথবা** যেকোনো `<article>`/`<section>`-এর ওপরে | সাধারণ wrapper |
| `<nav>` | প্রধান navigation block | Link-এর প্রতিটি list — footer-এর link list-এ এটা লাগে না |
| `<main>` | Page-এর প্রধান content | এক page-এ একবারের বেশি |
| `<article>` | স্বয়ংসম্পূর্ণ, syndicate করা যায় এমন content — post, product card, comment | সাধারণ grouping |
| `<section>` | বিষয়ভিত্তিক grouping, যার **একটা heading লাগে** | Styling-এর wrapper |
| `<aside>` | Sidebar, pull quote, সম্পর্কিত link | এমন content, যা শুধু এক পাশে বসানো |
| `<footer>` | Page-এর footer **অথবা** article-এর শেষ — লেখক, তারিখ | সাধারণ নিচের container |

### Heading hierarchy

একজন screen reader user heading দিয়েই চোখ বুলিয়ে নেন: `H` চাপলে এক heading থেকে আরেক heading-এ লাফ দেয়।
একটা level বাদ দিলে সেই user ভাবেন, তিনি একটা section miss করেছেন।

- প্রতি page-এ একটা `<h1>` — page-এর প্রধান বিষয়।
- **নিচে** নামার সময় কখনো level বাদ দেবেন না। `h2` → `h4` ভুল।
- **ওপরে** ফেরার সময় বাদ দেওয়া ঠিক আছে। `h4` → `h2` একসঙ্গে দুটো level বন্ধ করে।
- দেখতে কত বড়, তা level-এর ওপর নির্ভর করে না। CSS দিয়ে style করুন; level বেছে নিন outline থেকে।

```html
<!-- ❌ Visually styled, semantically broken -->
<h1>My Site</h1>
<h4>Articles</h4>   <!-- skipped h2, h3 -->
<h2>An Article</h2>

<!-- ✅ The outline matches the structure -->
<h1>My Site</h1>
<h2>Articles</h2>
<h3>An Article</h3>
```

Lighthouse, axe-core আর WAVE — সবাই ভাঙা heading order ধরে। তাই এটা ব্যবহারের সময়ের পাশাপাশি CI-তেও fail করে।

### Form semantics

খারাপ markup সত্যিকারের কষ্ট দেয় form-এ, আর তার বেশিরভাগটাই label নিয়ে। `<label>` না থাকলে screen reader বলে
"edit text, blank", আর user-এর হাতে ধরার মতো কিছুই থাকে না।

```html
<!-- ❌ No association. Clicking "Email" moves focus nowhere. -->
<div>Email</div>
<input type="email" />

<!-- ✅ Explicit `for`/`id` association -->
<label for="email">Email</label>
<input id="email" type="email" name="email" />

<!-- ✅ Implicit wrapping, equally valid -->
<label>
  Email
  <input type="email" name="email" />
</label>
```

**একসঙ্গে রাখা control-গুলোর নিজস্ব একটা নাম লাগে।** প্রতিটি radio-র আগে `<legend>` পড়ে শোনানো হয়। তাই user
"Standard, radio button"-এর বদলে শোনেন "Shipping speed, Standard, radio button"।

```html
<fieldset>
  <legend>Shipping speed</legend>
  <label><input type="radio" name="speed" value="std" /> Standard</label>
  <label><input type="radio" name="speed" value="exp" /> Express</label>
</fieldset>
```

**Input type হলো বিনামূল্যের behaviour।** সবচেয়ে নির্দিষ্ট type-টা বেছে নিন। শুধু mobile keyboard-ই এই সিদ্ধান্তের
দাম উসুল করে দেয়।

| Type | আপনাকে কী দেয় |
| ---- | ----------------- |
| `email` | Mobile-এ email keyboard, সাধারণ validation |
| `tel` | Mobile-এ numeric keypad |
| `url` | `.com` key-সহ URL keyboard |
| `number` | Spinner আর numeric input |
| `date` / `time` | Native picker |
| `search` | Clear button আর search keyboard |

### List আর table

ক্রমহীন collection-এর জন্য `<ul>` ব্যবহার করুন। যেখানে ক্রমের অর্থ আছে — যেমন ধাপ, র‍্যাংকিং বা line number —
সেখানে `<ol>`। Term আর definition-এর জোড়ার জন্য `<dl>`, যেমন একটা glossary বা একটা metadata block।

```html
<dl>
  <dt>Author</dt>    <dd>Salman Rahman</dd>
  <dt>Published</dt> <dd>2026-05-20</dd>
</dl>
```

`<table>` সেই data-র জন্য, যেখানে প্রতিটি cell একটা row header আর একটা column header-এর সঙ্গে সম্পর্কিত।
`<caption>`, `<thead>` আর `scope` থাকলে user cell থেকে cell-এ গেলে screen reader সেই header-গুলো পড়ে শোনাতে পারে।

```html
<table>
  <caption>Q1 2026 Revenue</caption>
  <thead>
    <tr><th scope="col">Region</th><th scope="col">Revenue</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">EU</th><td>$2.1M</td></tr>
  </tbody>
</table>
```

## কখন ব্যবহার করবেন

`<section>` / `<article>` / `<div>`-এর সিদ্ধান্ত নিয়েই interviewer-রা প্রশ্ন করেন, আর দুটো প্রশ্নেই এর মীমাংসা
হয়ে যায়।

```text
Could this content stand alone, syndicated to another site?
  ├── Yes → <article>
  └── No → Does it have a clear heading and one distinct theme?
            ├── Yes → <section>
            └── No → <div>  (purely structural, a styling hook)
```

| Content | Element | কেন |
| ------- | ------- | --- |
| Blog post | `<article>` | Syndicate করা যায় আর স্বয়ংসম্পূর্ণ |
| সেই post-এর comment | `<article>`, nested | প্রতিটি comment নিজেই একটা একক |
| "Latest News" widget | `<section>` | বিষয়ভিত্তিক, heading আছে, একা দাঁড়ায় না |
| তিনটি subsection-সহ tab panel | প্রতিটি panel-এর জন্য একটা `<section>` | প্রতিটির একটা heading লাগে |
| Layout-এর জন্য flexbox wrapper | `<div>` | কোনো অর্থই নেই — শুধু styling-এর hook |

> ⚠️ একটা `<section>`-এর জন্য অর্থপূর্ণ heading লিখতে না পারলে সেটা একটা `<div>`। Heading সাজসজ্জা নয়।
> এটাই section-কে section বানায়।

## সাধারণ ভুল

**❌ Link-এর প্রতিটি group ঘিরে `<nav>`।** এটা প্রধান navigation-এর জন্য। Footer-এর link list একটা list মাত্র।

```html
<!-- ❌ Every link group announced as a navigation landmark -->
<footer>
  <nav><a>Privacy</a><a>Terms</a></nav>
</footer>

<!-- ✅ A plain list is enough -->
<footer>
  <ul><li><a>Privacy</a></li><li><a>Terms</a></li></ul>
</footer>
```

**❌ Element থাকতেও ARIA-র দিকে হাত বাড়ানো।** ARIA (assistive technology-র জন্য role আর state) HTML-এর ফাঁক
পূরণ করে, যেমন tab, combobox আর tree। এর বাইরে কিছু করে না। ARIA-র প্রথম নিয়ম হলো ARIA ব্যবহার না করা।

```html
<!-- ❌ Reinventing a button, badly -->
<div role="button" tabindex="0" onclick="...">Save</div>

<!-- ✅ It is already a button -->
<button type="button" onclick="...">Save</button>
```

`<button>` সঙ্গে আনে focus, Enter আর Space দিয়ে activation, একটা disabled state আর form-এ অংশগ্রহণ। `<div>`
আনে একটা role attribute আর একটা প্রতিশ্রুতি, যা এখন আপনাকে হাতে রাখতে হবে।

**❌ Layout-এর জন্য table।** Screen reader এগুলোকে data হিসেবে পড়ে শোনায়। তারপর positioning-এ ভরা একটা page
এমনভাবে পড়ে, যেন সেটা একটা spreadsheet।

**❌ আকার দেখে heading level বেছে নেওয়া।** Design ছোট text চায় বলে `<h4>` ব্যবহার করলেই outline ভাঙে। Level
বেছে নিন গঠন থেকে, আর আকার ঠিক করুন CSS-এ।

## 🔑 মূল শিক্ষা

- একটা element হলো content কী, সে বিষয়ে একটা প্রতিশ্রুতি, আর browser সেই অনুযায়ী কাজ করে। একটা `<div>` কোনো
  প্রতিশ্রুতি দেয় না, তাই browser আপনাকে কিছুই দেয় না।
- `<article>` একা দাঁড়ায়, `<section>`-এর একটা heading লাগে, আর দুটোর কোনোটাই না খাটলে fallback হলো `<div>`।
- Heading level আসে document outline থেকে, design যে font size চায় সেখান থেকে কখনো নয়।
- যে form control-এর সঙ্গে কোনো `<label>` যুক্ত নেই, তার কোনো accessible name নেই, আর সেটা "blank" হিসেবে পড়া হয়।
- ARIA সেই জিনিসের জন্য, যার জন্য HTML-এ কোনো element নেই। এর বাকি প্রতিটি ব্যবহার এমন কাজ, যা আবার করার দায়িত্ব
  আপনি নিজের কাঁধে নিয়েছেন।

## Interview-এর প্রশ্ন

**Q: কখন `<section>`, কখন `<article>` আর কখন `<div>` ব্যবহার করেন?**

স্বয়ংসম্পূর্ণ, syndicate করা যায় এমন content-এর জন্য `<article>` ব্যবহার করুন। মানে একটা blog post, একটা product
card, বা এমন কিছু, যা অন্য page-এ একা থাকতে পারে। Page-এর ভেতরে বিষয়ভিত্তিক একটা group-এর জন্য, যার নিজস্ব
heading আছে, `<section>` ব্যবহার করুন — যেমন homepage-এ "Featured Products"। যখন প্রকাশ করার মতো কোনো অর্থ নেই
আর element-টা শুধু styling-এর hook, তখন `<div>`। একটা পরীক্ষাতেই বেশিরভাগ ক্ষেত্রের মীমাংসা হয়: `<section>`-এর
জন্য অর্থপূর্ণ heading লিখতে না পারলে সেটা `<div>` হওয়া উচিত।

**Q: Heading order কেন গুরুত্বপূর্ণ, আর level বাদ দিলে কী ভাঙে?**

Screen reader user-রা heading ধরে navigate করেন, আর level-কে গঠন হিসেবে পড়েন। `h2` থেকে `h4`-এ লাফ দিলে
বোঝায়, মাঝে একটা parent section আছে যা আসলে নেই। ফলে user ভাবেন তিনি প্রসঙ্গ হারিয়ে ফেলেছেন। Heading-কে দেখতে
কেমন হবে তা CSS দিয়ে style করুন, আর level বেছে নিন document outline থেকে। Lighthouse আর axe দুটোই ভাঙা order
ধরে, তাই এটা স্বয়ংক্রিয়ভাবেও fail করে।

**Q: একজন সহকর্মী প্রতিটি form field একটা `<div>`-এ রেখে তার ওপরে ভাসমান text বসান। সমস্যা কোথায়?**

কোনো label association নেই, আর তার দাম তিনটি আলাদা জিনিস। Text-এ click করলে input focus হয় না। Input-এর কোনো
accessible name নেই, তাই সেটা "edit text, blank" হিসেবে পড়া হয়। আর hit target ছোট হয়ে শুধু control-টুকুতে নেমে
আসে। সমাধান হলো মিলে যাওয়া `id`-সহ `<label for>`, অথবা control-টাকে `<label>`-এর ভেতরে মুড়ে দেওয়া। Radio বা
checkbox-এর group-এর জন্য `<fieldset>` আর `<legend>` যোগ করুন, যাতে group-টারও নাম থাকে।

**Q: কখন semantic element ব্যবহার করবেন না?**

যখন সেটা এমন প্রতিশ্রুতি দেবে, যা content রাখে না। যেমন শুধু এক পাশে বসানো কিছুর জন্য `<aside>`, তিনটি footer
link-এর জন্য `<nav>`, বা একটা flex wrapper-এর জন্য `<section>`। প্রতিটিই এমন একটা landmark যোগ করে, যা একজন
screen reader user-কে পেরিয়ে যেতে হয়। ভুল landmark কোনো landmark না থাকার চেয়েও খারাপ। এটাই সেই একমাত্র ক্ষেত্র,
যেখানে `<div>` সঠিক উত্তর, আলসে উত্তর নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — এই markup থেকে browser কী বানায়, আর সেটা
  কীভাবে inspect করবেন
- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — semantic HTML সত্যিই যে ফাঁকগুলো রেখে যায়, আর সেগুলো
  পূরণ করার pattern
- [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) — validation, error message আর form-এর
  বাকি গল্প
