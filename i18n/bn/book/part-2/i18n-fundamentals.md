---
sourceHash: "2fb213626599f93c3ad7d3f0b16f0cc99f886632b6caadb0ee1cee4f8dfdb5d9"
title: "Internationalisation ও Intl API"
translatedAt: "2026-10-17T01:10:50.496Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Internationalisation ও Intl API {#ch-i18n-fundamentals}

> এমন UI বানান, যেটা নতুন করে না লিখেই অন্য ভাষায় ship করা যায়: পুরো বাক্যের key, locale-এর ঠিক করা plural, `Intl` দিয়ে formatting, আর right-to-left-এর জন্য একটিই stylesheet।

**এই অধ্যায়ে:** i18n বনাম l10n · translation key মানে পুরো একটি বাক্য · plural-এর নিয়ম ভাষাভেদে আলাদা · `Intl` দিয়ে date, number আর time zone · logical property দিয়ে right-to-left

## 💡 মূল ধারণা

Internationalisation মানে অনুবাদ নয়। এর মানে হলো আপনার interface ভাষা নিয়ে যত ধারণা ধরে নিয়েছে, সেগুলো সব
সরিয়ে ফেলা। লেখা বাঁ থেকে ডানে পড়া হয়। একটি noun-এর plural রূপ দুটি। Date মানে দিন, slash, মাস। Label তার
button-এ এঁটে যায়।

এসব ধারণা সরিয়ে ফেললে নতুন ভাষা যোগ করা শুধু content-এর কাজ। এই কাজ বাদ দিলে নতুন ভাষা মানে নতুন করে লেখা,
কারণ প্রতিটি ধারণা markup আর layout-এর ভেতরে গেঁথে আছে।

| | Internationalisation (i18n) | Localisation (l10n) |
| - | --------------------------- | ------------------- |
| এটা কী | যে কাঠামো ভাষা বদলানো সম্ভব করে | একটি locale-এর content আর রীতিনীতি |
| দায় কার | Engineer-দের | Translator আর আঞ্চলিক team-এর |
| খরচ কেমন | একবারের, তবে পিছিয়ে দিলে খুব দ্রুত বাড়ে | প্রতিটি ভাষার জন্য সমান হারে |

> পাইপলাইনটা engineer-দের দায়, আর কোন কোন ভাষা আসছে তা জানার আগেই সেটা বসিয়ে রাখতে হয়।

## কীভাবে কাজ করে

### Translation key মানে পুরো একটি বাক্য

i18n-এর সবচেয়ে সাধারণ defect হলো টুকরো জোড়া দিয়ে বানানো বাক্য। ভাষাভেদে শব্দের ক্রম আলাদা, তাই translator
একটি টুকরো আলাদা করে অনুবাদ করতে পারেন না।

```typescript
// ❌ German and Japanese put these pieces in a different order,
// and the translator sees three strings with no sentence to work from.
`${t("you.have")} ${count} ${t("unread.messages")}`;

// ✅ One key, one whole sentence, with named placeholders.
t("inbox.unread", { count });
```

Key-এর নাম দিন **অর্থ** দিয়ে, যেমন `document.action.save`। ইংরেজি লেখাটাকেই কখনো key বানাবেন না। যেদিন কেউ
ইংরেজি copy বদলাবে, সেদিন সব অনুবাদ চুপচাপ বিচ্ছিন্ন হয়ে যাবে।

### Locale থাকে URL-এ

শুধু `localStorage`-এ রাখা locale share করা যায় না, link দেওয়া যায় না, crawl হয় না, server-এ render-ও হয় না।
এটা রাখুন `/de/…`-এর মতো URL segment-এ। দুটির মধ্যে টাই ভাঙতে সংরক্ষিত পছন্দ ব্যবহার করুন, আর শেষ ভরসা
`navigator.languages`। User নিজে যা বেছে নিয়েছেন, সেটা সবসময় detect করা locale-এর চেয়ে আগে।

Locale বদলানো মানে তিনটি side effect। শেষের দুটি মানুষ ভুলে যায়, অথচ screen reader আর right-to-left layout ওই
দুটির ওপরেই নির্ভর করে।

