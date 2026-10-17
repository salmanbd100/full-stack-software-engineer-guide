---
sourceHash: "e9f96c54764a9fdb5bcec89bafcea1b966d826a66b604c2ed69955da16f849f8"
title: "Accessible Form ও Error Message"
translatedAt: "2026-10-17T01:04:04.648Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessible Form ও Error Message {#ch-accessible-forms}

> প্রতিটি control-এর label দিন, যারা একসঙ্গে থাকার কথা তাদের group করুন, আর error এমন করুন যাতে mouse ছাড়াই সেটা খুঁজে পাওয়া, পড়া আর ঠিক করা যায়।

**এই অধ্যায়ে:** label, আর তা ভুল করার তিনটি উপায় · grouping · autofill · error-এর চুক্তি · summary pattern · login-এর জন্য WCAG 2.2 কী যোগ করেছে

## 💡 মূল ধারণা

Accessibility-র ব্যর্থতায় সরাসরি টাকা খরচ হয় form-এ। Form-এই user সেই কাজটা করতে যাচ্ছিলেন, যার জন্য আপনার company টাকা পায়।
আবার accessibility-র সবচেয়ে নিয়মবদ্ধ অংশও form। অল্প কয়েকটি নিয়ম প্রতিটি field-এ মানলেই প্রায় সব সমস্যা ধরা পড়ে।

বেশিরভাগ কাজ দুটি ধারণার ওপর দাঁড়িয়ে। প্রথমত, **প্রতিটি control-এর একটি programmatic label লাগে**, শুধু পাশে বসানো লেখা নয়।
Code-এ এই সংযোগ থাকলে focus পেলেই screen reader field-টার নাম বলে। আবার label-এ click করলে cursor field-এ চলে যায়। দ্বিতীয়ত,
**একটি error-কে একসঙ্গে তিনটি জিনিস হতে হয়**: দেখা দিলেই announce হবে, নিজের field-এর সঙ্গে যুক্ত থাকবে, আর এতটা নির্দিষ্ট হবে
যে দেখে কিছু করা যায়। "Invalid input" এর একটিও পূরণ করে না।

> Form তখনই accessible, যখন যে user form দেখতে পান না, তিনিও keyboard না ছেড়েই বুঝতে পারেন প্রতিটি field কী চায়, কী ভুল হলো,
> আর ঠিক করতে কোথায় যেতে হবে।

## কীভাবে কাজ করে

### Label, আর তার তিনটি প্রচলিত বিকল্প

```html
<!-- ✅ Explicit association. The label is clickable and announced on focus. -->
<label for="email">Email address</label>
<input id="email" type="email" name="email" autocomplete="email" />

<!-- ✅ Implicit association, when the markup suits it. -->
<label>Email address <input type="email" name="email" /></label>
```

| বিকল্প | কেন ব্যর্থ হয় |
| --- | --- |
| **Placeholder** | প্রথম key চাপলেই উধাও হয়, contrast সাধারণত AA-র নিচে, screen reader ভেদে announce আলাদা হয়, আর user যখন দেখতে চান field-টা কী চেয়েছিল, ঠিক তখনই সেটা থাকে না |
| **পাশের কোনো `div`-এ লেখা** | দেখতে ঠিক আছে, কিন্তু code-এ কোনো সংযোগ নেই — focus পেলে কিছু announce হয় না, click করলেও কিছু হয় না |
| **শুধু `aria-label`** | Assistive technology-র জন্য কাজ করে, কিন্তু চোখে দেখা user কিছুই পান না; শুধু সেখানে ব্যবহার করুন, যেখানে দৃশ্যমান label সত্যিই অসম্ভব, যেমন পাশে icon বসানো search field |

Placeholder ঠিক শুধু একটি আসল label-এর পাশে **format-এর উদাহরণ** হিসেবে, যেমন `DD/MM/YYYY`।

### Grouping: radio, checkbox আর কয়েক ভাগের field

Radio group-এর আলাদা আলাদা label অর্থহীন, যদি না জানা থাকে তারা কোন প্রশ্নের উত্তর।

```html
<fieldset>
  <legend>Delivery speed</legend>

  <label><input type="radio" name="speed" value="standard" checked /> Standard — 3 days</label>
  <label><input type="radio" name="speed" value="express" /> Express — next day</label>
</fieldset>
```

প্রতিটি control announce করার আগে screen reader `<legend>`-টা বলে নেয়। User শোনেন "Delivery speed, Standard, radio button,
1 of 2"। তিনটি input-এ ভাগ করা date, বা একটি address block-এর ক্ষেত্রেও একই কথা। Group-এর নাম না থাকলে user শোনেন
"Day, edit", কিন্তু কোন date-এর, তা বোঝার উপায় নেই।

