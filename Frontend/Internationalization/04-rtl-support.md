---
title: Right-to-Left Support
part: 2
chapter: 0
slug: rtl-support
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-01
tags: [i18n, rtl, logical-properties, bidi, accessibility]
in_book: true
---

# Right-to-Left Support {#ch-rtl-support}

> Ship one stylesheet that lays out correctly in Arabic and English, with no mirrored copy to maintain.

**In this chapter:** what `dir` actually changes · logical properties · why flexbox and grid need nothing · which icons mirror · testing without a translator

## 💡 The Core Idea

Right-to-left support is not a translation problem and it is not a second stylesheet. It is a matter of
describing layout in terms of **start and end** rather than left and right, and then telling the browser
which way round those are. Set `dir="rtl"` and the browser reverses inline flow, flips flexbox and grid,
runs the bidirectional algorithm over mixed text, and resolves every logical property the other way.
Everything you wrote in physical terms stays stubbornly where it was — and that is the entire bug.

> There is no RTL stylesheet. There is one stylesheet with no `left` or `right` in it.

## How It Works

Arabic, Hebrew, Persian and Urdu account for several hundred million readers, and the four behave the
same way for layout purposes. Numbers stay left-to-right inside right-to-left text; the browser's
Unicode bidirectional algorithm handles the mixing, provided the container declares its direction.

### The one attribute that matters

```html
<html dir="rtl" lang="ar"></html>
```

`dir` drives layout and bidi; `lang` drives hyphenation, quotation marks, font selection and the screen
reader's pronunciation. Set both, and keep them consistent — a mismatch means assistive technology
reads Arabic with an English voice.

```typescript
const RTL = ['ar', 'he', 'fa', 'ur'] as const;

function isRtl(locale: string): boolean {
  // Intl.Locale knows the direction for every locale; the list is the fallback.
  const info = new Intl.Locale(locale).getTextInfo?.();
  if (info) return info.direction === 'rtl';
  return (RTL as readonly string[]).includes(locale.split('-')[0]);
}

function applyDirection(locale: string): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
}
```

`dir="auto"` is worth knowing for one specific case: user-generated content whose language you do not
control. It lets the browser infer direction from the first strong directional character, which stops
an Arabic comment rendering backwards inside an English page.

### Logical properties

Every physical property has a logical counterpart that resolves against `dir`. The block axis never
changes, so `margin-block` and friends need no thought.

| Physical — breaks in RTL | Logical — works in both |
| ------------------------ | ----------------------- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |

```css
/* ❌ The border stays on the visual left, so it lands inside the content in RTL. */
.panel {
  margin-left: 2rem;
  border-left: 3px solid var(--accent);
}

/* ✅ Both follow the reading direction with no override. */
.panel {
  margin-inline-start: 2rem;
  border-inline-start: 3px solid var(--accent);
}
```

The shorthands are worth adopting for their own sake, before any RTL requirement exists:

```css
.container {
  padding-inline: 1.5rem; /* both inline sides */
  margin-inline: 1rem 2rem; /* start, end */
  margin-block: 1rem; /* top and bottom — direction never affects these */
}
```

### Flexbox and grid are already correct

Both are defined in terms of the inline axis, so they flip on their own. A `justify-content: space-between`
navigation bar puts the logo on the right in Arabic with no extra CSS. What breaks is the physical
padding you put on its children.

```css
.sidebar-layout {
  display: grid;
  grid-template-columns: 250px 1fr; /* first column is the start side, whichever that is */
  gap: 2rem;
}
```

`row-reverse` is the exception to watch: it reverses relative to the *current* direction, so a
hard-coded `row-reverse` inverts twice in RTL and ends up back where it started.

### Icons

| Icon | Mirror? | Why |
| ---- | ------- | --- |
| Arrows, chevrons, reply, forward, undo | Yes | They point along the reading direction |
| Home, search, settings, close, star | No | They depict an object, not a direction |
| Media transport — play, next track | No | Media time runs left to right in every locale |
| A clock, or anything with text baked in | No | Mirroring produces a mirrored glyph |

```css
/* Opt in per icon rather than flipping everything. */
[dir='rtl'] .icon--directional {
  transform: scaleX(-1);
}
```

Make it a property of the icon, so the decision is made once where the icon is defined rather than at
every call site.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Any new project | Logical properties from the first commit | They cost nothing and retrofitting touches every rule |
| An existing codebase, RTL now required | Migrate properties, then audit visually | A `[dir='rtl']` override layer doubles the rules you maintain |
| Mixed-direction user content | `dir="auto"` on the container | You cannot know the language of a comment in advance |
| A chart or diagram | Decide deliberately | Data axes often stay left-to-right even in RTL locales |
| No RTL locale on the roadmap | Logical properties anyway | It is the same amount of typing and it removes the future migration |

## Common Mistakes

**❌ Wrong — an RTL override stylesheet:**

```css
.panel { margin-left: 2rem; }
[dir='rtl'] .panel { margin-left: 0; margin-right: 2rem; }
```

**✅ Right — one declaration that resolves itself:**

```css
.panel { margin-inline-start: 2rem; }
```

Every override is a second place to update, and the pair drifts the first time someone edits only one
of them.

**❌ Wrong — testing RTL with English text.** Setting `dir="rtl"` while the copy is still English
catches layout bugs and hides the ones that matter: mixed-direction punctuation, clipped labels,
mirrored icons that should not be. Test with real Arabic or Hebrew strings, or a pseudo-locale.

**❌ Wrong — positioning with `left` and `right`.** `inset-inline-start` exists and behaves identically
in LTR, so there is no reason to reach for the physical version — including in `position: absolute`
layouts, which are the ones that break most visibly.

## 🔑 Key Takeaways

- `dir` on the root element is what makes RTL work, and `lang` beside it is what makes assistive technology read correctly.
- Logical properties resolve against the reading direction, so one stylesheet serves both without overrides.
- Flexbox and grid already flip; what breaks is the physical padding, margin and inset on their children.
- Mirror only icons that indicate direction, and make that a property of the icon rather than a call-site decision.
- Testing with English text under `dir="rtl"` finds the easy bugs and hides the real ones.

## Interview Questions

**Q: How would you add RTL support to an existing React application?**

Set `dir` and `lang` on the root element from the resolved locale. Then replace physical CSS properties
with logical ones — that is the bulk of the work and it is mechanical enough to drive with a lint rule.
Finally audit visually with real RTL copy: absolutely positioned elements, icons, and any component
using `row-reverse` are where the remaining bugs are.

**Q: What are logical properties, and why not just override with a `[dir='rtl']` block?**

Logical properties describe the inline and block axes rather than physical edges, so the browser
resolves them against `dir`. An override block means every rule exists twice, which doubles the
maintenance and guarantees the two copies drift. Logical properties keep one declaration as the single
source of truth.

**Q: Which icons should mirror, and how do you decide?**

Anything whose meaning depends on reading direction: arrows, chevrons, reply, forward, undo. Anything
representing a physical object or a universal control does not — home, search, star, close, and media
transport controls, because media time runs the same way in every locale. Encode the decision on the
icon definition rather than guessing per usage.

**Q: Where does RTL support cost you something you cannot avoid?**

Content that is inherently directional — charts with a time axis, code blocks, diagrams, and anything
with text baked into an image. Those need a per-case decision rather than a global flip, and that
judgement is the part no tooling makes for you.

## What to Read Next

- [Chapter ?? — Internationalisation Fundamentals](#ch-i18n-fundamentals) — where `dir` gets set when the locale changes
- [Chapter ?? — Accessibility](#ch-accessibility) — the other half of what `lang` controls
