---
sourceHash: "e9f96c54764a9fdb5bcec89bafcea1b966d826a66b604c2ed69955da16f849f8"
title: "Accessible Form ও Error Message"
translatedAt: "2026-10-12T12:12:12.590Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessible Form ও Error Message {#ch-accessible-forms}

> প্রতিটি control-এ label দিন, একসঙ্গে থাকার মতো control-গুলোকে group করুন, আর একটি error-কে এমন করুন যাতে mouse ছাড়াই সেটা খুঁজে পাওয়া, পড়া আর ঠিক করা যায়।

**এই অধ্যায়ে:** label আর এটা ভুল করার তিনটি উপায় · grouping · autofill · error contract · summary pattern · login-এর জন্য WCAG 2.2 কী যোগ করেছে

## 💡 মূল ধারণা

Form-এই accessibility-র ব্যর্থতায় টাকা খরচ হয়। Form হলো সেই জায়গা, যেখানে user ঠিক সেই কাজটা করতে যাচ্ছিলেন, যার জন্য
আপনার company টাকা পায়। Form আবার accessibility-র সবচেয়ে নিয়মবদ্ধ অংশও। অল্প কয়েকটি নিয়ম, প্রতিটি field-এ প্রয়োগ
করলে, প্রায় সবকিছু ধরে ফেলে।

দুটো ধারণাই এর বেশিরভাগ বহন করে। প্রথমত, **প্রতিটি control-এর একটি programmatic label লাগে**, শুধু পাশে বসে থাকা কিছু
লেখা নয়। Code-এর এই association একটি screen reader-কে focus-এর সময় field-টি ঘোষণা করতে দেয়। এটা label-এ click করলে
cursor-কে field-এ নিয়ে যেতেও দেয়। দ্বিতীয়ত, **একটি error-কে একসঙ্গে তিনটি জিনিস হতে হয়**: দেখা দিলেই ঘোষিত, তার
field-এর সঙ্গে যুক্ত, আর এতটা নির্দিষ্ট যে তার ভিত্তিতে কিছু করা যায়। "Invalid input" এর একটিও মেটায় না।

> একটি form তখনই accessible, যখন যে user এটা দেখতে পান না, তিনিও বুঝতে পারেন প্রতিটি field কী চায়, কী ভুল হয়েছে, আর
> সেটা ঠিক করতে কোথায় যেতে হবে — সবই keyboard না ছেড়ে।

## কীভাবে কাজ করে

### Label, আর তিনটি সাধারণ বিকল্প

```html
<!-- ✅ Explicit association. The label is clickable and announced on focus. -->
<label for="email">Email address</label>
<input id="email" type="email" name="email" autocomplete="email" />

<!-- ✅ Implicit association, when the markup suits it. -->
<label>Email address <input type="email" name="email" /></label>
```

| বিকল্প | কেন ব্যর্থ হয় |
| --- | --- |
| **একটি placeholder** | প্রথম keystroke-এই উধাও হয়, contrast সাধারণত AA-র নিচে, ঘোষণা screen reader ভেদে আলাদা, আর user যখন ঠিক দেখতে চান field-টি কী ছিল, তখনই এটা থাকে না |
| **পাশের একটি `div`-এ লেখা** | দেখতে ঠিক, কিন্তু programmatically যুক্ত নয় — focus-এ কিছু ঘোষিত হয় না, আর এতে click করলে কিছুই হয় না |
| **শুধু `aria-label`** | Assistive technology-র জন্য কাজ করে, আর যাঁরা দেখতে পান তাঁদের কিছুই দেয় না; এটা শুধু সেখানেই ব্যবহার করুন, যেখানে দৃশ্যমান label সত্যিই অসম্ভব, যেমন পাশে একটি icon-ওয়ালা search field |

Placeholder শুধু তখনই বৈধ, যখন এটা একটি আসল label-এর পাশে একটি **format-এর উদাহরণ**, যেমন `DD/MM/YYYY`।

### Grouping: radio, checkbox আর কয়েক অংশের field

একটি radio group-এর আলাদা আলাদা label অর্থহীন, যদি না জানা থাকে সেগুলো কোন প্রশ্নের উত্তর দিচ্ছে।

```html
<fieldset>
  <legend>Delivery speed</legend>

  <label><input type="radio" name="speed" value="standard" checked /> Standard — 3 days</label>
  <label><input type="radio" name="speed" value="express" /> Express — next day</label>
</fieldset>
```

