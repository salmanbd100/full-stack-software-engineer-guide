# CSS Methodologies

## Overview

CSS methodologies are systematic approaches to organizing and writing CSS code to improve maintainability, scalability, and developer efficiency. As applications grow, unstructured CSS becomes increasingly difficult to manage, leading to specificity conflicts, unintended side effects, and difficulty in reusing styles.

A good CSS methodology provides:
- **Naming conventions** for predictable class names
- **Organization principles** for file/folder structure
- **Scoping mechanisms** to prevent conflicts
- **Reusability patterns** for component-based development
- **Specificity management** to avoid the specificity wars

---

## Table of Contents
1. [BEM (Block Element Modifier)](#bem-block-element-modifier)
2. [SMACSS (Scalable and Modular CSS)](#smacss-scalable-and-modular-css)
3. [ITCSS (Inverted Triangle CSS)](#itcss-inverted-triangle-css)
4. [OOCSS (Object-Oriented CSS)](#oocss-object-oriented-css)
5. [Methodology Comparison](#methodology-comparison)
6. [Interview Questions](#interview-questions)
7. [Real-World Examples](#real-world-examples)

---

## BEM (Block Element Modifier)

### Concept

**BEM** (Block Element Modifier) is a component-based methodology that provides a strict naming convention for CSS classes. It divides CSS classes into three parts: Blocks (components), Elements (parts of components), and Modifiers (variations).

### BEM Structure

The BEM naming pattern follows a simple Block__Element--Modifier format where double underscores separate blocks from elements, and double hyphens separate the modifier. This strict naming convention ensures predictable, self-documenting class names that clearly communicate the component hierarchy and variations.

```
Block__Element--Modifier
```

- **Block**: Standalone entity, independent component (e.g., `card`, `button`, `header`)
- **Element**: Part of a block, can't exist alone (e.g., `card__title`, `button__icon`)
- **Modifier**: Variation or state (e.g., `button--primary`, `card--featured`)

### BEM Naming Convention

Real-world examples demonstrate how BEM naming translates abstract concepts into practical CSS class names. Each class name immediately reveals whether it's an independent component, a component part, or a variation, making the codebase self-documenting.

```css
/* Block */
.card { }

/* Block + Element */
.card__title { }
.card__content { }
.card__footer { }

/* Block + Element + Modifier */
.card__title--large { }
.card--featured { }
.card__button--disabled { }

/* Block + Modifier (without element) */
.button { }
.button--primary { }
.button--secondary { }
.button--disabled { }
```

### BEM Example: Complete Button Component

A complete button component showcases how BEM handles variations and internal elements with consistent naming. This example demonstrates modifiers for different button styles and elements for icons and text within the button.

```html
<!-- HTML -->
<button class="button button--primary">
    <span class="button__icon">�</span>
    <span class="button__text">Click me</span>
</button>

<button class="button button--secondary button--disabled">
    <span class="button__text">Disabled</span>
</button>
```

```css
/* BEM Structure */

/* Block: Button */
.button {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
}

/* Element: Icon within button */
.button__icon {
    display: inline-block;
    margin-right: 8px;
    font-size: 16px;
}

/* Element: Text within button */
.button__text {
    display: inline-block;
}

/* Modifier: Primary variant */
.button--primary {
    background-color: #3498db;
    color: white;
    border-color: #2980b9;
}

.button--primary:hover {
    background-color: #2980b9;
}

/* Modifier: Secondary variant */
.button--secondary {
    background-color: transparent;
    color: #333;
    border-color: #333;
}

.button--secondary:hover {
    background-color: #f5f5f5;
}

/* Modifier: Disabled state */
.button--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}
```

### BEM Example: Card Component

Card components typically contain multiple nested elements and modifiers, illustrating BEM's strength in managing complex component structures. This example shows how to organize images, content sections, metadata, and actions within a cohesive BEM naming system.

```html
<!-- HTML -->
<article class="card card--featured">
    <img src="image.jpg" alt="Card image" class="card__image">

    <div class="card__content">
        <h2 class="card__title card__title--large">Card Title</h2>
        <p class="card__description">This is card description text.</p>

        <div class="card__meta">
            <span class="card__author">By John Doe</span>
            <span class="card__date">Dec 17, 2024</span>
        </div>
    </div>

    <footer class="card__footer">
        <button class="card__action">Read More</button>
    </footer>
</article>
```

```css
/* Card Component */

.card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease;
}

.card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card__image {
    display: block;
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.card__content {
    padding: 20px;
}

.card__title {
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.card__title--large {
    font-size: 24px;
    font-weight: 700;
}

.card__description {
    margin: 10px 0;
    color: #666;
    line-height: 1.6;
}

.card__meta {
    display: flex;
    gap: 20px;
    margin-top: 15px;
    font-size: 12px;
    color: #999;
}

.card__author {
    font-weight: 500;
}

.card__footer {
    padding: 15px 20px;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
}

.card__action {
    background: none;
    border: none;
    color: #3498db;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
}

.card__action:hover {
    text-decoration: underline;
}

.card--featured {
    border: 2px solid #f39c12;
    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.2);
}

.card--featured .card__title {
    color: #f39c12;
}
```

### BEM Benefits

1. **Clear naming convention**: Immediately understand component structure from class names
2. **Prevents specificity wars**: Flat specificity (all classes have same weight)
3. **Easy to scale**: Add new modifiers without breaking existing code
4. **Reusable components**: Elements and modifiers compose naturally
5. **Team adoption**: Quick learning curve for developers
6. **Debugging**: Easy to find CSS for specific component
7. **No nesting issues**: Class names are self-documenting

### BEM Drawbacks

1. **Verbose class names**: HTML can become cluttered with long class names
2. **Naming decisions**: Deciding what is a block, element, or modifier requires thought
3. **File organization**: Still requires additional structure (folders, prefixes)
4. **No built-in scoping**: Doesn't prevent class name collisions across projects
5. **Visual HTML clutter**: Too many classes can make HTML harder to read
6. **Limited features**: No variables, nesting, or other preprocessor features (without Sass)

### Common BEM Mistakes

Even with its simple rules, BEM can be misused, leading to confusing or overly complex class names. Understanding these common pitfalls helps teams maintain clean, consistent BEM implementations across large codebases.

```css
/* WRONG: Using more than two underscores */
.card__content__title { }

/* CORRECT: Use modifier for variations */
.card__title--large { }

/* WRONG: Naming element that doesn't exist in context */
.card__button-text { }

/* CORRECT: Keep modifiers at appropriate level */
.button--disabled { }

/* WRONG: Using BEM for everything */
.page__header__nav__item { }

/* CORRECT: Only use when component is independent */
.nav { }
.nav__item { }
.nav__item--active { }

/* WRONG: Mixing naming conventions */
.card_title { }  /* Single underscore */
.card__title { } /* Double underscore - correct */

/* WRONG: Overuse of modifiers */
.button--primary-large-disabled { }

/* CORRECT: Compose multiple modifiers */
.button--primary--large--disabled { }
/* Or better: use state classes */
.button.is-disabled { }
```

### BEM with Sass

BEM becomes more powerful with Sass nesting:

```scss
// Sass example
.card {
    background: white;
    border: 1px solid #e0e0e0;

    &__image {
        display: block;
        width: 100%;
    }

    &__title {
        font-size: 18px;

        &--large {
            font-size: 24px;
        }
    }

    &--featured {
        border: 2px solid #f39c12;

        .card__title {
            color: #f39c12;
        }
    }
}
```

---

## SMACSS (Scalable and Modular CSS)

### Concept

**SMACSS** (Scalable and Modular Architecture for CSS) organizes CSS into five categories: Base, Layout, Module, State, and Theme. This approach focuses on modularity and scalability by categorizing styles by their purpose.

### Five SMACSS Categories

#### 1. **Base**
Styles for HTML elements (resets, defaults). No classes or IDs.

```css
/* base.css */
html, body {
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
}

h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    line-height: 1.2;
}

a {
    color: #3498db;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

input, button, textarea, select {
    font-family: inherit;
    font-size: inherit;
}
```

#### 2. **Layout**
Major structural components (header, footer, sidebar, main content).

```css
/* layout.css */
.l-header {
    position: relative;
    z-index: 100;
    padding: 20px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.l-main {
    display: flex;
    gap: 20px;
    padding: 20px;
}

.l-sidebar {
    width: 250px;
    flex-shrink: 0;
}

.l-content {
    flex: 1;
    min-width: 0;
}

.l-footer {
    margin-top: 40px;
    padding: 20px;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
}
```

#### 3. **Module**
Reusable components (buttons, cards, navigation, modals).

```css
/* module.css */
.mod-button {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
}

.mod-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
}

.mod-nav {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
}

.mod-modal {
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
}
```

#### 4. **State**
Styles for component states (active, hidden, disabled).

```css
/* state.css */
.is-hidden {
    display: none !important;
}

.is-active {
    font-weight: bold;
}

.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}

.is-loading {
    opacity: 0.7;
    pointer-events: none;
}

.is-error {
    color: #e74c3c;
    border-color: #e74c3c;
}

.is-success {
    color: #27ae60;
    border-color: #27ae60;
}

.is-invalid {
    border-color: #e74c3c;
    background-color: #fadbd8;
}

.mod-button.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
```

#### 5. **Theme**
Styles for theming (colors, fonts, visual treatment).

```css
/* theme.css - Light theme */
.theme-light {
    background: white;
    color: #333;
}

.theme-light .mod-card {
    background: white;
    border-color: #e0e0e0;
}

.theme-light a {
    color: #3498db;
}

/* Dark theme */
.theme-dark {
    background: #1a1a1a;
    color: #fff;
}

.theme-dark .mod-card {
    background: #2a2a2a;
    border-color: #444;
}

.theme-dark a {
    color: #5dade2;
}
```

### SMACSS File Organization

A typical SMACSS file structure mirrors the five categories, making it easy to locate styles by their purpose. This organization scales well as the project grows, with each category containing multiple focused files.

```
css/
   base/
      reset.css
      typography.css
      forms.css
   layout/
      header.css
      footer.css
      sidebar.css
      main.css
   modules/
      button.css
      card.css
      navigation.css
      modal.css
      form-group.css
   state/
      states.css
   theme/
      light.css
      dark.css
   main.css (imports all)
```

### SMACSS Example: Complete Form Component

This form component demonstrates how SMACSS categories work together, combining layout, module, and state styles. Notice how layout classes handle structure, module classes define component appearance, and state classes manage dynamic behaviors.

```html
<!-- HTML -->
<form class="l-form">
    <div class="mod-form-group">
        <label for="email" class="mod-form-label">Email</label>
        <input
            type="email"
            id="email"
            class="mod-form-input is-invalid"
            placeholder="your@email.com"
        >
        <span class="mod-form-error">Invalid email format</span>
    </div>

    <div class="mod-form-group">
        <label for="password" class="mod-form-label">Password</label>
        <input
            type="password"
            id="password"
            class="mod-form-input"
            placeholder=""""""""""
        >
    </div>

    <button type="submit" class="mod-button is-loading">
        Signing In...
    </button>
</form>
```

```css
/* Layout */
.l-form {
    max-width: 400px;
    margin: 0 auto;
    padding: 30px;
}

/* Module: Form Group */
.mod-form-group {
    margin-bottom: 20px;
}

.mod-form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
}

.mod-form-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.mod-form-input:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.mod-form-error {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    color: #e74c3c;
}

.mod-form-error {
    display: none;
}

/* State: Invalid input */
.mod-form-input.is-invalid {
    border-color: #e74c3c;
    background-color: #fadbd8;
}

.mod-form-input.is-invalid ~ .mod-form-error {
    display: block;
}

/* Module: Button */
.mod-button {
    width: 100%;
    padding: 12px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s ease;
}

.mod-button:hover {
    background: #2980b9;
}

/* State: Loading */
.mod-button.is-loading {
    background: #95a5a6;
    cursor: wait;
    pointer-events: none;
}
```

### SMACSS Benefits

1. **Clear categorization**: Immediately know where each CSS rule belongs
2. **Reduced complexity**: Breaking CSS into logical sections makes it easier to manage
3. **Scalability**: Categories grow with the application
4. **Reusability**: Modules are self-contained and reusable
5. **Maintainability**: Easy to locate and modify specific styles
6. **State management**: Clear separation of static and dynamic styles
7. **Documentation**: Categories naturally document CSS intent

### SMACSS Drawbacks

1. **Naming conventions**: Prefixes (l-, mod-, is-) add verbosity
2. **Learning curve**: Developers need to understand five categories
3. **File organization**: Requires discipline in categorization
4. **Mixed concerns**: Base styles in HTML can be hard to override
5. **Theming complexity**: Theme category doesn't fully address dynamic theming
6. **No built-in scoping**: Global namespace still a problem with many files

---

## ITCSS (Inverted Triangle CSS)

### Concept

**ITCSS** (Inverted Triangle CSS) organizes CSS layers from generic (widest reach) to specific (narrowest reach), managing specificity and cascade intentionally. The inverted triangle shape represents how specificity increases as you move down the layers.

### ITCSS Layers (Top to Bottom)

The seven ITCSS layers create an intentional specificity gradient from generic to specific styles. Each layer builds upon the previous, ensuring CSS cascade and specificity work with you rather than against you.

```
1. Settings       �  Widest reach, lowest specificity
2. Tools
3. Generic
4. Elements
5. Objects
6. Components
7. Utilities      �  Narrowest reach, highest specificity
```

### Layer Details

Each ITCSS layer serves a specific purpose in the architecture, from configuration and tools to concrete styles and overrides. Understanding what belongs in each layer prevents specificity conflicts and makes the codebase predictable.

#### **1. Settings**
Variables, configuration (no CSS output, Sass variables only).

```scss
// settings.scss
$base-font-size: 14px;
$base-line-height: 1.6;
$base-spacing-unit: 8px;

$color-primary: #3498db;
$color-success: #27ae60;
$color-error: #e74c3c;
$color-warning: #f39c12;

$spacing-xs: $base-spacing-unit * 1;  // 8px
$spacing-sm: $base-spacing-unit * 2;  // 16px
$spacing-md: $base-spacing-unit * 3;  // 24px
$spacing-lg: $base-spacing-unit * 4;  // 32px

$breakpoint-small: 576px;
$breakpoint-medium: 768px;
$breakpoint-large: 992px;
```

#### **2. Tools**
Mixins, functions, utilities (no CSS output).

```scss
// tools.scss
@mixin respond-to($breakpoint) {
    @if $breakpoint == 'small' {
        @media (min-width: $breakpoint-small) { @content; }
    } @else if $breakpoint == 'medium' {
        @media (min-width: $breakpoint-medium) { @content; }
    } @else if $breakpoint == 'large' {
        @media (min-width: $breakpoint-large) { @content; }
    }
}

@mixin truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@mixin clearfix {
    &::after {
        content: '';
        display: table;
        clear: both;
    }
}
```

#### **3. Generic**
Reset, normalize, global styles.

```css
/* generic.css */
* {
    box-sizing: border-box;
}

html {
    font-size: 16px;
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
```

#### **4. Elements**
HTML element defaults (h1, a, button, etc).

```css
/* elements.css */
h1 {
    font-size: 32px;
    font-weight: 700;
}

h2 {
    font-size: 24px;
    font-weight: 600;
}

a {
    color: #3498db;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

button {
    padding: 10px 20px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
}

input,
textarea,
select {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
}
```

#### **5. Objects**
Non-cosmetic design patterns (layout patterns, containers).

```css
/* objects.css */
.o-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.o-layout {
    display: flex;
    gap: 20px;
}

.o-layout__item {
    flex: 1;
}

.o-list-reset {
    list-style: none;
    margin: 0;
    padding: 0;
}

.o-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
```

#### **6. Components**
Specific UI components (buttons, cards, navigation).

```css
/* components.css */
.c-button {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
}

.c-button--secondary {
    background: #95a5a6;
}

.c-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.c-nav {
    display: flex;
    align-items: center;
    gap: 20px;
}

.c-modal {
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
}
```

#### **7. Utilities**
Single-responsibility utilities (can use !important).

```css
/* utilities.css */
.u-text-center {
    text-align: center;
}

.u-text-bold {
    font-weight: bold;
}

.u-margin-top {
    margin-top: 20px !important;
}

.u-margin-bottom {
    margin-bottom: 20px !important;
}

.u-display-none {
    display: none !important;
}

.u-display-flex {
    display: flex !important;
}

.u-justify-center {
    justify-content: center !important;
}

.u-align-center {
    align-items: center !important;
}
```

### ITCSS File Structure

A well-organized ITCSS project uses numbered folders to enforce import order, ensuring layers are loaded in the correct sequence. This structure makes it impossible to accidentally violate the specificity cascade.

```
scss/
   1-settings/
      variables.scss
      config.scss
   2-tools/
      mixins.scss
      functions.scss
   3-generic/
      reset.scss
      normalize.scss
   4-elements/
      headings.scss
      links.scss
      buttons.scss
   5-objects/
      container.scss
      grid.scss
      list.scss
   6-components/
      button.scss
      card.scss
      navigation.scss
      modal.scss
   7-utilities/
      spacing.scss
      display.scss
      text.scss
   main.scss (imports in order)
```

### ITCSS Example: Complete Page

The main stylesheet demonstrates how to import ITCSS layers in the correct order, from settings through utilities. This import sequence is critical - changing the order would break the intended specificity cascade.

```scss
// main.scss - Importing in order
@import '1-settings/variables';
@import '1-settings/config';

@import '2-tools/mixins';
@import '2-tools/functions';

@import '3-generic/reset';
@import '3-generic/normalize';

@import '4-elements/headings';
@import '4-elements/links';
@import '4-elements/buttons';

@import '5-objects/container';
@import '5-objects/grid';

@import '6-components/button';
@import '6-components/card';
@import '6-components/navigation';

@import '7-utilities/spacing';
@import '7-utilities/display';
```

### ITCSS Benefits

1. **Specificity management**: Intentional increase from top to bottom
2. **Scalability**: Works for small to enterprise applications
3. **Maintainability**: Clear layer hierarchy prevents conflicts
4. **Reusability**: Objects are generic and composable
5. **Performance**: Utilities are optimizable
6. **Documentation**: Layer structure is self-documenting
7. **Flexibility**: Customizable for project needs

### ITCSS Drawbacks

1. **Complex structure**: Seven layers can feel excessive for small projects
2. **Steep learning curve**: Requires understanding layering philosophy
3. **File proliferation**: Can result in many small files
4. **Abstraction overhead**: Indirection between layers can be confusing
5. **Not a naming convention**: Doesn't provide rules like BEM
6. **Requires discipline**: Easy to misclassify styles

---

## OOCSS (Object-Oriented CSS)

### Concept

**OOCSS** (Object-Oriented CSS) treats reusable CSS as "objects" that can be combined to create designs. It emphasizes two main principles:
1. **Separation of structure and skin** - Structure (layout, dimensions) separate from presentation (colors, fonts)
2. **Separation of container and content** - Components shouldn't depend on parent context

### OOCSS Principles

OOCSS is built on two fundamental principles that maximize code reuse and minimize duplication. These principles challenge traditional CSS thinking by separating layout from aesthetics and components from their containers.

#### **Principle 1: Separate Structure from Skin**

Separating structural CSS (layout, dimensions, positioning) from visual CSS (colors, borders, shadows) allows different visual treatments to share the same structure. This principle dramatically reduces CSS duplication across components with similar layouts but different appearances.

```css
/* WRONG: Structure and skin combined */
.button {
    padding: 10px 20px;           /* Structure */
    margin: 5px;                   /* Structure */
    background: #3498db;           /* Skin */
    color: white;                  /* Skin */
    border: 1px solid #2980b9;     /* Skin */
    border-radius: 4px;            /* Skin */
}

.button.primary {
    background: #3498db;
    border-color: #2980b9;
}

.button.secondary {
    background: #95a5a6;
    border-color: #7f8c8d;
}

/* CORRECT: Separate structure from skin */

/* Structure */
.obj-button {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    margin: 5px;
    border: 1px solid transparent;
    cursor: pointer;
}

/* Skin */
.skin-button-primary {
    background: #3498db;
    color: white;
    border-color: #2980b9;
}

.skin-button-secondary {
    background: #95a5a6;
    color: white;
    border-color: #7f8c8d;
}

/* Usage */
<button class="obj-button skin-button-primary">Primary</button>
<button class="obj-button skin-button-secondary">Secondary</button>
```

#### **Principle 2: Separate Container and Content**

Content components should look the same regardless of where they appear in the page hierarchy. This principle eliminates location-dependent styling, making components truly reusable across different contexts without code duplication.

```css
/* WRONG: Content depends on container */
.sidebar h2 {
    font-size: 16px;
    color: #333;
    margin-bottom: 10px;
}

.main h2 {
    font-size: 24px;
    color: #000;
    margin-bottom: 20px;
}

/* Usage */
<aside class="sidebar">
    <h2>Sidebar Title</h2>  <!-- Styled by .sidebar h2 -->
</aside>

<main>
    <h2>Main Title</h2>  <!-- Styled by .main h2 -->
</main>

/* CORRECT: Content independent of container */

/* Generic heading object */
.obj-heading {
    margin-top: 0;
    line-height: 1.2;
}

.obj-heading--small {
    font-size: 16px;
}

.obj-heading--medium {
    font-size: 20px;
}

.obj-heading--large {
    font-size: 28px;
}

/* Skin */
.skin-heading-primary {
    color: #333;
}

.skin-heading-secondary {
    color: #666;
}

/* Usage */
<aside class="sidebar">
    <h2 class="obj-heading obj-heading--small skin-heading-primary">Sidebar Title</h2>
</aside>

<main>
    <h2 class="obj-heading obj-heading--large skin-heading-secondary">Main Title</h2>
</main>
```

### OOCSS Example: Media Object

The "media object" is a classic OOCSS pattern for image + text combinations.

```html
<!-- HTML -->
<article class="obj-media">
    <figure class="obj-media__img">
        <img src="avatar.jpg" alt="User avatar">
    </figure>
    <div class="obj-media__body">
        <h3 class="obj-media__title">John Doe</h3>
        <p class="obj-media__text">This is a media object example.</p>
    </div>
</article>
```

```css
/* Structure */
.obj-media {
    display: flex;
    gap: 20px;
}

.obj-media__img {
    flex-shrink: 0;
}

.obj-media__img img {
    display: block;
    max-width: 100%;
    height: auto;
}

.obj-media__body {
    flex: 1;
    min-width: 0;
}

/* Skin variations */
.obj-media.skin-comment {
    background: #f9f9f9;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
}

.obj-media.skin-author {
    background: #e8f4f8;
    padding: 20px;
    border: 1px solid #c0e0e8;
}

.obj-media__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 5px 0;
}

.obj-media__text {
    margin: 0;
    color: #666;
    line-height: 1.6;
}
```

### OOCSS Benefits

1. **Reusability**: Create flexible, composable objects
2. **Small file sizes**: Minimal CSS due to reuse
3. **Performance**: Fewer bytes to download and parse
4. **Flexibility**: Objects can be combined in many ways
5. **Maintainability**: Changes to structure or skin don't affect each other
6. **Scaling**: Works well for large applications with high traffic

### OOCSS Drawbacks

1. **HTML verbosity**: Multiple classes per element to compose objects
2. **Naming complexity**: Finding right abstractions is difficult
3. **Learning curve**: Requires thinking in terms of objects
4. **Cognitive load**: Developers must understand object hierarchy
5. **Over-abstraction**: Easy to create objects that aren't actually reused
6. **Maintenance**: Changing objects can affect many components

---

## Methodology Comparison

### Quick Comparison Table

| Aspect | BEM | SMACSS | ITCSS | OOCSS |
|--------|-----|--------|-------|-------|
| **Learning Curve** | Very Easy | Medium | Hard | Medium |
| **Naming Convention** | Strict | Guidelines | Flexible | Flexible |
| **Structure** | Component-based | Category-based | Layer-based | Object-based |
| **Scalability** | Good | Excellent | Excellent | Good |
| **Team Adoption** | Fast | Medium | Slow | Medium |
| **HTML Readability** | Good | Excellent | Good | Poor |
| **CSS File Size** | Medium-Large | Large | Medium | Small |
| **Specificity Control** | Good | Excellent | Excellent | Excellent |
| **Best For** | Small-medium | Medium-large | Enterprise | High-traffic |
| **Preprocessor** | Optional | Helpful | Recommended | Optional |

### When to Use Each

Choosing the right methodology depends on project requirements, team experience, and long-term maintainability goals. Each methodology excels in different scenarios, and understanding these contexts helps teams make informed architectural decisions.

**Choose BEM if:**
- Team is learning CSS architecture for first time
- Project is small to medium-sized
- Simple naming convention is priority
- Static or server-rendered site
- Team values quick adoption

**Choose SMACSS if:**
- Growing application needing organization
- Multiple developers collaborating
- Want clear separation of concerns
- Need both structure and theming
- Balance between simplicity and scalability

**Choose ITCSS if:**
- Large enterprise application
- Strict specificity management critical
- Multiple teams working together
- Want comprehensive framework
- Willing to invest in learning

**Choose OOCSS if:**
- Performance-critical (high traffic)
- Small CSS file size is must
- Team comfortable with abstraction
- Need highly reusable patterns
- Willing to write more HTML classes

### Hybrid Approaches

Many teams combine methodologies:

```css
/* BEM structure + ITCSS layers */
/* Objects layer with BEM naming */
.o-container { }
.o-layout { }

/* Components layer with BEM naming */
.c-button { }
.c-button__icon { }
.c-button--primary { }

/* SMACSS states layer */
.is-active { }
.is-disabled { }

/* OOCSS objects */
.obj-media { }
.skin-dark { }
```

---

## Interview Questions

### Question 1: Explain BEM Naming Convention

**Answer:**
BEM (Block Element Modifier) is a naming convention that structures CSS classes into three parts:

- **Block**: Standalone component (e.g., `button`, `card`)
- **Element**: Part of a block (e.g., `button__icon`)
- **Modifier**: Variation or state (e.g., `button--primary`)

**Format**: `block__element--modifier`

**Example:**
```css
.button { }                    /* Block */
.button__text { }              /* Element */
.button__icon { }              /* Element */
.button--primary { }           /* Modifier */
.button__icon--large { }       /* Element + Modifier */
```

**Benefits:**
- Clear naming makes code self-documenting
- Flat specificity prevents specificity conflicts
- Easy to scale with new modifiers
- Prevents unintended side effects

**Drawbacks:**
- HTML becomes verbose with long class names
- Requires naming discipline
- No built-in scoping

---

### Question 2: What Are the Main Differences Between BEM, SMACSS, and ITCSS?

**Answer:**

| Aspect | BEM | SMACSS | ITCSS |
|--------|-----|--------|-------|
| **Focus** | Component naming | Categorization | Layer organization |
| **Structure** | Block-Element-Modifier | Base-Layout-Module-State-Theme | Settings-Tools-Generic-Elements-Objects-Components-Utilities |
| **Naming** | Strict convention | Prefixes (l-, mod-, is-) | Flexible (prefixes by layer) |
| **Complexity** | Low | Medium | High |
| **Scalability** | Good | Excellent | Excellent |
| **Best For** | Small-medium projects | Growing applications | Enterprise applications |

**BEM** is best for learning CSS architecture - simple, effective naming.

**SMACSS** provides clear categories for organization - good balance.

**ITCSS** manages specificity intentionally - complex but powerful for large apps.

---

### Question 3: How Do You Handle CSS in Large Applications?

**Answer:**
For large applications, I would:

1. **Choose appropriate methodology** - Probably ITCSS or SMACSS for scale
2. **Organize into layers/categories** - Clear separation of concerns
3. **Implement design token system** - Variables for consistency
4. **Use CSS Modules or CSS-in-JS** - Component scoping
5. **Establish naming conventions** - Consistent across team
6. **Set up design system** - Reusable components
7. **Create CSS audit process** - Regular maintenance
8. **Document architecture** - Team reference
9. **Use preprocessor** - Sass for nesting, variables
10. **Implement performance monitoring** - Bundle size tracking

**Example structure:**
```
scss/
   settings/          (variables, config)
   tools/            (mixins, functions)
   generic/          (resets, normalize)
   elements/         (HTML defaults)
   objects/          (layout patterns)
   components/       (UI components)
   utilities/        (single-purpose utilities)
```

---

### Question 4: Compare BEM and CSS Modules

**Answer:**
**BEM** is a **naming convention** for CSS methodology.
**CSS Modules** is a **technical solution** that scopes CSS to components.

| Aspect | BEM | CSS Modules |
|--------|-----|-------------|
| **Type** | Naming convention | Technical implementation |
| **Scoping** | Manual (naming) | Automatic (module system) |
| **Specificity** | Managed by convention | Always 1 specificity |
| **Debugging** | Class names in HTML | Generated class names |
| **Flexibility** | Can be used anywhere | Requires build tool |
| **Learning Curve** | Easy | Medium |
| **Team Adoption** | Fast | Requires tooling knowledge |

**BEM without tooling:**
```css
.button { }
.button--primary { }
```

**CSS Modules:**
```css
.button { }
.primary { }
```

```jsx
import styles from './button.module.css';
<button className={styles.button + ' ' + styles.primary} />
```

---

### Question 5: Describe SMACSS Categories with Real Examples

**Answer:**

**1. Base**: HTML element defaults
```css
body { font-family: Arial; }
h1 { font-size: 32px; }
a { color: blue; }
```

**2. Layout**: Major page sections
```css
.l-header { position: relative; z-index: 100; }
.l-main { display: flex; }
.l-sidebar { width: 250px; }
```

**3. Module**: Reusable components
```css
.mod-button { padding: 10px 20px; }
.mod-card { border: 1px solid #ccc; }
.mod-nav { display: flex; }
```

**4. State**: Dynamic states
```css
.is-active { font-weight: bold; }
.is-disabled { opacity: 0.6; }
.is-loading { pointer-events: none; }
```

**5. Theme**: Visual treatment
```css
.theme-dark { background: #1a1a1a; }
.theme-light { background: white; }
```

---

### Question 6: Explain ITCSS Layer System

**Answer:**
ITCSS (Inverted Triangle CSS) organizes CSS into 7 layers, from generic to specific:

1. **Settings** - Variables (no output)
2. **Tools** - Mixins, functions (no output)
3. **Generic** - Resets, normalize
4. **Elements** - HTML defaults
5. **Objects** - Layout patterns
6. **Components** - UI components
7. **Utilities** - Single-purpose (can use !important)

The inverted triangle shape represents increasing specificity going down.

**Benefits:**
- Intentional specificity management
- Prevents specificity conflicts
- Clear layer hierarchy
- Scales to enterprise

**Example:**
```scss
// Specific utility can override generic component
.u-display-none { display: none !important; }
// but generic elements can't override components
h2 { } // lower specificity
.c-heading { } // higher specificity
```

---

### Question 7: When Would You Use OOCSS?

**Answer:**
OOCSS (Object-Oriented CSS) focuses on creating reusable, flexible CSS objects.

**Use OOCSS when:**
- Small CSS file size is critical (high-traffic sites)
- Need maximum reusability
- Team comfortable with abstraction
- Performance is priority over readability

**Key principles:**

1. **Separate structure from skin**
```css
/* Structure */
.obj-button { padding: 10px 20px; }

/* Skin */
.skin-primary { background: blue; }

/* Usage */
<button class="obj-button skin-primary">Click</button>
```

2. **Separate container from content**
```css
/* Reusable heading */
.obj-title { font-size: 24px; }
.obj-title--small { font-size: 16px; }

/* Context shouldn't matter */
<h1 class="obj-title">Home</h1>
<h2 class="obj-title obj-title--small">Sidebar</h2>
```

---

### Question 8: What Are Common Mistakes in CSS Methodologies?

**Answer:**

**BEM Mistakes:**
```css
/* Too many underscores */
.card__content__title { } /* Wrong: 3 parts */

/* Not using modifiers */
.button-small { } /* Wrong: use modifier */
.button--small { } /* Correct */
```

**SMACSS Mistakes:**
```css
/* Unclear category */
.button { } /* Unclear which category */
.mod-button { } /* Clear: it's a module */

/* Mixing concerns */
.l-header { color: red; } /* Wrong: layout shouldn't style color */
```

**ITCSS Mistakes:**
```css
/* Wrong layer for styles */
.u-button { } /* Wrong: Button in utilities */
.c-button { } /* Correct: Button in components */

/* Specificity inversion */
.component { }
.utility { } /* Should be lowest specificity */
```

**OOCSS Mistakes:**
```css
/* Over-abstraction */
.obj-list-item-inner-wrapper { } /* Too many layers */

/* Context-dependent objects */
.sidebar .heading { } /* Wrong: depends on parent */
.obj-heading { } /* Correct: independent */
```

---

### Question 9: How Do You Choose Between These Methodologies?

**Answer:**
Consider four factors:

1. **Project Size**
   - Small: BEM
   - Medium: SMACSS or BEM
   - Large: ITCSS or SMACSS

2. **Team Size**
   - Solo: Any
   - Small: BEM (easiest)
   - Large: ITCSS (most structure)

3. **Project Timeline**
   - Rapid MVP: BEM (quick to learn)
   - Normal: SMACSS
   - Long-term: ITCSS

4. **Performance Critical?**
   - Yes: OOCSS (smallest files)
   - No: Any

**Decision Tree:**
```
Start here
  New team learning CSS? � BEM
  Small-medium growing app? � SMACSS
  Large enterprise app? � ITCSS
  High traffic site? � OOCSS
  Unsure? � Start with BEM, upgrade to SMACSS
```

---

### Question 10: Combine Multiple Methodologies

**Answer:**
Many successful projects combine methodologies. Here's a practical approach:

```css
/* ITCSS layers + BEM naming + SMACSS states */

/* Settings layer */
$base-font-size: 14px;
$color-primary: #3498db;

/* Tools layer */
@mixin respond-to($bp) { @media (min-width: $bp) { @content; } }

/* Generic layer */
* { box-sizing: border-box; }
body { font-size: $base-font-size; }

/* Elements layer */
h1 { font-size: 32px; }

/* Objects layer (ITCSS + OOCSS) */
.o-container { max-width: 1200px; }

/* Components layer (BEM naming) */
.c-button { padding: 10px 20px; }
.c-button__icon { margin-right: 5px; }
.c-button--primary { background: $color-primary; }

/* State layer (SMACSS) */
.is-active { font-weight: bold; }
.is-disabled { opacity: 0.6; }

/* Utilities layer */
.u-margin-top { margin-top: 20px !important; }
```

**Benefits:**
- BEM for clarity
- ITCSS for structure
- SMACSS for states
- OOCSS for reusability

---

## Real-World Examples

### Example 1: E-commerce Product Card

Using **BEM + SMACSS + ITCSS** combination:

```html
<!-- HTML -->
<article class="c-product-card c-product-card--featured">
    <div class="c-product-card__image-wrapper">
        <img src="product.jpg" alt="Product" class="c-product-card__image">
        <span class="c-product-card__badge">New</span>
    </div>

    <div class="c-product-card__content">
        <h3 class="c-product-card__title">Product Name</h3>
        <p class="c-product-card__description">Description text</p>

        <div class="c-product-card__footer">
            <span class="c-product-card__price">$99.99</span>
            <button class="c-button c-button--primary is-loading">Add to Cart</button>
        </div>
    </div>
</article>
```

```scss
// Component layer (ITCSS)
.c-product-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;

    &__image-wrapper {
        position: relative;
        aspect-ratio: 1 / 1;
        overflow: hidden;
    }

    &__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    &__badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #e74c3c;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
    }

    &__content {
        padding: 16px;
    }

    &__title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
    }

    &__description {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #666;
        line-height: 1.4;
    }

    &__footer {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    &__price {
        font-size: 20px;
        font-weight: 700;
        color: #2c3e50;
    }

    // Modifier
    &--featured {
        border: 2px solid #f39c12;
        box-shadow: 0 4px 12px rgba(243, 156, 18, 0.15);
    }
}

// State layer (SMACSS)
.is-loading {
    opacity: 0.7;
    pointer-events: none;
}
```

### Example 2: Navigation Component

```html
<!-- HTML -->
<nav class="c-nav">
    <ul class="c-nav__list">
        <li class="c-nav__item c-nav__item--active">
            <a href="/" class="c-nav__link">Home</a>
        </li>
        <li class="c-nav__item">
            <a href="/products" class="c-nav__link">Products</a>
        </li>
        <li class="c-nav__item">
            <a href="/about" class="c-nav__link">About</a>
        </li>
    </ul>
</nav>
```

```scss
.c-nav {
    background: #2c3e50;
    padding: 0;

    &__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        gap: 0;
    }

    &__item {
        flex: 1;
    }

    &__link {
        display: block;
        padding: 16px;
        color: white;
        text-decoration: none;
        text-align: center;
        transition: background 0.3s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
        }
    }

    &__item--active &__link {
        background: #3498db;
        font-weight: 600;
    }
}
```

---

## Summary

CSS methodologies are essential for building scalable, maintainable applications:

- **BEM**: Great for learning, component-focused naming
- **SMACSS**: Balanced approach with clear categories
- **ITCSS**: Enterprise-scale with deliberate specificity management
- **OOCSS**: Performance-optimized with object abstraction

**Choose based on project size, team size, and performance needs.** Many successful projects combine multiple methodologies for the best results.

---

[� Back to CSS Architecture](./README.md)
