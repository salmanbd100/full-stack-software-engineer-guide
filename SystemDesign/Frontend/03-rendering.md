# Rendering Strategies

## Overview
Modern web applications can be rendered in different ways, each with unique trade-offs for performance, SEO, user experience, and infrastructure costs. Understanding when to use each strategy is critical for frontend system design interviews.

## Rendering Patterns

**Quick Comparison:**

| Pattern | TTFB | FCP | SEO | Cost | Best For |
|---------|------|-----|-----|------|----------|
| **CSR** | ⚡ Fast | 🐌 Slow | ❌ Poor | 💰 Low | Dashboards |
| **SSR** | 🐌 Slow | ⚡ Fast | ✅ Great | 💰💰 High | E-commerce |
| **SSG** | ⚡ Fastest | ⚡ Fastest | ✅ Best | 💰 Lowest | Blogs |
| **ISR** | ⚡ Fastest | ⚡ Fastest | ✅ Best | 💰 Low | Most apps |

### 💡 **Client-Side Rendering (CSR)**

**What is Client-Side Rendering?**
Client-Side Rendering (CSR) is the traditional Single Page Application (SPA) approach where the server sends a minimal HTML shell and all rendering happens in the user's browser using JavaScript. This was popularized by frameworks like React, Vue, and Angular.

**How CSR Works:**
1. Server sends nearly empty HTML with JavaScript bundle reference
2. Browser downloads and executes JavaScript
3. JavaScript fetches data from APIs
4. JavaScript renders the entire UI
5. User can now interact with the application

**The CSR Trade-off:**
CSR trades initial load performance for subsequent navigation speed. The first page load is slow (download JS, execute, fetch data, render), but after that, navigating between pages is instant because everything is already loaded.

**Performance Characteristics:**
- **TTFB (Time to First Byte)**: Fast (minimal HTML)
- **FCP (First Contentful Paint)**: Slow (must download and execute JS first)
- **TTI (Time to Interactive)**: Slow (same as FCP in CSR)
- **Subsequent navigation**: Instant (client-side routing)

**SEO Implications:**
While Google can index JavaScript-rendered content, it's not ideal:
- Slower indexing (bots must execute JavaScript)
- Social media crawlers (Facebook, Twitter) don't execute JavaScript
- Less reliable than server-rendered content

Traditional Single Page Applications where rendering happens entirely in the browser.

```javascript
// CSR with React
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// All rendering happens client-side
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Initial HTML is minimal
/*
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/static/js/bundle.js"></script>
  </body>
</html>
*/
```

**Flow:**
```
1. Browser requests HTML
2. Server sends minimal HTML shell
3. Browser downloads JavaScript bundle
4. React hydrates and renders UI
5. Application is interactive
```

**Pros:**
- Simple deployment (static files)
- Rich interactivity
- Fast subsequent navigation
- Lower server costs
- Offline-capable with service workers

**Cons:**
- Slow initial load (large JS bundle)
- Poor SEO (content not in initial HTML)
- Slower First Contentful Paint
- Requires more client resources
- Blank page while JS loads

**Best for:**
- Authenticated dashboards
- Admin panels
- Tools and SaaS applications
- Apps where SEO isn't critical

### 💡 **Server-Side Rendering (SSR)**

**What is Server-Side Rendering?**
With SSR, the server generates complete HTML for each request. When a user requests a page, the server fetches necessary data, renders React components to HTML, and sends fully-formed HTML to the browser. This is how traditional websites (PHP, Ruby on Rails) worked, but modernized for React applications.

**How SSR Works:**
1. User requests a page
2. Server runs React components
3. Server fetches required data
4. Server renders components to HTML string
5. Server sends complete HTML to browser
6. Browser displays content immediately (page is visible)
7. JavaScript downloads in background
8. React "hydrates" the HTML (attaches event listeners)
9. Page becomes interactive

**The SSR Trade-off:**
SSR provides fast initial paint and good SEO, but requires a Node.js server (higher infrastructure costs) and has slower Time to First Byte (server must do work before responding).

**Performance Characteristics:**
- **TTFB**: Slower (server must render before responding)
- **FCP**: Fast (HTML contains content)
- **TTI**: Medium (wait for JS to download and hydrate)
- **Subsequent navigation**: Fast (usually client-side after hydration)

