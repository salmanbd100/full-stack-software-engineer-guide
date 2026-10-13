---
sourceHash: "d579d06cc2e10596978224b2b470a5d75ca3fb10012d4566df2d829355939091"
title: "ARIA, আর কখন এটা ব্যবহার করবেন না"
translatedAt: "2026-10-12T12:11:10.255Z"
model: "claude-opus-5-5 (Claude Code)"
---

# ARIA, আর কখন এটা ব্যবহার করবেন না {#ch-aria}

> ARIA শুধু সেখানেই ব্যবহার করুন, যেখানে কাজটার জন্য HTML-এ কোনো element নেই। আর কোনো attribute-কে এমন behaviour-এর প্রতিশ্রুতি দিতে দেবেন না, যেটা আপনি implement করেননি।

**এই অধ্যায়ে:** পাঁচটি নিয়ম · role, state আর property · ARIA যা পারে না · live region · যে pattern-গুলো শেখার মতো · যে অপব্যবহার পরিস্থিতি আরও খারাপ করে

## 💡 মূল ধারণা

ARIA (Accessible Rich Internet Applications) হলো একটি শব্দভান্ডার, যা দিয়ে assistive technology-কে এমন জিনিস জানানো
যায়, যেটা HTML প্রকাশ করতে পারে না। এটা কোনো polyfill নয়, কোনো feature-ও নয়। **এটা শুধু বদলায় কী report করা হবে, আর
কিছুই নয়।** এটা কোনো focus behaviour, keyboard handling, state management বা styling যোগ করে না।

এই একটি তথ্যই production-এর প্রায় প্রতিটি ARIA bug ব্যাখ্যা করে। যে menu expand হয় না, তার ওপর
`aria-expanded="true"` একটি মিথ্যা, আর screen reader সেটা বিশ্বস্তভাবে বারবার বলে। একটি `div`-এ `role="button"` দিলে
এমন একটি element পাওয়া যায়, যেটাকে button হিসেবে ঘোষণা করা হয়। তবু সেটা Enter আর Space উপেক্ষা করে, আর সেটায় focus
করা যায় না। দুই ক্ষেত্রেই attribute-টি কোনো attribute না থাকার চেয়েও পরিস্থিতি খারাপ করেছে। এটা "এটা অস্পষ্ট"-কে বদলে
দিয়েছে "এটা ভুল" দিয়ে।

> খারাপ ARIA-র চেয়ে কোনো ARIA না থাকা ভালো। WebAIM Million audit দেখায়, যে page-গুলো ARIA ব্যবহার করে, সেগুলোতে গড়ে
> ARIA ছাড়া page-এর চেয়ে *বেশি* ধরা পড়ার মতো failure থাকে। Team-গুলো আগে ARIA-র দিকে হাত বাড়ায়, বোঝে পরে।

## কীভাবে কাজ করে

### পাঁচটি নিয়ম, যে ক্রমে আসলে ভাঙা হয়

W3C ARIA ব্যবহারের পাঁচটি নিয়ম প্রকাশ করে। এগুলো এই ক্রমে শিখুন, কারণ team-গুলো ঠিক এই হারেই এগুলো ভাঙে।

| # | নিয়ম | Review-এ এর মানে কী |
| --- | --- | --- |
| 1 | **বরং একটি native element ব্যবহার করুন** | HTML-এ যদি সেই role আর behaviour-সহ কোনো element থাকে, সেটাই ব্যবহার করুন |
| 2 | **Native semantics বদলাবেন না** | `<h2 role="tab">` ভুল; বরং wrap বা nest করুন |
| 3 | **প্রতিটি ARIA control keyboard দিয়ে চালানো যেতে হবে** | Interactive role-যুক্ত যেকোনো কিছুর `tabindex` আর key handler লাগে |
| 4 | **কোনো focusable element-কে কখনো `aria-hidden` করবেন না** | এতে এমন একটি control তৈরি হয়, যেটা ঘোষণা করা যায় না |
| 5 | **প্রতিটি interactive element-এর একটি accessible name লাগে** | নাম ছাড়া role শুধু তার ধরন হিসেবে ঘোষিত হয় |

নিয়ম 1 বাদ দেওয়ার নিয়ম, আর বেশিরভাগ মূল্য এখানেই। একটি `<button>` সঙ্গে নিয়ে আসে একটি role, focus, একটি disabled
state, Enter আর Space handling, আর form-submit-এর behaviour। একটি `div`-এ এটা নকল করতে আপনার লাগবে একটি ARIA role,
একটি `tabindex`, দুটি key handler, একটি `aria-disabled` আর একটি pointer-events rule। তবু কিছু না কিছু বাদ পড়বে।

