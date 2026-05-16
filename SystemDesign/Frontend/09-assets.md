# Asset Management

## 💡 **Concept**

Assets (images, fonts, icons, CSS) often account for 50–90% of page weight. Optimizing them is one of the highest-impact performance levers. The strategy is: right format, right size, right caching, served from a CDN.

**How to answer in an interview:** "For images I'd use WebP with AVIF for modern browsers, serve responsive `srcset` for different screen sizes, and lazy-load everything below the fold. Fonts get subset and `font-display: swap`. Everything goes through CloudFront with long-lived cache headers and versioned filenames."

---

## Images

Images are the biggest LCP bottleneck. Optimize format, size, and delivery.

### Format Selection

| Format | Use When | Savings vs JPEG |
|--------|---------|----------------|
| **AVIF** | Modern browsers, photos | 30–50% smaller |
| **WebP** | Broad support, photos/illustrations | 25–35% smaller |
| **SVG** | Icons, logos, illustrations | Scalable, tiny |
| **PNG** | Transparency required | Lossless |
| **JPEG** | Universal fallback | Baseline |

```html
<!-- Progressive enhancement: browser picks best supported format -->
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero image" width="1200" height="600" fetchpriority="high" />
</picture>
```

### Responsive Images

```html
<!-- Serve correct size per viewport — browser picks from srcset -->
<img
  src="product-800.webp"
  srcset="
    product-400.webp  400w,
    product-800.webp  800w,
    product-1200.webp 1200w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
  alt="Product photo"
  loading="lazy"
  width="800"
  height="600"
/>
```

### Next.js Image Component

```typescript
import Image from "next/image";

interface ProductImageProps {
  src: string;
  alt: string;
  priority?: boolean;
}

const ProductImage: React.FC<ProductImageProps> = ({ src, alt, priority = false }) => (
  <Image
    src={src}
    alt={alt}
    width={800}
    height={600}
    priority={priority}           // preloads above-fold images (sets fetchpriority=high)
    placeholder="blur"
    sizes="(max-width: 768px) 100vw, 800px"
    style={{ objectFit: "cover" }}
  />
);
```

---

## Fonts

Fonts block rendering if not loaded. Minimize impact with subsetting and `font-display`.

```css
/* Self-hosted fonts — subset to latin only for most apps */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;     /* show system font until custom font loads — prevents FOIT */
  unicode-range: U+0000-00FF; /* Latin subset — reduces file size ~70% */
}
```

```html
<!-- Preload the primary font — cuts font discovery time -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

**Font performance checklist:**
- ✅ Use `woff2` format only (all modern browsers support it)
- ✅ Subset to characters you actually use
- ✅ `font-display: swap` to prevent invisible text
- ✅ Preload primary font file
- ❌ Don't load multiple font weights you don't use

---

## CSS

Critical CSS must load before first render. Non-critical CSS should be deferred.

```html
<!-- Critical CSS inlined — eliminates render-blocking request -->
<style>
  /* Above-fold styles only: ~14KB max */
  body { margin: 0; font-family: Inter, sans-serif; }
  .hero { min-height: 100vh; }
</style>

<!-- Non-critical CSS — loaded after render -->
<link rel="stylesheet" href="/styles/components.css" media="print" onload="this.media='all'" />
```

```typescript
// Vite / webpack — extract critical CSS automatically
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: true,           // split CSS per chunk
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",  // versioned filenames
      },
    },
  },
});
```

---

## CDN and Caching

All static assets belong on a CDN with long-lived cache headers. Versioned filenames eliminate stale cache.

```typescript
// Cache-Control headers by asset type
const cacheHeaders: Record<string, string> = {
  // Hashed filenames (JS, CSS, images) — cache forever, new hash on change
  "static/*":  "public, max-age=31536000, immutable",
  // HTML — always revalidate (contains cache-busted references)
  "*.html":    "no-cache",
  // API responses — short cache or no-store
  "/api/*":    "no-store",
};
```

```
CloudFront origin → S3 bucket (static assets)
                 ↓
User ←──────── Edge location (cache hit: <20ms, no origin request)
```

**CDN rules:**
- ✅ Enable gzip / Brotli compression
- ✅ Use hashed filenames (`main.a3f4b.js`) for aggressive caching
- ✅ Set `Vary: Accept-Encoding` on responses
- ❌ Never cache HTML with long TTLs

---

## Icons

Load only the icons you use.

```typescript
// ❌ Imports entire icon library — 500KB+
import { FaHome, FaUser } from "react-icons/fa";

// ✅ Import directly from specific icon pack
import FaHome from "react-icons/fa/FaHome";
import FaUser from "react-icons/fa/FaUser";

// ✅ Better: inline SVG sprite — one HTTP request, CSS-controllable
// <svg aria-hidden="true"><use href="/icons.svg#home" /></svg>
```

---

## Common Mistakes

❌ **`loading="lazy"` on the LCP image** — the hero image should be `loading="eager"` (default) with `fetchpriority="high"`  
❌ **No `width` and `height` on images** — causes CLS as images load  
❌ **Google Fonts in production** — self-host and subset instead; eliminates third-party DNS lookup  
❌ **No CDN for static assets** — assets served from your app server scale poorly and add latency

**Key insight:**

> Image format + CDN + cache headers are the three levers that move LCP the most. Get those right and most pages hit the "Good" threshold before any code change.

---
[← Back to SystemDesign](../README.md)
