# Lazy Loading

## Overview

Lazy loading is a performance optimization technique that defers loading of non-critical resources until they're actually needed. This reduces initial page load time, saves bandwidth, and improves Core Web Vitals.

## Table of Contents
- [Image Lazy Loading](#image-lazy-loading)
- [Component Lazy Loading](#component-lazy-loading)
- [Route-Based Code Splitting](#route-based-code-splitting)
- [Intersection Observer API](#intersection-observer-api)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

## Image Lazy Loading

### Native Browser Lazy Loading

Modern browsers provide built-in lazy loading through the `loading` attribute, eliminating the need for JavaScript-based solutions for basic use cases. When `loading="lazy"` is set, the browser automatically delays loading the image until it's about to enter the viewport (with some buffer distance). This native approach is performant, requires no JavaScript, and works even if JavaScript is disabled. However, you must be careful to use `loading="eager"` for above-the-fold images (especially LCP elements) to avoid accidentally delaying critical content.

```html
<!-- Modern browsers support loading="lazy" -->
<img
  src="image.jpg"
  alt="Description"
  loading="lazy"
  width="800"
  height="600"
/>

<!-- Eager loading for above-the-fold images -->
<img
  src="hero.jpg"
  alt="Hero"
  loading="eager"
  width="1200"
  height="600"
/>

<!-- Auto (default): Browser decides -->
<img src="image.jpg" alt="Description" loading="auto" />
```

**Browser Support:**
```javascript
// Check if browser supports native lazy loading
if ('loading' in HTMLImageElement.prototype) {
  // Native lazy loading supported
  console.log('Native lazy loading available');
} else {
  // Fallback to Intersection Observer
  console.log('Need polyfill or fallback');
}
```

### Custom Lazy Loading with Intersection Observer

For more control over lazy loading behavior, the Intersection Observer API provides a powerful, performant alternative to scroll event listeners. Unlike scroll events which fire continuously, Intersection Observer efficiently detects when elements enter the viewport with minimal performance impact. This approach allows customizing the trigger distance (rootMargin), intersection threshold, and loading behavior. It's particularly useful when you need features beyond native lazy loading, such as progressive image loading, analytics tracking, or custom placeholder behavior.

```javascript
// Lazy load images using Intersection Observer
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01,
      ...options
    };

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.options
    );
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        this.loadImage(img);
        this.observer.unobserve(img);
      }
    });
  }

  loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    // Create new image to preload
    const imageLoader = new Image();

    imageLoader.onload = () => {
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }
      img.classList.add('loaded');
    };

    imageLoader.onerror = () => {
      img.classList.add('error');
    };

    imageLoader.src = src;
  }

  observe(images) {
    images.forEach(img => this.observer.observe(img));
  }
}

// Usage
const lazyLoader = new LazyImageLoader({
  rootMargin: '100px' // Load 100px before entering viewport
});

const images = document.querySelectorAll('img[data-src]');
lazyLoader.observe(images);
```

```html
<!-- HTML structure for custom lazy loading -->
<img
  data-src="image.jpg"
  data-srcset="image-400.jpg 400w, image-800.jpg 800w"
  alt="Description"
  class="lazy-image"
  style="background: #f0f0f0;"
/>

<style>
  .lazy-image {
    opacity: 0;
    transition: opacity 0.3s;
  }

  .lazy-image.loaded {
    opacity: 1;
  }
</style>
```

### Progressive Image Loading (Blur-up)

Progressive image loading (also called "blur-up") dramatically improves perceived performance by showing a tiny, blurred version of the image immediately while the full-resolution version loads in the background. This technique is popularized by Medium and Facebook. The placeholder is typically a tiny base64-encoded image (just a few hundred bytes) embedded directly in the HTML, so it displays instantly. When the full image finishes loading, it smoothly transitions in, replacing the blurred placeholder. This gives users immediate visual feedback and a sense of content loading, reducing perceived wait time.

```jsx
// React component with blur-up effect
import { useState, useEffect } from 'react';

function ProgressiveImage({ placeholder, src, alt }) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
    };
  }, [src]);

  return (
    <div className="progressive-image">
      <img
        src={imageSrc}
        alt={alt}
        className={imageLoaded ? 'loaded' : 'loading'}
      />
    </div>
  );
}

// Usage
<ProgressiveImage
  placeholder="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Tiny base64 image
  src="/high-res-image.jpg"
  alt="Description"
/>
```

```css
.progressive-image {
  position: relative;
  overflow: hidden;
}

.progressive-image img {
  width: 100%;
  height: auto;
  transition: filter 0.3s;
}

.progressive-image img.loading {
  filter: blur(10px);
  transform: scale(1.1);
}

.progressive-image img.loaded {
  filter: blur(0);
  transform: scale(1);
}
```

### Next.js Image Lazy Loading

Next.js provides an optimized Image component that automatically handles lazy loading, responsive images, and modern image formats. By default, all images are lazy-loaded unless you set `loading="eager"` or `priority={true}`. The component intelligently determines which images should load eagerly based on their position in the viewport. For image galleries or grids, you can conditionally set the first few images to eager loading while lazy-loading the rest. The blur placeholder feature provides a smooth loading experience similar to the custom progressive loading approach, but with automatic generation.

```jsx
import Image from 'next/image';

function Gallery({ images }) {
  return (
    <div className="gallery">
      {images.map((image, index) => (
        <Image
          key={image.id}
          src={image.url}
          alt={image.alt}
          width={400}
          height={300}
          loading={index < 3 ? 'eager' : 'lazy'}  // First 3 eager, rest lazy
          placeholder="blur"
          blurDataURL={image.placeholder}
          quality={85}
        />
      ))}
    </div>
  );
}
```

## Component Lazy Loading

### React Lazy and Suspense

Component lazy loading is just as important as image lazy loading for performance. Large React components (especially those with heavy dependencies like charts, maps, or rich text editors) can significantly bloat your initial JavaScript bundle. React's `lazy()` function combined with `Suspense` allows you to split these components into separate chunks that only load when needed. This reduces initial bundle size, speeds up Time to Interactive, and improves Core Web Vitals. The Suspense boundary shows a fallback UI while the component loads, preventing layout shifts and providing visual feedback.

```jsx
import { lazy, Suspense } from 'react';

// Lazy load component
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const UserDashboard = lazy(() => import('./UserDashboard'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  return (
    <div>
      {/* Critical content loads immediately */}
      <Header />
      <Hero />

      {/* Heavy component lazy loads */}
      <Suspense fallback={<LoadingSpinner />}>
        <HeavyComponent />
      </Suspense>

      {/* Conditional lazy loading */}
      {isAdmin ? (
        <Suspense fallback={<div>Loading admin panel...</div>}>
          <AdminPanel />
        </Suspense>
      ) : (
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <UserDashboard />
        </Suspense>
      )}
    </div>
  );
}
```

### Named Exports Lazy Loading

React.lazy() only works with default exports by default, but many codebases use named exports for better organization and tree-shaking. To lazy-load named exports, you need to transform the import to return an object with a `default` property. This extra step is necessary because React.lazy expects a dynamic import that resolves to a module with a default export. While slightly more verbose, this pattern allows lazy loading any component regardless of how it's exported, maintaining flexibility in your module structure.

```jsx
// Component with named exports
// MyComponent.jsx
export function MyComponent() {
  return <div>Main Component</div>;
}

export function AnotherComponent() {
  return <div>Another</div>;
}

// Lazy loading named exports
const MyComponent = lazy(() =>
  import('./MyComponent').then(module => ({
    default: module.MyComponent
  }))
);

const AnotherComponent = lazy(() =>
  import('./MyComponent').then(module => ({
    default: module.AnotherComponent
  }))
);
```

### Error Boundaries for Lazy Components

Lazy-loaded components can fail to load due to network errors, server issues, or deployment updates that invalidate old chunk files. Without error handling, these failures result in a broken user experience with blank screens. Error boundaries catch these loading errors and display a fallback UI with recovery options. This is especially important for production applications where users might have poor network conditions or open your app during a deployment. Always wrap lazy-loaded components in error boundaries to gracefully handle loading failures.

```jsx
import { Component, lazy, Suspense } from 'react';

// Error boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Failed to load component. <button onClick={() => window.location.reload()}>Retry</button></div>;
    }

    return this.props.children;
  }
}

// Usage
const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Preloading Components

While lazy loading improves initial performance, it introduces a delay when users actually need the lazy-loaded component. Preloading solves this by loading components speculatively based on user intent before they're actually needed. For example, preload a modal when a user hovers over the button that opens it, or preload the next route when a user hovers over a navigation link. This combines the benefits of lazy loading (smaller initial bundle) with the perceived performance of eager loading (no loading delay when actually needed). The key is predicting user intent accurately.

```jsx
import { lazy, Suspense, useEffect } from 'react';

// Lazy load with preload
const AdminPanel = lazy(() => import('./AdminPanel'));

// Preload function
const preloadAdminPanel = () => {
  import('./AdminPanel');
};

function Navigation() {
  return (
    <nav>
      <Link
        to="/admin"
        onMouseEnter={preloadAdminPanel}  // Preload on hover
      >
        Admin Panel
      </Link>
    </nav>
  );
}

// Or preload based on route prefetch
function useRoutePreload(route) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (route === '/admin') {
        preloadAdminPanel();
      }
    }, 2000); // Preload after 2 seconds

    return () => clearTimeout(timer);
  }, [route]);
}
```

## Route-Based Code Splitting

### React Router Lazy Loading

Route-based code splitting is one of the most impactful performance optimizations you can implement. Each route in your application becomes a separate JavaScript chunk that only loads when users navigate to that route. This is extremely effective because users typically only visit a small subset of routes in any given session. By splitting at route boundaries, you ensure users only download the code they actually need. The loading state during route transitions is handled by Suspense, providing smooth navigation with visual feedback.

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load route components
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Next.js Dynamic Imports

Next.js provides the `dynamic()` function as a more flexible alternative to React.lazy(). It supports additional options like disabling server-side rendering for client-only components (useful for components that depend on browser APIs), custom loading components, and more. The `ssr: false` option is particularly important for components that use window, document, or other browser-only APIs that would break during server-side rendering. Dynamic imports also support conditional rendering patterns, allowing you to load components only when certain conditions are met.

```jsx
// pages/index.jsx
import dynamic from 'next/dynamic';

