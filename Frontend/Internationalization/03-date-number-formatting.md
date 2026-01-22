# Date & Number Formatting

## Overview

Formatting dates, numbers, currency, and time zones correctly for different locales is critical for internationalized applications. Different countries have vastly different conventions: dates (MM/DD/YYYY vs DD/MM/YYYY), numbers (1,000.50 vs 1.000,50), and currency symbols vary significantly. JavaScript's Intl API provides powerful native tools for handling these challenges.

---

## Table of Contents

- [Intl API Overview](#intl-api-overview)
- [Intl.DateTimeFormat](#intldatetimeformat)
- [Intl.NumberFormat](#intlnumberformat)
- [Currency Formatting](#currency-formatting)
- [Intl.RelativeTimeFormat](#intlrelativetimeformat)
- [Intl.ListFormat](#intllistformat)
- [Time Zone Handling](#time-zone-handling)
- [Date Libraries with i18n](#date-libraries-with-i18n)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## Intl API Overview

### 💡 **What is the Intl API?**

Native browser API for language-sensitive formatting. No dependencies required.

**Available APIs:**

| API | Purpose |
|-----|---------|
| `Intl.DateTimeFormat` | Format dates and times |
| `Intl.NumberFormat` | Format numbers and currency |
| `Intl.RelativeTimeFormat` | Format relative times ("2 days ago") |
| `Intl.ListFormat` | Format lists ("a, b, and c") |
| `Intl.PluralRules` | Determine plural categories |
| `Intl.Collator` | String comparison with locale rules |

---

### 💡 **Locale Identifier Format**

Follows BCP 47: `[language]-[script]-[region]`

| Locale | Meaning |
|--------|---------|
| `en` | English (any region) |
| `en-US` | English (United States) |
| `en-GB` | English (Great Britain) |
| `zh-Hans-CN` | Chinese (Simplified, China) |
| `pt-BR` | Portuguese (Brazil) |
| `ar-SA` | Arabic (Saudi Arabia) |

---

## Intl.DateTimeFormat

### 💡 **Basic Date Formatting**

```javascript
const date = new Date('2025-12-18');

// Different locales, same date
new Intl.DateTimeFormat('en-US').format(date);  // "12/18/2025"
new Intl.DateTimeFormat('de-DE').format(date);  // "18.12.2025"
new Intl.DateTimeFormat('ja-JP').format(date);  // "2025/12/18"
```

> **Key Insight:** Same date displays completely differently across locales.

---

### 💡 **Format Options**

| Option | Values | Example |
|--------|--------|---------|
| `year` | `'numeric'`, `'2-digit'` | 2025, 25 |
| `month` | `'numeric'`, `'2-digit'`, `'long'`, `'short'`, `'narrow'` | 12, 12, December, Dec, D |
| `day` | `'numeric'`, `'2-digit'` | 18, 18 |
| `weekday` | `'long'`, `'short'`, `'narrow'` | Thursday, Thu, T |
| `hour` | `'numeric'`, `'2-digit'` | 2, 02 |
| `minute` | `'numeric'`, `'2-digit'` | 30, 30 |
| `hour12` | `true`, `false` | 12-hour vs 24-hour |
| `timeZone` | IANA timezone | `'America/New_York'` |

---

### 💡 **Common Format Patterns**

**Short Date:**

```javascript
new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(date);  // "12/18/2025"
```

**Long Date:**

```javascript
new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(date);  // "Thursday, December 18, 2025"
```

**Time Only:**

```javascript
new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
}).format(date);  // "12:00 AM"
```

**Date with Time Zone:**

```javascript
new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'America/New_York',
  timeZoneName: 'short'
}).format(date);  // "December 18, 2025, EST"
```

---

### 💡 **Predefined Styles (dateStyle/timeStyle)**

```javascript
// Full date and time
new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'long'
}).format(date);  // "Thursday, December 18, 2025 at 12:00:00 AM EST"

// Short date and time
new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short',
  timeStyle: 'short'
}).format(date);  // "12/18/25, 12:00 AM"
```

| dateStyle | Example |
|-----------|---------|
| `'full'` | Thursday, December 18, 2025 |
| `'long'` | December 18, 2025 |
| `'medium'` | Dec 18, 2025 |
| `'short'` | 12/18/25 |

---

### 💡 **React Hook for Date Formatting**

```javascript
import { useMemo, useCallback } from 'react';

function useDateFormatter(locale, options = {}) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, options),
    [locale, JSON.stringify(options)]
  );

  return useCallback((date) => formatter.format(date), [formatter]);
}

// Usage
function DateDisplay({ date }) {
  const formatDate = useDateFormatter('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return <time>{formatDate(date)}</time>;
}
```

---

## Intl.NumberFormat

### 💡 **Basic Number Formatting**

```javascript
const number = 1234.56;

new Intl.NumberFormat('en-US').format(number);  // "1,234.56"
new Intl.NumberFormat('de-DE').format(number);  // "1.234,56"
new Intl.NumberFormat('fr-FR').format(number);  // "1 234,56"
```

> **Key Insight:** Thousands separator and decimal separator differ by locale.

---

### 💡 **Number Format Styles**

| Style | Purpose | Example |
|-------|---------|---------|
| `'decimal'` | Regular numbers | 1,234.56 |
| `'percent'` | Percentages | 12% |
| `'currency'` | Currency values | $1,234.56 |
| `'unit'` | Units (km, kg) | 100 km/h |

---

### 💡 **Decimal Numbers**

```javascript
// Basic decimal
new Intl.NumberFormat('en-US', { style: 'decimal' }).format(1234.56);
// "1,234.56"

// Control decimal places
new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(1234.5);  // "1,234.50"

// Disable grouping (thousands separator)
new Intl.NumberFormat('en-US', { useGrouping: false }).format(1234.56);
// "1234.56"
```

---

### 💡 **Percentages**

```javascript
// Basic percentage
new Intl.NumberFormat('en-US', { style: 'percent' }).format(0.12);
// "12%"

// With decimal places
new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1
}).format(0.1234);  // "12.3%"
```

---

### 💡 **Compact Notation**

For displaying large numbers in a readable way:

```javascript
// Short compact
new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short'
}).format(1000000);  // "1M"

// Long compact
new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'long'
}).format(1000000);  // "1 million"

// Different locales
new Intl.NumberFormat('de-DE', {
  notation: 'compact'
}).format(1000000);  // "1 Mio."
```

---

### 💡 **Unit Formatting**

```javascript
// Speed
new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'kilometer-per-hour',
  unitDisplay: 'short'
}).format(100);  // "100 km/h"

// Temperature
new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'celsius'
}).format(25);  // "25°C"

// Data
new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'gigabyte'
}).format(256);  // "256 GB"
```

---

## Currency Formatting

### 💡 **Basic Currency Formatting**

```javascript
const amount = 1234.56;

// US Dollar
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(amount);  // "$1,234.56"

// Euro (Germany)
new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR'
}).format(amount);  // "1.234,56 €"

// Japanese Yen (no decimals)
new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY'
}).format(amount);  // "￥1,235"
```

---

### 💡 **Currency Display Options**

| Option | Value | Result |
|--------|-------|--------|
| `currencyDisplay` | `'symbol'` | $1,234.56 |
| `currencyDisplay` | `'code'` | USD 1,234.56 |
| `currencyDisplay` | `'name'` | 1,234.56 US dollars |
| `currencyDisplay` | `'narrowSymbol'` | $1,234.56 (narrow) |

```javascript
// Code instead of symbol
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'code'
}).format(1234.56);  // "USD 1,234.56"

// Full name
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'name'
}).format(1234.56);  // "1,234.56 US dollars"
```

---

### 💡 **Accounting Format (Negative Numbers)**

```javascript
// Standard (minus sign)
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(-1234.56);  // "-$1,234.56"

// Accounting (parentheses)
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencySign: 'accounting'
}).format(-1234.56);  // "($1,234.56)"
```

---

### 💡 **Currency by Locale**

| Locale | Currency | Example |
|--------|----------|---------|
| `en-US` | USD | $1,234.56 |
| `de-DE` | EUR | 1.234,56 € |
| `en-GB` | GBP | £1,234.56 |
| `ja-JP` | JPY | ￥1,235 |
| `en-IN` | INR | ₹1,234.56 |
| `ar-SA` | SAR | ١٬٢٣٤٫٥٦ ر.س. |

---

## Intl.RelativeTimeFormat

### 💡 **Formatting Relative Times**

```javascript
const rtf = new Intl.RelativeTimeFormat('en-US');

rtf.format(-1, 'day');     // "1 day ago"
rtf.format(2, 'hour');     // "in 2 hours"
rtf.format(-30, 'minute'); // "30 minutes ago"
```

---

### 💡 **Options**

| Option | Values | Effect |
|--------|--------|--------|
| `style` | `'long'`, `'short'`, `'narrow'` | Verbosity |
| `numeric` | `'always'`, `'auto'` | "1 day ago" vs "yesterday" |

```javascript
// Auto uses natural language
const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

rtf.format(-1, 'day');  // "yesterday" (not "1 day ago")
rtf.format(1, 'day');   // "tomorrow" (not "in 1 day")
rtf.format(0, 'day');   // "today" (not "in 0 days")
```

---

### 💡 **Helper Function for Relative Time**

```javascript
function formatTimeAgo(date, locale = 'en-US') {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = (date - new Date()) / 1000;  // seconds

  const units = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ];

  for (const { unit, seconds } of units) {
    if (Math.abs(diff) >= seconds) {
      return rtf.format(Math.round(diff / seconds), unit);
    }
  }

  return rtf.format(0, 'second');
}

// Usage
formatTimeAgo(new Date(Date.now() - 3600000));  // "1 hour ago"
formatTimeAgo(new Date(Date.now() + 86400000)); // "tomorrow"
```

---

### 💡 **React Hook for Relative Time**

```javascript
function useRelativeTime(date, locale = 'en-US', updateInterval = 60000) {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    const update = () => setRelativeTime(formatTimeAgo(date, locale));

    update();
    const interval = setInterval(update, updateInterval);
    return () => clearInterval(interval);
  }, [date, locale, updateInterval]);

  return relativeTime;
}

// Usage
function PostTime({ timestamp }) {
  const relativeTime = useRelativeTime(new Date(timestamp));
  return <time>{relativeTime}</time>;
}
```

---

## Intl.ListFormat

### 💡 **Formatting Lists**

```javascript
const list = ['Alice', 'Bob', 'Charlie'];

// English
new Intl.ListFormat('en-US').format(list);
// "Alice, Bob, and Charlie"

// German
new Intl.ListFormat('de-DE').format(list);
// "Alice, Bob und Charlie"
```

---

### 💡 **List Types**

| Type | Use Case | Example |
|------|----------|---------|
| `'conjunction'` | And | "a, b, and c" |
| `'disjunction'` | Or | "a, b, or c" |
| `'unit'` | Measurements | "5 ft, 8 in" |

```javascript
// Conjunction (and)
new Intl.ListFormat('en-US', { type: 'conjunction' })
  .format(['tea', 'coffee']);  // "tea and coffee"

// Disjunction (or)
new Intl.ListFormat('en-US', { type: 'disjunction' })
  .format(['tea', 'coffee']);  // "tea or coffee"

// Unit
new Intl.ListFormat('en-US', { type: 'unit', style: 'narrow' })
  .format(['5 feet', '8 inches']);  // "5 feet, 8 inches"
```

---

## Time Zone Handling

### 💡 **Common IANA Time Zones**

| Region | Time Zone | Name |
|--------|-----------|------|
| US East | `America/New_York` | Eastern |
| US West | `America/Los_Angeles` | Pacific |
| UK | `Europe/London` | GMT/BST |
| Germany | `Europe/Berlin` | CET |
| Japan | `Asia/Tokyo` | JST |
| India | `Asia/Kolkata` | IST |

---

### 💡 **Formatting with Time Zone**

```javascript
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

---

### 💡 **Getting Parts for Custom Formatting**

```javascript
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const parts = formatter.formatToParts(new Date());
// [
//   { type: 'month', value: '01' },
//   { type: 'literal', value: '/' },
//   { type: 'day', value: '22' },
//   { type: 'literal', value: '/' },
//   { type: 'year', value: '2026' },
//   ...
// ]
```

---

## Date Libraries with i18n

### 💡 **Comparison**

| Library | Size | Locale Support | Best For |
|---------|------|----------------|----------|
| **Intl API** | 0KB | Native | Simple formatting |
| **date-fns** | ~15KB | Via locales | Date manipulation |
| **Day.js** | ~2KB | Via plugins | Lightweight |
| **Luxon** | ~20KB | Built-in | Complex time zones |

---

### 💡 **date-fns Example**

```javascript
import { format, formatDistance } from 'date-fns';
import { enUS, de, ar } from 'date-fns/locale';

const date = new Date('2025-12-18');

// Different locales
format(date, 'PPPP', { locale: enUS });
// "Thursday, December 18th, 2025"

format(date, 'PPPP', { locale: de });
// "Donnerstag, 18. Dezember 2025"

// Relative time
formatDistance(new Date('2025-12-10'), date, { addSuffix: true });
// "in 8 days"
```

---

### 💡 **Day.js Example**

```javascript
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const date = dayjs('2025-12-18');

// English
date.format('LLLL');  // "Thursday, December 18, 2025 12:00 AM"

// German
dayjs.locale('de');
date.format('LLLL');  // "Donnerstag, 18. Dezember 2025 00:00"

// Relative
date.fromNow();  // "in 11 months"
```

---

## Common Pitfalls

### 💡 **Pitfall: Not Memoizing Formatters**

```javascript
// ❌ Bad: Creates formatter on every render
function DateDisplay({ date }) {
  return <p>{new Intl.DateTimeFormat('en-US').format(date)}</p>;
}

// ✅ Good: Memoize formatter
function DateDisplay({ date }) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-US'),
    []
  );
  return <p>{formatter.format(date)}</p>;
}
```

---

### 💡 **Pitfall: Forcing Decimals on Currency**

```javascript
// ❌ Bad: Forces 2 decimals on JPY
new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  minimumFractionDigits: 2
}).format(1234);  // "￥1,234.00" (wrong!)

// ✅ Good: Let Intl determine decimals
new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY'
}).format(1234);  // "￥1,234"
```

> **Key Insight:** JPY, KRW have 0 decimals. Most currencies have 2. Some have 3.

---

### 💡 **Pitfall: Mixing UTC and Local Time**

```javascript
// ❌ Bad: Ambiguous time
const date = new Date(2025, 11, 18);  // Local time!

// ✅ Good: Explicit UTC
const date = new Date('2025-12-18T12:00:00Z');

// Format with explicit timezone
new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York'
}).format(date);
```

---

### 💡 **Pitfall: Invalid Date Handling**

```javascript
// ❌ Bad: No validation
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}

