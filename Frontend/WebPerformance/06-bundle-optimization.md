# Bundle Optimization

## Overview

Your JavaScript bundle is the file users download to run your app. **The bigger it is, the slower the page**. Bundle optimization makes that file smaller through smart techniques.

> **Why It Matters:**
> Every kilobyte of JavaScript = download time + parsing time + execution time. A 1MB bundle on a slow phone can take 10+ seconds before the page works.

---

## Table of Contents
- [Tree Shaking](#tree-shaking)
- [Minification](#minification)
- [Compression](#compression)
- [Bundle Analysis](#bundle-analysis)
- [Code Splitting](#code-splitting)
- [Interview Questions](#interview-questions)

---

## Tree Shaking

### 💡 **What is Tree Shaking?**

Tree shaking removes code you import but never use. The name comes from shaking a tree to drop dead leaves.

**How It Works:**

```
Library has: add, subtract, multiply, divide
You import: only "add"
    ↓
Tree shaking
    ↓
Bundle has: only "add" — others removed
```

```javascript
// utils.js — library with many functions
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b) { return a / b; }

// app.js — only imports what's needed
import { add } from './utils.js';

console.log(add(5, 3));

// Final bundle includes ONLY "add"
// subtract, multiply, divide are removed
```

### 💡 **Requirements for Tree Shaking**

Tree shaking only works with these conditions:

| Requirement | Why |
|-------------|-----|
| ES6 modules (`import`/`export`) | Static structure can be analyzed |
| Production build | Dev builds don't tree-shake |
| No side effects | Code that runs at import breaks tree shaking |

### 💡 **Enabling Tree Shaking**

```javascript
// package.json
{
  "sideEffects": false  // All files are side-effect free
}

// Or specify which files have side effects
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}

// webpack.config.js
module.exports = {
  mode: 'production',  // Required for tree shaking
  optimization: {
    usedExports: true,
    minimize: true
  }
};
```

### 💡 **Writing Tree-Shakeable Code**

**❌ Bad: CommonJS (not tree-shakeable):**

```javascript
const utils = require('./utils');
module.exports = { add, subtract };
```

**✅ Good: ES6 modules:**

```javascript
export function add(a, b) { }
export function subtract(a, b) { }
```

**❌ Bad: Default export with object:**

```javascript
export default {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};
// Importing one method still pulls in the whole object
```

**✅ Good: Named exports:**

```javascript
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
// Each can be tree-shaken independently
```

**❌ Bad: Side effects:**

```javascript
console.log('Module loaded');  // Runs at import → blocks tree shaking
export function add(a, b) { }
```

**✅ Good: Pure functions:**

```javascript
export function add(a, b) { return a + b; }
// No side effects → tree-shakeable
```

### 💡 **Lodash Example**

A great example of how imports affect bundle size:

| Import Style | Bundle Size | Notes |
|--------------|------------|-------|
| `import _ from 'lodash'` | +70 KB | ❌ Imports everything |
| `import debounce from 'lodash/debounce'` | +2 KB | ✅ Specific function |
| `import { debounce } from 'lodash-es'` | +2 KB | ✅ ES modules + tree shaking |

```javascript
// ❌ Bad: imports entire library
import _ from 'lodash';
_.debounce(fn, 300);

// ✅ Better: specific import
import debounce from 'lodash/debounce';

// ✅ Best: tree-shakeable ES module version
import { debounce } from 'lodash-es';
```

> **Key Insight:**
> Tree shaking can reduce bundle size by 20-40% just by being careful with imports.

---

## Minification

### 💡 **What is Minification?**

Minification compresses code by removing things humans need (whitespace, long names, comments) but computers don't.

**Before Minification:**

```javascript
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}
```

**After Minification:**

```javascript
function c(t){let e=0;for(const r of t)e+=r.price;return e}
```

**Same logic, ~70% smaller.**

### 💡 **JavaScript Minification (Webpack + Terser)**

```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,  // Remove console.log
            dead_code: true,
            unused: true
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false  // Remove all comments
          }
        },
        extractComments: false
      })
    ]
  }
};
```

**Vite (uses esbuild — faster):**

```javascript
export default {
  build: {
    minify: 'esbuild',  // or 'terser'
    target: 'es2015'
  }
};
```

### 💡 **CSS Minification**

```javascript
// PostCSS with cssnano
module.exports = {
  plugins: [
    require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true
      }]
    })
  ]
};

// Webpack
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [new CssMinimizerPlugin()]
  }
};
```

### 💡 **HTML Minification**

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        minifyCSS: true,
        minifyJS: true
      }
    })
  ]
};
```

---

## Compression

### 💡 **What is Compression?**

After minification, the server compresses files before sending them to save more bandwidth.

```
Original file: 1000 KB
    ↓ Minification
Minified: 700 KB
    ↓ Gzip compression
Sent: 300 KB
    ↓ Browser decompresses
Used: 700 KB
```

### 💡 **Gzip Compression**

The most common method. Works almost everywhere.

**Express Server:**

```javascript
const compression = require('compression');

app.use(compression({
  level: 6,        // 0-9 (higher = better compression but slower)
  threshold: 1024  // Only compress files > 1KB
}));
```

**Build-Time Compression:**

```javascript
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,  // Only files > 10KB
      minRatio: 0.8
    })
  ]
};
```

**Nginx Configuration:**

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;
gzip_comp_level 6;
```

