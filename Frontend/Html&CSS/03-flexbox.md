# Flexbox

## Concept

**Flexbox** (Flexible Box Layout) is a one-dimensional layout system designed for arranging items in rows or columns. It provides powerful alignment capabilities and space distribution between items in a container.

### Key Points
- One-dimensional layout (row or column)
- Container (parent) and items (children) have different properties
- Main axis and cross axis determine layout direction
- Excellent for component-level layouts
- Better browser support than Grid

---

## Example 1: Basic Flexbox Container

```html
<!-- HTML Structure -->
<div class="flex-container">
    <div class="flex-item">Item 1</div>
    <div class="flex-item">Item 2</div>
    <div class="flex-item">Item 3</div>
    <div class="flex-item">Item 4</div>
    <div class="flex-item">Item 5</div>
</div>
```

```css
/* Container properties */
.flex-container {
    display: flex; /* or inline-flex */

    /* Styling for visibility */
    background-color: #f0f0f0;
    padding: 20px;
    border: 2px solid #333;

    /* Direction - defines main axis */
    flex-direction: row; /* row | row-reverse | column | column-reverse */

    /* Wrapping - single line vs multi-line */
    flex-wrap: nowrap; /* nowrap | wrap | wrap-reverse */

    /* Shorthand for direction and wrap */
    flex-flow: row wrap;

    /* Main axis alignment - horizontal in row, vertical in column */
    justify-content: flex-start; /* flex-start | flex-end | center | space-between | space-around | space-evenly */

    /* Cross axis alignment - vertical in row, horizontal in column */
    align-items: stretch; /* stretch | flex-start | flex-end | center | baseline */

    /* Multi-line cross axis alignment (only with flex-wrap) */
    align-content: flex-start; /* Same values as justify-content */

    /* Gap between items (modern - preferred over margins) */
    gap: 10px; /* or row-gap, column-gap */
}

.flex-item {
    background-color: #3498db;
    color: white;
    padding: 20px;
    text-align: center;
    border-radius: 4px;
    min-width: 100px;
}
```

**Visual Examples of justify-content:**
```html
<!-- Try different values -->
<div class="flex-container" style="justify-content: flex-start;">
    <!-- Items at start -->
</div>

<div class="flex-container" style="justify-content: center;">
    <!-- Items centered -->
</div>

<div class="flex-container" style="justify-content: space-between;">
    <!-- Equal space between items, no space at edges -->
</div>

<div class="flex-container" style="justify-content: space-around;">
    <!-- Equal space around items, half space at edges -->
</div>

<div class="flex-container" style="justify-content: space-evenly;">
    <!-- Equal space everywhere including edges -->
</div>
```

---

## Example 2: Flex Item Properties

```html
<!-- HTML Structure -->
<div class="flex-demo">
    <div class="item item-grow-0">flex-grow: 0</div>
    <div class="item item-grow-1">flex-grow: 1</div>
    <div class="item item-grow-2">flex-grow: 2</div>
</div>

<div class="flex-demo">
    <div class="item item-basis">flex-basis: 200px</div>
    <div class="item item-flex-1">flex: 1</div>
    <div class="item item-flex-2">flex: 2</div>
</div>

<div class="flex-demo">
    <div class="item item-order-3" style="order: 3">Order: 3</div>
    <div class="item item-order-1" style="order: 1">Order: 1</div>
    <div class="item item-order-2" style="order: 2">Order: 2</div>
</div>
```

