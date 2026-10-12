---
sourceHash: "bfce3a6148725780431f7c7e2ce76b6a69e3aaa792833f155d7cbc1b754fb4c2"
title: "Accessibility Tree"
translatedAt: "2026-10-12T07:53:28.063Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessibility Tree {#ch-accessibility-tree}

> আপনার markup থেকে browser যে tree বানায়, সেটা পড়তে শিখুন। তাহলে screen reader কী বলছে, তা অনুমান না করে debug করতে পারবেন।

**এই অধ্যায়ে:** tree কী · role, name, state, properties · একটি name কীভাবে compute হয় · কী একটি node সরিয়ে দেয় · navigation হিসেবে landmark আর heading · এটা inspect করা

## 💡 মূল ধারণা

Screen reader কখনো আপনার DOM পড়ে না। Browser DOM থেকে দ্বিতীয় একটি কাঠামো বানায়, **accessibility tree**।
Operating system সেই tree assistive technology-র কাছে expose করে। প্রতিটি node সর্বোচ্চ চারটি জিনিস বহন করে:
একটি **role** (এটা কী), একটি **name** (একে কী বলে ডাকা হবে), একটি **state** (এখন কী সত্য), আর **properties**
(কী স্থায়ীভাবে সত্য)।

প্রায় প্রতিটি accessibility bug হলো আপনি যা বোঝাতে চেয়েছিলেন আর ওই tree-তে যা পৌঁছেছে, তার মধ্যে অমিল। একটি
`<div onclick>` এমন একটি node তৈরি করে যার কোনো role নেই, কোনো name নেই, তাই announce করার কিছু নেই, focus করার
কিছু নেই। একটি icon button এমন node তৈরি করে যার role আছে কিন্তু name ফাঁকা। এটা "button" হিসেবে announce হয়, আর
user-কে অনুমান করতে হয়। কোনো bug-ই browser window-এ দেখা যায় না, অথচ tree-তে দুটোই স্পষ্ট।

> Screen reader কী "বলবে" তা নিয়ে যুক্তি দেওয়া বন্ধ করুন। Tree খুলুন আর node-টি পড়ুন। এটা একটি data
> structure, কোনো black box নয়।

## কীভাবে কাজ করে

Pipeline-টি ছোট, আর মাথায় রাখার মতো, কারণ প্রতিটি ধাপে তথ্য হারিয়ে যেতে পারে।

```text
HTML + ARIA + CSS  →  DOM  →  accessibility tree  →  platform API  →  screen reader
```

**Markup থেকে কথা পর্যন্ত pipeline। CSS-ও অংশ নেয় — `display: none` একটি node পুরোপুরি সরিয়ে দেয়।**

### একটি node যে চারটি জিনিস বহন করে

| অংশ | প্রশ্ন | কোথা থেকে আসে |
| --- | --- | --- |
| **Role** | এটা কী ধরনের জিনিস? | Element থেকে (`<button>` → `button`), অথবা একটি explicit `role` |
| **Name** | একে কী বলে? | Compute করা হয় — নিচে দেখুন |
| **State** | এই মুহূর্তে কী সত্য? | `checked`, `disabled`, `aria-expanded`, `aria-selected` |
| **Properties** | কী সবসময় সত্য? | `aria-describedby`, `aria-required`, `aria-haspopup`, level |

একটি native element চারটিই পূরণ করে। `<input type="checkbox" checked>`-এর role `checkbox`, state `checked`, আর
name আসে তার `<label>` থেকে। Click করলে এটা নিজের state-ও নিজেই update করে। সমতুল্য `div` এর কিছুই দেয় না, কখনো
দেবেও না, কারণ ARIA শুধু বর্ণনা করে, implement করে না। দেখুন
[Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)।

### Accessible name কীভাবে compute হয়

এর একটি আসল algorithm আছে, আর এর ক্রম জানলে name নিয়ে বেশিরভাগ তর্ক মিটে যায়। প্রথম যে source একটি ফাঁকা নয়
এমন string দেয়, সেটাই জেতে।

| ক্রম | Source | উদাহরণ |
| --- | --- | --- |
| 1 | `aria-labelledby` | অন্য কোথাও থাকা দৃশ্যমান text-এর দিকে নির্দেশ করে |
| 2 | `aria-label` | আপনার লেখা একটি string, screen-এ অদৃশ্য |
| 3 | Native labelling | `<label for>`, `alt`, `<caption>`, `<legend>`, `<figcaption>` |
| 4 | Element-এর নিজের text content | `<button>Save</button>` |
| 5 | `title` | শেষ ভরসা, আর দৃশ্যমান hint হিসেবে শুধু mouse-এ কাজ করে |

