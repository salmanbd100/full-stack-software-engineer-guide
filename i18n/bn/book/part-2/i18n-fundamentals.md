---
sourceHash: "2fb213626599f93c3ad7d3f0b16f0cc99f886632b6caadb0ee1cee4f8dfdb5d9"
title: "Internationalisation ও Intl API"
translatedAt: "2026-10-12T12:09:09.155Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Internationalisation ও Intl API {#ch-i18n-fundamentals}

> এমন একটি UI বানান, যেটা rewrite ছাড়াই অন্য ভাষায় ship করা যায় — পুরো বাক্যের key, locale-এর ঠিক করা plural, `Intl` দিয়ে formatting, আর right-to-left-এর জন্য একটিই stylesheet।

**এই অধ্যায়ে:** i18n বনাম l10n · একটি translation key মানে একটি পুরো বাক্য · plural-এর নিয়ম ভাষাভেদে আলাদা · `Intl` দিয়ে date, number আর time zone · logical property দিয়ে right-to-left

## 💡 মূল ধারণা

Internationalisation মানে অনুবাদ নয়। এর মানে হলো ভাষা নিয়ে আপনার interface যত অনুমান করে, সবগুলো সরিয়ে ফেলা।
লেখা বাঁ থেকে ডানে পড়া হয়। একটি noun-এর plural রূপ দুটো। Date মানে দিন, slash, মাস। একটি label তার button-এ
এঁটে যায়।

এই অনুমানগুলো সরিয়ে ফেললে, নতুন ভাষা যোগ করা শুধু একটি content-এর কাজ। এই কাজ বাদ দিলে, নতুন ভাষা যোগ করা মানে
rewrite। কারণ প্রতিটি অনুমান markup আর layout-এর ভেতরে গেঁথে আছে।

| | Internationalisation (i18n) | Localisation (l10n) |
| - | --------------------------- | ------------------- |
| এটা কী | যে infrastructure ভাষা বদলানো সম্ভব করে | একটি locale-এর content আর রীতিনীতি |
| কার দায়িত্ব | Engineer-দের | Translator আর আঞ্চলিক team-এর |
| খরচের ধরন | নির্দিষ্ট, আর পিছিয়ে দিলে খাড়াভাবে বাড়ে | প্রতিটি ভাষায় সমানুপাতিক |

> Plumbing-এর দায়িত্ব engineer-দের। আর কোন কোন ভাষা আসছে, সেটা কেউ জানার আগেই এটা বসিয়ে ফেলতে হয়।

## কীভাবে কাজ করে

### একটি translation key মানে একটি পুরো বাক্য

i18n-এর সবচেয়ে সাধারণ ত্রুটি হলো টুকরো জুড়ে বানানো বাক্য। ভাষাভেদে শব্দের ক্রম আলাদা। তাই একজন translator
একটি টুকরোকে আলাদাভাবে অনুবাদ করতে পারেন না।

```typescript
// ❌ German and Japanese put these pieces in a different order,
// and the translator sees three strings with no sentence to work from.
`${t("you.have")} ${count} ${t("unread.messages")}`;

// ✅ One key, one whole sentence, with named placeholders.
t("inbox.unread", { count });
```

Key-এর নাম দিন **অর্থ** অনুযায়ী, যেমন `document.action.save`। English লেখাকে কখনো key হিসেবে ব্যবহার করবেন না।
যেদিন কেউ English copy বদলাবেন, সেদিন প্রতিটি অনুবাদ চুপচাপ বিচ্ছিন্ন হয়ে যাবে।

### Locale থাকে URL-এ

যে locale শুধু `localStorage`-এ থাকে, সেটা share, link, crawl বা server-render করা যায় না। এটাকে `/de/…`-এর মতো
একটি URL segment-এ রাখুন। সংরক্ষিত পছন্দকে tiebreaker হিসেবে ব্যবহার করুন, আর শেষে `navigator.languages`-এ
fall back করুন। স্পষ্টভাবে বেছে নেওয়া locale সবসময় detect করা locale-এর চেয়ে অগ্রাধিকার পায়।

