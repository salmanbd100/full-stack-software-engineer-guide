---
title: Caching and Asset Delivery
part: 4
chapter: 9
slug: asset-delivery
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-09-24
tags: [caching, cache-control, cdn, images, fonts, css, avif, font-display, critical-css, performance]
in_book: true
---

# Caching and Asset Delivery {#ch-asset-delivery}

> Send every image, font and stylesheet at the right size, cache each one for as long as you can defend, and make sure a deploy can always replace it.

**In this chapter:** the cache layers and who controls each · `Cache-Control` per resource · content hashing and the CDN · images, formats and `srcset` · fonts without the reflow · render-blocking CSS

## 💡 The Core Idea

Static assets are most of a page's bytes, and two questions decide their delivery. The first is
**how it fails while loading**. An image fails gently: a gap, then content. A missing stylesheet
means the browser paints nothing, and a late font means invisible or reflowing text. So images ask
"how few bytes", and fonts and CSS ask "what does the user see before this arrives".

The second is **how long a copy can be reused**. Caching trades speed against staleness. What makes
aggressive caching safe is **immutability by URL**: if the URL changes whenever the content does,
cache it for a year, because nobody asks for the old URL again.

## How It Works

### Four cache layers, and who controls each

```mermaid
flowchart LR
  A[Browser cache<br/>headers only] -->|miss| B[Service worker<br/>your code]
  B -->|miss| C[CDN edge<br/>headers + purge API]
  C -->|miss| D[(Origin)]
```

**Each layer is a chance to skip the next one — and a place a stale copy can hide.**

You set the browser cache **only through headers**, and you cannot purge it. You can purge the CDN
by API. The service worker is your own code, so a bug there can serve a stale app forever —
[Chapter ?? — Service Workers, Caching and Offline](#ch-service-workers) covers its update lifecycle.

### `Cache-Control`, per resource type

| Resource | Header | Reasoning |
| -------- | ------ | --------- |
| HTML document | `no-cache` | Must revalidate: it names the hashed assets |
| Hashed JS, CSS, images, fonts | `public, max-age=31536000, immutable` | The URL changes when the content does |
| Public API response | `public, max-age=60, s-maxage=300, stale-while-revalidate=60` | Short in the browser, longer at the edge |
| User-specific data | `private, max-age=600` | The browser may cache it; a shared CDN must not |
| Anything sensitive | `no-store` | No copy written anywhere |

Two headers get confused all the time. `no-cache` does **not** mean "do not cache". It means "keep a
copy, but revalidate before every use". `no-store` is the one that means keep nothing. Putting
`no-cache` on a bank statement still leaves it on disk. `immutable` stops a reload revalidating assets.

### Content hashing makes the year-long cache safe

**Cache busting — query string against hashed path:**

```html
<!-- ❌ Some intermediaries strip or ignore the query, and the path is unchanged -->
<link rel="stylesheet" href="styles.css?v=2" />

<!-- ✅ The hash is in the path, so new content is a new URL -->
<link rel="stylesheet" href="styles.a1b2c3.css" />
```

Every bundler emits hashed names by default. The HTML must be `no-cache`, because it is the only
thing that names the hashed files. Cache it, and users keep loading last week's bundle. The pattern
is **immutable assets, revalidated document.**

### The CDN is a shared cache

A CDN keeps copies at edge servers near the user, so most requests never reach your origin. It reads
the same headers as the browser, plus two that matter at the edge.

- **`s-maxage`** sets the lifetime for shared caches only. You can cache an API response for five
  minutes at the edge and one minute in the browser, and purge the edge copy when data changes.
- **`stale-while-revalidate`** lets the edge serve the old copy at once while it fetches a new one
  in the background. Users never wait for the origin, and the copy is at most one request behind.

The danger is the word *shared*. A personalised page cached without `private` hands one user's data
to the next. `Vary: Cookie` avoids that but splits the cache per user, so keep personal data out.

> ⚠️ **Moving target:** framework caching — Next.js in particular — has changed its defaults across
> several majors, and each hosting platform adds its own cache headers. The durable principle is that
> every cache needs an explicit freshness window and an explicit invalidation trigger. Check what
> your framework actually sends in the response headers.

### Images: format, size, and the box

AVIF is roughly half the size of JPEG for the same photograph, and WebP about 70%. SVG suits logos
and icons. Past a point, quality buys nothing visible: **JPEG 85, WebP 80, AVIF 65** — AVIF uses a
different scale, which is why its number looks low.

**The same image at several widths:**

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

`srcset` lists the widths that exist. `sizes` tells the browser how wide the image will *render*,
which it needs before layout. A wrong `sizes` is the common bug: the browser picks the wrong file
and either wastes bytes or looks blurry. Use `<picture>` when the image itself changes — a different
crop per breakpoint, or AVIF with a JPEG `<img>` fallback. Without that fallback, an old browser
shows nothing. For user uploads, an image CDN does all of this through URL parameters, because you
cannot build the variants ahead of time.

### Fonts: choose which failure you get

While a web font loads, the browser must show something. `font-display` picks the failure.

| Value | Behaviour | Costs |
| ----- | --------- | ----- |
| `block` | Invisible text for ~3 s, then the web font | Blank text, and a late LCP if that text is the LCP element |
| `swap` | Fallback at once, swap when ready | A reflow, which is CLS |
| `optional` | Web font used only if it arrived in ~100 ms | Neither, but it may never appear on a slow connection |

`swap` is the default choice, because you can remove a reflow but not a blank page. The reflow
happens because the fallback and the web font measure differently. So make them measure the same.

**A subset variable font, plus a fallback with matched metrics:**

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-latin-var.woff2") format("woff2");
  font-weight: 100 900; /* one variable file instead of six static weights */
  font-display: swap;
  unicode-range: U+0000-00FF, U+2018-201E; /* Latin plus real quote marks */
}

