---
title: Pluralisation
part: 2
chapter: 0
slug: pluralization
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-01
tags: [i18n, pluralization, cldr, icu, intl]
in_book: true
---

# Pluralisation {#ch-pluralization}

> Handle a language with six plural forms without writing a single `count === 1`.

**In this chapter:** why plural rules differ · the six CLDR categories · ICU MessageFormat · `Intl.PluralRules` · the zero case English gets away with

## 💡 The Core Idea

English has two plural forms and that is a historical accident, not a rule about language. Russian has
four, chosen by the last digit. Arabic has six, including a distinct form for exactly two. Chinese has
one. So the correct number of forms is not a property of your code — it is a property of the locale, and
the only way to get it right is to ask the locale rather than assume. That is what the CLDR plural
categories are: a per-language answer to "which form does this number take?" that the platform already
ships.

> `count === 1 ? 'item' : 'items'` is not a simplification. It is a bug that happens to be invisible in
> English.

## How It Works

The Common Locale Data Repository defines the plural rules for over 300 languages using six category
names. A language uses a subset.

| Category | Means | Used by |
| -------- | ----- | ------- |
| `zero` | An explicit zero form | Arabic, Latvian |
| `one` | Singular | Most languages |
| `two` | Exactly two | Arabic, Welsh, Slovenian |
| `few` | A small plural | Russian, Polish, Czech |
| `many` | A large plural | Russian, Polish, Arabic |
| `other` | The fallback every language has | All |

| Language | Forms | Categories |
| -------- | ----- | ---------- |
| Chinese, Japanese, Korean | 1 | `other` |
| English, German | 2 | `one`, `other` |
| Russian, Polish | 4 | `one`, `few`, `many`, `other` |
| Arabic | 6 | all of them |

Russian is the example worth knowing, because it shows that the rule is arithmetic rather than a
threshold: the form depends on the **last digit**, with an exception for 11–14.

| Count ends in | Category | Examples |
| ------------- | -------- | -------- |
| 1, but not 11 | `one` | 1, 21, 101 |
| 2–4, but not 12–14 | `few` | 2, 3, 22, 34 |
| 0, 5–9, or 11–14 | `many` | 0, 5, 11, 25, 113 |

So 21 takes the *singular* form in Russian. Any implementation that special-cases 1 and treats
everything above it as plural gets 21, 31 and 101 wrong, and no English-speaking reviewer will notice.

**Ask the platform which category applies:**

```typescript
// Constructing Intl objects is expensive — cache one per locale.
const cache = new Map<string, Intl.PluralRules>();

function pluralCategory(locale: string, count: number): Intl.LDMLPluralRule {
  let rules = cache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    cache.set(locale, rules);
  }
  return rules.select(count);
}

pluralCategory('en', 21); // 'other'
pluralCategory('ru', 21); // 'one'  — the case hand-rolled logic always misses
pluralCategory('ar', 2); //  'two'
```

`resolvedOptions().pluralCategories` tells you which categories a locale needs, which is exactly the
check a translation-file linter should run.

### ICU MessageFormat

ICU puts every form in one string, so the whole sentence stays in one place and the translator sees
the shape of it. `#` is replaced by the formatted count.

```text
{count, plural, one {# unread message} other {# unread messages}}
```

Its real advantage is composing plural with other selectors, which suffix-based systems cannot express
without splitting the sentence:

```text
{gender, select, female {She} male {He} other {They}} shared
{count, plural, one {# document} other {# documents}}
```

The alternative convention — one key per form, distinguished by a suffix — is simpler to read and
adequate for most applications:

```json
{
  "inbox.unread_one": "You have {{count}} unread message",
  "inbox.unread_other": "You have {{count}} unread messages"
}
```

```json
{
  "inbox.unread_one": "У вас {{count}} непрочитанное сообщение",
  "inbox.unread_few": "У вас {{count}} непрочитанных сообщения",
  "inbox.unread_many": "У вас {{count}} непрочитанных сообщений"
}
```

