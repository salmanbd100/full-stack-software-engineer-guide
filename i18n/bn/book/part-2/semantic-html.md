---
sourceHash: "fafc436018868e61e9426aaaa70398887fe81ef1dc69b8e8245ad95f524665b0"
title: "Semantic HTML"
translatedAt: "2026-10-14T04:48:26.640Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Semantic HTML {#ch-semantic-html}

> এমন element বেছে নিন, যা বলে জিনিসটা আসলে *কী*। তাহলে accessibility, SEO আর keyboard-এর আচরণ এক line না লিখেই পেয়ে যাবেন।

**এই অধ্যায়ে:** document landmark · `<section>` বনাম `<article>` বনাম `<div>` · heading-এর ক্রম · form-এর semantics · কখন ARIA ব্যবহার করবেন

## 💡 মূল ধারণা

HTML element হলো content আসলে *কী*, সে সম্পর্কে একটা প্রতিশ্রুতি, আর browser সেই প্রতিশ্রুতি মেনে কাজ করে। এটা
থেকে browser accessibility tree বানায় (পাতার যে model assistive technology পড়ে)। Landmark দেখায় (নাম দেওয়া অংশ),
যার মধ্যে screen reader-এর user লাফিয়ে যেতে পারেন। Reader mode কী রাখবে, তা ঠিক করে। `<button>`-কে focus আর
keyboard দিয়ে চালু হওয়ার ক্ষমতা দেয়, কাউকে সেটা লিখতে হয়নি। `<div>` কোনো প্রতিশ্রুতি দেয় না, তাই browser-ও কিছু
করে না। তখন যে আচরণগুলো browser এমনিই দিত, প্রতিটি আপনাকে হাতে বানাতে হয়, নির্ভুলভাবে, আর চিরকাল।

এজন্যই accessibility, SEO আর রক্ষণাবেক্ষণ, তিন দিকেই এটা সবচেয়ে সস্তা জয়। প্রতিটি `<div>` আসলে একটুখানি হাল ছেড়ে
দেওয়া। কোনো element খাপ না খেলে তবেই div নিন, প্রথমেই নয়।

## কীভাবে কাজ করে

| বিষয় | Element থেকে কী পাওয়া যায় |
| ------- | -------------------------- |
| **Accessibility** | কোনো ARIA ছাড়াই landmark, heading আর form label দেখা যায় |
| **SEO** | Crawler `<article>`, `<h1>` আর `<nav>`-কে `<div>`-এর জঙ্গলের চেয়ে আলাদা গুরুত্ব দেয় |
| **রক্ষণাবেক্ষণ** | `<article>` দেখলেই উদ্দেশ্য বোঝা যায়; `<div class="post">` বুঝতে CSS ঘাঁটতে হয় |
| **টিকে থাকা** | CSS আর JavaScript ছাড়াই চলে — reader mode, RSS আর watch-এর summary সবাই এটা পড়তে পারে |

### Document landmark

Screen reader-এর user-রা scroll করে নয়, landmark ধরে ঘোরেন। এই element-গুলো landmark তৈরি করে।

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

**Landmark-এর তালিকা, আর কোনটা কীসের জন্য নয়:**

| Tag | কীসের জন্য | কীসের জন্য নয় |
| --- | ------- | --------- |
| `<header>` | পাতার মাথায় **অথবা** যেকোনো `<article>`/`<section>`-এর মাথায় | সাধারণ wrapper |
| `<nav>` | মূল navigation block | Link-এর প্রতিটি তালিকা — footer-এর link তালিকার এটা লাগে না |
| `<main>` | পাতার মূল content | এক পাতায় একবারের বেশি |
| `<article>` | নিজে নিজে সম্পূর্ণ, অন্যত্র তুলে দেওয়া যায় এমন content — post, product card, comment | সাধারণ grouping |
| `<section>` | বিষয় ধরে grouping, যার **heading লাগে** | Styling-এর wrapper |
| `<aside>` | Sidebar, pull quote, সম্পর্কিত link | যে content শুধু এক পাশে বসানো |
| `<footer>` | পাতার footer **অথবা** article-এর শেষ — লেখক, তারিখ | নিচের দিকের সাধারণ container |

### Heading-এর ক্রম

Screen reader-এর user চোখ বুলিয়ে যান heading দিয়েই: `H` চাপলে এক heading থেকে পরের heading-এ লাফ। কোনো স্তর বাদ
দিলে সেই user ভাবেন, একটা অংশ তাঁর চোখ এড়িয়ে গেছে।

- এক পাতায় একটি `<h1>` — পাতার মূল বিষয়।
- **নিচের দিকে** যেতে কখনো স্তর বাদ দেবেন না। `h2` → `h4` ভুল।
- **ওপরের দিকে** ফিরতে বাদ দেওয়া চলে। `h4` → `h2` একসঙ্গে দুটি স্তর বন্ধ করে।
- দেখতে কত বড়, তার সঙ্গে স্তরের সম্পর্ক নেই। Size দিন CSS দিয়ে; স্তর বাছুন outline দেখে।

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

