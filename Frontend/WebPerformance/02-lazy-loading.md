# Lazy Loading

## Overview

Lazy loading means **don't load things until you actually need them**. Instead of downloading the whole page upfront, you load each piece when it's about to be seen.

> **Real-Life Example:**
> A restaurant doesn't cook every dish when it opens. It cooks each dish when a customer orders it. That's lazy loading.

---

## Table of Contents
- [Why It Matters](#why-it-matters)
- [Image Lazy Loading](#image-lazy-loading)
- [Component Lazy Loading](#component-lazy-loading)
- [Intersection Observer](#intersection-observer)
- [content-visibility (Pure CSS)](#content-visibility-pure-css)
- [Interview Questions](#interview-questions)

---

## Why It Matters

| Benefit | Result |
|---------|--------|
| ⚡ Faster initial load | Page shows up sooner |
| 💾 Less bandwidth | Saves user data on mobile |
| 📈 Better LCP | Browser focuses on visible content first |
| 🔋 Less wasted work | If the user never scrolls, nothing loads |

> **Key Insight:**
> Most users see only the top half of a page. Loading the rest upfront is wasted work.

---

## Image Lazy Loading

### 💡 **Native Lazy Loading (use this first)**

One attribute. The browser handles everything.

```html
<!-- Below the fold: load when near the viewport -->
<img src="photo.jpg" alt="Photo" loading="lazy" width="800" height="600" />

<!-- Above the fold / LCP image: load right away -->
<img src="hero.jpg" alt="Hero" loading="eager" fetchpriority="high"
     width="1200" height="600" />
```

| Image Position | Setting | Why |
|----------------|---------|-----|
| Hero / LCP image | `loading="eager"` | Never delay the LCP |
| Below the fold | `loading="lazy"` | User may not scroll there |

> ⚠️ Never lazy-load your LCP image — it delays the metric Google ranks on.

### 💡 **Next.js Image (best for Next.js apps)**

Handles lazy loading, modern formats, responsive sizes, and CLS prevention automatically.

```tsx
import Image from 'next/image';

interface GalleryImage { id: string; url: string; alt: string; blur: string; }

function Gallery({ images }: { images: GalleryImage[] }): JSX.Element {
  return (
    <div className="gallery">
      {images.map((image, i) => (
        <Image
          key={image.id}
          src={image.url}
          alt={image.alt}
          width={400}
          height={300}
          loading={i < 3 ? 'eager' : 'lazy'} // first row eager, rest lazy
          placeholder="blur"
          blurDataURL={image.blur}
        />
      ))}
    </div>
  );
}
```

---

## Component Lazy Loading

### 💡 **React.lazy + Suspense**

Don't ship code for components users may never open.

| Component | Strategy | Reason |
|-----------|----------|--------|
| Login form | Eager | Most users see it |
| Admin panel | Lazy | Only admins need it |
| Charts / editors | Lazy | Heavy libraries |
| Modals | Lazy | Not always opened |

```tsx
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./AdminPanel'));

function App({ isAdmin }: { isAdmin: boolean }): JSX.Element {
  return (
    <div>
      <Header />
      {isAdmin && (
        <Suspense fallback={<LoadingSpinner />}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

### 💡 **Lazy Loading a Named Export**

`lazy()` expects a default export. Map a named export to `default`:

```tsx
const Chart = lazy(() =>
  import('./Chart').then((module) => ({ default: module.Chart })),
);
```

### 💡 **Always Add an Error Boundary**

If a chunk fails to download (flaky network), Suspense alone shows a blank screen. An error boundary shows a retry instead.

```tsx
import { Component, type ReactNode } from 'react';

class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <button onClick={() => window.location.reload()}>Reload</button>;
    }
    return this.props.children;
  }
}
```

### 💡 **Preload on User Intent**

Lazy by default, but start downloading the moment the user signals intent (hover or focus). The chunk is ready before they click.

```tsx
const AdminPanel = lazy(() => import('./AdminPanel'));

const preload = (): Promise<unknown> => import('./AdminPanel');

function Nav(): JSX.Element {
  return (
    <a href="/admin" onMouseEnter={preload} onFocus={preload}>
      Admin Panel
    </a>
  );
}
```

> **Key Insight:**
> Lazy loading + preload-on-intent gives you a small initial bundle **and** no wait when the user acts.

---

## Intersection Observer

`IntersectionObserver` tells you when an element enters the viewport. It's far cheaper than listening to scroll events, which fire hundreds of times per second.

### 💡 **Basic Setup**

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        loadContent(entry.target);
        observer.unobserve(entry.target); // load once, then stop watching
      }
    }
  },
  {
    rootMargin: '200px', // start loading 200px before it's visible
    threshold: 0.01,
  },
);

document.querySelectorAll<HTMLElement>('.lazy').forEach((el) => observer.observe(el));
```

| Option | Purpose | Common Value |
|--------|---------|--------------|
| `root` | The scroll container | `null` (viewport) |
| `rootMargin` | Buffer around the root | `'200px'` to load early |
| `threshold` | How much must be visible | `0.01` to `1.0` |

### 💡 **Infinite Scroll**

Put a "sentinel" element at the bottom of the list. When it becomes visible, load more.

```tsx
import { useEffect, useRef, useState } from 'react';

function InfiniteList(): JSX.Element {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;

    const observer = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting) {
        const next = await fetchItems(page);
        setItems((prev) => [...prev, ...next]);
        setPage((p) => p + 1);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [page]);

  return (
    <div>
      {items.map((item) => <ItemCard key={item.id} item={item} />)}
      <div ref={sentinel} />
    </div>
  );
}
```

---

## content-visibility (Pure CSS)

A CSS-only way to skip rendering off-screen content. No JavaScript needed.

```css
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* reserve space so the scrollbar is stable */
}
```

| Without `content-visibility` | With it |
|------------------------------|---------|
| Browser lays out the whole page | Browser skips off-screen sections |
| Slow first paint on long pages | Fast first paint |

> **Key Insight:**
> `content-visibility: auto` can speed up rendering on long pages with zero JavaScript. Pair it with `contain-intrinsic-size` to avoid layout shift.

---

## Interview Questions

**Q1: What is lazy loading and when do you use it?**

Delaying non-critical resources until they're needed. Use it for below-the-fold images, heavy or rarely-opened components, route chunks, and third-party widgets. Benefits: faster initial load, less bandwidth, better LCP.

**Q2: Why is Intersection Observer better than scroll listeners?**

Scroll events fire hundreds of times per second and run on the main thread, hurting INP. `IntersectionObserver` is handled efficiently by the browser and fires only when visibility actually changes.

**Q3: How do you lazy load a React component, and what's the risk?**

`const C = lazy(() => import('./C'))` wrapped in `<Suspense>`. The risk: a failed chunk download shows a blank screen, so always wrap it in an error boundary with a retry.

**Q4: Lazy loading vs code splitting — what's the difference?**

Code splitting breaks the bundle into chunks (build-time). Lazy loading decides **when** to fetch a chunk or resource (runtime). Code splitting enables lazy loading of JavaScript, but lazy loading also applies to images and sections.

**Q5: What is `content-visibility: auto` and its trade-off?**

It tells the browser to skip rendering off-screen content, speeding up first paint on long pages. The trade-off: without `contain-intrinsic-size`, the scrollbar jumps as content renders, so always set an estimated size.

**Q6: What are the downsides of lazy loading?**

Delayed visibility, more complex code, the need for loading skeletons, and possible SEO issues if critical content is lazy. Fix with SSR for initial content, skeletons for perceived speed, and never lazy-loading above-the-fold content.

---

## Summary

| Resource | Best Approach |
|----------|---------------|
| Images | Native `loading="lazy"` (or Next.js `<Image>`) |
| Components | `lazy()` + `Suspense` + error boundary |
| Sections | `IntersectionObserver` or `content-visibility` |
| Infinite scroll | `IntersectionObserver` on a sentinel |

> **Remember:**
> - Eager-load above-the-fold content; lazy-load the rest.
> - Use a generous `rootMargin` (100–200px) so content is ready just before it's seen.
> - Add skeletons and error boundaries.
> - Preload on hover/focus for instant response.

---

[← Core Web Vitals](./01-core-web-vitals.md) | [Next: Code Splitting →](./03-code-splitting.md)