**When to Use SSR:**
✅ SEO is critical (marketing sites, blogs, e-commerce)
✅ Content changes frequently
✅ Personalized content for each user
✅ First load performance matters

**When NOT to Use:**
❌ Authenticated dashboards (no SEO benefit)
❌ Very high traffic (server costs)
❌ Static content (use SSG instead)

HTML is generated on the server for each request.

```javascript
// SSR with Next.js
export async function getServerSideProps(context) {
  // Runs on every request
  const res = await fetch(`https://api.example.com/data`);
  const data = await res.json();

  return {
    props: { data }
  };
}

export default function Page({ data }) {
  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

**Flow:**
```
1. Browser requests page
2. Server fetches data
3. Server renders React to HTML
4. Server sends complete HTML
5. Browser displays content
6. JavaScript downloads
7. React hydrates (makes interactive)
```

**Pros:**
- Better SEO (content in initial HTML)
- Faster First Contentful Paint
- Works without JavaScript
- Better for low-powered devices
- Dynamic content on each request

**Cons:**
- Higher server costs
- Slower Time to First Byte (TTFB)
- More complex deployment
- Server load increases with traffic
- Full page reload on navigation

**Best for:**
- E-commerce product pages
- News websites
- Marketing pages with dynamic content
- Apps requiring fresh data per request

### 💡 **Static Site Generation (SSG)**

HTML is generated at build time and served from CDN.

```javascript
// SSG with Next.js
export async function getStaticProps() {
  // Runs at build time
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  return {
    props: { posts }
  };
}

export async function getStaticPaths() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  const paths = posts.map(post => ({
    params: { id: post.id.toString() }
  }));

  return { paths, fallback: false };
}

export default function Post({ posts }) {
  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**Flow:**
```
1. Build process fetches data
2. Generate HTML files for all pages
3. Deploy static files to CDN
4. User requests page
5. CDN serves pre-built HTML instantly
6. JavaScript hydrates
```

**Pros:**
- Best performance (pre-built)
- Lowest server costs
- Best SEO
- High availability (CDN)
- Excellent caching

**Cons:**
- Build time increases with pages
- Stale data (needs rebuilds)
- Not suitable for dynamic content
- Longer deployment times
- Cannot personalize content

**Best for:**
- Documentation sites
- Blogs
- Marketing websites
- Product catalogs (relatively stable)

### 💡 **Incremental Static Regeneration (ISR)**

Combines benefits of SSG and SSR by allowing static pages to be updated after build.

```javascript
// ISR with Next.js
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/products');
  const products = await res.json();

  return {
    props: { products },
    revalidate: 60 // Regenerate page every 60 seconds
  };
}

