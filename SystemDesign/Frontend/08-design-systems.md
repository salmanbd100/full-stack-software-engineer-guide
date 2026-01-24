# Design Systems

## Overview
A design system is a collection of reusable components, guided by clear standards, that can be assembled to build applications. It ensures consistency, speeds up development, and improves collaboration between design and engineering teams.

## Components of a Design System

```
Design System Architecture:
┌─────────────────────────────────────────┐
│           Design Tokens                  │
│  (Colors, Spacing, Typography, Shadows)  │
└─────────────────────┬───────────────────┘
                      ↓
┌─────────────────────────────────────────┐
│         Component Library                │
│  (Atoms → Molecules → Organisms)         │
└─────────────────────┬───────────────────┘
                      ↓
┌─────────────────────────────────────────┐
│        Documentation & Guidelines        │
│  (Storybook, Usage Docs, Accessibility)  │
└─────────────────────────────────────────┘
```

### 💡 **1. Design Tokens**

Atomic design decisions stored as data (color, spacing, typography, etc.).

```javascript
// tokens/colors.js
export const colors = {
  // Brand colors
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',  // Main
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1'
  },

  // Neutral colors
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  },

  // Semantic colors
  semantic: {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3'
  }
};

// tokens/spacing.js
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.5rem',   // 24px
  6: '2rem',     // 32px
  8: '3rem',     // 48px
  10: '4rem',    // 64px
  12: '6rem'     // 96px
};

// tokens/typography.js
export const typography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Fira Code", "Monaco", "Consolas", monospace'
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem'      // 48px
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2
  }
};

// tokens/breakpoints.js
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// tokens/shadows.js
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  none: 'none'
};
```

### 💡 **2. Component Library**

Reusable UI components built with design tokens.

```jsx
// components/Button/Button.jsx
import styled from 'styled-components';
import { colors, spacing, typography, shadows } from '../../tokens';

const StyledButton = styled.button`
  /* Base styles */
  font-family: ${typography.fontFamily.sans};
  font-weight: ${typography.fontWeight.medium};
  line-height: ${typography.lineHeight.normal};
  border-radius: 0.375rem;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  outline: none;

  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'sm':
        return `
          padding: ${spacing[2]} ${spacing[3]};
          font-size: ${typography.fontSize.sm};
        `;
      case 'lg':
        return `
          padding: ${spacing[4]} ${spacing[6]};
          font-size: ${typography.fontSize.lg};
        `;
      default: // md
        return `
          padding: ${spacing[3]} ${spacing[5]};
          font-size: ${typography.fontSize.base};
        `;
    }
  }}

  /* Color variants */
  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          background-color: ${colors.primary[500]};
          color: white;

          &:hover:not(:disabled) {
            background-color: ${colors.primary[600]};
            box-shadow: ${shadows.md};
          }
        `;
      case 'secondary':
        return `
          background-color: ${colors.gray[200]};
          color: ${colors.gray[900]};

          &:hover:not(:disabled) {
            background-color: ${colors.gray[300]};
          }
        `;
      case 'outline':
        return `
          background-color: transparent;
          border: 2px solid ${colors.primary[500]};
          color: ${colors.primary[500]};

          &:hover:not(:disabled) {
            background-color: ${colors.primary[50]};
          }
        `;
      case 'ghost':
        return `
          background-color: transparent;
          color: ${colors.primary[500]};

          &:hover:not(:disabled) {
            background-color: ${colors.primary[50]};
          }
        `;
      default:
        return '';
    }
  }}

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Full width */
  ${({ fullWidth }) => fullWidth && `
    width: 100%;
  `}
`;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  ...props
}) {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledButton>
  );
}

// components/Input/Input.jsx
const StyledInput = styled.input`
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.base};
  line-height: ${typography.lineHeight.normal};
  padding: ${spacing[3]} ${spacing[4]};
  border: 2px solid ${colors.gray[300]};
  border-radius: 0.375rem;
  outline: none;
  transition: all 0.2s;
  width: 100%;

  &:focus {
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px ${colors.primary[100]};
  }

  &:disabled {
    background-color: ${colors.gray[100]};
    cursor: not-allowed;
  }

  ${({ error }) => error && `
    border-color: ${colors.semantic.error};

    &:focus {
      box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
    }
  `}
`;

export function Input({ error, ...props }) {
  return <StyledInput error={error} {...props} />;
}

// components/Card/Card.jsx
const StyledCard = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: ${shadows.base};
  overflow: hidden;
  transition: all 0.2s;

  ${({ hoverable }) => hoverable && `
    cursor: pointer;

    &:hover {
      box-shadow: ${shadows.lg};
      transform: translateY(-2px);
    }
  `}
