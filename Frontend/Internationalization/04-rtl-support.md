# RTL Support

Right-to-left languages — Arabic, Hebrew, Persian, Urdu — are used by over 1 billion people. Proper RTL support requires more than flipping text: CSS logical properties, layout adaptation, and icon mirroring.

---

## Table of Contents

- [RTL Languages](#rtl-languages)
- [HTML Foundation](#html-foundation)
- [CSS Logical Properties](#css-logical-properties)
- [Flexbox and Grid in RTL](#flexbox-and-grid-in-rtl)
- [Icon Mirroring](#icon-mirroring)
- [Common Mistakes](#common-mistakes)
- [Interview Questions](#interview-questions)

---

## RTL Languages

| Language | Code | Speakers |
|----------|------|----------|
| **Arabic** | `ar` | 374M+ |
| **Hebrew** | `he` | 9M |
| **Persian** | `fa` | 70M+ |
| **Urdu** | `ur` | 70M+ |

> Numbers always remain LTR even in RTL text. The browser handles mixed-direction content automatically via the Unicode Bidirectional Algorithm.

---

## HTML Foundation

### 💡 **The dir Attribute**

Always set `dir` on the root `<html>` element. This drives the browser's bidi algorithm, layout order, and CSS logical property resolution.

```html
<html dir="rtl" lang="ar">   <!-- RTL -->
<html dir="ltr" lang="en">   <!-- LTR (default) -->
<html dir="auto">             <!-- Browser auto-detects — for user-generated content -->
```

> Always match `dir` and `lang` attributes. Mismatches cause accessibility issues with screen readers.

---

### 💡 **Dynamic Direction**

```typescript
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'] as const;

function setDocumentDirection(language: string): void {
  const isRTL = (RTL_LANGUAGES as readonly string[]).includes(language);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

// More robust — use Intl.Locale where available
function isRTLLocale(locale: string): boolean {
  try {
    return new Intl.Locale(locale).getTextInfo?.()?.direction === 'rtl';
  } catch {
    return (RTL_LANGUAGES as readonly string[]).includes(locale.split('-')[0]);
  }
}
```

---

## CSS Logical Properties

### 💡 **Physical vs Logical**

| Physical (breaks RTL) | Logical (works both) |
|-----------------------|----------------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |

> Logical properties automatically flip when `dir="rtl"`. Use them everywhere — no RTL overrides needed.

---

### 💡 **Before / After Example**

```css
/* ❌ Bad: Physical properties break in RTL */
.sidebar {
  margin-left: 2rem;
  padding-right: 1rem;
  border-left: 3px solid #333;
}

/* ✅ Good: Logical properties work in both directions */
.sidebar {
  margin-inline-start: 2rem;
  padding-inline-end: 1rem;
  border-inline-start: 3px solid #333;
}
```

---

### 💡 **Shorthand**

```css
.container {
  padding-inline: 1.5rem;     /* both inline sides */
  margin-inline: 1rem 2rem;   /* inline-start, inline-end */
  margin-block: 1rem;         /* top and bottom — never changes with direction */
}
```

---

## Flexbox and Grid in RTL

### 💡 **Automatic Adaptation**

Flexbox and CSS Grid automatically respect the `dir` attribute. No extra CSS required.

```css
.navbar {
  display: flex;
  justify-content: space-between;
}
/* LTR: logo left, nav right */
/* RTL: logo right, nav left — automatic! */
```

```css
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-areas: "sidebar main";
  gap: 2rem;
  padding-inline: 1rem;
}

.sidebar {
  grid-area: sidebar;
  border-inline-end: 1px solid #ddd;  /* Right side in LTR, left side in RTL */
}
```

---

## Icon Mirroring

### 💡 **Mirroring Rules**

| Icon Type | Mirror in RTL? | Examples |
|-----------|----------------|----------|
| **Directional** | ✅ Yes | Arrows, chevrons, reply, share, forward |
| **Universal** | ❌ No | Home, settings, star, close, search |

---

### 💡 **CSS Transform**

```css
/* Mirror only directional icons */
[dir="rtl"] .icon-arrow-left,
[dir="rtl"] .icon-arrow-right,
[dir="rtl"] .icon-chevron-left,
[dir="rtl"] .icon-chevron-right,
[dir="rtl"] .icon-reply {
  transform: scaleX(-1);
}
/* Home, star, close — no transform */
```

---

### 💡 **React Component**

```typescript
interface IconProps {
  name: string;
  mirror?: boolean;
  className?: string;
}

function Icon({ name, mirror = false, className = '' }: IconProps): JSX.Element {
  const isRTL = document.documentElement.dir === 'rtl';
  const shouldMirror = mirror && isRTL;

  return (
    <svg
      className={`icon icon--${name} ${className}`}
      style={shouldMirror ? { transform: 'scaleX(-1)' } : undefined}
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
}

// Usage
<Icon name="arrow-right" mirror />   // Flips in RTL
<Icon name="home" />                  // Never flips
```

---

## Common Mistakes

### 💡 **1: Not Setting dir**

```typescript
// ❌ Bad: Layout never changes direction
function App(): JSX.Element {
  return <div>Content</div>;
}

// ✅ Good: Set dir when language changes
i18n.on('languageChanged', (lang: string) => {
  setDocumentDirection(lang);
});
```

---

### 💡 **2: Physical CSS Properties**

```css
/* ❌ Bad: Hardcoded physical direction */
.button-icon { margin-left: 0.5rem; }

/* ✅ Good: Logical — flips automatically */
.button-icon { margin-inline-end: 0.5rem; }
```

---

### 💡 **3: Testing with English Placeholder Text**

```html
<!-- ❌ Bad: English text hides RTL layout issues -->
<div dir="rtl">English placeholder text</div>

<!-- ✅ Good: Real RTL content reveals actual problems -->
<div dir="rtl">مرحبا بالعربية</div>
```

---

### 💡 **4: Separate CSS Files for RTL**

```html
<!-- ❌ Bad: Double maintenance, easy to go out of sync -->
<link href="style-ltr.css" />
<link href="style-rtl.css" />

<!-- ✅ Good: Single file using logical properties -->
<link href="style.css" />
```

---

## Interview Questions

### 1. How do you implement RTL support in a React app?

Set `dir="rtl"` and the matching `lang` on `<html>` when the active language is RTL. Use CSS logical properties (`margin-inline-start`, `padding-inline-end`) throughout the stylesheet. Mirror directional icons with `scaleX(-1)`. Test with real Arabic or Hebrew content, not English placeholder text.

### 2. What are CSS logical properties?

Properties that adapt to text direction. `margin-inline-start` maps to `margin-left` in LTR and `margin-right` in RTL. They replace physical properties so one stylesheet works for both directions without any overrides.

### 3. Which icons should be mirrored in RTL?

Mirror directional icons (arrows, chevrons, reply, share — anything that implies a physical direction). Do not mirror universal icons (home, star, close, search) — their meaning doesn't change with reading direction.

### 4. Does Flexbox need special handling for RTL?

No. `flex-start`, `flex-end`, and `space-between` automatically respect the `dir` attribute. The same CSS works for both LTR and RTL.

### 5. How do you detect RTL programmatically?

Check a fixed list: `['ar', 'he', 'fa', 'ur'].includes(lang)`. For a more robust approach, use the `Intl.Locale` API: `new Intl.Locale(locale).getTextInfo?.()?.direction === 'rtl'`.

---

## Navigation

- [01 - i18n Fundamentals](./01-i18n-fundamentals.md)
- [02 - Pluralization](./02-pluralization.md)
- [03 - Date & Number Formatting](./03-date-number-formatting.md)

---

**Last Updated:** June 2026
**Difficulty:** Intermediate to Advanced
