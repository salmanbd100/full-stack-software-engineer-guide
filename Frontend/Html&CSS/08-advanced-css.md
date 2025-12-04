# Advanced CSS

Advanced CSS techniques for creating sophisticated layouts, effects, and maintaining large codebases.

## 📚 Advanced Techniques

### 1. CSS Methodologies

**BEM (Block Element Modifier)**
```css
/* Block */
.card {}

/* Element */
.card__title {}
.card__description {}
.card__button {}

/* Modifier */
.card--featured {}
.card--large {}
.card__button--primary {}
```

```html
<div class="card card--featured">
    <h2 class="card__title">Title</h2>
    <p class="card__description">Description</p>
    <button class="card__button card__button--primary">Click</button>
</div>
```

### 2. CSS Custom Properties (Advanced)

**Theming**
```css
:root {
    --primary-hue: 220;
    --primary-saturation: 90%;
    --primary-lightness: 55%;

    --primary: hsl(
        var(--primary-hue),
        var(--primary-saturation),
        var(--primary-lightness)
    );
    --primary-light: hsl(
        var(--primary-hue),
        var(--primary-saturation),
        calc(var(--primary-lightness) + 20%)
    );
    --primary-dark: hsl(
        var(--primary-hue),
        var(--primary-saturation),
        calc(var(--primary-lightness) - 20%)
    );
}

.button {
    background: var(--primary);
}

.button:hover {
    background: var(--primary-dark);
}

/* Dark theme */
[data-theme="dark"] {
    --primary-lightness: 75%;
}
```

**Responsive Spacing Scale**
```css
:root {
    --space-unit: 1rem;
    --space-xs: calc(0.25 * var(--space-unit));
    --space-sm: calc(0.5 * var(--space-unit));
    --space-md: var(--space-unit);
    --space-lg: calc(2 * var(--space-unit));
    --space-xl: calc(4 * var(--space-unit));
}

.container {
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
}
```

### 3. Advanced Selectors

```css
/* Attribute selectors */
[data-state="active"] {
    color: green;
}

/* Multiple attributes */
input[type="text"][required] {
    border-color: red;
}

/* Negation */
.list-item:not(:last-child) {
    border-bottom: 1px solid #ddd;
}

/* Grouping */
.card:is(.featured, .highlighted, .promoted) {
    border: 2px solid gold;
}

/* Where (zero specificity) */
:where(h1, h2, h3, h4, h5, h6) {
    line-height: 1.2;
}

/* Has (parent selector) */
.card:has(img) {
    display: grid;
    grid-template-columns: 200px 1fr;
}

.form:has(input:invalid) .submit-btn {
    opacity: 0.5;
    pointer-events: none;
}
```

### 4. Advanced Layout Techniques

**Intrinsic Design**
```css
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
    gap: 1rem;
}
```

**Aspect Ratio**
```css
.video-container {
    aspect-ratio: 16 / 9;
}

.square {
    aspect-ratio: 1;
}

/* Old way (before aspect-ratio) */
.video-container-old {
    position: relative;
    padding-bottom: 56.25%; /* 16:9 */
}

.video-container-old iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
```

**Sticky Footer**
```css
/* Flexbox */
body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

main {
    flex: 1;
}

/* Grid */
body {
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 100vh;
}
```

### 5. Clamp, Min, Max

```css
.container {
    /* Responsive width: min 300px, preferred 90%, max 1200px */
    width: clamp(300px, 90%, 1200px);

    /* Responsive font size */
    font-size: clamp(1rem, 2.5vw, 2rem);

    /* Responsive padding */
    padding: clamp(1rem, 5vw, 3rem);
}

/* Min/Max */
.element {
    width: min(100%, 600px); /* Never exceed 600px */
    height: max(300px, 50vh); /* At least 300px */
}
```

### 6. CSS Filters and Backdrop Filter

```css
.image {
    /* Filters */
    filter: grayscale(100%);
    filter: blur(5px);
    filter: brightness(150%);
    filter: contrast(200%);
    filter: sepia(100%);
    filter: hue-rotate(90deg);
    filter: saturate(200%);

    /* Combine multiple */
    filter: brightness(110%) contrast(120%) saturate(130%);
}

.image:hover {
    filter: none;
    transition: filter 0.3s;
}

/* Backdrop filter (frosted glass effect) */
.modal {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
}

.card-glass {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
}
```

