# Date & Number Formatting

The Intl API is the native browser standard for locale-aware formatting. No library required for displaying dates, numbers, and currency.

---

## Table of Contents

- [Intl API Overview](#intl-api-overview)
- [Intl.DateTimeFormat](#intldatetimeformat)
- [Intl.NumberFormat](#intlnumberformat)
- [Currency Formatting](#currency-formatting)
- [Intl.RelativeTimeFormat](#intlrelativetimeformat)
- [Time Zone Handling](#time-zone-handling)
- [Library Comparison](#library-comparison)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## Intl API Overview

### 💡 **Available APIs**

| API | Purpose |
|-----|---------|
| `Intl.DateTimeFormat` | Format dates and times |
| `Intl.NumberFormat` | Format numbers, currency, units |
| `Intl.RelativeTimeFormat` | "2 days ago", "in 3 hours" |
| `Intl.PluralRules` | Determine plural category |
| `Intl.ListFormat` | "a, b, and c" |
| `Intl.Collator` | Locale-aware string sorting |

**Locale format follows BCP 47:** `language-script-region`

| Locale | Meaning |
|--------|---------|
| `en-US` | English (United States) |
| `de-DE` | German (Germany) |
| `ar-SA` | Arabic (Saudi Arabia) |
| `zh-Hans-CN` | Chinese Simplified (China) |

---

## Intl.DateTimeFormat

### 💡 **Basic Usage**

```typescript
const date = new Date('2025-12-18');

new Intl.DateTimeFormat('en-US').format(date);  // "12/18/2025"
new Intl.DateTimeFormat('de-DE').format(date);  // "18.12.2025"
new Intl.DateTimeFormat('ja-JP').format(date);  // "2025/12/18"
```

> The same date displays completely differently across locales.

---

### 💡 **Format Options**

```typescript
// Long date
new Intl.DateTimeFormat('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
}).format(date);
// "Thursday, December 18, 2025"

// Short date + time
new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short', timeStyle: 'short'
}).format(date);
// "12/18/25, 12:00 AM"
```

| `dateStyle` | Example |
|-------------|---------|
| `'full'` | Thursday, December 18, 2025 |
| `'long'` | December 18, 2025 |
| `'medium'` | Dec 18, 2025 |
| `'short'` | 12/18/25 |

---

### 💡 **React Hook**

```typescript
import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function useDateFormatter(options: Intl.DateTimeFormatOptions = {}): (date: Date) => string {
  const { i18n } = useTranslation();

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language, JSON.stringify(options)]
  );

  return useCallback((date: Date) => formatter.format(date), [formatter]);
}

// Usage
function DateDisplay({ date }: { date: Date }): JSX.Element {
  const formatDate = useDateFormatter({ year: 'numeric', month: 'long', day: 'numeric' });
  return <time>{formatDate(date)}</time>;
}
```

---

## Intl.NumberFormat

### 💡 **Basic Numbers**

```typescript
const n = 1234.56;

new Intl.NumberFormat('en-US').format(n);  // "1,234.56"
new Intl.NumberFormat('de-DE').format(n);  // "1.234,56"
new Intl.NumberFormat('fr-FR').format(n);  // "1 234,56"
```

> Thousands separator and decimal separator differ by locale.

---

### 💡 **Styles and Notation**

```typescript
// Percentage
new Intl.NumberFormat('en-US', { style: 'percent' }).format(0.12);
// "12%"

// Compact notation
new Intl.NumberFormat('en-US', { notation: 'compact' }).format(1_000_000);
// "1M"

// Unit
new Intl.NumberFormat('en-US', {
  style: 'unit', unit: 'kilometer-per-hour', unitDisplay: 'short'
}).format(100);
// "100 km/h"

// Control decimal places
new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(1234.5);
// "1,234.50"
```

| Style | Use Case |
|-------|----------|
| `'decimal'` | Regular numbers |
| `'percent'` | Rates and ratios |
| `'currency'` | Monetary values |
| `'unit'` | Physical measurements |

---

## Currency Formatting

### 💡 **Basic Currency**

```typescript
function formatCurrency(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

formatCurrency(1234.56, 'en-US', 'USD');  // "$1,234.56"
formatCurrency(1234.56, 'de-DE', 'EUR');  // "1.234,56 €"
formatCurrency(1234,    'ja-JP', 'JPY');  // "￥1,234"
```

> JPY and KRW have 0 decimal places. `Intl.NumberFormat` handles this automatically — never force `minimumFractionDigits: 2` on these currencies.

---

### 💡 **Display Options**

| `currencyDisplay` | Result |
|-------------------|--------|
| `'symbol'` (default) | $1,234.56 |
| `'code'` | USD 1,234.56 |
| `'name'` | 1,234.56 US dollars |

```typescript
// Accounting format — negative in parentheses
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencySign: 'accounting'
}).format(-1234.56);
// "($1,234.56)"
```

---

## Intl.RelativeTimeFormat

### 💡 **Relative Time**

```typescript
const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

rtf.format(-1, 'day');     // "yesterday"
rtf.format(1, 'day');      // "tomorrow"
rtf.format(-2, 'hour');    // "2 hours ago"
rtf.format(0, 'day');      // "today"
```

`numeric: 'auto'` uses natural language ("yesterday") over numeric ("1 day ago").

---

### 💡 **Time Ago Helper**

```typescript
interface TimeUnit {
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}

const TIME_UNITS: TimeUnit[] = [
  { unit: 'year',   seconds: 31_536_000 },
  { unit: 'month',  seconds: 2_592_000 },
  { unit: 'week',   seconds: 604_800 },
  { unit: 'day',    seconds: 86_400 },
  { unit: 'hour',   seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 }
];

function formatTimeAgo(date: Date, locale = 'en-US'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffSeconds = (date.getTime() - Date.now()) / 1000;

  for (const { unit, seconds } of TIME_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return rtf.format(0, 'second');
}

formatTimeAgo(new Date(Date.now() - 3_600_000));  // "1 hour ago"
formatTimeAgo(new Date(Date.now() + 86_400_000)); // "tomorrow"
```

---

## Time Zone Handling

### 💡 **Always Be Explicit**

```typescript
const date = new Date();

new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short'
}).format(date);
// "January 22, 2026, 10:30 AM EST"
```

`Date` stores UTC internally. Without an explicit `timeZone`, output uses the **browser's local time zone** — which varies per user.

---

## Library Comparison

| Need | Use |
|------|-----|
| Simple formatting | Intl API (0KB, native) |
| Date math (add days, diff) | `date-fns` (~15KB) |
| Lightweight + plugins | `Day.js` (~2KB) |
| Complex time zone logic | `Luxon` (~20KB) |

The Intl API handles **display formatting**. Reach for a library only when you need **date manipulation**.

---

## Common Pitfalls

### 💡 **Not Memoizing Formatters**

Creating `Intl.DateTimeFormat` or `Intl.NumberFormat` is expensive.

```typescript
// ❌ Bad: New instance on every render
function DateDisplay({ date }: { date: Date }): JSX.Element {
  return <p>{new Intl.DateTimeFormat('en-US').format(date)}</p>;
}

// ✅ Good: Memoize
function DateDisplay({ date }: { date: Date }): JSX.Element {
  const fmt = useMemo(() => new Intl.DateTimeFormat('en-US'), []);
  return <p>{fmt.format(date)}</p>;
}
```

---

### 💡 **Forcing Decimals on Zero-Decimal Currencies**

```typescript
// ❌ Bad: JPY doesn't have cents
new Intl.NumberFormat('ja-JP', {
  style: 'currency', currency: 'JPY', minimumFractionDigits: 2
}).format(1234);
// "￥1,234.00" — incorrect

// ✅ Good: Let Intl decide
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(1234);
// "￥1,234"
```

---

## Interview Questions

### 1. What is the Intl API and why use it?

Native browser API for locale-aware formatting — dates, numbers, currencies, relative time. No external library required, follows Unicode CLDR standards, supports all major locales.

### 2. How do you format currency for multiple locales?

```typescript
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.56);
// "$1,234.56"
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.56);
// "1.234,56 €"
```

### 3. Why is time zone handling tricky in JavaScript?

`Date` stores UTC internally. Without an explicit `timeZone` option in `Intl.DateTimeFormat`, output uses the browser's local time zone — giving different results for different users.

### 4. What's the performance consideration for Intl formatters?

Creating `Intl.DateTimeFormat` and `Intl.NumberFormat` is expensive. Memoize instances with `useMemo` in React, or cache by locale key outside components.

### 5. When would you use date-fns instead of the Intl API?

When you need **date manipulation** — adding days, diffing two dates, parsing strings. The Intl API handles display output only, not date math.

---

## Navigation

- [01 - i18n Fundamentals](./01-i18n-fundamentals.md)
- [02 - Pluralization](./02-pluralization.md)
- [04 - RTL Support](./04-rtl-support.md)

---

**Last Updated:** June 2026
**Difficulty:** Intermediate