// Client-side only component (no SSR)
const DynamicComponent = dynamic(() => import('../components/Heavy'), {
  ssr: false,
  loading: () => <p>Loading...</p>
});

// With named export
const DynamicComponentWithNamed = dynamic(
  () => import('../components/MyComponent').then(mod => mod.MyComponent),
  { loading: () => <Loading /> }
);

// Conditional loading
export default function Home() {
  const [showHeavy, setShowHeavy] = useState(false);

  return (
    <div>
      <button onClick={() => setShowHeavy(true)}>
        Load Heavy Component
      </button>
      {showHeavy && <DynamicComponent />}
    </div>
  );
}
```

### Vue.js Lazy Loading

```javascript
// Vue Router lazy loading
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/Home.vue')
    },
    {
      path: '/about',
      component: () => import('./views/About.vue')
    },
    {
      path: '/dashboard',
      component: () => import('./views/Dashboard.vue')
    }
  ]
});

// Component lazy loading
export default {
  components: {
    HeavyComponent: () => import('./components/HeavyComponent.vue')
  }
};
```

## Intersection Observer API

### Basic Intersection Observer

The Intersection Observer API is the foundation of modern lazy loading implementations. It provides an efficient way to detect when elements enter or exit the viewport without the performance overhead of scroll event listeners. The API works asynchronously, offloading intersection calculations to the browser's rendering engine, which can perform them much more efficiently than JavaScript calculations. Configuration options like rootMargin (load before entering viewport) and threshold (percentage of element that must be visible) provide fine-grained control over loading behavior.

```javascript
// Create observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log('Element is visible:', entry.target);
      // Load content
      loadContent(entry.target);
      // Stop observing after loaded
      observer.unobserve(entry.target);
    }
  });
}, {
  root: null,                // viewport
  rootMargin: '0px',         // margin around root
  threshold: 0.1             // 10% visible triggers callback
});