```html
<!-- ❌ Five lines of JavaScript away from being a button, and never quite one. -->
<div class="btn" onclick="save()">Save</div>

<!-- ✅ Role, focusability, keyboard activation and disabled state, free. -->
<button type="button" onclick="save()">Save</button>
```

### Role, state আর property

| ধরন | যে প্রশ্নের উত্তর দেয় | উদাহরণ | Runtime-এ বদলায়? |
| --- | --- | --- | --- |
| **Role** | এই জিনিসটা কী? | `dialog`, `tab`, `listbox`, `alert` | প্রায় কখনো না |
| **State** | এই মুহূর্তে কী সত্য? | `aria-expanded`, `aria-checked`, `aria-selected`, `aria-invalid` | হ্যাঁ — আপনাকেই update করতে হবে |
| **Property** | কী সবসময় সত্য? | `aria-label`, `aria-describedby`, `aria-controls`, `aria-required` | কদাচিৎ |

পার্থক্যটা ব্যবহারিক: **state হলো সেগুলো, যেগুলো আপনার নিজের code-এর সঙ্গে sync-এ রাখতে হয়।** Render-এর সময় একবার
set করে আর কখনো update না করা একটি state attribute, একটি stale cache-এর মতোই ত্রুটি। Component library-গুলোতে এটাই
সবচেয়ে সাধারণ ARIA bug।

```typescript
// The pattern that keeps a state honest: derive it, never assign it once.
function renderDisclosure(isOpen: boolean): string {
  return `
    <button type="button" aria-expanded="${isOpen}" aria-controls="panel">Details</button>
    <div id="panel" ${isOpen ? '' : 'hidden'}></div>
  `;
}
```

একটি framework-এ এটা বিনা খরচে মেলে, কারণ attribute-টি সেই একই state-এ bind করা থাকে, যেটা panel render করে। হাতে লেখা
DOM code-এ দুটি আলাদা হয়ে যায়।

### ARIA যা পারে না

| মানুষ যা আশা করে | বাস্তবতা |
| --- | --- |
| `role="button"` এটাকে keyboard দিয়ে clickable করে | না — `tabindex="0"` আর Enter/Space handler নিজেকেই যোগ করতে হবে |
| `aria-disabled` interaction আটকায় | না — এটা disabled ঘোষণা করে; handler-ও আপনাকে আটকাতে হবে |
| `aria-required` একটি value বাধ্যতামূলক করে | না — এটা required ঘোষণা করে; validation এখনো আপনার দায়িত্ব |
| `role="dialog"` focus আটকে রাখে | না — focus management পুরোটাই আপনার, অথবা `<dialog>` ব্যবহার করুন |
| একটি `div`-এ `aria-label` দিলে সেটা control হয়ে যায় | না — role ছাড়া একটি নাম কোনো কিছু হিসেবেই ঘোষিত হয় না |

`aria-disabled` একটু কাছ থেকে দেখার মতো, কারণ এটা একটি ভালো কারণেই আছে। Browser একটি native `disabled` button-কে tab
order থেকে সরিয়ে দেয়। তখন একজন keyboard user সেখানে পৌঁছে জানতে পারেন না, কেন এটা পাওয়া যাচ্ছে না।
`aria-disabled="true"`, সঙ্গে আগেভাগে return করা একটি handler, button-টিকে focusable রাখে, যাতে এটা নিজের অবস্থা
ব্যাখ্যা করতে পারে। এটা একটি ইচ্ছাকৃত trade-off, কোনো workaround নয়।

### Live region — focus না সরিয়ে ঘোষণা করা

কিছু জিনিস user কিছু না করলেও বদলায়: একটি save শেষ হয়, একটি filter 12টি result ফেরত দেয়, একটি token expire হয়।
একটি **live region** focus যেখানে আছে সেখানেই রেখে পরিবর্তনটা ঘোষণা করে।

```html
<!-- role="status" implies aria-live="polite". Waits for a pause in speech. -->
<div role="status" id="save-status"></div>

<!-- role="alert" implies aria-live="assertive". Interrupts. Errors only. -->
<div role="alert" id="form-errors"></div>
```

তিনটি নিয়ম এগুলোকে কাজ করায়, আর তিনটিই প্রায়ই বাদ পড়ে।

- **লেখা বদলানোর আগেই region-টি tree-তে থাকতে হবে।** একই tick-এ element আর তার content তৈরি করলে সাধারণত কিছুই
  ঘোষিত হয় না। Assistive technology এমন একটি region-এর ভেতরে mutation খোঁজে, যেটা সে আগে থেকেই চেনে।
- **Default হিসেবে polite।** `assertive` যা পড়া হচ্ছে, তাতে বাধা দেয়। একটি submission error-এর জন্য এটা ঠিক, আর
  "basket-এ 3টি item"-এর জন্য ভুল।
