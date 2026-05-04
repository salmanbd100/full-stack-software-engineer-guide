# Code Splitting

## Overview

Code splitting means **breaking your big JavaScript file into smaller pieces**. The browser only downloads the pieces needed for what the user is doing right now.

> **Real-Life Example:**
> Imagine a textbook with 20 chapters. Instead of giving students the whole book, you give them one chapter at a time. They get to start reading faster and don't carry weight they don't need. That's code splitting.

---

## Table of Contents
- [Why Code Splitting Matters](#why-code-splitting-matters)
- [Dynamic Imports](#dynamic-imports)
- [Bundle Analysis](#bundle-analysis)
- [Webpack Configuration](#webpack-configuration)
- [Vite Configuration](#vite-configuration)
- [React Lazy and Suspense](#react-lazy-and-suspense)
- [Route-Based Splitting](#route-based-splitting)
- [Interview Questions](#interview-questions)

---

## Why Code Splitting Matters

### 💡 **The Problem Without Code Splitting**

Without code splitting, all your code goes into one giant file (called a "bundle"). The user must download the whole file before the page works.

```
Big bundle: 2 MB
    ↓
Download (slow on 3G)
    ↓
Parse and execute
    ↓
Finally interactive
```

### 💡 **With Code Splitting**

```
Main bundle: 200 KB → page is interactive fast
    ↓
Other chunks load only when needed
    ↓
Better experience
```

**Benefits:**

| Benefit | Result |
|---------|--------|
| ⚡ Faster initial load | Smaller download upfront |
| 💾 Better caching | Each chunk caches separately |
| 📊 Better Core Web Vitals | LCP and TTI improve |
| 💰 Less bandwidth | Don't download unused code |

---

## Dynamic Imports

### 💡 **Static vs Dynamic Imports**

| Type | When It Loads | Use Case |
|------|---------------|----------|
| **Static `import`** | Bundled and loaded at start | Critical code |
| **Dynamic `import()`** | Loaded when called | Heavy/optional code |

**❌ Before (Static — bundled together):**

```javascript
import { heavyFunction } from './heavy-module.js';

button.addEventListener('click', () => {
  heavyFunction(); // heavy-module.js was already downloaded
});
```

**Problem:** `heavy-module.js` is downloaded even if the user never clicks.

**✅ After (Dynamic — load on demand):**

```javascript
button.addEventListener('click', async () => {
  const module = await import('./heavy-module.js');
  module.heavyFunction();
});
```

**Benefit:** `heavy-module.js` only downloads when the user actually clicks.

### 💡 **Error Handling**

Dynamic imports return a Promise — handle network failures gracefully.

```javascript
async function loadModule() {
  try {
    const { default: Component } = await import('./Component.js');
    return Component;
  } catch (error) {
    console.error('Failed to load module:', error);
    return null;
  }
}
```

### 💡 **Importing Named vs Default Exports**

```javascript
// math.js with named exports
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// Import all
const math = await import('./math.js');
math.add(5, 3);

// Or destructure
const { add, subtract } = await import('./math.js');
add(5, 3);

// Default export
// utils.js
export default function doSomething() { }

// Import default
const { default: doSomething } = await import('./utils.js');
doSomething();
```

### 💡 **Conditional Loading**

Load different code based on conditions like user role or feature flags.

```javascript
// Based on feature name
async function loadFeature(featureName) {
  if (featureName === 'analytics') {
    const analytics = await import('./analytics.js');
    analytics.init();
  } else if (featureName === 'chat') {
    const chat = await import('./chat.js');
    chat.start();
  }
}

// Based on user role
if (user.isAdmin) {
  const adminPanel = await import('./admin-panel.js');
  adminPanel.render();
}

// Based on feature flag
if (featureFlags.newDashboard) {
  const newDashboard = await import('./new-dashboard.js');
} else {
  const oldDashboard = await import('./old-dashboard.js');
}
```

---

## Bundle Analysis

### 💡 **Why Analyze Your Bundle?**

> **Key Insight:**
> You can't fix what you can't measure. Always look at your bundle before optimizing.

### 💡 **Webpack Bundle Analyzer**

Shows your bundle as a treemap. Big rectangles = big files.

**Install:**

```bash
npm install --save-dev webpack-bundle-analyzer
```

**Configure:**

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false
    })
  ]
};
```

**Run:**

```json
{
  "scripts": {
    "analyze": "webpack --mode production && webpack-bundle-analyzer dist/stats.json"
  }
}
```

### 💡 **Source Map Explorer (Alternative)**

```bash
npm install --save-dev source-map-explorer
```

```json
{
  "scripts": {
    "analyze": "source-map-explorer 'build/static/js/*.js'"
  }
}
```

### 💡 **Common Bundle Bloat**

Watch out for these common large dependencies:

| Library | Size | Better Alternative |
|---------|------|-------------------|
| `moment.js` | 288 KB | `date-fns` or `dayjs` (~2 KB) |
| `lodash` (full) | 70 KB | `lodash-es` with tree shaking |
| `chart.js` | 259 KB | Load dynamically when needed |
| `axios` | ~15 KB | Native `fetch` API |
| `jquery` | ~85 KB | Native DOM APIs |

---

## Webpack Configuration

### 💡 **Basic Code Splitting**

`splitChunks` automatically splits your bundle based on rules.

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all', // Split both sync and async imports
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2, // Used in 2+ places
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### 💡 **Advanced Configuration**

Split vendor code into smaller, focused chunks for better caching.

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,        // Min chunk size (20 KB)
      maxSize: 244000,       // Max chunk size (244 KB)
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        // React stays in its own chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-vendors',
          priority: 20
        },
        // UI library in its own chunk
        ui: {
          test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
          name: 'ui-vendors',
          priority: 15
        },
        // Other dependencies together
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    runtimeChunk: 'single' // Webpack runtime in its own chunk
  }
};
```

**Why Split Vendor Code?**

> When you change your app code, only your app chunk needs to update. The vendor chunk stays cached. Users don't redownload React with every release.

### 💡 **Magic Comments**

Special comments tell Webpack how to handle imports.

```javascript
// Name the chunk
const component = await import(
  /* webpackChunkName: "my-component" */
  './MyComponent.js'
);

// Prefetch: load during idle time
import(
  /* webpackPrefetch: true */
  /* webpackChunkName: "admin-panel" */
  './AdminPanel.js'
);

// Preload: load in parallel with current chunk (high priority)
import(
  /* webpackPreload: true */
  /* webpackChunkName: "critical-component" */
  './CriticalComponent.js'
);
```

| Hint | When to Use |
|------|-------------|
| **prefetch** | Likely needed soon (next page) |
| **preload** | Needed right now (current page critical) |

---

## Vite Configuration

### 💡 **Vite Code Splitting**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@mui/material', '@emotion/react'],
          'auth': ['./src/features/auth'],
          'dashboard': ['./src/features/dashboard']
        },

        // Or use a function for more control
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('@mui')) {
              return 'ui-vendor';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```

### 💡 **Glob Imports in Vite**

```javascript
// Lazy load all modules
const modules = import.meta.glob('./modules/*.js');

for (const path in modules) {
  modules[path]().then((mod) => {
    console.log(path, mod);
  });
}

// Eager load all
const eagerModules = import.meta.glob('./modules/*.js', { eager: true });
```

---

## React Lazy and Suspense

### 💡 **Basic Usage**

```jsx
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 💡 **Multiple Lazy Components**

```jsx
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Suspense>
  );
}
```

### 💡 **Lazy Loading Named Exports**

`React.lazy` only works with default exports out of the box. Use this trick for named exports:

```jsx
// Component.jsx
export function ComponentA() { return <div>A</div>; }
export function ComponentB() { return <div>B</div>; }

// Lazy load named export
const ComponentA = lazy(() =>
  import('./Component').then(module => ({
    default: module.ComponentA
  }))
);
```

### 💡 **Error Boundaries**

Always wrap lazy components in an error boundary.

```jsx
import { Component, lazy, Suspense } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback retry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

const LazyPage = lazy(() => import('./Page'));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <LazyPage />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 💡 **Preloading Components**

Smart trick: start loading on hover so the chunk is ready when clicked.

```jsx
const AdminPanel = lazy(() => import('./AdminPanel'));

const preloadAdminPanel = () => {
  import('./AdminPanel');
};

function Navigation() {
  return (
    <nav>
      <Link
        to="/admin"
        onMouseEnter={preloadAdminPanel}  // Start loading on hover
        onFocus={preloadAdminPanel}       // Or on focus
      >
        Admin
      </Link>
    </nav>
  );
}
```

---

## Route-Based Splitting

### 💡 **Why Routes Are the Best Split Points**

Each route is a natural section of your app. Most users only visit some routes.

```
Without route splitting:
User loads home page → downloads all routes (~2 MB)

With route splitting:
User loads home page → downloads home only (~200 KB)
    ↓
User navigates to dashboard → downloads dashboard chunk
```

### 💡 **React Router**

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const routes = [
  { path: '/', component: lazy(() => import('./pages/Home')) },
  { path: '/products', component: lazy(() => import('./pages/Products')) },
  { path: '/cart', component: lazy(() => import('./pages/Cart')) },
  { path: '/checkout', component: lazy(() => import('./pages/Checkout')) }
];

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {routes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 💡 **Next.js Dynamic Imports**

```jsx
import dynamic from 'next/dynamic';

// Client-side only
const DynamicComponent = dynamic(() => import('../components/Heavy'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});

// With custom loading UI
const DynamicWithLoading = dynamic(() => import('../components/Chart'), {
  loading: () => <ChartSkeleton />
});

export default function Home() {
  return (
    <div>
      <DynamicComponent />
      <DynamicWithLoading />
    </div>
  );
}
```

---

## Interview Questions

**Q1: What is code splitting and why is it important?**

A: Breaking the JavaScript bundle into smaller chunks loaded on demand.

**Benefits:**
- ⚡ Faster initial load (only load what's needed)
- 💾 Better caching (chunks change independently)
- 📊 Improved performance metrics (LCP, TTI)
- 💰 Less bandwidth used

**Q2: Difference between static and dynamic imports?**

```javascript
// Static: Bundled together, loaded upfront
import { func } from './module.js';

// Dynamic: Separate chunk, loaded on demand
const module = await import('./module.js');
```

**Q3: How does Webpack code splitting work?**

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          name: 'vendors'
        }
      }
    }
  }
};
```

Webpack splits code based on the configuration.

**Q4: What are magic comments in Webpack?**

```javascript
import(
  /* webpackChunkName: "my-chunk" */
  /* webpackPrefetch: true */
  './module.js'
);
```

| Comment | Effect |
|---------|--------|
| `webpackChunkName` | Names the chunk |
| `webpackPrefetch` | Loads during idle time |
| `webpackPreload` | Loads in parallel (high priority) |

**Q5: How do you implement route-based code splitting in React?**

```jsx
const Home = lazy(() => import('./Home'));
const About = lazy(() => import('./About'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Routes>
</Suspense>
```

**Q6: What's the difference between prefetch and preload?**

| Hint | When | Priority | Use For |
|------|------|----------|---------|
| **Prefetch** | During idle time | Low | Likely future routes |
| **Preload** | Right now, in parallel | High | Critical resources |

**Q7: How do you analyze bundle size?**

- Webpack Bundle Analyzer
- Source Map Explorer
- Lighthouse bundle analysis
- Coverage tab in DevTools

```bash
npm run build
webpack-bundle-analyzer dist/stats.json
```

**Q8: What's the optimal chunk size?**

| Chunk Type | Target |
|------------|--------|
| Initial bundle | < 200 KB (gzipped) |
| Individual chunks | 30-50 KB ideal |
| Max chunk | < 500 KB |

> ⚠️ Avoid too many tiny chunks — HTTP overhead becomes a problem.

**Q9: How do you handle errors in lazy-loaded components?**

```jsx
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}
```

**Q10: Best practices for code splitting?**

- ✅ Split by routes
- ✅ Split vendor code separately
- ✅ Use dynamic imports for large libraries
- ✅ Show proper loading states
- ✅ Use prefetch for likely routes
- ✅ Measure with bundle analyzer
- ✅ Keep initial bundle < 200 KB

---

## Summary

### Code Splitting Strategies

| Strategy | When to Use |
|----------|-------------|
| **Route-based** | Always — biggest win |
| **Vendor splitting** | Always — better caching |
| **Feature-based** | For large feature modules |
| **Dynamic imports** | For optional/heavy code |

### Key Tools

- 🛠 Webpack `splitChunks`
- 🛠 Vite `manualChunks`
- 🛠 React `lazy()` + `Suspense`
- 🛠 Bundle analyzers

### Performance Impact

- 📉 40-60% reduction in initial bundle
- ⚡ Faster Time to Interactive
- 💾 Better caching
- 📈 Better Core Web Vitals

> **Key Insight:**
> Start with route-based splitting — it gives the biggest gains for the least effort.

---

[← Lazy Loading](./02-lazy-loading.md) | [Next: Caching Strategies →](./04-caching-strategies.md)
