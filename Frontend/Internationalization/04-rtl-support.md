# RTL Support

## Overview

Right-to-Left (RTL) language support affects over 1 billion people using Arabic, Hebrew, Persian, and Urdu. Beyond flipping text direction, proper RTL implementation requires careful CSS, layout, icon mirroring, and testing strategies. This guide covers everything needed for RTL-compatible applications.

---

## Table of Contents

- [RTL Languages Overview](#rtl-languages-overview)
- [HTML Foundation](#html-foundation)
- [CSS Logical Properties](#css-logical-properties)
- [Flexbox and Grid in RTL](#flexbox-and-grid-in-rtl)
- [Icons and Images](#icons-and-images)
- [Component-Level RTL](#component-level-rtl)
- [Testing RTL Layouts](#testing-rtl-layouts)
- [Common Mistakes](#common-mistakes)
- [Performance Considerations](#performance-considerations)
- [Interview Questions](#interview-questions)

---

## RTL Languages Overview

### 💡 **Major RTL Languages**

| Language | Code | Speakers | Region |
|----------|------|----------|--------|
| **Arabic** | `ar` | 374M+ | Middle East, North Africa |
| **Hebrew** | `he` | 9M | Israel |
| **Persian** | `fa` | 70M+ | Iran, Afghanistan |
| **Urdu** | `ur` | 70M+ | Pakistan, India |

> **Key Insight:** ~20% of the world's population uses RTL languages.

---

### 💡 **RTL vs LTR Characteristics**

| Feature | LTR | RTL |
|---------|-----|-----|
| **Text direction** | Left → Right | Right → Left |
| **Sidebar position** | Left | Right |
| **Number direction** | Left → Right | Left → Right (same!) |
| **Page flow** | Left to right | Right to left |

**Bidirectional Text Example:**

```javascript
// Arabic with English
"السعر: $100"  // "Price: $100"
// Contains RTL (Arabic) and LTR (numbers, symbols)
// Browser handles this automatically
```

---

## HTML Foundation

### 💡 **The dir Attribute**

**Critical:** Set `dir` on the `<html>` element.

```html
<!-- LTR (default) -->
<html dir="ltr" lang="en">

<!-- RTL -->
<html dir="rtl" lang="ar">

<!-- Auto (browser detects) -->
<html dir="auto">
```

| Value | Use Case |
|-------|----------|
| `ltr` | English, French, German |
| `rtl` | Arabic, Hebrew, Persian |
| `auto` | User-generated mixed content |

---

### 💡 **Complete RTL Markup**

```html
<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Arabic Page</title>
  </head>
  <body>
    <!-- Content reads right-to-left -->
  </body>
</html>
```

> **Key Insight:** Always match `dir` and `lang` attributes. Mismatches cause accessibility issues.

---

### 💡 **Setting Direction Dynamically**

```javascript
function setDirection(language) {
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(language);

  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

// Usage
setDirection('ar');  // Sets RTL for Arabic
setDirection('en');  // Sets LTR for English
```

---

## CSS Logical Properties

### 💡 **Physical vs Logical Properties**

| Physical (Breaks in RTL) | Logical (Works in Both) |
|--------------------------|-------------------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |

> **Key Insight:** Logical properties automatically flip in RTL. Use them everywhere.

---

### 💡 **Logical Properties Examples**

```css
/* ❌ Bad: Physical properties (breaks in RTL) */
.sidebar {
  margin-left: 2rem;
  padding-right: 1rem;
  border-left: 3px solid #333;
}

/* ✅ Good: Logical properties (works in both) */
.sidebar {
  margin-inline-start: 2rem;    /* Left in LTR, right in RTL */
  padding-inline-end: 1rem;     /* Right in LTR, left in RTL */
  border-inline-start: 3px solid #333;
}
```

---

### 💡 **Complete Mapping Reference**

**Inline (Horizontal) - Changes with Direction:**

| Physical | Logical | LTR | RTL |
|----------|---------|-----|-----|
| `left` | `inline-start` | Left | Right |
| `right` | `inline-end` | Right | Left |

**Block (Vertical) - Never Changes:**

| Physical | Logical | Always |
|----------|---------|--------|
| `top` | `block-start` | Top |
| `bottom` | `block-end` | Bottom |

---

### 💡 **Shorthand Properties**

```css
.container {
  /* Horizontal (inline) */
  margin-inline: 1rem 2rem;   /* start end */
  padding-inline: 1.5rem;     /* both */

  /* Vertical (block) */
  margin-block: 1rem 2rem;    /* start end */
  padding-block: 1rem;        /* both */
}
```

---

## Flexbox and Grid in RTL

### 💡 **Flexbox Adapts Automatically**

```css
.navbar {
  display: flex;
  justify-content: space-between;
}
/* LTR: logo left, menu right */
/* RTL: logo right, menu left (automatic!) */
```

> **Key Insight:** Flexbox respects `dir` attribute. No extra CSS needed.

---

### 💡 **Flex Alignment Properties**

| Property | Behavior |
|----------|----------|
| `flex-start` | Adapts to direction |
| `flex-end` | Adapts to direction |
| `space-between` | Works in both |
| `gap` | Works in both |

```css
.flex-container {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;  /* Adapts to direction */
}
```

---

### 💡 **CSS Grid Adapts Automatically**

```css
.grid-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-areas: "sidebar main";
  gap: 2rem;
}
/* LTR: sidebar left, main right */
/* RTL: sidebar right, main left (automatic!) */
```

---

### 💡 **Responsive RTL Layout Example**

```css
.page-layout {
  display: grid;
  grid-template-areas: "sidebar main";
  grid-template-columns: 250px 1fr;
  gap: 2rem;
  padding-inline: 1rem;  /* Logical padding */
}

.sidebar {
  grid-area: sidebar;
  border-inline-end: 1px solid #ddd;  /* Border on end side */
}

.main {
  grid-area: main;
}

/* Mobile: Stack vertically */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "sidebar"
      "main";
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-inline-end: none;
    border-block-end: 1px solid #ddd;
  }
}
```

---

## Icons and Images

### 💡 **Icon Mirroring Rules**

| Icon Type | Mirror in RTL? | Examples |
|-----------|----------------|----------|
| **Directional** | ✅ Yes | Arrows, chevrons, reply, share |
| **Universal** | ❌ No | Home, settings, star, heart |
| **Contextual** | ⚠️ Depends | Alignment icons |

---

### 💡 **CSS Transform for Mirroring**

```css
/* Mirror directional icons in RTL */
[dir="rtl"] .icon-arrow-left,
[dir="rtl"] .icon-arrow-right,
[dir="rtl"] .icon-chevron-left,
[dir="rtl"] .icon-chevron-right {
  transform: scaleX(-1);
}

/* Never mirror these */
.icon-home,
.icon-settings,
.icon-star,
.icon-search {
  /* No transform */
}
```

---

### 💡 **React Icon Component**

```javascript
function Icon({ name, mirror = false, className = '' }) {
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
<Icon name="arrow-left" mirror={true} />   // Mirrors in RTL
<Icon name="home" mirror={false} />        // Never mirrors
```

---

### 💡 **Icon Configuration**

```javascript
const iconConfig = {
  // Mirror in RTL
  'arrow-left': { mirror: true },
  'arrow-right': { mirror: true },
  'chevron-left': { mirror: true },
  'chevron-right': { mirror: true },
  'reply': { mirror: true },
  'share': { mirror: true },

  // Never mirror
  'home': { mirror: false },
  'settings': { mirror: false },
  'star': { mirror: false },
  'search': { mirror: false },
  'close': { mirror: false }
};

function shouldMirrorIcon(iconName) {
  return iconConfig[iconName]?.mirror ?? false;
}
```

---

## Component-Level RTL

### 💡 **RTL Context Provider**

```javascript
const RTLContext = createContext({ isRTL: false, dir: 'ltr' });

export function RTLProvider({ children }) {
  const dir = document.documentElement.dir;
  const isRTL = dir === 'rtl';

  return (
    <RTLContext.Provider value={{ isRTL, dir }}>
      {children}
    </RTLContext.Provider>
  );
}

export function useRTL() {
  return useContext(RTLContext);
}
```

---

### 💡 **Component Using RTL Context**

```javascript
function Sidebar({ children }) {
  const { isRTL } = useRTL();

  return (
    <aside
      className="sidebar"
      style={{ marginInlineStart: isRTL ? 'auto' : 0 }}
    >
      {children}
    </aside>
  );
}

function Navigation() {
  const { isRTL } = useRTL();

  return (
    <nav>
      <button>
        <Icon
          name={isRTL ? 'arrow-right' : 'arrow-left'}
          mirror={false}
        />
        Back
      </button>
    </nav>
  );
}
```

---

### 💡 **CSS-Only Approach (Preferred)**

```css
/* Use logical properties - no JavaScript needed */
.sidebar {
  margin-inline-start: 2rem;
  padding-inline: 1rem;
  border-inline-end: 1px solid #ddd;
}

.button-icon {
  margin-inline-end: 0.5rem;
}

/* Direction-specific styles when needed */
[dir="rtl"] .icon--directional {
  transform: scaleX(-1);
}
```

---

## Testing RTL Layouts

### 💡 **Manual Testing Checklist**

| Category | Check |
|----------|-------|
| **Structure** | `dir="rtl"` and `lang` set correctly |
| **Layout** | Sidebar on correct side, nav flows correctly |
| **Icons** | Directional icons mirrored, universal icons not |
| **Spacing** | No `margin-left/right`, only logical properties |
| **Text** | Mixed LTR/RTL content displays correctly |
| **Forms** | Inputs and labels aligned correctly |

---

### 💡 **Automated Testing with Cypress**

```javascript
describe('RTL Support', () => {
  beforeEach(() => {
    cy.visit('/?lang=ar');
    cy.get('html').should('have.attr', 'dir', 'rtl');
  });

  it('displays content in RTL', () => {
    cy.get('body').should('have.css', 'direction', 'rtl');
  });

  it('positions sidebar correctly', () => {
    cy.get('.sidebar').should(($el) => {
      const rect = $el[0].getBoundingClientRect();
      // In RTL, sidebar should be on the right
      expect(rect.right).to.be.greaterThan(window.innerWidth - 300);
    });
  });

  it('mirrors directional icons', () => {
    cy.get('.icon--arrow-right').should(($el) => {
      const transform = getComputedStyle($el[0]).transform;
      expect(transform).to.include('matrix(-1');
    });
  });

  it('does not mirror universal icons', () => {
    cy.get('.icon--home').should(($el) => {
      const transform = getComputedStyle($el[0]).transform;
      expect(transform).to.equal('none');
    });
  });
});
```

---

### 💡 **Visual Regression Testing**

```javascript
import { test, expect } from '@playwright/test';

test.describe('RTL Visual Regression', () => {
  test('RTL layout screenshot', async ({ page }) => {
    await page.goto('/?lang=ar');
    await expect(page).toHaveScreenshot('layout-rtl.png');
  });

  test('sidebar positioning', async ({ page }) => {
    await page.goto('/?lang=ar');
    const sidebar = page.locator('.sidebar');
    const box = await sidebar.boundingBox();

    // Sidebar should be on the right
    expect(box.x).toBeGreaterThan(page.viewportSize().width / 2);
  });
});
```

---

## Common Mistakes

### 💡 **Mistake 1: Forgetting dir Attribute**

```javascript
// ❌ Bad: No dir attribute
function App() {
  return <html><body>Content</body></html>;
}

// ✅ Good: Set dir based on language
function App({ language }) {
  const dir = ['ar', 'he', 'fa'].includes(language) ? 'rtl' : 'ltr';
  return <html dir={dir} lang={language}><body>Content</body></html>;
}
```

---

### 💡 **Mistake 2: Using Physical CSS Properties**

```css
/* ❌ Bad: Physical properties */
.sidebar {
  margin-left: 20px;
  border-right: 1px solid;
}

/* ✅ Good: Logical properties */
.sidebar {
  margin-inline-start: 20px;
  border-inline-end: 1px solid;
}
```

---

### 💡 **Mistake 3: Testing with English in RTL**

```javascript
// ❌ Bad: English placeholder
<div dir="rtl">English text</div>

// ✅ Good: Actual RTL content
<div dir="rtl">مرحبا بالعربية</div>
// Arabic text wraps and renders differently!
```

---

### 💡 **Mistake 4: Mirroring Everything**

```css
/* ❌ Bad: Mirroring universal icons */
[dir="rtl"] .icon-home { transform: scaleX(-1); }
[dir="rtl"] .icon-star { transform: scaleX(-1); }

/* ✅ Good: Only mirror directional icons */
[dir="rtl"] .icon-arrow-right { transform: scaleX(-1); }
/* Home and star don't need mirroring */
```

---

### 💡 **Mistake 5: Not Handling Bidirectional Text**

```javascript
// Browser handles bidirectional text automatically
// Just ensure correct dir attribute is set

// This renders correctly:
<div dir="rtl">
  "مرحبا Hello مرحبا"
</div>
// Browser's bidi algorithm handles mixed text
```

---

## Performance Considerations

### 💡 **Avoid Repeated Direction Checks**

```javascript
// ❌ Bad: Check on every render
function Button() {
  const isRTL = document.documentElement.dir === 'rtl';
  return <button style={{ marginLeft: isRTL ? 'auto' : 0 }}>Click</button>;
}

// ✅ Good: Use context
function Button() {
  const { isRTL } = useRTL();
  return <button style={{ marginInlineStart: 'auto' }}>Click</button>;
}

// ✅ Best: Use CSS logical properties (no JS needed)
```

---

### 💡 **Use CSS Over JavaScript**

```css
/* ✅ Best: CSS logical properties */
.button {
  margin-inline-start: auto;  /* No JavaScript needed */
}

/* Single CSS file works for both LTR and RTL */
```

---

### 💡 **Avoid Duplicate CSS Files**

```javascript
// ❌ Bad: Separate CSS files
<link href="style-ltr.css" />
<link href="style-rtl.css" />

// ✅ Good: Single file with logical properties
<link href="style.css" />
```

---

## Interview Questions

### 1. How do you implement RTL support in React?

**Answer:**

1. Set `dir="rtl"` and `lang` on HTML element
2. Use CSS logical properties (`margin-inline-start`)
3. Mirror directional icons with CSS transforms
4. Test with actual RTL content
5. Use React context for RTL state

---

### 2. What's the difference between `dir` attribute and CSS `direction`?

| Feature | `dir` Attribute | CSS `direction` |
|---------|-----------------|-----------------|
| **Scope** | HTML/DOM level | Visual only |
| **Affects** | Layout order, bidi algorithm | Text flow |
| **Best for** | Document/section direction | Text elements |

Both are needed for proper RTL support.

---

### 3. Which icons should be mirrored in RTL?

**Mirror:**
- Arrow left/right
- Chevrons
- Reply, share, forward

**Don't Mirror:**
- Home, settings, search
- Star, heart, check
- Close, menu

---

### 4. What are CSS logical properties?

Properties that adapt to text direction:

| Physical | Logical |
|----------|---------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `text-align: left` | `text-align: start` |

---

### 5. How do you handle mixed LTR/RTL content?

**Answer:**

Let the browser handle it. The Unicode Bidirectional Algorithm (bidi) automatically handles mixed-direction text. Just ensure `dir` and `lang` attributes are set correctly.

---

### 6. How would you test RTL layouts?

**Answer:**

1. Manual: Check layout with actual RTL content
2. Automated: Cypress/Playwright for DOM assertions
3. Visual: Screenshot comparison tests
4. Accessibility: Screen reader testing

---

### 7. What's the performance impact of RTL support?

**Answer:**

Minimal if done correctly:
- ✅ Use CSS logical properties (single CSS file)
- ✅ Use CSS transforms for icons (not separate images)
- ✅ Use React context (not prop drilling)
- ❌ Avoid separate CSS files for RTL/LTR

---

### 8. How do you detect if a language is RTL?

```javascript
function isRTL(language) {
  return ['ar', 'he', 'fa', 'ur'].includes(language);
}

// Or check programmatically
function isRTLLocale(locale) {
  const rtl = new Intl.Locale(locale).getTextInfo?.()?.direction;
  return rtl === 'rtl';
}
```

---

### 9. What CSS logical properties do you use most?

| Property | Purpose |
|----------|---------|
| `margin-inline-start/end` | Horizontal margins |
| `padding-inline-start/end` | Horizontal padding |
| `border-inline-start/end` | Horizontal borders |
| `text-align: start/end` | Text alignment |
| `inset-inline-start/end` | Positioning |

---

### 10. How would you handle an image with text in both directions?

**Options:**

1. Create separate images for LTR/RTL
2. Use CSS `transform: scaleX(-1)` if appropriate
3. Extract text and translate separately
4. Use SVG with direction-aware styling

Best approach depends on content type.

---

## Summary Checklist

| Task | Status |
|------|--------|
| Set `dir="rtl"` and `lang` on HTML | ☐ |
| Use CSS logical properties throughout | ☐ |
| Test with actual RTL content | ☐ |
| Mirror only directional icons | ☐ |
| Handle bidirectional text | ☐ |
| Test flexbox/grid layouts | ☐ |
| Create React components with RTL awareness | ☐ |
| Implement proper testing strategy | ☐ |
| Optimize for performance | ☐ |

---

## Navigation

**Complete i18n Series:**

- [01 - i18n Fundamentals](./01-i18n-fundamentals.md) - Core concepts
- [02 - Pluralization](./02-pluralization.md) - Plural forms
- [03 - Date & Number Formatting](./03-date-number-formatting.md) - Intl APIs
- **04 - RTL Support** - Current document

**Related Topics:**

- Frontend/React - Component patterns
- Frontend/CSS - CSS best practices
- Frontend/Testing - Testing strategies

---

**Last Updated:** January 2026
**Difficulty:** Intermediate to Advanced
**Estimated Time:** 3-4 hours
