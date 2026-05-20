# Semantic HTML

> Markup that describes **meaning**, not appearance. The foundation of accessibility, SEO, and maintainable frontends.

---

## Why Seniors Should Care

Semantic HTML is the cheapest accessibility win, the cheapest SEO win, and the cheapest maintenance win. Three reasons it shows up in senior interviews:

| Concern | What Semantic HTML Buys You |
|---|---|
| **Accessibility** | Screen readers expose landmarks, headings, and form labels for free — no ARIA needed |
| **SEO** | Crawlers weight `<article>`, `<h1>`, `<nav>` differently than `<div>` soup |
| **Maintainability** | A new dev reading `<article>` understands intent instantly. `<div class="post">` requires hunting CSS |
| **Resilience** | Works without CSS/JS. Reader mode, RSS, AMP, and Apple Watch summaries all parse semantic markup |

> **Key Insight:** Every `<div>` is a tiny act of giving up. Use it only when no semantic tag fits.

---

## Document Landmarks

The browser builds an **accessibility tree** from these tags. Screen reader users navigate by landmark, not by scrolling.

```html
<body>
  <header>           <!-- Site or section banner -->
    <nav>...</nav>   <!-- Primary navigation -->
  </header>

  <main>             <!-- The unique content of this page. Only ONE per page -->
    <article>...</article>
    <aside>...</aside>   <!-- Tangentially related content -->
  </main>

  <footer>...</footer>
</body>
```

### 💡 **Landmark Cheat Sheet**