@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
}
```

Then use `font-family: "Inter", "Inter Fallback", sans-serif`. Build tools such as `next/font`
generate that fallback face for you. Preload only the faces in the first viewport, and always with
`crossorigin` — font requests use CORS mode, so without it the browser fetches the file twice.

> ⚠️ **Moving target:** font tooling is renamed every couple of years. The durable principle is to
> self-host the font, subset it, and pair it with a metrics-matched fallback.

### CSS is render-blocking, and that is correct

Painting unstyled content and then restyling it is worse than waiting. So do not unblock the
stylesheet — shrink it.

**Critical CSS inline, the rest deferred:**

```html
<!-- Under ~14 kB keeps the first-viewport rules in the first network round trip -->
<style>.header { height: 64px; } .hero { min-height: 60vh; }</style>
<link rel="stylesheet" href="/styles/rest.css" media="print" onload="this.media='all'" />
```

The `media="print"` swap is a hack; splitting CSS per route gets the same result. For icons, use
an SVG sprite with `<use>` — one cacheable request. An icon font blocks rendering and hurts accessibility.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| Hashed JS, CSS, images, fonts | `max-age=31536000, immutable` | The URL changes with the content |
| The HTML document | `no-cache` | It names the hashed assets |
| A public API response behind a CDN | `s-maxage` plus `stale-while-revalidate` | Fast at the edge, never waits on the origin |
| Per-user data | `private`, or no CDN caching | Or one user's data reaches another |
| Body text in a web font | `swap` plus a matched fallback | No blank text and no reflow |

## Common Mistakes

❌ **Caching the HTML alongside the assets.** Users keep loading the old release, and no deploy fixes it.
✅ `no-cache` on the document, `immutable` on hashed assets.

❌ **`no-cache` for sensitive data.** It allows a stored copy; it only requires revalidation.
✅ `no-store` is the one that means keep nothing.

❌ **An image with no `width`/`height` or `aspect-ratio`.** You traded bytes for a layout shift.
✅ Always reserve the box — see [Chapter ?? — Core Web Vitals](#ch-core-web-vitals).

❌ **`preload` on a font without `crossorigin`.** The file is fetched twice.
✅ Always add `crossorigin`, even on the same origin.

## 🔑 Key Takeaways

- Content-hashed URLs are what make a year-long cache safe, because new content always means a new URL.
- Immutable assets with a revalidated HTML document is the pattern that lets a deploy take effect at once.
- `no-cache` means revalidate before use, `no-store` means keep no copy, and `private` keeps a response out of the CDN.
- Images fail gently but fonts and CSS do not, so fonts and CSS need a plan for the moment before they arrive.
- `font-display: swap` with a metrics-matched fallback face gives neither blank text nor a reflow.

## Interview Questions

**Q: How would you set cache headers for a single-page application?**

Hash every asset and serve it with `max-age=31536000, immutable`. Serve the HTML with `no-cache`.
The document is the only thing naming the hashed files, so it must revalidate on every load. Cache
it, and users keep booting the previous release from a warm cache.

**Q: What is the difference between `no-cache` and `no-store`?**

`no-cache` allows a stored copy but revalidates it before use, so a 304 still saves the download.
`no-store` forbids any copy — so `no-cache` on sensitive data still leaves it on disk.

**Q: A user says the app is stuck on an old version and a reload does not help. What do you check first?**

A service worker serving a cached shell with no update path. It is the one layer where a bug lives
on the device and cannot be purged from the server. The second suspect is HTML cached with a long
`max-age`. Check both in seconds: the document's response headers, and whether a service worker is
registered.

**Q: When would you not cache an API response at the CDN?**

When the response depends on who is asking. A shared cache serves one copy to everyone, so a
personalised response leaks. `Vary: Cookie` avoids the leak but gives every user their own cache
entry, so the hit rate collapses. Split the page instead: cache the public data, and fetch the
personal part separately with `private`.

**Q: Why is a late-arriving font a Core Web Vitals problem rather than a cosmetic one?**

Both options cost a metric. Blocking hides the text, which delays LCP if it is the largest element.
Swapping reflows the text, which is CLS. The fix is `swap` plus a fallback with overridden metrics,
so the swap changes the glyphs but not the line count.

## What to Read Next

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — the LCP and CLS numbers these decisions move
- [Chapter ?? — Loading, Code Splitting and Bundle Budgets](#ch-loading-and-code-splitting) — why vendor chunks and cache lifetime are the same argument
- [Chapter ?? — Caching](#ch-caching) — the same trade at the server and database layer