### Autofill একটি accessibility feature

`autocomplete` token থাকলে browser আর password manager field ভরে দিতে পারে। তাতে চলাফেরায় অসুবিধা আছে এমন user-কে টাইপ
করতে হয় না। আবার হাতে লেখার যে ভুলের কারণে বেশিরভাগ form মাঝপথে ছেড়ে দেওয়া হয়, সেগুলোও আটকায়। WCAG 1.3.5 সাধারণ field-এর
জন্য AA level-এ এগুলো বাধ্যতামূলক করে।

| Field | Token |
| --- | --- |
| Email | `autocomplete="email"` |
| নামের প্রথম / শেষ অংশ | `given-name`, `family-name` |
| Address-এর line | `address-line1`, `postal-code`, `country-name` |
| নতুন password | `new-password` |
| আগের password | `current-password` |
| One-time code | `one-time-code` |

`new-password` বনাম `current-password` জোড়াটা মনে রাখার মতো। এটা password manager-কে বলে, নতুন বানানো value দেবে, নাকি
সংরক্ষিত value। এটা ভুল হয় বলেই এত sign-up form browser-এর সঙ্গে লড়াই করে।

### Error-এর চুক্তি

একটি error message-কে চারটি শর্ত পূরণ করতে হয়। বেশিরভাগ implementation পারে একটি বা দুটি।

| শর্ত | কীভাবে | Criterion |
| --- | --- | --- |
| দেখা দিলেই announce হয় | Live region, নয়তো summary-তে focus সরানো | 4.1.3 |
| নিজের field-এর সঙ্গে যুক্ত | Message-এর দিকে ইঙ্গিত করা `aria-describedby` | 3.3.1 |
| Invalid বলে চিহ্নিত | Input-এ `aria-invalid="true"` | 3.3.1 |
| দেখে কিছু করার মতো নির্দিষ্ট | কী ভুল **আর** কী চলবে, দুটিই বলুন | 3.3.3 |

```html
<label for="pw">New password</label>
<input
  id="pw"
  type="password"
  autocomplete="new-password"
  aria-describedby="pw-hint pw-error"
  aria-invalid="true"
/>
<p id="pw-hint">At least 12 characters.</p>
<p id="pw-error">Password must be at least 12 characters. This one has 8.</p>
```

`aria-describedby` একটি list নিতে পারে। Field-এর নামের পরে screen reader আগে hint বলে, তারপর error। খেয়াল করুন, error থাকুক
বা না থাকুক, input সবসময় hint-এর দিকে ইঙ্গিত করে। শর্তটা user-এর শোনা উচিত focus পেলেই, ব্যর্থ হওয়ার পরে নয়।

### Submit-এর সময়ের validation-এর জন্য summary pattern

Submit ব্যর্থ হলে keyboard user-কে লাল রং খুঁজতে খুঁজতে পুরো form tab করে বেড়াতে হবে না।

```html
<!-- Rendered on failure, focused by script, listing every problem as a link. -->
<div role="alert" tabindex="-1" id="error-summary">
  <h2>There are 2 problems with this form</h2>
  <ul>
    <li><a href="#email">Enter an email address in the format name@example.com</a></li>
    <li><a href="#pw">Password must be at least 12 characters</a></li>
  </ul>
</div>
```

```typescript
// Move focus to the summary so it is read and the links are the next Tab stops.
document.querySelector<HTMLElement>('#error-summary')?.focus();
```

প্রতিটি link যে field-এর কথা বলে, সেখানে লাফিয়ে নিয়ে যায়। UK Government Digital Service usability testing-এর পরে এই pattern-এ
থিতু হয়েছে, আর এটা সবার জন্যই কাজ করে। চোখে দেখা user পান একটি checklist। Screen reader user পান কয়টি error আর সেখানে যাওয়ার
পথ।

### কখন validate করবেন

| কখন | আচরণ | কেন |
| --- | --- | --- |
| প্রতিটি key চাপায় | ❌ User প্রথম অক্ষর টাইপ করতেই "invalid email" announce হয় | Live region-এ অবিরাম বদল, আর কথাটা তখনো সত্যিও নয় |
| Blur-এ | ✅ User প্রতিটি field ছেড়ে যাওয়ার সময় সেই field-এর error | মানুষ যেভাবে form পূরণ করে, তার সঙ্গে মেলে |
| Submit-এ | ✅ Summary, সঙ্গে সেখানে focus সরানো | Blur-এর validation যা ধরতে পারে না, তা ধরে |
| টাইপ করার সময়, সাফল্যের জন্য | ✅ Password কতটা শক্ত, আর কয়টি অক্ষর বাকি | ইতিবাচক feedback বাধা নয় |

