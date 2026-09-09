---
title: Asset Delivery
part: 4
chapter: 0
slug: asset-delivery
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-09
tags: [images, fonts, css, avif, font-display, critical-css, performance]
in_book: true
---

# Asset Delivery {#ch-asset-delivery}

> Serve every image, font and stylesheet at the right size and format, and know what the page looks like in the window before each arrives.

**In this chapter:** why images fail differently from fonts and CSS · formats and quality thresholds · `srcset` against `<picture>` · `font-display` and killing the reflow · render-blocking CSS · icons

## 💡 The Core Idea

Static assets are usually most of a page's bytes, and they split into two groups by **how they fail
while loading**.

An image degrades gracefully: a gap, then content. So the work on images is arithmetic — send the
right format at the right dimensions and reserve the box.

Fonts and CSS do not degrade gracefully. A stylesheet that has not arrived means the browser paints
**nothing**, because CSS is render-blocking by design. A font that has not arrived means either
invisible text or text that reflows when the real font lands. Both outcomes land directly on a Core
Web Vital — the first on LCP, the second on CLS.

So for images the question is "how few bytes", and for fonts and CSS it is "**what does the user see in
the window before this arrives**". That difference drives every decision below.

## How It Works

### Formats, and the quality thresholds worth memorising

| Format | Size against JPEG | Use for |
| ------ | ----------------- | ------- |
| **AVIF** | ~50% | Photographs — the best compression available |
| **WebP** | ~70% | Photographs, where AVIF encode time is a problem |
| **JPEG** | baseline | The universal fallback |
| **PNG** | larger | Graphics needing exact pixels or transparency |
| **SVG** | tiny | Logos and icons — vector, scales freely |

```html
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <!-- The fallback is not optional: without it, an unsupported browser shows nothing -->
  <img src="hero.jpg" alt="Emissions dashboard" width="1200" height="600" />
</picture>
```

Quality settings past a point cost bytes and buy nothing visible: **JPEG 85, WebP 80, AVIF 65** — AVIF
uses a different scale, which is why the number looks alarming and is not.

### `srcset` sends the right size; `<picture>` sends a different image

Sending a 1600px image to a 400px viewport wastes four times the bandwidth for no visible gain.

```html
<img
  src="chart-800.avif"
  srcset="chart-400.avif 400w, chart-800.avif 800w, chart-1200.avif 1200w"
  sizes="(max-width: 600px) 400px, 800px"
  alt="Emissions by quarter"
  width="800"
  height="600"
/>
```

`srcset` declares what widths exist; `sizes` tells the browser how wide the image will *render*, which
it needs before layout. Getting `sizes` wrong is the common bug: the browser picks a candidate for the
wrong width and either wastes bytes or renders something blurry.

| Need | Use |
| ---- | --- |
| The same image at several widths | `srcset` + `sizes` |
| A different crop per breakpoint | `<picture>` with `media` |
| A modern format with a fallback | `<picture>` with `type` |

An image CDN collapses all of this into URL parameters — width, quality and format negotiated per
request, with no build step. That is usually the right answer for user-uploaded content, where you
cannot generate variants ahead of time.

### Fonts: choose which failure you get

While a web font loads, the browser must show something. `font-display` picks the failure mode.

| Value | Behaviour | Costs |
| ----- | --------- | ----- |
| `block` | Invisible text for ~3 s, then the web font | FOIT — a blank paragraph, and LCP if that text is the LCP element |
| `swap` | Fallback immediately, swap when ready | FOUT — a reflow, which is CLS |
| `optional` | Fallback, and the web font is used only if it arrived in ~100 ms | Neither, but the font may never appear on a slow connection |

`swap` is the default choice, because a reflow can be eliminated and a blank page cannot.

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-latin-var.woff2") format("woff2");
  font-weight: 100 900; /* one variable file instead of six static weights */
  font-display: swap;
  unicode-range: U+0000-00FF, U+2018-201E; /* Latin plus real quote marks */
}
```

Three decisions there. `woff2` alone, universally supported since 2016, so a `woff` fallback ships
bytes nobody downloads. A variable font, which beats three static weights and comfortably beats six.
And a `unicode-range` subset, which cuts a Latin-Extended-plus-Cyrillic file by roughly 70%.

```html
<!-- crossorigin is required even same-origin: font requests are made in CORS mode -->
<link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin />
```

Omit `crossorigin` and the browser fetches the file twice. Preload only the faces that render in the
first viewport — preloading six weights turns an optimisation into contention with the LCP image.

### Killing the reflow with fallback metrics

FOUT happens because the fallback and the web font measure differently, so the text occupies a
different number of lines and everything below it moves. Make the fallback measure the same.

```css
/* A fallback face whose metrics match Inter, so the swap shifts nothing */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
}
```

Then `font-family: "Inter", "Inter Fallback", sans-serif`. Deriving those percentages by hand is
tedious, which is why build tooling generates the face — `next/font` being one, covered in
[Chapter ?? — Images, Fonts, and Assets](#ch-nextjs-assets). What matters is knowing what it produces:
a `local()` face pointing at a system font with its metrics overridden.

> ⚠️ **Moving target:** the metric-override properties landed at different times per engine, and the
> tooling around them is renamed every couple of years. The durable principle is that a web font
> should be self-hosted, subset to the characters you use, and paired with a metrics-matched fallback.

### CSS is render-blocking, and that is correct

Every byte of CSS in a `<head>` stylesheet is on the critical path. Painting unstyled content and then
restyling it would be worse, so the answer is to shrink what is in that file rather than to unblock it.

```html
<!-- Inline the first-viewport rules; under ~14 kB keeps them in the first congestion window -->
<style>.header { height: 64px; } .hero { min-height: 60vh; }</style>

