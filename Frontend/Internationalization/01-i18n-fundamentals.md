# i18n Fundamentals

Internationalization (i18n) is the technical foundation for building apps that work across multiple languages and regions.

---

## Table of Contents

- [i18n vs l10n](#i18n-vs-l10n)
- [Translation File Structure](#translation-file-structure)
- [Popular Libraries](#popular-libraries)
- [Language Detection](#language-detection)
- [Language Switching](#language-switching)
- [Translation Interpolation](#translation-interpolation)
- [TypeScript Integration](#typescript-integration)
- [Interview Questions](#interview-questions)

---

## i18n vs l10n

### 💡 **Key Difference**

| Aspect | i18n | l10n |
|--------|------|------|
| **What** | Technical infrastructure | Content & cultural adaptation |
| **Responsibility** | Engineers | Translators |
| **Timing** | Built into architecture | Added per language |
| **Cost** | One-time setup | Ongoing per language |

> Think of i18n as the plumbing, l10n as the water.

**What l10n handles:**

```typescript
// Date formats differ by region
'en-US': 'MM/DD/YYYY'  // 12/18/2025
'de-DE': 'DD.MM.YYYY'  // 18.12.2025

// Number separators vary
'en-US': '1,234.56'    // Comma thousands, period decimal
'de-DE': '1.234,56'    // Period thousands, comma decimal
```

---

## Translation File Structure

### 💡 **JSON Format**

```json
// en.json
{
  "greeting": "Hello",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "notifications": {
    "message_one": "You have {{count}} message",
    "message_other": "You have {{count}} messages"
  }
}
```

```typescript
const { t } = useTranslation();
t('greeting')                        // "Hello"
t('buttons.save')                    // "Save"
t('notifications.message', { count: 5 })  // "You have 5 messages"
```

---

### 💡 **Namespace Strategy**

Organize translations by feature for large apps.

```
locales/
├── en/
│   ├── common.json      # Shared: save, cancel, delete
│   ├── auth.json        # Login, register screens
│   └── dashboard.json   # Dashboard page
└── es/
    ├── common.json
    └── ...
```

```typescript
const { t } = useTranslation('auth');
t('login.title')  // From auth namespace

const { t: tCommon } = useTranslation('common');
tCommon('button.save')  // From common namespace
```

| App Size | Strategy |
|----------|----------|
| **Small** | Single file per language (`locales/en.json`) |
| **Medium** | By namespace (`locales/en/common.json`) |
| **Large** | By feature (`src/features/auth/locales/en.json`) |

> Start simple. Split into namespaces only when a file exceeds ~500 keys.

---

## Popular Libraries

### 💡 **Comparison**

| Library | Best For | Bundle Size |
|---------|----------|-------------|
| **react-i18next** | React apps | ~40KB |
| **next-i18next** | Next.js (SSR) | ~40KB |
| **FormatJS** | Enterprise, ICU | ~25KB |

---

### 💡 **react-i18next**

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { greeting: 'Hello!' } },
    es: { translation: { greeting: '¡Hola!' } }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
```

```typescript
import { useTranslation } from 'react-i18next';

function Welcome(): JSX.Element {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <h1>{t('greeting')}</h1>
      <button onClick={() => i18n.changeLanguage('es')}>Switch to Spanish</button>
    </div>
  );
}
```

---

### 💡 **next-i18next (SSR)**

```typescript
// next-i18next.config.js
module.exports = {
  i18n: { defaultLocale: 'en', locales: ['en', 'es', 'de'] },
  localePath: './public/locales'
};
```

```typescript
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';

export default function HomePage(): JSX.Element {
  const { t } = useTranslation('common');
  return <h1>{t('title')}</h1>;
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale ?? 'en', ['common'])) }
});
```

---

## Language Detection

### 💡 **Detection Priority**

```
1. User preference (localStorage)   ← Most reliable
       ↓
2. URL path or parameter (/en/page)
       ↓
3. Browser language (navigator.language)
       ↓
4. Fallback default                 ← Last resort
```

---

### 💡 **Implementation**

```typescript
const SUPPORTED = ['en', 'es', 'de', 'fr', 'ar'] as const;
type SupportedLang = typeof SUPPORTED[number];

function detectLanguage(): SupportedLang {
  const saved = localStorage.getItem('language') as SupportedLang | null;
  if (saved && (SUPPORTED as readonly string[]).includes(saved)) return saved;

  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && (SUPPORTED as readonly string[]).includes(urlLang)) {
    return urlLang as SupportedLang;
  }

  const browserLang = navigator.language.split('-')[0] as SupportedLang;
  if ((SUPPORTED as readonly string[]).includes(browserLang)) return browserLang;

  return 'en';
}
```

---

## Language Switching

### 💡 **Language Switcher**

```typescript
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' }
];

