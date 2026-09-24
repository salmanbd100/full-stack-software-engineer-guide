---
title: Internationalisation and the Intl APIs
part: 2
chapter: 12
slug: i18n-fundamentals
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-24
tags: [i18n, l10n, intl, pluralization, rtl, typescript]
in_book: true
---

# Internationalisation and the Intl APIs {#ch-i18n-fundamentals}

> Build a UI that ships in another language without a rewrite — whole-sentence keys, plurals the locale chooses, `Intl` formatting and one stylesheet for right-to-left.

**In this chapter:** i18n against l10n · a translation key is a whole sentence · plural rules differ per language · dates, numbers and time zones with `Intl` · right-to-left with logical properties

## 💡 The Core Idea

Internationalisation is not translation. It is removing every assumption your interface makes about
language: that text reads left to right, that a noun has two plural forms, that a date is day, slash,
month, and that a label still fits its button.

Remove those assumptions and adding a language is a content task. Skip it and adding a language is a
rewrite, because each assumption is baked into the markup and the layout.

| | Internationalisation (i18n) | Localisation (l10n) |
| - | --------------------------- | ------------------- |
| What it is | The infrastructure that makes language swappable | The content and conventions for one locale |
| Who owns it | Engineers | Translators and regional teams |
| Cost shape | Fixed, and rises steeply if deferred | Linear per language |

> Engineers own the plumbing, and it has to be laid before anyone knows which languages are coming.

## How It Works

### A translation key is a whole sentence

The most common i18n defect is a sentence built from fragments. Word order differs between languages,
so a translator cannot translate a fragment on its own.

```typescript
// ❌ German and Japanese put these pieces in a different order,
// and the translator sees three strings with no sentence to work from.
`${t("you.have")} ${count} ${t("unread.messages")}`;

// ✅ One key, one whole sentence, with named placeholders.
t("inbox.unread", { count });
```

Name keys for **meaning**, such as `document.action.save`. Never use the English text as the key: the
day someone edits the English copy, every translation silently detaches.

### The locale lives in the URL

A locale held only in `localStorage` cannot be shared, linked, crawled or server-rendered. Put it in a
URL segment such as `/de/…`, use a stored preference as the tiebreaker, and fall back to
`navigator.languages`. An explicit choice always outranks a detected one.

Switching locale is three side effects. The last two are the ones people forget, and they are what
screen readers and right-to-left layout depend on.

```typescript
const RTL_LANGUAGES: readonly string[] = ["ar", "he", "fa", "ur"];

async function setLocale(locale: string): Promise<void> {
  await loadMessages(locale);
  // lang drives hyphenation, quotation marks and the screen reader's voice.
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL_LANGUAGES.includes(locale.split("-")[0]) ? "rtl" : "ltr";
}
```

### Plural rules belong to the locale

English has two plural forms. That is an accident of history, not a rule of language. Chinese has one
form. Russian has three for whole numbers, chosen by the last digit. Arabic has six, including a form
for exactly two.

The Unicode CLDR data names six categories — `zero`, `one`, `two`, `few`, `many` and `other` — and each
language uses a subset. The browser ships this data, so you ask the locale instead of guessing.

**Asking the platform which form a number takes:**

```typescript
new Intl.PluralRules("en").select(21); // "other"
new Intl.PluralRules("ru").select(21); // "one" — Russian 21 takes the singular
new Intl.PluralRules("ar").select(2); //  "two"

// Which categories does a locale need? This is the check a translation-file lint should run.
new Intl.PluralRules("ru").resolvedOptions().pluralCategories; // ["few", "many", "one", "other"]
```

So `count === 1 ? "item" : "items"` is not a simplification. It is a bug that happens to be invisible
in English. Translation libraries select the key from `count`, so the component is the same in every
locale. When one sentence varies on two axes — plural and gender, for example — ICU MessageFormat keeps
it in one string: `{count, plural, one {# document} other {# documents}}`.

### Dates, numbers and time zones

Every locale writes the same value differently. `1.234,56` is about a thousand in Germany. `03/04/2026`
is March in one country and April in another. The correct answer is data, and the browser ships it as
the `Intl` APIs. Hand `Intl` a value, a locale and an intent. Never build a formatted string by hand.

**Formatting at the edge, with an explicit time zone:**

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

Three rules make this correct. **Construct once and reuse**: building a formatter costs far more than
formatting with it, so keep it at module scope or in a map keyed by locale. **Send values, not strings**:
a server that sends `"1.234,56"` has made a value the client cannot re-render, sort or add up. **Store
instants in UTC**, and store a future appointment as a wall-clock time plus an IANA zone name, because
governments change daylight-saving rules and a stored offset goes wrong.

