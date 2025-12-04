# Responsive Design

Responsive design ensures your website works well on all devices - from mobile phones to large desktop monitors.

## 📚 Core Concepts

### 1. Viewport Meta Tag

```html
<!-- Essential for responsive design -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### 2. Media Queries

**Basic Syntax**
```css
/* Mobile first (min-width) */
.container {
    width: 100%;
}

@media (min-width: 768px) {
    .container {
        width: 750px;
    }
}

@media (min-width: 1024px) {
    .container {
        width: 980px;
    }
}

/* Desktop first (max-width) */
.container {
    width: 1200px;
}

@media (max-width: 1024px) {
    .container {
        width: 100%;
    }
}
```

**Common Breakpoints**
```css
/* Extra small devices (phones, 600px and down) */
@media only screen and (max-width: 600px) {...}

/* Small devices (portrait tablets and large phones, 600px and up) */
@media only screen and (min-width: 600px) {...}

/* Medium devices (landscape tablets, 768px and up) */
@media only screen and (min-width: 768px) {...}

/* Large devices (laptops/desktops, 992px and up) */
@media only screen and (min-width: 992px) {...}

/* Extra large devices (large laptops and desktops, 1200px and up) */
@media only screen and (min-width: 1200px) {...}
```

**Media Features**
```css
/* Width and height */
@media (min-width: 768px) and (max-width: 1024px) {}

/* Orientation */
@media (orientation: portrait) {}
@media (orientation: landscape) {}

/* Resolution */
@media (min-resolution: 192dpi) {}

/* Hover capability */
@media (hover: hover) {
    .button:hover {
        background: blue;
    }
}

/* Pointer type */
@media (pointer: coarse) {
    /* Touch devices - make buttons larger */
    button {
        min-height: 44px;
    }
}

/* Prefers color scheme */
@media (prefers-color-scheme: dark) {
    body {
        background: #1a1a1a;
        color: #ffffff;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    * {
        animation: none !important;
        transition: none !important;
    }
}
```

### 3. Fluid Layouts

**Relative Units**
```css
.container {
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
}

.column {
    width: 50%; /* Percentage */
    padding: 2rem; /* rem */
}

.text {
    font-size: clamp(1rem, 2.5vw, 2rem); /* Fluid typography */
}
```

**CSS Grid Responsive**
```css
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}
```

**Flexbox Responsive**
```css
.flex-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.flex-item {
    flex: 1 1 300px; /* grow shrink basis */
}
```

### 4. Responsive Images

**Basic Responsive Image**
```css
img {
    max-width: 100%;
    height: auto;
}
```

**Picture Element**
```html
<picture>
    <source media="(min-width: 1200px)" srcset="large.jpg">
    <source media="(min-width: 768px)" srcset="medium.jpg">
    <img src="small.jpg" alt="Responsive image">
</picture>
```

**Srcset**
```html
<!-- Responsive images based on screen density -->
<img
    src="image-1x.jpg"
    srcset="image-1x.jpg 1x, image-2x.jpg 2x, image-3x.jpg 3x"
    alt="High DPI image">

<!-- Responsive images based on viewport width -->
<img
    src="small.jpg"
    srcset="small.jpg 400w, medium.jpg 800w, large.jpg 1200w"
    sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
    alt="Responsive widths">
```

**Background Images**
```css
.hero {
    background-image: url('small.jpg');
}

@media (min-width: 768px) {
    .hero {
        background-image: url('medium.jpg');
    }
}

@media (min-width: 1200px) {
    .hero {
        background-image: url('large.jpg');
    }
}
```

### 5. Container Queries (Modern)

```css
.card-container {
    container-type: inline-size;
    container-name: card;
}

@container card (min-width: 400px) {
    .card {
        display: grid;
        grid-template-columns: 1fr 2fr;
    }
}
```

### 6. Mobile-First vs Desktop-First

**Mobile-First (Recommended)**
```css
/* Base styles for mobile */
.nav {
    flex-direction: column;
}

/* Enhance for larger screens */
@media (min-width: 768px) {
    .nav {
        flex-direction: row;
    }
}
```

**Desktop-First**
```css
/* Base styles for desktop */
.nav {
    flex-direction: row;
}

