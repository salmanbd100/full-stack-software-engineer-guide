---
title: Font and CSS Delivery
part: 4
chapter: 0
slug: font-and-css-delivery
level: advanced # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-07
tags: [performance, fonts, css, critical-css, icons, cls]
in_book: true
---

# Font and CSS Delivery {#ch-font-and-css-delivery}

> Get text and styles on screen without a blank paragraph, a reflow, or a render-blocking round trip.

**In this chapter:** why fonts and CSS are different from images · `font-display` and the FOIT/FOUT trade · subsetting and preload · fallback metrics · critical CSS · icon delivery

## 💡 The Core Idea

Images degrade gracefully — a late image leaves a gap and then fills it. Fonts and CSS do not. A late
stylesheet means the browser renders **nothing**, because CSS is render-blocking by default. A late
font means either invisible text or visible text that reflows when the real font arrives. Both
outcomes land on a Core Web Vital: the first on LCP, the second on CLS.

So the question for fonts and CSS is not "how small can this be" but "what does the page look like in
the window before it arrives". Everything in this chapter is a way of answering that.

## How It Works

### Fonts: the two failure modes

While a web font is loading, the browser has to show something. `font-display` chooses which failure
you get.

| Value | Block period | Behaviour | Costs |
| ----- | ------------ | --------- | ------ |
| `block` | ~3 s | Invisible text, then the web font | FOIT — a blank paragraph, and LCP if the text is your LCP element |
| `swap` | 0 | Fallback font immediately, swap when ready | FOUT — a reflow, which is CLS |
| `optional` | ~100 ms | Fallback, and the web font is only used if it arrived in time | Neither, but the font may never show on a slow connection |
| `fallback` | ~100 ms | Between `swap` and `optional` | A short FOIT, then FOUT |

`swap` is the usual choice because a reflow you can eliminate beats a blank page you cannot. The way
you eliminate the reflow is fallback metrics, below.

**Self-hosted, subset, one format:**

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-latin-var.woff2") format("woff2");
  font-weight: 100 900; /* one variable file replaces six static weights */
  font-display: swap;
  unicode-range: U+0000-00FF, U+2018-201E; /* Latin plus real quote marks */
}
```

Three decisions in that block. `woff2` only — every browser that matters has supported it since 2016,
so a `woff` fallback ships bytes nobody downloads. A variable font instead of separate weight files,
which is usually smaller than three static weights and always smaller than six. And a `unicode-range`
subset, which cuts a full Latin-Extended-plus-Cyrillic file by roughly 70% and tells the browser not to
download the file at all for text outside the range.

**Preload the one font that renders above the fold:**

```html
<link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin />
```

`crossorigin` is required even for a same-origin font, because font requests are made in CORS mode.
Without it the browser fetches the file twice. Preload exactly the fonts used in the first viewport —
preloading six weights turns an optimisation into contention with the LCP image.

### Removing the reflow: fallback metrics

FOUT happens because the fallback font and the web font have different metrics, so text occupies a
different number of lines. The platform fix is to override the fallback's metrics to match.

```css
/* A fallback face that measures the same as Inter, so the swap shifts nothing */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: "Inter", "Inter Fallback", sans-serif;
}
```

Working out those four numbers by hand is tedious, which is why the useful build tools generate the
fallback face for you — `next/font` is one, and
[Chapter ?? — Images, Fonts, and Assets](#ch-nextjs-assets) covers that wrapper. What matters here is
what it is generating: a `local()` face pointing at a system font, with its metrics overridden to
match the web font it stands in for.

> ⚠️ **Moving target:** the metric-override properties reached stable support at different times per
> engine, and the tooling around them changes names every couple of years. The durable principle is
> that a web font should be served from your own origin, subset to the characters you use, and paired
> with a fallback whose metrics match. The API that produces it will move.

### CSS: the render-blocking problem

A `<link rel="stylesheet">` in `<head>` blocks the first paint until it has downloaded and parsed.
That is correct behaviour — rendering unstyled content and then restyling it is worse — but it means
every byte of CSS in that file is on the critical path.

**Inline what the first viewport needs, defer the rest:**

```html
<head>
  <style>
    /* Above-the-fold rules only. Keep under ~14 KB so it fits the first congestion window. */
    body { margin: 0; font-family: "Inter", sans-serif; }
    .header { height: 64px; }
    .hero { min-height: 60vh; }
  </style>

  <!-- Everything else: fetched at low priority, applied once it lands -->
  <link rel="stylesheet" href="/styles/rest.css" media="print" onload="this.media='all'" />
</head>
```

The `media="print"` trick makes the browser treat the sheet as non-blocking, then promotes it on load.
It works, and it is a hack; frameworks that split CSS per route give you the same effect without it.

**Split CSS per chunk so a route only pays for its own styles:**

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    cssCodeSplit: true, // one CSS file per JS chunk, not one file for the app
    rollupOptions: {
      output: { assetFileNames: "assets/[name]-[hash][extname]" },
    },
  },
});
```

