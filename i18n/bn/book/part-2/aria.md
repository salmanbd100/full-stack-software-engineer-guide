---
sourceHash: "d579d06cc2e10596978224b2b470a5d75ca3fb10012d4566df2d829355939091"
title: "ARIA, আর কখন এটা ব্যবহার করবেন না"
translatedAt: "2026-10-17T01:10:50.720Z"
model: "claude-opus-5-5 (Claude Code)"
---

# ARIA, আর কখন এটা ব্যবহার করবেন না {#ch-aria}

> ARIA ব্যবহার করুন শুধু সেখানে, যেখানে কাজটার জন্য HTML-এ কোনো element নেই। আর কোনো attribute যেন এমন আচরণের প্রতিশ্রুতি না দেয়, যা আপনি বানাননি।

**এই অধ্যায়ে:** পাঁচটি নিয়ম · role, state আর property · ARIA যা পারে না · live region · যে pattern-গুলো শেখার মতো · যে ভুল ব্যবহার ব্যাপারটা আরও খারাপ করে

## 💡 মূল ধারণা

ARIA (Accessible Rich Internet Applications) হলো এমন একটি শব্দভান্ডার, যা দিয়ে assistive technology-কে সেসব কথা জানানো
যায়, যা HTML প্রকাশ করতে পারে না। এটা polyfill নয়, কোনো feature-ও নয়। **এটা শুধু বদলায় কী report হবে, আর কিছু নয়।** এটা
কোনো focus-এর আচরণ যোগ করে না, keyboard সামলায় না, state সামলায় না, styling-ও করে না।

Production-এর প্রায় সব ARIA bug এই একটি কথা দিয়েই ব্যাখ্যা করা যায়। যে menu খোলেই না, তাতে `aria-expanded="true"` একটি
মিথ্যা, আর screen reader বিশ্বস্তভাবে সেই মিথ্যাটাই আওড়ায়। একটি `div`-এ `role="button"` দিলে element-টা button বলে announce
হয়। কিন্তু তখনো Enter আর Space-এ সাড়া দেয় না, focus-ও করা যায় না। দুই ক্ষেত্রেই attribute না দিলে যা হতো, তার চেয়ে খারাপ হয়েছে।
"এটা অস্পষ্ট"-এর জায়গায় এসেছে "এটা ভুল"।

> খারাপ ARIA-র চেয়ে ARIA না থাকা ভালো। WebAIM Million audit দেখায়, ARIA ব্যবহার করা page-এ গড়ে ধরা পড়া ব্যর্থতা ARIA ছাড়া
> page-এর চেয়ে *বেশি*। Team-গুলো আগে ARIA-র দিকে হাত বাড়ায়, বোঝে পরে।

## কীভাবে কাজ করে

### পাঁচটি নিয়ম, যে ক্রমে আসলে ভাঙা হয়

W3C ARIA ব্যবহারের পাঁচটি নিয়ম প্রকাশ করে। এই ক্রমেই শিখুন, কারণ team-গুলো ঠিক এই হারেই এগুলো ভাঙে।

| # | নিয়ম | Review-এ এর মানে |
| --- | --- | --- |
| 1 | **তার বদলে native element ব্যবহার করুন** | HTML-এ যদি এমন element থাকে, যার role আর আচরণ দুটিই আছে, সেটাই ব্যবহার করুন |
| 2 | **Native semantics বদলাবেন না** | `<h2 role="tab">` ভুল; তার বদলে মুড়ে দিন বা ভেতরে বসান |
| 3 | **প্রতিটি ARIA control keyboard দিয়ে চালানো যেতে হবে** | Interactive role আছে এমন সবকিছুর `tabindex` আর key handler লাগে |
| 4 | **Focus করা যায় এমন element-এ কখনো `aria-hidden` নয়** | এতে এমন control তৈরি হয়, যা announce করা যায় না |
| 5 | **প্রতিটি interactive element-এর একটি accessible name লাগে** | নাম ছাড়া role শুধু তার ধরন বলে announce হয় |

নিয়ম 1 হলো বাদ দেওয়ার নিয়ম, আর আসল লাভের বেশিরভাগ এখানেই। একটি `<button>` আসে role, focus, disabled state, Enter আর Space
সামলানো, আর form submit করার আচরণ নিয়ে। একটি `div`-এ এর নকল করতে লাগে একটি ARIA role, একটি `tabindex`, দুটি key handler,
একটি `aria-disabled` আর একটি pointer-events rule। তবু কিছু না কিছু বাদ পড়ে যাবে।