```typescript
const RTL_LANGUAGES: readonly string[] = ["ar", "he", "fa", "ur"];

async function setLocale(locale: string): Promise<void> {
  await loadMessages(locale);
  // lang drives hyphenation, quotation marks and the screen reader's voice.
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL_LANGUAGES.includes(locale.split("-")[0]) ? "rtl" : "ltr";
}
```

### Plural-এর নিয়ম locale-এর

ইংরেজিতে plural রূপ দুটি। এটা ইতিহাসের একটি দুর্ঘটনা, ভাষার কোনো নিয়ম নয়। চীনা ভাষায় রূপ একটিই। রুশ ভাষায় পূর্ণ
সংখ্যার জন্য তিনটি, শেষ অঙ্ক দেখে ঠিক হয়। আরবিতে ছয়টি, যার একটি শুধু ঠিক দুইয়ের জন্য।

Unicode CLDR (locale-এর shared data) ছয়টি category-র নাম দেয়: `zero`, `one`, `two`, `few`, `many` আর `other`।
প্রতিটি ভাষা এর কয়েকটি ব্যবহার করে। এই data browser-এর সঙ্গেই আসে, তাই আন্দাজ না করে locale-কেই জিজ্ঞেস করুন।

**কোনো সংখ্যা কোন রূপ নেবে, platform-কে জিজ্ঞেস করা:**

```typescript
new Intl.PluralRules("en").select(21); // "other"
new Intl.PluralRules("ru").select(21); // "one" — Russian 21 takes the singular
new Intl.PluralRules("ar").select(2); //  "two"

// Which categories does a locale need? This is the check a translation-file lint should run.
new Intl.PluralRules("ru").resolvedOptions().pluralCategories; // ["few", "many", "one", "other"]
```

তাই `count === 1 ? "item" : "items"` কোনো সরলীকরণ নয়। এটা একটি bug, যা ইংরেজিতে শুধু চোখে পড়ে না।
Translation library `count` দেখে key বেছে নেয়, তাই component সব locale-এ একই থাকে। কখনো একটি বাক্য দুই দিক থেকে
বদলায়, যেমন plural আর gender। ICU MessageFormat সেটা একটি string-এই রাখে:
`{count, plural, one {# document} other {# documents}}`।

### Date, number আর time zone

একই value প্রতিটি locale আলাদাভাবে লেখে। জার্মানিতে `1.234,56` মানে প্রায় এক হাজার। `03/04/2026` এক দেশে মার্চ,
আরেক দেশে এপ্রিল। সঠিক উত্তরটা আসলে data, আর browser সেটা দেয় `Intl` API হিসেবে। `Intl`-কে দিন একটি value, একটি
locale আর আপনি কী চান। Formatted string কখনো হাতে বানাবেন না।

**একদম শেষ ধাপে format করা, time zone স্পষ্ট করে দিয়ে:**

```typescript
const when = new Date("2026-03-04T14:30:00Z");

// Always name the time zone. Without it, the output depends on the viewer's machine.
const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});
dateFmt.format(when); // 4. März 2026 um 15:30

// The locale picks the format. The currency picks the symbol and the decimal places.
new Intl.NumberFormat("nb-NO", { style: "currency", currency: "EUR" }).format(1234.5); // 1 234,50 €
new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(1234); //   ￥1,234

new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }).format(-1, "day"); // yesterday
```

তিনটি নিয়ম মানলে এটা ঠিক থাকে। **একবার বানিয়ে বারবার ব্যবহার করুন**: formatter বানাতে যে খরচ, তা দিয়ে format
করার চেয়ে অনেক বেশি। এটা module scope-এ রাখুন, অথবা locale দিয়ে key করা একটি map-এ। **String নয়, value পাঠান**:
server `"1.234,56"` পাঠালে সেটা এমন value হয়ে যায়, যা client আবার render, sort বা যোগ করতে পারে না। **মুহূর্ত রাখুন
UTC-তে**, আর ভবিষ্যতের appointment রাখুন দেয়ালঘড়ির সময় আর একটি IANA zone-এর নাম দিয়ে (যেমন `Europe/Berlin`)।
সরকার daylight-saving-এর নিয়ম বদলায়, আর তখন সংরক্ষিত offset ভুল হয়ে যায়।