```css
.flex-demo {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    padding: 10px;
    background-color: #f5f5f5;
    border: 2px solid #ddd;
}

.item {
    padding: 20px;
    background-color: #3498db;
    color: white;
    text-align: center;
    border-radius: 4px;
}

/* Growth factor - how much item grows relative to others */
.item-grow-0 {
    flex-grow: 0; /* Doesn't grow, stays at content size */
}

.item-grow-1 {
    flex-grow: 1; /* Grows 1x */
    background-color: #2ecc71;
}

.item-grow-2 {
    flex-grow: 2; /* Grows 2x (twice as much as grow-1) */
    background-color: #e74c3c;
}

/* Shrink factor - how much item shrinks when space is limited */
.item-shrink {
    flex-shrink: 1; /* Default: can shrink */
}

.item-no-shrink {
    flex-shrink: 0; /* Won't shrink below its size */
}

/* Base size before growing/shrinking */
.item-basis {
    flex-basis: 200px; /* Starting width (in row direction) */
    background-color: #9b59b6;
}

/* Common flex shorthand values */
.item-flex-1 {
    flex: 1; /* Same as: flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
    /* Takes equal space with other flex: 1 items */
}

.item-flex-2 {
    flex: 2; /* Takes 2x space compared to flex: 1 */
    background-color: #e67e22;
}

.item-flex-auto {
    flex: auto; /* Same as: flex: 1 1 auto */
    /* Grows/shrinks, basis is content size */
}

.item-flex-none {
    flex: none; /* Same as: flex: 0 0 auto */
    /* Doesn't grow or shrink, stays at content size */
}

/* Override container's align-items for this item */
.item-align-start {
    align-self: flex-start; /* Align to start of cross axis */
}

.item-align-center {
    align-self: center; /* Center on cross axis */
}

.item-align-end {
    align-self: flex-end; /* Align to end of cross axis */
}

/* Change visual order (doesn't affect DOM or screen readers) */
.item-order-1 {
    order: 1; /* Lower numbers come first */
}

.item-order-2 {
    order: 2;
}

.item-order-3 {
    order: 3;
}
```

**Key Concepts:**
- **flex-grow**: How much extra space the item takes (relative to siblings)
- **flex-shrink**: How much the item shrinks when space is limited
- **flex-basis**: Initial size before growing/shrinking
- **flex**: Shorthand for grow, shrink, and basis
- **align-self**: Override container's align-items for specific item
- **order**: Visual reordering without changing HTML

---

## Example 3: Common Layout Patterns

```css
/* Pattern 1: Center Everything */
.center-container {
    display: flex;
    justify-content: center; /* Horizontal center */
    align-items: center; /* Vertical center */
    min-height: 100vh;
}

/* Pattern 2: Navigation Bar */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
}

.navbar-left {
    display: flex;
    gap: 1rem;
}

.navbar-right {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

/* Pattern 3: Card Layout */
.card {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.card-header {
    flex-shrink: 0; /* Don't shrink */
}

.card-body {
    flex-grow: 1; /* Take remaining space */
    overflow: auto;
}

.card-footer {
    flex-shrink: 0;
}

/* Pattern 4: Equal Width Columns */
.equal-columns {
    display: flex;
    gap: 1rem;
}

.column {
    flex: 1; /* Each column takes equal space */
}

/* Pattern 5: Sidebar Layout */
.layout {
    display: flex;
    min-height: 100vh;
}

.sidebar {
    flex: 0 0 250px; /* Fixed width, don't grow or shrink */
}

.main-content {
    flex: 1; /* Take remaining space */
}

/* Pattern 6: Responsive Grid Alternative */
.flex-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}

.flex-grid-item {
    flex: 1 1 300px; /* Grow, shrink, min 300px */
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting flex-wrap

```css
/* PROBLEM - Items overflow container */
.container-bad {
    display: flex;
    /* No flex-wrap - items shrink infinitely */
}

/* SOLUTION */
.container-good {
    display: flex;
    flex-wrap: wrap; /* Items wrap to next line */
}
```

### Pitfall 2: Misunderstanding flex-basis

```css
/* flex-basis vs width */
.item {
    width: 200px; /* Preference, can be overridden */
    flex-basis: 200px; /* Starting point for flex calculation */
}

/* With flex-shrink: 1, item can shrink below flex-basis */
.shrinkable {
    flex-basis: 200px;
    flex-shrink: 1; /* Can shrink below 200px */
}