Hashed filenames are what let the CSS be cached for a year — see
[Chapter ?? — Frontend Caching Strategies](#ch-frontend-caching-strategies).

### Icons

Icons are the asset category where the wrong import style costs the most, because the mistake is
invisible until someone reads the bundle report.

| Approach | Cost | Use when |
| -------- | ---- | -------- |
| Inline SVG in the component | Zero requests, bytes in the JS bundle | A handful of icons |
| SVG sprite plus `<use>` | One cacheable request, CSS-styleable | Dozens of icons across many routes |
| Per-icon module imports | Bytes for exactly what you use | A library that supports it |
| Barrel import from an icon package | The whole library, often 300 KB+ | Never |
| Icon font | An extra render-blocking font, plus poor a11y | Legacy only |

```typescript
// ❌ Pulls the module graph for the entire pack; tree shaking often cannot save you
import { FaHome, FaUser } from "react-icons/fa";

// ✅ One module per icon
import FaHome from "react-icons/fa/FaHome";
import FaUser from "react-icons/fa/FaUser";
```

## When to Use It

| Symptom | Fix | Which metric moves |
| ------- | --- | ------------------ |
| Text invisible for a second on first load | `font-display: swap` | LCP |
| Text visibly jumps when the font arrives | A metric-matched fallback face | CLS |
| LCP is a heading, not an image | Preload that one font file | LCP |
| First paint waits on a large stylesheet | Inline critical CSS, defer the rest | LCP |
| A route loads styles for the whole app | `cssCodeSplit` | LCP |
| Bundle report shows 300 KB of icons | Per-icon imports or a sprite | LCP and INP |

## Common Mistakes

❌ **Loading fonts from a third-party origin.** A font-service `<link>` costs a DNS lookup, a TLS
handshake and a CSS round trip before the font file is even requested, and the shared-cache benefit it
used to offer has been gone since browsers partitioned their caches.
✅ Self-host. Build tooling can download at build time so you keep the convenience.

❌ **Preloading every weight.** Six preloads compete with the LCP image for bandwidth and make the
metric worse.
✅ Preload only the faces that render in the first viewport — usually one.

❌ **Preload without `crossorigin`.** The font downloads twice and the preload is wasted.
✅ Always `crossorigin` on `as="font"`.

❌ **No `unicode-range`.** You ship Cyrillic and Greek glyphs to an English-only page.
✅ Subset, and declare the range so the browser can skip the file entirely for unmatched text.

❌ **Inlining "critical CSS" that is most of the stylesheet.** Past roughly 14 KB the inline block
itself delays the first paint, and it is uncacheable.
✅ Keep it to the first viewport, and let route-split CSS carry the rest.

## 🔑 Key Takeaways

- CSS is render-blocking and fonts have no graceful degradation, which is what makes both harder than images.
- `font-display: swap` trades a blank page for a reflow, and a metric-matched fallback face removes the reflow.
- Self-host and subset fonts; a third-party font origin costs a connection and no longer buys a shared cache.
- Preload only the faces that render in the first viewport, always with `crossorigin`.
- Inline the first viewport's CSS, keep it under ~14 KB, and split the rest per route.

## Interview Questions

**Q: Your LCP element is a heading in a web font, and LCP is 3.4 s. What do you change?**

Preload that single font file with `crossorigin`, set `font-display: swap` so the text paints in the
fallback immediately, and add a metric-matched fallback face so the swap does not shift layout. Then
check the font is same-origin — if it is coming from a third-party host, the connection setup alone
can account for several hundred milliseconds before the file is even requested.

**Q: What is the difference between FOIT and FOUT, and which do you choose?**

FOIT is invisible text while the font loads; FOUT is fallback text that reflows when it arrives. FOUT
is the better default because the reflow is fixable with metric overrides, whereas invisible text
directly delays LCP and there is nothing you can do about it except make the font arrive faster. The
exception is `font-display: optional` for decorative faces you would rather not show at all than shift
the page for.

**Q: Why is `crossorigin` needed on a font preload for a same-origin font?**

Font fetches are always made in CORS mode, so a preload without `crossorigin` creates a cache entry
in a different mode from the one the CSS request will use. The two never match, and the browser
downloads the file twice — the preload becomes pure overhead. It is the single most common way a
preload makes performance worse rather than better.

**Q: When would you *not* bother with critical CSS?**

When the framework already splits CSS per route and the per-route sheet is small — a few kilobytes of
route CSS is not worth the build complexity and the uncacheable inline block. Critical CSS earns its
place on content sites with one large global stylesheet and a first paint that measurably waits on it.
Measure the blocking time before adding the machinery.

## What to Read Next

- [Chapter ?? — Image Optimisation](#ch-image-optimisation) — the other half of asset weight, and the usual LCP element
- [Chapter ?? — Frontend Caching Strategies](#ch-frontend-caching-strategies) — the hashed filenames and cache headers these assets rely on
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — which of LCP and CLS each choice here moves