```html
<!-- ✅ Name comes from visible text, so it cannot drift out of sync with the UI. -->
<section aria-labelledby="settings-heading">
  <h2 id="settings-heading">Notification settings</h2>
</section>

<!-- ✅ A written name, because the visible content is an icon with no text. -->
<button type="button" aria-label="Close dialog">✕</button>

<!-- ❌ aria-label wins over the visible text, so the user sees "Save" and hears "Submit". -->
<button aria-label="Submit">Save</button>
```

শেষ ক্ষেত্রটি একটি আসল ব্যর্থতা, আর প্রায়ই ঘটে। একজন voice-control user বলেন "click Save", আর কিছুই হয় না, কারণ
tree-তে name হলো "Submit"। **যেখানে দৃশ্যমান text আছে, name সেখান থেকেই নিন।**

Description আলাদা জিনিস। `aria-describedby` এমন text যোগ করে, যা screen reader name-এর *পরে* announce করে। Hint আর
error message সেখানেই থাকে। দেখুন [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms)।

### কী একটি node-কে tree থেকে সরিয়ে দেয়

চারটি পদ্ধতি, আর এদের পার্থক্যগুলো গুরুত্বপূর্ণ।

| কৌশল | দৃশ্যমান? | Tree-তে আছে? | Focus করা যায়? |
| --- | --- | --- | --- |
| `display: none` / `visibility: hidden` | না | না | না |
| `hidden` attribute | না | না | না |
| `aria-hidden="true"` | **হ্যাঁ** | না | **হ্যাঁ** — এটাই ফাঁদ |
| `inert` attribute | হ্যাঁ | হ্যাঁ, কিন্তু interactive নয় | না |
| Visually-hidden utility class | না | **হ্যাঁ** | হ্যাঁ |

Focus করা যায় এমন কিছুতে `aria-hidden` দিলে এমন একটি control তৈরি হয়, যেখানে keyboard পৌঁছাতে পারে কিন্তু screen
reader বর্ণনা করতে পারে না। User tab করে কিছুতে যান, আর কিছুই শোনেন না। সাময়িকভাবে অনুপলব্ধ পুরো একটি অংশের
জন্য `inert` ব্যবহার করুন, যেমন একটি modal-এর পেছনের page। এটা interactivity আর focusability একসঙ্গে সরিয়ে দেয়।