```html
<!-- ❌ Five lines of JavaScript away from being a button, and never quite one. -->
<div class="btn" onclick="save()">Save</div>

<!-- ✅ Role, focusability, keyboard activation and disabled state, free. -->
<button type="button" onclick="save()">Save</button>
```

### Role, state আর property

| ধরন | কোন প্রশ্নের উত্তর | উদাহরণ | Runtime-এ বদলায়? |
| --- | --- | --- | --- |
| **Role** | এটা কী জিনিস? | `dialog`, `tab`, `listbox`, `alert` | প্রায় কখনোই না |
| **State** | এই মুহূর্তে কী সত্যি? | `aria-expanded`, `aria-checked`, `aria-selected`, `aria-invalid` | হ্যাঁ — আপনাকেই update করতে হবে |
| **Property** | সবসময় কী সত্যি? | `aria-label`, `aria-describedby`, `aria-controls`, `aria-required` | কালেভদ্রে |

পার্থক্যটা কাজের: **state-গুলোকেই আপনার নিজের code-এর সঙ্গে মিলিয়ে রাখতে হয়।** Render-এর সময় একবার বসিয়ে আর কখনো update
না করা state attribute আর পুরনো হয়ে যাওয়া cache একই defect। Component library-তে এটাই সবচেয়ে সাধারণ ARIA bug।

```typescript
// The pattern that keeps a state honest: derive it, never assign it once.
function renderDisclosure(isOpen: boolean): string {
  return `
    <button type="button" aria-expanded="${isOpen}" aria-controls="panel">Details</button>
    <div id="panel" ${isOpen ? '' : 'hidden'}></div>
  `;
}
```

Framework-এ এটা বিনা খরচে হয়, কারণ যে state panel render করে, attribute-টাও তার সঙ্গেই বাঁধা। হাতে লেখা DOM code-এ দুটি
আলাদা হয়ে যায়।

### ARIA যা পারে না

| মানুষ যা আশা করে | আসলে |
| --- | --- |
| `role="button"` দিলে keyboard দিয়ে click করা যাবে | না — `tabindex="0"` আর Enter/Space handler নিজেকেই যোগ করতে হবে |
| `aria-disabled` interaction আটকে দেয় | না — শুধু disabled বলে announce করে; handler-ও আপনাকে আটকাতে হবে |
| `aria-required` value দিতে বাধ্য করে | না — শুধু required বলে announce করে; validation এখনো আপনার কাজ |
| `role="dialog"` focus আটকে রাখে | না — focus সামলানো পুরোটাই আপনার, নয়তো `<dialog>` ব্যবহার করুন |
| একটি `div`-এ `aria-label` দিলে সেটা control হয়ে যায় | না — role ছাড়া নাম কিছু হিসেবেই announce হয় না |

`aria-disabled` একটু কাছ থেকে দেখার মতো, কারণ এর থাকার পেছনে ভালো একটি কারণ আছে। Native `disabled` button-কে browser tab
order থেকে সরিয়ে দেয়। তখন keyboard user সেখানে পৌঁছে জানতে পারেন না, button-টা কেন বন্ধ। `aria-disabled="true"`, সঙ্গে আগেভাগে
return করা একটি handler দিলে button-টা focus করা যায়, ফলে নিজের কারণ নিজেই বলতে পারে। এটা জেনে-বুঝে করা একটি আপস,
জোড়াতালি নয়।

### Live region — focus না সরিয়ে announce করা

কিছু জিনিস user কিছু না করলেও বদলায়: একটি save শেষ হলো, একটি filter 12টি result দিল, একটি token-এর মেয়াদ ফুরাল। **Live
region** focus যেখানে আছে সেখানেই রেখে বদলটা announce করে।

```html
<!-- role="status" implies aria-live="polite". Waits for a pause in speech. -->
<div role="status" id="save-status"></div>

<!-- role="alert" implies aria-live="assertive". Interrupts. Errors only. -->
<div role="alert" id="form-errors"></div>
```

তিনটি নিয়ম মানলে এটা কাজ করে, আর তিনটিই প্রায়ই বাদ পড়ে।

- **লেখা বদলানোর আগেই region-টা tree-তে থাকতে হবে।** একই tick-এ element আর তার content দুটিই তৈরি করলে সাধারণত কিছুই
  announce হয় না। Assistive technology নজর রাখে এমন region-এর ভেতরের বদলে, যা তার আগে থেকেই চেনা।
- **Default হিসেবে polite।** `assertive` যা পড়া হচ্ছে, তার মাঝখানেই ঢুকে পড়ে। Submit-এর error-এর জন্য সেটা ঠিক,
  "basket-এ 3টি item"-এর জন্য ভুল।