Screen reader প্রতিটি control-এর ঘোষণার আগে `<legend>` বসিয়ে দেয়। User শোনেন "Delivery speed, Standard, radio
button, 1 of 2"। তিনটি input-এ ভাগ করা একটি date, বা একটি address block-এর ক্ষেত্রেও একই কথা। Group-এর নাম না থাকলে user
শোনেন "Day, edit", আর বুঝতেই পারেন না কোন date।

### Autofill একটি accessibility feature

`autocomplete` token browser আর password manager-দের field পূরণ করতে দেয়। এতে motor impairment থাকা user-দের typing
বাঁচে। এটা সেই প্রতিলিপির ভুলগুলোও আটকায়, যেগুলোর কারণে বেশিরভাগ form মাঝপথে ছেড়ে দেওয়া হয়। WCAG 1.3.5 সাধারণ
field-গুলোর জন্য AA level-এ এগুলো বাধ্যতামূলক করে।

| Field | Token |
| --- | --- |
| Email | `autocomplete="email"` |
| নামের প্রথম অংশ / পদবি | `given-name`, `family-name` |
| ঠিকানার line | `address-line1`, `postal-code`, `country-name` |
| নতুন password | `new-password` |
| বর্তমান password | `current-password` |
| One-time code | `one-time-code` |

`new-password` বনাম `current-password` — এই জোড়াটা মনে রাখার মতো। এটা password manager-কে বলে দেয়, একটি generate করা
value দেবে, নাকি সংরক্ষিত একটি। এটা ভুল করার কারণেই এত sign-up form browser-এর সঙ্গে লড়াই করে।

### Error contract

একটি error message-কে চারটি জিনিস মেটাতে হয়। বেশিরভাগ implementation একটি বা দুটো পারে।

| Requirement | কীভাবে | Criterion |
| --- | --- | --- |
| দেখা দিলেই ঘোষিত | Live region, অথবা একটি summary-তে focus সরানো | 4.1.3 |
| তার field-এর সঙ্গে যুক্ত | Message-কে নির্দেশ করা `aria-describedby` | 3.3.1 |
| Invalid হিসেবে চিহ্নিত | Input-এ `aria-invalid="true"` | 3.3.1 |
| কিছু করার মতো নির্দিষ্ট | কী ভুল **আর** কী গ্রহণযোগ্য, দুটোই বলুন | 3.3.3 |

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

`aria-describedby` একটি list নেয়। Screen reader field-এর নামের পরে hint, তারপর error ঘোষণা করে। লক্ষ করুন, error থাকুক
বা না থাকুক, input hint-কে reference করে। User-এর requirement-টা focus-এর সময়েই শোনা উচিত, শুধু fail করার পরে নয়।

### Summary pattern, submit-এর সময়ের validation-এর জন্য

একটি ব্যর্থ submit-এর পর একজন keyboard user-কে লাল খুঁজতে পুরো form-এ tab করতে হওয়া উচিত নয়।

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

প্রতিটি link যে field-এর বর্ণনা দেয়, সেখানে লাফিয়ে যায়। UK Government Digital Service usability testing-এর পর এই
pattern-এ থিতু হয়েছে, আর এটা সবার জন্য কাজ করে। যাঁরা দেখতে পান, তাঁরা পান একটি checklist। Screen reader user-রা পান
সংখ্যা আর পথ।

### Validation-এর সময়

| কখন | Behaviour | কেন |
| --- | --- | --- |
| প্রতিটি keystroke-এ | ❌ User প্রথম অক্ষর লেখার সময়েই "invalid email" ঘোষণা করে | Live region-এ অস্থিরতা, আর কথাটা এখনো সত্যিও নয় |
| Blur-এ | ✅ User প্রতিটি field ছাড়ার সময় field-স্তরের error | মানুষ যেভাবে form পূরণ করে, তার সঙ্গে মেলে |
| Submit-এ | ✅ Summary, আর focus সেখানে সরানো | Blur validation যা ধরতে পারে না, তা ধরে |
| Typing-এর সময়, সাফল্যের জন্য | ✅ Password strength, বাকি character | ইতিবাচক feedback কোনো বাধা নয় |

> ⚠️ Live region-এর character counter পরিমিতভাবে ঘোষণা করুন। প্রতিটি keystroke-এ update হওয়া একটি polite region
> speech queue ভাসিয়ে দেয়। একটানা না করে নির্দিষ্ট সীমায় ঘোষণা করুন, যেমন "20 characters remaining"।

### Form-এর জন্য WCAG 2.2 কী যোগ করেছে