```css
/* Present to assistive technology, absent from the screen. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

ওই class শুধু icon-ওয়ালা একটি control-কে এমন name দেয়, যা voice control-এও কাজ করে। আবার একটি table-কে সেই
caption দেয়, যা designer দিতে রাজি হননি। `display: none` এই কাজ করতে পারে না।

### Landmark আর heading-ই navigation

Screen reader user-রা scroll করেন না। তারা landmark (যেমন `main` বা `navigation`-এর মতো একটি অংশ), heading, link বা
form control ধরে লাফিয়ে যান। তাই document-এর কাঠামোই মূল navigation, সাজসজ্জা নয়।

| Element | Landmark role | মন্তব্য |
| --- | --- | --- |
| `<header>` | `banner` | শুধু যখন `<body>`-এর সরাসরি child |
| `<nav>` | `navigation` | একাধিক থাকলে প্রতিটিকে label দিন |
| `<main>` | `main` | ঠিক একটি, আর skip-link-এর target |
| `<aside>` | `complementary` | |
| `<footer>` | `contentinfo` | শুধু যখন `<body>`-এর সরাসরি child |
| `<section>` | `region` | **শুধু যদি এর accessible name থাকে** |

খালি একটি `<section>` কোনো landmark-ই তৈরি করে না। তাই ওপরের `aria-labelledby` pattern-টিই navigate করা যায়
এমন page আর সমতল page-এর মধ্যে পার্থক্য গড়ে দেয়। Heading-ও একইভাবে কাজ করে: এরা একটি outline বানায়, যার ভেতর
দিয়ে user এগোন। **`h1` থেকে `h4`-এ লাফ দিলে navigation ভেঙে যায়**, যদিও দেখতে হুবহু একই লাগে।
এসবের পেছনের element-এর তালিকা আছে [Chapter ?? — Semantic HTML](#ch-semantic-html)-এ।

### এটা inspect করা

এই অংশই accessibility-কে মতামত থেকে debugging-এ পরিণত করে।

| Tool | কী দেখায় |
| --- | --- |
| Chrome DevTools → Elements → **Accessibility** pane | Compute করা role, name, state, আর পুরো tree |
| Firefox DevTools → **Accessibility** panel | একই জিনিস, সঙ্গে প্রতিটি node-এর জন্য একটি "check for issues" audit |
| macOS **Accessibility Inspector** (Xcode) | Platform API যা expose করে, VoiceOver-এর দৃষ্টিভঙ্গিসহ |
| DevTools console-এ `getComputedAccessibleName()` | একটি element-এর compute করা name, দ্রুত |

একটিও ARIA attribute লেখার আগে এটা করুন। একটি সাধারণ codebase-এর প্রায় অর্ধেক ARIA এমন সমস্যা ঠিক করতে যোগ
করা হয়েছে, যা লেখক আসলে কখনো inspect করেননি।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | কেন |
| --- | --- | --- |
| "Screen reader ভুল কথা বলছে" | Accessibility pane | Name compute করা হয়; computation-টি পড়ুন |
| শুধু icon-ওয়ালা একটি control | `aria-label`, বা visually-hidden text | Name ছাড়া role শুধু তার ধরনটাই announce করে |
| এমন একটি নাম-দেওয়া অংশ, যেখানে user-রা লাফিয়ে যাবেন | `<section aria-labelledby>` | নামহীন section landmark নয় |
| সাজসজ্জার image বা পুনরাবৃত্ত icon | `alt=""`, বা focus করা যায় না এমন node-এ `aria-hidden` | Tree থেকে একটি অর্থহীন node সরিয়ে দেয় |
| খোলা modal-এর পেছনের অংশ | `inert` | একটি attribute-এই interaction আর focus সরিয়ে দেয় |

## সাধারণ ভুল

**❌ Focus করা যায় এমন element-এ `aria-hidden`**

```html
<!-- Tab still lands here; the screen reader has nothing to announce. -->
<button aria-hidden="true">Next</button>
```

**✅ হয় দুটো tree থেকেই সরান, নয়তো কোনোটা থেকেই না**

```html
<button hidden>Next</button>
```

**❌ দৃশ্যমান text-এর সঙ্গে মেলে না এমন `aria-label`**

> Tree-ই জেতে। Voice control কাজ করা বন্ধ করে, আর announcement আর screen-এর সঙ্গে মেলে না। তার বদলে
> `aria-labelledby` দিয়ে দৃশ্যমান text থেকে name নিন।

**❌ `title`-কে name হিসেবে ব্যবহার করা**

> এটা সবচেয়ে কম অগ্রাধিকারের source। Touch বা keyboard focus-এ এটা দেখা যায় না, আর screen reader-এ এর support
> একেক জায়গায় একেক রকম। এটা একটি hint, কখনো name নয়।

**❌ Design-এর সঙ্গে মেলাতে heading level বেছে নেওয়া**

> Heading level হলো সেই outline, যা ধরে user-রা navigate করেন। কাঠামো অনুযায়ী level বাছুন, আর আকারের জন্য CSS
> ব্যবহার করুন। `<h2 class="text-sm">` সঠিক; দেখার কারণে `<h4>` নয়।

## 🔑 মূল শিক্ষা

- Assistive technology DOM নয়, accessibility tree পড়ে, আর প্রতিটি node একটি role, একটি name, একটি state আর properties বহন করে।
- Accessible name একটি নির্দিষ্ট ক্রমে compute হয়: `aria-labelledby`, তারপর `aria-label`, তারপর native labelling, তারপর text content, তারপর `title`।
- যেখানে দৃশ্যমান text আছে, name সেখান থেকেই নিন। Screen-এর সঙ্গে না মেলা একটি `aria-label` voice control ভেঙে দেয়।
- `aria-hidden` একটি node-কে tree থেকে লুকায়, কিন্তু focus করার সুযোগ রেখে দেয়। Keyboard user-কে আটকে ফেলার এটাই সবচেয়ে সাধারণ উপায়।
- Landmark আর heading level হলো navigation, তাই নামহীন একটি `<section>` আর বাদ পড়া একটি heading — দুটোই user-দের page-এর ভেতর দিয়ে একটি পথ কেড়ে নেয়।

## Interview-এর প্রশ্ন

**Q: Accessibility tree কী, আর একজন specialist-এর চেয়ে আপনার কাছে এটা কেন গুরুত্বপূর্ণ?**

এটা সেই কাঠামো, যা browser DOM থেকে বানায় আর platform API-র মাধ্যমে assistive technology-র কাছে expose করে।
প্রতিটি অর্থবহ element-এর জন্য এতে একটি node থাকে, আর প্রতিটি node একটি role, name, state আর properties বহন করে।
এটা গুরুত্বপূর্ণ, কারণ আমি এটা inspect করতে পারি। Screen reader কী বলবে তা অনুমান না করে আমি Accessibility pane
খুলি আর compute করা node-টি পড়ি। বেশিরভাগ ত্রুটি সেখানে একটি অনুপস্থিত role বা ফাঁকা name হিসেবে দেখা যায়,
আর কোনোটাই screen-এ দেখা যায় না।

**Q: একটি accessible name কীভাবে compute হয়?**

অগ্রাধিকারের ক্রমে: `aria-labelledby`, `aria-label`, `<label for>` বা `alt`-এর মতো native labelling, তারপর element-এর
নিজের text content, তারপর শেষ ভরসা হিসেবে `title`। বাস্তব নিয়ম হলো দৃশ্যমান text-এর দিকে নির্দেশ করা
`aria-labelledby`-কে অগ্রাধিকার দেওয়া। লেখা একটি `aria-label` user যা দেখেন তাকে override করে। দুটো না মিললে এটা
voice control ভেঙে দেয়, আর কেউ button-এর text বদলানোর সঙ্গে সঙ্গেই এটা সরে যায়।

**Q: `hidden`, `aria-hidden` আর `inert`-এর মধ্যে পার্থক্য কী?**

`hidden` আর `display: none` element-টিকে screen আর tree দুটো থেকেই সরিয়ে দেয়, তাই এটা দৃশ্যমানও নয়, focus-ও
করা যায় না। `aria-hidden="true"` এটাকে শুধু tree থেকে সরায়। এটা দৃশ্যমান থাকে, focus-ও করা যায়। একটি button-এ এটা
keyboard user-দের এমন একটি control-এ আটকে ফেলে, যার announce করার কিছু নেই। `inert` element-টিকে tree-তে রাখে,
কিন্তু interactive নয় আর focus করা যায় না এমন করে দেয়। খোলা modal-এর পেছনের page-এর জন্য ঠিক এটাই চাই।

**Q: একটি `<section>` landmark হিসেবে দেখা যাচ্ছে না। কেন?**

কারণ `<section>` শুধু তখনই `region` role-এ map হয়, যখন এর একটি accessible name থাকে। এর heading-এর দিকে নির্দেশ
করা `aria-labelledby` যোগ করলে name পাওয়া যায়। একই pattern landmark-এর label আর দৃশ্যমান heading-কে মিলিয়ে রাখে।
একাধিক `<nav>` থাকলে সেগুলোর ক্ষেত্রেও একই কথা। Label ছাড়া user তিনবার "navigation" শোনেন, আর আলাদা করতে
পারেন না।

**Q: কখন screen reader থেকে কিছু লুকানো ঠিক?**

যখন এটা সত্যিই পুনরাবৃত্ত বা সাজসজ্জার জন্য। সাজসজ্জার একটি image পায় `alt=""`। নিজের text label-এর পাশে থাকা
একটি icon পায় `aria-hidden`, যাতে screen reader এটা দুবার announce না করে। Screen-এর বাইরে থাকা carousel slide
একসঙ্গে tree ছাড়ে আর focus করার সুযোগও হারায়। User যেখানে এখনো keyboard দিয়ে পৌঁছাতে পারেন, এমন কিছু লুকানো
কখনো ঠিক নয়। আসল content-এর announcement অসুবিধাজনক বলে সেটা লুকানোও ঠিক নয়।

## এরপর কী পড়বেন

- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — কোনো element আপনার দরকারি role তৈরি না করলে কী করবেন
- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — এই tree-র একটি node-এর যা দরকার, তার বাকি অর্ধেক
- [Chapter ?? — Semantic HTML](#ch-semantic-html) — যে element-গুলো বিনা খরচে tree পূরণ করে