Lighthouse, axe-core আর WAVE তিনটিই ভাঙা heading-ক্রম ধরে, তাই এই ভুল ব্যবহারে যেমন ধরা পড়ে, CI-তেও তেমনি fail করে।

### Form-এর semantics

খারাপ markup সত্যিকারের কষ্ট দেয় form-এ, আর তার বেশিরভাগটাই label নিয়ে। `<label>` না থাকলে screen reader বলে
"edit text, blank", আর user কিছুই বুঝতে পারেন না।

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

**কয়েকটি control একসঙ্গে থাকলে দলটারও নিজের নাম লাগে।** প্রতিটি radio-র আগে `<legend>` পড়ে শোনানো হয়, তাই user
"Standard, radio button"-এর বদলে শোনেন "Shipping speed, Standard, radio button"।

```html
<fieldset>
  <legend>Shipping speed</legend>
  <label><input type="radio" name="speed" value="std" /> Standard</label>
  <label><input type="radio" name="speed" value="exp" /> Express</label>
</fieldset>
```

**Input-এর type মানে বিনা খরচে পাওয়া আচরণ।** যতটা সম্ভব নির্দিষ্টটা বেছে নিন। শুধু mobile keyboard-এর জন্যই
সিদ্ধান্তটা পোষায়।

| Type | কী পাওয়া যায় |
| ---- | ----------------- |
| `email` | Mobile-এ email keyboard, সাধারণ validation |
| `tel` | Mobile-এ number keypad |
| `url` | `.com` key সহ URL keyboard |
| `number` | Spinner আর সংখ্যার input |
| `date` / `time` | Native picker |
| `search` | Clear button আর search keyboard |

### List আর table

ক্রমহীন সংগ্রহের জন্য `<ul>`। ক্রমের মানে থাকলে `<ol>`, যেমন ধাপ, র‍্যাঙ্কিং বা line number। Term আর তার সংজ্ঞার
জোড়ার জন্য `<dl>`, যেমন glossary বা metadata block।

```html
<dl>
  <dt>Author</dt>    <dd>Salman Rahman</dd>
  <dt>Published</dt> <dd>2026-05-20</dd>
</dl>
```

`<table>` সেই data-র জন্য, যার প্রতিটি cell একটি row header আর একটি column header-এর সঙ্গে যুক্ত। `<caption>`,
`<thead>` আর `scope` থাকলে user এক cell থেকে আরেক cell-এ যাওয়ার সময় screen reader সেই header-গুলো পড়ে শোনাতে পারে।

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

Interviewer-রা জিজ্ঞেস করেন `<section>` / `<article>` / `<div>`-এর সিদ্ধান্ত নিয়েই, আর সেটা মিটে যায় দুটি প্রশ্নে।

```text
Could this content stand alone, syndicated to another site?
  ├── Yes → <article>
  └── No → Does it have a clear heading and one distinct theme?
            ├── Yes → <section>
            └── No → <div>  (purely structural, a styling hook)
```

| Content | Element | কেন |
| ------- | ------- | --- |
| Blog post | `<article>` | অন্যত্র তুলে দেওয়া যায়, নিজে নিজে সম্পূর্ণ |
| সেই post-এ comment | ভেতরে বসানো `<article>` | প্রতিটি comment নিজেই একটা একক |
| "Latest News" widget | `<section>` | একটা বিষয় আছে, heading আছে, কিন্তু একা দাঁড়ায় না |
| তিনটি উপ-অংশসহ tab panel | প্রতিটি panel-এ `<section>` | প্রতিটির heading লাগে |
| Layout-এর জন্য flexbox wrapper | `<div>` | কোনো অর্থই নেই — শুধু styling-এর জন্য |

> ⚠️ `<section>`-এর জন্য অর্থপূর্ণ heading লিখতে না পারলে সেটা আসলে `<div>`। Heading সাজসজ্জা নয়। Section-কে
> section বানায় heading-ই।

## সাধারণ ভুল

**❌ Link-এর প্রতিটি দলের চারপাশে `<nav>`।** এটা মূল navigation-এর জন্য। Footer-এর link তালিকা নিছক একটা তালিকা।

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

**❌ Element থাকা সত্ত্বেও ARIA নেওয়া।** ARIA (assistive technology-র জন্য role আর state) HTML-এর ফাঁক ভরায়,
যেমন tab, combobox আর tree। এর বাইরে এটা কিছুই করে না। ARIA-র প্রথম নিয়ম: ARIA ব্যবহার করবেন না।

```html
<!-- ❌ Reinventing a button, badly -->
<div role="button" tabindex="0" onclick="...">Save</div>

<!-- ✅ It is already a button -->
<button type="button" onclick="...">Save</button>
```

`<button>` সঙ্গে আনে focus, Enter আর Space দিয়ে চালু হওয়া, disabled state আর form-এ অংশ নেওয়া। `<div>` আনে একটা
role attribute, আর এমন একটা প্রতিশ্রুতি, যা এখন আপনাকে হাতে রক্ষা করতে হবে।

