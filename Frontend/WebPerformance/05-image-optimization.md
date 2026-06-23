# Image Optimization

## Overview

Images are usually the **biggest files on a page** — often more than half of total page weight. Optimizing them is the easiest large win in web performance.

> **Key Truth:**
> Five unoptimized images can weigh 5 MB. The same images optimized weigh ~500 KB. Same look, 10× faster.

---

## Table of Contents
- [Modern Formats](#modern-formats)
- [Compression](#compression)
- [Responsive Images](#responsive-images)
- [Preventing Layout Shift](#preventing-layout-shift)
- [Image CDNs](#image-cdns)
- [Interview Questions](#interview-questions)

---

## Modern Formats

Picking the right format is the biggest single win.

| Format | Relative Size | Best For |
|--------|---------------|----------|
| **AVIF** | ~50% of JPEG | Photos (best compression) |
| **WebP** | ~70% of JPEG | Photos (wider support) |
| **JPEG** | baseline | Photos (universal fallback) |
| **PNG** | larger | Graphics needing transparency |
| **SVG** | tiny | Logos, icons (vector, scales freely) |

### 💡 **Serve AVIF/WebP With a Fallback**

The `<picture>` element lets the browser pick the first format it supports.

```html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Description" width="800" height="600" />
</picture>
```

The browser tries AVIF, then WebP, then the JPEG that works everywhere.

> ⚠️ Always include a fallback `<img>`. Never ship AVIF-only — older browsers see a broken image.

---

## Compression

| Type | What It Does | Use For |
|------|--------------|---------|
| **Lossy** | Drops some detail | Photos, large images |
| **Lossless** | Removes hidden data only | Logos, screenshots |

**Sharp** is the standard Node.js tool for compressing and converting:

```typescript
import sharp from 'sharp';

// Resize and convert one source image to several outputs
await sharp('input.jpg').resize(800).jpeg({ quality: 85 }).toFile('out.jpg');
await sharp('input.jpg').resize(800).webp({ quality: 80 }).toFile('out.webp');
await sharp('input.jpg').resize(800).avif({ quality: 65 }).toFile('out.avif');
```

**Quality sweet spots** — above these you get bigger files with little visible gain:

| Format | Quality |
|--------|---------|
| JPEG | 85 |
| WebP | 80 |
| AVIF | 65 (different scale) |

---

## Responsive Images

Sending a 1600px image to a 400px phone wastes 4× the bandwidth. Offer several sizes and let the browser choose.

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Responsive image"
  width="800"
  height="600"
/>
```

| Attribute | Meaning |
|-----------|---------|
| `srcset` | "Here are the same image at several widths" |
| `sizes` | "At each breakpoint, the image renders this wide" |

**`srcset` vs `<picture>`:**

| Use Case | Use This |
|----------|----------|
| Same image, different sizes | `srcset` + `sizes` |
| Different crop per screen (art direction) | `<picture>` with `media` |
| Modern format with fallback | `<picture>` with `type` |

### 💡 **Next.js Image (Easy Way)**

Generates responsive sizes and modern formats automatically:

```tsx
import Image from 'next/image';

function Banner(): JSX.Element {
  return (
    <Image
      src="/photo.jpg"
      alt="Photo"
      width={800}
      height={600}
      sizes="(max-width: 768px) 100vw, 50vw"
      quality={85}
    />
  );
}
```

---

## Preventing Layout Shift

An image without dimensions pushes content down when it loads, hurting CLS. Always tell the browser the size up front.

```html
<!-- Explicit dimensions -->
<img src="photo.jpg" alt="Photo" width="800" height="600" />

<!-- Or aspect-ratio for fluid layouts -->
<img src="photo.jpg" alt="Photo" style="aspect-ratio: 4 / 3; width: 100%;" />
```

> **Key Insight:**
> `width`/`height` (or `aspect-ratio`) let the browser reserve the correct space before the image arrives — no jump. See [Core Web Vitals → CLS](./01-core-web-vitals.md#cls--cumulative-layout-shift).

---

## Image CDNs

Image CDNs resize, convert format, and deliver from edge servers — all from URL parameters. No build step.

| Service | Highlight |
|---------|-----------|
| **Cloudinary** | Most features, generous free tier |
| **Imgix** | Fast, simple URL API |
| **Cloudflare Images** | Cheap, integrated |
| **Vercel / Next.js** | Built into Next.js |

```typescript
// Cloudinary: f_auto picks AVIF/WebP, q_auto picks quality, w_ sets width
function cloudinary(id: string, width: number): string {
  return `https://res.cloudinary.com/demo/image/upload/w_${width},q_auto,f_auto/${id}`;
}

const src = cloudinary('hero', 800);
const srcSet = [400, 800, 1200].map((w) => `${cloudinary('hero', w)} ${w}w`).join(', ');
```

---

## Interview Questions

**Q1: What are the best image formats for the web?**

AVIF (smallest, ~50% of JPEG), WebP (wider support, ~70% of JPEG), JPEG (universal fallback for photos), PNG (transparency), and SVG (logos/icons). Serve AVIF/WebP via `<picture>` with a JPEG fallback.

**Q2: How do you implement responsive images?**

Use `srcset` with width descriptors and a `sizes` attribute so the browser downloads the best size for the device. Use `<picture>` when you need different crops per screen or format fallbacks.

**Q3: `srcset` vs `<picture>`?**

`srcset` switches between sizes of the *same* image. `<picture>` switches between *different* images — for art direction (different crops) or format fallbacks (AVIF → WebP → JPEG).

**Q4: How do you prevent layout shift from images?**

Always set `width` and `height` (or `aspect-ratio`) so the browser reserves space before the image loads. This is one of the easiest CLS fixes.

**Q5: What does an image CDN do?**

Resizes, converts format, compresses, and serves from edge servers — controlled by URL parameters like `w_800,q_auto,f_auto`. It removes the need for a manual build pipeline and adapts output per request.

**Q6: How do you measure image optimization?**

Lighthouse's "Properly size images" and "Serve images in next-gen formats" audits, the Network tab to compare before/after bytes, and WebPageTest's image analysis.

---

## Summary

### Checklist
- [ ] Modern formats (AVIF/WebP) with a fallback
- [ ] Compress (quality ~85 JPEG, ~80 WebP, ~65 AVIF)
- [ ] Responsive sizes with `srcset` + `sizes`
- [ ] Lazy-load below-the-fold images
- [ ] Set `width`/`height` to prevent CLS
- [ ] Serve through a CDN

### Impact
| Optimization | Savings |
|--------------|---------|
| Modern format (AVIF) | ~50% smaller |
| Responsive sizes | 60–80% on mobile |
| Compression | 30–50% smaller |

> **Key Insight:**
> If you optimize one thing for performance, optimize images. Biggest return, least effort.

---

[← Caching Strategies](./04-caching-strategies.md) | [Next: Bundle Optimization →](./06-bundle-optimization.md)
