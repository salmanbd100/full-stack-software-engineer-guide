---
sourceHash: "bfce3a6148725780431f7c7e2ce76b6a69e3aaa792833f155d7cbc1b754fb4c2"
title: "Accessibility Tree"
translatedAt: "2026-10-17T01:02:06.420Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessibility Tree {#ch-accessibility-tree}

> আপনার markup থেকে browser যে tree বানায়, সেটা পড়তে শিখুন। তাহলে screen reader কী বলছে, তা আন্দাজ না করে debug করতে পারবেন।

**এই অধ্যায়ে:** tree-টা কী · role, name, state, property · নাম কীভাবে হিসাব হয় · কী একটি node সরিয়ে দেয় · navigation হিসেবে landmark আর heading · tree-টা খুলে দেখা

## 💡 মূল ধারণা

Screen reader কখনো আপনার DOM পড়ে না। DOM থেকে browser দ্বিতীয় একটি কাঠামো বানায়, যার নাম **accessibility tree**।
Operating system সেই tree assistive technology-র হাতে তুলে দেয়। প্রতিটি node-এ থাকে বড়জোর চারটি জিনিস: **role** (এটা কী),
**name** (একে কী বলে ডাকা হবে), **state** (এই মুহূর্তে কী সত্যি), আর **property** (যা সবসময় সত্যি)।

Accessibility-র প্রায় সব bug আসলে একটিই জিনিস: আপনি যা বোঝাতে চেয়েছিলেন আর tree-তে যা গিয়ে বসেছে, তার অমিল। একটি
`<div onclick>` থেকে যে node তৈরি হয়, তার role নেই, নামও নেই। তাই announce করার কিছু নেই, focus করারও কিছু নেই। একটি
icon button থেকে তৈরি node-এর role আছে, কিন্তু নাম ফাঁকা। সেটা শুধু "button" বলে announce হয়, আর user-কে আন্দাজ করতে হয়
এটা কিসের button। Browser window-তে দুটি bug-এর কোনোটাই দেখা যায় না, অথচ tree-তে দুটিই স্পষ্ট।

> Screen reader "কী বলবে", তা নিয়ে যুক্তি সাজানো বন্ধ করুন। Tree খুলে node-টা পড়ুন। এটা একটি data structure, কোনো
> রহস্যময় বাক্স নয়।

## কীভাবে কাজ করে

Pipeline-টা ছোট, আর মাথায় রাখার মতো, কারণ প্রতিটি ধাপেই কিছু তথ্য হারিয়ে যেতে পারে।

```text
HTML + ARIA + CSS  →  DOM  →  accessibility tree  →  platform API  →  screen reader
```

**Markup থেকে কথা পর্যন্ত pipeline। CSS-ও এতে অংশ নেয় — `display: none` একটি node পুরোপুরি সরিয়ে দেয়।**

### একটি node যে চারটি জিনিস বহন করে

| অংশ | প্রশ্ন | কোথা থেকে আসে |
| --- | --- | --- |
| **Role** | এটা কী ধরনের জিনিস? | Element থেকে (`<button>` → `button`), অথবা স্পষ্ট করে দেওয়া `role` |
| **Name** | এর নাম কী? | হিসাব করে বের হয় — নিচে দেখুন |
| **State** | এই মুহূর্তে কী সত্যি? | `checked`, `disabled`, `aria-expanded`, `aria-selected` |
| **Property** | সবসময় কী সত্যি? | `aria-describedby`, `aria-required`, `aria-haspopup`, level |

Native element চারটিই নিজে থেকে ভরে দেয়। `<input type="checkbox" checked>` হলো role `checkbox`, state `checked`, আর নাম
আসে তার `<label>` থেকে। Click করলে নিজের state-ও নিজেই update করে। একই কাজের জন্য বানানো `div` এর কিছুই দেয় না, কখনো দেবেও
না, কারণ ARIA শুধু বর্ণনা করে, কাজটা করে দেয় না। দেখুন [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)।

### Accessible name কীভাবে হিসাব হয়

এর জন্য সত্যিই একটি algorithm আছে, আর তার ক্রম জানা থাকলে নাম নিয়ে বেশিরভাগ তর্ক মিটে যায়। যে উৎস প্রথম একটি ফাঁকা নয়
এমন string দেয়, সেটাই জেতে।