### 7. Blend Modes

```css
.overlay {
    background: rgba(0, 0, 255, 0.5);
    mix-blend-mode: multiply;
    mix-blend-mode: screen;
    mix-blend-mode: overlay;
    mix-blend-mode: difference;
}

.text-overlay {
    color: white;
    mix-blend-mode: difference;
}

/* Background blend mode */
.hero {
    background-image:
        linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
        url('bg.jpg');
    background-blend-mode: multiply;
}
```

### 8. CSS Shapes

```css
.circle {
    width: 200px;
    height: 200px;
    clip-path: circle(50%);
}

.triangle {
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.custom-shape {
    clip-path: polygon(
        0% 20%,
        60% 20%,
        60% 0%,
        100% 50%,
        60% 100%,
        60% 80%,
        0% 80%
    );
}

/* Text wrapping around shape */
.floated-circle {
    float: left;
    width: 200px;
    height: 200px;
    shape-outside: circle(50%);
    clip-path: circle(50%);
}
```

### 9. Scroll Snap

```css
.carousel {
    display: flex;
    overflow-x: scroll;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
}

.carousel-item {
    flex: 0 0 100%;
    scroll-snap-align: center;
}

/* Vertical scroll snap */
.sections {
    height: 100vh;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
}

.section {
    height: 100vh;
    scroll-snap-align: start;
}
```

### 10. Content Visibility

```css
/* Optimize rendering performance */
.long-content {
    content-visibility: auto;
    contain-intrinsic-size: 0 500px;
}

/* Skip rendering off-screen content */
.section {
    content-visibility: auto;
}
```

## 💡 Practical Examples

### Example 1: Neumorphism

```html
<!-- HTML Structure -->
<div class="neu-demo">
    <button class="neu-button">Neumorphic Button</button>
    <div class="neu-card">
        <h3>Neumorphic Card</h3>
        <p>Soft UI design with subtle shadows</p>
        <div class="neu-input-group">
            <input type="text" class="neu-input" placeholder="Enter text">
            <button class="neu-icon-button">→</button>
        </div>
    </div>
    <div class="neu-toggle">
        <input type="checkbox" id="neu-switch">
        <label for="neu-switch"></label>
    </div>
</div>
```

```css
.neu-demo {
    background: #e0e5ec;
    padding: 60px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    min-height: 400px;
}

/* Neumorphic Button */
.neu-button {
    background: #e0e5ec;
    color: #333;
    border-radius: 12px;
    box-shadow:
        12px 12px 16px #a3b1c6,
        -12px -12px 16px #ffffff;
    padding: 20px 40px;
    border: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
}

.neu-button:hover {
    box-shadow:
        14px 14px 18px #a3b1c6,
        -14px -14px 18px #ffffff;
}

.neu-button:active {
    box-shadow:
        inset 6px 6px 10px #a3b1c6,
        inset -6px -6px 10px #ffffff;
}

/* Neumorphic Card */
.neu-card {
    background: #e0e5ec;
    border-radius: 20px;
    box-shadow:
        15px 15px 30px #a3b1c6,
        -15px -15px 30px #ffffff;
    padding: 30px;
    max-width: 400px;
    width: 100%;
}

.neu-card h3 {
    margin: 0 0 10px 0;
    color: #333;
}

.neu-card p {
    margin: 0 0 20px 0;
    color: #666;
}

/* Neumorphic Input Group */
.neu-input-group {
    display: flex;
    gap: 10px;
}

.neu-input {
    flex: 1;
    background: #e0e5ec;
    border: none;
    border-radius: 10px;
    padding: 12px 16px;
    box-shadow:
        inset 4px 4px 8px #a3b1c6,
        inset -4px -4px 8px #ffffff;
    outline: none;
    color: #333;
    font-size: 14px;
}

.neu-input::placeholder {
    color: #999;
}

.neu-icon-button {
    background: #e0e5ec;
    border: none;
    border-radius: 10px;
    width: 50px;
    box-shadow:
        8px 8px 12px #a3b1c6,
        -8px -8px 12px #ffffff;
    cursor: pointer;
    font-size: 20px;
    transition: all 0.2s ease;
}

.neu-icon-button:active {
    box-shadow:
        inset 4px 4px 8px #a3b1c6,
        inset -4px -4px 8px #ffffff;
}

/* Neumorphic Toggle */
.neu-toggle {
    position: relative;
}

.neu-toggle input {
    display: none;
}

.neu-toggle label {
    display: block;
    width: 80px;
    height: 40px;
    background: #e0e5ec;
    border-radius: 20px;
    box-shadow:
        inset 4px 4px 8px #a3b1c6,
        inset -4px -4px 8px #ffffff;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
}

.neu-toggle label::after {
    content: '';
    position: absolute;
    width: 32px;
    height: 32px;
    background: #e0e5ec;
    border-radius: 50%;
    top: 4px;
    left: 4px;
    box-shadow:
        4px 4px 8px #a3b1c6,
        -4px -4px 8px #ffffff;
    transition: all 0.3s ease;
}

.neu-toggle input:checked + label::after {
    left: 44px;
}

.neu-toggle input:checked + label {
    box-shadow:
        inset 4px 4px 8px #a3b1c6,
        inset -4px -4px 8px #ffffff;
}
```

