# CSS Fundamentals

Understanding CSS fundamentals is essential for styling web pages effectively. This covers selectors, specificity, the box model, and positioning.

## 📚 Core Concepts

### 1. CSS Selectors

**Basic Selectors**

```html
<!-- HTML Structure -->
<div id="header">
    <p>Welcome to our website</p>
    <button class="button">Click Me</button>
</div>
```

```css
/* Element selector - targets all <p> elements */
p {
    color: blue;
}

/* Class selector - reusable across multiple elements */
.button {
    background-color: green;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* ID selector (use sparingly - should be unique) */
#header {
    font-size: 24px;
    padding: 20px;
    background-color: #f0f0f0;
}

/* Universal selector - resets all elements */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
```

**Combinators**

```html
<!-- HTML Structure -->
<div class="container">
    <p>Direct child paragraph</p>
    <div>
        <p>Nested paragraph (descendant but not direct child)</p>
    </div>
    <h2>Heading</h2>
    <p>First paragraph after heading (adjacent sibling)</p>
    <p>Second paragraph after heading (general sibling)</p>
</div>
```

```css
/* Descendant selector - targets ALL <p> inside .container at any level */
.container p {
    color: gray;
}

/* Child selector - targets ONLY direct <p> children of .container */
.container > p {
    font-weight: bold;
    /* Only "Direct child paragraph" becomes bold */
}

/* Adjacent sibling - targets the FIRST <p> immediately after <h2> */
h2 + p {
    margin-top: 0;
    font-size: 1.2rem;
    /* Only "First paragraph after heading" affected */
}

/* General sibling - targets ALL <p> elements that are siblings after <h2> */
h2 ~ p {
    color: blue;
    /* Both "First" and "Second paragraph after heading" turn blue */
}
```

**Attribute Selectors**
```css
/* Has attribute */
input[required] {
    border-color: red;
}

/* Exact value */
input[type="email"] {
    background-color: lightblue;
}

/* Contains value */
a[href*="example"] {
    color: green;
}

/* Starts with */
a[href^="https"] {
    padding-left: 20px;
}

/* Ends with */
a[href$=".pdf"] {
    background: url('pdf-icon.png');
}

/* Contains word */
div[class~="highlight"] {
    background: yellow;
}
```

**Pseudo-classes**

```html
<!-- HTML Structure -->
<nav>
    <a href="https://example.com">External Link</a>
    <a href="#section">Internal Link</a>
</nav>

<form>
    <input type="email" required placeholder="Enter email">
    <input type="checkbox" id="terms">
    <label for="terms">Accept Terms</label>
    <input type="text" disabled value="Disabled field">
</form>

<ul class="list">
    <li>First item</li>
    <li>Second item</li>
    <li class="special">Third item (special)</li>
    <li>Fourth item</li>
    <li>Fifth item</li>
    <li>Sixth item</li>
</ul>
```

```css
/* Link states - must be in this order (LVHA) */
a:link { color: blue; }
a:visited { color: purple; }
a:hover {
    color: red;
    text-decoration: none;
}
a:active { color: orange; }

/* Form states */
input:focus {
    border-color: blue;
    outline: 2px solid blue;
    background-color: #f0f8ff;
}

input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
}

input:checked + label {
    font-weight: bold;
    color: green;
}

input:valid {
    border-color: green;
}

input:invalid {
    border-color: red;
}

/* Structural pseudo-classes */
li:first-child {
    font-weight: bold;
    color: darkblue;
}

li:last-child {
    border-bottom: none;
    font-style: italic;
}

li:nth-child(odd) {
    background-color: #f0f0f0;
}

li:nth-child(3n) {
    color: blue; /* Every 3rd item (3, 6, 9...) */
}

p:not(.special) {
    color: gray;
}

div:empty {
    display: none; /* Hides empty divs */
}
```

**Pseudo-elements**
```css
/* ::before and ::after */
.quote::before {
    content: '"';
    font-size: 2em;
}

.quote::after {
    content: '"';
    font-size: 2em;
}

/* ::first-letter and ::first-line */
p::first-letter {
    font-size: 2em;
    font-weight: bold;
}

p::first-line {
    font-variant: small-caps;
}

/* ::selection */
::selection {
    background-color: yellow;
    color: black;
}

/* ::placeholder */
input::placeholder {
    color: #999;
    font-style: italic;
}
```