export default function Products({ products }) {
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**How it works:**
```
1. First request serves stale static page
2. Triggers background regeneration
3. Next request gets updated page
4. Process repeats based on revalidate time
```

**Pros:**
- Static performance with dynamic data
- No full rebuild needed
- Scales to many pages
- Fresh content without sacrificing speed
- Cost-effective

**Cons:**
- Complexity in cache invalidation
- Stale content for initial visitor
- Requires infrastructure support
- Not truly real-time
- Debug complexity

**Best for:**
- E-commerce sites
- Content sites with periodic updates
- Blogs with new posts
- Product listings

### 💡 **Progressive Hydration**

Load and hydrate components progressively based on priority.

```javascript
// Progressive hydration with React
import { lazy, Suspense } from 'react';

// Critical components load immediately
import Header from './Header';
import Hero from './Hero';

// Non-critical components lazy load
const Reviews = lazy(() => import('./Reviews'));
const RelatedProducts = lazy(() => import('./RelatedProducts'));
const Footer = lazy(() => import('./Footer'));

export default function ProductPage() {
  return (
    <div>
      {/* Hydrate immediately */}
      <Header />
      <Hero />

      {/* Hydrate when visible */}
      <Suspense fallback={<Skeleton />}>
        <Reviews />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <RelatedProducts />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
```

**Benefits:**
- Faster Time to Interactive
- Prioritize critical content
- Better perceived performance
- Reduced initial JavaScript

### 💡 **Islands Architecture**

Only interactive components are hydrated, rest remains static HTML.

```javascript
// Islands with Astro
---
import Header from '../components/Header.astro';
import ProductGrid from '../components/ProductGrid.jsx';
import Newsletter from '../components/Newsletter.jsx';
---

<html>
  <head>
    <title>Products</title>
  </head>
  <body>
    <!-- Static HTML, no JavaScript -->
    <Header />

    <!-- Interactive island -->
    <ProductGrid client:load />

    <!-- Interactive only when visible -->
    <Newsletter client:visible />
  </body>
</html>
```

**Benefits:**
- Minimal JavaScript
- Fast initial load
- Selective interactivity
- Better performance

## Decision Matrix

### When to use each pattern:

```
Application Type          | Recommended Pattern
--------------------------|--------------------
Marketing Site            | SSG
Blog                      | SSG or ISR
Documentation             | SSG
E-commerce Listings       | ISR
E-commerce Product Page   | SSR or ISR
News Site                 | SSR or ISR
Dashboard (Auth)          | CSR
Admin Panel               | CSR
Real-time App             | CSR
Social Media Feed         | CSR + SSR hybrid
Content Platform          | ISR
Portfolio                 | SSG
```

### Performance Characteristics

```
Metric               | CSR    | SSR    | SSG    | ISR
---------------------|--------|--------|--------|--------
Time to First Byte   | Fast   | Slow   | Fastest| Fastest
First Contentful Paint| Slow  | Fast   | Fastest| Fastest
Time to Interactive  | Slow   | Medium | Fast   | Fast
SEO                  | Poor   | Good   | Best   | Best
Server Cost          | Low    | High   | Lowest | Low
Scalability          | High   | Medium | Highest| High
Dynamic Content      | Yes    | Yes    | No     | Limited
```

## Hybrid Rendering

Combine multiple rendering strategies in a single application.

```javascript
// Next.js with mixed rendering
// pages/index.js - SSG for homepage
export async function getStaticProps() {
  return { props: { ... } };
}

// pages/products/[id].js - ISR for product pages
export async function getStaticProps() {
  return {
    props: { ... },
    revalidate: 3600 // 1 hour
  };
}

// pages/dashboard.js - CSR for authenticated pages
export default function Dashboard() {
  const { data } = useSWR('/api/user', fetcher);
  return <DashboardContent data={data} />;
}

// pages/search.js - SSR for dynamic search
export async function getServerSideProps(context) {
  const results = await search(context.query.q);
  return { props: { results } };
}
```

## Interview Questions

**Q: What's the difference between SSR and SSG?**

A: SSR generates HTML on each request, while SSG generates HTML at build time.

- **SSR**: Dynamic, fresh data, higher server cost, slower TTFB
- **SSG**: Static, stale data, lower cost, fastest delivery

**Q: How does hydration work?**

A: Hydration attaches JavaScript event handlers to server-rendered HTML:
1. Server sends rendered HTML
2. Browser displays static content
3. JavaScript downloads
4. React/framework reconciles with HTML
5. Adds interactivity to existing DOM

**Q: What are Core Web Vitals and how do rendering strategies affect them?**

A: Core Web Vitals measure user experience:
- **LCP (Largest Contentful Paint)**: SSG/ISR best, CSR worst
- **FID (First Input Delay)**: Islands/Progressive best, heavy CSR worst
- **CLS (Cumulative Layout Shift)**: SSR/SSG best (complete HTML)

**Q: When would you use ISR over SSG?**

A: Use ISR when:
- Content updates periodically (hourly/daily)
- Too many pages to build statically
- Need fresh content without full rebuilds
- E-commerce with changing inventory

Example: Product catalog with prices that change daily.

## Best Practices

**Performance Optimization:**
- Use SSG/ISR for public pages
- Use CSR for authenticated sections
- Implement code splitting
- Lazy load below-fold content
- Prefetch critical resources

**SEO Considerations:**
- Use SSR/SSG for public content
- Include meta tags in server-rendered HTML
- Ensure critical content in initial HTML
- Use structured data

**User Experience:**
- Show loading states during hydration
- Avoid layout shifts
- Prioritize above-fold content
- Progressive enhancement

## Summary

- **CSR**: Best for authenticated apps, poor for SEO
- **SSR**: Best for dynamic content needing SEO
- **SSG**: Best for static content, optimal performance
- **ISR**: Best of SSG + SSR, great for most use cases
- **Hybrid**: Combine strategies based on page requirements
- Choose based on: SEO needs, content freshness, scale, budget

---
[� Back to SystemDesign](../README.md)
