# Image Optimization

## Overview

Images are usually the **biggest files on a webpage** — often more than 50% of total page weight. Optimizing images is one of the easiest ways to make sites faster.

> **Key Truth:**
> A page with 5 unoptimized images can be 5MB. The same page with optimized images can be 500KB. Same look, 10x faster.

---

## Table of Contents
- [Modern Image Formats](#modern-image-formats)
- [Image Compression](#image-compression)
- [Responsive Images](#responsive-images)
- [Lazy Loading Images](#lazy-loading-images)
- [CDN and Delivery](#cdn-and-delivery)
- [Interview Questions](#interview-questions)

---

## Modern Image Formats

### 💡 **Format Comparison**

Choosing the right format is the **biggest single win** in image optimization.

**File Sizes (Same Image, Same Quality):**

| Format | Size | Compared to JPEG | Notes |
|--------|------|-------------------|-------|
| **PNG** | 150 KB | 50% larger | Lossless, has transparency |
| **JPEG** | 100 KB | Baseline | Universal support |
| **WebP** | 70 KB | 30% smaller | Wide support |
| **AVIF** | 50 KB | 50% smaller | Best compression |
| **SVG** | 5 KB | Tiny | Vector, scalable, for icons |

### 💡 **Choosing the Right Format**

| Image Type | Best Format | Why |
|------------|-------------|-----|
| 📷 Photos | AVIF > WebP > JPEG | Best compression for photos |
| 🎨 Graphics | AVIF > WebP > PNG | Smaller than PNG |
| 🏷️ Logos | SVG > PNG | Scalable, tiny |
| 🔘 Icons | SVG (or icon fonts) | Crisp at any size |
| 🖼️ Transparent | AVIF > WebP > PNG | Modern formats are smaller |
| 🎬 Animation | AVIF/WebP > GIF | GIF is huge and limited |

### 💡 **Using WebP with Fallback**

Not all browsers support every format. Use the `<picture>` element to provide alternatives.

```html
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" />
</picture>
```

**How It Works:**

```
Browser checks: Do I support WebP?
    ↓ Yes → use image.webp
    ↓ No  → use image.jpg
```

### 💡 **Using AVIF (Best Choice)**

AVIF is the newest and most efficient. Add it as the first option, with WebP and JPEG as fallbacks.

```html
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" />
</picture>
```

**Browser Tries Each in Order:**

1. AVIF (newest, smallest)
2. WebP (good support)
3. JPEG (works everywhere)

> **Key Insight:**
> Always provide a fallback. Never use only AVIF — older browsers will see broken images.

---

## Image Compression

### 💡 **Lossless vs Lossy**

| Type | What Happens | File Size | When to Use |
|------|-------------|-----------|-------------|
| **Lossless** | Removes hidden data only | Larger | Logos, screenshots |
| **Lossy** | Removes some image detail | Smaller | Photos, large images |

### 💡 **Compression with Sharp (Node.js)**

```bash
npm install sharp
```

```javascript
const sharp = require('sharp');

// Resize and compress JPEG
await sharp('input.jpg')
  .resize(800, 600, { fit: 'cover' })
  .jpeg({ quality: 85, progressive: true })
  .toFile('output.jpg');

// Convert to WebP
await sharp('input.jpg')
  .webp({ quality: 80 })
  .toFile('output.webp');

// Convert to AVIF
await sharp('input.jpg')
  .avif({ quality: 65 }) // AVIF uses different quality scale
  .toFile('output.avif');
```

### 💡 **Quality Sweet Spots**

These quality settings give the best size/quality tradeoff:

| Format | Recommended Quality | Notes |
|--------|--------------------|----|
| **JPEG** | 85 | Sweet spot for photos |
| **WebP** | 80 | Good balance |
| **AVIF** | 65 | Different scale, looks great |
| **PNG** | Use lossless tools | quality not configurable |

### 💡 **Build-Time Optimization**

**Next.js (Automatic):**

```jsx
import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  quality={85} // Default 75
/>
```

**Vite Plugin:**

```javascript
// vite.config.js
import imagemin from 'vite-plugin-imagemin';

export default {
  plugins: [
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 85 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: {
        plugins: [{ removeViewBox: false }]
      }
    })
  ]
};
```

---

## Responsive Images

### 💡 **The Problem**

Sending the same big image to every device wastes bandwidth.

```
Desktop user (1920px wide screen)  → 1600px image → great
Mobile user (400px wide screen)    → 1600px image → wastes 4x bandwidth!
```

### 💡 **Solution: srcset and sizes**

Tell the browser about multiple image sizes. The browser picks the best one.

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w,
    image-1600.jpg 1600w
  "
  sizes="(max-width: 600px) 400px,
         (max-width: 1200px) 800px,
         1200px"
  alt="Responsive image"
/>
```

**How to Read This:**

| Attribute | Meaning |
|-----------|---------|
| `srcset` | "Here are images at different sizes" |
| `sizes` | "At each screen size, the image is this wide" |

**For Retina Displays (Pixel Density):**

```html
<img
  src="image-1x.jpg"
  srcset="image-1x.jpg 1x, image-2x.jpg 2x, image-3x.jpg 3x"
  alt="Retina-ready image"
/>
```

### 💡 **The `<picture>` Element (Art Direction)**

Use this when you want **completely different images** for different screen sizes (not just different sizes of the same image).

```html
<picture>
  <!-- Mobile: Portrait crop -->
  <source media="(max-width: 768px)" srcset="mobile-portrait.jpg" />

  <!-- Tablet: Square crop -->
  <source media="(max-width: 1200px)" srcset="tablet-square.jpg" />

  <!-- Desktop: Landscape -->
  <img src="desktop-landscape.jpg" alt="Responsive with art direction" />
</picture>
```

### 💡 **srcset vs picture: When to Use Each**

| Use Case | Use This |
|----------|----------|
| Same image, different sizes | `srcset` + `sizes` |
| Different images per screen | `<picture>` with `media` |
| Modern format with fallback | `<picture>` with `type` |

**Combined Example (Modern Format + Responsive):**

```html
<picture>
  <source
    type="image/avif"
    srcset="image-400.avif 400w, image-800.avif 800w"
    sizes="(max-width: 600px) 400px, 800px"
  />
  <source
    type="image/webp"
    srcset="image-400.webp 400w, image-800.webp 800w"
    sizes="(max-width: 600px) 400px, 800px"
  />
  <img
    src="image-800.jpg"
    srcset="image-400.jpg 400w, image-800.jpg 800w"
    sizes="(max-width: 600px) 400px, 800px"
    alt="Modern responsive image"
  />
</picture>
```

### 💡 **Next.js Image (Easy Way)**

```jsx
import Image from 'next/image';

function ResponsiveImage() {
  return (
    <>
      {/* Auto-responsive */}
      <Image
        src="/photo.jpg"
        alt="Photo"
        width={800}
        height={600}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={85}
        priority // Only for above-fold
      />

      {/* Fill the container */}
      <div style={{ position: 'relative', width: '100%', height: '400px' }}>
        <Image
          src="/banner.jpg"
          alt="Banner"
          fill
          style={{ objectFit: 'cover' }}
          sizes="100vw"
        />
      </div>

      {/* External images */}
      <Image
        src="https://example.com/image.jpg"
        alt="External"
        width={400}
        height={300}
      />
    </>
  );
}
```

---

## Lazy Loading Images

### 💡 **Native Lazy Loading**

The simplest method — just add an attribute.

```html
<!-- Lazy load (below the fold) -->
<img src="image.jpg" loading="lazy" alt="Description" />

<!-- Eager load (above the fold) -->
<img src="hero.jpg" loading="eager" alt="Hero" />
```

> ⚠️ **Warning:** Don't lazy-load your LCP image. Use `loading="eager"` for it.

### 💡 **Custom Lazy Loading**

For more control, use Intersection Observer:

```javascript
const lazyImages = document.querySelectorAll('img[data-src]');

const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.add('loaded');
      imageObserver.unobserve(img);
    }
  });
}, {
  rootMargin: '50px'
});

lazyImages.forEach(img => imageObserver.observe(img));
```

### 💡 **Progressive Loading (Blur-Up)**

Show a tiny blurry version first, then swap in the real image.

```jsx
import { useState, useEffect } from 'react';

function ProgressiveImage({ placeholder, src, alt }) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      style={{
        filter: loading ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s'
      }}
    />
  );
}
```

---

## CDN and Delivery

### 💡 **Image CDN Services**

Image CDNs do the work for you — automatic format conversion, resizing, and global delivery.

**Popular Options:**

| Service | Highlights |
|---------|-----------|
| **Cloudinary** | Most features, free tier |
| **Imgix** | Fast, simple URL API |
| **Cloudflare Images** | Cheap, integrated with CF |
| **Vercel/Next.js** | Built into Next.js |

```javascript
// Cloudinary example
const cloudinaryUrl = (publicId, transformations) =>
  `https://res.cloudinary.com/demo/image/upload/${transformations}/${publicId}`;

