# Code Splitting

## Overview

Code splitting breaks your JavaScript bundle into smaller chunks that can be loaded on demand. This significantly reduces initial load time by only loading the code needed for the current page.

## Table of Contents
- [Dynamic Imports](#dynamic-imports)
- [Bundle Analysis](#bundle-analysis)
- [Webpack Configuration](#webpack-configuration)
- [Vite Configuration](#vite-configuration)
- [React Lazy and Suspense](#react-lazy-and-suspense)
- [Route-Based Splitting](#route-based-splitting)
- [Interview Questions](#interview-questions)

## Dynamic Imports

### Basic Dynamic Import

Dynamic imports are the foundation of code splitting in modern JavaScript applications. Unlike static imports which bundle all code together upfront, dynamic imports create separate chunks that load on demand. This dramatically reduces initial bundle size by deferring non-critical code until it's actually needed. The browser only downloads what's required for the current page or user action. Dynamic imports return Promises, allowing async/await syntax for clean handling. They're essential for features users might never access (admin panels, advanced editors) and route-based splitting.

```javascript
// Static import (bundled together)
import { heavyFunction } from './heavy-module.js';

// Dynamic import (separate chunk)
button.addEventListener('click', async () => {
  const module = await import('./heavy-module.js');
  module.heavyFunction();
});

// With error handling
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

### Named vs Default Exports

```javascript
// Module with named exports
// math.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// Dynamic import named exports
const math = await import('./math.js');
math.add(5, 3);

// Destructure
const { add, subtract } = await import('./math.js');
add(5, 3);

// Default export
// utils.js
export default function doSomething() { }

// Dynamic import default
const { default: doSomething } = await import('./utils.js');
doSomething();
```

### Conditional Loading

```javascript
// Load based on condition
async function loadFeature(featureName) {
  if (featureName === 'analytics') {
    const analytics = await import('./analytics.js');
    analytics.init();
  } else if (featureName === 'chat') {
    const chat = await import('./chat.js');
    chat.start();
  }
}

// Load based on user role
if (user.isAdmin) {
  const adminPanel = await import('./admin-panel.js');
  adminPanel.render();
}

// Load based on feature flag
if (featureFlags.newDashboard) {
  const newDashboard = await import('./new-dashboard.js');
} else {
  const oldDashboard = await import('./old-dashboard.js');
}
```

## Bundle Analysis

### Webpack Bundle Analyzer

Before optimizing bundle size, you must understand what's in your bundles. Webpack Bundle Analyzer provides an interactive treemap visualization showing the size of each module in your bundle. Large blocks indicate heavy dependencies that might be candidates for code splitting or replacement. The analyzer reveals duplicate dependencies, unexpectedly large libraries, and modules that shouldn't be in certain bundles. It's the essential first step in any bundle optimization effort - you can't optimize what you can't measure.

```bash
npm install --save-dev webpack-bundle-analyzer
```

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

```json
// package.json
{
  "scripts": {
    "analyze": "webpack --mode production && webpack-bundle-analyzer dist/stats.json"
  }
}
```

### Source Map Explorer

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

### Identifying Large Dependencies

```javascript
// Check bundle size
import { formatBytes } from './utils.js';

// Large libraries to consider splitting:
// - moment.js (288 KB) → use date-fns or dayjs
// - lodash (70 KB) → use lodash-es with tree shaking
// - chart.js (259 KB) → load dynamically
```

## Webpack Configuration

### Basic Code Splitting

Webpack's splitChunks optimization automatically splits your bundle into smaller chunks based on configurable rules. The `chunks: 'all'` setting enables splitting for both dynamic imports and regular imports, maximizing optimization opportunities. Cache groups allow defining custom splitting strategies - for example, separating vendor code (node_modules) from your application code. This separation is crucial because vendor code changes less frequently than your app code, enabling better long-term caching. The configuration balances bundle size with HTTP request overhead.

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',  // Split both sync and async chunks
      cacheGroups: {
        // Vendor chunk
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        // Common chunk
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### Advanced Configuration

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,      // Min chunk size (bytes)
      maxSize: 244000,     // Max chunk size
      minChunks: 1,        // Min times shared
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        // React vendors
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-vendors',
          priority: 20
        },
        // UI libraries
        ui: {
          test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
          name: 'ui-vendors',
          priority: 15
        },
        // Other vendors
        vendors: {
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
    },
    // Runtime chunk
    runtimeChunk: 'single'
  }
};
```

### Magic Comments

```javascript
// Webpack magic comments for chunk naming
const component = await import(
  /* webpackChunkName: "my-component" */
  './MyComponent.js'
);

// Prefetch (load during idle time)
import(
  /* webpackPrefetch: true */
  /* webpackChunkName: "admin-panel" */
  './AdminPanel.js'
);

// Preload (load in parallel with parent)
import(
  /* webpackPreload: true */
  /* webpackChunkName: "critical-component" */
  './CriticalComponent.js'
);
```

## Vite Configuration

### Vite Code Splitting

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@mui/material', '@emotion/react'],

          // Feature chunks
          'auth': ['./src/features/auth'],
          'dashboard': ['./src/features/dashboard']
        },

        // Or use function
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
    // Chunk size warning limit
    chunkSizeWarningLimit: 500
  }
});
```

### Dynamic Import in Vite

```javascript
// Vite supports glob imports
const modules = import.meta.glob('./modules/*.js');

// Load all modules
for (const path in modules) {
  modules[path]().then((mod) => {
    console.log(path, mod);
  });
}

// Eager loading
const eagerModules = import.meta.glob('./modules/*.js', { eager: true });
```

## React Lazy and Suspense

### Basic Usage

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

### Multiple Lazy Components

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

### Named Exports

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

### Error Handling

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

### Preloading Components

```jsx
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
        onFocus={preloadAdminPanel}       // Preload on focus
      >
        Admin
      </Link>
    </nav>
  );
}
```

## Route-Based Splitting

### React Router Code Splitting

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load pages
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

### Next.js Dynamic Imports

```jsx
// pages/index.jsx
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('../components/Heavy'), {
  loading: () => <p>Loading...</p>,
  ssr: false  // Client-side only
});