// Observe elements
const elements = document.querySelectorAll('.lazy-load');
elements.forEach(el => observer.observe(el));
```

### Advanced Configuration

```javascript
const options = {
  // Element to use as viewport (null = browser viewport)
  root: document.querySelector('#scrollArea'),

  // Margin around root (can trigger earlier/later)
  rootMargin: '100px 0px',  // Load 100px before entering viewport

  // Threshold: 0-1, or array of thresholds
  threshold: [0, 0.25, 0.5, 0.75, 1]  // Multiple trigger points
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    console.log('Intersection ratio:', entry.intersectionRatio);

    if (entry.intersectionRatio >= 0.5) {
      entry.target.classList.add('half-visible');
    }

    if (entry.isIntersecting) {
      entry.target.classList.add('fully-visible');
    }
  });
}, options);
```

### Infinite Scroll Implementation

Infinite scroll is a popular UX pattern that loads more content as users scroll down, commonly used in social media feeds and product listings. Implementation relies on Intersection Observer watching a "sentinel" element at the bottom of the list. When this sentinel enters the viewport, it triggers loading of the next page of data. The key challenges are preventing duplicate loading requests (using a loading state), handling the end of data gracefully, and maintaining smooth scroll performance by efficiently rendering only visible items (often combined with virtual scrolling for very long lists).

```jsx
import { useEffect, useRef, useState } from 'react';