| ক্রম | উৎস | উদাহরণ |
| --- | --- | --- |
| 1 | `aria-labelledby` | অন্য কোথাও থাকা দৃশ্যমান লেখার দিকে ইঙ্গিত করে |
| 2 | `aria-label` | আপনার লেখা একটি string, screen-এ দেখা যায় না |
| 3 | Native labelling | `<label for>`, `alt`, `<caption>`, `<legend>`, `<figcaption>` |
| 4 | Element-এর নিজের লেখা | `<button>Save</button>` |
| 5 | `title` | শেষ ভরসা, আর দৃশ্যমান hint হিসেবে শুধু mouse-এ দেখা যায় |

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

শেষ ক্ষেত্রটা সত্যিকারের ব্যর্থতা, আর প্রায়ই ঘটে। Voice control ব্যবহার করা একজন user বলেন "click Save", আর কিছুই হয় না,
কারণ tree-তে নাম হলো "Submit"। **দৃশ্যমান লেখা থাকলে নাম সেখান থেকেই নিন।**

Description আলাদা জিনিস। `aria-describedby` এমন লেখা যোগ করে, যা screen reader নামের *পরে* announce করে। Hint আর error
message সেখানেই যায়। দেখুন [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms)।

### কী একটি node-কে tree থেকে সরিয়ে দেয়

উপায় চারটি, আর তাদের পার্থক্যগুলো গুরুত্বপূর্ণ।

| কৌশল | দেখা যায়? | Tree-তে আছে? | Focus করা যায়? |
| --- | --- | --- | --- |
| `display: none` / `visibility: hidden` | না | না | না |
| `hidden` attribute | না | না | না |
| `aria-hidden="true"` | **হ্যাঁ** | না | **হ্যাঁ** — ফাঁদটা এখানেই |
| `inert` attribute | হ্যাঁ | হ্যাঁ, তবে interactive নয় | না |
| Visually-hidden utility class | না | **হ্যাঁ** | হ্যাঁ |

Focus করা যায় এমন কিছুতে `aria-hidden` দিলে এমন একটি control তৈরি হয়, যেখানে keyboard পৌঁছাতে পারে কিন্তু screen reader
বর্ণনা করতে পারে না। User tab চেপে কোথাও পৌঁছান, আর কিছুই শোনেন না। পুরো একটি অংশ সাময়িকভাবে বন্ধ রাখতে, যেমন modal-এর
পেছনের page, `inert` ব্যবহার করুন। এটা interaction আর focus একসঙ্গে সরিয়ে দেয়।

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

এই class দিয়ে শুধু icon-ওয়ালা control এমন একটি নাম পায়, যা voice control-এও কাজ করে। আবার যে caption designer রাখতে
দেননি, table সেটাও পায়। `display: none` দিয়ে এই কাজ হয় না।

### Landmark আর heading-ই navigation

Screen reader user-রা scroll করেন না। তাঁরা লাফ দেন landmark ধরে (`main` বা `navigation`-এর মতো কোনো অংশ), heading ধরে,
link ধরে, বা form control ধরে। তাই document-এর কাঠামোই আসল navigation, সাজসজ্জা নয়।

| Element | Landmark role | মন্তব্য |
| --- | --- | --- |
| `<header>` | `banner` | শুধু তখনই, যখন এটা `<body>`-র সরাসরি child |
| `<nav>` | `navigation` | একাধিক থাকলে প্রতিটির label দিন |
| `<main>` | `main` | ঠিক একটি, আর skip link এখানেই নিয়ে যায় |
| `<aside>` | `complementary` | |
| `<footer>` | `contentinfo` | শুধু তখনই, যখন এটা `<body>`-র সরাসরি child |
| `<section>` | `region` | **শুধু যদি এর accessible name থাকে** |