`;

const CardHeader = styled.div`
  padding: ${spacing[5]};
  border-bottom: 1px solid ${colors.gray[200]};
`;

const CardBody = styled.div`
  padding: ${spacing[5]};
`;

const CardFooter = styled.div`
  padding: ${spacing[5]};
  border-top: 1px solid ${colors.gray[200]};
  background-color: ${colors.gray[50]};
`;

export function Card({ children, hoverable = false, ...props }) {
  return (
    <StyledCard hoverable={hoverable} {...props}>
      {children}
    </StyledCard>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

// Usage
<Card hoverable>
  <Card.Header>
    <h3>Card Title</h3>
  </Card.Header>
  <Card.Body>
    <p>Card content goes here</p>
  </Card.Body>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### 3. Documentation

Comprehensive documentation with examples and guidelines.

```jsx
// Storybook example
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
};

const Template = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  variant: 'primary',
  children: 'Primary Button'
};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary',
  children: 'Secondary Button'
};

export const AllSizes = () => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const AllVariants = () => (
  <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
  </div>
);
```

## Atomic Design Methodology

Hierarchical approach to component organization from smallest elements to complete pages for systematic UI development.

Breaking down components into atoms, molecules, organisms, templates, and pages.

### Atoms

Smallest building blocks (buttons, inputs, icons).

```jsx
// Button (atom)
export function Button({ children, ...props }) {
  return <button {...props}>{children}</button>;
}

// Input (atom)
export function Input({ ...props }) {
  return <input {...props} />;
}

// Icon (atom)
export function Icon({ name, size = 24 }) {
  return <svg width={size} height={size}>...</svg>;
}
```

### Molecules

Simple groups of atoms (search box, form field).

```jsx
// FormField (molecule)
export function FormField({ label, error, children }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// SearchBox (molecule)
export function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');

  return (
    <div className="search-box">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <Button onClick={() => onSearch(query)}>
        <Icon name="search" />
      </Button>
    </div>
  );
}
```

### Organisms

Complex components made of molecules (header, product card).

```jsx
// Header (organism)
export function Header({ user, onSearch, onLogout }) {
  return (
    <header className="header">
      <Logo />
      <SearchBox onSearch={onSearch} />
      <nav>
        <UserMenu user={user} onLogout={onLogout} />
      </nav>
    </header>
  );
}