- **মুছে দিন, নইলে একই message দ্বিতীয়বার নীরব থাকে।** একই string দুবার লিখলে কোনো বদল হয় না। আগে region খালি করুন,
  তারপর লিখুন।

> ⚠️ ঘন ঘন আসা কোনো stream-এর সঙ্গে live region জুড়বেন না। Token ধরে ধরে আসা AI response বা চলমান দামের feed `aria-live`-এ
> পাঠালে user এমন অবিরাম কথা শোনেন, যা থেকে বেরোনোর উপায় নেই। অগ্রগতি নয়, শেষ হওয়াটা announce করুন।

### যে pattern-গুলো শেখার মতো

যেখানে ARIA সত্যিই নিজের জায়গা অর্জন করে, সেখানে কেউ একজন keyboard-এর নিয়ম আগেই ঠিক করে রেখেছে। **ARIA Authoring
Practices Guide** (APG) প্রতিটি pattern-এর role, state আর প্রত্যাশিত key লিখে রাখে। User-কে নতুন করে শিখতে হবে এমন keyboard
model নিজে বানানোর বদলে এটা ব্যবহার করুন।

| Pattern | কখন ব্যবহার করবেন | যে অংশে মানুষ ভুল করে |
| --- | --- | --- |
| Disclosure | একটি অংশ দেখানো আর লুকানো | Trigger-এ `aria-expanded` দিতে ভুলে যাওয়া |
| Tabs | কয়েকটির মধ্যে একটি panel দেখা যায় | Tab-এর মধ্যে যেতে Tab নয়, arrow key |
| Combobox | Text input দিয়ে একটি list filter করা | `aria-activedescendant` — DOM focus input-এই থাকে |
| Modal dialog | Interaction আটকে রাখা | Focus ফিরিয়ে দেওয়া, আর page-এর বাকি অংশ inert করা |
| Menu button | Application-ধাঁচের command menu | এটা navigation list নয়; link-এর জন্য ব্যবহার করবেন না |

শেষ row-টা খুব সাধারণ ভুল। `role="menu"` বোঝায় এমন application menu, যেখানে arrow key দিয়ে চলাফেরা হয় আর Tab-এ থামার জায়গা
নেই। Site-এর navigation-এর link-ভরা dropdown হলো একটি list-সহ disclosure, menu নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী বেছে নেবেন | কেন |
| --- | --- | --- |
| যা কিছু একটি native element দিয়ে হয় | সেই native element | আচরণ আর semantics একসঙ্গে আসে |
| Tabs, combobox, tree, treegrid | APG pattern, পুরোটা | Keyboard-এর নিয়ম আগে থেকেই ঠিক করা |
| Focus না বদলে async result | Load-এর সময়েই থাকা একটি live region | User যেখানে focus রেখেছেন, সেখানেই থাকে |
| এমন control, যা বন্ধ থাকলেও পৌঁছানো যেতে হবে | `aria-disabled`, সঙ্গে পাহারা দেওয়া handler | Keyboard user কারণটা জানতে পারেন |
| শুধু icon-ওয়ালা control | `aria-label`, বা visually-hidden লেখা | না থাকা নামটা জুগিয়ে দেয় |

## সাধারণ ভুল

**❌ Native element-এ বাড়তি role**

```html
<button role="button">Save</button>       <!-- Already a button. -->
<nav role="navigation">…</nav>            <!-- Already a navigation landmark. -->
<ul role="list">…</ul>                    <!-- Already a list, unless CSS removed the role. -->
```

**❌ এমন state attribute, যা কেউ update করে না**

> একবার render হয়ে আর কখনো না ছোঁয়া `aria-expanded="false"` প্রত্যেক screen reader user-কে বলে menu বন্ধ, অথচ screen-এ সেটা
> খোলা।

**❌ রোজকার confirmation-এর জন্য `role="alert"`**

> Assertive announcement মাঝখানে ঢুকে পড়ে। "সফলভাবে save হয়েছে" ধরনের message-এর জায়গা `role="status"`। `alert` রাখুন সেসব
> জিনিসের জন্য, যাতে user-কে কিছু করতেই হবে।

**✅ সমাধান হিসেবে ARIA মুছে ফেলা**

> কোনো component-এ তিনটি role আর চারটি state থাকলে ঠিক patch প্রায়ই হলো একটি `<button>` আর একটি `<dialog>`। Attribute
> কম, আচরণ বেশি।

## 🔑 মূল শিক্ষা