> ⚠️ Live region-এ character counter কম কম announce করুন। প্রতিটি key চাপায় update হওয়া polite region কথার queue ভাসিয়ে
> দেয়। অবিরাম না বলে নির্দিষ্ট সীমায় announce করুন, যেমন "আর 20টি অক্ষর বাকি"।

### Form-এর জন্য WCAG 2.2 কী যোগ করেছে

ছয়টি নতুন criterion-এর তিনটিই form নিয়ে, আর তিনটিতেই ব্যর্থতা খুব সাধারণ।

- **3.3.7 Redundant Entry (A)** — একই flow-এ একই তথ্য দুবার চাইবেন না। Billing address যদি delivery address-এরই পুনরাবৃত্তি হয়,
  তাহলে copy করার option বা আগে থেকে ভরা value লাগবে।
- **3.3.8 Accessible Authentication (Minimum) (AA)** — login করতে কোনো cognitive function test নয় (মনে রাখা বা ধাঁধার কাজ)।
  **Paste কাজ করতেই হবে**, আর password manager আটকানো যাবে না। ধাঁধা-ধাঁচের যাচাইয়ের একটি বিকল্প লাগবে। Password field-এ paste
  আটকে দেওয়া `onpaste` handler এখন conformance-এর ব্যর্থতা।
- **2.5.8 Target Size (Minimum) (AA)** — checkbox, radio আর তাদের label-এর target হতে হবে 24 × 24 CSS px, অথবা সমান ফাঁক থাকতে
  হবে। Input-টাকে তার `<label>`-এর ভেতরে মুড়ে দিলেই সাধারণত এটা বিনা খরচে ঠিক হয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী বেছে নেবেন | কেন |
| --- | --- | --- |
| যেকোনো একক control | `<label for>` | একমাত্র সংযোগ, যা click target আর announcement দুটিই দেয় |
| Radio, checkbox-এর সেট, কয়েক ভাগের field | `<fieldset>` আর `<legend>` | প্রতিটি control-এর আগে group-এর নাম বলা হয় |
| শুধু icon-ওয়ালা search field | `aria-label`, বা visually-hidden label-এর লেখা | ইঙ্গিত করার মতো কোনো দৃশ্যমান label নেই |
| একটি field validation-এ ফেল করেছে | `aria-invalid`, সঙ্গে `aria-describedby` | Field ধরে, focus পেলেই announce হয় |
| কয়েকটি error নিয়ে submit ব্যর্থ | Link-সহ focus পাওয়া summary | এক জায়গাতেই কয়টি error আর সেখানে যাওয়ার পথ |
| Async submit সফল হয়েছে | `role="status"` | Cursor কেড়ে না নিয়েই নিশ্চিত করে |

## সাধারণ ভুল

**❌ Placeholder-কে label বানানো**

> টাইপ শুরু করলেই এটা উধাও হয়, সাধারণত contrast-এ ফেল করে, আর field-টা কী চেয়েছিল তা user আর যাচাই করতে পারেন না।

**❌ কোনো message ছাড়া `aria-invalid="true"`**

> User শোনেন "invalid", কিন্তু কিছুই জানতে পারেন না। এর সঙ্গে `aria-describedby` আর একটি নির্দিষ্ট বাক্য জুড়ে দিন।

**❌ শুধু রং দিয়ে error দেখানো**

> লাল border আর লাল লেখা একজন colourblind user-কে কিছু বলে না, আর screen reader-কে তো কিছুই বলে না। লেখা আর icon দিন,
> সঙ্গে programmatic সংযোগ।

**❌ Password বা one-time-code field-এ paste আটকে দেওয়া**

> এটা 3.3.8-এর অধীনে WCAG 2.2 AA-র ব্যর্থতা। আবার এতে password manager-ও ভাঙে, অথচ এসব field-এর বেশিরভাগ user ঠিক এই
> accessibility tool-এর ওপরেই নির্ভর করেন।

**✅ শুধু কী ভুল নয়, কী চলবে তাও বলা**

> "DD/MM/YYYY format-এ date দিন" দেখে কিছু করা যায়। "Invalid date" একটি কানাগলি।

## 🔑 মূল শিক্ষা