### 💡 **Brotli Compression (Better)**

Brotli is newer and compresses 20-25% better than gzip.

```javascript
module.exports = {
  plugins: [
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11  // 0-11
      },
      threshold: 10240,
      minRatio: 0.8
    })
  ]
};
```

```nginx
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

### 💡 **Compression Comparison**

| Method | Size Reduction | Browser Support |
|--------|---------------|-----------------|
| **Original** | 0% | All |
| **Gzip** | 70% | All |
| **Brotli** | 75% | Modern browsers |

**Serve Brotli with Gzip Fallback:**

```javascript
app.get('*', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'];

  if (acceptEncoding.includes('br')) {
    res.set('Content-Encoding', 'br');
    res.sendFile('bundle.js.br');
  } else if (acceptEncoding.includes('gzip')) {
    res.set('Content-Encoding', 'gzip');
    res.sendFile('bundle.js.gz');
  } else {
    res.sendFile('bundle.js');
  }
});
```

> **Key Insight:**
> Use Brotli for modern browsers, gzip as a fallback. Combined with minification, you get 80-90% size reduction.

---

## Bundle Analysis

### 💡 **Why Analyze?**

You can't fix what you don't measure. Bundle analyzers show you exactly what's in your bundle.

### 💡 **Webpack Bundle Analyzer**

Shows your bundle as a treemap. Big rectangles = big files = optimization targets.

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'stats.json'
    })
  ]
};
```

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "analyze": "webpack --mode production && webpack-bundle-analyzer dist/stats.json"
  }
}
```

### 💡 **Source Map Explorer**

Alternative tool — works with any bundler that produces source maps.

```bash
npm install --save-dev source-map-explorer
```

```json
{
  "scripts": {
    "analyze": "source-map-explorer 'build/static/js/*.js' 'build/static/css/*.css'"
  }
}
```

### 💡 **Common Big Dependencies**

These libraries are often the culprits behind bundle bloat:

| Library | Size | Better Alternative |
|---------|------|-------------------|
| `moment.js` | 288 KB | `date-fns` (78 KB) or `dayjs` (2 KB) |
| `lodash` (full) | 70 KB | `lodash-es` with tree shaking |
| `axios` | 15 KB | Native `fetch` |
| `jquery` | 85 KB | Native DOM APIs |
| `chart.js` | 259 KB | Lazy load it |

**Check Package Size Before Installing:**

```bash
npm install -g package-size