// ProductCard (organism)
export function ProductCard({ product, onAddToCart }) {
  return (
    <Card>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="price">${product.price}</div>
      <Button onClick={() => onAddToCart(product)}>
        Add to Cart
      </Button>
    </Card>
  );
}
```

### Templates

Page layouts combining organisms.

```jsx
// ProductListTemplate
export function ProductListTemplate({ products, filters, onFilter }) {
  return (
    <div className="product-list-template">
      <aside className="sidebar">
        <FilterPanel filters={filters} onChange={onFilter} />
      </aside>
      <main className="main">
        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}
```

### Pages

Specific instances of templates with real data.

```jsx
// ProductsPage
export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({});

  return (
    <ProductListTemplate
      products={products}
      filters={filters}
      onFilter={setFilters}
    />
  );
}
```

## 💡 **Theming**

System for switching between visual themes (light/dark mode, brand variations) using CSS custom properties and styled-components.

Support multiple themes (light/dark mode, brand variations).

```jsx
// theme/ThemeProvider.jsx
import { createContext, useContext, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

const lightTheme = {
  colors: {
    background: '#ffffff',
    foreground: '#000000',
    primary: '#2196f3',
    secondary: '#f50057'
  }
};

const darkTheme = {
  colors: {
    background: '#121212',
    foreground: '#ffffff',
    primary: '#90caf9',
    secondary: '#f48fb1'
  }
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <StyledThemeProvider theme={isDark ? darkTheme : lightTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Usage in component
const StyledButton = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.background};
`;

function MyComponent() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      <Button onClick={toggleTheme}>
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </Button>
    </>
  );
}
```

## Versioning and Publishing

Strategy for distributing design system as npm packages with semantic versioning and clear change management.

### Package Structure

```
@company/design-system/
   package.json
   src/
      tokens/
         colors.js
         spacing.js
         typography.js
      components/
         Button/
            Button.jsx
            Button.test.jsx
            Button.stories.jsx
            index.js
         index.js
      index.js
   dist/           # Built files
```

### Semantic Versioning

```json
{
  "name": "@company/design-system",
  "version": "2.1.0",
  "description": "Company design system",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "build": "rollup -c",
    "test": "jest",
    "storybook": "start-storybook -p 6006"
  }
}
```

**Version Guidelines:**
- **Major** (2.0.0): Breaking changes (API changes, removed components)
- **Minor** (2.1.0): New features (new components, new props)
- **Patch** (2.1.1): Bug fixes (no API changes)

### Change Log

```markdown
# Changelog

## [2.1.0] - 2024-01-15
### Added
- New `Select` component
- `fullWidth` prop to `Button` component
- Dark mode support

### Changed
- Updated `Card` shadow styles
- Improved accessibility for `Input` component

### Fixed
- Button focus state in Safari
- Input placeholder color in dark mode

## [2.0.0] - 2023-12-01
### Breaking Changes
- Removed deprecated `LegacyButton` component
- Changed `Button` size prop values: `small/medium/large` � `sm/md/lg`
- Updated minimum React version to 18.0.0

### Added
- TypeScript support
- New design tokens
```

## Accessibility

Built-in WCAG compliance through proper ARIA attributes, keyboard navigation, and semantic HTML in all components.

Ensuring components are accessible (WCAG compliance).

```jsx
// Accessible Button
export function Button({ children, ariaLabel, disabled, ...props }) {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      disabled={disabled}
      // Ensure keyboard navigation
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </button>
  );
}

// Accessible Modal
export function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen) {
      // Trap focus
      modalRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="Close modal">
        Close
      </button>
    </div>
  );
}

// Accessible Form
export function FormField({ label, id, error, required, children }) {
  const errorId = `${id}-error`;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-label="required">*</span>}
      </label>
      {React.cloneElement(children, {
        id,
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : undefined
      })}
      {error && (
        <span id={errorId} role="alert" className="error">
          {error}
        </span>
      )}
    </div>
  );
}
```

## Testing Strategy

Comprehensive testing approach including unit tests, visual regression, and accessibility testing for design system components.

```javascript
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Button variant="primary">Click me</Button>);

    let button = screen.getByText('Click me');
    expect(button).toHaveStyle({ backgroundColor: '#2196f3' });

    rerender(<Button variant="secondary">Click me</Button>);
    button = screen.getByText('Click me');
    expect(button).toHaveStyle({ backgroundColor: '#f5f5f5' });
  });
});

// Visual regression testing with Percy
import percySnapshot from '@percy/puppeteer';

describe('Button visual regression', () => {
  it('matches snapshot', async () => {
    await page.goto('http://localhost:6006/iframe.html?id=button--primary');
    await percySnapshot(page, 'Button - Primary');
  });
});
```

## Interview Questions

**Q: What is a design system and why is it important?**

A: A design system is a collection of reusable components and standards that ensures consistency across products. Benefits:
- **Consistency**: Unified look and feel
- **Efficiency**: Faster development
- **Collaboration**: Better design-dev communication
- **Scalability**: Easier to maintain large apps
- **Accessibility**: Built-in a11y standards

**Q: How do you handle breaking changes in a design system?**

A: Strategies:
1. **Semantic versioning**: Major version for breaking changes
2. **Deprecation warnings**: Warn before removing
3. **Migration guides**: Document upgrade path
4. **Gradual rollout**: Support old and new versions temporarily
5. **Automated migration**: Provide codemods when possible

**Q: What's the difference between a component library and a design system?**

A: A component library is just code (reusable components). A design system includes:
- Design tokens (colors, spacing, typography)
- Component library
- Documentation and guidelines
- Design principles
- Accessibility standards
- Usage patterns

**Q: How do you ensure consistency when multiple teams use the design system?**

A: Approaches:
- Clear documentation with examples
- Automated testing (visual regression)
- Design system team reviews
- Regular sync meetings
- Version updates and changelogs
- Contribution guidelines

## Best Practices

**Component Design:**
- Keep components focused and composable
- Use design tokens for all styling
- Provide flexible props with sensible defaults
- Support accessibility out of the box
- Include TypeScript types

**Documentation:**
- Show examples for all use cases
- Include do's and don'ts
- Document all props
- Provide migration guides
- Keep changelog updated

**Versioning:**
- Follow semantic versioning
- Deprecate before removing
- Communicate breaking changes early
- Support migration path

**Governance:**
- Establish contribution process
- Review all changes
- Regular design-dev sync
- Track adoption metrics

## Summary

| Layer | What It Contains | Example |
|-------|-----------------|---------|
| **Design Tokens** | Colors, spacing, typography | `primary.500: #2196f3` |
| **Atoms** | Smallest UI elements | Button, Input, Icon |
| **Molecules** | Grouped atoms | SearchBar, FormField |
| **Organisms** | Complex UI sections | Navbar, ProductCard |
| **Templates** | Page layouts | ProductListTemplate |
| **Pages** | Templates with real data | ProductsPage |

**Key Insight:**
> A design system is only successful if teams actually use it. Invest equally in component quality and developer experience (documentation, Storybook, easy installation). The best design system is the one people voluntarily adopt.

---
[← Back to SystemDesign](../README.md)