Locale বদলানো মানে তিনটি side effect। মানুষ শেষ দুটো ভুলে যায়, অথচ screen reader আর right-to-left layout সেগুলোর
ওপরই নির্ভর করে।

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

English-এ plural রূপ দুটো। এটা ইতিহাসের একটি দুর্ঘটনা, ভাষার কোনো নিয়ম নয়। Chinese-এ রূপ একটি। Russian-এ পূর্ণসংখ্যার
জন্য রূপ তিনটি, শেষ অঙ্ক দেখে বেছে নেওয়া হয়। Arabic-এ রূপ ছয়টি, যার মধ্যে ঠিক দুইয়ের জন্য একটি আলাদা রূপও আছে।

Unicode CLDR (শেয়ার করা locale data) ছয়টি category-র নাম দেয়: `zero`, `one`, `two`, `few`, `many` আর
`other`। প্রতিটি ভাষা এর একটি subset ব্যবহার করে। Browser এই data সঙ্গে নিয়েই আসে, তাই আপনি অনুমান না করে locale-কে
জিজ্ঞেস করেন।

**একটি number কোন রূপ নেবে, সেটা platform-কে জিজ্ঞেস করা:**

```typescript
new Intl.PluralRules("en").select(21); // "other"
new Intl.PluralRules("ru").select(21); // "one" — Russian 21 takes the singular
new Intl.PluralRules("ar").select(2); //  "two"

// Which categories does a locale need? This is the check a translation-file lint should run.
new Intl.PluralRules("ru").resolvedOptions().pluralCategories; // ["few", "many", "one", "other"]
```

তাই `count === 1 ? "item" : "items"` কোনো সরলীকরণ নয়। এটা একটি bug, যেটা English-এ কাকতালীয়ভাবে চোখে পড়ে না।
Translation library `count` থেকে key বেছে নেয়, তাই component প্রতিটি locale-এ একই থাকে। কখনো কখনো একটি বাক্য দুই
দিক থেকে বদলায়, যেমন plural আর gender। ICU MessageFormat সেটাকে একটি string-এই রাখে:
`{count, plural, one {# document} other {# documents}}`।

### Date, number আর time zone

প্রতিটি locale একই value আলাদাভাবে লেখে। Germany-তে `1.234,56` মানে প্রায় এক হাজার। `03/04/2026` এক দেশে March,
আরেক দেশে April। সঠিক উত্তরটা হলো data, আর browser সেটা `Intl` API হিসেবে সঙ্গে নিয়ে আসে। `Intl`-কে একটি value,
একটি locale আর একটি উদ্দেশ্য দিন। Formatted string কখনো হাতে বানাবেন না।

**Edge-এ formatting, একটি স্পষ্ট time zone দিয়ে:**

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

তিনটি নিয়ম এটাকে সঠিক করে। **একবার বানান, বারবার ব্যবহার করুন**: একটি formatter বানানোর খরচ সেটা দিয়ে format করার
চেয়ে অনেক বেশি। এটাকে module scope-এ রাখুন, অথবা locale-কে key করে একটি map-এ রাখুন। **String নয়, value পাঠান**:
যে server `"1.234,56"` পাঠায়, সে এমন একটি value বানিয়েছে, যেটা client আবার render, sort বা যোগ করতে পারে না।
**Instant UTC-তে সংরক্ষণ করুন**, আর ভবিষ্যতের একটি appointment সংরক্ষণ করুন wall-clock time আর একটি IANA zone-এর
নাম (যেমন `Europe/Berlin`) হিসেবে। সরকার daylight-saving-এর নিয়ম বদলায়, আর তখন সংরক্ষিত offset ভুল হয়ে যায়।

