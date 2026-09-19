---
title: Semantic HTML
part: 2
chapter: 2
slug: semantic-html
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-19
tags: [frontend, html, css, semantic]
in_book: true
---

# Semantic HTML {#ch-semantic-html}

> Choose the element that describes what a thing *is*, and get accessibility, SEO and keyboard behaviour without writing any of them.

**In this chapter:** document landmarks · `<section>` vs `<article>` vs `<div>` · heading hierarchy · form semantics · when to reach for ARIA

## 💡 The Core Idea

An HTML element is a promise about what the content *is*, and the browser acts on that promise. It
builds an accessibility tree from it, exposes landmarks a screen reader user can jump between, decides
what reader mode keeps, and gives a `<button>` focus and keyboard activation nobody had to write. A
`<div>` makes no promise, so the browser does nothing — and every behaviour it would have given you has
to be rebuilt by hand, correctly, forever.

That is why this is the cheapest accessibility win, the cheapest SEO win and the cheapest maintenance
win available. Every `<div>` is a small act of giving up; reach for one when no element fits, not first.

## How It Works

| Concern | What the element buys you |
| ------- | -------------------------- |
| **Accessibility** | Landmarks, headings and form labels are exposed with no ARIA at all |
| **SEO** | Crawlers weight `<article>`, `<h1>` and `<nav>` differently from `<div>` soup |
| **Maintainability** | `<article>` states intent on sight; `<div class="post">` needs a hunt through the CSS |
| **Resilience** | Works with no CSS and no JavaScript — reader mode, RSS and watch summaries all parse it |

### Document landmarks

Screen reader users navigate by landmark rather than by scrolling. These are the elements that create
one.

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

**The landmark set, and what each one is not for:**

| Tag | Use for | Avoid for |
| --- | ------- | --------- |
| `<header>` | Top of the page **or** top of any `<article>`/`<section>` | Generic wrappers |
| `<nav>` | Major navigation blocks | Every list of links — a footer link list needs none |
| `<main>` | The page's primary content | More than once per page |
| `<article>` | Self-contained, syndicatable content — post, product card, comment | Generic grouping |
| `<section>` | Thematic grouping that **needs a heading** | A styling wrapper |
| `<aside>` | Sidebars, pull quotes, related links | Content that is merely positioned to one side |
| `<footer>` | Page footer **or** end of an article — author, date | Generic bottom container |

### Heading hierarchy

Headings are how a screen reader user skims: pressing `H` jumps heading to heading. Skip a level and
that user believes they have lost a section.

- One `<h1>` per page — the page's primary topic.
- Never skip a level going **down**. `h2` → `h4` is wrong.
- Skipping back **up** is fine. `h4` → `h2` closes two levels at once.
- Visual size is independent of level. Style with CSS; choose the level from the outline.

```html
<!-- ❌ Visually styled, semantically broken -->
<h1>My Site</h1>
<h4>Articles</h4>   <!-- skipped h2, h3 -->
<h2>An Article</h2>

<!-- ✅ The outline matches the structure -->
<h1>My Site</h1>
<h2>Articles</h2>
<h3>An Article</h3>
```

Lighthouse, axe-core and WAVE all flag broken heading order, so this one fails in CI as well as in use.

### Form semantics

Forms are where bad markup causes real pain, and labels are the whole of it. Without a `<label>`, a
screen reader announces "edit text, blank" and the user has nothing to go on.

```html
<!-- ❌ No association. Clicking "Email" moves focus nowhere. -->
<div>Email</div>
<input type="email" />

<!-- ✅ Explicit `for`/`id` association -->
<label for="email">Email</label>
<input id="email" type="email" name="email" />

<!-- ✅ Implicit wrapping, equally valid -->
<label>
  Email
  <input type="email" name="email" />
</label>
```

**Grouped controls need a name of their own.** `<legend>` is announced before each radio, so the user
hears "Shipping speed, Standard, radio button" rather than "Standard, radio button".

```html
<fieldset>
  <legend>Shipping speed</legend>
  <label><input type="radio" name="speed" value="std" /> Standard</label>
  <label><input type="radio" name="speed" value="exp" /> Express</label>
</fieldset>
```

**The input type is free behaviour.** Pick the most specific one available; the mobile keyboard alone
pays for the decision.

| Type | What it gives you |
| ---- | ----------------- |
| `email` | Mobile email keyboard, basic validation |
| `tel` | Numeric keypad on mobile |
| `url` | URL keyboard with a `.com` key |
| `number` | Spinner and numeric input |
| `date` / `time` | Native picker |
| `search` | Clear button and search keyboard |

### Lists and tables

`<ul>` for an unordered collection, `<ol>` where order carries meaning — steps, rankings, line numbers
— and `<dl>` for term and definition pairs such as a glossary or a metadata block.

```html
<dl>
  <dt>Author</dt>    <dd>Salman Rahman</dd>
  <dt>Published</dt> <dd>2026-05-20</dd>
</dl>
```