// ✅ Good: Validate input
function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat('en-US').format(date);
}
```

---

## Interview Questions

### 1. Difference between Intl.DateTimeFormat and date-fns?

**Answer:**

| Feature | Intl.DateTimeFormat | date-fns |
|---------|---------------------|----------|
| **Size** | 0KB (native) | ~15KB |
| **Date math** | No | Yes |
| **Custom formats** | Limited | Flexible |
| **Best for** | Display formatting | Date manipulation |

---

### 2. How do you format currency in multiple locales?

**Answer:**

```javascript
function formatCurrency(amount, locale, currency) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

formatCurrency(1234.56, 'en-US', 'USD');  // "$1,234.56"
formatCurrency(1234.56, 'de-DE', 'EUR');  // "1.234,56 €"
```

---

### 3. Why is time zone handling tricky in JavaScript?

**Answer:**

- `Date` stores time in UTC internally
- Display depends on browser's local time zone
- Must explicitly specify `timeZone` option for specific regions
- Daylight saving time adds complexity

---

### 4. How do you calculate "time ago" with i18n?

**Answer:**

```javascript
function formatTimeAgo(date, locale) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffSeconds = (date - new Date()) / 1000;

  if (Math.abs(diffSeconds) < 60) return rtf.format(Math.round(diffSeconds), 'second');
  if (Math.abs(diffSeconds) < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  // ... continue for hours, days, etc.
}
```

---

### 5. Performance consideration for Intl formatters?

**Answer:**

- ✅ Create formatters once, reuse them
- ✅ Use `useMemo` in React
- ❌ Don't create new formatter on every render
- ❌ Don't create formatter inside map/loop

---

### 6. Does Intl.NumberFormat convert currencies?

**Answer:**

**No.** It only formats numbers with locale-specific symbols and separators. For conversion:

1. Get exchange rate from API
2. Multiply amount by rate
3. Format result with Intl.NumberFormat

---

### 7. Decimal places for different currencies?

| Decimals | Currencies |
|----------|------------|
| 0 | JPY, KRW |
| 2 | USD, EUR, GBP (most) |
| 3 | KWD, TND |

Intl.NumberFormat handles this automatically.

---

### 8. How do you format a list with locale-aware conjunctions?

**Answer:**

```javascript
new Intl.ListFormat('en-US').format(['a', 'b', 'c']);
// "a, b, and c"

new Intl.ListFormat('en-US', { type: 'disjunction' }).format(['a', 'b']);
// "a or b"
```

---

### 9. How to display updating relative time?

**Answer:**

React hook that updates at intervals:

```javascript
function useRelativeTime(date) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(formatTimeAgo(date));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return time;
}
```

---

### 10. Best library for date/time with i18n?

| Need | Recommendation |
|------|----------------|
| Simple formatting | Intl API (native) |
| Date math | date-fns |
| Lightweight | Day.js |
| Complex time zones | Luxon |

---

## Navigation

**Continue Reading:**

- [04 - RTL Support](./04-rtl-support.md) - Right-to-left languages

**Related Topics:**

- [01 - i18n Fundamentals](./01-i18n-fundamentals.md) - Core concepts
- [02 - Pluralization](./02-pluralization.md) - Plural forms
- Frontend/JavaScript - Date and time handling

---

**Last Updated:** January 2026
**Difficulty:** Intermediate
**Estimated Time:** 3-4 hours