> ⚠️ **যা বদলাতে থাকে:** `Temporal` API browser-এ আসছে, আর arithmetic, zoned date-time ও duration-এর জন্য
> `Date`-কে প্রতিস্থাপন করছে। স্থায়ী নীতিটা একই থাকে: instant UTC-তে, zone IANA identifier হিসেবে, আর formatting
> edge-এ। `Intl` format করে; হিসাব করে না।

### Right-to-left মানে একটিই stylesheet

`dir="rtl"` set করুন, আর browser inline direction উল্টে দেয়, flexbox আর grid-ও উল্টে দেয়। মেশানো লেখার ওপর সে
bidirectional algorithm-ও চালায়। কিন্তু আপনি যা কিছু `left` আর `right` হিসেবে লিখেছেন, সেগুলো যেখানে ছিল সেখানেই
থাকে। পুরো bug এটুকুই।

| Physical — RTL-এ ভেঙে যায় | Logical — দুটোতেই কাজ করে |
| ------------------------ | ----------------------- |
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

শুধু সেই icon-গুলো mirror করুন, যেগুলো পড়ার দিক বরাবর নির্দেশ করে, যেমন arrow, chevron আর reply। Home, search আর
media control যেমন আছে তেমনই থাকে। অজানা ভাষার user-generated content-এর জন্য `dir="auto"` browser-কে লেখা থেকেই
direction বুঝে নিতে দেয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --------- | ------ | --- |
| আজ একটি locale, পরে আরও আসতে পারে | String extract করুন আর `Intl` ব্যবহার করুন; library বাদ দিন | Extraction-ই ব্যয়বহুল অংশ, আর এটা পরে সস্তা হয় না |
| Server-rendered app | প্রতিটি request-এ server-এ locale ঠিক করুন | ভুল ভাষায় render করে তারপর ঠিক করলে একটি দৃশ্যমান flash হয় |
| সাধারণ গোনা noun | Plural suffix key, library বেছে নেয় | সবচেয়ে কম আনুষ্ঠানিকতা, আর translator-রা রীতিটা জানেন |
| Plural আর gender একসঙ্গে | ICU MessageFormat | Suffix key-তে প্রতিটি combination-এর জন্য একটি করে key লাগত |
| যেকোনো নতুন stylesheet | প্রথম commit থেকেই logical property | একই পরিমাণ typing, আর পরে কোনো RTL migration নেই |
| Date arithmetic — এক মাস যোগ, দুটো date-এর পার্থক্য | `Temporal` বা একটি date library | `Intl` value format করে; হিসাব করে না |

## সাধারণ ভুল

**❌ ভুল — নির্দিষ্ট width-এর control-এ লেখা:**

```tsx
// German is often 30% longer than English. The label clips.
<button className="w-24 truncate">{t("actions.submit")}</button>;
```

**✅ সঠিক — content-ই control-এর আকার ঠিক করুক:**

```tsx
<button className="min-w-24 px-4 py-2">{t("actions.submit")}</button>;
```

**❌ ভুল — শুধু English-এর দরকারি plural রূপগুলো ship করা।** যে Russian file-এ `_one` আর `_other` আছে,
কিন্তু `_few` বা `_many` নেই, সেটা 2, 3 আর 4-এর জন্য `other`-এ fall back করে। কিছুই throw করে না। প্রতিটি Russian
user একটি ব্যাকরণের ভুল পড়েন। Translation file-গুলোকে `pluralCategories`-এর সঙ্গে lint করুন।

**❌ ভুল — English লেখা দিয়ে RTL test করা।** English copy-র ওপর `dir="rtl"` সহজ layout bug-গুলো খুঁজে পায়, আর
আসলগুলো লুকিয়ে রাখে: মেশানো direction-এর punctuation, কেটে যাওয়া label, mirror হওয়া icon যেগুলোর mirror হওয়ার
কথা নয়। আসল Arabic বা Hebrew string দিয়ে test করুন, অথবা একটি pseudo-locale (অনুবাদের অনুকরণ করা নকল লেখা) দিয়ে।

## 🔑 মূল শিক্ষা