> ⚠️ **Moving target:** the `Temporal` API is arriving in browsers and replaces `Date` for arithmetic,
> zoned date-times and durations. The durable principle stays the same: instants in UTC, zones as IANA
> identifiers, and formatting at the edge. `Intl` formats; it does not compute.

### Right-to-left is one stylesheet

Set `dir="rtl"` and the browser reverses the inline direction, flips flexbox and grid, and runs the
bidirectional algorithm over mixed text. Everything you wrote as `left` and `right` stays where it
was — and that is the whole bug.

| Physical — breaks in RTL | Logical — works in both |
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

Mirror only icons that point along the reading direction — arrows, chevrons, reply. Home, search and
media controls stay as they are. For user-generated content in an unknown language, `dir="auto"` lets
the browser infer direction from the text itself.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| One locale today, more plausible later | Extract strings and use `Intl`; skip the library | Extraction is the expensive part, and it does not get cheaper |
| Server-rendered app | Resolve the locale on the server, per request | Rendering the wrong language, then correcting it, is a visible flash |
| Plain counted noun | Plural suffix keys, selected by the library | Least ceremony, and translators know the convention |
| Plural combined with gender | ICU MessageFormat | Suffix keys would need one key per combination |
| Any new stylesheet | Logical properties from the first commit | Same typing, and no RTL migration later |
| Date arithmetic — add a month, diff two dates | `Temporal` or a date library | `Intl` formats values; it does not calculate them |

## Common Mistakes

**❌ Wrong — text in a fixed-width control:**

```tsx
// German is often 30% longer than English. The label clips.
<button className="w-24 truncate">{t("actions.submit")}</button>;
```

**✅ Right — let the content size the control:**

```tsx
<button className="min-w-24 px-4 py-2">{t("actions.submit")}</button>;
```

**❌ Wrong — shipping only the plural forms English needs.** A Russian file with `_one` and `_other`
but no `_few` or `_many` falls back to `other` for 2, 3 and 4. Nothing throws. Every Russian user
reads a grammar mistake. Lint translation files against `pluralCategories`.

**❌ Wrong — testing RTL with English text.** `dir="rtl"` over English copy finds the easy layout bugs
and hides the real ones: mixed-direction punctuation, clipped labels, mirrored icons that should not
be. Test with real Arabic or Hebrew strings, or a pseudo-locale.

## 🔑 Key Takeaways

- Internationalisation removes assumptions about language; localisation supplies the content for one locale.
- A translation key holds a whole sentence, because word order differs and a fragment cannot be translated alone.
- The number of plural forms belongs to the locale, so ask `Intl.PluralRules` rather than writing `count === 1`.
- Format dates, numbers and currency with a cached `Intl` formatter and an explicit time zone, and send raw values from the server.
- Right-to-left support is one stylesheet written in logical properties, plus `dir` and `lang` on the root element.

## Interview Questions

**Q: Why can you not build a sentence by joining translated fragments?**

Word order is not universal. "You have 3 unread messages" reorders in German and changes structure in
Japanese, and a translator working on a fragment has no sentence to reason about. One key per sentence,
with named placeholders, lets the translator move the placeholders where the grammar needs them.

**Q: Why is `count === 1 ? 'item' : 'items'` wrong?**

It treats English grammar as universal. Russian picks its form from the last digit, so 21 takes the
singular; Arabic has a form for exactly two; Chinese has no plural at all. The correct version asks the
locale, through `Intl.PluralRules` or a translation library that wraps it.

**Q: How would you show a price to users in several countries?**

The server sends the numeric amount and the ISO currency code, never a formatted string. The client
formats with `Intl.NumberFormat`, using the user's locale and that currency. A Norwegian user then sees
Norwegian separators around a euro symbol, and yen correctly gets no decimal places.

**Q: How would you add right-to-left support to an existing app?**

Set `dir` and `lang` on the root element from the resolved locale. Replace physical CSS properties with
logical ones — that is most of the work, and a lint rule can drive it. Then audit with real RTL copy:
absolutely positioned elements, icons and `row-reverse` are where the remaining bugs hide.

**Q: When would you not add an i18n library?**

When there is one locale and no plan for a second, or when the surface is a handful of static labels.
Extracting strings and using `Intl` costs almost nothing and keeps the door open. A full translation
runtime with namespace loading is overhead until a second locale actually exists.

## What to Read Next

- [Chapter ?? — Advanced CSS](#ch-advanced-css) — the layout primitives that logical properties sit inside
- [Chapter ?? — The Accessibility Tree](#ch-accessibility-tree) — the other half of what `lang` controls
