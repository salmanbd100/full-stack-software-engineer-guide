# Asset Management and Optimization

## Overview
Efficient asset management is critical for web performance. Images, videos, fonts, and other media often account for 50-90% of page weight. Proper optimization reduces load time, improves user experience, and lowers bandwidth costs.

## 💡 **Image Optimization**

Techniques for reducing image file sizes while maintaining quality to improve page load performance and user experience.

### Modern Image Formats

Choosing the right image format significantly impacts file size and quality.

```html
<!-- Using picture element for format fallback -->
<picture>
  <!-- Modern formats first -->
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">

  <!-- Fallback for older browsers -->
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

**Format Comparison:**
- **AVIF**: Best compression (30-50% smaller than WebP), limited support
- **WebP**: Great compression (25-35% smaller than JPEG), good support
- **JPEG**: Universal support, lossy compression
- **PNG**: Lossless, supports transparency, larger files
- **SVG**: Vector graphics, infinitely scalable, small file size

### Responsive Images

Delivering appropriately sized images based on device screen size and resolution using srcset and sizes attributes. Serve different image sizes based on device.

```html
<!-- Using srcset for different resolutions -->
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w,
    image-1600.jpg 1600w
  "
  sizes="
    (max-width: 400px) 400px,
    (max-width: 800px) 800px,
    (max-width: 1200px) 1200px,
    1600px
  "
  alt="Responsive image"
  loading="lazy"
/>

<!-- For pixel density (retina displays) -->
<img
  srcset="image-1x.jpg 1x, image-2x.jpg 2x, image-3x.jpg 3x"
  src="image-1x.jpg"
  alt="High DPI image"
/>

<!-- Art direction with picture -->
<picture>
  <!-- Mobile: cropped square -->
  <source
    media="(max-width: 640px)"
    srcset="mobile-square.jpg"
  />

  <!-- Tablet: 16:9 -->
  <source
    media="(max-width: 1024px)"
    srcset="tablet-16-9.jpg"
  />

  <!-- Desktop: wide -->
  <img src="desktop-wide.jpg" alt="Art directed image" />
</picture>
```

### Lazy Loading

Delaying image loading until they're needed (near viewport) to reduce initial page load time and bandwidth. Defer loading offscreen images.

```html
<!-- Native lazy loading -->
<img src="image.jpg" alt="Lazy loaded" loading="lazy" />

<!-- Eager loading for above-fold images -->
<img src="hero.jpg" alt="Hero image" loading="eager" fetchpriority="high" />
```

```javascript
// Intersection Observer for custom lazy loading
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.add('loaded');
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

### Progressive Image Loading

Displaying blurred low-resolution placeholders that transition to high-quality images for better perceived performance. Show low-quality placeholder while loading high-quality image.

```jsx
// React progressive image component
function ProgressiveImage({ placeholder, src, alt }) {
  const [imgSrc, setImgSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={isLoading ? 'loading' : 'loaded'}
      style={{
        filter: isLoading ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s'
      }}
    />
  );
}

// With blur data URL
function BlurImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Cimage filter='url(%23b)' x='0' y='0' height='100%25' width='100%25' href='data:image/jpeg;base64,...'/%3E%3C/svg%3E")`,
        backgroundSize: 'cover'
      }}
    />
  );
}
```

### Image CDN and Optimization

Cloud-based image optimization services providing automatic format conversion, resizing, and global CDN delivery.

```javascript
// Next.js Image component (automatic optimization)
import Image from 'next/image';

function ProductImage({ product }) {
  return (
    <Image
      src={product.image}
      alt={product.name}
      width={500}
      height={300}
      quality={85}
      placeholder="blur"
      blurDataURL={product.blurHash}
      loading="lazy"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  );
}

