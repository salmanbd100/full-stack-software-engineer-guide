# Pluralization

Pluralization is complex because languages have different rules. English has 2 forms, Russian has 4, Arabic has 6. Getting this wrong shows up immediately for non-English users.

---

## Table of Contents

- [Plural Rules Across Languages](#plural-rules-across-languages)
- [CLDR Categories](#cldr-categories)
- [ICU MessageFormat](#icu-messageformat)
- [i18next Implementation](#i18next-implementation)
- [Intl.PluralRules API](#intlpluralrules-api)
- [Common Mistakes](#common-mistakes)
- [Interview Questions](#interview-questions)

---

## Plural Rules Across Languages

### 💡 **Language Comparison**

| Language | Forms | Categories |
|----------|-------|------------|
| **English** | 2 | one, other |
| **German** | 2 | one, other |
| **Russian** | 4 | one, few, many, other |
| **Polish** | 4 | one, few, many, other |
| **Arabic** | 6 | zero, one, two, few, many, other |
| **Chinese** | 1 | other (no pluralization) |

> Never assume English plural rules apply to other languages.

---

### 💡 **Russian Rules (4 Forms)**

Russian pluralization depends on the last digit, with a special case for 11–14.

| Category | When | Examples |
|----------|------|----------|
| `one` | Last digit is 1 (except 11) | 1, 21, 31 |
| `few` | Last digit is 2–4 (except 12–14) | 2, 3, 4, 22 |
| `many` | Last digit is 0, 5–9, or 11–14 | 0, 5, 11, 25 |

```json
// ru.json
{
  "messages_one": "{{count}} сообщение",
  "messages_few": "{{count}} сообщения",
  "messages_many": "{{count}} сообщений"
}
```

```typescript
t('messages', { count: 21 })  // "21 сообщение" (one — ends in 1)
t('messages', { count: 5 })   // "5 сообщений"  (many)
t('messages', { count: 2 })   // "2 сообщения"  (few)
```

---

### 💡 **Arabic Rules (6 Forms)**

| Category | When |
|----------|------|
| `zero` | 0 |
| `one` | 1 |
| `two` | 2 |
| `few` | 3–10 |
| `many` | 11–99 |
| `other` | 100+ |

---

## CLDR Categories

The **Common Locale Data Repository (CLDR)** defines plural rules for 300+ languages.

### 💡 **All Possible Categories**

| Category | Description |
|----------|-------------|
| `zero` | Zero quantity |
| `one` | Singular |
| `two` | Dual (exactly two) |
| `few` | Small plural |
| `many` | Large plural |
| `other` | Default fallback |

```typescript
// Check supported categories for a locale
new Intl.PluralRules('en').resolvedOptions().pluralCategories;
// ['one', 'other']

new Intl.PluralRules('ru').resolvedOptions().pluralCategories;
// ['one', 'few', 'many', 'other']

new Intl.PluralRules('ar').resolvedOptions().pluralCategories;
// ['zero', 'one', 'two', 'few', 'many', 'other']
```

---

## ICU MessageFormat

### 💡 **Syntax**

```
{variable, plural, category1 {text} category2 {text} other {text}}
```

`#` is replaced with the actual count.

```typescript
// English
"{count, plural, one {# item} other {# items}}"

// Gender + plural combined
`{gender, select,
  male {He}
  female {She}
  other {They}
} bought {count, plural,
  one {# book}
  other {# books}
}`
// "She bought 3 books"
```

---

### 💡 **ICU in Translation Files (FormatJS)**

```json
{
  "itemCount": "{count, plural, one {# item} other {# items}}",
  "notification": "{name} sent you {count, plural, one {a message} other {# messages}}"
}
```

```typescript
intl.formatMessage({ id: 'itemCount' }, { count: 5 });
// "5 items"
```

| Feature | ICU | i18next |
|---------|-----|---------|
| Format | Rules inside a single string | Separate keys with suffixes |
| Complexity | Compact, more powerful | Simpler to get started |
| Gender support | Built-in `select` | Requires custom handling |

---

## i18next Implementation

### 💡 **Key Suffixes by Language**

| Language | Suffixes Required |
|----------|-------------------|
| English | `_one`, `_other` |
| Russian | `_one`, `_few`, `_many` |
| Arabic | `_zero`, `_one`, `_two`, `_few`, `_many`, `_other` |

```json
// en.json
{
  "messages_one": "You have {{count}} message",
  "messages_other": "You have {{count}} messages"
}
```

```json
// ru.json
{
  "messages_one": "У вас {{count}} сообщение",
  "messages_few": "У вас {{count}} сообщения",
  "messages_many": "У вас {{count}} сообщений"
}
```

---

### 💡 **Component Usage**

```typescript
import { useTranslation } from 'react-i18next';

interface MessageCountProps {
  count: number;
}

function MessageCount({ count }: MessageCountProps): JSX.Element {
  const { t } = useTranslation();
  // i18next selects the correct form based on the active language
  return <p>{t('messages', { count })}</p>;
}
```

The same component works for all languages. The translation file drives the plural form.

---

## Intl.PluralRules API

### 💡 **Native Browser API**

No library needed for basic plural category selection.

```typescript
const rules = new Intl.PluralRules('en');
rules.select(1);  // 'one'
rules.select(5);  // 'other'

const ruRules = new Intl.PluralRules('ru');
ruRules.select(1);   // 'one'
ruRules.select(2);   // 'few'
ruRules.select(21);  // 'one' — important edge case!
```

---

### 💡 **Memoize Instances**

```typescript
// ❌ Bad: New instance on every call
function getPluralForm(count: number, locale: string): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}

// ✅ Good: Cache per locale
const rulesCache = new Map<string, Intl.PluralRules>();

function getPluralForm(count: number, locale: string): Intl.LDMLPluralRule {
  if (!rulesCache.has(locale)) {
    rulesCache.set(locale, new Intl.PluralRules(locale));
  }
  return rulesCache.get(locale)!.select(count);
}
```

---

## Common Mistakes

### 💡 **Hardcoded English Logic**

```typescript
// ❌ Bad: Works only for English
const label = count === 1 ? 'item' : 'items';

// ✅ Good: Library handles all languages
t('items', { count });
```

---

### 💡 **Missing Plural Forms**

```json
// ❌ Bad: Only singular provided for Russian
{ "items": "{{count}} товар" }

// ✅ Good: All required forms
{
  "items_one": "{{count}} товар",
  "items_few": "{{count}} товара",
  "items_many": "{{count}} товаров"
}
```

---

### 💡 **Better Zero Handling**

```json
// Default: 0 falls into "other" — technically correct but cold
// "You have 0 messages"

// Better UX: add a _zero key for a friendlier message
{
  "items_zero": "You have no items",
  "items_one": "You have {{count}} item",
  "items_other": "You have {{count}} items"
}
```

---

## Interview Questions

### 1. Why is pluralization language-dependent?

Languages have different grammatical rules: English has 2 forms, Russian has 4 (based on last digit), Arabic has 6. Hardcoding `count === 1 ? singular : plural` breaks every language except English.

### 2. What are CLDR plural categories?

`zero`, `one`, `two`, `few`, `many`, `other`. Not all languages use all six. English only uses `one` and `other`. Arabic uses all six.

### 3. How do you implement pluralization in react-i18next?

Use key suffixes (`_one`, `_other`, etc.) in translation files, then call `t('key', { count })`. i18next automatically selects the correct suffix based on the active language's rules.

### 4. What is ICU MessageFormat and when would you use it?

A standard that encodes plural rules in a single string: `{count, plural, one {# item} other {# items}}`. Use it with FormatJS for complex cases like gender-plural combinations.

### 5. How do you handle the "zero" case?

Add a `_zero` suffix key for a custom "empty state" message, or handle it in the component: `count === 0 ? t('noItems') : t('items', { count })`.

---

## Navigation

- [01 - i18n Fundamentals](./01-i18n-fundamentals.md)
- [03 - Date & Number Formatting](./03-date-number-formatting.md)
- [04 - RTL Support](./04-rtl-support.md)

---

**Last Updated:** June 2026
**Difficulty:** Intermediate