/* With flex-shrink: 0, item won't shrink below flex-basis */
.fixed {
    flex-basis: 200px;
    flex-shrink: 0; /* Won't shrink below 200px */
}
```

### Pitfall 3: Min-width and Flex Items

```css
/* PROBLEM - Flex item doesn't shrink */
.flex-item {
    flex: 1;
    min-width: auto; /* Default, prevents shrinking */
}

.flex-item img {
    width: 100%;
    /* Image prevents parent from shrinking! */
}

/* SOLUTION */
.flex-item {
    flex: 1;
    min-width: 0; /* Allow shrinking below content size */
}

.flex-item img {
    max-width: 100%;
    height: auto;
}
```

---

## Best Practices

### 1. Use gap Instead of Margins

```css
/* Old way */
.container-old {
    display: flex;
}

.container-old > * {
    margin-right: 1rem;
}

.container-old > *:last-child {
    margin-right: 0;
}

/* Modern way */
.container-modern {
    display: flex;
    gap: 1rem; /* Much cleaner! */
}
```

### 2. Use Flex Shorthand

```css
/* Less maintainable */
.item-verbose {
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0;
}

/* Better */
.item-shorthand {
    flex: 1; /* Same as above */
}
```

### 3. Responsive Flexbox

```css
/* Mobile-first approach */
.container {
    display: flex;
    flex-direction: column; /* Stack on mobile */
    gap: 1rem;
}

@media (min-width: 768px) {
    .container {
        flex-direction: row; /* Side by side on desktop */
    }
}
```

---

## Real-world Scenarios

### Scenario 1: Responsive Navigation

```html
<nav class="navbar">
    <div class="brand">Logo</div>
    <ul class="nav-links">
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Contact</a></li>
    </ul>
    <button class="menu-toggle">Menu</button>
</nav>
```

```css
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #333;
    color: white;
}

.nav-links {
    display: none; /* Hidden on mobile */
    list-style: none;
    gap: 2rem;
}

.menu-toggle {
    display: block;
}

@media (min-width: 768px) {
    .nav-links {
        display: flex; /* Show on desktop */
    }

    .menu-toggle {
        display: none; /* Hide toggle */
    }
}
```

### Scenario 2: Holy Grail Layout

```html
<div class="holy-grail">
    <header class="header">Header</header>
    <div class="content-wrapper">
        <aside class="sidebar-left">Left Sidebar</aside>
        <main class="main">Main Content</main>
        <aside class="sidebar-right">Right Sidebar</aside>
    </div>
    <footer class="footer">Footer</footer>
</div>
```

```css
.holy-grail {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.header,
.footer {
    flex-shrink: 0;
    padding: 1rem;
    background: #333;
    color: white;
}

.content-wrapper {
    display: flex;
    flex: 1;
}

.main {
    flex: 1;
    padding: 1rem;
}

.sidebar-left,
.sidebar-right {
    flex: 0 0 200px;
    padding: 1rem;
    background: #f5f5f5;
}

/* Responsive */
@media (max-width: 768px) {
    .content-wrapper {
        flex-direction: column;
    }

    .sidebar-left,
    .sidebar-right {
        flex: 0 0 auto;
    }
}
```

### Scenario 3: Card Grid

```html
<div class="card-grid">
    <div class="card">Card 1</div>
    <div class="card">Card 2</div>
    <div class="card">Card 3</div>
    <div class="card">Card 4</div>
</div>
```

```css
.card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
}

.card {
    /* Grow, shrink, min 250px base */
    flex: 1 1 calc(33.333% - 1rem);
    min-width: 250px;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 2 columns on tablet */
@media (max-width: 1024px) {
    .card {
        flex: 1 1 calc(50% - 1rem);
    }
}

/* 1 column on mobile */
@media (max-width: 640px) {
    .card {
        flex: 1 1 100%;
    }
}
```

---

## External Resources

- [CSS-Tricks: A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [MDN: Flexbox](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Flexbox)
- [Flexbox Froggy](https://flexboxfroggy.com/) - Interactive game
- [Flexbox Defense](http://www.flexboxdefense.com/) - Tower defense game

---

[← Back to HTML & CSS](./README.md) | [Next: Grid →](./04-grid.md)