const url = cloudinaryUrl('sample', 'w_800,q_auto,f_auto');
// w_800: width 800px
// q_auto: automatic quality
// f_auto: automatic format (WebP/AVIF if supported)

// Imgix
const imgixUrl = `https://demo.imgix.net/image.jpg?w=800&auto=format,compress`;

// Cloudflare Images
const cfUrl = `https://example.com/cdn-cgi/image/width=800,quality=85,format=auto/image.jpg`;
```

### 💡 **Responsive Images with CDN**

```jsx
function CloudinaryImage({ publicId, alt }) {
  const getSrc = (width) =>
    `https://res.cloudinary.com/demo/image/upload/w_${width},q_auto,f_auto/${publicId}`;

  return (
    <img
      src={getSrc(800)}
      srcSet={`
        ${getSrc(400)} 400w,
        ${getSrc(800)} 800w,
        ${getSrc(1200)} 1200w
      `}
      sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
      alt={alt}
    />
  );
}
```

---

## Interview Questions

**Q1: What are the best image formats for the web?**

| Format | Use Case | Compression |
|--------|----------|-------------|
| **AVIF** | Photos (with fallback) | Best (50% smaller than JPEG) |
| **WebP** | Photos (broader support) | Great (30% smaller than JPEG) |
| **JPEG** | Photos | Universal support |
| **PNG** | Graphics with transparency | Lossless |
| **SVG** | Logos, icons | Scalable vector |

**Q2: How do you implement responsive images?**

```html
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, 800px"
  alt="Responsive"