// With custom loading
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

## Interview Questions

**Q1: What is code splitting and why is it important?**
A: Breaking JavaScript bundle into smaller chunks loaded on demand.

**Benefits:**
- Faster initial load (only load what's needed)
- Better caching (chunks change independently)
- Improved performance metrics (LCP, TTI)
- Reduced bandwidth usage

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
Webpack automatically splits code based on configuration.

**Q4: What are magic comments in Webpack?**
```javascript
import(
  /* webpackChunkName: "my-chunk" */
  /* webpackPrefetch: true */
  './module.js'
);
```
- `webpackChunkName`: Name the chunk
- `webpackPrefetch`: Load during idle time
- `webpackPreload`: Load in parallel

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
A:
- **Prefetch**: Load during idle time for future navigation
- **Preload**: Load in parallel with current page (high priority)

Use prefetch for likely future routes, preload for critical resources.

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
A: 
- **Initial bundle**: < 200 KB (gzipped)
- **Individual chunks**: 30-50 KB ideal
- **Max chunk**: < 500 KB
- Avoid too many small chunks (HTTP overhead)

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

**Q10: What are best practices for code splitting?**
- Split by routes
- Split vendor code separately
- Use dynamic imports for large libraries
- Implement proper loading states
- Use prefetch for likely routes
- Measure with bundle analyzer
- Keep initial bundle < 200 KB

## Summary

**Code Splitting Strategies:**
1. **Route-based**: One chunk per route
2. **Vendor splitting**: Separate node_modules
3. **Feature-based**: Split by feature modules
4. **Dynamic imports**: Load on user action

**Key Tools:**
- Webpack splitChunks
- Vite manualChunks
- React lazy() + Suspense
- Bundle analyzers

**Performance Impact:**
- 40-60% reduction in initial bundle
- Faster Time to Interactive
- Better caching efficiency
- Improved Core Web Vitals

---

[← Lazy Loading](./02-lazy-loading.md) | [Next: Caching Strategies →](./04-caching-strategies.md)