নাম ছাড়া `<section>` থেকে কোনো landmark-ই তৈরি হয় না। তাই ওপরের `aria-labelledby` pattern-টাই ঠিক করে page-টা navigate
করা যাবে, নাকি সমতল একটি page হয়ে থাকবে। Heading-ও একইভাবে কাজ করে: এরা একটি outline বানায়, যার ভেতর দিয়ে user এগোন।
**`h1` থেকে লাফিয়ে `h4`-এ গেলে navigation ভেঙে যায়**, যদিও দেখতে হুবহু একই লাগে। এসবের পেছনের element-এর তালিকা আছে
[Chapter ?? — Semantic HTML](#ch-semantic-html)-এ।

### Tree-টা খুলে দেখা

এই অংশটাই accessibility-কে মতামত থেকে debugging-এ নিয়ে আসে।

| Tool | কী দেখায় |
| --- | --- |
| Chrome DevTools → Elements → **Accessibility** pane | হিসাব করা role, name, state, আর পুরো tree |
| Firefox DevTools → **Accessibility** panel | একই জিনিস, সঙ্গে প্রতিটি node-এর জন্য "check for issues" audit |
| macOS **Accessibility Inspector** (Xcode) | Platform API যা দেখায়, VoiceOver-এর চোখে দেখাসহ |
| DevTools console-এ `getComputedAccessibleName()` | একটি element-এর হিসাব করা নাম, দ্রুত |

একটিও ARIA attribute লেখার আগে এটা করুন। সাধারণ একটি codebase-এর প্রায় অর্ধেক ARIA যোগ করা হয়েছে এমন সমস্যা ঠিক করতে,
যা লেখক আসলে কখনো খুলে দেখেননি।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | কেন |
| --- | --- | --- |
| "Screen reader ভুল কথা বলছে" | Accessibility pane | নাম হিসাব করে বের হয়; হিসাবটা পড়ুন |
| শুধু icon-ওয়ালা control | `aria-label`, বা visually-hidden লেখা | নাম ছাড়া role শুধু তার ধরন বলে announce হয় |
| নাম দেওয়া একটি অংশ, যেখানে user লাফ দিয়ে যাবেন | `<section aria-labelledby>` | নাম ছাড়া section landmark নয় |
| সাজসজ্জার image বা দুবার আসা icon | `alt=""`, অথবা focus করা যায় না এমন node-এ `aria-hidden` | অর্থহীন একটি node tree থেকে সরে যায় |
| খোলা modal-এর পেছনের অংশ | `inert` | একটিই attribute-এ interaction আর focus দুটিই সরে যায় |

## সাধারণ ভুল

**❌ Focus করা যায় এমন element-এ `aria-hidden`**

```html
<!-- Tab still lands here; the screen reader has nothing to announce. -->
<button aria-hidden="true">Next</button>
```

**✅ দুটি tree থেকেই সরান, নয়তো কোনোটা থেকেই নয়**

```html
<button hidden>Next</button>
```

**❌ দৃশ্যমান লেখার সঙ্গে না মেলা `aria-label`**

> জেতে tree। Voice control কাজ করা বন্ধ করে, আর announcement-এর সঙ্গে screen-এর আর মিল থাকে না। তার বদলে
> `aria-labelledby` দিয়ে দৃশ্যমান লেখা থেকে নাম নিন।

**❌ `title`-কে নাম হিসেবে ব্যবহার করা**

> এটা সবচেয়ে কম অগ্রাধিকারের উৎস। Touch বা keyboard focus-এ এটা দেখা যায় না, আর screen reader-এ এর support একেক জায়গায়
> একেক রকম। এটা একটি hint, কখনোই নাম নয়।

**❌ Design-এ মানানোর জন্য heading level বদলানো**

> Heading level হলো সেই outline, যার ভেতর দিয়ে user এগোন। Level বাছুন কাঠামো দেখে, আর আকারের জন্য CSS ব্যবহার করুন।
> `<h2 class="text-sm">` ঠিক; দেখতে ভালো লাগবে বলে `<h4>` দেওয়া ঠিক নয়।

## 🔑 মূল শিক্ষা

- Assistive technology DOM নয়, accessibility tree পড়ে, আর প্রতিটি node বহন করে একটি role, একটি name, একটি state আর property।
- Accessible name একটি নির্দিষ্ট ক্রমে হিসাব হয়: `aria-labelledby`, তারপর `aria-label`, তারপর native labelling, তারপর লেখা, তারপর `title`।
- দৃশ্যমান লেখা থাকলে নাম সেখান থেকেই নিন। Screen-এর সঙ্গে না মেলা `aria-label` voice control ভেঙে দেয়।
- `aria-hidden` একটি node-কে tree থেকে লুকায়, কিন্তু focus করার সুযোগ রেখে দেয়। Keyboard user-কে আটকে ফেলার সবচেয়ে সাধারণ উপায় এটাই।
- Landmark আর heading level-ই navigation। তাই নাম ছাড়া `<section>` আর বাদ পড়া heading, দুটিই user-এর page-এর ভেতর দিয়ে যাওয়ার একটি পথ কেড়ে নেয়।

## Interview-এর প্রশ্ন

**Q: Accessibility tree কী, আর এটা কোনো বিশেষজ্ঞের নয়, আপনার কাছে কেন গুরুত্বপূর্ণ?**

এটা সেই কাঠামো, যা browser DOM থেকে বানায় আর platform API দিয়ে assistive technology-র হাতে দেয়। অর্থপূর্ণ প্রতিটি element-এর
জন্য একটি node, আর প্রতিটি node বহন করে role, name, state আর property। গুরুত্বপূর্ণ, কারণ আমি এটা খুলে দেখতে পারি। Screen
reader কী বলবে তা আন্দাজ না করে Accessibility pane খুলি আর হিসাব করা node-টা পড়ি। বেশিরভাগ defect সেখানে ধরা পড়ে হয় role
নেই, নয়তো নাম ফাঁকা হিসেবে, আর এর কোনোটাই screen-এ দেখা যায় না।

**Q: Accessible name কীভাবে হিসাব হয়?**

অগ্রাধিকারের ক্রমে: `aria-labelledby`, `aria-label`, `<label for>` বা `alt`-এর মতো native labelling, তারপর element-এর
নিজের লেখা, আর শেষ ভরসা হিসেবে `title`। বাস্তবের নিয়ম হলো, দৃশ্যমান লেখার দিকে ইঙ্গিত করা `aria-labelledby`-কে প্রাধান্য
দেওয়া। হাতে লেখা `aria-label` user যা দেখছেন, তার ওপর দিয়ে চলে যায়। দুটি না মিললে voice control ভাঙে, আর কেউ button-এর
লেখা বদলালেই দুটির মিল সরে যায়।

**Q: `hidden`, `aria-hidden` আর `inert`-এর পার্থক্য কী?**

`hidden` আর `display: none` element-কে screen আর tree দুই জায়গা থেকেই সরিয়ে দেয়, তাই সেটা দেখাও যায় না, focus-ও করা যায়
না। `aria-hidden="true"` শুধু tree থেকে সরায়। Element দেখা যায়, focus-ও করা যায়। Button-এ দিলে keyboard user এমন একটি
control-এ আটকে যান, যার announce করার কিছু নেই। `inert` element-কে tree-তে রাখে, কিন্তু interactive থাকে না, focus-ও করা
যায় না। খোলা modal-এর পেছনের page-এর জন্য ঠিক এটাই চাই।

**Q: একটি `<section>` landmark হিসেবে দেখা যাচ্ছে না। কেন?**

কারণ `<section>` শুধু তখনই `region` role পায়, যখন তার accessible name থাকে। তার heading-এর দিকে ইঙ্গিত করা
`aria-labelledby` যোগ করলে নাম পাওয়া যায়। একই pattern landmark-এর label আর দৃশ্যমান heading-কে মিলিয়েও রাখে। একাধিক
`<nav>` থাকলেও একই কথা। Label না থাকলে user তিনবার "navigation" শোনেন, আর কোনটা কোনটা আলাদা করতে পারেন না।

**Q: কখন screen reader থেকে কিছু লুকানো ঠিক?**

যখন সেটা সত্যিই বাড়তি বা শুধু সাজসজ্জা। সাজসজ্জার image পায় `alt=""`। নিজের লেখা label-এর পাশে বসা icon পায় `aria-hidden`,
যাতে screen reader দুবার না বলে। Screen-এর বাইরে থাকা carousel slide tree থেকেও সরে, focus-ও হারায়, একসঙ্গে। কিন্তু user
keyboard দিয়ে যেখানে এখনো পৌঁছাতে পারেন, তা লুকানো কখনো ঠিক নয়। আবার announcement অসুবিধাজনক বলে আসল content লুকানোও
ঠিক নয়।

## এরপর কী পড়বেন

- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — যে role দরকার, কোনো element তা না দিলে কী করবেন
- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — এই tree-র একটি node-এর বাকি যা লাগে
- [Chapter ?? — Semantic HTML](#ch-semantic-html) — যে element-গুলো বিনা খরচে tree ভরে দেয়