### 2. Specificity

**Specificity Hierarchy**
```css
/* Inline styles: 1000 */
<div style="color: red;">

/* ID: 100 */
#header { color: blue; }

/* Class, pseudo-class, attribute: 10 */
.button { color: green; }
:hover { color: orange; }
[type="text"] { color: purple; }

/* Element, pseudo-element: 1 */
p { color: black; }
::before { color: gray; }

/* Specificity calculation */
/* (inline, id, class, element) */

/* 0,1,0,1 - Specificity: 101 */
#header p { color: red; }

/* 0,0,2,1 - Specificity: 21 */
.container .button p { color: blue; }

/* Winner: #header p (higher specificity) */
```

**Important Rule**
```css
/* Overrides everything (use sparingly!) */
p {
    color: red !important;
}

/* Even this won't override */
#special {
    color: blue; /* Lost! */
}
```

### 3. The Box Model

```html
<!-- HTML Structure -->
<div class="box-container">
    <div class="box box-default">Default Box Model</div>
    <div class="box box-border-box">Border Box Model</div>
</div>
```

```css
.box-container {
    display: flex;
    gap: 40px;
    padding: 20px;
}

/* Default box model */
.box-default {
    /* Content */
    width: 200px;
    height: 100px;

    /* Padding (inside border) */
    padding: 20px;
    /* Shorthand options:
       padding: 10px;                  (all sides)
       padding: 10px 20px;             (vertical horizontal)
       padding: 10px 20px 10px 20px;   (top right bottom left) */

    /* Border */
    border: 2px solid black;
    /* Or separately:
       border-width: 2px;
       border-style: solid;
       border-color: black; */
    border-radius: 8px;

    /* Margin (outside border) */
    margin: 20px;

    /* Background to visualize content area */
    background-color: lightblue;

    /* Total width = width + padding + border + margin */
    /* Total: 200 + 40 + 4 + 40 = 284px */
}

/* Modern box-sizing (RECOMMENDED) */
.box-border-box {
    box-sizing: border-box; /* Includes padding and border in width */
    width: 200px;
    height: 100px;
    padding: 20px;
    border: 2px solid darkblue;
    border-radius: 8px;
    background-color: lightgreen;
    margin: 20px;

    /* Total width = 200px (padding and border are INSIDE) */
    /* Content width = 200 - 40 (padding) - 4 (border) = 156px */
}

/* Best practice: Apply to all elements */
* {
    box-sizing: border-box;
}
```

**Visual Representation:**
```
Default (content-box):
┌─────────────────────────────────────┐
│  Margin (20px)                      │
│  ┌───────────────────────────────┐  │
│  │ Border (2px)                  │  │
│  │ ┌───────────────────────────┐ │  │
│  │ │ Padding (20px)            │ │  │
│  │ │ ┌───────────────────────┐ │ │  │
│  │ │ │ Content (200x100)     │ │ │  │
│  │ │ └───────────────────────┘ │ │  │
│  │ └───────────────────────────┘ │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Border-box:
┌─────────────────────────────────────┐
│  Margin (20px)                      │
│  ┌───────────────────────────────┐  │
│  │ Border (2px)                  │  │
│  │ Padding (20px)                │  │
│  │ Content (156x56px)            │  │
│  │  Total box: 200x100           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 4. Display Property

```html
<!-- HTML Structure -->
<div class="demo-container">
    <div class="block">Block Element (div)</div>
    <div class="block">Another Block</div>

    <span class="inline">Inline 1</span>
    <span class="inline">Inline 2</span>
    <span class="inline">Inline 3</span>

    <div class="inline-block-demo">
        <div class="inline-block">Box 1</div>
        <div class="inline-block">Box 2</div>
        <div class="inline-block">Box 3</div>
    </div>

    <div class="hidden">This is hidden (display: none)</div>
    <div class="invisible">This is invisible (visibility: hidden)</div>
