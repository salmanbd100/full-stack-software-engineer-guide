---
title: Design Systems
part: 2
chapter: 0
slug: cssarchitecture-design-systems
level: advanced # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-01
tags: [design-systems, tokens, theming, governance, versioning]
in_book: true
---

# Design Systems {#ch-cssarchitecture-design-systems}

> Ship a component library that forty teams can adopt without forking it.

**In this chapter:** the four parts of a system · three-tier tokens · primitives and composition · theming · versioning and the deprecation path

## 💡 The Core Idea

A design system is not a component library. It is four things held together: **tokens** as data,
**components** built only from those tokens, **documentation** that acts as the API, and **governance**
that decides how change propagates. Drop any one and what you have is a UI kit — useful for a quarter,
forked by three teams within a year. The components are the easy part. What actually decides whether a
system survives is the social contract underneath it: how teams contribute, how a breaking change
reaches consumers, and how a dead component gets removed.

> Tokens are the contract between design and engineering. Governance is what stops that contract from
> rotting.

## How It Works

### Tokens in three tiers

Tokens are platform-agnostic values held as data, not as CSS. The tiering is what makes them
maintainable.

```typescript
// 1. Global — raw values. Nothing outside this file references them directly.
const palette = {
  blue: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
  gray: { 50: '#f9fafb', 900: '#111827' },
} as const;

// 2. Semantic — intent. This is the layer components are allowed to use.
const semantic = {
  color: { surface: palette.gray[50], text: palette.gray[900], accent: palette.blue[500] },
} as const;

// 3. Component — a specific part, when the semantic layer is too coarse.
const button = { background: semantic.color.accent, text: '#fff' } as const;

export type ColorToken = keyof typeof semantic.color;
```

The middle tier is the point. Change `palette.blue[500]` once and every component styled through
`accent` follows, because none of them ever named the blue. A component that reaches past `semantic`
into `palette` has quietly opted out of theming.

Spacing and typography use the same shape, and exporting the key type is what makes a token scale
enforceable in TypeScript rather than merely suggested.

```typescript
export const spacing = { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem' } as const;
export type Spacing = keyof typeof spacing;
```

### Primitives, then patterns

A system that ships thirty finished components ages badly, because each one encodes a decision a
product team will eventually need to override. A system that ships a handful of primitives — a layout
box, a stack, a text element — and composes patterns from them ages well.

```typescript
export function Stack({ gap = 'md', children }: { gap?: Spacing; children: React.ReactNode }) {
  // Layout is exposed as a token key, so an off-scale value is a type error.
  return <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[gap] }}>{children}</div>;
}

export function Card({ title, body }: { title: string; body: string }) {
  // A pattern sets no raw CSS values — only token props on primitives.
  return (
    <Stack gap="sm">
      <Text variant="heading">{title}</Text>
      <Text variant="body">{body}</Text>
    </Stack>
  );
}
```

Two rules keep this honest: primitives expose spacing and layout as typed token keys, and patterns
never write a raw value. Behaviour-heavy components — menus, dialogs, comboboxes — are better built on
a headless library than reimplemented, because the accessibility surface is larger than it looks.

### Theming

For the web, compile tokens to custom properties and switch themes with one attribute on the root
element.

```css
:root {
  --color-surface: #f9fafb;
  --color-text: #111827;
}

:root[data-theme='dark'] {
  --color-surface: #111827;
  --color-text: #f9fafb;
}
```

Nothing re-renders, no JavaScript runs, and the values cascade into anything that inherits — including
content a framework did not render. A theme held in React context does the same job and re-renders every
subscriber on every switch, which is work you get nothing for.

Multi-platform systems add a transform step: one token source generates CSS custom properties for web
alongside Swift and Kotlin equivalents, so a colour change lands everywhere from one commit.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| Web-only product, one or two apps | Custom properties from a TypeScript token file | Cheapest thing that supports runtime theme switching |
| Web plus native clients | A token transform pipeline | One source of truth beats three that drift |
| Fewer than three consuming teams | Shared components, no formal governance | Process costs more than the duplication it prevents |
| Many teams, independent release cadences | Semver, deprecation window, codemods | Consumers need to upgrade on their own schedule |
| A visual system still being designed | Tokens first, components later | Components built on unstable tokens get rebuilt |

## Common Mistakes

**❌ Wrong — a prop removed in place:**

```typescript
// Consumers on the previous version get a type error and no migration path.
type ButtonProps = { variant?: 'primary' | 'secondary' };
```

**✅ Right — deprecate, then remove a major later:**

```typescript
type ButtonProps = {
  /** @deprecated Use `variant="primary"`. Removed in v4. */
  primary?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};
```

The deprecation flow is worth stating explicitly because it is what consumers plan against: mark it in
the types and the docs, keep it working for one or two minor releases, ship a codemod where the change
is mechanical, remove it in the next major.

**❌ Wrong — building components before the tokens settle.** Every component built on a moving token
scale gets rebuilt when the scale lands. Freeze the scale first, even informally.

**❌ Wrong — designers and engineers on different sources of truth.** If the design tool holds one
palette and the code holds another, they will diverge within a quarter and every divergence becomes a
bug report about a colour.

## 🔑 Key Takeaways

- A design system is tokens, components, documentation and governance, and dropping any one turns it into a UI kit.
- The semantic token tier exists so no component ever names a raw value, which is what makes theming a one-line change.
- Ship primitives and compose patterns from them, because finished components encode decisions consumers will need to override.
- Custom properties are the right theming mechanism on the web: no re-render, and they reach content the framework did not render.
- Versioning discipline — semver, a deprecation window, and codemods — is what lets many teams upgrade on their own schedule.

## Interview Questions

**Q: Walk me through your token strategy.**

One source of truth in TypeScript, tiered global → semantic → component. Components reference the
semantic tier only, so re-theming means editing the global palette and nothing else. A transform step
emits custom properties for the web and platform files for native clients, and the key types are
exported so an off-scale value fails type-checking rather than shipping.

**Q: Custom properties or a theme in React context?**

Custom properties for almost everything. A theme switch becomes one attribute on the root element with
no re-render, and the values inherit into markup React never touched. Context re-renders every
subscriber on every switch and buys nothing unless the theme values themselves have to be computed from
data that CSS cannot see.

**Q: How do you push a breaking change to twenty consuming teams?**

Semver strictly, so a major signals it. Deprecate in the types and the changelog at least one minor
ahead, ship a codemod when the migration is mechanical, and track which versions teams are actually on
before cutting the major. Then give them a window rather than a date — a system that forces upgrades is
a system teams fork.

**Q: When is a design system the wrong investment?**

Below roughly three consuming teams. The cost is not building the components — it is the review
process, the release discipline, the documentation and the deprecation work, and that overhead exceeds
the duplication it removes when there are only two apps. Share components as a library and defer the
governance until the team count justifies it.

## What to Read Next

- [Chapter ?? — Utility-First vs Component-First CSS](#ch-utility-vs-component) — how the tokens reach the markup
- [Chapter ?? — Accessibility](#ch-accessibility) — the surface every primitive in the system has to get right
