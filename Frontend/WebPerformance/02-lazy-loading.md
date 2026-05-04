# Lazy Loading

## Overview

Lazy loading means **don't load things until you actually need them**. Instead of downloading everything when the page loads, you wait until each piece is needed.

> **Real-Life Example:**
> Imagine a restaurant menu with photos. You don't print every photo before opening — you only print the ones for the section the customer is looking at. That's lazy loading.

---

## Table of Contents
- [Why Lazy Loading Matters](#why-lazy-loading-matters)
- [Image Lazy Loading](#image-lazy-loading)
- [Component Lazy Loading](#component-lazy-loading)
- [Route-Based Code Splitting](#route-based-code-splitting)
- [Intersection Observer API](#intersection-observer-api)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Why Lazy Loading Matters

### 💡 **The Benefits**

| Benefit | Result |
|---------|--------|
| ⚡ Faster initial load | Page shows up sooner |
| 💾 Less bandwidth | Saves user data (mobile users love this) |
| 📈 Better LCP score | Helps SEO |
| 🔋 Saves resources | If user doesn't scroll, don't load |

> **Key Insight:**
> Most users only see 50% of your page. Loading the other 50% upfront is wasted work.

---

## Image Lazy Loading

### 💡 **Native Browser Lazy Loading (Easiest)**

Just add one attribute. The browser does the rest.

```html
<!-- Lazy: Loads when near viewport -->
<img
  src="image.jpg"
  alt="Description"
  loading="lazy"
  width="800"
  height="600"
/>

<!-- Eager: Loads right away (use for above-fold images) -->
<img
  src="hero.jpg"
  alt="Hero"
  loading="eager"
  width="1200"
  height="600"
/>
```

**When to Use Each:**

| Image Position | Use This | Why |
|---------------|----------|-----|
| Above the fold | `loading="eager"` | User sees it immediately |
| Hero/LCP image | `loading="eager"` | Don't delay LCP |
| Below the fold | `loading="lazy"` | User may not scroll |
| Far below | `loading="lazy"` | Saves bandwidth |

**Check Browser Support:**

```javascript
if ('loading' in HTMLImageElement.prototype) {
  console.log('Native lazy loading available');
} else {
  console.log('Need a fallback');
}
```

### 💡 **Custom Lazy Loading with Intersection Observer**

For more control, use the Intersection Observer API. It tells you when an element enters the viewport.

```javascript
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      root: null,           // Use viewport
      rootMargin: '50px',   // Start loading 50px before visible
      threshold: 0.01,      // Trigger when 1% is visible
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

    // Preload the image first
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
  rootMargin: '100px'
});

const images = document.querySelectorAll('img[data-src]');
lazyLoader.observe(images);
```

```html
<!-- Image starts with placeholder, loads real source when visible -->
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

### 💡 **Progressive Image Loading (Blur-Up)**

Show a tiny blurry version first, then swap in the real image. Used by Medium and Facebook.

**How It Works:**

```
Tiny blurry image (loads instantly, ~500 bytes)
    ↓
User sees something right away
    ↓
Real image downloads in background
    ↓
Real image fades in, blur fades out
```

```jsx
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
  placeholder="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  src="/high-res-image.jpg"
  alt="Description"
/>
```

```css
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

### 💡 **Next.js Image Component (Best Choice)**

If you use Next.js, this is the easiest way. It handles everything automatically.

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
          loading={index < 3 ? 'eager' : 'lazy'} // First 3 eager, rest lazy
          placeholder="blur"
          blurDataURL={image.placeholder}
          quality={85}
        />
      ))}
    </div>
  );
}
```

**What Next.js Does for You:**

- ✅ Automatic lazy loading
- ✅ Modern format conversion (WebP/AVIF)
- ✅ Responsive sizes for different devices
- ✅ Blur placeholder generation
- ✅ Width/height to prevent CLS

---

## Component Lazy Loading

### 💡 **React.lazy and Suspense**

Don't ship code for components users may never see. Load them on demand.

**Why This Helps:**

| Component Type | Approach | Reason |
|----------------|----------|--------|
| Login form | Eager | Most users see it |
| Admin panel | Lazy | Only admins need it |
| Charts | Lazy | Heavy library |
| Modal dialogs | Lazy | Not always opened |

```jsx
import { lazy, Suspense } from 'react';