function isRTL(lang: string): boolean {
  return ['ar', 'he', 'fa', 'ur'].includes(lang);
}

function LanguageSwitcher(): JSX.Element {
  const { i18n } = useTranslation();

  const handleChange = async (code: string): Promise<void> => {
    await i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    document.documentElement.lang = code;
    document.documentElement.dir = isRTL(code) ? 'rtl' : 'ltr';
  };

  return (
    <select value={i18n.language} onChange={(e) => handleChange(e.target.value)}>
      {LANGUAGES.map(({ code, name }) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );
}
```

---

## Translation Interpolation

### 💡 **Variable Substitution**

```json
{
  "welcome": "Welcome, {{name}}!",
  "itemCount": "You have {{count}} items"
}
```

```typescript
t('welcome', { name: 'Alice' })   // "Welcome, Alice!"
t('itemCount', { count: 42 })     // "You have 42 items"
```

---

### 💡 **Trans Component for JSX**

Use when translation strings contain HTML or React elements:

```json
{ "termsAccept": "I accept the <1>terms</1> and <3>privacy policy</3>" }
```

```typescript
import { Trans } from 'react-i18next';

function TermsCheckbox(): JSX.Element {
  return (
    <Trans i18nKey="termsAccept">
      I accept the <a href="/terms">terms</a> and
      <a href="/privacy">privacy policy</a>
    </Trans>
  );
}
```

| Scenario | Use This |
|----------|----------|
| Plain text | `t('key')` |
| Text with variables | `t('key', { name: value })` |
| Text with HTML/JSX | `<Trans>` component |
| Pluralization | `t('key', { count: number })` |

---

## TypeScript Integration

### 💡 **Type-Safe Translations**

```typescript
// types/i18n.d.ts
interface Translations {
  greeting: string;
  buttons: {
    save: string;
    cancel: string;
  };
}

declare module 'react-i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: Translations;
    };
  }
}

// t() is now fully typed — typos become compile errors
const { t } = useTranslation();
t('greeting')   // ✅ OK
t('invalid')    // ❌ TypeScript error
```

---

## Interview Questions

### 1. What's the difference between i18n and l10n?

- **i18n**: Technical infrastructure — string extraction, library setup, language detection and switching
- **l10n**: Content and cultural adaptation — actual translations, date/number formats, cultural considerations

### 2. How does language detection work?

Priority: localStorage → URL parameter → `navigator.language` → fallback default. Each step is a more reliable signal of user intent than the next.

### 3. What's the difference between `t()` and `<Trans>`?

| `t()` | `<Trans>` |
|-------|-----------|
| Returns a string | Returns JSX |
| Simple variable interpolation | HTML/React elements in translations |

### 4. How do you handle missing translations?

Set `fallbackLng: 'en'`, use `missingKeyHandler` to log in development, and provide `defaultValue` in components for critical strings.

### 5. How do you optimize i18n bundle size?

Lazy load translations by namespace using `i18next-http-backend`. Only load translations needed for the current page; load others on demand.

---

## Navigation

- [02 - Pluralization](./02-pluralization.md)
- [03 - Date & Number Formatting](./03-date-number-formatting.md)
- [04 - RTL Support](./04-rtl-support.md)

---

**Last Updated:** June 2026
**Difficulty:** Intermediate
