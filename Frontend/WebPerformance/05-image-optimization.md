# Image Optimization

## Overview

Images account for 50%+ of average page weight. Optimizing images is one of the highest-impact performance improvements you can make. This guide covers modern formats, compression, responsive images, and delivery strategies.

## Table of Contents
- [Modern Image Formats](#modern-image-formats)
- [Image Compression](#image-compression)
- [Responsive Images](#responsive-images)
- [Lazy Loading Images](#lazy-loading-images)
- [CDN and Delivery](#cdn-and-delivery)
- [Interview Questions](#interview-questions)

## Modern Image Formats

### Format Comparison

Choosing the right image format is the single most impactful image optimization decision. Modern formats like AVIF and WebP use advanced compression algorithms that achieve dramatically better compression than legacy JPEG and PNG - often 40-50% smaller files at the same visual quality. AVIF is the newest and best, offering superior compression and supporting both lossy and lossless modes. WebP provides excellent compression with broader browser support. The key is using the `<picture>` element to provide multiple formats with graceful fallbacks, ensuring every browser gets the most efficient format it supports.

```javascript
// File size comparison (same image, same quality)
const formatSizes = {
  JPEG: '100 KB',    // Baseline
  PNG: '150 KB',     // 50% larger (lossless)
  WebP: '70 KB',     // 30% smaller than JPEG
  AVIF: '50 KB',     // 50% smaller than JPEG, 30% smaller than WebP
  SVG: '5 KB'        // Vector (scalable, smallest for icons/logos)
};
```

### WebP Format

```html
<!-- WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" />
</picture>

<!-- Browser support check -->
<script>
function supportsWebP() {
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}
</script>
```

### AVIF Format (Modern Best Choice)

```html
<!-- AVIF with WebP and JPEG fallback -->
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" />
</picture>
```

### Choosing Format

```javascript
const formatGuidelines = {
  Photos: 'AVIF > WebP > JPEG',
  Graphics: 'AVIF > WebP > PNG',
  Logos: 'SVG > PNG',
  Icons: 'SVG (or icon fonts)',
  Transparent: 'AVIF > WebP > PNG',
  Animation: 'AVIF/WebP > GIF'
};
```

## Image Compression

### Lossless vs Lossy

```bash
# Lossless (no quality loss, larger file)
pngquant image.png --quality=80-100

# Lossy (quality loss, smaller file)
jpegoptim --max=85 image.jpg

# Sharp (Node.js library)
npm install sharp
```

```javascript
const sharp = require('sharp');

// Resize and compress
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
  .avif({ quality: 65 })  // AVIF quality scale different
  .toFile('output.avif');
```

### Build-Time Optimization

```javascript
// Next.js automatic optimization
import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  quality={85}  // 1-100, default 75
/>

// Vite plugin
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

## Responsive Images

### srcset and sizes

Serving the same large image to all devices wastes bandwidth and slows load times, especially on mobile. The srcset attribute provides multiple image sizes, allowing browsers to choose the optimal size based on screen width and pixel density. The sizes attribute tells the browser what size the image will be displayed at different breakpoints, enabling smarter selection. This responsive images approach can reduce image data transfer by 60-80% for mobile users. Combined with modern formats, it's essential for performance on bandwidth-constrained networks.

```html
<!-- Different resolutions -->
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

<!-- Device pixel ratio -->
<img
  src="image-1x.jpg"
  srcset="image-1x.jpg 1x, image-2x.jpg 2x, image-3x.jpg 3x"
  alt="Retina-ready image"
/>
```

### Picture Element

```html
<!-- Art direction (different images for different sizes) -->
<picture>
  <!-- Mobile: Portrait crop -->
  <source
    media="(max-width: 768px)"
    srcset="mobile-portrait.jpg"
  />

  <!-- Tablet: Square crop -->
  <source
    media="(max-width: 1200px)"
    srcset="tablet-square.jpg"
  />

  <!-- Desktop: Landscape -->
  <img src="desktop-landscape.jpg" alt="Responsive with art direction" />
</picture>

<!-- Modern format with fallbacks -->
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

### Next.js Image Component

```jsx
import Image from 'next/image';

function ResponsiveImage() {
  return (
    <>
      {/* Automatic responsive images */}
      <Image
        src="/photo.jpg"
        alt="Photo"
        width={800}
        height={600}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={85}
        priority  // Preload if above fold
      />

      {/* Fill container */}
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
        unoptimized={false}  // Allow optimization
      />
    </>
  );
}
```

## Lazy Loading Images

### Native Lazy Loading

```html
<!-- Lazy load (below fold) -->
<img src="image.jpg" loading="lazy" alt="Description" />

<!-- Eager load (above fold) -->
<img src="hero.jpg" loading="eager" alt="Hero" />

<!-- Auto (browser decides) -->
<img src="image.jpg" loading="auto" alt="Description" />
```

### Intersection Observer

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
  rootMargin: '50px'  // Load 50px before visible
});

lazyImages.forEach(img => imageObserver.observe(img));
```

### Progressive Image Loading

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

## CDN and Delivery

### Image CDN Services

```javascript
// Cloudinary
const cloudinaryUrl = (publicId, transformations) =>
  `https://res.cloudinary.com/demo/image/upload/${transformations}/${publicId}`;

// Example transformations
const url = cloudinaryUrl('sample', 'w_800,q_auto,f_auto');
// - w_800: width 800px
// - q_auto: automatic quality
// - f_auto: automatic format (WebP/AVIF if supported)

// Imgix
const imgixUrl = `https://demo.imgix.net/image.jpg?w=800&auto=format,compress`;

// Cloudflare Images
const cfUrl = `https://example.com/cdn-cgi/image/width=800,quality=85,format=auto/image.jpg`;
```

### Responsive Images with CDN

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

## Interview Questions

**Q1: What are the best image formats for web?**
A:
- **AVIF**: Best compression, 50% smaller than JPEG (use with fallback)
- **WebP**: Good compression, 30% smaller than JPEG, better support
- **JPEG**: Photos, universal support
- **PNG**: Graphics with transparency
- **SVG**: Logos, icons, scalable

**Q2: How do you implement responsive images?**
```html
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, 800px"
  alt="Responsive"
/>
```
Browser selects appropriate image based on viewport and pixel density.

**Q3: Difference between srcset and picture?**
A:
- **srcset**: Same image, different sizes (resolution switching)
- **picture**: Different images for different contexts (art direction)

**Q4: How do you optimize images at build time?**
```javascript
// Sharp
await sharp('input.jpg')
  .resize(800)
  .webp({ quality: 80 })
  .toFile('output.webp');

// Next.js (automatic)
<Image src="/photo.jpg" width={800} height={600} />

// Webpack/Vite plugins
```

**Q5: What's the ideal image quality setting?**
A:
- **JPEG**: 85 (sweet spot)
- **WebP**: 80
- **AVIF**: 65 (different scale)
- **PNG**: Lossless compression tools

Higher quality = minimal visual gain but larger file.

**Q6: How does native lazy loading work?**
```html
<img src="image.jpg" loading="lazy" />
```
Browser automatically delays loading until image near viewport. Use `loading="eager"` for above-fold images.

**Q7: What's the role of Image CDN?**
A:
- On-the-fly resizing and optimization
- Automatic format conversion (WebP/AVIF)
- Global edge caching
- URL-based transformations
- Bandwidth savings

**Q8: How do you prevent layout shift with images?**
```html
<!-- Specify dimensions -->
<img src="image.jpg" width="800" height="600" />

<!-- Or use aspect-ratio -->
<img src="image.jpg" style="aspect-ratio: 16/9; width: 100%;" />
```
Prevents CLS by reserving space before image loads.

**Q9: What's progressive JPEG?**
A: JPEG that loads in multiple passes (low to high quality).

Benefits:
- Better perceived performance
- Shows blurred image immediately
- Progressively refines

```bash
jpegoptim --max=85 --all-progressive image.jpg
```

**Q10: How do you measure image optimization impact?**
- Lighthouse: Check properly sized images
- Coverage tab: Check unused images
- Network tab: Compare before/after sizes
- WebPageTest: Image analysis
- Bundle size comparison

## Summary

**Optimization Checklist:**
- [ ] Use modern formats (AVIF/WebP) with fallbacks
- [ ] Compress images (85 quality for JPEG)
- [ ] Implement responsive images (srcset)
- [ ] Lazy load below-fold images
- [ ] Specify image dimensions (prevent CLS)
- [ ] Use image CDN
- [ ] Remove metadata
- [ ] Serve from CDN

**Performance Impact:**
- 50-70% file size reduction with modern formats
- 50% bandwidth savings with lazy loading
- Significant LCP improvement
- Better Core Web Vitals scores

**Tools:**
- Sharp (Node.js optimization)
- Squoosh (online tool)
- ImageOptim (desktop app)
- Cloudinary/Imgix (CDN)
- Next.js Image component (automatic optimization)

---

[← Caching Strategies](./04-caching-strategies.md) | [Next: Bundle Optimization →](./06-bundle-optimization.md)