ছয়টি নতুন criterion-এর তিনটিই form-এর criterion, আর তিনটিই সাধারণ ব্যর্থতা।

- **3.3.7 Redundant Entry (A)** — একই flow-এ একই তথ্য দুবার চাইবেন না। যে billing address delivery address-এর
  পুনরাবৃত্তি, তার একটি copy option বা আগে থেকে পূরণ করা value লাগে।
- **3.3.8 Accessible Authentication (Minimum) (AA)** — login করতে কোনো cognitive function test (মনে রাখা বা ধাঁধার কাজ)
  নয়। **Paste কাজ করতেই হবে**, আর password manager আটকানো যাবে না। ধাঁধা-ধাঁচের verification-এর একটি বিকল্প লাগে।
  Password field-এ paste আটকানো একটি `onpaste` handler এখন একটি conformance failure।
- **2.5.8 Target Size (Minimum) (AA)** — checkbox, radio আর তাদের label-এর 24 × 24 CSS px target লাগে, অথবা সমতুল্য
  ফাঁকা জায়গা। Input-কে তার `<label>`-এ wrap করলে সাধারণত এটা বিনা খরচে ঠিক হয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --- | --- | --- |
| যেকোনো একক control | `<label for>` | একমাত্র association, যেটা click target আর ঘোষণা দুটোই দেয় |
| Radio, checkbox set, কয়েক অংশের field | `<fieldset>` আর `<legend>` | Group-এর নাম প্রতিটি control-এর আগে বসে |
| শুধু একটি icon-ওয়ালা search field | `aria-label`, অথবা visually-hidden label-এর লেখা | নির্দেশ করার মতো কোনো দৃশ্যমান label নেই |
| একটি field validation-এ fail করেছে | `aria-invalid`, সঙ্গে `aria-describedby` | Field-স্তরের, focus-এ ঘোষিত |
| একটি submit কয়েকটি error নিয়ে fail করেছে | Link-সহ focus করা summary | এক জায়গায় সংখ্যা আর পথ দুটোই দেয় |
| একটি async submit সফল হয়েছে | `role="status"` | Cursor কেড়ে না নিয়ে নিশ্চিত করে |

## সাধারণ ভুল

**❌ Placeholder-কেই label বানানো**

> Typing শুরু হলেই এটা উধাও হয়, সাধারণত contrast-এ fail করে, আর user field-টি কী চেয়েছিল তা দেখার কোনো উপায় পান না।

**❌ কোনো message ছাড়া `aria-invalid="true"`**

> User শোনেন "invalid", আর কিছুই জানতে পারেন না। এটাকে `aria-describedby` আর একটি নির্দিষ্ট বাক্যের সঙ্গে জুড়ে দিন।

**❌ শুধু রঙ দিয়ে error-এর লেখা**

> একটি লাল border আর লাল লেখা একজন colourblind user-কে কিছুই বলে না, আর একটি screen reader-কে তো একেবারেই কিছু না। লেখা
> আর একটি icon ব্যবহার করুন, সঙ্গে programmatic association।

**❌ Password বা one-time-code field-এ paste আটকানো**

> 3.3.8-এর অধীনে এটা একটি WCAG 2.2 AA failure। এটা password manager-ও ভেঙে দেয়, যেটা এই field-গুলোর বেশিরভাগ user-এর
> ভরসার accessibility tool।

**✅ শুধু কী ভুল নয়, কী গ্রহণযোগ্য তা-ও বলা**

> "Enter a date in the format DD/MM/YYYY" দিয়ে কিছু করা যায়। "Invalid date" একটি কানাগলি।

## 🔑 মূল শিক্ষা

- প্রতিটি control-এর একটি programmatic label (`<label for>`) লাগে। Placeholder হলো format-এর উদাহরণ, কখনো label নয়।
- Radio, checkbox set আর কয়েক অংশের field-এ `<fieldset>` আর `<legend>` লাগে, যাতে প্রতিটি option-এর সঙ্গে group-এর নাম ঘোষিত হয়।
- `autocomplete` token একটি accessibility requirement। `new-password` বনাম `current-password` ঠিক করে password manager সহযোগিতা করবে কি না।
- একটি error-কে ঘোষিত হতে হবে, `aria-describedby` দিয়ে যুক্ত হতে হবে, `aria-invalid` দিয়ে চিহ্নিত হতে হবে, আর কী গ্রহণযোগ্য সে বিষয়ে নির্দিষ্ট হতে হবে।
- WCAG 2.2 login field-এ paste আটকানোকে একটি conformance failure বানিয়েছে, আর একই তথ্য দুবার চাওয়াকেও।