// These load only when rendered
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const UserDashboard = lazy(() => import('./UserDashboard'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  return (
    <div>
      {/* Critical content loads right away */}
      <Header />
      <Hero />

      {/* Heavy component loads later */}
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

### 💡 **Lazy Loading Named Exports**

`React.lazy` only works with default exports. For named exports, use this trick:

```jsx
// Component file with named exports
// MyComponent.jsx
export function MyComponent() {
  return <div>Main Component</div>;
}

export function AnotherComponent() {
  return <div>Another</div>;
}

// Lazy load a named export
const MyComponent = lazy(() =>
  import('./MyComponent').then(module => ({
    default: module.MyComponent
  }))
);
```

### 💡 **Error Boundaries for Safety**

What happens if the lazy component fails to download? Show a fallback message.

**❌ Without Error Boundary:**

```jsx
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

If the network fails, the user sees a blank screen.

**✅ With Error Boundary:**

```jsx
import { Component, lazy, Suspense } from 'react';

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
      return (
        <div>
          Failed to load.
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    return this.props.children;
  }
}

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

### 💡 **Preloading on User Intent**

The trick: lazy load by default, but **start downloading early when user shows intent** (hover, focus).

```jsx
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./AdminPanel'));

// Function to start the download
const preloadAdminPanel = () => {
  import('./AdminPanel');
};

function Navigation() {
  return (
    <nav>
      <Link
        to="/admin"
        onMouseEnter={preloadAdminPanel} // Start loading on hover
      >
        Admin Panel
      </Link>
    </nav>
  );
}
```

**Why This Works:**

```
User hovers link → start downloading
    ↓
User clicks (a few hundred ms later)
    ↓
Component is already downloaded → instant load
```

> **Key Insight:**
> Combine lazy loading with smart preloading for the best of both worlds — small initial bundle AND no waiting when needed.

---

## Route-Based Code Splitting

### 💡 **Why This Is Powerful**

Most apps have many routes (Home, About, Products, Dashboard, etc.). Users typically only visit a few. **Split each route into its own chunk** so users only download what they actually use.

### 💡 **React Router**

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Each page is a separate chunk
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

### 💡 **Next.js Dynamic Imports**

Next.js gives you more options through the `dynamic()` function.

```jsx
import dynamic from 'next/dynamic';

// Browser-only component (no SSR)
const DynamicComponent = dynamic(() => import('../components/Heavy'), {
  ssr: false,
  loading: () => <p>Loading...</p>
});

// Component with named export
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

| Option | What It Does |
|--------|-------------|
| `ssr: false` | Skip server-side rendering (use for browser-only code) |
| `loading` | Custom loading component |

### 💡 **Vue.js Lazy Loading**

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

---

## Intersection Observer API

### 💡 **What is It?**

Intersection Observer tells you when an element enters or leaves the viewport. It's much more efficient than listening to scroll events.

**Why It's Better Than Scroll Events:**

| Approach | Performance | Reason |
|----------|------------|--------|
| Scroll event listener | ❌ Bad | Fires hundreds of times per second |
| Intersection Observer | ✅ Good | Browser handles it efficiently |

### 💡 **Basic Setup**

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log('Element is visible:', entry.target);
      loadContent(entry.target);
      observer.unobserve(entry.target); // Stop watching after loading
    }
  });
}, {
  root: null,           // null = browser viewport
  rootMargin: '0px',    // margin around root
  threshold: 0.1        // 10% visible triggers callback
});

// Watch elements
const elements = document.querySelectorAll('.lazy-load');
elements.forEach(el => observer.observe(el));
```

### 💡 **Configuration Options**

| Option | Purpose | Example |
|--------|---------|---------|
| `root` | What to use as viewport | `null` for browser |
| `rootMargin` | Extra space around viewport | `'100px'` to load earlier |
| `threshold` | How much must be visible | `0.5` for 50% |

```javascript
const options = {
  root: document.querySelector('#scrollArea'),
  rootMargin: '100px 0px',                    // 100px buffer top/bottom
  threshold: [0, 0.25, 0.5, 0.75, 1]          // Multiple trigger points
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    console.log('Visibility:', entry.intersectionRatio);

    if (entry.intersectionRatio >= 0.5) {
      entry.target.classList.add('half-visible');
    }
  });
}, options);
```

### 💡 **Infinite Scroll Implementation**

A "sentinel" element at the bottom of the list triggers loading more.

**How It Works:**

```
List of items
    ↓
Sentinel element at the bottom
    ↓
User scrolls down
    ↓
Sentinel becomes visible
    ↓
Load more items
    ↓
Repeat
```

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

### 💡 **Lazy Load Whole Sections**

You can lazy load entire sections of the page, not just individual elements.

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

---

## Best Practices

### 💡 **Loading Priority Guide**

| Position | Strategy | Settings |
|----------|----------|----------|
| Above the fold | Eager | `loading="eager"`, `fetchpriority="high"` |
| Just below fold | Auto | `loading="auto"` |
| Far below fold | Lazy | `loading="lazy"`, `rootMargin: '200px'` |

### 💡 **Skeleton Loading Screens**

Skeleton screens look like the real content's shape, while spinners just show motion.

| Loading UI | Pros | Cons |
|------------|------|------|
| Spinner | Simple | Boring, gives no info |
| Skeleton | Shows what's coming | Needs more work |
| Progress bar | Shows progress | Harder to do right |

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

.skeleton-image { height: 200px; margin-bottom: 12px; }
.skeleton-title { height: 20px; margin-bottom: 8px; }
.skeleton-price { height: 16px; width: 60%; }

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 💡 **Content Visibility CSS (Pure CSS Way)**

A modern CSS-only feature that skips rendering off-screen content. No JavaScript needed.

```css
/* Browser skips rendering until visible */
.lazy-content {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Reserve space */
}

.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}
```

**How It Helps:**

| Without `content-visibility` | With `content-visibility` |
|------------------------------|---------------------------|
| Browser renders all content | Browser only renders visible |
| Slow initial paint | Fast initial paint |
| Heavy memory use | Less memory |

> **Key Insight:**
> `content-visibility: auto` can speed up rendering by 50%+ on long pages, with zero JavaScript.

---

## Interview Questions

**Q1: What is lazy loading and why use it?**

A: Lazy loading delays loading non-critical resources until they're needed.

**Benefits:**
- ✅ Faster initial page load
- ✅ Less bandwidth used
- ✅ Better LCP score
- ✅ Saves resources for users who don't scroll

**When to use:**
- Images below the fold
- Heavy components not immediately visible
- Route-based code splitting
- Third-party widgets

**Q2: How does native lazy loading work?**

```html
<img src="image.jpg" loading="lazy" alt="Description" />
```

The browser handles everything automatically. For above-fold images, use `loading="eager"`.

**Q3: Explain the Intersection Observer API**

A: An API that watches when elements enter or leave the viewport.

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible — load content
    }
  });
}, {
  rootMargin: '50px',  // Load 50px early
  threshold: 0.1       // Trigger at 10% visible
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

| Feature | Lazy Loading | Code Splitting |
|---------|-------------|----------------|
| What | Delays loading | Breaks bundle into chunks |
| Targets | Any resource | JavaScript bundle |
| Relationship | Code splitting enables JS lazy loading | — |

Both improve performance but for different things.

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
- ⚠️ Delayed content visibility
- ⚠️ More complex code
- ⚠️ Need loading states/skeletons
- ⚠️ Can hurt SEO if done wrong
- ⚠️ Requires JavaScript (need a fallback)

**Solutions:**
- ✅ Server-side rendering for initial content
- ✅ Skeleton screens for better UX
- ✅ Progressive enhancement

**Q8: How do you do the blur-up effect?**

```jsx
const [src, setSrc] = useState(placeholder); // tiny base64

useEffect(() => {
  const img = new Image();
  img.onload = () => setSrc(fullImage);
  img.src = fullImage;
}, []);

<img
  src={src}
  style={{ filter: src === placeholder ? 'blur(10px)' : 'none' }}
/>
```

**Q9: What's the `content-visibility` CSS property?**

```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

Tells the browser to skip rendering off-screen content. Same idea as Intersection Observer but pure CSS.

**Q10: How do you test lazy loading?**

- 🔍 Chrome DevTools Network tab → see resources load on scroll
- 📊 Lighthouse → check for properly deferred resources
- 📈 Coverage tab → check unused JavaScript
- 🐌 Slow 3G throttling → test loading states
- ⚛️ React DevTools Profiler → check render timing

---

## Summary

### Lazy Loading Strategies

| Resource Type | Best Approach |
|---------------|---------------|
| Images | Native `loading="lazy"` or Intersection Observer |
| Components | `React.lazy()` with Suspense |
| Routes | Dynamic imports with router |
| Infinite scroll | Intersection Observer on a sentinel |

### Best Practices

- ✅ Eager-load above-the-fold content
- ✅ Use a reasonable `rootMargin` (100-200px)
- ✅ Add skeleton screens
- ✅ Add error boundaries
- ✅ Preload on user intent (hover, focus)

### Performance Impact

- 📉 20-40% faster initial load
- 💰 Big bandwidth savings
- 📈 Better LCP scores
- ⚡ Better perceived performance

---

[← Core Web Vitals](./01-core-web-vitals.md) | [Next: Code Splitting →](./03-code-splitting.md)
