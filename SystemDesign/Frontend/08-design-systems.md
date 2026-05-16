# Design Systems

## 💡 **Concept**

A design system is a single source of truth for UI: tokens (values) + components (implementations) + documentation (guidelines). It eliminates inconsistency, speeds up feature development, and bridges design and engineering.

**How to answer in an interview:** "I'd build it in three layers: design tokens for raw values (colors, spacing), a component library built from those tokens, and Storybook for documentation and visual testing. I'd version it as a package so teams can adopt it incrementally without breaking existing UIs."

---

## The Three Layers

```
Design Tokens       → raw values (color, spacing, typography)
    ↓
Component Library   → React components built with tokens
    ↓
Documentation       → Storybook + usage guidelines + a11y specs
```

---

## Design Tokens

Tokens store design decisions as data — not hard-coded values. They let you change the entire visual language from one place.

```typescript
// tokens/colors.ts
export const colors = {
  brand: {
    50:  "#e3f2fd",
    100: "#bbdefb",
    500: "#2196f3",   // primary
    700: "#1976d2",
    900: "#0d47a1",
  },
  semantic: {
    success: "#4caf50",
    warning: "#ff9800",
    error:   "#f44336",
    info:    "#2196f3",
  },
  neutral: {
    0:   "#ffffff",
    100: "#f5f5f5",
    500: "#9e9e9e",
    900: "#212121",
  },
} as const;

// tokens/spacing.ts
export const spacing = {
  0:  "0",
  1:  "0.25rem",   // 4px
  2:  "0.5rem",    // 8px
  4:  "1rem",      // 16px
  6:  "1.5rem",    // 24px
  8:  "2rem",      // 32px
  12: "3rem",      // 48px
} as const;

// tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, monospace",
  },
  fontSize: {
    sm: "0.875rem",  // 14px
    base: "1rem",    // 16px
    lg: "1.125rem",  // 18px
    xl: "1.25rem",   // 20px
    "2xl": "1.5rem", // 24px
  },
} as const;
```

---

## Component Library

Each component uses tokens directly and exposes a typed API.

```typescript
import React from "react";
import { colors, spacing } from "../tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: `padding: ${spacing[1]} ${spacing[2]}; font-size: 0.875rem;`,
  md: `padding: ${spacing[2]} ${spacing[4]}; font-size: 1rem;`,
  lg: `padding: ${spacing[2]} ${spacing[6]}; font-size: 1.125rem;`,
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  children,
}) => {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      {loading ? <Spinner aria-hidden /> : children}
    </button>
  );
};
```

---

## Atomic Design

Structure components from simplest to most complex.

| Level | Example | Reusability |
|-------|---------|-------------|
| **Atoms** | Button, Input, Icon | Highest |
| **Molecules** | SearchBox, FormField | High |
| **Organisms** | Header, DataTable | Medium |
| **Pages** | ProductListPage | Low |

```typescript
// Atom
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  "aria-label": string;
}

// Molecule (combines atoms)
interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, placeholder }) => {
  const [query, setQuery] = React.useState("");
  return (
    <div role="search">
      <Input
        value={query}
        onChange={setQuery}
        placeholder={placeholder ?? "Search…"}
        aria-label="Search query"
      />
      <Button variant="primary" size="md" onClick={() => onSearch(query)}>
        Search
      </Button>
    </div>
  );
};
```

---

## Theming

Support light/dark and custom brand themes without changing component code.

```typescript
interface Theme {
  colors: {
    background: string;
    surface: string;
    text: string;
    primary: string;
    primaryText: string;
  };
  spacing: typeof spacing;
}

const lightTheme: Theme = {
  colors: {
    background: colors.neutral[0],
    surface:    colors.neutral[100],
    text:       colors.neutral[900],
    primary:    colors.brand[500],
    primaryText: colors.neutral[0],
  },
  spacing,
};

const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    background: "#121212",
    surface:    "#1e1e1e",
    text:       colors.neutral[0],
    primary:    colors.brand[500],
    primaryText: colors.neutral[0],
  },
};

const ThemeContext = React.createContext<Theme>(lightTheme);

export const ThemeProvider: React.FC<{ theme?: Theme; children: React.ReactNode }> = ({
  theme = lightTheme,
  children,
}) => <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;

export const useTheme = () => React.useContext(ThemeContext);
```

---

## Versioning Strategy

Package the design system as an npm module. Follow semantic versioning strictly.

```
Patch (1.0.0 → 1.0.1)  — bug fixes, no API change
Minor (1.0.0 → 1.1.0)  — new component, backward-compatible
Major (1.0.0 → 2.0.0)  — breaking API change (rename prop, remove component)
```

```json
{
  "name": "@acme/design-system",
  "version": "2.1.0",
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

Maintain a CHANGELOG. For major versions, provide a migration guide and a codemod if possible.

---

## Common Mistakes

❌ **Hard-coding colors in components** — impossible to theme; use tokens  
❌ **No accessibility standards** — every component needs WCAG 2.1 AA compliance and keyboard nav  
❌ **Skipping Storybook** — undocumented components get misused or reimplemented  
❌ **Breaking changes without major version bump** — consumers get runtime errors

**Key insight:**

> A design system is a product, not a project. It needs ownership, versioning, documentation, and a migration path for breaking changes — the same discipline you'd apply to a public API.

---
[← Back to SystemDesign](../README.md)