/>
```

The browser picks the best image based on screen size and pixel density.

**Q3: Difference between srcset and picture?**

| Feature | `srcset` | `<picture>` |
|---------|----------|-------------|
| Use For | Same image, different sizes | Different images per context |
| Common Use | Resolution switching | Art direction, format fallback |

**Q4: How do you optimize images at build time?**

```javascript
// Sharp (manual)
await sharp('input.jpg')
  .resize(800)
  .webp({ quality: 80 })
  .toFile('output.webp');

// Next.js (automatic)
<Image src="/photo.jpg" width={800} height={600} />

// Webpack/Vite plugins for whole-project optimization
```

**Q5: What's the ideal image quality setting?**

| Format | Quality |
|--------|---------|
| **JPEG** | 85 |
| **WebP** | 80 |
| **AVIF** | 65 (different scale) |
| **PNG** | Use lossless tools |

Higher than these gives little visual gain but bigger files.

**Q6: How does native lazy loading work?**

```html
<img src="image.jpg" loading="lazy" />
```

Browser delays loading until image is near the viewport. Use `loading="eager"` for above-fold images.

**Q7: What's the role of an Image CDN?**

A CDN that specializes in images:

- ✅ Automatic resizing
- ✅ Automatic format (WebP/AVIF)
- ✅ Global edge caching
- ✅ URL-based transformations
- ✅ Big bandwidth savings

**Q8: How do you prevent layout shift with images?**

```html
<!-- Specify dimensions -->
<img src="image.jpg" width="800" height="600" />

<!-- Or use aspect-ratio -->
<img src="image.jpg" style="aspect-ratio: 16/9; width: 100%;" />
```

The browser reserves space before loading.

**Q9: What is progressive JPEG?**

A JPEG that loads in multiple passes (low → high quality).

**Benefits:**
- ✅ Better perceived performance
- ✅ Shows image immediately (blurry)
- ✅ Refines as it loads

```bash
jpegoptim --max=85 --all-progressive image.jpg
```

**Q10: How do you measure image optimization?**

- 📊 Lighthouse: "Properly size images" audit
- 🔍 Coverage tab: Check unused images
- 📡 Network tab: Compare before/after sizes
- 🌐 WebPageTest: Image analysis report

---

## Summary

### Optimization Checklist

- [ ] Use modern formats (AVIF/WebP) with fallbacks
- [ ] Compress images (quality 85 for JPEG)
- [ ] Use responsive images (`srcset`)
- [ ] Lazy-load below-fold images
- [ ] Specify dimensions (prevent CLS)
- [ ] Use an image CDN
- [ ] Strip metadata
- [ ] Serve from CDN/edge

### Performance Impact

| Optimization | Savings |
|--------------|---------|
| Modern format (AVIF) | 50% smaller files |
| Lazy loading | 50% bandwidth on average |
| Responsive sizes | 60-80% on mobile |
| Compression | 30-50% smaller |

### Tools

| Tool | Purpose |
|------|---------|
| **Sharp** | Node.js optimization |
| **Squoosh** | Online tool by Google |
| **ImageOptim** | macOS desktop app |
| **Cloudinary/Imgix** | Image CDNs |
| **Next.js Image** | Auto-optimization |

> **Key Insight:**
> Image optimization gives the biggest performance return for the least effort. If you only optimize one thing, optimize images.

---

[← Caching Strategies](./04-caching-strategies.md) | [Next: Bundle Optimization →](./06-bundle-optimization.md)
