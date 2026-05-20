# Design Systems

> A shared visual language plus the code that enforces it. Tokens, components, docs, and governance — together.

---

## 💡 **What a Design System Actually Is**

A design system is **four things working together**:

1. **Tokens** — the raw values (colors, spacing, type) as data.
2. **Components** — primitives and patterns built from tokens.
3. **Documentation** — usage rules, examples, do/don't.
4. **Governance** — versioning, contribution rules, deprecation policy.

Drop any one and it becomes a UI kit, not a system.

**Examples in the wild:** Material (Google), Polaris (Shopify), Carbon (IBM), Primer (GitHub), Lightning (Salesforce).

> **Key Insight:** Tokens are the contract between design and engineering. Components are the implementation. Documentation is the API. Governance is what keeps it from rotting.

---

## 💡 **Design Tokens**

Tokens are platform-agnostic values. They live as JSON or TypeScript and feed into web, iOS, and Android.

**Three tiers** — global → semantic → component:

```typescript
// 1. Global (raw values)
const palette = {
  blue: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a',
  },
  gray: {
    50: '#f9fafb',
    900: '#111827',
  },
} as const;

// 2. Semantic (intent)
const semantic = {
  color: {
    background: palette.gray[50],
    text: palette.gray[900],
    accent: palette.blue[500],
    accentStrong: palette.blue[900],
  },
} as const;

// 3. Component (specific to a part)
const button = {
  background: semantic.color.accent,
  backgroundHover: semantic.color.accentStrong,
  text: '#fff',
} as const;

export type ColorToken = keyof typeof semantic.color;
```

**Why three tiers?** You change `palette.blue[500]` once — every component theming through `accent` updates. Components never reference raw palette values directly.

**Typography and spacing follow the same pattern:**

```typescript
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
} as const;

export type Spacing = keyof typeof spacing;

export const typography = {
  body: { size: '1rem', lineHeight: 1.5, weight: 400 },
  heading: { size: '1.5rem', lineHeight: 1.2, weight: 600 },
} as const;
```

**Tooling** — **Style Dictionary** or **Tokens Studio** transforms one source-of-truth JSON into CSS variables, Swift, Kotlin, and JS exports.

---

## 💡 **Component Primitives and Composition**

A good system ships **low-level primitives** that compose into higher-level patterns. Avoid one-off mega-components.

**Primitive — Box, Stack, Text:**

```typescript
type StackProps = {
  gap?: Spacing;
  direction?: 'row' | 'column';
  children: React.ReactNode;
};

export function Stack({ gap = 'md', direction = 'column', children }: StackProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: spacing[gap],
      }}
    >
      {children}
    </div>
  );
}
```

**Pattern — built from primitives:**

```typescript
export function Card({ title, body }: { title: string; body: string }) {
  return (
    <Stack gap="sm">
      <Text variant="heading">{title}</Text>
      <Text variant="body">{body}</Text>
    </Stack>
  );
}
```

**Composition rules:**
- Primitives expose layout and spacing as props (typed via token keys).
- Patterns never set raw CSS values — only token props.
- Components stay headless when possible (Radix UI, Headless UI for behavior).

---

## 💡 **Theming Strategy**

Two viable approaches. Pick based on platform reach.

### 1. CSS Variables (recommended for web)

Tokens compile to CSS custom properties. Switching themes is a class flip on `<html>`.

```css
:root {
  --color-bg: #f9fafb;
  --color-text: #111827;
  --color-accent: #3b82f6;
}

.dark {
  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-accent: #60a5fa;
}

.button {
  background: var(--color-accent);
  color: var(--color-text);
}
```

**Pros:** No re-render, no JS, works across iframes, runtime-cheap.

### 2. Token Transforms (multi-platform systems)

Generate platform-specific files from one JSON source.

```
tokens.json
  ↓ Style Dictionary
  ├─ tokens.css  (CSS vars for web)
  ├─ tokens.ts   (TS exports for typed access)
  ├─ tokens.swift (iOS)
  └─ tokens.xml   (Android)
```

This is how IBM Carbon and Salesforce Lightning stay consistent across platforms.

| Approach | Best For |
|----------|----------|
| CSS variables | Web-only or web-first systems |
| Token transforms | Multi-platform (web + iOS + Android) |
| Both combined | Most enterprise systems |

---

## 💡 **Governance and Versioning**

A design system is a **product**. Treat it like one.

**Versioning:**
- Use **semver**. Breaking changes = major bump.
- Renaming a token, removing a prop, or changing a default → major.
- Adding a variant or new component → minor.
- Bug fixes → patch.

**Deprecation flow:**
1. Mark prop or component deprecated in TS types (`@deprecated`) and docs.
2. Keep it working for 1–2 minor releases.
3. Remove in the next major.
4. Provide a codemod when possible.

```typescript
type ButtonProps = {
  /** @deprecated use `variant="primary"` instead */
  primary?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};
```

**Contribution model** — choose one:
- **Centralized** — a core team owns everything. Faster decisions, slower scale.
- **Federated** — feature teams contribute, core team reviews. Scales better, more overhead.
- **Hybrid** — core team owns tokens and primitives; product teams own patterns.

Most large orgs end up hybrid.

---

## 💡 **Enterprise Scaling Notes**

Things that bite at scale:

- **Distribution** — publish via a monorepo workspace (Nx, Turborepo) or private npm registry. Tree-shake aggressively.
- **Documentation** — Storybook + a docs site (Docusaurus or Nextra). Auto-generate prop tables from TS types.
- **Visual regression** — Chromatic or Percy. Catch unintended visual diffs in CI.
- **Adoption metrics** — track which components and tokens are actually used. Sunset dead ones.
- **Cross-team coordination** — RFC process for breaking changes. A Slack channel and weekly office hours.
- **Accessibility** — every primitive ships with WAI-ARIA defaults. Audit with axe in CI.

**Common failure modes:**
- ❌ Building too many components before tokens stabilize.
- ❌ No deprecation policy — every change breaks consumers.
- ❌ Designers and engineers using different source-of-truth tokens.
- ❌ No version pinning — apps break on minor upgrades.

> **Key Insight:** The hardest part of a design system isn't the components. It's the social contract — how teams contribute, how breaking changes propagate, how dead components get removed.

---

## 🎯 **Interview Questions**

**Q1: Walk me through your design token strategy.**
Tokens live as TS or JSON in one source of truth. I use three tiers: global (raw palette), semantic (intent like `accent` or `surface`), and component (e.g., `button.background`). Components only reference semantic or component tokens, never raw palette. Style Dictionary transforms the source into CSS variables for web and platform-specific files for native. This lets one tokens.json drive every platform.

**Q2: CSS variables vs runtime theming via Context — which would you pick?**
CSS variables for almost every case. Theme switches become a single class flip on `<html>`, with no React re-renders. Context-based theming re-renders every subscribed component on theme change, which is wasteful. The one case for Context is when theme values must be reactive to user data in ways CSS variables can't express — rare in practice.

**Q3: How do you handle breaking changes across many consuming teams?**
Strict semver, a deprecation window of at least one minor release, and codemods for non-trivial migrations. Deprecations show up as TypeScript `@deprecated` tags and console warnings in dev. I track adoption via internal telemetry so I know which teams are still on old versions before cutting a major. An RFC process and changelog discipline are non-negotiable.

---

[← Back to CSS Architecture](./README.md)