- ARIA বদলায় কী report হবে, কখনো আচরণ যোগ করে না। তাই আপনার ঘোষণা করা প্রতিটি state-এর পেছনে সত্যিকারের code থাকতে হবে।
- ARIA-র প্রথম নিয়ম হলো তার বদলে native element ব্যবহার করা, আর এতেই বাকি চারটির দরকার বেশিরভাগ মিটে যায়।
- State হলো সেই attribute, যা runtime-এ মিলিয়ে রাখতে হয়। Property আর role একবার বসালেই চলে।
- Live region আগে থেকেই tree-তে থাকতে হবে, আর default হওয়া উচিত polite। একই message আবার দেওয়ার আগে region খালি করুন।
- Tabs, combobox আর dialog-এর জন্য নিজে keyboard model না বানিয়ে ARIA Authoring Practices-এর pattern বানান।

## Interview-এর প্রশ্ন

**Q: ARIA-র প্রথম নিয়ম কী, আর এটা প্রথম কেন?**

তার বদলে একটি native HTML element ব্যবহার করুন। এটা প্রথম, কারণ native element আচরণ আর semantics একসঙ্গে নিয়ে আসে। একটি
`<button>` focus করা যায়, Enter আর Space-এ চলে, disabled state জানায়, আর form submit করে। ARIA শুধু বদলায় কী announce
হবে। আমি accessibility-র যত defect ঠিক করেছি, তার বেশিরভাগই ছিল ARIA জুড়ে দেওয়া একটি `div`। সমাধান ছিল attribute-গুলো মুছে
tag বদলে দেওয়া।

**Q: একটি component `aria-expanded` বসায়, তবু menu ভুল announce হয়। কী যাচাই করবেন?**

Attribute-টা কেউ update করে কি না। `aria-expanded` একটি state, তাই যে value panel দেখায় আর লুকায়, তার সঙ্গেই একে বাঁধতে হবে।
Render-এর সময় একবার বসালে সঙ্গে সঙ্গেই পুরনো হয়ে যায়। Accessibility pane-এ হিসাব করা node-টা পড়ব, আর নিশ্চিত হব attribute-টা
panel-এ নয়, trigger-এ আছে। তারপর দেখব `aria-controls` এমন element-এর দিকে ইঙ্গিত করছে, যা সত্যিই আছে।

**Q: Background-এ save সফল হয়েছে, এটা কীভাবে announce করবেন?**

এমন একটি live region-এ লিখব, যা page load-এর সময়েই DOM-এ ছিল। `role="status"` মানেই polite, তাই screen reader পরের বিরতিতে
message-টা বলে, আর focus সরে না। লেখার আগে region খালি করব, যাতে একই message দ্বিতীয়বারও announce হয়। `role="alert"` রাখব
error-এর জন্য, কারণ সেটা মাঝখানে ঢুকে পড়ে। Confirmation banner-এ focus সরিয়ে নেওয়া ভুল সমাধান: তাতে user-এর জায়গাটাই
কেড়ে নেওয়া হয়।

**Q: কখন `disabled`-এর চেয়ে `aria-disabled` ভালো?**

যখন user-এর control-টায় পৌঁছানো আর সেটা কেন বন্ধ তা জানা দরকার। অসম্পূর্ণ form-এর কারণে আটকে থাকা submit button এর সাধারণ
উদাহরণ। Native `disabled` button tab order থেকে পুরোপুরি সরে যায়, তাই keyboard user সেখানে পৌঁছাতে বা কোনো ব্যাখ্যা পড়তে পারেন
না। `aria-disabled` দিলে control-টা focus করা যায়, আর disabled বলে announce হয়। তবু click handler-কে আগেভাগে return করতে হবে,
কারণ attribute নিজে কিছুই আটকায় না।

**Q: আপনি কি custom select বানাবেন, আর তাতে খরচ কত?**

শুধু তখনই, যখন native `<select>` দিয়ে সত্যিই চাহিদা মেটে না। Native দিলে mobile picker, keyboard model আর screen reader-এর
আচরণ সরাসরি পেয়ে যাই। Custom একান্তই লাগলে নিজে বানিয়ে না নিয়ে APG combobox pattern বানাব। মানে `aria-expanded` আর
`aria-controls`-সহ একটি text input, আর `role="option"` child-ভরা একটি `role="listbox"`। এতে লাগে arrow key, সঙ্গে Home, End,
Enter আর Escape। লাগে `aria-activedescendant`-ও, যাতে highlight করা option সরলেও DOM focus input-এই থাকে। এটা এক সপ্তাহের কাজ
আর চিরকালের maintenance খরচ। Estimate-এ সেটা সৎভাবে বলা উচিত।

## এরপর কী পড়বেন

- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — যে আচরণ ARIA দেয় না
- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — একটি attribute আসলে কী করল, তা কীভাবে যাচাই করবেন
- [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) — যেখানে live region আর state নিজের দাম দেয়