- **এটা খালি করুন, নইলে একই message নীরব থাকে।** একই string দুবার লেখা কোনো mutation নয়। Region-টি reset করুন,
  তারপর লিখুন।

> ⚠️ একটি high-frequency stream-এর সঙ্গে live region জুড়বেন না। Token ধরে ধরে আসা একটি AI response বা একটি live price
> feed `aria-live`-এ পাঠালে user এমন একটানা কথা শুনতে থাকেন, যেটা থেকে বের হওয়া যায় না। অগ্রগতি নয়, সমাপ্তি ঘোষণা করুন।

### যে pattern-গুলো শেখার মতো

যেখানে ARIA সত্যিই তার জায়গা অর্জন করে, সেখানে কেউ আগেই keyboard contract ঠিক করে দিয়েছেন। **ARIA Authoring
Practices Guide** (APG) প্রতিটি pattern-এর role, state আর প্রত্যাশিত key লিখে রাখে। এমন একটি keyboard model আবিষ্কার না
করে, যেটা user-দের শিখতে হবে, এটাই ব্যবহার করুন।

| Pattern | কখন ব্যবহার করবেন | যে অংশটা মানুষ ভুল করে |
| --- | --- | --- |
| Disclosure | একটি region দেখানো আর লুকানো | Trigger-এ `aria-expanded` দিতে ভুলে যাওয়া |
| Tabs | একটি set থেকে একটি panel দৃশ্যমান | Tab নয়, arrow key দিয়ে tab-গুলোর মধ্যে যেতে হয় |
| Combobox | একটি list filter করা text input | `aria-activedescendant` — DOM focus input-এই থাকে |
| Modal dialog | Interaction আটকে দেওয়া | Focus ফেরত আনা, আর page-এর বাকি অংশ inert করা |
| Menu button | Application-ধাঁচের command menu | এটা কোনো navigation list নয়; link-এর জন্য এটা ব্যবহার করবেন না |

শেষ row-টি একটি সাধারণ ভুল। `role="menu"` বোঝায় arrow-key navigation-সহ, কোনো Tab stop ছাড়া একটি application menu।
Link-এর একটি site navigation dropdown হলো একটি list-ধারী disclosure, menu নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --- | --- | --- |
| Native element যা কিছু ঢেকে দেয় | Native element | Behaviour আর semantics একসঙ্গে আসে |
| Tabs, combobox, tree, treegrid | APG pattern, পুরোটা | Keyboard contract আগেই নির্দিষ্ট করা আছে |
| Focus না বদলানো async result | Load-এর সময়েই উপস্থিত একটি live region | Focus সেখানেই থাকে, যেখানে user রেখেছেন |
| যে control অনুপলব্ধ থাকার সময়েও পৌঁছানো যেতে হবে | `aria-disabled`, সঙ্গে একটি সুরক্ষিত handler | Keyboard user-রা কারণটা জানতে পারেন |
| শুধু icon-ওয়ালা একটি control | `aria-label`, অথবা visually-hidden লেখা | হারিয়ে যাওয়া নামটা জোগায় |

## সাধারণ ভুল

**❌ Native element-এ অপ্রয়োজনীয় role**

```html
<button role="button">Save</button>       <!-- Already a button. -->
<nav role="navigation">…</nav>            <!-- Already a navigation landmark. -->
<ul role="list">…</ul>                    <!-- Already a list, unless CSS removed the role. -->
```

**❌ এমন একটি state attribute, যেটা কিছুই update করে না**

> একবার render হওয়া আর কখনো না ছোঁয়া `aria-expanded="false"` প্রতিটি screen reader user-কে বলে menu বন্ধ, অথচ
> screen-এ সেটা খোলা।

**❌ রুটিন confirmation-এর জন্য `role="alert"`**

> Assertive ঘোষণা বাধা দেয়। "সফলভাবে save হয়েছে" ধরনের message-এর জায়গা `role="status"`-এ। `alert` রাখুন সেইসব
> জিনিসের জন্য, যেগুলোর ওপর user-কে পদক্ষেপ নিতে হবে।

**✅ Fix হিসেবে ARIA মুছে ফেলা**

> যখন একটি component-এ তিনটি role আর চারটি state থাকে, তখন সঠিক patch প্রায়ই একটি `<button>` আর একটি
> `<dialog>`। কম attribute, বেশি behaviour।

## 🔑 মূল শিক্ষা