<!-- Everything else: non-blocking, promoted once it lands -->
<link rel="stylesheet" href="/styles/rest.css" media="print" onload="this.media='all'" />
```

The `media="print"` promotion is a genuine hack. A framework that splits CSS per route gives the same
result without it — which is what `cssCodeSplit: true` does, emitting one stylesheet per JavaScript
chunk so a route pays only for its own rules.

### Icons

Icons split three ways: inline SVG for a handful, an SVG sprite with `<use>` for dozens — one cacheable
request, styleable with CSS — and per-icon module imports where a library supports them. An icon
**font** is a render-blocking font with poor accessibility, and a **barrel import** from an icon pack
is frequently 300 kB, for the reason given in
[Chapter ?? — Bundles, Budgets and Third Parties](#ch-bundle-optimisation).

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| Photographs on a content page | AVIF with a WebP and JPEG fallback | Roughly half the bytes for the same appearance |
| User-uploaded images | An image CDN with URL parameters | You cannot pre-generate variants |
| A logo or icon | SVG | Scales freely and is usually smaller than any raster |
| Body text in a web font | `font-display: swap` plus a metrics-matched fallback | No blank text and no reflow |
| A decorative display font | `font-display: optional` | Not worth a layout shift |
| A large stylesheet on a content page | Inline critical CSS, defer the rest | It is on the first-paint critical path |
| More than a dozen icons | An SVG sprite | One cacheable request instead of bundle weight |

## Common Mistakes

❌ **AVIF with no fallback.** Unsupported browsers show a broken image, not a worse one.
✅ `<picture>` with AVIF, WebP and a JPEG `<img>`.

❌ **An image with no `width`/`height` or `aspect-ratio`.** You traded bytes for a layout shift.
✅ Reserve the box always — see [Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

❌ **`sizes` that does not match the rendered width.** The browser picks the wrong candidate.
✅ Keep `sizes` in step with the CSS, and check what it actually downloads.

❌ **`preload` on a font without `crossorigin`.** The file is fetched twice.
✅ Always `crossorigin`, even same-origin.

## 🔑 Key Takeaways

- Images fail gracefully and fonts and CSS do not, which is why fonts and CSS need a plan for the pre-arrival window.
- AVIF at quality 65 is roughly half of JPEG at 85, and a fallback `<img>` is mandatory.
- `srcset` picks a size and `<picture>` picks a different image or format; `sizes` is what the browser needs before layout.
- `font-display: swap` plus a metrics-matched fallback face is the pairing that gives neither FOIT nor a reflow.
- A preloaded font needs `crossorigin` even same-origin, because font requests are made in CORS mode.

## Interview Questions

**Q: Why is a late-arriving font a Core Web Vitals problem rather than a cosmetic one?**

Because the browser has to render something in the meantime, and both options cost a metric. Blocking
means invisible text, which delays LCP if that text is the largest element. Swapping means the
fallback is replaced by a font with different metrics, so the text reflows and everything below it
moves — which is CLS. The way out is `swap` plus a fallback face with overridden metrics, so the swap
changes the glyphs and not the line count.

**Q: When would you use `<picture>` instead of `srcset`?**

When the image itself changes rather than just its size — a different crop for narrow viewports, or a
modern format with a fallback. `srcset` and `sizes` are for the same image at several widths, which is
the common case and lets the browser choose. If you find yourself listing two genuinely different
images in a `srcset`, you want `<picture>`.

**Q: Why is CSS render-blocking, and what do you do about it?**

Because painting unstyled content and then restyling it is worse than waiting, so the blocking is
correct and the goal is to make the blocking file small. Inline what the first viewport needs, keep it
under about 14 kB, and load the rest non-blocking — or let a framework split CSS per route, which
achieves the same thing without the inlining step.

## What to Read Next

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — the LCP and CLS numbers these decisions move
- [Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting) — deferring the assets below the fold
- [Chapter ?? — Frontend Caching Strategies](#ch-frontend-caching-strategies) — the hashed filenames that let these be cached for a year
