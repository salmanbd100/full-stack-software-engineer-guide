---
title: Date and Number Formatting
part: 2
chapter: 0
slug: date-number-formatting
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-01
tags: [i18n, intl, dates, numbers, currency, timezones]
in_book: true
---

# Date and Number Formatting {#ch-date-number-formatting}

> Format dates, numbers and currency for any locale using the platform, and know which time zone the result is in.

**In this chapter:** the `Intl` family · dates and relative time · numbers, currency and compact notation · time zones · why formatters must be cached

## 💡 The Core Idea

Every locale disagrees about how to write the same value. `1.234,56` is one thousand in Germany and
one-point-something in the United States. The date `03/04/2026` is March in one country and April in
another. There is no clever formatting function you can write, because the correct answer is data —
hundreds of locales' worth of it — and the browser already ships that data as the `Intl` APIs. The job
is to hand `Intl` a value, a locale and an intent, and never to assemble a formatted string by hand.

> Store values as values. Format them at the edge, once, with the user's locale and an explicit time
> zone.

## How It Works

| API | Formats | Typical use |
| --- | ------- | ----------- |
| `Intl.DateTimeFormat` | Dates and times | Timestamps, calendars |
| `Intl.NumberFormat` | Numbers, currency, percentages, units | Prices, metrics, file sizes |
| `Intl.RelativeTimeFormat` | "3 days ago", "tomorrow" | Activity feeds |
| `Intl.ListFormat` | "A, B and C" | Tag lists, author lists |
| `Intl.PluralRules` | Plural category selection | Counted nouns |
| `Intl.Collator` | Locale-aware sorting and comparison | Sorting names |

### Dates

Ask for the *intent* — a long month, a two-digit hour — and let the locale decide the order and the
separators.

```typescript
const value = new Date('2026-03-04T14:30:00Z');

// Always name the time zone. Without it the output is the browser's zone,
// which differs per user and makes bug reports irreproducible.
const opts: Intl.DateTimeFormatOptions = {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Oslo',
};

new Intl.DateTimeFormat('en-GB', opts).format(value); // 4 March 2026 at 15:30
new Intl.DateTimeFormat('de-DE', opts).format(value); // 4. März 2026 um 15:30
new Intl.DateTimeFormat('ja-JP', opts).format(value); // 2026年3月4日 15:30
```

`dateStyle` and `timeStyle` are the right default because they encode the locale's own conventions.
Reach for the component options — `year`, `month`, `day`, `hour` — only when you need a shape the styles
do not offer.

### Relative time

```typescript
const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

// numeric: 'auto' produces "yesterday" instead of "1 day ago".
rtf.format(-1, 'day'); // yesterday
rtf.format(-2, 'hour'); // 2 hours ago
```

Picking the unit is the part `Intl` does not do for you. Walk a table of units from largest to smallest
and use the first one the difference exceeds.

```typescript
const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

function timeAgo(when: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const seconds = (when.getTime() - Date.now()) / 1000;

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'second'); // "now"
}
```

### Numbers and currency

```typescript
const amount = 1234.5;

new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
// 1.234,50 €  — note the trailing symbol and the swapped separators

// Zero-decimal currencies: never force fraction digits, Intl already knows.
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(1234); // ￥1,234

// Compact notation for dashboards, and it localises the abbreviation too.
new Intl.NumberFormat('en-GB', { notation: 'compact' }).format(1_234_567); // 1.2M

// Units are first-class, so you do not concatenate a suffix.
new Intl.NumberFormat('en-GB', { style: 'unit', unit: 'megabyte' }).format(42); // 42 MB
```

The **currency and the locale are independent**. The locale decides the format; the currency decides
the symbol and the number of decimal places. A Norwegian user viewing a euro price wants Norwegian
separators and a euro symbol, which means `Intl.NumberFormat('nb-NO', { currency: 'EUR' })`.

### Time zones

`Date` holds a UTC instant. Everything about a time zone is a *formatting* decision, which is why the
option lives on the formatter rather than on the value.