</div>
```

```css
.demo-container {
    padding: 20px;
    background-color: #f5f5f5;
}

/* Block - Takes full width, starts on new line */
.block {
    display: block;
    background-color: lightblue;
    padding: 10px;
    margin-bottom: 10px;
    border: 2px solid blue;
}

/* Inline - Flows with text, ignores width/height */
.inline {
    display: inline;
    background-color: lightcoral;
    padding: 5px; /* Note: vertical padding doesn't affect layout */
    margin: 0 5px;
    border: 1px solid red;
    /* width and height are IGNORED on inline elements */
}

/* Inline-block - Best of both worlds */
.inline-block {
    display: inline-block;
    width: 100px;
    height: 100px;
    background-color: lightgreen;
    margin: 10px;
    padding: 10px;
    text-align: center;
    vertical-align: top; /* Can be aligned vertically */
}

/* None - Completely removes from layout (no space taken) */
.hidden {
    display: none;
    /* Element is not rendered, takes no space */
}

/* Visibility - Hides element but keeps its space */
.invisible {
    visibility: hidden;
    /* Element is invisible but still takes up space in layout */
    background-color: lightyellow;
    padding: 20px;
}
```

**Key Differences:**
- **Block**: Full width, new line, respects width/height
- **Inline**: Flows with text, ignores width/height, respects horizontal margin/padding only
- **Inline-block**: Flows like inline, respects width/height like block
- **None**: Removed from layout entirely
- **Visibility hidden**: Hidden but space reserved

### 5. Position Property

```html
<!-- HTML Structure -->
<div class="position-demo">
    <!-- Static (default) -->
    <div class="box static-box">
        Static (default)
    </div>

    <!-- Relative -->
    <div class="box relative-box">
        Relative (moved 20px down, 20px right)
    </div>

    <!-- Absolute inside Relative container -->
    <div class="container-relative">
        Container (position: relative)
        <div class="box absolute-box">
            Absolute (top: 10px, right: 10px)
        </div>
    </div>

    <!-- Fixed -->
    <div class="fixed-box">
        Fixed to viewport
    </div>

    <!-- Sticky -->
    <div class="sticky-box">
        Sticky (scroll to see effect)
    </div>
</div>
```

```css
.position-demo {
    position: relative;
    padding: 20px;
    background-color: #f9f9f9;
    min-height: 1500px; /* For scroll demo */
}

.box {
    padding: 20px;
    margin: 10px 0;
    background-color: lightblue;
    border: 2px solid blue;
}

/* Static (default) - Normal document flow */
.static-box {
    position: static; /* Default, not affected by top/left/right/bottom */
    /* top, left, right, bottom properties have NO effect */
}

/* Relative - Moves relative to its normal position */
.relative-box {
    position: relative;
    top: 20px;    /* Moves 20px down from original position */
    left: 20px;   /* Moves 20px right from original position */
    background-color: lightcoral;
    /* Original space in layout is PRESERVED (leaves gap) */
}

/* Absolute - Positioned relative to nearest positioned ancestor */
.container-relative {
    position: relative; /* This becomes the positioning context */
    height: 150px;
    background-color: #ffe4e1;
    border: 2px dashed #ff6b6b;
    margin: 20px 0;
}

.absolute-box {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 200px;
    background-color: lightgreen;
    /* Removed from normal document flow */
    /* Positioned relative to .container-relative */
}

/* Fixed - Positioned relative to viewport */
.fixed-box {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 200px;
    background-color: lightyellow;
    border: 2px solid orange;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 1000;
    /* Fixed to viewport, stays in place when scrolling */
}

/* Sticky - Toggles between relative and fixed */
.sticky-box {
    position: sticky;
    top: 0;
    background-color: #e0f7fa;
    border: 2px solid #00bcd4;
    z-index: 10;
    /* Behaves like relative until scrolled to top: 0 */
    /* Then "sticks" like fixed until parent scroll container ends */
}

/* Z-index Example (Layering) */
.modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000; /* Higher values appear on top */
    background: white;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 999; /* Below modal, above content */
}

