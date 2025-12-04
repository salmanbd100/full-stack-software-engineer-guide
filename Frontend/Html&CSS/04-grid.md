# CSS Grid

CSS Grid is a powerful two-dimensional layout system that allows you to create complex layouts with ease.

## 📚 Core Concepts

### 1. Grid Container

```html
<!-- HTML Structure -->
<div class="grid-container">
    <div class="grid-item">1</div>
    <div class="grid-item">2</div>
    <div class="grid-item">3</div>
    <div class="grid-item">4</div>
    <div class="grid-item">5</div>
    <div class="grid-item">6</div>
</div>
```

```css
.grid-container {
    display: grid; /* or inline-grid */

    /* Styling for visibility */
    background-color: #f0f0f0;
    padding: 20px;
    border: 2px solid #333;

    /* Define columns - different ways */
    grid-template-columns: 200px 200px 200px; /* 3 fixed columns */
    grid-template-columns: 1fr 1fr 1fr; /* 3 equal flexible columns */
    grid-template-columns: 1fr 2fr 1fr; /* Middle column is 2x wider */
    grid-template-columns: repeat(3, 1fr); /* Shorthand for 3 equal columns */
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive! */

    /* Define rows */
    grid-template-rows: 100px 200px 100px; /* 3 fixed rows */
    grid-template-rows: auto 1fr auto; /* Header (auto), content (flexible), footer (auto) */

    /* Gap between cells (preferred over margins) */
    gap: 20px; /* Both row and column gap */
    gap: 20px 10px; /* row-gap column-gap separately */
    row-gap: 20px; /* Just row gap */
    column-gap: 10px; /* Just column gap */
}

.grid-item {
    background-color: #3498db;
    color: white;
    padding: 20px;
    text-align: center;
    border-radius: 4px;
    font-size: 24px;
}
```

**fr Unit Explained:**
```html
<div class="grid-demo-fr">
    <div class="item">1fr</div>
    <div class="item">2fr</div>
    <div class="item">1fr</div>
</div>
```

```css
.grid-demo-fr {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    /* If container is 400px wide:
       Column 1: 100px (1/4 of space)
       Column 2: 200px (2/4 of space)
       Column 3: 100px (1/4 of space) */
    gap: 10px;
    background-color: #f5f5f5;
    padding: 10px;
}

.item {
    background-color: #2ecc71;
    padding: 20px;
    text-align: center;
}
```

### 2. Grid Items

```html
<!-- HTML Structure -->
<div class="grid-span-demo">
    <div class="item item-1">Item 1 (spans 2 columns)</div>
    <div class="item item-2">Item 2</div>
    <div class="item item-3">Item 3 (spans 2 rows)</div>
    <div class="item item-4">Item 4</div>
    <div class="item item-5">Item 5</div>
</div>
```

```css
.grid-span-demo {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 100px);
    gap: 10px;
    background-color: #f5f5f5;
    padding: 10px;
}

.item {
    background-color: #3498db;
    color: white;
    padding: 20px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Span multiple columns */
.item-1 {
    grid-column: 1 / 3; /* Start at line 1, end at line 3 (spans 2 columns) */
    /* Or: grid-column: 1 / span 2; */
    /* Or: grid-column-start: 1; grid-column-end: 3; */
    background-color: #e74c3c;
}

.item-3 {
    /* Span multiple rows */
    grid-row: 2 / 4; /* Start at line 2, end at line 4 (spans 2 rows) */
    /* Or: grid-row: 2 / span 2; */
    background-color: #2ecc71;
}

/* Full width item using negative line numbers */
.item-full-width {
    grid-column: 1 / -1; /* From first to last column */
    background-color: #9b59b6;
}

/* Shorthand: grid-area */
.item-large {
    /* row-start / col-start / row-end / col-end */
    grid-area: 1 / 1 / 3 / 3; /* Spans 2 rows and 2 columns */
    background-color: #f39c12;
}
```

**Visual Grid Lines:**
```
     1      2      3      4
   ┌──────┬──────┬──────┐
 1 │      │      │      │
   ├──────┼──────┼──────┤
 2 │      │      │      │
   ├──────┼──────┼──────┤
 3 │      │      │      │
   └──────┴──────┴──────┘
 4

grid-column: 1 / 3  →  Spans columns from line 1 to 3
grid-row: 2 / 4     →  Spans rows from line 2 to 4
```

### 3. Named Grid Lines

```css
.container {
    grid-template-columns: [start] 1fr [middle] 1fr [end];
    grid-template-rows: [header-start] auto [header-end content-start] 1fr [content-end footer-start] auto [footer-end];
}

.item {
    grid-column: start / middle;
    grid-row: header-start / header-end;
}
```

### 4. Grid Template Areas

