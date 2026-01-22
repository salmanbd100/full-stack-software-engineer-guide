# Frontend Internationalization (i18n)

## Overview

Internationalization (i18n) is the process of designing software to work across different languages, regions, and cultures. This guide covers everything needed to implement i18n in frontend applications and prepare for technical interviews.

---

## Table of Contents

- [Why i18n Matters](#why-i18n-matters)
- [Topics Covered](#topics-covered)
- [Quick Reference](#quick-reference)
- [Study Plan](#study-plan)
- [Interview Cheat Sheet](#interview-cheat-sheet)
- [Resources](#resources)

---

## Why i18n Matters

### 💡 **Interview Relevance**

| Reason | Why It Matters |
|--------|----------------|
| **Global Market** | Most enterprise apps serve international users |
| **Technical Depth** | Requires understanding of language rules and formatting |
| **User Experience** | Shows you think about diverse users |
| **Performance** | Proper i18n affects bundle size and load time |
| **Compliance** | Legal requirements for accessible, localized experiences |

---

### 💡 **What Interviewers Look For**

| Skill | Description |
|-------|-------------|
| **Concepts** | Understanding i18n vs l10n |
| **Libraries** | Knowledge of react-i18next, FormatJS |
| **Architecture** | Ability to structure translation files |
| **Detection** | Language detection and switching |
| **Pluralization** | Handling plural rules across languages |
| **Formatting** | Using Intl API for dates/numbers |
| **RTL Support** | Right-to-left language implementation |

---

## Topics Covered

### 📁 File Structure

```
Internationalization/
├── README.md                    # This file
├── 01-i18n-fundamentals.md      # Core concepts and setup
├── 02-pluralization.md          # Plural forms across languages
├── 03-date-number-formatting.md # Intl APIs
└── 04-rtl-support.md            # Right-to-left languages
```

---

### [01. i18n Fundamentals](./01-i18n-fundamentals.md)

Core concepts and library setup.

**Topics:**

- i18n vs l10n terminology
- Translation file structures (JSON, namespaces)
- Libraries: react-i18next, next-i18next, FormatJS
- Language detection strategies
- Language switching implementation
- Translation interpolation

**Key Concepts:**

| Term | Definition |
|------|------------|
| **i18n** | Technical infrastructure for multi-language support |
| **l10n** | Content and cultural adaptation for specific regions |
| **Namespace** | Logical grouping of translations by feature |
| **Interpolation** | Inserting dynamic values into translations |

---

### [02. Pluralization](./02-pluralization.md)

Handle plural forms correctly across languages.

**Topics:**

- Plural rules across languages
- CLDR plural categories
- ICU MessageFormat syntax
- i18next pluralization
- Intl.PluralRules API

**Language Plural Forms:**

| Language | Forms | Example |
|----------|-------|---------|
| English | 2 | one, other |
| Russian | 4 | one, few, many, other |
| Arabic | 6 | zero, one, two, few, many, other |

---

### [03. Date & Number Formatting](./03-date-number-formatting.md)

Master the Intl API for locale-aware formatting.

**Topics:**

- Intl.DateTimeFormat
- Intl.NumberFormat
- Intl.RelativeTimeFormat
- Currency formatting
- Time zone handling

**Quick Examples:**

```javascript
// Date formatting
new Intl.DateTimeFormat('de-DE').format(new Date());
// "22.1.2026"

// Currency formatting
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(1234.56);
// "$1,234.56"
```

---

### [04. RTL Support](./04-rtl-support.md)

Implement right-to-left language support.

**Topics:**

- RTL languages (Arabic, Hebrew, Persian)
- CSS logical properties
- HTML dir attribute
- Flexbox and Grid in RTL
- Icon mirroring strategies

**CSS Logical Properties:**

| Physical | Logical |
|----------|---------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `text-align: left` | `text-align: start` |

---

## Quick Reference

### 💡 **Setup react-i18next**

```javascript
// 1. Install
npm install i18next react-i18next

// 2. Create i18n.js
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

// 3. Use in component
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  return <h1>{t('welcome')}</h1>;
}
```

---

### 💡 **Common Tasks**

| Task | Code |
|------|------|
| **Format date** | `new Intl.DateTimeFormat('de-DE').format(date)` |
| **Format currency** | `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)` |
| **Pluralize** | `t('items', { count: 5 })` |
| **Switch language** | `i18n.changeLanguage('es')` |
| **Detect RTL** | `['ar', 'he', 'fa'].includes(lang)` |

---

### 💡 **Library Comparison**

| Library | Best For | Bundle Size |
|---------|----------|-------------|
| **react-i18next** | React apps | ~40KB |
| **next-i18next** | Next.js apps | ~40KB |
| **FormatJS** | Enterprise | ~25KB |
| **Day.js** | Date formatting | ~2KB |

---

## Study Plan

### Beginner Track (1-2 weeks)

| Day | Focus |
|-----|-------|
| 1-2 | Read 01-i18n-fundamentals.md |
| 3-4 | Set up react-i18next in practice project |
| 5-6 | Implement language switching |
| 7-8 | Review interview questions |

---

### Intermediate Track (2-3 weeks)

| Week | Focus |
|------|-------|
| 1 | Complete all 4 files, implement date/number formatting |
| 2 | Add RTL support, handle pluralization |
| 3 | Practice all interview questions |

---

### Advanced Track (3-4 weeks)

| Week | Focus |
|------|-------|
| 1-2 | Deep dive into edge cases and performance |
| 3 | Build comprehensive i18n system |
| 4 | System design questions, optimization |

---

## Interview Cheat Sheet

### 💡 **Must-Know Concepts**

| Concept | Key Points |
|---------|------------|
| **i18n vs l10n** | Infrastructure vs cultural adaptation |
| **Translation files** | JSON structure, namespaces, nested keys |
| **Language detection** | User preference → browser → default |
| **Intl API** | Native browser APIs for formatting |
| **Plural rules** | Different across languages, use library support |
| **RTL** | Logical CSS properties, dir attribute |

---

### 💡 **Common Interview Questions**

| Question | Key Answer Points |
|----------|-------------------|
| "How would you implement language switching?" | Language state + localStorage + i18n library |
| "What's the difference between i18n and l10n?" | Infrastructure vs adaptation |
| "How do you handle pluralization?" | Library rules or ICU MessageFormat |
| "Explain RTL support" | CSS logical properties + dir attribute |
| "How would you structure translation files?" | Namespaces, nested keys, consistent structure |

---

### 💡 **Best Practices**

| ✅ Do | ❌ Don't |
|-------|---------|
| Extract all strings to translation files | Hardcode strings in UI |
| Use CSS logical properties for RTL | Use physical properties (margin-left) |
| Persist language preference | Forget language persistence |
| Provide fallback translations | Leave missing translations unhandled |
| Test with multiple languages including RTL | Only test with English |

---

## Resources

### Official Documentation

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Guide](https://react.i18next.com/)
- [MDN Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [FormatJS Documentation](https://formatjs.io/)
- [CLDR Plural Rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)

### Practice Ideas

- Build a weather app with multiple languages
- Add i18n to an existing project
- Create translation management UI
- Implement real-time language switching
- Test with multiple RTL languages

---

## Completion Checklist

| Task | Status |
|------|--------|
| Read all 4 i18n files | ☐ |
| Understand i18n vs l10n concepts | ☐ |
| Set up react-i18next project | ☐ |
| Implement language detection/switching | ☐ |
| Add date/number formatting with Intl API | ☐ |
| Implement pluralization correctly | ☐ |
| Add RTL language support | ☐ |
| Review all 40 interview questions | ☐ |
| Build multi-language demo app | ☐ |
| Test with 3+ languages including RTL | ☐ |

---

## Navigation

**Files in This Section:**

1. [01 - i18n Fundamentals](./01-i18n-fundamentals.md) - Core concepts and setup
2. [02 - Pluralization](./02-pluralization.md) - Plural forms across languages
3. [03 - Date & Number Formatting](./03-date-number-formatting.md) - Intl APIs
4. [04 - RTL Support](./04-rtl-support.md) - Right-to-left languages

**Related Topics:**

- Frontend/React - Component patterns
- Frontend/JavaScript - ES6+ modules
- Frontend/TypeScript - Type safety for i18n
- Frontend/WebPerformance - Bundle optimization

---

**Last Updated:** January 2026
**Difficulty:** Intermediate to Advanced
**Estimated Time:** 20-30 hours