**❌ Layout-এর জন্য table।** Screen reader এগুলোকে data হিসেবে পড়ে। ফলে পুরো এক পাতার positioning পড়ে শোনায়
যেন সেটা একটা spreadsheet।

**❌ Size দেখে heading-এর স্তর বাছা।** Design ছোট লেখা চায় বলে `<h4>` দিলে outline এভাবেই ভাঙে। স্তর বাছুন
structure দেখে, size দিন CSS-এ।

## 🔑 মূল শিক্ষা

- Element হলো content আসলে কী, তার প্রতিশ্রুতি, আর browser তা মেনে কাজ করে। `<div>` কোনো প্রতিশ্রুতি দেয় না,
  তাই browser-ও আপনাকে কিছু দেয় না।
- `<article>` একা দাঁড়ায়, `<section>`-এর heading লাগে, আর দুটির কোনোটাই না খাটলে `<div>`।
- Heading-এর স্তর আসে document-এর outline থেকে, design যে font size চায় তা থেকে কখনো নয়।
- যুক্ত `<label>` ছাড়া form control-এর কোনো accessible name থাকে না, আর screen reader তাকে বলে "blank"।
- ARIA সেই কাজের জন্য, যার কোনো HTML element নেই। এর বাকি প্রতিটি ব্যবহার মানে নিজের ঘাড়ে আবার করার কাজ নেওয়া।

## Interview-এর প্রশ্ন

**Q: কখন `<section>`, কখন `<article>`, আর কখন `<div>`?**

নিজে নিজে সম্পূর্ণ, অন্যত্র তুলে দেওয়া যায় এমন content-এর জন্য `<article>`। মানে blog post, product card, বা এমন
কিছু, যা অন্য পাতায় একা থাকতে পারে। পাতার ভেতরে বিষয় ধরে এমন একটা দল, যার নিজের heading আছে, তার জন্য
`<section>`, যেমন homepage-এ "Featured Products"। কোনো অর্থ বোঝানোর নেই, element-টা শুধু styling-এর জন্য, তখন
`<div>`। একটা পরীক্ষাতেই বেশিরভাগ ক্ষেত্র মিটে যায়: `<section>`-এর জন্য অর্থপূর্ণ heading লিখতে না পারলে সেটা
`<div>` হওয়া উচিত।

**Q: Heading-এর ক্রম কেন গুরুত্বপূর্ণ, আর স্তর বাদ দিলে কী ভাঙে?**

Screen reader-এর user heading ধরে ঘোরেন, আর স্তরটাকে structure হিসেবে পড়েন। `h2` থেকে `h4`-এ লাফালে মনে হয় মাঝে
একটা parent অংশ আছে, যা আসলে নেই। ফলে user ভাবেন তিনি প্রসঙ্গ হারিয়ে ফেলেছেন। Heading দেখতে কেমন হবে, তা CSS
দিয়ে ঠিক করুন, আর স্তর বাছুন document-এর outline দেখে। Lighthouse আর axe দুটিই ভাঙা ক্রম ধরে, তাই এটা নিজে
থেকেই fail করে।

**Q: এক সহকর্মী প্রতিটি form field একটা `<div>`-এ রেখে ওপরে ভাসমান লেখা বসিয়েছেন। সমস্যা কোথায়?**

Label-এর সঙ্গে কোনো যোগ নেই, আর তাতে তিনটি আলাদা ক্ষতি। লেখায় click করলে input-এ focus যায় না। Input-এর কোনো
accessible name নেই, তাই শোনায় "edit text, blank"। আর click করার জায়গাটা ছোট হয়ে শুধু control-টুকুতে নেমে আসে।
সমাধান হলো মিলিয়ে `id` দেওয়া `<label for>`, অথবা control-টাকে `<label>`-এর ভেতরে রাখা। Radio বা checkbox-এর দল
হলে `<fieldset>` আর `<legend>` যোগ করুন, যাতে দলটারও নাম থাকে।

**Q: কখন semantic element ব্যবহার করবেন না?**

যখন সেটা এমন প্রতিশ্রুতি দেবে, যা content রাখে না। যেমন শুধু এক পাশে বসানো কিছুর জন্য `<aside>`, footer-এর তিনটি
link-এর জন্য `<nav>`, বা flex wrapper-এর জন্য `<section>`। প্রতিটিই এমন একটা landmark যোগ করে, যা পেরিয়ে screen
reader-এর user-কে যেতে হয়। ভুল landmark না থাকার চেয়েও খারাপ। এই একটা ক্ষেত্রেই `<div>` অলসের উত্তর নয়, ঠিক
উত্তর।

## এরপর কী পড়বেন

- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — এই markup থেকে browser কী বানায়, আর সেটা কীভাবে
  খুলে দেখবেন
- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — semantic HTML সত্যিই যে ফাঁকগুলো রেখে যায়, আর সেগুলো
  ভরানোর pattern
- [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) — validation, error message আর form-এর বাকি
  গল্প