## Interview-এর প্রশ্ন

**Q: একটি form label-এর বদলে placeholder ব্যবহার করে। Designer-কে আপনি কী বলবেন?**

যে এটা তিন দিক থেকে ব্যর্থ। Placeholder প্রথম keystroke-এই উধাও হয়, তাই user field-টি কী চেয়েছিল তা যাচাই করতে পারেন
না। এর contrast প্রায় সবসময় 4.5 : 1-এর নিচে। আর screen reader এটা অসংগতভাবে ঘোষণা করে, তাই কিছু user কোনো field-এর
নামই পান না। আমি field-গুলোর ওপরে দৃশ্যমান label চাইব। Placeholder-কে label-এর পাশে format-এর উদাহরণ হিসেবে ফিরিয়ে
দেওয়ার প্রস্তাব দেব, যে একটি কাজ এটা ভালো পারে।

**Q: একটি validation error accessible-ভাবে কীভাবে জানাবেন?**

চারটি জিনিস একসঙ্গে। `aria-describedby` message-কে field-এর সঙ্গে যুক্ত করে, আর field-টি `aria-invalid="true"` দিয়ে
চিহ্নিত হয়। লেখাটা বলে কী গ্রহণযোগ্য, শুধু কিছু একটা ভুল তা নয়। আর error দেখা দিলেই ঘোষিত হয়। একটি একক field-স্তরের
error-এর জন্য একটি live region ব্যবহার করুন, অথবা ব্যর্থ submit-এ একটি error summary-তে focus সরান। Summary প্রতিটি
সমস্যাকে তার field-এর একটি link হিসেবে তালিকাভুক্ত করে। এতে keyboard user-রা খোঁজাখুঁজির বদলে একটি পথ পান।

**Q: Validation কখন চালানো উচিত?**

Field-স্তরের যাচাই blur-এ, আর পুরো যাচাই submit-এ। প্রতিটি keystroke-এ validate করলে user প্রথম অক্ষর লেখার সময়েই
"invalid email" ঘোষিত হয়। একটি live region-এ এটা অসত্য আর গোলমেলে, দুটোই। Typing-এর সময় ইতিবাচক feedback ঠিক আছে,
যেমন একটি strength meter বা বাকি character-এর সংখ্যা। শুধু প্রতিটি character-এ এটা ঘোষণা করবেন না।

**Q: `autocomplete` attribute সুবিধার চেয়ে বেশি একটি accessibility-র বিষয় কেন?**

কারণ এগুলো typing বাঁচায়, আর motor impairment থাকা user-দের জন্য typing-ই ব্যয়বহুল অংশ। এগুলো সেই প্রতিলিপির ভুলও
আটকায়, যেগুলোর কারণে form ছেড়ে দেওয়া হয়। WCAG 1.3.5 সাধারণ field-গুলোর জন্য AA level-এ token-গুলো বাধ্যতামূলক করে।
বাস্তবে সবচেয়ে গুরুত্বপূর্ণ জোড়া হলো `new-password` বনাম `current-password`। এটা ভুল করলে form সেই password
manager-এর সঙ্গে লড়াই করে, যার ওপর user নির্ভর করেন।

**Q: WCAG 2.2 login form নিয়ে কী বদলেছে?**

এটা AA level-এ 3.3.8 Accessible Authentication যোগ করেছে। Login করতে কোনো cognitive function test লাগা চলবে না। Paste
কাজ করতে হবে, password manager আটকানো যাবে না, আর যেকোনো ধাঁধা-ধাঁচের যাচাইয়ের একটি বিকল্প পথ লাগবে। এর পাশাপাশি,
3.3.7 Redundant Entry বলে একটি flow একই তথ্য দুবার চাইতে পারবে না। এটা সেই ক্ষেত্র, যেখানে billing address delivery
address-এর পুনরাবৃত্তি করে। দুটোই এত সাম্প্রতিক যে বেশিরভাগ চালু checkout এগুলোতে fail করে।

## এরপর কী পড়বেন

- [Chapter ?? — Keyboard ও Focus Management](#ch-keyboard-and-focus) — একটি submit fail করলে focus কোথায় যায়
- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — live region, আর এই field-গুলো যে state set করে
- [Chapter ?? — Form State](#ch-form-state) — validation আর submission-এর framework-এর দিক