### Example 2: Glassmorphism

```html
<!-- HTML Structure -->
<div class="glass-demo">
    <div class="glass-card">
        <div class="glass-icon">✨</div>
        <h3>Glassmorphism</h3>
        <p>Modern frosted glass effect with backdrop blur and transparency.</p>
        <button class="glass-button">Learn More</button>
    </div>

    <div class="glass-card glass-card-dark">
        <div class="glass-icon">🎨</div>
        <h3>Dark Variant</h3>
        <p>Works beautifully on both light and dark backgrounds.</p>
        <button class="glass-button">Explore</button>
    </div>

    <div class="glass-navbar">
        <div class="glass-brand">Brand</div>
        <nav class="glass-nav">
            <a href="#">Home</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
        </nav>
    </div>
</div>
```

```css
.glass-demo {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 60px 40px;
    min-height: 600px;
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    align-items: flex-start;
    justify-content: center;
    position: relative;
}

/* Glassmorphism Card */
.glass-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px) saturate(180%);
    -webkit-backdrop-filter: blur(10px) saturate(180%);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    padding: 2rem;
    max-width: 300px;
    width: 100%;
    color: white;
}

.glass-icon {
    font-size: 48px;
    margin-bottom: 15px;
}

.glass-card h3 {
    margin: 0 0 15px 0;
    font-size: 24px;
}

.glass-card p {
    margin: 0 0 20px 0;
    line-height: 1.6;
    opacity: 0.9;
}

/* Dark variant */
.glass-card-dark {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Glass Button */
.glass-button {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease;
}

.glass-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
}

/* Glassmorphic Navbar */
.glass-navbar {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(15px) saturate(180%);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 15px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.glass-brand {
    color: white;
    font-size: 20px;
    font-weight: bold;
}

.glass-nav {
    display: flex;
    gap: 25px;
}

.glass-nav a {
    color: white;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.3s ease;
}

.glass-nav a:hover {
    opacity: 0.7;
}
```

### Example 3: Text Gradient

```html
<!-- HTML Structure -->
<div class="text-gradient-demo">
    <h1 class="gradient-text gradient-1">Gradient Text Effect</h1>
    <h2 class="gradient-text gradient-2">Beautiful Typography</h2>
    <h3 class="gradient-text gradient-3">Modern Design</h3>

    <div class="gradient-card">
        <h2 class="gradient-heading">Premium Service</h2>
        <p>Experience the best with our advanced features and stunning visual effects.</p>
        <button class="gradient-button">Get Started</button>
    </div>
</div>
```

