---
title: Images, Fonts, and Assets
part: 3
chapter: 0
slug: nextjs-assets
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-06
tags: [nextjs, images, fonts, cls, performance, assets]
in_book: true
---

# Images, Fonts, and Assets {#ch-nextjs-assets}

> Ship the hero image and the brand font without paying for either in layout shift or wasted bytes.

**In this chapter:** what `next/image` actually does · the `sizes` prop everyone gets wrong · `next/font` and metric-matched fallbacks · `public/` and static files · an asset budget you can defend

## 💡 The Core Idea

On most pages, images and fonts are the largest bytes on the wire and the two biggest causes of things
jumping around while the page loads. Next.js does not make them smaller by magic. It gives you two
components whose whole job is to make the browser **reserve the right space before the file arrives**,
and to **download only the size you actually display**.

Everything in this chapter follows from that. Layout shift comes from an element whose size is unknown
until the byte arrives. Wasted bytes come from sending a 2000-pixel image into a 400-pixel slot. The
components fix the first automatically and the second only if you tell them the slot size.

> ⚠️ **Moving target:** Next.js 16 tightened the image configuration. `images.domains` is gone —
> `remotePatterns` replaces it. `images.qualities` is now an allow-list defaulting to `[75]`, so a
> `quality={90}` prop fails unless the value is declared. And `16` was dropped from the default
> `imageSizes`. The durable principle is unchanged: an image proxy that resizes on demand is a
> denial-of-service surface, so every variable it accepts has to be an allow-list.

## How It Works

### The three jobs of `next/image`

**A single component, three separate behaviours:**

```tsx
import Image from "next/image";
import hero from "./hero.png";

export function Hero() {
  // Local import: width, height and a blur placeholder come from the file itself
  return <Image src={hero} alt="Ledger dashboard" placeholder="blur" priority />;
}
```

| Job                 | What it does                                                   | What you must supply           |
| ------------------- | -------------------------------------------------------------- | ------------------------------ |
| Reserve space       | Emits an aspect ratio so the box exists before the bytes do     | `width` + `height`, or `fill`  |
| Pick a size         | Generates a `srcset` and lets the browser choose                | `sizes`                        |
| Serve a good format | Converts to AVIF or WebP on request, caches the result          | Nothing — it is the default    |

The first job is why `next/image` reduces Cumulative Layout Shift. A local import gives it the
dimensions for free. A remote URL cannot, which is why `width` and `height` are required there — they
describe the **aspect ratio**, not the display size.

### `sizes` is the prop that decides the bytes

`sizes` tells the browser how wide the image will be *before* layout runs, so it can pick from the
`srcset` while the CSS is still loading. Get it wrong and the browser guesses `100vw` and downloads the
largest variant on a phone.

```tsx
// ❌ fill with no sizes — the browser assumes full width and takes the biggest file
<Image src="/card.jpg" alt="" fill />

// ✅ one column on mobile, three on desktop
<Image src="/card.jpg" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />
```

The rule: **if the image is not full-bleed, `sizes` is not optional.** Write it as media queries that
mirror your grid, not as a single pixel value, unless the box really is fixed.

### `priority`, and only for one image

Images lazy-load by default. `priority` opts one out, preloading it and skipping the lazy attribute.
It belongs on the Largest Contentful Paint element and nowhere else — marking five images `priority`
means the browser fetches five things at once and none of them arrive sooner.

### Remote images are an allow-list

```typescript
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.example.com", pathname: "/assets/**" }],
    qualities: [60, 75],
  },
};

export default config;
```

Without the pattern, the component throws rather than proxying an unknown host. That is deliberate:
an open image optimiser will resize anything anyone asks it to, which is somebody else's bandwidth
bill running through your infrastructure.

### `next/font` removes two round trips and the shift

A `<link>` to a font service costs a DNS lookup, a connection, a CSS file, and only then the font
itself — four serial steps before any text is styled. `next/font` downloads the file **at build time**,
serves it from your own origin, and generates a fallback whose metrics are adjusted to match. Text is
laid out at roughly the right size from the first paint, so swapping in the real font barely moves it.

```typescript
// app/fonts.ts — declare each font once, at module scope
import { Inter, Source_Serif_4 } from "next/font/google";

export const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
export const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });
```

