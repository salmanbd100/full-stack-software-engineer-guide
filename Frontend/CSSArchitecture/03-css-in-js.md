# CSS-in-JS Solutions

## Overview

CSS-in-JS (Cascading Style Sheets in JavaScript) is a methodology for writing CSS directly in JavaScript code. It enables component-scoped styling, dynamic theming, type-safe CSS, and eliminates dead code. Popular solutions include styled-components, Emotion, Linaria, and Vanilla Extract.

---

## Table of Contents
1. [CSS-in-JS Fundamentals](#css-in-js-fundamentals)
2. [styled-components](#styled-components)
3. [Emotion](#emotion)
4. [Linaria (Zero-Runtime)](#linaria-zero-runtime)
5. [Vanilla Extract](#vanilla-extract)
6. [Comparison](#comparison)
7. [Performance Considerations](#performance-considerations)
8. [SSR and Bundle Size](#ssr-and-bundle-size)
9. [Interview Questions](#interview-questions)
10. [Real-World Examples](#real-world-examples)

---

## CSS-in-JS Fundamentals

### Concept

CSS-in-JS allows writing styles in JavaScript, bringing styling logic closer to component code and enabling:
- **Component-level scoping** - Styles encapsulated to components
- **Dynamic styling** - Styles based on props and state
- **Type safety** - Full TypeScript support
- **Automatic vendor prefixing** - Cross-browser compatibility
- **Code splitting** - Styles loaded with components
- **Easy theming** - Props-based theme switching

### Benefits of CSS-in-JS

1. **No naming conflicts** - Automatic class name generation
2. **Component-scoped** - Styles isolated to component
3. **Dynamic styling** - Props � styles mapping
4. **Type safety** - TypeScript support for themes
5. **Dead code elimination** - Unused styles removed
6. **Easier refactoring** - Move component = move styles
7. **Automatic vendor prefixing** - Browser compatibility
8. **Easy testing** - Styles bound to component
9. **Theming** - Provider-based theme switching
10. **Debugging** - Source maps to original code

### Drawbacks of CSS-in-JS

1. **Runtime overhead** - CSS generated at runtime
2. **Bundle size** - Library adds ~15KB (gzipped)
3. **Performance** - Initial render slower than static CSS
4. **SSR complexity** - Special handling needed
5. **Learning curve** - New concepts and syntax
6. **Debugging** - Generated class names
7. **Performance profiling** - Hard to identify bottlenecks
8. **Vendor lock-in** - Changing libraries is difficult
9. **SEO issues** - SSR required for proper SEO
10. **File size** - Every component includes library code

### Popular CSS-in-JS Libraries

| Library | Runtime | Bundle Size | Features |
|---------|---------|-------------|----------|
| **styled-components** | Yes | 16KB | Full featured, popular |
| **Emotion** | Yes | 7KB | Lightweight, flexible |
| **Linaria** | No | 1KB | Zero-runtime, fast |
| **Vanilla Extract** | No | TypeScript | Type-safe, static |
| **CSS-in-JS** | Yes | 5KB | Simple, performant |
| **Stitches** | Yes | 6KB | Type-safe, variant API |

---

## styled-components

### Installation

Getting started with styled-components requires installing the core library and optionally the Babel plugin for better debugging and optimization. The Babel plugin adds component names and enables SSR optimizations.

```bash
npm install styled-components
npm install -D babel-plugin-styled-components  # Optional but recommended
```

### Basic Syntax

Styled-components uses tagged template literals to define component styles, creating React components with CSS directly attached. The syntax feels like writing regular CSS with full support for nesting, pseudo-selectors, and media queries.

```jsx
import styled from 'styled-components';

// Create a styled component
const StyledButton = styled.button`
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;

    &:hover {
        background-color: #2980b9;
    }

    &:active {
        transform: scale(0.98);
    }
`;

// Use in component
const Button = ({ children, ...props }) => (
    <StyledButton {...props}>
        {children}
    </StyledButton>
);
```

### Props-Based Styling

Props enable dynamic styling where component appearance adapts based on component state or data. This pattern eliminates separate CSS classes for variations, as JavaScript functions interpolate props directly into CSS values.

```jsx
import styled from 'styled-components';

// Simple conditional styling
const Button = styled.button`
    padding: 10px 20px;
    background-color: ${props => props.primary ? '#3498db' : '#95a5a6'};
    color: white;
    border: none;
    border-radius: 4px;

    &:hover {
        background-color: ${props => props.primary ? '#2980b9' : '#7f8c8d'};
    }
`;

// Usage
<Button primary>Primary</Button>
<Button>Secondary</Button>

// Complex conditional
const Input = styled.input`
    padding: 10px;
    border: 1px solid ${props => {
        if (props.error) return '#e74c3c';
        if (props.disabled) return '#bdc3c7';
        return '#ccc';
    }};
    background-color: ${props => props.disabled ? '#ecf0f1' : 'white'};
`;
```

### styled-components Complete Button Example

A production-ready button component demonstrates styled-components' full feature set including variants, sizes, states, and icons. Notice how props drive all styling decisions without className logic or separate CSS files.

```jsx
import styled from 'styled-components';

const ButtonBase = styled.button`
    display: inline-flex;
    align-items: center;
    padding: ${props => {
        switch (props.size) {
            case 'small':
                return '8px 16px';
            case 'large':
                return '12px 24px';
            default:
                return '10px 20px';
        }
    }};
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    font-weight: 600;
    transition: all 0.3s ease;
    opacity: ${props => props.disabled ? 0.6 : 1};
    pointer-events: ${props => props.disabled ? 'none' : 'auto'};
`;

const PrimaryButton = styled(ButtonBase)`
    background-color: #3498db;
    color: white;

    &:hover {
        background-color: #2980b9;
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const SecondaryButton = styled(ButtonBase)`
    background-color: #ecf0f1;
    color: #333;
    border-color: #bdc3c7;

    &:hover {
        background-color: #bdc3c7;
    }
`;

const DangerButton = styled(ButtonBase)`
    background-color: #e74c3c;
    color: white;

    &:hover {
        background-color: #c0392b;
    }
`;

// Usage
<PrimaryButton>Primary</PrimaryButton>
<SecondaryButton size="large">Secondary</SecondaryButton>
<DangerButton disabled>Delete</DangerButton>
```

### styled-components Complete Card Component

Complex multi-element components benefit from styled-components' modularity, where each visual element exports as an independent styled component. This card example shows how breaking down UI into small styled pieces creates a composable, maintainable component API.

```jsx
import styled from 'styled-components';

const CardContainer = styled.article`
    background: white;
    border: ${props => props.featured ? '2px solid #f39c12' : '1px solid #e0e0e0'};
    border-radius: 8px;
    overflow: hidden;
    box-shadow: ${props => props.featured
        ? '0 4px 12px rgba(243, 156, 18, 0.2)'
        : '0 2px 4px rgba(0, 0, 0, 0.1)'
    };
    transition: all 0.3s ease;

    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;

const CardImage = styled.img`
    display: block;
    width: 100%;
    height: 200px;
    object-fit: cover;
`;

const CardContent = styled.div`
    padding: 20px;
`;

const CardTitle = styled.h2`
    margin: 0 0 10px 0;
    font-size: ${props => props.large ? '24px' : '18px'};
    font-weight: ${props => props.large ? '700' : '600'};
    color: ${props => props.featured ? '#f39c12' : '#333'};
`;

const CardDescription = styled.p`
    margin: 10px 0;
    color: #666;
    line-height: 1.6;
    font-size: 14px;
`;

const CardMeta = styled.div`
    display: flex;
    gap: 20px;
    margin-top: 15px;
    font-size: 12px;
    color: #999;
`;

const CardFooter = styled.footer`
    padding: 15px 20px;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
`;

const CardAction = styled.button`
    background: none;
    border: none;
    color: #3498db;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;

    &:hover {
        text-decoration: underline;
    }
`;

// Card Component
const Card = ({ featured, image, title, description, author, date, onAction }) => {
    return (
        <CardContainer featured={featured}>
            <CardImage src={image} alt={title} />
            <CardContent>
                <CardTitle featured={featured} large={featured}>
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
                <CardMeta>
                    <span>{author}</span>
                    <span>{date}</span>
                </CardMeta>
            </CardContent>
            <CardFooter>
                <CardAction onClick={onAction}>Read More</CardAction>
            </CardFooter>
        </CardContainer>
    );
};
```

### Theming with styled-components

ThemeProvider enables application-wide theming by injecting theme objects into all styled components via React context. This pattern makes dark mode, brand switching, or accessibility themes possible without prop drilling or manual CSS variable management.

```jsx
import styled, { ThemeProvider } from 'styled-components';

// Define themes
const lightTheme = {
    colors: {
        primary: '#3498db',
        background: '#ffffff',
        text: '#333333',
        border: '#e0e0e0'
    },
    shadows: {
        small: '0 2px 4px rgba(0, 0, 0, 0.1)',
        large: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
};

const darkTheme = {
    colors: {
        primary: '#5dade2',
        background: '#1a1a1a',
        text: '#ffffff',
        border: '#444'
    },
    shadows: {
        small: '0 2px 4px rgba(255, 255, 255, 0.1)',
        large: '0 4px 12px rgba(255, 255, 255, 0.15)'
    }
};

// Create styled component using theme
const Button = styled.button`
    padding: 10px 20px;
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 4px;
    cursor: pointer;
    box-shadow: ${props => props.theme.shadows.small};
`;

const Card = styled.div`
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 8px;
    box-shadow: ${props => props.theme.shadows.large};
`;

// App component
const App = () => {
    const [isDark, setIsDark] = useState(false);

    return (
        <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
            <div>
                <Button onClick={() => setIsDark(!isDark)}>
                    Toggle Theme
                </Button>
                <Card>
                    <h2>Card Title</h2>
                    <p>Card content here</p>
                </Card>
            </div>
        </ThemeProvider>
    );
};
```

### Extending Styled Components

Component extension allows creating style variations by inheriting from base styled components. This pattern promotes code reuse by sharing common styles while layering on specific modifications, similar to class inheritance in OOP.

```jsx
import styled from 'styled-components';

// Base button
const Button = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
`;

// Extend with new styles
const PrimaryButton = styled(Button)`
    background-color: #3498db;
    color: white;

    &:hover {
        background-color: #2980b9;
    }
`;

// Extend PrimaryButton
const LargeButton = styled(PrimaryButton)`
    padding: 15px 30px;
    font-size: 16px;
`;

// Change element
const LinkButton = styled(PrimaryButton).attrs({ as: 'a' })`
    text-decoration: none;
    display: inline-block;
`;

// Usage
<Button>Regular</Button>
<PrimaryButton>Primary</PrimaryButton>
<LargeButton>Large Primary</LargeButton>
<LinkButton href="/path">Link Button</LinkButton>
```

### styled-components with TypeScript

TypeScript transforms styled-components from flexible but error-prone to type-safe and IDE-friendly. Interfaces define valid prop combinations and theme shapes, catching mismatches at compile time and enabling autocomplete for theme properties.

```tsx
import styled from 'styled-components';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
}

interface ThemeType {
    colors: {
        primary: string;
        secondary: string;
        danger: string;
    };
    spacing: {
        small: string;
        medium: string;
        large: string;
    };
}

const Button = styled.button<ButtonProps>`
    padding: ${props => {
        switch (props.size) {
            case 'small':
                return '8px 16px';
            case 'large':
                return '12px 24px';
            default:
                return '10px 20px';
        }
    }};

    background-color: ${props => {
        switch (props.variant) {
            case 'secondary':
                return props.theme.colors.secondary;
            case 'danger':
                return props.theme.colors.danger;
            default:
                return props.theme.colors.primary;
        }
    }};

    color: white;
    border: none;
    border-radius: 4px;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: ${props => props.disabled ? 0.6 : 1};
`;

// Usage
<Button variant="primary" size="large" disabled={false}>
    Click
</Button>
```

### styled-components Common Mistakes

Performance anti-patterns in styled-components often stem from creating components inside render functions or inline logic that recreates functions. Understanding these pitfalls prevents unnecessary re-renders and memory leaks in production applications.

```jsx
// WRONG: Creating new component in render
const Component = () => {
    const StyledDiv = styled.div`color: red;`; // Recreated each render!
    return <StyledDiv>Bad</StyledDiv>;
};

// CORRECT: Define outside component
const StyledDiv = styled.div`color: red;`;
const Component = () => <StyledDiv>Good</StyledDiv>;

// WRONG: Not using as prop for polymorphism
styled.button`padding: 10px;`; // Only works as button

// CORRECT: Use as prop
const Button = styled.button`padding: 10px;`;
<Button as="a" href="/path">Link</Button>

// WRONG: Inline function in styled component
const Button = styled.button`
    background: ${() => '#3498db'}; // Creates new function each render
`;

// CORRECT: Use memoized values
const Button = styled.button`
    background: ${props => props.color || '#3498db'};
`;

// WRONG: Global style pollution
const Button = styled.button`
    color: red;
    button { color: blue; } // Affects ALL buttons!
`;

// CORRECT: Be specific with selectors
const Button = styled.button`
    color: red;
    &:hover { color: blue; }
`;
```

---

## Emotion

### Installation

Emotion requires two packages: the React integration and the styled API, plus an optional Babel plugin for performance. Emotion is lighter than styled-components, making it attractive for bundle-size-conscious projects.

```bash
npm install @emotion/react @emotion/styled
npm install -D @emotion/babel-plugin  # For optimizations
```

### Basic Syntax

Emotion offers two APIs: styled components similar to styled-components, and a css prop for inline styling. The css prop provides a lighter-weight alternative when full styled components feel heavyweight for simple use cases.

```jsx
import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Styled component
const Button = styled.button`
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #2980b9;
    }
`;

// CSS helper
const buttonStyles = css`
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
`;

const MyButton = () => <button css={buttonStyles}>Click</button>;
```

### Emotion Complete Card Component

Emotion's styled API mirrors styled-components, making migration straightforward for teams switching libraries. This card implementation demonstrates identical patterns to styled-components but with Emotion's smaller runtime footprint.

```jsx
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const Card = styled.article`
    background: white;
    border: ${props => props.featured ? '2px solid #f39c12' : '1px solid #e0e0e0'};
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;

const CardImage = styled.img`
    display: block;
    width: 100%;
    height: 200px;
    object-fit: cover;
`;

const CardContent = styled.div`
    padding: 20px;
`;

const CardTitle = styled.h2`
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: 600;
    color: ${props => props.featured ? '#f39c12' : '#333'};
`;

const CardDescription = styled.p`
    margin: 10px 0;
    color: #666;
    line-height: 1.6;
`;

const CardFooter = styled.footer`
    padding: 15px 20px;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
`;

const CardAction = styled.button`
    background: none;
    border: none;
    color: #3498db;
    cursor: pointer;
    font-weight: 600;

    &:hover {
        text-decoration: underline;
    }
`;

// Component
const CardComponent = ({ featured, image, title, description, onAction }) => (
    <Card featured={featured}>
        <CardImage src={image} alt={title} />
        <CardContent>
            <CardTitle featured={featured}>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardContent>
        <CardFooter>
            <CardAction onClick={onAction}>Read More</CardAction>
        </CardFooter>
    </Card>
);
```

### Emotion Global Styles

The Global component injects global CSS without separate files, useful for resets, typography, or base styles. Unlike component-scoped styles, global styles apply across the entire application and persist as long as the Global component is mounted.

```jsx
import { Global, css } from '@emotion/react';

const globalStyles = css`
    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
    }

    h1, h2, h3, h4, h5, h6 {
        margin: 0;
    }

    p {
        margin: 0;
    }

    a {
        color: #3498db;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
`;

const App = () => (
    <>
        <Global styles={globalStyles} />
        {/* App content */}
    </>
);
```

### Emotion with TypeScript

```tsx
import styled from '@emotion/styled';

interface ButtonProps {
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'large';
}

const Button = styled.button<ButtonProps>`
    padding: ${props => props.size === 'small' ? '8px 16px' : '10px 20px'};
    background: ${props => props.variant === 'primary' ? '#3498db' : '#95a5a6'};
    color: white;
    border: none;
    border-radius: 4px;
`;
```

### Emotion vs styled-components

| Aspect | Emotion | styled-components |
|--------|---------|-------------------|
| **Bundle Size** | 7KB | 16KB |
| **Performance** | Slightly faster | Standard |
| **API** | More flexible | More consistent |
| **CSS helper** | Yes (css prop) | No |
| **Learning Curve** | Easier | Standard |
| **Community** | Growing | Larger |

---

## Linaria (Zero-Runtime)

### Concept

Linaria is a zero-runtime CSS-in-JS solution that extracts CSS at build time, leaving no JavaScript overhead at runtime.

### Installation

Setting up Linaria requires additional webpack or bundler configuration to enable build-time CSS extraction. Unlike runtime solutions, Linaria processes styles during compilation, outputting traditional CSS files.

```bash
npm install @linaria/core @linaria/react
```

### Basic Usage

Linaria's syntax mirrors runtime CSS-in-JS libraries, but styles are static at build time. Dynamic values require CSS variables, and prop-based styling is limited compared to styled-components or Emotion.

```jsx
import { css } from '@linaria/core';
import { styled } from '@linaria/react';

// Styled component (extracts at build time)
const Button = styled.button`
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;

    &:hover {
        background-color: #2980b9;
    }
`;

// CSS helper
const buttonClass = css`
    padding: 10px 20px;
    background-color: #3498db;
`;

<Button>Click</Button>
<button className={buttonClass}>Click</button>
```

### Linaria Benefits

1. **Zero runtime overhead** - CSS extracted at build time
2. **Smallest bundle** - Only ~1KB for runtime utilities
3. **Fastest rendering** - No CSS generation at runtime
4. **Standard CSS** - Regular CSS in browser
5. **Better performance** - Trades flexibility for speed
6. **SEO friendly** - CSS in HTML by default

### Linaria Limitations

1. **No dynamic styling** - Can't use JavaScript at runtime
2. **No props-based styles** - Styles must be static
3. **Limited features** - No theme provider built-in
4. **Complexity** - Build-time extraction is complex

---

## Vanilla Extract

### Concept

Vanilla Extract is a zero-runtime CSS-in-JS solution with TypeScript support, providing type-safe styling.

### Installation

Vanilla Extract integrates with bundlers like Vite, webpack, or esbuild to enable TypeScript-powered CSS generation. The setup provides end-to-end type safety from theme definitions to component styles.

```bash
npm install @vanilla-extract/css @vanilla-extract/react
```

### Basic Usage

Vanilla Extract uses .css.ts files where TypeScript defines styles as JavaScript objects. This approach combines type safety with zero-runtime overhead, as all styles compile to static CSS at build time.

```tsx
// styles.css.ts
import { style, globalStyle } from '@vanilla-extract/css';

globalStyle('*', {
    boxSizing: 'border-box',
});

export const button = style({
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',

    ':hover': {
        backgroundColor: '#2980b9',
    },
});

// Component
import { button } from './styles.css';

const Button = ({ children, ...props }) => (
    <button className={button} {...props}>
        {children}
    </button>
);
```

### Vanilla Extract with Variants

```tsx
import { style, styleVariants } from '@vanilla-extract/css';

const buttonBase = style({
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
});

export const button = styleVariants({
    primary: [buttonBase, {
        backgroundColor: '#3498db',
        color: 'white',
    }],
    secondary: [buttonBase, {
        backgroundColor: '#95a5a6',
        color: 'white',
    }],
    danger: [buttonBase, {
        backgroundColor: '#e74c3c',
        color: 'white',
    }],
});

// Usage
<button className={button.primary}>Primary</button>
<button className={button.secondary}>Secondary</button>
```

### Vanilla Extract Benefits

1. **Full type safety** - TypeScript support
2. **Zero runtime** - No CSS-in-JS overhead
3. **Static extraction** - All CSS known at build time
4. **Optimal performance** - Smallest bundle and fastest
5. **IDE integration** - Full IDE support

### Vanilla Extract Limitations

1. **No dynamic styling** - Styles are static
2. **No props-based styles** - Need class composition
3. **Steeper learning curve** - TypeScript required
4. **Less flexible** - Trade flexibility for performance

---

## Comparison

### Feature Comparison

| Feature | styled-components | Emotion | Linaria | Vanilla Extract |
|---------|-------------------|---------|---------|-----------------|
| **Dynamic Styling** | Yes | Yes | Limited | No |
| **Runtime** | Full | Full | Zero | Zero |
| **Bundle Size** | 16KB | 7KB | 1KB | 1KB |
| **Performance** | Good | Good | Excellent | Excellent |
| **Type Safety** | Partial | Partial | Partial | Full |
| **Learning Curve** | Medium | Medium | Medium | Hard |
| **Theming** | Easy | Easy | Hard | Hard |
| **Props-Based** | Yes | Yes | No | No |

### When to Use Each

**styled-components**
- Full-featured CSS-in-JS needed
- Props-based dynamic styling
- Complex component variations
- Theme provider system
- Largest ecosystem

**Emotion**
- Lightweight alternative to styled-components
- CSS prop support needed
- Performance matters but not critical
- Flexibility and performance balance

**Linaria**
- Build-time extraction preferred
- Zero runtime overhead needed
- No dynamic styling needed
- Optimal performance critical

**Vanilla Extract**
- Full TypeScript support needed
- Static typing of styles
- Build-time extraction required
- No runtime overhead acceptable

---

## Performance Considerations

### Bundle Size Impact

```
Base application: 50KB

+ styled-components:   +16KB � 66KB
+ Emotion:             +7KB  � 57KB
+ Linaria:             +1KB  � 51KB
+ Vanilla Extract:     +1KB  � 51KB
```

### Runtime Performance

**styled-components (Runtime CSS Generation)**
```
1. Component renders
2. JavaScript evaluates CSS string
3. Creates/injects stylesheet
4. Browser applies styles
```

**Zero-Runtime (Vanilla Extract, Linaria)**
```
1. CSS extracted at build time
2. Linked in HTML as normal CSS
3. Browser applies styles immediately
4. No JavaScript execution needed
```

### Performance Optimization Techniques

```jsx
// WRONG: Creates styled component in render
const MyComponent = () => {
    const StyledDiv = styled.div`color: red;`;
    return <StyledDiv>Bad</StyledDiv>;
};

// CORRECT: Define outside
const StyledDiv = styled.div`color: red;`;
const MyComponent = () => <StyledDiv>Good</StyledDiv>;

// WRONG: Large styled component
const Button = styled.button`
    padding: 10px;
    color: ${props => {
        // Complex logic here
    }};
    // Many styles here
`;

// CORRECT: Split into smaller components
const BaseButton = styled.button`
    padding: 10px;
`;
const ColoredButton = styled(BaseButton)`
    color: ${props => props.color};
`;

// WRONG: Object spread in styled component
const Button = styled.button(props => ({
    padding: props.size === 'large' ? '15px' : '10px',
    // Many properties
}));

// CORRECT: Use template literal
const Button = styled.button`
    padding: ${props => props.size === 'large' ? '15px' : '10px'};
`;
```

---

## SSR and Bundle Size

### Server-Side Rendering

**styled-components SSR:**
```jsx
import { ServerStyleSheet } from 'styled-components';
import ReactDOMServer from 'react-dom/server';

const sheet = new ServerStyleSheet();

try {
    const html = ReactDOMServer.renderToString(
        sheet.collectStyles(<App />)
    );
    const styleTags = sheet.getStyleTags();
    return `${html}${styleTags}`;
} finally {
    sheet.seal();
}
```

**Emotion SSR:**
```jsx
import { extractCritical } from '@emotion/server';

const { html, ids, css } = extractCritical(
    ReactDOMServer.renderToString(<App />)
);
```

**Zero-Runtime (Vanilla Extract, Linaria):**
- No special SSR handling needed
- CSS extracted at build time
- Works like normal CSS files

### Bundle Size Optimization

```jsx
// Tree-shake unused styled components
export const PrimaryButton = styled.button`...`;
export const SecondaryButton = styled.button`...`;

// Only imported button is included
import { PrimaryButton } from './buttons';

// Use code splitting
const LazyComponent = lazy(() => import('./component'));
// Styles loaded with component

// Remove runtime CSS-in-JS in production
// Use zero-runtime solution (Vanilla Extract, Linaria)
```

---

## Interview Questions

### Question 1: What is CSS-in-JS and What Are Its Benefits?

**Answer:**

CSS-in-JS writes CSS directly in JavaScript, enabling component-scoped styling and dynamic styling based on props.

**Benefits:**
1. **No naming conflicts** - Automatic class name generation
2. **Component scoping** - Styles isolated to component
3. **Dynamic styling** - Props � styles mapping
4. **Type safety** - Full TypeScript support
5. **No dead CSS** - Unused styles removed
6. **Easy refactoring** - Move component = move styles
7. **Automatic vendor prefixing** - Cross-browser compatibility
8. **Easy theming** - Provider-based theme switching

**Example:**
```jsx
const Button = styled.button`
    background: ${props => props.primary ? '#3498db' : '#95a5a6'};
    padding: 10px 20px;
`;

<Button primary>Click</Button>
```

---

### Question 2: Compare styled-components, Emotion, Linaria, and Vanilla Extract

**Answer:**

**styled-components**
- Full-featured runtime CSS-in-JS
- Great for complex dynamic styling
- Largest bundle (16KB)
- Biggest ecosystem
- Easy theming support

**Emotion**
- Lightweight alternative (7KB)
- CSS prop support
- More flexible API
- Similar features to styled-components
- Growing community

**Linaria**
- Zero-runtime CSS-in-JS
- CSS extracted at build time
- Minimal bundle (1KB)
- No dynamic styling at runtime
- Optimal performance

**Vanilla Extract**
- Zero-runtime with TypeScript
- Full type safety
- Static CSS only
- Best performance
- Steeper learning curve

**Choice depends on:**
- Dynamic styling needs? � styled-components, Emotion
- Performance critical? � Linaria, Vanilla Extract
- TypeScript project? � Vanilla Extract
- Bundle size sensitive? � Emotion, Linaria, Vanilla Extract

---

### Question 3: What Are the Drawbacks of CSS-in-JS?

**Answer:**

1. **Runtime overhead** - CSS generated at runtime (except zero-runtime)
2. **Bundle size** - Library adds 7-16KB (much less than component size)
3. **Performance** - Initial render slower than static CSS
4. **SSR complexity** - Special handling required (Emotion, styled-components)
5. **Learning curve** - New concepts and syntax
6. **Debugging** - Generated class names harder to trace
7. **File size** - Every component includes library code
8. **Performance profiling** - Harder to identify bottlenecks
9. **Vendor lock-in** - Changing libraries is difficult

**Mitigation:**
```jsx
// Use zero-runtime for critical sections
import { styled } from '@vanilla-extract/react';

// Or use Emotion (smallest runtime)
import styled from '@emotion/styled';

// Code split components
const HeavyComponent = lazy(() => import('./heavy'));
```

---

### Question 4: How Do You Handle Theming With CSS-in-JS?

**Answer:**

**styled-components:**
```jsx
import { ThemeProvider } from 'styled-components';

const lightTheme = { colors: { primary: '#3498db' } };
const darkTheme = { colors: { primary: '#5dade2' } };

const Button = styled.button`
    background: ${props => props.theme.colors.primary};
`;

<ThemeProvider theme={lightTheme}>
    <Button>Click</Button>
</ThemeProvider>
```

**Emotion:**
```jsx
import { ThemeProvider } from '@emotion/react';

<ThemeProvider theme={lightTheme}>
    <Button>Click</Button>
</ThemeProvider>
```

**Vanilla Extract (Context):**
```tsx
// themes.css.ts
export const lightTheme = createTheme({
    colors: { primary: '#3498db' }
});

export const darkTheme = createTheme({
    colors: { primary: '#5dade2' }
});

// Component
const [isDark, setIsDark] = useState(false);
<div className={isDark ? darkTheme : lightTheme}>
    <Button>Click</Button>
</div>
```

---

### Question 5: How Would You Migrate From Plain CSS to CSS-in-JS?

**Answer:**

**Phase 1: Setup**
```bash
npm install styled-components
npm install -D babel-plugin-styled-components
```

**Phase 2: Create styled components**
```jsx
// Before
import './button.css';
<button className="btn-primary">Click</button>

// After
const Button = styled.button`
    padding: 10px 20px;
    background: #3498db;
    color: white;
`;
<Button>Click</Button>
```

**Phase 3: Gradual migration**
```jsx
// Old and new can coexist
<OldButton className="btn-primary" />
<NewButton>New</NewButton>
```

**Phase 4: Extract common styles**
```jsx
// Before duplication
const Button = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
`;

const IconButton = styled(Button)`
    padding: 8px;
`;
```

**Phase 5: Implement theming**
```jsx
<ThemeProvider theme={theme}>
    <App />
</ThemeProvider>
```

---

### Question 6: What Are Performance Implications of CSS-in-JS?

**Answer:**

**Performance Impact:**
1. **Bundle size** - +7KB (Emotion) to +16KB (styled-components)
2. **Runtime overhead** - CSS string evaluation at runtime
3. **Initial render** - ~5-10% slower than static CSS
4. **Memory usage** - Runtime styles stored in memory

**Measurement:**
```jsx
// Before (Plain CSS)
Initial CSS: 30KB
JS Bundle: 100KB
Total: 130KB
FCP: 1.2s

// After (styled-components)
Initial CSS: 0KB (in JS)
JS Bundle: 116KB (+16KB library)
Total: 116KB
FCP: 1.3s (+100ms, likely imperceptible)
```

**Optimization:**
```jsx
// Use zero-runtime solutions
// Linaria or Vanilla Extract: no runtime overhead

// Code split large components
const Heavy = lazy(() => import('./heavy'));

// Use server-side rendering
// CSS included in HTML, faster first paint

// Tree-shake unused styles
// Import only used components

// Use Emotion (smallest runtime: 7KB)
// instead of styled-components (16KB)
```

---

## Real-World Examples

### Example 1: Button Component Library

```jsx
// buttons.styled.js
import styled from 'styled-components';

const sizes = {
    small: { padding: '8px 16px', fontSize: '14px' },
    medium: { padding: '10px 20px', fontSize: '16px' },
    large: { padding: '12px 24px', fontSize: '18px' },
};

const variants = {
    primary: { bg: '#3498db', text: '#fff' },
    secondary: { bg: '#ecf0f1', text: '#333' },
    danger: { bg: '#e74c3c', text: '#fff' },
};

const BaseButton = styled.button`
    display: inline-flex;
    align-items: center;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;

    padding: ${props => sizes[props.size].padding};
    font-size: ${props => sizes[props.size].fontSize};
    background-color: ${props => variants[props.variant].bg};
    color: ${props => variants[props.variant].text};
    opacity: ${props => props.disabled ? 0.6 : 1};
    pointer-events: ${props => props.disabled ? 'none' : 'auto'};

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
        transform: scale(0.98);
    }
`;

export const Button = BaseButton;
export const PrimaryButton = styled(BaseButton).attrs({
    variant: 'primary'
})``;
export const SecondaryButton = styled(BaseButton).attrs({
    variant: 'secondary'
})``;
export const DangerButton = styled(BaseButton).attrs({
    variant: 'danger'
})``;

// Usage
<Button variant="primary" size="large">
    Primary Large
</Button>
<DangerButton size="small" disabled>
    Delete
</DangerButton>
```

### Example 2: Form Component with Validation

```jsx
// Form.styled.js
import styled from 'styled-components';

export const FormGroup = styled.div`
    margin-bottom: 20px;
`;

export const Label = styled.label`
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
`;

export const Input = styled.input`
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    transition: all 0.3s ease;

    &:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }

    border-color: ${props => {
        if (props.error) return '#e74c3c';
        if (props.success) return '#27ae60';
        return '#ccc';
    }};

    background-color: ${props => {
        if (props.error) return '#fadbd8';
        if (props.success) return '#d5f4e6';
        return 'white';
    }};
`;

export const ErrorMessage = styled.span`
    display: block;
    margin-top: 5px;
    color: #e74c3c;
    font-size: 12px;
    font-weight: 500;
`;

export const SuccessMessage = styled.span`
    display: block;
    margin-top: 5px;
    color: #27ae60;
    font-size: 12px;
    font-weight: 500;
`;

// Component
const FormInput = ({ label, error, success, ...props }) => {
    return (
        <FormGroup>
            <Label>{label}</Label>
            <Input error={!!error} success={!!success} {...props} />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
        </FormGroup>
    );
};

export default FormInput;
```

---

## Summary

**CSS-in-JS Benefits:**
- Component-scoped styling
- Dynamic styling based on props
- Type-safe CSS (with TypeScript)
- No naming conflicts
- Easy theming

**CSS-in-JS Drawbacks:**
- Runtime overhead (except zero-runtime)
- Bundle size impact
- SSR complexity
- Learning curve

**Library Comparison:**
- **styled-components**: Full-featured, largest ecosystem
- **Emotion**: Lightweight, flexible
- **Linaria**: Zero-runtime, optimal performance
- **Vanilla Extract**: Type-safe, zero-runtime

**Choose based on:**
- Dynamic styling needs
- Performance requirements
- Bundle size constraints
- Team expertise
- TypeScript adoption

---

[� Back to CSS Architecture](./README.md)