// Cloudinary image transformation
function CloudinaryImage({ publicId, transformations = {} }) {
  const {
    width = 'auto',
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = transformations;

  const url = `https://res.cloudinary.com/demo/image/upload/w_${width},q_${quality},f_${format},c_${crop}/${publicId}`;

  return <img src={url} alt="" />;
}

// Usage
<CloudinaryImage
  publicId="sample"
  transformations={{
    width: 800,
    quality: 80,
    format: 'webp',
    crop: 'fill'
  }}
/>

// imgix image service
function ImgixImage({ src, params = {} }) {
  const baseUrl = 'https://your-domain.imgix.net';
  const queryParams = new URLSearchParams({
    auto: 'format,compress',
    fit: 'crop',
    ...params
  });

  return <img src={`${baseUrl}${src}?${queryParams}`} alt="" />;
}
```

## Video Optimization

Strategies for delivering video content efficiently with adaptive bitrate streaming and lazy loading techniques.

### Adaptive Streaming

Dynamic video quality adjustment based on user's bandwidth using protocols like HLS or DASH for smooth playback.

```html
<!-- HLS for adaptive bitrate streaming -->
<video controls>
  <source src="video.m3u8" type="application/x-mpg-URL">
  <source src="video.mp4" type="video/mp4">
</video>

<!-- With video.js library -->
<video
  id="my-video"
  class="video-js"
  controls
  preload="auto"
  data-setup='{}'
>
  <source src="video.m3u8" type="application/x-mpg-URL">
</video>

<script>
  const player = videojs('my-video', {
    techOrder: ['html5'],
    sources: [{
      src: 'https://example.com/video.m3u8',
      type: 'application/x-mpg-URL'
    }]
  });
</script>
```

### Lazy Loading Videos

Deferring video loading until playback is initiated or viewport intersection to save bandwidth and improve performance.

```html
<!-- Poster image until play -->
<video
  poster="thumbnail.jpg"
  preload="none"
  controls
>
  <source src="video.mp4" type="video/mp4">
</video>

<!-- Intersection Observer for autoplay -->
<video
  data-src="video.mp4"
  muted
  loop
  playsinline
></video>

<script>
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;

    if (entry.isIntersecting) {
      // Load video
      video.src = video.dataset.src;
      video.load();

      // Autoplay when in view
      video.play();
    } else {
      // Pause when out of view
      video.pause();
    }
  });
});

document.querySelectorAll('video[data-src]').forEach(video => {
  videoObserver.observe(video);
});
</script>
```

### Video Formats

Providing multiple video formats for cross-browser compatibility with fallback options for older browsers.

```html
<!-- Multiple formats for browser compatibility -->
<video controls>
  <source src="video.webm" type="video/webm">
  <source src="video.mp4" type="video/mp4">
  <source src="video.ogv" type="video/ogg">
  Your browser doesn't support video.
</video>
```

## Font Optimization

Techniques for loading web fonts efficiently while preventing layout shifts and invisible text flashes.

### Font Loading Strategies

Using font-display CSS property to control font rendering behavior during loading for optimal user experience.

```css
/* font-display values */

/* Swap: show fallback immediately, swap when custom font loads */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
}

/* Optional: custom font not critical, use if loads fast */
@font-face {
  font-family: 'CustomFont';
  font-display: optional;
}

/* Fallback: brief invisible period, then show fallback */
@font-face {
  font-family: 'CustomFont';
  font-display: fallback;
}

/* Block: invisible until font loads (default, causes FOIT) */
@font-face {
  font-family: 'CustomFont';
  font-display: block;
}
```

### Font Subsetting

Reducing font file size by including only the specific characters and glyphs needed for your content. Only include characters you need.

```bash
# Using glyphhanger
npx glyphhanger --subset=*.woff2 --formats=woff2 --whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789

# Only include specific characters
npx glyphhanger --subset=font.woff2 --whitelist="Hello World"
```

### Variable Fonts

Modern font technology allowing multiple weights and styles in a single file for reduced file count and flexibility. Single font file with multiple weights/styles.

```css
@font-face {
  font-family: 'InterVariable';
  src: url('/fonts/Inter-var.woff2') format('woff2');
  font-weight: 100 900; /* All weights in one file */
  font-display: swap;
}

body {
  font-family: 'InterVariable', sans-serif;
  font-weight: 400; /* Can use any value from 100-900 */
}
```

### Preloading Fonts

Using resource hints to load critical fonts early in page load for faster text rendering.

```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<!-- System font stack (no download needed) -->
<style>
  body {
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      sans-serif;
  }
</style>
```

## Icon Management

Different approaches for implementing icons including SVG sprites, icon fonts, and component libraries.

### Icon Strategies

Comparison of various icon implementation methods from SVG sprites to dynamic component imports.

```jsx
// 1. SVG Sprite
// icons.svg
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
  </symbol>
  <symbol id="icon-user" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
  </symbol>
</svg>

// Usage
<svg className="icon">
  <use href="#icon-home" />
</svg>

// 2. Inline SVG Component
function HomeIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

// 3. Icon Font (Font Awesome, Material Icons)
<i className="fa fa-home"></i>

// 4. Icon Library (react-icons)
import { FaHome } from 'react-icons/fa';
<FaHome size={24} />

// 5. Dynamic Icon Component
const icons = {
  home: () => import('./icons/Home'),
  user: () => import('./icons/User')
};

function Icon({ name, ...props }) {
  const [IconComponent, setIconComponent] = useState(null);

  useEffect(() => {
    icons[name]().then(module => {
      setIconComponent(() => module.default);
    });
  }, [name]);

  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}