- ARIA বদলায় কী report করা হবে, কখনো behaviour যোগ করে না। তাই আপনার ঘোষণা করা প্রতিটি state-এর পেছনে আসল code থাকতে হবে।
- ARIA-র প্রথম নিয়ম হলো বরং একটি native element ব্যবহার করা, আর এটা বাকি চারটির প্রয়োজনের বেশিরভাগই দূর করে।
- State হলো সেই attribute-গুলো, যেগুলো runtime-এ sync-এ থাকতে হয়। Property আর role একবার set করা হয়।
- একটি live region-কে আগে থেকেই tree-তে থাকতে হবে, আর default হিসেবে polite হওয়া উচিত। একই message আবার আসার আগে এটা খালি করুন।
- Tabs, combobox আর dialog-এর জন্য নিজে keyboard model আবিষ্কার না করে ARIA Authoring Practices-এর pattern implement করুন।

## Interview-এর প্রশ্ন

**Q: ARIA-র প্রথম নিয়ম কী, আর এটা প্রথম কেন?**

বরং একটি native HTML element ব্যবহার করুন। এটা প্রথম, কারণ native element behaviour আর semantics একসঙ্গে নিয়ে আসে।
একটি `<button>` focusable, Enter আর Space-এ activate হয়, একটি disabled state প্রকাশ করে আর একটি form submit করে। ARIA
শুধু বদলায় কী ঘোষণা করা হবে। আমি যত accessibility ত্রুটি ঠিক করেছি, তার বেশিরভাগই ছিল ARIA জুড়ে দেওয়া একটি `div`।
সমাধান ছিল attribute-গুলো মুছে ফেলা আর tag বদলানো।

**Q: একটি component `aria-expanded` set করে, কিন্তু menu তবু ভুল ঘোষণা করে। আপনি কী যাচাই করবেন?**

কোনো কিছু attribute-টি update করে কি না। `aria-expanded` একটি state, তাই এটাকে সেই একই value-তে bind করতে হবে, যেটা
panel দেখায় আর লুকায়। Render-এর সময় একবার set করলে এটা সঙ্গে সঙ্গে stale হয়ে যায়। আমি Accessibility pane-এ computed
node পড়ব, আর নিশ্চিত হব যে attribute-টি panel-এ নয়, trigger-এ আছে। তারপর যাচাই করব যে `aria-controls` এমন একটি
element-কে নির্দেশ করছে, যেটা আসলে আছে।

**Q: Background-এ একটি save সফল হয়েছে, এটা কীভাবে ঘোষণা করবেন?**

এমন একটি live region-এ লিখব, যেটা page load-এর সময়েই DOM-এ ছিল। `role="status"` মানে polite, তাই screen reader পরের
বিরতিতে message-টি বলে, আর focus সরে না। লেখার আগে আমি region-টি খালি করব, যাতে একই রকম দ্বিতীয় message-ও ঘোষিত হয়।
`role="alert"` রাখব error-এর জন্য, কারণ এটা বাধা দেয়। একটি confirmation banner-এ focus সরানো ভুল সমাধান: এটা user-এর
জায়গা কেড়ে নেয়।

**Q: কখন `aria-disabled` `disabled`-এর চেয়ে ভালো?**

যখন user-এর control-টিতে পৌঁছে জানা দরকার, কেন এটা পাওয়া যাচ্ছে না। অসম্পূর্ণ form-এর কারণে আটকে থাকা একটি submit
button সাধারণ উদাহরণ। একটি native `disabled` button পুরোপুরি tab order থেকে বেরিয়ে যায়, তাই একজন keyboard user সেখানে
পৌঁছাতে বা কোনো ব্যাখ্যা পড়তে পারেন না। `aria-disabled` দিলে control-টি focusable থাকে আর disabled হিসেবে ঘোষিত হয়।
Click handler-কে তবু আগেভাগে return করতে হয়, কারণ attribute নিজে থেকে কিছুই আটকায় না।

**Q: আপনি কি একটি custom select বানাবেন, আর তার খরচ কত?**

শুধু তখনই, যদি একটি native `<select>` সত্যিই requirement মেটাতে না পারে। Native আমাকে সরাসরি দেয় mobile picker,
keyboard model আর screen reader behaviour। যদি custom একটি বানাতেই হয়, আমি তাৎক্ষণিক কিছু না বানিয়ে APG combobox
pattern বানাব। তার মানে `aria-expanded` আর `aria-controls`-সহ একটি text input, আর `role="option"` child-ওয়ালা একটি
`role="listbox"`। এতে লাগে arrow key, সঙ্গে Home, End, Enter আর Escape। এতে `aria-activedescendant`-ও লাগে, যাতে
highlight করা option সরলেও DOM focus input-এই থাকে। এটা এক সপ্তাহের কাজ আর একটি স্থায়ী maintenance খরচ। Estimate-এ
সেটা সৎভাবে বলা উচিত।

## এরপর কী পড়বেন

- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — যে behaviour ARIA জোগায় না
- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — একটি attribute আসলে কী করল, তা কীভাবে যাচাই করবেন
- [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) — যেখানে live region আর state তাদের মূল্য প্রমাণ করে
