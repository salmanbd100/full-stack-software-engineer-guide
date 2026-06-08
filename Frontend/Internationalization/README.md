# Frontend Internationalization (i18n)

Internationalization (i18n) is the process of designing software to work across different languages, regions, and cultures.

---

## Topics Covered

```
Internationalization/
├── README.md                    # This file
├── 01-i18n-fundamentals.md      # Core concepts, libraries, detection, switching
├── 02-pluralization.md          # Plural rules across languages
├── 03-date-number-formatting.md # Intl APIs for dates, numbers, currency
└── 04-rtl-support.md            # Right-to-left language implementation
```

---

### [01. i18n Fundamentals](./01-i18n-fundamentals.md)

Core concepts and setup for multi-language support.

**Topics:** i18n vs l10n, JSON translation files, namespaces, react-i18next, next-i18next, language detection, language switching, interpolation, TypeScript integration.

| Term | Definition |
|------|------------|
| **i18n** | Technical infrastructure for multi-language support |
| **l10n** | Content and cultural adaptation for specific regions |
| **Namespace** | Logical grouping of translations by feature |
| **Interpolation** | Inserting dynamic values into translation strings |

---

### [02. Pluralization](./02-pluralization.md)

Handle plural forms correctly across languages.

**Topics:** CLDR plural categories, ICU MessageFormat, i18next suffix pattern, `Intl.PluralRules`.

| Language | Forms | Example |
|----------|-------|---------|
| English | 2 | one, other |
| Russian | 4 | one, few, many, other |
| Arabic | 6 | zero, one, two, few, many, other |

---

### [03. Date & Number Formatting](./03-date-number-formatting.md)

Native browser Intl APIs — no library required for formatting.

**Topics:** `Intl.DateTimeFormat`, `Intl.NumberFormat`, currency, `Intl.RelativeTimeFormat`, time zones.

```typescript
// Date formatting
new Intl.DateTimeFormat('de-DE').format(new Date());  // "22.1.2026"

// Currency
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.56);
// "$1,234.56"
```

---

### [04. RTL Support](./04-rtl-support.md)

Right-to-left language support for Arabic, Hebrew, Persian, Urdu.

**Topics:** `dir` attribute, CSS logical properties, Flexbox/Grid in RTL, icon mirroring.

| Physical (breaks RTL) | Logical (works both) |
|-----------------------|----------------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `text-align: left` | `text-align: start` |

---

## Quick Reference

### Setup react-i18next

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { welcome: 'Welcome' } },
    es: { translation: { welcome: 'Bienvenido' } }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});
```

```typescript
// Component
import { useTranslation } from 'react-i18next';

function App(): JSX.Element {
  const { t } = useTranslation();
  return <h1>{t('welcome')}</h1>;
}
```

---

### Common Tasks

| Task | Code |
|------|------|
| **Format date** | `new Intl.DateTimeFormat('de-DE').format(date)` |
| **Format currency** | `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)` |
| **Pluralize** | `t('items', { count: 5 })` |
| **Switch language** | `i18n.changeLanguage('es')` |
| **Set RTL** | `document.documentElement.dir = 'rtl'` |

---

### Library Comparison

| Library | Best For | Bundle Size |
|---------|----------|-------------|
| **react-i18next** | React apps | ~40KB |
| **next-i18next** | Next.js (SSR) | ~40KB |
| **FormatJS** | Enterprise, ICU | ~25KB |

---

## Interview Cheat Sheet

| Concept | Key Point |
|---------|-----------|
| **i18n vs l10n** | Infrastructure vs cultural adaptation |
| **Translation files** | JSON, namespaces by feature, nested keys |
| **Language detection** | localStorage → URL → browser → default |
| **Intl API** | Native browser formatting, no library needed |
| **Plural rules** | Language-dependent, use `Intl.PluralRules` |
| **RTL** | CSS logical properties + `dir` attribute |

---

**Last Updated:** June 2026
**Difficulty:** Intermediate to Advanced