> ⚠️ **যা বদলাতে থাকে:** `Temporal` API browser-এ আসছে, আর হিসাব, zone-সহ date-time আর duration-এর জন্য `Date`-এর
> জায়গা নিচ্ছে। টেকসই নীতি একই থাকে: মুহূর্ত UTC-তে, zone IANA identifier হিসেবে, আর formatting একদম শেষ ধাপে।
> `Intl` format করে; হিসাব করে না।

### Right-to-left মানে একটিই stylesheet

`dir="rtl"` দিলে browser inline দিক উল্টে দেয়, flexbox আর grid-ও উল্টে যায়। মিশ্র লেখার ওপর bidirectional
algorithm-ও চালায়। কিন্তু আপনি যা কিছু `left` আর `right` দিয়ে লিখেছেন, সেগুলো যেখানে ছিল সেখানেই থেকে যায়। পুরো
bug-টা এটাই।

| Physical — RTL-এ ভাঙে | Logical — দুই দিকেই চলে |
| -------------------- | ---------------------- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` | `text-align: start` |

```css
/* One declaration that resolves against dir. No [dir="rtl"] override to keep in sync. */
.panel {
  margin-inline-start: 2rem;
  border-inline-start: 3px solid var(--accent);
}
```

শুধু সেই icon উল্টাবেন, যেগুলো পড়ার দিক বরাবর ইঙ্গিত করে, যেমন arrow, chevron আর reply। Home, search আর media
control যেমন আছে তেমনই থাকে। অজানা ভাষায় user-এর লেখা content-এর জন্য `dir="auto"` দিন, তাহলে browser লেখা দেখেই
দিক বুঝে নেয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী বেছে নেবেন | কেন |
| --------- | ------------ | --- |
| আজ একটি locale, পরে আরও আসতে পারে | String আলাদা করুন আর `Intl` ব্যবহার করুন; library বাদ | String আলাদা করাই খরচের অংশ, আর সেটা পরে সস্তা হয় না |
| Server-rendered app | প্রতিটি request-এ server-এই locale ঠিক করুন | ভুল ভাষায় render করে পরে ঠিক করলে সেটা চোখে পড়ার মতো flash |
| সাধারণ গোনা যায় এমন noun | Plural suffix key, library বেছে নেয় | সবচেয়ে কম ঝামেলা, আর translator-রা রীতিটা জানেন |
| Plural-এর সঙ্গে gender | ICU MessageFormat | Suffix key দিয়ে করলে প্রতিটি combination-এর জন্য আলাদা key লাগত |
| যেকোনো নতুন stylesheet | প্রথম commit থেকেই logical property | লিখতে একই পরিশ্রম, আর পরে RTL migration লাগে না |
| Date-এর হিসাব — এক মাস যোগ, দুটি date-এর ব্যবধান | `Temporal` বা কোনো date library | `Intl` value format করে; হিসাব করে না |

## সাধারণ ভুল

**❌ ভুল — নির্দিষ্ট width-এর control-এ লেখা:**

```tsx
// German is often 30% longer than English. The label clips.
<button className="w-24 truncate">{t("actions.submit")}</button>;
```

**✅ ঠিক — control-এর মাপ content-কেই ঠিক করতে দিন:**

```tsx
<button className="min-w-24 px-4 py-2">{t("actions.submit")}</button>;
```

**❌ ভুল — শুধু ইংরেজির দরকারি plural রূপগুলো ship করা।** রুশ file-এ `_one` আর `_other` আছে, কিন্তু `_few` বা
`_many` নেই, তাহলে 2, 3 আর 4-এর জন্য `other`-এ ফিরে যায়। কোনো error throw হয় না। শুধু প্রত্যেক রুশ user একটি
ব্যাকরণের ভুল পড়েন। Translation file-গুলো `pluralCategories`-এর সঙ্গে মিলিয়ে lint করুন।

**❌ ভুল — ইংরেজি লেখা দিয়ে RTL test করা।** ইংরেজি copy-র ওপর `dir="rtl"` দিলে সহজ layout bug-গুলো ধরা পড়ে, আর আসলগুলো
লুকিয়ে থাকে: মিশ্র দিকের যতিচিহ্ন, কেটে যাওয়া label, উল্টানো icon যা উল্টানোর কথা ছিল না। আসল আরবি বা হিব্রু string
দিয়ে test করুন, অথবা pseudo-locale দিয়ে (অনুবাদের মতো দেখতে নকল লেখা)।

## 🔑 মূল শিক্ষা

- Internationalisation ভাষা নিয়ে ধরে নেওয়া ধারণাগুলো সরায়। Localisation একটি locale-এর content জোগায়।
- Translation key-এ থাকে পুরো একটি বাক্য, কারণ শব্দের ক্রম আলাদা হয়, আর একটি টুকরো আলাদা করে অনুবাদ করা যায় না।
- Plural রূপ কয়টি, তা locale-এর ব্যাপার। তাই `count === 1` না লিখে `Intl.PluralRules`-কে জিজ্ঞেস করুন।
- Date, number আর currency format করুন cache করা `Intl` formatter আর স্পষ্ট time zone দিয়ে। Server থেকে কাঁচা value পাঠান।
- Right-to-left support মানে logical property-তে লেখা একটিই stylesheet, সঙ্গে root element-এ `dir` আর `lang`।

## Interview-এর প্রশ্ন

**Q: অনুবাদ করা টুকরো জোড়া দিয়ে বাক্য বানানো যায় না কেন?**

শব্দের ক্রম সব ভাষায় এক নয়। "You have 3 unread messages" জার্মানে গিয়ে ক্রম বদলায়, জাপানিতে কাঠামোই বদলে যায়।
টুকরো হাতে পাওয়া translator-এর সামনে ভাবার মতো কোনো বাক্যই থাকে না। প্রতিটি বাক্যের জন্য একটি key, নাম দেওয়া
placeholder সহ, থাকলে translator ব্যাকরণ অনুযায়ী placeholder সরিয়ে বসাতে পারেন।

**Q: `count === 1 ? 'item' : 'items'` ভুল কেন?**

এটা ইংরেজি ব্যাকরণকে সর্বজনীন ধরে নেয়। রুশ ভাষা রূপ বাছে শেষ অঙ্ক দেখে, তাই 21 নেয় singular। আরবিতে ঠিক দুইয়ের জন্য
আলাদা রূপ আছে, আর চীনা ভাষায় plural-ই নেই। সঠিক উপায় হলো locale-কে জিজ্ঞেস করা, `Intl.PluralRules` দিয়ে, অথবা
এর ওপর বানানো কোনো translation library দিয়ে।

**Q: কয়েকটি দেশের user-কে দাম কীভাবে দেখাবেন?**

Server পাঠায় সংখ্যায় পরিমাণটা আর ISO currency code, কখনো formatted string নয়। Client format করে
`Intl.NumberFormat` দিয়ে, user-এর locale আর ওই currency ব্যবহার করে। ফলে নরওয়ের user euro চিহ্নের চারপাশে
নরওয়ের separator দেখেন, আর yen ঠিকভাবেই কোনো দশমিক ঘর পায় না।

**Q: চালু একটি app-এ right-to-left support কীভাবে যোগ করবেন?**

ঠিক হওয়া locale থেকে root element-এ `dir` আর `lang` বসান। Physical CSS property বদলে logical property দিন। কাজের
বেশিরভাগটা এটাই, আর একটি lint rule দিয়ে এটা এগিয়ে নেওয়া যায়। তারপর আসল RTL copy দিয়ে যাচাই করুন। বাকি bug-গুলো
লুকিয়ে থাকে absolutely positioned element, icon আর `row-reverse`-এ।

**Q: কখন i18n library যোগ করবেন না?**

যখন locale একটিই আর দ্বিতীয়টির কোনো পরিকল্পনা নেই, অথবা যখন পুরো জিনিসটা হাতে গোনা কয়েকটি static label। String
আলাদা করা আর `Intl` ব্যবহার করতে প্রায় কোনো খরচ নেই, আর দরজাটাও খোলা থাকে। দ্বিতীয় locale সত্যিই না আসা পর্যন্ত
namespace loading-সহ পুরো translation runtime শুধু বাড়তি বোঝা।

## এরপর কী পড়বেন

- [Chapter ?? — Advanced CSS](#ch-advanced-css) — যে layout primitive-গুলোর ভেতরে logical property বসে
- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — `lang` যা নিয়ন্ত্রণ করে, তার বাকি অর্ধেক