package-size moment      # 288 KB
package-size date-fns    # 78 KB
package-size dayjs       # 2 KB
```

---

## Code Splitting

### 💡 **Entry Point Splitting**

```javascript
// webpack.config.js
module.exports = {
  entry: {
    main: './src/index.js',
    vendor: './src/vendor.js',
    admin: './src/admin.js'
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  }
};
```

### 💡 **Vendor Bundle Splitting**

Separate library code from your app code so libraries cache better.

```javascript
module.exports = {
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
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

### 💡 **Dynamic Imports**

```javascript
// Load on user action
button.addEventListener('click', async () => {
  const { heavyFunction } = await import('./heavy-module.js');
  heavyFunction();
});

// React lazy loading
const AdminPanel = lazy(() => import('./AdminPanel'));

<Suspense fallback={<Loading />}>
  <AdminPanel />
</Suspense>
```

For more details, see [03-code-splitting.md](./03-code-splitting.md).

---

## Interview Questions

**Q1: What is tree shaking?**

A: Eliminating dead code (unused exports) from the bundle.

**Requirements:**
- ES6 modules (`import`/`export`)
- Production mode
- No side effects

**Q2: How do you enable tree shaking?**

```json
// package.json
{
  "sideEffects": false
}
```

```javascript
// webpack.config.js
mode: 'production'
```

**Q3: Difference between gzip and brotli?**

| Feature | Gzip | Brotli |
|---------|------|--------|
| Compression | 70% | 75% |
| Speed | Faster | Slower encoding |
| Support | Universal | Modern browsers |

Use Brotli for modern browsers, gzip as fallback.

**Q4: How do you analyze bundle size?**

```bash
# Webpack Bundle Analyzer
webpack-bundle-analyzer dist/stats.json

# Source Map Explorer
source-map-explorer 'build/static/js/*.js'

# Lighthouse — has bundle size in the report
```

**Q5: What's the ideal bundle size?**

| Target | Size |
|--------|------|
| Initial bundle | < 200 KB (gzipped) |
| Individual chunks | 30-50 KB |
| Total JavaScript | < 500 KB |

Larger bundles delay Time to Interactive.

**Q6: How do you reduce bundle size?**

1. ✅ Tree shaking (remove unused code)
2. ✅ Code splitting (load on demand)
3. ✅ Minification (compress code)
4. ✅ Compression (gzip/brotli)
5. ✅ Remove unused dependencies
6. ✅ Use lighter alternatives (date-fns vs moment)

**Q7: What causes bundle bloat?**

- ❌ Unused dependencies
- ❌ Duplicate packages (lodash + lodash-es)
- ❌ Large libraries for small features
- ❌ No code splitting
- ❌ Images/fonts in JS bundle

**Q8: How does minification work?**

```javascript
// Before
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

// After
function c(t){let e=0;for(const r of t)e+=r.price;return e}
```

Removes whitespace, shortens names, simplifies code.

**Q9: What's `sideEffects` in package.json?**

```json
{
  "sideEffects": false
}
```

Tells the bundler that all files are side-effect free, so tree shaking is safe.

For files with side effects:

```json
{
  "sideEffects": ["*.css", "./src/polyfills.js"]
}
```

**Q10: How do you optimize third-party libraries?**

- ✅ Use CDN for popular libraries (React, etc.)
- ✅ Import only what you need
- ✅ Use lighter alternatives
- ✅ Lazy load non-critical libraries
- ✅ Check bundle impact before adding

```javascript
// ❌ Bad
import _ from 'lodash';  // +70 KB

// ✅ Good
import { debounce } from 'lodash-es';  // +2 KB
```

---

## Summary

### Optimization Checklist

- [ ] Enable tree shaking (ES6 modules)
- [ ] Configure minification (Terser/esbuild)
- [ ] Enable compression (gzip + brotli)
- [ ] Implement code splitting
- [ ] Remove unused dependencies
- [ ] Run a bundle analyzer
- [ ] Target < 200 KB initial bundle

### Key Tools

| Tool | Purpose |
|------|---------|
| **Webpack Bundle Analyzer** | Visualize bundle |
| **Source Map Explorer** | Inspect with source maps |
| **Terser** | JavaScript minification |
| **CompressionPlugin** | Gzip/Brotli at build time |
| **Lighthouse** | Overall analysis |

### Performance Impact

| Technique | Reduction |
|-----------|-----------|
| Tree shaking | 10-30% |
| Minification | 30-50% |
| Compression | 70-75% |
| **Combined** | **80-90%** |

### Best Practices

- ✅ Measure before optimizing
- ✅ Set performance budgets
- ✅ Analyze regularly
- ✅ Use modern build tools (Vite, esbuild)
- ✅ Prefer native APIs over libraries

> **Key Insight:**
> Modern toolchains (Vite, esbuild, Next.js) handle most of this automatically. Your job is to keep dependencies small and code clean.

---

[← Image Optimization](./05-image-optimization.md) | [Next: Performance Monitoring →](./07-performance-monitoring.md)