/* Override for smaller screens */
@media (max-width: 767px) {
    .nav {
        flex-direction: column;
    }
}
```

## 💡 Practical Examples

### Example 1: Responsive Navigation

```html
<nav class="navbar">
    <div class="logo">Logo</div>
    <button class="menu-toggle">☰</button>
    <ul class="nav-links">
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#contact">Contact</a></li>
    </ul>
</nav>
```

```css
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
}

.menu-toggle {
    display: none;
}

.nav-links {
    display: flex;
    gap: 2rem;
    list-style: none;
}

/* Mobile */
@media (max-width: 768px) {
    .menu-toggle {
        display: block;
    }

    .nav-links {
        display: none;
        flex-direction: column;
        width: 100%;
        position: absolute;
        top: 60px;
        left: 0;
        background: white;
    }

    .nav-links.active {
        display: flex;
    }
}
```

### Example 2: Responsive Card Grid

```html
<!-- HTML Structure -->
<div class="card-grid">
    <article class="card">
        <img src="image1.jpg" alt="Product 1">
        <div class="card-content">
            <h3>Product Title 1</h3>
            <p>Description of the product goes here.</p>
            <button class="card-button">Learn More</button>
        </div>
    </article>

    <article class="card">
        <img src="image2.jpg" alt="Product 2">
        <div class="card-content">
            <h3>Product Title 2</h3>
            <p>Description of the product goes here.</p>
            <button class="card-button">Learn More</button>
        </div>
    </article>

    <article class="card">
        <img src="image3.jpg" alt="Product 3">
        <div class="card-content">
            <h3>Product Title 3</h3>
            <p>Description of the product goes here.</p>
            <button class="card-button">Learn More</button>
        </div>
    </article>

    <article class="card">
        <img src="image4.jpg" alt="Product 4">
        <div class="card-content">
            <h3>Product Title 4</h3>
            <p>Description of the product goes here.</p>
            <button class="card-button">Learn More</button>
        </div>
    </article>
</div>
```

```css
/* Mobile-first base styles */
.card-grid {
    display: grid;
    /* Auto-fit creates as many columns as will fit
       minmax(280px, 1fr) = min 280px, max equal fraction */
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

.card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block; /* Removes bottom gap */
}

.card-content {
    padding: 1.5rem;
}

.card-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #333;
}

.card-content p {
    margin: 0 0 1rem 0;
    color: #666;
    line-height: 1.6;
}

.card-button {
    width: 100%;
    padding: 0.75rem;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s ease;
}

.card-button:hover {
    background-color: #2980b9;
}

/* Tablet and up */
@media (min-width: 768px) {
    .card-content h3 {
        font-size: 1.5rem;
    }
}

/* Mobile - single column, reduced padding */
@media (max-width: 600px) {
    .card-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
        gap: 1.5rem;
    }

    .card img {
        height: 250px; /* Taller images on mobile */
    }

    .card-content {
        padding: 1rem;
    }

    .card-content h3 {
        font-size: 1.125rem;
    }
}
```

### Example 3: Responsive Typography

```css
:root {
    --font-size-small: clamp(0.875rem, 1.5vw, 1rem);
    --font-size-base: clamp(1rem, 2vw, 1.125rem);
    --font-size-large: clamp(1.25rem, 3vw, 1.5rem);
    --font-size-xlarge: clamp(2rem, 5vw, 3rem);
}

body {
    font-size: var(--font-size-base);
    line-height: 1.6;
}

h1 {
    font-size: var(--font-size-xlarge);
    line-height: 1.2;
}

h2 {
    font-size: var(--font-size-large);
}

small {
    font-size: var(--font-size-small);
}
```

### Example 4: Responsive Dashboard

```html
<!-- HTML Structure -->
<div class="dashboard">
    <aside class="sidebar">
        <div class="sidebar-brand">Dashboard</div>
        <nav class="sidebar-nav">
            <a href="#" class="nav-item active">Dashboard</a>
            <a href="#" class="nav-item">Analytics</a>
            <a href="#" class="nav-item">Users</a>
            <a href="#" class="nav-item">Settings</a>
        </nav>
    </aside>

    <header class="header">
        <button class="menu-toggle">☰</button>
        <h1>Dashboard Title</h1>
        <div class="header-actions">
            <button class="notification-btn">🔔</button>
            <div class="user-profile">User</div>
        </div>
    </header>

    <main class="main">
        <div class="widget-grid">
            <div class="widget">Widget 1</div>
            <div class="widget">Widget 2</div>
            <div class="widget">Widget 3</div>
            <div class="widget">Widget 4</div>
        </div>
    </main>
