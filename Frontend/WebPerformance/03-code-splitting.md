# Code Splitting

## Overview

Code splitting means **breaking one big JavaScript bundle into smaller chunks**. The browser downloads only the chunks needed for what the user is doing right now.

> **Real-Life Example:**
> A textbook split into chapters. Students read chapter one without carrying the whole book. That's code splitting.

---

## Table of Contents
- [Why It Matters](#why-it-matters)
- [Dynamic Imports](#dynamic-imports)
- [Route-Based Splitting](#route-based-splitting)
- [Vendor Splitting](#vendor-splitting)
- [Prefetch vs Preload](#prefetch-vs-preload)
- [Interview Questions](#interview-questions)

---

## Why It Matters

Without splitting, all code lives in one file. The user waits for the whole thing before the page works.

```
One 2 MB bundle  →  slow download  →  parse + execute  →  finally interactive
```

With splitting:

```
200 KB main bundle  →  interactive fast  →  other chunks load on demand
```

| Benefit | Result |
|---------|--------|
| ⚡ Faster initial load | Smaller upfront download |
| 💾 Better caching | Each chunk caches separately |
| 📊 Better LCP / INP | Less JS to parse early |

---

## Dynamic Imports

A static `import` is bundled and loaded at startup. A dynamic `import()` is split into its own chunk and loaded when called.

```typescript
// ❌ Static: heavy-module ships even if the user never clicks
import { heavyFunction } from './heavy-module';
button.addEventListener('click', () => heavyFunction());

// ✅ Dynamic: heavy-module downloads only on click
button.addEventListener('click', async () => {
  const { heavyFunction } = await import('./heavy-module');
  heavyFunction();
});
```

### 💡 **Handle Failures**

`import()` returns a Promise — a flaky network can reject it.

```typescript
async function loadModule(): Promise<typeof import('./Chart') | null> {
  try {
    return await import('./Chart');
  } catch (error) {
    console.error('Chunk failed to load:', error);
    return null;
  }
}
```

### 💡 **Conditional Loading**

Load code based on role, feature flag, or user action.

```typescript
if (user.isAdmin) {
  const { renderAdminPanel } = await import('./admin-panel');
  renderAdminPanel();
}
```

---

## Route-Based Splitting

Each route is a natural split point. Most users visit only a few routes, so this gives the biggest win for the least effort.

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Next.js** splits by route automatically. For heavy client-only components, use `dynamic()`:

```tsx
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('../components/Chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // browser-only library
});
```

---

## Vendor Splitting

Separate library code from your app code so users don't re-download React on every release.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@mui')) return 'ui-vendor';
            return 'vendor';
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

The Webpack equivalent is `optimization.splitChunks` with a `cacheGroups` rule that matches `node_modules`.

> **Why split vendors?**
> When you change app code, only the app chunk's hash changes. The vendor chunk stays cached in users' browsers.

---

## Prefetch vs Preload

Resource hints tell the browser when to fetch a chunk.

| Hint | When It Loads | Priority | Use For |
|------|---------------|----------|---------|
| **prefetch** | During idle time | Low | A route the user will *likely* visit next |
| **preload** | Right now, in parallel | High | A resource the *current* page needs |

```typescript
// Webpack magic comments
import(/* webpackPrefetch: true */ './NextPage');   // likely-next route
import(/* webpackPreload: true */ './CriticalWidget'); // needed now
```

> ⚠️ Avoid prefetching everything — it competes with critical downloads and wastes the user's data.

---

## Interview Questions

**Q1: What is code splitting and why does it help?**

Breaking the bundle into chunks loaded on demand. It shrinks the initial download, improves caching (chunks change independently), and speeds up LCP/INP because there's less JavaScript to parse upfront.

**Q2: Static vs dynamic imports?**

Static `import` is resolved at build time and bundled into the initial load. Dynamic `import()` returns a Promise, is split into its own chunk, and loads only when the code runs.

**Q3: Where are the best split points?**

Routes (biggest win), vendor/library code (better caching), and large optional features (charts, editors, admin panels). Start with route-based splitting.

**Q4: Prefetch vs preload?**

Prefetch loads a likely-future resource during idle time at low priority. Preload loads a current-page resource immediately at high priority. Misusing preload steals bandwidth from critical assets.

**Q5: What's a good chunk size?**

Aim for an initial bundle under ~200 KB gzipped and individual chunks around 30–50 KB. Avoid hundreds of tiny chunks — each adds HTTP request overhead.

**Q6: How do you handle a failed chunk load?**

Wrap lazy components in an error boundary that offers a reload, and `try/catch` manual `import()` calls. Chunk loads fail on flaky networks or after a deploy changes hashes.

---

## Summary

| Strategy | When to Use |
|----------|-------------|
| Route-based | Always — biggest win |
| Vendor splitting | Always — better caching |
| Dynamic `import()` | Heavy or optional code |
| Prefetch on intent | Likely-next routes |

> **Key Insight:**
> Start with route-based splitting and vendor splitting. Modern tools (Vite, Next.js) do most of it for you — your job is to keep chunks reasonably sized.

---

[← Lazy Loading](./02-lazy-loading.md) | [Next: Caching Strategies →](./04-caching-strategies.md)