- প্রতিটি control-এর একটি programmatic label লাগে (`<label for>`)। Placeholder হলো format-এর উদাহরণ, কখনোই label নয়।
- Radio, checkbox-এর সেট আর কয়েক ভাগের field-এ `<fieldset>` আর `<legend>` লাগে, যাতে প্রতিটি option-এর সঙ্গে group-এর নাম announce হয়।
- `autocomplete` token accessibility-র শর্ত। `new-password` বনাম `current-password` ঠিক করে password manager সহযোগিতা করবে কি না।
- একটি error-কে announce হতে হবে, `aria-describedby` দিয়ে যুক্ত থাকতে হবে, `aria-invalid` দিয়ে চিহ্নিত হতে হবে, আর কী চলবে তা নির্দিষ্ট করে বলতে হবে।
- WCAG 2.2 login field-এ paste আটকে দেওয়াকে conformance-এর ব্যর্থতা বানিয়েছে, আর একই তথ্য দুবার চাওয়াকেও।

## Interview-এর প্রশ্ন

**Q: একটি form label-এর বদলে placeholder ব্যবহার করে। Designer-কে কী বলবেন?**

বলব, এটা তিন দিক থেকে ব্যর্থ। প্রথম key চাপলেই placeholder উধাও হয়, তাই field-টা কী চেয়েছিল তা user যাচাই করতে পারেন না।
এর contrast প্রায় সবসময় 4.5 : 1-এর নিচে। আর screen reader একে একেক রকমভাবে announce করে, ফলে কিছু user field-এর নামই পান না।
Field-এর ওপরে দৃশ্যমান label চাইব। আর placeholder-কে ফিরিয়ে দিতে বলব label-এর পাশে format-এর উদাহরণ হিসেবে, যে একটি কাজ এটা
ভালো পারে।

**Q: Validation error কীভাবে accessible উপায়ে জানাবেন?**

চারটি জিনিস একসঙ্গে। `aria-describedby` message-কে field-এর সঙ্গে যুক্ত করে, আর field-কে চিহ্নিত করা হয় `aria-invalid="true"`
দিয়ে। লেখায় বলা থাকে কী চলবে, শুধু কিছু একটা ভুল হয়েছে তা নয়। আর error দেখা দিলেই announce হয়। Field ধরে একটি error হলে live
region ব্যবহার করুন, submit ব্যর্থ হলে focus সরিয়ে নিন error summary-তে। Summary প্রতিটি সমস্যাকে তার field-এর link হিসেবে
দেখায়। তাতে keyboard user-কে খুঁজে বেড়াতে হয় না, একটি পথ পান।

**Q: Validation কখন চলা উচিত?**

Field-এর check blur-এ, আর পুরো check submit-এ। প্রতিটি key চাপায় validate করলে user প্রথম অক্ষর টাইপ করতেই "invalid email"
announce হয়। Live region-এ এটা একসঙ্গে মিথ্যাও, আবার কোলাহলও। টাইপ করার সময় ইতিবাচক feedback ঠিক আছে, যেমন strength meter বা
কয়টি অক্ষর বাকি তার হিসাব। শুধু প্রতিটি অক্ষরে announce করবেন না।

**Q: `autocomplete` attribute সুবিধার নয়, accessibility-র বিষয় কেন?**

কারণ এগুলো টাইপ করার দরকার সরিয়ে দেয়, আর চলাফেরায় অসুবিধা আছে এমন user-এর জন্য টাইপ করাই সবচেয়ে কষ্টের অংশ। এগুলো হাতে
লেখার সেই ভুলও আটকায়, যার কারণে মানুষ form ছেড়ে চলে যায়। WCAG 1.3.5 সাধারণ field-এর জন্য AA level-এ token বাধ্যতামূলক করে।
বাস্তবে সবচেয়ে জরুরি জোড়া হলো `new-password` বনাম `current-password`। এটা ভুল হলে user যে password manager-এর ওপর নির্ভর
করেন, form তার সঙ্গেই লড়াই করে।

**Q: Login form নিয়ে WCAG 2.2 কী বদলেছে?**

AA level-এ 3.3.8 Accessible Authentication যোগ করেছে। Login করতে কোনো cognitive function test লাগা চলবে না। Paste কাজ করতে হবে,
password manager আটকানো যাবে না, আর ধাঁধা-ধাঁচের যেকোনো check-এর একটি বিকল্প পথ লাগবে। এর পাশাপাশি 3.3.7 Redundant Entry বলে,
কোনো flow একই তথ্য দুবার চাইতে পারবে না। Billing address যখন delivery address-এর পুনরাবৃত্তি, এটা সেই ক্ষেত্র। দুটিই এতই নতুন যে
চালু বেশিরভাগ checkout এগুলোতে ফেল করে।

## এরপর কী পড়বেন

- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — submit ব্যর্থ হলে focus কোথায় যায়
- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — live region, আর এসব field যে state বসায়
- [Chapter ?? — Form State](#ch-form-state) — validation আর submission-এর framework-এর দিক