</div>
```

```css
/* Desktop Layout */
.dashboard {
    display: grid;
    grid-template-columns: 250px 1fr;
    grid-template-rows: 60px 1fr;
    grid-template-areas:
        "sidebar header"
        "sidebar main";
    height: 100vh;
    gap: 0;
}

.sidebar {
    grid-area: sidebar;
    background-color: #2c3e50;
    color: white;
    padding: 20px;
    overflow-y: auto;
}

.sidebar-brand {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.nav-item {
    padding: 12px 16px;
    color: #ecf0f1;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.nav-item:hover,
.nav-item.active {
    background-color: rgba(255,255,255,0.1);
}

.header {
    grid-area: header;
    background-color: white;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 10;
}

.menu-toggle {
    display: none; /* Hidden on desktop */
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
}

.header h1 {
    font-size: 1.5rem;
    margin: 0;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.notification-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
}

.user-profile {
    width: 40px;
    height: 40px;
    background-color: #3498db;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.main {
    grid-area: main;
    background-color: #ecf0f1;
    padding: 20px;
    overflow-y: auto;
}

.widget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.widget {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    min-height: 200px;
}

/* Tablet - Collapse sidebar */
@media (max-width: 1024px) {
    .dashboard {
        grid-template-columns: 1fr;
        grid-template-rows: 60px auto 1fr;
        grid-template-areas:
            "header"
            "sidebar"
            "main";
    }

    .sidebar {
        height: auto;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
    }

    .sidebar.open {
        max-height: 400px; /* Adjust as needed */
    }

    .menu-toggle {
        display: block; /* Show hamburger menu */
    }

    .widget-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
}

/* Mobile - Stack everything */
@media (max-width: 640px) {
    .header h1 {
        font-size: 1.125rem;
    }

    .header-actions {
        gap: 0.5rem;
    }

    .main {
        padding: 15px;
    }

    .widget-grid {
        grid-template-columns: 1fr;
        gap: 15px;
    }

    .widget {
        min-height: 150px;
    }
}
```

## 🎯 Common Interview Questions

### Q1: What is mobile-first design and why use it?

**Answer:**
Mobile-first means designing for mobile devices first, then progressively enhancing for larger screens.

**Benefits:**
- Better performance on mobile (no unused CSS)
- Forces prioritization of content
- Easier to scale up than down
- Better for majority mobile users

### Q2: What are common responsive breakpoints?

**Answer:**
```css
/* Common breakpoints */
- 320px: Small phones
- 480px: Phones
- 768px: Tablets
- 1024px: Small laptops
- 1200px: Desktops
- 1440px+: Large screens
```

### Q3: How do you make images responsive?

**Answer:**
```css
/* Basic */
img {
    max-width: 100%;
    height: auto;
}

/* Advanced */
<picture>
    <source media="(min-width: 768px)" srcset="large.jpg">
    <img src="small.jpg" alt="Responsive">
</picture>
```

## 🚨 Common Pitfalls

1. **Forgetting viewport meta tag**
2. **Not testing on real devices**
3. **Fixed widths instead of percentages**
4. **Ignoring touch targets** (min 44x44px)
5. **Not considering landscape orientation**
6. **Too many breakpoints** (keep it simple)

## 🎓 Best Practices

1. **Use mobile-first approach**
2. **Test on real devices**, not just DevTools
3. **Use relative units** (rem, em, %)
4. **Touch targets min 44x44px**
5. **Optimize images** for different screens
6. **Use system fonts** for better performance
7. **Consider accessibility** (color contrast, font size)
8. **Test with slow network**

## 🔗 Related Topics

- [CSS Fundamentals](./02-css-fundamentals.md)
- [Flexbox](./03-flexbox.md)
- [Grid](./04-grid.md)

---

[← Back to HTML & CSS](./README.md)