.content {
    position: relative;
    z-index: 1; /* Normal content layer */
}
```

**Position Summary:**
- **Static**: Default, normal flow, ignores top/left/right/bottom
- **Relative**: Offset from normal position, space reserved
- **Absolute**: Removed from flow, positioned relative to nearest positioned ancestor
- **Fixed**: Removed from flow, positioned relative to viewport
- **Sticky**: Hybrid of relative + fixed based on scroll position
- **Z-index**: Only works on positioned elements (not static)

### 6. Colors and Units

**Colors**
```css
.colors {
    /* Named colors */
    color: red;

    /* Hex */
    color: #ff0000;
    color: #f00; /* Shorthand */

    /* RGB */
    color: rgb(255, 0, 0);

    /* RGBA (with alpha/transparency) */
    color: rgba(255, 0, 0, 0.5); /* 50% transparent */

    /* HSL (Hue, Saturation, Lightness) */
    color: hsl(0, 100%, 50%);

    /* HSLA */
    color: hsla(0, 100%, 50%, 0.5);

    /* CSS variables */
    --primary-color: #3498db;
    color: var(--primary-color);
}
```

**Length Units**
```css
.units {
    /* Absolute units */
    width: 100px;    /* Pixels */
    width: 1in;      /* Inches */
    width: 2.54cm;   /* Centimeters */

    /* Relative units */
    width: 50%;      /* Percentage of parent */
    width: 10em;     /* Relative to element's font-size */
    width: 10rem;    /* Relative to root font-size */
    width: 50vw;     /* 50% of viewport width */
    width: 50vh;     /* 50% of viewport height */
    width: 5vmin;    /* 5% of smaller viewport dimension */
    width: 5vmax;    /* 5% of larger viewport dimension */

    /* Modern units */
    width: calc(100% - 20px);
    width: min(500px, 100%);
    width: max(300px, 50%);
    width: clamp(300px, 50%, 800px); /* min, preferred, max */
}
```

### 7. Typography

```css
.typography {
    /* Font family */
    font-family: 'Arial', sans-serif;
    font-family: 'Georgia', serif;
    font-family: 'Courier New', monospace;

    /* Font size */
    font-size: 16px;
    font-size: 1rem;
    font-size: 1.5em;

    /* Font weight */
    font-weight: normal;  /* 400 */
    font-weight: bold;    /* 700 */
    font-weight: 600;

    /* Font style */
    font-style: normal;
    font-style: italic;

    /* Line height */
    line-height: 1.5;     /* Unitless (recommended) */
    line-height: 24px;

    /* Letter spacing */
    letter-spacing: 0.5px;
    letter-spacing: -0.05em;

    /* Word spacing */
    word-spacing: 2px;

    /* Text align */
    text-align: left;
    text-align: center;
    text-align: right;
    text-align: justify;

    /* Text decoration */
    text-decoration: none;
    text-decoration: underline;
    text-decoration: line-through;

    /* Text transform */
    text-transform: uppercase;
    text-transform: lowercase;
    text-transform: capitalize;

    /* White space */
    white-space: normal;
    white-space: nowrap;   /* No wrapping */
    white-space: pre;      /* Preserve whitespace */
    white-space: pre-wrap; /* Preserve + wrap */

    /* Text overflow */
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;

    /* Word break */
    word-break: break-all;
    word-wrap: break-word;
}
```

### 8. Backgrounds

```css
.backgrounds {
    /* Color */
    background-color: #f0f0f0;

    /* Image */
    background-image: url('image.jpg');

    /* Repeat */
    background-repeat: no-repeat;
    background-repeat: repeat-x;
    background-repeat: repeat-y;

    /* Position */
    background-position: center;
    background-position: top right;
    background-position: 50% 50%;

    /* Size */
    background-size: cover;      /* Fill container */
    background-size: contain;    /* Fit in container */
    background-size: 100px 200px;

    /* Attachment */
    background-attachment: fixed;  /* Parallax effect */
    background-attachment: scroll;

    /* Shorthand */
    background: #f0f0f0 url('image.jpg') no-repeat center/cover;

    /* Multiple backgrounds */
    background-image: url('front.png'), url('back.png');
    background-position: center, top left;
    background-repeat: no-repeat, repeat;

    /* Gradients */
    background: linear-gradient(to right, red, blue);
    background: linear-gradient(45deg, red, yellow, green);
    background: radial-gradient(circle, red, blue);
}
```

### 9. CSS Variables (Custom Properties)

```css
:root {
    /* Define variables */
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --spacing: 16px;
    --border-radius: 4px;
    --font-size-base: 16px;
}

