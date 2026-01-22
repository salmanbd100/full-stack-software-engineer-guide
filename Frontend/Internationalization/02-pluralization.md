# Pluralization

## Overview

Pluralization is one of the most complex aspects of internationalization. While English has two plural forms (singular and plural), many languages have different rules. Arabic has six forms, Slavic languages have three, and others have unique patterns. Understanding these rules is essential for building truly international applications.

---

## Table of Contents

- [Plural Rules Across Languages](#plural-rules-across-languages)
- [CLDR Plural Categories](#cldr-plural-categories)
- [ICU MessageFormat](#icu-messageformat)
- [Implementation with i18next](#implementation-with-i18next)
- [Intl.PluralRules API](#intlpluralrules-api)
- [Edge Cases and Common Mistakes](#edge-cases-and-common-mistakes)
- [Testing Pluralization](#testing-pluralization)
- [Performance Considerations](#performance-considerations)
- [Interview Questions](#interview-questions)

---

## Plural Rules Across Languages

### 💡 **Language Plural Forms Comparison**

| Language | Forms | Categories Used |
|----------|-------|-----------------|
| **English** | 2 | one, other |
| **German** | 2 | one, other |
| **French** | 2 | one, other |
| **Russian** | 4 | one, few, many, other |
| **Polish** | 4 | one, few, many, other |
| **Arabic** | 6 | zero, one, two, few, many, other |
| **Chinese** | 1 | other (no pluralization) |

> **Key Insight:** Never assume English plural rules work for other languages. Always use library support or Intl.PluralRules.

---

### 💡 **English (2 Forms)**

The simplest plural system: singular (1) and other (everything else).

**Rules:**

| Count | Category | Example |
|-------|----------|---------|
| 1 | `one` | "1 message" |
| 0, 2, 3... | `other` | "0 messages", "5 messages" |

**Translation File:**

```json
{
  "messages_one": "You have {{count}} message",
  "messages_other": "You have {{count}} messages"
}
```

**Usage:**

```javascript
t('messages', { count: 1 })  // "You have 1 message"
t('messages', { count: 5 })  // "You have 5 messages"
t('messages', { count: 0 })  // "You have 0 messages"
```

---

### 💡 **Russian (4 Forms)**

Russian plural forms depend on the last digit and whether it ends in 11-14.

**Rules:**

| Category | When | Examples |
|----------|------|----------|
| `one` | Ends in 1 (except 11) | 1, 21, 31, 101 |
| `few` | Ends in 2-4 (except 12-14) | 2, 3, 4, 22, 23 |
| `many` | Ends in 0, 5-9, or 11-14 | 0, 5, 10, 11, 12, 25 |
| `other` | Fallback | — |

**Translation File:**

```json
{
  "messages_one": "{{count}} сообщение",
  "messages_few": "{{count}} сообщения",
  "messages_many": "{{count}} сообщений"
}
```

**Examples:**

```javascript
t('messages', { count: 1 })   // "1 сообщение"
t('messages', { count: 2 })   // "2 сообщения"
t('messages', { count: 5 })   // "5 сообщений"
t('messages', { count: 21 })  // "21 сообщение"
```

---

### 💡 **Arabic (6 Forms)**

Arabic has the most complex pluralization with six different forms.

**Rules:**

| Category | When | Examples |
|----------|------|----------|
| `zero` | 0 | 0 |
| `one` | 1 | 1 |
| `two` | 2 | 2 |
| `few` | 3-10 | 3, 4, 5, 6, 7, 8, 9, 10 |
| `many` | 11-99 | 11, 50, 99 |
| `other` | 100+ | 100, 101, 1000 |

**Translation File:**

```json
{
  "messages_zero": "لا توجد رسائل",
  "messages_one": "رسالة واحدة",
  "messages_two": "رسالتان",
  "messages_few": "{{count}} رسائل",
  "messages_many": "{{count}} رسالة",
  "messages_other": "{{count}} رسالة"
}
```

---

## CLDR Plural Categories

### 💡 **What is CLDR?**

The **Common Locale Data Repository (CLDR)** defines plural rules for 300+ languages. It specifies which numbers belong to which plural category.

**All Possible Categories:**

| Category | Description |
|----------|-------------|
| `zero` | Zero quantity |
| `one` | Singular |
| `two` | Dual (exactly two) |
| `few` | Paucal (few items) |
| `many` | Greater plural |
| `other` | Default fallback |

> **Key Insight:** Not all languages use all categories. English only uses `one` and `other`.

---

### 💡 **Checking Categories for a Language**

```javascript
// Use Intl.PluralRules to check supported categories
const enCategories = new Intl.PluralRules('en').resolvedOptions().pluralCategories;
// ['one', 'other']

const ruCategories = new Intl.PluralRules('ru').resolvedOptions().pluralCategories;
// ['one', 'few', 'many', 'other']

const arCategories = new Intl.PluralRules('ar').resolvedOptions().pluralCategories;
// ['zero', 'one', 'two', 'few', 'many', 'other']
```

---

### 💡 **Selecting Category for a Number**

```javascript
function getPluralCategory(number, locale) {
  return new Intl.PluralRules(locale).select(number);
}

// English
getPluralCategory(0, 'en')   // 'other'
getPluralCategory(1, 'en')   // 'one'
getPluralCategory(2, 'en')   // 'other'

// Arabic
getPluralCategory(0, 'ar')   // 'zero'
getPluralCategory(1, 'ar')   // 'one'
getPluralCategory(2, 'ar')   // 'two'
getPluralCategory(5, 'ar')   // 'few'
getPluralCategory(50, 'ar')  // 'many'
```

---

## ICU MessageFormat

### 💡 **What is ICU MessageFormat?**

Industry standard for handling pluralization and message formatting.

**Basic Syntax:**

```
{variable, plural, category1 {text} category2 {text} other {text}}
```

**Examples:**

```javascript
// English
"{count, plural, one {# item} other {# items}}"

// Russian
"{count, plural, one {# товар} few {# товара} many {# товаров} other {# товаров}}"
```

> **Note:** `#` is replaced with the actual count value.

---

### 💡 **ICU Features**

| Feature | Syntax | Example |
|---------|--------|---------|
| **Basic Plural** | `{var, plural, ...}` | `{count, plural, one {#} other {#s}}` |
| **Select (Gender)** | `{var, select, ...}` | `{gender, select, male {He} female {She}}` |
| **Nested** | Combined | `{gender, select, male {He has} female {She has}} {count, plural, ...}` |
| **Offset** | `offset:N` | `{count, plural, offset:1, one {You} other {# others}}` |

**Complex Example:**

```javascript
// Gender + Plural
const message = `{gender, select,
  male {He}
  female {She}
  other {They}
} bought {count, plural,
  one {# book}
  other {# books}
}`;

// Result: "She bought 3 books"
```

---

### 💡 **ICU in Translation Files**

```json
{
  "itemCount": "{count, plural, one {# item} other {# items}}",
  "notification": "{name} sent you {count, plural, one {a message} other {# messages}}"
}
```

**Usage with FormatJS:**

```javascript
intl.formatMessage({ id: 'itemCount' }, { count: 5 })
// "5 items"
```

---

## Implementation with i18next

### 💡 **Setup**

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    ru: { translation: ruTranslation }
  },
  lng: 'en',
  fallbackLng: 'en',
  pluralSeparator: '_',  // Default suffix separator
  interpolation: { escapeValue: false }
});
```

---

### 💡 **Translation File Structure**

**i18next v21+ Suffix Pattern:**

| Language | Suffixes Used |
|----------|---------------|
| English | `_one`, `_other` |
| Russian | `_one`, `_few`, `_many` |
| Arabic | `_zero`, `_one`, `_two`, `_few`, `_many`, `_other` |

**English Example:**

```json
{
  "messages_one": "You have {{count}} message",
  "messages_other": "You have {{count}} messages"
}
```

**Russian Example:**

```json
{
  "messages_one": "У вас {{count}} сообщение",
  "messages_few": "У вас {{count}} сообщения",
  "messages_many": "У вас {{count}} сообщений"
}
```

---

### 💡 **Usage in Components**

```javascript
import { useTranslation } from 'react-i18next';

function MessageCount({ count }) {
  const { t } = useTranslation();

  // i18next automatically selects correct plural form!
  return <p>{t('messages', { count })}</p>;
}

// Same code works for all languages
<MessageCount count={1} />  // English: "You have 1 message"
<MessageCount count={5} />  // English: "You have 5 messages"
<MessageCount count={21} /> // Russian: "У вас 21 сообщение"
```

---

## Intl.PluralRules API

### 💡 **Native Browser API**

No dependencies needed for basic pluralization.

```javascript
// Create plural rules instance
const pluralRules = new Intl.PluralRules('en');

// Select category for a number
pluralRules.select(0)   // 'other'
pluralRules.select(1)   // 'one'
pluralRules.select(2)   // 'other'
```

---

### 💡 **Building Custom Pluralization**

```javascript
class PluralFormatter {
  constructor(locale, translations) {
    this.pluralRules = new Intl.PluralRules(locale);
    this.translations = translations;
  }

  format(key, count) {
    const category = this.pluralRules.select(count);
    const forms = this.translations[key];

    if (!forms) return key;

    const text = forms[category] || forms.other;
    return text.replace('{{count}}', count);
  }
}

// Usage
const translations = {
  messages: {
    one: 'You have {{count}} message',
    other: 'You have {{count}} messages'
  }
};

const formatter = new PluralFormatter('en', translations);
formatter.format('messages', 1)  // "You have 1 message"
formatter.format('messages', 5)  // "You have 5 messages"
```

---

## Edge Cases and Common Mistakes

### 💡 **Common Mistakes**

| Mistake | Problem | Solution |
|---------|---------|----------|
| **Hardcoded rules** | `count === 1 ? 'item' : 'items'` | Breaks for other languages |
| **Missing forms** | Only singular in Russian | Provide all required forms |
| **Forgetting zero** | "You have 0 item" | Handle zero case explicitly |
| **No count in text** | `"Message" / "Messages"` | Always include `{{count}}` |

---

### 💡 **Hardcoded Plural Logic**

```javascript
// ❌ Bad: Works only for English
function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

// ✅ Good: Use library or Intl.PluralRules
t('items', { count })
```

---

### 💡 **Missing Plural Forms**

```javascript
// ❌ Bad: Missing forms for Russian
// ru.json
{
  "items": "{{count}} товар"  // Only singular!
}

// ✅ Good: All required forms
// ru.json
{
  "items_one": "{{count}} товар",
  "items_few": "{{count}} товара",
  "items_many": "{{count}} товаров"
}
```

---

### 💡 **Handling Zero**

```json
// Standard approach - 0 uses "other" in English
{
  "items_one": "You have {{count}} item",
  "items_other": "You have {{count}} items"
}
// t('items', { count: 0 }) → "You have 0 items"

// Better UX - special message for zero
{
  "items_zero": "You have no items",
  "items_one": "You have {{count}} item",
  "items_other": "You have {{count}} items"
}
// t('items', { count: 0 }) → "You have no items"
```

---

## Testing Pluralization

### 💡 **Test Cases by Language**

**English Test Cases:**

| Count | Expected Category | Expected Output |
|-------|-------------------|-----------------|
| 0 | other | "0 messages" |
| 1 | one | "1 message" |
| 2 | other | "2 messages" |
| 100 | other | "100 messages" |

**Russian Test Cases:**

| Count | Expected Category | Expected Output |
|-------|-------------------|-----------------|
| 0 | many | "0 сообщений" |
| 1 | one | "1 сообщение" |
| 2 | few | "2 сообщения" |
| 5 | many | "5 сообщений" |
| 21 | one | "21 сообщение" |
| 22 | few | "22 сообщения" |

---

### 💡 **Unit Tests**

```javascript
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

describe('MessageCount Pluralization', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  test.each([
    [0, 'You have 0 messages'],
    [1, 'You have 1 message'],
    [5, 'You have 5 messages'],
  ])('count=%i shows "%s"', (count, expected) => {
    render(
      <I18nextProvider i18n={i18n}>
        <MessageCount count={count} />
      </I18nextProvider>
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
```

---

### 💡 **Testing Intl.PluralRules Directly**

```javascript
describe('Intl.PluralRules', () => {
  test('English plural forms', () => {
    const rules = new Intl.PluralRules('en');
    expect(rules.select(0)).toBe('other');
    expect(rules.select(1)).toBe('one');
    expect(rules.select(2)).toBe('other');
  });

  test('Russian plural forms', () => {
    const rules = new Intl.PluralRules('ru');
    expect(rules.select(1)).toBe('one');
    expect(rules.select(2)).toBe('few');
    expect(rules.select(5)).toBe('many');
    expect(rules.select(21)).toBe('one');
  });

  test('Arabic plural forms', () => {
    const rules = new Intl.PluralRules('ar');
    expect(rules.select(0)).toBe('zero');
    expect(rules.select(1)).toBe('one');
    expect(rules.select(2)).toBe('two');
    expect(rules.select(5)).toBe('few');
    expect(rules.select(50)).toBe('many');
  });
});
```

---

## Performance Considerations

### 💡 **Memoize PluralRules Instances**

```javascript
// ❌ Bad: Creating instance on every call
function getPluralForm(count, locale) {
  const rules = new Intl.PluralRules(locale);  // Created every time!
  return rules.select(count);
}

// ✅ Good: Memoize instances
const pluralRulesCache = new Map();

function getPluralForm(count, locale) {
  if (!pluralRulesCache.has(locale)) {
    pluralRulesCache.set(locale, new Intl.PluralRules(locale));
  }
  return pluralRulesCache.get(locale).select(count);
}
```

---

### 💡 **React Component Optimization**

```javascript
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Memoize component to prevent unnecessary re-renders
const MessageCount = memo(function MessageCount({ count }) {
  const { t } = useTranslation();
  return <p>{t('messages', { count })}</p>;
});

// Or use useMemo for expensive operations
function MessageList({ counts }) {
  const { t } = useTranslation();

  const formatted = useMemo(
    () => counts.map(count => t('messages', { count })),
    [counts, t]
  );

  return <ul>{formatted.map((msg, i) => <li key={i}>{msg}</li>)}</ul>;
}
```

---

### 💡 **Translation File Optimization**

```javascript
// ❌ Bad: Redundant forms
{
  "items_one": "Item",
  "items_few": "Items",    // Same as other
  "items_many": "Items",   // Same as other
  "items_other": "Items"   // Same as other
}

// ✅ Good: Only needed forms
{
  "items_one": "Item",
  "items_other": "Items"
}
```

---

## Interview Questions

### 1. Why is pluralization language-dependent?

**Answer:**

Different languages have different grammatical rules for plurals:
- English: 2 forms (1 vs everything else)
- Russian: 4 forms (based on last digit and 11-14 range)
- Arabic: 6 forms (zero, one, two, few, many, other)

Proper i18n must respect these language-specific rules.

---

### 2. What are the CLDR plural categories?

**Answer:**

| Category | Description |
|----------|-------------|
| `zero` | Zero quantity |
| `one` | Singular |
| `two` | Dual (exactly two) |
| `few` | Paucal |
| `many` | Greater plural |
| `other` | Default fallback |

Not all languages use all categories.

---

### 3. How do you implement pluralization in react-i18next?

**Answer:**

Create translation keys with plural suffixes:

```json
{ "items_one": "# item", "items_other": "# items" }
```

Use with count:

```javascript
t('items', { count: 5 })  // "5 items"
```

i18next automatically selects correct form.

---

### 4. Difference between ICU MessageFormat and i18next syntax?

| Feature | ICU | i18next |
|---------|-----|---------|
| **Format** | Single string with rules | Separate keys |
| **Example** | `{count, plural, one {#} other {#s}}` | `key_one`, `key_other` |
| **Complexity** | More compact | Simpler to implement |

---

### 5. How do you handle zero in pluralization?

**Answer:**

Option 1: Use `_zero` suffix for special message:

```json
{
  "items_zero": "No items",
  "items_one": "1 item",
  "items_other": "{{count}} items"
}
```

Option 2: Handle in component:

```javascript
count === 0 ? t('noItems') : t('items', { count })
```

---

### 6. What's Intl.PluralRules and why use it?

**Answer:**

Native browser API for determining plural category. Benefits:
- ✅ No dependencies
- ✅ Follows Unicode CLDR standard
- ✅ Works for all languages
- ✅ Lightweight

```javascript
new Intl.PluralRules('en').select(5)  // 'other'
```

---

### 7. How do you test pluralization across languages?

**Answer:**

Create test cases for each language's plural forms:

```javascript
// Russian edge cases
test.each([
  [1, 'one'],
  [2, 'few'],
  [5, 'many'],
  [21, 'one'],  // Important edge case!
  [22, 'few'],
])('Russian: %i = %s', (count, category) => {
  expect(new Intl.PluralRules('ru').select(count)).toBe(category);
});
```

---

### 8. What happens if plural forms are missing?

**Answer:**

The library will either:
1. Fallback to `other` form
2. Fallback to another language
3. Show the key name

Always provide all required forms for each language.

---

### 9. Explain Russian pluralization rules.

**Answer:**

```
one:  n % 10 == 1 AND n % 100 != 11
few:  n % 10 IN 2..4 AND n % 100 NOT IN 12..14
many: Everything else
```

| Count | Form |
|-------|------|
| 1, 21, 31 | one |
| 2, 3, 4, 22 | few |
| 0, 5-20, 25-30 | many |

---

### 10. How would you optimize pluralization for performance?

**Answer:**

1. **Memoize** Intl.PluralRules instances
2. **Cache** formatted messages
3. Use **React.memo** for components
4. **Lazy load** translations
5. Only include **needed forms** in bundles

---

## Navigation

**Continue Reading:**

- [03 - Date & Number Formatting](./03-date-number-formatting.md) - Intl APIs
- [04 - RTL Support](./04-rtl-support.md) - Right-to-left languages

**Related Topics:**

- [01 - i18n Fundamentals](./01-i18n-fundamentals.md) - Core concepts
- Frontend/JavaScript - String handling

---

**Last Updated:** January 2026
**Difficulty:** Intermediate
**Estimated Time:** 3-4 hours