```html
<!-- HTML Structure -->
<div class="layout-container">
    <header class="header">Header</header>
    <nav class="sidebar">Sidebar</nav>
    <main class="main">Main Content</main>
    <aside class="aside">Aside</aside>
    <footer class="footer">Footer</footer>
</div>
```

```css
.layout-container {
    display: grid;
    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: auto 1fr auto;

    /* Define named grid areas - visual layout representation */
    grid-template-areas:
        "header header header"    /* Row 1: header spans all 3 columns */
        "sidebar main aside"      /* Row 2: 3 separate columns */
        "footer footer footer";   /* Row 3: footer spans all 3 columns */

    gap: 20px;
    min-height: 100vh;
    background-color: #f0f0f0;
    padding: 20px;
}

/* Assign elements to named areas */
.header {
    grid-area: header;
    background-color: #3498db;
    padding: 20px;
    color: white;
    text-align: center;
}

.sidebar {
    grid-area: sidebar;
    background-color: #2ecc71;
    padding: 20px;
}

.main {
    grid-area: main;
    background-color: #ecf0f1;
    padding: 20px;
}

.aside {
    grid-area: aside;
    background-color: #f39c12;
    padding: 20px;
}

.footer {
    grid-area: footer;
    background-color: #e74c3c;
    padding: 20px;
    color: white;
    text-align: center;
}

/* Responsive: Stack on mobile */
@media (max-width: 768px) {
    .layout-container {
        grid-template-columns: 1fr;
        grid-template-areas:
            "header"
            "sidebar"
            "main"
            "aside"
            "footer";
    }
}
```

**Visual Representation:**
```
┌─────────────────────────────────┐
│          header                 │
├──────────┬──────────────┬───────┤
│          │              │       │
│ sidebar  │     main     │ aside │
│          │              │       │
├──────────┴──────────────┴───────┤
│          footer                 │
└─────────────────────────────────┘
```

### 5. Alignment

**Align Items (vertical)**
```css
.container {
    align-items: start;    /* Top */
    align-items: center;   /* Middle */
    align-items: end;      /* Bottom */
    align-items: stretch;  /* Default: Fill height */
}

.item {
    align-self: center; /* Override for specific item */
}
```

**Justify Items (horizontal)**
```css
.container {
    justify-items: start;   /* Left */
    justify-items: center;  /* Center */
    justify-items: end;     /* Right */
    justify-items: stretch; /* Default: Fill width */
}

.item {
    justify-self: center; /* Override for specific item */
}
```

**Align Content (whole grid vertical)**
```css
.container {
    height: 600px;
    align-content: start;
    align-content: center;
    align-content: end;
    align-content: space-between;
    align-content: space-around;
    align-content: space-evenly;
}
```

**Justify Content (whole grid horizontal)**
```css
.container {
    width: 1200px;
    justify-content: start;
    justify-content: center;
    justify-content: end;
    justify-content: space-between;
    justify-content: space-around;
    justify-content: space-evenly;
}
```

**Shorthand**
```css
.container {
    place-items: center;  /* align-items justify-items */
    place-content: center; /* align-content justify-content */
}

.item {
    place-self: center; /* align-self justify-self */
}
```

### 6. Auto-fit vs Auto-fill

```css
/* auto-fit: Collapse empty tracks */
.container-fit {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    /* Items expand to fill space */
}

/* auto-fill: Keep empty tracks */
.container-fill {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    /* Empty columns remain */
}
```

### 7. Implicit vs Explicit Grid

```css
.container {
    /* Explicit grid (defined by you) */
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 100px 200px;

    /* Implicit grid (auto-created for extra items) */
    grid-auto-rows: 150px; /* Height of auto-created rows */
    grid-auto-columns: 1fr; /* Width of auto-created columns */

    /* Auto flow direction */
    grid-auto-flow: row;    /* Default: add rows */
    grid-auto-flow: column; /* Add columns */
    grid-auto-flow: dense;  /* Fill gaps */
}
```

## 🎯 Common Patterns

### Pattern 1: Holy Grail Layout

```css
.container {
    display: grid;
    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
        "header header header"
        "nav content aside"
        "footer footer footer";
    min-height: 100vh;
    gap: 20px;
}

.header { grid-area: header; }
.nav { grid-area: nav; }
.content { grid-area: content; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }

/* Responsive */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;
        grid-template-areas:
            "header"
            "nav"
            "content"
            "aside"
            "footer";
    }
}
```

### Pattern 2: Card Grid (Responsive)

```css
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    padding: 20px;
}

.card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### Pattern 3: Image Gallery

```css
.gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    grid-auto-rows: 200px;
    gap: 10px;
}

.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Feature image (spans 2x2) */
.gallery-item.featured {
    grid-column: span 2;
    grid-row: span 2;
}
```

### Pattern 4: Sidebar Layout

```css
.container {
    display: grid;
    grid-template-columns: minmax(200px, 250px) 1fr;
    gap: 20px;
    min-height: 100vh;
}