.component {
    /* Use variables */
    background-color: var(--primary-color);
    padding: var(--spacing);
    border-radius: var(--border-radius);
    font-size: var(--font-size-base);

    /* Fallback value */
    color: var(--text-color, black);

    /* Calculations */
    margin: calc(var(--spacing) * 2);
}

/* Override in specific context */
.dark-theme {
    --primary-color: #2c3e50;
    --secondary-color: #27ae60;
}
```

## 🎯 Common Interview Questions

### Q1: What is the CSS Box Model?

**Answer:**
Every element is a box with:
- **Content**: The actual content (text, images)
- **Padding**: Space inside border
- **Border**: Surrounds padding
- **Margin**: Space outside border

`box-sizing: border-box` includes padding and border in the width.

### Q2: Explain CSS specificity

**Answer:**
Specificity determines which CSS rule applies:
1. Inline styles (1000)
2. IDs (100)
3. Classes, attributes, pseudo-classes (10)
4. Elements, pseudo-elements (1)

`!important` overrides everything (avoid if possible).

### Q3: What's the difference between `display: none` and `visibility: hidden`?

**Answer:**
- `display: none`: Removes element from layout (doesn't take up space)
- `visibility: hidden`: Hides element but keeps its space

## 💡 Practical Examples

### Example 1: Centering Content

```css
/* Horizontal centering */
.center-horizontal {
    margin: 0 auto;
    width: 800px;
}

/* Flexbox centering */
.flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

/* Grid centering */
.grid-center {
    display: grid;
    place-items: center;
    height: 100vh;
}

/* Absolute centering */
.absolute-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
```

### Example 2: Card Component

```css
.card {
    /* Box model */
    width: 300px;
    padding: 20px;
    margin: 20px;

    /* Border and shadow */
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    /* Typography */
    font-family: Arial, sans-serif;
    line-height: 1.6;

    /* Transition */
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.card-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 10px;
    color: #333;
}

.card-description {
    color: #666;
    margin-bottom: 15px;
}

.card-button {
    display: inline-block;
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.3s ease;
}

.card-button:hover {
    background-color: #2980b9;
}
```

### Example 3: Responsive Typography

```css
:root {
    --font-size-base: 16px;
    --line-height-base: 1.6;
}

body {
    font-size: var(--font-size-base);
    line-height: var(--line-height-base);
}

h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    line-height: 1.2;
}

h2 {
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    line-height: 1.3;
}

p {
    font-size: clamp(1rem, 2vw, 1.125rem);
    max-width: 65ch; /* Optimal reading length */
}
```

## 🚨 Common Pitfalls

1. **Not using `box-sizing: border-box`**
2. **Overusing `!important`**
3. **Using inline styles** (hard to maintain)
4. **Not considering specificity conflicts**
5. **Using pixels for everything** (not responsive)
6. **Forgetting vendor prefixes** (when needed)

## 🎓 Best Practices

1. **Use `box-sizing: border-box`** on all elements
2. **Prefer classes over IDs** for styling
3. **Use CSS variables** for theming
4. **Use relative units** (rem, em, %) for responsiveness
5. **Follow BEM naming** or similar methodology
6. **Organize CSS** logically (variables, base, components)
7. **Minimize use of `!important`**
8. **Use shorthand properties** when appropriate

## 🔗 Related Topics

- [Flexbox](./03-flexbox.md)
- [CSS Grid](./04-grid.md)
- [Responsive Design](./05-responsive-design.md)

---

[← Back to HTML & CSS](./README.md) | [Next: Flexbox →](./03-flexbox.md)