```typescript
// The user's own zone, when you want their local time. Read it, do not guess it.
const zone: string = Intl.DateTimeFormat().resolvedOptions().timeZone; // "Europe/Oslo"
```

Store instants as UTC. Store a *future* appointment as a wall-clock time plus an IANA zone identifier,
because the offset for that zone may change before the date arrives — legislatures move daylight-saving
rules, and a stored offset silently becomes wrong.

> ⚠️ **Moving target:** the `Temporal` API is arriving in browsers and replaces `Date` for arithmetic,
> zoned date-times and durations. The durable principle is unchanged: keep instants in UTC, keep zones
> as IANA identifiers, and format at the edge.

## When to Use It

| Need | Choose | Why |
| ---- | ------ | --- |
| Displaying a date, number, price or list | `Intl` | It is native, zero bytes, and already correct for every locale |
| Date arithmetic — add a month, diff two dates | A date library, or `Temporal` where available | `Intl` formats; it does not compute |
| A fixed machine-readable format | `toISOString()` | Logs and APIs want stability, not locale |
| Sorting a list of names | `Intl.Collator` | `localeCompare` per comparison is far slower and less configurable |
| Formatting the same shape many times | One cached formatter | Constructing a formatter is the expensive part |

## Common Mistakes

**❌ Wrong — a new formatter on every render:**

```typescript
function Price({ value }: { value: number }): JSX.Element {
  // Constructing the formatter costs far more than formatting with it.
  return <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)}</span>;
}
```

**✅ Right — construct once, reuse:**

```typescript
// Module scope, or a Map keyed by locale plus options when the locale varies.
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function Price({ value }: { value: number }): JSX.Element {
  return <span>{eur.format(value)}</span>;
}
```

**❌ Wrong — formatting without a time zone.** The same timestamp renders as two different days for
users either side of midnight, and the bug is unreproducible for whoever investigates it.

**❌ Wrong — sending a formatted string from the server.** Once a number is `"1.234,56"` the client
cannot re-render it in another locale, sort it, or do arithmetic on it. Send the value and the currency
code; format on the client that knows the user.

## 🔑 Key Takeaways

- Locale formatting is data, not logic, and the browser already ships that data as the `Intl` APIs.
- Always pass an explicit `timeZone`, or the output silently depends on the viewer's machine.
- The locale and the currency are separate decisions: one picks the format, the other the symbol and the decimal places.
- Constructing an `Intl` formatter is expensive and formatting with it is cheap, so cache the instance.
- `Intl` formats and does not compute; date arithmetic needs a library or `Temporal`.

## Interview Questions

**Q: Why use `Intl` rather than a formatting library?**

Because it is already in the runtime, it costs nothing in bundle size, and its locale data is more
complete than any library ships. A library is worth adding for arithmetic — adding months, diffing,
zoned recurrence — which `Intl` deliberately does not do.

**Q: How would you display a price to users in several countries?**

Send the numeric amount and the ISO currency code from the server, never a formatted string. Format on
the client with `Intl.NumberFormat` using the user's locale and that currency code, so a Norwegian user
sees Norwegian separators around a euro symbol. Never force `minimumFractionDigits`, because zero-decimal
currencies like JPY would gain cents that do not exist.

**Q: What goes wrong with time zones in a web application?**

`Date` is a UTC instant, and every rendering decision is a formatting decision, so omitting `timeZone`
makes the output depend on the viewer's machine. The subtler failure is storing a future appointment as
an offset: zone rules change by legislation, so the stored offset becomes wrong. Store the wall-clock
time and the IANA zone identifier instead.

**Q: When would you not format on the client?**

When the output has to be stable rather than local — logs, exported CSVs, API payloads, cache keys.
Those want `toISOString()` and raw numbers, because a locale-formatted value is ambiguous the moment it
leaves the browser that produced it.

## What to Read Next

- [Chapter ?? — Internationalisation Fundamentals](#ch-i18n-fundamentals) — how the locale reaches this code
- [Chapter ?? — Pluralisation](#ch-pluralization) — the `Intl` member that decides which noun form goes beside a number