.sidebar {
    background: #f0f0f0;
    padding: 20px;
}

.main {
    padding: 20px;
}

/* Responsive: Stack on small screens */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;
    }
}
```

### Pattern 5: Dashboard Grid

```css
.dashboard {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-auto-rows: minmax(100px, auto);
    gap: 20px;
}

.widget-large {
    grid-column: span 8;
    grid-row: span 2;
}

.widget-medium {
    grid-column: span 4;
}

.widget-small {
    grid-column: span 4;
}

@media (max-width: 768px) {
    .widget-large,
    .widget-medium,
    .widget-small {
        grid-column: span 12;
    }
}
```

## 💡 Practical Examples

### Example 1: Magazine Layout

```html
<div class="magazine">
    <article class="feature">Feature Article</article>
    <article class="story">Story 1</article>
    <article class="story">Story 2</article>
    <article class="story">Story 3</article>
    <aside class="ad">Advertisement</aside>
</div>
```

```css
.magazine {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: 200px;
    gap: 20px;
}

.feature {
    grid-column: 1 / 3;
    grid-row: 1 / 3;
    background: #3498db;
}

.story:nth-child(2) {
    grid-column: 3 / 5;
}

.story:nth-child(3) {
    grid-column: 3 / 4;
}

.story:nth-child(4) {
    grid-column: 4 / 5;
}

.ad {
    grid-column: 1 / 3;
    grid-row: 3 / 4;
    background: #95a5a6;
}
```

### Example 2: Form Grid

```html
<form class="form-grid">
    <div class="field full-width">
        <label>Full Name</label>
        <input type="text">
    </div>
    <div class="field">
        <label>Email</label>
        <input type="email">
    </div>
    <div class="field">
        <label>Phone</label>
        <input type="tel">
    </div>
    <div class="field full-width">
        <label>Address</label>
        <textarea></textarea>
    </div>
    <button class="submit">Submit</button>
</form>
```

```css
.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    max-width: 600px;
}

.field.full-width {
    grid-column: 1 / -1;
}

.submit {
    grid-column: 1 / -1;
    justify-self: end;
}

@media (max-width: 600px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
}
```

### Example 3: Pinterest-style Masonry

```css
.masonry {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    grid-auto-rows: 10px; /* Small row height for granular control */
    gap: 20px;
}

.masonry-item {
    /* Each item spans multiple rows based on content height */
    /* JavaScript calculates: item.style.gridRowEnd = span ${Math.ceil(height / 10)} */
}

.masonry-item img {
    width: 100%;
    display: block;
}
```

## 🎯 Common Interview Questions

### Q1: Grid vs Flexbox - When to use which?

**Answer:**
- **Grid**: Two-dimensional layouts (rows AND columns), complex layouts
- **Flexbox**: One-dimensional layouts (row OR column), simpler alignments

```css
/* Grid: Complex layout */
.dashboard {
    display: grid;
    grid-template-columns: 200px 1fr;
    grid-template-rows: auto 1fr auto;
}

/* Flexbox: Simple alignment */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

### Q2: Explain `fr` unit

**Answer:**
`fr` (fraction) represents a fraction of available space in the grid container.

```css
.container {
    grid-template-columns: 1fr 2fr 1fr;
    /* If container is 800px:
       Column 1: 200px (1/4)
       Column 2: 400px (2/4)
       Column 3: 200px (1/4) */
}
```

### Q3: What's the difference between auto-fit and auto-fill?

**Answer:**
- **auto-fill**: Creates as many tracks as fit, keeps empty ones
- **auto-fit**: Creates as many tracks as fit, collapses empty ones (items expand)

```css
/* auto-fill: Empty columns remain */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

/* auto-fit: Items expand to fill space */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
```

## 🚨 Common Pitfalls

1. **Forgetting `display: grid`** on container
2. **Using grid on items instead of container**
3. **Confusing grid line numbers** (start at 1, not 0)
4. **Not accounting for gaps** in calculations
5. **Overcomplicating with unnecessary nesting**

## 🎓 Best Practices

1. **Use `fr` units** for flexible columns
2. **Use `minmax()`** for responsive grids
3. **Name grid areas** for complex layouts
4. **Use `auto-fit`/`auto-fill`** for responsive cards
5. **Combine Grid + Flexbox** (Grid for layout, Flex for components)
6. **Test in different viewport sizes**
7. **Use DevTools Grid Inspector**

## 🔗 Related Topics

- [Flexbox](./03-flexbox.md)
- [Responsive Design](./05-responsive-design.md)
- [CSS Fundamentals](./02-css-fundamentals.md)

---

[← Back to HTML & CSS](./README.md) | [Next: Responsive Design →](./05-responsive-design.md)