function InfiniteScroll() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loading) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loading]);

  const loadMore = async () => {
    setLoading(true);
    const newItems = await fetchItems(page);
    setItems(prev => [...prev, ...newItems]);
    setPage(prev => prev + 1);
    setLoading(false);
  };

  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
      <div ref={loaderRef} className="loader">
        {loading && <Spinner />}
      </div>
    </div>
  );
}
```

### Lazy Load Sections

Lazy loading entire sections of a page (not just individual images or components) can dramatically improve initial load performance for long pages. This is particularly effective for below-the-fold content like testimonials, feature sections, or footer content that users might never scroll to. By wrapping sections in a lazy boundary, you defer rendering their content until they're about to become visible. The placeholder ensures the layout space is reserved to prevent layout shifts. This technique combines well with component lazy loading - the section triggers loading its child components only when needed.

```jsx
function LazySection({ children, placeholder }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef}>
      {isLoaded ? children : placeholder}
    </section>
  );
}

// Usage
function App() {
  return (
    <>
      <Hero />

      <LazySection placeholder={<div style={{ height: '400px' }} />}>
        <Features />
      </LazySection>

      <LazySection placeholder={<div style={{ height: '600px' }} />}>
        <Testimonials />
      </LazySection>
    </>
  );
}
```

## Best Practices

### Loading Priority Strategy

```javascript
const loadingStrategy = {
  // Above the fold: Eager loading
  critical: {
    loading: 'eager',
    fetchpriority: 'high',
    preload: true
  },

  // Just below fold: Normal loading
  important: {
    loading: 'auto',
    fetchpriority: 'auto'
  },

  // Far below fold: Lazy loading
  deferred: {
    loading: 'lazy',
    rootMargin: '200px'  // Load before visible
  }
};
```

### Skeleton Loading

Skeleton screens are placeholder UI elements that mimic the shape and structure of the actual content being loaded. They're superior to generic loading spinners because they: (1) provide context about what's loading, (2) reserve exact space to prevent layout shifts, and (3) create a perception of faster loading through visual progression. Skeletons work best when they closely match the final content's layout - same number of items, same sizes, same spacing. The animated shimmer effect (created with CSS gradients) adds polish and reinforces that content is actively loading.

```jsx
function ProductList({ products, loading }) {
  if (loading) {
    return (
      <div className="product-grid">
        {[...Array(6)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image" />
      <div className="skeleton-title" />
      <div className="skeleton-price" />
    </div>
  );
}
```

```css
.skeleton-card {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.skeleton-image,
.skeleton-title,
.skeleton-price {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-image {
  height: 200px;
  margin-bottom: 12px;
}

.skeleton-title {
  height: 20px;
  margin-bottom: 8px;
}

.skeleton-price {
  height: 16px;
  width: 60%;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Content Visibility CSS

The `content-visibility: auto` CSS property is a powerful, pure-CSS approach to lazy rendering. Unlike lazy loading which defers downloading resources, content-visibility defers rendering - the browser skips layout, paint, and style calculations for off-screen content. This can provide 50%+ faster initial render times for long pages. The `contain-intrinsic-size` property is crucial - it tells the browser how much space to reserve for unrendered content, preventing scrollbar jumping and layout shifts. This CSS-only approach requires no JavaScript and works automatically as users scroll.

```css
/* Modern CSS property for lazy rendering */
.lazy-content {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Reserve space */
}

/* Browser won't render until visible */
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}
```

## Interview Questions

**Q1: What is lazy loading and why use it?**
A: Lazy loading defers loading of non-critical resources until needed.

**Benefits:**
- Faster initial page load
- Reduced bandwidth usage
- Better Core Web Vitals (LCP)
- Saves resources for users who don't scroll

**When to use:**
- Images below the fold
- Heavy components not immediately visible
- Route-based code splitting
- Third-party widgets

**Q2: How does native lazy loading work?**
```html
<img src="image.jpg" loading="lazy" alt="Description" />
```
Browser automatically handles intersection detection and loading. Supported in modern browsers. For critical images use `loading="eager"`.

**Q3: Explain Intersection Observer API**
A: API that observes when elements enter/exit viewport.

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible - load content
    }
  });
}, {
  rootMargin: '50px',  // Load 50px before visible
  threshold: 0.1        // 10% visible triggers
});
```

**Q4: How do you lazy load React components?**
```jsx
import { lazy, Suspense } from 'react';

const Heavy = lazy(() => import('./Heavy'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Heavy />
    </Suspense>
  );
}
```

**Q5: What's the difference between lazy loading and code splitting?**
A:
- **Lazy Loading**: Deferring resource loading until needed (images, components)
- **Code Splitting**: Breaking JavaScript bundle into smaller chunks
- Code splitting enables lazy loading of JavaScript

Both improve performance but target different resources.

**Q6: How would you implement infinite scroll?**
```jsx
const loaderRef = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadMore();
    }
  });

  observer.observe(loaderRef.current);
  return () => observer.disconnect();
}, []);