```

## CSS Optimization

Reducing CSS bundle size and eliminating render-blocking stylesheets for faster page rendering.

### Critical CSS

Inline above-the-fold CSS to eliminate render-blocking.

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Critical CSS inline -->
  <style>
    /* Only styles needed for above-the-fold content */
    body { margin: 0; font-family: sans-serif; }
    .header { height: 60px; background: #333; }
    .hero { height: 400px; background: url('hero.jpg'); }
  </style>

  <!-- Preload full stylesheet -->
  <link rel="preload" href="/styles/main.css" as="style">

  <!-- Load full stylesheet asynchronously -->
  <link rel="stylesheet" href="/styles/main.css" media="print" onload="this.media='all'">
</head>
<body>
  <!-- Above-the-fold content -->
</body>
</html>
```

### CSS Minification and Purging

Removing unused CSS and compressing remaining styles to minimize stylesheet size with PostCSS tools.

```javascript
// PostCSS configuration
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('cssnano')({
      preset: 'default'
    }),
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.html', './src/**/*.jsx'],
      safelist: ['active', 'disabled']
    })
  ]
};

// Tailwind CSS (built-in purging)
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {},
  plugins: []
};
```

## Asset Bundling

Webpack strategies for splitting code into optimal chunks and managing bundle sizes for production.

### Code Splitting

Breaking large bundles into smaller chunks loaded on-demand for faster initial page loads.

```javascript
// Webpack code splitting
module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor bundle
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        // Common code
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};

// Dynamic imports
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Asset Hashing

Content-based hash filenames enabling long-term caching with automatic cache busting on updates.

```javascript
// Webpack output with content hash
output: {
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[name].[contenthash:8].chunk.js',
  assetModuleFilename: 'assets/[name].[hash:8][ext]'
}
```

## CDN Strategy

Leveraging content delivery networks to serve assets from edge locations closer to users globally.

### Static Asset Hosting

Hosting static files on CDN for reduced latency and improved global performance.

```html
<!-- Host static assets on CDN -->
<link rel="stylesheet" href="https://cdn.example.com/styles/main.css">
<script src="https://cdn.example.com/scripts/app.js"></script>
<img src="https://cdn.example.com/images/logo.png" alt="Logo">
```

### Cache Headers

Configuring HTTP cache headers for optimal browser and CDN caching behavior.

```javascript
// Express.js
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true
}));

// Nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### CDN Providers

Popular CDN services offering global distribution, performance optimization, and security features.

- **Cloudflare**: Global CDN, free tier, DDoS protection
- **CloudFront**: AWS CDN, integrates with S3
- **Fastly**: Edge computing, instant purging
- **Akamai**: Enterprise-grade, largest network

## Interview Questions

**Q: What's the difference between WebP and AVIF?**

A:
- **WebP**: 25-35% smaller than JPEG, good browser support (95%+)
- **AVIF**: 30-50% smaller than WebP, limited support (~75%)

Use both with fallback:
```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="">
</picture>
```

**Q: How do you optimize images for performance?**

A: Multi-step approach:
1. **Choose right format**: AVIF/WebP for photos, SVG for icons
2. **Responsive images**: srcset for different sizes
3. **Lazy loading**: Load offscreen images when needed
4. **Compression**: Optimize quality vs. size
5. **CDN**: Serve from edge locations
6. **Dimensions**: Include width/height to prevent CLS

**Q: What's the difference between preload and prefetch?**

A:
- **Preload**: High priority, needed for current page
  ```html
  <link rel="preload" href="critical.css" as="style">
  ```
- **Prefetch**: Low priority, might be needed later
  ```html
  <link rel="prefetch" href="next-page.js">
  ```

**Q: How do you handle fonts without causing FOIT (Flash of Invisible Text)?**

A: Use `font-display: swap`:
```css
@font-face {
  font-family: 'CustomFont';
  font-display: swap;  /* Show fallback immediately */
  src: url('font.woff2') format('woff2');
}
```

This shows system font immediately, swaps when custom font loads.

## Best Practices

**Images:**
- Use modern formats (AVIF/WebP) with fallbacks
- Implement responsive images
- Lazy load offscreen images
- Compress images (80-85% quality)
- Use CDN for delivery
- Set explicit dimensions

**Videos:**
- Use adaptive streaming (HLS/DASH)
- Provide poster images
- Lazy load when possible
- Compress appropriately
- Consider autoplay impact on data

**Fonts:**
- Use system fonts when possible
- Subset custom fonts
- Use variable fonts
- Implement font-display: swap
- Preload critical fonts
- Limit number of font families

**CSS/JS:**
- Minify and compress
- Implement code splitting
- Remove unused code
- Use critical CSS
- Enable Gzip/Brotli compression

**CDN:**
- Host static assets on CDN
- Set appropriate cache headers
- Use versioned URLs
- Implement cache busting

## Summary

- Modern image formats (AVIF/WebP) significantly reduce file size
- Responsive images and lazy loading improve performance
- Font optimization prevents FOIT and reduces bundle size
- CDN and caching strategies reduce latency
- Code splitting and minification optimize bundle size
- Proper asset management is critical for Core Web Vitals

---
[� Back to SystemDesign](../README.md)