```css
.text-gradient-demo {
    background: #1a1a1a;
    padding: 60px 40px;
    min-height: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
}

/* Base gradient text */
.gradient-text {
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: bold;
    text-align: center;
    margin: 0;
}

/* Gradient variation 1 - Blue to green to red */
.gradient-1 {
    background: linear-gradient(45deg, #3498db, #2ecc71, #e74c3c);
    font-size: clamp(2rem, 5vw, 3.5rem);
}

/* Gradient variation 2 - Purple to pink */
.gradient-2 {
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    font-size: clamp(1.5rem, 4vw, 2.5rem);
}

/* Gradient variation 3 - Gold to orange */
.gradient-3 {
    background: linear-gradient(135deg, #f39c12, #e74c3c, #c0392b);
    font-size: clamp(1.25rem, 3vw, 2rem);
}

/* Animated gradient text */
@keyframes gradient-shift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.gradient-heading {
    background: linear-gradient(
        90deg,
        #667eea,
        #764ba2,
        #f093fb,
        #4facfe
    );
    background-size: 300% 300%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-shift 3s ease infinite;
    font-size: 2rem;
    margin: 0 0 15px 0;
}

/* Gradient Card */
.gradient-card {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%);
    padding: 40px;
    border-radius: 16px;
    max-width: 500px;
    width: 100%;
    color: white;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.gradient-card p {
    margin: 0 0 25px 0;
    line-height: 1.6;
    opacity: 0.9;
}

/* Gradient Button */
.gradient-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 35px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.gradient-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.gradient-button:hover::before {
    opacity: 1;
}

.gradient-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}
```

### Example 4: Smooth Scrolling & Sticky Header

```css
html {
    scroll-behavior: smooth;
}

.header {
    position: sticky;
    top: 0;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 100;
    transition: box-shadow 0.3s ease;
}

.header.scrolled {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
```

### Example 5: CSS-only Tooltip

```css
[data-tooltip] {
    position: relative;
}

[data-tooltip]::before {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    padding: 8px 12px;
    background: #333;
    color: white;
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s, transform 0.3s;
}

[data-tooltip]::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #333;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
}

[data-tooltip]:hover::before,
[data-tooltip]:hover::after {
    opacity: 1;
    transform: translateX(-50%) translateY(-12px);
}

[data-tooltip]:hover::after {
    transform: translateX(-50%);
}
```

### Example 6: Dark Mode Toggle

```css
:root {
    --bg-color: #ffffff;
    --text-color: #333333;
    --card-bg: #f5f5f5;
}

[data-theme="dark"] {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
    --card-bg: #2a2a2a;
}

body {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
}

.card {
    background-color: var(--card-bg);
}

/* Respect system preference */
@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
        --card-bg: #2a2a2a;
    }
}
```

## 🎯 Common Interview Questions

### Q1: Explain CSS specificity and cascade

**Answer:**
Specificity determines which CSS rules apply:
1. Inline styles (1000)
2. IDs (100)
3. Classes, attributes, pseudo-classes (10)
4. Elements, pseudo-elements (1)

Cascade order:
1. Importance (!important)
2. Specificity
3. Source order (later rules win)

### Q2: What are CSS preprocessors and why use them?

**Answer:**
Preprocessors (Sass, Less, Stylus) extend CSS with features:
- Variables
- Nesting
- Mixins
- Functions
- Inheritance

Modern CSS has many of these features natively (variables, nesting in some browsers).

### Q3: What is CSS-in-JS?

**Answer:**
Writing CSS in JavaScript files (styled-components, Emotion):

**Pros:**
- Scoped styles
- Dynamic styling
- Type safety (TypeScript)
- No naming conflicts

**Cons:**
- Runtime overhead
- Bundle size
- No caching

## 🚨 Common Pitfalls

1. **Over-nesting selectors** (specificity wars)
2. **Not using CSS variables** for theming
3. **Ignoring browser support**
4. **Not using will-change properly**
5. **Animating expensive properties**

## 🎓 Best Practices

1. **Use CSS custom properties** for theming
2. **Follow a naming methodology** (BEM, SMACSS)
3. **Organize CSS logically** (variables, base, components)
4. **Use autoprefixer** for vendor prefixes
5. **Optimize for performance** (GPU-accelerated properties)
6. **Use modern CSS features** (Grid, Custom Properties, clamp)
7. **Test across browsers**
8. **Minify and bundle** for production

## 🔗 Related Topics

- [CSS Fundamentals](./02-css-fundamentals.md)
- [Flexbox](./03-flexbox.md)
- [Grid](./04-grid.md)
- [Animations](./06-css-animations.md)

---

[← Back to HTML & CSS](./README.md)