The component is identical for every locale, because the locale's rules — not the code — pick the key.

```typescript
function UnreadBadge({ count }: { count: number }): JSX.Element {
  const { t } = useTranslation();
  // Passing `count` is what triggers plural selection. Passing it as a
  // pre-formatted string silently disables it.
  return <p>{t('inbox.unread', { count })}</p>;
}
```

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Plain counted noun, several locales | Suffix keys plus the library's selection | Least ceremony, and translators recognise the convention |
| Plural combined with gender or a variant | ICU MessageFormat | A suffix scheme would need one key per combination |
| No translation library, one or two strings | `Intl.PluralRules` directly | It is already in the runtime |
| Zero deserves different copy | An explicit empty-state string | `other` renders "0 messages", which is correct and cold |
| Very large numbers in the UI | `Intl.NumberFormat` with a compact notation, then plural on the rounded value | "1.2K messages" needs the plural of what is displayed |

## Common Mistakes

**❌ Wrong — the English rule, hard-coded:**

```typescript
// Correct in English and German. Wrong in Russian at 21, wrong in Arabic at 2,
// and wrong in Chinese, which has no plural at all.
const label = count === 1 ? t('item.singular') : t('item.plural');
```

**✅ Right — let the locale decide:**

```typescript
const label = t('item', { count });
```

**❌ Wrong — shipping only the forms English needs.** A Russian file with `_one` and `_other` and no
`_few` or `_many` falls back to `other` for 2, 3 and 4, which reads as a grammatical error to every
Russian user. Lint the translation files against `pluralCategories` for the locale.

**❌ Wrong — treating zero as a plural problem.** CLDR puts 0 in `other` for English, and "You have 0
messages" is grammatically fine but reads badly. That is a copy decision, not a plural one: branch to
a real empty-state string when the count is zero.

## 🔑 Key Takeaways

- The number of plural forms is a property of the locale, and it ranges from one in Chinese to six in Arabic.
- Russian selects its form from the last digit, so 21 takes the singular and any `count === 1` check is wrong.
- `Intl.PluralRules` ships in every runtime and tells you both the category for a count and the categories a locale needs.
- ICU MessageFormat keeps the whole sentence in one string and is the only practical way to combine plural with gender.
- A missing plural form does not throw; it silently falls back to `other` and reads as a grammar mistake.

## Interview Questions

**Q: Why is `count === 1 ? 'item' : 'items'` wrong?**

Because it encodes English grammar as if it were universal. Russian picks its form from the last digit,
so 21 needs the singular; Arabic has a distinct form for exactly two; Chinese has no plural at all. The
correct implementation asks the locale, either through `Intl.PluralRules` or through a translation
library that wraps it.

**Q: What are the CLDR plural categories, and how do you know which a locale uses?**

`zero`, `one`, `two`, `few`, `many` and `other`. Every locale has `other`; the rest are a per-language
subset. `new Intl.PluralRules(locale).resolvedOptions().pluralCategories` returns exactly the set that
locale needs, which makes it the right basis for a check on your translation files in CI.

**Q: When would you reach for ICU MessageFormat over suffix keys?**

When one sentence varies on more than one axis. Plural crossed with gender, or with a formality
variant, produces a combinatorial set of suffix keys, and ICU expresses it as nested selectors in a
single string the translator can read as a sentence. For a plain counted noun, suffix keys are less
machinery for the same result.

**Q: How do you handle zero?**

As a copy question rather than a grammar one. CLDR puts zero in `other` for most languages, which is
grammatically right and reads coldly, so branch to a purpose-written empty state — "No unread
messages" — before the count reaches the plural machinery at all.

## What to Read Next

- [Chapter ?? — Internationalisation Fundamentals](#ch-i18n-fundamentals) — the key structure this depends on
- [Chapter ?? — Date and Number Formatting](#ch-date-number-formatting) — the rest of the `Intl` family