return (
  <>
    {items.map(item => <Item key={item.id} />)}
    <div ref={loaderRef}>Loading...</div>
  </>
);
```

**Q7: What are the downsides of lazy loading?**
A:
- Delayed content visibility
- Complex implementation
- Need loading states/skeletons
- Can hurt SEO if not done properly
- Requires JavaScript (fallback needed)

**Solutions:**
- Server-side rendering for initial content
- Skeleton screens for better UX
- Progressive enhancement

**Q8: How do you lazy load images with blur-up effect?**
```jsx
const [src, setSrc] = useState(placeholder); // tiny base64

useEffect(() => {
  const img = new Image();
  img.onload = () => setSrc(fullImage);
  img.src = fullImage;
}, []);

<img src={src} style={{ filter: src === placeholder ? 'blur(10px)' : 'none' }} />
```

**Q9: What's content-visibility CSS property?**
```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```
Tells browser to skip rendering until visible. Similar to Intersection Observer but pure CSS. Improves rendering performance significantly.

**Q10: How do you test lazy loading?**
- Chrome DevTools Network tab: Verify resources load on scroll
- Lighthouse: Check for properly deferred resources
- Coverage tab: Check unused JavaScript
- Slow 3G throttling: Test loading states
- React DevTools Profiler: Check component render timing

## Summary

**Lazy Loading Strategies:**
1. **Images**: Use native `loading="lazy"` or Intersection Observer
2. **Components**: React.lazy() with Suspense
3. **Routes**: Dynamic imports with router
4. **Infinite scroll**: Intersection Observer on sentinel element

**Best Practices:**
- Eager load above-the-fold content
- Use appropriate rootMargin (100-200px)
- Implement skeleton screens
- Add error boundaries
- Preload on user intent (hover, route prediction)

**Performance Impact:**
- 20-40% faster initial load
- Significant bandwidth savings
- Better LCP scores
- Improved perceived performance

---

[← Core Web Vitals](./01-core-web-vitals.md) | [Next: Code Splitting →](./03-code-splitting.md)