A `<table>` is for data where each cell relates to a row header and a column header. `<caption>`,
`<thead>` and `scope` are what let a screen reader announce those headers as the user moves between
cells.

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

## When to Use It

The `<section>` / `<article>` / `<div>` decision is the one interviewers ask about, and it resolves in
two questions.

```text
Could this content stand alone, syndicated to another site?
  ├── Yes → <article>
  └── No → Does it have a clear heading and one distinct theme?
            ├── Yes → <section>
            └── No → <div>  (purely structural, a styling hook)
```

| Content | Element | Why |
| ------- | ------- | --- |
| Blog post | `<article>` | Syndicatable and self-contained |
| Comment on that post | `<article>`, nested | Each comment is a unit in its own right |
| "Latest News" widget | `<section>` | Themed, has a heading, does not stand alone |
| Tab panel with three subsections | `<section>` per panel | Each one needs a heading |
| Flexbox wrapper for layout | `<div>` | No meaning at all — a styling hook |

> ⚠️ If you cannot write a meaningful heading for a `<section>`, it is a `<div>`. The heading is not
> decoration; it is the thing that makes the section a section.

## Common Mistakes

**❌ `<nav>` around every group of links.** It is for major navigation. A footer link list is a list.

```html
<!-- ❌ Every link group announced as a navigation landmark -->
<footer>
  <nav><a>Privacy</a><a>Terms</a></nav>
</footer>

<!-- ✅ A plain list is enough -->
<footer>
  <ul><li><a>Privacy</a></li><li><a>Terms</a></li></ul>
</footer>
```

**❌ Reaching for ARIA when an element exists.** ARIA fills gaps in HTML — tabs, comboboxes, trees —
and nothing else. The first rule of ARIA is not to use ARIA.

```html
<!-- ❌ Reinventing a button, badly -->
<div role="button" tabindex="0" onclick="...">Save</div>

<!-- ✅ It is already a button -->
<button type="button" onclick="...">Save</button>
```

The `<button>` brings focus, Enter and Space activation, a disabled state and form participation. The
`<div>` brings a role attribute and a promise you now have to keep by hand.

**❌ Tables for layout.** They announce as data to a screen reader, which then reads a page of
positioning as though it were a spreadsheet.

**❌ Choosing a heading level for its size.** `<h4>` because the design wants smaller text is how an
outline breaks. Choose the level from the structure and set the size in CSS.

## 🔑 Key Takeaways

- An element is a promise about what the content is, and the browser acts on it — a `<div>` promises
  nothing, so nothing is given to you.
- `<article>` stands alone, `<section>` needs a heading, `<div>` is the fallback when neither is true.
- Heading level comes from the document outline, never from the font size the design asks for.
- A form control without an associated `<label>` has no accessible name, and announces as "blank".
- ARIA is for what HTML has no element for. Every other use of it is work you have signed up to redo.

## Interview Questions

**Q: When do you use `<section>` versus `<article>` versus `<div>`?**

`<article>` for self-contained, syndicatable content — a blog post, a product card, something that
could live alone on another page. `<section>` for a thematic group within a page that has its own
heading, such as "Featured Products" on a homepage. `<div>` when there is no meaning to express and the
element is a styling hook. The test that settles most cases: if you cannot write a meaningful heading
for the `<section>`, it should be a `<div>`.

**Q: Why does heading order matter, and what breaks if you skip levels?**

Screen reader users navigate by heading and read the level as structure. Skipping `h2` to `h4` implies
a parent section that is not there, so the user believes they have lost context. Style headings
visually with CSS and choose the level from the document outline. Lighthouse and axe both flag broken
order, so it also fails automatically.

**Q: A colleague puts every form field in a `<div>` with floating text above it. What is wrong?**

There is no label association, and it costs three separate things: clicking the text does not focus the
input, the input has no accessible name so it announces as "edit text, blank", and the hit target
shrinks to the control itself. The fix is `<label for>` with a matching `id`, or wrapping the control in
the `<label>`. For a radio or checkbox group, add `<fieldset>` and `<legend>` so the group is named too.

**Q: When would you not use a semantic element?**

When the element would make a promise the content does not keep. `<aside>` for something that is merely
positioned to one side, `<nav>` for a list of three footer links, or `<section>` for a flex wrapper all
add a landmark a screen reader user has to navigate past. A wrong landmark is worse than no landmark,
which is the one case where `<div>` is the right answer rather than the lazy one.

## What to Read Next

- [Chapter ?? — The Accessibility Tree](#ch-accessibility-tree) — what the browser builds out of
  this markup, and how to inspect it
- [Chapter ?? — ARIA, and When Not to Use It](#ch-aria) — the gaps semantic HTML
  genuinely leaves, and the patterns that fill them
- [Chapter ?? — Accessible Forms and Error Messaging](#ch-accessible-forms) — validation, error messaging and the rest of
  the form story