```tsx
// app/layout.tsx
import { sans, serif } from "./fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Three details that matter. `subsets` decides how many glyphs ship — omitting it sends every script the
family supports. A **variable font needs no `weight`** and covers the whole range in one file, which is
usually smaller than two static weights. And fonts preload only on routes that use them, so a font
declared in the root layout preloads everywhere, whether that page sets it or not.

> ⚠️ Calling the font function inside a component creates a new instance on every render. Declare fonts
> in one module, export them, and reference the CSS variable from your stylesheet.

### Everything else: `public/`

Files in `public/` are served from the root path, unprocessed and uncompressed by the framework, with a
long cache lifetime only if your host sets one. It is the right home for `favicon.ico`, `robots.txt`,
and Open Graph images — and the wrong home for a 4 MB PNG that nothing resizes.

## When to Use It

| Situation                                  | Choose                                    | Why                                     |
| ------------------------------------------ | ----------------------------------------- | --------------------------------------- |
| Image bundled with the code                | `import` it and pass to `<Image>`         | Dimensions and blur hash are free       |
| Image from a CMS or S3                     | `<Image>` with `width`/`height` + pattern | Aspect ratio still prevents the shift   |
| `output: 'export'`, no server              | `images.unoptimized` or a custom loader   | There is no optimiser at runtime        |
| Very high image volume                     | A custom loader pointing at an image CDN  | Resizing is CPU work you can rent       |
| Decorative SVG icon                        | Inline it, or plain `<img>`               | Optimising vectors gains nothing        |
| Brand font                                 | `next/font/local` with `woff2`            | Self-hosted, one request, no shift      |

## Common Mistakes

**❌ `fill` without `sizes`.** The browser assumes the image is viewport-wide and downloads the largest
variant. This is the single most common `next/image` review comment.

**✅ Give `sizes` the same breakpoints as your grid** — it is the only signal the browser has before CSS.

**❌ `priority` on every image above the fold.** Preloading competes with itself. One LCP candidate,
one `priority`.

**❌ Passing display dimensions as an aspect ratio.** `width={16} height={9}` renders a 16-pixel image.
Use the real intrinsic size, or `fill` inside a sized parent.

**❌ Loading a Google font with a `<link>` tag "because it is simpler".** It costs the round trips
`next/font` exists to remove, and reintroduces the shift its fallback metrics remove.

**❌ Treating `public/` as a CDN.** Nothing there is resized, converted, or fingerprinted. Large media
belongs behind an image or asset service.

## 🔑 Key Takeaways

- `next/image` prevents layout shift by reserving an aspect ratio, which is why remote images still need `width` and `height`.
- `sizes` decides how many bytes the browser downloads; without it, `fill` fetches the largest variant.
- `priority` marks the LCP image and should appear once per page.
- `next/font` self-hosts the file at build time and ships a metric-matched fallback, removing both the round trips and the swap.
- Remote image hosts and image qualities are allow-lists because an open resizer is an abuse surface.

## Interview Questions

**Q: How does `next/image` reduce Cumulative Layout Shift?**

It emits a box with the image's aspect ratio before the file loads, so the space is reserved from the
first paint. A local import supplies those dimensions automatically; a remote URL cannot be inspected at
build time, so `width` and `height` are required to describe the ratio. Without either, the element has
no size until the bytes arrive and everything below it moves.

**Q: What does the `sizes` prop actually do, and what happens without it?**

It tells the browser the rendered width of the image in advance, so it can choose the right entry from
the generated `srcset` before CSS has been applied. Without it, a `fill` image is treated as full
viewport width, so a phone downloads a desktop-sized file. It is a bytes decision, not a layout one.

**Q: Why does `next/font` self-host rather than link to Google Fonts?**

To remove serial network work and to control the fallback. A stylesheet link means DNS, connection,
CSS, then font — four steps before text is styled — and it hands a third party a request from every one
of your users. Self-hosting collapses that to one request from your own origin, and the generated
fallback font is metric-adjusted so the swap barely shifts the text.

**Q: When would you turn Next.js image optimisation off?**

When there is no server to do it, or when something better already does. A static export has no
optimiser at runtime, so `unoptimized` or a custom loader is the only option. At high volume, on-demand
resizing is real CPU cost, and pointing a loader at a dedicated image CDN moves that work somewhere it
is cached globally and priced accordingly.

## What to Read Next

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — what LCP and CLS are actually measuring
- [Chapter ?? — Image Optimisation](#ch-image-optimization) — formats, compression and CDNs without a framework
- [Chapter ?? — Deployment and Runtime](#ch-nextjs-deployment-and-runtime) — what the image optimiser costs when you host it yourself