| Tag | Use For | Avoid For |
|---|---|---|
| `<header>` | Top of page **or** top of any `<article>`/`<section>` | Generic wrappers |
| `<nav>` | Major navigation blocks | Every list of links (footer link lists don't need it) |
| `<main>` | The page's primary content | More than once per page |
| `<article>` | Self-contained, syndicatable content (blog post, product card, comment) | Generic grouping |
| `<section>` | Thematic grouping that **needs a heading** | A styling wrapper |
| `<aside>` | Sidebars, pull quotes, related links | Just because content is on the side visually |
| `<footer>` | Page footer **or** end of an article (author, date) | Generic bottom container |

**Common Mistake:**

```html
<!-- ❌ Bad: nav is for major navigation, not every link group -->
<footer>
  <nav><a>Privacy</a><a>Terms</a></nav>
</footer>

<!-- ✅ Good: a plain list is enough -->
<footer>
  <ul><li><a>Privacy</a></li><li><a>Terms</a></li></ul>
</footer>
```

---

## `<section>` vs `<article>` vs `<div>` — The Decision Rule

This is the most-asked semantic HTML interview question.

```
Could this content stand alone, syndicated to another site (RSS, share card)?
  ├── Yes → <article>
  └── No → Does it have a clear heading and represent a distinct theme?
            ├── Yes → <section>
            └── No → <div>  (purely structural / styling hook)
```

### Examples

| Content | Tag | Why |
|---|---|---|
| Blog post | `<article>` | Syndicatable, self-contained |
| Comment on a blog post | `<article>` (nested) | Each comment is a self-contained unit |
| "Latest News" widget on homepage | `<section>` | Themed group, has heading, not standalone |
| Tab panel with three subsections | `<section>` per tab panel | Each needs a heading |
| Flexbox wrapper for layout | `<div>` | No semantic meaning — just a styling hook |

> **Key Insight:** If you can't write a meaningful heading for a `<section>`, it should probably be a `<div>`.

---

## Heading Hierarchy

Headings are how screen reader users skim. They press `H` to jump heading-to-heading. Skip a level and you confuse them.

### 💡 **Rules**

- One `<h1>` per page (the page's primary topic).
- Never skip levels going **down** (`h2` → `h4` is wrong).
- Skipping going back up is fine (`h4` → `h2`).
- The visual size of a heading is independent of its level — style with CSS, choose level by **outline**.

```html
<!-- ❌ Bad: visually styled, semantically broken -->
<h1>My Site</h1>
<h4>Articles</h4>   <!-- skipped h2, h3 -->
<h2>An Article</h2>

<!-- ✅ Good: outline matches structure -->
<h1>My Site</h1>
<h2>Articles</h2>
<h3>An Article</h3>
```

**Why it matters:** Lighthouse, axe-core, and WAVE all flag broken heading order. So do screen reader users, loudly.

---

## Forms — The Highest-Leverage Semantics

Forms are where bad markup causes real user pain. Get these right.

### Labels

```html
<!-- ❌ Bad: no association. Click "Email" — focus doesn't move. -->
<div>Email</div>
<input type="email" />

<!-- ✅ Good: explicit `for`/`id` association -->
<label for="email">Email</label>
<input id="email" type="email" name="email" />

<!-- ✅ Also good: implicit wrapping -->
<label>
  Email
  <input type="email" name="email" />
</label>
```

Without a `<label>`, screen readers announce "edit text, blank" — the user has no idea what to type.

### Grouping with `<fieldset>` and `<legend>`

For radio groups, checkbox groups, and related sets:

```html
<fieldset>
  <legend>Shipping speed</legend>
  <label><input type="radio" name="speed" value="std" /> Standard</label>
  <label><input type="radio" name="speed" value="exp" /> Express</label>
</fieldset>
```

The `<legend>` is announced before each radio, so users hear "Shipping speed, Standard, radio button."

### Input Types Pull Their Weight

| Type | Free Behavior |
|---|---|
| `email` | Mobile email keyboard, basic validation |
| `tel` | Numeric keypad on mobile |
| `url` | URL keyboard with `.com` key |
| `number` | Spinner, numeric input |
| `date` / `time` | Native picker |
| `search` | Clear button, search keyboard |

> **Key Insight:** Always pick the most specific input type. Mobile keyboards alone are worth it.

---

## Lists vs Tables

### Lists

Use `<ul>` for unordered collections, `<ol>` when order matters (steps, rankings, code line numbers). `<dl>` for term/definition pairs (glossaries, metadata).

```html
<dl>
  <dt>Author</dt>   <dd>Salman Rahman</dd>
  <dt>Published</dt> <dd>2026-05-20</dd>
</dl>
```

### Tables — Only for Tabular Data

A `<table>` is for data with rows and columns where each cell relates to row + column headers. **Never use tables for layout.**

```html
<table>
  <caption>Q1 2026 Revenue</caption>
  <thead>
    <tr><th scope="col">Region</th><th scope="col">Revenue</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">EU</th><td>$2.1M</td></tr>
  </tbody>
</table>
```

`<caption>`, `<thead>`, `scope="col|row"` — these let screen readers announce headers as users navigate cells.

---

## When Semantic HTML Isn't Enough → ARIA

Sometimes you build something the platform doesn't ship a tag for (tabs, combobox, tree). Then you reach for ARIA roles and attributes.

**The First Rule of ARIA:** Don't use ARIA. Use a real element.

```html
<!-- ❌ Bad: reinventing a button -->
<div role="button" tabindex="0" onclick="...">Save</div>

<!-- ✅ Good: it's already a button -->
<button type="button" onclick="...">Save</button>
```

The `<button>` gives you focus, keyboard activation (Enter + Space), disabled state, and form participation for free. ARIA on a `<div>` does none of that — you'd have to wire it all up by hand.

> **Key Insight:** ARIA exists for gaps in HTML, not as a replacement for it. Defer deep ARIA patterns to the accessibility doc.

---

## Interview Questions

### Q1: When do you use `<section>` vs `<article>` vs `<div>`?

**Answer:** `<article>` for self-contained, syndicatable content (a blog post, a product card, a tweet — something that could live alone on another page). `<section>` for a thematic group within a page that has its own heading (e.g., "Featured Products" on a homepage). `<div>` is the fallback when there's no semantic meaning — purely a styling/layout hook. If I can't write a meaningful heading for a `<section>`, it should be a `<div>`.

### Q2: Why does heading order matter, and what breaks if you skip levels?

**Answer:** Screen reader users navigate by heading (H key in NVDA/JAWS) and rely on level to understand structure. Skipping `h2` → `h4` implies a missing parent — the user thinks they've lost context. Style headings visually with CSS independent of level; choose the level based on the document outline, not how big you want the text. Lighthouse and axe will flag broken order, and it's a quick interview tell for whether someone understands accessibility.

### Q3: A junior puts every form field in a `<div>` with floating text above it. What's wrong and how do you fix it?

**Answer:** No `<label>` association. Three concrete problems: (1) clicking the text doesn't focus the input — bad for everyone on touch devices, (2) screen readers announce "edit text, blank" because the input has no accessible name, (3) the hit target shrinks to just the input. Fix: wrap with `<label>` or use `<label for="id">` + matching `id` on the input. For grouped controls like radios, add `<fieldset><legend>` so the group has a name too.

---

[← Back to HTML & CSS](./README.md)