- Internationalisation ভাষা নিয়ে অনুমানগুলো সরিয়ে দেয়। Localisation একটি locale-এর content জোগায়।
- একটি translation key একটি পুরো বাক্য ধরে রাখে, কারণ শব্দের ক্রম আলাদা, আর একটি টুকরো আলাদাভাবে অনুবাদ করা যায় না।
- Plural রূপের সংখ্যা locale-এর ব্যাপার, তাই `count === 1` না লিখে `Intl.PluralRules`-কে জিজ্ঞেস করুন।
- Date, number আর currency format করুন একটি cache করা `Intl` formatter আর একটি স্পষ্ট time zone দিয়ে। Server থেকে raw value পাঠান।
- Right-to-left support মানে logical property-তে লেখা একটি stylesheet, সঙ্গে root element-এ `dir` আর `lang`।

## Interview-এর প্রশ্ন

**Q: অনুবাদ করা টুকরো জুড়ে কেন একটি বাক্য বানানো যায় না?**

শব্দের ক্রম সর্বজনীন নয়। "You have 3 unread messages" German-এ ক্রম বদলায়, আর Japanese-এ গঠনই বদলে যায়। একটি টুকরো
নিয়ে কাজ করা translator-এর সামনে ভাবার মতো কোনো বাক্য থাকে না। প্রতিটি বাক্যের জন্য একটি key, নাম দেওয়া
placeholder-সহ, translator-কে ব্যাকরণ অনুযায়ী placeholder সরানোর সুযোগ দেয়।

**Q: `count === 1 ? 'item' : 'items'` কেন ভুল?**

এটা English ব্যাকরণকে সর্বজনীন ধরে নেয়। Russian শেষ অঙ্ক দেখে রূপ বেছে নেয়, তাই 21 singular নেয়। Arabic-এ ঠিক
দুইয়ের জন্য একটি রূপ আছে, আর Chinese-এ কোনো plural-ই নেই। সঠিক সংস্করণ locale-কে জিজ্ঞেস করে, `Intl.PluralRules`
দিয়ে, অথবা সেটাকে wrap করা একটি translation library দিয়ে।

**Q: কয়েকটি দেশের user-দের একটি দাম কীভাবে দেখাবেন?**

Server সংখ্যার পরিমাণ আর ISO currency code পাঠায়, formatted string কখনো নয়। Client user-এর locale আর সেই currency
দিয়ে `Intl.NumberFormat`-এ format করে। তখন একজন Norwegian user একটি euro চিহ্নের চারপাশে Norwegian separator দেখেন,
আর yen ঠিকভাবেই কোনো দশমিক ঘর পায় না।

**Q: একটি চালু app-এ right-to-left support কীভাবে যোগ করবেন?**

ঠিক করা locale থেকে root element-এ `dir` আর `lang` set করুন। Physical CSS property-গুলো logical দিয়ে বদলে দিন।
কাজের বেশিরভাগ এটাই, আর একটি lint rule এটা চালিয়ে নিতে পারে। তারপর আসল RTL copy দিয়ে audit করুন। বাকি bug-গুলো
লুকিয়ে থাকে absolutely positioned element, icon আর `row-reverse`-এ।

**Q: কখন একটি i18n library যোগ করবেন না?**

যখন locale একটি, আর দ্বিতীয়টির কোনো পরিকল্পনা নেই। অথবা যখন পুরো জিনিসটা হাতে গোনা কয়েকটি static label। String
extract করা আর `Intl` ব্যবহার করার খরচ প্রায় শূন্য, আর দরজাটা খোলা থাকে। Namespace loading-সহ একটি পূর্ণ translation
runtime ততক্ষণ বাড়তি বোঝা, যতক্ষণ না সত্যিই একটি দ্বিতীয় locale আসে।

## এরপর কী পড়বেন

- [Chapter ?? — Advanced CSS](#ch-advanced-css) — যে layout primitive-গুলোর ভেতরে logical property বসে
- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — `lang` যা নিয়ন্ত্রণ করে, তার অন্য অর্ধেক
